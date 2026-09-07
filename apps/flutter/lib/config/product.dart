/// 产品基准常量 —— 与 apps/uniapp/config/product.js 同源对齐（docs/specs 02_product 口径）
class ProductConfig {
  static const String name = 'BLE Toolkit+';
  static const String tagline = '零后端 · 零本地持久化';
  static const String website = 'https://lightble.i2kai.com/';
  static const String feedback =
      'https://gitee.com/luoyaosheng/smart-ble/issues';

  /// F028 推广跳转（与 uniapp RELATED_MINI_PROGRAMS 一致；原生端以 URL 打开）
  /// abbr/bg/color 为 p009 正典 .promo .ic 缩写块数据（替代位图图标）
  static const List<PromoApp> promos = [
    PromoApp(
      name: '萌喵圈',
      description: '看猫片、做问候图和轻量 AI 创作，把宠物内容变成可爱又治愈的分享素材。',
      abbr: '萌喵',
      bg: '#FFEDF2',
      color: '#E06C9A',
      url: 'https://cutemeowcircle.anxiqing.cn',
    ),
    PromoApp(
      name: '宝宝点滴',
      description: '记录喂奶、换尿布、睡眠和成长数据，帮家人一起照看宝宝的日常节奏。',
      abbr: '宝宝',
      bg: '#FFF3E2',
      color: '#C77E14',
      url: 'https://babydiary.anxiqing.cn',
    ),
  ];
}

class PromoApp {
  final String name;
  final String description;
  final String abbr;
  final String bg;
  final String color;
  final String url;

  const PromoApp({
    required this.name,
    required this.description,
    required this.abbr,
    required this.bg,
    required this.color,
    required this.url,
  });
}
