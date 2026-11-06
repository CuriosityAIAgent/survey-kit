'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type SplitCard = { id: string; label: string; art?: string }
export type SplitChoice = { id: string; label: string; hint?: string; cap?: number }
export type SplitRow = {
  key: 'first' | 'main'
  label: string
  choices: SplitChoice[]

  picked: Record<string, string>
}

const NEXT_MS = 380
const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'

export default function SplitCards({ cards, rows, onPick, onRefuse, onShow, done, density = 0 }: {
  cards: SplitCard[]
  rows: [SplitRow, SplitRow]
  onPick: (row: 'first' | 'main', card: string, choice: string) => void
  onRefuse?: (row: 'first' | 'main', choice: string) => void

  onShow?: (card: string | null) => void

  done?: ReactNode

  density?: number
}) {
  const complete = (id: string) => rows.every((r) => !!r.picked[id])
  const [focus, setFocus] = useState<string | null>(null)
  const [hold, setHold] = useState<string | null>(null)
  const [refused, setRefused] = useState<{ key: string; n: number } | null>(null)
  const timer = useRef(0)
  const refuseTimer = useRef(0)
  const root = useRef<HTMLDivElement>(null)
  const moved = useRef<'keyboard' | 'pointer' | null>(null)
  const via = useRef<'keyboard' | 'pointer'>('pointer')
  useEffect(() => () => { window.clearTimeout(timer.current); window.clearTimeout(refuseTimer.current) }, [])

  const firstOpen = cards.find((c) => !complete(c.id))?.id ?? null
  const currentId = hold ?? focus ?? firstOpen
  const current = cards.find((c) => c.id === currentId)
  const n = current ? cards.indexOf(current) : cards.length

  useEffect(() => { onShow?.(currentId) }, [currentId, onShow])

  useEffect(() => {
    const how = moved.current
    if (!how) return
    moved.current = null
    const active = document.activeElement
    const inside = root.current?.contains(active) || active === document.body
    if (!inside) return
    if (how === 'pointer') { if (active instanceof HTMLElement && active !== document.body) active.blur(); return }
    const target = currentId
      ? root.current?.querySelector<HTMLElement>('[data-row="first"] [data-choice]')
      : document.querySelector<HTMLElement>('[data-next]')
    target?.focus()
  }, [currentId])

  const used = (row: SplitRow, ch: SplitChoice) => cards.filter((c) => c.id !== currentId && row.picked[c.id] === ch.id).length
  const full = (row: SplitRow, ch: SplitChoice) => ch.cap !== undefined && used(row, ch) >= ch.cap

  const moveOn = (id: string) => {
    setHold(id)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { moved.current = via.current; setHold(null); setFocus(null) }, NEXT_MS)
  }

  const pick = (row: SplitRow, ch: SplitChoice) => {
    if (!current) return
    if (full(row, ch)) {
      window.clearTimeout(refuseTimer.current)
      setRefused((r) => ({ key: `${row.key}:${ch.id}`, n: (r?.n ?? 0) + 1 }))
      refuseTimer.current = window.setTimeout(() => setRefused(null), 2000)
      onRefuse?.(row.key, ch.id)
      return
    }
    onPick(row.key, current.id, ch.id)

    const other = rows.find((r) => r.key !== row.key)!
    if (other.picked[current.id]) moveOn(current.id)
  }

  const show = (id: string | null) => {
    window.clearTimeout(timer.current)
    setHold(null)
    setFocus(id)
  }

  const artH = density >= 3 ? 'h-8 w-8' : density >= 2 ? 'h-10 w-10' : density >= 1 ? 'h-12 w-12' : 'h-14 w-14 sm:h-16 sm:w-16'
  const chipH = density >= 3 ? 'min-h-[42px]' : density >= 2 ? 'min-h-[46px]' : density >= 1 ? 'min-h-[52px]' : 'min-h-[56px]'

  return (
    <div ref={root} className="flex flex-1 flex-col">
      <style>{`
        @keyframes v2sc-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .v2sc-in { animation: v2sc-in .24s cubic-bezier(.2,.7,.2,1) backwards }
        @media (prefers-reduced-motion: reduce){ .v2sc-in {animation:none!important} }
      `}</style>
      <p className="sr-only" aria-live="polite">
        {current ? `Card ${n + 1} of ${cards.length}: ${current.label}` : `All ${cards.length} cards answered`}
      </p>

      {}
      <div className={`${density >= 2 ? 'mb-1.5' : 'mb-2'} flex items-center justify-center gap-2`} role="group" aria-label="Cards">
        {cards.map((c, i) => {
          const all = complete(c.id)
          const some = rows.some((r) => !!r.picked[c.id])
          const here = c.id === currentId
          const resume = c.id === firstOpen && !here
          return (
            <button key={c.id} type="button" disabled={!some && !resume} onClick={() => show(resume ? null : c.id)}
              aria-current={here ? 'step' : undefined}
              aria-label={`${c.label}: ${all ? 'answered. Tap to change.' : some ? 'one row answered' : resume ? 'not answered yet. Tap to go back to it.' : 'not answered yet'}`}
              className={`${UI} flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] text-[13px] font-semibold tabular-nums transition-colors
                ${here ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''}
                ${all ? 'border-forest bg-forest text-white hover:bg-[#173a2d]' : some || here || resume ? 'border-ink bg-ground text-ink' : 'border-rule-soft bg-ground text-disabled-ink'}`}>
              {all ? <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}
            </button>
          )
        })}
      </div>

      {current ? (
        <>
          {}
          <div key={current.id} data-option={current.id} role="group" aria-label={`${current.label}. Card ${n + 1} of ${cards.length}`}
            className={`v2sc-in relative flex items-center gap-3 rounded-[10px] border border-rule-soft bg-ground px-4 shadow-[0_1px_0_#DDD9D2,0_10px_28px_rgba(13,12,11,0.10)] ${density >= 2 ? 'py-2' : 'py-3'}`}>
            {current.art && <img src={`/game/3d/${current.art}.webp`} alt="" draggable={false} className={`pointer-events-none shrink-0 object-contain ${artH}`} />}
            <p className={`${TEXT} flex-1 font-semibold text-ink ${density >= 3 ? 'text-[18px] leading-[22px]' : density >= 2 ? 'text-[19px] leading-[24px]' : 'text-[20px] leading-[25px] sm:text-[24px] sm:leading-[30px]'}`}>{current.label}</p>
            <span className={`${UI} self-start text-[12px] tabular-nums text-muted`}>{n + 1} of {cards.length}</span>
          </div>

          {}
          {rows.map((row) => {
            const tone = row.key === 'first' ? 'forest' : 'navy'
            const chosen = row.picked[current.id]
            return (
              <div key={row.key} data-row={row.key} role="radiogroup" aria-label={row.label} className={density >= 2 ? 'mt-2' : 'mt-3'}>
                <p className={`${UI} mb-1.5 text-[13px] font-semibold leading-[17px] ${tone === 'forest' ? 'text-forest' : 'text-navy'}`}>{row.label}</p>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {row.choices.map((ch) => {
                    const on = chosen === ch.id
                    const isFull = !on && full(row, ch)
                    const no = refused?.key === `${row.key}:${ch.id}`
                    const u = used(row, ch) + (on ? 1 : 0)
                    const sub = no ? `Full: ${ch.cap} of ${ch.cap}` : ch.cap !== undefined && u > 0 ? `${u} of ${ch.cap} used` : ch.hint
                    const border = tone === 'forest' ? 'border-forest' : 'border-navy'
                    const fill = tone === 'forest' ? 'bg-forest' : 'bg-navy'
                    const ink = tone === 'forest' ? 'text-forest' : 'text-navy'
                    return (
                      <button key={ch.id} type="button" role="radio" aria-checked={on} data-choice={ch.id}
                        aria-disabled={isFull || undefined}
                        aria-label={isFull ? `${ch.label}: full, ${ch.cap} of ${ch.cap} cards` : `${ch.label}${ch.hint ? `, ${ch.hint}` : ''}`}
                        onClick={(e) => { via.current = e.detail === 0 ? 'keyboard' : 'pointer'; pick(row, ch) }}
                        className={`${UI} flex flex-col items-center justify-center rounded-[6px] border-2 px-1 py-1 text-center transition-colors ${chipH}
                          ${on ? `${border} ${fill} text-white` : isFull ? 'border-rule-soft bg-paper text-muted' : `${border} bg-ground ${ink} hover:bg-[#EEF1F5]`}`}>
                        <span key={no ? `no-${refused?.n}` : 'ok'} className={`text-[14px] font-semibold leading-[17px] sm:text-[15px] ${no ? 'v2-shake' : ''}`}>{ch.label}</span>
                        {sub && (
                          <span className={`mt-0.5 text-[11px] font-normal leading-[13px] sm:text-[12px] sm:leading-[15px] ${no ? 'font-semibold text-bronze' : on ? 'text-white/85' : 'text-muted'}`}>{sub}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      ) : (
        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-[10px] border border-dashed border-rule bg-paper px-4 py-6 text-center">
          {done}
        </div>
      )}
    </div>
  )
}
