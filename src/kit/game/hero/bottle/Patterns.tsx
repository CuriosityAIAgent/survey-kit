import { JUGS, type JugLook } from './jugs'

export const patId = (prefix: string, j: JugLook) => `${prefix}-pat-${j.id}`

export default function Patterns({ prefix, size = 7, looks = JUGS }: { prefix: string; size?: number; looks?: JugLook[] }) {
  const s = size
  const ink = 'rgba(248,247,244,0.26)'
  return (
    <>
      {looks.map((j) => (
        <pattern key={j.id} id={patId(prefix, j)} width={s} height={s} patternUnits="userSpaceOnUse">
          {j.pattern === 'diag' && <path d={`M-1 ${s + 1} L${s + 1} -1`} stroke={ink} strokeWidth={s * 0.17} />}
          {j.pattern === 'back' && <path d={`M-1 -1 L${s + 1} ${s + 1}`} stroke={ink} strokeWidth={s * 0.17} />}
          {j.pattern === 'dots' && <circle cx={s / 2} cy={s / 2} r={s * 0.16} fill={ink} />}
          {j.pattern === 'vert' && <path d={`M${s / 2} 0 V${s}`} stroke={ink} strokeWidth={s * 0.16} />}
          {j.pattern === 'grid' && <path d={`M0 ${s / 2} H${s} M${s / 2} 0 V${s}`} stroke={ink} strokeWidth={s * 0.1} />}
        </pattern>
      ))}
    </>
  )
}
