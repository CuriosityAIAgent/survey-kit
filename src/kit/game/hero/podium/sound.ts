import { soundOn } from '../soundPref'

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!C) return null
      ctx = new C()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, dur: number, gain: number, type: OscillatorType = 'sine', drop = 0.5) {
  if (!soundOn()) return
  const a = ac()
  if (!a) return
  const t = a.currentTime
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * drop), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(dur: number, gain: number, cutoff: number) {
  if (!soundOn()) return
  const a = ac()
  if (!a) return
  const t = a.currentTime
  const n = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, n, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = cutoff
  const g = a.createGain()
  g.gain.value = gain
  src.connect(f).connect(g).connect(a.destination)
  src.start(t)
}

export function thunk() {
  tone(120, 0.16, 0.22, 'sine', 0.45)
  noise(0.06, 0.12, 900)
}

export function stampKnock() {
  tone(90, 0.12, 0.28, 'triangle', 0.5)
  noise(0.09, 0.2, 1400)
}

export function click() {
  tone(1800, 0.03, 0.05, 'triangle', 0.7)
}

export function unlockAudio() {
  ac()
}
