import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/ui/pages/about_page.dart';
import 'package:smart_ble/ui/pages/privacy_page.dart';
import 'package:smart_ble/ui/widgets/permission_disclosure.dart';

void main() {
  testWidgets('about policy opens offline with support contact',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AboutPage()));
    await tester.pumpAndSettle();
    final policy = find.text('隐私说明（离线可读）');
    await tester.ensureVisible(policy);
    await tester.tap(policy);
    await tester.pumpAndSettle();
    expect(find.byType(PrivacyPage), findsOneWidget);
    final text = tester.widget<SelectableText>(find.byType(SelectableText));
    expect(text.data, contains(supportEmail));
    expect(text.data, contains('不保存为设备历史'));
    expect(text.data, contains('每安装标识'));
    expect(text.data, contains('仅 Flutter Android'));
    expect(text.data, contains('Apple Vision'));
    expect(text.data, contains('SDK 的诊断缓存'));
  });

  testWidgets('reading policy and rejecting does not authorize permissions',
      (tester) async {
    bool? approved;
    await tester.pumpWidget(MaterialApp(
        home: Builder(
            builder: (context) => TextButton(
                  onPressed: () async {
                    approved = await explainPermissionUse(context,
                        title: '权限用途', purpose: '蓝牙扫描');
                  },
                  child: const Text('申请'),
                ))));
    await tester.tap(find.text('申请'));
    await tester.pumpAndSettle();
    expect(approved, isNull);
    await tester.tap(find.text('查看完整隐私说明'));
    await tester.pumpAndSettle();
    expect(approved, isNull);
    Navigator.of(tester.element(find.byType(PrivacyPage))).pop();
    await tester.pumpAndSettle();
    await tester.tap(find.text('暂不授权'));
    await tester.pumpAndSettle();
    expect(approved, isFalse);
    expect(find.text('申请'), findsOneWidget);
  });

  testWidgets('only explicit continue approves the system request step',
      (tester) async {
    bool? approved;
    await tester.pumpWidget(MaterialApp(
        home: Builder(
            builder: (context) => TextButton(
                  onPressed: () async {
                    approved = await explainPermissionUse(context,
                        title: '权限用途', purpose: '蓝牙扫描');
                  },
                  child: const Text('申请'),
                ))));
    await tester.tap(find.text('申请'));
    await tester.pumpAndSettle();
    expect(approved, isNull);
    await tester.tap(find.text('继续申请系统权限'));
    await tester.pumpAndSettle();
    expect(approved, isTrue);
  });
  testWidgets(
      'camera grant cannot bypass SDK choice, rejection keeps paste available',
      (tester) async {
    final session = ScannerSdkConsentSession();
    var sdkStarts = 0;
    var pasteAvailable = false;
    await tester.pumpWidget(MaterialApp(
        home: Builder(
            builder: (context) => TextButton(
                  onPressed: () async {
                    // Simulates an existing OS camera grant: SDK choice is still required.
                    if (await requestAndroidScannerSdkConsent(context,
                        session: session)) {
                      sdkStarts++;
                    } else {
                      pasteAvailable = true;
                    }
                  },
                  child: const Text('相机已授权，扫码'),
                ))));
    await tester.tap(find.text('相机已授权，扫码'));
    await tester.pumpAndSettle();
    expect(find.text('Android 扫码 SDK 说明'), findsOneWidget);
    expect(sdkStarts, 0);
    await tester.tap(find.text('使用粘贴'));
    await tester.pumpAndSettle();
    expect(sdkStarts, 0);
    expect(pasteAvailable, isTrue);
    await tester.tap(find.text('相机已授权，扫码'));
    await tester.pumpAndSettle();
    expect(find.text('Android 扫码 SDK 说明'), findsOneWidget,
        reason: '拒绝不能被缓存为同意');
    await tester.tap(find.text('了解并继续扫码'));
    await tester.pumpAndSettle();
    expect(sdkStarts, 1);
    await tester.tap(find.text('相机已授权，扫码'));
    await tester.pumpAndSettle();
    expect(sdkStarts, 2);
    expect(find.text('Android 扫码 SDK 说明'), findsNothing);
  });

  test('SDK consent is not shared with a fresh app session', () async {
    final first = ScannerSdkConsentSession();
    await first.confirm(() async => true);
    var asked = false;
    final next = ScannerSdkConsentSession();
    expect(
        await next.confirm(() async {
          asked = true;
          return false;
        }),
        isFalse);
    expect(asked, isTrue);
  });
}
