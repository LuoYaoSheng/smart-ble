/**
 * 桌面形态层缺口收口测试（E-WIN / T-WIN 双线）
 *
 * 背景：Mac 横评报告（20260911-h5-mock-sweep/REPORT.md §6）登记桌面 G1-G10 结构级重建
 * 挂起 D2 裁决；其中两项不依赖 D2 的正典缺口本轮直接收口：
 * 1. 窗口关闭退出确认（10_platform §4 生命周期：常驻，退出确认；原型 desktop.js dwin-quit）
 * 2. P002 配对码摄像头扫码主路径（10_platform §2.4；粘贴 / 手输为兜底）
 *
 * 锁定（结构级 + 文案级 + vendored 资产镜像）：
 * - 退出确认链：主进程拦截 close/CloseRequested → 通知渲染层 → 应用内模态 → 确认回执退出
 * - 扫码链：hidOpenQrSheet 扫码主路径 + hidOpenPasteSheet 兜底 + getUserMedia/jsQR 按需注入
 * - vendor/jsQR.js（Apache-2.0）双线字节镜像 + 许可文件在位
 *
 * Run: node --test tests/desktop/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

const ewin = {
    main: read('apps/desktop/electron/src/main/index.js'),
    preload: read('apps/desktop/electron/src/preload/preload.js'),
    app: read('apps/desktop/electron/public/app.js'),
    html: read('apps/desktop/electron/public/index.html')
};
const twin = {
    lib: read('apps/desktop/tauri/src-tauri/src/lib.rs'),
    app: read('apps/desktop/tauri/src/app.js'),
    html: read('apps/desktop/tauri/src/index.html')
};

/* ---------- 1. 退出确认（10_platform §4：常驻，退出确认） ---------- */

test('exit-confirm E-WIN: 主进程拦截 close 并转发渲染层', () => {
    assert.match(ewin.main, /mainWindow\.on\('close'/, '须拦截 close 事件');
    assert.match(ewin.main, /event\.preventDefault\(\)/, '须阻止默认关闭');
    assert.match(ewin.main, /webContents\.send\('app:confirm-exit'/, '须通知渲染层弹模态');
    assert.match(ewin.main, /exitConfirmed/, '须有确认旗防死循环');
    assert.match(ewin.main, /ipcMain\.handle\('app:confirm-exit'/, '须注册确认回执通道');
});

test('exit-confirm E-WIN: preload 暴露双向桥 + 渲染层模态正典文案', () => {
    assert.match(ewin.preload, /onConfirmExit/, '须暴露事件监听');
    assert.match(ewin.preload, /confirmExit:\s*\(quit\)/, '须暴露确认回执');
    assert.match(ewin.app, /onConfirmExit\?\.\(\(payload\) => this\.showExitConfirm/);
    assert.match(ewin.app, /showExitConfirm\(connected\)/);
    assert.match(ewin.app, /有 BLE 会话正在运行（连接\/广播）。/, '会话中文案对齐原型 dwin-quit');
    assert.match(ewin.app, /桌面端为常驻运行。确认退出？/, '空闲文案对齐原型 dwin-quit');
    assert.match(ewin.app, /继续使用/);
});

test('exit-confirm T-WIN: Rust 拦截 CloseRequested + confirm_exit 命令', () => {
    assert.match(twin.lib, /on_window_event/, '须挂窗口事件');
    assert.match(twin.lib, /WindowEvent::CloseRequested/, '须拦截 CloseRequested');
    assert.match(twin.lib, /api\.prevent_close\(\)/, '须阻止默认关闭');
    assert.match(twin.lib, /emit\("app-confirm-exit"/, '须通知渲染层弹模态');
    assert.match(twin.lib, /AtomicBool/, '须有确认旗防死循环');
    assert.match(twin.lib, /fn confirm_exit\(/, '须注册确认回执命令');
    assert.match(twin.lib, /confirm_exit,/, 'confirm_exit 须入 generate_handler');
});

test('exit-confirm T-WIN: 渲染层监听 + 模态文案与 E-WIN 同口径', () => {
    assert.match(twin.app, /listen\('app-confirm-exit'/);
    assert.match(twin.app, /function showExitConfirm\(connected\)/);
    assert.match(twin.app, /invoke\?\.\('confirm_exit', \{ quit: true \}\)/);
    assert.match(twin.app, /有 BLE 会话正在运行（连接\/广播）。/);
    assert.match(twin.app, /桌面端为常驻运行。确认退出？/);
});

test('exit-confirm: 双线模态防叠层 + 确认旗门（close 二次触发不重复弹）', () => {
    assert.match(ewin.app, /getElementById\('exitConfirmBody'\)\) return/);
    assert.match(twin.app, /getElementById\('exitConfirmBody'\)\) return/);
    assert.match(ewin.main, /if \(exitConfirmed\) return;/);
    assert.match(twin.lib, /if exit_confirmed\.load\(Ordering::SeqCst\) \{\s*return;/);
});

/* ---------- 2. P002 扫码主路径（10_platform §2.4） ---------- */

test('qr-scan E-WIN: 扫码 sheet 主路径 + 粘贴兜底降级', () => {
    assert.match(ewin.app, /async hidOpenQrSheet\(\)/);
    assert.match(ewin.app, /扫描 ControlHub 配对码/, 'sheet 标题对齐原型 desktop.js');
    assert.match(ewin.app, /取景识别中…（摄像头）/);
    assert.match(ewin.app, /无法扫码？粘贴 \/ 手输配对码 →/, '兜底入口须在扫码 sheet 内');
    assert.match(ewin.app, /getUserMedia/);
    assert.match(ewin.app, /vendor\/jsQR\.js/, '解码库按需注入');
    assert.match(ewin.app, /hidOpenPasteSheet\(\)/);
    assert.match(ewin.app, /粘贴 \/ 手输配对码（兜底）/, '粘贴 sheet 降级为兜底命名');
    assert.match(ewin.app, /配对码已识别 · 地址与令牌已回填/, '扫码成功 toast 对齐原型');
    assert.match(ewin.html, /摄像头读取 ControlHub 屏显二维码/, 'bigact 静态文案为主路径口径');
});

test('qr-scan T-WIN: 与 E-WIN 同构镜像', () => {
    assert.match(twin.app, /async function hidOpenQrSheet\(\)/);
    assert.match(twin.app, /扫描 ControlHub 配对码/);
    assert.match(twin.app, /取景识别中…（摄像头）/);
    assert.match(twin.app, /无法扫码？粘贴 \/ 手输配对码 →/);
    assert.match(twin.app, /getUserMedia/);
    assert.match(twin.app, /vendor\/jsQR\.js/);
    assert.match(twin.app, /function hidOpenPasteSheet\(\)/);
    assert.match(twin.app, /粘贴 \/ 手输配对码（兜底）/);
    assert.match(twin.app, /配对码已识别 · 地址与令牌已回填/);
    assert.match(twin.html, /摄像头读取 ControlHub 屏显二维码/);
});

test('qr-scan: 摄像头资源回收挂接模态关闭（双线）', () => {
    assert.match(ewin.app, /hidCloseModal\(\) \{\s*\n\s*this\.hidStopQrCamera\(\)/);
    assert.match(twin.app, /function hidCloseModal\(\) \{\s*\n\s*hidStopQrCamera\(\)/);
    assert.match(ewin.app, /getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\)/);
    assert.match(twin.app, /getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\)/);
});

test('qr-scan: 摄像头不可用文案给兜底出路（双线同串）', () => {
    const ew = ewin.app.match(/——请改用粘贴 \/ 手输入口/g) || [];
    const tw = twin.app.match(/——请改用粘贴 \/ 手输入口/g) || [];
    assert.ok(ew.length >= 4, `E-WIN 兜底出路文案应有≥4 处（权限拒绝/无摄像头/被占用/解码库），实际 ${ew.length}`);
    assert.ok(tw.length >= 4, `T-WIN 兜底出路文案应有≥4 处，实际 ${tw.length}`);
});

/* ---------- 3. vendored jsQR 资产（Apache-2.0） ---------- */

test('vendor: jsQR.js 双线字节镜像 + 许可与来源注记在位', () => {
    const a = readFileSync(resolve(ROOT, 'apps/desktop/electron/public/vendor/jsQR.js'));
    const b = readFileSync(resolve(ROOT, 'apps/desktop/tauri/src/vendor/jsQR.js'));
    assert.equal(a.length > 100000, true, 'jsQR.js 应为完整构建产物');
    assert.ok(a.equals(b), '两线 vendor/jsQR.js 必须逐字节一致');

    const licA = read('apps/desktop/electron/public/vendor/jsQR-LICENSE.txt');
    const licB = read('apps/desktop/tauri/src/vendor/jsQR-LICENSE.txt');
    assert.match(licA, /Apache License/, '许可全文在位');
    assert.equal(licA, licB);

    const readmeA = read('apps/desktop/electron/public/vendor/README.md');
    const readmeB = read('apps/desktop/tauri/src/vendor/README.md');
    assert.match(readmeA, /jsqr@1\.4\.0/);
    assert.equal(readmeA, readmeB);
});
