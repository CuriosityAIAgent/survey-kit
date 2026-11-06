'use client'

import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import V2Frame from '../V2Frame'
import type { RenderProps } from './contract'
import type { Card, Option } from '../questions'
import { useLaptop } from '../hero/podium/useLaptop'
import { stampKnock, unlockAudio } from '../hero/podium/sound'
import { GLYPH, InkFilter, Mark, StampMark, type Choice } from '../hero/stamp/ink'
import StampBody from '../hero/stamp/StampBody'

const UI = 'font-[family-name:var(--font-ui)]'
const TEXT = 'font-[family-name:var(--font-text)]'
const TILTS = [-4, 5, -8, 3, -6]

const choiceOf = (o: Option, i: number): Choice =>
  o.glyph ? GLYPH[o.glyph] : (['no', 'unsure', 'yes'] as Choice[])[i % 3]

export default function StampRender(p: RenderProps) {
  const cards = p.q.constraints.cards
  return cards && cards.length ? <Stamps {...p} cards={cards} /> : <Certificate {...p} />
}

function Stamps(p: RenderProps & { cards: Card[] }) {
  const { q, cards, set, log } = p
  const laptop = useLaptop()
  const options = q.options
  const ids = new Set(options.map((o) => o.id))

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const v = p.value
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
    const out: Record<string, string> = {}
    for (const c of cards) {
      const a = (v as Readonly<Record<string, string | number>>)[c.id]
      if (typeof a === 'string' && ids.has(a)) out[c.id] = a
    }
    return out
  })

  const [order, setOrder] = useState<string[]>(() => cards.map((c) => c.id).filter((id) => id in answers))
  const [inking, setInking] = useState<string | null>(null)
  const [returned, setReturned] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const pileRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const busy = useRef(false)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null)

  const doneCount = cards.filter((c) => c.id in answers).length
  const current = cards.find((c) => !(c.id in answers))
  const index = current ? cards.indexOf(current) : -1
  const left = cards.length - doneCount
  const opt = (id: string) => options.find((o) => o.id === id)
  const tilt = (id: string) => TILTS[Math.max(0, options.findIndex((o) => o.id === id)) % TILTS.length]

  const press = (o: Option) => {
    if (busy.current || !current) return
    busy.current = true
    unlockAudio()
    const card = current
    setInking(o.id)
    setReturned(null)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => {
      stampKnock()
      cardRef.current?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(.985) translateY(2px)' }, { transform: 'scale(1)' }],
        { duration: 180, easing: 'ease-out' },
      )
    }, reduce ? 0 : 130)
    const finish = () => {
      const next = { ...answers, [card.id]: o.id }
      setAnswers(next)
      setOrder((x) => [...x.filter((id) => id !== card.id), card.id])
      setInking(null)
      busy.current = false
      set(next)
      log('stamp', { card: card.id, choice: o.id })
    }
    window.setTimeout(() => {
      const el = cardRef.current
      const pile = pileRefs.current[o.id]
      if (!el || !pile || reduce) return finish()
      const a = el.getBoundingClientRect()
      const b = pile.getBoundingClientRect()
      const dx = b.left + b.width / 2 - (a.left + a.width / 2)
      const dy = b.top + b.height / 2 - (a.top + a.height / 2)
      const t = tilt(o.id)
      const fly = el.animate(
        [
          { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx * 0.2}px, ${dy * 0.1 - 14}px) scale(.9) rotate(${t / 2}deg)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${dx}px, ${dy}px) scale(.14) rotate(${t}deg)`, opacity: 0.2 },
        ],
        { duration: 420, easing: 'cubic-bezier(.5,0,.4,1)', fill: 'forwards' },
      )
      fly.onfinish = finish
    }, reduce ? 250 : 720)
  }

  const takeBack = (optionId: string) => {
    if (busy.current) return
    const top = [...order].reverse().find((id) => answers[id] === optionId)
    if (!top) return
    const next = { ...answers }
    delete next[top]
    setAnswers(next)
    setOrder((x) => x.filter((id) => id !== top))
    setReturned(top)
    set(next)
    log('undo', { card: top })
  }

  const swipeTarget = (dx: number, dy: number): Option | undefined => {
    if (dx <= -70 && Math.abs(dx) > Math.abs(dy)) return options[0]
    if (dx >= 70 && Math.abs(dx) > Math.abs(dy)) return options[options.length - 1]
    if (options.length > 2 && dy <= -60 && Math.abs(dy) > Math.abs(dx)) return options[Math.floor(options.length / 2)]
    return undefined
  }
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (busy.current || (e.pointerType === 'mouse' && e.button !== 0)) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s0 = start.current
    if (!s0 || s0.id !== e.pointerId) return
    setDrag({ dx: e.clientX - s0.x, dy: Math.min(0, e.clientY - s0.y) })
  }
  const onUp = () => {
    const d = drag
    start.current = null
    setDrag(null)
    const o = d && swipeTarget(d.dx, d.dy)
    if (o) { log('swipe', { choice: o.id }); press(o) }
  }
  const aimed = drag ? swipeTarget(drag.dx, drag.dy)?.id : undefined

  const pile = (id: string) => order.filter((c) => answers[c] === id)
  const missing = p.preview || !left ? undefined : `Stamp ${left} more card${left === 1 ? '' : 's'}`

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy}
      missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <InkFilter />
      <div className="mx-auto flex w-full flex-1 flex-col" data-q={q.id}>
        {}
        <div className="relative min-h-[172px] lg:min-h-[250px]">
          {left > 2 && <div aria-hidden className="absolute inset-x-3 top-3 bottom-[-8px] rounded-[6px] border border-rule-soft bg-[#FBFAF7]" style={{ transform: 'rotate(1.2deg)' }} />}
          {left > 1 && <div aria-hidden className="absolute inset-x-1.5 top-1.5 bottom-[-4px] rounded-[6px] border border-rule-soft bg-[#FDFCFA]" style={{ transform: 'rotate(-0.8deg)' }} />}
          {current ? (
            <div key={current.id} ref={cardRef} data-card={current.id}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              className={`${current.id === returned ? 'v2s-back' : 'v2s-rise'} relative flex touch-none select-none h-full min-h-[172px] flex-col rounded-[6px] border border-[#D9D3C7] bg-ground px-5 pb-4 pt-3.5 shadow-[0_1px_0_#DDD9D2,0_10px_24px_rgba(13,12,11,.08)] lg:min-h-[250px] lg:px-9 lg:pb-7 lg:pt-6`}
              style={{
                backgroundImage: 'linear-gradient(180deg,#FFFFFF,#FCFBF8)',
                translate: drag ? `${drag.dx}px ${drag.dy}px` : '0 0',
                rotate: drag ? `${drag.dx / 24}deg` : '0deg',
                transition: drag ? 'none' : 'translate 160ms ease-out, rotate 160ms ease-out',
              }}>
              <div className="flex items-center justify-between">
                <p className={`${UI} text-[12px] font-semibold uppercase tracking-[0.1em] text-muted lg:text-[13px]`}>
                  <span className="text-bronze">{index + 1}</span> of {cards.length}
                </p>
                {}
                <div aria-hidden className="flex gap-1">
                  {cards.map((c, k) => {
                    const a = answers[c.id]
                    const o = a ? opt(a) : undefined
                    return (
                      <span key={c.id} className={`flex h-[14px] w-[14px] items-center justify-center rounded-[2px] border lg:h-[18px] lg:w-[18px] ${
                        k === index ? 'border-ink' : a ? 'border-[#D9D3C7] bg-[#F3EFE8]' : 'border-rule-soft'}`}>
                        {o && <Mark c={choiceOf(o, options.indexOf(o))} className="h-[9px] w-[9px] text-bronze lg:h-[11px] lg:w-[11px]" />}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-1 items-center py-2 lg:py-4">
                <p className={`${TEXT} text-balance text-[22px] font-semibold leading-[28px] text-ink lg:text-[34px] lg:leading-[42px]`}>
                  {current.label}
                </p>
              </div>
              {current.hint && (
                <p className={`${UI} border-t border-rule-soft pt-2 text-[13px] leading-[17px] text-muted lg:pt-3 lg:text-[15px] lg:leading-[21px]`}>
                  {current.hint}
                </p>
              )}
              {inking && (() => {
                const o = opt(inking)!
                return (
                  <div aria-hidden className="pointer-events-none absolute bottom-3 right-3 lg:bottom-6 lg:right-8" style={{ transform: `rotate(${tilt(inking)}deg)` }}>
                    <div className="v2s-slam"><StampMark c={choiceOf(o, options.indexOf(o))} word={o.label} size={laptop ? 1.15 : 0.82} /></div>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="v2s-rise relative flex h-full min-h-[172px] flex-col items-center justify-center rounded-[6px] border border-dashed border-rule text-center lg:min-h-[250px]">
              <p className={`${TEXT} text-[22px] font-semibold text-ink lg:text-[28px]`}>All {cards.length} stamped.</p>
              <p className={`${UI} mt-1 text-[14px] text-muted lg:text-[15px]`}>To change one, tap its pile.</p>
            </div>
          )}
        </div>

        {}
        <div className="mt-auto grid gap-3 pt-5 lg:gap-6 lg:pt-8" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
          {options.map((o, i) => {
            const c = choiceOf(o, i)
            const on = pile(o.id)
            return (
              <div key={o.id} className="flex flex-col items-center">
                <button type="button" ref={(el) => { pileRefs.current[o.id] = el }} onClick={() => takeBack(o.id)} disabled={!on.length}
                  data-pile={o.id} aria-label={on.length ? `${o.label}: ${on.length}. Take the top card back.` : `${o.label}: none yet`}
                  className="relative mb-1.5 h-[34px] w-[72px] disabled:cursor-default lg:mb-2.5 lg:h-[46px] lg:w-[104px]">
                  {on.length === 0 && <span aria-hidden className="absolute inset-x-1 bottom-0 h-[26px] rounded-[3px] border border-dashed border-rule-soft lg:h-[36px]" />}
                  {on.map((id, k) => (
                    <span key={id} aria-hidden
                      className="v2s-land absolute inset-x-1 bottom-0 flex h-[26px] items-center justify-center rounded-[3px] border border-[#D9D3C7] bg-ground shadow-[0_1px_1px_rgba(13,12,11,.08)] lg:h-[36px]"
                      style={{ transform: `translateY(${-k * 3}px) rotate(${(k % 2 ? 1 : -1) * (1.5 + k)}deg)`, zIndex: k }}>
                      <Mark c={c} className="h-3.5 w-3.5 text-bronze lg:h-4 lg:w-4" />
                    </span>
                  ))}
                  {on.length > 0 && (
                    <span className={`${UI} absolute -right-3 bottom-0.5 z-10 text-[12px] font-semibold tabular-nums text-muted lg:-right-4 lg:text-[14px]`}>{on.length}</span>
                  )}
                </button>
                <button type="button" onClick={() => press(o)} disabled={!current} data-choice={o.id}
                  className={`group flex w-full flex-col items-center outline-none transition-transform disabled:opacity-40 ${inking === o.id ? 'v2s-press' : ''} ${aimed === o.id ? '-translate-y-1' : ''}`}
                  aria-label={`Stamp ${o.label}`}>
                  <StampBody className="block h-[24px] w-[92%] transition-transform group-active:translate-y-[3px] lg:h-[34px]" />
                  <span className={`${UI} flex h-[46px] w-full items-center justify-center gap-1.5 rounded-[4px] border-2 border-ink ${aimed === o.id ? 'bg-[#F3F1EC]' : 'bg-ground'} text-[15px] font-semibold text-ink shadow-[0_3px_0_#0D0C0B] transition-[transform,box-shadow] group-hover:bg-[#F3F1EC] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-forest group-active:translate-y-[3px] group-active:shadow-[0_0_0_#0D0C0B] lg:h-[58px] lg:text-[17px]`}>
                    <Mark c={c} className="h-4 w-4 lg:h-[18px] lg:w-[18px]" />
                    {o.label}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <Styles />
    </V2Frame>
  )
}

function Certificate(p: RenderProps) {
  const { q, set, log } = p
  const picked = typeof p.value === 'string' && q.options.some((o) => o.id === p.value) ? p.value : null
  const [proof, setProof] = useState<string | null>(picked)
  const ot = q.objectText ?? {}
  const pick = (id: string) => {
    setProof(id)
    set(id)
    log('pick', { option: id })
  }
  const missing = p.preview || proof ? undefined : 'Tap one'

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy}
      missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <div className="v2s-cert mx-auto w-full rounded-[4px] bg-ground p-1.5 shadow-[0_10px_24px_rgba(13,12,11,.10)] lg:p-2" data-q={q.id}>
        <div className="relative rounded-[2px] border-2 border-[#B8862B] px-3 pb-1 pt-2 lg:px-8 lg:pb-5 lg:pt-6" style={{ outline: '1px solid #B8862B', outlineOffset: '-6px' }}>
          <div className="flex items-center gap-3 px-1 lg:gap-4">
            {}
            <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 lg:h-12 lg:w-12 ${proof ? 'scale-100 opacity-100' : 'scale-75 opacity-25'}`}
              style={{ background: 'radial-gradient(circle at 35% 30%, #2F6A53, #1F4B3A 70%)', boxShadow: '0 2px 4px rgba(13,12,11,.25), inset 0 0 0 2px rgba(255,255,255,.18)' }}>
              <Mark c="yes" className="h-4 w-4 text-white lg:h-5 lg:w-5" />
            </span>
            <div className="min-w-0">
              <p className={`${UI} text-[11px] font-semibold uppercase tracking-[0.14em] text-bronze lg:text-[12px]`}>{ot.header ?? ''}</p>
              <p className={`${TEXT} text-[15px] italic leading-[18px] text-muted lg:text-[17px] lg:leading-[22px]`}>{ot.line ?? ''}</p>
            </div>
          </div>
          <div role="radiogroup" aria-label={q.question} className="mt-1 lg:mt-4">
            {q.options.map((o, i) => {
              const on = proof === o.id
              return (
                <button key={o.id} type="button" role="radio" aria-checked={on} data-option={o.id} onClick={() => pick(o.id)}
                  className={`group flex min-h-[40px] w-full items-center gap-3 px-1 text-left transition-colors lg:min-h-[52px] lg:gap-4 ${i ? 'border-t border-dotted border-[#CDBF9F]' : ''}`}>
                  <span aria-hidden className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${on ? 'border-forest bg-forest' : 'border-rule bg-white group-hover:border-ink'}`}>
                    {on && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span className={`${on ? `${TEXT} v2s-write text-[17px] font-semibold italic text-ink lg:text-[21px]` : `${UI} text-[15px] text-ink lg:text-[17px]`} leading-[21px] lg:leading-[26px]`}>
                    {o.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <Styles />
    </V2Frame>
  )
}

function Styles() {
  return (
    <style>{`
      @keyframes v2s-rise { from { transform: translateY(8px) scale(.97); opacity: .6; } to { transform: none; opacity: 1; } }
      .v2s-rise { animation: v2s-rise 260ms cubic-bezier(.3,.7,.2,1) both; }
      @keyframes v2s-back { from { transform: translateY(60px) scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
      .v2s-back { animation: v2s-back 320ms cubic-bezier(.2,.8,.2,1) both; }
      @keyframes v2s-slam {
        0% { transform: scale(1.7); opacity: 0; }
        55% { transform: scale(.95); opacity: 1; }
        75% { transform: scale(1.02); }
        100% { transform: scale(1); opacity: 1; }
      }
      .v2s-slam { animation: v2s-slam 230ms cubic-bezier(.5,0,.6,1) both; transform-origin: center; }
      @keyframes v2s-press { 0% { transform: translateY(0); } 30%, 60% { transform: translateY(5px); } 100% { transform: translateY(0); } }
      .v2s-press { animation: v2s-press 420ms ease-out; }
      @keyframes v2s-land { from { opacity: 0; } to { opacity: 1; } }
      .v2s-land { animation: v2s-land 160ms ease-out both; }
      @keyframes v2s-cert { from { transform: translateY(40px) scale(.96); opacity: 0; } to { transform: none; opacity: 1; } }
      .v2s-cert { animation: v2s-cert 480ms cubic-bezier(.2,.8,.2,1) both; }
      @keyframes v2s-write { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
      .v2s-write { animation: v2s-write 520ms ease-out both; }
      @media (prefers-reduced-motion: reduce) { .v2s-rise, .v2s-back, .v2s-slam, .v2s-press, .v2s-cert, .v2s-write { animation: none; } }
    `}</style>
  )
}
