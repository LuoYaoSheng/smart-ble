# DATA_MODEL —— 数据模型（产品模型五件套之四）

> 依据：《产品模型 Product Model 规范 v2.0》§0/§2（2026-09-03 用户提供）
> 性质：**平台无关**的数据契约收口索引。字段级正典以 [REVERSE_ANALYSIS.md](../01_reverse/REVERSE_ANALYSIS.md) §2.4（数据层）与各页「数据来源」小节为准；数据分类与敏感处理见 [DATA_STORAGE_REVIEW](../06_review/DATA_STORAGE_REVIEW.md) §3/§4。本文不重复字段全表，只锁定实体清单与不变量。
> 前提：**零本地持久化（BR-02）**——下列实体全部为内存态，无任何存储键。

## 1. 实体清单（内存态）

| 实体 | 要点 | 生命周期 | 来源 |
|---|---|---|---|
| **ScannedDevice** | 扫描发现项：deviceId、name（可缺失 → 显示名 fallback）、RSSI、advertisement、profileMatch | 扫描会话内；节流合并更新 | REVERSE §2.4 / §4.1 · PRD §6 PAGE001 |
| **advertisement** | 广播数据视图：hex、byteLength、manufacturerId；平台 API 可能缺失或长度为 0（均显式呈现，不猜值） | 随 ScannedDevice | REVERSE §4.1 · 基准原型 P001 广播弹窗 |
| **GATT 服务树** | Service → Characteristic（uuid、名称标准映射、props 读/写/通知、value） | 单连接会话 | REVERSE §2.3 服务层 · PRD §6 PAGE006 |
| **Session（会话）** | session-registry 8 态承载：连接状态、notify 订阅集、写队列 | 连接生命周期 | [STATE_MACHINE](../04_architecture/STATE_MACHINE.md) §1 |
| **配网表单与凭据** | ssid/pwd/hub/token（token 来自 shid://pair 扫码解析）；**仅内存、离开即清空、日志脱敏** | 配网向导会话 | PRD §6 PAGE002 · DATA_STORAGE_REVIEW §4 |
| **通信日志条目** | {time, type∈sys/err/read/write/recv/ok, msg}；上限截断；脱敏规则 BR-04 | 页面会话 | 基准原型 logPanel · PRD F008–F011 |
| **广播表单 + 31B 预算** | name/uuid/mfgId/mfgData + 实时预算核算；平台扩展参数（mode/power/开关）为表现层，不改变预算算法口径 | 广播会话 | PRD §7.3 · 基准 P008 |
| **版本投影** | release-metadata 读取（通道不可用时回退构建内置——P009 verFallback） | 启动/关于页 | PRD F027 · 基准 P009 场景 |
| **诊断行（5 项）** | BLE / Wi-Fi / ControlHub / 控制连接 / USB Ready，state∈ok/warn/fail/pending + detail | 单次诊断 | REVERSE §4.6 · PRD §6 PAGE005 |

## 2. 不变量（平台不得触碰）

1. **零持久化**：任何平台不得为上述实体引入本地存储/缓存落盘（BR-02）。
2. **契约字段**：ScannedDevice / Session 等字段语义以 REVERSE §2.4 为准（10_platform §4「不变式」行明确列入）。
3. **脱敏**：token/密码在任何导出物（剪贴板/分享/文件）中保持脱敏（BR-03/04）。
4. **缺失即显式**：字段不存在或为空时显式呈现（`—`/「未命名」/「本轮未提供」），不猜值（禁止脑补的同源规则）。

## 3. 平台差异的合法位置

数据**获取方式**可平台化（Web 经 chooser 单选、Desktop 经原生层），数据**实体与语义**不变——例如 Web 选择器不提供 RSSI，则 ScannedDevice.RSSI 显式缺省，而非造值（见 `prototype/platform/web/` 实现）。

## 4. 验收（规范 v2.0 §4）

- ☑ 数据明确：9 类实体全部带来源引用与生命周期
- ☑ 与 REVERSE/DATA_STORAGE_REVIEW 同源（本文为索引，不产生第二字段正文）
- ☑ 平台原型三查的「功能保留」查以本清单为对照系
