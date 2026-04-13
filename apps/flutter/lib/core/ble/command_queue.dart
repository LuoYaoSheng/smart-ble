import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../core/utils/data_converter.dart';

/// 指令队列项
class CommandItem {
  /// 唯一标识
  final String id;

  /// 设备 ID
  final String deviceId;

  /// 服务 UUID
  final String serviceUuid;

  /// 特征值 UUID
  final String characteristicUuid;

  /// 数据
  final List<int> data;

  /// 是否无响应写入
  final bool withoutResponse;

  /// 显示用的 HEX 字符串
  final String displayHex;

  /// 状态
  CommandStatus status;

  /// 错误信息
  String? error;

  /// 发送时间
  DateTime? sentAt;

  CommandItem({
    required this.id,
    required this.deviceId,
    required this.serviceUuid,
    required this.characteristicUuid,
    required this.data,
    this.withoutResponse = false,
    required this.displayHex,
    this.status = CommandStatus.pending,
    this.error,
    this.sentAt,
  });
}

/// 指令状态
enum CommandStatus {
  /// 等待中
  pending,
  /// 发送中
  sending,
  /// 成功
  success,
  /// 失败
  failed,
}

/// 指令发送回调
typedef CommandSender = Future<void> Function(CommandItem command);

/// 指令队列状态回调
typedef CommandQueueCallback = void Function(CommandItem command);

/// BLE 指令队列
///
/// 支持:
/// - FIFO 顺序发送，可配置发送间隔
/// - 批量发送（多条指令排队）
/// - 循环发送（重复 N 次或无限循环）
/// - 暂停/恢复/清空
class CommandQueue {
  /// 队列
  final List<CommandItem> _queue = [];

  /// 发送间隔（毫秒）
  int intervalMs;

  /// 是否正在运行
  bool _isRunning = false;

  /// 是否暂停
  bool _isPaused = false;

  /// 循环相关
  bool _isLooping = false;
  int _loopCount = 0; // 0 = 无限循环
  int _currentLoop = 0;
  List<CommandItem>? _loopTemplate;

  /// 发送回调
  final CommandSender _sender;

  /// 状态回调
  CommandQueueCallback? onCommandStart;
  CommandQueueCallback? onCommandComplete;
  CommandQueueCallback? onCommandError;
  VoidCallback? onQueueEmpty;
  VoidCallback? onQueueStateChanged;

  /// 已完成的指令历史
  final List<CommandItem> _history = [];

  CommandQueue({
    required CommandSender sender,
    this.intervalMs = 50,
    this.onCommandStart,
    this.onCommandComplete,
    this.onCommandError,
    this.onQueueEmpty,
    this.onQueueStateChanged,
  }) : _sender = sender;

  /// 队列中待发送的指令数
  int get pendingCount => _queue.length;

  /// 是否正在运行
  bool get isRunning => _isRunning;

  /// 是否暂停
  bool get isPaused => _isPaused;

  /// 是否在循环中
  bool get isLooping => _isLooping;

  /// 当前循环次数
  int get currentLoop => _currentLoop;

  /// 目标循环次数（0=无限）
  int get targetLoopCount => _loopCount;

  /// 历史记录
  List<CommandItem> get history => List.unmodifiable(_history);

  /// 待发送队列
  List<CommandItem> get queue => List.unmodifiable(_queue);

  /// 添加单条指令
  void enqueue(CommandItem command) {
    _queue.add(command);
    onQueueStateChanged?.call();
    _startProcessing();
  }

  /// 批量添加指令
  void enqueueBatch(List<CommandItem> commands) {
    _queue.addAll(commands);
    onQueueStateChanged?.call();
    _startProcessing();
  }

  /// 开始循环发送
  ///
  /// [commands] 每次循环要发送的指令列表
  /// [loopCount] 循环次数，0 表示无限循环
  void startLoop(List<CommandItem> commands, {int loopCount = 0}) {
    stopLoop();
    _isLooping = true;
    _loopCount = loopCount;
    _currentLoop = 0;
    _loopTemplate = commands;
    _enqueueNextLoop();
    onQueueStateChanged?.call();
  }

  /// 停止循环
  void stopLoop() {
    _isLooping = false;
    _loopTemplate = null;
    _loopCount = 0;
    _currentLoop = 0;
    onQueueStateChanged?.call();
  }

  /// 暂停队列
  void pause() {
    _isPaused = true;
    onQueueStateChanged?.call();
  }

  /// 恢复队列
  void resume() {
    _isPaused = false;
    onQueueStateChanged?.call();
    _startProcessing();
  }

  /// 清空队列
  void clear() {
    _queue.clear();
    stopLoop();
    _isRunning = false;
    _isPaused = false;
    onQueueStateChanged?.call();
  }

  /// 清空历史
  void clearHistory() {
    _history.clear();
  }

  /// 内部：开始处理队列
  void _startProcessing() {
    if (_isRunning || _isPaused || _queue.isEmpty) return;
    _isRunning = true;
    _processNext();
  }

  /// 内部：处理下一条指令
  Future<void> _processNext() async {
    if (_isPaused || _queue.isEmpty) {
      _isRunning = false;
      if (_queue.isEmpty && !_isLooping) {
        onQueueEmpty?.call();
      }
      // 如果在循环模式，队列空了就添加下一轮
      if (_queue.isEmpty && _isLooping) {
        _enqueueNextLoop();
        if (_queue.isNotEmpty) {
          _processNext();
        } else {
          _isRunning = false;
        }
      }
      return;
    }

    final command = _queue.removeAt(0);
    command.status = CommandStatus.sending;
    command.sentAt = DateTime.now();
    onCommandStart?.call(command);
    onQueueStateChanged?.call();

    try {
      await _sender(command);
      command.status = CommandStatus.success;
      onCommandComplete?.call(command);
    } catch (e) {
      command.status = CommandStatus.failed;
      command.error = e.toString();
      onCommandError?.call(command);
      debugPrint('指令发送失败: $e');
    }

    _history.add(command);
    onQueueStateChanged?.call();

    // 间隔后处理下一条
    if (_queue.isNotEmpty || _isLooping) {
      await Future.delayed(Duration(milliseconds: intervalMs));
      _processNext();
    } else {
      _isRunning = false;
      onQueueEmpty?.call();
      onQueueStateChanged?.call();
    }
  }

  /// 内部：添加下一轮循环指令
  void _enqueueNextLoop() {
    if (!_isLooping || _loopTemplate == null) return;

    // 检查是否达到循环上限
    if (_loopCount > 0 && _currentLoop >= _loopCount) {
      _isLooping = false;
      _loopTemplate = null;
      onQueueEmpty?.call();
      onQueueStateChanged?.call();
      return;
    }

    _currentLoop++;

    // 深拷贝模板，生成新的指令
    final newCommands = _loopTemplate!.map((template) => CommandItem(
      id: '${template.id}_loop$_currentLoop',
      deviceId: template.deviceId,
      serviceUuid: template.serviceUuid,
      characteristicUuid: template.characteristicUuid,
      data: List.from(template.data),
      withoutResponse: template.withoutResponse,
      displayHex: template.displayHex,
    )).toList();

    _queue.addAll(newCommands);
  }

  /// 解析 HEX 字符串为字节列表
  static List<int> parseHex(String hex) {
    return DataConverter.hexToBytes(hex);
  }

  /// 解析多行 HEX 文本为多条指令
  ///
  /// 每行一条指令，空行跳过
  static List<List<int>> parseMultiLineHex(String text) {
    return text
        .split('\n')
        .map((line) => line.trim())
        .where((line) => line.isNotEmpty)
        .map((line) => parseHex(line))
        .toList();
  }

  /// 格式化字节为 HEX 显示字符串
  static String formatHex(List<int> data) {
    return DataConverter.bytesToHex(data, separator: true);
  }
}
