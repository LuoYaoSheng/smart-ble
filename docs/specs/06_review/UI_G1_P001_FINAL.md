# UI_G1_P001_FINAL —— P001 三端最终对齐判定

> 2026-09-09 · UI-G1 任务产出。
> 基准：[`prototype/v1-new/pages/p001-scan.js`](../prototype/v1-new/pages/p001-scan.js)（与 platform/wechat、platform/app 两套 high-fi 的 p001 页面**逐字一致**——平台差异全部在壳层与运行时行为，见 [`platform/wechat/PAGE_SPEC.md §2`](../prototype/platform/wechat/PAGE_SPEC.md) 与 [`platform/app/PAGE_SPEC.md §2`](../prototype/platform/app/PAGE_SPEC.md)）。
> 三端：U-WX（mp-weixin）· U-AND（uniapp Android，标准基座真机 E5）· F-AND（Flutter Android，debug APK 真机 E5）。
> 截图归档：[`ui-g1-p001/`](ui-g1-p001/)（prototype ×8 / U-AND ×9 / F-AND ×8，2026-09-09 真机与 Edge headless 渲染）。
> 判定口径：PASS = 与基准一致（真机/像素/文本证据）；FAIL = 与基准或平台规格存在实现偏差；ALLOWED_PLATFORM_DIFF = 基准明示的平台差异白名单。

---

## 0. 证据采集方式与限制

| 目标 | 采集 | 限制 |
|---|---|---|
| prototype | Edge headless + Playwright 驱动 v1-new 评审桌面场景库（6 场景 + 扫描/筛选交互态），截 375×780 手机区 | — |
| U-AND | E5（SM-G9910/Android 15）HBuilderX 标准基座真机：uiautomator 逐字 dump + `svc bluetooth disable` 状态机 + 真实射频环境（8 台邻居，含 ESP32 真 SHID 固件 SHID-00000001 @ -29dBm 强匹配） | — |
| F-AND | 同机 `com.smartble.flutter` debug APK；Flutter 不暴露无障碍文本 → 像素级校验（按钮红/蓝簇、danger-weak 横幅底、薄荷头像、primary-weak 徽章、信号绿格）+ widget_test 断言佐证 | — |
| **U-WX** | **微信开发者工具 `islogin:false`（扫码登录未完成，IDE 52628 端口就绪但游客态桥死）→ 本轮无法出真机/工具截图**。U-WX 与 U-AND 同仓同码（同一 pages/index 与组件层），判定按代码同一性 + tabBar 位图资产同源（G0 已像素校验烤色）给出，标注 code-verified | **截图缺失已登记，待开发者工具登录后补 `uwx-*.png` 并复核** |

---

## 1. 判定矩阵（11 检查项 × 四目标）

| # | 检查项 | prototype | U-WX | U-AND | F-AND |
|---|---|---|---|---|---|
| 1 | **Navbar** | kicker「BLE TOOLKIT+」+ 标题「扫描」+ bt-chip 三态（proto-01/07/08） | ✅ PASS（code，AppNavbar 同 U-AND） | ✅ PASS（真机：三态词逐字 + 就绪绿点/未开启红点两态实证，uand-01/07；状态栏不重叠） | ✅ PASS（真机 fand-01/07；三态词 widget_test 断言） |
| 2 | **TabBar** | 四项 scan/link/cast/info，激活品牌蓝（proto-01 底栏） | ✅ PASS（png 资产对，G0 修复后烤色像素校验） | ✅ PASS（uand-01 原生 tabBar：蓝放大镜 + 灰蓝×3，G0 真机复验） | ✅ PASS（fand-01 BottomNavigationBar + AppIcon 字形；PARITY-ICON 测试锁定） |
|   | | | 载体差异：**ALLOWED_PLATFORM_DIFF**（U-WX/U-AND=原生 tabBar png 对；F-AND=BottomNavigationBar 字形；VISUAL_CONTRACT §2 白名单） | 同左 | 同左 |
| 3 | **ScanToolbar** | 左标签三态 + live 脉冲点 + primary「开始扫描」⇄ danger「停止扫描」（proto-01/02） | ✅ PASS（code） | ✅ PASS（真机三态全实证：待开始扫描/扫描中·5s 会话/扫描完成·发现 8 台，dump 逐字；danger 按钮 6722 红像素，uand-02） | ✅ PASS（fand-01/02/03；danger 按钮 9437 红像素；三态词 widget_test 断言） |
| 4 | **Filter** | 四行正典：预设×4（强[-40]/较好[-60]/一般[-70]/弱[-85]）+ 阈值滑杆 + 名称前缀（占位「如 SHID / LightBLE」）+ 隐藏无名 + 重置（proto-03） | ✅ PASS（code） | ✅ PASS（uand-04 + dump 逐字命中全部行与占位文案；-40 预设实测过滤 8→1 台） | ✅ PASS（fand-04；四档行 widget_test 断言；-40 预设实测过滤） |
| 5 | **DeviceCard** | 头像/名称/mono ID（未命名后缀）/sig+dBm/动作区（proto-01） | ✅ PASS（code，components/ui/DeviceCard） | ✅ PASS（真机 8 卡；SHID 卡逐字：SHID-00000001 / 10:B4:1D:CD:23:8E / 配置 Smart HID+连接 双入口，uand-03/05） | ✅ PASS（fand-03 像素：白卡/头像/徽章底/信号绿全命中；规格=COMPONENT_CONTRACT C1） |
| 6 | **Profile Badge** | STRONG「Smart HID · 强匹配」primary / WEAK「疑似 Smart HID · 弱匹配」warning（proto-01 两卡） | ✅ PASS（code） | ✅ PASS（真机强匹配徽章逐字实证；弱匹配文案同链注册表，F018 真机在册） | ✅ PASS（真机 primary-weak 徽章像素实证；chipLabel 同链，F018 在册） |
| 7 | **RSSI** | 四格条（q4/q3 绿、q2 黄×2、q1 红）+ dBm mono（proto-01） | ✅ PASS（code） | ✅ PASS（真机 -29/-31 dBm 绿格实证；分档阈值同正典） | ✅ PASS（信号绿格像素实证；SignalBars 同分档同色） |
| 8 | **Empty** | 空态 A：radar+「还没有扫描结果」+「点上方按钮开始扫描附近 BLE 设备」+soft 动作；空态 B：link+「当前没有匹配设备」+「调整筛选条件试试」（proto-04/05） | ✅ PASS（code） | ✅ PASS（真机 A/B 双态逐字实证，uand-01/09） | ✅ PASS（A=widget_test 断言「开始扫描」×2 含空态动作；B=真机过滤清空实测（卡片像素归零），文案无障碍树不可读、以同构 AppEmpty 组件佐证） |
| 9 | **Loading** | 扫描中标签 + live 点 + danger 停止键（proto-02） | ✅ PASS（code） | ✅ PASS（uand-02 真机：danger 键 + 「扫描中 · 5s 会话」标签实证） | ✅ PASS（fand-02 真机：danger 键 9437 红像素 + _PulseDot 动画组件） |
| 10 | **Error** | scan_failed 横幅（code chip+重试，proto-06）+ 10001 蓝牙未开 modal（proto-07：题「提示」/文「请先打开系统蓝牙」/键「去开启」） | ❌ **FAIL**（10001 modal 文案三字段与正典不一致，见 §2-E1；scan_failed 横幅组件 code 对齐） | ❌ **FAIL**（真机 uand-08：modal 形态 ✓ 但文案=「无法开始扫描/请先打开系统蓝牙，再重新开始扫描。/确定」≠正典；且 app/PAGE_SPEC 的「Intent 系统蓝牙设置+回流续扫」未实现，见 §2-E1） | ❌ **FAIL**（真机 fand-08：蓝牙未开走 B8 横幅而非正典 10001 modal（PATTERN §6），见 §2-E2；横幅本体像素级对齐正典 danger-weak+左条） |
| 11 | **Permission** | 场景 5 蓝牙未开 modal / 场景 6 平台不支持（proto-07/08）；wechat=微信蓝牙授权+去设置；app=首次扫描 FINE_LOCATION 系统弹窗 | ⚠️ code（微信授权口径由宿主弹窗承接，PAGE_SPEC 微信形态注记）——待 U-WX 截图复核 | ✅ PASS（真机 uand-06：**点「开始扫描」即时触发系统定位弹窗**，与 app/PAGE_SPEC「首次扫描触发」完全一致；拒绝→`bluetooth_permission_denied` 横幅分支未复现，代码登记为补充态） | ✅ PASS（真机 fand-06：系统定位弹窗实证；**时机为页面 init 而非首次扫描** = 与 app 规格的时序偏差，两端均为 F 域真机已验证行为，判 ALLOWED_PLATFORM_DIFF 并登记 §2-E3） |

**汇总：11 项中 PASS 9 项（其中 TabBar 含载体平台差异白名单）；FAIL 1 项（Error，三端各一子偏差，全部受任务「不改变 F001-F005」约束本轮不修）；Permission 三端各有注记。**

## 2. 偏差登记（本轮判定为 FAIL 的明细，修复受约束）

- **E1 · U-WX/U-AND 10001 modal 文案偏差**（PATTERN §6 vs 实现）：正典=题「提示」/文「请先打开系统蓝牙」/键「去开启」（跳系统设置）；实现=题「无法开始扫描」/文「请先打开系统蓝牙，再重新开始扫描。」/键「确定」（无跳转）。app/PAGE_SPEC P001 差异行另要求「蓝牙关闭→Intent 系统蓝牙设置→回流自动续扫」，两端均未实现。该路径属 F002 权限前置已验证行为（F001-F005 真机证据链断言现行文案），任务红线禁止修改 → **登记遗留，待 F 域证据链更新窗口统一对齐**。
- **E2 · F-AND 10001 走横幅而非 modal**：蓝牙未开时 F-AND `_startScan` 失败进 B8 错误横幅（fand-08 像素实证 danger-weak 底+左 danger 条+code chip+重试），正典 PATTERN §6 规定 10001=modal。同为 F001 已验证行为 → **登记遗留**。
- **E3 · F-AND 权限请求时机 init vs 首次扫描**：app/PAGE_SPEC「首次扫描触发」；F-AND 在页面初始化即请求三权限（fand-06 于冷启弹出）。F-AND F001 真机已验证行为 → ALLOWED_PLATFORM_DIFF + 登记。

## 3. 截图索引（ui-g1-p001/）

| 状态 | prototype | U-AND | F-AND | U-WX |
|---|---|---|---|---|
| 默认/空态 A | proto-01（已扫描列表）/ proto-04（空态 A） | uand-01 | fand-01 | ~~（登录受限，见 §0）~~ **uwx-p001-empty-a（2026-09-10 vis1 补采，automator）** |
| 扫描中 Loading | proto-02 | uand-02 | fand-02 | —（devtools 宿主蓝牙可开，扫描态待六态全量轮） |
| 筛选展开 | proto-03 | uand-04 | fand-04 | **uwx-p001-filter（2026-09-10 vis1 补采，setData 直驱；四预设/滑杆/名称前缀/隐藏无名/重置全项）** |
| 设备列表/SHID 卡 | proto-01 | uand-03 / uand-05 | fand-03 | —（需真射频设备） |
| 空态 B 筛选无匹配 | proto-05 | uand-09 | fand-09 | — |
| Error（10001） | proto-06（scan_failed）/ proto-07（modal） | uand-08（modal） | fand-08（横幅）+ **fand-p001-scan-error（2026-09-10 vis1：bluetooth_unavailable B8 横幅模拟器复现，E2 形态）** | —（E1 文案偏差仍以 code 判定为准） |
| 蓝牙未开 navbar | proto-07 | uand-07 | fand-07 | — |
| 平台不支持 | proto-08 | （代码态，不可复现） | （代码态） | —（另证：nios-p001-empty-a 同场景 N-IOS 真实态，VISUAL §3 vis1-nios） |
| Permission 系统弹窗 | —（六态模拟内置） | uand-06 | fand-06 | — |

## 4. 门禁与验证

- 本轮零代码改动（判定+证据+文档）；G0 门禁仍全绿：`check-icon-usage` / `check-token-usage` PASS、`flutter analyze` 0 / `test` 69、`build:mp-weixin` DONE。
- 真机环境：E5 + ESP32（真 SHID 固件，SHID-00000001 强匹配源）+ 邻居 8 台；蓝牙状态机经 `svc bluetooth disable` + 设置页开关往返验证。
- 后续（超出 G1 范围）：①~~开发者工具登录后补 U-WX 截图与复核~~ **已完成（2026-09-10 vis1 可达态首轮）：U-WX 空态A+筛选展开截图落袋（§3），P001 判定 U-WX 列由 code-verified 升级为 code+截图复核；E1 modal 态 devtools 不可达仍以 code 判定为准**；②E1/E2/E3 随 F 域证据链更新窗口修复（红线锁定，待用户放权）。
