// tool/product_parity.dart —— 产品级跨语言向量执行器（Dart 线，MAC-008）。
//
// 输入：core/protocols/ble-product-v1-vectors.json（与 JS/Kotlin 消费同一文件，
// 由 scripts/check-product-parity.mjs dart 车道调用）。
// 覆盖：logRedaction（F026 锁定镜像）。otaTargets/otaSemVer 为 js/swift 交集，
// Dart 未声明（见向量文件 platforms）。
// 输出：stdout 单行 `@@PARITY@@ {json}`。
//
// 运行：cd apps/flutter && dart run tool/product_parity.dart ../../core/protocols/ble-product-v1-vectors.json

import 'dart:convert';
import 'dart:io';

import 'package:smart_ble/core/utils/log_redaction.dart';

void main(List<String> args) {
  if (args.isEmpty) {
    stderr.writeln('usage: dart run tool/product_parity.dart <vectors.json>');
    exit(2);
  }
  final vectors = jsonDecode(File(args[0]).readAsStringSync()) as Map<String, dynamic>;
  final suites = vectors['suites'] as Map<String, dynamic>;

  final results = <Map<String, dynamic>>[];
  var pass = 0;
  var fail = 0;

  void record(String suite, String id, bool ok, String detail) {
    results.add({'suite': suite, 'case': id, 'pass': ok, 'detail': ok ? '' : detail});
    if (ok) {
      pass += 1;
    } else {
      fail += 1;
    }
  }

  final logRedaction = suites['logRedaction'] as Map<String, dynamic>?;
  if (logRedaction != null) {
    for (final c in (logRedaction['cases'] as List).cast<Map<String, dynamic>>()) {
      final input = c['input'] as String;
      final expected = c['expect'] as String;
      final got = sanitizeLogString(input) ?? input;
      record('logRedaction', c['id'] as String, got == expected,
          got == expected ? '' : 'input=$input got=$got expect=$expected');
    }
  }

  stdout.writeln('@@PARITY@@ ${jsonEncode({'pass': pass, 'fail': fail, 'failures': results.where((r) => r['pass'] == false).toList()})}');
  exit(fail == 0 ? 0 : 1);
}
