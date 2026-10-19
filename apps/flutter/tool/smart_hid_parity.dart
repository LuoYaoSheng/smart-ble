// tool/smart_hid_parity.dart —— Smart HID V1 跨平台协议向量执行器（Dart 线）。
//
// 输入：core/protocols/smart-hid-v1-vectors.json（跨语言单源向量，勿在此另写用例）。
// 输出：stdout 单行 `@@PARITY@@ {json}`，由 scripts/check-platform-parity.mjs 解析。
// 覆盖：constants / qr / candidate / framingMtu / frames / deviceInfo / status。
// errorRecovery 线为 js/kotlin（恢复映射不在 Dart 镜像职责内）。
//
// 运行：cd apps/flutter && dart run tool/smart_hid_parity.dart ../../core/protocols/smart-hid-v1-vectors.json

import 'dart:convert';
import 'dart:io';

import 'package:smart_ble/core/protocols/hid_provisioning_protocol.dart';
import 'package:smart_ble/core/ble/provisioning_framing.dart';

void main(List<String> args) {
  if (args.isEmpty) {
    stderr.writeln('usage: dart run tool/smart_hid_parity.dart <vectors.json>');
    exit(2);
  }
  final vectors =
      jsonDecode(File(args[0]).readAsStringSync()) as Map<String, dynamic>;
  final constants = vectors['constants'] as Map<String, dynamic>;
  final suites = vectors['suites'] as Map<String, dynamic>;
  final results = <Map<String, dynamic>>[];
  var totalPass = 0;
  var totalFail = 0;

  void record(String suite, String id, bool pass, String detail) {
    if (pass) {
      totalPass++;
    } else {
      totalFail++;
      results.add({
        'suite': suite,
        'case': id,
        'detail': detail,
      });
    }
  }

  // ---------- constants ----------
  final c = constants;
  final frame = c['frame'] as Map<String, dynamic>;
  final constChecks = <String, bool>{
    'serviceUuid': smartHidProvisioningServiceUuid == c['serviceUuid'],
    'charInfo': SmartHidCharacteristicUuids.info ==
        (c['characteristicUuids'] as Map)['info'],
    'charInput': SmartHidCharacteristicUuids.input ==
        (c['characteristicUuids'] as Map)['input'],
    'charStatus': SmartHidCharacteristicUuids.status ==
        (c['characteristicUuids'] as Map)['status'],
    'namePrefix': smartHidNamePrefix == c['namePrefix'],
    'protocolVersion':
        ProvisioningConstants.protocolVersion == c['protocolVersion'],
    'candidateVersion':
        ProvisioningConstants.candidateVersion == c['candidateVersion'],
    'deviceIdPattern':
        ProvisioningConstants.deviceIdPattern.pattern == c['deviceIdPattern'],
    'deviceNamePattern': ProvisioningConstants.deviceNamePattern.pattern ==
        c['deviceNamePattern'],
    'tokenPattern':
        ProvisioningConstants.tokenPattern.pattern == c['tokenPattern'],
    'qrScheme': ProvisioningConstants.qrScheme == c['qrScheme'],
    'defaultPairingPort':
        ProvisioningConstants.defaultPairingPort == c['defaultPairingPort'],
    'frameHeaderSize': frameHeaderSize == frame['headerSize'],
    'maxChunkBytes': maxChunkBytes == frame['maxChunkBytes'],
    'maxAssembledBytes': maxAssembledBytes == frame['maxAssembledBytes'],
    'maxFrames': maxFrames == frame['maxFrames'],
    'defaultAttMtu': defaultAttMtu == frame['defaultAttMtu'],
  };
  constChecks.forEach((id, pass) =>
      record('constants', id, pass, pass ? '' : 'constant mismatch'));

  // ---------- qr ----------
  for (final case_ in (suites['qr'] as Map)['cases'] as List) {
    final m = case_ as Map<String, dynamic>;
    final id = m['id'] as String;
    final expect = m['expect'] as Map<String, dynamic>;
    try {
      final got = parsePairingQrPayload(m['input'] as String);
      final ok = expect['ok'] == true;
      if (!ok) {
        record('qr', id, got == null, 'expected null, got $got');
      } else if (got == null) {
        record('qr', id, false, 'expected payload, got null');
      } else {
        record(
            'qr',
            id,
            got.token == expect['token'] &&
                got.host == expect['host'] &&
                got.port == expect['port'],
            'got token=${got.token} host=${got.host} port=${got.port}');
      }
    } catch (e) {
      record('qr', id, false, 'unexpected throw: $e');
    }
  }

  // ---------- candidate ----------
  for (final case_ in (suites['candidate'] as Map)['cases'] as List) {
    final m = case_ as Map<String, dynamic>;
    final id = m['id'] as String;
    final expect = m['expect'] as Map<String, dynamic>;
    final input = m['input'] as Map<String, dynamic>;
    try {
      final got = buildProvisionCandidateJson(ProvisionCandidateInput(
        wifiSsid: input['wifi_ssid'] as String,
        wifiPassword: input['wifi_password'] as String,
        hubHost: input['hub_host'] as String,
        hubPort: input['hub_port'] as int?,
        token: input['token'] as String,
      ));
      if (expect['ok'] == true) {
        record('candidate', id, got == expect['json'],
            'expected ${expect['json']}, got $got');
      } else {
        record('candidate', id, false, 'expected throw, got $got');
      }
    } catch (e) {
      record('candidate', id, expect['ok'] != true,
          expect['ok'] == true ? 'unexpected throw: $e' : '');
    }
  }

  // ---------- framingMtu ----------
  for (final case_ in (suites['framingMtu'] as Map)['cases'] as List) {
    final m = case_ as Map<String, dynamic>;
    final id = m['id'] as String;
    final got = chunkSizeForMtu((m['mtu'] as num).toInt());
    record('framingMtu', id, got == m['expect'],
        'mtu ${m['mtu']} -> $got, expect ${m['expect']}');
  }

  // ---------- frames ----------
  String byteHex(int b) => b.toRadixString(16).padLeft(2, '0');
  String listHex(List<int> bytes) => bytes.map(byteHex).join();
  for (final case_ in (suites['frames'] as Map)['cases'] as List) {
    final m = case_ as Map<String, dynamic>;
    final id = m['id'] as String;
    final expect = m['expect'] as Map<String, dynamic>;
    List<int> payload;
    if (m.containsKey('payloadHex')) {
      final hex = (m['payloadHex'] as String);
      payload = [
        for (var i = 0; i + 1 < hex.length; i += 2)
          int.parse(hex.substring(i, i + 2), radix: 16)
      ];
    } else {
      final fill = m['fill'] as Map<String, dynamic>;
      final byte = int.parse(fill['byte'] as String, radix: 16);
      payload = List<int>.filled(fill['length'] as int, byte);
    }
    try {
      final got = buildFrames(payload, (m['chunkSize'] as num).toInt());
      if (expect['ok'] == true) {
        final gotHex = got.map((f) => listHex(f)).toList();
        final expectFrames = (expect['frames'] as List).cast<String>();
        record('frames', id, ListEquality().equals(gotHex, expectFrames),
            'got $gotHex, expect $expectFrames');
      } else {
        record('frames', id, false, 'expected throw, got frames');
      }
    } catch (e) {
      record('frames', id, expect['ok'] != true,
          expect['ok'] == true ? 'unexpected throw: $e' : '');
    }
  }

  // ---------- deviceInfo ----------
  for (final case_ in (suites['deviceInfo'] as Map)['cases'] as List) {
    final m = case_ as Map<String, dynamic>;
    final id = m['id'] as String;
    final expect = m['expect'] as Map<String, dynamic>;
    try {
      final got = parseDeviceInfo(m['input'] as String);
      if (expect['ok'] != true) {
        record('deviceInfo', id, got == null, 'expected null, got $got');
      } else if (got == null) {
        record('deviceInfo', id, false, 'expected payload, got null');
      } else {
        record(
            'deviceInfo',
            id,
            got.product == expect['product'] &&
                got.protocol == expect['protocol'] &&
                got.deviceId == expect['device_id'] &&
                got.firmware == expect['firmware'] &&
                got.state == expect['state'] &&
                got.provisioned == expect['provisioned'],
            'got $got');
      }
    } catch (e) {
      record('deviceInfo', id, false, 'unexpected throw: $e');
    }
  }

  // ---------- status ----------
  for (final case_ in (suites['status'] as Map)['cases'] as List) {
    final m = case_ as Map<String, dynamic>;
    final id = m['id'] as String;
    final expect = m['expect'] as Map<String, dynamic>;
    try {
      final got = parseProvisionStatus(m['input'] as String);
      if (expect['ok'] != true) {
        record('status', id, got == null, 'expected null, got $got');
      } else if (got == null) {
        record('status', id, false, 'expected payload, got null');
      } else {
        record(
            'status',
            id,
            got.state == expect['state'] &&
                got.step == expect['step'] &&
                got.error == expect['error'],
            'got $got');
      }
    } catch (e) {
      record('status', id, false, 'unexpected throw: $e');
    }
  }

  stdout.writeln('@@PARITY@@ ${jsonEncode({
        'platform': 'dart',
        'pass': totalPass,
        'fail': totalFail,
        'failures': results,
      })}');
  exit(totalFail == 0 ? 0 : 1);
}

class ListEquality {
  bool equals(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
