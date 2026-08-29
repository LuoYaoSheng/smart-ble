# UniApp Product Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce an evidence-backed, read-only audit of the SmartBLE UniApp client, covering pages, flows, execution chains, and maintainability.

**Architecture:** Treat `apps/uniapp` as the audit boundary and trace user actions from Vue pages and components through composables, Pinia stores, services, platform APIs, and shared protocol modules. Keep findings separated into code-established facts, runtime verification results, and unavailable-device limitations.

**Tech Stack:** UniApp, Vue 3, Pinia, WeChat Mini Program APIs, App-Plus APIs, BLE native plugin.

---

### Task 1: Establish the audit inventory

**Files:**
- Read: `apps/uniapp/pages.json`, `apps/uniapp/manifest.json`, `apps/uniapp/App.vue`, `apps/uniapp/main.js`
- Create: `docs/product-audit/00_审计总览.md`, `docs/product-audit/01_页面总表.md`, `docs/product-audit/02_页面跳转关系.md`

**Step 1:** Enumerate registered pages, Tab routes, page files, components, stores, composables, services, and platform APIs.

**Step 2:** Compare registrations and source paths; record entry points, orphan candidates, and runtime constraints.

**Step 3:** Write the execution pre-analysis and route graph with cited source locations.

### Task 2: Trace product behavior page by page

**Files:**
- Read: `apps/uniapp/pages/**/*.vue`, `apps/uniapp/components/**/*.vue`, `apps/uniapp/composables/**/*.js`
- Create: `docs/product-audit/05_页面逐页审计/P001_*.md` through `P009_*.md`

**Step 1:** Reconstruct each screen's purpose, information architecture, state model, actions, and lifecycle.

**Step 2:** Follow each material action to its first known breakpoint, including later potential breakpoints.

**Step 3:** Record product, UX, accessibility, completeness, and reuse findings with evidence limits stated explicitly.

### Task 3: Audit business and runtime chains

**Files:**
- Read: `apps/uniapp/store/**/*.js`, `apps/uniapp/services/**/*.js`, `apps/uniapp/utils/**/*.js`, `core/protocols/**/*.ts`
- Create: `docs/product-audit/03_业务功能矩阵.md`, `docs/product-audit/04_核心用户流程.md`, `docs/product-audit/07_运行链路断点清单.md`, `docs/product-audit/08_假完成清单.md`

**Step 1:** Map scan, generic BLE detail, Smart HID provisioning, connected sessions, broadcast, OTA, and about flows.

**Step 2:** Verify locally runnable static checks and scoped tests; do not claim physical BLE or Mini Program behavior without a current device-capable run.

**Step 3:** Distinguish confirmed defects from device/runtime verification gaps.

### Task 4: Audit architecture, repetition, and product quality

**Files:**
- Read: `apps/uniapp/styles/**/*.css`, `apps/uniapp/config/**/*.js`, shared component and service sources
- Create: `docs/product-audit/06_功能遗漏清单.md`, `09_页面设计问题.md`, `10_异常状态遗漏.md`, `11_重复实现清单.md`, `12_建议公共组件清单.md`, `13_建议公共能力清单.md`, `14_架构问题清单.md`, `15_UI与交互规范漂移.md`

**Step 1:** Identify duplicate responsibilities and unused/reimplemented public capabilities.

**Step 2:** Evaluate state ownership, permissions, error handling, platform differences, and visual/interaction consistency.

**Step 3:** Rank findings P0-P5 and include risks plus a practical remediation direction.

### Task 5: Finalize and verify deliverables

**Files:**
- Create: `docs/product-audit/16_修复与重构路线图.md`
- Verify: all `docs/product-audit/**/*.md`

**Step 1:** Cross-check page IDs, route names, finding IDs, severity classifications, and source references.

**Step 2:** Run the available UniApp static validation/test commands and record exact results.

**Step 3:** Confirm the full document set exists and does not alter application source.
