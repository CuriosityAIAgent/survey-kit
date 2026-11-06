// Checks the server side: saving a response, sign-in, the results page and the CSV, plus the quiz-style ending
// sending its answers with a personal link's code. Needs the server running with SURVEY_ADMIN_PASSWORD set:
//   SURVEY_ADMIN_PASSWORD=... node e2e/backend-check.mjs     (BASE=http://localhost:3000)
import puppeteer from 'puppeteer-core'

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '')
const PASSWORD = process.env.SURVEY_ADMIN_PASSWORD
if (!PASSWORD) { console.error('Set SURVEY_ADMIN_PASSWORD to the server’s password.'); process.exit(2) }
let failed = 0, checks = 0
const ok = (cond, what) => { checks++; if (!cond) { failed++; console.log('FAIL ' + what) } return cond }
const post = (path, body, headers = {}) => fetch(BASE + path, { method: 'POST', redirect: 'manual', headers, body })

/* saving */
const bad = await post('/api/responses', JSON.stringify({ experience: 'other', answers: {} }), { 'content-type': 'application/json' })
ok(bad.status === 400, `an unknown experience is refused (${bad.status})`)
const mark = 'check' + Date.now().toString(36)
const good = await post('/api/responses', JSON.stringify({ experience: 'game', respondent: mark, answers: { 'fan.why': ['family', 'player'], rituals: { shirt: 'always', seat: 'not-me' }, notes: { keep: 'Singing, "loud", and late, kick-offs' } } }), { 'content-type': 'application/json' })
const gj = await good.json()
ok(good.ok && gj.ok && gj.id > 0, `a game response is stored (${JSON.stringify(gj)})`)

/* limits and repeats */
let deep = 'x'; for (let i = 0; i < 6; i++) deep = { d: deep }
const tooDeep = await post('/api/responses', JSON.stringify({ experience: 'quiz', answers: { a: deep } }), { 'content-type': 'application/json' })
ok(tooDeep.status === 413, `answers nested too deep are refused (${tooDeep.status})`)
const many = Object.fromEntries(Array.from({ length: 1200 }, (_, i) => ['k' + i, 'v']))
ok((await post('/api/responses', JSON.stringify({ experience: 'quiz', answers: many }), { 'content-type': 'application/json' })).status === 413, 'answers with too many values are refused')
const sub = 'sub' + Date.now().toString(36)
const once = { experience: 'quiz', id: sub, answers: { '1.1': 'goals' } }
const r1 = await (await post('/api/responses', JSON.stringify(once), { 'content-type': 'application/json' })).json()
const r2 = await (await post('/api/responses', JSON.stringify(once), { 'content-type': 'application/json' })).json()
ok(r1.ok && r2.ok && r2.repeat === true && r1.id === r2.id, 'the same submission id sent twice is stored once')

/* sign-in */
const cross = await post('/api/signin', new URLSearchParams({ password: PASSWORD }).toString(), { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://evil.example' })
ok(cross.status === 403, `a sign-in form from another site is refused (${cross.status})`)
ok((await post('/api/signout', '', { origin: 'https://evil.example' })).status === 403, 'a sign-out form from another site is refused')
ok((await fetch(BASE + '/api/results')).status === 401, 'the CSV needs sign-in')
const results0 = await fetch(BASE + '/results', { redirect: 'manual' })
ok([303, 307, 308].includes(results0.status) && /\/signin/.test(results0.headers.get('location') || ''), '/results sends a signed-out visitor to /signin')
const form = (pw) => new URLSearchParams({ password: pw }).toString()
const wrong = await post('/api/signin', form('not-the-password'), { 'content-type': 'application/x-www-form-urlencoded' })
ok(wrong.status === 303 && /e=wrong/.test(wrong.headers.get('location') || ''), 'a wrong password is refused')
const right = await post('/api/signin', form(PASSWORD), { 'content-type': 'application/x-www-form-urlencoded' })
const cookie = (right.headers.get('set-cookie') || '').split(';')[0]
ok(right.status === 303 && right.headers.get('location') === '/results' && /^survey_owner=\d+\.[0-9a-f]{64}$/.test(cookie), 'the right password signs in')
ok(/HttpOnly/i.test(right.headers.get('set-cookie') || ''), 'the sign-in cookie is httpOnly')
const page = await fetch(BASE + '/results', { headers: { cookie } })
const html = await page.text()
ok(page.ok && /Download CSV/.test(html) && html.includes(mark), '/results shows the counts, the CSV buttons and the new response')

/* CSV */
const csvRes = await fetch(BASE + '/api/results?experience=game', { headers: { cookie } })
const bytes = new Uint8Array(await csvRes.arrayBuffer())
const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
ok(csvRes.ok && /text\/csv/.test(csvRes.headers.get('content-type') || '') && /attachment; filename="survey-game-/.test(csvRes.headers.get('content-disposition') || ''), 'the game CSV downloads as a file')
ok(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, 'the CSV starts with a UTF-8 BOM, for Excel')
const lines = csv.replace(/^\uFEFF/, '').trim().split('\r\n')
const head = lines[0].split(',')
ok(['id', 'experience', 'respondent', 'submitted_at'].every((c, i) => head[i] === c), `the CSV starts with id, experience, respondent, submitted_at (${head.slice(0, 4)})`)
ok(head.includes('fan.why') && head.includes('rituals.shirt') && head.includes('notes.keep'), 'nested answers become their own columns')
const row = lines.find((l) => l.includes(mark)) || ''
ok(row.includes('family; player') && row.includes('"Singing, ""loud"", and late, kick-offs"'), 'lists are joined with ; and commas and quotes are escaped')

/* the quiz-style ending sends, once, with the personal link's code */
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' })
const p = await (await browser.createBrowserContext()).newPage()
let sends = 0
p.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/responses')) sends++ })
const code = 'q' + mark
await p.goto(`${BASE}/kit/index.html?r=${code}`, { waitUntil: 'networkidle0' })
await p.evaluate(() => { window.SurveyNav.answers.set('1.1', 'atmosphere'); window.SurveyNav.answers.set('3.1', { pint: 'top', singing: 'top' }) })
await p.goto(`${BASE}/kit/t-flow.html?id=end`, { waitUntil: 'networkidle0' })
await p.waitForFunction(() => /have been sent/.test(document.querySelector('#sent')?.textContent || ''), { timeout: 8000 }).catch(() => null)
ok(/have been sent/.test(await p.$eval('#sent', (e) => e.textContent)), 'the quiz-style ending says the answers were sent')
await p.reload({ waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 800))
ok(sends === 1, `reloading the ending does not send again (${sends} sends)`)
await browser.close()
const quiz = (await (await fetch(BASE + '/api/results?experience=quiz', { headers: { cookie } })).text()).replace(/^\uFEFF/, '')
const qrow = quiz.split('\r\n').find((l) => l.includes(code)) || ''
const qhead = quiz.split('\r\n')[0].split(',')
ok(qrow && qrow.split(',')[qhead.indexOf('1.1')] === 'atmosphere' && qhead.includes('3.1.pint'), `the quiz response is stored with the code and its answers (${qrow.slice(0, 80)})`)

console.log(failed ? `${failed} of ${checks} checks failed` : `backend check: all ${checks} checks pass`)
process.exit(failed ? 1 : 0)
