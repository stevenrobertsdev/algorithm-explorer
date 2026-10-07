import sys
import json
import math
import time
import traceback

USER = '<algorithm>'
sys.setrecursionlimit(3000)


class StepLimit(Exception):
    pass


class EventLimit(Exception):
    pass


def plain(v, width=48):
    t = type(v)
    if t is bool or v is None:
        return v
    if t is int:
        return v if -(2 ** 53) < v < 2 ** 53 else short(v, width)
    if t is float:
        return v if math.isfinite(v) else repr(v)
    return short(v, width)


def short(v, width=48):
    try:
        s = repr(v)
    except Exception:
        s = '<' + type(v).__name__ + '>'
    return s if len(s) <= width else s[: width - 1] + '…'


class Recorder:
    def __init__(self, mode, budget, max_events):
        self.mode = mode
        self.budget = budget
        self.max_events = max_events
        self.events = []
        self.frames = 0
        self.steps = 0
        self.calls = 0
        self.reads = 0
        self.writes = 0
        self.depth = 0
        self.max_depth = 0
        self.lines = {}

    def emit(self, ev):
        if self.mode == 'trace':
            self.events.append(ev)


class Tracked(list):
    __slots__ = ('_rec',)

    def __init__(self, data, rec=None):
        list.__init__(self, data)
        self._rec = rec

    def __getitem__(self, i):
        v = list.__getitem__(self, i)
        r = self._rec
        if r is not None and type(i) is int:
            r.reads += 1
            r.emit(('r', i + len(self) if i < 0 else i))
        return v

    def __setitem__(self, i, v):
        list.__setitem__(self, i, v)
        r = self._rec
        if r is not None:
            r.writes += 1
            if type(i) is int:
                r.emit(('w', i + len(self) if i < 0 else i, plain(v)))
            else:
                r.emit(('s', [plain(x) for x in self]))


def _mutator(name):
    base = getattr(list, name)

    def method(self, *args, **kwargs):
        out = base(self, *args, **kwargs)
        r = self._rec
        if r is not None:
            r.writes += 1
            r.emit(('s', [plain(x) for x in self]))
        return out

    method.__name__ = name
    return method


for _name in ('append', 'extend', 'insert', 'pop', 'remove', 'clear', 'sort', 'reverse', '__delitem__', '__iadd__', '__imul__'):
    setattr(Tracked, _name, _mutator(_name))


class Output:
    def __init__(self, rec, limit=20000):
        self.rec = rec
        self.text = []
        self.size = 0
        self.limit = limit

    def write(self, s):
        if self.size < self.limit:
            self.text.append(s)
            self.size += len(s)
            self.rec.emit(('o', s))
        return len(s)

    def flush(self):
        pass


def snapshot(frame, arr):
    out = {}
    for k, v in frame.f_locals.items():
        if k.startswith('__'):
            continue
        if arr is not None and v is arr:
            out[k] = '@arr'
            continue
        t = type(v)
        if t in (int, float, bool) or v is None:
            out[k] = plain(v)
        elif t is str:
            out[k] = short(v, 40)
        elif t in (list, tuple, dict, set, frozenset, range) or isinstance(v, list):
            out[k] = short(v, 64)
        elif callable(v) or t.__name__ == 'module':
            continue
        else:
            out[k] = short(v, 40)
    return out


def call_args(frame, arr):
    code = frame.f_code
    names = code.co_varnames[: code.co_argcount]
    parts = []
    for n in names:
        v = frame.f_locals.get(n)
        parts.append('arr' if arr is not None and v is arr else short(v, 24))
    return ', '.join(parts)


def make_tracer(rec, arr):
    tracing = rec.mode == 'trace'

    def tracer(frame, event, arg):
        code = frame.f_code
        if code.co_filename != USER:
            return None
        if event == 'line':
            rec.steps += 1
            ln = frame.f_lineno
            rec.lines[ln] = rec.lines.get(ln, 0) + 1
            if rec.steps > rec.budget:
                raise StepLimit()
            if tracing:
                rec.frames += 1
                if rec.frames > rec.max_events:
                    raise EventLimit()
                rec.emit(('l', ln, rec.depth, snapshot(frame, arr)))
        elif event == 'call':
            rec.calls += 1
            rec.depth += 1
            if rec.depth > rec.max_depth:
                rec.max_depth = rec.depth
            if tracing:
                rec.emit(('c', code.co_name, call_args(frame, arr), rec.depth))
        elif event == 'return':
            if tracing:
                rec.emit(('x', code.co_name, short(arg, 32), rec.depth))
            rec.depth -= 1
        return tracer

    return tracer


def load(code, entry):
    rec = Recorder('count', 2_000_000, 0)
    ns = {'__name__': '__algorithm__'}
    compiled = compile(code, USER, 'exec')
    old = sys.stdout
    sys.stdout = Output(rec)
    sys.settrace(make_tracer(rec, None))
    try:
        exec(compiled, ns)
    finally:
        sys.settrace(None)
        sys.stdout = old
    fn = ns.get(entry)
    if not callable(fn):
        raise NameError(f"Define a function called {entry}(...) for the explorer to call.")
    return fn


def make_args(inp, rec, plain_list=False):
    kind = inp['kind']
    if kind == 'number':
        return (int(inp['n']),), None
    data = list(inp['arr'])
    arr = data if plain_list else Tracked(data, rec)
    if kind == 'search':
        return (arr, inp['target']), arr
    return (arr,), arr


def check(kind, inp, ret, arr):
    if kind == 'sorted':
        out = ret if isinstance(ret, list) else arr
        try:
            return list(out) == sorted(inp['arr'])
        except Exception:
            return False
    if kind == 'search':
        data = inp['arr']
        target = inp['target']
        if target in data:
            return type(ret) is int and 0 <= ret < len(data) and data[ret] == target
        return ret is None or ret == -1
    return None


def error_info(exc):
    tb = traceback.extract_tb(exc.__traceback__)
    line = None
    for fr in tb:
        if fr.filename == USER:
            line = fr.lineno
    if isinstance(exc, SyntaxError) and exc.filename == USER:
        line = exc.lineno
    if isinstance(exc, RecursionError):
        message = 'RecursionError: the recursion went deeper than Python allows. Try a smaller input.'
    elif isinstance(exc, SyntaxError):
        message = f'{type(exc).__name__}: {exc.msg}'
    else:
        message = ''.join(traceback.format_exception_only(type(exc), exc)).strip()
    return {'message': message, 'line': line}


def run_trace(payload):
    req = json.loads(payload)
    rec = Recorder('trace', req.get('budget', 400_000), req.get('maxFrames', 6000))
    result = {'ok': True}
    out = Output(rec)
    try:
        fn = load(req['code'], req['entry'])
        args, arr = make_args(req['input'], rec)
        old = sys.stdout
        sys.stdout = out
        sys.settrace(make_tracer(rec, arr))
        try:
            ret = fn(*args)
        finally:
            sys.settrace(None)
            sys.stdout = old
        result['result'] = plain(ret, 120)
        if isinstance(ret, list) and ret is not arr:
            result['returnedList'] = [plain(x) for x in ret[:256]]
        result['correct'] = check(req.get('check'), req['input'], ret, arr)
        if arr is not None:
            result['final'] = [plain(x) for x in arr]
    except EventLimit:
        result['truncated'] = True
    except StepLimit:
        result['truncated'] = True
    except Exception as exc:
        result['ok'] = False
        result['error'] = error_info(exc)
    result.update(
        events=rec.events,
        steps=rec.steps,
        calls=rec.calls,
        reads=rec.reads,
        writes=rec.writes,
        maxDepth=rec.max_depth,
        lines=rec.lines,
        stdout=''.join(out.text),
    )
    return json.dumps(result, default=str)


def run_count(payload):
    req = json.loads(payload)
    inp = req['input']
    rec = Recorder('count', req.get('budget', 3_000_000), 0)
    point = {'n': req['n'], 'ok': True}
    try:
        fn = load(req['code'], req['entry'])
        args, arr = make_args(inp, rec)
        old = sys.stdout
        sys.stdout = Output(rec, 0)
        sys.settrace(make_tracer(rec, arr))
        try:
            ret = fn(*args)
        finally:
            sys.settrace(None)
            sys.stdout = old
        point['correct'] = check(req.get('check'), inp, ret, arr)
        point['result'] = plain(ret, 40)
        sys.stdout = Output(rec, 0)
        try:
            reps = 0
            total = 0.0
            while reps < 200 and (reps == 0 or total < 0.015):
                a, _ = make_args(inp, None, plain_list=True)
                t0 = time.perf_counter()
                fn(*a)
                total += time.perf_counter() - t0
                reps += 1
            point['ms'] = total / reps * 1000
        finally:
            sys.stdout = old
    except StepLimit:
        point['ok'] = False
        point['limit'] = True
    except Exception as exc:
        point['ok'] = False
        point['error'] = error_info(exc)
    point.update(
        steps=rec.steps,
        calls=rec.calls,
        reads=rec.reads,
        writes=rec.writes,
        maxDepth=rec.max_depth,
        lines=rec.lines,
    )
    return json.dumps(point, default=str)
