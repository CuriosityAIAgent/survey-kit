/* The survey script: every screen, in play order, with all of its words and data. This is the only file you need to
 * edit to make your own survey. The pages (t-<template>.html) draw whatever this file describes.
 *
 * This copy is "Matchday", a sample football fan survey that uses every screen type at least once. KIT.md lists
 * each type with what it is for and the answer it saves.
 *
 * Top-level fields (window.SURVEY)
 *   title, wordmark, intro    the survey's name, its big name on the welcome and contents page, the contents intro
 *   context                   a grey line the frame prints under every question ('' for none)
 *   banner                    the strip across the top of every page
 *   storageKey                answers are kept in this browser's localStorage under '<storageKey>:<step id>'
 *   noBreak                   phrases that must never break across two lines
 *   kit                       the contents page: its heading, intro and list labels
 *   game                      the Game-style experience: where it lives, its description and screen list
 *   chapters                  { numeral, name, line, minutes } in order; each break card shows one
 *   steps                     every screen, in play order (fields below)
 *   templates                 template name -> its page; nav.js warns about a step whose template is not listed
 *   ui                        interface lines the frame and the break cards share
 *
 * Step fields
 *   id                        unique, shown on the contents page; follow-ups usually add a letter ('3.1a')
 *   kind                      'welcome' | 'statement' | 'break' | 'question' | 'followup' | 'pause' | 'ending'
 *   template                  which page draws it (see `templates`)
 *   chapter                   a chapter numeral, or null before the first chapter and for the ending
 *   parent                    follow-ups: the step they follow
 *   title                     a short name for the contents page and reports
 *   bridge, question, instruction, notes[]   the words above the object, in that order
 *   questionIsObject          the sentence on screen is the question, so the band prints it for screen readers only
 *   previewCondition          follow-ups that only show after some answers: when, in plain words (shown as a grey note)
 *   previewNote               where a placeholder or a list comes from
 *   rule                      what finishing the screen means, shown beside Next ("To finish: Sort all 12 cards")
 *   next                      the Next label
 *   stage                     the wide frame: the words in a side column, the object beside them
 *   data                      everything the template needs; each template's keys are in KIT.md
 *
 * Placeholders: [X] or {n} in the words are filled from data.vars (an earlier answer, its sample, or a constant).
 * Samples: data.sample is a plausible answer, used when a later screen needs this one and it was not played.
 */
(function () {
  'use strict'

  const chapters = [
    { numeral: 'I', name: 'Kick-off', line: 'Three quick choices between two good things. Go with your first instinct.', minutes: 1 },
    { numeral: 'II', name: 'You and your club', line: 'Who you follow, for how long, and where you watch.', minutes: 3 },
    { numeral: 'III', name: 'Matchday', line: 'What makes a good day at the ground, from the first pint to the last train home.', minutes: 4 },
    { numeral: 'IV', name: 'Watching', line: 'How much football you watch, and where those hours go.', minutes: 4 },
    { numeral: 'V', name: 'Money', line: 'Ticket prices, season tickets and where a club gets its money.', minutes: 4 },
    { numeral: 'VI', name: 'The game', line: 'Video replays, the fixture list and what the game needs most.', minutes: 4 },
    { numeral: 'VII', name: 'Your view', line: 'A few answers in your own words. The last one is a back page.', minutes: 4 },
  ]

  /* ------------------------------------------------------------------ shared lists */

  // The four piles every card sort uses, left to right. The first is the "leave it out" pile: it is drawn grey, and a
  // later screen can drop what was put there (excludePile: 'out').
  const PILES = [
    { id: 'out', label: 'Not for me', gloss: "I wouldn't miss it" },
    { id: 'nice', label: 'Nice to have', gloss: "Good, but it doesn't make the day" },
    { id: 'core', label: 'Expected', gloss: "I'd notice if it was missing" },
    { id: 'top', label: 'Makes the day', gloss: 'Part of why I go' },
  ]
  const PILE_UI = {
    fanHint: 'Tap a card to sort it again.',
    fanClose: 'Close',
    fanCardAria: '{card}. Tap to sort it again.',
    doneCap: 'Cards sorted',
    doneLine: 'Tap a pile to see or change it.',
    missing: 'Sort {n} more',
    undo: 'Undo',
    change: 'Change',
  }
  const PODIUM_UI = {
    ranks: ['1st', '2nd', '3rd'],
    slot: '{rank} goes here',
    full: 'The podium is full. Tap a card to swap it out.',
    ariaPlaced: '{card}, {rank}. Tap to remove.',
    ariaReplace: 'Tap to replace it.',
    missing: ['Pick 3', 'Pick {n} more'],
  }
  const RANK_UI = {
    trayHead: 'To place',
    ladderHead: 'Your order',
    clear: 'Clear all',
    trayDone: 'All ten are placed.',
    holdLine: 'Move it with ↑ ↓, or tap an empty place. Tap its number to remove it.',
    phoneToast: 'Number {n} cleared · Undo',
    missing: 'Place {n} more',
  }
  // The ten things the game might need (6.3), reused by the readiness stamps (6.4).
  const GAME_NEEDS = [
    { id: 'prices', label: 'Tickets people can afford' },
    { id: 'fan-say', label: 'Fans with a real say in how clubs are run' },
    { id: 'grassroots', label: 'Good pitches for grassroots football' },
    { id: 'womens', label: "Investment in the women's game" },
    { id: 'finances', label: 'Clubs that live within their means', hint: 'Owners who can’t run up big debts' },
    { id: 'welfare', label: 'Fewer matches for top players' },
    { id: 'referees', label: 'Better refereeing' },
    { id: 'abuse', label: 'Stamping out abuse', hint: 'In the ground and online' },
    { id: 'home-towns', label: 'Clubs staying in their home towns' },
    { id: 'free-tv', label: 'Big matches free to watch on TV' },
  ]
  // The ledger rows (4.2 and 4.3): where football time goes.
  const HOURS_ROWS = [
    { id: 'ground', label: 'At the ground', hint: 'Home and away' },
    { id: 'pub', label: 'In a pub or bar' },
    { id: 'live-tv', label: 'Live matches on TV or streaming' },
    { id: 'highlights', label: 'Highlights and replays' },
    { id: 'clips', label: 'Clips on social media' },
    { id: 'audio', label: 'Podcasts and radio' },
    { id: 'games', label: 'Fantasy football and video games' },
  ]
  const LEDGER_UI = {
    header: 'A TYPICAL WEEK IN THE SEASON · 10 HOURS',
    rowHead: 'Where it goes',
    totalHead: 'Row total',
    columns: { cash: 'Out and about', inv: 'At home' },
    invHeader: 'At home: on the sofa, at the table, in bed with a phone',
    sub: { first: 'type the split first', toPlace: '{x} to place', placed: '{x} placed', nothing: 'nothing to place', nextScreen: 'next screen', locked: 'locked', phone: 'of {x}' },
    running: 'Out and about: {placed} of {target} · {left} left',
    over: '{x} too much',
    total: 'Total',
  }
  const SAMPLE_NOTE = 'Sample answers stand in when the earlier screen was not played.'

  /* ------------------------------------------------------------------ the steps */

  const steps = [
    /* ============================== opening */
    {
      id: 'W', kind: 'welcome', template: 'flow', chapter: null, title: 'Welcome',
      next: 'Start', rule: null,
      data: {
        variant: 'welcome',
        wordmark: 'MATCHDAY',
        nameLine: 'A short survey for people who follow football, from the stands or the sofa.',
        body: [
          "We'd like to know how you follow your club: where you watch, what you'd pay, and what you'd change about the game.",
          'Most screens are a tap or a drag. A few ask you to write a line or two.',
          'It takes about 20 minutes.',
        ],
        best: '',
        start: 'Start',
        privacy: { link: 'Privacy', title: 'Privacy', text: 'Your answers are saved in this browser as you go, and sent to whoever runs this survey when you reach the end. Edit this text to say who that is and how the answers are used.', close: 'Close' },
      },
    },
    {
      id: '0.1', kind: 'statement', template: 'flow', chapter: null, title: 'Who this is for',
      question: 'This survey is for regular fans: people who follow most of their club’s matches.',
      instruction: 'Answer with your own club in mind.',
      notes: ['Following counts however you do it: at the ground, on TV, on the radio or on your phone.'],
      noContext: true,
      next: 'Next', rule: null,
      data: {
        variant: 'statement',
        ruler: {
          marker: 'The fans we mean',
          zones: { lo: 'Now and then', mid: 'Regulars: most matches', hi: 'Every single game' },
          ticks: ['0', '10', '30', 'all'],
          aria: 'A scale of matches followed in a season: now and then, regulars who follow most matches, and fans who follow every game. This survey is for the regulars.',
        },
      },
    },

    /* ============================== I · Kick-off */
    { id: 'break-I', kind: 'break', template: 'break', chapter: 'I', title: 'Chapter break', next: 'Next', rule: null, data: {} },
    {
      id: '1.1', kind: 'question', template: 'checklist', chapter: 'I', title: 'Goals or atmosphere',
      question: 'The best part of a match is ________.',
      instruction: "Both matter. Tap the one that's closer to your view.", notes: [],
      next: 'Next', rule: 'Tap one',
      data: {
        store: 'bestPart', mode: 'one', shuffle: true, layout: 'row', tradeoff: true, missing: 'Tap one',
        options: [
          { id: 'goals', label: 'The goals' },
          { id: 'atmosphere', label: 'The atmosphere' },
        ],
      },
    },
    {
      id: '1.2', kind: 'question', template: 'checklist', chapter: 'I', title: 'Win ugly or lose well',
      question: "I'd rather my club ________.",
      instruction: 'Both have their fans. Tap the one you’d pick.', notes: [],
      next: 'Next', rule: 'Tap one',
      data: {
        store: 'winUgly', mode: 'one', shuffle: true, layout: 'row', tradeoff: true, missing: 'Tap one',
        options: [
          { id: 'win-ugly', label: 'Won ugly', hint: 'Three points, however we get them' },
          { id: 'play-well', label: 'Played good football', hint: 'Even if we drop points' },
        ],
      },
    },
    {
      id: '1.3', kind: 'question', template: 'checklist', chapter: 'I', title: 'Tactics or people',
      question: 'A great manager is mostly good at ________.',
      instruction: "Both matter. Tap the one that's closer to your view.", notes: [],
      next: 'Next', rule: 'Tap one',
      data: {
        store: 'manager', mode: 'one', shuffle: true, layout: 'row', tradeoff: true, missing: 'Tap one',
        options: [
          { id: 'tactics', label: 'Tactics' },
          { id: 'people', label: 'Managing people' },
        ],
      },
    },

    /* ============================== II · You and your club */
    { id: 'break-II', kind: 'break', template: 'break', chapter: 'II', title: 'Chapter break', next: 'Next', rule: null, data: {} },
    {
      id: '2.1', kind: 'question', template: 'checklist', chapter: 'II', title: 'Where the club is',
      question: 'Where is the club you follow most?',
      instruction: 'Tap a region, then a country.', notes: [],
      next: 'Next', rule: 'Tap a region, then a country (or Somewhere else, then type it)',
      data: {
        store: 'clubCountry', mode: 'region-market', missing: 'Tap one',
        regions: [
          { id: 'europe', label: 'Europe', markets: ['England', 'Scotland', 'Spain', 'Germany', 'Italy', 'France', 'Portugal', 'Netherlands'] },
          { id: 'americas', label: 'The Americas', markets: ['Brazil', 'Argentina', 'Mexico', 'United States'] },
          { id: 'africa-asia', label: 'Africa, Asia and Oceania', markets: ['Egypt', 'Morocco', 'Nigeria', 'Saudi Arabia', 'Japan', 'Australia'] },
        ],
        other: { id: 'other', label: 'Somewhere else', pinned: true, field: { limit: 40 } },
      },
    },
    {
      id: '2.2', kind: 'question', template: 'sentence', chapter: 'II', title: 'Years following the club',
      question: "I've followed my club for about [  ] years.", questionIsObject: true,
      instruction: 'Type a number.', notes: [],
      next: 'Next', rule: 'Type a number from 0 to 90',
      data: {
        store: 'years',
        rows: [{ parts: ["I've followed my club for about ", { slot: 'number', id: 'n', suffix: ' years', min: 0, max: 90, step: 1, decimals: 0 }, '.'] }],
        checks: [{ when: { slot: 'n', gt: 70 }, text: 'That’s [N] years. Is that right?' }],
        sample: { n: 15 },
      },
    },
    {
      id: '2.2a', kind: 'followup', template: 'track', chapter: 'II', parent: '2.2', title: 'How often they go',
      bridge: 'And going in person.',
      question: 'How often do you go to a match?',
      instruction: 'Tap one.', notes: [],
      next: 'Next', rule: 'Tap one',
      data: {
        store: 'goOften', missing: 'Tap one', labelsUnder: true,
        stops: [
          { id: 'never', label: "I've never been" },
          { id: 'rarely', label: 'Once a season or less' },
          { id: 'few', label: 'A few times a season' },
          { id: 'most-home', label: 'Most home games' },
          { id: 'home-away', label: 'Home and away' },
        ],
      },
    },
    {
      id: '2.3', kind: 'question', template: 'checklist', chapter: 'II', title: 'Where they watch most',
      question: "Where do you watch most of your club's matches?",
      instruction: 'Tap one.', notes: [],
      next: 'Next', rule: 'Tap one',
      data: {
        store: 'watchWhere', mode: 'one', shuffle: false, pictures: true, layout: 'row', missing: 'Tap one',
        options: [
          { id: 'ground', label: 'At the ground', hint: 'In the stands', picture: 'stadium' },
          { id: 'pub', label: 'In a pub', hint: 'With other fans', picture: 'pub' },
          { id: 'home', label: 'At home', hint: 'On the TV', picture: 'sofa-tv' },
          { id: 'phone', label: 'On my phone', hint: 'Wherever I am', picture: 'phone-match' },
        ],
      },
    },
    {
      id: '2.4', kind: 'question', template: 'text', chapter: 'II', title: 'Three reasons for the club',
      bridge: 'A friend asks why you support your club.',
      question: 'What three reasons would you give them?',
      instruction: 'A sentence or two for each.', notes: [],
      next: 'Next', rule: 'Write all three, 3 characters or more each',
      data: {
        store: 'reasons', skin: 'quotes', counterFrom: 0, phoneNext: 'Next reason', counter: '{n} left',
        fields: [
          { id: 'r1', stem: '1.', limit: 280, required: true, min: 3 },
          { id: 'r2', stem: '2.', limit: 280, required: true, min: 3 },
          { id: 'r3', stem: '3.', limit: 280, required: true, min: 3 },
        ],
      },
    },

    /* ============================== III · Matchday */
    { id: 'break-III', kind: 'break', template: 'break', chapter: 'III', title: 'Chapter break', next: 'Next', rule: null, data: {} },
    {
      id: '3.1', kind: 'question', template: 'piles', chapter: 'III', title: 'What makes a matchday, 12 cards',
      question: 'How much does each of these matter on a matchday?',
      instruction: 'Tap a pile for each card. 12 cards.', notes: [],
      next: 'Next', rule: 'Sort all 12 cards',
      data: {
        store: 'matchday', shuffle: true, seed: 3100, keys: '1-4', followup: '3.1a',
        piles: PILES, ui: PILE_UI,
        cards: [
          { id: 'pint', label: 'A drink with friends before the game' },
          { id: 'singing', label: 'Singing in the stands' },
          { id: 'pie', label: 'Food at half-time' },
          { id: 'standing', label: 'Being able to stand', hint: 'In a safe standing area' },
          { id: 'screen', label: 'Replays on a big screen' },
          { id: 'warm-up', label: 'Watching the warm-up' },
          { id: 'players', label: 'Seeing players up close', hint: 'Autographs, selfies' },
          { id: 'fanzone', label: 'A fan zone with music', hint: 'Outside the ground' },
          { id: 'transport', label: 'An easy trip home', hint: 'Trains and buses that wait' },
          { id: 'programme', label: 'A printed programme' },
          { id: 'family', label: 'A family section' },
          { id: 'same-seat', label: 'The same seat every week', hint: 'Next to the same people' },
        ],
        sample: { pint: 'top', singing: 'top', pie: 'nice', standing: 'core', screen: 'nice', 'warm-up': 'out', players: 'nice', fanzone: 'out', transport: 'top', programme: 'out', family: 'core', 'same-seat': 'top' },
      },
    },
    {
      id: '3.1a', kind: 'followup', template: 'podium', chapter: 'III', parent: '3.1', title: 'Top 3 of the matchday',
      bridge: 'These are the cards in your Makes the day pile.',
      question: 'Which three matter most?',
      instruction: 'Pick your top 3, most important first.', notes: [],
      previewCondition: 'Shows only if Makes the day holds more than 3 cards.',
      next: 'Next', rule: 'Pick 3',
      data: { store: 'matchdayTop3', ui: PODIUM_UI, compact: true, maxPodium: 8, optionsFrom: { step: '3.1', pile: 'top' }, aboveMax: 'fan' },
    },
    {
      id: '3.2', kind: 'question', template: 'trays', chapter: 'III', title: 'Who should sort it out',
      question: 'Who should sort out each of these?',
      instruction: 'Put each one in a tray. {n} items.', notes: [],
      previewNote: 'Items come from 3.1: the ones not put in Not for me, plus ticket prices.',
      next: 'Next', rule: 'Put every item in a tray',
      data: {
        store: 'whoFixes', shuffle: true, missing: 'Place {n} more',
        trays: [
          { id: 'club', label: 'The club' },
          { id: 'league', label: 'The league' },
          { id: 'council', label: 'The local council' },
          { id: 'fans', label: 'The fans themselves' },
        ],
        tiles: [
          { id: 'prices', label: 'Ticket prices', always: true },
          { id: 'pie', label: 'Food at half-time' },
          { id: 'standing', label: 'Safe standing' },
          { id: 'screen', label: 'Replays on a big screen' },
          { id: 'fanzone', label: 'A fan zone' },
          { id: 'transport', label: 'Trains and buses home' },
          { id: 'singing', label: 'The singing' },
          { id: 'family', label: 'A family section' },
        ],
        tilesFrom: { step: '3.1', excludePile: 'out' },
      },
    },
    {
      id: '3.3', kind: 'question', template: 'bottle', chapter: 'III', title: 'Ten hours of a matchday',
      question: 'Picture a home matchday that takes 10 hours, door to door. Where does the time go?',
      instruction: 'Tap a jug to add an hour.', notes: [],
      next: 'Next', rule: 'Place exactly 10 hours',
      data: {
        store: 'dayHours', total: 10, shuffle: false, counter: '{left} of 10 hours left', missing: 'Add {n} more',
        jugs: [
          { id: 'travel', label: 'Getting there and back' },
          { id: 'before', label: 'Before kick-off' },
          { id: 'match', label: 'In the ground' },
          { id: 'after', label: 'After the final whistle' },
        ],
      },
    },
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
    },

    {
      id: '3.5', kind: 'question', template: 'stamp', chapter: 'III', title: 'Changes at the ground, 5 cards',
      question: 'Would you want your club to do each of these?',
      instruction: 'Stamp each card. 5 cards.', notes: [],
      next: 'Next', rule: 'Stamp all 5 cards',
      data: {
        store: 'groundChanges', skin: 'plain', shuffle: true, missing: 'Stamp {n} more',
        stamps: [
          { id: 'yes', label: 'Yes', impression: 'YES', glyph: 'tick' },
          { id: 'vote', label: 'Only after a fan vote', impression: 'FAN VOTE', glyph: 'step' },
          { id: 'no', label: 'No', impression: 'NO', glyph: 'cross' },
        ],
        cards: [
          { id: 'legend', label: 'Name a stand after a club legend' },
          { id: 'naming', label: 'Sell the stadium name to a sponsor' },
          { id: 'move', label: 'Move to a bigger ground out of town' },
          { id: 'terrace', label: 'Bring back a standing terrace' },
          { id: 'abroad', label: 'Play one home game abroad each season' },
        ],
      },
    },

    /* ============================== IV · Watching */
    { id: 'break-IV', kind: 'break', template: 'break', chapter: 'IV', title: 'Chapter break', next: 'Next', rule: null, data: {} },
    {
      id: '4.1', kind: 'question', template: 'ladder', chapter: 'IV', title: 'Share of matches watched live', stage: true,
      question: "Think of your club's league matches this season. What share do you watch live?",
      instruction: 'Tap the column or type a percentage.',
      notes: ['Live means as it happens: at the ground, on TV or streaming.'],
      next: 'Next', rule: "Set today's share, then each row, then all four together",
      data: {
        store: 'liveShare',
        aria: "Share of your club's league matches you watch live",
        steps: [
          { bridge: '', question: "Think of your club's league matches this season. What share do you watch live?", instruction: 'Tap the column or type a percentage.', notes: ['Live means as it happens: at the ground, on TV or streaming.'], missing: 'Set a share' },
          { bridge: 'What could change.', question: 'If each of these happened, what share would you watch live?', instruction: 'Type a new share for each. 5 rows.', notes: ['Take each one on its own.'], missing: 'Set {n} more' },
          { bridge: 'Last, the first four together.', question: 'If all four of these happened together, what share would you watch?', instruction: 'Tap the column or type a percentage.', notes: [], missing: 'Set one share for all four' },
        ],
        rows: [
          { id: 'cheaper', label: 'Tickets cost half as much', short: 'Cheaper', hint: 'Home and away', four: true },
          { id: 'one-sub', label: 'Every match on one subscription', short: 'One sub', hint: 'Instead of three or four', four: true },
          { id: 'kick-offs', label: 'Kick-offs stay at 3pm Saturday', short: 'Kick-offs', hint: 'No moves for TV', four: true },
          { id: 'transport', label: 'Late trains after evening games', short: 'Trains', four: true },
          { id: 'club-tv', label: 'A free club streaming pass', short: 'Club TV', hint: 'For season-ticket holders', four: false },
        ],
        ui: {
          readout: '{p}% · about {m} in every 10 matches',
          scaleRight: '{m}',
          rangeError: 'From 0% to 100%',
          todayTab: 'Today · {p}%',
          rowChip: 'No change',
          rowRangeError: 'From {base}% to 100%',
          step3Label: 'All four together',
          check: 'Your share for all four is lower than for [{row}] alone. Is that what you meant?',
        },
        snap: 5, rowStep: 5,
        sample: { base: 50, cheaper: 65, 'one-sub': 70, 'kick-offs': 55, transport: 60, 'club-tv': 60, four: 85 },
      },
    },
    {
      id: '4.2', kind: 'question', template: 'allocate-ledger', chapter: 'IV', title: 'Ten hours a week: out and about', stage: true,
      question: 'Picture a typical week in the season: 10 hours of football. How much is out and about, and where?',
      instruction: 'Type the split, then hours for each row.',
      notes: ['Out and about is anywhere but home: the ground, a pub, a friend’s house, the bus.'],
      next: 'Next', rule: 'Type the split, then make the Out and about column equal it',
      data: {
        store: 'hoursOut', phase: 'cash', rows: HOURS_ROWS, shuffle: true, ui: LEDGER_UI,
        unit: { pre: '', post: 'h', name: 'hours' },
        split: { parts: ['Of my 10 hours, ', { slot: 'number', id: 'split', min: 0, max: 10, decimals: 1 }, ' are out and about. The rest are at home.'], aria: 'Of my 10 hours, how many are out and about' },
        status: { noSplit: 'Type the split above to open the Out and about column.', zero: 'Nothing out and about.' },
        missing: { noSplit: 'Type the split', left: '{x} left to place', over: '{x} too much' },
        step: 0.5, typeStep: 0.1,
        sample: { split: 4, ground: 2, pub: 1.5, 'live-tv': 0.5 },
      },
    },
    {
      id: '4.3', kind: 'question', template: 'allocate-ledger', chapter: 'IV', title: 'Ten hours a week: at home', stage: true,
      question: 'That leaves [X]h at home. Where do they go?',
      instruction: 'Type hours for each row. They must add up to [X]h.', notes: [],
      previewNote: '[X] is 10 hours minus the split typed on 4.2.',
      next: 'Next', rule: 'Make the At home column add up to [X]h',
      data: {
        store: 'hoursHome', phase: 'inv', rows: HOURS_ROWS, shuffle: true,
        ui: Object.assign({}, LEDGER_UI, { running: 'At home: {placed} of {target} · {left} left' }),
        unit: { pre: '', post: 'h', name: 'hours' },
        vars: { X: { from: '4.2', key: 'split', sample: 4, compute: 'rest-of-10', format: 'dp1' } },
        cashFrom: '4.2',
        status: { none: 'Nothing left to place.' },
        missing: { left: '{x} left to place', over: '{x} too much' },
        step: 0.5, typeStep: 0.1,
        sample: { 'live-tv': 2.5, highlights: 1.5, clips: 1, audio: 0.5, games: 0.5 },
      },
    },
    {
      id: '4.3a', kind: 'followup', template: 'checklist', chapter: 'IV', parent: '4.3', title: 'What they would keep',
      bridge: 'If you had to cut back.',
      question: 'Which would you keep?',
      instruction: 'Pick one or two.', notes: [],
      next: 'Next', rule: 'Pick one or two',
      data: {
        store: 'keep', mode: 'two', min: 1, max: 2, shuffle: true, missing: 'Pick one or two',
        options: HOURS_ROWS.map((r) => ({ id: r.id, label: r.label })),
      },
    },
    {
      id: '4.4', kind: 'question', template: 'track', chapter: 'IV', title: 'Share watched on a phone',
      question: 'How much of the football you watch is on a phone?',
      instruction: 'Tap the line to set your answer.',
      notes: ['Count live games, highlights and clips.'],
      next: 'Next', rule: 'Tap the line',
      data: {
        store: 'phoneShare', numeric: true, min: 0, max: 100, step: 10,
        stops: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => ({ id: String(v), label: v + '%' })),
        readout: '{a}% on a phone · {b}% on a bigger screen',
        ends: ['All on a bigger screen', 'All on a phone'],
      },
    },

    /* ============================== V · Money */
    { id: 'break-V', kind: 'break', template: 'break', chapter: 'V', title: 'Chapter break', next: 'Next', rule: null, data: {} },
    {
      id: '5.1', kind: 'question', template: 'stamp', chapter: 'V', title: 'Changes to ticket prices, 8 cards', stage: true,
      question: 'Would you back each of these changes to ticket prices?',
      instruction: 'Stamp each card. {n} cards.', notes: [],
      next: 'Next', rule: 'Stamp all 8 cards',
      data: {
        store: 'prices', skin: 'tariff', shuffle: true, missing: 'Stamp {n} more', followup: '5.1a',
        vars: { n: { value: 8 } },
        tariffHeader: 'TICKET OFFICE · PRICES FOR NEXT SEASON',
        stamps: [
          { id: 'back', label: 'Back it', impression: 'BACK IT', glyph: 'tick' },
          { id: 'try', label: 'Try it for a season', impression: 'TRY IT', glyph: 'flag' },
          { id: 'no', label: 'No', impression: 'NO', glyph: 'cross' },
        ],
        cards: [
          { id: 'away-cap', label: 'Away tickets capped at £30' },
          { id: 'under-21', label: 'Half price for under-21s' },
          { id: 'dynamic', label: 'Prices that rise for big games', hint: 'And fall for small ones' },
          { id: 'monthly', label: 'Season tickets paid monthly', hint: 'No interest' },
          { id: 'kids-free', label: 'Under-12s free with an adult' },
          { id: 'ballot', label: 'A members-only ballot for big games' },
          { id: 'freeze', label: 'A price freeze for three seasons' },
          { id: 'resale', label: 'Resell your seat at face value', hint: 'Through the club' },
        ],
        sample: { 'away-cap': 'back', 'under-21': 'back', dynamic: 'no', monthly: 'back', 'kids-free': 'try', ballot: 'try', freeze: 'back', resale: 'no' },
      },
    },
    {
      id: '5.1a', kind: 'followup', template: 'stamp', chapter: 'V', parent: '5.1', title: 'Only one change', stage: true,
      bridge: "Clubs can't do everything at once.",
      question: 'If the club could make only one of these changes, which one?',
      instruction: 'Tap one line.', notes: [],
      previewCondition: 'Shows only if two or more cards are stamped Back it or Try it for a season.',
      next: 'Next', rule: 'Tap one line',
      data: {
        store: 'priceOne', mode: 'pick-line', skin: 'tariff', tariffHeader: 'TICKET OFFICE · PRICES FOR NEXT SEASON',
        optionsFrom: { step: '5.1', stamps: ['back', 'try'] },
        phoneTags: { back: 'Back it', try: 'Try it' },
      },
    },
    {
      id: '5.2', kind: 'question', template: 'sentence', chapter: 'V', title: 'Most they would pay for a season ticket',
      question: "I'd pay up to £[    ] for a season ticket, and I'd [renew · think twice · stop] if it went up 10%.", questionIsObject: true,
      instruction: 'Type an amount, then tap one word.',
      notes: ['For a seat like the one you have now, or would want.'],
      next: 'Next', rule: 'An amount and a word, or the line below',
      data: {
        store: 'seasonTicket',
        rows: [{ parts: [
          "I'd pay up to ", { slot: 'number', id: 'gbp', prefix: '£', min: 50, max: 5000, step: 50, decimals: 0, wide: true },
          ' for a season ticket, and I would ',
          { slot: 'chips', id: 'verb', options: [{ id: 'renew', label: 'renew' }, { id: 'think', label: 'think twice' }, { id: 'stop', label: 'stop' }] },
          ' if it went up 10%.',
        ] }],
        optOut: { id: 'never', label: "I wouldn't buy a season ticket at any price" },
        checks: [{ when: { slot: 'gbp', gt: 2000 }, text: 'That’s £[N] for one season. Is that right?' }],
        sample: { gbp: 600, verb: 'think' },
      },
    },
    {
      id: '5.3', kind: 'question', template: 'allocate-list', chapter: 'V', title: "Where a club's money comes from",
      question: 'Out of every £100 your club earns, where do you think it comes from?',
      instruction: 'Type a share for each. They must add up to 100%.',
      notes: ['Your best guess is fine.'],
      next: 'Next', rule: 'The shares must add up to exactly 100%',
      data: {
        store: 'clubMoney', shuffle: true, total: 100, unit: '%', step: 5, footer: '{n}% of 100% placed',
        rows: [
          { id: 'tv', label: 'TV and streaming deals', pinned: true },
          { id: 'tickets', label: 'Tickets and hospitality' },
          { id: 'sponsors', label: 'Sponsors', hint: 'Shirt, stadium, training kit' },
          { id: 'shop', label: 'Shirts and the club shop' },
          { id: 'prize', label: 'Prize money' },
          { id: 'player-sales', label: 'Selling players' },
          { id: 'owner', label: "The owner's own money" },
        ],
      },
    },
    {
      id: '5.4', kind: 'question', template: 'podium', chapter: 'V', title: 'What would make a ticket worth more',
      question: 'What would make a ticket worth paying more for?',
      instruction: 'Pick your top 3, most important first.', notes: [],
      next: 'Next', rule: 'Pick 3',
      data: {
        store: 'worthMore', ui: PODIUM_UI, compact: true, shuffle: true, hints: true,
        options: [
          { id: 'view', label: 'A better view' },
          { id: 'roof', label: 'A roof over my seat' },
          { id: 'legroom', label: 'More legroom' },
          { id: 'food', label: 'Better food and drink' },
          { id: 'cup', label: 'Cup games included' },
          { id: 'away', label: 'First pick of away tickets' },
          { id: 'together', label: 'Seats next to my friends', hint: 'Booked as a group' },
          { id: 'parking', label: 'A parking space' },
          { id: 'tour', label: 'A stadium tour', hint: 'Once a season' },
          { id: 'winning', label: 'A team that wins' },
        ],
        sample: ['winning', 'together', 'view'],
      },
    },

    /* ============================== VI · The game */
    { id: 'break-VI', kind: 'break', template: 'break', chapter: 'VI', title: 'Chapter break', next: 'Next', rule: null, data: {} },
    {
      id: '6.1', kind: 'question', template: 'stamp', chapter: 'VI', title: 'Who decides, 8 cards',
      question: 'Who should make each of these calls in a match?',
      instruction: 'Stamp each card. 8 cards.',
      notes: ['Think of top-flight matches, where the technology is already in place.'],
      next: 'Next', rule: 'Stamp all 8 cards',
      data: {
        store: 'whoDecides', skin: 'ai', shuffle: false, timeline: true, missing: 'Stamp {n} more',
        stamps: [
          { id: 'ref', label: 'The referee alone', impression: 'REFEREE' },
          { id: 'ref-replay', label: 'The referee, with a replay', impression: 'REF + REPLAY' },
          { id: 'tech-ref', label: 'Technology, the referee confirms', impression: 'TECH, REF OK' },
          { id: 'tech', label: 'Technology alone', impression: 'TECHNOLOGY' },
        ],
        cards: [
          { id: 'goal-line', label: 'Did the ball cross the line?' },
          { id: 'offside', label: 'Offside', hint: 'Including tight calls' },
          { id: 'handball', label: 'Handball' },
          { id: 'penalty', label: 'Penalties', hint: 'Fouls in the box' },
          { id: 'red', label: 'Red cards' },
          { id: 'dive', label: 'Diving', hint: 'Booked afterwards' },
          { id: 'time', label: 'Time added on' },
          { id: 'identity', label: 'Which player is booked', hint: 'Mistaken identity' },
        ],
      },
    },
    {
      id: '6.2', kind: 'question', template: 'configure', chapter: 'VI', title: 'Three competitions: how much, how, with whom', stage: true,
      question: 'How do you follow each of these competitions?',
      instruction: 'Answer the three parts for each one.', notes: [],
      next: 'Next', rule: 'Answer all three parts for each (Not for me skips the other two)',
      data: {
        store: 'competitions',
        items: [
          { id: 'league', label: 'The league', hint: 'Every week, August to May' },
          { id: 'cup', label: 'The cup', hint: 'Knockout, one game a round' },
          { id: 'europe', label: 'Europe', hint: 'Midweek, against clubs abroad' },
        ],
        parts: [
          { id: 'belongs', head: 'How much it matters', question: 'How much does it matter to you?', mode: 'one', options: PILES },
          {
            id: 'covers', head: 'How you follow it', question: 'How do you follow it?', mode: 'any', min: 1,
            options: [
              { id: 'ground', label: 'At the ground' },
              { id: 'pub', label: 'In a pub' },
              { id: 'tv', label: 'Live on TV' },
              { id: 'stream', label: 'Streaming' },
              { id: 'radio', label: 'On the radio' },
              { id: 'highlights', label: 'Highlights later' },
            ],
          },
          {
            id: 'who', head: 'Who you watch with', question: 'Who do you mostly watch it with?', mode: 'one',
            options: [
              { id: 'alone', label: 'On my own' },
              { id: 'friends', label: 'Friends' },
              { id: 'family', label: 'Family' },
              { id: 'supporters-club', label: 'A supporters’ club', hint: 'On an organised trip', only: ['cup', 'europe'] },
            ],
          },
        ],
        skipRest: { part: 'belongs', on: 'out' },
        ui: {
          of: '({k} of {n})',
          skipped: 'Skipped: not for me',
          noneLeft: 'Nothing left to pick here, so this part is skipped.',
          missing: { belongs: 'Pick how much it matters', covers: 'Tick at least one', who: 'Pick who you watch with' },
        },
        sample: {
          league: { belongs: 'top', covers: ['ground', 'tv'], who: 'friends' },
          cup: { belongs: 'core', covers: ['tv', 'highlights'], who: 'family' },
          europe: { belongs: 'nice', covers: ['pub'], who: 'friends' },
        },
      },
    },
    {
      id: '6.3', kind: 'question', template: 'rank', chapter: 'VI', title: 'What the game needs most', stage: true,
      question: 'What does football need most over the next ten years?',
      instruction: 'Place all 10. Most important at 1.', notes: [],
      next: 'Next', rule: 'Place all 10',
      data: {
        store: 'needs', shuffle: true, ui: RANK_UI, blocks: GAME_NEEDS,
        sample: ['prices', 'fan-say', 'finances', 'grassroots', 'abuse', 'home-towns', 'womens', 'referees', 'free-tv', 'welfare'],
      },
    },
    {
      id: '6.4', kind: 'question', template: 'stamp', chapter: 'VI', title: 'How the game is doing on each',
      question: 'How is football doing on each of these today?',
      instruction: 'Stamp each card. 10 cards.', notes: [],
      next: 'Next', rule: 'Stamp all 10 cards',
      data: {
        store: 'doing', skin: 'readiness', shuffle: true, seed: 6400, missing: 'Stamp {n} more',
        stamps: [
          { id: 'good', label: 'Doing well', impression: 'DOING WELL', glyph: 'tick' },
          { id: 'getting-there', label: 'Getting there', impression: 'GETTING THERE', glyph: 'half' },
          { id: 'way-off', label: 'A long way off', impression: 'A LONG WAY OFF', glyph: 'cross' },
        ],
        cards: GAME_NEEDS,
      },
    },
    {
      id: '6.5', kind: 'question', template: 'sentence', chapter: 'VI', title: 'The ideal league',
      question: 'The ideal top league has [  ] teams and a winter break of [  ] weeks.', questionIsObject: true,
      instruction: 'Type two numbers.', notes: [],
      next: 'Next', rule: 'Type two numbers',
      data: {
        store: 'idealLeague',
        rows: [{ parts: [
          'The ideal top league has ', { slot: 'number', id: 'teams', min: 10, max: 30, step: 2, decimals: 0 },
          ' teams and a winter break of ', { slot: 'number', id: 'weeks', min: 0, max: 8, step: 1, decimals: 0 }, ' weeks.',
        ] }],
        checks: [{ when: { slot: 'teams', gt: 24 }, text: 'That’s [N] teams, which means a long season. Is that right?' }],
        sample: { teams: 20, weeks: 2 },
      },
    },

    /* ============================== VII · Your view */
    { id: 'break-VII', kind: 'break', template: 'break', chapter: 'VII', title: 'Chapter break', next: 'Next', rule: null, data: {} },
    {
      id: '7.1', kind: 'question', template: 'text', chapter: 'VII', title: 'Love and change',
      question: 'What do you love most about football right now, and what would you change?',
      instruction: 'Write a sentence or two in each.', notes: [],
      next: 'Next', rule: 'Write at least 3 characters in each note',
      data: {
        store: 'loveChange', counterFrom: 0.8, phoneNext: 'Next note',
        fields: [
          { id: 'love', stem: 'What I love most is…', limit: 280, required: true, min: 3 },
          { id: 'change', stem: "What I'd change is…", limit: 280, required: true, min: 3 },
        ],
      },
    },
    {
      id: '7.2', kind: 'question', template: 'text', chapter: 'VII', title: 'The best-run club',
      question: 'The best-run club I know of is ________.', questionIsObject: true,
      instruction: 'Type a club, and say why if you like.', notes: [],
      next: 'Next', rule: 'Type a club (the why is optional)',
      data: {
        store: 'bestRun', counterFrom: 0.8,
        sentence: { pre: 'The best-run club I know of is', post: '.', field: 'name' },
        fields: [
          { id: 'name', kind: 'line', inSentence: true, limit: 60, required: true, min: 1 },
          { id: 'why', stem: 'What they do well is…', limit: 200, required: false },
        ],
        chip: { label: "I can't think of one", fills: 'name', value: 'hard to say' },
        typeaheadAfter: 2,
        typeahead: {
          clubs: ['Ajax', 'Athletic Club', 'Bayern Munich', 'Benfica', 'Borussia Dortmund', 'Boca Juniors', 'Brentford', 'Brighton', 'Celtic', 'Flamengo', 'Freiburg', 'Real Sociedad', 'Porto', 'Union Berlin'],
        },
      },
    },
    {
      id: '7.3', kind: 'question', template: 'text', chapter: 'VII', title: "Anything we didn't ask (optional)",
      question: "Is there anything we didn't ask that we should have?",
      instruction: 'Optional. A line or two.', notes: [],
      next: 'Next', rule: 'Optional (Next reads Skip while empty)',
      data: {
        store: 'anythingElse', counterFrom: 0.8, optional: true, emptyLabel: 'Skip',
        fields: [{ id: 'last', limit: 400, required: false }],
      },
    },
    {
      id: 'pause', kind: 'pause', template: 'flow', chapter: 'VII', title: 'Pause card',
      next: 'Next', rule: null,
      data: { variant: 'pause', line: "All that's left is a back page.", later: 'Continue later', toast: 'Saved. Open the same link to carry on.' },
    },
    {
      id: '7.4', kind: 'question', template: 'newspaper', chapter: 'VII', title: 'The back page: headline and quote', stage: true,
      question: 'Your club wins the league. What headline would you want on the back page?',
      instruction: 'Type your headline. It appears on the page.', notes: [],
      next: 'Send', rule: 'A headline and a quote, 10 characters or more each',
      data: {
        store: 'backPage',
        steps: [
          { bridge: '', question: 'Your club wins the league. What headline would you want on the back page?', instruction: 'Type your headline. It appears on the page.', notes: [] },
          { bridge: 'Then a quote from you.', question: 'A reporter asks how it feels. What do you say?', instruction: 'Type your quote. It appears on the page.', notes: [] },
        ],
        labels: { headline: 'Headline', quote: 'Quote' },
        marks: ['“', '”'],
        page: {
          masthead: 'The Final Whistle',
          ears: ['TITLE EDITION', 'SPORT'],
          folio: 'Vol. I · No. 1 · The last day of the season',
          kicker: 'FOOTBALL',
          headlinePlaceholder: 'Your headline',
          quotePlaceholder: 'Your quote',
          byline: '— A fan, in the stands',
          footer: 'Matchday · sample survey · not a real newspaper',
        },
        limits: { headline: { soft: 90, hard: 110, counterFrom: 80, min: 10 }, quote: { soft: 180, hard: 220, min: 10 } },
        counter: '{n} / {soft}', counterLong: '{n} / {soft} · long',
        missing: { headline: 'Write your headline', headlineShort: 'Headline: {n} more characters', quote: 'Write your quote', quoteShort: 'Quote: {n} more characters' },
      },
    },
    {
      id: 'end', kind: 'ending', template: 'flow', chapter: null, title: 'Ending',
      next: null, rule: null,
      data: {
        variant: 'ending',
        wreathLabel: 'WHAT YOU SAID THE GAME NEEDS',
        thanks: "Thank you. That's the final whistle.",
        sent: 'Your answers have been sent.',
        sending: 'Sending your answers…',
        notSent: 'Opened from a folder, so nothing was sent. Run the kit on a server to collect answers.',
        contact: 'You can close this page.',
        sendFailure: "Couldn't send. Tap to try again.",
        top3From: '6.3',
        sampleTop3: ['prices', 'fan-say', 'finances'],
      },
    },
  ]

  /* ------------------------------------------------------------------ templates */

  // Template name -> its page and what it draws. One page per template: t-<template>.html.
  const templates = {
    flow: { page: 't-flow.html', what: 'Welcome, the opening statement with its scale, the pause card, the ending' },
    break: { page: 't-break.html', what: 'Chapter card with the chapter map' },
    checklist: { page: 't-checklist.html', what: 'Tap one, pick one or two, pictures, region then country, a choice of two' },
    sentence: { page: 't-sentence.html', what: 'A sentence with typed numbers and word chips' },
    track: { page: 't-track.html', what: 'Stops on a line, words or numbers, labels at the ends or under the stops' },
    text: { page: 't-text.html', what: 'Three quotes, ruled notes, a sentence to finish, an optional note' },
    piles: { page: 't-piles.html', what: 'Sort a deck of cards into four piles' },
    podium: { page: 't-podium.html', what: 'Pick a top 3 onto a podium' },
    trays: { page: 't-trays.html', what: 'Put tiles into labelled trays' },
    bottle: { page: 't-bottle.html', what: 'Pour a fixed number of units into four jugs' },
    ladder: { page: 't-ladder.html', what: 'A glass column for a share, then what-ifs that raise it' },
    'allocate-ledger': { page: 't-allocate-ledger.html', what: 'Split a total of 10 across two columns and the rows of a ledger' },
    'allocate-list': { page: 't-allocate-list.html', what: 'Typed shares that add up to 100%' },
    stamp: { page: 't-stamp.html', what: 'Stamp each card from a deck: plain, a timeline, a price list, a grade, or pick one line' },
    configure: { page: 't-configure.html', what: 'The same three questions for each of a few items' },
    rank: { page: 't-rank.html', what: 'Put ten things in order, 1 to 10' },
    newspaper: { page: 't-newspaper.html', what: 'A live front page: a headline, then a quote' },
  }

  const ui = {
    back: '‹ Back',
    next: 'Next',
    ruleLead: 'To finish: ',
    breakMinutes: 'About {n} minutes',
    breakMinute: 'About {n} minute',
    mapStates: { done: '✓ done', now: 'now', later: 'about {n} min' },
    later: 'Continue later',
    laterToast: 'Saved. Open the same link to carry on.',
  }

  window.SURVEY = {
    title: 'Survey Kit',
    wordmark: 'MATCHDAY',
    // the quiz-style card's description on the contents page
    intro: 'One question per page, on a plain paper page. People tap, sort cards into piles, stamp, rank or type a number. Also opens straight from a folder.',
    banner: 'Survey Kit · Quiz-style · Next always works',
    storageKey: 'matchday-v1',
    noBreak: ['Makes the day', 'Not for me', 'Nice to have'],
    // the contents page's Game-style tab: the screens of the React half of the kit (src/kit/game), which needs
    // the hosted site; from a folder the tab says so
    // where the quiz-style ending sends the answers (src/app/api/responses/route.ts); remove it to send nothing
    send: { url: '/api/responses' },
    // the contents page: its heading, and the line over the list of the chosen experience's screens
    kit: {
      title: 'Survey Kit',
      intro: 'Two ways to run a survey people actually finish, for course projects, club feedback or campus polls. The sample asks football fans about their club. Try both, then swap in your own questions.',
      lists: { quiz: 'Quiz-style: every screen', game: 'Game-style: every screen', hint: 'Start takes the survey and saves your answers. Tap a row to look at one screen.', showing: 'Its screens are below', see: 'See its screens' },
    },
    game: {
      href: '/kit/game',
      // Start takes the survey for real (answers are saved); the rows open single screens in preview
      start: '/kit/game?live=1',
      screens: '/kit/game/screens',
      storageKeys: ['kit-game-v1'],
      intro: 'Set in a misty landscape, with a climber that shows how far along you are. People pour hours from jugs, swipe cards and fill a podium.',
      offline: 'The game-style screens run on the hosted site. Open /kit there to see them.',
      offlineShort: 'Runs on the hosted site',
    },
    context: '',
    sampleNote: SAMPLE_NOTE,
    ui,
    chapters,
    steps,
    templates,
  }
})()
