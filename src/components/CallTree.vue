<script setup>
import { computed } from 'vue'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  frame: { type: Object, default: null },
  index: { type: Number, default: 0 },
})

const CHAR = 6.6
const NODE_H = 24
const ROW = 48
const GAP = 10

const layout = computed(() => {
  const nodes = props.nodes
  if (!nodes.length) return null
  const roots = nodes.filter((n) => n.parent === null)
  const width = new Map()
  const label = (n) => `${n.name}(${n.args})`
  const boxW = (n) => Math.max(36, label(n).length * CHAR + 16)
  const measure = (n) => {
    const own = boxW(n)
    const kids = n.children.map((c) => measure(nodes[c]))
    const sum = kids.reduce((s, w) => s + w, 0) + Math.max(0, kids.length - 1) * GAP
    const w = Math.max(own, sum)
    width.set(n.id, w)
    return w
  }
  const pos = new Map()
  const place = (n, left, depth) => {
    const w = width.get(n.id)
    pos.set(n.id, { x: left + w / 2, y: depth * ROW + 16, w: boxW(n), label: label(n) })
    const kids = n.children.map((c) => nodes[c])
    const sum = kids.reduce((s, k) => s + width.get(k.id), 0) + Math.max(0, kids.length - 1) * GAP
    let x = left + (w - sum) / 2
    for (const k of kids) {
      place(k, x, depth + 1)
      x += width.get(k.id) + GAP
    }
  }
  let left = 0
  let maxDepth = 0
  for (const r of roots) {
    measure(r)
    place(r, left, 0)
    left += width.get(r.id) + GAP * 2
  }
  for (const n of nodes) maxDepth = Math.max(maxDepth, n.depth)
  return { pos, w: Math.max(left, 100), h: (maxDepth + 1) * ROW + 30 }
})

const active = computed(() => new Set(props.frame?.stack ?? []))

const visible = computed(() => {
  if (!layout.value) return []
  return props.nodes
    .filter((n) => n.start <= props.index)
    .map((n) => {
      const p = layout.value.pos.get(n.id)
      const done = n.end !== null && n.end <= props.index
      const state = props.frame?.node === n.id ? 'current' : active.value.has(n.id) ? 'active' : done ? 'done' : 'active'
      return { n, p, done, state }
    })
})

const edges = computed(() =>
  visible.value
    .filter((v) => v.n.parent !== null)
    .map((v) => {
      const pp = layout.value.pos.get(v.n.parent)
      return { key: v.n.id, x1: pp.x, y1: pp.y + NODE_H / 2, x2: v.p.x, y2: v.p.y - NODE_H / 2, done: v.done }
    }),
)

const total = computed(() => props.nodes.length)
const shown = computed(() => visible.value.length)
</script>

<template>
  <div class="call-tree">
    <div class="tree-meta">
      <span>{{ shown.toLocaleString('en-GB') }} of {{ total.toLocaleString('en-GB') }} calls so far</span>
      <span class="legend"><i class="lg-current" /> running <i class="lg-active" /> waiting <i class="lg-done" /> returned</span>
    </div>
    <svg
      v-if="layout"
      :viewBox="`-8 -4 ${layout.w + 16} ${layout.h}`"
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label="Tree of function calls"
    >
      <path
        v-for="e in edges"
        :key="'e' + e.key"
        :d="`M${e.x1},${e.y1} C${e.x1},${(e.y1 + e.y2) / 2} ${e.x2},${(e.y1 + e.y2) / 2} ${e.x2},${e.y2}`"
        :class="['tree-edge', { done: e.done }]"
      />
      <g v-for="v in visible" :key="v.n.id" :class="['tree-node', v.state]">
        <rect :x="v.p.x - v.p.w / 2" :y="v.p.y - NODE_H / 2" :width="v.p.w" :height="NODE_H" rx="6" />
        <text :x="v.p.x" :y="v.p.y + 4" text-anchor="middle">{{ v.p.label }}</text>
        <text v-if="v.done" :x="v.p.x" :y="v.p.y + NODE_H / 2 + 13" text-anchor="middle" class="tree-ret">→ {{ v.n.ret }}</text>
      </g>
    </svg>
    <p v-else class="empty">No function calls recorded.</p>
  </div>
</template>
