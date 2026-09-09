import 'package:flutter/material.dart';
import 'app_tokens.dart';
import 'app_icon.dart';
import 'app_chip.dart';
import 'app_button.dart';

/// 正典设备卡（COMPONENT_CONTRACT C1 · 原型 C.devCard 单一来源）
///
/// variant: scan / conn · SHID 双入口（配置 Smart HID + 连接）·
/// RSSI 四档信号条（≥-60 四 / ≥-70 三 / ≥-80 二 / 其余一）。
class DeviceCard extends StatelessWidget {
  const DeviceCard({
    super.key,
    required this.device,
    this.variant = DeviceCardVariant.scan,
    this.connected = false,
    this.onTap,
    this.onConnect,
    this.onConfigure,
    this.onDisconnect,
  });

  final BleDeviceCardData device;
  final DeviceCardVariant variant;
  final bool connected;

  /// 卡片主体点击（scan 变体 = 查看广播数据）
  final VoidCallback? onTap;
  final void Function(BleDeviceCardData)? onConnect;
  final void Function(BleDeviceCardData)? onConfigure;
  final void Function(BleDeviceCardData)? onDisconnect;

  bool get _isShid => device.matchLevel != null;

  int get _quality {
    final rssi = device.rssi;
    if (rssi >= -60) return 4;
    if (rssi >= -70) return 3;
    if (rssi >= -80) return 2;
    return 1;
  }

  String get _avatarLetter {
    final source = device.name.trim().isNotEmpty ? device.name : device.deviceId;
    final trimmed = source.trim();
    return trimmed.isEmpty ? '?' : trimmed.substring(0, 1).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppTokens.sp3),
      decoration: BoxDecoration(
        color: AppTokens.cCard,
        borderRadius: BorderRadius.circular(AppTokens.rLg),
        border: Border.all(color: AppTokens.cLine),
        boxShadow: AppTokens.shadow1,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppTokens.rLg),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTokens.rLg),
          child: Padding(
            padding: const EdgeInsets.all(AppTokens.sp4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Avatar(
                      letter: _avatarLetter,
                      shid: _isShid,
                      showOnBadge: variant == DeviceCardVariant.conn,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  device.name.trim().isNotEmpty
                                      ? device.name
                                      : (variant == DeviceCardVariant.conn
                                          ? '未命名设备'
                                          : '未命名 BLE 设备'),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: AppTokens.fsH2,
                                    fontWeight: AppTokens.fsH2W,
                                    color: AppTokens.cText,
                                  ),
                                ),
                              ),
                              if (variant == DeviceCardVariant.scan &&
                                  _isShid) ...[
                                const SizedBox(width: 6),
                                AppChip(
                                  device.matchLevel == 'STRONG'
                                      ? 'Smart HID · 强匹配'
                                      : '疑似 Smart HID · 弱匹配',
                                  tone: device.matchLevel == 'STRONG'
                                      ? AppChipTone.primary
                                      : AppChipTone.warning,
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            device.deviceId +
                                (variant == DeviceCardVariant.scan &&
                                        device.name.trim().isEmpty
                                    ? '（未命名）'
                                    : ''),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: AppTokens.fontMono,
                              fontSize: AppTokens.fsMicro,
                              color: AppTokens.cMut,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Row(
                            children: [
                              SignalBars(level: _quality),
                              const SizedBox(width: 8),
                              Text(
                                '${device.rssi} dBm',
                                style: const TextStyle(
                                  fontFamily: AppTokens.fontMono,
                                  fontSize: AppTokens.fsMicro,
                                  color: AppTokens.cMut,
                                  fontWeight: AppTokens.fsMiniW,
                                ),
                              ),
                              if (variant == DeviceCardVariant.conn) ...[
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    device.connMeta ?? '已连接 · 可进行 GATT 调试',
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: AppTokens.fsMini,
                                      color: AppTokens.cMut,
                                    ),
                                  ),
                                ),
                              ],
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
                    if (_isShid && variant == DeviceCardVariant.scan) ...[
                      Expanded(
                        child: AppButton(
                          key: const ValueKey('shidConfigureBtn'),
                          label: '配置 Smart HID',
                          tone: AppButtonTone.primary,
                          size: AppButtonSize.sm,
                          icon: 'hid',
                          disabled: connected,
                          onTap: () => onConfigure?.call(device),
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    if (variant == DeviceCardVariant.scan)
                      Expanded(
                        child: AppButton(
                          label: connected ? '已连接' : '连接',
                          tone: connected || _isShid
                              ? AppButtonTone.soft
                              : AppButtonTone.primary,
                          size: AppButtonSize.sm,
                          icon: 'link',
                          disabled: connected,
                          onTap: () => onConnect?.call(device),
                        ),
                      ),
                    if (variant == DeviceCardVariant.conn)
                      Expanded(
                        child: AppButton(
                          label: '断开',
                          tone: AppButtonTone.soft,
                          size: AppButtonSize.sm,
                          dangerText: true,
                          onTap: () => onDisconnect?.call(device),
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
}

enum DeviceCardVariant { scan, conn }

/// 页面无关的设备卡数据契约（页面层自行从各自 model 映射）。
class BleDeviceCardData {
  const BleDeviceCardData({
    required this.deviceId,
    required this.rssi,
    this.name = '',
    this.matchLevel,
    this.connMeta,
  });

  final String deviceId;
  final String name;
  final int rssi;
  final String? matchLevel; // 'STRONG' | 'WEAK' | null
  final String? connMeta; // conn 变体 meta 文案
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.letter, required this.shid, this.showOnBadge = false});

  final String letter;
  final bool shid;
  final bool showOnBadge;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 44,
      height: 44,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppTokens.rMd),
              gradient: shid
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppTokens.shidAvatarStart, AppTokens.cSuccessWeak],
                    )
                  : const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppTokens.cPrimaryWeak, AppTokens.avatarGradEnd],
                    ),
            ),
            child: Text(
              letter,
              style: TextStyle(
                fontSize: 17,
                fontWeight: AppTokens.fwXbold,
                color: shid ? AppTokens.cSuccessDeep : AppTokens.cPrimary,
              ),
            ),
          ),
          if (showOnBadge)
            Positioned(
              right: -4,
              bottom: -4,
              child: Container(
                width: 15,
                height: 15,
                decoration: BoxDecoration(
                  color: AppTokens.cSuccess,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppTokens.cCard, width: 2),
                ),
                child: const Center(
                  child: AppIcon('check', size: 13, color: AppTokens.cCard),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// RSSI 四格信号条（C1 登记：格宽 3 / 高 4·7·10·12；q≥3 success / q2 warning×2 / q1 danger）。
class SignalBars extends StatelessWidget {
  const SignalBars({super.key, required this.level});

  final int level;

  static const List<double> _heights = [4, 7, 10, 12];

  @override
  Widget build(BuildContext context) {
    Color barColor(int i) {
      // i 为 1 基格序
      if (level >= 4) return AppTokens.cSuccess;
      if (level == 3 && i <= 3) return AppTokens.cSuccess;
      if (level == 2 && i <= 2) return AppTokens.cWarning;
      if (level == 1 && i == 1) return AppTokens.cDanger;
      return AppTokens.cLine;
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
              height: _heights[i],
              decoration: BoxDecoration(
                color: barColor(i + 1),
                borderRadius: BorderRadius.circular(1),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
