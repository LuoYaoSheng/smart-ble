import 'package:flutter/material.dart';
import '../../core/models/ble_scan_result.dart';
import '../../themes/app_theme.dart';

/// 设备卡片组件
class DeviceCard extends StatelessWidget {
  final BleScanResult device;
  final VoidCallback onConnect;
  final VoidCallback onShowInfo;

  const DeviceCard({
    super.key,
    required this.device,
    required this.onConnect,
    required this.onShowInfo,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onShowInfo, // 点击卡片显示详情
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
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              // 信号强度
              _buildRssiIndicator(),

              const SizedBox(width: 12),

              // 连接按钮
              IconButton(
                onPressed: onConnect,
                icon: const Icon(Icons.link, size: 20),
                style: IconButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                  foregroundColor: AppTheme.primaryColor,
                  padding: const EdgeInsets.all(8),
                  minimumSize: const Size(36, 36),
                ),
                tooltip: '连接设备',
              ),
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
    if (device.rssi >= -70) return Icons.network_wifi_3_bar;
    if (device.rssi >= -90) return Icons.network_wifi_2_bar;
    return Icons.network_wifi_1_bar;
  }
}
