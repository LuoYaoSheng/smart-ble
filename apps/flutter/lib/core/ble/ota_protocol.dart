import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';

/// Local package validation always precedes BLE side effects.
class OtaPackage {
  final String target, hardware, version, hash;
  final List<int> bytes;
  OtaPackage._(this.target, this.hardware, this.version, this.hash, this.bytes);

  static OtaPackage validate(List<int> firmware, Object? manifest) {
    const keys = {
      'format_version',
      'target',
      'hardware',
      'firmware_version',
      'size',
      'sha256'
    };
    if (manifest is! Map ||
        manifest.length != keys.length ||
        !keys.every(manifest.containsKey)) {
      throw const FormatException('请选择固件及完整的六字段 manifest');
    }
    final version = manifest['firmware_version'];
    final hardware = manifest['hardware'];
    final target = manifest['target'];
    final hash = manifest['sha256'];
    if (manifest['format_version'] is! int ||
        manifest['format_version'] != 1 ||
        !['lightble-peripheral', 'lightble-observer'].contains(target) ||
        hardware is! String ||
        hardware.trim().isEmpty ||
        version is! String ||
        !RegExp(r'^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$')
            .hasMatch(version)) {
      throw const FormatException('manifest 格式、目标、硬件或版本无效');
    }
    if (firmware.isEmpty ||
        manifest['size'] is! int ||
        manifest['size'] != firmware.length) {
      throw const FormatException('manifest size 与固件实测不符');
    }
    if (hash is! String ||
        !RegExp(r'^[0-9a-f]{64}$').hasMatch(hash) ||
        sha256.convert(firmware).toString() != hash) {
      throw const FormatException('manifest SHA256 与固件实测不符');
    }
    return OtaPackage._(target as String, hardware, version, hash,
        List<int>.unmodifiable(firmware));
  }
}

abstract class OtaTransport {
  bool get connected;
  int get chunkSize;
  Stream<List<int>> get statuses;
  Stream<bool> get connectionStates;
  Future<void> subscribe(bool enabled);
  Future<void> writeControl(List<int> value);
  Future<void> writeData(List<int> value);
  Future<Map<String, dynamic>> readInfo();
  Future<void> reconnect();
}

/// SUCCESS confirms flash commit, not the running image. Complete only after
/// a fresh connection reports the actual compiled firmware version.
Future<void> runOta(OtaTransport transport, OtaPackage package,
    void Function(int, String) progress, bool Function() cancelled,
    {Duration timeout = const Duration(seconds: 30),
    Future<void> Function(Duration) delay = Future<void>.delayed}) async {
  var phase = 'preparing', started = false, committed = false;
  Object? failure;
  var flashReceiptSeen = false, rebootDisconnected = false;
  final connectionSubscription = transport.connectionStates.listen((connected) {
    if (connected) return;
    if (flashReceiptSeen) {
      rebootDisconnected = true;
    } else {
      failure = StateError('OTA 传输期间连接断开，升级结果未确认');
    }
  });
  Completer<Map<String, dynamic>>? waiting;
  String? expected;
  final subscription = transport.statuses.listen((bytes) {
    try {
      final frame = jsonDecode(utf8.decode(bytes));
      if (frame is! Map<String, dynamic> || frame['type'] != 'ota') return;
      final status = frame['status'];
      if (['error', 'failed', 'failure', 'aborted'].contains(status)) {
        failure = StateError(
            '设备拒绝 OTA：${frame['detail'] ?? frame['message'] ?? status}');
      } else if (waiting != null &&
          !waiting.isCompleted &&
          expected == status &&
          (status == 'ready' && phase == 'waiting_ready' ||
              status == 'success' && phase == 'committing')) {
        if (status == 'success') flashReceiptSeen = true;
        waiting.complete(frame);
      }
    } catch (_) {
      /* Malformed or unrelated notifications cannot acknowledge OTA. */
    }
  }, onError: (Object error) {
    failure = error;
  });
  void check({bool requireConnection = true}) {
    if (cancelled()) throw StateError('用户已取消 OTA');
    if (failure != null) throw failure!;
    if (requireConnection && !transport.connected && !committed) {
      throw StateError('设备已断开，升级结果未确认');
    }
  }

  Future<T> checked<T>(Future<T> operation,
      {bool requireConnection = true}) async {
    final complete = Completer<T>();
    final poll = Timer.periodic(const Duration(milliseconds: 50), (_) {
      if (complete.isCompleted) return;
      try {
        check(requireConnection: requireConnection);
      } catch (error, stack) {
        complete.completeError(error, stack);
      }
    });
    operation.then((value) {
      if (!complete.isCompleted) complete.complete(value);
    }, onError: (Object error, StackTrace stack) {
      if (!complete.isCompleted) complete.completeError(error, stack);
    });
    try {
      return await complete.future.timeout(timeout);
    } finally {
      poll.cancel();
    }
  }

  Future<void> command(Map<String, Object> payload) =>
      checked(transport.writeControl(utf8.encode(jsonEncode(payload))));
  void identity(Map<String, dynamic> info) {
    if (info['type'] != 'system_info' ||
        info['firmware_version'] is! String ||
        !RegExp(r'^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$')
            .hasMatch(info['firmware_version'] as String) ||
        info['hardware'] != package.hardware ||
        info['target'] != package.target) {
      throw StateError('固件目标或硬件与设备不符');
    }
  }

  try {
    check();
    final before = await checked(transport.readInfo());
    identity(before);
    if (before['firmware_version'] == package.version) {
      throw StateError('设备已运行同版本固件');
    }
    await checked(transport.subscribe(true));
    check();
    var chunk = min(180, max(1, transport.chunkSize));
    phase = 'waiting_ready';
    expected = 'ready';
    waiting = Completer();
    started = true;
    await command({
      'op': 'start',
      'target': package.target,
      'hardware': package.hardware,
      'target_version': package.version,
      'size': package.bytes.length,
      'chunk_size': chunk,
      'sha256': package.hash
    });
    final ready = await checked(waiting.future);
    final maxChunk = ready['max_chunk'];
    if (maxChunk != null && (maxChunk is! int || maxChunk < 1)) {
      throw StateError('设备返回非法 max_chunk');
    }
    if (maxChunk is int) chunk = min(chunk, maxChunk);
    phase = 'transferring';
    waiting = null;
    for (var offset = 0; offset < package.bytes.length; offset += chunk) {
      check();
      final end = min(offset + chunk, package.bytes.length);
      await checked(transport.writeData(package.bytes.sublist(offset, end)));
      check();
      progress(min(99, end * 100 ~/ package.bytes.length), '正在传输固件');
      await delay(const Duration(milliseconds: 20));
    }
    phase = 'committing';
    expected = 'success';
    waiting = Completer();
    await command({'op': 'commit'});
    await checked(waiting.future);
    committed = true;
    phase = 'verifying';
    waiting = null;
    progress(99, '固件已提交，等待重启并核对实际版本');
    try {
      await checked(transport.subscribe(false), requireConnection: false);
    } catch (_) {/* Reboot can retire the old subscription. */}
    for (var elapsed = 0;
        !rebootDisconnected && elapsed < timeout.inMilliseconds;
        elapsed += 100) {
      check(requireConnection: false);
      if (!transport.connected) {
        rebootDisconnected = true;
        break;
      }
      await delay(const Duration(milliseconds: 100));
    }
    check(requireConnection: false);
    if (!rebootDisconnected) throw TimeoutException('设备提交后未断开重启，不能确认升级完成');
    await delay(const Duration(seconds: 1));
    Object? lastError;
    for (var attempt = 0; attempt < 10; attempt++) {
      check(requireConnection: false);
      try {
        await checked(transport.reconnect(), requireConnection: false);
        final info =
            await checked(transport.readInfo(), requireConnection: false);
        identity(info);
        if (info['firmware_version'] != package.version) {
          throw StateError('固件实际版本不符：${info['firmware_version']}');
        }
        check(requireConnection: false);
        progress(100, '升级完成，实际版本已核验：${package.version}');
        return;
      } catch (error) {
        lastError = error;
      }
      if (attempt < 9) await delay(const Duration(seconds: 1));
    }
    throw StateError('重启后版本核验失败：$lastError');
  } finally {
    if (started && !committed && transport.connected) {
      try {
        await transport
            .writeControl(utf8.encode('{"op":"abort"}'))
            .timeout(const Duration(seconds: 3));
      } catch (_) {}
    }
    try {
      if (transport.connected) {
        await transport.subscribe(false).timeout(const Duration(seconds: 3));
      }
    } catch (_) {}
    await subscription.cancel();
    await connectionSubscription.cancel();
  }
}
