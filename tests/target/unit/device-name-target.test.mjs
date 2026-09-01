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

// ---------- 参照层：故意错误（顺序颠倒 + 兜底缺失） ----------
function brokenChain(d) {
  if (d.localName) return d.localName; // 错误：localName 抢在 name 之前
  if (d.name) return d.name;
  return 'Unnamed'; // 错误：丢失 ID 后四位兜底
}

test('TEST-U-006 参照层：localName 抢优先级与丢失兜底必须被抓', () => {
  const device = { deviceId: 'AA:BB:CC:DD:EE:FF', name: '官方名', localName: '临时广播名' };
  assert.notEqual(brokenChain(device), expectedChain(device), '顺序颠倒必须改变结果（可被断言识别）');
  const anon = { deviceId: 'AA:BB:CC:DD:EE:FF' };
  assert.notEqual(brokenChain(anon), expectedChain(anon), '兜底缺失必须被识别（目标=未命名 BLE · ID 后四位）');
  assert.match(expectedChain(anon), /未命名 BLE ·/, '目标兜底含未命名语义与 ID 尾部');
});

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
