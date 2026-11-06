// A full check of the kit as people get it: the contents page and both experience cards, every row of each list at
// a laptop (1440x790, 1280x650) and a phone (390x660), and the game-style screens played start to end in preview.
// Run the server first (npm run build && npm start), then:  node e2e/kit-check.mjs   (BASE=http://localhost:3000)
import puppeteer from 'puppeteer-core'

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
const VIEW = {
  desk: { width: 1440, height: 790, deviceScaleFactor: 1 },
  short: { width: 1280, height: 650, deviceScaleFactor: 1 },
  phone: { width: 390, height: 660, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}
let failed = 0, checks = 0
const ok = (cond, what) => { checks++; if (!cond) { failed++; console.log('FAIL ' + what) } return cond }
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new',
})

async function newPage(size) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport(VIEW[size])
  const errors = []
  const noise = (t) => /fonts\.(googleapis|gstatic)\.com|cdn-cgi|Download the React DevTools/.test(t)
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !noise(m.text() + ' ' + ((m.location() || {}).url || ''))) errors.push(m.text()) })
  page.on('requestfailed', (r) => { if (!noise(r.url())) errors.push('request failed: ' + r.url()) })
  page.on('response', (r) => { if (r.status() >= 400 && !noise(r.url())) errors.push(`${r.status()} ${r.url()}`) })
  return { page, errors, close: () => context.close() }
}
const scrolls = (page) => page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1 || document.documentElement.scrollWidth > window.innerWidth + 1)
const step = (page) => page.evaluate(() => document.querySelector('[data-v2]')?.dataset.step ?? null)

/* ---------------- the entry points ---------------- */
{
  for (const p of ['/', '/kit']) {
    const res = await fetch(BASE + p, { redirect: 'manual' })
    ok([307, 308].includes(res.status) && /\/kit\/index\.html$/.test(res.headers.get('location') || ''), `${p} redirects to the contents page (${res.status} ${res.headers.get('location')})`)
  }
  for (const path of ['/kit/game', '/kit/game/screens', '/kit/KIT.md', '/signin']) {
    const r = await fetch(BASE + path)
    ok(r.status === 200, `${path} answers 200 (got ${r.status})`)
  }
}

/* ---------------- the game-style screens, as the tab lists them ---------------- */
const { rows } = await (await fetch(BASE + '/kit/game/screens')).json()
const order = rows.filter((r) => r.id !== 'start').map((r) => r.id)

for (const size of ['desk', 'phone']) {
  // 1. preview, start to end, pressing Next without answering: every screen and follow-up in order
  const { page, errors, close } = await newPage(size)
  await page.goto(BASE + '/kit/game', { waitUntil: 'networkidle0' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-v2][data-step="welcome"]', { timeout: 15000 })
  ok(await page.$eval('[data-v2]', (e) => e.dataset.preview === 'true'), `${size}: /kit/game opens in preview`)
  const seen = []
  for (let i = 0; i < 80; i++) {
    const s = await step(page)
    if (seen[seen.length - 1] !== s) {
      seen.push(s)
      ok(!(await scrolls(page)), `${size} preview: ${s} does not scroll`)
    }
    if (await page.$eval('[data-v2]', (e) => e.dataset.finished === 'true')) break
    const next = await page.$('[data-next]')
    if (!ok(next && !(await next.evaluate((n) => n.disabled)), `${size} preview: ${s} has a live Next`)) break
    await next.click()
    for (let k = 0; k < 40 && (await step(page)) === s; k++) await pause(80)
    await pause(380)
  }
  const want = ['welcome', ...order.filter((id) => size === 'desk' || rows.find((r) => r.id === id).phone)]
  const got = seen.filter((s) => s !== 'end')
  ok(got.join(' ') === want.join(' '), `${size} preview visits every screen and follow-up in order\n  want ${want.join(' ')}\n  got  ${got.join(' ')}`)
  const end = await page.evaluate(() => document.querySelector('[data-v2]')?.textContent || '')
  ok(/That's the final whistle/.test(end) && /nothing was sent/.test(end), `${size} preview ends saying nothing was sent`)
  ok(!errors.length, `${size} preview: no errors\n  ${errors.join('\n  ')}`)
  await close()
}

// 2. every row of the Game-style tab opens its screen (laptop: all; phone: the linked ones), fits, and has Next
for (const size of ['desk', 'short', 'phone']) {
  const { page, errors, close } = await newPage(size)
  await page.goto(BASE + '/kit/index.html#game', { waitUntil: 'networkidle0' })
  await page.waitForSelector('#glist .ix-row', { timeout: 10000 })
  ok(!(await scrolls(page)), `${size}: the contents page does not scroll`)
  // the two experiences are two cards, each with its own Start, and the chosen one's screens are listed
  ok((await page.$$('.ix-card')).length === 2, `${size}: the contents page shows two experiences`)
  ok(await page.$eval('.ix-card[data-tab="game"]', (c) => c.classList.contains('on')), `${size}: #game selects the Game-style card`)
  ok((await page.$eval('#startQuiz', (a) => a.getAttribute('href'))).startsWith('t-') && (await page.$eval('#startGame', (a) => a.getAttribute('href'))) === '/kit/game?live=1', `${size}: each card's Start opens its own experience`)
  const links = await page.$$eval('#glist a', (a) => a.map((x) => x.getAttribute('href')))
  const unlinked = await page.$$eval('#glist div.ix-row', (d) => d.length)
  if (size === 'phone') ok(unlinked === rows.filter((r) => !r.phone).length, `phone: the ${unlinked} laptop-only rows are listed without a link`)
  else ok(links.length === rows.length, `${size}: every row is a link (${links.length} of ${rows.length})`)
  for (const href of links) {
    const id = new URL(href, BASE).searchParams.get('at') ?? 'welcome'
    await page.goto(BASE + href, { waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-v2]')
    await pause(450)
    const s = await step(page)
    ok(s === id, `${size}: ${href} opens ${id} (got ${s})`)
    // the laptop frame is 700px tall, so 1280x650 scrolls by design (as / does); check fit at the design sizes
    if (size !== 'short') ok(!(await scrolls(page)), `${size}: ${id} does not scroll`)
    ok(await page.$('[data-next]'), `${size}: ${id} has Next`)
    if (/\.[a-z]+$/.test(id) && id.split('.').length > 2) {
      const n = await page.$$eval('[data-v2] [data-option], [data-v2] [data-choice]', (o) => o.length)
      ok(n >= 2, `${size}: ${id}, opened on its own, shows its choices (${n})`)
    }
    if (size !== 'phone') ok(await page.$('a[href="/kit/index.html#game"]'), `${size}: ${id} links back to the contents`)
  }
  ok(!errors.length, `${size} Game-style rows: no errors\n  ${errors.join('\n  ')}`)
  await close()
}

/* ---------------- the Quiz-style tab: every row opens its step, at every size ---------------- */
for (const size of ['desk', 'short', 'phone']) {
  const { page, errors, close } = await newPage(size)
  await page.goto(BASE + '/kit/index.html', { waitUntil: 'networkidle0' })
  const links = await page.$$eval('#list a', (a) => a.map((x) => x.getAttribute('href')))
  const steps = await page.evaluate(() => window.SURVEY.steps.map((s) => s.id))
  ok(links.length === steps.length, `${size}: the Quiz-style tab links all ${steps.length} steps (got ${links.length})`)
  for (const href of links) {
    await page.goto(BASE + '/kit/' + href, { waitUntil: 'networkidle0' })
    await pause(350)
    const id = new URL(page.url()).searchParams.get('id')
    const want = new URL(href, BASE + '/kit/').searchParams.get('id')
    ok(id === want, `${size}: ${href} lands on ${want} (got ${id})`)
    ok(!(await scrolls(page)), `${size}: ${want} does not scroll`)
    ok(await page.$('#next') || want === 'end', `${size}: ${want} has Next`)
  }
  ok(!errors.length, `${size} Quiz-style rows: no errors\n  ${errors.join('\n  ')}`)
  await close()
}

await browser.close()
console.log(failed ? `${failed} of ${checks} checks failed` : `kit check: all ${checks} checks pass`)
process.exit(failed ? 1 : 0)
