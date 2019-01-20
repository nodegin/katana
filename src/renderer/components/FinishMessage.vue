<template>
  <div class="transcode-finished">
    <div>
      <i class="mdi mdi-check" />
      <h1>Transcode Finished</h1>
      <a href="#" @click.prevent="startOver">Done</a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FinishMessage',
  methods: {
    startOver() {
      const { path } = this.$route
      this.$router.push({ path: '/404' })
      this.$nextTick(() => this.$router.push({ path }))
    },
  },
}
</script>

<style scoped lang="scss">
.transcode-finished {
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;

  > div {
    text-align: center;

    > i {
      color: #85d085;
      font-size: 5rem;
    }

    > h1 {
      margin: 2rem 0;
    }
  }
}
</style>
