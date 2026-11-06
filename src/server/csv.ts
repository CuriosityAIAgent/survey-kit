/* Responses as CSV: one row per response, one column per answer. Nested answers are flattened so every cell is
   plain text a spreadsheet, R or pandas can read:
     a list        ['family', 'player']           -> family; player       (column: f1.1)
     an object     { shirt: 'always', seat: … }   -> one column each      (columns: f1.3.shirt, f1.3.seat)
   Columns follow the order answers first appear, after id, experience, respondent and submitted_at. The file is
   UTF-8 with a BOM (for Excel); a cell that would run as a formula gets a leading '. */
import type { Row } from './db'

function flatten(prefix: string, v: unknown, out: Map<string, string>) {
  if (v === null || v === undefined) return
  if (Array.isArray(v)) { out.set(prefix, v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join('; ')); return }
  if (typeof v === 'object') { for (const [k, x] of Object.entries(v as Record<string, unknown>)) flatten(prefix ? `${prefix}.${k}` : k, x, out); return }
  out.set(prefix, String(v))
}

// a cell a spreadsheet would run as a formula gets a leading ' (numbers like -5 are left as they are)
const NUMBER = /^-?\d+(\.\d+)?$/
const risky = (s: string) => /^[=+\-@\t\r]/.test(s) && !NUMBER.test(s)
const cell = (s: string) => {
  const t = risky(s) ? "'" + s : s
  return /[",\n\r]/.test(t) || t !== s ? `"${t.replace(/"/g, '""')}"` : t
}
const BASE = ['id', 'experience', 'respondent', 'submitted_at']

export function toCsv(rows: Row[]): string {
  const flat = rows.map((r) => { const m = new Map<string, string>(); flatten('', r.answers, m); return m })
  const cols: string[] = []
  const seen = new Set<string>()
  for (const m of flat) for (const k of m.keys()) if (!seen.has(k)) { seen.add(k); cols.push(k) }
  // an answer named like a fixed column is shown as answers.<name>
  const head = [...BASE, ...cols.map((c) => (BASE.includes(c) ? `answers.${c}` : c))]
  const lines = [head.map(cell).join(',')]
  rows.forEach((r, i) => {
    const m = flat[i]
    lines.push([String(r.id), r.experience, r.respondent ?? '', r.submitted_at, ...cols.map((c) => m.get(c) ?? '')].map(cell).join(','))
  })
  // the BOM tells Excel the file is UTF-8, so accents survive
  return '\uFEFF' + lines.join('\r\n') + '\r\n'
}
