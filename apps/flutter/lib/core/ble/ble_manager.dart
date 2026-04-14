import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/ble_service.dart';
import '../models/ble_scan_result.dart' as models;
import 'flutter_blue_adapter.dart';
import 'mock_ble_adapter.dart';

/// BLE 状态
enum BleState {
  unknown,
  unavailable,
  unauthorized,
  turningOn,
  on,
  turningOff,
  off,
}

/// 统一的蓝牙连接状态（不依赖特定库）
enum BleConnectionState {
  disconnected,
  disconnecting,
  connected,
  connecting,
}

/// 蓝牙管理器抽象层（Facade Pattern）
/// 自动根据环境注入实体底层（FlutterBlue）或是虚拟环境（MockAdapter）
abstract class BleManager {
  static const bool useMockBLE = bool.fromEnvironment('MOCK_BLE', defaultValue: false);
  static BleManager? _instance;

  static BleManager get instance {
    if (_instance == null) {
      if (useMockBLE) {
        debugPrint('[BleManager] 🛡️ Using MockBleAdapter for virtual demonstration.');
        _instance = MockBleAdapter();
      } else {
        debugPrint('[BleManager] 🔵 Using FlutterBlueAdapter on real hardware.');
        _instance = FlutterBlueAdapter();
      }
    }
    return _instance!;
  }

  factory BleManager() => instance;

  bool get isScanning;
  Stream<BleState> get stateStream;
  Stream<List<models.BleScanResult>> get scanResultsStream;
  Stream<Map<String, BleConnectionState>> get connectionStatesStream;

  BleConnectionState connectionStateFor(String deviceId);
  bool isDeviceConnected(String deviceId);
  List<String> get connectedDeviceIds;
  List<BleService> servicesFor(String deviceId);

  Future<bool> initialize();
  Future<BleState> getState();

  Future<void> startScan({
    Duration timeout = const Duration(seconds: 5),
    List<String>? serviceUuids,
  });
  Future<void> stopScan();

  Future<void> connect(String deviceId, {Duration timeout = const Duration(seconds: 30)});
  Future<void> disconnect(String deviceId);
  Future<void> disconnectAll();

  Future<List<BleService>> discoverServices(String deviceId);

  Future<List<int>> readCharacteristic({
    required String deviceId,
    required String serviceUuid,
    required String characteristicUuid,
  });

  Future<void> writeCharacteristic({
    required String deviceId,
    required String serviceUuid,
    required String characteristicUuid,
    required List<int> data,
    bool withoutResponse = false,
  });

  Future<void> setNotification({
    required String deviceId,
    required String serviceUuid,
    required String characteristicUuid,
    required bool enable,
  });

  Future<void> requestMtu(String deviceId, int desiredMtu);

  Stream<List<int>>? listenCharacteristicValue({
    required String deviceId,
    required String serviceUuid,
    required String characteristicUuid,
  });

  Future<void> dispose();
}
