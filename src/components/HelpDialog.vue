<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { session } from '../lib/store.js'

const close = () => (session.help = false)
const onKey = (e) => e.key === 'Escape' && close()
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const KEYS = [
  ['Ctrl + Enter', 'run the code (in the editor)'],
  ['Space', 'play or pause'],
  ['← / →', 'step back or forward'],
  ['Home / End', 'first or last step'],
  ['1 – 4', 'switch view'],
  ['N', 'show or hide the notes panel'],
  ['?', 'this help'],
]

const VIEWS = [
  ['Visualise', 'Runs the algorithm once on small data and records every line. Step through it to watch reads (blue) and writes (orange) on the bars, the variables, the call stack and the call tree.'],
  ['Complexity', 'Runs the algorithm at a range of sizes, counts the lines executed, and fits the counts to a Big O class. The table shows the hidden constant, and the code shows which lines do the work.'],
  ['Compare', 'Races several algorithms that take the same kind of input on one chart.'],
  ['Big O guide', 'Growth rates side by side, how long each would take, and the definitions behind the notation.'],
]
</script>

<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <header class="modal-head">
        <h2 id="help-title">How to use Algorithm Explorer</h2>
        <button type="button" class="icon-btn" aria-label="Close" @click="close">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
      </header>
      <div class="modal-cols">
        <section>
          <h3>The four views</h3>
          <dl class="views-list">
            <template v-for="[k, v] in VIEWS" :key="k">
              <dt>{{ k }}</dt>
              <dd>{{ v }}</dd>
            </template>
          </dl>
        </section>
        <section>
          <h3>Keyboard</h3>
          <table class="kv">
            <tr v-for="[k, v] in KEYS" :key="k"><td><kbd>{{ k }}</kbd></td><td>{{ v }}</td></tr>
          </table>
          <h3 class="gap">Writing your own</h3>
          <p>Press New, choose what the function takes, and write <code>def algorithm(...)</code>. Any Python standard library module can be imported. Your algorithms are saved in this browser, and Share copies a link that carries the code.</p>
        </section>
      </div>
      <section class="modal-foot">
        <h3>Ideas to try</h3>
        <ul>
          <li>Measure Quick sort on random data, then on sorted data. Read the Why section to see what went wrong.</li>
          <li>Compare Bubble, Insertion and Merge sort on nearly sorted data. Insertion sort wins for small n.</li>
          <li>Open Fibonacci, naive recursion with n = 6 and look for repeated calls in the call tree. Then open the memoised version.</li>
          <li>Write a two-pointer version of three sum (sort first) and check that it measures as O(n²).</li>
          <li>On the Complexity tab, switch between Steps and Time. Steps are exact, times wobble.</li>
        </ul>
      </section>
    </div>
  </div>
</template>
