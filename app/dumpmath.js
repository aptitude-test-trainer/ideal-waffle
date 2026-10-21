const G=require('./gen.js');const n=+process.argv[2]||100;const out=[];
for(let s=0;s<n;s++){G.ETA.buildMath('V'+s,33).forEach(it=>out.push({type:it.type,stem:it.stem,stemH:it.stemH,fig:it.svg,choices:it.choices.map(c=>({t:c.t,h:c.h,svg:c.svg,key:c.key})),correct:it.correct,params:it.params}));}
require('fs').writeFileSync('mathdump.json',JSON.stringify(out));console.log(out.length);
