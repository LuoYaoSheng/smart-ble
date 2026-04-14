import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/ble_service.dart';
import '../models/ble_scan_result.dart' as models;
import 'ble_manager.dart';

/// 模拟虚拟外设环境 (Mock Environment)
class MockBleAdapter implements BleManager {
  static final MockBleAdapter _instance = MockBleAdapter._internal();
  factory MockBleAdapter() => _instance;

  MockBleAdapter._internal() {
    _stateController = StreamController<BleState>.broadcast();
    _scanResultsController = StreamController<List<models.BleScanResult>>.broadcast();
    _connectionStatesController = StreamController<Map<String, BleConnectionState>>.broadcast();
    
    // 初始化直接处于开启状态
    _stateController.add(BleState.on);
  }

  late final StreamController<BleState> _stateController;
  late final StreamController<List<models.BleScanResult>> _scanResultsController;
  late final StreamController<Map<String, BleConnectionState>> _connectionStatesController;

  final Map<String, models.BleScanResult> _mockDevices = {};
  final Map<String, BleConnectionState> _connectionStates = {};
  Timer? _scanTimer;
  Timer? _curveTimer; // 用于生成假温度流

  @override
  bool get isScanning => _scanTimer?.isActive ?? false;

  @override
  Stream<BleState> get stateStream => _stateController.stream;

  @override
  Stream<List<models.BleScanResult>> get scanResultsStream => _scanResultsController.stream;

  @override
  Stream<Map<String, BleConnectionState>> get connectionStatesStream => _connectionStatesController.stream;

  @override
  BleConnectionState connectionStateFor(String deviceId) => _connectionStates[deviceId] ?? BleConnectionState.disconnected;

  @override
  bool isDeviceConnected(String deviceId) => connectionStateFor(deviceId) == BleConnectionState.connected;

  @override
  List<String> get connectedDeviceIds => _connectionStates.entries
      .where((e) => e.value == BleConnectionState.connected)
      .map((e) => e.key)
      .toList();

  @override
  List<BleService> servicesFor(String deviceId) {
    if (!isDeviceConnected(deviceId)) return [];
    return [
      BleService(
        uuid: "180A",
        isPrimary: true,
        name: "Device Information",
        characteristics: [
          BleCharacteristic(
            uuid: "2A29",
            serviceUuid: "180A",
            properties: [BleCharacteristicProperty.read],
            name: "Manufacturer Name String",
          )
        ],
      ),
      BleService(
        uuid: "1809",
        isPrimary: true,
        name: "Health Thermometer",
        characteristics: [
          BleCharacteristic(
            uuid: "2A1E",
            serviceUuid: "1809",
            properties: [BleCharacteristicProperty.read, BleCharacteristicProperty.notify],
            name: "Temperature Measurement",
          )
        ],
      ),
    ];
  }

  @override
  Future<bool> initialize() async {
    debugPrint("======== 🚨 MOCK BLE MODE INITIALIZED 🚨 ========");
    return true;
  }

  @override
  Future<BleState> getState() async => BleState.on;

  @override
  Future<void> startScan({Duration timeout = const Duration(seconds: 5), List<String>? serviceUuids}) async {
    debugPrint("[MOCK] starts scanning...");
    _mockDevices.clear();
    
    // 发出第一批虚拟设备
    _mockDevices['MOCK-AA:BB:CC:DD:EE:01'] = models.BleScanResult(
      deviceId: 'MOCK-AA:BB:CC:DD:EE:01',
      name: 'SmartBLE-Watch M1',
      rssi: -45,
      timestamp: DateTime.now(),
      serviceUuids: ['180A', '1809'],
    );
    _mockDevices['MOCK-11:22:33:44:55:66'] = models.BleScanResult(
      deviceId: 'MOCK-11:22:33:44:55:66',
      name: 'SmartBLE-Sensors',
      rssi: -60,
      timestamp: DateTime.now(),
      serviceUuids: ['180F'],
    );
    _scanResultsController.add(_mockDevices.values.toList());

    _scanTimer = Timer(timeout, stopScan);
  }

  @override
  Future<void> stopScan() async {
    debugPrint("[MOCK] stops scanning...");
    _scanTimer?.cancel();
    _scanTimer = null;
  }

  @override
  Future<void> connect(String deviceId, {Duration timeout = const Duration(seconds: 30)}) async {
    debugPrint("[MOCK] connecting to $deviceId...");
    _updateConnectionState(deviceId, BleConnectionState.connecting);

    await Future.delayed(const Duration(milliseconds: 800)); // 模拟握手耗时
    
    _updateConnectionState(deviceId, BleConnectionState.connected);
    debugPrint("[MOCK] connected successfully to $deviceId");
  }

  @override
  Future<void> disconnect(String deviceId) async {
    debugPrint("[MOCK] disconnecting from $deviceId");
    _updateConnectionState(deviceId, BleConnectionState.disconnected);
  }

  @override
  Future<void> disconnectAll() async {
    for (var key in _connectionStates.keys) {
      _connectionStates[key] = BleConnectionState.disconnected;
    }
    _connectionStatesController.add(Map.from(_connectionStates));
  }

  @override
  Future<List<BleService>> discoverServices(String deviceId) async {
    debugPrint("[MOCK] discovering services...");
    await Future.delayed(const Duration(milliseconds: 500));
    return servicesFor(deviceId);
  }

  @override
  Future<List<int>> readCharacteristic({required String deviceId, required String serviceUuid, required String characteristicUuid}) async {
    debugPrint("[MOCK] read characteristic $characteristicUuid");
    await Future.delayed(const Duration(milliseconds: 200));
    if (characteristicUuid.toLowerCase() == "2a29") {
      return "Mock Manufacturer LLC".codeUnits;
    }
    return [0x01, 0x02, 0x03];
  }

  @override
  Future<void> writeCharacteristic({required String deviceId, required String serviceUuid, required String characteristicUuid, required List<int> data, bool withoutResponse = false}) async {
    debugPrint("[MOCK] writing to $characteristicUuid: $data");
    await Future.delayed(const Duration(milliseconds: 100));
  }

  final Map<String, StreamController<List<int>>> _notifyStreams = {};

  @override
  Future<void> setNotification({required String deviceId, required String serviceUuid, required String characteristicUuid, required bool enable}) async {
    debugPrint("[MOCK] Set notification $enable for $characteristicUuid");
    final key = "$deviceId::$characteristicUuid";
    if (enable) {
      if (!_notifyStreams.containsKey(key)) {
        _notifyStreams[key] = StreamController<List<int>>.broadcast();
      }
      if (characteristicUuid.toLowerCase() == "2a1e") {  // 假装是温度特征值
        _curveTimer?.cancel();
        int baseTemp = 2500;
        _curveTimer = Timer.periodic(const Duration(milliseconds: 800), (t) {
          baseTemp += (t.tick % 5) - 2; // 产生波动
          // MOCK a BLE Temperature Byte array
          final val = [(baseTemp >> 8) & 0xFF, baseTemp & 0xFF, 0x00, 0x00];
          _notifyStreams[key]?.add(val);
        });
      }
    } else {
      _curveTimer?.cancel();
      _notifyStreams[key]?.close();
      _notifyStreams.remove(key);
    }
  }

  @override
  Stream<List<int>>? listenCharacteristicValue({required String deviceId, required String serviceUuid, required String characteristicUuid}) {
    final key = "$deviceId::$characteristicUuid";
    return _notifyStreams[key]?.stream;
  }

  @override
  Future<void> requestMtu(String deviceId, int desiredMtu) async {
    debugPrint("[MOCK] Request MTU = $desiredMtu (granted locally)");
  }

  void _updateConnectionState(String deviceId, BleConnectionState state) {
    _connectionStates[deviceId] = state;
    _connectionStatesController.add(Map.from(_connectionStates));
  }

  @override
  Future<void> dispose() async {
    _curveTimer?.cancel();
    _scanTimer?.cancel();
  }
}
