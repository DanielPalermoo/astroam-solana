// Every icon the app renders must be in the self-hosted font subset, or the
// browser shows its name as text (e.g. "rocket_launch") instead of the icon.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const fontDir = new URL('.', import.meta.url).pathname
const srcDir = join(fontDir, '..', '..')

function listed(): Set<string> {
  const text = readFileSync(join(fontDir, 'material-symbols-outlined.icons.txt'), 'utf8')
  return new Set(text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')))
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [path] : []
  })
}

// Icon names appear as the text of a .material-symbols-outlined element, as a
// string in a ternary inside one, or as `icon` / `glyph` values passed down.
function usedIcons(): Set<string> {
  const used = new Set<string>()
  const patterns = [
    /material-symbols-outlined[^>]*>\s*([a-z][a-z0-9_]+)\s*</g,
    /material-symbols-outlined[^>]*>\s*\{[^}]*?\?\s*'([a-z][a-z0-9_]+)'\s*:\s*'([a-z][a-z0-9_]+)'\s*\}/g,
    /\b(?:icon|glyph)\s*[:=]\s*\{?\s*['"]([a-z][a-z0-9_]+)['"]/g,
  ]
  for (const file of sources(srcDir)) {
    const text = readFileSync(file, 'utf8')
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        for (const name of match.slice(1)) if (name) used.add(name)
      }
    }
  }
  return used
}

test('every icon used in the app is in the self-hosted icon font', () => {
  const missing = [...usedIcons()].filter((name) => !listed().has(name)).sort()
  assert.deepEqual(missing, [], `add these to material-symbols-outlined.icons.txt and run \`npm run icons\`: ${missing.join(', ')}`)
})
