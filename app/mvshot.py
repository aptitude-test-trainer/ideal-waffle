# usage: python3 mvshot.py <dir> <type> [diff] [seed]  -> writes <dir>/shot_<type>.png (frames at t=0,2,4,6,9s + final caption)
import asyncio,sys
from playwright.async_api import async_playwright
d,typ=sys.argv[1],sys.argv[2];diff=int(sys.argv[3]) if len(sys.argv)>3 else 2;seed=int(sys.argv[4]) if len(sys.argv)>4 else 7
async def m():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':440,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(f'file://{d}/local134-mech-set.html');await pg.wait_for_timeout(300)
    ok=await pg.evaluate("""([t,df,sd])=>{const it=GEN.GENS[t](sd,df);document.body.innerHTML='<div id=x style="width:420px;padding:10px"></div>';const r=GEN.ANIM.mount(document.getElementById('x'),it,false);window.__it=it;return [r,it.stem,it.choices.map(c=>c.t),it.correct];}""",[typ,diff,seed])
    print(ok)
    if not ok[0]: print('NOT ANIMATABLE');await b.close();return
    shots=[]
    for k,t in enumerate([0,2,4,6,9,11]):
        await pg.evaluate(f"(()=>{{const r=document.querySelector('.anim-rng');r.value={t};r.dispatchEvent(new Event('input'))}})()")
        await pg.wait_for_timeout(40);f=f'{d}/_mv_{k}.png';await pg.screenshot(path=f,full_page=True);shots.append(f)
    from PIL import Image
    ims=[Image.open(f) for f in shots];h=max(i.size[1] for i in ims);m=Image.new('RGB',(440*3,h*2),'white')
    for i,im in enumerate(ims): m.paste(im,((i%3)*440,(i//3)*h))
    out=f'{d}/shot_{typ}.png';m.save(out);print(out,errs)
    await b.close()
asyncio.run(m())
