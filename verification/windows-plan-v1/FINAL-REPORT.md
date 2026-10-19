# Windows 主机实现线 · 最终交付报告（WIN-001～WIN-017）

> 任务来源：`docs/plans/2026-09-14-windows-host-implementation-plan.md`（WIN-010 步骤 1～5）。
> 报告日期：2026-09-21（P5 最终交付轮；同日 F-WIN GATT 补证轮增补，见 §6 末）。报告基线：`a1215a8` + 本轮看板/证据提交（准确哈希以看板行为准）。
> 性质声明：本报告 = **Windows 线交付**，不是全产品发布；跨平台总门禁归 Mac（消费本报告 §3/§4 回填 `docs/specs/09_test/` 各矩阵）。

## 1. 总览

- 六壳（E-WIN Electron / T-WIN Tauri / V-WIN Avalonia / F-WIN Flutter / Q-WIN PySide6+bleak / G-WIN Wails+Go）全部至少 `PASS_WITH_OBS`。
- 看板终态（17 项）：`PASS` 2（WIN-002、WIN-015）/ `PASS_WITH_OBS` 13 / `IN_PROGRESS` 0 / `FAILED` 0 / `BLOCKED` 2（WIN-007、WIN-008）/ `TODO` 0。含糊 TODO 已按 WIN-010 步骤 2 清零。
- 交付物：8 个安装/分发产物（六壳，x64，均未签名 → 一律只标 **Preview**），SHA256/体积/新鲜度全在册（§5）。
- 最终验证轮（§6）：六壳静态/单测门禁全绿 + 真机 BLE 双探针（bleak 层 + Q-WIN app 级 12/12）在报告基线上复跑通过。

## 2. 任务台账（WIN-001～017）

| ID | 状态 | 关键 commit | 证据目录 | 要点 |
|---|---|---|---|---|
| WIN-001 基线与工具链 | PASS_WITH_OBS | `760dc16` | `20260914-WIN-001/` | 工具链快照落档；JDK 无 17/21（Windows 线不消费） |
| WIN-002 共享测试全绿 | PASS | （见 20260914 轮） | `20260914-WIN-002/` | 桌面共享测试 95/95；M1 断言改消费正典产物 |
| WIN-003 E-WIN | PASS_WITH_OBS | 20260918 重测 | `20260918-WIN-ALL/electron/` | build:win + CDP 真机全链；P4 干净安装冒烟复验 |
| WIN-004 T-WIN | PASS_WITH_OBS | 20260918 重测 | `20260918-WIN-ALL/tauri/` | fmt/check/test/build + T1-T16 真机链；DEF-001 重连死句柄已修（20260918-WIN-DEF-FIX retry 探针全绿） |
| WIN-005 V-WIN | PASS_WITH_OBS | `6f46caa` UI 收口 / `a5929b2` 广播 | `20260918-WIN-DEF-FIX/`、`20260920-VWIN-UIALIGN{,2}/`、`20260921-XDEV-BROADCAST/` | BLE 功能缺陷清剿；UI 正典三轮（UIFULL 16/16 → UIALIGN 81/81 → UIALIGN2 92/92）；单测 55/55；本轮终验 55/55 复绿。OBS=P4 登记的「自包含 exe 无 Win32 版本资源」 |
| WIN-006 真实 GATT/重连回归 | PASS_WITH_OBS | 20260918-WIN-DEF-FIX | `20260918-WIN-ALL/`、`20260918-WIN-DEF-FIX/` | E/T/V 真机 GATT 链+重连 retry 探针全绿。OBS=fixture_peripheral_s3 对应固件复验（烧录记 SHA）挂 P3 硬件窗口 |
| WIN-007 Smart HID E2E | BLOCKED | — | `20260918-WIN-007/` | 缺 ControlHub 与一次性配对码环境；UI/传输代码已存在 |
| WIN-008 OTA E2E 回归 | BLOCKED | — | （历史两线曾 PASS_WITH_OBS） | 依赖 P3 硬件窗口（OTA 固件场景 + WIN-006 fixture 复验）；重启后版本回读须设备侧独立证据方可升级结论 |
| WIN-009 六壳安装包 | PASS_WITH_OBS | `3fc5a78` | `20260921-P4-PACKAGING/` | 8 产物+SHA256；E(NSIS)/T(NSIS) 干净安装闭环含 CDP 真首扫；T MSI 非提权 1603 待管理员窗口；8 OBS+8 坑位见该 README |
| WIN-010 最终交付与矩阵回填 | PASS_WITH_OBS | 本轮 | `20260921-P5-FINAL/`、本文件 | 本报告；遗留台账见 §7 |
| WIN-011 导航一致性 | PASS_WITH_OBS | `4c9cb50` | `20260920-WIN-011/` | N3 双壳对齐正典五态+CDP 回归。OBS=N4 广播 Tab 两案待用户裁决（上游决策，不阻断 N3 交付） |
| WIN-012 F-WIN 立项 | PASS_WITH_OBS | 20260920 | `20260920-FWIN-GWIN/flutter/`、`20260921-FWIN-GATT-WALK/` | windows runner + FBP 1.36.8/winrt 0.0.20；真机扫描 3 台含 SHID；P002 扫码 Windows 降级（粘贴单路径）。**同日补证轮（5737759 基线）：Windows 侧 GATT 真机走查闭合**——连接/枚举 1svc/3char/读 INFO 130B/STATUS 订阅 + 新平台事实 §4-8（扫描并发枚举 0）；OBS：O-2 退订后弹回列表（未插桩）、O-3 显示名未映射、O-4 写未真机（建议补 INPUT 护栏后并入下轮） |
| WIN-013 G-WIN 立项 | PASS_WITH_OBS | `fde9bac` | `20260920-GWIN-FULL/` | E-WIN 前端字节级镜像 + Go 全 GATT 后端；全页走查 23/23 真机；GWIN-DEF-001 已修 |
| WIN-014 Q-WIN 立项 | PASS_WITH_OBS | `d311c22` | `20260921-QWIN-GATT/` | GATT 全原语 + INPUT 写护栏（SHID-FW-LOCK-001 代码级）；真机走查 12/12；本轮 P5 复跑 12/12（§6） |
| WIN-015 六壳图标统一 | PASS | `2f3e4c2` | （该轮提交内） | 六壳 .ico sha256=`42139766…` 字节级一致 |
| WIN-016 流程韧性对齐 | PASS_WITH_OBS | `2f3e4c2` | （该轮提交内） | busy 退出确认/停广播再断连/切页停广播等正典对齐 |
| WIN-017 跨端广播联调 | PASS_WITH_OBS | `a5929b2` | `20260921-XDEV-BROADCAST/` | V-WIN WinRT 真发射参考实装 + 华为 Mate 30 双向空口字节级实证；平台事实见 §4-1/4-2 |

正典 UI 对齐追加轮（用户指令触发，挂靠 WIN-005/012/014 质量账）：UIALIGN-TABBAR `ff679c6`（F/Q 底栏 64px 正典）、UIALIGN-PAGE `a1215a8`（Q 五页正典重写 + F 重建锁亮入产物，双壳双层级探针 GREEN；产物级探针含 FWIN/QWIN 重建包）。

## 3. 六壳功能矩阵（Mac 回填 `CROSS_IMPLEMENTATION_PARITY_MATRIX` §3 记分卡 Windows 列可直接取用）

图例：✔=真机证据；✔ᵐ=移动端同源代码真机证据（Windows 侧未独立取证）；◐=实装在但 Windows 真机取证缺口；⤓=正典降级（有据）。

| 能力 | E | T | V | F | Q | G | 证据锚点 |
|---|---|---|---|---|---|---|---|
| 扫描（真机） | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | P4 CDP 首扫 8/7 台；本轮 bleak 11 台；各立项轮 |
| 连接+服务枚举 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | 20260918-WIN-ALL；Q 本轮 1svc/3char；F=补证轮 1svc/3char（§6 末，注⁶） |
| 读（INFO 身份） | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Q 130B JSON fw1.2.0；F 补证轮 130B 同构 |
| 写（带响应=PARITY-007） | ✔ | ✔ | ✔ | ✔ᵐ⁶ | ✔¹ | ✔² | 20260918 写探针矩阵；注¹²见下 |
| Notify 订阅/退订 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | Q STATUS 订阅语义断言；F 补证轮订阅绿态+0 推送口径 |
| 广播（外设模式） | ⤓ | ⤓ | ✔³ | ⤓ | ⤓ | ⤓ | V=WIN-017 真发射（§4-1）；其余五壳正典降级口径 |
| 扫码配对（P002） | ✔ | ✔ | ✔ | ⤓⁴ | ✔ | ✔ | F=mobile_scanner 无 Windows 实现→粘贴单路径 |
| 生命周期/退出确认 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | WIN-016 + 各壳走查（busy 模态实测） |
| 正典 UI（tokens/布局） | ✔ | ✔⁵ | ✔ | ✔ | ✔ | ✔⁵ | UIALIGN 三轮探针（81/81、92/92、28/28、21/21） |
| 安装/分发产物 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | P4 8 产物+SHA256（§5） |

- 注¹：Q 写=INPUT 特征**代码级护栏**（SHID-FW-LOCK-001 设备保护，发送被拦实证，见 `20260921-QWIN-GATT` P006-write-guard）；写原语本身实装（带响应）。
- 注²：G 写=Go 后端带响应写实装+动作面在列；FW-LOCK 态下真机写会按设备侧 0x0D 失败（设备态，非壳缺陷；断电恢复验证挂 P3 顺带）。
- 注³：V-WIN 广播仅厂商块 0xFF 可发（平台事实 §4-1）——功能成立但空口无名/UUID，N4 裁决输入。
- 注⁴：F P002 在 Windows 的降级=正典登记（粘贴兜底单路径），非缺陷。
- 注⁵：T/G 前端与 E-WIN 字节级同源（G 已 diff 验证；T 共享 public 树），UI 探针以 E 为源点覆盖。
- 注⁶：F 的 GATT 链（连接/枚举/读/Notify）= 补证轮真机实证（`20260921-FWIN-GATT-WALK`，858B 剪贴板文本主证）；**写**仅移动端同源证据——FW-LOCK 铁律跳过真机写 + F 无 Q 式 INPUT 护栏（补护栏后可取证，OBS O-4）。

## 4. 平台事实与差异（交 Mac 更新正典 §2「允许的平台差异」）

1. **WinRT 桌面广播仅厂商块 0xFF**：LocalName/ServiceUuids 一律 `Start()` 拒绝、空负载拒；无 Microsoft CID 劫持；LE 用随机地址（adv-probe 二分实证，`20260921-XDEV-BROADCAST`）。⇒ N4 广播 Tab 两案裁决的关键输入。
2. **ADV 帧冲掉 SCAN_RSP 名**（VWIN-DEF-011）：厂商块 ADV 与 SCAN_RSP 双事件若同 RSSI 去重且无条件覆盖名字，会显示空名；修法=只在非空覆盖（收「Mate 30 5G」卡片为证）。
3. **未配对会话 GATT 枚举仅 9f1d 一服务**：tinygo（G-WIN）与 bleak（Q-WIN）双栈复现；配对窗口回验挂 P3。
4. **未配对态 STATUS 零推送**：按订阅态断言（订阅/退订 UI 与回调注册实证）。
5. **Windows BLE 系统缓存**：OTA 重启后重扫/重连/版本回读可能读到缓存值 ⇒ WIN-008 验收要求设备侧独立证据（串口/日志）才可 `PASS_WITH_OBS`。
6. **INPUT 特征设备锁**（SHID-FW-LOCK-001）：~44B 无效载荷后 INPUT 写持久回 ATT 0x0D（三栈同败）；断电是否恢复未验（P3 顺带）。Q-WIN 已代码级护栏。
7. **安装器**：T MSI 需提权（非提权 1603）；E 便携版壳/真身双层进程名、首启慢；E/T 桌面快捷方式同名互踩；tauri NSIS DisplayName 无版本号；V/G exe 无 Win32 版本资源；F 版本口径 pubspec 2.0.0+1 未入 VERSION 单源（P4 OBS 全账见该 README）。
8. **F-WIN（FBP winrt）扫描并发下连接 ⇒ 服务枚举 0**（补证轮实证）：扫描进行中点「连接」→ `发现 0 个服务`（页面空态）；停扫后重连 → 1 服务/3 特征全通。同会话两尝试对照、走查后 bleak 复核排除设备态漂移（`20260921-FWIN-GATT-WALK`）。⇒ **正典口径：连接前停扫**（Windows 桌面通用守则）。附带：退订 STATUS 后 F 页面弹回列表（根因未插桩，OBS O-2）。

## 5. 交付产物（全部 x64 · 未签名 ⇒ 一律 **Preview**）

| 产物 | SHA256（前 8） | 字节 | 说明 |
|---|---|---|---|
| EWIN-smartble-electron-1.0.5-setup-x64.exe | `ffdbc099` | 81,169,533 | NSIS；干净安装闭环√ |
| EWIN-smartble-electron-1.0.5-portable-x64.exe | `f67d45fa` | 80,933,097 | 便携；启动冒烟√ |
| TWIN-smartble-tauri-1.0.5-nsis-setup-x64.exe | `42ccb83b` | 2,638,909 | NSIS；干净安装闭环√（WebView2 依赖系统拉取） |
| TWIN-smartble-tauri-1.0.5-msi-x64.msi | `0c99a1ea` | 3,710,976 | 非提权 1603，待管理员窗口冒烟 |
| VWIN-smartble-avalonia-selfcontained-win64.zip | `0d99176c` | 55,155,851 | 自包含；启动冒烟√ |
| FWIN-smartble-flutter-release-win64.zip | `d37d736c` | 33,890,955 | Release；含 themeMode 锁亮修复（UIALIGN-PAGE 重建） |
| QWIN-smartble-qt-1.0.5-venv-win64.zip | `42b9c4ce` | 251,173,030 | venv 自包含；页面级正典重写入包（UIALIGN-PAGE 重建） |
| GWIN-smartble-wails-1.0.5-x64.exe | `4bb554d0` | 13,049,344 | 单 exe；启动冒烟√ |

全量哈希见 `20260921-P4-PACKAGING/artifacts/SHA256SUMS.txt`。产物新鲜度：六包 mtime 均晚于各自源树最新源文件（本轮逐一核验，见 §6）；FWIN/QWIN 为 UIALIGN-PAGE 轮重建包（旧包不含修复的教训已入账）。

## 6. 最终验证轮（2026-09-21 P5，报告基线上复跑）

| 壳 | 门禁 | 结果 |
|---|---|---|
| E-WIN | `node --check` 全量 18 文件（跳过 bundle/vendor） | √ |
| T-WIN | `cargo fmt --check`；`cargo test`（src-tauri） | √；3 测试目标 ok（该 crate 设计上 0 单测，功能证据=T1-T16 真机链+P4 冒烟） |
| V-WIN | `dotnet test` | 55/55（2 条历史编译警告 CS4014/CS1998 在册） |
| F-WIN | `flutter analyze`；`flutter test` | 0 issues；123/123 |
| Q-WIN | `compileall`；无头契约冒烟 | √；17/17 |
| G-WIN | `go vet`；`go build` | √；√ |

真实 BLE 冒烟（真机 ESP32-S3 = SHID-00000001，fw 1.2.0，未配对态）：

1. **bleak 层探针**（`evidence/ble-smoke-bleak-probe.txt`）：扫描 11 台、目标 -47dBm；连接 MTU 256；枚举 1 服务/3 特征；INFO 读 130B 完整 JSON；STATUS 订阅/退订正常（未配对 0 推送=已知口径）。
2. **Q-WIN app 级走查 12/12**（`evidence/ble-smoke-app-walkthrough.txt` + 13 截图）：真扫描 11 台 SHID 恒居首（-42dBm）→ 连接 GATT 树 → INFO 读 → STATUS 订阅语义 → INPUT 写护栏拦截实证 → P007 会话 → busy 退出确认 → 全断 → 广播降级口径 → 关于 → 常驻退出 exit 0。

构建：不重构建（六产物已核新鲜，哈希在册）；产物级页面探针 GREEN 于 UIALIGN-PAGE 轮（FWIN/QWIN 重建包）。

**P5 后补轮（同日，用户指令「继续」）：F-WIN Windows 侧 GATT 真机走查**（`20260921-FWIN-GATT-WALK/`，基线 5737759）——连接/枚举 1svc(9F1D1001)/3char/读 INFO 130B/STATUS 订阅全通，858B 剪贴板文本主证 + 走查后 bleak 只读复核设备无恙（全程零写入）；§3 F 列三行升 ✔、§4 新增事实 8、§7 缺口销账；WIN-012 OBS 更新（O-2/O-3/O-4）。

## 7. 未结论化项与遗留台账（唯一权威清单）

**BLOCKED（看板口径，缺外部条件）**

- WIN-007 Smart HID E2E：缺 ControlHub 与一次性配对码环境。
- WIN-008 OTA E2E：待 P3 硬件窗口（OTA 固件场景 + WIN-006 fixture_peripheral_s3 复验烧录记 SHA + SHID-FW-LOCK-001 断电恢复顺带验证 + G/Q 未配对枚举的配对窗口回验）。

**用户裁决项（本线不自行决定）**

1. N4 广播 Tab 显隐两案（A 按能力显隐 vs B 恒显+未就绪徽章）；关键输入=§4-1 平台事实。
2. F-WIN 广播升级（flutter_ble_peripheral Windows 后端翻 `isSupported` 门控+真机验证）是否立项。
3. E/T/G/Q 广播升级（对齐 V-WIN 参考实装）是否立项。
4. T MSI 干净安装冒烟需管理员窗口（P4 OBS-1）。

**已登记技术遗留（不阻断交付）**

- ~~F-WIN Windows 侧 GATT 连接链无独立真机走查~~ → **已闭合**（P5 后补轮 `20260921-FWIN-GATT-WALK`，§6 末）；余留 OBS：O-2 退订后弹回列表（未插桩）、O-4 写真机取证（待 F 补 INPUT 护栏）——均并入下一真机窗口。
- F 页面内深层（P006 双栏、P002 系）无自动化缝，未做像素级探针（UIALIGN-PAGE §7）；功能与移动端同源已验（本轮剪贴板缝可作 P006 文本级断言参考）。
- 六壳均未签名 ⇒ 全部仅 Preview；签名凭据不入库。
- Windows BLE 缓存对 OTA 重启回读的影响未定论（随 WIN-008）。

## 8. 复现速查

```bash
# 六壳门禁
cd apps/desktop/electron && find src public -name "*.js" -not -path "*node_modules*" -not -name "*.bundle.js" -not -path "*vendor*" -exec node --check {} \;
cd apps/desktop/tauri/src-tauri && cargo fmt --check && cargo test
cd apps/desktop/avalonia/SmartBLE.Desktop.Tests && dotnet test
cd apps/flutter && flutter analyze && flutter test
cd apps/desktop/qt && ./.venv-pkg/Scripts/python.exe -m compileall -q main.py theme.py widgets.py tabbar.py ble_service.py automation.py
cd apps/desktop/wails && go vet ./... && go build ./...
# 真机 BLE（bleak 层）
cd apps/desktop/qt && ./.venv-pkg/Scripts/python.exe ../../../../verification/windows-plan-v1/20260921-QWIN-GATT/qwin-gatt-probe.py
# Q-WIN app 级 12 项（本轮副本，已改指 venv python）
node verification/windows-plan-v1/20260921-P5-FINAL/qwin-gatt-walk-p5.mjs
# Q 无头契约冒烟 17 项
QT_QPA_PLATFORM=offscreen apps/desktop/qt/.venv-pkg/Scripts/python.exe verification/windows-plan-v1/20260921-UIALIGN-PAGE/evidence/smoke_q_offscreen.py
```

环境锚点：Windows 10 22H2 (10.0.19045)；node 20.19.3（CDP 场景需 nvm 23.8）/ cargo 1.98.1 / dotnet 9.0.200 / flutter 3.38.3 / go 1.24.0 + wails 2.16.0 / python 3.13.2（bleak 3.0.2）。
