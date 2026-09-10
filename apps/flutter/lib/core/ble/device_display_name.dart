/// BLE 设备显示名解析（纯函数，无 Flutter 依赖）。
///
/// 批准链（REQ-013 / FEAT-013，对齐 apps/uniapp/services/ble-runtime/device-display-name.js）：
/// name → advName（平台 localName，即 AD 0x09/0x08 的平台投影——FBP 不暴露原始
/// AD 字节，平台层已解析）→ Profile 名 → 「未命名 BLE · ID后四位」。
/// 终点永不空、永不「未知设备」。
library;

const int _maxDisplayNameLength = 128;

String normalizeDisplayName(String? value) {
  if (value == null) return '';
  final text = value.trim();
  if (text.isEmpty) return '';
  if (text.length <= _maxDisplayNameLength) return text;
  return text.substring(0, _maxDisplayNameLength);
}

String deviceIdSuffix(String deviceId) {
  final cleaned = deviceId.replaceAll(RegExp(r'[^0-9A-Za-z]'), '');
  final base = cleaned.isEmpty ? deviceId : cleaned;
  final suffix = base.length >= 4 ? base.substring(base.length - 4) : base;
  return suffix.toUpperCase().isEmpty ? '----' : suffix.toUpperCase();
}

class DeviceDisplayNameResult {
  const DeviceDisplayNameResult({
    required this.displayName,
    required this.source,
    required this.confidence,
  });

  final String displayName;
  final String source;
  final String confidence;
}

/// 依批准链解析显示名。
DeviceDisplayNameResult resolveDeviceDisplayName({
  required String deviceId,
  String? name,
  String? advName,
  String? profileName,
}) {
  final fromName = normalizeDisplayName(name);
  if (fromName.isNotEmpty) {
    return DeviceDisplayNameResult(
        displayName: fromName, source: 'deviceName', confidence: 'medium');
  }

  // 平台 localName（AD 0x09 Complete / 0x08 Shortened 的平台投影）
  final fromAdv = normalizeDisplayName(advName);
  if (fromAdv.isNotEmpty) {
    return DeviceDisplayNameResult(
        displayName: fromAdv, source: 'localName', confidence: 'high');
  }

  final fromProfile = normalizeDisplayName(profileName);
  if (fromProfile.isNotEmpty) {
    return DeviceDisplayNameResult(
        displayName: fromProfile, source: 'profile', confidence: 'medium');
  }

  return DeviceDisplayNameResult(
    displayName: '未命名 BLE · ${deviceIdSuffix(deviceId)}',
    source: 'deviceId',
    confidence: 'low',
  );
}
