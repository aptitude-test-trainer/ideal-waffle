// usage: node mvcheck.js <dir-with-gen.js> [types...]  — compares against gen.ref.js in this folder
const path=require('path');const dir=process.argv[2];const only=process.argv.slice(3);
const A=require(path.join(__dirname,'gen.ref.js')),B=require(path.resolve(dir,'gen.js'));
const norm=s=>String(s).replace(/<g\b[^>]*>/g,'').replace(/<\/g>/g,'');
let bad=0;const mvTypes={};
for(const t of Object.keys(B.GENS)){if(only.length&&!only.includes(t))continue;
  for(let d=1;d<=4;d++)for(let s=1;s<=40;s++){let a,b;try{a=A.GENS[t](s*7919+d,d);}catch(e){a='ERR';}try{b=B.GENS[t](s*7919+d,d);}catch(e){b='ERR';}
    if(a==='ERR'||b==='ERR'){if(a!==b){bad++;console.log('ERR mismatch',t,d,s);}continue;}
    if((b.svg||'').includes('class="mv"'))mvTypes[t]=(mvTypes[t]||0)+1;
    const same=norm(a.svg)===norm(b.svg)&&JSON.stringify(a.choices)===JSON.stringify(b.choices)&&a.correct===b.correct&&JSON.stringify(a.params)===JSON.stringify(b.params)&&a.explain===b.explain&&a.stem===b.stem;
    if(!same){bad++;if(bad<6)console.log('CHANGED',t,d,s);}}}
console.log('changed items:',bad);console.log('types with mv groups (count of 160 samples):',JSON.stringify(mvTypes));
