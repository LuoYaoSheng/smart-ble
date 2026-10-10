// vis1-uwx 采集脚本 —— 视觉 Gate 可达态第一轮（U-WX 线）
// 前置：wechatwebdevtools cli auto --project <build/mp-weixin> --auto-port 9420
// 运行：node vis1-uwx-capture.cjs（须在 smart-ble 仓库根，自动加载 apps/uniapp/node_modules/miniprogram-automator）
const path = require('path')
const automator = require(path.resolve(__dirname, '../../../apps/uniapp/node_modules/miniprogram-automator'))

const OUT = path.resolve(__dirname, 'parity/vis1-uwx')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function shot(mp, name) {
  await mp.screenshot({ path: path.join(OUT, name) })
  console.log('captured', name)
}

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
  console.log('connected')

  // P001 默认（空态 A）
  let page = await mp.currentPage()
  await sleep(1200)
  await shot(mp, 'uwx-p001-empty-a.png')

  // P001 筛选展开（setData 直驱，避免组件内坐标）
  await page.setData({ showFilters: true })
  await sleep(900)
  await shot(mp, 'uwx-p001-filter.png')
  await page.setData({ showFilters: false })
  await sleep(500)

  // P001 扫描态：scan-summary 为自定义组件、automator 无法穿透（探针证实 page 树仅 5 view），
  // 且空态无动作钮（uniapp 实现差异：扫描入口仅在工具条）——该态改由 CGEvent 像素定位单独采（vis1-uwx-scan.cjs）。

  // P010 版本记录
  page = await mp.reLaunch('/pages/about/version')
  await sleep(1300)
  await shot(mp, 'uwx-p010-default.png')

  // P002 配网表单（直达路由）
  page = await mp.reLaunch('/pages/hid/add')
  await sleep(1300)
  await shot(mp, 'uwx-p002-default.png')

  await mp.disconnect()
  console.log('done')
}

main().catch((e) => { console.error('FAIL', e); process.exit(1) })
