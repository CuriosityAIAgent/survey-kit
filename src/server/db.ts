/* The database: one SQLite file (data/survey.db), using the SQLite built into Node 22.13+ (node:sqlite), so there
   is nothing to install or run. One table holds every finished survey:

     responses(id, experience, submission, respondent, submitted_at, answers)
       experience    'quiz' or 'game': which of the two experiences sent it
       submission    an id the browser makes for each finished survey, so a retry is stored once
       respondent    the invite code from the link (?r=...), or null for an anonymous answer
       submitted_at  ISO time the server stored it
       answers       the answers as JSON, keyed by step id (quiz) or by `stores` (game)

   To use Postgres, MySQL or a hosted database instead (Supabase, Neon, Turso...), keep these three functions and
   rewrite their bodies; nothing else reads the database. */
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

export type Experience = 'quiz' | 'game'
export const EXPERIENCES: Experience[] = ['quiz', 'game']
export type Row = { id: number; experience: Experience; respondent: string | null; submitted_at: string; answers: Record<string, unknown> }

let db: DatabaseSync | null = null
function open(): DatabaseSync {
  if (db) return db
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || 'data')
  fs.mkdirSync(dir, { recursive: true })
  db = new DatabaseSync(path.join(dir, 'survey.db'))
  db.exec(`CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    experience TEXT NOT NULL CHECK (experience IN ('quiz', 'game')),
    submission TEXT UNIQUE,
    respondent TEXT,
    submitted_at TEXT NOT NULL,
    answers TEXT NOT NULL
  )`)
  return db
}

/** Store one finished survey; a submission id seen before is not stored again. Returns the row's id. */
export function saveResponse(experience: Experience, submission: string | null, respondent: string | null, answers: Record<string, unknown>): { id: number; repeat: boolean } {
  const d = open()
  if (submission) {
    const prev = d.prepare('SELECT id FROM responses WHERE submission = ?').get(submission) as { id: number } | undefined
    if (prev) return { id: Number(prev.id), repeat: true }
  }
  const r = d
    .prepare('INSERT INTO responses (experience, submission, respondent, submitted_at, answers) VALUES (?, ?, ?, ?, ?)')
    .run(experience, submission, respondent, new Date().toISOString(), JSON.stringify(answers))
  return { id: Number(r.lastInsertRowid), repeat: false }
}

/** The newest responses, newest first. */
export function latest(n: number): Row[] {
  return (open().prepare('SELECT * FROM responses ORDER BY id DESC LIMIT ?').all(n) as Array<Record<string, unknown>>).map(toRow)
}

/** Every response for one experience (or all), oldest first. */
export function listResponses(experience?: Experience): Row[] {
  const q = experience
    ? open().prepare('SELECT * FROM responses WHERE experience = ? ORDER BY id').all(experience)
    : open().prepare('SELECT * FROM responses ORDER BY id').all()
  return (q as Array<Record<string, unknown>>).map(toRow)
}

function toRow(r: Record<string, unknown>): Row {
  return {
    id: Number(r.id),
    experience: r.experience as Experience,
    respondent: (r.respondent as string | null) ?? null,
    submitted_at: String(r.submitted_at),
    answers: JSON.parse(String(r.answers)) as Record<string, unknown>,
  }
}

/** How many responses each experience has. */
export function counts(): Record<Experience, number> {
  const rows = open().prepare('SELECT experience, COUNT(*) AS n FROM responses GROUP BY experience').all() as Array<{ experience: Experience; n: number }>
  const out: Record<Experience, number> = { quiz: 0, game: 0 }
  for (const r of rows) out[r.experience] = Number(r.n)
  return out
}
