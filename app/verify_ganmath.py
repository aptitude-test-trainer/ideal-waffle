"""Independent check of every GAN math item (Numerical Computation + Numerical Reasoning).

Reads ganmathdump.json (node dumpganmath.js N: N tests at each level std/hard/expert, Meltdown picks,
and the JumpStart study-guide items) and re-solves each question from what is SHOWN: the expression or
series in the picture and the choice text. Nothing from the generator is reused.
  computation: parse the stacked fractions / mixed numbers / decimals, evaluate with exact Fractions
               (x and / before + and -); exactly one choice must equal it and be the marked one; choices
               distinct and positive; answers in lowest terms (mixed numbers for improper fractions);
               no inline slash fractions; the worked explanation ends on the marked answer.
  reasoning:   fit the series with a family of rules (constant step, constant ratio, growing steps,
               steps in a ratio, sum of the two before, two interleaved series, repeating 2- or 3-step
               cycles of + or x). Every rule that fits must agree on the next number, it must be the
               marked choice, and no fitted rule may land on a wrong choice.
  study guide: the JumpStart guide's own problems with the choices as printed (unreduced or zero choices
               allowed). If two printed choices equal the answer, the marked one must be the only one in
               simplest form (reduced, improper fractions as mixed numbers) and the other must carry a note.
  answer key: every problem in the JumpStart answer key (jskey.json: the guide's drills, handouts and word
               problems, typed in the guide's notation with a hand-worked answer) is evaluated here from that
               notation and must equal the hand answer, written in lowest terms (or as the drill asks:
               lowest common denominator, over 12, as an improper fraction, whole bags).
  types of fractions: each choice is classified (proper / improper / mixed / unreduced) from what is shown;
               exactly one choice may be the kind asked for, and it must be the marked one.
"""
import json, re, sys
from fractions import Fraction as F
from math import gcd
from collections import Counter

items = json.load(open('ganmathdump.json'))
fails = Counter(); msgs = []; warn = Counter()
def fail(it, why):
    fails[it['level'] + ' · ' + it['sub']] += 1
    if len(msgs) < 40: msgs.append(f"  {it['level']} {it['sub']}: {why} | {it['stem']} | {[c['t'] for c in it['choices']]} marked {it['correct']}")

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
    if any(t[0] != 'v' for t in tk[0::2]) or any(t[0] != 'op' for t in tk[1::2]) or len(tk) % 2 == 0: raise ValueError('bad order')
    vals = [t[1] for t in tk[0::2]]; ops = [t[1] for t in tk[1::2]]
    v = [vals[0]]; o = []          # x and / first, then + and -
    for op, x in zip(ops, vals[1:]):
        if op == '×': v[-1] = v[-1] * x
        elif op == '÷': v[-1] = v[-1] / x
        else: o.append(op); v.append(x)
    r = v[0]
    for op, x in zip(o, v[1:]): r = r + x if op == '+' else r - x
    return r

def visible(h): return re.sub(r'<[^>]+>', '', h or '')
def simplest(form):
    if form[0] in ('frac', 'mixed'): return form[1] < form[2] and gcd(form[1], form[2]) == 1
    return True

def check_comp(it):
    sg = it['level'] == 'sg'
    m = re.search(r'<div class="mathblk">(.*)</div>', it['fig'], re.S)
    if not m: return fail(it, 'no expression')
    expr = m.group(1).strip()
    if not expr.endswith('='): return fail(it, 'expression should end with =')
    if '/' in visible(expr): return fail(it, 'inline slash fraction in the question')
    try: val = evaluate(tokens(expr[:-1]))
    except Exception as e: return fail(it, f'parse {e}')
    vals, forms = [], []
    for c in it['choices']:
        if '/' in visible(c['h']): return fail(it, 'inline slash fraction in a choice')
        tk = tokens(c['h'])
        if len(tk) != 1 or tk[0][0] != 'v': return fail(it, 'choice is not one number: ' + c['t'])
        v, form = tk[0][1], tk[0][2]
        if not sg:
            if form[0] in ('mixed', 'frac') and not simplest(form): return fail(it, 'choice not in lowest terms / not a proper part: ' + c['t'])
            if form[0] == 'dec' and (form[1].endswith('0') or form[1].endswith('.')): return fail(it, 'trailing zero in a decimal choice: ' + form[1])
        vals.append(v); forms.append(form)
    if len(vals) != 5: return fail(it, f'{len(vals)} choices')
    if not sg:
        if len(set(vals)) != 5: return fail(it, 'two choices have the same value')
        if any(v <= 0 for v in vals): return fail(it, 'a choice is not positive')
    right = [i for i, v in enumerate(vals) if v == val]
    if sg and len(right) > 1:
        simp = [i for i in right if simplest(forms[i])]
        if len(simp) != 1: return fail(it, f'{len(right)} printed choices equal the answer, {len(simp)} in simplest form')
        if any(not it['choices'][i]['note'] for i in right if i != simp[0]): return fail(it, 'equal-valued choice has no note')
        right = simp
    if len(right) != 1: return fail(it, f'{len(right)} choices equal the answer {val}')
    if right[0] != it['correct']: return fail(it, f'checker picks {right[0]}')
    if not sg and re.search(r'\d*\.\d', visible(expr)) and any(f[0] in ('mixed', 'frac') for f in forms):
        return fail(it, 'decimal question with a fraction choice')
    if it['choices'][it['correct']]['h'] not in (it.get('explainH') or ''): return fail(it, 'explanation does not show the answer')

def check_types(it):
    ask = it['params']['ask'].lower()
    def kinds(h):
        tk = tokens(h)
        if len(tk) != 1: return set()
        form = tk[0][2]; k = set()
        if form[0] == 'mixed': k.add('mixed number')
        if form[0] == 'frac':
            n, d = form[1], form[2]
            if n < d and gcd(n, d) == 1: k.add('proper fraction')
            if n > d: k.add('improper fraction')
            if gcd(n, d) > 1: k.add('unreduced fraction')
        return k
    want = [w for w in ('proper fraction', 'improper fraction', 'mixed number', 'unreduced fraction') if w in ask and not ('improper' in ask and w == 'proper fraction')]
    if len(want) != 1: return fail(it, 'cannot tell what is asked')
    hit = [i for i, c in enumerate(it['choices']) if want[0] in kinds(c['h'])]
    if len(hit) != 1: return fail(it, f'{len(hit)} choices are a {want[0]}')
    if hit[0] != it['correct']: return fail(it, f'checker picks {hit[0]}')

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
    if str(hit[0]) not in (it.get('explainH') or ''): return fail(it, 'explanation does not show the answer')
    if len(pv) > 1: warn['another rule gives a number that is not a choice'] += 1

for it in items:
    # fractions are always stacked: no slash in any shown text (notes are shown as plain text)
    if '/' in visible(it.get('explainH')) or any('/' in (c.get('note') or '') for c in it['choices']): fail(it, 'inline slash fraction in a note or explanation')
    if it['type'] == 'gsgtype': check_types(it)
    elif it['sec'] in ('ncomp', 'sgncomp'): check_comp(it)
    else: check_reason(it)

# ---------- JumpStart answer key ----------
NT = re.compile(r'(\d+) (\d+)/(\d+)|(\d+)/(\d+)|(\d*\.\d+)|(\d+)|([+−×÷()])')
def notation(s):
    out = []
    for m in NT.finditer(s):
        if m.group(1): out.append(f'(F({m.group(1)})+F({m.group(2)},{m.group(3)}))')
        elif m.group(4): out.append(f'F({m.group(4)},{m.group(5)})')
        elif m.group(6): out.append(f"F('{m.group(6)}')")
        elif m.group(7): out.append(f'F({m.group(7)})')
        else: out.append({'+': '+', '−': '-', '×': '*', '÷': '/', '(': '(', ')': ')'}[m.group(8)])
    if re.sub(r'[\d\s./+−×÷()]', '', s): raise ValueError('unexpected text in ' + s)
    return eval(''.join(out), {'F': F})
def form_of(a):
    m = re.fullmatch(r'(\d+) (\d+)/(\d+)|(\d+)/(\d+)|(\d*\.\d+)|(\d+)', a)
    if not m: return None
    if m.group(1): return ('mixed', int(m.group(2)), int(m.group(3)))
    if m.group(4): return ('frac', int(m.group(4)), int(m.group(5)))
    if m.group(6): return ('dec', m.group(6))
    return ('int', m.group(7))
nkey = 0
for title, page, rows in json.load(open('jskey.json')):
    for r in rows:
        num, expr, ans = r[0], r[1], r[2]; kind = r[4] if len(r) > 4 else ''
        it = {'level': 'key', 'sub': title, 'stem': f'{num}. {expr}', 'choices': [{'t': ans}], 'correct': 0}
        nkey += 1
        try: v = notation(expr); a = notation(ans)
        except Exception as e: fail(it, f'cannot read: {e}'); continue
        f = form_of(ans)
        if f is None: fail(it, 'answer not a number'); continue
        if kind == 'lcd':
            dens = [int(d) for d in re.findall(r'/(\d+)', expr)]; L = 1
            for d in dens: L = L * d // gcd(L, d)
            if a != L: fail(it, f'lowest common denominator is {L}')
        elif kind == 'd12':
            if f[0] != 'frac' or f[2] != 12 or a != v: fail(it, f'should be {v} over 12')
        elif kind == 'imp':
            if f[0] != 'frac' or a != v or gcd(f[1], f[2]) != 1: fail(it, f'improper fraction should be {v}')
        elif kind == 'whole':
            if a != int(v): fail(it, f'whole ones in {v} is {int(v)}')
        else:
            if a != v: fail(it, f'answer should be {v}')
            elif f[0] == 'frac' and (f[1] >= f[2] or gcd(f[1], f[2]) != 1): fail(it, 'not in lowest terms / should be a mixed number')
            elif f[0] == 'mixed' and (f[1] >= f[2] or gcd(f[1], f[2]) != 1): fail(it, 'fraction part not in lowest terms')
            elif f[0] == 'dec' and f[1].endswith('0'): fail(it, 'trailing zero')
print('answer key problems checked', nkey)

def share(sec, level):
    c = Counter(it['correct'] for it in items if it['sec'] == sec and it['level'] == level); n = sum(c.values())
    return {'ABCDE'[k]: round(100 * c[k] / n, 1) for k in range(5)}
print('items', dict(Counter(it['level'] + ' ' + it['sec'] for it in items)))
print('by type', dict(Counter(it['sub'] for it in items)))
print('failures', dict(fails))
for m in msgs: print(m)
if warn: print('notes', dict(warn))
for level in ('std', 'hard', 'expert'):
    for sec in ('ncomp', 'nreason'):
        sh = share(sec, level); print(level, sec, 'correct-letter share', sh)
        if max(sh.values()) - min(sh.values()) > 2: print('ERROR: letters not balanced in', level, sec); fails['balance'] += 1
sys.exit(1 if fails else 0)
