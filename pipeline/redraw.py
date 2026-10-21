"""Redraw the graph photos embedded in the ETA practice PDFs as vector art (SVG), so they stay sharp at any size.

Nothing is guessed from what the graph "should" show: every element is measured from the photo's own pixels.
  1. straight horizontal/vertical lines (grid, axes, frame, flat plotted lines): position, length, width, colour
  2. what is left after removing those: plotted lines/curves (traced along their centre), dots (fitted circles),
     arrow heads and other small shapes (traced outline), and labels
  3. labels are read with OCR and drawn with the graph's own font (DejaVu Sans, which the plotting program used),
     scaled onto the label's exact ink box
Checks (run for every photo):
  - each label's drawn glyphs must cover the photo's glyph pixels (overlap score per label); a misread digit fails
  - the whole redraw, rendered at the photo's size, is compared with the photo: ink present in one and missing
    in the other (beyond 1.5 px) is counted
Output: pipeline/redraw/<test>_p<page>_x<xref>.svg (viewBox = photo pixels), pipeline/redraw/report.json
Labels OCR cannot read are given in redraw_text.json ({"<name>": {"x,y": "text"}}) after looking at the photo.
"""
import os, re, io, sys, json, math, subprocess, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize
from skimage import measure
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'redraw')
FONTS = {'r': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'b': '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'}
try:  # the italic axis names (x, y) use DejaVu Sans Oblique, which ships with matplotlib
    import matplotlib
    FONTS['i'] = os.path.join(os.path.dirname(matplotlib.__file__), 'mpl-data', 'fonts', 'ttf', 'DejaVuSans-Oblique.ttf')
except ImportError: pass
_font = {}


def font(w):
    if w not in _font:
        f = TTFont(FONTS[w]); _font[w] = (f, f.getGlyphSet(), f.getBestCmap(), f['head'].unitsPerEm)
    return _font[w]


def ink_of(I):
    """0 (white) .. 1 (black) per pixel"""
    return (255.0 - I.min(2)) / 255.0


# ---------------------------------------------------------------- 1. straight horizontal / vertical lines
def runs(row, minlen):
    d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
    s = np.where(d == 1)[0]; e = np.where(d == -1)[0]
    return [(a, b) for a, b in zip(s, e) if b - a >= minlen]


def axis_lines(I, a, vertical):
    """lines running along rows (horizontal) or columns (vertical: done on the transpose)"""
    if vertical: I = I.transpose(1, 0, 2); a = a.T
    H, W = a.shape
    m = a > 0.03
    minlen = max(22, int(0.08 * W))
    cand = {y: runs(m[y], minlen) for y in range(H)}
    used = set(); lines = []
    for y in range(H):
        for (x0, x1) in cand[y]:
            if (y, x0) in used: continue
            # band: neighbouring rows with an overlapping run
            band = [(y, x0, x1)]; used.add((y, x0))
            yy = y + 1
            while yy < H:
                nxt = [(s, e) for (s, e) in cand[yy] if min(e, x1) - max(s, x0) > 0.6 * min(e - s, x1 - x0) and (yy, s) not in used]
                if not nxt: break
                s, e = max(nxt, key=lambda r: r[1] - r[0]); band.append((yy, s, e)); used.add((yy, s)); yy += 1
            if len(band) > 7: continue  # a filled area, not a line
            ys = [b[0] for b in band]
            # the strongest row gives the extent; columns where every band row is inked
            peak = max(band, key=lambda b: (b[2] - b[1], a[b[0], b[1]:b[2]].mean()))   # the full length of the line
            X0, X1 = peak[1], peak[2]
            rows = np.arange(ys[0] - 1, ys[-1] + 2).clip(0, H - 1)
            prof = a[rows][:, X0:X1]                    # rows x columns
            cov = prof.sum(0)                           # ink per column (px)
            cy = (prof * rows[:, None]).sum(0) / np.maximum(cov, 1e-6)
            good = cov > 0.5 * np.median(cov)
            if good.sum() < 0.5 * (X1 - X0): continue
            # a slanted stroke has a drifting centre; a true line does not
            if np.std(cy[good]) > 0.35 or abs(np.polyfit(np.arange(good.sum()), cy[good], 1)[0]) * (X1 - X0) > 1.0: continue
            ymid = float(np.median(cy[good])) + 0.5
            c = float(np.median(cov[good]))
            pr = int(round(ymid - 0.5))
            col = np.median(I[pr, X0:X1][good], 0)
            # where the ink gets narrower than the line (the point of an arrow head), the line stops
            while X1 - X0 > 4 and cov[X1 - 1 - peak[1]] < 0.7 * c: X1 -= 1
            while X1 - X0 > 4 and cov[X0 - peak[1]] < 0.7 * c: X0 += 1
            # a dashed line (often drawn over a grid line): strong runs separated by gaps at grid-line level
            cv_ = cov[X0 - peak[1]:X1 - peak[1]]
            if len(cv_) > 30:
                hi_t = 0.45 * np.percentile(cv_, 90)
                hi = cv_ >= hi_t
                rr = runs(hi, 3); gaps_ = runs(~hi, 3)
                dl = np.array([r1_ - r0_ for r0_, r1_ in rr]) if rr else np.array([0])
                md_ = float(np.median(dl))
                regular = len(rr) >= 4 and md_ >= 8 and (np.abs(dl - md_) <= 0.3 * md_).mean() >= 0.7
                if regular and len(gaps_) >= 3 and 0.15 < (~hi).mean() < 0.7:
                    lo_cov = float(np.median(cv_[~hi]))
                    if lo_cov > 0.05:   # the grid line under the gaps
                        lo_cols = np.arange(X0, X1)[~hi]
                        lines.append(dict(v=vertical, pos=ymid, a=X0, b=X1, cov=lo_cov, peak=float(np.median(prof.max(0)[lo_cols - peak[1]])),
                                          col=np.median(I[pr, lo_cols], 0)))
                    rows3 = np.unique(np.arange(ys[0] - 3, ys[-1] + 4).clip(0, H - 1))   # dashes can be wider than the band
                    for (r0_, r1_) in rr:
                        cols_ = np.arange(X0 + r0_, X0 + r1_)
                        dcov = a[rows3][:, cols_].sum(0) - lo_cov * (lo_cov > 0.05)
                        lines.append(dict(v=vertical, pos=ymid, a=X0 + r0_, b=X0 + r1_, cov=float(np.median(dcov)),
                                          peak=float(np.median(prof.max(0)[cols_ - peak[1]])), col=np.median(I[pr, cols_], 0), dash=True))
                    continue
            lines.append(dict(v=vertical, pos=ymid, a=X0, b=X1, cov=c, peak=float(np.median(prof.max(0)[good])), col=col))
    return lines


def settle_lines(lines):
    """a line 1 px wide that falls between two pixel rows shows as two pale rows: compare it with lines of the same
    family (similar total ink) that fall on a row, and give it their colour and width"""
    fam = []
    for L in sorted(lines, key=lambda L: L['cov']):
        hue = tuple(np.round(L['col'] / 40))
        for f in fam:
            if abs(f['cov'] - L['cov']) < 0.25 * f['cov'] + 0.08 and np.abs(np.array(f['hue']) - hue).max() <= 2:
                f['m'].append(L); break
        else: fam.append(dict(cov=L['cov'], hue=hue, m=[L]))
    for f in fam:
        best = max(f['m'], key=lambda L: L['peak'])
        for L in f['m']:
            if L.get('dash'):
                L['w'] = max(0.35, L['cov'] / max(L['peak'], 0.2)); L['stroke'] = L['col']; continue
            ap = max(best['peak'], L['peak'])
            L['w'] = max(0.35, L['cov'] / ap)
            # colour of a fully inked pixel of this family
            L['stroke'] = best['col'] if best['peak'] >= L['peak'] else L['col']
    return lines


# ---------------------------------------------------------------- 2. what is left: strokes, dots, shapes, labels
def hexcol(c): return '#%02x%02x%02x' % tuple(int(round(v)) for v in np.clip(c, 0, 255))


def render(svg, W, H):
    import cairosvg
    png = cairosvg.svg2png(bytestring=svg.encode(), output_width=W, output_height=H, background_color='white')
    return np.asarray(Image.open(io.BytesIO(png)).convert('RGB')).astype(float)


def line_svg(lines):
    out = []
    for L in lines:
        c = hexcol(L['stroke'])
        if L['v']: out.append(f'<line x1="{L["pos"]:.2f}" y1="{L["a"]:.2f}" x2="{L["pos"]:.2f}" y2="{L["b"]:.2f}" stroke="{c}" stroke-width="{L["w"]:.2f}"/>')
        else: out.append(f'<line x1="{L["a"]:.2f}" y1="{L["pos"]:.2f}" x2="{L["b"]:.2f}" y2="{L["pos"]:.2f}" stroke="{c}" stroke-width="{L["w"]:.2f}"/>')
    return out


def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; d = b - a; n = np.hypot(*d)
    if n == 0: dist = np.hypot(*(pts - a).T)
    else: dist = np.abs(d[0] * (pts[:, 1] - a[1]) - d[1] * (pts[:, 0] - a[0])) / n
    i = int(np.argmax(dist))
    if dist[i] > eps: return np.vstack([rdp(pts[:i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])


def trace_branches(sk):
    """skeleton -> list of pixel paths between ends/junctions"""
    H, W = sk.shape
    pts = set(zip(*np.nonzero(sk)))
    def nb(p):
        y, x = p
        return [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (y + dy, x + dx) in pts]
    deg = {p: len(nb(p)) for p in pts}
    nodes = {p for p in pts if deg[p] != 2}
    seen = set(); paths = []
    for n in nodes:
        for q in nb(n):
            if (n, q) in seen: continue
            path = [n, q]; seen.add((n, q)); seen.add((q, n)); prev, cur = n, q
            while cur not in nodes:
                nx = [r for r in nb(cur) if r != prev and (cur, r) not in seen]
                if not nx: break
                # prefer 4-neighbours to avoid diagonal shortcuts
                nx.sort(key=lambda r: abs(r[0] - cur[0]) + abs(r[1] - cur[1]))
                r = nx[0]; seen.add((cur, r)); seen.add((r, cur)); path.append(r); prev, cur = cur, r
            paths.append(np.array(path, float))
    # closed loops without nodes
    rest = pts - {p for P in paths for p in map(tuple, P.astype(int))}
    if rest and not paths:
        p0 = next(iter(rest)); path = [p0]; prev = None; cur = p0
        while True:
            nx = [r for r in nb(cur) if r != prev and r not in path[-3:]]
            if not nx or nx[0] == p0: break
            prev, cur = cur, nx[0]; path.append(cur)
            if len(path) > len(rest): break
        paths.append(np.array(path, float))
    return paths


def fit_line(P, w=None):
    """total least squares line through points (N,2 as x,y); returns centre, unit direction, max deviation"""
    w = np.ones(len(P)) if w is None else w
    c = (P * w[:, None]).sum(0) / w.sum()
    U = (P - c) * np.sqrt(w)[:, None]
    _, _, vt = np.linalg.svd(U, full_matrices=False)
    d = vt[0]; n = np.array([-d[1], d[0]])
    dev = np.abs((P - c) @ n)
    return c, d, dev


def strokes_of(mask, a, I, comp_pixels):
    """plotted lines/curves of one colour group -> (straight segments, curves)"""
    sk = skeletonize(mask)
    if sk.sum() < 3: return [], []
    dt = ndimage.distance_transform_edt(mask)
    hw = float(np.median(dt[sk]))
    paths = [p for p in trace_branches(sk) if len(p) >= max(4, 2.5 * hw)]
    segs, curves = [], []
    pieces = []
    for p in paths:
        xy = p[:, ::-1] + 0.5
        c, d, dev = fit_line(xy)
        pieces.append(dict(xy=xy, c=c, d=d, straight=dev.max() < max(0.9, 0.45 * hw), len=len(p)))
    # straight pieces on the same infinite line belong to one plotted line (crossings split them)
    groups = []
    for pc in [q for q in pieces if q['straight']]:
        for g in groups:
            ang = abs(abs(float(np.dot(g['d'], pc['d']))) - 1)
            off = abs(float(np.dot(pc['c'] - g['c'], np.array([-g['d'][1], g['d'][0]]))))
            if ang < 0.0006 and off < 1.3:
                g['m'].append(pc); allp = np.vstack([q['xy'] for q in g['m']]); g['c'], g['d'], _ = fit_line(allp); break
        else: groups.append(dict(c=pc['c'], d=pc['d'], m=[pc]))
    ys, xs = np.nonzero(mask); allpix = np.c_[xs + 0.5, ys + 0.5]; wts = a[ys, xs]
    for g in groups:
        n = np.array([-g['d'][1], g['d'][0]])
        near = np.abs((allpix - g['c']) @ n) <= hw + 1.0
        P = allpix[near]; Wt = wts[near]
        c, d, dev = fit_line(P, Wt)
        t = (P - c) @ d
        # extent: projections of this line's own pixels, ignoring stray far pixels
        lo, hi = np.percentile(t, 0.2), np.percentile(t, 99.8)
        tt = np.sort(t); gaps = np.where(np.diff(tt) > 6 * max(hw, 1))[0]
        if len(gaps):  # keep the longest continuous stretch (other stretches are other lines)
            cuts = np.r_[-1, gaps, len(tt) - 1]; k = int(np.argmax(np.diff(cuts)))
            lo, hi = tt[cuts[k] + 1], tt[cuts[k + 1]]
        width = float(Wt.sum() / max(hi - lo, 1) / max(np.percentile(Wt, 90), 0.2))
        segs.append(dict(p0=c + d * (lo - 0.3), p1=c + d * (hi + 0.3), w=width, pix=(ys[near], xs[near])))
    for pc in [q for q in pieces if not q['straight']]:
        curves.append(dict(xy=pc['xy'], w=2 * hw + 0.6))
    return segs, curves


def stroke_colour(I, a, pix):
    ys, xs = pix
    if len(ys) == 0: return np.array([60, 60, 60])
    av = a[ys, xs]; thr = np.percentile(av, 70)
    return np.median(I[ys, xs][av >= thr], 0)


# ---------------------------------------------------------------- labels (known-font reading)
def glyph_path(g, w):
    f, gs, cmap, upm = font(w)
    p = SVGPathPen(gs); gs[g].draw(p)
    return p.getCommands()


ALPHABET = '0123456789−-(),.ABCDFTxy'


def glyph_info(ch, w):
    f, gs, cmap, upm = font(w)
    g = cmap[ord(ch)]
    bp = BoundsPen(gs); gs[g].draw(bp)
    return g, bp.bounds, upm


_tmpl = {}


def glyph_hi(ch, w, size, rot=0):
    """glyph ink rendered 4x supersampled at a font size (px), with its ink box origin at (8, 8) of the 4x grid"""
    k = (ch, w, round(size * 4) / 4, rot)
    if k in _tmpl: return _tmpl[k]
    g, b, upm = glyph_info(ch, w)
    s = 4 * size / upm
    gw, gh = (b[2] - b[0]) * s, (b[3] - b[1]) * s
    if rot: gw, gh = gh, gw
    W, H = int(math.ceil(gw)) + 24, int(math.ceil(gh)) + 24
    if not rot: tr = f'matrix({s},0,0,{-s},{8 - b[0] * s},{8 + b[3] * s})'
    else: tr = f'matrix(0,{-s},{-s},0,{8 + b[3] * s},{8 + b[2] * s})'
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><path transform="{tr}" d="{glyph_path(g, w)}"/></svg>'
    m = ink_of(render(svg, W, H))
    _tmpl[k] = (m, gw / 4, gh / 4)
    return _tmpl[k]


def text_hi(text, w, size):
    """a short string rendered 4x supersampled (like glyph_hi), glyphs at their font advances"""
    k = ('T', text, w, round(size * 4) / 4)
    if k in _tmpl: return _tmpl[k]
    run, bb, upm = glyph_run(text, w)
    s = 4 * size / upm
    gw, gh = (bb[2] - bb[0]) * s, (bb[3] - bb[1]) * s
    W, H = int(math.ceil(gw)) + 24, int(math.ceil(gh)) + 24
    paths = ''.join(f'<path transform="matrix({s},0,0,{-s},{8 + (gx - bb[0]) * s},{8 + bb[3] * s})" d="{glyph_path(g, w)}"/>' for g, gx in run)
    m = ink_of(render(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">{paths}</svg>', W, H))
    _tmpl[k] = (m, gw / 4, gh / 4)
    return _tmpl[k]


PAIRS = [p + d for p in '-−(' for d in '0123456789'] + [d + e for d in '0123456789' for e in '0123456789'] + [d + p for d in '0123456789' for p in '),']


def match_glyph(patch, ch, w, size, rot=0, care=None):
    """best soft overlap of a glyph (font size in px) with a patch, over quarter-pixel shifts and +-1.5 px.
    care: pixels that count (not hidden under a drawn line)"""
    m, gw, gh = glyph_hi(ch, w, size, rot) if len(ch) == 1 else text_hi(ch, w, size)
    H, W = patch.shape
    care = np.ones_like(patch) if care is None else care.astype(float)
    best = (0, 0, 0)
    # place the glyph's ink box centred on the patch centre, then try shifts
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            ox = 8 + (gw * 4 - W * 4) / 2 + dx; oy = 8 + (gh * 4 - H * 4) / 2 + dy
            ox, oy = int(round(ox)), int(round(oy))
            if ox < 0 or oy < 0: continue
            sub = m[oy:oy + H * 4, ox:ox + W * 4]
            if sub.shape != (H * 4, W * 4): continue
            t = sub.reshape(H, 4, W, 4).mean((1, 3))
            sc = (np.minimum(t, patch) * care).sum() / max((np.maximum(t, patch) * care).sum(), 1e-6)
            if sc > best[0]: best = (sc, dx / 4, dy / 4)
    return best


def read_word(ar, comps, lab, a_orig=None, bg=None):
    """each connected piece of a label is one character (or two pieces, when a drawn line cuts through it):
    the alphabet character, at the label's font size, that overlaps the photo's pixels best"""
    a_orig = ar if a_orig is None else a_orig
    comps = sorted(comps, key=lambda c: c['box'][0])
    Hw = max(c['h'] for c in comps)
    def best_for(cs, size, w, lone):
        x0 = min(c['box'][0] for c in cs); y0 = min(c['box'][1] for c in cs)
        x1 = max(c['box'][2] for c in cs); y1 = max(c['box'][3] for c in cs)
        h, wd = y1 - y0, x1 - x0
        ks = [k for c in cs for k in (c['k'] if isinstance(c['k'], list) else [c['k']])]
        own = np.isin(lab[y0:y1, x0:x1], ks)
        patch = np.pad(np.where(own, a_orig[y0:y1, x0:x1], 0), 2)
        care = np.pad(own | ((bg[y0:y1, x0:x1] < 0.3) if bg is not None else True), 2, constant_values=True)
        cands = []
        for ch in ALPHABET:
            if w == 'i' and ch not in 'xy': continue      # italic: only the axis names
            if ch.isalpha() and w == 'r' and h < 13: continue   # small labels are tick numbers
            g, b, upm = glyph_info(ch, w)
            gh = (b[3] - b[1]) / upm * size; gw = (b[2] - b[0]) / upm * size
            if abs(gh - h) > 2.2 or abs(gw - wd) > 2.5: continue
            sc, dx, dy = match_glyph(patch, ch, w, size, 0, care)
            cands.append((sc, ch, dx, dy))
        if lone and x0 < 0.12 * ar.shape[1]:   # a lone label at the left edge may read bottom to top (a y-axis name); it must clearly beat the upright reading
            for ch in 'ABCDFTxy':
                g, b, upm = glyph_info(ch, w)
                if abs((b[2] - b[0]) / upm * size - h) > 2.5: continue
                sc, dx, dy = match_glyph(patch, ch, w, size, 1, care); cands.append((sc, ch + '@', dx, dy))
        cands.sort(reverse=True)
        if cands and cands[0][1].endswith('@'):
            up = [c_ for c_ in cands if not c_[1].endswith('@')]
            if up and (cands[0][0] < up[0][0] + 0.08 or cands[0][0] < 0.7): cands = up + [c_ for c_ in cands if c_[1].endswith('@')]
        if (not cands or cands[0][0] < 0.45) and wd > 0.8 * h and w != 'i':
            # one piece may be two characters that touch (a minus sign against its digit)
            for t in PAIRS:
                run, bb, upm = glyph_run(t, w)
                gh = (bb[3] - bb[1]) / upm * size; gw = (bb[2] - bb[0]) / upm * size
                if abs(gh - h) > 2.2 or abs(gw - wd) > 2.5: continue
                sc, dx, dy = match_glyph(patch, t, w, size, 0, care)
                cands.append((sc, t, dx, dy))
            cands.sort(reverse=True)
        box = (x0, y0, x1, y1)
        return dict(c=dict(box=box, h=h, w=wd, k=ks), ch=cands[0][1] if cands else '?', iou=cands[0][0] if cands else 0,
                    alt=cands[1] if len(cands) > 1 else None)
    out = None
    # digit / capital height is 0.73 em in DejaVu Sans; brackets are 0.89 em
    size_list = [Hw / 0.729, Hw / 0.76, Hw / 0.70, Hw / 0.89, Hw / 0.93]
    if len(comps) == 1: size_list += [comps[0]['w'] / 0.729, comps[0]['w'] / 0.76]   # a label turned on its side
    for size in size_list:
        for w in [f for f in 'rbi' if f in FONTS]:
            res = [best_for([c], size, w, len(comps) == 1) for c in comps]
            # two neighbouring pieces that read badly may be one character cut by a line
            i = 0
            while i < len(res) - 1:
                A, B = res[i], res[i + 1]
                if min(A['iou'], B['iou']) < 0.42 and B['c']['box'][0] - A['c']['box'][2] <= 5:
                    cs = [c for c in comps if set(c['k'] if isinstance(c['k'], list) else [c['k']]) & set(A['c']['k'] + B['c']['k'])]
                    M = best_for(cs, size, w, False)
                    if M['iou'] >= 0.42 and M['iou'] > max(A['iou'], B['iou']):
                        res[i:i + 2] = [M]; continue
                i += 1
            tot = sum(r['iou'] for r in res) / len(res)
            if out is None or tot > out[0]: out = (tot, size, w, res)
    return out


def fast_place(patch, care, m, gw, gh):
    """best position (quarter pixels) of a 4x supersampled template on a patch: FFT correlation finds candidates,
    the soft overlap (as everywhere else) scores the best few"""
    from scipy.signal import fftconvolve
    Hh, Ww = patch.shape
    T = m[8:8 + int(math.ceil(gh * 4)) + 1, 8:8 + int(math.ceil(gw * 4)) + 1]
    P4 = np.kron(patch, np.ones((4, 4))); C4 = np.kron(care.astype(float), np.ones((4, 4)))
    if T.shape[0] > P4.shape[0] or T.shape[1] > P4.shape[1]:
        T = T[:P4.shape[0], :P4.shape[1]]
    tp = fftconvolve(P4, T[::-1, ::-1], 'valid')
    t2 = fftconvolve(C4, (T ** 2)[::-1, ::-1], 'valid')
    p2 = float((P4 ** 2).sum())
    tan = tp / np.maximum(p2 + t2 - tp, 1e-6)
    order = np.argsort(tan.ravel())[::-1][:6]
    best = (0, 0, 0)
    for idx in order:
        oy, ox = np.unravel_index(idx, tan.shape)
        tmpl = np.zeros((Hh * 4, Ww * 4)); tmpl[oy:oy + T.shape[0], ox:ox + T.shape[1]] = T
        tt = tmpl.reshape(Hh, 4, Ww, 4).mean((1, 3))
        sc = (np.minimum(tt, patch) * care).sum() / max((np.maximum(tt, patch) * care).sum(), 1e-6)
        if sc > best[0]: best = (float(sc), int(ox), int(oy))
    return best


def read_dictionary(a_orig, bg, box, size, w, minus, extra=(), only=None):
    """second chance for a label that could not be read piece by piece (usually because a plotted line runs
    through it): compare the whole label with every plausible label (whole numbers, the choice letters, axis
    names) drawn at the graph's label size; pixels under drawn lines do not count"""
    H, W = a_orig.shape
    x0, y0, x1, y1 = box
    nums_ = list(dict.fromkeys([str(n).replace('-', mm) for n in range(-60, 61) for mm in (minus, '−', '-')]))   # both minus signs
    pts_ = [n + ')' for n in nums_ if len(n) <= 3] + ['(' + n + ',' for n in nums_ if len(n) <= 3]   # pieces of point labels "(0, −7)"
    cands = list(only) if only else nums_ + pts_ + ['A', 'B', 'C', 'D', 'x', 'y', 'F', 'T', 'Figure 1', 'Figure 2', 'Figure'] + list(extra)
    res = []
    for t in cands:
        # a label partly hidden under a line may reach well past the visible part: for a given value, search wider
        pad_ = 6
        if only:
            run_, bb_, upm_ = glyph_run(t, w); pad_ = int((bb_[2] - bb_[0]) / upm_ * (size or (y1 - y0) / 0.73)) + 6
        X0, Y0, X1, Y1 = max(0, x0 - pad_), max(0, y0 - 6), min(W, x1 + pad_), min(H, y1 + 6)
        patch = a_orig[Y0:Y1, X0:X1]; care = ~ndimage.binary_dilation(bg[Y0:Y1, X0:X1] > 0.08, iterations=1)
        patch = np.where(care, patch, 0)
        ww = 'i' if t in ('x', 'y') and 'i' in FONTS else w
        run, bb, upm = glyph_run(t, ww)
        size_t = size if size else (y1 - y0) / ((bb[3] - bb[1]) / upm)   # no size given: fit the label's height
        tw, th = (bb[2] - bb[0]) / upm * size_t, (bb[3] - bb[1]) / upm * size_t
        if tw > (X1 - X0) + 2 or th > (Y1 - Y0) + 2: continue
        if tw < 0.5 * (x1 - x0) - 3 and not only: continue
        m, gw, gh = text_hi(t, ww, size_t)
        best = fast_place(patch, care, m, gw, gh)
        sc, ox, oy = best
        # how much of the label's own visible ink the candidate explains (a reading must not leave ink out)
        Hh, Ww = patch.shape
        tmpl = np.zeros((Hh * 4, Ww * 4))
        sub = m[8:8 + int(math.ceil(gh * 4)) + 1, 8:8 + int(math.ceil(gw * 4)) + 1]
        hh_, ww_ = min(sub.shape[0], Hh * 4 - oy), min(sub.shape[1], Ww * 4 - ox)
        if hh_ > 0 and ww_ > 0: tmpl[oy:oy + hh_, ox:ox + ww_] = sub[:hh_, :ww_]
        tt = ndimage.binary_dilation(tmpl.reshape(Hh, 4, Ww, 4).mean((1, 3)) > 0.15, iterations=1)
        own = np.zeros_like(tt); own[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = True
        vis = (patch > 0.3) & care & own
        cover = float((vis & tt).sum() / max(vis.sum(), 1))
        res.append((sc * (1 if cover >= 0.85 else 0.5), t, ww, X0 + ox / 4 + gw / 2, Y0 + oy / 4 + gh / 2, size_t))
    res.sort(reverse=True)
    return res[:2]


def glyph_use(ch, w, cx, cy, size, rot=0):
    """<use> of a glyph with its ink box centred on (cx, cy) at a font size in px"""
    g, b, upm = glyph_info(ch, w)
    s = size / upm
    gid = f'font_dv{w}_{g}'
    bx, by = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    if not rot: tr = f'matrix({s:.5f},0,0,{-s:.5f},{cx - bx * s:.2f},{cy + by * s:.2f})'
    else: tr = f'matrix(0,{-s:.5f},{-s:.5f},0,{cx + by * s:.2f},{cy + bx * s:.2f})'
    return f'<use href="#{gid}" transform="{tr}"/>', gid, glyph_path(g, w)


def string_els(text, w, size, cx, cy):
    """glyph <use>s for a string at a font size (px), its ink box centred on (cx, cy)"""
    run, bb, upm = glyph_run(text, w)
    s = size / upm
    ox = cx - (bb[0] + bb[2]) / 2 * s; oy = cy + (bb[1] + bb[3]) / 2 * s
    els, defs = [], {}
    for g, gx in run:
        gid = f'font_dv{w}_{g}'; defs[gid] = glyph_path(g, w)
        els.append(f'<use href="#{gid}" transform="matrix({s:.5f},0,0,{-s:.5f},{ox + gx * s:.2f},{oy:.2f})"/>')
    return els, defs


def glyph_run(text, w):
    f, gs, cmap, upm = font(w)
    x = 0; out = []; bb = [1e9, 1e9, -1e9, -1e9]
    for ch in text:
        g = cmap[ord(ch)]
        bp = BoundsPen(gs); gs[g].draw(bp)
        if bp.bounds:
            b = bp.bounds; bb = [min(bb[0], x + b[0]), min(bb[1], b[1]), max(bb[2], x + b[2]), max(bb[3], b[3])]
        out.append((g, x)); x += gs[g].width
    return out, bb, upm


def place_strings(places, a, bg, W, H):
    """labels given by hand (where the PDF prints labels on top of each other): each one's position is refined
    to fit the photo best (pixels under drawn lines do not count)"""
    els_all, defs_all, done = [], {}, []
    for P in places:
        text, w, size = P['text'], P.get('w', 'r'), P['size']
        cx0, cy0 = P['at']
        best = None
        for step, rng in ((1.0, 3), (0.25, 1)):
            base = (best[1], best[2]) if best else (cx0, cy0)
            for dx in np.arange(-rng, rng + 1e-9, step):
                for dy in np.arange(-rng, rng + 1e-9, step):
                    cx, cy = base[0] + dx, base[1] + dy
                    els, defs = string_els(text, w, size, cx, cy)
                    m = ink_of(render(svg_doc(W, H, defs, ['<g>'] + done + els + ['</g>'], bg=False), W, H))
                    care = (bg < 0.3)
                    x0, y0 = int(max(0, cx - size)), int(max(0, cy - size))
                    x1, y1 = int(min(W, cx + size * (0.4 + 0.6 * len(text)))), int(min(H, cy + size))
                    sl = (slice(y0, y1), slice(x0, x1))
                    sc = (np.minimum(m[sl], a[sl]) * care[sl]).sum() / max((np.maximum(m[sl], a[sl]) * care[sl]).sum(), 1e-6)
                    if best is None or sc > best[0]: best = (sc, cx, cy, els, defs)
        done += best[3]; defs_all.update(best[4])
        P['fit'] = [round(best[1], 2), round(best[2], 2), round(float(best[0]), 3)]
    return done, defs_all


# ---------------------------------------------------------------- driver
def svg_doc(W, H, defs, body, bg=True):
    d = ''.join(f'<path id="{k}" d="{v}"/>' for k, v in defs.items())
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            + (f'<defs>{d}</defs>' if d else '') + (f'<rect width="{W}" height="{H}" fill="#fff"/>' if bg else '') + ''.join(body) + '</svg>')


def chroma(R):
    """colour of the ink independent of how much of the pixel it covers (anti-aliasing)"""
    q = 255.0 - R
    return q / np.maximum(q.sum(-1, keepdims=True), 1e-6)


def colour_layers(I, ar):
    """split ink into layers of one colour (all greys form one layer). Colour comes from the photo itself (where a
    plotted line crosses the grid it is drawn on top, so the photo shows the line's colour); ar says where ink is left"""
    ch = chroma(I)
    strong = ar > 0.5
    P = ch[strong]
    if len(P) == 0: return []
    cents = [np.array([1 / 3, 1 / 3, 1 / 3])]
    for _ in range(8):  # farthest-point seeds, then a few k-means rounds
        d = np.min([np.linalg.norm(P - c, axis=1) for c in cents], axis=0)
        if d.max() < 0.06: break
        cents.append(P[int(np.argmax(d))])
    C = np.array(cents)
    for _ in range(10):
        lab = np.argmin(((P[:, None, :] - C[None]) ** 2).sum(-1), 1)
        C = np.array([P[lab == k].mean(0) if (lab == k).any() else C[k] for k in range(len(C))])
    keep = [k for k in range(len(C)) if (lab == k).sum() >= 15]
    C = C[keep]
    full = np.argmin(((ch[..., None, :] - C[None, None]) ** 2).sum(-1), -1)
    return [np.where((full == k) & (ar > 0.08), ar, 0.0) for k in range(len(C))]


def straight_lines(layer, curve_mask, a_orig=None, full=None):
    """repeatedly take the strongest straight line in a colour layer (Hough transform), measure it, remove it"""
    from skimage.transform import hough_line, hough_line_peaks
    H, W = layer.shape
    pool = (layer > 0.35) & ~curve_mask          # where a line may be found
    alive = (layer if full is None else full).copy()   # what a found line may extend over
    theta = np.linspace(-np.pi / 2, np.pi / 2, 2400, endpoint=False)
    YY, XX = np.mgrid[0:H, 0:W]
    segs = []; fails = 0
    for _ in range(14):
        if pool.sum() < 20: break
        h, th, dd = hough_line(pool, theta)
        acc, ang, dist = hough_line_peaks(h, th, dd, num_peaks=1)
        if not len(acc) or acc[0] < 18: break
        t0, r0 = ang[0], dist[0]
        n = np.array([np.cos(t0), np.sin(t0)])
        dist_all = XX * n[0] + YY * n[1] - r0
        near = (np.abs(dist_all) < 3.5) & (alive > 0.08)
        ys, xs = np.nonzero(near)
        if len(ys) < 10: pool[np.abs(dist_all) < 1.5] = False; fails += 1; continue
        P = np.c_[xs + 0.5, ys + 0.5]; wt = alive[ys, xs]
        c, d, dev = fit_line(P, wt)
        nn = np.array([-d[1], d[0]])
        perp = (P - c) @ nn
        core = np.abs(perp) < 2.5
        c, d, _ = fit_line(P[core], wt[core]); nn = np.array([-d[1], d[0]])
        # gather again around the refined centre line (the first guess can be a pixel or two off, which would
        # cut one edge of the stroke off and make it look thinner)
        for band_ in (5.0, None):
            dd2 = (np.c_[XX.ravel() + 0.5, YY.ravel() + 0.5] - c) @ nn
            hb = band_ if band_ else max(3.2, wd_ / 2 + 1.6)
            near = (np.abs(dd2.reshape(H, W)) < hb) & (alive > 0.08)
            ys, xs = np.nonzero(near)
            P = np.c_[xs + 0.5, ys + 0.5]; wt = alive[ys, xs]
            core = np.abs((P - c) @ nn) < (2.5 if band_ else max(2.5, wd_ / 2))
            c, d, _ = fit_line(P[core], wt[core]); nn = np.array([-d[1], d[0]])
            pp = (P - c) @ nn
            wd_ = float(wt[np.abs(pp) < hb].sum() / max(np.ptp((P - c) @ d), 1) / max(np.percentile(wt, 75), 0.25))
        perp = (P - c) @ nn; tpar = (P - c) @ d
        sup = np.abs(perp) < max(3.2, wd_ / 2 + 1.2)
        tt = np.sort(tpar[sup & (wt > 0.3)])
        if len(tt) < 10: pool[ys, xs] = False; fails += 1; continue
        # runs along the line; a gap is bridged when something else is drawn across it in the photo
        # (another line, an axis, a label), since the plotted line runs underneath
        gaps = [i for i in np.where(np.diff(tt) > 9)[0]]
        if a_orig is not None and gaps:
            keep = []
            for i in gaps:
                ts_ = np.arange(tt[i] + 1, tt[i + 1] - 1, 0.7)
                pts = c[None] + ts_[:, None] * d[None]
                xi = np.clip(pts[:, 0].astype(int), 0, W - 1); yi = np.clip(pts[:, 1].astype(int), 0, H - 1)
                if len(ts_) == 0 or (a_orig[yi, xi] > 0.3).mean() < 0.85 or tt[i + 1] - tt[i] > 60: keep.append(i)
            gaps = keep
        cuts = np.array([-1] + list(gaps) + [len(tt) - 1], int); k = int(np.argmax(np.diff(cuts)))
        lo, hi = tt[cuts[k] + 1], tt[cuts[k + 1]]
        seg = sup & (tpar >= lo - 1) & (tpar <= hi + 1)
        L = hi - lo
        width = float(wt[seg].sum() / max(L, 1) / max(np.percentile(wt[seg][wt[seg] > 0.15], 75), 0.25))
        dens = float(((wt[seg] > 0.3).sum()) / max(L, 1))
        # a straight line keeps its centre; a curve's centre drifts away from the fitted line
        core_ = seg & (np.abs(perp) <= width / 2 + 0.6) & (wt > 0.5)
        ch_t = tpar[core_]; ch_p = perp[core_]
        drift = [float(np.median(ch_p[(ch_t >= t0_) & (ch_t < t0_ + 14)]))
                 for t0_ in np.arange(lo, hi - 7, 14) if ((ch_t >= t0_) & (ch_t < t0_ + 14)).sum() > 6]
        bent = False
        if len(drift) >= 4:
            tb = np.arange(len(drift)) * 14.0; q = np.polyfit(tb, drift, 2)
            sag = abs(q[0]) * (tb[-1] / 2) ** 2          # how far the centre bows away from a straight line
            bent = sag > max(1.2, 0.3 * width)
        if os.environ.get('RDBG'): print('cand', np.round(c), np.round(d, 3), 'L', round(L), 'w', round(width, 2), 'dens', round(dens, 2), 'bent', bent, drift and round(max(drift) - min(drift), 2))
        if L < 16 or width > 9 or dens < 0.6 * max(width, 1) or bent:
            pool[ys[seg], xs[seg]] = False; fails += 1
            if fails > 6: break
            continue
        band = np.abs((np.c_[XX.ravel() + 0.5, YY.ravel() + 0.5] - c) @ nn).reshape(H, W) <= max(3.2, width / 2 + 1.8)
        along = ((np.c_[XX.ravel() + 0.5, YY.ravel() + 0.5] - c) @ d).reshape(H, W)
        gone = band & (along >= lo - 2) & (along <= hi + 2)
        pool[gone] = False; alive[gone] = 0
        dup = any(abs(abs(float(np.dot(d, o['d']))) - 1) < 3e-4 and abs(float(np.dot(c - o['c'], nn))) < max(width, o['w']) for o in segs)
        if dup: continue
        segs.append(dict(p0=c + d * (lo - 0.5), p1=c + d * (hi + 0.5), w=max(0.6, width), pix=(ys[seg], xs[seg]), c=c, d=d))
    return segs


def corner_fit(xy):
    """how well the path is explained by two straight pieces meeting at a corner (max deviation, px)"""
    best = 1e9
    for i in range(8, len(xy) - 8, 3):
        d1 = fit_line(xy[:i])[2].max(); d2 = fit_line(xy[i:])[2].max()
        best = min(best, max(d1, d2))
    return best


def whole_curves(layer):
    """strokes that are one unbranched path and clearly bend (parabolas, cubics, square roots): traced whole as
    one smooth curve, so no part of them is mistaken for a straight line"""
    m = layer > 0.35
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    out, cm = [], np.zeros_like(m)
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None or max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) < 30: continue
        mk = lab[sl] == k
        sk = skeletonize(mk)
        dt = ndimage.distance_transform_edt(mk)
        hw = float(np.median(dt[sk])) if sk.any() else 1
        br = [b for b in trace_branches(sk) if len(b) >= max(30, 3 * hw)]   # shorter side branches are labels touching the curve
        ink = layer[sl][mk]
        width = float(ink.sum() / max(sk.sum(), 1) / max(np.percentile(ink[ink > 0.15], 75), 0.25))
        pieces = []
        for b in br:
            xy = b[:, ::-1] + 0.5 + [sl[1].start, sl[0].start]
            trim = int(2 * width + 4)            # the ends of a piece bend where it meets a crossing line
            mid = xy[trim:len(xy) - trim]
            bent = False
            if len(mid) >= 12:
                _, _, dev = fit_line(mid); bent = dev.max() > 2.0
            if bent and corner_fit(xy) < max(1.6, 0.6 * width): bent = False   # two straight lines meeting at a point
            if os.environ.get('RDBG') and len(mid) >= 12: print('piece', np.round(xy[0]), np.round(xy[-1]), len(xy), 'dev', round(float(fit_line(mid)[2].max()), 2), 'corner', round(corner_fit(xy), 2), 'w', round(width, 2))
            pieces.append((b, xy, bent))
        # a stroke is a curve only when all its long pieces bend; anything with a straight piece goes to the
        # line finder first (crossing straight lines also make bent pieces where they meet)
        # (callers pass only strokes that straight lines do not explain, so every long piece is part of the curve)
        if not pieces or not any(p[2] for p in pieces): continue
        for b, xy, _ in pieces:
            out.append(dict(xy=xy, w=width))
            near = np.zeros(mk.shape, bool); near[b[:, 0].astype(int), b[:, 1].astype(int)] = True
            cm[sl] |= ndimage.binary_dilation(near, iterations=int(width / 2 + 2)) & mk
    return out, cm


def section_width(layer, sg):
    """stroke width from many cross-sections along the line (median, so labels and crossings do not count)"""
    p0, p1 = np.array(sg['p0']), np.array(sg['p1'])
    L = np.hypot(*(p1 - p0)); d = (p1 - p0) / max(L, 1e-6); n = np.array([-d[1], d[0]])
    H, W = layer.shape
    ws = []
    for t in np.linspace(0.08, 0.92, 25) * L:
        c = p0 + d * t
        offs = np.arange(-8, 8.01, 0.25)
        pts = c[None] + offs[:, None] * n[None]
        xi = np.clip(pts[:, 0].astype(int), 0, W - 1); yi = np.clip(pts[:, 1].astype(int), 0, H - 1)
        prof = layer[yi, xi]
        if prof.max() < 0.3: continue
        ws.append(prof.sum() * 0.25 / max(np.percentile(prof[prof > 0.15], 75), 0.25))
    return float(np.median(ws)) if len(ws) >= 5 else sg['w']


def seg_near(a_, b_):
    d = np.array(b_['p1']) - np.array(b_['p0']); L = np.hypot(*d); d = d / max(L, 1e-6); n = np.array([-d[1], d[0]])
    off = [abs(float((np.array(p) - np.array(b_['p0'])) @ n)) for p in (a_['p0'], a_['p1'])]
    t = [float((np.array(p) - np.array(b_['p0'])) @ d) for p in (a_['p0'], a_['p1'])]
    return max(off) < b_['w'] / 2 + 1.5 and min(t) > -3 and max(t) < L + 3


def curved_parts(layer, dots):
    """strokes left in a colour layer after its straight lines are drawn: curves, traced along their centre"""
    m = layer > 0.35
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    curves = []; cmask = np.zeros_like(m)
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None or max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) < 30: continue
        mk = lab == k
        sk = skeletonize(mk)
        dt = ndimage.distance_transform_edt(mk)
        hw = float(np.median(dt[sk])) if sk.any() else 1
        for p in trace_branches(sk):
            # left over after the lines are drawn: only a long piece that really bends is a curve (short bits are
            # labels touching a line, or the edges of a crossing)
            if len(p) < 60: continue
            xy_ = p[:, ::-1] + 0.5; mid_ = xy_[10:-10]
            if len(mid_) < 20 or fit_line(mid_)[2].max() <= 2.0: continue
            ink = layer[mk]
            curves.append(dict(xy=p[:, ::-1] + 0.5, w=float(ink.sum() / max(sk.sum(), 1) / max(np.percentile(ink[ink > 0.15], 75), 0.25))))
        cmask |= mk
    return curves, cmask


def smooth(xy):
    """centre line of a traced curve: a smoothing spline through the pixel staircase (about 0.4 px average
    deviation), sampled finely"""
    if len(xy) < 5: return xy
    try:
        from scipy.interpolate import splprep, splev
        P = xy[np.r_[True, np.any(np.diff(xy, axis=0) != 0, axis=1)]]
        tck, u = splprep([P[:, 0], P[:, 1]], s=len(P) * 0.16, k=3)
        n = max(8, int(len(P) / 2))
        xs, ys = splev(np.linspace(0, 1, n), tck)
        out = np.c_[xs, ys]; out[0], out[-1] = P[0], P[-1]
        return rdp(out, 0.08)
    except Exception:
        pass
    k = np.array([1, 2, 3, 2, 1], float); k /= k.sum()
    pad = np.vstack([xy[:1].repeat(2, 0), xy, xy[-1:].repeat(2, 0)])
    sm = np.c_[np.convolve(pad[:, 0], k, 'valid'), np.convolve(pad[:, 1], k, 'valid')]
    sm[0], sm[-1] = xy[0], xy[-1]
    return rdp(sm, 0.25)


def merge_collinear(segs):
    """pieces of one plotted line (split where another line crosses it) become one line"""
    out = []
    for sg in sorted(segs, key=lambda s: -np.hypot(*(s['p1'] - s['p0']))):
        d = (sg['p1'] - sg['p0']); d = d / np.hypot(*d); n = np.array([-d[1], d[0]])
        for o in out:
            od = (o['p1'] - o['p0']); od = od / np.hypot(*od); on = np.array([-od[1], od[0]])
            tol = max(1.6, 0.75 * max(sg['w'], o['w']))
            if abs(abs(float(d @ od)) - 1) < 4e-4 and abs(float((sg['p0'] - o['p0']) @ on)) < tol and abs(float((sg['p1'] - o['p0']) @ on)) < tol:
                ts = [float((p - o['p0']) @ od) for p in (o['p0'], o['p1'], sg['p0'], sg['p1'])]
                o['p0'], o['p1'] = o['p0'] + od * min(ts), o['p0'] + od * max(ts)
                o['pix'] = (np.r_[o['pix'][0], sg['pix'][0]], np.r_[o['pix'][1], sg['pix'][1]]); break
        else: out.append(dict(sg))
    return out


def dots_fat(layer_full, cut, line_w):
    """markers: compact round spots clearly thicker than this colour's lines. The grid/axis pixels count as ink
    here, so a dot sitting on an axis is whole again."""
    M = (layer_full > 0.35) | cut
    dt = ndimage.distance_transform_edt(M)
    thr = max(2.6, line_w / 2 + 1.6)
    fl, fn = ndimage.label(dt >= thr)
    out = []
    lab_f, _ = ndimage.label(layer_full > 0.35, structure=np.ones((3, 3))); objs_f = ndimage.find_objects(lab_f)
    for j, sl in enumerate(ndimage.find_objects(fl), 1):
        if sl is None: continue
        yy, xx = np.nonzero(fl[sl] == j); yy = yy + sl[0].start; xx = xx + sl[1].start
        wt = dt[yy, xx]
        r = float(wt.max()) + 0.5
        ext = max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start)
        if ext > max(4, 1.3 * (r - thr + 1) * 2 + 2): continue          # elongated: a thick line, not a dot
        cy, cx = float(yy[np.argmax(wt)]) + 0.5, float(xx[np.argmax(wt)]) + 0.5
        top = wt >= wt.max() - 0.3
        cy, cx = float(yy[top].mean()) + 0.5, float(xx[top].mean()) + 0.5
        # the disc must be inked in this colour away from the grid
        H, W = M.shape
        y0, y1, x0, x1 = int(max(0, cy - r - 2)), int(min(H, cy + r + 3)), int(max(0, cx - r - 2)), int(min(W, cx + r + 3))
        YY, XX = np.mgrid[y0:y1, x0:x1]
        disc = ((XX + 0.5 - cx) ** 2 + (YY + 0.5 - cy) ** 2 <= (r - 0.7) ** 2) & ~cut[y0:y1, x0:x1]
        if disc.sum() < 6 or (layer_full[y0:y1, x0:x1][disc] > 0.35).mean() < 0.92: continue
        # a dot on its own must be round (a thick corner of a bold letter is not a dot)
        kk = lab_f[min(H - 1, int(cy)), min(W - 1, int(cx))]
        if kk:
            sl_ = objs_f[kk - 1]
            hh, ww = sl_[0].stop - sl_[0].start, sl_[1].stop - sl_[1].start
            if max(hh, ww) < 30:
                fill = (lab_f[sl_] == kk).mean()
                if abs(hh - ww) > 2 or not 0.66 <= fill <= 0.92 or abs(max(hh, ww) - 2 * r) > 3: continue
        out.append((cx, cy, r))
    return out


def circle_fit(xs, ys):
    """least-squares circle through points"""
    A = np.c_[2 * xs, 2 * ys, np.ones(len(xs))]
    bb = xs ** 2 + ys ** 2
    sol, *_ = np.linalg.lstsq(A, bb, rcond=None)
    cx, cy = sol[0], sol[1]; r = math.sqrt(max(sol[2] + cx ** 2 + cy ** 2, 0))
    return cx, cy, r, float(np.abs(np.hypot(xs - cx, ys - cy) - r).mean())


def dots_left(layer_res, layer_full, line_w, cut):
    """round blobs left in a colour layer once its lines are drawn: markers (filled circles).
    cut: pixels under the grid/axis lines already drawn (a dot on an axis is split there; those edges do not count)"""
    m = layer_res > 0.35
    lab, n = ndimage.label(m, structure=np.ones((3, 3)))
    boxes = []
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None or (lab[sl] == k).sum() < 6: continue
        boxes.append([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop])
    # pieces closer than 4 px (a dot split by a line) form one candidate
    groups = []
    for bx in boxes:
        for g in groups:
            if bx[0] <= g[2] + 4 and bx[2] >= g[0] - 4 and bx[1] <= g[3] + 4 and bx[3] >= g[1] - 4:
                g[:] = [min(g[0], bx[0]), min(g[1], bx[1]), max(g[2], bx[2]), max(g[3], bx[3])]; break
        else: groups.append(list(bx))
    out = []
    full = layer_full > 0.35
    cutd = ndimage.binary_dilation(cut, iterations=1)
    for x0, y0, x1, y1 in groups:
        h, w = y1 - y0, x1 - x0
        if max(h, w) > 26 or max(h, w) < max(5, 1.5 * line_w): continue
        X0, Y0 = max(0, x0 - 3), max(0, y0 - 3)
        res = m[Y0:y1 + 3, X0:x1 + 3]; cw = cutd[Y0:y1 + 3, X0:x1 + 3]
        edge = res & ~ndimage.binary_erosion(res) & ~cw
        ys, xs = np.nonzero(edge)
        if len(xs) < 6: continue
        cx, cy, r, err = circle_fit(xs + 0.5, ys + 0.5)
        dev = float(np.abs(np.hypot(xs + 0.5 - cx, ys + 0.5 - cy) - r).max())
        dbg = os.environ.get('RDBG')
        if dbg: print('dot?', x0, y0, x1, y1, 'r', round(r, 2), 'err', round(err, 2), 'dev', round(dev, 2), 'lw', round(line_w, 2))
        if err > 0.6 or dev > 1.3 or r < line_w / 2 + 1.5 or r > 14: continue   # corners (arrow heads) stick out
        YY, XX = np.mgrid[0:res.shape[0], 0:res.shape[1]]
        dd = (XX + 0.5 - cx) ** 2 + (YY + 0.5 - cy) ** 2
        disc = (dd <= (r - 0.6) ** 2) & ~cw
        win = full[Y0:y1 + 3, X0:x1 + 3]
        if dbg: print('   disc', disc.sum() and round(float(win[disc].mean()), 2))
        if disc.sum() == 0 or win[disc].mean() < 0.9: continue
        ring = disc & (dd >= (0.55 * r) ** 2)
        if dbg: print('   ring', round(float(res[ring].mean()), 2))
        if res[ring].mean() < 0.45: continue   # most of the disc must stick out beyond the line
        centre = (dd <= (0.45 * r) ** 2) & ~cw
        if centre.sum() and win[centre].mean() < 0.97: continue   # a ring (the digit 0) is not a dot
        outside = res & (dd > (r + 1.2) ** 2)
        lab_o, _ = ndimage.label(outside)
        if dbg: print('   centre/outside', centre.sum() and round(float(win[centre].mean()), 2), outside.sum(), disc.sum())
        if outside.sum() > 0.25 * max(disc.sum(), 1) and not cw[outside].any(): continue  # a point sticks out: arrow head
        c = (cx + X0, cy + Y0, r + 0.35)
        if all(math.hypot(c[0] - o[0], c[1] - o[1]) > 2 for o in out): out.append(c)
    return out


def redraw(I, name='', overrides=None):
    I = I.astype(float); H, W = I.shape[:2]
    a = ink_of(I)
    lines = settle_lines(axis_lines(I, a, False) + axis_lines(I, a, True))
    body = line_svg(sorted(lines, key=lambda L: -L['stroke'].mean()))   # pale grid first, dark axes on top
    R = np.clip(I / np.maximum(render(svg_doc(W, H, {}, body), W, H), 1) * 255, 0, 255)
    ar = ink_of(R)
    YY, XX = np.mgrid[0:H, 0:W]
    cut = ink_of(render(svg_doc(W, H, {}, body), W, H)) > 0.25
    greyish = lambda c: c.max() - c.min() < 40
    dark_body = line_svg([L for L in lines if L['stroke'].mean() < 130 and greyish(L['stroke']) and L['w'] <= 4])
    cut_dark = ink_of(render(svg_doc(W, H, {}, dark_body), W, H)) > 0.25 if dark_body else np.zeros((H, W), bool)
    dot_cands = []
    # ends of dark lines (axes): an arrow head there is a shape, not a dot or a letter
    ends = []
    for L in lines:
        if L['stroke'].mean() < 130 and L['b'] - L['a'] > 0.4 * (H if L['v'] else W):
            for e in (L['a'], L['b']): ends.append((L['pos'], e) if L['v'] else (e, L['pos']))
    near_end = lambda x, y, d: any(math.hypot(x - ex, y - ey) <= d for ex, ey in ends)
    axes = [L for L in lines if L['stroke'].mean() < 130 and L['b'] - L['a'] > 0.4 * (H if L['v'] else W)]
    def arrow_like(x, y, r):   # centred on an axis, near one of its ends
        for L in axes:
            u, v = (y, x) if L['v'] else (x, y)
            if abs(v - L['pos']) < 2 and (u - L['a'] < r + 24 or L['b'] - u < r + 24): return True
        return False
    # plotted lines, curves and dots, one colour at a time
    stroke_els, dot_els = [], []
    for layer in colour_layers(I, ar):
        # pieces the size of a label character are left for the label reader
        ll, ln = ndimage.label(layer > 0.2, structure=np.ones((3, 3)))
        small = np.zeros(ln + 1, bool)
        for k, sl in enumerate(ndimage.find_objects(ll), 1):
            if sl is not None and max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) < 30: small[k] = True
        layer_full = layer
        layer = np.where(small[ll], 0, layer)
        # strokes that straight lines explain (92% of their ink) are straight lines; only the rest can be curves
        segs0 = merge_collinear(straight_lines(layer, np.zeros(layer.shape, bool), a, layer_full))
        els0 = [f'<line x1="{g["p0"][0]:.2f}" y1="{g["p0"][1]:.2f}" x2="{g["p1"][0]:.2f}" y2="{g["p1"][1]:.2f}" stroke="#000" stroke-width="{g["w"] + 2:.2f}"/>' for g in segs0]
        cover0 = ink_of(render(svg_doc(W, H, {}, els0), W, H)) > 0.3 if els0 else np.zeros((H, W), bool)
        cl, cn = ndimage.label(layer > 0.35, structure=np.ones((3, 3)))
        linear = np.zeros(cn + 1, bool)
        for k, sl in enumerate(ndimage.find_objects(cl), 1):
            if sl is None: continue
            mk = cl[sl] == k
            if mk.sum() and cover0[sl][mk].mean() >= 0.92: linear[k] = True
        if (overrides or {}).get('curves_only'):   # hint: the graph plots only curves (no straight data lines)
            linear[:] = False
        wcurves, wmask = whole_curves(np.where(linear[cl], 0, layer))
        segs = [] if (overrides or {}).get('curves_only') else merge_collinear(straight_lines(np.where(wmask, 0, layer), np.zeros(layer.shape, bool), a, np.where(wmask, 0, layer_full)))
        for sg in segs: sg['w'] = section_width(layer_full, sg)
        # a short segment as thick as the plotted lines is a stroke of a bold letter touching a line, not a line
        # (short pointer lines next to labels are thin)
        long_w = [sg['w'] for sg in segs if np.hypot(*(np.array(sg['p1']) - sg['p0'])) >= 60]
        if long_w:
            lw_ = float(np.median(long_w))
            segs = [sg for sg in segs if np.hypot(*(np.array(sg['p1']) - sg['p0'])) >= 45 or sg['w'] <= 0.65 * lw_]
        # a much thinner copy alongside a line is its own leftover edge
        segs = [sg for sg in segs if not any(o is not sg and o['w'] > 1.6 * sg['w'] and seg_near(sg, o) for o in segs)]
        els = []
        for sg in segs:
            col = stroke_colour(I, a, sg['pix'])
            els.append(f'<line x1="{sg["p0"][0]:.2f}" y1="{sg["p0"][1]:.2f}" x2="{sg["p1"][0]:.2f}" y2="{sg["p1"][1]:.2f}" stroke="{hexcol(col)}" stroke-width="{sg["w"]:.2f}"/>')
        # curves: what the straight lines leave of this colour
        drawn = ink_of(render(svg_doc(W, H, {}, els), W, H)) if els else np.zeros((H, W))
        left = np.where(ndimage.binary_dilation(drawn > 0.1, iterations=1) | wmask, 0, layer)
        curves, cmask = curved_parts(left, [])
        if os.environ.get('RDBG'): print('curves: whole', [(np.round(c['xy'][0]), np.round(c['xy'][-1]), len(c['xy'])) for c in wcurves], 'left', [(np.round(c['xy'][0]), np.round(c['xy'][-1]), len(c['xy'])) for c in curves])
        curves = wcurves + curves; cmask = cmask | wmask
        if curves:
            # next to a curve, a short "straight" piece is a flat stretch of that curve: follow its own pixels
            keep_els = []
            for g_, el_ in zip(segs, els[:len(segs)]):
                L_ = float(np.hypot(*(np.array(g_['p1']) - g_['p0'])))
                if L_ < 90 and len(g_['pix'][0]) > 10:
                    mk_ = np.zeros((H, W), bool); mk_[g_['pix']] = True
                    br_ = sorted(trace_branches(skeletonize(ndimage.binary_closing(mk_))), key=len)
                    if br_ and len(br_[-1]) >= 8:
                        curves.append(dict(xy=br_[-1][:, ::-1] + 0.5, w=g_['w'])); continue
                keep_els.append(el_)
            els = keep_els + els[len(segs):]
        for cv in curves:
            pts = smooth(cv['xy'])
            ys, xs = np.nonzero(cmask); col = stroke_colour(I, a, (ys, xs))
            d = 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in pts)
            els.append(f'<path d="{d}" fill="none" stroke="{hexcol(col)}" stroke-width="{cv["w"]:.2f}" stroke-linejoin="round" stroke-linecap="round"/>')
        stroke_els += els
        # markers: what this layer still has once its own lines are drawn
        if els:
            drawn = ink_of(render(svg_doc(W, H, {}, els), W, H))
            removed = ndimage.binary_dilation(drawn > 0.1, iterations=1)
            lres = np.where(removed, 0, layer)
        else: lres = layer; removed = np.zeros((H, W), bool)
        ws_ = [sg['w'] for sg in segs] + [cv['w'] for cv in curves]
        lw = float(np.median(ws_)) if ws_ else 2.0
        for cx, cy, r in dots_fat(layer_full, cut_dark, lw):
            yy, xx = np.nonzero((XX + 0.5 - cx) ** 2 + (YY + 0.5 - cy) ** 2 < (r * 0.55) ** 2)
            col = np.median(I[yy, xx], 0) if len(yy) else np.array([40, 40, 40])
            if near_end(cx, cy, r + 14) or arrow_like(cx, cy, r): continue
            dot_cands.append((cx, cy, r, col))
    # keep a dot only if drawing it makes the redraw match the photo clearly better (at a crossing of two
    # thick lines it would add ink where the photo is white)
    base = ink_of(render(svg_doc(W, H, {}, body + stroke_els), W, H))
    def disc_cov(cx, cy, r, y0, y1, x0, x1):
        sub = np.mgrid[y0:y1:0.25, x0:x1:0.25]
        inside = ((sub[1] + 0.125 - cx) ** 2 + (sub[0] + 0.125 - cy) ** 2 <= r * r).astype(float)
        return inside.reshape(y1 - y0, 4, x1 - x0, 4).mean((1, 3))
    for cx0, cy0, r0, col in dot_cands:
        y0, y1, x0, x1 = int(max(0, cy0 - r0 - 6)), int(min(H, cy0 + r0 + 7)), int(max(0, cx0 - r0 - 6)), int(min(W, cx0 + r0 + 7))
        dink = (255 - col.min()) / 255
        A, B = a[y0:y1, x0:x1], base[y0:y1, x0:x1]
        e0 = np.abs(A - B).sum(); best = None
        # position and size that match the photo best
        for step, span, rspan in ((0.5, 2.5, (-2.5, 0.75)), (0.125, 0.375, (-0.3, 0.3))):
            c0 = (best[1], best[2], best[3]) if best else (cx0, cy0, r0)
            for dx in np.arange(-span, span + 1e-9, step):
                for dy in np.arange(-span, span + 1e-9, step):
                    for dr in np.arange(rspan[0], rspan[1] + 1e-9, 0.25 if step > 0.2 else 0.1):
                        cx, cy, r = c0[0] + dx, c0[1] + dy, c0[2] + dr
                        if r < 2: continue
                        cov = disc_cov(cx, cy, r, y0, y1, x0, x1)
                        e1 = np.abs(A - (1 - (1 - B) * (1 - cov * dink))).sum()
                        if best is None or e1 < best[0]: best = (e1, cx, cy, r, cov.sum())
        e1, cx, cy, r, area = best
        if os.environ.get('RDBG'): print('dotcand', round(cx0, 1), round(cy0, 1), round(r0, 1), '->', round(cx, 2), round(cy, 2), round(r, 2), 'e0', round(e0, 1), 'e1', round(e1, 1), 'need', round(0.35 * area * dink, 1))
        if e1 < 0.65 * e0 and e0 - e1 > 0.12 * area * dink:   # it removes most of the mismatch there
            dot_els.append(f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r:.2f}" fill="{hexcol(col)}"/>')
    R2 = np.clip(I / np.maximum(render(svg_doc(W, H, {}, body + stroke_els + dot_els), W, H), 1) * 255, 0, 255)
    ar2 = ink_of(R2)
    bg = ink_of(render(svg_doc(W, H, {}, body + stroke_els + dot_els), W, H))
    # what is left: labels and small shapes. Ink right on a drawn stroke is the stroke's own anti-aliased edge.
    drawn_strokes = ink_of(render(svg_doc(W, H, {}, stroke_els + dot_els), W, H)) > 0.08
    on_stroke = ndimage.binary_dilation(drawn_strokes, iterations=1)
    mask = (ar2 > 0.25) & ~on_stroke
    lab, n = ndimage.label(mask, structure=np.ones((3, 3)))
    comps = []
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None: continue
        m = lab[sl] == k; area = int(m.sum())
        if area < 2 or ar2[sl][m].sum() < 1.0: continue
        comps.append(dict(k=k, sl=sl, h=m.shape[0], w=m.shape[1], area=area, box=(sl[1].start, sl[0].start, sl[1].stop, sl[0].stop)))
    def on_axis_end(c):   # centred on an axis line, at one of its ends
        cx_, cy_ = (c['box'][0] + c['box'][2]) / 2, (c['box'][1] + c['box'][3]) / 2
        for L in axes:
            u, v = (cy_, cx_) if L['v'] else (cx_, cy_)
            span = (c['box'][1], c['box'][3]) if not L['v'] else (c['box'][0], c['box'][2])
            straddles = span[0] - 1.5 <= L['pos'] <= span[1] + 1.5
            if straddles and abs(v - L['pos']) < max(c['h'], c['w']) / 2 + 2 and (u - L['a'] < max(c['h'], c['w']) + 8 or L['b'] - u < max(c['h'], c['w']) + 8):
                return True
        return False
    arrows = [c for c in comps if on_axis_end(c)]
    comps = [c for c in comps if c not in arrows]
    words = [dict(box=c['box'], c=[c], shape=True) for c in arrows]
    # a character cut in two by a plotted line or an axis: its pieces are joined when only that line lies between
    split_by = ink_of(render(svg_doc(W, H, {}, dark_body + stroke_els), W, H)) > 0.3
    def cut_apart(A, B):
        ax0, ay0, ax1, ay1 = A['box']; bx0, by0, bx1, by1 = B['box']
        gx0, gx1 = min(ax1, bx1), max(ax0, bx0); gy0, gy1 = min(ay1, by1), max(ay0, by0)
        if gx1 - gx0 > 7 or gy1 - gy0 > 7: return False          # too far apart
        x0_, x1_ = min(ax0, bx0), max(ax1, bx1); y0_, y1_ = min(ay0, by0), max(ay1, by1)
        if max(x1_ - x0_, y1_ - y0_) > 1.6 * max(A['h'], A['w'], B['h'], B['w']) + 2: return False
        if gy1 > gy0:   # one above the other
            reg = split_by[gy0:gy1, max(ax0, bx0):max(min(ax1, bx1), max(ax0, bx0) + 1)]
        elif gx1 > gx0:
            reg = split_by[max(ay0, by0):max(min(ay1, by1), max(ay0, by0) + 1), gx0:gx1]
        else: return False
        return reg.size > 0 and reg.mean() > 0.5
    joined = True
    while joined:
        joined = False
        for i in range(len(comps)):
            for j in range(i + 1, len(comps)):
                A, B = comps[i], comps[j]
                if cut_apart(A, B):
                    kA = A['k'] if isinstance(A['k'], list) else [A['k']]; kB = B['k'] if isinstance(B['k'], list) else [B['k']]
                    x0_, y0_ = min(A['box'][0], B['box'][0]), min(A['box'][1], B['box'][1])
                    x1_, y1_ = max(A['box'][2], B['box'][2]), max(A['box'][3], B['box'][3])
                    comps[i] = dict(k=kA + kB, parts=A.get('parts', [A]) + B.get('parts', [B]), box=(x0_, y0_, x1_, y1_), h=y1_ - y0_, w=x1_ - x0_,
                                    sl=(slice(y0_, y1_), slice(x0_, x1_)), area=A['area'] + B['area'])
                    del comps[j]; joined = True; break
            if joined: break
    for c in sorted(comps, key=lambda c: c['box'][0]):
        x0, y0, x1, y1 = c['box']
        for wd in words:
            if wd.get('shape'): continue
            X0, Y0, X1, Y1 = wd['box']; hh = max(Y1 - Y0, y1 - y0)
            vo = min(Y1, y1) - max(Y0, y0)
            if vo > 0.25 * min(Y1 - Y0, y1 - y0) and x0 - X1 < 0.5 * hh and x0 >= X0 - 1 and max(Y1, y1) - min(Y0, y0) < 1.5 * max(Y1 - Y0, y1 - y0):
                wd['box'] = (min(X0, x0), min(Y0, y0), max(X1, x1), max(Y1, y1)); wd['c'].append(c); break
        else: words.append(dict(box=c['box'], c=[c]))
    defs, txt_els, shape_els, labels = {}, [], [], []
    # first pass: read every label piece by piece, to learn the graph's label sizes and minus sign
    first = {}
    for wd in words:
        x0_, y0_, x1_, y1_ = wd['box']; tall_ = max(c['h'] for c in wd['c'])
        if not wd.get('shape') and 6 <= tall_ <= 0.2 * H and (x1_ - x0_) < 0.5 * W:
            r_ = read_word(ar2, wd['c'], lab, a, bg)
            if r_ and all(g['iou'] >= 0.5 for g in r_[3]): first[id(wd)] = r_
    sizes_by_w = {}
    for r_ in first.values(): sizes_by_w.setdefault(r_[2], []).append(r_[1])
    typical_size = lambda w: float(np.median(sizes_by_w.get(w) or sizes_by_w.get('r') or [v for vs in sizes_by_w.values() for v in vs] or [14]))
    mins = [ch for r_ in first.values() for g in r_[3] for ch in g['ch'] if ch in '-−']
    minus_style = max(set(mins), key=mins.count) if mins else '−'
    # typical label size: the commonest character height among pieces in groups of two or more
    multi = [max(c['h'] for c in wd['c']) for wd in words if len(wd['c']) >= 2 and not wd.get('shape')]
    typical = (float(np.median(multi)) / 0.729) if multi else 0
    ovr = overrides or {}
    ov = ovr.get('labels', {})
    clear = ovr.get('clear', [])
    inside = lambda b, r: b[0] >= r[0] and b[1] >= r[1] and b[2] <= r[2] and b[3] <= r[3]
    words = [wd for wd in words if not any(inside(wd['box'], r) for r in clear)]
    ents = []   # one entry per label: read piece by piece, by the dictionary, or not yet
    NUM = re.compile(r'^[−-]?\d+$')
    def plausible(t):  # a reading with a stray point or comma (not between digits, not in brackets) is doubtful
        if '(' in t or ')' in t: return True
        return not re.search(r'(^|[^\d])[.,]|[.,]($|[^\d])', t)
    for wd in words:
        x0, y0, x1, y1 = wd['box']
        key = f'{x0},{y0}'
        tall = max(c['h'] for c in wd['c'])
        ks = [k for c0 in wd['c'] for k in (c0['k'] if isinstance(c0['k'], list) else [c0['k']])]
        ys, xs = np.nonzero(np.isin(lab[y0:y1, x0:x1], ks))
        col = stroke_colour(I[y0:y1, x0:x1], a[y0:y1, x0:x1], (ys, xs))
        E_ = dict(wd=wd, box=wd['box'], col=col, status='failed')
        ents.append(E_)
        rw = None
        if not wd.get('shape') and 6 <= tall <= 0.2 * H and (x1 - x0) < 0.5 * W and ov.get(key, 1) != '':
            rw = first.get(id(wd)) or read_word(ar2, wd['c'], lab, a, bg)
        if not rw: continue
        tot, size, wt, res = rw
        text = ''.join(g['ch'] for g in res)
        score = float(min(g['iou'] for g in res)); margin = float(min((g['iou'] - g['alt'][0]) if g['alt'] else 1 for g in res))
        E_.update(res=res, size=size, w=wt, text=text, score=score, margin=margin, how='pieces')
        ok = score >= 0.42 and margin >= 0.06 and plausible(text)
        if ok and '@' in text:   # a label on its side (a y-axis name) stands alone in the margin
            X0_, Y0_, X1_, Y1_ = max(0, x0 - 6), max(0, y0 - 6), min(W, x1 + 6), min(H, y1 + 6)
            ring_ = a[Y0_:Y1_, X0_:X1_] > 0.3; ring_[y0 - Y0_:y1 - Y0_, x0 - X0_:x1 - X0_] = False
            if ring_.sum() > 6: ok = False
        # a lone mark much smaller than the graph's labels (a tick mark) is not a character
        if ok and len(res) == 1 and len(res[0]['ch']) == 1 and size < 0.7 * typical and res[0]['iou'] < 0.75: ok = False
        if key in ov and len(ov[key]) == len(res):
            for g, chx in zip(res, ov[key]): g['ch'] = chx
            E_['text'] = ov[key]; ok = True
        if ok: E_['status'] = 'ok'; continue
        # second chance: the whole label against every plausible label
        all_sizes = [typical_size(w_) for w_ in (sizes_by_w or {'r': 0})]
        if not wd.get('shape') and 0.6 * min(all_sizes) * 0.729 <= tall <= 1.5 * max(all_sizes) * 0.729 + 2:
            tries = []
            for w_ in (sizes_by_w or {'r': 0}):   # each label size and weight the graph uses
                for r_ in read_dictionary(a, bg, wd['box'], typical_size(w_), w_, minus_style): tries.append(r_)
            for w_ in ('r', 'b'):   # letters sized to the label itself, when the graph has no labels of that kind to size them by
                lets = ['x', 'y'] if w_ in sizes_by_w else ['x', 'y', 'A', 'B', 'C', 'D', 'F', 'T']
                if 'i' in sizes_by_w: lets = [l_ for l_ in lets if l_ not in 'xy']
                if lets:
                    for r_ in read_dictionary(a, bg, wd['box'], None, w_, minus_style, only=lets): tries.append(r_)
            tries.sort(key=lambda r_: -r_[0])
            seen_ = set(); tries = [r_ for r_ in tries if not (r_[1] in seen_ or seen_.add(r_[1]))]   # one entry per reading
            if tries:
                sc, t, ww, cx, cy, sz_ = tries[0]
                mg = sc - tries[1][0] if len(tries) > 1 else 1
                E_.update(place=(t, ww, sz_, cx, cy), dtext=t, dscore=float(sc), dmargin=float(mg))
                if sc >= 0.5 and mg >= 0.05: E_.update(status='ok', text=t, how='dictionary', score=float(sc), margin=float(mg))
                elif sc >= 0.4: E_['status'] = 'uncertain'
        if E_['status'] == 'failed' and score >= 0.4 and plausible(text): E_['status'] = 'uncertain'
    # tick numbers along an axis are evenly spaced: the confident ones fix value = a + b * position, which
    # settles uncertain ones (a line hiding part of a digit) and flags any reading that disagrees
    axis_notes = []
    # everything that might be a tick number: numbers, anything with a digit (a cut "2" read as "7)"), unread labels
    nums = [E_ for E_ in ents if (E_.get('text') and re.search(r'\d', E_.get('text') or '')) or (E_['status'] in ('uncertain', 'failed') and not E_['wd'].get('shape'))]
    val = lambda t: int(t.replace('−', '-'))
    def fit_axis(mem, pos):
        conf = [E_ for E_ in mem if E_['status'] == 'ok' and NUM.match(E_['text']) and E_['score'] >= 0.5]
        if len(conf) == 2 and val(conf[0]['text']) != val(conf[1]['text']) and abs(pos(conf[0]) - pos(conf[1])) > 5:
            # two labels fix the axis but cannot check each other: only confirm a reading that already agrees
            bb_ = (val(conf[1]['text']) - val(conf[0]['text'])) / (pos(conf[1]) - pos(conf[0])); aa_ = val(conf[0]['text']) - bb_ * pos(conf[0])
            step = abs(val(conf[1]['text']) - val(conf[0]['text']))
            for E_ in mem:
                if E_['status'] == 'ok': continue
                own = E_.get('text') if E_.get('text') and NUM.match(E_.get('text')) else (E_.get('dtext') if E_.get('dtext') and NUM.match(E_.get('dtext')) else None)
                if own is None: continue
                pred = aa_ + bb_ * pos(E_)
                if abs(pred - val(own)) < 0.1 * step and E_.get('score', 0) >= 0.45:
                    E_['status'] = 'ok'; E_['how'] = E_.get('how') or 'pieces'
                    if E_.get('how') != 'pieces' and E_.get('place'): E_['how'] = 'dictionary'
            return None
        if len(conf) < 3: return None
        vs = sorted({val(e['text']) for e in conf})
        step = min(b - a for a, b in zip(vs, vs[1:])) if len(vs) > 1 else 1
        best = None
        for i_ in range(len(conf)):
            for j_ in range(i_ + 1, len(conf)):
                p1, p2 = pos(conf[i_]), pos(conf[j_])
                if abs(p2 - p1) < 5 or val(conf[j_]['text']) == val(conf[i_]['text']): continue
                bb_ = (val(conf[j_]['text']) - val(conf[i_]['text'])) / (p2 - p1); aa_ = val(conf[i_]['text']) - bb_ * p1
                inl = [e for e in conf if abs(aa_ + bb_ * pos(e) - val(e['text'])) < 0.2 * step]
                if best is None or len(inl) > len(best[2]): best = (aa_, bb_, inl, step)
        if not best or len(best[2]) < 3 or len(best[2]) < 0.6 * len(conf): return None
        return best
    def apply_axis(mem, pos, fit):
        aa_, bb_, inl, step = fit
        anchor = val(inl[0]['text'])
        for E_ in mem:
            pred = aa_ + bb_ * pos(E_)
            near = None
            for st in (step, step / 2, step / 4, step / 5):   # the readable labels may skip every other tick
                cand_ = anchor + st * round((pred - anchor) / st)
                if abs(pred - cand_) <= 0.25 * st and abs(cand_ - round(cand_)) < 1e-6: near = int(round(cand_)); break
            if near is None: continue
            pt = str(near).replace('-', minus_style)
            if E_['status'] == 'ok' and NUM.match(E_['text']) and val(E_['text']) == near: continue
            r_ = read_dictionary(a, bg, E_['box'], typical_size(E_.get('w', 'r')), E_.get('w', 'r'), minus_style, only=[pt])
            # the axis value must fit what is visible at least as well as any other number of that length
            # (a line may hide most of a digit; the axis then decides)
            others = [str(n).replace('-', minus_style) for n in range(-99, 100) if len(str(n).replace('-', minus_style)) == len(pt) and str(n).replace('-', minus_style) != pt]
            ro = read_dictionary(a, bg, E_['box'], typical_size(E_.get('w', 'r')), E_.get('w', 'r'), minus_style, only=others) if r_ and 0.28 <= r_[0][0] < 0.38 else []
            if r_ and (r_[0][0] >= 0.38 or (r_[0][0] >= 0.28 and (not ro or r_[0][0] >= ro[0][0] - 0.005))):
                if E_['status'] == 'ok': axis_notes.append(dict(box=list(map(int, E_['box'])), read=E_['text'], axis=pt, used='axis'))
                sc, t, ww, cx, cy, sz_ = r_[0]
                E_.update(status='ok', text=t, how='axis', score=float(sc), place=(t, ww, sz_, cx, cy))
            elif E_['status'] == 'ok':
                axis_notes.append(dict(box=list(map(int, E_['box'])), read=E_['text'], axis=pt, used='none')); E_['status'] = 'conflict'
    # x-axis rows first; labels that fit a row belong to it; the rest may form y-axis columns
    rows = []
    for E_ in nums:
        cy_ = (E_['box'][1] + E_['box'][3]) / 2
        for g in rows:
            if abs(g['y'] - cy_) <= 3: g['m'].append(E_); break
        else: rows.append(dict(y=cy_, m=[E_]))
    taken = set()
    px = lambda E_: (E_['box'][0] + E_['box'][2]) / 2
    py = lambda E_: (E_['box'][1] + E_['box'][3]) / 2
    for g in rows:
        if len(g['m']) < 3: continue
        f_ = fit_axis(g['m'], px)
        if os.environ.get('RDBG'): print('row', round(g['y']), [(e.get('text'), e['status'], round(px(e))) for e in g['m']], f_ and (round(f_[0], 2), round(f_[1], 4), len(f_[2])))
        if f_:
            apply_axis(g['m'], px, f_); taken |= {id(e) for e in g['m']}
    cols = []
    for E_ in nums:
        if id(E_) in taken: continue
        rx = E_['box'][2]
        for g in cols:
            if abs(g['x'] - rx) <= 4: g['m'].append(E_); break
        else: cols.append(dict(x=rx, m=[E_]))
    for g in cols:
        if os.environ.get('RDBG'): print('col', round(g['x']), [(e.get('text'), e['status'], round(py(e))) for e in g['m']])
        if len(g['m']) < 3: continue
        f_ = fit_axis(g['m'], py)
        if f_: apply_axis(g['m'], py, f_)
    # pieces inside a placed label belong to it (e.g. the visible end of a minus sign the rest of which is
    # under a line); two readings of the same label keep the better one
    def drawn_box(E_):
        if E_.get('how') in ('dictionary', 'axis') and E_.get('place'):
            t, ww, sz_, cx, cy = E_['place']; run, bb, upm = glyph_run(t, ww)
            hw_, hh_ = (bb[2] - bb[0]) / upm * sz_ / 2, (bb[3] - bb[1]) / upm * sz_ / 2
            return (cx - hw_, cy - hh_, cx + hw_, cy + hh_)
        return E_['box']
    def inside_frac(b, B):
        ix = max(0, min(b[2], B[2] + 1) - max(b[0], B[0] - 1)); iy = max(0, min(b[3], B[3] + 1) - max(b[1], B[1] - 1))
        return ix * iy / max((b[2] - b[0]) * (b[3] - b[1]), 1)
    oks = sorted([E_ for E_ in ents if E_['status'] == 'ok'], key=lambda E_: -E_.get('score', 0))
    for i_, E_ in enumerate(oks):
        if E_['status'] != 'ok': continue
        B = drawn_box(E_)
        for F_ in ents:
            if F_ is E_ or F_['status'] == 'consumed': continue
            if inside_frac(F_['box'], B) >= 0.7 and (F_['status'] != 'ok' or inside_frac(drawn_box(F_), B) >= 0.7):
                F_['status'] = 'consumed'
    for E_ in ents:
        wd = E_['wd']
        if E_['status'] == 'consumed': continue
        if E_['status'] == 'ok':
            els = []
            if E_.get('how') == 'pieces':
                for g in E_['res']:
                    bx0, by0, bx1, by1 = g['c']['box']
                    ch, rot = (g['ch'][0], 1) if g['ch'].endswith('@') else (g['ch'], 0)
                    if len(ch) > 1:   # two touching characters read together
                        e2, d2 = string_els(ch, E_['w'], E_['size'], (bx0 + bx1) / 2, (by0 + by1) / 2); els += e2; defs.update(d2); continue
                    el, gid, dpath = glyph_use(ch, E_['w'], (bx0 + bx1) / 2, (by0 + by1) / 2, E_['size'], rot)
                    els.append(el); defs[gid] = dpath
            else:
                t, ww, sz_, cx, cy = E_['place']
                e2, d2 = string_els(t, ww, sz_, cx, cy); els += e2; defs.update(d2)
            txt_els.append(f'<g fill="{hexcol(E_["col"])}">' + ''.join(els) + '</g>')
            sz_r = E_['size'] if E_.get('how') == 'pieces' else E_['place'][2]
            labels.append(dict(box=list(map(int, E_['box'])), text=E_['text'], how=E_.get('how'), w=E_.get('w') if E_.get('how') == 'pieces' else E_['place'][1],
                               size=round(float(sz_r), 2), score=round(E_.get('score', 0), 3), margin=round(E_.get('margin', 1), 3)))
            continue
        if E_.get('text') or E_.get('dtext'):
            labels.append(dict(box=list(map(int, E_['box'])), text=None, read=E_.get('text'), dict_read=E_.get('dtext'), score=round(E_.get('score', 0), 3), status=E_['status']))
        for c in [p for c0 in wd['c'] for p in c0.get('parts', [c0])]:
            sl = c['sl']; yy0, xx0 = sl[0].start, sl[1].start
            sub = np.pad(np.where(lab[sl] == c['k'], ar2[sl], 0), 1)
            col = stroke_colour(I, a, np.nonzero(lab == c['k']))
            parts = []
            for ct in measure.find_contours(sub, 0.5 * max(float(sub.max()), 0.2)):   # half of its own darkest ink
                pts = rdp(ct[:, ::-1] + [xx0 - 1 + 0.5, yy0 - 1 + 0.5], 0.3)
                if len(pts) >= 3: parts.append('M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in pts) + 'Z')
            if parts: shape_els.append(f'<path d="{"".join(parts)}" fill="{hexcol(col)}" fill-rule="evenodd"/>')
    if ovr.get('place'):
        pe, pd = place_strings(ovr['place'], a, bg, W, H)
        col = ovr.get('colour', '#4a545f')
        txt_els.append(f'<g fill="{col}">' + ''.join(pe) + '</g>'); defs.update(pd)
        labels += [dict(text=P['text'], placed=P['fit']) for P in ovr['place']]
    svg = svg_doc(W, H, defs, body + stroke_els + dot_els + shape_els + txt_els)
    return svg, dict(name=name, lines=len(lines), strokes=len(stroke_els), dots=len(dot_els), shapes=len(shape_els), labels=labels, axis_conflicts=axis_notes)


def compare(I, svg):
    """ink in the photo missing from the redraw (and the reverse), beyond 1.5 px"""
    H, W = I.shape[:2]
    a = ink_of(I.astype(float)); b = ink_of(render(svg, W, H))
    da, db = a > 0.4, b > 0.4
    near = lambda m: ndimage.binary_dilation(m, iterations=2)
    miss = da & ~near(b > 0.15); extra = db & ~near(a > 0.15)
    return int(miss.sum()), int(extra.sum()), float(np.abs(a - b).mean()), (miss, extra)


def one(nm, ov):
    sys.path.insert(0, HERE)
    import vec
    t, p, x = re.match(r'(\w+?)_p(\d+)_x(\d+)\.svg', nm).groups()
    I = np.asarray(vec.photo(t, int(x)))
    svg, info = redraw(I, nm, ov)
    miss, extra, mad, _ = compare(I, svg)
    info.update(miss=miss, extra=extra, mad=round(mad, 4))
    return nm, svg, info


if __name__ == '__main__':
    sys.path.insert(0, HERE)
    import vec
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or json.load(open(os.path.join(HERE, 'eta', 'raster_left.json')))
    ovf = os.path.join(HERE, 'redraw_text.json')
    overrides = json.load(open(ovf)) if os.path.exists(ovf) else {}
    rep_f = os.path.join(OUT, 'report.json')
    report = json.load(open(rep_f)) if os.path.exists(rep_f) else {}
    from multiprocessing import Pool
    with Pool(int(os.environ.get('JOBS', os.cpu_count() or 2))) as pool:
        results = pool.starmap(one, [(nm, overrides.get(nm)) for nm in names])
    for nm, svg, info in results:
        open(os.path.join(OUT, nm), 'w').write(svg)
        report[nm] = info
        bad = [l for l in info['labels'] if l['text'] is None]
        print(nm, f"lines {info['lines']} strokes {info['strokes']} dots {info['dots']} shapes {info['shapes']} labels {len(info['labels'])}",
              f"miss {info['miss']} extra {info['extra']} mad {info['mad']:.4f}", 'weak labels:', [(l['box'][:2], l.get('read') or l['text'], l['score']) for l in bad])
    json.dump(report, open(rep_f, 'w'), indent=1)
