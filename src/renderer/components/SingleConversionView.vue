<template>
  <main>
    <loader v-if="isLoading" />
    <finish-message v-else-if="isFinished" />
    <div v-else-if="transcodeStartTime" class="transcode-detail">
      <video ref="preview" autoplay @click="toggleMute" />
      <h1>Transcode In Progress</h1>
      <div v-if="currentProgress" class="progress">
        <span>{{ currentProgress.currentFps }} fps</span>
        <span>{{ currentProgress.currentKbps }} kbits/s</span>
        <span>{{ currentProgress.percent.toFixed(1) }}%</span>
        <span>ETA {{ completionETA }}</span>
      </div>
      <div v-if="currentProgress" class="progress-bar">
        <ins :style="{ width: `${currentProgress.percent}%` }" />
      </div>
    </div>
    <template v-else-if="videoInfo">
      <video-info
        v-model="selectedTracks"
        :info-data="videoInfo"
      />
      <portal to="route-actions">
        <button @click="startTranscode">
          Next
          <i class="mdi mdi-chevron-right" />
        </button>
      </portal>
    </template>
    <video-dropzone v-else @drop="handleFileDrop" />
  </main>
</template>

<script>
import { ipcRenderer } from 'electron'
import { mapMutations } from 'vuex'
import Loader from '@/components/Loader'
import FinishMessage from '@/components/FinishMessage'
import VideoInfo from '@/components/VideoInfo'
import VideoDropzone from '@/components/VideoDropzone'

const BUFFER_SIZE = 50 * 1024 * 1024 // 50 mb per chunk. is it possible to have bigger than this?

export default {
  name: 'SingleConversionView',
  components: {
    Loader,
    FinishMessage,
    VideoInfo,
    VideoDropzone,
  },
  data() {
    return {
      isLoading: false,
      videoInfo: null,
      selectedTracks: {
        video: null,
        audio: null,
        subtitle: null,
      },
      transcodeStartTime: null,
      currentProgress: null,
      // preview stuff
      bufferIndex: 0,
      fragMp4Buffer: null,
      mediaSource: null,
      sourceBuffer: null,
      lastUpdate: 0,
      // end preview stuff
      isFinished: false,
    }
  },
  computed: {
    completionETA() {
      // https://stackoverflow.com/a/852718/3896501
      const elapsedTime = Date.now() - this.transcodeStartTime
      const estimatedRemaining = (elapsedTime * (100 / this.currentProgress.percent)) - elapsedTime
      // format seconds
      let remainSeconds = Math.floor(estimatedRemaining / 1000)
      const hours = Math.floor(remainSeconds / 3600)
      remainSeconds %= 3600
      let minutes = Math.floor(remainSeconds / 60).toString()
      let seconds = (remainSeconds % 60).toString()
      minutes = `0${minutes}`.slice(-2)
      seconds = `0${seconds}`.slice(-2)
      const parts = [minutes, seconds]
      if (hours > 0) {
        parts.unshift(hours)
      }
      return parts.join(':')
    },
  },
  beforeDestroy() {
    this.setPreventUnload(false)
    ipcRenderer.removeListener('video-info-parsed', this.onVideoInfoParsed)
    ipcRenderer.removeListener('video-transcode-started', this.onVideoTranscodeStarted)
    ipcRenderer.removeListener('video-transcode-progress', this.onVideoTranscodeProgress)
    ipcRenderer.removeListener('video-chunk', this.onVideoChunk)
    ipcRenderer.removeListener('video-transcode-finalizing', this.onVideoTranscodeFinalizing)
    ipcRenderer.removeListener('video-transcode-finished', this.onVideoTranscodeFinished)
  },
  mounted() {
    ipcRenderer.addListener('video-info-parsed', this.onVideoInfoParsed)
    ipcRenderer.addListener('video-transcode-started', this.onVideoTranscodeStarted)
    ipcRenderer.addListener('video-transcode-progress', this.onVideoTranscodeProgress)
    ipcRenderer.addListener('video-chunk', this.onVideoChunk)
    ipcRenderer.addListener('video-transcode-finalizing', this.onVideoTranscodeFinalizing)
    ipcRenderer.addListener('video-transcode-finished', this.onVideoTranscodeFinished)
  },
  methods: {
    ...mapMutations('app', [
      'setPreventUnload',
    ]),
    handleFileDrop([path]) {
      ipcRenderer.send('parse-video-info', path)
      this.isLoading = true
    },
    onVideoInfoParsed(event, data) {
      this.isLoading = false
      this.videoInfo = data
    },
    startTranscode() {
      const { video, audio, subtitle } = this.selectedTracks
      if (!video) {
        alert('Video track not selected')
        return
      }
      if (!audio) {
        alert('Audio track not selected')
        return
      }
      if (!subtitle) {
        alert('Subtitle track not selected')
        return
      }
      ipcRenderer.send('video-transcode-start', { video, audio, subtitle })
      this.isLoading = true
    },
    async onVideoTranscodeStarted() {
      this.setPreventUnload(true)
      this.transcodeStartTime = Date.now()
      this.isLoading = false
      await this.$nextTick()
      this.fragMp4Buffer = new Uint8Array(BUFFER_SIZE)
      this.mediaSource = new MediaSource()
      // this.mediaSource.addEventListener('sourceended', () => {
      //   console.log(`[MediaSource] sourceended: ${this.mediaSource.readyState}`)
      // })
      // this.mediaSource.addEventListener('sourceclose', () => {
      //   console.log(`[MediaSource] sourceclose: ${this.mediaSource.readyState}`)
      // })
      // this.mediaSource.addEventListener('error', () => {
      //   console.log(`[MediaSource] error: ${this.mediaSource.readyState}`)
      // })
      this.mediaSource.addEventListener('sourceopen', () => {
        this.sourceBuffer = this.mediaSource.addSourceBuffer('video/mp4; codecs="avc1.640028, mp4a.40.2"')
      })
      this.$refs.preview.src = window.URL.createObjectURL(this.mediaSource)
    },
    toggleMute() {
      this.$refs.preview.muted = !this.$refs.preview.muted
    },
    onVideoTranscodeProgress(event, progress) {
      this.currentProgress = progress
    },
    onVideoChunk(event, chunk) {
      if (!chunk.length) {
        return
      }
      if ((this.bufferIndex + chunk.length) > BUFFER_SIZE) {
        return
      }
      // console.log('Received video chunk with size ', chunk.length)
      this.fragMp4Buffer.set(chunk, this.bufferIndex)
      this.bufferIndex = this.bufferIndex + chunk.length

      if (this.sourceBuffer.updating || this.mediaSource.readyState !== 'open') {
        return
      }

      const now = Date.now()
      if (now - this.lastUpdate > 999) {
        const buf = this.fragMp4Buffer.slice(0, this.bufferIndex)
        this.sourceBuffer.appendBuffer(buf)
        this.fragMp4Buffer.fill(0)
        this.bufferIndex = 0
        // preview last second
        const { preview } = this.$refs
        if (preview.duration) {
          preview.currentTime = Math.max(0, preview.duration - 1)
        }
        this.lastUpdate = now
      }
    },
    onVideoTranscodeFinalizing() {
      this.sourceBuffer.abort()
      this.mediaSource.removeSourceBuffer(this.sourceBuffer)
      window.URL.revokeObjectURL(this.$refs.preview.src)
      this.isLoading = true
    },
    onVideoTranscodeFinished() {
      this.setPreventUnload(false)
      this.isLoading = false
      this.isFinished = true
    },
  },
}
</script>

<style scoped lang="scss">
.transcode-detail {
  display: flex;
  flex-direction: column;
  height: 100%;

  > video {
    max-height: 480px;
    width: 100%;
  }

  > h1 {
    height: 4rem;
    line-height: 4rem;
    text-align: center;
    width: 100%;
  }

  > .progress {
    align-items: center;
    display: flex;
    flex: 1;
    font-size: 1.2rem;
    justify-content: space-around;
  }

  > .progress-bar {
    align-items: center;
    display: flex;
    height: 4rem;
    padding: 0 2rem;

    > ins {
      background: #86e3ff;
      border-radius: 4px;
      display: block;
      height: 4px;
    }
  }
}
</style>
