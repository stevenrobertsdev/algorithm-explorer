import harness from '../python/harness.py?raw'

let py = null
let runTrace = null
let runCount = null

self.onmessage = async (e) => {
  const msg = e.data
  if (msg.type === 'init') {
    try {
      const { loadPyodide } = await import(`${msg.indexURL}pyodide.mjs`)
      py = await loadPyodide({ indexURL: msg.indexURL })
      py.runPython(harness)
      runTrace = py.globals.get('run_trace')
      runCount = py.globals.get('run_count')
      self.postMessage({ type: 'ready', version: py.version })
    } catch (err) {
      self.postMessage({ type: 'fatal', message: String(err?.message ?? err) })
    }
    return
  }
  if (!py) {
    self.postMessage({ type: 'error', id: msg.id, message: 'Python is not ready yet.' })
    return
  }
  try {
    if (msg.type === 'trace') {
      const data = JSON.parse(runTrace(JSON.stringify(msg.payload)))
      self.postMessage({ type: 'result', id: msg.id, data })
    } else if (msg.type === 'count') {
      for (const item of msg.inputs) {
        const point = JSON.parse(runCount(JSON.stringify({ ...msg.base, n: item.n, input: item.input })))
        self.postMessage({ type: 'progress', id: msg.id, point })
        if (!point.ok) break
      }
      self.postMessage({ type: 'done', id: msg.id })
    }
  } catch (err) {
    const text = String(err?.message ?? err)
    const fatal = err instanceof RangeError || /call stack|fatal/i.test(text)
    self.postMessage({
      type: 'error',
      id: msg.id,
      fatal,
      message: fatal ? 'The browser ran out of stack space, usually because the recursion went too deep. Python has been restarted.' : text,
    })
  }
}
