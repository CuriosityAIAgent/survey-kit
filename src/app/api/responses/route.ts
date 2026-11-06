/* POST /api/responses: store one finished survey. Both experiences send here when someone finishes:
     { experience: 'quiz' | 'game', id: '<client-made id>', respondent?: 'CODE', answers: { ... } }
   Anyone can send (that is what a survey is), so the route checks shape and size: at most 200 KB, answers at
   most 4 levels deep, 1,000 values, keys up to 100 characters and text up to 5,000. A repeat of the same id (a
   retry, a reload, a second tab) is stored once. */
import { EXPERIENCES, saveResponse, type Experience } from '@/server/db'

export const runtime = 'nodejs'
const MAX_BYTES = 200_000
const LIMITS = { depth: 4, values: 1000, key: 100, text: 5000 }
const bad = (error: string, status = 400) => Response.json({ ok: false, error }, { status })

/** True if the answers fit the limits above. */
function fits(v: unknown, depth: number, count: { n: number }): boolean {
  if (v === null || typeof v === 'number' || typeof v === 'boolean') return ++count.n <= LIMITS.values
  if (typeof v === 'string') return v.length <= LIMITS.text && ++count.n <= LIMITS.values
  if (depth >= LIMITS.depth || typeof v !== 'object') return false
  const entries = Array.isArray(v) ? v.map((x) => ['', x] as const) : Object.entries(v as Record<string, unknown>)
  return entries.every(([k, x]) => k.length <= LIMITS.key && fits(x, depth + 1, count))
}

export async function POST(req: Request) {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES) return bad('too-large', 413)
  const buf = await req.arrayBuffer()
  if (buf.byteLength > MAX_BYTES) return bad('too-large', 413)
  let body: { experience?: unknown; id?: unknown; respondent?: unknown; answers?: unknown }
  try { body = JSON.parse(new TextDecoder().decode(buf)) } catch { return bad('not-json') }
  if (!EXPERIENCES.includes(body.experience as Experience)) return bad('experience')
  if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) return bad('answers')
  if (!fits(body.answers, 0, { n: 0 })) return bad('answers-too-big', 413)
  const respondent = typeof body.respondent === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(body.respondent) ? body.respondent : null
  const id = typeof body.id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.id) ? body.id : null
  const saved = saveResponse(body.experience as Experience, id, respondent, body.answers as Record<string, unknown>)
  return Response.json({ ok: true, id: saved.id, repeat: saved.repeat })
}
