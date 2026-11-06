'use client'

import type { ComponentType } from 'react'
import type { Template } from '../questions'
import type { RenderProps } from './contract'
import ChecklistRender from './checklist'
import CardsRender from './cards'
import TraysRender from './trays'
import TrackRender from './track'
import PodiumRender from './podium'
import BottleRender from './bottle'
import MonthsRender from './months'
import StampRender from './stamp'
import TextRender from './text'
import SceneRender from './scene'

export const RENDERERS: Record<Template, ComponentType<RenderProps>> = {
  checklist: ChecklistRender,
  cards: CardsRender,
  trays: TraysRender,
  track: TrackRender,
  podium: PodiumRender,
  bottle: BottleRender,
  months: MonthsRender,
  stamp: StampRender,
  text: TextRender,
  scene: SceneRender,
}
