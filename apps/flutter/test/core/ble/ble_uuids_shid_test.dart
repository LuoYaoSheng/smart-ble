import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/ble_manager.dart';
import 'package:smart_ble/core/models/ble_uuids.dart';

/// FWIN-OBS-FIX：O-3 显示名映射（9f1d 家族）+ O-4 INPUT 写护栏
/// （SHID-FW-LOCK-001，与 Q-WIN ble_service.py 同语义）
void main() {
  group('BleUuids · Smart HID 家族显示名（O-3）', () {
    test('9f1d1001 服务映射为 Smart HID 配网服务', () {
      // FBP Guid.toString() 的两种可能形态（带连字符大小写/归一化小写）
      expect(
        BleUuids.getServiceName('9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'),
        'Smart HID 配网服务',
      );
      expect(
        BleUuids.getServiceName('9F1D1001-E73B-4C8F-9D2A-6F0B5E8A1C04'),
        'Smart HID 配网服务',
      );
    });

    test('9f1d1002/1003/1004 特征映射为 INFO/INPUT/STATUS', () {
      expect(
        BleUuids.getCharacteristicName('9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04'),
        '设备信息 (INFO)',
      );
      expect(
        BleUuids.getCharacteristicName('9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04'),
        '配网数据写入 (INPUT)',
      );
      expect(
        BleUuids.getCharacteristicName('9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04'),
        '设备状态 (STATUS)',
      );
    });

    test('标准 16 位短形式映射不受影响（回归）', () {
      expect(BleUuids.getServiceName('1800'), '通用访问');
      expect(BleUuids.getCharacteristicName('2a26'), '固件版本');
    });
  });

  group('BleUuids · INPUT 特征判定（O-4）', () {
    test('大小写与连字符变体均命中', () {
      expect(
        BleUuids.isShidInputCharacteristic('9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04'),
        isTrue,
      );
      expect(
        BleUuids.isShidInputCharacteristic('9F1D1003E73B4C8F9D2A6F0B5E8A1C04'),
        isTrue,
      );
    });

    test('家族内其他特征与无关特征不命中', () {
      expect(
        BleUuids.isShidInputCharacteristic('9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04'),
        isFalse,
      );
      expect(BleUuids.isShidInputCharacteristic('00002a00-0000-1000-8000-00805f9b34fb'),
          isFalse);
    });
  });

  group('BleManager · INPUT 写护栏（O-4，SHID-FW-LOCK-001）', () {
    test('writeCharacteristic 对 INPUT 特征直接拒绝且不触设备', () async {
      final manager = BleManager();
      // 护栏在 FBP 调用之前抛出，无需连接/平台通道
      await expectLater(
        manager.writeCharacteristic(
          deviceId: 'AA:BB:CC:DD:EE:FF',
          serviceUuid: '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04',
          characteristicUuid: '9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04',
          data: [0x01],
        ),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('SHID-FW-LOCK-001'),
          ),
        ),
      );
    });
  });
}
