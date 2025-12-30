import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_ble_peripheral/flutter_ble_peripheral.dart';

/// 导入常量
import 'package:flutter_ble_peripheral/src/models/constants.dart';

/// BLE 外设管理器
///
/// 使用 flutter_ble_peripheral v2.0+ 实现广播模式
/// 支持 Android 和 iOS 平台
///
/// 平台差异说明：
/// - iOS: 支持自定义 localName，可以设置任意广播名称
/// - Android: localName 不生效，会使用设备实际蓝牙名称
class BlePeripheralManager {
  /// 单例实例
  static BlePeripheralManager? _instance;
  static BlePeripheralManager get instance => _instance ??= BlePeripheralManager._internal();
  factory BlePeripheralManager() => instance;

  BlePeripheralManager._internal();

  final FlutterBlePeripheral _blePeripheral = FlutterBlePeripheral();

  /// 广播状态变化流 (可能为空，如果平台不支持)
  Stream<PeripheralState>? get stateStream => _blePeripheral.onPeripheralStateChanged;

  /// 是否正在广播 (返回 Future，需要 await)
  Future<bool> get isAdvertising async => await _blePeripheral.isAdvertising ?? false;

  /// 数据接收流 (flutter_ble_peripheral v2 不支持此功能)
  Stream<List<int>> get dataStream => const Stream.empty();

  /// 检查当前平台是否支持广播
  static bool get isSupported {
    return Platform.isAndroid || Platform.isIOS || Platform.isMacOS;
  }

  /// 获取当前平台名称
  static String get platformName {
    if (Platform.isAndroid) return 'Android';
    if (Platform.isIOS) return 'iOS';
    if (Platform.isMacOS) return 'macOS';
    if (Platform.isWindows) return 'Windows';
    if (Platform.isLinux) return 'Linux';
    return 'Unknown';
  }

  /// 检查是否支持广播 (运行时检查)
  Future<bool> isPlatformSupported() async {
    return await _blePeripheral.isSupported ?? false;
  }

  /// 初始化外设管理器
  Future<bool> initialize() async {
    if (!isSupported) return false;

    try {
      final supported = await _blePeripheral.isSupported ?? false;
      return supported;
    } catch (e) {
      print('BlePeripheralManager 初始化失败: $e');
      return false;
    }
  }

  /// 开始广播
  ///
  /// [name] 广播名称
  /// [serviceUuid] 服务 UUID
  ///
  /// 平台差异：
  /// - Android: 会显示设备的实际蓝牙名称，而不是 [name]
  /// - iOS / macOS: 会显示自定义的 [name]
  Future<bool> startAdvertising({
    required String name,
    required String serviceUuid,
  }) async {
    if (!isSupported) {
      throw UnsupportedError('广播功能仅支持 Android、iOS 和 macOS 平台');
    }

    try {
      // 检查是否已经在广播
      final isAdv = await _blePeripheral.isAdvertising ?? false;
      if (isAdv) {
        await stopAdvertising();
      }

      // iOS 和 macOS 支持 localName
      final supportsLocalName = Platform.isIOS || Platform.isMacOS;

      // 创建广播数据
      final advertiseData = AdvertiseData(
        serviceUuid: serviceUuid,
        // iOS 和 macOS 支持 localName
        localName: supportsLocalName ? name : null,
        // Android 使用设备名称
        includeDeviceName: true,
      );

      // 创建广播设置参数
      final advertiseSetParameters = AdvertiseSetParameters(
        connectable: true,
        scannable: true,
        legacyMode: true,
        duration: 0,
        includeTxPowerLevel: false,
        interval: intervalHigh,
        txPowerLevel: txPowerHigh,
      );

      final platform = Platform.isAndroid ? "Android" : (Platform.isIOS ? "iOS" : "macOS");
      print('开始广播: name=$name, uuid=$serviceUuid, platform=$platform');

      await _blePeripheral.start(
        advertiseData: advertiseData,
        advertiseSetParameters: advertiseSetParameters,
      );

      return true;
    } catch (e) {
      print('开始广播失败: $e');
      return false;
    }
  }

  /// 停止广播
  Future<void> stopAdvertising() async {
    try {
      await _blePeripheral.stop();
    } catch (e) {
      print('停止广播失败: $e');
    }
  }

  /// 发送数据给连接的设备
  Future<bool> sendData(List<int> data) async {
    try {
      await _blePeripheral.sendData(Uint8List.fromList(data));
      return true;
    } catch (e) {
      print('发送数据失败: $e');
      return false;
    }
  }

  /// 释放资源
  Future<void> dispose() async {
    await stopAdvertising();
  }
}
