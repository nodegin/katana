import path from 'path'
import fs from 'fs-extra'
import uuidv1 from 'uuid/v1'
import { ipcMain } from 'electron'
import { path as ffmpeg } from 'ffmpeg-static'
import { path as ffprobe } from 'ffprobe-static'
import FfmpegCommand from 'fluent-ffmpeg'

function fixPathForAsarUnpack(path) {
  // https://github.com/sindresorhus/electron-util/blob/master/node.js
  const isElectron = 'electron' in process.versions
  const isUsingAsar = isElectron && process.mainModule && process.mainModule.filename.includes('app.asar')
  if (isUsingAsar) {
    return path.replace('app.asar', 'app.asar.unpacked')
  }
  return path
}

FfmpegCommand.setFfmpegPath(fixPathForAsarUnpack(ffmpeg))
FfmpegCommand.setFfprobePath(fixPathForAsarUnpack(ffprobe))

function probe(file) {
  return new Promise((resolve, reject) => {
    FfmpegCommand.ffprobe(file, (err, result) => {
      if (err) {
        reject(err)
        return
      }
      resolve(result)
    })
  })
}

async function globSubtitles(video) {
  const { dir, name, ext } = path.parse(video)
  const re = new RegExp(`\\.(ass|srt|ssa|${ext.slice(1)})$`, 'i')
  const results = await fs.readdir(dir)
  return results
    .filter((file) => file.startsWith(name) && re.test(file))
    .map((file) => path.join(dir, file))
}

let activeCommand = null

export default function (mainWindow) {
  ipcMain.on('terminate-process', async () => {
    if (activeCommand) {
      activeCommand.kill()
    }
  })

  ipcMain.on('parse-video-info', async (event, file) => {
    try {
      let entries = await globSubtitles(file)
      entries = await Promise.all(entries.map(probe))
      const video = []
      const audio = []
      const subtitle = []
      for (const entry of entries) {
        const external = entry.format.filename !== file
        const { filename } = entry.format
        const firstSubtitle = entry.streams.find(({ codec_type: t }) => t === 'subtitle')
        for (const stream of entry.streams) {
          const _id = uuidv1()
          const {
            codec_type: type,
            index,
            codec_name: codec,
            tags,
          } = stream
          const title = tags ? tags.title : null
          const language = tags ? tags.language : null
          const info = {
            _id,
            external,
            index,
            filename,
            codec,
            title,
            language,
          }
          switch (type) {
            case 'video': {
              const { width, height } = stream
              video.push({ ...info, width, height })
              break
            }
            case 'audio': {
              audio.push(info)
              break
            }
            case 'subtitle': {
              // real index of internal subtitle used by subtitles filter
              let rIndex = 0
              if (!external) {
                rIndex = index - firstSubtitle.index
              }
              subtitle.push({ ...info, rIndex })
              break
            }
            default: {
              console.log(`Unknown codec type "${type}": ${JSON.stringify(stream)} (${filename})`)
              break
            }
          }
        }
      }
      mainWindow.webContents.send('video-info-parsed', { video, audio, subtitle })
    } catch ({ message }) {
      mainWindow.webContents.send('uncaught-error', { error: message })
    }
  })

  ipcMain.on('video-transcode-start', async (event, { video, audio, subtitle }) => {
    try {
      const { dir, name } = path.parse(video.filename)
      const output = path.join(dir, `out_${name}.mp4`)

      await fs.remove(output)
      const writeStream = fs.createWriteStream(output)

      activeCommand = FfmpegCommand()
        .input(video.filename)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioChannels(2)

      if (['dvd_subtitle', 'hdmv_pgs_subtitle'].indexOf(subtitle.codec) >= 0) {
        // picture sub
        activeCommand = activeCommand.complexFilter(`[0:s:${subtitle.rIndex}]scale=${video.width}:${video.height}[sub];[0:v][sub]overlay'`)
      } else {
        // text sub
        activeCommand = activeCommand.videoFilters(`subtitles='${subtitle.filename}:si=${subtitle.rIndex}'`)
      }

      activeCommand = activeCommand
        .outputOptions([
          `-map 0:${video.index}`,
          `-map 0:${audio.index}`,
          '-map_chapters -1',
          '-map_metadata -1',
          '-preset fast',
          '-crf 18',
          '-x264-params keyint=48:scenecut=0',
          '-pix_fmt yuv420p',
          '-maxrate 20M',
          '-bufsize 20M',
          '-reset_timestamps 1',
          '-vsync 2',
          '-threads 0',
          '-movflags frag_keyframe+default_base_moof',
        ])
        .outputFormat('mp4')
        .on('start', (cmd) => {
          console.log(`Spawned Ffmpeg with command: ${cmd}`)
        })
        .on('progress', (progress) => {
          mainWindow.webContents.send('video-transcode-progress', progress)
        })
        .on('error', ({ message }) => {
          console.log(`An error occurred during transcode: ${message}`)
        })
        .on('end', () => {
          // Finalize the mp4 to make it seekable
          // see: https://stackoverflow.com/questions/34123272
          mainWindow.webContents.send('video-transcode-finalizing')
          const retranscode = path.join(dir, `.out_${name}.mp4`)
          FfmpegCommand()
            .input(output)
            .videoCodec('copy')
            .audioCodec('copy')
            .output(retranscode)
            .on('error', ({ message }, stdout, stderr) => {
              console.log(`An error occurred during finalize: ${message}`, stderr)
            })
            .on('end', async () => {
              await fs.remove(output)
              await fs.rename(retranscode, output)
              mainWindow.webContents.send('video-transcode-finished')
              activeCommand = null
            })
            .run()
        })

      const ffstream = activeCommand.pipe()

      ffstream.on('data', (chunk) => {
        writeStream.write(chunk, 'binary')
        mainWindow.webContents.send('video-chunk', chunk)
      })

      ffstream.on('end', () => {
        writeStream.end()
      })

      mainWindow.webContents.send('video-transcode-started')
    } catch (err) {
      console.log(err)
    }
  })

  ipcMain.on('subtitle-extract-start', async (event, subtitle) => {
    try {
      const { dir, name } = path.parse(subtitle.filename)
      const output = path.join(dir, `${name}.${subtitle.codec}`)

      activeCommand = FfmpegCommand()
        .input(subtitle.filename)
        .outputOptions([
          `-map 0:s:${subtitle.rIndex}`,
        ])
        .output(output)
        .on('error', ({ message }) => {
          console.log(`An error occurred during extract: ${message}`)
        })
        .on('end', () => {
          mainWindow.webContents.send('subtitle-extract-finished')
          activeCommand = null
        })
        .run()
    } catch (err) {
      console.log(err)
    }
  })
}
