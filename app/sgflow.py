import os
import asyncio,sys
from playwright.async_api import async_playwright
SEC=sys.argv[1] if len(sys.argv)>1 else 'fold'; W=int(sys.argv[2]) if len(sys.argv)>2 else 390; DARK=len(sys.argv)>3
os.makedirs('shots',exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch();pg=await b.new_page(viewport={'width':W,'height':844},device_scale_factor=1.5,color_scheme='dark' if DARK else 'light')
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+os.path.join(os.path.dirname(os.path.abspath(__file__)),'local134-mech-set.html'))
        for s in ['#pm-prac','#src-sg','#sec-'+SEC]: await pg.click(s,force=True)
        await pg.click('#start');await pg.wait_for_timeout(400)
        n_anim=0;n=0
        for i in range(8):
            # pick a wrong choice
            ok=await pg.evaluate("""()=>{const bs=[...document.querySelectorAll('.choice,[data-c]')];return bs.length}""")
            await pg.keyboard.press('e' if SEC=='fold' else 'd'); await pg.keyboard.press('a'); await pg.wait_for_timeout(1500)
            has=await pg.evaluate("!!document.querySelector('#pfb svg.anim, #pfb .anim, #pfb [data-anim]')")
            await pg.screenshot(path=f'shots/{SEC}{i}.png',full_page=True)
            sw=await pg.evaluate("document.documentElement.scrollWidth")
            print(i,'anim',has,'scrollW',sw)
            await pg.keyboard.press('n'); await pg.wait_for_timeout(200)
        print('errors',errs)
        await b.close()
asyncio.run(main())
