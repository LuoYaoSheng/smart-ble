#!/usr/bin/env python3
"""Build candidates or signed distributions; never upload or publish."""
import argparse
import hashlib
import json
import os
import platform
import plistlib
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SIGNING_KEYS = ('SMART_BLE_KEYSTORE', 'SMART_BLE_STORE_PASSWORD', 'SMART_BLE_KEY_ALIAS', 'SMART_BLE_KEY_PASSWORD')
TARGETS = ('android', 'flutter-android', 'ios', 'flutter-ios', 'macos', 'flutter-macos', 'electron', 'tauri', 'avalonia', 'qt', 'wails', 'uniapp', 'firmware')


def run(args, cwd=ROOT, env=None):
    # Print executable names only: command arguments and environments may contain signing identifiers.
    print(f'Running {args[0]} in {cwd.relative_to(ROOT)}', flush=True)
    local_executable = cwd / args[0]
    executable = str(local_executable) if local_executable.is_file() else shutil.which(args[0])
    if not executable:
        raise OSError('Required build executable is not installed')
    subprocess.run([executable, *args[1:]], cwd=cwd, env=env or os.environ.copy(), check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('target', choices=TARGETS)
    parser.add_argument('--signed', action='store_true', help='Require real distribution signing; never use a debug key')
    parser.add_argument('--signing-config', type=Path, help='Local credentials JSON outside Git; values are never printed')
    args = parser.parse_args()
    version = (ROOT / 'VERSION').read_text().strip()
    host = platform.system()
    env = os.environ.copy()
    if args.signed and args.target in ('android', 'flutter-android'):
        config = args.signing_config or Path.home() / '.config/smart-ble/signing/credentials.json'
        if config.is_file():
            signing = json.loads(config.read_text())
            for key in SIGNING_KEYS:
                if signing.get(key) and not env.get(key):
                    env[key] = str(signing[key])
    out = ROOT / '.tmp/release' / f'{args.target}-{host.lower()}-{platform.machine()}'
    out.mkdir(parents=True, exist_ok=True)
    report = {'target': args.target, 'version': version, 'host': host, 'host_architecture': platform.machine(), 'mode': 'signed' if args.signed else 'candidate', 'status': 'NOT_RUN', 'artifacts': [], 'hardware': 'NOT_RUN', 'store_submission': 'NOT_RUN'}
    report['source_commit'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    report['source_dirty'] = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip())

    def block(reason):
        report.update(status='BLOCKED', reason=reason)
        (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        print(reason, file=sys.stderr)
        return 2

    if args.target in ('ios', 'flutter-ios', 'macos', 'flutter-macos') and host != 'Darwin':
        return block('Apple builds require a macOS/Xcode host')
    if args.target in ('avalonia', 'qt', 'wails') and host != 'Windows':
        return block('This implementation currently requires a Windows runner; other OS targets remain unverified')
    if args.signed and args.target in ('android', 'flutter-android'):
        if not all(env.get(key) for key in SIGNING_KEYS):
            return block('Android distribution signing requires the four SMART_BLE signing environment variables')
        if not Path(env['SMART_BLE_KEYSTORE']).is_file():
            return block('The configured Android keystore is not a file')
        env['SMART_BLE_REQUIRE_SIGNING'] = '1'
    if args.signed and args.target not in ('android', 'flutter-android', 'ios'):
        return block('Real distribution signing is not yet verified for this target; do not label a candidate as signed')
    if args.signed and args.target == 'ios' and not env.get('SMART_BLE_APPLE_TEAM'):
        return block('Signed iOS export requires SMART_BLE_APPLE_TEAM and an installed distribution profile')

    patterns = []
    try:
        run(['node', 'scripts/generate-release-metadata.mjs', '--check'])
        run(['node', 'scripts/check-version-consistency.mjs'])
        if args.target == 'android':
            if host == 'Darwin' and not env.get('JAVA_HOME'):
                env['JAVA_HOME'] = subprocess.check_output(['/usr/libexec/java_home', '-v', '17'], text=True).strip()
            if host == 'Darwin' and not env.get('ANDROID_HOME'):
                env['ANDROID_HOME'] = str(Path.home() / 'Library/Android/sdk')
            run(['gradlew.bat' if host == 'Windows' else './gradlew', 'assembleRelease', 'bundleRelease', 'testReleaseUnitTest', '--max-workers=2'], ROOT / 'apps/android', env)
            patterns = ['apps/android/app/build/outputs/apk/release/*.apk', 'apps/android/app/build/outputs/bundle/release/*.aab']
        elif args.target == 'flutter-android':
            run(['flutter', 'build', 'apk', '--release'], ROOT / 'apps/flutter', env)
            run(['flutter', 'build', 'appbundle', '--release'], ROOT / 'apps/flutter', env)
            patterns = ['apps/flutter/build/app/outputs/flutter-apk/app-release.apk', 'apps/flutter/build/app/outputs/bundle/release/*.aab']
        elif args.target == 'ios':
            archive = out / 'SmartBLE.xcarchive'
            cmd = ['xcodebuild', '-project', 'SmartBLE.xcodeproj', '-scheme', 'SmartBLEiOS', '-configuration', 'Release', '-destination', 'generic/platform=iOS', '-archivePath', str(archive)]
            cmd += [f'DEVELOPMENT_TEAM={env["SMART_BLE_APPLE_TEAM"]}'] if args.signed else ['CODE_SIGNING_ALLOWED=NO']
            run(cmd + ['archive'], ROOT / 'apps/ios', env)
            if args.signed:
                options = {'method': 'app-store-connect', 'destination': 'export', 'signingStyle': 'automatic', 'teamID': env['SMART_BLE_APPLE_TEAM'], 'uploadSymbols': True}
                options_path = out / 'ExportOptions.plist'
                options_path.write_bytes(plistlib.dumps(options))
                run(['xcodebuild', '-exportArchive', '-archivePath', str(archive), '-exportOptionsPlist', str(options_path), '-exportPath', str(out / 'export')], env=env)
                patterns = [str(out.relative_to(ROOT) / 'export/*.ipa')]
            else:
                patterns = [str(out.relative_to(ROOT) / 'SmartBLE.xcarchive/Products/Applications/SmartBLE.app/SmartBLE')]
        elif args.target == 'flutter-ios':
            run(['flutter', 'build', 'ipa', '--release', '--no-codesign'], ROOT / 'apps/flutter', env)
            patterns = ['apps/flutter/build/ios/archive/Runner.xcarchive/Products/Applications/Runner.app/Runner']
        elif args.target == 'macos':
            run(['bash', 'scripts/macos/make-app-bundle.sh'])
            patterns = ['apps/desktop/macos/dist/*.app/Contents/MacOS/SmartBLE-mac']
        elif args.target == 'flutter-macos':
            run(['flutter', 'build', 'macos', '--release'], ROOT / 'apps/flutter', env)
            patterns = ['apps/flutter/build/macos/Build/Products/Release/*.app/Contents/MacOS/*']
        elif args.target == 'electron':
            run(['npm', 'ci'], ROOT / 'apps/desktop/electron', env)
            command = ['npm', 'run', {'Darwin': 'build:mac', 'Windows': 'build:win', 'Linux': 'build:linux'}[host], '--', '--publish', 'never']
            if host == 'Darwin': command.append('--universal')
            run(command, ROOT / 'apps/desktop/electron', env)
            patterns = ['apps/desktop/electron/dist/*.dmg', 'apps/desktop/electron/dist/*.zip', 'apps/desktop/electron/dist/*.exe', 'apps/desktop/electron/dist/*.AppImage', 'apps/desktop/electron/dist/*.deb', 'apps/desktop/electron/dist/*.rpm']
        elif args.target == 'tauri':
            run(['cargo', 'test', '--locked', '--lib'], ROOT / 'apps/desktop/tauri/src-tauri', env)
            run(['cargo', 'tauri', 'build'], ROOT / 'apps/desktop/tauri/src-tauri', env)
            patterns = ['apps/desktop/tauri/src-tauri/target/release/bundle/**/*.dmg', 'apps/desktop/tauri/src-tauri/target/release/bundle/**/*.msi', 'apps/desktop/tauri/src-tauri/target/release/bundle/**/*.exe', 'apps/desktop/tauri/src-tauri/target/release/bundle/**/*.deb', 'apps/desktop/tauri/src-tauri/target/release/bundle/**/*.AppImage']
        elif args.target == 'avalonia':
            run(['dotnet', 'test', '-c', 'Release'], ROOT / 'apps/desktop/avalonia/SmartBLE.Desktop.Tests', env)
            run(['dotnet', 'publish', '-c', 'Release', '-r', 'win-x64', '--self-contained', 'true', '-o', str(out / 'app')], ROOT / 'apps/desktop/avalonia/SmartBLE.Desktop', env)
            patterns = [str(out.relative_to(ROOT) / 'app/SmartBLE.Desktop.exe')]
        elif args.target == 'qt':
            run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt', 'pyinstaller'], ROOT / 'apps/desktop/qt', env)
            test_env = {**env, 'QT_QPA_PLATFORM': 'offscreen'}
            run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'], ROOT / 'apps/desktop/qt', test_env)
            staging = out / 'source'
            staging.mkdir(exist_ok=True)
            for file in (ROOT / 'apps/desktop/qt').glob('*.py'):
                shutil.copy2(file, staging / file.name)
            shutil.copy2(ROOT / 'apps/desktop/qt/win-broadcast-bridge.ps1', staging / 'win-broadcast-bridge.ps1')
            shutil.copytree(ROOT / 'apps/desktop/qt/assets', staging / 'assets', dirs_exist_ok=True)
            shutil.copy2(ROOT / 'VERSION', staging / 'VERSION')
            shutil.copy2(ROOT / 'core/protocols/smart-hid-v1-vectors.json', staging / 'smart-hid-v1-vectors.json')
            shutil.copy2(ROOT / 'release/release-manifest.json', staging / 'release-manifest.json')
            run([sys.executable, '-m', 'PyInstaller', '--noconfirm', '--windowed', '--name', 'SmartBLE', '--distpath', str(out / 'app'), '--workpath', str(out / 'work'), '--specpath', str(out), '--add-data', 'VERSION;.', '--add-data', 'assets;assets', '--add-data', 'win-broadcast-bridge.ps1;.', '--add-data', 'smart-hid-v1-vectors.json;.', '--add-data', 'release-manifest.json;.', 'main.py'], staging, env)
            patterns = [str(out.relative_to(ROOT) / 'app/SmartBLE/SmartBLE.exe')]
        elif args.target == 'wails':
            run(['npm', 'run', 'build'], ROOT / 'apps/desktop/wails/frontend', env)
            run(['go', 'test', './...'], ROOT / 'apps/desktop/wails', env)
            run(['wails', 'build', '-clean'], ROOT / 'apps/desktop/wails', env)
            patterns = ['apps/desktop/wails/build/bin/*.exe']
        elif args.target == 'uniapp':
            run(['npm', 'run', 'build:h5'], ROOT / 'apps/uniapp', env)
            run(['npm', 'run', 'build:app'], ROOT / 'apps/uniapp', env)
            return block('UniApp resources built; native packaging/custom-base/signing still require HBuilderX and device verification')
        elif args.target == 'firmware':
            run(['pio', 'run'], ROOT / 'hardware/esp32/LightBLE', env)
            run(['pio', 'run', '-e', 'fixture_peripheral_s3', '-e', 'fixture_observer_s3', '-e', 'fixture_shid_sim_s3'], ROOT / 'hardware/esp32/LightBLE', env)
            patterns = ['hardware/esp32/LightBLE/.pio/build/*/firmware.bin']
        for pattern in patterns:
            for path in ROOT.glob(pattern):
                if path.is_file():
                    report['artifacts'].append({'path': str(path.relative_to(ROOT)), 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        if not report['artifacts']:
            raise RuntimeError('Build returned success without the expected artifact')
        if args.signed and args.target in ('android', 'flutter-android'):
            for item in report['artifacts']:
                path = ROOT / item['path']
                if path.suffix == '.apk':
                    sdk = Path(env.get('ANDROID_HOME') or env.get('ANDROID_SDK_ROOT') or Path.home() / 'Library/Android/sdk')
                    verifiers = sorted(sdk.glob('build-tools/*/apksigner*'), reverse=True)
                    if not verifiers:
                        raise RuntimeError('APK signature verifier is missing')
                    verified = subprocess.run([str(verifiers[0]), 'verify', '--verbose', '--print-certs', str(path)], capture_output=True, text=True, env=env)
                    if verified.returncode or 'CN=Android Debug' in verified.stdout:
                        raise RuntimeError('APK must have a valid non-debug distribution signature')
                    item['signature_verified'] = True
                if path.suffix == '.aab':
                    with zipfile.ZipFile(path) as bundle:
                        if not any(name.startswith('META-INF/') and name.endswith(('.RSA', '.EC', '.DSA')) for name in bundle.namelist()):
                            raise RuntimeError('Unsigned AAB cannot be submitted as a signed build')
                    verifier = subprocess.run(['jarsigner', '-J-Duser.language=en', '-verify', str(path)], capture_output=True, text=True, env=env)
                    if verifier.returncode or 'jar verified' not in verifier.stdout:
                        raise RuntimeError('AAB signature verification failed')
                    item['signature_verified'] = True
        report['status'] = 'SIGNED_BUILD' if args.signed else 'CANDIDATE_BUILT'
        return 0
    except (subprocess.CalledProcessError, OSError, RuntimeError) as error:
        report.update(status='FAILED', reason=f'{type(error).__name__}: build or artifact validation failed; inspect the build log')
        return 1
    finally:
        (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    sys.exit(main())
