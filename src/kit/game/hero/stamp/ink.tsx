'use client'

export type Choice = 'yes' | 'unsure' | 'no'

export type Glyph = 'cross' | 'query' | 'tick'
export const GLYPH: Record<Glyph, Choice> = { tick: 'yes', query: 'unsure', cross: 'no' }

const INK = '#7A3E12'
const WORD: Record<Choice, string> = { yes: 'YES', unsure: 'NOT SURE', no: 'NO' }

export function Mark({ c, className }: { c: Choice; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {c === 'yes' && <path d="M3 8.5 L6.5 12 L13 4.5" />}
      {c === 'no' && <path d="M4 4 L12 12 M12 4 L4 12" />}
      {c === 'unsure' && (
        <>
          <path d="M5.2 5.6 C5.2 3.9 6.5 3 8 3 C9.6 3 10.8 4 10.8 5.4 C10.8 7.4 8 7.4 8 9.6" />
          <circle cx="8" cy="12.9" r="0.6" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  )
}

export function InkFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <filter id="v2s-ink" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.2 0 0 0 2.7" result="wear" />
          <feComposite in="SourceGraphic" in2="wear" operator="in" result="worn" />
          <feDisplacementMap in="worn" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}

export function StampMark({ c, size = 1, word }: { c: Choice; size?: number; word?: string }) {
  const text = (word ?? WORD[c]).toUpperCase()
  const w = word ? Math.round(70 + text.length * 17.5) : c === 'unsure' ? 212 : c === 'yes' ? 150 : 132
  const h = 60
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w * size} height={h * size} aria-hidden style={{ mixBlendMode: 'multiply', opacity: 0.9 }}>
      <g filter="url(#v2s-ink)">
        <rect x="2.5" y="2.5" width={w - 5} height={h - 5} rx="7" fill="none" stroke={INK} strokeWidth="3.6" />
        <rect x="8.5" y="8.5" width={w - 17} height={h - 17} rx="3.5" fill="none" stroke={INK} strokeWidth="1.3" />
        <g transform="translate(18 16) scale(1.75)" stroke={INK} fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          {c === 'yes' && <path d="M3 8.5 L6.5 12 L13 4.5" />}
          {c === 'no' && <path d="M4 4 L12 12 M12 4 L4 12" />}
          {c === 'unsure' && (
            <>
              <path d="M5.2 5.6 C5.2 3.9 6.5 3 8 3 C9.6 3 10.8 4 10.8 5.4 C10.8 7.4 8 7.4 8 9.6" />
              <circle cx="8" cy="12.9" r="0.7" fill={INK} stroke="none" />
            </>
          )}
        </g>
        <text x="52" y="39.5" fill={INK} fontFamily="Archivo, Arial, sans-serif" fontWeight="700" fontSize="24" letterSpacing="2.5">
          {text}
        </text>
      </g>
    </svg>
  )
}
