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
from android_artifact import inspect_native_libraries, sdk_tool

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
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    build_number = str(json.loads((ROOT / 'apps/uniapp/manifest.json').read_text(encoding='utf-8'))['versionCode'])
    host = platform.system()
    architecture = 'arm64' if platform.machine().lower() in ('arm64', 'aarch64') else 'x64'
    env = os.environ.copy()
    if args.signed and args.target in ('android', 'flutter-android'):
        config = args.signing_config or Path.home() / '.config/smart-ble/signing/credentials.json'
        if config.is_file():
            signing = json.loads(config.read_text(encoding='utf-8'))
            for key in SIGNING_KEYS:
                if signing.get(key) and not env.get(key):
                    env[key] = str(signing[key])
    out = ROOT / '.tmp/release' / f'{args.target}-{host.lower()}-{platform.machine()}' / ('signed' if args.signed else 'candidate')
    out.mkdir(parents=True, exist_ok=True)
    report = {'target': args.target, 'version': version, 'host': host, 'host_architecture': platform.machine(), 'mode': 'signed' if args.signed else 'candidate', 'status': 'NOT_RUN', 'artifacts': [], 'hardware': 'NOT_RUN', 'store_submission': 'NOT_RUN'}
    report['source_commit'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True, encoding='utf-8').strip()
    report['source_dirty'] = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True, encoding='utf-8').strip())
    application_paths = {'android': 'apps/android', 'flutter-android': 'apps/flutter', 'flutter-ios': 'apps/flutter', 'flutter-macos': 'apps/flutter', 'ios': 'apps/ios', 'macos': 'apps/desktop/macos', 'electron': 'apps/desktop/electron', 'tauri': 'apps/desktop/tauri', 'avalonia': 'apps/desktop/avalonia', 'qt': 'apps/desktop/qt', 'wails': 'apps/desktop/wails', 'uniapp': 'apps/uniapp', 'firmware': 'hardware/esp32/LightBLE'}
    report['source_trees'] = {p: subprocess.check_output(['git', 'rev-parse', f'HEAD:{p}'], cwd=ROOT, text=True, encoding='utf-8').strip() for p in (application_paths[args.target], 'core')}

    def block(reason):
        report.update(status='BLOCKED', reason=reason)
        (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
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

    def zip_directory(directory, filename):
        destination = out / filename
        if host == 'Darwin':
            run(['ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', str(directory), str(destination)], env=env)
        else:
            shutil.make_archive(str(destination.with_suffix('')), 'zip', root_dir=directory.parent, base_dir=directory.name)
        return str(destination.relative_to(ROOT))

    try:
        run(['node', 'scripts/generate-release-metadata.mjs', '--check'])
        run(['node', 'scripts/check-version-consistency.mjs'])
        if args.target == 'android':
            if host == 'Darwin' and not env.get('JAVA_HOME'):
                env['JAVA_HOME'] = subprocess.check_output(['/usr/libexec/java_home', '-v', '17'], text=True, encoding='utf-8').strip()
            if host == 'Darwin' and not env.get('ANDROID_HOME'):
                env['ANDROID_HOME'] = str(Path.home() / 'Library/Android/sdk')
            run(['gradlew.bat' if host == 'Windows' else './gradlew', 'assembleRelease', 'bundleRelease', 'testReleaseUnitTest', '--max-workers=2'], ROOT / 'apps/android', env)
            apk_dir = ROOT / 'apps/android/app/build/outputs/apk/release'
            metadata = json.loads((apk_dir / 'output-metadata.json').read_text(encoding='utf-8'))
            patterns = [str((apk_dir / item['outputFile']).relative_to(ROOT)) for item in metadata['elements']]
            patterns.append('apps/android/app/build/outputs/bundle/release/app-release.aab')
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
                patterns = [zip_directory(archive, f'Smart-BLE-Open-{version}-ios-archive.zip')]
        elif args.target == 'flutter-ios':
            run(['flutter', 'build', 'ipa', '--release', '--no-codesign'], ROOT / 'apps/flutter', env)
            patterns = [zip_directory(ROOT / 'apps/flutter/build/ios/archive/Runner.xcarchive', f'Smart-BLE-Open-{version}-flutter-ios-archive.zip')]
        elif args.target == 'macos':
            run(['bash', 'scripts/macos/make-app-bundle.sh'])
            patterns = [zip_directory(ROOT / f'apps/desktop/macos/dist/{name}.app', f'{name}-{version}-universal.zip') for name in ('SmartBLE-macOS', 'SmartBLE-macOS-MAS')]
        elif args.target == 'flutter-macos':
            run(['flutter', 'build', 'macos', '--release', '--config-only'], ROOT / 'apps/flutter', env)
            build_dir = ROOT / 'apps/flutter/build/macos'
            run(['xcodebuild', '-workspace', 'Runner.xcworkspace', '-scheme', 'Runner', '-configuration', 'Release', '-destination', 'generic/platform=macOS', '-derivedDataPath', str(build_dir), f'OBJROOT={build_dir}/Build/Intermediates.noindex', f'SYMROOT={build_dir}/Build/Products', 'CODE_SIGNING_ALLOWED=NO', 'CODE_SIGNING_REQUIRED=NO', 'COMPILER_INDEX_STORE_ENABLE=NO', 'build'], ROOT / 'apps/flutter/macos', env)
            applications = list((ROOT / 'apps/flutter/build/macos/Build/Products/Release').glob('*.app'))
            if len(applications) != 1:
                raise RuntimeError('Flutter macOS build must contain exactly one application bundle')
            patterns = [zip_directory(applications[0], f'Smart-BLE-Open-{version}-flutter-macos-universal.zip')]
        elif args.target == 'electron':
            run(['npm', 'ci', '--foreground-scripts'], ROOT / 'apps/desktop/electron', env)
            command = ['npm', 'run', {'Darwin': 'build:mac', 'Windows': 'build:win', 'Linux': 'build:linux'}[host], '--', '--publish', 'never']
            if host == 'Darwin': command.append('--universal')
            run(command, ROOT / 'apps/desktop/electron', env)
            extensions = {'Darwin': ('dmg', 'zip'), 'Windows': ('exe',), 'Linux': ('AppImage', 'deb', 'rpm')}[host]
            os_tag = {'Darwin': 'mac', 'Windows': 'win', 'Linux': 'linux'}[host]
            cpu_tag = 'universal' if host == 'Darwin' else architecture
            prefix = f'apps/desktop/electron/dist/Smart-BLE-Open-{version}-{os_tag}-{cpu_tag}'
            if host == 'Windows':
                patterns = [f'{prefix}-{kind}.exe' for kind in ('setup', 'portable')]
            else:
                # Builder translates x64 to amd64 for deb and x86_64 for rpm/AppImage.
                # Ask the pinned builder rather than guessing a format's CPU suffix.
                script = 'const u=require("builder-util"); console.log(JSON.stringify(JSON.parse(process.argv[2]).map(e=>u.getArtifactArchName(u.Arch[process.argv[1]],e))))'
                arch_names = json.loads(subprocess.check_output(['node', '-e', script, cpu_tag, json.dumps(extensions)], cwd=ROOT / 'apps/desktop/electron', text=True, encoding='utf-8', env=env))
                patterns = [f'apps/desktop/electron/dist/Smart-BLE-Open-{version}-{os_tag}-{cpu}.{extension}' for cpu, extension in zip(arch_names, extensions)]
        elif args.target == 'tauri':
            run(['cargo', 'test', '--locked', '--lib'], ROOT / 'apps/desktop/tauri/src-tauri', env)
            cmd = ['cargo', 'tauri', 'build']
            bundle_dir = 'apps/desktop/tauri/src-tauri/target/release/bundle'
            if host == 'Darwin':
                run(['rustup', 'target', 'add', 'aarch64-apple-darwin', 'x86_64-apple-darwin'], ROOT / 'apps/desktop/tauri/src-tauri', env)
                cmd += ['--target', 'universal-apple-darwin']
                bundle_dir = 'apps/desktop/tauri/src-tauri/target/universal-apple-darwin/release/bundle'
            run(cmd, ROOT / 'apps/desktop/tauri/src-tauri', env)
            bundle_extensions = {'Darwin': ('dmg',), 'Windows': ('msi', 'exe'), 'Linux': ('deb', 'AppImage', 'rpm')}[host]
            patterns = [f'{bundle_dir}/**/*.{extension}' for extension in bundle_extensions]
        elif args.target == 'avalonia':
            run(['dotnet', 'test', '-c', 'Release'], ROOT / 'apps/desktop/avalonia/SmartBLE.Desktop.Tests', env)
            run(['dotnet', 'publish', '-c', 'Release', '-r', f'win-{architecture}', '--self-contained', 'true', '-o', str(out / 'app')], ROOT / 'apps/desktop/avalonia/SmartBLE.Desktop', env)
            patterns = [zip_directory(out / 'app', f'Smart-BLE-Open-{version}-avalonia-windows-{architecture}.zip')]
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
            package = [sys.executable, '-m', 'PyInstaller', '--noconfirm', '--windowed', '--name', 'SmartBLE', '--distpath', str(out / 'app'), '--workpath', str(out / 'work'), '--specpath', str(out)]
            for name, destination in [('VERSION', '.'), ('assets', 'assets'), ('win-broadcast-bridge.ps1', '.'), ('smart-hid-v1-vectors.json', '.'), ('release-manifest.json', '.')]:
                package += ['--add-data', f'{staging / name}{os.pathsep}{destination}']
            run(package + [str(staging / 'main.py')], staging, env)
            patterns = [zip_directory(out / 'app/SmartBLE', f'Smart-BLE-Open-{version}-qt-windows-{architecture}.zip')]
        elif args.target == 'wails':
            run(['npm', 'run', 'build'], ROOT / 'apps/desktop/wails/frontend', env)
            run(['go', 'test', './...', '-run', '^(TestUnknownDeviceNeverFallsBackToAnotherConnection|TestCharacteristicKeysIncludeOwningService|TestDisconnectCancelsPendingConnectionGeneration)$'], ROOT / 'apps/desktop/wails', env)
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
            matches = 0
            for path in ROOT.glob(pattern):
                if path.is_file():
                    matches += 1
                    report['artifacts'].append({'path': str(path.relative_to(ROOT)), 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
            if not matches:
                raise RuntimeError(f'Expected artifact is missing: {pattern}')
        if not report['artifacts']:
            raise RuntimeError('Build returned success without the expected artifact')
        if args.target in ('android', 'flutter-android'):
            sdk = Path(env.get('ANDROID_HOME') or env.get('ANDROID_SDK_ROOT') or Path.home() / 'Library/Android/sdk')
            identity = json.loads((ROOT / 'release/product-identity.json').read_text(encoding='utf-8'))['application_id']
            for item in report['artifacts']:
                path = ROOT / item['path']
                item.update(inspect_native_libraries(path))
                if path.suffix == '.apk':
                    badging = subprocess.check_output([str(sdk_tool(sdk, 'aapt2')), 'dump', 'badging', str(path)], text=True, encoding='utf-8', env=env)
                    if f"name='{identity}'" not in badging.splitlines()[0] or f"versionName='{version}'" not in badging.splitlines()[0] or f"versionCode='{build_number}'" not in badging.splitlines()[0] or "targetSdkVersion:'36'" not in badging:
                        raise RuntimeError('Actual APK identity/version/target SDK differs from release configuration')
                    subprocess.run([str(sdk_tool(sdk, 'zipalign')), '-c', '-P', '16', '4', str(path)], check=True, env=env)
                    item.update(application_id=identity, build_number=build_number, target_sdk=36, zip_16kb='PASS')
        if args.signed and args.target in ('android', 'flutter-android'):
            for item in report['artifacts']:
                path = ROOT / item['path']
                if path.suffix == '.apk':
                    sdk = Path(env.get('ANDROID_HOME') or env.get('ANDROID_SDK_ROOT') or Path.home() / 'Library/Android/sdk')
                    verified = subprocess.run([str(sdk_tool(sdk, 'apksigner')), 'verify', '--verbose', '--print-certs', str(path)], capture_output=True, text=True, encoding='utf-8', env=env)
                    if verified.returncode or 'CN=Android Debug' in verified.stdout:
                        raise RuntimeError('APK must have a valid non-debug distribution signature')
                    expected = json.loads((ROOT / 'release/android-signing-public.json').read_text(encoding='utf-8'))['certificate_sha256'].lower()
                    if f'certificate SHA-256 digest: {expected}' not in verified.stdout:
                        raise RuntimeError('APK signer differs from the registered product release certificate')
                    item['signature_verified'] = True
                if path.suffix == '.aab':
                    with zipfile.ZipFile(path) as bundle:
                        if not any(name.startswith('META-INF/') and name.endswith(('.RSA', '.EC', '.DSA')) for name in bundle.namelist()):
                            raise RuntimeError('Unsigned AAB cannot be submitted as a signed build')
                    verifier = subprocess.run(['jarsigner', '-J-Duser.language=en', '-verify', str(path)], capture_output=True, text=True, encoding='utf-8', env=env)
                    if verifier.returncode or 'jar verified' not in verifier.stdout:
                        raise RuntimeError('AAB signature verification failed')
                    cert = subprocess.run(['keytool', '-J-Duser.language=en', '-printcert', '-jarfile', str(path)], capture_output=True, text=True, encoding='utf-8', env=env)
                    expected = json.loads((ROOT / 'release/android-signing-public.json').read_text(encoding='utf-8'))['certificate_sha256'].upper()
                    if cert.returncode or expected not in cert.stdout.replace(':', '').replace(' ', ''):
                        raise RuntimeError('AAB signer differs from the registered product release certificate')
                    item['signature_verified'] = True
        report['status'] = 'SIGNED_BUILD' if args.signed else 'CANDIDATE_BUILT'
        return 0
    except (subprocess.CalledProcessError, OSError, RuntimeError) as error:
        if isinstance(error, RuntimeError):
            print(f'Artifact validation failed: {error}', file=sys.stderr)
        report.update(status='FAILED', reason=f'{type(error).__name__}: build or artifact validation failed; inspect the build log')
        return 1
    finally:
        (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    sys.exit(main())
