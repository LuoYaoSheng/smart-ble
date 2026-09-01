# 21 风险登记与决策日志

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Product Owner
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：产品决策登记（DEC-001~017：选项、推荐、理由、影响、默认方案、是否需用户确认）与风险登记（RISK-001~016）。

本文不负责：安全威胁细节（`15`）；测试执行状态（TP-G2 之后）。

---

## 2. 决策日志（DEC）

### DEC-001 OTA 首版公开策略
- 选项：A 首版隐藏 OTA 入口；B 显示但标 BLOCKED/PREVIEW；C 全量公开（需 TEST-E-007+A/W 全过）。
- 推荐：**B**（入口存在+状态徽标+已知限制），在 E5 证据齐备后升 C。
- 理由：隐藏会让硬件用户困惑；C 无证据违反原则 9。
- 影响：PAGE-006 入口逻辑、CLAIM-010、落地页能力卡。
- 默认方案：B（用户未确认时按 B 实现）。**需用户确认**。

### DEC-002 Observer 必须第一方固件
- 选项：A 首版必须包含 fixture_observer（本仓交付）；B 允许第三方 App（nRF Connect）作为广播证据。
- 推荐：**A**。
- 理由：第三方工具不可复现、不可版本锁定，不能作为正式证据（原则 3/4）； Observer 也是产品教学价值的一部分。
- 影响：`12` 第 9 节、TEST-E-006、发布范围+1 个固件产物。
- 默认方案：A。**需用户确认**（影响发布范围）。

### DEC-003 微信 BLE 权限：能力驱动最小权限
- 选项：A 写死"Android 微信扫描必须先授权定位"并在进入小程序时申请；B 能力驱动最小权限（按当前运行环境实际要求申请）。
- 推荐：**B**，冻结为以下目标原则：
  1. 不在进入小程序时主动索取定位；
  2. 用户点击"开始扫描"时才进入权限流程；
  3. 首先申请当前微信/Android/基础库执行 BLE 所需的最小权限；
  4. 仅当当前运行环境明确要求定位授权或位置服务时，才申请/引导定位；
  5. 当前环境不需要定位时，不得额外申请（不得无条件弹 `scope.userLocation`）；
  6. TP-G4 必须建立真机矩阵：Android 系统 × 微信版本 × 基础库 × 蓝牙授权 × 定位授权 × 位置服务开关；
  7. 最终权限 UI 由 Capability Detection 结果决定，而不是写死任何单一 scope。
- 理由：把"微信扫描一定要求定位"写成永久目标事实是错的——是否要求取决于微信版本/基础库/Android 系统组合；目标必须是最小权限+按需申请，具体矩阵由真机证据回填。
- 影响：FEAT-006、REQ-006、FLOW-001、PAGE-001、`08` 平台矩阵、`07`（ERR-PERM-02 重定义+新增 ERR-PERM-04）、`15` SEC-001、TEST-W-001/004。
- 默认方案：B。TP-G4 真机矩阵回填各组合结论（非阻塞确认）。

### DEC-004 广播名称：真实可控字段（能力驱动 UI）
- 概念区分（冻结）：**System Device Name**（系统设备名，只读能力字段）与 **Advertising Local Name**（广播本地名，仅平台/插件真正可控时可编辑）。
- 选项：A 保留一个可编辑框并提示"系统可能接管"；B 能力驱动 UI（可控才可编辑，不可控只读展示）；C 隐藏名称字段。
- 推荐：**B**：
  - 平台/插件允许控制 Advertising Local Name → 显示可编辑输入框；
  - 平台不允许 → 只读展示"系统广播名称：xxxx／名称由系统/蓝牙适配器决定"；
  - 禁止提供"修改后不影响实际广播内容"的假输入框；
  - 字节预算只计算实际进入 Advertising Packet 的字段。
- 理由：教学价值保留（用户能看到系统行为），但不牺牲诚实交互；假可控比不可控更糟。
- 影响：PAGE-008 字段区（第 4/6/13 节）、PROTO-008 预算规则、`08` 平台矩阵、落地页/教学说明（`19`）、Observer 比对目标（`12`）、TEST-U-014、TEST-E-006。
- 默认方案：B。**需用户确认**。

### DEC-005 UniApp iOS 发布时机
- 选项：A 首版同步发布 iOS；B 首版 NOT_RELEASED，仅保留目标定义；C 完全移除 iOS。
- 推荐：**B**（未发布不阻塞 Android/微信主线；落地页/关于页标 NOT_RELEASED 无下载）。
- 影响：`08` iOS 列、CLAIM-013、TEST-A 范围。
- 默认方案：B。**需用户确认**。

### DEC-006 Smart HID 是否进入首版公开能力
- 选项：A 完全隐藏（不暴露 Profile）；B 公开为 PREVIEW（证据不全时）；C VERIFIED（TEST-H 全过时）。
- 推荐：**B→C 渐进**：通用 BLE 不被阻塞（REQ-054）；证据齐则升 C。
- 影响：CLAIM-014、PAGE-001 Profile 动作可见性、落地页区块。
- 默认方案：B（证据齐备自动升 C）。**需用户确认**。

### DEC-007 正式小程序码和 APK 未发布时的落地页策略
- 选项：A 显示"敬请期待"死按钮；B NOT_RELEASED 说明卡+CTA 转原型/源码；C 延迟上线落地页。
- 推荐：**B**（页面先上、诚实降级、CTA 有效）。
- 影响：WEB-001 状态机、STATE-W001-03。
- 默认方案：B。**需用户确认**。

### DEC-008 多设备目标上限
- 选项：A 1 台；B 2 台 Must+3 台 Should；C 3 台 Must。
- 推荐：**B**：2 台满足隔离验证与多数场景，3 台作 Should 视微信实测（NFR-012）再升。
- 影响：FEAT-035、NFR-012、TEST-A-009/W-009。
- 默认方案：B。**需用户确认**。

### DEC-009 Notify 跨页保留
- 选项：A 用户订阅随会话保留（离页再回自动恢复推送）；B 离页即退订（回页重开）。
- 推荐：**A**：会话是应用级，订阅属会话；避免"还连着但不推送"的错觉。
- 影响：FEAT-031/033、释放矩阵、PAGE-006/007。
- 默认方案：A。**需用户确认**。

### DEC-010 版本 SSOT
- 选项：A 根目录 VERSION 文件（人读正典+构建投影）；B manifest.json 为源；C Git tag 为源。
- 推荐：**A**（tag 与 manifest 均为投影；tag 在发布时打）。
- 影响：FEAT-004、TEST-C-006、`18`。
- 默认方案：A。**需用户确认**。

### DEC-011 GitHub/Gitee 角色
- 选项：A GitHub 唯一主仓；B 双仓同步（GitHub 主+Gitee 国内镜像）；C Gitee 主。
- 推荐：**B**（GitHub 主仓+CI/Release；Gitee 镜像供国内克隆，只读）。
- 影响：落地页链接、FEAT-079、`20` 支持渠道。
- 默认方案：B。**需用户确认**。

### DEC-012 扫描页 Smart HID 历史紧凑入口形态
- 选项：A 完整列表（与 PAGE-004 重复）；B 最近 1 台+"全部历史"；C 无入口。
- 推荐：**B**（SSOT 仍在 PAGE-004；首页直达常用设备）。
- 影响：FEAT-016、PAGE-001 区块 4。
- 默认方案：B。**需用户确认**。

### DEC-013 默认扫描时长：10 秒
- 选项：A 5s；B 10s；C 手动-only。
- 推荐：**B 10 秒**：用户可以手动停止；停止/完成后可以马上重新扫描；扫描时长由常量控制；后续可以升级为高级设置项；首版 UI 不增加复杂设置。
- 理由：Smart BLE 是调试工具，目标优先减少低广播频率、弱信号和微信宿主调度导致的漏发现，而非优先节电。
- 影响：NFR-005、OP-P001-03、FLOW-002、PAGE-001 第 16 节。
- 默认方案：B（10 秒常量可调）。需用户确认（低风险）。

### DEC-014 详情缺失字段显示策略
- 选项：A 显示"未记录"占位；B 隐藏该行。
- 推荐：**B**（减少噪音；关键字段必有者除外）。
- 影响：PAGE-003 第 4 节、FEAT-060。
- 默认方案：B。需用户确认（低风险）。

### DEC-015 其他小程序推广区
- 选项：A 删除；B 仅微信页底折叠；C 保持现状（首屏）。
- 推荐：**B**（保留作者推广但让位产品信息）。
- 影响：PAGE-009 区块 9。
- 默认方案：B。**需用户确认**。

### DEC-016 OTA 固件包格式（Firmware Package）
- 选项：A 裸 firmware.bin（版本/身份靠用户自辨）；B manifest + firmware binary 二件包；C 完整签名包（含验签）。
- 推荐：**B**，包内至少 `manifest.json` + `firmware.bin`，manifest 目标 Schema：

```json
{
  "format_version": 1,
  "target": "lightble-peripheral",
  "hardware": "esp32-wroom-32",
  "firmware_version": "1.1.0",
  "size": 123456,
  "sha256": "<64-char sha256>",
  "min_bootloader": null
}
```

- `target` 枚举至少支持 `lightble-peripheral`、`lightble-observer`（`hardware` 以设备真实硬件标识为准，能力匹配而非写死型号）。
- App 开始 OTA 前必须校验：manifest 格式；target 与当前设备匹配；hardware 匹配；firmware_version 合法；size 与实际 binary 一致；SHA256 与 binary 一致。**错误包不得进入 BLE OTA Transaction**（对应 ERR-OTA-09..13）。
- OTA CTRL start 携带 `target` 与 `sha256`；设备在 CTRL commit 阶段必须验证 received/expected size、expected/actual SHA256 与 OTA 状态，全部一致才允许 STATUS success。
- 理由：当前 OTA 目标缺固件身份、目标硬件、可信目标版本与 SHA256——没有包契约就无法定义"刷错包"的错误边界。
- 影响：REQ-066、FEAT-081、PROTO-011、DATA-013、SEC-019、ERR-OTA-09..13、TEST-U-016、TEST-I-010、`12` 第 7 节。
- 默认方案：B。**需用户确认**（C 签名验证记为后续版本方向，不在 V1 承诺）。

### DEC-017 Notify / Indicate 订阅语义（Characteristic Subscription）
- 选项：A UI 分别承诺"Indicate ACK 可被 App 观测"；B 统一定义 Characteristic Subscription（不承诺底层 ACK 可观测）。
- 推荐：**B**：
  - 特征属性可显示 Notify / Indicate / Notify + Indicate；
  - 用户操作统一为"开启订阅 / 关闭订阅"；
  - Runtime 按平台能力启用 Characteristic Value Change；
  - 仅当平台 API 明确暴露 ATT indication confirmation 时，才允许测试/展示底层 ACK；否则 App 只声明"收到 Characteristic Value Change"，不得声明"已收到 Indication Confirm"。
- 理由：把不可观测的 Indicate ACK 写进 UI 承诺会制造无法验证的声明；统一订阅语义让测试断言与平台能力一致。
- 影响：FEAT-031、PAGE-006（OP-P006-07/08 统一，删除独立 Indicate 操作）、`11` BLE 契约、`08` 平台矩阵、TEST-I-005、TEST-A-008、TEST-E-004。
- 默认方案：B。**需用户确认**。

## 3. 风险登记（RISK）

| ID | 风险 | 等级 | 缓解 | 关联 |
|---|---|---|---|---|
| RISK-001 | 夹具 OTA 无签名被刷恶意固件 | 中 | 测试定位声明+版本回读+abort 一致 | SEC-010、`15` R-OTA |
| RISK-002 | Smart HID Just Works 无 MITM 抗性 | 中 | 如实声明+外部正典升级路径 | SEC-009、R-HID-01 |
| RISK-003 | Pairing token 被截屏重放 | 低 | 5 分钟一次性+服务端一次性消费 | SEC-007 |
| RISK-004 | 若不交付 Observer，广播证据永久 BLOCKED | 高 | DEC-002 采纳 A | `12`、TEST-E-006 |
| RISK-005 | 微信基础库变更导致定位/扫描策略失效 | 中 | NFR-023 回归+`20` 兼容运维 | DEC-003 |
| RISK-006 | 版本五处漂移复发 | 中 | TEST-C-006 门禁 | DEC-010 |
| RISK-007 | 落地页声明与证据漂移 | 高 | Metadata 单源+TEST-R 门禁 | `18` |
| RISK-008 | 微信实际并行连接上限低于 2 | 中 | NFR-012 E5 实测记录+`08` 降级 | DEC-008 |
| RISK-009 | Android 广播名完全被系统接管导致教学困惑 | 低 | DEC-004 能力驱动 UI（只读展示+说明）+Observer 实测呈现 | PROTO-008 |
| RISK-010 | Smart HID 外部正典变更导致镜像失效 | 中 | lock 文件+TEST-C-013 同步流程 | `13` 第 2 节 |
| RISK-011 | 真机/硬件资源不足导致 E5 无法执行 | 高 | TP-G4 前置清单+BLOCKED 状态如实呈现 | `00` E5 |
| RISK-012 | 发布产物被替换（供应链） | 中 | SHA256+E6 校验 | SEC-012 |
| RISK-013 | 独立电脑无法复现构建 | 中 | NFR-024+TP-G5 清单 | `19` |
| RISK-014 | 其他客户端（Flutter 等）拉扯主线资源 | 中 | `01` 非目标冻结+REFERENCE 定位 | `01` 第 4 节 |
| RISK-015 | 契约门未建成前文档与实现漂移 | 中 | TP-G1 脚本化门禁 | 总计划 |
| RISK-016 | 维护人力不足导致发布后支持降级 | 低 | `20` 支持分级+自动化门禁 | `20` |

每条 RISK 复审：随每 Gate 结束复审一次；等级变化更新本表。

## 4. 验收条件与关联测试规划

- 17 项决策有选项/推荐/影响/默认方案/确认标记；
- 16 项风险有等级/缓解/关联；
- 与各文档交叉引用无冲突。

关联计划测试：`TEST-C-014`（决策默认方案与文档一致性——用于防止实现与默认方案矛盾）。
