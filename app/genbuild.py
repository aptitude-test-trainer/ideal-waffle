import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
import glob
g=open('gen.base.js').read()
parts=''.join(open(f).read()+'\n' for f in sorted(glob.glob('nb[0-9]*.js')))
open('gen.js','w').write(g.replace('/*NEWTYPES*/',parts))
