<script setup>
import { ref, computed, onMounted, onBeforeUnmount, useId } from 'vue'

const props = defineProps({
  series: { type: Array, default: () => [] },
  xlog: { type: Boolean, default: false },
  ylog: { type: Boolean, default: false },
  xLabel: { type: String, default: '' },
  yLabel: { type: String, default: '' },
  yMinZero: { type: Boolean, default: true },
  xDomain: { type: Array, default: null },
  yDomain: { type: Array, default: null },
  empty: { type: String, default: 'No data yet' },
})

const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
const wrap = ref(null)
const W = ref(600)
const H = ref(360)
const pad = { l: 64, r: 74, t: 16, b: 42 }

const all = computed(() => props.series.flatMap((s) => s.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))))
const dataSeries = computed(() => props.series.filter((s) => !s.reference))

function extent(vals, log, zero) {
  const v = log ? vals.filter((x) => x > 0) : vals
  if (!v.length) return [log ? 1 : 0, log ? 10 : 1]
  let lo = Math.min(...v)
  let hi = Math.max(...v)
  if (!log && zero) lo = Math.min(0, lo)
  if (lo === hi) {
    if (log) {
      lo /= 2
      hi *= 2
    } else {
      hi = lo + 1
      if (!zero) lo -= 1
    }
  }
  return [lo, hi]
}

const xd = computed(() => props.xDomain ?? extent(all.value.map((p) => p.x), props.xlog, false))
const yd = computed(() => {
  if (props.yDomain) return props.yDomain
  const pts = dataSeries.value.flatMap((s) => s.points).filter((p) => Number.isFinite(p.y))
  const base = pts.length ? pts : all.value
  const [lo, hi] = extent(base.map((p) => p.y), props.ylog, props.yMinZero)
  return props.ylog ? [lo, hi * 1.15] : [lo, hi * 1.08]
})

const innerW = computed(() => Math.max(10, W.value - pad.l - pad.r))
const innerH = computed(() => Math.max(10, H.value - pad.t - pad.b))

function scaler(domain, log, size, flip) {
  const [a, b] = log ? domain.map((v) => Math.log10(Math.max(v, 1e-12))) : domain
  return (v) => {
    const t = log ? Math.log10(Math.max(v, 1e-12)) : v
    const f = b === a ? 0.5 : (t - a) / (b - a)
    return flip ? size * (1 - f) : size * f
  }
}
const X = computed(() => scaler(xd.value, props.xlog, innerW.value, false))
const Y = computed(() => scaler(yd.value, props.ylog, innerH.value, true))

function niceTicks(lo, hi, count) {
  const span = hi - lo
  if (span <= 0) return [lo]
  const raw = span / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag
  const out = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.round(v / step) * step)
  return out
}

function logTicks(lo, hi) {
  const out = []
  const a = Math.floor(Math.log10(lo))
  const b = Math.ceil(Math.log10(hi))
  for (let e = a; e <= b; e++) {
    for (const m of b - a <= 2 ? [1, 2, 5] : [1]) {
      const v = m * 10 ** e
      if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v)
    }
  }
  return out
}

const xTicks = computed(() => (props.xlog ? logTicks(...xd.value) : niceTicks(...xd.value, Math.max(3, Math.floor(innerW.value / 90)))))
const yTicks = computed(() => (props.ylog ? logTicks(...yd.value) : niceTicks(...yd.value, Math.max(3, Math.floor(innerH.value / 50)))))

function compact(v) {
  const a = Math.abs(v)
  if (a >= 1e9) return `${+(v / 1e9).toPrecision(3)}B`
  if (a >= 1e6) return `${+(v / 1e6).toPrecision(3)}M`
  if (a >= 1e4) return `${+(v / 1e3).toPrecision(3)}k`
  if (a >= 100 || Number.isInteger(v)) return String(Math.round(v))
  return String(+v.toPrecision(3))
}

const paths = computed(() =>
  props.series.map((s) => {
    const pts = s.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && (!props.ylog || p.y > 0) && (!props.xlog || p.x > 0))
    const lim = innerH.value * 3
    const d = pts
      .map((p, i) => `${i ? 'L' : 'M'}${X.value(p.x).toFixed(1)},${Math.max(-lim, Math.min(innerH.value + lim, Y.value(p.y))).toFixed(1)}`)
      .join('')
    let label = null
    if (s.label) {
      const visible = pts.filter((p) => {
        const y = Y.value(p.y)
        return y >= 0 && y <= innerH.value
      })
      const end = s.labelAt !== undefined ? visible[Math.min(visible.length - 1, Math.floor(s.labelAt * pts.length))] : visible[visible.length - 1]
      if (end) label = { x: X.value(end.x) + 6, y: Y.value(end.y) + 4, text: s.label }
    }
    return { s, d, pts, label }
  }),
)

const hoverX = ref(null)
const hover = computed(() => {
  if (hoverX.value === null) return null
  const xs = [...new Set(dataSeries.value.flatMap((s) => s.points.map((p) => p.x)))]
  if (!xs.length) return null
  let best = xs[0]
  for (const x of xs) if (Math.abs(X.value(x) - hoverX.value) < Math.abs(X.value(best) - hoverX.value)) best = x
  const rows = dataSeries.value
    .map((s) => ({ s, p: s.points.find((p) => p.x === best) }))
    .filter((r) => r.p)
  return { x: best, px: X.value(best), rows }
})

function onMove(e) {
  const r = e.currentTarget.getBoundingClientRect()
  hoverX.value = e.clientX - r.left - pad.l
}

let ro
onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    W.value = Math.max(200, entry.contentRect.width)
    H.value = Math.max(160, entry.contentRect.height)
  })
  ro.observe(wrap.value)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div ref="wrap" class="line-chart">
    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" @pointermove="onMove" @pointerleave="hoverX = null">
      <defs>
        <clipPath :id="`clip${uid}`">
          <rect x="0" y="-4" :width="innerW + 8" :height="innerH + 8" />
        </clipPath>
      </defs>
      <g :transform="`translate(${pad.l},${pad.t})`">
        <g class="chart-grid">
          <line v-for="t in yTicks" :key="'gy' + t" x1="0" :x2="innerW" :y1="Y(t)" :y2="Y(t)" />
          <line v-for="t in xTicks" :key="'gx' + t" :x1="X(t)" :x2="X(t)" y1="0" :y2="innerH" />
        </g>
        <g class="chart-axis">
          <line x1="0" :x2="innerW" :y1="innerH" :y2="innerH" />
          <line x1="0" x2="0" y1="0" :y2="innerH" />
        </g>
        <g class="chart-ticks">
          <text v-for="t in yTicks" :key="'ty' + t" x="-8" :y="Y(t) + 4" text-anchor="end">{{ compact(t) }}</text>
          <text v-for="t in xTicks" :key="'tx' + t" :x="X(t)" :y="innerH + 17" text-anchor="middle">{{ compact(t) }}</text>
        </g>
        <text v-if="xLabel" class="chart-label" :x="innerW / 2" :y="innerH + 36" text-anchor="middle">{{ xLabel }}</text>
        <text v-if="yLabel" class="chart-label" :transform="`translate(${-50},${innerH / 2}) rotate(-90)`" text-anchor="middle">{{ yLabel }}</text>

        <g :clip-path="`url(#clip${uid})`">
          <template v-for="(p, i) in paths" :key="i">
            <path
              v-if="p.d"
              :d="p.d"
              fill="none"
              :stroke="p.s.color"
              :stroke-width="p.s.width ?? 2.25"
              :stroke-dasharray="p.s.dashed ? '6 5' : null"
              :opacity="p.s.opacity ?? 1"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            <template v-if="p.s.dots">
              <circle
                v-for="(pt, j) in p.pts"
                :key="j"
                :cx="X(pt.x)"
                :cy="Y(pt.y)"
                :r="pt.bad ? 5 : 3.5"
                :fill="pt.bad ? 'var(--surface)' : p.s.color"
                :stroke="pt.bad ? 'var(--danger)' : 'var(--surface)'"
                stroke-width="1.5"
              />
            </template>
          </template>
        </g>
        <g class="chart-series-labels">
          <template v-for="(p, i) in paths" :key="'l' + i">
            <text v-if="p.label" :x="p.label.x" :y="p.label.y" :fill="p.s.color" :opacity="p.s.reference ? 0.85 : 1">{{ p.label.text }}</text>
          </template>
        </g>

        <g v-if="hover" class="chart-hover">
          <line :x1="hover.px" :x2="hover.px" y1="0" :y2="innerH" />
          <circle v-for="(r, i) in hover.rows" :key="i" :cx="hover.px" :cy="Y(r.p.y)" r="4.5" :fill="r.s.color" stroke="var(--surface)" stroke-width="2" />
        </g>
      </g>
    </svg>
    <div v-if="hover && hover.rows.length" class="chart-tip" :style="{ left: `${Math.min(W - 190, pad.l + hover.px + 12)}px` }">
      <div class="tip-head">n = {{ hover.x.toLocaleString('en-GB') }}</div>
      <div v-for="(r, i) in hover.rows" :key="i" class="tip-row">
        <i :style="{ background: r.s.color }" />
        <span class="tip-name">{{ r.s.name }}</span>
        <span class="tip-val">{{ r.p.label ?? Math.round(r.p.y).toLocaleString('en-GB') }}</span>
      </div>
    </div>
    <p v-if="!dataSeries.some((s) => s.points.length)" class="chart-empty">{{ empty }}</p>
  </div>
</template>
