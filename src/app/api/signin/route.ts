/* POST /api/signin (the form on /signin): a right password sets the owner cookie and opens /results. */
import { COOKIE, MAX_AGE_S, blocked, clientKey, configured, cookieFlags, failed, same, sameSite, succeeded, token } from '@/server/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const go = (to: string, cookie?: string) => {
    const h = new Headers({ Location: to })
    if (cookie) h.append('Set-Cookie', cookie)
    return new Response(null, { status: 303, headers: h })
  }
  if (!sameSite(req)) return new Response('Forbidden', { status: 403 })
  if (!configured()) return go('/signin')
  const key = clientKey(req)
  if (blocked(key)) return go('/signin?e=wait')
  const form = await req.formData()
  const pw = String(form.get('password') ?? '')
  if (!same(pw, process.env.SURVEY_ADMIN_PASSWORD!)) { failed(key); return go('/signin?e=wrong') }
  succeeded(key)
  return go('/results', `${COOKIE}=${await token()}; ${cookieFlags(req)}; Max-Age=${MAX_AGE_S}`)
}
