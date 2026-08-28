/**
 * BLE 错误归一化。
 *
 * uni/wx 的 fail 回调给的是 `{ errCode, errMsg }` 普通对象，而 UI 层普遍读
 * `error.message` —— 不归一化时所有友好文案都会退化为兜底字符串。这里统一
 * 转成 Error：message 为可直接展示的中文提示，errCode / rawMessage 保留给
 * 诊断面板，不再透传 errMsg（避免消费方又读到原始英文）。
 */

const WECHAT_BLE_ERROR_HINTS = {
  10000: '蓝牙适配器尚未初始化，请重新操作',
  10001: '蓝牙开关未打开，请在系统设置中开启蓝牙',
  10002: '未找到指定设备，请先扫描并靠近设备',
  10003: '连接失败，请靠近设备后重试',
  10004: '未找到指定服务，设备固件可能不兼容',
  10005: '未找到指定特征值，设备固件可能不兼容',
  10006: '连接已断开，请重新连接设备',
  10007: '当前特征值不支持该操作',
  10008: '系统蓝牙异常，请重启蓝牙后重试',
  10009: '当前系统不支持该蓝牙能力',
  10010: '设备已连接，无需重复连接',
  10011: '设备需要配对，请在系统弹窗中确认',
  10012: '操作超时，请靠近设备后重试',
  10013: '下发数据无效，请检查内容格式'
};

export function normalizeBleError(error, fallback = '蓝牙操作失败') {
  if (error instanceof Error && !('errCode' in error) && !('errMsg' in error)) return error;
  const errCode = error?.errCode ?? error?.code ?? null;
  const raw = String(error?.errMsg || error?.message || fallback);
  const hint = WECHAT_BLE_ERROR_HINTS[errCode] || '';
  const normalized = new Error(hint ? `${hint}（errCode ${errCode}）` : raw);
  normalized.errCode = errCode;
  normalized.rawMessage = raw;
  return normalized;
}
