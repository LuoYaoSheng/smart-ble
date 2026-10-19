import json
import tempfile
import unittest
from pathlib import Path
from build import ROOT, effective_tauri_config, tauri_application


class TauriPlatformConfigTests(unittest.TestCase):
    def test_linux_uses_ascii_package_and_binary_with_chinese_desktop_entry(self):
        directory = ROOT / 'apps/desktop/tauri/src-tauri'
        linux = effective_tauri_config(directory, 'Linux')
        self.assertEqual(linux['package']['productName'], 'lanxi-ble-toolkit')
        self.assertEqual(linux['tauri']['windows'][0]['title'], '蓝析BLE工具箱')
        metadata = {'target_directory': '/target', 'packages': [{
            'manifest_path': str(directory / 'Cargo.toml'),
            'targets': [{'name': 'smart-ble-tauri', 'kind': ['bin']}]}]}
        self.assertEqual(tauri_application(metadata, linux, directory, 'Linux'), Path('/target/release/lanxi-ble-toolkit'))
        for package in ('deb', 'rpm'):
            template = directory / linux['tauri']['bundle'][package]['desktopTemplate']
            entry = template.read_text(encoding='utf-8')
            self.assertIn('Name=蓝析BLE工具箱\n', entry)
            self.assertIn('Exec={{exec}}\n', entry)
            self.assertIn('Icon={{icon}}\n', entry)
            self.assertNotIn('Name={{name}}', entry)
        # Both Debian package control and RPM metadata derive from productName;
        # an ASCII artifact basename alone cannot repair an invalid package name.
        self.assertRegex(linux['package']['productName'], r'^[a-z0-9][a-z0-9+.-]+$')

    def test_windows_and_macos_keep_native_chinese_bundle_name(self):
        directory = ROOT / 'apps/desktop/tauri/src-tauri'
        for system in ('Windows', 'Darwin'):
            config = effective_tauri_config(directory, system)
            self.assertEqual(config['package']['productName'], '蓝析BLE工具箱')
            self.assertNotIn('desktopTemplate', config['tauri']['bundle']['deb'])

    def test_platform_merge_matches_json_merge_patch_and_preserves_other_settings(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            base = {'package': {'productName': '显示名', 'version': '1.2.3'},
                    'tauri': {'security': {'csp': 'keep'}, 'bundle': {'deb': {'depends': ['keep'], 'section': 'remove'}}}}
            patch = {'package': {'productName': 'ascii-name'},
                     'tauri': {'bundle': {'deb': {'desktopTemplate': 'linux/main.desktop', 'section': None}}}}
            (directory / 'tauri.conf.json').write_text(json.dumps(base), encoding='utf-8')
            (directory / 'tauri.linux.conf.json').write_text(json.dumps(patch), encoding='utf-8')
            result = effective_tauri_config(directory, 'Linux')
            self.assertEqual(result['package']['version'], '1.2.3')
            self.assertEqual(result['tauri']['security']['csp'], 'keep')
            self.assertEqual(result['tauri']['bundle']['deb']['depends'], ['keep'])
            self.assertNotIn('section', result['tauri']['bundle']['deb'])
            self.assertEqual(effective_tauri_config(directory, 'Windows'), base)


if __name__ == '__main__':
    unittest.main()
