# ADVERTISEMENT_DETAIL_FIX —— F004 广播数据弹窗字段补齐整改报告

> 整改日期：2026-09-03
> 整改对象：`docs/specs/prototype/v1-new/`（app.js `p001-advdlg` + mock-data/mock.js）+ `docs/specs/prototype/platform/{wechat,app,desktop}/high-fi/`（内核字节重同步）
> 整改依据：[PRD.md](../02_product/PRD.md) §5 F004 / §8 R04 · [PAGE_SPEC.md](../03_flow/PAGE_SPEC.md) §1 PAGE001 · [COVERAGE_CHECKLIST.md](../09_test/COVERAGE_CHECKLIST.md) F004 行 · [HTML_V0_ACCEPTANCE.md](../09_test/HTML_V0_ACCEPTANCE.md) §2 F001–F005 抽验
> 对应审计项：[HTML_DEVELOPMENT_READINESS_AUDIT.md](HTML_DEVELOPMENT_READINESS_AUDIT.md) **A-02（P1）** —— 本轮为其修复落地
> 整改边界（任务四条约束全部满足）：**只增加展示字段 / 不新增协议解析能力 / 不修改数据模型 / mock-data 增加对应示例数据**

---

## 0. 总体结论

**完成。** F004（P0）广播数据弹窗按 R04 验收口径补齐：Service UUIDs、Service Data、AD 结构逐段展示三项新增到位；单字段缺失逐项标注「本轮平台 API 未提供此字段」。AD 分段为 **mock 预置示例数据**（非运行时解析，约束 2 满足）；DATA_MODEL.md 与应用状态结构零改动（约束 3 满足）。v1-new 与 wechat/app/desktop 三实例内核字节重同步（MD5 一致），四实例 Playwright 实测渲染正确、console 0 error。审计 A-02（P1）就此关闭。

---

## 1. 规范要求 → 修复前差距 → 修复后对照

| R04 要求字段（PRD §8） | 修复前（app.js:222-234 旧版） | 修复后 |
|---|---|---|
| 设备 ID | ❌ 仅出现在无名称设备标题后缀（`deviceId.slice(-6)`） | ✅ 独立 kv 行 · mono |
| 名称 | ❌ 仅弹层标题 fallback | ✅ 独立 kv 行（无名设备显「（未命名）」） |
| RSSI | ✅ 已有 | ✅ 保留 |
| Service UUIDs | ❌ 缺失 | ✅ 独立区块；缺失时标注「本轮平台 API 未提供此字段」 |
| 原始广播数据 | ✅ 整包 hex 单块（已有） | ✅ 保留，且上方新增 AD 结构逐段（COMPONENT C2：长度/类型/HEX mono 块） |
| Manufacturer Data | ⚠ 仅在有值时显示 kv，缺失时静默省略 | ✅ 有值 kv（0x4C00 / 0x0064）；缺失显式区块 + 标注 |
| Service Data | ❌ 缺失 | ✅ 独立区块（uuid · 字节数 · hex）；缺失标注 |
| 「平台未提供的字段标注」 | ⚠ 仅覆盖 advertisement 整体缺失分支 | ✅ 整体缺失 + **单字段缺失**（Service UUIDs / Manufacturer Data / Service Data 逐项）双分支 |
| 「复制数据」toast「已复制」 | ✅ 已有 | ✅ 保留（实测通过） |
| profileMatch 行（F018 既有） | ✅ 已有 | ✅ 保留 |

依据链：PRD §5 功能表 F004「弹窗展示 Service UUIDs/原始广播/厂商/Service Data，一键复制；未提供字段如实标注」（[PRD.md](../02_product/PRD.md) §5）→ PRD §8 R04 Given/When/Then 全字段清单 → PAGE_SPEC §1 PAGE001 按钮表「（点设备卡本体）」行 + 数据展示规则「平台未提供字段标注…长度 0 标注…」（[PAGE_SPEC.md](../03_flow/PAGE_SPEC.md) §1）→ 09_test 覆盖表 F004 行「点设备卡弹窗（含『本轮平台 API 未提供此字段』标注）+ 复制」（[COVERAGE_CHECKLIST.md](../09_test/COVERAGE_CHECKLIST.md)）。AD 结构逐段的视觉契约见设计系统 COMPONENT C2「AD 结构逐段（长度/类型/HEX mono 块）」——按任务依据三目录实现，该条为同源佐证。

---

## 2. 变更明细

### 2.1 `v1-new/app.js` —— `ACTIONS['p001-advdlg']` 重写（纯展示层）

- 新增 kv 行：设备 ID（mono）、名称（`d.name || '（未命名）'`）。
- 新增区块（复用既有 `.ad-sec/.hd/.hex/.miss` 类，**零新增 CSS**）：
  - **Service UUIDs**：`advertisement.serviceUuids` 数组逐条 mono 展示；空 → miss 标注。
  - **AD 结构 · 逐段**：`advertisement.adStructures` 逐段渲染「类型（0x01 等）· 语义名 · 段长 B · HEX mono」，段列表下保留整包 hex 块；空 → miss 标注。
  - **Manufacturer Data**：有 `manufacturerId` 时保留原 kv（标签补全为「厂商 ID（Manufacturer Data）」）；无 → 显式区块 + miss 标注。
  - **Service Data**：`advertisement.serviceData`（uuid · byteLength · hex）；缺失 → miss 标注。
- 不变：`sheet()` 结构与底部按钮组、advertisement 整体缺失分支（「advertisement 不存在」note）、「字段存在但长度为 0」warn、`p001-advcopy` 动作。

### 2.2 `v1-new/mock-data/mock.js` —— scanDevices 五台设备示例数据（任务约束 4 授权的示例数据增补）

advertisement 对象新增三个**预置示例字段**（不进入应用状态模型）：

| 字段 | 形态 | 来源口径 |
|---|---|---|
| `serviceUuids` | UUID 字符串数组 | 字段名对齐 REVERSE_ANALYSIS §7.1 旧代码真实结构（`advertisServiceUUIDs` 为平台 API 独立解析字段，与原始 `advertisData` hex 分离）——本轮仅在 mock 补示例值，展示层直读 |
| `serviceData` | `{uuid, state, present, byteLength, length, hex}` | 同上（§7.1 serviceData；字节字段统一六字段形态） |
| `adStructures` | `[{type, name, len, hex}]` | **预置分段展示数据**（COMPONENT C2「AD 结构逐段」的示例载体）；原型不做 hex→分段运行时解析（任务约束 2），开发期由平台层/SDK 按既有能力供给 |

同轮将四台有值设备的 `hex` 重排为 **AD 结构自洽帧**（旧值长度字节与实际段长不符，如 SHID 名段声明 0x11 实为 14B——见 §3 校验）；`byteLength/length` 同步修正。五台设备示例矩阵（覆盖 R04 全部分支）：

| 设备 | hex | AD 段 | serviceUuids | serviceData | manufacturerId | 演示点 |
|---|---|---|---|---|---|---|
| SHID-9F3E2A1C | 31 B（**31B 预算满包示范**，U4 学习口径） | 4 段（FLAGS/名称/厂商/发射功率） | ✅ `9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04`（**与 STRONG 匹配互证**，PRD R14） | ❌ → miss 标注 | 4C00 | 平台解析字段独立于 hex 内嵌（128-bit UUID 不占 31B 包）+ 单字段缺失分支 |
| Mi Smart Band 8 | 20 B | 2 段 | ❌ → miss | ❌ → miss | ❌ → miss | 三字段全缺标注分支 |
| EF:6B:12:0C:AA:77（无名） | 11 B | 3 段 | ❌ | ❌ | 0064 | 无名设备「（未命名）」行 + 小包多段 |
| LightBLE-DevKit | 30 B | 4 段（含 0x02 UUID 列表、**0x16 Service Data**） | ✅ `0000ffe0-…`（与包内 0xFFE0 及 GATT 树 FFE0 串口透传一致） | ✅ `{FFE0, 2B, 00 01}`（与包内 0x16 段一致） | ❌ | 全字段齐备 + Service Data 有值分支 |
| C4:11:9E:02:3B:5F | — | — | — | — | — | advertisement 整体缺失分支（不变） |

### 2.3 三平台实例内核字节重同步 + 版本戳

- `platform/{wechat,app,desktop}/high-fi/app.js`、`mock-data/mock.js` ← v1-new 字节复制（改动前后均 MD5 四方一致，沿用 v1.0.1 同步流程）。
- 资源戳：v1-new `?v=1.1.1→1.1.2`；wechat/app/desktop `?v=1.4.0→1.4.1`；**web 壳 `?v=1.4.0` 不动**——Web 实例为 D3 子集（「GATT 调试器」形态），无扫描列表与广播弹窗（W2 走 requestDevice 选择器，广告查看属 S1a 扫描域，Web 断裂并显式指引），**不在本次范围**。
- README 簿记：v1-new/README.md 增 v1.0.2 修订记录；platform/README.md 走查须知版本戳数字更新（原文 1.2.0/1.1.0 已过期，一并校正为实值）。

---

## 3. 校验记录

1. **AD 帧自洽（node 编写期校验，非运行时代码）**：四台有值设备全部通过——byteLength=字节数 ✓；`adStructures` 各段拼接=整包 hex 逐字节相等 ✓；每段长度字节=段长-1 ✓；类型字节=type 声明 ✓；len 声明=段实际字节数 ✓；名称段 ASCII 解码=设备名 ✓（`ALL OK`）。
2. **语法**：`node --check` app.js / mock.js 通过。
3. **内核同步**：app.js、mock.js 改后 MD5 四方（v1-new + wechat/app/desktop）一致。
4. **Playwright 实测（2026-09-03）**：
   - v1-new（`:8941`，v=1.1.2）：走扫描流程 → 5 台设备弹窗逐一断言——D1 Service UUIDs 含 `9f1d1001-…`、AD 4 段、厂商 0x4C00、Service Data miss ✓；D2 三字段 miss + AD 2 段 ✓；D3「（未命名）」+ 0x0064 + 3 段 ✓；D4 `0000ffe0-…` + `0x16 · Service Data` 段 + `FFE0 · 2 B` ✓；D5「advertisement 不存在」整体分支 ✓。弹层超高内容 `.sh-b` 可滚动（686>544），滚动到底「复制数据」可达，点击 toast「已复制」✓（R04 复制合同保持）。
   - wechat / app / desktop（`:8942`，v=1.4.1，各自覆写层共存）：场景库直达已扫描态 → 弹窗新字段断言全部通过（wechat 验 D4 全量字段；app 验 D1 STRONG UUID + Service Data miss——android.js 权限链覆写共存正常；desktop 验 D2 三重 miss + 2 段）。
   - console：四实例 **0 页面错误**（仅 v1-new 首页预存在的 favicon.ico 404，与本次无关）。
5. **视觉复核**：弹层自底升起（抓手条+遮罩），深色数据块（.ad-sec）内 UUID/HEX 等宽字体清晰，无重叠截断；分段标签行「类型 · 语义名 | 段长 B」双端对齐，与 C2「长度/类型/HEX mono 块」契约一致。

---

## 4. 约束符合性自查（任务四条）

| 约束 | 符合性 | 证据 |
|---|---|---|
| 1. 只增加展示字段 | ✅ | app.js 仅重写 advdlg 模板字符串；无新动作键、无路由/流程/按钮语义变化；既有字段（RSSI/profileMatch/整包 hex/厂商 ID/复制/关闭/两分支标注）全部保留 |
| 2. 不新增协议解析能力 | ✅ | 代码中无 hex→分段解析函数；`adStructures` 为 mock 预置数据直读渲染（mock.js 头注声明）；serviceUuids/serviceData 同为平台 API 侧字段示例（REVERSE §7.1 口径） |
| 3. 不修改数据模型 | ✅ | [DATA_MODEL.md](../02_product/DATA_MODEL.md) 零改动；应用状态/页面 defaults 结构零改动；新增字段仅存在于 mock 示例对象与弹层读取侧（可选字段，缺失走标注分支） |
| 4. mock-data 增加对应示例数据 | ✅ | §2.2 五设备矩阵：serviceUuids ×2、serviceData ×1、adStructures ×4、缺失组合 ×2、整包缺失 ×1——R04 各分支均有可演示样例 |

---

## 5. 遗留与建议（不在本轮范围）

1. **A-01（P1）仍未修复**：`C.empty()` 签名不匹配导致全部空态损坏——与 A-02 并列的 P1，建议下一轮优先（修复方案见审计报告）。
2. 旧 hex 长度字节不自洽问题已随本轮消解（重排为自洽帧）；若后续有「逆向原始抓包样本」需要逐字保留的场景，建议以注记方式区分「真实抓包」与「自洽示例」两种 mock 口径。
3. `manufacturerId` 仍为 mock 扁平字符串（`'4C00'`）；开发期若按 REVERSE §7.1 落「字节字段统一 {state,present,byteLength,length,hex}」形态，展示层需同步厂商数据 hex 行——属 08_development 映射事项，原型层维持现状即可。
4. P001 其余 P2 项（A-05 工具条计数 / A-08 兜底文案「未命名 BLE · ID后四位」）未在本轮顺手修复——保持「一次整改一个审计项」的可审计粒度，待批量小改轮处理。

---

—— 整改完成。整改人：ZCode（2026-09-03，A-02 修复落地）。本报告为 06_review 第 9 份审查文件；A-02 关闭后，进入开发前剩余 P1 仅 A-01。
