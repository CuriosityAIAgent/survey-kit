'use client'

import V2Frame from '../V2Frame'
import Track from '../ui/templates/Track'
import type { RenderProps } from './contract'
import { asId, useFit } from './checklist'

export default function TrackRender(p: RenderProps) {
  const { q } = p
  const stops = q.constraints.stops ?? []
  const v = asId(p.value)
  const at = stops.findIndex((s) => s.id === v)
  const out = q.options.find((o) => o.id === v)?.id ?? null
  const t = q.objectText ?? {}
  const density = useFit(1, [q.id])
  const missing = at >= 0 || out || p.preview ? undefined : 'Tap one'

  return (
    <V2Frame block={q.block} step={p.step} total={p.total} question={q.question} instruction={q.instruction}
      bridge={p.bridge} note={q.note} privacy={q.privacy} missing={missing} onNext={p.onNext} onBack={p.onBack}>
      <div data-q={q.id} className={p.bridge ? 'v2-rise' : ''}>
        <Track
          key={q.id}
          label={q.question}
          stops={stops.map((s) => s.label)}
          stopIds={stops.map((s) => s.id)}
          value={at >= 0 ? at : null}
          onChange={(i) => { if (i !== null && stops[i]) p.set(stops[i].id) }}
          readoutLead={t.lead}
          anchorLabel={t.marker}
          startLabel={t.start}
          endLabel={t.end}
          fillFrom={t.marker || t.fill === 'centre' ? 'centre' : 'start'}
          optOuts={q.options.map((o) => ({ id: o.id, label: o.label }))}
          optedOutId={out}
          onOptOutId={(id) => p.set(id ?? '')}
          density={density}
        />
      </div>
    </V2Frame>
  )
}
