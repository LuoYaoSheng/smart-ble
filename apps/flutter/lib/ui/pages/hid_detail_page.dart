// P003 Smart HID 设备详情。
//
// 对齐原型 docs/specs/prototype/v1-new/pages/p003-hid-detail.js 与
// PAGE_SPEC §3：①设备身份卡 ②最近配置卡 ③操作区（重新配置主按钮 +
// 运行诊断 / 高级 BLE 调试双次按钮）。
//
// 数据来自 HidSessionStore 内存快照（P002 成功后写入；零本地持久化，
// 冷启动为空）；无快照（无设备上下文）→ 弹窗后强制返回。

import 'package:flutter/material.dart';

import '../../core/ble/hid_session_store.dart';
import '../../core/models/ble_scan_result.dart';
import '../../themes/app_theme.dart';
import 'device_detail_page.dart';
import 'hid_diagnostics_page.dart';
import 'provisioning_page.dart';

class HidDetailPage extends StatefulWidget {
  const HidDetailPage({super.key, required this.deviceId, this.name = ''});

  final String deviceId;
  final String name;

  @override
  State<HidDetailPage> createState() => _HidDetailPageState();
}

class _HidDetailPageState extends State<HidDetailPage> {
  HidSessionSnapshot? _snapshot;
  bool _guardShown = false;

  @override
  void initState() {
    super.initState();
    _snapshot = HidSessionStore.instance.find(widget.deviceId);
    if (_snapshot == null) {
      // 记录不存在守卫：进入即弹窗返回（PAGE_SPEC P003）。
      WidgetsBinding.instance.addPostFrameCallback((_) => _guardMissing());
    }
  }

  void _guardMissing() {
    if (_guardShown || !mounted) return;
    _guardShown = true;
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('设备记录不存在'),
        content: const Text('该设备记录已不存在，请返回设备列表。'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              if (mounted) Navigator.of(context).maybePop();
            },
            child: const Text('确定'),
          ),
        ],
      ),
    );
  }

  String _orDash(String? value) =>
      (value == null || value.isEmpty) ? '—' : value;

  void _reconfigure() {
    final snap = _snapshot;
    if (snap == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ProvisioningPage(
          device: BleScanResult(
            deviceId: snap.deviceId,
            name: snap.name,
            rssi: 0,
            timestamp: DateTime.now(),
          ),
        ),
      ),
    );
  }

  void _runDiagnostics() {
    final snap = _snapshot;
    if (snap == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => HidDiagnosticsPage(
          deviceId: snap.deviceId,
          name: snap.name,
          fromDetail: true,
        ),
      ),
    );
  }

  void _openAdvancedBle() {
    final snap = _snapshot;
    if (snap == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => DeviceDetailPage(
          deviceId: snap.deviceId,
          deviceName: snap.name,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final snap = _snapshot;
    final name = snap?.name.isNotEmpty == true ? snap!.name : 'Smart HID 设备';
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Smart HID 设备'),
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: snap == null
          ? const SizedBox.shrink()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _card(children: [
                  _cardTitle('设备身份'),
                  _row('名称', name),
                  _row('协议',
                      snap.protocol.isEmpty ? '协议未记录' : snap.protocol),
                  _monoRow('Device ID', snap.deviceId),
                  _row('固件版本', _orDash(snap.firmware)),
                ]),
                const SizedBox(height: 12),
                _card(children: [
                  _cardTitle('最近配置'),
                  _row('Wi-Fi', _orDash(snap.lastWifi)),
                  _row('ControlHub', _orDash(snap.lastHub), last: true),
                ]),
                const SizedBox(height: 16),
                _PrimaryButton(
                  label: '重新配置',
                  icon: Icons.settings_remote_outlined,
                  onPressed: _reconfigure,
                ),
                const SizedBox(height: 10),
                _SecondaryButton(
                  label: '运行诊断',
                  icon: Icons.monitor_heart_outlined,
                  onPressed: _runDiagnostics,
                ),
                const SizedBox(height: 10),
                _SecondaryButton(
                  label: '高级 BLE 调试',
                  icon: Icons.developer_mode_outlined,
                  onPressed: _openAdvancedBle,
                ),
              ],
            ),
    );
  }

  // ------------------------------------------------------------------
  // 自绘卡片/行/按钮（对齐 P003 原型卡片行结构；Token 级视觉在视觉 Gate 核对）
  // ------------------------------------------------------------------

  Widget _card({required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(children: children),
    );
  }

  Widget _cardTitle(String text) => Padding(
        padding: const EdgeInsets.fromLTRB(0, 12, 0, 4),
        child: Align(
          alignment: Alignment.centerLeft,
          child: Text(text,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textSecondary)),
        ),
      );

  Widget _row(String label, String value, {bool last = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: last
          ? null
          : const BoxDecoration(
              border:
                  Border(bottom: BorderSide(color: AppTheme.borderColor))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13, color: AppTheme.textSecondary)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary)),
          ),
        ],
      ),
    );
  }

  Widget _monoRow(String label, String value, {bool last = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: last
          ? null
          : const BoxDecoration(
              border:
                  Border(bottom: BorderSide(color: AppTheme.borderColor))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(label,
                style: const TextStyle(
                    fontSize: 13, color: AppTheme.textSecondary)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: AppTheme.textPrimary)),
          ),
        ],
      ),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton(
      {required this.label, required this.icon, required this.onPressed});

  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 18),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}

class _SecondaryButton extends StatelessWidget {
  const _SecondaryButton(
      {required this.label, required this.icon, required this.onPressed});

  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 18, color: AppTheme.primaryColor),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTheme.primaryColor,
          side: const BorderSide(color: AppTheme.primaryColor),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
