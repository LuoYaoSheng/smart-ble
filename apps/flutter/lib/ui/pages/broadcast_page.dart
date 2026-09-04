import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_ble_peripheral/flutter_ble_peripheral.dart';
import '../../core/ble/ble_peripheral_manager.dart';
import '../../core/models/log_entry.dart';
import '../../core/utils/logger.dart';
import '../../themes/app_theme.dart';
import '../widgets/log_panel.dart';

/// 广播状态提供者
final isAdvertisingProvider = StateProvider<bool>((ref) => false);

/// 广播页 —— 对齐基准原型 p008：状态收进 AppBar 小徽章，主体为可操作表单
class BroadcastPage extends ConsumerStatefulWidget {
  const BroadcastPage({super.key});

  @override
  ConsumerState<BroadcastPage> createState() => _BroadcastPageState();
}

class _BroadcastPageState extends ConsumerState<BroadcastPage> {
  final TextEditingController _nameController =
      TextEditingController(text: 'BLE Toolkit+');
  final TextEditingController _uuidController =
      TextEditingController(text: 'FFF0');
  final TextEditingController _mfrIdController =
      TextEditingController(text: '0001');
  final TextEditingController _mfrDataController =
      TextEditingController(text: 'BLE');

  final BlePeripheralManager _peripheralManager = BlePeripheralManager();

  bool _isAdvertising = false;
  PeripheralState _peripheralState = PeripheralState.unknown;
  String? _errorMessage;
  bool _checked = false;
  bool _runtimeSupported = false;
  int _modeIndex = 1; // 0=低延迟 1=平衡 2=低功耗
  int _powerIndex = 3; // 0=超低 1=低 2=中 3=高
  StreamSubscription<PeripheralState>? _stateSubscription;
  StreamSubscription<LogEntry>? _logSubscription;

  static const _modeOptions = ['低延迟', '平衡', '低功耗'];
  static const _powerOptions = ['超低功率', '低功率', '中功率', '高功率'];

  bool get _platformSupported => BlePeripheralManager.isSupported;
  bool get _isAndroid => Platform.isAndroid;

  @override
  void initState() {
    super.initState();
    _initializePeripheral();
    _logSubscription = logger.logStream.listen((_) {
      if (mounted) setState(() {});
    });
  }

  Future<void> _initializePeripheral() async {
    if (!_platformSupported) return;

    final supported = await _peripheralManager.initialize();
    if (mounted && supported) {
      _checked = true;
      _runtimeSupported = true;
    }

    // 页面重建（PageView 切换）后状态字段归零，
    // 以底层真实广播态为准同步，避免 UI 与空口脱节
    try {
      final advertising = await _peripheralManager.isAdvertising;
      if (mounted && advertising) {
        setState(() {
          _isAdvertising = true;
          _peripheralState = PeripheralState.advertising;
          ref.read(isAdvertisingProvider.notifier).state = true;
        });
      }
    } catch (_) {}

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
    _logSubscription?.cancel();
    _nameController.dispose();
    _uuidController.dispose();
    _mfrIdController.dispose();
    _mfrDataController.dispose();
    super.dispose();
  }

  /// AppBar 状态小徽章文案与配色（对齐 p008 badge 口径）
  (String, Color) get _statusBadge {
    if (!_platformSupported) return ('不支持', AppTheme.textSecondary);
    if (_isAdvertising) return ('广播中', AppTheme.successColor);
    if (_errorMessage != null) return ('失败', AppTheme.errorColor);
    if (_checked &&
        _runtimeSupported &&
        _peripheralState == PeripheralState.idle) {
      return ('已停止', AppTheme.textSecondary);
    }
    if (_checked && _runtimeSupported) return ('已就绪', AppTheme.warningColor);
    return ('未就绪', AppTheme.textSecondary);
  }

  bool get _uuidInvalid {
    final v = _uuidController.text.trim();
    return v.isNotEmpty && BlePeripheralManager.normalizeServiceUuid(v) == null;
  }

  ({int name, int uuid, int mfr, int total}) get _bytes =>
      BlePeripheralManager.estimateAdvBytes(
        name: _nameController.text,
        serviceUuid: _uuidController.text,
        manufacturerId: _mfrIdController.text,
        manufacturerData: _mfrDataController.text,
        includeName: _isAndroid ? true : _nameController.text.isNotEmpty,
      );

  bool get _overBudget => _bytes.total > 31;

  Future<void> _toggleAdvertising() async {
    // 不信任页面内存状态：切换前查询底层真实广播态（防御 UI/空口脱节）
    try {
      final actuallyAdvertising = await _peripheralManager.isAdvertising;
      if (actuallyAdvertising != _isAdvertising) {
        setState(() => _isAdvertising = actuallyAdvertising);
        ref.read(isAdvertisingProvider.notifier).state = actuallyAdvertising;
      }
    } catch (_) {}
    if (_isAdvertising) {
      await _stopAdvertising();
    } else {
      await _startAdvertising();
    }
  }

  Future<void> _startAdvertising() async {
    final uuid = _uuidController.text.trim();
    if (uuid.isEmpty) {
      setState(() => _errorMessage = '请输入服务 UUID');
      return;
    }
    if (_uuidInvalid) {
      setState(() => _errorMessage = 'UUID 需为 4 / 8 / 36 位十六进制');
      return;
    }
    if (_overBudget) {
      setState(
          () => _errorMessage = '广播数据超限：当前 ${_bytes.total} 字节，BLE 最多支持 31 字节');
      return;
    }

    setState(() => _errorMessage = null);
    logger.info('开始广播…');

    try {
      final success = await _peripheralManager.startAdvertising(
        name: _nameController.text.isEmpty
            ? 'BLE Toolkit+'
            : _nameController.text,
        serviceUuid: uuid,
        manufacturerId: _mfrIdController.text,
        manufacturerData: _mfrDataController.text,
        includeDeviceName: true,
        connectable: true,
        advertiseMode: _modeIndex,
        txPowerIndex: _powerIndex,
      );

      if (!mounted) return;
      if (success) {
        setState(() => _isAdvertising = true);
        ref.read(isAdvertisingProvider.notifier).state = true;
        logger.success('广播已开始${_isAndroid ? '（名称用系统蓝牙名）' : ''}');
      } else {
        setState(() => _errorMessage = '启动广播失败');
        logger.error('启动广播失败');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = '启动广播失败: $e');
        logger.error('启动广播失败: $e');
      }
    }
  }

  Future<void> _stopAdvertising() async {
    try {
      await _peripheralManager.stopAdvertising();
      if (mounted) {
        setState(() => _isAdvertising = false);
        ref.read(isAdvertisingProvider.notifier).state = false;
        logger.info('已停止广播');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = '停止广播失败: $e');
        logger.error('停止广播失败: $e');
      }
    }
  }

  Future<void> _checkSupport() async {
    logger.info('检查广播支持…');
    final supported = await _peripheralManager.isPlatformSupported();
    if (!mounted) return;
    setState(() {
      _checked = true;
      _runtimeSupported = supported;
    });
    if (supported) {
      logger.success('设备支持低功耗蓝牙广播');
    } else {
      logger.error('设备不支持低功耗蓝牙广播');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('广播'),
        actions: [
          _buildStatusBadge(),
          const SizedBox(width: 16),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!_platformSupported)
              _buildNote(
                color: AppTheme.warningColor,
                title: '当前平台不支持 BLE 广播',
                message: '浏览器未提供外围模式 API，请使用 App（Android / iOS）。',
              ),
            _buildSettingsCard(),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              _buildNote(
                color: AppTheme.errorColor,
                title: '广播失败',
                message: _errorMessage!,
              ),
            ],
            const SizedBox(height: 16),
            // LogPanel 内部是 Expanded(ListView)，必须给有界高度，
            // 否则放进滚动视图后日志非空即抛无界高度异常
            SizedBox(
              height: 240,
              child: LogPanel(
                entries: logger.history,
                onClear: () {
                  logger.clear();
                  if (mounted) setState(() {});
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// AppBar 内的状态小徽章（p008：状态只占一枚 chip，不再做大卡片）
  Widget _buildStatusBadge() {
    final (text, color) = _statusBadge;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNote({
    required Color color,
    required String title,
    required String message,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: color)),
                const SizedBox(height: 3),
                Text(message,
                    style: const TextStyle(
                        fontSize: 12,
                        height: 1.5,
                        color: AppTheme.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsCard() {
    final dis = _isAdvertising;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildField(
            label: '设备名称',
            controller: _nameController,
            enabled: !dis,
            hint: '自定义名称',
            suffix: _isAndroid
                ? const Text('实际用系统蓝牙名',
                    style:
                        TextStyle(fontSize: 10, color: AppTheme.textSecondary))
                : null,
          ),
          const SizedBox(height: 14),
          _buildField(
            label: '服务 UUID',
            controller: _uuidController,
            enabled: !dis,
            hint: '4 / 8 / 36 位 HEX',
            mono: true,
            errorText: _uuidInvalid ? 'UUID 需为 4 / 8 / 36 位十六进制' : null,
          ),
          if (_isAndroid) ...[
            const SizedBox(height: 14),
            _buildPickerField(
              label: '广播模式',
              value: _modeOptions[_modeIndex],
              items: _modeOptions,
              onChanged: dis ? null : (i) => setState(() => _modeIndex = i),
            ),
            const SizedBox(height: 14),
            _buildPickerField(
              label: '发射功率',
              value: _powerOptions[_powerIndex],
              items: _powerOptions,
              onChanged: dis ? null : (i) => setState(() => _powerIndex = i),
            ),
          ],
          const SizedBox(height: 14),
          _buildField(
            label: '厂商 ID（HEX）',
            controller: _mfrIdController,
            enabled: !dis,
            hint: '0001',
            mono: true,
          ),
          const SizedBox(height: 14),
          _buildField(
            label: '厂商数据（ASCII）',
            controller: _mfrDataController,
            enabled: !dis,
            hint: '广播携带的数据',
          ),
          const SizedBox(height: 16),
          _buildByteBudget(),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed:
                      (_overBudget || _uuidInvalid) ? null : _toggleAdvertising,
                  icon: Icon(_isAdvertising ? Icons.stop : Icons.cast),
                  label: Text(_isAdvertising ? '停止广播' : '开始广播'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isAdvertising
                        ? AppTheme.errorColor
                        : AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor:
                        AppTheme.borderColor.withValues(alpha: 0.4),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    textStyle: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton.icon(
                onPressed: dis ? null : _checkSupport,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('检查支持'),
                style: OutlinedButton.styleFrom(
                  padding:
                      const EdgeInsets.symmetric(vertical: 13, horizontal: 14),
                  foregroundColor: AppTheme.primaryColor,
                  side: const BorderSide(color: AppTheme.borderColor),
                  textStyle: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// ADV 负载预算（对齐 p008 bytebar + budget：超限红显并拦截启动）
  Widget _buildByteBudget() {
    final b = _bytes;
    final over = b.total > 31;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: over
            ? AppTheme.errorColor.withValues(alpha: 0.06)
            : AppTheme.backgroundColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: over
                ? AppTheme.errorColor.withValues(alpha: 0.4)
                : AppTheme.borderColor),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Text('ADV 负载预算',
                  style:
                      TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
              const Spacer(),
              Text(
                '${b.total}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: over ? AppTheme.errorColor : AppTheme.textPrimary,
                ),
              ),
              const Text(' / 31 字节',
                  style:
                      TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
            ],
          ),
          const Divider(height: 14),
          _budgetRow('完整名称 (0x09)', '${b.name} B'),
          _budgetRow('服务 UUID (0x03/0x07)', '${b.uuid} B'),
          _budgetRow('厂商块 (0xFF)', '${b.mfr} B'),
          _budgetRow(
            over ? '合计 · 超限，启动将被拦截' : '合计',
            '${b.total} / 31 B',
            bold: true,
            over: over,
          ),
        ],
      ),
    );
  }

  Widget _budgetRow(String label, String value,
      {bool bold = false, bool over = false}) {
    final color = over ? AppTheme.errorColor : AppTheme.textSecondary;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: over ? color : AppTheme.textSecondary,
                  fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
          Text(value,
              style: TextStyle(
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: color,
                  fontWeight: bold ? FontWeight.w700 : FontWeight.w400)),
        ],
      ),
    );
  }

  Widget _buildField({
    required String label,
    required TextEditingController controller,
    required bool enabled,
    required String hint,
    bool mono = false,
    String? errorText,
    Widget? suffix,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(label,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary)),
            const Spacer(),
            if (suffix != null) suffix,
          ],
        ),
        const SizedBox(height: 7),
        TextField(
          controller: controller,
          enabled: enabled,
          onChanged: (_) => setState(() {}),
          style: TextStyle(
              fontSize: 14,
              fontFamily: mono ? 'monospace' : null,
              color: AppTheme.textPrimary),
          inputFormatters: mono
              ? [FilteringTextInputFormatter.allow(RegExp(r'[0-9a-fA-F-]'))]
              : null,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
                fontSize: 13,
                color: AppTheme.textSecondary.withValues(alpha: 0.6)),
            isDense: true,
            errorText: errorText,
            filled: !enabled,
            fillColor: AppTheme.backgroundColor,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.borderColor)),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.borderColor)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.primaryColor)),
            disabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppTheme.borderColor)),
          ),
        ),
      ],
    );
  }

  Widget _buildPickerField({
    required String label,
    required String value,
    required List<String> items,
    required ValueChanged<int>? onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary)),
        const SizedBox(height: 7),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.borderColor),
            color: AppTheme.backgroundColor,
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: items.indexOf(value),
              isExpanded: true,
              borderRadius: BorderRadius.circular(10),
              items: items
                  .asMap()
                  .entries
                  .map((e) => DropdownMenuItem(
                      value: e.key,
                      child:
                          Text(e.value, style: const TextStyle(fontSize: 14))))
                  .toList(),
              onChanged: onChanged == null
                  ? null
                  : (i) {
                      if (i != null) onChanged(i);
                    },
            ),
          ),
        ),
      ],
    );
  }
}
