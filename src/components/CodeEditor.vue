<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { EditorView, keymap, lineNumbers, drawSelection, Decoration, gutter, GutterMarker, highlightActiveLine } from '@codemirror/view'
import { EditorState, StateField, StateEffect, RangeSetBuilder } from '@codemirror/state'
import { python } from '@codemirror/lang-python'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, indentUnit } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const props = defineProps({
  modelValue: { type: String, required: true },
  currentLine: { type: Number, default: null },
  errorLine: { type: Number, default: null },
  counts: { type: Object, default: () => ({}) },
  follow: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'run'])

const host = ref(null)
let view = null

const setMarks = StateEffect.define()

const marksField = StateField.define({
  create: () => ({ current: null, error: null, counts: {}, max: 0 }),
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setMarks)) return e.value
    return value
  },
})

const currentDeco = Decoration.line({ class: 'cm-step-line' })
const errorDeco = Decoration.line({ class: 'cm-error-line' })

const lineDecos = EditorView.decorations.compute([marksField], (state) => {
  const m = state.field(marksField)
  const builder = new RangeSetBuilder()
  const lines = []
  if (m.current && m.current <= state.doc.lines) lines.push([m.current, currentDeco])
  if (m.error && m.error <= state.doc.lines && m.error !== m.current) lines.push([m.error, errorDeco])
  lines.sort((a, b) => a[0] - b[0])
  for (const [n, deco] of lines) {
    const line = state.doc.line(n)
    builder.add(line.from, line.from, deco)
  }
  return builder.finish()
})

class HeatMarker extends GutterMarker {
  constructor(count, max) {
    super()
    this.count = count
    this.max = max
  }
  eq(other) {
    return other.count === this.count && other.max === this.max
  }
  toDOM() {
    const el = document.createElement('div')
    el.className = 'cm-heat'
    const bar = document.createElement('span')
    bar.className = 'cm-heat-bar'
    bar.style.width = `${Math.max(6, (Math.log(this.count + 1) / Math.log(this.max + 1)) * 100)}%`
    const label = document.createElement('span')
    label.className = 'cm-heat-label'
    label.textContent = this.count >= 10000 ? `${Math.round(this.count / 1000)}k` : String(this.count)
    el.title = `This line ran ${this.count.toLocaleString('en-GB')} times`
    el.append(bar, label)
    return el
  }
}

const heatGutter = gutter({
  class: 'cm-heat-gutter',
  lineMarker(v, line) {
    const m = v.state.field(marksField)
    const n = v.state.doc.lineAt(line.from).number
    const c = m.counts[n]
    return c ? new HeatMarker(c, m.max) : null
  },
  lineMarkerChange: (update) => update.transactions.some((tr) => tr.effects.some((e) => e.is(setMarks))),
  initialSpacer: () => new HeatMarker(1000, 1000),
})

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.moduleKeyword, tags.operatorKeyword], color: 'var(--code-keyword)', fontWeight: '500' },
  { tag: [tags.function(tags.variableName), tags.function(tags.definition(tags.variableName))], color: 'var(--code-function)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--code-number)' },
  { tag: [tags.string], color: 'var(--code-string)' },
  { tag: [tags.comment], color: 'var(--faint)', fontStyle: 'italic' },
  { tag: [tags.self, tags.special(tags.variableName)], color: 'var(--code-keyword)' },
  { tag: [tags.className, tags.typeName], color: 'var(--code-function)' },
])

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: 'var(--surface)', color: 'var(--text)' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.65' },
  '.cm-content': { caretColor: 'var(--accent)', padding: '8px 0' },
  '.cm-gutters': { backgroundColor: 'var(--panel)', color: 'var(--faint)', borderRight: '1px solid var(--border)' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '&.cm-focused .cm-activeLine': { backgroundColor: 'var(--active-line)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--selection) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-matchingBracket': { backgroundColor: 'var(--accent-soft)', outline: 'none' },
})

function push() {
  if (!view) return
  const counts = props.counts || {}
  const max = Math.max(0, ...Object.values(counts))
  view.dispatch({
    effects: setMarks.of({ current: props.currentLine, error: props.errorLine, counts, max }),
  })
  if (props.follow && props.currentLine && props.currentLine <= view.state.doc.lines) {
    const line = view.state.doc.line(props.currentLine)
    view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'nearest', yMargin: 40 }) })
  }
}

onMounted(() => {
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        lineNumbers(),
        heatGutter,
        history(),
        drawSelection(),
        highlightActiveLine(),
        indentOnInput(),
        bracketMatching(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        python(),
        syntaxHighlighting(highlight),
        theme,
        marksField,
        lineDecos,
        keymap.of([
          { key: 'Mod-Enter', run: () => (emit('run'), true) },
          { key: 'Shift-Enter', run: () => (emit('run'), true) },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) emit('update:modelValue', u.state.doc.toString())
        }),
      ],
    }),
  })
  push()
})

onBeforeUnmount(() => view?.destroy())

watch(
  () => props.modelValue,
  (v) => {
    if (view && v !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } })
    }
  },
)
watch(() => [props.currentLine, props.errorLine, props.counts], push)
</script>

<template>
  <div ref="host" class="code-editor" />
</template>
