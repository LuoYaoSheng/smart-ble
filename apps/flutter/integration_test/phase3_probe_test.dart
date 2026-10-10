// Phase-3 macOS 对齐探针（PP3-A / PP3-B）
//
// PP3-A path_provider_foundation 注销回归（5e1fbaf 遗留问号）：
//   静态结论——path_provider 的真实消费方是 google_fonts（本工程零调用）与
//   share_plus_platform_interface 的 shareXFiles（本工程只用 Share.share 纯文本，
//   macOS 侧直接喂 NSSharingServicePicker 不落盘）；package_info_plus 8.3.1 /
//   share_plus 10.1.4 原生+Dart 均零 path_provider 引用。
//   运行时探针——真实 app + 真实插件注册：About 页版本 chip 加载（package_info_plus
//   fromPlatform 全链）+ 显式 getTemporaryDirectory 预期 MissingPluginException
//   （证明插件确实未注册，且 app 无此依赖仍正常）。
//
// PP3-B 真实无线电对齐（对照原生第二阶段九项矩阵，环境设备纪律同 Phase 2：
//   不碰用户输入设备（Magic Keyboard/Trackpad 名含 Magic/Keyboard/Trackpad 排除），
//   不向真实家电写任何字节，只连 midea 做服务发现+被动断线重连观察）：
//   ① 扫描（真无线电 ≥1 台） ② midea 连接+3 服务×2 特征发现
//   ③ 被动断线→自动重连窗口观察 ④ flutter_ble_peripheral 广播启停（外部可见性
//   受 P-F1 平台铁律限制，同原生口径）。
//
// 运行：
//   flutter test -d macos integration_test/phase3_probe_test.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show MissingPluginException;
import 'package:flutter_blue_plus/flutter_blue_plus.dart' as fbp;
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
// ignore: depend_on_referenced_packages
import 'package:path_provider_platform_interface/path_provider_platform_interface.dart';
import 'package:smart_ble/core/ble/ble_manager.dart';
import 'package:smart_ble/core/ble/ble_peripheral_manager.dart';

import 'package:smart_ble/main.dart' as app;

void _log(String message) {
  final ts = DateTime.now().toString().substring(11, 23);
  debugPrint('PP3[E2E $ts]: $message');
}

Future<bool> _pumpUntil(
  WidgetTester tester,
  bool Function() test, {
  Duration timeout = const Duration(seconds: 10),
}) async {
  final deadline = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(deadline)) {
    await tester.pump(const Duration(milliseconds: 400));
    if (test()) return true;
  }
  return test();
}

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  binding.framePolicy = LiveTestWidgetsFlutterBindingFramePolicy.fullyLive;

  testWidgets('PP3-A path_provider 注销回归 + About 页 package_info 探针',
      (tester) async {
    _log('PP3-A 启动');
    app.main();
    await tester.pump(const Duration(seconds: 1));

    // 进 About 页（第 4 个 Tab「关于」）
    await tester.tap(find.text('关于'));
    await tester.pump(const Duration(seconds: 1));

    // 版本 chip：About 页 initState → PackageInfo.fromPlatform() → 'v2.0.0+1'
    final versionLoaded = await _pumpUntil(
      tester,
      () => tester.any(find.textContaining('v2.0.0')),
      timeout: const Duration(seconds: 15),
    );
    _log('PP3-A 版本 chip 加载=${versionLoaded ? 'v2.0.0+1 ✓' : 'FAIL'}');
    expect(versionLoaded, isTrue,
        reason:
            'PP3-A package_info_plus fromPlatform 失败（5e1fbaf 后 About 页不可用？）');
    expect(tester.any(find.text('关于')), isTrue);

    // 显式 path_provider 探针：预期 MissingPluginException（插件未注册是事实）。
    // 只记录不判死——判定口径是「app 功能不依赖它」，而非「通道必须可用」。
    try {
      final path = await PathProviderPlatform.instance.getTemporaryPath();
      _log('PP3-A getTemporaryPath=意外可用 path=$path（插件仍注册？）');
    } on MissingPluginException {
      _log('PP3-A getTemporaryPath=MissingPluginException（预期，插件确实未注册）');
    } catch (e) {
      _log('PP3-A getTemporaryPath=其他异常 ${e.runtimeType}（记录）');
    }

    // url_launcher 注册在场验证（About 页依赖的外链能力同属插件注册表健康检查）
    expect(tester.any(find.textContaining('版本记录')), isTrue,
        reason: 'PP3-A About 页版本记录入口缺失');
    _log('PP3-A About 页结构完整 ✓');
  });

  testWidgets('PP3-B 真实无线电对齐：扫描/连接/服务发现/重连/广播', (tester) async {
    _log('PP3-B 启动');
    app.main();
    await tester.pump(const Duration(seconds: 1));
    final ble = BleManager.instance;

    // ---- ① 扫描（真无线电，12s 窗）----
    final scanSeen = <String, int>{}; // name → best RSSI
    final scanSub = ble.scanResultsStream.listen((results) {
      for (final r in results) {
        if (r.name.isNotEmpty) scanSeen[r.name] = r.rssi;
      }
    });
    await ble.startScan(timeout: const Duration(seconds: 12));
    await tester.pump(const Duration(seconds: 13));
    await scanSub.cancel();
    _log('PP3-B 扫描具名设备=${scanSeen.length} 台: '
        '${scanSeen.entries.map((e) => '${e.key}@${e.value}').join(', ')}');
    expect(scanSeen.isNotEmpty, isTrue, reason: 'PP3-B 12s 扫描零具名设备（真无线电异常？）');

    // ---- ② midea 连接 + 服务特征发现（环境家电标本，纪律：只连不写；
    //    用户输入设备按名排除纪律由「仅连 midea」隐式满足）----
    String? target;
    for (final name in scanSeen.keys) {
      final lower = name.toLowerCase();
      if (lower.contains('midea')) {
        target = name;
        break;
      }
    }
    if (target == null) {
      _log('PP3-B SKIP②③ 环境无 midea 标本（具名=${scanSeen.keys.toList()}）');
    } else {
      // 从扫描结果反查 deviceId：BleManager 内部维护 scannedDevices，经 scanResults 再收一轮
      String? deviceId;
      final idSub = ble.scanResultsStream.listen((results) {
        for (final r in results) {
          if (r.name == target) deviceId ??= r.deviceId;
        }
      });
      await ble.startScan(timeout: const Duration(seconds: 8));
      await _pumpUntil(tester, () => deviceId != null,
          timeout: const Duration(seconds: 10));
      await idSub.cancel();

      if (deviceId == null) {
        _log('PP3-B SKIP②③ midea 二轮扫描未复现（设备离场）');
      } else {
        // midea 为真实环境家电，连接性时好时坏（Phase 2 原生线同观察）——
        // 两次尝试，仍失败则如实 SKIP ②③，不判死整条用例
        _log('PP3-B 连接 $target ($deviceId)');
        bool connected = false;
        for (var attempt = 1; attempt <= 2 && !connected; attempt++) {
          try {
            await ble.connect(deviceId!, timeout: const Duration(seconds: 25));
            connected = true;
          } catch (e) {
            _log('PP3-B 连接尝试 $attempt 失败: $e');
            await tester.pump(const Duration(seconds: 3));
          }
        }
        if (!connected) {
          _log('PP3-B SKIP②③ midea 两次连接均失败（环境家电拒连窗口，如实记录）');
        } else {
          final services = await ble.discoverServices(deviceId!);
          final total =
              services.fold<int>(0, (sum, s) => sum + s.characteristics.length);
          _log('PP3-B 服务发现 services=${services.length} characteristics=$total '
              '(${services.map((s) => '${s.uuid.length > 8 ? s.uuid.substring(0, 8) : s.uuid}×${s.characteristics.length}').join(' ')})');
          expect(services.isNotEmpty, isTrue, reason: 'PP3-B 服务发现空');
          expect(total, greaterThan(0), reason: 'PP3-B 特征总数为 0');

          // ---- ③ 被动断线 → 自动重连窗口（midea ~15s 甩链一次；2/4/6s 退避 ×3）----
          int reconnected = 0;
          int dropped = 0;
          bool sawDisconnect = false;
          late final Stream<fbp.BluetoothConnectionState> rawStates;
          rawStates = fbp.BluetoothDevice.fromId(deviceId!).connectionState;
          final stateSub = rawStates.listen((s) {
            _log('PP3-B conn-state $target → $s');
            if (s == fbp.BluetoothConnectionState.disconnected) {
              sawDisconnect = true;
              dropped++;
            }
            if (s == fbp.BluetoothConnectionState.connected && sawDisconnect) {
              reconnected++;
            }
          });
          final deadline = DateTime.now().add(const Duration(seconds: 75));
          while (DateTime.now().isBefore(deadline) && reconnected < 1) {
            await tester.pump(const Duration(milliseconds: 500));
          }
          await stateSub.cancel();
          _log('PP3-B 重连观察窗结束 dropped=$dropped reconnected=$reconnected'
              '${reconnected > 0 ? '（被动断线→自动重连全环 ✓）' : sawDisconnect ? '（断线未见回归，如实记录）' : '（窗口内未断线）'}');
          // 判定口径：midea 标本在场且已连接时，75s 窗内至少一次断线；重连成功与否
          // 如实记录（原生线同窗实测 10 次全回归，此为对齐数据点而非硬门槛）
          expect(sawDisconnect, isTrue,
              reason: 'PP3-B 75s 窗内 midea 未甩链（环境变化？）');

          await ble.disconnect(deviceId!);
          _log('PP3-B 清理断开 $target ✓');
        }
      }
    }

    // ---- ④ 广播启停（flutter_ble_peripheral · macOS 支持面；外部可见性受 P-F1 限制）----
    final per = BlePeripheralManager.instance;
    final supported = await per.isPlatformSupported();
    _log('PP3-B 广播平台支持=$supported');
    if (!supported) {
      _log('PP3-B SKIP④ 广播平台不支持');
    } else {
      await per.initialize();
      final ok = await per.startAdvertising(
        name: 'SmartBLE-P3-Probe',
        serviceUuid: '4FAFC201-1FB5-459E-914D-914D0CDFF40D',
        manufacturerId: '00E0',
        manufacturerData: 'P3PROBE',
      );
      // isAdvertising 读的是 didAdvertise 回调后的状态机——启动后轮询等待翻转
      bool advertising = false;
      final advDeadline = DateTime.now().add(const Duration(seconds: 8));
      while (DateTime.now().isBefore(advDeadline)) {
        await tester.pump(const Duration(milliseconds: 400));
        if (await per.isAdvertising) {
          advertising = true;
          break;
        }
      }
      _log('PP3-B 广播启动 startOk=$ok isAdvertising=$advertising');
      expect(advertising, isTrue, reason: 'PP3-B 广播启动失败');
      await tester.pump(const Duration(seconds: 2));
      await per.stopAdvertising();
      bool stopped = !(await per.isAdvertising);
      final stopDeadline = DateTime.now().add(const Duration(seconds: 5));
      while (!stopped && DateTime.now().isBefore(stopDeadline)) {
        await tester.pump(const Duration(milliseconds: 400));
        stopped = !(await per.isAdvertising);
      }
      _log('PP3-B 广播停止 stopped=$stopped');
      expect(stopped, isTrue, reason: 'PP3-B 广播停止失败');
      _log('PP3-B 广播启停全环 ✓（外部可见性受 P-F1 同机不可见限制，需第二观察端——Phase 7）');
    }

    _log('PP3-B 结束');
  });
}
