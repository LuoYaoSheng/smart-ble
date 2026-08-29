export function validateAppBroadcastStart({ pluginReady, deviceName, serviceUuid, payload }) {
  if (!pluginReady) return '广播插件未初始化，请重新进入页面后再试。';
  if (!String(deviceName || '').trim()) return '请输入设备名称后再开始广播。';
  if (!String(serviceUuid || '').trim()) return '请输入服务 UUID 后再开始广播。';
  if (!payload?.valid) return payload?.errors?.[0] || '广播数据无效，请检查参数。';
  return '';
}
