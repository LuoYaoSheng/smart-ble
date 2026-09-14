// 扫描前置权限服务（REQ-005/007/008/009；CAP-02/03/04/05）。
// 2026-09-14 MAC-002：增加可注入平台面——此前版本裸引用全局 `uni`，在 Node
// 单测环境直接 ReferenceError（uni is not defined），无法证明任何行为。
// 默认路径保持真实 UniApp 运行时：能力探测读编译期注入的全局 `uni`，真正的
// 适配器打开始终经 ble-runtime 平台缝（openAdapter），不被测试 mock 替代。

import { openAdapter } from './ble-runtime/index.js';

let platformOverride;
const NO_PLATFORM = Symbol('scan-permission:no-platform');

export function setScanPermissionPlatformForTesting(platform = NO_PLATFORM) {
  platformOverride = platform;
}

export function resetScanPermissionPlatformForTesting() {
  platformOverride = undefined;
}

function resolvePlatformFace() {
  if (platformOverride !== undefined) {
    return platformOverride === NO_PLATFORM ? null : platformOverride;
  }
  const runtime = globalThis.uni;
  return runtime && typeof runtime === 'object' ? runtime : null;
}

const BLUETOOTH_OFF_PATTERN = /not available|未开启|未打开|蓝牙.*(关|开启)/i;
const PERMISSION_DENIED_PATTERN = /auth (deny|denied)|authorize:fail|permission denied|权限.*(拒绝|拒绝)/i;

export async function requestBleScanPermission() {
  const uniFace = resolvePlatformFace();
  if (!uniFace || typeof uniFace.openBluetoothAdapter !== 'function') {
    return {
      ok: false,
      reason: 'ble_not_supported',
      error: new Error('当前平台不支持 BLE 扫描，请使用 App。')
    };
  }

  try {
    await openAdapter();
    return { ok: true };
  } catch (error) {
    const errCode = error?.errCode ?? null;
    const raw = String(error?.rawMessage || error?.errMsg || error?.message || '');
    // 授权拒绝优先于蓝牙关闭：auth deny 同样伴随 10001 时语义是权限而非开关。
    if (errCode === 10006 || errCode === 10007 || PERMISSION_DENIED_PATTERN.test(raw)) {
      return { ok: false, reason: 'bluetooth_permission_denied', error };
    }
    if (errCode === 10001 || BLUETOOTH_OFF_PATTERN.test(raw)) {
      return { ok: false, reason: 'bluetooth_unavailable', error };
    }
    return { ok: false, reason: 'bluetooth_unavailable', error };
  }
}
