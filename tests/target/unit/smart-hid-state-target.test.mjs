// tests/target/unit/smart-hid-state-target.test.mjs
// TEST-U-015 Smart HID 校验/解析/恢复映射：matcher 强/弱、八类错误→恢复动作、候选字段校验。
// 目标：REQ-047~050/052/065；FEAT-053/055/056/058；PAGE-001/002；FLOW-010；13 号契约。

import test from 'node:test';
import assert from 'node:assert';
import { importTarget, notImplemented } from '../lib/import-target.mjs';

const IDS = 'TEST-U-015 REQ-047~050 FEAT-053/055/056/058 FLOW-010';

const SERVICE = '9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04';
const NAME_PREFIX = 'SmartHID-';

// ---------- 参照层：八类错误共用一个恢复动作的错误实现 ----------
const ERROR_CLASSES = ['invalid_payload', 'wifi_failed', 'controlhub_unreachable', 'pairing_invalid',
  'pairing_expired', 'pairing_used', 'mqtt_invalid', 'storage_failed'];
function brokenRecovery(code) {
  return '重试'; // 错误：八类全部“重试”
}
test('TEST-U-015 参照层：八类错误共用同一恢复动作必须被抓', () => {
  const actions = new Set(ERROR_CLASSES.map(brokenRecovery));
  assert.equal(actions.size, 1, '参照实现确实共用');
  assert.ok(actions.size < ERROR_CLASSES.length, '目标：恢复动作按类区分（如 token 失效→重新获取 QR，绝非重试）');
});

// ---------- 目标层 ----------
test('TEST-U-015 目标层：smart-hid/profile.js + workflow.js', async (t) => {
  const p = await importTarget('apps/uniapp/services/smart-hid/profile.js');
  if (!p.ok) return assert.fail(notImplemented(IDS, p.message));
  const profile = p.module.smartHidProfile;
  if (!profile) return assert.fail(notImplemented(IDS, 'smartHidProfile 缺失'));
  // 强匹配：服务 UUID + 名字前缀
  const matchFn = profile.match || profile.matches;
  if (typeof matchFn !== 'function') return assert.fail(notImplemented('REQ-047 FEAT-053', '目标接口 profile.match 缺失'));
  const strong = matchFn({ services: [SERVICE], name: NAME_PREFIX + '0102', localName: NAME_PREFIX + '0102' });
  assert.ok(strong === true || (strong && strong.strong === true) || (strong && strong.level === 'strong'),
    'UUID+名称前缀 → 强匹配');
  const weak = matchFn({ services: [SERVICE], name: '随便的名字' });
  assert.ok(weak !== false ? weak && (weak.strong === false || weak.level) : false, '仅 UUID → 弱匹配（需二次身份确认）');

  const w = await importTarget('apps/uniapp/services/smart-hid/workflow.js');
  if (!w.ok) return assert.fail(notImplemented(IDS, w.message));
  // 八类错误分类与恢复动作
  const classify = w.module.classifySmartHidStatus;
  const recovery = w.module.smartHidRecoveryAction;
  if (typeof classify !== 'function' || typeof recovery !== 'function') {
    return assert.fail(notImplemented('REQ-049 FEAT-058', '目标接口 classifySmartHidStatus/smartHidRecoveryAction 缺失'));
  }
  const actions = new Set();
  for (const code of ERROR_CLASSES) {
    const status = { error: code };
    const cls = classify(status);
    assert.ok(cls, `错误 ${code} 可分类`);
    actions.add(String(recovery(status) ?? recovery(cls) ?? recovery(code)));
  }
  assert.ok(actions.size >= 4, `八类错误恢复动作区分度 ≥4（实际 ${actions.size}；全员同一动作=未实现按类恢复）`);
  // token 类错误不得建议“重试”
  const tokenAction = String(recovery({ error: 'pairing_expired' }) ?? '');
  assert.ok(!/重试/.test(tokenAction) || /重新/.test(tokenAction), 'pairing_expired 恢复动作≠单纯重试');
});
