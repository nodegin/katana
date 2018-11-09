<template>
  <div id="app">
    <nav>
      <div class="drag-region" />
      <div class="window-controls">
        <div class="close" @click="closeWindow" />
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
  </div>
</template>

<script>
import { remote } from 'electron'

export default {
  name: 'App',
  computed: {
    routes() {
      return this.$router.options.routes.filter(({ path }) => path !== '/')
    },
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
  position: relative;
  user-select: none;
  width: 15rem;

  .drag-region {
    -webkit-app-region: drag;
    height: 3rem;
  }

  .window-controls {
    align-items: center;
    display: flex;
    height: 3rem;
    left: 1rem;
    position: absolute;
    top: 0;

    .close {
      background: #ff5f57;
      border-radius: 50%;
      height: .8rem;
      width: .8rem;

      &:active { background: #bf403b; }
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
    -webkit-app-region: drag;
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
</style>
