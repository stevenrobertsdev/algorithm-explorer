<script setup>
import { computed } from 'vue'
import MathText from './MathText.vue'
import { CLASSES, classById } from '../lib/complexity.js'
import { INPUT_LABELS } from '../lib/algorithms.js'
import { current, session, benchEntry, analyse, createCustom, updateCustom, deleteCustom, resetCode, downloadPython, prefs } from '../lib/store.js'

const a = computed(() => current.value)
const badge = computed(() => (a.value.badge ? classById(a.value.badge) : null))
const measured = computed(() => analyse(benchEntry.value, 'steps'))

const CASES = [
  ['best', 'Best case'],
  ['average', 'Average'],
  ['worst', 'Worst case'],
]

const SIGNATURE = {
  array: 'def algorithm(arr):',
  search: 'def algorithm(arr, target):',
  number: 'def algorithm(n):',
}

function copy() {
  createCustom({ name: `${a.value.name} (my version)`, from: a.value.id })
}

function remove() {
  if (window.confirm(`Delete “${a.value.name}”? This cannot be undone.`)) deleteCustom(a.value.id)
}
</script>

<template>
  <aside class="inspector" :class="{ closed: !prefs.inspector }">
    <div class="insp-scroll">
      <header class="insp-head">
        <span class="kind-tag">{{ a.category }}</span>
        <h2 v-if="!a.custom">{{ a.name }}</h2>
        <input
          v-else
          class="name-input"
          :value="a.name"
          aria-label="Algorithm name"
          @change="updateCustom(a.id, { name: $event.target.value.trim() || 'My algorithm' })"
        />
        <p v-if="a.summary" class="summary">{{ a.summary }}</p>
        <div v-if="a.props?.length" class="props">
          <span v-for="p in a.props" :key="p" class="chip">{{ p }}</span>
        </div>
      </header>

      <section v-if="a.cases" class="insp-section">
        <h3>Complexity</h3>
        <table class="cases">
          <tr v-for="[key, label] in CASES" :key="key">
            <th>{{ label }}</th>
            <td><MathText :src="`$${a.cases[key][0]}$`" tag="span" /></td>
            <td class="muted">{{ a.cases[key][1] ?? '' }}</td>
          </tr>
          <tr>
            <th>Extra memory</th>
            <td><MathText :src="`$${a.cases.space}$`" tag="span" /></td>
            <td />
          </tr>
        </table>
        <p v-if="measured" class="measured">
          <span class="muted">Your last measurement:</span>
          <MathText :src="`$${measured.best.tex}$`" tag="span" :style="{ color: measured.best.cls.color }" />
        </p>
      </section>

      <section v-else class="insp-section">
        <h3>Your algorithm</h3>
        <dl class="custom-meta">
          <dt>Input</dt>
          <dd>{{ INPUT_LABELS[a.input] }}<br /><code>{{ SIGNATURE[a.input] }}</code></dd>
          <dt>Check the answer</dt>
          <dd>
            <select :value="a.check || ''" @change="updateCustom(a.id, { check: $event.target.value || null })">
              <option value="">No check</option>
              <option value="sorted">The list ends up sorted</option>
              <option value="search">Returns the target’s position, or −1</option>
            </select>
          </dd>
          <dt>Your guess</dt>
          <dd>
            <select :value="a.guess || ''" @change="updateCustom(a.id, { guess: $event.target.value })">
              <option value="">Not sure yet</option>
              <option v-for="c in CLASSES" :key="c.id" :value="c.id">{{ c.plain === '1' ? 'O(1)' : `O(${c.plain})` }} {{ c.name.toLowerCase() }}</option>
            </select>
          </dd>
          <dt>Measured</dt>
          <dd>
            <MathText v-if="measured" :src="`$${measured.best.tex}$`" tag="span" :style="{ color: measured.best.cls.color }" />
            <span v-else class="muted">Run Measure growth on the Complexity tab.</span>
            <template v-if="measured && a.guess">
              <span v-if="measured.best.cls.id === a.guess" class="chip good">matches your guess</span>
              <span v-else class="chip warn">differs from your guess</span>
            </template>
          </dd>
        </dl>
        <div class="tips">
          <h4>Writing your own</h4>
          <ul>
            <li>Define <code>{{ SIGNATURE[a.input] }}</code>. You can add helper functions above it.</li>
            <li v-if="a.input !== 'number'">Index the list as <code>arr[i]</code> to see reads and writes on the bars. Loops like <code>for x in arr</code> work but are not highlighted.</li>
            <li>Name index variables <code>i</code>, <code>j</code>, <code>lo</code>, <code>hi</code> or <code>mid</code> and they appear as pointers under the bars.</li>
            <li><code>print()</code> output appears in the Output tab, step by step.</li>
            <li>Runs stop after 2.5 million steps, so a loop that never ends is caught.</li>
          </ul>
        </div>
      </section>

      <section v-if="a.how" class="insp-section">
        <h3>How it works</h3>
        <template v-for="(b, i) in a.how" :key="i">
          <MathText v-if="b.p" :src="b.p" />
          <MathText v-else :src="b.m" display />
        </template>
      </section>

      <section v-if="a.why" class="insp-section">
        <h3>
          Why it is
          <MathText v-if="badge" :src="`$${a.cases?.worst?.[0] ?? badge.tex}$`" tag="span" />
        </h3>
        <template v-for="(b, i) in a.why" :key="i">
          <MathText v-if="b.p" :src="b.p" />
          <MathText v-else :src="b.m" display />
        </template>
      </section>

      <section class="insp-section actions">
        <button v-if="!a.custom" type="button" class="btn small" @click="copy">Make an editable copy</button>
        <button v-if="a.edited" type="button" class="btn small" @click="resetCode">Restore original code</button>
        <button type="button" class="btn small" @click="downloadPython">Download .py</button>
        <button v-if="a.custom" type="button" class="btn small danger" @click="remove">Delete</button>
        <p v-if="!a.custom" class="muted">You can also edit the code in place. Changes are kept in this browser, and Restore original code puts it back.</p>
      </section>
    </div>
  </aside>
</template>
