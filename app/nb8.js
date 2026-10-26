/* ================= GAN math: Numerical Computation + Numerical Reasoning (5 choices, A-E) =================
   Question types follow the JumpStart Math guide: fractions (reduce, LCD, mixed numbers, + - x /),
   decimals (+ - x /), and number series (find the next number). Checked by verify_ganmath.py. */
const GANM=(()=>{
const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;};
const lcm=(a,b)=>a/gcd(a,b)*b;
function F(n,d){d=d==null?1:d;if(d<0){n=-n;d=-d;}const g=gcd(n,d);return{n:n/g,d:d/g};}
const fa=(a,b)=>F(a.n*b.d+b.n*a.d,a.d*b.d),fs=(a,b)=>F(a.n*b.d-b.n*a.d,a.d*b.d),fm=(a,b)=>F(a.n*b.n,a.d*b.d),fdv=(a,b)=>F(a.n*b.d,a.d*b.n);
const feq=(a,b)=>a.n===b.n&&a.d===b.d,fv=a=>a.n/a.d,fk=a=>a.n+'/'+a.d;
const frH=(a,b)=>`<span class="fr"><span>${a}</span><span>${b}</span></span>`;
/* value in lowest terms, improper fractions as mixed numbers */
function valH(q){if(q.d===1)return String(q.n);const w=Math.floor(q.n/q.d),r=q.n-w*q.d;return (w?w:'')+frH(r,q.d);}
function valT(q){if(q.d===1)return String(q.n);const w=Math.floor(q.n/q.d),r=q.n-w*q.d;return (w?w+' ':'')+r+'/'+q.d;}
/* an operand exactly as printed (may be unreduced): {w,n,d} */
const opV=o=>F(o.w*o.d+o.n,o.d);
const opH=o=>o.n?(o.w?o.w:'')+frH(o.n,o.d):String(o.w);
const opT=o=>o.n?(o.w?o.w+' ':'')+o.n+'/'+o.d:String(o.w);
const P=(n,d)=>({w:0,n,d}),Mx=(w,n,d)=>({w,n,d}),W=w=>({w,n:0,d:1});
const blk=h=>`<div class="mathblk">${h}</div>`;
const SIGN={'+':'+','-':'−','x':'×','/':'÷'};

/* ---------- decimals: exact, as strings like the guide (.3, 7.50, 26) ---------- */
function decF(s){const [i,f='']=s.split('.');return F(+((i||'0')+f),10**f.length);}
function decS(q){/* q must terminate */let k=0;while(k<9&&(q.n*10**k)%q.d!==0)k++;const n=q.n*10**k/q.d;
  let s=String(Math.round(n));if(k){s=s.padStart(k+1,'0');s=s.slice(0,-k)+'.'+s.slice(-k);s=s.replace(/0+$/,'').replace(/\.$/,'');if(s.startsWith('0.'))s=s.slice(1);}return s;}
const terminates=q=>{let d=q.d;while(d%2===0)d/=2;while(d%5===0)d/=5;return d===1;};
const places=s=>(s.split('.')[1]||'').length;
function dRand(R,lo,hi,k){/* a random decimal string with exactly k places (k=0: whole) */for(;;){const v=R.int(lo*10**k,hi*10**k);if(k&&v%10===0)continue;let s=String(v);if(!k)return s;s=s.padStart(k+1,'0');s=s.slice(0,-k)+'.'+s.slice(-k);if(s.startsWith('0.'))s=s.slice(1);return s;}}

/* ---------- item assembly ---------- */
function pack(o){/* o: {type,sub,stem,stemH,fig,ans:{t,h,key},wrong:[{t,h,key,note}x4],explain,explainH,params} -> item with the answer at position o.pos */
  const ch=[o.ans].concat(o.wrong);const keys=ch.map(c=>c.key);if(new Set(keys).size!==5)throw new Error('dup '+o.type);
  const wr=o.wrong.slice();const out=[];let wi=0;for(let i=0;i<5;i++)out.push(i===o.pos?Object.assign({ok:true},o.ans):wr[wi++]);
  return{type:o.type,skill:'Math',sub:o.sub,diff:2,stem:o.stem,stemH:o.stemH,svg:o.fig,grid:false,
    choices:out.map(c=>({t:c.t,h:c.h,svg:null,key:String(c.key),note:c.ok?null:(c.note||null)})),correct:o.pos,explain:o.explain,explainH:o.explainH||null,params:o.params};}
const fch=(q,note)=>({t:valT(q),h:valH(q),key:fk(q),q,note});
const dch=(q,note)=>{const s=decS(q);return{t:s,h:s,key:fk(q),q,note};};
/* keep the first 4 distinct, positive wrong answers that aren't the right one; top up with near misses */
function pickWrong(ans,cands,near,mk){const seen=new Set([fk(ans)]);const out=[];
  for(const c of cands.concat(near)){if(!c||!c.q||!(c.q.n>0)||!isFinite(c.q.n)||c.q.d>400)continue;const k=fk(c.q);if(seen.has(k))continue;seen.add(k);out.push(mk(c.q,c.note));if(out.length===4)break;}
  if(out.length<4)throw new Error('wrong');return out;}

/* ================= Numerical Computation ================= */
const SLIP='An arithmetic slip: redo it step by step.';
const fracDen=R=>R.pick([2,3,4,5,6,7,8,9,10,12,14,15,16]);
function properP(R,d){for(;;){const n=R.int(1,d-1);if(gcd(n,d)===1)return P(n,d);}}
const redN=(R,d)=>properP(R,d).n;
function lcdOf(a,b){return lcm(a,b);}
function expH(ops,sym){return ops.map(opH).join(` ${SIGN[sym]} `)+' =';}
function expT(ops,sym){return ops.map(opT).join(` ${SIGN[sym]==='−'?'-':SIGN[sym]} `)+' =';}
function nearF(ans,L){const u=F(1,L);return[{q:fa(ans,u),note:SLIP},{q:fs(ans,u),note:SLIP},{q:fa(ans,F(1,1)),note:SLIP},{q:fs(ans,F(1,1)),note:SLIP},{q:fa(ans,F(2,L)),note:SLIP}];}
const lowH=q=>valH(q);

const NC={
 fadd_same(R){const d=R.pick([5,7,8,9,10,11,12,13,14,15,16]),a=R.int(1,d-1),b=R.int(1,d-1);if(a+b===d)return null;
   const ops=[P(a,d),P(b,d)],ans=F(a+b,d);
   const wrong=[{q:F(a+b,2*d),note:'Added the bottom numbers too. When the bottoms match, add only the tops.'},{q:F(a*b,d),note:'Multiplied the top numbers instead of adding them.'},{q:F(Math.abs(a-b),d),note:'Subtracted instead of adding.'}];
   return{sub:'Adding fractions',ops,sym:'+',ans,wrong,near:nearF(ans,d),
     exH:`Same bottom number, so add the tops: ${frH(a,d)} + ${frH(b,d)} = ${frH(a+b,d)}${ans.d===d&&a+b<d?'':' = '+lowH(ans)}.`};},
 fadd_diff(R){const three=R.chance(0.35);const ds=three?[R.pick([2,3,4,5,8]),R.pick([4,6,8,10,16]),R.pick([2,3,4,5,8,10,16,32])]:[R.pick([3,4,5,6,8,9]),R.pick([6,8,10,12,15,16,32,36])];
   if(new Set(ds).size<2)return null;const L=ds.reduce(lcm);if(L>48)return null;const ops=ds.map(d=>properP(R,d));const ans=ops.map(opV).reduce(fa);
   const sn=ops.reduce((s,o)=>s+o.n,0),sd=ops.reduce((s,o)=>s+o.d,0);
   const wrong=[{q:F(sn,sd),note:'Added straight across (tops and bottoms). Change to a common bottom number first.'},{q:F(sn,L),note:`Changed the bottoms to ${L} but forgot to change the tops to match.`}];
   const steps=ops.map(o=>frH(o.n*L/o.d,L)).join(' + ');
   return{sub:'Adding fractions',ops,sym:'+',ans,wrong,near:nearF(ans,L),exH:`Lowest common denominator: ${L}. ${steps} = ${frH(ops.reduce((s,o)=>s+o.n*L/o.d,0),L)}${ans.d===L&&ans.n<L?'':' = '+lowH(ans)}.`};},
 fadd_mixed(R){const b=R.pick([2,3,4,5,6,8,10,12]),d=R.pick([2,3,4,6,8,10,12,14,16,48]);if(b===d)return null;const L=lcm(b,d);if(L>48)return null;
   const o1=Mx(R.int(1,19),redN(R,b),b),o2=Mx(R.int(1,12),redN(R,d),d);const ans=fa(opV(o1),opV(o2));const fsum=fa(P(o1.n,b),P(o2.n,d)),ws=o1.w+o2.w;
   const wrong=[{q:fv(fsum)>=1?fs(ans,F(1)):fa(ans,F(1)),note:fv(fsum)>=1?'The fractions add up to more than 1: carry the extra whole 1 over to the whole numbers.':'Added an extra 1 to the whole numbers; the fractions don’t reach a whole.'},
     {q:fa(F(ws),F(o1.n+o2.n,b+d)),note:'Added the fractions straight across. Change them to a common bottom number first.'},{q:fa(F(ws),F(o1.n+o2.n,L)),note:`Changed the bottoms to ${L} but not the tops.`}];
   return{sub:'Adding mixed numbers',ops:[o1,o2],sym:'+',ans,wrong,near:nearF(ans,L),exH:`Add the whole numbers: ${o1.w} + ${o2.w} = ${ws}. Add the fractions over ${L}: ${frH(o1.n*L/b,L)} + ${frH(o2.n*L/d,L)} = ${lowH(fsum)}. Together: ${lowH(ans)}.`};},
 fsub_diff(R){const b=R.pick([2,3,4,5,6,8,9,10,16]),d=R.pick([3,4,6,8,9,12,16]);if(b===d)return null;const L=lcm(b,d);if(L>48)return null;const o1=properP(R,b),o2=properP(R,d);
   const ans=fs(opV(o1),opV(o2));if(!(ans.n>0))return null;
   const wrong=[{q:fa(opV(o1),opV(o2)),note:'Added instead of subtracting.'},{q:F(Math.abs(o1.n-o2.n),L),note:`Changed the bottoms to ${L} but not the tops.`},{q:(o1.n>o2.n&&b>d)?F(o1.n-o2.n,b-d):null,note:'Subtracted straight across. Change to a common bottom number first.'}];
   return{sub:'Subtracting fractions',ops:[o1,o2],sym:'-',ans,wrong,near:nearF(ans,L),exH:`Lowest common denominator: ${L}. ${frH(o1.n*L/b,L)} − ${frH(o2.n*L/d,L)} = ${frH(o1.n*L/b-o2.n*L/d,L)}${ans.d===L?'':' = '+lowH(ans)}.`};},
 fsub_mixed(R){const b=R.pick([3,4,5,6,8,9,10]),d=R.pick([2,3,4,6,8,9,12]);const L=lcm(b,d);if(L>36)return null;const o1=Mx(R.int(4,20),redN(R,b),b),o2=Mx(R.int(1,o1.w-1),redN(R,d),d);
   const ans=fs(opV(o1),opV(o2));if(!(ans.n>0))return null;const f1=P(o1.n,b),f2=P(o2.n,d),borrow=fv(opV(f1))<fv(opV(f2));if(fv(opV(f1))===fv(opV(f2)))return null;
   const wrong=[borrow?{q:fa(F(o1.w-o2.w),fs(opV(f2),opV(f1))),note:'Took the smaller fraction away from the bigger one. Borrow 1 from the whole number instead.'}:{q:fs(ans,F(1)),note:'Borrowed when you didn’t need to.'},
     borrow?{q:fa(ans,F(1)),note:'Borrowed 1 for the fraction but didn’t take it off the whole number.'}:{q:fa(F(o1.w+o2.w),fs(opV(f1),opV(f2))),note:'Added the whole numbers instead of subtracting.'},{q:fa(opV(o1),opV(o2)),note:'Added instead of subtracting.'}];
   return{sub:'Subtracting mixed numbers',ops:[o1,o2],sym:'-',ans,wrong,near:nearF(ans,L),exH:`Change both fractions to ${L}ths: ${o1.w}${frH(o1.n*L/b,L)} − ${o2.w}${frH(o2.n*L/d,L)}.${borrow?` The first fraction is smaller, so borrow 1: ${o1.w-1}${frH(o1.n*L/b+L,L)}.`:''} Subtract: ${lowH(ans)}.`};},
 fsub_whole(R){const d=R.pick([3,4,5,6,7,8,9,10,12]),Wv=R.int(2,15),mixed=R.chance(0.5);const o2=mixed?Mx(R.int(1,Wv-1),redN(R,d),d):properP(R,d);if(mixed&&Wv<2)return null;
   const ans=fs(F(Wv),opV(o2));if(!(ans.n>0))return null;const wo=o2.w;
   const wrong=[{q:fa(F(Wv-wo-1),F(o2.n,d)),note:'Wrote the fraction you were taking away instead of what is left.'},{q:F(Wv-wo-1),note:'Borrowed 1 and then dropped the fraction.'},
     {q:fa(F(Wv-wo-1),F(d-o2.n-1,d)),note:`Borrowed 1 as ${frH(d,d)} but slipped subtracting the tops.`},{q:Wv-wo-o2.n>0?F(Wv-wo-o2.n,d):null,note:'Took the top number away from the whole number.'}];
   return{sub:'Borrowing and subtracting',ops:[W(Wv),o2],sym:'-',ans,wrong,near:nearF(ans,d),exH:`Borrow 1 from ${Wv} as ${frH(d,d)}: ${Wv} = ${Wv-1}${frH(d,d)}. Then ${Wv-1}${frH(d,d)} − ${opH(o2)} = ${lowH(ans)}.`};},
 fmul(R){const three=R.chance(0.25);const ops=(three?[2,3]:[1,2]).map(()=>properP(R,R.int(2,12)));if(three)ops.push(P(R.int(1,4),R.pick([5,7,9])));
   const ans=ops.map(opV).reduce(fm);const o1=ops[0],o2=ops[1];
   const wrong=[{q:fdv(opV(o1),opV(o2)),note:'Cross-multiplied. That is for dividing; to multiply go straight across.'},{q:ops.map(opV).reduce(fa),note:'Added instead of multiplying.'},{q:F(ops.reduce((s,o)=>s*o.n,1),ops.reduce((s,o)=>s+o.d,0)),note:'Added the bottom numbers. Multiply tops by tops and bottoms by bottoms.'}];
   const tn=ops.reduce((s,o)=>s*o.n,1),td=ops.reduce((s,o)=>s*o.d,1);
   return{sub:'Multiplying fractions',ops,sym:'x',ans,wrong,near:nearF(ans,ans.d),exH:`Tops times tops, bottoms times bottoms: ${frH(tn,td)}${feq(F(tn,td),ans)&&ans.n===tn?'':' = '+lowH(ans)}.`};},
 fmul_whole(R){const d=R.int(3,9),n=redN(R,d),Wv=R.int(2,9);const o=P(n,d);const ans=fm(F(Wv),opV(o));const first=R.chance(0.5);const ops=first?[W(Wv),o]:[o,W(Wv)];
   const wrong=[{q:F(n,Wv*d),note:'Multiplied the bottom number by the whole number. Only the top gets multiplied.'},{q:fa(F(Wv),opV(o)),note:'Put the whole number in front of the fraction instead of multiplying.'},{q:F(Wv+n,d),note:'Added the whole number to the top instead of multiplying.'}];
   return{sub:'Multiplying fractions',ops,sym:'x',ans,wrong,near:nearF(ans,d),exH:`Write ${Wv} as ${frH(Wv,1)}: ${frH(Wv*n,d)}${Wv*n<d&&gcd(Wv*n,d)===1?'':' = '+lowH(ans)}.`};},
 fmul_mixed(R){const b=R.int(2,9),d=R.pick([2,3,4,5]);const o1=R.chance(0.5)?properP(R,b):Mx(R.int(1,4),redN(R,b),b),o2=Mx(R.int(1,5),redN(R,d),d);
   const ans=fm(opV(o1),opV(o2));const imp=o=>F(o.w*o.d+o.n,o.d);
   const bad=o=>o.w?F(o.w+o.n,o.d):F(o.n,o.d);
   const wrong=[{q:fa(F(o1.w*o2.w),fm(F(o1.n,b),F(o2.n,d))),note:'Multiplied the whole numbers and the fractions separately. Change mixed numbers to improper fractions first.'},
     {q:fm(bad(o1),bad(o2)),note:'Changed the mixed number to an improper fraction wrong: multiply the whole number by the bottom, then add the top.'},{q:fdv(opV(o1),opV(o2)),note:'Divided instead of multiplying.'}];
   const i1=imp(o1),i2=imp(o2);
   return{sub:'Multiplying mixed numbers',ops:[o1,o2],sym:'x',ans,wrong,near:nearF(ans,ans.d),exH:`Improper fractions first: ${frH(o1.w*b+o1.n,b)} × ${frH(o2.w*d+o2.n,d)} = ${frH((o1.w*b+o1.n)*(o2.w*d+o2.n),b*d)} = ${lowH(ans)}.`,i1,i2};},
 fdiv(R){const b=R.int(2,10),d=R.int(2,10);const o1=properP(R,b),o2=properP(R,d);const ans=fdv(opV(o1),opV(o2));if(feq(opV(o1),opV(o2)))return null;
   const wrong=[{q:fm(opV(o1),opV(o2)),note:'Multiplied without flipping the second fraction.'},{q:fdv(opV(o2),opV(o1)),note:'Flipped the first fraction instead of the second.'},{q:fa(opV(o1),opV(o2)),note:'Added instead of dividing.'}];
   return{sub:'Dividing fractions',ops:[o1,o2],sym:'/',ans,wrong,near:nearF(ans,ans.d),exH:`Flip the second fraction and multiply: ${frH(o1.n,b)} × ${frH(d,o2.n)} = ${frH(o1.n*d,b*o2.n)}${o1.n*d===ans.n&&b*o2.n===ans.d&&ans.n<ans.d?'':' = '+lowH(ans)}.`};},
 fdiv_whole(R){const k=R.pick(['fw','wf','wm','mf']);let o1,o2;
   if(k==='fw'){const d=R.int(2,9);o1=properP(R,d);o2=W(R.int(2,9));}
   else if(k==='wf'){const d=R.int(2,9);o1=W(R.int(2,12));o2=properP(R,d);}
   else if(k==='wm'){const d=R.pick([2,3,4,5,6]);o1=W(R.int(3,14));o2=Mx(R.int(1,3),redN(R,d),d);}
   else{const b=R.pick([2,3,4,5,8]),d=R.pick([2,3,4,5,6,8]);o1=Mx(R.int(1,6),redN(R,b),b);o2=properP(R,d);}
   const v1=opV(o1),v2=opV(o2),ans=fdv(v1,v2);
   const wrong=[{q:fm(v1,v2),note:'Multiplied without flipping the number you divide by.'},{q:fdv(v2,v1),note:'Divided the wrong way round (flipped the first number).'},
     {q:o1.w&&o1.n?fdv(F(o1.w+o1.n,o1.d),v2):o2.w&&o2.n?fdv(v1,F(o2.w+o2.n,o2.d)):fa(v1,v2),note:o1.w&&o1.n||o2.w&&o2.n?'Changed the mixed number to an improper fraction wrong: multiply the whole number by the bottom, then add the top.':'Added instead of dividing.'}];
   const imp=v=>v.d===1?frH(v.n,1):frH(v.n,v.d);
   return{sub:'Dividing fractions',ops:[o1,o2],sym:'/',ans,wrong,near:nearF(ans,ans.d),exH:`Write both as fractions: ${imp(v1)} ÷ ${imp(v2)}. Flip the second and multiply: ${imp(v1)} × ${frH(v2.d,v2.n)} = ${lowH(ans)}.`};},
};
/* decimals */
const D10=k=>F(1,10**k);
const nearD=(ans,k)=>[{q:fa(ans,D10(k)),note:SLIP},{q:fs(ans,D10(k)),note:SLIP},{q:fa(ans,D10(Math.max(0,k-1))),note:SLIP},{q:fs(ans,D10(Math.max(0,k-1))),note:SLIP}];
const x10=(q,note)=>({q:fm(q,F(10)),note:note||'Decimal point one place too far right.'}),d10=(q,note)=>({q:fdv(q,F(10)),note:note||'Decimal point one place too far left.'});
function misaligned(strs){/* lined up the last digits instead of the points */const k=Math.max(...strs.map(places));const tot=strs.reduce((s,x)=>s+ +x.replace('.',''),0);return F(tot,10**k);}
function colSubNoBorrow(a,b){/* subtracted the smaller digit from the bigger in each column */const k=Math.max(places(a),places(b));const A=Math.round(fv(decF(a))*10**k),B=Math.round(fv(decF(b))*10**k);
  const da=String(A).split('').reverse(),db=String(B).split('').reverse();let out=0,pw=1;for(let i=0;i<Math.max(da.length,db.length);i++){out+=Math.abs((+da[i]||0)-(+db[i]||0))*pw;pw*=10;}return F(out,10**k);}
const ND={
 dadd(R){const n=R.pick([2,3,3]);const ks=R.shuffle(n>2?[0,1,2,3]:[1,2,3]).slice(0,n);const strs=ks.map(k=>k?dRand(R,0,R.pick([9,99]),k):dRand(R,2,99,0));if(new Set(strs).size<n)return null;
   const qs=strs.map(decF),ans=qs.reduce(fa);const K=Math.max(...strs.map(places));const mis=misaligned(strs);
   const wrong=[feq(mis,ans)?null:{q:mis,note:'Lined up the last digits instead of the decimal points.'},x10(ans),d10(ans),{q:fa(ans,D10(Math.max(0,K-1))),note:'Carried 1 into the wrong column.'}];
   return{sub:'Adding decimals',strs,sym:'+',ans,wrong,near:nearD(ans,K),dec:true,exH:`Line up the decimal points${strs.some(s=>!s.includes('.'))?' (a whole number has its point at the right end)':''} and add each column: ${strs.join(' + ')} = ${decS(ans)}.`};},
 dsub(R){const k1=R.pick([0,1,2,2]),k2=R.pick([1,2,2,3]);const a=dRand(R,10,99,k1);const b=dRand(R,1,Math.floor(fv(decF(a)))-1,k2);if(!b||fv(decF(b))<=0)return null;
   const ans=fs(decF(a),decF(b));if(!(ans.n>0))return null;const K=Math.max(k1,k2);const nb=colSubNoBorrow(a,b),mis=k1!==k2?F(Math.abs(+a.replace('.','')-+b.replace('.','')),10**K):null;
   const wrong=[feq(nb,ans)?null:{q:nb,note:'In some columns you took the smaller digit from the bigger one. Borrow instead.'},mis&&!feq(mis,ans)?{q:mis,note:'Lined up the last digits instead of the decimal points.'}:null,x10(ans),d10(ans),{q:fa(ans,D10(Math.max(0,K-1))),note:'Borrowed from a column but forgot to lower it.'}];
   return{sub:'Subtracting decimals',strs:[a,b],sym:'-',ans,wrong,near:nearD(ans,K),dec:true,exH:`Line up the points and add zeros so both have ${K} decimal place${K>1?'s':''}: ${K>k1?(+a).toFixed(K).replace(/^0\./,'.'):a} − ${b} = ${decS(ans)}.`};},
 dmul(R){const k1=R.pick([1,2,2]),both=R.chance(0.45);const a=dRand(R,1,99,k1);const b=both?dRand(R,1,R.pick([9,19]),R.pick([1,1,2])):String(R.int(2,19));
   const ans=fm(decF(a),decF(b));const K=places(a)+places(b);
   const wrong=[x10(ans,'Counted too few decimal places. Count the places in both numbers.'),d10(ans,'Counted too many decimal places. Count the places in both numbers.'),{q:fa(decF(a),decF(b)),note:'Added instead of multiplying.'},{q:fa(ans,D10(K-1>0?K-1:0)),note:'A slip in one of the partial products.'}];
   return{sub:'Multiplying decimals',strs:[a,b],sym:'x',ans,wrong,near:nearD(ans,K),dec:true,exH:`Multiply as if there were no points: ${a.replace('.','').replace(/^0+/,'')} × ${b.replace('.','').replace(/^0+/,'')} = ${ans.n*10**K/ans.d}. There ${K===1?'is':'are'} ${K} decimal place${K>1?'s':''} in the problem, so ${decS(ans)}.`};},
 ddiv(R){const dv=R.int(2,19),qk=R.pick([1,2,2,3]);const q=dRand(R,0,R.pick([9,19,30]),qk);const qq=decF(q);if(!(qq.n>0))return null;const a=decS(fm(qq,F(dv)));
   const ans=qq;const s=decS(ans);const dz=s.includes('0')&&/\d0\d/.test(s.replace('.',''))?decF(s.replace(/(\d)0(\d)/,'$1$2')):null;
   const wrong=[x10(ans,'Put the point in the answer one place too far right. Bring it straight up.'),d10(ans,'Put the point in the answer one place too far left. Bring it straight up.'),dz&&!feq(dz,ans)?{q:dz,note:'Dropped a zero in the answer. When the divisor doesn’t go in, write 0 and bring down the next digit.'}:null,{q:fa(ans,D10(places(s))),note:'A slip in the long division.'}];
   return{sub:'Dividing decimals',strs:[a,String(dv)],sym:'/',ans,wrong,near:nearD(ans,Math.max(1,places(s))),dec:true,exH:`Divide as with whole numbers and bring the point straight up: ${a} ÷ ${dv} = ${s}. Check: ${s} × ${dv} = ${a}.`};},
 ddiv_dec(R){const dk=R.pick([1,1,2,2,3]);const dvs=dRand(R,0,R.pick([2,9]),dk);const dvq=decF(dvs);if(!(dvq.n>0))return null;const qk=R.pick([0,0,1]);const q=dRand(R,2,R.pick([40,90]),qk);
   const a=decS(fm(decF(q),dvq));if(places(a)>4)return null;const ans=decF(q);const sh=places(dvs);
   const wrong=[x10(ans,'Moved the point in the number inside the bracket one place too many.'),d10(ans,'Moved the point in the number inside the bracket one place too few.'),{q:fm(ans,F(100)),note:'Moved the point too far. Move both points the same number of places.'},{q:fdv(ans,F(100)),note:'Moved the point in only one of the numbers.'}];
   const A2=decS(fm(decF(a),F(10**sh))),D2=decS(fm(dvq,F(10**sh)));
   return{sub:'Dividing decimals',strs:[a,dvs],sym:'/',ans,wrong,near:nearD(ans,Math.max(1,qk)),dec:true,exH:`Move both points ${sh} place${sh>1?'s':''} right so you divide by a whole number: ${A2} ÷ ${D2} = ${decS(ans)}.`};},
};
const NC_PLAN=['fadd_same','fadd_diff','fadd_mixed','fsub_diff','fsub_mixed','fsub_whole','fmul','fmul_whole','fmul_mixed','fdiv','fdiv_whole','dadd','dadd','dsub','dsub','dmul','dmul','ddiv','ddiv_dec','ddiv_dec'];
function genComp(seed,t,pos){const R=RNG(seed);
  for(let att=0;att<400;att++){let g=null;try{g=(NC[t]||ND[t])(R);}catch(e){g=null;}if(!g)continue;
    const dec=!!g.dec;let wrong;try{wrong=pickWrong(g.ans,g.wrong,g.near,dec?dch:fch);}catch(e){continue;}
    if(dec&&(!terminates(g.ans)||wrong.some(w=>!terminates(w.q))))continue;
    const exprH=dec?g.strs.join(` ${SIGN[g.sym]} `)+' =':expH(g.ops,g.sym),exprT=dec?g.strs.join(` ${SIGN[g.sym]==='−'?'-':SIGN[g.sym]} `)+' =':expT(g.ops,g.sym);
    const ans=dec?dch(g.ans):fch(g.ans);
    return pack({type:'gnc',sub:g.sub,stem:`Work out: ${exprT}`,stemH:'Work out the answer.',fig:blk(exprH),ans,wrong,pos,
      explain:g.exH.replace(/<[^>]+>/g,' '),explainH:g.exH,params:{t,e:exprT}});}
  throw new Error('comp '+t);}

/* ================= Numerical Reasoning: what comes next ================= */
/* every rule this site's series use, also used to reject a series that some other simple rule continues differently */
function predictions(s){const out=[];const n=s.length,d=s.slice(1).map((x,i)=>x-s[i]);
  const allEq=a=>a.length>=2&&a.every(x=>x===a[0]);
  if(allEq(d))out.push(s[n-1]+d[0]);
  if(s.every(x=>x!==0)){const r=s.slice(1).map((x,i)=>x/s[i]);if(r.length>=2&&r.every(x=>Math.abs(x-r[0])<1e-12))out.push(s[n-1]*r[0]);}
  const dd=d.slice(1).map((x,i)=>x-d[i]);if(d.length>=3&&allEq(dd))out.push(s[n-1]+d[d.length-1]+dd[0]);
  for(const p of [2,3]){const steps=d.length;if(steps<2*p)continue;let ok=true;const op=[];
    for(let c=0;c<p&&ok;c++){const idx=[];for(let i=c;i<steps;i+=p)idx.push(i);const ad=idx.map(i=>d[i]),ra=idx.map(i=>s[i]?s[i+1]/s[i]:NaN);
      if(allEq(ad))op.push(x=>x+ad[0]);else if(ra.every(x=>isFinite(x)&&Math.abs(x-ra[0])<1e-12))op.push(x=>x*ra[0]);else ok=false;}
    if(ok)out.push(op[steps%p](s[n-1]));}
  if(n>=6){const ev=s.filter((_,i)=>i%2===0),od=s.filter((_,i)=>i%2===1);const nx=n%2===0?ev:od;const dn=nx.slice(1).map((x,i)=>x-nx[i]);if(allEq(dn)){const other=n%2===0?od:ev;const da=other.slice(1).map((x,i)=>x-other[i]);if(allEq(da))out.push(nx[nx.length-1]+dn[0]);}}
  if(n>=4&&s.slice(2).every((x,i)=>x===s[i]+s[i+1]))out.push(s[n-2]+s[n-1]);
  return out;}
const NR={
 arith(R){const d=R.pick([2,3,4,5,6,7,8,9,11,12])*(R.chance(0.45)?-1:1),len=R.int(5,6);const a=d<0?R.int(-d*len+5,-d*len+60):R.int(1,40);const s=[];for(let i=0;i<len;i++)s.push(a+i*d);const nx=a+len*d,l=s[len-1];
   return{sub:'Series: add or subtract',s,nx,why:`${d>0?'Add':'Subtract'} ${Math.abs(d)} each time.`,ops:s.slice(1).map(()=>(d>0?'+':'−')+Math.abs(d)),wrong:[{v:l+2*d,note:'Skipped a step: that is two terms ahead.'},{v:l-d,note:'Went the wrong direction.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP},{v:nx+2,note:SLIP}]};},
 geo(R){const r=R.pick([2,2,3,3,4,5]),a=R.int(1,r>3?3:6),len=r>3?4:R.int(4,5);const s=[];for(let i=0;i<len;i++)s.push(a*r**i);const l=s[len-1],nx=l*r;if(nx>20000)return null;
   return{sub:'Series: multiply or divide',s,nx,why:`Multiply by ${r} each time.`,ops:s.slice(1).map(()=>'×'+r),wrong:[{v:l+(l-s[len-2]),note:'Added the last gap again. The gaps grow, because each number is multiplied.'},{v:l*(r+1),note:`Multiplied by ${r+1} instead of ${r}.`},{v:l*r-l/2,note:SLIP},{v:l*r+r,note:SLIP},{v:l*r/2,note:SLIP}]};},
 div(R){const r=R.pick([2,2,3,3,4]),len=R.int(4,5),e=R.int(1,r===2?9:4);const s=[];for(let i=len;i>=1;i--)s.push(e*r**i);const nx=e;const l=s[len-1];
   return{sub:'Series: multiply or divide',s,nx,why:`Divide by ${r} each time.`,ops:s.slice(1).map(()=>'÷'+r),wrong:[{v:l-(s[len-2]-l),note:'Subtracted the last gap again. The gaps shrink, because each number is divided.'},{v:l*r,note:'Multiplied instead of dividing.'},{v:nx+1,note:SLIP},{v:l/r*2,note:SLIP},{v:Math.max(1,l-r),note:`Subtracted ${r} instead of dividing by it.`}]};},
 growdiff(R){const d0=R.int(1,6),dd=R.pick([1,2,2,3]),down=R.chance(0.3),len=R.int(5,6);const a=down?R.int(70,99):R.int(1,20);const s=[a];let d=d0;for(let i=1;i<len;i++){s.push(s[i-1]+(down?-d:d));d+=dd;}const nx=s[len-1]+(down?-d:d);
   if(s.some(x=>x<1)||nx<1)return null;const ds=s.slice(1).map((x,i)=>x-s[i]),l=s[len-1],last=ds[ds.length-1];
   return{sub:'Series: growing steps',s,nx,why:`The steps ${down?'subtracted ':''}grow by ${dd}: ${ds.map(Math.abs).join(', ')}, so next is ${Math.abs(nx-l)}.`,ops:ds.map(x=>(x>0?'+':'−')+Math.abs(x)),wrong:[{v:l+last,note:'Repeated the last step. The steps keep growing.'},{v:l+last+(down?-2*dd:2*dd),note:`The steps grow by ${dd}, not ${2*dd}.`},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP},{v:l*2,note:'Doubled the last number.'}]};},
 interleave(R){const a=R.int(1,30),b=R.int(1,30),da=R.pick([1,2,3,4,5])*(R.chance(0.3)?-1:1),db=R.pick([1,2,3,4,5,6])*(R.chance(0.3)?-1:1);if(da===db&&b-a===0)return null;const len=7;const s=[];
   for(let i=0;i<len;i++)s.push(i%2===0?a+(i/2)*da+(da<0?20:0):b+((i-1)/2)*db+(db<0?20:0));if(s.some(x=>x<1))return null;const A=s.filter((_,i)=>i%2===0),B=s.filter((_,i)=>i%2===1);
   const nx=B[B.length-1]+db,l=s[len-1];if(da===db)return null;
   return{sub:'Series: two series mixed',s,nx,why:`Two series take turns. Every other number starting with the 2nd: ${B.join(', ')} (${db>0?'+':'−'}${Math.abs(db)} each time), so next is ${nx}. The other: ${A.join(', ')} (${da>0?'+':'−'}${Math.abs(da)}).`,ops:null,
     wrong:[{v:l+da,note:'Continued the wrong series. The next number belongs to the series that started with the 2nd number.'},{v:nx+db,note:'Skipped a step in the series.'},{v:l+(l-s[len-2]),note:'Repeated the last jump, but the numbers take turns between two series.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
 alt2(R){const combos=[['+','-'],['+','/'],['-','/'],['x','/'],['x','-'],['x','+'],['-','x']];const [o1,o2]=R.pick(combos);const k1=o1==='x'||o1==='/'?R.pick([2,3]):R.int(2,9),k2=o2==='x'||o2==='/'?R.pick([2,3,4]):R.int(1,9);
   if((o1==='+'&&o2==='-'||o1==='-'&&o2==='+')&&k1===k2)return null;if(o1==='x'&&o2==='/'&&k1===k2)return null;
   const ap=(x,o,k)=>o==='+'?x+k:o==='-'?x-k:o==='x'?x*k:x/k;const a=R.int(2,o2==='/'||o1==='/'?60:30);const s=[a];for(let i=1;i<7;i++)s.push(ap(s[i-1],i%2?o1:o2,i%2?k1:k2));
   if(s.some(x=>x<1||x!==Math.floor(x)||x>999))return null;const nx=ap(s[6],o1,k1);if(nx<1||nx!==Math.floor(nx))return null;const nm={'+':'add','-':'subtract','x':'multiply by','/':'divide by'};const sy={'+':'+','-':'−','x':'×','/':'÷'};
   const other=ap(s[6],o2,k2),l=s[6];
   return{sub:'Series: two-step pattern',s,nx,why:`Two steps take turns: ${nm[o1]} ${k1}, then ${nm[o2]} ${k2}. The next step is ${nm[o1]} ${k1}.`,ops:s.slice(1).map((_,i)=>i%2===0?sy[o1]+k1:sy[o2]+k2),
     wrong:[{v:other,note:`Used the wrong step: after ${sy[o2]}${k2} comes ${sy[o1]}${k1}.`},{v:l+(l-s[5]),note:'Repeated the last change. The steps take turns.'},{v:ap(nx,o2,k2),note:'Went one step too far.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
 cycle3(R){const k=[R.int(1,6),R.int(1,6)];const up=R.chance(0.5);let c=k[0]+k[1]+R.int(2,6);const ops=up?[k[0],k[1],-c]:[-k[0],-k[1],c];if(Math.abs(ops[0]+ops[1]+ops[2])===0)return null;
   if(ops[0]===ops[1]&&ops[1]===ops[2])return null;const a=up?R.int(10,40):R.int(5,25);const s=[a];for(let i=1;i<7;i++)s.push(s[i-1]+ops[(i-1)%3]);if(s.some(x=>x<1))return null;const nx=s[6]+ops[0],l=s[6];
   const f=x=>(x>0?'+':'−')+Math.abs(x);
   return{sub:'Series: three-step pattern',s,nx,why:`Three steps repeat: ${ops.map(f).join(', ')}. The next step is ${f(ops[0])}.`,ops:s.slice(1).map((_,i)=>f(ops[i%3])),
     wrong:[{v:l+ops[1],note:`Used the wrong step: the pattern starts again with ${f(ops[0])}.`},{v:l+ops[2],note:'That is the third step of the pattern; it starts again here.'},{v:l+(l-s[5]),note:'Repeated the last change.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
};
const NR_PLAN=['arith','geo','div','growdiff','growdiff','interleave','interleave','alt2','alt2','alt2','cycle3'];
function genReason(seed,t,pos){const R=RNG(seed);
  for(let att=0;att<600;att++){let g=null;try{g=NR[t](R);}catch(e){g=null;}if(!g)continue;
    if(g.s.some(x=>x!==Math.floor(x))||g.s.every((x,i)=>i<2||x===g.s[i-2]))continue;const pr=predictions(g.s);if(pr.some(p=>Math.abs(p-g.nx)>1e-9&&p===Math.floor(p)&&p>0))continue;
    const seen=new Set([g.nx]);const wrong=[];for(const w of g.wrong){const v=w.v;if(!(v>0)||v!==Math.floor(v)||seen.has(v)||pr.includes(v))continue;seen.add(v);wrong.push({t:String(v),h:String(v),key:String(v),note:w.note});if(wrong.length===4)break;}
    for(const v of [g.nx+2,g.nx-2,g.nx+3,g.nx+5,g.nx-3]){if(wrong.length===4)break;if(v>0&&!seen.has(v)){seen.add(v);wrong.push({t:String(v),h:String(v),key:String(v),note:SLIP});}}
    if(wrong.length<4)continue;
    const steps=g.ops?`<p class="wds">${g.s.map((x,i)=>i?`<span class="muted">${g.ops[i-1]}</span> ${x}`:x).join(' ')} <span class="muted">→</span> <b>${g.nx}</b></p>`:'';
    return pack({type:'gnr',sub:g.sub,stem:`What number comes next? ${g.s.join(', ')}, ?`,stemH:'What number comes next in the series?',fig:blk(`<span class="series">${g.s.join('&ensp;')}&ensp;<b>?</b></span>`),
      ans:{t:String(g.nx),h:String(g.nx),key:String(g.nx)},wrong,pos,explain:g.why+' The answer is '+g.nx+'.',explainH:esc(g.why)+' The answer is '+g.nx+'.'+steps,params:{t,s:g.s}});}
  throw new Error('reason '+t);}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');

/* a section: types cycle through the plan, correct letters spread evenly over A-E */
function build(code,sec,n){const R=RNG(hashSeed('ganmath',sec,code));const plan=sec==='ncomp'?NC_PLAN:NR_PLAN;
  const types=[];while(types.length<n)R.shuffle(plan).forEach(t=>{if(types.length<n)types.push(t);});
  const pos=[];while(pos.length<n)R.shuffle([0,1,2,3,4]).forEach(p=>pos.push(p));const P2=R.shuffle(pos.slice(0,n));
  const seen=new Set();return types.map((t,i)=>{let it,salt=0;do{it=(sec==='ncomp'?genComp:genReason)(hashSeed(code,sec,t,i,salt++),t,P2[i]);}while(seen.has(JSON.stringify(it.params))&&salt<40);
    seen.add(JSON.stringify(it.params));it.id=(sec==='ncomp'?'NC':'NR')+(i+1);it.sec=sec;return it;});}
return{build,genComp,genReason,predictions,NC_PLAN,NR_PLAN};})();
