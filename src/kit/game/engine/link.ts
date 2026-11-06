import type { StateStorage } from 'zustand/middleware'
import { isDeskLayout, layoutFor, layoutOverride } from '@/game/layout'
import type { Channel } from '../questions'

// an optional group from the link (?business=a), asked on the welcome if the survey wants it; unused in the sample
export type Business = 'a' | 'b' | 'c'
export type Token = { business?: Business; cohort?: string; code?: string }

export const BUSINESSES: { id: Business; label: string }[] = [
  { id: 'a', label: 'Group A' },
  { id: 'b', label: 'Group B' },
  { id: 'c', label: 'Group C' },
]
export const COHORTS = ['2022', '2023', '2024', '2025'] as const

export const isBusiness = (v: unknown): v is Business => v === 'a' || v === 'b' || v === 'c'
export const isCohort = (v: unknown): v is string => typeof v === 'string' && /^202[2-5]$/.test(v)

export function readToken(search: string): Token {
  const q = new URLSearchParams(search)
  const b = (q.get('business') ?? q.get('b') ?? '').toLowerCase()
  const c = (q.get('cohort') ?? q.get('c') ?? '').toLowerCase()
  const t: Token = {}
  if (isBusiness(b)) t.business = b
  if (isCohort(c)) t.cohort = c
  const r = q.get('r') ?? q.get('code') ?? ''
  if (/^[A-Za-z0-9_-]{4,64}$/.test(r)) t.code = r
  return t
}

export function linkId(t: Token): string {
  if (t.code) return `r:${t.code}`
  if (t.business || t.cohort) return `s:${t.business ?? ''}|${t.cohort ?? ''}`
  return ''
}

export function isPreviewUrl(pathname: string, search: string): boolean {
  // the kit is a showcase: preview (Next always on, every follow-up shown) unless ?live=1 asks for a respondent's run
  void pathname
  return new URLSearchParams(search).get('live') !== '1'
}

export function channelFor(w: number, h: number, search = ''): Channel {
  const l = layoutOverride(search) ?? layoutFor(w, h)
  return isDeskLayout(l) ? 'desk' : 'phone'
}

const memory = new Map<string, string>()
const MEMORY: StateStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => { memory.set(k, v) },
  removeItem: (k) => { memory.delete(k) },
}
export function safeStorage(): StateStorage {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return MEMORY
    const ls = window.localStorage
    return {

      getItem: (k) => { try { const v = ls.getItem(k); if (v !== null) JSON.parse(v); return v } catch { return null } },
      setItem: (k, v) => { try { ls.setItem(k, v) } catch { memory.set(k, v) } },
      removeItem: (k) => { try { ls.removeItem(k) } catch {  } },
    }
  } catch { return MEMORY }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function mulberry(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seeded(seed: number, key: string): number {
  return mulberry(seed ^ hash(key))()
}

export function orderFor<T extends string>(seed: number, key: string, ids: readonly T[], recorded?: unknown): T[] {
  if (Array.isArray(recorded) && recorded.length === ids.length && ids.every((x) => recorded.includes(x))) return recorded as T[]
  const rnd = mulberry(seed ^ hash(key))
  const out = [...ids]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
