# 设计 Token 平台映射（DESIGN_TOKEN_PLATFORM_MAPPING）

- 创建：2026-09-07 · Multi-end Parity Gate（图标节先行交付；其余 Token 节随视觉 Gate 补齐）
- 验收对象：U-WX（apps/uniapp → 微信小程序）/ U-AND（apps/uniapp → Android）/ F-AND（apps/flutter → Android）
- 事实源：[TOKEN.md](../07_design_system/TOKEN.md)（全平台唯一视觉数值来源）+ `prototype/v1-new/index.html` 内联 SVG sprite
- 本文件定位：**实现侧映射登记**——正典值 → 三线实现载体 → 锁定方式。矩阵侧判定在 [MULTI_END_VISUAL_PARITY_MATRIX.md](MULTI_END_VISUAL_PARITY_MATRIX.md)。

## 1. 图标正典（ICON CANON）——2026-09-07 PARITY-ICON 落地；同日 PARITY-ILL 补空态插图（§1.5）与位图管线（§1.6）

### 1.1 正典定义（不可在本文件修改）

- 唯一来源：`docs/specs/prototype/v1-new/index.html` 内联 `<symbol>` sprite，35 枚 24×24 线性图标（stroke 1.8/2/2.2 · round · currentColor），命名 `i-*`；规范条款 [TOKEN.md](../07_design_system/TOKEN.md) §7。
- 变更流程：先改原型 sprite（原型缺陷须按 8 类归因确认），再同步重生成三处镜像；**禁止在实现侧增删改图标字形**。
- 文字标记不属于图标（保留文字渲染）：stepper 完成步 `✓`；P002 进度行 `done ✓ / fail ✕ / 其余 ·`；诊断行 active/pending `·`。

### 1.2 三线实现载体

| 线 | 载体 | 位置 | 机制 | 锁定 |
|---|---|---|---|---|
| U-WX / U-AND（页内） | `AppIcon` 组件 | `apps/uniapp/components/common/app-icon.vue` | data-URI `background-image` 内联 SVG（mp-weixin 不支持内联 `<svg>`），运行时注入 `{C}` 图标色 / `{KNOB}` 旋钮底色，`rotate` 支持方向变体 | `services/design/app-icons.js` 镜像 |
| U-WX / U-AND（tabBar） | 正典字形 PNG（81×81） | `apps/uniapp/static/tabs/{scan,link,cast,info}{,_active}.png` | 微信 tabBar 仅接受本地 PNG，由 sprite 烤色光栅化（#7B8FA5 未选中 / #1B6DFF 选中，取自 pages.json tabBar 配色）；生成脚本 `E:\project\xf\icon-gen\gen-tabs.js`（仓库外临时，可按 §1.1 重做） | `pages.json` tabBar 引用 + page-flow 静态测试 |
| F-AND | `AppIcon` 组件 | `apps/flutter/lib/core/design/app_icons.dart` | `flutter_svg` `SvgPicture.string`，运行时注入颜色；`rotate` 方向变体 | 同文件 `kAppIcons` 镜像 |

镜像等价性由两侧测试锁定：

- uniapp `pages/page-flow.test.js`：`PARITY-ICON: icon canon mirror is locked to the prototype sprite`（35 枚名单与 sprite 逐一比对）+ tabBar 资产测试（禁止 device/hid/broadcast/about 旧字形文件回潮）。
- flutter `test/widget_test.dart`：`canon icon set renders all glyphs without error`（flutter_svg 真实解析 35 枚）+ `tab icons are canon AppIcon glyphs`。

### 1.3 语义映射（Material → 正典，2026-09-07 已完成替换）

| 语境 | Material（旧·已废） | 正典 name | 备注 |
|---|---|---|---|
| Tab 扫描 / 重新扫描 / 搜索框 | bluetooth_searching / search | `scan` | |
| Tab 已连接 / 连接语义 | devices_other(±outlined) / bluetooth_connected | `link` | |
| Tab 广播 / 服务入口 | broadcast_on_personal(±outlined) / settings_input_antenna | `cast` | |
| Tab 关于 / 信息提示 | info(_outline) | `info` | |
| 官方网站（外链） | language | `ext` | p009 菜单 |
| 问题反馈 / 发送 | send(_outlined) | `send` | |
| 版本记录 / 文档 / 只读 | history_outlined / description / read_more | `doc` | |
| 分享 / 导出 | share(_outlined) / ios_share | `share` | |
| 菜单/列表箭头 | chevron_right | `chev-r` | |
| 返回箭头 | chevron_left / arrow_back | `chev-r` + `rotate: 180` | 正典无左向字形，旋转变体 |
| 折叠展开 | expand_less / expand_more | `chev-d` + `rotate` | |
| 成功 | check(_circle(_outline)) | `check` | |
| 关闭/清除/断开/失败态 | close / clear / link_off / bluetooth_disabled | `x` | |
| 警告/错误横幅 | warning_amber / error_outline | `warn` | 原型 ebanner 错误横幅即 warn 字形 |
| 刷新/重检/重新配网 | refresh / settings_remote_outlined | `refresh` | p003/p005 正典按钮即 refresh |
| 启动（广播/Notify/播放） | play_arrow / play | `play` | |
| 停止/暂停 | stop / pause | `stop` | 正典无 pause，统一 stop 字形 |
| 扫码 | qr_code | `qr` | |
| 密码可见性 | visibility / visibility_off | `eye` / `eye-off` | |
| 复制/粘贴 | copy / content_paste | `copy` | |
| 诊断/心跳/Notify 活动 | monitor_heart(±outlined) / notifications_active | `pulse` | |
| 高级 BLE / 服务图标 | developer_mode_outlined / settings_input_component | `chip` | |
| 重新配置（P003 主按钮） | settings_remote_outlined | `refresh` | p003 正典 |
| 表单修改入口 | edit | `set` | 正典无铅笔字形 |
| 筛选 | filter_list_off | `set` | |
| OTA / 下载 / 接收 | system_update_alt / download / arrow_downward | `dl` | |
| 上行/写入 | upload / arrow_upward | `send` | |
| 日志 | article | `log` | |

> Material 图标自此从三线业务 UI 退役；`uses-material-design: true` 仅为 Flutter 框架内部控件保留。

### 1.4 旋转/变体约定

正典只有单方向字形的，用 `rotate` 派生（不改 sprite）：`chev-r` 180°=左箭头；`chev-d` 180°=上折角。除此之外禁止自造字形。

### 1.5 空态插图正典（EMPTY-STATE ILL）——2026-09-07 PARITY-ILL 已落地

- 唯一来源：`docs/specs/prototype/v1-new/components/components.js` 的 `C.ILL`，4 幅 118×86 线性插图（`radar` / `link` / `doc` / `box`），自配色（#1B6DFF/#17C7A8/#9AA8B6/#E3EAF3），**透明底**（无背景矩形）——占位/空态类插画一律不得带底色矩形或位图白底。
- 页面映射（`C.empty({ill})` 正典选择）：P001 未扫描=`radar`、筛选无匹配=`link`；P007=`link`；P010 两处=`doc`；P003/P006 路由空态=`box`。**P006 服务列表空态与 P006/P008 日志空态无插图**：前者为 `C.op(mode:'warn')` 文案块（warn 字形 + 「服务发现完成 · 列表为空」），后者为单行 `.logempty` 文字。
- 三线载体（与 §1.2 图标镜像同构的锁定镜像）：

| 线 | 载体 | 位置 | 机制 |
|---|---|---|---|
| U-WX / U-AND | `AppIll` 组件 | `apps/uniapp/components/common/app-ill.vue` | data-URI `background-image`（118:86 等比），镜像 `services/design/app-illustrations.js` |
| F-AND | `AppIll` 组件 | `apps/flutter/lib/core/design/app_illustrations.dart` | `flutter_svg` `SvgPicture.string`，同文件 `kAppIlls` 镜像 |

- 生成脚本 `icon-gen/gen-ills.js`（仓库外临时；正典 `C.ILL` 变更后重生成两镜像）。
- 锁定测试：uniapp `page-flow.test.js` `PARITY-ILL: empty-state illustration mirror is locked to prototype C.ILL`（4 名单 + 逐字主体 + 禁 `<rect>`）+ 占位位图零引用断言；flutter `widget_test.dart` `canon empty-state illustrations render without error`。
- 随本轮退役的偏离资产：`apps/uniapp/static/placeholders/*`（4 组 320×320 方形白底 PNG/SVG，构图与背景均偏离正典）、`static/brand/about-hero.png`（无引用）。

### 1.6 位图资产管线（ChatGPT2API）——2026-09-07 起

正典之外的**必需位图**（平台 API 硬性要求图片文件的槽位）经自托管 ChatGPT2API 生图服务统一生产，禁止散手制图：

| 槽位 | 文件 | 规格 | 生成 |
|---|---|---|---|
| 微信分享 imageUrl（朋友圈/会话） | `apps/uniapp/static/logo.png` | 512×512 全出血 | gpt-image-2 → sharp 512 |
| F029 分享应用卡图 | `apps/uniapp/static/share.png` | 1024×1024 主体居中（5:4 裁切安全） | gpt-image-2 → palette PNG |
| F-AND 启动器图标源图 | `apps/flutter/assets/images/icon.png` | 512×512 全出血 | 同一 icon 源派生 |
| F-AND Android legacy 启动器 | `android/.../mipmap-{m..xxxhdpi}/ic_launcher.png` | 48/72/96/144/192 | sharp 光栅化派生 |
| F-AND Android 原生启动图 | `android/.../drawable-{m..xxxhdpi}/splash.png` | 256→1024 | 同上 |

- 服务：`POST {BASE}/v1/images/generations`，`model=gpt-image-2`，`response_format=b64_json`，单张 40–60s（超时给 300s+）；脚本 `icon-gen/gen-brand.js` + 落位 `icon-gen/install-brand.js`（仓库外临时）。视觉验收过 `analyze_image` 质检再落位。
- 设计口径：品牌蓝渐变（#0E4FC4→#1B6DFF）+ 白色 BT 字形 + 信号弧/环点缀；与 P009 正典品牌标（§1.5 同源的渐变盒+bt 字形）同语言。
- **透明底规则**：占位/插画类资产（§1.5）一律透明底且来自正典 SVG 镜像，不经 AI 生成；AI 位图仅用于上述全出血槽位。如未来出现需要透明底的 AI 资产，请求体加 `background:"transparent"`（gpt-image 系参数）。

## 2. 颜色 Token 映射（待视觉 Gate 回填）

| Token | 正典值 | U-WX/U-AND 载体 | F-AND 载体 | 判定 |
|---|---|---|---|---|
| （占位——随视觉 Gate 逐项补齐） | | | | |

## 3. 字号/字重/圆角/间距/阴影映射（待视觉 Gate 回填）

（占位）
