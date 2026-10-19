<script setup>
import { computed } from 'vue'
import { useData } from 'vitepress'
import release from '../../public/release/latest.json'

const { lang } = useData()
const english = computed(() => lang.value.startsWith('en'))
const version = release.app_version
const status = release.overall_status
const home = computed(() => english.value ? '/en/' : '/')
</script>

<template>
  <footer class="sb-footer">
    <div class="sb-footer-inner">
      <div class="sb-footer-brand">
        <img src="/brand/icon.png" alt="蓝析BLE工具箱" width="28" height="28">
        <span>蓝析BLE工具箱</span>
      </div>
      <nav class="sb-footer-nav" :aria-label="english ? 'Footer navigation' : '页脚导航'">
        <a :href="`${home}#features`">{{ english ? 'Features' : '功能' }}</a>
        <a :href="`${home}#get`">{{ english ? 'Get started' : '获取' }}</a>
        <a href="/status/">{{ english ? 'Release status' : '发布进度' }}</a>
        <a href="/product-contract/">{{ english ? 'Docs' : '文档' }}</a>
        <a href="/privacy">{{ english ? 'Privacy' : '隐私说明' }}</a>
        <a href="https://github.com/LuoYaoSheng/smart-ble" target="_blank" rel="noopener">GitHub</a>
        <a href="https://gitee.com/luoyaosheng/lys-smart-ble" target="_blank" rel="noopener">Gitee</a>
      </nav>
      <p class="sb-footer-status">
        v{{ version }} · {{ status }} ·
        {{ english ? 'Official installers are in preparation' : '正式安装包准备中' }} ·
        © 2026 蓝析BLE工具箱 · MIT License
      </p>
    </div>
  </footer>
</template>
