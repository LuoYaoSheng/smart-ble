#!/usr/bin/env node
// UI-DIM-GATE · 维度使用门禁（DESIGN_SYSTEM_INDEX 红线 3 的机器检查）
//
// 背景：check-token-usage.mjs 只锁色彩；红线 3「页面禁止自行定义尺寸：字号/间距/圆角/阴影引用
// Token；组件内部尺寸以 COMPONENT_CONTRACT 登记为准」此前无机器门禁（2026-09-11 全维度收敛轮补齐）。
//
// 检查（维度：间距 / 圆角 / 字号 + 全要素轮新增：z 梯子 / 字重 / 行高 / 字距 /
//      flutter Material 调色板与原始 hex 对账；宽高尺寸仅报告，不 FAIL——内容几何暂不锁）：
//   1. 白名单 = design-tokens.json（font.size / space / radius，SSOT）
//      ∪ REGISTERED_INTERNAL（契约与正典实现登记的组件内距/微圆角，逐值带出处）
//      ∪ 行高/字重/字距档（TOKEN §2 + 原型 components.css 分档：chip·logchip 1.7、kv·logrow 1.5、note 1.6）
//   2. enforce 范围：uniapp pages + components 全量（含存量组件，2026-09-11 全要素轮收编）+ styles；
//      flutter lib/ui 全量（design/pages/widgets）+ themes；docs/.vitepress/theme（例外见 LANDING_EXCEPTIONS）
//   3. report-only 范围：design-system.css（§5 别名层）、specs/prototype/v1-new（正典本体 = 校准靶）
//   4. rpx 按 ÷2 折算（750 稿）；em/% 字距等非绝对值跳过；var()/calc() 内 token 引用不检
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tokens = JSON.parse(await readFile(join(root, 'core/assets-generator/meta/design-tokens.json'), 'utf8'))

// ── SSOT 白名单 ─────────────────────────────────────────────
const fsOK = new Set(Object.values(tokens.font.size).map((s) => s.value))          // 10/11/12/13/15/17/20/24
const spOK = new Set(Object.values(tokens.space).filter((s) => typeof s.value === 'number').map((s) => s.value)) // 4..32
const rOK = new Set(Object.values(tokens.radius).map((s) => s.value))              // 8/12/16/20/999

// ── 契约登记内部值（出处：COMPONENT_CONTRACT / PAGE_LAYOUT_CONTRACT / v1-new components.css·pages.css）──
// 间距：chip 2/9 · badge 3/10 · btn 18/13 · navbar 8/18 12 · subnav 8/14 10 · kv 9 · note 10 12/9 ·
//   ebanner/svc-h 12/14 · char 10/14 · logbar 9/13 · logrow 5/13 · loglist 6 · empty 38/24 ·
//   modal 22/20/16 · sheet 6/18/10 · toast 9/18 + 顶部 64 · seg 3 · diag 12/4 + 11 · prow 11/4 + 10 ·
//   filter 4/11 · txtlink 4/2 · logchip 0/6 · code 1/7 · diag-word 7 + 1/8 · op 1 · 安全区 34 ·
//   遮罩 40/36 · guard 60 · 预算行 2.5（pages.css）
const regSP = new Set([0, 1, 2, 2.5, 3, 5, 6, 7, 9, 10, 11, 13, 14, 18, 22, 34, 36, 38, 40, 60, 64])
// 圆角：slider 轨道 2 · sheet 抓手 4 · logchip 5 · code/addon 6 · 返回键 9（A2）· 圆点 50% ·
//   信号条 1（C1 sig）· seg 段钮 7（components.css）
const regR = new Set([1, 2, 4, 5, 6, 7, 9, 50])
// 字号（契约登记档，token 阶梯之外）：modal 标题 16（PAGE_LAYOUT §6）· TabBar 角标计数 9（pages.css）
const regFS = new Set([9, 16])

// ── 全要素轮新增档（TOKEN §2/§5 + 原型 components.css 分档）──────────────
const zOK = new Set([10, 20, 80, 90, 100])            // §5 --z-nav/tab/sheet/modal/toast，raw 数字必须落梯
const fwOK = new Set([400, 600, 700, 800])            // --fw-reg/med/bold/xbold（无 500 档）
const lhOK = new Set([1, 1.3, 1.5, 1.55, 1.6, 1.7])   // 标题1.3/正文1.55 + 原型分档：chip·logchip 1.7 · kv·logrow·ebanner 1.5 · note 1.6 · 单字形 1
const lsOK = new Set([2])                             // kicker 字距 +2px（rpx÷2；落地页 clamp 负字距为例外①，跳过）
const landingLH = new Set([0.98, 1.08])               // 落地页例外①：营销 clamp 行高
// flutter 原始 hex 对账基准：app_tokens.dart（SSOT 生成物）全部 hex + 纯白（原型 .btn 文字 #fff）
const appTokensDart = await readFile(join(root, 'apps/flutter/lib/ui/design/app_tokens.dart'), 'utf8')
const hexOK = new Set([...(appTokensDart.matchAll(/0x(?:FF)?([0-9A-Fa-f]{6})/g) ?? [])].map((m) => m[1].toUpperCase()))

// ── 落地页例外（docs/.vitepress/theme/style.css 文件头登记）──
const landingSP = new Set([36, 72, 84, 88, 96])       // 区块节奏 ②
const landingFS = new Set([42, 58])                   // 营销 clamp 上限 ①

// ── 扫描范围 ───────────────────────────────────────────────
const ENFORCE = [
  'apps/uniapp/pages', 'apps/uniapp/components', 'apps/uniapp/styles/tokens.css',
  'apps/flutter/lib/ui/design', 'apps/flutter/lib/ui/pages', 'apps/flutter/lib/ui/widgets', 'apps/flutter/lib/themes',
  'docs/.vitepress/theme',
]
const REPORT = [
  // design-system.css = DESIGN_SYSTEM_INDEX §5 登记的存量别名层（--ble-* 兼容旧页，新页面禁用，后续删除）
  'apps/uniapp/styles/design-system.css',
  'docs/specs/prototype/v1-new/assets', // 正典本体：白名单校准靶，预期零未登记
]

async function walk(dir, out = []) {
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === '__tests__') continue
    const p = join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else if (/\.(vue|css|scss|dart)$/.test(e.name)) out.push(p)
  }
  return out
}

const violations = []
const reportNotes = []

// 抽取 CSS 声明数值（px/rpx；em/%/vw/vh 等非绝对值跳过）
function scanCss(file, text, isLanding) {
  const lines = text.split('\n')
  const declRe = /(^|[{;\s])(padding|margin|gap|row-gap|column-gap|border-radius|font-size)\s*:\s*([^;{}]+)/g
  // 全要素轮：z 梯子 / 字重 / 行高 / 字距（var() 引用跳过）
  const ruleRe = /(^|[{;\s])(z-index|font-weight|line-height|letter-spacing)\s*:\s*([^;{}]+)/g
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(declRe)) {
      const prop = m[2], val = m[3]
      if (/var\(/.test(val) && !/\d(rpx|px)/.test(val)) continue // 纯 token 引用不检
      for (const lit of val.matchAll(/(\d+(?:\.\d+)?)(rpx|px)\b/g)) {
        const n = parseFloat(lit[1]) / (lit[2] === 'rpx' ? 2 : 1)
        if (prop === 'font-size') check(file, i + 1, 'font-size', n, fsOK, isLanding ? [regFS, landingFS] : regFS)
        else if (prop === 'border-radius') check(file, i + 1, 'border-radius', n, rOK, regR)
        else check(file, i + 1, prop, n, spOK, isLanding ? [regSP, landingSP] : regSP)
      }
    }
    for (const m of lines[i].matchAll(ruleRe)) {
      const prop = m[2], val = m[3].trim()
      if (/var\(/.test(val)) continue
      if (prop === 'z-index') {
        const n = parseFloat(val)
        if (!Number.isNaN(n)) check(file, i + 1, 'z-index', n, zOK)
      } else if (prop === 'font-weight') {
        const n = parseFloat(val)
        if (!Number.isNaN(n)) check(file, i + 1, 'font-weight', n, fwOK)
      } else if (prop === 'line-height') {
        const unit = val.match(/^(\d+(?:\.\d+)?)(rpx|px)?$/)
        if (unit) {
          const n = parseFloat(unit[1]) / (unit[2] === 'rpx' ? 2 : 1)
          check(file, i + 1, 'line-height', n, lhOK, isLanding ? landingLH : null)
        }
      } else if (prop === 'letter-spacing' && !isLanding) { // 落页 clamp 负字距 = 例外①
        const unit = val.match(/^(-?\d+(?:\.\d+)?)(rpx|px)$/)
        if (unit) check(file, i + 1, 'letter-spacing', Math.abs(parseFloat(unit[1]) / (unit[2] === 'rpx' ? 2 : 1)), lsOK)
      }
    }
  }
}

// 抽取 Dart 尺寸字面量（EdgeInsets/BorderRadius.circular/fontSize/SizedBox + 全要素轮新规则）
function scanDart(file, text) {
  const lines = text.split('\n')
  const patterns = [
    [/EdgeInsets\.(?:all|symmetric|only)\(([^)]*)\)/g, 'spacing'],
    [/BorderRadius\.circular\(\s*([\d.]+)\s*\)/g, 'border-radius'],
    [/fontSize:\s*([\d.]+)/g, 'font-size'],
    [/fontWeight:\s*FontWeight\.w(\d+)/g, 'font-weight'],
    // 行高：仅十进制 1.x（整数 height 为 SizedBox/容器几何，不检）
    [/height:\s*(1(?:\.\d+)?)\s*(?=[,)])/g, 'line-height'],
    [/letterSpacing:\s*([\d.]+)/g, 'letter-spacing'],
    // Material 调色板直用 = 圈外色（Colors.white/transparent 为原型正典 #fff/透明，放行）
    [/Colors\.(grey|black|white70|white\d+|red|blue|green|orange|amber|yellow|purple|pink|teal|cyan|indigo|lime|brown|blueGrey)\b/g, 'material-color'],
    // 原始 hex 必须能对账 AppTokens（SSOT 生成物）
    [/Color\(0x(?:FF)?([0-9A-Fa-f]{6})\)/g, 'raw-hex'],
  ]
  for (let i = 0; i < lines.length; i++) {
    if (/@generated/.test(lines[i])) continue // 生成段由 apple-tokens --check 锁定
    for (const [re, kind] of patterns) {
      for (const m of lines[i].matchAll(re)) {
        if (kind === 'material-color') {
          const rel = relative(root, file)
          ;(isEnforced(rel) ? violations : reportNotes).push(`${rel}:${i + 1} [material-color] ${m[0]}`)
          continue
        }
        if (kind === 'raw-hex') {
          check(file, i + 1, kind, m[1].toUpperCase(), hexOK)
          continue
        }
        const raw = m[1] ?? m[0]
        const nums = raw.match(/\d+(?:\.\d+)?/g) ?? [raw]
        for (const n0 of nums) {
          const n = parseFloat(n0)
          if (kind === 'font-size') check(file, i + 1, kind, n, fsOK, regFS)
          else if (kind === 'border-radius') check(file, i + 1, kind, n, rOK, regR)
          else if (kind === 'font-weight') check(file, i + 1, kind, n, fwOK)
          else if (kind === 'line-height') check(file, i + 1, kind, n, lhOK)
          else if (kind === 'letter-spacing') check(file, i + 1, kind, n, lsOK)
          else check(file, i + 1, kind, n, spOK, regSP)
        }
      }
    }
  }
}

function check(file, line, kind, value, base, extra) {
  const pools = [base, ...(Array.isArray(extra) ? extra : extra ? [extra] : [])]
  if (pools.some((p) => p.has(value))) return
  const rel = relative(root, file)
  const entry = `${rel}:${line} [${kind}] ${value}`
  ;(isEnforced(rel) ? violations : reportNotes).push(entry)
}

const isEnforced = (rel) => ENFORCE.some((d) => rel.startsWith(d))

for (const dir of [...ENFORCE, ...REPORT]) {
  const abs = join(root, dir)
  for (const file of await walk(abs)) {
    const text = await readFile(file, 'utf8')
    if (file.endsWith('.dart')) scanDart(file, text)
    else scanCss(file, text, file.includes('.vitepress'))
  }
}

if (reportNotes.length) {
  console.log(`⚠  report-only（存量/正典校准，不计 FAIL）${reportNotes.length} 处：`)
  for (const n of reportNotes) console.log(`   ${n}`)
}
if (violations.length) {
  console.log(`\n✗  维度违例 ${violations.length} 处（enforce 范围）：`)
  for (const v of violations) console.log(`   ${v}`)
  console.log('\n依据：docs/specs/07_design_system/TOKEN.md §2/§3/§4 + COMPONENT_CONTRACT/PAGE_LAYOUT_CONTRACT 登记内距；新增值须先入契约再使用。')
  process.exit(1)
}
console.log('✓ 维度门禁通过：间距/圆角/字号 + z梯子/字重/行高/字距/flutter色彩对账 全维度零圈外值（enforce 范围）')
