# 微信小程序 · 平台原型（基准平台 · D1 首批 P1）

> 2026-09-03 按三规范重构（产品模型 v2.0 / 多平台 HTML 原型生成 v1.0 / 平台设计说明规范 v1.0）；同日用户走查修正：新增宿主系统维度覆写层。
> 说明文档四件套：[PLATFORM_SPEC](PLATFORM_SPEC.md) · [PAGE_SPEC](PAGE_SPEC.md) · [FLOW](FLOW.md) · [COMPONENT_RULE](COMPONENT_RULE.md)

## 1. 结构（多平台 HTML 原型生成规范 §1）

```
wechat/
├── low-fi/index.html    线框：9 页 × 状态 × 流程（灰盒，无视觉）
├── high-fi/index.html   高保真：基准产品整体落地（本平台正式实例）
├── PLATFORM_SPEC / PAGE_SPEC / FLOW / COMPONENT_RULE.md
└── README.md（本文）
```

## 2. high-fi：基准内核 + 宿主维度覆写层

- 内核（app.js / pages×9 / components / mock-data / assets）**字节复制自 v1-new**（components.js 同步基准 v1.0.1：SHID 卡恢复标准「连接」入口）——微信即基准形态，产品零差异的最强保证。
- 平台覆写层 `assets/wxhost.js`（2026-09-03 用户走查修正，唯一覆写文件）：
  - **宿主系统维度**：安卓真机 / iOS 真机 / 微信开发者工具 三宿主切换（P009 应用信息卡入口）；
  - 宿主事实（旧代码逆向佐证，`apps/uniapp`）：`pages/broadcast/index.vue` `isWeixinDevTools()` 区分开发者工具（外围广播不可用，需真机调试）；`pages/about/index.vue` 展示宿主 osName/机型；安卓/iOS 真机走同一 wx BLE API 路径，行为一致；
  - 行为差异：devtools 宿主 → P008 真机调试横幅 + 检查支持→不支持 + 启动广播拦截（对齐旧代码 checkWxBleSupport 失败路径）；真机宿主 → 行为一致，仅环境信息不同；
  - 【未知】PC 端微信 BLE 支持未验证，不建模（PLATFORM_SPEC 登记）；
  - P008 defaults 包装修复：go()/switchTab() 重置页面后宿主标志保持（同 android.js platform 教训）；
  - **生态能力矩阵卡（2026-09-03 生态三份入库轮）**：评审栏注入 11_ecosystem 矩阵微信行；**冲突行 C1（广播发送：矩阵 ❌ vs 实证 △ wx.createBLEPeripheralServer=F014）/ C3（多设备：矩阵 ❌ vs F013 已实现）显式标注「待裁决」，实证行为不翻转**（对齐清单见 11_ecosystem/ALIGNMENT_NOTES §2）。
- 系统层：右上角**客户端胶囊**（wx.css 示意，微信客户端渲染，页面不可绘制/定制）。
- SOP §10 三引用：① 基准 v1-new（即本体） ② 10_platform §2.1（含宿主系统维度） ③ §4 微信列（映射见 PAGE_SPEC §2）。

## 3. 三查自评（SOP §11 / 10_platform §7）

| 查 | 结论 |
|---|---|
| 功能保留 | ✅ 29 功能全域与基准逐字节一致（9 页 47 场景）；SHID 卡双入口 = 基准 v1.0.1 口径（特殊设备是标准设备的扩展） |
| 限制合规 | ✅ 权限=微信授权链（基准内置）；后台挂起即停扫/停广播（BR-06）；devtools 宿主限制显式呈现，无静默降级 |
| 增强利用 | ✅ 无新增（10_platform §2.1「保持基准」）；宿主维度为平台事实还原，非功能增删 |

## 4. 运行

```bash
cd docs/specs/prototype/platform && python3 -m http.server 8952
# high-fi：http://127.0.0.1:8952/wechat/high-fi/index.html
# low-fi ：http://127.0.0.1:8952/wechat/low-fi/index.html
```

## 5. 资源清单

| 文件 | 来源 |
|---|---|
| high-fi/{app.js, mock-data/, pages/, components/, assets/{tokens,components,pages}.css} | **字节复制自 v1-new**（diff 校验；components.js = v1.0.1） |
| high-fi/assets/wxhost.js | 新增（2026-09-03 修正）· 宿主系统维度覆写层 |
| high-fi/assets/wx.css | 客户端胶囊还原层（头注豁免） |
| high-fi/index.html | 壳：评审桌面 + 手机 + 胶囊 + wxhost.js 接入 |
| low-fi/index.html | 线框（页面/状态/流程，状态清单源自基准场景库） |

## 6. 开发映射

`apps/uniapp` 基准平台直接实现；胶囊/授权弹窗/分享菜单由微信客户端承载。宿主维度开发口径：`wx.getDeviceInfo().platform` 区分 ios/android/devtools（旧代码同款）；宿主相关分支收敛于广播页与关于页，不散落。

## 7. 验证记录

- 2026-09-03（修正轮）：high-fi 断言 12/12 —— SHID 卡双入口（配置 + 连接，标准链路进 P006）/ 标准卡渲染不变 / wxhost 三宿主切换（P009 入口 + 环境行动态）/ devtools 宿主（P008 徽标 + 真机横幅 + 检查不支持 + 启动拦截 + 错误日志）/ 真机宿主检查支持→支持、启动成功 / defaults 包修（切页不塌陷）；console 0 error。初轮冒烟 7/7 见 git 历史。
- 2026-09-03（生态矩阵轮，v1.2.0）：11/11 —— 矩阵卡渲染（C1/C3 冲突行「❌ vs △ / ❌ vs ✅」）/ 切页与 devtools 宿主下矩阵卡重挂 / 宿主拦截回归 / SHID 双入口回归；冲突符号经视觉复核由 `≠` 改 `vs`；console 0 error；内核 diff 零差异。
