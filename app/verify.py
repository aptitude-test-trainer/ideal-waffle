"""Independent answer checker. Recomputes every key from the item parameters
using different logic from the JS generators, then checks that exactly one
choice matches, all choices are distinct, and every SVG parses."""
import json, math, sys, collections
import xml.etree.ElementTree as ET
from fractions import Fraction as F

items = json.load(open('dump.json'))
errors = collections.Counter(); samples = {}
counts = collections.Counter(); letters = collections.defaultdict(collections.Counter)

def fail(it, msg):
    errors[(it['type'], msg)] += 1
    samples.setdefault((it['type'], msg), it['code'] + ' ' + it['id'])

# ---------- per-type solvers ----------
def gear_dir(p):
    g = p['gears']; n = len(g)
    adj = {i: [] for i in range(n)}
    for i in range(n):
        for j in range(i + 1, n):
            d = math.dist((g[i]['x'], g[i]['y']), (g[j]['x'], g[j]['y']))
            if abs(d - (g[i]['r'] + g[j]['r'])) < 0.3:
                adj[i].append(j); adj[j].append(i)
            elif d < g[i]['r'] + g[j]['r'] + 5:
                return 'OVERLAP'
    color = {0: 0}; stack = [0]; bip = True
    while stack:
        u = stack.pop()
        for v in adj[u]:
            if v not in color: color[v] = 1 - color[u]; stack.append(v)
            elif color[v] == color[u]: bip = False
    t = p['target']
    if t not in color: return 'DISCONNECTED'
    if not bip: return 'none'
    same = color[t] == 0
    return ('cw' if p['cw'] else 'ccw') if same else ('ccw' if p['cw'] else 'cw')

def gear_speed(p):
    a, b = p['t1'], p['t2']  # idlers never change speed
    if a == b: return 'same'
    small = 'A' if a < b else 'B'
    return small if p['ask'] == 'faster' else ('B' if small == 'A' else 'A')

def belt_dir(p):
    d = 1 if p['cw'] else -1
    for b in p['belts']: d = d * (-1 if b == 'crossed' else 1)
    return 'cw' if d == 1 else 'ccw'

def belt_speed(p):
    if p['dA'] == p['dB']: return 'same'
    small = 'A' if p['dA'] < p['dB'] else 'B'
    return small if p['ask'] == 'faster' else ('B' if small == 'A' else 'A')

def pulley(p):
    # count rope segments that run between the top level and the moving block, inside the block's span
    lo, hi = p['span']
    n = sum(1 for (x1, y1, x2, y2) in p['segs']
            if x1 == x2 and lo < x1 < hi and min(y1, y2) <= p['ytop'] and max(y1, y2) >= p['movingY'])
    if n != p['n']: return 'COUNT%d' % n
    return F(p['h'] * n) if p['rope'] else F(p['W'] + p.get('bw', 0), n)

def lever(p):
    ra = F(p['A']['load'], p['A']['eff']); rb = F(p['B']['load'], p['B']['eff'])  # effort is proportional to load arm / effort arm
    if ra == rb: return 'same'
    easier = 'A' if ra < rb else 'B'
    return easier if p['ask'] == 'less' else ('B' if easier == 'A' else 'A')

def ramp(p):
    if 'ask' in p:
        s = {k: F(p[k]['h'] ** 2, p[k]['h'] ** 2 + p[k]['run'] ** 2) for k in 'AB'}  # (sin of the slope) squared
        if s['A'] == s['B']: return 'same'
        gentler = 'A' if s['A'] < s['B'] else 'B'
        return gentler if p['ask'] == 'less' else ('B' if gentler == 'A' else 'A')
    if 'La' in p:
        return 'same' if p['La'] == p['Lb'] else ('A' if p['La'] > p['Lb'] else 'B')
    assert p['h'] ** 2 + p['run'] ** 2 == p['L'] ** 2
    return F(p['W'] * p['h'], p['L'])

def hydraulic(p):
    if p['mode'] == 'press':
        a, b = p['ks']
        return 'same' if a == b else ('A' if a > b else 'B')
    ratio = F(p['D'], p['d']) ** 2
    if p['mode'] == 'compare': return 'B' if p['smallLabel'] == 'A' else 'A'
    if p['mode'] == 'out': return p['value'] * ratio
    if p['mode'] == 'dist': return F(p['value']) / ratio
    return F(p['load']) / ratio

def comp(t):
    if t == 's': return F(1)
    vals = [comp(x) for x in t[1:]]
    return sum(vals) if t[0] == 'S' else 1 / sum(1 / x for x in vals)

def springs(p):
    if 'ask' in p:
        a, b = comp(p['A']), comp(p['B'])
        if a == b: return 'same'
        more = 'A' if a > b else 'B'
        return more if p['ask'] == 'farther' else ('B' if more == 'A' else 'A')
    if p['mode'] == 'compare': return p['seriesLabel']
    k = F(p['w0'], p['s'])  # lb per inch
    if p['mode'] == 'weight':
        T = F(p['T']).limit_denominator(1000)
        return T * k / p['n'] if p['arr'] == 'series' else T * k * p['n']
    if p['mode'] == 'series': return p['n'] * F(p['W']) / k
    return F(p['W']) / (p['n'] * k)

def pressure(p):
    return 'same' if p['dA'] == p['dB'] else ('A' if p['dA'] > p['dB'] else 'B')

def wheel(p):
    return 'same' if p['rA'] == p['rB'] else ('A' if p['rA'] > p['rB'] else 'B')

def stability(p):
    a = math.atan2(p['A'][0], p['A'][1]); b = math.atan2(p['B'][0], p['B'][1])  # tip angle
    if abs(a - b) < 1e-9: return 'same'
    return 'A' if a < b else 'B'

def circuit(p):
    # graph: nodes; edges = conductors; lamp lit if it sits on a path + -> - through it
    edges = []  # (u, v, kind, id)
    top = 'P'
    if p['main']:
        if p['main'] == 'closed': edges.append(('P', 'm1', 'w', None))
        top = 'm1'
    else:
        edges.append(('P', 'm1', 'w', None)); top = 'm1'
    if p['mainLamp']:
        edges.append((top, 'T', 'lamp', p['mainLamp']))
    else:
        edges.append((top, 'T', 'w', None))
    for i, b in enumerate(p['branches']):
        prev = 'T'
        if b['sw']:
            nd = 'b%ds' % i
            if b['sw'] == 'closed': edges.append((prev, nd, 'w', None))
            prev = nd
        for k, l in enumerate(b['lamps']):
            nd = 'N' if k == len(b['lamps']) - 1 else 'b%dl%d' % (i, k)
            edges.append((prev, nd, 'lamp', l)); prev = nd
    def reach(src, dst, skip):
        g = collections.defaultdict(list)
        for e in edges:
            if e is skip: continue
            g[e[0]].append(e[1]); g[e[1]].append(e[0])
        seen = {src}; st = [src]
        while st:
            u = st.pop()
            if u == dst: return True
            for v in g[u]:
                if v not in seen: seen.add(v); st.append(v)
        return False
    lit = []
    for e in edges:
        if e[2] != 'lamp': continue
        u, v = e[0], e[1]
        if (reach('P', u, e) and reach(v, 'N', e)) or (reach('P', v, e) and reach(u, 'N', e)):
            lit.append(e[3])
    return sorted(lit)

N_SHEET = 24
def d4(pts):
    N = N_SHEET
    fs = [lambda x, y: (x, y), lambda x, y: (N - y, x), lambda x, y: (N - x, N - y), lambda x, y: (y, N - x),
          lambda x, y: (N - x, y), lambda x, y: (x, N - y), lambda x, y: (y, x), lambda x, y: (N - y, N - x)]
    return [tuple(sorted((f(x, y) for x, y in pts), key=lambda h: (h[1], h[0]))) for f in fs]

def fold(p):
    """Forward simulation: carry every point of the flat sheet through each fold and see if it lands on a punch."""
    punches = set(map(tuple, p['punches']))
    def side(f, x, y):
        return {'x': x - f['c'], 'y': y - f['c'], 'p': x + y - f['c'], 'm': x - y - f['c']}[f['k']]
    def refl(f, x, y):
        c = f['c']
        # reflect across the line using the general formula for a line a*x+b*y=c
        a, b = {'x': (1, 0), 'y': (0, 1), 'p': (1, 1), 'm': (1, -1)}[f['k']]
        d = (a * x + b * y - c) / (a * a + b * b)
        return (x - 2 * a * d, y - 2 * b * d)
    holes = []
    for x in range(1, 24, 2):
        for y in range(1, 24, 2):
            px, py = x, y
            for f in p['folds']:
                s = side(f, px, py)
                if f['sg'] * s > 0: px, py = refl(f, px, py)
            if any(side(f, *pt) == 0 for f in p['folds'] for pt in [(px, py)]) and (round(px), round(py)) in punches: return 'ONLINE'
            if (round(px), round(py)) in punches and abs(px - round(px)) < 1e-9: holes.append((x, y))
    true = tuple(sorted(holes, key=lambda h: (h[1], h[0])))
    return {'fold': true, 'turned': p.get('turned', False)}

def cubenet(p):
    """Fold the net in 3D (each flap swings 90 degrees away from the viewer about its hinge),
    then list every (top, left, right) view that a real box can show."""
    cells = [tuple(c) for c in p['cells']]; marks = p['marks']
    idx = {c: i for i, c in enumerate(cells)}
    # world: X right, Y up (net rows go down), Z toward the viewer
    corners = {0: [(cells[0][0] + dx, -(cells[0][1] + dy), 0.0) for dx, dy in ((0, 0), (1, 0), (1, 1), (0, 1))]}
    import numpy as np
    def normal(cs):
        a, b, c = map(np.array, cs[:3]); n = np.cross(b - a, c - a); return n / np.linalg.norm(n)
    # outward normal of the base face must point to +Z (viewer); fix winding by that
    order = [0]; seen = {0}; parent = {}
    while order:
        i = order.pop(0); x, y = cells[i]
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            j = idx.get((x + dx, y + dy))
            if j is None or j in seen: continue
            seen.add(j); parent[j] = i; order.append(j)
    # recursive folding using rotation of the child's unfolded square about the shared edge
    def fold_child(i, j):
        cen = centers[i]
        n_out = outward[i]
        (x, y), (u, v) = cells[i], cells[j]
        # edge midpoint direction in the net: from parent center to child center
        d_net = np.array([u - x, -(v - y), 0.0])
        # parent in-plane axes in 3D: map net X and net Y to the parent's 3D frame
        ex, ey = frames[i]
        e = ex * d_net[0] + ey * d_net[1]
        hinge_mid = cen + e * 0.5
        # child center: from hinge, go 0.5 inward (away from viewer = -n_out)
        child_cen = hinge_mid - n_out * 0.5
        outward[j] = e / np.linalg.norm(e)
        # child's frame: the axis along e becomes -n_out; other axis unchanged
        if abs(d_net[0]) > 0: frames[j] = (-n_out * d_net[0], ey)
        else: frames[j] = (ex, -n_out * d_net[1])
        centers[j] = child_cen
    outward = {0: np.array([0.0, 0.0, 1.0])}; frames = {0: (np.array([1.0, 0, 0]), np.array([0, 1.0, 0]))}
    centers = {0: np.array([cells[0][0] + 0.5, -(cells[0][1] + 0.5), 0.0])}
    bfs = [0]; done = {0}
    while bfs:
        i = bfs.pop(0)
        for j, pi in parent.items():
            if pi == i and j not in done: fold_child(i, j); done.add(j); bfs.append(j)
    cube_c = sum(centers.values()) / 6
    normals = {}
    for i in range(6):
        n = centers[i] - cube_c; n = n / np.linalg.norm(n)
        if np.linalg.norm(n - outward[i]) > 1e-6: return 'GEOMETRY'
        normals[i] = tuple(int(round(t)) for t in n)
    if len(set(normals.values())) != 6: return 'GEOMETRY'
    valid = set()
    for a in range(6):
        for b in range(6):
            for c in range(6):
                if len({a, b, c}) < 3: continue
                na, nb, nc = map(np.array, (normals[a], normals[b], normals[c]))
                if na @ nb or nb @ nc or na @ nc: continue
                if na @ np.cross(nb, nc) > 0: valid.add('|'.join((marks[a], marks[b], marks[c])))
    return valid

SOLVE = dict(gearDir=gear_dir, gearSpeed=gear_speed, beltDir=belt_dir, beltSpeed=belt_speed, pulley=pulley,
             lever=lever, ramp=ramp, hydraulic=hydraulic, springs=springs, pressure=pressure, wheel=wheel,
             stability=stability, circuit=circuit, fold=fold, cubenet=cubenet)
from verify_concepts import CSOLVE
SOLVE.update(CSOLVE)
from verify_new import NSOLVE
SOLVE.update(NSOLVE)

def norm(k):
    if isinstance(k, (int, float)) and not isinstance(k, bool): return F(k).limit_denominator(1000)
    if isinstance(k, list) and k and isinstance(k[0], list): return tuple(sorted(map(tuple, k), key=lambda h: (h[1], h[0])))
    if isinstance(k, list): return tuple(sorted(k))
    return k

stems = collections.defaultdict(set)
for it in items:
    counts[it['type']] += 1
    try:
        ans = SOLVE[it['type']](it['params'])
    except Exception as e:
        fail(it, 'solver error %r' % e); continue
    if isinstance(ans, str) and (ans in ('GEOMETRY', 'ONLINE', 'OVERLAP', 'DISCONNECTED', 'AMBIG', 'LOCK', 'CONFLICT') or ans.startswith('COUNT')):
        fail(it, 'geometry ' + ans); continue
    keys = [norm(k) for k in it['keys']]
    if isinstance(ans, dict) and 'fold' in ans:
        orb = set(d4(ans['fold']))
        matches = [i for i, k in enumerate(keys) if k in orb]
        if not ans['turned']:
            exact = [i for i, k in enumerate(keys) if k == ans['fold']]
            if len(exact) != 1 or exact[0] != it['correct']: fail(it, 'exact answer missing')
        canon = [min(d4(k)) for k in keys]
        if len(set(canon)) != len(canon): fail(it, 'two choices are the same pattern turned or flipped')
    elif isinstance(ans, set):
        matches = [i for i, k in enumerate(keys) if k in ans]
    else:
        a = norm(ans)
        matches = [i for i, k in enumerate(keys) if k == a]
    if len(matches) != 1: fail(it, 'matches=%d' % len(matches))
    elif matches[0] != it['correct']: fail(it, 'key mismatch')
    if len(set(keys)) != len(keys): fail(it, 'duplicate choices')
    if any(isinstance(k, F) and (k < 0 or (k == 0 and it['type'] != 'rack')) for k in keys): fail(it, 'non-positive value')
    want = 5 if it['type'] == 'fold' else 4 if it['type'] in ('cubenet', 'balfig') else 3
    if len(keys) != want: fail(it, 'choice count')
    letters[it['sec']][it['correct']] += 1
    for s in [it['svg']] + [c for c in it['chsvg'] if c]:
        try: ET.fromstring(s)
        except Exception as e: fail(it, 'svg parse'); break
    if it['type'] == 'fold':
        sets = [set(map(tuple, k)) for k in it['keys']]
        if any(not (1 <= x <= 23 and 1 <= y <= 23) for s in sets for (x, y) in s): fail(it, 'hole drawn off the paper')
        if not it['params'].get('turned'):
            c = sets[it['correct']]; wr = [s for i, s in enumerate(sets) if i != it['correct']]
            minC = min(len(c ^ w) for w in wr); minW = min(len(a ^ b) for i, a in enumerate(wr) for b in wr[i + 1:])
            if minW > minC: fail(it, 'correct answer is the only one with a look-alike')

# per-test checks
tests = collections.defaultdict(list)
for it in items: tests[it['code']].append(it)
for code, its in tests.items():
    f = [i for i in its if i['sec'] == 'fold']; m = [i for i in its if i['sec'] == 'mech']; cc = [i for i in its if i['sec'] == 'concept']
    if not code.startswith('END') and (len(f) != 30 or len(m) != 45 or len(cc) != 45 or len([i for i in its if i['sec']=='net']) != 15): errors[('test', 'section size')] += 1
    sig = [i['type'] + json.dumps(i['params'], sort_keys=True) for i in its]
    if len(set(sig)) != len(sig): errors[('test', 'duplicate item in one test')] += 1

print('Checked %d items across %d tests' % (len(items), len(tests)))
for t, c in sorted(counts.items()): print('  %-11s %6d' % (t, c))
for sec, c in letters.items():
    tot = sum(c.values()); print(sec, 'correct-letter share:', {'ABCDE'[k]: round(100 * v / tot, 1) for k, v in sorted(c.items())})
if errors:
    print('ERRORS:')
    for k, v in errors.items(): print('  ', k, v, samples.get(k))
    sys.exit(1)
print('ALL CHECKS PASSED')
