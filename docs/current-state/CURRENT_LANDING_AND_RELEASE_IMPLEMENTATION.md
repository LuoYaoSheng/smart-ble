# 当前落地页与 Release 实现

```yaml
status: REVIEW
last_reviewed: 2026-09-01
```

## 落地页

- 文件：`docs/index.md`
- Download Hub 三卡（Android / Windows / macOS）均指向 `https://github.com/luoyaosheng/smart-ble/releases/latest`
- 无按产物角色区分的真实 APK/固件 URL、无 SHA 展示、无 NOT_RELEASED 无链接降级
- `docs:build`（VitePress）：本轮 **PASS**

## 版本

| 源 | 值 |
|---|---|
| 根 `VERSION` | **缺失** |
| `apps/uniapp/manifest.json` | versionName 1.0.5 |
| `apps/uniapp/config/product.js` | versionFallback 1.0.5 |
| `pages/about/version.vue` | 硬编码历史，首项 v1.0.5 |
| docs `package.json` | 1.0.0 |

## Release 工作流

- 既有审计：`.github/workflows` 不保证产出 UniApp APK/固件主产物（见 verification 矩阵）
- 本轮未修改 workflow；未发布

## 本轮构建

- `cd docs && npm run docs:build` → EXIT 0
