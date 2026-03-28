import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:rxdart/rxdart.dart';
import '../models/ble_device.dart';
import '../models/ble_service.dart';
import '../models/ble_scan_result.dart' as models;

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
  static BleManager? _instance;
  static BleManager get instance => _instance ??= BleManager._internal();
  factory BleManager() => instance;

  BleManager._internal() {
    _initializeControllers();
  }

  /// 状态变化流控制器
  late StreamController<BleState> _stateController;
  late StreamController<List<models.BleScanResult>> _scanResultsController;
  late StreamController<BluetoothConnectionState> _connectionStateController;

  /// 是否已初始化
  bool _isInitialized = false;

  void _initializeControllers() {
    _stateController = StreamController<BleState>.broadcast();
    _scanResultsController = StreamController<List<models.BleScanResult>>.broadcast();
    _connectionStateController = StreamController<BluetoothConnectionState>.broadcast();
  }

  /// 当前扫描到的设备
  final Map<String, models.BleScanResult> _scannedDevices = {};

  /// 当前连接的设备
  BleDevice? _connectedDevice;

  /// 当前连接的设备服务
  List<BleService> _services = [];

  /// 是否正在扫描
  bool _isScanning = false;

  /// 状态流
  Stream<BleState> get stateStream => _stateController.stream;

  /// 扫描结果流（带防抖，避免频繁更新导致列表跳动）
  Stream<List<models.BleScanResult>> get scanResultsStream => _scanResultsController.stream
      .debounceTime(const Duration(milliseconds: 300));

  /// 连接状态流
  Stream<BluetoothConnectionState> get connectionStateStream => _connectionStateController.stream;

  /// 当前连接的设备
  BleDevice? get connectedDevice => _connectedDevice;

  /// 服务列表
  List<BleService> get services => List.unmodifiable(_services);

  /// 是否正在扫描
  bool get isScanning => _isScanning;

  /// 初始化 BLE
  Future<bool> initialize() async {
    // 如果控制器已关闭，重新初始化
    if (_stateController.isClosed ||
        _scanResultsController.isClosed ||
        _connectionStateController.isClosed) {
      _initializeControllers();
      _isInitialized = false;
    }

    // 如果已经初始化，直接返回成功
    if (_isInitialized) return true;

    try {
      // 检查蓝牙是否可用
      if (await FlutterBluePlus.isSupported == false) {
        _stateController.add(BleState.unavailable);
        return false;
      }

      // 监听蓝牙状态
      FlutterBluePlus.adapterState.listen((state) {
        if (!_stateController.isClosed) {
          _stateController.add(_convertBleState(state));
        }
      });

      // 监听扫描结果
      FlutterBluePlus.scanResults.listen((results) {
        // 不清空现有列表，只更新已存在的设备或添加新设备
        // 这样可以避免列表跳动
        for (ScanResult r in results) {
          final device = r.device;
          final deviceId = device.remoteId.toString();
          final deviceName = device.platformName;

          // Convert manufacturerData Map to List<int>
          List<int>? manuData;
          if (r.advertisementData.manufacturerData.isNotEmpty) {
            manuData = r.advertisementData.manufacturerData.values.first;
          }

          // 只有当设备是新设备或数据有变化时才更新
          final existing = _scannedDevices[deviceId];
          if (existing == null ||
              existing.rssi != r.rssi ||
              existing.name != deviceName) {
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

      // 初始化状态
      final state = await FlutterBluePlus.adapterState.first;
      if (!_stateController.isClosed) {
        _stateController.add(_convertBleState(state));
      }

      _isInitialized = true;
      return true;
    } catch (e) {
      print('BleManager 初始化失败: $e');
      return false;
    }
  }

  /// 获取当前状态
  Future<BleState> getState() async {
    final state = await FlutterBluePlus.adapterState.first;
    return _convertBleState(state);
  }

  /// 开始扫描
  Future<void> startScan({
    Duration timeout = const Duration(seconds: 10),
    List<String>? serviceUuids,
  }) async {
    if (_isScanning) return;

    _isScanning = true;
    // 不清空现有设备，让用户可以看到之前的设备
    // _scannedDevices.clear();

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
      final services = device.servicesList;

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
      final service = device.servicesList.firstWhere(
        (s) => s.uuid.toString().toLowerCase() == serviceUuid.toLowerCase(),
        orElse: () => throw Exception('服务未找到: $serviceUuid'),
      );

      final characteristic = service.characteristics.firstWhere(
        (c) => c.uuid.toString().toLowerCase() == characteristicUuid.toLowerCase(),
        orElse: () => throw Exception('特征值未找到: $characteristicUuid'),
      );

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
      final service = device.servicesList.firstWhere(
        (s) => s.uuid.toString().toLowerCase() == serviceUuid.toLowerCase(),
        orElse: () => throw Exception('服务未找到: $serviceUuid'),
      );

      final characteristic = service.characteristics.firstWhere(
        (c) => c.uuid.toString().toLowerCase() == characteristicUuid.toLowerCase(),
        orElse: () => throw Exception('特征值未找到: $characteristicUuid'),
      );

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
      final service = device.servicesList.firstWhere(
        (s) => s.uuid.toString().toLowerCase() == serviceUuid.toLowerCase(),
        orElse: () => throw Exception('服务未找到: $serviceUuid'),
      );

      final characteristic = service.characteristics.firstWhere(
        (c) => c.uuid.toString().toLowerCase() == characteristicUuid.toLowerCase(),
        orElse: () => throw Exception('特征值未找到: $characteristicUuid'),
      );

      await characteristic.setNotifyValue(enable);
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
      final service = device.servicesList.firstWhere(
        (s) => s.uuid.toString().toLowerCase() == serviceUuid.toLowerCase(),
        orElse: () => throw Exception('服务未找到: $serviceUuid'),
      );

      final characteristic = service.characteristics.firstWhere(
        (c) => c.uuid.toString().toLowerCase() == characteristicUuid.toLowerCase(),
        orElse: () => throw Exception('特征值未找到: $characteristicUuid'),
      );

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

    // 重置状态，允许重新初始化
    _isInitialized = false;
    _scannedDevices.clear();
  }

  /// 转换蓝牙状态
  BleState _convertBleState(dynamic state) {
    if (state is BluetoothAdapterState) {
      switch (state) {
        case BluetoothAdapterState.unknown:
          return BleState.unknown;
        case BluetoothAdapterState.unavailable:
          return BleState.unavailable;
        case BluetoothAdapterState.unauthorized:
          return BleState.unauthorized;
        case BluetoothAdapterState.turningOn:
          return BleState.turningOn;
        case BluetoothAdapterState.on:
          return BleState.on;
        case BluetoothAdapterState.turningOff:
          return BleState.turningOff;
        case BluetoothAdapterState.off:
          return BleState.off;
      }
    }
    return BleState.unknown;
  }

  /// 转换特征值属性
  List<BleCharacteristicProperty> _convertProperties(dynamic properties) {
    final result = <BleCharacteristicProperty>[];

    // CharacteristicProperties has boolean properties for each attribute
    final props = properties as CharacteristicProperties;

    if (props.read) {
      result.add(BleCharacteristicProperty.read);
    }
    if (props.write) {
      result.add(BleCharacteristicProperty.write);
    }
    if (props.writeWithoutResponse) {
      result.add(BleCharacteristicProperty.writeNoResponse);
    }
    if (props.notify) {
      result.add(BleCharacteristicProperty.notify);
    }
    if (props.indicate) {
      result.add(BleCharacteristicProperty.indicate);
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
