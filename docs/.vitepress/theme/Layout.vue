<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import SiteFooter from './SiteFooter.vue'
import release from '../../public/release/latest.json'

const { frontmatter } = useData()
const version = release.app_version
const status = release.overall_status
</script>

<template>
  <DefaultTheme.Layout>
    <!-- 首页 hero 下方低调版本徽章（设计规格 §4：首页唯一徽章） -->
    <template #home-hero-actions-after>
      <p v-if="frontmatter.layout === 'home'" class="sb-hero-badge">
        v{{ version }} · {{ status }} ·
        <a href="/status/">安装包与固件尚未正式发布</a>
      </p>
    </template>

    <!-- 全站统一页脚（设计规格 §7） -->
    <template #layout-bottom>
      <SiteFooter />
    </template>
  </DefaultTheme.Layout>
</template>
