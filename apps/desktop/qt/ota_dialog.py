"""Native OTA picker and transaction lifetime; no background result crosses devices."""
import asyncio
from concurrent.futures import CancelledError
from shiboken6 import isValid
from pathlib import Path

from PySide6.QtCore import QObject, Signal, Qt
from PySide6.QtWidgets import QDialog, QFileDialog, QLabel, QProgressBar, QPushButton, QVBoxLayout
from ota_protocol import update, validate_package, OtaError, SERVICE, CTRL, DATA, STATUS


def capable(tree):
    for service in tree.get('services', []):
        if service.get('uuid', '').lower() == SERVICE:
            chars = {c['uuid'].lower(): set(c.get('props', [])) for c in service.get('chars', [])}
            return ('write' in chars.get(CTRL, set()) and bool(chars.get(DATA, set()) & {'write', 'write-without-response', 'writeWithoutResponse'}) and bool(chars.get(STATUS, set()) & {'notify', 'indicate'}))
    return False


class OtaController(QObject):
    progress = Signal(int)
    finished = Signal(str)
    busy_changed = Signal(bool)

    def __init__(self, ble, address, parent=None):
        super().__init__(parent)
        self.ble, self.address = ble, address
        self.busy = False
        self._task = None
        self._cancel_requested = False

    def start(self, firmware, manifest):
        if self.busy: return
        client = self.ble._clients.get(self.address)
        if client is None or not client.is_connected:
            self.finished.emit('设备未连接，请连接后重试')
            return
        self.busy = True
        self._cancel_requested = False
        self.busy_changed.emit(True)
        async def execute():
            self._task = asyncio.current_task()
            if self._cancel_requested: raise asyncio.CancelledError
            return await update(client, firmware, manifest, self.progress.emit)
        future = self.ble._gatt.submit(execute())
        def done(result):
            if not isValid(self): return
            self._task = None
            self.busy = False
            self.busy_changed.emit(False)
            try:
                value = result.result()
            except (asyncio.CancelledError, CancelledError):
                self.finished.emit('客户端跟踪已停止；已尝试发送取消请求，但设备结果未确认，请重连检查')
            except (OtaError, TimeoutError) as error:
                self.finished.emit(str(error) + "；取消请求的设备结果未确认，请重连检查")
            except Exception:
                self.finished.emit('蓝牙操作失败；升级和取消请求的设备结果均未确认，请重连检查')
            else:
                self.finished.emit('设备已确认升级成功，正在重启；重连后核对版本 ' + value['version'])
        future.add_done_callback(done)

    def cancel(self):
        self._cancel_requested = True
        if self._task is not None and self.ble._gatt._loop is not None:
            self.ble._gatt._loop.call_soon_threadsafe(self._task.cancel)


class OtaDialog(QDialog):
    def __init__(self, ble, address, parent=None):
        super().__init__(parent)
        self.setWindowTitle('固件更新')
        self.setWindowModality(Qt.WindowModal)
        self.resize(520, 340)
        self.controller = OtaController(ble, address, self)
        self.firmware, self.manifest = None, None
        layout = QVBoxLayout(self)
        self.status = QLabel('选择 .bin 固件及其 manifest；校验 size、SHA256 和目标后才写设备')
        self.status.setTextFormat(Qt.PlainText)
        self.status.setWordWrap(True)
        layout.addWidget(self.status)
        self.choose = QPushButton('选择固件和 manifest')
        self.choose.clicked.connect(self.select_package)
        layout.addWidget(self.choose)
        self.bar = QProgressBar()
        layout.addWidget(self.bar)
        self.start_button = QPushButton('开始升级')
        self.start_button.setObjectName('Primary')
        self.start_button.setStyleSheet('QPushButton:disabled { color: #9AA8B6; background: #EEF2F7; }')
        self.start_button.setEnabled(False)
        self.start_button.clicked.connect(lambda: self.controller.start(self.firmware, self.manifest))
        layout.addWidget(self.start_button)
        self.cancel_button = QPushButton('关闭')
        self.cancel_button.clicked.connect(self.cancel_or_close)
        layout.addWidget(self.cancel_button)
        self.controller.progress.connect(self.show_progress)
        self.controller.finished.connect(self.status.setText)
        self.controller.busy_changed.connect(self.set_busy)

    def show_progress(self, percent):
        self.bar.setValue(percent)
        self.status.setText(f'传输中 {percent}%；完成后等待设备提交回执' if percent < 100 else '设备已返回成功回执，正在重启')

    def select_package(self):
        binary, _ = QFileDialog.getOpenFileName(self, '选择固件', '', '固件 (*.bin)')
        if not binary: return
        manifest, _ = QFileDialog.getOpenFileName(self, '选择对应 manifest', str(Path(binary).parent), 'manifest (*.json)')
        if not manifest: return
        self.firmware = self.manifest = None
        self.start_button.setEnabled(False)
        try:
            self.firmware = Path(binary).read_bytes()
            self.manifest = validate_package(self.firmware, Path(manifest).read_text(encoding='utf-8'))
            self.status.setText(f"包校验通过：{Path(binary).name} · {len(self.firmware)} 字节 · {self.manifest['target']} · {self.manifest['firmware_version']}")
            self.bar.setValue(0)
            self.start_button.setEnabled(True)
        except (OSError, UnicodeError, OtaError) as error:
            self.firmware = self.manifest = None
            self.status.setText('包校验失败：' + str(error))

    def set_busy(self, busy):
        self.choose.setEnabled(not busy)
        self.start_button.setEnabled(not busy and self.firmware is not None)
        self.cancel_button.setText('取消升级' if busy else '关闭')
        if busy: self.status.setText('正在启动 OTA；等待设备 ready 回执')

    def cancel_or_close(self):
        if self.controller.busy:
            self.controller.cancel()
            self.status.setText('正在尝试中止设备事务，请等待清理完成')
        else:
            self.close()

    def closeEvent(self, event):
        if self.controller.busy:
            self.cancel_or_close()
            event.ignore()
        else:
            self.firmware = self.manifest = None
            event.accept()
