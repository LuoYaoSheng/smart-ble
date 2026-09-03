# COMPONENT_RULE · App（组件规则 · Android 实例）

> 平台设计说明之四 · 2026-09-03

## 1. 设计系统（单一来源 · 字节复制）

`high-fi/assets/{tokens,components,pages}.css`、`high-fi/components/components.js` 及全部内核文件**字节复制自基准 v1-new**。App 层 UI 不新增任何设计值；组件使用口径同基准 COMPONENT.md（C 注册表唯一来源）。

## 2. 系统层豁免（android.css）

`high-fi/assets/android.css` 为 **Android 系统还原层**：运行时权限弹窗 / 系统配对（PIN）/ 系统分享面板 / 系统设置页 / 系统蓝牙设置 / 系统浏览器。色值为平台还原值（Material 蓝 #0B57D0 等），仅用于「系统渲染」的 UI，不属于设计系统「圈外色值」违规（文件头注声明，README 资源清单登记）。**实际开发中这些弹窗由系统渲染，应用不可定制样式**——对应 `plus.android.requestPermissions` / 系统配对 Intent / `uni.share` / `plus.runtime.openWeb`。

## 3. 覆写层自有组件

| 组件 | 说明 |
|---|---|
| `.swrow` 三开关行 | Android 广播选项（可连接/包含名称/添加 UUID），走 tokens 变量 |
| 激活后的模式/功率 picker | 复用基线 `.picker` + `.opt-row` sheet 选项行 |
| `.asys-*` 系列 | 系统层还原（见 §2），禁止用于产品自身界面 |

## 4. 红线

- 基线文件不得修改（差异只进 android.js 覆写层）；
- 系统层样式不得反向渗入产品层组件；
- 候选增强（后台保连 / 日志文件）组件位保留「候选 · 未决策」标记并拦截，不得放行。
