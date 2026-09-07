/// Smart HID 会话快照（纯内存，零持久化）。
///
/// 对应 uniapp 侧 hid store 的 currentDevice/knownDevices 内存语义
/// （2026-09-02 决策：F023 设备历史与 PAGE004 移除，应用零本地持久化）：
/// P002 配网成功后写入（含 lastWifi/lastHub 表单快照），P003/P005 读取；
/// 应用冷启动即为空，绝不落盘。
class HidSessionSnapshot {
  HidSessionSnapshot({
    required this.deviceId,
    required this.name,
    this.firmware = '',
    this.protocol = '',
    this.lastWifi = '',
    this.lastHub = '',
    DateTime? configuredAt,
  }) : configuredAt = configuredAt ?? DateTime.now();

  final String deviceId;
  final String name;
  final String firmware;
  final String protocol;
  final String lastWifi;
  final String lastHub;
  final DateTime configuredAt;
}

/// 进程级单例；无任何本地存储后端。
class HidSessionStore {
  HidSessionStore._();

  static final HidSessionStore instance = HidSessionStore._();

  final List<HidSessionSnapshot> _snapshots = [];

  List<HidSessionSnapshot> get snapshots => List.unmodifiable(_snapshots);

  HidSessionSnapshot? find(String deviceId) {
    for (final s in _snapshots) {
      if (s.deviceId == deviceId) return s;
    }
    return null;
  }

  /// 写入/覆盖同 deviceId 快照（保留最新）。
  void commit(HidSessionSnapshot snapshot) {
    _snapshots.removeWhere((s) => s.deviceId == snapshot.deviceId);
    _snapshots.insert(0, snapshot);
  }

  void remove(String deviceId) =>
      _snapshots.removeWhere((s) => s.deviceId == deviceId);

  void clear() => _snapshots.clear();
}
