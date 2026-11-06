import type { Answer, Channel, Question } from '../questions'

export type RenderProps = {
  q: Question
  channel: Channel

  value: Answer | undefined

  set: (v: Answer) => void

  log: (type: string, data?: Record<string, unknown>) => void

  step: number
  total: number

  bridge?: string

  preview: boolean

  onNext: () => void
  onBack: () => void

  seed: number

  nextLabel?: string

  busy?: string
}
