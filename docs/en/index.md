---
layout: home

hero:
  name: "Smart BLE"
  text: "The Unified Cross-Platform BLE SDK"
  tagline: "One protocol core covering Flutter · Tauri · UniApp · iOS · Android and Hardware ecological systems out-of-the-box."
  image:
    src: /icon.png
    alt: Smart BLE Logo
  actions:
    - theme: brand
      text: 🚀 Quick Start
      link: /en/tutorials/01_introduction_and_setup
    - theme: alt
      text: 📥 Download Hub
      link: '#download-hub'
    - theme: alt
      text: 📐 Architecture Master
      link: /en/MASTER_ARCHITECTURE

features:
  - title: 📱 Five Platforms, One Core
    details: Flutter, Tauri/Rust, UniApp, iOS Swift, and Android Kotlin share the same unified protocol layer, preventing wheel-reinvention.
    icon: 🌍
  - title: 🛡️ Enterprise Fault Tolerance
    details: Built-in Watchdog and debounce queues. Easily handles hardware power-offs and high-frequency data storms to ensure zero UI crashes.
    icon: 🛡️
  - title: 🎨 Single Source of Truth (SSOT)
    details: Distribute themes, i18n, and UI tokens across all platforms using a single script. Farewell to visual fragmentation.
    icon: 🎨
  - title: 📡 Pure Broadcast Control
    details: Control thousands of devices simultaneously using GAP Manufacturer Data with near-zero latency, avoiding connection overhead.
    icon: 📡
  - title: ⚡ Zero-Delay Firmware
    details: Production-ready C firmware templates for ESP32/nRF52. Implements our robust 18-Byte compact control frame.
    icon: ⚡
  - title: 🧪 End-to-End Mock Testing
    details: Built-in MockAdapter replaces real hardware, enabling full BLE CI/CD pipeline regression testing without physical devices.
    icon: 🧪
---

<div class="ecosystem-section">
  <div class="eco-header">
    <h2>🌐 Full-Stack Ecosystem Grid</h2>
    <p class="eco-subtitle">Smart BLE is a rare unified BLE solution spanning Mobile, Desktop, Web, and MCU Hardware.</p>
  </div>

  <div class="platform-grid">
    <div class="platform-card flutter">
      <div class="platform-icon">🐦</div>
      <div class="platform-name">Flutter</div>
      <div class="platform-lang">Dart + Riverpod</div>
      <div class="platform-badge primary">Primary</div>
      <div class="platform-features">
        <span>✅ Central / Peripheral</span>
        <span>✅ OTA Firmware Update</span>
        <span>✅ Dark Mode Engine</span>
        <span>✅ Cross-Platform UI</span>
      </div>
    </div>
    <div class="platform-card tauri">
      <div class="platform-icon">🦀</div>
      <div class="platform-name">Tauri / Rust</div>
      <div class="platform-lang">Rust + btleplug</div>
      <div class="platform-badge primary">Primary</div>
      <div class="platform-features">
        <span>✅ Native Desktop BLE</span>
        <span>✅ Event-Driven Streams</span>
        <span>✅ Broadcaster Mock</span>
        <span>✅ Minimal Memory Footprint</span>
      </div>
    </div>
    <div class="platform-card android">
      <div class="platform-icon">🤖</div>
      <div class="platform-name">Android</div>
      <div class="platform-lang">Kotlin + Compose</div>
      <div class="platform-badge primary">Primary</div>
      <div class="platform-features">
        <span>✅ GATT Full Stack</span>
        <span>✅ Auto Permissions</span>
        <span>✅ Background Scanning</span>
        <span>✅ Material 3 UI</span>
      </div>
    </div>
    <div class="platform-card ios">
      <div class="platform-icon">🍎</div>
      <div class="platform-name">iOS / macOS</div>
      <div class="platform-lang">Swift + CoreBluetooth</div>
      <div class="platform-badge primary">Primary</div>
      <div class="platform-features">
        <span>✅ Native CoreBluetooth</span>
        <span>✅ SwiftUI Components</span>
        <span>✅ State Machine Model</span>
        <span>✅ Background Operations</span>
      </div>
    </div>
    <div class="platform-card uniapp">
      <div class="platform-icon">📱</div>
      <div class="platform-name">UniApp / WeChat</div>
      <div class="platform-lang">Vue + uni-app</div>
      <div class="platform-badge primary">Primary</div>
      <div class="platform-features">
        <span>✅ Mini-Program BLE</span>
        <span>✅ H5/APP Compatible</span>
        <span>✅ Privacy Compliance</span>
        <span>✅ Listener Isolation</span>
      </div>
    </div>
    <div class="platform-card hardware">
      <div class="platform-icon">🔩</div>
      <div class="platform-name">Hardware SDK</div>
      <div class="platform-lang">C / ESP32 / nRF52840</div>
      <div class="platform-badge hardware-badge">Hardware</div>
      <div class="platform-features">
        <span>✅ 18-Byte Control Frame</span>
        <span>✅ Broadcast Core</span>
        <span>✅ PlatformIO Ready</span>
        <span>✅ Zero-Latency Validation</span>
      </div>
    </div>
  </div>
</div>

<div id="download-hub" class="download-section">
  <div class="dl-header">
    <h2>📥 One-Click Download Hub</h2>
    <p class="dl-subtitle">Choose your platform and get started out-of-the-box — No extra config required</p>
  </div>
  <div class="dl-grid">
    <a class="dl-card" href="https://github.com/luoyaosheng/smart-ble/releases/latest" target="_blank">
      <div class="dl-icon">🤖</div>
      <div class="dl-name">Android APK</div>
      <div class="dl-desc">Android 6.0+ Supported<br>Full BLE Functionality</div>
      <div class="dl-btn">Download Now →</div>
    </a>
    <a class="dl-card" href="https://github.com/luoyaosheng/smart-ble/releases/latest" target="_blank">
      <div class="dl-icon">🦀</div>
      <div class="dl-name">Windows Desktop</div>
      <div class="dl-desc">Tauri Native Build<br>Lightweight & Persistent</div>
      <div class="dl-btn">Download Now →</div>
    </a>
    <a class="dl-card" href="https://github.com/luoyaosheng/smart-ble/releases/latest" target="_blank">
      <div class="dl-icon">🍎</div>
      <div class="dl-name">macOS Application</div>
      <div class="dl-desc">Tauri & Native Swift<br>M1/M2/Intel Supported</div>
      <div class="dl-btn">Download Now →</div>
    </a>
    <a class="dl-card source" href="https://github.com/luoyaosheng/smart-ble" target="_blank">
      <div class="dl-icon">📦</div>
      <div class="dl-name">Source Code</div>
      <div class="dl-desc">MIT License<br>Star ⭐ to support us!</div>
      <div class="dl-btn">Go to GitHub →</div>
    </a>
  </div>
</div>

<div class="contribution-section">
  <div class="contrib-header">
    <h2>🎯 Role-Based Routing</h2>
    <p class="contrib-subtitle">A real product involves cross-team collaboration and knowledge decoupling.</p>
  </div>
  <div class="contrib-grid">
    <a class="contrib-card" href="/en/tutorials/01_introduction_and_setup">
      <div class="contrib-icon">👔</div>
      <div class="contrib-name">Product Managers / Architects</div>
      <div class="contrib-desc">Not familiar with raw code? Use our pre-built Desktop & Mobile Apps to visibly grasp the limits of BLE capabilities. Validate your product concepts and interactions rapidly.</div>
      <div class="contrib-btn">Gain the overview →</div>
    </a>
    <a class="contrib-card" href="/en/MASTER_ARCHITECTURE">
      <div class="contrib-icon">💻</div>
      <div class="contrib-name">App & Frontend Developers</div>
      <div class="contrib-desc">Tired of maintaining different code for Android/iOS? Explore our SSOT pattern, watchdog reconnect algorithm, and UI parity mechanisms deployed across Flutter and UniApp.</div>
      <div class="contrib-btn">Decode the architecture →</div>
    </a>
    <a class="contrib-card" href="/en/tutorials/hardware/01_Hardware_Philosophy">
      <div class="contrib-icon">🔩</div>
      <div class="contrib-name">Hardware Developers</div>
      <div class="contrib-desc">Frustrated waiting for an App dev to test your firmware? Use our open C/ESP32 template to learn the 18-Byte industrial control frame, and test against our robust apps independently.</div>
      <div class="contrib-btn">Dive into firmware →</div>
    </a>
  </div>
</div>

<style>
/* ── Platform Ecosystem Grid ── */
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
.platform-badge.hardware-badge { background: #ff6b3522; color: #ff6b35; }
.platform-features {
  display: flex; flex-direction: column; gap: 4px;
  font-size: 0.78rem; color: var(--vp-c-text-2);
}

/* ── Download Hub ── */
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

/* ── Role Based Routing section ── */
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

/* Responsive */
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
