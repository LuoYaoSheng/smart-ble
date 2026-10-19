# F001–F005 扫描域执行总结（run-id 20260905-1726-1b793ca）

- 夹具：fixture_peripheral_s3（BLEToolkit-Server / mfg 0x00E0 "LightBLE" / 主服务 4fafc201-…-914b，
  ~100ms 广播间隔，COM12 免按键烧录成功，boot JSON `git_sha=dde3b77`；空口 6s/62 事件确认）
- 本域前 ESP32 状态：Smart HID V1（E14 已配网终态）→ 已按任务书 §10 分轮计划切换为夹具固件

## 1. F-AND（Flutter Android · SM-G9910 · Android 15）：PASS（E5）

驱动：`apps/flutter/integration_test/p001_scan_test.dart`（ValueKey/文本语义驱动，live 帧策略）
包装器：`f001-run.sh`（预授权 + 三星防杀 + grant-watch + stayon 还原）
最终日志：`flutter-android/f001-f005-scan-v6-app.log`（exit=0，全部断言通过）

断言清单（v6 全过）：
- F001 首启空态「还没有扫描结果」/「扫描中 · 5s 会话」/ 5s 自动停「扫描完成 · 发现 N 台」/ 手动停（两轮会话）
- F005 具名显示 BLEToolkit-Server + RSSI dBm；F018 普通设备「连接」入口、无 SHID 徽章
- F004 广播详情 sheet：设备 ID/名称/RSSI/Service UUIDs/AD 结构逐段/厂商数据（0x00E0 LightBLE）/复制/关闭
- F003 面板展开（信号强度/名称前缀/隐藏无名/重置）/正向前缀只留夹具/反向前缀筛选空态/重置恢复

## 2. 本域缺陷（发现→修复→真机复验）

| 编号 | 等级 | 描述 | 修复 | 复验 |
|---|---|---|---|---|
| WIN-FAND-001 | P2 | 筛选面板展开+键盘时 P001 固定区 RenderFlex 底部溢出 6.7px/0.333px（v1 真机渲染异常） | device_list_page.dart 固定区包 Flexible+SingleChildScrollView | v2 起日志无 overflow |
| WIN-FAND-002 | P1 | 前缀输入框每次 rebuild 新建 TextEditingController → IME 失同步（光标跳动/二次输入不生效，真用户可触发） | filter_panel.dart 改 _NameFilterField State 持有 controller，仅外部值变化回写 | v5/v6 反向前缀生效、重置同步 |
| FEAT-F-003 | P1（在册） | F-AND 显示名仅 name?:未知设备，R05 全链（localName→AD 0x09/0x08→Profile→厂商→未命名 BLE·ID后四位）未实现 | 本域不修（登记为 F005 后续工作项） | — |

测试工程坑（已固化进驱动注释）：TestTextInput 的 receiveAction(done) 后二次 enterText 不生效——集成测试全程不收键盘；ListView 懒构建下屏外卡片 find 不到——断言改用筛选隔离或空态消失。

## 3. U-AND（UniApp Android · 同机）：BLOCKED_HOST（差用户解锁一次）

- 通路已全部打通：HBuilderX 5.24 CLI `launch app-android --playground standard` 纯 CLI 装基座
  （io.dcloud.HBuilder）+ 同步 + 启动成功（App Launch 日志在案，/tmp/uand-launch.log）
- 权限实测：首次扫描触发定位+「附近设备」双弹窗（U-AND F002 真实证据）；pm 预授+弹窗点允许可过
- 首轮驱动 5/10 断言过（P001 启动/首启空态/待开始/蓝牙就绪/按钮定位——见会话记录；
  截图与 results.json 被后续失败重跑覆盖，已删污染件，如实登记）
- 阻塞点：三星自动锁屏（无 SIM 紧急呼叫锁定态）→ 意外触摸保护（UnintentionalLcdOn）+
  通知栏（=锁屏窗）反复；sleep→wake→dismiss-keyguard 可清守卫但解锁需用户物理操作
- 驱动器 `uand-p001-e5.py` 已含 ensure_awake 三坑防御（守卫 sleep-wake 循环/通知栏 collapse/
  stayon usb），解锁后直接重跑即可全量出证

## 4. U-WX（微信小程序）：BLOCKED_TOOLCHAIN（差扫码登录一次）

- 编译产物 build:mp-weixin PASS（基线 B7）
- 开发者工具服务端口经 GUI 已开启（端口 52628，computer-use 完成）；「自动化默认信任项目」已勾选
- miniprogram-automator 连接 ws://127.0.0.1:9420 成功，但游客态（not-login）下 appservice
  不响应任何桥命令（systemInfo/currentPage 均 10s 超时，touristappid 亦同）——开发者工具需
  微信扫码登录后 E4 自动化才可用；E5 真机预览二维码同样依赖登录
- 驱动器 `uwx-p001-e4.mjs` 就绪（connect 模式 + DOM 文案断言 + 三阶段截图）
- 注：dist 构建产物 project.config.json 的 appid 曾临时改 touristappid 试验（gitignored 产物，下次构建自动覆盖）

## 5. 环境事实沉淀

- HBuilderX CLI 可纯 CLI 真机运行标准基座（无需登录/云打包）——U-AND 全域 E5 通路成立
- 三星真机 adb 自动化三坑：息屏→意外触摸保护（需完整 sleep→wake→dismiss-keyguard 循环）、
  锁屏窗表现为 NotificationShade 焦点、无 SIM 紧急态无法 dismiss-keyguard 解锁
- 微信开发者工具服务端口开关在 设置→安全设置（computer-use 可代点；改 localstorage JSON 无效）
- pio 不在 PATH：用 C:/Users/11066/.platformio/penv/Scripts/pio.exe

## 2026-09-07 U-AND 续跑（三星解锁后）

**结论：U-AND 真机 13/13 全 PASS**（`uniapp-android/uand-p001-e5-results.json`，驱动 `uand-p001-e5.py` v5，截图 6 张）。

覆盖：P001 启动/首启空态/待开始/蓝牙就绪、扫描中瞬态（停止扫描+扫描中双文案捕获）、5s 自动停止回落、完成态（已完成·N 台）、夹具卡片 BLEToolkit-Server、RSSI 展示、F003 面板展开（扫描过滤器/RSSI 摘要 chips）+ 完整表单（信号强度滑条+预设/名称前缀/隐藏无名设备/重置过滤）、F004 广播详情（RSSI 历史序列/厂商数据/MAC 列表）。

F002 权限链说明：本轮为已授权态复跑（App 预装+权限已授），全新装机弹窗链证据为此前实测记录（定位+附近设备双弹窗），不重复计。

驱动迭代（v1→v5）：① 扫描中瞬态改为 tap 后 0.5s 间隔轮询（原 sleep2+ensure_awake 的 SLEEP/WAKE 循环耗时 3s+，把 dump 推到 5s 会话之后）；② F003 与 F004 调序——广播详情弹层（×）不可达且 BACK 不关，放最后一步免关闭；③ 筛选面板两级结构（「筛选」出摘要 →「展开」露完整表单）分步断言；④ 冷启改轮询就绪（固定 9s 在 WebView 加载完成前 dump）。

U-AND 线自此全通，状态由 BLOCKED_HOST → 通路+证据齐备；U-WX 仍差开发者工具扫码登录。

## 2026-09-07 A-AND 线启动（Android 原生 Kotlin/Compose，扩展线登记后首跑）

**结论：A-AND 真机 13/13 全 PASS**（`android-native/aand-p001-e5-results.json`，驱动 `a-and-p001-e5.py` v5，截图 6 张，E5 三星 SM-G9910）。

覆盖：P001 启动（扫描 Tab/Smart BLE 标签）、首启空态（暂无设备+点击上方按钮开始扫描）、蓝牙就绪（蓝牙已开启）、权限预授态（无未授权文案）、扫描中瞬态（停止扫描）、5s 自动停止回落、发现计数（发现 N 台设备）、夹具卡片 BLEToolkit-Server（名称或 MAC 10:B4:1D:CD:23:8D 双匹配）、RSSI 展示（-27~-50dBm 四色档）、F004 广播详情（广播数据/发射功率/MAC/名称/关闭按钮）、F003 筛选面板（content-desc「展开」箭头→信号强度 -100/-90/-70/-50 预设+全部+名称前缀完整表单）。

工具链：本机系统 JDK 24 不可用于 Gradle 8.2 → 便携 JDK 21 `C:\Users\11066\tools\jdk-21`（不入库）；`gradlew assembleDebug` 1m41s；`pm grant` 预授 SCAN/CONNECT/ADVERTISE+定位五权限。

缺陷登记：**WIN-AAND-001（P3）** 广播详情 sheet 出现 `-2147483648 dBm`（INT_MIN 未兜底的 RSSI 渲染），v1/v4/v5 三跑复现（`aand-p001-advdetail.png` 可见）。

观察：① 单轮 5s 扫描偶发漏扫夹具（v2/v3 两跑缺席，补扫即现）——A-AND 无「扫描过滤器」摘要 chips，与 U-AND 形态不同；② 未命名设备渲染为「未知设备」+MAC；③ 夹具粘性 fault 武装态曾致广播异常停止，esptool hard_reset 后恢复（串口确认 `adv status started`）；④ A-AND 广播详情 sheet 有「关闭」按钮（U-AND 的 × 不可达），但同样盖住筛选入口，驱动需显式关闭。

驱动迭代（v1→v5）：① 扫描瞬态改 tap 后轻量连拍（ensure_awake 的 dumpsys 开销会拖过 5s 会话）；② F004 后显式 tap「关闭」关 sheet；③ 筛选开关是 IconButton content-desc「展开/收起」（text「过滤条件」不可点）→ bounds_of_desc；④ 夹具匹配加 MAC 兜底+最多补扫 2 轮。
