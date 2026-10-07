# Algorithm Explorer

A desktop tool for learning how algorithms work and how their running time grows. Step through classic algorithms on real data, write your own in Python, and measure their Big O growth.

Built with Vue 3 and Vite. Python runs in the browser through [Pyodide](https://pyodide.org) (CPython compiled to WebAssembly). Maths is typeset with KaTeX and code is edited with CodeMirror.

## Features

**Library**
- 28 classic algorithms covering every common class from $O(1)$ to $O(n!)$:
  - Sorting: bubble, selection, insertion, merge, quick, heap and counting sort.
  - Searching: linear, binary and jump search.
  - Arrays: maximum subarray (brute force and Kadane), duplicate detection (pairs and hash set), three sum, subset sum and permutations.
  - Numbers and recursion: Fibonacci (naive, memoised, iterative), sums, powers, primality, the sieve of Eratosthenes and the Towers of Hanoi.
- Each has best, average and worst cases in LaTeX, a plain explanation of how it works, and a derivation of why it has that complexity.

**Visualise**
- Records every line as the algorithm runs once on small data, then plays it back with step controls and a scrubber.
- Bars show reads (blue) and writes (orange), with index variables such as `i`, `j`, `lo`, `hi` and `mid` drawn as pointers.
- A call tree shows recursion as it unfolds, including the repeated work in naive Fibonacci.
- Also shows a chart of variables over time, the local variables at each step, the call stack and `print()` output.
- Line counts in the editor gutter show which lines are doing the work.
- Data can be random, sorted, reversed, nearly sorted, few-unique or repeat-free, or you can type your own list.

**Complexity**
- Runs the code at a range of sizes and counts the lines executed.
- Fits the counts against every complexity class. Exponential growth is fitted with its base, so naive Fibonacci reports about $1.62^n$.
- Reference curves, a log–log slope and a steps ÷ $g(n)$ column that settles on the hidden constant.
- Compares the result with the expected class for the chosen data, so you can see, for example, quick sort's $O(n^2)$ worst case on sorted input.
- Step counts and wall-clock time can be shown side by side.

**Compare**
- Races any set of algorithms that take the same kind of input on one chart.

**Big O guide**
- Growth rates plotted together, a table of how long each class takes at $n = 10$ to $10^6$, and the definitions of $O$, $\Omega$ and $\Theta$, simplification rules and the master theorem.

**Your own algorithms**
- New creates an algorithm from a template or as a copy of a classic. You choose the input (a list, a sorted list and target, or a number), an optional correctness check and your guess at its complexity, which is checked against the measurement.
- Classic algorithms can also be edited in place and restored.
- Runaway code is safe to run: runs stop after 2.5 million steps, deep recursion is caught, and a Stop button restarts Python.
- Your algorithms are saved in the browser. Share copies a link that carries the code, and you can download any algorithm as a `.py` file.

The layout is built for laptops and desktops. Narrower screens see a notice asking for a bigger screen.

## Run it locally

Requires Node 20 or later.

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173). The first load fetches the Python runtime (about 12 MB), which takes a few seconds; after that the browser caches it.

`npm run dev` and `npm run build` first run `scripts/copy-pyodide.mjs`, which copies the Pyodide runtime from `node_modules` into `public/pyodide`. That folder is generated, so it is ignored by git. `npm run build` writes the static site to `dist/`, and `npm run preview` serves that build.

## Publish on GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) builds the site and publishes it on every push to `main`. The Python runtime is bundled into the site, so it does not depend on an outside server.

1. Create a new repository on GitHub. Any name works, because asset paths are relative.
2. Push this project to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Open the **Actions** tab. Once the "Deploy to GitHub Pages" run finishes, the site is live at `https://<your-username>.github.io/<repo-name>/`.

If the first run happened before step 3, re-run it from the Actions tab or push any change.

## How it works

- `src/python/harness.py` runs inside Pyodide. It compiles your code under a fixed filename and installs a `sys.settrace` hook that counts every line of your code that executes. In Visualise mode it also records each line's local variables, every function call and return, and every read and write on the list, which is passed in as a list subclass that logs its own accesses.
- `src/lib/py.worker.js` hosts Pyodide in a Web Worker, so long runs never freeze the page, and `src/lib/runner.js` talks to it. Stopping a run terminates the worker and starts a fresh one.
- `src/lib/complexity.js` fits $\text{steps} \approx c\,g(n) + d$ for each class $g$ by weighted least squares, and scores each fit by its error on a log scale.

## Project structure

```
src/
  App.vue                       layout and keyboard shortcuts
  python/harness.py             tracing, counting and timing inside Python
  lib/
    algorithms.js               the classic algorithms: code, complexity, explanations
    complexity.js               complexity classes, curve fitting, growth tables
    data.js                     seeded data generators
    trace.js                    turns raw trace events into playback frames and a call tree
    runner.js, py.worker.js     the Pyodide worker and its message protocol
    store.js                    app state, persistence, playback, measurement, sharing
  components/
    VisualiseView.vue           data controls, playback, editor and state panels
    ArrayBars.vue, CallTree.vue the two main visuals
    ComplexityView.vue          growth measurement, fit and line counts
    CompareView.vue             several algorithms on one chart
    GuideView.vue               Big O reference
    LineChart.vue               the SVG chart used everywhere
    CodeEditor.vue              CodeMirror with step highlighting and line-count gutter
    LibrarySidebar.vue, InspectorPanel.vue, ToolBar.vue
    NewAlgorithmDialog.vue, HelpDialog.vue, MathText.vue
scripts/copy-pyodide.mjs        copies the Python runtime into public/
```
