"""Independent solvers for the concept question types (physics recomputed from the
stored geometry, not copied from the generators)."""
import math

def pdist(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    return abs(dx * (a[1] - p[1]) - dy * (a[0] - p[0])) / math.hypot(dx, dy)

def pick(vals, want_max, margin=0.9):
    """vals: dict label->value. Return label of the unique max/min, or AMBIG."""
    items = sorted(vals.items(), key=lambda kv: kv[1], reverse=want_max)
    best, second = items[0][1], items[1][1]
    if want_max and second > margin * best: return 'AMBIG'
    if not want_max and best > margin * second: return 'AMBIG'
    return items[0][0]

def guy(p):
    bx, by = p['base']; arm = by - p['wireY']
    T = {c['label']: arm / pdist((bx, by), c['a'], c['b']) for c in p['cables']}
    return pick(T, p['mode'] == 'worst')

def bridge(p):
    good = []
    for pn in p['panels']:
        pts = pn['cable']
        if any(q is None for q in pts): continue
        x1, x2 = pn['span']
        ends_ok = abs(pts[0][0] - x1) < 1 and abs(pts[-1][0] - x2) < 1
        inner = pts[1:-1]
        # a cable carries a mid-span load only if it sags below the deck (then the load stretches it)
        if ends_ok and inner and all(q[1] > pn['deckBot'] for q in inner) and all(x1 < q[0] < x2 for q in inner):
            good.append(pn['label'])
    return good[0] if len(good) == 1 else 'AMBIG'

def flywheel(p):
    R = p['R']
    def I(t):
        r = R - t
        return math.pi / 2 * (R ** 4 - r ** 4) + 4 * 4 * (r ** 3 - 7 ** 3) / 3
    vals = {w['label']: I(w['t']) for w in p['rims']}
    return pick(vals, p['mode'] != 'easiest', 0.95)

def turn(p):
    if p['mode'] == 'skid':
        c = p['center']
        d = {l['label']: math.dist(c, l['pt']) for l in p['labels']}
        return max(d, key=d.get)
    cx, cy = p['center']; bx, by = p['ball']; r = math.hypot(bx - cx, by - cy)
    v = (-(by - cy) / r * p['dir'], (bx - cx) / r * p['dir'])
    hits = []
    for path in p['paths']:
        pts = path['pts']; a, b = pts[0], pts[-1]
        if math.dist(a, (bx, by)) > 1: continue
        straight = all(pdist(q, a, b) < 0.6 for q in pts[1:-1]) if len(pts) > 2 else True
        u = ((b[0] - a[0]) / math.dist(a, b), (b[1] - a[1]) / math.dist(a, b))
        if straight and u[0] * v[0] + u[1] * v[1] > 0.999: hits.append(path['label'])
    return hits[0] if len(hits) == 1 else 'AMBIG'

def gate(p):
    good = []
    for m in p['members']:
        stretch = m['f'][1] - m['h'][1]  # free side drops (+y); >0 means the member lengthens
        if (p['kind'] == 'cable' and stretch > 0) or (p['kind'] == 'brace' and stretch < 0): good.append(m['label'])
    return good[0] if len(good) == 1 else 'AMBIG'

def jet(p):
    if p['mode'] == 'two':
        yn = p['yn']; h = {}
        for t in p['tanks']:
            h[t['label']] = max(0, yn - t['ys'])  # jet rises to the tank surface
        if h['A'] == h['B']: return 'same'
        return max(h, key=h.get)
    if p['yn'] < p['ys']: return 'none'  # nozzle above the water level
    idx = [i for i, y in enumerate(p['lines']) if abs(y - p['ys']) < 0.5]
    return str(idx[0] + 1) if len(idx) == 1 else 'AMBIG'

def count_segs(s):
    lo, hi = s['span']
    return sum(1 for (x1, y1, x2, y2) in s['segs']
               if x1 == x2 and lo < x1 < hi and min(y1, y2) <= s['ytop'] and max(y1, y2) >= s['movingY'])

def tackle(p):
    n = {s['label']: count_segs(s) for s in p['systems']}
    if n['A'] == n['B']: return 'same'
    more = 'A' if n['A'] > n['B'] else 'B'
    return ('B' if more == 'A' else 'A') if p['mode'] == 'harder' else more

def pump(p):
    if p['mode'] == 'place':
        ok = [q['label'] for q in p['pumps'] if q['top'] == 'up' and q['bot'] == 'up']
        return ok[0] if len(ok) == 1 else 'AMBIG'
    # both flaps open upward only. dp = pressure change in the chamber below the piston
    dp = 1 if p['stroke'] == 'down' else -1
    piston_open = dp > 0      # higher pressure below pushes the piston flap up
    foot_open = dp < 0        # lower pressure above lets the foot flap lift
    if piston_open and not foot_open: return 'piston'
    if foot_open and not piston_open: return 'foot'
    return 'both'

def chain(p):
    a, x0 = p['a'], p['x0']
    s = {h['label']: a * math.sinh(abs(h['x'] - x0) / a) for h in p['hooks']}
    if abs(s['A'] - s['B']) < 1e-6: return 'same'
    return max(s, key=s.get)

def sag(p):
    T = {s['label']: p['W'] * math.hypot(s['half'], s['s']) / (2 * s['s']) for s in p['setups']}
    if abs(T['A'] - T['B']) < 1e-6 * T['A']: return 'same'
    return pick(T, p['mode'] == 'more', 0.97)

def rack(p):
    vT, vB, vC = p['vT'], p['vB'], p['vC']
    if p['ask'] == 'C':
        r = abs((vT + vB) / 2) / max(abs(vT), abs(vB))
    elif p['ask'] == 'T': r = abs(2 * vC - vB) / abs(vC)
    else: r = abs(2 * vC - vT) / abs(vC)
    return {0: 'none', 0.5: 'half', 1: 'same', 2: 'twice'}[r]

def bike(p):
    if p['mode'] == 'num':
        b = [x for x in p['bikes'] if x['label'] == p['target']][0]
        return p['cad'] * b['f'] / b['r']
    r = {b['label']: b['f'] / b['r'] for b in p['bikes']}
    return pick(r, p['mode'] != 'easy', 0.93)

def winch(p):
    if p['mode'] == 'force': return p['W'] * p['r'] / p['R']
    f = {w['label']: p['W'] * w['r'] / w['R'] for w in p['winches']}
    if abs(f['A'] - f['B']) < 1e-9: return 'same'
    return max(f, key=f.get)

def boat(p):
    mult = {}
    for row in p['rows']:
        mult[row['label']] = sum(1 for r in row['ropes'] if max(r[0], r[2]) >= row['bx'] - 20)
    if p['mode'] == 'num': return p['D'] * mult['X']
    if mult['A'] == mult['B']: return 'same'
    return max(mult, key=mult.get)

def vol(s):
    k = s['k']
    if k == 'box': return s['l'] * s['w'] * s['h']
    if k == 'cyl': return math.pi * (s['d'] / 2) ** 2 * s['h']
    if k == 'hex': return 6 * (math.sqrt(3) / 4 * (s['c'] / 2) ** 2) * s['h']
    if k == 'pyr': return s['b'] ** 2 * s['h'] / 3
    if k == 'cone': return math.pi * (s['d'] / 2) ** 2 * s['h'] / 3
    if k == 'tri': return 0.5 * s['s'] * (s['s'] * math.sqrt(3) / 2) * s['l']

def volume(p):
    v = {'A': vol(p['A']), 'B': vol(p['B'])}
    if abs(v['A'] - v['B']) < 1e-9: return 'same'
    return pick(v, p['mode'] == 'more', 0.85)

def linkage(p):
    c1, c2, r1, r2, c = p['c1'], p['c2'], p['r1'], p['r2'], p['c']
    if p['kind'] == 'parallel':
        d = math.dist(c1, c2)
        v1 = (p['pin1'][0] - c1[0], p['pin1'][1] - c1[1]); v2 = (p['pin2'][0] - c2[0], p['pin2'][1] - c2[1])
        if abs(r1 - r2) < 1e-9 and abs(c - d) < 1e-9 and math.dist(v1, v2) < 0.2: return 'same'
        return 'AMBIG'
    th0 = math.atan2(p['pin1'][1] - c1[1], p['pin1'][0] - c1[0])
    ang2 = math.atan2(p['pin2'][1] - c2[1], p['pin2'][0] - c2[0]); total = 0; lo = hi = 0
    sgn = 1 if p['cw'] else -1
    for k in range(1, 1441):
        th = th0 + sgn * 2 * math.pi * k / 1440
        q = (c1[0] + r1 * math.cos(th), c1[1] + r1 * math.sin(th))
        dx, dy = q[0] - c2[0], q[1] - c2[1]; d = math.hypot(dx, dy)
        if d > r2 + c or d < abs(r2 - c): return 'LOCK'
        a = (r2 * r2 - c * c + d * d) / (2 * d); h = math.sqrt(max(0, r2 * r2 - a * a))
        mx, my = c2[0] + a * dx / d, c2[1] + a * dy / d
        cands = [math.atan2(my - h * dx / d - c2[1], mx + h * dy / d - c2[0]), math.atan2(my + h * dx / d - c2[1], mx - h * dy / d - c2[0])]
        step = min((math.atan2(math.sin(x - ang2), math.cos(x - ang2)) for x in cands), key=abs)
        total += step; ang2 += step; lo = min(lo, total); hi = max(hi, total)
    if hi - lo < 2 * math.pi - 0.05 and abs(total) < 0.01: return 'rock'
    return 'AMBIG'

def gearpump(p):
    cx, cy = p['center']; outs = set()
    for g in p['gears']:
        ox, oy = g['c'][0] - cx, g['c'][1] - cy; l = math.hypot(ox, oy); ox, oy = ox / l * 36, oy / l * 36
        v = (-oy, ox) if g['cw'] else (oy, -ox)
        for pt in p['ports']:
            if (pt['p'][0] - cx) * v[0] + (pt['p'][1] - cy) * v[1] > 1e-6: outs.add(pt['label'])
    return outs.pop() if len(outs) == 1 else 'CONFLICT'

def bracket(p):
    T = {s['label']: p['W'] * (s['load'][0] - s['pivot'][0]) / pdist(s['pivot'], s['A'], s['B']) for s in p['setups']}
    return pick(T, p['mode'] == 'more', 0.85)

CSOLVE = dict(guy=guy, bridge=bridge, flywheel=flywheel, turn=turn, gate=gate, jet=jet, tackle=tackle, pump=pump, chain=chain,
              sag=sag, rack=rack, bike=bike, winch=winch, boat=boat, volume=volume, linkage=linkage, gearpump=gearpump, bracket=bracket)

# ---------------- set 2 ----------------
def belttrain(p):
    nA = 1.0; nB = nA * p['rA'] / p['rB1']; nC = nB * p['rB2'] / p['rC']
    if p['mode'] == 'num': return p['rpm'] * nC
    return pick({'A': nA, 'B': nB, 'C': nC}, p['mode'] == 'fast', 0.85)

def barrow(p):
    f = {r['label']: math.dist(r['stone'], r['axle']) / math.dist(r['handle'], r['axle']) for r in p['rows']}
    return pick(f, p['mode'] == 'hard', 0.9)

def capacity(p):
    r0, r1, H = p['r0'], p['r1'], p['H']
    def V(h, n=400):  # numeric integration of cross-section area (independent of the closed form)
        s = 0.0; dh = h / n
        for i in range(n):
            y = (i + 0.5) * dh; r = r0 + (r1 - r0) * y / H; s += math.pi * r * r * dh
        return s
    good = []
    for f in p['figs']:
        m = [0] + f['marks']; inc = [V(m[i + 1]) - V(m[i]) for i in range(len(m) - 1)]
        if max(inc) / min(inc) < 1.02: good.append(f['label'])
    return good[0] if len(good) == 1 else 'AMBIG'

def area(s):
    k = s['k']
    if k == 'sphere': return 4 * math.pi * s['r'] ** 2
    if k == 'box': l, h, w = s['l'], s['h'], s['w']; return 2 * l * h + 2 * l * w + 2 * h * w
    if k == 'cyl': r = s['d'] / 2; return 2 * math.pi * r * s['h'] + 2 * math.pi * r * r
    base = 2 * (s['bw'] * s['bh'] + s['bw'] * s['d'] + s['bh'] * s['d'])
    fin = 2 * s['f'] * s['d'] + 2 * s['t'] * s['f'] + s['t'] * s['d']  # both faces, both ends, top (bottom is attached)
    return base - s['n'] * s['t'] * s['d'] + s['n'] * fin

def surface(p):
    a = {x['label']: area(x['s']) for x in p['solids']}
    if p['mode'] == 'melt':
        return 'same' if abs(a['A'] - a['B']) < 1e-9 else max(a, key=a.get)
    return pick(a, p['ask'] == 'fast', 0.95)

def holes(p):
    if p['mode'] == 'taps':
        t = {x['label']: x['y'] - p['surf'] for x in p['taps']}
        return 'same' if t['A'] == t['B'] else max(t, key=t.get)
    good = []
    for f in p['figs']:
        ratios = [v / math.sqrt(d) for v, d in zip(f['v'], f['depths'])]
        if max(ratios) / min(ratios) < 1.01 and f['v'] == sorted(f['v']) and f['v'][0] < f['v'][-1]: good.append(f['label'])
    return good[0] if len(good) == 1 else 'AMBIG'

def disk(p):
    if all(abs(f['off'][0]) < 1e-9 and abs(f['off'][1]) < 1e-9 for f in p['figs']): return 'same'
    low = [f['label'] for f in p['figs'] if abs(f['off'][0]) < 0.5 and f['off'][1] > 0]
    return low[0] if len(low) == 1 else 'AMBIG'

def brk(p):
    xL, xR, xf = p['xL'], p['xR'], p['xf']
    push_at, stone_at = (xL, xR) if p['stoneRight'] else (xR, xL)
    P_ = 1.0; S = P_ * abs(xf - push_at) / abs(stone_at - xf)
    def M(x):  # bending moment from the free-body of the part between x and the nearer end
        if (x - xf) * (push_at - xf) >= 0: return P_ * abs(x - push_at)
        return S * abs(x - stone_at)
    m = {q['label']: M(q['x']) for q in p['points']}
    return pick(m, True, 0.98)

def steelyard(p):
    w = {k: p[k]['xc'] / p[k]['db'] for k in ('A', 'B')}
    if abs(w['A'] - w['B']) < 1e-9: return 'same'
    return (min if p['ask'] == 'less' else max)(w, key=w.get)

def throw(p):
    v = {q['label']: math.hypot(p['vx'], p['vy'] - p['g'] * q['t']) for q in p['points']}
    if abs(v['A'] - v['B']) < 1e-9: return 'same'
    return max(v, key=v.get)

def mix(p):
    L = p['layers']
    for a in L:
        for b in L:
            if a is not b and a['gaps'] == 'air' and b['grain'] < a['grain'] or (a is not b and a['gaps'] == 'air' and b['grain'] == 0):
                return 'down'
    return 'same'

def winder(p):
    c = p['drum']; t = p['tangent']; q = p['pulleyPt']
    ox, oy = t[0] - c[0], t[1] - c[1]
    drum_cw = not p['driverCW']
    v = (-oy, ox) if drum_cw else (oy, -ox)
    u = (q[0] - t[0], q[1] - t[1])
    direction = 'down' if v[0] * u[0] + v[1] * u[1] > 0 else 'up'
    return direction + '-' + ('steps' if p['inter'] else 'smooth')

def ice(p):
    rho = 0.917
    if p['kind'] == 'block': return 'down' if rho < 1 else 'same'
    if p['kind'] == 'freeze': return 'up' if 1 / rho > 1 else 'same'
    return 'same'  # floating ice displaces its own weight, which equals its melt water

_turn_old = turn
def turn2(p):
    if p['mode'] == 'bank':
        c = p['center']; d = {l['label']: math.dist(c, l['pt']) for l in p['labels']}
        return max(d, key=d.get)
    return _turn_old(p)

_boat_old = boat
def boat2(p):
    if p['mode'] == 'compare' and p.get('ask') == 'harder':
        mult = {row['label']: sum(1 for r in row['ropes'] if max(r[0], r[2]) >= row['bx'] - 20) for row in p['rows']}
        if mult['A'] == mult['B']: return 'same'
        return min(mult, key=mult.get)
    return _boat_old(p)

CSOLVE.update(belttrain=belttrain, barrow=barrow, capacity=capacity, surface=surface, holes=holes, disk=disk, steelyard=steelyard,
              throw=throw, mix=mix, winder=winder, ice=ice, turn=turn2, boat=boat2)
CSOLVE['break'] = brk

# ---------------- set 3 (study-guide types) ----------------
def towers(p):
    if p['mode'] == 'stool':
        a, b = p['feet']
        return 'same' if a == b else ('A' if a > b else 'B')
    T = p['towers']
    if len(T) == 2 and T[0]['w'] == T[1]['w'] and T[0]['h'] == T[1]['h']: return 'same'
    # resisting moment ~ w^2*h, overturning (wind) ~ h^2 ; tip angle ~ atan(w/h). Both must agree.
    s1 = {t['label']: t['w'] / t['h'] for t in T}; s2 = {t['label']: t['w'] ** 2 / t['h'] for t in T}
    want_max = p['ask'] == 'stable'
    a1 = pick(s1, want_max, 0.8); a2 = pick(s2, want_max, 0.8)
    return a1 if a1 == a2 else 'AMBIG'

def inertia(p):
    if p['mode'] == 'load': return 'more' if p['act'] == 'brake' else 'less'
    if p['mode'] == 'still': return 'same'
    # ball lags behind acceleration: accel direction = -lean. braking: velocity direction = +lean.
    moving = -p['lean'] if p['mode'] == 'accel' else p['lean']
    return p['labR'] if moving > 0 else p['labL']

def ring(p):
    cx, cy = p['center']; Rr = p['ringR']; g = p['gears']
    # check geometry: consecutive gears mesh externally, last meshes internally with the ring
    for a, b in zip(g, g[1:]):
        if abs(math.dist((a['x'], a['y']), (b['x'], b['y'])) - (a['r'] + b['r'])) > 0.2: return 'GEOMETRY'
    last = g[-1]
    if abs(math.dist((last['x'], last['y']), (cx, cy)) - (Rr - last['r'])) > 0.2: return 'GEOMETRY'
    flips = len(g) - 1  # external meshes reverse; the internal mesh does not
    same = flips % 2 == 0
    d = 'cw' if p['cw'] else 'ccw'
    return d if same else ('ccw' if p['cw'] else 'cw')

def seesaw(p):
    tq = p['wD'] * p['dD'] - p['wC'] * p['dC']   # D's side minus C's side
    if tq == 0: return 'same'
    c_down = tq < 0   # C's side heavier
    move_out = not c_down
    return 'A' if move_out == p['aOut'] else 'B'

def prop(p):
    # plank weight at the middle, supported by ground end and post at fraction f: post load = W*0.5/f
    a, b = 0.5 / p['fA'], 0.5 / p['fB']
    return 'same' if abs(a - b) < 1e-9 else ('A' if a > b else 'B')

def carry(p):
    if p['mode'] == 'bindle': return 'A' if p['aA'] < p['aB'] else 'B'
    f = p['f']  # load position from A (0) to B (1); A carries (1-f)
    return 'same' if abs(f - 0.5) < 1e-9 else ('A' if 1 - f > f else 'B')

def chainhold(p):
    ox, oy = p['pivot']; sg = 1 if p['loadRight'] else -1
    ok = []
    for c in p['chains']:
        P, Q = c['P'], c['Q']
        d0 = math.dist(P, Q)
        # rotate the arm point Q a tiny bit about the pivot in the direction the load pushes (loaded end down)
        th = 1e-3 * sg  # screen coords, y down: positive angle = clockwise = right side down
        qx, qy = Q[0] - ox, Q[1] - oy
        Q2 = (ox + qx * math.cos(th) - qy * math.sin(th), oy + qx * math.sin(th) + qy * math.cos(th))
        if math.dist(P, Q2) > d0 + 1e-9: ok.append(c['label'])
    if len(p['chains']) == 2 and len(ok) == 2: return 'same'
    return ok[0] if len(ok) == 1 else 'AMBIG'

def diffwinch(p):
    # screen y down. For clockwise turning, a point on the left edge of a drum moves up, right edge moves down.
    net = 0
    for r in p['ropes']:
        edge_moves_up = (r['side'] < 0) == p['cw']
        net += r['r'] if edge_moves_up else -r['r']   # rope hanging from that edge is wound in when the edge moves up
    return 'up' if net > 0 else 'down' if net < 0 else 'still'

def ratchet(p):
    n, ph = p['n'], p['ph']; step = 2 * math.pi / n; prof = p['prof']
    def surf(phi):
        u = (phi - ph) % step
        pts = prof  # three (angle, radius) points of one tooth, in increasing angle
        if pts[0][0] == pts[1][0]:        # steep face first, then a slope down to the root
            a2 = pts[2][0]
            return pts[1][1] + (pts[2][1] - pts[1][1]) * (u / a2) if u <= a2 else pts[2][1]
        a1 = pts[1][0]                     # slope up first, then a steep face
        return pts[0][1] + (pts[1][1] - pts[0][1]) * (u / a1) if u <= a1 else pts[2][1]
    ta, tr = p['tip']
    blocked = {}
    for name, sgn in (('cw', 1), ('ccw', -1)):
        # rotating the wheel by +d (screen clockwise) moves material to larger angles: surface under the tip becomes surf(ta - d)
        # the catch is blocked only if it meets a steep face (a sudden jump in radius); a gentle slope just lifts it
        blocked[name] = False
        for k in range(1, 200):
            d0, d1 = (k - 1) * 0.002, k * 0.002
            r0, r1 = surf(ta - sgn * d0), surf(ta - sgn * d1)
            if r1 > tr:
                blocked[name] = (r1 - r0) > 3
                break
    free = [k for k, v in blocked.items() if not v]
    if len(free) != 1: return 'AMBIG'
    if p['mode'] == 'drive': return 'A' if (free[0] == 'cw') == p['aIsCW'] else 'B'
    return free[0]

def cups(p):
    turn_cw = not p['openCW']   # cups travel rounded back first
    return 'A' if turn_cw == p['aCW'] else 'B'

def tracks(p):
    inside = p['topLab'] if p['turnLeft'] else ('B' if p['topLab'] == 'A' else 'A')
    outside = 'B' if inside == 'A' else 'A'
    return inside if p['ask'] == 'slow' else outside

def float_(p):
    a, b = p['sA'], p['sB']
    if a == b: return 'same'
    if p['mode'] == 'liquid': return 'A' if a < b else 'B'   # denser liquid -> floats higher (less submerged)
    return 'A' if a > b else 'B'

def siphon(p):
    a, b = p['oA'] - p['sA'], p['oB'] - p['sB']
    return 'same' if a == b else ('A' if a > b else 'B')

def forces(p):
    rx = p['m1'] * math.cos(p['a1']) + p['m2'] * math.cos(p['a2']); ry = p['m1'] * math.sin(p['a1']) + p['m2'] * math.sin(p['a2'])
    ar = math.atan2(ry, rx)
    near = [o['label'] for o in p['opts'] if abs(math.atan2(math.sin(o['a'] - ar), math.cos(o['a'] - ar))) < 0.05]
    return near[0] if len(near) == 1 else 'AMBIG'

def mirrorclock(p):
    return LETTERS[p['kinds'].index('mirror')]
LETTERS = 'ABCDE'

def volute(p):
    if p['mode'] == 'inlet': return p['labIn']
    return 'cw' if p['outCW'] else 'ccw'

def layers(p):
    D = {'oil': 0.92, 'water': 1.0, 'syrup': 1.35}
    good = [LETTERS[i] for i, o in enumerate(p['order']) if o and all(D[o[j]] < D[o[j + 1]] for j in range(len(o) - 1))]
    return good[0] if len(good) == 1 else 'AMBIG'

CSOLVE.update(towers=towers, inertia=inertia, ring=ring, seesaw=seesaw, prop=prop, carry=carry, chainhold=chainhold, diffwinch=diffwinch,
              ratchet=ratchet, cups=cups, tracks=tracks, float=float_, siphon=siphon, forces=forces, mirrorclock=mirrorclock, volute=volute, layers=layers)
