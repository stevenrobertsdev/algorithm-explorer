<script setup>
import { computed } from 'vue'
import LineChart from './LineChart.vue'
import CodeEditor from './CodeEditor.vue'
import MathText from './MathText.vue'
import { SHAPES, TARGETS } from '../lib/data.js'
import { CLASSES, classById } from '../lib/complexity.js'
import { state, session, current, benchEntry, benchShape, sizesFor, analyse, runBench, verdict, setCode, stop, runner, BUDGET } from '../lib/store.js'

const a = computed(() => current.value)
const entry = computed(() => benchEntry.value)
const metric = computed(() => state.bench.metric)
const running = computed(() => entry.value?.status === 'running')
const result = computed(() => analyse(entry.value, metric.value))
const stepsResult = computed(() => analyse(entry.value, 'steps'))
const shape = computed(() => benchShape(a.value))
const judgement = computed(() => verdict(a.value, stepsResult.value, shape.value))

const allSizes = computed(() => a.value.sizes ?? [])
const okPoints = computed(() => (entry.value?.points ?? []).filter((p) => p.ok))

const measured = computed(() =>
  okPoints.value.map((p) => ({ x: p.n, y: metric.value === 'ms' ? p.ms : p.steps, label: metric.value === 'ms' ? `${p.ms.toFixed(3)} ms` : `${p.steps.toLocaleString('en-GB')} steps` })),
)

function sampleXs(lo, hi) {
  const out = []
  const k = 60
  for (let i = 0; i <= k; i++) {
    const t = i / k
    out.push(state.bench.xlog ? lo * (hi / lo) ** t : lo + (hi - lo) * t)
  }
  return out
}

const series = computed(() => {
  const pts = measured.value
  const out = []
  if (pts.length >= 2 && state.bench.refs) {
    const lastP = pts[pts.length - 1]
    const lo = pts[0].x
    const hi = lastP.x
    const xs = sampleXs(Math.max(lo, 1), hi)
    for (const cls of CLASSES) {
      const g = cls.g
      const gl = g(lastP.x)
      if (!Number.isFinite(gl) || gl <= 0) continue
      const k = lastP.y / gl
      out.push({
        id: `ref-${cls.id}`,
        name: cls.plain,
        reference: true,
        color: cls.color,
        width: 1.25,
        opacity: 0.4,
        label: cls.plain,
        labelAt: 0.62,
        points: xs.map((x) => ({ x, y: k * g(x) })).filter((p) => Number.isFinite(p.y)),
      })
    }
  }
  const r = result.value
  if (r && pts.length >= 3) {
    const xs = sampleXs(Math.max(pts[0].x, 1), pts[pts.length - 1].x)
    out.push({
      id: 'fit',
      name: 'fit',
      reference: true,
      color: r.best.cls.color,
      dashed: true,
      width: 2,
      points: xs.map((x) => ({ x, y: r.best.f(x) })),
    })
  }
  out.push({ id: 'measured', name: a.value.name, color: 'var(--accent)', dots: true, width: 2.5, points: pts })
  return out
})

const fittedRatio = (p) => {
  const r = stepsResult.value
  if (!r) return ''
  const cls = r.best.cls
  const g = cls.id === '2n' && r.best.base ? r.best.base ** p.n : cls.g(p.n)
  if (!Number.isFinite(g) || g <= 0) return ''
  const v = p.steps / g
  return v >= 100 ? Math.round(v).toLocaleString('en-GB') : v.toPrecision(3)
}

const heat = computed(() => {
  const pts = okPoints.value
  return pts.length ? pts[pts.length - 1].lines : {}
})
const heatN = computed(() => okPoints.value.at(-1)?.n ?? null)

const code = computed({ get: () => a.value.code, set: (v) => setCode(v) })

const limitOptions = computed(() => allSizes.value)
const limit = computed({
  get: () => state.bench.limit ?? allSizes.value[allSizes.value.length - 1],
  set: (v) => (state.bench.limit = Number(v) === allSizes.value[allSizes.value.length - 1] ? null : Number(v)),
})

const dataLabel = computed(() => {
  if (a.value.input === 'search') return TARGETS.find((t) => t.id === state.bench.target)?.label.toLowerCase() + ' target'
  if (a.value.input === 'number') return 'growing n'
  return SHAPES.find((s) => s.id === state.bench.shape)?.label.toLowerCase() + ' data'
})

const progress = computed(() => {
  const e = entry.value
  if (!e) return ''
  return `${e.points.length} of ${sizesFor(a.value).length} sizes`
})

const expectedTex = computed(() => judgement.value?.expected?.tex ?? null)
</script>

<template>
  <div class="complexity">
    <div class="cx-controls">
      <label v-if="a.input === 'array'" class="ctl">
        <span>Data</span>
        <select v-model="state.bench.shape">
          <option v-for="s in SHAPES" :key="s.id" :value="s.id">{{ s.label }}</option>
        </select>
      </label>
      <label v-else-if="a.input === 'search'" class="ctl">
        <span>Target</span>
        <select v-model="state.bench.target">
          <option v-for="t in TARGETS" :key="t.id" :value="t.id">{{ t.label }}</option>
        </select>
      </label>
      <label class="ctl">
        <span>Max n</span>
        <select v-model="limit">
          <option v-for="n in limitOptions" :key="n" :value="n">{{ n.toLocaleString('en-GB') }}</option>
        </select>
      </label>
      <div class="segmented compact" role="group" aria-label="Measure">
        <button type="button" :class="{ active: metric === 'steps' }" @click="state.bench.metric = 'steps'">Steps</button>
        <button type="button" :class="{ active: metric === 'ms' }" @click="state.bench.metric = 'ms'">Time</button>
      </div>
      <label class="check"><input v-model="state.bench.xlog" type="checkbox" /> log n</label>
      <label class="check"><input v-model="state.bench.ylog" type="checkbox" /> log y</label>
      <label class="check" title="Every class scaled to meet the last measured point"><input v-model="state.bench.refs" type="checkbox" /> References</label>
      <div class="spacer" />
      <span v-if="running" class="muted"><span class="spinner" /> {{ progress }}</span>
      <button v-if="running" type="button" class="btn small" @click="stop">Stop</button>
      <button v-else type="button" class="btn primary small" :disabled="runner.engine.status !== 'ready'" @click="runBench()">
        {{ entry ? 'Run again' : 'Measure growth' }}
      </button>
    </div>

    <div class="cx-summary" :class="judgement?.tone">
      <template v-if="stepsResult">
        <div class="cx-fit">
          <span class="muted">Measured</span>
          <MathText :src="`$${stepsResult.best.tex}$`" tag="span" class="cx-big" :style="{ color: stepsResult.best.cls.color }" />
        </div>
        <div class="cx-detail">
          <MathText
            v-if="stepsResult.slope !== null && stepsResult.best.cls.id !== '2n' && stepsResult.best.cls.id !== 'fact'"
            :src="`On a log–log plot the last points rise with slope $\\approx ${stepsResult.slope.toFixed(2)}$, so steps grow like $n^{${stepsResult.slope.toFixed(2)}}$ there.`"
            tag="span"
          />
          <MathText v-else-if="stepsResult.best.base" :src="`Each extra 1 in $n$ multiplies the steps by about $${stepsResult.best.base.toFixed(2)}$.`" tag="span" />
          <template v-if="judgement && judgement.expected">
            <MathText
              v-if="judgement.match"
              :src="`This matches the expected $${expectedTex}$ for ${dataLabel}.`"
              tag="span"
              class="good-text"
            />
            <MathText
              v-else
              :src="`The expected class for ${dataLabel} is $${expectedTex}$. Try more sizes, or check what the code does differently.`"
              tag="span"
              class="warn-text"
            />
          </template>
          <span v-else-if="a.custom" class="muted">Set your guess in the side panel to have it checked.</span>
        </div>
      </template>
      <template v-else-if="running">
        <span class="muted">Running the code at each size and counting the lines it executes…</span>
      </template>
      <template v-else-if="entry && entry.status === 'error'">
        <span class="warn-text">{{ entry.error }}</span>
      </template>
      <template v-else>
        <span class="muted">Measure growth runs the code at {{ sizesFor(a).length }} sizes, counts every line it executes, and fits the counts against each complexity class.</span>
      </template>
      <span v-if="entry && entry.error && entry.status !== 'error'" class="warn-text small">{{ entry.error }}</span>
    </div>

    <div class="cx-chart">
      <LineChart
        :series="series"
        :xlog="state.bench.xlog"
        :ylog="state.bench.ylog"
        :x-label="a.input === 'number' ? 'n (input value)' : 'n (input size)'"
        :y-label="metric === 'ms' ? 'time per run (ms)' : 'lines executed'"
        :y-min-zero="true"
        empty="Press Measure growth to plot how the work grows with n"
      />
    </div>

    <div class="cx-bottom">
      <div class="cx-table-wrap">
        <table class="cx-table">
          <thead>
            <tr>
              <th>n</th>
              <th>Steps</th>
              <th>Time</th>
              <th v-if="stepsResult" :title="`Steps divided by the fitted class. It levels off at the hidden constant.`">
                <MathText :src="`$\\text{steps} \\div ${stepsResult.best.cls.id === '2n' && stepsResult.best.base ? `${stepsResult.best.base.toFixed(2)}^n` : stepsResult.best.tex.slice(2, -1)}$`" tag="span" />
              </th>
              <th>Calls</th>
              <th v-if="a.check">Correct</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in entry?.points ?? []" :key="p.n" :class="{ bad: !p.ok }">
              <td>{{ p.n.toLocaleString('en-GB') }}</td>
              <td>{{ p.ok ? p.steps.toLocaleString('en-GB') : p.limit ? `> ${BUDGET.toLocaleString('en-GB')}` : 'error' }}</td>
              <td>{{ p.ok ? `${p.ms < 1 ? p.ms.toFixed(3) : p.ms.toFixed(1)} ms` : '' }}</td>
              <td v-if="stepsResult">{{ p.ok ? fittedRatio(p) : '' }}</td>
              <td>{{ p.ok ? p.calls.toLocaleString('en-GB') : '' }}</td>
              <td v-if="a.check">{{ p.correct === true ? '✓' : p.correct === false ? '✗' : '' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!entry" class="empty">Results appear here, one row per size.</p>
      </div>
      <div class="cx-code">
        <div class="pane-head">
          <span class="pane-title">Line counts</span>
          <span class="muted">{{ heatN !== null ? `How often each line ran at n = ${heatN.toLocaleString('en-GB')}. The busiest line sets the growth rate.` : 'Run a measurement to see which lines do the work.' }}</span>
        </div>
        <CodeEditor v-model="code" :counts="heat" :follow="false" />
      </div>
    </div>
  </div>
</template>
