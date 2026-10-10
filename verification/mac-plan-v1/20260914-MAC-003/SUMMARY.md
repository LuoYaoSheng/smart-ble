# MAC-003 证据：UniApp 运行目标收口（App / H5）

- Host: macOS / Node 24.12 / HBuilderX CLI（启动检测）

## 结果（2026-09-14）

| 项 | 结果 |
|---|---|
| ARCHITECTURE.md | Vue 2 → Vue 3（Composition API + Pinia）修正；平台表退役 Mini Program 列 → H5 降级列；WeChat 专项节改 RETIRED 历史参考 |
| README.md | 重写为 App/H5 语义：平台范围退役声明、scan-permission 行为表、h5/app 构建命令与 package scripts 一致（build:h5 / dev:h5 / build:app）、wx-peripheral 结构行删除 |
| node:crypto 外置 | package-validator SHA-256：Web Crypto 优先（浏览器恒有），Node 兜底改动态说明符 + @vite-ignore；H5 构建不再出现 module externalized 告警（build DONE 无 warning） |
| mock 面 | mock-bridge 默认平台 weixin→android、表单变体去 weixin；mock-dataset/vite.config/platform.js 注释同步退役口径 |
| `./scripts/verify-uniapp.sh` | PASS（26 unit files + 14 static gates） |
| `npm run build:h5` | DONE Build complete（无 externalized 告警） |
| Playwright 页面层（verify-target pages） | 11 specs · 67 state · 88 operation · 825 assertion · pass 226 · fail 0 · blocked 0 |
| `verify-target --mode=current` | 544/544 · exit 0 |

## Observations

- HBuilderX CLI 已移除 `uniapp.test`（DEF-002，5.x 行为变更）：`scripts/verify-uniapp-pages.sh`
  当前在 h5 目标同样不可用。页面回归的正典通道是 Playwright Page Driver 层
  （已并入 verify-target pages 层，本轮 226 pass / 0 fail）。uniapp-pages 脚本留待
  MAC-011（CI 面）改写为 Playwright 入口或在计划中登记废弃。
