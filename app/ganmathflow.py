"""Phone-width run of the GAN math sections (Numerical Computation, then Numerical Reasoning).

python3 ganmathflow.py [width] [dark]
Test mode: answers every question, checks no sideways scroll, every fraction is stacked (no "/" in
the question or the choices), 5 choices A-E, the timer and counts are the defaults, results page appears.
Practice mode: a wrong pick shows the verdict and the worked explanation.
Screenshots go to shots/ganmath_*.png.
"""
import os, asyncio, sys
from playwright.async_api import async_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390; DARK = len(sys.argv) > 2
HERE = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(HERE, 'shots'), exist_ok=True)
URL = 'file://' + os.path.join(HERE, 'local134-mech-set.html')
bad = []

async def start(pg, mode):
    await pg.goto(URL); await pg.evaluate("localStorage.clear()"); await pg.goto(URL)
    for s in [mode, '#src-rand', '#sec-math', '#t-real']: await pg.click(s, force=True)
    await pg.click('#start'); await pg.wait_for_timeout(300)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': W, 'height': 844}, device_scale_factor=2, color_scheme='dark' if DARK else 'light')
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await start(pg, '#pm-test')
        maxsw = 0; shot = {}
        for sec, n, mins in (('Numerical Computation', 30, '26:'), ('Numerical Reasoning', 20, '22:')):
            name = await pg.text_content('#secname'); clock = await pg.text_content('#clock'); qpos = await pg.text_content('#qpos')
            if name != sec or not clock.startswith(mins) and not clock.startswith(str(int(mins[:2]) - 1)) or f'of {n}' not in qpos:
                bad.append(f'section header {name} {clock} {qpos}')
            for i in range(n):
                info = await pg.evaluate("""()=>{const t=e=>e?e.innerText:'';return {fig:t(document.querySelector('#figure')),ch:[...document.querySelectorAll('#choices .choice')].map(c=>c.innerText.replace(/\\s+/g,' ').trim()),
                   fr:document.querySelectorAll('#figure .fr, #choices .fr').length,sw:document.documentElement.scrollWidth}}""")
                maxsw = max(maxsw, info['sw'])
                if len(info['ch']) != 5: bad.append(f'{sec} Q{i+1}: {len(info["ch"])} choices')
                if '/' in info['fig'] or any('/' in c for c in info['ch']): bad.append(f'{sec} Q{i+1}: slash fraction {info}')
                if info['fr'] and sec not in shot: shot[sec] = i
                if sec == 'Numerical Reasoning' and sec not in shot: shot[sec] = i
                if shot.get(sec) == i: await pg.screenshot(path=os.path.join(HERE, 'shots', f'ganmath_{"comp" if "Comp" in sec else "reason"}{"_dark" if DARK else ""}.png'), full_page=True)
                await pg.keyboard.press('abcde'[i % 5]); await pg.keyboard.press('n'); await pg.wait_for_timeout(40)
            await pg.click('#really', force=True); await pg.wait_for_timeout(300)
            if sec == 'Numerical Computation':
                desc = await pg.text_content('#inter-desc')
                if '20 questions' not in desc or '22 minutes' not in desc or '5 answer choices' not in desc: bad.append('intermission: ' + desc)
                await pg.click('#inter-go'); await pg.wait_for_timeout(300)
        res = await pg.evaluate("document.querySelector('#results') && !document.querySelector('#results').hidden ? document.querySelector('#results .big').textContent : null")
        if not res or not res.endswith('/50'): bad.append(f'results {res}')
        maxsw = max(maxsw, await pg.evaluate("document.documentElement.scrollWidth"))
        await pg.screenshot(path=os.path.join(HERE, 'shots', f'ganmath_results{"_dark" if DARK else ""}.png'), full_page=False)
        # practice: wrong pick shows verdict + explanation
        await start(pg, '#pm-prac')
        for i in range(6):
            c = await pg.evaluate("""()=>{const x=[...document.querySelectorAll('#choices input')];return x.length}""")
            await pg.keyboard.press('a'); await pg.wait_for_timeout(150)
            fb = await pg.evaluate("""()=>{const f=document.querySelector('#pfb');return f&&!f.hidden?f.innerText:''}""")
            if 'How to get it' not in fb: bad.append(f'practice Q{i+1}: no explanation shown')
            if i == 0 or ('Missed' in fb and 'missed' not in shot):
                if 'Missed' in fb: shot['missed'] = i
                await pg.screenshot(path=os.path.join(HERE, 'shots', f'ganmath_practice{"_dark" if DARK else ""}.png'), full_page=True)
            maxsw = max(maxsw, await pg.evaluate("document.documentElement.scrollWidth"))
            await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
        print('width', W, 'dark' if DARK else 'light', 'max scrollWidth', maxsw, 'errors', errs, 'problems', bad[:10])
        if maxsw > W: bad.append('sideways scroll')
        await b.close()
        sys.exit(1 if bad or errs else 0)
asyncio.run(main())
