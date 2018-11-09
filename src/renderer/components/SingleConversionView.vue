<template>
  <div class="container">
    <template v-if="isLoading">
      <loader />
    </template>
    <template v-else-if="videoInfo">
      <div v-for="{ type, icon, title } in categories" :key="type" class="video-info">
        <div class="category">
          <i :class="`mdi mdi-${icon}`" />
          <span>{{ title }}</span>
        </div>
        <div
          v-for="track in videoInfo[type]"
          :key="track._id"
          :class="{
            track: true,
            selected: selectedTracks[type] && selectedTracks[type]._id === track._id,
          }"
          @click="updateSelectedTrack(type, track)"
        >
          <header>
            Track {{ track.index }}
            {{ '&#x3000;' }}
            {{ track.codec_name }}
          </header>
          <footer>
            File: {{ track.filename }}
          </footer>
        </div>
      </div>
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
      videoInfo: null,
      categories: [
        { type: 'video', title: 'Video', icon: 'filmstrip' },
        { type: 'audio', title: 'Audio', icon: 'headphones' },
        { type: 'subtitle', title: 'Subtitle', icon: 'subtitles-outline' },
      ],
      selectedTracks: {
        video: null,
        audio: null,
        subtitle: null,
      },
    }
  },
  beforeDestroy() {
    ipcRenderer.removeListener('video-info-parsed', this.onVideoInfoParsed)
  },
  mounted() {
    ipcRenderer.addListener('video-info-parsed', this.onVideoInfoParsed)
  },
  methods: {
    onVideoInfoParsed(event, data) {
      this.isLoading = false
      this.videoInfo = data
    },
    updateSelectedTrack(type, track) {
      if (this.selectedTracks[type] && this.selectedTracks[type]._id === track._id) {
        this.selectedTracks[type] = null
      } else {
        this.selectedTracks[type] = track
      }
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
  user-select: none;
}

.video-info {
  .category {
    align-items: center;
    display: flex;
    font-size: 1.5rem;
    height: 4rem;

    > i { margin: 0 2rem; }
  }

  .track {
    border: 2px solid #45556b;
    cursor: pointer;
    padding: 1rem 2rem;
    transition: border-color .2s;

    & + .track {
      margin-top: -2px;
    }

    &.selected {
      border-color: #86e3ff;
      position: relative;
      z-index: 1;
    }

    header {
      font-size: 1.2rem;
    }

    footer {
      color: #afafaf;
      font-size: .9rem;
      margin-top: .5rem;
    }
  }
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
