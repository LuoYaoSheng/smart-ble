# PAGE_LAYOUT_CONTRACT —— 页面骨架与布局契约

> 2026-09-09 冻结 · UI-PARITY-G0。
> 效力：三端页面骨架（导航层 / 内容层 / 底部层的几何与层级）唯一规格。来源：[prototype/v1-new/assets/pages.css](../prototype/v1-new/assets/pages.css)（不产生新值）。
> 页面类型两型：**tab 型**（P001/007/008/009）与 **sub 型**（P002/003/005/006/010）。

---

## 1. 画布与栅格

| 项 | 规格 |
|---|---|
| 设计基准 | 375×780（UniApp rpx = px×2，750 稿；Flutter 逻辑像素 1:1） |
| 页面水平 gutter | 16px（`--sp-4`；UniApp `padding:0 32rpx`） |
| 页面底 padding | 24px（tab 型内容区；`--sp-6`） |
| 卡片内边距 | 16px；卡片间距 12px；卡片组间距 20px |
| 页面背景 | `--c-bg`（#F8FBFF）；导航底渐变 白→`--c-bg` |
| 页面进入动效 | fade + 上移 6px，200ms `--ease`（三端一致；UniApp/Flutter 可省略，不新增其他动效） |

## 2. tab 型骨架（P001 等）

```
┌ AppNavbar（sticky，z-nav）────────────┐  padding 8/18 12；底边 --c-line-soft
│ kicker / title + bt-chip              │
├ 内容滚动区（gutter 16）────────────────┤
│ 区块纵向排布：工具条 → 组标题(sec-t) → │
│ 面板/列表 → 空态/错误横幅              │
├ AppTabBar（fixed 底，z-tab）──────────┤  高 64 + 底安全区；顶边 --c-line-soft
└───────────────────────────────────────┘
```

- 组标题 `sec-t`：`--fs-h1` w700 + 组图标 22px `--c-primary` + 计数 chip(neutral) + 右侧文字链（`--fs-cap` primary）。
- 原生层例外：U-WX 用 `pages.json` 原生 tabBar（png 对）；导航区仍自绘 AppNavbar。

## 3. sub 型骨架（P006 等）

```
┌ AppSubnav（sticky，z-nav）────────────┐  padding 8/14 10；底边 --c-line-soft
│ back-btn 30×30 + title(--fs-h1) + 右槽 │
├ 内容滚动区（gutter 16，底 24）─────────┤
│ 页头卡(devhead) → note → 面板 → dock  │
└───────────────────────────────────────┘  （无 TabBar）
```

- P006 dock：LogPanel(dock) 贴底 sticky（`bottom:0`），上方 12px 渐变过渡（`--c-bg` 透明→实）。

## 4. P001 布局契约（本阶段对齐基准）

自上而下：

| 序 | 区块 | 规格要点 |
|---|---|---|
| 1 | AppNavbar | kicker「BLE TOOLKIT+」/ title「扫描」/ bt-chip 三态（on 就绪 success 点·off 未开启 danger 点·unsupported 平台不支持 muted 点） |
| 2 | 扫描工具条 scantool | 行高 ~40；左标签三态文案（`扫描中 · 5s 会话`+live 脉冲点 6px primary / `扫描完成 · 发现 N 台` / `待开始扫描`，`--fs-cap` `--c-mut`）；右主按钮（未扫=primary `scan`「开始扫描」/ 扫描中=danger `stop`「停止扫描」） |
| 3 | 错误横幅（条件） | danger-weak 底 + 左 3px danger 条 + 「扫描失败」+ code mono 胶囊 + 消息 + 重试(ghost sm dangerText `refresh`) |
| 4 | 组标题 sec-t | `chip` 22 primary + 「附近设备」+ 计数 chip(neutral) + 右「筛选/收起筛选」文字链 |
| 5 | 筛选面板（展开） | 卡容器（`--r-lg` 边 `--c-line`）；四行：RSSI 预设×4（-40 强/-60 较好/-70 一般/-85 弱，激活 primary 实底白字）+ 阈值滑杆(-100..-40 step5) + 名称前缀输入(fill 底圆角 8) + 隐藏无名开关(44×26 激活 success) + 重置过滤(soft sm) |
| 6 | 设备列表 | DeviceCard(scan) 纵列，间距 12；SHID 卡双入口按钮区 |
| 7a | 空态·未扫描 | ill `radar` + 「还没有扫描结果」+ 「点上方按钮开始扫描附近 BLE 设备」+ action soft「开始扫描」(`scan`) |
| 7b | 空态·筛选无匹配 | ill `link` + 「当前没有匹配设备」+ 「调整筛选条件试试」（无 action） |

滚动策略：整页滚动（内容区含列表）；三端一致（F-AND 用 SingleChildScrollView + 列表）。

## 5. 层级与安全区

| 层 | z | 说明 |
|---|---|---|
| 导航（navbar/subnav） | `--z-nav`(10) | sticky |
| TabBar | `--z-tab`(20) | fixed 底 |
| 底部抽屉 sheet | `--z-sheet`(80) | 遮罩 rgba(12,20,36,.45) |
| modal | `--z-modal`(90) | 居中卡 `--r-xl` |
| toast | `--z-toast`(100) | 顶部下滑胶囊 |

底部安全区：TabBar/dock 均延伸至安全区底（iOS 34px 档；Flutter `SafeArea`+`MediaQuery.padding`；UniApp 原生 tabBar 自动处理，APP 端自绘时 `env(safe-area-inset-bottom)`）。

## 6. 弹层与全局件

- modal：白卡 `--r-xl`(20)，max-width 300，标题 16 w700 居中 + 内容 `--fs-body` `--c-sub` + 按钮组（flex:1，高 38）；遮罩点击**不**关闭（uni 行为）。
- sheet：顶部圆角 `--r-xl` + 抓手条 36×4 `--c-line` + 标题行 + 滚动体（max 78%）；遮罩点击关闭。
- toast：`rgba(16,21,33,.92)` 胶囊顶部 64px 下滑，`--fs-cap` 白字，success 带 `check`(#4CDDBE)；2s。

## 7. 禁止项

- 页面自造导航样式（必须 AppNavbar/AppSubnav）。
- 内容区出现圈外留白/分割（间距一律 Token；分割线仅 `--c-line`/`--c-line-soft` 两档）。
- 全屏遮罩 loading（PATTERN §2）；未知动效（仅 spinner/pulse/按压 scale）。
