// Business consent remains in memory. Android's SDK owns its native privacy dialog.
let sessionAccepted = false;
let pending = null;
let restartRequired = false;

const nativeFace = () => globalThis.plus;
export function hasFeatureConsent() {
  const native = nativeFace();
  if (!native) return true; // H5/contract tests have no native SDK to initialize.
  if (restartRequired) return false;
  if (native.os?.name === 'Android') {
    try { return native.runtime?.isAgreePrivacy?.() === true; } catch { return false; }
  }
  return sessionAccepted;
}

export async function requestFeatureConsent() {
  if (hasFeatureConsent()) return true;
  if (pending) return pending;
  pending = new Promise((resolve) => {
    const native = nativeFace();
    if (native?.os?.name === 'Android') {
      if (typeof native.runtime?.showPrivacyDialog !== 'function') { resolve(false); return; }
      native.runtime.showPrivacyDialog({
        success: (result) => {
          if (result.code === 1) {
            // Plugins are intentionally unloaded in visitor mode. Reload only after explicit consent.
            restartRequired = true;
            try { native.runtime.restart?.(); } catch { /* remain in visitor mode */ }
          }
          resolve(false); // The restarted process initializes the consented native modules.
        },
        fail: () => resolve(false)
      });
      return;
    }
    if (typeof globalThis.uni?.showModal !== 'function') { resolve(false); return; }
    globalThis.uni.showModal({
      title: '蓝牙与相机使用说明',
      content: '蓝牙用于扫描、连接、读写和广播；相机仅在扫码时使用。设备信息、日志和配网凭据只保留在本次会话。可在「关于 → 隐私说明」阅读完整政策。暂不授权仍可浏览应用。',
      confirmText: '继续使用', cancelText: '暂不授权',
      success: (result) => { sessionAccepted = result.confirm === true; resolve(sessionAccepted); },
      fail: () => resolve(false)
    });
  });
  try { return await pending; } finally { pending = null; }
}
