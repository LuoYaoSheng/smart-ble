// Smart HID 配网编排控制器（P002 三阶段状态机）。
//
// 对应原型 p002-provision.js 的 page state + app.js p002* 动作族，及
// uni-app 侧 orchestrator/workflow 的组合：connect → verify → write →
// status 终态（ready / error，60s 超时）→ 错误码→行/恢复动作映射。
//
// 安全约定：token 与 Wi-Fi 密码只作为 submit() 参数经过本控制器，
// 不落任何字段/日志/存储；离开配网页由 UI 负责清空其持有的表单值。

import 'dart:async';

import 'package:flutter/foundation.dart';

import '../protocols/hid_provisioning_protocol.dart';
import 'provisioning_transport.dart';

/// 页面阶段（对齐原型 phase: connect / configure / status）
enum ProvisionPhase { connect, configure, status }

/// 下发状态行（对齐原型 progress: pending / active / done / fail）
enum ProvisionRowState { pending, active, done, fail }

/// 终局失败描述（code + 展示行 + 恢复动作）
class ProvisionFailure {
  const ProvisionFailure({
    required this.code,
    required this.message,
    required this.row,
    required this.recovery,
  });

  final String code;
  final String message;
  final String row;
  final String recovery;
}

/// 状态终态等待结果
enum _TerminalOutcome { ready, error, timeout, lost }

const Map<String, ProvisionRowState> _initialProgress = {
  'wifi': ProvisionRowState.pending,
  'hub': ProvisionRowState.pending,
  'conn': ProvisionRowState.pending,
  'usb': ProvisionRowState.pending,
};

/// step → 行推进表（PROVISIONING_STEPS 顺序索引）
const Map<String, int> _stepIndex = {
  'received': 0,
  'connecting_wifi': 1,
  'wifi_connected': 2,
  'pairing': 3,
  'pairing_success': 4,
  'mqtt_connecting': 5,
  'ready': 6,
};

class ProvisioningController extends ChangeNotifier {
  ProvisioningController({
    required ProvisioningTransportFactory transportFactory,
    this.statusTimeout = const Duration(seconds: 60),
  }) : _transportFactory = transportFactory;

  final ProvisioningTransportFactory _transportFactory;
  final Duration statusTimeout;

  ProvisioningTransport? _transport;
  StreamSubscription<String>? _statusSub;
  StreamSubscription<String>? _infoSub;
  Completer<_TerminalOutcome>? _terminal;
  String? _terminalError;
  Timer? _terminalTimer;
  Timer? _statusPollTimer;
  String? _lastStatusRaw;
  int _appliedStepIdx = -1;

  // ---- 页面状态（对齐原型 defaults） ----
  ProvisionPhase phase = ProvisionPhase.connect;
  bool connecting = false;
  String? connError;
  bool lost = false;
  SmartHidDeviceInfo? deviceInfo;
  bool provisioning = false;
  bool done = false;
  ProvisionFailure? failure;
  SmartHidProvisionStatus? lastStatus;
  Map<String, ProvisionRowState> progress = Map.of(_initialProgress);

  bool get hasOutcome => done || failure != null;

  /// 连接并验证设备（phase: connect → configure）
  Future<void> connectDevice(String deviceId) async {
    phase = ProvisionPhase.connect;
    connecting = true;
    connError = null;
    lost = false;
    deviceInfo = null;
    notifyListeners();

    await _closeTransport();
    final transport = _transportFactory();
    try {
      await transport.connect(deviceId, onLost: _onConnectionLost);
      _transport = transport;
      _statusSub = transport.statusNotifications.listen(_onStatusText);
      _infoSub = transport.deviceInfoNotifications.listen((text) {
        final info = parseDeviceInfo(text);
        if (info != null) {
          deviceInfo = info;
          notifyListeners();
        }
      });
      final info = parseDeviceInfo(await transport.readDeviceInfo());
      if (info == null || !verifySmartHidDeviceInfo(info)) {
        await _closeTransport();
        connecting = false;
        connError = '设备身份验证失败：Device Info 缺失或 product / protocol / '
            'device_id 与 Smart HID 档案不符';
        debugPrint('P002: identity check FAILED (${info?.product}/${info?.protocol}/${info?.deviceId})');
        notifyListeners();
        return;
      }
      deviceInfo = info;
      connecting = false;
      phase = ProvisionPhase.configure;
      _startStatusPoll();
      debugPrint('P002: connected+verified device_id=${info.deviceId} fw=${info.firmware} mtu=${transport.mtu}');
    } catch (e) {
      await _closeTransport();
      connecting = false;
      connError = e is ProvisioningConnectException
          ? e.message
          : '连接设备失败: $e';
    }
    notifyListeners();
  }

  /// 下发配置（phase: configure → status）。
  /// 校验失败抛 [FormatException]（UI 捕获提示，不切阶段）。
  Future<void> submit({
    required String wifiSsid,
    required String wifiPassword,
    required String hubHost,
    int? hubPort,
    required String token,
  }) async {
    final transport = _transport;
    if (transport == null || lost) {
      throw const FormatException('BLE 未连接，请先重新连接设备');
    }
    final candidateJson = buildProvisionCandidateJson(ProvisionCandidateInput(
      wifiSsid: wifiSsid,
      wifiPassword: wifiPassword,
      hubHost: hubHost,
      hubPort: hubPort,
      token: token,
    ));

    phase = ProvisionPhase.status;
    provisioning = true;
    done = false;
    failure = null;
    lastStatus = null;
    _appliedStepIdx = 0;
    progress = Map.of(_initialProgress);
    progress['wifi'] = ProvisionRowState.active; // canon：下发即点亮 Wi-Fi 行
    notifyListeners();

    // 先挂终态 waiter 再写入，避免设备快速终态丢失（对齐 orchestrator）
    final terminal = Completer<_TerminalOutcome>();
    _terminal = terminal;
    _terminalError = null;
    _terminalTimer = Timer(statusTimeout, () {
      if (!terminal.isCompleted) terminal.complete(_TerminalOutcome.timeout);
    });

    final frames = buildCandidateFrames(candidateJson, transport.mtu);
    debugPrint('P002: submit frames=${frames.length} bytes=${candidateJson.length} mtu=${transport.mtu}');
    try {
      await transport.writeFrames(frames);
    } catch (e) {
      _setWriteFailure(e);
      return;
    }

    final outcome = await terminal.future;
    _terminalTimer?.cancel();
    _terminalTimer = null;
    _terminal = null;
    provisioning = false;
    debugPrint('P002: terminal=${outcome.name} failure=${failure?.code}');
    switch (outcome) {
      case _TerminalOutcome.ready:
        _applyStepIndex(6);
        done = true;
      case _TerminalOutcome.error:
        _applyFailure(_terminalError ?? 'unknown');
      case _TerminalOutcome.timeout:
        failure = const ProvisionFailure(
          code: timeoutErrorCode,
          message: '等待设备确认超时（60s），可重试下发。',
          row: 'conn',
          recovery: 'retry',
        );
      case _TerminalOutcome.lost:
        failure = const ProvisionFailure(
          code: 'connection_lost',
          message: '设备连接已断开。已填写的配网信息不会丢失，重新连接后可继续。',
          row: 'conn',
          recovery: 'reconnect',
        );
    }
    notifyListeners();
  }

  void _setWriteFailure(Object error) {
    _terminalTimer?.cancel();
    _terminalTimer = null;
    _terminal = null;
    provisioning = false;
    if (error is ProvisioningWriteException &&
        error.kind == ProvisioningWriteErrorKind.disconnect) {
      // 下发中断线：按 connection_lost 呈现（canon：表单不丢，重连后可继续）
      failure = const ProvisionFailure(
        code: 'connection_lost',
        message: '设备连接已断开。已填写的配网信息不会丢失，重新连接后可继续。',
        row: 'conn',
        recovery: 'reconnect',
      );
    } else {
      final message = error.toString();
      failure = ProvisionFailure(
        code: 'write_failed',
        message: '配置下发失败：$message',
        row: 'wifi',
        recovery: 'retry',
      );
    }
    notifyListeners();
  }

  void _onStatusText(String text) {
    final status = parseProvisionStatus(text);
    if (status == null) return;
    debugPrint('P002: status state=${status.state} step=${status.step} error=${status.error}');
    lastStatus = status;
    final idx = _stepIndex[status.step];
    if (idx != null && idx > _appliedStepIdx && status.error == null) {
      _applyStepIndex(idx);
      notifyListeners();
    }
    final terminal = _terminal;
    if (terminal == null || terminal.isCompleted) return;
    if (status.error != null) {
      _terminalError = status.error;
      terminal.complete(_TerminalOutcome.error);
    } else if (status.state == 'ready') {
      terminal.complete(_TerminalOutcome.ready);
    } else if (status.state == 'recovery') {
      _terminalError = status.error;
      terminal.complete(_TerminalOutcome.error);
    }
  }

  /// 单调推进行状态：失败行之前的行标 done，其后保持 pending
  void _applyStepIndex(int idx) {
    if (idx <= _appliedStepIdx) return;
    _appliedStepIdx = idx;
    progress = Map.of(_initialProgress);
    if (idx >= 6) {
      progress.updateAll((_, __) => ProvisionRowState.done);
      return;
    }
    if (idx >= 2) {
      progress['wifi'] = ProvisionRowState.done;
    } else {
      progress['wifi'] = ProvisionRowState.active;
    }
    if (idx >= 4) {
      progress['hub'] = ProvisionRowState.done;
    } else if (idx >= 2) {
      progress['hub'] = ProvisionRowState.active;
    }
    if (idx >= 6) {
      progress['conn'] = ProvisionRowState.done;
    } else if (idx >= 4) {
      progress['conn'] = ProvisionRowState.active;
    }
  }

  void _applyFailure(String code) {
    final row = provisionErrorRow(code);
    // 失败行之前的行推到 done（wifi←0 / hub←2 / conn←4 / usb←5），
    // 受单调保护：设备已推进到更后步骤时保留设备实际进度
    const rowStartIdx = {'wifi': 0, 'hub': 2, 'conn': 4, 'usb': 5};
    _applyStepIndex(rowStartIdx[row] ?? 0);
    progress[row] = ProvisionRowState.fail;
    failure = ProvisionFailure(
      code: code,
      message: provisioningErrorHints[code] ?? '配网失败：$code',
      row: row,
      recovery: provisionRecoveryAction(code),
    );
  }

  void _onConnectionLost() {
    debugPrint('P002: connection lost (phase=${phase.name} provisioning=$provisioning)');
    if (phase == ProvisionPhase.status && provisioning) {
      // 走终态队列串行化，避免与 submit 的收尾互相覆盖
      _terminalTimer?.cancel();
      _terminalTimer = null;
      final terminal = _terminal;
      _terminal = null;
      if (terminal != null && !terminal.isCompleted) {
        terminal.complete(_TerminalOutcome.lost);
      } else {
        provisioning = false;
        failure = const ProvisionFailure(
          code: 'connection_lost',
          message: '设备连接已断开。已填写的配网信息不会丢失，重新连接后可继续。',
          row: 'conn',
          recovery: 'reconnect',
        );
        notifyListeners();
      }
    } else {
      lost = true;
      notifyListeners();
    }
  }

  /// 取消等待（canon cancelwait：本地按 timeout 错误呈现，可重试下发）
  void cancelWait() {
    final terminal = _terminal;
    _terminalTimer?.cancel();
    _terminalTimer = null;
    _terminal = null;
    provisioning = false;
    if (terminal != null && !terminal.isCompleted) {
      terminal.complete(_TerminalOutcome.timeout);
    }
    failure = const ProvisionFailure(
      code: timeoutErrorCode,
      message: '等待设备确认超时（60s），可重试下发。',
      row: 'conn',
      recovery: 'retry',
    );
    notifyListeners();
  }

  /// 返回表单修改（canon backform：重置进度与错误，保留已填表单）
  void backToForm() {
    phase = ProvisionPhase.configure;
    provisioning = false;
    done = false;
    failure = null;
    progress = Map.of(_initialProgress);
    _appliedStepIdx = -1;
    notifyListeners();
  }

  /// 设备身份/状态复核（P005 诊断的最小真实投影：重读两特征）
  Future<DiagnosticsSnapshot> runDiagnostics() async {
    final transport = _transport;
    if (transport == null) {
      throw const FormatException('BLE 未连接');
    }
    return DiagnosticsSnapshot(
      deviceInfoRaw: await transport.readDeviceInfo(),
      statusRaw: await transport.readStatus(),
      at: DateTime.now(),
    );
  }

  /// configure 阶段每 2s 读一次 STATUS 特征：
  /// - 维持链路活跃：E13 真机实测无 GATT 活动时部分 Android 栈会
  ///   l2c_link_timeout 拆 ACL（旧加密模型下配对弹窗每连必现即此症状；
  ///   V1 简化后配对已移除，轮询作为链路保活继续保留）；
  /// - 顺带刷新 lastStatus（连接徽标/状态新鲜度）。
  /// 轮询读失败不打断流程（瞬时失败属预期）；
  /// 真实断连仍由 transport 的 onLost 回调统一上报。
  void _startStatusPoll() {
    _statusPollTimer?.cancel();
    _statusPollTimer = Timer.periodic(const Duration(seconds: 2), (_) async {
      final transport = _transport;
      if (transport == null || lost || provisioning) return;
      try {
        final text = await transport.readStatus();
        if (text != _lastStatusRaw) {
          _lastStatusRaw = text;
          final st = parseProvisionStatus(text);
          if (st != null) lastStatus = st;
          notifyListeners();
        }
      } catch (_) {
        // 瞬时失败忽略：持续断连由 onLost 上报
      }
    });
  }

  Future<void> _closeTransport() async {
    _statusPollTimer?.cancel();
    _statusPollTimer = null;
    await _statusSub?.cancel();
    await _infoSub?.cancel();
    _statusSub = null;
    _infoSub = null;
    _terminalTimer?.cancel();
    _terminalTimer = null;
    final terminal = _terminal;
    _terminal = null;
    if (terminal != null && !terminal.isCompleted) {
      terminal.complete(_TerminalOutcome.timeout);
    }
    final transport = _transport;
    _transport = null;
    await transport?.close();
  }

  @override
  void dispose() {
    _closeTransport();
    super.dispose();
  }
}

/// 诊断快照（原始 JSON 文本，页面侧再 pretty-print）
class DiagnosticsSnapshot {
  const DiagnosticsSnapshot({
    required this.deviceInfoRaw,
    required this.statusRaw,
    required this.at,
  });

  final String deviceInfoRaw;
  final String statusRaw;
  final DateTime at;
}
