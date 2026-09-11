import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "BLE Toolkit+",
  description: "BLE Toolkit+（开发预览）：微信小程序、Android 与 ESP32 协同的 BLE 调试与验证工具。微信扫码即用，扫描、连接、读写、广播收进同一条工作流。",
  lang: 'zh-CN',
  base: '/',
  cleanUrls: true,
  // 暗色从未适配（WEB-001 UNPROVEN）：本轮锁浅色，暗色列入后续轮（设计规格 §7）
  appearance: false,
  sitemap: { hostname: 'https://lightble.i2kai.com' },

  // specs/ 文档树用「目录指针/源码指针」链接做溯源（如 [02_product](../02_product/)、
  // design-tokens.json、app_icons.dart——目录无 index.md 或指向 docs 外的仓库源码）。
  // 仅豁免目录/源码指针形态，不掩盖指向具体 .md 文件的真实死链。
  ignoreDeadLinks: [
    /\/index$/, /\/$/, /^\.\/\.$/,
    /\.dart$/, /\.py$/, /\.json$/, /\.js$/, /\.vue$/, /\.swift$/, /\.kt$/, /\.md\.js$/,
    /app-prototype$/, /v1-new$/,
    // 2026-09-11：specs/09_test 矩阵引用 verification/windows-mobile-v1/*/REPORT（目录指针形态）。
    // 该目录属 Windows 机专项（双机分工），本仓/CI 暂无此目录；仍属目录指针豁免范畴，.md 真死链不豁免。
    /windows-mobile-v1\//
  ],

  // ═══ 双语：root=中文，/en/=英文首页（D5）；语言切换用 VitePress 内置 locale 切换器（nav 不再手写 EN/中文 项）═══
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '功能', link: '/#features' },
          { text: '文档', link: '/product-contract/' },
          { text: '状态', link: '/status/' }
        ]
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'BLE Toolkit+',
      description: 'One toolkit to debug and verify every BLE device. WeChat mini program, Android and ESP32 in one workflow. (Preview)',
      themeConfig: {
        nav: [
          { text: 'Features', link: '/en/#features' },
          { text: 'Docs (Chinese)', link: '/product-contract/' },
          { text: 'Status', link: '/status/' }
        ],
        sidebar: false
      }
    }
  },

  // ═══ SEO 与社交元数据（与 PREVIEW 诚实状态一致）═══
  head: [
    // Favicon
    ['link', { rel: 'icon', type: 'image/png', href: '/brand/icon.png' }],
    ['link', { rel: 'canonical', href: 'https://lightble.i2kai.com/' }],

    // Author & Keywords
    ['meta', { name: 'author', content: 'luoyaosheng' }],
    ['meta', { name: 'keywords', content: 'BLE Toolkit+,Smart BLE,BLE,低功耗蓝牙,蓝牙调试,微信小程序 BLE,UniApp BLE,ESP32,LightBLE' }],

    // OpenGraph
    ['meta', { property: 'og:type',        content: 'website' }],
    ['meta', { property: 'og:site_name',   content: 'BLE Toolkit+' }],
    ['meta', { property: 'og:title',       content: 'BLE Toolkit+ — 一套工具，调通每一台 BLE 设备（开发预览）' }],
    ['meta', { property: 'og:description', content: '微信扫码即用的 BLE 调试与验证工具：扫描、连接、读写、订阅、广播与 ESP32 验证，收进同一条工作流。' }],
    ['meta', { property: 'og:image',       content: 'https://lightble.i2kai.com/brand/share.png' }],
    ['meta', { property: 'og:url',         content: 'https://lightble.i2kai.com/' }],
    ['meta', { property: 'og:locale',      content: 'zh_CN' }],

    // Twitter Card
    ['meta', { name: 'twitter:card',        content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title',       content: 'BLE Toolkit+ — BLE 调试与验证工具（开发预览）' }],
    ['meta', { name: 'twitter:description', content: '微信扫码即用。微信小程序、Android 与 ESP32 协同的 BLE 调试工具。' }],
    ['meta', { name: 'twitter:image',       content: 'https://lightble.i2kai.com/brand/share.png' }],

    // 主题色
    ['meta', { name: 'theme-color', content: '#1B6DFF' }],

    // 结构化数据：诚实标注 prerelease，不标 released 造假（设计规格 §10）
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'BLE Toolkit+',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Android, WeChat Mini Program, ESP32',
      url: 'https://lightble.i2kai.com/',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: '跨平台 BLE 调试与验证工具（开发预览阶段）',
      softwareVersion: '1.0.5-preview'
    })]
  ],

  themeConfig: {
    logo: '/brand/icon.png',

    // 侧边树结构正规化大纲（文档树不动，中文共享）
    sidebar: [
      {
        text: '📐 产品规范（整体）',
        collapsed: false,
        items: [
          { text: '产品规范总览', link: '/product-contract/' },
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
          { text: '什么是 BLE Toolkit+?', link: '/tutorials/01_introduction_and_setup' }
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
