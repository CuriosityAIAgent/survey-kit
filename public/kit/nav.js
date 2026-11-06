/* Steps, order and answers. Needs script.js first.

   SurveyNav.steps, .chapters          every step in play order; the chapters
   SurveyNav.step(id), .current()      a step; the one named by ?id= (the first step if missing)
   SurveyNav.next(id), .prev(id)       the id after or before, or null at the ends
   SurveyNav.href(id), .go(id)         't-<template>.html?id=<id>'; navigate there
   SurveyNav.number(step)              question number (a follow-up shares its parent's); null for other steps
   SurveyNav.answers.get/set/clear/clearAll/all
                                       answers in localStorage under '<storageKey>:<id>'
   SurveyNav.value(id)                 { value, sample }: the answer, else the step's data.sample
   SurveyNav.resolveVars(step), .fill(text, vars)
                                       [X] and {n} placeholders from data.vars
   SurveyNav.selfCheck()               console warnings for slips in script.js (runs on load) */

(function () {
  'use strict'
  const S = window.SURVEY
  if (!S) { console.error('SurveyNav: load script.js before nav.js'); return }
  const steps = S.steps
  const byId = Object.create(null)
  steps.forEach((s, i) => { s.index = i; byId[s.id] = s })
  const chapters = S.chapters.map((c, i) => Object.assign({ index: i }, c))
  const chapterBy = Object.create(null)
  chapters.forEach((c) => { chapterBy[c.numeral] = c })

  const as = (x) => (typeof x === 'string' ? byId[x] || null : x || null)

  const qNum = Object.create(null)
  let n = 0
  steps.forEach((s) => { if (s.kind === 'question') qNum[s.id] = ++n })

  function step(id) { return byId[id] || null }
  function next(id) { const s = as(id); return s && s.index < steps.length - 1 ? steps[s.index + 1].id : null }
  function prev(id) { const s = as(id); return s && s.index > 0 ? steps[s.index - 1].id : null }
  function href(x) { const s = as(x); return s ? 't-' + s.template + '.html?id=' + encodeURIComponent(s.id) : 'index.html' }
  function go(id) { if (id == null) return; const s = as(id); if (s) window.location.href = href(s) }
  function currentId() {
    let id = null
    try { id = new URLSearchParams(window.location.search).get('id') } catch (e) { id = null }
    return id && byId[id] ? id : steps[0].id
  }
  function current() { return byId[currentId()] }
  function number(x) {
    const s = as(x); if (!s) return null
    if (s.kind === 'question') return qNum[s.id]
    if (s.kind === 'followup' && s.parent) return qNum[s.parent] || null
    return null
  }
  function chapter(x) { const s = as(x); return s && s.chapter ? chapterBy[s.chapter] || null : null }
  function dots(x) {
    const s = as(x); const c = chapter(s)
    if (!c) return { total: 0, on: -1, sub: false }
    const qs = steps.filter((t) => t.kind === 'question' && t.chapter === c.numeral)
    let on = -1
    if (s.kind === 'question') on = qs.indexOf(s)
    else if (s.kind === 'followup') on = qs.indexOf(byId[s.parent])
    else if (s.kind === 'break') on = -1
    else {
      on = qs.filter((q) => q.index < s.index).length - 1
    }
    return { total: qs.length, on, sub: s.kind === 'followup' }
  }
  function done(x) {
    const s = as(x); if (!s) return 0
    if (s.kind === 'ending') return chapters.length
    const c = chapter(s)
    return c ? c.index : 0
  }

  const PREFIX = (S.storageKey || 'survey-kit') + ':'
  const mem = Object.create(null)
  let store = null
  try { store = window.localStorage; const k = PREFIX + '__t'; store.setItem(k, '1'); store.removeItem(k) } catch (e) { store = null }
  const answers = {
    get(id) {
      if (store) { try { const v = store.getItem(PREFIX + id); return v == null ? undefined : JSON.parse(v) } catch (e) { return undefined } }
      return mem[id]
    },
    set(id, value) {
      if (value === undefined) return answers.clear(id)
      if (store) { try { store.setItem(PREFIX + id, JSON.stringify(value)); return } catch (e) {} }
      mem[id] = value
    },
    clear(id) { if (store) { try { store.removeItem(PREFIX + id) } catch (e) {} } delete mem[id] },
    clearAll() {
      steps.forEach((s) => answers.clear(s.id))
      answers.clear('__sent')
      try { if (window.sessionStorage) window.sessionStorage.removeItem(PREFIX + 'respondent') } catch (e) {}
    },
    all() { const o = {}; steps.forEach((s) => { const v = answers.get(s.id); if (v !== undefined) o[s.id] = v }); return o },
  }
  // a personal link (?r=CODE) tags this person's answers. It is kept for this browser session only, so the next
  // person on a shared computer isn't tagged with it
  const session = (() => { try { const s = window.sessionStorage; s.setItem('__t', '1'); s.removeItem('__t'); return s } catch (e) { return null } })()
  try {
    const r = new URLSearchParams(window.location.search).get('r')
    if (r && /^[A-Za-z0-9_-]{1,40}$/.test(r) && session) session.setItem(PREFIX + 'respondent', r)
  } catch (e) {}
  function respondent() { const r = session && session.getItem(PREFIX + 'respondent'); return r || null }

  function value(id) {
    const v = answers.get(id)
    if (v !== undefined && v !== null && v !== '') return { value: v, sample: false }
    const s = byId[id]
    return { value: s && s.data ? s.data.sample : undefined, sample: true }
  }

  const trim0 = (x) => { const v = Math.round(x * 10) / 10; return Math.abs(v) >= 1000 && v === Math.round(v) ? v.toLocaleString('en-GB') : String(v) }
  function resolveVars(x) {
    const s = as(x); const out = {}; let usedSample = false
    const vars = (s && s.data && s.data.vars) || {}
    Object.keys(vars).forEach((k) => {
      const d = vars[k]
      if (d.value != null) { out[k] = String(d.value); return }
      const got = answers.get(d.from)
      let raw = got && typeof got === 'object' ? got[d.key] : got
      if (raw === undefined || raw === null || raw === '' || isNaN(+raw)) { raw = d.sample; usedSample = true }
      let v = +raw
      if (d.compute === 'rest-of-10') v = Math.max(0, 10 - v)
      out[k] = d.format === 'dp1' ? v.toFixed(1) : trim0(v)
    })
    Object.defineProperty(out, '_sample', { value: usedSample, enumerable: false })
    return out
  }
  function fill(text, vars) {
    if (text == null) return text
    return String(text).replace(/\[([A-Z])\]|\{([a-zA-Z]+)\}/g, (m, a, b) => {
      const k = a || b
      return vars && vars[k] != null ? String(vars[k]) : m
    })
  }

  // Catches the usual slips in script.js early: a repeated id, an unknown template, a follow-up or a
  // borrowed list that points at a step that isn't there. Each one is a console warning.
  function selfCheck() {
    const warn = (...m) => console.warn('SurveyNav:', ...m)
    const ids = new Set()
    let ok = true
    steps.forEach((s) => {
      if (ids.has(s.id)) { warn('duplicate id', s.id); ok = false }
      ids.add(s.id)
      if (S.templates && !S.templates[s.template]) { warn(s.id, 'uses an unknown template', s.template); ok = false }
      if (s.kind === 'followup' && !byId[s.parent]) { warn(s.id, 'is a follow-up of a missing step', s.parent); ok = false }
      if (s.chapter && !chapterBy[s.chapter]) { warn(s.id, 'is in a missing chapter', s.chapter); ok = false }
      const d = s.data || {}
      const refs = [d.optionsFrom, d.tilesFrom, d.rowsFrom, d.cashFrom && { step: d.cashFrom }, d.top3From && { step: d.top3From }]
        .concat((d.parts || []).map((p) => p.optionsFrom))
      refs.forEach((r) => { if (r && r.step && !byId[r.step]) { warn(s.id, 'reads a missing step', r.step); ok = false } })
      Object.values(d.vars || {}).forEach((v) => { if (v.from && !byId[v.from]) { warn(s.id, 'fills a placeholder from a missing step', v.from); ok = false } })
    })
    return { steps: steps.length, questions: n, ok }
  }

  window.SurveyNav = {
    steps, chapters, step, next, prev, href, go, currentId, current, number, chapter, dots, done,
    answers, value, resolveVars, fill, selfCheck, respondent,
    total: n,
  }
  selfCheck()
})()
