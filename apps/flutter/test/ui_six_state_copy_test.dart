// F-AND 六态正典文案断言（2026-09-11 UI 全面轮 · Mac 线）
//
// 与 uniapp H5 copycheck（scripts/ui/uniapp-h5-mock-copycheck.mjs）同口径：
// provider override 驱动页面状态，断言 PAGE_SPEC §11 六项检查的正典文案。
//
// 边界说明：
// - 视觉截图不在此文件——flutter test golden 无 CJK 字体资产（渲染豆腐块），
//   真渲染视觉证据走 F-MAC 真窗口通道（vis1-fmac 已有 12 张在册）。
// - P002/P005/P006 的深态依赖控制器 + BLE 会话，由既有 113 项测试与 F-MAC 通道覆盖，
//   本文件覆盖 provider 可达态：P001 五态 + P007/P008/P010 默认态。
// - 「扫描完成 · 发现 N 台」终态标签由 widget 本地 _hasScanned 驱动（扫描会话收尾置位），
//   无 provider 缝，不在本文件断言（uniapp 线已断言同文案）。

import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/ble/ble_manager.dart';
import 'package:smart_ble/core/models/ble_scan_result.dart';
import 'package:smart_ble/main.dart';
import 'package:smart_ble/ui/pages/device_list_page.dart';

/// 正典演示集（与 uniapp services/mock/mock-dataset.js 同源口径）
List<BleScanResult> canonScanDevices() {
  final now = DateTime.now();
  return [
    BleScanResult(
      deviceId: 'SHID-9F3E2A1C',
      name: 'SHID-9F3E2A1C',
      rssi: -52,
      serviceUuids: const ['9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04'],
      timestamp: now,
    ),
    BleScanResult(deviceId: 'D8:A6:3A:41:F2:09', name: 'Mi Smart Band 8', rssi: -66, timestamp: now),
    BleScanResult(deviceId: 'EF:6B:12:0C:AA:77', name: '', rssi: -78, timestamp: now),
    BleScanResult(deviceId: 'SHID-BENCH-02', name: 'SHID-BENCH-02', rssi: -59, timestamp: now),
    BleScanResult(
      deviceId: 'BLEToolkit-Server',
      name: 'BLEToolkit-Server',
      rssi: -47,
      serviceUuids: const ['4fafc201-1fb5-459e-8fcc-c5c9c331914b'],
      timestamp: now,
    ),
    BleScanResult(deviceId: 'C4:11:9E:02:3B:5F', name: '', rssi: -85, timestamp: now),
  ];
}

Future<ProviderContainer> pumpApp(
  WidgetTester tester, {
  BleState? bleState,
  List<BleScanResult>? results,
  bool? scanning,
  int? filterRssi,
  String? filterPrefix,
}) async {
  // 高视口（393×1800）：ListView.builder 懒构建，默认 800×600 会漏建第 4 张起的设备卡
  await tester.binding.setSurfaceSize(const Size(393, 1800));
  final container = ProviderContainer(
    overrides: [
      if (bleState != null)
        bleStateProvider.overrideWith((ref) => Stream.value(bleState)),
      if (results != null)
        scanResultsProvider.overrideWith((ref) => Stream.value(results)),
      if (scanning != null) scanningProvider.overrideWith((ref) => scanning),
      if (filterRssi != null) filterRssiProvider.overrideWith((ref) => filterRssi),
      if (filterPrefix != null) filterNamePrefixProvider.overrideWith((ref) => filterPrefix),
    ],
  );
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: const SmartBLEApp(),
    ),
  );
  await tester.pump(const Duration(milliseconds: 200));
  return container;
}

void main() {
  testWidgets('P001 idle：待开始 + 空态A 两行文案', (tester) async {
    await pumpApp(tester, bleState: BleState.on);
    expect(find.text('待开始扫描'), findsOneWidget);
    expect(find.text('还没有扫描结果'), findsOneWidget);
    expect(find.text('点上方按钮开始扫描附近 BLE 设备'), findsOneWidget);
    expect(find.text('蓝牙就绪'), findsOneWidget);
  });

  testWidgets('P001 complete：六设备卡片（强/弱匹配徽章 + 未命名兜底 + Profile 入口）', (tester) async {
    await pumpApp(tester, bleState: BleState.on, results: canonScanDevices());
    expect(find.text('SHID-9F3E2A1C'), findsWidgets);
    expect(find.text('Smart HID · 强匹配'), findsOneWidget);
    expect(find.text('疑似 Smart HID · 弱匹配'), findsOneWidget);
    expect(find.text('未命名 BLE · AA77'), findsOneWidget);
    expect(find.text('未命名 BLE · 3B5F'), findsOneWidget);
    expect(find.text('ESP32 · 强匹配'), findsOneWidget);
    expect(find.text('配置 Smart HID'), findsNWidgets(2)); // 强+弱匹配卡各一（uniapp 同口径）
    expect(find.text('Mi Smart Band 8'), findsOneWidget);
    expect(find.text('ESP32 调试'), findsOneWidget);
  });

  testWidgets('P001 scanning：5s 会话标签 + 停止按钮', (tester) async {
    final container = await pumpApp(tester, bleState: BleState.on);
    // initState 的 isScanningStream 订阅在初始化失败后会回写 false——settle 后经容器重置
    container.read(scanningProvider.notifier).state = true;
    await tester.pump(const Duration(milliseconds: 120));
    expect(find.text('扫描中 · 5s 会话'), findsOneWidget);
    expect(find.text('停止扫描'), findsOneWidget);
  });

  testWidgets('P001 bt-off：蓝牙未开启', (tester) async {
    await pumpApp(tester, bleState: BleState.off);
    expect(find.text('蓝牙未开启'), findsOneWidget);
  });

  testWidgets('P001 unavailable：平台不支持', (tester) async {
    await pumpApp(tester, bleState: BleState.unavailable);
    expect(find.text('平台不支持'), findsOneWidget);
  });

  // 空态B（当前没有匹配设备/调整筛选条件试试）受 widget 本地 _hasScanned 门控
  // （与 uniapp hasScanned 同口径），harness 无 seam 不可达——真机/F-MAC 真扫描路径
  // 已有 vis1-fmac「扫描完成」截图在册。此处断言同种子条件下的门控行为：回落空态A。
  testWidgets('P001 filter-empty(未扫描)：_hasScanned 门控回落空态A（与 uniapp 同口径）', (tester) async {
    await pumpApp(tester, bleState: BleState.on, results: canonScanDevices(), filterPrefix: 'ZZ');
    expect(find.text('还没有扫描结果'), findsOneWidget);
    expect(find.text('当前没有匹配设备'), findsNothing);
  });

  testWidgets('P007 default：已连接空态（常规文案 + 去扫描）', (tester) async {
    await pumpApp(tester, bleState: BleState.on);
    await tester.tap(find.text('已连接'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.textContaining('先在'), findsOneWidget);
    expect(find.textContaining('找到设备并连接'), findsOneWidget);
    expect(find.text('去扫描'), findsOneWidget);
  });

  testWidgets('P008 default：表单六字段 + 主按钮 + 检查支持', (tester) async {
    await pumpApp(tester, bleState: BleState.on);
    await tester.tap(find.text('广播'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('设备名称'), findsOneWidget);
    expect(find.text('服务 UUID'), findsOneWidget);
    expect(find.text('厂商 ID（HEX）'), findsOneWidget);
    expect(find.text('厂商数据（ASCII）'), findsOneWidget);
    expect(find.text('开始广播'), findsOneWidget);
    expect(find.text('检查支持'), findsOneWidget);
  });

  testWidgets('P009/P010：关于四菜单 + 版本页投影声明', (tester) async {
    await pumpApp(tester, bleState: BleState.on);
    await tester.tap(find.text('关于'));
    await tester.pumpAndSettle();
    expect(find.text('版本记录'), findsOneWidget);
    expect(find.text('官方网站'), findsOneWidget);
    expect(find.text('问题反馈'), findsOneWidget);
    expect(find.text('分享应用'), findsOneWidget);
    await tester.tap(find.text('版本记录'));
    await tester.pumpAndSettle();
    expect(find.textContaining('本页数据来自 Release Metadata 投影'), findsOneWidget);
  });
}
