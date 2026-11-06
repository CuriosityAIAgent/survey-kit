import { useId } from 'react'
import type { JugLook } from './jugs'

export const SPOUT_ORIGIN = '93.75% 13.3%'

const BODY = 'M15 13 L51 13 L60.5 8.5 L56.5 16 C53 20 52 24 53 31 C55 45 51.5 57 41 58 L25 58 C14.5 57 11 45 13 31 C14 24 13 18 15 13 Z'

export default function JugArt({ jug, className }: { jug: JugLook; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const shade = `${uid}-shade`, clip = `${uid}-clip`, pat = `${uid}-pat`
  const ink = 'rgba(248,247,244,0.28)'
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={shade} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="0.28" stopColor="#fff" stopOpacity="0.26" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.30" />
        </linearGradient>
        <clipPath id={clip}><path d={BODY} /></clipPath>
        <pattern id={pat} width="6" height="6" patternUnits="userSpaceOnUse">
          {jug.pattern === 'diag' && <path d="M-1 7 L7 -1" stroke={ink} strokeWidth="1.1" />}
          {jug.pattern === 'back' && <path d="M-1 -1 L7 7" stroke={ink} strokeWidth="1.1" />}
          {jug.pattern === 'dots' && <circle cx="3" cy="3" r="1" fill={ink} />}
          {jug.pattern === 'vert' && <path d="M3 0 V6" stroke={ink} strokeWidth="1" />}
          {jug.pattern === 'grid' && <path d="M0 3 H6 M3 0 V6" stroke={ink} strokeWidth="0.7" />}
        </pattern>
      </defs>
      <ellipse cx="33" cy="60" rx="19" ry="2.6" fill="#0D0C0B" opacity="0.14" />
      {}
      <path d="M15.5 21 C5 20 4 41 14.5 43" fill="none" stroke={jug.dark} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M15 21.5 C7 21.5 6.5 39 14 41.5" fill="none" stroke={jug.light} strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
      {}
      <path d={BODY} fill={jug.color} />
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="30" width="64" height="30" fill={`url(#${pat})`} />
        <rect x="0" y="0" width="64" height="64" fill={`url(#${shade})`} />
        <rect x="18" y="20" width="3.2" height="26" rx="1.6" fill="#fff" opacity="0.30" />
      </g>
      {}
      <path d="M15 13 L51 13 L60.5 8.5" fill="none" stroke={jug.light} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
      <ellipse cx="33" cy="14.2" rx="16.5" ry="2.3" fill={jug.dark} />
      <path d={BODY} fill="none" stroke={jug.dark} strokeOpacity="0.55" strokeWidth="0.8" />
    </svg>
  )
}
