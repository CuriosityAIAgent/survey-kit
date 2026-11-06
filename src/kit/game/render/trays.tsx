'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import V2Frame from '../V2Frame'
import type { RenderProps } from './contract'
import type { Answer, Option, Question } from '../questions'
import Trays from '../ui/templates/Trays'
import type { Placed, TrayDef, TrayEvent, TrayItem } from '../ui/templates/Trays'
import ActivityIcon, { iconName } from '../ui/templates/ActivityIcon'
import GhostDemo from '../ui/GhostDemo'
import { shuffled } from '../hero/podium/order'
import { useFit } from './checklist'

const UI = 'font-[family-name:var(--font-ui)]'

export default function TraysRender(p: RenderProps) {
  const trays = p.q.constraints.trays
  return trays?.length ? <Sort {...p} /> : <PickTiles {...p} />
}

function useOptions(p: RenderProps): Option[] {
  const { q, seed, log } = p
  const opts = useMemo(() => (q.shuffle ? shuffled(q.options, seed, q.id) : q.options), [q, seed])
  const logged = useRef(false)
  useEffect(() => {
    if (!q.shuffle || logged.current) return
    logged.current = true
    log('order', { key: `${q.stores}.order`, order: opts.map((o) => o.id) })
  }, [q, opts, log])
  return opts
}

const iconFor = (q: Question, o: Option, size?: number) => {
  const n = iconName(q.id, o.id)
  return n ? <ActivityIcon name={n} size={size} /> : undefined
}

function readPlaced(v: Answer | undefined, ids: Set<string>, trays: TrayDef[]): Placed {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Placed = {}
  const count: Record<string, number> = {}
  for (const [k, t] of Object.entries(v as Record<string, unknown>)) {
    const tray = trays.find((x) => x.id === t)
    if (!ids.has(k) || !tray) continue
    count[tray.id] = (count[tray.id] ?? 0) + 1
    if (tray.cap !== undefined && count[tray.id] > tray.cap) continue
    out[k] = tray.id
  }
  return out
}

function Sort(p: RenderProps) {
  const { q } = p
  const opts = useOptions(p)
  const trays: TrayDef[] = useMemo(
    () => (q.constraints.trays ?? []).map((t) => ({ id: t.id, label: t.label, cap: t.capacity })),
    [q],
  )
  const ids = useMemo(() => new Set(opts.map((o) => o.id)), [opts])
  const placed = readPlaced(p.value, ids, trays)
  const items: TrayItem[] = opts.map((o) => ({ id: o.id, label: o.label, sub: o.hint, icon: iconFor(q, o, o.hint ? 20 : 16) }))

  const capTotal = trays.every((t) => t.cap !== undefined) ? trays.reduce((a, t) => a + (t.cap ?? 0), 0) : Infinity
  const need = Math.min(q.constraints.pick ?? q.constraints.min ?? opts.length, capTotal, opts.length)
  const left = need - Object.keys(placed).length
  const missing = p.preview || left <= 0 ? undefined : `Place ${left} more`

  const [peek, setPeek] = useState<string | null>(null)

  const dense = useFit(2, [JSON.stringify(placed)])
  const onEvent = (e: TrayEvent) => {
    const { type, ...data } = e
    p.log(type, data)
  }

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      note={q.note} privacy={q.privacy} bridge={p.bridge} missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <div data-q={q.id} className="flex flex-col">
        <Trays trays={trays} items={items} placed={placed} onChange={(n) => p.set(n)} onEvent={onEvent} peekTray={peek} dense={dense} />
      </div>
      {Object.keys(placed).length === 0 && (
        <GhostDemo family="trays" once mode="drag" label="Drag up"
          target={() => document.querySelector<HTMLElement>(`[data-q="${q.id}"] [data-pool] [data-option]`)}
          to={() => document.querySelector<HTMLElement>(`[data-q="${q.id}"] [data-zone]`)}
          onPeek={(on, carry) => setPeek(on && (carry ?? 0) > 0.5 ? trays[0]?.id ?? null : null)} />
      )}
    </V2Frame>
  )
}

function readPicks(v: Answer | undefined, ids: Set<string>): string[] {
  const list = typeof v === 'string' ? [v] : Array.isArray(v) ? (v as readonly unknown[]) : []
  return list.filter((x): x is string => typeof x === 'string' && ids.has(x))
}

function PickTiles(p: RenderProps) {
  const { q } = p
  const opts = useOptions(p)
  const ids = useMemo(() => new Set(opts.map((o) => o.id)), [opts])
  const need = Math.max(1, Math.min(q.constraints.pick ?? q.constraints.max ?? 1, opts.length || 1))
  const one = need === 1
  const picked = readPicks(p.value, ids).slice(0, need)
  const [refused, setRefused] = useState<{ id: string; n: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const save = (next: string[]) => p.set(one ? (next[0] ?? []) : next)
  const tap = (id: string) => {
    if (one) {
      if (picked[0] === id) { save([]); p.log('remove', { item: id }); return }
      save([id]); p.log('pick', { item: id }); return
    }
    if (picked.includes(id)) { save(picked.filter((x) => x !== id)); p.log('remove', { item: id }); return }
    if (picked.length >= need) {
      window.clearTimeout(timer.current)
      setRefused((r) => ({ id, n: (r?.n ?? 0) + 1 }))
      timer.current = window.setTimeout(() => setRefused(null), 2000)
      p.log('refuse', { item: id })
      return
    }
    save([...picked, id]); p.log('pick', { item: id })
  }

  const left = need - picked.length
  const missing = p.preview || opts.length === 0 || left <= 0 ? undefined : one ? 'Tap one' : picked.length === 0 ? `Pick ${need}` : `Pick ${left} more`

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      note={q.note} privacy={q.privacy} bridge={p.bridge} missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <div data-q={q.id} role={one ? 'radiogroup' : 'group'} aria-label={q.question}
        className="flex flex-col gap-2 lg:gap-2.5">
        {opts.map((o, i) => {
          const on = picked.includes(o.id)
          const no = refused?.id === o.id
          return (
            <button key={o.id} type="button" data-option={o.id} onClick={() => tap(o.id)}
              role={one ? 'radio' : 'checkbox'} aria-checked={on}
              style={{ animationDelay: `${60 + i * 50}ms` }}
              className={`${UI} v2-rise relative flex min-h-[60px] w-full items-center gap-3 rounded-[4px] border px-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 lg:min-h-[68px] lg:px-5 ${
                on ? 'border-forest bg-[#EEF3EF] shadow-[0_0_0_1px_#1F4B3A]'
                  : 'border-rule-soft bg-ground shadow-[0_1px_0_#DDD9D2] hover:-translate-y-0.5 hover:border-rule'}`}>
              <Mark on={on} round={one} />
              <span key={no ? `no-${refused?.n}` : 'ok'} className={`flex-1 ${no ? 'v2-shake' : ''}`}>
                <span className={`block text-[16px] leading-[21px] text-ink lg:text-[17px] ${on ? 'font-semibold' : 'font-medium'}`}>{o.label}</span>
                {o.hint && <span className="mt-0.5 block text-[13px] leading-[17px] text-muted">{o.hint}</span>}
                {no && <span className="mt-0.5 block text-[13px] leading-[17px] text-bronze">Untick one first.</span>}
              </span>
              <span className="shrink-0 text-bronze">{iconFor(q, o, 20)}</span>
            </button>
          )
        })}
      </div>
    </V2Frame>
  )
}

function Mark({ on, round }: { on: boolean; round: boolean }) {
  return (
    <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center border-[1.5px] transition-colors ${round ? 'rounded-full' : 'rounded-[4px]'} ${
      on ? 'border-forest bg-forest' : 'border-rule bg-ground'}`}>
      {on && (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray="1" className="v2tk-draw" />
        </svg>
      )}
      <style>{`@keyframes v2tk-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}.v2tk-draw{animation:v2tk-draw .22s ease-out both}@media (prefers-reduced-motion: reduce){.v2tk-draw{animation:none}}`}</style>
    </span>
  )
}
