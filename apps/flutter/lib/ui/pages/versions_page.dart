// P010 版本记录。
//
// 对齐原型 docs/specs/prototype/v1-new/pages/p010-versions.js 与
// PAGE_SPEC §10：①当前版本卡（版本行+渠道+平台状态+复制按钮）②当前限制卡
// ③正式发布历史卡 ④预览记录卡 ⑤页脚声明。
//
// 数据口径：当前版本为运行时真值（PackageInfo）；限制列表为正典已知限制
// （OTA 端到端 BLOCKED P-03）；正式发布/预览记录为 Release Metadata 投影
// ——Flutter 线暂无该投影数据源，按 PAGE_SPEC 空态如实展示
// （「暂无正式发布版本」「暂无预览记录」），不手写版本事实（F027 深接线
// 留待逐功能 Gate）。

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../themes/app_theme.dart';

class VersionsPage extends StatefulWidget {
  const VersionsPage({super.key});

  @override
  State<VersionsPage> createState() => _VersionsPageState();
}

class _VersionsPageState extends State<VersionsPage> {
  String _displayVersion = '';

  @override
  void initState() {
    super.initState();
    _loadVersion();
  }

  Future<void> _loadVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (mounted) {
        setState(() => _displayVersion = 'v${info.version}+${info.buildNumber}');
      }
    } catch (_) {
      if (mounted) setState(() => _displayVersion = 'dev.unknown');
    }
  }

  Future<void> _copyVersion() async {
    final text = _displayVersion.isEmpty ? 'dev.unknown' : _displayVersion;
    try {
      await Clipboard.setData(ClipboardData(text: text));
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('版本已复制')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('复制失败')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('版本记录'),
        backgroundColor: AppTheme.backgroundColor,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textPrimary),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _card(children: [
            _sectionTitle('当前版本'),
            _kvRow('版本', _displayVersion.isEmpty ? '…' : _displayVersion),
            _kvRow('渠道', 'preview'),
            _kvRow('平台状态', 'Android · PREVIEW'),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _copyVersion,
                icon: const Icon(Icons.copy, size: 16),
                label: const Text('复制版本信息'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ]),
          const SizedBox(height: 12),
          _card(children: [
            _sectionTitle('当前限制'),
            _limitRow('OTA 固件升级端到端 BLOCKED（P-03）：客户端与固件完整事务未对齐，入口仅对 OTA 服务设备开放'),
          ]),
          const SizedBox(height: 12),
          _card(children: [
            _sectionTitle('正式发布'),
            _emptyRow('暂无正式发布版本'),
          ]),
          const SizedBox(height: 12),
          _card(children: [
            _sectionTitle('预览记录'),
            _emptyRow('暂无预览记录'),
            _emptyRow('当前无 Artifact，不提供下载入口', small: true),
          ]),
          const SizedBox(height: 8),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
            child: Text(
              '本页数据来自 Release Metadata 投影，不是手写版本事实源。',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card({required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
    );
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.fromLTRB(0, 12, 0, 6),
        child: Text(text,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppTheme.textSecondary)),
      );

  Widget _kvRow(String k, String v) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 76,
            child: Text(k,
                style:
                    const TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
          ),
          Expanded(
            child: Text(v,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary)),
          ),
        ],
      ),
    );
  }

  Widget _limitRow(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('· ',
              style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.warningColor)),
          Expanded(
            child: Text(text,
                style: const TextStyle(
                    fontSize: 13, height: 1.5, color: AppTheme.textPrimary)),
          ),
        ],
      ),
    );
  }

  Widget _emptyRow(String text, {bool small = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(text,
          style: TextStyle(
              fontSize: small ? 11 : 13, color: AppTheme.textSecondary)),
    );
  }
}
