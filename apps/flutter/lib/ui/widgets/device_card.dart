import 'package:flutter/material.dart';
import '../../core/models/ble_scan_result.dart';
import '../../themes/app_theme.dart';

/// 设备卡片组件
class DeviceCard extends StatelessWidget {
  final BleScanResult device;
  final VoidCallback onTap;

  const DeviceCard({
    super.key,
    required this.device,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // 设备图标
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: AppStyles.deviceCardGradient,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.bluetooth,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),

              // 设备信息
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      device.displayName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      device.deviceId,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              // 信号强度
              _buildRssiIndicator(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRssiIndicator() {
    final color = AppStyles.getRssiColor(device.rssi);
    final label = AppStyles.getRssiLabel(device.rssi);
    final icon = _getRssiIcon();

    return Column(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 2),
        Text(
          '${device.rssi} dBm',
          style: TextStyle(
            fontSize: 11,
            color: color,
            fontWeight: FontWeight.w500,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            color: color,
          ),
        ),
      ],
    );
  }

  IconData _getRssiIcon() {
    if (device.rssi >= -50) return Icons.signal_wifi_4_bar;
    if (device.rssi >= -70) return Icons.signal_wifi_3_bar;
    if (device.rssi >= -90) return Icons.signal_wifi_2_bar;
    return Icons.signal_wifi_1_bar;
  }
}
