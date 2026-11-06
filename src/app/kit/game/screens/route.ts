/* GET /kit/game/screens: the game-style screens, in laptop play order, for the kit's contents page
   (public/kit/index.html, the Game-style tab). Built from src/kit/game/questions.ts, so the tab follows the
   script. Each row: id, kind, the words, the template and its look, and whether a phone asks it too. */
import { BLOCK_NAME, type Block } from '@/kit/game/contract'
import { PLAY_ORDER, screensFor, type FollowUp, type Question } from '@/kit/game/questions'

export const dynamic = 'force-static'

type Row = { id: string; kind: 'break' | 'scene' | 'question' | 'followup'; text: string; bridge?: string; when?: string; look: string; phone: boolean; block?: string }

function look(q: Question | FollowUp): string {
  const c = q.constraints, t = q.objectText ?? {}
  if (q.template === 'checklist') {
    if (c.choices?.length) return 'sentence builder'
    if (t.header) return 'checklist · invite'
    if (t.letter) return 'checklist · letter'
    if (c.pick === 1) return 'checklist · tap one'
    if (c.pick) return `checklist · pick ${c.pick}`
    return 'checklist · pick one or two'
  }
  if (q.template === 'cards') return c.first ? 'split cards' : c.cards?.some((x) => x.icon) ? 'swipe deck · pictures' : c.cards ? 'swipe deck' : 'cards · tap one'
  if (q.template === 'trays') return c.trays ? (c.trays.some((x) => x.capacity) ? 'trays · capacity' : 'trays') : 'trays · tap one'
  if (q.template === 'stamp') return c.cards ? 'stamps' : 'certificate · tap one'
  if (q.template === 'track') return q.options.length ? 'track · opt-out' : 'track'
  return q.template
}

/** When a follow-up shows, in the labels people see: "Shows only if the answer is 8 to 12 or 13 to 17." */
function whenText(q: Question, f: FollowUp): string {
  if (f.when === 'always') return 'Always, after its question.'
  const answers = [...q.options, ...(q.constraints.stops ?? [])]
  const lab = (id: string) => answers.find((o) => o.id === id)?.label ?? id
  const card = (id: string) => q.constraints.cards?.find((c) => c.id === id)?.label ?? id
  const or = (ids: string) => ids.split('|').map((x) => `“${lab(x)}”`).join(' or ')
  const [op, a = '', b = ''] = f.when.split(':')
  if (op === 'is') return `Shows only if the answer is ${or(a)}.`
  if (op === 'includes') return `Shows only if ${or(a)} is picked.`
  const row = q.constraints.first && q.objectText?.second ? ` in the “${q.objectText.second}” row` : ''
  if (op === 'card') return `Shows only if “${card(a)}” is ${or(b)}${row}.`
  if (op === 'count') return `Shows only if ${b} or more cards are “${lab(a)}”.`
  return `Shows only when ${f.when}.`
}

export function GET() {
  const phone = new Set(PLAY_ORDER.phone)
  const rows: Row[] = []
  for (const s of screensFor('desk')) {
    if (s.kind === 'break') { rows.push({ id: `break:${s.block}`, kind: 'break', text: BLOCK_NAME[s.block as Block], look: 'break', phone: true }); continue }
    if (s.kind === 'scene') { rows.push({ id: 'scene', kind: 'scene', text: s.scene.lines.join(' '), look: 'scene', phone: phone.has('scene') }); continue }
    const q = s.question
    rows.push({ id: q.id, kind: 'question', text: q.question, look: look(q), phone: phone.has(q.id) })
    for (const f of q.followUps ?? []) rows.push({ id: f.id, kind: 'followup', text: f.question, bridge: f.bridge, when: whenText(q, f), look: look(f), phone: phone.has(q.id) })
  }
  const first = screensFor('desk')[0]
  if (first?.kind === 'question') rows.unshift({ id: 'start', kind: 'break', text: BLOCK_NAME[first.question.block], look: 'section', phone: true })
  return Response.json({ rows })
}
