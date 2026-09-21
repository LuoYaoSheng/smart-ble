# FWIN-OBS-FIX · F-WIN 三观察项代码侧收口（O-3/O-4/O-2）

- 基线：`608528f`（FWIN-GATT-WALK 轮之上）
- 范围：终报 §7 OBS 清账的第一梯队代码侧——O-3 直接修复、O-4 护栏落地（真机取证并入下轮真机窗口）、O-2 插桩缝（真机定位并入下轮真机窗口）

## O-3 · 9f1d 家族显示名映射（已修复）

- 根因：`lib/core/models/ble_uuids.dart` 注册表缺 9f1d 家族条目，P006 详情页服务/特征显示「未知服务/未知特征值」。
- 修复：`_serviceNames` 增 `9f1d1001…1c04 → Smart HID 配网服务`；`_characteristicNames` 增 `1002→设备信息 (INFO)`、`1003→配网数据写入 (INPUT)`、`1004→设备状态 (STATUS)`。键=完整 32 位小写（与 4fafc201 精确匹配同法，避免前缀误标）；文案与 Q-WIN `ble_service.py` SERVICE_NAMES_CN/CHAR_NAMES_CN 逐字同源。
- 单测：`test/core/ble/ble_uuids_shid_test.dart`（带连字符/大写两种形态 + 标准 16 位回归）。

## O-4 · INPUT 写护栏（SHID-FW-LOCK-001，代码级双重保险已落地）

- 语义：对齐 Q-WIN 护栏（发送被拦、零设备风险），文案逐字一致「INPUT 特征写入已被禁用（SHID-FW-LOCK-001 设备保护）」。
- 落点双层：
  1. manager 层 `BleManager.writeCharacteristic` 开头拦截（纵深防御）；
  2. UI 层 `DeviceDetailPage._writeCharacteristic` 开头拦截（不弹写对话框直接拒绝）——覆盖单次/批量/循环三条路径。
- 配网正业不受影响的关键事实：`provisioning_transport.dart` 直写 FBP characteristic 对象（`input.write(...)`），不经 `writeCharacteristic`；OTA 写 beb5 特征同样不在拦截面。
- 单测：manager 层护栏断言（护栏在 FBP 调用前抛出，无需平台通道/连接）。
- **真机取证待下轮真机窗口**：走查 P006 点 INPUT 行「写」→ 预期日志出现禁用文案、写对话框不弹、bleak 只读复核设备无恙。

## O-2 · 退订 STATUS 后页面弹回列表（插桩缝，根因待真机定位）

- 静态排查结论：**详情页无任何自动 pop 路径**——全仓 pop 枚举后，P006 返回列表的唯一路径是「断开」按钮 `_disconnect`；device_list_page 两处 pop 均为关加载对话框（连接成功/失败各一）。故「弹回列表」假说收敛为二：
  - H1 走查驱动点击误伤（退订后行位移致坐标过期，命中「断开」）；
  - H2 FBP Windows 退订触发伪断连 → 状态流混乱连锁（页面本身不会 pop，需证据排除）。
- 插桩（全部进 logger.history，随「导出」剪贴板文本带出）：
  - `device_detail_page` `_disconnect` 入口：「断开连接（用户操作），即将返回设备列表」
  - `device_detail_page` dispose：「P006 详情页 dispose（路由已弹出）」——与上一条的时间差即定位线索
  - `device_detail_page` 状态流 reconnecting 分支：「连接状态流：设备 … 中断，等待自动重连」（H2 验证/证伪）
  - `device_list_page` 两处对话框 pop 前后：「连接成功/失败，关闭加载对话框」（排除迟到 pop 竞态）
- 下轮真机窗口走查退订操作后导出剪贴板文本，时间线即可裁决 H1/H2。

## 门禁

- `flutter analyze`：No issues found!（0 issues）
- `flutter test`：129/129 All tests passed!（在册 123 + 本轮新增 6）
- `flutter build windows --release`：见下方执行记录

## 执行记录

| 项 | 结果 |
|---|---|
| 修改文件 | `ble_uuids.dart` / `ble_manager.dart` / `device_detail_page.dart` / `device_list_page.dart` + 新增 `ble_uuids_shid_test.dart` |
| analyze | 0 issues |
| test | 129/129 |
| build | （本文件提交时回填） |
| 真机 | 未跑（并入下轮真机窗口：O-4 取证 + O-2 定位 + O-3 目检一并） |

## 遗留

- O-4 真机取证、O-2 根因定位、O-3 目检 → 下轮真机窗口（与 P3 硬件窗口可合并，见主线计划）。
