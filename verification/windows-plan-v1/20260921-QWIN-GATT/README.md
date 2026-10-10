# 20260921-QWIN-GATT · Q-WIN 真机扫描 + GATT 续建收口

WIN-014 待续项（真机扫描、GATT/连接管理）的全量真机验证。设备：
ESP32-S3 SHID-00000001（fw 1.2.0，10:B4:1D:CD:23:8E，常广播）。

## 交付内容（apps/desktop/qt/）

- `ble_service.py`：GattWorker 常驻 asyncio loop + connect/disconnect/
  read/write(带响应=PARITY-007)/start_notify/stop_notify；断连单次事件
  语义；INPUT 特征写代码级拦截（SHID-FW-LOCK-001）；标准 UUID +
  9f1d 家族中文名映射（G-WIN app.go 移植 + bundle 语义名）。
- `main.py`：P001 扫描页加连接动作（选中/双击）；P006 设备详情页
  （GATT 树 + 特征操作 + 操作日志，返回后会话常驻）；P007 已连接页
  实装（列表/详情/单断/全断）；写弹窗（UTF-8/HEX，`open()`+`finished`
  非阻塞模态）；退出确认文案带连接台数。
- `automation.py`：env 门控 TCP seam（SMARTBLE_AUTOMATION_PORT），
  截图走 Qt 原生 `grab()`（无需 Win32/焦点）。
- `theme.py`：GattTree/OpLog 样式补齐。

## 证据

| 文件 | 内容 |
| --- | --- |
| `qwin-gatt-probe.py` / `probe-output.txt` | 无头真机探针：扫描 9 台(-42dBm 命中 SHID)→连接(MTU 256)→枚举 1 服务/3 特征→INFO 读 130B 身份 JSON(fw 1.2.0/unprovisioned)→STATUS 订阅/退订(8s 零事件)→断开 |
| `qwin-gatt-walk.mjs` | TCP seam 走查驱动（spawn + 行缓冲 TCP 客户端 + 断言记录 + 截图） |
| `qwin-gatt-walk.json` | **12/12 PASS**，无 fatal，进程干净退出 |
| `evidence/01..13.png` | 13 张截图：boot/扫描/连接 GATT 树/INFO 读日志/订阅/写弹窗(模态本体)/护栏日志/P007/busy 退出确认(模态)/全断/广播降级/关于/常驻退出(模态) |

## 走查断言（12/12，全真机）

1. **boot**：1200×900、待开始扫描、v1.0.5（仓库根 VERSION 同源）
2. **P001-real-scan**：5s 扫描发现 8~10 台，SHID-00000001 恒居首
   （-38~-51dBm）
3. **connect-gatt-tree**：连接即进详情页；1 服务/3 特征；动作面
   `[notify+read, write, notify+read]` 与 E/G-WIN 一致
4. **P006-info-read**：INFO 读取成功，日志含身份 JSON（`firmware":"1.2.0`
   + `unprovisioned`）
5. **P006-status-notify**：订阅成功→按钮「取消订阅」；退订→「订阅通知」
6. **P006-write-guard**：写按钮按 props 启用；HEX 非法值被弹窗校验拦截；
   合法文本发送被 INPUT 护栏拦截（日志含 SHID-FW-LOCK-001）；取消路径
   「写入已取消」。**全程零真实写**（护栏在 GATT 调用之前）
7. **P007-connected**：详情↔列表往返、会话常驻、已连接 1 台（SHID）
8. **exit-busy**：busy 退出确认文案含「当前连接设备：1 台」；继续使用
   存活
9. **disconnect-all**：全断后 connectedCount 0
10. **P008-broadcast**：降级文案「暂不支持外设模式」
11. **P009-about**：Desktop · Windows / PC · X64 / v1.0.5
12. **exit-final**：0 连接常驻文案模态；退出后进程 exit code 0

## OBS（与 G-WIN OBS 同口径）

1. **未配对会话枚举仅回 9f1d 一服务**：bleak（WinRT）与 tinygo（Uncached）
   一致；E-WIN noble（cached）见 2+。动作面三壳一致，无功能损失。
   配对窗口回验与 G-WIN OBS-1 合并跟踪。
2. **STATUS 未配对态零通知事件**：探针订阅后 8s 零事件（设备仅状态
   变化时推送；SMP 后保活口径见 E13 坑位账）。走查按订阅态断言。

## 新坑位账（Q-WIN 特有）

1. `Signal(dict)` 跨线程 Queued 会被转 QVariantMap **拷贝**，结果写回
   不到原 dict（`no result`）→ 必须 `Signal(object)` 保引用。
2. `closeEvent` 内嵌套 `self.close()` 被 Qt 重入保护吞掉（窗口不关、
   进程不退）→ 确认后直接 `event.accept()`。
3. 模态驱动协议：closeWin（触发模态挂起）与 confirmExit（解模态）必须
   **并发处理**——串行 per-connection 的 TCP 服务会死锁（closeWin 的
   响应永远等不到）→ 每请求一线程，响应乱序按 id 对账。
4. 驱动侧 TCP 大响应（PNG base64 ~40KB+）跨段到达，按 recv 段直接
   JSON.parse 会静默丢包 → 行缓冲重组。
5. 写弹窗用 `open()`+`finished` 信号而非 `exec()`：模态语义不变但
   不阻塞调用方（否则 seam 串行协议同样死锁）。
6. `0 1` 这类测试值去空格后是合法 HEX（`01`）——HEX 非法路径要用
   `0 G 3` 这种真非法值。

## 环境不变量

- Python 3.13.2 / PySide6 6.9.0 / bleak 3.0.2（`get_services()` 已移除，
  用 `client.services`；notify 回调 `(BleakGATTCharacteristic, bytearray)`）
- 仓库根 VERSION=1.0.5；设备 SHID-00000001 常广播无需人工干预
- 走查可重复：`node qwin-gatt-walk.mjs`（自动 spawn/清理应用进程）
