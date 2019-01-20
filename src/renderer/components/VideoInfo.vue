<template>
  <div class="video-info-container">
    <div
      v-for="{ type, icon, title } in categories"
      :key="type"
      class="video-info"
    >
      <div class="category">
        <i :class="`mdi mdi-${icon}`" />
        <span>{{ title }}</span>
      </div>
      <div
        v-for="track in infoData[type]"
        :key="track._id"
        :class="{
          track: true,
          selected: value[type] && value[type]._id === track._id,
        }"
        @click="updateValue(type, track)"
      >
        <header>
          <div class="track-index">
            {{ track.external ? 'External' : 'Internal' }} Track
            <template v-if="type === 'subtitle' && !track.external">
              {{ `${track.index} -> ${track.rIndex}` }}
            </template>
            <template v-else>
              {{ track.index }}
            </template>
          </div>
          {{ track.title }}
          <template v-if="type === 'video'">
            ({{ track.width }}x{{ track.height }})
          </template>
          <div class="spacer" />
          {{ track.codec }} ({{ track.language || 'und' }})
        </header>
        <footer>{{ basename(track.filename) }}</footer>
      </div>
    </div>
  </div>
</template>

<script>
import path from 'path'

const allowedCategories = [
  { type: 'video', title: 'Video', icon: 'filmstrip' },
  { type: 'audio', title: 'Audio', icon: 'headphones' },
  { type: 'subtitle', title: 'Subtitle', icon: 'subtitles-outline' },
]

export default {
  name: 'VideoInfo',
  props: {
    infoData: {
      type: Object,
      required: true,
    },
    value: {
      type: Object,
      required: true,
    },
  },
  computed: {
    categories() {
      return Object.keys(this.value).map((t) => allowedCategories.find(({ type }) => type === t))
    },
  },
  methods: {
    basename(filename) {
      return path.basename(filename)
    },
    updateValue(type, track) {
      const value = { ...this.value }
      if (value[type] && value[type]._id === track._id) {
        value[type] = null
      } else {
        value[type] = track
      }
      this.$emit('input', value)
    },
  },
}
</script>

<style scoped lang="scss">
.video-info {
  .category {
    align-items: center;
    display: flex;
    font-size: 1.5rem;
    height: 4rem;

    > i { margin: 0 2rem; }
  }

  .track {
    border: 2px solid #455d6b;
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
      display: flex;
      font-size: 1.2rem;

      .track-index {
        color: #86e3ff;
        width: 14rem;
      }
      .spacer { flex: 1; }
    }

    footer {
      color: #afafaf;
      font-size: .9rem;
      margin-top: .5rem;
      word-break: break-all;
    }
  }
}
</style>
