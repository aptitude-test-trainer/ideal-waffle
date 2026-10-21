import os
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844})
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+os.path.join(os.path.dirname(os.path.abspath(__file__)),'local134-mech-set.html'))
        r=await pg.evaluate("""async()=>{const G=window.GEN;const seen=new Map();
          for(let s=0;s<15;s++){const t=G.buildTest('s'+s,{fold:24,mech:45});for(const i of [...t.sgfold,...t.sgmech])seen.set(i.type+(i.params.sg!=null?i.params.sg:i.stem+i.svg.length),i);}
          const out=[];for(const it of seen.values()){if(!G.ANIM.can(it))continue;const d=document.createElement('div');document.body.appendChild(d);
            try{const c=G.ANIM.mount(d,it,true);await new Promise(r=>setTimeout(r,30));out.push([it.type,!!d.querySelector('svg')]);}catch(e){out.push([it.type,'ERR '+e.message]);}d.remove();}
          return out;}""")
        print(len(r),[x for x in r if x[1] is not True][:10]);print('errors',errs[:5])
        await b.close()
asyncio.run(main())
