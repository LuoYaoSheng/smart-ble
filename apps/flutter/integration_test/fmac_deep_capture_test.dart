// F-MAC 深态采集轮 · 20260911-fmac-deep
//
// 目的：用 ValueKey 语义驱动（E13 同源手法）在 macOS 桌面真窗上完整走通
// P002 向导 → P003 详情 → P005 诊断六态 → P006 高级 BLE，配合本机
// tests/macos/ble-fixture（shid 模式）与外部截图 watcher（标记协议：
// 本文件打 CAPTURE:<name>:GO 日志，PC 侧 watcher 激活窗口+screencapture）。
//
// 运行（success 轮）：
//   flutter test -d macos integration_test/fmac_deep_capture_test.dart \
//     --dart-define=FMAC_RUN=success \
//     --dart-define=P002_WIFI_SSID=Open-Test-2G \
//     --dart-define=P002_TOKEN=<32hex> --dart-define=P002_HOST=192.168.1.8
// 失败轮：FMAC_RUN=wifi_fail 且 SSID=FAIL-WIFI（夹具载荷规则注入 wifi_failed）。
//
// 证据口径：像素截图由外部 watcher 落 verification/windows-mobile-v1/
// 20260911-fmac-deep/；本文件日志（P002DEEP[...]）与夹具日志互证时序。

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:smart_ble/main.dart' as app;

const _run = String.fromEnvironment('FMAC_RUN', defaultValue: 'success');
const _ssid = String.fromEnvironment('P002_WIFI_SSID',
    defaultValue: 'Open-Test-2G');
const _pwd = String.fromEnvironment('P002_WIFI_PASSWORD', defaultValue: 'x');
const _token = String.fromEnvironment('P002_TOKEN',
    defaultValue: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6');
const _host = String.fromEnvironment('P002_HOST', defaultValue: '192.168.1.8');
const _port = String.fromEnvironment('P002_PORT', defaultValue: '17892');
const _qr = 'shid://pair?token=$_token&host=$_host&port=$_port';

Finder _k(String key) => find.byKey(ValueKey(key));

void _log(String m) {
  final ts = DateTime.now().toString().substring(11, 23);
  debugPrint('P002DEEP[$ts]: $m');
}

/// 标记协议：打 GO 标记后保活 7s，给外部 watcher 完成激活+截图。
Future<void> _mark(WidgetTester tester, String name,
    {Duration hold = const Duration(seconds: 7)}) async {
  debugPrint('CAPTURE:$name:GO');
  final deadline = DateTime.now().add(hold);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 200));
  }
  _log('mark $name done');
}


/// AppBar 返回键（AppSubnav 自定义返回，无 Cupertino 返回钮）
Finder _backBtn() => find
    .descendant(of: find.byType(AppBar), matching: find.byType(IconButton))
    .first;

Future<void> _goBack(WidgetTester tester) async {
  await tester.tap(_backBtn(), warnIfMissed: false);
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 200));
  }
}

Future<bool> _pumpUntil(WidgetTester tester, Finder finder,
    {Duration timeout = const Duration(seconds: 30)}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 300));
    if (tester.any(finder)) return true;
  }
  return tester.any(finder);
}

/// 快速轮询（100ms 粒度）——抓瞬时态（连接中/检测中）。
Future<bool> _pumpUntilFast(WidgetTester tester, Finder finder,
    {Duration timeout = const Duration(seconds: 20)}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 100));
    if (tester.any(finder)) return true;
  }
  return tester.any(finder);
}

Future<void> _waitSheetClosed(WidgetTester tester,
    {Duration timeout = const Duration(seconds: 5)}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline) &&
      tester.any(find.byType(BottomSheet))) {
    await tester.pump(const Duration(milliseconds: 150));
  }
}

Future<void> _scanAndWaitShid(WidgetTester tester) async {
  expect(tester.any(find.text('开始扫描')), isTrue);
  var found = tester.any(_k('shidConfigureBtn'));
  for (var round = 0; round < 6 && !found; round++) {
    if (tester.any(find.text('开始扫描'))) {
      await tester.tap(find.text('开始扫描').first);
    }
    found = await _pumpUntil(tester, _k('shidConfigureBtn'),
        timeout: const Duration(seconds: 12));
    if (!found) {
      // 键修复后 finder 只认 SHID 卡：列表里可能位于折叠下方，滚动后再找
      for (var s = 0; s < 4 && !found; s++) {
        await tester.drag(find.byType(ListView), const Offset(0, -250),
            warnIfMissed: false);
        for (var i = 0; i < 6; i++) {
          await tester.pump(const Duration(milliseconds: 150));
        }
        found = tester.any(_k('shidConfigureBtn'));
      }
    }
    if (!found) _log('scan round ${round + 1} 未命中 SHID 卡');
  }
  expect(found, isTrue, reason: '6 轮扫描未发现 SHID 设备卡');
}

Future<void> _enterWizard(WidgetTester tester) async {
  // 连接中 OpCard 是瞬态：快速轮询捕获。
  var entered = false;
  for (var attempt = 0; attempt < 5 && !entered; attempt++) {
    if (!tester.any(_k('shidConfigureBtn'))) {
      // 可能误触了 Tab 切页：先点回「扫描」Tab
      if (tester.any(find.text('扫描'))) {
        _log('attempt $attempt: 卡片不在，点回扫描 Tab');
        await tester.tap(find.text('扫描').last, warnIfMissed: false);
        for (var i = 0; i < 6; i++) {
          await tester.pump(const Duration(milliseconds: 150));
        }
      }
      if (!tester.any(_k('shidConfigureBtn'))) {
        _log('attempt $attempt: 重扫');
        await _scanAndWaitShid(tester);
      }
    }
    await tester.ensureVisible(_k('shidConfigureBtn'));
    try {
      final c = tester.getCenter(_k('shidConfigureBtn'));
      final r = tester.getRect(_k('shidConfigureBtn'));
      final cc = tester.widgetList(find.text('连接')).length;
      _log('btn center=$c rect=$r 连接count=$cc');
    } catch (e) {
      _log('getCenter fail: $e');
    }
    await tester.tap(_k('shidConfigureBtn'));
    for (var i = 0; i < 8; i++) {
      await tester.pump(const Duration(milliseconds: 150));
    }
    final dump = tester
        .widgetList<Text>(find.byType(Text))
        .map((t) => t.data ?? '')
        .where((s) => s.isNotEmpty)
        .take(40)
        .join(' | ');
    _log('tapped attempt=$attempt screen=[$dump]');
    if (dump.contains('配置 Smart HID') || tester.any(_k('ssidField'))) {
      entered = true;
    } else if (dump.contains('GATT 调试') || dump.contains('服务发现')) {
      _log('误入 GATT 调试页（点中相邻卡连接钮）——断开+返回重试');
      if (tester.any(find.text('断开'))) {
        await tester.tap(find.text('断开'), warnIfMissed: false);
        for (var i = 0; i < 6; i++) {
          await tester.pump(const Duration(milliseconds: 200));
        }
      }
      await _goBack(tester);
    } else if (tester.any(find.byType(BottomSheet))) {
      _log('误开 sheet（点中卡片体），点空白处关闭后重试');
      await tester.tapAt(const Offset(400, 590));
      for (var i = 0; i < 8; i++) {
        await tester.pump(const Duration(milliseconds: 150));
      }
    }
  }
  expect(entered, isTrue, reason: '5 次尝试未进入配网向导');

  final sawConnecting = await _pumpUntilFast(
      tester, find.textContaining('连接并确认设备中'),
      timeout: const Duration(seconds: 6));
  _log('connecting card seen=$sawConnecting');
  if (sawConnecting) {
    await _mark(tester, 'p002-step1-connecting',
        hold: const Duration(seconds: 2));
  }
  for (var attempt = 1; attempt <= 3; attempt++) {
    if (await _pumpUntil(tester, _k('ssidField'),
        timeout: const Duration(seconds: 45))) {
      _log('configure 阶段到达（第 $attempt 次连接）');
      return;
    }
    final retry = find.text('重新连接');
    if (tester.any(retry)) {
      await tester.tap(retry, warnIfMissed: false);
    }
  }
  fail('3 次尝试均未到达填写配置');
}

Future<void> _fillFormToToken(WidgetTester tester) async {
  await _mark(tester, 'p002-step2-form');
  await tester.enterText(_k('ssidField'), _ssid);
  await tester.pump(const Duration(milliseconds: 200));
  await tester.enterText(_k('pwdField'), _pwd);
  await tester.pump(const Duration(milliseconds: 200));
  await tester.ensureVisible(_k('qrCard'));
  await tester.pump(const Duration(milliseconds: 300));
  await tester.tap(_k('qrCard'));
  expect(
      await _pumpUntil(tester, _k('qrPasteExpand'),
          timeout: const Duration(seconds: 10)),
      isTrue,
      reason: '扫码面板未打开');
  await _mark(tester, 'p002-qr-sheet');
  await tester.tap(_k('qrPasteExpand'));
  await tester.pump(const Duration(milliseconds: 300));
  await _mark(tester, 'p002-qr-paste');
  await tester.enterText(_k('qrPasteField'), _qr);
  await tester.pump(const Duration(milliseconds: 200));
  await tester.tap(_k('qrParseBtn'));
  expect(
      await _pumpUntil(tester, find.text('已获取'),
          timeout: const Duration(seconds: 10)),
      isTrue,
      reason: '配对码解析失败');
  await _waitSheetClosed(tester);
  _log('token 就绪（值不落日志）');
}

Future<void> _submit(WidgetTester tester) async {
  await tester.pump(const Duration(seconds: 5)); // SnackBar 退场
  await tester.testTextInput.receiveAction(TextInputAction.done);
  await tester.pump(const Duration(milliseconds: 300));
  await tester.ensureVisible(_k('submitBtn'));
  await tester.pump(const Duration(milliseconds: 300));
  await tester.tap(_k('submitBtn'));
  _log('已点下发配置');
}

Future<String> _waitOutcome(WidgetTester tester, Duration timeout) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 400));
    if (tester.any(find.text('配置成功 · 设备 READY'))) return 'success';
    for (final code in [
      'wifi_failed', 'controlhub_unreachable', 'pairing_invalid',
      'pairing_expired', 'pairing_used', 'mqtt_invalid', 'storage_failed',
      'invalid_payload', 'connection_lost', 'timeout',
    ]) {
      if (tester.any(find.text(code))) return code;
    }
  }
  return 'NO_OUTCOME';
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('F-MAC deep capture: $_run', (tester) async {
    _log('run=$_run ssid=$_ssid 启动');
    // 视口钉 800×600：与 09-10 vis1-fmac Release 窗口口径一致
    tester.view.physicalSize = const Size(800, 600);
    tester.view.devicePixelRatio = 1.0;
    app.main();
    await tester.pump(const Duration(seconds: 1));

    await _scanAndWaitShid(tester);
    await _mark(tester, 'p001-scan-result');
    await _enterWizard(tester);
    await _fillFormToToken(tester);
    await _mark(tester, 'p002-step2-token');
    await _submit(tester);

    // 下发走链中帧（夹具 0.6s/步 ×7 ≈ 4.2s）
    await _pumpUntilFast(tester, _k('cancelWaitBtn'),
        timeout: const Duration(seconds: 15));
    await _mark(tester, 'p002-step3-walking', hold: const Duration(seconds: 3));

    switch (_run) {
      case 'success':
        final outcome =
            await _waitOutcome(tester, const Duration(seconds: 150));
        _log('outcome=$outcome');
        expect(outcome, 'success', reason: '主链路未达 READY');
        await _mark(tester, 'p002-step3-done');
        await tester.tap(find.text('查看设备'));
        expect(
            await _pumpUntil(tester, find.textContaining('provisioned：true'),
                timeout: const Duration(seconds: 15)),
            isTrue,
            reason: '成功后 INFO provisioned 未翻转');
        await _mark(tester, 'p003-info-dialog');
        await tester.tap(find.text('知道了'));
        await _pumpUntil(tester, find.text('Smart HID 设备详情'),
            timeout: const Duration(seconds: 10));
        await _mark(tester, 'p003-default');

        // P006 高级 BLE（P003 出口，连接夹具读服务树）
        await tester.tap(find.text('高级 BLE 调试'));
        await _pumpUntil(tester, find.textContaining('9f1d1001'),
            timeout: const Duration(seconds: 25));
        await _mark(tester, 'p006-gatt-shid');
        await _goBack(tester);
        await _pumpUntil(tester, find.text('Smart HID 设备详情'),
            timeout: const Duration(seconds: 10));

        // P005 六态链
        await tester.tap(find.text('运行诊断'));
        await _pumpUntil(tester, find.text('Smart HID 诊断'),
            timeout: const Duration(seconds: 10));
        await _mark(tester, 'p005-idle');
        await tester.tap(find.text('重新检测'));
        await _pumpUntil(tester, find.text('BLE 未连接'),
            timeout: const Duration(seconds: 5));
        await _mark(tester, 'p005-confirm-dialog');
        await tester.tap(find.text('连接并检测'));
        await _pumpUntilFast(tester, find.text('正在读取实时状态…'),
            timeout: const Duration(seconds: 12));
        await _mark(tester, 'p005-checking', hold: const Duration(seconds: 2));
        expect(
            await _pumpUntil(tester, find.text('实时检测完成'),
                timeout: const Duration(seconds: 30)),
            isTrue,
            reason: '诊断未达 live');
        await _mark(tester, 'p005-live');

        // offline：live 态在页时外部击杀夹具
        debugPrint('CAPTURE:FXKILL:GO');
        expect(
            await _pumpUntil(tester, find.text('设备未连接'),
                timeout: const Duration(seconds: 60)),
            isTrue,
            reason: '夹具击杀后未落 offline');
        await _mark(tester, 'p005-offline');

        // error：夹具已死，重检 → 连接失败
        await tester.tap(find.text('重新检测'));
        await _pumpUntil(tester, find.text('BLE 未连接'),
            timeout: const Duration(seconds: 5));
        await tester.tap(find.text('连接并检测'));
        expect(
            await _pumpUntil(tester, find.text('检测失败'),
                timeout: const Duration(seconds: 45)),
            isTrue,
            reason: '重检未落 error');
        await _mark(tester, 'p005-error');
        _log('success 轮全部标记完成');

      case 'wifi_fail':
        final outcome =
            await _waitOutcome(tester, const Duration(seconds: 120));
        _log('outcome=$outcome');
        expect(outcome, 'wifi_failed', reason: '期望 wifi_failed');
        await _mark(tester, 'p002-step3-error');
        expect(tester.any(find.text('返回表单修改')), isTrue);
        _log('wifi_fail 轮完成');
    }
  }, timeout: const Timeout(Duration(minutes: 14)));
}
