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
