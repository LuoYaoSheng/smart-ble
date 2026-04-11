import { createSSRApp } from 'vue'
import * as Pinia from 'pinia'
import App from './App.vue'

// import './uni.promisify.adaptor' // Optional, kept for compatibility if needed in Vue 3 context. Let's omit if not explicitly required, or we can keep it. Vue3 default projects sometimes use it.

export function createApp() {
  const app = createSSRApp(App)
  const pinia = Pinia.createPinia()
  app.use(pinia)
  
  return {
    app,
    Pinia
  }
}