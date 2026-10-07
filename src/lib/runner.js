import { reactive } from 'vue'

export const engine = reactive({
  status: 'idle',
  version: '',
  message: '',
  busy: false,
  job: '',
})

let worker = null
let seq = 0
let ready = null
const pending = new Map()
const WATCHDOG_MS = 45000
let watchdog = null

function armWatchdog() {
  clearTimeout(watchdog)
  if (!pending.size) return
  watchdog = setTimeout(() => {
    restart('The run took too long and was stopped. Check for a loop that never ends, or use a smaller input.')
  }, WATCHDOG_MS)
}

function settle(id, fn) {
  const p = pending.get(id)
  if (!p) return
  pending.delete(id)
  fn(p)
  engine.busy = pending.size > 0
  if (!engine.busy) engine.job = ''
  armWatchdog()
}

function onMessage(e) {
  const msg = e.data
  if (msg.type === 'ready') {
    engine.status = 'ready'
    engine.version = msg.version
    engine.message = ''
    ready.resolve()
    return
  }
  if (msg.type === 'fatal') {
    engine.status = 'error'
    engine.message = msg.message
    ready.reject(new Error(msg.message))
    return
  }
  if (msg.type === 'result') settle(msg.id, (p) => p.resolve(msg.data))
  else if (msg.type === 'progress') {
    pending.get(msg.id)?.onPoint?.(msg.point)
    armWatchdog()
  } else if (msg.type === 'done') settle(msg.id, (p) => p.resolve({ done: true }))
  else if (msg.type === 'error') {
    settle(msg.id, (p) => p.resolve({ ok: false, error: { message: msg.message } }))
    if (msg.fatal) restart(msg.message)
  }
}

function boot() {
  let resolve
  let reject
  ready = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  ready.resolve = resolve
  ready.reject = reject
  ready.catch(() => {})
  engine.status = 'loading'
  worker = new Worker(new URL('./py.worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = onMessage
  worker.onerror = (err) => {
    engine.status = 'error'
    engine.message = err.message || 'The Python worker failed to start.'
    ready.reject(new Error(engine.message))
  }
  worker.postMessage({ type: 'init', indexURL: new URL('pyodide/', document.baseURI).href })
}

export function start() {
  if (!worker) boot()
  return ready
}

export function restart(reason = 'Stopped.') {
  clearTimeout(watchdog)
  worker?.terminate()
  worker = null
  for (const [, p] of pending) p.resolve({ ok: false, cancelled: true, error: { message: reason } })
  pending.clear()
  engine.busy = false
  engine.job = ''
  engine.message = reason
  boot()
}

function send(type, body, extra = {}) {
  return new Promise((resolve) => {
    const id = ++seq
    pending.set(id, { resolve, ...extra })
    engine.busy = true
    engine.job = type
    worker.postMessage({ type, id, ...body })
    armWatchdog()
  })
}

export async function trace(payload) {
  await start()
  return send('trace', { payload })
}

export async function count(base, inputs, onPoint) {
  await start()
  return send('count', { base, inputs }, { onPoint })
}
