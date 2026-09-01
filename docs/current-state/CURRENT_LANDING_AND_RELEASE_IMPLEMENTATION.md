# 当前落地页与 Release 实现盘点（TP-G3 · PUBLIC-HONESTY-001）

```yaml
status: REVIEW
gate: TP-G3
task: PUBLIC-HONESTY-001
content_hash: 54902a01ef816b379460f622959b6e65c8de4a2af90740f8dafa21c14c694a5d
```

## 落地页（生产）

| 项 | 当前事实 |
|---|---|
| path | `docs/index.md` |
| SEO | `docs/.vitepress/config.mjs` |
| 公开状态 | **PREVIEW** |
| `releases/latest` 假具体下载 | **0**（已移除） |
| `6+` / Mobile Mainline / 下载全部平台 | **0** |
| 产物卡 | Android / 微信 / Peripheral / Observer 均为 **NOT_RELEASED** 不可点击 |
| OTA | **BLOCKED** |
| Observer | **NOT_RELEASED** |
| Smart HID | **PREVIEW**（配网与诊断；非实时控制） |
| 版本元数据文案 | 「版本元数据尚未发布」（未创建 VERSION 文件） |
| 真实链接 | GitHub、Issue、Target Product/Tests、Gap Summary、Remediation、快速开始、贡献、License |
| Security | 无 SECURITY.md → 文案说明待补充，无假链接 |

## Release Workflow（未改）

- path: `.github/workflows/release-build.yml`
- 仍构建 Flutter / Tauri；非 UniApp + 双固件主线
- 本轮 **NOT MODIFIED**

## VERSION / Metadata（未改）

- 根 `VERSION`：仍缺失 → **VERSION-METADATA-001**
- `version-metadata.js` / `public-status.js`：仍缺失

## 测试证据

- TEST-R-003 public claims：PASS
- TEST-R-001 无产物 + NOT_RELEASED：PASS
- TEST-R-002 VERSION：仍 FAIL（属下一 Task）
