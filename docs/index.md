---
layout: home

hero:
  name: "Smart BLE"
  text: "跨平台低功耗蓝牙大一统开发库"
  tagline: "单一内核，覆盖 Flutter / Tauri / UniApp 与硬件下位机生态"
  image:
    src: /icon.png
    alt: Smart BLE Logo
  actions:
    - theme: brand
      text: 快速开始 (Getting Started)
      link: /tutorials/01_introduction_and_setup
    - theme: alt
      text: API 与 核心架构
      link: /MASTER_ARCHITECTURE
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/luoyaosheng/smart-ble

features:
  - title: 📱 统一的跨终端架构 (Cross-Platform)
    details: 在 Flutter, Node.js, Rust 以及小程序之间，实现逻辑与设计的深度对齐，提供一致的开发者体验。
    icon: 🌍
  - title: 🛡️ 高容错设计 (Fault Tolerance)
    details: 内置底层 Watchdog 并发控制与节流队列，从容应对硬件异常断电与超高频数据流，保障 UI 稳定。
    icon: 🛡️
  - title: 🎨 SSOT 渲染机制 (Single Source of Truth)
    details: 依托统一真实数据源，通过自动化脚本分发跨界面的主题、资源与色彩，使多端样式永远同步。
    icon: 🎨
---
