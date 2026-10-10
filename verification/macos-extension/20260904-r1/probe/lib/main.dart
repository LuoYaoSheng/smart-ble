// smart_ble_macos_probe — headless Flutter macOS BLE capability probe.
//
// Modes (first CLI argument, desktop builds forward argv to main):
//   env       report flutter_blue_plus adapter state + plugin support flags
//   scan      scan for --duration seconds (default 12): dedup by remoteId,
//             RSSI updates counted, optional --expect-uuid flag, manual stop
//   scan5     start a scan with a 5 second in-plugin timeout to verify the
//             plugin's auto-stop, then confirm isScanningNow went false
//   advertise advertise via flutter_ble_peripheral as --name (default
//             SmartBLE-Flutter) with service --uuid for --duration seconds
//   connect   scan filtered by --uuid, connect, discover services and
//             characteristics, read once, subscribe notify, write once,
//             disconnect (fails with a documented reason if the target is
//             not discoverable, e.g. same-machine advertiser)
//
// Structured output: [FLPROBE] key=value ... ; exit code 0 on PASS, 1 on FAIL.

import 'dart:async';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:flutter_ble_peripheral/flutter_ble_peripheral.dart';

void plog(String line) {
  final ts = DateTime.now().millisecondsSinceEpoch / 1000.0;
  stdout.writeln('[FLPROBE] t=${ts.toStringAsFixed(3)} $line');
}

Never fail(String reason) {
  plog('RESULT=FAIL reason=$reason');
  exit(1);
}

Future<void> main(List<String> args) async {
  WidgetsFlutterBinding.ensureInitialized();
  FlutterBluePlus.setLogLevel(LogLevel.verbose);

  var mode = 'env';
  var duration = 12.0;
  var localName = 'SmartBLE-Flutter';
  var uuid = '0000FD6A-7263-4F1E-A1C2-8F5D3B2A1001';
  var expectUuid = '';
  var remoteId = '';

  for (var i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mode':
        mode = args[++i];
      case '--duration':
        duration = double.parse(args[++i]);
      case '--name':
        localName = args[++i];
      case '--uuid':
        uuid = args[++i];
      case '--expect-uuid':
        expectUuid = args[++i];
      case '--remote-id':
        remoteId = args[++i];
      default:
        fail('unknown argument ${args[i]}');
    }
  }
  plog('MODE=$mode DURATION=$duration NAME=$localName UUID=$uuid REMOTE_ID=$remoteId');

  // Give the engine a moment to register plugin channels, then run the mode.
  await Future<void>.delayed(const Duration(milliseconds: 500));

  switch (mode) {
    case 'env':
      await runEnv();
    case 'scan':
      await runScan(duration, expectUuid, manualStopAfter: duration - 2);
    case 'scan5':
      await runScan(5, expectUuid, autoStopExpected: true);
    case 'advertise':
      await runAdvertise(localName, uuid, duration);
    case 'connect':
      await runConnect(uuid, remoteId);
    default:
      fail('unknown mode $mode');
  }
}

Future<void> runEnv() async {
  final fbpSupported = await FlutterBluePlus.isSupported;
  plog('FBP_IS_SUPPORTED=$fbpSupported');
  final peripheral = FlutterBlePeripheral();
  final periphSupported = await peripheral.isSupported;
  plog('PERIPHERAL_IS_SUPPORTED=$periphSupported');

  plog('ADAPTER_STATE_INITIAL=${FlutterBluePlus.adapterStateNow.name}');
  var sawOn = false;
  final sub = FlutterBluePlus.adapterState.listen((s) {
    plog('ADAPTER_STATE=${s.name}');
    if (s == BluetoothAdapterState.on) sawOn = true;
  });
  await Future<void>.delayed(const Duration(seconds: 6));
  await sub.cancel();
  plog('RESULT=${sawOn ? 'PASS' : 'ADAPTER_NOT_ON'}');
  exit(sawOn ? 0 : 1);
}

Future<void> runScan(double duration, String expectUuid,
    {double? manualStopAfter, bool autoStopExpected = false}) async {
  // flutter_blue_plus 1.36.8 on macOS throws if startScan is invoked before
  // CBCentralManager reaches PoweredOn, so wait for the adapter first.
  if (FlutterBluePlus.adapterStateNow != BluetoothAdapterState.on) {
    plog('EVENT=waiting_adapter_on current=${FlutterBluePlus.adapterStateNow.name}');
    try {
      await FlutterBluePlus.adapterState
          .where((s) => s == BluetoothAdapterState.on)
          .first
          .timeout(const Duration(seconds: 8));
    } on TimeoutException {
      fail('adapter never reached on within 8s (state=${FlutterBluePlus.adapterStateNow.name})');
    }
    plog('EVENT=adapter_on');
  }

  final seen = <String, ({String name, int rssi, int updates})>{};
  var expectedSeen = false;

  final resultsSub = FlutterBluePlus.onScanResults.listen((results) {
    for (final r in results) {
      final id = r.device.remoteId.str;
      final name = r.advertisementData.advName;
      final prev = seen[id];
      final isNew = prev == null;
      seen[id] = (
        name: name.isEmpty ? (prev?.name ?? '') : name,
        rssi: r.rssi,
        updates: (prev?.updates ?? 0) + 1,
      );
      if (isNew) {
        plog('DISCOVERED=$id name=${name.isEmpty ? '(none)' : name.replaceAll(' ', '_')} rssi=${r.rssi}');
      }
      for (final s in r.advertisementData.serviceUuids) {
        if (s.str.toLowerCase() == expectUuid.toLowerCase()) expectedSeen = true;
      }
    }
  });

  final scanningSub = FlutterBluePlus.isScanning.listen((scanning) {
    plog('IS_SCANNING=$scanning');
  });

  await FlutterBluePlus.startScan(
    timeout: autoStopExpected ? const Duration(seconds: 5) : const Duration(seconds: 300),
  );

  if (autoStopExpected) {
    // startScan with a 5s timeout must auto-stop by itself.
    await Future<void>.delayed(const Duration(seconds: 9));
    final stillScanning = FlutterBluePlus.isScanningNow;
    plog('AUTO_STOP_CHECK still_scanning=$stillScanning');
    await resultsSub.cancel();
    await scanningSub.cancel();
    final totalUpdates = seen.values.fold(0, (a, b) => a + b.updates);
    plog('SCAN_SUMMARY unique_devices=${seen.length} total_updates=$totalUpdates expected_uuid_seen=$expectedSeen');
    plog('RESULT=${stillScanning ? 'FAIL' : 'PASS'}');
    exit(stillScanning ? 1 : 0);
  }

  final watch = Stopwatch()..start();
  while (watch.elapsedMilliseconds < (manualStopAfter ?? duration) * 1000) {
    await Future<void>.delayed(const Duration(milliseconds: 200));
  }
  await FlutterBluePlus.stopScan();
  plog('EVENT=manual_stop');
  await Future<void>.delayed(const Duration(milliseconds: 400));

  await resultsSub.cancel();
  await scanningSub.cancel();
  final totalUpdates = seen.values.fold(0, (a, b) => a + b.updates);
  plog('SCAN_SUMMARY unique_devices=${seen.length} total_updates=$totalUpdates expected_uuid_seen=$expectedSeen');
  for (final entry in seen.entries) {
    plog('DEVICE=${entry.key} name=${entry.value.name.isEmpty ? '(none)' : entry.value.name.replaceAll(' ', '_')} rssi=${entry.value.rssi} updates=${entry.value.updates}');
  }
  plog('RESULT=PASS');
  exit(0);
}

Future<void> runAdvertise(String localName, String uuid, double duration) async {
  final peripheral = FlutterBlePeripheral();
  final supported = await peripheral.isSupported;
  plog('PERIPHERAL_IS_SUPPORTED=$supported');

  StreamSubscription<PeripheralState>? stateSub;
  final stateStream = peripheral.onPeripheralStateChanged;
  if (stateStream != null) {
    stateSub = stateStream.listen((state) {
      plog('PERIPHERAL_STATE=${state.name}');
    });
  } else {
    plog('PERIPHERAL_STATE_STREAM=null');
  }

  final startState = await peripheral.start(
    advertiseData: AdvertiseData(
      serviceUuids: [uuid],
      localName: localName,
    ),
  );
  plog('EVENT=start_called name=$localName service=$uuid returned=${startState.name}');
  plog('IS_ADVERTISING=${await peripheral.isAdvertising}');

  await Future<void>.delayed(Duration(seconds: duration.toInt()));

  final stopState = await peripheral.stop();
  plog('EVENT=stop_called returned=${stopState.name}');
  await Future<void>.delayed(const Duration(milliseconds: 500));
  plog('IS_ADVERTISING_AFTER_STOP=${await peripheral.isAdvertising}');
  await stateSub?.cancel();
  // API-level success only; external visibility needs a second observer device.
  plog('RESULT=PASS_API_LEVEL');
  exit(0);
}

Future<void> runDirectConnect(String remoteIdArg) async {
  final d = BluetoothDevice.fromId(remoteIdArg);
  plog('EVENT=direct_connect_to id=${d.remoteId}');
  try {
    await d.connect().timeout(const Duration(seconds: 10));
  } on TimeoutException {
    fail('direct connect timed out after 10s');
  } catch (e) {
    fail('direct connect failed: $e');
  }
  plog('EVENT=connected id=${d.remoteId}');

  final stateSub = d.connectionState.listen((s) {
    plog('CONN_STATE=${s.name}');
  });

  await Future<void>.delayed(const Duration(seconds: 1));
  final services = await d.discoverServices();
  plog('GATT_DISCOVERY services=${services.length}');
  BluetoothCharacteristic? readChar;
  for (final svc in services) {
    final charNames = svc.characteristics.map((c) => c.uuid.str).join(',');
    plog('SERVICE=${svc.uuid.str} characteristics=[$charNames]');
    for (final c in svc.characteristics) {
      if (c.properties.read) {
        // prefer Generic Access device name 0x2A00 for a harmless read
        if (readChar == null || c.uuid.str.toUpperCase().endsWith('2A00')) {
          readChar = c;
        }
      }
    }
  }

  var didRead = false;
  if (readChar != null) {
    final chosen = readChar;
    final readSub = chosen.onValueReceived.listen((value) {
      didRead = true;
      plog('READ_CHAR=${chosen.uuid.str} value=${String.fromCharCodes(value)}');
    });
    try {
      await chosen.read().timeout(const Duration(seconds: 5));
      await Future<void>.delayed(const Duration(milliseconds: 800));
    } on TimeoutException {
      plog('EVENT=read_timeout');
    }
    await readSub.cancel();
  }

  await d.disconnect();
  plog('EVENT=disconnected');
  await stateSub.cancel();
  plog('DIRECT_GATT_SUMMARY services=${services.length} read=$didRead');
  plog('RESULT=${didRead ? 'PASS_READ_ONLY' : 'PARTIAL_CONNECT_ONLY'}');
  exit(0);
}

Future<void> runConnect(String uuid, String remoteIdArg) async {
  // Same PoweredOn guard as runScan (see note there).
  if (FlutterBluePlus.adapterStateNow != BluetoothAdapterState.on) {
    plog('EVENT=waiting_adapter_on current=${FlutterBluePlus.adapterStateNow.name}');
    try {
      await FlutterBluePlus.adapterState
          .where((s) => s == BluetoothAdapterState.on)
          .first
          .timeout(const Duration(seconds: 8));
    } on TimeoutException {
      fail('adapter never reached on within 8s (state=${FlutterBluePlus.adapterStateNow.name})');
    }
  }

  // Direct connect by remoteId: read-only GATT inspection (connect, discover,
  // read one characteristic, disconnect). Used only against fixtures the
  // operator explicitly passes; never writes or subscribes.
  if (remoteIdArg.isNotEmpty) {
    await runDirectConnect(remoteIdArg);
  }

  final target = Guid(uuid);
  BluetoothDevice? device;
  final completer = Completer<void>();

  final sub = FlutterBluePlus.onScanResults.listen((results) {
    for (final r in results) {
      final matches = r.advertisementData.serviceUuids.contains(target) ||
          r.device.remoteId.str.toLowerCase() == uuid.toLowerCase();
      if (matches && device == null) {
        device = r.device;
        plog('EVENT=target_discovered id=${r.device.remoteId} name=${r.advertisementData.advName}');
        if (!completer.isCompleted) completer.complete();
      }
    }
  });

  await FlutterBluePlus.startScan(
    withServices: [target],
    timeout: const Duration(seconds: 15),
  );

  try {
    await completer.future.timeout(const Duration(seconds: 16));
  } on TimeoutException {
    plog('EVENT=target_not_discovered');
  }
  await FlutterBluePlus.stopScan();
  await sub.cancel();

  final d = device;
  if (d == null) {
    fail('target not discovered within 15s (expected when the advertiser runs on this same Mac: the local controller does not echo its own LE advertisements)');
  }

  plog('EVENT=connect_to id=${d.remoteId}');
  await d.connect();

  final stateSub = d.connectionState.listen((s) {
    plog('CONN_STATE=${s.name}');
  });

  await Future<void>.delayed(const Duration(seconds: 2));
  final services = await d.discoverServices();
  for (final svc in services) {
    plog('SERVICE=${svc.uuid.str}');
    for (final c in svc.characteristics) {
      plog('CHAR=${c.uuid.str} props=${c.properties.toString()}');
    }
  }

  var didRead = false;
  var notified = 0;
  var didWrite = false;
  BluetoothCharacteristic? readChar;
  BluetoothCharacteristic? notifyChar;
  BluetoothCharacteristic? writeChar;
  for (final svc in services) {
    for (final c in svc.characteristics) {
      if (c.properties.read && readChar == null) readChar = c;
      if (c.properties.notify && notifyChar == null) notifyChar = c;
      if ((c.properties.write || c.properties.writeWithoutResponse) && writeChar == null) {
        writeChar = c;
      }
    }
  }

  StreamSubscription<List<int>>? readSub;
  StreamSubscription<List<int>>? notifySub;
  if (readChar != null) {
    readSub = readChar.onValueReceived.listen((value) {
      didRead = true;
      plog('READ=${value.map((b) => b.toRadixString(16).padLeft(2, '0')).join()}');
    });
    await readChar.read();
  }
  if (notifyChar != null) {
    notifySub = notifyChar.onValueReceived.listen((value) {
      notified++;
      plog('NOTIFY=#$notified value=${String.fromCharCodes(value)}');
    });
    await notifyChar.setNotifyValue(true);
  }
  await Future<void>.delayed(const Duration(seconds: 3));
  if (writeChar != null && !didWrite) {
    didWrite = true;
    await writeChar.write([0x70, 0x69, 0x6e, 0x67]); // "ping"
    plog('EVENT=write_sent');
  }
  await Future<void>.delayed(const Duration(seconds: 2));

  await d.disconnect();
  plog('EVENT=disconnected');
  await stateSub.cancel();
  await readSub?.cancel();
  await notifySub?.cancel();
  plog('GATT_SUMMARY services=${services.length} read=$didRead notify=$notified write=$didWrite');
  plog('RESULT=${didRead && notified >= 2 && didWrite ? 'PASS' : 'PARTIAL'}');
  exit(0);
}
