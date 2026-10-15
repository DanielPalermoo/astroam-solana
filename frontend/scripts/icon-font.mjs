// Rebuilds src/assets/fonts/material-symbols-outlined.woff2 with only the icons
// listed in material-symbols-outlined.icons.txt. Run it after adding an icon:
//   npm run icons
import { readFile, writeFile } from 'node:fs/promises'

const dir = new URL('../src/assets/fonts/', import.meta.url)
const list = await readFile(new URL('material-symbols-outlined.icons.txt', dir), 'utf8')
const names = [...new Set(list.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')))].sort()

// Google serves woff2 only to a browser user agent.
const headers = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36' }
const css = await (
  await fetch(
    `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=${names.join(',')}&display=block`,
    { headers },
  )
).text()
const url = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1]
if (!url) throw new Error(`no font URL in the Google Fonts response:\n${css.slice(0, 300)}`)

const font = Buffer.from(await (await fetch(url, { headers })).arrayBuffer())
await writeFile(new URL('material-symbols-outlined.woff2', dir), font)
console.log(`${names.length} icons, ${font.length} bytes`)
