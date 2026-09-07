import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../../core/ble/ble_manager.dart';
import '../../themes/app_theme.dart';
import 'device_detail_page.dart';
import '../../core/design/app_icons.dart';
import '../../core/design/app_illustrations.dart';

/// 已连接设备列表页
///
/// 展示所有当前已连接的 BLE 设备，点击进入该设备的详情页。
class ConnectedDevicesPage extends ConsumerStatefulWidget {
  const ConnectedDevicesPage({super.key});

  @override
  ConsumerState<ConnectedDevicesPage> createState() =>
      _ConnectedDevicesPageState();
}

class _ConnectedDevicesPageState extends ConsumerState<ConnectedDevicesPage> {
  final BleManager _bleManager = BleManager();
  Map<String, BluetoothConnectionState> _connectionStates = {};
  StreamSubscription? _statesSub;

  @override
  void initState() {
    super.initState();
    _connectionStates = Map.from({
      for (final id in _bleManager.connectedDeviceIds)
        id: BluetoothConnectionState.connected
    });

    _statesSub = _bleManager.connectionStatesStream.listen((states) {
      if (mounted) {
        setState(() => _connectionStates = states);
      }
    });
  }

  @override
  void dispose() {
    _statesSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final connectedIds = _connectionStates.entries
        .where((e) => e.value == BluetoothConnectionState.connected)
        .map((e) => e.key)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('已连接设备'),
        elevation: 0,
        actions: [
          if (connectedIds.length > 1)
            TextButton.icon(
              onPressed: _disconnectAll,
              icon: const AppIcon('x', size: 18),
              label: const Text('全部断开'),
              style: TextButton.styleFrom(
                foregroundColor: AppTheme.errorColor,
              ),
            ),
        ],
      ),
      body: connectedIds.isEmpty ? _buildEmptyState() : _buildDeviceList(connectedIds),
    );
  }

  /// 空态对齐原型 p007 C.empty（ill: link）
  Widget _buildEmptyState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AppIll('link', width: 118),
          SizedBox(height: 16),
          Text(
            '还没有连接中的设备',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: Color(0xFF18222E),
            ),
          ),
          SizedBox(height: 6),
          Text(
            '先在「扫描」页找到设备并连接，会话将保存在这里',
            style: TextStyle(
              fontSize: 13,
              color: AppTheme.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceList(List<String> connectedIds) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: connectedIds.length,
      itemBuilder: (context, index) {
        final deviceId = connectedIds[index];
        final services = _bleManager.servicesFor(deviceId);
        final serviceCount = services.length;

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppTheme.borderColor),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => _openDeviceDetail(deviceId),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // 连接状态指示
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppTheme.successColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const AppIcon(
                      'link',
                      color: AppTheme.successColor,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),

                  // 设备信息
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _getDeviceName(deviceId),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          deviceId.length > 20
                              ? '${deviceId.substring(0, 20)}...'
                              : deviceId,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        if (serviceCount > 0)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              '$serviceCount 个服务',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.primaryColor.withValues(alpha: 0.8),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),

                  // 操作按钮
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // 断开
                      IconButton(
                        onPressed: () => _disconnectDevice(deviceId),
                        icon: const AppIcon('x'),
                        color: AppTheme.errorColor,
                        iconSize: 20,
                        tooltip: '断开',
                      ),
                      // 箭头
                      const AppIcon(
                        'chev-r',
                        color: AppTheme.textSecondary,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  String _getDeviceName(String deviceId) {
    // 尝试从 BLE 库获取名称
    try {
      final device = BluetoothDevice.fromId(deviceId);
      final name = device.platformName;
      if (name.isNotEmpty) return name;
    } catch (_) {}
    return '未知设备';
  }

  void _openDeviceDetail(String deviceId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => DeviceDetailPage(
          deviceId: deviceId,
          deviceName: _getDeviceName(deviceId),
        ),
      ),
    );
  }

  Future<void> _disconnectDevice(String deviceId) async {
    await _bleManager.disconnect(deviceId);
  }

  Future<void> _disconnectAll() async {
    await _bleManager.disconnectAll();
  }
}
