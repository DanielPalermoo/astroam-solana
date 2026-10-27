import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export interface WaitlistEntry {
  id: string
  email: string
  created_at: string
  source?: string | null
}

export interface AddEntryResult extends WaitlistEntry {
  alreadyRegistered: boolean
}

function escapeCsvCell(val: string | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export class WaitlistRepository {
  private db: DatabaseSync

  constructor(dbPath?: string) {
    const targetPath =
      dbPath ??
      process.env.WAITLIST_DB_PATH ??
      path.resolve(process.env.DATA_DIR || './data', 'waitlist.db')

    if (targetPath !== ':memory:') {
      const fullPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(targetPath)
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      this.db = new DatabaseSync(fullPath)
    } else {
      this.db = new DatabaseSync(':memory:')
    }

    this.initSchema()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        source TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
    `)
  }

  addEntry(email: string, source?: string): AddEntryResult {
    const normalizedEmail = email.trim().toLowerCase()
    const selectStmt = this.db.prepare('SELECT id, email, created_at, source FROM waitlist WHERE email = ?')
    const existing = selectStmt.get(normalizedEmail) as WaitlistEntry | undefined

    if (existing) {
      return {
        id: existing.id,
        email: existing.email,
        created_at: existing.created_at,
        source: existing.source ?? null,
        alreadyRegistered: true,
      }
    }

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const entrySource = source ?? null

    try {
      const insertStmt = this.db.prepare(`
        INSERT INTO waitlist (id, email, created_at, source)
        VALUES (?, ?, ?, ?)
      `)
      insertStmt.run(id, normalizedEmail, createdAt, entrySource)

      return {
        id,
        email: normalizedEmail,
        created_at: createdAt,
        source: entrySource,
        alreadyRegistered: false,
      }
    } catch (err: unknown) {
      const fallback = selectStmt.get(normalizedEmail) as WaitlistEntry | undefined
      if (fallback) {
        return {
          id: fallback.id,
          email: fallback.email,
          created_at: fallback.created_at,
          source: fallback.source ?? null,
          alreadyRegistered: true,
        }
      }
      throw err
    }
  }

  getCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM waitlist')
    const row = stmt.get() as { count: number | bigint } | undefined
    return row ? Number(row.count) : 0
  }

  getAll(): WaitlistEntry[] {
    const stmt = this.db.prepare('SELECT id, email, created_at, source FROM waitlist ORDER BY created_at ASC')
    return stmt.all() as unknown as WaitlistEntry[]
  }

  toCsv(): string {
    const entries = this.getAll()
    const lines = ['id,email,created_at,source']
    for (const entry of entries) {
      lines.push([
        escapeCsvCell(entry.id),
        escapeCsvCell(entry.email),
        escapeCsvCell(entry.created_at),
        escapeCsvCell(entry.source),
      ].join(','))
    }
    return lines.join('\n') + '\n'
  }

  close(): void {
    this.db.close()
  }
}
