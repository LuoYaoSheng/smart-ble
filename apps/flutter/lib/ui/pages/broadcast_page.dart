import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_ble_peripheral/flutter_ble_peripheral.dart';
import '../../core/ble/ble_peripheral_manager.dart';
import '../../themes/app_theme.dart';

/// 广播状态提供者
final isAdvertisingProvider = StateProvider<bool>((ref) => false);

/// 广播页面
class BroadcastPage extends ConsumerStatefulWidget {
  const BroadcastPage({super.key});

  @override
  ConsumerState<BroadcastPage> createState() => _BroadcastPageState();
}

class _BroadcastPageState extends ConsumerState<BroadcastPage> {
  final TextEditingController _uuidController = TextEditingController(text: '0000FFF0-0000-1000-8000-00805F9B34FB');

  final BlePeripheralManager _peripheralManager = BlePeripheralManager();

  bool _isAdvertising = false;
  PeripheralState _peripheralState = PeripheralState.unknown;
  String? _errorMessage;
  StreamSubscription<PeripheralState>? _stateSubscription;

  @override
  void initState() {
    super.initState();
    _initializePeripheral();
  }

  Future<void> _initializePeripheral() async {
    if (!BlePeripheralManager.isSupported) {
      return;
    }

    // 初始化可能返回 false，但不影响功能，不显示错误
    await _peripheralManager.initialize();

    final stateStream = _peripheralManager.stateStream;
    if (stateStream != null) {
      _stateSubscription = stateStream.listen((state) {
        if (mounted) {
          setState(() {
            _peripheralState = state;
            _isAdvertising = state == PeripheralState.advertising;
            ref.read(isAdvertisingProvider.notifier).state = _isAdvertising;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _stateSubscription?.cancel();
    _uuidController.dispose();
    super.dispose();
  }

  /// 检查当前平台是否支持广播
  bool get _isAdvertisingSupported => BlePeripheralManager.isSupported;

  /// 是否为 Android 平台
  bool get _isAndroid => Platform.isAndroid;

  /// 获取设备名称显示文本
  String get _deviceNameText {
    if (_isAndroid) {
      return 'Android 设备 (显示实际蓝牙名称)';
    }
    if (Platform.isMacOS) {
      return 'BLE Toolkit+ (macOS)';
    }
    return 'BLE Toolkit+';
  }

  Future<void> _toggleAdvertising() async {
    if (_isAdvertising) {
      await _stopAdvertising();
    } else {
      await _startAdvertising();
    }
  }

  Future<void> _startAdvertising() async {
    final uuid = _uuidController.text.trim();

    if (uuid.isEmpty) {
      setState(() => _errorMessage = '请输入服务UUID');
      return;
    }

    if (!_isValidUuid(uuid)) {
      setState(() => _errorMessage = 'UUID 格式不正确');
      return;
    }

    setState(() => _errorMessage = null);

    try {
      final success = await _peripheralManager.startAdvertising(
        name: 'BLE Toolkit+', // 名称由系统处理
        serviceUuid: uuid,
      );

      if (mounted) {
        if (success) {
          setState(() => _isAdvertising = true);
          ref.read(isAdvertisingProvider.notifier).state = true;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(_isAndroid ? '开始广播（设备实际名称）' : '开始广播: BLE Toolkit+'),
              backgroundColor: AppTheme.successColor,
            ),
          );
        } else {
          setState(() => _errorMessage = '启动广播失败');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = '启动广播失败: $e');
      }
    }
  }

  Future<void> _stopAdvertising() async {
    try {
      await _peripheralManager.stopAdvertising();
      if (mounted) {
        setState(() => _isAdvertising = false);
        ref.read(isAdvertisingProvider.notifier).state = false;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已停止广播')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = '停止广播失败: $e');
      }
    }
  }

  bool _isValidUuid(String uuid) {
    final regex = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
    return regex.hasMatch(uuid);
  }

  @override
  Widget build(BuildContext context) {
    final isAdvertising = ref.watch(isAdvertisingProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('BLE 广播'),
      ),
      body: !_isAdvertisingSupported
          ? _buildUnsupportedView()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 状态卡片
                  _buildStatusCard(isAdvertising, _peripheralState),

                  const SizedBox(height: 16),

                  // 平台说明卡片
                  _buildPlatformWarningCard(),

                  const SizedBox(height: 16),

                  // 广播设置
                  _buildSettingsSection(isAdvertising),

                  const SizedBox(height: 16),

                  // 错误提示
                  if (_errorMessage != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.errorColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.errorColor.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppTheme.errorColor, size: 20),
                          const SizedBox(width: 8),
                          Expanded(child: Text(_errorMessage!, style: const TextStyle(color: AppTheme.errorColor))),
                        ],
                      ),
                    ),

                  // 测试指南
                  _buildTestGuide(),
                ],
              ),
            ),
    );
  }

  /// 构建平台警告卡片
  Widget _buildPlatformWarningCard() {
    final isAndroid = _isAndroid;
    final isMacOS = Platform.isMacOS;

    // 确定显示的图标和颜色
    IconData platformIcon;
    Color platformColor;
    String platformTitle;
    String platformMessage;

    if (isAndroid) {
      platformIcon = Icons.android;
      platformColor = const Color(0xFFFF9800);
      platformTitle = 'Android 平台说明';
      platformMessage = '广播将显示设备的实际蓝牙名称';
    } else if (isMacOS) {
      platformIcon = Icons.laptop_mac;
      platformColor = AppTheme.primaryColor;
      platformTitle = 'macOS 平台说明';
      platformMessage = '支持自定义广播名称';
    } else {
      platformIcon = Icons.phone_iphone;
      platformColor = AppTheme.primaryColor;
      platformTitle = 'iOS 平台说明';
      platformMessage = '支持自定义广播名称';
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isAndroid
              ? [const Color(0xFFFF9800).withValues(alpha: 0.15), const Color(0xFFFF9800).withValues(alpha: 0.05)]
              : [AppTheme.primaryColor.withValues(alpha: 0.1), AppTheme.primaryColor.withValues(alpha: 0.05)],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isAndroid ? const Color(0xFFFF9800).withValues(alpha: 0.3) : AppTheme.primaryColor.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            platformIcon,
            color: platformColor,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  platformTitle,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: platformColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  platformMessage,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 构建测试指南
  Widget _buildTestGuide() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.scanner, size: 18, color: Colors.blue),
              SizedBox(width: 8),
              Text(
                '如何测试',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.blue,
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Text(
            '1. 点击"开始广播"按钮\n'
            '2. 使用另一台设备打开 BLE 扫描功能\n'
            '3. 搜索包含 UUID "0000FFF0" 的设备\n'
            '4. 找到本设备后即可连接测试',
            style: TextStyle(
              fontSize: 12,
              height: 1.6,
              color: AppTheme.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  /// 构建平台不支持视图
  Widget _buildUnsupportedView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.warningColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.block,
                size: 40,
                color: AppTheme.warningColor,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              '功能不可用',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              '当前平台暂不支持 BLE 广播功能。\n\n'
              'flutter_ble_peripheral 库支持：Android、iOS、macOS。',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                height: 1.6,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(bool isAdvertising, PeripheralState state) {
    final statusText = _getStatusText(state);
    final isAdvertisingState = state == PeripheralState.advertising;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isAdvertisingState
              ? [AppTheme.successColor, const Color(0xFF30D158)]
              : [AppTheme.backgroundColor, AppTheme.backgroundColor],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isAdvertisingState ? Colors.transparent : AppTheme.borderColor,
        ),
        boxShadow: isAdvertisingState
            ? [
                BoxShadow(
                  color: AppTheme.successColor.withValues(alpha: 0.3),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: isAdvertisingState ? Colors.white : AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              isAdvertisingState ? Icons.broadcast_on_personal : Icons.broadcast_on_personal_outlined,
              size: 32,
              color: isAdvertisingState ? AppTheme.successColor : AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            statusText,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isAdvertisingState ? Colors.white : AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            isAdvertisingState ? '其他设备可以扫描到此设备' : '点击开始启动BLE广播',
            style: TextStyle(
              fontSize: 13,
              color: isAdvertisingState ? Colors.white.withValues(alpha: 0.9) : AppTheme.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  String _getStatusText(PeripheralState state) {
    switch (state) {
      case PeripheralState.advertising:
        return '正在广播';
      case PeripheralState.idle:
        return '未广播';
      case PeripheralState.unsupported:
        return '不支持';
      case PeripheralState.unknown:
      default:
        return '未广播';
    }
  }

  Widget _buildSettingsSection(bool isAdvertising) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '广播设置',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 16),

        // 设备名称 (只读显示)
        _buildReadOnlyField(
          label: '设备名称',
          value: _deviceNameText,
          icon: Icons.bluetooth,
          hint: _isAndroid ? '使用系统蓝牙名称' : '自定义名称',
        ),

        const SizedBox(height: 16),

        // 服务UUID
        _buildInputField(
          label: '服务UUID',
          controller: _uuidController,
          hint: '输入服务UUID (128位)',
          icon: Icons.fingerprint,
          enabled: !isAdvertising,
        ),

        const SizedBox(height: 24),

        // 开始/停止按钮
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _toggleAdvertising,
            icon: Icon(isAdvertising ? Icons.stop : Icons.play_arrow),
            label: Text(isAdvertising ? '停止广播' : '开始广播'),
            style: ElevatedButton.styleFrom(
              backgroundColor: isAdvertising ? AppTheme.errorColor : AppTheme.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              textStyle: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildReadOnlyField({
    required String label,
    required String value,
    required IconData icon,
    required String hint,
  }) {
    final isAndroid = _isAndroid;
    final isMacOS = Platform.isMacOS;

    // 确定平台标签
    String? platformLabel;
    Color? labelColor;

    if (isAndroid) {
      platformLabel = 'Android';
      labelColor = const Color(0xFFFF9800);
    } else if (isMacOS) {
      platformLabel = 'macOS';
      labelColor = AppTheme.primaryColor;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 18, color: AppTheme.primaryColor),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 8),
            if (platformLabel != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: labelColor!.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  platformLabel,
                  style: TextStyle(
                    fontSize: 10,
                    color: labelColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          enabled: false,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: AppTheme.textSecondary.withValues(alpha: 0.6),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppTheme.borderColor),
            ),
            filled: true,
            fillColor: AppTheme.backgroundColor,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
          controller: TextEditingController(text: value),
        ),
        if (isAndroid)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(
              hint,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFFFF9800),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required bool enabled,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 18, color: AppTheme.primaryColor),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          enabled: enabled,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              color: AppTheme.textSecondary.withValues(alpha: 0.6),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppTheme.borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppTheme.primaryColor),
            ),
            disabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(
                color: AppTheme.borderColor,
                width: 1,
              ),
            ),
            filled: !enabled,
            fillColor: AppTheme.backgroundColor,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),
      ],
    );
  }
}
