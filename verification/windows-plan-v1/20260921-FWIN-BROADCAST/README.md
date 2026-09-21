# FWIN-BROADCAST · F-WIN 广播翻门控 + 双端空口验证（裁决项 #2）

- 裁决：用户 2026-09-21（四项裁决之一）——「F isSupported 翻门控+验证」。
- 基线：`608528f` 之上（与 FWIN-OBS-FIX 同批）。

## 代码改动

| 文件 | 改动 |
|---|---|
| `lib/core/ble/ble_peripheral_manager.dart` | ① `isSupported` 白名单加 `Platform.isWindows`；② `initialize()`/`isPlatformSupported()` Windows 短路 true（插件 Windows 后端**未实现 isSupported method channel**，恒 false，运行时能力以 start 实效为准）；③ UnsupportedError 文案/platform 打印更新（Windows 标注「仅厂商块入空口」）；④ 类注释入平台事实 |
| `lib/ui/pages/broadcast_page.dart` | 平台 chip 改用 `BlePeripheralManager.platformName`（修 Windows 误显「Web」的现存缺陷）；降级文案改准确（仅 Web/Linux 触发） |

插件侧事实（pub cache flutter_ble_peripheral-2.0.1 windows/flutter_ble_peripheral_plugin.cpp）：
- `start` 只读 `manufacturerId`/`manufacturerDataBytes` → `BluetoothLEAdvertisementPublisher` 厂商块发射，**不设置 LocalName/ServiceUuids**（与 WIN-017 平台事实 §4-1/4-2 完全吻合：桌面进程仅厂商块 0xFF 可发）。
- 无 `isSupported` 分支（HandleMethodCall 仅 start/stop/isAdvertising）。

## 门禁

- `flutter analyze`：No issues found!；`flutter test`：129/129
- `flutter build windows --release`：exit 0（产物含 OBS-FIX+翻门控）

## 双端空口验证（`fwin_broadcast_probe.py`，第四轮定稿 exit 0）

环境：F=新 release 产物（像素簇定位+SendInput；窗口 pid 自证防抓错遗留窗口）；
观察者=华为 TAS-AN00 A-AND（adb，onScanResult logcat 旁证行，WIN-017 同基建）。
表单默认值即 Phase A 同载荷（厂商 ID 0001 / 数据 "BLE"）。

| 断言 | 结果 |
|---|---|
| A1 手机空口收到 F 厂商块 | ✅ `39:1D:25:80:5D:BB name=null rssi=-46 adv=06ff0100424c45…`（43 包；三轮 MAC 随机：10:43:B9…/0F:05:F4…/39:1D:25…，LE 随机地址口径同 V-WIN） |
| A2 停播对照 | ⚠️ OBS（见 FWIN-BC-001）：停播 tap 后 UI 按钮已回「开始广播」（05-stopped.png），同 MAC 空口仍持续（44 包，三轮复现） |
| A3 F 进程退出后空口 | ✅ 0 包（包源=F 进程确凿，排除环境干扰） |

截图：01 首页 → 02/03 广播页开播（徽章「广播中」+平台 chip「平台：Windows」=翻门控生效）→ 04/05 停播（按钮回「开始广播」）。

## FWIN-BC-001（新观察项，OBS）

**现象**：F-WIN Windows 点「停止广播」后，UI 状态/按钮正确回 idle，但空口同一随机 MAC 持续发包；进程退出后立即静默（A3）。

- 根因候选：插件 cpp `stop` 分支（`ManufacturerData().Clear(); bluetoothLEPublisher.Stop();`）未能即时停空口——WinRT Stop() 异步完成窗口内继续发射，或 Clear+Stop 组合在该插件版本上有缺陷。插件二进制归 pub cache，不在本仓修面。
- 影响面：WIN-016「切出广播页停广播」（dispose 调同一 stop()）在 Windows 上同样只停 UI 不停空口；退出 app 才真停。
- 规避口径（交正典）：Windows 平台停广播后若需确保空口静默，退出应用；或后续换用与 V-WIN 同款直呼 WinRT 的自研通道。

## 坑位（脚本四轮迭代账）

1. 环境常驻多个 BLE Toolkit+ 遗留窗口（electron/P4 NSIS 旧实例），进程树认窗仍可能撞名 → **窗口 pid/title 自证打印**后才可信。
2. mouse_event 打的是**前台窗口**——焦点漂移时点击打空 → 每次点击前 `SetForegroundWindow`。
3. Tab 切换需**选中态验证重试**（tabbar 主蓝簇 x/W≈0.625 判定），一次点击可能不生效。
4. EMUI uiautomator 对 A-AND 返回 `null root node`（WIN-017 在册变体）→ 扫描按钮用固定坐标 tap（bounds 来自 WIN-017 hw-00 dump）。
5. `adb shell date +%m-%d %H:%M:%S` 格式串含空格被拆断（只回 "09-21"）→ `%m-%dT%H:%M:%S` 无空格再替换。
6. A-AND 入口是 `com.smartble.ui.MainActivity`（非 `.MainActivity`）。
7. `logcat -d` 是全量缓冲，对照轮判定必须按第二轮 tap 的手机时刻过滤行。
8. 进程退出后窗口句柄失效，不能再截图（bbox 崩）。

## 遗留

- FWIN-BC-001 归 OBS 台账（上面口径）；N4 正典回填时一并交 Mac。
- 本轮仅验证「开播+空口载荷+停播行为+退出静默」；广播页其余 UI（预算 31B 等）走查已由 UIALIGN 轮覆盖。
