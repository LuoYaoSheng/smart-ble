// Smart HID 配网 GATT 会话层。
//
// 对应 uni-app 侧 `services/provisioning/transport.js` + `orchestrator.js`
// 的组合：连接 → 服务/特征确认 → MTU 协商 → notify 订阅 → 分帧写入。
//
// 说明：不复用 BleManager 的 connect——那里带 3 次自动重连逻辑，会与配网
// 会话的「断线即呈报」语义打架（配网页需要的是 lost 横幅 + 用户手动重连，
// 而不是后台静默重连）。此处直接面向 FlutterBluePlus 建立独立会话。

import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_blue_plus/flutter_blue_plus.dart';

import '../protocols/hid_provisioning_protocol.dart';
import 'provisioning_framing.dart';

/// 写入失败类别（对齐 transport.js normalizeWriteError）
enum ProvisioningWriteErrorKind { encrypt, disconnect, write }

class ProvisioningConnectException implements Exception {
  const ProvisioningConnectException(this.message);
  final String message;

  @override
  String toString() => message;
}

class ProvisioningWriteException implements Exception {
  const ProvisioningWriteException(this.kind, this.message);
  final ProvisioningWriteErrorKind kind;
  final String message;

  @override
  String toString() => message;
}

/// 设备无关的配网传输接口（真实 FBP 实现 + 单测 Fake 双形态）
abstract class ProvisioningTransport {
  /// 连接、发现服务、确认配网服务与三特征、协商 MTU、打开 notify。
  /// [onLost] 在会话建立后意外断开时回调一次。
  Future<void> connect(String deviceId, {void Function()? onLost});

  /// 协商后的 ATT MTU（未协商成功按 23）
  int get mtu;

  /// 读 Device Info 特征（UTF-8 JSON 文本）
  Future<String> readDeviceInfo();

  /// 读 Provision Status 特征（UTF-8 JSON 文本）
  Future<String> readStatus();

  /// Device Info notify 流（UTF-8 文本）
  Stream<String> get deviceInfoNotifications;

  /// Provision Status notify 流（UTF-8 文本）
  Stream<String> get statusNotifications;

  /// 写 INPUT 前确保加密链路就绪（canon §2：INPUT 要求加密链路，bonding
  /// Just Works）。Android 经 createBond() 发起无感配对；已 bond 立即返回。
  /// 失败抛 [ProvisioningWriteException]（encrypt 类）。
  Future<void> prepareInputWrite();

  /// 顺序写入帧序列（带响应写，帧间默认 30ms，避免压垮部分 Android 栈）。
  /// 失败抛 [ProvisioningWriteException]（已分类）。
  Future<void> writeFrames(List<Uint8List> frames,
      {Duration interval = const Duration(milliseconds: 30)});

  /// 断开连接并释放订阅
  Future<void> close();
}

typedef ProvisioningTransportFactory = ProvisioningTransport Function();

/// FlutterBluePlus 实现
class FbpProvisioningTransport implements ProvisioningTransport {
  BluetoothDevice? _device;
  BluetoothCharacteristic? _infoChar;
  BluetoothCharacteristic? _inputChar;
  BluetoothCharacteristic? _statusChar;
  StreamSubscription<BluetoothConnectionState>? _connectionSub;
  int _mtu = defaultAttMtu;
  bool _closedByUser = false;

  Guid get _serviceGuid => Guid.fromString(smartHidProvisioningServiceUuid);

  @override
  int get mtu => _mtu;

  @override
  Future<void> connect(String deviceId, {void Function()? onLost}) async {
    _closedByUser = false;
    final device = BluetoothDevice.fromId(deviceId);
    try {
      await device.connect(timeout: const Duration(seconds: 10));
      // MTU 协商尽力而为：失败不影响会话，分帧按 23 保守切
      try {
        _mtu = await device.requestMtu(247);
      } catch (_) {
        _mtu = defaultAttMtu;
      }
      await device.discoverServices();
    } catch (e) {
      _safeDisconnect(device);
      throw ProvisioningConnectException('连接设备失败: $e');
    }

    BluetoothService? service;
    for (final s in device.servicesList) {
      if (s.uuid == _serviceGuid) {
        service = s;
        break;
      }
    }
    if (service == null) {
      _safeDisconnect(device);
      throw const ProvisioningConnectException(
          '目标设备上未找到配网服务（UUID 不匹配或设备固件过旧）');
    }
    final foundService = service;

    BluetoothCharacteristic? findByGuid(String uuid) {
      for (final c in foundService.characteristics) {
        if (c.uuid == Guid.fromString(uuid)) return c;
      }
      return null;
    }
    _infoChar = findByGuid(SmartHidCharacteristicUuids.info);
    _inputChar = findByGuid(SmartHidCharacteristicUuids.input);
    _statusChar = findByGuid(SmartHidCharacteristicUuids.status);
    final missing = [
      if (_infoChar == null) SmartHidCharacteristicUuids.info,
      if (_inputChar == null) SmartHidCharacteristicUuids.input,
      if (_statusChar == null) SmartHidCharacteristicUuids.status,
    ];
    if (missing.isNotEmpty) {
      _safeDisconnect(device);
      throw ProvisioningConnectException('配网特征缺失: ${missing.join(', ')}');
    }

    try {
      await _infoChar!.setNotifyValue(true);
      await _statusChar!.setNotifyValue(true);
    } catch (e) {
      _safeDisconnect(device);
      throw ProvisioningConnectException('打开配网特征通知失败: $e');
    }

    _device = device;
    _connectionSub = device.connectionState.listen((state) {
      if (state == BluetoothConnectionState.disconnected &&
          !_closedByUser) {
        onLost?.call();
      }
    });
  }

  @override
  Future<String> readDeviceInfo() async => utf8Decode(await _infoChar!.read());

  @override
  Future<String> readStatus() async => utf8Decode(await _statusChar!.read());

  @override
  Stream<String> get deviceInfoNotifications =>
      _infoChar!.onValueReceived.map(utf8Decode);

  @override
  Stream<String> get statusNotifications =>
      _statusChar!.onValueReceived.map(utf8Decode);

  @override
  Future<void> prepareInputWrite() async {
    final device = _device;
    if (device == null || !device.isConnected) {
      throw const ProvisioningWriteException(
          ProvisioningWriteErrorKind.disconnect, 'BLE 连接已断开');
    }
    // FBP 1.36.8 无 isBonded 查询；createBond 在已配对时平台侧快速返回成功。
    // 真机教训（E13）：未加密链路直接带响应写 WRITE_ENC 特征时，
    // 部分 Android 栈会让 write 永远 PENDING——必须先建加密链路再写。
    try {
      await device.createBond(timeout: 20);
    } catch (e) {
      throw const ProvisioningWriteException(
          ProvisioningWriteErrorKind.encrypt,
          '设备配对失败（加密链路未建立），请重试或检查系统蓝牙配对设置');
    }
  }

  @override
  Future<void> writeFrames(List<Uint8List> frames,
      {Duration interval = const Duration(milliseconds: 30)}) async {
    final input = _inputChar;
    if (input == null || _device?.isConnected != true) {
      throw const ProvisioningWriteException(
          ProvisioningWriteErrorKind.disconnect, 'BLE 连接已断开');
    }
    for (var i = 0; i < frames.length; i++) {
      if (i > 0 && interval > Duration.zero) await Future.delayed(interval);
      try {
        // 15s 单帧超时：真机验证发现未加密链路写 ENC 特征可能无限 PENDING
        await input.write(frames[i], withoutResponse: false).timeout(
            const Duration(seconds: 15),
            onTimeout: () => throw TimeoutException('write timeout 15s'));
      } catch (e) {
        throw _classifyWriteError(e);
      }
    }
  }

  ProvisioningWriteException _classifyWriteError(Object error) {
    final message = error.toString();
    if (RegExp(r'encrypt|auth|pair|bond|insufficient|133', caseSensitive: false)
        .hasMatch(message)) {
      return const ProvisioningWriteException(
          ProvisioningWriteErrorKind.encrypt,
          '写入特征需要加密链路：请在系统弹窗中确认配对（Just Works），然后重试');
    }
    if (RegExp(r'disconnect|10008|not connect', caseSensitive: false)
        .hasMatch(message)) {
      return const ProvisioningWriteException(
          ProvisioningWriteErrorKind.disconnect, 'BLE 连接已断开，请重新连接设备');
    }
    return ProvisioningWriteException(
        ProvisioningWriteErrorKind.write, '写入失败: $message');
  }

  void _safeDisconnect(BluetoothDevice device) {
    try {
      device.disconnect();
    } catch (_) {}
  }

  @override
  Future<void> close() async {
    _closedByUser = true;
    await _connectionSub?.cancel();
    _connectionSub = null;
    final device = _device;
    try {
      await _infoChar?.setNotifyValue(false);
    } catch (_) {}
    try {
      await _statusChar?.setNotifyValue(false);
    } catch (_) {}
    _device = null;
    _infoChar = null;
    _inputChar = null;
    _statusChar = null;
    if (device != null) {
      _safeDisconnect(device);
    }
  }
}

/// 按会话 MTU 把 candidate JSON 文本编码为帧序列
List<Uint8List> buildCandidateFrames(String candidateJson, int mtu) {
  return buildFrames(utf8Encode(candidateJson), chunkSizeForMtu(mtu));
}
