// dump every GAN math item (Numerical Computation + Numerical Reasoning) for verify_ganmath.py:
// N tests at each level (std, hard, expert), Meltdown math picks, and the JumpStart study-guide items
const G=require('./gen.js');const n=+process.argv[2]||100;const out=[];
const row=(it,extra)=>Object.assign({sec:it.sec,type:it.type,sub:it.sub,stem:it.stem,fig:it.svg,choices:it.choices.map(c=>({t:c.t,h:c.h,key:c.key,note:c.note})),correct:it.correct,explainH:it.explainH,params:it.params},extra);
for(const level of ['std','hard','expert'])for(let s=0;s<n;s++){['ncomp','nreason'].forEach(sec=>{const def=sec==='ncomp'?30:20;G.GANM.build('G'+s,sec,def,level).forEach(it=>out.push(row(it,{code:'G'+s,level})));});}
for(let s=0;s<n*20;s++){const it=G.GANM.one(G.hashSeed('melt',s),1+s%12);out.push(row(it,{code:'M'+s,level:'melt-'+it.level}));}
const sg=G.GANM.sgItems('X',{ncomp:999,nreason:999});sg.sgncomp.forEach(it=>out.push(row(it,{sec:'sgncomp',code:'SG',level:'sg'})));sg.sgnreason.forEach(it=>out.push(row(it,{sec:'sgnreason',code:'SG',level:'sg'})));
require('fs').writeFileSync('ganmathdump.json',JSON.stringify(out));require('fs').writeFileSync('jskey.json',JSON.stringify(G.GANM.JS_KEY));console.log(out.length);
