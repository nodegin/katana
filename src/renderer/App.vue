<template>
  <div id="app">
    <nav>
      <div class="window-controls">
        <div class="button close" @click="closeWindow" />
        <div class="button minimize" @click="minimizeWindow" />
      </div>
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
    <div class="view-container">
      <header>
        <transition name="slide-right" mode="out-in">
          <span :key="$route.path" class="title">{{ $route.meta.title }}</span>
        </transition>
        <portal-target name="route-actions" class="route-actions" />
      </header>
      <section class="view">
        <transition name="slide-right" mode="out-in">
          <router-view/>
        </transition>
      </section>
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
    minimizeWindow() {
      remote.getCurrentWindow().minimize()
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
  position: relative;
  width: 15rem;
  z-index: 100;

  .window-controls {
    align-items: center;
    -webkit-app-region: drag;
    display: flex;
    height: 3rem;
    padding: 0 12px;
    width: 100%;

    > .button {
      -webkit-app-region: no-drag;
      border-radius: 50%;
      height: 12px;
      width: 12px;

      &:not(:first-child) {
        margin-left: 8px;
      }
    }

    > .close {
      background: #ff5f57;
      &:active { background: #bf403b; }
    }

    > .minimize {
      background: #ffbe2f;
      &:active { background: #bf9123; }
    }
  }

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
        outline: 0 !important;
        padding: 0 1rem;
        text-decoration: none;
      }
    }
  }
}

.view-container {
  background: linear-gradient(to right, rgba(58, 99, 119, 0.1), rgba(17, 61, 107, .15));
  flex: 1;
  position: relative;
  z-index: 100;

  > header {
    align-items: center;
    -webkit-app-region: drag;
    display: flex;
    height: 3rem;
    left: 15rem;
    padding: 0 2rem;
    position: fixed;
    right: 0;
    z-index: 2;

    .title {
      flex: 1;
    }

    .route-actions > :global(button) {
      -webkit-app-region: no-drag;
      background: rgba(108, 110, 110, .8);
      border: 0;
      border-radius: 4px;
      box-shadow: 0 0 1px rgba(0, 0, 0, .25), inset 0 1px rgba(255, 255, 255, .1);
      color: #fff;
      font: inherit;
      font-size: .9rem;
      height: 1.5rem;
      outline: 0;

      &:active {
        background: rgba(128, 130, 130, .85);
      }
    }
  }

  > .view {
    bottom: 0;
    left: 0;
    overflow-x: hidden;
    position: absolute;
    right: 0;
    top: 3rem;

    > main {
      height: 100%;
      position: relative;
    }

    &::-webkit-scrollbar {
      width: .6rem;
    }

    &::-webkit-scrollbar-thumb {
      background-color: #14a8ca;
      background-clip: content-box;
      border: 0 solid transparent;
      border-width: 3px 0 3px 6px;
      border-radius: 1rem 0 0 1rem;
    }
  }
}

.app-error {
  -webkit-app-region: no-drag; // override
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
