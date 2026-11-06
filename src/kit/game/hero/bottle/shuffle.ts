function hash(s: string) {
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

export function seededShuffle<T extends { pinned?: boolean }>(items: readonly T[], seed: number, salt: string): T[] {
  const loose = items.filter((x) => !x.pinned)
  const pinned = items.filter((x) => x.pinned)
  const r = rng(seed ^ hash(salt))
  for (let i = loose.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[loose[i], loose[j]] = [loose[j], loose[i]]
  }
  return [...loose, ...pinned]
}
