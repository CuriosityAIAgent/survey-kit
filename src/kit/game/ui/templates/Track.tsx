'use client'

import { useRef, useState } from 'react'

type OptOut = { id: string; label: string }

type Props = {
  stops: string[]

  stopIds?: string[]
  value: number | null
  onChange: (i: number | null) => void
  readoutLead?: string
  anchorLabel?: string
  startLabel?: string
  endLabel?: string
  fillFrom?: 'centre' | 'start'
  optOuts?: OptOut[]
  optedOutId?: string | null
  onOptOutId?: (id: string | null) => void

  optOut?: string
  optedOut?: boolean
  onOptOut?: (on: boolean) => void

  density?: number
  label?: string
}

const UI = 'font-[family-name:var(--font-ui)]'

export default function Track(p: Props) {
  const { stops, value, onChange, readoutLead, anchorLabel, startLabel, endLabel, fillFrom = 'centre', density = 0 } = p
  const n = stops.length
  const ids = p.stopIds ?? stops
  const outs: OptOut[] = p.optOuts ?? (p.optOut ? [{ id: p.optOut, label: p.optOut }] : [])
  const outId = p.optedOutId !== undefined ? p.optedOutId : p.optedOut ? outs[0]?.id ?? null : null
  const setOut = (id: string | null) => (p.onOptOutId ? p.onOptOutId(id) : p.onOptOut?.(!!id))
  const clearOut = () => { if (outId) setOut(null) }
  const optedOut = !!outId

  const bar = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState<number | null>(null)
  const [touched, setTouched] = useState(false)

  const xOf = (i: number) => (i + 0.5) / n
  const frac = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect()
    const f = (clientX - r.left) / r.width
    return Math.max(xOf(0), Math.min(xOf(n - 1), f))
  }
  const nearest = (f: number) => Math.max(0, Math.min(n - 1, Math.round(f * n - 0.5)))
  const choose = (i: number) => { setTouched(true); clearOut(); if (i !== value || optedOut) onChange(i) }

  const onDown = (e: React.PointerEvent) => {
    setTouched(true)
    wrap.current?.setPointerCapture(e.pointerId)
    const f = frac(e.clientX)
    setLive(f)
    choose(nearest(f))
  }
  const onMove = (e: React.PointerEvent) => {
    if (live === null) return
    const f = frac(e.clientX)
    setLive(f)
    const i = nearest(f)
    if (i !== value) onChange(i)
  }
  const onUp = () => setLive(null)

  const placed = value !== null && !optedOut
  const pos = live ?? (placed ? xOf(value!) : null)
  const anchor = fillFrom === 'centre' ? 0.5 : xOf(0)
  const shown = placed ? stops[value!] : optedOut ? outs.find((o) => o.id === outId)?.label : null

  const onKey = (e: React.KeyboardEvent) => {
    const v = value ?? Math.floor(n / 2)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); choose(Math.max(0, placed ? v - 1 : v)) }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); choose(Math.min(n - 1, placed ? v + 1 : v)) }
  }
  const aria = p.label ?? readoutLead ?? 'Choose a point on the line'
  const ends = anchorLabel || startLabel || endLabel

  return (
    <div className="flex flex-col">
      <style>{`
        @keyframes v2tr-nudge { 0%,100%{transform:translate(-50%,0)} 30%{transform:translate(-50%,-10px)} 55%{transform:translate(-50%,0)} 75%{transform:translate(-50%,-5px)} }
        .v2tr-nudge { animation: v2tr-nudge 1.2s ease-in-out 0.6s 2; }
        @media (prefers-reduced-motion: reduce){ .v2tr-nudge{animation:none!important} }
      `}</style>

      {}
      <div className={`rounded-[8px] border border-rule-soft bg-ground px-4 text-center ${density >= 1 ? 'py-1' : 'py-2 sm:py-3 lg:py-6'}`} aria-live="polite">
        {readoutLead && <p className={`${UI} text-[12px] leading-[16px] text-muted sm:text-[13px]`}>{readoutLead}</p>}
        <p key={shown ?? 'none'} className={`font-[family-name:var(--font-text)] font-semibold ${density >= 1 ? 'text-[23px] leading-[30px]' : 'text-[26px] leading-[34px] sm:text-[36px] sm:leading-[46px] lg:text-[44px] lg:leading-[54px]'} ${shown ? 'v2-ready text-ink' : 'text-rule'}`}>
          {shown ?? '—'}
        </p>
      </div>

      {}
      <div ref={wrap} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} className={`relative select-none ${density >= 1 ? 'mt-2' : 'mt-3 sm:mt-6'} ${optedOut ? 'opacity-40' : ''}`}>
        {ends && (
          <div className={`${UI} grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-[13px] leading-[16px]`}>
            <span className="text-left font-medium text-muted">{startLabel && <>‹ {startLabel}</>}</span>
            <span className="text-center font-semibold text-forest">{anchorLabel}</span>
            <span className="text-right font-medium text-muted">{endLabel && <>{endLabel} ›</>}</span>
          </div>
        )}
        <div ref={bar} className="relative h-14 cursor-pointer touch-none lg:h-20" onPointerDown={onDown}>
          {}
          <div className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-rule-soft lg:h-4" style={{ left: `${xOf(0) * 100}%`, right: `${(1 - xOf(n - 1)) * 100}%` }} />
          {}
          {pos !== null && (
            <div className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-navy transition-[left,width] duration-150 lg:h-4"
              style={{ left: `${Math.min(anchor, pos) * 100}%`, width: `${Math.abs(pos - anchor) * 100}%` }} />
          )}
          {}
          {stops.map((s, i) => (
            <span key={ids[i]} aria-hidden className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 lg:h-5 lg:w-5 ${placed && ((anchor <= xOf(i) && xOf(i) <= pos!) || (pos! <= xOf(i) && xOf(i) <= anchor)) ? 'border-navy bg-navy' : 'border-rule bg-paper'}`}
              style={{ left: `${xOf(i) * 100}%` }} />
          ))}
          {}
          {anchorLabel && (
            <span aria-hidden className="absolute top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-forest" style={{ left: `${anchor * 100}%` }} />
          )}
          {}
          {pos !== null && (
            <button type="button" role="slider" aria-label={aria} aria-valuemin={1} aria-valuemax={n} aria-valuenow={(value ?? 0) + 1} aria-valuetext={shown ?? undefined}
              onKeyDown={onKey}
              className={`absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-navy bg-ground text-navy shadow-[0_2px_8px_rgba(13,12,11,0.25)] ${live !== null ? '' : 'transition-[left] duration-200'}`}
              style={{ left: `${pos * 100}%` }}>
              <Grip />
            </button>
          )}
        </div>
        {}
        <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {stops.map((s, i) => (
            <button key={ids[i]} type="button" data-zone={ids[i]} aria-pressed={placed && value === i} onClick={() => choose(i)}
              className={`${UI} flex min-h-11 items-start justify-center px-0.5 pt-1 text-center text-[13px] leading-[16px] sm:text-[14px] sm:leading-[18px] lg:text-[15px] lg:leading-[20px] ${placed && value === i ? 'font-semibold text-navy' : 'text-muted hover:text-ink'}`}>
              {s}
            </button>
          ))}
        </div>

        {}
        {pos === null && !optedOut && (
          <div className={`relative ${density >= 1 ? 'h-[50px]' : 'h-[56px]'}`}>
            <button type="button" role="slider" aria-label={aria} aria-valuemin={1} aria-valuemax={n} aria-valuetext="Not set"
              onKeyDown={onKey}
              onPointerDown={onDown}
              className={`absolute left-1/2 top-1 flex h-12 w-12 touch-none items-center justify-center rounded-full border-2 border-navy bg-ground text-navy shadow-[0_4px_12px_rgba(13,12,11,0.22)] ${!touched ? 'v2tr-nudge' : ''}`}
              style={{ transform: 'translate(-50%,0)' }}>
              <Grip />
            </button>
          </div>
        )}
      </div>

      {outs.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {outs.map((o) => (
            <button key={o.id} type="button" data-option={o.id} aria-pressed={outId === o.id}
              onClick={() => { setTouched(true); if (outId === o.id) setOut(null); else { setOut(o.id); if (!p.onOptOutId) onChange(null) } }}
              className={`${UI} min-h-11 rounded-full border px-5 text-[14px] transition-colors ${outId === o.id ? 'border-ink bg-ink text-white' : 'border-rule bg-ground text-ink hover:border-ink'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Grip() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 7 L3 12 L8 17" /><path d="M16 7 L21 12 L16 17" /><path d="M11 8 V16" /><path d="M13 8 V16" />
    </svg>
  )
}
