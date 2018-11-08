// eslint-disable-next-line
import { app, BrowserWindow } from 'electron'
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true

let mainWindow
let winURL

if (process.env.NODE_ENV === 'development') {
  winURL = 'http://localhost:9080'

  try {
    // eslint-disable-next-line
    require('electron-debug')({ showDevTools: true })
  } catch (err) {
    console.log(
      'Failed to install `electron-debug`: Please set `NODE_ENV=production` before build to avoid installing debugging packages. ',
    )
  }
} else {
  winURL = `file://${__dirname}/index.html`

  /**
   * Set `__static` path to static files in production
   * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
   */
  // eslint-disable-next-line
  global.__static = require('path')
    .join(__dirname, '/static')
    .replace(/\\/g, '\\\\') // eslint-disable-line
}

function installDevTools() {
  try {
    require('devtron').install() //eslint-disable-line
    require('vue-devtools').install() //eslint-disable-line
  } catch (err) {
    console.log(
      'Failed to install `devtron` & `vue-devtools`: Please set `NODE_ENV=production` before build to avoid installing debugging packages. ',
    )
  }
}

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    useContentSize: true,
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    resizable: false,
    vibrancy: 'dark',
    webPreferences: {
      experimentalFeatures: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
    },
    show: false,
  })

  // mainWindow.setMenu(null)
  mainWindow.loadURL(winURL)

  // Show when loaded
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()

    if (
      process.env.ELECTRON_ENV === 'development'
      || process.argv.indexOf('--debug') !== -1
    ) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  createWindow()

  if (process.env.NODE_ENV === 'development') {
    installDevTools()
  }
})

app.on('window-all-closed', () => {
  // if (process.platform !== 'darwin') {
  app.quit()
  // }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
