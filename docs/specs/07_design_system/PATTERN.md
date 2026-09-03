# PATTERN —— 交互模式（全平台共享）

> Design System 三件套之三 · 2026-09-02 冻结 v1.0
> 效力：平台实现遇到下列场景一律套用本模式，不得发明新交互。来源：PAGE_SPEC §0 全局约定 + 06_review B 类落地项 + HTML_QA_REPORT 十项好实践。

---

## 1. 导航模式

| 模式 | 规则 | 实现映射 |
|---|---|---|
| Tab 切换 | 四 tab 仅 switchTab，无返回键，页面栈清空 | uni.switchTab / Flutter BottomNavigationBar |
| 二级页入栈 | 一律 navigateTo；返回键 navigateBack | uni.navigateTo / navigator.push |
| 配网成功跳转 | **redirectTo** 替换向导页（返回不回已完成向导） | uni.redirectTo / pushReplacement |
| 栈感知导航 | 目标页在栈中 → pop 至该页；否则 push（PAGE005「返回设备详情」「重新配网」） | getCurrentPages 检查 / navigator.popUntil |
| 空态回首页 | 「去扫描」类按钮一律 switchTab 回 PAGE001 | uni.switchTab |

## 2. 反馈模式

- **轻反馈** toast（success 图标 / none 纯文字，2s）；**重反馈** modal 二次确认（移除/重新配网/离开配网/批量断开失败清单）。
- **复制反馈**：一切复制成功 → toast（已复制/日志已复制/网址已复制/版本已复制）。
- **内联加载**：禁止全屏遮罩 loading；加载态 = op-state / 按钮文案变化（连接中…）+ 禁用。
- **错误码恢复分流**（F022）：8 错误码 → 四种恢复动作（回表单/重新扫码/跳诊断/重下发），按钮文案随错误变化。文案表见 BUSINESS_FLOW。

## 3. 六态模拟模式（Base Prototype 规范 §7）

每关键页必须可呈现：**默认 / 加载 / 成功 / 失败 / 空数据 / 权限异常**。原型通过评审面板场景库切换；平台实现通过等价测试夹具驱动同一状态模型。本产品「网络异常」口径 = 蓝牙链路异常（蓝牙未开/断线/外围失败）。

## 4. 场景库幂等模式（QA Q1 整改）

场景 apply 前先复位该页运行态到默认值，再叠加目标状态；任何场景切换序列不得残留前一场景的副作用（MOCK 连接数、广播运行态、徽章）。

## 5. 数据呈现模式

- **多级名称 fallback**（F005）：name→localName→AD 0x09→AD 0x08→Profile 名→厂商→「未命名 BLE · ID后四位」。
- **信号强度**：RSSI 四格条 + dBm 数值（-60/-70/-80 分档）。
- **等宽展示**：deviceId / HEX 数据 / 错误码 / UUID 一律 mono。
- **双格式数据**：接收固定「HEX: 大写空格分隔 + TEXT: UTF-8 解码（失败省略）」。
- **SIG 标准名**：服务/特征优先中文名，未知显示「服务 N/特征值 N」。
- **字段缺失**：显示「—」不隐藏行；协议缺失 chip「协议未记录」。
- **真实结构 MOCK**（QA Q2 整改）：字段名与逆向文档 §7 对齐——`RSSI`（大写）、`advertisement{state,present,byteLength,length,hex}` 嵌套、`profileMatch{level,profileId}`。
- **31 字节预算**（F016）：实时逐项核算（名称 2+len / UUID / 厂商块 2+2+len），超限红字显示**但不静默截断**，启动拦截。
- **日志脱敏**（F026）：敏感键 → `***`，全局生效。

## 6. 守卫模式

- **离开确认**（U-01 扩展）：配网进行中 **或** configure 阶段表单非空/已扫码时，物理返回拦截 → modal「离开将取消本次配置等待 / 已填写的信息将清空」→ 允许才返回；onUnload 一律清空敏感数据（PAGE_SPEC §0.4）。
- **路由参数守卫**：PAGE003 记录不存在 → modal 单按钮后强制返回；PAGE006 无效参数 → modal 后返回；PAGE002 无设备上下文 → guard 态提示。
- **错误码弹窗**：蓝牙未开（10001）→ modal「请先打开系统蓝牙」+ 去开启。

## 7. 生命周期模式（PAGE_SPEC §0.4）

首页 onHide/onUnload 停扫描；广播页 onHide/onUnload 停广播并释放外围；配网页 onUnload 清敏感数据并断开；诊断页 onUnload 断开本页连接。平台实现映射到各自生命周期钩子（onHide/onUnload → iOS viewWillDisappear / Flutter dispose / Web visibilitychange）。

## 8. 隐私模式

- 隐私声明常驻配网表单底部：「Wi-Fi 密码和配对凭据只用于本次下发，不写入日志或本地存储」。
- 全产品零本地持久化：任何页面不得出现「历史记录落盘」交互（2026-09-02 决策）；PAGE003 为**会话级内存快照页**，须显示说明行（P-02）：「本页为本次配网会话的内存快照，退出小程序后不再可见」。

## 9. 平台条件模式

- **广播三分支**：微信（peripheral）/ App（原生插件）/ 其他（不支持 + banner-note 解释文案 U-03：「当前平台浏览器未提供 BLE 外围模式 API，请使用微信小程序或 App」）。
- **外链三分支**：APP 拉起浏览器 / H5 新窗 / 微信复制+toast。
- **分享三分支**：微信右上角 / APP 系统分享（失败降级复制）/ H5 navigator.share（失败降级复制）。
- 平台标签 chip 常显于广播页头部（Android/iOS/微信/Web）。

## 10. 会话与断连模式

- 被动断线：写队列 abort（未发事务取消不重发）→ 自动重连 3 次（1s/3s/5s backoff）→ 日志逐条反馈 → 成功「会话恢复（READY）」。
- 主动断开：不触发重连；断开后 PAGE001/007 状态同步（卡片按钮恢复「连接」）。
- SHID 配网会话不进已连接列表但计入首页计数（口径差异保持，PRODUCT_REVIEW P-06）。

## 11. OTA 受限模式（P-03）

OTA 入口（检测到 4FAFC201 服务才出现的 danger 按钮）旁/弹窗内固定 warn 预警：「端到端升级链路当前 BLOCKED（固件侧暂未开放），流程可演示，正式使用前需固件配合」。相位文案固定：确认设备→校验→传输 N%→提交→回读→成功（2s 自动关闭）/失败（错误码+重试）。

## 12. 版本与状态词表（PAGE009/010）

- 平台状态五词表：VERIFIED / PREVIEW / BLOCKED / UNSUPPORTED / NOT_RELEASED（REFERENCE 原样）。
- 版本号：运行时真值优先 → release-metadata 回退（v+sha7）→ dev.unknown；三态可模拟。
- PAGE010 页脚固定声明：「本页数据来自 Release Metadata 投影，不是手写版本事实源」。
