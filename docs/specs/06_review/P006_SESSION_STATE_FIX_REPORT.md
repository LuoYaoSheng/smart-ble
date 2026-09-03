# P006 连接状态一致性修复报告（P006_SESSION_STATE_FIX_REPORT）

> 版本：1.0 · 修复日期：2026-09-03 · **第 13 份评审文件**
> 任务来源：用户下发「修复 Smart BLE P006 连接状态一致性问题」；对应页面能力覆盖审计 **P1-2 / M-3**（[PAGE_CAPABILITY_COVERAGE_AUDIT.md](PAGE_CAPABILITY_COVERAGE_AUDIT.md) §7/§8）。
> 修复对象：docs/specs/prototype/v1-new（内核）+ wechat/app/desktop 三壳字节同步。
> 约束：不改页面流程、不新增状态、三进入路径（P001 / P003 / P007 Profile 链）均读取统一 session 状态。

## 0. 结论先行

**✅ 修复完成：Playwright 26/26 全过（一次修正测试前提后通过，见 §5），console 0 新错误；内核四方 MD5 唯一 `1a19861b87ef0bd858f0b8ffe006cc29`；戳 v1-new `?v=1.1.5`、三壳 `?v=1.4.4`、web `?v=1.4.1` 不动。**

| 要求 | 结果 |
|---|---|
| 1. P001 进入 P006 读统一 session | ✅ 注册表设备（LightBLE/SHID）→ 立即「已连接」·连接复用；非注册表设备（EF:6B）→「连接中」→「已连接」 |
| 2. P003 进入 P006 读统一 session | ✅ 配网成功真流程（SHID ∈ 注册表）→ 立即「已连接」·复用；快照场景（HID-…∉ 注册表）→ 连接流 |
| 3. P007 Profile 设备链进入 P006 读统一 session | ✅ P007 非 Profile 点卡直达 → 复用「已连接」；Profile 卡仍分流 P003（流程未改），经「高级 BLE 调试」进 P006 = 要求 2 同源修复 |
| connected → 显示已连接 | ✅ 复用分支立即「已连接」（设备面板状态点 on + stWord） |
| connecting → 显示连接中 | ✅ 连接流分支「连接中」（面板 connecting + 按钮禁用 loading） |
| disconnected → 显示未连接 | ✅ 断开后「未连接」（面板 idle），且注册表同步清理 |
| 禁止修改页面流程 | ✅ 分流/redirectTo/navigateTo 结构零改动（断言 C：Profile 卡仍落 P003） |
| 禁止新增状态 | ✅ 显示三元沿用 p006-gatt.js:17 既有实现，零新状态 |

## 1. 问题机理（审计 P1-2 复述 + 本轮复核）

三条进入路径此前各自为政，P006 不读取任何统一会话来源：

| 入口 | 修复前行为 | 证据（修复前 app.js） |
|---|---|---|
| P001「连接」 | `go('p006')` 后显式调 `p006Connect()` → 自动连接 | 原 app.js:217（p001-connect） |
| P003「高级 BLE 调试」 | 仅 `go('p006')` → 停 idle「未连接」，需手动连接 | 原 app.js:272-273（p003-gatt） |
| P007 点卡（非 Profile） | 仅 `go('p006')` → 停 idle「未连接」——**设备明明在已连接列表中，状态显示失真** | 原 app.js:325-329（p007-open） |

违反 PAGE_SPEC.md §6「操作与响应：进入（解析上下文→适配器→**连接复用**→超时→重试→GATT 发现）」；P007 数据展示规则「列表为响应式内存态」。设备详情页没有复用已有 Session 状态——即用户任务描述的问题本体。

## 2. 修复方案

**核心：新增 `p006Enter()` 统一入口，以 `MOCK.connected`（会话注册表，P007 列表同源）为唯一事实源；三个进入 ACTION 全部改经它。**

```js
/* M-3 统一入口（P006_SESSION_STATE_FIX）：P001/P003/P007 三路径进入 P006 一律读唯一
   会话注册表 MOCK.connected——命中=连接复用（已连接 · ready），未命中=走既有连接流
   （连接中 → 已连接）。显示映射沿用 p006 既有三元：已连接/连接中/未连接（不新增状态）。 */
function p006Enter(d){
  const s=S.pages.p006;
  if(MOCK.connected.some(x=>x.deviceId===d.deviceId)){
    s.connected=true; s.connecting=false; s.panel='ready'; s.logs=[];
    addLog('p006','sys','连接复用 · 已有会话（READY）· 服务发现完成（4 服务 / 7 特征）');
    addLog('p006','sys','MTU 协商 185 · 会话已就绪');
    renderAll();
  } else p006Connect();
}
```

变更点（app.js 单文件，共 5 处）：

| # | 位置 | 变更 |
|---|---|---|
| 1 | p006Connect 之后 | 新增 `p006Enter()`（上述全文） |
| 2 | `p001-connect` | 末行 `p006Connect()` → `p006Enter(d)` |
| 3 | `p003-gatt` | 补 `p006Enter(dv)`（原无任何连接调用） |
| 4 | `p007-open` 非分流支 | 补 `p006Enter(dv)`（原无任何连接调用）；**Profile 分流支（→P003）零改动** |
| 5 | `p006-disconnect` | 补一行注册表同步清理：`MOCK.connected.splice`（与 p007-disconnect「断开并从列表移除」同语义） |

设计要点：

- **状态映射零新增**：`connected→已连接 / connecting→连接中 / disconnected→未连接` 三态显示由 p006-gatt.js:17 既有三元表达式原样承载（`s.connected?'已连接':s.connecting?'连接中':'未连接'`），本轮未触碰页面渲染层。
- **注册表为何是唯一事实源**：`MOCK.connected` 即 P007 已连接列表的数据源（内存会话注册表，DATA_MODEL.md §1 Session 实体的原型投影）；三路径进入读它 = 「设备详情页复用已有 Session 状态」的直接实现。命中语义 = PAGE_SPEC §6 连接复用（会话已就绪，直接 ready + 「连接复用」日志）；未命中 = 走既有 `p006Connect()`（连接中→已连接），P001 路径行为与修复前一致。
- **断开同步清理的必要性**：若 P006 主动断开不清注册表，用户断开后从 P007 再点同一设备会被复用分支误判为「已连接」（读到陈旧会话）。清理后断开 → P007 列表同步移除 → 再进入走连接流，闭环一致。该行为与 p007-disconnect 既有语义（断开并从列表移除 + toast）完全同构。
- **页面流程零改动**：分流（Profile→P003）、redirectTo（P002→P003）、navigateTo/页面栈结构、P006 内部连接流（超时/重试文案、服务发现、写队列、OTA）全部不动；p006Enter 只是把「进入时如何取得初始会话态」从三处散落实现收敛为一处。

## 3. 变更明细与同步

| 文件 | 变更 | 校验 |
|---|---|---|
| prototype/v1-new/app.js | 上述 5 处 | `node --check` 通过；MD5 `1a19861b87ef0bd858f0b8ffe006cc29` |
| platform/{wechat,app,desktop}/high-fi/app.js | 字节拷贝自 v1-new | MD5 四方一致（上方同值 ×4） |
| v1-new/index.html | 戳 `?v=1.1.4` → `?v=1.1.5`（15 处） | grep 计数核对 |
| platform/{wechat,app,desktop}/high-fi/index.html | 戳 `?v=1.4.3` → `?v=1.4.4`（各 17 处） | grep 计数核对 |
| platform/web/high-fi/* | **不动**（独立内核，W3 GATT 为 chooser 选择器入口、无三路径进入语义，D3 子集范围外） | — |
| v1-new/README.md | 新增 v1.0.5 修订记录 | — |
| platform/README.md | 走查须知戳句更新（1.4.4/1.1.5） | — |

## 4. 验证（Playwright 26/26）

| 组 | 断言 | 结果 |
|---|---|---|
| A1a P001 全新连接（EF:6B，∉注册表） | 进入显示「连接中」→ 1.4s 后「已连接」+ 服务树 4 服务 + 日志「连接成功」 | ✅×4 |
| A1b P001 注册表设备（LightBLE） | 立即「已连接」（无连接中瞬态）+ 日志「连接复用」 | ✅×2 |
| A2 P001 SHID 卡标准连接（注册表命中） | 立即「已连接」+「连接复用」 | ✅×2 |
| B1 要求 2 真流程（P002 配网成功 → 查看设备 → P003 → 高级 BLE 调试） | redirectTo 落 P003 ✓；P006「已连接」+「连接复用」 | ✅×3 |
| B2 P003 快照场景（HID-…，∉注册表） | 「连接中」→「已连接」（进入即连接，不再停 idle） | ✅×2 |
| C 要求 3（P007） | 非 Profile 点卡 → 「已连接」+「连接复用」（失真消除）；Profile 卡仍分流 P003（流程未改） | ✅×3 |
| D 断开一致性 | P006 断开 → 「未连接」+ 面板 idle；P007 列表同步剩 2 台、Mi Band 消失 | ✅×4 |
| 回归 | p006 idle 场景「未连接」；路由无效空态；p001 空态 A 恰 1 CTA（v1.0.4 修复保持）；console/pageerror 0 | ✅×4 |
| wechat 壳抽查（8952） | P007→P006 复用「已连接」；console 0 error | ✅×2 |

## 5. 过程记录：首轮 22/24 的两处「失败」系测试前提错误（非产品缺陷）

首轮 A1 用 Mi Band 验证「连接中」瞬态失败——复核发现 **Mi Band 本就在演示注册表 `MOCK.connected` 中**（mock.js:70，3 台预置会话之一），因此 P001 点它的「连接」正确地走了复用分支（立即「已连接」），不再经过「连接中」。这正是本修复的预期行为；断言前提（假定它不在注册表）错误。改用真正不在注册表的无名设备 `EF:6B:12:0C:AA:77` 验证连接流，并将「注册表设备即时复用」转为显式断言（A1b）后 26/26 全过。两轮均无产品代码返工——唯一代码变更即 §2 所列 5 处。

## 6. 约束符合性自查

| 约束 | 自查 |
|---|---|
| 不修改页面流程 | ✅ 分流/redirectTo/navigateTo/栈结构/页面集零改动；断言 C 直接验证 Profile 卡仍落 P003 |
| 不新增状态 | ✅ 三态显示为既有三元表达式；p006Enter 仅赋既有字段（connected/connecting/panel/logs） |
| 三路径读统一 session | ✅ 单一事实源 MOCK.connected；三 ACTION 收敛到 p006Enter 单函数 |
| 检查范围 prototype/v1-new | ✅ 主修 v1-new；按内核字节同步惯例波及三壳（不同步即违反内核一致性，platform/README §2 共享口径） |
| 延续禁令（零后端/零持久化/不改产品逻辑） | ✅ 全部内存态，无 HTTP/存储，页面与产品逻辑零改动 |

## 7. 遗留与建议

- **P0-1（P005 重新检测 `p005Diagnose` 未定义）不在本轮范围**，仍待放行（审计 §8 M-1；本修复未触碰 P005，验证期间 console 0 error 亦反证无波及）。
- **P1-1（F020 扫码失败三分类）仍待放行**（审计 §8 M-2）。
- 建议随 09_test 固化：把「三路径进入 P006 的会话态断言」（本报告 §4 A/B/C 组）与「P005 重新检测点击」纳入常驻冒烟集——两者均为历轮断言盲区（场景直接置态绕过页面动作）。
- 演示口径备注：`p006Connect()` 成功后不写入注册表（P007 列表为场景驱动的演示形态），与真实实现的「连接成功即注册会话」存在 mock 简化差——开发实现以 PAGE_SPEC §6/§7 与 DATA_MODEL Session 实体为准，不受演示限制。
