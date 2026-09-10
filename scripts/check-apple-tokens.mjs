#!/usr/bin/env node
// UI-CONV 2026-09-10 · Apple 线 Token 镜像钉子（DESIGN_TOKEN_PLATFORM_MAPPING §2/§3）
//
// Apple 双线（N-IOS `apps/ios/Sources/Design/NativeDesignTokens.swift` ·
// N-MAC `apps/desktop/macos/SmartBLE-mac/Sources/Core/DSTokens.swift`）的 Token
// 为手写镜像，不在 design-tokens.json 生成管线的 outputs 内。本脚本把「实现值 == 正典值」
// 钉死：任何一侧漂移（含正典改值后 Apple 线未同步）即 FAIL。
//
// 覆盖：色彩逐一比对（含日志六色/别名定义解析）；iOS 圆角 sm/md/lg、macOS 圆角 sm..xl、
// 间距 sp1..sp8。字号为平台适配（iOS Dynamic Type / macOS 系统字体），不在钉子范围，
// 映射关系登记在 DESIGN_TOKEN_PLATFORM_MAPPING §3。
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tokens = JSON.parse(await readFile(join(root, 'core/assets-generator/meta/design-tokens.json'), 'utf8'))
const failures = []

// ── 正典展平：'brand.primary' → '#1B6DFF' ────────────────────────────────
const canon = {}
const flat = (prefix, obj) => {
  for (const [k, v] of Object.entries(obj)) {
    const id = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v)) canon[id] = v.toUpperCase()
    else if (typeof v === 'object' && v !== null) {
      if (typeof v.value === 'string' && /^#/.test(v.value)) canon[id] = v.value.toUpperCase()
      else if (typeof v.fg === 'string') {
        canon[`${id}.fg`] = v.fg.toUpperCase()
        canon[`${id}.bg`] = v.bg.toUpperCase()
      } else flat(id, v)
    }
  }
}
flat('', tokens.color)

const hex = (r, g, b) =>
  `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, '0').toUpperCase()).join('')}`

// ── N-IOS：NativeDS 手写镜像 ─────────────────────────────────────────────
const IOS_MAP = {
  primary: 'brand.primary', primaryDeep: 'brand.primaryDeep', primaryWeak: 'brand.primaryWeak',
  success: 'brand.success', successWeak: 'brand.successWeak',
  danger: 'brand.danger', dangerWeak: 'brand.dangerWeak',
  warning: 'brand.warning', warningWeak: 'brand.warningWeak',
  // iOS 命名 ink/muted/page/placeholder ≙ 正典 text/mut/bg/ph（值即正典值）
  ink: 'neutral.text', sub: 'neutral.sub', muted: 'neutral.mut', placeholder: 'neutral.ph',
  line: 'neutral.line', lineSoft: 'neutral.lineSoft', fill: 'neutral.fill', page: 'neutral.bg',
}
const iOS_REQUIRED = Object.keys(IOS_MAP)

const iosSrc = await readFile(join(root, 'apps/ios/Sources/Design/NativeDesignTokens.swift'), 'utf8')
const iosColors = {}
// 分量两种写法：`27 / 255` 或裸小数（255 写作 1）
const chan = (n, div) => (div ? Number(n) : Math.round(Number(n) * 255))
for (const m of iosSrc.matchAll(
  /static let (\w+) = Color\(red: (\d+(?:\.\d+)?)( ?\/ ?255)?, green: (\d+(?:\.\d+)?)( ?\/ ?255)?, blue: (\d+(?:\.\d+)?)( ?\/ ?255)?\)/g,
)) {
  iosColors[m[1]] = hex(chan(m[2], m[3]), chan(m[4], m[5]), chan(m[6], m[7]))
}
// 圆角（sm/md/lg；iOS 未用 xl/round）
const iosRadii = {}
for (const m of iosSrc.matchAll(/static let radius(\w+): CGFloat = (\d+)/g)) {
  iosRadii[{ Small: 'sm', Medium: 'md', Large: 'lg', Xl: 'xl', Round: 'round' }[m[1]]] = Number(m[2])
}

// ── N-MAC：DS 手写镜像 ───────────────────────────────────────────────────
const MAC_MAP = {
  primary: 'brand.primary', primaryDeep: 'brand.primaryDeep', primaryWeak: 'brand.primaryWeak',
  success: 'brand.success', successDeep: 'brand.successDeep', successWeak: 'brand.successWeak',
  danger: 'brand.danger', dangerWeak: 'brand.dangerWeak',
  warning: 'brand.warning', warningDeep: 'brand.warningDeep', warningWeak: 'brand.warningWeak',
  text: 'neutral.text', sub: 'neutral.sub', mut: 'neutral.mut', ph: 'neutral.ph',
  line: 'neutral.line', lineSoft: 'neutral.lineSoft', fill: 'neutral.fill', bg: 'neutral.bg',
  ink: 'ink.ink', inkLine: 'ink.inkLine', inkText: 'ink.inkText', inkMut: 'derived.reviewLabel',
  logSys: 'log.sys.fg', logSysBg: 'log.sys.bg',
  logErr: 'log.err.fg', logErrBg: 'log.err.bg',
  logRead: 'log.read.fg', logReadBg: 'log.read.bg',
  logWrite: 'log.write.fg', logWriteBg: 'log.write.bg',
  logRecv: 'log.recv.fg', logRecvBg: 'log.recv.bg',
  logOk: 'log.ok.fg', logOkBg: 'log.ok.bg',
}
const macSrc = await readFile(join(root, 'apps/desktop/macos/SmartBLE-mac/Sources/Core/DSTokens.swift'), 'utf8')
const macColors = {}
const macAlias = {}
for (const m of macSrc.matchAll(
  /static let (\w+)\s*=\s*#colorLiteral\(red: 0x([0-9A-Fa-f]+)\s*\/\s*255, green: 0x([0-9A-Fa-f]+)\s*\/\s*255, blue: 0x([0-9A-Fa-f]+)\s*\/\s*255, alpha: 1\)/g,
)) {
  macColors[m[1]] = hex(parseInt(m[2], 16), parseInt(m[3], 16), parseInt(m[4], 16))
}
for (const m of macSrc.matchAll(/static let (\w+)\s*=\s*(\w+)\s*$/gm)) {
  if (!macColors[m[1]] && m[1] !== m[2]) macAlias[m[1]] = m[2]
}
const macResolve = (name) => macColors[name] ?? (macAlias[name] ? macResolve(macAlias[name]) : undefined)
// 特例：card = NSColor.white
const macCardWhite = /static let card\s*=\s*NSColor\.white/.test(macSrc)
if (!macCardWhite) failures.push('N-MAC DSTokens.swift: card 须为 NSColor.white（正典 neutral.card #FFFFFF）')
// 间距/圆角（macOS 为单行多声明：`static let sp1: CGFloat = 4, sp2: ...`）
const macNums = {}
for (const m of macSrc.matchAll(/\b(rSm|rMd|rLg|rXl|rRound|sp[1-8]): CGFloat = (\d+)/g)) macNums[m[1]] = Number(m[2])
const macSpace = {}
const macRadii = {}
const R_MAP = { rSm: 'sm', rMd: 'md', rLg: 'lg', rXl: 'xl', rRound: 'round' }
for (const [k, v] of Object.entries(macNums)) {
  if (k.startsWith('sp')) macSpace[k] = v
  else macRadii[R_MAP[k]] = v
}

// ── 比对 ────────────────────────────────────────────────────────────────
const checkColors = (line, colors, resolve, map, required) => {
  for (const [name, canonId] of Object.entries(map)) {
    const got = resolve(name)
    if (got === undefined) {
      failures.push(`${line}: 缺少 Token 定义 ${name}（正典 ${canonId}）`)
      continue
    }
    const want = canon[canonId]
    if (got !== want) failures.push(`${line}: ${name}=#${got} ≠ 正典 ${canonId}=${want}`)
  }
  // 镜像内不得出现映射表之外的自造色（防静默新增圈外值）
  for (const name of Object.keys(colors)) {
    if (!map[name] && name !== 'card') failures.push(`${line}: 未登记的镜像色 ${name}=#${colors[name]}（先登记映射，再入库）`)
  }
  for (const name of required) {
    if (resolve(name) === undefined) failures.push(`${line}: 必需 Token ${name} 缺失`)
  }
}
checkColors('N-IOS NativeDS', iosColors, (n) => iosColors[n], IOS_MAP, iOS_REQUIRED)
checkColors('N-MAC DS', macColors, macResolve, MAC_MAP, Object.keys(MAC_MAP))

// iOS/ macOS 圆角与间距 vs 正典
for (const [name, map] of [['N-IOS', iosRadii], ['N-MAC', macRadii]]) {
  for (const [k, v] of Object.entries(map)) {
    if (tokens.radius[k].value !== v) failures.push(`${name}: 圆角 ${k}=${v} ≠ 正典 ${tokens.radius[k].value}`)
  }
}
for (const [k, v] of Object.entries(macSpace)) {
  const canonV = tokens.space[k].value
  if (canonV !== v) failures.push(`N-MAC: 间距 ${k}=${v} ≠ 正典 ${canonV}`)
}
// 必需间距全在位（防删行后静默漂移）
for (let i = 1; i <= 8; i++) {
  if (!(macSpace[`sp${i}`] !== undefined)) failures.push(`N-MAC: 间距 sp${i} 缺失`)
}

if (failures.length > 0) {
  console.error(`check-apple-tokens: FAIL (${failures.length})`)
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(
  `check-apple-tokens: PASS (N-IOS 色 ${Object.keys(iosColors).length} + 圆角 ${Object.keys(iosRadii).length} · N-MAC 色 ${Object.keys({ ...macColors, ...macAlias }).length} + 间距 8 + 圆角 ${Object.keys(macRadii).length} · 全部=design-tokens.json 正典值)`,
)
