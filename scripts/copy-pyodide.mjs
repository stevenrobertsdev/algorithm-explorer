import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const from = join(root, 'node_modules', 'pyodide')
const to = join(root, 'public', 'pyodide')
const files = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']

if (!existsSync(from)) {
  console.error('pyodide is not installed. Run npm install first.')
  process.exit(1)
}
mkdirSync(to, { recursive: true })
for (const f of files) cpSync(join(from, f), join(to, f))
console.log(`Copied Pyodide runtime to ${to}`)
