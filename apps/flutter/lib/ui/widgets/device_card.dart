import 'package:flutter/material.dart';
import '../../core/ble/profile_registry.dart';
import '../../core/models/ble_scan_result.dart';
import '../../core/design/app_icons.dart';
import '../../themes/app_theme.dart';

/// 设备卡片（对齐原型 C1 devCard · scan 变体）
///
/// 特殊设备（Smart HID）是标准设备的扩展：卡片保留标准「连接」入口，
/// 叠加 profile「配置」入口；点卡片本体查看广播数据（F004）。
class DeviceCard extends StatelessWidget {
  final BleScanResult device;
  final VoidCallback onConnect;

  /// 点卡片本体：广播数据弹窗（F004）
  final VoidCallback onShowInfo;

  /// profile 命中后的「配置」动作
  final VoidCallback? onConfigure;
  final bool isConnected;

  const DeviceCard({
    super.key,
    required this.device,
    required this.onConnect,
    required this.onShowInfo,
    this.onConfigure,
    this.isConnected = false,
  });

  ProfileMatch? get _match => matchProfile(device);

  bool get _isShid => _match != null;

  @override
  Widget build(BuildContext context) {
    final match = _match;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE3EAF3)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onShowInfo,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildAvatar(),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  device.displayName,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF18222E),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (match != null) ...[
                                const SizedBox(width: 6),
                                _MatchChip(match: match),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            device.deviceId,
                            style: const TextStyle(
                              fontSize: 10,
                              fontFamily: 'monospace',
                              color: Color(0xFF60758D),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 5),
                          Row(
                            children: [
                              SignalBars(rssi: device.rssi),
                              const SizedBox(width: 8),
                              Text(
                                '${device.rssi} dBm',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF60758D),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (_isShid)
                      Expanded(
                        child: _ActionChip(
                          key: const ValueKey('shidConfigureBtn'),
                          label: match!.profile.actionLabel,
                          icon: 'hid',
                          primary: true,
                          disabled: isConnected,
                          onTap: onConfigure,
                        ),
                      ),
                    if (_isShid) const SizedBox(width: 8),
                    Expanded(
                      child: _ActionChip(
                        label: isConnected ? '已连接' : '连接',
                        icon: 'link',
                        primary: !_isShid && !isConnected,
                        disabled: isConnected,
                        onTap: onConnect,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// 头像：标准设备蓝色系，Smart HID 命中青绿系（原型 .ava / .ava.shid）
  Widget _buildAvatar() {
    final initial =
        ((device.name.isNotEmpty ? device.name : device.deviceId).trim().isEmpty
                ? '?'
                : (device.name.isNotEmpty ? device.name : device.deviceId)
                    .trim()[0])
            .toUpperCase();
    final shid = _isShid;
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: shid
              ? const [Color(0xFFD9F6F0), Color(0xFFE2F8F4)]
              : const [Color(0xFFE8F1FF), Color(0xFFDCE9FF)],
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: shid ? const Color(0xFF0E9A80) : AppTheme.primaryColor,
        ),
      ),
    );
  }
}

/// 匹配 chip（强匹配 primary / 弱匹配 warning，口径同原型 B2）
class _MatchChip extends StatelessWidget {
  final ProfileMatch match;

  const _MatchChip({required this.match});

  @override
  Widget build(BuildContext context) {
    final strong = match.level == ProfileMatchLevel.strong;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 2),
      decoration: BoxDecoration(
        color: strong ? const Color(0xFFE8F1FF) : const Color(0xFFFFF3E4),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        match.chipLabel,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: strong ? AppTheme.primaryColor : const Color(0xFFC77E14),
        ),
      ),
    );
  }
}

/// 卡片动作按钮（sm：高 32；primary 渐变 / soft 填充描边 / disabled 灰；
/// 图标随按钮色：primary 白字 / soft 正文色 / disabled 弱化）
class _ActionChip extends StatelessWidget {
  final String label;
  final String? icon;
  final bool primary;
  final bool disabled;
  final VoidCallback? onTap;

  const _ActionChip({
    super.key,
    required this.label,
    this.icon,
    required this.primary,
    this.disabled = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final iconColor = primary && !disabled
        ? Colors.white
        : disabled
            ? const Color(0xFF9AA8B6)
            : const Color(0xFF18222E);
    final iconWidget = icon == null
        ? null
        : Padding(
            padding: const EdgeInsets.only(right: 4),
            child: AppIcon(icon!, size: 14, color: iconColor),
          );
    if (primary && !disabled) {
      return Material(
        color: Colors.transparent,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1B6DFF), Color(0xFF0E4FC4)],
            ),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryColor.withValues(alpha: 0.32),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              height: 32,
              child: Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (iconWidget != null) iconWidget,
                    // 窄屏/长动作文案（如「配置 Smart HID」在双按钮行）超宽时省略收尾，
                    // 不再横向溢出（UI-DEF-06：393 宽双按钮行实测溢出 18px）
                    Flexible(
                      child: Text(label,
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                          style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: disabled ? null : onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: 32,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5FB),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: disabled ? Colors.transparent : const Color(0xFFE3EAF3),
            ),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (iconWidget != null) iconWidget,
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color:
                      disabled ? const Color(0xFF9AA8B6) : const Color(0xFF18222E),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 四格信号条（对齐原型 .sig：q4 全绿 / q3 前三绿 / q2 前二黄 / q1 首格红）
class SignalBars extends StatelessWidget {
  final int rssi;

  const SignalBars({super.key, required this.rssi});

  int get _quality => rssi >= -60
      ? 4
      : rssi >= -70
          ? 3
          : rssi >= -80
              ? 2
              : 1;

  @override
  Widget build(BuildContext context) {
    const heights = [4.0, 7.0, 10.0, 12.0];
    final q = _quality;
    Color colorFor(int i) {
      final filled = i < q;
      if (!filled) return const Color(0xFFE3EAF3);
      if (q >= 3) return const Color(0xFF17C7A8);
      if (q == 2) return const Color(0xFFFF9F43);
      return const Color(0xFFF2555F);
    }

    return SizedBox(
      height: 12,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 0; i < 4; i++) ...[
            if (i > 0) const SizedBox(width: 2),
            Container(
              width: 3,
              height: heights[i],
              decoration: BoxDecoration(
                color: colorFor(i),
                borderRadius: BorderRadius.circular(1),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
