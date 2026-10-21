import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s=open('shell.html').read()+"\n<script>\n"+open('gen.js').read()+"\n</script>\n<script>\n"+open('app.js').read()+"\n</script>\n"
open('local134-mech-set.html','w').write(s)
open('../index.html','w').write(s)
print(len(s),'bytes -> app/local134-mech-set.html and index.html')
