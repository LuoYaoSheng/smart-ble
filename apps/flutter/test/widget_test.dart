import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/main.dart';

void main() {
  testWidgets('main tabs render', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: SmartBLEApp(),
      ),
    );

    expect(find.text('扫描'), findsOneWidget);
    expect(find.text('广播'), findsOneWidget);
    expect(find.text('关于'), findsOneWidget);
  });
}
