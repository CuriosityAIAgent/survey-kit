'use client'

import { useRef, useState } from 'react'

const UI = 'font-[family-name:var(--font-ui)]'

export type ChecklistOption = { id: string; label: string; hint?: string; icon?: string }

export type ChecklistProps = {
  options: (string | ChecklistOption)[]
  picked: string[]
  onChange: (next: string[]) => void
  max: number
  mode?: 'pick' | 'one'
  numbered?: boolean
  peek?: string | null
  fullNote?: string
  rowRef?: (option: string, el: HTMLButtonElement | null) => void
  compact?: boolean
  layout?: 'rows' | 'grid'
  dense?: boolean
  label?: string

  exclusive?: string[]
}

const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight']

export const toOption = (o: string | ChecklistOption): ChecklistOption => (typeof o === 'string' ? { id: o, label: o } : o)

export default function Checklist({ options, picked, onChange, max, mode = 'pick', numbered, peek, fullNote, rowRef, compact, layout = 'rows', dense, label, exclusive = [] }: ChecklistProps) {
  const [refused, setRefused] = useState<{ opt: string; n: number } | null>(null)
  const timer = useRef(0)
  const opts = options.map(toOption)
  const grid = layout === 'grid'

  const tap = (opt: string) => {
    if (mode === 'one') return onChange(picked[0] === opt ? [] : [opt])
    if (picked.includes(opt)) return onChange(picked.filter((x) => x !== opt))
    if (exclusive.includes(opt)) return onChange([opt])
    if (picked.some((x) => exclusive.includes(x))) return onChange([opt])
    if (picked.length >= max) {
      window.clearTimeout(timer.current)
      setRefused((r) => ({ opt, n: (r?.n ?? 0) + 1 }))
      timer.current = window.setTimeout(() => setRefused(null), 2000)
      return
    }
    onChange([...picked, opt])
  }

  return (
    <div role={mode === 'one' ? 'radiogroup' : 'group'} aria-label={label}
      className={grid
        ? `grid grid-cols-2 ${dense ? 'gap-1.5' : 'gap-2'}`
        : 'overflow-hidden rounded-[4px] border border-rule-soft bg-white shadow-[0_1px_0_#DDD9D2,0_8px_24px_rgba(13,12,11,0.04)]'}>
      {opts.map((o, i) => {
        const on = picked.includes(o.id)
        const ghost = !on && peek === o.id
        const no = refused?.opt === o.id
        const order = numbered && on ? picked.indexOf(o.id) + 1 : undefined
        const size = grid
          ? `${dense ? 'min-h-[44px] gap-2 px-2.5 py-1.5' : 'min-h-[54px] gap-2.5 px-3 py-2'} rounded-[4px] border ${on ? 'border-forest' : 'border-rule-soft'} shadow-[0_1px_0_#DDD9D2]`
          : `gap-3.5 px-4 lg:px-5 ${compact ? 'min-h-[44px] py-1.5' : 'min-h-[52px] py-2.5'} ${i > 0 ? 'border-t border-rule-soft' : ''}`
        return (
          <button key={o.id} type="button" ref={(el) => rowRef?.(o.id, el)} data-option={o.id}
            role={mode === 'one' ? 'radio' : 'checkbox'} aria-checked={on}
            onClick={() => tap(o.id)}
            className={`${UI} group relative flex w-full items-center text-left transition-colors duration-150 ${size}
              ${on ? 'bg-[#EEF3EF]' : ghost ? 'bg-[#F4F6F3]' : grid ? 'bg-white hover:bg-[#FBFAF8]' : 'hover:bg-[#FBFAF8]'}`}>
            {on && !grid && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-forest" />}
            <Tick on={on} ghost={ghost} round={mode === 'one'} order={order} small={grid && dense} />
            {o.icon && (
              <img src={`/game/3d/${o.icon}.webp`} alt="" draggable={false}
                className={`pointer-events-none shrink-0 object-contain ${grid || compact ? 'h-7 w-7' : 'h-9 w-9'}`} />
            )}
            <span key={no ? `no-${refused?.n}` : 'ok'} className={`min-w-0 flex-1 ${no ? 'v2-shake' : ''}`}>
              <span className={`block ${grid ? (dense ? 'text-[13.5px] leading-[17px]' : 'text-[14.5px] leading-[19px]') : compact ? 'text-[15px] leading-[19px]' : 'text-[16px] leading-[21px]'} ${on ? 'font-semibold text-ink' : 'text-ink'}`}>
                {o.label}
              </span>
              {o.hint && <span className="mt-0.5 block text-[13px] leading-[17px] text-muted">{o.hint}</span>}
            </span>
            {no && (
              <span role="status" className={`v2-ready shrink-0 rounded-[3px] bg-bronze px-2 py-1 text-[12px] font-medium leading-[15px] text-white ${grid ? 'absolute inset-x-1.5 bottom-1 text-center' : ''}`}>
                {fullNote ?? `${WORDS[max] ?? max} picked. Untick one first.`}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Tick({ on, ghost, round, order, small }: { on: boolean; ghost: boolean; round: boolean; order?: number; small?: boolean }) {
  return (
    <span aria-hidden className={`relative flex shrink-0 items-center justify-center border-[1.5px] transition-colors duration-150
      ${small ? 'h-5 w-5' : 'h-6 w-6'}
      ${round ? 'rounded-full' : 'rounded-[4px]'}
      ${on ? 'border-forest bg-forest' : ghost ? 'border-forest/60 bg-white' : 'border-rule bg-white group-hover:border-ink'}`}>
      {order ? (
        <span className={`${UI} v2-ready text-[13px] font-semibold leading-none text-white`}>{order}</span>
      ) : (
        <svg viewBox="0 0 24 24" className={small ? 'h-[15px] w-[15px]' : 'h-[18px] w-[18px]'}>
          <path d="M5 12.5 L10 17 L19 7.5" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
            stroke={on ? '#FFFFFF' : '#1F4B3A'} pathLength={1} strokeDasharray="1"
            style={{
              strokeDashoffset: on || ghost ? 0 : 1,
              opacity: on ? 1 : ghost ? 0.45 : 0,
              transition: on || ghost ? 'stroke-dashoffset .28s cubic-bezier(.3,.7,.3,1) .04s, opacity .1s' : 'stroke-dashoffset .16s ease, opacity .16s .1s',
            }} />
        </svg>
      )}
    </span>
  )
}

export function pickMissing(n: number, max: number, one = false) {
  if (one) return n ? undefined : 'Tap one'
  if (n >= max) return undefined
  return n === 0 ? `Pick ${max}` : `Pick ${max - n} more`
}
