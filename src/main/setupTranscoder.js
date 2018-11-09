import path from 'path'
import glob from 'glob'
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

function escape(string) {
  const chars = ['*', '+', '?', '!', '{', '}', '[', ']', '(', ')', '|', '@'];
  return string.replace(new RegExp('[' + '\\' + chars.join('\\') + ']', 'g'), (match) => `\\${match}`)
}

function probe(file) {
  return new Promise((resolve, reject) => {
    FfmpegCommand.ffprobe(file, (err, result) => {
      if (err) return reject(err)
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
          const filename = path.basename(entry.format.filename)
          for (const stream of entry.streams) {
            console.log(stream)
            const { codec_type, index, codec_name, tags } = stream
            const language = tags ? tags.language : 'und'
            const _id = uuidv1()
            switch (codec_type) {
              case 'video': {
                video.push({ _id, filename, index, codec_name, language })
                break
              }
              case 'audio': {
                audio.push({ _id, filename, index, codec_name, language })
                break
              }
              case 'subtitle': {
                subtitle.push({ _id, filename, index, codec_name, language })
                break
              }
              default: {
                console.log(`Unknown codec_type "${codec_type}": ${stream} (${filename})`)
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
}
