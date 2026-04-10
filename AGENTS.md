# Repository Guidelines

## Project Structure & Module Organization
`apps/` contains platform clients: `android/` (Kotlin + Compose), `flutter/` (Dart + Riverpod), `uniapp/` (Vue/uni-app), `desktop/electron/`, `desktop/tauri/`, `desktop/macos/`, and `ios/`. Shared BLE abstractions live in `core/ble-core/` and protocol definitions in `core/protocols/`. Hardware examples are under `hardware/esp32/LightBLE/`. Product specs, flow docs, and manual test notes live in `docs/`.

Platform tiers:
- Primary: `apps/android`, `apps/flutter`, `apps/ios/Sources`, `apps/desktop/tauri`
- Secondary: `apps/desktop/electron`, `apps/desktop/macos`
- Experimental: `apps/desktop/avalonia`
- Placeholder: `apps/desktop/windows`, `apps/desktop/linux`

For iOS, treat `apps/ios/Sources/` as the only active source tree.

## Build, Test, and Development Commands
Use the root `Makefile` when possible; platform-specific commands remain available when you need to scope work.

- `make verify` runs the main repository checks for Flutter, Android, iOS Swift, and Tauri.

- `cd apps/android && ./gradlew assembleDebug test` builds the Android app and runs JVM tests.
- `cd apps/flutter && flutter pub get && flutter analyze && flutter test` installs deps, runs static analysis, and executes Flutter tests.
- `cd apps/desktop/electron && npm install && npm start` runs the Electron desktop app.
- `cd apps/desktop/tauri && cargo tauri dev` starts the Tauri app; use `cargo tauri build` for release output.
- `cd apps/desktop/macos/SmartBLE-mac && swift build && swift run` builds and launches the native macOS app.
- `cd hardware/esp32/LightBLE && pio run` builds firmware; add `-t upload` to flash hardware.

## Coding Style & Naming Conventions
Match the local style of each module instead of forcing one cross-language format. Existing code uses 4-space indentation in Kotlin, Swift, Rust, and JS files. Keep platform naming idiomatic: `PascalCase` for classes/widgets/views, `camelCase` for methods and variables, and `snake_case.dart` for Flutter file names. Flutter follows `flutter_lints`; run `dart format lib test`. For Rust, use `cargo fmt`. Avoid editing generated or vendored output such as `node_modules/`, `.gradle/`, and `src-tauri/target/`.

## Testing Guidelines
Automated coverage is partial, so run the tests closest to your change and then verify BLE flows manually. Flutter has `apps/flutter/test/widget_test.dart`; add new tests beside the affected feature. Android uses Gradle test tasks. Use [`docs/test-checklist.md`](/Users/luoyaosheng/Desktop/project/Open/smart-ble/docs/test-checklist.md) for scan, connect, read/write, notify, and broadcast regression checks with real devices.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commits, for example `feat(tauri): ...`, `feat: ...`, and `docs: ...`. Keep commits focused by platform or subsystem. PRs should describe the affected app(s), list commands run, note any BLE hardware used for verification, and include screenshots or screen recordings for UI changes. Link related issues when applicable.

## Security & Configuration Tips
BLE features depend on platform permissions and local device state; document any new entitlement, manifest, or plist change in the relevant app README. Do not commit machine-specific settings such as serial ports, local build outputs, or secrets.
