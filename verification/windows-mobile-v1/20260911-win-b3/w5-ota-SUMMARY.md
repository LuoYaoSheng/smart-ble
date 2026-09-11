# W5 · E3 OTA 实刷收口（2026-09-11，Windows 机 / refactor/uniapp-v1@4eae543 之后）

主矩阵 F025 桌面证据轮。判定口径（计划书 W5）：桌面 OtaDialog 对 ESP32 真刷全链
**选包 → manifest 校验 → start/ready → 分块下发 → ACK 进度 → commit → 校验/复位 → 版本回读**。
基线 = 串口刷入 HEAD（4eae543）构建的 `fixture_peripheral_s3` 1.0.0（erase_flash 后四镜像写入，
boot 帧 `git_sha=4eae543` 实证；开盘烧录固件为 835f1cf 期产物，不含 9706ac9 DEV-014 OTA 修复，故必刷）。

## 结果

| 线 | 版本迁移 | UI 链（CDP 驱动） | 设备侧交叉 | 结论 |
| --- | --- | --- | --- | --- |
| E-WIN | 1.0.0 → 1.0.2 | 11/12（唯一 FAIL=复位后重连 UI 读 26a8 不回调，见观察项） | 串口 `ota success received:570480 total:570480 target_version:1.0.2` → rst → `boot firmware_version:"1.0.2"` | **PASS_WITH_OBS** |
| T-WIN | 1.0.2 → 1.0.3（+ 取消分支） | 14/15（同上观察项） | UI success 帧文本 + noble 直读 `firmware_version:"1.0.3"`（uptime 138=OTA 重启后）；串口探针因 E-WIN 探针占用 COM12 未起（PermissionError 13，§4.6 已记） | **PASS_WITH_OBS** |
| 剥离实验 | 1.0.0 → 1.0.1（纯 noble，带响应） | — | 串口 success 570480/570480 → rst → boot@1.0.1（withresp-isolation-leanbench-serial.txt） | 根因定位证据 |

取消分支（T-WIN）：ready 后取消 → `已取消（op:abort 已发送）` → 重开弹窗重选包 → ready 再达 → 全链完成
（固件 abort→IDLE→重启会话语义验证）。

## 缺陷账本（5 真缺陷 + 2 测试环境坑，全部本轮修复/规避）

1. **PARITY-007（E-WIN/T-WIN，P1）OtaDialog DATA 用 writeNoResponse → Windows BLE 栈字节级腐败**
   现象：570480B 传输尺寸守恒但设备侧 sha256 不符 → commit `OTA_HASH_MISMATCH`（run8，
   firmware-serial-run3…之后轮次）。剥离：同镜像同链路带响应写 → commit SUCCESS+复位+boot 新版本。
   修复：双线 DATA 改带响应写（ATT ack 逐块=契约「分块 ACK」本义）。传输 570KB ≈ 390-425s。
2. **DEV-014b（固件）CORE_DEBUG_LEVEL=5 日志洪水 → 任务看门狗**
   nimble_host 在回调内对每块打 4 行 DEBUG（含整段 hex 转储）灌 115200 UART → 发送阻塞 →
   IDLE0 饿死 → abort（run3 @16s，cdp-result-run3-wdt / firmware-serial-run3-wdt）。
   修复：三环境统一 `CORE_DEBUG_LEVEL=1`（JSON 串口事件走独立 print，证据流不受影响）。
3. **DEV-014c（固件）32KB 整环单次落盘 → 中断看门狗**
   `Update.write(整环)` flash 编程临界区 ~350ms > TG0WDT 300ms → 高速率传输 87% 复位（run5；
   对照：慢速 155B/s×640s 零复位=占空比相关）。修复：loop 排水限 `kOtaDrainBatch=4KB`（~50ms/批）。
4. **DEV-014d（固件）OTA 后未 confirm → 下次复位滚回旧分区**
   新镜像未调 `esp_ota_mark_app_valid_cancel_rollback()` → bootloader 回滚 ota_0（boot 帧版本回落）。
   修复：main.cpp setup() 幂等 confirm。
5. **APP（双线）每块同步刷 DOM → 软件渲染下传输循环饿死**
   3169 次/轮 statusText+进度条更新，`--disable-gpu` 软渲染下 ~1s/块。修复：整百分比节流（≤100 次/轮）。
   环境坑 A：本机 Electron GPU 进程偶发崩溃循环（0xC0000409）→ 启动重试策略（CDP 探活）；
   环境坑 B：manifest size 笔误（570432≠570480）被对话框实测校验诚实拦截（反向验证了包校验链）。

## 已知观察项（不阻断 F025 桌面结论）

- **OTA 复位后重连 UI 读 26a8 不回调**：noble-winrt/btleplug 在对端 GATT 重启后 readCharacteristic
  无响应（readSysInfo×4 重试仍 none）。读路径本身 W3 F008 已真机验证；本轮版本回读由
  串口 boot 帧（E-WIN）+ noble 直读（T-WIN）承担。双线同症状，归 Windows BLE 栈重连后缓存查询行为。
- F025 三移动线 BLOCKED(P-03) 维持；解除与否归正典裁决（裁决队列），本轮只产证据。

## 复现口径

```bash
# 固件三镜像（platformio.ini 已含级别/排水/confirm 修复；版本经 61 行临时改+还原）
~/.platformio/penv/Scripts/pio.exe run -e fixture_peripheral_s3                 # 1.0.0 基线
# sed 61 行版本 → 1.0.2 / 1.0.3 依次构建（产物在 w5-ota/firmware/，sha256.txt 对账）
~/.platformio/penv/Scripts/esptool.exe --chip esp32s3 --port COM12 --baud 921600 erase_flash
~/.platformio/penv/Scripts/esptool.exe --chip esp32s3 --port COM12 --baud 921600 \
  write_flash 0x0 bootloader.bin 0x8000 partitions.bin 0x10000 firmware-v1.0.0-baseline.bin
# 驱动（CDP 文件注入用 DOM.getDocument+DOM.querySelector+DOM.setFileInputFiles）
nvm/v23.8.0/node.exe %TEMP%/w5-ota-cdp.mjs <out.json> ewin|twin
# Electron: --remote-debugging-port=9222（GPU 启动重试）；T-WIN: debug exe + WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9444
```

## 证据清单

- `w5-ota/firmware/`：三 bin + manifest-v1.0.2/1.0.3.json（六字段契约）+ sha256.txt + 剥离实验串口
- `w5-ota-ewin/evidence/`：cdp-result.json（终局 11/12）+ firmware-serial-final.txt（success/rst/boot@1.0.2）
  + ewin-main-process.log + run1-noota / run3-wdt 归档（缺陷发现现场）
- `w5-ota-twin/evidence/`：cdp-result.json（14/15，含取消分支）+ twin-app.log + version-readback-noble.txt
- 代码修复：双线 `OtaDialog.js`（带响应+节流）；固件 `ota_server.{h,cpp}`（排水批）、`main.cpp`（confirm）、
  `platformio.ini`（日志级别）；tests/desktop 回归 85/85
