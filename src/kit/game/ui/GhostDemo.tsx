'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Target = () => HTMLElement | null | undefined

export type GhostDemoProps = {
  target: Target
  to?: Target
  mode?: 'tap' | 'drag'
  label?: string
  family?: string
  once?: boolean
  delay?: number
  onPeek?: (on: boolean, carry?: number) => void
}

const played = new Set<string>()
const DURATION = 1500

export default function GhostDemo({ target, to, mode = 'tap', label, family, once = false, delay = 400, onPeek }: GhostDemoProps) {
  const hand = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [live, setLive] = useState(true)
  const [still, setStill] = useState<{ x: number; y: number } | null>(null)
  const [touch, setTouch] = useState(true)
  const peek = useRef(onPeek)
  useEffect(() => { peek.current = onPeek })

  useEffect(() => {
    if (once && family && played.has(family)) { setLive(false); return }
    setMounted(true)
    setTouch(window.matchMedia('(pointer: coarse)').matches)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let timer = 0
    let pressed = false
    let done = false

    const finish = () => {
      if (done) return
      done = true
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
      if (pressed) peek.current?.(false)
      setLive(false)
      setStill(null)
      if (family) played.add(family)
    }
    const cancel = () => finish()
    const opts = { capture: true, passive: true } as const
    window.addEventListener('pointerdown', cancel, opts)
    window.addEventListener('keydown', cancel, opts)
    window.addEventListener('wheel', cancel, opts)
    window.addEventListener('touchstart', cancel, opts)
    const scrollY = window.scrollY
    const onScroll = () => { if (Math.abs(window.scrollY - scrollY) > 8) finish() }
    window.addEventListener('scroll', onScroll, opts)

    timer = window.setTimeout(() => {
      const el = target()
      if (!el) return finish()
      const r = el.getBoundingClientRect()

      const ax = r.width > 240 ? r.left + Math.min(40, r.width * 0.12) : r.left + r.width / 2
      const ay = r.top + r.height / 2
      if (reduced) {
        setStill({ x: ax, y: ay })
        timer = window.setTimeout(finish, 3000)
        return
      }
      const dest = to?.()?.getBoundingClientRect()
      const bx = dest ? dest.left + dest.width / 2 : ax
      const by = dest ? dest.top + dest.height / 2 : ay
      const t0 = performance.now()
      const ease = (u: number) => 1 - Math.pow(1 - u, 3)
      const spring = (u: number) => 1 - Math.exp(-6 * u) * Math.cos(9 * u)

      const frame = (now: number) => {
        const t = (now - t0) / DURATION
        const h = hand.current
        const g = ring.current
        if (!h || !g) { raf = requestAnimationFrame(frame); return }
        let x = ax, y = ay, s = 1, o = 0.9, ro = 0, rs = 0.4
        if (mode === 'tap') {
          if (t < 0.36) { const u = ease(t / 0.36); x = ax + 70 * (1 - u); y = ay + 90 * (1 - u); o = 0.9 * Math.min(1, t / 0.15) }
          else if (t < 0.5) { s = 1 - 0.12 * ((t - 0.36) / 0.14); if (!pressed) { pressed = true; peek.current?.(true) } }
          else if (t < 0.74) { s = 0.88 + 0.12 * ((t - 0.5) / 0.24); const u = (t - 0.5) / 0.24; ro = 0.5 * (1 - u); rs = 0.4 + 0.9 * u }
          else { const u = (t - 0.74) / 0.26; x = ax + 30 * u; y = ay + 36 * u; o = 0.9 * (1 - u) }
        } else {
          const cx = ax + (bx - ax) * 0.6, cy = ay + (by - ay) * 0.6
          if (t < 0.2) { o = 0.9 * (t / 0.2); s = 1 - 0.12 * (t / 0.2) }
          else if (t < 0.62) { s = 0.88; const u = ease((t - 0.2) / 0.42); x = ax + (cx - ax) * u; y = ay + (cy - ay) * u; if (!pressed) { pressed = true }; peek.current?.(true, u) }
          else if (t < 0.9) { const u = spring((t - 0.62) / 0.28); x = cx + (ax - cx) * u; y = cy + (ay - cy) * u; s = 0.88 + 0.12 * Math.min(1, u); peek.current?.(true, 1 - Math.min(1, u)) }
          else { o = 0.9 * (1 - (t - 0.9) / 0.1) }
        }
        h.style.transform = `translate(${x}px, ${y}px) scale(${s})`
        h.style.opacity = String(Math.max(0, o))
        g.style.transform = `translate(${ax}px, ${ay}px) translate(-50%, -50%) scale(${rs})`
        g.style.opacity = String(ro)
        if (t >= 1) return finish()
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }, delay)

    return () => {
      done = true
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
      window.removeEventListener('pointerdown', cancel, opts)
      window.removeEventListener('keydown', cancel, opts)
      window.removeEventListener('wheel', cancel, opts)
      window.removeEventListener('touchstart', cancel, opts)
      window.removeEventListener('scroll', onScroll, opts)
    }

  }, [])

  if (!mounted || !live) return null
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]" data-ghost>
      {still ? (
        <div className="absolute flex items-center gap-2" style={{ left: still.x + 18, top: still.y - 44 }}>
          <svg width="46" height="40" viewBox="0 0 46 40" fill="none">
            <path d="M44 2 C30 4 14 14 6 34" stroke="#7A3E12" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
            <path d="M2 28 L6 36 L13 30" stroke="#7A3E12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="rounded-[3px] bg-paper px-2 py-1 font-[family-name:var(--font-ui)] text-[13px] font-semibold text-bronze shadow-sm">{label ?? (mode === 'drag' ? 'Drag it' : 'Tap one')}</span>
        </div>
      ) : (
        <>
          <div ref={ring} className="absolute left-0 top-0 h-14 w-14 rounded-full border-2 border-ink/40" style={{ opacity: 0 }} />
          <div ref={hand} className="absolute left-0 top-0 origin-top-left" style={{ opacity: 0 }}>
            {touch ? <Hand /> : <Pointer />}
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}

function Hand() {
  return (
    <svg width="44" height="54" viewBox="0 0 44 54" style={{ transform: 'translate(-11px, -3px)', filter: 'drop-shadow(0 6px 10px rgba(13,12,11,0.22))' }}>
      <path d="M11 4.5c0-2.2 1.8-4 4-4s4 1.8 4 4v16.2l1.3-.6c2-.9 4.3.1 5.1 2.1l.2.5 1.1-.4c2-.7 4.2.3 5 2.3l.3.8.8-.3c2-.6 4.1.5 4.7 2.5l.8 2.7c1.3 4.4.9 9.2-1.2 13.3L35.6 49c-1.8 3.3-5.3 5-9 5h-5.7c-3.3 0-6.4-1.6-8.3-4.3L3 36.3c-1.3-1.8-.9-4.3.9-5.6 1.7-1.3 4.1-1 5.5.6L11 33V4.5z"
        fill="#F8F7F4" fillOpacity="0.92" stroke="#0D0C0B" strokeOpacity="0.75" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M19 21v9M26 23v7M33 26v5" stroke="#0D0C0B" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function Pointer() {
  return (
    <svg width="26" height="34" viewBox="0 0 26 34" style={{ filter: 'drop-shadow(0 4px 8px rgba(13,12,11,0.25))' }}>
      <path d="M1.5 1.5 L1.5 26 L8 20 L12.5 31 L17 29 L12.5 18.5 L21.5 18.5 Z" fill="#0D0C0B" fillOpacity="0.78" stroke="#F8F7F4" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
