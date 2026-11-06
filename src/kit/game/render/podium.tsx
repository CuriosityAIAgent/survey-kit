'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import V2Frame from '../V2Frame'
import type { RenderProps } from './contract'
import type { Answer } from '../questions'
import GhostDemo from '../ui/GhostDemo'
import { useLaptop } from '../hero/podium/useLaptop'
import { thunk, unlockAudio } from '../hero/podium/sound'
import { shuffled, toAnswer, PLACE_KEYS as KEYS } from '../hero/podium/order'

const UI = 'font-[family-name:var(--font-ui)]'
const RANK = ['1st', '2nd', '3rd']
const SNAP = 24

type Fly = { kind: 'up' | 'down'; slot: number; id: string; from: DOMRect | null; n: number }
type Drag = { id: string; from: number; x: number; y: number; sx: number; sy: number; w: number; moved: boolean; over: number | null }

function readPlaces(v: Answer | undefined, ids: Set<string>, n: number): (string | null)[] {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const rec = v as Readonly<Record<string, unknown>>
    const seen = new Set<string>()
    return Array.from({ length: n }, (_, k) => {
      const x = rec[KEYS[k]]
      if (typeof x !== 'string' || !ids.has(x) || seen.has(x)) return null
      seen.add(x)
      return x
    })
  }
  const list = Array.isArray(v) ? (v as readonly unknown[]) : typeof v === 'string' ? [v] : []
  const seen = new Set<string>()
  const out: (string | null)[] = []
  for (const x of list) {
    if (typeof x !== 'string' || !ids.has(x) || seen.has(x)) continue
    seen.add(x)
    out.push(x)
  }
  return Array.from({ length: n }, (_, k) => out[k] ?? null)
}

export default function PodiumRender(p: RenderProps) {
  const { q, seed, log } = p
  const laptop = useLaptop()
  const n = Math.max(1, Math.min(3, q.constraints.pick ?? 2))
  const rank = (k: number) => q.objectText?.[KEYS[k]] ?? RANK[k]

  const opts = useMemo(() => (q.shuffle ? shuffled(q.options, seed, q.id) : q.options), [q, seed])
  const label = useMemo(() => Object.fromEntries(opts.map((o) => [o.id, o.label])) as Record<string, string>, [opts])
  const ids = useMemo(() => new Set(opts.map((o) => o.id)), [opts])
  const logged = useRef(false)
  useEffect(() => {
    if (!q.shuffle || logged.current) return
    logged.current = true
    log('order', { key: `${q.stores}.order`, order: opts.map((o) => o.id) })
  }, [q, opts, log])

  const [places, setPlacesRaw] = useState<(string | null)[]>(() => readPlaces(p.value, ids, n))
  const [fly, setFly] = useState<Fly | null>(null)
  const [held, setHeld] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [peek, setPeek] = useState(false)
  const slotRefs = useRef<(HTMLElement | null)[]>([])
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const tileRefs = useRef<Record<string, HTMLElement | null>>({})

  const active = places.length === n ? places : Array.from({ length: n }, (_, k) => places[k] ?? null)
  const setPlaces = (next: (string | null)[]) => {
    setPlacesRaw(next)
    p.set(toAnswer(next))
  }
  const placedCount = active.filter((x) => x !== null).length
  const slotOf = (id: string) => active.indexOf(id)
  const nextFree = active.indexOf(null)

  useLayoutEffect(() => {
    if (!fly) return
    const el = fly.kind === 'up' ? slotRefs.current[fly.slot] : tileRefs.current[fly.id]
    const bounce = () => stepRefs.current[fly.slot]?.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(3px)' }, { transform: 'translateY(0)' }],
      { duration: 220, easing: 'ease-out' },
    )
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!el || !fly.from || reduce) {
      if (fly.kind === 'up') { thunk(); if (!reduce) bounce() }
      return
    }
    const to = el.getBoundingClientRect()
    const dx = fly.from.left + fly.from.width / 2 - (to.left + to.width / 2)
    const dy = fly.from.top + fly.from.height / 2 - (to.top + to.height / 2)
    const a = el.animate(
      fly.kind === 'up'
        ? [
            { transform: `translate(${dx}px, ${dy}px) scale(1)`, boxShadow: '0 2px 4px rgba(13,12,11,.10)' },
            { transform: `translate(${dx * 0.35}px, ${dy * 0.5 - 36}px) scale(1.06)`, boxShadow: '0 18px 28px rgba(13,12,11,.18)', offset: 0.55 },
            { transform: 'translate(0, -6px) scale(1.02)', boxShadow: '0 10px 18px rgba(13,12,11,.14)', offset: 0.82 },
            { transform: 'translate(0, 0) scale(1)', boxShadow: '0 2px 4px rgba(13,12,11,.10)' },
          ]
        : [
            { transform: `translate(${dx}px, ${dy}px)`, opacity: 0.6 },
            { transform: 'translate(0, 0)', opacity: 1 },
          ],
      { duration: fly.kind === 'up' ? 560 : 320, easing: 'cubic-bezier(.3,.7,.2,1)' },
    )
    if (fly.kind === 'up') a.onfinish = () => { thunk(); bounce() }
    return () => a.cancel()
  }, [fly])

  const rectOf = (el: HTMLElement | null | undefined) => el?.getBoundingClientRect() ?? null
  const land = (slot: number, id: string, from: DOMRect | null) => setFly((f) => ({ kind: 'up', slot, id, from, n: (f?.n ?? 0) + 1 }))

  const placeAt = (id: string, slot: number, via: 'tap' | 'drag', from: DOMRect | null) => {
    const next = [...active]
    const was = next.indexOf(id)
    const out = next[slot]
    if (was === slot) return
    if (was >= 0) next[was] = out ?? null
    next[slot] = id
    setPlaces(next)
    setHeld(null)
    log(out && was < 0 ? 'swap' : 'place', { item: id, rank: slot + 1, ...(out ? { out } : {}), via })
    land(slot, id, from)
  }
  const takeBack = (id: string, via: 'tap' | 'drag') => {
    const at = slotOf(id)
    if (at < 0) return
    const from = rectOf(slotRefs.current[at])
    setPlaces(active.map((x, k) => (k === at ? null : x)))
    log('remove', { item: id, rank: at + 1, via })
    setFly((f) => ({ kind: 'down', slot: at, id, from: via === 'tap' ? from : null, n: (f?.n ?? 0) + 1 }))
  }

  const refuse = (id: string) => {
    setHeld(id)
    log('refuse', { item: id })
    tileRefs.current[id]?.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }],
      { duration: 260 },
    )
  }

  const tapTile = (id: string) => {
    unlockAudio()
    if (slotOf(id) >= 0) { setHeld(null); takeBack(id, 'tap'); return }
    if (held === id) { setHeld(null); return }
    if (nextFree < 0) { refuse(id); return }
    placeAt(id, nextFree, 'tap', rectOf(tileRefs.current[id]))
  }

  const tapStep = (slot: number) => {
    unlockAudio()
    const id = active[slot]
    if (held && held !== id) { placeAt(held, slot, 'tap', rectOf(tileRefs.current[held])); return }
    if (id) takeBack(id, 'tap')
  }

  const zoneAt = (x: number, y: number): number | 'list' | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const z = el?.closest<HTMLElement>('[data-podium-step]')
    if (z) return Number(z.dataset.podiumStep)
    for (const s of document.querySelectorAll<HTMLElement>('[data-podium-step]')) {
      const r = s.getBoundingClientRect()
      if (x > r.left - SNAP && x < r.right + SNAP && y > r.top - SNAP && y < r.bottom + SNAP) return Number(s.dataset.podiumStep)
    }
    if (el?.closest('[data-podium-list]')) return 'list'
    return null
  }
  const dragHandlers = (id: string, from: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const r = e.currentTarget.getBoundingClientRect()
      setDrag({ id, from, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, w: r.width, moved: false, over: null })
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (!drag || drag.id !== id) return
      const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6
      const z = moved ? zoneAt(e.clientX, e.clientY) : null
      setDrag({ ...drag, x: e.clientX, y: e.clientY, moved, over: typeof z === 'number' ? z : null })
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (!drag || drag.id !== id) return
      const d = drag
      setDrag(null)
      if (!d.moved) { if (d.from >= 0) tapStep(d.from); else tapTile(id); return }
      unlockAudio()
      const z = zoneAt(e.clientX, e.clientY)
      if (typeof z === 'number') placeAt(id, z, 'drag', null)
      else if (z === 'list' && d.from >= 0) takeBack(id, 'drag')
    },
    onPointerCancel: () => setDrag(null),

    onClick: (e: React.MouseEvent) => { if (e.detail === 0) { if (from >= 0) tapStep(from); else tapTile(id) } },
  })

  const order = n === 3 ? [1, 0, 2] : n === 2 ? [1, 0] : [0]
  const stepH = laptop ? [70, 50, 38] : [44, 30, 22]
  const holding = held ?? (drag?.moved ? drag.id : null)
  const missing = p.preview || placedCount >= n ? undefined : placedCount === 0 ? `Pick ${n}` : `Pick ${n - placedCount} more`
  const dragging = drag?.moved ? drag : null

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question}
      instruction={q.instruction} note={q.note} privacy={q.privacy}
      bridge={p.bridge} missing={missing} onNext={p.onNext} onBack={p.onBack}
      tray={
        <div className="relative" data-podium-list>
          <p aria-live="polite"
            className={`${UI} pointer-events-none absolute -top-[21px] left-0 right-0 z-10 text-center text-[13px] leading-[18px] transition-opacity duration-200 lg:-top-[24px] ${held ? 'opacity-100' : 'opacity-0'}`}>
            <span className="rounded-[3px] bg-paper px-2 font-medium text-bronze">{held ? 'Full. Tap one on the podium to swap.' : ''}</span>
          </p>
          <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
            {opts.map((o, i) => {
              const at = slotOf(o.id)
              const on = at >= 0
              const isHeld = held === o.id
              const ghost = peek && i === 0 && !on
              return (
                <button key={o.id} type="button" data-option={o.id} ref={(el) => { tileRefs.current[o.id] = el }}
                  {...dragHandlers(o.id, -1)} aria-pressed={on}
                  aria-label={on ? `${o.label}, placed ${rank(at)}. Tap to take back.` : isHeld ? `${o.label}, held. Tap a tile on the podium to swap.` : o.label}
                  className={`${UI} group relative flex min-h-[40px] touch-none select-none items-center rounded-[4px] border px-2.5 py-1 text-left text-[13px] leading-[16px] transition-[border-color,background-color,color,transform,box-shadow] duration-150 lg:min-h-[48px] lg:px-4 lg:text-[15px] lg:leading-[19px] ${
                    dragging?.id === o.id ? 'opacity-30' : ''} ${
                    on
                      ? 'border-dashed border-rule-soft bg-transparent text-disabled-ink'
                      : isHeld
                        ? '-translate-y-0.5 border-navy bg-ground text-ink shadow-[0_0_0_1px_#14233B,0_6px_16px_rgba(20,35,59,0.22)]'
                        : ghost
                          ? 'border-forest bg-ground text-ink'
                          : 'border-rule bg-ground text-ink shadow-[0_1px_0_#DDD9D2] hover:-translate-y-0.5 hover:border-ink active:translate-y-0'
                  }`}>
                  <span className={on ? 'pr-8 lg:pr-9' : ''}>{o.label}</span>
                  {on && (
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[3px] bg-forest px-1.5 py-0.5 text-[11px] font-semibold text-white lg:right-2 lg:text-[12px]">
                      {rank(at)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      }
    >
      {}
      <div data-q={q.id} className="flex flex-1 flex-col justify-end">
        <div className="mx-auto flex w-full max-w-[340px] items-end justify-center lg:max-w-[580px]">
          {order.map((k) => {
            const id = active[k]
            const isNext = k === nextFree && !holding
            const target = !!holding && id !== holding
            const over = dragging?.over === k
            return (
              <div key={k} data-zone={KEYS[k]} data-podium-step={k} className="flex min-w-0 flex-1 flex-col items-stretch">
                {}
                <div className="px-1 pb-1.5 lg:px-2">
                  {id ? (
                    <button type="button" ref={(el) => { slotRefs.current[k] = el }} data-placed={id}
                      {...dragHandlers(id, k)}
                      aria-label={target ? `${label[id]}, ${rank(k)}. Tap to swap.` : `${label[id]}, ${rank(k)}. Tap to take back.`}
                      className={`${UI} flex h-[52px] w-full touch-none select-none items-center justify-center rounded-[4px] border bg-ground px-1.5 text-center text-[12.5px] font-semibold leading-[15px] text-ink shadow-[0_2px_4px_rgba(13,12,11,.10)] transition-[border-color,box-shadow] lg:h-[60px] lg:px-3 lg:text-[14px] lg:leading-[18px] ${
                        dragging?.id === id ? 'opacity-30' : ''} ${
                        over ? 'border-forest shadow-[0_0_0_2px_rgba(31,75,58,.35)]' : target ? 'border-bronze' : 'border-ink'}`}>
                      {label[id]}
                    </button>
                  ) : (
                    <div aria-hidden
                      className={`${UI} flex h-[52px] w-full items-center justify-center rounded-[4px] border border-dashed text-center text-[12px] leading-[14px] transition-colors lg:h-[60px] lg:text-[13px] ${
                        over || (peek && isNext) ? 'border-forest bg-forest/10 text-forest'
                          : isNext || target ? 'v2p-glow border-forest text-forest' : 'border-rule text-transparent'
                      }`}>
                      {isNext || target || over ? `${rank(k)} goes here` : ''}
                    </div>
                  )}
                </div>
                {}
                <div ref={(el) => { stepRefs.current[k] = el }} className="relative flex items-start justify-center" style={{ height: stepH[k] }}>
                  <div className="absolute inset-0 rounded-t-[3px]"
                    style={{
                      background: 'linear-gradient(180deg, #F3F0EA 0%, #E6E1D7 100%)',
                      boxShadow: 'inset 0 1px 0 #FFFFFF, inset 1px 0 0 #EDE9E2, inset -1px 0 0 #D6D0C4, 0 1px 0 #CFC8BB',
                      borderLeft: k === 0 && n > 1 ? '1px solid #DDD9D2' : undefined,
                      borderRight: k === 0 && n > 1 ? '1px solid #DDD9D2' : undefined,
                    }} />
                  <div className="absolute inset-x-0 top-0 h-[5px] rounded-t-[3px]" style={{ background: 'linear-gradient(180deg,#FFFFFF,#F1EDE6)' }} />
                  <span className={`relative flex flex-col items-center gap-1 font-[family-name:var(--font-text)] font-semibold leading-none text-ink ${
                    laptop ? 'mt-3 text-[22px]' : k === 0 ? 'mt-2 text-[17px]' : 'mt-[7px] text-[15px]'}`}>
                    {rank(k)}
                    {k === 0 && (laptop || n === 1) && <span aria-hidden className="h-[2px] w-5 bg-[#B8862B]" />}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mx-auto h-[5px] w-full max-w-[356px] rounded-[2px] lg:h-[6px] lg:max-w-[610px]" style={{ background: 'linear-gradient(180deg,#D8D2C6,#CBC4B6)' }} />
      </div>

      {}
      {dragging && (
        <div className={`${UI} pointer-events-none fixed z-50 flex min-h-[44px] rotate-[-2deg] items-center justify-center rounded-[4px] border border-ink bg-ground px-3 text-center text-[13px] font-semibold leading-[16px] text-ink shadow-[0_12px_28px_rgba(13,12,11,0.25)] lg:text-[15px]`}
          style={{ left: dragging.x - Math.min(dragging.w, 190) / 2, top: dragging.y - 24, width: Math.min(dragging.w, 190) }}>
          {label[dragging.id]}
        </div>
      )}

      {placedCount === 0 && (
        <GhostDemo family="podium" once mode="tap" label="Tap one"
          target={() => document.querySelector<HTMLElement>('[data-podium-list] [data-option]')}
          onPeek={(on) => setPeek(on)} />
      )}

      <style>{`
        @keyframes v2p-glow { 0%,100% { background-color: rgba(31,75,58,0); } 50% { background-color: rgba(31,75,58,.06); } }
        .v2p-glow { animation: v2p-glow 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .v2p-glow { animation: none; } }
      `}</style>
    </V2Frame>
  )
}
