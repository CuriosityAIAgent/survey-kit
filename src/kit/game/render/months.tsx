'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import V2Frame from '../V2Frame'
import type { RenderProps } from './contract'
import type { Answer } from '../questions'
import { useLaptop } from '../hero/podium/useLaptop'
import { click, unlockAudio } from '../hero/podium/sound'

const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'

function inYears(m: number) {
  const y = Math.floor(m / 12)
  const r = m % 12
  const ys = y ? `${y} year${y === 1 ? '' : 's'}` : ''
  const rs = r ? `${r} month${r === 1 ? '' : 's'}` : ''
  return [ys, rs].filter(Boolean).join(' ')
}

function yearsNum(m: number): string {
  const y = Math.floor(m / 12), r = m % 12
  return r === 6 ? `${y}½` : r === 0 ? `${y}` : (m / 12).toFixed(1)
}

function around(t: string | undefined, fallback: string): [string, string] {
  const s = t ?? fallback
  const at = s.indexOf('{n}')
  return at < 0 ? ['', s] : [s.slice(0, at), s.slice(at + 3)]
}

export default function MonthsRender(p: RenderProps) {
  const { q, set, log } = p
  const laptop = useLaptop()
  const range = q.constraints.range ?? { min: 12, max: 48, step: 3, unit: 'months' }
  const { min: MIN, max: MAX, step: STEP, unit } = range
  const SPAN = Math.max(1, MAX - MIN)

  const blocks = unit === 'months' ? Math.max(1, Math.round(SPAN / STEP)) : SPAN <= 60 ? SPAN : Math.round(SPAN / STEP)
  const stops = Array.from({ length: Math.floor(SPAN / STEP) + 1 }, (_, i) => MIN + i * STEP)
  const chips = q.options
  const ot = q.objectText ?? {}

  const valid = (v: Answer | undefined): number | string | null => {
    if (typeof v === 'number' && v >= MIN && v <= MAX && (v - MIN) % STEP === 0) return v
    if (typeof v === 'string' && chips.some((c) => c.id === v)) return v
    return null
  }
  const init = valid(p.value)
  const [value, setValue] = useState<number | null>(typeof init === 'number' ? init : null)
  const [chip, setChip] = useState<string | null>(typeof init === 'string' ? init : null)
  const [prev, setPrev] = useState(MIN)
  const [touched, setTouched] = useState(init !== null)
  const groove = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)
  const [drag, setDrag] = useState(false)
  const lastClick = useRef(0)
  const latest = useRef(value)
  useEffect(() => { latest.current = value }, [value])

  const choose = (v: number) => {
    const c = Math.max(MIN, Math.min(MAX, MIN + Math.round((v - MIN) / STEP) * STEP))
    setTouched(true)
    if (chip) setChip(null)
    if (c === value && !chip) return
    setPrev(value ?? MIN)
    setValue(c)
    set(c)
    const now = performance.now()
    if (now - lastClick.current > 45) { click(); lastClick.current = now }
  }

  const fromX = (x: number) => {
    const r = groove.current?.getBoundingClientRect()
    if (!r) return
    const t = Math.max(0, Math.min(1, (x - r.left) / r.width))
    choose(MIN + t * SPAN)
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    unlockAudio()
    dragging.current = true
    setDrag(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    fromX(e.clientX)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => { if (dragging.current) fromX(e.clientX) }
  const onUp = () => {
    if (dragging.current && latest.current !== null) log('set', { value: latest.current })
    dragging.current = false
    setDrag(false)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = value ?? MIN
    const k: Record<string, number> = {
      ArrowRight: v + STEP, ArrowUp: v + STEP, ArrowLeft: v - STEP, ArrowDown: v - STEP,
      PageUp: v + STEP * 4, PageDown: v - STEP * 4, Home: MIN, End: MAX,
    }
    if (e.key in k) { e.preventDefault(); choose(value === null ? MIN : k[e.key]) }
  }

  const pickChip = (id: string) => {
    unlockAudio()
    setTouched(true)
    if (chip === id) return
    setChip(id)
    setPrev(MIN)
    setValue(null)
    set(id)
    log('set', { value: id })
  }

  const filled = value === null ? 0 : Math.round(((value - MIN) / SPAN) * blocks)
  const was = Math.round(((prev - MIN) / SPAN) * blocks)
  const pct = value === null ? 0 : ((value - MIN) / SPAN) * 100
  const parked = value === null
  const [pre, post] = around(ot.readout, `{n} ${unit}`)
  const [emptyPre, emptyPost] = around(ot.empty?.replace('—', '{n}'), `{n} ${unit}`)
  const chipOn = chips.find((c) => c.id === chip)

  const yearly = unit === 'months' && MIN % 12 === 0 && SPAN % 12 === 0
  const marks: { at: number; label: string }[] = yearly
    ? Array.from({ length: SPAN / 12 + 1 }, (_, i) => {
        const m = MIN + i * 12
        const label = i === 0 && ot.start ? ot.start : m === MAX && ot.end ? ot.end : inYears(m)
        return { at: m, label }
      })
    : [{ at: MIN, label: ot.start ?? `${MIN}` }, { at: MAX, label: ot.end ?? `${MAX}` }]

  const missing = p.preview || value !== null || chip ? undefined : `Set the ${unit}`

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy}
      missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <div className="flex flex-1 flex-col justify-center pb-2 lg:pb-6" data-q={q.id}>
        {}
        <div className="flex h-[88px] flex-col items-center justify-end text-center lg:h-[120px]" aria-live="polite" data-readout>
          {chipOn ? (
            <>
              <p key={chipOn.id} className={`${TEXT} v2-rise text-[40px] font-semibold leading-[46px] text-ink lg:text-[52px] lg:leading-[58px]`}>
                {ot.whenReady ?? chipOn.label}
              </p>
              <p className={`${UI} mt-1 h-5 text-[14px] text-muted lg:text-[15px]`}>{ot.whenReady && chipOn.label.includes(':') ? chipOn.label.split(':')[0] : ''}</p>
            </>
          ) : (
            <>
              <p className={`${TEXT} leading-none`}>
                {value === null ? (
                  <>
                    {emptyPre && <span className="mr-2 text-[24px] text-disabled-ink lg:text-[28px]">{emptyPre}</span>}
                    <span className="inline-block min-w-[1.2ch] text-[64px] font-semibold text-[#C9C3B8] lg:text-[84px]">—</span>
                    <span className="ml-2 text-[24px] text-disabled-ink lg:text-[30px]">{emptyPost.trim()}</span>
                  </>
                ) : (
                  unit === 'months' ? (
                    <>
                      <span className="inline-block min-w-[1.2ch] text-[64px] font-semibold tabular-nums text-ink lg:text-[84px]">{yearsNum(value)}</span>
                      <span className="ml-2 text-[24px] text-ink lg:text-[30px]">{value === 12 ? 'year' : 'years'}</span>
                    </>
                  ) : (
                  <>
                    {pre && <span className="mr-2 text-[24px] text-ink lg:text-[28px]">{pre}</span>}
                    <span className="inline-block min-w-[1.2ch] text-[64px] font-semibold tabular-nums text-ink lg:text-[84px]">{value}</span>
                    <span className="ml-2 text-[24px] text-ink lg:text-[30px]">{post.trim()}</span>
                  </>
                  )
                )}
              </p>
              <p className={`${UI} mt-1.5 h-5 text-[14px] text-muted lg:text-[15px]`} aria-hidden />
            </>
          )}
        </div>

        {}
        <div className={`mt-6 transition-opacity duration-300 lg:mt-10 ${chip ? 'opacity-35' : ''}`}>
          <div className="relative ml-12 mr-5 touch-none select-none lg:ml-16 lg:mr-6"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            {}
            <div className="absolute -inset-y-4 -left-14 -right-5 cursor-pointer" aria-hidden />
            <div ref={groove} className="relative h-[42px] rounded-[6px] lg:h-[56px]"
              style={{ background: 'linear-gradient(180deg,#E6E1D8,#EEEAE3)', boxShadow: 'inset 0 2px 3px rgba(13,12,11,.10), inset 0 -1px 0 #FFFFFF' }}>
              {Array.from({ length: blocks }, (_, i) => {
                const on = i < filled
                const delay = on && i >= was ? (i - was) * 22 : 0
                const yearLine = yearly && blocks === SPAN && i % 12 === 0 && i > 0
                return (
                  <span key={i} aria-hidden
                    className={`absolute top-[5px] bottom-[5px] rounded-[2px] ${on ? 'v2m-in' : ''}`}
                    style={{
                      left: `calc(${(i / blocks) * 100}% + 1px)`,
                      width: `calc(${100 / blocks}% - 2px)`,
                      animationDelay: `${delay}ms`,
                      background: on ? 'linear-gradient(180deg,#3A5075 0%,#1E3150 45%,#14233B 100%)' : 'transparent',
                      boxShadow: on
                        ? 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 0 rgba(0,0,0,.25), 0 1px 1px rgba(13,12,11,.2)'
                        : (yearLine ? 'inset 1px 0 0 #CFC8BB' : 'none'),
                    }} />
                )
              })}
              {}
              {stops.map((v) => (
                <button key={v} type="button" tabIndex={-1} aria-hidden data-zone={String(v)}
                  onClick={() => choose(v)}
                  className="absolute inset-y-0 z-[1] -translate-x-1/2 cursor-pointer opacity-0"
                  style={{ left: `${((v - MIN) / SPAN) * 100}%`, width: `${(STEP / SPAN) * 100}%` }} />
              ))}
            </div>

            {}
            <div role="slider" tabIndex={0} aria-label={q.question}
              aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={value ?? undefined}
              aria-valuetext={value === null ? 'Not set' : unit === 'months' ? `${yearsNum(value)} ${value === 12 ? 'year' : 'years'}` : `${value} ${unit}`}
              onKeyDown={onKey} data-handle
              className={`absolute top-1/2 z-10 flex h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full active:cursor-grabbing lg:h-[46px] lg:w-[46px] ${
                parked
                  ? 'border-[1.5px] border-dashed border-[#A39C90] bg-paper opacity-80'
                  : 'border border-ink bg-ground shadow-[0_4px_10px_rgba(13,12,11,.18)]'
              } ${parked && !chip && !touched ? 'v2m-nudge' : ''}`}
              style={{ left: parked ? (laptop ? -42 : -34) : `${pct}%`, transition: drag ? 'none' : 'left 180ms cubic-bezier(.3,.7,.2,1)' }}>
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ink/70" />
            </div>

            {}
            <div aria-hidden className={`${UI} relative mt-2 h-5 text-[12px] text-muted lg:text-[14px]`}>
              {marks.map((y) => (
                <span key={y.at} className="absolute top-0 flex -translate-x-1/2 flex-col items-center whitespace-nowrap"
                  style={{ left: `${((y.at - MIN) / SPAN) * 100}%` }}>
                  <span className="mb-0.5 h-1.5 w-px bg-rule" />
                  {y.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {}
        {chips.length > 0 && (
          <div className="mt-9 flex flex-wrap justify-center gap-2 lg:mt-12">
            {chips.map((c) => {
              const on = chip === c.id
              return (
                <button key={c.id} type="button" aria-pressed={on} data-option={c.id} onClick={() => pickChip(c.id)}
                  className={`${UI} flex min-h-[48px] items-center gap-3 rounded-[4px] border px-4 text-[15px] transition-colors lg:min-h-[52px] lg:px-5 lg:text-[16px] ${
                    on ? 'border-ink bg-ink text-white' : 'border-rule bg-ground text-ink hover:border-ink'
                  }`}>
                  <span aria-hidden className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${on ? 'border-white' : 'border-rule'}`}>
                    {on && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  {c.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <style>{`
        @keyframes v2m-in {
          0% { transform: translateY(-14px) scaleY(1.1); opacity: 0; }
          60% { transform: translateY(1px) scaleY(.94); opacity: 1; }
          100% { transform: translateY(0) scaleY(1); opacity: 1; }
        }
        .v2m-in { animation: v2m-in 240ms cubic-bezier(.3,.7,.3,1) both; transform-origin: bottom; }
        @keyframes v2m-nudge {
          0%, 40%, 100% { transform: translateX(0); }
          10% { transform: translateX(14px); }
          20% { transform: translateX(0); }
          30% { transform: translateX(8px); }
        }
        .v2m-nudge { animation: v2m-nudge 2.4s ease-in-out .6s 3; }
        @media (prefers-reduced-motion: reduce) { .v2m-in, .v2m-nudge { animation: none; } }
      `}</style>
    </V2Frame>
  )
}
