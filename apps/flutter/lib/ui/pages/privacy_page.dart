import 'package:flutter/material.dart';
import '../design/app_subnav.dart';
import '../../themes/app_theme.dart';

const supportEmail = '121912336@qq.com';
const offlinePrivacyText = r'''
Smart BLE 隐私说明
更新日期：2026-10-10
开发者：个人开发者
联系邮箱：121912336@qq.com

使用目的
Smart BLE 用于扫描附近蓝牙设备、查看广播、连接 GATT、读写特征、监听通知和配置支持的设备。核心调试无需注册账号。

权限说明
蓝牙权限用于扫描、连接、读写、通知和受平台支持的广播功能。Android 的扫描兼容路径可能需要位置权限；应用不读取 GPS 坐标，不记录定位轨迹。
相机仅在您选择扫码时用于识别 ControlHub 配对二维码，不保存拍摄图像。您也可以选择手动输入或粘贴配对信息。
剪贴板、系统分享和文件选择仅在您主动复制、导出、分享或选择固件时使用。
您可以拒绝授权并继续查看应用信息、版本记录和本说明；相关蓝牙或扫码功能将不可用。

业务会话数据
扫描会读取设备名称、标识符、信号强度、服务 UUID 和广播数据；连接后读取您选择的特征值。这些业务数据保留在运行内存中，不保存为设备历史。退出应用后清除会话内存数据。
日志对 Wi-Fi 密码和配对 token 等敏感凭据脱敏。业务状态的零持久化不包括系统或 SDK 自身的运行文件。

Smart HID 配网
配网可能与您指定的 ControlHub 交换配对信息，并将您填写的 Wi-Fi 信息、ControlHub 地址和一次性配对 token 通过蓝牙发送给您选择的设备。配套设备和 ControlHub 可以保存其配置；客户端的会话内存规则不代表整个设备系统不保存配置。

外部服务
您主动打开项目网站、发送支持邮件或使用系统分享时，会进入网站、邮件客户端或其他应用，其数据处理规则由相应服务提供方说明。提交反馈前请移除日志中的私人信息。

联系与更新
如需咨询隐私、权限或使用问题，请联系 121912336@qq.com。应用更新后的数据处理变化将在新版说明中披露。
''';

class PrivacyPage extends StatelessWidget {
  const PrivacyPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        appBar:
            AppSubnav(title: '隐私说明', onBack: () => Navigator.of(context).pop()),
        body: const SingleChildScrollView(
          padding: EdgeInsets.all(20),
          child: SelectableText(offlinePrivacyText,
              style: TextStyle(
                  fontSize: 14, height: 1.7, color: AppTheme.textPrimary)),
        ),
      );
}

Future<void> showPrivacyPage(BuildContext context) =>
    Navigator.of(context).push<void>(
      MaterialPageRoute(builder: (_) => const PrivacyPage()),
    );
