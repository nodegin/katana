<template>
  <div class="container">
    <pre
      v-if="debug"
      style="width: 100%;word-break: break-all;white-space: pre-wrap;"
      v-html="JSON.stringify(debug, null, 2)"
    />
    <template v-else-if="isLoading">
      <loader />
    </template>
    <template v-else>
      <div
        class="video-dropzone"
        @dragover.prevent
        @dragenter="isDragOver = true"
        @dragleave="isDragOver = false"
        @drop.prevent="handleFileDrop"
      >
        {{ isDragOver ? 'Drop here' : 'Drag video stream over here' }}
      </div>
    </template>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import Loader from '@/components/Loader'

export default {
  name: 'SingleConversionView',
  components: {
    Loader,
  },
  data() {
    return {
      isLoading: false,
      isDragOver: false,
      debug: null,
    }
  },
  beforeDestroy() {
    ipcRenderer.removeListener('debug', this.debugListener)
  },
  mounted() {
    ipcRenderer.addListener('debug', this.debugListener)
  },
  methods: {
    debugListener(event, data) {
      this.debug = data
    },
    handleFileDrop({ dataTransfer: { files: [file] } }) {
      this.isDragOver = false
      if (!file) {
        alert('No file was found.')
        return
      }
      ipcRenderer.send('parse-video-info', file.path)
      this.isLoading = true
    },
  },
}
</script>

<style scoped lang="scss">
.container {
  height: 100%;
}

.video-dropzone {
  align-items: center;
  border: 2px dashed rgba(182, 201, 255, .5);
  border-radius: 1rem;
  box-sizing: border-box;
  color: #b6c9ff;
  display: flex;
  font-size: 1.5rem;
  height: calc(100% - 2rem);
  justify-content: center;
  margin: 0 2rem 2rem;
}
</style>
