export const SHAPES = [
  { id: 'random', label: 'Random' },
  { id: 'sorted', label: 'Sorted' },
  { id: 'reversed', label: 'Reversed' },
  { id: 'nearly', label: 'Nearly sorted' },
  { id: 'few', label: 'Few unique' },
  { id: 'distinct', label: 'No repeats' },
]

export const TARGETS = [
  { id: 'random', label: 'Present' },
  { id: 'missing', label: 'Missing' },
  { id: 'first', label: 'First item' },
  { id: 'last', label: 'Last item' },
]

export function rng(seed) {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1))

function shuffle(list, r) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

export function makeArray(n, shape, r, { signed = false, spread = 99 } = {}) {
  const lo = signed ? -spread : 1
  const hi = spread
  if (shape === 'distinct') {
    const pool = []
    const width = Math.max(hi - lo + 1, n * 2)
    const start = signed ? -Math.floor(width / 2) : 1
    for (let v = start; v < start + width; v++) pool.push(v)
    return shuffle(pool, r).slice(0, n)
  }
  if (shape === 'few') {
    const values = Array.from({ length: 4 }, () => int(r, lo, hi))
    return Array.from({ length: n }, () => values[int(r, 0, 3)])
  }
  const arr = Array.from({ length: n }, () => int(r, lo, hi))
  if (shape === 'sorted' || shape === 'nearly') arr.sort((a, b) => a - b)
  if (shape === 'reversed') arr.sort((a, b) => b - a)
  if (shape === 'nearly' && n > 2) {
    const swaps = Math.max(1, Math.round(n / 12))
    for (let s = 0; s < swaps; s++) {
      const i = int(r, 0, n - 2)
      const j = Math.min(n - 1, i + int(r, 1, 3))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }
  return arr
}

export function nextPrime(n) {
  const isPrime = (m) => {
    if (m < 2) return false
    for (let d = 2; d * d <= m; d++) if (m % d === 0) return false
    return true
  }
  let m = Math.max(2, Math.round(n))
  while (!isPrime(m)) m++
  return m
}

export function pickTarget(arr, mode, r) {
  if (!arr.length) return 1
  if (mode === 'first') return arr[0]
  if (mode === 'last') return arr[arr.length - 1]
  if (mode === 'missing') return Math.max(...arr) + 1
  return arr[int(r, 0, arr.length - 1)]
}

export function buildInput(algo, n, { shape = 'random', target = 'random', seed = 1, spread } = {}) {
  const r = rng(seed * 7919 + n)
  if (algo.input === 'number') {
    const value = algo.sizeMap === 'nextPrime' ? nextPrime(n) : n
    return { kind: 'number', n: value }
  }
  const opts = { signed: !!algo.signed, spread: spread ?? (algo.signed ? 50 : 99) }
  if (algo.input === 'search') {
    const arr = makeArray(n, 'random', r, opts).sort((a, b) => a - b)
    return { kind: 'search', arr, target: pickTarget(arr, target, r) }
  }
  return { kind: 'array', arr: makeArray(n, shape, r, opts) }
}

export function parseList(text) {
  const parts = text
    .replace(/[[\]()]/g, ' ')
    .split(/[\s,;]+/)
    .filter(Boolean)
  const nums = parts.map((p) => Number(p.replace('−', '-')))
  if (!nums.length) return { ok: false, error: 'Enter some numbers, separated by commas or spaces.' }
  if (nums.some((x) => !Number.isFinite(x))) return { ok: false, error: 'Only numbers are allowed.' }
  if (nums.length > 64) return { ok: false, error: 'Use at most 64 numbers for the visualiser.' }
  return { ok: true, value: nums.map((x) => (Number.isInteger(x) ? x : Math.round(x * 1000) / 1000)) }
}
