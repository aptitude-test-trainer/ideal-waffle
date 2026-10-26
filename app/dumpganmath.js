// dump every GAN math item (Numerical Computation + Numerical Reasoning) for verify_ganmath.py
const G=require('./gen.js');const n=+process.argv[2]||100;const out=[];
for(let s=0;s<n;s++){['ncomp','nreason'].forEach(sec=>{const def=sec==='ncomp'?30:20;G.GANM.build('G'+s,sec,def).forEach(it=>out.push({sec,code:'G'+s,type:it.type,sub:it.sub,stem:it.stem,fig:it.svg,choices:it.choices.map(c=>({t:c.t,h:c.h,key:c.key,note:c.note})),correct:it.correct,explainH:it.explainH,params:it.params}));});}
require('fs').writeFileSync('ganmathdump.json',JSON.stringify(out));console.log(out.length);
