// Windows Mobile V1 · F014–F017 广播域真机集成驱动（F-AND）
//
// 布景：E5（SM-G9910）跑 F-AND 广播者 + ESP32 fixture_observer_s3（COM12，
//   逐条输出 {"type":"advertisement",...} JSON）。观察侧证据由外层 python 包装器
//   （f-and-f014-f017-run.py）在运行本测试期间并行采集 COM12 并做 F017 交叉核对，
//   本 dart 侧只负责 UI/状态机断言与广播占位保持。
//
// 断言口径（对齐 PRD R21/R23 + F016/F017）：
//   F016 超限拦截：厂商数据 24 字符 → 预算 46/31 红显「合计 · 超限，启动将被拦截」
//     且开始广播按钮 onPressed==null（禁用即拦截，不静默截断）；恢复默认后 25/31。
//   F015 负路径：服务 UUID=xyz → errorText「UUID 需为 4 / 8 / 36 位十六进制」+ 按钮禁用。
//   F015 正路径：默认载荷（FFF0/0001/BLE）开始广播 → 徽标「广播中」+ 按钮变「停止广播」
//     → 保持 15s（F017 观察窗）→ 停止 → 徽标离开「广播中」+ 按钮回「开始广播」。
//
// 字段定位：页面 4 个 TextField 顺序 = 设备名称(0) / 服务 UUID(1) / 厂商 ID(2) / 厂商数据(3)。
//
// 运行（python 包装器统一编排，含 COM12 采集与权限预授）：
//   flutter test -d R5CR1284Y7H integration_test/p008_broadcast_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:smart_ble/main.dart' as app;

void _log(String message) {
  final ts = DateTime.now().toString().substring(11, 23);
  debugPrint('P008[E2E $ts]: $message');
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

Future<bool> _pumpUntilGone(
  WidgetTester tester,
  Finder finder, {
  Duration timeout = const Duration(seconds: 10),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 400));
    if (!tester.any(finder)) return true;
  }
  return !tester.any(finder);
}

/// 开始广播按钮是否被禁用（F016/F015 拦截形态 = onPressed 置空）。
/// ElevatedButton.icon 的实际 runtimeType 是私有子类 _ElevatedButtonWithIcon，
/// byType 精确匹配会 0 命中（v6 教训）——用 is 子类谓词匹配。
bool _startButtonDisabled(WidgetTester tester) {
  final btn = find.ancestor(
      of: find.text('开始广播'),
      matching: find.byWidgetPredicate((w) => w is ElevatedButton));
  if (!tester.any(btn)) return false;
  final widget = tester.widget<ElevatedButton>(btn.first);
  return widget.onPressed == null;
}

void _dumpButtons(WidgetTester tester) {
  final all = find.byWidgetPredicate((w) => w is ElevatedButton);
  debugPrint('P008-DUMP ElevatedButton(含子类) count=${tester.widgetList(all).length}');
  for (final w in tester.widgetList<ElevatedButton>(all)) {
    debugPrint(
        'P008-DUMP button onPressed=${w.onPressed == null ? "null(禁用)" : "非null(可点)"}');
  }
  debugPrint(
      'P008-DUMP 开始广播 text count=${tester.widgetList<Text>(find.text('开始广播')).length}');
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('P008 广播域 F015/F016/F017（F-AND E5）', (tester) async {
    _log('启动应用');
    app.main();
    await _pumpUntil(tester,
        find.descendant(of: find.byType(BottomNavigationBar), matching: find.text('扫描')),
        timeout: const Duration(seconds: 20));

    // 进广播 Tab（AppBar 标题与底部标签同文，用 BottomNavigationBar 收窄）
    final bcastTab = find.descendant(
        of: find.byType(BottomNavigationBar), matching: find.text('广播'));
    await tester.tap(bcastTab.first);
    await _pumpUntil(tester, find.text('ADV 负载预算'),
        timeout: const Duration(seconds: 8));
    await tester.pump(const Duration(seconds: 2)); // 探针口径：进页后静置（v1-v3 教训：早入場 enterText 不落位）
    _log('已进入广播页');

    final fields = find.byType(TextField);
    expect(tester.widgetList(fields).length, 4,
        reason: 'Android 侧字段序 = 设备名称/服务UUID/厂商ID/厂商数据');

    /// 真机 live 模式页面级 TextField enterText 规程（v1-v7 教训）：
    /// 1) 先点中性区（预算标题）让上个字段失焦——Samsung 真 IME 组合态会吞掉紧接的
    ///    第二次 updateEditingValue（controller 被清空）；
    /// 2) tap 聚焦 + enterText，轮询校验 controller；
    /// 3) 兜底直接写 controller 后点「检查支持」触发整页 setState——
    ///    直写不经过 onChanged，预算/按钮/errorText 需要一次真实重建才会刷新。
    Future<void> enterTextChecked(Finder f, String text) async {
      final neutral = find.text('ADV 负载预算');
      if (tester.any(neutral)) {
        await tester.tap(neutral.first, warnIfMissed: false);
        await tester.pump(const Duration(milliseconds: 400));
      }
      for (var i = 1; i <= 3; i++) {
        await tester.tap(f, warnIfMissed: false);
        await tester.pump(const Duration(milliseconds: 500));
        await tester.enterText(f, text);
        await tester.pump(const Duration(milliseconds: 500));
        final w = tester.widget<TextField>(f);
        if (w.controller?.text == text) return;
        _log('enterText 第 $i 次未落位（${w.controller?.text}）');
      }
      tester.widget<TextField>(f).controller?.text = text;
      final probe = find.text('检查支持');
      if (tester.any(probe)) {
        await tester.tap(probe.first, warnIfMissed: false);
      }
      await tester.pump(const Duration(milliseconds: 800));
    }

    // ---- F016 超限拦截（R21：红显 + 阻止，不静默截断）----
    _log('F016：厂商数据输入 24 字符（预算 46/31）');
    await enterTextChecked(fields.at(3), 'A' * 24);
    final over = await _pumpUntil(tester, find.text('46'),
        timeout: const Duration(seconds: 5));
    expect(over, isTrue, reason: 'F016 预算总数 46 红显');
    expect(tester.any(find.textContaining('合计 · 超限，启动将被拦截')), isTrue,
        reason: 'F016 超限红字行');
    final disOver = _startButtonDisabled(tester);
    if (!disOver) _dumpButtons(tester);
    expect(disOver, isTrue,
        reason: 'F016 超限时开始广播按钮禁用（阻止启动）');
    _log('F016 超限拦截通过：46/31 红显 + 按钮禁用');

    // ---- F015 负路径：非法 UUID（字段带 hex 过滤器，非 hex 输入被剥离——v8 教训；
    //      用 'FF'：合法 hex 但长度非 4/8/36 → errorText + 按钮禁用）----
    await enterTextChecked(fields.at(3), 'BLE'); // 先恢复默认厂商数据
    await enterTextChecked(fields.at(1), 'FF');
    final inv = await _pumpUntil(tester, find.text('UUID 需为 4 / 8 / 36 位十六进制'),
        timeout: const Duration(seconds: 5));
    expect(inv, isTrue, reason: 'F015 非法 UUID errorText');
    final disInv = _startButtonDisabled(tester);
    if (!disInv) _dumpButtons(tester);
    expect(disInv, isTrue, reason: 'F015 非法 UUID 按钮禁用');
    _log('F015 负路径(1)通过：FF 非法长度拦截');

    // ---- F015 负路径(2)：空 UUID（hex 过滤器全剥后的真实形态）按钮可点 →
    //      点开始广播 → 错误便签「请输入服务 UUID」且不进入广播 ----
    await enterTextChecked(fields.at(1), '');
    await tester.ensureVisible(find.text('开始广播').first);
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('开始广播').first);
    final emptyErr = await _pumpUntil(tester, find.text('请输入服务 UUID'),
        timeout: const Duration(seconds: 5));
    expect(emptyErr, isTrue, reason: 'F015 空 UUID 错误便签');
    expect(tester.any(find.text('广播中')), isFalse, reason: 'F015 空 UUID 不启动广播');
    _log('F015 负路径(2)通过：空 UUID 拦截+错误便签');

    // ---- F016 合法预算（默认载荷 25/31）----
    await enterTextChecked(fields.at(1), 'FFF0');
    final ok25 = await _pumpUntil(tester, find.text('25'),
        timeout: const Duration(seconds: 5));
    final noOver = await _pumpUntilGone(tester, find.textContaining('合计 · 超限'),
        timeout: const Duration(seconds: 5));
    expect(ok25, isTrue, reason: 'F016 默认载荷 25/31');
    expect(noOver, isTrue, reason: 'F016 默认载荷无超限行');
    expect(_startButtonDisabled(tester), isFalse, reason: '合法载荷按钮可点');
    _log('F016 合法预算通过：25/31 可启动');

    // ---- F015 正路径：开始广播（观察侧并行采集，见包装器）----
    await tester.ensureVisible(find.text('开始广播').first);
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('开始广播').first);
    final started = await _pumpUntil(tester, find.text('广播中'),
        timeout: const Duration(seconds: 12));
    expect(started, isTrue, reason: 'F015 徽标进入广播中');
    expect(tester.any(find.text('停止广播')), isTrue, reason: 'F015 按钮变停止广播');
    _log('F015 正路径通过：广播中（开始广播: FFF0/0001/BLE）');

    // ---- F017 观察窗：保持 15s 供观察侧采集 ----
    _log('F017-HOLD-START 保持广播 15s');
    await tester.pump(const Duration(seconds: 15));
    expect(tester.any(find.text('广播中')), isTrue, reason: 'F017 保持期仍在广播');
    _log('F017-HOLD-END');

    // ---- F015 停止 ----
    await tester.ensureVisible(find.text('停止广播').first);
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('停止广播').first);
    final stopped = await _pumpUntilGone(tester, find.text('广播中'),
        timeout: const Duration(seconds: 10));
    expect(stopped, isTrue, reason: 'F015 停止后徽标离开广播中');
    expect(tester.any(find.text('开始广播')), isTrue, reason: 'F015 按钮回开始广播');
    _log('F015 停止通过');

    _log('P008 全部断言通过');
  }, timeout: const Timeout(Duration(minutes: 4)));
}
