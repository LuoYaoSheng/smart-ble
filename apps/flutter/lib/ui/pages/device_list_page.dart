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

  /// 状态点三态色（正典 .bt-dot）：on 成功绿 / off 危险红 / 其余默认灰
  static Color btDotColor(BleState? state) {
    switch (state) {
      case BleState.on:
        return const Color(0xFF17C7A8);
      case BleState.off:
      case BleState.unauthorized:
        return const Color(0xFFF2555F);
      default:
        return const Color(0xFF9AA8B6);
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

  /// 自绘导航栏：kicker「BLE TOOLKIT+」+ 标题「扫描」+ 蓝牙状态 chip（dot+三态词）
  Widget _buildNavbar(AsyncValue<BleState> bleState) {
    final state = bleState.valueOrNull;
    final word = DeviceListPage.btStatusWord(state);
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 8, 18, 12),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFFFFF), Color(0xFFF8FBFF)],
        ),
        border: Border(bottom: BorderSide(color: Color(0xFFEDF2F9))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'BLE TOOLKIT+',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              const Text(
                '扫描',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF18222E),
                ),
              ),
              const Spacer(),
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: DeviceListPage.btDotColor(state),
                  shape: BoxShape.circle,
                  boxShadow: state == BleState.on
                      ? const [
                          BoxShadow(
                              color: Color(0x8C17C7A8), blurRadius: 8),
                        ]
                      : null,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                word,
                style: const TextStyle(
                    fontSize: 11, fontWeight: FontWeight.w500,
                    color: Color(0xFF60758D)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 扫描失败横幅（正典 B8：danger-weak 底 + 左侧 3px danger 边 + code chip + 重试）
  Widget _buildErrorBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 14, 16, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFDEBEC),
        borderRadius: BorderRadius.circular(12),
        border: const Border(
          left: BorderSide(color: Color(0xFFF2555F), width: 3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const AppIcon('warn', size: 16, color: Color(0xFFF2555F)),
              const SizedBox(width: 6),
              const Text(
                '扫描失败',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFFF2555F),
                ),
              ),
              if (_errorCode != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _errorCode!,
                    style: const TextStyle(
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: Color(0xFFF2555F),
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 5),
          Text(
            _errorMessage ?? '',
            style: const TextStyle(fontSize: 14, color: Color(0xFF42536A)),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _startScan,
            icon: const AppIcon('refresh', size: 14, color: Color(0xFFF2555F)),
            label: const Text('重试',
                style: TextStyle(fontSize: 13, color: Color(0xFFF2555F))),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 32),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              side: const BorderSide(color: Color(0xFFF2555F)),
              foregroundColor: const Color(0xFFF2555F),
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
          ElevatedButton.icon(
            onPressed: _isInitialized ? _toggleScan : null,
            icon: AppIcon(isScanning ? 'stop' : 'scan', size: 18,
                color: Colors.white),
            label: Text(isScanning ? '停止扫描' : '开始扫描'),
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  isScanning ? AppTheme.errorColor : AppTheme.primaryColor,
              foregroundColor: Colors.white,
              disabledBackgroundColor:
                  const Color(0xFFF1F5FB),
              disabledForegroundColor: const Color(0xFF9AA8B6),
              minimumSize: const Size(0, 40),
              padding: const EdgeInsets.symmetric(horizontal: 20),
              textStyle: const TextStyle(fontSize: 14),
            ),
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
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Color(0xFF18222E),
            ),
          ),
          if (shownCount > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5FB),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '$shownCount',
                style: const TextStyle(
                    fontSize: 11, color: Color(0xFF42536A)),
              ),
            ),
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

  /// 空态文案+插图+动作对齐原型 p001 C.empty（ill: radar 未扫描 / link 筛选无匹配；
  /// 动作按钮仅在未扫描时出现，soft 色调 + scan 图标）
  Widget _buildEmptyState(bool hasDevices) {
    final filteredMiss = hasDevices && _hasScanned;
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AppIll(filteredMiss ? 'link' : 'radar', width: 118),
          const SizedBox(height: 16),
          Text(
            filteredMiss ? '当前没有匹配设备' : '还没有扫描结果',
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: Color(0xFF18222E),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            filteredMiss ? '调整筛选条件试试' : '点上方按钮开始扫描附近 BLE 设备',
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.textSecondary,
            ),
          ),
          if (!_hasScanned) ...[
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _isInitialized ? _startScan : null,
              icon: const AppIcon('scan', size: 16, color: Color(0xFF18222E)),
              label: const Text('开始扫描',
                  style: TextStyle(
                      fontSize: 13, color: Color(0xFF18222E))),
              style: OutlinedButton.styleFrom(
                backgroundColor: const Color(0xFFF1F5FB),
                side: const BorderSide(color: Color(0xFFE3EAF3)),
                foregroundColor: const Color(0xFF18222E),
                minimumSize: const Size(0, 40),
                padding: const EdgeInsets.symmetric(horizontal: 20),
              ),
            ),
          ],
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
          color: AppTheme.primaryColor,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
