// tests/target/contract/protocol-target.test.mjs
// TEST-C-012/013 —— 协议契约测试（真实 PASS + 故意错误类别 5：OTA 顺序缺失；类别 9：token 持久化）。

import test from 'node:test';
import assert from 'node:assert';
import { run } from '../../../scripts/target/check-target-protocols.mjs';
import { makeCtx } from '../../../scripts/target/lib/check-utils.mjs';
import { snapshot, mutateJson, makeVirtualCtx } from '../lib/fixture-helper.mjs';

test('TEST-C-012 真实仓库：协议契约自检通过', () => {
  const r = run(makeCtx());
  assert.ok(r.pass, `失败：\n${r.failures.map((f) => f.message).join('\n')}`);
});

test('TEST-C-012 故意错误⑤a：OTA 步骤缺 CTRL commit 必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/ble-fixture-target.json', (d) => {
    d.ota_transaction.steps = d.ota_transaction.steps.filter((s) => !String(s).includes('commit'));
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /OTA/.test(f.message) && (/commit|10 步|锚点/.test(f.message))));
});

test('TEST-C-012 故意错误⑤b：OTA 缺版本回读（firmware_version）必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/ble-fixture-target.json', (d) => {
    d.ota_transaction.steps = d.ota_transaction.steps.map((s) => String(s).includes('firmware_version') ? '客户端读取设备信息' : s);
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /firmware_version|严格递增|10 步|锚点/.test(f.message)));
});

test('TEST-C-012 故意错误：DEC-016 固件包缺 manifest.json 必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/ble-fixture-target.json', (d) => {
    d.ota_package.contents_min = ['firmware.bin'];
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /DEC-016 固件包/.test(f.message)));
});

test('TEST-C-012 故意错误：UUID 改坏形态必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/ble-fixture-target.json', (d) => {
    d.services[0].uuid = 'not-a-uuid';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /UUID 形态/.test(f.message)));
});

test('TEST-C-013 故意错误⑨：Smart HID token 改为持久化必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/smart-hid-target.json', (d) => {
    d.pairing_qr.token_storage = 'uni.setStorage 持久化到本地存储';
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /token 仅内存/.test(f.message)));
});

test('TEST-C-013 故意错误：HID 错误类别减为 7 类必须被抓', () => {
  const files = mutateJson(snapshot('protocols'), 'contracts/target/smart-hid-target.json', (d) => {
    d.errors = d.errors.slice(0, 7);
  });
  const r = run(makeVirtualCtx(files));
  assert.ok(!r.pass);
  assert.ok(r.failures.some((f) => /八类错误/.test(f.message)));
});
