import { createSSRApp } from 'vue'
import * as Pinia from 'pinia'
import App from './App.vue'
import { createI18n } from '@dcloudio/uni-i18n'
import en from './locale/en-US.json'
import zh from './locale/zh-CN.json'

// Detect system language; default to zh-CN for Chinese systems
const sysLang = (() => {
  try {
    const lang = uni.getSystemInfoSync().language || 'zh-CN'
    return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
  } catch {
    return 'zh-CN'
  }
})()

const i18n = createI18n({
  locale: sysLang,
  fallbackLocale: 'zh-CN',
  messages: {
    'en-US': en,
    'zh-CN': zh
  }
})

export function createApp() {
  const app = createSSRApp(App)
  const pinia = Pinia.createPinia()
  app.use(pinia)
  app.use(i18n)
  
  return {
    app,
    Pinia
  }
}