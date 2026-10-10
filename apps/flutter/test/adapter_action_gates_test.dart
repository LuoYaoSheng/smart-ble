import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_ble_peripheral/flutter_ble_peripheral.dart';
import 'package:flutter_blue_plus_platform_interface/flutter_blue_plus_platform_interface.dart';
import 'package:smart_ble/ui/design/app_button.dart';
import 'package:smart_ble/ui/pages/device_list_page.dart';
import 'package:smart_ble/ui/pages/broadcast_page.dart';

final class AdapterPlatform extends FlutterBluePlusPlatform {
  bool supported = false;
  BmAdapterStateEnum state = BmAdapterStateEnum.unavailable;
  final changes = StreamController<BmBluetoothAdapterState>.broadcast();
  @override
  Stream<BmBluetoothAdapterState> get onAdapterStateChanged => changes.stream;
  @override
  Future<bool> isSupported(BmIsSupportedRequest request) async => supported;
  @override
  Future<BmBluetoothAdapterState> getAdapterState(
      BmBluetoothAdapterStateRequest request) async {
    final response = BmBluetoothAdapterState(adapterState: state);
    changes.add(response);
    return response;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final platform = AdapterPlatform();
  const nativePeripheral =
      MethodChannel('dev.steenbakker.flutter_ble_peripheral/ble_state');
  const peripheralEvents =
      MethodChannel('dev.steenbakker.flutter_ble_peripheral/ble_state_changed');
  var peripheralSupported = false;
  var peripheralState = PeripheralState.unsupported;
  var starts = 0;
  setUpAll(() => FlutterBluePlusPlatform.instance = platform);
  setUp(() {
    platform.supported = false;
    platform.state = BmAdapterStateEnum.unavailable;
    peripheralSupported = false;
    peripheralState = PeripheralState.unsupported;
    starts = 0;
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(nativePeripheral, (call) async {
      switch (call.method) {
        case 'isSupported':
          return peripheralSupported;
        case 'isAdvertising':
          return false;
        case 'start':
          starts += 1;
          return 0;
        default:
          return null;
      }
    });
    messenger.setMockMethodCallHandler(peripheralEvents, (call) async {
      if (call.method == 'listen') {
        ServicesBinding.instance.channelBuffers.push(
            peripheralEvents.name,
            const StandardMethodCodec()
                .encodeSuccessEnvelope(peripheralState.index),
            (_) {});
      }
      return null;
    });
  });
  tearDownAll(() => platform.changes.close());

  Future<void> mount(WidgetTester tester, Widget page) async {
    await tester.binding.setSurfaceSize(const Size(900, 1600));
    await tester.pumpWidget(ProviderScope(overrides: [
      broadcastPlatformSupportedProvider.overrideWithValue(true),
    ], child: MaterialApp(home: page)));
    await tester.pumpAndSettle();
  }

  Future<void> unmount(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
    await tester.binding.setSurfaceSize(null);
  }

  for (final state in [
    BmAdapterStateEnum.unavailable,
    BmAdapterStateEnum.off,
    BmAdapterStateEnum.on
  ]) {
    testWidgets('both scan entries use native adapter gate: $state',
        (tester) async {
      final semantics = tester.ensureSemantics();
      platform.supported = state != BmAdapterStateEnum.unavailable;
      platform.state = state;
      await mount(tester, const DeviceListPage());
      final entries = find.byWidgetPredicate(
          (widget) => widget is AppButton && widget.label == '开始扫描');
      expect(entries, findsNWidgets(2));
      for (final entry in entries.evaluate()) {
        final button = entry.widget as AppButton;
        final enabled = state == BmAdapterStateEnum.on;
        expect(button.disabled, !enabled);
        final ink = tester.widget<InkWell>(find.descendant(
            of: find.byWidget(button), matching: find.byType(InkWell)));
        expect(ink.onTap != null, enabled);
        final data =
            tester.getSemantics(find.byWidget(button)).getSemanticsData();
        expect(data.flagsCollection.isButton, isTrue);
        expect(data.flagsCollection.isEnabled.toBoolOrNull(), enabled);
        expect(data.hasAction(SemanticsAction.tap), enabled);
      }
      await unmount(tester);
      semantics.dispose();
    });
  }

  for (final state in [
    PeripheralState.unsupported,
    PeripheralState.poweredOff,
    PeripheralState.unknown,
    PeripheralState.idle
  ]) {
    testWidgets('broadcast start requires native idle radio: $state',
        (tester) async {
      peripheralSupported = state != PeripheralState.unsupported;
      peripheralState = state;
      await mount(tester, const BroadcastPage());
      final start = find.ancestor(
          of: find.text('开始广播'),
          matching:
              find.byWidgetPredicate((widget) => widget is ElevatedButton));
      expect(start, findsOneWidget);
      final button = tester.widget<ElevatedButton>(start);
      expect(button.onPressed != null, state == PeripheralState.idle);
      expect(find.text('已就绪'),
          state == PeripheralState.idle ? findsOneWidget : findsNothing);
      expect(starts, 0);
      await unmount(tester);
    });
  }
}
