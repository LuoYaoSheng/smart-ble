# 20260921 · UIALIGN-PAGE — Q/F 页面级正典对齐（用户「继续」指令，承接 UIALIGN-TABBAR 登记）

## 1. 起因与定性

UIALIGN-TABBAR 轮（ff679c6）收口 TabBar 层后，页面级遗留登记在案：Q-WIN 五项（Q-PA-001~005）
+ F-WIN 像素专项未跑。用户指令「继续」→ 本轮开工。另发现 **上轮 F 产物缺口**：Release exe 构建于
09:54，晚于它的 `main.dart` themeMode 锁亮修复（11:32）未进产物——即 ff679c6 的 FWIN zip 不含
锁亮修复（当时产物级探针过绿是因为系统主题恰为亮色）。本轮重建收口。

## 2. 缺陷账（Q-WIN 页面级，逐项代码核实）

| ID | 缺陷 | 正典（prototype.css） |
|----|------|----------------------|
| Q-PA-001 | 页边距 24/20/24/16 | `.page` 0/16/24 + `.navbar` 8/18/12 |
| Q-PA-002 | 标题 22px/卡圆角 12px/圈外色（BG #F5F7FA、BORDER #E3E9F2、TEXT #17223B、SUB #5A6B87、FILL #EEF2F8） | 标题 20px xbold、r-lg 16、tokens 全量（#F8FBFF/#E3EAF3/#18222E/#42536A/#F1F5FB） |
| Q-PA-003 | 设备行 = QListWidget 纯文本一串 | `.dev` 卡：ava 44 r12 渐变 + nm 15 bold + id mono 10 + sig 四档柱 + acts |
| Q-PA-004 | P001 无筛选（四档/阈值/前缀/隐藏无名全缺） | `.filter` 四行 + `.pre` pill 选中态 + `.slider` + `.switch` |
| Q-PA-005 | navbar 无 bt-chip 胶囊 | `.bt-chip`：8×8 点三态（init 灰/on 绿/off 红）+ 11px 词 |

F-WIN 页面结构上轮已对齐（AppNavbar/页 padding 16/AppChip 均在），本轮缺的是**像素级证据**与
**陈旧产物**，无新代码缺陷（28/28 探针过绿即证）。

## 3. 修复（apps/desktop/qt/）

- **theme.py**：tokens 全量正典化（上述圈外值清剿）+ QSS 重写（NavBar 渐变底线/卡片 r-lg 16/
  btn 40·r12 与 sm 32·r8/txtlink/pre pill/slider/开关柄/滚动条）。
- **widgets.py（新）**：NavBar / BtChip+dot 三态 / Chip 五色 / SigBars 四档（4/7/10/12 柱，
  q4 全绿·q3 三绿·q2 前二黄·q1 首柱红）/ Ava 44 渐变+在线角标 / DeviceCardWidget 两变体
  （scan：连接钮；conn：断开钮+「已连接 · 可进行 GATT 调试」）/ DevList（currentRow 口径兼容
  自动化缝）/ FilterPanelWidget 四行 / SumCard / EmptyState+雷达插画 / Switch / NoteInfo /
  LiveDot。图标与 tabbar 同源（E index.html sprite 子集扩展：chip/x/chev-r/check/bt/warn）。
- **main.py 五页重写**：
  - P001：navbar+bt-chip / scantool（live 点+40px 主色钮）/ sec-t（chip 图标+附近设备+计数
    chip+筛选 txtlink）/ 筛选面板（E getFilteredDevices 同语义过滤）/ 设备卡列表+双空态
    （「还没有扫描结果」/「当前没有匹配设备」）。
  - P007：SESSIONS navbar+通用调试会话 chip / SumCard（N 台在线·全部为内存会话+全部断开）/
    conn 卡列表+空态。
  - P008：PERIPHERAL navbar+平台 chip / NoteInfo 降级提示（文案逐字节保持）。
  - P009：ABOUT navbar+verchip（mono）/ 768 窄列居中 / 身份卡（38px r11 渐变 logo+BLE Toolkit+
    verline）/ 应用信息 kv（三键口径不变）。
  - P006：subnav（30×30 返回钮+GATT 调试）/ devhead（状态点+17px 名+mono ID 行）/ 两卡 r-lg 16、
    logbar 12px 头。
  - **automation 契约保持**：`_hits/_status/_scan_btn/_toggle/_connect_selected/_list.currentRow/
    row_values/tip_label` 等属性名全保（smoke 17/17 证）；增量命令 `filter_toggle/filter_set`。
- **F-WIN**：无代码改动；`flutter build windows --release` 重建（吸收 themeMode 锁亮）+ 测试 123/123。

## 4. 活体探针（全 GREEN）

| 层级 | 结果 |
|------|------|
| Q 无头冒烟（offscreen+TCP 缝，契约回归+filter 命令） | **17/17** |
| Q 页面探针（源码层，真 bleak 扫描 8~11 台含 SHID-00000001） | **21/21** |
| Q 页面探针（zip 产物层，150% DPI 1800×1350） | **21/21** |
| F 页面探针（源码层，150% DPI，SendInput 切 tab 四页） | **28/28** |
| F 页面探针（zip 产物层） | **28/28** |

断言覆盖：tabbar 64·dpr+顶线+四等宽；navbar 渐变+1px #EDF2F9 底线+kicker 主色；bt-chip 就绪绿点；
扫描钮 40·dpr 高主色渐变；页边距左 16·dpr（Q 卡边框实测 16/24@150%；F 客户区 29≈24+边框带）；
设备卡（上边框 #E3EAF3/ava 渐变实测 (230,239,255)/卡内主色连接钮）；筛选 pill #F1F5FB 底+选中
#1B6DFF；P007 chip/空态；P008 note #E8F1FF；P009 768 列居中（实测 first=216 expect 215；
150% 时 324/323）+列宽 767/1151+logo 渐变 (22,96,230)。

## 5. 本轮坑位（新记）

1. **F 产物陈旧盲区**：上轮 themeMode 修复晚于最后一次 build，产物级探针因系统恰亮色而过绿——
   「探针过绿≠产物含修复」；本轮以 exe mtime vs 源 mtime 核鲜度收口。
2. **ClearType 次像素纹**：文本边缘像素呈 (181,115,46) 类暖色，颜色匹配断言须避开文本行或用
   行穿越法（bg→非 bg 边界）量几何。
3. **dpr 推断陷阱**：`im.width/(r-l)` 恒为 1（分子分母同为物理），须 `GetDpiForWindow/96`。
4. **F 窗口 1200×900 逻辑 @150% = 1780×1340 物理**（含边框），别按物理当逻辑判窗口尺寸。
5. **LINE(#E3EAF3) 与 LINE_SOFT(#EDF2F9) 距离仅 (10,8,6)**：tol≥8 的行匹配会互串——底线断言
   tol 用 6。
6. **探针量法三误**（本轮修正）：蓝簇 bbox 并入「筛选」主色文字（取最长连续纵段）；边框行只
   1px（量卡内 20·dpr 行的竖边框）；空态在列表区顶部非页面中央（正典 .empty 即此）。
7. **Q zip 复刻**：bat 从旧 zip 抽取回注（bat 不在仓库）；robocopy /XD __pycache__。

## 6. 产物增补

FWIN/QWIN zip 重打包（源码层/产物层探针均 GREEN），SHA256SUMS.txt 更新：
- `FWIN…zip` → `d37d736c3e3d…8b805e9`（含 themeMode 锁亮重建）
- `QWIN…zip` → `42b9c4ce9aa5…9569d9f`（页面级重写）

## 7. 遗留登记（不动，等指令）

- N4 广播 Tab 显隐两案（E/T/G 3 tab vs F/V/Q 4 tab）仍待用户裁决。
- F-WIN 深层（P006 双栏、P002 系列）无自动化缝，像素探针仅到 tab 页层；如需页面内深层须加缝或
  手工走查。
- P3 硬件窗口（WIN-006 尾+WIN-008 OTA）需用户排期；P5 矩阵回填+WIN-010 交付待开。

## 8. 文件清单

- 代码：`apps/desktop/qt/{theme.py 重写, widgets.py 新, main.py 重写, automation.py 增量命令}`
- 探针/冒烟：`evidence/{smoke_q_offscreen.py, probe_q_pages.py, probe_f_pages.py}`
- 截图：`evidence/{q,f}-tab{0,1,2,3}*.png`（11 张）
- 产物：`20260921-P4-PACKAGING/artifacts/{FWIN,QWIN}…zip` + `SHA256SUMS.txt`
