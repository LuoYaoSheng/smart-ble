import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/ble/ble_manager.dart';
import '../../core/models/ble_scan_result.dart';
import '../../themes/app_theme.dart';
import '../widgets/device_card.dart';
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart BLE'),
        actions: [
          // 蓝牙状态指示器
          bleState.when(
            data: (state) => _buildStateIndicator(state),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => const Icon(Icons.bluetooth_disabled, color: AppTheme.errorColor),
          ),
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

          // 扫描控制按钮
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isInitialized ? _toggleScan : null,
                    icon: Icon(isScanning ? Icons.stop : Icons.search),
                    label: Text(isScanning ? '停止扫描' : '开始扫描'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isScanning ? AppTheme.errorColor : AppTheme.primaryColor,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // 设备数量
                scanResults.when(
                  data: (devices) => _buildDeviceBadge(devices.length),
                  loading: () => _buildDeviceBadge(0),
                  error: (_, __) => _buildDeviceBadge(0),
                ),
              ],
            ),
          ),

          // 设备列表
          Expanded(
            child: scanResults.when(
              data: (devices) {
                if (devices.isEmpty) {
                  return _buildEmptyState();
                }
                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: devices.length,
                  itemBuilder: (context, index) {
                    final device = devices[index];
                    return DeviceCard(
                      device: device,
                      onTap: () => _connectToDevice(device),
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

  Widget _buildDeviceBadge(int count) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        '发现 $count 台设备',
        style: const TextStyle(
          color: AppTheme.primaryColor,
          fontSize: 14,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.bluetooth_searching, size: 64, color: AppTheme.textSecondary.withOpacity(0.5)),
          const SizedBox(height: 16),
          Text(
            '暂无设备',
            style: TextStyle(
              fontSize: 18,
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '点击上方按钮开始扫描',
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
}
