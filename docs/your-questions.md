# From your questions to these screens

Start with a plain list of questions, as you'd write them in a doc. For each one, decide what kind of answer you
want, then pick the screen that collects that kind of answer. Then copy the closest example in the sample survey
and change the words.

## Which screen for which kind of question

| You want to know… | Quiz-style screen | Game-style screen |
|---|---|---|
| One answer from a short list | `checklist`, `mode: 'one'` (pictures optional) | `checklist`, `pick: 1` |
| Which of two good things they lean to | `checklist`, `tradeoff: true` | `checklist`, `pick: 1` |
| One or two answers | `checklist`, `mode: 'two'` | `checklist`, `min: 1, max: 2` |
| Their top 3 | `podium` | `podium` |
| A full order | `rank` (ten items) | — |
| How each item rates, on the same few answers | `piles` (four piles) or `stamp` | `stamp`, or `cards` for two answers |
| The same item now and later | — | `cards` with `constraints.first` (split cards) |
| Where each item belongs | `trays` | `trays` (each tray can have a capacity) |
| How they'd split a fixed amount (hours, money) | `bottle`, `allocate-list` (to 100%) or `allocate-ledger` | `bottle` |
| A point on a scale | `track` | `track` |
| A number | `sentence` (with a range and a sanity check) | `months` for a length of time |
| A number and a word in one sentence | `sentence` with chips | the sentence builder (`constraints.choices`) |
| The same three questions about each of a few things | `configure` | — |
| Their own words | `text` (notes, quotes, an optional box) | `text` |
| A follow-up for some answers only | `kind: 'followup'` (always shown in preview) | `followUps` with a `when` rule |

`public/kit/KIT.md` shows every quiz-style screen with its options and the answer it saves.
`src/kit/game/README.md` does the same for the game-style screens.

## A worked example: study spaces on campus

Say a student society wants to know where people study and what would make it better. Their list of questions:

1. Where do you study most?
2. Would you rather have a quiet room or a busy café?
3. What matters most in a study space?
4. How do you rate each place on campus?
5. In a typical week, how are your study hours split between places?
6. How busy is the library in exam weeks?
7. What would you pay each month for a guaranteed quiet desk?
8. What one change would help most?

This is how each becomes a screen in the quiz-style survey (`public/kit/script.js`). Each entry goes in the `steps`
list, inside a chapter. The ids are yours to choose.

**1. Where do you study most?** One answer from a short list: tap one.

```js
{
  id: '1.1', kind: 'question', template: 'checklist', chapter: 'I', title: 'Where they study',
  question: 'Where do you study most?',
  instruction: 'Tap one.', notes: [],
  next: 'Next', rule: 'Tap one',
  data: {
    store: 'where', mode: 'one', shuffle: true, missing: 'Tap one',
    options: [
      { id: 'library', label: 'The library' },
      { id: 'home', label: 'At home or in my room' },
      { id: 'cafe', label: 'A café' },
      { id: 'lab', label: 'A lab or department room' },
      { id: 'other', label: 'Somewhere else', pinned: true },
    ],
  },
},
```

**2. Quiet room or busy café?** A forced choice between two good things.

```js
{
  id: '1.2', kind: 'question', template: 'checklist', chapter: 'I', title: 'Quiet or busy',
  question: 'I study best in ________.',
  instruction: "Both have their days. Tap the one that's closer.", notes: [],
  next: 'Next', rule: 'Tap one',
  data: {
    store: 'quietOrBusy', mode: 'one', shuffle: true, layout: 'row', tradeoff: true, missing: 'Tap one',
    options: [
      { id: 'quiet', label: 'a quiet room' },
      { id: 'busy', label: 'a busy café' },
    ],
  },
},
```

**3. What matters most?** A top 3 on a podium.

```js
{
  id: '1.3', kind: 'question', template: 'podium', chapter: 'I', title: 'What matters most',
  question: 'What matters most in a study space?',
  instruction: 'Pick your top 3, most important first.', notes: [],
  next: 'Next', rule: 'Pick 3',
  data: {
    store: 'matters', ui: PODIUM_UI, compact: true, shuffle: true,
    options: [
      { id: 'quiet', label: 'Quiet' }, { id: 'plugs', label: 'Power sockets' },
      { id: 'wifi', label: 'Fast wifi' }, { id: 'light', label: 'Daylight' },
      { id: 'coffee', label: 'Coffee nearby' }, { id: 'hours', label: 'Open late' },
      { id: 'group', label: 'Room to work in a group' }, { id: 'seat', label: 'Always a free seat' },
    ],
    sample: ['quiet', 'plugs', 'seat'],
  },
},
```

**4. How do you rate each place?** The same three answers for each item: a stamp deck.

```js
{
  id: '1.4', kind: 'question', template: 'stamp', chapter: 'I', title: 'Rating each place',
  question: 'How do you rate each of these for studying?',
  instruction: 'Stamp each card. 5 cards.', notes: [],
  next: 'Next', rule: 'Stamp all 5 cards',
  data: {
    store: 'ratings', skin: 'plain', shuffle: true, missing: 'Stamp {n} more',
    stamps: [
      { id: 'love', label: 'Love it', impression: 'LOVE IT', glyph: 'tick' },
      { id: 'fine', label: "It's fine", impression: 'FINE', glyph: 'half' },
      { id: 'avoid', label: 'I avoid it', impression: 'AVOID', glyph: 'cross' },
    ],
    cards: [
      { id: 'library', label: 'The main library' }, { id: 'science', label: 'The science library' },
      { id: 'union', label: 'The student union' }, { id: 'cafe', label: 'The campus café' },
      { id: 'labs', label: 'Computer labs' },
    ],
  },
},
```

**5. How are your study hours split?** A fixed amount poured into jugs: the bottle.

```js
{
  id: '1.5', kind: 'question', template: 'bottle', chapter: 'I', title: 'Ten study hours',
  question: 'Picture 10 hours of study in a typical week. Where do they happen?',
  instruction: 'Tap a jug to add an hour.', notes: [],
  next: 'Next', rule: 'Place exactly 10 hours',
  data: {
    store: 'hours', total: 10, counter: '{left} of 10 hours left', missing: 'Add {n} more',
    jugs: [
      { id: 'library', label: 'The library' }, { id: 'home', label: 'At home' },
      { id: 'cafe', label: 'A café' }, { id: 'lab', label: 'A lab' },
    ],
  },
},
```

**6. How busy is the library in exam weeks?** A point on a scale: a track.

```js
{
  id: '1.6', kind: 'question', template: 'track', chapter: 'I', title: 'Exam-week library',
  question: 'How easy is it to find a seat in the library in exam weeks?',
  instruction: 'Tap one.', notes: [],
  next: 'Next', rule: 'Tap one',
  data: {
    store: 'examSeat', missing: 'Tap one', ends: ['Always a seat', 'Never a seat'],
    stops: [
      { id: '1', label: 'Always easy' }, { id: '2', label: 'Usually easy' },
      { id: '3', label: 'It depends on the time' }, { id: '4', label: 'Usually hard' },
      { id: '5', label: 'I give up and go elsewhere' },
    ],
  },
},
```

**7. What would you pay?** A number in a sentence, with a range and a gentle check.

```js
{
  id: '1.7', kind: 'question', template: 'sentence', chapter: 'I', title: 'Paying for a desk',
  question: "I'd pay up to $[  ] a month for a guaranteed quiet desk.", questionIsObject: true,
  instruction: 'Type an amount. 0 is fine.', notes: [],
  next: 'Next', rule: 'Type an amount from 0 to 200',
  data: {
    store: 'pay',
    rows: [{ parts: ["I'd pay up to ", { slot: 'number', id: 'usd', prefix: '$', min: 0, max: 200, step: 5, decimals: 0 }, ' a month for a guaranteed quiet desk.'] }],
    checks: [{ when: { slot: 'usd', gt: 100 }, text: 'That’s $[N] a month. Is that right?' }],
    sample: { usd: 10 },
  },
},
```

**8. What one change would help most?** Their own words.

```js
{
  id: '1.8', kind: 'question', template: 'text', chapter: 'I', title: 'One change',
  question: 'What one change would help you study on campus?',
  instruction: 'A line or two.', notes: [],
  next: 'Next', rule: 'Write at least 3 characters',
  data: { store: 'change', counterFrom: 0.8, fields: [{ id: 'change', limit: 280, required: true, min: 3 }] },
},
```

### The same in the game-style survey

In `src/kit/game/questions.ts`, each question is one entry in `QUESTIONS`, and `PLAY_ORDER` sets the order on a
phone and a laptop. Questions 3 and 5 look like this:

```ts
{
  id: 's1.3', block: 'you', template: 'podium',
  question: 'What matters most in a study space?',
  instruction: 'Pick your top 3, most important first.',
  options: [
    { id: 'quiet', label: 'Quiet' }, { id: 'plugs', label: 'Power sockets' },
    { id: 'wifi', label: 'Fast wifi' }, { id: 'light', label: 'Daylight' },
    { id: 'hours', label: 'Open late' }, { id: 'seat', label: 'Always a free seat' },
  ],
  constraints: { pick: 3 },
  shuffle: true,
  objectText: { first: '1st', second: '2nd', third: '3rd' },
  channels: ['phone', 'desk'],
  stores: 'matters',
  measures: 'What a study space needs, top 3.',
},
{
  id: 's1.5', block: 'you', template: 'bottle',
  question: 'Picture 10 hours of study in a week. Where do they happen?',
  instruction: 'Tap a jug to pour 1 hour.',
  options: [
    { id: 'library', label: 'The library' }, { id: 'home', label: 'At home' },
    { id: 'cafe', label: 'A café' }, { id: 'lab', label: 'A lab' },
  ],
  constraints: { total: 10 },
  objectText: { counter: '{left} of 10 hours left' },
  channels: ['phone', 'desk'],
  stores: 'hours',
  measures: 'Where study hours go.',
},
```

Section names (`block`) are set in `src/kit/game/contract.ts`. Rename them there, and in `BREAKS` and
`BLOCK_ORDER` in `questions.ts`.

## Tips

- **One question, one thing to do.** If a question needs an "and", split it.
- **Write options as people talk.** "At home or in my room", not "Residential location".
- **Four to six options** is easy to scan; past eight, use a card sort or trays.
- **Add "Not sure" or "Somewhere else"** when people genuinely might not know. Mark it `pinned` so it stays last
  when the list is shuffled.
- **Shuffle lists** (`shuffle: true`) so the first option isn't picked just for being first.
- **Choose ids you'll recognise in the CSV.** Quiz-style columns are named by step `id` (`1.4.library`), game-style
  columns by `stores` (`matters`).
- **Try it on a phone.** Most people will answer on one.
