import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/models/ble_service.dart';
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
  final VoidCallback? onClear;
  final VoidCallback? onExport;

  const LogPanel({
    super.key,
    required this.entries,
    this.onClear,
    this.onExport,
  });

  /// 将日志条目格式化为可导出的文本
  static String formatLogsForExport(List<LogEntry> entries) {
    final buffer = StringBuffer();
    buffer.writeln('BLE Toolkit+ - 操作日志');
    buffer.writeln('导出时间: ${DateTime.now().toIso8601String()}');
    buffer.writeln('=' * 40);
    buffer.writeln();

    for (final entry in entries) {
      final time = '${entry.timestamp.hour.toString().padLeft(2, '0')}:'
          '${entry.timestamp.minute.toString().padLeft(2, '0')}:'
          '${entry.timestamp.second.toString().padLeft(2, '0')}';
      final typeLabel = switch (entry.type) {
        LogType.info => '系统',
        LogType.success => '成功',
        LogType.error => '错误',
        LogType.receive => '接收',
      };
      buffer.writeln('[$time] [$typeLabel] ${entry.message}');
    }

    return buffer.toString();
  }

  /// 格式化完整的设备数据导出文本（含设备信息、服务摘要、日志）
  ///
  /// 对齐 Android `buildDeviceExportText()` 格式
  static String formatDeviceExportText({
    required String deviceId,
    required String deviceName,
    required bool isConnected,
    required List<BleService> services,
    required List<LogEntry> logs,
  }) {
    final exportTime = DateTime.now().toIso8601String();

    final servicesSummary = services.isEmpty
        ? '无'
        : services
            .map((s) =>
                '- ${s.displayName} (${s.shortUuid}) / ${s.characteristics.length} 个特征值')
            .join('\n');

    final logsSummary = logs.isEmpty
        ? '无'
        : logs.map((log) {
            final time =
                '${log.timestamp.hour.toString().padLeft(2, '0')}:'
                '${log.timestamp.minute.toString().padLeft(2, '0')}:'
                '${log.timestamp.second.toString().padLeft(2, '0')}';
            final typeLabel = switch (log.type) {
              LogType.info => 'Info',
              LogType.success => 'Success',
              LogType.error => 'Error',
              LogType.receive => 'Receive',
            };
            return '[$time] $typeLabel: ${log.message}';
          }).join('\n');

    return 'BLE Toolkit+ 数据导出\n'
        '导出时间: $exportTime\n'
        '\n'
        '设备信息\n'
        '名称: $deviceName\n'
        'ID: $deviceId\n'
        '连接状态: ${isConnected ? '已连接' : '未连接'}\n'
        '\n'
        '服务摘要\n'
        '$servicesSummary\n'
        '\n'
        '操作日志\n'
        '$logsSummary';
  }

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      decoration: const BoxDecoration(
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
            decoration: const BoxDecoration(
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
                const SizedBox(width: 8),
                // 导出按钮
                GestureDetector(
                  onTap: onExport ?? () => _copyLogsToClipboard(context),
                  child: const Icon(
                    Icons.ios_share,
                    size: 16,
                    color: AppTheme.primaryColor,
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

  /// 复制日志到剪贴板（简单模式）
  void _copyLogsToClipboard(BuildContext context) {
    if (entries.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('没有日志可导出')),
      );
      return;
    }

    final text = formatLogsForExport(entries);
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('日志已复制到剪贴板'),
        duration: Duration(seconds: 2),
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
