import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../../apps/desktop/electron/src/main/index.js', import.meta.url), 'utf8');
const start = source.indexOf('function debugLog(');
const end = source.indexOf("debugLog('===", start);
const loggerSource = source.slice(start, end);
const redactorSource = readFileSync(new URL('../../apps/desktop/electron/public/log-redaction.js', import.meta.url), 'utf8');

function logger(available) {
  const lines = [];
  const context = vm.createContext({ console: { log: (...values) => lines.push(values) } });
  vm.runInContext(redactorSource, context);
  context.LOG_REDACTION = available ? context.SmartBLELogRedaction : null;
  vm.runInContext(loggerSource, context);
  return { lines, context };
}

test('main-process console output masks credentials without requiring file access', () => {
  const { context, lines } = logger(true);
  context.secret = 'sensitive-test-token-0123456789';
  vm.runInContext('debugLog({token: secret, password: secret})', context);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].length, 1);
  assert.equal(lines[0][0].includes(context.secret), false);
});

test('missing redactor hides payload and cyclic BLE objects cannot crash logging', () => {
  const { context, lines } = logger(false);
  vm.runInContext('const item = {token: "do-not-log"}; item.self = item; debugLog(item)', context);
  assert.equal(lines[0][0].includes('do-not-log'), false);
  assert.match(lines[0][0], /已隐藏/);
});
