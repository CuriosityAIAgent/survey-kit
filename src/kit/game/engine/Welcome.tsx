'use client'

import { V2Styles } from '../V2Frame'
import { WELCOME, type Channel } from '../questions'
import { BUSINESSES, COHORTS, type Business } from './link'
import { Journey } from './Journey'

const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'

export type WelcomeProps = {
  channel: Channel
  preview: boolean

  ask: { business: boolean; cohort: boolean }
  business?: Business
  cohort?: string
  onBusiness: (b: Business) => void
  onCohort: (c: string) => void

  resumed: boolean
  onStart: () => void
}

export default function Welcome(p: WelcomeProps) {
  const needB = p.ask.business && !p.business
  const needC = p.ask.cohort && !p.cohort
  const missing = p.preview ? undefined
    : needB && needC ? 'Pick your business and class'
      : needB ? 'Pick your business'
        : needC ? 'Pick your class' : undefined
  const asking = p.ask.business || p.ask.cohort
  return (
    <div className="relative flex min-h-dvh w-full justify-center bg-paper lg:py-5" data-q="welcome">
      <V2Styles />
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-cover bg-bottom opacity-[0.28]" style={{ backgroundImage: 'url(/game/3d/scene-basecamp-wide.webp)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #F8F7F4 0%, rgba(248,247,244,0.55) 38%, rgba(248,247,244,0) 70%)' }} />
      </div>

      <div className="relative z-10 flex w-full max-w-[720px] flex-col bg-paper lg:min-h-[660px] lg:rounded-[4px] lg:border lg:border-rule-soft lg:shadow-[0_18px_50px_rgba(13,12,11,0.10)]">
        <div className="flex flex-1 flex-col justify-center pb-2">
        <div className="px-5 pt-4 lg:px-12 lg:pt-6">
          <Journey reached={0} walking={false} pos={{ x: 72, y: 252, dir: 1 }}
            className={asking ? 'h-[92px] lg:h-[150px]' : 'h-[150px] lg:h-[210px]'} />
        </div>

        <header className="px-5 pt-3 lg:px-12 lg:pt-5">
          <h1 className={`${TEXT} v2-q text-[28px] font-semibold leading-[34px] tracking-[-0.01em] text-ink lg:text-[36px] lg:leading-[42px]`}>
            {WELCOME.title}
          </h1>
          <p className={`${TEXT} v2-i mt-2 text-[17px] leading-[24px] text-ink-2 lg:text-[19px] lg:leading-[27px]`}>{WELCOME.intro}</p>
          <p className={`${UI} v2-i mt-2 text-[15px] leading-[21px] text-muted lg:text-[16px]`} data-length>
            {WELCOME.lines[p.channel].join(' ')}
          </p>
          <ol className={`${UI} v2-i mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-[14px] leading-[20px] text-muted lg:flex`} aria-label="The five sections">
            {WELCOME.sections.map((s, i) => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="font-semibold tabular-nums text-forest">{i + 1}</span>{s}
              </li>
            ))}
          </ol>
        </header>

        {asking && (
          <div className="px-5 pt-4 lg:px-12 lg:pt-6">
            {p.ask.business && (
              <Picker label="Your business" value={p.business} onPick={(v) => p.onBusiness(v as Business)}
                options={BUSINESSES.map((b) => ({ id: b.id, label: b.label }))} />
            )}
            {p.ask.cohort && (
              <Picker label="Your group" value={p.cohort} onPick={p.onCohort} className={p.ask.business ? 'mt-3' : ''}
                options={COHORTS.map((c) => ({ id: c, label: c }))} />
            )}
          </div>
        )}

        {p.preview && (
          <p className={`${UI} mx-5 mt-4 rounded-[3px] border border-dashed border-bronze/50 px-3 py-2 text-[13px] leading-[18px] text-bronze lg:mx-12 lg:mt-3 lg:py-1.5`} data-preview-note>
            Preview: you can skip any question.
          </p>
        )}
        </div>

        <div className="sticky bottom-0 z-20 mt-auto">
          <div aria-hidden className="h-4 bg-gradient-to-b from-transparent to-paper" />
          <div className="bg-paper px-5 pb-4 pt-1 lg:rounded-b-[4px] lg:px-12 lg:pb-7">
            <p className={`${UI} mb-3 text-[13px] leading-[18px] text-forest`}>{WELCOME.privacy}</p>
            <button type="button" disabled={!!missing} onClick={p.onStart} data-next
              className={`${UI} btn v2-next flex h-14 w-full items-center justify-center gap-3 rounded-[3px] text-[16px] font-medium tracking-[0.01em] transition-[background-color,color,transform] duration-200 disabled:cursor-not-allowed ${missing ? '' : 'active:scale-[0.99]'}`}>
              <span key={missing ?? 'ready'} className={missing ? '' : 'v2-ready'} aria-live="polite">
                {missing ?? (p.resumed ? 'Continue' : WELCOME.start)}
              </span>
              {!missing && <span aria-hidden className="v2-ready text-[18px] leading-none">→</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Picker({ label, options, value, onPick, className = '' }: {
  label: string; options: { id: string; label: string }[]; value?: string; onPick: (id: string) => void; className?: string
}) {
  return (
    <div className={className}>
      <p className={`${UI} mb-1.5 text-[14px] font-medium leading-[19px] text-ink`} id={`pick-${label.replace(/\W+/g, "-")}`}>{label}</p>
      <div role="radiogroup" aria-labelledby={`pick-${label.replace(/\W+/g, "-")}`} className="flex gap-2">
        {options.map((o) => {
          const on = value === o.id
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} data-option={o.id} onClick={() => onPick(o.id)}
              className={`${UI} h-11 min-w-0 flex-1 rounded-[3px] border text-[15px] font-medium transition-colors duration-150
                ${on ? 'border-forest bg-forest text-white' : 'border-rule-soft bg-white text-ink hover:border-ink'}`}>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
