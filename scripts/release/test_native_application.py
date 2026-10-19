import struct
import tempfile
import unittest
from pathlib import Path
from native_application import verify_linux_application


class NativeApplicationTests(unittest.TestCase):
    def test_actual_elf_machine_prevents_wrong_architecture_label(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'application'
            header = bytearray(20)
            header[:6] = b'\x7fELF\x02\x01'
            struct.pack_into('<H', header, 18, 62)
            path.write_bytes(header)
            self.assertEqual(verify_linux_application(path, 'x64')['machine'], 62)
            with self.assertRaisesRegex(RuntimeError, 'not arm64'):
                verify_linux_application(path, 'arm64')
            struct.pack_into('<H', header, 18, 183)
            path.write_bytes(header)
            self.assertEqual(verify_linux_application(path, 'arm64')['machine'], 183)

    def test_non_native_or_truncated_image_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'application'
            path.write_bytes(b'not an ELF executable')
            with self.assertRaisesRegex(RuntimeError, 'native ELF'):
                verify_linux_application(path, 'arm64')


class MacOSApplicationTests(unittest.TestCase):
    def make_bundle(self, root):
        import plistlib
        bundle = root / '蓝析BLE工具箱.app'
        (bundle / 'Contents/MacOS').mkdir(parents=True)
        info = {'CFBundleExecutable': 'app', 'CFBundleShortVersionString': '1.0.5',
                'NSBluetoothAlwaysUsageDescription': 'Bluetooth', 'NSCameraUsageDescription': 'Camera'}
        (bundle / 'Contents/Info.plist').write_bytes(plistlib.dumps(info))
        (bundle / 'Contents/MacOS/app').write_bytes(bytes.fromhex('cafebabe') + bytes(32))
        return bundle

    def test_all_packaged_macho_images_are_verified_by_content_including_extensionless_frameworks(self):
        from unittest.mock import patch
        from native_application import verify_macos_application
        with tempfile.TemporaryDirectory() as directory:
            bundle = self.make_bundle(Path(directory))
            framework = bundle / 'Contents/Frameworks/Native.framework/Versions/A/Native'
            framework.parent.mkdir(parents=True)
            framework.write_bytes(bytes.fromhex('cffaedfe') + bytes(32))
            (framework.parents[2] / 'Native').symlink_to('Versions/A/Native')
            addon = bundle / 'Contents/plugin.node'
            addon.write_bytes(bytes.fromhex('cafebabe') + bytes(32))
            (bundle / 'Contents/data.txt').write_text('not executable')
            with patch('native_application.subprocess.check_output', return_value='x86_64 arm64\n') as lipo:
                report = verify_macos_application(bundle, '1.0.5')
            self.assertEqual(report['verified_macho_count'], 3)
            self.assertEqual(len(report['macho_images']), 3)
            self.assertEqual(lipo.call_count, 4)  # apphost + three unique payload files

    def test_single_architecture_nested_framework_fails_even_with_universal_apphost(self):
        from unittest.mock import patch
        from native_application import verify_macos_application
        with tempfile.TemporaryDirectory() as directory:
            bundle = self.make_bundle(Path(directory))
            framework = bundle / 'Contents/Frameworks/objective_c.framework/objective_c'
            framework.parent.mkdir(parents=True)
            framework.write_bytes(bytes.fromhex('cffaedfe') + bytes(32))
            def slices(args, **kwargs):
                return 'arm64\n' if Path(args[-1]).name == 'objective_c' else 'x86_64 arm64\n'
            with patch('native_application.subprocess.check_output', side_effect=slices):
                with self.assertRaisesRegex(RuntimeError, 'Packaged Mach-O must contain both.*objective_c'):
                    verify_macos_application(bundle, '1.0.5')


if __name__ == '__main__':
    unittest.main()
