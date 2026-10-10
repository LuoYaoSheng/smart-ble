# 导航栏修复轮（fix-nav）· 2026-09-12

用户报告（截图：Electron 扫描页）：左侧品牌/标题贴边、右上状态芯片卡「初始化中…」但扫描已完成。

## 根因 1：`.navbar` / `.subnav` 负边距 vs 兄弟结构（canon 级缺陷）

正典 `pages.css` 的 `.navbar{margin:0 -16px;padding-left:18px…}` 是为「嵌在 16px 内边距的 `.page` 里」
写的逃逸负边距；但所有原型页面（p001/p002/p003/p005/p006/p007/p008/p010）与 Electron/Tauri 真实
应用均把 navbar/subnav 渲染为 `.page` 的**兄弟节点**（pagehost 无内边距）→ 盒子两侧各越界 16px 被
`overflow-x:hidden` 裁掉，内容距边仅 2px（实测：Electron kicker left=2、chip right=1198/视口 1200；
正典原型同样 kicker left=host+2——canon 自身就错）。

**修复**：`margin:0 -16px` → `margin:0`（共 11 份拷贝，逐字节同步）：
docs/specs/prototype/{v1-new, platform/{app,web,wechat,desktop}/high-fi}/assets/pages.css
+ docs/public/prototype/{app,web,wechat,desktop}/high-fi/assets/pages.css（部署副本）
+ apps/desktop/{electron/public, tauri/src}/prototype.css。
背景/分隔线仍全宽（父容器无内边距，盒子自然铺满），内容对齐 18px/14px。
`.logdock{margin:12px -16px 0}` 是 `.page` 内嵌用法，正确，未动。

## 根因 2：Electron 状态芯片卡「初始化中…」（二次 init 不补发状态）

主进程日志（用户会话 10:18–10:20）证明 `poweredOn` 已两次 `webContents.send`；但 10:20:19 有第二次
`ble:init`（渲染层重载，Cmd+R）→ `loadBLEModule` 走「已加载」早退分支不补发状态，noble 也不会再发
`stateChange` → 新页面芯片永远停在「初始化中…」。

**修复**：`src/main/index.js` 早退分支补发 `sendToRenderer('ble:stateChanged', {state: …})`。
Tauri 侧为拉取式（init_ble 结果直接驱动芯片）天然自愈，未改。

## 验证（全部实测）

| 端 | kicker left | chip right | 状态词 | 备注 |
|---|---|---|---|---|
| 正典原型 :8941 | host+18 ✓ | host−18 ✓ | 蓝牙就绪(绿) | reload 后测量 |
| Electron :9223 | 18 ✓ | 1182 (1200−18) ✓ | 蓝牙就绪(绿) ✓ | 冷启动 + **Page.reload 后自愈** ✓ |
| Electron versionsView(subnav) | back-btn 14 ✓ | — | — | 二级导航同修 |
| Tauri 渲染层 :8942 | 18 ✓ | 1422 (1440−18) ✓ | 初始化中(浏览器无 __TAURI__，壳内为拉取式) | 几何修复 ✓ |

截图证据：electron-p001-navbar-fixed.png / electron-p010-subnav-fixed.png /
proto-p001-navbar-fixed.png / tauri-p001-navbar-fixed.png。
