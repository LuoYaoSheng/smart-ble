# r6 · 按原型开发轮（能力层补齐 · M1-M6，2026-09-04）

> 触发：用户指令「做计划开发吧，要按原型来开发」→ 计划获批（路线 B：AppKit 样车能力补齐）。
> 原型基准不变：`docs/specs/prototype/platform/desktop/`（r3 已完成 9/9 页面 UI 对齐）；
> 本轮交付「能力层」：多设备会话 / 断线重连 / 写队列 / OTA 真实链 / HID 配网协议 / 摄像头扫码。

## 1. 里程碑与提交

| 里程碑 | 内容 | 提交 |
| --- | --- | --- |
| M1 多设备会话（F006/F013） | BLEManager 单会话 → `[deviceId: DeviceSession]`；每设备独立状态机/10s 超时/服务缓存/监听集合；P007 正典重写（>1 台汇总卡「N 台在线 · 全部为内存会话」、全部断开 allSettled 3s 结算 + 部分失败 modal 清单、点卡按 profileId 分流）；P001 已连接角标按设备；P002 联动改 sessionState；Tab 徽标 = 通用连接 + 配网会话在线 | 95b653e |
| M2 断线自动重连（F012 · SM §2） | `.reconnecting` 态；被动断线 1s/3s/5s ×3 退避，耗尽 → FAILED 移除；主动断开/OTA 接管永不重连；重连成功自动重发现服务 + 恢复监听订阅；P006 重连中状态呈现 | a744913 |
| M3 写队列（F009 · PRD §4.2） | WriteQueueItem（PENDING/SENDING/DONE/FAILED/CANCELLED · 5s · 深 16）；同设备串行/跨设备并行；优先级插队（配网/OTA 帧预留）；withoutResponse 流控 + peripheralIsReady 续泵；重连期 PENDING→CANCELLED | cfe2564 |
| M4 OTA 真实链（F025 · SM §6） | OtaManager：选包 sha256 → manifest sidecar 校验（SemVer/size/sha256；六字段白名单待 legacy 固化已登记）→ 会话接管（禁重连）→ CTRL {op:start} → ready 30s → DATA 分块 min(180, MTU-3) @20ms → commit 30s → 2A26 版本回读比对 → 成功 2s 关窗；P-03 BLOCKED 口径保持（超时文案明示预期停态，不伪造） | 70922a2 |
| M5 HID 配网协议（F018-F022/F024） | HidProvisionManager（正典 = core/protocols 受锁镜像，只读参照）：framed-v1 [seq][total][len]（≤128B=MTU-6 / ≤1024B / ≤64 帧 / 30ms）；严格 shid://pair 解析（token 32hex/重复参数拒绝/host 无空白斜杠/端口校验）；candidate JSON 正典校验；verifyDeviceInfo（product/协议版本/deviceId 正则）连接即验证；60s STATUS 轮询 ×2s；state/step → 四行映射；8 错误码 → form/pairing/diagnostics/retry 四分流；token TTL 5min。QrScannerController：AVFoundation 取景器 + QR 元数据识别（授权链如实呈现，粘贴/手输兜底保留 dtk-parse 双口径）。P005 四项诊断接真实 STATUS 映射 | 4d322c8 |
| M6 验证/打包/文档 | CoreUnit `--unit-core` 62 项纯逻辑单测；PageSmoke UIS-15/16/17 扩展；相机权限进 plist/entitlements/打包链；verify 脚本加 CU 步骤 + NVC-04 动态改判 + NVD-06 判活修复 | 本轮 |

## 2. 验证结果（本目录 logs/native-summary.tsv，2026-09-04 终跑）

**38 PASS + 1 BLOCKED_OBSERVER，0 FAIL。**

| 类 | 结果 | 要点 |
| --- | --- | --- |
| CU-00 单测 | PASS | 62 项纯逻辑：framing 边界（MTU 映射/1024B/64 帧/重组还原）、QR 严格解析 9 例、candidate 校验 9 例、身份验证 3 失败分支、四行映射 8 例、错误四分流全表、SemVer、常量锁定 |
| UIS-00..17 冒烟 | 全 PASS | UIS-15 = P002 真实诚实路径（环境设备连上 → 服务枚举 → smart_hid_service_missing 横幅 + 重连可达；连不上时诚实加载态同样受认）；UIS-16 = OTA 相位机（临时 .bin + manifest 四态）；UIS-17 = P007 任意台数一致性（≥2 台并行标注 BLOCKED_FIXTURE） |
| **NVC-04 GATT 正向链** | **PASS（首次）** | 环境外设（midea 类设备）真实连接 → ATT 协商（最大写入 20B/512B）→ 服务发现（3 服务）→ 特征枚举。r1-r5 均为 BLOCKED_FIXTURE，本轮环境提供了可连外设实证。对目标固件（ESP32）的读写语义仍需夹具（见 §4） |
| NVC-05 广播可见性 | BLOCKED_OBSERVER | 无第二观察端（诚实维持） |
| NVB/NVP/NVS 稳定性 | 全 PASS | 构建/双管理器上电/12 轮浸泡/日志上限/内存增量 |
| NVD 上架形态 | 全 PASS | 通用二进制/plist（含新相机用途键）/图标/沙盒+hardened runtime/**相机 entitlement 已嵌入**/沙盒真实生效/LaunchServices 启动/Gatekeeper 预期拒绝/Swift 系统运行库 |

### 2.1 过程中发现并修复的问题

1. QR 解析取值切片 bug（单字符而非后缀）——被 CU-14..16 捕获后修复；
2. 宽口径 token 正则误写 hex 形态——对齐 dtk-parse `[A-Za-z0-9-]{4,}`（CU-25）；
3. P002 connectBody 错误仅在未连接时渲染（服务缺失失败时设备仍连着 → 错误不可见）——UIS-15 捕获后修复，并让身份失败主动断开配网会话；
4. syncFromManager 相位迁移错误（身份失败被推到 status 相位）——修复为相位不由失败迁移；
5. **NVD-06 判活竞态**：`set -o pipefail` + 管道末端 `grep -q` 在 ps 输出长时受 SIGPIPE 误判（全链必败、单跑必过的假故障）——改为落盘后 grep 文件；
6. 冒烟编号冲突（verify 脚本已占用 UIS-14=快照）——新检查改号 UIS-15/16/17。

## 3. 交付形态

- `scripts/macos/make-app-bundle.sh` → `dist/SmartBLE-macOS.app`（运行形态，BLE 可用）/ `dist/SmartBLE-macOS-MAS.app`（MAS 形态，sandbox + camera entitlement + hardened runtime）/ NoBT 负向对照。
- 相机权限：Info.plist `NSCameraUsageDescription` + Entitlements `com.apple.security.device.camera`（配对码扫码，无图像落盘）。

## 4. 诚实口径（未变）

- 端到端 BLOCKED 项：OTA（P-03 固件侧未开放）、Smart HID 配网（无真实 SHID 夹具，停在 smart_hid_service_missing / identity_failed 诚实错误态）、广播外部可见性（无第二观察端）、≥2 台外设并行实测。
- 摄像头实机识别 NOT_RUN：取景器/识别链已实现，未在 shid://pair 实景验证（授权链待真机）。
- GATT 正向链对环境外设已实证连接+发现；对目标固件的读写监听语义需 ESP32 夹具（NVC-04 的 PASS 口径不含后者）。
- 账号门控（真实签名/公证/MAS 上传）维持 NOT_RUN（r5 store-readiness.md C 链）。
- 结论词：路线 B 能力层 **VIABLE_WITH_LIMITATIONS**（UI 对齐 r3 已定，能力层本轮闭合到夹具边界；D2 正式选型仍归用户）。

## 5. 复现

```bash
cd apps/desktop/macos/SmartBLE-mac && swift build
./.build/debug/SmartBLE-mac --unit-core      # CU-01..55（62 断言）
./.build/debug/SmartBLE-mac --smoke-pages    # UIS-01..17
./.build/debug/SmartBLE-mac --snap-pages     # snaps-r3/*.png
# 或一键： scripts/macos/verify-native-macos.sh 20260904-r6
```
