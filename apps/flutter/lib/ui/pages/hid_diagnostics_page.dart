// P005 Smart HID 诊断。
//
// 对齐原型 docs/specs/prototype/v1-new/pages/p005-diagnostics.js 与
// PAGE_SPEC §5：①当前状态行 ②五项诊断行（BLE/Wi-Fi/ControlHub/控制连接/
// 设备 Ready）③操作区四按钮 ④错误详情块。
//
// 出口栈感知（PAGE_FLOW §1①②）：fromDetail=true 时「返回设备详情」pop 回
// P003，fromWizard=true 时「重新配网」pop 回 P002；否则 push 对应页面。
// 行为级五行映射为 G1 真实最小投影（读 INFO/STATUS 特征映射结论），
// 逐行文案与状态机深对齐在 P005 逐页 Gate 深化。

import 'package:flutter/material.dart';

import '../../core/ble/provisioning_controller.dart';
import '../../core/ble/provisioning_transport.dart';
import '../../core/models/ble_scan_result.dart';
import '../../core/protocols/hid_provisioning_protocol.dart';
import '../../themes/app_theme.dart';
import 'hid_detail_page.dart';
import 'provisioning_page.dart';
import '../../core/design/app_icons.dart';
import '../design/app_subnav.dart';
import '../design/app_status_icon.dart';

enum _DiagRowState { pending, active, ok, warn, fail }

enum _PageState { idle, connected, checking, live, offline, error }

class _DiagRowData {
  _DiagRowData(this.title);

  final String title;
  _DiagRowState state = _DiagRowState.pending;
  String detail = '';
}

class HidDiagnosticsPage extends StatefulWidget {
  const HidDiagnosticsPage({
    super.key,
    required this.deviceId,
    required this.name,
    this.fromDetail = false,
    this.fromWizard = false,
  });

  final String deviceId;
  final String name;
  final bool fromDetail;
  final bool fromWizard;

  @override
  State<HidDiagnosticsPage> createState() => _HidDiagnosticsPageState();
}

class _HidDiagnosticsPageState extends State<HidDiagnosticsPage> {
  ProvisioningController? _controller;
  _PageState _pageState = _PageState.idle;
  bool _showError = false;
  String? _errorCode;
  String? _errorMessage;
  final List<_DiagRowData> _rows = [
    _DiagRowData('BLE 连接'),
    _DiagRowData('Wi-Fi 连接'),
    _DiagRowData('ControlHub 配对'),
    _DiagRowData('MQTT 控制链路'),
    _DiagRowData('USB HID Ready'),
  ];

  @override
  void dispose() {
    // 本页持有连接则卸载时断开（PAGE_SPEC §5）。
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _rerun() async {
    final controller = _controller;
    final live =
        controller != null && controller.deviceInfo != null && !controller.lost;
    if (!live) {
      await _confirmConnectAndDiagnose();
      return;
    }
    await _diagnose(controller);
  }

  Future<void> _confirmConnectAndDiagnose() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('BLE 未连接'),
        content: const Text('设备当前未连接，需要先连接设备才能读取实时状态。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('连接并检测'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _pageState = _PageState.checking);
    final controller = _controller ??= ProvisioningController(
        transportFactory: () => FbpProvisioningTransport());
    await controller.connectDevice(widget.deviceId);
    if (!mounted) return;
    if (controller.connError != null || controller.deviceInfo == null) {
      setState(() {
        _pageState = _PageState.error;
        _errorCode = 'identity_failed';
        _errorMessage = controller.connError ?? '设备身份验证失败';
      });
      await _showRecoveryModeHint();
      return;
    }
    await _diagnose(controller);
  }

  Future<void> _showRecoveryModeHint() async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('连接失败'),
        content: const Text('请让设备进入配网/恢复模式后重试（READY 设备会关闭蓝牙广播）。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('知道了'),
          ),
        ],
      ),
    );
  }

  Future<void> _diagnose(ProvisioningController controller) async {
    setState(() {
      _pageState = _PageState.checking;
      for (final row in _rows) {
        row.state = _DiagRowState.pending;
        row.detail = '';
      }
    });
    try {
      final snap = await controller.runDiagnostics();
      if (!mounted) return;
      final info = parseDeviceInfo(snap.deviceInfoRaw);
      final status = parseProvisionStatus(snap.statusRaw);
      setState(() {
        _pageState = _PageState.live;
        _rows[0].state = _DiagRowState.ok;
        _rows[0].detail = 'INFO 特征读取成功';
        _rows[1].detail =
            'state=${info?.state ?? '—'} provisioned=${info?.provisioned ?? '—'}';
        _rows[2].detail = 'status.state=${status?.state ?? '—'}';
        _rows[3].detail = 'status.step=${status?.step ?? '—'}';
        _rows[4].detail = 'ready=${status?.state == 'ready' ? '是' : '否'}';
        _errorCode = status?.error;
        _errorMessage = status?.error;
        if (status?.state == 'ready') {
          for (final row in _rows) {
            row.state = _DiagRowState.ok;
          }
          _rows[4].detail = 'ready=是';
        } else if (status?.error != null) {
          final idx = _rowIndexByErrorCode(status!.error!);
          if (idx >= 0) _rows[idx].state = _DiagRowState.fail;
        } else {
          _rows[1].state = (info?.provisioned ?? false)
              ? _DiagRowState.ok
              : _DiagRowState.warn;
          for (var i = 2; i < 5; i++) {
            _rows[i].state = _DiagRowState.warn;
          }
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _pageState = _PageState.error;
        _errorCode = 'diagnostic_failed';
        _errorMessage = e.toString();
        _rows[0].state = _DiagRowState.fail;
        _rows[0].detail = e.toString();
      });
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('诊断读取失败')));
    }
  }

  int _rowIndexByErrorCode(String code) {
    switch (code) {
      case 'wifi_failed':
      case 'invalid_payload':
        return 1;
      case 'controlhub_unreachable':
      case 'pairing_invalid':
      case 'pairing_expired':
      case 'pairing_used':
        return 2;
      case 'mqtt_invalid':
      case 'storage_failed':
        return 3;
      default:
        return -1;
    }
  }

  void _backToDetail() {
    if (widget.fromDetail) {
      Navigator.of(context).maybePop();
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) =>
            HidDetailPage(deviceId: widget.deviceId, name: widget.name),
      ),
    );
  }

  Future<void> _reprovision() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('重新配网'),
        content: const Text('READY 设备已关闭蓝牙广播，需先进配网模式。确认设备已进入配网模式？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('已进入配网模式'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    if (widget.fromWizard) {
      Navigator.of(context).maybePop();
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ProvisioningPage(
          device: BleScanResult(
            deviceId: widget.deviceId,
            name: widget.name,
            rssi: 0,
            timestamp: DateTime.now(),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: const AppSubnav(title: 'SHID 诊断'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _statusLine(),
          const SizedBox(height: 12),
          _rowsCard(),
          const SizedBox(height: 16),
          _actions(),
          if (_showError && _errorMessage != null) ...[
            const SizedBox(height: 16),
            _errorBlock(),
          ],
        ],
      ),
    );
  }

  Widget _statusLine() {
    // UI-G2：正典状态行（B7 stIcon 五态 + 语义词），退役文本字形 ✓/!/·/…
    const statusByState = {
      _PageState.idle: (AppStatusIconState.pending, '尚未检测'),
      _PageState.connected: (AppStatusIconState.pending, '设备已连接，可开始检测'),
      _PageState.checking: (AppStatusIconState.active, '正在读取实时状态…'),
      _PageState.live: (AppStatusIconState.ok, '实时检测完成'),
      _PageState.offline: (AppStatusIconState.fail, '设备未连接'),
      _PageState.error: (AppStatusIconState.fail, '检测失败'),
    };
    final (stIconState, label) = statusByState[_pageState]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          AppStatusIcon(state: stIconState, size: 22),
          const SizedBox(width: 8),
          Text(label,
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary)),
          const Spacer(),
          Text(widget.name,
              style:
                  const TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }

  Widget _rowsCard() {
    const stateMeta = {
      _DiagRowState.pending: '待检测',
      _DiagRowState.active: '检测中',
      _DiagRowState.ok: '正常',
      _DiagRowState.warn: '异常',
      _DiagRowState.fail: '失败',
    };
    const stIconByRowState = {
      _DiagRowState.pending: AppStatusIconState.pending,
      _DiagRowState.active: AppStatusIconState.active,
      _DiagRowState.ok: AppStatusIconState.ok,
      _DiagRowState.warn: AppStatusIconState.warn,
      _DiagRowState.fail: AppStatusIconState.fail,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        children: [
          for (var i = 0; i < _rows.length; i++)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: i == _rows.length - 1
                  ? null
                  : const BoxDecoration(
                      border: Border(
                          bottom: BorderSide(color: AppTheme.borderColor))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      AppStatusIcon(
                          state: stIconByRowState[_rows[i].state]!, size: 24),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_rows[i].title,
                            style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textPrimary)),
                      ),
                      Text(stateMeta[_rows[i].state]!,
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.textSecondary)),
                    ],
                  ),
                  if (_rows[i].detail.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(left: 22, top: 4),
                      child: Text(_rows[i].detail,
                          style: const TextStyle(
                              fontSize: 11,
                              fontFamily: 'monospace',
                              color: AppTheme.textSecondary)),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _actions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton.icon(
          onPressed: _pageState == _PageState.checking ? null : _rerun,
          icon: const AppIcon('refresh', size: 18),
          label: Text(_pageState == _PageState.checking ? '连接中…' : '重新检测'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            disabledBackgroundColor: AppTheme.secondaryColor,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () => setState(() => _showError = !_showError),
          icon: AppIcon(_showError ? 'eye-off' : 'eye',
              size: 18, color: AppTheme.primaryColor),
          label: Text(_showError ? '隐藏错误码' : '显示错误码（详细信息）'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.primaryColor,
            side: const BorderSide(color: AppTheme.primaryColor),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _backToDetail,
          icon: const AppIcon('chev-r',
              rotate: 180, size: 18, color: AppTheme.primaryColor),
          label: const Text('返回设备详情'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.primaryColor,
            side: const BorderSide(color: AppTheme.primaryColor),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _reprovision,
          icon:
              const AppIcon('refresh', size: 18, color: AppTheme.primaryColor),
          label: const Text('重新配网'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.primaryColor,
            side: const BorderSide(color: AppTheme.primaryColor),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }

  Widget _errorBlock() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.errorColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('错误详情',
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.errorColor)),
          const SizedBox(height: 6),
          Text('code: ${_errorCode ?? '—'}',
              style: const TextStyle(
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: AppTheme.textPrimary)),
          const SizedBox(height: 2),
          Text(_errorMessage ?? '—',
              style: const TextStyle(
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}
