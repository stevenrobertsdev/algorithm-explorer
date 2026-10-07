const log2 = (n) => Math.log2(Math.max(n, 2))

function factorial(n) {
  let f = 1
  for (let i = 2; i <= n; i++) f *= i
  return f
}

export const CLASSES = [
  { id: '1', tex: 'O(1)', plain: '1', name: 'Constant', color: '#0f9d6b', g: () => 1 },
  { id: 'logn', tex: 'O(\\log n)', plain: 'log n', name: 'Logarithmic', color: '#3d9e4a', g: log2 },
  { id: 'sqrtn', tex: 'O(\\sqrt{n})', plain: '√n', name: 'Square root', color: '#7f9f1f', g: Math.sqrt },
  { id: 'n', tex: 'O(n)', plain: 'n', name: 'Linear', color: '#b8941a', g: (n) => n },
  { id: 'nlogn', tex: 'O(n \\log n)', plain: 'n log n', name: 'Linearithmic', color: '#d97b16', g: (n) => n * log2(n) },
  { id: 'n2', tex: 'O(n^2)', plain: 'n²', name: 'Quadratic', color: '#df5a1b', g: (n) => n * n },
  { id: 'n3', tex: 'O(n^3)', plain: 'n³', name: 'Cubic', color: '#d13a2a', g: (n) => n ** 3 },
  { id: '2n', tex: 'O(2^n)', plain: '2ⁿ', name: 'Exponential', color: '#c2185b', g: (n) => 2 ** n },
  { id: 'fact', tex: 'O(n!)', plain: 'n!', name: 'Factorial', color: '#8e24aa', g: factorial },
]

export const classById = (id) => CLASSES.find((c) => c.id === id) ?? null

function weightedLinear(xs, ys) {
  let a = 0
  let b = 0
  let c = 0
  let d = 0
  let e = 0
  for (let i = 0; i < xs.length; i++) {
    const w = 1 / (ys[i] * ys[i])
    a += w * xs[i] * xs[i]
    b += w * xs[i]
    c += w
    d += w * xs[i] * ys[i]
    e += w * ys[i]
  }
  const det = a * c - b * b
  if (Math.abs(det) < 1e-300) return null
  return { k: (d * c - b * e) / det, d: (a * e - b * d) / det }
}

function relError(ys, pred) {
  let s = 0
  for (let i = 0; i < ys.length; i++) {
    const p = pred[i]
    if (!(p > 0)) return Infinity
    const e = Math.log(p / ys[i])
    s += e * e
  }
  return Math.sqrt(s / ys.length)
}

export function slope(points) {
  const pts = points.filter((p) => p.n > 0 && p.y > 0)
  const half = pts.slice(Math.floor(pts.length / 2))
  if (half.length < 2) return null
  const xs = half.map((p) => Math.log(p.n))
  const ys = half.map((p) => Math.log(p.y))
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length
  const my = ys.reduce((s, y) => s + y, 0) / ys.length
  let num = 0
  let den = 0
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return den ? num / den : null
}

export function fit(points) {
  const pts = points.filter((p) => Number.isFinite(p.y) && p.y > 0 && p.n > 0)
  if (pts.length < 3) return null
  const ns = pts.map((p) => p.n)
  const ys = pts.map((p) => p.y)
  const ranked = []
  const spread = Math.max(...ys) / Math.min(...ys)

  for (const cls of CLASSES) {
    if (cls.id === '2n') {
      const xs = ns
      const ly = ys.map((y) => Math.log(y))
      const mx = xs.reduce((s, x) => s + x, 0) / xs.length
      const my = ly.reduce((s, y) => s + y, 0) / ly.length
      let num = 0
      let den = 0
      for (let i = 0; i < xs.length; i++) {
        num += (xs[i] - mx) * (ly[i] - my)
        den += (xs[i] - mx) ** 2
      }
      if (!den) continue
      const lb = num / den
      const base = Math.exp(lb)
      if (base <= 1.05) continue
      const lc = my - lb * mx
      const pred = xs.map((x) => Math.exp(lc + lb * x))
      ranked.push({ cls, score: relError(ys, pred), base, tex: `O(${base.toFixed(2)}^n)`, f: (n) => Math.exp(lc + lb * n) })
      continue
    }
    const gs = ns.map(cls.g)
    if (gs.some((g) => !Number.isFinite(g))) continue
    if (cls.id === '1') {
      const w = ys.map((y) => 1 / (y * y))
      const level = ys.reduce((s, y, i) => s + w[i] * y, 0) / w.reduce((s, x) => s + x, 0)
      ranked.push({ cls, score: relError(ys, ys.map(() => level)), tex: cls.tex, f: () => level })
      continue
    }
    const sol = weightedLinear(gs, ys)
    if (!sol || sol.k <= 0) continue
    const pred = gs.map((g) => sol.k * g + sol.d)
    ranked.push({ cls, score: relError(ys, pred), k: sol.k, d: sol.d, tex: cls.tex, f: (n) => sol.k * cls.g(n) + sol.d })
  }
  if (!ranked.length) return null
  const order = (r) => CLASSES.indexOf(r.cls)
  ranked.sort((a, b) => order(a) - order(b))
  let best = ranked[0]
  if (spread < 1.2) best = ranked.find((r) => r.cls.id === '1') ?? best
  else {
    for (const r of ranked) {
      if (r === best) continue
      if (r.score < best.score * 0.75 || (best.score > 0.02 && r.score < best.score - 0.01 && r.score < best.score * 0.95)) best = r
    }
  }
  return { best, ranked: [...ranked].sort((a, b) => a.score - b.score), slope: slope(pts) }
}

export const SAMPLE_NS = [10, 100, 1000, 1e6]

export function opsAt(cls, n) {
  if (cls.id === 'fact') {
    if (n > 170) return Infinity
    return factorial(n)
  }
  if (cls.id === '2n' && n > 1023) return Infinity
  return cls.g(n)
}

export function humanOps(x) {
  if (!Number.isFinite(x)) return 'more than 10³⁰⁸'
  if (x < 1e4) return String(Math.round(x))
  const e = Math.floor(Math.log10(x))
  const m = x / 10 ** e
  const sup = String(e).replace(/[0-9-]/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(d)] ?? '⁻')
  return `${m.toFixed(1)} × 10${sup}`
}

export function humanTime(seconds) {
  if (!Number.isFinite(seconds)) return 'longer than the universe'
  if (seconds < 1e-6) return '< 1 µs'
  if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(0)} µs`
  if (seconds < 1) return `${(seconds * 1e3).toFixed(0)} ms`
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  if (seconds < 3600) return `${(seconds / 60).toFixed(0)} min`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(0)} hours`
  if (seconds < 3.156e7) return `${(seconds / 86400).toFixed(0)} days`
  const years = seconds / 3.156e7
  if (years < 1e6) return `${Math.round(years).toLocaleString('en-GB')} years`
  if (years > 1.38e10) return 'longer than the age of the universe'
  return `${humanOps(years)} years`
}
