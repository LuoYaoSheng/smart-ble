// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get app_name => 'BLE Toolkit+';

  @override
  String get tab_scan => '扫描设备';

  @override
  String get tab_connected => '已连接';

  @override
  String get tab_broadcast => '创建广播';

  @override
  String get tab_about => '关于';

  @override
  String get btn_start_scan => '开始扫描';

  @override
  String get btn_stop_scan => '停止扫描';

  @override
  String get btn_connect => '连接设备';

  @override
  String get btn_disconnect => '断开连接';

  @override
  String get btn_detail => '详情';

  @override
  String get device_unknown => '未知设备';

  @override
  String get status_connected => '已连接';

  @override
  String get status_disconnected => '已断开';

  @override
  String get status_connecting => '连接中';

  @override
  String get status_init => '初始化中...';

  @override
  String get status_bt_on => '蓝牙已开启';

  @override
  String get status_bt_off => '蓝牙已关闭';

  @override
  String get status_unauthorized => '未授权';

  @override
  String get empty_device_list => '暂无设备';

  @override
  String get empty_device_hint => '点击上方按钮开始扫描';

  @override
  String get empty_filtered_device => '没有符合过滤条件的设备';

  @override
  String get empty_filtered_hint => '尝试调整过滤条件';

  @override
  String get empty_connected_list => '暂无已连接设备';

  @override
  String get empty_connected_hint => '在扫描页面点击设备进行连接';

  @override
  String connection_success(String device_name) {
    return '成功连接设备 $device_name';
  }

  @override
  String get broadcast_limitation => '底层严格限制 BLE 外设广播';

  @override
  String get filter_rssi => '信号强度过滤';

  @override
  String get filter_unnamed => '隐藏未知设备';

  @override
  String get btn_write => '写入数据';

  @override
  String get btn_ota => 'OTA 更新';

  @override
  String get log_title => '设备日志';
}
