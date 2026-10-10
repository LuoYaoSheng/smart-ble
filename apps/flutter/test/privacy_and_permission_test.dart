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
}
