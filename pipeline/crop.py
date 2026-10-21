import os
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', 'app')
import re, json, io, base64, sys
import html as _h
from PIL import Image, ImageOps
import numpy as np
S = 2.0  # 144 dpi / 72
TESTS = ['ts1', 'ts2', 'ts3', 'ts4', 'diag', 'i33', 'i34', 'i34b']

def lines_of(page):
    out = []
    for l in re.findall(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', page, re.S):
        words = [(float(a), float(b), float(c), float(d), t) for a, b, c, d, t in re.findall(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)</word>', l[4])]
        out.append(dict(x0=float(l[0]), y0=float(l[1]), x1=float(l[2]), y1=float(l[3]), words=words, text=' '.join(w[4] for w in words)))
    return out

CUR = [None, None]  # (test, page) being cropped; every picture records where on that PDF page it came from


def cut(im, box):
    """crop that remembers its offset on the page render, so enc() can record the PDF box"""
    ox, oy = getattr(im, 'off', (0, 0))
    c = im.crop(box); c.off = (ox + box[0], oy + box[1])
    return c

def trim(im, pad=8):
    a = np.array(im.convert('L')) < 200
    ys, xs = np.where(a)
    if not len(xs): return None
    x0, y0, x1, y1 = max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.size[0], xs.max() + pad + 1), min(im.size[1], ys.max() + pad + 1)
    return cut(im, (x0, y0, x1, y1))

def enc(im):
    q = im.convert('RGB').quantize(24, method=Image.MEDIANCUT, dither=Image.NONE)
    b = io.BytesIO(); q.save(b, 'PNG', optimize=True)
    ox, oy = getattr(im, 'off', (0, 0))  # [test, page, x0, y0, x1, y1] in PDF points
    box = [CUR[0], CUR[1], round(ox / S, 2), round(oy / S, 2), round((ox + im.size[0]) / S, 2), round((oy + im.size[1]) / S, 2)]
    return ['data:image/png;base64,' + base64.b64encode(b.getvalue()).decode(), im.size[0], im.size[1], box]


def parts_of(im, L, x0, y0, x1, y1, textmin_x=None, allow_short=False):
    """split a region into horizontal bands; a band holding one plain line of real text becomes text, runs of anything else stay one picture"""
    g = np.array(im.convert('L'))
    X0, X1, Y0, Y1 = int(x0 * S), int(x1 * S), int(max(0, y0) * S), int(y1 * S)
    if Y1 <= Y0 + 2 or X1 <= X0 + 2: return []
    dark = (g[Y0:Y1, X0:X1] < 200).any(1)
    bands = []; i = 0
    while i < len(dark):
        if dark[i]:
            j = i
            while j < len(dark) and dark[j]: j += 1
            bands.append([Y0 + i, Y0 + j]); i = j
        else: i += 1
    mb = []
    for bd in bands:
        if mb and bd[0] - mb[-1][1] <= 2: mb[-1][1] = bd[1]
        else: mb.append(bd)
    cls = []
    for b0, b1 in mb:
        by0, by1 = b0 / S, b1 / S
        ls = []
        for l in L:
            if l['y0'] >= by0 - 4 and l['y1'] <= by1 + 4 and l['x1'] > x0 and l['x0'] < x1:
                ws = [w for w in l['words'] if w[0] >= x0 - 2 and w[2] <= x1 + 2]
                if ws: ls.append(dict(l, words=ws, x0=min(w[0] for w in ws), x1=max(w[2] for w in ws), text=' '.join(w[4] for w in ws)))
        txt = None
        if len(ls) == 1:
            l = ls[0]; hs = [w[3] - w[1] for w in l['words']]; mh = max(hs); base = max(w[3] for w in l['words'])
            uniform = min(hs) > 0.8 * mh and all(base - w[3] < 1.2 for w in l['words'])
            m = (g[b0:b1, X0:X1] < 200).copy()
            for w in l['words']:
                m[:, max(0, int(w[0] * S) - X0 - 3):max(0, int(w[2] * S) - X0 + 3)] = False
            covered = m.sum() < 8
            wide = (l['x1'] - l['x0']) >= (0 if allow_short else 150)
            startok = textmin_x is None or l['x0'] <= textmin_x
            if uniform and covered and wide and startok: txt = _h.unescape(l['text'])
        cls.append((b0, b1, txt))
    out = []; k = 0
    while k < len(cls):
        if cls[k][2] is not None:
            out.append({'t': cls[k][2]}); k += 1; continue
        j = k
        while j < len(cls) and cls[j][2] is None: j += 1
        c = trim(cut(im, (X0, cls[k][0], X1, cls[j - 1][1])), pad=5)
        if c: out.append({'img': enc(c)})
        k = j
    return out


# IBEW questions whose four answer choices (mostly graphs) are laid out in two columns, each letter above
# or beside its own picture. They are split into one picture per choice so each graph can be shown large.
# Questions with one shared graph (lines tagged A-D) or with formula choices stay one picture.
SPLIT = {('i33', 20), ('i33', 21), ('i33', 22), ('i33', 23), ('i33', 24), ('i34', 15), ('i34', 16), ('i34', 17), ('i34', 19),
         ('i34b', 1), ('i34b', 9), ('i34b', 10), ('i34b', 13), ('i34b', 14), ('i34b', 34)}


def split_cols(im, L, labs, top, bot):
    """two-column layout -> (stem parts, {letter: picture}, {letter: text}). Boxes are in PDF points."""
    from PIL import ImageDraw
    im = im.copy(); dr = ImageDraw.Draw(im)
    for w in labs:  # the A)-D) letters are drawn by the app, so they are removed from the pictures
        dr.rectangle((int((w[0] - 1) * S), int((w[1] - 1) * S), int((w[2] + 1) * S), int((w[3] + 1) * S)), fill='white')
    L = [dict(l, words=[x for x in l['words'] if x not in labs]) for l in L]
    L = [dict(l, x0=min(x[0] for x in l['words']), x1=max(x[2] for x in l['words']), text=' '.join(x[4] for x in l['words'])) for l in L if l['words']]
    g = np.array(im.convert('L')) < 200
    P = lambda v: int(round(v * S))
    def vstrip(xa, xb, ya, yb):
        """middle of the widest blank vertical strip in x [xa, xb) over rows [ya, yb)"""
        xa, xb, ya, yb = P(xa), P(xb), P(ya), P(yb)
        if xb <= xa or yb <= ya: return None
        col = g[ya:yb, xa:xb].any(0); best = None; i = 0
        while i < len(col):
            if not col[i]:
                j = i
                while j < len(col) and not col[j]: j += 1
                if best is None or j - i > best[1] - best[0]: best = (i, j)
                i = j
            else: i += 1
        return (xa + (best[0] + best[1]) / 2) / S if best and best[1] - best[0] >= 4 else None
    def hstrip(xa, xb, ya, yb):
        """middle of the blank horizontal strip nearest to yb in rows [ya, yb) over x [xa, xb)"""
        xa, xb, ya, yb = P(xa), P(xb), P(ya), P(yb)
        row = g[ya:yb, xa:xb].any(1); j = len(row)
        while j > 0 and row[j - 1]: j -= 1
        if j == 0: return None
        i = j
        while i > 0 and not row[i - 1]: i -= 1
        return (ya + (i + j) / 2) / S
    def content_end(r):
        """bottom of a box's content: the first blank band of 8pt or more below its letter"""
        row = g[P(r['w'][1]):P(r['y1']), P(r['x0']):P(r['x1'])].any(1); run = 0
        for k, d in enumerate(row):
            run = 0 if d else run + 1
            if run >= 8 * S and k + 1 > run: return r['w'][1] + (k + 1 - run) / S
        return r['y1']
    left = lambda w: w[0] < 200
    R = {w[4][0]: dict(w=w, L=left(w)) for w in labs}
    def below(w):
        ys = [o[1] for o in labs if o is not w and o[1] > w[1] + 6 and left(o) == left(w)]
        return min(ys) if ys else bot
    for r in R.values():
        w = r['w']; r['y0'] = w[1] - 3; r['y1'] = below(w) - 3
        r['x0'] = 30 if r['L'] else w[0] - 3; r['x1'] = 585
    for _ in range(3):
        for r in R.values():
            w = r['w']
            if not r['L']:
                r['x0'] = vstrip(w[0] - 45, w[0] - 1, r['y0'], r['y1']) or (w[0] - 3)
            else:
                rs = [o for o in R.values() if not o['L'] and o['y0'] < r['y1'] - 4 and content_end(o) > r['y0'] + 4]
                r['x1'] = min(o['x0'] for o in rs) if rs else 585
        for r in R.values():
            if r['L']: continue
            w = r['w']  # a right-column box also stops where a left-column box below it reaches across
            ys = [o['w'][1] for o in R.values() if o['L'] and o['w'][1] > w[1] + 6 and o['x1'] > r['x0'] + 15]
            r['y1'] = min([below(w)] + ys) - 3
    for r in R.values():
        w = r['w']
        beside = g[P(w[1]):P(w[3]), P(w[2] + 2):P(w[2] + 25)].any()
        if beside:  # letter left of its choice: start at the blank line just above the letter
            y = hstrip(r['x0'], r['x1'], w[1] - 14, w[1] + 1)
        else:  # letter above its choice: start at the blank line between the letter row and the picture
            y = hstrip(r['x0'], r['x1'], w[1] - 2, w[3] + 15)
        if y is not None: r['y0'] = y
    for r in R.values():  # end each box where the box below it starts
        ys = [o['y0'] for o in R.values() if o['w'][1] > r['w'][1] + 6 and o['x0'] < r['x1'] - 15 and o['x1'] > r['x0'] + 15]
        if ys: r['y1'] = min([r['y1']] + ys)
    ys0 =min(r['y0'] for r in R.values())
    stemp = parts_of(im, L, 30, top, 585, ys0, textmin_x=60, allow_short=True)
    for side in (True, False):  # stem content (a table, a given graph) sitting beside the first choices
        rs = [r for r in R.values() if r['L'] == side]
        if not rs: continue
        fy = min(r['y0'] for r in rs)
        if fy - ys0 < 10: continue
        if side: xa, xb = 30, min([o['x0'] for o in R.values() if not o['L'] and o['y0'] < fy] or [585])
        else: xa, xb = max([o['x1'] for o in R.values() if o['L'] and o['y0'] < fy] or [30]), 585
        stemp += parts_of(im, L, xa, ys0, xb, fy, textmin_x=xa + 30, allow_short=True)
    joined = []  # a long line that stops mid-sentence continues on the next text line
    for p in stemp:
        if 't' in p and joined and 't' in joined[-1] and len(joined[-1]['t']) > 60 and not joined[-1]['t'].rstrip().endswith(('.', '?', ':', '!')):
            joined[-1] = {'t': joined[-1]['t'] + ' ' + p['t']}
        else: joined.append(p)
    stemp = joined
    ch, chT = {}, {}
    for k, r in R.items():
        c = trim(cut(im, (P(r['x0']), P(r['y0']), P(r['x1']), P(r['y1']))), pad=6)
        ch[k] = enc(c) if c else None
        pp = parts_of(im, L, r['x0'], r['y0'], r['x1'], r['y1'], allow_short=True)
        if pp and all('t' in q for q in pp): chT[k] = ' '.join(q['t'] for q in pp)
    return stemp, ch, chT


out = {}
for t in TESTS:
    pages = open(HERE + f'/eta/{t}/bbox.html').read().split('<page ')[1:]
    items = []
    for pi, pg in enumerate(pages):
        L = lines_of(pg)
        qh = [l for l in L if re.match(r'^Question \d+$', l['text'])]
        ws = [l for l in L if l['text'].startswith('WORKSPACE')]
        if not qh: continue
        if not ws:
            ft=[l for l in L if l['y0']>730]
            ws=[{'y0':(min(l['y0'] for l in ft) if ft else 750)}]
        qn = int(qh[0]['text'].split()[1])
        CUR[:] = [t, pi + 1]
        im = Image.open(HERE + f'/eta/{t}/h-{pi + 1:02d}.png' if len(pages) < 100 else '').convert('RGB')
        top = qh[0]['y1'] + 4; bot = ws[0]['y0'] - 4
        labs = []
        for l in L:
            for w in l['words']:
                if re.match(r'^[A-D]\)$', w[4]) and top < w[1] < bot: labs.append(w)
        labs.sort(key=lambda w: (round(w[1] / 6), w[0]))
        letters = [w[4][0] for w in labs]
        ok = letters and sorted(letters) == ['A', 'B', 'C', 'D'] and len(labs) == 4
        rec = {'test': t, 'q': qn, 'page': pi + 1}
        if not ok:
            st = trim(cut(im, (int(30 * S), int(top * S), int(585 * S), int(bot * S))))
            rec.update(stem=enc(st), choices=None, labels=letters)
        else:
            # rows of labels
            if (t, qn) in SPLIT:
                stemp, ch, chT = split_cols(im, L, labs, top, bot)
                st = trim(cut(im, (int(30 * S), int(top * S), int(585 * S), int(bot * S))))
                rec.update(stemp=stemp, stem=enc(st), choices=[ch[k] for k in 'ABCD'], grid=True, choicesT=[chT.get(k) for k in 'ABCD'])
                items.append(rec); continue
            if t.startswith('i') and any(w[0] > 250 for w in labs):
                st = trim(cut(im, (int(30 * S), int(top * S), int(585 * S), int(bot * S))))
                rec.update(stem=enc(st), choices=None, labels=letters); items.append(rec); continue
            if any(w[0] > 250 for w in labs) and any(w[0] < 250 for w in labs):
                ch = {}; ys0 = min(w[1] for w in labs)
                for side in (0, 1):
                    col = sorted([w for w in labs if (w[0] > 250) == bool(side)], key=lambda w: w[1])
                    for k, w in enumerate(col):
                        y0 = w[1] - 2; y1 = (col[k + 1][1] - 3) if k + 1 < len(col) else bot
                        x0 = w[2] + 1
                        right = [o for o in labs if o[0] > w[0] + 40 and o[1] < y1 - 4 and (next((c for c in sorted([z for z in labs if abs(z[0]-o[0])<60 and z[1]>o[1]], key=lambda z:z[1])), None) or [0, bot])[1] > y0 + 4]
                        x1 = (min(o[0] for o in right) - 4) if right else 585
                        c = trim(cut(im, (int(x0 * S), int(y0 * S), int(x1 * S), int(y1 * S))), pad=6)
                        ch[w[4][0]] = enc(c) if c else None
                stem = trim(cut(im, (int(30 * S), int(top * S), int(585 * S), int((ys0 - 3) * S))))
                rec['stemp'] = parts_of(im, L, 30, top, 585, ys0 - 3, textmin_x=60)
                rec.update(stem=enc(stem) if stem else None, choices=[ch.get(k) for k in 'ABCD'], grid=True)
                items.append(rec); continue
            rows = []
            for w in sorted(labs, key=lambda w: w[1]):
                if rows and abs(rows[-1][0][1] - w[1]) < 6: rows[-1].append(w)
                else: rows.append([w])
            grid = any(len(r) > 1 for r in rows)
            dark = (np.array(im.convert('L'))[:, int(30 * S):int(585 * S)] < 235).any(1)
            def gap(lo, hi):
                lo, hi = int(lo * S), int(hi * S); best = None; i = lo
                while i < hi:
                    if not dark[i]:
                        j = i
                        while j < hi and not dark[j]: j += 1
                        if best is None or (j - i) >= best[1] - best[0]: best = (i, j)
                        i = j
                    else: i += 1
                return ((best[0] + best[1]) / 2) / S if best else lo / S
            tops = []
            for ri, r in enumerate(rows):
                lo = (rows[ri - 1][0][3]) if ri else max(top, r[0][1] - 30)
                tops.append(gap(lo, r[0][1]))
            first_y = tops[0]
            stem = trim(cut(im, (int(30 * S), int(top * S), int(585 * S), int(first_y * S))))
            rec['stemp'] = parts_of(im, L, 30, top, 585, first_y, textmin_x=60)
            ch = {}; chT = {}
            for ri, r in enumerate(rows):
                r.sort(key=lambda w: w[0])
                ry0 = tops[ri]
                ry1 = tops[ri + 1] if ri + 1 < len(rows) else bot
                for ci, w in enumerate(r):
                    x0 = w[2] + 2; x1 = (r[ci + 1][0] - 4) if ci + 1 < len(r) else 585
                    c = trim(cut(im, (int(x0 * S), int(ry0 * S), int(x1 * S), int(ry1 * S))), pad=6)
                    ch[w[4][0]] = enc(c) if c else None
                    if not grid:
                        pp = parts_of(im, L, x0, ry0, x1, ry1, allow_short=True)
                        if pp and all('t' in q for q in pp): chT[w[4][0]] = ' '.join(q['t'] for q in pp)
            rec.update(stem=enc(stem) if stem else None, choices=[ch[k] for k in 'ABCD'], grid=grid, choicesT=[chT.get(k) for k in 'ABCD'])
        items.append(rec)
    out[t] = items
    print(t, len(items), 'no-label', [i['q'] for i in items if not i.get('choices')], 'grid', [i['q'] for i in items if i.get('grid')])
json.dump(out, open(HERE + '/eta/crops.json', 'w'))
print(sum(len(json.dumps(v)) for v in out.values()) // 1024, 'KB')
