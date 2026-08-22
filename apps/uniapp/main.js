import { createSSRApp } from 'vue'
import * as Pinia from 'pinia'
import App from './App.vue'
import './services/provisioning/builtins.js'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = Pinia.createPinia()
  app.use(pinia)
  
  return {
    app,
    Pinia
  }
}
