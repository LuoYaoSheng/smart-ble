---
layout: home
title: "蓝析BLE工具箱 | Open-source BLE debugging tools"
titleTemplate: false
description: "Scan BLE devices, inspect GATT services, read and write data, and subscribe to notifications. Explore mobile and desktop clients, hardware examples and an interactive prototype."

hero:
  name: "蓝析BLE工具箱"
  text: "BLE debugging, from discovery to data"
  tagline: "Scan nearby devices, inspect services, exchange data and subscribe to notifications. Open-source tools for BLE development, device testing and learning."
  image:
    src: /brand/hero-duo.webp
    alt: 蓝析BLE工具箱 app screenshots (Android preview, captured from device)
  actions:
    - theme: brand
      text: Try the prototype
      link: /prototype/app/high-fi/
    - theme: alt
      text: Platforms and downloads
      link: /en/#get
    - theme: alt
      text: Read the docs
      link: /tutorials/01_introduction_and_setup
---

<div class="sb-home">

  <section id="get" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Get started</div>
      <h2>Choose how to get started</h2>
      <p>Version v1.0.5 · PREVIEW. Explore the interactive prototype or build from source. Official installers and store listings are in preparation.</p>
    </div>
    <div class="sb-get-grid">
      <div class="sb-get-qr-card">
        <h3>Explore the workflow</h3>
        <p>Try scanning, connection and data inspection screens in your browser. The prototype uses simulated data and does not connect to Bluetooth devices.</p>
        <span class="sb-get-hint"><a href="/prototype/app/high-fi/">Open the prototype →</a></span>
      </div>
      <div class="sb-get-qr-card">
        <h3>Get the source</h3>
        <p>Mobile clients, desktop clients and hardware examples live in one smart-ble repository under the product name 蓝析BLE工具箱.</p>
        <span class="sb-get-hint"><a href="https://github.com/LuoYaoSheng/smart-ble" target="_blank" rel="noopener">GitHub</a> · <a href="https://gitee.com/luoyaosheng/lys-smart-ble" target="_blank" rel="noopener">Gitee</a></span>
      </div>
    </div>
    <div class="sb-dl-wrap"><table class="sb-dl-table">
      <thead><tr><th>Platform</th><th>Devices</th><th>Distribution</th><th>Get it today</th></tr></thead>
      <tbody>
        <tr><td>Android</td><td>Phones and tablets</td><td><span class="sb-dl-wait">Store listings in preparation</span></td><td><a href="/tutorials/platforms/native_mobile">Source and build guide</a></td></tr>
        <tr><td>iOS</td><td>iPhone / iPad · Native SwiftUI</td><td><span class="sb-dl-wait">App Store in preparation</span></td><td><a href="/native-apple-publishing">Native Apple project</a></td></tr>
        <tr><td>macOS</td><td>Apple silicon / Intel · Native AppKit</td><td><span class="sb-dl-wait">Mac distribution in preparation</span></td><td><a href="/native-apple-publishing">Native Apple project</a></td></tr>
        <tr><td>Windows</td><td>x64 / ARM64</td><td><span class="sb-dl-wait">Installers in preparation</span></td><td><a href="/tutorials/platforms/desktop">Desktop build guide</a></td></tr>
        <tr><td>Linux</td><td>x64 / ARM64</td><td><span class="sb-dl-wait">Installers in preparation</span></td><td><a href="/tutorials/platforms/desktop">Desktop build guide</a></td></tr>
      </tbody>
    </table></div>
    <p class="sb-platform-footnote">Official downloads will include release notes and SHA256 checksums. See <a href="/status/">release progress and limitations</a>. Broadcasting, provisioning and OTA depend on the platform, adapter and target device. ESP32 examples are covered in the <a href="/tutorials/hardware/01_Hardware_Philosophy">hardware guide</a>.</p>
  </section>

  <section id="why" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Why</div>
      <h2>Understand devices and their data</h2>
      <p>Inspect advertisements, explore services and follow the data exchanged with a device. Source code and hardware examples help you learn and extend the workflow.</p>
    </div>
    <div class="sb-feature-grid">
      <article class="sb-feature-card">
        <h3>Tools for device debugging</h3>
        <p>Scanning, connection, service discovery, data exchange and notifications, organized around a typical debugging session.</p>
      </article>
      <article class="sb-feature-card">
        <h3>Multi-platform comparison samples</h3>
        <p>uni-app (Vue 3), Flutter, Kotlin, SwiftUI, AppKit, Tauri, Electron, Avalonia, Qt and Wails implement the same product spec — side-by-side comparison is the learning path.</p>
      </article>
      <article class="sb-feature-card">
        <h3>Software + hardware learning loop</h3>
        <p>ESP32 reference firmware, open protocols and tutorials — reproducible from flashing to your first scan, connect, read/write and Notify.</p>
      </article>
    </div>
    <p class="sb-platform-footnote">For: BLE device developers · Android / iOS developers · embedded engineers · BLE learners and teams needing multi-implementation comparison. Start with the <a href="/tutorials/01_introduction_and_setup">quick-start tutorial</a> and the <a href="/MASTER_ARCHITECTURE">master architecture guide</a> (Chinese).</p>
  </section>

  <section id="features" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Features</div>
      <h2>Built for real debugging scenarios</h2>
      <p>From discovering devices to verifying firmware, every step lives in one workflow with one product language.</p>
    </div>
    <div class="sb-feature-grid">
      <article class="sb-feature-card">
        <h3>Scan &amp; smart state filtering</h3>
        <p>Scan nearby BLE devices in real time, parse advertising packets and RSSI, and lock onto targets with state filtering.</p>
        <p class="sb-feature-note">Preview</p>
      </article>
      <article class="sb-feature-card">
        <h3>Connect &amp; dynamic discovery</h3>
        <p>Enumerate services and characteristics automatically after connecting, layer by layer.</p>
        <p class="sb-feature-note">Preview</p>
      </article>
      <article class="sb-feature-card">
        <h3>Read / Write / Notify</h3>
        <p>One consistent interaction language with UTF-8 / HEX packing — byte-level visibility.</p>
        <p class="sb-feature-note">Preview</p>
      </article>
      <article class="sb-feature-card">
        <h3>Multi-device &amp; logs</h3>
        <p>Parallel connections with event anti-crosstalk and full-dimension live logs, so issues trace back to evidence.</p>
        <p class="sb-feature-note">In development</p>
      </article>
      <article class="sb-feature-card">
        <h3>Peripheral broadcasting</h3>
        <p>Turn your phone into a broadcasting peripheral with strict 128-bit UUID validation, symmetric against ESP32.</p>
        <p class="sb-feature-note">In development</p>
      </article>
      <article class="sb-feature-card">
        <h3>OTA &amp; firmware verification</h3>
        <p>Firmware upgrade demo with outbound chunked delivery, extending the loop to the device side.</p>
        <p class="sb-feature-note">Partially blocked — see status page</p>
      </article>
    </div>
  </section>

  <section class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Workflow</div>
      <h2>One workflow, from discovery to verification</h2>
    </div>
    <div class="sb-flow-grid">
      <article class="sb-flow-card">
        <span class="sb-flow-index">01 · Scan</span>
        <h3>Scan</h3>
        <p>Nearby devices and broadcasts at a glance.</p>
      </article>
      <article class="sb-flow-card">
        <span class="sb-flow-index">02 · Connect</span>
        <h3>Connect</h3>
        <p>Establish links and discover services.</p>
      </article>
      <article class="sb-flow-card">
        <span class="sb-flow-index">03 · Inspect</span>
        <h3>Inspect</h3>
        <p>Read, write, subscribe — byte-level.</p>
      </article>
      <article class="sb-flow-card">
        <span class="sb-flow-index">04 · Broadcast</span>
        <h3>Broadcast</h3>
        <p>Send advertisements on supported platforms and test against a reference device.</p>
      </article>
    </div>
  </section>

  <section class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Platforms</div>
      <h2>Multi-platform, multi-framework — one family</h2>
      <p>Every implementation shares one product spec and BLE protocol core, adapted per platform — from Android and iOS / macOS to desktop and ESP32 firmware.</p>
    </div>
    <div class="sb-platform-grid">
      <a href="/tutorials/platforms/uniapp" class="sb-platform-card">
        <span class="sb-platform-status">Client mainline · Preview</span>
        <h3>Android</h3>
        <p>The uni-app line plus a Kotlin / Jetpack Compose native implementation, carrying the full feature catalog.</p>
      </a>
      <a href="/tutorials/platforms/native_mobile" class="sb-platform-card">
        <span class="sb-platform-status">Native line · Build from source</span>
        <h3>iOS / macOS</h3>
        <p>Native SwiftUI on iOS and native AppKit on Mac, with a shared Apple workspace and BLE protocol code.</p>
      </a>
      <a href="/tutorials/platforms/flutter" class="sb-platform-card">
        <span class="sb-platform-status">Cross-framework · Build from source</span>
        <h3>Flutter</h3>
        <p>Flutter clients for Android, iOS, macOS and Windows, with shared page flows adapted to each system.</p>
      </a>
      <a href="/tutorials/platforms/desktop" class="sb-platform-card">
        <span class="sb-platform-status">Desktop line · Build from source</span>
        <h3>Windows / macOS / Linux</h3>
        <p>Tauri and Electron cover multiple desktop systems. Windows also has Avalonia, Qt and Wails implementations; Mac has a native AppKit client.</p>
      </a>
      <a href="/tutorials/platforms/uniapp" class="sb-platform-card">
        <span class="sb-platform-status">Degraded · No real BLE</span>
        <h3>H5</h3>
        <p>Same uni-app line, degraded to product preview and docs; real BLE is explicitly marked unsupported.</p>
      </a>
      <a href="/prototype/web/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">Prototype · Interactive</span>
        <h3>Web</h3>
        <p>This site plus the HTML interactive prototype — the product and interaction master with per-platform views.</p>
      </a>
      <a href="/tutorials/hardware/01_Hardware_Philosophy" class="sb-platform-card">
        <span class="sb-platform-status">Hardware fixture · In development</span>
        <h3>ESP32 Firmware</h3>
        <p>PlatformIO / Arduino (NimBLE) reference firmware for BLE testing and protocol examples. STM32 code remains a protocol sample, without a distributed build.</p>
      </a>
    </div>
    <p class="sb-platform-footnote">All implementations share one product spec and protocol core; no official artifacts are released yet — everything builds from source. Capability and release status: <a href="/status/">status page</a> and <a href="/product-contract/05_PLATFORM_MATRIX">platform matrix</a> (Chinese).</p>
  </section>

  <section id="prototype" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Interactive Prototype</div>
      <h2>Explore the interface before building</h2>
      <p>High-fidelity interactive prototypes on a shared base kernel with one override layer per platform: the full scan → connect → debug → provisioning flow, with normal, empty, failed, disconnected and unsupported states all switchable.</p>
    </div>
    <div class="sb-platform-grid">
      <a href="/prototype/wechat/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">Archived design prototype</span>
        <h3>WeChat Mini Program (historical)</h3>
        <p>Preserved as a design reference. There is currently no public Mini Program access link.</p>
      </a>
      <a href="/prototype/app/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">Android instance · High-fi</span>
        <h3>App</h3>
        <p>Base kernel + Android override layer: permission chains, broadcast enhancements and system sharing.</p>
      </a>
      <a href="/prototype/desktop/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">Desktop form · High-fi</span>
        <h3>Desktop</h3>
        <p>Base kernel + desktop override layer: mac / win / linux window chrome and scan-first pairing.</p>
      </a>
      <a href="/prototype/web/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">GATT subset · High-fi</span>
        <h3>Web</h3>
        <p>Independent subset kernel: environment gating, the requestDevice picker and explicit missing-capability marks.</p>
      </a>
    </div>
    <p class="sb-platform-footnote">These prototypes use simulated data and do not connect to real devices or indicate a store release. The WeChat instance is preserved as a historical design reference.</p>
  </section>

  <section id="profile" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Smart HID &amp; Profiles</div>
      <h2>Device-specific setup and diagnostics</h2>
      <p>Supported devices can expose their own provisioning and diagnostics pages. Generic scanning and GATT debugging remain independently available.</p>
    </div>
    <div class="sb-feature-grid">
      <a href="/smart-hid/README" class="sb-feature-card sb-feature-card--link">
        <h3>Smart HID first-party profile</h3>
        <p>Provisioning, diagnostics and history; recognized by generic scanning — BLE handles configuration and diagnostics only.</p>
        <p class="sb-feature-note">Preview</p>
      </a>
      <a href="https://github.com/LuoYaoSheng/Smart-HID-Workspace" target="_blank" rel="noopener" class="sb-feature-card sb-feature-card--link">
        <h3>Device protocols and firmware source</h3>
        <p>Explore the Smart HID device protocols, reference firmware and companion code to understand provisioning and test compatible devices.</p>
      </a>
      <a href="/profiles/README" class="sb-feature-card sb-feature-card--link">
        <h3>Open profile extension</h3>
        <p>New device models register into the profile registry via a public process — protocol, test steps and evidence formats are all open.</p>
      </a>
    </div>
  </section>

  <section id="gallery" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Gallery</div>
      <h2>Gallery: mobile and desktop</h2>
      <p>Android screenshots are captured from a real device running the development preview; the mini program / App form factors and desktop shots come from the interactive high-fidelity prototype (mock data).</p>
      <p>Some screenshots predate the product rename. Open the interactive prototype above to see the current name and interface.</p>
    </div>
    <h3 class="sb-gallery-h3">Mobile · Android real device (development preview)</h3>
    <div class="sb-gallery-grid">
      <figure>
        <img src="/gallery/scan.webp" alt="Scan page: nearby BLE device list" loading="lazy">
        <figcaption>Scan list</figcaption>
      </figure>
      <figure>
        <img src="/gallery/device-detail.webp" alt="Device detail page: services and characteristics" loading="lazy">
        <figcaption>Device detail</figcaption>
      </figure>
      <figure>
        <img src="/gallery/hid-detail.webp" alt="HID device detail page" loading="lazy">
        <figcaption>HID device</figcaption>
      </figure>
      <figure>
        <img src="/gallery/version-history.webp" alt="Version history page" loading="lazy">
        <figcaption>Version history</figcaption>
      </figure>
      <figure>
        <img src="/gallery/broadcast.webp" alt="Broadcast page: phone peripheral broadcasting" loading="lazy">
        <figcaption>Broadcast</figcaption>
      </figure>
    </div>
    <h3 class="sb-gallery-h3">Mobile · App prototype and archived WeChat design</h3>
    <div class="sb-gallery-grid--duo">
      <figure>
        <img src="/gallery/proto-wechat.png" alt="Archived WeChat design: scan page with page/state navigator" loading="lazy">
        <figcaption>Archived WeChat design · scan page and state navigator</figcaption>
      </figure>
      <figure>
        <img src="/gallery/proto-app.png" alt="App form factor: Android instance scan page" loading="lazy">
        <figcaption>App form · Android instance (permission chain and broadcast differences)</figcaption>
      </figure>
    </div>
    <h3 class="sb-gallery-h3">Desktop (prototype captures)</h3>
    <div class="sb-gallery-grid--duo">
      <figure>
        <img src="/gallery/proto-desktop.png" alt="Desktop workspace: mac window chrome, scan page with page/state navigator" loading="lazy">
        <figcaption>Desktop workspace · mac window chrome (switch to win / linux online)</figcaption>
      </figure>
    </div>
    <p class="sb-platform-footnote">The three form-factor captures come from the <a href="/prototype/desktop/high-fi/">live interactive prototype</a> — one base kernel + a single override layer per platform; pages, states and host dimensions are all switchable online. Official desktop installers are still in preparation; source and build guides are listed above.</p>
  </section>

  <section class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Open Source</div>
      <h2>Open source, honest, sustainable</h2>
    </div>
    <div class="sb-oss-grid">
      <a href="https://github.com/luoyaosheng/smart-ble" target="_blank" rel="noopener" class="sb-oss-card">
        <h3>GitHub</h3>
        <p>Repository, branches and history.</p>
      </a>
      <a href="https://github.com/luoyaosheng/smart-ble/issues" target="_blank" rel="noopener" class="sb-oss-card">
        <h3>Issues</h3>
        <p>Bug and feature tracking.</p>
      </a>
      <a href="/CONTRIBUTING_GUIDE" class="sb-oss-card">
        <h3>Contributing (Chinese)</h3>
        <p>How to improve docs and code.</p>
      </a>
      <a href="https://github.com/luoyaosheng/smart-ble/blob/main/LICENSE" target="_blank" rel="noopener" class="sb-oss-card">
        <h3>MIT License</h3>
        <p>Open source license.</p>
      </a>
      <a href="/status/" class="sb-oss-card">
        <h3>Status &amp; Roadmap (Chinese)</h3>
        <p>Platform matrix, workflow status, limits and release conditions — all public.</p>
      </a>
      <div class="sb-oss-card sb-oss-card--static" role="note">
        <h3>Contact</h3>
        <p>Questions and feedback: <a href="mailto:121912336@qq.com">121912336@qq.com</a>. <a href="/privacy">Privacy information</a> (Chinese).</p>
      </div>
    </div>
  </section>

</div>
