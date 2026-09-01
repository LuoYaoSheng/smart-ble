// tests/target/unit/device-name-target.test.mjs
// TEST-U-006 显示名解析链：name → localName → AD 0x09 → AD 0x08 → Profile → 厂商 → 未命名 BLE · ID 后四位。
// 目标：REQ-013；FEAT-013；PAGE-001；FLOW-002。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-006 REQ-013 FEAT-013 PAGE-001 FLOW-002';

// 目标解析链（规范顺序，作为期望值定义）
function expectedChain(input) {
  const d = input;
  if (d.name) return d.name;
  if (d.localName) return d.localName;
  const ad09 = (d.advertisementData || [])?.find?.((x) => x.type === 0x09);
  if (ad09) return ad09.value;
  const ad08 = (d.advertisementData || [])?.find?.((x) => x.type === 0x08);
  if (ad08) return ad08.value;
  if (d.profileName) return d.profileName;
  if (d.manufacturer) return d.manufacturer;
  return `未命名 BLE · ${String(d.deviceId).slice(-4)}`;
}

// ---------- 目标层 ----------
test('TEST-U-006 目标层：services/ble-runtime/display-name.js', async (t) => {
  const m = await importTarget('apps/uniapp/services/ble-runtime/display-name.js');
  if (!m.ok) return assert.fail(notImplemented(IDS, m.message));
  const fn = m.module.resolveDisplayName || m.module.displayName || m.module.default;
  if (typeof fn !== 'function') return assert.fail(notImplemented(IDS, '目标接口 resolveDisplayName 缺失'));

  const cases = [
    [{ deviceId: 'A1', name: 'N', localName: 'L' }, 'N'],
    [{ deviceId: 'A2', localName: 'L' }, 'L'],
    [{ deviceId: 'A3', advertisementData: [{ type: 0x09, value: 'AD09' }] }, 'AD09'],
    [{ deviceId: 'A4', advertisementData: [{ type: 0x08, value: 'AD08' }] }, 'AD08'],
    [{ deviceId: 'A5', profileName: 'Smart HID' }, 'Smart HID'],
    [{ deviceId: 'ABCD1234' }, /ABCD1234|1234/],
  ];
  for (const [input, want] of cases) {
    const got = fn(input);
    if (want instanceof RegExp) assert.match(got, want);
    else assert.equal(got, want);
  }
  // 未命名兜底必须带“未命名”语义（17 号 S 系列文案约束）
  assert.match(String(fn({ deviceId: 'ZZ:99' })), /未命名|Unnamed/, '兜底文案含未命名语义');
});
