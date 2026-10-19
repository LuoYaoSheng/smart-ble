import plistlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from native_application import verify_ios_application


class IOSApplicationResourcesTests(unittest.TestCase):
    def make_bundle(self, directory):
        app = Path(directory) / '蓝析BLE工具箱.app'
        app.mkdir()
        icon = {'CFBundlePrimaryIcon': {'CFBundleIconName': 'AppIcon', 'CFBundleIconFiles': ['AppIcon60x60']}}
        info = {'CFBundleExecutable': 'app', 'CFBundleName': '蓝析BLE工具箱',
                'CFBundleDisplayName': '蓝析BLE工具箱', 'CFBundleShortVersionString': '1.0.5',
                'CFBundleIcons': icon, 'CFBundleIcons~ipad': icon, 'UILaunchStoryboardName': 'LaunchScreen'}
        (app / 'Info.plist').write_bytes(plistlib.dumps(info))
        (app / 'PrivacyInfo.xcprivacy').write_bytes(plistlib.dumps({'NSPrivacyTracking': False}))
        (app / 'Assets.car').touch()
        (app / 'LaunchScreen.storyboardc').mkdir()
        (app / 'app').touch()
        return app

    def test_built_application_resources_and_identity_are_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            app = self.make_bundle(directory)
            with patch('native_application.subprocess.check_output', return_value='arm64\n'):
                report = verify_ios_application(app, '1.0.5', '蓝析BLE工具箱')
            self.assertEqual(report['privacy_manifest'], 'PASS')
            self.assertEqual(report['compiled_app_icons'], 'PASS')

    def test_source_privacy_manifest_does_not_mask_missing_packaged_resource(self):
        with tempfile.TemporaryDirectory() as directory:
            app = self.make_bundle(directory)
            # The original packaging bug left the source present but not in the app.
            (app / 'PrivacyInfo.xcprivacy').rename(Path(directory) / 'PrivacyInfo.xcprivacy')
            with self.assertRaisesRegex(RuntimeError, 'lacks PrivacyInfo'):
                verify_ios_application(app)

    def test_uncompiled_icons_or_launch_screen_are_rejected(self):
        for missing in ('Assets.car', 'LaunchScreen.storyboardc'):
            with self.subTest(missing=missing), tempfile.TemporaryDirectory() as directory:
                app = self.make_bundle(directory)
                path = app / missing
                path.rmdir() if path.is_dir() else path.unlink()
                with self.assertRaisesRegex(RuntimeError, 'lacks compiled Assets|lacks its launch'):
                    verify_ios_application(app)


if __name__ == '__main__':
    unittest.main()
