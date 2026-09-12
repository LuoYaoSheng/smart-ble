import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/ble_manager.dart';
import 'package:smart_ble/core/ble/hid_session_store.dart';
import 'package:smart_ble/core/design/app_icons.dart';
import 'package:smart_ble/core/design/app_illustrations.dart';
import 'package:smart_ble/main.dart';
import 'package:smart_ble/ui/pages/device_list_page.dart';
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

    // PARITY-P001：自绘导航栏标题新增「扫描」，与 Tab 文案同名共 2 处。
    expect(find.text('扫描'), findsNWidgets(2));
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

    expect(find.text('扫描'), findsNWidgets(2));
    expect(find.text('已连接'), findsOneWidget);
    expect(find.text('广播'), findsOneWidget);
    expect(find.text('关于'), findsOneWidget);
    expect(find.text('连接'), findsNothing);
  });

  // PARITY-P001：蓝牙状态词映射正典三态词表 + 桌面壳瞬态（p001 btWord + 初始化中…）。
  test('P001 bt status word maps canon vocabulary + desktop transient', () {
    expect(DeviceListPage.btStatusWord(BleState.on), '蓝牙就绪');
    expect(DeviceListPage.btStatusWord(BleState.off), '蓝牙未开启');
    expect(DeviceListPage.btStatusWord(BleState.unauthorized), '蓝牙未开启');
    expect(DeviceListPage.btStatusWord(BleState.unavailable), '平台不支持');
    // 瞬态（null/unknown/turning*）：初始化中…，不得闪「平台不支持」
    expect(DeviceListPage.btStatusWord(BleState.unknown), '初始化中…');
    expect(DeviceListPage.btStatusWord(BleState.turningOn), '初始化中…');
    expect(DeviceListPage.btStatusWord(BleState.turningOff), '初始化中…');
    expect(DeviceListPage.btStatusWord(null), '初始化中…');
  });

  // PARITY-P001：扫描页结构对齐原型 p001（navbar kicker/标题 + scantool +
  // sec-t 附近设备/筛选 + filter 正典四档行）。
  testWidgets('P001 scan page structure follows prototype canon', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: SmartBLEApp()));
    await tester.pump(const Duration(milliseconds: 100));

    // 自绘导航栏：kicker + 标题「扫描」（与 Tab 文案同名，共 2 处）
    expect(find.text('BLE TOOLKIT+'), findsOneWidget);
    expect(find.text('扫描'), findsNWidgets(2));
    // 蓝牙状态 chip 一定是正典词之一（测试环境初始化失败落 unavailable→平台不支持；
    // 瞬态期短暂显示「初始化中…」）
    expect(
      ['蓝牙就绪', '蓝牙未开启', '平台不支持', '初始化中…']
          .map((w) => find.text(w).evaluate().isNotEmpty)
          .any((hit) => hit),
      isTrue,
    );
    // scantool：待开始扫描 + 开始扫描（工具条 + 空态软按钮各一）
    expect(find.text('待开始扫描'), findsOneWidget);
    expect(find.text('开始扫描'), findsNWidgets(2));
    // sec-t：附近设备 + 筛选 txtlink
    expect(find.text('附近设备'), findsOneWidget);
    expect(find.text('筛选'), findsOneWidget);

    // 展开筛选：正典四档 + 行标签（展开动画用固定时长推进）
    final filterLink = find.widgetWithText(TextButton, '筛选');
    await tester.ensureVisible(filterLink);
    await tester.tap(filterLink);
    await tester.pump(const Duration(milliseconds: 350));
    expect(find.text('最弱信号'), findsOneWidget);
    expect(find.text('强 [-40]'), findsOneWidget);
    expect(find.text('较好 [-60]'), findsOneWidget);
    expect(find.text('一般 [-70]'), findsOneWidget);
    expect(find.text('弱 [-85]'), findsOneWidget);
    expect(find.text('名称前缀'), findsOneWidget);
    expect(find.text('隐藏无名'), findsOneWidget);
    expect(find.text('重置过滤'), findsOneWidget);
    // 再次收起：txtlink 文案翻转
    final collapseLink = find.widgetWithText(TextButton, '收起筛选');
    await tester.ensureVisible(collapseLink);
    await tester.tap(collapseLink);
    await tester.pump(const Duration(milliseconds: 350));
    expect(find.text('强 [-40]'), findsNothing);
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
  // PARITY-ICON：tabBar 四枚图标必须是正典字形（scan/link/cast/info），
  // 禁止回退 Material 图标（TOKEN.md §7 图标正典）。
  testWidgets('tab icons are canon AppIcon glyphs (PARITY-ICON)', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: SmartBLEApp()));
    await tester.pump();
    final names = tester
        .widgetList<AppIcon>(find.byType(AppIcon))
        .map((w) => w.name)
        .toSet();
    expect(names.containsAll(['scan', 'link', 'cast', 'info']), isTrue);
  });

  // PARITY-ICON：35 枚正典字形全部可解析渲染（flutter_svg 真实解析，坏字形在此抛异常）。
  testWidgets('canon icon set renders all glyphs without error', (tester) async {
    for (final name in kAppIconNames) {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: Center(child: AppIcon(name, size: 24))),
      ));
      expect(tester.takeException(), isNull, reason: name);
    }
  });

  // PARITY-ILL：4 幅正典空态插图（radar/link/doc/box，透明底）全部可解析渲染。
  testWidgets('canon empty-state illustrations render without error', (tester) async {
    expect(kAppIllNames, ['radar', 'link', 'doc', 'box']);
    for (final name in kAppIllNames) {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(body: Center(child: AppIll(name))),
      ));
      expect(tester.takeException(), isNull, reason: name);
    }
  });
}
