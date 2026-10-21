"""Independent solvers for the types added from the study guides (batch files nb*.js)."""
import math
def flip(k): return {'A':'B','B':'A'}.get(k,k)
def cmp(a, b, bigger_wins=True, tol=1e-9):
    if abs(a-b) <= tol*max(1,abs(a),abs(b)): return 'same'
    return ('A' if a > b else 'B') if bigger_wins else ('A' if a < b else 'B')
def ask(ans, want, invert_word):
    return flip(ans) if want == invert_word else ans

def wheels2(p):
    if p['v']=='wagon':
        more = cmp(1/p['rA'], 1/p['rB'])       # turns = distance / circumference
        return ask(more, p['ask'], 'fewer')
    return cmp(p['dA']/p['rA'], p['dB']/p['rB'])   # rim speed equal -> angular speed ~ 1/r; spot speed = w*d

def gearturns(p):
    t = p['nA']/p['nB']
    return 'one' if abs(t-1)<1e-9 else ('more' if t>1 else 'less')

def drag(p):
    n = [2 if r=='pulley' else 1 for r in p['rigs']]
    more = cmp(n[0], n[1])
    return ask(more, p['ask'], 'harder')

def twowinch(p):
    h = cmp(p['A']['r']/p['A']['h'], p['B']['r']/p['B']['h'])
    return ask(h, p['ask'], 'easier')

def dropthrow(p):
    if p['v']=='heights': return cmp(p['H']['A'], p['H']['B'], False)
    if p['ask']=='first': return 'same'
    return cmp(p['S']['A'], p['S']['B'])

def planedrop(p): return 'fwd' if p['moving'] else 'down'

def mud(p):
    a = p['ang']; r = (math.cos(a), math.sin(a))
    # SVG y is down: clockwise on screen means velocity = (-sin, cos)
    v = (-r[1], r[0]) if p['cw'] else (r[1], -r[0])
    return max(p['paths'], key=lambda k: v[0]*p['paths'][k][0]+v[1]*p['paths'][k][1])

def slopetip(p):
    t = cmp(p['A'][0]/p['A'][1], p['B'][0]/p['B'][1], False)   # narrower for its height tips first
    return ask(t, p['ask'], 'stable')

def polebal(p): return p['low'] if p['ask']=='steady' else flip(p['low'])
def posture(p): return p['low'] if p['ask']=='better' else flip(p['low'])

def scissor(p):
    m = cmp(p['A'][0]/p['A'][1], p['B'][0]/p['B'][1])   # tie force ~ load * half-width / height
    return ask(m, p['ask'], 'less')

def truss(p): return ask(cmp(p['dA'], p['dB']), p['ask'], 'weaker')

def hammock(p):
    x0,x1,ty,px,py = p['x0'],p['x1'],p['ty'],p['px'],p['py']
    # equilibrium: H equal, VA+VB=W -> solve numerically
    uA = ((x0-px), (ty-py)); uB = ((x1-px), (ty-py))
    # solve TA*uA/|uA| + TB*uB/|uB| = (0, W) with W=1 (y up = ty-py negative in svg -> use sign)
    la, lb = math.hypot(*uA), math.hypot(*uB)
    a11, a12, a21, a22 = uA[0]/la, uB[0]/lb, -uA[1]/la, -uB[1]/lb
    det = a11*a22-a12*a21
    TA = (0*a22 - a12*1)/det; TB = (a11*1 - a21*0)/det
    return ask(cmp(TA, TB, tol=1e-6), p['ask'], 'less')

def ropeangle(p): return ask(cmp(math.cos(math.radians(p['aA'])), math.cos(math.radians(p['aB']))), p['ask'], 'harder')
def shovel(p): return ask(cmp(p['dA'], p['dB'], False), p['ask'], 'harder')
def beamedge(p):
    w, t = p['w'], p['t']
    stiff = {k: (w*t**3 if k!=p['edge'] else t*w**3) for k in 'AB'}
    strong = cmp(stiff['A'], stiff['B'])
    return strong if p['ask']=='strong' else flip(strong)
def crane(p): return ask(cmp(math.cos(math.radians(p['aA'])), math.cos(math.radians(p['aB']))), p['ask'], 'safe')

NSOLVE = dict(wheels2=wheels2, gearturns=gearturns, drag=drag, twowinch=twowinch, dropthrow=dropthrow, planedrop=planedrop, mud=mud,
              slopetip=slopetip, polebal=polebal, posture=posture, scissor=scissor, truss=truss, hammock=hammock, ropeangle=ropeangle,
              shovel=shovel, beamedge=beamedge, crane=crane)

# ---------- batch 2 ----------
def bevel(p):
    # contact is at the back rim of the flat gear B; teeth move together there.
    if p['mode']=='VtoH':
        bottom_of_A = -1 if p['vcw'] else 1     # clockwise on screen: bottom point moves left (-x)
        back_of_B = bottom_of_A; front_of_B = -back_of_B
        return 'fr' if front_of_B > 0 else 'fl'
    front = 1 if p['hfront']=='r' else -1
    bottom_of_A = -front
    return 'cw' if bottom_of_A < 0 else 'ccw'

def chainhoist(p):
    # pulled strand hangs from the big wheel's left rim or feeds the small wheel's right rim
    Rb, rs = 46.0, 28.0
    theta = +1 if p['pull']=='big' else -1       # +1 = counterclockwise on screen
    wound = Rb*theta - rs*theta                   # big right rim winds up, small left rim pays out
    return 'up' if wound > 0 else ('down' if wound < 0 else 'none')

def balfig(p):
    ok = [i for i,f in enumerate(p['figs']) if f['cL']*f['dL']==f['cR']*f['dR']]
    return 'ABCD'[ok[0]] if len(ok)==1 else 'AMBIG'

def pitchers(p): return 'same' if p['v']=='equal' else p['cr']

def springlever(p):
    arms = {}
    for k,g in p['geo'].items():
        (px,py),(ex,ey),(ax,ay) = g['pivot'],g['end'],g['anchor']
        dx,dy = ax-ex, ay-ey
        arms[k] = abs(dx*(ey-py)-dy*(ex-px))/math.hypot(dx,dy)
    none_ = min(arms, key=arms.get)
    if arms[none_] > 1.0 or max(arms.values()) < 20: return 'GEOMETRY'
    return none_ if p['ask']=='cannot' else flip(none_)

def dam(p): return p['good'] if p['ask']=='stronger' else flip(p['good'])

def caster(p):
    moved = -p['off']                  # wheels trail behind their posts
    dirA = -p['labA']                  # x-direction of arrow A
    return 'A' if moved == dirA else 'B'

def rudder(p): return 'r' if p['s']==1 else 'l'
def trailer(p): return 'right' if p['want']=='left' else 'left'

def smoothseat(p):
    mid = (p['f']+p['r'])/2; d = {k: abs(x-mid) for k,x in p['xs'].items()}
    return min(d, key=d.get) if p['ask']=='smooth' else max(d, key=d.get)

def flowtube(p): return cmp(p['hA'], p['hB'])
def hotloop(p): return p['topLab'] if p['ask']=='hot' else flip(p['topLab'])
def pipecap(p): return cmp(p['A']['n']*p['A']['r']**2, p['B']['n']*p['B']['r']**2)
def parachute(p): return 'same' if p['ask']=='speed' else cmp(p['hA'], p['hB'], False)
def sound(p):
    if p['v']=='tunnel': return p['inT']
    return p['small'] if p['ask']=='high' else flip(p['small'])
def vent(p): return 'ABC'[p['vent']]
def candle(p): return 'up' if p['v']=='ask' else p['risen']

NSOLVE.update(bevel=bevel, chainhoist=chainhoist, balfig=balfig, pitchers=pitchers, springlever=springlever, dam=dam, caster=caster, rudder=rudder,
              trailer=trailer, smoothseat=smoothseat, flowtube=flowtube, hotloop=hotloop, pipecap=pipecap, parachute=parachute, sound=sound, vent=vent, candle=candle)

# ---------- batch 3 ----------
def altitude(p): return p['top']
def riverbend(p): return p['outer'] if p['ask']=='wear' else flip(p['outer'])
def darkrock(p): return p['dark'] if p['ask']=='hot' else flip(p['dark'])
def refraction(p): return 'below'
def coil(p):
    vals = p['vals']
    def length(i):
        n = vals[i] if p['attr']=='len' else 5
        amp = 8+n*3 if p['attr']=='len' else 18
        seg = 260/(n*2)
        return 92 + n*2*math.hypot(seg, 2*amp)
    thick = [vals[i] if p['attr']=='thick' else 2.2 for i in range(3)]
    R = [length(i)/thick[i]**2 for i in range(3)]
    i = R.index(max(R)) if p['ask']=='least' else R.index(min(R))
    return 'ABC'[i]
def thermal(p): return 'thick' if p['v']=='thick' else 'metal'
def condense(p): return p['wet'] if p['ask']=='fridge' else flip(p['wet'])
def fanblades(p): return ask(cmp(p['nA'], p['nB']), p['ask'], 'less')
def umbrella(p):
    fewer = cmp(p['nA'], p['nB'], False)
    return fewer if p['ask']=='flip' else flip(fewer)
def windmill(p):
    area = lambda m: m['n']*m['len']**2
    return cmp(area(p['a']), area(p['b']))
VOL = dict(cube=1, cyl=math.pi/4, ball=math.pi/6, hex=3*math.sqrt(3)/8, cone=math.pi/12, pyr=1/3)
def solids(p): return ask(cmp(VOL[p['kA']], VOL[p['kB']]), p['ask'], 'lighter')
def bucket(p):
    dens = {'apples': (0.85*0.6, 1.0), 'cream': (0.99, 1.03)}[p['v']]   # (special, other)
    return p['which'] if dens[0] > dens[1] else flip(p['which'])
def tanks(p): return 'same' if p['v']=='twoshort' else p['tall']
def jars(p): return cmp(p['dA'], p['dB'])
def hydrant(p): return p['low'] if p['ask']=='high' else flip(p['low'])
def switchback(p):
    fewer = cmp(p['nA'], p['nB'], False)
    return fewer if p['ask']=='steep' else flip(fewer)
def burst(p): return p['rim'] if p['ask']=='burst' else flip(p['rim'])
def handwheel(p): return ask(cmp(p['rA'], p['rB']), p['ask'], 'more')

NSOLVE.update(altitude=altitude, riverbend=riverbend, darkrock=darkrock, refraction=refraction, coil=coil, thermal=thermal, condense=condense,
              fanblades=fanblades, umbrella=umbrella, windmill=windmill, solids=solids, bucket=bucket, tanks=tanks, jars=jars, hydrant=hydrant,
              switchback=switchback, burst=burst, handwheel=handwheel)
