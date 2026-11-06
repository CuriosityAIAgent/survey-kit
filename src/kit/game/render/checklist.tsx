'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import V2Frame from '../V2Frame'
import Checklist, { pickMissing } from '../ui/Checklist'
import GhostDemo from '../ui/GhostDemo'
import type { Answer, Option, Question } from '../questions'
import type { RenderProps } from './contract'

const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'

export function asId(v: Answer | undefined): string | undefined {
  return typeof v === 'string' && v ? v : undefined
}
export function asIds(v: Answer | undefined): string[] {
  return Array.isArray(v) ? (v as readonly unknown[]).filter((x): x is string => typeof x === 'string') : []
}
export function asRecord(v: Answer | undefined): Record<string, string | number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, string | number> = {}
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (typeof x === 'string' || typeof x === 'number') out[k] = x
  }
  return out
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function orderOptions(q: Question, seed: number): Option[] {
  if (!q.shuffle) return q.options
  const free = q.options.filter((o) => !o.pinned)
  const pinned = q.options.filter((o) => o.pinned)
  const r = rng(seed ^ hash(q.id))
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[free[i], free[j]] = [free[j], free[i]]
  }
  return [...free, ...pinned]
}

export function useShownOrder(p: RenderProps): Option[] {
  const shown = useMemo(() => orderOptions(p.q, p.seed), [p.q, p.seed])
  const logged = useRef<string | null>(null)
  const log = useRef(p.log)
  useEffect(() => { log.current = p.log })
  useEffect(() => {
    if (!p.q.shuffle || logged.current === p.q.id) return
    logged.current = p.q.id
    log.current('order', { key: `${p.q.stores}.order`, stores: p.q.stores, order: shown.map((o) => o.id) })
  }, [p.q.id, p.q.shuffle, p.q.stores, shown])
  return shown
}

export function useFit(max: number, deps: readonly unknown[]): number {
  const [level, setLevel] = useState(0)
  const [tick, setTick] = useState(0)
  useLayoutEffect(() => {
    const d = document.documentElement
    if (d.scrollHeight > window.innerHeight + 1 && level < max) setLevel(level + 1)

  }, [level, max, tick, ...deps])
  useEffect(() => {
    let w = window.innerWidth
    let h = window.innerHeight
    const onResize = () => {
      const grew = window.innerHeight > h + 40
      if (window.innerWidth !== w || grew) { setLevel(0); setTick((t) => t + 1) }
      w = window.innerWidth
      h = window.innerHeight
    }
    window.addEventListener('resize', onResize)
    document.fonts?.ready.then(() => setTick((t) => t + 1))
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return level
}

export const OPT_OUT_IDS = new Set(['not-sure', 'rather-not'])

export function OptOutChips({ options, on, onTap }: { options: Option[]; on?: string; onTap: (id: string) => void }) {
  if (!options.length) return null
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {options.map((o) => (
        <button key={o.id} type="button" data-option={o.id} aria-pressed={on === o.id} onClick={() => onTap(o.id)}
          className={`${UI} min-h-11 rounded-full border px-5 text-[14px] transition-colors ${on === o.id ? 'border-ink bg-ink text-white' : 'border-rule bg-ground text-ink hover:border-ink'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function ChecklistRender(p: RenderProps) {
  if (p.q.constraints.choices?.length) return <SentenceRender {...p} />
  return <ListRender {...p} />
}

function ListRender(p: RenderProps) {
  const { q } = p
  const c = q.constraints
  const shown = useShownOrder(p)
  const one = c.pick === 1
  const max = c.pick ?? c.max ?? q.options.length
  const min = c.pick ?? c.min ?? 0
  const numbered = !one && /best first/i.test(q.instruction)

  const optOuts = shown.filter((o) => o.pinned && OPT_OUT_IDS.has(o.id))
  const rows = shown.filter((o) => !optOuts.includes(o))
  const ids = new Set(rows.map((o) => o.id))

  const optedOut = optOuts.find((o) => o.id === asId(p.value))?.id
  const picked = one
    ? (asId(p.value) && ids.has(asId(p.value)!) && !optedOut ? [asId(p.value)!] : [])
    : asIds(p.value).filter((x) => ids.has(x))

  const exclusive = new Set(rows.filter((o) => o.pinned).map((o) => o.id))
  const change = (next: string[]) => {
    if (one) {
      if (next[0]) p.set(next[0])
      return
    }

    const added = next.find((x) => !picked.includes(x))
    if (added && exclusive.has(added)) p.set([added])
    else p.set(next.filter((x) => !exclusive.has(x)))
  }

  const n = picked.length
  const complete = one ? !!(n || optedOut) : !!optedOut || (c.pick ? n >= c.pick : n >= min)
  let missing: string | undefined
  if (!complete && !p.preview) {
    if (one) missing = 'Tap one'
    else if (c.pick) missing = pickMissing(n, c.pick)
    else missing = n === 0 ? (min === 1 ? 'Pick at least 1' : `Pick at least ${min}`) : `Pick ${min - n} more`
  }
  const skip = !one && min === 0 && n === 0 && !optedOut
  const next = () => {
    if (p.value === undefined && skip) p.set([])
    p.onNext()
  }

  const invite = q.objectText?.header
  const letter = q.objectText?.letter
  const skinned = !!(invite || letter)

  const level = useFit(4, [q.id, n, optedOut])
  const layout = level >= 2 ? 'grid' : 'rows'

  const rowEls = useRef(new Map<string, HTMLButtonElement | null>())
  const [peek, setPeek] = useState<string | null>(null)
  const first = rows[0]?.id

  const chosenLabel = one ? q.options.find((o) => o.id === picked[0])?.label : undefined

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy} missing={missing} nextLabel={skip ? 'Skip' : undefined}
      onNext={next} onBack={p.onBack}>
      <div data-q={q.id} className={p.bridge ? 'v2-rise' : ''} style={p.bridge ? { animationDelay: '120ms' } : undefined}>
        {invite && <Invite q={q} header={invite} picked={optedOut ?? picked[0]} small={level >= 1} />}
        {letter && <Letter lead={letter} from={q.objectText?.letterFrom} answer={chosenLabel} small={level >= 1} />}
        <div className={skinned ? (level >= 1 ? 'mt-2.5' : 'mt-4') : ''}>
          <Checklist key={q.id} options={rows} picked={picked} onChange={change} max={max} exclusive={one ? [] : [...exclusive]}
            mode={one ? 'one' : 'pick'} numbered={numbered} peek={peek}
            compact={level >= 1} layout={layout} dense={level >= 3} label={q.question}
            rowRef={(o, el) => { rowEls.current.set(o, el) }} />
        </div>
        <OptOutChips options={optOuts} on={optedOut} onTap={(id) => p.set(id)} />
      </div>
      {first && (
        <GhostDemo key={q.id} once family={one ? 'tap-one' : numbered ? 'top-n' : 'pick-n'}
          label={one ? 'Tap one' : 'Tap to tick'}
          target={() => rowEls.current.get(first)}
          onPeek={(on) => setPeek(on ? first : null)} />
      )}
    </V2Frame>
  )
}

function Invite({ q, header, picked, small }: { q: Question; header: string; picked?: string; small: boolean }) {

  const t = q.objectText ?? {}
  const cfg: { title?: string; detail?: string; lead: string; status?: Record<string, { text: string; tone: string }> } =
    { title: header, detail: t.detail, lead: t.lead ?? 'Your answer:' }
  const coaching = t.decline === 'true'
  const opt = q.options.find((o) => o.id === picked)
  const accepted = coaching && picked === t.acceptId
  const declined = coaching && !!picked && !accepted
  const s = picked ? cfg.status?.[picked] ?? { text: opt?.label ?? '', tone: accepted ? 'bg-forest text-white' : 'bg-navy text-white' } : undefined
  const lead = accepted ? '' : cfg.lead
  return (
    <div className="overflow-hidden rounded-[4px] border border-rule-soft bg-white shadow-[0_1px_0_#DDD9D2,0_10px_28px_rgba(13,12,11,0.06)]">
      <div className="flex">
        <div aria-hidden className="w-[5px] shrink-0 bg-navy" />
        <div className={`relative flex flex-1 items-start gap-3 px-3.5 lg:px-5 ${small ? 'py-2' : 'py-3'}`}>
          <CalendarDay small={small} day={t.day} date={t.date} />
          <div className="min-w-0 flex-1">
            {!small && <p className={`${UI} text-[11px] font-semibold uppercase tracking-[0.12em] text-muted`}>Invitation</p>}
            {(declined || accepted) && (
              <span key={declined ? 'd' : 'a'} className={`${UI} v2-stamp absolute right-3 top-2.5 rotate-[-4deg] rounded-[3px] border-2 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] lg:right-5 lg:top-3 lg:text-[12px] ${declined ? 'border-bronze text-bronze' : 'border-forest text-forest'}`}>
                {declined ? 'Declined' : 'Accepted'}
              </span>
            )}
            <p className={`${TEXT} font-semibold text-ink transition-colors ${declined || accepted ? 'pr-[88px] lg:pr-[104px]' : ''} ${declined ? 'text-muted line-through decoration-bronze/70 decoration-[1.5px]' : ''} ${small ? 'text-[15px] leading-[19px]' : 'mt-0.5 text-[17px] leading-[22px]'}`}>
              {cfg.title ?? header}
              {cfg.detail && small && cfg.detail.length < 12 && <span className={`${UI} ml-1.5 whitespace-nowrap text-[12px] font-normal text-muted`}>{cfg.detail}</span>}
            </p>
            {cfg.detail && !small && <p className={`${UI} mt-0.5 text-[13px] leading-[18px] text-muted`}>{cfg.detail}</p>}
            <div className={`flex min-h-[26px] flex-wrap items-center gap-x-2 gap-y-1 ${small ? 'mt-1' : 'mt-2'}`} aria-live="polite">
              {lead && <span className={`${UI} text-[13px] text-muted`}>{lead}</span>}
              {s ? (
                <span key={picked} className={`${UI} v2-stamp inline-flex items-center gap-1 rounded-[3px] px-2 py-1 text-[13px] font-semibold leading-[16px] ${s.tone}`}>
                  {accepted && <span aria-hidden>✓</span>}{s.text}
                </span>
              ) : (
                <span className={`${UI} rounded-[3px] border border-dashed border-rule px-2 py-[3px] text-[13px] leading-[16px] text-disabled-ink`}>Your answer goes here</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes v2-stamp { 0% { opacity: 0; transform: scale(1.25) rotate(-3deg) } 60% { opacity: 1; transform: scale(.97) rotate(0) } 100% { transform: scale(1) } } .v2-stamp { animation: v2-stamp .32s cubic-bezier(.2,.8,.3,1) both } @media (prefers-reduced-motion: reduce) { .v2-stamp { animation: none } }`}</style>
    </div>
  )
}

function CalendarDay({ small, day = 'Thu', date = '12' }: { small: boolean; day?: string; date?: string }) {
  return (
    <div aria-hidden className={`shrink-0 overflow-hidden rounded-[4px] border border-rule-soft text-center ${small ? 'w-[38px]' : 'w-[46px]'}`}>
      <div className={`${UI} bg-navy py-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] text-white`}>{day}</div>
      <div className={`${TEXT} font-semibold text-ink ${small ? 'py-0.5 text-[16px] leading-[20px]' : 'py-1 text-[20px] leading-[24px]'}`}>{date}</div>
    </div>
  )
}

function Letter({ lead, from, answer, small }: { lead: string; from?: string; answer?: string; small: boolean }) {
  return (
    <div className={`relative rounded-[3px] border border-rule-soft bg-white shadow-[0_1px_0_#DDD9D2,0_10px_28px_rgba(13,12,11,0.06)] ${small ? 'px-4 py-3' : 'px-6 py-5'}`}>
      {from && <p className={`${UI} text-[11px] font-semibold uppercase tracking-[0.14em] text-bronze`}>{from}</p>}
      <p className={`${TEXT} mt-1.5 text-[18px] leading-[26px] text-ink lg:text-[20px]`}>{lead}</p>
      {}
      <p className={`${TEXT} mt-0.5 h-[28px] truncate text-[18px] leading-[28px] text-ink lg:text-[20px]`}>
        {answer ? (
          <span key={answer} className="v2-type inline-block max-w-full overflow-hidden whitespace-nowrap align-bottom font-semibold text-navy underline decoration-ink/60 decoration-1 underline-offset-[5px]"
            style={{ ['--n' as string]: answer.length }}>{answer}.</span>
        ) : (
          <span aria-hidden className="inline-block h-[24px] w-[220px] border-b-2 border-rule/70 align-top">&nbsp;</span>
        )}
      </p>
      <svg aria-hidden viewBox="0 0 120 30" className={`absolute bottom-3 right-5 h-[26px] w-[104px] ${answer ? '' : 'opacity-0'}`}>
        <path key={answer} d="M4 22 C14 6 20 6 22 16 S30 26 36 14 S46 4 50 18 S60 24 66 12 C70 6 76 20 82 16 S96 10 116 14" fill="none"
          stroke="#14233B" strokeWidth="1.6" strokeLinecap="round" pathLength={1} className="v2-sign" />
      </svg>
      <style>{`
@keyframes v2-type { from { max-width: 0 } to { max-width: 100% } }
.v2-type { animation: v2-type .6s steps(calc(var(--n) + 1), end) both }
@keyframes v2-sign { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
.v2-sign { stroke-dasharray: 1; animation: v2-sign .7s .55s ease-out both }
@media (prefers-reduced-motion: reduce) { .v2-type, .v2-sign { animation: none } }`}</style>
    </div>
  )
}

function SentenceRender(p: RenderProps) {
  const { q } = p
  const choices = q.constraints.choices ?? []
  const chars = q.constraints.chars ?? 60
  const shown = useShownOrder(p)
  const other = q.options.find((o) => o.label.endsWith('…') || o.id === 'other')
  const rec = asRecord(p.value)
  const verb = typeof rec.verb === 'string' && choices.some((c) => c.id === rec.verb) ? rec.verb : undefined
  const typing = typeof rec.text === 'string'
  const text = typing ? String(rec.text) : ''
  const pick = !typing && typeof rec.pick === 'string' && q.options.some((o) => o.id === rec.pick && o !== other) ? rec.pick : undefined
  const input = useRef<HTMLInputElement>(null)
  const [focusNext, setFocusNext] = useState(false)

  const save = (s: { verb?: string; pick?: string; text?: string }) => {
    const out: Record<string, string> = {}
    if (s.verb) out.verb = s.verb
    if (s.text !== undefined) out.text = s.text.slice(0, chars)
    else if (s.pick) out.pick = s.pick
    p.set(out)
  }
  useEffect(() => {
    if (focusNext && typing) { input.current?.focus(); setFocusNext(false) }
  }, [focusNext, typing])

  let missing: string | undefined
  if (!p.preview) {
    if (!verb) missing = `Tap ${choices.map((c) => c.label).join(', ').replace(/, ([^,]*)$/, ' or $1')}`
    else if (!pick && !typing) missing = 'Pick one'
    else if (typing && !text.trim()) missing = 'Type a few words'
  }

  const verbLabel = choices.find((c) => c.id === verb)?.label.toLowerCase()
  const what = typing ? text.trim() : q.options.find((o) => o.id === pick)?.label

  const level = useFit(3, [q.id, typing, !!verb, what])

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy} missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <div data-q={q.id} className={p.bridge ? 'v2-rise' : ''}>
        {}
        <p className={`${TEXT} rounded-[4px] border border-rule-soft bg-white px-4 text-ink shadow-[0_1px_0_#DDD9D2] ${level >= 2 ? 'py-2 text-[16px] leading-[24px]' : 'py-3 text-[18px] leading-[27px] lg:text-[20px] lg:leading-[30px]'}`}
          aria-live="polite">
          <span className="text-muted">{q.objectText?.stem ?? '…having'} </span>
          <Blank text={verbLabel} width="w-[60px] lg:w-[74px]" />{' '}
          {}
          {what ? <><Blank text={what} width="w-[120px] lg:w-[150px]" />.</> : <span className="whitespace-nowrap"><Blank width="w-[120px] lg:w-[150px]" />.</span>}
        </p>

        {}
        <div role="radiogroup" aria-label="Watched, done or led" className={`grid grid-cols-3 gap-2 ${level >= 2 ? 'mt-2.5' : 'mt-4'}`}>
          {choices.map((c) => {
            const on = verb === c.id
            return (
              <button key={c.id} type="button" role="radio" aria-checked={on} data-choice={c.id}
                onClick={() => save({ verb: c.id, pick, text: typing ? text : undefined })}
                className={`${UI} rounded-[4px] border-[1.5px] font-semibold transition-colors ${level >= 2 ? 'h-11 text-[15px]' : 'h-12 text-[16px]'} ${on ? 'border-forest bg-forest text-white' : 'border-rule bg-white text-ink hover:border-ink'}`}>
                {c.label}
              </button>
            )
          })}
        </div>

        {}
        <div className={level >= 2 ? 'mt-2.5' : 'mt-3'}>
          <Checklist key={q.id} options={shown.filter((o) => o !== other)} mode="one" max={1} layout="grid" dense={level >= 1}
            label="The experience"
            picked={pick ? [pick] : []}
            onChange={(next) => { if (next[0]) save({ verb, pick: next[0] }) }} />
          {other && (
            <div className={`mt-2 flex items-center gap-2.5 rounded-[4px] border bg-white px-3 shadow-[0_1px_0_#DDD9D2] ${typing ? 'border-forest' : 'border-rule-soft'} ${level >= 1 ? 'min-h-[44px]' : 'min-h-[50px]'}`}>
              {typing ? (
                <>
                  <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest">
                    <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]"><path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <input ref={input} data-input type="text" value={text} maxLength={chars}
                    placeholder={q.objectText?.placeholder ?? 'A few words'} aria-label={other.label}
                    onChange={(e) => save({ verb, text: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !missing) p.onNext() }}
                    style={{ outline: 'none' }}
                    className={`${UI} h-10 min-w-0 flex-1 bg-transparent text-[16px] text-ink placeholder:text-disabled-ink`} />
                  <span className={`${UI} shrink-0 text-[12px] tabular-nums text-muted`}>{text.length}/{chars}</span>
                </>
              ) : (
                <button type="button" data-option={other.id} role="radio" aria-checked={false}
                  onClick={() => { save({ verb, text: '' }); setFocusNext(true) }}
                  className={`${UI} flex min-h-[inherit] flex-1 items-center gap-2.5 self-stretch text-left text-[15px] text-ink`}>
                  <span aria-hidden className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-rule bg-white" />
                  {other.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </V2Frame>
  )
}

function Blank({ text, width }: { text?: string; width: string }) {
  if (!text) return <span aria-label="blank" className={`mx-0.5 inline-block ${width} translate-y-[-4px] border-b-2 border-rule/70 align-baseline`}>&nbsp;</span>
  return <span key={text} className="v2-ready font-semibold underline decoration-ink decoration-[1.5px] underline-offset-[5px]">{text}</span>
}
