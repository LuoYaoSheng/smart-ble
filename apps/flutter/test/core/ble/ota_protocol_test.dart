import 'dart:async';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/ota_protocol.dart';

final firmware = List.generate(47, (i) => i);
Map<String, Object> manifest() => {
      'format_version': 1,
      'target': 'lightble-peripheral',
      'hardware': 'esp32-s3',
      'firmware_version': '1.2.0',
      'size': firmware.length,
      'sha256': sha256.convert(firmware).toString(),
    };
Future<void> noDelay(Duration _) async {}

class Transport implements OtaTransport {
  @override
  bool connected = true;
  @override
  int chunkSize = 20;
  final events = StreamController<List<int>>.broadcast(sync: true);
  final connections = StreamController<bool>.broadcast(sync: true);
  @override
  Stream<bool> get connectionStates => connections.stream;
  final controls = <Map<String, dynamic>>[],
      chunks = <List<int>>[],
      subscriptions = <bool>[];
  bool noReboot = false;
  bool ready = true,
      success = true,
      subscribeFails = false,
      dataFails = false,
      rebooted = false,
      wrongVersion = false,
      wrongHardware = false,
      sameVersion = false,
      prematureSuccess = false,
      disconnectDuringData = false,
      errorWithSuccessMessage = false;
  void Function()? onData;
  @override
  Stream<List<int>> get statuses => events.stream;
  void emit(Map<String, dynamic> frame) =>
      events.add(utf8.encode(jsonEncode(frame)));
  @override
  Future<void> subscribe(bool enabled) async {
    subscriptions.add(enabled);
    if (enabled && subscribeFails) throw StateError('subscription failed');
  }

  @override
  Future<void> writeControl(List<int> value) async {
    final frame = jsonDecode(utf8.decode(value)) as Map<String, dynamic>;
    controls.add(frame);
    if (frame['op'] == 'start' && ready) {
      if (errorWithSuccessMessage) {
        emit({
          'type': 'ota',
          'status': 'error',
          'message': 'ready success are impossible'
        });
      } else {
        emit({'type': 'ota', 'status': 'ready', 'max_chunk': 11});
      }
    }
    if (frame['op'] == 'commit' && success) {
      emit({'type': 'ota', 'status': 'success', 'rebooting': true});
      if (!noReboot) {
        connected = false;
        connections.add(false);
      }
    }
  }

  @override
  Future<void> writeData(List<int> value) async {
    chunks.add(value);
    if (dataFails) throw StateError('write failed');
    if (prematureSuccess) emit({'type': 'ota', 'status': 'success'});
    if (disconnectDuringData) connected = false;
    onData?.call();
  }

  @override
  Future<Map<String, dynamic>> readInfo() async => {
        'type': 'system_info',
        'target': 'lightble-peripheral',
        'hardware': wrongHardware ? 'different' : 'esp32-s3',
        'firmware_version':
            sameVersion || (rebooted && !wrongVersion) ? '1.2.0' : '1.1.0',
      };

  @override
  Future<void> reconnect() async {
    rebooted = true;
    connected = true;
  }

  List<dynamic> get ops => controls.map((e) => e['op']).toList();
}

void main() {
  test('requires exact six-field manifest and measured size/hash', () {
    expect(OtaPackage.validate(firmware, manifest()).bytes, firmware);
    for (final value in [
      null,
      {},
      {...manifest(), 'version': '1.2.0'},
      {...manifest(), 'format_version': 1.0},
      {...manifest(), 'hardware': ''},
      {...manifest(), 'target': '1.2.0'},
      {...manifest(), 'firmware_version': 'v1.2'},
      {...manifest(), 'size': firmware.length - 1},
      {...manifest(), 'sha256': 'a' * 64}
    ]) {
      expect(() => OtaPackage.validate(firmware, value), throwsFormatException);
    }
  });
  test('same version/hardware mismatch rejects before START or subscription',
      () async {
    for (final option in ['hardware', 'version']) {
      final transport = Transport()
        ..wrongHardware = option == 'hardware'
        ..sameVersion = option == 'version';
      await expectLater(
          runOta(transport, OtaPackage.validate(firmware, manifest()),
              (_, __) {}, () => false,
              delay: noDelay),
          throwsStateError);
      expect(transport.controls, isEmpty);
      expect(transport.subscriptions.where((value) => value), isEmpty);
    }
  });
  test(
      'contract START, negotiated chunk bound, commit then actual reboot version',
      () async {
    final transport = Transport(), progress = <int>[];
    await runOta(transport, OtaPackage.validate(firmware, manifest()),
        (p, _) => progress.add(p), () => false,
        delay: noDelay);
    expect(transport.ops, ['start', 'commit']);
    expect(transport.controls.first, {
      'op': 'start',
      'target': 'lightble-peripheral',
      'hardware': 'esp32-s3',
      'target_version': '1.2.0',
      'size': firmware.length,
      'chunk_size': 20,
      'sha256': manifest()['sha256']
    });
    expect(transport.chunks.expand((c) => c).toList(), firmware);
    expect(transport.chunks.every((c) => c.length <= 11), isTrue);
    expect(transport.rebooted, isTrue);
    expect(progress.last, 100);
    expect(progress.take(progress.length - 1).every((p) => p < 100), isTrue);
  });
  test('subscription failure never writes START', () async {
    final transport = Transport()..subscribeFails = true;
    await expectLater(
        runOta(transport, OtaPackage.validate(firmware, manifest()), (_, __) {},
            () => false,
            delay: noDelay),
        throwsStateError);
    expect(transport.controls, isEmpty);
  });
  test('missing ready or success times out and attempts abort', () async {
    for (final missing in ['ready', 'success']) {
      final transport = Transport()
        ..ready = missing != 'ready'
        ..success = missing != 'success';
      final progress = <int>[];
      await expectLater(
          runOta(transport, OtaPackage.validate(firmware, manifest()),
              (p, _) => progress.add(p), () => false,
              delay: noDelay, timeout: const Duration(milliseconds: 80)),
          throwsA(isA<TimeoutException>()));
      expect(progress, isNot(contains(100)));
      expect(transport.ops.last, 'abort');
      if (missing == 'ready') expect(transport.chunks, isEmpty);
    }
  });
  test('error message containing ready/success never acknowledges transaction',
      () async {
    final transport = Transport()..errorWithSuccessMessage = true;
    await expectLater(
        runOta(transport, OtaPackage.validate(firmware, manifest()), (_, __) {},
            () => false,
            delay: noDelay, timeout: const Duration(milliseconds: 200)),
        throwsStateError);
    expect(transport.chunks, isEmpty);
    expect(transport.ops.last, 'abort');
  });
  test('premature success during data cannot satisfy commit', () async {
    final transport = Transport()
      ..prematureSuccess = true
      ..success = false;
    await expectLater(
        runOta(transport, OtaPackage.validate(firmware, manifest()), (_, __) {},
            () => false,
            delay: noDelay, timeout: const Duration(milliseconds: 80)),
        throwsA(isA<TimeoutException>()));
    expect(transport.ops.last, 'abort');
  });
  test('write failure/cancel/disconnect never commit or report completed',
      () async {
    for (final option in ['write', 'cancel', 'disconnect']) {
      var cancelled = false;
      final transport = Transport()
        ..dataFails = option == 'write'
        ..disconnectDuringData = option == 'disconnect';
      if (option == 'cancel') {
        transport.onData = () {
          cancelled = true;
        };
      }
      final progress = <int>[];
      await expectLater(
          runOta(transport, OtaPackage.validate(firmware, manifest()),
              (p, _) => progress.add(p), () => cancelled,
              delay: noDelay),
          throwsStateError);
      expect(transport.ops, isNot(contains('commit')));
      expect(progress, isNot(contains(100)));
    }
  });
  test('committed receipt with wrong actual version never completes', () async {
    final transport = Transport()..wrongVersion = true;
    final progress = <int>[];
    await expectLater(
        runOta(transport, OtaPackage.validate(firmware, manifest()),
            (p, _) => progress.add(p), () => false,
            delay: noDelay),
        throwsStateError);
    expect(transport.ops, ['start', 'commit']);
    expect(progress, isNot(contains(100)));
  });
  test('success receipt without actual reboot disconnect never completes',
      () async {
    final transport = Transport()..noReboot = true;
    final progress = <int>[];
    await expectLater(
        runOta(transport, OtaPackage.validate(firmware, manifest()),
            (p, _) => progress.add(p), () => false,
            delay: noDelay, timeout: const Duration(milliseconds: 80)),
        throwsA(isA<TimeoutException>()));
    expect(transport.rebooted, isFalse);
    expect(progress, isNot(contains(100)));
  });
  test('cancel after commit before reboot cannot become completed', () async {
    final transport = Transport()..noReboot = true;
    var cancelled = false;
    final progress = <int>[];
    await expectLater(
        runOta(transport, OtaPackage.validate(firmware, manifest()),
            (p, message) {
          progress.add(p);
          if (message.contains('等待重启')) cancelled = true;
        }, () => cancelled, delay: noDelay),
        throwsStateError);
    expect(transport.rebooted, isFalse);
    expect(progress, isNot(contains(100)));
  });
}
