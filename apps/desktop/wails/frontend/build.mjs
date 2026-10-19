// G-WIN 前端构建：E-WIN public/ 全页镜像为纯静态资产，不经打包器转换。
// 产物 = frontend/dist（src 原样复制 + 仓库根 VERSION 单源注入），
// 由 main.go //go:embed all:frontend/dist 嵌入。镜像源见 frontend/src，
// 桥接层为 src/wails-bridge.js（window.bleAPI 契约 → Wails Go 绑定）。
import { cpSync, rmSync, mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'src');
const dist = join(here, 'dist');
// 仓库根：apps/desktop/wails/frontend -> 上三级
const repoRoot = join(here, '..', '..', '..', '..');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(src, dist, { recursive: true });

// F027 版本单源：仓库根 VERSION（与 E-WIN package.json version 同步）
// 拷入 dist 供 Go embed 读取，App.GetAppVersion() 运行时回读。
const versionFile = join(repoRoot, 'VERSION');
if (existsSync(versionFile)) {
  writeFileSync(join(dist, 'VERSION'), readFileSync(versionFile));
}

if (!existsSync(join(dist, 'index.html'))) {
  console.error('build.mjs: dist/index.html missing after copy');
  process.exit(1);
}
console.log('G-WIN frontend build: static mirror ->', dist);
