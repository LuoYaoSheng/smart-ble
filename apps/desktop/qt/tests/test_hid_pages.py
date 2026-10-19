import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import os
import time
from types import SimpleNamespace
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
import unittest
from concurrent.futures import Future
from pathlib import Path
from PySide6.QtWidgets import QApplication, QDialog
from main import MainWindow
from theme import QSS
from widgets import BtDot


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

    def test_unknown_adapter_state_renders_neutral_dot(self):
        dot = BtDot()
        dot.set_state('unknown')
        dot.show()
        self.app.processEvents()
        self.assertFalse(dot.grab().isNull())
        dot.close()

    def test_late_gatt_completion_cannot_mutate_replacement_session(self):
        ble = self.window._ble
        previous, replacement = object(), object()
        future = Future()
        original_submit = ble._gatt.submit
        async def read(): return b'old'
        def submit(coro):
            coro.close()
            return future
        ble._gatt.submit = submit
        seen = []
        try:
            ble._clients['A'] = previous
            ble._generations['A'] = 1
            ble._submit_op('read', 'A', 'char', read(), seen.append)
            ble._clients['A'] = replacement
            ble._generations['A'] = 2
            future.set_result(b'old')
            self.assertEqual(seen, [])
        finally:
            ble._clients.pop('A', None)
            ble._gatt.submit = original_submit

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

    def test_leaving_hid_clears_credentials_and_disconnects_owned_device(self):
        self.window._hid_session.address = 'device-A'
        page = self.window._provision_page
        page.password.setText('test-only-password')
        page.token.setText('a' * 32)
        page.qr.setText('sensitive-pairing-link')
        calls = []
        original = self.window._ble.disconnect_device
        self.window._ble.disconnect_device = calls.append
        try:
            self.window._back_from_hid()
            self.assertEqual(calls, ['device-A'])
            self.assertEqual(page.password.text(), '')
            self.assertEqual(page.token.text(), '')
            self.assertEqual(page.qr.text(), '')
            self.assertEqual(self.window._hid_session.address, '')
        finally:
            self.window._ble.disconnect_device = original

    def test_pairing_credentials_expire_after_five_minutes(self):
        page = self.window._provision_page
        page.password.setText('test-only-password')
        page.token.setText('a' * 32)
        page._token_acquired = time.monotonic() - 301
        self.assertTrue(page.expire_pairing())
        self.assertEqual(page.token.text(), '')
        self.assertEqual(page.password.text(), '')

    def test_notification_flags_are_isolated_by_service(self):
        ble = self.window._ble
        ble._mark_notify('A', '2a19', True, '180a')
        self.assertTrue(ble.notifying('A', '2a19', '180a'))
        self.assertFalse(ble.notifying('A', '2a19', '180f'))
        ble._mark_notify('A', '2a19', True, '180f')
        ble._mark_notify('A', '2a19', False, '180a')
        self.assertFalse(ble.notifying('A', '2a19', '180a'))
        self.assertTrue(ble.notifying('A', '2a19', '180f'))

    def test_gatt_actions_pass_selected_service_and_old_write_dialog_cannot_target_new_device(self):
        page, ble = self.window._detail_page, self.window._ble
        tree = {'services': [
            {'uuid': service, 'name': service, 'chars': [{'uuid': '2a19', 'props': ['read', 'write', 'notify']}]}
            for service in ('180a', '180f')]}
        page.bind('A', 'device A', tree)
        page._tree.setCurrentItem(page._tree.topLevelItem(1).child(0))
        reads, notifications, writes = [], [], []
        old_read, old_notify, old_write = ble.read_char, ble.set_notify, ble.write_char
        ble.read_char = lambda *args: reads.append(args)
        ble.set_notify = lambda *args: notifications.append(args)
        ble.write_char = lambda *args: writes.append(args)
        try:
            page._read(); page._toggle_notify()
            self.assertEqual(reads, [('A', '2a19', '180f')])
            self.assertEqual(notifications, [('A', '2a19', True, '180f')])
            page._write_dlg = SimpleNamespace(payload=lambda: b'test')
            page._address = 'B'
            page._on_write_finished('A', '180f', '2a19', QDialog.Accepted)
            self.assertEqual(writes, [])
        finally:
            ble.read_char, ble.set_notify, ble.write_char = old_read, old_notify, old_write

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
