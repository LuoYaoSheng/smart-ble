# 测试入口：原生 AppKit/CoreBluetooth 平台层 — tests/macos/native-macos-platform

范围：apps/desktop/macos/SmartBLE-mac 构建/运行 + CoreBluetooth 能力边界（native-probe 驱动）。

## 入口

```bash
scripts/macos/verify-native-macos.sh <run-id>
```

## 用例矩阵

| ID | 用例 | 判定 |
|---|---|---|
| NVB-01 | swift build | 0 error（历史开箱失败已在 spike 修复，见 defects D5-D9） |
| NVB-02 | App 冒烟 8s | `[BLE] Bluetooth is powered on` + `Peripheral is powered on` |
| NVB-03 | swift test | 包内无测试目标，NOT_RUN |
| NVA-01 | Info.plist 双蓝牙 usage 键 | 配置断言 |
| NVC-01 | probe env | CENTRAL_STATE=5 + PERIPHERAL_STATE=5 |
| NVC-02 | probe scan 12s | unique≥1 且 updates>unique（真实设备） |
| NVC-03 | probe advertise（GATT server 三特征） | service_added + advertising_started（API 层） |
| NVC-04 | probe connect（GATT 客户端全链） | **无夹具=BLOCKED_FIXTURE**；同机广告不可见（P1） |
| NVC-05 | 广播外部可见性 | **无第二观察端=BLOCKED_OBSERVER** |
| NVL-01 | 退出清理（terminate 钩子 disconnect/stopScan） | 源码断言 + SIGTERM 干净退出 |

## 硬件夹具声明

同 flutter-macos-platform：扫描类真实可判；GATT/外部可见性需 ESP32 或可操作手机端；
禁止触碰用户活跃输入设备。

## 已知平台事实

同 flutter 侧 P1（同机广播回送过滤）——两条路线共用同一 CoreBluetooth 底座，边界一致。

## 页面级冒烟用例（r3 重写：原型对齐壳，UIS-*）

入口：`scripts/macos/verify-native-macos.sh` step 4（`SmartBLE-mac --smoke-pages`）+ step 5（`--snap-pages` 快照证据）。
不依赖屏幕权限：程序化触发真实 action/路由/委托，从控件状态读回判定。
r3 起 UI 按 `docs/specs/prototype/platform/desktop/`（四 Tab + 9 页 + 桌面差异点）对齐重建，旧三分栏用例（r2 UIS-01..07）随旧 UI 一并退役。

| ID | 步骤 | 判定 |
| --- | --- | --- |
| UIS-01 | 壳装配 | 窗口标题 BLE Toolkit+；四 Tab（扫描/已连接/广播/关于）齐全；默认页 P001（kicker BLE TOOLKIT+/开始扫描/筛选） |
| UIS-02 | 四 Tab 走查 | 各 Tab 页特征内容渲染（P007 空态文案 / P008 平台 chip / P009 品牌 / P001 分节） |
| UIS-03 | 真实扫描会话 | 开始扫描→停止扫描+「扫描中 · 5s 会话」；5s 自动停+「扫描完成 · 发现 N 台」（蓝牙关闭时 SKIP） |
| UIS-04 | 筛选面板 | 展开/预设 -70→阈值标签联动/滑杆/隐藏无名开关/重置→-100/收起 |
| UIS-05 | 广播数据弹窗（F004） | 设备卡→sheet（设备 ID/RSSI/AD 段/「本轮平台 API 未提供此字段」标注）→复制数据/关闭（无设备时 SKIP） |
| UIS-06 | 连接→P006 | 连接点击→GATT 调试页：两栏布局说明+右栏通信日志常驻+返回 P001（无设备时 SKIP；连接成败均验布局） |
| UIS-07 | P002 守卫+配对码解析 | 无设备上下文→「缺少设备上下文」守卫；parsePairCode：t= 必需/hub= 可选回填/无令牌拒绝 |
| UIS-08 | P008 徽标+预算 | 平台 chip「Desktop · macOS」+ CoreBluetooth 提示；字节预算真实核算：默认 21B→超限 46B 拦截（按钮禁用+红字）→恢复 21B 重启用 |
| UIS-09 | P008 检查支持 | 真实 CBPeripheralManager 判定：日志含 CoreBluetooth、徽章六值之一呈现 |
| UIS-10 | P009 关于页 | 品牌/四菜单/操作系统行（macOS · CoreBluetooth）/生态矩阵卡（广播发送 ❌【待验证】）→版本记录进 P010 |
| UIS-11 | P010 版本记录 | 限制清单（BLOCKED_FIXTURE/BLOCKED_OBSERVER）/正式发布空态/预览记录/页脚投影声明 |
| UIS-12 | P005+P003 守卫 | P005 五项诊断行+按钮；P003 无快照→「设备记录不存在」 |
| UIS-13 | 退出确认 | requestQuit→退出确认 modal（会话感知文案）→继续使用→窗口留存 |
| UIS-14 | 页面快照 | --snap-pages 9/9 页 cacheDisplay PNG（验证脚本 step 5） |

WriteDialog 写入弹窗经 P006 写入按钮真实打开（TEXT/HEX 校验）；服务树特征读写同 NVC-04 BLOCKED_FIXTURE。

## r4 用例：交付形态 + 真实交互 + 稳定性（2026-09-04）

入口分三路：
- `scripts/macos/verify-native-macos.sh` step 6（NVP-01..03 / NVS-01..02，脚本化）
- `scripts/macos/make-app-bundle.sh [--omit-bt-usage]`（bundle 产物与 NoBT 负向对照）
- 宿主 AX 工具真实点击走查（NVR-01..11，见 `verification/macos-extension/20260904-r4/walkthrough.md`）

| ID | 步骤 | 判定 |
| --- | --- | --- |
| NVP-01 | SPM 产物 → .app bundle | 复用仓库 Info.plist（含 NSBluetoothAlwaysUsageDescription）+ ad-hoc 签名 strict 校验通过 |
| NVP-02 | Gatekeeper 评估 | spctl rejected（ad-hoc 未公证，预期拒绝）；Developer ID + notarization 需 Apple 账号 → NOT_RUN |
| NVP-03 | bundle 二进制直跑 | 双管理器上电（蓝牙已开启/外围模式已就绪）；TCC 归因父终端，不弹 bundle 授权框（平台事实） |
| NVP-04 | 缺声明负向对照 | NoBT 变体直跑不崩溃、蓝牙照常上电（macOS ≠ iOS 强制崩溃；Finder/Dock 启动的弹框路径未演练，诚实登记） |
| NVR-01..11 | 真实点击走查 | AX 事件驱动全链：开始扫描→5s 自动停止→5 台真实设备卡；筛选预设/滑杆步进/隐藏无名开关/重置；Tab 四页切换；P008 检查支持+广播启停（表单禁用/恢复）；P009 promo sheet；退出确认双路径（继续使用留存 / 退出进程终止） |
| NVS-01 | 扫描压力 | `--soak-scans=12`：12 轮真实 5s 会话全部自动停止（每轮发现 3-8 台真实设备） |
| NVS-02 | 稳定性断言 | 日志条数 ≤500（实测 83）；驻留内存增量 <64MB（实测 -3.1MB，无泄漏迹象） |

约束重申：NVP 全程仅 ad-hoc 签名，不涉及证书私钥 / Apple 账号 / 公证；NVR 中设备卡点击（弹 F004 广播详情）与 P009 操作系统行菜单因自绘视图无 AX press 动作、且宿主无屏幕录制权限无法坐标点击 → NOT_RUN（r3 冒烟 UIS-05/UIS-10 已程序化覆盖）。
