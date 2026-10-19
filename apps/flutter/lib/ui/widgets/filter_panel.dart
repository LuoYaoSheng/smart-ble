import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../themes/app_theme.dart';
import '../../core/design/app_icons.dart';
import '../pages/device_list_page.dart';

/// 过滤行面板（正典 p001 .filter）：最弱信号四档 / 阈值滑杆 / 名称前缀 / 隐藏无名+重置。
/// 展开收起由宿主页 sec-t 的「筛选」txtlink 控制（本组件只承载行内容）。
class FilterPanel extends ConsumerWidget {
  const FilterPanel({super.key});

  static const _presets = [
    (value: -40, label: '强 [-40]'),
    (value: -60, label: '较好 [-60]'),
    (value: -70, label: '一般 [-70]'),
    (value: -85, label: '弱 [-85]'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filterRssi = ref.watch(filterRssiProvider);
    final filterNamePrefix = ref.watch(filterNamePrefixProvider);
    final filterHideUnnamed = ref.watch(filterHideUnnamedProvider);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE3EAF3)),
      ),
      child: Column(
        children: [
          // 行 1：最弱信号 + 四档预设（正典 .pre：激活档主色底白字）
          Row(
            children: [
              const SizedBox(
                width: 64,
                child: Text('最弱信号', style: _lbStyle),
              ),
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  alignment: WrapAlignment.end,
                  children: [
                    for (final preset in _presets)
                      _PresetPill(
                        label: preset.label,
                        active: filterRssi == preset.value,
                        onTap: () => ref
                            .read(filterRssiProvider.notifier)
                            .state = preset.value,
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // 行 2：阈值 + 滑杆（-100..-40 步进 5）
          Row(
            children: [
              SizedBox(
                width: 64,
                child: Text('阈值 $filterRssi dBm', style: _lbStyle),
              ),
              Expanded(
                child: Slider(
                  value: filterRssi.toDouble(),
                  min: -100,
                  max: -40,
                  divisions: 12,
                  activeColor: AppTheme.primaryColor,
                  label: '$filterRssi dBm',
                  onChanged: (newValue) {
                    ref.read(filterRssiProvider.notifier).state =
                        newValue.round();
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // 行 3：名称前缀 + 输入框
          Row(
            children: [
              const SizedBox(
                width: 64,
                child: Text('名称前缀', style: _lbStyle),
              ),
              Expanded(child: _NameFilterField(value: filterNamePrefix)),
            ],
          ),
          const SizedBox(height: 10),

          // 行 4：隐藏无名 + 开关 + 弹性留白 + 重置过滤（soft sm）
          Row(
            children: [
              const SizedBox(
                width: 64,
                child: Text('隐藏无名', style: _lbStyle),
              ),
              Transform.scale(
                scale: 0.8,
                child: Switch(
                  value: filterHideUnnamed,
                  activeTrackColor: const Color(0xFF17C7A8),
                  onChanged: (value) =>
                      ref.read(filterHideUnnamedProvider.notifier).state =
                          value,
                ),
              ),
              const Spacer(),
              OutlinedButton(
                onPressed: () {
                  ref.read(filterRssiProvider.notifier).state = -100;
                  ref.read(filterNamePrefixProvider.notifier).state = '';
                  ref.read(filterHideUnnamedProvider.notifier).state = false;
                },
                style: OutlinedButton.styleFrom(
                  backgroundColor: const Color(0xFFF1F5FB),
                  side: const BorderSide(color: Color(0xFFE3EAF3)),
                  foregroundColor: const Color(0xFF18222E),
                  minimumSize: const Size(0, 32),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  textStyle: const TextStyle(fontSize: 13),
                ),
                child: const Text('重置过滤'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static const _lbStyle = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: Color(0xFF60758D),
  );
}

/// 四档预设 pill（正典 .pre / .pre.on）
class _PresetPill extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _PresetPill({
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? AppTheme.primaryColor : const Color(0xFFF1F5FB),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: active ? FontWeight.w600 : FontWeight.w600,
            color: active ? Colors.white : const Color(0xFF42536A),
          ),
        ),
      ),
    );
  }
}

/// 前缀输入框：controller 由 State 持有，只在「外部值变化」（重置/清除）
/// 时回写，用户键入路径不重建 controller——否则每次键入触发 provider 变化
/// →重建→换 controller，IME 连接失同步（光标跳动/后续输入不生效）。
/// （WIN-FAND-002）
class _NameFilterField extends ConsumerStatefulWidget {
  const _NameFilterField({required this.value});

  final String value;

  @override
  ConsumerState<_NameFilterField> createState() => _NameFilterFieldState();
}

class _NameFilterFieldState extends ConsumerState<_NameFilterField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.value);
  }

  @override
  void didUpdateWidget(covariant _NameFilterField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _controller.text) {
      _controller.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.fromPosition(
            TextPosition(offset: widget.value.length)),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      decoration: InputDecoration(
        hintText: '如 SHID / LightBLE',
        hintStyle:
            TextStyle(color: AppTheme.textSecondary.withValues(alpha: 0.6)),
        suffixIcon: widget.value.isNotEmpty
            ? IconButton(
                icon: const AppIcon('x', size: 18),
                onPressed: () =>
                    ref.read(filterNamePrefixProvider.notifier).state = '',
              )
            : null,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppTheme.primaryColor),
        ),
        fillColor: const Color(0xFFF1F5FB),
        filled: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        isDense: true,
      ),
      style: const TextStyle(fontSize: 13),
      onChanged: (value) =>
          ref.read(filterNamePrefixProvider.notifier).state = value,
    );
  }
}
