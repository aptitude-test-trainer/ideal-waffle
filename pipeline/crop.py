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

def trim(im, pad=8):
    a = np.array(im.convert('L')) < 200
    ys, xs = np.where(a)
    if not len(xs): return None
    x0, y0, x1, y1 = max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.size[0], xs.max() + pad + 1), min(im.size[1], ys.max() + pad + 1)
    return im.crop((x0, y0, x1, y1))

def enc(im):
    q = im.convert('RGB').quantize(24, method=Image.MEDIANCUT, dither=Image.NONE)
    b = io.BytesIO(); q.save(b, 'PNG', optimize=True)
    return ['data:image/png;base64,' + base64.b64encode(b.getvalue()).decode(), im.size[0], im.size[1]]


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
        c = trim(im.crop((X0, cls[k][0], X1, cls[j - 1][1])), pad=5)
        if c: out.append({'img': enc(c)})
        k = j
    return out


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
            st = trim(im.crop((int(30 * S), int(top * S), int(585 * S), int(bot * S))))
            rec.update(stem=enc(st), choices=None, labels=letters)
        else:
            # rows of labels
            if t.startswith('i') and any(w[0] > 250 for w in labs):
                st = trim(im.crop((int(30 * S), int(top * S), int(585 * S), int(bot * S))))
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
                        c = trim(im.crop((int(x0 * S), int(y0 * S), int(x1 * S), int(y1 * S))), pad=6)
                        ch[w[4][0]] = enc(c) if c else None
                stem = trim(im.crop((int(30 * S), int(top * S), int(585 * S), int((ys0 - 3) * S))))
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
            stem = trim(im.crop((int(30 * S), int(top * S), int(585 * S), int(first_y * S))))
            rec['stemp'] = parts_of(im, L, 30, top, 585, first_y, textmin_x=60)
            ch = {}; chT = {}
            for ri, r in enumerate(rows):
                r.sort(key=lambda w: w[0])
                ry0 = tops[ri]
                ry1 = tops[ri + 1] if ri + 1 < len(rows) else bot
                for ci, w in enumerate(r):
                    x0 = w[2] + 2; x1 = (r[ci + 1][0] - 4) if ci + 1 < len(r) else 585
                    c = trim(im.crop((int(x0 * S), int(ry0 * S), int(x1 * S), int(ry1 * S))), pad=6)
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
