import 'package:flutter/material.dart';
import '../../core/models/ble_service.dart';
import 'service_tile.dart';

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
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.bluetooth_searching, size: 48, color: Colors.grey),
              SizedBox(height: 16),
              Text('正在发现服务或无可用服务...', style: TextStyle(color: Colors.grey)),
            ],
          ),
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
