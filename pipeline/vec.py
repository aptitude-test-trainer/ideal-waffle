"""Vector versions of the ETA study-guide pictures.

crop.py cuts every picture out of a 144 dpi page render and records where it came from ([test, page, x0, y0, x1, y1]
in PDF points). This script cuts the same region straight out of the PDF as SVG, so lines and text stay sharp at
any zoom. Content outside the region is stripped to keep the files small. Embedded photos keep their full original
resolution, and graph photos that were redrawn as vector art (pipeline/redraw/*.svg, made by redraw.py) replace
the photo.

Every result is checked against the page render it replaces: rendered at 144 dpi, it must match the crop.py picture
(see check()). Output: eta/vec.json  {"test|page|x0|y0|x1|y1": svg-text}
"""
import math
import os, re, io, json, math, sys
import xml.etree.ElementTree as ET
import numpy as np
import pymupdf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PDF = {'ts1': 'Timed_Simulation_1_Practice_Test', 'ts2': 'Timed_Simulation_2_Practice_Test', 'ts3': 'Timed_Simulation_3_Practice_Test',
       'ts4': 'Timed_Simulation_4_Practice_Test', 'diag': 'Math_Diagnostic_Practice_Test', 'i33': 'IBEW_33_Question_Math_Practice_Test',
       'i34': 'IBEW_34_Question_Math_Practice_Test', 'i34b': 'IBEW_34_Question_Math_Practice_Test-1'}
SVGNS = 'http://www.w3.org/2000/svg'; XL = 'http://www.w3.org/1999/xlink'
ET.register_namespace('', SVGNS); ET.register_namespace('xlink', XL)
_docs = {}


def doc(t):
    if t not in _docs: _docs[t] = pymupdf.open(os.path.join(HERE, '..', 'sources', PDF[t] + '.pdf'))
    return _docs[t]


def key(box): return '|'.join(str(v) for v in box)


def redraw_name(t, page, xref): return f'{t}_p{page}_x{xref}.svg'


# ---------- geometry helpers for pruning ----------
def mat(s):
    """SVG transform attribute -> 3x3 matrix (matrix() and translate() are all mupdf writes)"""
    M = np.eye(3)
    for fn, args in re.findall(r'(\w+)\(([^)]*)\)', s or ''):
        a = [float(v) for v in re.split(r'[ ,]+', args.strip()) if v]
        if fn == 'matrix': m = np.array([[a[0], a[2], a[4]], [a[1], a[3], a[5]], [0, 0, 1]])
        elif fn == 'translate': m = np.array([[1, 0, a[0]], [0, 1, a[1] if len(a) > 1 else 0], [0, 0, 1]])
        elif fn == 'scale': m = np.array([[a[0], 0, 0], [0, a[1] if len(a) > 1 else a[0], 0], [0, 0, 1]])
        else: raise ValueError('transform ' + fn)
        M = M @ m
    return M


def path_bbox(d):
    """bbox of a path's coordinates, tracking the current point so H/V and relative commands are handled"""
    toks = re.findall(r'[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?', d)
    xs, ys = [], []; x = y = 0; cmd = None; i = 0; nums = []
    def flush(c, n):
        nonlocal x, y
        rel = c.islower(); C = c.upper()
        if C in 'ML' or C == 'T':
            for k in range(0, len(n) - 1, 2):
                x, y = (x + n[k], y + n[k + 1]) if rel else (n[k], n[k + 1]); xs.append(x); ys.append(y)
        elif C == 'H':
            for v in n: x = x + v if rel else v; xs.append(x); ys.append(y)
        elif C == 'V':
            for v in n: y = y + v if rel else v; xs.append(x); ys.append(y)
        elif C in 'CSQ':
            step = {'C': 6, 'S': 4, 'Q': 4}[C]
            for k in range(0, len(n) - step + 1, step):
                pts = n[k:k + step]
                for j in range(0, step, 2):
                    px, py = (x + pts[j], y + pts[j + 1]) if rel else (pts[j], pts[j + 1]); xs.append(px); ys.append(py)
                x, y = xs[-1], ys[-1]
        elif C == 'A':
            for k in range(0, len(n) - 6, 7):
                x, y = (x + n[k + 5], y + n[k + 6]) if rel else (n[k + 5], n[k + 6]); xs.append(x); ys.append(y)
    for tk in toks:
        if tk.isalpha():
            if cmd: flush(cmd, nums)
            cmd = tk; nums = []
        else: nums.append(float(tk))
    if cmd: flush(cmd, nums)
    if not xs: return None
    return min(xs), min(ys), max(xs), max(ys)


def tbox(M, b):
    pts = np.array([[b[0], b[1], 1], [b[2], b[1], 1], [b[0], b[3], 1], [b[2], b[3], 1]]).T
    q = M @ pts
    return q[0].min(), q[1].min(), q[0].max(), q[1].max()


def meets(b, W, H, m=1.5): return b[2] >= -m and b[0] <= W + m and b[3] >= -m and b[1] <= H + m


def prune(svg):
    """drop everything drawn wholly outside the viewBox, unused defs, and long decimals"""
    root = ET.fromstring(svg)
    W, H = float(root.get('width')), float(root.get('height'))
    defs = {e.get('id'): e for e in root.iter() if e.get('id')}
    parent = {c: p for p in root.iter() for c in p}
    def ctm(e):
        chain = []
        while e is not None: chain.append(e); e = parent.get(e)
        M = np.eye(3)
        for el in reversed(chain): M = M @ mat(el.get('transform'))
        return M
    def clip_box(e):
        """intersection of the clip rectangles applying to e (each clip path's bbox in root space)"""
        b = None; cur = e
        while cur is not None:
            c = cur.get('clip-path')
            if c:
                cp = defs.get(re.search(r'#([^)]+)', c).group(1))
                M0 = ctm(parent[cur]) if parent.get(cur) is not None else np.eye(3)
                M0 = M0 @ mat(cur.get('transform'))
                for ch in cp:
                    pb = path_bbox(ch.get('d', '')) if ch.tag.endswith('path') else None
                    if pb:
                        r = tbox(M0 @ mat(ch.get('transform')), pb)
                        b = r if b is None else (max(b[0], r[0]), max(b[1], r[1]), min(b[2], r[2]), min(b[3], r[3]))
            cur = parent.get(cur)
        return b
    drop = []
    defs_el = [e for e in root if e.tag.endswith('defs')]
    body = [e for e in root.iter() if not any(e is d or _inside(e, d, parent) for d in defs_el) and e is not root]
    for e in body:
        tag = e.tag.split('}')[1]
        if tag not in ('path', 'use', 'image', 'g'): continue
        cb = clip_box(e)
        if cb is not None and (cb[2] < cb[0] or cb[3] < cb[1] or not meets(cb, W, H)): drop.append(e); continue
        if tag == 'path':
            pb = path_bbox(e.get('d', ''))
            sw = float(e.get('stroke-width', 0) or 0) if e.get('stroke') not in (None, 'none') else 0
            if pb:
                b = tbox(ctm(e), (pb[0] - sw, pb[1] - sw, pb[2] + sw, pb[3] + sw))
                if not meets(b, W, H): drop.append(e)
        elif tag == 'use':
            b = tbox(ctm(e), (-0.3, -1.2, 1.3, 1.2))  # a glyph in font units: 1 em either side of its origin
            if not meets(b, W, H, 3): drop.append(e)
        elif tag == 'image':
            b = tbox(ctm(e), (0, 0, float(e.get('width')), float(e.get('height'))))
            if not meets(b, W, H, 0): drop.append(e)
    dropped = set(map(id, drop))
    for e in drop:
        p = parent.get(e)
        if p is not None and e in list(p) and not any(id(a) in dropped for a in _ancestors(e, parent)): p.remove(e)
    # empty groups, then defs nobody references
    changed = True
    while changed:
        changed = False
        for p in list(root.iter()):
            for c in list(p):
                if c.tag.endswith('}g') and len(c) == 0: p.remove(c); changed = True
    txt = ET.tostring(root, encoding='unicode')
    used = set(re.findall(r'#([\w.-]+)', txt.replace('xlink:href', 'href')))
    for d in defs_el:
        for c in list(d):
            if c.get('id') and c.get('id') not in used: d.remove(c)
    for d in list(root):
        if d.tag.endswith('defs'):
            # references made only from defs that were just removed
            pass
    txt = ET.tostring(root, encoding='unicode')
    txt = re.sub(r'(\d+\.\d{3})\d+', r'\1', txt)            # 3 decimals is far below a device pixel
    txt = re.sub(r'\s+inkscape:\w+="[^"]*"', '', txt)
    txt = txt.replace(' xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"', '')
    txt = re.sub(r'>\s+<', '><', txt)
    return txt


def _ancestors(e, parent):
    out = []; p = parent.get(e)
    while p is not None: out.append(p); p = parent.get(p)
    return out


def _inside(e, anc, parent):
    p = parent.get(e)
    while p is not None:
        if p is anc: return True
        p = parent.get(p)
    return False


# ---------- cutting ----------
def region(box, redraws=None):
    """SVG of one region of a PDF page; returns (svg, [embedded images still raster])"""
    t, p, x0, y0, x1, y1 = box
    d = pymupdf.open(); d.insert_pdf(doc(t), from_page=p - 1, to_page=p - 1); pg = d[0]
    R = pymupdf.Rect(x0, y0, x1, y1); P = pg.rect
    infos = doc(t)[p - 1].get_image_info(xrefs=True)  # xrefs of the original file
    for r in [pymupdf.Rect(P.x0, P.y0, P.x1, y0), pymupdf.Rect(P.x0, y1, P.x1, P.y1), pymupdf.Rect(P.x0, y0, x0, y1), pymupdf.Rect(x1, y0, P.x1, y1)]:
        if not r.is_empty: pg.add_redact_annot(r, fill=False)
    pg.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_REMOVE_IF_COVERED, text=pymupdf.PDF_REDACT_TEXT_NONE)  # letters outside are pruned below (a line's box reaches past its letters)
    pg.set_cropbox(R)
    svg = pg.get_svg_image(text_as_path=True)
    inside = [i for i in infos if pymupdf.Rect(i['bbox']).intersects(R)]
    svg = prune(svg)
    left = []
    for i in inside:
        bb = pymupdf.Rect(i['bbox']); big = bb.width > 80 and bb.height > 60
        name = redraw_name(t, p, i['xref'])
        if big and redraws is not None and name in redraws:
            svg = swap_image(svg, bb, R, redraws[name])
        elif big: left.append(name)
    return svg, left


def swap_image(svg, bb, R, rsvg):
    """replace the embedded photo occupying bb with its vector redraw"""
    root = ET.fromstring(svg)
    parent = {c: p for p in root.iter() for c in p}
    W, H = float(root.get('width')), float(root.get('height'))
    best = None
    for e in root.iter():
        if not e.tag.endswith('}image'): continue
        M = np.eye(3); chain = []; cur = e
        while cur is not None: chain.append(cur); cur = parent.get(cur)
        for el in reversed(chain): M = M @ mat(el.get('transform'))
        b = tbox(M, (0, 0, float(e.get('width')), float(e.get('height'))))
        want = (bb.x0 - R.x0, bb.y0 - R.y0, bb.x1 - R.x0, bb.y1 - R.y0)
        err = max(abs(b[k] - want[k]) for k in range(4))
        if best is None or err < best[0]: best = (err, e, b)
    if best is None or best[0] > 1.0: raise RuntimeError(f'photo not found for redraw ({best and best[0]})')
    _, e, b = best
    r = ET.fromstring(rsvg)
    vw, vh = r.get('viewBox').split()[2:]
    nested = ET.Element(f'{{{SVGNS}}}svg', {'x': f'{b[0]:.3f}', 'y': f'{b[1]:.3f}', 'width': f'{b[2] - b[0]:.3f}', 'height': f'{b[3] - b[1]:.3f}',
                                            'viewBox': r.get('viewBox'), 'preserveAspectRatio': 'none'})
    for c in list(r): nested.append(c)
    # the photo may sit inside masks/groups: put the redraw at the top level, drop the photo
    root.append(nested)
    parent[e].remove(e)
    txt = ET.tostring(root, encoding='unicode')
    return re.sub(r'>\s+<', '><', txt)


def photo(t, xref):
    """an embedded photo at its full resolution, flattened onto white"""
    d = doc(t); info = d.extract_image(xref)
    im = Image.open(io.BytesIO(info['image'])).convert('RGB')
    if info.get('smask'):
        m = Image.open(io.BytesIO(d.extract_image(info['smask'])['image'])).convert('L').resize(im.size)
        bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=m); im = bg
    return im


def raster(svg, scale):
    import cairosvg
    png = cairosvg.svg2png(bytestring=svg.encode(), scale=scale, background_color='white')
    return Image.open(io.BytesIO(png)).convert('L')


def page_crop(box, size):
    t, p, x0, y0, x1, y1 = box
    im = Image.open(os.path.join(HERE, 'eta', t, f'h-{p:02d}.png')).convert('L')
    S = 2.0
    c = im.crop((int(round(x0 * S)), int(round(y0 * S)), int(round(x0 * S)) + size[0], int(round(y0 * S)) + size[1]))
    return c


def check(svg, box, size):
    """compare a vector cut-out (rendered at 144 dpi) with the page render it replaces.
    Returns the number of ink pixels present in one and missing (within 2 px) from the other."""
    from scipy import ndimage
    a = np.asarray(page_crop(box, size), float)
    b = np.asarray(raster(svg, 2.0).resize(size), float)
    if a.shape != b.shape: return 10 ** 6, None
    da, db = a < 110, b < 110
    near = lambda m: ndimage.binary_dilation(m, iterations=2)
    miss = da & ~near(db); extra = db & ~near(da)
    return int(max(miss.sum(), extra.sum())), (miss, extra)


if __name__ == '__main__':
    crops = json.load(open(os.path.join(HERE, 'eta', 'crops.json')))
    rd_dir = os.path.join(HERE, 'redraw')
    redraws = {f: open(os.path.join(rd_dir, f)).read() for f in os.listdir(rd_dir)} if os.path.isdir(rd_dir) else {}
    out, report, raster_left, swapped = {}, [], set(), []
    only = sys.argv[1:]
    for t, items in crops.items():
        for it in items:
            if only and f'{t}{it["q"]}' not in only and t not in only: continue
            pics = [p['img'] for p in (it.get('stemp') or []) if 'img' in p] + [c for c in (it.get('choices') or []) if c]
            if it.get('stem') and not it.get('stemp'): pics.append(it['stem'])
            for e in pics:
                k = key(e[3])
                if k in out or min(e[1], e[2]) < 6: continue  # hairline rules stay as they are
                base, left = region(e[3])
                # the photo version must match the page render; redraws have their own check (redraw.py)
                worst, _ = check(base, e[3], (e[1], e[2]))
                svg, left2 = region(e[3], redraws) if redraws else (base, left)
                raster_left.update(left2)
                if svg is not base and left2 != left:  # a graph photo was swapped for its redraw: check that too
                    w2, _ = check(svg, e[3], (e[1], e[2]))
                    swapped.append((w2, t, it['q'], k))
                out[k] = svg; report.append((worst, t, it['q'], k, len(svg)))
    json.dump(out, open(os.path.join(HERE, 'eta', 'vec.json'), 'w'), separators=(',', ':'))
    bad = [r for r in report if r[0] > 3]
    print(len(out), 'pictures,', sum(len(v) for v in out.values()) // 1024, 'KB; mismatches:', bad[:20])
    print('photos still raster:', len(raster_left), '; pictures with redrawn graphs:', len(swapped),
          'worst ink differences vs the page:', sorted(swapped, reverse=True)[:12])
    json.dump(sorted(raster_left), open(os.path.join(HERE, 'eta', 'raster_left.json'), 'w'), indent=0)


# ---------- packing for the app ----------
def shrink_png(b64):
    """re-encode an embedded photo: flat grey levels for black-and-white formula pictures, a small palette for colour"""
    import base64
    im = Image.open(io.BytesIO(base64.b64decode(re.sub(r'\s', '', b64))))
    mode = im.mode
    if mode in ('L', 'LA', 'P') or mode == 'RGB' and _greyish(im):
        q = im.convert('L').point(lambda v: int(round(v / 17)) * 17)   # 16 grey levels
    else:
        q = im.convert('RGB').quantize(32, method=Image.MEDIANCUT, dither=Image.NONE)
    out = io.BytesIO(); q.save(out, 'PNG', optimize=True)
    return base64.b64encode(out.getvalue()).decode()


def _greyish(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    return ((a.max(2) - a.min(2)) > 24).mean() < 0.002


def short_num(m):
    """Coordinates keep 2 decimals; small scale factors (glyph sizes) keep 3 significant digits."""
    v = float(m.group(0))
    if abs(v) >= 1: return f'{v:.2f}'
    if v == 0: return '0'
    return f'{v:.{max(2, 2 - math.floor(math.log10(abs(v))))}f}'


def pack(svgs):
    """{key: svg} -> ({key: [inner markup, width pt, height pt]}, {glyph id: path d}).
    Letter outlines are shared by all pictures (one hidden <defs> on the page); other ids get a per-picture prefix."""
    glyph_ids, glyphs, out = {}, {}, {}
    for n, (k, svg) in enumerate(sorted(svgs.items())):
        root = ET.fromstring(svg)
        W, H = root.get('width'), root.get('height')
        local = {}
        for e in list(root.iter()):
            i = e.get('id')
            if not i: continue
            if i.startswith('font_') and e.tag.endswith('}path'):
                d = e.get('d')
                if d not in glyph_ids: glyph_ids[d] = f'gg{len(glyph_ids):x}'; glyphs[glyph_ids[d]] = d
                local[i] = glyph_ids[d]
            else: local[i] = f'v{n:x}{i.replace("_", "")}'
        txt = ET.tostring(root, encoding='unicode')
        txt = re.sub(r'<path id="font_[^"]*" d="[^"]*"\s*/>', '', txt)
        txt = re.sub(r'(xlink:href|href)="#([^"]+)"', lambda m: f'href="#{local.get(m.group(2), m.group(2))}"', txt)
        txt = re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{local.get(m.group(1), m.group(1))})', txt)
        txt = re.sub(r' id="([^"]+)"', lambda m: f' id="{local.get(m.group(1), m.group(1))}"', txt)
        txt = re.sub(r'(href="data:image/png;base64,)([^"]+)"', lambda m: m.group(1) + shrink_png(m.group(2)) + '"', txt)
        txt = re.sub(r'<defs>\s*</defs>|<defs\s*/>', '', txt)
        txt = re.sub(r'(?<![A-Za-z0-9+/=])-?\d*\.\d{3,}', short_num, txt)   # 0.01 pt is far below a screen pixel
        inner = re.sub(r'^<svg[^>]*>|</svg>$', '', txt.strip())
        inner = inner.replace(' xmlns:xlink="http://www.w3.org/1999/xlink"', '')
        inner = re.sub(r' data-text="[^"]*"', '', inner).replace(' />', '/>')   # the picture's aria-label names it
        if "'" not in inner: inner = inner.replace('"', "'")                     # no escaping inside nb7.js strings
        out[k] = [inner, float(W), float(H)]
    return out, glyphs
