<script setup>
import release from '../../public/release/latest.json'

const version = release.app_version
const status = release.overall_status
</script>

<template>
  <footer class="sb-footer">
    <div class="sb-footer-inner">
      <div class="sb-footer-brand">
        <img src="/brand/icon.png" alt="BLE Toolkit+ icon" width="28" height="28">
        <span>BLE Toolkit+</span>
      </div>
      <nav class="sb-footer-nav" aria-label="页脚导航">
        <a href="/#features">功能</a>
        <a href="/#get">获取</a>
        <a href="/status/">项目状态</a>
        <a href="/product-contract/">文档</a>
        <a href="https://github.com/luoyaosheng/smart-ble" target="_blank" rel="noopener">GitHub</a>
      </nav>
      <p class="sb-footer-status">
        当前状态 {{ status }}（v{{ version }}）·
        <a href="/release/latest.json">Release Metadata</a> ·
        安装包与固件尚未正式发布 ·
        © 2026 BLE Toolkit+ · MIT License
      </p>
    </div>
  </footer>
</template>
