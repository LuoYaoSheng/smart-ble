import 'package:flutter/material.dart';
import 'app_tokens.dart';
import 'app_icon.dart';
import 'app_button.dart';

/// 正典通信日志面板（COMPONENT_CONTRACT C5 · 原型 C.logPanel 单一来源）
///
/// variant: dock（深色 --c-ink，P006 底部）/ card（白卡，P008）·
/// 六色类型 chip · 脱敏由调用侧（F026）完成。
class AppLogEntry {
  const AppLogEntry({required this.time, required this.type, required this.msg});

  final String time;
  final String type; // sys|err|read|write|recv|ok
  final String msg;
}

class LogPanel extends StatelessWidget {
  const LogPanel({
    super.key,
    required this.logs,
    this.variant = LogPanelVariant.dock,
    this.emptyText = '暂无日志',
    this.onClear,
    this.onExport,
  });

  final List<AppLogEntry> logs;
  final LogPanelVariant variant;
  final String emptyText;
  final VoidCallback? onClear;
  final VoidCallback? onExport;

  static const _typeWords = {
    'sys': '系统',
    'err': '错误',
    'read': '读取',
    'write': '写入',
    'recv': '接收',
    'ok': '成功',
  };

  bool get _dock => variant == LogPanelVariant.dock;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: _dock ? AppTokens.cInk : AppTokens.cCard,
        borderRadius: BorderRadius.circular(AppTokens.rLg),
        border: _dock ? null : Border.all(color: AppTokens.cLine),
        boxShadow: _dock ? null : AppTokens.shadow1,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: _dock ? AppTokens.cInkLine : AppTokens.cLineSoft,
                ),
              ),
            ),
            child: Row(
              children: [
                AppIcon('log',
                    size: 13,
                    color: _dock ? AppTokens.cInkText : AppTokens.cSub),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '通信日志',
                    style: TextStyle(
                      fontSize: AppTokens.fsCap,
                      fontWeight: AppTokens.fwBold,
                      color: _dock ? AppTokens.cInkText : AppTokens.cSub,
                    ),
                  ),
                ),
                AppButton(
                  label: '清空',
                  tone: AppButtonTone.ghost,
                  size: AppButtonSize.sm,
                  dangerText: true,
                  onTap: onClear,
                ),
                const SizedBox(width: 4),
                AppButton(
                  label: '导出',
                  tone: AppButtonTone.ghost,
                  size: AppButtonSize.sm,
                  onTap: onExport,
                ),
              ],
            ),
          ),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 220),
            child: logs.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 22),
                    child: Center(
                      child: Text(
                        emptyText,
                        style: TextStyle(
                          fontSize: AppTokens.fsCap,
                          color: _dock ? AppTokens.reviewSub : AppTokens.cMut,
                        ),
                      ),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    itemCount: logs.length,
                    itemBuilder: (context, i) => _row(logs[i]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _row(AppLogEntry l) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text(
            l.time,
            style: TextStyle(
              fontFamily: AppTokens.fontMono,
              fontSize: AppTokens.fsMini,
              color: _dock ? AppTokens.reviewSub : AppTokens.cMut,
            ),
          ),
          const SizedBox(width: 8),
          _TypeChip(type: l.type, dock: _dock),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              l.msg,
              style: TextStyle(
                fontFamily: AppTokens.fontMono,
                fontSize: AppTokens.fsMini,
                height: 1.5,
                color: _dock ? AppTokens.cInkText : AppTokens.cSub,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum LogPanelVariant { dock, card }

class _TypeChip extends StatelessWidget {
  const _TypeChip({required this.type, required this.dock});

  final String type;
  final bool dock;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (type) {
      'sys' when dock => (AppTokens.logDockSysBg, AppTokens.logDockSys),
      'err' when dock => (AppTokens.logDockErrBg, AppTokens.logDockErr),
      'read' when dock => (AppTokens.logDockReadBg, AppTokens.logDockRead),
      'write' when dock => (AppTokens.logDockWriteBg, AppTokens.logDockWrite),
      'recv' when dock => (AppTokens.logDockRecvBg, AppTokens.logDockRecv),
      'ok' when dock => (AppTokens.logDockOkBg, AppTokens.logDockOk),
      'sys' => (AppTokens.logSysBg, AppTokens.logSys),
      'err' => (AppTokens.logErrBg, AppTokens.logErr),
      'read' => (AppTokens.logReadBg, AppTokens.logRead),
      'write' => (AppTokens.logWriteBg, AppTokens.logWrite),
      'recv' => (AppTokens.logRecvBg, AppTokens.logRecv),
      'ok' => (AppTokens.logOkBg, AppTokens.logOk),
      _ => (AppTokens.cFill, AppTokens.cSub),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(5),
      ),
      child: Text(
        AppLogPanel.typeWordsOf(type),
        style: TextStyle(
          fontSize: AppTokens.fsMicro,
          fontWeight: AppTokens.fwBold,
          color: fg,
          height: 1.7,
        ),
      ),
    );
  }
}

/// 日志类型词表（三端一致：系统/错误/读取/写入/接收/成功）。
class AppLogPanel {
  const AppLogPanel._();
  static const typeWords = LogPanel._typeWords;
  static String typeWordsOf(String type) => typeWords[type] ?? type;
}
