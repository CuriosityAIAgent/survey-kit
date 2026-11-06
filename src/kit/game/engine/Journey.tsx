'use client'

import { useEffect, useState } from 'react'
import { BLOCK_MARK, BLOCK_NAME } from '../contract'
import { BLOCK_ORDER } from '../questions'

const STOPS: [number, number][] = [[72, 252], [186, 222], [292, 170], [382, 140], [446, 90], [494, 44]]
const SECTIONS = BLOCK_ORDER.map((b) => BLOCK_NAME[b])
const MARKS = BLOCK_ORDER.map((b) => BLOCK_MARK[b])

function legPath(i: number) {
  const [x0, y0] = STOPS[i]
  const [x1, y1] = STOPS[i + 1]

  const mx = (x0 + x1) / 2 + (i % 2 ? -18 : 18)
  const my = (y0 + y1) / 2 + 6
  return `M${x0} ${y0} Q${mx} ${my} ${x1} ${y1}`
}

export type Pos = { x: number; y: number; dir: number }

export function useWalk(leg: number, ms: number, wait: number) {
  const start = STOPS[Math.max(0, leg)]
  const [pos, setPos] = useState<Pos>({ x: start[0], y: start[1], dir: 1 })
  const [done, setDone] = useState(leg < 0)
  useEffect(() => {
    if (leg < 0) return
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', legPath(leg))
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.style.position = 'absolute'; svg.style.width = '0'; svg.style.height = '0'
    svg.appendChild(path); document.body.appendChild(svg)
    const len = path.getTotalLength()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const end = () => { const p = path.getPointAtLength(len); setPos({ x: p.x, y: p.y, dir: 1 }); setDone(true) }
    const timer = window.setTimeout(() => {
      if (reduced) return end()
      const t0 = performance.now()
      const step = (now: number) => {
        const u = Math.min(1, (now - t0) / ms)
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
        const a = path.getPointAtLength(e * len)
        const b = path.getPointAtLength(Math.min(len, e * len + 1))
        setPos({ x: a.x, y: a.y, dir: b.x >= a.x ? 1 : -1 })
        if (u < 1) raf = requestAnimationFrame(step)
        else end()
      }
      raf = requestAnimationFrame(step)
    }, reduced ? 0 : wait)
    return () => { window.clearTimeout(timer); cancelAnimationFrame(raf); svg.remove() }
  }, [leg, ms, wait])
  return { pos, done }
}

export function Journey({ reached, walking, pos, highlight, flag, className = '' }: {

  reached: number
  walking: boolean
  pos: Pos

  highlight?: number
  flag?: boolean
  className?: string
}) {
  const label = flag
    ? 'The figure reaches the top of the mountain.'
    : highlight !== undefined
      ? `The figure walks on to the next section: ${SECTIONS[highlight]}.`
      : 'A mountain with five markers, one per section. The figure stands at the first.'
  return (
    <div className={`relative mx-auto w-full max-w-[560px] ${className}`}>
      <svg viewBox="0 0 640 280" className="block h-full w-full" role="img" aria-label={label} preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="v2e-mtn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#EDE9E1" />
            <stop offset="1" stopColor="#F8F7F4" />
          </linearGradient>
        </defs>
        {}
        <path d="M0 262 L60 226 L110 236 L200 176 L250 188 L420 104 L470 120 L560 70 L640 112 L640 262 Z" fill="#F2EFE9" />
        {}
        <path d="M18 262 L140 196 L176 204 L300 122 L330 130 L500 34 L566 92 L604 116 L640 146 L640 262 Z" fill="url(#v2e-mtn)" />
        <path d="M18 262 L140 196 L176 204 L300 122 L330 130 L500 34 L566 92 L604 116 L640 146" fill="none" stroke="#8C857A" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M480 50 L500 34 L521 51 L510 47 L500 54 L490 47 Z" fill="#FFFFFF" opacity="0.9" />
        {}
        <path d="M0 262 L640 262" stroke="#8C857A" strokeWidth="1.2" />
        {[40, 58, 118, 560, 584, 612].map((x, i) => (
          <path key={i} d={`M${x} ${262 - 14 - (i % 2) * 4} L${x + 6} 262 L${x - 6} 262 Z`} fill="#1F4B3A" opacity="0.8" />
        ))}

        {}
        {STOPS.slice(0, -1).map((_, i) => (
          <path key={i} d={legPath(i)} fill="none" strokeLinecap="round"
            stroke={i < reached ? '#1F4B3A' : '#B7B0A4'} strokeWidth={i < reached ? 2.2 : 1.6}
            strokeDasharray={i < reached ? undefined : '3 5'} />
        ))}
        {}
        {STOPS.slice(0, 5).map(([x, y], i) => (
          <g key={i}>
            {highlight === i && <circle cx={x} cy={y} r="14" fill="#B8862B" opacity="0.18" className="v2e-pulse" style={{ transformOrigin: `${x}px ${y}px` }} />}
            <circle cx={x} cy={y} r="5.5" fill={i <= reached ? '#1F4B3A' : '#F8F7F4'} stroke={highlight === i ? '#B8862B' : i <= reached ? '#1F4B3A' : '#8C857A'} strokeWidth={highlight === i ? 2.5 : 1.5} />
          </g>
        ))}
        {highlight !== undefined && (
          <text x={STOPS[highlight][0] - 26} y={STOPS[highlight][1] + 6} textAnchor="end"
            className="v2-ready" style={{ font: '600 20px var(--font-ui)', fill: '#0D0C0B' }}>{MARKS[highlight]}</text>
        )}
        {}
        <line x1="508" y1="40" x2="508" y2={flag ? 10 : 40} stroke="#0D0C0B" strokeWidth="1.6" style={{ transition: 'all .5s cubic-bezier(.2,.8,.3,1) .15s' }} />
        <path d="M508 10 L530 16 L508 22 Z" fill="#B8862B" style={{ opacity: flag ? 1 : 0, transition: 'opacity .3s .55s' }} />

        <Figure x={pos.x} y={pos.y} dir={pos.dir} walking={walking} />
      </svg>
      <style>{`
@keyframes v2e-pulse-k { 0% { transform: scale(.6); opacity: .5 } 100% { transform: scale(1.6); opacity: 0 } }
.v2e-pulse { animation: v2e-pulse-k 1.1s ease-out 2 }
@keyframes v2e-legA { 0%,100% { transform: rotate(22deg) } 50% { transform: rotate(-22deg) } }
@keyframes v2e-legB { 0%,100% { transform: rotate(-22deg) } 50% { transform: rotate(22deg) } }
@keyframes v2e-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-1.2px) } }
.v2e-walk .v2e-la { animation: v2e-legA .42s linear infinite }
.v2e-walk .v2e-lb { animation: v2e-legB .42s linear infinite }
.v2e-walk .v2e-body { animation: v2e-bob .21s linear infinite }
@media (prefers-reduced-motion: reduce) { .v2e-pulse, .v2e-walk .v2e-la, .v2e-walk .v2e-lb, .v2e-walk .v2e-body { animation: none } }
`}</style>
    </div>
  )
}

function Figure({ x, y, dir, walking }: Pos & { walking: boolean }) {
  return (
    <g transform={`translate(${x} ${y - 3}) scale(${dir} 1)`} className={walking ? 'v2e-walk' : ''}>
      <ellipse cx="0" cy="3" rx="7" ry="1.8" fill="#0D0C0B" opacity="0.12" />
      <g className="v2e-la" style={{ transformOrigin: '0px -12px' }}>
        <line x1="0" y1="-12" x2="0" y2="0" stroke="#0D0C0B" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <g className="v2e-lb" style={{ transformOrigin: '0px -12px' }}>
        <line x1="0" y1="-12" x2="0" y2="0" stroke="#0D0C0B" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <g className="v2e-body">
        <rect x="-6.5" y="-24" width="5" height="9" rx="1.5" fill="#7A3E12" />
        <line x1="0" y1="-24" x2="0" y2="-12" stroke="#0D0C0B" strokeWidth="3" strokeLinecap="round" />
        <line x1="0" y1="-21" x2="5" y2="-15" stroke="#0D0C0B" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="0.5" cy="-28.5" r="3.6" fill="#0D0C0B" />
      </g>
    </g>
  )
}
