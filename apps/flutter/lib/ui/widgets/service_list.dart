import 'package:flutter/material.dart';
import '../../core/models/ble_service.dart';
import '../../themes/app_theme.dart';
import 'service_tile.dart';
import '../../core/design/app_icons.dart';

class ServiceListWidget extends StatelessWidget {
  final List<BleService> services;
  final Function(BleCharacteristic) onRead;
  final Function(BleCharacteristic) onWrite;
  final Function(BleCharacteristic) onToggleNotify;

  const ServiceListWidget({
    super.key,
    required this.services,
    required this.onRead,
    required this.onWrite,
    required this.onToggleNotify,
  });

  @override
  Widget build(BuildContext context) {
    if (services.isEmpty) {
      // p006 正典空态：C.op(mode:'warn') 文案块（服务发现完成 · 列表为空），无插图
      return Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppIcon('warn', size: 22, color: Color(0xFFC77E14)),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('服务发现完成 · 列表为空',
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary)),
                  SizedBox(height: 4),
                  Text('该设备未暴露任何 GATT 服务（或权限受限）。',
                      style: TextStyle(
                          fontSize: 12,
                          height: 1.5,
                          color: AppTheme.textSecondary)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: services.length,
      itemBuilder: (context, index) {
        final service = services[index];
        return ServiceTile(
          service: service,
          onRead: onRead,
          onWrite: onWrite,
          onToggleNotify: onToggleNotify,
        );
      },
    );
  }
}
