//
// SmartBLE Desktop - 产品与推广配置（F028/F029）
//
// apps/uniapp/config/product.js 的锁定镜像（E-WIN/T-WIN 共用同一字节）。
// F028 桌面口径（10_platform/PLATFORM_EXTENSION §4）：推广跳转 = 落地页（系统浏览器）
// + 小程序码（可下载；release metadata wechat_qr 未发布时如实显示未发布）。
// F029 桌面口径：分享 = 导出文本/文件（复制 + 下载 .txt）。
//

(function (root) {
  'use strict';

  const PRODUCT_INFO = {
    name: 'BLE Toolkit+',
    summary: '面向 UniApp、微信小程序与 ESP32 协同验证的 BLE 调试工具。',
    website: 'https://lightble.i2kai.com/',
    feedback: 'https://gitee.com/luoyaosheng/smart-ble/issues',
  };

  const PRODUCT_FEATURES = [
    '设备扫描',
    '智能过滤',
    '快速连接',
    '数据读写',
    '通知监听',
    '广播模式',
  ];

  const RELATED_MINI_PROGRAMS = [
    {
      name: '萌喵圈',
      description: '看猫片、做问候图和轻量 AI 创作，把宠物内容变成可爱又治愈的分享素材。',
      abbr: '萌喵',
      bg: '#FFEDF2',
      color: '#E06C9A',
      url: 'https://cutemeowcircle.anxiqing.cn',
      miniProgram: { appId: 'wxe0ed0e6727a0a5cd', path: 'pages/index/index', envVersion: 'release' },
    },
    {
      name: '宝宝点滴',
      description: '记录喂奶、换尿布、睡眠和成长数据，帮家人一起照看宝宝的日常节奏。',
      abbr: '宝宝',
      bg: '#FFF3E2',
      color: '#C77E14',
      url: 'https://babydiary.anxiqing.cn',
      miniProgram: { appId: 'wx1bb2d5c6821a7883', path: 'pages/index/index', envVersion: 'release' },
    },
  ];

  root.SmartBLEProduct = {
    PRODUCT_INFO: PRODUCT_INFO,
    PRODUCT_FEATURES: PRODUCT_FEATURES,
    RELATED_MINI_PROGRAMS: RELATED_MINI_PROGRAMS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
