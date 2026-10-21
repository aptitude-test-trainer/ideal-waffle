# Independent checker for the ETA math items. It never uses the generator's answers: it reads the
# question text/HTML, rebuilds the math with Python fractions, and decides which choice is right.
import json, re, random, math, sys
from fractions import Fraction as F
from collections import Counter

items = json.load(open('mathdump.json'))
MI = '−'
rnd = random.Random(7)

def html_to_expr(h):
    s = h
    s = s.replace('&emsp;', ' ; ').replace('&ensp;', ' ').replace('<br>', ' ; ').replace(MI, '-').replace('π', 'pi')
    s = re.sub(r'<i>([A-Za-z])</i><sub>(\d)</sub>', r'\1\2', s)
    s = s.replace('<i>', '').replace('</i>', '')
    s = re.sub(r'<sup>(\d+)</sup>', r'**\1', s)
    for _ in range(10):
        s2 = re.sub(r'<span class="fr"><span>([^<]*)</span><span>([^<]*)</span></span>', r'((\1)/(\2))', s)
        s2 = re.sub(r'<span class="sqrt">√<span>([^<]*)</span></span>', r'sqrt(\1)', s2)
        if s2 == s: break
        s = s2
    s = re.sub(r'<[^>]+>', '', s)
    # implicit multiplication: 2x, x(…), )(, )x, xy
    s = re.sub(r'(\d|\))\s*(?=[A-Za-z(])', r'\1*', s)
    s = re.sub(r'\b([A-Za-z]\d?)\s*(?=\()', lambda m: m.group(1) + ('*' if m.group(1) not in ('sqrt',) else ''), s)
    for _ in range(4):
        s = re.sub(r'(?<![A-Za-z])([A-Za-z]\d?)(?=[A-Za-z])', lambda m: m.group(1) + '*' if not s[m.end():].startswith('qrt') and m.group(1) != 's' else m.group(1), s)
    s = s.replace('s*q*r*t', 'sqrt').replace('p*i', 'pi')
    s = re.sub(r'\b([A-Za-z]\d?)\s*(?=\()', lambda m: m.group(1) + ('*' if m.group(1) != 'sqrt' else ''), s)
    s = re.sub(r'(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])', r'_Q("\1")', s)
    return s

def ev(expr, env):
    env2 = dict(env); env2['_Q'] = F; env2['sqrt'] = lambda x: F(math.sqrt(float(x))) if not isinstance(x, float) else math.sqrt(x); env2['pi'] = F(math.pi)
    return eval(expr, {'__builtins__': {}}, env2)

def letters(expr):
    return sorted(set(re.findall(r'\b([A-Za-z]\d?)\b', expr)) - {'sqrt', 'pi'})

fails = Counter(); checked = Counter(); msgs = []
def safe_eq(L, Rr, env):
    try: return ev(L, env) == ev(Rr, env)
    except ZeroDivisionError: return False

def fail(it, why):
    fails[it['type']] += 1
    if len(msgs) < 25: msgs.append(f"{it['type']}: {why} | {it['stem'][:90]}")

def one_right(it, oks):
    if sum(oks) != 1: fail(it, f'{sum(oks)} choices pass: {oks}'); return
    if oks.index(True) != it['correct']: fail(it, f'checker picks {oks.index(True)}, item says {it["correct"]}')

def givens(stemH):
    g = {}
    for k, val in re.findall(r'<i>([A-Za-z])</i> = (\d+)', stemH): g[k] = F(int(val))
    return g

def fig_expr(it):
    m = re.search(r'<div class="mathblk">(.*)</div>', it['fig'], re.S)
    return html_to_expr(m.group(1)) if m else None

# ---------- series: fit families of rules independently ----------
def series_predictions(s):
    preds = set(); n = len(s)
    def ok_all(f, k0):
        return all(abs(f(i) - s[i]) < 1e-6 for i in range(k0, n))
    # a_{i+1} = r a_i + c
    if s[1] != s[0]:
        for r in [1, 2, 3, 4]:
            c = s[1] - r * s[0]
            if all(abs(s[i + 1] - (r * s[i] + c)) < 1e-6 for i in range(n - 1)): preds.add(round(r * s[-1] + c, 6))
    # alternating ±c after ×2
    for c in range(1, 5):
        for st in (1, -1):
            if all(abs(s[i + 1] - (2 * s[i] + (c if (i % 2 == (0 if st == 1 else 1)) else -c))) < 1e-6 for i in range(n - 1)):
                i = n - 1; preds.add(2 * s[-1] + (c if (i % 2 == (0 if st == 1 else 1)) else -c))
    d = [s[i + 1] - s[i] for i in range(n - 1)]
    # differences arithmetic
    dd = [d[i + 1] - d[i] for i in range(len(d) - 1)]
    if len(set(round(x, 6) for x in dd)) == 1: preds.add(round(s[-1] + d[-1] + dd[0], 6))
    # differences geometric
    if all(x != 0 for x in d):
        rs = [d[i + 1] / d[i] for i in range(len(d) - 1)]
        if len(set(round(x, 6) for x in rs)) == 1: preds.add(round(s[-1] + d[-1] * rs[0], 6))
    # fib
    if all(abs(s[i] - (s[i - 1] + s[i - 2])) < 1e-6 for i in range(2, n)): preds.add(s[-1] + s[-2])
    # interleaved arithmetic
    a, b = s[0::2], s[1::2]
    def arith(x): return len(set(x[i + 1] - x[i] for i in range(len(x) - 1))) <= 1 and len(x) >= 2
    if arith(a) and arith(b) and len(a) >= 2 and len(b) >= 2:
        nxt = a if n % 2 == 0 else b
        preds.add(nxt[-1] + (nxt[-1] - nxt[-2]))
    # repeating two-step ops: (×m then −k), (+u then −d)
    for m in [2, 3]:
        for k in range(1, 6):
            if all(abs(s[i + 1] - (s[i] * m if i % 2 == 0 else s[i] - k)) < 1e-6 for i in range(n - 1)):
                preds.add(s[-1] * m if (n - 1) % 2 == 0 else s[-1] - k)
    for u in range(1, 10):
        for dn in range(1, 6):
            if all(abs(s[i + 1] - (s[i] + u if i % 2 == 0 else s[i] - dn)) < 1e-6 for i in range(n - 1)):
                preds.add(s[-1] + u if (n - 1) % 2 == 0 else s[-1] - dn)
    # geometric decimals
    if all(s[i] != 0 for i in range(n)):
        rs = [s[i + 1] / s[i] for i in range(n - 1)]
        if len(set(round(x, 6) for x in rs)) == 1: preds.add(round(s[-1] * rs[0], 6))
    return {round(p, 6) for p in preds}

def numval(t): return float(t.replace(MI, '-'))

# ---------- graphs: read lines back out of the SVG using the tick labels ----------
def svg_lines(svg):
    xt = [(float(x), float(y), numval(t)) for x, y, t in re.findall(r'<text x="([\d.\-]+)" y="([\d.\-]+)" class="gr-t">([^<]+)</text>', svg)]
    yt = [(float(x), float(y), numval(t)) for x, y, t in re.findall(r'<text x="([\d.\-]+)" y="([\d.\-]+)" class="gr-t" text-anchor="end">([^<]+)</text>', svg)]
    # x: px = ax*v + bx ; y: py = ay*v + by (the +3.5 baseline offset cancels in the fit)
    def fit(pts):
        (p1, v1), (p2, v2) = pts[0], pts[-1]
        a = (p2 - p1) / (v2 - v1); return a, p1 - a * v1
    ax, bx = fit([(p[0], p[2]) for p in xt]); ay, by = fit([(p[1] - 3.5, p[2]) for p in yt])
    out = []
    for x1, y1, x2, y2 in re.findall(r'<line x1="([\d.\-]+)" y1="([\d.\-]+)" x2="([\d.\-]+)" y2="([\d.\-]+)" class="gr-line', svg):
        X1, X2 = (float(x1) - bx) / ax, (float(x2) - bx) / ax; Y1, Y2 = (float(y1) - by) / ay, (float(y2) - by) / ay
        m = (Y2 - Y1) / (X2 - X1); out.append((round(m, 2), round(Y1 - m * X1, 2)))
    return out

def close(a,b): return abs(a[0]-b[0])<0.05 and abs(a[1]-b[1])<0.05

def parse_line_eq(e):
    # 'y = m*x + b' style after html_to_expr ; returns (m,b) by evaluating at x=0,1
    rhs = e.split('=')[1]
    f = lambda x: ev(rhs, {'x': F(x)})
    b = f(0); m = f(1) - b; return (round(float(m), 2), round(float(b), 2))

def std_to_mb(e):
    lhs, rhs = e.split('=')
    g = lambda x, y: ev(lhs, {'x': F(x), 'y': F(y)}) - ev(rhs, {'x': F(x), 'y': F(y)})
    # linear: g = A x + B y + C
    C = g(0, 0); A = g(1, 0) - C; B = g(0, 1) - C
    return (round(float(-A / B), 2), round(float(-C / B), 2))

# ---------- words ----------
WORDS = {w: i for i, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split())}
def wn(w): return WORDS[w] if w in WORDS else int(w)
def words_fn(t):
    t = t.lower().rstrip('.')
    m = re.match(r'y is equivalent to (\w+) times the value of x divided by (\w+)$', t)
    if m: return F(wn(m.group(1)), wn(m.group(2))), F(0)
    m = re.match(r'y is equal to (the negative of |negative )?(?:(\w+) times )?the value of x(?: divided by (\w+))?(?:, (plus|minus) (\w+))?$', t)
    if m:
        k = F(wn(m.group(2))) if m.group(2) else F(1)
        if m.group(3): k = k / wn(m.group(3))
        if m.group(1): k = -k
        b = F(0)
        if m.group(4): b = F(wn(m.group(5))) * (1 if m.group(4) == 'plus' else -1)
        return k, b
    raise ValueError('words? ' + t)

def table_rows(h):
    return [(F(numval(a)), F(numval(b))) for a, b in re.findall(r'<tr><td>([^<]+)</td><td>([^<]+)</td></tr>', h)]

def rep_fn(it, c):
    """(m,b) a choice represents, or a predicate on (m,b)"""
    if c.get('svg'):
        L = svg_lines(c['svg']); return ('line', L[0])
    h = c['h'] or ''
    if '<table' in h: return ('table', table_rows(h))
    if 'class="wds"' in h: return ('mb', words_fn(re.sub(r'<[^>]+>', '', h)))
    raise ValueError('rep?')

def matches(rep, mb):
    m, b = mb
    if rep[0] == 'line': return abs(rep[1][0] - float(m)) < 0.05 and abs(rep[1][1] - float(b)) < 0.05
    if rep[0] == 'table': return all(y == m * x + b for x, y in rep[1])
    if rep[0] == 'mb': return rep[1][0] == m and rep[1][1] == b

for it in items:
    t = it['type']; checked[t] += 1
    try:
        if t == 'etaSeries':
            s = [numval(x) for x in re.sub(r'<[^>]+>', ' ', it['fig']).replace('&ensp;', ' ').split() if x != '?']
            P = series_predictions(s)
            oks = [round(numval(c['t']), 6) in P for c in it['choices']]
            one_right(it, oks)
        elif t in ('etaSolve',):
            e = fig_expr(it); g = givens(it['stemH']); L, Rr = e.split('=')
            unk = [x for x in letters(e) if x not in g][0]
            oks = [ev(L, dict(g, **{unk: F(int(c['t']))})) == ev(Rr, dict(g, **{unk: F(int(c['t']))})) for c in it['choices']]
            one_right(it, oks)
        elif t == 'etaEval':
            e = fig_expr(it); g = givens(it['stemH']); L = e.split('=')[0]
            val = ev(L, g)
            oks = [F(numval(c['t'])) == val for c in it['choices']]; one_right(it, oks)
        elif t == 'etaPoly':
            e = fig_expr(it); e = e.split('=')[-1]
            vs = letters(e); pts = [{v: F(rnd.randint(-9, 9), rnd.randint(1, 5)) for v in vs} for _ in range(4)]
            oks = []
            for c in it['choices']:
                ce = html_to_expr(c['h'])
                oks.append(all(ev(ce, p) == ev(e, p) for p in pts))
            one_right(it, oks)
        elif t == 'etaRelation':
            e = fig_expr(it); L, Rr = e.split('='); U, W = None, None
            vs = letters(e)
            notmode = 'NOT' in it['stemH']
            res = []
            for c in it['choices']:
                m = re.match(r'When the value of (\w+) is (greater|less) than ([\-−0-9]+), (\w+) is (positive|negative)\.', c['t'])
                inL, cmp_, Tv, outL, sg = m.group(1), m.group(2), F(int(m.group(3).replace(MI, '-'))), m.group(4), m.group(5)
                # solve the linear relation for outL at sample inL values
                allok = True
                for k in range(1, 300):
                    x = Tv + F(k, 20) * (1 if cmp_ == 'greater' else -1)
                    g = lambda y: ev(L, {inL: x, outL: y}) - ev(Rr, {inL: x, outL: y})
                    g0, g1 = g(F(0)), g(F(1)); y = -g0 / (g1 - g0)
                    if not ((y > 0) if sg == 'positive' else (y < 0)): allok = False; break
                res.append(allok)
            oks = [not r for r in res] if notmode else res
            one_right(it, oks)
        elif t == 'etaSame':
            blkh = re.search(r'<div class="mathblk">(.*)</div>', it['fig'], re.S).group(1)
            if '<table' in blkh:
                rows = table_rows(blkh); (x1, y1), (x2, y2) = rows[0], rows[1]; m = (y2 - y1) / (x2 - x1); b = y1 - m * x1
                assert all(y == m * x + b for x, y in rows)
            elif 'class="wds"' in blkh: m, b = words_fn(re.sub(r'<[^>]+>', '', blkh))
            else:
                mm, bb = parse_line_eq(html_to_expr(blkh)); m, b = F(mm).limit_denominator(10), F(bb).limit_denominator(10)
            oks = [matches(rep_fn(it, c), (m, b)) for c in it['choices']]; one_right(it, oks)
        elif t == 'etaGraph':
            e = html_to_expr(re.search(r'function (.*)\?', it['stemH']).group(1)); mb = parse_line_eq(e)
            oks = [len(svg_lines(c['svg'])) == 1 and close(svg_lines(c['svg'])[0], mb) for c in it['choices']]; one_right(it, oks)
        elif t == 'etaSystemGraph':
            e = fig_expr(it); eqs = [x.strip() for x in e.split(';')]; want = sorted(std_to_mb(q) for q in eqs)
            oks = [len(svg_lines(c['svg']))==2 and all(close(a,b) for a,b in zip(sorted(svg_lines(c['svg'])), want)) for c in it['choices']]; one_right(it, oks)
        elif t == 'etaSlope':
            mb = svg_lines(it['fig'])[0]
            oks = [close(parse_line_eq(html_to_expr(c['h'])), mb) for c in it['choices']]; one_right(it, oks)
        elif t == 'etaIsolate':
            e = fig_expr(it); eqs = [x.strip() for x in e.split(';') if x.strip()]
            oks = []
            for c in it['choices']:
                ce = html_to_expr(c['h']); tv, expr = [x.strip() for x in ce.split('=', 1)]
                good = True
                tries = 0
                while tries < 4:
                    env = {}
                    for v in set(letters(e)) | set(letters(expr)):
                        env[v] = F(rnd.randint(4, 15), rnd.randint(1, 3))
                    # second equation (r = n/2π) defines r
                    if len(eqs) == 2:
                        a, b2 = eqs[1].split('='); env[a.strip()] = ev(b2, env)
                    try:
                        env[tv] = ev(expr, env)
                        a, b2 = eqs[0].split('=')
                        if abs(float(ev(a, env)) - float(ev(b2, env))) > 1e-6: good = False
                    except ZeroDivisionError:
                        continue
                    tries += 1
                oks.append(good)
            one_right(it, oks)
        elif t == 'etaProp':
            e = fig_expr(it); L, Rr = e.split('=')
            oks = [safe_eq(L, Rr, {'m': F(int(c['t']))}) for c in it['choices']]; one_right(it, oks)
        elif t == 'etaSystem':
            e = fig_expr(it); eqs = [x.strip() for x in e.split(';')]
            oks = []
            for c in it['choices']:
                x, y = [F(numval(z.strip())) for z in c['t'].strip('()').split(',')]
                oks.append(all(ev(q.split('=')[0], {'x': x, 'y': y}) == ev(q.split('=')[1], {'x': x, 'y': y}) for q in eqs))
            one_right(it, oks)
        else:
            fail(it, 'no checker')
        # every choice distinct as shown
        shown = [c['h'] or c['t'] if not c.get('svg') else c['svg'] for c in it['choices']]
        if len(set(shown)) != 4: fail(it, 'two choices look the same')
    except Exception as ex:
        fail(it, 'checker error: ' + repr(ex)[:120] + ' :: ' + str(fig_expr(it))[:80])

print('checked', dict(checked))
print('failures', dict(fails))
for m in msgs: print('  ', m)
lc = Counter(it['correct'] for it in items); print('correct letter share', {k: round(100 * v / len(items), 1) for k, v in sorted(lc.items())})
sys.exit(1 if fails else 0)
