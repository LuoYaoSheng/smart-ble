# Windows Mobile V1 测试矩阵（WINDOWS_MOBILE_V1_TEST_MATRIX）

- 状态：初版（Phase B 首轮，2026-09-04，基线 commit `dbb38a8`）
- 适用：Windows 主机 + Android 真机（SM-G9910 / `R5CR1284Y7H`，Android 15）+ ESP32（COM12，CH343）
- 三条实现线共用同一测试 ID 与验收预期；平台差异只写「预期差异」列，不得为 Flutter 降低验收标准
- 状态词：`PASS / FAIL / BLOCKED / NOT_RUN / NOT_APPLICABLE / PASS_WITH_LIMITATION`

## 0. 实现线与夹具

| 线 | 载体 | 真机 | 备注 |
|---|---|---|---|
| U-WX | apps/uniapp → 微信小程序 | Android 微信真机优先 | 开发者工具仅 E4 |
| U-AND | apps/uniapp → Android App | 同一真机 | HBuilderX 自定义基座 |
| F-AND | apps/flutter → Android App | 同一真机 | debug APK SHA 记录入证据 |
| ESP32-P | fixture_peripheral | COM12 | 一块板分轮 |
| ESP32-O | fixture_observer | COM12 | 先 Peripheral 后 Observer，不得同轮双角色 |

多设备限制：当前仅 1 块 ESP32 + 1 台手机；严格双外设 E5 = `BLOCKED_FIXTURE` 或 `PARTIAL`。

## 1. 通用能力矩阵（MOB-*）

| 测试 ID | 能力 | 验收要点 | U-WX | U-AND | F-AND | 预期差异 |
|---|---|---|---|---|---|---|
| MOB-SCAN-001 | 扫描会话 | 5 秒会话；手动停止；两轮扫描重置 | 待测 | 待测 | 待测 | 无 |
| MOB-SCAN-002 | 节流合并 | 1 秒节流合并；deviceId 去重；RSSI 排序；上限 100 | 待测 | 待测 | 待测 | 无 |
| MOB-SCAN-003 | 筛选 | RSSI 筛选；名称前缀；隐藏无名；显示名 fallback「未命名 BLE · ID后四位」 | 待测 | 待测 | 待测（Flutter 现状「未知设备」为已知偏差 FEAT-F-003） | 无 |
| MOB-ADV-001 | 广播详情 | 完整字段展示；缺失字段如实标注 | 待测 | 待测 | 待测 | 无 |
| MOB-CONN-001 | 连接 | 10 秒超时（DEC-013）；attempt 去重；8 态状态机 | 待测 | 待测 | 待测（Flutter 现状 30s 为偏差 FEAT-F-004） | 无 |
| MOB-GATT-001 | 服务发现 | 服务树；期望服务重试 | 待测 | 待测 | 待测 | 无 |
| MOB-GATT-READ-001 | 读 | Read 3 秒超时 | 待测 | 待测 | 待测 | 无 |
| MOB-GATT-WRITE-001 | 写 | TEXT/HEX；非法 HEX 拦截；同设备串行；跨设备并行；队列深度 16；单写 5 秒超时 | 待测 | 待测 | 待测 | 无 |
| MOB-NOTIFY-001 | 订阅 | 开关；device/service/characteristic 三元组隔离 | 待测 | 待测 | 待测 | 无 |
| MOB-LOG-001 | 日志 | 通信日志；脱敏；微信导出=剪贴板 | 待测 | 待测 | 待测 | 导出通道 |
| MOB-DISC-001 | 断开 | 主动断开不重连；被动重连 3 次；backoff 1s/3s/5s；重连期间写队列取消；旧回调失效 | 待测 | 待测 | 待测（Flutter 现状 2/4/6s 为偏差 FEAT-F-005） | 无 |
| MOB-SESSION-001 | 多设备 | 前台多 Session 独立；P007 只列通用 Session；配网 Session 不入 P007；断 A 不影响 B；同 UUID 不串台 | 待测 | 待测 | 待测 | 无 |
| MOB-BROADCAST-001 | 外围广播 | runtime 探测；开始/停止；名称+UUID；31B 预算；离页清理；Observer 客观确认 | 待测 | 待测 | 待测 | 插件/API 与权限弹窗 |
| MOB-PROFILE-001 | Profile | UUID STRONG / 名称 WEAK；Smart HID 双入口（连接 / 配置 Smart HID）；普通路径不受影响 | 待测 | 待测 | 待测（Flutter 现状缺失） | 无 |
| MOB-HID-PROV-001 | 配网 | 三阶段；Wi-Fi 表单；ControlHub；QR 配对码；token 仅内存；framed-v1；四行状态；8 类错误恢复 | 待测 | 待测 | 待测 | 无固件时 E1–E4 |
| MOB-HID-DIAG-001 | 诊断 | 五项诊断；owned/borrowed；失败→恢复；旧 generation 不污染 | 待测 | 待测 | 待测 | 无 |
| MOB-ABOUT-001 | 关于/版本 | 日志脱敏；真实版本；平台状态；已知限制；版本记录 P010 | 待测 | 待测 | 待测 | 分享/外链方式 |
| MOB-OTA-001 | OTA | BLOCKED P-03：第 0 步+10 步可测；不宣称端到端 | 待测 | 待测 | 待测 | 无 |

## 2. 硬件矩阵（ESP32 Peripheral 轮 → Observer 轮）

Peripheral 轮（U-WX / U-AND / F-AND 三客户端分轮）：发现、广播详情、连接、服务发现、Read、TEXT/HEX Write、Notify、LED FF00–FF03、主动断开、ESP32 断电、ESP32 重启、自动重连、delay fault、disconnect_on_write fault、日志、脱敏。

Observer 轮：三客户端广播字段核对（名称/Service UUID/Manufacturer ID+Data）、31B 合法、32B 手机端阻止、停止后不再出现、重启广播恢复、串口原始 JSON。

## 3. 稳定性（§18）

扫描 30 轮 / 连接断开 30 轮 / Read 100 / Write 100 / Notify 15 分钟 / 断电重连 10 轮 / 前后台 20 轮 / 蓝牙开关 10 轮 / 扫码四结果×5 / 诊断失败恢复 10 轮 / 广播开关 20 轮——逐线执行，环境不支持处标 BLOCKED。

## 4. 证据

每个 E5 记录 §22 全字段；目录 `verification/windows-mobile-v1/<run-id>/{uniapp-wechat,uniapp-android,flutter-android,esp32-peripheral,esp32-observer,parity,defects}/`。大体积产物入 ignored 目录，Tracked Markdown 只记路径+SHA+摘要+结论。
