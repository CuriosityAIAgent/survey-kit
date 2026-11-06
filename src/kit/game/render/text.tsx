'use client'

import V2Frame from '../V2Frame'
import type { RenderProps } from './contract'
import { asRecord } from './checklist'

const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'

const TINTS = [
  { bg: 'bg-[#F1F5F1]', edge: 'border-forest/25', head: 'text-forest', tape: 'bg-forest/15' },
  { bg: 'bg-[#F7F1EA]', edge: 'border-bronze/25', head: 'text-bronze', tape: 'bg-bronze/15' },
]

export default function TextRender(p: RenderProps) {
  const { q } = p
  const chars = q.constraints.chars ?? 80
  const notes = q.options.length ? q.options : [{ id: 'text', label: 'Your answer' }]
  const rec = asRecord(p.value)
  const text = (id: string) => (typeof rec[id] === 'string' ? String(rec[id]) : '')
  const all = () => Object.fromEntries(notes.map((n) => [n.id, text(n.id)]))

  const write = (id: string, s: string) => p.set({ ...all(), [id]: s.slice(0, chars) })
  const filled = notes.filter((n) => text(n.id).trim()).length
  const min = q.constraints.min ?? 0
  const missing = filled < min && !p.preview ? `Write ${min - filled} more` : undefined
  const last = p.step === p.total && !p.bridge
  const next = () => {
    if (p.value === undefined) p.set(all())
    p.onNext()
  }

  const pair = notes.slice(0, 2)
  const rest = notes.slice(2)

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy} missing={p.busy ?? missing}
      nextLabel={p.nextLabel ?? (last ? 'Send' : filled ? 'Next' : 'Skip')} onNext={next} onBack={p.onBack}>
      <div data-q={q.id}>
        <div className={`grid gap-3 lg:gap-5 ${pair.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {pair.map((n, i) => (
            <Note key={n.id} id={n.id} label={n.label} value={text(n.id)} chars={chars} tint={TINTS[i]} tilt={i === 0 ? -0.8 : 0.9}
              onChange={(s) => write(n.id, s)} />
          ))}
        </div>
        {rest.map((n) => (
          <div key={n.id} className="mt-3 lg:mt-5">
            <Note id={n.id} label={n.label} value={text(n.id)} chars={chars} faint onChange={(s) => write(n.id, s)} />
          </div>
        ))}
      </div>
    </V2Frame>
  )
}

function Note({ id, label, value, chars, tint, tilt = 0, faint, onChange }: {
  id: string; label: string; value: string; chars: number
  tint?: (typeof TINTS)[number]; tilt?: number; faint?: boolean
  onChange: (s: string) => void
}) {
  const t = tint ?? { bg: 'bg-white', edge: 'border-rule-soft', head: 'text-muted', tape: '' }
  return (
    <label
      className={`group relative block cursor-text rounded-[3px] border ${faint ? 'border-dashed border-rule bg-paper focus-within:border-solid focus-within:bg-white' : `${t.edge} ${t.bg} shadow-[0_1px_0_#DDD9D2,0_8px_20px_rgba(13,12,11,0.06)]`} px-3.5 pb-2 pt-3 transition-[translate,box-shadow] duration-200
        focus-within:z-10 focus-within:-translate-y-1 focus-within:shadow-[0_2px_0_#DDD9D2,0_18px_34px_rgba(13,12,11,0.14)] lg:px-5 lg:pt-4`}
      style={{ rotate: `${tilt}deg` }}>
      {!faint && t.tape && <span aria-hidden className={`absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-2deg] rounded-[2px] ${t.tape}`} />}
      <span className={`${UI} block ${faint ? 'text-[14px] font-medium text-muted' : `text-[13px] font-semibold uppercase tracking-[0.1em] ${t.head}`}`}>{label}</span>
      <textarea data-input={id} value={value} maxLength={chars} onChange={(e) => onChange(e.target.value)}
        placeholder="Tap to write" aria-label={label}
        rows={faint ? 2 : 4}
        className={`${TEXT} mt-1 block w-full resize-none bg-transparent text-[16px] leading-[22px] text-ink outline-none placeholder:text-disabled-ink lg:text-[18px] lg:leading-[26px]`} />
      <span className={`${UI} block text-right text-[11px] tabular-nums text-muted transition-opacity ${value ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100'}`}>
        {value.length}/{chars}
      </span>
    </label>
  )
}
