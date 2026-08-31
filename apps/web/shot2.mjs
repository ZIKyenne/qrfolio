import { chromium } from '/home/claude/qrfolio/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/index.mjs'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
p.on('pageerror', e => console.log('ERREUR PAGE:', e.message))
await p.goto('http://localhost:3111/upgrade', { waitUntil: 'networkidle', timeout: 180000 })
await p.waitForTimeout(2500)
await p.screenshot({ path: '/tmp/20-upgrade.png' })
const cmp = p.locator('button', { hasText: /tableau comparatif/ })
if (await cmp.count()) { await cmp.first().click(); await p.waitForTimeout(900); await p.screenshot({ path: '/tmp/21-comparatif.png', fullPage: false }) }
await b.close()
