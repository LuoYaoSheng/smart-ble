import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/ble/ble_manager.dart';
import '../../core/models/ble_service.dart';
import '../../themes/app_theme.dart';
import '../widgets/service_tile.dart';
import '../widgets/log_panel.dart';

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
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _checkConnectionAndDiscoverServices();
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
      await _bleManager.disconnect();
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
      _addLog('读取成功: $hex', LogType.success);
    } catch (e) {
      _addLog('读取失败: $e', LogType.error);
    }
  }

  Future<void> _writeCharacteristic(BleService service, BleCharacteristic characteristic) async {
    final controller = TextEditingController();

    if (!mounted) return;

    final result = await showDialog<String>(
      context: context,
      builder: (context) => _WriteDialog(
        characteristic: characteristic,
        controller: controller,
      ),
    );

    if (result != null && result.isNotEmpty) {
      try {
        // 转换 HEX 字符串为字节数组
        final bytes = _hexToBytes(result);

        _addLog('写入 ${characteristic.displayName}: $result', LogType.info);

        await _bleManager.writeCharacteristic(
          deviceId: widget.deviceId,
          serviceUuid: service.uuid,
          characteristicUuid: characteristic.uuid,
          data: bytes,
        );

        _addLog('写入成功', LogType.success);
      } catch (e) {
        _addLog('写入失败: $e', LogType.error);
      }
    }
  }

  List<int> _hexToBytes(String hex) {
    final clean = hex.replaceAll(' ', '');
    return List.generate(
      clean.length ~/ 2,
      (i) => int.parse(clean.substring(i * 2, i * 2 + 2), radix: 16),
    );
  }

  Future<void> _toggleNotification(BleService service, BleCharacteristic characteristic) async {
    try {
      final newState = !characteristic.notifying;

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
                      notifying: newState,
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
          _addLog('收到通知: $hex', LogType.receive);
        });
      }

      _addLog(newState ? '通知已启用' : '通知已禁用', LogType.success);
    } catch (e) {
      _addLog('设置通知失败: $e', LogType.error);
    }
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
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
        elevation: 0,
        actions: [
          // 连接状态
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _isConnected ? AppTheme.successColor.withOpacity(0.1) : AppTheme.errorColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
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
                      _isConnected ? '已连接' : '未连接',
                      style: TextStyle(
                        fontSize: 12,
                        color: _isConnected ? AppTheme.successColor : AppTheme.errorColor,
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
          if (_isConnected)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => setState(() {
                        _logs.clear();
                      }),
                      icon: const Icon(Icons.clear),
                      label: const Text('清空日志'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _disconnect,
                      icon: const Icon(Icons.bluetooth_disabled),
                      label: const Text('断开连接'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.errorColor,
                      ),
                    ),
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
              child: LogPanel(entries: _logs),
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
    if (_services.isEmpty) {
      return const Center(
        child: Text('未发现服务', style: TextStyle(color: AppTheme.textSecondary)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _services.length,
      itemBuilder: (context, index) {
        final service = _services[index];
        return ServiceTile(
          service: service,
          onRead: (char) => _readCharacteristic(service, char),
          onWrite: (char) => _writeCharacteristic(service, char),
          onToggleNotify: (char) => _toggleNotification(service, char),
        );
      },
    );
  }
}

/// 日志条目
class LogEntry {
  final String message;
  final LogType type;
  final DateTime timestamp;

  LogEntry({
    required this.message,
    required this.type,
    required this.timestamp,
  });
}

/// 日志类型
enum LogType {
  info,
  success,
  error,
  receive,
}

/// 写入对话框
class _WriteDialog extends StatefulWidget {
  final BleCharacteristic characteristic;
  final TextEditingController controller;

  const _WriteDialog({
    required this.characteristic,
    required this.controller,
  });

  @override
  State<_WriteDialog> createState() => _WriteDialogState();
}

class _WriteDialogState extends State<_WriteDialog> {
  bool _isHexMode = true;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('写入 ${widget.characteristic.displayName}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: widget.controller,
            decoration: InputDecoration(
              labelText: _isHexMode ? 'HEX 数据 (例: FF 01)' : '文本数据',
              border: const OutlineInputBorder(),
            ),
            keyboardType: _isHexMode ? TextInputType.text : TextInputType.text,
            maxLines: 3,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Text('格式: '),
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: true, label: Text('HEX')),
                  ButtonSegment(value: false, label: Text('UTF-8')),
                ],
                selected: {_isHexMode},
                onSelectionChanged: (Set<bool> selected) {
                  setState(() => _isHexMode = selected.first);
                },
              ),
            ],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
        ElevatedButton(
          onPressed: () {
            final value = widget.controller.text.trim();
            if (value.isNotEmpty) {
              Navigator.pop(context, value);
            }
          },
          child: const Text('写入'),
        ),
      ],
    );
  }
}
