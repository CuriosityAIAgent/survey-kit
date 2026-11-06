export type JugId = 'meetings' | 'practice' | 'coaching' | 'product' | 'new-clients'

export type JugLook = {
  id: string
  label: string
  color: string
  light: string
  dark: string
  pattern: 'diag' | 'dots' | 'back' | 'vert' | 'grid'
}

export type Jug = JugLook & { id: JugId }

export const JUGS: Jug[] = [
  { id: 'meetings', label: 'Joining client meetings', color: '#2F5D4A', light: '#6E9582', dark: '#1F4B3A', pattern: 'diag' },
  { id: 'practice', label: 'Practising for client meetings', color: '#2D4468', light: '#6F84A6', dark: '#14233B', pattern: 'dots' },
  { id: 'coaching', label: 'Being coached', color: '#8C4E24', light: '#C08A62', dark: '#6A3510', pattern: 'back' },
  { id: 'product', label: 'Learning the products', color: '#B8862B', light: '#DDBB72', dark: '#8E6418', pattern: 'vert' },
  { id: 'new-clients', label: 'Helping win new clients', color: '#6B4A63', light: '#A0869A', dark: '#4A2F44', pattern: 'grid' },
]

export const JUG: Record<JugId, Jug> = Object.fromEntries(JUGS.map((j) => [j.id, j])) as Record<JugId, Jug>

export const TOTAL_HOURS = 8

export function looksFor(options: { id: string; label: string }[]): Record<string, JugLook> {
  const known = JUG as Record<string, Jug | undefined>
  const used = new Set(options.map((o) => known[o.id]?.id).filter(Boolean))
  const spare = JUGS.filter((j) => !used.has(j.id))
  let k = 0
  const out: Record<string, JugLook> = {}
  for (const o of options) {
    const base = known[o.id] ?? spare[k++ % Math.max(1, spare.length)] ?? JUGS[k % JUGS.length]
    out[o.id] = { ...base, id: o.id, label: o.label }
  }
  return out
}
