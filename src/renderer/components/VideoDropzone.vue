<template>
  <div
    class="video-dropzone"
    @dragover.prevent
    @dragenter="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.prevent="handleFileDrop"
  >
    {{ isDragOver ? 'Release to continue' : 'Drag video stream over here' }}
  </div>
</template>

<script>
export default {
  name: 'VideoDropzone',
  data() {
    return {
      isDragOver: false,
    }
  },
  methods: {
    handleFileDrop({ dataTransfer: { files } }) {
      this.isDragOver = false
      if (!files.length) {
        alert('No files were found.')
        return
      }
      this.$emit('drop', [...files].map(({ path }) => path))
    },
  },
}
</script>

<style scoped lang="scss">
.video-dropzone {
  align-items: center;
  border: 2px dashed #455d6b;
  border-radius: 1rem;
  bottom: 2rem;
  box-sizing: border-box;
  color: #86e3ff;
  display: flex;
  font-size: 1.5rem;
  justify-content: center;
  left: 2rem;
  position: absolute;
  right: 2rem;
  top: 2rem;
}
</style>
