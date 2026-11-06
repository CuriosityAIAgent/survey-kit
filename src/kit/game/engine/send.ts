'use client'
/* Sends a finished run to POST /api/responses (src/app/api/responses/route.ts), which stores it in the database.
   'sent'    the server stored it; the ending thanks them
   'failed'  anything else (offline, a server error): Send stays live with "Couldn't send. Tap to try again."
   Preview runs never send (engine/Player.tsx). */
export type SendResult = 'sent' | 'not-collecting' | 'failed'

function runId(p: Record<string, unknown>): string {
  const meta = (p.meta ?? {}) as { tStart?: number }
  return `g${String(p.seed ?? 0).replace(/\D/g, '')}-${meta.tStart ?? Date.now()}`.slice(0, 64)
}

export async function sendResponse(payload: Record<string, unknown>): Promise<SendResult> {
  try {
    const res = await fetch('/api/responses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // one id per run (its seed and start time), so a retry after a lost reply is stored once
      body: JSON.stringify({ experience: 'game', id: runId(payload), respondent: payload.code ?? null, answers: payload.answers }),
      cache: 'no-store',
    })
    const j = (await res.json().catch(() => null)) as { ok?: unknown } | null
    return res.ok && j?.ok === true ? 'sent' : 'failed'
  } catch {
    return 'failed'
  }
}
