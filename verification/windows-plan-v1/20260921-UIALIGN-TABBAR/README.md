# 20260921 · UIALIGN-TABBAR——用户反馈「好几个 UI 没对齐，连基本的 tabbar 都没对齐」

## 0. 起因与定性

用户对 P4 收口后的六壳现状提出质疑。核实：**P4（WIN-009）判的是打包链路**
（产物/SHA256/安装卸载闭环），UI 像素级正典对齐此前只有 V-WIN 做过两轮
（07f034c/6f46caa）；F/Q 两壳的 TabBar 从未做过正典对齐——用户所见属实，
本轮即修。

## 1. 缺陷账（修复前，代码级事实）

正典（E-WIN `prototype.css` `.tabbar`）：**border-box 64px 含 1px 顶线**
（--c-line-soft #EDF2F9）、底 rgba(255,255,255,.96)、四枚 `.tb flex:1` 等宽、
图标 23px + 文字 10px（10/600，选中 700）、纯色彩选中态（--c-primary /
--c-mut）、已连接角标 `.n`（top 2 / right calc(50% - 21px)，min-w 16 h 16 r 8，
危险底白字 9px bold）。

| 缺陷 | 壳 | 修复前形态 |
|---|---|---|
| UIALIGN-F-001 | F-WIN | Material `BottomNavigationBar` 默认壳：**56px 高**（正典 64）、Material 内边距/墨水响应、无顶线 |
| UIALIGN-F-002 | F-WIN | `themeMode.system` 跟随系统暗色——**TOKEN.md §9.4 明文「正典无全局深色模式」**，其余五壳恒亮（跨壳不对齐的直接来源之一） |
| UIALIGN-Q-001 | Q-WIN | `QTabBar` documentMode：**纯文字无图标**、内容自适应宽（非 flex:1 等宽）、**3px 下划线选态**（正典无下划线）、14px 文字（正典 10px） |
| UIALIGN-Q-002 | Q-WIN | `theme.py TEXT_MUT=#93A1B8` 圈外值（正典 --c-mut=#60758D），暗文本整体偏浅 |

E=正典本体；T/G 与 E 共前端（字节级镜像）；V 两轮已对齐——本轮不动。

## 2. 修复

### F-WIN（`apps/flutter/lib/ui/design/app_tab_bar.dart` 重写 + `main.dart` 一行）

- 弃 `BottomNavigationBar`，自绘：`Container` height 64（border-box 含 1px 顶线
  #EDF2F9）+ padding LTRB(8,4,8,16) + `Row[Expanded×4]`（flex:1 等宽）；
  每枚 Column：AppIcon 23（正典 sprite）+ gap 3 + Text 10（600/选中 700）；
  色彩态 = cPrimary/cMut 级联；角标保持原 .n 近似（-2/-10）。
- `themeMode: ThemeMode.light`（TOKEN.md §9.4，注释引用 UIALIGN 20260921）。
- 测试：`widget_test.dart` 横滑禁用断言从 `BottomNavigationBar.currentIndex`
  迁 `AppTabBar.activeKey`（原断言找 Material widget 报 Bad state: No element）；
  **新增几何锁测试** `canon tabbar geometry 64px + equal tabs`（高 64/四枚等距/
  图标 23/字号 10/色彩态/Material 壳不得回流）。`flutter analyze` 0 issue、
  **123/123 全绿**、release 重建。

### Q-WIN（新 `apps/desktop/qt/tabbar.py` + main.py/theme.py 接线）

- `CanonTabBar(QWidget)`：`setFixedHeight(64)` + `paintEvent` 画 96% 白底与
  1px 顶线（独立 `LINE_SOFT=#EDF2F9`，不混 theme 近似值）；QHBoxLayout 等拉伸
  四枚；每枚 `_TabButton`：`QSvgRenderer` 渲染 **E-WIN index.html SVG sprite
  同源路径**（stroke 1.8/currentColor 替换，高 DPI 取整放大）23px + gap 3 +
  文字 10px（600/选中 700）；角标 QLabel 尺寸手算（min-w 16 + padding，规避
  QSS padding 不进 sizeHint 的坑），`resizeEvent` 重定位（守卫只看宽度——
  `isVisible()` 在未 show 时恒 False 会把角标卡在 (0,0)）。
- `setCurrentIndex` 保持 QTabBar 语义（变更即发 `currentChanged`），自动化缝
  `automation.py` 的 `tab`/`tabsVisible` 命令零改动兼容。
- `theme.py`：删 QTabBar QSS；`TEXT_MUT` #93A1B8 → **#60758D**（正典 --c-mut）。
- 无头冒烟全绿（等宽 640×4/角标 2→99+/同 index 不重发/图标 23L@1.5dpr）。

## 3. 活体像素探针（双壳双层级：仓库源 + zip 产物，全 GREEN）

探针：`evidence/probe_tabbar.py`（Win32 定窗 + 像素分析）+ `probe_q.py`
（SMARTBLE_AUTOMATION_PORT TCP seam + `grab()` 离屏渲染）。
量测四项：A 顶线→底栏高=64L；B 顶线色 #EDF2F9；C 图标簇=4 且中心距等宽；
D 选中簇含 #1B6DFF、未选含 #60758D。

| 对象 | 结果 |
|---|---|
| F-WIN 源（Release 直启，dpr1.5） | bar 96px=**64.0L**；4 簇 gaps **438.5/438.0/438.5**；色态 ✓ GREEN |
| F-WIN 产物（新 zip 解压 smart_ble.exe） | 同上 GREEN（fwin-zip-tabbar-probe.png） |
| Q-WIN 源（TCP seam，dpr1.0） | bar **64.0L**；4 簇 gaps **296.5/296.0/295.5**；tab0 与 tab3 选中色均随动 GREEN |
| Q-WIN 产物（新 zip 解压，version=1.0.5 命中） | 同上 GREEN |

截图证据：`fwin-tabbar-probe.png` / `fwin-zip-tabbar-probe.png` /
`qwin-tab0-grab.png` / `qwin-tab3-grab.png`。

### 本轮驱动坑位账（复用必读）

1. **GetWindowRect 含 DWM 不可见调整边框**（老坑复发）：首测 bar=70.7L 假偏大
   → `DwmGetWindowAttribute(EXTENDED_FRAME_BOUNDS)` 取可见框后精确 64.0L。
2. **多显示器截屏**：`ImageGrab.grab(bbox)` 默认只抓主屏坐标系，窗口在副屏
   （x=3239）时整图黑 → 必须 `all_screens=True`。
3. **venv 启动器进程树**：`.venv-pkg` python.exe 会把基础解释器
   （C:\Program Files\Python313）当**子进程**拉起，Qt 窗口归孙子进程——按
   PID 找窗必须走 Toolhelp 进程树匹配（probe_tabbar.descendant_pids）。
4. **控制台污染像素**：Popen 拉起 python.exe 自弹控制台盖住被测窗（底带全是
   38/38/38 控制台灰）→ `CREATE_NO_WINDOW(0x08000000)`。
5. **系统主题定时自动切暗**：F 曾随 system 变暗（全窗 0 蓝像素）；另有一次
   抓图撞上未上屏的空窗（全灰 22/22/22）重试即绿——锁亮（F-002 修复）后此
   类假阴性根因消除，但「偶发空窗须重试」保留在案。
6. **探针断言参数化**：切到非 0 tab 后「首簇=选中」写死断言必假阴性——
   analyze(active_index)。

## 4. 产物增补（P4 清单更新）

FWIN/QWIN zip 重打包（源码含本轮修复），SHA256SUMS.txt 已更新并注明增补行：
- `FWIN-smartble-flutter-release-win64.zip` → `25140d549727…6d222d4`
- `QWIN-smartble-qt-1.0.5-venv-win64.zip` → `718a6d902954…7260fa`
（产物本体不入库，`.gitignore` 仅放行 SHA256SUMS.txt。）

## 5. 页面级遗留登记（本轮不修，待立项 F/Q 页面级 UIALIGN）

- **F 页面级**：结构正典测试已有（P001 structure 等），但 V-UIALIGN2 式像素
  布局探针（SL 系列）未跑过——待专项。
- **Q-PA-001（P2）**：页边距 24/20/24/16 ≠ 正典 .page 0 16 24。
- **Q-PA-002（P3）**：PageTitle 22 vs fs-title 20；CardTitle 15 vs fs-h1 17；
  Primary 圆角 10 vs r-md 12。
- **Q-PA-003（P2）**：设备列表 QListWidget 文本行 ≠ 正典设备卡（名称+RSSI+
  chip+短码徽章）。
- **Q-PA-004（P2）**：P001 筛选四档行（-100..-40 预设）缺失。
- **Q-PA-005（P3）**：bt-chip 状态徽章 pill 形态未实现（现为纯文本）。
- **N4（用户裁决，未动）**：广播 Tab 显隐——E/T/G Windows 上按能力隐藏（3 枚），
  F/V/Q 恒显（4 枚，A3 契约）；跨壳枚数差异待 N4 两案裁决后统一。

## 6. 文件清单

- `apps/flutter/lib/ui/design/app_tab_bar.dart`（重写）
- `apps/flutter/lib/main.dart`（themeMode 锁亮）
- `apps/flutter/test/widget_test.dart`（断言迁移 + 几何锁新测试）
- `apps/desktop/qt/tabbar.py`（新增）
- `apps/desktop/qt/main.py`（CanonTabBar 接线 + 角标刷新）
- `apps/desktop/qt/theme.py`（TEXT_MUT 正典值 + 删 QTabBar QSS）
- `../20260921-P4-PACKAGING/artifacts/SHA256SUMS.txt`（F/Q 新哈希 + 增补注）
