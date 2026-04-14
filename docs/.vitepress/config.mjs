import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: "Smart BLE",
    description: "跨平台低功耗蓝牙调试工具与大一统测试库，覆盖 Flutter / Tauri / UniApp / iOS / Android 全端生态",
    base: '/',
    ignoreDeadLinks: true,
    lastUpdated: true,
    sitemap: {
      hostname: 'https://lightble.i2kai.com'
    },

    // ═══ 国际化 (i18n) / 多语言支持 ═══
    locales: {
      root: {
        label: '简体中文',
        lang: 'zh-CN'
      },
      en: {
        label: 'English',
        lang: 'en-US',
        link: '/en/',
        themeConfig: {
          nav: [
            { text: 'Home', link: '/en/' },
            { text: 'Getting Started', link: '/en/tutorials/01_introduction_and_setup' },
            { text: 'API & Architecture', link: '/en/MASTER_ARCHITECTURE' }
          ],
          sidebar: [
            {
              text: '📘 Chapter 1: Introduction',
              items: [
                { text: 'What is Smart BLE?', link: '/en/tutorials/01_introduction_and_setup' }
              ]
            },
            {
              text: '🖥️ Chapter 2: User Guide',
              items: [
                { text: 'Advanced Broadcast ecosystem', link: '/en/tutorials/02_advanced_usage_and_broadcast' }
              ]
            },
            {
              text: '🛠️ Chapter 3: Developer Guide',
              items: [
                { text: 'Flutter Compilation & Permissions', link: '/en/tutorials/platforms/flutter' },
                { text: 'UniApp Privacy Handing', link: '/en/tutorials/platforms/uniapp' },
                { text: 'Tauri & Electron Setup', link: '/en/tutorials/platforms/desktop' },
                { text: 'iOS/Android Native Base', link: '/en/tutorials/platforms/native_mobile' }
              ]
            },
            {
              text: '🔩 Chapter 4: Hardware SDK',
              items: [
                { text: 'Dual-Chip Hardware Philosophy', link: '/en/tutorials/hardware/01_Hardware_Philosophy' },
                { text: 'C Architecture Specification', link: '/en/tutorials/hardware/02_C_Architecture' },
                { text: 'Zero Delay Protocol WatchDog', link: '/en/tutorials/hardware/03_Zero_Delay_Protocol' }
              ]
            },
            {
              text: '🌌 Chapter 5: Architecture & Core',
              items: [
                { text: 'Broadcast Ecology Blueprint', link: '/en/ARCHITECTURE_BROADCAST_CONTROL' },
                { text: 'OTA Hardware Architecture (NEW)', link: '/en/ARCHITECTURE_OTA' },
                { text: 'Full-Stack Architecture (MASTER)', link: '/en/MASTER_ARCHITECTURE' },
                { text: 'Cross Platform BLE APIs', link: '/en/CROSS_PLATFORM_BLE_GUIDE' },
                { text: 'E2E Defenses & WatchDog', link: '/en/CORE_LOGIC_GUIDE' },
                { text: 'Logging Specs & Exportation (NEW)', link: '/en/LOGGING_SPEC' },
                { text: 'UI Components Strategy', link: '/en/UI_COMPONENTS_GUIDE' },
                { text: 'Component Interaction Spec', link: '/en/COMPONENT_INTERACTION_SPEC' }
              ]
            },
            {
              text: '🔬 Appendix & Community',
              items: [
                { text: '🗺️ Official OSS Roadmap (ROADMAP)', link: '/en/ROADMAP' },
                { text: 'E2E Mock Instruction', link: '/en/E2E_MOCK_INSTRUCTIONS' },
                { text: 'Release Regression Checklist', link: '/en/test-checklist' },
                { text: 'Smart BLE FAQ', link: '/en/BLE_FAQ' },
                { text: 'WeChat Mini Program Pitfalls', link: '/en/wechat-pitfalls' },
                { text: 'Global I18n Standards', link: '/en/I18N_GUIDELINES' },
                { text: 'Contributing Guide', link: '/en/CONTRIBUTING_GUIDE' }
              ]
            }
          ]
        }
      }
    },

    // ═══ SEO 与社交元数据全装甲 ═══
    head: [
      // Favicon
      ['link', { rel: 'icon', type: 'image/png', href: '/icon.png' }],

      // Canonical & Author
      ['meta', { name: 'author', content: 'luoyaosheng' }],
      ['meta', { name: 'keywords', content: '跨平台蓝牙,BLE,低功耗蓝牙,Flutter BLE,Tauri BLE,UniApp BLE,iOS BLE,Bluetooth调试工具,Smart BLE,开源蓝牙库,BLE SDK' }],

      // OpenGraph (微信/知乎/Slack 等分享卡片)
      ['meta', { property: 'og:type',        content: 'website' }],
      ['meta', { property: 'og:site_name',   content: 'Smart BLE' }],
      ['meta', { property: 'og:title',       content: 'Smart BLE — 跨平台低功耗蓝牙大一统开发库' }],
      ['meta', { property: 'og:description', content: '单一内核，覆盖 Flutter / Tauri / UniApp / iOS / Android 与硬件下位机生态。支持广播群控、高容错连接与 SSOT 主题引擎。' }],
      ['meta', { property: 'og:image',       content: 'https://lightble.i2kai.com/icon.png' }],
      ['meta', { property: 'og:url',         content: 'https://lightble.i2kai.com/' }],
      ['meta', { property: 'og:locale',      content: 'zh_CN' }],

      // Twitter Card (X/Twitter 分享预览)
      ['meta', { name: 'twitter:card',        content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title',       content: 'Smart BLE — 跨平台低功耗蓝牙大一统开发库' }],
      ['meta', { name: 'twitter:description', content: '单一内核覆盖 Flutter / Tauri / UniApp / iOS / Android，开箱即用的开源 BLE SDK。' }],
      ['meta', { name: 'twitter:image',       content: 'https://lightble.i2kai.com/icon.png' }],

      // 主题色 (PWA / 移动端浏览器工具栏)
      ['meta', { name: 'theme-color', content: '#646cff' }],
    ],

    themeConfig: {
      logo: '/icon.png',
      
      search: {
        provider: 'local',
        options: {
          locales: {
            root: {
              translations: {
                button: {
                  buttonText: '搜索文档',
                  buttonAriaLabel: '搜索文档'
                },
                modal: {
                  noResultsText: '无法找到相关结果',
                  resetButtonTitle: '清除查询条件',
                  footer: {
                    selectText: '选择',
                    navigateText: '切换',
                    closeText: '关闭'
                  }
                }
              }
            }
          }
        }
      },
      
      // 导航栏
      nav: [
        { text: '首页', link: '/' },
        { text: '快速上手', link: '/tutorials/01_introduction_and_setup' },
        { text: 'API/架构参考', link: '/MASTER_ARCHITECTURE' }
      ],

      // 侧边树结构正规化大纲
      sidebar: [
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
            { text: '商业级 OTA 与固件分发架构 (NEW)', link: '/ARCHITECTURE_OTA' },
            { text: '全栈跨端架构蓝图 (MASTER)', link: '/MASTER_ARCHITECTURE' },
            { text: '跨框架 BLE API 全景映射', link: '/CROSS_PLATFORM_BLE_GUIDE' },
            { text: '端到端防御性队列与 WatchDog', link: '/CORE_LOGIC_GUIDE' },
            { text: '跨端蓝牙日志抓取与导出规范 (NEW)', link: '/LOGGING_SPEC' },
            { text: '跨平台 UI 与组件流转规约', link: '/UI_COMPONENTS_GUIDE' },
            { text: '核心业务数据中台交互', link: '/COMPONENT_INTERACTION_SPEC' }
          ]
        },
        {
          text: '🔬 附录与开源社区 (Community)',
          items: [
            { text: '🗺️ 官方开源演进路线图 (ROADMAP)', link: '/ROADMAP' },
            { text: '端到端 Mock 模拟联调指导', link: '/E2E_MOCK_INSTRUCTIONS' },
            { text: '发版前回归测试天书', link: '/test-checklist' },
            { text: '开发大盘百问百科 (FAQ)', link: '/BLE_FAQ' },
            { text: '微信开发特例与隐蔽大坑', link: '/wechat-pitfalls' },
            { text: '国际化 (I18n) 标准化协议', link: '/I18N_GUIDELINES' },
            { text: '社区贡献指北 (Contributing)', link: '/CONTRIBUTING_GUIDE' }
          ]
        }
      ],

      socialLinks: [
        { icon: 'github', link: 'https://github.com/luoyaosheng/smart-ble' }
      ]
    },

    // Mermaid 配置
    mermaid: {
      theme: 'neutral',
      securityLevel: 'loose'
    }
  })
)
