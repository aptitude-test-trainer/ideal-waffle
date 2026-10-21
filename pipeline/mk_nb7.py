import os
HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, '..', 'app')
import json, re, io, base64, html
from PIL import Image
crops = json.load(open(HERE + '/eta/crops.json'))
NAMES = {'ts1': 'Timed Simulation 1', 'ts2': 'Timed Simulation 2', 'ts3': 'Timed Simulation 3', 'ts4': 'Timed Simulation 4', 'diag': 'Math Diagnostic', 'i33': 'IBEW 33-question test', 'i34': 'IBEW 34-question test', 'i34b': 'IBEW 34-question test (2)'}
L = 'ABCD'

# vector versions of the pictures (vec.py): sharp at any size. Letter outlines are shared by all pictures.
import sys
sys.path.insert(0, HERE)
import vec as _vec
_vf = os.path.join(HERE, 'eta', 'vec.json')
VEC, GLYPHS = _vec.pack(json.load(open(_vf))) if os.path.exists(_vf) else ({}, {})
USED_GLYPHS = set()


def pic(e):
    """one picture: [inner svg, width px, height px] when a vector version exists, else a PNG data URL"""
    k = _vec.key(e[3]) if len(e) > 3 else None
    if k in VEC:
        inner = VEC[k][0]
        USED_GLYPHS.update(re.findall(r'href=[\'"]#(gg[0-9a-f]+)', inner))
        return [inner, e[1], e[2]]
    return reenc(e)


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
        ch = [pic(c) if c else None for c in it['choices']] if it.get('choices') else None
        if ch and any(c is None for c in ch): skipped.append((t, it['q'], 'missing choice crop')); continue
        ex = a.get('explain') or ''
        sp = []
        for p in (it.get('stemp') or ([{'img': it['stem']}] if it['stem'] else [])):
            sp.append(['t', math_text(p['t'])] if 't' in p else ['i', pic(p['img'])])
        cht = it.get('choicesT') or [None] * 4
        chs = [(['t', math_text(cht[k])] if cht[k] else (['i', ch[k]] if ch else None)) for k in range(4)] if (ch or any(cht)) else None
        bank.append({'s': NAMES[t] + ' · Q' + str(it['q']), 'sp': sp, 'ch': chs, 'g': bool(it.get('grid')), 'a': L.index(a['answer']), 'ex': ex, 'exh': math_text(ex)})
glyph_defs = ''.join(f'<path id="{g}" d="{GLYPHS[g]}"/>' for g in sorted(USED_GLYPHS))
js = ('/* ---- ETA study guide: exact questions from the practice PDFs (Timed Simulations 1-4, Math Diagnostic, IBEW 33/34 tests) ---- */\nconst SGETA=' + json.dumps(bank, separators=(',', ':'))
      + ';\n/* letter outlines shared by the vector pictures (one hidden copy on the page) */\nconst SGETA_GLYPHS=' + json.dumps(glyph_defs)) + r''';
function sgEtaGlyphs(){if(typeof document==='undefined'||document.getElementById('sgeta-glyphs'))return;
  const put=()=>{if(document.getElementById('sgeta-glyphs'))return;const d=document.createElement('div');d.innerHTML=`<svg id="sgeta-glyphs" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden" xmlns="http://www.w3.org/2000/svg"><defs>${SGETA_GLYPHS}</defs></svg>`;document.body.appendChild(d.firstChild);};
  if(document.body)put();else document.addEventListener('DOMContentLoaded',put);}
function sgEtaItems(code,n){const R=RNG(hashSeed('sgeta',code||'x'));const L='ABCD';
  /* vector pictures: [inner svg in PDF points, width px, height px]; older PNG pictures: [data url, width px, height px] */
  const im=(c,lab)=>c[0][0]==='<'?`<svg class="fig" viewBox="0 0 ${c[1]} ${c[2]}" style="max-width:${Math.round(c[1]*0.72)}px" role="img" aria-label="${esc(lab)}" xmlns="http://www.w3.org/2000/svg"><g class="pf-img" transform="scale(2)">${c[0]}</g></svg>`:sgSvg(c[0],c[1],c[2],Math.round(c[1]*0.72),lab);
  sgEtaGlyphs();
  const all=SGETA.map((q,i)=>{const fig=`<div class="sgstem">${q.sp.map(p=>p[0]==='t'?`<p>${p[1]}</p>`:`<div class="sgimg">${im(p[1],'question')}</div>`).join('')}</div>`;
    const choices=q.ch?q.ch.map((c,j)=>c[0]==='t'?{h:`<span class="mtx">${c[1]}</span>`,t:'Choice '+L[j],key:j,note:null}:(q.g?{svg:im(c[1],'choice '+L[j]),t:'Choice '+L[j],key:j,note:null}:{h:im(c[1],'choice '+L[j]),t:'Choice '+L[j],key:j,note:null}))
      :[0,1,2,3].map(j=>({t:L[j],key:j,note:null}));
    return{type:'sgeta',skill:'Math',sub:'Study guide math',diff:0,stem:q.s,stemH:`<span class="muted" style="font-size:14px">${esc(q.s)}</span>`,svg:fig,grid:q.g,choices,correct:q.a,explain:q.ex,explainH:q.exh,params:{sg:i},id:'SE'+(i+1)};});
  return R.shuffle(all).slice(0,Math.max(1,Math.min(all.length,n||33)));}
'''
open(os.path.join(APP, 'nb7.js'), 'w').write(js)
print(len(bank), 'questions;', len(js) // 1024, 'KB; skipped', skipped)
