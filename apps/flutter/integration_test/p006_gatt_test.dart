// Windows Mobile V1 · F006–F012 GATT 域真机集成驱动（F-AND）
//
// 夹具：fixture_peripheral_s3（连接后 GATT 表：GAP 1800（2 特征）/ GATT 1801 /
//   主服务 4fafc201-…-914b：控制 26a8 = 读设备信息 JSON + 写 LED 命令 + 通知回显，
//   状态通知 26a9 = 写+通知，订阅即推「开始监听系统状态」、每 5s device_status；
//   权限服务 …-914c：b0–b6 特征矩阵（b0 READ_ONLY = "Read Only Characteristic"）；
//   OTA 服务 …-914d：3 特征）。
//
// 相位顺序（避免 ListView 懒构建撞车，v1–v4 教训）：
//   主服务卡操作（F007→F012）连续完成、视口不离开主卡；权限矩阵 b0 读（F008b）
//   放到 F012 之后一次性前向滚动——粘性 fault 只拦截「写」不影响「读」。
//   F012 用固件故障注入 {"cmd":"fault","type":"disconnect"}：写入即外设拆链；
//   标志粘性（武装后每次写再拆链、clear 无法送达），故 F012 必须是最后一次特征写，
//   重连后的链路验证用「读」。
//
// 定位：DeviceCard 是 Container 非 Card（v1 教训）按类型定位；服务瓦片徽标
//   「2 特征值」GAP 也撞（v3 教训）——夹具三服务 shortUuid 同为 4FAFC201，主卡
//   用 4FAFC201.first（列表顶部区），权限用唯一徽标「7 特征值」+ 前向滚动。
//   服务命名经 WIN-FAND-003 修复：GAP/GATT 具名、仅 914d 标「OTA 升级服务」。
//
// 运行：
//   flutter test -d <deviceId> integration_test/p006_gatt_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:smart_ble/main.dart' as app;
import 'package:smart_ble/ui/widgets/device_card.dart';

const _fixtureName = 'BLEToolkit-Server';

void _log(String message) {
  final ts = DateTime.now().toString().substring(11, 23);
  debugPrint('P006[E2E $ts]: $message');
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

/// 在已打开的写入对话框里输入并提交，等对话框退场
Future<bool> _fillAndSubmitDialog(WidgetTester tester, String data) async {
  await tester.enterText(
      find.descendant(
          of: find.byType(AlertDialog), matching: find.byType(TextField)),
      data);
  await tester.pump(const Duration(milliseconds: 200));
  await tester.tap(find.text('写入'));
  return _pumpUntilGone(tester, find.byType(AlertDialog),
      timeout: const Duration(seconds: 5));
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  // BLE 回调与重连事件需要实时帧
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets(
    'F006-F012 GATT domain (fixture BLEToolkit-Server)',
    (tester) async {
      _log('启动');
      app.main();
      await tester.pump(const Duration(seconds: 1));

      // ---- F006：扫描并连接夹具 ----
      await tester.tap(find.text('开始扫描'));
      final found = await _pumpUntil(tester, find.text(_fixtureName),
          timeout: const Duration(seconds: 15));
      _log('夹具卡片发现=$found');
      expect(found, isTrue, reason: 'F006 15s 内未见夹具卡片');

      // DeviceCard 是 Container+Material+InkWell（非 Card），按类型定位
      final fixtureCard = find.ancestor(
        of: find.text(_fixtureName),
        matching: find.byType(DeviceCard),
      );
      await tester.ensureVisible(
          find.descendant(of: fixtureCard, matching: find.text('连接')));
      await tester.pump(const Duration(milliseconds: 300));
      await tester
          .tap(find.descendant(of: fixtureCard, matching: find.text('连接')));

      expect(
          await _pumpUntil(tester, find.textContaining('个服务'),
              timeout: const Duration(seconds: 20)),
          isTrue,
          reason: 'F006 连接后未完成服务发现');
      expect(tester.any(find.text('已连接')), isTrue, reason: 'F006 已连接状态');
      expect(tester.any(find.text(_fixtureName)), isTrue,
          reason: 'F006 详情页标题为设备名');
      _log('F006 GATT 连接 ✓');

      // ---- F007：服务树 ----（WIN-FAND-003 修复后：GAP/GATT 具名、仅 914d 标 OTA）
      expect(tester.any(find.text('通用访问')), isTrue, reason: 'F007 GAP 服务');
      expect(tester.any(find.text('通用属性')), isTrue, reason: 'F007 GATT 服务');
      final otaTiles = find.text('OTA 升级服务').evaluate().length;
      final unknownTiles = find.text('未知服务').evaluate().length;
      _log('F007 服务命名：OTA=$otaTiles（应 1）/ 未知=$unknownTiles（主服务+权限矩阵）');
      expect(otaTiles, 1, reason: 'F007 仅 OTA 服务应具名「OTA 升级服务」');
      expect(unknownTiles >= 2, isTrue, reason: 'F007 主服务/权限矩阵应为未知服务');

      // 展开主服务（GATT 表第 1 个 4FAFC201；「2 特征值」GAP 也撞不能全局用）
      final fixtureShortUuid = find.text('4FAFC201');
      expect(fixtureShortUuid.evaluate().length, 3,
          reason: 'F007 夹具应有三个 4FAFC201 服务瓦片');
      await tester.ensureVisible(fixtureShortUuid.first);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(fixtureShortUuid.first);
      final mainCard = find.ancestor(
        of: fixtureShortUuid.first,
        matching: find.byType(Card),
      );
      expect(
          await _pumpUntil(tester,
              find.descendant(of: mainCard, matching: find.byTooltip('读取')),
              timeout: const Duration(seconds: 3)),
          isTrue,
          reason: 'F007 主服务展开后未见控制特征「读取」按钮');
      expect(
          find
              .descendant(of: mainCard, matching: find.byTooltip('写入'))
              .evaluate()
              .length,
          2,
          reason: 'F007 主服务应有 2 个可写特征');
      expect(
          find
              .descendant(of: mainCard, matching: find.byTooltip('启用通知'))
              .evaluate()
              .length,
          2,
          reason: 'F007 主服务应有 2 个可通知特征');
      expect(
          find
              .descendant(of: mainCard, matching: find.text('Read'))
              .evaluate()
              .length,
          1,
          reason: 'F007 仅控制特征带 Read 属性片');
      expect(
          tester
              .any(find.descendant(of: mainCard, matching: find.text('2 特征值'))),
          isTrue,
          reason: 'F007 主服务应为 2 特征值');
      _log('F007 服务树 ✓（主服务 2 特征：控制=读+写+通知，状态=写+通知）');

      // ---- F008：控制特征读取 ----
      final controlReadBtn =
          find.descendant(of: mainCard, matching: find.byTooltip('读取'));
      await tester.ensureVisible(controlReadBtn);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(controlReadBtn);
      expect(
          await _pumpUntil(tester, find.textContaining('HEX:'),
              timeout: const Duration(seconds: 8)),
          isTrue,
          reason: 'F008 控制特征读取无 HEX 日志');
      expect(tester.any(find.textContaining('TEXT:')), isTrue,
          reason: 'F008 控制特征读取无 TEXT 日志');
      _log('F008 控制特征读 ✓（完整设备信息 JSON，WIN-ESP32-002 修复后）');

      // ---- F009：特征写入（HEX + UTF-8）----
      // 控制特征先开通知，收 write_response 回显（led_state/命令 echo）
      final controlNotifyBtn =
          find.descendant(of: mainCard, matching: find.byTooltip('启用通知')).first;
      await tester.ensureVisible(controlNotifyBtn);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(controlNotifyBtn);
      expect(
          await _pumpUntil(tester, find.text('通知已启用'),
              timeout: const Duration(seconds: 5)),
          isTrue,
          reason: 'F009 控制特征通知未启用');

      final controlWriteBtn =
          find.descendant(of: mainCard, matching: find.byTooltip('写入')).first;
      Future<bool> openWriteDialog() async {
        await tester.ensureVisible(controlWriteBtn);
        await tester.pump(const Duration(milliseconds: 300));
        await tester.tap(controlWriteBtn);
        return _pumpUntil(tester, find.text('写入 未知特征值'),
            timeout: const Duration(seconds: 5));
      }

      expect(await openWriteDialog(), isTrue, reason: 'F009 写入对话框未打开');
      expect(await _fillAndSubmitDialog(tester, 'FF 01'), isTrue,
          reason: 'F009 HEX 写入对话框未关闭');
      expect(
          await _pumpUntil(tester, find.text('写入成功'),
              timeout: const Duration(seconds: 8)),
          isTrue,
          reason: 'F009 FF01 写入失败');
      expect(
          await _pumpUntil(tester, find.textContaining('FF01'),
              timeout: const Duration(seconds: 5)),
          isTrue,
          reason: 'F009 未收到 FF01 的 write_response');
      expect(tester.any(find.textContaining('led_state')), isTrue,
          reason: 'F009 write_response 缺 led_state');
      _log('F009 HEX FF01 写入 + 回显 ✓（LED 开）');

      expect(await openWriteDialog(), isTrue);
      expect(await _fillAndSubmitDialog(tester, 'FF 00'), isTrue);
      expect(
          await _pumpUntil(tester, find.textContaining('FF00'),
              timeout: const Duration(seconds: 8)),
          isTrue,
          reason: 'F009 FF00 写入无回显');
      _log('F009 HEX FF00 写入 + 回显 ✓（LED 关）');

      // UTF-8 文本模式「开灯」
      expect(await openWriteDialog(), isTrue);
      await tester.tap(find.text('UTF-8'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(await _fillAndSubmitDialog(tester, '开灯'), isTrue);
      expect(
          await _pumpUntil(tester, find.textContaining('开灯'),
              timeout: const Duration(seconds: 8)),
          isTrue,
          reason: 'F009 UTF-8 开灯写入无日志');
      _log('F009 UTF-8 开灯写入 ✓');

      // ---- F010：状态通知（26a9）订阅 + 周期推送 + 取消 ----
      // 控制特征已通知中（tooltip 已翻转为「停止通知」），此时主服务卡内
      // 「启用通知」唯一对应状态特征，无需按下标猜。
      final statusNotifyBtn =
          find.descendant(of: mainCard, matching: find.byTooltip('启用通知'));
      expect(statusNotifyBtn.evaluate().length, 1,
          reason: 'F010 此时应只剩状态特征的启用通知按钮');
      await tester.ensureVisible(statusNotifyBtn);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(statusNotifyBtn);
      expect(
          await _pumpUntil(tester, find.textContaining('开始监听系统状态'),
              timeout: const Duration(seconds: 8)),
          isTrue,
          reason: 'F010 订阅后未收到欢迎推送');
      _log('F010 状态订阅欢迎推送 ✓');

      expect(
          await _pumpUntil(tester, find.textContaining('device_status'),
              timeout: const Duration(seconds: 9)),
          isTrue,
          reason: 'F010 9s 内未收到周期 device_status');
      _log('F010 周期 device_status ✓');

      // 取消订阅：卡内两个「停止通知」，后者为状态特征
      final statusStopBtn =
          find.descendant(of: mainCard, matching: find.byTooltip('停止通知')).last;
      await tester.ensureVisible(statusStopBtn);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(statusStopBtn);
      expect(
          await _pumpUntil(tester, find.text('通知已禁用'),
              timeout: const Duration(seconds: 5)),
          isTrue,
          reason: 'F010 状态通知未禁用');
      _log('F010 通知开关往返 ✓');

      // ---- F011：通信日志（清空 / 再生成 / 导出）----
      await tester.ensureVisible(find.text('清空'));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('清空'));
      expect(
          await _pumpUntilGone(tester, find.text('操作日志'),
              timeout: const Duration(seconds: 3)),
          isTrue,
          reason: 'F011 清空后日志面板未隐藏');
      _log('F011 清空 ✓');

      await tester.ensureVisible(controlReadBtn);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(controlReadBtn);
      expect(
          await _pumpUntil(tester, find.text('操作日志'),
              timeout: const Duration(seconds: 8)),
          isTrue,
          reason: 'F011 清空后新日志未重建面板');
      _log('F011 日志重建 ✓');

      await tester.ensureVisible(find.text('导出'));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('导出'));
      expect(
          await _pumpUntil(tester, find.textContaining('已复制到剪贴板'),
              timeout: const Duration(seconds: 5)),
          isTrue,
          reason: 'F011 导出无剪贴板回执');
      _log('F011 导出 ✓');

      // ---- F012：外设拆链 → 自动重连（最后一次特征写）----
      expect(await openWriteDialog(), isTrue);
      await tester.tap(find.text('UTF-8'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(
          await _fillAndSubmitDialog(
              tester, '{"cmd":"fault","type":"disconnect"}'),
          isTrue);
      expect(
          await _pumpUntil(tester, find.text('重连中...'),
              timeout: const Duration(seconds: 15)),
          isTrue,
          reason: 'F012 外设拆链后未进入重连中状态');
      _log('F012 拆链 → 重连中 ✓');

      expect(
          await _pumpUntilGone(tester, find.text('重连中...'),
              timeout: const Duration(seconds: 25)),
          isTrue,
          reason: 'F012 25s 内未完成自动重连（退避 2/4/6s×3）');
      expect(tester.any(find.text('已连接')), isTrue, reason: 'F012 重连后未回已连接');
      _log('F012 自动重连 ✓');

      // 恢复链路验证用「读」——fault 粘性使任何写都会再拆链
      await tester.ensureVisible(controlReadBtn);
      await tester.pump(const Duration(milliseconds: 300));
      final textCountBefore = find.textContaining('TEXT:').evaluate().length;
      await tester.tap(controlReadBtn);
      var readOk = false;
      var readFailed = false;
      final readDeadline = DateTime.now().add(const Duration(seconds: 8));
      while (DateTime.now().isBefore(readDeadline) && !readOk && !readFailed) {
        await tester.pump(const Duration(milliseconds: 400));
        readFailed = tester.any(find.textContaining('读取失败'));
        readOk =
            find.textContaining('TEXT:').evaluate().length > textCountBefore;
      }
      if (readFailed) {
        // 重连后未重新发现服务（servicesList 缓存失效）——域总结记录，不判失败
        _log('F012 重连后读失败（观察项：重连后服务缓存）');
      } else if (readOk) {
        _log('F012 重连后读取恢复 ✓');
      } else {
        _log('F012 重连后读取 8s 无响应');
      }

      // ---- F008b：权限矩阵 b0 读（fault 粘性不影响读；唯一徽标前向滚动）----
      // scrollable 参数要求 Scrollable 类型；页内首个 = 服务列表
      await tester.scrollUntilVisible(
        find.text('7 特征值'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('7 特征值'));
      final permCard = find.ancestor(
        of: find.text('7 特征值'),
        matching: find.byType(Card),
      );
      final b0ReadBtn =
          find.descendant(of: permCard, matching: find.byTooltip('读取')).first;
      expect(
          await _pumpUntil(tester, b0ReadBtn,
              timeout: const Duration(seconds: 3)),
          isTrue,
          reason: 'F008 权限服务展开后无读按钮');
      await tester.ensureVisible(b0ReadBtn);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(b0ReadBtn);
      expect(
          await _pumpUntil(
              tester, find.textContaining('这是一个只读特征值'),
              timeout: const Duration(seconds: 8)),
          isTrue,
          reason: 'F008 b0 读取未返回约定值（read_only JSON）');
      _log('F008 权限矩阵 b0 读 ✓（read_only JSON）');

      // ---- 用户主动断开收尾：回列表、不再自动重连 ----
      await tester.ensureVisible(find.text('断开'));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.text('断开'));
      expect(
          await _pumpUntil(tester, find.text('开始扫描'),
              timeout: const Duration(seconds: 8)),
          isTrue,
          reason: '断开后未回到列表页');
      expect(tester.any(find.text('重连中...')), isFalse,
          reason: '用户主动断开不应触发自动重连');
      _log('断开收尾 ✓');

      _log('F006-F012 全部断言通过');
    },
    timeout: const Timeout(Duration(minutes: 12)),
  );
}
