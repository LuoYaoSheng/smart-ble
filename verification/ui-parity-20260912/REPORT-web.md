# UI Parity 验证 · 线2 Web 官网 .vitepress（2026-09-12）

- 基线：commit `567f78a` + 本轮修复（见下）
- 通道：`npm run docs:build` 全新构建 dist + http.server 8934 + Playwright（1280×900）

## 发现并修复 P1：官网从当前源码无法构建

- 症状：`docs:build` SSR 崩，`status/index.md` 读 `undefined.name`
- 根因：05410de 把状态页模板改为 11 卡新口径（`android_native`/`flutter`/`desktop` 拆散键），
  但 `docs/public/release/latest.json` 的 `public_surfaces` 仍是旧口径——只有合并键
  `flutter_tauri_native`，缺三个新键 → 模板 `surfaces.android_native.name` 崩
- 影响：自 05410de 起任何人都无法从源码构建官网（线上部署停更的根因之一）
- 修复：latest.json 按模板口径补 `android_native`/`flutter`/`desktop`（role=REFERENCE 大写、
  capability_status=null、NOT_RELEASED），删除合并键，`ios.name` → 「Apple 原生（iOS / macOS）」
  对齐 05410de 语义
- 复验：构建 5.78s 全绿；状态页 12 徽章渲染正确（REFERENCE×3 = 三张拆分卡），无 undefined/空名卡

## 回归抽检结果：PASS（修复后）

| 页面 | 状态 | 备注 |
|---|---|---|
| / 首页（中文） | 200 PASS | h1/hero/四形态/下载矩阵/页脚完整，视觉审查 0 异常 |
| /en/ 首页（英文） | 200 PASS | h1 正常 |
| /status/ 状态页 | 200 PASS | 11 卡 + 徽章色区分清晰，视觉审查 0 异常 |
| /product-contract/ | 200 PASS | 产品规范渲染正常 |

- 控制台零错误零 pageerror
- **现状记录（非缺陷，待用户裁决）**：首页仍含微信/小程序码内容（9/11 全端裁撤小程序 vs 官网
  「微信码主推」重设计的既有冲突，见记忆 smart-ble-miniapp-removal-round / smart-ble-website-dns）
- 产物：`web/` 下 4 张整页 PNG
