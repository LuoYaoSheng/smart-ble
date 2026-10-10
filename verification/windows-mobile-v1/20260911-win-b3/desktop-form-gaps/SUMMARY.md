# 桌面形态层缺口收口（PARITY-008 / PARITY-009）· 2026-09-11

## 缘起

用户质询「桌面端肯定没对齐吧，我记得 HTML 有更新了」。核查结论：

1. **桌面正典无新欠账**：v1-new + platform/desktop/high-fi 最后更新=88b9368（2026-09-10 19:26，F028 推广区下线），桌面两线同日 16:05 已先行裁撤（a88c358，同一产品决策）；cc7a177（09-11）仅 web 平台高保真+docs 站；Mac 后续 docs 提交（→05410de）零原型文件；工作区无未提交原型改动。
2. **Mac 横评报告（20260911-h5-mock-sweep/REPORT.md §6）的「P002/P003/P005/P010 四页缺失」说法过时**：四页在两线均在（P010=2b70689、P002/P003/P005=3c2b6e8；3c2b6e8 代码注释直引 desktop 高保真页为正典）。本报告不改动 Mac 原文，以本 SUMMARY 为勘误登记。
3. **真缺口两项**（desktop.js 覆写层 vs 两线实现逐项核对）：退出确认 ❌、P002 摄像头扫码主路径 ❌；P006 双栏（dcol1/dcol2/logdock）✅、P008 31B 预算四行 ✅、九页齐全 ✅、OS 三宿主切换=原型评审演示性质（真机单 OS 合理简化）。

经用户授权（「好好分析并处理」），两项直接收口（不依赖 D2 裁决——任何壳都必须有）；G1-G10 其余结构重建仍挂用户 D2。

## 实现（E-WIN / T-WIN 双线镜像）

### PARITY-008 窗口关闭退出确认（10_platform §4：常驻，退出确认）

- E-WIN：主进程 `mainWindow.on('close')` 拦截（`exitConfirmed` 旗防死循环）→ `webContents.send('app:confirm-exit', {connected})`（连接数取主进程 `connectedPeripherals.size`）→ 渲染层 `showExitConfirm` 应用内模态（正典 modal 形态，非原生对话框）→「退出」`ipcRenderer.invoke('app:confirm-exit', true)` 置旗 `app.quit()`（before-quit 既有清理链复用）/「继续使用」关模态存活。preload 暴露 `onConfirmExit/confirmExit`。
- T-WIN：Rust `on_window_event`（`GlobalWindowEvent::CloseRequested`）→ `api.prevent_close()` + 连接数（`BleState.connected_peripherals`，try_lock 少报不误报）→ `window.emit("app-confirm-exit")` → 渲染层同款模态 →「退出」`invoke('confirm_exit', {quit:true})` 置 `Arc<AtomicBool>` 旗 + `window.close()` 放行。
- 文案对齐原型 desktop.js dwin-quit：会话中「有 BLE 会话正在运行（连接/广播）。确认退出将断开会话并停止监听。」；空闲「桌面端为常驻运行。确认退出？」+（10_platform §4 生命周期：常驻，退出确认）。

### PARITY-009 P002 配对码摄像头扫码主路径（10_platform §2.4）

- `hidOpenQrSheet` 重写为扫码 sheet：getUserMedia（environment/1280）取景器（四角取景框+底部状态条）→ vendored `jsQR@1.4.0`（`vendor/jsQR.js` 双线字节镜像，Apache-2.0 许可全文+README 注记，**按需动态注入**不改启动链）逐帧解码（≤640px 降采样、250ms 周期）→ 命中 `parseQr` 解析回填（toast「配对码已识别 · 地址与令牌已回填」）。
- 粘贴/手输入口降级为兜底 sheet（`hidOpenPasteSheet`，标题「粘贴 / 手输配对码（兜底）」），扫码 sheet 内常驻入口「无法扫码？粘贴 / 手输配对码 →」。
- 摄像头失败全分支文案给出兜底出路：权限拒绝/未检测到/被占用/解码库不可用/**启动超时（宿主未授权或未响应）**/环境不支持。
- bigact 静态+渲染文案改「摄像头读取 ControlHub 屏显二维码，识别后自动回填地址与令牌」。

## 关键发现与加固

1. **WebView2/wry 0.14 无 PermissionRequested 处理** → T-WIN `getUserMedia` 永久悬挂（Promise 永不 settle，首跑冒烟实证卡「正在启动摄像头…」）。修复：双线 5s 竞速超时降级（TimeoutError → 兜底提示），迟到授权的流 `getTracks().stop()` 回收防句柄泄漏。
2. **WebView2/wry 不透传 JS window.close()**（无 WindowCloseRequested 处理）→ T-WIN 冒烟的窗口关闭驱动用 Win32 `PostMessage(WM_CLOSE)`（PowerShell Add-Type；真实走 tao→CloseRequested 链，比 JS 路径更接近用户点 X）。
3. **防御加固（双线）**：`hidRenderProgressCard` 对 `progress:null` 兜底（`(p.progress||{})[key]||'pending'`）——冒烟夹具暴露渲染链抛异常会静默中断模态按钮的自动关闭（真实流程 openHidProvision 恒以 initialProgress() 初始化，属加固非缺陷修复）。
4. Tauri v1 `on_window_event` 闭包签名=单参 `GlobalWindowEvent`（`.event()`/`.window()`），非 (window, event) 双参。

## 验证

- tests/desktop：新增 `desktop-form-gaps.desktop.test.mjs` 10 例（退出确认双线接线结构+文案、扫码 sheet 结构+兜底降级+资源回收挂接、vendor 字节镜像+许可）→ 全量 **95/95**；node --check 双线 app.js/main/preload 全过；T-WIN `cargo build` 0 错（前端资产编译期嵌入，progress 兜底+超时改动后重建）。
- E-WIN CDP 冒烟（9333，`--disable-gpu`）：**14/14**——`ewin/cdp-smoke.txt`。含：本机摄像头真实出图「取景识别中…（摄像头）」（jsQR 注入+解码循环活）；兜底粘贴链回填（token 32 位 hex+hub 格式化+徽章翻转+模态关闭+摄像头资源回收）；退出确认全链（window.close() 拦截→模态（connected=0 空闲文案）→「继续使用」页面存活→再关→「退出」→CDP 端口消亡）。
- T-WIN CDP 冒烟（9444，WebView2）：**16/16**——`twin/cdp-smoke.txt`。含：WM_CLOSE 投递→拦截→模态→「继续使用」页面+进程双存活→再关→「退出」→进程消亡（Get-Process NoProcessFound 探针）；摄像头超时降级文案按设计落位（「摄像头启动超时（宿主未授权或未响应）——请改用粘贴 / 手输入口」）。
- 驱动脚本：`%TEMP%/dfg-ewin-smoke.mjs` / `dfg-twin-smoke.mjs`（一次性，不入库；断言逻辑已固化进 tests/desktop）。

## 观察项（留后续窗口）

- **扫码端到端实拍验证**：摄像头对准 ControlHub 屏显真实二维码的解码成功路径未验（无 ControlHub 窗口；本机摄像头已验出图+解码库加载）。留 E5/真机窗口或 ControlHub 本地自铸配对码（smart-hid-workspace）后补。
- T-WIN 摄像头在 wry 升级提供 PermissionRequested 处理前不可用（超时降级路径保底可用）；若需 T-WIN 原生扫码，候选=wry 升级或自定义 webview builder。
- 退出确认渲染层无响应时窗口无法关闭（无兜底强退路径）——渲染层挂死属极端场景，登记不修。
