import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config/product.dart';
import '../../core/utils/version_metadata.dart';
import '../../themes/app_theme.dart';
import '../design/app_navbar.dart';
import '../design/app_chip.dart';
import '../design/app_tokens.dart';
import 'versions_page.dart';
import '../../core/design/app_icons.dart';

/// 关于页 —— 对齐基准原型 p009：紧凑品牌行 + 可操作信息，去除大图与展示型区块
class AboutPage extends StatefulWidget {
  const AboutPage({super.key});

  @override
  State<AboutPage> createState() => _AboutPageState();
}

class _AboutPageState extends State<AboutPage> {
  // F027 版本三态：基准 = Release Metadata 投影（verFallback），
  // 运行时渠道（PackageInfo）成功才覆盖，失败保留基准。
  String _version = metadataVersionLabel();
  String _deviceModel = '';
  bool _loadingInfo = true;

  @override
  void initState() {
    super.initState();
    _loadInfo();
  }

  Future<void> _loadInfo() async {
    try {
      final info = await PackageInfo.fromPlatform();
      final deviceInfo = DeviceInfoPlugin();
      String model = '';
      if (Platform.isAndroid) {
        final android = await deviceInfo.androidInfo;
        model = android.model;
      } else if (Platform.isIOS) {
        final ios = await deviceInfo.iosInfo;
        model = ios.utsname.machine;
      } else if (Platform.isMacOS) {
        final mac = await deviceInfo.macOsInfo;
        model = mac.model;
      } else {
        model = Platform.localHostname;
      }
      if (mounted) {
        setState(() {
          if (info.version.trim().isNotEmpty) {
            _version = 'v${info.version}+${info.buildNumber}';
          }
          _deviceModel = model;
          _loadingInfo = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loadingInfo = false);
      }
    }
  }

  Future<void> _openLink(BuildContext context, String url) async {
    final uri = Uri.parse(url);
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('无法打开链接')),
      );
    }
  }

  void _shareApp() {
    Share.share(
      'BLE Toolkit+ —— 跨平台 BLE 调试工具 ${ProductConfig.website}',
      subject: ProductConfig.name,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // UI-G2：正典 AppNavbar（ABOUT + 版本 chip mono）
      body: Column(
        children: [
          AppNavbar(
            kicker: 'ABOUT',
            title: '关于',
            status: _version.isNotEmpty
                ? AppChip(_version, tone: AppChipTone.mono)
                : null,
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildBrandRow(),
                  const SizedBox(height: 16),
                  _buildSectionTitle('更多小程序'),
                  _buildPromoCard(),
                  const SizedBox(height: 16),
                  _buildSectionTitle('应用信息'),
                  _buildAppInfoCard(),
                  const SizedBox(height: 16),
                  _buildMenuCard(),
                  const SizedBox(height: 24),
                  Center(
                    child: Text(
                      '日志全局脱敏：敏感凭据显示为 token=***\n© 2026 ${ProductConfig.name} · Smart BLE 产品家族',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.textSecondary.withValues(alpha: 0.72),
                        height: 1.6,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 紧凑品牌行（p009 v1.0.8：38px 图标 + 名称 + 单行元数据，替代整幅大横幅）
  Widget _buildBrandRow() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          // p009 正典品牌标：38px 渐变盒（cPrimaryDeep→cPrimary）+ bt 字形，不用位图
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppTokens.cPrimaryDeep, AppTokens.cPrimary]),
              borderRadius: BorderRadius.circular(11),
            ),
            alignment: Alignment.center,
            child: const AppIcon('bt', size: 20, color: AppTokens.cCard),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  ProductConfig.name,
                  style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 3),
                Text(
                  '${_loadingInfo ? '…' : _version} · ${ProductConfig.tagline}',
                  style: const TextStyle(
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: AppTheme.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        title,
        style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppTheme.textPrimary),
      ),
    );
  }

  /// F028 推广跳转：卡片点击即打开对应站点
  Widget _buildPromoCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        children: ProductConfig.promos
            .map((p) => _PromoTile(
                  app: p,
                  onTap: () => _openLink(context, p.url),
                ))
            .toList(),
      ),
    );
  }

  Widget _buildAppInfoCard() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        children: [
          _kvRow('当前环境',
              '${Platform.operatingSystem} · ${Platform.operatingSystemVersion}'),
          _kvRow('设备型号', _loadingInfo ? '…' : _deviceModel),
          _kvRow('版本', _loadingInfo ? '…' : _version, last: true),
        ],
      ),
    );
  }

  Widget _kvRow(String key, String value, {bool last = false}) {
    return Container(
      padding: EdgeInsets.only(top: 10, bottom: last ? 10 : 9),
      decoration: last
          ? null
          : const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppTheme.borderColor)),
            ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 76,
            child: Text(key,
                style: const TextStyle(
                    fontSize: 13, color: AppTheme.textSecondary)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                  fontSize: 13, color: AppTheme.textPrimary, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuCard() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        children: [
          _MenuRow(
            icon: 'ext',
            title: '官方网站',
            onTap: () => _openLink(context, ProductConfig.website),
          ),
          _MenuRow(
            icon: 'doc',
            title: '版本记录',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (context) => const VersionsPage()),
            ),
          ),
          _MenuRow(
            icon: 'send',
            title: '问题反馈',
            onTap: () => _openLink(context, ProductConfig.feedback),
          ),
          _MenuRow(
            icon: 'share',
            title: '分享应用',
            onTap: _shareApp,
            last: true,
          ),
        ],
      ),
    );
  }
}

class _PromoTile extends StatelessWidget {
  final PromoApp app;
  final VoidCallback onTap;

  const _PromoTile({required this.app, required this.onTap});

  static Color _fromHex(String hex) =>
      Color(int.parse(hex.replaceFirst('#', '0xFF')));

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            // p009 正典 .promo .ic：缩写块（底色/字色来自数据），替代位图图标
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: _fromHex(app.bg),
                borderRadius: BorderRadius.circular(11),
              ),
              alignment: Alignment.center,
              child: Text(
                app.abbr,
                style: TextStyle(
                    color: _fromHex(app.color),
                    fontWeight: FontWeight.w800,
                    fontSize: 15),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(app.name,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textPrimary)),
                  const SizedBox(height: 2),
                  Text(
                    app.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 12,
                        height: 1.4,
                        color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: onTap,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 34),
                padding: const EdgeInsets.symmetric(horizontal: 14),
                foregroundColor: AppTheme.primaryColor,
                side: const BorderSide(color: AppTheme.borderColor),
                textStyle:
                    const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              child: const Text('前往'),
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  final String icon;
  final String title;
  final VoidCallback onTap;
  final bool last;

  const _MenuRow({
    required this.icon,
    required this.title,
    required this.onTap,
    this.last = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: last
            ? null
            : const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppTheme.borderColor)),
              ),
        child: Row(
          children: [
            AppIcon(icon, size: 19, color: AppTheme.textSecondary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(title,
                  style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textPrimary)),
            ),
            const AppIcon('chev-r', size: 18, color: AppTheme.textSecondary),
          ],
        ),
      ),
    );
  }
}
