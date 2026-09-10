# 平台扩展原型（prototype/platform/）

> 依据：《旧产品原型跨平台扩展 SOP v1.0》§10/§11 + 《多平台 HTML 原型生成规范 v1.0》+ 《平台设计说明规范 v1.0》（2026-09-03 并入）
> **四平台齐备（2026-09-03）**：每平台 = `low-fi/`（线框：页面×状态×流程）+ `high-fi/`（正式实例）+ 四份说明文档（PLATFORM_SPEC / PAGE_SPEC / FLOW / COMPONENT_RULE）+ README（三查自评 + 验证记录）。
> **原型齐备 ≠ 开发排期**：D1 开发首批 = 微信 + App·Android；Desktop 待 D2 spike；Web 暂缓（D3=b）——决策详见 [10_platform §6](../../10_platform/PLATFORM_EXTENSION.md)。

## 门禁记录

- **基准原型 V1（v1-new）**：2026-09-02 用户走查门禁通过（v1.0）；2026-09-03 走查修正 → **v1.0.1**（devCard：SHID 卡恢复标准「连接」入口，特殊设备 = 标准设备的扩展）。Playwright 26/26 + console 0 error 见 v1-new README。
- **平台扩展原型（本目录）**：2026-09-02 首批交付 → 2026-09-03 按用户反馈 + 三规范重构为四平台齐备结构 → 同日**用户走查修正四项**（SHID 卡双入口内核重同步 / Desktop 配对码改扫码为主粘贴兜底 / 微信新增宿主系统维度 wxhost.js / **Desktop 新增操作系统维度 mac·win·linux**）→ **生态规范三份入库轮**（11_ecosystem：三实例评审栏「生态能力矩阵」卡 + Web W4 第二来源，冲突 C1/C3 标注待裁决；**v1.2.0**）→ **待用户走查 =「平台扩展检查」门禁**。

## 1. 目录结构

```
platform/
├── app/      App 平台（Android 实例 · D1 首批 P2；iOS NOT_RELEASED 随后评估）
├── wechat/   微信小程序（基准平台 · D1 首批 P1 · 基准即实例）
├── web/      Web（「GATT 调试器」子集 · D3 开发暂缓 · 原型先行）
└── desktop/  Desktop（D2 spike 未启动 · 原型先行 · 不预判选型）
```

每平台内部：`low-fi/index.html` · `high-fi/`（完整可运行实例）· `PLATFORM_SPEC.md` · `PAGE_SPEC.md` · `FLOW.md` · `COMPONENT_RULE.md` · `README.md`。

## 2. 实现形态一览

| 平台 | high-fi 形态 | 平台差异载体 |
|---|---|---|
| wechat | 基准内核**字节复制**（components.js = v1.0.1）+ **wxhost.js 覆写层**（宿主系统维度） | 宿主切换（安卓/iOS 真机/开发者工具，旧代码 isWeixinDevTools/osName 佐证）+ wx.css 客户端胶囊示意（系统层）+ **生态能力矩阵卡（C1/C3 冲突标注）** |
| app | 基准内核 + **android.js 覆写层**（基线零改动） | ACTION 运行时覆写 + renderAll 后处理（权限链/广播增强/系统分享）+ android.css 系统还原层 + **生态能力矩阵卡（UNI-APP-AND 行 + iOS 待开发）**；P002 沿用 V1 明文直连 |
| desktop | 基准内核 + **desktop.js 覆写层** + 桌面窗框 | 配对码**扫码为主**+粘贴兜底（2026-09-03 修正）/ **操作系统维度 mac·win·linux（窗口 chrome 三形态 + P008 原生层徽标 + Linux BlueZ 待验证提示）** / P006 三栏重排 / 导出候选拦截 / 退出确认 + **生态能力矩阵卡（随 OS 随动）** |
| web | **独立子集内核**（web.js 6 屏，页面集结构性不同） | 环境门禁 / requestDevice 选择器 / W2 设备卡同基准 C1 口径（SHID 双入口）/ 缺失域显式 ✗+指引 + web.css 浏览器还原层 + **W4 生态矩阵第二来源卡（C1/C2/C5 标注）** |

共享口径：wechat/app/desktop 的内核与冻结设计系统**字节复制自 v1-new**（diff 校验，components.js 随基准 v1.0.1 重同步）；web 复制冻结 DS。基线文件一律不改——平台差异收敛在单一覆写层/内核文件内，可整体评审。

## 3. 三查汇总（SOP §11 / 10_platform §7，逐平台明细见各自 README）

| 平台 | ① 功能保留 | ② 限制合规 | ③ 增强利用 |
|---|---|---|---|
| wechat | ✅ 与基准逐字节一致（29 功能全域） | ✅ 微信授权链 + 后台挂起守则 | 无新增（保持基准） |
| app | ✅ 页面全集自带；六域矩阵 Android 全 ✅ | ✅ 权限全用户触发；拒绝有显式引导恢复；V1 配网零系统配对 | 已用：广播增强/系统分享/浏览器；候选不做：后台保连/日志文件 |
| web | ✅ 纳入域全量；缺失域显式 ✗+指引 | ✅ 环境门禁失败显式且全域联动；页签可见性守则 | 已用：大屏日志/URL 直达；候选不做：URL 预填 |
| desktop | ✅ 页面全集自带（能力 △～✅ 待 spike） | ✅ 常驻+退出确认；配对码 fallback 为文档化路径 | 已用：三栏布局；候选不做：文件流/固件库/多窗口 |

## 4. 运行

```bash
cd docs/specs/prototype/platform && python3 -m http.server 8952
# wechat  http://127.0.0.1:8952/wechat/high-fi/index.html   （low-fi 同理替换路径）
# app     http://127.0.0.1:8952/app/high-fi/index.html
# web     http://127.0.0.1:8952/web/high-fi/index.html
# desktop http://127.0.0.1:8952/desktop/high-fi/index.html
```

> ⚠ 走查须知：`http.server` 不发缓存头，浏览器会缓存旧内核 JS。资源 URL 已带版本戳——**wechat/app/desktop 三壳现为 `?v=1.4.6`（2026-09-03 M-2 轮：F020 扫码失败三分类补齐，app.js + p002-provision.js 内核重同步，desktop.js 覆写层同挂三分类按钮），web 壳为 `?v=1.4.1`（未变更），v1-new 为 `?v=1.1.7`**。看到「改了却没变」时按一次刷新（Cmd+R）即取新版；覆写层资产再变更时同步升版本戳。

## 5. 建议走查重点（平台扩展检查门禁）

1. **app**：P001 权限拒绝两次 → 永久拒绝 → 去设置回流自动续扫；P008 权限链逐项 + 蓝牙关闭 Intent + 三开关预算联动；P002 V1 明文直连并验证零系统配对；**P001 SHID 卡双入口（配置 + 连接，v1.0.1）**；**评审栏「生态能力矩阵」卡（UNI-APP-AND 行 + iOS 待开发）**。
2. **web**：环境切换 HTTP/Firefox → 门禁横幅 + 域徽章联动 + 地址栏变红；选择器单选 SHID → **W2 设备卡双入口（标准 GATT + 扩展配网指引）**、选标准设备 → 仅 GATT；页签失焦连接保持；**W4 双对比卡（实证口径 + 生态矩阵第二口径，C1/C2/C5 标注）**。
3. **desktop**：**P002 扫码为主**（取景器 → 1.6s 自动识别回填 got 态；「无法扫码」→ 粘贴兜底解析）；**P009 操作系统切换**（mac 交通灯 / win 右侧三钮 / linux 仅✕，窗口 chrome 三形态 + P008 徽标 `Desktop · {OS}` + Linux BlueZ 待验证提示 + 矩阵卡随 OS 随动）；P006 三栏 + 右栏日志常驻；窗口关闭退出确认（活动会话文案）。
4. **wechat**：**P009 宿主系统切换**（iOS/安卓真机/开发者工具——devtools 下 P008 真机调试横幅 + 检查不支持 + 启动拦截）；P001 SHID 卡双入口；**评审栏矩阵卡 C1/C3 冲突行（❌ vs △ / ❌ vs ✅ 待裁决）**；其余与 v1-new 走查一致（基准回归）+ 胶囊示意位置。

> 矩阵冲突项裁决入口：走查中若认可「以实证为准」（微信广播=△ 可用、微信多设备=✅），回复时说明即可关闭 C1/C3；若按矩阵收紧（微信广播 ❌ / 多设备 ❌），将翻转 wechat 实例对应演示态并回写 10_platform §3。详见 [11_ecosystem/ALIGNMENT_NOTES §2](../../11_ecosystem/ALIGNMENT_NOTES.md)。

## 6. 验证记录（2026-09-03 · 修正轮 + OS 轮 + 生态矩阵轮；初轮见各 README）

| 实例 | 断言 | console |
|---|---|---|
| wechat/high-fi | 修正轮 12/12 · **生态轮 11/11**（矩阵卡/C1/C3 冲突行/切页与 devtools 宿主下重挂/宿主拦截回归/SHID 双入口回归） | 0 error |
| app/high-fi | 修正轮回归 4/4 · 初轮 23/23 · **生态轮 8/8**（矩阵卡/LysBlePeripheral 行/iOS 待开发/权限链+SHID 双入口回归/P008 增强表单与矩阵卡并存） | 0 error |
| desktop/high-fi | 修正轮 16/16 · **OS 轮 15/15**（三档 chrome+环境+P008 徽标/日志/回归）· **生态轮 13/13**（矩阵卡随 OS 三档随动/mac C2/win/linux 行/P002 扫码回归） | 0 error |
| web/high-fi | 修正轮 9/9 · 初轮 22/22 · **生态轮 7/7 + vs 化 2/2**（W4 双对比卡/C1/C2/C5 标注） | 0 error |
| low-fi ×4 | 页面/状态/流程渲染与切换冒烟通过（8 页 0 error）；低保真不承载生态矩阵（结构层走查，能力呈现收敛在 high-fi 评审栏） | 0 error |
| 视觉复核 | 生态矩阵卡特写 + 两实例整页截图 AI 视觉复核：卡片/符号/颜色可辨（冲突符号已由 `≠` 改 `vs` 提升小字号可读性）；评审栏为滚动区，底部裁切为正常形态 | — |

冻结资产字节一致性：`diff -r` 对 v1-new 校验通过（app.js / pages / mock-data / components 四目录 × wechat·app·desktop 零差异——生态矩阵轮仅动覆写层与壳，内核未触碰）。

### 全量复走轮（2026-09-03 · 用户指示「所有平台都过一过」）

四平台逐一无遗漏复走（不止 web/desktop），重点 = 生态矩阵呈现 + 历轮修正共存回归：

| 实例 | 断言 | console |
|---|---|---|
| wechat/high-fi | 6/6：矩阵卡 10 行常驻（P001/P008/P009）· C1/C3 冲突行 · P001 SHID 三入口（卡体=查看广播 + 配置 + 连接，基准 devCard 口径核实）· 宿主 devtools→P008 拦截 / ios 恢复 · v=1.2.0 | 0 error |
| app/high-fi | 2026-09-05 V1 简化回归 PASS：P002 进入填写页并触发 `pairing_expired` 状态流，全程无系统配对层；矩阵卡/权限/广播/分享仍挂载 | 0 error |
| desktop/high-fi | 8/8：三 OS 矩阵随动（mac ❌C2【待验证】/ win ⚠️WinRT / linux 监听✅BlueZ）+ 窗口 chrome 同步 · P002 取景器 1.6s 自动识别回填 + 手动确定 + 粘贴兜底解析（shid://pair）· linux P008 BlueZ 警示日志 · P006 .dcol1/.dcol2 两栏重排 | 0 error |
| web/high-fi | 5/5：W1 环境门禁 · W2 系统选择器→选 SHID→基准 C1 卡双入口（GATT 工作台 + Smart HID 配网）+ 强匹配 chip · W4 双对比卡（实证口径 + 生态第二口径，C1/C2/C5） | 0 error |
| low-fi ×4 | 四平台加载渲染通过；desktop p009「宿主 OS 三档」chip + p008「平台徽标 Desktop · {OS}」chip 复核 | 0 error |
| 内核 | diff 12/12（app.js/components/pages/mock-data × 三实例 = v1-new 字节一致） | — |
| 文档 | app/PLATFORM_SPEC 补 §2b 生态矩阵口径（对齐 wechat §2b / desktop §2a / web W4 行——App 行全量一致直接吸收 + iOS NOT_RELEASED） | — |

### 推广承接轮（2026-09-03 · 用户指示「非微信平台的更多小程序需落地页或二维码承接」+ 指正「微信内应直接跳转，不能跳才弹窗」）

**F028 推广跳转已移除（2026-09-10 · 用户指示）**：更多小程序推广区整链下线——各平台 `p009-promo` 内核 action 与覆写层（APP/Desktop 承接 sheet、Web W6 卡）、mock promo 数据、`.promo` 样式全部删除；03_flow/PAGE_SPEC §9、02_product/PRD、07 C11（编号退役）、10_platform §4 差异行同步作废。下方历史审计行中关于 `p009-promo` 的记录为当时事实，不回溯修改。

| 实例 | 断言 | console |
|---|---|---|
| app/high-fi（v1.4.0） | 13/13：`p009-promo` 覆写 sheet（小程序码 128px 三定位角 + 打开落地页→asysBrowser lightble.example.com + 保存演示）· note 行内排版与按钮单行在 sheet 内复核 | 0 error |
| desktop/high-fi（v1.4.0） | 15/15：同 sheet 形态（浏览器打开落地页 toast + 下载小程序码 toast）· 双推广卡入口 | 0 error |
| web/high-fi（v1.4.0） | 14/14：W6 新增「更多小程序（F028 · 非微信渠道承接）」卡 + `web-promo` sheet（新窗落地页 toast + 保存演示） | 0 error |
| wechat/high-fi（v1.4.0） | **微信直跳修正（用户指正）**：`p009-promo` 内核改点击直接发起 navigateToMiniProgram（原「即将打开…前往/取消」确认弹窗不符合实证 openApp——直跳无弹窗，仅无 appId/失败才弹）+ 新增 P009「推广卡跳转失败」场景（modal 分支）；场景库 44→47（原计数已 stale 2） | 0 error |
| 内核 | 直跳修正（app.js）三实例字节同步，`diff -r` 零差异；五壳全量升戳（平台四壳 v=1.4.0、v1-new v=1.1.1——内核变更必须升戳） | — |
| 视觉复核 | AI 视觉复核：note 连贯横排、二维码 128px 三定位角可辨、按钮单行完整；初版「逐字断行+按钮溢出」缺陷已修（.note 为 flex 容器必须走 C.note 单容器；svg 需内联宽高） | — |

## 7. 下一步

平台扩展检查（用户走查本门禁）→ 开发准备 `08_development/` 四件套（API_SPEC=BLE GATT 契约 / DATA_MODEL / ERROR_CODE / PERMISSION；输入已备：STATE_MODEL §2 错误码契约、BUSINESS_RULE §1 红线、PERMISSION_REVIEW §3/§4）。D2 spike 启动前不进入 Desktop 开发；候选增强维持不做。
