/* Sign-in for the survey owner: one password (SURVEY_ADMIN_PASSWORD) unlocks /results and the CSV downloads.
   A right password sets an httpOnly cookie holding the time it was issued and an HMAC of that time and the
   password, signed with SURVEY_SECRET. It expires after 8 hours, and stops working at once if the password or
   the secret changes (that is how to sign everyone out).

   Respondents don't sign in: they answer anonymously, or through a personal link (?r=CODE) that tags their answers.
   For accounts (a university login, Google, email links), swap this file for Auth.js, Clerk or Supabase Auth and
   keep isSignedIn() as the one check the results routes call. */
import { cookies } from 'next/headers'

export const COOKIE = 'survey_owner'
export const MAX_AGE_S = 60 * 60 * 8

const enc = new TextEncoder()
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('')
// the sample values in .env.example are public, so they never count as set up
const SAMPLE = new Set(['change-me', 'replace-with-a-long-random-string'])

export function configured(): boolean {
  const pw = process.env.SURVEY_ADMIN_PASSWORD ?? '', secret = process.env.SURVEY_SECRET ?? ''
  return pw.length >= 8 && !SAMPLE.has(pw) && secret.length >= 32 && !SAMPLE.has(secret)
}

async function sign(issued: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(process.env.SURVEY_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(`owner:${issued}:${process.env.SURVEY_ADMIN_PASSWORD!}`)))
}

/** A new cookie value: the issue time (seconds) and its signature. */
export async function token(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return `${now}.${await sign(now)}`
}

/** Compare without leaking where two strings differ. */
export function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

export async function isSignedIn(): Promise<boolean> {
  if (!configured()) return false
  const got = (await cookies()).get(COOKIE)?.value ?? ''
  const m = /^(\d{1,12})\.([0-9a-f]{64})$/.exec(got)
  if (!m) return false
  const issued = Number(m[1]), age = Date.now() / 1000 - issued
  if (age < -60 || age > MAX_AGE_S) return false
  return same(m[2], await sign(issued))
}

/** The cookie flags: Secure when the visitor came over HTTPS (directly, or through the host's proxy). */
export function cookieFlags(req: Request): string {
  const https = new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
  return `Path=/; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`
}

/** A form posted from another site is refused (sign-in and sign-out only take forms from this site). */
export function sameSite(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  try { return new URL(origin).host === host } catch { return false }
}

/* Wrong passwords are limited per 15 minutes. With TRUST_PROXY=1 (behind a host's proxy, which appends the
   visitor's real address to x-forwarded-for) the limit is 8 per address; otherwise every visitor shares one
   allowance of 30, since the header can't be trusted. A right password clears the count. In memory, so it covers
   one server. */
const WINDOW_MS = 15 * 60 * 1000
const fails = new Map<string, { n: number; until: number }>()
export function clientKey(req: Request): string {
  if (process.env.TRUST_PROXY !== '1') return 'all'
  const list = (req.headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return list[list.length - 1] ?? 'all'
}
const limitFor = (key: string) => (key === 'all' ? 30 : 8)
export function blocked(key: string): boolean {
  const f = fails.get(key)
  return !!f && f.until > Date.now() && f.n >= limitFor(key)
}
export function failed(key: string): void {
  const now = Date.now()
  if (fails.size > 10_000) for (const [k, f] of fails) if (f.until < now) fails.delete(k)
  const f = fails.get(key)
  if (!f || f.until < now) fails.set(key, { n: 1, until: now + WINDOW_MS })
  else f.n++
}
export function succeeded(key: string): void { fails.delete(key) }
