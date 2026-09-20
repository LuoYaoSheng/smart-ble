# 20260920-WIN-UIFULL：Windows 三壳「整体 UI 级」走查（用户质疑触发）

用户质疑：「Windows端，啥都没有吧，整体测试了吗」——本轮回答两件事：
1. Windows 端到底有什么（功能面盘点 + 「apps/desktop/windows 只是占位 README」的澄清）；
2. 「整体」是否测过——**此前没有**：历轮打的是 BLE 链 API 级（T1-T16/V1-V16）+ 零散 UI 点（退出确认/芯片词），ui-nav-audit-20260915 是静态代码核对。全视图**真实点击**走查本轮补齐。

## 功能面盘点（事实）

- **E-WIN（Electron）/ T-WIN（Tauri）**：9 视图全产品面——P001 扫描（含筛选面板/预设/重置）、
  P007 已连接、P008 广播、P009 关于、P010 版本记录、P002 Smart HID 配向导（连接验证/表单/
  二维码/粘贴兜底/令牌门/步骤条）、P003 HID 详情、P005 SHID 诊断、P006 GATT 调试（服务树/
  读/写/监听/日志坞）。index.html 双壳同构（差异=平台条件分支，如广播 Tab 可见性案 A/B）。
- **V-WIN（Avalonia，Experimental 层级）**：薄壳——扫描/筛选/设备列表/详情（服务树/特征操作）/
  日志/断开；无 HID 配网/广播/关于页（by design，见 AGENTS.md 层级表）。
- `apps/desktop/windows`、`apps/desktop/linux` 仅 README 占位（指向 Avalonia 线）——「啥都没有」
  的印象若来自这两个目录，实为设计内占位，非实现缺失。

## 走查结果（CDP 真实点击，最终 harness）

| 步骤 | E-WIN | T-WIN |
|---|---|---|
| boot/标题 | ✓ | ✓ |
| TabBar 结构 | 3 Tab 可见（广播隐藏=案A） | 4 Tab 恒显（案B） |
| bt-chip | 蓝牙就绪+on 点 | 蓝牙就绪+on 点 |
| 筛选面板开/重置/合 | ✓ | ✓ |
| 扫描出设备卡 | 8 卡 | 8 卡 |
| P002 向导进表单态（自动连接+身份读取+步骤条） | ✓ | ✓（修复后） |
| 下发按钮令牌门（无 token 禁用） | ✓ | ✓ |
| 二维码弹层 | 真实摄像头取景中 | 超时降级文案（wry 已知盲区，5s 设计降级）✓ |
| 粘贴兜底：非法码拒绝 | ✓ 错误行 | ✓ |
| 粘贴兜底：合法码回填+按钮启用+toast | ✓ | ✓ |
| 向导返回设备列表 | ✓（修复后） | ✓（修复后） |
| P006 卡片直连→服务树 5 操作 | ✓ | ✓ |
| P006 特征读（轮询日志） | 读取成功 | 成功 Read:（NBSP 归一化后命中） |
| P006 监听开/停往返 | 停止监听 ✓ | 停止监听 ✓ |
| P007 已连接页（计数/断开全部） | ✓ | ✓ |
| P008 广播页（未就绪徽章+支持检查+字节预算 21/31） | ✓ | ✓ |
| P009 关于（版本投影 v1.0.5-dev.unknown/环境/型号） | ✓ | ✓ |
| P010 版本记录进/返 | ✓ | ✓ |
| P003/P005 可达性 | 需 ControlHub 配网会话（与 WIN-007 BLOCKED 同源），不可达=预期 | 同 |
| 退出确认（连接态） | 模态+「当前连接设备：1 台」 ✓ | WM_CLOSE 路径 20260918 已取证 |

**两壳 16/16 全绿**。证据：`fullui-walk.json`（逐步断言+原始返回）+ 11 张截图/壳。

## 本轮发现并修复（2 项真缺陷）

### T-WIN-DEF-004（P1）：配网向导连接必败「未找到 Smart HID 配网服务」
- 根因：`hid-service.js` 读 `result.services`，Tauri 后端 `discover_services` 返回 `data` 键
  （E-WIN 桥层恰好返回 `services`，镜像字节在键名上漂移）。`p002-errcode.json` 完整复现。
- **T-WIN 的 Smart HID 向导从未在真机上通过**——历轮只测到 API 级 BLE 链，从未驱动向导连接，
  故从未暴露。首轮走查即抓出（向导卡阶段一 60s，`p002-wizard-stall.json`）。
- 修复：双壳镜像改 `result.services || result.data || []`。修复后 T-WIN 向导正常到达表单态。

### DESKTOP-LEAVE-001（P2，双壳）：配网向导返回（未下发）不清 BLE 会话
- 现象：E-WIN 设备卡再点「连接」报 `连接失败: Peripheral already connected`（toast）；
  T-WIN 更深——连接保持→设备停广播→短扫重建缓存也找不到→`Device not found`，已连接页计数 0。
- 正典依据：uniapp `use-smart-hid-provisioning.js` `dispose()`（onUnload 触发）会调
  `smartHidService.disconnect()`——**离开配网页即断开是产品语义**，桌面双壳漏了对齐。
- 修复：双壳 `hidLeaveProvision` 两条路径（非配网中直返/确定离开）补 `svc.disconnect()`，
  注释锚定正典。修复后双壳 P006 干净直连（already connected / Device not found 均消失）。

## V-WIN UI 级走查：三轮缺陷清剿后 16/16 全绿（同日续轮 VWIN-UIFULL）

上轮（同日早间）定性「输入注入受环境限制」**系误判，本轮撤回**：FlaUI `element.Click()`
（真实鼠标点 UIA 矩形中心）对 Avalonia 一直有效——上轮唯一被点击成功的「过滤面板」
其实是 `IsVisible` 绑定失败回退默认 true 的恒开假象，让人误以为点击通道是通的；随后
误入 ClickPhys 手算坐标/PostMessage/键盘三条死岔路。真实鼠标点击通道无环境限制。

误判之下掩盖的是三个叠加缺陷（全部行为级实证后修复）：

### V-WIN-DEF-004（P0）：运行期 DataContext 从未装配——UI 是静态壳
- 根因：`App.OnFrameworkInitializationCompleted` 只 `new MainWindow()`，XAML 仅
  `Design.DataContext`（设计期专用）。全部 Binding 求值于 null：**所有命令死**（点扫描
  无反应）、状态/计数/扫描文字空白（扫描按钮缩成 46px 光杆图标）、过滤面板恒开
  （IsVisible 绑定失败回退默认 true）、`≥ (unset) dBm`（FilterRssi 取不到值）。
- 红证：`vwin-walk/vwin-probe-def004-red.log`（修复前构建全量 UIA dump：绑定态文本
  全空、点扫描按钮零状态变化）。
- 修复：App 装配 `DataContext = new MainWindowViewModel()`。修复后状态条 42ms 出
  「蓝牙就绪」。

### V-WIN-DEF-005（P1）：设备卡片未接 ConnectToDeviceCommand——详情页整体不可达
- 根因：命令存在于 ViewModel，XAML 无任何绑定/事件引用（卡片是纯 Border）。即使
  DataContext 正常，读/写/通知/日志/断开全部不可达。
- 修复：卡片 `Tapped="OnDeviceCardTapped"` + code-behind 调 `ConnectToDeviceCommand`
  （Tapped 手势自带拖拽过滤，列表滚动松手不误触发连接）。

### V-WIN-DEF-006（P1）：特征值 读/写/通知 三按钮命令绑定 `$parent[UserControl]` 失效
- 根因：三按钮 Command 用 `$parent[UserControl].((vm:MainWindowViewModel)DataContext)`
  强转寻祖，但窗口树根是 Window、**无 UserControl 祖先**——运行期解析静默为 null，
  编译期不报错。读/写/通知全死而断开/返回等普通绑定正常。
- 红证：`vwin-walk/vwin-walk-def006-red.log`（DataContext 修复后首跑：S4-S6 过、
  S7/S8/S10 三按钮全无响应）。
- 修复：改 `$parent[Window]`。

### 修复后全流程走查（16/16 + 1 观察项，`vwin-walk/vwin-walk-green.log` + 11 截图）

| 步骤 | 结果 |
|---|---|
| S1 状态条蓝牙就绪 | ✓ @89ms |
| S2 扫描发现 SHID（9 台设备） | ✓ |
| S3 过滤面板展开 | ✓ |
| S4 卡片点击进详情页 | ✓ @2.6s |
| S5 已连接徽标 / S6 服务发现 | ✓ / ✓ |
| S7 INFO(9f1d1002) 读取 | ✓ 真实 JSON：smart-hid / HID-00000001 / fw 1.2.0 / unprovisioned |
| S8 STATUS(9f1d1004) 通知启用 | ✓（CCCD 成功，日志「启用通知 1004」） |
| S9 空闲 20s STATUS 推送 | OBS：无（口径对齐 E/T：均只验启用；推送为事件驱动） |
| S10/S11 写对话框开→取消（INPUT 1003 行，零写入） | ✓ / ✓（亮度探针 253 判关） |
| S12 断开回列表 | ✓ |
| S13-S15 重扫→重连→服务重枚举（DEF-002 回归） | ✓ / ✓ @1.9s / ✓ |
| S16 返回列表 | ✓ |

- **零 GATT 写入**（SHID-FW-LOCK-001 约束）：对话框只开不写，未触碰 INPUT 特征。
- 上轮「人工点检清单」作废——自动化通道已打通且全绿。
- harness 坑（后续复用 FlaUI 驱动必读）：Avalonia 对 `IsOffscreen` 恒报 true（不可用）；
  Carousel 隐藏页元素常驻 UIA 树且保留陈旧矩形（越界即隐藏，页内陈旧矩形用多信号
  仲裁兜底）；隐藏导致的「关闭」无法用文本断言感知（元素仍在树中），用像素亮度探针
  （遮罩 #80000000 压暗一半）硬判定；设备卡片快速增删时 UIA COM 调用瞬态 E_FAIL 需
  重试；特征行按钮优先点真实 Button 控件（Text 标签目标偶发零触发/双触发）。

## 环境观察

- E-WIN `build:win --dir`：asar 打包成功（新代码已生效，走查证实），但 rcedit 改 exe
  图标/版本串遇文件锁「Unable to commit changes」重试三次失败（20260918 同因曾自愈）。
  不影响功能；WIN-009 出安装包时需处理。
- T-WIN WebView2 二维码摄像头两次表现不同：一次 5s 超时降级文案、一次真实取景——
  PermissionRequested 处理时序不稳定，降级路径两侧均已验证。
- 判定坑（harness 层，已记）：日志面板「成功」徽标与消息是相邻 DOM 节点，中间为 NBSP
  （\u00A0 非 \s）；T-WIN 读取成功措辞为「Read:」E-WIN 为「读取成功」。

## 门禁

- `node --check`×4（双壳 app.js/hid-service.js）✓；`node --test tests/desktop/` **95/95** ✓
- Tauri debug exe 重建（cargo build）✓；Avalonia 产物重建（dotnet build 0 err，埋点已撤）✓
- 续轮（VWIN-UIFULL）：Avalonia dotnet build 0 err；`dotnet test` **19/19** ✓；
  走查后无残留进程 ✓
