// U-WX E4：微信开发者工具自动化驱动 P001 扫描页（miniprogram-automator）
// 运行：node uwx-p001-e4.mjs（run-id 目录；node 需能 import apps/uniapp/node_modules）
// 断言：P001 打开 / 开始扫描按钮 / tap→停止扫描(扫描中) / 5s 自动停→回到开始扫描
// （工具内 BLE 适配器可开、发现为空——E4 工具级，真机 E5 另行走预览二维码）
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(resolve(process.cwd(), 'node_modules'))
const automator = require('miniprogram-automator')

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, 'uniapp-wechat')
mkdirSync(OUT, { recursive: true })

const log = (m) => console.log(`[UWX-E4 ${new Date().toISOString().substring(11, 23)}] ${m}`)
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`)
}

const btnText = async (page) => {
  const btn = await page.$('.ble-btn--lg')
  return btn ? (await btn.text()).trim() : null
}
const stateText = async (page) => {
  const el = await page.$('#scan-summary')
  if (!el) return null
  const t = await el.text()
  return (t || '').replace(/\s+/g, ' ').trim()
}

let mp
try {
  log('connect ws://127.0.0.1:9420（cli auto 已由外部启动）...')
  mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  check('开发者工具 automation 连接', true)

  const page = await mp.reLaunch('/pages/index/index')
  await page.waitFor(1000)
  check('P001 打开', page.path === 'pages/index/index', page.path)

  const idleBtn = await btnText(page)
  check('首启按钮=开始扫描', idleBtn === '开始扫描', `btn=${idleBtn}`)
  const idleState = await stateText(page)
  check('首启状态含待开始', /待开始/.test(idleState || ''), idleState)
  await mp.screenshot({ path: resolve(OUT, 'uwx-p001-idle.png') })
  log('截图 idle 完成')

  const btn = await page.$('.ble-btn--lg')
  await btn.tap()
  await page.waitFor(1500)
  const scanBtn = await btnText(page)
  const scanning = scanBtn === '停止扫描'
  check('tap 后进入扫描中（按钮=停止扫描）', scanning, `btn=${scanBtn}`)
  const scanState = await stateText(page)
  check('扫描中状态文案', /扫描中/.test(scanState || ''), scanState)
  await mp.screenshot({ path: resolve(OUT, 'uwx-p001-scanning.png') })

  // 5s 会话自动停止（留足余量）
  await page.waitFor(7000)
  const doneBtn = await btnText(page)
  check('5s 自动停止回到开始扫描', doneBtn === '开始扫描', `btn=${doneBtn}`)
  await mp.screenshot({ path: resolve(OUT, 'uwx-p001-done.png') })

  const pass = results.filter((r) => r.ok).length
  log(`====== 汇总 PASS ${pass}/${results.length} ======`)
  process.exitCode = pass === results.length ? 0 : 1
} catch (e) {
  log(`异常: ${e && e.message}`)
  results.push({ name: '运行异常', ok: false, detail: String(e && e.message) })
  process.exitCode = 2
} finally {
  writeFileSync(resolve(OUT, 'uwx-p001-e4-results.json'), JSON.stringify(results, null, 2))
  try { if (mp) await mp.disconnect() } catch {}
}
