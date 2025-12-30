import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../themes/app_theme.dart';
import '../pages/device_list_page.dart';

/// 过滤面板组件
class FilterPanel extends ConsumerWidget {
  final bool expanded;
  final VoidCallback onToggleExpanded;

  const FilterPanel({
    super.key,
    required this.expanded,
    required this.onToggleExpanded,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filterRssi = ref.watch(filterRssiProvider);
    final filterNamePrefix = ref.watch(filterNamePrefixProvider);
    final filterHideUnnamed = ref.watch(filterHideUnnamedProvider);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: expanded ? 16 : 8,
      ),
      decoration: BoxDecoration(
        color: AppTheme.backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 过滤按钮
          InkWell(
            onTap: onToggleExpanded,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                children: [
                  Icon(
                    expanded ? Icons.expand_less : Icons.expand_more,
                    color: AppTheme.primaryColor,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    '过滤条件',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  if (_hasActiveFilter(filterRssi, filterNamePrefix, filterHideUnnamed))
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        _getActiveFilterCount(filterRssi, filterNamePrefix, filterHideUnnamed).toString(),
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppTheme.primaryColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // 过滤选项
          if (expanded) ...[
            const Divider(height: 24),
            _buildRssiFilter(context, ref, filterRssi),
            const SizedBox(height: 16),
            _buildNameFilter(context, ref, filterNamePrefix),
            const SizedBox(height: 16),
            _buildHideUnnamedFilter(context, ref, filterHideUnnamed),
            const SizedBox(height: 12),
            _buildResetButton(context, ref),
          ],
        ],
      ),
    );
  }

  Widget _buildRssiFilter(BuildContext context, WidgetRef ref, int value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('信号强度', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
            Text(
              value > -100 ? '≥ $value dBm' : '全部',
              style: TextStyle(
                fontSize: 12,
                color: value > -100 ? AppTheme.primaryColor : AppTheme.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Slider(
          value: value.toDouble(),
          min: -100,
          max: -30,
          divisions: 70,
          activeColor: AppTheme.primaryColor,
          label: value > -100 ? '$value dBm' : '全部',
          onChanged: (newValue) {
            ref.read(filterRssiProvider.notifier).state = newValue.round();
          },
        ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildQuickRssiButton(context, ref, -100, '全部'),
            _buildQuickRssiButton(context, ref, -90, '-90'),
            _buildQuickRssiButton(context, ref, -70, '-70'),
            _buildQuickRssiButton(context, ref, -50, '-50'),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickRssiButton(BuildContext context, WidgetRef ref, int value, String label) {
    final currentValue = ref.watch(filterRssiProvider);
    final isSelected = currentValue == value;

    return InkWell(
      onTap: () => ref.read(filterRssiProvider.notifier).state = value,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryColor : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isSelected ? AppTheme.primaryColor : AppTheme.borderColor,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isSelected ? Colors.white : AppTheme.textSecondary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildNameFilter(BuildContext context, WidgetRef ref, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('名称前缀', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        TextField(
          controller: TextEditingController(text: value)..selection = TextSelection.fromPosition(TextPosition(offset: value.length)),
          decoration: InputDecoration(
            hintText: '输入设备名称前缀...',
            hintStyle: TextStyle(color: AppTheme.textSecondary.withOpacity(0.6)),
            prefixIcon: const Icon(Icons.search, size: 18),
            suffixIcon: value.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () => ref.read(filterNamePrefixProvider.notifier).state = '',
                  )
                : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppTheme.borderColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppTheme.borderColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppTheme.primaryColor),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            isDense: true,
          ),
          style: const TextStyle(fontSize: 13),
          onChanged: (value) => ref.read(filterNamePrefixProvider.notifier).state = value,
        ),
      ],
    );
  }

  Widget _buildHideUnnamedFilter(BuildContext context, WidgetRef ref, bool value) {
    return InkWell(
      onTap: () => ref.read(filterHideUnnamedProvider.notifier).state = !value,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Row(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: value ? AppTheme.primaryColor : Colors.transparent,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                  color: value ? AppTheme.primaryColor : AppTheme.borderColor,
                  width: 2,
                ),
              ),
              child: value
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 12),
            const Text('隐藏无名设备', style: TextStyle(fontSize: 14)),
          ],
        ),
      ),
    );
  }

  Widget _buildResetButton(BuildContext context, WidgetRef ref) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () {
          ref.read(filterRssiProvider.notifier).state = -100;
          ref.read(filterNamePrefixProvider.notifier).state = '';
          ref.read(filterHideUnnamedProvider.notifier).state = false;
        },
        icon: const Icon(Icons.refresh, size: 16),
        label: const Text('重置过滤条件'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppTheme.textSecondary,
          padding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }

  bool _hasActiveFilter(int rssi, String namePrefix, bool hideUnnamed) {
    return rssi > -100 || namePrefix.isNotEmpty || hideUnnamed;
  }

  int _getActiveFilterCount(int rssi, String namePrefix, bool hideUnnamed) {
    int count = 0;
    if (rssi > -100) count++;
    if (namePrefix.isNotEmpty) count++;
    if (hideUnnamed) count++;
    return count;
  }
}
