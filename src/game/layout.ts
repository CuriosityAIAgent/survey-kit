'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

export type Layout = 'phone' | 'desk' | 'deskCompact'
export const LAYOUTS: Layout[] = ['phone', 'desk', 'deskCompact']

export const DESK_MIN = { w: 1360, h: 700 }
export const COMPACT_MIN = { w: 1024, h: 560 }
export const MIN_RATIO = 1.3

export const SETTLE_MS = 400

export function layoutFor(w: number, h: number): Layout {
  if (!(w > 0 && h > 0)) return 'phone'
  const wide = w / h >= MIN_RATIO
  if (wide && w >= DESK_MIN.w && h >= DESK_MIN.h) return 'desk'
  if (wide && w >= COMPACT_MIN.w && h >= COMPACT_MIN.h) return 'deskCompact'
  return 'phone'
}

export function layoutOverride(search: string): Layout | null {
  const v = new URLSearchParams(search).get('layout')
  return v && (LAYOUTS as string[]).includes(v) ? (v as Layout) : null
}

export const isDeskLayout = (l: Layout) => l !== 'phone'

export type LayoutInfo = {
  layout: Layout

  desk: boolean
  compact: boolean

  fine: boolean

  w: number
  h: number
}

const PHONE: LayoutInfo = { layout: 'phone', desk: false, compact: false, fine: false, w: 390, h: 660 }

export const LayoutContext = createContext<LayoutInfo>(PHONE)

export function useLayout(): Layout {
  return useContext(LayoutContext).layout
}
export function useLayoutInfo(): LayoutInfo {
  return useContext(LayoutContext)
}

export function infoFor(layout: Layout, fine: boolean, w: number, h: number): LayoutInfo {
  return { layout, desk: layout !== 'phone', compact: layout === 'deskCompact', fine, w, h }
}

const finePointer = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches

let down = 0
let tracking = false
function trackPointers() {
  if (tracking || typeof window === 'undefined') return
  tracking = true
  const on = () => { down++ }
  const off = () => { down = Math.max(0, down - 1) }
  window.addEventListener('pointerdown', on, true)
  window.addEventListener('pointerup', off, true)
  window.addEventListener('pointercancel', off, true)
  window.addEventListener('blur', () => { down = 0 })
}

export function gestureInProgress(): boolean {
  if (down > 0) return true
  return typeof document !== 'undefined' && !!document.querySelector('[data-lifted="true"]')
}

export function useLayoutController(stepKey: string, onCommit?: (info: LayoutInfo) => void): LayoutInfo {
  const [info, setInfo] = useState<LayoutInfo>(() => {
    if (typeof window === 'undefined') return PHONE
    const w = window.innerWidth, h = window.innerHeight
    return infoFor(layoutOverride(window.location.search) ?? layoutFor(w, h), finePointer(), w, h)
  })
  const cur = useRef(info)
  cur.current = info
  const cb = useRef(onCommit)
  cb.current = onCommit

  const commit = useRef(() => {})
  commit.current = () => {
    const w = window.innerWidth, h = window.innerHeight
    const next = layoutOverride(window.location.search) ?? layoutFor(w, h)
    const fine = finePointer()
    const c = cur.current
    if (next === c.layout && fine === c.fine) {
      if (w !== c.w || h !== c.h) setInfo(infoFor(next, fine, w, h))
      return
    }
    const i = infoFor(next, fine, w, h)
    cur.current = i
    setInfo(i)
    cb.current?.(i)
  }

  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    commit.current()
  }, [stepKey])

  useEffect(() => {
    trackPointers()
    let t: number | null = null
    const settle = () => {
      if (t) clearTimeout(t)
      t = window.setTimeout(function tryCommit() {

        if (gestureInProgress()) { t = window.setTimeout(tryCommit, 250); return }
        t = null
        commit.current()
      }, SETTLE_MS)
    }
    window.addEventListener('resize', settle)
    const mq = window.matchMedia?.('(hover: hover) and (pointer: fine)')
    mq?.addEventListener?.('change', settle)
    return () => {
      window.removeEventListener('resize', settle)
      mq?.removeEventListener?.('change', settle)
      if (t) clearTimeout(t)
    }
  }, [])

  return info
}
