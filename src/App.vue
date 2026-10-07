<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ToolBar from './components/ToolBar.vue'
import LibrarySidebar from './components/LibrarySidebar.vue'
import VisualiseView from './components/VisualiseView.vue'
import ComplexityView from './components/ComplexityView.vue'
import CompareView from './components/CompareView.vue'
import GuideView from './components/GuideView.vue'
import InspectorPanel from './components/InspectorPanel.vue'
import NewAlgorithmDialog from './components/NewAlgorithmDialog.vue'
import HelpDialog from './components/HelpDialog.vue'
import { state, prefs, session, load, play, pause, step, seek, runner } from './lib/store.js'

load()
runner.start().catch(() => {})

const dismissed = ref(false)
const TABS = ['visualise', 'complexity', 'compare', 'guide']

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  if (t instanceof HTMLElement && (t.closest('input, textarea, select, .cm-editor') || t.isContentEditable)) return
  if (session.help || session.dialog) return
  const k = e.key
  const frames = session.trace?.frames.length ?? 0
  if (k >= '1' && k <= '4') state.tab = TABS[Number(k) - 1]
  else if (k === 'n' || k === 'N') prefs.inspector = !prefs.inspector
  else if (k === '?') session.help = true
  else if (state.tab === 'visualise' && k === ' ') session.playing ? pause() : play()
  else if (state.tab === 'visualise' && k === 'ArrowRight') step(1)
  else if (state.tab === 'visualise' && k === 'ArrowLeft') step(-1)
  else if (state.tab === 'visualise' && k === 'Home') seek(0)
  else if (state.tab === 'visualise' && k === 'End') seek(frames - 1)
  else return
  e.preventDefault()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="small-screen" :class="{ dismissed }" role="alert">
    <div class="small-card">
      <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
        <rect x="6" y="9" width="36" height="24" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.4" />
        <path d="M2 37h44" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
        <path d="M12 28v-4M18 28v-7M24 28v-10M30 28v-13" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
      </svg>
      <h1>Algorithm Explorer needs a bigger screen</h1>
      <p>It is built as a desktop tool, with code, visuals and notes side by side. Please open it on a laptop or desktop computer.</p>
      <button type="button" class="link" @click="dismissed = true">Continue anyway</button>
    </div>
  </div>

  <div class="app" :class="{ 'no-inspector': !prefs.inspector }">
    <ToolBar />
    <LibrarySidebar />
    <main class="stage">
      <VisualiseView v-show="state.tab === 'visualise'" />
      <ComplexityView v-if="state.tab === 'complexity'" />
      <CompareView v-else-if="state.tab === 'compare'" />
      <GuideView v-else-if="state.tab === 'guide'" />
      <div v-if="runner.engine.status === 'error'" class="engine-error">
        <strong>Python could not start.</strong>
        <span>{{ runner.engine.message }}</span>
        <button type="button" class="btn small" @click="runner.restart('Restarting Python…')">Try again</button>
      </div>
      <transition name="fade">
        <div v-if="session.toast" class="toast">{{ session.toast.text }}</div>
      </transition>
    </main>
    <InspectorPanel v-show="prefs.inspector" />
  </div>

  <NewAlgorithmDialog v-if="session.dialog === 'new'" />
  <HelpDialog v-if="session.help" />
</template>
