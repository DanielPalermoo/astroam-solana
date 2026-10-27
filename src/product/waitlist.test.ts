import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import express from 'express'
import { WaitlistRepository } from './persistence/WaitlistRepository.ts'
import { createWaitlistRouter, createProductRouter } from './api/routes.ts'
import { MissionProductService } from './services/MissionProductService.ts'
import { FakeRail } from '../rails/FakeRail.ts'
import { FakeProvider } from '../providers/connectivity/FakeProvider.ts'
import type { MissionRepository } from './persistence/MissionRepository.ts'
import type { ProductMission } from './types/mission.ts'

class MockMissionRepo implements MissionRepository {
  async save(_mission: ProductMission): Promise<void> {}
  async findById(_id: string): Promise<ProductMission | null> { return null }
  async findByPaymentIntentId(_intentId: string): Promise<ProductMission | null> { return null }
  async findAll(): Promise<ProductMission[]> { return [] }
}

describe('WaitlistRepository (node:sqlite)', () => {
  test('adds entries idempotently and normalizes emails', () => {
    const repo = new WaitlistRepository(':memory:')
    try {
      assert.equal(repo.getCount(), 0)

      // 1. Add new entry
      const r1 = repo.addEntry('  Cosmo@AstroAm.io ', 'landing_header')
      assert.equal(r1.alreadyRegistered, false)
      assert.equal(r1.email, 'cosmo@astroam.io')
      assert.equal(r1.source, 'landing_header')
      assert.ok(r1.id)
      assert.ok(r1.created_at)
      assert.equal(repo.getCount(), 1)

      // 2. Duplicate entry with different case/trimming
      const r2 = repo.addEntry('COSMO@astroam.io', 'landing_footer')
      assert.equal(r2.alreadyRegistered, true)
      assert.equal(r2.id, r1.id)
      assert.equal(r2.email, 'cosmo@astroam.io')
      assert.equal(repo.getCount(), 1)

      // 3. Add second unique email
      const r3 = repo.addEntry('pilot@solana.org')
      assert.equal(r3.alreadyRegistered, false)
      assert.equal(r3.email, 'pilot@solana.org')
      assert.equal(r3.source, null)
      assert.equal(repo.getCount(), 2)

      // 4. getAll
      const all = repo.getAll()
      assert.equal(all.length, 2)
      assert.equal(all[0].email, 'cosmo@astroam.io')
      assert.equal(all[1].email, 'pilot@solana.org')

      // 5. toCsv
      const csv = repo.toCsv()
      assert.ok(csv.startsWith('id,email,created_at,source\n'))
      assert.ok(csv.includes('cosmo@astroam.io'))
      assert.ok(csv.includes('pilot@solana.org'))
    } finally {
      repo.close()
    }
  })

  test('escapes special characters in CSV correctly', () => {
    const repo = new WaitlistRepository(':memory:')
    try {
      repo.addEntry('quote@test.com', 'has "quotes" and, commas')
      const csv = repo.toCsv()
      assert.ok(csv.includes('"has ""quotes"" and, commas"'))
    } finally {
      repo.close()
    }
  })
})

describe('Waitlist API Routes', () => {
  let server: http.Server
  let baseUrl: string
  let repo: WaitlistRepository
  const adminSecret = 'super-secret-astro-key-99'

  before(async () => {
    process.env.WAITLIST_ADMIN_SECRET = adminSecret

    repo = new WaitlistRepository(':memory:')
    const dummyService = new MissionProductService({
      repo: new MockMissionRepo(),
      connectivity: new FakeProvider(),
      rail: new FakeRail(),
      hasCitrusReal: false,
    })

    const app = express()
    app.use(express.json())
    // Mount product router (which mounts waitlist routes) at /api
    app.use('/api', createProductRouter(dummyService, repo))
    // Also mount standalone waitlist router directly at /standalone
    app.use('/standalone', createWaitlistRouter(repo))

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number }
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    })
  })

  after(async () => {
    delete process.env.WAITLIST_ADMIN_SECRET
    if (repo) repo.close()
    await new Promise<void>((resolve) => {
      if (server) server.close(() => resolve())
      else resolve()
    })
  })

  test('POST /api/waitlist with valid email returns 201', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'explorer@orbit.dev', source: 'hero_cta' }),
    })

    assert.equal(res.status, 201)
    const body = (await res.json()) as { status: string; alreadyRegistered: boolean; message: string }
    assert.equal(body.status, 'ok')
    assert.equal(body.alreadyRegistered, false)
    assert.equal(body.message, '¡Te has unido a la lista de espera con éxito!')
  })

  test('POST /api/waitlist with duplicate email returns 200 and alreadyRegistered: true', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'EXPLORER@orbit.dev' }),
    })

    assert.equal(res.status, 200)
    const body = (await res.json()) as { status: string; alreadyRegistered: boolean; message: string }
    assert.equal(body.status, 'ok')
    assert.equal(body.alreadyRegistered, true)
    assert.equal(body.message, 'Ya estas a bordo!')
  })

  test('POST /api/waitlist with honeypot silently discards without saving to DB', async () => {
    const countBefore = repo.getCount()

    const res = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'spammer-bot@botnet.ai',
        honeypot: 'i-am-a-bot',
      }),
    })

    assert.equal(res.status, 200)
    const body = (await res.json()) as { status: string; alreadyRegistered: boolean; message: string }
    assert.equal(body.status, 'ok')
    assert.equal(body.alreadyRegistered, false)
    assert.equal(body.message, '¡Te has unido a la lista de espera con éxito!')

    // DB count should not have increased
    assert.equal(repo.getCount(), countBefore)
  })

  test('POST /api/waitlist with invalid email returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    })

    assert.equal(res.status, 400)
    const body = (await res.json()) as { error: string; message: string }
    assert.equal(body.error, 'invalid_request')
    assert.ok(body.message)
  })

  test('GET /api/waitlist/count returns current count', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist/count`)
    assert.equal(res.status, 200)
    const body = (await res.json()) as { count: number }
    assert.equal(typeof body.count, 'number')
    assert.equal(body.count, repo.getCount())
  })

  test('GET /api/waitlist/export rejects unauthorized requests (no secret / bad secret)', async () => {
    // 1. No secret
    const resNoAuth = await fetch(`${baseUrl}/api/waitlist/export`)
    assert.equal(resNoAuth.status, 401)
    const bodyNoAuth = (await resNoAuth.json()) as { error: string }
    assert.equal(bodyNoAuth.error, 'unauthorized')

    // 2. Wrong secret header
    const resBadHeader = await fetch(`${baseUrl}/api/waitlist/export`, {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    assert.equal(resBadHeader.status, 401)

    // 3. Wrong secret query param
    const resBadQuery = await fetch(`${baseUrl}/api/waitlist/export?secret=wrong-secret`)
    assert.equal(resBadQuery.status, 401)
  })

  test('GET /api/waitlist/export succeeds with Bearer token authorization', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist/export`, {
      headers: { Authorization: `Bearer ${adminSecret}` },
    })

    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'text/csv; charset=utf-8')
    assert.ok(res.headers.get('content-disposition')?.includes('filename="waitlist.csv"'))

    const csvText = await res.text()
    assert.ok(csvText.startsWith('id,email,created_at,source\n'))
    assert.ok(csvText.includes('explorer@orbit.dev'))
  })

  test('GET /api/waitlist/export succeeds with secret query parameter', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist/export?secret=${adminSecret}`)

    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'text/csv; charset=utf-8')
    const csvText = await res.text()
    assert.ok(csvText.includes('explorer@orbit.dev'))
  })

  test('Standalone router endpoints match /count and /export', async () => {
    const resCount = await fetch(`${baseUrl}/standalone/count`)
    assert.equal(resCount.status, 200)

    const resExport = await fetch(`${baseUrl}/standalone/export?secret=${adminSecret}`)
    assert.equal(resExport.status, 200)
  })
})
