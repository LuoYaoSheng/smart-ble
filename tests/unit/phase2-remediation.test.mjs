import assert from 'node:assert/strict';
import { describeScanCodeFailure } from '../../apps/uniapp/services/smart-hid/scan-code-feedback.js';
import { summarizeDisconnectAllResults } from '../../apps/uniapp/services/connected-disconnect.js';
import {
  describeServicePanelState,
  resolveServicePanelState
} from '../../apps/uniapp/services/device-session-ui.js';

console.log('[phase-2 remediation helpers]');

assert.equal(describeScanCodeFailure({ errMsg: 'scanCode:fail cancel' }).kind, 'cancel');
assert.equal(describeScanCodeFailure({ errMsg: 'scanCode:fail auth deny' }).kind, 'permission');
assert.equal(describeScanCodeFailure({ errMsg: 'scanCode:fail system error' }).kind, 'failed');

assert.equal(resolveServicePanelState({ isConnecting: true }), 'connecting');
assert.equal(resolveServicePanelState({ isConnected: true, serviceCount: 2 }), 'ready');
assert.equal(resolveServicePanelState({ isConnected: true, serviceCount: 0 }), 'empty');
assert.equal(resolveServicePanelState({ hasError: true }), 'error');
assert.equal(resolveServicePanelState({}), 'idle');
assert.equal(describeServicePanelState('empty').showRetry, true);
assert.equal(describeServicePanelState('connecting').showRetry, false);

const summary = summarizeDisconnectAllResults(
  [{ deviceId: 'a', name: 'Alpha' }, { deviceId: 'b', name: 'Beta' }],
  [{ status: 'fulfilled' }, { status: 'rejected', reason: new Error('busy') }]
);
assert.equal(summary.successCount, 1);
assert.equal(summary.failureCount, 1);
assert.equal(summary.failures[0].label, 'Beta');
assert.match(summary.title, /1\/2/);
assert.equal(summary.allSucceeded, false);

const allOk = summarizeDisconnectAllResults([{ deviceId: 'a' }], [{ status: 'fulfilled' }]);
assert.equal(allOk.allSucceeded, true);

console.log('  ✓ scan fail, service panel state, and disconnect summary helpers');
