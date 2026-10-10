import 'package:flutter/material.dart';
import 'app_tokens.dart';
import 'app_icon.dart';
import 'app_chip.dart';
import 'app_button.dart';
import 'app_status_icon.dart';

/// 正典 GATT 服务树（COMPONENT_CONTRACT C4 · 原型 p006 服务面板五态）
///
/// state: idle / connecting / ready / empty / error。
class ServicePanel extends StatelessWidget {
  const ServicePanel({
    super.key,
    required this.state,
    this.services = const [],
    this.expanded = const {},
    this.notifying = const {},
    this.errorText,
    this.emptyText,
    this.idleText = '点击「连接设备」建立 GATT 会话。',
    this.connectingText = '正在连接设备（10s 超时 · 失败自动重试 3 次）',
    this.onToggleService,
    this.onRead,
    this.onWrite,
    this.onNotify,
    this.onRetry,
  });

  final ServicePanelState state;
  final List<AppGattService> services;
  final Map<int, bool> expanded;
  final Map<String, bool> notifying;
  final String? errorText;
  final String? emptyText;
  final String idleText;
  final String connectingText;
  final void Function(int index)? onToggleService;
  final void Function(AppGattCharacteristic char)? onRead;
  final void Function(AppGattCharacteristic char)? onWrite;
  final void Function(AppGattCharacteristic char)? onNotify;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    switch (state) {
      case ServicePanelState.idle:
      case ServicePanelState.connecting:
        return _op(
          spinner: true,
          title: state == ServicePanelState.idle ? '未初始化' : '连接中…',
          desc: state == ServicePanelState.idle ? idleText : connectingText,
        );
      case ServicePanelState.empty:
        return _op(
          icon: const AppStatusIcon(state: AppStatusIconState.warn),
          title: '服务发现完成 · 列表为空',
          desc: emptyText ?? '该设备未暴露任何 GATT 服务（或权限受限）。',
        );
      case ServicePanelState.error:
        return _op(
          icon: const AppStatusIcon(state: AppStatusIconState.fail),
          title: '连接失败',
          desc: errorText ?? '连接超时（10s），已自动重试 3 次仍未成功。',
          retry: true,
        );
      case ServicePanelState.ready:
        return Column(
          children: [
            for (var i = 0; i < services.length; i++)
              _ServiceNode(
                service: services[i],
                open: expanded[i] ?? false,
                notifying: notifying,
                onToggle: () => onToggleService?.call(i),
                onRead: onRead,
                onWrite: onWrite,
                onNotify: onNotify,
              ),
          ],
        );
    }
  }

  Widget _op({
    bool spinner = false,
    Widget? icon,
    required String title,
    required String desc,
    bool retry = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppTokens.sp4),
      decoration: BoxDecoration(
        color: AppTokens.cCard,
        borderRadius: BorderRadius.circular(AppTokens.rLg),
        border: Border.all(color: AppTokens.cLine),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (spinner)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            )
          else if (icon != null)
            icon,
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: AppTokens.fsH2, fontWeight: AppTokens.fsH2W)),
                const SizedBox(height: 3),
                Text(desc,
                    style: const TextStyle(
                        fontSize: AppTokens.fsBody,
                        color: AppTokens.cSub,
                        height: 1.55)),
                if (retry)
                  Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: AppButton(
                      label: '重试',
                      tone: AppButtonTone.ghost,
                      size: AppButtonSize.sm,
                      icon: 'refresh',
                      onTap: onRetry,
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

enum ServicePanelState { idle, connecting, ready, empty, error }

class AppGattService {
  const AppGattService({
    required this.uuid,
    required this.name,
    required this.chars,
    this.ota = false,
  });

  final String uuid;
  final String name;
  final List<AppGattCharacteristic> chars;
  final bool ota;
}

class AppGattCharacteristic {
  const AppGattCharacteristic({
    required this.uuid,
    required this.name,
    required this.props,
  });

  final String uuid;
  final String name;
  final AppGattCharProps props;
}

class AppGattCharProps {
  const AppGattCharProps({this.read = false, this.write = false, this.notify = false});

  final bool read;
  final bool write;
  final bool notify;
}

class _ServiceNode extends StatelessWidget {
  const _ServiceNode({
    required this.service,
    required this.open,
    required this.notifying,
    this.onToggle,
    this.onRead,
    this.onWrite,
    this.onNotify,
  });

  final AppGattService service;
  final bool open;
  final Map<String, bool> notifying;
  final VoidCallback? onToggle;
  final void Function(AppGattCharacteristic)? onRead;
  final void Function(AppGattCharacteristic)? onWrite;
  final void Function(AppGattCharacteristic)? onNotify;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppTokens.sp3),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppTokens.cCard,
        borderRadius: BorderRadius.circular(AppTokens.rLg),
        border: Border.all(color: AppTokens.cLine),
        boxShadow: AppTokens.shadow1,
      ),
      child: Column(
        children: [
          Material(
            color: AppTokens.cCard,
            child: InkWell(
              onTap: onToggle,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(
                  children: [
                    AppIcon(service.ota ? 'dl' : 'chip',
                        size: 17,
                        color: service.ota ? AppTokens.cDanger : AppTokens.cPrimary),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        service.name,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: AppTokens.fsH2,
                          fontWeight: AppTokens.fsH2W,
                          color: AppTokens.cText,
                        ),
                      ),
                    ),
                    AppChip('${service.uuid.substring(0, 8)}…', tone: AppChipTone.mono),
                    const SizedBox(width: 9),
                    AnimatedRotation(
                      turns: open ? 0.25 : 0,
                      duration: const Duration(milliseconds: AppTokens.durFast),
                      child: const AppIcon('chev-r', size: 17, color: AppTokens.cMut),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (open)
            Container(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppTokens.cLineSoft)),
              ),
              child: Column(
                children: [
                  for (final ch in service.chars)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: const BoxDecoration(
                        border: Border(
                            bottom: BorderSide(color: AppTokens.cLineSoft)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  ch.name,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: AppTokens.fsBody,
                                    fontWeight: AppTokens.fsBodyW,
                                    color: AppTokens.cText,
                                  ),
                                ),
                              ),
                              if (ch.props.read)
                                const AppChip('read', tone: AppChipTone.primary),
                              if (ch.props.write) ...[
                                const SizedBox(width: 6),
                                const AppChip('write', tone: AppChipTone.success),
                              ],
                              if (ch.props.notify) ...[
                                const SizedBox(width: 6),
                                const AppChip('notify', tone: AppChipTone.warning),
                              ],
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              if (ch.props.read) ...[
                                AppButton(
                                    label: '读取',
                                    tone: AppButtonTone.soft,
                                    size: AppButtonSize.sm,
                                    onTap: () => onRead?.call(ch)),
                                const SizedBox(width: 6),
                              ],
                              if (ch.props.write) ...[
                                AppButton(
                                    label: '写入',
                                    tone: AppButtonTone.soft,
                                    size: AppButtonSize.sm,
                                    onTap: () => onWrite?.call(ch)),
                                const SizedBox(width: 6),
                              ],
                              if (ch.props.notify)
                                AppButton(
                                  label: (notifying[ch.uuid] ?? false)
                                      ? '停止监听'
                                      : '开始监听',
                                  tone: AppButtonTone.ghost,
                                  size: AppButtonSize.sm,
                                  onTap: () => onNotify?.call(ch),
                                ),
                            ],
                          ),
                        ],
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
