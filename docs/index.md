---
layout: home

hero:
  name: "Smart BLE"
  text: "跨平台低功耗蓝牙大一统开发库"
  tagline: "一套协议内核，同时覆盖 Flutter · Tauri · UniApp · iOS · Android 与硬件下位机生态，开箱即用"
  image:
    src: /icon.png
    alt: Smart BLE Logo
  actions:
    - theme: brand
      text: 🚀 快速开始
      link: /tutorials/01_introduction_and_setup
    - theme: alt
      text: 📥 下载所有端
      link: '#download-hub'
    - theme: alt
      text: 📐 架构白皮书
      link: /MASTER_ARCHITECTURE

features:
  - title: 📱 五大平台统一内核
    details: Flutter、Tauri/Rust、UniApp/微信小程序、iOS Swift、Android Kotlin — 共享协议层，无需各平台重复造轮子。
    icon: 🌍
  - title: 🛡️ 企业级高容错设计
    details: 内置 Watchdog + 防抖节流队列，从容应对硬件断电、高频数据风暴，保障 UI 永不崩溃。
    icon: 🛡️
  - title: 🎨 SSOT 单一真实数据源
    details: 一键脚本全端分发主题/i18n/色彩 Token，多端样式始终高度一致，彻底告别"各端风格割裂"。
    icon: 🎨
  - title: 📡 纯广播无极群控
    details: 基于 GAP Manufacturer Data 的广播协议，无需建立连接即可对千台设备群发指令，延迟极低。
    icon: 📡
  - title: ⚡ 零延迟硬件固件
    details: ESP32/nRF52840 固件模板，经过生产验证的 18-Byte 紧凑控制帧，告别 ATT 连接开销。
    icon: ⚡
  - title: 🧪 端到端 Mock 测试
    details: 内置 MockAdapter 替代真实硬件，CI/CD 流水线无需蓝牙设备也能全量回归测试。
    icon: 🧪
---

<div class="ecosystem-section">
  <div class="eco-header">
    <h2>🌐 全端覆盖生态图谱</h2>
    <p class="eco-subtitle">Smart BLE 是业界罕见的横跨移动、桌面、Web 与硬件的蓝牙统一方案</p>
  </div>

  <div class="platform-grid">
    <div class="platform-card flutter">
      <div class="platform-icon">🐦</div>
      <div class="platform-name">Flutter</div>
      <div class="platform-lang">Dart + Riverpod</div>
      <div class="platform-badge primary">主力平台</div>
      <div class="platform-features">
        <span>✅ BLE 中心 / 周边模式</span>
        <span>✅ OTA 固件升级</span>
        <span>✅ 暗黑主题引擎</span>
        <span>✅ 跨平台 UI 组件库</span>
      </div>
    </div>
    <div class="platform-card tauri">
      <div class="platform-icon">🦀</div>
      <div class="platform-name">Tauri / Rust</div>
      <div class="platform-lang">Rust + btleplug</div>
      <div class="platform-badge primary">主力平台</div>
      <div class="platform-features">
        <span>✅ 原生桌面 BLE</span>
        <span>✅ 事件驱动通知流</span>
        <span>✅ 广播外设模拟</span>
        <span>✅ 极低内存占用</span>
      </div>
    </div>
    <div class="platform-card android">
      <div class="platform-icon">🤖</div>
      <div class="platform-name">Android</div>
      <div class="platform-lang">Kotlin + Compose</div>
      <div class="platform-badge primary">主力平台</div>
      <div class="platform-features">
        <span>✅ BLE GATT 全栈</span>
        <span>✅ 权限自动管理</span>
        <span>✅ 后台扫描服务</span>
        <span>✅ Material 3 UI</span>
      </div>
    </div>
    <div class="platform-card ios">
      <div class="platform-icon">🍎</div>
      <div class="platform-name">iOS / macOS</div>
      <div class="platform-lang">Swift + CoreBluetooth</div>
      <div class="platform-badge primary">主力平台</div>
      <div class="platform-features">
        <span>✅ CoreBluetooth 原生</span>
        <span>✅ SwiftUI 组件</span>
        <span>✅ 状态机管理</span>
        <span>✅ 后台通知支持</span>
      </div>
    </div>
    <div class="platform-card uniapp">
      <div class="platform-icon">📱</div>
      <div class="platform-name">UniApp / 微信</div>
      <div class="platform-lang">Vue + uni-app</div>
      <div class="platform-badge primary">主力平台</div>
      <div class="platform-features">
        <span>✅ 微信小程序 BLE</span>
        <span>✅ H5/APP 兼容</span>
        <span>✅ 隐私合规处理</span>
        <span>✅ 并发监听隔离</span>
      </div>
    </div>
    <div class="platform-card hardware">
      <div class="platform-icon">🔩</div>
      <div class="platform-name">硬件 SDK</div>
      <div class="platform-lang">C / ESP32 / nRF52840</div>
      <div class="platform-badge hardware-badge">硬件生态</div>
      <div class="platform-features">
        <span>✅ 18-Byte 控制帧</span>
        <span>✅ 广播群控内核</span>
        <span>✅ PlatformIO 构建</span>
        <span>✅ 零延迟验证</span>
      </div>
    </div>
  </div>
</div>

<div id="download-hub" class="download-section">
  <div class="dl-header">
    <h2>📥 一键分发下载中枢</h2>
    <p class="dl-subtitle">选择您的平台，开箱即用 — 无需额外配置</p>
  </div>
  <div class="dl-grid">
    <a class="dl-card" href="https://github.com/luoyaosheng/smart-ble/releases/latest" target="_blank">
      <div class="dl-icon">🤖</div>
      <div class="dl-name">Android APK</div>
      <div class="dl-desc">支持 Android 6.0+<br>开箱即用 · BLE 全功能</div>
      <div class="dl-btn">立即下载 →</div>
    </a>
    <a class="dl-card" href="https://github.com/luoyaosheng/smart-ble/releases/latest" target="_blank">
      <div class="dl-icon">🦀</div>
      <div class="dl-name">Windows 桌面版</div>
      <div class="dl-desc">Tauri 原生打包<br>极轻体积 · 持久连接</div>
      <div class="dl-btn">立即下载 →</div>
    </a>
    <a class="dl-card" href="https://github.com/luoyaosheng/smart-ble/releases/latest" target="_blank">
      <div class="dl-icon">🍎</div>
      <div class="dl-name">macOS 应用</div>
      <div class="dl-desc">Tauri / 原生 Swift 双版<br>支持 M1/M2/Intel</div>
      <div class="dl-btn">立即下载 →</div>
    </a>
    <a class="dl-card source" href="https://github.com/luoyaosheng/smart-ble" target="_blank">
      <div class="dl-icon">📦</div>
      <div class="dl-name">源码 (GitHub)</div>
      <div class="dl-desc">MIT 开源协议<br>Star ⭐ 支持项目成长</div>
      <div class="dl-btn">查看仓库 →</div>
    </a>
  </div>
</div>

<div class="contribution-section">
  <div class="contrib-header">
    <h2>🎯 分角色导航体系 (Role-Based Routing)</h2>
    <p class="contrib-subtitle">一款真正落地的蓝牙产品不仅是代码，还关乎跨团队协作与知识解耦</p>
  </div>
  <div class="contrib-grid">
    <a class="contrib-card" href="/tutorials/01_introduction_and_setup">
      <div class="contrib-icon">👔</div>
      <div class="contrib-name">我是产品经理/架构师</div>
      <div class="contrib-desc">不懂底层代码？利用现成提供的桌面和移动端 APP 获取直观感受。快速了解低功耗蓝牙 (BLE) 的业务能力边界、纯广播生态场景，以极速推进产品可行性验证与交互设计。</div>
      <div class="contrib-btn">建立全盘认知 →</div>
    </a>
    <a class="contrib-card" href="/MASTER_ARCHITECTURE">
      <div class="contrib-icon">💻</div>
      <div class="contrib-name">我是应用端开发工程师</div>
      <div class="contrib-desc">面临多端碎片化？无论是 Flutter、UniApp 还是原生开发者，深入探索状态同步机制 (SSOT)、看门狗重连算法与全平台差异抹平方案，彻底破解跨端蓝牙协同难题。</div>
      <div class="contrib-btn">解码应用端架构 →</div>
    </a>
    <a class="contrib-card" href="/tutorials/hardware/01_Hardware_Philosophy">
      <div class="contrib-icon">🔩</div>
      <div class="contrib-name">我是硬件端开发工程师</div>
      <div class="contrib-desc">苦于无法独立闭环测试？使用我们开放的 C/ESP32 下位机固件模板，学习 18字节 工业控制帧设计，无需编写任何上位机代码即可验证您的蓝牙硬件交互。</div>
      <div class="contrib-btn">从下位机视角切入 →</div>
    </a>
  </div>
</div>

<style>
/* ── 平台生态图谱 ── */
.ecosystem-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 24px 20px;
}
.eco-header { text-align: center; margin-bottom: 40px; }
.eco-header h2 { font-size: 2rem; font-weight: 700; margin-bottom: 12px; }
.eco-subtitle { color: var(--vp-c-text-2); font-size: 1.05rem; }

.platform-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.platform-card {
  border-radius: 16px;
  padding: 24px 18px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  position: relative;
  overflow: hidden;
}
.platform-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.platform-card.flutter::before  { background: linear-gradient(90deg, #54c5f8, #01579b); }
.platform-card.tauri::before    { background: linear-gradient(90deg, #ff8c00, #c84b31); }
.platform-card.android::before  { background: linear-gradient(90deg, #3ddc84, #00897b); }
.platform-card.ios::before      { background: linear-gradient(90deg, #6e6e73, #1c1c1e); }
.platform-card.uniapp::before   { background: linear-gradient(90deg, #2b9939, #43a048); }
.platform-card.hardware::before { background: linear-gradient(90deg, #ff6b35, #f7c59f); }
.platform-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.15);
}
.platform-icon { font-size: 2rem; margin-bottom: 8px; }
.platform-name { font-size: 1.05rem; font-weight: 700; margin-bottom: 4px; }
.platform-lang { font-size: 0.78rem; color: var(--vp-c-text-2); margin-bottom: 10px; }
.platform-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  margin-bottom: 14px;
}
.platform-badge.primary   { background: #646cff22; color: #646cff; }
.platform-badge.secondary { background: #42b88322; color: #42b883; }
.platform-badge.hardware-badge { background: #ff6b3522; color: #ff6b35; }
.platform-features {
  display: flex; flex-direction: column; gap: 4px;
  font-size: 0.78rem; color: var(--vp-c-text-2);
}

/* ── 下载中心 ── */
.download-section {
  max-width: 1000px;
  margin: 0 auto;
  padding: 60px 24px 80px;
  scroll-margin-top: 80px;
}
.dl-header { text-align: center; margin-bottom: 40px; }
.dl-header h2 { font-size: 2rem; font-weight: 700; margin-bottom: 12px; }
.dl-subtitle { color: var(--vp-c-text-2); font-size: 1.05rem; }

.dl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}
.dl-card {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 32px 20px;
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  color: inherit;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.dl-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(100, 108, 255, 0.18);
  border-color: var(--vp-c-brand-1);
}
.dl-card.source:hover {
  box-shadow: 0 16px 40px rgba(66, 184, 131, 0.18);
  border-color: #42b883;
}
.dl-icon { font-size: 2.5rem; margin-bottom: 12px; }
.dl-name { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
.dl-desc { font-size: 0.82rem; color: var(--vp-c-text-2); line-height: 1.6; margin-bottom: 18px; flex: 1; }
.dl-btn {
  font-size: 0.85rem; font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  background: var(--vp-c-brand-1);
  color: #fff;
  transition: opacity 0.15s;
}
.dl-card:hover .dl-btn { opacity: 0.88; }
.dl-card.source .dl-btn { background: #42b883; }

/* ── 二次开发 / 贡献专区 ── */
.contribution-section {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}
.contrib-header { text-align: center; margin-bottom: 40px; }
.contrib-header h2 { font-size: 2rem; font-weight: 700; margin-bottom: 12px; }
.contrib-subtitle { color: var(--vp-c-text-2); font-size: 1.05rem; }

.contrib-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.contrib-card {
  display: flex; flex-direction: column;
  padding: 32px 24px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  color: inherit;
  transition: transform 0.22s ease, border-color 0.22s ease;
}
.contrib-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-1);
}
.contrib-icon { font-size: 2.2rem; margin-bottom: 16px; }
.contrib-name { font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; }
.contrib-desc { font-size: 0.85rem; color: var(--vp-c-text-2); line-height: 1.6; flex: 1; }
.contrib-btn { font-size: 0.88rem; font-weight: 600; color: var(--vp-c-brand-1); margin-top: 24px; }

/* 响应式 */
@media (max-width: 900px) {
  .platform-grid { grid-template-columns: repeat(2, 1fr); }
  .contrib-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .platform-grid { grid-template-columns: 1fr; }
  .dl-grid { grid-template-columns: 1fr; }
  .contrib-grid { grid-template-columns: 1fr; }
  .eco-header h2, .dl-header h2, .contrib-header h2 { font-size: 1.5rem; }
}
</style>
