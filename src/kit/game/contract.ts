/* The screen contract. Every screen is one centred column, top to bottom:
     R  rail      Back · a small mountain line with a dot · "Question 13 of 17"
     Q  question  one plain question + one grey instruction line with the exact count
     O  object    the thing you play with; its state is the answer
     T  tray      the parts you add (tiles, jugs), directly under the object, only if needed
     N  next      always in the same place; while incomplete it is disabled and says what's missing */
import type { ReactNode } from 'react'

export type Block = 'you' | 'matchday' | 'future' | 'game' | 'last'

/** Each section's name, shown on its break and on the welcome. Change the Block ids and these together. */
export const BLOCK_NAME: Record<Block, string> = {
  you: 'You and your club',
  matchday: 'Matchday',
  future: 'Football in 2035',
  game: 'Fixing the game',
  last: 'Last thoughts',
}

/** The short label beside a marker on the mountain. The break's heading, right above it,
    carries the full name; the full names do not fit beside the lower markers. */
export const BLOCK_MARK: Record<Block, string> = {
  you: 'Your club',
  matchday: 'Matchday',
  future: 'In 2035',
  game: 'Fixing the game',
  last: 'Last thoughts',
}

export type V2FrameProps = {
  block: Block
  step: number          // 1-based question number
  total: number         // total questions (17 on phone, 25 on desktop)
  question: string
  instruction: string   // the exact count: "Pick two." "Place 7 of the 12."
  bridge?: string       // follow-ups only: names the topic, never the answer ("One more on classroom training.")
  note?: string         // one short example line, grey, under the instruction
  privacy?: string      // sensitive screens only
  missing?: string      // e.g. "Pick 1 more": Next is disabled and shows this
  nextLabel?: string    // default "Next"
  /** Replaces "Question N of M" in the rail: breaks, the scene and the ending are not
      questions ("Section 2 of 5", "Before the next questions"). '' shows no label. */
  railLabel?: string
  /** Hide Next entirely (the ending, once sent). */
  noNext?: boolean
  onNext?: () => void
  onBack?: () => void
  tray?: ReactNode
  children: ReactNode   // the object
}

/* A mockup screen: self-contained demo state, rendered inside V2Frame. */
export type MockScreen = {
  id: string
  title: string         // shown in the mockup chooser
  what: string          // one line: what this shows
  Component: () => ReactNode
}
