'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type TrayDef = { id: string; label: string; cap?: number }
export type TrayItem = { id: string; label: string; sub?: string; icon?: ReactNode }
export type Placed = Record<string, string>

export type TrayEvent =
  | { type: 'place'; item: string; tray: string; from: string | null; via: 'drag' | 'tap' }
  | { type: 'remove'; item: string; from: string; via: 'drag' | 'tap' }
  | { type: 'swap'; item: string; tray: string; out: string; via: 'drag' | 'tap' }
  | { type: 'refuse'; item: string; tray: string }

type Props = {
  trays: TrayDef[]
  items: TrayItem[]
  placed: Placed
  onChange: (p: Placed) => void

  layout?: 'columns' | 'rows'
  onEvent?: (e: TrayEvent) => void

  peekTray?: string | null

  dense?: number
}

type Drag = { id: string; x: number; y: number; w: number; over: string | null; moved: boolean; sx: number; sy: number }

const UI = 'font-[family-name:var(--font-ui)]'
const SNAP = 24

export default function Trays({ trays, items, placed, onChange, onEvent, peekTray, dense = 0 }: Props) {
  const [sel, setSel] = useState<string | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [refused, setRefused] = useState<{ tray: string; n: number } | null>(null)
  const refuseT = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (refuseT.current) clearTimeout(refuseT.current) }, [])

  const inTray = (t: string) => items.filter((i) => placed[i.id] === t)
  const full = (t: TrayDef) => t.cap !== undefined && inTray(t.id).length >= t.cap
  const holding = drag?.moved ? drag.id : sel
  const withSub = items.some((i) => i.sub)

  const poolEls = useRef(new Map<string, HTMLElement>())
  const lastRects = useRef(new Map<string, DOMRect>())
  const placedKey = JSON.stringify(placed)
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const now = new Map<string, DOMRect>()
    for (const [id, el] of poolEls.current) {
      if (!el.isConnected) { poolEls.current.delete(id); continue }
      const r = el.getBoundingClientRect()
      now.set(id, r)
      const was = lastRects.current.get(id)
      if (!was || reduce) continue
      const dx = was.left - r.left, dy = was.top - r.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' })
    }
    lastRects.current = now
  }, [placedKey])

  const refuse = (id: string, t: string) => {
    setRefused((r) => ({ tray: t, n: (r?.n ?? 0) + 1 }))
    if (refuseT.current) clearTimeout(refuseT.current)
    refuseT.current = setTimeout(() => setRefused(null), 2000)
    onEvent?.({ type: 'refuse', item: id, tray: t })
  }
  const dropOnTray = (id: string, t: TrayDef, via: 'drag' | 'tap') => {
    const from = placed[id] ?? null
    if (from === t.id) { setSel(null); return }
    if (full(t)) { refuse(id, t.id); return }
    onChange({ ...placed, [id]: t.id })
    onEvent?.({ type: 'place', item: id, tray: t.id, from, via })
    setSel(null)
  }
  const takeOut = (id: string, via: 'drag' | 'tap') => {
    const from = placed[id]
    if (!from) return
    const n = { ...placed }
    delete n[id]
    onChange(n)
    onEvent?.({ type: 'remove', item: id, from, via })
  }

  const dropOnTile = (id: string, target: string, via: 'drag' | 'tap') => {
    if (id === target) return
    const t = placed[target]
    const tray = trays.find((x) => x.id === t)
    if (!tray) return
    if (!full(tray) || placed[id] === t) { dropOnTray(id, tray, via); return }
    const n = { ...placed }
    const from = placed[id]
    n[id] = t
    if (from) n[target] = from
    else delete n[target]
    onChange(n)
    onEvent?.({ type: 'swap', item: id, tray: t, out: target, via })
    setSel(null)
  }

  const tapTile = (id: string) => {
    if (sel && sel !== id && placed[id]) { dropOnTile(sel, id, 'tap'); return }
    if (placed[id] && !sel) { takeOut(id, 'tap'); return }
    setSel(sel === id ? null : id)
  }
  const tapTray = (t: TrayDef) => { if (sel) dropOnTray(sel, t, 'tap') }

  const hit = (x: number, y: number): { tile: string | null; tray: string | null } => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const tile = el?.closest('[data-tile-placed]') as HTMLElement | null
    if (tile) return { tile: tile.dataset.tilePlaced!, tray: tile.dataset.inTray ?? null }
    const tray = el?.closest('[data-tray-id]') as HTMLElement | null
    if (tray) return { tile: null, tray: tray.dataset.trayId! }
    for (const t of document.querySelectorAll<HTMLElement>('[data-tray-id]')) {
      const r = t.getBoundingClientRect()
      if (x > r.left - SNAP && x < r.right + SNAP && y > r.top - SNAP && y < r.bottom + SNAP) return { tile: null, tray: t.dataset.trayId! }
    }
    if (el?.closest('[data-pool]')) return { tile: null, tray: 'pool' }
    return { tile: null, tray: null }
  }
  const onDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDrag({ id, x: e.clientX, y: e.clientY, w: r.width, over: null, moved: false, sx: e.clientX, sy: e.clientY })
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6
    const h = moved ? hit(e.clientX, e.clientY) : null
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved, over: h?.tray ?? null })
  }
  const onUp = (e: { clientX: number; clientY: number }, cancelled = false) => {
    if (!drag) return
    const d = drag
    setDrag(null)
    if (!d.moved) { if (!cancelled) tapTile(d.id); return }
    if (cancelled) return
    const h = hit(e.clientX, e.clientY)
    if (h.tile && h.tile !== d.id) { dropOnTile(d.id, h.tile, 'drag'); return }
    if (h.tray === 'pool') { takeOut(d.id, 'drag'); setSel(null); return }
    const t = trays.find((x) => x.id === h.tray)
    if (t) dropOnTray(d.id, t, 'drag')
  }
  const dragItem = drag?.moved ? items.find((i) => i.id === drag.id) : null

  const tileProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent) => onDown(e, id),
    onPointerMove: onMove,
    onPointerUp: (e: React.PointerEvent) => onUp(e),
    onPointerCancel: () => { if (drag) onUp({ clientX: drag.x, clientY: drag.y }, true) },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapTile(id) } },
  })

  const pool = items.filter((i) => !placed[i.id])

  return (
    <div className="flex flex-col">
      <style>{`
        @keyframes v2tt-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-2px)} 40%{transform:translateX(2px)} 60%{transform:translateX(-2px)} 80%{transform:translateX(2px)} }
        .v2tt-shake { animation: v2tt-shake .3s ease-in-out 1; }
        @keyframes v2tt-in { from{transform:scale(.9);opacity:.3} to{transform:scale(1);opacity:1} }
        .v2tt-in { animation: v2tt-in .18s ease-out 1; }
        @keyframes v2tt-note { from{opacity:0} to{opacity:1} }
        .v2tt-note { animation: v2tt-note .15s ease-out 1; }
        @media (prefers-reduced-motion: reduce){ .v2tt-shake,.v2tt-in,.v2tt-note{animation:none!important} }
      `}</style>

      {}
      <div className="grid gap-x-2 gap-y-0 lg:gap-x-3"
        style={{ gridTemplateColumns: `repeat(${trays.length}, minmax(0, 1fr))`, gridTemplateRows: 'auto 1fr' }}>
        {trays.map((t) => {
          const got = inTray(t.id)
          const isFull = full(t)
          const target = (!!holding && placed[holding] !== t.id) || peekTray === t.id
          const over = (drag?.moved && drag.over === t.id) || peekTray === t.id
          const showFull = isFull && refused?.tray === t.id
          return (
            <div key={t.id} data-tray-id={t.id} data-zone={t.id} role="group"
              aria-label={`${t.label}${t.cap !== undefined ? `, ${isFull ? 'full' : `${t.cap - got.length} left`}` : ''}`}
              onClick={() => tapTray(t)}
              className={`relative row-span-2 grid rounded-[6px] border-2 px-1 pb-1 pt-1 transition-colors lg:px-2 lg:pb-2 lg:pt-1.5 ${
                over && !isFull ? 'border-forest bg-[#EEF3EF]' : target && !isFull ? 'border-forest/55 bg-ground' : 'border-rule-soft bg-ground'} ${
                !isFull && target ? 'cursor-pointer' : ''}`}
              style={{ gridTemplateRows: 'subgrid' }}>
              <div className="relative flex flex-col justify-start px-0.5 pb-1 lg:flex-row lg:items-start lg:justify-between lg:gap-2 lg:pb-1.5">
                <span className={`${UI} text-[14px] font-semibold leading-[17px] text-ink lg:text-[15px] lg:leading-[19px]`}>{t.label}</span>
                {t.cap !== undefined && (
                  <span className={`${UI} mt-0.5 shrink-0 whitespace-nowrap text-[12px] leading-[15px] tabular-nums lg:text-[13px] ${isFull ? 'font-semibold text-forest' : 'text-muted'}`}>
                    {isFull ? 'Full' : `${t.cap - got.length} left`}
                  </span>
                )}
              </div>
              {}
              {showFull && (
                <span key={refused?.n ?? 0} role="status"
                  className={`${UI} v2tt-note v2tt-shake pointer-events-none absolute inset-x-1 top-[calc(100%-16px)] z-20 rounded-[3px] border border-rule bg-paper px-1.5 py-1 text-center text-[12px] font-medium leading-[14px] text-ink shadow-[0_4px_12px_rgba(13,12,11,0.10)] lg:inset-x-2 lg:text-[13px] lg:leading-[16px]`}>
                  Full. Tap one to swap
                </span>
              )}
              <div className="relative flex flex-col gap-[3px] lg:gap-1">
                {got.map((i) => (
                  <Tile key={i.id} item={i} compact placed trayId={t.id} selected={sel === i.id}
                    lifting={drag?.moved === true && drag.id === i.id}
                    swapTarget={!!sel && sel !== i.id && isFull} {...tileProps(i.id)} />
                ))}
                {t.cap !== undefined
                  ? Array.from({ length: Math.max(0, t.cap - got.length) }).map((_, k) => (
                      <div key={k} aria-hidden className={`h-[30px] rounded-[4px] border border-dashed lg:h-10 ${target && !isFull ? 'border-forest/50' : 'border-rule'}`} />
                    ))
                  : (
                      <div aria-hidden className={`flex h-[30px] items-center justify-center rounded-[4px] border border-dashed lg:h-10 ${target ? 'border-forest/50' : 'border-rule'}`}>
                        <span className="text-[16px] leading-none text-rule">+</span>
                      </div>
                    )}
              </div>
            </div>
          )
        })}
      </div>

      {}
      <div data-pool onClick={() => setSel(null)}
        className={`grid lg:mt-5 lg:gap-2 ${dense >= 2 ? 'mt-2 gap-1' : 'mt-2.5 gap-1.5'} ${withSub ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-3 lg:grid-cols-4'}`}>
        {pool.map((i) => (
          <Tile key={i.id} item={i} dense={dense} selected={sel === i.id} lifting={drag?.moved === true && drag.id === i.id}
            elRef={(el) => { if (el) poolEls.current.set(i.id, el); else poolEls.current.delete(i.id) }} {...tileProps(i.id)} />
        ))}
      </div>

      {}
      {dragItem && drag && (
        <div className="pointer-events-none fixed z-50" style={{ left: drag.x - Math.min(drag.w, 200) / 2, top: drag.y - 26, width: Math.min(drag.w, 200) }}>
          <Tile item={dragItem} ghost />
        </div>
      )}
    </div>
  )
}

type TileProps = {
  item: TrayItem; compact?: boolean; placed?: boolean; trayId?: string; selected?: boolean; lifting?: boolean; ghost?: boolean; swapTarget?: boolean
  elRef?: (el: HTMLDivElement | null) => void
  dense?: number
} & Partial<Pick<React.HTMLAttributes<HTMLDivElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onKeyDown'>>

function Tile({ item, compact, placed, trayId, selected, lifting, ghost, swapTarget, elRef, dense = 0, ...h }: TileProps) {
  return (
    <div ref={elRef} role={ghost ? undefined : 'button'} tabIndex={ghost ? undefined : 0}
      aria-pressed={ghost ? undefined : !!selected}
      aria-label={ghost ? undefined : `${item.label}${item.sub ? `: ${item.sub}` : ''}${placed ? '. Placed. Tap to take it out.' : ''}`}
      data-option={ghost ? undefined : item.id}
      data-tile-placed={placed ? item.id : undefined} data-in-tray={trayId}
      onClick={(e) => e.stopPropagation()}
      {...h}
      className={`${UI} group relative flex touch-none select-none gap-1.5 rounded-[4px] border bg-ground text-left transition-[transform,box-shadow,border-color,opacity] duration-150 ${
        compact ? 'min-h-[30px] items-center px-[5px] py-[3px] lg:min-h-10 lg:px-2.5 lg:py-1'
          : item.sub ? `${dense >= 2 ? 'min-h-[38px] py-1' : 'min-h-[42px] py-1.5'} items-start px-2 lg:min-h-[64px] lg:gap-2.5 lg:px-3 lg:py-2.5`
          : `${dense >= 2 ? 'min-h-[34px] py-0.5' : 'min-h-[40px] py-1'} items-center px-1.5 lg:min-h-[52px] lg:gap-2 lg:px-3`} ${
        ghost ? 'rotate-[-2deg] border-ink shadow-[0_12px_28px_rgba(13,12,11,0.25)]'
          : selected ? '-translate-y-0.5 border-navy shadow-[0_0_0_1px_#14233B,0_6px_16px_rgba(20,35,59,0.22)]'
          : swapTarget ? 'cursor-pointer border-bronze/70 hover:border-bronze'
          : placed ? 'cursor-grab border-forest/35 bg-[#F7FAF8] hover:border-forest/60'
          : 'cursor-grab border-rule-soft shadow-[0_1px_0_#DDD9D2] hover:-translate-y-0.5 hover:border-rule'} ${lifting ? 'opacity-30' : ''} ${placed && !ghost ? 'v2tt-in' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-ink ${compact ? 'text-[12px] leading-[14px] tracking-[-0.01em] lg:tracking-normal lg:text-[13px] lg:leading-[16px]' : 'text-[12.5px] leading-[15px] lg:text-[15px] lg:leading-[19px]'}`}>{item.label}</p>
        {item.sub && !compact && <p className="mt-0.5 text-[11.5px] leading-[14px] text-muted lg:mt-1 lg:text-[13px] lg:leading-[17px]">{item.sub}</p>}
      </div>
      {item.icon && <span className={`shrink-0 text-bronze ${compact || dense >= 1 ? 'hidden lg:block' : item.sub ? 'mt-px' : ''}`}>{item.icon}</span>}
    </div>
  )
}
