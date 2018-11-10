import Vue from 'vue'
import VueElectron from 'vue-electron'
import PortalVue from 'portal-vue'

import './assets/style/main.scss'
import './assets/style/mdi.css'

import App from './App'
import router from './router'
import store from './store'

Vue.use(VueElectron)
Vue.use(PortalVue)

Vue.config.productionTip = false
Vue.config.devtools = true

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>',
}).$mount('#app')

/* Enable webpack hot reloading */
if (module.hot) {
  module.hot.accept()
}
