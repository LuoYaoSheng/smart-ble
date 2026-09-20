# Q-WIN · SmartBLE 桌面壳（Qt / PySide6 + bleak）

Windows 桌面第 5 壳（Qt 线）。UI 框架 PySide6（Qt 6），BLE 后端
[bleak](https://github.com/hbldh/bleak)（WinRT 客户端栈，扫描 + GATT）。

## 范围（v1，2026-09-20）

- 页面：P001 扫描（真 bleak 扫描）/ P007 已连接（降级占位）/ P008 广播
  （Windows 无外设栈，降级占位）/ P009 关于（正典环境口径）
- 生命周期正典（win016，与 E/T/V/F 同口径）：
  - 关窗拦截 → 应用内退出确认（dwin-quit 文案；busy = 连接 OR 广播）
  - 确认退出 → 先停广播（降级线无）→ 断开全部连接 → 退出
- 应用图标：正典 `apps/desktop/electron/public/brand/icon.png` 派生
  （由 `tools/unify_icons.py` 统一分发）

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

真机验证：扫描 5s 出列表（SHID-00000001 等），关窗弹退出确认。
