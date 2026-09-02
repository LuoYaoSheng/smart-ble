#!/usr/bin/env node
/**
 * Unified E5 environment checker (OTA / Broadcast / Smart HID shared).
 *
 * Usage:
 *   node scripts/e5/check-env.mjs
 *   node scripts/e5/check-env.mjs --out=verification/e5/env/latest.json
 *
 * Does NOT flash, install, or run OTA/Broadcast/Smart-HID E5.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import os from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith('--out='));
const outPath = outArg
  ? resolve(ROOT, outArg.slice('--out='.length))
  : join(ROOT, 'verification/e5/env/latest.json');

function run(cmd, cmdArgs = [], opts = {}) {
  const result = spawnSync(cmd, cmdArgs, {
    encoding: 'utf8',
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...(opts.env || {}) },
    shell: opts.shell === true,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    error: result.error?.message || null,
  };
}

function which(bin) {
  const r = run(process.platform === 'win32' ? 'where' : 'which', [bin]);
  return r.ok ? r.stdout.split('\n')[0] : null;
}

function classifyAdbDevices(raw) {
  const lines = String(raw || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith('List of devices'));
  const physical = [];
  const emulator = [];
  for (const line of lines) {
    if (!/\sdevice(\s|$)/.test(line)) continue;
    const serial = line.split(/\s+/)[0];
    const model = (line.match(/model:(\S+)/) || [])[1] || '';
    const product = (line.match(/product:(\S+)/) || [])[1] || '';
    const entry = { serial, model, product, raw: line };
    if (/^emulator-/.test(serial) || /sdk_gphone|google_sdk|generic_x86|emulator/i.test(line)) {
      emulator.push(entry);
    } else {
      physical.push(entry);
    }
  }
  return { physical, emulator, emulator_not_e5: true };
}

function classifySerialPorts(pioListText, cuList) {
  const text = `${pioListText || ''}\n${(cuList || []).join('\n')}`;
  const candidates = [];
  for (const line of text.split('\n')) {
    const m = line.match(/\/dev\/(cu|tty)\.[^\s]+/);
    if (!m) continue;
    const port = m[0];
    if (/Bluetooth-Incoming-Port|debug-console|wlan|Bluetooth/i.test(port)) continue;
    candidates.push(port);
  }
  const unique = [...new Set(candidates)];
  return {
    ports: unique,
    serial_available: unique.length > 0,
    serial_missing: unique.length === 0,
  };
}

function detectHost() {
  const cpu =
    process.platform === 'darwin'
      ? run('sysctl', ['-n', 'machdep.cpu.brand_string']).stdout
      : os.cpus()[0]?.model || 'unknown';
  return {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    platform: process.platform,
    cpu: cpu || 'unknown',
    node: process.version,
    npm: run('npm', ['-v']).stdout || null,
  };
}

function detectAndroid() {
  const sdkHome = process.env.ANDROID_HOME
    || process.env.ANDROID_SDK_ROOT
    || (existsSync(join(os.homedir(), 'Library/Android/sdk'))
      ? join(os.homedir(), 'Library/Android/sdk')
      : null);
  const adbPath = which('adb')
    || (sdkHome && existsSync(join(sdkHome, 'platform-tools/adb'))
      ? join(sdkHome, 'platform-tools/adb')
      : null);
  const adbVersion = adbPath
    ? run(adbPath, ['version']).stdout.split('\n')[0]
    : null;
  const javaVersion = run('java', ['-version']).stderr.split('\n')[0]
    || run('java', ['-version']).stdout.split('\n')[0]
    || null;
  const devicesRaw = adbPath ? run(adbPath, ['devices', '-l']).stdout : '';
  const devices = classifyAdbDevices(devicesRaw);
  return {
    androidSdk: sdkHome && existsSync(sdkHome) ? { present: true, path: sdkHome } : { present: false, path: null },
    adb: { present: Boolean(adbPath), path: adbPath, version: adbVersion },
    java: { present: Boolean(javaVersion), version: javaVersion },
    devices,
  };
}

function detectEsp32() {
  const pioPath = which('pio')
    || (existsSync(join(os.homedir(), '.platformio/penv/bin/pio'))
      ? join(os.homedir(), '.platformio/penv/bin/pio')
      : null);
  const version = pioPath ? run(pioPath, ['--version']).stdout : null;
  const deviceList = pioPath ? run(pioPath, ['device', 'list']).stdout : '';
  const cu = run('ls', ['/dev/cu.*'], { shell: true });
  const cuPorts = cu.ok ? cu.stdout.split(/\s+/).filter(Boolean) : [];
  const serial = classifySerialPorts(deviceList, cuPorts);
  return {
    platformio: { present: Boolean(pioPath), path: pioPath, version },
    deviceList: deviceList || null,
    serial,
  };
}

function detectBuild() {
  const hbx = existsSync('/Applications/HBuilderX.app');
  const hbxCli = '/Applications/HBuilderX.app/Contents/MacOS/cli';
  const hbxVersion = hbx && existsSync(hbxCli)
    ? run(hbxCli, ['--version']).stdout.replace(/\u001b\[[0-9;]*m/g, '').trim()
    : null;
  const viteConfig = existsSync(join(ROOT, 'apps/uniapp/vite.config.js'))
    || existsSync(join(ROOT, 'apps/uniapp/vite.config.mjs'))
    || existsSync(join(ROOT, 'apps/uniapp/vite.config.ts'));
  return {
    hbuilderx: { present: hbx, path: hbx ? '/Applications/HBuilderX.app' : null, version: hbxVersion, cli: existsSync(hbxCli) },
    viteConfigPresent: viteConfig,
    androidBuildTool: hbx && existsSync(hbxCli) ? 'HBuilderX cli launch app-android' : null,
  };
}

function readiness(android, esp32, build) {
  const apkToolchain = Boolean(build.hbuilderx.present && build.hbuilderx.cli && android.androidSdk.present && android.adb.present);
  const physicalReady = android.devices.physical.length > 0;
  const serialReady = esp32.serial.serial_available;
  const pioReady = Boolean(esp32.platformio.present);

  return {
    host: 'READY',
    android_toolchain: apkToolchain ? 'READY' : 'BLOCKED',
    android_apk: 'UNKNOWN', // filled by apk-build.md / build attempt
    android_physical: physicalReady ? 'READY' : 'BLOCKED',
    emulator_not_e5: true,
    esp32_toolchain: pioReady ? 'READY' : 'BLOCKED',
    esp32_serial: serialReady ? 'READY' : 'BLOCKED',
    ble_link: physicalReady && serialReady ? 'READY' : 'BLOCKED',
    overall: (apkToolchain && physicalReady && serialReady) ? 'READY' : 'BLOCKED',
  };
}

const host = detectHost();
const android = detectAndroid();
const esp32 = detectEsp32();
const build = detectBuild();
const ready = readiness(android, esp32, build);

const report = {
  task_id: 'E5-ENV-UNIFIED-001',
  generated_at: new Date().toISOString(),
  git_head: run('git', ['rev-parse', 'HEAD']).stdout,
  git_short: run('git', ['rev-parse', '--short', 'HEAD']).stdout,
  host,
  android: {
    androidSdk: android.androidSdk,
    adb: android.adb,
    java: android.java,
  },
  device: android.devices,
  esp32,
  build,
  readiness: ready,
  notes: [
    'Emulators are recorded but emulator_not_e5=true — they do NOT satisfy E5.',
    'This checker does not flash ESP32, install APK, or run OTA/Broadcast/Smart-HID E5.',
  ],
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

const mdPath = join(dirname(outPath), 'latest.md');
const md = `# E5 Environment Snapshot

| Field | Value |
|---|---|
| Generated | ${report.generated_at} |
| Git | \`${report.git_short}\` |
| Overall | **${ready.overall}** |

## Host

| Item | Value |
|---|---|
| OS | ${host.os} |
| CPU | ${host.cpu} |
| Node | ${host.node} |
| npm | ${host.npm} |

## Android

| Item | Value |
|---|---|
| SDK | ${android.androidSdk.present ? android.androidSdk.path : 'MISSING'} |
| ADB | ${android.adb.version || 'MISSING'} |
| Java | ${android.java.version || 'MISSING'} |
| Physical devices | ${android.devices.physical.length} |
| Emulators | ${android.devices.emulator.length} (emulator_not_e5) |

## ESP32

| Item | Value |
|---|---|
| PlatformIO | ${esp32.platformio.version || 'MISSING'} |
| serial_available | ${esp32.serial.serial_available} |
| Ports | ${esp32.serial.ports.join(', ') || '(none)'} |

## Build

| Item | Value |
|---|---|
| HBuilderX | ${build.hbuilderx.present ? (build.hbuilderx.version || 'present') : 'MISSING'} |
| vite.config | ${build.viteConfigPresent ? 'present' : 'absent'} |
| android_toolchain | ${ready.android_toolchain} |

## Readiness

| Gate | Status |
|---|---|
| android_physical | ${ready.android_physical} |
| esp32_serial | ${ready.esp32_serial} |
| ble_link | ${ready.ble_link} |
| overall | **${ready.overall}** |
`;
writeFileSync(mdPath, md);

console.log(JSON.stringify({
  ok: true,
  overall: ready.overall,
  out: outPath.replace(`${ROOT}/`, ''),
  md: mdPath.replace(`${ROOT}/`, ''),
  physical: android.devices.physical.length,
  emulator: android.devices.emulator.length,
  serial_available: esp32.serial.serial_available,
}, null, 2));

process.exit(ready.overall === 'READY' ? 0 : 2);
