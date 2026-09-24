# 20260924-AIR-GQT — G/Q/T 三壳广播外部空口闭环（用户「那就测试下，这边有Windows和安卓手机」）

## 背景与目标

20260924-WIN-F004 轮把广播模板复制到 G/Q/T 三壳后，遗留 OBS = **外部空口收包待手机窗口**
（平台事实：本机无线电不自环——广播中本机 bleak 可见 SHID 116 帧、自身厂商块 0 帧，
空口验证必须外部接收端）。本轮用户提供了 Windows + 安卓手机环境，目标：

> G/Q/T 三壳各自走「未播基线 0 命中 → 启播手机收包 ≥1 → 停播后 0 命中」闭环。

V/E/F 三壳不重复：20260921-XDEV-BROADCAST A2 已空口实证 V（31 包/5s）、
EWIN-BRIDGE 轮实证 E（44 包/停播真停）、XDEV 轮实证 F（06ff0100424c45）。

## 环境

- Windows 10 22H2 本机蓝牙适配器（发射侧，WinRT 随机地址）
- 接收端：**联想平板 24117RK2CC（product zorn，Android 16，1080x2400@450dpi，序列号 50143338）**
  ——注意与 20260921 轮的华为 TAS-AN00 不是同一台
- 手机侧工具：A-AND（apps/android，com.smartble.android）20260921-09:02 构建
  （BleManager.kt:501 旁证行自 a5929b2 后未改，包内新鲜无需重建），`adb install -r -g` +
  四权限 pm grant（SCAN/CONNECT/ADVERTISE/FINE_LOCATION；ZUI 忽略 -g 需逐条补授）
- 定位服务 mode 3（SCAN 无 neverForLocation 标志，需定位开启才有扫描结果）

## 方法

- 载荷判据：厂商块 CID 0x0001 + 4 字节壳标签 → 手机侧 adv hex 前缀 `ff0100` + 标签 hex
  （GWIN=4757494e / QWIN=5157494e / TWIN=5457494e）
- 每壳三窗（A-AND 5s 自动停扫描会话；`logcat -c` → 盲 tap 起扫 → 5.8s → `logcat -d -s BleManager`）：
  ① baseline（驱动未起，应 0 命中）② started 事件后（应 ≥1 命中）③ stopped 事件后（应 0 命中）
- Windows 侧驱动走各壳**正式发射路径**，事件 jsonl 落盘轮询（绕 go test/cargo 输出缓冲）：
  - G：`winbridge_air_test.go`（env 门控 AIR_TAG）走 `NewApp().StartAdvertising("GWIN",nil,"0x0001","GWIN",false)` 全路径
  - Q：`driver_q.py` 导入正式模块 `win_broadcast.WinBroadcastBridge`
  - T：`win_bridge.rs::tests::bridge_air_capture`（env 门控）走 `win_bridge::start(0x0001, tag)`
  - 门控行为验证：无 env 时 Go SKIP / Rust 空过（0.00s），常规门禁不受影响
- 编排器 `air_orchestrator.py`：三窗 × 三壳全自动，产出 `air-summary.json`

## 结果（全真机空口）

| 壳 | 标签 | baseline | on 窗命中 | off 窗 | 发射地址(随机) | RSSI 样例 | 判定 |
|---|---|---|---|---|---|---|---|
| G-WIN | GWIN | 286 行 0 命中 | **34 包** | 276 行 0 命中 | 13:44:B5:6A:6E:69 | -35~-41 | **PASS** |
| Q-WIN | QWIN | 130 行 0 命中 | **29 包** | 317 行 0 命中 | 1B:A7:AC:71:FC:BA | -34~-38 | **PASS** |
| T-WIN | TWIN | 330 行 0 命中 | **31 包** | 312 行 0 命中 | 24:DA:52:22:04:4E | -39~-49 | **PASS** |

字节级保真（与 20260921 平台事实一致：仅厂商块、无 Microsoft CID 劫持）：

```
G: 07 ff 0100 4757494e  (len07 | 0xFF | CID 0x0001 LE | "GWIN")
Q: 07 ff 0100 5157494e
T: 07 ff 0100 5457494e
```

三壳各自的 WinRT publisher 用**各自独立随机地址**（三窗三 MAC 互不相同）。

## 门禁

- G：`go vet ./...` 0 输出；`go test -count=1 ./...` ok（含 8s 真发射 roundtrip + air 门控 SKIP）
- T：`cargo test` 2 passed 0 failed（roundtrip + air 空过）
- Q：无 app 代码改动（复用 win_broadcast.py 原样）；驱动/编排器为证据侧脚本
- 手机动画缩放借调后已恢复（0→1）

## 坑位账（新设备 24117RK2CC）

1. **ZUI 安装限制**：锁屏状态下 `adb install` 直接 INSTALL_FAILED_USER_RESTRICTED（连确认弹窗都不出）；
   先 `input keyevent 82` 划开（无密码锁）再装即 Success；且 `-g` 被忽略，权限须逐条 `pm grant`
2. **Compose 永不闲态**：uiautomator dump 持续 "could not get idle state"（关三个动画缩放也无效）
   → 放弃 dump，改**盲 tap + logcat 验证**：按正典布局推算 ScanTool 右侧主按钮坐标 (870,370)，
   tap 后看 `BleManager: Scan started` 确认命中，一次即中
3. **CDN 截图链路坏**：Read PNG 返回的对象 URL 含未编码反斜杠（Windows 路径），analyze_image 报
   1210 解析错误；URL-encode %5C 也救不回 → 目视路线不可用，一切以 logcat 为准
4. **Git Bash 路径转义**：`adb pull /sdcard/...` 被 MSYS 改写成 `C:/Program Files/Git/sdcard/...`，
   须 `MSYS_NO_PATHCONV=1`（既有坑，本轮再遇）

## OBS 收口

- **「G-Q-T 外部空口收包待手机窗口」→ 本轮销账**：三壳空口收包+停播即消失+字节保真全实证。
- 广播模板六壳（E/F/V 20260921 + G/Q/T 本轮）空口证据链闭合。

## 文件

- `air_orchestrator.py` 编排器；`driver_q.py` Q 驱动
- `evidence/air-summary.json` 判定汇总；`evidence/{G,Q,T}-{baseline,on,off}.log` 九窗原始 logcat；
  `evidence/{G,Q,T}-driver.log` 驱动输出；`evidence/driver-events.jsonl` 事件流；
  `evidence/00-phone-home-raw.png` 手机侧起点截图（CDN 坏链路未目检，仅存档）
