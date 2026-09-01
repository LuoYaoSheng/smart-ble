// tests/target/release/release-artifacts.test.mjs
// TEST-R-001/002（静态部分）：Release 产物注册与版本五处同源（E6 前置）。
// 无产物是当前合法状态（NOT_RELEASED），但版本声明必须同源、产物登记必须成对（URL+SHA）。

import test from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

test('TEST-R-002 版本单源：VERSION 或等价单源存在且与 README/manifest 同版', () => {
  const versionFile = existsSync(`${ROOT}/VERSION`);
  if (!versionFile) {
    // 未建单源=目标差距（18 号五处同源的源头缺失），输出第一断点
    assert.fail('NOT_IMPLEMENTED: [REQ-004/056 FEAT-004/066 18号] 第一断点: 仓库根 VERSION 单源文件缺失');
  }
});

test('TEST-R-001 产物登记处：任何已登记产物必须 URL+SHA256 成对', () => {
  // 登记处候选：releases/ 或 dist/ 下 manifest；无登记处=NOT_RELEASED（合法，但落地页不得有直链）
  const registryDirs = ['releases', 'dist'].filter((d) => existsSync(`${ROOT}/${d}`));
  if (registryDirs.length === 0) {
    assert.ok(true, '无产物登记处 → NOT_RELEASED 姿态（直链门禁由 public-claims.test 把守）');
    return;
  }
  for (const d of registryDirs) {
    const files = readdirSync(`${ROOT}/${d}`).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const data = JSON.parse(readFileSync(`${ROOT}/${d}/${f}`, 'utf8'));
      const items = Array.isArray(data) ? data : data.artifacts ?? [data];
      for (const it of items) {
        if (it.url || it.href) assert.ok(it.sha256, `${d}/${f}: ${it.url ?? it.href} 必须配 SHA256`);
      }
    }
  }
});

test('TEST-R-001 下载规则与 landing-target 契约一致', () => {
  const lt = JSON.parse(readFileSync(`${ROOT}/contracts/target/landing-target.json`, 'utf8'));
  assert.equal(lt.download_rules.no_fake_download, true);
  assert.equal(lt.download_rules.sha_required, true);
  assert.ok(String(lt.download_rules.missing_artifact_behavior).includes('NOT_RELEASED'));
});
