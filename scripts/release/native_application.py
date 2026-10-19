"""Verify the CPU of an actual native Linux executable or macOS app bundle."""
import plistlib
import struct
import subprocess
from pathlib import Path


def verify_linux_application(path, architecture):
    path = Path(path)
    with path.open('rb') as stream:
        header = stream.read(20)
    if len(header) != 20 or header[:4] != b'\x7fELF' or header[4] != 2 or header[5] not in (1, 2):
        raise RuntimeError(f'Expected a 64-bit native ELF application: {path}')
    endian = '<' if header[5] == 1 else '>'
    machine = struct.unpack_from(endian + 'H', header, 18)[0]
    expected = {'x64': 62, 'arm64': 183}[architecture]
    if machine != expected:
        raise RuntimeError(f'Application ELF is not {architecture}: {path}')
    return {'architecture': architecture, 'format': 'ELF64', 'verified_application': str(path), 'machine': machine}


def verify_macos_application(bundle, version=None):
    bundle = Path(bundle)
    info = plistlib.loads((bundle / 'Contents/Info.plist').read_bytes())
    if version is not None and info.get('CFBundleShortVersionString') != version:
        raise RuntimeError(f'Packaged macOS application version differs from VERSION: {bundle}')
    for purpose in ('NSBluetoothAlwaysUsageDescription', 'NSCameraUsageDescription'):
        if not info.get(purpose):
            raise RuntimeError(f'Packaged macOS application lacks {purpose}: {bundle}')
    executable = bundle / 'Contents/MacOS' / info['CFBundleExecutable']
    architectures = subprocess.check_output(['lipo', '-archs', str(executable)], text=True, encoding='utf-8').split()
    if set(architectures) != {'x86_64', 'arm64'}:
        raise RuntimeError(f'Application must contain both macOS architectures: {executable}')
    # Check the actual runnable payload, not only the apphost. Flutter native
    # assets and Electron addons can otherwise silently remain host-only.
    magic_values = {bytes.fromhex(value) for value in (
        'feedface', 'cefaedfe', 'feedfacf', 'cffaedfe',
        'cafebabe', 'bebafeca', 'cafebabf', 'bfbafeca',
    )}
    seen = set()
    images = []
    macho_paths = set()
    for path in sorted(bundle.rglob('*')):
        if not path.is_file():
            continue
        actual = path.resolve()
        if actual in seen:
            continue
        seen.add(actual)
        with path.open('rb') as stream:
            if stream.read(4) not in magic_values:
                continue
        macho_paths.add(actual)
        slices = subprocess.check_output(['lipo', '-archs', str(path)], text=True, encoding='utf-8').split()
        if set(slices) != {'x86_64', 'arm64'}:
            raise RuntimeError(f'Packaged Mach-O must contain both macOS architectures: {path} ({", ".join(slices)})')
        images.append({'path': str(path.relative_to(bundle)), 'architectures': sorted(slices)})
    if executable.resolve() not in macho_paths:
        raise RuntimeError(f'Application executable was not found in the Mach-O payload: {executable}')
    return {'architectures': sorted(architectures), 'format': 'Mach-O universal',
            'verified_application': str(executable), 'verified_macho_count': len(images), 'macho_images': images}


def verify_ios_application(bundle, version=None, display_name=None):
    """Check resources in the actual application, rather than source-file presence."""
    bundle = Path(bundle)
    info = plistlib.loads((bundle / 'Info.plist').read_bytes())
    if version is not None and info.get('CFBundleShortVersionString') != version:
        raise RuntimeError('Packaged iOS application version differs from VERSION')
    if display_name is not None and any(info.get(key) != display_name for key in ('CFBundleName', 'CFBundleDisplayName')):
        raise RuntimeError('Packaged iOS application display name differs from product identity')
    privacy = bundle / 'PrivacyInfo.xcprivacy'
    if not privacy.is_file():
        raise RuntimeError('Packaged iOS application lacks PrivacyInfo.xcprivacy')
    privacy_data = plistlib.loads(privacy.read_bytes())
    if not isinstance(privacy_data.get('NSPrivacyTracking'), bool):
        raise RuntimeError('Packaged iOS privacy manifest lacks its tracking declaration')
    for key in ('CFBundleIcons', 'CFBundleIcons~ipad'):
        icon = info.get(key, {}).get('CFBundlePrimaryIcon', {})
        if not icon.get('CFBundleIconName') or not icon.get('CFBundleIconFiles'):
            raise RuntimeError(f'Packaged iOS application lacks compiled app icons: {key}')
    if not (bundle / 'Assets.car').is_file():
        raise RuntimeError('Packaged iOS application lacks compiled Assets.car')
    launch = info.get('UILaunchStoryboardName')
    if not launch or not (bundle / (launch + '.storyboardc')).is_dir():
        raise RuntimeError('Packaged iOS application lacks its launch storyboard')
    executable = bundle / info['CFBundleExecutable']
    architectures = subprocess.check_output(['lipo', '-archs', str(executable)], text=True, encoding='utf-8').split()
    if architectures != ['arm64']:
        raise RuntimeError(f'iOS distribution executable must be arm64: {executable}')
    return {'architectures': architectures, 'format': 'Mach-O', 'verified_application': str(executable),
            'display_name': info.get('CFBundleDisplayName'), 'privacy_manifest': 'PASS',
            'compiled_app_icons': 'PASS', 'launch_storyboard': 'PASS'}
