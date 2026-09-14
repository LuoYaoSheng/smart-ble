# 08 平台能力与降级矩阵

```yaml
status: APPROVED
document_version: 1.0
owner: Smart BLE Product / Engineering
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：各平台逐能力的结论（Full / Adapted / Degraded / Unsupported / Not Released）与对应 UI 降级行为；公开状态的逐能力赋值基础。

本文不负责：公开面措辞（`18`）；具体页面实现（`pages/`）。

平台范围：Android App（UniApp）、H5、iOS App（UniApp）。微信小程序已于 2026-09-11 经用户裁决退役（2026-09-14 MAC-001 落正），不再参与矩阵；REFERENCE 级（Flutter/原生/Tauri/Electron/macOS 等）不参与矩阵，只能在 `01` 非目标中存在。

---

## 2. 能力矩阵

支持等级：Full（目标同能力完整）/ Adapted（目标同，路径按平台调整）/ Degraded（页面可用+解释限制）/ Unsupported（明确不支持+替代）/ Not Released（目标已定义未发布）。

| # | 能力 | Android App | H5 | iOS App | 降级 UI |
|---|---|---|---|---|---|
| 1 | 四 Tab 与 10 页导航 | Full | Full（页面可看） | Full（未发布 NOT_RELEASED） | — |
| 2 | 平台/权限状态展示 | Full | Full（BLE 状态恒 UNSUPPORTED） | Full | H5 状态区显示不支持说明 |
| 3 | 蓝牙权限请求 | Full（Android 12+ SCAN/CONNECT；低版本按系统能力） | Unsupported | Full | 微信按 Capability Detection 决定申请集合，不写死定位 |
| 4 | 永久拒绝恢复 | Full（系统设置） | N/A | Full | — |
| 5 | 蓝牙开关引导 | Full | Unsupported | Full | H5 显示"请用 App/小程序" |
| 6 | 扫描（两轮/generation） | Full | Unsupported | Full | H5 PAGE-001 为说明面 |
| 7 | 广播字段解析 | Full | 模拟展示（文档用途） | Full | 缺失字段三态显示 |
| 8 | 显示名解析链 | Full | N/A | Full | — |
| 9 | 连接与服务发现 | Full | Unsupported | Full | — |
| 10 | Read | Full | Unsupported | Full | — |
| 11 | TEXT/HEX Write+队列 | Full | Unsupported | Full | — |
| 12 | MTU 与分包 | Full | Unsupported | Full | — |
| 13 | Characteristic Subscription（Notify/Indicate 统一，DEC-017） | Full | Unsupported | Full | — |
| 14 | 多设备会话 | Full（目标 2 台 Must，DEC-008） | Unsupported | Full | — |
| 15 | 通信日志/导出 | Full | 只读展示 | Full | 导出受限平台给复制 |
| 16 | 被动断开有限重连 | Full | N/A | Full | — |
| 17 | 手机 Peripheral 广播 | Full（原生插件；缺失=Unsupported 面） | Unsupported | Not Released | H5 UNSUPPORTED 面 |
| 18 | 31 字节预算 | Full | 展示计算不广播 | Full | — |
| 19 | OTA 完整事务 | Full | Unsupported | Full | 入口受 DEC-001 |
| 20 | Smart HID 配网 | Full | Unsupported（页面不可达） | Full | — |
| 21 | Smart HID 历史/诊断 | Full | 历史只读不可诊断 | Full | — |
| 22 | 扫码（QR） | Full | 模拟不进验收 | Full | — |
| 23 | 分享 | Full（系统分享） | Web Share→复制 | Full | — |
| 24 | 外链打开 | Full（openURL） | Full | Full | 不支持直开的平台给复制 toast |
| 25 | 版本（VERSION 投影） | Full | Full | Full | — |
| 26 | 落地页访问 | Full | Full（主场景） | Full | — |
| 27 | ESP32 教程/固件 | Full | Full | Full | — |
| 28 | 后台保持 BLE | Adapted（系统策略） | N/A | Adapted | 明示不承诺 |

## 3. 平台结论摘要

- **Android App**：正式产品入口。除广播名称能力驱动规则（DEC-004：可控才可编辑）与后台策略外全部 Full；E5 通过后 VERIFIED。
- **H5**：文档/入口/模拟。任何真实 BLE API 调用都被禁止（REQ-009）；状态区永远诚实 UNSUPPORTED。
- **iOS App**：目标定义完整，产物未发布前 NOT_RELEASED（DEC-005），落地页与关于页不得提供下载。
- **REFERENCE 客户端**：不出现在能力卡、平台状态表与公开声明中。

## 4. 降级呈现规则

1. Unsupported 能力：入口不出现或点击后展示说明面+替代入口（去 App）；绝不模拟成功。
2. Adapted 能力：功能可达，差异点在 UI 标注（如"字段由平台提供"）。
3. Degraded：页面可打开，相关区块替换为说明（H5 扫描页）。
4. Not Released：展示"规划中/未发布"与预期，无下载。
5. 能力探测失败（如插件缺失）按 ERR-BT-03 处理，等同 Unsupported 而非无响应。

## 5. 验收条件与关联测试规划

- 每项能力四平台结论明确（或 N/A 有因）；
- 每个非 Full 结论有 UI 降级定义；
- 与 `18` 公开状态、WEB-001 平台表同源一致。

关联计划测试：`TEST-C-004`（矩阵与公开面一致性）、`TEST-P-001/008`（降级面）、`TEST-A-001..012`（E5 验证矩阵逐项落地；TEST-W 微信套件已随目标退役移除）。
