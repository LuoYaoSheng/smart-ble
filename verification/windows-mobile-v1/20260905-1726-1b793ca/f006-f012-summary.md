# F006–F012 GATT 域总结（2026-09-07，run-id 20260905-1726-1b793ca）

## 结论

| 线 | 结论 |
|---|---|
| F-AND（Flutter→Android→三星 E5 R5CR1284Y7H） | **PASS**（v12，`00:37 +1: All tests passed!` exit=0） |
| A-AND（Android 原生→三星 E5 R5CR1284Y7H） | **PASS_WITH_LIMITATION**（驱动 v16=39/46、v17=37/46 两轮终态；F006/F011/F012 全绿，F007/F008/F009/F010 功能链实证+4 项 App 缺陷限制，见 A-AND 节） |
| U-WX（uniapp→微信小程序） | NOT_RUN——工具链仍 BLOCKED_TOOLCHAIN（开发者工具 `islogin:false`，待扫码登录，与 F001–F005 域同因） |
| U-AND（uniapp→Android App） | NOT_RUN——通路已打通待续跑（F001–F005 先行，本域 U-AND 在页面全量回归阶段合并覆盖） |

夹具：ESP32-S3 `fixture_peripheral_s3`（COM12，git_sha dde3b77 起源、本轮两次重烧）。
驱动：`apps/flutter/integration_test/p006_gatt_test.dart`；包装器 `f006-run.sh`；串口旁证 `serial-tap.py`。

## F-AND 证据链（v12 = f006-f012-gatt-v12-app.log，exit=0）

- **F006 连接**：P001 卡片「连接」→「已连接」chip → 发现 5 服务（GAP/GATT/914b/914c/914d）
- **F007 服务树**：GAP=通用访问、GATT=通用属性、仅 914d 标「OTA 升级服务」、主服务/权限矩阵=未知服务；主服务 2 特征（控制=READ|WRITE|NOTIFY、状态=WRITE|NOTIFY）属性片断言
- **F008 读**：控制 26a8 → `system_info` 设备信息 JSON；权限服务 b0 → `read_only` JSON（中文 UTF-8 完整）
- **F009 写**：HEX `FF 01`/`FF 00` + UTF-8「开灯」三次写入，均收 `write_response`（command echo + led_state on/off + blink_pattern）
- **F010 Notify**：26a9 订阅即收「开始监听系统状态」欢迎推送；5s 周期 `device_status`；停止通知往返
- **F011 日志**：清空→面板隐藏→读重建面板→导出「设备数据已复制到剪贴板」回执
- **F012 重连**：写 `{"cmd":"fault","type":"disconnect"}` → 外设拆链（串口 `ble_gap_terminate` 实证）→「重连中...」→ 2s 退避自动重连成功；用户主动「断开」回列表且不触发重连
- **串口旁证**：`f006-serial-v6/7/8/9/10/11/12.txt`（GATT 表 dump、Write event `data=ff01`、`led on/off` 事件、subscribe/notify 长度与载荷全程可对时序）

## 本域发现并修复的缺陷（全部真机复验）

| 编号 | 层 | 现象 | 修复 | 复验 |
|---|---|---|---|---|
| WIN-ESP32-002 | 固件 | `setValue(const char*)` 落入 NimBLE 1.4 模板重载按 `sizeof(指针)=4` 拷贝——所有 JSON 经 BLE 读/通知都是 4 字节堆指针（`2C 5E CA 3F`=0x3FCA5E2C，跨轮缓增=堆漂移；串口 `notify: length: 4` 实证）；另 `server->disconnect(0)` 硬编码句柄 `ble_gap_terminate rc=7` 拆不了链 | 新增 `include/ble_value_util.h` 显式长度辅助，替换 18 处调用点（ble_peripheral/permissions_demo/ota_server/shid_sim）；`faultDisconnectPeer()` 经 `getPeerDevices()+getPeerIDInfo().getConnHandle()` 取真实句柄 | 4 env 全部构建 SUCCESS；v7 起 JSON 全通；v9 起拆链真实生效 |
| WIN-FAND-003 | App | `BleUuids` 按前 8 位匹配：FBP 1.36 `Guid.toString()` 对 16 位 UUID 返回短形式（`1800`）→ 标准服务命名表永不命中；且 `4fafc201` 前缀键把三个夹具服务全误标「OTA 升级服务」 | 16 位短形式归一 + 精确 32 位键优先、删除前缀键 | v3/v5+ 真机：GAP/GATT 具名、OTA=1、未知=2 |
| WIN-FAND-004 | App | `_toggleNotification` 在 `setNotifyValue` 返回后才挂值监听——订阅瞬间服务端即推的首条通知必丢（欢迎推送 8s 收不到）；且监听订阅不管理，重复开关叠加泄漏 | 先挂监听再写 CCCD；按特征 UUID Map 管理订阅、禁用/离页取消 | v8 起欢迎推送即时到达 |
| WIN-FAND-005 | App | 自动重连成功但读写全挂：FBP 1.36 重连不自动重发现服务（初连由页面发现），且 FBP 原生 `connectionState` 流在 rediscover 完成前就广播 connected | 重连路径补 `discoverServices()`+刷新服务缓存；`_rediscovering` 门控状态转发，服务就绪才报「已连接」 | v12：重连后 b0 读正常（重连后首个控制特征读仍有 8s 无响应，见观察项） |
| WIN-FAND-006 | App | 详情页 dispose→`CommandQueue.clear()`→`stopLoop()` 同步触发 `onQueueStateChanged`→对 defunct 元素 `setState` 炸框架收尾断言（v11 首次完整跑完即触发；dispose 期间 `mounted` 仍为 true，guard 挡不住） | dispose 先摘 `onQueueStateChanged` 回调再 clear | v12 exit=0 无收尾断言 |

## 观察项（不判失败，登记在册）

1. **F012 重连后首个控制特征读 8s 无响应**（v11/v12 稳定复现；无失败日志、后续 b0 读即正常）。疑与重连后控制特征旧 CCCD 订阅态有关，留 F014–F017/稳定性域跟踪。
2. **F012 UI 形态差异**：规范 F012·SEQUENCE 描述为断开后「重新连接」横幅，实现为 AppBar 状态 chip「重连中...」+自动重连。功能等价，形态差异登记（三线一致性阶段统一裁决）。
3. **fault 粘性语义**：`{"cmd":"fault","type":"disconnect"}` 武装后每次写再拆链且 `clear` 无法送达（预检查先拆链返回）——固件设计如此，测试将 F012 排为最后一次特征写规避；复测前需复位夹具（esptool hard_reset）。
4. **v6 前读值 4 字节乱码**为 WIN-ESP32-002 症状本身，随修复消失，无需独立跟踪。

## 迭代记录（驱动工程教训）

v1 DeviceCard 非 Card（按类型定位）；v2 GAP 不具名→WIN-FAND-003；v3「2 特征值」徽标与 GAP 撞车→改用 `4FAFC201` 短码定位；v4 权限滚动后懒销毁越界→相位重排（主卡操作连续、权限读放 F012 后一次前向滚动）；v5/v6 4 字节乱码→串口旁证定位 WIN-ESP32-002；v7 修固件后 JSON 全通；v8 欢迎推送丢→WIN-FAND-004；v9 拆链 rc=7→disconnect 句柄修复；v10 重连后 service not found→WIN-FAND-005；v11 全断言过但收尾炸→WIN-FAND-006；v12 全绿。

## A-AND（Android 原生）证据链（2026-09-07/08，E5 + 同夹具）

驱动：`a-and-f006-f012-e5.py`（v1→v17，46 项断言）；探针 `a-and-probe-detail.py`/`a-and-probe2-rows.py`/`a-and-probe3-smallwin.py`/`a-and-probe4-strokes.py`；串口旁证 `a-and-f006-serial-v5..v17.txt`。终态两轮：**v16=39/46、v17=37/46**（v17 F012 全链绿；轮间漂移=注入手势方差+夹具 USB 瞬断，环境非功能项）。

- **F006 连接**（PASS）：扫描卡「连接」→「已连接」徽标 +「发现 5 个服务」日志；logcat `Connecting to 10:B4:1D:CD:23:8D` + `onConnectionStateChange newState=2`
- **F007 服务树**（PASS_WITH_LIMITATION）：5 服务卡身份直读（dump 含短码+特征值徽章）：GAP=1800·2、GATT=1801·1、主服务=c201·2、权限矩阵=c201·7、第 5 卡**具名 OTA Service**（c201·3）；主卡展开两行分步签名 控制{读,写,通知}→状态{写,通知}（滚动区仅 570px 装不下 610px 展开卡，分步验证）；限制：GAP/GATT 不具名（WIN-AAND-002）、滚动区被压（003）、通信期间列表全量重放+重复累积（007）
- **F008 读**（PASS_WITH_LIMITATION）：控制 26a8 读——UI「读取 X...」日志 + logcat `onCharacteristicRead beb5483e-…-26a8 status=0`；权限 b0 读同判据曾单独通过（logcat b0 status=0）；限制：读值不进任何 UI 位（WIN-AAND-004，logcat+串口旁证）
- **F009 写**（PASS_WITH_LIMITATION）：TEXT `LED_ON` + HEX `FF01`/`FF00` 三写——UI「写入成功」×3 + logcat `onCharacteristicWrite 26a8 status=0`×3 + **串口 `Write event` + `{"type":"led","status":"on"}` LED 实变** + 串口 write_response notify 下发（截断实证）；限制：回显 UI 链路断（006/008）
- **F010 Notify**（PASS_WITH_LIMITATION）：状态行订阅 UI「通知已启用」；26a9 通知**持续到达**（logcat `onCharacteristicChanged` 计数 5s 节奏 11→14/16→19）；停止往返（v9/v10 通过）；限制：载荷 UI 不可读（006/008）
- **F011 日志**（PASS）：清空→LogPanel 消失（滚动区 1446-2016 实测）→读/写后面板重建→导出=系统分享面板（含完整导出文本预览：设备信息/服务摘要）
- **F012 重连**（PASS）：HEX 写 `{"cmd":"fault","type":"disconnect"}` → 串口 `disconnect_on_write` + 拆链 → logcat `scheduling reconnect 1/3`→`Auto reconnect attempt 1/3`→「已连接」恢复→`Discovered 5 services ×2`；用户断开回列表且**无新 attempt**（功能判据；WIN-AAND-005 在册）

## 本域 A-AND 发现的缺陷（全部真机定位，在册待修）

| 编号 | 级 | 层 | 现象（真机实证） | 根因 |
|---|---|---|---|---|
| WIN-AAND-002 | P2 | App | GAP/GATT 永远显示 Unknown Service（F-AND WIN-FAND-003 同类） | `BleUuids` map 键大写 vs Android 回调小写 UUID，标准 16 位服务命名表永不命中 |
| WIN-AAND-003 | P1 | App | 服务树滚动区仅 570px（清空日志后）/ 日志在时 **120px<一行高**，服务树近乎不可读 | ActionButtons+OtaCard+固定 150dp LogPanel 挤占 ServicePanel(weight 1f) |
| WIN-AAND-004 | P2 | App | 读值永不进 UI/日志（logcat+串口旁证才见值） | `onCharacteristicRead` 仅 `updateCharacteristicValue` 入内存模型，无值显示位 |
| WIN-AAND-005 | P3 | App | 用户断开日志恒缺/恒 false | `disconnect()` 先 add userInitiated 标志再被 `disableAutoReconnect()` 内部 remove；且 `close()` 紧跟 `disconnect()` 吞掉 DISCONNECTED 回调；功能不受影响（无新重连实证） |
| WIN-AAND-006 | P2 | App | 通知载荷被外设截到 20 字节：write_response/device_status JSON 不可整读（串口 `Truncating to 20 bytes` 实证；F-AND 因 FBP 自动协商 MTU 不受影响） | 常规连接不 `requestMtu`（仅 OTA 流程请求 247） |
| WIN-AAND-007 | P1 | App | 每次通知/读/写后日志重放「发现 N 个服务」、**服务卡展开态/滚动位被重置**、服务列表翻倍 5→10（重复条目）——通信期间服务树 UI 状态不可用 | `updateCharacteristicValue`→`updateServices` 整表替换重发 StateFlow → 全列表重组 |
| WIN-AAND-008 | P1 | App | onCharacteristicChanged 栈层 89 次而 ViewModel collect 0 次（logcat 0 条 `[Receive]`）→ 通知值永不进日志/UI | `characteristicChanges = MutableSharedFlow(replay=0, buffer=0)` + `tryEmit` 事件全丢（F-AND WIN-FAND-004 同类，Flutter 侧已修） |

### A-AND 驱动迭代记录（v1→v17 工程战记）

v1 语法/返回值坑；v2-v4 布局侦查（ServiceCard 头 Surface 合并语义→徽章不进 dump；图标行签名分类；视口仅 ~120px）；v5 硬编码滑动手势落 OtaCard→同卡重复展开 10 次（9/15）；v6 视口自校准初版仍死循环（9/16）；**探针1** 实测 scrollable 节点=1446-2016 + 卡头短码/特征值徽章可直读；v7 卡身份直读替代签名盲扫（13/18）；v8 展开前重定位（17/28）；v9 双向 bring+订阅重试（26/37）；v10 订阅后日志面板回归→滚动区 120px 行级操作不可达；v11 ensure_awake 清防误触；v12 闭环滚动（实测注入手势实效≈0.65×且快滑回弹）→ 两行签名通过；v13 重连自愈展开；v14 **清日志大窗纪律**（每次行级操作前清空恢复 570px）→ 写入全通；v15 回显等待（发现 UI 日志面板文本合并不可靠）；v16 断言迁 logcat（39/46）；v17 终轮。**结论：v12 后的持续失败全部归于 App 缺陷 006/007/008 而非驱动机制**——UI 层断言（回显 JSON/欢迎推送）在当前 A-AND 构建上结构性不可通过，功能到达性已用 logcat 计数+串口双旁证闭环。

## 环境备注

- 夹具两次重烧（`pio run -e fixture_peripheral_s3 -t upload`，COM12）；四 env（esp32dev/fixture_peripheral/fixture_observer_s3/fixture_shid_sim_s3）回归构建全绿
- 复测注意：粘性 fault 需先 `esptool --chip esp32s3 --port COM12 --before default_reset --after hard_reset chip_id` 复位
- MSYS bash 并发后台任务过多时会 `add_item failed` fork 崩溃（两次）；串口独占与 USB 瞬断（COM12 消失重现）为已知环境坑
- 证据日志含二进制字节（UTF-8 控制符），grep 需 `-a`
