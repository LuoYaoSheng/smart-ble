/// BLE 服务模型
class BleService {
  /// 服务 UUID
  final String uuid;

  /// 是否为主服务
  final bool isPrimary;

  /// 服务名称（标准服务会显示名称）
  final String? name;

  /// 特征值列表
  final List<BleCharacteristic> characteristics;

  /// 是否展开（UI 状态）
  bool expanded;

  BleService({
    required this.uuid,
    this.isPrimary = false,
    this.name,
    this.characteristics = const [],
    this.expanded = false,
  });

  /// 显示名称
  String get displayName => name ?? '未知服务';

  /// 短 UUID（去掉连字符并取前 8 位）
  String get shortUuid {
    final clean = uuid.replaceAll('-', '').toUpperCase();
    if (clean.length == 32) {
      // 标准 128 位 UUID
      if (clean.startsWith('0000')) {
        return clean.substring(4, 8);
      }
      return clean.substring(0, 8);
    }
    return clean;
  }

  /// 复制并修改部分属性
  BleService copyWith({
    String? uuid,
    bool? isPrimary,
    String? name,
    List<BleCharacteristic>? characteristics,
    bool? expanded,
  }) {
    return BleService(
      uuid: uuid ?? this.uuid,
      isPrimary: isPrimary ?? this.isPrimary,
      name: name ?? this.name,
      characteristics: characteristics ?? this.characteristics,
      expanded: expanded ?? this.expanded,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BleService && runtimeType == other.runtimeType && uuid == other.uuid;

  @override
  int get hashCode => uuid.hashCode;

  @override
  String toString() {
    return 'BleService(uuid: $uuid, isPrimary: $isPrimary, characteristics: ${characteristics.length})';
  }
}

/// BLE 特征值属性
enum BleCharacteristicProperty {
  /// 可读
  read,
  /// 可写（有响应）
  write,
  /// 可写（无响应）
  writeNoResponse,
  /// 可通知
  notify,
  /// 可指示
  indicate,
}

/// BLE 特征值模型
class BleCharacteristic {
  /// 特征值 UUID
  final String uuid;

  /// 所属服务 UUID
  final String serviceUuid;

  /// 属性列表
  final List<BleCharacteristicProperty> properties;

  /// 当前值
  final List<int>? value;

  /// 是否正在监听通知
  bool isNotifying;

  /// 特征值名称（标准特征值会显示名称）
  final String? name;

  BleCharacteristic({
    required this.uuid,
    required this.serviceUuid,
    this.properties = const [],
    this.value,
    this.isNotifying = false,
    this.name,
  });

  /// 显示名称
  String get displayName => name ?? '未知特征值';

  /// 短 UUID
  String get shortUuid {
    final clean = uuid.replaceAll('-', '').toUpperCase();
    if (clean.length == 32) {
      if (clean.startsWith('0000')) {
        return clean.substring(4, 8);
      }
      return clean.substring(0, 8);
    }
    return clean;
  }

  /// 是否可读
  bool get canRead => properties.contains(BleCharacteristicProperty.read);

  /// 是否可写
  bool get canWrite =>
      properties.contains(BleCharacteristicProperty.write) ||
      properties.contains(BleCharacteristicProperty.writeNoResponse);

  /// 是否可通知
  bool get canNotify =>
      properties.contains(BleCharacteristicProperty.notify) ||
      properties.contains(BleCharacteristicProperty.indicate);

  /// 复制并修改部分属性
  BleCharacteristic copyWith({
    String? uuid,
    String? serviceUuid,
    List<BleCharacteristicProperty>? properties,
    List<int>? value,
    bool? isNotifying,
    String? name,
  }) {
    return BleCharacteristic(
      uuid: uuid ?? this.uuid,
      serviceUuid: serviceUuid ?? this.serviceUuid,
      properties: properties ?? this.properties,
      value: value ?? this.value,
      isNotifying: isNotifying ?? this.isNotifying,
      name: name ?? this.name,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is BleCharacteristic &&
          runtimeType == other.runtimeType &&
          uuid == other.uuid &&
          serviceUuid == other.serviceUuid;

  @override
  int get hashCode => uuid.hashCode ^ serviceUuid.hashCode;

  @override
  String toString() {
    return 'BleCharacteristic(uuid: $uuid, properties: ${properties.length}, isNotifying: $isNotifying)';
  }
}
