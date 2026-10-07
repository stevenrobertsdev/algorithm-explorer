export function buildTrace(raw, input) {
  const frames = []
  const nodes = []
  const stack = []
  let arr = input && input.kind !== 'number' ? input.arr.slice() : null
  let reads = []
  let writes = []
  let out = ''
  let pending = null
  let between = false

  const finish = (nextLocals, nextDepth) => {
    if (!pending) return
    if (nextLocals && !between && nextDepth === pending.depth) pending.after = nextLocals
    pending.arr = arr ? arr.slice() : null
    pending.reads = reads
    pending.writes = writes
    pending.out = out.length
    frames.push(pending)
    reads = []
    writes = []
    pending = null
  }

  for (const ev of raw.events ?? []) {
    const kind = ev[0]
    if (kind === 'l') {
      finish(ev[3], ev[2])
      const top = stack[stack.length - 1]
      pending = {
        line: ev[1],
        depth: ev[2],
        before: ev[3],
        after: null,
        node: top ? top.id : null,
        stack: stack.map((s) => s.id),
      }
      between = false
    } else if (kind === 'c') {
      between = true
      const parent = stack[stack.length - 1] ?? null
      const node = {
        id: nodes.length,
        name: ev[1],
        args: ev[2],
        depth: ev[3],
        parent: parent ? parent.id : null,
        children: [],
        start: frames.length + (pending ? 1 : 0),
        end: null,
        ret: null,
      }
      nodes.push(node)
      if (parent) parent.children.push(node.id)
      stack.push(node)
    } else if (kind === 'x') {
      between = true
      const node = stack.pop()
      if (node) {
        node.ret = ev[2]
        node.end = frames.length + (pending ? 1 : 0)
      }
    } else if (kind === 'r') {
      reads.push(ev[1])
    } else if (kind === 'w') {
      if (arr) arr[ev[1]] = ev[2]
      writes.push(ev[1])
    } else if (kind === 's') {
      arr = ev[1].slice()
      writes.push(-1)
    } else if (kind === 'o') {
      out += ev[1]
    }
  }
  finish(null, null)
  for (const f of frames) if (!f.after) f.after = f.before
  return { frames, nodes, output: out }
}

export function nodeLabel(node) {
  return `${node.name}(${node.args})`
}
