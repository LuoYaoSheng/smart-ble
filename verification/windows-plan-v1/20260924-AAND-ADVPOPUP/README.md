# 20260924 · AAND-ADVPOPUP 手机端广播弹窗重建 · Windows×安卓联调

## 背景

用户反馈「扫描列表的点击查看广播弹窗，效果很差，手机端的」。根因两层：
- 数据层：`BleManager.kt` 扫描回调 `manufacturerData = null  // Simplified for now`（厂商块从未入模型）+ 原始广播字节只进 logcat 不进 `ScanRecord`；
- UI 层：`DeviceDetailSheet` 广播数据区仅「服务UUID N 个 / 发射功率」两行摘要。

修复对齐 uniapp 正典 `components/scan/advertisement-dialog.vue`（p001-advdlg）与桌面五壳
AdvertisementSheet 口径；Android 侧独有优势 = `ScanRecord.getBytes()` 真原始字节，
AD 结构走**真值逐段解析**（新增 `core/ble/AdvertisementParser`），非「平台解析字段重建」。

## 代码改动（apps/android）

| 文件 | 改动 |
|---|---|
| `core/model/BleDevice.kt` | `ScanRecord` 新增 `rawBytes`；equals/hashCode 字节内容敏感（含厂商/服务数据 Map 值） |
| `core/ble/BleManager.kt` | 真提取厂商块 SparseArray + `rawBytes=scanRecord.bytes`（去 null 桩）；旁证日志 DEBUG→INFO（EMUI 吞 d 级） |
| `core/ble/AdvertisementParser.kt` | 新增：AD 结构 len/type/payload 真值走读（类型名映射/名称·TX·厂商 ID·16 位 ServiceData UUID 解码/截断段收口/padding 停）/ hex 工具 / `buildAdvCopyText` |
| `ui/screen/DeviceListScreen.kt` | `DeviceDetailSheet` 重建：标题行+kv 五行（设备 ID/名称/RSSI/profileMatch/设备状态）+ 深色 ad-sec 四段（Service UUIDs / AD 结构逐段+整包 / Manufacturer Data / Service Data，缺失标注「本轮平台 API 未提供此字段」）+ 复制数据（剪贴板+Toast）/ 连接并进入 双按钮 |

门禁：`AdvertisementParserTest` 12/12 通过（含 `07 FF 0100 4757494E` 空口帧型断言），
全套 JVM 测试 0 失败，`assembleDebug` 绿。

## 联调拓扑（Windows 发射 × 安卓接收）

- 发射端：复用 20260924-AIR-GQT 三壳驱动（Q=driver_q.py / G=go test 门控 / T=cargo test 门控），
  各发厂商块 `ff 01 00 + <tag>`（CID 0x0001 + QWIN/GWIN/TWIN），hold 300s；
- 接收端：**华为 TAS-AN00（Android 12，serial FEC0220629005177）** + 新 APK（15:14 装机，
  pm grant 四权限）。小米平板 24117RK2CC（50143338，实为 zorn/MIUI 系）按用户要求停用（用户自用）。

## 结果：三壳字节级全命中

| 壳 | 广播标签 | 手机侧 MAC（随机地址） | RSSI | 弹窗 AD 结构段 | 弹窗 Manufacturer Data |
|---|---|---|---|---|---|
| Q-WIN | QWIN | 3D:EC:8E:54:04:66 | -35 dBm | `FF · 厂商数据 · 8 B` → `07 ff 01 00 51 57 49 4e` → 厂商 ID 0x0001 | `0x0001 · 4 B` → `51 57 49 4e` |
| G-WIN | GWIN | 2E:C6:31:58:CA:AD | -36 dBm | `FF · 厂商数据 · 8 B` → `07 ff 01 00 47 57 49 4e` → 厂商 ID 0x0001 | `0x0001 · 4 B` → `47 57 49 4e` |
| T-WIN | TWIN | 0A:E9:7E:FA:31:92 | -34 dBm | `FF · 厂商数据 · 8 B` → `07 ff 01 00 54 57 49 4e` → 厂商 ID 0x0001 | `0x0001 · 4 B` → `54 57 49 4e` |

帧与 20260924-AIR-GQT 空口判据完全同构（`07 ff 0100 + <tag ascii hex>`），随机地址三壳各异（每
WinRT publisher 实例独立随机地址，平台事实复证）。

### 真机弹窗其他实证（同轮顺带）

- **SHID-00000001（ESP32，10:B4:1D:CD:23:8E，-40 dBm）**：profileMatch `STRONG · smart-hid`；
  Service UUIDs 1 项 `9f1d1001-…`；AD 三段全解析——`01 · Flags(3B) 02 01 06`、
  `07 · 128 位 UUID 列表(18B)` 小端序逐字节吻合、`09 · 完整本地名称(15B)`。
- **NB-E70101150774 / "873"（Nordic UART 6e400001-…）**：双厂商段（0xFFC1 23B + 0xFFFF 10B）+
  名称段解码 `→ 873` + UUID 段——多厂商块与解码注解路径实证。
- **Windows 系统自身 MS Beacon**（厂商 ID 0x0006，随机地址轮换、一次扫描可见多台）：作为对照样本。
- **复制数据按钮**：点击后 Toast「已复制」（截图 27）；剪贴板内容 shell 侧读不出（Android 10+
  后台剪贴板限制），格式由 `buildAdvCopyText` 单测锁定（与桌面壳同口径）。

## 坑位账（本轮新增 6 条）

1. **EMUI 扫描风暴冷却（华为 TAS-AN00）**：15 分钟内 ~17 次 5s 扫描会话 → 后续会话正常注册
  （dumpsys bluetooth_manager 的 com.smartble 条目 started/stopped 递增、LowLatency 计数正常）
  但**结果投递静默归零**；重启手机后一次干净扫描恢复（发现 14 台）。联调节奏必须拉开（≥5 分钟/扫）。
2. **EMUI 吞三方应用日志**：Log.d 与 Log.i 均不可见于 logcat（shell 注入同 tag 可见，排除通道问题）；
  华为侧旁证只能走 uiautomator dump / dumpsys / 截图，logcat 通道仅小米/其他机型可用。
3. **视觉通道解法**：Read 图片用**正斜杠绝对路径**（`E:/...`）→ CDN URL 干净可被 analyze_image
  读取；反斜杠路径 → URL 含 `\` 坏链 400（20260921 断言的「PNG 目视不可用」由此翻案）。
   另：vision prompt 带选项引导会产出幻觉转录（「发现 3 台」幻觉事故），必须用中性「只转录可见文本」。
4. **uiautomator dump 在 Compose 静止空态可用**（扫描中/动画中才 never-idle）；配合 bounds 精确 tap，
  是 EMUI 上比 logcat 更稳的 UI 通道。
5. **小米 zorn（24117RK2CC/50143338）实为 MIUI 系**（com.xiaomi.bluetooth/com.miui.aod），
  记忆中「联想」标注有误；且用户要自用该设备——自动化勿碰（锁屏/AOD 会随机吞 tap）。
6. **install -r 后运行时权限可能整组掉**（两台设备均复现）：装机后必须立刻 pm grant 四权限，
  否则首启弹 GrantPermissionsActivity 吃掉盲 tap。

## 证据清单（evidence/）

- 三壳弹窗：`25/26-qwin-sheet*.png`、`30-gwin-sheet.png`、`33/34-twin-sheet*.png` + 对应 `ui-*.xml`
  （uiautomator 全文 dump，字节与截图互证）
- SHID/常规设备：`24-sheet-target.png` + `ui-24.xml`（SHID）、`ui-gwin-list.xml`（873 弹窗全文）
- 扫描轮：`20-scan-during-qwin6.png`、`28/29-gwin-scan*.png`、`31-twin-scan.png` + `ui-*list*.xml`
- 复制按钮：`27-copy-toast.png`（Toast「已复制」）
- Windows 侧驱动：`qwin4-6/gwin/twin-events.jsonl`（起播/停播事件链）+ `*-driver.log`
- 过程留痕：`01-19` 联调过程截图（含小米平板锁屏拉锯、华为 0 结果排障链）、`ui-fresh.xml`
  等；`watch_install.sh` / `watch_newphone.sh` 守望脚本

## 结论

- 手机端广播弹窗重建**联调通过**：三壳（Q/G/T）字节级命中 + SHID/常规设备全结构渲染 + 复制按钮闭环。
- 六壳广播模板的外部空口证据链（20260921 E/F/V + 20260924 晨 G/Q/T）至此再叠加
  「安卓真机弹窗消费侧」验证——发射、空口、接收、展示四层全通。
