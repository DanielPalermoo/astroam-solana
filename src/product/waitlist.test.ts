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

describe('WaitlistRepository (node:sqlite / memory)', () => {
  test('adds entries idempotently and normalizes emails', async () => {
    const repo = new WaitlistRepository(':memory:')
    try {
      assert.equal(await repo.getCount(), 0)

      // 1. Add new entry
      const r1 = await repo.addEntry({
        fullName: 'Cosmo Kramer',
        phone: '+1 555-0199',
        email: '  Cosmo@AstroAm.io ',
        countryOrigin: 'USA',
        nextDestination: 'Japan',
        source: 'landing_header',
      })
      assert.equal(r1.alreadyRegistered, false)
      assert.equal(r1.full_name, 'Cosmo Kramer')
      assert.equal(r1.phone, '+1 555-0199')
      assert.equal(r1.email, 'cosmo@astroam.io')
      assert.equal(r1.country_origin, 'USA')
      assert.equal(r1.next_destination, 'Japan')
      assert.equal(r1.source, 'landing_header')
      assert.ok(r1.id)
      assert.ok(r1.created_at)
      assert.equal(await repo.getCount(), 1)

      // 2. Duplicate entry with different case/trimming
      const r2 = await repo.addEntry({
        fullName: 'Cosmo Kramer Different Name',
        phone: '+1 555-9999',
        email: 'COSMO@astroam.io',
        countryOrigin: 'Canada',
        source: 'landing_footer',
      })
      assert.equal(r2.alreadyRegistered, true)
      assert.equal(r2.id, r1.id)
      assert.equal(r2.email, 'cosmo@astroam.io')
      assert.equal(await repo.getCount(), 1)

      // 3. Add second unique email
      const r3 = await repo.addEntry({
        fullName: 'Pilot Dave',
        phone: '+54 11 4444-5555',
        email: 'pilot@solana.org',
        countryOrigin: 'Argentina',
      })
      assert.equal(r3.alreadyRegistered, false)
      assert.equal(r3.email, 'pilot@solana.org')
      assert.equal(r3.source, null)
      assert.equal(await repo.getCount(), 2)

      // 4. getAll
      const all = await repo.getAll()
      assert.equal(all.length, 2)
      assert.equal(all[0].email, 'cosmo@astroam.io')
      assert.equal(all[1].email, 'pilot@solana.org')

      // 5. toCsv
      const csv = await repo.toCsv()
      assert.ok(csv.startsWith('id,full_name,phone,email,country_origin,next_destination,created_at,source\n'))
      assert.ok(csv.includes('cosmo@astroam.io'))
      assert.ok(csv.includes('Cosmo Kramer'))
      assert.ok(csv.includes('+1 555-0199'))
      assert.ok(csv.includes('pilot@solana.org'))
    } finally {
      repo.close()
    }
  })

  test('escapes special characters in CSV correctly', async () => {
    const repo = new WaitlistRepository(':memory:')
    try {
      await repo.addEntry({
        fullName: 'John "The Boss" Doe',
        phone: '+1-234,567',
        email: 'quote@test.com',
        countryOrigin: 'City, Country',
        nextDestination: 'A "Fancy" Place',
        source: 'has "quotes" and, commas',
      })
      const csv = await repo.toCsv()
      assert.ok(csv.includes('"John ""The Boss"" Doe"'))
      assert.ok(csv.includes('"+1-234,567"'))
      assert.ok(csv.includes('"City, Country"'))
      assert.ok(csv.includes('"A ""Fancy"" Place"'))
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

  test('POST /api/waitlist with valid data returns 201', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Elena Rostova',
        phone: '+54 9 11 3333-2222',
        email: 'explorer@orbit.dev',
        countryOrigin: 'Argentina',
        nextDestination: 'Spain',
        source: 'hero_cta',
      }),
    })

    assert.equal(res.status, 201)
    const body = (await res.json()) as { status: string; alreadyRegistered: boolean; message: string }
    assert.equal(body.status, 'ok')
    assert.equal(body.alreadyRegistered, false)
    assert.equal(body.message, 'You have successfully joined the waitlist!')
  })

  test('POST /api/waitlist with duplicate email returns 200 and alreadyRegistered: true', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Elena Rostova',
        phone: '+54 9 11 3333-2222',
        email: 'EXPLORER@orbit.dev',
        countryOrigin: 'Argentina',
      }),
    })

    assert.equal(res.status, 200)
    const body = (await res.json()) as { status: string; alreadyRegistered: boolean; message: string }
    assert.equal(body.status, 'ok')
    assert.equal(body.alreadyRegistered, true)
    assert.equal(body.message, "You're already aboard!")
  })

  test('POST /api/waitlist with honeypot silently discards without saving to DB', async () => {
    const countBefore = await repo.getCount()

    const res = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bot User',
        phone: '12345678',
        email: 'spammer-bot@botnet.ai',
        countryOrigin: 'Unknown',
        honeypot: 'i-am-a-bot',
      }),
    })

    assert.equal(res.status, 200)
    const body = (await res.json()) as { status: string; alreadyRegistered: boolean; message: string }
    assert.equal(body.status, 'ok')
    assert.equal(body.alreadyRegistered, false)
    assert.equal(body.message, 'You have successfully joined the waitlist!')

    // DB count should not have increased
    assert.equal(await repo.getCount(), countBefore)
  })

  test('POST /api/waitlist with invalid email returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        phone: '12345678',
        email: 'not-an-email',
        countryOrigin: 'Chile',
      }),
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
    assert.equal(body.count, await repo.getCount())
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
    assert.ok(csvText.startsWith('id,full_name,phone,email,country_origin,next_destination,created_at,source\n'))
    assert.ok(csvText.includes('explorer@orbit.dev'))
    assert.ok(csvText.includes('Elena Rostova'))
  })

  test('GET /api/waitlist/export succeeds with secret query parameter', async () => {
    const res = await fetch(`${baseUrl}/api/waitlist/export?secret=${adminSecret}`)

    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'text/csv; charset=utf-8')
    const csvText = await res.text()
    assert.ok(csvText.includes('explorer@orbit.dev'))
    assert.ok(csvText.includes('Elena Rostova'))
  })

  test('Standalone router endpoints match /count and /export', async () => {
    const resCount = await fetch(`${baseUrl}/standalone/count`)
    assert.equal(resCount.status, 200)

    const resExport = await fetch(`${baseUrl}/standalone/export?secret=${adminSecret}`)
    assert.equal(resExport.status, 200)
  })
})
