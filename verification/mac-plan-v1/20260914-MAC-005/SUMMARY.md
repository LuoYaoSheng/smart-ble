# MAC-005 证据：Kotlin Android 原生 Smart HID 页面补齐

- Host: macOS / JDK 17(temurin) / Gradle 8.2 / AGP

## 新增实现（2026-09-14）

| 文件 | 内容 |
|---|---|
| core/profile/SmartHidMatcher.kt | 匹配（STRONG=服务 UUID / WEAK=SHID- 前缀 / NONE）+ HidRoutes（provision/detail/diagnostics/genericDetail + 扫描卡主操作 + 已连接分流）+ HidRecovery（form/pairing/diagnostics/retry/reconnect → 页面动作） |
| ui/hid/ProvisionFormState.kt | P002 表单纯状态：shid://pair 粘贴解析回填、canSubmit 规则、token 脱敏、clearSensitive/clearAll（F023 零持久化） |
| ui/hid/HidDeviceSessionViewModel.kt | P002/P003/P005 共用会话 VM：包装既有 HidProvisionController/BleManagerHidTransport（零第二套协议实现），onCleared 清敏感字段+释放会话 |
| ui/screen/ProvisioningScreen.kt | P002 三阶段：Connect（自动连接+DeviceInfo 校验）/ Configure（表单+配对码粘贴）/ Status（wifi/hub/conn/usb 四行进度+终态+恢复动作按钮） |
| ui/screen/HidDeviceDetailScreen.kt | P003：身份卡（Device Info）+ 当前状态卡 + 动作区（去配网/诊断/重读） |
| ui/screen/HidDiagnosticsScreen.kt | P005：只读快照（info/status 原始 JSON pretty 展示）+ 时间戳 + 刷新/复制 |
| MainActivity.kt | 三路由接入（底部栏隐藏）；扫描卡 Profile 主操作 → 配网；已连接 Tab 按 HidRoutes.connectedOpen 分流 |
| components/DeviceCard.kt | Smart HID 卡双入口：「配置 Smart HID」主按钮 + 「连接」软按钮 |
| screen/DeviceListScreen.kt | DeviceListContent 增 onProfileAction，按 SmartHidMatcher 决定双入口 |

## 测试（先写测试锁定行为）

- SmartHidMatcherTest（8）：强/弱/无匹配、扫描卡与已连接分流路由、路由形态、恢复动作映射、协议恢复词表域一致性
- ProvisionFormStateTest（7）：配对码解析回填/默认端口/失败保字段提示、canSubmit、clearSensitive（密码+token 清空、非敏感保留）、脱敏不泄漏、端口数字过滤

## 验证

| 命令 | 结果 |
|---|---|
| `./gradlew assembleDebug`（JDK 17） | BUILD SUCCESSFUL |
| `./gradlew testDebugUnitTest` | 75/75 全过（含新增 15 例；既有 60 例无回归） |
| `check-f023-zero-persistence` | PASS（339 文件，新文件零存储调用） |
| `check-platform-parity` | kotlin 71/71 PASS（新增文件不影响向量线） |

## 状态与限制

- 真机 E5（真实 Smart HID 设备配网链）：无真机/夹具排期 → BLOCKED（不以模拟器冒充）；Mac 无可用 Android 真机时代跑请求按计划交 Windows，代码所有权不变。
- 九页可达：P001/P002/P003/P005/P006/P007/P008/P009/P010 = 9/9。

- Status: PASS_WITH_OBS
