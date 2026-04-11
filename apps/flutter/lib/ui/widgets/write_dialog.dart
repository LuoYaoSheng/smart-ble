import 'package:flutter/material.dart';
import '../../core/models/ble_service.dart';
import '../../core/utils/data_converter.dart';

/// 发送模式
enum SendMode {
  /// 单次发送
  single,
  /// 批量发送（每行一条指令）
  batch,
  /// 循环发送
  loop,
}

/// 写入结果
class WriteResult {
  final String data;
  final bool isHexMode;
  final SendMode sendMode;
  final int loopCount; // 0 = 无限循环
  final int intervalMs;

  const WriteResult({
    required this.data,
    required this.isHexMode,
    this.sendMode = SendMode.single,
    this.loopCount = 1,
    this.intervalMs = 50,
  });
}

/// 增强写入对话框
///
/// 支持:
/// - 单次发送（默认）
/// - 批量发送: 每行一条 HEX 指令，顺序执行
/// - 循环发送: 重复发送 N 次或无限循环
class WriteDataDialog extends StatefulWidget {
  final BleCharacteristic characteristic;
  final TextEditingController controller;

  const WriteDataDialog({
    super.key,
    required this.characteristic,
    required this.controller,
  });

  @override
  State<WriteDataDialog> createState() => _WriteDataDialogState();
}

class _WriteDataDialogState extends State<WriteDataDialog> {
  bool _isHexMode = true;
  SendMode _sendMode = SendMode.single;
  int _loopCount = 10;
  int _intervalMs = 50;
  bool _infiniteLoop = false;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('写入 ${widget.characteristic.displayName}'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 格式选择
            Row(
              children: [
                const Text('格式: ', style: TextStyle(fontSize: 14)),
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: true, label: Text('HEX')),
                    ButtonSegment(value: false, label: Text('UTF-8')),
                  ],
                  selected: {_isHexMode},
                  onSelectionChanged: (Set<bool> selected) {
                    setState(() {
                      _isHexMode = selected.first;
                      widget.controller.clear();
                    });
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 发送模式选择
            Row(
              children: [
                const Text('模式: ', style: TextStyle(fontSize: 14)),
                Expanded(
                  child: SegmentedButton<SendMode>(
                    segments: const [
                      ButtonSegment(value: SendMode.single, label: Text('单次')),
                      ButtonSegment(value: SendMode.batch, label: Text('批量')),
                      ButtonSegment(value: SendMode.loop, label: Text('循环')),
                    ],
                    selected: {_sendMode},
                    onSelectionChanged: (Set<SendMode> selected) {
                      setState(() {
                        _sendMode = selected.first;
                      });
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 数据输入
            TextField(
              controller: widget.controller,
              decoration: InputDecoration(
                labelText: _getInputLabel(),
                border: const OutlineInputBorder(),
                hintText: _getInputHint(),
              ),
              keyboardType: TextInputType.text,
              maxLines: _sendMode == SendMode.batch ? 6 : 3,
            ),

            // 循环模式额外选项
            if (_sendMode == SendMode.loop) ...[
              const SizedBox(height: 12),
              // 循环次数
              Row(
                children: [
                  Checkbox(
                    value: _infiniteLoop,
                    onChanged: (v) => setState(() => _infiniteLoop = v ?? false),
                  ),
                  const Text('无限循环'),
                  const SizedBox(width: 16),
                  if (!_infiniteLoop) ...[
                    const Text('次数: '),
                    SizedBox(
                      width: 80,
                      child: TextField(
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                        controller: TextEditingController(text: '$_loopCount'),
                        onChanged: (v) {
                          _loopCount = int.tryParse(v) ?? 10;
                        },
                      ),
                    ),
                  ],
                ],
              ),
              // 发送间隔
              Row(
                children: [
                  const Text('间隔: '),
                  SizedBox(
                     width: 80,
                    child: TextField(
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                        isDense: true,
                        suffixText: 'ms',
                      ),
                      keyboardType: TextInputType.number,
                      controller: TextEditingController(text: '$_intervalMs'),
                      onChanged: (v) {
                         _intervalMs = int.tryParse(v) ?? 50;
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  // 快捷间隔按钮
                  ...[20, 50, 100, 500].map((ms) => Padding(
                    padding: const EdgeInsets.only(right: 4),
                     child: InkWell(
                      onTap: () => setState(() => _intervalMs = ms),
                       child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        decoration: BoxDecoration(
                          color: _intervalMs == ms
                              ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1)
                              : Colors.grey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: _intervalMs == ms
                                ? Theme.of(context).colorScheme.primary
                                : Colors.transparent,
                          ),
                        ),
                        child: Text('$ms', style: const TextStyle(fontSize: 11)),
                      ),
                    ),
                  )),
                ],
              ),
            ],

            // 批量模式提示
            if (_sendMode == SendMode.batch)
               const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  '每行一条指令，按顺序发送',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ),
          ],
        ),
      ),
      actions: [
         TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('取消'),
        ),
        ElevatedButton(
          onPressed: _onSubmit,
           child: Text(_sendMode == SendMode.single ? '写入' :
                     _sendMode == SendMode.batch ? '批量发送' : '开始循环'),
        ),
      ],
    );
  }

   String _getInputLabel() {
    if (_sendMode == SendMode.batch) {
      return _isHexMode ? 'HEX 指令 (每行一条)' : '文本数据 (每行一条)';
    }
    return _isHexMode ? 'HEX 数据 (例: FF 01 AA)' : '文本数据 (UTF-8)';
  }

  String _getInputHint() {
    if (_sendMode == SendMode.batch) {
       return _isHexMode ? 'FF 01 AA\n00 02 BB\n03 CC DD' : '第一行\n第二行\n第三行';
    }
    return _isHexMode ? '输入十六进制数据，空格分隔' : '输入要发送的文本';
  }

  void _onSubmit() {
    final value = widget.controller.text.trim();
    if (value.isEmpty) return;

    // 验证 HEX 输入
     if (_isHexMode) {
      final lines = _sendMode == SendMode.batch
          ? value.split('\n').map((l) => l.trim()).where((l) => l.isNotEmpty)
          : [value];

       for (final line in lines) {
        if (!DataConverter.isValidHex(line)) {
          ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(content: Text('HEX 格式错误 (需要偶数长度的合法16进制字符): $line')),
          );
          return;
        }
      }
    }

    Navigator.pop(context, WriteResult(
      data: value,
      isHexMode: _isHexMode,
      sendMode: _sendMode,
      loopCount: _infiniteLoop ? 0 : _loopCount,
      intervalMs: _intervalMs,
    ));
  }
}
