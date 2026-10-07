<script setup>
import { computed } from 'vue'
import LineChart from './LineChart.vue'
import MathText from './MathText.vue'
import { ALGORITHMS } from '../lib/algorithms.js'
import { SHAPES, TARGETS } from '../lib/data.js'
import { PALETTE } from '../lib/palette.js'
import { classById } from '../lib/complexity.js'
import { state, session, current, describe, benchKey, benchShape, analyse, runCompare, stopAll, expectation } from '../lib/store.js'

const input = computed(() => current.value.input)

const candidates = computed(() => {
  const list = [...ALGORITHMS.map((a) => describe(a.id)), ...state.custom.map((c) => describe(c.id))]
  return list.filter((a) => a && a.input === input.value)
})

const chosen = computed(() => candidates.value.filter((a) => state.compareIds.includes(a.id)))

function toggle(id) {
  const i = state.compareIds.indexOf(id)
  if (i >= 0) state.compareIds.splice(i, 1)
  else state.compareIds.push(id)
}

function colourFor(id) {
  const i = candidates.value.findIndex((a) => a.id === id)
  return PALETTE[i % PALETTE.length]
}

const rows = computed(() =>
  chosen.value.map((a) => {
    const entry = session.bench[benchKey(a)] ?? null
    const steps = analyse(entry, 'steps')
    const okPts = entry ? entry.points.filter((p) => p.ok) : []
    const exp = expectation(a, benchShape(a))
    return { a, entry, steps, last: okPts[okPts.length - 1] ?? null, color: colourFor(a.id), expected: exp ? classById(exp[0]) : null }
  }),
)

const series = computed(() =>
  rows.value
    .filter((r) => r.entry)
    .map((r) => ({
      id: r.a.id,
      name: r.a.name,
      color: r.color,
      dots: true,
      label: r.a.name.length > 18 ? `${r.a.name.slice(0, 17)}…` : r.a.name,
      points: r.entry.points
        .filter((p) => p.ok)
        .map((p) => ({ x: p.n, y: state.bench.metric === 'ms' ? p.ms : p.steps, label: state.bench.metric === 'ms' ? `${p.ms.toFixed(3)} ms` : `${p.steps.toLocaleString('en-GB')} steps` })),
    })),
)

const commonN = computed(() => {
  const sets = rows.value.filter((r) => r.entry).map((r) => new Set(r.entry.points.filter((p) => p.ok).map((p) => p.n)))
  if (!sets.length) return null
  const shared = [...sets[0]].filter((n) => sets.every((s) => s.has(n)))
  return shared.length ? Math.max(...shared) : null
})

function stepsAt(r, n) {
  const p = r.entry?.points.find((q) => q.ok && q.n === n)
  return p ? p.steps.toLocaleString('en-GB') : '–'
}

function selectCategory() {
  const cat = current.value.category
  const ids = candidates.value.filter((a) => a.category === cat).map((a) => a.id)
  state.compareIds = [...new Set([...state.compareIds.filter((id) => !candidates.value.some((c) => c.id === id)), ...ids])]
}

function clear() {
  state.compareIds = state.compareIds.filter((id) => !candidates.value.some((c) => c.id === id))
}

const inputName = computed(() => ({ array: 'take a list', search: 'search a sorted list', number: 'take a number n' })[input.value])
</script>

<template>
  <div class="compare">
    <aside class="cmp-list">
      <p class="muted">Algorithms that {{ inputName }}. Tick the ones to race against each other.</p>
      <div class="cmp-actions">
        <button type="button" class="link" @click="selectCategory">Tick all in {{ current.category }}</button>
        <button type="button" class="link" @click="clear">Clear</button>
      </div>
      <label v-for="a in candidates" :key="a.id" class="cmp-item">
        <input type="checkbox" :checked="state.compareIds.includes(a.id)" @change="toggle(a.id)" />
        <i class="swatch-dot" :style="{ background: colourFor(a.id) }" />
        <span>{{ a.name }}</span>
      </label>
    </aside>

    <div class="cmp-main">
      <div class="cx-controls">
        <label v-if="input === 'array'" class="ctl">
          <span>Data</span>
          <select v-model="state.bench.shape">
            <option v-for="s in SHAPES" :key="s.id" :value="s.id">{{ s.label }}</option>
          </select>
        </label>
        <label v-else-if="input === 'search'" class="ctl">
          <span>Target</span>
          <select v-model="state.bench.target">
            <option v-for="t in TARGETS" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </label>
        <div class="segmented compact" role="group" aria-label="Measure">
          <button type="button" :class="{ active: state.bench.metric === 'steps' }" @click="state.bench.metric = 'steps'">Steps</button>
          <button type="button" :class="{ active: state.bench.metric === 'ms' }" @click="state.bench.metric = 'ms'">Time</button>
        </div>
        <label class="check"><input v-model="state.bench.xlog" type="checkbox" /> log n</label>
        <label class="check"><input v-model="state.bench.ylog" type="checkbox" /> log y</label>
        <div class="spacer" />
        <button v-if="session.comparing" type="button" class="btn small" @click="stopAll">Stop</button>
        <button v-else type="button" class="btn primary small" :disabled="!chosen.length" @click="runCompare">Run comparison</button>
      </div>

      <div class="cx-chart">
        <LineChart
          :series="series"
          :xlog="state.bench.xlog"
          :ylog="state.bench.ylog"
          x-label="n"
          :y-label="state.bench.metric === 'ms' ? 'time per run (ms)' : 'lines executed'"
          empty="Tick some algorithms and press Run comparison"
        />
      </div>

      <table class="cx-table cmp-table">
        <thead>
          <tr>
            <th class="left">Algorithm</th>
            <th>Measured</th>
            <th>Expected</th>
            <th>{{ commonN ? `Steps at n = ${commonN.toLocaleString('en-GB')}` : 'Steps' }}</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.a.id">
            <td class="left"><i class="swatch-dot" :style="{ background: r.color }" /> {{ r.a.name }}</td>
            <td><MathText v-if="r.steps" :src="`$${r.steps.best.tex}$`" tag="span" /></td>
            <td><MathText v-if="r.expected" :src="`$${r.expected.tex}$`" tag="span" /></td>
            <td>{{ commonN ? stepsAt(r, commonN) : r.last ? r.last.steps.toLocaleString('en-GB') : '–' }}</td>
            <td class="muted">{{ !r.entry ? 'not run' : r.entry.status === 'running' ? 'running…' : r.entry.error ? 'stopped early' : 'done' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
