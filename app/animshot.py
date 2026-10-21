import os
# usage: python3 animshot.py <anim.svg> "<explanation text>" <out.png>
# Mounts your SVG in the app's animator (it animates every <g class="mv" data-a="..."> group) and saves frames at t=0,2,4,6,9 s.
import asyncio,sys,json
from playwright.async_api import async_playwright
svgf,expl,outp=sys.argv[1],sys.argv[2],sys.argv[3]
svg=open(svgf).read()
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':440,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file://'+os.path.join(os.path.dirname(os.path.abspath(__file__)),'local134-mech-set.html'));await pg.wait_for_timeout(300)
    ok=await pg.evaluate("""([svg,ex])=>{document.body.innerHTML='<div id=x style="width:420px;padding:10px"></div>';return GEN.ANIM.mount(document.getElementById('x'),{type:'preview',svg:'',anim:svg,explain:ex,choices:[{t:'x'}],correct:0},false);}""",[svg,expl])
    if not ok: print('NOT ANIMATABLE (no class="mv" groups?)');return
    from PIL import Image
    shots=[]
    for k,t in enumerate([0,2,4,6,9]):
        await pg.evaluate(f"(()=>{{const r=document.querySelector('.anim-rng');r.value={t};r.dispatchEvent(new Event('input'))}})()")
        await pg.wait_for_timeout(40);f=f'{outp}.{k}.png';await pg.screenshot(path=f,full_page=True);shots.append(Image.open(f))
    h=max(i.size[1] for i in shots);M=Image.new('RGB',(440*5,h),'white')
    for i,im in enumerate(shots): M.paste(im,(i*440,0))
    M.save(outp);print(outp,errs)
    await b.close()
asyncio.run(m())
