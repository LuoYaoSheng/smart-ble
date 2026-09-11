---
layout: home

hero:
  name: "BLE Toolkit+"
  text: "One toolkit to debug and verify every BLE device"
  tagline: "Scan, connect, read, write, subscribe, broadcast — and verify on real ESP32 hardware, all in one workflow."
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
      <p>The WeChat mini program is the fastest way to get started — scan and use. Other platforms offer build-from-source paths; direct downloads will appear here once installers and firmware are released.</p>
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
    <div class="smartble-section-head">
      <div class="sb-kicker">Platforms</div>
      <h2>Three mainlines, one family</h2>
    </div>
    <div class="sb-platform-grid">
      <article class="sb-platform-card">
        <span class="sb-platform-status">Tool entry · Preview</span>
        <h3>WeChat Mini Program</h3>
        <p>Lightweight scan-to-use entry covering scan, connect and debug paths.</p>
      </article>
      <article class="sb-platform-card">
        <span class="sb-platform-status">Client mainline · Preview</span>
        <h3>BLE Toolkit+ for Android</h3>
        <p>Android client built from the UniApp project, carrying the full feature catalog.</p>
      </article>
      <article class="sb-platform-card">
        <span class="sb-platform-status">Firmware verification · In development</span>
        <h3>BLE Toolkit+ ESP32 Firmware</h3>
        <p>Reference firmware acting as the real-device counterpart for broadcast and OTA.</p>
      </article>
    </div>
    <p class="sb-platform-footnote">Flutter / Tauri builds remain historical reference implementations — full details on the <a href="/status/">status page (Chinese)</a>.</p>
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
