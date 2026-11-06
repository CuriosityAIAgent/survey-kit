let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
  const C = W.AudioContext ?? W.webkitAudioContext
  if (!C) return null
  ctx ??= new C()
  if (ctx.state === 'suspended') void ctx.resume()
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return ctx
}

export function playPour(level: number, delay = 0.55) {
  const c = ac()
  if (!c || !noise) return
  const t = c.currentTime + delay, dur = 0.42
  const src = c.createBufferSource(); src.buffer = noise
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.2
  bp.frequency.setValueAtTime(420 + level * 110, t)
  bp.frequency.linearRampToValueAtTime(620 + level * 150, t + dur)
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200
  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.10, t + 0.05)
  g.gain.linearRampToValueAtTime(0.07, t + dur - 0.1)
  g.gain.linearRampToValueAtTime(0, t + dur)
  src.connect(bp).connect(lp).connect(g).connect(c.destination)
  src.start(t, Math.random() * 0.4); src.stop(t + dur + 0.05)

  const o = c.createOscillator(); o.type = 'sine'
  o.frequency.setValueAtTime(190 + level * 28, t + 0.12)
  o.frequency.exponentialRampToValueAtTime(260 + level * 34, t + 0.22)
  const og = c.createGain()
  og.gain.setValueAtTime(0, t + 0.12)
  og.gain.linearRampToValueAtTime(0.05, t + 0.14)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
  o.connect(og).connect(c.destination)
  o.start(t + 0.12); o.stop(t + 0.3)
}

export function playCap(delay = 1.1) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + delay
  const o = c.createOscillator(); o.type = 'triangle'
  o.frequency.setValueAtTime(420, t)
  o.frequency.exponentialRampToValueAtTime(160, t + 0.08)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.14, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
  o.connect(g).connect(c.destination)
  o.start(t); o.stop(t + 0.16)
}
