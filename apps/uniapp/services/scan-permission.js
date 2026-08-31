import { openAdapter as openBleAdapter } from './ble-runtime/index.js';

function showWeixinPermissionDialog({ title, content, confirmText = '去设置', onConfirm }) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText,
      success: async (result) => {
        if (result.confirm && typeof onConfirm === 'function') {
          await onConfirm();
        }
        resolve(false);
      },
      fail: () => resolve(false)
    });
  });
}

function getWeixinBluetoothAuthorization() {
  try {
    return wx.getAppAuthorizeSetting?.().bluetoothAuthorized || 'unknown';
  } catch {
    return 'unknown';
  }
}

function openWeixinBluetoothSettings() {
  if (typeof wx.openAppAuthorizeSetting === 'function') {
    return new Promise((resolve) => wx.openAppAuthorizeSetting({ complete: resolve }));
  }
  if (typeof wx.openSetting === 'function') {
    return new Promise((resolve) => wx.openSetting({ complete: resolve }));
  }
  return Promise.resolve();
}

async function ensureWeixinBluetoothReady() {
  if (getWeixinBluetoothAuthorization() === 'denied') {
    await showWeixinPermissionDialog({
      title: '需要蓝牙权限',
      content: '蓝牙权限已关闭，请在微信的系统授权设置中允许使用蓝牙。',
      onConfirm: openWeixinBluetoothSettings
    });
    return { ok: false, reason: 'bluetooth_permission_denied' };
  }

  try {
    await openBleAdapter();
    return { ok: true };
  } catch (error) {
    const errCode = error?.errCode ?? error?.code;
    let content = '请先打开系统蓝牙，并允许小程序使用蓝牙。';
    let confirmText = '知道了';
    let onConfirm;

    if (errCode === 10001) {
      content = '系统蓝牙未开启。请先打开蓝牙，再返回小程序开始扫描。';
    } else if (getWeixinBluetoothAuthorization() === 'denied') {
      content = '蓝牙权限已关闭，请在微信的系统授权设置中允许使用蓝牙。';
      confirmText = '去设置';
      onConfirm = openWeixinBluetoothSettings;
    }

    await showWeixinPermissionDialog({
      title: '无法开始扫描',
      content,
      confirmText,
      onConfirm
    });

    return { ok: false, reason: 'bluetooth_unavailable', error };
  }
}

export function requestBleScanPermission() {
  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    ensureWeixinBluetoothReady().then((bluetoothReady) => {
      if (!bluetoothReady.ok) {
        resolve(bluetoothReady);
        return;
      }

      wx.getSetting({
        success: (settings) => {
          if (settings.authSetting['scope.userLocation']) {
            resolve({ ok: true });
            return;
          }

          wx.authorize({
            scope: 'scope.userLocation',
            success: () => resolve({ ok: true }),
            fail: async () => {
              await showWeixinPermissionDialog({
                title: '需要定位权限',
                content: '微信在部分系统上要求定位权限才能发现附近 BLE 设备。',
                onConfirm: () => wx.openSetting()
              });
              resolve({ ok: false, reason: 'location_permission_denied' });
            }
          });
        },
        fail: () => resolve({ ok: true })
      });
    }).catch((error) => resolve({ ok: false, reason: 'permission_check_failed', error }));
  });
  // #endif
  // #ifndef MP-WEIXIN
  if (typeof uni.openBluetoothAdapter !== 'function') {
    return Promise.resolve({
      ok: false,
      reason: 'ble_not_supported',
      error: new Error('当前平台不支持 BLE 扫描，请使用微信小程序或 App。')
    });
  }
  return Promise.resolve({ ok: true });
  // #endif
}
