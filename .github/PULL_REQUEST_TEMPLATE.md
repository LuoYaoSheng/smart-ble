## Description
<!-- Please include a summary of the changes and the related issue. -->
<!-- Please also include relevant motivation and context. -->

Fixes # (issue)

## SSOT (Single Source of Truth) Checklist
<!-- If you are changing UI, text, colors, or images, please read `CONTRIBUTING.md`. -->
- [ ] I have modified the source files in `core/assets-generator/meta/` instead of hardcoding platform-specific UI changes.
- [ ] I have run `python core/assets-generator/generate_assets.py` to sync changes across all platforms.
- [ ] My logic changes are implemented in `BleUtils.js` or `data_converter.dart` instead of platform-specific scopes, where applicable.

## Type of change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)

## Platform Testing
- [ ] Tauri (Windows/macOS)
- [ ] Electron
- [ ] Flutter (iOS/Android)
- [ ] UniApp (WeChat MP)
