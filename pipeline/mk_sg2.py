import os
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', 'app')
import json, re, io, base64, os
from PIL import Image
FM = os.path.join(APP, 'nb4.js')
s = open(HERE + '/nb4.orig.js').read()
m = re.search(r'const SG_DATA=(\{.*?\});\n', s, re.S)
old = json.loads(m.group(1))

def enc(im, colors=16):
    q = im.convert('RGB').quantize(colors, method=Image.MEDIANCUT, dither=Image.NONE)
    b = io.BytesIO(); q.save(b, 'PNG', optimize=True)
    return ['data:image/png;base64,' + base64.b64encode(b.getvalue()).decode(), im.size[0], im.size[1]]

def gray(im, maxw):
    if im.size[0] > maxw: im = im.resize((maxw, int(im.size[1] * maxw / im.size[0])), Image.LANCZOS)
    g = im.convert('L').point(lambda v: 255 if v > 215 else (0 if v < 90 else 128))
    return enc(g.convert('RGB'), 3)

import numpy as np
def clean(im):
    from scipy import ndimage
    g = np.array(im.convert('RGB')); a0 = g.min(2) < 200
    lab, n = ndimage.label(a0)
    runs = [y for y in range(a0.shape[0]) if np.convolve(a0[y, :int(a0.shape[1] * 0.4)].astype(int), np.ones(80), 'valid').max() >= 45]
    ybox = runs[0] if runs else 0
    for k, sl in enumerate(ndimage.find_objects(lab)):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if (lab[sl] == k + 1).sum() < 14: g[lab == k + 1] = 255; continue
        if sl[0].stop <= ybox + 2 and h < 26 and w < 40 and sl[1].start < 200: g[ndimage.binary_dilation(lab == k + 1, iterations=3)] = 255
    im = Image.fromarray(g)
    a = np.array(im.convert('L')) < 160
    rows = a.sum(1) > 0; H = len(rows)
    i = 0
    while i < H and not rows[i]: i += 1
    j = i
    while j < H and rows[j]: j += 1
    k = j
    while k < H and not rows[k]: k += 1
    if i < H and j - i < 0.12 * H and k - j >= 3: im = im.crop((0, k, im.size[0], im.size[1])); a = a[k:]
    # drop isolated specks: keep columns/rows with real ink
    cols = np.where(a.sum(0) > 2)[0]; rws = np.where(a.sum(1) > 2)[0]
    if len(cols) and len(rws): im = im.crop((max(0, cols[0] - 6), max(0, rws[0] - 6), min(im.size[0], cols[-1] + 7), min(im.size[1], rws[-1] + 7)))
    return im
# ---------------- paper folding ----------------
msg = {e['id']: e for e in json.load(open(HERE + '/pfq/models_sg.json'))}
mpp = {e['id']: e for e in json.load(open(HERE + '/pfq/models_pp.json'))}
TURNED = {'ex2', 'sg10', 'sg20'}; NOANIM = {'sg22', 'sg06', 'pp06', 'pp10', 'pp11', 'pp16', 'pp19', 'pp20', 'pp21', 'pp23', 'pp03', 'pp07'}
def model(e, idd):
    if not e or idd in NOANIM: return None
    if not e.get('matches_key') and idd not in TURNED: return None
    mm = e['model']; return {'folds': mm['folds'], 'punches': mm['punches'], 'turned': idd in TURNED}
fold = []
gan = [f for f in old['fold'] if f[5] == 'GAN study guide practice test']
assert len(gan) == 24
for i, f in enumerate(gan): fold.append(f[:6] + [model(msg.get(f'sg{i+1:02d}'), f'sg{i+1:02d}')])
exs = [f for f in old['fold'] if f[5] == 'GAN study guide examples']
for i, f in enumerate(exs): fold.append(f[:6] + [model(msg.get(f'ex{i+1}'), f'ex{i+1}')])
KEYPP = 'BAAAECBAEBBDCDAABAACBCAD'
boxes = json.load(open(HERE + '/gp/boxes.json'))
for i, o in enumerate(boxes):
    im = Image.open(HERE + f'/gp/p-{o["page"]:02d}.png').convert('RGB')
    fig = gray(clean(im.crop(o['fig'])), 420)
    ch = [gray(im.crop(b), 170) for b in o['ch']]
    fold.append([fig[0], fig[1], fig[2], ch, 'ABCDE'.index(KEYPP[i]), 'GAN practice problems', model(mpp.get(f'pp{i+1:02d}'), f'pp{i+1:02d}')])

# ---------------- mechanical ----------------
mech = []
ganm = [x for x in old['mech'] if x[6] in ('GAN study guide practice test', 'GAN study guide examples')]
gq = json.load(open(HERE + '/gm/qs.json')); ga = {e['id']: e for e in json.load(open(HERE + '/gm/anim/anim.json'))}
for i, x in enumerate(ganm):
    idd = f'm{i+1:02d}'; svgf = HERE + f'/gm/anim/{idd}.svg'
    an = open(svgf).read() if os.path.exists(svgf) and idd in ga else None
    row = x[:7] + [an, ga[idd]['explain'] if an else None]
    if idd == 'm18':
        row[5] = 0; row[7] = None; row[8] = 'The answer is A. This answer comes straight from the GAN study guide practice test answer key (question 18).'
    mech.append(row)
bq = json.load(open(HERE + '/bt/qs.json')); ba = {}
for k in range(3):
    p = HERE + f'/bt/anim/anim{k}.json'
    if os.path.exists(p): ba.update({e['id']: e for e in json.load(open(p))})
for e in bq:
    im = Image.open(HERE + '/bt/q/' + os.path.basename(e['file'])).convert('RGB')
    if im.size[0] > 640: im = im.resize((640, int(im.size[1] * 640 / im.size[0])), Image.LANCZOS)
    img = enc(im.convert('L').convert('RGB'), 8)
    svgf = HERE + f'/bt/anim/{e["id"]}.svg'
    an = open(svgf).read() if os.path.exists(svgf) and e['id'] in ba and e['id'] not in ('b58', 'b66') else None
    mech.append([img[0], img[1], img[2], e['stem'], e['choices'], 'ABCD'.index(e['answer']), 'Bennett mechanical test', an, ba[e['id']]['explain'] if an else 'The answer is ' + e['answer'] + '. This answer comes straight from the Right answer line on the Bennett test screenshot.'])

data = {'fold': fold, 'mech': mech, 'net': []}
s = s[:m.start(1)] + json.dumps(data, separators=(',', ':')) + s[m.end(1):]
open(FM, 'w').write(s)
print('fold', len(fold), 'with model', sum(1 for f in fold if f[6]), '| mech', len(mech), 'with anim', sum(1 for x in mech if x[7]))
