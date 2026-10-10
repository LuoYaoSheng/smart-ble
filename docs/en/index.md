---
layout: home

hero:
  name: "BLE Toolkit+"
  text: "An open-source BLE tool family for every BLE device"
  tagline: "Debug · Learn · Multi-platform multi-framework comparison · Hardware-in-the-loop — one product spec, covering Android, iOS / macOS, desktop, Web, ESP32 firmware and the Smart HID profile."
  image:
    src: /brand/hero-duo.webp
    alt: BLE Toolkit+ app screenshots (Android preview, captured from device)
  actions:
    - theme: brand
      text: Get BLE Toolkit+
      link: /en/#get
    - theme: alt
      text: Docs (Chinese)
      link: /product-contract/
    - theme: alt
      text: GitHub
      link: https://github.com/luoyaosheng/smart-ble
---

<div class="sb-home">

  <section id="get" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Get</div>
      <h2>Get BLE Toolkit+</h2>
      <p>Current version v1.0.5 · PREVIEW (development preview). Every framework × platform has its own download slot — shown as "in preparation" until real packages ship, all buildable from source today.</p>
    </div>
    <div class="sb-get-grid">
      <div class="sb-get-qr-card">
        <h3>GitHub source</h3>
        <p>Clone the repository to build any platform — every line shares the same product spec and BLE protocol core.</p>
        <span class="sb-get-hint"><a href="https://github.com/luoyaosheng/smart-ble" target="_blank" rel="noopener">github.com/luoyaosheng/smart-ble</a></span>
      </div>
      <div class="sb-get-qr-card">
        <h3>Download matrix</h3>
        <p>One slot per framework × platform: each becomes a real download entry (with SHA256) once its package ships; until then every slot reads "in preparation".</p>
        <span class="sb-get-hint">Reserved row by row in the table below</span>
      </div>
    </div>
    <div class="sb-dl-wrap"><table class="sb-dl-table">
      <thead>
        <tr><th>Version</th><th>Framework / tech</th><th>Download</th><th>Get it today</th></tr>
      </thead>
      <tbody>
        <tr><td>Android App</td><td>uni-app line</td><td><span class="sb-dl-wait">APK in preparation</span></td><td><a href="/tutorials/platforms/uniapp">Build from source (HBuilderX)</a></td></tr>
        <tr><td>Android native</td><td>Kotlin + Jetpack Compose</td><td><span class="sb-dl-wait">APK in preparation</span></td><td><a href="/tutorials/platforms/native_mobile">Build from source (gradlew)</a></td></tr>
        <tr><td>iOS</td><td>Swift Package + SwiftUI</td><td><span class="sb-dl-wait">TestFlight slot reserved</span></td><td><a href="/tutorials/platforms/native_mobile">Build from source (swift run)</a></td></tr>
        <tr><td>macOS native</td><td>SwiftUI (apps/ios)</td><td><span class="sb-dl-wait">Installer in preparation</span></td><td><a href="/tutorials/platforms/native_mobile">Build from source</a></td></tr>
        <tr><td>Windows desktop</td><td>Tauri (Rust + btleplug)</td><td><span class="sb-dl-wait">Installer in preparation</span></td><td><a href="/tutorials/platforms/desktop">Build from source (cargo tauri)</a></td></tr>
        <tr><td>Windows / Linux desktop</td><td>Electron (Node.js + noble)</td><td><span class="sb-dl-wait">Installer in preparation</span></td><td><a href="/tutorials/platforms/desktop">Build from source (npm start)</a></td></tr>
        <tr><td>macOS desktop native</td><td>Swift + AppKit</td><td><span class="sb-dl-wait">Installer in preparation</span></td><td><a href="/tutorials/platforms/desktop">Build from source</a></td></tr>
        <tr><td>Flutter</td><td>Flutter + Dart (Android / macOS)</td><td><span class="sb-dl-wait">Installer in preparation</span></td><td><a href="/tutorials/platforms/flutter">Build from source (flutter run)</a></td></tr>
        <tr><td>ESP32 firmware</td><td>PlatformIO / ESP-IDF</td><td><span class="sb-dl-wait">Firmware bundle in preparation</span></td><td><a href="/tutorials/hardware/01_Hardware_Philosophy">Firmware build guide</a></td></tr>
      </tbody>
    </table></div>
    <p class="sb-platform-footnote">Download slots are reserved per framework × platform: no entry becomes clickable before a real package exists (no fake downloads); releases ship with SHA256 and release notes. Source and status: <a href="https://github.com/luoyaosheng/smart-ble" target="_blank" rel="noopener">GitHub repository</a> and the <a href="/status/">status page</a> (Chinese).</p>
  </section>

  <section id="why" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Why</div>
      <h2>More than another debug tool</h2>
      <p>BLE tools are scattered, learning material is fragmented, and platform implementations are hard to compare — this open-source family answers all three at once.</p>
    </div>
    <div class="sb-feature-grid">
      <article class="sb-feature-card">
        <h3>A usable debug tool</h3>
        <p>Scan, connect, read/write, subscribe, broadcast and OTA in one workflow; every line runs from source.</p>
      </article>
      <article class="sb-feature-card">
        <h3>Multi-platform comparison samples</h3>
        <p>uni-app (Vue 3), Flutter, Kotlin, SwiftUI, AppKit, Tauri, Electron and Avalonia implement the same product spec — side-by-side comparison is the learning path.</p>
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
        <p>Phone broadcasting vs. ESP32, closed loop.</p>
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
        <p>Swift Package + SwiftUI + CoreBluetooth — native exploration sharing the SmartHidCore kernel.</p>
      </a>
      <a href="/tutorials/platforms/flutter" class="sb-platform-card">
        <span class="sb-platform-status">Cross-framework · Build from source</span>
        <h3>Flutter</h3>
        <p>Flutter + Dart mobile implementation, cross-checked against the uni-app and native lines.</p>
      </a>
      <a href="/tutorials/platforms/desktop" class="sb-platform-card">
        <span class="sb-platform-status">Desktop line · Build from source</span>
        <h3>Windows / macOS / Linux</h3>
        <p>Tauri (Rust + btleplug), Electron (Node.js + noble), macOS Native (AppKit) and Avalonia (.NET) routes side by side.</p>
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
        <p>PlatformIO / ESP-IDF reference firmware for hardware linkage and protocol demos; STM32 planned.</p>
      </a>
    </div>
    <p class="sb-platform-footnote">All implementations share one product spec and protocol core; no official artifacts are released yet — everything builds from source. Capability and release status: <a href="/status/">status page</a> and <a href="/product-contract/05_PLATFORM_MATRIX">platform matrix</a> (Chinese).</p>
  </section>

  <section id="prototype" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Interactive Prototype</div>
      <h2>One product, four platform form factors — clickable now</h2>
      <p>High-fidelity interactive prototypes on a shared base kernel with one override layer per platform: the full scan → connect → debug → provisioning flow, with normal, empty, failed, disconnected and unsupported states all switchable.</p>
    </div>
    <div class="sb-platform-grid">
      <a href="/prototype/wechat/high-fi/" class="sb-platform-card">
        <span class="sb-platform-status">Base platform · High-fi</span>
        <h3>WeChat Mini Program</h3>
        <p>Base kernel + wxhost override layer; switch between Android / iOS hosts and the devtools view.</p>
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
    <p class="sb-platform-footnote">Each platform also ships a <a href="/prototype/wechat/low-fi/">low-fi wireframe</a> (pages × states × flows) with PLATFORM_SPEC / PAGE_SPEC / FLOW / COMPONENT_RULE docs; the base kernel passed Playwright 26/26. Prototypes run on mock data — they are the product and interaction master, not a release status; desktop and web are prototype-first.</p>
  </section>

  <section id="profile" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Smart HID &amp; Profiles</div>
      <h2>First-party profiles with a contract lock</h2>
      <p>On top of generic BLE sits an extensible device profile system: remove any profile and it remains a complete generic BLE tool.</p>
    </div>
    <div class="sb-feature-grid">
      <a href="/smart-hid/README" class="sb-feature-card sb-feature-card--link">
        <h3>Smart HID first-party profile</h3>
        <p>Provisioning, diagnostics and history; recognized by generic scanning — BLE handles configuration and diagnostics only.</p>
        <p class="sb-feature-note">Preview</p>
      </a>
      <a href="https://github.com/LuoYaoSheng/Smart-HID-Workspace" target="_blank" rel="noopener" class="sb-feature-card sb-feature-card--link">
        <h3>Contract-locked to the firmware canon</h3>
        <p>Provisioning protocol and command schema are SHA-256 contract-locked with Smart-HID-Workspace (firmware / ControlHub / protocol canon).</p>
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
    <h3 class="sb-gallery-h3">Mobile · WeChat mini program and App form factors (prototype captures)</h3>
    <div class="sb-gallery-grid--duo">
      <figure>
        <img src="/gallery/proto-wechat.png" alt="WeChat mini program form factor: scan page with page/state navigator" loading="lazy">
        <figcaption>WeChat mini program form · scan page + state navigator (Android / iOS host switch)</figcaption>
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
    <p class="sb-platform-footnote">The three form-factor captures come from the <a href="/prototype/desktop/high-fi/">live interactive prototype</a> — one base kernel + a single override layer per platform; pages, states and host dimensions are all switchable online. Desktop installers: see the download matrix above.</p>
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
        <h3>Security</h3>
        <p>Disclosure channel pending (no SECURITY.md in the repo yet — no fake links).</p>
      </div>
    </div>
  </section>

</div>
