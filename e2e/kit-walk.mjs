// Walks the survey kit at /kit the way someone trying it would: /kit lands on the contents page, which lists every
// step; Start, then Next through every step to the ending. The order comes from the served script, so a change to the
// sample survey needs no change here. No step may scroll, log an error or lose Next. Steps that move inside the page
// (the ladder's three steps, the three competitions, the quotes and notes on a phone, the newspaper) keep their id
// while Next moves them on.
// Then, on a laptop, it plays the screens whose answers feed a later screen, and checks the later screen reads them:
//   3.1 piles (keys 1-4)  -> 3.1a's podium holds the Makes the day cards; 3.2's trays drop what went in Not for me
//   3.3 bottle            -> 10 taps fill it and an 11th does nothing
//   4.2 ledger split      -> 4.3 asks about the rest of the 10 hours
//   5.1 stamps            -> 5.1a has only the Back it and Try it lines live
//   6.3 rank              -> the ending's top three
//   BASE=http://localhost:3000 node e2e/kit-walk.mjs
//   SIZES=desk,phone (default both)
import puppeteer from 'puppeteer-core'

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
const SIZES = (process.env.SIZES || 'desk,phone').split(',')
const VIEW = {
  desk: { width: 1440, height: 790, deviceScaleFactor: 1 },
  phone: { width: 390, height: 660, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}

let failed = 0
const ok = (cond, what) => { if (!cond) { failed++; console.log('FAIL ' + what) } return cond }
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})

function watch(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  // web fonts load from Google; their outages are not the kit's errors
  const font = (t) => /fonts\.(googleapis|gstatic)\.com/.test(t)
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !font(m.text() + ' ' + ((m.location() || {}).url || ''))) errors.push(m.type() + ': ' + m.text()) })
  page.on('requestfailed', (r) => { if (!r.url().startsWith('https://fonts.')) errors.push('request failed: ' + r.url()) })
  return errors
}
const idOf = (page) => new URL(page.url()).searchParams.get('id')
async function open(page, path) {
  await page.goto(BASE + '/kit/' + path, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  await pause(300)
}

/* ---------------- the walk, at each size ---------------- */
for (const size of SIZES) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport(VIEW[size])
  const errors = watch(page)

  await page.goto(BASE + '/kit', { waitUntil: 'networkidle0' })
  ok(page.url().endsWith('/kit/index.html'), `${size}: /kit lands on the contents page (got ${page.url()})`)
  const steps = await page.evaluate(() => window.SURVEY.steps.map((s) => s.id))
  const rows = await page.$$eval('#list .ix-row, #list a.ix-ch', (r) => r.length)   // breaks are the chapter headings
  ok(rows === steps.length, `${size}: the contents page lists ${steps.length} steps (got ${rows})`)
  const check = await page.evaluate(() => window.SurveyNav.selfCheck())
  ok(check.ok, `${size}: the script passes its own check`)

  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.click('#startQuiz')])
  const seen = []
  for (let clicks = 0; clicks < 400; clicks++) {
    const id = idOf(page)
    if (seen[seen.length - 1] !== id) {
      seen.push(id)
      const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1)
      ok(!scrolls, `${size}: ${id} does not scroll`)
    }
    if (id === 'end') break
    if (!ok(await page.$('#next'), `${size}: ${id} has Next`)) break
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 2500 }).catch(() => null), page.click('#next')])
    await pause(120)
  }
  ok(seen.join(' ') === steps.join(' '), `${size}: Next visits every step in order\n  want ${steps.join(' ')}\n  got  ${seen.join(' ')}`)
  ok(!errors.length, `${size}: no console or page errors\n  ${errors.join('\n  ')}`)
  console.log(`${size}: walked ${seen.length} of ${steps.length} steps`)
  await context.close()
}

/* ---------------- answers that feed later screens (laptop) ---------------- */
{
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport(VIEW.desk)
  const errors = watch(page)
  await open(page, 'index.html')
  await page.evaluate(() => window.SurveyNav.answers.clearAll())

  // 3.1: sort all twelve cards with the number keys: five in Makes the day, two in Not for me, the rest Expected
  await open(page, 't-piles.html?id=3.1')
  const keys = ['4', '4', '4', '4', '4', '1', '1', '3', '3', '3', '3', '3']
  for (const k of keys) { await page.keyboard.press(k); await pause(260) }
  await pause(600)
  const piles = await page.evaluate(() => window.SurveyNav.answers.get('3.1') || {})
  const inPile = (p) => Object.keys(piles).filter((id) => piles[id] === p)
  ok(Object.keys(piles).length === 12, `3.1 stores all 12 cards (got ${Object.keys(piles).length})`)
  ok(inPile('top').length === 5 && inPile('out').length === 2, `3.1 stores 5 in Makes the day and 2 in Not for me (got ${JSON.stringify(piles)})`)

  await open(page, 't-podium.html?id=3.1a')
  const podium = await page.$$eval('#tiles [data-id]', (t) => t.map((x) => x.dataset.id))
  ok(podium.length === 5 && inPile('top').every((id) => podium.includes(id)), `3.1a offers the 5 Makes the day cards (got ${podium.join(', ')})`)

  await open(page, 't-trays.html?id=3.2')
  const tiles = await page.$$eval('.ty-pool .ty-tile', (t) => t.map((x) => x.textContent.trim()))
  const labels = await page.evaluate((out) => {
    const s = window.SurveyNav.step('3.2')
    return { out: s.data.tiles.filter((t) => out.includes(t.id)).map((t) => t.label), all: s.data.tiles.length }
  }, inPile('out'))
  ok(labels.out.every((l) => !tiles.includes(l)), `3.2 drops the tiles put in Not for me (${labels.out.join(', ')})`)
  ok(tiles.includes('Ticket prices'), '3.2 always shows Ticket prices')

  // 3.3: ten taps fill the bottle; the eleventh changes nothing
  await open(page, 't-bottle.html?id=3.3')
  for (let i = 0; i < 11; i++) { await page.click('[data-jug="match"]'); await pause(150) }
  await pause(400)
  const bottle = await page.evaluate(() => window.SurveyNav.answers.get('3.3') || {})
  ok(Object.values(bottle).reduce((a, b) => a + b, 0) === 10 && bottle.match === 10, `3.3 holds exactly 10 hours (got ${JSON.stringify(bottle)})`)

  // 4.2's split sets 4.3's question: 3 hours out leaves 7 at home
  await open(page, 't-allocate-ledger.html?id=4.2')
  await page.type('#splitIn', '3')
  await page.keyboard.press('Tab')
  await pause(300)
  await open(page, 't-allocate-ledger.html?id=4.3')
  const q43 = await page.$eval('.c-q', (e) => e.textContent)
  ok(q43.includes('7.0h'), `4.3 asks about the 7.0h left (got "${q43}")`)

  // 5.1: two Back it, six No; then 5.1a has exactly those two lines live
  await open(page, 't-stamp.html?id=5.1')
  // each stamp waits for the last one to land (the deck ignores a press mid-stamp)
  for (const [i, c] of ['back', 'back', 'no', 'no', 'no', 'no', 'no', 'no'].entries()) {
    await page.click(`.st-stamp[data-choice="${c}"]`)
    await page.waitForFunction((n) => Object.keys(window.SurveyNav.answers.get('5.1') || {}).length >= n, { timeout: 4000 }, i + 1).catch(() => null)
    await pause(900)
  }
  await pause(500)
  const stamps = await page.evaluate(() => window.SurveyNav.answers.get('5.1') || {})
  const backed = Object.keys(stamps).filter((id) => stamps[id] === 'back')
  ok(Object.keys(stamps).length === 8 && backed.length === 2, `5.1 stores 8 stamps, 2 Back it (got ${JSON.stringify(stamps)})`)
  await open(page, 't-stamp.html?id=5.1a')
  const live = await page.$$eval('.tf-line[data-pick]:not([disabled])', (b) => b.map((x) => x.dataset.pick))
  ok(live.length === 2 && backed.every((id) => live.includes(id)), `5.1a has only the Back it lines live (got ${live.join(', ')})`)

  // 6.3's order sets the ending's top three
  const order = await page.evaluate(() => {
    const ids = window.SurveyNav.step('6.3').data.blocks.map((b) => b.id).reverse()
    window.SurveyNav.answers.set('6.3', ids)
    return ids
  })
  await open(page, 't-flow.html?id=end')
  const top = await page.$$eval('.wr-items li', (l) => l.map((x) => x.textContent.trim()))
  const want = await page.evaluate((ids) => ids.slice(0, 3).map((id) => window.SurveyNav.step('6.3').data.blocks.find((b) => b.id === id).label), order)
  ok(top.join('|').toLowerCase() === want.join('|').toLowerCase(), `the ending shows the top three from 6.3 (got ${top.join(' · ')})`)

  ok(!errors.length, `playing: no console or page errors\n  ${errors.join('\n  ')}`)
  await context.close()
}

/* ---------------- the Game-style tab: lists the game-style screens, and each row opens its screen ---------------- */
{
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport(VIEW.desk)
  const errors = watch(page)
  await page.goto(BASE + '/kit/index.html#game', { waitUntil: 'networkidle0' })
  await page.waitForSelector('#glist .ix-row', { timeout: 10000 }).catch(() => null)
  const { rows } = await page.evaluate(async () => (await fetch(window.SURVEY.game.screens)).json())
  const shown = await page.$$eval('#glist .ix-row, #glist a.ix-ch', (r) => r.length)
  ok(shown === rows.length && rows.length > 20, `the Game-style tab lists ${rows.length} screens (got ${shown})`)
  ok(await page.$eval('#list', (e) => e.hidden), 'the Quiz-style list is hidden on #game')
  ok((await page.$eval('#startGame', (e) => e.getAttribute('href'))) === '/kit/game?live=1', "the Game-style card's Start opens a live run")
  for (const id of ['f2.1', 'f1.3.keep', 'f3.1.why', 'break:future', 'scene']) {
    await page.goto(BASE + '/kit/game?at=' + encodeURIComponent(id), { waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-v2]')
    await pause(500)
    const step = await page.$eval('[data-v2]', (e) => e.dataset.step)
    ok(step === id, `?at=${id} opens that screen (got ${step})`)
    if (id.split('.').length > 2) {   // a follow-up opened on its own still has its choices (from the parent's sample)
      const n = await page.$$eval('[data-v2] [data-option], [data-v2] [data-choice]', (o) => o.length)
      ok(n >= 2, `?at=${id} shows its choices (got ${n})`)
    }
  }
  ok(await page.$('a[href="/kit/index.html#game"]'), 'a game-style screen links back to the contents on a laptop')
  ok(!errors.length, `Game-style tab: no console or page errors\n  ${errors.join('\n  ')}`)
  await context.close()
}

await browser.close()
console.log(failed ? `${failed} check(s) failed` : 'kit walk: all checks pass')
process.exit(failed ? 1 : 0)
