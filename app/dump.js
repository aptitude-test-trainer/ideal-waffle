const G=require('./gen.js');const N=+process.argv[2]||300;const out=[];
for(let t=0;t<N;t++){const code='V'+t;const test=G.buildTest(code);for(const sec of ['fold','mech','concept'])for(const it of test[sec])out.push({code,sec,id:it.id,type:it.type,diff:it.diff,params:it.params,keys:it.choices.map(c=>c.key),correct:it.correct,svg:it.svg,chsvg:it.choices.map(c=>c.svg||null),stem:it.stem});}
require('fs').writeFileSync('dump.json',JSON.stringify(out));console.log(out.length,'items');
