import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createClient, type Client as LibSqlClient } from '@libsql/client'

export interface WaitlistEntry {
  id: string
  full_name: string
  phone: string
  email: string
  country_origin: string
  next_destination?: string | null
  created_at: string
  source?: string | null
}

export interface AddEntryInput {
  fullName: string
  phone: string
  email: string
  countryOrigin: string
  nextDestination?: string | null
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
  private localDb?: DatabaseSync
  private tursoClient?: LibSqlClient
  private isTurso: boolean = false
  private initPromise?: Promise<void>

  constructor(dbPath?: string) {
    const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN

    if (tursoUrl && tursoAuthToken && dbPath !== ':memory:') {
      this.isTurso = true
      this.tursoClient = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken,
      })
    } else {
      const targetPath =
        dbPath ??
        process.env.WAITLIST_DB_PATH ??
        path.resolve(process.env.DATA_DIR || './data', 'waitlist.db')

      if (targetPath !== ':memory:') {
        const fullPath = path.isAbsolute(targetPath) ? targetPath : path.resolve(targetPath)
        fs.mkdirSync(path.dirname(fullPath), { recursive: true })
        this.localDb = new DatabaseSync(fullPath)
      } else {
        this.localDb = new DatabaseSync(':memory:')
      }
    }

    this.initPromise = this.initSchema()
  }

  private async initSchema(): Promise<void> {
    if (this.isTurso && this.tursoClient) {
      await this.tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS waitlist (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          country_origin TEXT NOT NULL,
          next_destination TEXT,
          created_at TEXT NOT NULL,
          source TEXT
        );
      `)
      await this.tursoClient.execute(`
        CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
      `)
    } else if (this.localDb) {
      this.localDb.exec(`
        CREATE TABLE IF NOT EXISTS waitlist (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL DEFAULT '',
          phone TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL UNIQUE,
          country_origin TEXT NOT NULL DEFAULT '',
          next_destination TEXT,
          created_at TEXT NOT NULL,
          source TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
      `)

      // Add columns if table existed from previous version
      const cols = ['full_name', 'phone', 'country_origin', 'next_destination']
      for (const col of cols) {
        try {
          this.localDb.exec(`ALTER TABLE waitlist ADD COLUMN ${col} TEXT;`)
        } catch {
          // Column already exists, safe to ignore
        }
      }
    }
  }

  private async ensureReady(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise
    }
  }

  async addEntry(input: AddEntryInput): Promise<AddEntryResult> {
    await this.ensureReady()
    const normalizedEmail = input.email.trim().toLowerCase()
    const fullName = input.fullName.trim()
    const phone = input.phone.trim()
    const countryOrigin = input.countryOrigin.trim()
    const nextDestination = input.nextDestination?.trim() || null
    const source = input.source ?? null

    if (this.isTurso && this.tursoClient) {
      // Check existing
      const selectRes = await this.tursoClient.execute({
        sql: 'SELECT id, full_name, phone, email, country_origin, next_destination, created_at, source FROM waitlist WHERE email = ?',
        args: [normalizedEmail],
      })

      if (selectRes.rows.length > 0) {
        const row = selectRes.rows[0]
        return {
          id: String(row.id),
          full_name: String(row.full_name || ''),
          phone: String(row.phone || ''),
          email: String(row.email),
          country_origin: String(row.country_origin || ''),
          next_destination: row.next_destination ? String(row.next_destination) : null,
          created_at: String(row.created_at),
          source: row.source ? String(row.source) : null,
          alreadyRegistered: true,
        }
      }

      const id = crypto.randomUUID()
      const createdAt = new Date().toISOString()

      try {
        await this.tursoClient.execute({
          sql: `INSERT INTO waitlist (id, full_name, phone, email, country_origin, next_destination, created_at, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, fullName, phone, normalizedEmail, countryOrigin, nextDestination, createdAt, source],
        })

        return {
          id,
          full_name: fullName,
          phone,
          email: normalizedEmail,
          country_origin: countryOrigin,
          next_destination: nextDestination,
          created_at: createdAt,
          source,
          alreadyRegistered: false,
        }
      } catch (err) {
        // Fallback check on race condition
        const fallbackRes = await this.tursoClient.execute({
          sql: 'SELECT id, full_name, phone, email, country_origin, next_destination, created_at, source FROM waitlist WHERE email = ?',
          args: [normalizedEmail],
        })
        if (fallbackRes.rows.length > 0) {
          const row = fallbackRes.rows[0]
          return {
            id: String(row.id),
            full_name: String(row.full_name || ''),
            phone: String(row.phone || ''),
            email: String(row.email),
            country_origin: String(row.country_origin || ''),
            next_destination: row.next_destination ? String(row.next_destination) : null,
            created_at: String(row.created_at),
            source: row.source ? String(row.source) : null,
            alreadyRegistered: true,
          }
        }
        throw err
      }
    } else if (this.localDb) {
      const selectStmt = this.localDb.prepare(
        'SELECT id, full_name, phone, email, country_origin, next_destination, created_at, source FROM waitlist WHERE email = ?'
      )
      const existing = selectStmt.get(normalizedEmail) as WaitlistEntry | undefined

      if (existing) {
        return {
          id: existing.id,
          full_name: existing.full_name || '',
          phone: existing.phone || '',
          email: existing.email,
          country_origin: existing.country_origin || '',
          next_destination: existing.next_destination ?? null,
          created_at: existing.created_at,
          source: existing.source ?? null,
          alreadyRegistered: true,
        }
      }

      const id = crypto.randomUUID()
      const createdAt = new Date().toISOString()

      try {
        const insertStmt = this.localDb.prepare(`
          INSERT INTO waitlist (id, full_name, phone, email, country_origin, next_destination, created_at, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        insertStmt.run(id, fullName, phone, normalizedEmail, countryOrigin, nextDestination, createdAt, source)

        return {
          id,
          full_name: fullName,
          phone,
          email: normalizedEmail,
          country_origin: countryOrigin,
          next_destination: nextDestination,
          created_at: createdAt,
          source,
          alreadyRegistered: false,
        }
      } catch (err: unknown) {
        const fallback = selectStmt.get(normalizedEmail) as WaitlistEntry | undefined
        if (fallback) {
          return {
            id: fallback.id,
            full_name: fallback.full_name || '',
            phone: fallback.phone || '',
            email: fallback.email,
            country_origin: fallback.country_origin || '',
            next_destination: fallback.next_destination ?? null,
            created_at: fallback.created_at,
            source: fallback.source ?? null,
            alreadyRegistered: true,
          }
        }
        throw err
      }
    }

    throw new Error('Database client not initialized')
  }

  async getCount(): Promise<number> {
    await this.ensureReady()
    if (this.isTurso && this.tursoClient) {
      const res = await this.tursoClient.execute('SELECT COUNT(*) as count FROM waitlist')
      const countVal = res.rows[0]?.count
      return Number(countVal || 0)
    } else if (this.localDb) {
      const stmt = this.localDb.prepare('SELECT COUNT(*) as count FROM waitlist')
      const row = stmt.get() as { count: number | bigint } | undefined
      return row ? Number(row.count) : 0
    }
    return 0
  }

  async getAll(): Promise<WaitlistEntry[]> {
    await this.ensureReady()
    if (this.isTurso && this.tursoClient) {
      const res = await this.tursoClient.execute(
        'SELECT id, full_name, phone, email, country_origin, next_destination, created_at, source FROM waitlist ORDER BY created_at ASC'
      )
      return res.rows.map((row) => ({
        id: String(row.id),
        full_name: String(row.full_name || ''),
        phone: String(row.phone || ''),
        email: String(row.email),
        country_origin: String(row.country_origin || ''),
        next_destination: row.next_destination ? String(row.next_destination) : null,
        created_at: String(row.created_at),
        source: row.source ? String(row.source) : null,
      }))
    } else if (this.localDb) {
      const stmt = this.localDb.prepare(
        'SELECT id, full_name, phone, email, country_origin, next_destination, created_at, source FROM waitlist ORDER BY created_at ASC'
      )
      return stmt.all() as unknown as WaitlistEntry[]
    }
    return []
  }

  async toCsv(): Promise<string> {
    const entries = await this.getAll()
    const lines = ['id,full_name,phone,email,country_origin,next_destination,created_at,source']
    for (const entry of entries) {
      lines.push([
        escapeCsvCell(entry.id),
        escapeCsvCell(entry.full_name),
        escapeCsvCell(entry.phone),
        escapeCsvCell(entry.email),
        escapeCsvCell(entry.country_origin),
        escapeCsvCell(entry.next_destination),
        escapeCsvCell(entry.created_at),
        escapeCsvCell(entry.source),
      ].join(','))
    }
    return lines.join('\n') + '\n'
  }

  close(): void {
    if (this.localDb) {
      this.localDb.close()
    }
    if (this.tursoClient) {
      this.tursoClient.close()
    }
  }
}
