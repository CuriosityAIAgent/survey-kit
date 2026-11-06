import {
  BLOCK_ORDER, QUESTIONS, SCENE, followUpOptions, followUpsFor, screensFor,
  type Answer, type Channel, type FollowUp, type Question, type Screen,
} from '../questions'
import type { Block } from '../contract'

export type Cursor = { screen: number; fu: number }
export const WELCOME: Cursor = { screen: -1, fu: -1 }
export type Answers = Record<string, Answer>

const cache: Partial<Record<Channel, Screen[]>> = {}

export function screens(channel: Channel): Screen[] {
  return (cache[channel] ??= screensFor(channel))
}

export function screenId(s: Screen): string {
  if (s.kind === 'question') return s.question.id
  if (s.kind === 'scene') return 'scene'
  return `break:${s.block}`
}

export function followList(q: Question, answers: Answers, preview: boolean): FollowUp[] {
  return preview ? (q.followUps ?? []) : followUpsFor(q, answers[q.stores])
}

export function asQuestion(parent: Question, f: FollowUp, answers: Answers): Question {
  return {
    id: f.id,
    block: parent.block,
    template: f.template,
    question: f.question,
    instruction: f.instruction,
    note: f.note,
    options: followUpOptions(parent, f, answers[parent.stores]),
    constraints: f.constraints,
    objectText: f.objectText,
    channels: parent.channels,
    stores: f.stores,
    measures: parent.measures,
  }
}

export const SCENE_QUESTION: Question = {
  id: SCENE.id,
  block: SCENE.block,
  template: 'scene',
  question: SCENE.lines.join(' '),
  instruction: SCENE.assumption,
  options: [],
  constraints: {},
  objectText: { from: String(SCENE.calendar.from), to: String(SCENE.calendar.to) },
  channels: SCENE.channels,
  stores: SCENE.stores,
  measures: SCENE.measures,
}

export type View =
  | { kind: 'welcome'; key: 'welcome' }
  | { kind: 'end'; key: 'end'; n: number; total: number }
  | {
      kind: 'break'; key: string; block: Block; from: Block; name: string; line: string

      section: number; sections: number; count: number

      n: number; total: number
    }
  | { kind: 'scene'; key: 'scene'; q: Question; n: number; total: number }
  | { kind: 'question'; key: string; q: Question; n: number; total: number }
  | {
      kind: 'follow'; key: string; q: Question; parent: Question; f: FollowUp; bridge: string
      n: number; total: number

      index: number; of: number
    }

export const totalFor = (channel: Channel) =>
  screens(channel).filter((s) => s.kind === 'question').length

export function viewAt(channel: Channel, cursor: Cursor, answers: Answers, preview: boolean, finished = false): View {
  const list = screens(channel)
  const total = totalFor(channel)
  if (finished) return { kind: 'end', key: 'end', n: total, total }
  if (cursor.screen < 0 || cursor.screen >= list.length) return { kind: 'welcome', key: 'welcome' }
  const s = list[cursor.screen]
  if (s.kind === 'break') {
    const from = blockBefore(list, cursor.screen)
    const n = numberAfter(list, cursor.screen)
    return {
      kind: 'break', key: `break:${s.block}`, block: s.block, from, name: s.name, line: s.line,
      section: BLOCK_ORDER.indexOf(s.block) + 1, sections: BLOCK_ORDER.length,
      count: list.filter((x) => x.kind === 'question' && x.question.block === s.block).length,
      n, total,
    }
  }
  if (s.kind === 'scene') return { kind: 'scene', key: 'scene', q: SCENE_QUESTION, n: numberBefore(list, cursor.screen), total }
  const q = s.question
  const fus = followList(q, answers, preview)
  if (cursor.fu >= 0 && cursor.fu < fus.length) {
    const f = fus[cursor.fu]
    return {
      kind: 'follow', key: f.id, q: asQuestion(q, f, answers), parent: q, f, bridge: f.bridge,
      n: s.n, total, index: cursor.fu, of: fus.length,
    }
  }
  return { kind: 'question', key: q.id, q, n: s.n, total }
}

function blockBefore(list: Screen[], i: number): Block {
  for (let j = i - 1; j >= 0; j--) {
    const s = list[j]
    if (s.kind === 'question') return s.question.block
    if (s.kind === 'scene') return s.scene.block
  }
  return BLOCK_ORDER[0]
}
function numberAfter(list: Screen[], i: number): number {
  for (let j = i; j < list.length; j++) { const s = list[j]; if (s.kind === 'question') return s.n }
  return totalOf(list)
}
function numberBefore(list: Screen[], i: number): number {
  for (let j = i; j >= 0; j--) { const s = list[j]; if (s.kind === 'question') return s.n }
  return 1
}
const totalOf = (list: Screen[]) => list.filter((s) => s.kind === 'question').length

export function nextCursor(channel: Channel, cursor: Cursor, answers: Answers, preview: boolean): Cursor | 'end' {
  const list = screens(channel)
  if (cursor.screen < 0) return { screen: 0, fu: -1 }
  const s = list[cursor.screen]
  if (s?.kind === 'question') {
    const fus = followList(s.question, answers, preview)
    if (cursor.fu + 1 < fus.length) return { screen: cursor.screen, fu: cursor.fu + 1 }
  }
  return cursor.screen + 1 < list.length ? { screen: cursor.screen + 1, fu: -1 } : 'end'
}

export function prevCursor(channel: Channel, cursor: Cursor, answers: Answers, preview: boolean): Cursor | null {
  const list = screens(channel)
  if (cursor.screen < 0) return null
  if (cursor.fu >= 0) return { screen: cursor.screen, fu: cursor.fu - 1 }
  let j = cursor.screen - 1
  while (j >= 0 && list[j].kind === 'break') j--
  if (j < 0) return WELCOME
  const s = list[j]
  if (s.kind === 'question') return { screen: j, fu: followList(s.question, answers, preview).length - 1 }
  return { screen: j, fu: -1 }
}

export function clampCursor(channel: Channel, cursor: Cursor, answers: Answers, preview: boolean): Cursor {
  const list = screens(channel)
  const screen = Number.isInteger(cursor.screen) ? Math.max(-1, Math.min(list.length - 1, cursor.screen)) : -1
  const s = list[screen]
  if (!s || s.kind !== 'question') return { screen, fu: -1 }
  const fus = followList(s.question, answers, preview)
  const fu = Number.isInteger(cursor.fu) && cursor.fu >= -1 && cursor.fu < fus.length ? cursor.fu : -1
  return { screen, fu }
}

export function indexOf(channel: Channel, id: string): number {
  return screens(channel).findIndex((s) => screenId(s) === id)
}

const QUESTION_STORES = new Set<string>()
for (const q of QUESTIONS) {
  QUESTION_STORES.add(q.stores)
  for (const f of q.followUps ?? []) QUESTION_STORES.add(f.stores)
}
QUESTION_STORES.add(SCENE.stores)

export function isKnownStore(key: string): boolean {
  if (QUESTION_STORES.has(key)) return true
  return key.endsWith('.order') && QUESTION_STORES.has(key.slice(0, -'.order'.length))
}

const MAX_TEXT = 2000
const MAX_ITEMS = 64
const okString = (v: unknown): v is string => typeof v === 'string' && v.length <= MAX_TEXT
const okNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function isAnswer(v: unknown): v is Answer {
  if (okString(v) || okNumber(v)) return true
  if (Array.isArray(v)) return v.length <= MAX_ITEMS && v.every((x) => typeof x === 'string' && x.length <= 200)
  if (v && typeof v === 'object') {
    if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) return false
    const e = Object.entries(v)
    return e.length <= MAX_ITEMS && e.every(([k, x]) => k.length <= 200 && (okString(x) || okNumber(x)))
  }
  return false
}

export function cleanAnswers(raw: unknown): Answers {
  const out: Answers = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw)) if (isKnownStore(k) && isAnswer(v)) out[k] = v
  return out
}

export function emptyFor(q: Question): Answer | undefined {
  const optional = q.constraints.min === 0 && q.constraints.pick === undefined
  if (!optional) return undefined
  return q.template === 'text' ? {} : []
}

export function followUpsOnPath(channel: Channel, answers: Answers): string[] {
  return screens(channel).flatMap((s) => (s.kind === 'question' ? followUpsFor(s.question, answers[s.question.stores]).map((f) => f.id) : []))
}

export function expectedStores(channel: Channel, answers: Answers): string[] {
  const out: string[] = []
  for (const s of screens(channel)) {
    if (s.kind === 'scene') out.push(s.scene.stores)
    if (s.kind !== 'question') continue
    out.push(s.question.stores)
    for (const f of followUpsFor(s.question, answers[s.question.stores])) out.push(f.stores)
  }
  return out
}

export function previewFill(parent: Question, f: FollowUp, answers: Answers): Answers | null {
  if (!f.optionsFrom) return null
  if (followUpOptions(parent, f, answers[parent.stores]).length > 0) return null
  if (f.optionsFrom.startsWith('tray:')) {
    const tray = f.optionsFrom.slice('tray:'.length)
    const cur = answers[parent.stores]
    const placed: Record<string, string | number> =
      cur && typeof cur === 'object' && !Array.isArray(cur) ? { ...(cur as Record<string, string | number>) } : {}
    const cap = parent.constraints.trays?.find((t) => t.id === tray)?.capacity ?? 3
    // trays place the options; a card deck answers its cards (tray:<answer> then means the cards given that answer)
    const items: { id: string }[] = parent.constraints.trays ? parent.options : (parent.constraints.cards ?? parent.options)
    const free = items.filter((o) => placed[o.id] === undefined).slice(0, cap)

    const spare = free.length ? free : items.slice(0, cap)
    for (const o of spare) placed[o.id] = tray
    return { [parent.stores]: placed }
  }

  const cur = answers[parent.stores]
  if (Array.isArray(cur) && cur.length) return { [parent.stores]: [cur[0]] }
  return null
}
