// 正典图标镜像（35 枚）——来源：docs/specs/prototype/v1-new/index.html 内联 sprite。
// 规范：TOKEN.md §7（24×24 线性 / stroke 1.8 / currentColor）。跨端视觉门（PARITY-ICON）唯一字形来源，
// 本文件是受锁定镜像：增删改图标必须先改原型 sprite，再经 icon-gen 重生成三处镜像。
// 占位符：{C}=图标色（AppIcon 渲染时注入）；{KNOB}=旋钮底色（默认白）。
export const APP_ICON_NAMES = ["scan","bt","link","cast","info","share","chev-r","chev-d","check","x","warn","copy","refresh","play","stop","qr","wifi","usb","send","eye","eye-off","trash","chip","log","set","lock","doc","ext","hid","pulse","folder","dl","box","signal","batt"];

export const APP_ICONS = {
  'scan': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"M16.5 16.5L21 21M11 8v6M8 11h6\"/></g>",
  'bt': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 7l10 10-5 4V3l5 4L7 17\"/></g>",
  'link': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.72-1.71\"/></g>",
  'cast': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"{C}\" stroke=\"none\"/><path d=\"M8.2 15.8a5.4 5.4 0 010-7.6M15.8 8.2a5.4 5.4 0 010 7.6M5.3 18.7a9.5 9.5 0 010-13.4M18.7 5.3a9.5 9.5 0 010 13.4\"/></g>",
  'info': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5\"/><circle cx=\"12\" cy=\"8\" r=\"0.6\" fill=\"{C}\"/></g>",
  'share': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"18\" cy=\"5\" r=\"2.6\"/><circle cx=\"6\" cy=\"12\" r=\"2.6\"/><circle cx=\"18\" cy=\"19\" r=\"2.6\"/><path d=\"M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3\"/></g>",
  'chev-r': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 6l6 6-6 6\"/></g>",
  'chev-d': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 9l6 6 6-6\"/></g>",
  'check': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 12.5l4.5 4.5L19 7\"/></g>",
  'x': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M6 6l12 12M18 6L6 18\"/></g>",
  'warn': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5L2.5 19.5h19z\"/><path d=\"M12 10v4\"/><circle cx=\"12\" cy=\"16.8\" r=\"0.6\" fill=\"{C}\"/></g>",
  'copy': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"2.5\"/><path d=\"M5 15H4.5A1.5 1.5 0 013 13.5v-9A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5V5\"/></g>",
  'refresh': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12a9 9 0 11-2.64-6.36\"/><path d=\"M21 3v6h-6\"/></g>",
  'play': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linejoin=\"round\"><path d=\"M7 4.8l14 7.2-14 7.2z\"/></g>",
  'stop': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linejoin=\"round\"><rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/></g>",
  'qr': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1.5\"/><path d=\"M14 14h3v3h-3zM20 14v3M14 20h6\"/></g>",
  'wifi': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\"><path d=\"M2.5 9.5a14 14 0 0119 0M5.5 13a10 10 0 0113 0M8.7 16.4a5.5 5.5 0 016.6 0\"/><circle cx=\"12\" cy=\"19.4\" r=\"0.7\" fill=\"{C}\" stroke=\"none\"/></g>",
  'usb': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 7V3.5M15 7V3.5M7 7h10v4.5a5 5 0 01-10 0zM12 16.5v4\"/><path d=\"M9.5 20.5h5\"/></g>",
  'send': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21.5 2.5L11 13M21.5 2.5l-7 19-3.5-8.5-8.5-3.5z\"/></g>",
  'eye': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></g>",
  'eye-off': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2 12s3.5-6.5 10-6.5c1.8 0 3.4.5 4.7 1.3M22 12s-3.5 6.5-10 6.5c-1.8 0-3.4-.5-4.7-1.3\"/><path d=\"M4 20L20 4\"/></g>",
  'trash': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.5 6.5h17M8 6.5V4.8A1.3 1.3 0 019.3 3.5h5.4A1.3 1.3 0 0116 4.8v1.7M19 6.5v13a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19.5v-13\"/><path d=\"M10 11v6M14 11v6\"/></g>",
  'chip': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2.5\"/><rect x=\"10\" y=\"10\" width=\"4\" height=\"4\" rx=\"1\"/><path d=\"M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5\"/></g>",
  'log': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 2.5H6.5A1.5 1.5 0 005 4v16a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0019 20V7.5z\"/><path d=\"M14 2.5v5h5M8.5 13h7M8.5 16.5h4.5\"/></g>",
  'set': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 7h16M4 12h16M4 17h16\"/><circle cx=\"9\" cy=\"7\" r=\"2\" fill=\"{KNOB}\"/><circle cx=\"15\" cy=\"12\" r=\"2\" fill=\"{KNOB}\"/><circle cx=\"8\" cy=\"17\" r=\"2\" fill=\"{KNOB}\"/></g>",
  'lock': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"5\" y=\"10.5\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 10.5V7a4 4 0 018 0v3.5M12 14.5v2.5\"/></g>",
  'doc': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 2.5H6.5A1.5 1.5 0 005 4v16a1.5 1.5 0 001.5 1.5h11A1.5 1.5 0 0019 20V7.5z\"/><path d=\"M14 2.5v5h5\"/></g>",
  'ext': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13.5 4.5H19.5V10.5M19.5 4.5L11 13M19.5 13.5V19a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 19V6A1.5 1.5 0 015 4.5h5.5\"/></g>",
  'hid': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2.5\" y=\"6.5\" width=\"19\" height=\"11\" rx=\"2\"/><path d=\"M6.5 10v.5M9.5 10v.5M12 10v.5M14.5 10v.5M17.5 10v.5M7.5 14h9\"/></g>",
  'pulse': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.5 12H6l2.5-6 4.5 12 2.5-6h6\"/></g>",
  'folder': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.5 6.5A1.5 1.5 0 015 5h4.5l2 2.5H19a1.5 1.5 0 011.5 1.5v10A1.5 1.5 0 0119 20.5H5a1.5 1.5 0 01-1.5-1.5z\"/></g>",
  'dl': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3.5v11M7.5 10L12 14.5 16.5 10M4 17.5v1.5a1.5 1.5 0 001.5 1.5h13a1.5 1.5 0 001.5-1.5v-1.5\"/></g>",
  'box': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 7.5l-9-5-9 5v9l9 5 9-5z\"/><path d=\"M3 7.5l9 5 9-5M12 12.5v9\"/></g>",
  'signal': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"2\" stroke-linecap=\"round\"><path d=\"M4 18h1.5M9 14.5v3.5M14 10.5v7.5M19 6.5v11.5\"/></g>",
  'batt': "<g fill=\"none\" stroke=\"{C}\" stroke-width=\"1.6\"><rect x=\"1.5\" y=\"6\" width=\"18\" height=\"12\" rx=\"3\"/><path d=\"M22 10.5v3\" stroke-linecap=\"round\"/><rect x=\"4\" y=\"8.5\" width=\"10\" height=\"7\" rx=\"1.5\" fill=\"{C}\" stroke=\"none\"/></g>",
};
