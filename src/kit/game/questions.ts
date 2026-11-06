/* The script for the game-style screens: every question, as typed data. This is the file to edit to make
   your own survey. The engine (engine/), the renderers (render/) and the pieces they are built from (ui/, hero/)
   draw whatever it describes.

   This copy is a sample football fan survey that uses every screen type and skin at least once. KIT.md (in
   public/kit/) lists them with the answer each one saves.

   How the data is shaped
   ----------------------
   `options` is always the list of answers the respondent picks from:
     checklist, podium   the rows or tiles
     cards, stamp        the buttons under each card (and the piles they fly to);
                         the cards themselves are `constraints.cards`
     trays               the tiles to sort; the trays are `constraints.trays`
     track               opt-out buttons under the track (often none);
                         the stops are `constraints.stops`
     months              the opt-out chip; the slider is `constraints.range`
     bottle              the jugs; the units to pour are `constraints.total`
     text                the notes to write in; `constraints.chars` per note
     sentence builder    a checklist with `constraints.choices`: the first step (a verb), then a pick

   What is stored under `stores` (the answer shape):
     tap one                 an option id                      'family'
     pick N, top N           option ids in pick order          ['family', 'player'] (podium: 1st first)
     cards, stamp, trays     card or tile id -> answer id      { shirt: 'always' }
     cards with a first row  plus <card>.<row> -> answer id   { league: 'tv', 'league.today': 'ground' }
     track                   a stop id, or an opt-out id       'hour'
     months                  months, or the chip id            30 | 'game-by-game'
     bottle                  jug id -> units                   { before: 3, match: 2 }
     text                    note id -> text                   { keep: '...', change: '' }
     sentence builder        { verb, pick } or { verb, text }  { verb: 'been', pick: 'derby' }

   Follow-ups appear in place, in the same frame, after a bridge line that names the topic. `when` says when to
   ask one (see `matches` below); `when: 'always'` makes it a second step of its parent. `channels` says which
   devices ask a question; PLAY_ORDER is the order on each. */
import { BLOCK_NAME, type Block } from './contract'

export type Channel = 'phone' | 'desk'

export type Template =
  | 'checklist' | 'cards' | 'trays' | 'track' | 'podium'
  | 'bottle' | 'months' | 'stamp' | 'text' | 'scene'

export type Option = {
  id: string
  label: string
  /** One line printed under the label. Never a rule. */
  hint?: string
  /** An existing 3D render id (src/game/art/sprites.ts), only where it truly fits the label. */
  icon?: string
  /** Stays last when the list is shuffled (Not sure, I'd rather not say, "Much as it is today"). */
  pinned?: boolean
  /** Cards: at most this many cards may take this answer (e.g. "Today" may be picked on two cards at most). */
  cap?: number
  /** 5.5 stamp buttons: the icon that tells the piles apart (one stamp colour for all). */
  glyph?: 'cross' | 'query' | 'tick'
}

export type Card = { id: string; label: string; hint?: string; icon?: string }

export type Constraints = {
  /** Exactly this many: tap one = 1, pick two = 2, top 2 = 2, place 7 = 7. */
  pick?: number
  /** At least this many (pick any = 1; pick any, or skip = 0). */
  min?: number
  /** At most this many. */
  max?: number
  trays?: { id: string; label: string; capacity?: number }[]
  stops?: { id: string; label: string }[]
  range?: { min: number; max: number; step: number; unit: string }
  /** Bottle: the hours to pour. */
  total?: number
  cards?: Card[]
  choices?: { id: string; label: string }[]
  /** Text: the character limit per note or field. */
  chars?: number
  /** Cards (3.2): a first answer row on every card, answered before q.options on the same card
      ("Today, on your team"). Stored in the same record under `<card id>.<first.id>`; q.options
      are the second row, stored under the card id, so follow-ups read it as usual. */
  first?: { id: string; label: string; options: Option[] }
}

export type FollowUp = {
  id: string
  /** When to ask it: see `matches` for the mini-language. */
  when: string
  /** The topic line: "One more on <topic>." Names the topic, never the answer. */
  bridge: string
  question: string
  instruction: string
  /** The grey line under the instruction (e.g. the scene, repeated on the questions after it). */
  note?: string
  template: Template
  options: Option[]
  /** The options depend on the parent's answer: 'unpicked' (parent options not picked)
      or 'tray:<trayId>' (parent tiles placed in that tray). Resolve with followUpOptions. */
  optionsFrom?: 'unpicked' | `tray:${string}`
  constraints: Constraints
  /** Named strings drawn on the object (a header, a readout). */
  objectText?: Record<string, string>
  stores: string
}

export type Question = {
  id: string
  block: Block
  template: Template
  /** At most 14 words, plain, makes sense on its own. */
  question: string
  /** At most 10 words, states the exact count. */
  instruction: string
  /** The one short example line under the instruction. Shown before `privacy` on the same grey line. */
  note?: string
  /** Sensitive screens only. */
  privacy?: string
  options: Option[]
  constraints: Constraints
  /** Randomise `options` (pinned ones stay last) and log the order under `<stores>.order`. */
  shuffle?: boolean
  /** Named strings drawn on the object (a header, a readout, a counter). */
  objectText?: Record<string, string>
  /** Existing 3D renders the object is skinned with. */
  art?: string[]
  followUps?: FollowUp[]
  channels: Channel[]
  /** Desktop differences, merged in by questionsFor('desk'). */
  desk?: { instruction?: string; constraints?: Constraints }
  /** The answer key. */
  stores: string
  /** What the question measures, for the analysis. Never shown. */
  measures: string
}

export type Scene = {
  id: 'scene'
  block: Block
  template: 'scene'
  /** The heading ("Imagine it's 2035 and your club has:"), then one line per row. */
  lines: string[]
  /** Says plainly that the plan is not the respondent's answer. */
  assumption: string
  /** The flip calendar turns from `from` to `to` by itself. */
  calendar: { from: number; to: number }
  /** One picture per row, by name (render/scene.tsx ART): stand, screen, ticket, folders, laptop, chairs. */
  art?: string[]
  channels: Channel[]
  stores: string
  measures: string
}

/* ------------------------------------------------------------ shared lists */

const BOTH: Channel[] = ['phone', 'desk']
const DESK: Channel[] = ['desk']

const NOT_SURE: Option = { id: 'not-sure', label: 'Not sure', pinned: true }
/** The grey line on every question after the scene, so the 2035 context stays in view. */
export const CONTEXT_2035 = 'Imagine 2035: a bigger stadium, every match streamed, cheaper tickets.'

/** Matchday rituals (1.3), sorted into two piles, then the two that matter most. */
const RITUALS: Card[] = [
  { id: 'shirt', label: 'Wear the same shirt' },
  { id: 'seat', label: 'Sit in the same seat', icon: 'signpost' },
  { id: 'meal', label: 'Eat the same pre-match meal', icon: 'gear-thermos' },
  { id: 'route', label: 'Take the same route to the ground', icon: 'brick-map' },
  { id: 'friends', label: 'Watch with the same people', icon: 'trait-reading' },
  { id: 'score', label: "Never say the score out loud while we're winning" },
]

/** The twelve parts of a matchday (2.1). The ids name the tile icons in ui/templates/ActivityIcon.tsx. */
const MATCHDAY: Option[] = [
  { id: 'pint', label: 'Pre-match pint' },
  { id: 'singing', label: 'Singing' },
  { id: 'food', label: 'Food at the ground' },
  { id: 'screen', label: 'Big screen replays' },
  { id: 'warm-up', label: 'The warm-up' },
  { id: 'programme', label: 'Matchday programme' },
  { id: 'fanzone', label: 'Fan zone' },
  { id: 'transport', label: 'Trains and buses' },
  { id: 'queue', label: 'Queues to get in' },
  { id: 'tickets', label: 'Buying tickets' },
  { id: 'music', label: 'Music at half-time' },
  { id: 'mascot', label: 'The mascot' },
]

/** The five ways to follow a competition (3.1): today, then in 2035. */
const WAYS: Option[] = [
  { id: 'ground', label: 'At the ground', hint: 'In person' },
  { id: 'tv', label: 'Live on a screen', hint: 'TV or streaming' },
  { id: 'later', label: 'Highlights later', hint: 'Clips and replays' },
  { id: 'not', label: "Don't follow it", hint: 'Not at all' },
]

/* ------------------------------------------------------------ the questions
   Listed in laptop play order, section by section. */

export const QUESTIONS: Question[] = [
  /* ---------------- You and your club ---------------- */
  {
    id: 'f1.1',
    block: 'you',
    template: 'podium',
    question: 'What first made you a fan of your club?',
    instruction: 'Pick your top 2, most important first.',
    options: [
      { id: 'family', label: 'My family supported them' },
      { id: 'home', label: 'It was the club where I grew up' },
      { id: 'friends', label: 'My friends supported them' },
      { id: 'player', label: 'A favourite player' },
      { id: 'team', label: 'A great team at the time' },
      { id: 'first-match', label: 'The first match I went to' },
    ],
    constraints: { pick: 2 },
    shuffle: true,
    objectText: { first: '1st', second: '2nd', third: '3rd' },
    desk: { instruction: 'Pick your top 3, most important first.', constraints: { pick: 3 } },
    channels: BOTH,
    stores: 'fan.why',
    measures: 'A podium: top 2 on a phone, top 3 on a laptop.',
  },
  {
    id: 'f1.2',
    block: 'you',
    template: 'checklist',
    question: 'How old were you at your first live match?',
    instruction: 'Tap one.',
    options: [
      { id: 'under-8', label: 'Under 8' },
      { id: '8-12', label: '8 to 12' },
      { id: '13-17', label: '13 to 17' },
      { id: 'adult', label: '18 or older' },
      { id: 'never', label: "I haven't been yet", pinned: true },
    ],
    constraints: { pick: 1 },
    followUps: [
      {
        id: 'f1.2.who',
        when: 'is:under-8|8-12|13-17|adult',
        bridge: 'One more on that first match.',
        question: 'Who took you?',
        instruction: 'Tap one.',
        template: 'checklist',
        options: [
          { id: 'parent', label: 'A parent' },
          { id: 'relative', label: 'Another relative' },
          { id: 'friends', label: 'Friends' },
          { id: 'alone', label: 'I went on my own' },
        ],
        constraints: { pick: 1 },
        stores: 'first.who',
      },
    ],
    channels: BOTH,
    stores: 'first.age',
    measures: 'Tap one, with a follow-up that only shows if they have been to a match.',
  },
  {
    id: 'f1.3',
    block: 'you',
    template: 'cards',
    question: 'Which of these do you do on every matchday?',
    instruction: 'Swipe or tap. 6 cards.',
    options: [
      { id: 'not-me', label: 'Not me' },
      { id: 'always', label: 'Every time' },
    ],
    constraints: { cards: RITUALS },
    followUps: [
      {
        id: 'f1.3.keep',
        when: 'count:always:2',
        bridge: 'One more on the ones you do every time.',
        question: 'Which two would you never give up?',
        instruction: 'Pick two.',
        template: 'checklist',
        options: RITUALS,
        optionsFrom: 'tray:always',
        constraints: { pick: 2 },
        stores: 'rituals.keep',
      },
    ],
    channels: BOTH,
    stores: 'rituals',
    measures: 'A swipe sort into two piles, then, for two or more done every time, a pick of two from those.',
  },
  {
    id: 'f1.4',
    block: 'you',
    template: 'checklist',
    question: 'What most often stops you going to a home match?',
    instruction: 'Pick one or two.',
    options: [
      { id: 'price', label: 'Tickets cost too much', hint: 'Or are hard to get.' },
      { id: 'time', label: 'The kick-off time moved', hint: 'Changed for TV.' },
      { id: 'travel', label: 'Getting there is hard', hint: 'No late trains.' },
      { id: 'family', label: 'Family plans', hint: 'Weekends fill up.' },
      { id: 'tv', label: "It's easier on TV", hint: 'Warm and dry.' },
      { id: 'go', label: 'Nothing, I go', hint: 'Every home game.', pinned: true },
    ],
    constraints: { min: 1, max: 2 },
    objectText: { header: 'Home match: Saturday, 15:00', detail: 'Your club against the league leaders', lead: 'Why you miss it:', decline: 'true', acceptId: 'go', day: 'Sat', date: '14' },
    channels: BOTH,
    stores: 'missed.why',
    measures: 'Pick one or two, drawn as a match invite: a reason marks it Declined, "Nothing, I go" marks it Accepted.',
  },
  {
    id: 'f1.5',
    block: 'you',
    template: 'track',
    question: 'How long does it take you to get to a home game?',
    instruction: 'Tap one.',
    note: 'Door to door, on a normal Saturday.',
    options: [{ id: 'dont-go', label: "I don't go to home games", pinned: true }],
    constraints: {
      stops: [
        { id: 'walk', label: 'A short walk' },
        { id: 'half-hour', label: 'Under 30 minutes' },
        { id: 'hour', label: 'Up to an hour' },
        { id: 'two-hours', label: 'One to two hours' },
        { id: 'more', label: 'More than two hours' },
      ],
    },
    followUps: [
      {
        id: 'f1.5.how',
        when: 'is:hour|two-hours|more',
        bridge: 'One more on the journey.',
        question: 'How do you usually get there?',
        instruction: 'Tap one.',
        template: 'checklist',
        options: [
          { id: 'car', label: 'By car' },
          { id: 'train', label: 'By train' },
          { id: 'coach', label: 'On a supporters’ coach' },
          { id: 'bus', label: 'By bus' },
        ],
        constraints: { pick: 1 },
        stores: 'journey.how',
      },
    ],
    channels: BOTH,
    stores: 'journey.time',
    measures: 'A track with an opt-out, and a follow-up for the longer journeys only.',
  },
  {
    id: 'f1.6',
    block: 'you',
    template: 'checklist',
    question: 'No one is a real fan until they have…',
    instruction: 'Tap Watched, Been to or Travelled to. Then pick one.',
    options: [
      { id: 'derby', label: 'a derby' },
      { id: 'final', label: 'a cup final' },
      { id: 'abroad', label: 'an away game abroad' },
      { id: 'relegation', label: 'a relegation fight' },
      { id: 'youth', label: 'a youth team match' },
      { id: 'winter', label: 'a midweek game in winter' },
      { id: 'other', label: 'Something else…', pinned: true },
    ],
    constraints: {
      pick: 1,
      choices: [
        { id: 'watched', label: 'Watched' },
        { id: 'been', label: 'Been to' },
        { id: 'travelled', label: 'Travelled to' },
      ],
      chars: 60,
    },
    objectText: { stem: '…have', placeholder: 'For example, a pre-season friendly' },
    channels: BOTH,
    stores: 'realFan',
    measures: 'The sentence builder: a verb, then an experience, or their own words.',
  },

  /* ---------------- Matchday ---------------- */
  {
    id: 'f2.1',
    block: 'matchday',
    template: 'trays',
    question: 'How should a matchday change?',
    instruction: 'Place 7 of the 12. Leave the rest.',
    options: MATCHDAY,
    constraints: {
      pick: 7,
      trays: [
        { id: 'more', label: 'More of it', capacity: 3 },
        { id: 'different', label: 'Do it differently', capacity: 2 },
        { id: 'less', label: 'Less of it', capacity: 2 },
      ],
    },
    followUps: [
      {
        id: 'f2.1.best',
        when: 'always',
        bridge: 'One more on what you want more of.',
        question: 'Which one would make the biggest difference?',
        instruction: 'Tap one.',
        template: 'trays',
        options: MATCHDAY,
        optionsFrom: 'tray:more',
        constraints: { pick: 1 },
        stores: 'matchday.best',
      },
    ],
    channels: BOTH,
    stores: 'matchday.sort',
    measures: 'Trays with a capacity each (3, 2, 2), then one pick from the tiles put in More of it.',
  },
  {
    id: 'f2.2',
    block: 'matchday',
    template: 'bottle',
    question: 'A home matchday takes 8 hours. Where should they go?',
    instruction: 'Tap a jug to pour 1 hour.',
    options: [
      { id: 'travel', label: 'Getting there and back' },
      { id: 'before', label: 'Before kick-off' },
      { id: 'match', label: 'The match itself' },
      { id: 'friends', label: 'Time with friends' },
      { id: 'after', label: 'After the final whistle' },
    ],
    constraints: { total: 8 },
    shuffle: true,
    objectText: { counter: '{left} of 8 hours left' },
    channels: BOTH,
    stores: 'hours.mix',
    measures: 'The bottle: 8 units across 5 jugs.',
  },
  {
    id: 'f2.3',
    block: 'matchday',
    template: 'stamp',
    question: 'Six ideas for your ground. Should your club do each?',
    instruction: 'Swipe or tap. 6 cards.',
    options: [
      { id: 'no', label: 'No', glyph: 'cross' },
      { id: 'not-sure', label: 'Not sure', glyph: 'query' },
      { id: 'yes', label: 'Yes', glyph: 'tick' },
    ],
    constraints: {
      cards: [
        { id: 'standing', label: 'Bring back a standing terrace' },
        { id: 'naming', label: 'Sell the stadium name to a sponsor' },
        { id: 'legend', label: 'Name a stand after a club legend' },
        { id: 'roof', label: 'Put a roof over every seat' },
        { id: 'abroad', label: 'Play one home game abroad each season', hint: 'For fans in other countries' },
        { id: 'cashless', label: 'Go fully cashless inside the ground' },
      ],
    },
    followUps: [
      {
        id: 'f2.3.how',
        when: 'card:standing:yes',
        bridge: 'One more on a standing terrace.',
        question: 'Where should it go?',
        instruction: 'Tap one.',
        template: 'stamp',
        objectText: { header: 'Plans for the terrace', line: 'It goes' },
        options: [
          { id: 'home-end', label: 'Behind the home goal' },
          { id: 'away-end', label: 'In the away end too' },
          { id: 'family', label: 'Away from the family stand' },
          { id: 'new', label: 'In a new stand' },
        ],
        constraints: { pick: 1 },
        stores: 'standing.where',
      },
    ],
    channels: BOTH,
    stores: 'ideas',
    measures: 'Stamps: No, Not sure or Yes on each card; a Yes on the terrace asks where.',
  },
  {
    id: 'f2.4',
    block: 'matchday',
    template: 'checklist',
    question: 'Every season-ticket holder should be promised one thing. Which?',
    instruction: 'Tap one.',
    options: [
      { id: 'seat', label: 'The same seat every season' },
      { id: 'away', label: 'First pick of away tickets' },
      { id: 'vote', label: 'A vote on ticket prices' },
      { id: 'cup', label: 'Cup tickets included' },
      { id: 'refund', label: 'A refund if the kick-off moves' },
      { id: 'meet', label: 'A chance to meet the players' },
    ],
    constraints: { pick: 1 },
    objectText: { letter: 'Welcome to the new season. Every season-ticket holder gets:', letterFrom: 'Your club · Season tickets' },
    channels: DESK,
    stores: 'promise',
    measures: 'Tap one, drawn as a letter whose blank fills in and signs itself.',
  },

  /* ---------------- Football in 2035 ---------------- */
  {
    id: 'f3.0',
    block: 'future',
    template: 'checklist',
    question: 'By 2035, how will most fans follow their club?',
    instruction: 'Tap one.',
    options: [
      { id: 'ground', label: 'At the ground, as now' },
      { id: 'streaming', label: 'Streaming every match' },
      { id: 'clips', label: 'Mostly clips and highlights' },
      { id: 'vr', label: 'With a headset, as if they were there' },
      { id: 'same', label: 'Much as they do today', pinned: true },
    ],
    constraints: { pick: 1 },
    shuffle: true,
    channels: BOTH,
    stores: 'future.follow',
    measures: 'Asked before the scene, so the scene does not hand them the answer.',
  },
  {
    id: 'f3.1',
    block: 'future',
    template: 'cards',
    question: 'How do you follow each one today? And in 2035?',
    instruction: 'Answer both rows on each card. 4 cards.',
    note: CONTEXT_2035,
    options: WAYS,
    constraints: {
      cards: [
        { id: 'league', label: 'League games' },
        { id: 'cup', label: 'Cup games' },
        { id: 'away', label: 'Away games' },
        { id: 'womens', label: "The women's team" },
      ],
      first: { id: 'today', label: 'Today', options: WAYS },
    },
    objectText: { second: 'In 2035' },
    followUps: [
      {
        id: 'f3.1.why',
        when: 'card:away:ground',
        bridge: 'One more on away games.',
        question: 'Why still travel to away games in 2035?',
        instruction: 'Tap one.',
        note: CONTEXT_2035,
        template: 'cards',
        options: [
          { id: 'atmosphere', label: 'The away end atmosphere' },
          { id: 'friends', label: 'The trip with friends' },
          { id: 'support', label: 'The team needs the support' },
          { id: 'new-grounds', label: 'Seeing new grounds' },
        ],
        constraints: { pick: 1 },
        stores: 'away.why',
      },
    ],
    channels: BOTH,
    stores: 'follow.how',
    measures: 'Split cards: a Today row and an In 2035 row on each card; going in 2035 to away games asks why.',
  },
  {
    id: 'f3.2',
    block: 'future',
    template: 'trays',
    question: 'What would each of these do to the atmosphere?',
    instruction: 'Place all 4.',
    note: CONTEXT_2035,
    options: [
      { id: 'safe-standing', label: 'Safe standing everywhere', hint: 'Rail seats in every stand.' },
      { id: 'dynamic', label: 'Prices that change by the game', hint: 'Dearer for big matches.' },
      { id: 'tourists', label: 'More tickets for visitors', hint: 'Fans from abroad.' },
      { id: 'streamed', label: 'Every match streamed', hint: 'Including 3pm Saturdays.' },
    ],
    constraints: {
      pick: 4,
      trays: [
        { id: 'better', label: 'Makes it better' },
        { id: 'same', label: 'No difference' },
        { id: 'worse', label: 'Makes it worse' },
      ],
    },
    followUps: [
      {
        id: 'f3.2.most',
        when: 'always',
        bridge: 'One more on the atmosphere.',
        question: 'What matters most for a loud ground?',
        instruction: 'Tap one.',
        note: CONTEXT_2035,
        template: 'checklist',
        options: [
          { id: 'standing', label: 'Fans standing together' },
          { id: 'cheap', label: 'Cheap seats for young fans' },
          { id: 'results', label: 'A team that wins' },
          { id: 'roof', label: 'A roof that keeps the noise in' },
        ],
        constraints: { pick: 1 },
        stores: 'atmosphere.most',
      },
    ],
    channels: BOTH,
    stores: 'atmosphere',
    measures: 'Trays without capacity: place all four tiles, each with a hint line.',
  },
  {
    id: 'f3.3',
    block: 'future',
    template: 'checklist',
    question: 'In 2035, which three will matter most to fans?',
    instruction: 'Pick three.',
    note: CONTEXT_2035,
    options: [
      { id: 'price', label: 'Ticket prices' },
      { id: 'say', label: 'A say in how the club is run' },
      { id: 'results', label: 'Results' },
      { id: 'local', label: 'Local players in the team' },
      { id: 'streams', label: 'Being able to watch every game' },
      { id: 'owners', label: 'Good owners' },
      { id: 'history', label: "Keeping the club's history" },
    ],
    constraints: { pick: 3 },
    followUps: [
      {
        id: 'f3.3.less',
        when: 'always',
        bridge: 'One more on what fans care about.',
        question: 'Will any matter less than today?',
        instruction: 'Pick any, or skip.',
        note: CONTEXT_2035,
        template: 'checklist',
        options: [
          { id: 'price', label: 'Ticket prices' },
          { id: 'say', label: 'A say in how the club is run' },
          { id: 'results', label: 'Results' },
          { id: 'local', label: 'Local players in the team' },
          { id: 'streams', label: 'Being able to watch every game' },
          { id: 'owners', label: 'Good owners' },
          { id: 'history', label: "Keeping the club's history" },
        ],
        optionsFrom: 'unpicked',
        constraints: { min: 0, max: 4 },
        stores: 'matter.less',
      },
    ],
    channels: DESK,
    stores: 'matter.more',
    measures: 'Pick three, then a follow-up that offers only the ones not picked.',
  },

  /* ---------------- Fixing the game ---------------- */
  {
    id: 'f4.1',
    block: 'game',
    template: 'months',
    question: 'How long should a new manager get before being judged?',
    instruction: 'Tap or drag to set.',
    note: 'Count from their first match.',
    options: [{ id: 'game-by-game', label: 'No set time: judge them game by game' }],
    constraints: { range: { min: 6, max: 48, step: 6, unit: 'months' } },
    objectText: { readout: '{n} months', empty: '— years', whenReady: 'Game by game', start: '6 months', end: '4 years' },
    channels: BOTH,
    stores: 'manager.months',
    measures: 'The months slider, read out in years, with an opt-out chip.',
  },
  {
    id: 'f4.2',
    block: 'game',
    template: 'cards',
    question: 'Can money buy each of these, or does it take time?',
    instruction: 'Swipe or tap. 6 cards.',
    options: [
      { id: 'money', label: 'Money can buy it' },
      { id: 'time', label: 'It takes time' },
    ],
    constraints: {
      cards: [
        { id: 'academy', label: 'A youth academy that produces players', icon: 'origin-seed' },
        { id: 'fans', label: 'A loyal fan base', icon: 'trait-reading' },
        { id: 'culture', label: 'A winning culture', icon: 'trait-hunter' },
        { id: 'manager', label: 'A good manager', icon: 'trait-judgement' },
        { id: 'scouting', label: 'Good scouting', icon: 'gear-binoculars' },
        { id: 'plan', label: 'A clear long-term plan', icon: 'brick-map' },
      ],
    },
    channels: BOTH,
    stores: 'moneyOrTime',
    measures: 'A swipe sort with 3D pictures on the cards.',
  },
  {
    id: 'f4.3',
    block: 'game',
    template: 'checklist',
    question: 'What would fix football most?',
    instruction: 'Pick one or two.',
    options: [
      { id: 'prices', label: 'Cheaper tickets' },
      { id: 'fan-say', label: 'Fans on the club board' },
      { id: 'spending', label: 'Limits on spending' },
      { id: 'fewer-games', label: 'Fewer games for top players' },
      { id: 'grassroots', label: 'More money for grassroots' },
      { id: 'refs', label: 'Better refereeing' },
      NOT_SURE,
    ],
    constraints: { min: 1, max: 2 },
    shuffle: true,
    channels: DESK,
    stores: 'fix',
    measures: 'Pick one or two, shuffled, with Not sure pinned last.',
  },

  /* ---------------- Last thoughts ---------------- */
  {
    id: 'fC1',
    block: 'last',
    template: 'track',
    question: 'How much does the game need to change?',
    instruction: 'Tap one.',
    options: [],
    constraints: {
      stops: [
        { id: 'none', label: 'No change' },
        { id: 'small', label: 'Small changes' },
        { id: 'some', label: 'Some changes' },
        { id: 'big', label: 'Big changes' },
        { id: 'restart', label: 'Start again' },
      ],
    },
    channels: DESK,
    stores: 'change',
    measures: 'A plain track with no opt-out.',
  },
  {
    id: 'fC2',
    block: 'last',
    template: 'text',
    question: 'What should football keep, and what should it change?',
    instruction: 'Optional: a few words in each.',
    options: [
      { id: 'keep', label: 'Keep' },
      { id: 'change', label: 'Change' },
      { id: 'else', label: "Anything we didn't ask?" },
    ],
    constraints: { min: 0, chars: 80 },
    channels: BOTH,
    stores: 'notes',
    measures: 'Optional notes.',
  },
]

export const QUESTION: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))

/* ------------------------------------------------------------ the scene-setting screen
   After f3.0, so it doesn't hand people that answer. Next is live at once. */

export const SCENE: Scene = {
  id: 'scene',
  block: 'future',
  template: 'scene',
  lines: [
    "Imagine it's 2035 and your club has:",
    'A stadium twice the size.',
    'Every match streamed live.',
    "Tickets at half today's price.",
  ],
  assumption: "You don't have to agree. Just assume it for the next few questions.",
  calendar: { from: 2026, to: 2035 },
  art: ['stand', 'screen', 'ticket'],
  channels: BOTH,
  stores: 'scene.seen',
  measures: 'Logged as seen, not scored.',
}

/* ------------------------------------------------------------ play order */

export const PLAY_ORDER: { phone: string[]; desk: string[] } = {
  phone: [
    'f1.1', 'f1.2', 'f1.3', 'f1.4', 'f1.5', 'f1.6',
    'f2.1', 'f2.2', 'f2.3',
    'f3.0', 'scene', 'f3.1', 'f3.2',
    'f4.1', 'f4.2',
    'fC2',
  ],
  desk: [
    'f1.1', 'f1.2', 'f1.3', 'f1.4', 'f1.5', 'f1.6',
    'f2.1', 'f2.2', 'f2.3', 'f2.4',
    'f3.0', 'scene', 'f3.1', 'f3.2', 'f3.3',
    'f4.1', 'f4.2', 'f4.3',
    'fC1', 'fC2',
  ],
}

export const BLOCK_ORDER: Block[] = ['you', 'matchday', 'future', 'game', 'last']

/* ------------------------------------------------------------ welcome, breaks, ending */

export const PRIVACY = 'Your answers are sent to the person running this survey when you finish. Nothing is sent before that.'

const MINUTES: Record<Channel, number> = { phone: 6, desk: 9 }

const countFor = (channel: Channel) => PLAY_ORDER[channel].filter((id) => id !== 'scene').length
const lengthLine = (channel: Channel) =>
  `${countFor(channel)} questions. Some have a few quick cards to sort. About ${MINUTES[channel]} minutes.`

export const WELCOME = {
  title: 'Matchday',
  intro: 'A short survey about following football: your club, a day at the ground, and where the game is going.',
  /** The honest length, per channel. */
  lines: { phone: [lengthLine('phone')], desk: [lengthLine('desk')] } as Record<Channel, string[]>,
  /** "What you'll do": the section names. */
  sections: BLOCK_ORDER.map((b) => BLOCK_NAME[b]),
  privacy: PRIVACY,
  start: 'Start',
}

/** One per section: its name and one short line, shown on the break before it. */
export const BREAKS: Record<Block, { name: string; line: string }> = {
  you: { name: BLOCK_NAME.you, line: 'First, you and the club you follow.' },
  matchday: { name: BLOCK_NAME.matchday, line: 'A day at the ground, from the first pint to the trip home.' },
  future: { name: BLOCK_NAME.future, line: 'How following a club could look ten years from now.' },
  game: { name: BLOCK_NAME.game, line: 'Managers, money, and what would fix the game.' },
  last: { name: BLOCK_NAME.last, line: 'Nearly done.' },
}

export const ENDING = {
  line: "That's the final whistle.",
  /** Shown once the answers are stored (see engine/send.ts). */
  thanks: 'Thank you. Your answers have been sent.',
  /** Preview runs, which send nothing. */
  notSent: 'Thank you. This was a preview, so nothing was sent. Start from the kit to take the survey for real.',
  /** Next on the last question, and what it says while sending or after a failure. */
  send: 'Finish',
  sending: 'Sending…',
  retry: "Couldn't send. Tap to try again.",
}

/* ------------------------------------------------------------ helpers */

/** The question as shown on a channel (desktop differences merged in). */
export function forChannel(q: Question, channel: Channel): Question {
  if (channel !== 'desk' || !q.desk) return q
  return {
    ...q,
    instruction: q.desk.instruction ?? q.instruction,
    constraints: { ...q.constraints, ...q.desk.constraints },
  }
}

/** The questions for a channel, in play order (no scene, no breaks). Its length is the rail's total. */
export function questionsFor(channel: Channel): Question[] {
  return PLAY_ORDER[channel]
    .filter((id) => id !== 'scene')
    .map((id) => {
      const q = QUESTION[id]
      if (!q) throw new Error(`PLAY_ORDER.${channel} names an unknown question: ${id}`)
      return forChannel(q, channel)
    })
}

export type Screen =
  | { kind: 'break'; block: Block; name: string; line: string }
  | { kind: 'scene'; scene: Scene }
  | { kind: 'question'; question: Question; n: number; total: number }

/** Every screen after the welcome, in order: questions (numbered for the rail), the scene, and a section
    break wherever the section changes. The scene belongs with the question after it. The ending follows the last. */
export function screensFor(channel: Channel): Screen[] {
  const total = countFor(channel)
  const order = PLAY_ORDER[channel]
  const out: Screen[] = []
  let block: Block | undefined
  let n = 0
  for (const [i, id] of order.entries()) {
    const after = order.slice(i + 1).find((x) => x !== 'scene')
    const b = id === 'scene' ? (after ? QUESTION[after].block : SCENE.block) : QUESTION[id].block
    if (block !== undefined && b !== block) out.push({ kind: 'break', block: b, ...BREAKS[b] })
    block = b
    if (id === 'scene') out.push({ kind: 'scene', scene: SCENE })
    else out.push({ kind: 'question', question: forChannel(QUESTION[id], channel), n: ++n, total })
  }
  return out
}

/** Any answer a question can store (see the shapes at the top of this file). */
export type Answer =
  | string
  | number
  | readonly string[]
  | Readonly<Record<string, string | number>>

/* The `when` mini-language. One expression per follow-up, over the parent's answer.

     always                  asked whenever the parent is answered (a step 2 in place)
     is:<id>[|<id>...]       the answer (one id, or a number) is one of these
     includes:<id>[|<id>...] the answer (a list of ids) contains at least one of these
     lte:<n>                 the answer (a number) is at most n
     gte:<n>                 the answer (a number) is at least n
     count:<id>:<n>          the answer (card or tile -> answer) puts at least n cards, or tiles, on <id>
     card:<cardId>:<id>[|<id>...]
                             the answer (card or tile -> answer) puts that card, or
                             tile, on one of these answers, or in one of these trays

   An unanswered parent (undefined or null) matches nothing, not even `always`.
   A malformed expression throws, so a typo fails the tests rather than hiding a follow-up. */
export function matches(when: string, answer: Answer | undefined | null): boolean {
  if (answer === undefined || answer === null) return false
  if (when === 'always') return true
  const at = when.indexOf(':')
  if (at < 1) throw new Error(`Bad when: "${when}"`)
  const op = when.slice(0, at)
  const rest = when.slice(at + 1)
  const ids = (s: string) => {
    const list = s.split('|')
    if (list.some((x) => x === '')) throw new Error(`Bad when: "${when}"`)
    return list
  }
  switch (op) {
    case 'is':
      return (typeof answer === 'string' || typeof answer === 'number') && ids(rest).includes(String(answer))
    case 'includes': {
      const want = ids(rest)
      return Array.isArray(answer) && (answer as readonly string[]).some((a) => want.includes(a))
    }
    case 'lte':
    case 'gte': {
      const n = Number(rest)
      if (rest === '' || !Number.isFinite(n)) throw new Error(`Bad when: "${when}"`)
      return typeof answer === 'number' && (op === 'lte' ? answer <= n : answer >= n)
    }
    case 'count': {
      const c = rest.indexOf(':')
      const n = Number(rest.slice(c + 1))
      if (c < 1 || !Number.isInteger(n) || n < 1) throw new Error(`Bad when: "${when}"`)
      if (typeof answer !== 'object' || Array.isArray(answer)) return false
      const id = rest.slice(0, c)
      return Object.values(answer as Readonly<Record<string, string | number>>).filter((v) => String(v) === id).length >= n
    }
    case 'card': {
      const c = rest.indexOf(':')
      if (c < 1) throw new Error(`Bad when: "${when}"`)
      const card = rest.slice(0, c)
      const want = ids(rest.slice(c + 1))
      if (typeof answer !== 'object' || Array.isArray(answer)) return false
      const got = (answer as Readonly<Record<string, string | number>>)[card]
      return got !== undefined && want.includes(String(got))
    }
    default:
      throw new Error(`Bad when: "${when}"`)
  }
}

/** Every follow-up this answer calls for, in the order to ask them. */
export function followUpsFor(question: Question, answer: Answer | undefined | null): FollowUp[] {
  return (question.followUps ?? []).filter((f) => matches(f.when, answer))
}

/** The next follow-up this answer calls for, if any. 4.4 (two picks) can call for two: use
    followUpsFor to get them all. */
export function followUpFor(question: Question, answer: Answer | undefined | null): FollowUp | undefined {
  return followUpsFor(question, answer)[0]
}

/** A follow-up's options, narrowed by the parent's answer where `optionsFrom` says so. */
export function followUpOptions(question: Question, followUp: FollowUp, answer: Answer | undefined | null): Option[] {
  const from = followUp.optionsFrom
  if (!from) return followUp.options
  if (from === 'unpicked') {
    const picked = Array.isArray(answer) ? (answer as readonly string[]) : []
    return followUp.options.filter((o) => !picked.includes(o.id))
  }
  const tray = from.slice('tray:'.length)
  const placed = answer && typeof answer === 'object' && !Array.isArray(answer)
    ? (answer as Readonly<Record<string, string | number>>)
    : {}
  return followUp.options.filter((o) => placed[o.id] === tray)
}
