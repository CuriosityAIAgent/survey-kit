/* Plays the game-style survey (/kit/game?live=1) in Chrome through every screen's data hooks, checking that
   nothing scrolls, Next stays on screen, the rail and topic lines match the engine, the route walked is the one
   the engine computes from the answers, and that finishing sends exactly one response, which the server stores.
   Route A steers every conditional follow-up to fire; route B fires none, goes Back from a follow-up and reloads.
     npm run start    (in another terminal)
     node e2e/game-walk.mjs [A B]       BASE=http://localhost:3000 (default)   DESK=1 for a laptop   --shots */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const args = process.argv.slice(2)
const flag = (n) => args.includes(`--${n}`)
const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/+$/, '')
const DESK = process.env.DESK ? (/^\d+x\d+$/.test(process.env.DESK) ? process.env.DESK : '1440x790') : ''
const [W, H] = DESK ? DESK.split('x').map(Number) : [390, 660]
const OUT = '/tmp/kit-game-shots'
fs.mkdirSync(OUT, { recursive: true })
const here = path.dirname(fileURLToPath(import.meta.url))
const jiti = createJiti(import.meta.url)
const flow = await jiti.import(path.join(here, '../src/kit/game/engine/flow.ts'))
const STORE_KEY = 'kit-game-v1'
const PATH = '/kit/game'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ routes

   prefer: question id -> option ids to pick first (checklist, podium, track, months),
   or { cardOrTileId: answerOrTrayId, '*': fallback } for cards, stamp and trays. */
const ROUTES = {
  A: {
    link: '?live=1',
    prefer: { 'f1.2': ['8-12'], 'f1.3': { '*': 'always' }, 'f1.5': ['hour'], 'f2.3': { standing: 'yes' }, 'f3.1': { away: 'ground', '*': 'tv' } },
    notes: 'type',
    swapCheck: 'f2.1',
    expect: { 'first.age': '8-12', 'journey.time': 'hour' },
    fires: ['f1.2.who', 'f1.3.keep', 'f1.5.how', 'f2.3.how', 'f3.1.why'],
  },
  B: {
    link: '?live=1',
    prefer: { 'f1.2': ['never'], 'f1.3': { '*': 'not-me' }, 'f1.5': ['walk'], 'f2.3': { standing: 'no' }, 'f3.1': { '*': 'tv' } },
    notes: 'blank',
    backFrom: 'f2.1.best', // Back to 2.1, check its answer is kept, then on again
    reloadAt: 'f2.2',
    expect: { 'first.age': 'never', 'journey.time': 'walk' },
    fires: [],
  },
}

/* seeded random, so a route plays the same way every time */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ page helpers */

const fails = []
function fail(msg) { fails.push(msg); console.log('  FAIL ' + msg) }

async function state(page) {
  return page.evaluate((k) => {
    const root = document.querySelector('[data-v2]')
    let saved = null
    try { saved = JSON.parse(localStorage.getItem(k) || 'null')?.state ?? null } catch { /* */ }
    const next = document.querySelector('[data-next]')
    return {
      step: root?.dataset.step ?? null, kind: root?.dataset.kind ?? null, channel: root?.dataset.channel ?? null,
      finished: root?.dataset.finished === 'true',
      rail: document.querySelector('[data-rail]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      bridge: document.querySelector('[data-bridge]')?.textContent?.trim() ?? '',
      nextOn: !!next && !next.disabled, nextText: next?.textContent?.trim() ?? '',
      answers: saved?.answers ?? {},
    }
  }, STORE_KEY)
}

async function layoutCheck(page, label) {
  const m = await page.evaluate(() => {
    const d = document.documentElement
    const n = (document.querySelector('[data-next]') ?? document.querySelector('[data-done]'))?.getBoundingClientRect()
    return {
      sh: Math.max(d.scrollHeight, document.body.scrollHeight), sw: d.scrollWidth, ih: innerHeight, iw: innerWidth,
      next: n ? { top: n.top, bottom: n.bottom } : null,
      err: !!document.querySelector('[data-render-error]'),
    }
  })
  if (m.sh > m.ih + 1) fail(`${label}: page scrolls (${m.sh} > ${m.ih})`)
  if (m.sw > m.iw + 1) fail(`${label}: page scrolls sideways (${m.sw} > ${m.iw})`)
  if (!m.next) fail(`${label}: no Next`)
  else if (m.next.bottom > m.ih + 1 || m.next.top < 0) fail(`${label}: Next off screen (${Math.round(m.next.top)}-${Math.round(m.next.bottom)} of ${m.ih})`)
  if (m.err) fail(`${label}: the renderer failed (fallback shown)`)
}

async function press(page, el) {
  if (!el) return false
  await el.evaluate((e) => e.scrollIntoView({ block: 'nearest' }))
  if (DESK) await el.click()
  else await el.tap()
  await sleep(140)
  return true
}
const $$ = (page, sel) => page.$$(`[data-v2] [data-object] ${sel}, [data-v2] [data-tray] ${sel}`)
async function ids(page, sel, attr) {
  const els = await $$(page, sel)
  const out = []
  for (const e of els) {
    const v = await e.evaluate((n, a) => (n.closest('[aria-hidden="true"]') && !n.hasAttribute('data-zone') ? null : n.getAttribute(a)), attr)
    const dis = await e.evaluate((n) => n.disabled === true || n.getAttribute('aria-disabled') === 'true')
    if (v != null) out.push({ id: v, el: e, disabled: dis })
  }
  return out
}
async function one(page, sel) { return (await $$(page, sel))[0] ?? null }

async function waitStepChange(page, from, ms = 6000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const s = await page.evaluate(() => document.querySelector('[data-v2]')?.dataset.step ?? null)
    if (s && s !== from) { await sleep(380); return s } // past the Player's 300 ms busy window
    await sleep(60)
  }
  return from
}

/* ------------------------------------------------------------------ playing a screen */

const answerOf = async (page, stores) => (await state(page)).answers[stores]

/** Answer the current screen through the hooks until Next is live. */
async function play(page, st, route, R, meta) {
  const { q } = meta
  const prefer = route.prefer[meta.parentId] && meta.kind === 'question' ? route.prefer[meta.parentId] : undefined
  const pick = (list) => list[Math.floor(R() * list.length)]
  if (q.template === 'text') {
    const inputs = await $$(page, '[data-input]')
    if (!inputs.length) fail(`${q.id}: no [data-input]`)
    if (route.notes === 'type') {
      for (const [i, el] of inputs.entries()) {
        const v = await el.evaluate((n) => n.value)
        if (!v) { await press(page, el); await el.type(['More time with clients', 'Less formatting', 'Nothing else'][i] ?? 'Thanks', { delay: 5 }) }
      }
      await sleep(200)
      const a = await answerOf(page, q.stores)
      if (!a || !Object.values(a).some((x) => x)) fail(`${q.id}: typed notes were not stored`)
    }
    // leave the field so the phone keyboard closes before the layout check
    await page.evaluate(() => document.activeElement?.blur?.())
    await sleep(150)
    return (await state(page)).nextOn
  }
  for (let guard = 0; guard < 60; guard++) {
    const s = await state(page)
    const t = q.template
    // stop once Next is live and the route's steering is satisfied
    if (s.nextOn && (await steered(page, q, prefer))) return true
    if (t === 'bottle') {
      const jugs = (await ids(page, '[data-jug]', 'data-jug')).filter((j) => !j.disabled)
      if (!jugs.length) break
      await press(page, pick(jugs).el)
      continue
    }
    if (t === 'cards' && (await one(page, '[data-row]'))) {
      // 3.2's split card: one answer in each row (today, then 2031); the route steers the 2031 row
      const card = (await ids(page, '[data-option]', 'data-option'))[0]?.id
      if (!card) break
      for (const row of ['first', 'main']) {
        const choices = (await ids(page, `[data-row="${row}"] [data-choice]`, 'data-choice')).filter((c) => !c.disabled)
        if (!choices.length) { fail(`${q.id}: no answers in the ${row} row`); break }
        const want = row === 'main' && prefer && typeof prefer === 'object' && !Array.isArray(prefer) ? (prefer[card] ?? prefer['*']) : undefined
        const c = choices.find((x) => x.id === want) ?? (row === 'main' ? pickCard(choices, q, R, prefer) : pick(choices))
        await press(page, c.el)
        await sleep(90)
      }
      for (let k = 0; k < 30; k++) {
        await sleep(80)
        if ((await ids(page, '[data-option]', 'data-option'))[0]?.id !== card) break
      }
      await sleep(120)
      continue
    }
    if (t === 'cards' || t === 'stamp') {
      const choices = (await ids(page, '[data-choice]', 'data-choice')).filter((c) => !c.disabled)
      if (choices.length) {
        const card = (await ids(page, '[data-card]', 'data-card'))[0]?.id ?? (await ids(page, '[data-option]', 'data-option'))[0]?.id
        const want = prefer && typeof prefer === 'object' && !Array.isArray(prefer) ? (prefer[card] ?? prefer['*']) : undefined
        const c = choices.find((x) => x.id === want) ?? pickCard(choices, q, R, prefer)
        await press(page, c.el)
        // wait for the card to fly off and the next one to settle before reading it
        for (let k = 0; k < 30; k++) {
          await sleep(80)
          const now = (await ids(page, '[data-card]', 'data-card'))[0]?.id ?? (await ids(page, '[data-option]', 'data-option'))[0]?.id
          if (now !== card) break
        }
        await sleep(120)
        continue
      }
      // a follow-up drawn as options on the card (or a certificate)
      const opts = (await ids(page, '[data-option]', 'data-option')).filter((o) => !o.disabled)
      if (opts.length) { await press(page, pick(opts).el); continue }
      break
    }
    if (t === 'trays') {
      const zones = await ids(page, '[data-zone]', 'data-zone')
      const pool = (await ids(page, '[data-option]', 'data-option')).filter((o) => !o.disabled)
      const placed = (await answerOf(page, q.stores)) ?? {}
      const free = pool.filter((o) => typeof placed !== 'object' || Array.isArray(placed) || placed[o.id] === undefined)
      if (!zones.length) { // a one-tap list (3.1's follow-up)
        if (!free.length) break
        await press(page, pick(free).el); continue
      }
      if (!free.length) break
      const map = prefer && typeof prefer === 'object' && !Array.isArray(prefer) ? prefer : {}
      const tile = free.find((o) => map[o.id]) ?? free[0]
      const order = map[tile.id] ? [map[tile.id], ...zones.map((z) => z.id).filter((z) => z !== map[tile.id])] : shuffle(zones.map((z) => z.id), R)
      let done = false
      for (const zid of order) {
        await press(page, tile.el)
        const z = (await ids(page, '[data-zone]', 'data-zone')).find((x) => x.id === zid)
        await press(page, z?.el)
        await sleep(120)
        const after = (await answerOf(page, q.stores)) ?? {}
        if (after[tile.id] === zid) { done = true; break }
        // refused (full): make sure nothing is still selected, try the next tray
        await press(page, tile.el)
        if ((await answerOf(page, q.stores))?.[tile.id] !== undefined) { done = true; break }
      }
      if (!done) break
      continue
    }
    if (t === 'track' || t === 'months') {
      const zones = await ids(page, '[data-zone]', 'data-zone')
      const want = Array.isArray(prefer) ? zones.find((z) => prefer.includes(z.id)) : undefined
      if (zones.length) { await press(page, (want ?? pick(zones)).el); await sleep(200); continue }
      const opts = (await ids(page, '[data-option]', 'data-option')).filter((o) => !o.disabled)
      if (opts.length) { await press(page, pick(opts).el); continue }
      break
    }
    if (t === 'podium') {
      const tiles = (await ids(page, '[data-option]', 'data-option')).filter((o) => !o.disabled)
      // complete: ids in rank order; partial: { first, second, third } by position
      const placedIds = (a) => (Array.isArray(a) ? a : a && typeof a === 'object' ? Object.values(a) : [])
      const cur = placedIds(await answerOf(page, q.stores))
      const free = tiles.filter((o) => !cur.includes(o.id))
      if (!free.length) break
      const tile = pick(free)
      await press(page, tile.el)
      const after = placedIds(await answerOf(page, q.stores))
      if (!after.includes(tile.id)) {
        // tap-then-tap onto the next empty step
        const zones = await ids(page, '[data-zone]', 'data-zone')
        const z = zones[after.length] ?? zones[0]
        await press(page, z?.el)
      }
      continue
    }
    if (t === 'scene') break
    // checklist (and anything else that is a list of options, with 5.6's verbs and its text)
    const choices = (await ids(page, '[data-choice]', 'data-choice')).filter((c) => !c.disabled)
    const opts = (await ids(page, '[data-option]', 'data-option')).filter((o) => !o.disabled)
    const cur = await answerOf(page, q.stores)
    const pickedIds = Array.isArray(cur) ? cur : typeof cur === 'string' ? [cur] : cur && typeof cur === 'object' ? Object.values(cur) : []
    if (choices.length && !(cur && typeof cur === 'object' && !Array.isArray(cur) && cur.verb)) { await press(page, pick(choices).el); continue }
    const want = Array.isArray(prefer) ? opts.find((o) => prefer.includes(o.id) && !pickedIds.includes(o.id)) : undefined
    const input = await one(page, '[data-input]')
    if (input && !(await input.evaluate((n) => n.value))) { await press(page, input); await input.type('A client review with a family', { delay: 5 }); continue }
    const free = opts.filter((o) => !pickedIds.includes(o.id) && o.id !== 'other')
    const o = want ?? (prefer ? free.find((x) => !prefer.includes?.(x.id) && !['not-yet', 'works'].includes(x.id)) : null) ?? pick(free.length ? free : opts)
    if (!o) break
    await press(page, o.el)
  }
  const s = await state(page)
  if (s.nextOn && !(await steered(page, q, prefer))) fail(`${q.id}: could not steer the answer to ${JSON.stringify(prefer)} (got ${JSON.stringify(await answerOf(page, q.stores))})`)
  return s.nextOn
}

function pickCard(choices, q, R, prefer) {
  // never pick a steered-only answer by chance (it would fire a follow-up the route did not plan)
  const reserved = new Set(Object.entries(prefer && typeof prefer === 'object' ? prefer : {}).filter(([k]) => k !== '*').map(([, v]) => v))
  const star = prefer?.['*']
  const ok = choices.filter((c) => !reserved.has(c.id) || c.id === star)
  const pool = star ? choices.filter((c) => c.id === star) : ok
  return (pool.length ? pool : choices)[Math.floor(R() * (pool.length ? pool.length : choices.length))]
}
function shuffle(a, R) { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [o[i], o[j]] = [o[j], o[i]] } return o }

/** Is the route's steering for this question in the stored answer? */
async function steered(page, q, prefer) {
  if (!prefer) return true
  const a = await answerOf(page, q.stores)
  if (Array.isArray(prefer)) {
    if (Array.isArray(a)) return prefer.every((p) => a.includes(p)) || a.length >= (q.constraints.pick ?? 99)
    return typeof a === 'string' ? prefer.includes(a) : a !== undefined
  }
  if (a && typeof a === 'object') return Object.entries(prefer).every(([k, v]) => k === '*' || a[k] === v)
  return a !== undefined
}

/* ------------------------------------------------------------------ a route */

async function runRoute(browser, name) {
  const route = ROUTES[name]
  const R = rng([...name].reduce((h, c) => h * 31 + c.charCodeAt(0), 7))
  const page = await browser.newPage()
  await page.setViewport(DESK ? { width: W, height: H } : { width: W, height: H, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() !== 'error' || /Download the React DevTools|favicon/.test(m.text())) return
    // the refused first send (route B) is logged by Chrome as a failed resource: expected
    errors.push('console: ' + m.text().slice(0, 200))
  })
  // finishing sends the answers once, to /api/responses, and the server stores them
  let posts = 0, stored = 0
  page.on('request', (req) => { if (req.method() === 'POST' && req.url().endsWith('/api/responses')) posts++ })
  page.on('response', async (res) => { if (res.request().method() === 'POST' && res.url().endsWith('/api/responses') && res.ok()) stored++ })
  await page.goto(BASE + PATH + route.link, { waitUntil: 'networkidle0' })
  await page.evaluate((k) => localStorage.removeItem(k), STORE_KEY)
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-v2][data-step="welcome"]', { timeout: 15000 })
  console.log(`route ${name} (${DESK ? 'desk ' + DESK : 'phone 390x660'})`)

  // welcome
  let s = await state(page)
  await layoutCheck(page, `${name}/welcome`)
  if (await page.$('[data-q="welcome"] [data-option]')) fail(`${name}/welcome: asks for business or class`)
  s = await state(page)
  if (!s.nextOn) fail(`${name}/welcome: Start not live (${s.nextText})`)
  const channel = s.channel
  const lengthLine = await page.$eval('[data-length]', (e) => e.textContent)
  if (!lengthLine.startsWith(`${flow.totalFor(channel)} questions`)) fail(`${name}/welcome: length line "${lengthLine}"`)
  await press(page, await page.$('[data-next]'))
  let step = await waitStepChange(page, 'welcome')

  const visited = []
  let n = 0, backDone = false, reloaded = false
  for (let guard = 0; guard < 120; guard++) {
    s = await state(page)
    if (s.finished || s.step === 'end') break
    step = s.step
    visited.push(step)
    n++
    const view = flow.viewAt(channel, cursorOf(channel, step, s.answers), s.answers, false)
    const label = `${name}/${String(n).padStart(2, '0')} ${step}`
    // the rail and the topic line
    if (view.key !== step) fail(`${label}: engine view is ${view.key}`)
    const want = view.kind === 'break' ? `Section ${view.section} of ${view.sections}`
      : view.kind === 'scene' ? 'Before the next questions'
      : `Question ${view.n} of ${view.total}`
    if (!s.rail.includes(want)) fail(`${label}: rail "${s.rail}" (want "${want}")`)
    if (view.kind !== 'question' && view.kind !== 'follow' && /Question \d+ of/.test(s.rail)) fail(`${label}: rail numbers a screen that is not a question ("${s.rail}")`)
    if (view.kind === 'follow' && s.bridge !== view.bridge) fail(`${label}: topic line "${s.bridge}" (want "${view.bridge}")`)
    if (view.kind === 'question' && s.bridge) fail(`${label}: a question shows a topic line`)
    await layoutCheck(page, label)

    if (route.swapCheck === step) await swapCheck(page, view.q, label)
    if (view.kind === 'question' || view.kind === 'follow') {
      // on arrival, before any answer: Next says what's missing
      if (flag('shots')) await page.screenshot({ path: `${OUT}/walk-${name}-${String(n).padStart(2, '0')}-${step}-0.png` })
      const meta = { q: view.q, kind: view.kind, parentId: view.kind === 'follow' ? view.parent.id : view.q.id }
      const ok = await play(page, s, route, R, meta)
      if (!ok) {
        const st = await state(page)
        fail(`${label}: stuck, Next says "${st.nextText}"`)
        await page.screenshot({ path: `${OUT}/stuck-${name}-${step}.png` })
        break
      }
      await layoutCheck(page, `${label} (answered)`)
    }
    if (flag('shots')) await page.screenshot({ path: `${OUT}/walk-${name}-${String(n).padStart(2, '0')}-${step}.png` })

    // B: Back from a follow-up returns to the parent with its answer, then on again
    if (route.backFrom === step && !backDone) {
      backDone = true
      const parent = view.parent
      const before = JSON.stringify((await state(page)).answers[parent.stores])
      await press(page, await page.$('[data-rail] button[aria-label="Back"]'))
      const back = await waitStepChange(page, step)
      const after = await state(page)
      if (back !== parent.id) fail(`${label}: Back went to ${back}, not ${parent.id}`)
      if (JSON.stringify(after.answers[parent.stores]) !== before) fail(`${label}: Back lost the parent's answer`)
      visited.push(parent.id)
      if (!after.nextOn) fail(`${label}: the parent's Next is not live after Back`)
      await press(page, await page.$('[data-next]'))
      const again = await waitStepChange(page, parent.id)
      if (again !== step) fail(`${label}: Next from the parent went to ${again}`)
      continue
    }
    // B: a reload resumes on the same screen
    if (route.reloadAt === step && !reloaded) {
      reloaded = true
      await page.reload({ waitUntil: 'networkidle0' })
      await page.waitForSelector('[data-v2]')
      await sleep(400)
      const r = await state(page)
      if (r.step !== step) fail(`${label}: reload resumed at ${r.step}`)
    }

    // the last question: Send. Route B's first send is refused: stay, say so, retry.
    const isLast = flow.nextCursor(channel, cursorOf(channel, step, (await state(page)).answers), (await state(page)).answers, false) === 'end'
    if (isLast) {
      const st = await state(page)
      if (st.nextText.replace(/\s*→$/, '') !== 'Finish') fail(`${label}: the last Next says "${st.nextText}", not Finish`)
      if (route.failFirstSend) {
        await press(page, await page.$('[data-next]'))
        for (let k = 0; k < 50 && !/Couldn/.test((await state(page)).nextText); k++) await sleep(100)
        const f = await state(page)
        if (f.finished || f.step !== step) fail(`${label}: a refused send still ended the game`)
        if (!/^Couldn't send\. Tap to try again\./.test(f.nextText)) fail(`${label}: after a refused send Next says "${f.nextText}"`)
        if (!f.nextOn) fail(`${label}: after a refused send Next is not live`)
        await sleep(350)
      }
    }
    await press(page, await page.$('[data-next]'))
    const to = await waitStepChange(page, step)
    if (to === step) { fail(`${label}: Next did not move on`); break }
  }
  if (posts !== 1 || stored !== 1) fail(`${name}: ${posts} sends, ${stored} stored (want 1 and 1)`)

  s = await state(page)
  if (!s.finished) fail(`${name}: did not reach the ending (at ${s.step})`)
  else {
    await layoutCheck(page, `${name}/end`)
    const txt = await page.$eval('[data-v2]', (e) => e.textContent)
    if (!txt.includes("That's the final whistle.")) fail(`${name}/end: the ending line is missing`)
    if (!txt.includes('Your answers have been sent.')) fail(`${name}/end: the sent thanks line is missing`)
    if (/Question \d+ of/.test(s.rail)) fail(`${name}/end: the rail numbers the ending ("${s.rail}")`)
    if (await page.$('[data-next]')) fail(`${name}/end: a live ending shows a button`)
  }
  const a = s.answers
  // the route the engine computes from these answers, from the first question to the end
  const want = []
  let c = { screen: 0, fu: -1 }
  while (c !== 'end') { want.push(flow.viewAt(channel, c, a, false).key); c = flow.nextCursor(channel, c, a, false) }
  const seen = dedupeBack(visited, route.backFrom)
  if (s.finished && JSON.stringify(seen) !== JSON.stringify(want)) fail(`${name}: visited\n    ${seen.join(' ')}\n  engine route\n    ${want.join(' ')}`)
  // every question's stores, and every follow-up on the path
  for (const k of flow.expectedStores(channel, a)) if (a[k] === undefined) fail(`${name}: nothing stored under "${k}"`)
  const fired = flow.followUpsOnPath(channel, a)
  const optional = new Set(['f2.1.best', 'f3.2.most', 'f3.3.less']) // the 'always' ones
  const firedOpt = fired.filter((f) => !optional.has(f))
  if (JSON.stringify(firedOpt) !== JSON.stringify(route.fires)) fail(`${name}: follow-ups fired ${JSON.stringify(firedOpt)}, planned ${JSON.stringify(route.fires)}`)
  for (const [k, v] of Object.entries(route.expect)) if (JSON.stringify(a[k]) !== JSON.stringify(v)) fail(`${name}: ${k} = ${JSON.stringify(a[k])}, want ${JSON.stringify(v)}`)
  for (const e of errors) fail(`${name}: page error: ${e}`)
  console.log(`  ${visited.length} steps, follow-ups: ${fired.join(', ') || 'none'}`)
  await page.close()
  return { fired }
}

/** 3.1 on a phone: fill "Do more" (3), hold a 4th tile, tap a placed tile (a swap),
    and the page must still not scroll. Then put everything back as it was. */
async function swapCheck(page, q, label) {
  const trays = q.constraints.trays ?? []
  const more = trays[0]
  if (!more?.capacity) return
  const tiles = async () => (await ids(page, '[data-pool] [data-option]', 'data-option'))
  for (let k = 0; k < more.capacity; k++) {
    const t = (await tiles())[0]
    await press(page, t.el)
    await press(page, (await ids(page, '[data-zone]', 'data-zone')).find((z) => z.id === more.id)?.el)
  }
  const placed = (await answerOf(page, q.stores)) ?? {}
  if (Object.values(placed).filter((v) => v === more.id).length !== more.capacity) { fail(`${label}: could not fill "${more.label}" by tap-then-tap`); return }
  // a refused tap on the full tray says so, quietly, at the tray's foot
  const fourth = (await tiles())[0]
  await press(page, fourth.el)
  // tap the tray itself (its heading), not one of its tiles (that would swap)
  await press(page, await page.$(`[data-zone="${more.id}"] > div:first-child`))
  const note = await page.$('[data-zone="' + more.id + '"] [role="status"]')
  if (!note) fail(`${label}: no "Full. Tap one to swap" after a refused tap`)
  await layoutCheck(page, `${label} (full tray refused)`)
  // swap: the held 4th (still held after the refusal) onto a placed tile
  if ((await fourth.el.evaluate((n) => n.getAttribute('aria-pressed'))) !== 'true') await press(page, fourth.el)
  const inMore = await page.$$(`[data-zone="${more.id}"] [data-option]`)
  await press(page, inMore[0])
  await sleep(300)
  const after = (await answerOf(page, q.stores)) ?? {}
  if (after[fourth.id] !== more.id) fail(`${label}: the swap did not place the held tile`)
  await layoutCheck(page, `${label} (after a swap)`)
  const dashed = await page.$$eval('[data-pool] > *', (els) => els.filter((e) => getComputedStyle(e).borderStyle === 'dashed').length)
  if (dashed) fail(`${label}: ${dashed} dashed empty boxes left in the tile list`)
  // back to an empty sort (tap each placed tile), so the route plays on as planned
  for (let k = 0; k < 12; k++) {
    const el = await page.$('[data-zone] [data-option]')
    if (!el) break
    await press(page, el)
    await sleep(80)
  }
  const left = (await answerOf(page, q.stores)) ?? {}
  if (Object.keys(left).length) fail(`${label}: could not take the tiles back out (${JSON.stringify(left)})`)
}

/** The cursor for a step id, given the answers (live rules). */
function cursorOf(channel, step, answers) {
  const list = flow.screens(channel)
  for (let i = 0; i < list.length; i++) {
    const sc = list[i]
    if (flow.screenId(sc) === step) return { screen: i, fu: -1 }
    if (sc.kind === 'question') {
      const fus = flow.followList(sc.question, answers, false)
      const j = fus.findIndex((f) => f.id === step)
      if (j >= 0) return { screen: i, fu: j }
    }
  }
  return { screen: -1, fu: -1 }
}

/** Drop the Back detour (follow-up, parent, follow-up again) from the visited list. */
function dedupeBack(v, backFrom) {
  const out = []
  for (let i = 0; i < v.length; i++) {
    if (backFrom && v[i] === backFrom && v[i + 2] === backFrom) { out.push(v[i]); i += 2; continue }
    out.push(v[i])
  }
  return out
}

/* ------------------------------------------------------------------ main */

const names = args.filter((a) => ROUTES[a])
const run = names.length ? names : Object.keys(ROUTES)
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const allFired = new Set()
try {
  for (const r of run) {
    try { const { fired } = await runRoute(browser, r); fired.forEach((f) => allFired.add(f)) } catch (e) { fail(`${r}: ${e.stack || e}`) }
  }
} finally { await browser.close() }

// across the routes, every follow-up of every question on this channel fired somewhere
if (run.length === Object.keys(ROUTES).length) {
  const channel = DESK ? 'desk' : 'phone'
  const all = flow.screens(channel).flatMap((s) => (s.kind === 'question' ? (s.question.followUps ?? []).map((f) => f.id) : []))
  const missed = all.filter((f) => !allFired.has(f))
  if (missed.length) fail(`follow-ups that never fired on any route: ${missed.join(', ')}`)
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS')
process.exit(fails.length ? 1 : 0)
