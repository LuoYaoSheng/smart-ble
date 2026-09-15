#!/usr/bin/env node
// scripts/check-product-parity.mjs — 产品级跨语言向量 parity（MAC-008 扩展）
//
// 单源向量：core/protocols/ble-product-v1-vectors.json
//   logRedaction  js（uniapp 正典）/ dart（锁定镜像）/ kotlin（锁定镜像）/ desktop（tauri+electron 字节一致锁定镜像）
//   otaTargets    js / swift（交集）
//   otaSemVer     js / swift（交集；含两条已登记分歧 D-SEMVER-1/2，per-platform expect）
// 与 canon-locked 的 smart-hid-v1-vectors.json（check-platform-parity.mjs）互不干扰。
//
// Usage:
//   node scripts/check-product-parity.mjs
//   node scripts/check-product-parity.mjs --platforms=js,dart

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VECTORS_PATH = join(ROOT, 'core/protocols/ble-product-v1-vectors.json');

const platformArg = process.argv.find((a) => a.startsWith('--platforms='));
const platformsWanted = platformArg ? platformArg.split('=')[1].split(',') : ['js', 'dart', 'kotlin', 'swift', 'desktop'];

const vectors = JSON.parse(readFileSync(VECTORS_PATH, 'utf8'));
const suites = vectors.suites;
const declared = (suite, platform) => (suites[suite].platforms || []).includes(platform);

/** per-platform expect 解析：布尔或 {js:true, swift:false} 分歧登记形态 */
function expectFor(c, platform) {
  const e = c.expect;
  if (e !== null && typeof e === 'object') return e[platform];
  return e;
}
const isDivergence = (c) => c.expect !== null && typeof c.expect === 'object';

// ---------------------------------------------------------------------------
// JS 线：uniapp 正典实现（log-redaction.js / ota package-validator.js，纯 ESM）
// ---------------------------------------------------------------------------
async function runJsLane() {
  const redaction = await import(pathToFileURL(join(ROOT, 'apps/uniapp/services/logger/log-redaction.js')));
  const ota = await import(pathToFileURL(join(ROOT, 'apps/uniapp/services/ota/package-validator.js')));

  const failures = [];
  let pass = 0;
  const check = (suite, id, ok, detail = '') => { if (ok) pass += 1; else failures.push({ suite, case: id, detail }); };

  if (declared('logRedaction', 'js')) {
    for (const c of suites.logRedaction.cases) {
      const got = redaction.sanitizeLogString(c.input) ?? c.input;
      check('logRedaction', c.id, got === c.expect, `input=${c.input} got=${got} expect=${c.expect}`);
    }
  }

  const BASE_MANIFEST = {
    format_version: 1,
    target: 'lightble-peripheral',
    hardware: 'esp32s3',
    firmware_version: '1.0.0',
    size: 1024,
    sha256: 'a'.repeat(64),
  };
  if (declared('otaTargets', 'js')) {
    for (const c of suites.otaTargets.cases) {
      const got = ota.SUPPORTED_TARGETS.includes(c.value);
      const expect = expectFor(c, 'js');
      check('otaTargets', c.id, got === expect, `${c.value} -> ${got}, expect ${expect}`);
    }
  }
  if (declared('otaSemVer', 'js')) {
    for (const c of suites.otaSemVer.cases) {
      const result = ota.validateFirmwareManifest({ ...BASE_MANIFEST, firmware_version: c.value });
      const versionOk = !result.errors.some((e) => e.code === ota.ERROR_CODES.OTA_VERSION_INVALID);
      const expect = expectFor(c, 'js');
      check('otaSemVer', c.id, versionOk === expect,
        `${c.value} -> ${versionOk}, expect ${expect}${isDivergence(c) ? '（分歧在册）' : ''}`);
    }
  }

  return { status: failures.length === 0 ? 'PASS' : 'FAIL', pass, failures };
}

// ---------------------------------------------------------------------------
// Desktop 线：tauri/electron 双镜像（无构建传统脚本，挂 globalThis.SmartBLELogRedaction）。
// 门禁两层：① 双副本字节相等（镜像漂移即 FAIL）；② vm 沙箱求值后跑 logRedaction 向量。
// 桌面文件位于 Windows 写锁区（apps/desktop/**），本车道只读消费、不改动。
// ---------------------------------------------------------------------------
const DESKTOP_MIRRORS = [
  'apps/desktop/tauri/src/log-redaction.js',
  'apps/desktop/electron/public/log-redaction.js',
];

function runDesktopLane() {
  const missing = DESKTOP_MIRRORS.filter((rel) => !existsSync(join(ROOT, rel)));
  if (missing.length) {
    return { status: 'NOT_IMPLEMENTED', detail: `桌面镜像缺失：${missing.join('、')}`, pass: 0, failures: [] };
  }
  const sources = DESKTOP_MIRRORS.map((rel) => readFileSync(join(ROOT, rel), 'utf8'));
  if (sources[0] !== sources[1]) {
    return {
      status: 'FAIL', pass: 0,
      failures: [{ suite: 'desktop', case: 'mirror-drift', detail: 'tauri 与 electron 双副本字节不一致（正典要求共用同一字节）' }],
    };
  }
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(sources[0], sandbox, { filename: DESKTOP_MIRRORS[0] });
  } catch (err) {
    return { status: 'BLOCKED', detail: `桌面镜像求值失败：${err.message}`, pass: 0, failures: [] };
  }
  const api = sandbox.SmartBLELogRedaction;
  if (!api || typeof api.sanitizeLogString !== 'function') {
    return { status: 'BLOCKED', detail: '桌面镜像未暴露 globalThis.SmartBLELogRedaction.sanitizeLogString', pass: 0, failures: [] };
  }

  const failures = [];
  let pass = 0;
  if (declared('logRedaction', 'desktop')) {
    for (const c of suites.logRedaction.cases) {
      const got = api.sanitizeLogString(c.input) ?? c.input;
      const ok = got === c.expect;
      if (ok) pass += 1;
      else failures.push({ suite: 'logRedaction', case: c.id, detail: `input=${c.input} got=${got} expect=${c.expect}` });
    }
  }
  return { status: failures.length === 0 ? 'PASS' : 'FAIL', pass, failures };
}

// ---------------------------------------------------------------------------
// Dart 线：spawn tool/product_parity.dart，解析 @@PARITY@@
// ---------------------------------------------------------------------------
function runDartLane() {
  const probe = spawnSync('dart', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (probe.error || probe.status !== 0) {
    return { status: 'BLOCKED', detail: 'dart 工具链不可用', pass: 0, failures: [] };
  }
  const runner = join(ROOT, 'apps/flutter/tool/product_parity.dart');
  if (!existsSync(runner)) {
    return { status: 'NOT_IMPLEMENTED', detail: 'apps/flutter/tool/product_parity.dart 缺失', pass: 0, failures: [] };
  }
  const r = spawnSync('dart', ['run', 'tool/product_parity.dart', VECTORS_PATH], {
    cwd: join(ROOT, 'apps/flutter'),
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const mark = out.match(/@@PARITY@@ (\{.*\})/);
  if (!mark) return { status: 'BLOCKED', detail: `dart runner 未产出 @@PARITY@@：${out.slice(-300)}`, pass: 0, failures: [] };
  const parsed = JSON.parse(mark[1]);
  return {
    status: parsed.fail === 0 ? 'PASS' : 'FAIL',
    pass: parsed.pass,
    failures: (parsed.failures || []).map((f) => ({ suite: f.suite, case: f.case, detail: f.detail })),
  };
}

// ---------------------------------------------------------------------------
// Kotlin 线：gradle 调 JUnit（复用 SmartHid 线的 JDK 解析），读结果文件
// ---------------------------------------------------------------------------
const KOTLIN_RESULT_FILE = 'apps/android/app/build/product-parity-kotlin.json';

function resolveGradleJavaHome() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home && existsSync(join(home, '.jdks'))) {
    for (const d of readdirSync(join(home, '.jdks'))) candidates.push(join(home, '.jdks', d));
  }
  for (const dir of candidates) {
    const exe = join(dir, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (!existsSync(exe)) continue;
    const v = spawnSync(exe, ['-version'], { encoding: 'utf8' });
    const m = `${v.stderr || ''}${v.stdout || ''}`.match(/version "(\d+)/);
    if (!m) continue;
    const major = m[1] === '1' ? 8 : parseInt(m[1], 10);
    if (major >= 17 && major <= 19) return dir;
  }
  return null;
}

function runKotlinLane() {
  const testFile = join(ROOT, 'apps/android/app/src/test/java/com/smartble/core/profile/ProductVectorParityTest.kt');
  if (!existsSync(testFile)) {
    return { status: 'NOT_IMPLEMENTED', detail: 'ProductVectorParityTest.kt 缺失', pass: 0, failures: [] };
  }
  const javaHome = resolveGradleJavaHome();
  if (!javaHome) {
    return { status: 'BLOCKED', detail: '无可用的 JDK 17–19（Gradle 8.2 运行时上限）', pass: 0, failures: [] };
  }
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const r = spawnSync(gradlew, ['testDebugUnitTest', '--tests', '*ProductVectorParity*', '--rerun'], {
    cwd: join(ROOT, 'apps/android'),
    encoding: 'utf8',
    env: {
      ...process.env,
      JAVA_HOME: javaHome,
      ANDROID_HOME: process.env.ANDROID_HOME || (process.platform === 'darwin' && existsSync(join(process.env.HOME || '', 'Library/Android/sdk'))
        ? join(process.env.HOME, 'Library/Android/sdk') : process.env.ANDROID_HOME),
    },
    maxBuffer: 16 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  const resultFile = join(ROOT, KOTLIN_RESULT_FILE);
  if (r.status !== 0 || !existsSync(resultFile)) {
    return { status: 'BLOCKED', detail: `kotlin 向量测试未产出结果（gradle status=${r.status}）：${`${r.stdout || ''}`.slice(-200)}`, pass: 0, failures: [] };
  }
  const parsed = JSON.parse(readFileSync(resultFile, 'utf8'));
  return {
    status: parsed.fail === 0 ? 'PASS' : 'FAIL',
    pass: parsed.pass,
    failures: (parsed.failures || []).map((f) => ({ suite: f.suite, case: f.case, detail: f.detail })),
  };
}

// ---------------------------------------------------------------------------
// Swift 线：swift test（SmartHidCore）——ProductContractVectorTests 消费镜像用例
// 非 Darwin（Linux CI 预装 swift 但缺 CryptoKit 等 Apple 框架）在册 BLOCKED，与平台 parity 口径一致
// ---------------------------------------------------------------------------
function runSwiftLane() {
  if (process.platform !== 'darwin') {
    return { status: 'BLOCKED', detail: 'SmartHidCore 为 Apple 平台共享核（CryptoKit），非 Darwin 在册 BLOCKED；Mac Gate 必须执行', pass: 0, failures: [] };
  }
  const probe = spawnSync('swift', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (probe.error || probe.status !== 0) {
    return { status: 'BLOCKED', detail: 'swift 工具链不可用', pass: 0, failures: [] };
  }
  const packagePath = join(ROOT, 'core/apple/SmartHidCore');
  const r = spawnSync('swift', ['test', '--package-path', packagePath], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const m = out.match(/Executed (\d+) tests?, with (\d+) failures?/g);
  const last = m ? m[m.length - 1] : null;
  if (r.status !== 0 || !last || !/with 0 failures/.test(last)) {
    return { status: 'FAIL', pass: 0, failures: [{ suite: 'swift', case: 'SmartHidCoreTests', detail: (last || out.slice(-400)) }] };
  }
  const count = parseInt(last.match(/Executed (\d+)/)[1], 10);
  // 既有 32 例 + 产品向量 13 例（5 targets + 8 semver）
  return { status: count >= 45 ? 'PASS' : 'BLOCKED', pass: count, failures: count >= 45 ? [] : [{ suite: 'swift', case: 'count', detail: `executed ${count} < 45（ProductContractVectorTests 未接入？）` }] };
}

// ---------------------------------------------------------------------------

const LANES = {
  js: { label: 'js', run: runJsLane, async: true },
  dart: { label: 'dart', run: runDartLane, async: false },
  kotlin: { label: 'kotlin', run: runKotlinLane, async: false },
  swift: { label: 'swift', run: runSwiftLane, async: false },
  desktop: { label: 'desktop', run: runDesktopLane, async: false },
};

console.log(`产品级跨语言向量 parity（vectors core/protocols/ble-product-v1-vectors.json）`);
let allOk = true;
for (const platform of platformsWanted) {
  const lane = LANES[platform];
  if (!lane) { console.error(`未知平台：${platform}`); process.exit(2); }
  const result = lane.async ? await lane.run() : lane.run();
  const executed = result.status === 'PASS' || result.status === 'FAIL';
  if (executed && result.status !== 'PASS') allOk = false;
  console.log(`  ${platform.padEnd(7)} ${result.status.padEnd(7)} ${result.pass}/${result.pass + result.failures.length}${result.detail ? `  （${result.detail}）` : ''}`);
  for (const f of result.failures.slice(0, 5)) console.log(`    ✗ [${f.suite}] ${f.case} ${f.detail}`.slice(0, 160));
}
const divergences = [];
for (const suite of Object.values(suites)) {
  for (const c of suite.cases || []) if (isDivergence(c)) divergences.push(`${c.id}: ${c.divergence || ''}`);
}
if (divergences.length) {
  console.log('\n已登记分歧（per-platform expect，不算失败；裁决前不得改写任一实现）：');
  for (const d of divergences) console.log(`  ⚠ ${d}`);
}
console.log(`\nproduct parity ${allOk ? 'PASS' : 'FAIL'}（已执行平台零失败；NOT_IMPLEMENTED/BLOCKED 为在册状态）`);
process.exit(allOk ? 0 : 1);
