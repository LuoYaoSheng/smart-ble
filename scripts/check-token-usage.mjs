#!/usr/bin/env node
// UI-PARITY-G0 · Token 使用门禁（docs/specs/07_design_system/TOKEN_REFERENCE.md）
//
// 检查：
//   1. 旧 iOS 色全仓清零（#007AFF/#34C759/#F2F2F7 等 banned 清单，来源 design-tokens.json legacy.banned；
//      系统 UI 例外文件：pages.json / 平台清单）
//   2. 正典层（uniapp components/ui + pages/index + styles；flutter lib/ui/design + device_list_page + themes）
//      出现的 hex 必须为登记值（design-tokens.json 全量色彩）或 Dart 0xFF 变体
//   3. 存量文件允许 LEGACY_DRIFT 登记值（v0 视觉残留，待迁移；新增漂移值即 FAIL）
//   4. 生成产物与 design-tokens.json 同步（tokens.css / app_tokens.dart 关键值抽检）
import { readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readdir } from 'node:fs/promises'

// 注释剥离（//、/* */、<!-- -->）——文档中引用的 banned 值不作违例
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, '')
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tokens = JSON.parse(await readFile(join(root, 'core/assets-generator/meta/design-tokens.json'), 'utf8'))
const failures = []

// 登记色集（小写 hex，不带 #）
const registered = new Set()
const collect = (v) => {
  if (typeof v === 'object' && v !== null) {
    if (typeof v.value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v.value)) registered.add(v.value.slice(1).toLowerCase())
    if (typeof v.fg === 'string') registered.add(v.fg.slice(1).toLowerCase())
    if (typeof v.bg === 'string') registered.add(v.bg.slice(1).toLowerCase())
    for (const key of Object.keys(v)) collect(v[key])
  }
}
collect(tokens.color)
collect(tokens.legacy) // banned 值收集无害（仅入 registered 集合，不参与 banned 判定）
registered.delete('007aff') // 防御：banned 值绝不允许作为登记值
// 白色通用值
registered.add('ffffff')
const registeredList = [...registered]

// banned（旧 iOS 色）与 legacy 漂移登记
const banned = tokens.legacy.banned.map((h) => h.slice(1).toLowerCase())
// LEGACY_DRIFT 清空（UI-CONV 2026-09-10）：v0 漂移值已全部收敛至正典 Token——
//   uniapp：design-system.css/uni.scss/存量组件与页面（provision-stepper/progress、ota-dialog、
//           app-card、broadcast、hid/add）改挂 --c-*；--ble-cyan/--ble-gradient-brand 删除；
//   flutter：provisioning_page 16 处深色阶/弱底 → AppTokens（对齐原型 ebanner/note/prow 正典），
//           app_icons 兜底色 → --c-text。
// 本机制保留：如再出现圈外漂移值，直接 FAIL（不再登记容忍）。
const LEGACY_DRIFT = new Set([])
// DATA_SKIP 已随 F028 推广区移除（2026-09-10）撤销：product.dart 推广配色下线后无内容数据例外
const DATA_SKIP = []
// 白名单（正典 rgba 表达等）：跳过
const BANNED_SCAN_SKIP = ['pages.json', 'project.config.json', 'manifest.json', 'design-tokens.json', 'app.css', 'tauri.conf.json']

async function walk(directory, accept) {
  const out = []
  const entries = await readdir(directory, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    if (['node_modules', 'unpackage', '.git', 'build', '.dart_tool', 'target'].includes(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(path, accept)))
    else if (accept(entry.name)) out.push(path)
  }
  return out
}

const uniVue = await walk(join(root, 'apps/uniapp'), (n) => n.endsWith('.vue'))
const uniCss = await walk(join(root, 'apps/uniapp/styles'), (n) => n.endsWith('.css'))
const uniScss = [join(root, 'apps/uniapp/uni.scss')]
const uniTheme = [join(root, 'apps/uniapp/app_theme.css')]
const dartFiles = (await walk(join(root, 'apps/flutter/lib'), (n) => n.endsWith('.dart')))
  .filter((f) => !DATA_SKIP.some((d) => f === join(root, d)))

const canonVue = (f) => f.includes(join('components', 'ui')) || f.includes(join('pages', 'index'))
const canonDart = (f) => f.includes(join('ui', 'design')) || f.endsWith('device_list_page.dart') || f.includes(join('themes', 'app_theme.dart'))

// ── 1. banned 全仓清零 ───────────────────────────────────────────────────
for (const file of [...uniVue, ...uniCss, ...uniScss, ...uniTheme, ...dartFiles]) {
  const rel = relative(root, file).replace(/\\/g, '/')
  if (BANNED_SCAN_SKIP.some((s) => rel.endsWith(s))) continue
  const source = stripComments(await readFile(file, 'utf8'))
  const hexes = [...source.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => m[1].toLowerCase())
  for (const h of hexes) {
    if (banned.includes(h)) {
      failures.push(`${rel}: 旧 iOS 色 #${h.toUpperCase()} 违例（TOKEN_REFERENCE §6）`)
    }
  }
}

// ── 2/3. hex 登记值检查 ──────────────────────────────────────────────────
function checkHexes(file, strict) {
  const rel = relative(root, file).replace(/\\/g, '/')
  return readFile(file, 'utf8').then((raw) => {
    const src = stripComments(raw)
    const hexes = [
      ...[...src.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => m[1].toLowerCase()),
      ...[...src.matchAll(/0x([0-9A-Fa-f]{8})\b/g)].map((m) => m[1].slice(2).toLowerCase()),
    ]
    for (const h of hexes) {
      if (registered.has(h)) continue
      if (!strict && LEGACY_DRIFT.has(h)) continue
      failures.push(`${rel}: 圈外色 #${h.toUpperCase()}（${strict ? '正典层' : '存量层'}；登记值见 TOKEN_REFERENCE §2）`)
    }
  })
}

const jobs = []
for (const file of [...uniVue, ...uniCss, ...uniScss, ...uniTheme]) {
  jobs.push(checkHexes(file, canonVue(file) || file.includes(join('styles', 'tokens.css'))))
}
for (const file of dartFiles) {
  jobs.push(checkHexes(file, canonDart(file)))
}
await Promise.all(jobs)

// ── 4. 生成产物同步抽检 ──────────────────────────────────────────────────
const tokensCss = await readFile(join(root, 'apps/uniapp/styles/tokens.css'), 'utf8')
const appTokensDart = await readFile(join(root, 'apps/flutter/lib/ui/design/app_tokens.dart'), 'utf8')
for (const probe of ['--c-primary: #1B6DFF', '--fs-h1: 34rpx', '--r-lg: 32rpx', '--shadow-primary: 0px 6px 16px rgba(27,109,255,0.32)']) {
  if (!tokensCss.includes(probe)) failures.push(`apps/uniapp/styles/tokens.css: 缺少正典值 "${probe}"（请重跑 generate_assets.py --theme-only）`)
}
for (const probe of ['static const Color cPrimary = Color(0xFF1B6DFF);', 'static const double fsH1 = 17;', 'static const double rLg = 16;']) {
  if (!appTokensDart.includes(probe)) failures.push(`apps/flutter/lib/ui/design/app_tokens.dart: 缺少正典值 "${probe}"（请重跑生成器）`)
}

if (failures.length > 0) {
  console.error(`check-token-usage: FAIL (${failures.length})`)
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(`check-token-usage: PASS (登记色 ${registeredList.length} · banned ${banned.length} 清零 · 正典层 vue/dart 严格 · 存量层漂移登记 ${LEGACY_DRIFT.size})`)
