'use client'
/* /kit/game: the survey kit's game-style screens, running the football sample in src/kit/game.
   A preview by default (Next always on, every follow-up shown); ?live=1 runs it as a respondent would see it;
   ?at=<id> opens one screen. A live run sends its answers when finished (src/kit/game/engine/send.ts). */
import Player from '@/kit/game/engine/Player'
export default function Page() { return <Player /> }
