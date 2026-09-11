import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../core/ble/ble_manager.dart';
import '../../core/ble/profile_registry.dart';
import '../../core/models/ble_scan_result.dart';
import '../../themes/app_theme.dart';
import '../widgets/advertisement_sheet.dart';
import '../widgets/device_card.dart';
import '../widgets/filter_panel.dart';

import 'device_detail_page.dart';
import 'provisioning_page.dart';
import '../../core/design/app_icons.dart';
// UI-PARITY-G0：P001 改挂正典组件层 lib/ui/design/（COMPONENT_CONTRACT）
import '../design/app_tokens.dart';
import '../design/app_navbar.dart';
import '../design/app_button.dart';
import '../design/app_chip.dart';
import '../design/app_empty.dart';

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

  /// 蓝牙状态三态词（正典 p001 btWord）：on 就绪 / off+未授权 未开启 / 其余 平台不支持
  static String btStatusWord(BleState? state) {
    switch (state) {
      case BleState.on:
        return '蓝牙就绪';
      case BleState.off:
      case BleState.unauthorized:
        return '蓝牙未开启';
      default:
        return '平台不支持';
    }
  }

  /// 状态点三态（正典 .bt-dot → AppNavbar statusTone）：on 绿 / off 红 / 其余灰
  static BtStatusTone? btStatusTone(BleState? state) {
    switch (state) {
      case BleState.on:
        return BtStatusTone.on;
      case BleState.off:
      case BleState.unauthorized:
        return BtStatusTone.off;
      default:
        return null;
    }
  }

  @override
  ConsumerState<DeviceListPage> createState() => _DeviceListPageState();
}

class _DeviceListPageState extends ConsumerState<DeviceListPage> {
  final BleManager _bleManager = BleManager();
  bool _isInitialized = false;
  bool _hasScanned = false;
  StreamSubscription<bool>? _scanningSub;
  String? _errorCode;
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
            _errorCode = 'BLE_001';
            _errorMessage = '蓝牙不可用';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isInitialized = false;
          _errorCode = 'BLE_001';
          _errorMessage = '初始化失败: $e';
        });
      }
    }
  }

  Future<void> _startScan() async {
    try {
      setState(() {
        _errorCode = null;
        _errorMessage = null;
      });
      await _bleManager.startScan(timeout: const Duration(seconds: 5));
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorCode = 'BLE_003';
          _errorMessage = '扫描失败: $e';
        });
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
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 自绘导航栏（正典 .navbar：kicker + 标题 + bt-chip 三态）
            _buildNavbar(bleState),

            // 键盘弹出/筛选展开压缩视口时固定区可内滚，杜绝底部溢出（WIN-FAND-001）
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 扫描失败横幅（正典 B8 ebanner）
                    if (_errorMessage != null)
                      _buildErrorBanner(),

                    // 扫描工具条（正典 .scantool：左状态标签 + 右按钮）
                    _buildScanTool(isScanning, filteredDevices.length),

                    // 附近设备面板头（正典 .sec-t：chip 图标 + 标题 + 计数 + 筛选 txtlink）
                    _buildSectionHeader(filteredDevices.length, filterExpanded),

                    // 过滤行（展开时，正典 .filter）
                    if (filterExpanded) const FilterPanel(),
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
      ),
    );
  }

  /// 自绘导航栏 → 正典组件 AppNavbar（kicker「BLE TOOLKIT+」+ 标题 + 蓝牙三态 chip）
  Widget _buildNavbar(AsyncValue<BleState> bleState) {
    final state = bleState.valueOrNull;
    return AppNavbar(
      title: '扫描',
      statusText: DeviceListPage.btStatusWord(state),
      statusTone: DeviceListPage.btStatusTone(state),
    );
  }

  /// 扫描失败横幅（正典 B8：danger-weak 底 + 左侧 3px danger 边 + code chip + 重试）
  Widget _buildErrorBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 14, 16, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTokens.cDangerWeak,
        borderRadius: BorderRadius.circular(12),
        border: const Border(
          left: BorderSide(color: AppTokens.cDanger, width: 3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AppIcon('warn', size: 16, color: AppTokens.cDanger),
              const SizedBox(width: 6),
              const Text(
                '扫描失败',
                style: TextStyle(
                  fontSize: AppTokens.fsH2,
                  fontWeight: AppTokens.fsH2W,
                  color: AppTokens.cDanger,
                ),
              ),
              if (_errorCode != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
                  decoration: BoxDecoration(
                    color: AppTokens.cCard,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _errorCode!,
                    style: const TextStyle(
                      fontSize: AppTokens.fsMicro,
                      fontFamily: AppTokens.fontMono,
                      color: AppTokens.cDanger,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 5),
          Text(
            _errorMessage ?? '',
            style: const TextStyle(fontSize: AppTokens.fsBody + 1, color: AppTokens.cSub),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _startScan,
            icon: const AppIcon('refresh', size: 14, color: AppTokens.cDanger),
            label: const Text('重试',
                style: TextStyle(fontSize: AppTokens.fsBody, color: AppTokens.cDanger)),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 32),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              side: const BorderSide(color: AppTokens.cDanger),
              foregroundColor: AppTokens.cDanger,
            ),
          ),
        ],
      ),
    );
  }

  /// 扫描工具条（正典 .scantool：左状态标签三态 + 右按钮，状态行带脉冲点）
  Widget _buildScanTool(bool isScanning, int shownCount) {
    final label = isScanning
        ? '扫描中 · 5s 会话'
        : _hasScanned
            ? '扫描完成 · 发现 $shownCount 台'
            : '待开始扫描';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                if (isScanning) ...[
                  const _PulseDot(),
                  const SizedBox(width: 6),
                ],
                Flexible(
                  child: Text(
                    label,
                    style: const TextStyle(
                        fontSize: 13, color: AppTheme.textSecondary),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          AppButton(
            label: isScanning ? '停止扫描' : '开始扫描',
            tone: isScanning ? AppButtonTone.danger : AppButtonTone.primary,
            icon: isScanning ? 'stop' : 'scan',
            disabled: !_isInitialized,
            onTap: _toggleScan,
          ),
        ],
      ),
    );
  }

  /// 附近设备面板头（正典 .sec-t：chip 图标 + 标题 + 中性计数 chip + 筛选 txtlink）
  Widget _buildSectionHeader(int shownCount, bool filterExpanded) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
      child: Row(
        children: [
          const AppIcon('chip', size: 16, color: AppTheme.primaryColor),
          const SizedBox(width: 6),
          const Text(
            '附近设备',
            style: TextStyle(
              fontSize: AppTokens.fsH2,
              fontWeight: AppTokens.fsH2W,
              color: AppTokens.cText,
            ),
          ),
          if (shownCount > 0) ...[
            const SizedBox(width: 6),
            AppChip('$shownCount', tone: AppChipTone.neutral),
          ],
          const Spacer(),
          TextButton(
            onPressed: () => ref
                .read(filterExpandedProvider.notifier)
                .state = !filterExpanded,
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.primaryColor,
              minimumSize: const Size(0, 32),
              padding: const EdgeInsets.symmetric(horizontal: 4),
              textStyle: const TextStyle(fontSize: 13),
            ),
            child: Text(filterExpanded ? '收起筛选' : '筛选'),
          ),
        ],
      ),
    );
  }

  /// 空态 → 正典组件 AppEmpty（ill: radar 未扫描 / link 筛选无匹配；动作仅未扫描时）
  Widget _buildEmptyState(bool hasDevices) {
    final filteredMiss = hasDevices && _hasScanned;
    return Center(
      child: SingleChildScrollView(
        child: AppEmpty(
          ill: filteredMiss ? 'link' : 'radar',
          title: filteredMiss ? '当前没有匹配设备' : '还没有扫描结果',
          description: filteredMiss ? '调整筛选条件试试' : '点上方按钮开始扫描附近 BLE 设备',
          actionLabel: !_hasScanned ? '开始扫描' : null,
          actionIcon: 'scan',
          onAction: _isInitialized ? _startScan : null,
        ),
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
    // Profile 分流（对齐 uniapp buildProfileActionUrl）：Smart HID 进配网向导，
    // 其余命中 Profile（如 ESP32 演示，GATT 调试型）直达通用 GATT 详情。
    final match = matchProfile(device);
    if (match != null && match.profile.id != 'smart-hid') {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => DeviceDetailPage(
            deviceId: device.deviceId,
            deviceName: device.displayName,
          ),
        ),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ProvisioningPage(device: device),
      ),
    );
  }
}

/// 扫描中脉冲点（正典 .live：6px 主色圆点 1s 呼吸；仅扫描态挂载）
class _PulseDot extends StatefulWidget {
  const _PulseDot();

  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        vsync: this, duration: const Duration(seconds: 1))
      ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: Tween<double>(begin: 1, end: 0.25).animate(_controller),
      child: Container(
        width: 6,
        height: 6,
        decoration: const BoxDecoration(
          color: AppTokens.cPrimary,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
