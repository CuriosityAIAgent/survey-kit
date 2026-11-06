'use client'

import type { ReactNode } from 'react'
import type { V2FrameProps } from './contract'
import { useSound } from './hero/soundPref'

export type V2Callouts = { question?: string; instruction?: string; object?: string; next?: string }
type Extras = { callouts?: V2Callouts; aside?: ReactNode }

const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'

export default function V2Frame(p: V2FrameProps & Extras) {
  const disabled = !!p.missing
  const c = p.callouts
  return (
    <div className="relative flex min-h-[calc(100dvh-var(--v2-bar,0px))] w-full justify-center bg-paper lg:py-5">
      <V2Styles />
      {}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-cover bg-bottom opacity-[0.28]"
          style={{ backgroundImage: 'url(/game/3d/scene-basecamp-wide.webp)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #F8F7F4 0%, rgba(248,247,244,0.55) 38%, rgba(248,247,244,0) 70%)' }} />
      </div>

      <div className="relative z-10 flex w-full max-w-[720px] flex-col bg-paper lg:min-h-[660px] lg:rounded-[4px] lg:border lg:border-rule-soft lg:shadow-[0_18px_50px_rgba(13,12,11,0.10)]">
        <Rail {...p} />

        <header className="px-5 pt-5 lg:px-12 lg:pt-7">
          <Band n={1} text={c?.question}>
            <div key={(p.bridge ?? '') + p.question} className="v2-q">
              {p.bridge && (
                <p data-bridge className={`${TEXT} mb-1.5 flex items-start gap-2 text-[17px] leading-[24px] text-forest lg:text-[19px]`}>
                  <span aria-hidden className="mt-[11px] inline-block h-[2px] w-4 shrink-0 bg-forest" />
                  {p.bridge}
                </p>
              )}
              <h1 className={`${TEXT} text-balance text-[23px] font-semibold leading-[29px] tracking-[-0.005em] text-ink lg:text-[30px] lg:leading-[37px]`}>
                {p.question}
              </h1>
            </div>
          </Band>
          <Band n={2} text={c?.instruction} className={c?.instruction ? 'mt-3' : ''}>
            <p key={p.instruction} className={`${UI} v2-i mt-1.5 text-[15px] leading-[21px] text-muted lg:text-[16px]`}>{p.instruction}</p>
          </Band>
          {p.note && <p data-note className={`${UI} mt-1 text-[14px] leading-[19px] text-muted lg:text-[15px]`}>{p.note}</p>}
          {p.privacy && <p data-privacy className={`${UI} mt-1 text-[13px] leading-[18px] text-forest`}>{p.privacy}</p>}
        </header>

        <div className="relative mt-5 flex flex-1 flex-col px-5 lg:mt-6 lg:px-12" data-object>
          {}
          <Band n={3} text={c?.object} className="flex flex-1 flex-col lg:justify-center">
            {p.children}
          </Band>
        </div>

        {p.tray && <div className="px-5 pt-3 lg:px-12" data-tray>{p.tray}</div>}

        {}
        <div className="sticky bottom-0 z-20 mt-auto lg:rounded-b-[4px]">
          <div aria-hidden className="h-5 bg-gradient-to-b from-transparent to-paper" />
          <div className="relative bg-paper px-5 pb-3 pt-1 lg:rounded-b-[4px] lg:px-12 lg:pb-6 lg:pt-2">
            <Band n={4} text={c?.next}>
            {p.noNext ? (
              <p data-done className={`${UI} flex h-14 w-full items-center justify-center gap-2 text-[15px] text-forest`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Done
              </p>
            ) : (
            <button type="button" disabled={disabled} onClick={p.onNext} data-next
              className={`${UI} btn v2-next flex h-14 w-full items-center justify-center gap-3 rounded-[3px] text-[16px] font-medium tracking-[0.01em] transition-[background-color,color,transform] duration-200 disabled:cursor-not-allowed ${disabled ? '' : 'active:scale-[0.99]'}`}>
              <span key={disabled ? `m-${p.missing}` : 'ready'} className={disabled ? '' : 'v2-ready'} aria-live="polite">
                {disabled ? p.missing : (p.nextLabel ?? 'Next')}
              </span>
              {!disabled && <span aria-hidden className="v2-ready text-[18px] leading-none">→</span>}
            </button>
            )}
            </Band>
          </div>
          <GroundBand />
        </div>
      </div>

      {p.aside && (
        <aside className="absolute left-[calc(50%+384px)] top-6 z-10 hidden w-[min(300px,calc(50vw-408px))] xl:block">
          {p.aside}
        </aside>
      )}
    </div>
  )
}

const RIDGE: [number, number][] = [[2, 22], [16, 17], [24, 19], [40, 11], [50, 14], [66, 7], [76, 10], [96, 3], [112, 9], [126, 6]]

function pointAt(t: number) {
  const segs = RIDGE.slice(1).map((pt, i) => Math.hypot(pt[0] - RIDGE[i][0], pt[1] - RIDGE[i][1]))
  let d = t * segs.reduce((a, b) => a + b, 0)
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const f = Math.min(1, d / segs[i])
      return [RIDGE[i][0] + (RIDGE[i + 1][0] - RIDGE[i][0]) * f, RIDGE[i][1] + (RIDGE[i + 1][1] - RIDGE[i][1]) * f]
    }
    d -= segs[i]
  }
  return RIDGE[RIDGE.length - 1]
}

function Rail(p: V2FrameProps) {
  const t = Math.max(0, Math.min(1, (p.step - 1) / Math.max(1, p.total - 1)))
  const [x, y] = pointAt(t)
  const path = 'M' + RIDGE.map(([a, b]) => `${a} ${b}`).join(' L')
  return (
    <div className="flex h-12 items-center gap-2 border-b border-rule-soft px-2 lg:h-14 lg:px-6" data-rail>
      <button type="button" onClick={p.onBack} disabled={!p.onBack} aria-label="Back"
        className={`${UI} flex h-11 min-w-[72px] items-center gap-1 rounded-[3px] px-2 text-[15px] text-ink transition-opacity disabled:opacity-35`}>
        <span aria-hidden className="text-[20px] leading-none">‹</span> Back
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:justify-start sm:pl-2">
        {}
        <svg viewBox="0 0 128 26" className="h-[22px] w-[108px] min-w-[44px] shrink lg:h-[26px] lg:w-[128px]" aria-hidden>
          <path d={path} fill="none" stroke="#C9C3B8" strokeWidth="1.25" strokeLinejoin="round" pathLength={1} />
          <path d={path} fill="none" stroke="#1F4B3A" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round"
            pathLength={1} strokeDasharray={`${t} 1`} className="transition-[stroke-dasharray] duration-500" />
          <circle cx={x} cy={y} r="3.6" fill="#1F4B3A" stroke="#F8F7F4" strokeWidth="1.5" />
          {p.bridge && <circle cx={x + 6.5} cy={y - 1.5} r="1.9" fill="none" stroke="#1F4B3A" strokeWidth="1.1" />}
        </svg>
        {p.railLabel !== undefined ? (
          p.railLabel && <span data-rail-label className={`${UI} whitespace-nowrap text-[13px] text-muted lg:text-[14px]`}>{p.railLabel}</span>
        ) : (
          <span data-rail-label className={`${UI} whitespace-nowrap text-[13px] tabular-nums text-muted lg:text-[14px]`}>
            Question <span className="font-semibold text-ink">{p.step}</span> of {p.total}
          </span>
        )}
      </div>
      <SoundSwitch />
    </div>
  )
}

function SoundSwitch() {
  const [on, set] = useSound()
  return (
    <button type="button" onClick={() => set(!on)} aria-pressed={on} data-sound
      aria-label={on ? 'Sound on. Tap to turn it off.' : 'Sound off. Tap to turn it on.'}
      className={`${UI} flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-[3px] px-1.5 text-[13px] transition-colors lg:px-2 lg:text-[14px] ${on ? 'text-ink' : 'text-muted hover:text-ink'}`}>
      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden>
        <path d="M3 8 H6 L10 4.5 V15.5 L6 12 H3 Z" fill="currentColor" />
        {on ? (
          <path d="M13 7 C14.5 8.5 14.5 11.5 13 13 M15.2 5 C17.8 7.6 17.8 12.4 15.2 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        ) : (
          <path d="M13 8 L17 12 M17 8 L13 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        )}
      </svg>
      <span className="hidden lg:inline">Sound</span>
    </button>
  )
}

function GroundBand() {
  return (
    <svg aria-hidden viewBox="0 0 390 14" preserveAspectRatio="none" className="block h-[14px] w-full bg-paper lg:hidden">
      <path d="M0 9 C60 5 110 11 170 7 S290 4 390 8 L390 14 L0 14 Z" fill="#E7E3DB" />
      <path d="M0 11 C80 8 150 13 230 10 S340 9 390 11 L390 14 L0 14 Z" fill="#D9D3C8" />
      {[[34, 8], [42, 9], [300, 6], [309, 7], [352, 7]].map(([cx, cy], i) => (
        <path key={i} d={`M${cx} ${cy - 6} L${cx + 3} ${cy} L${cx - 3} ${cy} Z`} fill="#1F4B3A" opacity="0.55" />
      ))}
    </svg>
  )
}

function Band({ n, text, className = '', children }: { n: number; text?: string; className?: string; children: ReactNode }) {
  if (!text) return <div className={className}>{children}</div>
  return (
    <div className={`relative ${className}`}>
      <p className={`${UI} mb-2 flex items-start gap-2 text-[13px] font-medium leading-[18px] text-bronze xl:hidden`}>
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-bronze text-[11px] font-semibold text-white">{n}</span>
        <span>{text}</span>
      </p>
      <span aria-hidden className={`${UI} absolute -left-[34px] top-1 z-10 hidden h-6 w-6 items-center justify-center rounded-full bg-bronze text-[13px] font-semibold text-white shadow-[0_0_0_3px_#F8F7F4] xl:flex`}>
        {n}
      </span>
      <div className={`${UI} pointer-events-none absolute right-[calc(100%+84px)] top-0 hidden w-[250px] xl:block`}>
        <div className="relative rounded-[3px] border border-bronze/35 bg-paper px-3.5 py-2 text-[14px] leading-[19px] text-ink shadow-[0_4px_16px_rgba(13,12,11,0.06)]">
          <span className="mr-1.5 font-semibold text-bronze">{n}</span>{text}
          <span aria-hidden className="absolute left-full top-[15px] h-px w-[50px] bg-bronze/60" />
        </div>
      </div>
      {children}
    </div>
  )
}

export function V2Styles() {
  return (
    <style>{`
@keyframes v2-rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
@keyframes v2-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes v2-pop { 0% { transform: scale(.96) } 60% { transform: scale(1.02) } 100% { transform: scale(1) } }
@keyframes v2-shake { 0%,100% { transform: translateX(0) } 20% { transform: translateX(-3px) } 40% { transform: translateX(3px) } 60% { transform: translateX(-2px) } 80% { transform: translateX(2px) } }
@keyframes v2-leave { to { opacity: 0; transform: translateY(-28px) } }
.v2-q { animation: v2-rise .32s cubic-bezier(.2,.7,.2,1) both }
.v2-i { animation: v2-fade .32s .08s ease both }
.v2-ready { animation: v2-fade .25s ease both }
.v2-shake { animation: v2-shake .32s ease }
.v2-leave { animation: v2-leave .26s cubic-bezier(.5,0,.8,.4) forwards }
.v2-rise { animation: v2-rise .4s cubic-bezier(.2,.7,.2,1) both }
`}</style>
  )
}
