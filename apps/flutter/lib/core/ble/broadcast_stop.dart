import 'dart:async';

/// A successful stop call is not a receipt that the publisher actually stopped.
Future<void> stopBroadcastAndVerify({
  required Future<void> Function() stop,
  required Future<bool> Function() isAdvertising,
  int attempts = 5,
  Duration interval = const Duration(milliseconds: 100),
}) async {
  await stop();
  for (var attempt = 0; attempt < attempts; attempt++) {
    if (!await isAdvertising()) return;
    if (attempt + 1 < attempts) await Future<void>.delayed(interval);
  }
  throw StateError('系统仍报告正在广播，请重试停止或退出应用');
}
