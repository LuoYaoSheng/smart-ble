import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/device_write_queue.dart';

void main() {
  test('one device is serial while another device progresses', () async {
    final queue = DeviceWriteQueue();
    final ack = Completer<void>();
    final sent = <String>[];
    final a = queue.run('A', () async {
      sent.add('a1');
      await ack.future;
    });
    final next = queue.run('A', () async => sent.add('a2'));
    await queue.run('B', () async => sent.add('b1'));
    expect(sent, ['a1', 'b1']);
    ack.complete();
    await Future.wait([a, next]);
    expect(sent, ['a1', 'b1', 'a2']);
    expect(queue.depth('A'), 0);
  });
  test('cancellation rejects pending writes before reaching platform',
      () async {
    final queue = DeviceWriteQueue();
    final ack = Completer<void>();
    final first = queue.run('A', () => ack.future);
    final next =
        queue.run('A', () async => fail('cancelled write reached GATT'));
    final rejected = expectLater(next, throwsStateError);
    queue.cancel('A');
    ack.complete();
    await expectLater(first, throwsStateError);
    await rejected;
  });
  test('depth includes in-flight and failed writes release capacity', () async {
    final queue = DeviceWriteQueue(maxDepth: 1);
    final ack = Completer<void>();
    final write = queue.run('A', () => ack.future);
    await expectLater(queue.run('A', () async {}), throwsStateError);
    ack.complete();
    await write;
    await expectLater(
        queue.run('A', () async => throw StateError('device rejected')),
        throwsStateError);
    expect(queue.depth('A'), 0);
    await queue.run('A', () async {});
  });
}
