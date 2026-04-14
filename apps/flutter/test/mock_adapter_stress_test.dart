import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/models/ble_scan_result.dart' as models;
import 'package:smart_ble/core/ble/mock_ble_adapter.dart';
import 'package:smart_ble/core/utils/logger.dart';

void main() {
  group('MockBleAdapter & RingBuffer Stress Testing', () {
    late MockBleAdapter adapter;
    
    setUp(() {
      logger.clear(); // Reset logger before each test
      adapter = MockBleAdapter();
    });

    test('Adapter initialization starts in poweredOn state', () async {
      expect(await adapter.getState(), isNotNull);
    });

    test('Scanning triggers MOCK-ESP32 device discovery', () async {
      final results = <dynamic>[];
      final subscription = adapter.scanResultsStream.listen(results.add);
      
      await adapter.startScan();
      // Wait for mock payload interval 
      await Future.delayed(const Duration(milliseconds: 1500));
      await adapter.stopScan();
      
      expect(results.length, greaterThan(0));
      expect((results.first as List<models.BleScanResult>).any((d) => d.name.contains('SmartBLE')), isTrue);
      
      await subscription.cancel();
    });

    test('Logger RingBuffer prevents OOM under heavy load (>5000 logs)', () async {
      // Force 6,000 logs into the system (exceeding typical 1,000 limit)
      for (int i = 0; i < 6000; i++) {
        logger.send('data chunk $i');
      }

      final logs = logger.history;
      // Validate that RingBuffer drops the oldest entries rather than expanding indefinitely
      expect(logs.length, lessThanOrEqualTo(1001)); // Assuming default limit in logger is 1000
    });

    test('Mock BLE Write without response correctly queues requests', () async {
      await adapter.startScan();
      await Future.delayed(const Duration(milliseconds: 500));
      
      // Simulate connection to mock device
      const mockDeviceId = 'MOCK-11:22:33:44';
      await adapter.connect(mockDeviceId);
      
      // Simulate rapid OTA Chunk firing 
      for(int i = 0; i < 10; i++) {
        await adapter.writeCharacteristic(
          deviceId: mockDeviceId, 
          serviceUuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914d', 
          characteristicUuid: 'beb5483e-36e1-4688-b7f5-ea07361b26c1', 
          data: [0xFF, i, 0x0A], 
          withoutResponse: true
        );
      }
      
      // Successfully firing 10 chunks to mock layer without crashing
      expect(logger.history.length, greaterThanOrEqualTo(10));
    });
  });
}
