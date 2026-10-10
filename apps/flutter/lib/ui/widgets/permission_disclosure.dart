import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../pages/privacy_page.dart';

Future<bool> explainPermissionUse(BuildContext context,
    {required String title, required String purpose}) async {
  final approved = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(title),
      content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text('$purpose\n\n您可以暂不授权，继续浏览其他页面。'),
        TextButton(
            onPressed: () => showPrivacyPage(dialogContext),
            child: const Text('查看完整隐私说明')),
      ])),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('暂不授权')),
        TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('继续申请系统权限')),
      ],
    ),
  );
  return approved == true;
}

Future<List<Permission>> _blePermissions({required bool advertise}) async {
  final sdk = (await DeviceInfoPlugin().androidInfo).version.sdkInt;
  if (sdk < 31) {
    return [Permission.location];
  }
  if (advertise) {
    return [Permission.bluetoothAdvertise, Permission.bluetoothConnect];
  }
  // Keep complete scanner compatibility; do not apply a neverForLocation
  // manifest filter that silently hides some beacon advertisements.
  return [
    Permission.location,
    Permission.bluetoothScan,
    Permission.bluetoothConnect
  ];
}

Future<bool> hasAndroidBlePermissions({bool advertise = false}) async {
  if (!Platform.isAndroid) return true;
  for (final permission in await _blePermissions(advertise: advertise)) {
    if (!(await permission.status).isGranted) return false;
  }
  return true;
}

Future<bool> requestAndroidBlePermissions(BuildContext context,
    {bool advertise = false}) async {
  if (!Platform.isAndroid) return true;
  final permissions = await _blePermissions(advertise: advertise);
  final statuses =
      await Future.wait(permissions.map((permission) => permission.status));
  if (statuses.every((status) => status.isGranted)) return true;
  if (!context.mounted) return false;
  final approved = await explainPermissionUse(
    context,
    title: advertise ? '广播权限用途' : '蓝牙扫描权限用途',
    purpose: advertise
        ? '附近设备权限用于由本机发送蓝牙广播；旧版 Android 使用位置权限兼容广播 API。应用不读取 GPS 坐标或定位轨迹。'
        : '附近设备权限用于扫描和连接蓝牙设备。位置权限用于 Android 蓝牙扫描兼容；应用不读取 GPS 坐标或定位轨迹。扫描业务数据只保留在当前运行会话中。',
  );
  if (!approved) return false;
  final result = await permissions.request();
  return permissions
      .every((permission) => result[permission]?.isGranted == true);
}
