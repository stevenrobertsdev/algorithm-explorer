<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  values: { type: Array, default: () => [] },
  reads: { type: Array, default: () => [] },
  writes: { type: Array, default: () => [] },
  pointers: { type: Array, default: () => [] },
  target: { type: Number, default: null },
  done: { type: Boolean, default: false },
})

const wrap = ref(null)
const W = ref(600)
const H = ref(260)

const nums = computed(() => props.values.map((v) => (typeof v === 'number' ? v : Number(v) || 0)))
const lo = computed(() => Math.min(0, ...nums.value, props.target ?? 0))
const hi = computed(() => Math.max(1, ...nums.value, props.target ?? 0))

const pointerRows = computed(() => {
  const byIndex = new Map()
  for (const p of props.pointers) {
    const list = byIndex.get(p.index) ?? []
    list.push(p.name)
    byIndex.set(p.index, list)
  }
  return Math.max(0, ...[...byIndex.values()].map((l) => l.length))
})

const padTop = 22
const padSide = 12
const labelH = computed(() => (barW.value >= 14 ? 16 : 0))
const pointerH = computed(() => pointerRows.value * 15 + (pointerRows.value ? 6 : 0))
const plotH = computed(() => Math.max(40, H.value - padTop - labelH.value - pointerH.value - 8))
const barW = computed(() => (W.value - padSide * 2) / Math.max(1, props.values.length))
const sy = (v) => padTop + ((hi.value - v) / (hi.value - lo.value)) * plotH.value
const base = computed(() => sy(0))

const readSet = computed(() => new Set(props.reads))
const writeSet = computed(() => new Set(props.writes))

const bars = computed(() =>
  nums.value.map((v, i) => {
    const x = padSide + i * barW.value
    const y0 = base.value
    const y1 = sy(v)
    const state = props.done ? 'done' : writeSet.value.has(i) ? 'write' : readSet.value.has(i) ? 'read' : ''
    return { i, v, raw: props.values[i], x, y: Math.min(y0, y1), h: Math.max(1.5, Math.abs(y1 - y0)), state, top: v >= 0 ? y1 : y1 }
  }),
)

const pointerLabels = computed(() => {
  const grouped = new Map()
  for (const p of props.pointers) {
    if (p.index < 0 || p.index > props.values.length) continue
    const list = grouped.get(p.index) ?? []
    list.push(p.name)
    grouped.set(p.index, list)
  }
  const out = []
  const y0 = padTop + plotH.value + labelH.value + 14
  for (const [index, names] of grouped) {
    names.forEach((name, row) => {
      out.push({ key: `${index}-${name}`, x: padSide + (index + 0.5) * barW.value, y: y0 + row * 15, name, edge: index === props.values.length })
    })
  }
  return out
})

const showValues = computed(() => barW.value >= 22)
const gap = computed(() => (barW.value > 10 ? Math.min(4, barW.value * 0.18) : 1))

let ro
onMounted(() => {
  ro = new ResizeObserver(([e]) => {
    W.value = Math.max(200, e.contentRect.width)
    H.value = Math.max(140, e.contentRect.height)
  })
  ro.observe(wrap.value)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div ref="wrap" class="bars">
    <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="The list being processed">
      <line :x1="padSide" :x2="W - padSide" :y1="base" :y2="base" class="bars-base" />
      <g v-for="b in bars" :key="b.i">
        <rect :x="b.x + gap / 2" :y="b.y" :width="Math.max(1, barW - gap)" :height="b.h" rx="2" :class="['bar', b.state]" />
        <text
          v-if="showValues"
          :x="b.x + barW / 2"
          :y="b.v >= 0 ? b.y - 5 : b.y + b.h + 12"
          text-anchor="middle"
          class="bar-value"
        >{{ b.raw }}</text>
        <text v-if="labelH" :x="b.x + barW / 2" :y="padTop + plotH + 13" text-anchor="middle" class="bar-index">{{ b.i }}</text>
      </g>
      <g v-if="target !== null && target !== undefined">
        <line :x1="padSide" :x2="W - padSide" :y1="sy(target)" :y2="sy(target)" class="target-line" />
        <text :x="padSide + 4" :y="sy(target) - 5" text-anchor="start" class="target-label">target {{ target }}</text>
      </g>
      <g v-for="p in pointerLabels" :key="p.key">
        <text :x="p.x" :y="p.y" text-anchor="middle" class="pointer-label" :class="{ edge: p.edge }">{{ p.name }}</text>
      </g>
    </svg>
  </div>
</template>
