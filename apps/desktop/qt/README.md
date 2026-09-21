# Q-WIN · SmartBLE 桌面壳（Qt / PySide6 + bleak）

Windows 桌面第 5 壳（Qt 线）。UI 框架 PySide6（Qt 6），BLE 后端
[bleak](https://github.com/hbldh/bleak)（WinRT 客户端栈，扫描 + GATT）。

## 范围（2026-09-21 GATT 续建收口）

- 页面：
  - P001 扫描（真 bleak 5s 扫描；列表选中/双击 → 连接）
  - P006 设备详情（GATT）：服务/特征树（标准 UUID + 9f1d 家族中文名）、
    特征读取 / 订阅开关（notify+indicate）/ 写入弹窗（UTF-8 / HEX 两模式，
    恒带响应写 = PARITY-007）、操作日志面板；返回后会话常驻
  - P007 已连接（连接管理：列表 / 查看详情 / 单断 / 全断）
  - P008 广播（Windows 无外设栈，降级口径同 V-WIN）
  - P009 关于（正典环境口径 Desktop · Windows / PC · X64）
- 生命周期正典（win016，与 E/T/V/F/G 同口径）：
  - 关窗拦截 → 应用内退出确认（dwin-quit 文案；busy = 连接 OR 广播；
    连接台数入文案）
  - 确认退出 → 先停广播（降级线无）→ 停扫描 → 断开全部连接 → 退出
  - 切入广播页停扫描 / 切出广播页停广播（降级恒无操作）
- 设备保护铁律（SHID-FW-LOCK-001）：INPUT 特征（9f1d1003）写入在
  `ble_service.write_char` 内代码级拦截（错误日志「设备保护」），
  真机永不向 INPUT 发写。
- 架构：扫描一次性 QThread；GATT 常驻 asyncio loop 线程（GattWorker），
  UI 线程经 `submit()` 投递协程，结果/通知/断连经 Qt 信号回流
  （断连单次事件语义：手动断开由显式路径发，意外断链由回调发）。
- 应用图标：正典 `apps/desktop/electron/public/brand/icon.png` 派生
  （由 `tools/unify_icons.py` 统一分发）。

## 运行

```bash
pip install -r requirements.txt
python main.py
```

无需编译（解释型壳）；门禁见下。

## 门禁

```bash
python -m compileall -q .   # 语法门禁（CI 用）
python main.py              # 冒烟：窗口 1200x900 / 标题 SmartBLE
```

真机验证：扫描 5s 出列表（SHID-00000001 等双击连接）、GATT 树 3 特征、
INFO 读取出身份 JSON、STATUS 订阅开关、busy 关窗退出确认。
证据：`verification/windows-plan-v1/20260921-QWIN-GATT/`
（12/12 走查 + 13 截图 + 无头探针日志）。

## 自动化 seam（测试基建）

`SMARTBLE_AUTOMATION_PORT=<port> python main.py` 时在 127.0.0.1 起
TCP 行 JSON 服务（state/tab/scan/connect/char_read/char_notify/
char_write/write_dialog/disconnect_all/close_win/confirm_exit/snap…），
截图走 Qt 原生 `QWidget.grab()`。不设变量零副作用。已知坑位：
`Signal(dict)` 跨线程会被 QVariantMap 拷贝断引用（用 `Signal(object)`）；
closeEvent 内嵌套 `close()` 被重入保护吞掉（确认后直接 `event.accept()`）。
