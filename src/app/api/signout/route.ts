/* POST /api/signout: forget the owner cookie. */
import { COOKIE, cookieFlags, sameSite } from '@/server/auth'

export async function POST(req: Request) {
  if (!sameSite(req)) return new Response('Forbidden', { status: 403 })
  return new Response(null, { status: 303, headers: { Location: '/signin', 'Set-Cookie': `${COOKIE}=; ${cookieFlags(req)}; Max-Age=0` } })
}
