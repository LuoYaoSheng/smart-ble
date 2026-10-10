// docs/.vitepress/theme/index.js
// 2026-09-11 官网产品化重设计：Layout 包装（hero 版本徽章 + 全站页脚），皮肤仍由 style.css 投影。
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout
}
