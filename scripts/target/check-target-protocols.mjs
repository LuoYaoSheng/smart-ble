#!/usr/bin/env node
// scripts/target/check-target-protocols.mjs
// TEST-C-012 / TEST-C-013 —— 协议常量一致与 Smart HID 镜像 lock：
//   UUID 形态/唯一、OTA 十步顺序（start/commit/版本回读不可缺）、串口 JSON、
//   Smart HID 八类错误、token 仅内存（持久化即 FAIL）、镜像与 lock 文件。

import { Checker, cliCtx } from './lib/check-utils.mjs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// OTA 正典顺序锚点：缺任一或乱序即 FAIL（STATE-OTA-01..10 / DEC-016 第 0 步）
const OTA_ORDER_ANCHORS = [
  ['pre_step_package_validation', /manifest|sha256|校验/i],
  ['steps[0]', /订阅 STATUS/],
  ['steps[1]', /CTRL start/i],
  ['steps[3]', /DATA 分包/],
  ['steps[4]', /CTRL commit/],
  ['steps[5]', /success/],
  ['steps[6]', /reboot/],
  ['steps[8]', /firmware_version/],
  ['steps[9]', /一致/],
];
const PERSIST_WORDS = /persist|local-?storage|uni\.setStorage|wx\.setStorage|落盘|写入.*存储|存储.*写入/;

export function run(ctx) {
  const c = new Checker('check-target-protocols');

  // ---------- BLE fixture 契约 ----------
  const j = ctx.readJson('contracts/target/ble-fixture-target.json');
  c.assert('TEST-C-012', 'ble-fixture-target.json', j.ok, `ble-fixture-target.json 可解析${j.ok ? '' : '：' + j.error}`);
  if (j.ok) {
    const d = j.data;
    const uuids = [];
    for (const s of d.services || []) {
      c.assert('TEST-C-012', s.id, UUID_RE.test(s.uuid), `${s.id} 服务 UUID 形态合法（${s.uuid}）`);
      uuids.push(s.uuid);
      for (const ch of s.characteristics || []) {
        const cu = ch.uuid || ch;
        c.assert('TEST-C-012', s.id, UUID_RE.test(String(cu)), `${s.id} 特征 UUID 形态合法（${cu}）`);
        uuids.push(String(cu));
      }
    }
    c.assert('TEST-C-012', 'UUID 全体', new Set(uuids).size === uuids.length && uuids.length >= 12,
      `≥12 个特征/服务 UUID 全局唯一（实际 ${uuids.length}）`);

    // OTA 十步顺序（故意错误类别 5：缺 start/commit/version 必须被抓）
    const ota = d.ota_transaction || {};
    c.assert('TEST-C-012', 'OTA 全体', Array.isArray(ota.steps) && ota.steps.length === 10,
      `OTA 事务为 10 步（实际 ${Array.isArray(ota.steps) ? ota.steps.length : '非数组'}）`);
    for (const [key, re] of OTA_ORDER_ANCHORS) {
      const holder = key.startsWith('pre_step') ? [ota.pre_step_package_validation] : ota.steps;
      const idx = Number(key.match(/\d+/)?.[0] ?? -1);
      const text = key.startsWith('pre_step') ? String(holder[0] ?? '') : String(ota.steps?.[idx] ?? '');
      c.assert('TEST-C-012', 'FLOW-009/STATE-OTA', re.test(text), `OTA 步骤 ${key} 含锚点语义`);
    }
    // 顺序单调：start < DATA < commit < success < reboot < firmware_version < 一致
    const pos = (kw) => (ota.steps || []).findIndex((s) => new RegExp(kw, 'i').test(String(s)));
    const seq = [pos('CTRL start'), pos('DATA'), pos('commit'), pos('success'), pos('reboot'), pos('firmware_version'), pos('一致')];
    const mono = seq.every((v) => v >= 0) && seq.every((v, i) => i === 0 || v > seq[i - 1]);
    c.assert('TEST-C-012', 'STATE-OTA-01..10', mono, `OTA 步骤严格递增（位置 ${seq.join('→')}）`);

    c.assert('TEST-C-012', 'OTA-ERR', (ota.error_codes || []).length >= 5, `OTA 错误码 ≥5（实际 ${(ota.error_codes || []).length}）`);
    const pkg = d.ota_package || {};
    c.assert('TEST-C-012', 'DEC-016', Array.isArray(pkg.contents_min) && pkg.contents_min.includes('firmware.bin') && pkg.contents_min.includes('manifest.json'),
      'DEC-016 固件包 = manifest.json + firmware.bin');
    const sixChecks = JSON.stringify(pkg.client_pre_transaction_checks || {}).toLowerCase();
    c.assert('TEST-C-012', 'DEC-016', ['target', 'hardware', 'firmware_version', 'size', 'sha256'].every((k) => sixChecks.includes(k)),
      'DEC-016 六项传输前校验字段齐全');
    c.assert('TEST-C-012', 'SERIAL', (d.serial_json?.event_types || []).length >= 8 && d.serial_json?.baud === 115200,
      '串口 JSON：115200 波特、≥8 类事件');
    c.assert('TEST-C-012', 'LED', (d.led_commands || []).length >= 4, 'LED 指令 ≥4');
    c.assert('TEST-C-012', 'FAULT', (d.fault_injection || []).length >= 7, '故障注入 ≥7');
    c.assert('TEST-C-012', 'MODES', (d.modes || []).length === 2, '双夹具：peripheral + observer');

    // 12 号文档镜像 UUID 一致
    if (ctx.exists('docs/target-product/12_ESP32_FIXTURE_CONTRACT.md')) {
      const t12 = ctx.read('docs/target-product/12_ESP32_FIXTURE_CONTRACT.md');
      for (const s of d.services || []) {
        c.assert('TEST-C-012', s.id, t12.includes(s.uuid), `12 号文档登记 UUID ${s.uuid}`);
      }
    }
  }

  // ---------- Smart HID ----------
  const h = ctx.readJson('contracts/target/smart-hid-target.json');
  c.assert('TEST-C-013', 'smart-hid-target.json', h.ok, `smart-hid-target.json 可解析${h.ok ? '' : '：' + h.error}`);
  if (h.ok) {
    const d = h.data;
    const errs = d.errors || [];
    c.assert('TEST-C-013', 'ERR-HID 全体', errs.length === 8, `恰好八类错误（实际 ${errs.length}）`);
    c.assert('TEST-C-013', 'ERR-HID 全体',
      errs.map((e) => e.err_id).join(',') === Array.from({ length: 8 }, (_, i) => `ERR-HID-${String(i + 1).padStart(2, '0')}`).join(','),
      'ERR-HID-01..08 连续登记');
    c.assert('TEST-C-013', 'STATE-HID', (d.state_machine?.states || []).includes('ready'), '状态机含 ready 终态');
    c.assert('TEST-C-013', 'FRAMING', d.framing?.max_chunk_bytes === 128 && String(d.framing?.chunk_size_formula || '').includes('min(128'),
      '分帧上限 128B 且公式含 min(128)');
    // token 仅内存（故意错误类别 9：token 出现在持久化语义即 FAIL）
    const tokenStorage = JSON.stringify(d.pairing_qr?.token_storage || '');
    c.assert('TEST-C-013', 'SEC-HID/token', !PERSIST_WORDS.test(tokenStorage),
      `配网 token 仅内存（发现持久化语义：${tokenStorage}）`);
    // GATT UUID 形态（目标契约：服务 + INFO/INPUT/STATUS 三特征 = ≥4 个唯一 UUID）
    const hidUuids = [d.gatt?.service_uuid, ...(d.gatt?.characteristics || []).map((x) => x.uuid)].filter(Boolean);
    c.assert('TEST-C-013', 'HID-UUID', hidUuids.length >= 4 && hidUuids.every((u) => UUID_RE.test(u)) && new Set(hidUuids).size === hidUuids.length,
      'Smart HID GATT UUID ≥4、形态合法、唯一');

    // 镜像与 lock（真实仓库才检查文件存在性）
    if (ctx.exists('core/protocols/hid-provisioning-protocol.ts')) {
      const mirror = ctx.read('core/protocols/hid-provisioning-protocol.ts');
      c.assert('TEST-C-013', 'MIRROR', mirror.includes(d.gatt.service_uuid), '受锁定镜像包含 HID 服务 UUID');
      c.assert('TEST-C-013', 'MIRROR', /lock|LOCK/.test(mirror) || (d.canonical?.lock_file || '').length > 0, '镜像 lock 边界可追溯');
    } else {
      c.assert('TEST-C-013', 'MIRROR', false, 'core/protocols/hid-provisioning-protocol.ts 镜像文件存在');
    }
    // 13 号文档登记
    if (ctx.exists('docs/target-product/13_SMART_HID_PROFILE_CONTRACT.md')) {
      const t13 = ctx.read('docs/target-product/13_SMART_HID_PROFILE_CONTRACT.md');
      c.assert('TEST-C-013', 'DOC-13', t13.includes(d.gatt.service_uuid), '13 号文档登记 HID 服务 UUID');
      for (const e of errs) c.assert('TEST-C-013', e.err_id, t13.includes(e.err_id), `13 号文档登记 ${e.err_id}`);
    }
  }

  return c.report();
}

if (process.argv[1] && process.argv[1].endsWith('check-target-protocols.mjs')) {
  const ctx = await cliCtx(import.meta.url);
  const r = run(ctx);
  for (const x of r.results) console.log(`${x.pass ? 'ok  ' : 'FAIL'} : [${x.testId}] ${x.message}`);
  console.log(`\n${r.checker}: ${r.pass ? 'PASS' : 'FAIL'}（${r.total - r.failureCount}/${r.total}）`);
  process.exit(r.pass ? 0 : 1);
}
