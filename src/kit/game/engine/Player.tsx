'use client'

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import V2Frame from '../V2Frame'
import { RENDERERS } from '../render'
import type { RenderProps } from '../render/contract'
import { ENDING, PRIVACY, BLOCK_ORDER, type Answer, type Channel, type Question } from '../questions'
import { useV2, viewOf, response, type Viewport } from './store'
import { channelFor, isPreviewUrl, readToken } from './link'
import { emptyFor, nextCursor, type View } from './flow'
import { sendResponse } from './send'
import Welcome from './Welcome'
import { Journey, useWalk } from './Journey'

const UI = 'font-[family-name:var(--font-ui)]'
const LEAVE_MS = 220
const BUSY_MS = 300

export default function Player({ preview: forcePreview = false }: { preview?: boolean }) {
  const s = useV2()
  const [mounted, setMounted] = useState(false)
  const [measured, setMeasured] = useState<Channel>('phone')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const g = useV2.getState()
    g.setToken(readToken(window.location.search))
    g.setPreview(forcePreview || isPreviewUrl(window.location.pathname, window.location.search))
    const measure = () => setMeasured(channelFor(window.innerWidth, window.innerHeight, window.location.search))
    measure()
    // ?at=<id>: open on that screen (preview only), e.g. from the kit's contents page
    const at = new URLSearchParams(window.location.search).get('at')
    // a laptop-only screen opened on a phone falls back to the laptop layout rather than the welcome
    if (at && !g.jumpTo(at, channelFor(window.innerWidth, window.innerHeight, window.location.search))) g.jumpTo(at, 'desk')
    window.addEventListener('resize', measure)
    const body = document.body, html = document.documentElement
    const prev = { bg: body.style.background, hbg: html.style.background }
    body.style.background = '#F8F7F4'; html.style.background = '#F8F7F4'
    setMounted(true)
    return () => {
      window.removeEventListener('resize', measure)
      body.style.background = prev.bg; html.style.background = prev.hbg
    }
  }, [forcePreview])

  const view = viewOf(s)
  const channel: Channel = s.channel ?? measured

  const busyUntil = useRef(0)
  const leaving = useRef(false)
  useEffect(() => {
    if (!mounted) return
    busyUntil.current = performance.now() + BUSY_MS
    leaving.current = false
    window.scrollTo(0, 0)
    const f = requestAnimationFrame(() => {
      const h = root.current?.querySelector<HTMLElement>('h1')
      if (!h) return
      h.setAttribute('tabindex', '-1')
      h.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(f)
  }, [view.key, mounted])

  const advance = useCallback((fn: () => void) => {
    if (leaving.current || performance.now() < busyUntil.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const obj = root.current?.querySelector<HTMLElement>('[data-object]')
    if (reduced || !obj) return fn()
    leaving.current = true
    obj.classList.add('v2-leave')
    const from = root.current?.dataset.step
    window.setTimeout(() => {
      leaving.current = false
      fn()

      requestAnimationFrame(() => { if (root.current?.dataset.step === from) obj.classList.remove('v2-leave') })
    }, LEAVE_MS)
  }, [])

  const ready = useCallback(() => !leaving.current && performance.now() >= busyUntil.current, [])

  const canBack = s.started && !s.finished && view.kind !== 'welcome'
  const sentinel = useRef(false)
  const skipPop = useRef(0)
  useEffect(() => {
    if (!mounted) return
    if (canBack && !sentinel.current) {
      window.history.pushState({ kitGame: 1 }, '')
      sentinel.current = true
    } else if (!canBack && sentinel.current) {
      sentinel.current = false
      skipPop.current++
      window.history.back()
    }
  }, [canBack, mounted])
  useEffect(() => {
    const onPop = () => {
      if (skipPop.current > 0) { skipPop.current--; return }
      if (!sentinel.current) return
      sentinel.current = false
      useV2.getState().back()
      const after = useV2.getState()
      if (after.started && !after.finished && viewOf(after).kind !== 'welcome') {
        window.history.pushState({ kitGame: 1 }, '')
        sentinel.current = true
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (!mounted) return <div className="min-h-dvh bg-paper" />

  return (
    <div ref={root} className="min-h-dvh bg-paper" data-v2 data-step={view.key} data-kind={view.kind}
      data-channel={channel} data-n={'n' in view ? view.n : 0} data-total={'total' in view ? view.total : 0}
      data-preview={s.preview ? 'true' : 'false'} data-finished={s.finished ? 'true' : 'false'}>
      <style>{`
[data-v2] h1[tabindex="-1"]:focus { outline: none }
`}</style>
      <Screen view={view} channel={channel} advance={advance} ready={ready} />
      {/* back to the kit's contents (laptop only: a phone has no margin for it) */}
      {channel === 'desk' && (
        <a href="/kit/index.html#game" className={`${UI} fixed left-6 top-5 z-20 rounded-[3px] bg-paper/80 px-2 py-1 text-[13px] text-muted underline decoration-rule underline-offset-4 hover:text-ink`}>
          ‹ Survey kit
        </a>
      )}
    </div>
  )
}

function Screen({ view, channel, advance, ready }: { view: View; channel: Channel; advance: (fn: () => void) => void; ready: () => boolean }) {
  const g = useV2.getState
  const segment = useV2((x) => x.segment)
  const preview = useV2((x) => x.preview)
  const started = useV2((x) => x.started)

  switch (view.kind) {
    case 'welcome':
      return (
        <Welcome channel={channel} preview={preview} ask={{ business: false, cohort: false }}
          business={segment.business} cohort={segment.cohort}
          onBusiness={(b) => g().setSegment({ business: b })} onCohort={(c) => g().setSegment({ cohort: c })}
          resumed={started}
          onStart={() => g().begin(channel, viewport())} />
      )
    case 'break':
      return <Break key={view.key} view={view} onNext={() => advance(() => g().next(view.key))} onBack={() => g().back(view.key)} />
    case 'end':
      return <Ending key="end" view={view} preview={preview} />
    default:
      return <Ask key={view.key} view={view} channel={channel} advance={advance} ready={ready} />
  }
}

function Ask({ view, channel, advance, ready }: {
  view: Extract<View, { kind: 'question' | 'follow' | 'scene' }>; channel: Channel; advance: (fn: () => void) => void; ready: () => boolean
}) {
  const q = view.q
  const value = useV2((x) => x.answers[q.stores])
  const preview = useV2((x) => x.preview)
  const seed = useV2((x) => x.seed)

  const last = useV2((x) => view.kind !== 'scene' && !!x.channel && nextCursor(x.channel, x.cursor, x.answers, x.preview) === 'end')
  const [send, setSend] = useState<'idle' | 'sending' | 'failed'>('idle')
  const sending = useRef(false)
  const key = view.key
  const set = useCallback((v: Answer) => useV2.getState().set(q.stores, v), [q.stores])
  const log = useCallback((type: string, data?: Record<string, unknown>) => useV2.getState().log(type, data, q.stores), [q.stores])
  const onNext = useCallback(() => {
    const g = useV2.getState()
    if (!last || g.preview) { advance(() => useV2.getState().next(key)); return }
    if (sending.current || !ready()) return
    sending.current = true
    setSend('sending')

    let answers = g.answers
    const e = emptyFor(q)
    if (answers[q.stores] === undefined && e !== undefined) answers = { ...answers, [q.stores]: e }
    g.log('send', undefined, q.stores)
    const s = useV2.getState()
    void sendResponse(response({ ...s, answers, finished: true, tEnd: Date.now() })).then((result) => {
      sending.current = false
      const now = useV2.getState()
      if (result === 'failed') { setSend('failed'); now.log('send-failed', undefined, q.stores); return }

      now.log(result === 'sent' ? 'sent' : 'not-collected', undefined, q.stores)
      if (now.answers[q.stores] === undefined && e !== undefined) now.set(q.stores, e)
      now.next(key)
    })
  }, [advance, key, last, q, ready])
  const onBack = useCallback(() => { if (!sending.current) useV2.getState().back(key) }, [key])
  const R = RENDERERS[q.template]
  const nextLabel = !last ? undefined : preview ? 'Finish the preview' : send === 'failed' ? ENDING.retry : ENDING.send
  const busy = last && send === 'sending' ? ENDING.sending : undefined
  const props: RenderProps = useMemo(() => ({
    q, channel, value, set, log, step: view.n, total: view.total,
    bridge: view.kind === 'follow' ? view.bridge : undefined,
    preview, onNext, onBack, seed, nextLabel, busy,
  }), [q, channel, value, set, log, view, preview, onNext, onBack, seed, nextLabel, busy])
  return (
    <RenderGuard q={q} props={props} onError={(e) => useV2.getState().log('render-error', { id: q.id, message: String(e).slice(0, 300) })}>
      <R {...props} />
    </RenderGuard>
  )
}

class RenderGuard extends Component<{ q: Question; props: RenderProps; onError: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e: unknown) { this.props.onError(e) }
  render() {
    if (!this.state.failed) return this.props.children
    const { q, props } = this.props
    return (
      <V2Frame block={q.block} step={props.step} total={props.total} question={q.question} instruction={q.instruction}
        bridge={props.bridge} onNext={props.onNext} onBack={props.onBack}>
        <p data-render-error className={`${UI} rounded-[3px] border border-dashed border-rule px-4 py-6 text-center text-[15px] text-muted`}>
          This question didn&rsquo;t load. Please tap Next to carry on.
        </p>
      </V2Frame>
    )
  }
}

function Break({ view, onNext, onBack }: { view: Extract<View, { kind: 'break' }>; onNext: () => void; onBack: () => void }) {
  const from = BLOCK_ORDER.indexOf(view.from)
  const to = BLOCK_ORDER.indexOf(view.block)
  const { pos, done } = useWalk(from, 1200, 300)
  const n = view.count
  return (
    <V2Frame block={view.block} step={view.n} total={view.total}
      railLabel={`Section ${view.section} of ${view.sections}`}
      question={view.name} instruction={view.line}
      onNext={onNext} onBack={onBack}>
      <div className="flex flex-1 flex-col items-center justify-center" data-break={view.block}>
        <Journey reached={done ? to : from} walking={!done} pos={pos} highlight={done ? to : undefined} className="max-h-[260px]" />
        <p className={`${UI} mt-3 text-center text-[14px] leading-[19px] text-muted`}>
          {n} {n === 1 ? 'question' : 'questions'} in this section
        </p>
      </div>
    </V2Frame>
  )
}

function Ending({ view, preview }: { view: Extract<View, { kind: 'end' }>; preview: boolean }) {
  const { pos, done } = useWalk(4, 1800, 450)

  const sent = useV2((s) => s.events.some((e) => e.type === 'sent'))
  const again = () => {
    const g = useV2.getState()
    g.reset(); g.setPreview(true)
  }
  return (
    <V2Frame block="last" step={view.total} total={view.total} railLabel=""
      question={ENDING.line} instruction={sent && !preview ? ENDING.thanks : ENDING.notSent}
      nextLabel={preview ? 'Start the preview again' : undefined}
      noNext={!preview}
      onNext={preview ? again : undefined}>
      <div className="flex flex-1 flex-col items-center justify-center" data-ending>
        <Journey reached={done ? 5 : 4} walking={!done} pos={pos} flag={done} className="max-h-[260px]" />
        <p className={`${UI} mt-4 max-w-[46ch] text-center text-[13px] leading-[18px] text-muted`}>{PRIVACY}</p>
      </div>
    </V2Frame>
  )
}

function viewport(): Viewport {
  const fine = !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
  return { w: window.innerWidth, h: window.innerHeight, pointer: fine ? 'fine' : 'coarse', dpr: window.devicePixelRatio || 1 }
}
