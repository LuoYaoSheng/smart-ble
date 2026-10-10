import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/broadcast_stop.dart';
import 'package:smart_ble/core/ble/ble_peripheral_manager.dart';

void main() {
  test('stop waits for publisher confirmation', () async {
    var stopped = false;
    var reads = 0;
    await stopBroadcastAndVerify(
      stop: () async {
        stopped = true;
      },
      isAdvertising: () async => ++reads < 3,
      interval: Duration.zero,
    );
    expect(stopped, isTrue);
    expect(reads, 3);
  });
  test('publisher still running cannot produce a successful stop', () async {
    await expectLater(
        stopBroadcastAndVerify(
          stop: () async {},
          isAdvertising: () async => true,
          attempts: 2,
          interval: Duration.zero,
        ),
        throwsStateError);
  });
  test('native stop errors are surfaced', () async {
    await expectLater(
        stopBroadcastAndVerify(
          stop: () async {
            throw StateError('native failure');
          },
          isAdvertising: () async => false,
        ),
        throwsStateError);
  });
  test('advertising budget counts UTF-8 name bytes', () {
    final budget = BlePeripheralManager.estimateAdvBytes(
        name: '蓝牙',
        serviceUuid: 'fff0',
        manufacturerId: '',
        manufacturerData: '');
    expect(budget.name, 8);
  });
}
