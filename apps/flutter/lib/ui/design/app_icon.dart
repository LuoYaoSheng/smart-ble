// 正典图标入口（UI-PARITY-G0 · COMPONENT_CONTRACT B0）
// 字形与 AppIcon widget 唯一实现：core/design/app_icons.dart
// （prototype/v1-new/index.html sprite 的受锁定镜像，35 枚，widget_test 锁定）。
// 业务代码只允许传 semantic icon id（docs/specs/07_design_system/ICON_CATALOG.md）；
// 颜色一律传 AppTokens.*（lib/ui/design/app_tokens.dart），禁止裸 Color(0xFF...) 圈外值。
// 存量 import core/design/app_icons.dart 继续有效；新代码统一从本文件 import。
export '../../core/design/app_icons.dart' show AppIcon, kAppIconNames, kAppIcons;
