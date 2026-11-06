'use client'

import { useCallback, useRef, useState } from 'react'
import V2Frame from '../V2Frame'
import CardStack from '../ui/templates/CardStack'
import SplitCards from '../ui/templates/SplitCards'
import { QUESTIONS, type Card } from '../questions'
import type { RenderProps } from './contract'
import { asId, asRecord, useFit } from './checklist'

const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'

export default function CardsRender(p: RenderProps) {
  if (p.q.constraints.cards?.length && p.q.constraints.first) return <SplitRender {...p} />
  if (p.q.constraints.cards?.length) return <StackRender {...p} />
  return <OneCardRender {...p} />
}

function SplitRender(p: RenderProps) {
  const { q } = p
  const cards = q.constraints.cards ?? []
  const first = q.constraints.first!
  const firstKey = (card: string) => `${card}.${first.id}`
  const pickedIn = (rec: Record<string, string | number>, options: { id: string }[], key: (card: string) => string) => {
    const ok = new Set(options.map((o) => o.id))
    const out: Record<string, string> = {}
    for (const c of cards) { const v = rec[key(c.id)]; if (v !== undefined && ok.has(String(v))) out[c.id] = String(v) }
    return out
  }

  const clean = (rec: Record<string, string | number>) => {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(pickedIn(rec, q.options, (c) => c))) out[k] = v
    for (const [k, v] of Object.entries(pickedIn(rec, first.options, firstKey))) out[firstKey(k)] = v
    return out
  }
  const saved = clean(asRecord(p.value))

  const latest = useRef(saved)
  latest.current = saved
  const pickedFirst = pickedIn(saved, first.options, firstKey)
  const pickedMain = pickedIn(saved, q.options, (card) => card)

  const onPick = (row: 'first' | 'main', card: string, choice: string) => {
    const next = { ...latest.current, [row === 'main' ? card : firstKey(card)]: choice }
    latest.current = next
    p.set(next)
    p.log('sort', { card, row: row === 'main' ? 'main' : first.id, choice })
  }

  const left = cards.filter((c) => !pickedFirst[c.id] || !pickedMain[c.id]).length
  const missing = left && !p.preview ? `Answer ${left} more card${left === 1 ? '' : 's'}` : undefined

  const [shown, setShown] = useState<string | null>(null)
  const onShow = useCallback((id: string | null) => setShown(id), [])
  const density = useFit(3, [q.id, shown])

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy} missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <div data-q={q.id} className="flex flex-1 flex-col">
        <SplitCards
          key={q.id}
          cards={cards.map((c) => ({ id: c.id, label: c.label, art: c.icon }))}
          rows={[
            { key: 'first', label: first.label, choices: first.options.map(({ id, label, hint, cap }) => ({ id, label, hint, cap })), picked: pickedFirst },
            { key: 'main', label: q.objectText?.second ?? '', choices: q.options.map(({ id, label, hint, cap }) => ({ id, label, hint, cap })), picked: pickedMain },
          ]}
          onPick={onPick}
          onRefuse={(row, choice) => p.log('refused', { row, choice })}
          onShow={onShow}
          density={density}
          done={
            <>
              <p className={`${TEXT} text-[20px] font-semibold text-ink`}>All {cards.length} answered.</p>
              <p className={`${UI} mt-1 text-[14px] text-muted`}>Tap a tick above to change one.</p>
            </>
          }
        />
      </div>
    </V2Frame>
  )
}

function StackRender(p: RenderProps) {
  const { q } = p
  const cards = q.constraints.cards ?? []
  const answers = new Set(q.options.map((o) => o.id))
  const cardIds = new Set(cards.map((c) => c.id))
  const rec = asRecord(p.value)
  const sorted: Record<string, string> = {}
  for (const [k, v] of Object.entries(rec)) if (cardIds.has(k) && answers.has(String(v))) sorted[k] = String(v)

  const onSort = (id: string, choice: string | null) => {
    const next = { ...sorted }
    if (choice) next[id] = choice
    else delete next[id]
    p.set(next)
    p.log(choice ? 'sort' : 'undo', { card: id, ...(choice ? { choice } : {}) })
  }

  const left = cards.length - Object.keys(sorted).length
  const missing = left && !p.preview ? `Sort ${left} more card${left === 1 ? '' : 's'}` : undefined
  const density = useFit(3, [q.id])
  const two = q.options.length === 2

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy} missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <div data-q={q.id} className="flex flex-1 flex-col">
        <CardStack
          key={q.id}
          cards={cards.map((c) => ({ id: c.id, label: c.label, art: c.icon, hint: c.hint }))}
          choices={q.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint, cap: o.cap }))}
          sorted={sorted}
          onSort={onSort}
          onRefuse={(choice) => p.log('refused', { choice })}
          density={density}
          done={
            <>
              <p className={`${TEXT} text-[20px] font-semibold text-ink`}>All {cards.length} sorted.</p>
              <p className={`${UI} mt-1 text-[14px] text-muted`}>{two ? 'Tap a pile to change one.' : 'Tap a tick above to change one.'}</p>
            </>
          }
        />
      </div>
    </V2Frame>
  )
}

function cardFor(id: string): Card | undefined {
  for (const parent of QUESTIONS) {
    const f = parent.followUps?.find((x) => x.id === id)
    if (!f) continue
    const m = /^card:([^:]+):/.exec(f.when)
    return m ? parent.constraints.cards?.find((c) => c.id === m[1]) : undefined
  }
  return undefined
}

function OneCardRender(p: RenderProps) {
  const { q } = p
  const card = cardFor(q.id)
  const chosen = q.options.find((o) => o.id === asId(p.value))?.id
  const [pressed, setPressed] = useState<string | null>(null)
  const density = useFit(2, [q.id])
  const missing = chosen || p.preview ? undefined : 'Tap one'

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy} missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <div data-q={q.id} className={`flex flex-1 flex-col ${p.bridge ? 'v2-rise' : ''}`} style={p.bridge ? { animationDelay: '120ms' } : undefined}>
        {card && (
          <div data-option={card.id}
            className={`flex items-center justify-center gap-4 rounded-[10px] border border-rule-soft bg-ground px-4 shadow-[0_1px_0_#DDD9D2,0_10px_28px_rgba(13,12,11,0.10)] ${density >= 1 ? 'py-3' : 'py-5 sm:py-7'}`}>
            {card.icon && (
              <img src={`/game/3d/${card.icon}.webp`} alt="" draggable={false}
                className={`pointer-events-none shrink-0 object-contain ${density >= 1 ? 'h-14 w-14' : 'h-20 w-20 sm:h-28 sm:w-28'}`} />
            )}
            <p className={`${TEXT} font-semibold text-ink ${density >= 1 ? 'text-[20px] leading-[25px]' : 'text-[22px] leading-[27px] sm:text-[26px] sm:leading-[32px]'}`}>{card.label}</p>
          </div>
        )}
        <div role="radiogroup" aria-label={q.question} className={`grid grid-cols-2 gap-2 ${card ? 'mt-3' : ''}`}>
          {q.options.map((o) => {
            const on = chosen === o.id
            return (
              <button key={o.id} type="button" role="radio" aria-checked={on} data-choice={o.id}
                onClick={() => { setPressed(o.id); p.set(o.id) }}
                className={`${UI} flex items-center justify-center rounded-[6px] border-2 px-2 text-center text-[15px] font-semibold leading-[19px] transition-colors
                  ${density >= 2 ? 'min-h-[52px]' : 'min-h-[64px]'}
                  ${on ? 'border-navy bg-navy text-white' : 'border-navy bg-ground text-navy hover:bg-[#EEF1F5]'}`}>
                <span key={on && pressed === o.id ? 'on' : 'off'} className={on && pressed === o.id ? 'v2-ready' : ''}>{o.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </V2Frame>
  )
}
