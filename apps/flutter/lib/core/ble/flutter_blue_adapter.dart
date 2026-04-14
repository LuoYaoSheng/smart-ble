import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:rxdart/rxdart.dart';
import '../models/ble_service.dart';
import '../models/ble_scan_result.dart' as models;
import '../models/ble_uuids.dart';
import 'ble_manager.dart';

/// 原生蓝牙适配器 (基于 flutter_blue_plus)
class FlutterBlueAdapter implements BleManager {
  static final FlutterBlueAdapter _instance = FlutterBlueAdapter._internal();
  factory FlutterBlueAdapter() => _instance;

  FlutterBlueAdapter._internal() {
    _stateController = StreamController<BleState>.broadcast();
    _scanResultsController = StreamController<List<models.BleScanResult>>.broadcast();
    _connectionStatesController = StreamController<Map<String, BleConnectionState>>.broadcast();
  }

  late final StreamController<BleState> _stateController;
  late final StreamController<List<models.BleScanResult>> _scanResultsController;
  late final StreamController<Map<String, BleConnectionState>> _connectionStatesController;

  final Map<String, models.BleScanResult> _scannedDevices = {};
  final Map<String, List<BleService>> _servicesByDevice = {};
  final Map<String, BleConnectionState> _connectionStates = {};
  final Map<String, StreamSubscription> _connectionStateSubs = {};

  bool _isScanning = false;
  bool _isInitialized = false;

  @override
  Stream<BleState> get stateStream => _stateController.stream;

  @override
  Stream<List<models.BleScanResult>> get scanResultsStream =>
      _scanResultsController.stream.debounceTime(const Duration(milliseconds: 300));

  @override
  Stream<Map<String, BleConnectionState>> get connectionStatesStream => _connectionStatesController.stream;

  @override
  BleConnectionState connectionStateFor(String deviceId) => _connectionStates[deviceId] ?? BleConnectionState.disconnected;

  @override
  bool isDeviceConnected(String deviceId) => connectionStateFor(deviceId) == BleConnectionState.connected;

  @override
  List<String> get connectedDeviceIds => _connectionStates.entries
      .where((e) => e.value == BleConnectionState.connected)
      .map((e) => e.key).toList();

  @override
  List<BleService> servicesFor(String deviceId) => List.unmodifiable(_servicesByDevice[deviceId] ?? []);

  @override
  bool get isScanning => _isScanning;

  @override
  Future<bool> initialize() async {
    if (_isInitialized) return true;
    try {
      final isSupported = await FlutterBluePlus.isSupported;
      if (!isSupported) {
        if (!_stateController.isClosed) _stateController.add(BleState.unavailable);
      }

      FlutterBluePlus.adapterState.listen((state) {
        if (!_stateController.isClosed) _stateController.add(_convertState(state));
      });

      FlutterBluePlus.scanResults.listen((results) {
        for (ScanResult r in results) {
          final device = r.device;
          final deviceId = device.remoteId.toString();
          final deviceName = device.platformName;

          List<int>? manuData;
          if (r.advertisementData.manufacturerData.isNotEmpty) {
            manuData = r.advertisementData.manufacturerData.values.first;
          }

          final existing = _scannedDevices[deviceId];
          if (existing == null || existing.rssi != r.rssi || existing.name != deviceName) {
            _scannedDevices[deviceId] = models.BleScanResult(
              deviceId: deviceId,
              name: deviceName,
              rssi: r.rssi,
              advertisData: manuData,
              serviceUuids: r.advertisementData.serviceUuids.map((u) => u.toString()).toList(),
              timestamp: DateTime.now(),
            );
          }
        }
        if (!_scanResultsController.isClosed) {
          _scanResultsController.add(_scannedDevices.values.toList());
        }
      });

      final state = await FlutterBluePlus.adapterState.first;
      if (!_stateController.isClosed) _stateController.add(_convertState(state));

      _isInitialized = true;
      return true;
    } catch (e) {
      debugPrint('BleAdapter Init Error: $e');
      return false;
    }
  }

  @override
  Future<BleState> getState() async {
    final state = await FlutterBluePlus.adapterState.first;
    return _convertState(state);
  }

  @override
  Future<void> startScan({Duration timeout = const Duration(seconds: 5), List<String>? serviceUuids}) async {
    if (_isScanning) return;
    _isScanning = true;
    try {
      await FlutterBluePlus.startScan(timeout: timeout, androidUsesFineLocation: true);
    } catch (e) {
      _isScanning = false;
      rethrow;
    }
  }

  @override
  Future<void> stopScan() async {
    if (!_isScanning) return;
    _isScanning = false;
    try {
      await FlutterBluePlus.stopScan();
    } catch (e) {}
  }

  @override
  Future<void> connect(String deviceId, {Duration timeout = const Duration(seconds: 30)}) async {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      await device.connect(timeout: timeout);
      _updateConnectionState(deviceId, BleConnectionState.connected);

      _connectionStateSubs[deviceId]?.cancel();
      _connectionStateSubs[deviceId] = device.connectionState.listen((state) {
        _updateConnectionState(deviceId, _convertConnState(state));
      });
    } catch (e) {
      rethrow;
    }
  }

  @override
  Future<void> disconnect(String deviceId) async {
    _connectionStateSubs[deviceId]?.cancel();
    _connectionStateSubs.remove(deviceId);
    try {
      final device = BluetoothDevice.fromId(deviceId);
      await device.disconnect();
    } catch (e) {}
    _updateConnectionState(deviceId, BleConnectionState.disconnected);
    _servicesByDevice.remove(deviceId);
  }

  @override
  Future<void> disconnectAll() async {
    for (final deviceId in _connectionStates.keys) {
      await disconnect(deviceId);
    }
  }

  @override
  Future<List<BleService>> discoverServices(String deviceId) async {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      await device.discoverServices();
      final services = device.servicesList;

      final bleServices = services.map((s) => BleService(
        uuid: s.uuid.toString(),
        isPrimary: s.isPrimary,
        name: BleUuids.getServiceName(s.uuid.toString()),
        characteristics: s.characteristics.map((c) => BleCharacteristic(
          uuid: c.uuid.toString(),
          serviceUuid: s.uuid.toString(),
          properties: _convertProperties(c.properties),
          name: BleUuids.getCharacteristicName(c.uuid.toString()),
        )).toList(),
      )).toList();

      _servicesByDevice[deviceId] = bleServices;
      return bleServices;
    } catch (e) {
      return [];
    }
  }

  @override
  Future<List<int>> readCharacteristic({required String deviceId, required String serviceUuid, required String characteristicUuid}) async {
    final char = _getChar(deviceId, serviceUuid, characteristicUuid);
    return await char.read();
  }

  @override
  Future<void> writeCharacteristic({required String deviceId, required String serviceUuid, required String characteristicUuid, required List<int> data, bool withoutResponse = false}) async {
    final char = _getChar(deviceId, serviceUuid, characteristicUuid);
    await char.write(data, withoutResponse: withoutResponse);
  }

  @override
  Future<void> setNotification({required String deviceId, required String serviceUuid, required String characteristicUuid, required bool enable}) async {
    final char = _getChar(deviceId, serviceUuid, characteristicUuid);
    await char.setNotifyValue(enable);
  }

  @override
  Stream<List<int>>? listenCharacteristicValue({required String deviceId, required String serviceUuid, required String characteristicUuid}) {
    final char = _getChar(deviceId, serviceUuid, characteristicUuid);
    return char.onValueReceived;
  }

  @override
  Future<void> requestMtu(String deviceId, int desiredMtu) async {
    final device = BluetoothDevice.fromId(deviceId);
    await device.requestMtu(desiredMtu);
  }

  BluetoothGattCharacteristic _getChar(String deviceId, String serviceUuid, String characteristicUuid) {
    final device = BluetoothDevice.fromId(deviceId);
    final service = device.servicesList.firstWhere((s) => s.uuid.toString().toLowerCase() == serviceUuid.toLowerCase());
    return service.characteristics.firstWhere((c) => c.uuid.toString().toLowerCase() == characteristicUuid.toLowerCase());
  }

  void _updateConnectionState(String deviceId, BleConnectionState state) {
    if (state == BleConnectionState.disconnected) {
      _connectionStates.remove(deviceId);
    } else {
      _connectionStates[deviceId] = state;
    }
    if (!_connectionStatesController.isClosed) {
      _connectionStatesController.add(Map.from(_connectionStates));
    }
  }

  @override
  Future<void> dispose() async {
    for (final sub in _connectionStateSubs.values) {
      sub.cancel();
    }
    _connectionStateSubs.clear();
    await stopScan();
  }

  BleState _convertState(BluetoothAdapterState state) {
    switch (state) {
      case BluetoothAdapterState.unknown: return BleState.unknown;
      case BluetoothAdapterState.unavailable: return BleState.unavailable;
      case BluetoothAdapterState.unauthorized: return BleState.unauthorized;
      case BluetoothAdapterState.turningOn: return BleState.turningOn;
      case BluetoothAdapterState.on: return BleState.on;
      case BluetoothAdapterState.turningOff: return BleState.turningOff;
      case BluetoothAdapterState.off: return BleState.off;
    }
  }

  BleConnectionState _convertConnState(BluetoothConnectionState state) {
    switch (state) {
      case BluetoothConnectionState.connected: return BleConnectionState.connected;
      case BluetoothConnectionState.disconnected: return BleConnectionState.disconnected;
      default: return BleConnectionState.disconnected;
    }
  }

  List<BleCharacteristicProperty> _convertProperties(CharacteristicProperties props) {
    final result = <BleCharacteristicProperty>[];
    if (props.read) result.add(BleCharacteristicProperty.read);
    if (props.write) result.add(BleCharacteristicProperty.write);
    if (props.writeWithoutResponse) result.add(BleCharacteristicProperty.writeNoResponse);
    if (props.notify) result.add(BleCharacteristicProperty.notify);
    if (props.indicate) result.add(BleCharacteristicProperty.indicate);
    return result;
  }
}
