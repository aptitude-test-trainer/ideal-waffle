"""Scratch pad check (python3 scratchflow.py [width] [dark]).

Drives the scratch pad with simulated pen, palm, finger and mouse input:
  shown only on math questions (GAN computation/reasoning, ETA), hidden on mechanical and paper folding;
  pen strokes are kept per question and saved (survive moving between questions and pause/resume);
  holding the pen still for half a second switches to the eraser until it lifts; a quick tap-and-go draws;
  the pen's side button erases; select (loop) + drag moves writing; delete, undo and redo work;
  a palm touching while the pen is down neither draws nor scrolls; after a pen has been used a finger
  scrolls the page instead of drawing; hide/show works; Meltdown math has a pad; the review shows the work;
  no sideways scroll, no JS errors. Screenshot: shots/scratch*.png
"""
import os, sys, json, asyncio
from playwright.async_api import async_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390; DARK = len(sys.argv) > 2
HERE = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(HERE, 'shots'), exist_ok=True)
URL = 'file://' + os.path.join(HERE, 'local134-mech-set.html')
bad = []
def check(ok, what):
    if not ok: bad.append(what)

PTR = """([type,kind,x,y,o])=>{const cv=document.querySelector(o.sel||'#scratch canvas');const r=cv.getBoundingClientRect();
  cv.dispatchEvent(new PointerEvent(type,{pointerId:o.id||7,pointerType:kind,isPrimary:true,pressure:o.p===undefined?(type==='pointerup'?0:.6):o.p,buttons:type==='pointerup'?0:(o.b||1),button:type==='pointerdown'?0:-1,
    clientX:r.left+x,clientY:r.top+y,bubbles:true,cancelable:true}));}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': W, 'height': 900}, device_scale_factor=2, color_scheme='dark' if DARK else 'light', has_touch=True)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        async def ptr(t, kind, x, y, **o): await pg.evaluate(PTR, [t, kind, x, y, o])
        async def stroke(pts, kind='pen', **o):
            await ptr('pointerdown', kind, *pts[0], **o)
            for q in pts[1:]: await ptr('pointermove', kind, *q, **o)
            await ptr('pointerup', kind, *pts[-1], **o)
        async def saved():
            await pg.wait_for_timeout(500)
            return await pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('fm-saves')||'{}');const rid=Object.keys(s)[0];return JSON.parse(localStorage.getItem('fm-scratch-'+rid)||'{}');})()")
        async def count(qid):
            return len((await saved()).get(qid, {}).get('s', []))
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL)
        # mechanical: no pad
        for s in ['#sec-mech', '#src-rand', '#pm-test']: await pg.click(s, force=True)
        await pg.click('#start'); await pg.wait_for_timeout(200)
        check(await pg.evaluate("document.querySelector('#scratch').hidden"), 'pad shown on a mechanical question')
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL)
        for s in ['#sec-fold', '#src-rand', '#pm-test']: await pg.click(s, force=True)
        await pg.click('#start'); await pg.wait_for_timeout(200)
        check(await pg.evaluate("document.querySelector('#scratch').hidden"), 'pad shown on a paper folding question')
        # math
        await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL)
        for s in ['#sec-ncomp', '#src-rand', '#pm-test']: await pg.click(s, force=True)
        await pg.click('#start'); await pg.wait_for_timeout(300)
        check(not await pg.evaluate("document.querySelector('#scratch').hidden"), 'no pad on a math question')
        q1 = 'NC1'
        await stroke([(40, 60), (80, 70), (120, 80), (160, 90)])
        await stroke([(40, 200), (90, 210), (140, 220)])
        check(await count(q1) == 2, f'two pen strokes saved (got {await count(q1)})')
        # quick tap-and-go draws (no erase)
        await ptr('pointerdown', 'pen', 250, 150); await pg.wait_for_timeout(150); await ptr('pointermove', 'pen', 280, 160); await ptr('pointermove', 'pen', 300, 170); await ptr('pointerup', 'pen', 300, 170)
        check(await count(q1) == 3, 'quick stroke should draw')
        # hold still half a second -> eraser until lift; drag across stroke 1
        await ptr('pointerdown', 'pen', 200, 40); await pg.wait_for_timeout(650)
        ring = await pg.evaluate("!document.querySelector('#scratch .sc-ring').hidden && document.querySelector('#scratch [data-t=erase]').getAttribute('aria-pressed')==='true'")
        check(ring, 'hold-to-erase: eraser ring / button not shown')
        for x in range(200, 60, -10): await ptr('pointermove', 'pen', x, 75)
        await ptr('pointerup', 'pen', 60, 75)
        check(await count(q1) == 2, f'hold-to-erase should remove stroke 1 and leave no dot (got {await count(q1)})')
        check(await pg.evaluate("document.querySelector('#scratch .sc-ring').hidden && document.querySelector('#scratch [data-t=pen]').getAttribute('aria-pressed')==='true'"), 'pen should come back after lifting')
        # side button erases
        await stroke([(240, 160), (270, 160), (300, 170), (320, 170)], b=3)
        check(await count(q1) == 1, 'side-button erase failed')
        # palm while the pen is down: nothing drawn, no scroll
        y0 = await pg.evaluate('scrollY')
        await ptr('pointerdown', 'pen', 60, 260)
        await ptr('pointerdown', 'touch', 200, 280, id=9); await ptr('pointermove', 'touch', 200, 200, id=9)
        await ptr('pointermove', 'pen', 120, 270); await ptr('pointerup', 'pen', 120, 270); await ptr('pointerup', 'touch', 200, 200, id=9)
        check(await count(q1) == 2 and await pg.evaluate('scrollY') == y0, 'palm drew or scrolled while the pen was down')
        # finger after a pen has been used: scrolls, does not draw
        await pg.evaluate('window.scrollTo(0,200)'); y1 = await pg.evaluate('scrollY')
        await stroke([(150, 280), (150, 230), (150, 180)], kind='touch', id=11)
        check(await count(q1) == 2, 'finger drew after a pen was used')
        check(await pg.evaluate('scrollY') != y1, 'finger did not scroll')
        # select: loop around stroke 2, drag it
        await pg.click('#scratch [data-t=select]')
        before = (await saved())[q1]['s'][0]['p'][0]
        await stroke([(20, 180), (180, 180), (180, 250), (20, 250), (20, 180)], kind='mouse')
        check(not await pg.evaluate("document.querySelector('#scratch [data-a=del]').hidden"), 'nothing selected by the loop')
        await stroke([(90, 212), (140, 240), (190, 262)], kind='mouse')
        after = (await saved())[q1]['s'][0]['p'][0]
        check(abs(after[0] - before[0] - 100) < 1 and abs(after[1] - before[1] - 50) < 1, f'move: {before} -> {after}')
        await pg.click('#scratch [data-a=undo]'); back = (await saved())[q1]['s'][0]['p'][0]
        check(abs(back[0] - before[0]) < 1, 'undo did not undo the move')
        await pg.click('#scratch [data-a=redo]'); again = (await saved())[q1]['s'][0]['p'][0]
        check(abs(again[0] - after[0]) < 1, 'redo did not redo the move')
        await pg.screenshot(path=os.path.join(HERE, 'shots', f'scratch{"_dark" if DARK else ""}.png'), full_page=False)
        await pg.click('#scratch [data-t=pen]')
        # another question: empty pad; back: work still there
        await pg.click('#next'); await pg.wait_for_timeout(150)
        await stroke([(30, 30), (60, 60)])
        await pg.click('#prev'); await pg.wait_for_timeout(150)
        sv = await saved(); check(len(sv.get(q1, {}).get('s', [])) == 2 and len(sv.get('NC2', {}).get('s', [])) == 1, f'per-question work lost: {list(sv)}')
        # hide / show
        await pg.click('#scratch [data-a=toggle]')
        check(await pg.evaluate("document.querySelector('#scratch .sc-body').hidden"), 'hide failed')
        await pg.click('#scratch [data-a=toggle]')
        check(not await pg.evaluate("document.querySelector('#scratch .sc-body').hidden"), 'show failed')
        # pause and resume keeps the work
        await pg.click('#pausebtn'); await pg.wait_for_timeout(200); await pg.click('#p-resume'); await pg.wait_for_timeout(300)
        await pg.click('#scratch [data-a=clear]')
        check(await count(q1) == 0, 'clear failed'); await pg.click('#scratch [data-a=undo]'); check(await count(q1) == 2, 'undo after clear failed')
        sw = await pg.evaluate('document.documentElement.scrollWidth'); check(sw <= W, f'sideways scroll {sw}')
        # finish -> review shows the work
        await pg.click('#gridbtn'); await pg.click('#endsec'); await pg.click('#really'); await pg.wait_for_timeout(300)
        await pg.click('#rf-all', force=True); await pg.wait_for_timeout(200)
        check(await pg.evaluate("document.querySelectorAll('.sc-review svg path').length") >= 1, 'review does not show scratch work')
        check(await pg.evaluate("localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('fm-scratch-T'))||'x')") is None, 'saved scratch not cleaned up after finishing')
        # ETA math has a pad; Meltdown math too
        await pg.goto(URL); await pg.click('#tab-eta'); await pg.click('#eta-start'); await pg.wait_for_timeout(300)
        check(not await pg.evaluate("document.querySelector('#scratch').hidden"), 'no pad on ETA math')
        await pg.goto(URL); await pg.click('#tab-gan'); await pg.uncheck('#mx-fold'); await pg.uncheck('#mx-mech'); await pg.click('#melt-go'); await pg.wait_for_timeout(300)
        check(not await pg.evaluate("document.querySelector('#m-scratch').hidden"), 'no pad in Meltdown math')
        await stroke([(30, 30), (90, 60), (150, 40)], sel='#m-scratch canvas')
        check(await pg.evaluate("document.querySelector('#m-scratch [data-a=clear]').disabled") is False, 'Meltdown pad did not draw')
        print('width', W, 'dark' if DARK else 'light', 'errors', errs, 'problems', bad)
        await b.close()
        sys.exit(1 if bad or errs else 0)
asyncio.run(main())
