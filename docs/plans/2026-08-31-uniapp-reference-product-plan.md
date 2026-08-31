# UniApp Reference Product Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build one complete UniApp reference product, an ESP32 reproducible test fixture, a platform-aware HTML interaction prototype, and a truthful public landing page before synchronizing other clients.

**Architecture:** `docs/product-contract/` is the product SSOT. A single HTML prototype renders WeChat, Android, iOS, and H5 adaptations from shared prototype data; UniApp and ESP32 implementations are validated against stable feature/test IDs. Public capability claims are generated or reviewed against release evidence.

**Tech Stack:** UniApp Vue 3, Pinia, HBuilderX/UniAutomator, vanilla HTML/CSS/JS prototype, VitePress, ESP32 Arduino + NimBLE + PlatformIO, Node test runners.

---

## Phase 1：锁定产品契约和原型基线

### Task 1: Add a product-contract consistency gate

**Files:**
- Create: `scripts/check-product-contract.mjs`
- Create: `tests/unit/product-contract.test.mjs`
- Modify: `scripts/verify-uniapp.sh`
- Read: `docs/product-contract/*.md`, `apps/uniapp/pages.json`

**Step 1: Write the failing test**

测试应读取功能/页面文档并断言：PAGE-001~010 唯一、所有 `pages.json` 路由存在、功能编号不重复、README 链接目标存在。

**Step 2: Run it and verify failure**

Run: `node tests/unit/product-contract.test.mjs`

Expected: FAIL，因为检查脚本尚不存在。

**Step 3: Implement the checker**

脚本只读取文件，不修改文档；发现重复编号、坏链接、页面清单漂移时退出 1，并打印具体文件和编号。

**Step 4: Verify**

Run: `node tests/unit/product-contract.test.mjs && ./scripts/verify-uniapp.sh`

Expected: PASS，快速门禁数量增加一项。

**Step 5: Commit**

```bash
git add docs/product-contract scripts/check-product-contract.mjs tests/unit/product-contract.test.mjs scripts/verify-uniapp.sh
git commit -m "docs(contract): enforce UniApp product specification"
```

### Task 2: Create the platform-aware prototype shell

**Files:**
- Create: `docs/prototypes/uniapp-reference/index.html`
- Create: `docs/prototypes/uniapp-reference/prototype.css`
- Create: `docs/prototypes/uniapp-reference/prototype.js`
- Create: `docs/prototypes/uniapp-reference/prototype-data.js`
- Create: `docs/prototypes/uniapp-reference/README.md`
- Test: `tests/e2e/spec/uniapp-contract-prototype.spec.js`

**Step 1: Write failing browser assertions**

断言平台选择器有 4 项、页面选择器有 10 项、场景至少包含 normal/empty/loading/error/permission/disconnected/unsupported。

**Step 2: Run and verify failure**

Run: `cd tests/e2e && npx playwright test spec/uniapp-contract-prototype.spec.js`

Expected: FAIL，目标文件不存在。

**Step 3: Implement minimal shell**

页面只包含工具栏、手机画布、页面导航和状态面板。数据统一从 `prototype-data.js` 读取，禁止把平台判断散落到 DOM 字符串中。

**Step 4: Verify responsive shell**

Run: prototype E2E at mobile and desktop viewport.

Expected: 4 platform modes and 10 pages can switch without console error.

**Step 5: Commit**

```bash
git add docs/prototypes/uniapp-reference tests/e2e/spec/uniapp-contract-prototype.spec.js
git commit -m "feat(prototype): add UniApp contract shell"
```

### Task 3: Implement FLOW-001~010 in the prototype

**Files:**
- Modify: `docs/prototypes/uniapp-reference/prototype-data.js`
- Modify: `docs/prototypes/uniapp-reference/prototype.js`
- Modify: `docs/prototypes/uniapp-reference/prototype.css`
- Modify: `tests/e2e/spec/uniapp-contract-prototype.spec.js`

**Steps:**

1. 为每条 FLOW 写失败的导航/状态测试。
2. 逐条实现扫描、广播快照、连接/GATT、多设备、ESP32、广播、OTA、Smart HID、历史/诊断、关于/版本。
3. 每条流程至少实现正常和失败出口。
4. 为微信/Android 切换断言不同权限/能力文案；H5 断言不能进入 BLE 成功态。
5. 运行 E2E 并保存 10 页基线截图。
6. Commit: `feat(prototype): complete UniApp interaction flows`。

## Phase 2：把 ESP32 从示例升级为测试夹具

### Task 4: Remove machine-specific firmware configuration

**Files:**
- Modify: `hardware/esp32/LightBLE/platformio.ini`
- Modify: `hardware/esp32/LightBLE/README.md`
- Create: `hardware/esp32/LightBLE/platformio.local.example.ini`

**Steps:**

1. 添加静态测试，断言受跟踪的 `platformio.ini` 不包含 `COM3` 或固定串口。
2. 移除 `upload_port`/`monitor_port`，文档改用命令参数。
3. 在一台新电脑执行 `pio run`。
4. Commit: `fix(esp32): remove machine-specific serial ports`。

### Task 5: Lock firmware and TypeScript protocol constants

**Files:**
- Create: `scripts/check-esp32-contract.mjs`
- Create: `tests/unit/esp32-contract.test.mjs`
- Modify: `core/protocols/smart-ble-protocol.ts` only if mismatch is confirmed
- Modify: `hardware/esp32/LightBLE/src/main.cpp` only if mismatch is confirmed

**Steps:** write failing UUID/name/version comparison → implement parser/checker → run with product contract gate → commit `test(esp32): lock reference BLE contract`。

### Task 6: Add firmware unit tests and fault injection

**Files:**
- Create: `hardware/esp32/LightBLE/test/test_protocol/test_main.cpp`
- Create: `hardware/esp32/LightBLE/test/test_ota_state/test_main.cpp`
- Create: `hardware/esp32/LightBLE/include/test_modes.h`
- Modify: `hardware/esp32/LightBLE/src/main.cpp`
- Modify: `hardware/esp32/LightBLE/platformio.ini`

**Steps:**

1. 先测试 LED 命令、未知命令、状态 JSON、OTA size/commit/abort。
2. 抽出纯状态逻辑，使 native/on-target 测试均可运行。
3. 实现默认关闭的 delayed/disconnect/reject/notify-burst/OTA 故障模式。
4. 运行 `pio test` 和 `pio run`。
5. Commit: `test(esp32): add protocol and fault-injection fixture`。

## Phase 3：补齐 UniApp 契约缺口

### Task 7: Implement compatible device display names

**Files:**
- Create: `apps/uniapp/services/ble-runtime/device-name.js`
- Create: `tests/unit/device-name.test.mjs`
- Modify: `apps/uniapp/store/ble.js`
- Modify: `apps/uniapp/services/ble-runtime/device-collection.js`
- Modify: `apps/uniapp/components/device-card/device-card.vue`

**Steps:**

1. 为 name/localName/AD 0x09/0x08/Profile/厂商/ID 兜底写失败测试。
2. 测试空名称不能覆盖旧有效名称。
3. 实现纯函数并在扫描归一化阶段写入 `displayName/nameSource`。
4. 卡片、筛选、路由和日志统一消费显示名。
5. 运行单测、SFC、H5、微信页面回归。
6. Commit: `fix(uniapp): resolve compatible BLE device names`。

### Task 8: Close remaining page-contract gaps

**Files:**
- Modify only pages/services identified by a failing contract test
- Test: `apps/uniapp/pages/page-flow.test.js`, `tests/unit/uniapp-ui-contract.test.mjs`

**Steps:**

1. 将 PAGE-001~010 的必须状态转为数据驱动测试表。
2. 修正“连接稳定”等无证据文案、空态、失败态和返回状态。
3. 保持页面路由和 Profile 分层不变。
4. 运行 `./scripts/verify-uniapp.sh`、`./scripts/verify-uniapp-pages.sh`、H5 构建。
5. Commit: `fix(uniapp): align pages with product contract`。

## Phase 4：Android 真机优先验收

### Task 9: Prepare and execute Android TEST-A-001~014

**Files:**
- Create: `docs/verification/runs/<date>-<commit>/environment.md`
- Create: `docs/verification/runs/<date>-<commit>/android-results.md`
- Modify: code/tests only for confirmed FAIL cases

**Steps:**

1. Build/install the UniApp Android App with recorded HBuilderX/runtime versions.
2. Flash the recorded ESP32 firmware.
3. Execute TEST-A-001~014 in order; save screenshots, video, app logs, and serial logs.
4. For each FAIL, record the first breakpoint before changing code.
5. Add a failing automated test, make the minimal fix, rerun the affected hardware case and full gate.
6. Commit evidence separately from code fixes.

## Phase 5：微信真机验收

### Task 10: Execute WeChat TEST-W-001~010

**Files:**
- Create: `docs/verification/runs/<date>-<commit>/wechat-results.md`
- Modify: `docs/verification/uniapp-real-device-checklist.md` to link the run

**Steps:** stable base library → fresh permission states → ESP32 Core BLE → multi-device → Peripheral observer → Smart HID → sharing/links → save evidence → rerun all gates.

## Phase 6：公开落地页和发布

### Task 11: Rebuild the VitePress landing page from verified data

**Files:**
- Modify: `docs/index.md`
- Modify: `docs/.vitepress/config.mjs`
- Reuse: `docs/public/brand/*`
- Test: create `tests/e2e/spec/docs-landing.spec.js`

**Steps:**

1. Test Hero, platform status, ESP32, prototype, quick-start, evidence, and contribution links.
2. Implement sections from `10_LANDING_PAGE_SPEC.md` without copying internal audit content.
3. Link only Device-proved capabilities as complete.
4. Run `cd docs && npm run docs:build` and E2E link checks.
5. Capture mobile/desktop screenshots and perform visual QA.
6. Commit: `docs(site): publish verified Smart BLE landing page`。

### Task 12: Run release gates and publish evidence

**Files:**
- Create: `docs/verification/runs/<release>/release-summary.md`
- Modify: `README.md`, `docs/START_HERE.md`, release notes

**Steps:** check Gate 0~5 → verify artifact links → verify Android clean install → verify WeChat smoke → link ESP32 firmware → publish only after every blocker is cleared.

## Execution order

Do not parallelize product definition, prototype, firmware contract, and client implementation. Execute in this order:

```text
Tasks 1–3 → review prototype
Tasks 4–6 → freeze ESP32 fixture
Tasks 7–8 → align UniApp
Task 9 → Android real device
Task 10 → WeChat real device
Tasks 11–12 → landing page and release
```
