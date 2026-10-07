<script setup>
import { ref, computed } from 'vue'
import LineChart from './LineChart.vue'
import MathText from './MathText.vue'
import { CLASSES, SAMPLE_NS, opsAt, humanOps, humanTime } from '../lib/complexity.js'

const T = String.raw
const maxN = ref(20)
const ylog = ref(false)
const shown = ref(new Set(CLASSES.map((c) => c.id)))

function toggle(id) {
  const s = new Set(shown.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  shown.value = s
}

const series = computed(() => {
  const n = maxN.value
  const xs = []
  for (let i = 0; i <= 120; i++) xs.push(1 + ((n - 1) * i) / 120)
  return CLASSES.filter((c) => shown.value.has(c.id)).map((c) => ({
    id: c.id,
    name: c.plain,
    color: c.color,
    label: c.plain,
    width: 2.25,
    points: xs.map((x) => ({ x, y: c.id === 'fact' ? gammaFact(x) : c.g(x), label: humanOps(c.id === 'fact' ? gammaFact(x) : c.g(x)) })),
  }))
})

function gammaFact(x) {
  const lo = Math.floor(x)
  let f = 1
  for (let i = 2; i <= lo; i++) f *= i
  return f * (lo + 1) ** (x - lo)
}

const yDomain = computed(() => {
  if (ylog.value) return null
  const n = maxN.value
  return [0, Math.max(10, n * n * 1.1)]
})

const SPEED = 1e8

const rows = computed(() =>
  CLASSES.map((c) => ({
    c,
    cells: SAMPLE_NS.map((n) => {
      const ops = opsAt(c, n)
      return { ops: humanOps(ops), time: humanTime(ops / SPEED) }
    }),
  })),
)

const nLabel = (n) => (n >= 1e6 ? 'n = 1,000,000' : `n = ${n.toLocaleString('en-GB')}`)

const definitions = [
  {
    title: 'Big O: an upper bound',
    blocks: [
      { m: T`f(n) \in O(g(n)) \iff \exists\, c > 0,\ n_0 \text{ such that } f(n) \le c\,g(n) \text{ for all } n \ge n_0` },
      { p: T`From some point on, $f$ never grows faster than a constant multiple of $g$. Saying bubble sort is $O(n^2)$ means its work is at most $cn^2$ for large enough $n$.` },
    ],
  },
  {
    title: 'Big Omega and Big Theta',
    blocks: [
      { m: T`f(n) \in \Omega(g(n)) \iff \exists\, c > 0,\ n_0 : f(n) \ge c\,g(n) \text{ for all } n \ge n_0` },
      { m: T`f(n) \in \Theta(g(n)) \iff f(n) \in O(g(n)) \text{ and } f(n) \in \Omega(g(n))` },
      { p: T`$\Omega$ is a lower bound and $\Theta$ is a tight bound. Selection sort is $\Theta(n^2)$ because it always does about $\tfrac{1}{2}n^2$ comparisons. People often write $O$ when they mean $\Theta$.` },
    ],
  },
  {
    title: 'Simplifying',
    blocks: [
      { p: 'Keep the fastest-growing term and drop constant factors:' },
      { m: T`3n^2 + 50n + 7 \in O(n^2), \qquad 5\log_2 n + 12 \in O(\log n)` },
      { p: T`Logarithm bases differ only by a constant, since $\log_a n = \frac{\log_b n}{\log_b a}$, so the base is left out.` },
      { p: T`Work done one part after another adds and the larger term wins: $O(n) + O(n^2) = O(n^2)$. Work nested inside a loop multiplies: a loop of $n$ around an $O(\log n)$ body is $O(n \log n)$.` },
    ],
  },
  {
    title: 'Recurrences and the master theorem',
    blocks: [
      { p: T`Divide-and-conquer algorithms split a problem of size $n$ into $a$ parts of size $\frac{n}{b}$ and do $f(n)$ extra work:` },
      { m: T`T(n) = a\,T\!\left(\tfrac{n}{b}\right) + f(n)` },
      { p: T`Compare $f(n)$ with $n^{\log_b a}$. If $f(n)$ is smaller by a polynomial factor, $T(n) = \Theta(n^{\log_b a})$. If they match, $T(n) = \Theta(n^{\log_b a} \log n)$. If $f(n)$ is larger (and regular), $T(n) = \Theta(f(n))$.` },
      { p: T`Merge sort has $a = 2$, $b = 2$ and $f(n) = n = n^{\log_2 2}$, the middle case, so it is $\Theta(n \log n)$. Binary search has $a = 1$, $b = 2$ and $f(n) = 1 = n^0$, also the middle case, giving $\Theta(\log n)$.` },
    ],
  },
  {
    title: 'How this tool measures',
    blocks: [
      { p: 'Your code runs in a real Python interpreter (CPython compiled to WebAssembly) inside the browser. A tracing hook counts every line of your code that executes. That count is a step: a stand-in for the abstract operations that Big O counts.' },
      { p: 'Steps are exactly repeatable, so the fitted curve is clean. Times are real but noisy, and include costs that Big O ignores, such as large-number arithmetic and memory effects. Comparing the two is part of the lesson.' },
      { p: T`The fit tries every class $g$ in turn, finds the best $c$ and $d$ for $\text{steps} \approx c\,g(n) + d$, and keeps the simplest class whose relative error is not clearly beaten by a more complex one. Exponential growth is fitted as $c\,b^n$ with the base $b$ estimated from the data.` },
    ],
  },
]
</script>

<template>
  <div class="guide">
    <section class="guide-chart">
      <div class="cx-controls">
        <label class="ctl">
          <span>n from 1 to</span>
          <input v-model.number="maxN" type="range" min="5" max="100" step="1" />
          <span class="mono val">{{ maxN }}</span>
        </label>
        <label class="check"><input v-model="ylog" type="checkbox" /> log scale</label>
        <div class="class-chips">
          <button
            v-for="c in CLASSES"
            :key="c.id"
            type="button"
            class="var-chip"
            :class="{ off: !shown.has(c.id) }"
            :style="{ '--c': c.color }"
            @click="toggle(c.id)"
          >
            <i />{{ c.plain }}
          </button>
        </div>
      </div>
      <div class="cx-chart">
        <LineChart :series="series" :ylog="ylog" :y-domain="yDomain" x-label="n" y-label="operations" />
      </div>
    </section>

    <section class="guide-body">
      <div class="guide-table">
        <h3>How long would it take?</h3>
        <p class="muted">Operations needed, and the time at a hundred million operations per second, which is roughly what a compiled language manages on one core.</p>
        <table class="cx-table">
          <thead>
            <tr>
              <th class="left">Class</th>
              <th v-for="n in SAMPLE_NS" :key="n">{{ nLabel(n) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.c.id">
              <td class="left">
                <i class="swatch-dot" :style="{ background: r.c.color }" />
                <MathText :src="`$${r.c.tex}$`" tag="span" />
                <span class="muted cls-name">{{ r.c.name }}</span>
              </td>
              <td v-for="(cell, i) in r.cells" :key="i">
                <div class="mono">{{ cell.ops }}</div>
                <div class="muted small">{{ cell.time }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="guide-defs">
        <section v-for="d in definitions" :key="d.title" class="def">
          <h3>{{ d.title }}</h3>
          <template v-for="(b, i) in d.blocks" :key="i">
            <MathText v-if="b.p" :src="b.p" />
            <MathText v-else :src="b.m" display />
          </template>
        </section>
      </div>
    </section>
  </div>
</template>
