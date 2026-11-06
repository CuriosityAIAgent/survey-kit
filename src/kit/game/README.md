# Survey kit: game-style screens

The game-style half of the survey kit, running a sample football survey at `/kit/game`. It has a misty
landscape, a mountain line for progress with a climber on each section break, and sound you can turn on. Each
screen is one question above one thing to play with: a podium, a swipe deck, split cards, trays with a capacity, a
bottle you pour hours into, stamps, a months slider, a sentence builder, an invite, a letter, and a scene where a
calendar flips forward. The static half (plain HTML, no build) is in `public/kit/`; `public/kit/KIT.md` covers
both.

It is a React component tree for this Next.js app (React 19, Tailwind CSS 4, zustand). To make your own survey,
edit `questions.ts` (and the section names in `contract.ts`); nothing else needs to change.

```
questions.ts            the script: every question, its options, follow-ups, the scene, the play order per
        │               device, the welcome, the section breaks and the ending
        ▼
engine/flow.ts          pure functions: which screen comes next, which follow-ups an answer calls for
engine/store.ts         answers and position, saved in this browser under 'kit-game-v1' (engine/version.ts)
engine/Player.tsx       the page: welcome, then the screens flow.ts gives, then the ending
        ▼
render/<template>.tsx   one renderer per screen type, drawn inside V2Frame.tsx
ui/, hero/              the pieces they are built from (card stack, split cards, trays, track, podium,
                        bottle and jugs, stamps)
engine/send.ts          posts a finished run to /api/responses (src/app/api/responses), which stores it
```

## Screens

| Template | What it is | In the sample |
|---|---|---|
| `podium` | Pick a top 2 or 3 onto a podium (2 on a phone, 3 on a laptop via `desk`) | f1.1 |
| `checklist` | Tap one, pick N, pick one or two; skins from `objectText`: `header` (an invite that marks itself Declined or Accepted), `letter` (a letter whose blank fills in); `constraints.choices` makes a sentence builder | f1.2, f1.4, f1.6, f2.4, f3.0, f3.3, f4.3 |
| `cards` | A swipe deck into two side piles; with `constraints.first`, split cards with a Today row and a second row | f1.3, f3.1, f4.2 |
| `track` | Stops on a line, with optional opt-out chips | f1.5, fC1 |
| `trays` | Tiles into trays, each with an optional `capacity`; without trays, a one-tap list (a follow-up reading `optionsFrom: 'tray:<id>'`) | f2.1, f3.2 |
| `bottle` | Pour units from jugs into a bottle | f2.2 |
| `stamp` | Stamp each card No, Not sure or Yes | f2.3 |
| `months` | A slider read out in years, with an opt-out chip | f4.1 |
| `text` | Optional notes | fC2 |
| `scene` | Not a question: a calendar flips forward and three pictures change (`SCENE.art`) | scene |

Follow-ups appear in place, after a bridge line. `when` decides if one is asked: `always`, `is:a|b`,
`includes:a|b`, `lte:n`, `gte:n`, `card:<card>:a|b` or `count:<answer>:n` (at least n cards on that answer). The kit opens in preview: Next always works and every follow-up shows. `?live=1` runs it as a respondent would see it,
and `?at=<id>` opens one screen (a question, a follow-up, `scene` or `break:<section>`).

## Sizes

Built for a phone (390x660) and a laptop window of 1440x790. The frame is 700px tall on a laptop, so a window
shorter than that scrolls.

## Checking it

```
npm run dev
node e2e/game-walk.mjs          # phone; DESK=1 for a laptop
```

The walk plays two routes through every screen: one fires every conditional follow-up, the other none (with a
Back and a reload). It checks the route against the engine, that nothing scrolls, and that finishing stores exactly one response.
