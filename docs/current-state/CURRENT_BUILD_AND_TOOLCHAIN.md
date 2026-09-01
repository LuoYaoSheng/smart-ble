# 当前构建与工具链（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 3e2a59830b1441a4655b27f482eb195c420d25d76b4910b89b21d8a925a09166
```

## App

- UniApp 工程：`apps/uniapp/`
- 校验脚本：`scripts/verify-uniapp.sh`（本轮已作为回归输入）
- HBuilderX 默认路径：**UNASSESSED** / 可能 BLOCKED_BY_TOOLCHAIN

## Docs

- VitePress：`docs/` + `npm run docs:build`
- 生产落地页源：`docs/index.md`（本轮禁止修改业务语义之外的生产页内容；盘点只读）

## ESP32

- PlatformIO：`hardware/esp32/LightBLE/platformio.ini`
- envs: esp32dev
- upload_port: COM3
- 本轮禁止：`pio run -t upload`

## E2E / Page

- `@playwright/test`：OPEN
- TARGET_PAGE_DRIVER：OPEN

## Release CI

- `.github/workflows/release-build.yml`：Flutter=true Tauri=true UniApp=false
