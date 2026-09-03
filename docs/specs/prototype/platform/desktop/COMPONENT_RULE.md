# COMPONENT_RULE · Desktop（组件规则）

> 平台设计说明之四 · 2026-09-03

## 1. 设计系统（单一来源 · 字节复制）

`high-fi/assets/{tokens,components,pages}.css`、`high-fi/components/components.js` 及全部内核文件**字节复制自基准 v1-new**。桌面产品 UI 不新增任何设计值；组件口径同基准 COMPONENT.md。

## 2. 系统层豁免（desktop.css）

`high-fi/assets/desktop.css` 含两部分（文件头注声明）：

1. **窗口 chrome 还原层**：`.dwin/.dtb`（深色标题栏、红黄绿窗控、关闭钮）——演示窗框，实际由操作系统渲染；
2. **布局调整层**：`[data-pg="p006"] .page` 两栏网格 + `.dcol1/.dcol2` + logdock 解除 sticky——SOP §12 允许的平台布局调整（产品逻辑不变），DOM 重排由 desktop.js 完成。

另含差异屏辅助类（refbar/swrow/opt-row，与 app/android.css 同口径复制）。

## 3. 覆写层自有组件

| 组件 | 说明 |
|---|---|
| 粘贴配对码 sheet | 复用 `.sheet + .field/.inp` + `dtk-sample/dtk-parse` 动作 |
| P006 右栏 | `logPanel(cardv)` + `.dnote` 布局说明条 |
| 退出确认 modal | 复用 DS modal（有会话时文案明示后果） |

## 4. 红线

- 基线文件不得修改（差异只进 desktop.js）；
- 布局重排不得改变读写监听流程与数据模型（STATE_MODEL / DATA_MODEL 不变量）；
- 候选增强（文件流 / 固件库 / 多窗口）组件位保留拦截提示，不得放行；
- D2 选型未定，任何覆写不得绑定 Electron/Tauri 专属 API 假设。
