// P010 版本记录。
//
// 对齐原型 docs/specs/prototype/v1-new/pages/p010-versions.js 与
// PAGE_SPEC §10：①当前版本卡（版本行+渠道+平台状态+复制按钮）②当前限制卡
// ③正式发布历史卡 ④预览记录卡 ⑤页脚声明。
//
// F027 数据口径：整页消费 Release Metadata 投影（core/utils/version_metadata.dart
// 的 getVersionPageModel，与 uniapp services/version-metadata.js 同源镜像），
// 不再读 PackageInfo，也不手写版本/渠道/限制事实（版本唯一事实源 = 根 VERSION）。

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../themes/app_theme.dart';
import '../../core/design/app_icons.dart';
import '../../core/utils/version_metadata.dart';
import '../design/app_subnav.dart';
import '../design/app_empty.dart';

class VersionsPage extends StatefulWidget {
  const VersionsPage({super.key});

  @override
  State<VersionsPage> createState() => _VersionsPageState();
}

class _VersionsPageState extends State<VersionsPage> {
  final VersionPageModel _model = getVersionPageModel();

  Future<void> _copyVersion() async {
    final text = _model.current.displayVersion.isNotEmpty
        ? _model.current.displayVersion
        : _model.current.version.isNotEmpty
            ? _model.current.version
            : 'dev.unknown';
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

  /// 正典 formatPlatformStatus：REFERENCE 直接展示；
  /// capability/release 不一致时 `cap / rel`，否则取其一，兜底 NOT_RELEASED。
  String _formatPlatformStatus(PlatformPublicStatus p) {
    if (p.role == 'REFERENCE') return 'REFERENCE';
    final cap = p.capabilityStatus ?? '';
    final rel = p.releaseStatus;
    if (cap.isNotEmpty && rel.isNotEmpty && cap != rel) return '$cap / $rel';
    if (cap.isNotEmpty) return cap;
    if (rel.isNotEmpty) return rel;
    return 'NOT_RELEASED';
  }

  @override
  Widget build(BuildContext context) {
    final current = _model.current;
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: const AppSubnav(title: '版本记录'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _card(children: [
            _sectionTitle('当前版本'),
            _kvRow(
                '版本',
                current.version.isNotEmpty
                    ? current.version
                    : current.displayVersion),
            _kvRow('渠道', current.channelLabel),
            if (current.hasReleaseTag) _kvRow('Release tag', '已登记'),
            _sectionTitle('平台状态'),
            for (final p in current.platforms)
              _kvRow(p.name, _formatPlatformStatus(p)),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _copyVersion,
                icon: const AppIcon('copy', size: 16),
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
            if (current.limitations.isNotEmpty)
              for (final item in current.limitations) _limitRow(item)
            else
              _emptyRow('暂无已知限制条目。'),
          ]),
          const SizedBox(height: 12),
          _card(children: [
            _sectionTitle('正式发布'),
            if (_model.history.releases.isNotEmpty)
              for (final r in _model.history.releases)
                _historyRow(r.tag.isNotEmpty ? r.tag : r.version,
                    '${r.status} · ${r.channel}')
            else
              _emptyBlock('暂无正式发布版本', '产品当前处于 PREVIEW 阶段，首个正式版发布后将在此列出。'),
            if (!current.hasArtifacts)
              _emptyRow('当前无 Artifact，不提供下载入口', small: true),
          ]),
          const SizedBox(height: 12),
          _card(children: [
            _sectionTitle('预览记录'),
            if (_model.history.previews.isNotEmpty)
              for (final p in _model.history.previews)
                _historyRow(p.label, '${p.status} · ${p.channel}')
            else
              _emptyBlock('暂无预览记录', ''),
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
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: children),
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
                style: const TextStyle(
                    fontSize: 13, color: AppTheme.textSecondary)),
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
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.warningColor)),
          Expanded(
            child: Text(text,
                style: const TextStyle(
                    fontSize: 13, height: 1.5, color: AppTheme.textPrimary)),
          ),
        ],
      ),
    );
  }

  Widget _historyRow(String title, String sub) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textPrimary)),
          const SizedBox(height: 2),
          Text(sub,
              style:
                  const TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
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

  /// UI-G2：p010 空态改用正典 AppEmpty（B6 C.empty · ill: doc）
  Widget _emptyBlock(String title, String desc) {
    return AppEmpty(
        ill: 'doc', title: title, description: desc.isEmpty ? null : desc);
  }
}
