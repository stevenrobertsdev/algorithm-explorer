<script setup>
import { ref, computed, watch } from 'vue'
import CodeEditor from './CodeEditor.vue'
import ArrayBars from './ArrayBars.vue'
import CallTree from './CallTree.vue'
import LineChart from './LineChart.vue'
import { SHAPES, TARGETS } from '../lib/data.js'
import { PALETTE } from '../lib/palette.js'
import {
  state,
  prefs,
  session,
  current,
  codeChanged,
  setCode,
  runTrace,
  play,
  pause,
  step,
  seek,
  stop,
  runner,
} from '../lib/store.js'

const trace = computed(() => session.trace)
const frames = computed(() => trace.value?.frames ?? [])
const frame = computed(() => frames.value[session.frame] ?? null)
const last = computed(() => session.frame >= frames.value.length - 1)
const isArray = computed(() => current.value.input !== 'number')
const hasCalls = computed(() => (trace.value?.nodes.length ?? 0) > 1)

const view = computed(() => {
  const v = state.visual.view
  if (v !== 'auto') return v
  if (isArray.value) return 'data'
  return hasCalls.value ? 'tree' : 'vars'
})

const views = computed(() => {
  const out = []
  if (isArray.value) out.push({ id: 'data', label: 'Data' })
  out.push({ id: 'tree', label: 'Call tree' })
  out.push({ id: 'vars', label: 'Variables' })
  return out
})

const pointers = computed(() => {
  const f = frame.value
  if (!f || !isArray.value) return []
  const names = current.value.pointers ?? []
  const n = f.arr?.length ?? 0
  const out = []
  for (const name of names) {
    const v = f.after[name]
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= n) out.push({ name, index: v })
  }
  return out
})

const counts = computed(() => {
  const out = {}
  const fs = frames.value
  const end = Math.min(session.frame, fs.length - 1)
  for (let i = 0; i <= end; i++) out[fs[i].line] = (out[fs[i].line] ?? 0) + 1
  return out
})

const stats = computed(() => {
  const fs = frames.value
  let reads = 0
  let writes = 0
  const end = Math.min(session.frame, fs.length - 1)
  for (let i = 0; i <= end; i++) {
    reads += fs[i].reads.length
    writes += fs[i].writes.length
  }
  const calls = trace.value ? trace.value.nodes.filter((n) => n.start <= session.frame).length : 0
  return { steps: end + 1, reads, writes, calls }
})

const finished = computed(() => last.value && trace.value && !trace.value.raw.truncated && trace.value.raw.ok)
const correct = computed(() => (finished.value ? trace.value.raw.correct : null))

const prevLocals = computed(() => frames.value[session.frame - 1]?.after ?? {})
const locals = computed(() => {
  const f = frame.value
  if (!f) return []
  return Object.entries(f.after).map(([k, v]) => ({
    k,
    v: v === '@arr' ? 'the list (shown above)' : v === null ? 'None' : v === true ? 'True' : v === false ? 'False' : String(v),
    changed: session.frame > 0 && JSON.stringify(prevLocals.value[k]) !== JSON.stringify(v),
  }))
})

const stack = computed(() => {
  const f = frame.value
  if (!f || !trace.value) return []
  return f.stack.map((id) => trace.value.nodes[id]).filter(Boolean).reverse()
})

const output = computed(() => (trace.value && frame.value ? trace.value.output.slice(0, frame.value.out) : ''))

const hidden = ref(new Set())
watch(
  () => trace.value,
  () => {
    hidden.value = new Set()
    const fs = frames.value
    if (!fs.length) return
    const n = Math.abs(trace.value.input?.n ?? 10)
    const ranges = {}
    for (const f of fs) {
      for (const [k, v] of Object.entries(f.after)) {
        if (typeof v === 'number') ranges[k] = Math.max(ranges[k] ?? 0, Math.abs(v))
      }
    }
    for (const [k, r] of Object.entries(ranges)) if (r > Math.max(1000, n * 1000)) hidden.value.add(k)
  },
)

const varSeries = computed(() => {
  const fs = frames.value
  if (!fs.length) return []
  const names = []
  for (const f of fs) for (const [k, v] of Object.entries(f.after)) if (typeof v === 'number' && !names.includes(k)) names.push(k)
  const end = Math.min(session.frame, fs.length - 1)
  return names.map((name, i) => ({
    id: name,
    name,
    color: PALETTE[i % PALETTE.length],
    hidden: hidden.value.has(name),
    dots: false,
    label: name,
    points: hidden.value.has(name)
      ? []
      : fs
          .slice(0, end + 1)
          .map((f, j) => ({ x: j + 1, y: f.after[name] }))
          .filter((p) => typeof p.y === 'number'),
  }))
})

function toggleVar(name) {
  const s = new Set(hidden.value)
  if (s.has(name)) s.delete(name)
  else s.add(name)
  hidden.value = s
}

const errorLine = computed(() => (session.traceError && !codeChanged.value ? session.traceError.line : null))
const currentLine = computed(() => (frame.value && !codeChanged.value ? frame.value.line : null))

const tab = ref('vars')

const code = computed({
  get: () => current.value.code,
  set: (v) => setCode(v),
})

function shuffle() {
  state.visual.list = ''
  state.visual.seed = Math.floor(Math.random() * 1e6)
  runTrace(false)
}

function changeData() {
  runTrace(false)
}

let listTimer = null
function onList(e) {
  state.visual.list = e.target.value
  clearTimeout(listTimer)
  listTimer = setTimeout(() => runTrace(false), 500)
}

const busy = computed(() => session.tracing)
</script>

<template>
  <div class="visualise">
    <section class="vis-top">
      <div class="vis-controls">
        <template v-if="current.input !== 'number'">
          <label class="ctl">
            <span>Size</span>
            <input v-model.number="state.visual.n" type="range" min="2" max="64" step="1" :disabled="!!state.visual.list.trim()" @change="changeData" />
            <span class="mono val">{{ state.visual.n }}</span>
          </label>
          <label v-if="current.input === 'array'" class="ctl">
            <span>Data</span>
            <select v-model="state.visual.shape" :disabled="!!state.visual.list.trim()" @change="changeData">
              <option v-for="s in SHAPES" :key="s.id" :value="s.id">{{ s.label }}</option>
            </select>
          </label>
          <label v-else class="ctl">
            <span>Target</span>
            <select v-model="state.visual.target" @change="changeData">
              <option v-for="t in TARGETS" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
          </label>
          <button type="button" class="btn small" title="New random data" :disabled="!!state.visual.list.trim()" @click="shuffle">Shuffle</button>
          <input
            class="list-input"
            type="text"
            :value="state.visual.list"
            placeholder="or type your own: 5, 3, 8, 1"
            spellcheck="false"
            @input="onList"
          />
        </template>
        <template v-else>
          <label class="ctl">
            <span>n</span>
            <input
              class="num-input"
              type="number"
              min="0"
              :value="state.visual.number ?? current.visualN ?? 10"
              @change="state.visual.number = Number($event.target.value) || 0; changeData()"
            />
          </label>
          <button type="button" class="btn small" @click="state.visual.number = Math.max(0, (state.visual.number ?? current.visualN ?? 10) - 1); changeData()">−1</button>
          <button type="button" class="btn small" @click="state.visual.number = (state.visual.number ?? current.visualN ?? 10) + 1; changeData()">+1</button>
        </template>
        <span v-if="session.listError" class="ctl-error">{{ session.listError }}</span>
        <div class="segmented compact view-switch" role="group" aria-label="View">
          <button
            v-for="v in views"
            :key="v.id"
            type="button"
            :class="{ active: view === v.id }"
            @click="state.visual.view = v.id"
          >
            {{ v.label }}
          </button>
        </div>
      </div>

      <div class="vis-stage">
        <template v-if="frame">
          <ArrayBars
            v-if="view === 'data' && frame.arr"
            :values="frame.arr"
            :reads="frame.reads"
            :writes="frame.writes"
            :pointers="pointers"
            :target="trace.input.kind === 'search' ? trace.input.target : null"
            :done="!!(finished && correct)"
          />
          <CallTree v-else-if="view === 'tree'" :nodes="trace.nodes" :frame="frame" :index="session.frame" />
          <div v-else-if="view === 'vars'" class="vars-view">
            <div class="var-chips">
              <button
                v-for="s in varSeries"
                :key="s.id"
                type="button"
                class="var-chip"
                :class="{ off: s.hidden }"
                :style="{ '--c': s.color }"
                @click="toggleVar(s.id)"
              >
                <i />{{ s.name }}
              </button>
            </div>
            <LineChart :series="varSeries.filter((s) => !s.hidden)" x-label="step" y-label="value" :y-min-zero="false" empty="No number variables to plot" />
          </div>
        </template>
        <div v-else class="stage-empty">
          <template v-if="busy || runner.engine.status === 'loading'">
            <span class="spinner" />
            {{ runner.engine.status === 'loading' ? 'Starting Python… the first load takes a few seconds.' : 'Running…' }}
          </template>
          <template v-else-if="session.traceError">
            <strong>It did not run.</strong>
            <span class="mono">{{ session.traceError.message }}</span>
          </template>
          <template v-else>Press Run to trace this algorithm.</template>
        </div>
        <div v-if="frame && session.traceError && last" class="stage-banner error">
          <strong>Error{{ session.traceError.line ? ` on line ${session.traceError.line}` : '' }}:</strong>
          <span class="mono">{{ session.traceError.message }}</span>
        </div>
        <div v-else-if="trace && trace.raw.truncated && last" class="stage-banner warn">
          Stopped after {{ frames.length.toLocaleString('en-GB') }} steps, the most the visualiser keeps. Use a smaller input to see the whole run.
        </div>
        <div v-else-if="codeChanged" class="stage-banner info">
          The code has changed since this run. Press Run (Ctrl+Enter) to trace the new version.
        </div>
      </div>

      <div class="playback">
        <button type="button" class="btn primary small run-btn" :disabled="busy" @click="runTrace(true)">
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 3l9 5-9 5z" fill="currentColor" /></svg>
          Run
        </button>
        <button v-if="busy" type="button" class="btn small" @click="stop">Stop</button>
        <div class="transport" role="group" aria-label="Playback">
          <button type="button" class="icon-btn" title="First step (Home)" aria-label="First step" :disabled="!frames.length" @click="seek(0)">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 3v10M13 3L6 8l7 5z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" /></svg>
          </button>
          <button type="button" class="icon-btn" title="Back one step (←)" aria-label="Back one step" :disabled="!frames.length" @click="step(-1)">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M11 3L5 8l6 5z" fill="currentColor" /></svg>
          </button>
          <button type="button" class="icon-btn play" :title="session.playing ? 'Pause (space)' : 'Play (space)'" :aria-label="session.playing ? 'Pause' : 'Play'" :disabled="!frames.length" @click="session.playing ? pause() : play()">
            <svg v-if="!session.playing" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M4.5 3v10l8.5-5z" fill="currentColor" /></svg>
            <svg v-else viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx="0.8" fill="currentColor" /><rect x="9" y="3" width="3" height="10" rx="0.8" fill="currentColor" /></svg>
          </button>
          <button type="button" class="icon-btn" title="Forward one step (→)" aria-label="Forward one step" :disabled="!frames.length" @click="step(1)">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 3l6 5-6 5z" fill="currentColor" /></svg>
          </button>
          <button type="button" class="icon-btn" title="Last step (End)" aria-label="Last step" :disabled="!frames.length" @click="seek(frames.length - 1)">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M12 3v10M3 3l7 5-7 5z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" /></svg>
          </button>
        </div>
        <input
          class="scrubber"
          type="range"
          min="0"
          :max="Math.max(0, frames.length - 1)"
          :value="session.frame"
          :disabled="!frames.length"
          aria-label="Step"
          @input="seek(Number($event.target.value))"
        />
        <span class="mono step-count">{{ frames.length ? `${(session.frame + 1).toLocaleString('en-GB')} / ${frames.length.toLocaleString('en-GB')}` : '0 / 0' }}</span>
        <label class="speed" title="Playback speed">
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M2.5 11a5.5 5.5 0 1 1 11 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /><path d="M8 11l3-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
          <input v-model.number="prefs.speed" type="range" min="1" max="10" step="1" aria-label="Speed" />
        </label>
      </div>
    </section>

    <section class="vis-bottom">
      <div class="editor-pane">
        <div class="pane-head">
          <span class="pane-title">Code</span>
          <span class="muted">Numbers in the gutter count how often each line has run so far.</span>
        </div>
        <CodeEditor v-model="code" :current-line="currentLine" :error-line="errorLine" :counts="codeChanged ? {} : counts" @run="runTrace(true)" />
      </div>
      <div class="state-pane">
        <div class="stat-row">
          <div class="stat"><span>Steps</span><b class="mono">{{ stats.steps.toLocaleString('en-GB') }}</b></div>
          <div v-if="isArray" class="stat"><span>Reads</span><b class="mono read">{{ stats.reads.toLocaleString('en-GB') }}</b></div>
          <div v-if="isArray" class="stat"><span>Writes</span><b class="mono write">{{ stats.writes.toLocaleString('en-GB') }}</b></div>
          <div class="stat"><span>Calls</span><b class="mono">{{ stats.calls.toLocaleString('en-GB') }}</b></div>
        </div>
        <div v-if="finished" class="result-row">
          <span v-if="correct === true" class="chip good">{{ current.check === 'search' ? 'Correct position' : 'Sorted correctly' }}</span>
          <span v-else-if="correct === false" class="chip bad">{{ current.check === 'search' ? 'Wrong answer' : 'Not sorted' }}</span>
          <span class="muted">returned</span>
          <code class="result">{{ trace.raw.result === null ? 'None' : String(trace.raw.result) }}</code>
        </div>
        <nav class="tabs small" role="tablist">
          <button type="button" role="tab" :class="{ active: tab === 'vars' }" :aria-selected="tab === 'vars'" @click="tab = 'vars'">Variables</button>
          <button type="button" role="tab" :class="{ active: tab === 'stack' }" :aria-selected="tab === 'stack'" @click="tab = 'stack'">Call stack<span v-if="stack.length > 1" class="count">{{ stack.length }}</span></button>
          <button type="button" role="tab" :class="{ active: tab === 'out' }" :aria-selected="tab === 'out'" @click="tab = 'out'">Output</button>
        </nav>
        <div class="state-body">
          <table v-if="tab === 'vars'" class="locals">
            <tr v-for="l in locals" :key="l.k" :class="{ changed: l.changed }">
              <td class="mono name">{{ l.k }}</td>
              <td class="mono">{{ l.v }}</td>
            </tr>
            <tr v-if="!locals.length"><td class="muted" colspan="2">No local variables yet.</td></tr>
          </table>
          <ol v-else-if="tab === 'stack'" class="stack-list">
            <li v-for="(n, i) in stack" :key="n.id" :class="{ top: i === 0 }" class="mono">{{ n.name }}({{ n.args }})</li>
            <li v-if="!stack.length" class="muted">Empty.</li>
          </ol>
          <pre v-else class="output">{{ output || 'Nothing printed yet. Use print() in your code to write here.' }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>
