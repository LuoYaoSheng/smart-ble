# 08 平台能力与降级矩阵

```yaml
status: REVIEW
document_version: 1.0
owner: Smart BLE Product / Engineering
last_reviewed: 2026-09-01
approved_by: null
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：各平台逐能力的结论（Full / Adapted / Degraded / Unsupported / Not Released）与对应 UI 降级行为；公开状态的逐能力赋值基础。

本文不负责：公开面措辞（`18`）；具体页面实现（`pages/`）。

平台范围：Android App（UniApp）、微信小程序、H5、iOS App（UniApp）；REFERENCE 级（Flutter/原生/Tauri/Electron/macOS 等）不参与矩阵，只能在 `01` 非目标中存在。

---

## 2. 能力矩阵

支持等级：Full（目标同能力完整）/ Adapted（目标同，路径按平台调整）/ Degraded（页面可用+解释限制）/ Unsupported（明确不支持+替代）/ Not Released（目标已定义未发布）。

| # | 能力 | Android App | 微信小程序 | H5 | iOS App | 降级 UI |
|---|---|---|---|---|---|---|
| 1 | 四 Tab 与 10 页导航 | Full | Full | Full（页面可看） | Full（未发布 NOT_RELEASED） | — |
| 2 | 平台/权限状态展示 | Full | Full | Full（BLE 状态恒 UNSUPPORTED） | Full | H5 状态区显示不支持说明 |
| 3 | 蓝牙权限请求 | Full（Android 12+ SCAN/CONNECT；低版本定位组） | Adapted（授权体系） | Unsupported | Full | 微信走自身弹窗与设置 |
| 4 | 永久拒绝恢复 | Full（系统设置） | Adapted（小程序设置） | N/A | Full | — |
| 5 | 蓝牙开关引导 | Full | Adapted（10001 引导） | Unsupported | Full | H5 显示"请用 App/小程序" |
| 6 | 扫描（两轮/generation） | Full | Adapted（定位权限策略 DEC-003） | Unsupported | Full | H5 PAGE-001 为说明面 |
| 7 | 广播字段解析 | Full | Adapted（字段可能不全→"平台未提供"） | 模拟展示（文档用途） | Full | 缺失字段三态显示 |
| 8 | 显示名解析链 | Full | Full | N/A | Full | — |
| 9 | 连接与服务发现 | Full | Full | Unsupported | Full | — |
| 10 | Read | Full | Full | Unsupported | Full | — |
| 11 | TEXT/HEX Write+队列 | Full | Full | Unsupported | Full | — |
| 12 | MTU 与分包 | Full | Adapted（协商支持差异→保守 23） | Unsupported | Full | — |
| 13 | Notify/Indicate | Full | Full（indicate 确认语义差异） | Unsupported | Full | — |
| 14 | 多设备会话 | Full（目标 2 台 Must，DEC-008） | Adapted（实际并行上限 E5 确认） | Unsupported | Full | — |
| 15 | 通信日志/导出 | Full | Adapted（文件能力差异；复制兜底） | 只读展示 | Full | 微信无导出时给复制 |
| 16 | 被动断开有限重连 | Full | Adapted（后台限制不承诺） | N/A | Full | — |
| 17 | 手机 Peripheral 广播 | Full（原生插件；缺失=Unsupported 面） | Adapted（微信 Peripheral API） | Unsupported | Not Released | H5 UNSUPPORTED 面 |
| 18 | 31 字节预算 | Full | Full | 展示计算不广播 | Full | — |
| 19 | OTA 完整事务 | Full | Adapted（文件选择差异） | Unsupported | Full | 入口受 DEC-001 |
| 20 | Smart HID 配网 | Full | Full | Unsupported（页面不可达） | Full | — |
| 21 | Smart HID 历史/诊断 | Full | Full | 历史只读不可诊断 | Full | — |
| 22 | 扫码（QR） | Full | Full（scanCode） | 模拟不进验收 | Full | — |
| 23 | 分享 | Full（系统分享） | Full（好友/朋友圈） | Web Share→复制 | Full | — |
| 24 | 外链打开 | Full（openURL） | Degraded（复制链接） | Full | Full | 微信给复制 toast |
| 25 | 版本（VERSION 投影） | Full | Full（受审核延迟） | Full | Full | — |
| 26 | 落地页访问 | Full | Full | Full（主场景） | Full | — |
| 27 | ESP32 教程/固件 | Full | Full | Full | Full | — |
| 28 | 后台保持 BLE | Adapted（系统策略） | 不承诺（hide 即停扫描） | N/A | Adapted | 明示不承诺 |

## 3. 平台结论摘要

- **Android App**：正式产品入口。除广播名系统接管（DEC-004）与后台策略外全部 Full；E5 通过后 VERIFIED。
- **微信小程序**：正式产品入口。Adapted 项集中在权限、文件、Peripheral API 与并行上限；语义与 App 完全一致（同一目标测试）；E5 通过后 VERIFIED。
- **H5**：文档/入口/模拟。任何真实 BLE API 调用都被禁止（REQ-009）；状态区永远诚实 UNSUPPORTED。
- **iOS App**：目标定义完整，产物未发布前 NOT_RELEASED（DEC-005），落地页与关于页不得提供下载。
- **REFERENCE 客户端**：不出现在能力卡、平台状态表与公开声明中。

## 4. 降级呈现规则

1. Unsupported 能力：入口不出现或点击后展示说明面+替代入口（去微信/App）；绝不模拟成功。
2. Adapted 能力：功能可达，差异点在 UI 标注（如"微信端字段由平台提供"）。
3. Degraded：页面可打开，相关区块替换为说明（H5 扫描页）。
4. Not Released：展示"规划中/未发布"与预期，无下载。
5. 能力探测失败（如插件缺失）按 ERR-BT-03 处理，等同 Unsupported 而非无响应。

## 5. 验收条件与关联测试规划

- [x] 每项能力四平台结论明确（或 N/A 有因）；
- [x] 每个非 Full 结论有 UI 降级定义；
- [x] 与 `18` 公开状态、WEB-001 平台表同源一致。

关联计划测试：`TEST-C-004`（矩阵与公开面一致性）、`TEST-P-001/008`（降级面）、`TEST-W-001..010`、`TEST-A-001..012`（双平台 E5 验证矩阵逐项落地）。
