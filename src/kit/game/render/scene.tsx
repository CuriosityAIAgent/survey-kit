'use client'

import { useEffect, useRef, useState, type ReactElement } from 'react'
import V2Frame from '../V2Frame'
import type { RenderProps } from './contract'
import { SCENE } from '../questions'

const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'
const TICK_MS = 190

function splitLines(lines: string[]): { head: string; parts: string[] } {
  if (lines.length > 1) return { head: lines[0], parts: lines.slice(1) }
  const line = lines.join(' ')
  const at = line.indexOf(':')
  if (at < 0) return { head: line, parts: [] }
  const head = line.slice(0, at).trim() + '.'
  const parts = line
    .slice(at + 1)
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
  return { head, parts }
}

export default function SceneRender(p: RenderProps) {
  const { set, log } = p
  const { head, parts } = splitLines(SCENE.lines)
  const { from, to } = SCENE.calendar
  const [year, setYear] = useState(from)
  const landed = year === to

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setYear(to); return }
    let y = from
    let timer = 0
    const tick = () => {
      y += 1
      setYear(y)
      if (y < to) timer = window.setTimeout(tick, TICK_MS)
    }
    timer = window.setTimeout(tick, 650)
    return () => window.clearTimeout(timer)
  }, [from, to])

  const seen = useRef(false)
  useEffect(() => {
    if (seen.current) return
    seen.current = true
    log('seen', { scene: SCENE.id })
    if (p.value !== 'seen') set('seen')
  }, [log, set, p.value])

  return (
    <V2Frame block={SCENE.block} step={p.step} total={p.total} railLabel="Before the next questions" question={head} instruction={SCENE.assumption}
      onNext={p.onNext} onBack={p.onBack}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-1 lg:gap-9 lg:pb-4" data-q={SCENE.id}>
        <Calendar year={year} from={from} to={to} />
        {}
        <ul className="grid w-full gap-1 lg:grid-cols-3 lg:gap-0" aria-label={`By ${to}`}>
          {parts.map((t, i) => (
            <li key={t} className={`flex cursor-default items-center gap-4 px-1 py-1 lg:flex-col lg:items-center lg:gap-3 lg:px-6 lg:py-1 lg:text-center ${i > 0 ? 'lg:border-l lg:border-rule-soft' : ''}`}>
              <span className="block h-[46px] w-[64px] shrink-0 lg:h-[92px] lg:w-[128px]" aria-hidden>
                {(() => { const Art = ART[(SCENE.art ?? DEFAULT_ART)[i]]; return Art ? <Art on={landed} /> : null })()}
              </span>
              <span className={`${UI} text-[16px] font-medium leading-[21px] text-ink lg:text-[17px] lg:leading-[23px]`}>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        @keyframes v2c-flip { 0% { transform: rotateX(-88deg); opacity: .4 } 100% { transform: rotateX(0); opacity: 1 } }
        .v2c-flip { animation: v2c-flip ${TICK_MS - 20}ms cubic-bezier(.3,.7,.3,1) both; transform-origin: 50% 0; backface-visibility: hidden; }
        .v2c-t { transition: transform 620ms cubic-bezier(.3,.8,.3,1), opacity 420ms ease, fill 420ms ease; transform-box: fill-box; }
        @media (prefers-reduced-motion: reduce) { .v2c-flip { animation: none } .v2c-t { transition: none } }
      `}</style>
    </V2Frame>
  )
}

type Pic = (p: { on: boolean }) => ReactElement
const DEFAULT_ART = ['folders', 'laptop', 'chairs']
const ART: Record<string, Pic> = {
  folders: (p) => <Folders {...p} />, laptop: (p) => <Laptop {...p} />, chairs: (p) => <Chairs {...p} />,
  stand: (p) => <Stand {...p} />, screen: (p) => <Screen {...p} />, ticket: (p) => <Ticket {...p} />,
}

function Stand({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 64 46" className="h-full w-full">
      <ellipse cx="32" cy="43.5" rx="27" ry="2" fill="#0D0C0B" opacity="0.10" />
      <rect x="6" y="38" width="52" height="4" rx="1" fill="#4E8F5E" />
      <path d="M8 38 L14 26 H50 L56 38 Z" fill="#2F5D4A" />
      {[29, 33].map((y) => <rect key={y} x="14" y={y} width="36" height="1.4" fill="#fff" opacity=".35" />)}
      <g className="v2c-t" style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(10px)', transitionDelay: on ? '120ms' : '0ms' }}>
        <path d="M12 26 L18 13 H46 L52 26 Z" fill="#8C4E24" />
        {[16, 20].map((y) => <rect key={y} x="18" y={y} width="28" height="1.4" fill="#fff" opacity=".35" />)}
        <path d="M14 11 Q32 4 50 11" fill="none" stroke="#3B3733" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function Screen({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 64 46" className="h-full w-full">
      <ellipse cx="32" cy="43.5" rx="22" ry="2" fill="#0D0C0B" opacity="0.10" />
      <rect x="9" y="5" width="46" height="30" rx="2.5" fill="#2A2724" />
      <rect x="11.5" y="7.5" width="41" height="25" rx="1" className="v2c-t" style={{ fill: on ? '#4E8F5E' : '#3B3733' }} />
      <g className="v2c-t" style={{ opacity: on ? 1 : 0, transitionDelay: on ? '200ms' : '0ms' }} fill="none" stroke="#fff" strokeWidth=".9" opacity=".85">
        <rect x="14" y="10" width="36" height="20" />
        <path d="M32 10 V30" />
        <circle cx="32" cy="20" r="4" />
        <rect x="14" y="15" width="5" height="10" />
        <rect x="45" y="15" width="5" height="10" />
      </g>
      <path d="M26 35 L24 40 H40 L38 35 Z" fill="#8C857A" />
    </svg>
  )
}

function Ticket({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 64 46" className="h-full w-full">
      <ellipse cx="32" cy="43.5" rx="24" ry="2" fill="#0D0C0B" opacity="0.10" />
      <path d="M8 10 H56 V18 A4 4 0 0 0 56 26 V34 H8 V26 A4 4 0 0 0 8 18 Z" fill="#F3EEE3" stroke="#B8862B" strokeWidth="1.2" />
      <path d="M44 11 V33" stroke="#B8862B" strokeWidth="1" strokeDasharray="2 2" />
      <rect x="13" y="15" width="22" height="2" rx="1" fill="#1F4B3A" opacity=".5" />
      <text x="24" y="29" textAnchor="middle" fontSize="9" fontWeight="700" fill="#14233B" className="v2c-t" style={{ opacity: on ? 0 : 1 }}>£40</text>
      <text x="24" y="29" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1F4B3A" className="v2c-t" style={{ opacity: on ? 1 : 0, transitionDelay: on ? '200ms' : '0ms' }}>£20</text>
    </svg>
  )
}

function Calendar({ year, from, to }: { year: number; from: number; to: number }) {
  return (
    <div className="relative w-[128px] lg:w-[176px]" role="img" aria-label={`The year ${to}`} data-year={year}>
      <div className="relative overflow-hidden rounded-[5px] border border-[#CFC8BB] bg-white shadow-[0_2px_0_#DDD9D2,0_12px_24px_rgba(13,12,11,.10)]" style={{ perspective: 400 }}>
        <div className={`${UI} flex h-[22px] items-center justify-center bg-navy text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 lg:h-[28px] lg:text-[11px]`}>
          {year === from ? 'Today' : 'Imagine'}
        </div>
        <div className="relative h-[54px] lg:h-[76px]">
          {}
          <span className={`${TEXT} absolute inset-0 flex items-center justify-center text-[38px] font-semibold tabular-nums text-ink lg:text-[54px]`} aria-hidden>
            {year}
          </span>
          <span key={year} className={`${TEXT} ${year === from ? '' : 'v2c-flip'} absolute inset-0 flex items-center justify-center bg-white text-[38px] font-semibold tabular-nums text-ink lg:text-[54px]`}>
            {year}
          </span>
        </div>
      </div>
      {}
      {[28, 72].map((x) => (
        <span key={x} aria-hidden className="absolute -top-[6px] h-[13px] w-[5px] rounded-full bg-[#3B3733] shadow-[0_1px_0_rgba(255,255,255,.4)] lg:w-[6px]" style={{ left: `${x}%` }} />
      ))}
    </div>
  )
}

function Folders({ on }: { on: boolean }) {
  const thick = [0, 1, 2]
  const thin = [0, 1, 2, 3, 4, 5, 6, 7]
  return (
    <svg viewBox="0 0 64 46" className="h-full w-full">
      <ellipse cx="32" cy="43.5" rx="24" ry="2" fill="#0D0C0B" opacity="0.10" />
      {thick.map((k) => (
        <g key={`a${k}`} className="v2c-t" style={{ opacity: on ? 0 : 1, transform: on ? 'translateX(-10px)' : 'none' }}>
          <rect x="12" y={33 - k * 10} width="40" height="9" rx="1.5" fill={k % 2 ? '#C9A56A' : '#D8B97F'} />
          <rect x="12" y={33 - k * 10} width="40" height="2" rx="1" fill="#fff" opacity="0.35" />
        </g>
      ))}
      {thin.map((k) => (
        <g key={`b${k}`} className="v2c-t" style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateY(-8px)', transitionDelay: on ? `${k * 55}ms` : '0ms' }}>
          <rect x="16" y={39 - k * 4.6} width="32" height="3.6" rx="1" fill={k % 2 ? '#C9A56A' : '#DDBB72'} />
        </g>
      ))}
    </svg>
  )
}

function Laptop({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 64 46" className="h-full w-full">
      <ellipse cx="32" cy="43.5" rx="26" ry="2" fill="#0D0C0B" opacity="0.10" />
      <rect x="13" y="6" width="38" height="26" rx="2.5" fill="#2A2724" />
      <rect x="15.5" y="8.5" width="33" height="21" rx="1" className="v2c-t" style={{ fill: on ? '#E6EFEA' : '#3B3733' }} />
      <g className="v2c-t" style={{ opacity: on ? 1 : 0, transitionDelay: on ? '200ms' : '0ms' }}>
        <rect x="19" y="12" width="14" height="2" rx="1" fill="#1F4B3A" />
        <rect x="19" y="16.5" width="24" height="1.6" rx=".8" fill="#1F4B3A" opacity=".45" />
        <rect x="19" y="20.5" width="20" height="1.6" rx=".8" fill="#1F4B3A" opacity=".45" />
        <rect x="19" y="24.5" width="10" height="1.6" rx=".8" fill="#B8862B" />
        <circle cx="44" cy="13" r="2" fill="#B8862B" />
      </g>
      <path d="M7 34 H57 L60 39 Q60.5 40.5 59 40.5 H5 Q3.5 40.5 4 39 Z" fill="#8C857A" />
      <rect x="27" y="35" width="10" height="1.6" rx=".8" fill="#6B6761" />
    </svg>
  )
}

function Chairs({ on }: { on: boolean }) {
  const chair = (x: number, c: string) => (
    <g transform={`translate(${x} 0)`}>
      <rect x="-7" y="12" width="14" height="15" rx="3" fill={c} />
      <rect x="-9" y="26" width="18" height="5" rx="2" fill={c} />
      <path d="M-6 31 L-7 41 M6 31 L7 41" stroke="#3B3733" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  )
  return (
    <svg viewBox="0 0 64 46" className="h-full w-full">
      <ellipse cx="32" cy="43.5" rx="27" ry="2" fill="#0D0C0B" opacity="0.10" />
      <g className="v2c-t" style={{ transform: on ? 'translateX(10px)' : 'none', transitionDelay: on ? '260ms' : '0ms' }}>
        {chair(12, '#2F5D4A')}
        {chair(32, '#8C4E24')}
      </g>
      <g className="v2c-t" style={{ opacity: on ? 0 : 1, transform: on ? 'translateX(16px)' : 'none', transitionDelay: on ? '120ms' : '0ms' }}>
        {chair(52, '#2D4468')}
      </g>
    </svg>
  )
}
