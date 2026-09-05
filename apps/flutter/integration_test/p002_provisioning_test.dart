// E13 · P002 Smart HID 配网真机集成驱动
//
// 分工（见 verification/…/e13-provision/sequence.md 图 D）：
//  - 本文件跑在真机上，用 ValueKey 语义驱动 App 内 UI（uiautomator 对
//    Samsung+Flutter 无语义树，像素驱动已放弃）；
//  - BLE 连接触发的系统配对/权限弹窗在 App 外，由 PC 侧
//    e13-pairing-daemon.py 检测并点按；
//  - 场景与凭据经 --dart-define 注入，日志与证据不落 token/密码。
//
// 运行（PC 侧；注意 QR 的 '&' 会被 Git Bash→flutter.bat 拆断，
// 因此传 token/host/port 三个纯字母数字分量、由 Dart 侧拼装）：
//   flutter test -d <deviceId> \
//     --dart-define=P002_SCENARIO=success \
//     --dart-define=P002_WIFI_SSID=… \
//     --dart-define=P002_WIFI_PASSWORD=… \
//     --dart-define=P002_TOKEN=<32hex> \
//     --dart-define=P002_HOST=192.168.21.77 \
//     --dart-define=P002_PORT=17892 \
//     integration_test/p002_provisioning_test.dart
//
// 场景：success | wifi_fail | pairing_invalid | mqtt_invalid |
//       cancel_wait | leave | lost_configure
// 注意：READY 即停广播——失败类场景必须在 success 之前执行。

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:smart_ble/main.dart' as app;

const _scenario = String.fromEnvironment('P002_SCENARIO');
const _ssid = String.fromEnvironment('P002_WIFI_SSID');
const _pwd = String.fromEnvironment('P002_WIFI_PASSWORD');
const _token = String.fromEnvironment('P002_TOKEN');
const _host = String.fromEnvironment('P002_HOST');
const _port = String.fromEnvironment('P002_PORT', defaultValue: '17892');
// 拼装后的完整配对码（与 ControlHub qr_payload 同构）
const _qr = 'shid://pair?token=$_token&host=$_host&port=$_port';

Finder _k(String key) => find.byKey(ValueKey(key));

void _log(String message) {
  // 与 App 内 'P002: …' 标记同通道，供 PC 侧 logcat 联动（如断连注入）。
  // 带墙钟时间戳：与守护进程日志（PC 侧）精确对时定位断连时序。
  final ts = DateTime.now().toString().substring(11, 23);
  debugPrint('P002[E2E $ts]: $message');
}

/// 按真实时钟轮询直至 finder 命中。禁止 pumpAndSettle——
/// 连接中/下发中的 CircularProgressIndicator 永不 settle。
Future<bool> _pumpUntil(
  WidgetTester tester,
  Finder finder, {
  Duration timeout = const Duration(seconds: 60),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 400));
    if (tester.any(finder)) return true;
  }
  return tester.any(finder);
}

/// 等底部弹层真正退场。退出动画期间模态 barrier 仍吞点击
/// （U-01 首跑教训：'已获取' 出现时扫码面板还在收起，AppBar 返回键
/// 被 barrier 吃掉——命中链含 _RenderTheater + RenderAbsorbPointer）。
Future<void> _waitSheetClosed(WidgetTester tester,
    {Duration timeout = const Duration(seconds: 5)}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline) &&
      tester.any(find.byType(BottomSheet))) {
    await tester.pump(const Duration(milliseconds: 150));
  }
}

/// AppBar 返回键：ProvisioningPage 的 AppBar 内唯一 IconButton
/// （比 byIcon(chevron_left) 稳，避免命中别处图标/被弹层动画期遮挡误判）。
Finder _backBtn() => find
    .descendant(of: find.byType(AppBar), matching: find.byType(IconButton))
    .first;

Future<void> _startScanAndWaitDevice(WidgetTester tester) async {
  expect(tester.any(find.text('开始扫描')), isTrue,
      reason: '首页扫描按钮未出现（权限弹窗未处理？）');
  var found = false;
  for (var round = 0; round < 6 && !found; round++) {
    if (tester.any(find.text('开始扫描'))) {
      await tester.tap(find.text('开始扫描'));
    }
    found = await _pumpUntil(tester, _k('shidConfigureBtn'),
        timeout: const Duration(seconds: 12));
    if (!found) _log('scan round ${round + 1} 未命中 SHID 卡片，重扫');
  }
  expect(found, isTrue, reason: '6 轮扫描未发现 SHID 设备卡片（设备未广播？）');
}

/// 从扫描卡片进入向导并到达「填写配置」。
/// 真固件连上即发起 SMP：系统配对弹窗由 PC 守护点按；若弹窗超时导致
/// 栈侧断连（~30s），利用 identity_failed/断开横幅重试。
Future<void> _enterWizardAndReachConfigure(WidgetTester tester) async {
  await tester.ensureVisible(_k('shidConfigureBtn'));
  await tester.pump(const Duration(milliseconds: 300));
  await tester.tap(_k('shidConfigureBtn'));

  for (var attempt = 1; attempt <= 3; attempt++) {
    if (await _pumpUntil(tester, _k('ssidField'),
        timeout: const Duration(seconds: 45))) {
      _log('configure 阶段已到达（第 $attempt 次连接）');
      return;
    }
    final retry = find.text('重新连接');
    if (tester.any(retry)) {
      _log('连接失败/断开，点重新连接（第 $attempt 次）');
      await tester.tap(retry, warnIfMissed: false);
    }
  }
  fail('3 次尝试均未到达填写配置阶段');
}

/// 填 SSID/密码 + 粘贴配对码（qrPaste 兜底路径；相机物理对准限制见证据 README）。
Future<void> _fillForm(WidgetTester tester) async {
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
      reason: '扫码面板未打开（相机权限？）');
  await tester.tap(_k('qrPasteExpand'));
  await tester.pump(const Duration(milliseconds: 300));
  await tester.enterText(_k('qrPasteField'), _qr);
  await tester.pump(const Duration(milliseconds: 200));
  await tester.tap(_k('qrParseBtn'));
  expect(
      await _pumpUntil(tester, find.text('已获取'),
          timeout: const Duration(seconds: 10)),
      isTrue,
      reason: '配对码解析失败（QR 载荷非法？）');
  await _waitSheetClosed(tester);
  _log('表单已就绪（token 已回填，值不落日志；扫码面板已退场）');
}

/// 真机实测：配对弹窗被点掉后 ~3-5s，Android 栈以
/// l2c_link_timeout(All channels closed) 主动拆 ACL（GATT_CONN_TERMINATE_LOCAL_HOST）。
/// 断开横幅经 FBP 回调→setState 异步出现，须轮询等待而非一次性判断。
/// 产品语义：表单不丢，点「重新连接」续跑（重连时 bond 已在，无二次配对弹窗）。
Future<void> _recoverIfLost(WidgetTester tester) async {
  final probe = DateTime.now().add(const Duration(seconds: 3));
  var sawBanner = false;
  while (DateTime.now().isBefore(probe)) {
    await tester.pump(const Duration(milliseconds: 200));
    if (tester.any(find.textContaining('设备连接已断开')) &&
        tester.any(find.text('重新连接'))) {
      sawBanner = true;
      break;
    }
  }
  if (!sawBanner) return;
  _log('检测到断开横幅，点重新连接（表单应保留）');
  await tester.tap(find.text('重新连接').first, warnIfMissed: false);
  final deadline = DateTime.now().add(const Duration(seconds: 75));
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 500));
    if (!tester.any(find.textContaining('设备连接已断开')) &&
        tester.any(_k('ssidField'))) {
      _log('已重新连接，继续');
      return;
    }
  }
  fail('断开后重新连接超时（75s）');
}

Future<void> _submit(WidgetTester tester) async {
  await _recoverIfLost(tester);
  // 等底部 SnackBar（'配对码已解析' toast，默认 4s）自然退场：
  // 提交按钮在屏幕底部，toast 不退场会盖住它导致 tap 命中失败（实测命中链落 SnackBar）。
  await tester.pump(const Duration(seconds: 5));
  // 收起软键盘（焦点残留输入框时压缩视口）
  await tester.testTextInput.receiveAction(TextInputAction.done);
  await tester.pump(const Duration(milliseconds: 300));
  await tester.ensureVisible(_k('submitBtn'));
  await tester.pump(const Duration(milliseconds: 300));
  await tester.tap(_k('submitBtn'));
  _log('已点下发配置');
}

/// 等终态：成功卡片 / 任意错误码横幅（返回命中到的文本）
Future<String> _waitOutcome(WidgetTester tester, Duration timeout) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 500));
    if (tester.any(find.text('配置成功 · 设备 READY'))) return 'success';
    for (final code in [
      'wifi_failed',
      'controlhub_unreachable',
      'pairing_invalid',
      'pairing_expired',
      'pairing_used',
      'mqtt_invalid',
      'storage_failed',
      'invalid_payload',
      'connection_lost',
      'timeout',
    ]) {
      if (tester.any(find.text(code))) return code;
    }
  }
  return 'NO_OUTCOME';
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  // 相机预览（MobileScanner）与真实 BLE 回调都需要实时帧
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets(
    'P002 scenario: $_scenario',
    (tester) async {
      assert(_scenario.isNotEmpty, '必须提供 P002_SCENARIO');
      assert(_ssid.isNotEmpty && _token.isNotEmpty && _host.isNotEmpty,
          '必须提供 SSID 与 token/host 分量');

      _log('scenario=$_scenario 启动');
      app.main();
      await tester.pump(const Duration(seconds: 1));

      await _startScanAndWaitDevice(tester);
      await _enterWizardAndReachConfigure(tester);
      await _fillForm(tester);

      switch (_scenario) {
        case 'success':
          await _submit(tester);
          final outcome = await _waitOutcome(
              tester, const Duration(seconds: 150));
          _log('outcome=$outcome');
          expect(outcome, 'success',
              reason: 'T1 主链路未达 READY（实际终态 $outcome）');
          // 查看设备：重读 INFO，provisioned 应已翻转为 true
          await tester.tap(find.text('查看设备'));
          expect(
              await _pumpUntil(tester, find.textContaining('provisioned：true'),
                  timeout: const Duration(seconds: 15)),
              isTrue,
              reason: '成功后 INFO provisioned 未翻转');
          await tester.tap(find.text('知道了'));
          _log('T1 完成：READY + provisioned:true');

        case 'wifi_fail':
          await _submit(tester);
          final outcome = await _waitOutcome(
              tester, const Duration(seconds: 120));
          _log('outcome=$outcome');
          expect(outcome, 'wifi_failed', reason: 'T2 期望 wifi_failed');
          expect(tester.any(find.text('返回表单修改')), isTrue,
              reason: 'T2 恢复按钮应为「返回表单修改」');

        case 'pairing_invalid':
          await _submit(tester);
          final outcome = await _waitOutcome(
              tester, const Duration(seconds: 120));
          _log('outcome=$outcome');
          expect(outcome, 'pairing_invalid', reason: 'T3 期望 pairing_invalid');
          expect(tester.any(find.text('重新扫描配对码')), isTrue,
              reason: 'T3 恢复按钮应为「重新扫描配对码」');

        case 'mqtt_invalid':
          await _submit(tester);
          final outcome = await _waitOutcome(
              tester, const Duration(seconds: 180));
          _log('outcome=$outcome');
          expect(outcome, 'mqtt_invalid', reason: 'T4 期望 mqtt_invalid');
          expect(tester.any(find.text('运行诊断')), isTrue,
              reason: 'T4 恢复按钮应为「运行诊断」');
          await tester.tap(find.text('运行诊断'));
          expect(
              await _pumpUntil(tester, find.text('Smart HID 诊断'),
                  timeout: const Duration(seconds: 15)),
              isTrue,
              reason: '诊断面板未打开');
          expect(tester.any(find.text('Provision Status（STATUS 特征）')),
              isTrue);
          await tester.tap(find.text('关闭'));
          _log('T4 完成：mqtt_invalid + 诊断面板重读两特征');

        case 'cancel_wait':
          await _submit(tester);
          expect(
              await _pumpUntil(tester, _k('cancelWaitBtn'),
                  timeout: const Duration(seconds: 15)),
              isTrue,
              reason: '未进入下发等待态');
          await tester.tap(_k('cancelWaitBtn'));
          final outcome = await _waitOutcome(
              tester, const Duration(seconds: 30));
          _log('outcome=$outcome');
          expect(outcome, 'timeout', reason: 'T5a 取消等待应落 timeout 失败');
          expect(tester.any(find.text('重新下发')), isTrue);

        case 'leave':
          // 填写态：部分输入 → 返回 → 继续填写
          await tester.pump(const Duration(milliseconds: 200));
          await tester.tap(_backBtn());
          expect(
              await _pumpUntil(tester,
                  find.textContaining('已填写的配网信息与配对令牌将全部清空'),
                  timeout: const Duration(seconds: 5)),
              isTrue,
              reason: 'U-01 填写态离开确认未弹出');
          await tester.tap(find.text('继续填写'));
          await tester.pump(const Duration(seconds: 1));
          expect(tester.any(_k('ssidField')), isTrue, reason: '应仍在填写页');
          _log('U-01 填写态弹窗 ✓（继续填写保留现场）');
          // 下发等待态：提交 → 返回 → 继续配置
          // （60s 状态超时上限；V1 简化固件无配对环节，覆盖写入+设备处理耗时）
          await _submit(tester);
          expect(
              await _pumpUntil(tester, _k('cancelWaitBtn'),
                  timeout: const Duration(seconds: 60)),
              isTrue);
          await tester.tap(_backBtn());
          expect(
            await _pumpUntil(tester,
                find.textContaining('离开将取消本次配置等待'),
                  timeout: const Duration(seconds: 5)),
              isTrue,
              reason: 'U-01 等待态离开确认未弹出');
          await tester.tap(find.text('继续配置'));
          await tester.pump(const Duration(seconds: 1));
          expect(
              tester.any(_k('cancelWaitBtn')) ||
                  tester.any(find.text('配置成功 · 设备 READY')),
              isTrue,
              reason: '应仍在等待/结果态');
          _log('U-01 等待态弹窗 ✓（继续配置保留等待）');

        case 'lost_configure':
          // 配置页稳定后由 PC 侧联动 esptool run 注入断连：
          // 守护进程监视 logcat 的 LOST_ARMED 标记后复位芯片
          _log('LOST_ARMED —— PC 侧请立即 esptool run 注入断连');
          expect(
              await _pumpUntil(tester, find.textContaining('设备连接已断开'),
                  timeout: const Duration(seconds: 90)),
              isTrue,
              reason: 'T5b 注入断连后未出现断开横幅');
          expect(tester.any(find.text('重新连接')), isTrue);
          _log('T5b 完成：断开横幅 + 重新连接入口');

        default:
          fail('未知场景 P002_SCENARIO=$_scenario');
      }
      _log('scenario=$_scenario 全部断言通过');
    },
    timeout: const Timeout(Duration(minutes: 12)),
  );
}
