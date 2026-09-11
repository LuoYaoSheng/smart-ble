import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:file_picker/file_picker.dart';
import '../../core/ble/ota_manager.dart';
import '../../core/design/app_icons.dart';
import '../design/app_tokens.dart';

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
            // P-03 固定预警（PATTERN §75 逐字；N-MAC 弹窗同款）
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppTokens.cWarningWeak,
                borderRadius: BorderRadius.circular(AppTokens.rSm),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AppIcon('warn', size: 13, color: AppTokens.cWarningDeep),
                  SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      '端到端升级链路当前 BLOCKED（固件侧暂未开放），流程可演示，正式使用前需固件配合。',
                      style: TextStyle(
                        fontSize: 11,
                        height: 1.5,
                        color: AppTokens.cWarningDeep,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (state.errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(8),
                color: AppTokens.cDangerWeak,
                child: Text(
                  state.errorMessage!,
                  style: const TextStyle(color: AppTokens.cDanger, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),

            // File selection
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: AppTokens.cLine),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const AppIcon('doc', color: AppTokens.cPrimary),
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
                                fontSize: 12, color: AppTokens.cMut),
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
                    backgroundColor: AppTokens.cPrimaryWeak,
                    color: state.isCompleted ? AppTokens.cSuccess : AppTokens.cPrimary,
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
                      const AppIcon('check',
                          color: AppTokens.cSuccess, size: 24),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 16),

            Text(
              state.statusMessage,
              style: const TextStyle(color: AppTokens.cMut, fontSize: 13),
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
                style: const TextStyle(color: AppTokens.cMut)),
          ),
        if (state.isCompleted)
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: AppTokens.cPrimary),
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
