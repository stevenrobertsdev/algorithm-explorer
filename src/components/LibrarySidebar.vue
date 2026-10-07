<script setup>
import { ref, computed } from 'vue'
import MathText from './MathText.vue'
import { ALGORITHMS, CATEGORIES } from '../lib/algorithms.js'
import { classById } from '../lib/complexity.js'
import { state, session, select, describe } from '../lib/store.js'

const query = ref('')

const matches = (a) => {
  const q = query.value.trim().toLowerCase()
  return !q || a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || (a.badge && classById(a.badge)?.name.toLowerCase().includes(q))
}

const groups = computed(() =>
  CATEGORIES.map((cat) => ({
    cat,
    items: ALGORITHMS.filter((a) => a.category === cat && matches(a)),
  })).filter((g) => g.items.length),
)

const mine = computed(() => state.custom.map((c) => describe(c.id)).filter((a) => a && matches(a)))
</script>

<template>
  <aside class="sidebar">
    <div class="side-top">
      <input v-model="query" class="search" type="search" placeholder="Filter algorithms" aria-label="Filter algorithms" />
      <button type="button" class="btn primary small new-btn" @click="session.dialog = 'new'">
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
        New
      </button>
    </div>
    <nav class="library" aria-label="Algorithms">
      <section v-if="mine.length || !query" class="lib-group">
        <h3>My algorithms</h3>
        <button
          v-for="a in mine"
          :key="a.id"
          type="button"
          class="lib-item"
          :class="{ active: state.selectedId === a.id }"
          @click="select(a.id)"
        >
          <span class="lib-name">{{ a.name }}</span>
          <MathText v-if="a.badge" class="badge" :style="{ '--c': classById(a.badge).color }" :src="`$${classById(a.badge).tex}$`" tag="span" />
        </button>
        <p v-if="!mine.length" class="lib-empty">Write your own with New, or open a classic and make an editable copy.</p>
      </section>
      <section v-for="g in groups" :key="g.cat" class="lib-group">
        <h3>{{ g.cat }}</h3>
        <button
          v-for="a in g.items"
          :key="a.id"
          type="button"
          class="lib-item"
          :class="{ active: state.selectedId === a.id }"
          @click="select(a.id)"
        >
          <span class="lib-name">{{ a.name }}<i v-if="a.id in state.edits" class="edited" title="Edited">•</i></span>
          <MathText class="badge" :style="{ '--c': classById(a.badge).color }" :src="`$${classById(a.badge).tex}$`" tag="span" />
        </button>
      </section>
    </nav>
  </aside>
</template>
