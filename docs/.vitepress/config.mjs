import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Smart BLE Toolkit+",
  description: "最强跨终端低功耗蓝牙大一统测试库",
  themeConfig: {
    logo: '/icon.png',
    
    // 导航栏
    nav: [
      { text: '首页 Home', link: '/' },
      { text: '零基础入门指南', link: '/tutorials/series/EP01_Quick_Start_And_UI' },
      { text: '实战大系', link: '/tutorials/platforms/Flutter_HandsOn' }
    ],

    // 侧边树结构大编排
    sidebar: [
      {
        text: '🔥 核心阶梯心法系列',
        items: [
          { text: 'EP01: 全平台下载与神级UI鉴赏', link: '/tutorials/series/EP01_Quick_Start_And_UI' },
          { text: 'EP02: 绝命防死锁实验与 STM32 控制', link: '/tutorials/series/EP02_Hardware_Battle_And_STM32' },
          { text: 'EP03: 不用连接！跨越极限的纯广播点灯', link: '/tutorials/series/EP03_Advanced_Broadcast_And_SSOT' }
        ]
      },
      {
        text: '🛠️ 开发者跨端引擎演练室',
        items: [
          { text: 'Flutter 跨端高精度权限索取', link: '/tutorials/platforms/Flutter_HandsOn' },
          { text: 'UniApp 微信小程序的避坑救命谈', link: '/tutorials/platforms/UniApp_HandsOn' },
          { text: 'Tauri / Electron 桌面猛兽实操', link: '/tutorials/platforms/Desktop_HandsOn' },
          { text: 'Native 极致原生防黑科技 (iOS/And)', link: '/tutorials/platforms/Native_HandsOn' }
        ]
      },
      {
        text: '📚 核心引擎与大一统架构书',
        items: [
          { text: '多端大一统架构书 (MASTER)', link: '/MASTER_ARCHITECTURE' },
          { text: '多端蓝牙API大映射 (CROSS)', link: '/CROSS_PLATFORM_BLE_GUIDE' },
          { text: '蓝牙核心队列逻辑 (WATCHDOG)', link: '/CORE_LOGIC_GUIDE' },
          { text: '核心组件交互细则 (INTERACTION)', link: '/COMPONENT_INTERACTION_SPEC' },
          { text: '跨平台 UI 组件规约 (UI)', link: '/UI_COMPONENTS_GUIDE' }
        ]
      },
      {
        text: '🔬 工业防灾与测试基建',
        items: [
          { text: '端到端 STM32 联调规范', link: '/E2E_MOCK_INSTRUCTIONS' },
          { text: '发版前回归测试天书', link: '/test-checklist' }
        ]
      },
      {
        text: '❓ 疑难杂症与奇技淫巧',
        items: [
          { text: '开发大盘百问百科 (FAQ)', link: '/BLE_FAQ' },
          { text: '微信小程序史诗级血泪指南', link: '/wechat-pitfalls' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/luoyaosheng/smart-ble' }
    ]
  }
})
