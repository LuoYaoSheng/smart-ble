import 'package:flutter/material.dart';
import '../../themes/app_theme.dart';

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

/// 日志面板组件
class LogPanel extends StatelessWidget {
  final List<LogEntry> entries;

  const LogPanel({
    super.key,
    required this.entries,
  });

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: AppTheme.borderColor, width: 1),
        ),
      ),
      child: Column(
        children: [
          // 标题栏
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.backgroundColor,
              border: Border(
                bottom: BorderSide(color: AppTheme.borderColor, width: 0.5),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.article, size: 16, color: AppTheme.textSecondary),
                const SizedBox(width: 8),
                const Text(
                  '操作日志',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const Spacer(),
                Text(
                  '${entries.length} 条',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),

          // 日志列表
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(8),
              itemCount: entries.length,
              itemBuilder: (context, index) {
                final entry = entries[entries.length - 1 - index];
                return _LogItem(entry: entry);
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// 单条日志
class _LogItem extends StatelessWidget {
  final LogEntry entry;

  const _LogItem({required this.entry});

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _getTypeInfo();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.message,
                  style: TextStyle(
                    fontSize: 12,
                    color: color,
                  ),
                ),
                Text(
                  _formatTime(entry.timestamp),
                  style: const TextStyle(
                    fontSize: 10,
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

  (IconData, Color) _getTypeInfo() {
    switch (entry.type) {
      case LogType.info:
        return (Icons.info_outline, AppTheme.primaryColor);
      case LogType.success:
        return (Icons.check_circle_outline, AppTheme.successColor);
      case LogType.error:
        return (Icons.error_outline, AppTheme.errorColor);
      case LogType.receive:
        return (Icons.arrow_downward, AppTheme.secondaryColor);
    }
  }

  String _formatTime(DateTime time) {
    return '${time.hour.toString().padLeft(2, '0')}:'
        '${time.minute.toString().padLeft(2, '0')}:'
        '${time.second.toString().padLeft(2, '0')}';
  }
}
