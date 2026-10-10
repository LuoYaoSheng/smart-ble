/// Provisioning Profile 注册表（Dart 侧投影）。
///
/// 契约事实源：`core/ble-core/provisioning/profile-contract.js` 与
/// `core/protocols/hid-provisioning-protocol.ts`（Smart HID 正典镜像）。
/// 匹配规则与 JS 侧一致：STRONG（广播 Service UUID 命中）优先于
/// WEAK（名称前缀）；这里只做扫描结果的匹配投影，不含配网业务逻辑。
library;

import '../models/ble_scan_result.dart';

/// 匹配级别（对齐 PROFILE_MATCH：NONE=0 / WEAK=1 / STRONG=2）
enum ProfileMatchLevel {
  none(0),
  weak(1),
  strong(2);

  const ProfileMatchLevel(this.value);
  final int value;
}

/// 一个设备家族如何被扫描结果识别
class ProvisioningProfile {
  final String id;
  final String displayName;
  final String serviceUuid;
  final String namePrefix;

  /// 卡片动作按钮文案（如「Smart HID 配网」）
  final String actionLabel;

  /// 匹配徽章短名（卡片 chip「X · 强/弱匹配」用；uniapp presentation.badge 对齐，
  /// 缺省回落 displayName——Smart HID 两者相同，ESP32 演示 badge 为「ESP32」）
  final String badge;

  const ProvisioningProfile({
    required this.id,
    required this.displayName,
    required this.serviceUuid,
    this.namePrefix = '',
    this.actionLabel = '',
    String? badge,
  }) : badge = badge ?? displayName;

  /// 扫描结果匹配（口径同 profile-contract.js 默认 matchAdvertisement）
  ProfileMatchLevel matchAdvertisement(BleScanResult device) {
    final advertised = device.serviceUuids.map(_normalizeUuid);
    if (advertised.contains(serviceUuid)) return ProfileMatchLevel.strong;
    if (namePrefix.isNotEmpty) {
      final name = device.name.isNotEmpty ? device.name : device.advName;
      if (name.toUpperCase().startsWith(namePrefix.toUpperCase())) {
        return ProfileMatchLevel.weak;
      }
    }
    return ProfileMatchLevel.none;
  }
}

/// Smart HID 档案（UUID/前缀来自 hid-provisioning-protocol.ts 正典镜像）
const smartHidProfile = ProvisioningProfile(
  id: 'smart-hid',
  displayName: 'Smart HID',
  serviceUuid: '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04',
  namePrefix: 'SHID-',
  actionLabel: '配置 Smart HID',
);

/// ESP32 演示档案（对齐 uniapp services/esp32-demo/profile.js：GATT 调试型，
/// 无配网向导路由——动作按钮直达通用 GATT 详情）
const esp32DemoProfile = ProvisioningProfile(
  id: 'esp32-demo',
  displayName: 'ESP32 演示',
  serviceUuid: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  namePrefix: 'BLEToolkit-Server',
  actionLabel: 'ESP32 调试',
  badge: 'ESP32',
);

/// 一次匹配结果
class ProfileMatch {
  final ProvisioningProfile profile;
  final ProfileMatchLevel level;

  const ProfileMatch(this.profile, this.level);

  /// 卡片 chip 文案（对齐原型 C1 devCard）
  String get chipLabel => level == ProfileMatchLevel.strong
      ? '${profile.badge} · 强匹配'
      : '疑似 ${profile.badge} · 弱匹配';
}

String _normalizeUuid(String value) {
  final v = value.trim().toLowerCase();
  // 4 位短码归一为完整 128 位（FFF0 → 0000fff0-…）
  if (v.length == 4 && _isHex(v)) {
    return '0000$v-0000-1000-8000-00805f9b34fb';
  }
  return v;
}

bool _isHex(String v) => v.codeUnits.every(
      (c) =>
          (c >= 0x30 && c <= 0x39) ||
          (c >= 0x61 && c <= 0x66) ||
          (c >= 0x41 && c <= 0x46),
    );

/// 内置第一方 Profile（后续设备家族按此扩展）
const _builtinProfiles = [smartHidProfile, esp32DemoProfile];

/// 按已注册 Profile 匹配扫描结果，返回最佳命中（无命中返回 null）
ProfileMatch? matchProfile(BleScanResult device) {
  ProfileMatch? best;
  for (final profile in _builtinProfiles) {
    final level = profile.matchAdvertisement(device);
    if (level == ProfileMatchLevel.none) continue;
    if (best == null || level.value > best.level.value) {
      best = ProfileMatch(profile, level);
    }
  }
  return best;
}
