import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_blue_plus_platform_interface/flutter_blue_plus_platform_interface.dart';
import 'package:smart_ble/core/ble/ble_manager.dart';

final class ProbePlatform extends FlutterBluePlusPlatform {
  bool supported = false;
  BmAdapterStateEnum state = BmAdapterStateEnum.unavailable;
  Completer<bool>? pendingSupport;
  Completer<BmBluetoothAdapterState>? pendingState;
  final changes = StreamController<BmBluetoothAdapterState>.broadcast();
  int stateQueries = 0;

  @override
  Stream<BmBluetoothAdapterState> get onAdapterStateChanged => changes.stream;

  @override
  Future<bool> isSupported(BmIsSupportedRequest request) async =>
      pendingSupport == null ? supported : await pendingSupport!.future;

  @override
  Future<BmBluetoothAdapterState> getAdapterState(
      BmBluetoothAdapterStateRequest request) async {
    stateQueries += 1;
    return pendingState == null
        ? BmBluetoothAdapterState(adapterState: state)
        : await pendingState!.future;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final platform = ProbePlatform();
  final manager = BleManager();

  setUpAll(() => FlutterBluePlusPlatform.instance = platform);
  setUp(() {
    platform.supported = false;
    platform.state = BmAdapterStateEnum.unavailable;
    platform.pendingSupport = null;
    platform.pendingState = null;
  });
  tearDown(() => manager.dispose());
  tearDownAll(() => platform.changes.close());

  test('absent adapter finishes unavailable, including late state subscribers',
      () async {
    expect(await manager.initialize(), isFalse);
    expect(await manager.stateStream.first, BleState.unavailable);
  });

  test('no adapter retry queries again and recovers from off to on', () async {
    expect(await manager.initialize(), isFalse);
    platform.supported = true;
    platform.state = BmAdapterStateEnum.off;
    expect(await manager.initialize(), isTrue);
    expect(await manager.stateStream.first, BleState.off);
    final previous = platform.stateQueries;
    platform.state = BmAdapterStateEnum.on;
    expect(await manager.initialize(), isTrue);
    expect(platform.stateQueries, greaterThan(previous));
    expect(await manager.stateStream.first, BleState.on);
  });

  test('native support silence reaches unavailable after bounded time',
      () async {
    platform.pendingSupport = Completer<bool>();
    final pending = manager.initialize();
    expect(await pending, isFalse);
    final state = manager.stateStream.first;
    expect(await state, BleState.unavailable);
    platform.pendingSupport!.complete(false);
  });

  test('unknown state silence is bounded and retry succeeds', () async {
    platform.supported = true;
    platform.state = BmAdapterStateEnum.unknown;
    final pending = manager.initialize();
    expect(await pending, isFalse);
    final unavailable = manager.stateStream.first;
    expect(await unavailable, BleState.unavailable);
    platform.state = BmAdapterStateEnum.on;
    final recovered = manager.initialize();
    expect(await recovered, isTrue);
    final ready = manager.stateStream.first;
    expect(await ready, BleState.on);
  });

  test('state query silence is bounded; concurrent init shares one probe',
      () async {
    platform.supported = true;
    platform.pendingState = Completer<BmBluetoothAdapterState>();
    final pending = manager.initialize();
    final second = manager.initialize();
    expect(identical(pending, second), isTrue);
    expect(await pending, isFalse);
    final unavailable = manager.stateStream.first;
    expect(await unavailable, BleState.unavailable);
    platform.pendingState!
        .complete(BmBluetoothAdapterState(adapterState: BmAdapterStateEnum.on));
    expect(await manager.stateStream.first, BleState.unavailable,
        reason:
            'late native response cannot turn a failed attempt into success');
  });
}
