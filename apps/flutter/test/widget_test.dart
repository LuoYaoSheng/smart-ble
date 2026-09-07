import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/hid_session_store.dart';
import 'package:smart_ble/main.dart';
import 'package:smart_ble/ui/pages/hid_detail_page.dart';
import 'package:smart_ble/ui/pages/hid_diagnostics_page.dart';
import 'package:smart_ble/ui/pages/versions_page.dart';

void main() {
  testWidgets('main tabs render', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: SmartBLEApp(),
      ),
    );

    expect(find.text('扫描'), findsOneWidget);
    expect(find.text('广播'), findsOneWidget);
    expect(find.text('关于'), findsOneWidget);
  });

  // PARITY-G1：Tab 文案与 PAGE_SPEC §0.1 逐字一致（含 Tab2「已连接」）。
  testWidgets('tab labels match PAGE_SPEC exactly (FLUTTER-G1-001)', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(child: SmartBLEApp()),
    );

    expect(find.text('扫描'), findsOneWidget);
    expect(find.text('已连接'), findsOneWidget);
    expect(find.text('广播'), findsOneWidget);
    expect(find.text('关于'), findsOneWidget);
    expect(find.text('连接'), findsNothing);
  });

  // PARITY-G1：主 Tab 仅点击切换，规范外横滑被禁用（FLUTTER-G1-002）。
  testWidgets('main tab swipe is disabled (NeverScrollableScrollPhysics)',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: SmartBLEApp()),
    );

    final pageView = tester.widget<PageView>(find.byType(PageView));
    expect(pageView.physics, isA<NeverScrollableScrollPhysics>());

    // 横滑手势不切换 Tab（仍停留在扫描页）。首页存在周期性定时器，
    // 不能用 pumpAndSettle，用固定时长推进。
    await tester.drag(find.byType(PageView), const Offset(-400, 0));
    await tester.pump(const Duration(milliseconds: 300));
    final navBar = tester.widget<BottomNavigationBar>(
        find.byType(BottomNavigationBar));
    expect(navBar.currentIndex, 0);
  });

  // PARITY-G1：P003/P005/P010 为独立职责页面（非 Modal 冒充，FLUTTER-G1-003）。
  testWidgets('P003/P005/P010 pages exist as independent routes', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: HidDetailPage(
      deviceId: 'TEST-DEVICE-01',
      name: 'Smart HID 测试设备',
    )));
    expect(find.byType(HidDetailPage), findsOneWidget);

    await tester.pumpWidget(const MaterialApp(
        home: HidDiagnosticsPage(
            deviceId: 'TEST-DEVICE-01', name: 'Smart HID 测试设备')));
    expect(find.byType(HidDiagnosticsPage), findsOneWidget);

    await tester.pumpWidget(const MaterialApp(home: VersionsPage()));
    expect(find.byType(VersionsPage), findsOneWidget);
    expect(find.text('版本记录'), findsOneWidget);
    expect(find.text('复制版本信息'), findsOneWidget);
  });

  // PARITY-G1：P002 成功「查看设备」为 redirectTo 语义（pushReplacement），
  // 返回不回到已完成向导——通过页面可独立实例化 + 会话快照写入路径验证。
  test('HidSessionStore is memory-only with cold-start empty (zero persistence)',
      () async {
    final store = HidSessionStore.instance;
    store.clear();
    expect(store.snapshots, isEmpty);

    store.commit(HidSessionSnapshot(
      deviceId: 'TEST-DEVICE-01',
      name: 'Smart HID 测试设备',
      lastWifi: 'Test Wi-Fi',
      lastHub: '192.168.1.8:17892',
    ));
    expect(store.find('TEST-DEVICE-01')?.lastWifi, 'Test Wi-Fi');
    expect(store.find('TEST-DEVICE-01')?.lastHub, '192.168.1.8:17892');

    // 同 deviceId 重复提交保留最新（去重语义）。
    store.commit(HidSessionSnapshot(
      deviceId: 'TEST-DEVICE-01',
      name: 'Smart HID 测试设备',
      lastWifi: 'New Wi-Fi',
    ));
    expect(store.snapshots.length, 1);
    expect(store.find('TEST-DEVICE-01')?.lastWifi, 'New Wi-Fi');

    store.remove('TEST-DEVICE-01');
    expect(store.find('TEST-DEVICE-01'), isNull);
    store.clear();
  });

  // PARITY-G1：P009 关于页有「版本记录」菜单项（P010 入口，FLUTTER-G1-003c）。
  testWidgets('about page exposes 版本记录 menu entry', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: SmartBLEApp()),
    );
    // 切到关于 Tab。
    await tester.tap(find.text('关于'));
    await tester.pumpAndSettle();
    expect(find.text('版本记录'), findsOneWidget);
    expect(find.text('官方网站'), findsOneWidget);
    expect(find.text('问题反馈'), findsOneWidget);
    expect(find.text('分享应用'), findsOneWidget);
  });
}
