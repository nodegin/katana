import path from 'path'
import fs from 'fs-extra'
import glob from 'fast-glob'
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
  return string.replace(new RegExp('[' + '\\' + chars.join('\\') + ']', 'g'), (match) => `[${match}]`)
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
  ipcMain.on('parse-video-info', async (event, video) => {
    const { dir, name } = path.parse(video)
    let entries = await glob(`${escape(path.join(dir, name))}.*`)
    entries = entries.map(probe)
    entries = await Promise.all(entries)
    const videos = []
    const audios = []
    const subtitles = []
    for (const entry of entries) {
      const { filename } = entry.format
      for (const stream of entry.streams) {
        const { codec_type, index, codec_name } = stream
        switch (codec_type) {
          case 'video': {
            console.log(`Found video "${codec_name}" at #${index} (${filename})`)
            break
          }
          case 'audio': {
            console.log(`Found audio "${codec_name}" at #${index} (${filename})`)
            break
          }
          case 'subtitle': {
            console.log(`Found subtitle "${codec_name}" at #${index} (${filename})`)
            break
          }
          default: {
            console.log(`Unknown codec_type "${codec_type}": ${stream} (${filename})`)
            break
          }
        }
      }
    }
  })
}
