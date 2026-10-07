import { reactive, computed, watch } from 'vue'
import { ALGORITHMS, TEMPLATES, CUSTOM_POINTERS, byId } from './algorithms.js'
import { buildInput, parseList, rng, pickTarget } from './data.js'
import { buildTrace } from './trace.js'
import { fit, classById } from './complexity.js'
import * as runner from './runner.js'

const STORAGE = 'algorithm-explorer:v1'
const PREFS = 'algorithm-explorer:prefs'

const GEO = (from, to) => {
  const out = []
  for (let n = from; n <= to; n *= 2) out.push(n)
  return out
}

const CUSTOM_SIZES = {
  array: [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048],
  search: GEO(16, 1 << 16),
  number: [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 64, 128, 256, 512, 1024, 4096, 16384, 65536, 1 << 18, 1 << 20],
}

export const BUDGET = 2_500_000
export const MAX_FRAMES = 3000

export const state = reactive({
  selectedId: 'bubble-sort',
  tab: 'visualise',
  custom: [],
  edits: {},
  visual: { n: 16, shape: 'random', target: 'random', seed: 1, list: '', number: null, view: 'auto' },
  bench: { shape: 'random', target: 'missing', limit: null, metric: 'steps', xlog: false, ylog: false, refs: true },
  compareIds: [],
})

export const prefs = reactive({ inspector: true, theme: 'system', speed: 5 })

export const session = reactive({
  trace: null,
  traceError: null,
  tracing: false,
  frame: 0,
  playing: false,
  bench: {},
  comparing: false,
  dialog: null,
  help: false,
  toast: null,
  listError: '',
})

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0).toString(36)
}

export function describe(id) {
  const classic = byId(id)
  if (classic) {
    return {
      ...classic,
      code: state.edits[id] ?? classic.code,
      custom: false,
      edited: id in state.edits,
    }
  }
  const u = state.custom.find((c) => c.id === id)
  if (!u) return null
  return {
    id: u.id,
    name: u.name,
    category: 'My algorithms',
    input: u.input,
    check: u.check || null,
    code: u.code,
    custom: true,
    guess: u.guess || null,
    badge: u.guess || null,
    expect: u.guess ? { default: u.guess } : null,
    sizes: CUSTOM_SIZES[u.input],
    pointers: CUSTOM_POINTERS,
    visualN: u.input === 'number' ? 10 : 16,
    props: [],
  }
}

export const current = computed(() => describe(state.selectedId) ?? describe(ALGORITHMS[0].id))

export const visualInput = computed(() => {
  const a = current.value
  const v = state.visual
  if (a.input === 'number') {
    const n = Math.max(0, Math.round(v.number ?? a.visualN ?? 10))
    return { ok: true, value: { kind: 'number', n } }
  }
  if (v.list.trim()) {
    const parsed = parseList(v.list)
    if (!parsed.ok) return parsed
    let arr = parsed.value
    if (a.input === 'search') {
      arr = [...arr].sort((x, y) => x - y)
      return { ok: true, value: { kind: 'search', arr, target: pickTarget(arr, v.target, rng(v.seed)) } }
    }
    return { ok: true, value: { kind: 'array', arr } }
  }
  const n = Math.max(1, Math.min(64, Math.round(v.n)))
  return { ok: true, value: buildInput(a, n, { shape: v.shape, target: v.target, seed: v.seed }) }
})

export const codeChanged = computed(() => {
  const t = session.trace
  return !!t && (t.id !== current.value.id || t.code !== current.value.code)
})

export function setCode(code) {
  const a = current.value
  if (a.custom) {
    const u = state.custom.find((c) => c.id === a.id)
    if (u) u.code = code
  } else if (code === byId(a.id).code) {
    delete state.edits[a.id]
  } else {
    state.edits[a.id] = code
  }
}

export function resetCode() {
  delete state.edits[state.selectedId]
}

export function select(id) {
  if (!describe(id)) return
  pause()
  state.selectedId = id
  const a = current.value
  state.visual.list = ''
  state.visual.number = null
  state.visual.n = a.input === 'number' ? 16 : (a.visualN ?? 16)
  state.visual.shape = a.shape ?? 'random'
  state.visual.view = 'auto'
  state.bench.shape = a.shape ?? 'random'
  state.bench.limit = null
  session.trace = null
  session.traceError = null
  session.frame = 0
  runTrace(false)
}

let traceSeq = 0

export async function runTrace(autoplay = true) {
  const a = current.value
  const inp = visualInput.value
  session.listError = inp.ok ? '' : inp.error
  if (!inp.ok) return
  const seq = ++traceSeq
  pause()
  session.tracing = true
  const raw = await runner.trace({
    code: a.code,
    entry: 'algorithm',
    input: inp.value,
    check: a.check,
    maxFrames: MAX_FRAMES,
    budget: 300000,
  })
  if (seq !== traceSeq) return
  session.tracing = false
  if (raw.cancelled) {
    session.traceError = raw.error
    return
  }
  const built = buildTrace(raw, inp.value)
  session.trace = { ...built, raw, input: inp.value, id: a.id, code: a.code }
  session.traceError = raw.ok ? null : raw.error
  session.frame = 0
  if (autoplay && built.frames.length > 1) play()
  else if (!autoplay) session.frame = Math.max(0, built.frames.length - 1)
}

const SPEEDS = [1, 2, 3, 5, 8, 12, 20, 35, 60, 120]
let raf = 0
let last = 0
let carry = 0

function tick(t) {
  if (!session.playing) return
  const trace = session.trace
  if (!trace || session.frame >= trace.frames.length - 1) {
    session.playing = false
    return
  }
  const fps = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, prefs.speed - 1))]
  carry += ((t - last) / 1000) * fps
  last = t
  const steps = Math.floor(carry)
  if (steps > 0) {
    carry -= steps
    session.frame = Math.min(trace.frames.length - 1, session.frame + steps)
  }
  raf = requestAnimationFrame(tick)
}

export function play() {
  const trace = session.trace
  if (!trace || !trace.frames.length) return
  if (session.frame >= trace.frames.length - 1) session.frame = 0
  session.playing = true
  last = performance.now()
  carry = 0
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(tick)
}

export function pause() {
  session.playing = false
  cancelAnimationFrame(raf)
}

export function step(delta) {
  pause()
  const n = session.trace?.frames.length ?? 0
  session.frame = Math.max(0, Math.min(n - 1, session.frame + delta))
}

export function seek(i) {
  pause()
  const n = session.trace?.frames.length ?? 0
  session.frame = Math.max(0, Math.min(n - 1, i))
}

export function stop() {
  pause()
  if (runner.engine.busy) runner.restart('Stopped.')
}

export function sizesFor(a) {
  const all = a.sizes ?? CUSTOM_SIZES[a.input]
  const limit = state.bench.limit
  return limit ? all.filter((n) => n <= limit) : all
}

export function benchShape(a) {
  if (a.input === 'search') return state.bench.target
  if (a.input === 'number') return 'number'
  return state.bench.shape
}

export function benchKey(a, shape = benchShape(a)) {
  return `${a.id}|${hash(a.code)}|${shape}|${sizesFor(a).join(',')}`
}

export const benchEntry = computed(() => session.bench[benchKey(current.value)] ?? null)

export function analyse(entry, metric = 'steps') {
  if (!entry) return null
  const pts = entry.points.filter((p) => p.ok).map((p) => ({ n: p.n, y: metric === 'ms' ? p.ms : p.steps }))
  return fit(pts)
}

export async function runBench(a = current.value) {
  const shape = benchShape(a)
  const key = benchKey(a, shape)
  const sizes = sizesFor(a)
  const items = sizes.map((n) => {
    const input = buildInput(a, n, {
      shape: a.input === 'array' ? state.bench.shape : 'random',
      target: state.bench.target,
      seed: 11,
      spread: Math.max(99, n * 4),
    })
    return { n: input.kind === 'number' ? input.n : n, input }
  })
  const entry = reactive({ id: a.id, name: a.name, shape, points: [], status: 'running', error: null, sizes })
  session.bench[key] = entry
  const res = await runner.count({ code: a.code, entry: 'algorithm', check: a.check, budget: BUDGET }, items, (p) => entry.points.push(p))
  if (res.cancelled) {
    entry.status = entry.points.length ? 'stopped' : 'error'
    entry.error = res.error?.message ?? 'Stopped.'
    return entry
  }
  if (res.ok === false) {
    entry.status = 'error'
    entry.error = res.error?.message
    return entry
  }
  const lastPoint = entry.points[entry.points.length - 1]
  if (lastPoint && !lastPoint.ok) {
    entry.error = lastPoint.limit
      ? `Stopped at n = ${lastPoint.n.toLocaleString('en-GB')} because it passed ${BUDGET.toLocaleString('en-GB')} steps.`
      : lastPoint.error?.message
    entry.errorLine = lastPoint.error?.line ?? null
  }
  entry.status = 'done'
  return entry
}

export async function runCompare() {
  session.comparing = true
  for (const id of state.compareIds) {
    if (!session.comparing) break
    const a = describe(id)
    if (!a) continue
    const existing = session.bench[benchKey(a)]
    if (existing && existing.status === 'done') continue
    const entry = await runBench(a)
    if (entry.status === 'stopped' || entry.status === 'error') {
      if (entry.error === 'Stopped.') break
    }
  }
  session.comparing = false
}

export function stopAll() {
  session.comparing = false
  stop()
}

export function expectation(a, shape) {
  if (!a.expect) return null
  const e = a.expect[shape] ?? a.expect.default
  return Array.isArray(e) ? e : [e]
}

export function verdict(a, result, shape) {
  if (!result) return null
  const expected = expectation(a, shape)
  const got = result.best.cls.id
  if (!expected) return { tone: 'info', text: null }
  const match = expected.includes(got)
  const exp = classById(expected[0])
  return { tone: match ? 'good' : 'warn', match, expected: exp }
}

let customSeq = 0
export function createCustom({ name, input, check, guess, from }) {
  const id = `my-${Date.now().toString(36)}-${(customSeq++).toString(36)}`
  const base = from ? describe(from) : null
  const algo = {
    id,
    name: name?.trim() || 'My algorithm',
    input: base?.input ?? input,
    check: base ? base.check : check,
    guess: guess || base?.badge || '',
    code: base?.code ?? TEMPLATES[input],
  }
  state.custom.push(algo)
  select(id)
  return algo
}

export function updateCustom(id, patch) {
  const u = state.custom.find((c) => c.id === id)
  if (u) Object.assign(u, patch)
}

export function deleteCustom(id) {
  const i = state.custom.findIndex((c) => c.id === id)
  if (i < 0) return
  state.custom.splice(i, 1)
  state.compareIds = state.compareIds.filter((x) => x !== id)
  if (state.selectedId === id) select(ALGORITHMS[0].id)
}

export function toast(text) {
  const at = Date.now()
  session.toast = { text, at }
  setTimeout(() => {
    if (session.toast?.at === at) session.toast = null
  }, 2200)
}

function encode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))))
}

export async function copyShareLink() {
  const a = current.value
  const data = { v: 1, name: a.name, input: a.input, check: a.check, code: a.code, guess: a.custom ? a.guess : a.badge }
  const url = `${location.origin}${location.pathname}#a=${encode(data)}`
  try {
    await navigator.clipboard.writeText(url)
    toast('Link copied to the clipboard')
  } catch {
    window.prompt('Copy this link', url)
  }
}

export function downloadPython() {
  const a = current.value
  const slug = a.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'algorithm'
  const blob = new Blob([a.code], { type: 'text/x-python' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${slug}.py`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export function applyTheme() {
  const root = document.documentElement
  if (prefs.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = prefs.theme
}

const INPUTS = ['array', 'search', 'number']

export function load() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS) || 'null')
    if (p) for (const k of Object.keys(prefs)) if (k in p && typeof p[k] === typeof prefs[k]) prefs[k] = p[k]
  } catch {}
  applyTheme()
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null')
    if (saved) {
      if (Array.isArray(saved.custom)) {
        state.custom = saved.custom
          .filter((c) => c && typeof c.code === 'string' && INPUTS.includes(c.input))
          .map((c) => ({ id: String(c.id), name: String(c.name || 'My algorithm'), input: c.input, check: c.check || null, guess: c.guess || '', code: c.code }))
      }
      if (saved.edits && typeof saved.edits === 'object') {
        for (const [k, v] of Object.entries(saved.edits)) if (byId(k) && typeof v === 'string') state.edits[k] = v
      }
      if (Array.isArray(saved.compareIds)) state.compareIds = saved.compareIds.filter((id) => describe(id))
      if (saved.selectedId && describe(saved.selectedId)) state.selectedId = saved.selectedId
      if (['visualise', 'complexity', 'compare', 'guide'].includes(saved.tab)) state.tab = saved.tab
    }
  } catch {}

  const shared = location.hash.match(/^#a=(.+)$/)
  if (shared) {
    try {
      const d = decode(shared[1])
      if (typeof d.code === 'string' && INPUTS.includes(d.input)) {
        const existing = state.custom.find((c) => c.code === d.code && c.input === d.input)
        if (existing) state.selectedId = existing.id
        else {
          const id = `my-${Date.now().toString(36)}`
          state.custom.push({ id, name: `${d.name || 'Shared algorithm'}`, input: d.input, check: d.check || null, guess: d.guess || '', code: d.code })
          state.selectedId = id
        }
        toast('Loaded a shared algorithm into My algorithms')
      }
    } catch {}
    history.replaceState(null, '', location.pathname + location.search)
  }

  if (!state.compareIds.length) {
    state.compareIds = ['bubble-sort', 'insertion-sort', 'merge-sort', 'quick-sort']
  }
  select(state.selectedId)
}

let saveTimer = null
watch(
  () => [state.custom, state.edits, state.compareIds, state.selectedId, state.tab],
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE,
          JSON.stringify({ custom: state.custom, edits: state.edits, compareIds: state.compareIds, selectedId: state.selectedId, tab: state.tab }),
        )
      } catch {}
    }, 300)
  },
  { deep: true },
)

watch(
  prefs,
  () => {
    try {
      localStorage.setItem(PREFS, JSON.stringify(prefs))
    } catch {}
    applyTheme()
  },
  { deep: true },
)

export { runner }
