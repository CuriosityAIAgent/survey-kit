import { useSyncExternalStore } from 'react'

const KEY = 'kit-game-sound'
const listeners = new Set<() => void>()
let memory: boolean | null = null

export function soundOn(): boolean {
  if (typeof window === 'undefined') return false
  if (memory !== null) return memory
  try { return window.localStorage.getItem(KEY) === 'on' } catch { return false }
}

export function setSoundOn(on: boolean) {
  memory = on
  try { window.localStorage.setItem(KEY, on ? 'on' : 'off') } catch {  }
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function useSound(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, soundOn, () => false)
  return [on, setSoundOn]
}
