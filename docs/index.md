---
layout: home

hero:
  name: "Smart BLE"
  text: "1.0.5 · PREVIEW · UniApp、微信小程序与 ESP32 协同的 BLE 调试和验证工具"
  tagline: "状态：PREVIEW。当前产品版本 1.0.5。正式 APK、小程序码与固件尚未发布（NOT_RELEASED）。"
  image:
    src: /brand/icon.png
    alt: Smart BLE Brand Icon
  actions:
    - theme: brand
      text: 查看产品目标与测试规范
      link: /target-product/
    - theme: alt
      text: 快速开始
      link: /tutorials/01_introduction_and_setup
    - theme: alt
      text: 查看源码
      link: https://github.com/luoyaosheng/smart-ble
---

<script setup>
import release from './public/release/latest.json'

const version = release.app_version
const overall = release.overall_status
const surfaces = release.public_surfaces
const limitations = release.known_limitations || []

function badgeClass(status) {
  const key = String(status || 'NOT_RELEASED').toLowerCase().replace(/_/g, '-')
  return `smartble-platform-badge smartble-badge--${key}`
}

function surfaceStatus(surface) {
  if (!surface) return 'NOT_RELEASED'
  if (surface.role === 'REFERENCE') return 'REFERENCE'
  return surface.capability_status || surface.release_status || 'NOT_RELEASED'
}
</script>

<div class="smartble-home">
  <section class="smartble-status-band" aria-label="公开状态">
    <div class="smartble-version-hero">
      <strong>Smart BLE</strong>
      <span>{{ version }}</span>
      <div class="smartble-status-pill smartble-status-pill--preview">{{ overall }}</div>
    </div>
    <p>
      Smart BLE 当前处于预览阶段：主线是 <strong>UniApp Android</strong>、<strong>BLE Toolkit+ 微信小程序</strong>、
      <strong>LightBLE ESP32</strong> 与 <strong>Smart HID 第一方 Profile</strong>。
      正式产物尚未发布（<strong>NOT_RELEASED</strong>），请勿把本站当作可下载安装包的入口。
    </p>
    <p>
      <a href="/release/latest.json">查看 PREVIEW Release Metadata</a>
      （机器可读 JSON，不是下载产物）
    </p>
  </section>

  <section class="smartble-product-hero">
    <div class="smartble-product-copy">
      <div class="smartble-kicker">Product Story</div>
      <h2>面向真实主线的 BLE 调试与验证工具</h2>
      <p>
        Smart BLE 把扫描、连接、读写、订阅、手机 Peripheral 广播，以及 ESP32 / Smart HID 验证收进同一套产品语言。
        当前公开站点只描述已批准目标与诚实状态，不宣称全平台已交付。
      </p>
      <div class="smartble-copy-grid">
        <article>
          <h3>当前主线</h3>
          <p>UniApp Android · 微信小程序 · LightBLE ESP32 · Smart HID Profile</p>
        </article>
        <article>
          <h3>公开承诺</h3>
          <p>没有产物就不挂下载；没有 E5/E6 证据就不写 VERIFIED / RELEASED。</p>
        </article>
      </div>
    </div>
    <div class="smartble-product-visual">
      <img src="/brand/hero.png" alt="Smart BLE product hero">
    </div>
  </section>

  <section class="smartble-platform-matrix">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Current Mainline</div>
      <h2>正式工作面与参考实现</h2>
      <p>下列状态来自 PREVIEW Release Metadata（{{ version }}），不是发布门禁结论。</p>
    </div>
    <div class="smartble-platform-grid">
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.android))">{{ surfaceStatus(surfaces.android) }}</span>
        </div>
        <h3>{{ surfaces.android.name }}</h3>
        <p>当前客户端主线。正式 APK 与 SHA <strong>{{ surfaces.android.release_status }}</strong>。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaces.wechat.release_status)">{{ surfaces.wechat.release_status }}</span>
        </div>
        <h3>{{ surfaces.wechat.name }}</h3>
        <p>正式小程序码尚未发布。本站不提供体验码或可扫码入口冒充正式版。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.h5))">{{ surfaceStatus(surfaces.h5) }}</span>
        </div>
        <h3>{{ surfaces.h5.name }}</h3>
        <p>仅文档与页面降级展示。真实 BLE 在 H5 上为 UNSUPPORTED。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.ios))">{{ surfaceStatus(surfaces.ios) }}</span>
        </div>
        <h3>{{ surfaces.ios.name }}</h3>
        <p>目标能力存在规划，正式入口尚未发布。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span class="smartble-platform-badge smartble-badge--reference">REFERENCE</span>
        </div>
        <h3>{{ surfaces.flutter_tauri_native.name }}</h3>
        <p>历史与参考实现（角色 REFERENCE），不是当前正式工作台；对外发布状态 {{ surfaces.flutter_tauri_native.release_status }}。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.peripheral))">{{ surfaceStatus(surfaces.peripheral) }}</span>
        </div>
        <h3>{{ surfaces.peripheral.name }}</h3>
        <p>开发中 / PREVIEW。可复现固件、manifest 与 SHA 尚未发布。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.observer))">{{ surfaceStatus(surfaces.observer) }}</span>
        </div>
        <h3>{{ surfaces.observer.name }}</h3>
        <p>第一方 Observer 固件尚未实现与发布。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.ota))">{{ surfaceStatus(surfaces.ota) }}</span>
        </div>
        <h3>{{ surfaces.ota.name }}</h3>
        <p>{{ surfaces.ota.reason }}</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.smart_hid))">{{ surfaceStatus(surfaces.smart_hid) }}</span>
        </div>
        <h3>{{ surfaces.smart_hid.name }}</h3>
        <p>{{ surfaces.smart_hid.reason }}</p>
      </article>
    </div>
  </section>

  <section class="smartble-flow-lane">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Workflow</div>
      <h2>当前产品主线流程</h2>
      <p>状态按实现与证据诚实标注，不是全部完成。</p>
    </div>
    <div class="smartble-flow-grid">
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">01</span>
        <h3>扫描与广播解析</h3>
        <p><span class="smartble-inline-badge smartble-badge--preview">PREVIEW</span> 有实现路径；E5 尚未执行。</p>
      </article>
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">02</span>
        <h3>连接与服务发现</h3>
        <p><span class="smartble-inline-badge smartble-badge--preview">PREVIEW</span> 有实现；自动化仍有缺口。</p>
      </article>
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">03</span>
        <h3>Read / Write / Subscription</h3>
        <p><span class="smartble-inline-badge smartble-badge--preview">PREVIEW</span> 核心读写可用路径存在；完整目标接口未齐。</p>
      </article>
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">04</span>
        <h3>多设备与日志</h3>
        <p><span class="smartble-inline-badge smartble-badge--preview">PREVIEW</span> 脱敏与会话计数等目标能力仍有缺口。</p>
      </article>
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">05</span>
        <h3>手机 Peripheral 广播</h3>
        <p><span class="smartble-inline-badge smartble-badge--preview">PREVIEW</span> 页面与 Owner 编排仍需对齐；Observer 证据未就绪。</p>
      </article>
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">06</span>
        <h3>OTA</h3>
        <p><span class="smartble-inline-badge smartble-badge--blocked">BLOCKED</span> 客户端 CTRL 事务与固件未对齐，E5 未完成。</p>
      </article>
      <article class="smartble-flow-card">
        <span class="smartble-flow-index">07</span>
        <h3>ESP32 / Smart HID 验证</h3>
        <p><span class="smartble-inline-badge smartble-badge--preview">PREVIEW</span> Peripheral 开发中；Observer <strong>NOT_RELEASED</strong>；Smart HID 待 E5。</p>
      </article>
    </div>
  </section>

  <section id="download-hub" class="smartble-download-hub">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Artifacts</div>
      <h2>产物状态（当前均为 NOT_RELEASED）</h2>
      <p>没有真实 APK / 固件 / SHA 时，不提供可点击下载。下列卡片不可点击。artifacts = []。</p>
    </div>
    <div class="smartble-download-grid">
      <div class="smartble-download-card smartble-download-card--disabled" role="group" aria-disabled="true">
        <span class="smartble-platform-badge smartble-badge--not-released">NOT_RELEASED</span>
        <h3>Android APK</h3>
        <p>正式 UniApp Android 构建与 SHA 尚未发布。</p>
        <span class="smartble-download-cta smartble-download-cta--muted">暂无下载</span>
      </div>
      <div class="smartble-download-card smartble-download-card--disabled" role="group" aria-disabled="true">
        <span class="smartble-platform-badge smartble-badge--not-released">NOT_RELEASED</span>
        <h3>微信小程序</h3>
        <p>正式小程序码尚未发布。</p>
        <span class="smartble-download-cta smartble-download-cta--muted">暂无下载</span>
      </div>
      <div class="smartble-download-card smartble-download-card--disabled" role="group" aria-disabled="true">
        <span class="smartble-platform-badge smartble-badge--not-released">NOT_RELEASED</span>
        <h3>ESP32 Peripheral</h3>
        <p>可复现固件、manifest 与 SHA 尚未发布。</p>
        <span class="smartble-download-cta smartble-download-cta--muted">暂无下载</span>
      </div>
      <div class="smartble-download-card smartble-download-card--disabled" role="group" aria-disabled="true">
        <span class="smartble-platform-badge smartble-badge--not-released">NOT_RELEASED</span>
        <h3>ESP32 Observer</h3>
        <p>Observer 固件尚未实现和发布。</p>
        <span class="smartble-download-cta smartble-download-cta--muted">暂无下载</span>
      </div>
    </div>
  </section>

  <section class="smartble-limits">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Current Limits</div>
      <h2>当前限制和证据状态</h2>
      <p>以下限制来自 PREVIEW Release Metadata，不是最终验证报告。</p>
    </div>
    <ul class="smartble-limits-list">
      <li v-for="(item, idx) in limitations" :key="idx">{{ item }}。</li>
    </ul>
    <!-- METADATA-LIMITS-FALLBACK: 无 JS 时仍可读 -->
    <noscript>
      <ul>
        <li>Android 正式 APK 尚未发布。</li>
        <li>微信正式小程序码尚未发布。</li>
        <li>Playwright / Page Driver E4 尚未完成。</li>
        <li>Android、微信、ESP32 E5 尚未执行。</li>
        <li>OTA 当前 BLOCKED。</li>
        <li>ESP32 Observer 尚未完成。</li>
        <li>Smart HID 尚未完成端到端 E5。</li>
        <li>Release Pipeline 仍为历史 Flutter/Tauri 路线。</li>
      </ul>
    </noscript>
    <div class="smartble-learning-cards">
      <a href="/target-product/" class="smartble-learning-card">
        <h3>Target Product</h3>
        <p>已批准目标产品规范（应实现什么）。</p>
      </a>
      <a href="/target-tests/" class="smartble-learning-card">
        <h3>Target Tests</h3>
        <p>已批准目标测试体系（如何证明）。</p>
      </a>
      <a href="/gap-analysis/TARGET_VS_CURRENT_SUMMARY" class="smartble-learning-card">
        <h3>TP-G2-R1 Gap Summary</h3>
        <p>规划门禁差距摘要，不是 E5/E6 最终报告。</p>
      </a>
      <a href="/remediation/REMEDIATION_ORDER" class="smartble-learning-card">
        <h3>Remediation Order</h3>
        <p>批准中的修复拓扑序；逐 Task 执行。</p>
      </a>
    </div>
  </section>

  <section class="smartble-learning-grid">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Real Links</div>
      <h2>真实可用入口</h2>
      <p>源码、规范与贡献入口。不存在的安全披露文件不造假链接。</p>
    </div>
    <div class="smartble-learning-cards">
      <a href="https://github.com/luoyaosheng/smart-ble" class="smartble-learning-card" target="_blank" rel="noopener">
        <h3>GitHub 源码</h3>
        <p>仓库、Issue 与历史实现。</p>
      </a>
      <a href="https://github.com/luoyaosheng/smart-ble/issues" class="smartble-learning-card" target="_blank" rel="noopener">
        <h3>Issue</h3>
        <p>缺陷与需求跟踪。</p>
      </a>
      <a href="/tutorials/01_introduction_and_setup" class="smartble-learning-card">
        <h3>快速开始</h3>
        <p>从文档跑通扫描与连接概念路径。</p>
      </a>
      <a href="/CONTRIBUTING_GUIDE" class="smartble-learning-card">
        <h3>贡献指南</h3>
        <p>如何参与文档与实现改进。</p>
      </a>
      <a href="https://github.com/luoyaosheng/smart-ble/blob/main/LICENSE" class="smartble-learning-card" target="_blank" rel="noopener">
        <h3>MIT License</h3>
        <p>开源许可。</p>
      </a>
      <div class="smartble-learning-card smartble-learning-card--static" role="note">
        <h3>Security</h3>
        <p>安全披露入口待补充（仓库尚无 SECURITY.md，不提供假链接）。</p>
      </div>
    </div>
  </section>
</div>
