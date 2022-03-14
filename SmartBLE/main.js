import App from './App'

// #ifndef VUE3
import Vue from 'vue'
Vue.config.productionTip = false

// 引入全局组件
import divider from './components/divider.vue';
Vue.component('divider', divider)

// 工具
import $Tool from './common/tool.js';
Vue.prototype.$Tool = $Tool
// 配置
import $Config from './common/config.js'
Vue.prototype.$Config = $Config
// 演示数据
import $Mock from './common/mock.js'
Vue.prototype.$Mock = $Mock

App.mpType = 'app'
const app = new Vue({
    ...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
// #endif