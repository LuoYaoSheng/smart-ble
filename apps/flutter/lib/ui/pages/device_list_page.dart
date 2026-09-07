import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../core/ble/ble_manager.dart';
import '../../core/models/ble_scan_result.dart';
import '../../themes/app_theme.dart';
import '../widgets/advertisement_sheet.dart';
import '../widgets/device_card.dart';
import '../widgets/filter_panel.dart';

import 'device_detail_page.dart';
import 'provisioning_page.dart';
import '../../core/design/app_icons.dart';
import '../../core/design/app_illustrations.dart';

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
  bool _hasScanned = false;
  StreamSubscription<bool>? _scanningSub;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // 以底层扫描态为唯一事实源（含 5s 超时自动停止），杜绝 UI 与真实扫描脱节
    _scanningSub = _bleManager.isScanningStream.listen((scanning) {
      if (!mounted) return;
      if (scanning) _hasScanned = true;
      ref.read(scanningProvider.notifier).state = scanning;
    });
    _initializeBle();
  }

  @override
  void dispose() {
    _scanningSub?.cancel();
    _bleManager.dispose();
    super.dispose();
  }

  Future<void> _initializeBle() async {
    try {
      if (Platform.isAndroid) {
        await [
          Permission.location,
          Permission.bluetoothScan,
          Permission.bluetoothConnect,
        ].request();
      }

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
      await _bleManager.startScan(timeout: const Duration(seconds: 5));
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
    final isScanning = ref.read(scanningProvider);
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
          !device.name
              .toLowerCase()
              .startsWith(filterNamePrefix.toLowerCase())) {
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
  Widget build(BuildContext context) {
    final bleState = ref.watch(bleStateProvider);
    final isScanning = ref.watch(scanningProvider);
    final filterExpanded = ref.watch(filterExpandedProvider);

    final devices =
        ref.watch(scanResultsProvider).valueOrNull ?? const <BleScanResult>[];
    final filteredDevices = _applyFilters(devices);

    return Scaffold(
      appBar: AppBar(
        title: const Text('BLE Toolkit+'),
        actions: [
          // 蓝牙状态指示器
          bleState.when(
            data: (state) => _buildStateIndicator(state),
            loading: () => const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2)),
            error: (_, __) => const AppIcon('x',
                color: AppTheme.errorColor),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Column(
        children: [
          // 键盘弹出/筛选展开压缩视口时固定区可内滚，杜绝底部溢出（WIN-FAND-001）
          Flexible(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // 错误提示
                  if (_errorMessage != null)
                    Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.errorColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                            color: AppTheme.errorColor.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const AppIcon('warn',
                              color: AppTheme.errorColor, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                              child: Text(_errorMessage!,
                                  style: const TextStyle(
                                      color: AppTheme.errorColor))),
                        ],
                      ),
                    ),

                  // 过滤面板
                  FilterPanel(
                    expanded: filterExpanded,
                    onToggleExpanded: () => ref
                        .read(filterExpandedProvider.notifier)
                        .state = !filterExpanded,
                  ),

                  // 扫描控制按钮（状态行口径对齐原型 p001 scantool）
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8, left: 2),
                          child: Text(
                            isScanning
                                ? '扫描中 · 5s 会话'
                                : _hasScanned
                                    ? '扫描完成 · 发现 ${filteredDevices.length} 台'
                                    : '待开始扫描',
                            style: const TextStyle(
                                fontSize: 13, color: AppTheme.textSecondary),
                          ),
                        ),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: _isInitialized ? _toggleScan : null,
                                icon: AppIcon(
                                    isScanning ? 'stop' : 'scan',
                                    size: 18),
                                label: Text(isScanning ? '停止扫描' : '开始扫描'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isScanning
                                      ? AppTheme.errorColor
                                      : AppTheme.primaryColor,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 20, vertical: 12),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            // 设备数量
                            _buildDeviceBadge(
                                filteredDevices.length, devices.length),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 设备列表
          Expanded(
            child: filteredDevices.isEmpty
                ? _buildEmptyState(devices.isNotEmpty)
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredDevices.length,
                    itemBuilder: (context, index) {
                      final device = filteredDevices[index];
                      return DeviceCard(
                        key: ValueKey(device.deviceId),
                        device: device,
                        isConnected:
                            _bleManager.isDeviceConnected(device.deviceId),
                        onConnect: () => _connectToDevice(device),
                        onShowInfo: () => _showAdvertisement(device),
                        onConfigure: () => _openProvisioning(device),
                      );
                    },
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
        color: AppTheme.primaryColor.withValues(alpha: 0.1),
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

  /// 空态文案+插图对齐原型 p001 C.empty（ill: radar 未扫描 / link 筛选无匹配）
  Widget _buildEmptyState(bool hasDevices) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AppIll(hasDevices ? 'link' : 'radar', width: 118),
          const SizedBox(height: 16),
          Text(
            hasDevices ? '当前没有匹配设备' : '还没有扫描结果',
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: Color(0xFF18222E),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            hasDevices ? '调整筛选条件试试' : '点上方按钮开始扫描附近 BLE 设备',
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.textSecondary,
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

  /// 广播数据弹窗（F004：设备 ID/名称/RSSI/profileMatch + UUID + AD 结构逐段）
  void _showAdvertisement(BleScanResult device) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) =>
          SingleChildScrollView(child: AdvertisementSheet(device: device)),
    );
  }

  /// Smart HID「配置」入口 → P002 配网向导（三阶段：连接确认/填写配置/下发状态）
  void _openProvisioning(BleScanResult device) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProvisioningPage(device: device),
      ),
    );
  }
}
