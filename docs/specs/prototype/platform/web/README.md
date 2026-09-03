# Web · 平台原型（「GATT 调试器」子集 · D3=开发暂缓，原型先行）

> 2026-09-03 按三规范重构补齐。**原型齐备 ≠ 开发排期**：D3=暂缓（b）不变，本实例为子集形态先行演示。
> 说明文档四件套：[PLATFORM_SPEC](PLATFORM_SPEC.md) · [PAGE_SPEC](PAGE_SPEC.md) · [FLOW](FLOW.md) · [COMPONENT_RULE](COMPONENT_RULE.md)

## 1. 结构

```
web/
├── low-fi/index.html    线框：6 页子集 × 状态 × 流程
├── high-fi/             独立子集内核（web.js 6 屏）+ 浏览器还原层（web.css）
├── PLATFORM_SPEC / PAGE_SPEC / FLOW / COMPONENT_RULE.md
└── README.md（本文）
```

## 2. high-fi：独立子集内核

Web 页面集与基准结构性不同（无扫描列表/广播/配网），故为唯一**独立编写**的内核（非覆写）：W1 门禁 / W2 选择器 / W3 GATT 工作台 / W4 广播不支持 / W5 配网不可达 / W6 关于导出。浏览器系统层（requestDevice 选择器 / 下载条 / 地址栏）为还原层（web.css 头注豁免）。W2 已选设备按**基准 C1 设备卡口径**呈现（2026-09-03 用户修正）：SHID 卡 = 标准「进入 GATT 工作台」+ 扩展「Smart HID 配网」双入口——特殊设备是标准设备的扩展，Web 上标准链路完整可用，配网域按矩阵给指引（W5）。

**生态矩阵消费（2026-09-03 三份入库轮）**：W4 为**双对比卡**——① 10_platform §3 实证口径（微信 △ / Android ✅ / Web ✗ / Desktop △～✅）；② 11_ecosystem 矩阵第二口径（微信 ❌ **C1 冲突待裁决** / macOS ❌ **C2 待验证** / Linux ⚠️ / **Web 未收录 C5**——以 10_platform §3 + W1 实测门禁为准，建议矩阵 v1.1 补 Web 行）。

## 3. 三查自评（SOP §11 / 10_platform §7）

| 查 | 结论 |
|---|---|
| 功能保留 | ✅ 纳入域（S1b GATT 全量 + S5 OTA BLOCKED 同基准 + S6 单连接【多连接待验证】）全量实现；SHID 设备保留标准 GATT 链路（特殊=标准扩展）；缺失域（S1a/S4/S2S3）显式 ✗ 徽章 + 指引发小程序/App（检查 1 口径） |
| 限制合规 | ✅ 环境门禁（HTTPS/浏览器/getAvailability）失败显式横幅且全域联动；选择器取消=用户主动非错误；页签可见性守则不静默断开 |
| 增强利用 | ✅ 已用：大屏日志阅读、URL 直达形态。候选未决策：URL 参数预填（拦截演示） |

## 4. 运行

```bash
cd docs/specs/prototype/platform && python3 -m http.server 8952
# high-fi：http://127.0.0.1:8952/web/high-fi/index.html
# low-fi ：http://127.0.0.1:8952/web/low-fi/index.html
```

## 5. 资源清单

| 文件 | 来源 |
|---|---|
| high-fi/assets/{tokens,components,pages}.css · components/components.js | **字节复制自 v1-new**（diff 校验） |
| high-fi/assets/web.css | 新增 · 浏览器还原层 + 差异辅助类（头注豁免） |
| high-fi/web.js | 子集内核（S→RENDER→ACTIONS 同构，场景幂等 12 条） |
| low-fi/index.html | 线框（子集页面/状态/流程） |

## 6. 【未知】/待验证登记（禁止脑补）

- watchAdvertisements（连续广播监听）：实验性 API【待验证】；
- Safari 桌面支持程度【待验证】；多连接【待验证】（均标注于界面，来源 10_platform §2.3/§3）；
- GATT 服务树与读写返回值为演示值（正典=基准 P006）。

## 7. 验证记录

- 2026-09-03（修正轮）：W2 设备卡断言 9/9 —— SHID 卡双入口（进入 GATT 工作台 + Smart HID 配网）/ 强匹配 chip / RSSI 显式缺省 / SHID 经标准入口进 GATT 且读取可用 / 扩展入口 → W5 指引 / 标准设备卡仅 GATT 入口；console 0 error。初轮 22/22 见 git 历史。
- 2026-09-03（生态矩阵轮，v1.2.0）：7/7 + 符号可读性 2/2 —— W4 双对比卡（实证卡保留 + 生态矩阵卡新增）/ C1·C2·C5 标注 / 冲突符号 vs 化；console 0 error。
- 2026-09-03（推广承接轮，v1.3.0）：14/14 —— W6 新增「更多小程序（F028 · 非微信渠道承接）」卡（渠道规则说明 + 双推广行）+ `web-promo` sheet（小程序码示意 128px + 打开落地页新窗 toast【实证 window.open】+ 保存演示 toast）；console 0 error。
