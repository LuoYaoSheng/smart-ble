import 'package:flutter/material.dart';
import '../../core/models/ble_service.dart';
import '../../themes/app_theme.dart';

/// 服务项组件
class ServiceTile extends StatefulWidget {
  final BleService service;
  final Function(BleCharacteristic) onRead;
  final Function(BleCharacteristic) onWrite;
  final Function(BleCharacteristic) onToggleNotify;

  const ServiceTile({
    super.key,
    required this.service,
    required this.onRead,
    required this.onWrite,
    required this.onToggleNotify,
  });

  @override
  State<ServiceTile> createState() => _ServiceTileState();
}

class _ServiceTileState extends State<ServiceTile> {
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Theme(
        data: Theme.of(context).copyWith(
          dividerColor: Colors.transparent,
          expansionTileTheme: const ExpansionTileThemeData(
            shape: Border.none,
          ),
        ),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          initiallyExpanded: false,
          onExpansionChanged: (expanded) {
            setState(() {
              widget.service.expanded = expanded;
            });
          },
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.settings_input_antenna,
              color: AppTheme.primaryColor,
              size: 20,
            ),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.service.displayName,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                widget.service.shortUuid,
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
          trailing: _buildTrailing(),
          children: [
            // 特征值列表
            if (widget.service.characteristics.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('无特征值', style: TextStyle(color: AppTheme.textSecondary)),
              )
            else
              ...widget.service.characteristics.map((char) => _CharacteristicTile(
                    characteristic: char,
                    onRead: () => widget.onRead(char),
                    onWrite: () => widget.onWrite(char),
                    onToggleNotify: () => widget.onToggleNotify(char),
                  )),
          ],
        ),
      ),
    );
  }

  Widget _buildTrailing() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        '${widget.service.characteristics.length} 特征值',
        style: const TextStyle(
          fontSize: 12,
          color: AppTheme.primaryColor,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

/// 特征值项
class _CharacteristicTile extends StatelessWidget {
  final BleCharacteristic characteristic;
  final VoidCallback onRead;
  final VoidCallback onWrite;
  final VoidCallback onToggleNotify;

  const _CharacteristicTile({
    required this.characteristic,
    required this.onRead,
    required this.onWrite,
    required this.onToggleNotify,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      decoration: BoxDecoration(
        color: AppTheme.backgroundColor,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        leading: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: characteristic.notifying
                ? AppTheme.successColor.withOpacity(0.1)
                : Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: characteristic.notifying
                  ? AppTheme.successColor
                  : AppTheme.borderColor,
              width: 1,
            ),
          ),
          child: Icon(
            _getIcon(),
            size: 18,
            color: characteristic.notifying
                ? AppTheme.successColor
                : AppTheme.textSecondary,
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              characteristic.displayName,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            Text(
              characteristic.shortUuid,
              style: TextStyle(
                fontSize: 11,
                color: AppTheme.textSecondary,
                fontFamily: 'monospace',
              ),
            ),
          ],
        ),
        subtitle: _buildPropertiesChips(),
        trailing: _buildActionButtons(),
      ),
    );
  }

  IconData _getIcon() {
    if (characteristic.notifying) return Icons.notifications_active;
    if (characteristic.canRead) return Icons.read_more;
    if (characteristic.canWrite) return Icons.edit;
    return Icons.settings_input_component;
  }

  Widget _buildPropertiesChips() {
    final chips = <Widget>[];

    if (characteristic.canRead) {
      chips.add(_PropertyChip(label: 'Read', color: AppTheme.primaryColor));
    }
    if (characteristic.canWrite) {
      chips.add(_PropertyChip(label: 'Write', color: AppTheme.warningColor));
    }
    if (characteristic.canNotify) {
      chips.add(_PropertyChip(
        label: characteristic.notifying ? 'Notifying' : 'Notify',
        color: characteristic.notifying ? AppTheme.successColor : AppTheme.textSecondary,
      ));
    }

    if (chips.isEmpty) {
      return const Text(
        '无权限',
        style: TextStyle(fontSize: 11, color: AppTheme.textSecondary),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Wrap(
        spacing: 4,
        runSpacing: 4,
        children: chips,
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (characteristic.canRead)
          IconButton(
            icon: const Icon(Icons.download, size: 18),
            onPressed: onRead,
            tooltip: '读取',
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            padding: const EdgeInsets.all(4),
          ),
        if (characteristic.canWrite)
          IconButton(
            icon: const Icon(Icons.upload, size: 18),
            onPressed: onWrite,
            tooltip: '写入',
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            padding: const EdgeInsets.all(4),
          ),
        if (characteristic.canNotify)
          IconButton(
            icon: Icon(
              characteristic.notifying ? Icons.notifications_active : Icons.notifications_none,
              size: 18,
            ),
            onPressed: onToggleNotify,
            tooltip: characteristic.notifying ? '停止通知' : '启用通知',
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            padding: const EdgeInsets.all(4),
            color: characteristic.notifying ? AppTheme.successColor : null,
          ),
      ],
    );
  }
}

/// 属性标签
class _PropertyChip extends StatelessWidget {
  final String label;
  final Color color;

  const _PropertyChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.3), width: 0.5),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
