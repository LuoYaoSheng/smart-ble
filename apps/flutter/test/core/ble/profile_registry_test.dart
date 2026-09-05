import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/profile_registry.dart';
import 'package:smart_ble/core/models/ble_scan_result.dart';

BleScanResult _device({
  required String id,
  String name = '',
  List<String> uuids = const [],
  String advName = '',
}) {
  return BleScanResult(
    deviceId: id,
    name: name,
    rssi: -55,
    serviceUuids: uuids,
    advName: advName,
    timestamp: DateTime.now(),
  );
}

void main() {
  group('ProfileRegistry matchProfile（口径对齐 profile-contract.js）', () {
    test('广播 Service UUID 命中 → STRONG', () {
      final d = _device(
        id: 'AA:BB:CC:DD:EE:FF',
        name: '任意名字',
        uuids: ['9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'],
      );
      final m = matchProfile(d);
      expect(m, isNotNull);
      expect(m!.level, ProfileMatchLevel.strong);
      expect(m.profile.id, 'smart-hid');
      expect(m.chipLabel, 'Smart HID · 强匹配');
    });

    test('完整 128 位 UUID 大小写不敏感', () {
      final d = _device(
        id: 'AA:BB:CC:DD:EE:FF',
        uuids: ['9F1D1001-E73B-4C8F-9D2A-6F0B5E8A1C04'],
      );
      expect(matchProfile(d)!.level, ProfileMatchLevel.strong);
    });

    test('名称前缀命中（GAP 名）→ WEAK', () {
      final d = _device(id: 'AA:BB:CC:DD:EE:FF', name: 'shid-9f3e2a1c');
      final m = matchProfile(d);
      expect(m, isNotNull);
      expect(m!.level, ProfileMatchLevel.weak);
      expect(m.chipLabel, '疑似 Smart HID · 弱匹配');
    });

    test('Scan Response 本地名（advName）前缀命中 → WEAK', () {
      final d = _device(id: 'AA:BB:CC:DD:EE:FF', advName: 'SHID-9F3E2A1C');
      expect(matchProfile(d)!.level, ProfileMatchLevel.weak);
    });

    test('无关设备 → null', () {
      final d = _device(
          id: 'AA:BB:CC:DD:EE:FF', name: 'Mi Smart Band 8', uuids: ['180f']);
      expect(matchProfile(d), isNull);
    });

    test('STRONG 优先于 WEAK（同设备双信号）', () {
      final d = _device(
        id: 'AA:BB:CC:DD:EE:FF',
        name: 'SHID-9F3E2A1C',
        uuids: ['9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'],
      );
      expect(matchProfile(d)!.level, ProfileMatchLevel.strong);
    });

    test('非本档案 UUID 不误命中', () {
      final d = _device(
          id: 'AA:BB:CC:DD:EE:FF',
          uuids: ['0000ffe0-0000-1000-8000-00805f9b34fb']);
      expect(matchProfile(d), isNull);
    });
  });
}
