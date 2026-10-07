const T = String.raw

const GEO = (from, to) => {
  const out = []
  for (let n = from; n <= to; n *= 2) out.push(n)
  return out
}

export const CATEGORIES = ['Sorting', 'Searching', 'Arrays', 'Numbers and recursion']

export const ALGORITHMS = [
  {
    id: 'bubble-sort',
    name: 'Bubble sort',
    category: 'Sorting',
    input: 'array',
    check: 'sorted',
    badge: 'n2',
    cases: { best: ['O(n)', 'already sorted'], average: ['O(n^2)'], worst: ['O(n^2)', 'reversed'], space: 'O(1)' },
    expect: { default: 'n2', sorted: 'n' },
    sizes: [8, 16, 32, 64, 128, 192, 256, 384],
    pointers: ['i', 'j'],
    props: ['Stable', 'In place', 'Adaptive'],
    summary: 'Repeatedly swaps neighbours that are out of order until a full pass makes no swaps.',
    how: [
      { p: 'Each pass walks along the list comparing neighbouring pairs and swapping any pair that is out of order. The largest remaining value is carried to the end of the unsorted part, like a bubble rising, so each pass can stop one place earlier than the last.' },
      { p: 'A flag records whether a pass made any swaps. If it made none, the list is already sorted and the algorithm stops early.' },
    ],
    why: [
      { p: T`Pass $i$ makes $n - 1 - i$ comparisons. In the worst case every pass runs, so the total is` },
      { m: T`\sum_{i=0}^{n-2} (n - 1 - i) = (n-1) + (n-2) + \dots + 1 = \frac{n(n-1)}{2}` },
      { p: T`The dominant term is $\tfrac{1}{2}n^2$. Constant factors are dropped, giving $O(n^2)$.` },
      { p: T`On already sorted input the first pass makes no swaps and the loop stops after $n - 1$ comparisons, which is $O(n)$.` },
    ],
    code: `def algorithm(arr):
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr
`,
  },
  {
    id: 'selection-sort',
    name: 'Selection sort',
    category: 'Sorting',
    input: 'array',
    check: 'sorted',
    badge: 'n2',
    cases: { best: ['O(n^2)'], average: ['O(n^2)'], worst: ['O(n^2)'], space: 'O(1)' },
    expect: { default: 'n2' },
    sizes: [8, 16, 32, 64, 128, 192, 256, 384],
    pointers: ['i', 'j', 'smallest'],
    props: ['In place', 'Not stable'],
    summary: 'Finds the smallest remaining value and moves it to the front, one position at a time.',
    how: [
      { p: 'The list is split into a sorted front and an unsorted back. Each round scans the whole unsorted part for its smallest value, then swaps that value into the first unsorted position.' },
      { p: 'It makes at most $n - 1$ swaps, far fewer than bubble sort, but it always scans everything that is left, even when the list is already sorted.' },
    ],
    why: [
      { p: T`Round $i$ scans $n - 1 - i$ values whatever their order, so the comparisons always total` },
      { m: T`\sum_{i=0}^{n-2} (n - 1 - i) = \frac{n(n-1)}{2} \in \Theta(n^2)` },
      { p: T`Because the count does not depend on the input, best, average and worst cases are all $\Theta(n^2)$.` },
    ],
    code: `def algorithm(arr):
    n = len(arr)
    for i in range(n - 1):
        smallest = i
        for j in range(i + 1, n):
            if arr[j] < arr[smallest]:
                smallest = j
        arr[i], arr[smallest] = arr[smallest], arr[i]
    return arr
`,
  },
  {
    id: 'insertion-sort',
    name: 'Insertion sort',
    category: 'Sorting',
    input: 'array',
    check: 'sorted',
    badge: 'n2',
    cases: { best: ['O(n)', 'already sorted'], average: ['O(n^2)'], worst: ['O(n^2)', 'reversed'], space: 'O(1)' },
    expect: { default: 'n2', sorted: 'n', nearly: 'n' },
    sizes: [8, 16, 32, 64, 128, 192, 256, 384],
    pointers: ['i', 'j'],
    props: ['Stable', 'In place', 'Adaptive'],
    summary: 'Takes each value in turn and slides it left into place among the values already sorted.',
    how: [
      { p: 'The front of the list is kept sorted. The next value is lifted out as the key, larger values are shifted one place to the right, and the key drops into the gap.' },
      { p: 'This is how most people sort a hand of cards. It is very fast on lists that are already nearly in order, which is why practical sorts such as Timsort use it for short runs.' },
    ],
    why: [
      { p: T`Inserting the $i$-th value shifts it past every larger value before it. In the worst case (reversed input) that is all $i$ of them:` },
      { m: T`\sum_{i=1}^{n-1} i = \frac{n(n-1)}{2} \in O(n^2)` },
      { p: T`On sorted input the inner loop stops immediately each time, leaving one comparison per value: $O(n)$. Nearly sorted input behaves almost the same, since each value only moves a short distance.` },
    ],
    code: `def algorithm(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr
`,
  },
  {
    id: 'merge-sort',
    name: 'Merge sort',
    category: 'Sorting',
    input: 'array',
    check: 'sorted',
    badge: 'nlogn',
    cases: { best: ['O(n \\log n)'], average: ['O(n \\log n)'], worst: ['O(n \\log n)'], space: 'O(n)' },
    expect: { default: 'nlogn' },
    sizes: GEO(16, 2048),
    pointers: ['lo', 'mid', 'hi', 'k'],
    props: ['Stable', 'Divide and conquer'],
    summary: 'Splits the list in half, sorts each half recursively, then merges the two sorted halves.',
    how: [
      { p: 'A list of one item is already sorted. Anything longer is split at the midpoint, each half is sorted by the same method, and the two sorted halves are merged by repeatedly taking the smaller front value.' },
      { p: 'Merging needs a copy of the two halves, so merge sort uses $O(n)$ extra memory. In return its running time does not depend on the order of the input.' },
    ],
    why: [
      { p: T`Sorting $n$ items means sorting two halves and then merging $n$ items, which gives the recurrence` },
      { m: T`T(n) = 2\,T\!\left(\tfrac{n}{2}\right) + cn` },
      { p: T`Draw it as a tree. Every level of the tree merges $n$ items in total, and halving reaches size 1 after $\log_2 n$ levels:` },
      { m: T`T(n) = \underbrace{cn + cn + \dots + cn}_{\log_2 n \text{ levels}} = cn\log_2 n \in O(n \log n)` },
      { p: T`The master theorem gives the same result: $a = 2$, $b = 2$ and $f(n) = n = n^{\log_b a}$, so $T(n) = \Theta(n \log n)$.` },
    ],
    code: `def merge_sort(arr, lo, hi):
    if hi - lo < 2:
        return
    mid = (lo + hi) // 2
    merge_sort(arr, lo, mid)
    merge_sort(arr, mid, hi)
    merge(arr, lo, mid, hi)


def merge(arr, lo, mid, hi):
    left = arr[lo:mid]
    right = arr[mid:hi]
    a = b = 0
    k = lo
    while a < len(left) and b < len(right):
        if left[a] <= right[b]:
            arr[k] = left[a]
            a += 1
        else:
            arr[k] = right[b]
            b += 1
        k += 1
    while a < len(left):
        arr[k] = left[a]
        a += 1
        k += 1
    while b < len(right):
        arr[k] = right[b]
        b += 1
        k += 1


def algorithm(arr):
    merge_sort(arr, 0, len(arr))
    return arr
`,
  },
  {
    id: 'quick-sort',
    name: 'Quick sort',
    category: 'Sorting',
    input: 'array',
    check: 'sorted',
    badge: 'nlogn',
    cases: { best: ['O(n \\log n)'], average: ['O(n \\log n)'], worst: ['O(n^2)', 'sorted, with this pivot choice'], space: 'O(\\log n)' },
    expect: { default: 'nlogn', sorted: 'n2', reversed: 'n2', few: 'n2', nearly: 'n2' },
    sizes: GEO(16, 1024),
    pointers: ['lo', 'hi', 'i', 'j', 'p'],
    props: ['In place', 'Not stable', 'Divide and conquer'],
    summary: 'Picks a pivot, moves smaller values before it and larger values after it, then sorts each side.',
    how: [
      { p: 'This version (Lomuto partitioning) uses the last value as the pivot. One pass moves every value no larger than the pivot to the left, then the pivot is swapped into the gap between the two groups. It is now in its final position.' },
      { p: 'The same process is applied to the part on the left of the pivot and the part on the right. Try the sorted and few-unique data shapes on the Complexity tab to see what a bad pivot does.' },
    ],
    why: [
      { p: T`Partitioning $n$ items costs $cn$. If the pivot splits the list evenly, the recurrence matches merge sort and gives $O(n \log n)$:` },
      { m: T`T(n) = 2\,T\!\left(\tfrac{n}{2}\right) + cn \;\Rightarrow\; T(n) \in O(n \log n)` },
      { p: T`On sorted input the last value is always the largest, so one side is empty and the other has $n - 1$ items:` },
      { m: T`T(n) = T(n-1) + cn = c\left(n + (n-1) + \dots + 1\right) = \frac{cn(n+1)}{2} \in O(n^2)` },
      { p: 'Choosing a random pivot or the median of three makes this worst case very unlikely.' },
    ],
    code: `def partition(arr, lo, hi):
    pivot = arr[hi]
    i = lo
    for j in range(lo, hi):
        if arr[j] <= pivot:
            arr[i], arr[j] = arr[j], arr[i]
            i += 1
    arr[i], arr[hi] = arr[hi], arr[i]
    return i


def quick_sort(arr, lo, hi):
    if lo < hi:
        p = partition(arr, lo, hi)
        quick_sort(arr, lo, p - 1)
        quick_sort(arr, p + 1, hi)


def algorithm(arr):
    quick_sort(arr, 0, len(arr) - 1)
    return arr
`,
  },
  {
    id: 'heap-sort',
    name: 'Heap sort',
    category: 'Sorting',
    input: 'array',
    check: 'sorted',
    badge: 'nlogn',
    cases: { best: ['O(n \\log n)'], average: ['O(n \\log n)'], worst: ['O(n \\log n)'], space: 'O(1)' },
    expect: { default: 'nlogn' },
    sizes: GEO(16, 2048),
    pointers: ['root', 'child', 'start', 'end'],
    props: ['In place', 'Not stable'],
    summary: 'Arranges the list as a max-heap, then repeatedly moves the largest value to the end.',
    how: [
      { p: T`A max-heap is a binary tree stored in the list itself: the children of position $i$ sit at $2i + 1$ and $2i + 2$, and every parent is at least as large as its children. So the largest value is always at position 0.` },
      { p: 'The first loop builds the heap. The second loop swaps the largest value to the end of the unsorted part, then lets the new root sink down until the heap property holds again.' },
    ],
    why: [
      { p: T`A heap with $n$ items is a complete binary tree of height $\lfloor \log_2 n \rfloor$, so one sift-down follows at most that many parent-child steps.` },
      { p: T`Extracting all $n$ values therefore costs at most $n \log_2 n$ steps:` },
      { m: T`T(n) \le \underbrace{O(n)}_{\text{build heap}} + \underbrace{n \cdot O(\log n)}_{\text{extractions}} \in O(n \log n)` },
      { p: T`Building the heap is only $O(n)$, because most nodes sit near the bottom and sink a short way. That cost is outweighed by the extraction phase.` },
    ],
    code: `def sift_down(arr, root, end):
    while True:
        child = 2 * root + 1
        if child >= end:
            return
        if child + 1 < end and arr[child + 1] > arr[child]:
            child += 1
        if arr[root] >= arr[child]:
            return
        arr[root], arr[child] = arr[child], arr[root]
        root = child


def algorithm(arr):
    n = len(arr)
    for start in range(n // 2 - 1, -1, -1):
        sift_down(arr, start, n)
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]
        sift_down(arr, 0, end)
    return arr
`,
  },
  {
    id: 'counting-sort',
    name: 'Counting sort',
    category: 'Sorting',
    input: 'array',
    check: 'sorted',
    badge: 'n',
    cases: { best: ['O(n + k)'], average: ['O(n + k)'], worst: ['O(n + k)'], space: 'O(k)' },
    expect: { default: 'n' },
    sizes: GEO(16, 4096),
    pointers: ['k'],
    props: ['Not comparison based'],
    summary: 'Counts how many times each value occurs, then writes the values back out in order.',
    how: [
      { p: T`Instead of comparing values, it makes a tally with one counter per possible value between the minimum and maximum. Writing each value out as many times as it was counted produces the sorted list.` },
      { p: T`It only works for whole numbers (or anything that maps to them), and it pays for a counter for every value in the range, $k$, even ones that never appear.` },
    ],
    why: [
      { p: T`Finding the range and tallying touch each of the $n$ values once. Writing out visits all $k$ counters and writes $n$ values:` },
      { m: T`T(n, k) = O(n) + O(k + n) = O(n + k)` },
      { p: T`On the Complexity tab the value range grows in step with $n$, so $k \propto n$ and the measured growth is linear. Comparison sorts cannot beat $O(n \log n)$, but this sort avoids comparisons altogether.` },
    ],
    code: `def algorithm(arr):
    if not arr:
        return arr
    low = min(arr)
    high = max(arr)
    counts = [0] * (high - low + 1)
    for value in arr:
        counts[value - low] += 1
    k = 0
    for offset in range(len(counts)):
        for _ in range(counts[offset]):
            arr[k] = offset + low
            k += 1
    return arr
`,
  },
  {
    id: 'linear-search',
    name: 'Linear search',
    category: 'Searching',
    input: 'search',
    check: 'search',
    badge: 'n',
    cases: { best: ['O(1)', 'target is first'], average: ['O(n)'], worst: ['O(n)', 'target missing'], space: 'O(1)' },
    expect: { default: 'n', first: '1' },
    sizes: GEO(16, 8192),
    pointers: ['i'],
    props: ['Works on unsorted data'],
    summary: 'Checks each position in turn until it finds the target.',
    how: [
      { p: 'Starting at the front, compare every value with the target and return the first position that matches. If the end is reached, the target is not there, so return −1.' },
      { p: 'It needs no preparation and works on any list, sorted or not.' },
    ],
    why: [
      { p: T`If the target is missing, all $n$ values are checked. If it is present at a random position, on average half of them are:` },
      { m: T`\frac{1}{n}\sum_{i=1}^{n} i = \frac{n+1}{2} \in O(n)` },
      { p: T`If the target is first, one comparison suffices, which is $O(1)$.` },
    ],
    code: `def algorithm(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1
`,
  },
  {
    id: 'binary-search',
    name: 'Binary search',
    category: 'Searching',
    input: 'search',
    check: 'search',
    badge: 'logn',
    cases: { best: ['O(1)', 'target in the middle'], average: ['O(\\log n)'], worst: ['O(\\log n)'], space: 'O(1)' },
    expect: { default: 'logn' },
    sizes: GEO(16, 1 << 16),
    pointers: ['lo', 'mid', 'hi'],
    props: ['Needs sorted data'],
    summary: 'Halves the search range each step by comparing the target with the middle value.',
    how: [
      { p: T`Keep two bounds, $lo$ and $hi$, around the part of the sorted list that could still hold the target. Look at the middle value: if it is too small the target must be to its right, if too large to its left.` },
      { p: 'Each comparison throws away half of what is left, which is why searching a million sorted items takes about 20 steps.' },
    ],
    why: [
      { p: T`After $k$ steps the range holds about $\frac{n}{2^k}$ items. The search ends when one item is left:` },
      { m: T`\frac{n}{2^k} = 1 \;\Rightarrow\; 2^k = n \;\Rightarrow\; k = \log_2 n` },
      { p: T`So at most $\lfloor \log_2 n \rfloor + 1$ comparisons are needed, which is $O(\log n)$. The base of the logarithm only changes a constant factor, so it is left out.` },
    ],
    code: `def algorithm(arr, target):
    lo = 0
    hi = len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
`,
  },
  {
    id: 'jump-search',
    name: 'Jump search',
    category: 'Searching',
    input: 'search',
    check: 'search',
    badge: 'sqrtn',
    cases: { best: ['O(1)'], average: ['O(\\sqrt{n})'], worst: ['O(\\sqrt{n})'], space: 'O(1)' },
    expect: { default: 'sqrtn', first: '1' },
    sizes: GEO(16, 1 << 16),
    pointers: ['start', 'end', 'i'],
    props: ['Needs sorted data'],
    summary: 'Jumps ahead in blocks of √n until it passes the target, then scans back through one block.',
    how: [
      { p: T`Split the sorted list into blocks of size $m$. Jump from block to block while the last value of the block is still smaller than the target, then search the one block that could contain it, item by item.` },
      { p: 'It sits between linear and binary search, and only ever moves forward, which can matter when stepping backwards is expensive.' },
    ],
    why: [
      { p: T`With block size $m$ there are at most $\frac{n}{m}$ jumps and at most $m$ steps inside the final block:` },
      { m: T`T(n) = \frac{n}{m} + m` },
      { p: T`This is smallest when its derivative is zero: $-\frac{n}{m^2} + 1 = 0$, so $m = \sqrt{n}$. Then` },
      { m: T`T(n) = \sqrt{n} + \sqrt{n} = 2\sqrt{n} \in O(\sqrt{n})` },
    ],
    code: `import math


def algorithm(arr, target):
    n = len(arr)
    step = max(1, int(math.sqrt(n)))
    start = 0
    end = step
    while end < n and arr[end - 1] < target:
        start = end
        end += step
    for i in range(start, min(end, n)):
        if arr[i] == target:
            return i
    return -1
`,
  },
  {
    id: 'first-element',
    name: 'First element',
    category: 'Arrays',
    input: 'array',
    check: null,
    badge: '1',
    cases: { best: ['O(1)'], average: ['O(1)'], worst: ['O(1)'], space: 'O(1)' },
    expect: { default: '1' },
    sizes: GEO(16, 8192),
    pointers: [],
    props: [],
    summary: 'Reads one value by its position. The size of the list makes no difference.',
    how: [
      { p: 'A Python list stores references to its items in one continuous block of memory. Position $i$ is found by arithmetic on the start address, so reading it takes the same time whether the list has ten items or ten million.' },
    ],
    why: [
      { p: T`The function does the same fixed amount of work for every $n$: $T(n) = c$. Any constant is $O(1)$.` },
      { p: 'On the Complexity tab the step count is flat. The measured time may wobble slightly, which is noise rather than growth.' },
    ],
    code: `def algorithm(arr):
    return arr[0]
`,
  },
  {
    id: 'max-subarray-brute',
    name: 'Maximum subarray, brute force',
    category: 'Arrays',
    input: 'array',
    signed: true,
    check: null,
    badge: 'n2',
    cases: { best: ['O(n^2)'], average: ['O(n^2)'], worst: ['O(n^2)'], space: 'O(1)' },
    expect: { default: 'n2' },
    sizes: [8, 16, 32, 64, 128, 192, 256, 384],
    pointers: ['i', 'j'],
    props: [],
    summary: 'Tries every start and end position to find the contiguous run with the largest sum.',
    how: [
      { p: 'For each start position $i$, extend the run one item at a time to every possible end $j$, keeping a running total and remembering the best total seen.' },
      { p: 'Compare it with Kadane’s algorithm, which finds the same answer in a single pass.' },
    ],
    why: [
      { p: T`There are $n - i$ end positions for start $i$, so the inner loop runs` },
      { m: T`\sum_{i=0}^{n-1} (n - i) = \frac{n(n+1)}{2} \in O(n^2)` },
      { p: 'times. Keeping a running total avoids re-adding each run from scratch, which would make it $O(n^3)$.' },
    ],
    code: `def algorithm(arr):
    best = arr[0]
    for i in range(len(arr)):
        total = 0
        for j in range(i, len(arr)):
            total += arr[j]
            best = max(best, total)
    return best
`,
  },
  {
    id: 'kadane',
    name: 'Maximum subarray, Kadane',
    category: 'Arrays',
    input: 'array',
    signed: true,
    check: null,
    badge: 'n',
    cases: { best: ['O(n)'], average: ['O(n)'], worst: ['O(n)'], space: 'O(1)' },
    expect: { default: 'n' },
    sizes: GEO(16, 8192),
    pointers: ['i'],
    props: ['Dynamic programming'],
    summary: 'One pass that tracks the best run ending at each position.',
    how: [
      { p: T`Let $current$ be the largest sum of a run that ends exactly at position $i$. That run either continues the best run ending at $i - 1$ or starts afresh at $i$, whichever is larger:` },
      { m: T`current_i = \max\left(a_i,\ current_{i-1} + a_i\right)` },
      { p: T`The answer is the largest $current$ seen. This is dynamic programming: each step reuses the previous step’s answer instead of recomputing it.` },
    ],
    why: [
      { p: T`Each item is visited once and does a constant amount of work, so $T(n) = cn \in O(n)$.` },
      { p: T`Against the brute force version this turns $\frac{n(n+1)}{2}$ steps into $n$. For $n = 10{,}000$ that is the difference between about fifty million steps and ten thousand.` },
    ],
    code: `def algorithm(arr):
    best = current = arr[0]
    for i in range(1, len(arr)):
        current = max(arr[i], current + arr[i])
        best = max(best, current)
    return best
`,
  },
  {
    id: 'duplicates-pairs',
    name: 'Has duplicates, compare pairs',
    category: 'Arrays',
    input: 'array',
    shape: 'distinct',
    check: null,
    badge: 'n2',
    cases: { best: ['O(1)', 'first two are equal'], average: ['O(n^2)'], worst: ['O(n^2)', 'no duplicates'], space: 'O(1)' },
    expect: { default: 'n2' },
    sizes: [8, 16, 32, 64, 128, 192, 256, 384],
    pointers: ['i', 'j'],
    props: [],
    summary: 'Compares every pair of values to see whether any two are equal.',
    how: [
      { p: 'Two nested loops visit every pair $(i, j)$ with $i < j$ exactly once and stop as soon as a matching pair is found.' },
      { p: 'The Complexity tab uses values with no repeats by default, which forces the worst case. With random values a repeat usually turns up early.' },
    ],
    why: [
      { p: T`The number of pairs from $n$ items is` },
      { m: T`\binom{n}{2} = \frac{n(n-1)}{2} \in O(n^2)` },
      { p: 'With no duplicates every pair is checked, so the worst case is quadratic.' },
    ],
    code: `def algorithm(arr):
    for i in range(len(arr)):
        for j in range(i + 1, len(arr)):
            if arr[i] == arr[j]:
                return True
    return False
`,
  },
  {
    id: 'duplicates-set',
    name: 'Has duplicates, hash set',
    category: 'Arrays',
    input: 'array',
    shape: 'distinct',
    check: null,
    badge: 'n',
    cases: { best: ['O(1)'], average: ['O(n)'], worst: ['O(n)'], space: 'O(n)' },
    expect: { default: 'n' },
    sizes: GEO(16, 8192),
    pointers: ['i'],
    props: ['Trades memory for time'],
    summary: 'Remembers each value in a set and stops when it sees one twice.',
    how: [
      { p: 'A set is a hash table: it stores each value in a slot chosen by a hash of the value, so checking whether a value is present takes about the same time however many values the set holds.' },
      { p: T`The algorithm walks the list once, asking the set whether it has seen each value before. The price is $O(n)$ extra memory for the set.` },
    ],
    why: [
      { p: T`Each of the $n$ values costs one lookup and one insert, both $O(1)$ on average:` },
      { m: T`T(n) = n \cdot O(1) = O(n)` },
      { p: T`This is the classic trade: using more memory to turn an $O(n^2)$ search into $O(n)$.` },
    ],
    code: `def algorithm(arr):
    seen = set()
    for i in range(len(arr)):
        value = arr[i]
        if value in seen:
            return True
        seen.add(value)
    return False
`,
  },
  {
    id: 'three-sum',
    name: 'Three sum, brute force',
    category: 'Arrays',
    input: 'array',
    signed: true,
    check: null,
    badge: 'n3',
    cases: { best: ['O(n^3)'], average: ['O(n^3)'], worst: ['O(n^3)'], space: 'O(1)' },
    expect: { default: 'n3' },
    sizes: [6, 8, 12, 16, 24, 32, 48, 64],
    pointers: ['i', 'j', 'k'],
    props: [],
    summary: 'Counts the triples of values that add up to zero by trying every triple.',
    how: [
      { p: T`Three nested loops pick positions $i < j < k$ and check whether $a_i + a_j + a_k = 0$.` },
      { p: T`Sorting first and using two pointers brings this down to $O(n^2)$. Try writing that version as your own algorithm and compare the two.` },
    ],
    why: [
      { p: 'The number of ways to choose three positions out of $n$ is' },
      { m: T`\binom{n}{3} = \frac{n(n-1)(n-2)}{6} \in O(n^3)` },
      { p: T`Doubling $n$ multiplies the work by about $2^3 = 8$.` },
    ],
    code: `def algorithm(arr):
    n = len(arr)
    count = 0
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if arr[i] + arr[j] + arr[k] == 0:
                    count += 1
    return count
`,
  },
  {
    id: 'subset-sum',
    name: 'Subsets that sum to zero',
    category: 'Arrays',
    input: 'array',
    signed: true,
    check: null,
    badge: '2n',
    cases: { best: ['O(2^n)'], average: ['O(2^n)'], worst: ['O(2^n)'], space: 'O(n)' },
    expect: { default: '2n' },
    sizes: [2, 4, 6, 8, 10, 12, 14, 16],
    visualN: 5,
    pointers: ['i'],
    props: ['Recursion'],
    summary: 'Explores every subset by deciding, item by item, whether to include it.',
    how: [
      { p: 'Each call makes one decision about item $i$: include it in the running total, or leave it out. Both choices are explored, so the calls form a binary tree whose leaves are the $2^n$ subsets.' },
      { p: 'The call tree on the Visualise tab shows this doubling directly. Subset sum is NP-complete, so no polynomial algorithm is known.' },
    ],
    why: [
      { p: T`Each call with $i < n$ makes two calls on the remaining items:` },
      { m: T`T(n) = 2\,T(n-1) + c \;\Rightarrow\; T(n) = c\,(2^{n+1} - 1) \in O(2^n)` },
      { p: T`Adding one item doubles the work. At $n = 30$ that is over a billion subsets.` },
    ],
    code: `def count_subsets(arr, i, total):
    if i == len(arr):
        return 1 if total == 0 else 0
    with_it = count_subsets(arr, i + 1, total + arr[i])
    without_it = count_subsets(arr, i + 1, total)
    return with_it + without_it


def algorithm(arr):
    return count_subsets(arr, 0, 0) - 1
`,
  },
  {
    id: 'permutations',
    name: 'All permutations',
    category: 'Arrays',
    input: 'array',
    check: null,
    badge: 'fact',
    cases: { best: ['O(n!)'], average: ['O(n!)'], worst: ['O(n!)'], space: 'O(n)' },
    expect: { default: 'fact' },
    sizes: [1, 2, 3, 4, 5, 6, 7, 8],
    visualN: 4,
    pointers: ['start', 'i'],
    props: ['Recursion', 'Backtracking'],
    summary: 'Generates every ordering of the list by swapping each item into the front and recursing.',
    how: [
      { p: 'Position 0 can hold any of the $n$ items. For each choice, swap it into place, generate every ordering of the remaining $n - 1$ items, then swap back. This undo step is called backtracking.' },
      { p: 'The function counts the orderings it reaches, which is always $n!$.' },
    ],
    why: [
      { p: T`The first level makes $n$ calls, each of those makes $n - 1$, and so on:` },
      { m: T`n \times (n-1) \times \dots \times 1 = n!` },
      { p: T`So $T(n) \in O(n!)$. Factorials grow faster than any exponential $c^n$: $10! \approx 3.6 \times 10^6$ but $20! \approx 2.4 \times 10^{18}$.` },
    ],
    code: `def permute(arr, start):
    if start >= len(arr) - 1:
        return 1
    count = 0
    for i in range(start, len(arr)):
        arr[start], arr[i] = arr[i], arr[start]
        count += permute(arr, start + 1)
        arr[start], arr[i] = arr[i], arr[start]
    return count


def algorithm(arr):
    return permute(arr, 0)
`,
  },
  {
    id: 'sum-loop',
    name: 'Sum 1 to n, loop',
    category: 'Numbers and recursion',
    input: 'number',
    check: null,
    badge: 'n',
    cases: { best: ['O(n)'], average: ['O(n)'], worst: ['O(n)'], space: 'O(1)' },
    expect: { default: 'n' },
    sizes: GEO(16, 16384),
    visualN: 8,
    props: [],
    summary: 'Adds the numbers one by one.',
    how: [
      { p: T`A loop adds $1, 2, 3, \dots, n$ to a running total. It is correct but does work proportional to $n$.` },
    ],
    why: [
      { p: T`The loop body runs $n$ times with constant work each time: $T(n) = cn \in O(n)$.` },
      { p: 'Compare it with the formula version, which reaches the same answer in a fixed number of steps.' },
    ],
    code: `def algorithm(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total
`,
  },
  {
    id: 'sum-formula',
    name: 'Sum 1 to n, formula',
    category: 'Numbers and recursion',
    input: 'number',
    check: null,
    badge: '1',
    cases: { best: ['O(1)'], average: ['O(1)'], worst: ['O(1)'], space: 'O(1)' },
    expect: { default: '1' },
    sizes: GEO(16, 16384),
    visualN: 8,
    props: [],
    summary: 'Uses Gauss’s formula instead of a loop.',
    how: [
      { p: T`Write the sum forwards and backwards and add the two lines. Each column adds to $n + 1$ and there are $n$ columns:` },
      { m: T`2S = \underbrace{(n+1) + (n+1) + \dots + (n+1)}_{n} \;\Rightarrow\; S = \frac{n(n+1)}{2}` },
    ],
    why: [
      { p: T`One multiplication, one addition and one division, whatever $n$ is: $O(1)$.` },
      { p: 'A better algorithm often comes from a better piece of maths rather than faster code.' },
    ],
    code: `def algorithm(n):
    return n * (n + 1) // 2
`,
  },
  {
    id: 'fib-recursive',
    name: 'Fibonacci, naive recursion',
    category: 'Numbers and recursion',
    input: 'number',
    check: null,
    badge: '2n',
    cases: { best: ['O(\\varphi^n)'], average: ['O(\\varphi^n)'], worst: ['O(\\varphi^n)'], space: 'O(n)' },
    expect: { default: '2n' },
    sizes: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22],
    visualN: 5,
    props: ['Recursion'],
    summary: 'Computes each Fibonacci number from the two before it, recomputing the same values again and again.',
    how: [
      { p: T`The definition $F(n) = F(n-1) + F(n-2)$ translates straight into code. The trouble is that $F(n-1)$ and $F(n-2)$ both recompute $F(n-3)$, and so on all the way down.` },
      { p: 'Open the call tree on the Visualise tab and look for the repeated calls. The memoised version removes them.' },
    ],
    why: [
      { p: T`The number of calls satisfies almost the same recurrence as the Fibonacci numbers themselves:` },
      { m: T`C(n) = C(n-1) + C(n-2) + 1 \;\Rightarrow\; C(n) = 2F(n+1) - 1` },
      { p: T`Fibonacci numbers grow like $\varphi^n$, where $\varphi = \frac{1 + \sqrt{5}}{2} \approx 1.618$ is the golden ratio. So the running time is $O(\varphi^n)$, which is often loosely bounded as $O(2^n)$.` },
      { p: T`The fitted base on the Complexity tab should come out close to $1.62$.` },
    ],
    code: `def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


def algorithm(n):
    return fib(n)
`,
  },
  {
    id: 'fib-memo',
    name: 'Fibonacci, memoised',
    category: 'Numbers and recursion',
    input: 'number',
    check: null,
    badge: 'n',
    cases: { best: ['O(n)'], average: ['O(n)'], worst: ['O(n)'], space: 'O(n)' },
    expect: { default: 'n' },
    sizes: [8, 16, 32, 64, 128, 256, 512],
    visualN: 6,
    props: ['Recursion', 'Dynamic programming'],
    summary: 'The same recursion, but each value is stored the first time it is computed.',
    how: [
      { p: 'A dictionary called memo stores every Fibonacci number once it is known. Before doing any work, the function checks whether the answer is already in memo.' },
      { p: 'Compare its call tree with the naive version: every repeated branch is now cut off after one lookup.' },
    ],
    why: [
      { p: T`Each value $F(0), \dots, F(n)$ is computed once. Every other call returns immediately from memo, and each value triggers at most two calls, so` },
      { m: T`C(n) \le 2n + 1 \in O(n)` },
      { p: T`Memory is $O(n)$ for memo and the call stack. Remembering answers to overlapping subproblems is the core idea of dynamic programming.` },
    ],
    code: `def fib(n, memo):
    if n in memo:
        return memo[n]
    if n < 2:
        result = n
    else:
        result = fib(n - 1, memo) + fib(n - 2, memo)
    memo[n] = result
    return result


def algorithm(n):
    return fib(n, {})
`,
  },
  {
    id: 'fib-iterative',
    name: 'Fibonacci, iterative',
    category: 'Numbers and recursion',
    input: 'number',
    check: null,
    badge: 'n',
    cases: { best: ['O(n)'], average: ['O(n)'], worst: ['O(n)'], space: 'O(1)' },
    expect: { default: 'n' },
    sizes: GEO(16, 8192),
    visualN: 8,
    props: ['Dynamic programming'],
    summary: 'Builds the sequence upwards, keeping only the last two values.',
    how: [
      { p: T`Start from $F(0) = 0$ and $F(1) = 1$ and step forwards $n$ times, replacing the pair $(a, b)$ with $(b, a + b)$.` },
      { p: 'Working upwards from the base cases is called bottom-up dynamic programming. It needs no recursion and only two variables.' },
    ],
    why: [
      { p: T`The loop runs $n$ times with constant work each time, so $T(n) \in O(n)$ with $O(1)$ extra memory.` },
      { p: T`Strictly, the numbers themselves grow to about $0.69n$ bits, so each addition gets slower for huge $n$. Step counts ignore this, which is why they are a model rather than a stopwatch.` },
    ],
    code: `def algorithm(n):
    a, b = 0, 1
    for i in range(n):
        a, b = b, a + b
    return a
`,
  },
  {
    id: 'power-naive',
    name: 'Power, repeated multiplication',
    category: 'Numbers and recursion',
    input: 'number',
    check: null,
    badge: 'n',
    cases: { best: ['O(n)'], average: ['O(n)'], worst: ['O(n)'], space: 'O(1)' },
    expect: { default: 'n' },
    sizes: GEO(16, 16384),
    visualN: 8,
    props: [],
    summary: 'Computes 3ⁿ (mod a large prime) by multiplying by 3, n times.',
    how: [
      { p: T`Multiply an accumulator by 3, $n$ times. Taking the remainder modulo $10^9 + 7$ after each step keeps the numbers small, as cryptography and contest code do.` },
    ],
    why: [
      { p: T`$n$ multiplications, each $O(1)$: $T(n) \in O(n)$.` },
      { p: 'Fast exponentiation needs only about $2\log_2 n$ multiplications for the same answer.' },
    ],
    code: `MOD = 1_000_000_007


def algorithm(n):
    result = 1
    for i in range(n):
        result = result * 3 % MOD
    return result
`,
  },
  {
    id: 'power-fast',
    name: 'Power, fast exponentiation',
    category: 'Numbers and recursion',
    input: 'number',
    check: null,
    badge: 'logn',
    cases: { best: ['O(\\log n)'], average: ['O(\\log n)'], worst: ['O(\\log n)'], space: 'O(1)' },
    expect: { default: 'logn' },
    sizes: GEO(16, 1 << 20),
    visualN: 13,
    props: [],
    summary: 'Computes 3ⁿ (mod a large prime) by squaring, using the binary digits of n.',
    how: [
      { p: T`Write $n$ in binary. Then $3^n$ is a product of the powers $3^1, 3^2, 3^4, 3^8, \dots$ that match the 1 bits. For example $3^{13} = 3^8 \cdot 3^4 \cdot 3^1$ because $13 = 1101_2$.` },
      { p: T`Each loop squares the base to get the next power and multiplies it in when the current bit of $n$ is 1, then shifts $n$ right by one bit.` },
    ],
    why: [
      { p: T`Each pass halves $n$, so the loop runs once per binary digit:` },
      { m: T`\lfloor \log_2 n \rfloor + 1 \text{ passes} \;\Rightarrow\; T(n) \in O(\log n)` },
      { p: T`For $n = 10^6$ that is 20 passes instead of a million multiplications.` },
    ],
    code: `MOD = 1_000_000_007


def algorithm(n):
    base = 3
    result = 1
    while n > 0:
        if n % 2 == 1:
            result = result * base % MOD
        base = base * base % MOD
        n //= 2
    return result
`,
  },
  {
    id: 'trial-division',
    name: 'Prime test, trial division',
    category: 'Numbers and recursion',
    input: 'number',
    sizeMap: 'nextPrime',
    check: null,
    badge: 'sqrtn',
    cases: { best: ['O(1)', 'even numbers'], average: ['O(\\sqrt{n})'], worst: ['O(\\sqrt{n})', 'n is prime'], space: 'O(1)' },
    expect: { default: 'sqrtn' },
    sizes: GEO(16, 1 << 20),
    visualN: 37,
    props: [],
    summary: 'Tries every divisor up to √n.',
    how: [
      { p: T`If $n = a \times b$ with $a \le b$, then $a \le \sqrt{n}$. So if no number from 2 up to $\sqrt{n}$ divides $n$, nothing does, and $n$ is prime.` },
      { p: 'The Complexity tab rounds each size up to the next prime, so every run hits the worst case.' },
    ],
    why: [
      { p: T`The loop continues while $d^2 \le n$, which is about $\sqrt{n}$ iterations when $n$ is prime:` },
      { m: T`T(n) \approx c\sqrt{n} \in O(\sqrt{n}) = O\!\left(n^{1/2}\right)` },
      { p: T`Measured against the number of digits $b = \log_2 n$, this is $O(2^{b/2})$, which is exponential. That is why cryptographic primality tests use cleverer methods.` },
    ],
    code: `def algorithm(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True
`,
  },
  {
    id: 'sieve',
    name: 'Sieve of Eratosthenes',
    category: 'Numbers and recursion',
    input: 'number',
    check: null,
    badge: 'n',
    cases: { best: ['O(n \\log\\log n)'], average: ['O(n \\log\\log n)'], worst: ['O(n \\log\\log n)'], space: 'O(n)' },
    expect: { default: ['n', 'nlogn'] },
    sizes: GEO(16, 1 << 15),
    visualN: 30,
    props: [],
    summary: 'Counts the primes up to n by crossing out multiples of each prime.',
    how: [
      { p: T`Start with every number from 2 to $n$ marked prime. Take the first unmarked number $p$, cross out its multiples from $p^2$ upwards, and move on to the next unmarked number. Stop once $p^2 > n$.` },
      { p: 'Whatever is left unmarked is prime. The function returns how many there are.' },
    ],
    why: [
      { p: T`Each prime $p$ crosses out about $\frac{n}{p}$ numbers, so the total is` },
      { m: T`\sum_{p \le \sqrt{n}} \frac{n}{p} = n \sum_{p \le \sqrt{n}} \frac{1}{p} \approx n \ln\ln n` },
      { p: T`by Mertens’ theorem. $\log\log n$ grows so slowly (it is about 3 for $n = 10^9$) that it sits between $O(n)$ and $O(n \log n)$, and the fit on the Complexity tab can land on either neighbour.` },
    ],
    code: `def algorithm(n):
    is_prime = [True] * (n + 1)
    is_prime[0] = False
    is_prime[1] = False
    p = 2
    while p * p <= n:
        if is_prime[p]:
            for multiple in range(p * p, n + 1, p):
                is_prime[multiple] = False
        p += 1
    return sum(is_prime)
`,
  },
  {
    id: 'hanoi',
    name: 'Towers of Hanoi',
    category: 'Numbers and recursion',
    input: 'number',
    check: null,
    badge: '2n',
    cases: { best: ['O(2^n)'], average: ['O(2^n)'], worst: ['O(2^n)'], space: 'O(n)' },
    expect: { default: '2n' },
    sizes: [1, 2, 4, 6, 8, 10, 12, 14, 16],
    visualN: 3,
    props: ['Recursion'],
    summary: 'Counts the moves needed to shift a tower of n discs between pegs.',
    how: [
      { p: T`To move $n$ discs from A to C: move the top $n - 1$ to the spare peg B, move the largest disc to C, then move the $n - 1$ discs from B onto it. Each of those smaller moves uses the same plan.` },
    ],
    why: [
      { p: 'Each call makes two calls on one fewer disc plus one move:' },
      { m: T`M(n) = 2M(n-1) + 1,\quad M(0) = 0 \;\Rightarrow\; M(n) = 2^n - 1` },
      { p: T`Check it: $M(1) = 1$, $M(2) = 3$, $M(3) = 7$. The work is $O(2^n)$. A legend says monks are moving 64 discs; at one move a second that takes about 585 billion years.` },
    ],
    code: `def hanoi(n, source, target, spare):
    if n == 0:
        return 0
    moves = hanoi(n - 1, source, spare, target)
    moves += 1
    moves += hanoi(n - 1, spare, target, source)
    return moves


def algorithm(n):
    return hanoi(n, 'A', 'C', 'B')
`,
  },
]

export const TEMPLATES = {
  array: `def algorithm(arr):
    n = len(arr)
    for i in range(n):
        pass
    return arr
`,
  search: `def algorithm(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            return i
    return -1
`,
  number: `def algorithm(n):
    total = 0
    for i in range(n):
        total += i
    return total
`,
}

export const INPUT_LABELS = {
  array: 'List of numbers',
  search: 'Sorted list and a target',
  number: 'A whole number n',
}

export const CUSTOM_POINTERS = ['i', 'j', 'k', 'lo', 'hi', 'mid', 'low', 'high', 'start', 'end', 'left', 'right', 'p']

export function byId(id) {
  return ALGORITHMS.find((a) => a.id === id) ?? null
}
