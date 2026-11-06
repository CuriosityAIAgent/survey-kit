'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import V2Frame from '../V2Frame'
import type { RenderProps } from './contract'
import type { Answer, Option } from '../questions'
import BottleArt, { BOTTLE_CSS, SPOUT, VB_W, type Layer, type Pour } from '../hero/bottle/BottleArt'
import JugArt, { SPOUT_ORIGIN } from '../hero/bottle/JugArt'
import { looksFor, type JugLook } from '../hero/bottle/jugs'
import { playCap, playPour } from '../hero/bottle/sound'
import { useSound } from '../hero/soundPref'
import { seededShuffle } from '../hero/bottle/shuffle'

type Ghost = { id: number; jug: string; left: number; top: number; size: number; tx: number; ty: number; k: number }

const POUR_MS = 1150
const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'

function readCounts(v: Answer | undefined, ids: string[], total: number): Record<string, number> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const rec = v as Readonly<Record<string, string | number>>
  const out: Record<string, number> = {}
  let sum = 0
  for (const id of ids) {
    const n = rec[id]
    const h = typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : 0
    out[id] = h
    sum += h
  }
  return sum <= total ? out : null
}

export default function BottleRender(p: RenderProps) {
  const { q, set, log, seed } = p
  const total = Math.max(1, q.constraints.total ?? 8)

  const jugs: Option[] = useMemo(
    () => (q.shuffle ? seededShuffle(q.options, seed, q.id) : q.options),
    [q.options, q.shuffle, q.id, seed],
  )
  const looks = useMemo(() => looksFor(jugs), [jugs])

  const logged = useRef('')
  useEffect(() => {
    if (!q.shuffle || logged.current === q.id) return
    logged.current = q.id
    log('order', { key: `${q.stores}.order`, order: jugs.map((j) => j.id) })
  }, [q.shuffle, q.id, q.stores, jugs, log])

  const seq = useRef(0)
  const [layers, setLayers] = useState<Layer[]>(() => {
    const c = readCounts(p.value, jugs.map((j) => j.id), total)
    if (!c) return []
    return jugs.flatMap((j) => Array.from({ length: c[j.id] }, () => ({ id: ++seq.current, jug: j.id, fresh: false })))
  })
  const [pour, setPour] = useState<Pour | null>(null)
  const [kind, setKind] = useState<'pour' | 'back'>('pour')
  const [ghosts, setGhosts] = useState<Ghost[]>([])
  const [sound] = useSound()
  const [touched, setTouched] = useState(layers.length > 0)
  const shakeRef = useRef<HTMLDivElement>(null)
  const bottleRef = useRef<SVGSVGElement>(null)
  const jugRefs = useRef<Record<string, HTMLSpanElement | null>>({})

  const level = layers.length
  const left = total - level
  const full = left === 0
  const count = (id: string) => layers.reduce((n, l) => n + (l.jug === id ? 1 : 0), 0)

  const save = useCallback((next: Layer[]) => {
    const out: Record<string, number> = {}
    for (const j of jugs) out[j.id] = 0
    for (const l of next) out[l.jug] = (out[l.jug] ?? 0) + 1
    set(out)
  }, [jugs, set])

  const pourInto = (id: string) => {
    setTouched(true)
    if (layers.length >= total) {
      shakeRef.current?.animate(
        [0, -4, 4, -3, 3, 0].map((x) => ({ transform: `translateX(${x}px) rotate(${x * 0.4}deg)` })),
        { duration: 360, easing: 'ease-out' })
      return
    }
    const n = ++seq.current
    const from = layers.length
    const next = [...layers, { id: n, jug: id, fresh: true }]
    setKind('pour')
    setLayers(next)
    setPour({ id: n, jug: id, from })
    save(next)
    log('pour', { jug: id, level: from + 1 })
    if (sound) {
      playPour(from)
      if (from + 1 === total) playCap()
    }

    const svg = bottleRef.current, src = jugRefs.current[id]
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!svg || !src || reduce) return
    const b = svg.getBoundingClientRect(), s = src.getBoundingClientRect()
    const scale = b.width / VB_W
    const size = Math.round(64 * scale)
    const px = b.left + SPOUT.x * scale, py = b.top + SPOUT.y * scale
    const ox = 0.9375 * size, oy = 0.133 * size
    const gl = px - ox, gt = py - oy
    const k = s.width / size
    const cx = gl + size / 2, cy = gt + size / 2
    const tx = s.left + s.width / 2 - px - k * (cx - px)
    const ty = s.top + s.height / 2 - py - k * (cy - py)
    setGhosts((g) => [...g.filter((x) => x.jug !== id), { id: n, jug: id, left: gl, top: gt, size, tx, ty, k }])
  }

  const takeBack = (id: string) => {
    const i = layers.map((l) => l.jug).lastIndexOf(id)
    if (i < 0) return
    const next = layers.filter((_, k) => k !== i)
    setKind('back')
    setPour(null)
    setLayers(next)
    save(next)
    log('back', { jug: id, level: next.length })
  }

  const missing = p.preview || full ? undefined : left === total ? `Pour ${total} hours` : `Pour ${left} more`

  const counter = q.objectText?.counter ?? `{left} of ${total} hours left`
  const rest = counter.replace('{left}', '').trim()

  const cols = Math.min(jugs.length, 5)
  const tray = (
    <div className="grid gap-1.5 lg:gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} data-jugs>
      {jugs.map((j, i) => (
        <JugTile key={j.id} jug={looks[j.id]} n={count(j.id)} full={full} hint={!touched && !level ? i : -1}
          lifted={ghosts.some((g) => g.jug === j.id)}
          iconRef={(el) => { jugRefs.current[j.id] = el }}
          onPour={() => pourInto(j.id)} onBack={() => takeBack(j.id)} />
      ))}
    </div>
  )

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy}
      missing={missing} onNext={p.onNext} onBack={p.onBack} tray={tray}>
      <style>{BOTTLE_CSS}</style>
      <div className="flex flex-1 items-center justify-center gap-5 lg:gap-10 lg:pt-2" data-q={q.id} data-bottle>
        <div className="hidden w-[190px] shrink-0 lg:block" aria-hidden />
        <div ref={shakeRef}>
          {}
          <BottleArt ref={bottleRef} layers={layers} pour={pour} kind={kind} total={total} looks={looks}
            className="block h-[150px] w-auto shrink-0 lg:h-[222px]" />
        </div>
        <div className="flex w-[124px] shrink-0 flex-col justify-end self-stretch pb-2 lg:w-[190px] lg:pb-6">
          <div aria-live="polite" data-readout>
            {full ? (
              <div className="bt-done">
                <p className={`${TEXT} text-[30px] font-semibold leading-[34px] text-forest lg:text-[36px] lg:leading-[40px]`}>Full</p>
                <p className={`${UI} mt-1 text-[14px] leading-[19px] text-muted lg:text-[15px]`}>All {total} hours poured</p>
                <p className={`${UI} mt-1 text-[13px] leading-[18px] text-muted`}>
                  Use <MinusIcon className="inline h-[15px] w-[15px] -translate-y-px align-middle" /><span className="sr-only">minus</span> on a jug to move an hour.
                </p>
              </div>
            ) : (
              <>
                <p className={`${TEXT} text-[44px] font-semibold leading-[44px] text-ink tabular-nums lg:text-[56px] lg:leading-[56px]`}>
                  <span key={left} className="bt-pop">{left}</span>
                </p>
                <p className={`${UI} mt-1 text-[14px] leading-[19px] text-muted lg:text-[15px]`}>{rest}</p>
              </>
            )}
          </div>
        </div>
      </div>
      {}
      <div className="pointer-events-none fixed inset-0 z-40" aria-hidden>
        {ghosts.map((g) => (
          <GhostJug key={g.id} g={g} look={looks[g.jug]} onDone={() => setGhosts((all) => all.filter((x) => x.id !== g.id))} />
        ))}
      </div>
    </V2Frame>
  )
}

function JugTile({ jug, n, full, hint, lifted, iconRef, onPour, onBack }: {
  jug: JugLook; n: number; full: boolean; hint: number; lifted: boolean
  iconRef: (el: HTMLSpanElement | null) => void
  onPour: () => void; onBack: () => void
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[4px] border bg-white transition-colors"
      style={{ borderColor: n ? jug.color : '#DDD9D2', boxShadow: n ? `inset 0 3px 0 ${jug.color}` : 'inset 0 3px 0 #DDD9D2' }}>
      <button type="button" onClick={onPour} aria-disabled={full} data-jug={jug.id} data-option={jug.id}
        aria-label={full ? `${jug.label}: ${n} hours. The bottle is full.` : `Pour 1 hour into ${jug.label}. ${n} so far.`}
        className={`group flex flex-1 flex-col items-center px-0.5 pt-2 pb-1 transition-transform active:translate-y-[1px] ${full ? 'cursor-default' : ''}`}>
        <span ref={iconRef} className={`block h-10 w-10 transition-[opacity,transform] duration-200 lg:h-14 lg:w-14 ${full ? '' : 'group-hover:-translate-y-0.5 group-hover:-rotate-3'}`}
          style={{ opacity: lifted ? 0.18 : 1 }}>
          <span className={`block h-full w-full ${hint >= 0 ? 'bt-hint' : ''}`} style={hint >= 0 ? { animationDelay: `${700 + hint * 110}ms` } : undefined}>
            <JugArt jug={jug} className="h-full w-full" />
          </span>
        </span>
        <span className={`${UI} mt-1 flex min-h-[28px] items-start justify-center text-center text-[11px] font-semibold leading-[13px] tracking-[-0.015em] text-ink lg:min-h-[36px] lg:text-[15px] lg:leading-[18px]`}>
          {jug.label}
        </span>
      </button>
      <div className="flex h-9 items-center justify-between border-t border-[#EAE7E1] lg:h-11">
        <span className={`${UI} whitespace-nowrap pl-1.5 text-[14px] font-semibold tabular-nums lg:pl-3 lg:text-[16px]`}
          style={{ color: n ? jug.dark : '#6B6761' }}>
          <span key={n} className={n ? 'bt-pop' : undefined}>{n}</span> h
        </span>
        <button type="button" onClick={onBack} disabled={!n} aria-label={`Take 1 hour back from ${jug.label}`} data-jug-back={jug.id}
          className="flex h-full w-8 shrink-0 items-center justify-center text-ink transition-opacity disabled:opacity-0 lg:w-11">
          <MinusIcon className="h-[22px] w-[22px]" />
        </button>
      </div>
    </div>
  )
}

function GhostJug({ g, look, onDone }: { g: Ghost; look: JugLook; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const T = (x: number, y: number, s: number, r: number) => `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`
    const a = el.animate([
      { offset: 0, transform: T(g.tx, g.ty, g.k, 0), opacity: 1, easing: 'cubic-bezier(.35,0,.2,1)' },
      { offset: 0.34, transform: T(0, 0, 1, -6), opacity: 1, easing: 'cubic-bezier(.45,0,.25,1)' },
      { offset: 0.48, transform: T(0, 0, 1, 66), opacity: 1 },
      { offset: 0.79, transform: T(0, 0, 1, 70), opacity: 1, easing: 'cubic-bezier(.45,0,.3,1)' },
      { offset: 0.9, transform: T(0, -4, 1, 0), opacity: 1 },
      { offset: 1, transform: T(0, -10, 1, 0), opacity: 0 },
    ], { duration: POUR_MS, fill: 'both' })
    a.onfinish = () => done.current()
    return () => a.cancel()
  }, [g])
  return (
    <div ref={ref} className="absolute" style={{ left: g.left, top: g.top, width: g.size, height: g.size, transformOrigin: SPOUT_ORIGIN }}>
      <JugArt jug={look} className="h-full w-full drop-shadow-[0_6px_8px_rgba(13,12,11,0.18)]" />
    </div>
  )
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" className={className} aria-hidden>
      <circle cx="11" cy="11" r="10" fill="none" stroke="#8C857A" strokeWidth="1" />
      <path d="M6.5 11 H15.5" stroke="#0D0C0B" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
