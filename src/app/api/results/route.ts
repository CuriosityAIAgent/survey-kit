/* GET /api/results?experience=quiz|game|all: the responses as a CSV download. Signed-in owner only. */
import { isSignedIn } from '@/server/auth'
import { EXPERIENCES, listResponses, type Experience } from '@/server/db'
import { toCsv } from '@/server/csv'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await isSignedIn())) return new Response('Sign in at /signin first.', { status: 401 })
  const want = new URL(req.url).searchParams.get('experience') ?? 'all'
  const experience = EXPERIENCES.includes(want as Experience) ? (want as Experience) : undefined
  const day = new Date().toISOString().slice(0, 10)
  return new Response(toCsv(listResponses(experience)), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="survey-${experience ?? 'all'}-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
