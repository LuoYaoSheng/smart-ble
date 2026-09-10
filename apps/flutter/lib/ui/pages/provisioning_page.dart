// P002 Smart HID 配网向导（F018 连接确认 / F019 三阶段 / F020 扫码 /
// F021 下发 / F022 错误恢复 + U-01 离开确认）。
//
// 对齐原型 docs/specs/prototype/v1-new/pages/p002-provision.js 与
// app.js p002* 动作族；协议与状态机见 core/protocols/hid_provisioning_protocol.dart
// 与 core/ble/provisioning_controller.dart。
//
// 隐私约定：Wi-Fi 密码与配对 token 只存在于页面内存（TextEditingController /
// 字段），不写日志、不落存储；离开页面即清空（canon p002Cleanup）。

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/ble/provisioning_controller.dart';
import '../../core/models/ble_scan_result.dart';
import '../../core/protocols/hid_provisioning_protocol.dart';
import '../../core/ble/provisioning_transport.dart';
import '../../core/ble/hid_session_store.dart';
import '../../themes/app_theme.dart';
import 'hid_detail_page.dart';
import 'hid_diagnostics_page.dart';
import '../../core/design/app_icons.dart';
import '../design/app_subnav.dart';
import '../design/app_tokens.dart';

/// 扫码失败三分类（canon F020：取消不算错误 / 权限 / 无效）
enum QrFailureReason { cancel, permission, invalid }

class ProvisioningPage extends ConsumerStatefulWidget {
  const ProvisioningPage({super.key, required this.device});

  final BleScanResult device;

  @override
  ConsumerState<ProvisioningPage> createState() => _ProvisioningPageState();
}

class _ProvisioningPageState extends ConsumerState<ProvisioningPage> {
  late final ProvisioningController _controller;

  // 表单（内存态，离开即清空）
  final _ssidController = TextEditingController();
  final _pwdController = TextEditingController();
  final _hubController = TextEditingController();
  bool _showPwd = false;
  String? _token; // 32hex，仅内存
  QrFailureReason? _qrErr;

  bool _qrHandled = false;
  bool _submittingGate = false;

  bool get _hasFormInput =>
      _ssidController.text.isNotEmpty ||
      _hubController.text.isNotEmpty ||
      _token != null;

  @override
  void initState() {
    super.initState();
    _controller = ProvisioningController(
      transportFactory: () => FbpProvisioningTransport(),
    );
    _controller.addListener(_onControllerChanged);
    _controller.connectDevice(widget.device.deviceId);
  }

  void _onControllerChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _controller.removeListener(_onControllerChanged);
    _controller.dispose();
    // canon p002Cleanup：离开即清空敏感内存
    _ssidController.dispose();
    _pwdController.clear();
    _pwdController.dispose();
    _hubController.dispose();
    _token = null;
    super.dispose();
  }

  // ------------------------------------------------------------------
  // 离开确认（U-01，文案逐字对齐原型 p002LeaveConfirm）
  // ------------------------------------------------------------------
  Future<bool> _confirmLeave() async {
    if (_controller.provisioning) {
      final leave = await _dialog(
        title: '离开确认',
        content: '离开将取消本次配置等待，确定离开吗？',
        confirmText: '离开',
        cancelText: '继续配置',
      );
      if (leave && mounted) Navigator.of(context).pop();
      return false; // 返回动作统一由上面 pop 完成
    }
    if (_controller.phase == ProvisionPhase.configure && _hasFormInput) {
      final leave = await _dialog(
        title: '离开确认',
        content: '已填写的配网信息与配对令牌将全部清空（隐私约定：不写入本地）。确定离开吗？',
        confirmText: '离开并清空',
        cancelText: '继续填写',
      );
      if (leave && mounted) Navigator.of(context).pop();
      return false;
    }
    return true;
  }

  Future<bool> _dialog({
    required String title,
    required String content,
    required String confirmText,
    required String cancelText,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        content: Text(content,
            style: const TextStyle(
                fontSize: 13, height: 1.6, color: AppTokens.cSub)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(cancelText,
                style: const TextStyle(color: AppTheme.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(confirmText,
                style: const TextStyle(
                    color: AppTheme.primaryColor, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
    return result == true;
  }

  // ------------------------------------------------------------------
  // 下发
  // ------------------------------------------------------------------
  Future<void> _doSubmit() async {
    if (_submittingGate) return;
    _submittingGate = true;
    try {
      // hub 输入形如 192.168.1.8:17892，拆 host/port
      var host = _hubController.text.trim();
      var port = ProvisioningConstants.defaultPairingPort;
      final colon = host.lastIndexOf(':');
      if (colon > 0) {
        final parsed = int.tryParse(host.substring(colon + 1));
        if (parsed == null || parsed < 1 || parsed > 65535) {
          _toast('ControlHub 地址端口格式非法');
          return;
        }
        port = parsed;
        host = host.substring(0, colon).trim();
      }
      await _controller.submit(
        wifiSsid: _ssidController.text,
        wifiPassword: _pwdController.text,
        hubHost: host,
        hubPort: port,
        token: _token ?? '',
      );
    } on FormatException catch (e) {
      _toast(e.message);
    } catch (e) {
      _toast('下发失败: $e');
    } finally {
      _submittingGate = false;
    }
  }

  void _toast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  // ------------------------------------------------------------------
  // 扫码（F020）
  // ------------------------------------------------------------------
  Future<void> _openQrScanner() async {
    setState(() => _qrErr = null);

    final status = await Permission.camera.status;
    var granted = status.isGranted;
    if (!granted) {
      if (status.isPermanentlyDenied) {
        setState(() => _qrErr = QrFailureReason.permission);
        return;
      }
      granted = (await Permission.camera.request()).isGranted;
    }
    if (!granted) {
      setState(() => _qrErr = QrFailureReason.permission);
      return;
    }

    _qrHandled = false;
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => _QrScannerSheet(
        onScanned: _onQrText,
        onManualPaste: _onQrText,
        onClosed: () => _onQrFailed(QrFailureReason.cancel),
      ),
    );
  }

  void _onQrText(String text) {
    if (_qrHandled) return;
    _qrHandled = true;
    final payload = parsePairingQrPayload(text);
    // 日志不落 token/URI 全文（隐私约定）
    debugPrint(
        'P002: qr parse ${payload != null ? "ok host=${payload.host}:${payload.port}" : "INVALID"} len=${text.length}');
    // 注意：这里不 pop 扫码面板——面板在两条路径下都自行退场
    // （粘贴路径 qrParseBtn 先 pop 再回调；相机路径 onDetect 自 pop）。
    // 早期版本这里再 pop 一次会把配网页本身弹掉（E2E 实测 DEF）。
    if (payload == null) {
      _onQrFailed(QrFailureReason.invalid);
      return;
    }
    setState(() {
      _token = payload.token;
      if (_hubController.text.trim().isEmpty) {
        _hubController.text = '${payload.host}:${payload.port}';
      }
    });
    _toast('配对码已解析 · 地址与令牌已回填');
  }

  void _onQrFailed(QrFailureReason reason) {
    setState(() => _qrErr = reason);
    _toast(const {
      QrFailureReason.cancel: '已取消扫码（不算错误）',
      QrFailureReason.permission: '扫码权限被拒绝',
      QrFailureReason.invalid: '未识别到有效配对码',
    }[reason]!);
  }

  // ------------------------------------------------------------------
  // P005 诊断：独立职责页面（PAGE_FLOW P002 错误恢复 → diagnostics）。
  // ------------------------------------------------------------------
  void _openDiagnostics() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => HidDiagnosticsPage(
          deviceId: widget.device.deviceId,
          name: widget.device.displayName,
          fromWizard: true,
        ),
      ),
    );
  }

  // ------------------------------------------------------------------
  // build
  // ------------------------------------------------------------------
  @override
  Widget build(BuildContext context) {
    final stepIdx = switch (_controller.phase) {
      ProvisionPhase.connect => 0,
      ProvisionPhase.configure => 1,
      ProvisionPhase.status => 2,
    };

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _confirmLeave();
      },
      child: Scaffold(
        backgroundColor: AppTokens.cBg /* --c-bg #F8FBFF · UI-CONV 2026-09-10 */,
        // UI-G2：正典 AppSubnav（返回走 U-01 离开确认，PopScope 同口径）
        appBar: AppSubnav(title: '配置 Smart HID', onBack: _confirmLeave),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            _Stepper(steps: const ['连接设备', '填写配置', '下发状态'], current: stepIdx),
            const SizedBox(height: 12),
            _buildDeviceHeader(),
            const SizedBox(height: 12),
            switch (_controller.phase) {
              ProvisionPhase.connect => _buildConnectPhase(),
              ProvisionPhase.configure => _buildConfigurePhase(),
              ProvisionPhase.status => _buildStatusPhase(),
            },
          ],
        ),
      ),
    );
  }

  Widget _buildDeviceHeader() {
    final info = _controller.deviceInfo;
    final name = widget.device.displayName;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppTokens.cSuccessWeak, AppTokens.cSuccess],
              ),
            ),
            alignment: Alignment.center,
            child: Text(
              name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'S',
              style: const TextStyle(
                  color: AppTokens.cSuccessDeep,
                  fontWeight: FontWeight.w800,
                  fontSize: 16),
            ),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name.isNotEmpty ? name : 'Smart HID 设备',
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  info != null
                      ? '${widget.device.deviceId} · Device Info 已验证'
                      : widget.device.deviceId,
                  style: const TextStyle(
                      fontSize: 10,
                      color: AppTheme.textSecondary,
                      fontFamily: 'monospace'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ---- 阶段一：连接确认（F018） ----
  Widget _buildConnectPhase() {
    if (_controller.connecting) {
      return _OpCard(
        icon: 'scan',
        iconColor: AppTheme.primaryColor,
        title: '连接并确认设备中…',
        desc: '正在建立 GATT 连接 · ${widget.device.displayName}',
      );
    }
    final err = _controller.connError;
    if (err != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ErrorBanner(code: 'identity_failed', message: err),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: _PrimaryButton(
                label: '重新连接',
                icon: 'refresh',
                onPressed: () =>
                    _controller.connectDevice(widget.device.deviceId),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: _SoftButton(
                label: '返回设备列表',
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ]),
        ],
      );
    }
    return const SizedBox.shrink();
  }

  // ---- 阶段二：填写配置（F019/F020） ----
  Widget _buildConfigurePhase() {
    final canSubmit = _ssidController.text.trim().isNotEmpty &&
        _hubController.text.trim().isNotEmpty &&
        _token != null &&
        !_controller.provisioning &&
        !_controller.lost;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_controller.lost) ...[
          const _ErrorBanner(
            code: 'connection_lost',
            message: '设备连接已断开。已填写的配网信息不会丢失，重新连接后可继续。',
          ),
          const SizedBox(height: 12),
          _PrimaryButton(
            label: '重新连接',
            icon: 'refresh',
            onPressed: () => _controller.connectDevice(widget.device.deviceId),
          ),
          const SizedBox(height: 12),
        ],
        Row(
          children: [
            _StatusBadge(connected: !_controller.lost),
            const SizedBox(width: 8),
            Text(widget.device.deviceId,
                style: const TextStyle(
                    fontSize: 10,
                    color: AppTheme.textSecondary,
                    fontFamily: 'monospace')),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _FormField(
                key: const ValueKey('ssidField'),
                label: 'Wi-Fi 名称',
                required: true,
                controller: _ssidController,
                maxLength: 32,
                hint: '家庭 / 办公 2.4G Wi-Fi',
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 14),
              _FormField(
                key: const ValueKey('pwdField'),
                label: 'Wi-Fi 密码',
                controller: _pwdController,
                maxLength: 64,
                hint: '无密码可留空',
                obscure: !_showPwd,
                suffix: IconButton(
                  icon: AppIcon(_showPwd ? 'eye-off' : 'eye',
                      size: 18, color: AppTheme.textSecondary),
                  onPressed: () => setState(() => _showPwd = !_showPwd),
                ),
              ),
              const SizedBox(height: 14),
              _FormField(
                key: const ValueKey('hubField'),
                label: 'ControlHub 地址',
                required: true,
                controller: _hubController,
                hint: '192.168.1.8:17892',
                mono: true,
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _QrActionCard(
          key: const ValueKey('qrCard'),
          hasToken: _token != null,
          onTap: _openQrScanner,
        ),
        if (_qrErr != null) ...[
          const SizedBox(height: 10),
          _QrErrorPanel(
            reason: _qrErr!,
            onRetry: _openQrScanner,
            onOpenSettings: () async {
              await openAppSettings();
            },
          ),
        ],
        const SizedBox(height: 12),
        const _InfoNote(text: 'Wi-Fi 密码和配对凭据只用于本次下发，不写入日志或本地存储。'),
        const SizedBox(height: 16),
        _PrimaryButton(
          key: const ValueKey('submitBtn'),
          label: '下发配置',
          icon: 'send',
          onPressed: canSubmit ? _doSubmit : null,
        ),
      ],
    );
  }

  // ---- 阶段三：下发状态（F021/F022） ----
  Widget _buildStatusPhase() {
    final c = _controller;
    if (c.done) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: Column(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: const BoxDecoration(
                    color: AppTokens.cSuccessWeak,
                    shape: BoxShape.circle,
                  ),
                  child: const AppIcon('check',
                      size: 30, color: AppTokens.cSuccessDeep),
                ),
                const SizedBox(height: 12),
                const Text('配置成功 · 设备 READY',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                const Text('HID 控制请通过 ControlHub 下发',
                    style:
                        TextStyle(fontSize: 14, color: AppTheme.textSecondary)),
                const SizedBox(height: 16),
                _PrimaryButton(
                  label: '查看设备',
                  icon: 'chev-r',
                  onPressed: _openPostSuccess,
                ),
              ],
            ),
          ),
        ],
      );
    }

    final failure = c.failure;
    const rows = [
      ('wifi', 'Wi-Fi 连接'),
      ('hub', 'ControlHub 配对'),
      ('conn', 'MQTT 控制链路'),
      ('usb', 'USB HID Ready'),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (failure != null) ...[
          _ErrorBanner(code: failure.code, message: failure.message),
          const SizedBox(height: 12),
        ],
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: Column(
            children: [
              for (final (key, title) in rows)
                _ProgressRow(
                  title: title,
                  state: c.progress[key] ?? ProvisionRowState.pending,
                  errorCode: failure != null && failure.row == key
                      ? failure.code
                      : null,
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (failure != null)
          _RecoveryButton(failure: failure, page: this)
        else if (c.provisioning)
          _SoftButton(
              key: const ValueKey('cancelWaitBtn'),
              label: '取消等待',
              onPressed: _controller.cancelWait),
      ],
    );
  }

  Future<void> _openPostSuccess() async {
    // P003（SHID 设备详情）：写入内存会话快照（零持久化）后
    // pushReplacement 进入（uni-app redirectTo 语义：返回不回到已完成向导）。
    final info = _controller.deviceInfo;
    HidSessionStore.instance.commit(HidSessionSnapshot(
      deviceId: widget.device.deviceId,
      name: widget.device.displayName,
      firmware: info?.firmware ?? '',
      protocol: info?.protocol ?? '',
      lastWifi: _ssidController.text,
      lastHub: _hubController.text,
    ));
    if (!mounted) return;
    await Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (context) => HidDetailPage(
          deviceId: widget.device.deviceId,
          name: widget.device.displayName,
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// 恢复动作按钮（F022：form/pairing/diagnostics/retry/reconnect）
// ----------------------------------------------------------------------
class _RecoveryButton extends StatelessWidget {
  const _RecoveryButton({required this.failure, required this.page});

  final ProvisionFailure failure;
  final _ProvisioningPageState page;

  @override
  Widget build(BuildContext context) {
    switch (failure.recovery) {
      case 'form':
        return _PrimaryButton(
          label: '返回表单修改',
          icon: 'set',
          onPressed: page._controller.backToForm,
        );
      case 'pairing':
        return _PrimaryButton(
          label: '重新扫描配对码',
          icon: 'qr',
          onPressed: () {
            page._token = null;
            page._qrErr = null;
            page._controller.backToForm();
          },
        );
      case 'diagnostics':
        return _PrimaryButton(
          label: '运行诊断',
          icon: 'pulse',
          onPressed: page._openDiagnostics,
        );
      case 'reconnect':
        return _PrimaryButton(
          label: '重新连接设备',
          icon: 'refresh',
          onPressed: () async {
            await page._controller.connectDevice(page.widget.device.deviceId);
            if (page._controller.phase == ProvisionPhase.configure) {
              page._controller.backToForm();
            }
          },
        );
      default:
        return _PrimaryButton(
          label: '重新下发',
          icon: 'send',
          onPressed: page._doSubmit,
        );
    }
  }
}

// ----------------------------------------------------------------------
// C6 stepper
// ----------------------------------------------------------------------
class _Stepper extends StatelessWidget {
  const _Stepper({required this.steps, required this.current});

  final List<String> steps;
  final int current;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          if (i > 0)
            Expanded(
              child: Container(
                height: 2,
                margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 12),
                color: i <= current ? AppTokens.cSuccess : AppTheme.borderColor,
              ),
            ),
          Column(
            children: [
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i < current
                      ? AppTokens.cSuccessWeak
                      : i == current
                          ? AppTheme.primaryColor
                          : Colors.white,
                  border: Border.all(
                    color: i < current
                        ? AppTokens.cSuccess
                        : i == current
                            ? AppTheme.primaryColor
                            : AppTheme.borderColor,
                    width: i == current ? 0 : 1.5,
                  ),
                  boxShadow: i == current
                      ? [
                          BoxShadow(
                            color:
                                AppTheme.primaryColor.withValues(alpha: 0.15),
                            spreadRadius: 4,
                          )
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: i < current
                    ? const AppIcon('check',
                        size: 14, color: AppTokens.cSuccessDeep)
                    : Text(
                        '${i + 1}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: i == current
                              ? Colors.white
                              : AppTheme.textSecondary,
                        ),
                      ),
              ),
              const SizedBox(height: 5),
              Text(
                steps[i],
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: i == current ? FontWeight.w700 : FontWeight.w500,
                  color: i < current
                      ? AppTokens.cSuccessDeep
                      : i == current
                          ? AppTheme.primaryColor
                          : AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

// ----------------------------------------------------------------------
// 通用小组件
// ----------------------------------------------------------------------
class _OpCard extends StatelessWidget {
  const _OpCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.desc,
  });

  final String icon;
  final Color iconColor;
  final String title;
  final String desc;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 26),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        children: [
          AppIcon(icon, size: 40, color: iconColor),
          const SizedBox(height: 12),
          Text(title,
              style:
                  const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(desc,
              style:
                  const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.code, required this.message});
  final String code;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTokens.cDangerWeak,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTokens.cDanger.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppIcon('warn', size: 16, color: AppTokens.cDanger),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Text('配网失败 ',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppTokens.cDanger)),
                  Text(code,
                      style: const TextStyle(
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: AppTokens.cDanger)),
                ]),
                const SizedBox(height: 4),
                Text(message,
                    style: const TextStyle(
                        fontSize: 12, height: 1.5, color: AppTokens.cSub /* 正典 .ebanner .d 文本色 --c-sub */)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.connected});

  final bool connected;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: connected ? AppTokens.cSuccessWeak : AppTokens.cDangerWeak,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: connected ? AppTokens.cSuccess : AppTokens.cDanger,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            connected ? '已连接' : '已断开',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color:
                  connected ? AppTokens.cSuccessDeep : AppTokens.cDanger,
            ),
          ),
        ],
      ),
    );
  }
}

class _FormField extends StatelessWidget {
  const _FormField({
    super.key,
    required this.label,
    required this.controller,
    this.required = false,
    this.maxLength,
    this.hint,
    this.obscure = false,
    this.mono = false,
    this.suffix,
    this.onChanged,
  });

  final String label;
  final TextEditingController controller;
  final bool required;
  final int? maxLength;
  final String? hint;
  final bool obscure;
  final bool mono;
  final Widget? suffix;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Text(label,
              style:
                  const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          if (required)
            const Text(' *',
                style: TextStyle(fontSize: 13, color: AppTokens.cDanger)),
        ]),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLength: maxLength,
          obscureText: obscure,
          onChanged: onChanged,
          style: TextStyle(fontSize: 14, fontFamily: mono ? 'monospace' : null),
          decoration: InputDecoration(
            counterText: '',
            hintText: hint,
            hintStyle: TextStyle(
                fontSize: 13,
                color: AppTheme.textSecondary.withValues(alpha: 0.6)),
            suffixIcon: suffix,
            isDense: true,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppTheme.borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide:
                  const BorderSide(color: AppTheme.primaryColor, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}

class _QrActionCard extends StatelessWidget {
  const _QrActionCard({super.key, required this.hasToken, required this.onTap});

  final bool hasToken;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: hasToken ? AppTokens.cSuccessWeak : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: hasToken ? AppTokens.cSuccess : AppTheme.borderColor,
            width: hasToken ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            AppIcon('qr',
                size: 30,
                color:
                    hasToken ? AppTokens.cSuccessDeep : AppTheme.primaryColor),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hasToken ? '重新扫描配对码' : '扫描 ControlHub 配对码',
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    hasToken
                        ? 'token 已获取（内存会话，不落盘）'
                        : '扫码解析 shid://pair 自动回填地址与令牌',
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color:
                    hasToken ? AppTokens.cSuccessWeak : AppTokens.cWarningWeak,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                hasToken ? '已获取' : '必需',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: hasToken
                      ? AppTokens.cSuccessDeep
                      : AppTokens.cWarningDeep,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QrErrorPanel extends StatelessWidget {
  const _QrErrorPanel({
    required this.reason,
    required this.onRetry,
    required this.onOpenSettings,
  });

  final QrFailureReason reason;
  final VoidCallback onRetry;
  final Future<void> Function() onOpenSettings;

  @override
  Widget build(BuildContext context) {
    final isWarn = reason == QrFailureReason.cancel;
    final titles = {
      QrFailureReason.cancel: '扫码取消',
      QrFailureReason.permission: '权限拒绝',
      QrFailureReason.invalid: '二维码无效',
    };
    final descs = {
      QrFailureReason.cancel: '未完成扫码（用户取消，不算错误）。已填写的配置信息不受影响，可重新扫描。',
      QrFailureReason.permission: '扫码权限被拒绝。请在系统设置中允许相机权限后重试。',
      QrFailureReason.invalid:
          '未识别到有效配对码（非 shid://pair 或缺少参数）。请对准 ControlHub 屏显二维码重试。',
    };
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isWarn ? AppTokens.cWarningWeak : AppTokens.cDangerWeak,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isWarn
              ? AppTokens.cWarningDeep.withValues(alpha: 0.4)
              : AppTokens.cDanger.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(titles[reason]!,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isWarn
                      ? AppTokens.cWarningDeep
                      : AppTokens.cDanger)),
          const SizedBox(height: 4),
          Text(descs[reason]!,
              style: const TextStyle(
                  fontSize: 12, height: 1.5, color: AppTokens.cSub)),
          const SizedBox(height: 10),
          Row(children: [
            if (reason == QrFailureReason.permission) ...[
              Expanded(
                child: _SoftButton(
                    label: '去设置', onPressed: () => onOpenSettings()),
              ),
              const SizedBox(width: 9),
            ],
            Expanded(
              child:
                  _PrimaryButton(label: '重新扫码', icon: 'qr', onPressed: onRetry),
            ),
          ]),
        ],
      ),
    );
  }
}

class _InfoNote extends StatelessWidget {
  const _InfoNote({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTokens.cPrimaryWeak,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppIcon('info', size: 15, color: AppTheme.primaryColor),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                  fontSize: 12, height: 1.5, color: AppTokens.noteInfoFg /* 正典 .note.info #2E5290 */),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressRow extends StatelessWidget {
  const _ProgressRow({
    required this.title,
    required this.state,
    this.errorCode,
  });

  final String title;
  final ProvisionRowState state;
  final String? errorCode;

  @override
  Widget build(BuildContext context) {
    Widget indicator;
    switch (state) {
      case ProvisionRowState.pending:
        indicator = Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
                color: AppTheme.borderColor,
                width: 1.5,
                style: BorderStyle.solid),
          ),
        );
      case ProvisionRowState.active:
        indicator = const SizedBox(
          width: 22,
          height: 22,
          child: Padding(
            padding: EdgeInsets.all(3),
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(AppTheme.primaryColor),
            ),
          ),
        );
      case ProvisionRowState.done:
        indicator = Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: AppTokens.cSuccessWeak,
            shape: BoxShape.circle,
            border: Border.all(color: AppTokens.cSuccess, width: 1.5),
          ),
          child:
              const AppIcon('check', size: 13, color: AppTokens.cSuccessDeep),
        );
      case ProvisionRowState.fail:
        indicator = Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: AppTokens.cDangerWeak,
            shape: BoxShape.circle,
            border: Border.all(color: AppTokens.cDanger, width: 1.5),
          ),
          child: const AppIcon('x', size: 13, color: AppTokens.cDanger),
        );
    }
    final strong =
        state == ProvisionRowState.active || state == ProvisionRowState.done;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 11),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppTokens.cLineSoft, width: 1),
        ),
      ),
      child: Row(
        children: [
          indicator,
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 14,
                fontWeight: state == ProvisionRowState.fail || strong
                    ? FontWeight.w700
                    : FontWeight.w500,
                color: state == ProvisionRowState.fail
                    ? AppTokens.cDanger
                    : strong
                        ? AppTokens.cText
                        : AppTheme.textSecondary,
              ),
            ),
          ),
          if (errorCode != null)
            Text(errorCode!,
                style: const TextStyle(
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: AppTheme.textSecondary)),
        ],
      ),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton(
      {super.key, required this.label, this.icon, this.onPressed});

  final String label;
  final String? icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: icon != null
            ? AppIcon(icon!,
                size: 17,
                color: onPressed == null ? Colors.white70 : Colors.white)
            : const SizedBox.shrink(),
        label: Text(label,
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: onPressed == null ? Colors.white70 : Colors.white)),
        style: ElevatedButton.styleFrom(
          backgroundColor: onPressed == null
              ? AppTheme.primaryColor.withValues(alpha: 0.45)
              : AppTheme.primaryColor,
          foregroundColor: Colors.white,
          disabledBackgroundColor:
              AppTheme.primaryColor.withValues(alpha: 0.45),
          disabledForegroundColor: Colors.white70,
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );
  }
}

class _SoftButton extends StatelessWidget {
  const _SoftButton(
      {super.key, required this.label, this.onPressed, this.icon});

  final String label;
  final VoidCallback? onPressed;
  final String? icon;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: icon != null
            ? AppIcon(icon!, size: 16, color: AppTheme.textSecondary)
            : const SizedBox.shrink(),
        label: Text(label,
            style: const TextStyle(
                fontSize: 14,
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.w500)),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppTheme.borderColor),
          padding: const EdgeInsets.symmetric(vertical: 12),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );
  }
}

// ----------------------------------------------------------------------
// 扫码面板（相机 + 手动粘贴配对码兜底）
// ----------------------------------------------------------------------
class _QrScannerSheet extends StatefulWidget {
  const _QrScannerSheet({
    required this.onScanned,
    required this.onManualPaste,
    required this.onClosed,
  });

  final ValueChanged<String> onScanned;
  final ValueChanged<String> onManualPaste;
  final VoidCallback onClosed;

  @override
  State<_QrScannerSheet> createState() => _QrScannerSheetState();
}

class _QrScannerSheetState extends State<_QrScannerSheet> {
  final _pasteController = TextEditingController();
  bool _pasteExpanded = false;
  bool _closed = false;

  void _close() {
    if (_closed) return;
    _closed = true;
    if (mounted) Navigator.of(context).pop();
    widget.onClosed();
  }

  @override
  void dispose() {
    _pasteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text('扫描 ControlHub 配对码',
                    style:
                        TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              ),
              IconButton(
                icon: const AppIcon('x', size: 20),
                onPressed: _close,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Container(
            height: 300,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: AppTheme.borderColor,
                  width: 1.5,
                  style: BorderStyle.solid),
            ),
            clipBehavior: Clip.antiAlias,
            child: MobileScanner(
              onDetect: (capture) {
                for (final barcode in capture.barcodes) {
                  final value = barcode.rawValue;
                  if (value != null && value.isNotEmpty) {
                    widget.onScanned(value);
                    if (!_closed) {
                      _closed = true;
                      Navigator.of(context).pop();
                    }
                    return;
                  }
                }
              },
            ),
          ),
          const SizedBox(height: 8),
          const Text('shid://pair · ControlHub 屏显二维码',
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: AppTheme.textSecondary)),
          const SizedBox(height: 12),
          if (!_pasteExpanded)
            _SoftButton(
              key: const ValueKey('qrPasteExpand'),
              label: '手动粘贴配对码（无摄像头兜底）',
              icon: 'copy',
              onPressed: () => setState(() => _pasteExpanded = true),
            )
          else
            Row(
              children: [
                Expanded(
                  child: TextField(
                    key: const ValueKey('qrPasteField'),
                    controller: _pasteController,
                    style:
                        const TextStyle(fontSize: 13, fontFamily: 'monospace'),
                    decoration: InputDecoration(
                      hintText: 'shid://pair?token=…&host=…&port=…',
                      isDense: true,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide:
                            const BorderSide(color: AppTheme.borderColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide:
                            const BorderSide(color: AppTheme.primaryColor),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  key: const ValueKey('qrParseBtn'),
                  onPressed: () {
                    final text = _pasteController.text.trim();
                    if (text.isEmpty) return;
                    _closed = true; // 粘贴路径按成功/无效自行接管，不再回调 onClosed
                    Navigator.of(context).pop();
                    widget.onManualPaste(text);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                  child: const Text('解析'),
                ),
              ],
            ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
