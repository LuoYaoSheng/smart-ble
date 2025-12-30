/// BLE 扫描结果
class BleScanResult {
  /// 设备 ID
  final String deviceId;

  /// 设备名称
  final String name;

  /// 信号强度
  final int rssi;

  /// 广播数据
  final List<int>? advertisData;

  /// 服务 UUID
  final List<String> serviceUuids;

  /// 发现时间
  final DateTime timestamp;

  const BleScanResult({
    required this.deviceId,
    required this.name,
    required this.rssi,
    this.advertisData,
    this.serviceUuids = const [],
    required this.timestamp,
  });

  /// 显示名称
  String get displayName => name.isNotEmpty ? name : '未知设备';

  /// 是否匹配前缀过滤
  bool matchesNamePrefix(String? prefix) {
    if (prefix == null || prefix.isEmpty) return true;
    return name.toLowerCase().startsWith(prefix.toLowerCase());
  }

  /// 是否匹配信号强度过滤
  bool matchesRssiThreshold(int threshold) {
    return rssi >= threshold;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BleScanResult &&
          runtimeType == other.runtimeType &&
          deviceId == other.deviceId;

  @override
  int get hashCode => deviceId.hashCode;

  @override
  String toString() {
    return 'BleScanResult(deviceId: $deviceId, name: $name, rssi: $rssi)';
  }
}
