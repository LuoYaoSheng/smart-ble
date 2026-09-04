import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_ble_peripheral/flutter_ble_peripheral.dart';

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
  static BlePeripheralManager get instance =>
      _instance ??= BlePeripheralManager._internal();
  factory BlePeripheralManager() => instance;

  BlePeripheralManager._internal();

  final FlutterBlePeripheral _blePeripheral = FlutterBlePeripheral();

  /// 广播状态变化流 (可能为空，如果平台不支持)
  Stream<PeripheralState>? get stateStream =>
      _blePeripheral.onPeripheralStateChanged;

  /// 是否正在广播 (返回 Future，需要 await)
  Future<bool> get isAdvertising async => await _blePeripheral.isAdvertising;

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
    return await _blePeripheral.isSupported;
  }

  /// 初始化外设管理器
  Future<bool> initialize() async {
    if (!isSupported) return false;

    try {
      final supported = await _blePeripheral.isSupported;
      return supported;
    } catch (e) {
      print('BlePeripheralManager 初始化失败: $e');
      return false;
    }
  }

  /// 开始广播
  ///
  /// [name] 广播名称
  /// [serviceUuid] 服务 UUID（接受 4 / 8 / 36 位 HEX，内部归一化为 128 位标准形式）
  /// [manufacturerId] 厂商 ID（HEX 字符串，如 "0001"；仅 Android 生效）
  /// [manufacturerData] 厂商数据（ASCII 字符串；仅 Android 生效）
  /// [includeDeviceName] 是否携带设备名称（Android 为系统蓝牙名）
  /// [connectable] 是否可连接
  /// [advertiseMode] 广播模式索引：0=低延迟 1=平衡 2=低功耗
  /// [txPowerIndex] 发射功率索引：0=超低 1=低 2=中 3=高
  ///
  /// 平台差异：
  /// - Android: 会显示设备的实际蓝牙名称，而不是 [name]
  /// - iOS / macOS: 会显示自定义的 [name]
  Future<bool> startAdvertising({
    required String name,
    required String serviceUuid,
    String? manufacturerId,
    String? manufacturerData,
    bool includeDeviceName = true,
    bool connectable = true,
    int advertiseMode = 1,
    int txPowerIndex = 3,
  }) async {
    if (!isSupported) {
      throw UnsupportedError('广播功能仅支持 Android、iOS 和 macOS 平台');
    }

    // 原生侧 UUID.fromString 只接受 128 位标准形式，短 UUID 必须归一化
    final normalizedUuid = normalizeServiceUuid(serviceUuid);
    if (normalizedUuid == null) {
      throw ArgumentError('服务 UUID 需为 4 / 8 / 36 位十六进制');
    }

    // 厂商 ID：HEX 字符串 → int（Bluetooth SIG 公司 ID）
    int? mfrId;
    if (manufacturerId != null && manufacturerId.trim().isNotEmpty) {
      final parsed = int.tryParse(manufacturerId.trim(), radix: 16);
      if (parsed == null || parsed < 0 || parsed > 0xFFFF) {
        throw ArgumentError('厂商 ID 需为 4 位十六进制');
      }
      mfrId = parsed;
    }
    // 厂商数据：ASCII 字符串 → 字节
    Uint8List? mfrBytes;
    if (manufacturerData != null &&
        manufacturerData.isNotEmpty &&
        mfrId != null) {
      mfrBytes = Uint8List.fromList(manufacturerData.codeUnits);
    }

    try {
      // 检查是否已经在广播
      final isAdv = await _blePeripheral.isAdvertising;
      if (isAdv) {
        await stopAdvertising();
      }

      // iOS 和 macOS 支持 localName
      final supportsLocalName = Platform.isIOS || Platform.isMacOS;

      // 创建广播数据
      final advertiseData = AdvertiseData(
        serviceUuid: normalizedUuid,
        // iOS 和 macOS 支持 localName
        localName: supportsLocalName ? name : null,
        manufacturerId: mfrId,
        manufacturerData: mfrBytes,
        // Android 使用设备名称
        includeDeviceName: includeDeviceName,
      );

      // 广播模式/发射功率 → 插件常量（对齐原型 p008 的 Android 参数）
      const intervals = [intervalLow, intervalMedium, intervalHigh];
      const txPowers = [
        txPowerUltraLow,
        txPowerLow,
        txPowerMedium,
        txPowerHigh
      ];
      final interval = intervals[advertiseMode.clamp(0, 2)];
      final txPower = txPowers[txPowerIndex.clamp(0, 3)];

      // 创建广播设置参数
      final advertiseSetParameters = AdvertiseSetParameters(
        connectable: connectable,
        scannable: true,
        legacyMode: true,
        duration: 0,
        includeTxPowerLevel: false,
        interval: interval,
        txPowerLevel: txPower,
      );

      final platform =
          Platform.isAndroid ? 'Android' : (Platform.isIOS ? 'iOS' : 'macOS');
      print('开始广播: name=$name, uuid=$normalizedUuid, mfrId=$mfrId, '
          'connectable=$connectable, platform=$platform');

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

  /// 归一化服务 UUID：4 位（16-bit）/ 8 位（32-bit）短码映射到蓝牙基础 UUID，
  /// 32 位无横线形式补横线，36 位原样放行；非法输入返回 null
  static String? normalizeServiceUuid(String input) {
    final v = input.trim().toLowerCase().replaceAll('-', '');
    if (!_isHex(v)) return null;
    if (v.length == 4) return '0000$v-0000-1000-8000-00805f9b34fb';
    if (v.length == 8) return '$v-0000-1000-8000-00805f9b34fb';
    if (v.length == 32) {
      return '${v.substring(0, 8)}-${v.substring(8, 12)}-${v.substring(12, 16)}-'
          '${v.substring(16, 20)}-${v.substring(20)}';
    }
    return null;
  }

  static bool _isHex(String v) => RegExp(r'^[0-9a-f]+$').hasMatch(v);

  /// 估算广播负载字节数（对齐原型 p008 预算口径：AD 头 2 字节 + 内容）
  static ({int name, int uuid, int mfr, int total}) estimateAdvBytes({
    required String name,
    required String serviceUuid,
    required String manufacturerId,
    required String manufacturerData,
    bool includeName = true,
  }) {
    final nameBytes = includeName && name.isNotEmpty ? 2 + name.length : 0;
    final uuidLen = serviceUuid.trim().length;
    final uuidBytes = uuidLen >= 32 ? 2 + 16 : (uuidLen >= 8 ? 2 + 4 : 2 + 2);
    final hasMfr =
        manufacturerId.trim().isNotEmpty || manufacturerData.isNotEmpty;
    final mfrBytes = hasMfr ? 4 + manufacturerData.length : 0;
    return (
      name: nameBytes,
      uuid: uuidBytes,
      mfr: mfrBytes,
      total: nameBytes + uuidBytes + mfrBytes
    );
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
