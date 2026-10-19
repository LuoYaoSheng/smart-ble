# E11: 原型「功能第一」改版 + 实现对齐轮（p009 去大横幅 / F-AND 广播·关于页重建）

日期：2026-09-04 16:00–17:00（Windows 10 19045 + Samsung SM-G9910 真机 + Windows 空口锚点）

用户指令：原型要「功能第一，不为展示而展示」——广播页顶部状态不需要那么大（小标识即可）、关于页大图不要、详情等页面以可操作为核心；改完原型同步到代码；并处理「跑起来的项目没按原型构建、大量不对齐」。

## 一、原型改版（docs/specs/prototype/v1-new → 三壳字节同步）

| 项 | 结论 | 证据 |
|---|---|---|
| p009 关于页大横幅 → 紧凑品牌行 | **完成** | 内核 `?v=1.1.7→1.1.8`；浏览器实测 `.brandcard` 节点 0、品牌行渲染 `BLE Toolkit+ | v1.0.5-preview · preview · 零后端 · 零本地持久化`、console/pageerror 0；截图 `proto-p009-compact.png` |
| p008 广播页 | **盘点后不改** | 原型本就是导航栏小徽章 + 操作表单卡（无大状态卡），大状态卡是 Flutter 实现自造 |
| p003/p005/p006/p007/p010 | **盘点后不改** | 均无纯展示大块（卡片+按钮为主） |
| 三壳同步（wechat/app/desktop） | **完成** | 改动文件字节一致（diff 验证），戳 `?v=1.4.6→1.4.7`，无 1.4.6 残留；web 壳独立子集无 P008/P009 不涉及 |

pages.css 同步删除 `.brandcard` 全套 5 条规则（改后内核与三壳零引用）。修订记录见 `docs/specs/prototype/v1-new/README.md` v1.0.8。

## 二、F-AND（Flutter）广播页重建对齐 p008

**删除**（自造展示块）：64×64 图标大状态英雄卡（含渐变+发光）、平台说明卡、如何测试卡、开始/停止 Snackbar。
**新增/对齐**：AppBar 小状态徽章（点+文字：未就绪/已就绪/已停止/广播中/失败/不支持）；表单卡：设备名称（Android 注明"实际用系统蓝牙名"）/ 服务 UUID（4/8/36 位 HEX 校验）/ 广播模式 + 发射功率（Android picker）/ 厂商 ID（HEX）/ 厂商数据（ASCII）/ ADV 31 字节预算条+分项明细（超限红显并禁用启动）/ 开始·停止 + 检查支持双按钮 / 操作日志面板。

**核心层扩展**（`ble_peripheral_manager.dart`）：
- `normalizeServiceUuid()`：4/8 位短码 → 蓝牙基础 UUID 128 位形式（原生 `UUID.fromString` 只认 128 位，短码直传会崩）
- `startAdvertising()` 增加厂商 ID/厂商数据（Android）/可连接/广播模式/发射功率参数
- `estimateAdvBytes()`：与原型 p008 同口径的字节预算估算

**真机验证（SM-G9910，全部 PASS）**：

| 步骤 | 结果 | 证据 |
|---|---|---|
| 页面渲染 | PASS | 语义树 `f-and-bcast.xml`：徽章"已停止"+六组字段+picker+预算 25/31（14B+4B+7B 口算一致） |
| 开始广播 | PASS | logcat 三行链 `开始广播… → 开始广播: name=BLE Toolkit+, uuid=0000fff0-0000-1000-8000-00805f9b34fb, mfrId=1, connectable=true → [SUCCESS] 广播已开始`；徽章像素转绿（(52,199,89)）；停止按钮红像素 4510 |
| Windows 空口锚点（广播中 10s） | PASS | `44404209D004 n=8 rssi=-51/-64 name=[耀生 的 S21] conn=1 uuids=0000fff0 mfr=0001:424C45`——**厂商数据 mfr=0001:424C45（"BLE"）首次上air**，短 UUID 归一化后空口可见 |
| 停止广播 | PASS | logcat `[INFO] 已停止广播`；徽章回灰；锚点复扫 10s **0 帧**（8 地址无手机） |

修复过程中的两个自造缺陷（均已修复并回归）：
1. **LogPanel 无界高度崩溃**：LogPanel 内部 `Expanded(ListView)` 放进 SingleChildScrollView 后，日志非空即抛无界约束异常、整页白屏 → 外层 `SizedBox(height: 240)` 限高。
2. **页面重挂载不查真实广播态**：PageView 切换重建后 `_isAdvertising` 归零，UI 显示"已停止"而空口仍在广播 → initState 补查 `isAdvertising` 同步；`_toggleAdvertising` 切换前再实时查询防御。

取证备注：本机 uiautomator 对该 Flutter 应用存在**语义树冻结**（多份 dump 字节级雷同、与实况不符），本轮 UI 状态判定改用**像素采样**（徽章区 [897,139][1002,190] 绿/灰）+ logcat + 空口锚点三路独立证据；截图 `step3-after-start.png`（绿徽章+红停止钮）、`step4-after-stop.png`（灰徽章）。

## 三、F-AND 关于页重建对齐 p009

**删除**：220px `about-hero.png` 大图卡（资产文件一并删除）、产品定位卡、核心能力卡（5 行功能介绍）、平台矩阵 chip 墙。
**新增/对齐**：紧凑品牌行（38px 图标 + 名称 + `v2.0.0+1 · 零后端 · 零本地持久化`）；AppBar 版本 chip；更多小程序推广卡（萌喵圈/宝宝点滴，与 uniapp 同源数据，点击 openURL）；应用信息 kv（当前环境/设备型号/版本——device_info_plus + package_info_plus 真实运行时数据）；菜单行（官方网站/问题反馈 url_launcher + 分享应用 share_plus 系统分享）。
**验证 PASS**：语义树 `f-and-about.xml`（品牌行/推广卡/`SM-G9910`/`AP3A.240905.015.A2.G9910ZCSGHZB1`/菜单行全在，无产品定位/核心能力/平台矩阵）+ 截图 `f-and-about.png`。
**已知差距（如实登记，不假装完成）**：版本记录（P010）未实现——Flutter 侧无 release 元数据数据源，登记于对齐审计待办。

## 四、U-AND（uniapp）关于页头部紧凑化

头部 112rpx logo 大卡 → 紧凑品牌行（76rpx logo + 名称 + `版本 · 零后端 · 零本地持久化` 单行），删除 summary 段落与 tech-stack chip 行；移除未用变量。广播页 U-AND 原本已对齐原型（小状态点徽章+完整表单），本轮未改。
**验证 PASS**：`npm run build:mp-weixin` 编译通过（node:crypto 外部化警告为既有项，与本改动无关）。真机 APK 需 HBuilderX 云构建，本轮未产新 APK。

## 五、结论

- 原型（内核+三壳）功能第一改版：**PASS**
- F-AND 广播页重建（含真实启停+空口验证）：**PASS**
- F-AND 关于页重建：**PASS**
- U-AND 关于页紧凑化（编译级验证）：**PASS**
- 全仓对齐差距清单：见 `docs/specs/06_review/PROTOTYPE_ALIGNMENT_AUDIT.md`
