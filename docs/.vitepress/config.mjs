import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Smart BLE",
  description: "跨平台低功耗蓝牙调试工具与大一统测试库",
  themeConfig: {
    logo: '/icon.png',
    
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
          { text: '微信开发特例与隐蔽大坑', link: '/wechat-pitfalls' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/luoyaosheng/smart-ble' }
    ]
  }
})
