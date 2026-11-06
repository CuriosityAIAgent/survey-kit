/* /signin: the survey owner's password, for /results. */
import { redirect } from 'next/navigation'
import { configured, isSignedIn } from '@/server/auth'

export const dynamic = 'force-dynamic'
const UI = 'font-[family-name:var(--font-ui)]'

export default async function SignIn({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  if (await isSignedIn()) redirect('/results')
  const { e } = await searchParams
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-6">
      <p className={`${UI} text-[11px] font-semibold uppercase tracking-[0.16em] text-forest`}>Survey Kit</p>
      <h1 className="mt-1 text-[32px] font-semibold leading-tight">Sign in to see the results</h1>
      {!configured() ? (
        <p className={`${UI} mt-4 text-[15px] leading-[22px] text-muted`}>
          Sign-in is not set up yet. Copy <code>.env.example</code> to <code>.env.local</code>, set
          <code> SURVEY_ADMIN_PASSWORD</code> (8 characters or more) and <code>SURVEY_SECRET</code> (32 or more) to your own
          values, then restart the server. The sample values don&apos;t work.
        </p>
      ) : (
        <form action="/api/signin" method="post" className="mt-6">
          <label className={`${UI} block text-[13px] font-medium text-ink-2`} htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus className="field mt-1" />
          {e === 'wrong' && <p className={`${UI} mt-2 text-[13px] text-bronze`} role="alert">That password is not right.</p>}
          {e === 'wait' && <p className={`${UI} mt-2 text-[13px] text-bronze`} role="alert">Too many wrong passwords. Try again in 15 minutes.</p>}
          <button type="submit" className="btn mt-4 w-full">Sign in</button>
        </form>
      )}
      <a href="/kit/index.html" className={`${UI} mt-6 text-[13px] text-muted underline underline-offset-4`}>‹ Back to the survey kit</a>
    </main>
  )
}
