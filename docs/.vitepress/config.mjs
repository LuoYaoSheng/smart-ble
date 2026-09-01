import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Smart BLE",
  description: "Smart BLE PREVIEW：UniApp、微信小程序与 ESP32 协同的 BLE 调试和验证工具。正式产物尚未发布（NOT_RELEASED）。",
  lang: 'zh-CN',
  base: '/',
  cleanUrls: true,

  // ═══ SEO 与社交元数据（与 PREVIEW 诚实状态一致） ═══
  head: [
    // Favicon
    ['link', { rel: 'icon', type: 'image/png', href: '/brand/icon.png' }],
    ['link', { rel: 'canonical', href: 'https://lightble.i2kai.com/' }],

    // Canonical & Author
    ['meta', { name: 'author', content: 'luoyaosheng' }],
    ['meta', { name: 'keywords', content: 'Smart BLE,BLE,低功耗蓝牙,UniApp BLE,微信小程序 BLE,ESP32,LightBLE,PREVIEW,NOT_RELEASED' }],

    // OpenGraph
    ['meta', { property: 'og:type',        content: 'website' }],
    ['meta', { property: 'og:site_name',   content: 'Smart BLE' }],
    ['meta', { property: 'og:title',       content: 'Smart BLE — PREVIEW · UniApp / 微信小程序 / ESP32 BLE 调试工具' }],
    ['meta', { property: 'og:description', content: '预览阶段产品。正式 APK、小程序码与固件尚未发布（NOT_RELEASED）。请从源码与目标规范了解主线。' }],
    ['meta', { property: 'og:image',       content: 'https://lightble.i2kai.com/brand/share.png' }],
    ['meta', { property: 'og:url',         content: 'https://lightble.i2kai.com/' }],
    ['meta', { property: 'og:locale',      content: 'zh_CN' }],

    // Twitter Card
    ['meta', { name: 'twitter:card',        content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title',       content: 'Smart BLE — PREVIEW' }],
    ['meta', { name: 'twitter:description', content: 'UniApp、微信小程序与 ESP32 协同的 BLE 调试工具。正式产物尚未发布。' }],
    ['meta', { name: 'twitter:image',       content: 'https://lightble.i2kai.com/brand/share.png' }],

    // 主题色
    ['meta', { name: 'theme-color', content: '#1B6DFF' }],
  ],

  themeConfig: {
    logo: '/brand/icon.png',
    
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: 'UniApp 产品规范', link: '/product-contract/' },
      { text: '快速上手', link: '/tutorials/01_introduction_and_setup' },
      { text: 'API/架构参考', link: '/MASTER_ARCHITECTURE' }
    ],

    // 侧边树结构正规化大纲
    sidebar: [
      {
        text: '📋 UniApp 第一完整版本（当前正典）',
        collapsed: false,
        items: [
          { text: '产品契约入口', link: '/product-contract/' },
          { text: '功能目录', link: '/product-contract/02_FEATURE_CATALOG' },
          { text: '用户流程', link: '/product-contract/03_USER_FLOWS' },
          { text: '页面契约', link: '/product-contract/04_PAGE_CONTRACTS' },
          { text: '平台适配矩阵', link: '/product-contract/05_PLATFORM_MATRIX' },
          { text: 'ESP32 参考硬件', link: '/product-contract/06_ESP32_REFERENCE' },
          { text: '测试与发布门禁', link: '/product-contract/07_TEST_MATRIX' }
        ]
      },
      {
        text: '📘 第一章：简介与起步 (Introduction)',
        items: [
          { text: '什么是 Smart BLE?', link: '/tutorials/01_introduction_and_setup' }
        ]
      },
      {
        text: '🖥️ 第二章：客户端操作指南 (User Guide)',
        items: [
          { text: '高并发纯广播点灯技巧与生态', link: '/tutorials/02_advanced_usage_and_broadcast' }
        ]
      },
      {
        text: '🛠️ 第三章：多端编译与开发指南 (Developer Guide)',
        items: [
          { text: 'Flutter 编译与高精度权限避坑', link: '/tutorials/platforms/flutter' },
          { text: 'UniApp/微信小程序隐私限制处理', link: '/tutorials/platforms/uniapp' },
          { text: 'Tauri & Electron 桌面双核实操', link: '/tutorials/platforms/desktop' },
          { text: 'iOS/Android 原生硬核开发通道', link: '/tutorials/platforms/native_mobile' }
        ]
      },
      {
        text: '🔩 第四章：硬件底盘与固件开发 (Hardware SDK)',
        collapsed: false,
        items: [
          { text: '双芯选型哲学与低成本验证', link: '/tutorials/hardware/01_Hardware_Philosophy' },
          { text: 'C 语言下位机工业规范', link: '/tutorials/hardware/02_C_Architecture' },
          { text: '零延迟战报与防卡死验证', link: '/tutorials/hardware/03_Zero_Delay_Protocol' }
        ]
      },
      {
        text: '🌌 第五章：底层架构白皮书 (Architecture & Core)',
        items: [
          { text: '纯广播无极群控生态蓝图 (NEW)', link: '/ARCHITECTURE_BROADCAST_CONTROL' },
          { text: '全栈跨端架构蓝图 (MASTER)', link: '/MASTER_ARCHITECTURE' },
          { text: '跨框架 BLE API 全景映射', link: '/CROSS_PLATFORM_BLE_GUIDE' },
          { text: '端到端防御性队列与 WatchDog', link: '/CORE_LOGIC_GUIDE' },
          { text: '跨平台 UI 与组件流转规约', link: '/UI_COMPONENTS_GUIDE' },
          { text: '核心业务数据中台交互', link: '/COMPONENT_INTERACTION_SPEC' }
        ]
      },
      {
        text: '🔬 附录：自动化测试与疑难杂症',
        items: [
          { text: '端到端 Mock 模拟联调指导', link: '/E2E_MOCK_INSTRUCTIONS' },
          { text: '发版前回归测试天书', link: '/test-checklist' },
          { text: '开发大盘百问百科 (FAQ)', link: '/BLE_FAQ' },
          { text: '微信开发特例与隐蔽大坑', link: '/wechat-pitfalls' },
          { text: '社区贡献指北 (Contributing)', link: '/CONTRIBUTING_GUIDE' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/luoyaosheng/smart-ble' }
    ]
  }
})
