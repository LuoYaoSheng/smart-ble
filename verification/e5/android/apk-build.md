# Android E5 Build Evidence

| Field | Value |
|---|---|
| **TASK** | E5-ENV-UNIFIED-001 |
| **App version** | 1.0.5 (`VERSION` / manifest versionName) |
| **versionCode** | 101 |
| **Git commit** | `f2c2feb` (baseline; re-run may differ) |
| **HBuilderX** | 5.24.2026081301 |

## Build command

```bash
bash scripts/e5/build-android-test.sh
# → HBuilderX cli launch app-android --project apps/uniapp --deviceId <adb> --compile true
```

Toolchain profile: `apps/uniapp/vite.config.js` (E5 Android APP profile — `inlineDynamicImports` + HX `vite-plugin-uni`).

## Result

| Step | Status |
|---|---|
| Vite IIFE / code-splitting | **FIXED** (was B-006) |
| APP JS compile (`项目 uniapp 编译成功`) | **PASS** |
| Compile artifact | `apps/uniapp/unpackage/dist/dev/app-plus/app-service.js` |
| Compile artifact SHA256 | `85de585374f9f65361b1145f1407f2c2b4b7eeffb404a06060f52de47c1d5ae8` |
| `.apk` produced | **NO** |
| Cloud/custom pack | **FAIL** (`verification/e5/android/apk-pack-attempt.txt` — 文件不存在 / cert) |

## Conclusion

- **Compile toolchain**: READY
- **Test APK binary**: BLOCKED → **B-007**
- APK file is **not** committed (gitignore / policy)

## Logs (text only)

- `apk-build-attempt.txt` — compile probe
- `apk-pack-attempt.txt` — pack probe
