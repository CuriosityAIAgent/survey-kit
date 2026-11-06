import { forwardRef, useId } from 'react'
import { JUG, JUGS, TOTAL_HOURS, type JugLook } from './jugs'
import Patterns, { patId } from './Patterns'

export const VB_W = 200
export const SPOUT = { x: 95, y: 11 }
const FLOOR = 268
const SPAN = 152

const OUTER = 'M79 39 L79 60 C79 80 34 80 34 104 L34 254 Q34 272 52 272 L148 272 Q166 272 166 254 L166 104 C166 80 121 80 121 60 L121 39 Z'
const INNER = 'M83 39 L83 61 C83 84 38 84 38 106 L38 252 Q38 268 54 268 L146 268 Q162 268 162 252 L162 106 C162 84 117 84 117 61 L117 39 Z'

export type Layer = { id: number; jug: string; fresh: boolean }
export type Pour = { id: number; jug: string; from: number }

type Props = {
  layers: Layer[]; pour: Pour | null; kind: 'pour' | 'back'; className?: string
  total?: number; looks?: Record<string, JugLook>
}

const BottleArt = forwardRef<SVGSVGElement, Props>(function BottleArt(
  { layers, pour, kind, className, total = TOTAL_HOURS, looks = JUG as Record<string, JugLook> }, ref,
) {
  const u = useId().replace(/:/g, '')
  const HOUR = SPAN / total
  const levelY = (k: number) => FLOOR - HOUR * k
  const look = (id: string): JugLook => looks[id] ?? JUGS[0]
  const level = layers.length
  const full = level >= total
  const top = layers[level - 1]
  const rising = kind === 'pour'
  return (
    <svg ref={ref} viewBox="0 0 200 290" className={className} role="img"
      aria-label={`A bottle with ${level} of ${total} hours poured`}>
      <defs>
        <clipPath id={`${u}-in`}><path d={INNER} /></clipPath>
        <linearGradient id={`${u}-glass`} x1="0" x2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="0.5" stopColor="#EEF1EF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#E3E6E3" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`${u}-shade`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.26" />
          <stop offset="0.18" stopColor="#000" stopOpacity="0.04" />
          <stop offset="0.38" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.62" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.30" />
        </linearGradient>
        <radialGradient id={`${u}-floor`}>
          <stop offset="0" stopColor="#0D0C0B" stopOpacity="0.20" />
          <stop offset="1" stopColor="#0D0C0B" stopOpacity="0" />
        </radialGradient>
        <Patterns prefix={u} looks={Object.values(looks)} />
      </defs>

      {}
      <ellipse cx="100" cy="275" rx="80" ry="9" fill={`url(#${u}-floor)`} />

      {}
      <path d={OUTER} fill={`url(#${u}-glass)`} />
      <rect x="75" y="30" width="50" height="9" rx="2.5" fill={`url(#${u}-glass)`} stroke="#8C857A" strokeOpacity="0.8" strokeWidth="1.2" />

      {}
      <g clipPath={`url(#${u}-in)`}>
        {layers.map((l, k) => {
          const j = look(l.jug)
          const h = k === 0 ? HOUR + 10 : HOUR + 0.6
          return (
            <g key={l.id} className="bt-slide" style={{ transform: `translateY(${levelY(k)}px)` }}>
              <g className={l.fresh ? 'bt-rise' : undefined}>
                <rect x="36" y={-HOUR} width="128" height={h} fill={j.color} />
                <rect x="36" y={-HOUR} width="128" height={h} fill={`url(#${patId(u, j)})`} />
              </g>
            </g>
          )
        })}
        {}
        {level > 0 && (
          <rect x="36" y="0" width="128" height="290" fill={`url(#${u}-shade)`} className="bt-slide"
            style={{ transform: `translateY(${levelY(level)}px)`, transitionDelay: rising ? '600ms' : '0ms', transitionDuration: rising ? '520ms' : '320ms' }} />
        )}
        {}
        <g className="bt-slide" style={{ transform: `translateY(${levelY(level)}px)`, opacity: level ? 1 : 0, transitionDelay: rising ? '600ms' : '0ms', transitionDuration: rising ? '520ms' : '320ms' }}>
          <g key={pour?.id ?? 'still'} className={pour ? 'bt-settle' : undefined}>
            <ellipse cx="100" cy="0" rx="62" ry="3.2" fill={top ? look(top.jug).light : 'transparent'} opacity="0.9"
              style={{ transition: `fill 0s ${rising ? '600ms' : '0ms'}` }} />
            <ellipse cx="86" cy="-0.6" rx="30" ry="0.9" fill="#fff" opacity="0.45" />
          </g>
        </g>
        {}
        {pour && (
          <ellipse key={`s${pour.id}`} cx={SPOUT.x + 3.5} cy={levelY(pour.from)} rx="14" ry="2.4" fill="none"
            stroke="#fff" strokeWidth="1.2" className="bt-splash" />
        )}
      </g>

      {}
      {pour && (
        <path key={`p${pour.id}`} d={`M${SPOUT.x} ${SPOUT.y} Q${SPOUT.x + 3.5} ${SPOUT.y + 3} ${SPOUT.x + 3.5} ${SPOUT.y + 12} L${SPOUT.x + 3.5} ${levelY(pour.from) + 1}`}
          pathLength={100} fill="none" stroke={look(pour.jug).color} strokeWidth="4.2" strokeLinecap="round"
          strokeDasharray="100 100" className="bt-stream" />
      )}

      {}
      {Array.from({ length: total }, (_, i) => i + 1).map((k) => (
        <g key={k}>
          <line x1="39" x2="161" y1={levelY(k)} y2={levelY(k)} stroke="#6B6761" strokeOpacity={k === total ? 0.5 : 0.22} strokeWidth="0.7"
            strokeDasharray={k === total ? '3 2' : undefined} />
          <line x1="39" x2="50" y1={levelY(k)} y2={levelY(k)} stroke="#494540" strokeOpacity="0.55" strokeWidth="1" />
        </g>
      ))}

      {}
      <path d={INNER} fill="none" stroke="#8C857A" strokeOpacity="0.28" strokeWidth="1" />
      <path d={OUTER} fill="none" stroke="#7D776E" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="46" y="112" width="7" height="138" rx="3.5" fill="#fff" opacity="0.55" />
      <rect x="57" y="118" width="2.2" height="120" rx="1.1" fill="#fff" opacity="0.4" />
      <rect x="150" y="116" width="3" height="128" rx="1.5" fill="#fff" opacity="0.32" />
      <path d="M52 99 C58 90 72 86 83 80" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
      <rect x="87" y="42" width="3" height="22" rx="1.5" fill="#fff" opacity="0.55" />

      {}
      {full && (
        <g className="bt-cap">
          <rect x="72" y="19" width="56" height="21" rx="3" fill="#2B2723" />
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1={78 + i * 5.5} x2={78 + i * 5.5} y1="22" y2="38" stroke="#fff" strokeOpacity="0.10" strokeWidth="1.4" />
          ))}
          <rect x="75" y="21" width="50" height="3" rx="1.5" fill="#fff" opacity="0.2" />
        </g>
      )}
    </svg>
  )
})

export default BottleArt

export const BOTTLE_CSS = `
.bt-slide { transition: transform 320ms cubic-bezier(.3,.7,.3,1); }
.bt-rise { transform-box: fill-box; transform-origin: 50% 100%; animation: bt-rise 540ms cubic-bezier(.25,.8,.35,1) 600ms both; }
@keyframes bt-rise { 0% { transform: scaleY(0) } 65% { transform: scaleY(1.09) } 84% { transform: scaleY(.97) } 100% { transform: scaleY(1) } }
.bt-stream { animation: bt-stream 1150ms linear both; }
@keyframes bt-stream { 0%, 44% { stroke-dashoffset: 100 } 54% { stroke-dashoffset: 0 } 80% { stroke-dashoffset: 0 } 91%, 100% { stroke-dashoffset: -100 } }
.bt-splash { transform-box: fill-box; transform-origin: center; animation: bt-splash 560ms ease-out 580ms both; }
@keyframes bt-splash { 0% { opacity: 0; transform: scale(.2, .5) } 25% { opacity: .75 } 100% { opacity: 0; transform: scale(1.7, 1.3) } }
.bt-settle { transform-box: fill-box; transform-origin: center; animation: bt-settle 820ms ease-out 1080ms both; }
@keyframes bt-settle { 0% { transform: scaleY(1) } 22% { transform: scaleY(1.7) } 50% { transform: scaleY(.6) } 76% { transform: scaleY(1.2) } 100% { transform: scaleY(1) } }
.bt-cap { animation: bt-cap 480ms cubic-bezier(.3,1.5,.55,1) 1150ms both; }
@keyframes bt-cap { 0% { transform: translateY(-34px); opacity: 0 } 35% { opacity: 1 } 100% { transform: translateY(0); opacity: 1 } }
.bt-pop { animation: bt-pop 380ms cubic-bezier(.3,1.4,.5,1); display: inline-block; }
@keyframes bt-pop { 0% { transform: scale(1.45) } 100% { transform: scale(1) } }
.bt-done { animation: bt-done 600ms ease-out 1200ms both; }
.bt-hint { transform-origin: 50% 90%; animation: bt-hint 620ms cubic-bezier(.3,.7,.3,1) both; }
@keyframes bt-hint { 0%, 100% { transform: none } 40% { transform: translateY(-7px) rotate(10deg) } 70% { transform: translateY(0) rotate(-2deg) } }
@keyframes bt-done { 0% { opacity: 0; transform: translateY(4px) } 100% { opacity: 1; transform: none } }
`
