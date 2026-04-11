import 'dart:convert';

/// 数据格式
enum DataFormat {
  utf8,
  hex,
  base64,
}

/// 数据转换中心
class DataConverter {
  /// Hex 字符串转字节数组
  static List<int> hexToBytes(String hex) {
    final cleanHex = hex.replaceAll(RegExp(r'[^0-9A-Fa-f]'), '');
    if (cleanHex.length % 2 != 0) {
      throw const FormatException('Hex 字符串长度必须为偶数');
    }
    
    final bytes = <int>[];
    for (int i = 0; i < cleanHex.length; i += 2) {
      final byteString = cleanHex.substring(i, i + 2);
      bytes.add(int.parse(byteString, radix: 16));
    }
    return bytes;
  }

  /// 字节数组转 Hex 字符串
  static String bytesToHex(List<int> bytes, {bool separator = true}) {
    final hexString = bytes
        .map((b) => b.toRadixString(16).padLeft(2, '0').toUpperCase())
        .join(separator ? ' ' : '');
    return hexString;
  }

  /// 字符串转字节数组 (UTF-8)
  static List<int> stringToBytes(String str) {
    return utf8.encode(str);
  }

  /// 字节数组转字符串 (UTF-8)
  static String bytesToString(List<int> bytes) {
    try {
      return utf8.decode(bytes, allowMalformed: true);
    } catch (e) {
      // Fallback for non-utf8 data
      return bytes.map((b) => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.').join();
    }
  }

  /// 判断是否为合法的 Hex 字符串
  static bool isValidHex(String hex) {
    final cleanHex = hex.replaceAll(RegExp(r'\s+'), '');
    if (cleanHex.isEmpty || cleanHex.length % 2 != 0) return false;
    return RegExp(r'^[0-9A-Fa-f]+$').hasMatch(cleanHex);
  }
}
