import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../../core/ble/ble_manager.dart';
import '../../core/ble/command_queue.dart';
import '../../core/models/ble_service.dart';
import '../../core/models/log_entry.dart';
import '../../themes/app_theme.dart';
import '../widgets/service_tile.dart';
import '../widgets/log_panel.dart';
import '../widgets/ota_dialog.dart';
import '../widgets/write_dialog.dart';
import '../widgets/service_list.dart';

/// 设备详情页
class DeviceDetailPage extends ConsumerStatefulWidget {
  final String deviceId;
  final String deviceName;

  const DeviceDetailPage({
    super.key,
    required this.deviceId,
    required this.deviceName,
  });

  @override
  ConsumerState<DeviceDetailPage> createState() => _DeviceDetailPageState();
}

class _DeviceDetailPageState extends ConsumerState<DeviceDetailPage> {
  final BleManager _bleManager = BleManager();
  final List<BleService> _services = [];
  final List<LogEntry> _logs = [];
  bool _isLoading = true;
  bool _isConnected = false;
  bool _isReconnecting = false;
  String? _errorMessage;
  StreamSubscription? _connectionStatesSub;
  late CommandQueue _commandQueue;

  bool get _hasOtaService => _services.any((s) => s.uuid.toLowerCase() == '4fafc201-1fb5-459e-8fcc-c5c9c331914d');

  @override
  void initState() {
    super.initState();
    // 初始化指令队列
    _commandQueue = CommandQueue(
      sender: (cmd) => _bleManager.writeCharacteristic(
        deviceId: cmd.deviceId,
        serviceUuid: cmd.serviceUuid,
        characteristicUuid: cmd.characteristicUuid,
        data: cmd.data,
        withoutResponse: cmd.withoutResponse,
      ),
      intervalMs: 50,
      onCommandStart: (cmd) {
        _addLog('发送: ${cmd.displayHex}', LogType.info);
      },
      onCommandComplete: (cmd) {
        _addLog('发送成功', LogType.success);
      },
      onCommandError: (cmd) {
        _addLog('发送失败: ${cmd.error}', LogType.error);
      },
      onQueueEmpty: () {
        if (mounted) {
          _addLog('指令队列完成', LogType.success);
          setState(() {});
        }
      },
      onQueueStateChanged: () {
        if (mounted) setState(() {});
      },
    );
    _listenConnectionState();
    _checkConnectionAndDiscoverServices();
  }

  /// 监听连接状态变化
  void _listenConnectionState() {
    _connectionStatesSub =
        _bleManager.connectionStatesStream.listen((states) {
      if (!mounted) return;

      final state = states[widget.deviceId];
      final connected = state == BluetoothConnectionState.connected;
      final reconnecting = !connected &&
          !_bleManager.isDeviceConnected(widget.deviceId) &&
          _isConnected; // 之前是连接状态，现在断开了 → 可能在重连

      setState(() {
        _isConnected = connected;
        _isReconnecting = reconnecting;
      });

      if (state == BluetoothConnectionState.disconnected && !_isReconnecting) {
        _addLog('连接已断开', LogType.error);
      }
    });
  }

  Future<void> _checkConnectionAndDiscoverServices() async {
    try {
      setState(() => _isLoading = true);

      // 发现服务
      final services = await _bleManager.discoverServices(widget.deviceId);

      if (mounted) {
        setState(() {
          _services.clear();
          _services.addAll(services);
          _isConnected = true;
          _isLoading = false;
        });
        _addLog('发现 ${services.length} 个服务', LogType.info);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isConnected = false;
          _errorMessage = '发现服务失败: $e';
        });
        _addLog('发现服务失败: $e', LogType.error);
      }
    }
  }

  void _addLog(String message, LogType type) {
    setState(() {
      _logs.add(LogEntry(
        message: message,
        type: type,
        timestamp: DateTime.now(),
      ));
    });
  }

  Future<void> _disconnect() async {
    try {
      await _bleManager.disconnect(widget.deviceId);
      if (mounted) {
        setState(() => _isConnected = false);
        _addLog('已断开连接', LogType.info);
        Navigator.of(context).pop();
      }
    } catch (e) {
      _addLog('断开连接失败: $e', LogType.error);
    }
  }

  Future<void> _readCharacteristic(BleService service, BleCharacteristic characteristic) async {
    try {
      _addLog('读取 ${characteristic.displayName}...', LogType.info);

      final value = await _bleManager.readCharacteristic(
        deviceId: widget.deviceId,
        serviceUuid: service.uuid,
        characteristicUuid: characteristic.uuid,
      );

      final hex = value.map((b) => b.toRadixString(16).padLeft(2, '0').toUpperCase()).join(' ');
      // T03: 统一 HEX + TEXT 双格式
      final text = _tryDecodeUtf8(value);
      _addLog('HEX: $hex\nTEXT: $text', LogType.success);

      // 更新特征值
      _updateCharacteristicValue(service.uuid, characteristic.uuid, value);
    } catch (e) {
      _addLog('读取失败: $e', LogType.error);
    }
  }

  void _updateCharacteristicValue(String serviceUuid, String characteristicUuid, List<int> value) {
    setState(() {
      final serviceIndex = _services.indexWhere((s) => s.uuid == serviceUuid);
      if (serviceIndex >= 0) {
        final charIndex = _services[serviceIndex].characteristics
            .indexWhere((c) => c.uuid == characteristicUuid);
        if (charIndex >= 0) {
          _services[serviceIndex] = _services[serviceIndex].copyWith(
            characteristics: List<BleCharacteristic>.from(
              _services[serviceIndex].characteristics
            )..[charIndex] = _services[serviceIndex].characteristics[charIndex].copyWith(value: value),
          );
        }
      }
    });
  }

  Future<void> _writeCharacteristic(BleService service, BleCharacteristic characteristic) async {
    final controller = TextEditingController();

    if (!mounted) return;

    final result = await showDialog<WriteResult>(
      context: context,
      builder: (context) => WriteDataDialog(
        characteristic: characteristic,
        controller: controller,
      ),
    );

    if (result == null || result.data.isEmpty) return;

    try {
      switch (result.sendMode) {
        case SendMode.single:
          // 单次发送
          final bytes = result.isHexMode
              ? _hexToBytes(result.data)
              : result.data.codeUnits;

          _addLog('写入 ${characteristic.displayName}: ${result.data}', LogType.info);

          await _bleManager.writeCharacteristic(
            deviceId: widget.deviceId,
            serviceUuid: service.uuid,
            characteristicUuid: characteristic.uuid,
            data: bytes,
            withoutResponse: !characteristic.properties.contains(BleCharacteristicProperty.write),
          );

          _addLog('写入成功', LogType.success);
          break;

        case SendMode.batch:
          // 批量发送: 每行一条指令
          final lines = result.data.split('\n')
              .map((l) => l.trim())
              .where((l) => l.isNotEmpty)
              .toList();

          _addLog('批量发送 ${lines.length} 条指令...', LogType.info);

          final commands = lines.asMap().entries.map((entry) {
            final bytes = result.isHexMode
                ? _hexToBytes(entry.value)
                : entry.value.codeUnits;
            return CommandItem(
              id: 'batch_${DateTime.now().millisecondsSinceEpoch}_${entry.key}',
              deviceId: widget.deviceId,
              serviceUuid: service.uuid,
              characteristicUuid: characteristic.uuid,
              data: bytes,
              withoutResponse: !characteristic.properties.contains(BleCharacteristicProperty.write),
              displayHex: result.isHexMode ? entry.value : CommandQueue.formatHex(bytes),
            );
          }).toList();

          _commandQueue.intervalMs = result.intervalMs;
          _commandQueue.enqueueBatch(commands);
          break;

        case SendMode.loop:
          // 循环发送
          final bytes = result.isHexMode
              ? _hexToBytes(result.data)
              : result.data.codeUnits;

          final loopDesc = result.loopCount == 0 ? '无限' : '${result.loopCount}次';
          _addLog('循环发送 ($loopDesc, 间隔${result.intervalMs}ms)...', LogType.info);

          final template = [CommandItem(
            id: 'loop_${DateTime.now().millisecondsSinceEpoch}',
            deviceId: widget.deviceId,
            serviceUuid: service.uuid,
            characteristicUuid: characteristic.uuid,
            data: bytes,
            withoutResponse: !characteristic.properties.contains(BleCharacteristicProperty.write),
            displayHex: result.isHexMode ? result.data : CommandQueue.formatHex(bytes),
          )];

          _commandQueue.intervalMs = result.intervalMs;
          _commandQueue.startLoop(template, loopCount: result.loopCount);
          break;
      }
    } catch (e) {
      _addLog('写入失败: $e', LogType.error);
    }
  }

  List<int> _hexToBytes(String hex) {
    final clean = hex.replaceAll(' ', '');
    return List.generate(
      clean.length ~/ 2,
      (i) => int.parse(clean.substring(i * 2, i * 2 + 2), radix: 16),
    );
  }

  /// T03: 尝试将字节解码为 UTF-8 文本，不可打印字符用「.」替代
  String _tryDecodeUtf8(List<int> value) {
    return value.map((b) => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join();
  }

  Future<void> _toggleNotification(BleService service, BleCharacteristic characteristic) async {
    try {
      final newState = !characteristic.isNotifying;

      if (newState) {
        _addLog('启用通知 ${characteristic.displayName}...', LogType.info);
      } else {
        _addLog('禁用通知 ${characteristic.displayName}...', LogType.info);
      }

      await _bleManager.setNotification(
        deviceId: widget.deviceId,
        serviceUuid: service.uuid,
        characteristicUuid: characteristic.uuid,
        enable: newState,
      );

      // 更新本地状态
      final serviceIndex = _services.indexWhere((s) => s.uuid == service.uuid);
      if (serviceIndex >= 0) {
        final charIndex = _services[serviceIndex].characteristics
            .indexWhere((c) => c.uuid == characteristic.uuid);
        if (charIndex >= 0) {
          setState(() {
            _services[serviceIndex].characteristics[charIndex] =
                _services[serviceIndex].characteristics[charIndex].copyWith(
                      isNotifying: newState,
                    );
          });
        }
      }

      // 如果启用通知，监听值变化
      if (newState) {
        final stream = _bleManager.listenCharacteristicValue(
          deviceId: widget.deviceId,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
        );

        stream?.listen((value) {
          final hex = value.map((b) => b.toRadixString(16).padLeft(2, '0').toUpperCase()).join(' ');
          // T03: 统一 HEX + TEXT 双格式
          final text = _tryDecodeUtf8(value);
          _addLog('HEX: $hex\nTEXT: $text', LogType.receive);
        });
      }

      _addLog(newState ? '通知已启用' : '通知已禁用', LogType.success);
    } catch (e) {
      _addLog('设置通知失败: $e', LogType.error);
    }
  }

  /// 导出日志（增强版：含设备信息、服务摘要）
  void _exportLogs() {
    if (_logs.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('没有日志可导出')),
      );
      return;
    }

    final text = LogPanel.formatDeviceExportText(
      deviceId: widget.deviceId,
      deviceName: widget.deviceName,
      isConnected: _isConnected,
      services: _services,
      logs: _logs,
    );

    // 显示导出选项
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.copy),
              title: const Text('复制到剪贴板'),
              onTap: () {
                Clipboard.setData(ClipboardData(text: text));
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('已复制到剪贴板'),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.share),
              title: const Text('分享'),
              subtitle: const Text('通过系统分享发送数据'),
              onTap: () {
                Clipboard.setData(ClipboardData(text: text));
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('数据已复制到剪贴板，请通过系统分享发送'),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _connectionStatesSub?.cancel();
    _commandQueue.clear();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.deviceName, style: const TextStyle(fontSize: 17)),
            Text(
              widget.deviceId,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
        elevation: 0,
        actions: [
          if (_hasOtaService && _isConnected)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: IconButton(
                icon: const Icon(Icons.system_update_alt, color: AppTheme.primaryColor),
                tooltip: 'OTA 固件升级',
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => OtaUpgradeDialog(deviceId: widget.deviceId),
                  );
                },
              ),
            ),
          // 连接状态
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _isReconnecting
                      ? AppTheme.warningColor.withValues(alpha: 0.1)
                      : _isConnected
                          ? AppTheme.successColor.withValues(alpha: 0.1)
                          : AppTheme.errorColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_isReconnecting)
                      const SizedBox(
                        width: 10,
                        height: 10,
                        child: CircularProgressIndicator(
                          strokeWidth: 1.5,
                          color: AppTheme.warningColor,
                        ),
                      )
                    else
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _isConnected ? AppTheme.successColor : AppTheme.errorColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                    const SizedBox(width: 6),
                    Text(
                      _isReconnecting ? '重连中...' : (_isConnected ? '已连接' : '未连接'),
                      style: TextStyle(
                        fontSize: 12,
                        color: _isReconnecting
                            ? AppTheme.warningColor
                            : (_isConnected ? AppTheme.successColor : AppTheme.errorColor),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // 操作按钮
          if (_isConnected || _isReconnecting)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // 清空日志
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => setState(() {
                        _logs.clear();
                      }),
                      icon: const Icon(Icons.clear, size: 18),
                      label: const Text('清空'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // 导出日志
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _logs.isEmpty ? null : _exportLogs,
                      icon: const Icon(Icons.ios_share, size: 18),
                      label: const Text('导出'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // 断开连接
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _disconnect,
                      icon: const Icon(Icons.bluetooth_disabled, size: 18),
                      label: const Text('断开'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.errorColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // 指令队列状态栏
          if (_commandQueue.isRunning || _commandQueue.isLooping || _commandQueue.pendingCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: AppTheme.primaryColor.withValues(alpha: 0.08),
              child: Row(
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _commandQueue.isLooping
                          ? '循环发送中 (${_commandQueue.currentLoop}/${_commandQueue.targetLoopCount == 0 ? "∞" : _commandQueue.targetLoopCount}) | 待发送: ${_commandQueue.pendingCount}'
                          : '发送中 | 待发送: ${_commandQueue.pendingCount}',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ),
                  if (_commandQueue.isPaused)
                    TextButton.icon(
                      onPressed: () => _commandQueue.resume(),
                      icon: const Icon(Icons.play_arrow, size: 16),
                      label: const Text('继续', style: TextStyle(fontSize: 12)),
                    )
                  else
                    TextButton.icon(
                      onPressed: () => _commandQueue.pause(),
                      icon: const Icon(Icons.pause, size: 16),
                      label: const Text('暂停', style: TextStyle(fontSize: 12)),
                    ),
                  TextButton.icon(
                    onPressed: () {
                      _commandQueue.clear();
                      _addLog('指令队列已停止', LogType.info);
                    },
                    icon: const Icon(Icons.stop, size: 16, color: AppTheme.errorColor),
                    label: const Text('停止', style: TextStyle(fontSize: 12, color: AppTheme.errorColor)),
                  ),
                ],
              ),
            ),
          // 内容
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? _buildErrorView()
                    : _buildServicesList(),
          ),

          // 日志面板
          if (_logs.isNotEmpty)
            SizedBox(
              height: 150,
              child: LogPanel(
                entries: _logs,
                onExport: _exportLogs,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
          const SizedBox(height: 16),
          Text(_errorMessage ?? '发生错误'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _checkConnectionAndDiscoverServices,
            child: const Text('重试'),
          ),
        ],
      ),
    );
  }

  Widget _buildServicesList() {
    return ServiceListWidget(
      services: _services,
      onRead: (char) {
        final service = _services.firstWhere((s) => s.characteristics.contains(char));
        _readCharacteristic(service, char);
      },
      onWrite: (char) {
        final service = _services.firstWhere((s) => s.characteristics.contains(char));
        _writeCharacteristic(service, char);
      },
      onToggleNotify: (char) {
        final service = _services.firstWhere((s) => s.characteristics.contains(char));
        _toggleNotification(service, char);
      },
    );
  }
}
