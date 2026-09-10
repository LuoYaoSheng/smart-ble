import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/device_display_name.dart';
import 'package:smart_ble/core/models/ble_device.dart';
import 'package:smart_ble/core/models/ble_scan_result.dart';

void main() {
  group('resolveDeviceDisplayName（F005 批准链）', () {
    test('name 优先', () {
      final r = resolveDeviceDisplayName(
          deviceId: 'AA:BB:CC:DD:EE:FF', name: 'LightBLE-1', advName: 'adv');
      expect(r.displayName, 'LightBLE-1');
      expect(r.source, 'deviceName');
    });

    test('name 空 → advName（平台 localName，AD 0x09/0x08 投影）', () {
      final r = resolveDeviceDisplayName(
          deviceId: 'AA:BB:CC:DD:EE:FF', name: '', advName: 'SHID-AB12CD34');
      expect(r.displayName, 'SHID-AB12CD34');
      expect(r.source, 'localName');
      expect(r.confidence, 'high');
    });

    test('profileName 兜底', () {
      final r = resolveDeviceDisplayName(
          deviceId: 'x', name: '', advName: ' ', profileName: 'Smart HID');
      expect(r.displayName, 'Smart HID');
      expect(r.source, 'profile');
    });

    test('全空 → 未命名 BLE · ID后四位（永不「未知设备」）', () {
      final r = resolveDeviceDisplayName(
          deviceId: 'AA:BB:CC:DD:EE:FF', name: null, advName: null);
      expect(r.displayName, '未命名 BLE · EEFF');
      expect(r.source, 'deviceId');
      expect(r.confidence, 'low');
    });

    test('超长名截断到 128', () {
      final r = resolveDeviceDisplayName(deviceId: 'x', name: 'a' * 200);
      expect(r.displayName.length, 128);
    });

    test('空白名视为空', () {
      final r = resolveDeviceDisplayName(
          deviceId: '11:22:33:44:55:66', name: '   ', advName: '');
      expect(r.displayName, '未命名 BLE · 5566');
    });
  });

  group('BleScanResult.displayName / matchesNamePrefix', () {
    BleScanResult result(
            {String name = '', String advName = '', String id = 'AA:BB:CC:DD:EE:FF'}) =>
        BleScanResult(
          deviceId: id,
          name: name,
          rssi: -50,
          advName: advName,
          timestamp: DateTime.now(),
        );

    test('仅广播名设备显示 advName', () {
      expect(result(advName: 'SHID-AB12CD34').displayName, 'SHID-AB12CD34');
    });

    test('无名无广播名 → 未命名 BLE · 后四位', () {
      expect(result().displayName, '未命名 BLE · EEFF');
    });

    test('前缀过滤按显示名命中（SHID 只在广播名里）', () {
      final device = result(name: '', advName: 'SHID-AB12CD34');
      expect(device.matchesNamePrefix('shid'), isTrue);
      expect(device.matchesNamePrefix('light'), isFalse);
      expect(device.matchesNamePrefix(''), isTrue);
      expect(device.matchesNamePrefix(null), isTrue);
    });
  });

  group('BleDevice.displayName（已连接模型同口径）', () {
    test('空名 → 未命名 BLE · ID后四位', () {
      final device = BleDevice(
        id: '11:22:33:44:55:66',
        name: '',
        rssi: -40,
        serviceUuids: const [],
        state: BleDeviceState.connected,
        lastSeen: DateTime.now(),
      );
      expect(device.displayName, '未命名 BLE · 5566');
    });
  });
}
