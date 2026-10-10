"""P002/P003/P005/P010, using real BLE receipts and the shared V1 contract."""
import json
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication, QFormLayout, QHBoxLayout, QLabel, QLineEdit, QMessageBox, QPushButton, QScrollArea, QVBoxLayout, QWidget
from hid_protocol import ProtocolError, candidate_json, parse_pairing_qr, recovery_action, status_text


def label(text=''):
    item = QLabel(text)
    item.setTextFormat(Qt.PlainText)
    item.setWordWrap(True)
    return item


def button(text, action, name=''):
    item = QPushButton(text)
    item.setMinimumHeight(44)
    if name:
        item.setObjectName(name)
    item.clicked.connect(action)
    return item


class SecondaryPage(QWidget):
    def __init__(self, title, back, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 16)
        header = QHBoxLayout()
        header.addWidget(button('返回', back))
        heading = label(title)
        heading.setStyleSheet('font-size:20px;font-weight:700;')
        header.addWidget(heading, 1)
        layout.addLayout(header)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.NoFrame)
        body = QWidget()
        body.setMaximumWidth(820)
        self.body = QVBoxLayout(body)
        self.body.setSpacing(12)
        scroll.setWidget(body)
        scroll.setAlignment(Qt.AlignHCenter)
        layout.addWidget(scroll, 1)


class ProvisioningPage(SecondaryPage):
    def __init__(self, session, back, detail, diagnostics):
        super().__init__('Smart HID 配网', back)
        self.session = session
        self._address = ''
        self.identity = label('连接设备并读取身份后填写配置')
        self.body.addWidget(self.identity)
        self.body.addWidget(label('1 连接设备　→　2 填写配置　→　3 等待设备就绪'))
        self.qr = QLineEdit()
        self.qr.setPlaceholderText('粘贴 shid://pair 配对二维码内容')
        self.qr.setEchoMode(QLineEdit.Password)
        self.body.addWidget(self.qr)
        self.body.addWidget(button('解析配对码', self.parse_qr, 'hid-parse-qr'))
        form = QFormLayout()
        self.ssid, self.password, self.host, self.port, self.token = (QLineEdit() for _ in range(5))
        self.password.setEchoMode(QLineEdit.Password)
        self.token.setEchoMode(QLineEdit.Password)
        self.port.setText('17892')
        for text, field in [('Wi-Fi 名称', self.ssid), ('Wi-Fi 密码', self.password), ('ControlHub 地址', self.host), ('配对端口', self.port), ('配对 token', self.token)]:
            field.setMinimumHeight(40)
            form.addRow(text, field)
        self.body.addLayout(form)
        self.state = label('尚未下发配置')
        self.state.setObjectName('hid-state')
        self.body.addWidget(self.state)
        self.send = button('下发配置', self.start, 'hid-provision-submit')
        self.send.setProperty('primary', True)
        self.retry = button('重连读取状态', session.refresh)
        self.stop = button('停止跟踪', session.cancel)
        self.body.addWidget(self.send)
        self.body.addWidget(self.retry)
        self.body.addWidget(self.stop)
        links = QHBoxLayout()
        self.detail_button = button('设备详情', detail)
        self.diagnostic_button = button('进入诊断', diagnostics)
        links.addWidget(self.detail_button)
        links.addWidget(self.diagnostic_button)
        self.body.addLayout(links)
        self.body.addWidget(label('本页不保存密码或配对码。停止跟踪不会撤销设备已经收到的配置；可重新连接读取状态。'))
        self.body.addStretch(1)
        session.changed.connect(self.changed)
        session.busy_changed.connect(self.busy)
        session.failed.connect(self.failure)
        session.finished.connect(self.finished)
        self.busy(False)

    def bind(self, address):
        if address != self._address:
            for field in (self.ssid, self.password, self.host, self.token, self.qr):
                field.clear()
        self._address = address

    def parse_qr(self):
        value = parse_pairing_qr(self.qr.text())
        if value is None:
            self.failure('不是有效的 Smart HID 配对码')
            return
        self.host.setText(value['host'])
        self.port.setText(str(value['port']))
        self.token.setText(value['token'])
        self.qr.clear()
        self.state.setText('配对码已解析，请填写 Wi-Fi 信息')

    def start(self):
        data = {'wifi_ssid': self.ssid.text(), 'wifi_password': self.password.text(), 'hub_host': self.host.text(), 'hub_port': self.port.text(), 'token': self.token.text()}
        try:
            candidate_json(data)
        except ProtocolError as error:
            self.failure(str(error))
            return
        self.session.start(data)

    def busy(self, active):
        self.send.setEnabled(not active and bool(self.session.info))
        self.retry.setEnabled(not active)
        self.stop.setEnabled(active)
        self.detail_button.setEnabled(not active)
        self.diagnostic_button.setEnabled(not active)
        for field in (self.qr, self.ssid, self.password, self.host, self.port, self.token):
            field.setEnabled(not active)

    def changed(self, snapshot):
        info, status = snapshot['info'], snapshot['status']
        self.identity.setText(f"{self.session.name or self.session.address}\n设备：{info.get('device_id') or '身份读取中'} · 固件：{info.get('firmware') or '未知'}")
        self.send.setEnabled(bool(info) and not self.session.busy)
        if status:
            self.state.setStyleSheet('')
            prefix = '设备当前状态：' if not self.session.busy else ''
            text = prefix + status_text(status)
            if self.session.busy and status.get('state') == 'ready':
                text += '；正在核对本次配置回执'
            self.state.setText(text)

    def failure(self, text):
        self.state.setText(text)
        self.state.setStyleSheet('color:#BD2440;')

    def finished(self, result):
        status = result['status']
        if result['ok']:
            self.password.clear()
            self.token.clear()
            self.state.setText('配网成功，设备已就绪。可打开设备详情和诊断。')
            self.state.setStyleSheet('color:#176B3A;')
            return
        self.failure(status_text(status))
        action = recovery_action(status.get('error'))
        if action == 'form':
            self.ssid.setFocus()
        elif action == 'pairing':
            self.token.clear()
            self.qr.setFocus()
        elif action == 'diagnostics':
            self.diagnostic_button.setFocus()


class HidDetailPage(SecondaryPage):
    def __init__(self, session, back, configure, diagnostics):
        super().__init__('Smart HID 设备详情', back)
        self.values = label('尚未读取设备身份')
        self.body.addWidget(self.values)
        self.body.addWidget(button('刷新设备信息', session.refresh))
        self.body.addWidget(button('重新配置', configure))
        self.body.addWidget(button('诊断连接', diagnostics))
        self.body.addStretch(1)
        session.changed.connect(self.changed)
        session.failed.connect(self.values.setText)

    def changed(self, snapshot):
        info, status = snapshot['info'], snapshot['status']
        self.values.setText('\n\n'.join(f'{name}：{value or "未知"}' for name, value in [('设备 ID', info.get('device_id')), ('产品', info.get('product')), ('协议', info.get('protocol')), ('固件', info.get('firmware')), ('设备状态', status.get('state') or info.get('state')), ('已配网', '是' if info.get('provisioned') else '否')]))


class DiagnosticsPage(SecondaryPage):
    def __init__(self, session, back):
        super().__init__('Smart HID 诊断', back)
        self.rows = {}
        for key in ('BLE 连接', 'Wi-Fi 连接', 'ControlHub 配对', 'MQTT 连接', '设备 Ready 状态'):
            self.rows[key] = label(f'{key}：尚未检测')
            self.body.addWidget(self.rows[key])
        self.body.addWidget(button('重新检测', session.refresh))
        self.note = label('BLE 状态只提供设备报告；Ready 不等于 USB 键鼠物理效果已验收。')
        self.body.addWidget(self.note)
        self.body.addStretch(1)
        session.changed.connect(self.changed)
        session.failed.connect(lambda _: self.rows['BLE 连接'].setText('BLE 连接：读取失败，请重连'))

    def changed(self, snapshot):
        status = snapshot['status']
        state, step, error = status.get('state'), status.get('step'), status.get('error')
        wifi = state in ('pairing', 'mqtt_connecting', 'ready') or step in ('wifi_connected', 'pairing', 'pairing_success', 'mqtt_connecting', 'ready')
        hub = state in ('mqtt_connecting', 'ready') or step in ('pairing_success', 'mqtt_connecting', 'ready')
        checks = [bool(snapshot['info']), wifi, hub, state == 'ready', state == 'ready']
        for (name, row), ready in zip(self.rows.items(), checks):
            row.setText(f'{name}：' + ('设备报告正常' if ready else '未确认'))
        if error:
            self.note.setText(status_text(status))


class VersionsPage(SecondaryPage):
    def __init__(self, back):
        super().__init__('版本记录', back)
        here = Path(__file__).resolve().parent
        paths = (here / 'release-manifest.json', here.parents[2] / 'release/release-manifest.json')
        metadata = {}
        for path in paths:
            try:
                metadata = json.loads(path.read_text(encoding='utf-8'))
                break
            except (OSError, ValueError):
                pass
        self.text = label(f"当前版本：{metadata.get('app_version') or '未知'}\n发布状态：{metadata.get('overall_status') or '未知'}\n构建成功不代表已发布或通过真机验收。")
        self.body.addWidget(self.text)
        self.body.addWidget(button('复制版本信息', lambda: QApplication.clipboard().setText(self.text.text())))
        self.body.addStretch(1)
