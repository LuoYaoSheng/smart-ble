# F006–F012 GATT 域总结（2026-09-07，run-id 20260905-1726-1b793ca）

## 结论

| 线 | 结论 |
|---|---|
| F-AND（Flutter→Android→三星 E5 R5CR1284Y7H） | **PASS**（v12，`00:37 +1: All tests passed!` exit=0） |
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

## 环境备注

- 夹具两次重烧（`pio run -e fixture_peripheral_s3 -t upload`，COM12）；四 env（esp32dev/fixture_peripheral/fixture_observer_s3/fixture_shid_sim_s3）回归构建全绿
- 复测注意：粘性 fault 需先 `esptool --chip esp32s3 --port COM12 --before default_reset --after hard_reset chip_id` 复位
- MSYS bash 并发后台任务过多时会 `add_item failed` fork 崩溃（两次）；串口独占与 USB 瞬断（COM12 消失重现）为已知环境坑
- 证据日志含二进制字节（UTF-8 控制符），grep 需 `-a`
