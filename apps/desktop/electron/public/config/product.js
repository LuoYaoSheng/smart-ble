//
// SmartBLE Desktop - 产品配置（F029）
//
// 桌面线已按产品决定裁撤 F028 推广卡（“更多小程序”）；
// 2026-09-11 小程序整体裁撤：miniProgram 配置与反馈码通道一并移除。
// F029 桌面口径：分享 = 导出文本/文件（复制 + 下载 .txt）。
//

(function (root) {
  'use strict';

  const PRODUCT_INFO = {
    name: 'BLE Toolkit+',
    summary: '面向 UniApp 与 ESP32 协同验证的 BLE 调试工具。',
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

  root.SmartBLEProduct = {
    PRODUCT_INFO: PRODUCT_INFO,
    PRODUCT_FEATURES: PRODUCT_FEATURES,
  };
})(typeof window !== 'undefined' ? window : globalThis);
