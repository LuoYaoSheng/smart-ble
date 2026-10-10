import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import os
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
import unittest
from pathlib import Path
from PySide6.QtWidgets import QApplication
from main import MainWindow
from theme import QSS


class PageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication.instance() or QApplication([])
        cls.app.setStyleSheet(QSS)

    def setUp(self):
        self.window = MainWindow()
        self.window.show()
        self.app.processEvents()

    def tearDown(self):
        self.window._exit_confirmed = True
        self.window.close()
        self.app.processEvents()

    def test_nine_pages_and_secondary_navigation_preserve_tab_contract(self):
        self.assertEqual(self.window._stack.count(), 9)
        for index in (self.window.IDX_PROVISION, self.window.IDX_HID_DETAIL, self.window.IDX_DIAGNOSTICS, self.window.IDX_VERSIONS):
            self.window._show_secondary(index)
            self.assertEqual(self.window._stack.currentIndex(), index)
            self.assertTrue(self.window._tabs.isHidden())
        self.window._show_root(self.window.IDX_ABOUT)
        self.assertFalse(self.window._tabs.isHidden())

    def test_changing_device_clears_credentials_and_same_device_keeps_retry_form(self):
        page = self.window._provision_page
        page.bind('device-A')
        page.password.setText('test-only-password')
        page.token.setText('a' * 32)
        page.bind('device-A')
        self.assertEqual(page.password.text(), 'test-only-password')
        page.bind('device-B')
        self.assertEqual(page.password.text(), '')
        self.assertEqual(page.token.text(), '')

    def test_qr_and_success_do_not_expose_or_retain_credentials(self):
        page = self.window._provision_page
        page.qr.setText('shid://pair?token=' + 'a' * 32 + '&host=hub.lan')
        page.parse_qr()
        self.assertEqual(page.host.text(), 'hub.lan')
        self.assertEqual(page.qr.text(), '')
        page.password.setText('test-only-password')
        page.finished({'ok': True, 'status': {'state': 'ready'}})
        self.assertEqual(page.password.text(), '')
        self.assertEqual(page.token.text(), '')


if __name__ == '__main__': unittest.main()
