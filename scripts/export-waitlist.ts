import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { WaitlistRepository } from '../src/product/persistence/WaitlistRepository.ts'

function parseArgs(): { outFile?: string } {
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--save') {
      return { outFile: './data/waitlist_export.csv' }
    }
    if ((arg === '--out' || arg === '-o' || arg === '--file') && args[i + 1]) {
      return { outFile: args[i + 1] }
    }
    if (arg.startsWith('--out=')) {
      return { outFile: arg.split('=')[1] }
    }
    if (arg.startsWith('-o=')) {
      return { outFile: arg.split('=')[1] }
    }
    if (arg.startsWith('--file=')) {
      return { outFile: arg.split('=')[1] }
    }
    if (!arg.startsWith('-')) {
      return { outFile: arg }
    }
  }
  if (process.env.WAITLIST_EXPORT_FILE) {
    return { outFile: process.env.WAITLIST_EXPORT_FILE }
  }
  return {}
}

const { outFile } = parseArgs()
const repo = new WaitlistRepository()

try {
  const count = repo.getCount()
  const csv = repo.toCsv()

  if (outFile) {
    const resolved = path.resolve(outFile)
    fs.mkdirSync(path.dirname(resolved), { recursive: true })
    fs.writeFileSync(resolved, csv, 'utf-8')
    console.log(`Exported ${count} waitlist entries to ${resolved}`)
  } else {
    process.stdout.write(csv)
  }
} finally {
  repo.close()
}
