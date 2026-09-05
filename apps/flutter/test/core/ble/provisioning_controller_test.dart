// ProvisioningController 单测 —— Fake 传输上的三阶段状态机/终态/恢复映射
import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/provisioning_controller.dart';
import 'package:smart_ble/core/ble/provisioning_framing.dart';
import 'package:smart_ble/core/ble/provisioning_transport.dart';

const validToken = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const validInfoJson =
    '{"product":"smart-hid","protocol":"1.0","device_id":"HID-5EEDC0DE",'
    '"firmware":"1.2.0-sim","state":"unprovisioned","provisioned":false}';

class FakeTransport implements ProvisioningTransport {
  final statusCtl = StreamController<String>.broadcast();
  final infoCtl = StreamController<String>.broadcast();

  String deviceInfoJson = validInfoJson;
  bool failConnect = false;
  bool bondFails = false;
  Object? nextWriteError;
  int writeCalls = 0;
  int bondCalls = 0;
  final List<Uint8List> written = [];
  void Function()? lostCallback;

  @override
  Future<void> connect(String deviceId, {void Function()? onLost}) async {
    if (failConnect) throw const ProvisioningConnectException('连接超时');
    lostCallback = onLost;
  }

  @override
  int get mtu => 247;

  @override
  Future<String> readDeviceInfo() async => deviceInfoJson;

  @override
  Future<String> readStatus() async =>
      '{"state":"unprovisioned","step":"received","error":null}';

  @override
  Stream<String> get deviceInfoNotifications => infoCtl.stream;

  @override
  Stream<String> get statusNotifications => statusCtl.stream;

  @override
  Future<void> prepareInputWrite() async {
    bondCalls++;
    if (bondFails) {
      throw const ProvisioningWriteException(
          ProvisioningWriteErrorKind.encrypt, '设备配对失败（加密链路未建立）');
    }
  }

  @override
  Future<void> writeFrames(List<Uint8List> frames,
      {Duration interval = const Duration(milliseconds: 30)}) async {
    writeCalls++;
    final err = nextWriteError;
    if (err != null) {
      nextWriteError = null;
      throw err;
    }
    written.addAll(frames);
  }

  @override
  Future<void> close() async {}

  void emit(String json) => statusCtl.add(json);

  void drop() => lostCallback?.call();
}

void main() {
  late FakeTransport fake;

  ProvisioningController makeController({
    Duration timeout = const Duration(seconds: 60),
    Duration retryDelay = const Duration(milliseconds: 10),
  }) {
    fake = FakeTransport();
    return ProvisioningController(
      transportFactory: () => fake,
      statusTimeout: timeout,
      encryptRetryDelay: retryDelay,
    );
  }

  Future<void> pump([int ms = 30]) => Future.delayed(Duration(milliseconds: ms));

  Future<void> connectedController(ProvisioningController c) async {
    await c.connectDevice('10:B4:1D:CD:23:8D');
    await pump(10);
  }

  Future<void> startSubmit(ProvisioningController c) {
    return c.submit(
      wifiSsid: 'MyWiFi',
      wifiPassword: 'pass',
      hubHost: '192.168.1.8',
      hubPort: 17892,
      token: validToken,
    );
  }

  group('连接阶段（F018）', () {
    test('连接 + Device Info 验证通过 → 进入 configure', () async {
      final c = makeController();
      await connectedController(c);
      expect(c.phase, ProvisionPhase.configure);
      expect(c.deviceInfo?.deviceId, 'HID-5EEDC0DE');
      expect(c.connError, isNull);
      c.dispose();
    });

    test('连接失败 → connError 呈现，阶段停留 connect', () async {
      fake = FakeTransport()..failConnect = true;
      final c = ProvisioningController(transportFactory: () => fake);
      await c.connectDevice('x');
      expect(c.connError, contains('连接超时'));
      expect(c.phase, ProvisionPhase.connect);
      c.dispose();
    });

    test('Device Info 身份不符 → 身份验证失败', () async {
      fake = FakeTransport()
        ..deviceInfoJson =
            '{"product":"other","protocol":"1.0","device_id":"HID-5EEDC0DE"}';
      final c = ProvisioningController(transportFactory: () => fake);
      await c.connectDevice('x');
      expect(c.connError, contains('身份验证失败'));
      c.dispose();
    });
  });

  group('下发 → 终态（F021）', () {
    test('七步全走完 → done，四行全 done，帧已写入', () async {
      final c = makeController();
      await connectedController(c);

      final fut = startSubmit(c);
      await pump();
      expect(c.phase, ProvisionPhase.status);
      expect(c.progress['wifi'], ProvisionRowState.active);

      for (final step in [
        'received', 'connecting_wifi', 'wifi_connected',
        'pairing', 'pairing_success', 'mqtt_connecting',
      ]) {
        fake.emit('{"state":"provisioning","step":"$step","error":null}');
        await pump(5);
      }
      fake.emit('{"state":"ready","step":"ready","error":null}');
      await fut;

      expect(c.done, isTrue);
      expect(c.provisioning, isFalse);
      expect(c.progress['wifi'], ProvisionRowState.done);
      expect(c.progress['hub'], ProvisionRowState.done);
      expect(c.progress['conn'], ProvisionRowState.done);
      expect(c.progress['usb'], ProvisionRowState.done);
      // 帧内容 = 按 MTU 247 分帧的 candidate JSON
      expect(fake.written.length, greaterThanOrEqualTo(1));
      final assembled = FrameAssembler();
      Uint8List? payload;
      for (final f in fake.written) {
        payload = assembled.feed(f);
      }
      expect(payload, isNotNull);
      expect(utf8Decode(payload!), contains('"wifi_ssid":"MyWiFi"'));
      expect(utf8Decode(payload), contains('"token":"$validToken"'));
      c.dispose();
    });

    test('校验失败抛 FormatException 且不切阶段', () async {
      final c = makeController();
      await connectedController(c);
      expect(
        () => c.submit(
          wifiSsid: 'x',
          wifiPassword: '',
          hubHost: 'h',
          hubPort: 17892,
          token: 'bad',
        ),
        throwsFormatException,
      );
      expect(c.phase, ProvisionPhase.configure);
      c.dispose();
    });
  });

  group('错误恢复映射（F022）', () {
    Future<ProvisioningController> failWith(String code) async {
      final c = makeController();
      await connectedController(c);
      final fut = startSubmit(c);
      await pump();
      fake.emit('{"state":"provisioning","step":"connecting_wifi","error":null}');
      await pump(5);
      fake.emit('{"state":"error","step":"connecting_wifi","error":"$code"}');
      await fut;
      return c;
    }

    test('wifi_failed → wifi 行失败 + 返回表单', () async {
      final c = await failWith('wifi_failed');
      expect(c.failure!.code, 'wifi_failed');
      expect(c.failure!.row, 'wifi');
      expect(c.failure!.recovery, 'form');
      expect(c.progress['wifi'], ProvisionRowState.fail);
      c.dispose();
    });

    test('pairing_expired → hub 行失败 + 重新扫码', () async {
      final c = await failWith('pairing_expired');
      expect(c.failure!.recovery, 'pairing');
      expect(c.progress['hub'], ProvisionRowState.fail);
      expect(c.progress['wifi'], ProvisionRowState.done);
      c.dispose();
    });

    test('mqtt_invalid → diagnostics；未知码 → retry', () async {
      final c = await failWith('mqtt_invalid');
      expect(c.failure!.recovery, 'diagnostics');
      c.backToForm();
      expect(c.phase, ProvisionPhase.configure);
      expect(c.failure, isNull);
      c.dispose();

      final c2 = await failWith('weird_error');
      expect(c2.failure!.recovery, 'retry');
      c2.dispose();
    });
  });

  group('超时 / 取消 / 断线', () {
    test('终态超时 → timeout 失败（conn 行，可重试）', () async {
      final c = makeController(timeout: const Duration(milliseconds: 120));
      await connectedController(c);
      await startSubmit(c);
      expect(c.failure!.code, 'timeout');
      expect(c.failure!.row, 'conn');
      expect(c.failure!.recovery, 'retry');
      expect(c.provisioning, isFalse);
      c.dispose();
    });

    test('取消等待 → 本地按 timeout 呈现', () async {
      final c = makeController();
      await connectedController(c);
      final fut = startSubmit(c);
      await pump();
      c.cancelWait();
      await fut;
      expect(c.failure!.code, 'timeout');
      expect(c.provisioning, isFalse);
      c.dispose();
    });

    test('configure 阶段断线 → lost 横幅语义', () async {
      final c = makeController();
      await connectedController(c);
      fake.drop();
      expect(c.lost, isTrue);
      c.dispose();
    });

    test('下发中断线 → connection_lost，可重连', () async {
      final c = makeController();
      await connectedController(c);
      final fut = startSubmit(c);
      await pump();
      fake.drop();
      await fut;
      expect(c.failure!.code, 'connection_lost');
      expect(c.failure!.recovery, 'reconnect');
      c.dispose();
    });

    test('写失败 encrypt → 延时后整包重试一次', () async {
      final c = makeController(retryDelay: const Duration(milliseconds: 10));
      await connectedController(c);
      fake.nextWriteError = const ProvisioningWriteException(
          ProvisioningWriteErrorKind.encrypt, 'insufficient authentication');
      final fut = startSubmit(c);
      await pump(40);
      expect(fake.writeCalls, 2); // 首写失败 + 重试
      fake.emit('{"state":"ready","step":"ready","error":null}');
      await fut;
      expect(c.done, isTrue);
      c.dispose();
    });

    test('写失败 disconnect → connection_lost 呈现', () async {
      final c = makeController();
      await connectedController(c);
      fake.nextWriteError = const ProvisioningWriteException(
          ProvisioningWriteErrorKind.disconnect, '10008 not connected');
      await startSubmit(c);
      expect(c.failure!.code, 'connection_lost');
      expect(fake.writeCalls, 1); // disconnect 不重试
      c.dispose();
    });

    test('bond 失败 → 重试一次配对+写入，仍失败 → write_failed 横幅（不卡死）', () async {
      final c = makeController(retryDelay: const Duration(milliseconds: 10));
      await connectedController(c);
      fake.bondFails = true;
      await startSubmit(c);
      expect(fake.bondCalls, 2); // 首次 + encrypt 重试各一次
      expect(fake.writeCalls, 0); // bond 未成，写入从未发生
      expect(c.failure, isNotNull);
      expect(c.failure!.code, 'write_failed');
      expect(c.provisioning, isFalse); // 关键：不滞留在等待态
      c.dispose();
    });
  });
}
