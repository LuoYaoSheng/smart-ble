import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/utils/log_redaction.dart';
import 'package:smart_ble/core/utils/logger.dart';

/// F026 日志脱敏——uniapp `services/logger/log-redaction.js` 的 Dart 锁定镜像向量。
/// 与 apps/android `LogRedactionTest.kt` 同向量组（V1–V10）。
void main() {
  group('sanitizeLogString', () {
    test('V1 配网 candidate JSON：token/wifi_password 脱敏，ssid/host/端口保留', () {
      const input =
          '{"v":1,"wifi_ssid":"home5g","wifi_password":"p@ss1234","hub_host":"192.168.1.8","hub_port":1883,"token":"0123456789abcdef0123456789abcdef"}';
      final out = sanitizeLogString(input)!;
      expect(out,
          '{"v":1,"wifi_ssid":"home5g","wifi_password":"***","hub_host":"192.168.1.8","hub_port":1883,"token":"***"}');
    });

    test('V2 查询串 key=value', () {
      expect(sanitizeLogString('token=abc123&x=1'), 'token=***&x=1');
    });

    test('V3 Bearer 裸串', () {
      expect(sanitizeLogString('Bearer eyJhbGciOi.abc-123'), 'Bearer ***');
    });

    test('V4 authorization 头', () {
      // 正典（uniapp JS）多趟模式替换在此输入下会产出
      // 'authorization: Bearer *** ***'（P1 整段替换后 P3 再命中前缀段）——
      // 三线镜像行为一致，这里锁语义：密文不出现、Bearer 已脱敏。
      final out = sanitizeLogString('authorization: Bearer xyz789')!;
      expect(out, contains('Bearer ***'));
      expect(out, isNot(contains('xyz789')));
    });

    test('V5 保护键白名单不脱敏', () {
      const input =
          '{"deviceId":"10:B4:1D:CD:23:8D","serviceUuid":"4fafc201-1fb5","sha256":"a1b2c3"}';
      expect(sanitizeLogString(input), input);
    });

    test('V7 十六进制转储无键不脱敏', () {
      const input = '写入完成: 7B 22 74 79 70 65';
      expect(sanitizeLogString(input), input);
    });

    test('V8 非法 JSON 原样保留', () {
      const input = '{oops not json';
      expect(sanitizeLogString(input), input);
    });

    test('V9 JSON 形态键值字符串', () {
      expect(sanitizeLogString('resp "qr_token":"z9" end'), 'resp "qr_token":*** end');
    });

    test('V10 多键连续脱敏', () {
      expect(sanitizeLogString('api_key=ZZZ&password=q1'), 'api_key=***&password=***');
    });
  });

  group('sanitizeLogValue / 键归一化', () {
    test('V6 对象嵌套脱敏', () {
      final out = jsonEncode(sanitizeLogValue({
        'v': 1,
        'token': 't0',
        'nested': {'password': 'p0'},
      }));
      expect(out, '{"v":1,"token":"***","nested":{"password":"***"}}');
    });

    test('V11 键归一化：大小写与 -/_ 变体命中', () {
      final out = jsonEncode(sanitizeLogValue({
        'wifi-password': 'x',
        'API_KEY': 'y',
        'hubHost': 'h',
      }));
      expect(out, '{"wifi-password":"***","API_KEY":"***","hubHost":"h"}');
    });
  });

  group('Logger 漏斗（F026 任意日志输出路径）', () {
    test('V12 经 Logger 的条目先进脱敏再入历史', () {
      logger.clear();
      logger.info('提交配网 {"token":"abcdef"}');
      final message = logger.history.last.message;
      expect(message, contains('"token":***'));
      expect(message, isNot(contains('abcdef')));
    });
  });
}
