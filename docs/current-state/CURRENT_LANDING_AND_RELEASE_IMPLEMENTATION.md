# 当前落地页与 Release 实现盘点（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: be493664f40cc23efd4418ab4df5f8cdba44cb398786586fd9d5ed5373c07074
```

## 落地页

- path: `docs/index.md`
- landing_fake_download: **true**
- 观察：下载枢纽出现 `releases/latest`
- 公开 Claim 总量：31（CLAIM-001..031）
- 任务拆分（不可混成循环依赖）：
  1. **PUBLIC-HONESTY-001** — 立即诚实降级
  2. **VERSION-METADATA-001** — VERSION / Metadata / Public Status
  3. **RELEASE-PIPELINE-001** — UniApp + 双固件流水线

## Release Workflow

- path: `.github/workflows/release-build.yml`
- builds Flutter: true
- builds Tauri: true
- builds UniApp: false
- 目标主产物：UniApp Android + 微信记录 + Peripheral/Observer 固件（当前未满足）

## VERSION / Metadata

- 根 `VERSION`：缺失
- `apps/uniapp/services/version-metadata.js`：缺失
- `apps/uniapp/services/public-status.js`：缺失
- PAGE-010：硬编码 versionHistory（见页面盘点）

## SEO / OG / Nav

- VitePress 配置与 docs 站点：**UNASSESSED** 细项（本轮以 Claim/Release 测试与静态下载区证据为主）
