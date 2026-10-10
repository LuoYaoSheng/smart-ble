"""Fail if the Qt ARM lane uses an emulated Python or non-native loaded extensions."""
import importlib
import json
import sys
import sysconfig
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'scripts/release'))
from verify_windows_architecture import machine, verify


def interpreter_is_arm64(executable, platform_tag):
    if platform_tag != 'win-arm64' or machine(executable) != 0xAA64:
        raise RuntimeError('The ARM64 lane requires native ARM64 Python; host CPU alone is not evidence')


def main():
    interpreter_is_arm64(sys.executable, sysconfig.get_platform())
    if '--interpreter-only' in sys.argv:
        print(json.dumps({'python': sys.executable, 'platform': sysconfig.get_platform(), 'machine': '0xAA64'}))
        return
    for name in ('PySide6.QtCore', 'PySide6.QtGui', 'PySide6.QtWidgets', 'shiboken6',
                 'winrt.windows.devices.bluetooth', 'winrt.windows.devices.bluetooth.advertisement',
                 'winrt.windows.devices.bluetooth.genericattributeprofile', 'winrt.windows.devices.enumeration',
                 'winrt.windows.devices.radios', 'winrt.windows.foundation.collections', 'winrt.windows.storage.streams'):
        importlib.import_module(name)
    files = {Path(sys.executable)}
    for module in list(sys.modules.values()):
        file = getattr(module, '__file__', None)
        if file and Path(file).suffix.lower() == '.pyd': files.add(Path(file))
    qt = Path(importlib.import_module('PySide6').__file__).parent
    for name in ('Qt6Core.dll', 'Qt6Gui.dll', 'Qt6Widgets.dll'):
        files.add(qt / name)
    result = verify(sorted(files), 'arm64')
    result.update(python_platform=sysconfig.get_platform(), check='native interpreter plus imported Qt/WinRT extensions')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
