import struct
import tempfile
import unittest
from pathlib import Path
from build import tauri_application
from verify_windows_architecture import verify_application


def pe(path, cpu):
    data = bytearray(134)
    data[:2] = b'MZ'
    struct.pack_into('<I', data, 60, 128)
    data[128:132] = b'PE\0\0'
    struct.pack_into('<H', data, 132, cpu)
    path.write_bytes(data)


class WindowsApplicationTests(unittest.TestCase):
    def test_native_apphost_is_checked_without_rejecting_managed_dll_or_installer(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            app = root / 'SmartBLE.Desktop.exe'
            pe(app, 0xAA64)
            pe(root / 'SmartBLE.Desktop.dll', 0x14c)
            pe(root / 'setup.exe', 0x14c)
            proof = verify_application(app, 'arm64')
            self.assertEqual(proof['verified_application'], str(app))
            self.assertEqual(proof['machine'], '0xaa64')
            pe(app, 0x8664)
            with self.assertRaisesRegex(RuntimeError, 'not arm64'):
                verify_application(app, 'arm64')

    def test_tauri_uses_exact_renamed_main_binary_not_framework_or_nsis_image(self):
        app = Path('/project/apps/desktop/tauri/src-tauri')
        metadata = {'target_directory': '/project/target', 'packages': [{
            'manifest_path': str(app / 'Cargo.toml'),
            'targets': [{'name': 'smart_ble_tauri', 'kind': ['cdylib', 'rlib']}, {'name': 'smart-ble-tauri', 'kind': ['bin']}]}]}
        config = {'package': {'productName': 'BLE Toolkit+'}}
        self.assertEqual(tauri_application(metadata, config, app, 'Windows'), Path('/project/target/release/BLE Toolkit+.exe'))
        self.assertEqual(tauri_application(metadata, {}, app, 'Windows'), Path('/project/target/release/smart-ble-tauri.exe'))
        self.assertEqual(tauri_application(metadata, config, app, 'Linux'), Path('/project/target/release/ble-toolkit'))
        metadata['packages'][0]['targets'].append({'name': 'another-app', 'kind': ['bin']})
        with self.assertRaisesRegex(RuntimeError, 'main Rust binary'):
            tauri_application(metadata, config, app, 'Windows')
        metadata['packages'][0]['default_run'] = 'smart-ble-tauri'
        self.assertEqual(tauri_application(metadata, config, app, 'Windows'), Path('/project/target/release/BLE Toolkit+.exe'))


if __name__ == '__main__':
    unittest.main()
