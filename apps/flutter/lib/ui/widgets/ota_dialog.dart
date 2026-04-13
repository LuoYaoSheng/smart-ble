import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import '../../core/ble/ota_manager.dart';

class OtaUpgradeDialog extends ConsumerWidget {
  final String deviceId;

  const OtaUpgradeDialog({super.key, required this.deviceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(otaStateProvider(deviceId));
    final notifier = ref.read(otaStateProvider(deviceId).notifier);

    return AlertDialog(
      title: const Text('OTA 固件升级'),
      content: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (state.errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(8),
                color: Colors.red.withValues(alpha: 0.1),
                child: Text(
                  state.errorMessage!,
                  style: const TextStyle(color: Colors.red, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),

            // File selection
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.description, color: Colors.blue),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          state.fileName ?? '未选择固件',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (state.fileSize > 0)
                          Text(
                            '${(state.fileSize / 1024).toStringAsFixed(1)} KB',
                            style: const TextStyle(
                                fontSize: 12, color: Colors.grey),
                          ),
                      ],
                    ),
                  ),
                  if (!state.isInProgress)
                    TextButton(
                      onPressed: () async {
                        FilePickerResult? result = await FilePicker.pickFiles(
                          type: FileType
                              .any, // .bin filters are restrictive on some OS
                        );
                        if (result != null &&
                            result.files.single.path != null) {
                          File file = File(result.files.single.path!);
                          int size = await file.length();
                          notifier.selectFile(
                              file, result.files.single.name, size);
                        }
                      },
                      child: const Text('选择'),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Progress Bar
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 120,
                  height: 120,
                  child: CircularProgressIndicator(
                    value: state.totalBytes > 0
                        ? state.sentBytes / state.totalBytes
                        : 0,
                    strokeWidth: 8,
                    backgroundColor: Colors.blue.withValues(alpha: 0.1),
                    color: state.isCompleted ? Colors.green : Colors.blue,
                  ),
                ),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${state.progressPercent}%',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (state.isCompleted)
                      const Icon(Icons.check_circle,
                          color: Colors.green, size: 24),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 16),

            Text(
              state.statusMessage,
              style: const TextStyle(color: Colors.grey, fontSize: 13),
            ),
          ],
        ),
      ),
      actions: [
        if (!state.isCompleted)
          TextButton(
            onPressed: () {
              if (state.isInProgress) {
                notifier.cancelOta();
              }
              Navigator.pop(context);
            },
            child: Text(state.isInProgress ? '取消并关闭' : '关闭',
                style: const TextStyle(color: Colors.grey)),
          ),
        if (state.isCompleted)
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('完成', style: TextStyle(color: Colors.white)),
          ),
        if (!state.isInProgress && !state.isCompleted)
          ElevatedButton(
            onPressed:
                state.selectedFile == null ? null : () => notifier.startOta(),
            child: const Text('开始刷入'),
          ),
      ],
    );
  }
}
