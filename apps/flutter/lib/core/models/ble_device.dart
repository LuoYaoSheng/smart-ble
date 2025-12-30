/// BLE 设备状态
enum BleDeviceState {
  /// 未连接
  disconnected,
  /// 连接中
  connecting,
  /// 已连接
  connected,
  /// 断开中
  disconnecting,
}

/// BLE 设备模型
class BleDevice {
  /// 设备 ID（MAC 地址或平台特定标识）
  final String id;

  /// 设备名称
  final String name;

  /// 信号强度 (dBm)
  final int rssi;

  /// 广播数据
  final List<int>? advertisData;

  /// 服务 UUID 列表
  final List<String> serviceUuids;

  /// 连接状态
  final BleDeviceState state;

  /// 最后发现时间
  final DateTime lastSeen;

  /// 是否连接
  bool get isConnected => state == BleDeviceState.connected;

  /// 是否正在连接
  bool get isConnecting => state == BleDeviceState.connecting;

  /// 显示名称（优先使用 name，否则显示设备 ID）
  String get displayName => name.isNotEmpty ? name : '未知设备 ($id)';

  const BleDevice({
    required this.id,
    required this.name,
    required this.rssi,
    this.advertisData,
    this.serviceUuids = const [],
    this.state = BleDeviceState.disconnected,
    required this.lastSeen,
  });

  /// 复制并修改部分属性
  BleDevice copyWith({
    String? id,
    String? name,
    int? rssi,
    List<int>? advertisData,
    List<String>? serviceUuids,
    BleDeviceState? state,
    DateTime? lastSeen,
  }) {
    return BleDevice(
      id: id ?? this.id,
      name: name ?? this.name,
      rssi: rssi ?? this.rssi,
      advertisData: advertisData ?? this.advertisData,
      serviceUuids: serviceUuids ?? this.serviceUuids,
      state: state ?? this.state,
      lastSeen: lastSeen ?? this.lastSeen,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BleDevice && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'BleDevice(id: $id, name: $name, rssi: $rssi, state: $state)';
  }
}
