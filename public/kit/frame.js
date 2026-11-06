/* The frame around every screen. Load order on every page: preview.css, script.js, nav.js, frame.js, then the page.

   const step = SurveyNav.current()
   const ui = SurveyFrame.mount(step, { stage: true })   // the rail, the question band, ui.obj for the object, Next
   ui.obj.innerHTML = '...'                               // draw the screen from step.data
   ui.status(false, 'Sort 7 more')                        // not done yet: "To finish: Sort 7 more" beside Next
   ui.status(true)                                        // done
   ui.save(answer) / ui.load()                            // this step's answer, in localStorage
   Next and Back go to the next and previous step in script.js; ui.onNext(fn) can take a click first (return true). */
(function () {
  const NS = 'http://www.w3.org/2000/svg'

  /** The progress mark in the rail: one football per chapter. Played chapters are filled, the current one is an outline. */
  function progress(done, current, opts) {
    const o = Object.assign({ w: 120, h: 30, total: 7 }, opts || {})
    const svg = document.createElementNS(NS, 'svg')
    const n = o.total, gap = 3, r = 5
    const W = n * (2 * r) + (n - 1) * gap
    svg.setAttribute('viewBox', `-1 -1 ${W + 2} ${2 * r + 2}`)
    svg.setAttribute('width', o.w)
    svg.setAttribute('height', o.h)
    svg.setAttribute('class', 'c-progress')
    svg.setAttribute('aria-hidden', 'true')
    for (let i = 0; i < n; i++) {
      const cx = r + i * (2 * r + gap)
      const state = i < done ? 'done' : i === done && current ? 'now' : 'later'
      const g = document.createElementNS(NS, 'g')
      g.setAttribute('transform', `translate(${cx} ${r})`)
      g.innerHTML = ballG(r, state)
      svg.appendChild(g)
    }
    return svg
  }

  /** A football of radius r at 0,0: a centre patch and five spokes. state 'done' | 'now' | 'later'. */
  function ballG(r, state) {
    const ink = '#1F6B3A'
    const fill = state === 'done' ? '#FFFFFF' : 'none'
    const stroke = state === 'later' ? '#C9CFC6' : ink
    const k = r / 5
    const pent = (rad) => [0, 1, 2, 3, 4].map((i) => {
      const a = (-90 + i * 72) * Math.PI / 180
      return `${(Math.cos(a) * rad).toFixed(2)},${(Math.sin(a) * rad).toFixed(2)}`
    }).join(' ')
    let s = `<circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${0.9 * k}"/>`
    if (state === 'later') return s
    s += `<polygon points="${pent(1.9 * k)}" fill="${ink}"/>`
    for (let i = 0; i < 5; i++) {
      const a = (-90 + i * 72) * Math.PI / 180
      s += `<line x1="${(Math.cos(a) * 1.9 * k).toFixed(2)}" y1="${(Math.sin(a) * 1.9 * k).toFixed(2)}" x2="${(Math.cos(a) * r).toFixed(2)}" y2="${(Math.sin(a) * r).toFixed(2)}" stroke="${ink}" stroke-width="${0.7 * k}"/>`
    }
    return s
  }

  const Nav = window.SurveyNav
  const Script = window.SURVEY
  if (!Nav || !Script) { console.error('frame.js: load script.js and nav.js first'); return }

  const BANNER = (Script.banner) || 'Demo · Next always works · nothing is sent'
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

  // phrases that must not break across lines (SURVEY.noBreak), e.g. a club or product name
  // one pass over the plain text, so a phrase never matches inside markup an earlier phrase added
  const NOBREAK = (Script.noBreak || []).filter(Boolean)
  const NB_RE = NOBREAK.length ? new RegExp(NOBREAK.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null
  const glue = (s) => {
    const t = String(s == null ? '' : s)
    if (!NB_RE) return esc(t)
    let out = '', at = 0
    t.replace(NB_RE, (m, i) => { out += esc(t.slice(at, i)) + `<span class="nw">${esc(m)}</span>`; at = i + m.length; return m })
    return out + esc(t.slice(at))
  }
  const narrow = () => window.matchMedia('(max-width: 700px)').matches
  const $ = (s, r) => (r || document).querySelector(s)

  /** The brand mark: a football, w x h px (drawn square, centred). */
  function markSVG(w, h) {
    const d = Math.min(w, h)
    return `<svg viewBox="-6 -6 12 12" width="${d}" height="${d}" aria-hidden="true" class="c-mark">${ballG(5.4, 'done')}</svg>`
  }

  function bannerHTML(step) {
    const idTxt = step.kind === 'break' ? 'Break ' + step.chapter : step.id
    return `<div class="pv-banner" role="note" aria-label="${esc(BANNER)}">
      <span class="pv-b-t">${esc(BANNER)}</span>
      <span class="pv-b-r"><span class="pv-id">${esc(idTxt)}</span></span>
    </div>`
  }

  function railFor(el, step, o) {
    const c = Nav.chapter(step)
    const d = Nav.dots(step)
    const num = Nav.number(step)
    const prevId = Nav.prev(step.id)
    el.innerHTML = ''
    const back = document.createElement('button')
    back.className = 'back'; back.type = 'button'; back.textContent = '‹ Back'
    back.setAttribute('aria-label', 'Back to the previous step')
    if (!prevId || o.noBack) { back.hidden = true; back.disabled = true }
    el.appendChild(back)

    const mid = document.createElement('div'); mid.className = 'mid'
    if (c && !o.noChapter) {
      mid.innerHTML = `<span class="numeral">${esc(c.numeral)}</span><span class="chap">${esc(c.name)}</span>`
      if (d.total) {
        const dots = document.createElement('span'); dots.className = 'dots'; dots.setAttribute('aria-hidden', 'true')
        for (let i = 0; i < d.total; i++) {
          const x = document.createElement('i'); if (i <= d.on) x.className = 'on'; dots.appendChild(x)
          if (d.sub && i === d.on) { const s = document.createElement('i'); s.className = 'on sub'; dots.appendChild(s) }
        }
        mid.appendChild(dots)
      }
    }
    el.appendChild(mid)

    const right = document.createElement('div'); right.className = 'right'
    if (num) {
      const q = document.createElement('span'); q.className = 'pv-qn'
      q.innerHTML = `<span class="pv-qw">Question </span>${num} of ${Nav.total}`
      right.appendChild(q)
    }
    const sh = progress(Nav.done(step), c ? 1 : 0, narrow() ? { total: Script.chapters.length, w: 64, h: 12 } : { total: Script.chapters.length, w: 96, h: 16 })
    if (o.hideProgress) sh.style.visibility = 'hidden'
    right.appendChild(sh)
    const a = document.createElement('a'); a.className = 'pv-contents'; a.href = 'index.html'; a.textContent = 'Contents'
    right.appendChild(a)
    el.appendChild(right)
    return back
  }

  function bandInner(step, b, vars, extraNote) {
    const f = (t) => Nav.fill(t, vars)
    const isQ = step.kind === 'question' || step.kind === 'followup'
    const ctx = isQ && !step.noContext && !!Script.context
    let h = ''

    if (b.bridge) h += `<p class="c-bridge"><span>${glue(f(b.bridge))}</span></p>`
    if (b.question) h += `<h1 class="c-q${b.questionIsObject ? ' sr' : ''}">${glue(f(b.question))}</h1>`
    if (b.instruction) h += `<p class="c-i">${glue(f(b.instruction))}</p>`
    if (ctx) h += `<p class="c-note ctx">${glue(Script.context)}</p>`
    ;(b.notes || []).forEach((n) => { if (n) h += `<p class="c-note">${glue(f(n))}</p>` })
    const pv = [b.previewCondition, b.previewNote, extraNote].filter(Boolean).map((t) => esc(t)).join(' ')
    if (pv) h += `<p class="pv-note">${pv}</p>`
    return h
  }

  function mount(step, opts) {
    const o = Object.assign({}, opts || {})
    if (!step) { document.body.innerHTML = '<p style="padding:40px;font-family:Georgia">Unknown step. <a href="index.html">Contents</a></p>'; return null }
    const stage = o.stage != null ? !!o.stage : !!step.stage
    const bandOn = o.band != null ? !!o.band : (step.kind === 'question' || step.kind === 'followup' || step.kind === 'statement')
    const vars = Object.assign({}, Nav.resolveVars(step), o.vars || {})
    const sampleNote = Nav.resolveVars(step)._sample ? Script.sampleNote : ''
    document.title = `${Script.title || 'Survey'} · ${step.id === 'W' ? 'Welcome' : step.kind === 'break' ? 'Chapter ' + step.chapter : step.id}`
    document.body.classList.add('pv', 'pv-' + step.kind, 'pv-t-' + step.template)

    const wrap = document.createElement('div')
    wrap.innerHTML = bannerHTML(step) +
      `<div class="c-page"><div class="c-frame${stage ? ' stage' : ''}" id="frame"><div class="c-rail" id="rail"></div></div></div>`
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild)
    const frame = $('#frame')
    const railEl = $('#rail')
    const backBtn = railFor(railEl, step, o)

    let band = null, side = null, obj
    if (stage) {
      const body = document.createElement('div'); body.className = 'c-body'
      side = document.createElement('div'); side.className = 'c-side'
      const st = document.createElement('div'); st.className = 'c-stage' + (o.objClass ? ' ' + o.objClass : '')
      body.append(side, st)
      frame.appendChild(body)
      if (bandOn) { band = document.createElement('div'); band.className = 'band pv-band'; side.appendChild(band) }
      obj = st
    } else {
      if (bandOn) { band = document.createElement('div'); band.className = 'c-head pv-band'; frame.appendChild(band) }
      obj = document.createElement('div'); obj.className = 'c-obj' + (o.objClass ? ' ' + o.objClass : '')
      frame.appendChild(obj)
    }

    const bandState = {
      bridge: step.bridge, question: step.question, instruction: step.instruction, notes: step.notes || [],
      questionIsObject: !!step.questionIsObject, previewCondition: step.previewCondition, previewNote: step.previewNote,
    }
    let extraNote = sampleNote
    const drawBand = () => { if (band) band.innerHTML = bandInner(step, bandState, ui.vars, extraNote) }

    const bar = document.createElement('div'); bar.className = 'c-next-bar pv-bar'
    const left = document.createElement('div'); left.className = 'pv-left'
    const ruleEl = document.createElement('span'); ruleEl.className = 'pv-rule'; ruleEl.setAttribute('aria-live', 'polite')
    bar.append(left, ruleEl)
    let nextBtn = null
    const label = o.next != null ? o.next : step.next
    if (label !== false && label != null) {
      nextBtn = document.createElement('button'); nextBtn.type = 'button'; nextBtn.className = 'c-next'; nextBtn.id = 'next'
      nextBtn.innerHTML = '<span class="pv-lbl"></span><span class="pv-sub"></span>'
      bar.appendChild(nextBtn)
    }
    frame.appendChild(bar)
    const toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite')
    frame.appendChild(toastEl)

    let onNext = null, onBack = null
    const ui = {
      step, frame, rail: railEl, band, side, obj, bar, left, next: nextBtn, back: backBtn, vars,
      esc, glue, markSVG,

      setBand(b) { Object.assign(bandState, b || {}); drawBand() },

      status(complete, missing) {
        const text = complete ? '' : (missing || Nav.fill(step.rule, ui.vars) || '')
        const line = text ? (Script.ui.ruleLead || 'To finish: ') + text : ''
        ruleEl.textContent = line
        if (nextBtn) $('.pv-sub', nextBtn).textContent = line
        bar.classList.toggle('pv-incomplete', !!line)
        ui.complete = !!complete
      },

      label(text) { if (nextBtn) $('.pv-lbl', nextBtn).textContent = text || label },
      onNext(fn) { onNext = fn },
      onBack(fn) { onBack = fn },
      goNext() { if (onNext && onNext() === true) return; const n = Nav.next(step.id); if (n) Nav.go(n) },
      goBack() { if (onBack && onBack() === true) return; const p = Nav.prev(step.id); if (p) Nav.go(p) },

      previewNote(text) { extraNote = [sampleNote, text].filter(Boolean).join(' '); drawBand() },
      toast(text, ms) {
        toastEl.textContent = text; toastEl.classList.add('on')
        clearTimeout(toastEl._h); toastEl._h = setTimeout(() => toastEl.classList.remove('on'), ms || 3200)
      },
      save(value) { Nav.answers.set(step.id, value) },
      load() { return Nav.answers.get(step.id) },

      addLater(text, toast) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'c-link'; b.textContent = text || Script.ui.later
        b.onclick = () => ui.toast('✓  ' + (toast || Script.ui.laterToast))
        left.appendChild(b); bar.classList.add('link'); return b
      },
      complete: false,
    }
    drawBand()
    ui.label()
    if (step.rule) ui.status(false); else ui.status(true)
    if (o.later) ui.addLater(step.data && step.data.later, step.data && step.data.toast)

    if (nextBtn) nextBtn.addEventListener('click', () => ui.goNext())
    backBtn.addEventListener('click', () => ui.goBack())

    document.addEventListener('keydown', (e) => {
      const t = e.target
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      if (e.altKey && !e.ctrlKey && !e.metaKey && !typing) {
        if (e.key === 'ArrowRight') { e.preventDefault(); ui.goNext() }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); ui.goBack() }
        return
      }
      if (e.key === 'Enter' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.isComposing && nextBtn) {
        const onPage = !t || t === document.body || t === document.documentElement
        if (onPage) { e.preventDefault(); ui.goNext() }
      }
    })
    return ui
  }

  window.SurveyFrame = { mount, esc, glue, markSVG, ballG, progress, BANNER }
})()
