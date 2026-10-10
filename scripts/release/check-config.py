#!/usr/bin/env python3
"""Static release prerequisites; passing does not certify hardware or store acceptance."""
import json
import plistlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors = []
identity = json.loads((ROOT / 'release/product-identity.json').read_text(encoding='utf-8'))['application_id']


def require(condition, message):
    if not condition:
        errors.append(message)

mac_identity = plistlib.loads((ROOT / 'apps/desktop/macos/SmartBLE-mac/Info.plist').read_bytes())
require(mac_identity.get('CFBundleIdentifier') == identity, 'Native Mac App Store bundle ID differs from the unified Apple product')


for relative in ('apps/ios/SmartBLE/Resources/Info.plist', 'apps/flutter/ios/Runner/Info.plist', 'apps/desktop/macos/SmartBLE-mac/Info.plist', 'apps/flutter/macos/Runner/Info.plist', 'apps/desktop/tauri/src-tauri/Info.plist'):
    data = plistlib.loads((ROOT / relative).read_bytes())
    require(bool(data.get('NSBluetoothAlwaysUsageDescription')), f'{relative}: missing Bluetooth usage description')
    require(bool(data.get('NSCameraUsageDescription')), f'{relative}: missing QR camera usage description')

for relative in ('apps/desktop/macos/SmartBLE-mac/Entitlements.plist', 'apps/flutter/macos/Runner/Release.entitlements'):
    data = plistlib.loads((ROOT / relative).read_bytes())
    require(data.get('com.apple.security.app-sandbox') is True, f'{relative}: missing sandbox')
    require(data.get('com.apple.security.device.bluetooth') is True, f'{relative}: missing Bluetooth entitlement')
    require(data.get('com.apple.security.device.camera') is True, f'{relative}: missing camera entitlement')

for relative in ('apps/android/app/build.gradle.kts', 'apps/flutter/android/app/build.gradle.kts'):
    text = (ROOT / relative).read_text(encoding='utf-8')
    require(f'applicationId = "{identity}"' in text, f'{relative}: application ID differs from product identity')
    require(re.search(r'compileSdk\s*=\s*36', text), f'{relative}: compile SDK must be 36')
    require(re.search(r'targetSdk\s*=\s*36', text), f'{relative}: target SDK must be 36')
    require('SMART_BLE_REQUIRE_SIGNING' in text, f'{relative}: missing required-signing guard')
    release = text.split('buildTypes {', 1)[-1]
    require('getByName("debug")' not in release, f'{relative}: release falls back to debug signing')

electron = json.loads((ROOT / 'apps/desktop/electron/package.json').read_text(encoding='utf-8'))
uniapp = json.loads((ROOT / 'apps/uniapp/manifest.json').read_text(encoding='utf-8'))['app-plus']['distribute']
require(uniapp['android']['packagename'] == identity and uniapp['ios']['appid'] == identity, 'UniApp mobile IDs differ from product identity')
for permission in ('permissionPhoneState', 'permissionExternalStorage'):
    require(uniapp['android'].get(permission, {}).get('request') == 'none', f'UniApp startup must not request {permission}')
for relative in ('apps/ios/project.yml', 'apps/ios/SmartBLE.xcodeproj/project.pbxproj', 'apps/flutter/ios/Runner.xcodeproj/project.pbxproj'):
    text = (ROOT / relative).read_text(encoding='utf-8')
    ids = re.findall(r'PRODUCT_BUNDLE_IDENTIFIER\s*[:=]\s*([^;\s]+)', text)
    require(bool(ids) and all(item == identity or item.startswith(identity + '.') for item in ids), f'{relative}: iOS bundle IDs differ from product identity')
require(bool(electron['build']['mac'].get('extendInfo', {}).get('NSBluetoothAlwaysUsageDescription')), 'Electron macOS package lacks Bluetooth purpose string')
require((ROOT / 'apps/ios/SmartBLE/Resources/PrivacyInfo.xcprivacy').is_file(), 'Native iOS privacy manifest missing')
require((ROOT / 'docs/privacy.md').is_file(), 'Privacy policy source missing')
require((ROOT / 'release/platform-matrix.json').is_file(), 'Unified platform release matrix missing')
native_privacy = json.loads((ROOT / 'apps/uniapp/androidPrivacy.json').read_text(encoding='utf-8'))
require(native_privacy.get('prompt') == 'template', 'UniApp requires SDK native privacy template before initialization')
require(native_privacy.get('hrefLoader') == 'default', 'UniApp local privacy page requires the built-in loader')
require(native_privacy.get('disagreeMode', {}).get('support') is True, 'UniApp must allow declining optional permissions')
require(native_privacy.get('disagreeMode', {}).get('loadNativePlugins') is False, 'UniApp visitor mode must not initialize the Bluetooth plugin')
require((ROOT / 'apps/uniapp/static/privacy.html').is_file(), 'UniApp offline privacy page missing')

if errors:
    print('Release configuration FAILED:\n' + '\n'.join(f'  - {item}' for item in errors), file=sys.stderr)
    sys.exit(1)
print('Release configuration PASS (static prerequisites only; signing/hardware/store gates remain separate)')
