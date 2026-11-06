import type { Answer, Option } from '../../questions'

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled(options: Option[], seed: number, salt: string): Option[] {
  const free = options.filter((o) => !o.pinned)
  const pinned = options.filter((o) => o.pinned)
  const r = rng(hash(`${seed}:${salt}`))
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[free[i], free[j]] = [free[j], free[i]]
  }
  return [...free, ...pinned]
}

export const PLACE_KEYS = ['first', 'second', 'third'] as const

export function toAnswer(places: readonly (string | null)[]): Answer {
  const got = places.filter((x): x is string => x !== null)
  if (got.length === 0) return []
  if (got.length === places.length) return got
  const rec: Record<string, string> = {}
  places.forEach((x, k) => { if (x && PLACE_KEYS[k]) rec[PLACE_KEYS[k]] = x })
  return rec
}
