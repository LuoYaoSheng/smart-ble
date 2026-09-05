import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/ble/profile_registry.dart';
import '../../core/models/ble_scan_result.dart';
import '../../core/utils/data_converter.dart';
import '../../themes/app_theme.dart';

/// 广播数据弹窗（对齐原型 p001-advdlg · F004/R04 口径）
///
/// Android 平台 API 不提供原始广播帧字节，AD 结构逐段由平台解析字段
/// （advName / serviceUuids / manufacturerData / serviceData / txPower）
/// 重建，缺失字段逐项标注「本轮平台 API 未提供此字段」。
class AdvertisementSheet extends StatelessWidget {
  final BleScanResult device;

  const AdvertisementSheet({super.key, required this.device});

  bool get _hasAdvertisement =>
      (device.advName.isNotEmpty || device.name.isNotEmpty) ||
      device.serviceUuids.isNotEmpty ||
      device.manufacturerData != null ||
      device.serviceData.isNotEmpty ||
      device.txPowerLevel != null;

  /// 由平台解析字段重建的 AD 结构段
  List<({String type, String name, List<int> frame, String hex})>
      get _segments {
    final out = <({String type, String name, List<int> frame, String hex})>[];
    void add(String type, String name, List<int> payload) {
      final frame = [payload.length + 1, _typeByte(type), ...payload];
      out.add((
        type: type,
        name: name,
        frame: frame,
        hex: DataConverter.bytesToHex(frame),
      ));
    }

    final name = device.advName.isNotEmpty ? device.advName : device.name;
    if (name.isNotEmpty) {
      add('0x09', '完整本地名称', name.codeUnits);
    }

    final shorts = <int>[];
    final fulls = <String>[];
    for (final raw in device.serviceUuids) {
      final v = raw.trim().toLowerCase().replaceAll('-', '');
      if (v.length == 4) {
        shorts.add(int.parse(v, radix: 16));
      } else if (v.length == 32) {
        fulls.add(v);
      }
    }
    if (shorts.isNotEmpty) {
      // 16 位 UUID 列表按小端序拼负载
      final payload = <int>[];
      for (final id in shorts) {
        payload.add(id & 0xFF);
        payload.add((id >> 8) & 0xFF);
      }
      add('0x03', '16 位 Service UUID 列表', payload);
    }
    if (fulls.isNotEmpty) {
      // 128 位 UUID 列表每 UUID 按小端字节序
      final payload = <int>[];
      for (final v in fulls) {
        for (var i = v.length; i > 0; i -= 2) {
          payload.add(int.parse(v.substring(i - 2, i), radix: 16));
        }
      }
      add('0x07', '128 位 Service UUID 列表', payload);
    }

    final mfr = device.manufacturerData;
    if (mfr != null && device.manufacturerId != null) {
      add('0xFF', '厂商数据', [
        device.manufacturerId! & 0xFF,
        (device.manufacturerId! >> 8) & 0xFF,
        ...mfr,
      ]);
    }

    for (final entry in device.serviceData.entries) {
      final v = entry.key.trim().toLowerCase().replaceAll('-', '');
      if (v.length != 4) continue;
      final id = int.parse(v, radix: 16);
      add('0x16', 'Service Data',
          [id & 0xFF, (id >> 8) & 0xFF, ...entry.value]);
    }

    final tx = device.txPowerLevel;
    if (tx != null) {
      add('0x0A', '发射功率', [tx & 0xFF]);
    }
    return out;
  }

  int _typeByte(String type) => int.parse(type.substring(2), radix: 16);

  @override
  Widget build(BuildContext context) {
    final segments = _segments;
    final totalBytes = segments.fold<int>(0, (sum, s) => sum + s.frame.length);
    final match = matchProfile(device);

    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _grabHandle(),
          const SizedBox(height: 10),
          Text(
            '广播数据 · ${device.name.isNotEmpty ? device.name : device.deviceId.substring(device.deviceId.length - 6)}',
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          _kv('设备 ID', device.deviceId, mono: true),
          _kv('名称', device.name.isNotEmpty ? device.name : '（未命名）'),
          _kv('RSSI', '${device.rssi} dBm', mono: true),
          _kv(
              'profileMatch',
              match != null
                  ? '${match.level.name.toUpperCase()} · ${match.profile.id}'
                  : '—',
              mono: true),

          // Service UUIDs
          _sectionHeader(
              'Service UUIDs',
              device.serviceUuids.isNotEmpty
                  ? '${device.serviceUuids.length} 项'
                  : '—'),
          if (device.serviceUuids.isNotEmpty)
            ...device.serviceUuids.map((u) => _hexBlock(u))
          else
            const _MissNote(),

          if (_hasAdvertisement) ...[
            // AD 结构逐段（平台解析字段重建）
            _sectionHeader('AD 结构 · 逐段（平台解析字段重建）', '$totalBytes B'),
            if (segments.isNotEmpty)
              ...segments.map((s) => Padding(
                    padding: const EdgeInsets.only(top: 5),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _sectionHeader(
                            '${s.type} · ${s.name}', '${s.frame.length} B',
                            dense: true),
                        _hexBlock(s.hex),
                      ],
                    ),
                  ))
            else
              const _MissNote(),

            // Manufacturer Data
            const SizedBox(height: 4),
            if (device.manufacturerId != null)
              _kv('厂商 ID（Manufacturer Data）',
                  '0x${device.manufacturerId!.toRadixString(16).padLeft(4, '0').toUpperCase()}',
                  mono: true)
            else ...[
              _sectionHeader('Manufacturer Data', '—'),
              const _MissNote(),
            ],

            // Service Data
            _sectionHeader(
              'Service Data',
              device.serviceData.isNotEmpty
                  ? '${device.serviceData.keys.first.toUpperCase()} · ${device.serviceData.values.first.length} B'
                  : '—',
            ),
            if (device.serviceData.isNotEmpty)
              _hexBlock(
                  DataConverter.bytesToHex(device.serviceData.values.first))
            else
              const _MissNote(),
          ] else
            Container(
              margin: const EdgeInsets.only(top: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                '本轮平台 API 未提供此字段（advertisement 不存在）',
                style: TextStyle(fontSize: 12, color: Color(0xFF2E5290)),
              ),
            ),

          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _SheetButton(
                  label: '复制数据',
                  primary: true,
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: _copyText()));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('已复制'),
                        duration: Duration(milliseconds: 800),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: _SheetButton(
                  label: '关闭',
                  primary: false,
                  onTap: () => Navigator.of(context).pop(),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _copyText() {
    final match = matchProfile(device);
    final buf = StringBuffer()
      ..writeln('设备 ID: ${device.deviceId}')
      ..writeln('名称: ${device.name.isNotEmpty ? device.name : '（未命名）'}')
      ..writeln('RSSI: ${device.rssi} dBm')
      ..writeln(
          'profileMatch: ${match != null ? '${match.level.name.toUpperCase()} · ${match.profile.id}' : '—'}');
    if (device.serviceUuids.isNotEmpty) {
      buf.writeln('Service UUIDs:');
      device.serviceUuids.forEach(buf.writeln);
    }
    final segs = _segments;
    if (segs.isNotEmpty) {
      buf.writeln('AD 结构（平台解析字段重建）:');
      for (final s in segs) {
        buf.writeln('${s.type} · ${s.name} (${s.frame.length} B): ${s.hex}');
      }
    }
    if (device.manufacturerId != null) {
      buf.writeln(
          '厂商 ID: 0x${device.manufacturerId!.toRadixString(16).padLeft(4, '0').toUpperCase()}');
    }
    if (device.serviceData.isNotEmpty) {
      device.serviceData.forEach((uuid, bytes) {
        buf.writeln('Service Data $uuid: ${DataConverter.bytesToHex(bytes)}');
      });
    }
    return buf.toString();
  }

  Widget _grabHandle() => Center(
        child: Container(
          width: 36,
          height: 4,
          decoration: BoxDecoration(
            color: const Color(0xFFE3EAF3),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      );

  Widget _kv(String key, String value, {bool mono = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(key,
                style: const TextStyle(fontSize: 12, color: Color(0xFF60758D))),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontFamily: mono ? 'monospace' : null,
                color: const Color(0xFF18222E),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title, String right, {bool dense = false}) {
    return Padding(
      padding: EdgeInsets.only(top: dense ? 4 : 10, bottom: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF42536A)),
            ),
          ),
          Text(right,
              style: const TextStyle(fontSize: 12, color: Color(0xFF60758D))),
        ],
      ),
    );
  }

  Widget _hexBlock(String hex) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5FB),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          hex,
          style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
        ),
      );
}

/// 缺失字段标注（对齐原型 .miss 口径）
class _MissNote extends StatelessWidget {
  const _MissNote();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      child: const Text(
        '本轮平台 API 未提供此字段',
        style: TextStyle(fontSize: 11, color: Color(0xFF9AA8B6)),
      ),
    );
  }
}

class _SheetButton extends StatelessWidget {
  final String label;
  final bool primary;
  final VoidCallback onTap;

  const _SheetButton(
      {required this.label, required this.primary, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (primary) {
      return ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryColor,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(36),
        ),
        child: Text(label, style: const TextStyle(fontSize: 13)),
      );
    }
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(36),
        foregroundColor: const Color(0xFF18222E),
      ),
      child: Text(label, style: const TextStyle(fontSize: 13)),
    );
  }
}
