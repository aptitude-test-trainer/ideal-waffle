import os
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', 'app')
import json, re, io, base64, html
from PIL import Image
crops = json.load(open(HERE + '/eta/crops.json'))
NAMES = {'ts1': 'Timed Simulation 1', 'ts2': 'Timed Simulation 2', 'ts3': 'Timed Simulation 3', 'ts4': 'Timed Simulation 4', 'diag': 'Math Diagnostic', 'i33': 'IBEW 33-question test', 'i34': 'IBEW 34-question test', 'i34b': 'IBEW 34-question test (2)'}
L = 'ABCD'

def reenc(e):
    """smaller PNG: gray 8 levels unless the crop has colour"""
    im = Image.open(io.BytesIO(base64.b64decode(e[0].split(',')[1]))).convert('RGB')
    import numpy as np
    a = np.array(im).astype(int); sat = (a.max(2) - a.min(2)) > 40
    if sat.mean() > 0.002: q = im.quantize(16, method=Image.MEDIANCUT, dither=Image.NONE)
    else: q = im.convert('L').point(lambda v: 255 if v > 225 else (0 if v < 70 else int(round(v / 51) * 51))).convert('RGB').quantize(8, method=Image.MEDIANCUT, dither=Image.NONE)
    b = io.BytesIO(); q.save(b, 'PNG', optimize=True)
    return ['data:image/png;base64,' + base64.b64encode(b.getvalue()).decode(), im.size[0], im.size[1]]

def math_text(t):
    s = html.escape(t)
    s = re.sub(r'(?<=\s)-(?=\s)', '−', s); s = re.sub(r'(^|[\s(\[,=])-(?=[\w(\[])', lambda m: m.group(1) + '−', s)
    F = lambda a, b: f'<span class="fr"><span>{a}</span><span>{b}</span></span>'
    for _ in range(3):
        s = re.sub(r'\(([^()\[\]]+)\)/\(([^()\[\]]+)\)', lambda m: F(m.group(1), m.group(2)), s)
        s = re.sub(r'\[([^\[\]]+)\]/\(([^()]+)\)', lambda m: F(m.group(1), m.group(2)), s)
        s = re.sub(r'\(([^()]+)\)/([\w]+)', lambda m: F(m.group(1), m.group(2)), s)
        s = re.sub(r'(?<![\w>])([\w.]+)/\(([^()]+)\)', lambda m: F(m.group(1), m.group(2)), s)
        s = re.sub(r'\((−?\d+)/(\d+)\)', lambda m: F(m.group(1), m.group(2)), s)
        s = re.sub(r'(?<![\w/>])(−?[\w.]+)/([\w.]+)(?![\w/])', lambda m: F(m.group(1), m.group(2)), s)
    return s

def frac_html(s):
    s = html.escape(s)
    return re.sub(r'(?<![\w/])(\(?-?\d+\)?|[A-Za-z])/(\(?\d+\)?|[A-Za-z])(?![\w/])', lambda m: f'<span class="fr"><span>{m.group(1)}</span><span>{m.group(2)}</span></span>', s)

bank = []; skipped = []
for t, items in crops.items():
    try: ans = {a['q']: a for a in json.load(open(HERE + f'/eta/ans_{t}.json'))}
    except FileNotFoundError: skipped.append((t, 'no answers yet')); continue
    for it in items:
        a = ans.get(it['q'])
        if not a or not a.get('answer') or a.get('answer') not in L or a.get('confidence') == 'low' or (a.get('flag') and (t, it['q']) != ('ts4', 18)):
            skipped.append((t, it['q'], (a or {}).get('flag'))); continue
        ch = [reenc(c) if c else None for c in it['choices']] if it.get('choices') else None
        if ch and any(c is None for c in ch): skipped.append((t, it['q'], 'missing choice crop')); continue
        ex = a.get('explain') or ''
        sp = []
        for p in (it.get('stemp') or ([{'img': it['stem']}] if it['stem'] else [])):
            sp.append(['t', math_text(p['t'])] if 't' in p else ['i', reenc(p['img'])])
        cht = it.get('choicesT') or [None] * 4
        chs = [(['t', math_text(cht[k])] if cht[k] else (['i', ch[k]] if ch else None)) for k in range(4)] if (ch or any(cht)) else None
        bank.append({'s': NAMES[t] + ' · Q' + str(it['q']), 'sp': sp, 'ch': chs, 'g': bool(it.get('grid')), 'a': L.index(a['answer']), 'ex': ex, 'exh': math_text(ex)})
js = '/* ---- ETA study guide: exact questions from the practice PDFs (Timed Simulations 1-4, Math Diagnostic, IBEW 33/34 tests) ---- */\nconst SGETA=' + json.dumps(bank, separators=(',', ':')) + r''';
function sgEtaItems(code,n){const R=RNG(hashSeed('sgeta',code||'x'));const L='ABCD';
  const im=(c,lab)=>sgSvg(c[0],c[1],c[2],Math.round(c[1]*0.72),lab);
  const all=SGETA.map((q,i)=>{const fig=`<div class="sgstem">${q.sp.map(p=>p[0]==='t'?`<p>${p[1]}</p>`:`<div class="sgimg">${im(p[1],'question')}</div>`).join('')}</div>`;
    const choices=q.ch?q.ch.map((c,j)=>c[0]==='t'?{h:`<span class="mtx">${c[1]}</span>`,t:'Choice '+L[j],key:j,note:null}:(q.g?{svg:im(c[1],'choice '+L[j]),t:'Choice '+L[j],key:j,note:null}:{h:im(c[1],'choice '+L[j]),t:'Choice '+L[j],key:j,note:null}))
      :[0,1,2,3].map(j=>({t:L[j],key:j,note:null}));
    return{type:'sgeta',skill:'Math',sub:'Study guide math',diff:0,stem:q.s,stemH:`<span class="muted" style="font-size:14px">${esc(q.s)}</span>`,svg:fig,grid:q.g,choices,correct:q.a,explain:q.ex,explainH:q.exh,params:{sg:i},id:'SE'+(i+1)};});
  return R.shuffle(all).slice(0,Math.max(1,Math.min(all.length,n||33)));}
'''
open(os.path.join(APP, 'nb7.js'), 'w').write(js)
print(len(bank), 'questions;', len(js) // 1024, 'KB; skipped', skipped)
