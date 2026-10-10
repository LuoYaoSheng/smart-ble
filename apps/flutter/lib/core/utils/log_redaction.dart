/// F026 日志脱敏（BUSINESS_FLOW §7 / STORAGE_POLICY S-3 / R28）。
///
/// uniapp `services/logger/log-redaction.js` 的 Dart 锁定镜像：
/// 敏感键（token/password/secret…）→ `***`，保护键白名单（deviceId/serviceUuid/sha256…）不脱敏。
/// 任意日志输出路径（Logger 漏斗、payload/异常旁路打印）都必须先过这里。
library;

import 'dart:convert';

const String redactPlaceholder = '***';

const List<String> _sensitiveKeyFragments = [
  'token',
  'password',
  'passwd',
  'secret',
  'apikey',
  'privatekey',
  'credential',
  'authorization',
  'cookie',
  'qrtoken',
];

const List<String> _protectedKeyFragments = [
  'deviceid',
  'serviceuuid',
  'characteristicuuid',
  'serviceid',
  'characteristicid',
  'firmwareversion',
  'sha256',
];

final List<RegExp> _stringSecretPatterns = [
  RegExp(r'\bauthorization\s*:\s*Bearer\s+[A-Za-z0-9._-]+', caseSensitive: false),
  RegExp(r'\bBearer\s+[A-Za-z0-9._-]+', caseSensitive: false),
  RegExp(r'''\b(access_token|refresh_token|qr_token|api_key|apikey|private_key|authorization|cookie)\s*[=:]\s*[^\s,&}"']+''', caseSensitive: false),
  RegExp(r'''\b(token|password|passwd|secret|credential|pw)\s*[=:]\s*[^\s,&}"']+''', caseSensitive: false),
  RegExp(r'"(access_token|refresh_token|qr_token|api_key|apikey|private_key|authorization|cookie)"\s*:\s*"[^"]*"', caseSensitive: false),
  RegExp(r'"(token|password|passwd|secret|credential)"\s*:\s*"[^"]*"', caseSensitive: false),
];

String _normalizeKey(Object? key) {
  return (key?.toString() ?? '').toLowerCase().replaceAll(RegExp('[-_]'), '');
}

bool _isProtectedKey(Object? key) {
  final normalized = _normalizeKey(key);
  if (normalized.isEmpty) return false;
  if (_protectedKeyFragments.contains(normalized)) return true;
  if (normalized.endsWith('uuid') &&
      (normalized.contains('service') || normalized.contains('characteristic'))) {
    return true;
  }
  return false;
}

bool isSensitiveKey(Object? key) {
  if (_isProtectedKey(key)) return false;
  final normalized = _normalizeKey(key);
  if (normalized.isEmpty) return false;
  return _sensitiveKeyFragments.any(normalized.contains);
}

dynamic sanitizeLogValue(dynamic value, [Set<int>? seen]) {
  if (value == null) return value;
  if (value is String) return sanitizeLogString(value);
  if (value is num || value is bool) return value;
  if (value is Error) {
    return <String, dynamic>{
      'name': value.runtimeType.toString(),
      'message': sanitizeLogString(value.toString()),
    };
  }
  if (value is List) {
    return value.map((item) => sanitizeLogValue(item, seen)).toList();
  }
  if (value is Map) {
    return _sanitizeMap(value, seen ?? <int>{});
  }
  return value;
}

Map<String, dynamic> sanitizeLogObject(Map? input, [Set<int>? seen]) {
  if (input == null) return <String, dynamic>{};
  return _sanitizeMap(input, seen ?? <int>{});
}

dynamic _sanitizeMap(Map input, Set<int> seen) {
  final marker = identityHashCode(input);
  if (seen.contains(marker)) return '[Circular]';
  seen.add(marker);

  final output = <String, dynamic>{};
  input.forEach((key, value) {
    if (isSensitiveKey(key)) {
      output['$key'] = redactPlaceholder;
    } else {
      output['$key'] = sanitizeLogValue(value, seen);
    }
  });
  return output;
}

String? sanitizeLogString(String? input) {
  if (input == null) return null;
  final text = input;
  if (text.isEmpty) return text;

  final trimmed = text.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      final parsed = jsonDecode(trimmed);
      return jsonEncode(sanitizeLogValue(parsed));
    } catch (_) {
      // fall through to pattern redaction
    }
  }

  var redacted = text;
  for (final pattern in _stringSecretPatterns) {
    redacted = redacted.replaceAllMapped(pattern, (match) {
      final matched = match.group(0)!;
      if (RegExp(r'^Bearer\s+', caseSensitive: false).hasMatch(matched)) {
        return 'Bearer $redactPlaceholder';
      }
      if (RegExp(r'^authorization\s*:\s*Bearer', caseSensitive: false).hasMatch(matched)) {
        return 'authorization: Bearer $redactPlaceholder';
      }
      final label = matched.split(RegExp(r'[=:]'))[0].trim();
      final sep = matched.contains(':') && !matched.contains('=') ? ':' : '=';
      return '$label$sep$redactPlaceholder';
    });
  }
  return redacted;
}
