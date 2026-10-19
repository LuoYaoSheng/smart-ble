import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../pages/privacy_page.dart';

Future<bool> explainPermissionUse(BuildContext context,
    {required String title,
    required String purpose,
    String confirmLabel = '继续申请系统权限',
    String declineLabel = '暂不授权',
    String choiceNote = '您可以暂不授权，继续浏览其他页面。'}) async {
  final approved = await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(title),
      content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text('$purpose\n\n$choiceNote'),
        TextButton(
            onPressed: () => showPrivacyPage(dialogContext),
            child: const Text('查看完整隐私说明')),
      ])),
      actions: [
        TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text(declineLabel)),
        TextButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(confirmLabel)),
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

/// An SDK decision is independent of the OS camera permission. It is retained
/// only for the running app session; a new instance starts unapproved.
class ScannerSdkConsentSession {
  bool _confirmed = false;
  Future<bool>? _pending;

  Future<bool> confirm(Future<bool> Function() prompt) {
    if (_confirmed) return Future<bool>.value(true);
    return _pending ??= Future<bool>.sync(prompt).then((approved) {
      _confirmed = approved;
      return approved;
    }).whenComplete(() {
      _pending = null;
    });
  }
}

final _androidScannerSdkConsent = ScannerSdkConsentSession();

Future<bool> requestAndroidScannerSdkConsent(BuildContext context,
        {ScannerSdkConsentSession? session}) =>
    (session ?? _androidScannerSdkConsent).confirm(() => explainPermissionUse(
          context,
          title: 'Android 扫码 SDK 说明',
          purpose:
              '相机扫码使用 Google ML Kit。图像和识别结果在本机处理，但 SDK 会收集设备与应用信息、每安装标识、性能、API 配置及错误诊断，用于诊断和使用分析，并向 Google 发送相关统计。业务会话仅存内存的说明不包含 SDK 诊断缓存。相机权限已授权也不会代替您本次应用运行的 SDK 选择。',
          confirmLabel: '了解并继续扫码',
          declineLabel: '使用粘贴',
          choiceNote: '拒绝启用 SDK 后仍可粘贴 ControlHub 配对码，其他页面可继续浏览。',
        ));
