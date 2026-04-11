import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/log_entry.dart';

/// 全局事件/日志总线 (统一单例)
class Logger {
  static final Logger _instance = Logger._internal();
  factory Logger() => _instance;
  Logger._internal();

  final int _maxHistorySize = 1000;
  final List<LogEntry> _history = [];
  
  // 广播控制器，用于解耦发布者和订阅者
  final _logController = StreamController<LogEntry>.broadcast();

  /// 日志流，UI 组件可订阅以获取实时更新
  Stream<LogEntry> get logStream => _logController.stream;

  /// 获取完整历史记录备份
  List<LogEntry> get history => List.unmodifiable(_history);

  /// 核心发送方法
  void _emit(String message, LogType type) {
    final entry = LogEntry(
      message: message,
      type: type,
      timestamp: DateTime.now(),
    );

    _history.add(entry);
    if (_history.length > _maxHistorySize) {
      _history.removeAt(0);
    }

    _logController.add(entry);

    if (kDebugMode) {
      final prefix = '[${type.name.toUpperCase()}]';
      debugPrint('$prefix $message');
    }
  }

  void info(String message) => _emit(message, LogType.info);
  void success(String message) => _emit(message, LogType.success);
  void warning(String message) => _emit(message, LogType.warning);
  void error(String message) => _emit(message, LogType.error);
  void receive(String message) => _emit(message, LogType.receive);
  void send(String message) => _emit(message, LogType.send);

  /// 清空日志
  void clear() {
    _history.clear();
    // 触发一个特殊事件或依赖上层调用者自己 setState(空列表) // 这里也可以通过发消息或让上层直接读
    // 最好的方式是 UI 组件既持有 history snapshot，又侦听 stream 追加
  }

  void dispose() {
    _logController.close();
  }
}

// 导出全局默认单例实例
final logger = Logger();
