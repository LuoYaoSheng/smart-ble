import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'ble_manager.dart';

/// 统一定义与 Android 侧完全一致的 OtaUUIDs
class OtaUuids {
  static const String service = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';
  static const String control = 'beb5483e-36e1-4688-b7f5-ea07361b26c0';
  static const String data = 'beb5483e-36e1-4688-b7f5-ea07361b26c1';
  static const String status = 'beb5483e-36e1-4688-b7f5-ea07361b26c2';
}

/// 发送协议常量
const int _otaChunkSize = 180;
const int _chunkDelayMs = 20;

/// OTA 状态实体
class OtaState {
  final File? selectedFile;
  final String? fileName;
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

  StreamSubscription? _statusSub;
  bool _isCancelled = false;

  OtaManager(this.deviceId) : super(const OtaState());

  @override
  void dispose() {
    _statusSub?.cancel();
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

  void cancelOta() {
    if (state.isInProgress) {
      _isCancelled = true;
      _sendCommand({'action': 'abort'});
      state = state.copyWith(
        isInProgress: false,
        statusMessage: '已取消 OTA',
      );
    }
  }

  Future<void> startOta() async {
    final file = state.selectedFile;
    if (file == null) {
      state = state.copyWith(errorMessage: '未选择固件');
      return;
    }

    if (!_bleManager.isDeviceConnected(deviceId)) {
      state = state.copyWith(errorMessage: '设备已断开');
      return;
    }

    _isCancelled = false;
    state = state.copyWith(
      isInProgress: true,
      isCompleted: false,
      progressPercent: 0,
      sentBytes: 0,
      statusMessage: '正在初始化 OTA...',
      clearError: true,
    );

    try {
      // 1. 请求放大 MTU，确保 180 字节负载安全通过
      await _bleManager.requestMtu(deviceId, 247);

      // 2. 监听 Status
      await _bleManager.setNotification(
        deviceId: deviceId,
        serviceUuid: OtaUuids.service,
        characteristicUuid: OtaUuids.status,
        enable: true,
      );

      _statusSub?.cancel();
      _statusSub = _bleManager
          .listenCharacteristicValue(
            deviceId: deviceId,
            serviceUuid: OtaUuids.service,
            characteristicUuid: OtaUuids.status,
          )
          ?.listen(_handleStatusUpdate);

      await Future.delayed(const Duration(milliseconds: 200));

      // 3. 发送 Start 命令
      final totalBytes = state.fileSize;
      await _sendCommand({
        'action': 'start',
        'size': totalBytes,
        'chunk_size': _otaChunkSize,
        'firmware_version': 'flutter-bin'
      });

      await Future.delayed(const Duration(milliseconds: 200));

      // 4. 读取文件并分包发送
      final bytes = await file.readAsBytes();
      int sent = 0;

      for (int i = 0; i < bytes.length; i += _otaChunkSize) {
        if (_isCancelled) {
          throw Exception('用户手动取消');
        }

        final end = (i + _otaChunkSize < bytes.length)
            ? i + _otaChunkSize
            : bytes.length;
        final chunk = bytes.sublist(i, end);

        // 阻塞发送
        await _bleManager.writeCharacteristic(
          deviceId: deviceId,
          serviceUuid: OtaUuids.service,
          characteristicUuid: OtaUuids.data,
          data: chunk,
          withoutResponse: true, // 数据通道默认可以 noResponse
        );

        sent += chunk.length;
        final percent = ((sent / totalBytes) * 100).toInt().clamp(0, 99);
        state = state.copyWith(
          sentBytes: sent,
          progressPercent: percent,
          statusMessage: '正在发送分包...',
        );

        // 延时保证 ESP32 消化数据
        await Future.delayed(const Duration(milliseconds: _chunkDelayMs));
      }

      // 5. 提交完成
      await _sendCommand({'action': 'commit'});

      state = state.copyWith(
        sentBytes: totalBytes,
        progressPercent: 100,
        statusMessage: '发送完成，等待设备验证...',
      );
    } catch (e) {
      if (_isCancelled) return;
      state = state.copyWith(
        isInProgress: false,
        statusMessage: '传输中断',
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> _sendCommand(Map<String, dynamic> jsonCommand) async {
    final payload = utf8.encode(jsonEncode(jsonCommand));
    await _bleManager.writeCharacteristic(
      deviceId: deviceId,
      serviceUuid: OtaUuids.service,
      characteristicUuid: OtaUuids.control,
      data: payload,
    );
  }

  void _handleStatusUpdate(List<int> raw) {
    try {
      final jsonStr = utf8.decode(raw);
      final map = jsonDecode(jsonStr);

      if (map['type'] != 'ota') return;

      final status = map['status'];
      final msg = map['message'];

      if (status == 'success') {
        state = state.copyWith(
          isInProgress: false,
          isCompleted: true,
          progressPercent: 100,
          statusMessage: 'OTA 成功，设备即将重启',
        );
      } else if (status == 'error') {
        state = state.copyWith(
          isInProgress: false,
          statusMessage: '设备反馈错误',
          errorMessage: msg ?? '未知系统错误',
        );
      }
    } catch (_) {} // 忽略非 JSON 数据
  }
}
