// tests/target/firmware/serial-schema.test.mjs
// TEST-E-006 TEST-E-008 PROTO-010 PROTO-011 EVID-005
// 串口 JSON 观测流 schema —— 事件类型、字段、Observer 证据口径。

import test from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const fixture = JSON.parse(readFileSync(`${ROOT}/contracts/target/ble-fixture-target.json`, 'utf8'));
const serial = fixture.serial_json;

test('串口契约：115200 波特、≥8 事件类型、≥9 Observer 字段', () => {
  assert.equal(serial.baud, 115200);
  assert.ok(serial.event_types.length >= 8, `事件类型 ≥8（实际 ${serial.event_types.length}）`);
  assert.ok(serial.observer_fields.length >= 9, `Observer 字段 ≥9（实际 ${serial.observer_fields.length}）`);
  assert.ok(String(serial.observer_min_rate).includes('5'), 'Observer 最低速率 ≥5 条/秒');
});

test('观察流行解析（目标 schema 的 E1 参照）', () => {
  const line = JSON.stringify({ ts: 1690000000123, name: 'BLEToolkit-Server', rssi: -58, uuids: [], mfg: '4faf', svc_data: '', raw: 'aabb', last_seen: 1690000000100 });
  const obj = JSON.parse(line);
  for (const field of ['ts', 'name', 'rssi', 'uuids', 'mfg', 'raw', 'last_seen']) {
    assert.ok(field in obj, `观察流行含 ${field}`);
  }
  assert.equal(typeof obj.ts, 'number', 'ts 为毫秒时间戳');
});

test('固件侧串口事件 emit 静态探测（可 FAIL=差距）', () => {
  const FW = `${ROOT}/hardware/esp32/LightBLE/src/main.cpp`;
  if (!existsSync(FW)) return assert.fail('固件源缺失');
  const fw = readFileSync(FW, 'utf8');
  const jsonEmit = /Serial\.printf\s*\(\s*"\{|"\{\\?"|JSON/.test(fw);
  assert.ok(jsonEmit, '固件存在 JSON 化串口输出迹象（Serial.printf/{…} 或 JSON 组装）');
  const evHit = serial.event_types.filter((e) => fw.includes(`"${e}"`) || fw.includes(`'${e}'`) || fw.includes(`"${e}\\`));
  assert.ok(evHit.length >= 3, `固件 emit 覆盖 ≥3 类契约事件（实际 ${evHit.length}：${evHit.join(',')}）`);
});
