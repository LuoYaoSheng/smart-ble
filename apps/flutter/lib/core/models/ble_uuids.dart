class BleUuids {
  // 通用服务 UUID
  static const String serviceGenericAccess =
      '00001800-0000-1000-8000-00805f9b34fb';
  static const String serviceGenericAttribute =
      '00001801-0000-1000-8000-00805f9b34fb';
  static const String serviceDeviceInformation =
      '0000180a-0000-1000-8000-00805f9b34fb';
  static const String serviceBattery = '0000180f-0000-1000-8000-00805f9b34fb';
  static const String serviceHumanInterfaceDevice =
      '00001812-0000-1000-8000-00805f9b34fb';
  static const String serviceHeartRate = '0000180d-0000-1000-8000-00805f9b34fb';
  static const String serviceHealthThermometer =
      '00001809-0000-1000-8000-00805f9b34fb';
  static const String serviceOta = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';

  // 通用特征值 UUID
  static const String characteristicDeviceName =
      '00002a00-0000-1000-8000-00805f9b34fb';
  static const String characteristicAppearance =
      '00002a01-0000-1000-8000-00805f9b34fb';
  static const String characteristicPeripheralPrivacyFlag =
      '00002a02-0000-1000-8000-00805f9b34fb';
  static const String characteristicReconnectionAddress =
      '00002a03-0000-1000-8000-00805f9b34fb';
  static const String characteristicPeripheralPreferredConnectionParameters =
      '00002a04-0000-1000-8000-00805f9b34fb';
  static const String characteristicServiceChanged =
      '00002a05-0000-1000-8000-00805f9b34fb';

  // 设备信息服务特征值
  static const String characteristicManufacturerName =
      '00002a29-0000-1000-8000-00805f9b34fb';
  static const String characteristicModelNumber =
      '00002a24-0000-1000-8000-00805f9b34fb';
  static const String characteristicSerialNumber =
      '00002a25-0000-1000-8000-00805f9b34fb';
  static const String characteristicHardwareRevision =
      '00002a27-0000-1000-8000-00805f9b34fb';
  static const String characteristicFirmwareRevision =
      '00002a26-0000-1000-8000-00805f9b34fb';
  static const String characteristicSoftwareRevision =
      '00002a28-0000-1000-8000-00805f9b34fb';
  static const String characteristicSystemId =
      '00002a23-0000-1000-8000-00805f9b34fb';

  // 电池服务特征值
  static const String characteristicBatteryLevel =
      '00002a19-0000-1000-8000-00805f9b34fb';

  // OTA 服务特征值
  static const String characteristicOtaControl =
      'beb5483e-36e1-4688-b7f5-ea07361b26c0';
  static const String characteristicOtaData =
      'beb5483e-36e1-4688-b7f5-ea07361b26c1';
  static const String characteristicOtaStatus =
      'beb5483e-36e1-4688-b7f5-ea07361b26c2';

  static final Map<String, String> _serviceNames = {
    '00001800': '通用访问',
    '00001801': '通用属性',
    '0000180a': '设备信息',
    '0000180f': '电池服务',
    '00001812': '人机界面(HID)',
    '0000180d': '心率服务',
    '00001809': '健康温度计',
    // 4fafc201 前缀为多服务共用（夹具 914b 控制 / 914c 权限 / 914d OTA），
    // 仅精确匹配 OTA 服务，避免前缀把非 OTA 服务误标（WIN-FAND-003）
    '4fafc2011fb5459e8fccc5c9c331914d': 'OTA 升级服务',
  };

  static final Map<String, String> _characteristicNames = {
    '2a00': '设备名称',
    '2a01': '外观',
    '2a02': '隐私标志',
    '2a03': '重连地址',
    '2a04': '连接参数',
    '2a05': '服务变更',
    '2a19': '电池电量',
    '2a23': '系统标识符',
    '2a24': '型号',
    '2a25': '序列号',
    '2a26': '固件版本',
    '2a27': '硬件版本',
    '2a28': '软件版本',
    '2a29': '制造商',
    'beb5': 'OTA 控制',
  };

  /// 获取标准服务名称（中文）
  ///
  /// flutter_blue_plus 1.36 的 Guid.toString() 对 16 位 UUID 返回短形式
  /// （如 "1800"），需归一为 "00001800" 再查表（WIN-FAND-003）；
  /// 32 位 UUID 先精确匹配再回退前 8 位。
  static String? getServiceName(String uuid) {
    final s = uuid.toLowerCase().replaceAll('-', '');
    if (s.length == 4) return _serviceNames['0000$s'];
    if (s.length < 8) return _serviceNames[s];
    return _serviceNames[s] ?? _serviceNames[s.substring(0, 8)];
  }

  /// 获取标准特征值名称（中文）
  ///
  /// 同上：16 位短形式（如 "2a00"）直接查表；32 位 UUID 先精确后取 4-8 位。
  static String? getCharacteristicName(String uuid) {
    final s = uuid.toLowerCase().replaceAll('-', '');
    if (s.length >= 8) {
      return _characteristicNames[s] ?? _characteristicNames[s.substring(4, 8)];
    }
    return _characteristicNames[s];
  }
}
