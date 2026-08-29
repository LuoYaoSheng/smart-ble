/** Pure helpers for App / Mini Program scanCode failure UX. */

export function describeScanCodeFailure(error = {}) {
  const errMsg = String(error?.errMsg || error?.message || '');
  const lower = errMsg.toLowerCase();

  if (/cancel|取消/.test(lower)) {
    return {
      kind: 'cancel',
      title: '已取消扫码',
      content: '未获取配对码。需要时请再次点击扫描 ControlHub 配对码。'
    };
  }

  if (/auth|permission|authorize|权限|deny|denied/.test(lower)) {
    return {
      kind: 'permission',
      title: '无法使用相机',
      content: '请在系统设置中允许本应用使用相机后，再扫描配对码。'
    };
  }

  return {
    kind: 'failed',
    title: '扫码失败',
    content: errMsg || '暂时无法打开扫码。请检查相机是否可用后重试。'
  };
}
