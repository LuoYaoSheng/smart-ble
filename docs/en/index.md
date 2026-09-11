---
layout: home

hero:
  name: "BLE Toolkit+"
  text: "One toolkit to debug and verify every BLE device"
  tagline: "An open-source, multi-platform, multi-framework BLE toolkit family — WeChat mini program, Android, iOS / macOS native, desktop and ESP32 firmware in one debugging workflow."
  image:
    src: /brand/hero-duo.webp
    alt: BLE Toolkit+ app screenshots (Android preview, captured from device)
  actions:
    - theme: brand
      text: Use via WeChat Mini Program
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
      <p>The WeChat mini program is the fastest way to get started — scan and use. Android, iOS / macOS, desktop and Flutter all build from source today; direct downloads appear here once installers and firmware are released.</p>
    </div>
    <div class="sb-get-grid">
      <div class="sb-get-qr-card">
        <img class="sb-qr-img" src="/qr/wechat-miniprogram.jpg" width="172" height="172"
             alt="BLE Toolkit+ WeChat mini program QR code">
        <h3>WeChat Mini Program</h3>
        <p>Scan the mini program code with WeChat to use it — no install needed.</p>
        <span class="sb-get-hint">Scan the code above with WeChat</span>
      </div>
      <a href="/tutorials/platforms/uniapp" class="sb-get-card">
        <span class="sb-get-tag">Android</span>
        <h3>BLE Toolkit+ for Android</h3>
        <p>Installer in preparation. You can build it yourself from source with HBuilderX today.</p>
        <span class="sb-get-cta">Build tutorial (Chinese) →</span>
      </a>
      <a href="/tutorials/hardware/01_Hardware_Philosophy" class="sb-get-card">
        <span class="sb-get-tag">ESP32</span>
        <h3>BLE Toolkit+ ESP32 Firmware</h3>
        <p>Companion peripheral firmware source and build guide, as the real-device counterpart.</p>
        <span class="sb-get-cta">Firmware guide (Chinese) →</span>
      </a>
      <a href="https://github.com/luoyaosheng/smart-ble" target="_blank" rel="noopener" class="sb-get-card">
        <span class="sb-get-tag">Source</span>
        <h3>GitHub Source</h3>
        <p>MIT licensed. Clone the repo to build, develop and report issues.</p>
        <span class="sb-get-cta">Open repository →</span>
      </a>
    </div>
  </section>

  <section id="features" class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Features</div>
      <h2>Built for real debugging scenarios</h2>
      <p>From discovering devices to verifying firmware, every step lives in one workflow with one product language.</p>
    </div>
    <div class="sb-feature-grid">
      <article class="sb-feature-card">
        <h3>Scan &amp; Broadcast Parsing</h3>
        <p>Scan nearby BLE devices in real time, parse advertising packets and RSSI to lock onto targets.</p>
        <p class="sb-feature-note">Preview</p>
      </article>
      <article class="sb-feature-card">
        <h3>Connect &amp; Discovery</h3>
        <p>Enumerate services and characteristics automatically after connecting, layer by layer.</p>
        <p class="sb-feature-note">Preview</p>
      </article>
      <article class="sb-feature-card">
        <h3>Read / Write / Notify</h3>
        <p>One consistent interaction language for reading, writing and subscribing — byte-level visibility.</p>
        <p class="sb-feature-note">Preview</p>
      </article>
      <article class="sb-feature-card">
        <h3>Multi-device &amp; Logs</h3>
        <p>Parallel connections with session logs, so you can trace issues back to the evidence.</p>
        <p class="sb-feature-note">In development</p>
      </article>
      <article class="sb-feature-card">
        <h3>Phone as Peripheral</h3>
        <p>Turn your phone into a broadcasting peripheral for symmetric verification with ESP32.</p>
        <p class="sb-feature-note">In development</p>
      </article>
      <article class="sb-feature-card">
        <h3>OTA &amp; Firmware Verification</h3>
        <p>Firmware upgrade chain and hardware-in-the-loop verification extend the loop to the device side.</p>
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
      <p>Every implementation shares one product spec and BLE protocol core, adapted per platform — from the WeChat mini program to desktop and ESP32 firmware.</p>
    </div>
    <div class="sb-platform-grid">
      <a href="/tutorials/platforms/uniapp" class="sb-platform-card">
        <span class="sb-platform-status">Scan &amp; use · Preview</span>
        <h3>WeChat Mini Program</h3>
        <p>Built from the UniApp (Vue) line — an install-free lightweight entry covering scan, connect and debug.</p>
      </a>
      <a href="/tutorials/platforms/uniapp" class="sb-platform-card">
        <span class="sb-platform-status">Client mainline · Preview</span>
        <h3>Android</h3>
        <p>Both the UniApp line and a native Kotlin implementation, carrying the full feature catalog.</p>
      </a>
      <a href="/tutorials/platforms/native_mobile" class="sb-platform-card">
        <span class="sb-platform-status">Native line · Build from source</span>
        <h3>iOS / macOS</h3>
        <p>SwiftUI + CoreBluetooth native implementation, with iOS and macOS sharing the SmartHidCore kernel.</p>
      </a>
      <a href="/tutorials/platforms/flutter" class="sb-platform-card">
        <span class="sb-platform-status">Cross-framework · Build from source</span>
        <h3>Flutter</h3>
        <p>Android / macOS implementation, cross-checked against the UniApp and native lines.</p>
      </a>
      <a href="/tutorials/platforms/desktop" class="sb-platform-card">
        <span class="sb-platform-status">Desktop line · Build from source</span>
        <h3>Windows / macOS / Linux</h3>
        <p>Tauri, Electron and macOS Native — multiple desktop tech routes side by side.</p>
      </a>
      <a href="/tutorials/platforms/uniapp" class="sb-platform-card">
        <span class="sb-platform-status">Degraded · No real BLE</span>
        <h3>H5</h3>
        <p>Product preview and docs experience; real BLE is explicitly marked unsupported on H5.</p>
      </a>
      <a href="https://github.com/luoyaosheng/smart-ble" target="_blank" rel="noopener" class="sb-platform-card">
        <span class="sb-platform-status">Prototype · Interactive</span>
        <h3>Web</h3>
        <p>This site plus an HTML interactive prototype with per-platform views of normal, empty, failed and unsupported states.</p>
      </a>
      <a href="/tutorials/hardware/01_Hardware_Philosophy" class="sb-platform-card">
        <span class="sb-platform-status">Hardware fixture · In development</span>
        <h3>ESP32 Firmware</h3>
        <p>Peripheral / Observer reference firmware built with ESP-IDF — the real-device counterpart for broadcast and OTA.</p>
      </a>
    </div>
    <p class="sb-platform-footnote">All implementations share one product spec and protocol core; no official artifacts are released yet — the mini program is scannable today, everything else builds from source. Capability and release status: <a href="/status/">status page</a> and <a href="/product-contract/05_PLATFORM_MATRIX">platform matrix</a> (Chinese).</p>
  </section>

  <section class="sb-section">
    <div class="sb-section-head">
      <div class="sb-kicker">Gallery</div>
      <h2>Interface gallery</h2>
      <p>Screenshots captured from the Android preview build.</p>
    </div>
    <div class="sb-gallery-grid">
      <figure>
        <img src="/gallery/scan.webp" alt="Scan page: nearby BLE device list" loading="lazy">
        <figcaption>Scan</figcaption>
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
