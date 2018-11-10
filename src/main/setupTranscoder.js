import path from 'path'
import glob from 'glob'
import fs from 'fs-extra'
import uuidv1 from 'uuid/v1'
import { ipcMain } from 'electron'
import { PassThrough } from 'stream'
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

function escape(string) {
  const chars = ['*', '+', '?', '!', '{', '}', '[', ']', '(', ')', '|', '@']
  return string.replace(new RegExp(`[\\${chars.join('\\')}]`, 'g'), (match) => `\\${match}`)
}

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

export default function (mainWindow) {
  ipcMain.on('parse-video-info', (event, file) => {
    const { dir, name } = path.parse(file)
    glob(`${escape(path.join(dir, name))}.*`, async (err, files) => {
      try {
        if (err) {
          throw err
        }
        const entries = await Promise.all(files.map(probe))
        const video = []
        const audio = []
        const subtitle = []
        for (const entry of entries) {
          const external = entry.format.filename !== file
          const { filename } = entry.format
          const totalSubtitles = entry.streams.filter(({ codec_type: t }) => t === 'subtitle').length
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
                  rIndex = index - totalSubtitles - 1
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
  })

  ipcMain.on('video-transcode-start', async (event, { video, audio, subtitle }) => {
    try {
      const output = `${video.filename.split('.')[0]}_out.mp4`

      await fs.remove(output)
      const previewStream = new PassThrough()
      const writeStream = fs.createWriteStream(output)

      let command = FfmpegCommand()
        .input(video.filename)
        .audioCodec('aac')
        .audioChannels(2)
        .videoCodec('libx264')

      if (['dvd_subtitle', 'hdmv_pgs_subtitle'].indexOf(subtitle.codec) >= 0) {
        // picture sub
        command = command.complexFilter(`[0:s:${subtitle.rIndex}]scale=${video.width}:${video.height}[sub];[0:v][sub]overlay'`)
      } else {
        // text sub
        command = command.videoFilters(`subtitles='${subtitle.filename}:si=${subtitle.rIndex}'`)
      }

      command = command
        .outputOptions([
          '-x264-params keyint=48:scenecut=0',
          '-pix_fmt yuv420p',
          `-map 0:${video.index}`,
          `-map 0:${audio.index}`,
          '-map_chapters -1',
          '-map_metadata -1',
          '-vsync 2',
          '-reset_timestamps 1',
          '-preset fast',
          '-crf 18',
          '-threads 0',
          '-movflags frag_keyframe+default_base_moof',
        ])
        .outputFormat('mp4')
        .on('progress', (progress) => {
          mainWindow.webContents.send('video-transcode-progress', progress)
        })
        .on('error', (err, stdout, stderr) => {
          console.log(`An error occurred: ${err.message}`, stderr)
        })

      previewStream.on('data', (chunk) => {
        writeStream.write(chunk)
        mainWindow.webContents.send('video-chunk', chunk)
      })

      previewStream.on('end', () => {
        writeStream.end()
        mainWindow.webContents.send('video-transcode-finished')
      })

      mainWindow.webContents.send('video-transcode-started')
      command.pipe(previewStream)
    } catch (err) {
      console.log(err)
    }
  })
}
