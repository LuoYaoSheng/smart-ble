# Project-maintained Windows backend

Vendored from flutter_blue_plus_winrt 0.0.20 (https://github.com/chan150/flutter_blue_plus_winrt), with the upstream MIT license retained.

Local changes are limited to adapter availability: `isSupported` queries the actual default BLE adapter; `getAdapterState` distinguishes absent hardware, inaccessible radio, off/disabled radio and on radio. An explicit query also publishes the current state to refresh FlutterBluePlus's cache. The previous backend always reported support and returned `unknown` forever with no Bluetooth radio.

Radio hot-plug/physical Bluetooth, GATT and advertising still require Windows hardware validation. This patch does not claim continuous hardware change notifications; initialization and user-requested retries query current native state.
