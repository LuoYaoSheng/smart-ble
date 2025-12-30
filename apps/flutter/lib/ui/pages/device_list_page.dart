import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/ble/ble_manager.dart';
import '../../core/models/ble_scan_result.dart';
import '../../themes/app_theme.dart';
import '../widgets/device_card.dart';
import '../widgets/filter_panel.dart';
import 'about_page.dart';
import 'device_detail_page.dart';

/// BLE 状态提供者
final bleStateProvider = StreamProvider<BleState>((ref) {
  return BleManager().stateStream;
});

/// 扫描结果提供者
final scanResultsProvider = StreamProvider<List<BleScanResult>>((ref) {
  return BleManager().scanResultsStream;
});

/// 是否正在扫描提供者
final scanningProvider = StateProvider<bool>((ref) => false);

/// 过滤条件提供者
final filterRssiProvider = StateProvider<int>((ref) => -100);
final filterNamePrefixProvider = StateProvider<String>((ref) => '');
final filterHideUnnamedProvider = StateProvider<bool>((ref) => false);
final filterExpandedProvider = StateProvider<bool>((ref) => false);

/// 设备列表页面
class DeviceListPage extends ConsumerStatefulWidget {
  const DeviceListPage({super.key});

  @override
  ConsumerState<DeviceListPage> createState() => _DeviceListPageState();
}

class _DeviceListPageState extends ConsumerState<DeviceListPage> {
  final BleManager _bleManager = BleManager();
  bool _isInitialized = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeBle();
  }

  Future<void> _initializeBle() async {
    try {
      final success = await _bleManager.initialize();
      if (mounted) {
        setState(() {
          _isInitialized = success;
          if (!success) {
            _errorMessage = '蓝牙不可用';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isInitialized = false;
          _errorMessage = '初始化失败: $e';
        });
      }
    }
  }

  Future<void> _startScan() async {
    try {
      setState(() => _errorMessage = null);
      ref.read(scanningProvider.notifier).state = true;
      await _bleManager.startScan(timeout: const Duration(seconds: 10));

      // 10秒后自动停止扫描
      Timer(const Duration(seconds: 10), () {
        if (mounted) {
          ref.read(scanningProvider.notifier).state = false;
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = '扫描失败: $e');
        ref.read(scanningProvider.notifier).state = false;
      }
    }
  }

  Future<void> _stopScan() async {
    await _bleManager.stopScan();
    ref.read(scanningProvider.notifier).state = false;
  }

  void _toggleScan() {
    final isScanning = ref.watch(scanningProvider);
    if (isScanning) {
      _stopScan();
    } else {
      _startScan();
    }
  }

  List<BleScanResult> _applyFilters(List<BleScanResult> devices) {
    final filterRssi = ref.watch(filterRssiProvider);
    final filterNamePrefix = ref.watch(filterNamePrefixProvider);
    final filterHideUnnamed = ref.watch(filterHideUnnamedProvider);

    return devices.where((device) {
      // RSSI 过滤（只有当阈值 > -100 时才过滤）
      if (filterRssi > -100 && device.rssi < filterRssi) {
        return false;
      }

      // 名称前缀过滤
      if (filterNamePrefix.isNotEmpty &&
          !device.name.toLowerCase().startsWith(filterNamePrefix.toLowerCase())) {
        return false;
      }

      // 隐藏无名设备
      if (filterHideUnnamed && device.name.isEmpty) {
        return false;
      }

      return true;
    }).toList()
      // 按信号强度排序（从强到弱）
      ..sort((a, b) => b.rssi.compareTo(a.rssi));
  }

  @override
  void dispose() {
    _bleManager.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bleState = ref.watch(bleStateProvider);
    final scanResults = ref.watch(scanResultsProvider);
    final isScanning = ref.watch(scanningProvider);
    final filterExpanded = ref.watch(filterExpandedProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart BLE'),
        actions: [
          // 蓝牙状态指示器
          bleState.when(
            data: (state) => _buildStateIndicator(state),
            loading: () => const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
            error: (_, __) => const Icon(Icons.bluetooth_disabled, color: AppTheme.errorColor),
          ),
          const SizedBox(width: 8),
          // 关于按钮
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const AboutPage()));
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // 错误提示
          if (_errorMessage != null)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.errorColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.errorColor.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: AppTheme.errorColor, size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_errorMessage!, style: const TextStyle(color: AppTheme.errorColor))),
                ],
              ),
            ),

          // 过滤面板
          FilterPanel(
            expanded: filterExpanded,
            onToggleExpanded: () => ref.read(filterExpandedProvider.notifier).state = !filterExpanded,
          ),

          // 扫描控制按钮
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isInitialized ? _toggleScan : null,
                    icon: Icon(isScanning ? Icons.stop : Icons.search, size: 18),
                    label: Text(isScanning ? '停止扫描' : '开始扫描'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isScanning ? AppTheme.errorColor : AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // 设备数量
                scanResults.when(
                  data: (devices) {
                    final filteredDevices = _applyFilters(devices);
                    return _buildDeviceBadge(filteredDevices.length, devices.length);
                  },
                  loading: () => _buildDeviceBadge(0, 0),
                  error: (_, __) => _buildDeviceBadge(0, 0),
                ),
              ],
            ),
          ),

          // 设备列表
          Expanded(
            child: scanResults.when(
              data: (devices) {
                final filteredDevices = _applyFilters(devices);
                if (filteredDevices.isEmpty) {
                  return _buildEmptyState(devices.isNotEmpty);
                }
                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filteredDevices.length,
                  itemBuilder: (context, index) {
                    final device = filteredDevices[index];
                    return DeviceCard(
                      key: ValueKey(device.deviceId),
                      device: device,
                      onConnect: () => _connectToDevice(device),
                      onShowInfo: () => _showDeviceInfo(device),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
                    const SizedBox(height: 16),
                    Text('扫描出错: $error'),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStateIndicator(BleState state) {
    Color color;
    String label;

    switch (state) {
      case BleState.on:
        color = AppTheme.successColor;
        label = '蓝牙已开启';
        break;
      case BleState.off:
        color = AppTheme.textSecondary;
        label = '蓝牙已关闭';
        break;
      case BleState.unavailable:
        color = AppTheme.errorColor;
        label = '蓝牙不可用';
        break;
      case BleState.unauthorized:
        color = AppTheme.warningColor;
        label = '未授权';
        break;
      default:
        color = AppTheme.textSecondary;
        label = '状态未知';
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildDeviceBadge(int filteredCount, int totalCount) {
    final text = filteredCount == totalCount
        ? '发现 $filteredCount 台设备'
        : '显示 $filteredCount / $totalCount 台';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: AppTheme.primaryColor,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool hasDevices) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            hasDevices ? Icons.filter_list_off : Icons.bluetooth_searching,
            size: 64,
            color: AppTheme.textSecondary.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            hasDevices ? '无匹配设备' : '暂无设备',
            style: TextStyle(
              fontSize: 18,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            hasDevices ? '尝试调整过滤条件' : '点击上方按钮开始扫描',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.textSecondary.withOpacity(0.7),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _connectToDevice(BleScanResult device) async {
    // 显示加载对话框
    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      await _bleManager.connect(device.deviceId);

      if (mounted) {
        Navigator.of(context).pop(); // 关闭加载对话框

        // 导航到设备详情页
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DeviceDetailPage(
              deviceId: device.deviceId,
              deviceName: device.displayName,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // 关闭加载对话框
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('连接失败: $e')),
        );
      }
    }
  }

  /// 显示设备信息对话框
  void _showDeviceInfo(BleScanResult device) {
    showDialog(
      context: context,
      builder: (context) => DeviceInfoDialog(device: device),
    );
  }
}

/// 设备信息对话框
class DeviceInfoDialog extends StatelessWidget {
  final BleScanResult device;

  const DeviceInfoDialog({super.key, required this.device});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          const Icon(Icons.info_outline, color: AppTheme.primaryColor),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              device.displayName,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildInfoRow('设备 ID', device.deviceId),
            _buildInfoRow('信号强度', '${device.rssi} dBm'),
            _buildInfoRow('发现时间', _formatTimestamp(device.timestamp)),
            if (device.serviceUuids.isNotEmpty)
              _buildInfoRow('服务 UUID', device.serviceUuids.join(', ')),
            if (device.advertisData != null && device.advertisData!.isNotEmpty)
              _buildAdvertisData(),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('关闭'),
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildAdvertisData() {
    final hexString = device.advertisData!
        .map((b) => b.toRadixString(16).padLeft(2, '0').toUpperCase())
        .join(' ');

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '广播数据',
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              hexString,
              style: const TextStyle(
                fontSize: 12,
                fontFamily: 'monospace',
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    return '${timestamp.hour.toString().padLeft(2, '0')}:'
        '${timestamp.minute.toString().padLeft(2, '0')}:'
        '${timestamp.second.toString().padLeft(2, '0')}';
  }
}
