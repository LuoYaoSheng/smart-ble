/// 日志类型
enum LogType {
  info,
  success,
  warning,
  error,
  receive,
  send,
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
