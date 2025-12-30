import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../models/ble_device.dart';
import '../models/ble_service.dart';

/// BLE 状态
enum BleState {
  /// 未知
  unknown,
  /// 不可用
  unavailable,
  /// 未授权
  unauthorized,
  /// 开启中
  turningOn,
  /// 开启
  on,
  /// 关闭中
  turningOff,
  /// 关闭
  off,
}

/// BLE 管理器
///
/// 封装 flutter_blue_plus，提供简化的 BLE 操作接口
class BleManager {
  /// 单例实例
  static final BleManager _instance = BleManager._internal();
  factory BleManager() => _instance;
  BleManager._internal();

  /// 状态变化流控制器
  final _stateController = StreamController<BleState>.broadcast();
  final _scanResultsController = StreamController<List<BleScanResult>>.broadcast();
  final _connectionStateController = StreamController<ConnectionState>.broadcast();

  /// 当前扫描到的设备
  final Map<String, BleScanResult> _scannedDevices = {};

  /// 当前连接的设备
  BleDevice? _connectedDevice;

  /// 当前连接的设备服务
  List<BleService> _services = [];

  /// 是否正在扫描
  bool _isScanning = false;

  /// 状态流
  Stream<BleState> get stateStream => _stateController.stream;

  /// 扫描结果流
  Stream<List<BleScanResult>> get scanResultsStream => _scanResultsController.stream;

  /// 连接状态流
  Stream<ConnectionState> get connectionStateStream => _connectionStateController.stream;

  /// 当前连接的设备
  BleDevice? get connectedDevice => _connectedDevice;

  /// 服务列表
  List<BleService> get services => List.unmodifiable(_services);

  /// 是否正在扫描
  bool get isScanning => _isScanning;

  /// 初始化 BLE
  Future<bool> initialize() async {
    try {
      // 检查蓝牙是否可用
      if (await FlutterBluePlus.isSupported == false) {
        _stateController.add(BleState.unavailable);
        return false;
      }

      // 监听蓝牙状态
      FlutterBluePlus.state.listen((state) {
        _stateController.add(_convertBleState(state));
      });

      // 监听扫描结果
      FlutterBluePlus.scanResults.listen((results) {
        _scannedDevices.clear();
        for (ScanResult r in results) {
          final device = r.device;
          _scannedDevices[device.remoteId.toString()] = BleScanResult(
            deviceId: device.remoteId.toString(),
            name: device.localName ?? '',
            rssi: r.rssi,
            advertisData: r.advertisementData.manufacturerData,
            serviceUuids: r.advertisementData.serviceUuids.map((u) => u.toString()).toList(),
            timestamp: DateTime.now(),
          );
        }
        _scanResultsController.add(_scannedDevices.values.toList());
      });

      // 初始化状态
      final state = await FlutterBluePlus.state.first;
      _stateController.add(_convertBleState(state));

      return true;
    } catch (e) {
      print('BleManager 初始化失败: $e');
      return false;
    }
  }

  /// 获取当前状态
  Future<BleState> getState() async {
    final state = await FlutterBluePlus.state.first;
    return _convertBleState(state);
  }

  /// 开始扫描
  Future<void> startScan({
    Duration timeout = const Duration(seconds: 10),
    List<String>? serviceUuids,
  }) async {
    if (_isScanning) return;

    _isScanning = true;
    _scannedDevices.clear();

    try {
      await FlutterBluePlus.startScan(
        timeout: timeout,
        androidUsesFineLocation: true,
      );
    } catch (e) {
      print('开始扫描失败: $e');
      _isScanning = false;
      rethrow;
    }
  }

  /// 停止扫描
  Future<void> stopScan() async {
    if (!_isScanning) return;

    _isScanning = false;
    try {
      await FlutterBluePlus.stopScan();
    } catch (e) {
      print('停止扫描失败: $e');
    }
  }

  /// 连接设备
  Future<void> connect(String deviceId, {Duration timeout = const Duration(seconds: 30)}) async {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      await device.connect(timeout: timeout);
    } catch (e) {
      print('连接失败: $e');
      rethrow;
    }
  }

  /// 断开连接
  Future<void> disconnect() async {
    if (_connectedDevice == null) return;

    try {
      final device = BluetoothDevice.fromId(_connectedDevice!.id);
      await device.disconnect();
    } catch (e) {
      print('断开连接失败: $e');
    }
  }

  /// 发现服务
  Future<List<BleService>> discoverServices(String deviceId) async {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      await device.discoverServices();
      final services = await device.servicesList;

      _services = services.map((s) => BleService(
        uuid: s.uuid.toString(),
        isPrimary: s.isPrimary,
        name: _getServiceName(s.uuid.toString()),
        characteristics: s.characteristics.map((c) => BleCharacteristic(
          uuid: c.uuid.toString(),
          serviceUuid: s.uuid.toString(),
          properties: _convertProperties(c.properties),
          name: _getCharacteristicName(c.uuid.toString()),
        )).toList(),
      )).toList();

      return _services;
    } catch (e) {
      print('发现服务失败: $e');
      return [];
    }
  }

  /// 读取特征值
  Future<List<int>> readCharacteristic({
    required String deviceId,
    required String serviceUuid,
    required String characteristicUuid,
  }) async {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      final service = device.getService(Guid(serviceUuid));
      if (service == null) throw Exception('服务未找到: $serviceUuid');

      final characteristic = service.getCharacteristic(Guid(characteristicUuid));
      if (characteristic == null) throw Exception('特征值未找到: $characteristicUuid');

      final value = await characteristic.read();
      return value;
    } catch (e) {
      print('读取特征值失败: $e');
      rethrow;
    }
  }

  /// 写入特征值
  Future<void> writeCharacteristic({
    required String deviceId,
    required String serviceUuid,
    required String characteristicUuid,
    required List<int> data,
    bool withoutResponse = false,
  }) async {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      final service = device.getService(Guid(serviceUuid));
      if (service == null) throw Exception('服务未找到: $serviceUuid');

      final characteristic = service.getCharacteristic(Guid(characteristicUuid));
      if (characteristic == null) throw Exception('特征值未找到: $characteristicUuid');

      await characteristic.write(data, withoutResponse: withoutResponse);
    } catch (e) {
      print('写入特征值失败: $e');
      rethrow;
    }
  }

  /// 设置通知
  Future<void> setNotification({
    required String deviceId,
    required String serviceUuid,
    required String characteristicUuid,
    required bool enable,
  }) async {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      final service = device.getService(Guid(serviceUuid));
      if (service == null) throw Exception('服务未找到: $serviceUuid');

      final characteristic = service.getCharacteristic(Guid(characteristicUuid));
      if (characteristic == null) throw Exception('特征值未找到: $characteristicUuid');

      await characteristic.setNotifyState(enable);
    } catch (e) {
      print('设置通知失败: $e');
      rethrow;
    }
  }

  /// 监听特征值变化
  Stream<List<int>>? listenCharacteristicValue({
    required String deviceId,
    required String serviceUuid,
    required String characteristicUuid,
  }) {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      final service = device.getService(Guid(serviceUuid));
      if (service == null) return null;

      final characteristic = service.getCharacteristic(Guid(characteristicUuid));
      if (characteristic == null) return null;

      return characteristic.onValueReceived;
    } catch (e) {
      print('监听特征值失败: $e');
      return null;
    }
  }

  /// 释放资源
  Future<void> dispose() async {
    await stopScan();
    await _stateController.close();
    await _scanResultsController.close();
    await _connectionStateController.close();
  }

  /// 转换蓝牙状态
  BleState _convertBleState(BleBluetoothState state) {
    switch (state) {
      case BleBluetoothState.unknown:
        return BleState.unknown;
      case BleBluetoothState.unavailable:
        return BleState.unavailable;
      case BleBluetoothState.unauthorized:
        return BleState.unauthorized;
      case BleBluetoothState.turningOn:
        return BleState.turningOn;
      case BleBluetoothState.on:
        return BleState.on;
      case BleBluetoothState.turningOff:
        return BleState.turningOff;
      case BleBluetoothState.off:
        return BleState.off;
    }
  }

  /// 转换特征值属性
  List<BleCharacteristicProperty> _convertProperties(List<CharacteristicProperty> properties) {
    final result = <BleCharacteristicProperty>[];
    for (var p in properties) {
      switch (p) {
        case CharacteristicProperty.read:
          result.add(BleCharacteristicProperty.read);
        case CharacteristicProperty.write:
          result.add(BleCharacteristicProperty.write);
        case CharacteristicProperty.writeNoResponse:
          result.add(BleCharacteristicProperty.writeNoResponse);
        case CharacteristicProperty.notify:
          result.add(BleCharacteristicProperty.notify);
        case CharacteristicProperty.indicate:
          result.add(BleCharacteristicProperty.indicate);
      }
    }
    return result;
  }

  /// 获取标准服务名称
  String? _getServiceName(String uuid) {
    final short = uuid.toLowerCase().replaceAll('-', '');
    const serviceNames = {
      '000018000000': '通用访问',
      '000018010000': '通用属性',
      '0000180a0000': '设备信息',
      '0000180f0000': '电池服务',
    };
    for (var entry in serviceNames.entries) {
      if (short.startsWith(entry.key.substring(0, 8))) {
        return entry.value;
      }
    }
    return null;
  }

  /// 获取标准特征值名称
  String? _getCharacteristicName(String uuid) {
    final short = uuid.toLowerCase().replaceAll('-', '');
    const charNames = {
      '00002a000000': '设备名称',
      '00002a190000': '电池电量',
      '00002a270000': '硬件版本',
      '00002a280000': '软件版本',
    };
    for (var entry in charNames.entries) {
      if (short.startsWith(entry.key.substring(0, 8))) {
        return entry.value;
      }
    }
    return null;
  }
}

// 导出扫描结果模型
class BleScanResult {
  final String deviceId;
  final String name;
  final int rssi;
  final List<int>? advertisData;
  final List<String> serviceUuids;
  final DateTime timestamp;

  const BleScanResult({
    required this.deviceId,
    required this.name,
    required this.rssi,
    this.advertisData,
    this.serviceUuids = const [],
    required this.timestamp,
  });

  String get displayName => name.isNotEmpty ? name : '未知设备';
}
