<template>
  <div id="app">
    <nav>
      <ul>
        <li
          v-for="route in routes" :key="route.path"
          :class="{ isCurrent: route.path === $route.path }"
        >
          <router-link :to="{ path: route.path }">
            {{ route.meta.title }}
          </router-link>
        </li>
      </ul>
    </nav>
    <main>
      <header>
        <transition name="slide-right" mode="out-in">
          <span :key="$route.path">{{ $route.meta.title }}</span>
        </transition>
      </header>
      <section class="view">
        <transition name="slide-right" mode="out-in">
          <router-view/>
        </transition>
      </section>
    </main>
    <div class="window-controls">
      <div class="close" @click="closeWindow" />
    </div>
    <div v-if="appError" class="app-error">
      <pre v-html="JSON.stringify(appError, null, 2)" />
      <i class="mdi mdi-close" @click="appError = null" />
    </div>
  </div>
</template>

<script>
import { remote, ipcRenderer } from 'electron'

export default {
  name: 'App',
  data() {
    return {
      appError: null,
    }
  },
  computed: {
    routes() {
      return this.$router.options.routes.filter(({ path }) => path !== '/')
    },
  },
  mounted() {
    ipcRenderer.addListener('uncaught-error', (event, error) => {
      this.appError = error
    })
  },
  methods: {
    closeWindow() {
      remote.getCurrentWindow().close()
    },
  },
}
</script>

<style scoped lang="scss">
#app {
  border: 1px solid rgba(255, 255, 255, .15);
  border-radius: 4px;
  box-sizing: border-box;
  display: flex;
  height: 100vh;
}

nav {
  background: rgba(33, 44, 66, .4);
  box-shadow: 1px 0 rgba(128, 128, 128, .2);
  flex-shrink: 0;
  padding-top: 3rem;
  position: relative;
  user-select: none;
  width: 15rem;

  ul {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      &.isCurrent {
        background: rgba(255, 255, 255, .1);
        box-shadow: 0 -1px rgba(255, 255, 255, .15), 0 1px rgba(255, 255, 255, .15);
      }

      &:not(:first-child) {
        margin-top: .4rem;
      }

      > a {
        align-items: center;
        color: inherit;
        display: flex;
        height: 3rem;
        padding: 0 1rem;
        text-decoration: none;
      }
    }
  }
}

main {
  background: linear-gradient(to right, rgba(58, 99, 119, 0.1), rgba(17, 61, 107, .15));
  flex: 1;
  position: relative;

  > header {
    align-items: center;
    display: flex;
    height: 3rem;
    left: 15rem;
    padding: 0 2rem;
    position: fixed;
    right: 0;
    user-select: none;
    z-index: 2;
  }

  > .view {
    bottom: 0;
    left: 0;
    overflow-x: hidden;
    // -ms-overflow-style: scrollbar;
    position: absolute;
    right: 0;
    top: 3rem;
  }
}

.window-controls {
  align-items: center;
  -webkit-app-region: drag;
  display: flex;
  height: 3rem;
  left: 0;
  padding: 0 1rem;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 100;

  .close {
    background: #ff5f57;
    border-radius: 50%;
    height: .8rem;
    width: .8rem;

    &:active { background: #bf403b; }
  }
}

.app-error {
  backdrop-filter: blur(10px);
  background: rgba(64, 10, 10, 0.5);
  color: #fff;
  height: 100%;
  position: fixed;
  width: 100%;
  z-index: 200;

  > i {
    cursor: pointer;
    font-size: 2rem;
    position: absolute;
    right: 1rem;
    top: 1rem;
  }

  > pre {
    box-sizing: border-box;
    font-size: 1.2rem;
    font-weight: bold;
    height: 100%;
    margin: 0;
    overflow-x: hidden;
    padding: 3rem;
    white-space: pre-wrap;
  }
}
</style>
