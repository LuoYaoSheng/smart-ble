import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart'
    show BluetoothConnectionState;
import 'ble_manager.dart';
import 'ota_protocol.dart';

/// 统一定义与 Android 侧完全一致的 OtaUUIDs
class OtaUuids {
  static const String service = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';
  static const String control = 'beb5483e-36e1-4688-b7f5-ea07361b26c0';
  static const String data = 'beb5483e-36e1-4688-b7f5-ea07361b26c1';
  static const String status = 'beb5483e-36e1-4688-b7f5-ea07361b26c2';
}

/// 发送协议常量

/// OTA 状态实体
class OtaState {
  final File? selectedFile;
  final String? fileName;
  final String? manifestName;
  final int fileSize;
  final bool isInProgress;
  final bool isCompleted;
  final int sentBytes;
  final int totalBytes;
  final int progressPercent;
  final String statusMessage;
  final String? errorMessage;

  const OtaState({
    this.selectedFile,
    this.fileName,
    this.manifestName,
    this.fileSize = 0,
    this.isInProgress = false,
    this.isCompleted = false,
    this.sentBytes = 0,
    this.totalBytes = 0,
    this.progressPercent = 0,
    this.statusMessage = '未开始 OTA',
    this.errorMessage,
  });

  OtaState copyWith({
    File? selectedFile,
    String? fileName,
    String? manifestName,
    int? fileSize,
    bool? isInProgress,
    bool? isCompleted,
    int? sentBytes,
    int? totalBytes,
    int? progressPercent,
    String? statusMessage,
    String? errorMessage,
    bool clearError = false,
  }) {
    return OtaState(
      selectedFile: selectedFile ?? this.selectedFile,
      fileName: fileName ?? this.fileName,
      manifestName: manifestName ?? this.manifestName,
      fileSize: fileSize ?? this.fileSize,
      isInProgress: isInProgress ?? this.isInProgress,
      isCompleted: isCompleted ?? this.isCompleted,
      sentBytes: sentBytes ?? this.sentBytes,
      totalBytes: totalBytes ?? this.totalBytes,
      progressPercent: progressPercent ?? this.progressPercent,
      statusMessage: statusMessage ?? this.statusMessage,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

/// 状态提供者
final otaStateProvider =
    StateNotifierProvider.family<OtaManager, OtaState, String>((ref, deviceId) {
  return OtaManager(deviceId);
});

/// OTA 传输管理器
class OtaManager extends StateNotifier<OtaState> {
  final String deviceId;
  final BleManager _bleManager = BleManager.instance;

  File? _manifest;
  bool _isCancelled = false;

  OtaManager(this.deviceId) : super(const OtaState());

  @override
  void dispose() {
    _isCancelled = true;
    super.dispose();
  }

  void selectFile(File file, String name, int size) {
    state = state.copyWith(
      selectedFile: file,
      fileName: name,
      fileSize: size,
      progressPercent: 0,
      sentBytes: 0,
      totalBytes: size,
      statusMessage: '已选择固件',
      isCompleted: false,
      clearError: true,
    );
  }

  void selectManifest(File file, String name) {
    _manifest = file;
    state = state.copyWith(manifestName: name, clearError: true);
  }

  void cancelOta() {
    _isCancelled = true;
  }

  Future<void> startOta() async {
    if (state.isInProgress) return;
    final file = state.selectedFile, manifest = _manifest;
    if (file == null || manifest == null) {
      state = state.copyWith(errorMessage: '请选择 .bin 和对应 manifest');
      return;
    }
    if (!state.fileName!.toLowerCase().endsWith('.bin')) {
      state = state.copyWith(errorMessage: '请选择 .bin 格式的固件');
      return;
    }
    _isCancelled = false;
    state = state.copyWith(
        isInProgress: true,
        isCompleted: false,
        progressPercent: 0,
        sentBytes: 0,
        statusMessage: '正在校验固件包',
        clearError: true);
    try {
      final package = OtaPackage.validate(
          await file.readAsBytes(), jsonDecode(await manifest.readAsString()));
      if (_isCancelled) throw StateError('用户已取消');
      await _bleManager.requestMtu(deviceId, 247);
      final transport = _BleOtaTransport(_bleManager, deviceId);
      await runOta(transport, package, (percent, message) {
        if (!mounted) return;
        state = state.copyWith(
            progressPercent: percent,
            totalBytes: package.bytes.length,
            sentBytes: package.bytes.length * percent ~/ 100,
            statusMessage: message);
      }, () => _isCancelled);
      if (mounted) {
        state = state.copyWith(isInProgress: false, isCompleted: true);
      }
    } catch (error) {
      if (mounted) {
        state = state.copyWith(
            isInProgress: false,
            isCompleted: false,
            statusMessage: _isCancelled ? '已停止跟踪，设备结果未确认' : '升级结果未确认',
            errorMessage: error.toString());
      }
    }
  }
}

class _BleOtaTransport implements OtaTransport {
  final BleManager manager;
  final String id;
  _BleOtaTransport(this.manager, this.id);
  @override
  bool get connected => manager.isDeviceConnected(id);
  @override
  int get chunkSize => 20; // Safe for every ATT MTU; READY may lower further.
  @override
  Stream<bool> get connectionStates => manager.connectionStatesStream
      .map((states) => states[id] == BluetoothConnectionState.connected);
  @override
  Stream<List<int>> get statuses =>
      manager.listenCharacteristicValue(
          deviceId: id,
          serviceUuid: OtaUuids.service,
          characteristicUuid: OtaUuids.status) ??
      const Stream.empty();
  @override
  Future<void> subscribe(bool enabled) => manager.setNotification(
      deviceId: id,
      serviceUuid: OtaUuids.service,
      characteristicUuid: OtaUuids.status,
      enable: enabled);
  @override
  Future<void> writeControl(List<int> value) => manager.writeCharacteristic(
      deviceId: id,
      serviceUuid: OtaUuids.service,
      characteristicUuid: OtaUuids.control,
      data: value);
  @override
  Future<void> writeData(List<int> value) => manager.writeCharacteristic(
      deviceId: id,
      serviceUuid: OtaUuids.service,
      characteristicUuid: OtaUuids.data,
      data: value);
  @override
  Future<Map<String, dynamic>> readInfo() async =>
      jsonDecode(utf8.decode(await manager.readCharacteristic(
              deviceId: id,
              serviceUuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
              characteristicUuid: 'beb5483e-36e1-4688-b7f5-ea07361b26a8')))
          as Map<String, dynamic>;
  @override
  Future<void> reconnect() async {
    await manager.connect(id);
    final services = await manager.discoverServices(id);
    if (services.isEmpty) throw StateError('重连后未发现服务');
  }
}
