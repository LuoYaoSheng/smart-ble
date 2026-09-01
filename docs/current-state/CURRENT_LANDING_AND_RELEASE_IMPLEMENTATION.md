# 当前落地页与 Release 实现盘点（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 3e2a59830b1441a4655b27f482eb195c420d25d76b4910b89b21d8a925a09166
```

## 落地页

- path: `docs/index.md`
- landing_fake_download: **false**
- 观察：公开下载区已诚实降级为 PREVIEW / NOT_RELEASED（无 releases/latest 假下载）
- version_ssot_ready: **true**
- 公开 Claim 总量：31（CLAIM-001..031）
- 任务拆分（不可混成循环依赖）：
  1. **PUBLIC-HONESTY-001** — 立即诚实降级（DONE）
  2. **VERSION-METADATA-001** — VERSION / Metadata / Public Status（DONE）
  3. **RELEASE-PIPELINE-001** — UniApp + 双固件流水线（仍 PLANNED）

## Release Workflow

- path: `.github/workflows/release-build.yml`
- builds Flutter: true
- builds Tauri: true
- builds UniApp: false
- 目标主产物：UniApp Android + 微信记录 + Peripheral/Observer 固件（当前未满足）

## VERSION / Metadata

- 根 `VERSION`：存在（产品版本投影）
- `apps/uniapp/services/version-metadata.js`：存在
- `apps/uniapp/services/public-status.js`：存在
- `release/release-manifest.json` / `docs/public/release/latest.json`：PREVIEW Metadata 已生成
- PAGE-010：已通过 getVersionPageModel 消费 Metadata（RC-PAGE-VERSION CLOSED）

## SEO / OG / Nav

- VitePress 配置与 docs 站点：**UNASSESSED** 细项（本轮以 Claim/Release 测试与静态下载区证据为主）
