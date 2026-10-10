import asyncio
import os
os.environ.setdefault('QT_QPA_PLATFORM', 'offscreen')
import sys
import unittest
import threading
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication
from PySide6.QtTest import QSignalSpy
from bluetooth_availability import availability, exception_availability, query_windows_availability
from ble_service import BleService, _ScanWorker
from main import MainWindow


class ProbeTests(unittest.IsolatedAsyncioTestCase):
    async def test_missing_adapter_is_not_powered_off_or_unsupported_os(self):
        async def absent(): return None
        result = await query_windows_availability(absent, 'win32')
        self.assertEqual(result.state, 'no_adapter')
        self.assertFalse(result.can_scan)
        self.assertEqual(result.word, '未检测到蓝牙适配器')
    async def test_adapter_radio_support_and_power_are_separate_facts(self):
        for support, radio, expected in [(False, 'ON', 'unsupported_adapter'), (True, 'ON', 'ready'), (True, 'OFF', 'off'), (True, 'DISABLED', 'disabled'), (True, 'UNKNOWN', 'unknown')]:
            async def read_radio(): return SimpleNamespace(state=SimpleNamespace(name=radio))
            async def adapter(): return SimpleNamespace(is_low_energy_supported=support, get_radio_async=read_radio)
            with self.subTest(expected=expected):
                self.assertEqual((await query_windows_availability(adapter, 'win32')).state, expected)
    async def test_permission_and_unconfirmed_error_cannot_be_inferred_from_radio_text(self):
        async def denied(): raise PermissionError('access denied')
        self.assertEqual((await query_windows_availability(denied, 'win32')).state, 'permission_denied')
        self.assertEqual(exception_availability(RuntimeError('Bluetooth radio unavailable')).state, 'error')
        self.assertEqual(exception_availability(RuntimeError('Could not get default bluetooth adapter')).state, 'error')
        self.assertEqual((await query_windows_availability(platform_name='darwin')).state, 'unsupported')


class GateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.app = QApplication.instance() or QApplication([])
    def tearDown(self):
        if hasattr(self, 'window'):
            self.window._exit_confirmed = True
            self.window.close()
        elif hasattr(self, 'service'): self.service.shutdown()
        self.app.processEvents()
    def test_backend_rejects_scan_and_broadcast_without_starting_native_operations(self):
        async def absent(): return availability('no_adapter')
        self.service = BleService(availability_reader=absent)
        self.service._apply_availability(availability('no_adapter'))
        with patch('ble_service._ScanWorker', side_effect=AssertionError('must not create scanner')):
            self.assertFalse(self.service.start_scan())
        bridge = SimpleNamespace(start=lambda *_: self.fail('must not start publisher'), shutdown=lambda: None)
        self.service._broadcast = bridge
        self.service._apply_availability(availability('ready'))  # stale cache cannot bypass fresh broadcast check
        result = self.service.start_broadcast(1, b'BLE')
        self.assertFalse(result['success'])
        self.assertEqual(self.service.availability.state, 'no_adapter')
        self.assertFalse(self.service.scanning)
        self.assertFalse(self.service.advertising)
    def test_fresh_scan_probe_rejects_missing_adapter_before_bleak_start(self):
        async def absent(): return availability('no_adapter')
        worker = _ScanWorker(availability_reader=absent)
        started = QSignalSpy(worker.started_scan)
        failed = QSignalSpy(worker.failed)
        with patch('bleak.BleakScanner', side_effect=AssertionError('must not start real scan')):
            worker.run()
        self.assertEqual(started.count(), 0)
        self.assertEqual(failed.count(), 1)
        self.assertIn('未检测到蓝牙适配器', failed.at(0)[0])
    def test_startup_and_retry_update_ui_without_user_scanning(self):
        current = ['no_adapter']
        async def read(): return availability(current[0])
        self.window = MainWindow(availability_reader=read)
        probe_done = threading.Event()
        self.window._ble._probe_completed.connect(lambda _: probe_done.set(), Qt.DirectConnection)
        self.window.show()
        self.app.processEvents()
        # QSignalSpy.wait can hold the GIL and starve the Python asyncio worker.
        # Wait on the actual background completion, then deliver queued UI slots.
        self.assertTrue(probe_done.wait(2), 'startup adapter query must finish')
        self.app.processEvents()
        page = self.window._scan_page
        self.assertEqual(self.window._ble.availability.state, 'no_adapter')
        self.assertFalse(page._scan_btn.isEnabled())
        self.assertFalse(self.window._broadcast_page._start_btn.isEnabled())
        self.assertIn('未检测到蓝牙适配器', page._availability_hint.text())
        self.assertTrue(page._retry_bluetooth.isEnabled())
        current[0] = 'ready'
        probe_done.clear()
        page._retry_bluetooth.click()
        self.assertTrue(probe_done.wait(2), 'retry must read new adapter facts')
        self.app.processEvents()
        self.assertTrue(page._scan_btn.isEnabled())
        self.assertTrue(self.window._broadcast_page._start_btn.isEnabled())
        self.assertFalse(self.window._ble.scanning)
    def test_scanner_error_word_radio_does_not_relabel_no_adapter_as_off(self):
        async def absent(): return availability('no_adapter')
        self.window = MainWindow(availability_reader=absent)
        self.window._ble._apply_availability(availability('no_adapter'))
        page = self.window._scan_page
        page._on_failed('Could not access Bluetooth radio')
        self.assertEqual(self.window._ble.availability.state, 'no_adapter')
        self.assertFalse(page._scan_btn.isEnabled())
        self.assertIn('适配器', page._availability_hint.text())
