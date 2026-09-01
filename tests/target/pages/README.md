# Target Page Driver（TEST-PAGE-DRIVER-001）

Expected 来自 `page-behavior.manifest.json`。  
Actual 来自 `driver/` + Fake Runtime + adapters，**禁止**回填 Expected。

## 结构

- `lib/page-driver.js` — Playwright / harness 入口（`TargetPageDriver`）
- `driver/` — Runtime、State、Operation、Evidence
- `fixtures/` — FakeRuntime、Landing 探测、Operation Actuals catalog
- `adapters/` — uniapp / vitepress / fake-ble / fake-platform
- `specs/` — PAGE-001..010 + WEB-001 Playwright specs

## 运行

```bash
node scripts/check-page-test-environment.mjs
npx playwright test
node scripts/verify-target.mjs --mode=current --format=json
```

Driver 以 `driver/page-driver-runtime.js` 存在为落地标记。  
可选：`TARGET_PAGE_BASE_URL`（live App）；缺省时使用 Fake Runtime。

## 证据

写入 `.tmp/page-e4-results/`（已 gitignore）。
