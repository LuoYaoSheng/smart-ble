import 'package:flutter/material.dart';
import '../../themes/app_theme.dart';

/// 关于页面
class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('关于'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Logo / Icon
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppTheme.primaryColor, Color(0xFF5AC8FA)],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryColor.withOpacity(0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(
                Icons.bluetooth,
                size: 50,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 24),

            // App Name
            const Text(
              'Smart BLE',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),

            // Version
            Text(
              '版本 2.0.0',
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 32),

            // Description
            const Text(
              '跨平台蓝牙低功耗调试工具',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              '支持扫描、连接、读写特征值、\n通知监听等功能',
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.textSecondary,
                height: 1.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            // Features
            _buildSection(
              '功能特性',
              [
                _buildFeatureItem(Icons.search, '设备扫描', '自动发现附近的 BLE 设备'),
                _buildFeatureItem(Icons.filter_list, '智能过滤', '按信号强度、名称过滤设备'),
                _buildFeatureItem(Icons.connect_without_contact, '快速连接', '一键连接设备并自动发现服务'),
                _buildFeatureItem(Icons.edit_note, '数据读写', '支持 HEX/UTF-8 格式读写'),
                _buildFeatureItem(Icons.notifications_active, '通知监听', '实时接收设备通知数据'),
                _buildFeatureItem(Icons.broadcast_on_personal, '广播模式', '模拟 BLE 外设设备'),
              ],
            ),

            const SizedBox(height: 24),

            // Supported Platforms
            _buildSection(
              '支持平台',
              [
                _buildPlatformItem('Android', 'assets/icons/android.png', Icons.android),
                _buildPlatformItem('iOS', 'assets/icons/ios.png', Icons.phone_iphone),
                _buildPlatformItem('macOS', 'assets/icons/macos.png', Icons.laptop_mac),
                _buildPlatformItem('Windows', 'assets/icons/windows.png', Icons.computer),
                _buildPlatformItem('Linux', 'assets/icons/linux.png', Icons.computer),
              ],
            ),

            const SizedBox(height: 24),

            // Links
            _buildSection(
              '相关链接',
              [
                _buildLinkItem(
                  Icons.code,
                  '源代码',
                  'https://github.com/yourusername/smart-ble',
                ),
                _buildLinkItem(
                  Icons.description,
                  '使用文档',
                  'https://github.com/yourusername/smart-ble/wiki',
                ),
                _buildLinkItem(
                  Icons.bug_report,
                  '问题反馈',
                  'https://github.com/yourusername/smart-ble/issues',
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Copyright
            Text(
              '© 2025 Smart BLE\nReleased under MIT License',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.textSecondary.withOpacity(0.7),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        ...children,
      ],
    );
  }

  Widget _buildFeatureItem(IconData icon, String title, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: AppTheme.primaryColor, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlatformItem(String name, String assetPath, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(right: 12, bottom: 8),
      child: Chip(
        avatar: Icon(icon, size: 16),
        label: Text(name),
        labelStyle: const TextStyle(fontSize: 13),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
      ),
    );
  }

  Widget _buildLinkItem(IconData icon, String title, String url) {
    return InkWell(
      onTap: () {
        // TODO: Open URL in browser
      },
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Icon(icon, color: AppTheme.primaryColor, size: 20),
            const SizedBox(width: 12),
            Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.primaryColor,
              ),
            ),
            const Spacer(),
            Icon(Icons.open_in_new, size: 16, color: AppTheme.textSecondary),
          ],
        ),
      ),
    );
  }
}
