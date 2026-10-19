---
layout: home
title: "蓝析BLE工具箱｜开源蓝牙调试工具"
titleTemplate: false
description: "蓝析BLE工具箱是一款开源蓝牙调试工具，提供 BLE 设备扫描、连接、GATT 服务查看、数据读写和通知订阅。了解移动端、桌面端与硬件示例，在线体验交互原型。"

hero:
  name: "蓝析BLE工具箱"
  text: "蓝牙调试，<br>从发现到读写"
  tagline: "扫描附近设备，查看服务与特征，发送数据、订阅通知。为 BLE 开发、设备联调与学习提供一套开源工具。"
  image:
    src: /brand/hero-duo.webp
    alt: 蓝析BLE工具箱 界面截图（Android 开发预览，automator 实拍）
  actions:
    - theme: brand
      text: 体验交互原型
      link: /prototype/app/high-fi/
    - theme: alt
      text: 查看平台与下载
      link: /#get
    - theme: alt
      text: 使用文档
      link: /tutorials/01_introduction_and_setup
---

<div class="sb-home">

  <section id="get" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Get started</div>
      <h2>选择你的使用方式</h2>
      <p>当前版本 v1.0.5 · PREVIEW 开发预览。可以先体验交互原型，或获取源码自行构建；正式安装包和商店入口正在准备。</p>
    </div>
    <div class="sb-get-grid">
      <div class="sb-get-qr-card">
        <h3>先看看怎么用</h3>
        <p>在浏览器中体验扫描、连接和数据调试流程。原型使用模拟数据，不会连接真实蓝牙设备。</p>
        <span class="sb-get-hint"><a href="/prototype/app/high-fi/">打开交互原型 →</a></span>
      </div>
      <div class="sb-get-qr-card">
        <h3>获取开源项目</h3>
        <p>移动端、桌面端和硬件示例都在同一个 smart-ble 工程中，使用统一名称「蓝析BLE工具箱」。</p>
        <span class="sb-get-hint"><a href="https://github.com/LuoYaoSheng/smart-ble" target="_blank" rel="noopener">GitHub</a> · <a href="https://gitee.com/luoyaosheng/lys-smart-ble" target="_blank" rel="noopener">Gitee</a></span>
      </div>
    </div>
    <div class="sb-dl-wrap"><table class="sb-dl-table">
      <thead><tr><th>平台</th><th>适用设备</th><th>正式分发</th><th>当前获取方式</th></tr></thead>
      <tbody>
        <tr><td>Android</td><td>手机与平板</td><td><span class="sb-dl-wait">国内应用商店准备中</span></td><td><a href="/tutorials/platforms/native_mobile">源码与构建指引</a></td></tr>
        <tr><td>iOS</td><td>iPhone / iPad · 原生 SwiftUI</td><td><span class="sb-dl-wait">App Store 准备中</span></td><td><a href="/native-apple-publishing">原生 Apple 工程</a></td></tr>
        <tr><td>macOS</td><td>Apple 芯片 / Intel · 原生 AppKit</td><td><span class="sb-dl-wait">Mac 分发准备中</span></td><td><a href="/native-apple-publishing">原生 Apple 工程</a></td></tr>
        <tr><td>Windows</td><td>x64 / ARM64</td><td><span class="sb-dl-wait">正式安装包准备中</span></td><td><a href="/tutorials/platforms/desktop">桌面构建指引</a></td></tr>
        <tr><td>Linux</td><td>x64 / ARM64</td><td><span class="sb-dl-wait">正式安装包准备中</span></td><td><a href="/tutorials/platforms/desktop">桌面构建指引</a></td></tr>
      </tbody>
    </table></div>
    <p class="sb-platform-footnote">正式发布后会在这里提供安装入口、版本说明与 SHA256。当前可查看<a href="/status/">发布进度与平台限制</a>；广播、配网与 OTA 能力取决于系统、蓝牙适配器和目标设备。ESP32 示例见<a href="/tutorials/hardware/01_Hardware_Philosophy">硬件入门</a>。</p>
  </section>

  <section id="why" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Why</div>
      <h2>看清设备，也看懂通信</h2>
      <p>从查看设备广播到分析收发数据，把日常 BLE 联调需要的操作放在一起，也为学习和扩展提供源码与硬件示例。</p>
    </div>
    <div class="sb-feature-grid">
      <article class="sb-feature-card">
        <h3>面向设备联调的工具</h3>
        <p>扫描、连接、服务发现、数据读写与通知订阅，按一次设备调试的顺序组织。</p>
      </article>
      <article class="sb-feature-card">
        <h3>多平台多框架对照样例</h3>
        <p>uni-app（Vue 3）、Flutter、Kotlin、SwiftUI、AppKit、Tauri、Electron、Avalonia、Qt、Wails 实现同一套产品规范——横向对比本身就是学习路径。</p>
      </article>
      <article class="sb-feature-card">
        <h3>软硬件一体的学习与联动</h3>
        <p>ESP32 参考固件、公开协议与教程配套，从刷入固件到首次扫描、连接、读写、Notify 全链路可复现。</p>
      </article>
    </div>
    <p class="sb-platform-footnote">适用人群：BLE 设备开发者 · Android / iOS 开发者 · 嵌入式工程师 · BLE 学习者与需要多实现对照的团队。配套从 <a href="/tutorials/01_introduction_and_setup">快速起步教案</a> 与 <a href="/MASTER_ARCHITECTURE">整体架构指南</a> 进入。</p>
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
        <p>在支持外设模式的平台发送广播，与测试设备配合联调。</p>
      </article>
    </div>
  </section>

  <section id="platforms" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Platforms</div>
      <h2>同一个工程，覆盖不同设备</h2>
      <p>手机、平板和桌面各有对应实现；开发者可以在同一个仓库中查看平台适配与协议代码。</p>
    </div>
    <div class="sb-platform-grid">
      <a href="/tutorials/platforms/uniapp" class="sb-platform-card">
        <span class="sb-platform-status">客户端主线 · 开发预览</span>
        <h3>Android</h3>
        <p>Kotlin / Jetpack Compose 原生实现，以及 Flutter、uni-app 客户端，适合手机端设备调试。</p>
      </a>
      <a href="/tutorials/platforms/native_mobile" class="sb-platform-card">
        <span class="sb-platform-status">原生线 · 源码可构建</span>
        <h3>iOS / macOS</h3>
        <p>iOS 使用原生 SwiftUI，Mac 使用原生 AppKit；两端共享 Apple 工程入口与 BLE 协议代码。</p>
      </a>
      <a href="/tutorials/platforms/flutter" class="sb-platform-card">
        <span class="sb-platform-status">跨框架 · 源码可构建</span>
        <h3>Flutter</h3>
        <p>覆盖 Android、iOS、macOS 和 Windows，可对照同一套页面与状态在不同系统中的表现。</p>
      </a>
      <a href="/tutorials/platforms/desktop" class="sb-platform-card">
        <span class="sb-platform-status">桌面线 · 源码可构建</span>
        <h3>Windows / macOS / Linux</h3>
        <p>Tauri、Electron 覆盖多个桌面系统；Windows 另有 Avalonia、Qt、Wails 实现，Mac 提供原生 AppKit 客户端。</p>
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
        <p>PlatformIO / Arduino（NimBLE）参考固件，硬件联动与协议示例，广播与 OTA 的真机对手方；STM32 为协议样板（不构建分发）。</p>
      </a>
    </div>
    <p class="sb-platform-footnote">各实现共用同一产品规范与协议内核，当前均未发布正式产物，可从源码构建。能力与发布状态见<a href="/status/">项目状态页</a>与<a href="/product-contract/05_PLATFORM_MATRIX">平台适配矩阵</a>。</p>
  </section>

  <section id="prototype" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Interactive Prototype</div>
      <h2>先在浏览器里熟悉操作</h2>
      <p>打开移动端或桌面原型，查看扫描、连接、调试和配网页面；也可以切换空列表、断线、失败等状态。原型使用模拟数据。</p>
    </div>
    <div class="sb-platform-grid">
      <a href="/prototype/wechat/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">冻结历史快照 · 2026-09-11 退役</span>
        <h3>微信小程序版（历史原型）</h3>
        <p>微信运行目标已退役；本实例仅作交互设计历史参考，不再随产品演进。</p>
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
    <p class="sb-platform-footnote">这些页面用于体验交互，不连接真实设备，也不代表应用已上架。微信实例保留为历史设计参考，当前没有公开的小程序访问入口。</p>
  </section>

  <section id="profile" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Smart HID &amp; Profiles</div>
      <h2>为特定设备提供专属操作</h2>
      <p>识别支持的设备后，可以进入对应的配网与诊断页面。通用扫描和 GATT 调试仍可独立使用。</p>
    </div>
    <div class="sb-feature-grid">
      <a href="/smart-hid/README" class="sb-feature-card sb-feature-card--link">
        <h3>Smart HID 第一方 Profile</h3>
        <p>配网、诊断与历史；由首页通用扫描识别，BLE 只负责配置与诊断，不承载实时控制。</p>
        <p class="sb-feature-note">开发预览</p>
      </a>
      <a href="https://github.com/LuoYaoSheng/Smart-HID-Workspace" target="_blank" rel="noopener" class="sb-feature-card sb-feature-card--link">
        <h3>设备协议与固件源码</h3>
        <p>Smart HID 的设备协议、参考固件和配套代码可公开查阅，便于理解配网过程并开展联调。</p>
      </a>
      <a href="/profiles/README" class="sb-feature-card sb-feature-card--link">
        <h3>开放 Profile 扩展</h3>
        <p>新型号按公开流程注册进 Profile 注册表——协议、测试步骤与证据格式全部公开可贡献。</p>
      </a>
    </div>
  </section>

  <section id="gallery" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Gallery</div>
      <h2>界面一览：移动端与桌面端</h2>
      <p>Android 图片来自开发预览版真机实拍；App 与桌面形态图片来自交互原型。部分截图拍摄于更名前，最新名称与页面可在上方交互原型中查看。</p>
    </div>
    <h3 class="sb-gallery-h3">移动端 · Android 真机（开发预览版）</h3>
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
    <h3 class="sb-gallery-h3">移动端 · App 形态与微信历史快照（高保真原型实拍）</h3>
    <div class="sb-gallery-grid--duo">
      <figure>
        <img src="/gallery/proto-wechat.png" alt="微信小程序形态（历史冻结）：扫描页与页面/场景导航面板" loading="lazy">
        <figcaption>微信小程序形态（2026-09-11 退役冻结）· 扫描页与状态导航</figcaption>
      </figure>
      <figure>
        <img src="/gallery/proto-app.png" alt="App 形态：Android 实例扫描页" loading="lazy">
        <figcaption>App 形态 · Android 实例（权限链与广播增强差异）</figcaption>
      </figure>
    </div>
    <h3 class="sb-gallery-h3">桌面端（高保真原型实拍）</h3>
    <div class="sb-gallery-grid--duo">
      <figure>
        <img src="/gallery/proto-desktop.png" alt="桌面工作台：mac 窗形、扫描页与页面/场景导航面板" loading="lazy">
        <figcaption>桌面工作台 · mac 窗形（窗口 chrome 可切 win / linux）</figcaption>
      </figure>
    </div>
    <p class="sb-platform-footnote">三张形态截图来自<a href="/prototype/desktop/high-fi/">线上可交互原型</a>——同一基准内核 + 各平台单一覆写层，页面、场景与宿主维度均可在线切换；桌面端正式安装包仍在准备，可在上方平台列表查看源码与构建指引。</p>
  </section>

  <section class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Open Source</div>
      <h2>源码、文档与反馈</h2>
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
        <h3>联系开发者</h3>
        <p>使用问题与建议：<a href="mailto:121912336@qq.com">121912336@qq.com</a>。<a href="/privacy">查看隐私说明</a>。</p>
      </div>
    </div>
  </section>

</div>
