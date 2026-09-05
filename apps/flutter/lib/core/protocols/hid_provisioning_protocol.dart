/// Smart HID BLE Provisioning Protocol — Flutter 侧锁定镜像
///
/// 事实源：`core/protocols/hid-provisioning-protocol.ts`（其事实源为
/// Smart-HID-Workspace `protocols/ble/PROVISIONING_V1.md`）。三处同步修改。
/// 与 TS 镜像保持逐字段一致：UUID、校验规则、错误码、恢复动作。
///
/// BLE 只负责：设备发现 / 配网 / 状态查询。
/// HID 实时控制不走 BLE（走 ControlHub HTTP → MQTT → ESP32）。
library;

import 'dart:convert';

/* ------------------------------------------------------------------ */
/* GATT 结构（PROVISIONING_V1 §2）                                     */
/* ------------------------------------------------------------------ */

/// Smart HID Provisioning Service UUID（128-bit，广播中携带，可据此过滤扫描）
const String smartHidProvisioningServiceUuid =
    '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04';

/// 三个 GATT 特征（UUID 仅末尾一段不同：1002 info / 1003 input / 1004 status）
class SmartHidCharacteristicUuids {
  /// Device Info：read + notify
  static const String info = '9f1d1002-e73b-4c8f-9d2a-6f0b5e8a1c04';

  /// Provision Input：write（明文；V1 简化不发起 SMP/系统配对）
  static const String input = '9f1d1003-e73b-4c8f-9d2a-6f0b5e8a1c04';

  /// Provision Status：read + notify
  static const String status = '9f1d1004-e73b-4c8f-9d2a-6f0b5e8a1c04';
}

/// 设备名前缀（Scan Response 广播名形如 SHID-ABCD1234）
const String smartHidNamePrefix = 'SHID-';

/* ------------------------------------------------------------------ */
/* 常量                                                                 */
/* ------------------------------------------------------------------ */

class ProvisioningConstants {
  /// Provision Input JSON 的 v 字段（协议版本，当前仅 1）
  static const int candidateVersion = 1;

  /// Device Info 中的 protocol 字段
  static const String protocolVersion = '1.0';

  /// Device ID 正则（HID- + 8 位大写字母数字）
  static final RegExp deviceIdPattern = RegExp(r'^HID-[A-Z0-9]{8}$');

  /// 广播设备名正则（SHID- + 6~8 位）
  static final RegExp deviceNamePattern = RegExp(r'^SHID-[A-Z0-9]{6,8}$');

  /// ControlHub Pairing 默认端口
  static const int defaultPairingPort = 17892;

  /// Pairing token 形态（32 位小写十六进制）
  static final RegExp tokenPattern = RegExp(r'^[0-9a-f]{32}$');

  /// 配网 QR URI scheme
  static const String qrScheme = 'shid://pair';
}

/* ------------------------------------------------------------------ */
/* Provision Input（一次分帧写入的完整 candidate，PROVISIONING_V1 §4）   */
/* ------------------------------------------------------------------ */

/// 配网候选配置输入（V1 为单次写入：Wi-Fi + hub + token 一个 JSON，
/// 设备侧 stage 到 NVS pending、全链路成功才 promote 为 active）。
class ProvisionCandidateInput {
  const ProvisionCandidateInput({
    required this.wifiSsid,
    required this.wifiPassword,
    required this.hubHost,
    this.hubPort,
    required this.token,
  });

  final String wifiSsid;
  final String wifiPassword;
  final String hubHost;
  final int? hubPort;
  final String token;
}

/// 构造并发送用的 candidate JSON 字符串。
/// 校验失败抛 [FormatException]（UI 层捕获后提示用户检查输入）。
String buildProvisionCandidateJson(ProvisionCandidateInput input) {
  final ssid = input.wifiSsid.trim();
  final password = input.wifiPassword;
  final host = input.hubHost.trim();
  final token = input.token.trim();
  final port = input.hubPort ?? ProvisioningConstants.defaultPairingPort;

  if (ssid.isEmpty) throw const FormatException('wifi_ssid 不能为空');
  if (ssid.length > 32) throw const FormatException('wifi_ssid 超长（≤32 字符）');
  if (password.length > 64) throw const FormatException('wifi_password 超长（≤64 字符）');
  if (host.isEmpty) throw const FormatException('hub_host 不能为空（请检查配对二维码）');
  if (port < 1 || port > 65535) throw const FormatException('hub_port 非法');
  if (!ProvisioningConstants.tokenPattern.hasMatch(token)) {
    throw const FormatException('token 形态非法（需 32 位十六进制）');
  }

  return '{"v":1,'
      '"wifi_ssid":${_jsonString(ssid)},'
      '"wifi_password":${_jsonString(password)},'
      '"hub_host":${_jsonString(host)},'
      '"hub_port":$port,'
      '"token":${_jsonString(token)}}';
}

String _jsonString(String value) {
  const encoder = JsonEncoder();
  return encoder.convert(value);
}

/* ------------------------------------------------------------------ */
/* 配对 QR（PROVISIONING_V1 §1）                                        */
/* ------------------------------------------------------------------ */

/// QR 解析结果（敏感：token 仅内存持有，不持久化）
class PairingQrPayload {
  const PairingQrPayload({
    required this.token,
    required this.host,
    required this.port,
  });

  final String token;
  final String host;
  final int port;
}

/// 解析 ControlHub 动态配对二维码载荷：
///   shid://pair?token=<32hex>&host=<hub-lan-ip>&port=<17892>
///
/// 解析失败返回 null（不抛错，扫码流程按「非 Smart HID 码」处理）。
PairingQrPayload? parsePairingQrPayload(String text) {
  final s = text.trim();
  const scheme = ProvisioningConstants.qrScheme;
  if (!s.toLowerCase().startsWith(scheme)) return null;
  final query = s.substring(scheme.length);
  if (query.isNotEmpty && !query.startsWith('?') && !query.startsWith('&')) {
    return null;
  }

  final Map<String, String> params = {};
  for (final kv in query.replaceFirst(RegExp(r'^[?&]'), '').split('&')) {
    if (kv.isEmpty) continue;
    final eq = kv.indexOf('=');
    if (eq <= 0) continue;
    final key = Uri.decodeComponent(kv.substring(0, eq)).toLowerCase();
    if (params.containsKey(key)) return null; // 重复参数视为无效
    params[key] = Uri.decodeComponent(kv.substring(eq + 1));
  }

  final token = (params['token'] ?? '').toLowerCase();
  final host = (params['host'] ?? '').trim();
  if (!ProvisioningConstants.tokenPattern.hasMatch(token)) return null;
  if (host.isEmpty || RegExp(r'[\s/]').hasMatch(host)) return null;
  var port = ProvisioningConstants.defaultPairingPort;
  final portText = params['port'];
  if (portText != null && portText.isNotEmpty) {
    final p = int.tryParse(portText);
    if (p == null || p < 1 || p > 65535) return null;
    port = p;
  }
  return PairingQrPayload(token: token, host: host, port: port);
}

/* ------------------------------------------------------------------ */
/* Device Info / Provision Status（PROVISIONING_V1 §5 §6）              */
/* ------------------------------------------------------------------ */

/// Device Info 特征返回（读 / notify）
class SmartHidDeviceInfo {
  const SmartHidDeviceInfo({
    required this.product,
    required this.protocol,
    required this.deviceId,
    required this.firmware,
    required this.state,
    required this.provisioned,
  });

  final String product;
  final String protocol;
  final String deviceId;
  final String firmware;
  final String state;
  final bool provisioned;
}

/// Provision Status 特征返回（读 / notify）
class SmartHidProvisionStatus {
  const SmartHidProvisionStatus({
    required this.state,
    required this.step,
    this.error,
  });

  final String state;
  final String step;
  final String? error;
}

/// 设备侧状态机取值（provisioning 组件状态）
const List<String> provisioningStates = [
  'boot', 'load_config', 'unprovisioned', 'provisioning', 'connecting_wifi',
  'pairing', 'mqtt_connecting', 'ready', 'recovery', 'error',
];

/// 配网过渡步骤取值
const List<String> provisioningSteps = [
  'received', 'connecting_wifi', 'wifi_connected', 'pairing',
  'pairing_success', 'mqtt_connecting', 'ready',
];

/// 解析 Device Info JSON（防御式；非法返回 null）
SmartHidDeviceInfo? parseDeviceInfo(String text) {
  try {
    final o = jsonDecode(text);
    if (o is! Map<String, dynamic>) return null;
    final deviceId = o['device_id'];
    if (deviceId is! String || deviceId.isEmpty) return null;
    return SmartHidDeviceInfo(
      product: (o['product'] ?? '').toString(),
      protocol: (o['protocol'] ?? '').toString(),
      deviceId: deviceId,
      firmware: (o['firmware'] ?? '').toString(),
      state: (o['state'] ?? '').toString(),
      provisioned: o['provisioned'] == true,
    );
  } catch (_) {
    return null;
  }
}

/// 解析 Provision Status JSON（防御式；非法返回 null）
SmartHidProvisionStatus? parseProvisionStatus(String text) {
  try {
    final o = jsonDecode(text);
    if (o is! Map<String, dynamic>) return null;
    return SmartHidProvisionStatus(
      state: (o['state'] ?? '').toString(),
      step: (o['step'] ?? '').toString(),
      error: o['error']?.toString(),
    );
  } catch (_) {
    return null;
  }
}

/// 设备身份验证（对齐 uni-app smart-hid profile.verifyDeviceInfo）：
/// product 必须是 smart-hid、协议 1.0、device_id 符合 HID-XXXXXXXX
bool verifySmartHidDeviceInfo(SmartHidDeviceInfo info) {
  return info.product == 'smart-hid' &&
      info.protocol == ProvisioningConstants.protocolVersion &&
      ProvisioningConstants.deviceIdPattern.hasMatch(info.deviceId);
}

/* ------------------------------------------------------------------ */
/* 错误码（PROVISIONING_V1 §6，字符串，稳定勿改；可扩展新码）            */
/* ------------------------------------------------------------------ */

class ProvisioningErrorCodes {
  static const String invalidPayload = 'invalid_payload';
  static const String wifiFailed = 'wifi_failed';
  static const String controlhubUnreachable = 'controlhub_unreachable';
  static const String pairingInvalid = 'pairing_invalid';
  static const String pairingExpired = 'pairing_expired';
  static const String pairingUsed = 'pairing_used';
  static const String mqttInvalid = 'mqtt_invalid';
  static const String storageFailed = 'storage_failed';

  static const List<String> all = [
    invalidPayload,
    wifiFailed,
    controlhubUnreachable,
    pairingInvalid,
    pairingExpired,
    pairingUsed,
    mqttInvalid,
    storageFailed,
  ];
}

/// 错误码 → 客户端提示（PROVISIONING_V1 §6 表）
const Map<String, String> provisioningErrorHints = {
  ProvisioningErrorCodes.invalidPayload: '配置内容非法，请检查输入',
  ProvisioningErrorCodes.wifiFailed: 'Wi-Fi 连接失败，请检查 SSID / 密码',
  ProvisioningErrorCodes.controlhubUnreachable: '连不上 ControlHub，请确认它在运行、地址可达',
  ProvisioningErrorCodes.pairingInvalid: '配对码无效，请重新扫码',
  ProvisioningErrorCodes.pairingExpired: '配对码已过期，请重新扫码',
  ProvisioningErrorCodes.pairingUsed: '配对码已被使用，请重新扫码',
  ProvisioningErrorCodes.mqttInvalid: 'MQTT 连接失败，请进入诊断',
  ProvisioningErrorCodes.storageFailed: '设备存储失败，请重试或联系支持',
};

/// 状态行键（P002 下发状态四行）
const List<String> provisionRowKeys = ['wifi', 'hub', 'conn', 'usb'];

/// 本地等待超时使用的伪错误码（非设备侧码；对齐原型 cancelwait 语义）
const String timeoutErrorCode = 'timeout';

/// 错误码 → 状态行（失败行展示错误码 chip；此前的行标 done，其后保持 pending）。
/// storage_failed 发生在设备侧 promote（MQTT 之后），归入 usb 行。
String provisionErrorRow(String code) {
  switch (code) {
    case ProvisioningErrorCodes.wifiFailed:
    case ProvisioningErrorCodes.invalidPayload:
      return 'wifi';
    case ProvisioningErrorCodes.controlhubUnreachable:
    case ProvisioningErrorCodes.pairingInvalid:
    case ProvisioningErrorCodes.pairingExpired:
    case ProvisioningErrorCodes.pairingUsed:
      return 'hub';
    case ProvisioningErrorCodes.mqttInvalid:
      return 'conn';
    case ProvisioningErrorCodes.storageFailed:
      return 'usb';
    case timeoutErrorCode:
      return 'conn';
    default:
      return 'conn';
  }
}

/// 恢复动作（对齐 uni-app workflow.smartHidRecoveryAction）：
/// form=返回表单修改 / pairing=重新扫码 / diagnostics=运行诊断 / retry=重新下发
String provisionRecoveryAction(String code) {
  switch (code) {
    case ProvisioningErrorCodes.wifiFailed:
    case ProvisioningErrorCodes.invalidPayload:
      return 'form';
    case ProvisioningErrorCodes.pairingInvalid:
    case ProvisioningErrorCodes.pairingExpired:
    case ProvisioningErrorCodes.pairingUsed:
    case ProvisioningErrorCodes.controlhubUnreachable:
      return 'pairing';
    case ProvisioningErrorCodes.mqttInvalid:
      return 'diagnostics';
    default:
      return 'retry';
  }
}
