"""Independent check of every GAN math item (Numerical Computation + Numerical Reasoning).

Reads ganmathdump.json (node dumpganmath.js N) and re-solves each question from what is SHOWN:
the expression or series in the picture and the choice text. Nothing from the generator is reused.
  computation: parse the stacked fractions / mixed numbers / decimals, evaluate with exact Fractions,
               exactly one choice must equal it and be the marked one; choices distinct and positive;
               answers in lowest terms (mixed numbers for improper fractions); no inline slash fractions.
  reasoning:   fit the series with a family of rules (constant step, constant ratio, growing steps,
               steps in a ratio, sum of the two before, two interleaved series, repeating 2- or 3-step
               cycles of + or x). Every rule that fits must agree on the next number, it must be the
               marked choice, and no fitted rule may land on a wrong choice.
"""
import json, re, sys
from fractions import Fraction as F
from math import gcd
from collections import Counter

MI = '−'
items = json.load(open('ganmathdump.json'))
fails = Counter(); msgs = []; warn = Counter()
def fail(it, why):
    fails[it['sub']] += 1
    if len(msgs) < 40: msgs.append(f"  {it['sub']}: {why} | {it['stem']} | {[c['t'] for c in it['choices']]} marked {it['correct']}")

FR = r'<span class="fr"><span>(\d+)</span><span>(\d+)</span></span>'
TOK = re.compile(r'\s*(?:(?P<mix>\d+)' + FR.replace('(\\d+)', '(?P<mn>\\d+)', 1).replace('(\\d+)', '(?P<md>\\d+)', 1) +
                 r'|' + FR.replace('(\\d+)', '(?P<fn>\\d+)', 1).replace('(\\d+)', '(?P<fd>\\d+)', 1) +
                 r'|(?P<num>\d*\.\d+|\d+)|(?P<op>[+−×÷]))')

def tokens(h):
    pos, out = 0, []
    h = h.strip()
    while pos < len(h):
        m = TOK.match(h, pos)
        if not m or m.end() == pos: raise ValueError('cannot read: ' + h[pos:pos + 40])
        pos = m.end()
        if m.group('mix'):
            n, d = int(m.group('mn')), int(m.group('md'))
            out.append(('v', F(int(m.group('mix'))) + F(n, d), ('mixed', n, d)))
        elif m.group('fn'):
            n, d = int(m.group('fn')), int(m.group('fd'))
            out.append(('v', F(n, d), ('frac', n, d)))
        elif m.group('num'):
            s = m.group('num'); out.append(('v', F(s), ('dec' if '.' in s else 'int', s)))
        else:
            out.append(('op', m.group('op')))
    return out

def evaluate(tk):
    vals = [t[1] for t in tk[0::2]]; ops = [t[1] for t in tk[1::2]]
    if any(t[0] != 'v' for t in tk[0::2]) or any(t[0] != 'op' for t in tk[1::2]): raise ValueError('bad order')
    # x and / first, then + and -
    v = [vals[0]]; o = []
    for op, x in zip(ops, vals[1:]):
        if op == '×': v[-1] = v[-1] * x
        elif op == '÷': v[-1] = v[-1] / x
        else: o.append(op); v.append(x)
    r = v[0]
    for op, x in zip(o, v[1:]): r = r + x if op == '+' else r - x
    return r

def visible(h): return re.sub(r'<[^>]+>', '', h or '')

def check_comp(it):
    m = re.search(r'<div class="mathblk">(.*)</div>', it['fig'], re.S)
    if not m: return fail(it, 'no expression')
    expr = m.group(1).strip()
    if not expr.endswith('='): return fail(it, 'expression should end with =')
    if '/' in visible(expr): return fail(it, 'inline slash fraction in the question')
    try: val = evaluate(tokens(expr[:-1]))
    except Exception as e: return fail(it, f'parse {e}')
    vals, kinds = [], []
    for c in it['choices']:
        if '/' in visible(c['h']): return fail(it, 'inline slash fraction in a choice')
        tk = tokens(c['h'])
        if len(tk) != 1 or tk[0][0] != 'v': return fail(it, 'choice is not one number: ' + c['t'])
        v, form = tk[0][1], tk[0][2]
        if form[0] in ('mixed', 'frac'):
            n, d = form[1], form[2]
            if not (0 < n < d) or gcd(n, d) != 1: return fail(it, 'choice not in lowest terms / not a proper part: ' + c['t'])
        if form[0] == 'dec':
            s = form[1]
            if s.endswith('0') or s.endswith('.'): return fail(it, 'trailing zero in a decimal choice: ' + s)
        vals.append(v); kinds.append('dec' if form[0] == 'dec' or (form[0] == 'int' and '.' in expr) else 'frac')
    if len(set(vals)) != 5: return fail(it, 'two choices have the same value')
    if any(v <= 0 for v in vals): return fail(it, 'a choice is not positive')
    right = [i for i, v in enumerate(vals) if v == val]
    if len(right) != 1: return fail(it, f'{len(right)} choices equal the answer {val}')
    if right[0] != it['correct']: return fail(it, f'checker picks {right[0]}')
    dec_q = bool(re.search(r'\d*\.\d', visible(expr)))
    if dec_q and any(t[2][0] in ('mixed', 'frac') for c in it['choices'] for t in tokens(c['h'])):
        return fail(it, 'decimal question with a fraction choice')
    # the worked explanation must end on the marked answer
    if it['choices'][it['correct']]['h'] not in (it.get('explainH') or ''): return fail(it, 'explanation does not show the answer')

# ---------- series ----------
def const(xs): return len(xs) >= 2 and all(x == xs[0] for x in xs)
def diffs(xs): return [b - a for a, b in zip(xs, xs[1:])]
def ratios(xs): return None if any(x == 0 for x in xs[:-1]) else [F(b, a) for a, b in zip(xs, xs[1:])]
def step_fit(xs):
    """next value of a sub-series if it has a constant step or a constant ratio (needs 2+ steps)."""
    out = []
    d = diffs(xs)
    if const(d): out.append(xs[-1] + d[0])
    r = ratios(xs)
    if r and const(r): out.append(xs[-1] * r[0])
    return out
def rules(s):
    preds = {}
    n = len(s); d = diffs(s)
    if const(d): preds['constant step'] = s[-1] + d[0]
    r = ratios(s)
    if r and const(r): preds['constant ratio'] = s[-1] * r[0]
    dd = diffs(d)
    if len(d) >= 3 and const(dd): preds['steps grow evenly'] = s[-1] + d[-1] + dd[0]
    rd = ratios(d) if len(d) >= 3 else None
    if rd and const(rd): preds['steps in a ratio'] = s[-1] + d[-1] * rd[0]
    if n >= 4 and all(s[i] == s[i - 1] + s[i - 2] for i in range(2, n)): preds['sum of two before'] = s[-1] + s[-2]
    if n >= 5:
        ev, od = s[0::2], s[1::2]
        nxt, oth = (ev, od) if n % 2 == 0 else (od, ev)
        if len(nxt) >= 3 and len(oth) >= 3 and step_fit(oth):
            for k, p in enumerate(step_fit(nxt)): preds[f'two interleaved series {k}'] = p
    for p in (2, 3):
        steps = n - 1
        if steps < 2 * p: continue
        f = []
        for c in range(p):
            idx = list(range(c, steps, p))
            ad = [d[i] for i in idx]
            ra = [F(s[i + 1], s[i]) if s[i] else None for i in idx]
            if const(ad): f.append(('+', ad[0]))
            elif None not in ra and const(ra): f.append(('x', ra[0]))
            else: f = None; break
        if f:
            op, k = f[steps % p]
            preds[f'{p}-step cycle'] = s[-1] + k if op == '+' else s[-1] * k
    return preds

def check_reason(it):
    m = re.search(r'<span class="series">(.*?)</span>', it['fig'], re.S)
    if not m: return fail(it, 'no series')
    parts = [x for x in m.group(1).split('&ensp;') if x.strip()]
    if parts[-1] != '<b>?</b>': return fail(it, 'series should end with ?')
    try: s = [int(x) for x in parts[:-1]]
    except ValueError: return fail(it, 'series has a non-whole number')
    vals = []
    for c in it['choices']:
        try: vals.append(int(c['h']))
        except ValueError: return fail(it, 'choice not a whole number ' + c['h'])
    if len(set(vals)) != 5: return fail(it, 'duplicate choices')
    preds = rules(s)
    if not preds: return fail(it, 'no rule fits the series')
    pv = set(preds.values())
    hit = [v for v in pv if v in vals]
    if len(hit) != 1: return fail(it, f'rules disagree on a listed choice: {preds}')
    if vals.index(hit[0]) != it['correct']: return fail(it, f'checker picks {vals.index(hit[0])} ({preds})')
    if len(pv) > 1: warn['another rule gives a number that is not a choice'] += 1

for it in items:
    if it['sec'] == 'ncomp': check_comp(it)
    else: check_reason(it)

def share(sec):
    c = Counter(it['correct'] for it in items if it['sec'] == sec); n = sum(c.values())
    return {'ABCDE'[k]: round(100 * c[k] / n, 1) for k in range(5)}
print('items', Counter(it['sec'] for it in items))
print('by type', dict(Counter(it['sub'] for it in items)))
print('failures', dict(fails))
for m in msgs: print(m)
if warn: print('notes', dict(warn))
for sec in ('ncomp', 'nreason'): print(sec, 'correct-letter share', share(sec))
for sec in ('ncomp', 'nreason'):
    sh = share(sec)
    if max(sh.values()) - min(sh.values()) > 2: print('ERROR: letters not balanced in', sec); fails['balance'] += 1
sys.exit(1 if fails else 0)
