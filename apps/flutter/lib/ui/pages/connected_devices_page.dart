import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/ble/ble_manager.dart';
import '../../themes/app_theme.dart';
import 'device_detail_page.dart';

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
  Map<String, BleConnectionState> _connectionStates = {};
  StreamSubscription? _statesSub;

  @override
  void initState() {
    super.initState();
    _connectionStates = Map.from({
      for (final id in _bleManager.connectedDeviceIds)
        id: BleConnectionState.connected
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
        .where((e) => e.value == BleConnectionState.connected)
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
              icon: const Icon(Icons.bluetooth_disabled, size: 18),
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

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.bluetooth_disabled,
            size: 64,
            color: AppTheme.textSecondary.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          const Text(
            '暂无已连接设备',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '在扫描页面点击设备进行连接',
            style: TextStyle(
              fontSize: 14,
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
                    child: const Icon(
                      Icons.bluetooth_connected,
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
                        icon: const Icon(Icons.link_off),
                        color: AppTheme.errorColor,
                        iconSize: 20,
                        tooltip: '断开',
                      ),
                      // 箭头
                      const Icon(
                        Icons.chevron_right,
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
    return '未知设备'; // Removed flutter blue plus dependency here. BleManager already caches names in scanResults.
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
