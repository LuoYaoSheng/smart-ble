# 20260920 · VWIN-UIALIGN2 —— V-WIN 布局对齐收口轮（用户反馈「页面很多有问题，扫描设备的设备列表都没对齐」）

上一轮 VWIN-UIALIGN（07f034c）的 81/81 断言以文案/色彩为主，缺**布局数值**校验。
本轮补齐：像素级布局探针 + 正典逐条比对，修复 6 处真实布局缺陷后 **92/92 全绿**。

## 方法

1. **正典侧**：`docs/specs/prototype/platform/desktop/high-fi`（prototype.css v1.4.7 全量数值）
   + E-WIN 真实渲染层（`app.js` / `components/DeviceCard.js` / `styles.css about-*` / `index.html`）逐条比对。
2. **V-WIN 侧**：FlaUI 驱动新增 `MeasureScanList / MeasureModalRow / MeasureStepperLine` 探针——
   UIA BoundingRectangle（逻辑 px = 物理 px ÷ DPI scale）+ 截图像素扫描，按正典 CSS 数值断言（±2~4L 容差）。
3. 截图取证改用 `DwmGetWindowAttribute(DWMWA_EXTENDED_FRAME_BOUNDS)`（前轮 GetWindowRect 连 DWM 不可见
   调整边框一起截入，左侧出现 11px 深色条——是取证瑕疵非 UI 缺陷，本轮已消除，仅剩 1px 边缘线）。

## 修复清单（真实缺陷，非探针口径）

| # | 缺陷 | 正典依据 | 修复 |
|---|------|----------|------|
| A1 | **C1 设备卡 acts 按钮未撑满**（SHID 卡 61/34L vs 正典 flex:1≈563L；普通卡非全宽） | `.dev .acts .btn{flex:1}` | SHID 双入口 `*,8,*` 等宽撑满 + 普通/已连接单钮全宽；连接/已连接同钮换词（`ConnectEntryLabel`，对齐 E-WIN DeviceCard connectBtn 口径） |
| A2 | **P006 devhead 连接/断开按钮 auto 宽 sm** | `.devhead .acts .btn{flex:1}`（默认 40px 高） | 单颗全宽默认高度（实测 834L 撑满） |
| A3 | **写/退模态按钮不等宽**（85.3/119.3L） | `.modal{width:100%;max-width:300}` `.btns .btn{flex:1;height:38}` | 模态固定 `Width=300`（终结居中 Border 无穷宽测量下星列退化）+ `*,*`+Margin4.5（seg 同款）；实测 125.3/125.3、距 9.3、高 38 |
| A4 | **P002 stepper 连线塌 0**（横向 StackPanel 内无边框宽度） | `.stepper .ln{flex:1;height:2}` | 改 Grid `72,*,72,*,72`；探针实测连线渲染（done 绿 17C7A8） |
| A5 | **P009 关于页 shell 错**（620px 居中 + navbar 固定 + 身份卡 logo 44/r12 浅底主色图标 + 名称 20px） | E-WIN `about-shell` 768px 居中随滚动 + p009 身份卡 logo 38/r11 深蓝渐变白图标 + 名称 h2 15 | 全部对齐 E-WIN 真实形态 |
| A6 | **P010 版本页 620px 居中**（E-WIN 实为正典全宽）+ 四卡标题缺图标/发布历史空态非正典/缺限制卡 note/缺 foot | E-WIN `renderVersionsPage()` | 全宽 + card-t 四图标（doc/warn/check/dl 承正文色）+ logempty 空态 + 「当前无 Artifact」note + Release Metadata foot |

另修：P007 页顶距 12 / 断开钮顶对齐（`.top{align-items:flex-start}`）、P008 顶距 12 + 按钮行 margin-top 14 +
平台词条「平台：Desktop · Windows」+ UUID 错误行 warning-weak 药丸（.err-line）、subnav 返回钮 fill 底无边框（.back-btn）、
sig/dbm 行垂直居中（.meta align-items:center）、TabBar 角标偏移至正典位（center+13）且 `IsHitTestVisible=False`
（角标可命中会吞 Tab 点击——级联窗位漂移使 TabBar 贴屏底时暴露）、P002 目标卡 padding 12×16 + ava 首字母计算 +
「 · Device Info 已验证」尾注、bigact 标题「扫描 ControlHub 配对码」+ 必需 chip 内联描述行。

## 驱动侧坑位（新）

- **窗口级联漂移**：每轮启动 +30px 右下漂移，多轮后 TabBar 落入屏幕底/任务栏区 → 点击与截图双双失真。
  驱动启动即 `SetWindowPos(40,30)` 固定窗位。
- **居中模态的无穷宽测量**：Avalonia Center 对齐 Border 以无穷约束测子级，`*,9,*` 星列退化成子级自然宽
  （seg 三枚"等宽"纯属文案同形巧合）——模态给固定宽即回到有限约束。

## 验证

- 走查 **92/92 GREEN**（walk-green.log；含 SL1~SL11 布局数值探针：
  acts 等宽 563.3/562.0、内缩 33.3/34.7、钮距 8.0；卡页边距 16.7/17.3；卡间距 ~12+阴影；ava **44.0×44.0**；
  navbar 标题左距 18.7；TabBar 底垫 16.0；模态双钮 125.3/125.3 距 9.3 高 38；stepper 连线渲染）
- `dotnet build` 0 错误（gates/build.log）· `dotnet test` **55/55**（gates/tests.log）
- 视觉复核：扫描页（acts 等宽撑满/间距均匀/边距对称）、关于页（768 居中/身份卡正典）、写弹窗（300 宽/双钮等宽距 9）
  三页 analyze_image 复核通过
- 真机：SHID-00000001（v1.2.0）在场；FW-LOCK 红线未触碰（弹窗仅非法 HEX 校验后取消，零 INPUT 写入）

## 未覆盖（与前轮口径一致）

P003/P005 页面、P002 阶段三下发（协议客户端未移植，降级横幅口径）、摄像头扫码（无摄像头）、
广播实际发射（WinRT 无外围模式）——均维持显式降级。N4 广播 Tab 裁决仍待用户。
