<script setup>
import { state, prefs, session, copyShareLink, downloadPython, runner } from '../lib/store.js'

const TABS = [
  { id: 'visualise', label: 'Visualise', key: '1' },
  { id: 'complexity', label: 'Complexity', key: '2' },
  { id: 'compare', label: 'Compare', key: '3' },
  { id: 'guide', label: 'Big O guide', key: '4' },
]

function cycleTheme() {
  const order = ['system', 'light', 'dark']
  prefs.theme = order[(order.indexOf(prefs.theme) + 1) % order.length]
}
const themeLabel = { system: 'Theme: follow system', light: 'Theme: light', dark: 'Theme: dark' }
</script>

<template>
  <header class="toolbar">
    <div class="brand">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="3" y="13" width="3.2" height="7" rx="1" fill="currentColor" opacity="0.55" />
        <rect x="8.2" y="9" width="3.2" height="11" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="13.4" y="6" width="3.2" height="14" rx="1" fill="currentColor" opacity="0.85" />
        <path d="M3 9.5C9 9 14 6 21 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <span>Algorithm Explorer</span>
    </div>

    <nav class="tab-switch" aria-label="Views">
      <button
        v-for="t in TABS"
        :key="t.id"
        type="button"
        :class="{ on: state.tab === t.id }"
        :aria-current="state.tab === t.id ? 'page' : null"
        :title="`${t.label} (${t.key})`"
        @click="state.tab = t.id"
      >
        {{ t.label }}
      </button>
    </nav>

    <div class="tool-groups end">
      <span class="engine" :class="runner.engine.status" :title="runner.engine.message || (runner.engine.version ? `Pyodide ${runner.engine.version}` : '')">
        <i />
        <template v-if="runner.engine.status === 'ready'">{{ runner.engine.busy ? 'Python running' : 'Python ready' }}</template>
        <template v-else-if="runner.engine.status === 'loading'">Loading Python…</template>
        <template v-else-if="runner.engine.status === 'error'">Python failed to load</template>
        <template v-else>Python idle</template>
      </span>
      <span class="divider" />
      <button type="button" class="tool" title="Copy a link to this algorithm and its code" @click="copyShareLink()">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.8.8M9.2 6.8a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.8-.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
        <span class="lbl">Share</span>
      </button>
      <button type="button" class="tool" title="Download the code as a .py file" @click="downloadPython()">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 2v8M4.8 6.8L8 10l3.2-3.2M2.5 11.5v2h11v-2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <span class="lbl">.py</span>
      </button>
      <button type="button" class="tool icon" :title="themeLabel[prefs.theme]" :aria-label="themeLabel[prefs.theme]" @click="cycleTheme">
        <svg v-if="prefs.theme === 'light'" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
        <svg v-else-if="prefs.theme === 'dark'" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" /></svg>
        <svg v-else viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" /></svg>
      </button>
      <button type="button" class="tool icon" title="Help and shortcuts (?)" aria-label="Help" @click="session.help = true">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M6.3 6.3a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /><circle cx="8" cy="11.6" r="0.8" fill="currentColor" /></svg>
      </button>
      <button type="button" class="tool icon" :class="{ on: prefs.inspector }" :title="prefs.inspector ? 'Hide the notes panel (N)' : 'Show the notes panel (N)'" aria-label="Toggle notes panel" @click="prefs.inspector = !prefs.inspector">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="1.8" y="2.5" width="12.4" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M10 2.5v11" stroke="currentColor" stroke-width="1.4" /></svg>
      </button>
    </div>
  </header>
</template>
