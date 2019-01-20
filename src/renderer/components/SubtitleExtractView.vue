<template>
  <main>
    <loader v-if="isLoading" />
    <finish-message v-else-if="isFinished" />
    <template v-else-if="videoInfo">
      <video-info
        v-model="selectedTracks"
        :info-data="videoInfo"
      />
      <portal to="route-actions">
        <button @click="startExtract">
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

export default {
  name: 'SubtitleExtractView',
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
        subtitle: null,
      },
      isFinished: false,
    }
  },
  beforeDestroy() {
    this.setPreventUnload(false)
    ipcRenderer.removeListener('video-info-parsed', this.onVideoInfoParsed)
    ipcRenderer.removeListener('subtitle-extract-finished', this.onSubtitleExtractFinished)
  },
  mounted() {
    ipcRenderer.addListener('video-info-parsed', this.onVideoInfoParsed)
    ipcRenderer.addListener('subtitle-extract-finished', this.onSubtitleExtractFinished)
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
    startExtract() {
      const { subtitle } = this.selectedTracks
      if (!subtitle) {
        alert('Subtitle track not selected')
        return
      }
      ipcRenderer.send('subtitle-extract-start', subtitle)
      this.isLoading = true
    },
    onSubtitleExtractFinished() {
      this.setPreventUnload(false)
      this.isLoading = false
      this.isFinished = true
    },
  },
}
</script>

<style scoped lang="scss">
</style>
