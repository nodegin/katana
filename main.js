// Modules to control application life and create native browser window
const fs = require('fs-extra')
const { PassThrough } = require('stream')
const { app, BrowserWindow, ipcMain } = require('electron')
const { path } = require('ffmpeg-static-electron')
const FfmpegCommand = require('fluent-ffmpeg')

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
FfmpegCommand.setFfmpegPath(path)

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let previewStream

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent:true,
    frame: false,
    webPreferences: {
      experimentalFeatures: true,
    },
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  ipcMain.on('load-video', async (event, path) => {
    const output = path.split('.')[0] + '__output.mp4'
    const subtitle = path.split('.')[0] + '.ass'

    await fs.remove(output)
    previewStream = new PassThrough()
    const writeStream = fs.createWriteStream(output)

    const command = FfmpegCommand()
      .input(path)
      .audioCodec('aac')
      .audioChannels(2)
      .videoCodec('libx264')
      .videoFilters(`subtitles='${subtitle}'`)
      .outputOptions([
        '-x264-params keyint=48:scenecut=0',
        '-pix_fmt yuv420p',
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
      .on('error', (err, stdout, stderr) => {
        console.log('An error occurred: ' + err.message, stderr)
      })

    previewStream.on('data', (chunk) => {
      writeStream.write(chunk)
      mainWindow.webContents.send('video-chunk', chunk)
      console.log('ffmpeg just wrote ' + chunk.length + ' bytes')
    })

    previewStream.on('end', () => {
      writeStream.end()
      previewStream = null
      mainWindow.webContents.send('video-transcode-finished')
    })

    mainWindow.webContents.send('video-transcode-started')
    command.pipe(previewStream)
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    if (previewStream) {
      previewStream.destroy()
    }
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
  app.quit()
  // }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
