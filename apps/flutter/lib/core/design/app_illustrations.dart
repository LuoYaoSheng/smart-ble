// LOCKED MIRROR —— 请勿手改（生成：icon-gen/gen-ills.js；正典：docs/specs/prototype/v1-new/components/components.js 的 C.ILL）
// 空态插图正典 4 幅：radar / link / doc / box。viewBox 118×86，自配色，透明底（无背景矩形）。
// 命名与内容必须与正典逐字一致（widget_test.dart 断言锁定）。
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

const String kAppIllViewBox = '0 0 118 86';

const List<String> kAppIllNames = ['radar','link','doc','box'];

const Map<String, String> kAppIlls = {
	'radar': '<circle cx="59" cy="46" r="34" stroke="#E3EAF3" stroke-width="2"/> <circle cx="59" cy="46" r="21" stroke="#E3EAF3" stroke-width="2"/> <circle cx="59" cy="46" r="8" stroke="#1B6DFF" stroke-width="2"/> <path d="M59 46L88 20" stroke="#1B6DFF" stroke-width="2" stroke-linecap="round"/> <circle cx="76" cy="54" r="3.5" fill="#17C7A8"/><circle cx="48" cy="34" r="2.5" fill="#9AA8B6"/> <path d="M18 78h82" stroke="#E3EAF3" stroke-width="2" stroke-linecap="round"/>',
	'link': '<path d="M46 40a12 12 0 0017 17l8-8a12 12 0 10-17-17" stroke="#9AA8B6" stroke-width="2.2" stroke-linecap="round"/> <path d="M72 46A12 12 0 0055 29l-8 8a12 12 0 1017 17" stroke="#1B6DFF" stroke-width="2.2" stroke-linecap="round"/> <path d="M24 74h70" stroke="#E3EAF3" stroke-width="2" stroke-linecap="round"/>',
	'doc': '<path d="M46 12h18l12 12v46a4 4 0 01-4 4H50a4 4 0 01-4-4V16a4 4 0 014-4z" stroke="#1B6DFF" stroke-width="2.2" stroke-linejoin="round"/> <path d="M64 12v12h12" stroke="#1B6DFF" stroke-width="2.2" stroke-linejoin="round"/> <path d="M52 42h16M52 50h16M52 58h9" stroke="#9AA8B6" stroke-width="2" stroke-linecap="round"/> <circle cx="88" cy="64" r="5" fill="#17C7A8"/>',
	'box': '<path d="M59 22l24 12v26L59 72 35 60V34z" stroke="#1B6DFF" stroke-width="2.2" stroke-linejoin="round"/> <path d="M35 34l24 12 24-12M59 46v26" stroke="#9AA8B6" stroke-width="2" stroke-linejoin="round"/> <circle cx="59" cy="12" r="3" fill="#17C7A8"/>'
};

/// 正典空态插图（B6 C.ILL 的渲染组件）。默认宽 118 逻辑像素，高度按 118:86 等比。
class AppIll extends StatelessWidget {
  const AppIll(this.name, {super.key, this.width = 118});

  final String name;
  final double width;

  @override
  Widget build(BuildContext context) {
    final body = kAppIlls[name] ?? kAppIlls['box']!;
    return SvgPicture.string(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="$kAppIllViewBox">$body</svg>',
      width: width,
    );
  }
}
