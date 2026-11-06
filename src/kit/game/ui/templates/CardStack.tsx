'use client'

import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type StackCard = { id: string; label: string; art?: string; hint?: string }
export type Side = 'left' | 'right'
export type StackChoice = { id: string; label: string; hint?: string; cap?: number }

type Common = {
  cards: StackCard[]
  done?: ReactNode

  density?: number
  onRefuse?: (choice: string) => void
}
type Legacy = Common & {
  left: string
  right: string
  sorted: Record<string, Side>
  onSort: (id: string, side: Side | null) => void
  choices?: undefined
}
type General = Common & {
  choices: StackChoice[]
  sorted: Record<string, string>
  onSort: (id: string, choice: string | null) => void
  left?: undefined
  right?: undefined
}

const FLY_MS = 240
const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'

export default function CardStack(props: Legacy | General) {
  const { cards, done, density = 0, onRefuse } = props
  const choices: StackChoice[] = props.choices ?? [{ id: 'left', label: props.left }, { id: 'right', label: props.right }]
  const sorted = props.sorted as Record<string, string>
  const onSort = props.onSort as (id: string, choice: string | null) => void
  const two = choices.length === 2

  const remaining = cards.filter((c) => !sorted[c.id])
  const current = remaining[0]
  const next = remaining[1]
  const [dx, setDx] = useState(0)
  const [flying, setFlying] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [refused, setRefused] = useState<{ id: string; n: number } | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const refuseTimer = useRef(0)
  const drag = useRef<{ x: number; id: number } | null>(null)
  const pile = (id: string) => cards.filter((c) => sorted[c.id] === id)
  const used = (ch: StackChoice) => pile(ch.id).length
  const full = (ch: StackChoice) => ch.cap !== undefined && used(ch) >= ch.cap

  const commit = (ch: StackChoice) => {
    if (!current || flying) return
    setTouched(true)
    if (full(ch)) {
      window.clearTimeout(refuseTimer.current)
      setRefused((r) => ({ id: ch.id, n: (r?.n ?? 0) + 1 }))
      refuseTimer.current = window.setTimeout(() => setRefused(null), 2000)
      onRefuse?.(ch.id)
      setDx(0)
      return
    }
    setFlying(ch.id)
    const id = current.id
    setTimeout(() => { onSort(id, ch.id); setFlying(null); setDx(0) }, FLY_MS)
  }
  const undoPile = (ch: StackChoice) => {
    const p = pile(ch.id)
    if (!p.length || flying) return
    if (p.length === 1) { onSort(p[0].id, null); setOpen(null); return }
    setOpen((o) => (o === ch.id ? null : ch.id))
  }
  const openChoice = choices.find((c) => c.id === open)
  const openCards = open ? pile(open) : []

  const onDown = (e: React.PointerEvent) => {
    if (flying || !two) return
    setTouched(true)
    drag.current = { x: e.clientX, id: e.pointerId }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => { if (drag.current) setDx(e.clientX - drag.current.x) }
  const onUp = () => {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    if (dx < -70) commit(choices[0])
    else if (dx > 70) commit(choices[1])
    else setDx(0)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (!two) return
    if (e.key === 'ArrowLeft') { e.preventDefault(); commit(choices[0]) }
    if (e.key === 'ArrowRight') { e.preventDefault(); commit(choices[1]) }
  }

  const flyIdx = flying ? choices.findIndex((c) => c.id === flying) : -1
  const x = two ? (flyIdx === 0 ? -420 : flyIdx === 1 ? 420 : dx) : 0
  const lean: number | null = two ? (flyIdx >= 0 ? flyIdx : dx < -30 ? 0 : dx > 30 ? 1 : null) : null
  const n = cards.length - remaining.length
  const artH = density >= 3 ? 'h-[40px] sm:h-[80px]' : density >= 2 ? 'h-[56px] sm:h-[96px]' : density >= 1 ? 'h-[84px] sm:h-[128px]' : 'h-[128px] sm:h-[176px]'
  const cardH = density >= 3 ? 'min-h-[124px] sm:min-h-[200px]' : density >= 2 ? 'min-h-[150px] sm:min-h-[220px]' : density >= 1 ? 'min-h-[196px] sm:min-h-[250px]' : 'min-h-[244px] sm:min-h-[292px]'
  const anyArt = cards.some((c) => c.art)

  const cardTransform = two
    ? `translateX(${x}px) rotate(${x / 22}deg)`
    : flying ? 'translateY(-36px) scale(0.92)' : 'none'

  return (
    <div className="flex flex-1 flex-col">
      <style>{`
        @keyframes v2cs-nudge { 0%,100%{transform:translateX(0) rotate(0)} 25%{transform:translateX(-18px) rotate(-3deg)} 60%{transform:translateX(14px) rotate(2.5deg)} }
        .v2cs-nudge { animation: v2cs-nudge 1.5s ease-in-out 0.6s 1; }
        @keyframes v2cs-in { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
        .v2cs-in { animation: v2cs-in .26s cubic-bezier(.2,.7,.2,1) backwards }
        @media (prefers-reduced-motion: reduce){ .v2cs-nudge, .v2cs-in {animation:none!important} }
      `}</style>

      {!two && <Dots cards={cards} sorted={sorted} current={current?.id} choices={choices} onTap={(id) => !flying && onSort(id, null)} />}

      <div className="flex items-stretch gap-2 sm:gap-4">
        {two && <Pile tone="forest" choice={choices[0]} cards={pile(choices[0].id)} lit={lean === 0} onTap={() => undoPile(choices[0])} />}

        {}
        <div className={`relative flex flex-1 items-center justify-center ${cardH}`}>
          {}
          {openChoice && openCards.length > 0 && (
            <div className="absolute inset-0 z-30 flex flex-col rounded-[10px] border border-rule bg-paper p-2 shadow-[0_10px_28px_rgba(13,12,11,0.16)]" role="dialog" aria-label={`${openChoice.label}: pick one to change`} data-pile-list={openChoice.id}>
              <p className={`${UI} px-1 pb-1.5 text-[13px] font-semibold leading-[17px] text-ink`}>{openChoice.label}: tap one to change</p>
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                {openCards.map((c) => (
                  <button key={c.id} type="button" data-pile-card={c.id}
                    onClick={() => { onSort(c.id, null); setOpen(null) }}
                    className={`${UI} flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-[4px] border border-rule-soft bg-ground px-2 py-0.5 text-left text-[12.5px] font-medium leading-[15px] text-ink hover:border-ink`}>
                    {c.art && <img src={`/game/3d/${c.art}.webp`} alt="" className="h-5 w-5 shrink-0 object-contain" />}
                    {c.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setOpen(null)} className={`${UI} mt-0.5 h-8 shrink-0 text-[13px] text-muted`}>Cancel</button>
            </div>
          )}
          {next && (
            <div aria-hidden className="absolute inset-x-2 top-2 bottom-0 rounded-[10px] border border-rule-soft bg-ground" style={{ transform: 'translateY(6px) scale(0.96)' }} />
          )}
          {current ? (
            <div
              key={current.id}
              role="group" tabIndex={two ? 0 : -1} onKeyDown={onKey}
              data-option={current.id}
              aria-label={`${current.label}. Card ${n + 1} of ${cards.length}`}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              className={`relative z-10 flex h-full w-full select-none flex-col items-center rounded-[10px] border border-rule-soft bg-ground px-3 ${density >= 3 ? 'pb-2 pt-2' : 'pb-4 pt-3'} shadow-[0_1px_0_#DDD9D2,0_10px_28px_rgba(13,12,11,0.10)] outline-none focus-visible:ring-2 focus-visible:ring-navy ${two ? 'cursor-grab touch-none active:cursor-grabbing' : ''} ${two && !touched && n === 0 ? 'v2cs-nudge' : !two && n > 0 ? 'v2cs-in' : ''}`}
              style={{
                transform: cardTransform,
                opacity: flying ? 0 : 1,
                transition: dragging ? 'none' : `transform ${FLY_MS}ms cubic-bezier(.2,.7,.3,1), opacity ${FLY_MS}ms ease`,
              }}
            >
              <span className={`${UI} self-end text-[12px] tabular-nums text-muted`}>{n + 1} of {cards.length}</span>
              <div className="flex flex-1 flex-col items-center justify-center">
                <p className={`${TEXT} text-center font-semibold text-ink ${density >= 2 ? 'text-[20px] leading-[25px]' : 'text-[22px] leading-[27px] sm:text-[26px] sm:leading-[32px]'}`}>{current.label}</p>
                {current.hint && <p className={`${UI} mt-1.5 max-w-[34ch] text-center text-[13px] leading-[18px] text-muted`}>{current.hint}</p>}
                {current.art ? (
                  <img src={`/game/3d/${current.art}.webp`} alt="" draggable={false}
                    className={`pointer-events-none mt-2 w-full object-contain ${artH}`} />
                ) : anyArt ? <div className={artH} /> : null}
              </div>
              {}
              {lean !== null && (
                <span className={`${UI} absolute inset-x-3 top-3 rounded-[4px] border-2 bg-ground py-1 text-center text-[13px] font-semibold leading-[16px] ${lean === 0 ? 'border-forest text-forest' : 'border-navy text-navy'}`}>
                  {lean === 0 ? `‹ ${choices[0].label}` : `${choices[1].label} ›`}
                </span>
              )}
            </div>
          ) : (
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-[10px] border border-dashed border-rule bg-paper px-4 text-center">
              {done}
            </div>
          )}
        </div>

        {two && <Pile tone="navy" choice={choices[1]} cards={pile(choices[1].id)} lit={lean === 1} onTap={() => undoPile(choices[1])} />}
      </div>

      {}
      {two ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" disabled={!current} onClick={() => commit(choices[0])} data-choice={choices[0].id}
            className={`${UI} flex ${density >= 2 ? 'min-h-12' : 'min-h-14'} items-center justify-center gap-2 rounded-[6px] border-2 border-forest bg-ground px-3 text-[15px] font-semibold leading-[19px] text-forest transition-colors hover:bg-forest hover:text-white disabled:opacity-40 disabled:hover:bg-ground disabled:hover:text-forest`}>
            <span aria-hidden className="text-[20px]">‹</span>{choices[0].label}
          </button>
          <button type="button" disabled={!current} onClick={() => commit(choices[1])} data-choice={choices[1].id}
            className={`${UI} flex ${density >= 2 ? 'min-h-12' : 'min-h-14'} items-center justify-center gap-2 rounded-[6px] border-2 border-navy bg-ground px-3 text-[15px] font-semibold leading-[19px] text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-40 disabled:hover:bg-ground disabled:hover:text-navy`}>
            {choices[1].label}<span aria-hidden className="text-[20px]">›</span>
          </button>
        </div>
      ) : (
        <div className={`mt-3 grid gap-2 ${choices.length === 3 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {choices.map((ch) => {
            const isFull = full(ch)
            const no = refused?.id === ch.id
            const on = flying === ch.id
            return (
              <button key={ch.id} type="button" disabled={!current} onClick={() => commit(ch)} data-choice={ch.id}
                aria-label={isFull ? `${ch.label}: full, ${ch.cap} of ${ch.cap} cards` : ch.label}
                className={`${UI} relative flex flex-col items-center justify-center rounded-[6px] border-2 px-2 text-center transition-colors disabled:opacity-40
                  ${density >= 2 ? 'min-h-[50px] py-1' : 'min-h-[58px] py-1.5'}
                  ${on ? 'border-navy bg-navy text-white' : isFull ? 'border-rule-soft bg-paper text-muted' : 'border-navy bg-ground text-navy hover:bg-navy hover:text-white'}`}>
                <span key={no ? `no-${refused?.n}` : 'ok'} className={`text-[15px] font-semibold leading-[18px] ${no ? 'v2-shake' : ''}`}>{ch.label}</span>
                {(ch.hint || ch.cap !== undefined) && (
                  <span className={`mt-0.5 text-[12px] font-normal leading-[15px] ${no ? 'font-semibold text-bronze' : on ? 'text-white/80' : 'text-muted'}`}>
                    {no ? `Full: ${ch.cap} of ${ch.cap} used` : ch.cap !== undefined && used(ch) > 0 ? `${used(ch)} of ${ch.cap} used` : ch.hint}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Dots({ cards, sorted, current, choices, onTap }: { cards: StackCard[]; sorted: Record<string, string>; current?: string; choices: StackChoice[]; onTap: (id: string) => void }) {
  return (
    <div className="mb-2 flex items-center justify-center gap-2" role="group" aria-label="Cards">
      {cards.map((c, i) => {
        const s = sorted[c.id]
        const label = choices.find((x) => x.id === s)?.label
        return (
          <button key={c.id} type="button" disabled={!s} onClick={() => onTap(c.id)}
            aria-label={s ? `${c.label}: ${label}. Tap to change.` : `${c.label}: not answered yet`}
            className={`${UI} flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] text-[13px] font-semibold tabular-nums transition-colors
              ${s ? 'border-forest bg-forest text-white hover:bg-[#173a2d]' : c.id === current ? 'border-ink bg-ground text-ink' : 'border-rule-soft bg-ground text-disabled-ink'}`}>
            {s ? <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}
          </button>
        )
      })}
    </div>
  )
}

function Pile({ tone, choice, cards, lit, onTap }: { tone: 'forest' | 'navy'; choice: StackChoice; cards: StackCard[]; lit: boolean; onTap: () => void }) {
  const label = choice.label
  return (
    <button type="button" onClick={onTap} disabled={!cards.length} data-zone={choice.id}
      aria-label={`${label}: ${cards.length} card${cards.length === 1 ? '' : 's'}${cards.length ? '. Tap to change one.' : ''}`}
      className={`flex w-[76px] shrink-0 flex-col items-center rounded-[8px] border px-1 pb-2 pt-2 transition-colors sm:w-[132px] ${lit ? (tone === 'forest' ? 'border-solid border-forest bg-forest/10' : 'border-solid border-navy bg-navy/10') : 'border-dashed border-rule bg-paper'}`}>
      <span className={`${UI} text-center text-[12px] font-semibold leading-[15px] sm:text-[14px] sm:leading-[18px] ${tone === 'forest' ? 'text-forest' : 'text-navy'}`}>{label}</span>
      <span className={`${UI} mt-1 text-[20px] font-semibold tabular-nums text-ink`}>{cards.length}</span>
      {}
      <div className="mt-1 flex h-0 min-h-0 w-full flex-1 flex-col items-center gap-[3px] overflow-hidden">
        {cards.map((c) => (
          <div key={c.id} title={c.label}
            className="v2-ready flex w-full shrink-0 items-center gap-1 rounded-[3px] border border-rule-soft bg-ground px-1 py-[3px] shadow-[0_1px_0_#DDD9D2] sm:py-1">
            {c.art && <img src={`/game/3d/${c.art}.webp`} alt="" className="hidden h-6 w-6 shrink-0 object-contain sm:block" />}
            <span className={`${UI} line-clamp-2 min-w-0 break-words text-left text-[10px] font-medium leading-[12px] tracking-[-0.01em] text-ink sm:hidden`}>{c.label}</span>
            <span className={`${UI} hidden text-left text-[12px] leading-[14px] text-ink sm:inline`}>{c.label}</span>
          </div>
        ))}
      </div>
    </button>
  )
}
