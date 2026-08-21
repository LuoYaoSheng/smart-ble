import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../themes/app_theme.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  static const _siteUrl = 'https://lightble.i2kai.com/';
  static const _repositoryUrl = 'https://github.com/luoyaosheng/smart-ble';
  static const _docsUrl = 'https://lightble.i2kai.com/MASTER_ARCHITECTURE';
  static const _issuesUrl = 'https://github.com/luoyaosheng/smart-ble/issues';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('关于')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _HeroCard(),
            const SizedBox(height: 20),
            const _SectionCard(
              title: '产品定位',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Smart BLE 是跨平台 BLE 控制台与统一协议内核，不是单一端上的小工具。',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                      height: 1.65,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    '它把扫描、连接、服务调试、通知监听、广播模式和硬件联动收进同一套产品语言里，方便用户直接调试，也方便开发者学习多平台实现差异。',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                      height: 1.7,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const _SectionCard(
              title: '核心能力',
              child: Column(
                children: [
                  _FeatureRow(
                    icon: Icons.bluetooth_searching,
                    title: '设备扫描',
                    description: '快速发现附近 BLE 设备并实时展示 RSSI 状态',
                  ),
                  _FeatureRow(
                    icon: Icons.connect_without_contact,
                    title: '连接与服务发现',
                    description: '建立会话后继续查看服务树和特征值层级',
                  ),
                  _FeatureRow(
                    icon: Icons.edit_note,
                    title: '读写与监听',
                    description: '支持 HEX / UTF-8 写入、读取和通知订阅',
                  ),
                  _FeatureRow(
                    icon: Icons.broadcast_on_personal,
                    title: '广播模式',
                    description: '验证设备名称、UUID 与广播载荷的配置效果',
                  ),
                  _FeatureRow(
                    icon: Icons.memory,
                    title: '硬件联动',
                    description: '与 ESP32 / 固件示例配套使用，形成协议验证闭环',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const _SectionCard(
              title: '平台矩阵',
              child: Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _PlatformChip(icon: Icons.phone_android, label: 'Android'),
                  _PlatformChip(icon: Icons.phone_iphone, label: 'iOS'),
                  _PlatformChip(icon: Icons.laptop_mac, label: 'macOS'),
                  _PlatformChip(icon: Icons.desktop_windows, label: 'Windows'),
                  _PlatformChip(icon: Icons.developer_board, label: 'UniApp'),
                  _PlatformChip(icon: Icons.memory, label: 'Hardware'),
                ],
              ),
            ),
            const SizedBox(height: 20),
            _SectionCard(
              title: '相关链接',
              child: Column(
                children: [
                  _LinkTile(
                    icon: Icons.language,
                    title: '项目主页',
                    subtitle: '查看平台矩阵、下载入口与架构说明',
                    onTap: () => _openLink(context, _siteUrl),
                  ),
                  _LinkTile(
                    icon: Icons.architecture,
                    title: '架构白皮书',
                    subtitle: '统一协议内核、交互流与组件规范',
                    onTap: () => _openLink(context, _docsUrl),
                  ),
                  _LinkTile(
                    icon: Icons.code,
                    title: '源码仓库',
                    subtitle: '查看全部实现与共享资产生成器',
                    onTap: () => _openLink(context, _repositoryUrl),
                  ),
                  _LinkTile(
                    icon: Icons.bug_report,
                    title: '问题反馈',
                    subtitle: '提交 issue 或查看已知问题',
                    onTap: () => _openLink(context, _issuesUrl),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Center(
              child: Text(
                '© 2026 Smart BLE\nReleased under MIT License',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary.withValues(alpha: 0.72),
                  height: 1.6,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
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
}

class _HeroCard extends StatelessWidget {
  const _HeroCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF7FBFF), Color(0xFFEFF6FF)],
        ),
        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: Image.asset(
              'assets/brand/about-hero.png',
              width: double.infinity,
              height: 220,
              fit: BoxFit.cover,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryColor.withValues(alpha: 0.18),
                            blurRadius: 14,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: Image.asset(
                          'assets/brand/icon.png',
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Smart BLE',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Flutter 主线运行面',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _MetaChip(text: 'Version 2.0.0'),
                    _MetaChip(text: 'Framework: Flutter'),
                    _MetaChip(text: 'Language: Dart'),
                  ],
                ),
                const SizedBox(height: 16),
                const Text(
                  '跨平台 BLE 控制台与统一协议内核，用同一套工作流覆盖扫描、连接、调试、广播和硬件联动。',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                    height: 1.7,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        color: AppTheme.cardColor,
        border: Border.all(color: AppTheme.borderColor.withValues(alpha: 0.8)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  const _FeatureRow({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: AppTheme.primaryColor),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PlatformChip extends StatelessWidget {
  const _PlatformChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppTheme.primaryColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppTheme.primaryColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppTheme.primaryColor,
        ),
      ),
    );
  }
}

class _LinkTile extends StatelessWidget {
  const _LinkTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 20, color: AppTheme.primaryColor),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            const Icon(
              Icons.open_in_new,
              size: 16,
              color: AppTheme.textSecondary,
            ),
          ],
        ),
      ),
    );
  }
}
