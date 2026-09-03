# COMPONENT_RULE · 微信小程序（组件规则）

> 平台设计说明之四 · 2026-09-03

## 1. 设计系统（单一来源）

`high-fi/assets/{tokens,components,pages}.css` 与 `high-fi/components/components.js` **字节复制自基准 v1-new**（07_design_system 冻结 v1.0 的唯一实现）。微信平台不新增任何设计值、不重复实现组件（QA Q3 同规）。

## 2. 系统层豁免（唯一）

`high-fi/assets/wx.css`：**客户端胶囊**（••• | ⊙）为微信客户端渲染的系统 UI，原型仅作示意还原（客户端 chrome 还原值，见文件头注）。胶囊 `pointer-events:none`，不参与交互。除此之外，微信系统层 UI（授权弹窗、分享菜单、扫码界面）均由微信客户端渲染，**原型不绘制**——基准 P001 权限态以产品层横幅/弹窗表达。

## 3. 组件使用口径

与基准 COMPONENT.md 完全一致：C 注册表（ic/chip/badge/btn/txtlink/ILL/empty/op/ebanner/note/kv/devCard/logPanel/stepper/stIcon）为唯一组件来源；页面禁止重复实现。

## 4. 开发映射

`high-fi/` 即开发实现目标本身（apps/uniapp 基准平台）；胶囊对应微信客户端能力，无需开发；分享对应 `onShareAppMessage` / `uni.setClipboardData`。
