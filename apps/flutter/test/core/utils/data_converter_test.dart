import 'package:flutter_test/flutter_test.dart';
import 'package:smart_ble/core/utils/data_converter.dart';

void main() {
  group('DataConverter Tests', () {
    test('hexToBytes should convert valid hex correctly', () {
      expect(DataConverter.hexToBytes('01 02 0A FF'), [1, 2, 10, 255]);
      expect(DataConverter.hexToBytes('01020AFF'), [1, 2, 10, 255]);
      expect(DataConverter.hexToBytes('0x01 0XFF'), [1, 255]);
    });

    test('hexToBytes should throw on odd length', () {
      expect(() => DataConverter.hexToBytes('0FF'), throwsFormatException);
    });

    test('bytesToHex should format bytes correctly', () {
      expect(DataConverter.bytesToHex([1, 2, 10, 255]), '01 02 0A FF');
      expect(DataConverter.bytesToHex([1, 2, 10, 255], separator: false), '01020AFF');
      expect(DataConverter.bytesToHex([]), '');
    });

    test('stringToBytes should convert utf8 properly', () {
      expect(DataConverter.stringToBytes('Hello'), [72, 101, 108, 108, 111]);
      expect(DataConverter.stringToBytes('你好'), [228, 189, 160, 229, 165, 189]);
    });

    test('bytesToString should decode utf8 properly', () {
      expect(DataConverter.bytesToString([72, 101, 108, 108, 111]), 'Hello');
      expect(DataConverter.bytesToString([228, 189, 160, 229, 165, 189]), '你好');
    });

    test('bytesToString should fallback gracefully on malformed utf8', () {
      // 0xFF 0xFF is malformed utf-8
      final result = DataConverter.bytesToString([255, 255]);
      // In Dart utf8.decode(allowMalformed: true), it outputs Unicode replacement characters \uFFFD
      expect(result, '\uFFFD\uFFFD');
    });

    test('isValidHex should validate hex strictly', () {
      expect(DataConverter.isValidHex('01 0A FF'), true);
      expect(DataConverter.isValidHex('010AFF'), true);
      expect(DataConverter.isValidHex('01 0A F'), false); // odd
      expect(DataConverter.isValidHex('01 ZZ'), false); // invalid characters
      expect(DataConverter.isValidHex(''), false); // empty
    });
  });
}
