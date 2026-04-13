# Contributing to Smart BLE 🛠️

First off, thank you for considering contributing to Smart BLE! 
This project is an advanced, cross-platform Bluetooth Low Energy (BLE) debugging toolkit that maintains **100% architectural parity** across Flutter, UniApp, Electron, Tauri, and native iOS development.

To maintain this unprecedented level of consistency, we have a strict **SSOT (Single Source of Truth)** architecture. Please read the following guidelines before submitting a Pull Request.

---

## 1. The Golden Rule: Single Source of Truth (SSOT)

**DO NOT** manually edit colors, localization strings, icons, or shared web components in the individual platform directories (e.g., `apps/flutter/lib/l10n/`, `apps/desktop/tauri/src/locales/`).

### How to update UI / Assets / Localization:
1. Navigate to the `core/assets-generator/meta/` directory.
2. Edit the root SSOT files:
   - `colors.json` (For theme and styling changes)
   - `i18n_zh-CN.json` / `i18n_en-US.json` (For localization strings)
   - `images/master_icon.png` (For application logo changes)
   - `images/placeholders/*.svg` (For UI empty states)
3. Run the generator script to blast your changes across all 5 platforms automatically:
   ```bash
   python core/assets-generator/generate_assets.py
   ```

## 2. Core Logic Enhancements

If you are proposing an algorithm fix (e.g., Hex parsing, UUID normalization, OTA buffering):
- **For Desktop/Vue ecosystems**: Make your changes in `core/ble-core/desktop-shared/BleUtils.js`, then run the asset generator to duplicate it to Tauri and Electron.
- **For Flutter ecosystem**: Update `apps/flutter/lib/core/utils/data_converter.dart`.
*(In the future, these will be united into a single Rust WebAssembly module).*

### Testing Requirements
If you touch `BleUtils.js` or `data_converter.dart`, you MUST run their respective unit tests before submitting a PR:
- **JS Core**: `cd core && npx jest`
- **Dart Core**: `cd apps/flutter && flutter test`

## 3. Pull Request Process
1. Ensure your code conforms to the local linters (`flutter analyze` for Dart, `eslint` for JS).
2. Fill out the Pull Request Template checklist completely.
3. If your PR affects hardware communication, please test it against the `hardware/stm32/BlePeripheralMock` reference board.
