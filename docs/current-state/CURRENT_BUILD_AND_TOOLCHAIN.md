# 当前构建与工具链（TP-G2-R1）

```yaml
status: REVIEW
gate: TP-G2-R1
content_hash: 6d61cc538b5131d8ae7fe4b9490737b696efa2a178a30eca611cd6d8ab550772
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

- Playwright environment：**READY**
- `@playwright/test` blocker：CLEARED
- TARGET_PAGE_DRIVER：CLEARED
- 说明：环境 READY ≠ 页面 E4 PASS；缺 Driver 时 Current pages = BLOCKED_BY_TARGET_DRIVER

## Release CI

- `.github/workflows/release-build.yml`：Flutter=true Tauri=true UniApp=false
