import struct
import tempfile
import unittest
from pathlib import Path
from verify_windows_architecture import images, verify


def pe(path, cpu):
    header = bytearray(134)
    header[:2] = b'MZ'
    struct.pack_into('<I', header, 60, 128)
    header[128:132] = b'PE\0\0'
    struct.pack_into('<H', header, 132, cpu)
    path.write_bytes(header)


class ArchitectureTests(unittest.TestCase):
    def test_x64_emulation_cannot_claim_native_arm64(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'flutter_windows.dll'
            pe(path, 0x8664)
            with self.assertRaisesRegex(RuntimeError, 'not arm64'):
                verify([path], 'arm64')

    def test_app_and_plugins_use_the_same_native_architecture(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = [Path(directory) / name for name in ('app.exe', 'flutter_windows.dll', 'ble_plugin.dll')]
            for path in paths: pe(path, 0xAA64)
            self.assertEqual(len(verify(paths, 'arm64')['verified_images']), 3)
            pe(paths[-1], 0x8664)
            with self.assertRaises(RuntimeError): verify(paths, 'arm64')

    def test_python_extensions_are_verified_including_uppercase_suffix(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            files = [root / 'SmartBLE.exe', root / 'QtCore.pyd', root / 'shiboken.PYD']
            for path in files: pe(path, 0xAA64)
            self.assertEqual(set(images(root)), set(files))
            pe(files[-1], 0x8664)
            with self.assertRaisesRegex(RuntimeError, 'not arm64'):
                verify(images(root), 'arm64')


if __name__ == '__main__':
    unittest.main()
