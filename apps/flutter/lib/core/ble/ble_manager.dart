import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:rxdart/rxdart.dart';
import '../models/ble_service.dart';
import '../models/ble_scan_result.dart' as models;
import '../models/ble_uuids.dart';

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
/// 封装 flutter_blue_plus，提供简化的 BLE 操作接口。
/// 支持多设备并发连接，每个设备独立管理连接状态和自动重连。
class BleManager {
  /// 单例实例
  static BleManager? _instance;
  static BleManager get instance => _instance ??= BleManager._internal();
  factory BleManager() => instance;

  BleManager._internal() {
    _initializeControllers();
  }
  
  /// 是否启用 E2E 测试 Mock 模式
  static const bool useMockBLE = bool.fromEnvironment('USE_MOCK_BLE', defaultValue: false);

  /// 状态变化流控制器
  late StreamController<BleState> _stateController;
  late StreamController<List<models.BleScanResult>> _scanResultsController;
  late StreamController<Map<String, BluetoothConnectionState>>
      _connectionStatesController;

  /// 是否已初始化
  bool _isInitialized = false;

  void _initializeControllers() {
    _stateController = StreamController<BleState>.broadcast();
    _scanResultsController =
        StreamController<List<models.BleScanResult>>.broadcast();
    _connectionStatesController =
        StreamController<Map<String, BluetoothConnectionState>>.broadcast();
  }

  /// 当前扫描到的设备
  final Map<String, models.BleScanResult> _scannedDevices = {};

  /// 多设备服务列表 (deviceId -> services)
  final Map<String, List<BleService>> _servicesByDevice = {};

  /// 多设备连接状态 (deviceId -> state)
  final Map<String, BluetoothConnectionState> _connectionStates = {};

  /// 多设备连接状态订阅 (deviceId -> subscription)
  final Map<String, StreamSubscription> _connectionStateSubs = {};

  /// 是否正在扫描
  bool _isScanning = false;

  /// 自动重连相关（per-device）
  static const int _maxReconnectAttempts = 3;
  final Map<String, int> _reconnectAttempts = {};
  final Map<String, Timer> _reconnectTimers = {};
  final Set<String> _userInitiatedDisconnects = {};
  bool _autoReconnectEnabled = true;

  /// 状态流
  Stream<BleState> get stateStream => _stateController.stream;

  /// 扫描结果流（带防抖，避免频繁更新导致列表跳动）
  Stream<List<models.BleScanResult>> get scanResultsStream =>
      _scanResultsController.stream
          .debounceTime(const Duration(milliseconds: 300));

  /// 所有设备连接状态流
  Stream<Map<String, BluetoothConnectionState>> get connectionStatesStream =>
      _connectionStatesController.stream;

  /// 获取指定设备的连接状态
  BluetoothConnectionState connectionStateFor(String deviceId) {
    return _connectionStates[deviceId] ??
        BluetoothConnectionState.disconnected;
  }

  /// 判断指定设备是否已连接
  bool isDeviceConnected(String deviceId) {
    return _connectionStates[deviceId] ==
        BluetoothConnectionState.connected;
  }

  /// 获取所有已连接设备 ID
  List<String> get connectedDeviceIds {
    return _connectionStates.entries
        .where((e) => e.value == BluetoothConnectionState.connected)
        .map((e) => e.key)
        .toList();
  }

  /// 获取指定设备的服务列表
  List<BleService> servicesFor(String deviceId) {
    return List.unmodifiable(_servicesByDevice[deviceId] ?? []);
  }

  /// 是否正在扫描
  bool get isScanning => _isScanning;

  /// 初始化 BLE
  Future<bool> initialize() async {
    // 如果控制器已关闭，重新初始化
    if (_stateController.isClosed ||
        _scanResultsController.isClosed ||
        _connectionStatesController.isClosed) {
      _initializeControllers();
      _isInitialized = false;
    }

    // 如果已经初始化，直接返回成功
    if (_isInitialized) return true;

    try {
      // 检查蓝牙是否可用
      // Windows 平台特殊性：如果系统蓝牙开关关闭，isSupported 会返回 false
      // 因此我们不直接 return false 中断流程，而是继续注册监听器以便热恢复
      final isSupported = await FlutterBluePlus.isSupported;
      if (!isSupported) {
        if (!_stateController.isClosed) {
          _stateController.add(BleState.unavailable);
        }
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
              serviceUuids: r.advertisementData.serviceUuids
                  .map((u) => u.toString())
                  .toList(),
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
  ///
  /// 默认扫描超时 5 秒，与 UniApp/Android/iOS/Tauri 等所有平台保持一致。
  Future<void> startScan({
    Duration timeout = const Duration(seconds: 5),
    List<String>? serviceUuids,
  }) async {
    if (_isScanning) return;

    _isScanning = true;

    try {
      if (useMockBLE) {
        debugPrint('[MOCK] Injecting dummy device Dummy-BLE-01');
        _scannedDevices['MOCK-11:22:33:44:55:66'] = models.BleScanResult(
          deviceId: 'MOCK-11:22:33:44:55:66',
          name: 'Dummy-BLE-01',
          rssi: -45,
          advertisData: [0x01, 0x02, 0x03],
          serviceUuids: ['180D', '180A'],
          timestamp: DateTime.now(),
        );
        if (!_scanResultsController.isClosed) {
          _scanResultsController.add(_scannedDevices.values.toList());
        }
      } else {
        await FlutterBluePlus.startScan(
          timeout: timeout,
          androidUsesFineLocation: true,
        );
      }
    } catch (e) {
      debugPrint('开始扫描失败: $e');
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
  ///
  /// 支持多设备并发连接。连接成功后会自动监听连接状态，
  /// 异常断开时触发自动重连（最多 [_maxReconnectAttempts] 次）。
  Future<void> connect(String deviceId,
      {Duration timeout = const Duration(seconds: 30)}) async {
    _userInitiatedDisconnects.remove(deviceId);
    _reconnectAttempts[deviceId] = 0;
    _cancelReconnect(deviceId);

    try {
      final device = BluetoothDevice.fromId(deviceId);
      await device.connect(timeout: timeout);

      // 更新连接状态
      _updateConnectionState(deviceId, BluetoothConnectionState.connected);

      // 监听连接状态变化，用于自动重连
      _connectionStateSubs[deviceId]?.cancel();
      _connectionStateSubs[deviceId] = device.connectionState.listen((state) {
        _updateConnectionState(deviceId, state);

        if (state == BluetoothConnectionState.disconnected &&
            !_userInitiatedDisconnects.contains(deviceId) &&
            _autoReconnectEnabled) {
          _attemptReconnect(deviceId);
        }
      });
    } catch (e) {
      debugPrint('连接失败: $e');
      rethrow;
    }
  }

  /// 尝试自动重连（per-device）
  void _attemptReconnect(String deviceId) {
    final attempts = _reconnectAttempts[deviceId] ?? 0;
    if (attempts >= _maxReconnectAttempts) {
      debugPrint('设备 $deviceId 已达最大重连次数 ($_maxReconnectAttempts)，停止重连');
      _reconnectAttempts.remove(deviceId);
      return;
    }

    final nextAttempt = attempts + 1;
    _reconnectAttempts[deviceId] = nextAttempt;
    final delay = Duration(seconds: nextAttempt * 2); // 指数退避: 2s, 4s, 6s
    debugPrint(
        '设备 $deviceId 将在 ${delay.inSeconds}s 后尝试第 $nextAttempt 次重连...');

    _cancelReconnect(deviceId);
    _reconnectTimers[deviceId] = Timer(delay, () async {
      try {
        debugPrint('正在重连 $deviceId (第 $nextAttempt 次)...');
        final device = BluetoothDevice.fromId(deviceId);
        await device.connect(timeout: const Duration(seconds: 10));
        _reconnectAttempts[deviceId] = 0;
        _updateConnectionState(deviceId, BluetoothConnectionState.connected);
        debugPrint('重连成功: $deviceId');
      } catch (e) {
        debugPrint('重连失败: $deviceId - $e');
        // 递归尝试下一次
        _attemptReconnect(deviceId);
      }
    });
  }

  /// 取消指定设备的重连定时器
  void _cancelReconnect(String deviceId) {
    _reconnectTimers[deviceId]?.cancel();
    _reconnectTimers.remove(deviceId);
  }

  /// 设置是否启用自动重连
  set autoReconnectEnabled(bool value) => _autoReconnectEnabled = value;

  /// 断开指定设备的连接
  ///
  /// 用户主动断开时不会触发自动重连。
  Future<void> disconnect(String deviceId) async {
    _userInitiatedDisconnects.add(deviceId);
    _cancelReconnect(deviceId);
    _reconnectAttempts.remove(deviceId);
    _connectionStateSubs[deviceId]?.cancel();
    _connectionStateSubs.remove(deviceId);

    try {
      final device = BluetoothDevice.fromId(deviceId);
      await device.disconnect();
    } catch (e) {
      debugPrint('断开连接失败: $e');
    }

    _updateConnectionState(deviceId, BluetoothConnectionState.disconnected);
    _servicesByDevice.remove(deviceId);
  }

  /// 断开所有设备
  Future<void> disconnectAll() async {
    final deviceIds = _connectionStates.keys.toList();
    for (final deviceId in deviceIds) {
      await disconnect(deviceId);
    }
  }

  /// 发现服务
  Future<List<BleService>> discoverServices(String deviceId) async {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      await device.discoverServices();
      final services = device.servicesList;

      final bleServices = services
          .map((s) => BleService(
                uuid: s.uuid.toString(),
                isPrimary: s.isPrimary,
                name: BleUuids.getServiceName(s.uuid.toString()),
                characteristics: s.characteristics
                    .map((c) => BleCharacteristic(
                          uuid: c.uuid.toString(),
                          serviceUuid: s.uuid.toString(),
                          properties: _convertProperties(c.properties),
                          name: BleUuids.getCharacteristicName(c.uuid.toString()),
                        ))
                    .toList(),
              ))
          .toList();

      _servicesByDevice[deviceId] = bleServices;
      return bleServices;
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
        (c) =>
            c.uuid.toString().toLowerCase() ==
            characteristicUuid.toLowerCase(),
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
        (c) =>
            c.uuid.toString().toLowerCase() ==
            characteristicUuid.toLowerCase(),
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
        (c) =>
            c.uuid.toString().toLowerCase() ==
            characteristicUuid.toLowerCase(),
        orElse: () => throw Exception('特征值未找到: $characteristicUuid'),
      );

      await characteristic.setNotifyValue(enable);
    } catch (e) {
      print('设置通知失败: $e');
      rethrow;
    }
  }

  /// 请求 MTU 调整
  Future<void> requestMtu(String deviceId, int desiredMtu) async {
    try {
      final device = BluetoothDevice.fromId(deviceId);
      await device.requestMtu(desiredMtu);
    } catch (e) {
      print('请求 MTU 失败 ($deviceId): $e');
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
        (c) =>
            c.uuid.toString().toLowerCase() ==
            characteristicUuid.toLowerCase(),
        orElse: () => throw Exception('特征值未找到: $characteristicUuid'),
      );

      return characteristic.onValueReceived;
    } catch (e) {
      print('监听特征值失败: $e');
      return null;
    }
  }

  /// 更新连接状态并通知
  void _updateConnectionState(
      String deviceId, BluetoothConnectionState state) {
    if (state == BluetoothConnectionState.disconnected) {
      _connectionStates.remove(deviceId);
    } else {
      _connectionStates[deviceId] = state;
    }
    if (!_connectionStatesController.isClosed) {
      _connectionStatesController.add(Map.from(_connectionStates));
    }
  }

  /// 释放资源
  Future<void> dispose() async {
    // 取消所有重连定时器
    for (final timer in _reconnectTimers.values) {
      timer.cancel();
    }
    _reconnectTimers.clear();
    _reconnectAttempts.clear();
    _userInitiatedDisconnects.clear();

    // 取消所有连接状态订阅
    for (final sub in _connectionStateSubs.values) {
      sub.cancel();
    }
    _connectionStateSubs.clear();

    await stopScan();
    await _stateController.close();
    await _scanResultsController.close();
    await _connectionStatesController.close();

    // 重置状态，允许重新初始化
    _isInitialized = false;
    _scannedDevices.clear();
    _connectionStates.clear();
    _servicesByDevice.clear();
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

}

