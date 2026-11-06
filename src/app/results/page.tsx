/* /results: what people answered, for the signed-in owner. Counts per experience, the latest responses, and a CSV
   download of each experience for a spreadsheet, R or pandas. */
import { redirect } from 'next/navigation'
import { isSignedIn } from '@/server/auth'
import { counts, latest as newest } from '@/server/db'

export const dynamic = 'force-dynamic'
const UI = 'font-[family-name:var(--font-ui)]'
const NAME = { quiz: 'Quiz-style', game: 'Game-style' } as const

export default async function Results() {
  if (!(await isSignedIn())) redirect('/signin')
  const n = counts()
  const latest = newest(25)
  return (
    <main className="mx-auto max-w-[960px] px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className={`${UI} text-[11px] font-semibold uppercase tracking-[0.16em] text-forest`}>Survey Kit</p>
          <h1 className="mt-1 text-[32px] font-semibold leading-tight">Results</h1>
        </div>
        <form action="/api/signout" method="post"><button className={`${UI} text-[13px] text-muted underline underline-offset-4`}>Sign out</button></form>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(['quiz', 'game'] as const).map((x) => (
          <section key={x} className="rounded-[6px] border border-rule-soft bg-white p-5">
            <p className={`${UI} text-[13px] font-semibold text-ink-2`}>{NAME[x]}</p>
            <p className="mt-1 text-[40px] font-semibold leading-none" data-count={x}>{n[x]}</p>
            <p className={`${UI} text-[13px] text-muted`}>responses</p>
            <a href={`/api/results?experience=${x}`} className={`btn mt-4 inline-flex items-center text-[14px]`} data-csv={x}>Download CSV</a>
          </section>
        ))}
      </div>
      <p className={`${UI} mt-3 text-[13px] text-muted`}>
        Or <a className="underline underline-offset-4" href="/api/results?experience=all">both in one file</a>. One row per response, one column per answer.
      </p>

      <h2 className={`${UI} mt-10 text-[12px] font-semibold uppercase tracking-[0.16em]`}>Latest responses</h2>
      {latest.length === 0 ? (
        <p className="mt-3 text-[16px] text-muted">Nothing yet. Take either survey from <a className="underline" href="/kit/index.html">the kit</a> and finish it.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-[6px] border border-rule-soft bg-white">
          <table className={`${UI} w-full text-left text-[13px]`}>
            <thead className="bg-paper text-muted">
              <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Experience</th><th className="px-3 py-2">Respondent</th><th className="px-3 py-2">Sent</th><th className="px-3 py-2">Answers</th></tr>
            </thead>
            <tbody>
              {latest.map((r) => (
                <tr key={r.id} className="border-t border-rule-soft align-top">
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">{NAME[r.experience]}</td>
                  <td className="px-3 py-2">{r.respondent ?? <span className="text-muted">anonymous</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2">{r.submitted_at.replace('T', ' ').slice(0, 16)}</td>
                  <td className="px-3 py-2 text-muted">{Object.keys(r.answers).length} answered</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <a href="/kit/index.html" className={`${UI} mt-8 inline-block text-[13px] text-muted underline underline-offset-4`}>‹ Back to the survey kit</a>
    </main>
  )
}
