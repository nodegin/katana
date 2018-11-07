// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const { ipcRenderer, remote } = require('electron')

// title bar
document.querySelector('#dev').onclick = () => remote.getCurrentWindow().openDevTools({ mode: 'detach' })
document.querySelector('#close').onclick = () => remote.getCurrentWindow().close()


const select = document.querySelector('#select')
const result = document.querySelector('#result')

const videoInput = document.querySelector('#video-input')
const video = document.querySelector('video')

document.querySelector('#submit').addEventListener('click', (event) => {
  const { path } = videoInput.files[0]
  ipcRenderer.send('load-video', path)
})


ipcRenderer.on('video-transcode-started', (event, data) => {
  select.style.display = 'none'
  result.style.display = 'block'
})

ipcRenderer.on('video-transcode-finished', (event, data) => {
  remote.getCurrentWindow().reload()
  alert('Transcode finished!')
})

//////////////////////////////////////////////////

function main() {
  const mime = 'video/mp4; codecs="avc1.640028, mp4a.40.2"'

  if (!MediaSource.isTypeSupported(mime)) {
    alert('Unsuported mime type')
    return
  }

  let buffer_size = 50 * 1024 * 1024 // 50 mb per chunk. is it possible to have bigger than this??
  let buffer_index = 0
  let frag_mp4_buffer = new Uint8Array(buffer_size)
  let mediaSource = new MediaSource()

  mediaSource.addEventListener('sourceended', (e) => console.log('sourceended: ' + mediaSource.readyState))
  mediaSource.addEventListener('sourceclose', (e) => console.log('sourceclose: ' + mediaSource.readyState))
  mediaSource.addEventListener('error', (e) => console.log('error: ' + mediaSource.readyState))
  video.src = URL.createObjectURL(mediaSource)

  mediaSource.addEventListener('sourceopen', (e) => {
    // on data
    console.log('sourceopen: ' + mediaSource.readyState)

    const buffer = mediaSource.addSourceBuffer(mime)

    buffer.addEventListener('updateend', (e) => {
      if (video.duration && !video.currentTime) {
        video.currentTime = video.duration;
      }
    })

    ipcRenderer.on('video-chunk', (event, data) => {
      if (data.length) {
        console.log('video-chunk', data.length)
        if ((buffer_index + data.length) <= buffer_size) {
          frag_mp4_buffer.set(data, buffer_index)
          buffer_index = buffer_index + data.length

          if (!buffer.updating && mediaSource.readyState === 'open') {
            const buf = frag_mp4_buffer.slice(0, buffer_index)

            buffer.appendBuffer(buf)
            frag_mp4_buffer.fill(0)
            buffer_index = 0

            // always preview last
            if (video.duration) {
              video.currentTime = Math.max(0, video.duration - 1)
            }
          }
        }
      }
    })
  }, false)
}

main()