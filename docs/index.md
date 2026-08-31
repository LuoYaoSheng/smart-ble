---
layout: home

hero:
  name: "Smart BLE"
  text: "跨平台 BLE 控制台与统一协议内核"
  tagline: "一套调试工作流，同时覆盖 UniApp · Flutter · Tauri · Android · iOS · 硬件联动，把扫描、连接、广播和协议验证收进同一套产品语言。"
  image:
    src: /brand/icon.png
    alt: Smart BLE Brand Icon
  actions:
    - theme: brand
      text: UniApp 产品规范
      link: /product-contract/
    - theme: alt
      text: 快速开始
      link: /tutorials/01_introduction_and_setup
    - theme: alt
      text: 下载全部平台
      link: "#download-hub"
    - theme: alt
      text: 架构白皮书
      link: /MASTER_ARCHITECTURE
---

<div class="smartble-home">
  <section class="smartble-signal-band">
    <div class="smartble-signal-card">
      <div class="smartble-signal-value">6+</div>
      <div class="smartble-signal-label">运行入口</div>
      <p>UniApp、Flutter、Tauri、Electron、Android、iOS 与硬件示例同时维护。</p>
    </div>
    <div class="smartble-signal-card">
      <div class="smartble-signal-value">1</div>
      <div class="smartble-signal-label">协议核心</div>
      <p>统一的 BLE 调试语义、状态流和资产生成器，减少多端割裂。</p>
    </div>
    <div class="smartble-signal-card">
      <div class="smartble-signal-value">4</div>
      <div class="smartble-signal-label">核心任务</div>
      <p>扫描、连接、广播、服务调试，是所有端必须讲清楚的主流程。</p>
    </div>
    <div class="smartble-signal-card">
      <div class="smartble-signal-value">SSOT</div>
      <div class="smartble-signal-label">品牌分发</div>
      <p>图标、主题和占位图通过共享生成器向多平台统一分发。</p>
    </div>
  </section>

  <section class="smartble-product-hero">
    <div class="smartble-product-copy">
      <div class="smartble-kicker">Product Story</div>
      <h2>不是某一端的 BLE 小工具，而是一整套跨平台调试控制台</h2>
      <p>
        Smart BLE 的核心价值不是“支持很多平台”，而是把不同平台都拉进同一套工作流：先发现设备，再建立连接，随后读写特征值、监听通知、切换广播模式，最后把协议和硬件联动验证闭环。
      </p>
      <div class="smartble-copy-grid">
        <article>
          <h3>对用户</h3>
          <p>拿到就能用，不必每个平台重新学习一遍蓝牙调试路径。</p>
        </article>
        <article>
          <h3>对开发者</h3>
          <p>同一份设计与交互规范，可以同步落到小程序、桌面和原生端。</p>
        </article>
      </div>
    </div>
    <div class="smartble-product-visual">
      <img src="/brand/hero.png" alt="Smart BLE product hero">
    </div>
  </section>

  <section class="smartble-flow-lane">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Workflow</div>
      <h2>所有平台都应该讲同一条调试故事线</h2>
      <p>视觉可以因平台变化，任务顺序和状态含义不能漂移。</p>
    </div>
    <div class="smartble-flow-grid">
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">01</span>
        <h3>Scan</h3>
        <p>确认蓝牙状态，开始扫描，结合过滤器缩小候选设备范围。</p>
      </article>
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">02</span>
        <h3>Connect</h3>
        <p>进入设备会话，发现服务树，保持连接状态和日志入口始终可见。</p>
      </article>
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">03</span>
        <h3>Inspect</h3>
        <p>读写特征值、开启通知、导出日志、执行 OTA 等高频调试动作。</p>
      </article>
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">04</span>
        <h3>Broadcast</h3>
        <p>配置名称、UUID 和 Manufacturer Data，在广播模式下验证设备侧行为。</p>
      </article>
    </div>
  </section>

  <section class="smartble-platform-matrix">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Platform Matrix</div>
      <h2>一个品牌系统，多个运行入口</h2>
      <p>每条路线都有自己的角色，但不应该长成不同的产品。</p>
    </div>
    <div class="smartble-platform-grid">
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span class="smartble-platform-icon">📱</span>
          <span class="smartble-platform-badge">Public Entry</span>
        </div>
        <h3>UniApp / 微信小程序</h3>
        <p>传播成本最低的入口，也是 Smart BLE 品牌层最先统一的运行面。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span class="smartble-platform-icon">🐦</span>
          <span class="smartble-platform-badge">Mobile Mainline</span>
        </div>
        <h3>Flutter</h3>
        <p>Android / iOS 的跨平台主线，适合把统一体验真正产品化。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span class="smartble-platform-icon">🦀</span>
          <span class="smartble-platform-badge">Workbench</span>
        </div>
        <h3>Tauri / Electron</h3>
        <p>面向长时间调试和桌面效率场景的工作台版本。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span class="smartble-platform-icon">🤖</span>
          <span class="smartble-platform-badge">Native</span>
        </div>
        <h3>Android</h3>
        <p>Kotlin + Compose 的原生实现，承接权限、后台扫描和原生能力验证。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span class="smartble-platform-icon">🍎</span>
          <span class="smartble-platform-badge">Native</span>
        </div>
        <h3>iOS / macOS</h3>
        <p>SwiftUI / CoreBluetooth 路线，负责 Apple 平台的原生可信体验。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span class="smartble-platform-icon">🔩</span>
          <span class="smartble-platform-badge">Hardware</span>
        </div>
        <h3>ESP32 / 协议侧</h3>
        <p>不是孤立示例，而是与上层调试工具配套联动的硬件闭环。</p>
      </article>
    </div>
  </section>

  <section id="download-hub" class="smartble-download-hub">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Download Hub</div>
      <h2>先体验，再深入代码和架构</h2>
      <p>如果你只是想快速验证设备、广播或协议链路，直接从这里选入口。</p>
    </div>
    <div class="smartble-download-grid">
      <a class="smartble-download-card" href="https://github.com/luoyaosheng/smart-ble/releases/latest" target="_blank">
        <span class="smartble-download-icon">🤖</span>
        <h3>Android APK</h3>
        <p>适合现场扫描、连接和服务调试的原生入口。</p>
        <span class="smartble-download-cta">下载 Android 构建</span>
      </a>
      <a class="smartble-download-card" href="https://github.com/luoyaosheng/smart-ble/releases/latest" target="_blank">
        <span class="smartble-download-icon">🦀</span>
        <h3>Windows / 桌面版</h3>
        <p>更适合长时间工作台式调试，保留更多并行信息密度。</p>
        <span class="smartble-download-cta">查看最新 Releases</span>
      </a>
      <a class="smartble-download-card" href="https://github.com/luoyaosheng/smart-ble/releases/latest" target="_blank">
        <span class="smartble-download-icon">🍎</span>
        <h3>macOS 构建</h3>
        <p>提供 Tauri 与原生 Swift 两条 Apple 平台路线。</p>
        <span class="smartble-download-cta">下载 macOS 构建</span>
      </a>
      <a class="smartble-download-card smartble-download-card--source" href="https://github.com/luoyaosheng/smart-ble" target="_blank">
        <span class="smartble-download-icon">📦</span>
        <h3>源码与文档</h3>
        <p>如果你要二开、学习架构或对照多平台实现，从仓库和白皮书开始。</p>
        <span class="smartble-download-cta">进入 GitHub 仓库</span>
      </a>
    </div>
  </section>

  <section class="smartble-learning-grid">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Learning Paths</div>
      <h2>把“能用”与“能学会”一起交付</h2>
      <p>Smart BLE 不只是工具，也是一套围绕 BLE 软硬件协同的教学材料。</p>
    </div>
    <div class="smartble-learning-cards">
      <a href="/tutorials/01_introduction_and_setup" class="smartble-learning-card">
        <h3>快速上手</h3>
        <p>第一次进入仓库，先从起步教程快速跑通扫描和连接。</p>
      </a>
      <a href="/tutorials/02_advanced_usage_and_broadcast" class="smartble-learning-card">
        <h3>广播与进阶</h3>
        <p>想理解外设模式、广播群控和更深入的 BLE 调试玩法，从这里进入。</p>
      </a>
      <a href="/MASTER_ARCHITECTURE" class="smartble-learning-card">
        <h3>架构白皮书</h3>
        <p>统一看协议内核、组件拆分、状态流和多端对齐策略。</p>
      </a>
      <a href="/tutorials/hardware/01_Hardware_Philosophy" class="smartble-learning-card">
        <h3>硬件联动</h3>
        <p>从 ESP32 和下位机侧理解 Smart BLE 为什么不是纯前端项目。</p>
      </a>
    </div>
  </section>
</div>
