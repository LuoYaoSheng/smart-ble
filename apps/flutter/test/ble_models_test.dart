import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/models/ble_scan_result.dart';

void main() {
  group('BleScanResult filtering logic', () {
    final DateTime now = DateTime.now();

    final BleScanResult deviceA = BleScanResult(
      deviceId: '00:11:22:33:44:55',
      name: 'SmartBle_Device',
      rssi: -50,
      timestamp: now,
    );

    final BleScanResult deviceB = BleScanResult(
      deviceId: '66:77:88:99:AA:BB',
      name: '',
      rssi: -85,
      timestamp: now,
    );

    test('displayName returns correctly for named and unnamed devices', () {
      expect(deviceA.displayName, 'SmartBle_Device');
      expect(deviceB.displayName, '未知设备');
    });

    test('matchesNamePrefix correctly ignores case and filters', () {
      expect(deviceA.matchesNamePrefix('smart'), isTrue);
      expect(deviceA.matchesNamePrefix('SMART'), isTrue);
      expect(deviceA.matchesNamePrefix('Ble'), isFalse);
      expect(deviceA.matchesNamePrefix(''), isTrue); // Empty prefix matches all
      expect(deviceA.matchesNamePrefix(null), isTrue);

      expect(deviceB.matchesNamePrefix('smart'), isFalse);
    });

    test('matchesRssiThreshold handles negative values accurately', () {
      expect(deviceA.matchesRssiThreshold(-60), isTrue); // -50 >= -60
      expect(deviceA.matchesRssiThreshold(-40), isFalse); // -50 < -40
      
      expect(deviceB.matchesRssiThreshold(-80), isFalse); // -85 < -80
      expect(deviceB.matchesRssiThreshold(-90), isTrue); // -85 >= -90
    });
  });
}
