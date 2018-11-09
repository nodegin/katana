import { ipcMain } from 'electron'
import FfmpegCommand from 'fluent-ffmpeg'
import { path as ffmpeg } from 'ffmpeg-static'
import { path as ffprobe } from 'ffprobe-static'

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

export default function (mainWindow) {
  ipcMain.on('parse-video-info', async (event, video) => {
    FfmpegCommand.ffprobe(video, (err, data) => {
      if (err) {
        mainWindow.webContents.send('debug', { error: err.message })
        return
      }
      const { streams } = data
      console.log(streams)
    })
  })
}
