---
title: 项目状态与路线图
description: BLE Toolkit+（smart-ble）平台矩阵、流程状态、产物计划、已知限制与证据元数据——面向协作者与审核者的全量工程状态。
---

# 项目状态与路线图

<script setup>
import release from '../public/release/latest.json'

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
      <strong>BLE Toolkit+</strong>
      <span>{{ version }}</span>
      <div class="smartble-status-pill smartble-status-pill--preview">{{ overall }}</div>
    </div>
    <p>
      BLE Toolkit+ 是多平台多框架的 BLE 工具家族：首个正式发布目标（主线）是 <strong>UniApp Android</strong>、
      <strong>Apple 原生 iOS</strong>、<strong>ESP32 固件</strong> 与
      <strong>Smart HID 第一方 Profile</strong>；Android 原生（Kotlin）、Apple 原生（iOS / macOS）、Flutter
      与桌面多框架为并行在研实现线，均可从源码构建。
      正式产物尚未发布（<strong>NOT_RELEASED</strong>）。
    </p>
    <p>
      <a href="/release/latest.json">查看 PREVIEW Release Metadata</a>
      （机器可读 JSON，不是下载产物）
    </p>
  </section>

  <section class="smartble-platform-matrix">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Current Mainline</div>
      <h2>正式工作面与在研实现线</h2>
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
        <p>SwiftUI + CoreBluetooth，iOS 与 macOS 共享 SmartHidCore 内核；真机签名 E5 尚未完成。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.android_native))">{{ surfaceStatus(surfaces.android_native) }}</span>
        </div>
        <h3>{{ surfaces.android_native.name }}</h3>
        <p>原生 Kotlin 实现线，承载产品级体验与原生能力验证；源码可构建，正式产物未发布。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.flutter))">{{ surfaceStatus(surfaces.flutter) }}</span>
        </div>
        <h3>{{ surfaces.flutter.name }}</h3>
        <p>跨框架对照实现线，与 UniApp 线、原生线互为对照；源码可构建，正式产物未发布。</p>
      </article>
      <article class="smartble-platform-card">
        <div class="smartble-platform-top">
          <span :class="badgeClass(surfaceStatus(surfaces.desktop))">{{ surfaceStatus(surfaces.desktop) }}</span>
        </div>
        <h3>{{ surfaces.desktop.name }}</h3>
        <p>Windows / macOS / Linux 多技术路线桌面实现区；源码可构建，正式产物未发布。</p>
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
      <h2>产物与发布计划</h2>
      <p>没有真实 APK / 固件 / SHA 时，不提供可点击下载（当前 artifacts = []）。</p>
    </div>
    <table>
      <thead>
        <tr><th>产物</th><th>计划形态</th><th>当前状态</th><th>发布条件</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>Android APK</td>
          <td>UniApp Android 正式构建</td>
          <td><span class="smartble-platform-badge smartble-badge--not-released">NOT_RELEASED</span></td>
          <td>正式构建 + SHA + Release Pipeline 切换到 UniApp 路线</td>
        </tr>
        <tr>
          <td>ESP32 Peripheral 固件</td>
          <td>可复现固件包 + manifest</td>
          <td><span class="smartble-platform-badge smartble-badge--not-released">NOT_RELEASED</span></td>
          <td>固件产物 + manifest + SHA</td>
        </tr>
        <tr>
          <td>ESP32 Observer 固件</td>
          <td>第一方 Observer 实现</td>
          <td><span class="smartble-platform-badge smartble-badge--not-released">NOT_RELEASED</span></td>
          <td>Observer 实现完成 + 产物 + SHA</td>
        </tr>
      </tbody>
    </table>
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
        <li>Playwright / Page Driver E4 尚未完成。</li>
        <li>Android、ESP32 E5 尚未执行。</li>
        <li>Apple 原生（iOS / macOS）真机签名与 E5 验证尚未完成。</li>
        <li>Android 原生（Kotlin）、Flutter、桌面多框架实现线均可源码构建，正式产物均未发布。</li>
        <li>OTA 当前 BLOCKED。</li>
        <li>ESP32 Observer 尚未完成。</li>
        <li>Smart HID 尚未完成端到端 E5。</li>
        <li>Release Pipeline 仍为历史 Flutter/Tauri 路线，UniApp 正式产物管线未切换。</li>
      </ul>
    </noscript>
  </section>

  <section class="smartble-learning-grid">
    <div class="smartble-section-head">
      <div class="smartble-kicker">Evidence & Metadata</div>
      <h2>证据与元数据</h2>
      <p>面向协作者与审核者的内部入口（本页允许内部术语）。</p>
    </div>
    <div class="smartble-learning-cards">
      <a href="/release/latest.json" class="smartble-learning-card" target="_blank" rel="noopener">
        <h3>Release Metadata</h3>
        <p>PREVIEW 机器可读状态 JSON。</p>
      </a>
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

</div>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--c-card);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  overflow: hidden;
}

th, td {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--c-line-soft);
  font-size: var(--fs-body);
  text-align: left;
  vertical-align: top;
}

th {
  background: var(--c-fill);
  font-weight: var(--fw-bold);
  color: var(--c-sub);
}

tbody tr:last-child td {
  border-bottom: none;
}
</style>
