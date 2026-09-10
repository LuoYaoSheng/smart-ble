import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/ble_manager.dart';

/// F006/F012 Base 契约锁（FEATURE_IMPLEMENTATION_MATRIX §2）：
/// 连接超时 10s；断线自动重连 3×（1s/3s/5s）backoff。
void main() {
  test('F006: 连接超时默认 10 秒', () {
    expect(BleManager.defaultConnectTimeout, const Duration(seconds: 10));
  });

  test('F012: 重连退避 1s/3s/5s', () {
    expect(BleManager.reconnectDelaysMs, [1000, 3000, 5000]);
  });
}
