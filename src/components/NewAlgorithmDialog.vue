<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ALGORITHMS, INPUT_LABELS } from '../lib/algorithms.js'
import { CLASSES } from '../lib/complexity.js'
import { session, createCustom, current } from '../lib/store.js'

const name = ref('')
const input = ref('array')
const check = ref('')
const guess = ref('')
const from = ref('')
const nameEl = ref(null)

const close = () => (session.dialog = null)
const onKey = (e) => e.key === 'Escape' && close()
onMounted(() => {
  window.addEventListener('keydown', onKey)
  nameEl.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function startFrom(id) {
  from.value = id
  const a = ALGORITHMS.find((x) => x.id === id)
  if (a) {
    input.value = a.input
    check.value = a.check ?? ''
    if (!name.value) name.value = `${a.name} (my version)`
  }
}

function create() {
  createCustom({
    name: name.value,
    input: input.value,
    check: check.value || null,
    guess: guess.value,
    from: from.value || null,
  })
  session.dialog = null
  session.toast = null
}
</script>

<template>
  <div class="modal-backdrop" @click.self="close">
    <form class="modal small" role="dialog" aria-modal="true" aria-labelledby="new-title" @submit.prevent="create">
      <header class="modal-head">
        <h2 id="new-title">New algorithm</h2>
        <button type="button" class="icon-btn" aria-label="Close" @click="close">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
      </header>
      <label class="field">
        <span>Name</span>
        <input ref="nameEl" v-model="name" type="text" placeholder="My algorithm" />
      </label>
      <label class="field">
        <span>Start from</span>
        <select :value="from" @change="startFrom($event.target.value)">
          <option value="">A blank template</option>
          <option v-for="a in ALGORITHMS" :key="a.id" :value="a.id">A copy of {{ a.name }}</option>
        </select>
      </label>
      <fieldset class="field" :disabled="!!from">
        <span>What it takes as input</span>
        <div class="radio-row">
          <label v-for="(label, key) in INPUT_LABELS" :key="key" class="radio">
            <input v-model="input" type="radio" :value="key" />
            {{ label }}
          </label>
        </div>
      </fieldset>
      <label class="field">
        <span>Check the answer</span>
        <select v-model="check" :disabled="!!from">
          <option value="">No check</option>
          <option value="sorted">The list ends up sorted</option>
          <option value="search">Returns the target’s position, or −1</option>
        </select>
      </label>
      <label class="field">
        <span>Your guess at its complexity</span>
        <select v-model="guess">
          <option value="">Not sure yet</option>
          <option v-for="c in CLASSES" :key="c.id" :value="c.id">{{ c.plain === '1' ? 'O(1)' : `O(${c.plain})` }} {{ c.name.toLowerCase() }}</option>
        </select>
      </label>
      <p class="muted">The guess is checked against what the Complexity tab measures.</p>
      <footer class="modal-actions">
        <button type="button" class="btn" @click="close">Cancel</button>
        <button type="submit" class="btn primary">Create</button>
      </footer>
    </form>
  </div>
</template>
