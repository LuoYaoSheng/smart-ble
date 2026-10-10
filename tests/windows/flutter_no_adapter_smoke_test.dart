// Run only on a Windows QA copy with the real plugins and no Bluetooth adapter.
// flutter test integration_test/windows_no_adapter_smoke_test.dart -d windows
// No channel mocks, provider overrides, USE_MOCK_BLE or external UIA driver.
import 'dart:ffi' show Abi;
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:integration_test/integration_test.dart';
import 'package:smart_ble/main.dart' as app;
import 'package:smart_ble/core/ble/ble_manager.dart';
import 'package:smart_ble/core/ble/ble_peripheral_manager.dart';
import 'package:smart_ble/ui/design/app_badge.dart';
import 'package:smart_ble/ui/design/app_button.dart';
import 'package:smart_ble/ui/design/app_navbar.dart';
import 'package:smart_ble/ui/design/app_tab_bar.dart';

Future<void> waitFor(WidgetTester tester, bool Function() ready, String stage,
    {Duration timeout = const Duration(seconds: 20)}) async {
  final deadline = DateTime.now().add(timeout);
  while (!ready()) {
    if (DateTime.now().isAfter(deadline)) {
      fail('Windows smoke timed out: $stage');
    }
    await tester.pump(const Duration(milliseconds: 100));
    expect(tester.takeException(), isNull,
        reason: 'Unexpected Flutter error while waiting for $stage');
  }
  expect(tester.takeException(), isNull);
}

Finder navbar(String title) => find.byWidgetPredicate(
    (widget) => widget is AppNavbar && widget.title == title);

Finder navbarText(String title, String text) =>
    find.descendant(of: navbar(title), matching: find.text(text));

Future<void> waitForScanTerminal(WidgetTester tester, String stage) async {
  // A replayed adapter state can render before this page's initialize() future
  // completes. Require its failure banner as well as the adapter status.
  await waitFor(
      tester,
      () => navbarText('扫描', '蓝牙不可用').evaluate().length == 1 &&
          find.text('BLE_001').evaluate().length == 1 &&
          find.text('初始化中…').evaluate().isEmpty,
      stage);
  debugPrint('[WINDOWS-NO-ADAPTER] $stage banner=BLE_001 terminal=PASS');
}

Future<void> selectTab(WidgetTester tester, String label, String key) async {
  final tab =
      find.descendant(of: find.byType(AppTabBar), matching: find.text(label));
  expect(tab, findsOneWidget);
  await tester.tap(tab);
  await waitFor(tester, () {
    final tabs = tester.widget<AppTabBar>(find.byType(AppTabBar));
    return tabs.activeKey == key &&
        navbarText(label, label).hitTestable().evaluate().isNotEmpty;
  }, 'tab $key visible');
  debugPrint('[WINDOWS-NO-ADAPTER] tab=$key visible=PASS');
}

void assertScanDisabled(WidgetTester tester) {
  final entries = find.byWidgetPredicate(
      (widget) => widget is AppButton && widget.label == '开始扫描');
  expect(entries, findsNWidgets(2),
      reason: 'Both scan entry points must exist');
  for (final element in entries.evaluate()) {
    final button = element.widget as AppButton;
    expect(button.disabled, isTrue,
        reason: 'No adapter: both scan CTAs disabled');
    final ink = tester.widget<InkWell>(find.descendant(
        of: find.byWidget(button), matching: find.byType(InkWell)));
    expect(ink.onTap, isNull,
        reason: 'Disabled CTA must have no gesture callback');
  }
  expect(navbarText('扫描', '蓝牙不可用'), findsOneWidget);
  expect(find.text('初始化中…'), findsNothing);
  expect(find.text('BLE_001'), findsOneWidget);
  expect(BleManager().isScanning, isFalse);
  debugPrint('[WINDOWS-NO-ADAPTER] scan two-CTA gate=PASS');
}

Finder broadcastStart() => find.ancestor(
    of: find.text('开始广播'),
    matching: find.byWidgetPredicate((widget) => widget is ElevatedButton));

void assertBroadcastDisabled(WidgetTester tester) {
  expect(broadcastStart(), findsOneWidget);
  expect(tester.widget<ElevatedButton>(broadcastStart()).onPressed, isNull);
  expect(
      find.byWidgetPredicate(
          (widget) => widget is AppBadge && widget.text == '蓝牙不可用'),
      findsOneWidget);
  expect(find.text('已就绪'), findsNothing);
  expect(find.text('广播中'), findsNothing);
  debugPrint('[WINDOWS-NO-ADAPTER] broadcast adapter gate=PASS');
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('Windows real WinRT no-adapter initialization, tabs and retry',
      (tester) async {
    expect(Platform.isWindows, isTrue,
        reason: 'This smoke must run on the Windows desktop engine');
    expect(BleManager.useMockBLE, isFalse,
        reason: 'USE_MOCK_BLE cannot provide native software evidence');
    debugPrint('[WINDOWS-NO-ADAPTER] engineAbi=${Abi.current()} '
        'os=${Platform.operatingSystemVersion} uia=NOT_RUN radioHardware=NOT_RUN');

    await app.main().timeout(const Duration(seconds: 20));
    try {
      await waitForScanTerminal(
          tester, 'real native initialization terminal state');
      expect(
          await FlutterBluePlus.isSupported
              .timeout(const Duration(seconds: 15)),
          isFalse,
          reason: 'Real WinRT must report no BLE adapter');
      expect(await BleManager().getState().timeout(const Duration(seconds: 15)),
          BleState.unavailable);
      assertScanDisabled(tester);

      // Exercise the actual retry button twice, retaining the native failure
      // state without starting a scan or restoring either disabled CTA.
      final retry = find.ancestor(
          of: find.text('重试'),
          matching:
              find.byWidgetPredicate((widget) => widget is OutlinedButton));
      expect(retry, findsOneWidget);
      expect(tester.widget<OutlinedButton>(retry).onPressed, isNotNull);
      await tester.ensureVisible(retry);
      expect(retry.hitTestable(), findsOneWidget);
      for (var attempt = 0; attempt < 2; attempt++) {
        await tester.tap(retry);
        await tester.pump();
        // Await the in-flight or next real native probe; old UI text alone
        // cannot stand in for a completed native availability check.
        expect(
            await BleManager()
                .initialize()
                .timeout(const Duration(seconds: 15)),
            isFalse);
        await tester.pump();
        assertScanDisabled(tester);
      }
      debugPrint('[WINDOWS-NO-ADAPTER] scan native retry twice=PASS');

      await selectTab(tester, '已连接', 'connected');
      expect(find.text('还没有连接中的设备'), findsOneWidget);
      expect(BleManager().connectedDeviceIds, isEmpty);

      await selectTab(tester, '广播', 'cast');
      await waitFor(
          tester,
          () => find
              .byWidgetPredicate(
                  (widget) => widget is AppBadge && widget.text == '蓝牙不可用')
              .evaluate()
              .isNotEmpty,
          'broadcast native support result');
      expect(
          await BlePeripheralManager()
              .isPlatformSupported()
              .timeout(const Duration(seconds: 15)),
          isFalse);
      expect(
          await BlePeripheralManager()
              .isAdvertising
              .timeout(const Duration(seconds: 15)),
          isFalse);

      // Use valid, small advertising input: disablement must come from the
      // adapter gate, not a malformed UUID or the 31-byte budget.
      final name = find.byWidgetPredicate((widget) =>
          widget is TextField && widget.decoration?.hintText == '自定义名称');
      await tester.ensureVisible(name);
      await tester.enterText(name, '');
      await tester.pump();
      expect(find.text('11 / 31 B'), findsOneWidget);
      assertBroadcastDisabled(tester);

      final check = find.ancestor(
          of: find.text('检查支持'),
          matching:
              find.byWidgetPredicate((widget) => widget is OutlinedButton));
      expect(tester.widget<OutlinedButton>(check).onPressed, isNotNull);
      await tester.ensureVisible(check);
      expect(check.hitTestable(), findsOneWidget);
      await tester.tap(check);
      await tester.pump();
      // Confirm the real support query completes and inspect the rendered gate.
      expect(
          await BlePeripheralManager()
              .isPlatformSupported()
              .timeout(const Duration(seconds: 15)),
          isFalse);
      await tester.pump();
      assertBroadcastDisabled(tester);
      expect(
          await BlePeripheralManager()
              .isAdvertising
              .timeout(const Duration(seconds: 15)),
          isFalse);
      debugPrint('[WINDOWS-NO-ADAPTER] broadcast support retry=PASS');

      await selectTab(tester, '关于', 'info');
      expect(find.text('BLE Toolkit+'), findsOneWidget);
      expect(find.text('应用信息'), findsOneWidget);
      await selectTab(tester, '扫描', 'scan');
      await waitForScanTerminal(
          tester, 'scan terminal state after tab navigation');
      assertScanDisabled(tester);
      expect(tester.takeException(), isNull);
      debugPrint('[WINDOWS-NO-ADAPTER] SOFTWARE_SMOKE=PASS '
          'uia=NOT_RUN radioHardware=NOT_RUN');
    } finally {
      // Release the production window's SemanticsHandle and BLE subscriptions.
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    }
  }, timeout: const Timeout(Duration(minutes: 3)));
}
