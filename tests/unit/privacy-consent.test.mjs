import assert from 'node:assert/strict';
import { hasFeatureConsent, requestFeatureConsent } from '../../apps/uniapp/services/privacy-consent.js';
import { openAdapter, onAdapterState, resetBleRuntimeForTesting, setBlePlatformForTesting } from '../../apps/uniapp/services/ble-runtime/index.js';

const originalPlus = globalThis.plus;
const originalUni = globalThis.uni;
try {
  let adapterCalls = 0;
  let callbackRegistrations = 0;
  globalThis.plus = { os: { name: 'Android' }, runtime: { isAgreePrivacy: () => false, showPrivacyDialog: ({ success }) => success({ code: 0 }) } };
  setBlePlatformForTesting({
    openBluetoothAdapter: ({ success }) => { adapterCalls++; success({}); },
    onBluetoothAdapterStateChange: () => callbackRegistrations++
  });
  assert.equal(hasFeatureConsent(), false);
  onAdapterState(() => {});
  assert.equal(callbackRegistrations, 0, 'visitor startup must not install native BLE callbacks');
  await assert.rejects(openAdapter(), /授权/);
  assert.equal(adapterCalls, 0, 'denial must not initialize Bluetooth');

  globalThis.plus.runtime.isAgreePrivacy = () => true;
  await openAdapter();
  assert.equal(adapterCalls, 1);
  assert.equal(callbackRegistrations, 1, 'callbacks install after actual native consent');

  const ios = await import('../../apps/uniapp/services/privacy-consent.js?ios-denial-test');
  globalThis.plus = { os: { name: 'iOS' }, runtime: {} };
  let prompts = 0;
  globalThis.uni = { showModal: ({ success }) => { prompts++; success({ confirm: false }); } };
  assert.equal(await ios.requestFeatureConsent(), false);
  assert.equal(ios.hasFeatureConsent(), false);
  globalThis.uni.showModal = ({ success }) => { prompts++; success({ confirm: true }); };
  assert.equal(await ios.requestFeatureConsent(), true);
  assert.equal(await ios.requestFeatureConsent(), true);
  assert.equal(prompts, 2, 'a consented session must not prompt again');

  const restart = await import('../../apps/uniapp/services/privacy-consent.js?restart-test');
  let restarts = 0;
  globalThis.plus = { os: { name: 'Android' }, runtime: { isAgreePrivacy: () => false, showPrivacyDialog: ({ success }) => success({ code: 1 }), restart: () => { restarts++; } } };
  assert.equal(await restart.requestFeatureConsent(), false);
  globalThis.plus.runtime.isAgreePrivacy = () => true;
  assert.equal(restart.hasFeatureConsent(), false, 'unloaded native plugins need a restarted process');
  assert.equal(restarts, 1);
  console.log('Privacy consent PASS: native denial, delayed callbacks, explicit iOS consent and restart ownership');
} finally {
  resetBleRuntimeForTesting();
  if (originalPlus === undefined) delete globalThis.plus; else globalThis.plus = originalPlus;
  if (originalUni === undefined) delete globalThis.uni; else globalThis.uni = originalUni;
}
