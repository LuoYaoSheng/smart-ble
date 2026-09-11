---
layout: home

hero:
  name: "BLE Toolkit+"
  text: "开源 BLE 工具家族，调通每一台 BLE 设备"
  tagline: "调试 · 学习 · 多平台多框架对照 · 硬件联动——同一套产品规范，从微信小程序、Android、iOS / macOS、桌面到 ESP32 固件与 Smart HID Profile。"
  image:
    src: /brand/hero-duo.webp
    alt: BLE Toolkit+ 界面截图（Android 开发预览，automator 实拍）
  actions:
    - theme: brand
      text: 微信扫码使用
      link: /#get
    - theme: alt
      text: 查看文档
      link: /product-contract/
    - theme: alt
      text: GitHub
      link: https://github.com/luoyaosheng/smart-ble
---

<div class="sb-home">

  <section id="get" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Get</div>
      <h2>获取 BLE Toolkit+</h2>
      <p>微信小程序是当前最快的上手方式——扫码即用。Android、iOS / macOS、桌面、Flutter 等其余平台均可从源码构建，安装包与固件发布后将在此处提供直接下载。</p>
    </div>
    <div class="sb-get-grid">
      <div class="sb-get-qr-card">
        <img class="sb-qr-img" src="/qr/wechat-miniprogram.jpg" width="172" height="172"
             alt="BLE Toolkit+ 微信小程序码">
        <h3>BLE Toolkit+ 微信小程序</h3>
        <p>微信扫码使用小程序，无需安装，打开即用。</p>
        <span class="sb-get-hint">手机微信「扫一扫」上方小程序码</span>
      </div>
      <a href="/tutorials/platforms/uniapp" class="sb-get-card">
        <span class="sb-get-tag">Android</span>
        <h3>BLE Toolkit+ for Android</h3>
        <p>安装包筹备中。当前可从源码用 HBuilderX 自行构建体验。</p>
        <span class="sb-get-cta">查看构建教程 →</span>
      </a>
      <a href="/tutorials/hardware/01_Hardware_Philosophy" class="sb-get-card">
        <span class="sb-get-tag">ESP32</span>
        <h3>BLE Toolkit+ ESP32 固件</h3>
        <p>配套 Peripheral 固件源码与构建说明，作为真机联调的对手方。</p>
        <span class="sb-get-cta">查看固件构建 →</span>
      </a>
      <a href="https://github.com/luoyaosheng/smart-ble" target="_blank" rel="noopener" class="sb-get-card">
        <span class="sb-get-tag">Source</span>
        <h3>GitHub 源码</h3>
        <p>MIT 开源。克隆仓库即可参与开发、构建与问题反馈。</p>
        <span class="sb-get-cta">前往仓库 →</span>
      </a>
    </div>
  </section>

  <section id="why" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Why</div>
      <h2>不只是又一个调试工具</h2>
      <p>BLE 工具分散、体验不统一，学习资料零散、软硬件脱节，不同平台实现难以横向对比——这个开源产品家族用三件事同时回应。</p>
    </div>
    <div class="sb-feature-grid">
      <article class="sb-feature-card">
        <h3>可直接使用的调试工具</h3>
        <p>扫描、连接、读写、订阅、广播、OTA 收进同一条工作流；微信小程序扫码即用，其余各端从源码直接跑起。</p>
      </article>
      <article class="sb-feature-card">
        <h3>多平台多框架对照样例</h3>
        <p>uni-app（Vue 3）、Flutter、Kotlin、SwiftUI、AppKit、Tauri、Electron、Avalonia 实现同一套产品规范——横向对比本身就是学习路径。</p>
      </article>
      <article class="sb-feature-card">
        <h3>软硬件一体的学习与联动</h3>
        <p>ESP32 参考固件、公开协议与教程配套，从刷入固件到首次扫描、连接、读写、Notify 全链路可复现。</p>
      </article>
    </div>
    <p class="sb-platform-footnote">适用人群：BLE 设备开发者 · Android / iOS / 微信小程序开发者 · 嵌入式工程师 · BLE 学习者与需要多实现对照的团队。配套从 <a href="/tutorials/01_introduction_and_setup">快速起步教案</a> 与 <a href="/MASTER_ARCHITECTURE">整体架构指南</a> 进入。</p>
  </section>

  <section id="features" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Features</div>
      <h2>为真实调试场景而生</h2>
      <p>从发现设备到验证固件，每一环都在同一条工作流里，用同一套产品语言。</p>
    </div>
    <div class="sb-feature-grid">
      <article class="sb-feature-card">
        <h3>扫描与智能状态过滤</h3>
        <p>实时扫描周边 BLE 设备，解析广播包与信号强度，按状态过滤快速锁定目标。</p>
        <p class="sb-feature-note">开发预览</p>
      </article>
      <article class="sb-feature-card">
        <h3>连接与服务动态发现</h3>
        <p>建立连接后自动枚举服务与特征，层级结构清晰、逐层可展开。</p>
        <p class="sb-feature-note">开发预览</p>
      </article>
      <article class="sb-feature-card">
        <h3>读写与订阅</h3>
        <p>Read / Write / Notify 一致的操作语言，支持 UTF-8 / HEX 封解包，字节级收发明晰可查。</p>
        <p class="sb-feature-note">开发预览</p>
      </article>
      <article class="sb-feature-card">
        <h3>多设备并行与日志</h3>
        <p>多设备并行管控与事件防串扰，全维度实时日志留痕，回溯问题有据可依。</p>
        <p class="sb-feature-note">开发中</p>
      </article>
      <article class="sb-feature-card">
        <h3>外设模式广播</h3>
        <p>把手机变成外围设备对外广播，128 位 UUID 格式强校验，配合 ESP32 做对称验证。</p>
        <p class="sb-feature-note">开发中</p>
      </article>
      <article class="sb-feature-card">
        <h3>OTA 与固件验证</h3>
        <p>固件升级演示支持外发固件分包下发验证，把调试闭环延伸到设备侧。</p>
        <p class="sb-feature-note">部分链路受阻，详见项目状态</p>
      </article>
    </div>
  </section>

  <section class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Workflow</div>
      <h2>同一条工作流，从发现到验证</h2>
    </div>
    <div class="sb-flow-grid">
      <article class="sb-flow-card">
        <span class="sb-flow-index">01 · Scan</span>
        <h3>扫描</h3>
        <p>周边设备与广播内容一览，目标尽收眼底。</p>
      </article>
      <article class="sb-flow-card">
        <span class="sb-flow-index">02 · Connect</span>
        <h3>连接</h3>
        <p>建立连接，自动发现服务与特征。</p>
      </article>
      <article class="sb-flow-card">
        <span class="sb-flow-index">03 · Inspect</span>
        <h3>调试</h3>
        <p>读写、订阅与日志追踪，字节级可见。</p>
      </article>
      <article class="sb-flow-card">
        <span class="sb-flow-index">04 · Broadcast</span>
        <h3>广播</h3>
        <p>手机广播与 ESP32 对称验证，闭环收尾。</p>
      </article>
    </div>
  </section>

  <section class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Platforms</div>
      <h2>多平台多框架，一个工具家族</h2>
      <p>所有实现共用同一套产品规范与 BLE 协议内核，按平台差异各自落地——每条实现线都是一个可运行、可对照、可学习的样例。</p>
    </div>
    <div class="sb-platform-grid">
      <a href="/tutorials/platforms/uniapp" class="sb-platform-card">
        <span class="sb-platform-status">扫码即用 · 开发预览</span>
        <h3>微信小程序</h3>
        <p>uni-app（Vue 3）一线出品，轻量传播入口，覆盖扫描、连接与调试主路径。</p>
      </a>
      <a href="/tutorials/platforms/uniapp" class="sb-platform-card">
        <span class="sb-platform-status">客户端主线 · 开发预览</span>
        <h3>Android</h3>
        <p>uni-app 一线 + Kotlin / Jetpack Compose 原生增强，承载完整功能目录。</p>
      </a>
      <a href="/tutorials/platforms/native_mobile" class="sb-platform-card">
        <span class="sb-platform-status">原生线 · 源码可构建</span>
        <h3>iOS / macOS</h3>
        <p>Swift Package + SwiftUI + CoreBluetooth，原生探索与增强，共享 SmartHidCore。</p>
      </a>
      <a href="/tutorials/platforms/flutter" class="sb-platform-card">
        <span class="sb-platform-status">跨框架 · 源码可构建</span>
        <h3>Flutter</h3>
        <p>Flutter + Dart 跨平台移动实现，与 uni-app 线、原生线互为对照。</p>
      </a>
      <a href="/tutorials/platforms/desktop" class="sb-platform-card">
        <span class="sb-platform-status">桌面线 · 源码可构建</span>
        <h3>Windows / macOS / Linux</h3>
        <p>Tauri（Rust + btleplug）、Electron（Node.js + noble）、macOS Native（AppKit）、Avalonia（.NET）多路线对照。</p>
      </a>
      <a href="/tutorials/platforms/uniapp" class="sb-platform-card">
        <span class="sb-platform-status">降级体验 · 无真实 BLE</span>
        <h3>H5</h3>
        <p>同一 uni-app 一线的产品预览与文档体验；真实 BLE 在 H5 上明确标注不支持。</p>
      </a>
      <a href="/prototype/web/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">原型 · 可交互</span>
        <h3>Web</h3>
        <p>本站与 HTML 交互原型——产品与交互母版，可切换各平台视图查看全部状态。</p>
      </a>
      <a href="/tutorials/hardware/01_Hardware_Philosophy" class="sb-platform-card">
        <span class="sb-platform-status">硬件夹具 · 开发中</span>
        <h3>ESP32 固件</h3>
        <p>PlatformIO / ESP-IDF 参考固件，硬件联动与协议示例，广播与 OTA 的真机对手方；STM32 规划中。</p>
      </a>
    </div>
    <p class="sb-platform-footnote">各实现共用同一产品规范与协议内核，当前均未发布正式产物：微信小程序可扫码体验，其余平台可从源码构建。能力与发布状态见<a href="/status/">项目状态页</a>与<a href="/product-contract/05_PLATFORM_MATRIX">平台适配矩阵</a>。</p>
  </section>

  <section id="prototype" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Interactive Prototype</div>
      <h2>一个产品，四种平台形态，现在就能点</h2>
      <p>同一基准内核 + 各平台单一覆写层的高保真可交互原型：扫描、连接、调试、配网全流程，正常、空、失败、断线与不支持状态全部可切换。</p>
    </div>
    <div class="sb-platform-grid">
      <a href="/prototype/wechat/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">基准平台 · 高保真</span>
        <h3>微信小程序版</h3>
        <p>基准内核 + wxhost 覆写层，可切换安卓 / iOS 宿主与开发者工具视图。</p>
      </a>
      <a href="/prototype/app/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">Android 实例 · 高保真</span>
        <h3>App 版</h3>
        <p>基准内核 + Android 覆写层：权限链、广播增强与系统分享差异。</p>
      </a>
      <a href="/prototype/desktop/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">桌面形态 · 高保真</span>
        <h3>桌面版</h3>
        <p>基准内核 + desktop 覆写层：mac / win / linux 窗框三形态，扫码配对主路径。</p>
      </a>
      <a href="/prototype/web/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">GATT 子集 · 高保真</span>
        <h3>Web 版</h3>
        <p>独立子集内核：环境门禁、requestDevice 选择器与缺失能力显式标注。</p>
      </a>
    </div>
    <p class="sb-platform-footnote">每平台另配有 <a href="/prototype/wechat/low-fi/">低保真线框</a>（页面 × 状态 × 流程）与 PLATFORM_SPEC / PAGE_SPEC / FLOW / COMPONENT_RULE 四份说明文档；基准内核经 Playwright 26/26 验证。原型使用模拟数据，是产品与交互母版，不代表平台发布状态——桌面与 Web 为原型先行。</p>
  </section>

  <section id="profile" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Smart HID &amp; Profiles</div>
      <h2>第一方 Profile 与契约锁生态</h2>
      <p>通用 BLE 之上是一套可扩展的设备 Profile 体系：移除任一 Profile，它依然是完整的通用 BLE 工具。</p>
    </div>
    <div class="sb-feature-grid">
      <a href="/smart-hid/README" class="sb-feature-card sb-feature-card--link">
        <h3>Smart HID 第一方 Profile</h3>
        <p>配网、诊断与历史；由首页通用扫描识别，BLE 只负责配置与诊断，不承载实时控制。</p>
        <p class="sb-feature-note">开发预览</p>
      </a>
      <a href="https://github.com/LuoYaoSheng/Smart-HID-Workspace" target="_blank" rel="noopener" class="sb-feature-card sb-feature-card--link">
        <h3>契约锁对齐固件正典</h3>
        <p>配网协议与命令 Schema 以 SHA-256 契约锁与 Smart-HID-Workspace（固件 / ControlHub / 协议正典）跨仓对齐，不漂移。</p>
      </a>
      <a href="/profiles/README" class="sb-feature-card sb-feature-card--link">
        <h3>开放 Profile 扩展</h3>
        <p>新型号按公开流程注册进 Profile 注册表——协议、测试步骤与证据格式全部公开可贡献。</p>
      </a>
    </div>
  </section>

  <section class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Gallery</div>
      <h2>界面一览</h2>
      <p>以下截图来自 Android 开发预览版真机界面实拍。</p>
    </div>
    <div class="sb-gallery-grid">
      <figure>
        <img src="/gallery/scan.webp" alt="扫描页：周边 BLE 设备列表" loading="lazy">
        <figcaption>扫描列表</figcaption>
      </figure>
      <figure>
        <img src="/gallery/device-detail.webp" alt="设备详情页：服务与特征" loading="lazy">
        <figcaption>设备详情</figcaption>
      </figure>
      <figure>
        <img src="/gallery/hid-detail.webp" alt="HID 设备详情页" loading="lazy">
        <figcaption>HID 设备</figcaption>
      </figure>
      <figure>
        <img src="/gallery/version-history.webp" alt="版本历史页" loading="lazy">
        <figcaption>版本历史</figcaption>
      </figure>
      <figure>
        <img src="/gallery/broadcast.webp" alt="广播页：手机 Peripheral 广播" loading="lazy">
        <figcaption>广播页</figcaption>
      </figure>
    </div>
  </section>

  <section class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Open Source</div>
      <h2>开源、诚实、可持续</h2>
    </div>
    <div class="sb-oss-grid">
      <a href="https://github.com/luoyaosheng/smart-ble" target="_blank" rel="noopener" class="sb-oss-card">
        <h3>GitHub 源码</h3>
        <p>仓库、分支与提交历史。</p>
      </a>
      <a href="https://github.com/luoyaosheng/smart-ble/issues" target="_blank" rel="noopener" class="sb-oss-card">
        <h3>Issue 反馈</h3>
        <p>缺陷与需求跟踪。</p>
      </a>
      <a href="/CONTRIBUTING_GUIDE" class="sb-oss-card">
        <h3>贡献指南</h3>
        <p>如何参与文档与实现改进。</p>
      </a>
      <a href="https://github.com/luoyaosheng/smart-ble/blob/main/LICENSE" target="_blank" rel="noopener" class="sb-oss-card">
        <h3>MIT License</h3>
        <p>开源许可。</p>
      </a>
      <a href="/status/" class="sb-oss-card">
        <h3>项目状态与路线图</h3>
        <p>平台矩阵、流程状态、已知限制与发布条件，全部如实公开。</p>
      </a>
      <div class="sb-oss-card sb-oss-card--static" role="note">
        <h3>Security</h3>
        <p>安全披露入口待补充（仓库尚无 SECURITY.md，不提供假链接）。</p>
      </div>
    </div>
  </section>

</div>
