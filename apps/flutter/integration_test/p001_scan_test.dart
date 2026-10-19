// Windows Mobile V1 · F001–F005 扫描域真机集成驱动（F-AND）
//
// 夹具：fixture_peripheral_s3（广播名 BLEToolkit-Server，scan response 含
// Manufacturer Data 0x00E0+"LightBLE"；主服务 4fafc201-…-914b）。
// 覆盖：F001 5s 会话/自动停/手动停/首轮空态、F003 筛选面板/前缀/空态/重置、
// F004 广播详情 sheet 字段、F005 具名设备显示名、F018 普通设备「连接」入口。
// 权限由 PC 侧包装器预授（E5 权限弹窗交互另列）。
//
// 运行：
//   flutter test -d <deviceId> integration_test/p001_scan_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:smart_ble/main.dart' as app;

const _fixtureName = 'BLEToolkit-Server';

void _log(String message) {
  final ts = DateTime.now().toString().substring(11, 23);
  debugPrint('P001[E2E $ts]: $message');
}

Future<bool> _pumpUntil(
  WidgetTester tester,
  Finder finder, {
  Duration timeout = const Duration(seconds: 10),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 400));
    if (tester.any(finder)) return true;
  }
  return tester.any(finder);
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  // BLE 扫描回调需要实时帧
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets(
    'F001-F005 scan domain (fixture BLEToolkit-Server)',
    (tester) async {
      _log('启动');
      app.main();
      await tester.pump(const Duration(seconds: 1));

      // F001 首启空态（未扫描）
      expect(tester.any(find.text('还没有扫描结果')), isTrue, reason: 'F001 首启空态缺失');
      _log('F001 首启空态 ✓');

      // ---- 第一轮：5s 会话自动停止 ----
      expect(tester.any(find.text('开始扫描')), isTrue);
      await tester.tap(find.text('开始扫描'));
      expect(
          await _pumpUntil(tester, find.text('扫描中 · 5s 会话'),
              timeout: const Duration(seconds: 3)),
          isTrue,
          reason: 'F001 扫描中状态未出现');
      _log('F001 扫描中状态 ✓');

      final found = await _pumpUntil(tester, find.text(_fixtureName),
          timeout: const Duration(seconds: 15));
      _log('夹具卡片发现=$found');
      expect(found, isTrue, reason: 'F001/F005 15s 内未见夹具卡片（设备未广播？）');

      expect(
          await _pumpUntil(tester, find.textContaining('扫描完成 · 发现'),
              timeout: const Duration(seconds: 8)),
          isTrue,
          reason: 'F001 5s 自动停止未回落到完成态');
      _log('F001 5s 自动停止 ✓');

      // F005 具名路径：卡片显示广播名 + RSSI
      expect(tester.any(find.text(_fixtureName)), isTrue,
          reason: 'F005 具名设备显示名');
      expect(tester.any(find.textContaining(' dBm')), isTrue,
          reason: 'F005 卡片 RSSI 展示');
      // F018：普通设备无 profile 徽章，仅「连接」入口
      expect(tester.any(find.text('连接')), isTrue, reason: 'F018 普通设备「连接」入口');
      expect(
          tester.any(find.byKey(const ValueKey('shidConfigureBtn'))), isFalse,
          reason: 'F018 普通设备不应有 SHID 配置入口');
      _log('F005 具名显示 + F018 普通入口 ✓');

      // ---- F004 广播详情 sheet ----
      await tester.tap(find.text(_fixtureName).first);
      expect(
          await _pumpUntil(tester, find.text('设备 ID'),
              timeout: const Duration(seconds: 5)),
          isTrue,
          reason: 'F004 广播详情 sheet 未打开');
      expect(tester.any(find.text('名称')), isTrue);
      expect(tester.any(find.text('RSSI')), isTrue);
      expect(tester.any(find.text('Service UUIDs')), isTrue,
          reason: 'F004 Service UUIDs 区块');
      expect(tester.any(find.textContaining('AD 结构')), isTrue,
          reason: 'F004 AD 逐段区块');
      // 夹具 scan response 带 Manufacturer Data（0x00E0 "LightBLE"）
      expect(tester.any(find.textContaining('厂商')), isTrue,
          reason: 'F004 Manufacturer Data 区块（夹具应携带）');
      expect(tester.any(find.text('复制数据')), isTrue, reason: 'F004 复制动作');
      _log('F004 sheet 字段 ✓');
      await tester.ensureVisible(find.text('关闭'));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('关闭'));
      // 等弹层真正退场（barrier 吞点击，E13 教训）
      final sheetGone = DateTime.now().add(const Duration(seconds: 5));
      while (DateTime.now().isBefore(sheetGone) &&
          tester.any(find.byType(BottomSheet))) {
        await tester.pump(const Duration(milliseconds: 150));
      }
      expect(tester.any(find.byType(BottomSheet)), isFalse,
          reason: 'F004 sheet 关闭后仍在');
      _log('F004 sheet 关闭 ✓');

      // ---- 第二轮：手动停止 ----
      await tester.tap(find.text('开始扫描'));
      expect(
          await _pumpUntil(tester, find.text('停止扫描'),
              timeout: const Duration(seconds: 3)),
          isTrue,
          reason: 'F001 第二轮扫描未启动');
      await tester.tap(find.text('停止扫描'));
      expect(
          await _pumpUntil(tester, find.text('开始扫描'),
              timeout: const Duration(seconds: 5)),
          isTrue,
          reason: 'F001 手动停止未回落');
      _log('F001 手动停止 ✓（两轮会话）');

      // ---- F003 筛选 ----
      await tester.tap(find.text('过滤条件'));
      expect(
          await _pumpUntil(tester, find.text('信号强度'),
              timeout: const Duration(seconds: 3)),
          isTrue,
          reason: 'F003 筛选面板未展开');
      expect(tester.any(find.text('名称前缀')), isTrue);
      expect(tester.any(find.text('隐藏无名设备')), isTrue);
      expect(tester.any(find.text('重置过滤条件')), isTrue);
      _log('F003 面板展开 ✓');

      // 正向前缀：过滤后只剩夹具（唯一卡片必在视口内构建）
      // 注：集成测试无真实软键盘遮挡，receiveAction(done) 后二次 enterText
      // 在 TestTextInput 连接上不生效（v4 诊断 field 未变），故全程不收键盘。
      await tester.enterText(find.byType(TextField), 'BLEToolkit');
      await tester.pump(const Duration(milliseconds: 600));
      expect(tester.any(find.text(_fixtureName)), isTrue,
          reason: 'F003 前缀命中应只剩夹具卡片');
      _log('F003 正向前缀 ✓');

      // 反向前缀 → 筛选空态
      await tester.enterText(find.byType(TextField), 'ZZZNOPE');
      await tester.pump(const Duration(milliseconds: 600));
      final diagField = tester
          .widget<TextField>(find.byType(TextField))
          .controller
          ?.text;
      _log('诊断: field=$diagField 无匹配态=${tester.any(find.text('当前没有匹配设备'))} '
          '夹具卡=${tester.any(find.text(_fixtureName))}');
      expect(tester.any(find.text('当前没有匹配设备')), isTrue,
          reason: 'F003 前缀不命中应为筛选空态');
      _log('F003 前缀空态 ✓');

      // 重置 → 筛选空态消失（列表含环境设备即为恢复；夹具卡片可能懒构建在视口外）
      // 面板展开高于一屏：先滚到按钮再点（否则 tap 落在屏外空态图标上）
      await tester.ensureVisible(find.text('重置过滤条件'));
      await tester.pump(const Duration(milliseconds: 400));
      await tester.tap(find.text('重置过滤条件'));
      await tester.pump(const Duration(milliseconds: 600));
      expect(tester.any(find.text('当前没有匹配设备')), isFalse,
          reason: 'F003 重置后筛选空态应消失');
      expect(tester.any(find.textContaining('台设备')), isTrue,
          reason: 'F003 重置后设备计数徽标应恢复');
      _log('F003 重置恢复 ✓');

      _log('F001-F005 全部断言通过');
    },
    timeout: const Timeout(Duration(minutes: 10)),
  );
}
