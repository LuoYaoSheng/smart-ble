# WIN-N4B · 广播 Tab 显隐裁决落地（案 B：恒显四 Tab + 未就绪徽章）

- 裁决：用户 2026-09-21 选定**案 B**（正典 A3 形态；Android/T/V/F/Q/macOS 已一致，本轮补齐 E/G）。
- 基线：`608528f` 之上。

## 改动

| 壳 | 改动 | 说明 |
|---|---|---|
| E-WIN | `public/index.html` 去掉 broadcastTab `style="display:none;"`；`public/app.js` 删 `platform==='linux'` 才显示的条件块 | 案 B 主改动 |
| G-WIN | `frontend/src/index.html` + `frontend/src/app.js` 同步（E 的字节级镜像） | index.html 与 E 的差异仅剩设计内 shim/bridge 注入 |
| T-WIN | 无改动 | 已是案 B（broadcastTab 恒显，无 display:none） |

不支持平台（Windows/macOS）进 P008 显示「未就绪」徽章 + 平台 chip（页面既有逻辑 `updateBroadcastStatus('idle')`，无需改动）；点「开始广播」走既有拒绝式降级路径（noble/bridge 报错 → err 徽章 + toast + 日志）。

## 门禁

- `node --check`：E/G app.js 双侧 0 错
- E/G `app.js` diff 一致；`index.html` diff 仅 G 设计内脚本注入差异
- `node --test tests/desktop/*.test.mjs`：**95/95**（含 E↔T 镜像断言）

## CDP 运行时冒烟（`ewin-n4b-smoke.mjs`，node v23.8.0 + `electron . --remote-debugging-port=9232`）

| 断言 | 结果 |
|---|---|
| A1 broadcastTab 恒显 | `{"ok":true,"display":"flex","visible":true,"label":"广播","platform":"win32"}` |
| A2 四 Tab 完整 | `scan,connected,broadcast,about` |
| A3 进页未就绪徽章 | `{"badgeText":"未就绪","badgeVisible":true,"chipText":"平台：Desktop · Windows"}` |

截图：`ewin-n4b-broadcast.png`。冒烟后 electron 进程已清理。

## 坑位

- `npx electron` 首启 spawn ENOENT（node_modules/electron/dist/electron.exe 实际存在，npx 瞬态问题）→ 直接 `./node_modules/electron/dist/electron.exe .` 绕过。
- node v20.19.3 无全局 WebSocket（v22+）→ 按 WIN-001 口径用 nvm v23.8.0 跑 CDP 脚本。

## 遗留

- N4 裁决已落地，正典口径（广播 Tab 恒显）交 Mac 入正典时引用本目录。
- macOS 侧 Electron 同文件如需对齐归 Mac 计划（本仓库同一 public 树，Mac 拉取即得）。
