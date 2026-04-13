import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('zh')
  ];

  /// No description provided for @app_name.
  ///
  /// In en, this message translates to:
  /// **'BLE Toolkit+'**
  String get app_name;

  /// No description provided for @tab_scan.
  ///
  /// In en, this message translates to:
  /// **'Scan'**
  String get tab_scan;

  /// No description provided for @tab_connected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get tab_connected;

  /// No description provided for @tab_broadcast.
  ///
  /// In en, this message translates to:
  /// **'Broadcast'**
  String get tab_broadcast;

  /// No description provided for @tab_about.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get tab_about;

  /// No description provided for @btn_start_scan.
  ///
  /// In en, this message translates to:
  /// **'Start Scan'**
  String get btn_start_scan;

  /// No description provided for @btn_stop_scan.
  ///
  /// In en, this message translates to:
  /// **'Stop Scan'**
  String get btn_stop_scan;

  /// No description provided for @btn_connect.
  ///
  /// In en, this message translates to:
  /// **'Connect'**
  String get btn_connect;

  /// No description provided for @btn_disconnect.
  ///
  /// In en, this message translates to:
  /// **'Disconnect'**
  String get btn_disconnect;

  /// No description provided for @btn_detail.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get btn_detail;

  /// No description provided for @device_unknown.
  ///
  /// In en, this message translates to:
  /// **'Unknown Device'**
  String get device_unknown;

  /// No description provided for @status_connected.
  ///
  /// In en, this message translates to:
  /// **'Connected'**
  String get status_connected;

  /// No description provided for @status_disconnected.
  ///
  /// In en, this message translates to:
  /// **'Disconnected'**
  String get status_disconnected;

  /// No description provided for @status_connecting.
  ///
  /// In en, this message translates to:
  /// **'Connecting'**
  String get status_connecting;

  /// No description provided for @status_init.
  ///
  /// In en, this message translates to:
  /// **'Initializing...'**
  String get status_init;

  /// No description provided for @status_bt_on.
  ///
  /// In en, this message translates to:
  /// **'Bluetooth ON'**
  String get status_bt_on;

  /// No description provided for @status_bt_off.
  ///
  /// In en, this message translates to:
  /// **'Bluetooth OFF'**
  String get status_bt_off;

  /// No description provided for @status_unauthorized.
  ///
  /// In en, this message translates to:
  /// **'Unauthorized'**
  String get status_unauthorized;

  /// No description provided for @empty_device_list.
  ///
  /// In en, this message translates to:
  /// **'No Devices Found'**
  String get empty_device_list;

  /// No description provided for @empty_device_hint.
  ///
  /// In en, this message translates to:
  /// **'Click the button above to start scanning'**
  String get empty_device_hint;

  /// No description provided for @empty_filtered_device.
  ///
  /// In en, this message translates to:
  /// **'No matching devices'**
  String get empty_filtered_device;

  /// No description provided for @empty_filtered_hint.
  ///
  /// In en, this message translates to:
  /// **'Try adjusting your filters'**
  String get empty_filtered_hint;

  /// No description provided for @empty_connected_list.
  ///
  /// In en, this message translates to:
  /// **'No connected devices'**
  String get empty_connected_list;

  /// No description provided for @empty_connected_hint.
  ///
  /// In en, this message translates to:
  /// **'Click a device on the scan page to connect'**
  String get empty_connected_hint;

  /// No description provided for @connection_success.
  ///
  /// In en, this message translates to:
  /// **'Successfully connected to {device_name}'**
  String connection_success(String device_name);

  /// No description provided for @broadcast_limitation.
  ///
  /// In en, this message translates to:
  /// **'OS restricts low-level BLE peripheral broadcasting'**
  String get broadcast_limitation;

  /// No description provided for @filter_rssi.
  ///
  /// In en, this message translates to:
  /// **'RSSI Filter'**
  String get filter_rssi;

  /// No description provided for @filter_unnamed.
  ///
  /// In en, this message translates to:
  /// **'Hide Unnamed'**
  String get filter_unnamed;

  /// No description provided for @btn_write.
  ///
  /// In en, this message translates to:
  /// **'Write Data'**
  String get btn_write;

  /// No description provided for @btn_ota.
  ///
  /// In en, this message translates to:
  /// **'OTA Update'**
  String get btn_ota;

  /// No description provided for @log_title.
  ///
  /// In en, this message translates to:
  /// **'Device Logs'**
  String get log_title;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'zh'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
