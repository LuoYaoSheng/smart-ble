// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get app_name => 'BLE Toolkit+';

  @override
  String get tab_scan => 'Scan';

  @override
  String get tab_connected => 'Connected';

  @override
  String get tab_broadcast => 'Broadcast';

  @override
  String get tab_about => 'About';

  @override
  String get btn_start_scan => 'Start Scan';

  @override
  String get btn_stop_scan => 'Stop Scan';

  @override
  String get btn_connect => 'Connect';

  @override
  String get btn_disconnect => 'Disconnect';

  @override
  String get btn_detail => 'Details';

  @override
  String get device_unknown => 'Unknown Device';

  @override
  String get status_connected => 'Connected';

  @override
  String get status_disconnected => 'Disconnected';

  @override
  String get status_connecting => 'Connecting';

  @override
  String get status_init => 'Initializing...';

  @override
  String get status_bt_on => 'Bluetooth ON';

  @override
  String get status_bt_off => 'Bluetooth OFF';

  @override
  String get status_unauthorized => 'Unauthorized';

  @override
  String get empty_device_list => 'No Devices Found';

  @override
  String get empty_device_hint => 'Click the button above to start scanning';

  @override
  String get empty_filtered_device => 'No matching devices';

  @override
  String get empty_filtered_hint => 'Try adjusting your filters';

  @override
  String get empty_connected_list => 'No connected devices';

  @override
  String get empty_connected_hint =>
      'Click a device on the scan page to connect';

  @override
  String connection_success(String device_name) {
    return 'Successfully connected to $device_name';
  }

  @override
  String get broadcast_limitation =>
      'OS restricts low-level BLE peripheral broadcasting';

  @override
  String get filter_rssi => 'RSSI Filter';

  @override
  String get filter_unnamed => 'Hide Unnamed';

  @override
  String get btn_write => 'Write Data';

  @override
  String get btn_ota => 'OTA Update';

  @override
  String get log_title => 'Device Logs';
}
