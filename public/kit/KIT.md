# The screens

Every screen in both experiences, with the football sample's question and the answer each one saves. The
contents page (`/`, or `index.html` in this folder) shows both experiences as two cards, each with its own Start;
the chosen one's screens are listed below it, and each row opens that screen as a preview. The repo's README
covers running it, collecting answers and the CSV; `docs/your-questions.md` shows how to turn your own questions
into these screens.

| | **Static screens** | **Game-style screens** |
|---|---|---|
| Try it | The Quiz-style card, or open `index.html` from this folder | The Game-style card (`/kit/index.html#game`); the screens run at `/kit/game` |
| Sample | Matchday: 44 steps, 7 chapters | Matchday: 19 questions on a laptop, 15 on a phone |
| Built with | Plain HTML and JavaScript; no build, no libraries; works from a folder | React components in a Next.js app |
| Look | A paper frame with chapter cards and a row of footballs for progress | A misty landscape, a mountain line for progress, a climber on section breaks, sound |
| Edit | `public/kit/script.js` | `src/kit/game/questions.ts` |
| Open one screen | `t-<template>.html?id=<step>` | `/kit/game?at=<id>`, e.g. `?at=f2.2` (questions, follow-ups, `scene`, `break:<section>`) |
| Screens | Card sort into four piles, top-3 podium, rank of ten, trays, stamps (five looks), sentence with numbers and word chips, scales, bottle, shares to 100%, a ledger, a share-then-what-ifs column, configure, quotes, notes, a back page | Podium, swipe deck into two piles, split cards (a Today row and a later row), trays with a capacity each, bottle with pouring jugs, stamps, months slider, sentence builder (Watched · Been to · Travelled to), match invite, signed letter, a scene where a calendar flips forward, scales, notes |
| Follow-ups | Every one shows, with a grey note saying when it would appear | Asked only when the answer calls for it in a real run (`/kit/game?live=1`, the card's Start); every one shows in a preview (`/kit/game`, the rows) |
| Answers | Sent when they reach the ending (`SURVEY.send`) | Sent when they press Finish in a real run |
| Guide | This file, from "What's in the folder" on | `src/kit/game/README.md`, and [Game-style screens](#game-style-screens) below |

The rest of this file is about the static screens until [Game-style screens](#game-style-screens).

## What's in the folder

| File | What it is |
|---|---|
| `script.js` | The survey: every screen in order, with its words and data. **The only file you need to edit.** |
| `t-<template>.html` | One page per screen type. `t-piles.html?id=3.1` draws step 3.1 with the piles template. |
| `nav.js` | Order, numbering, Back and Next, and the answers kept in the browser. |
| `frame.js` | The frame around every screen: the top rail, the question, the Next bar. |
| `preview.css` | Colours and fonts. Change the tokens at the top to rebrand every screen. |
| `index.html` | The contents page: every step, linked. |

It's plain HTML and JavaScript, with no build step and no libraries. It works straight from the folder (`file://`)
and from any static host, such as GitHub Pages, Netlify, S3 or the `public/` folder of an existing site.

## Make your own in five steps

1. Copy the folder. Open `index.html` to check it runs.
2. In `script.js`, change `title`, `wordmark`, `intro`, `banner` and `storageKey` at the bottom.
3. Rewrite `chapters`: one per section, each with a numeral, a name, a line for its chapter card and the minutes it
   takes.
4. Rewrite `steps`. Start from the example closest to what you want to ask (the catalogue below lists them all),
   copy it and change the words. Keep each `id` unique. Give a follow-up `kind: 'followup'` and a `parent`.
5. Reload and click through. Open the browser console: `nav.js` warns about a repeated id, an unknown template, or
   a follow-up or a borrowed list that points at a step that isn't there.

To rebrand, edit the `:root` tokens in `preview.css`: `--accent-deep`, `--accent` and `--accent-light` are the
accent family, and `--font-display` is the display face. The football that marks progress is drawn in `frame.js`
(`ballG`).

### Rules worth keeping

- **One question, one action.** Each screen asks one thing and says how to answer it ("Tap one", "Stamp each card").
- **Plain words.** Write as you'd say it to a friend, and use the hint line under an option for anything that needs
  explaining.
- **Give a sample answer** (`data.sample`) to any step a later screen reads from. That lets the later screen be
  opened on its own.
- **Phones don't scroll.** Every screen fits 390x660 and laptops from 1280x650. A screen with long lists steps its
  type and spacing down until it fits, so keep options short.

## How a step is written

```js
{
  id: '3.4', kind: 'question', template: 'track', chapter: 'III', title: 'How early they arrive',
  question: 'How early do you get to the ground?',
  instruction: 'Tap one.', notes: [],
  next: 'Next', rule: 'Tap one',
  data: {
    store: 'arrive', missing: 'Tap one',
    ends: ['Last minute', 'First in'],
    stops: [
      { id: 'kick-off', label: 'Just in time for kick-off' },
      { id: '30', label: '30 minutes before' },
      { id: '60', label: 'An hour before' },
      { id: '120', label: 'Two hours before', hint: 'Time for a drink' },
      { id: 'gates', label: 'When the gates open', hint: 'For the warm-up' },
    ],
  },
}
```

| Field | Meaning |
|---|---|
| `bridge` | A short lead-in line above the question (green). Good for follow-ups: "And going in person." |
| `question`, `instruction`, `notes[]` | The question, how to answer, and grey notes below. |
| `questionIsObject` | The sentence on screen *is* the question (sentence screens, "The best-run club I know of is ___"). |
| `rule` | What finishing means. Shown beside Next as "To finish: Tap one". |
| `previewCondition` | For follow-ups that only show after some answers: the condition, in plain words. |
| `stage: true` | The wide frame, with the words in a side column. Use it for the ledger, ladder, rank, price list, configure and newspaper. |
| `data.vars` | Fills `[X]` or `{n}` from an earlier answer: `{ X: { from: '4.2', key: 'split', sample: 4 } }`, or a constant `{ n: { value: 8 } }`. |
| `data.shuffle` | Shuffles options, cards or rows. A `pinned` option stays last; a `pinned` row stays first. |

## The screens

Each entry gives what the screen is for, the Matchday step that shows it, and the answer it saves. Answers are kept
under the step id: `SurveyNav.answers.all()` returns every answer as one object.

### Choosing

**Tap one** · `checklist`, `mode: 'one'`
A list of options; one tap picks. Matchday uses its picture and choice-of-two forms below; leave out `pictures` and
`tradeoff` for a plain list (4.3a shows the list look). Saves the option id: `'pub'`.

**Pick one or two** · `checklist`, `mode: 'two'`, `min: 1, max: 2` · 4.3a
> If you had to cut back, which would you keep? *At the ground · In a pub or bar · Live matches on TV or streaming ·
> Highlights and replays · Clips on social media · Podcasts and radio · Fantasy football and video games*

Saves ids in the order picked: `['ground', 'live-tv']`.

**Picture tiles** · `checklist`, `pictures: true`, `layout: 'row'` · 2.3
> Where do you watch most of your club's matches? *At the ground · In a pub · At home · On my phone*

Each option names a line drawing (`picture: 'stadium'`). The drawings are in `t-checklist.html` (`ART`); add your
own there. Saves `'home'`.

**A choice of two** · `checklist`, `tradeoff: true` · 1.1-1.3
> The best part of a match is ________. *The goals · The atmosphere*

Two large cards. The pick is written into the blank, and the two swap sides at random. Saves `'atmosphere'`.

**Region, then country** · `checklist`, `mode: 'region-market'` · 2.1
> Where is the club you follow most? *Europe → England, Spain, Germany… · Somewhere else (type it)*

Saves `{ region: 'europe', market: 'Spain' }`, or `{ region: 'other', market: 'Iceland' }`.

### Scales

**Stops on a line** · `track` · 3.4, 2.2a
> How early do you get to the ground? *Just in time for kick-off → When the gates open*

`ends` names the two ends; `labelsUnder: true` (2.2a) puts long labels under the stops. Saves the stop id: `'60'`.

**A split on a line** · `track`, `numeric: true` · 4.4
> How much of the football you watch is on a phone? *0% … 100%*, read as "30% on a phone · 70% on a bigger screen"

Saves the number: `30`.

### Sorting and ranking

**Card sort into four piles** · `piles` · 3.1
> How much does each of these matter on a matchday? *12 cards: A drink with friends before the game, Singing in the
> stands, Food at half-time…* into *Not for me · Nice to have · Expected · Makes the day*

Tap a pile or press 1-4; Undo puts the last card back. The first pile is drawn grey and later screens can leave out
what went in it. Saves `{ pint: 'top', programme: 'out', … }`.

**Top 3 podium** · `podium` · 5.4 (its own list), 3.1a (from a pile)
> What would make a ticket worth paying more for? *A better view, A roof over my seat, A team that wins… (10)*

With `optionsFrom: { step: '3.1', pile: 'top' }` it offers only the cards put in that pile. Above 8 cards it turns
into a fanned pile. Saves `['winning', 'together', 'view']`, first place first.

**Rank all ten** · `rank` · 6.3
> What does football need most over the next ten years? *Tickets people can afford, Fans with a real say… (10)*

Saves all ten ids, 1 first. The ending shows the top three (`top3From: '6.3'`).

**Tiles into trays** · `trays` · 3.2
> Who should sort out each of these? *Ticket prices, Safe standing, Trains and buses home…* into *The club · The
> league · The local council · The fans themselves*

`tilesFrom: { step: '3.1', excludePile: 'out' }` drops tiles whose card went in Not for me; `always: true` keeps one
regardless. Saves `{ prices: 'club', transport: 'council' }`.

### Stamps

A deck of cards, each stamped with one of three or four answers. Saves `{ cardId: stampId }`.

| Skin | Matchday step | Looks like |
|---|---|---|
| `plain` | 3.5: Would you want your club to do each of these? *Yes · Only after a fan vote · No* | A card and three stamps |
| `ai` with `timeline: true` | 6.1: Who should make each of these calls in a match? *The referee alone → Technology alone* | Four stamps, cards in a fixed order with a timeline |
| `tariff` | 5.1: Would you back each of these changes to ticket prices? *Back it · Try it for a season · No* | A printed price list with a box per line |
| `readiness` | 6.4: How is football doing on each of these today? *Doing well · Getting there · A long way off* | Grades stamped into a box |

**Pick one line** · `stamp`, `mode: 'pick-line'` · 5.1a
> If the club could make only one of these changes, which one?

Only the lines stamped Back it or Try it on 5.1 can be picked (`optionsFrom: { step: '5.1', stamps: ['back', 'try'] }`).
Saves `'away-cap'`.

### Numbers and amounts

**A sentence with blanks** · `sentence` · 2.2, 5.2, 6.5
> I'd pay up to £[ ] for a season ticket, and I would [renew · think twice · stop] if it went up 10%.

Number slots (with a range, steppers and a prefix or suffix) and word chips, in one sentence. `optOut` adds a line
under it ("I wouldn't buy a season ticket at any price"); `checks` show a soft grey question when a number looks off
(5.2: "That’s £[N] for one season. Is that right?", with the typed amount in place of [N]). Saves `{ gbp: 600, verb: 'think' }`, or `'never'`.

**Pour into jugs** · `bottle` · 3.3
> Picture a home matchday that takes 10 hours, door to door. Where does the time go? *Getting there and back ·
> Before kick-off · In the ground · After the final whistle*

Each tap adds one unit, up to `total`. Saves `{ travel: 3, before: 2, match: 3, after: 2 }`.

**Shares that add up to 100%** · `allocate-list` · 5.3
> Out of every £100 your club earns, where do you think it comes from? *TV and streaming deals, Tickets and
> hospitality, Sponsors…*

Saves `{ tv: 45, tickets: 15, … }`. With `vars.N` from an earlier number, each share also shows as a count.

**A ledger of 10** · `allocate-ledger` · 4.2 then 4.3
> Picture a typical week in the season: 10 hours of football. How much is out and about, and where?
> That leaves [X]h at home. Where do they go?

The first screen takes a split of 10, then fills the first column; the second fills the rest. `unit` sets what is
shown around each number (`{ pre: '£', post: '' }`, or `{ pre: '', post: 'h' }`). The total is 10, in steps of
0.1. Saves `{ split: 4, ground: 2, pub: 1.5, … }`, then `{ 'live-tv': 2.5, … }`.

**A share, then what-ifs** · `ladder` · 4.1
> What share of your club's league matches do you watch live? Then: if each of these happened, what share would you
> watch? Then: all four together?

A glass column with three steps on one screen. Saves `{ base: 50, cheaper: 65, …, four: 85 }`.

### The same questions for a few things

**Configure** · `configure` · 6.2
> How do you follow each of these competitions? *The league · The cup · Europe*, each with: How much does it matter?
> How do you follow it? (tick any) Who do you mostly watch it with?

One item at a time, three parts each. An option with `only: ['cup', 'europe']` shows for those items only;
`skipRest` skips the other parts when part 1 is "Not for me". Saves
`{ league: { belongs: 'top', covers: ['ground', 'tv'], who: 'friends' }, … }`.

### In their own words

**Three quotes** · `text`, `skin: 'quotes'` · 2.4
> A friend asks why you support your club. What three reasons would you give them?

Saves `{ r1: '…', r2: '…', r3: '…' }`.

**Notes** · `text` · 7.1 (two notes), 7.3 (`optional: true`: Next reads Skip while empty)

**Finish the sentence** · `text` with `sentence` · 7.2
> The best-run club I know of is ________. *(type-ahead from a list; a chip for "I can't think of one")*

Saves `{ name: 'Brentford', why: '…' }`.

**A back page** · `newspaper` · 7.4
> Your club wins the league. What headline would you want on the back page? Then: what do you say to the reporter?

The page fills in as they type. Saves `{ headline, quote }`.

### Around the questions

| Screen | Template | In Matchday |
|---|---|---|
| Welcome | `flow`, `variant: 'welcome'` | W |
| A statement with a scale | `flow`, `variant: 'statement'` | 0.1: who the survey is for |
| Chapter card and map | `break` | break-I … break-VII |
| A pause before the last screen | `flow`, `variant: 'pause'` | pause |
| Ending with their top three | `flow`, `variant: 'ending'` | end |

## What the sample does not do

The kit is a demo, so builders know what they are getting:

- **Answers are sent once, at the ending.** Along the way they stay in the browser (`localStorage`, under
  `storageKey`). The ending (`t-flow.html`, `ending()`) posts `SurveyNav.answers.all()` to `SURVEY.send.url` and
  says "sent" only once the server confirms. Opened from a folder, nothing is sent.
- **Next always works.** A live survey should hold Next until the screen is done. Every screen already reports
  whether it is done (`ui.status(complete)` in each template, shown as "To finish: …"), so that's the hook to use.
- **Every follow-up shows.** A live survey should skip a follow-up whose condition isn't met. The condition is
  written in `previewCondition` for people; code it where you decide the next step (`SurveyNav.next` in `nav.js`).
- **No respondent sign-in.** A personal link (`?r=CODE` on any page) tags the answers with that code; see the
  README for accounts.

## Checking your survey

- `node e2e/kit-walk.mjs` opens the kit in Chrome, clicks Next through every step on a
  laptop and a phone, and plays the screens whose answers feed later ones.
- Click through by hand at a phone size (390x660 in the browser's device mode) and a small laptop (1280x650).

## Game-style screens

The game-style half lives in `src/kit/game/` and runs at `/kit/game`. It is a copy of a game-like survey
engine with its own storage key. A real run (`?live=1`) sends its answers when someone presses Finish. To make your own, edit `src/kit/game/questions.ts` and
the section names in `src/kit/game/contract.ts`. Each question is typed data:

```ts
{
  id: 'f2.1', block: 'matchday', template: 'trays',
  question: 'How should a matchday change?',
  instruction: 'Place 7 of the 12. Leave the rest.',
  options: MATCHDAY,                                  // the twelve tiles
  constraints: {
    pick: 7,
    trays: [
      { id: 'more', label: 'More of it', capacity: 3 },
      { id: 'different', label: 'Do it differently', capacity: 2 },
      { id: 'less', label: 'Less of it', capacity: 2 },
    ],
  },
  followUps: [{ id: 'f2.1.best', when: 'always', bridge: 'One more on what you want more of.',
    question: 'Which one would make the biggest difference?', instruction: 'Tap one.',
    template: 'trays', options: MATCHDAY, optionsFrom: 'tray:more', constraints: { pick: 1 }, stores: 'matchday.best' }],
  channels: ['phone', 'desk'],
  stores: 'matchday.sort',
  measures: 'Trays with a capacity each, then one pick from the tiles put in More of it.',
}
```

| Screen | Matchday question | Answers | Saved as |
|---|---|---|---|
| Podium | f1.1 What first made you a fan of your club? | My family supported them, It was the club where I grew up, A favourite player… (top 2 on a phone, top 3 on a laptop) | `['family', 'player', 'home']` |
| Tap one, with a follow-up | f1.2 How old were you at your first live match? → Who took you? (not asked for "I haven't been yet") | Under 8 … 18 or older · I haven't been yet | `'8-12'`, then `'parent'` |
| Swipe deck | f1.3 Which of these do you do on every matchday? → Which two would you never give up? (two or more done every time; only those are offered) | Not me · Every time, on 6 cards (Wear the same shirt, Sit in the same seat…) | `{ shirt: 'always', seat: 'not-me' }` |
| Match invite | f1.4 What most often stops you going to a home match? | Tickets cost too much, The kick-off time moved… (marks the invite Declined) · Nothing, I go (Accepted) | `['price', 'time']` |
| Track with an opt-out | f1.5 How long does it take you to get to a home game? → How do you usually get there? (an hour or more only) | A short walk … More than two hours · I don't go to home games | `'hour'` |
| Sentence builder | f1.6 No one is a real fan until they have… | Watched · Been to · Travelled to, then a derby, a cup final, an away game abroad… or their own words | `{ verb: 'been', pick: 'derby' }` |
| Trays with capacity | f2.1 How should a matchday change? → Which one would make the biggest difference? | 12 tiles (Pre-match pint, Singing, Big screen replays…) into More of it (3), Do it differently (2), Less of it (2) | `{ pint: 'more', queue: 'less' }` |
| Bottle | f2.2 A home matchday takes 8 hours. Where should they go? | 5 jugs: Getting there and back, Before kick-off, The match itself… | `{ before: 3, match: 2, … }` |
| Stamps | f2.3 Six ideas for your ground. Should your club do each? → Where should it go? (Yes on the terrace only) | No · Not sure · Yes | `{ standing: 'yes', naming: 'no' }` |
| Letter | f2.4 Every season-ticket holder should be promised one thing. Which? | The same seat every season, A vote on ticket prices… | `'vote'` |
| Scene | Imagine it's 2035 and your club has: a stadium twice the size, every match streamed live, tickets at half today's price | (not a question) | `'seen'` |
| Split cards | f3.1 How do you follow each one today? And in 2035? → Why still travel to away games? | At the ground · Live on a screen · Highlights later · Don't follow it, in both rows, on 4 cards | `{ away: 'ground', 'away.today': 'tv' }` |
| Trays, place all | f3.2 What would each of these do to the atmosphere? → What matters most for a loud ground? | 4 tiles into Makes it better · No difference · Makes it worse | `{ dynamic: 'worse' }` |
| Pick three, then the rest | f3.3 In 2035, which three will matter most to fans? → Will any matter less than today? | Ticket prices, A say in how the club is run, Results… | `['price', 'say', 'results']` |
| Months | f4.1 How long should a new manager get before being judged? | 6 months to 4 years · No set time: judge them game by game | `30` or `'game-by-game'` |
| Swipe deck with 3D pictures | f4.2 Can money buy each of these, or does it take time? | Money can buy it · It takes time | `{ academy: 'time' }` |
| Pick one or two | f4.3 What would fix football most? | Cheaper tickets, Fans on the club board… · Not sure | `['prices']` |
| Track | fC1 How much does the game need to change? | No change … Start again | `'some'` |
| Notes | fC2 What should football keep, and what should it change? | Keep · Change · Anything we didn't ask? (optional) | `{ keep: '…', change: '' }` |

The screens are built for a phone (390x660) and a laptop window of 1440x790; a laptop window shorter than 700px
scrolls. `node e2e/game-walk.mjs` (with `DESK=1` for a laptop) plays two routes through every screen and
checks the route, the fit, and that finishing stores exactly one response.

