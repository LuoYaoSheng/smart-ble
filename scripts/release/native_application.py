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
    return {'architectures': sorted(architectures), 'format': 'Mach-O universal', 'verified_application': str(executable)}
