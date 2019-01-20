import Vue from 'vue'
import Router from 'vue-router'

import HomeView from '@/components/HomeView'
import SingleConversionView from '@/components/SingleConversionView'
import SubtitleExtractView from '@/components/SubtitleExtractView'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      redirect: '/single-conversion',
    },
    {
      path: '/single-conversion',
      component: SingleConversionView,
      meta: { title: 'Single Conversion' },
    },
    {
      path: '/subtitle-extract',
      component: SubtitleExtractView,
      meta: { title: 'Subtitle Extract' },
    },
    {
      path: '/multi-conversion',
      component: HomeView,
      meta: { title: 'Multi Conversion' },
    },
  ],
})
