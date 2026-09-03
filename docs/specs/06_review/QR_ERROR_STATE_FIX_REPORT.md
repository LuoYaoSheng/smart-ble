# F020 扫码失败三分类覆盖修复报告（审计 P1-1 · M-2）

> 第 14 份评审文件 · 2026-09-03 · 修复轮（对应审计 [PAGE_CAPABILITY_COVERAGE_AUDIT.md](PAGE_CAPABILITY_COVERAGE_AUDIT.md) §7 修复项 M-2 / P1-1）
> 基准：[PAGE_SPEC §2](../03_flow/PAGE_SPEC.md)（按钮表「扫描 ControlHub 配对码」行 + 异常处理权限/用户取消两行）· [PRD F020 / R16](../02_product/PRD.md) · [09_test/COVERAGE_CHECKLIST.md](../09_test/COVERAGE_CHECKLIST.md) F020 行（v0-old 四分支口径）
> 实现：`prototype/v1-new/`（app.js + pages/p002-provision.js，内核四实例字节同步）+ `platform/desktop/high-fi/desktop.js`（覆写层）· git 基线 `2b25725`（未提交，沿用暂缓提交约定）

## 0. 结论先行

| 任务要求 | 结果 |
|---|---|
| 扫码状态 idle / scanning / success / error | ✅ `qrState` 四值状态机（p002 defaults 新增字段，每次转移实测断言） |
| 错误三分类 cancel / permission / invalid + 对应展示 | ✅ `qrErr={reason}` 激活原死字段；三分类内联展示块 + 重新扫码/去设置 |
| 1 不新增页面 | ✅ 模拟扫码面板为 P002 覆盖层（sheet 复用既有 .sheet 结构），零新页面 |
| 2 不修改扫码成功流程 | ✅ 成功语义逐字保留（token 生成式/hub 回填/toast 文案/badge/标题切换） |
| 3 不修改配网流程 | ✅ connect→configure→status 三阶段与 8 错误码恢复路由零改动（T5 实测回归） |
| 4 不新增产品能力 | ✅ 三分类为 F020 在册行为的补齐（PRD F020 原文「取消/权限/失败分类提示」） |
| 四实例内核同步 | ✅ app.js MD5 `6a687a0c688a4a37a2aa67e6fdccd94e` ×4 · p002-provision.js `bbaaf050d0d409050d082f11af466520` ×4 |
| Playwright 真实点击四结果 | ✅ 32/32（成功/取消/权限/无效 + X 关闭语义 + 恢复回路 + 配网回归 + 三壳抽查），复跑稳定 |

**审计 P1-1 关闭**：至此页面能力覆盖审计的 P0-1（P005）、P1-1（F020）、P1-2（P006）三座问题全部修复完毕，**审计阻塞项清零**。

## 1. 问题机理（审计 P1-1 复述）

- `prototype/v1-new/pages/p002-provision.js:8` 定义 `qrErr:null` 后**全仓无任何赋值/渲染**（死状态字段）；`app.js` `p002-qr` 动作恒成功（直接生成 token + 回填 hub + toast）。
- 违反 [PAGE_SPEC.md §2](../03_flow/PAGE_SPEC.md) 按钮表「扫描 ControlHub 配对码」行——「失败按**取消/权限/失败**分类提示」；异常处理两行——「*权限状态*：扫码权限拒绝→分类提示可重扫」「*用户取消*：扫码取消（分类提示，不算错误）」；[PRD F020](../02_product/PRD.md)「取消/权限/失败分类提示」（P0 级）；R16「扫非 shid://pair 或缺参内容时给出失败分类提示，可重扫」。
- 根因：v0-old 曾以模拟扫码弹窗演示四分支（[09_test/COVERAGE_CHECKLIST.md](../09_test/COVERAGE_CHECKLIST.md) F020 行在册），v1-new 重构时仅迁移了成功路径。

## 2. 修复方案

### 2.1 状态机（任务书口径 → 实现）

| 任务书状态 | 实现 | 载体 |
|---|---|---|
| idle | `qrState:'idle'`（defaults 初始） | 扫码卡标题「扫描 ControlHub 配对码」+ badge 必需 |
| scanning | `qrState:'scanning'` | **模拟扫码面板**（取景框示意 + 正在扫描… + 四结果按钮） |
| success | `qrState:'success'` + token | 卡片变「重新扫描配对码」+ badge 已获取（既有渲染零改动） |
| error | `qrState:'error'` + `qrErr={reason}` | 三分类内联展示块（§2.3） |

转移：`idle/success →（点扫码卡）scanning → success ｜ error(reason)`；`error →（重新扫码）scanning`（恢复回路）；`p002-repairing`（配网失败恢复「重新扫描配对码」）复位 `qrState='idle' / qrErr=null`（token 清空处状态同步，一行状态卫生）。

### 2.2 模拟扫码面板（app.js 新增 `qrScanSheet()` + 7 个动作）

- **形态**：复用既有 `.sheet` 覆盖层结构（与 p001-advdlg 同型）；面板内 = 演示说明（真机为系统扫码界面 uni.scanCode）+ 取景框示意（`shid://pair · ControlHub 屏显二维码`）+ 四结果按钮（识别成功（演示）primary / 用户取消 / 权限拒绝 / 二维码无效）。**零新增 CSS**（取景框为内联 dashed border）。
- **关闭即取消**：面板 X/遮罩使用专属 `p002-qrclose` 动作 → `qrFail('cancel')`（真机退出相机同义；PAGE_SPEC「扫码取消·不算错误」）。不复用全局 `sheet-close`，避免 scanning 态遗留。
- **动作清单**：`p002-qr`（重写：置 scanning + 开面板）、`p002-qr-ok` / `-cancel` / `-perm` / `-invalid`（四结果）、`p002-qrclose`、`p002-qrsetting`（去设置·演示 toast）。模块函数 `qrFail(reason)` 统一收口三失败分支。

### 2.3 三分类展示（p002-provision.js，configure 阶段扫码卡之后）

| reason | 展示标题 | 说明文案要点 | 动作 |
|---|---|---|---|
| cancel | 扫码取消（warn） | 用户取消·**不算错误**·已填配置不受影响 | 重新扫码（primary·block） |
| permission | 权限拒绝（err） | 系统设置中允许相机权限后重试 | **去设置** + 重新扫码 |
| invalid | 二维码无效（err） | 非 shid://pair 或缺参·对准 ControlHub 屏显二维码重试（R16 口径） | 重新扫码（primary·block） |

复用 `C.op`（标题+说明）+ `C.btn`；去设置仅权限类出现（T4-3 断言）。**qrErr 死字段就地激活，无新字段族**。

### 2.4 desktop 覆写层协同（防内核被遮蔽）

desktop.js:112 完全覆写 `p002-qr`（自有取景器 sheet + 粘贴兜底）——若不动它，三分类在桌面壳不可达（正是本审计批评的缺口类型）。处置：其 sheet 挂**内核三分类按钮**（data-act 直连内核 ACTIONS，零逻辑重复）；`dtkOk` / `dtk-parse` 补 `qrState='success'/qrErr=null` 一致性。取景器、1.6s 自动识别成功、粘贴兜底全部保留（D 组实测）。wechat/app 壳无扫码覆写（grep 证实），直接获得内核行为。

## 3. 变更明细与同步

| 文件 | 变更 | 校验 |
|---|---|---|
| `v1-new/app.js` | +`扫码面板（PAGE005→PAGE002·F020）` 段（qrScanSheet/qrFail）+ `p002-qr` 重写 + 6 新动作 + `p002-repairing` 复位行 | `node --check` OK · MD5 `6a687a0c…` ×4 |
| `v1-new/pages/p002-provision.js` | defaults +`qrState:'idle'`；configure 段 +三分类展示块 | `node --check` OK · MD5 `bbaaf050…` ×4 |
| `platform/{wechat,app,desktop}/high-fi/` app.js + pages/p002-provision.js | 内核字节重同步 | 同 MD5 ✓ |
| `platform/desktop/high-fi/desktop.js` | 覆写层三分类按钮 + dtkOk/dtk-parse 状态一致性（**平台层文件，不参与内核 MD5**） | `node --check` OK |
| index.html ×4 | v1-new `?v=1.1.7`（15 处）· 三壳 `?v=1.4.6`（各 17 处） | 旧戳残留 0 |
| README ×2 | v1-new v1.0.7 修订条目 + platform 走查须知（M-2 轮） | — |
| web 壳 | **不动**（W5 配网不可达指引页，无扫码流程） | — |

未改动：成功路径渲染（bigact 卡/badge/标题切换）、配网三阶段与 8 错误码恢复、其余 8 页、components/mock/CSS、SCEN 场景库（三分类由页面内面板承载，无需加场景按钮，场景总数不变）。

## 4. 验证（Playwright 真实点击，32/32，复跑两遍稳定）

| 组 | 覆盖 | 结果 |
|---|---|---|
| T1 成功扫码（任务四-1） | idle 初始态/必需 badge/下发禁用 → 点卡开面板（scanning·正在扫描·shid://pair）→ 四按钮在位 → 识别成功 → success（token 前缀/hub 回填/重新扫描+已获取/面板关闭/无错误块） | 8/8 ✅ |
| T2 用户取消（任务四-2） | 取消 → error/cancel + 扫码取消·不算错误·重新扫码；token 未污染；重新扫码重开面板（恢复） | 4/4 ✅ |
| T2b 关闭即取消 | 面板 X → cancel 分类（真机退出相机同义） | 1/1 ✅ |
| T3 权限拒绝（任务四-3） | error/permission + 权限拒绝·系统设置提示 + 去设置/重新扫码双按钮；去设置可点无异常 | 3/3 ✅ |
| T4 二维码无效（任务四-4） | error/invalid + 二维码无效·shid://pair 口径；无去设置按钮（仅权限类）；**error→success 恢复回路** | 4/4 ✅ |
| T5 配网流程回归（约束 3 实证） | 真实填写 SSID → 下发配置就绪 → status 阶段四行进度 + 取消等待在场 | 3/3 ✅ |
| T6 v1-new 清洁 | 全程 0 PAGEERROR · 0 console error | 2/2 ✅ |
| W/A/D 三壳抽查 | 微信壳 cancel→success 全回路；App 壳 permission+去设置；Desktop 自有取景器 sheet 保留 + 无效分支走内核展示块 + 1.6s 自动识别成功既有行为保留 | 7/7 ✅ |

测试脚本修正记录（非产品缺陷）：首轮 T2-2 失败 + strict violation 系选择器 `button:has-text("重新扫码")` 误中评审栏场景按钮「错误 pairing_expired → 重新扫码」，改 `button[data-act="p002-qr"]`（错误块按钮为 button、扫码卡为 div，天然唯一）后 32/32，**产品代码零返工**。

## 5. 约束符合性

| 禁止项 | 遵守情况 |
|---|---|
| 不新增页面 | ✅ 面板 = P002 覆盖层（既有 .sheet 体系）；PAGES 注册表零变化 |
| 不修改扫码成功流程 | ✅ 成功语义五要素逐字保留：token 生成式 `tok-3f9a7c1e+rand`、hub 缺省回填 `192.168.1.8:17892`、toast「配对码已解析 · 地址与令牌已回填」、badge 必需→已获取、标题→重新扫描配对码（T1-5/6 断言） |
| 不修改配网流程 | ✅ 三阶段/8 错误码/恢复路由/U-01 离开确认零改动；T5 真实走 表单→下发→status 回归 |
| 不新增产品能力 | ✅ 实现的正是 PAGE_SPEC §2 + PRD F020 在册的「取消/权限/失败分类提示」；错误文案要点全部取自正典（不算错误/系统设置/shid://pair 缺参） |

## 6. 遗留与建议

1. **审计三阻塞项（P0-1/P1-1/P1-2）全部关闭**——页面能力覆盖审计的「开发前必须修复项」清单完结，D1 开发无已知阻塞。
2. **09_test 固化建议**（审计 M-4 存量 + 本轮扩充）：F020 四结果 + P005 两路径/错误回路 + P006 三路径会话断言纳入常驻冒烟；断言必须点真实按钮（三座问题均因场景库直接置态绕过动作层而存活多轮）。
3. 审计 P2×7 维持待放行（多为 mock/字段级，可并行小批量）。
4. git 提交/推送继续按约定暂缓；全部变更未提交（工作区可 `git diff` 复核）。
