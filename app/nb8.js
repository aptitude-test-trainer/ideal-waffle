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
     {q:fa(F(Wv-wo-1),F(d-o2.n-1,d)),note:'Borrowed 1 correctly but slipped subtracting the top numbers.'},{q:Wv-wo-o2.n>0?F(Wv-wo-o2.n,d):null,note:'Took the top number away from the whole number.'}];
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

/* ================= Hard and Expert levels =================
   Computation: longer expressions built from operands; wrong answers come from mistakes made on that
   expression (wrong operation, worked left to right, mixed number changed wrong, point moved, ...).
   Reasoning: bigger numbers and harder rules (steps that multiply, a multiply inside a 3-step cycle,
   a multiplying series mixed with an adding one, each number = sum of the two before, squares). */
const oF=o=>({k:'f',o}),oD=s=>({k:'d',s});
const oV=x=>x.k==='f'?opV(x.o):decF(x.s),oH=x=>x.k==='f'?opH(x.o):x.s,oT=x=>x.k==='f'?opT(x.o):x.s;
const isMixed=x=>x.k==='f'&&x.o.w&&x.o.n;
function evalOps(vals,sy){const v=[vals[0]],o=[];sy.forEach((op,i)=>{const x=vals[i+1];if(op==='x')v[v.length-1]=fm(v[v.length-1],x);else if(op==='/')v[v.length-1]=fdv(v[v.length-1],x);else{o.push(op);v.push(x);}});
  let r=v[0];o.forEach((op,i)=>{r=op==='+'?fa(r,v[i+1]):fs(r,v[i+1]);});return r;}
function evalLTR(vals,sy){let r=vals[0];sy.forEach((op,i)=>{const x=vals[i+1];r=op==='+'?fa(r,x):op==='-'?fs(r,x):op==='x'?fm(r,x):fdv(r,x);});return r;}
const SWAPNOTE={'/':'Multiplied instead of dividing. Flip the number you divide by, then multiply.','x':'Divided instead of multiplying.','-':'Added instead of subtracting.','+':'Subtracted instead of adding.'};
const SWAP={'/':'x','x':'/','-':'+','+':'-'};
const decPlaces=q=>{const s=decS(q);return (s.split('.')[1]||'').length;};
function fOp(R,dens,mixedP,wMax){const d=R.pick(dens);const p=properP(R,d);return oF(R.chance(mixedP)?Mx(R.int(1,wMax),p.n,d):p);}
/* worked steps in the right order: x and / first, then + and - */
function stepsH(xs,sy,dec){const show=q=>dec?decS(q):valH(q);const v=[{q:oV(xs[0]),h:oH(xs[0])}],o=[],out=[];
  sy.forEach((op,i)=>{const x={q:oV(xs[i+1]),h:oH(xs[i+1])};if(op==='x'||op==='/'){const L=v[v.length-1];const r=op==='x'?fm(L.q,x.q):fdv(L.q,x.q);out.push(`${L.h} ${SIGN[op]} ${x.h} = ${show(r)}`);v[v.length-1]={q:r,h:show(r)};}else{o.push(op);v.push(x);}});
  let r=v[0];o.forEach((op,i)=>{const q=op==='+'?fa(r.q,v[i+1].q):fs(r.q,v[i+1].q);out.push(`${r.h} ${SIGN[op]} ${v[i+1].h} = ${show(q)}`);r={q,h:show(q)};});return out;}
function exprItem(g){const vals=g.xs.map(oV),ans=evalOps(vals,g.sy);if(!(ans.n>0))return null;
  if(g.dec){if(!terminates(ans)||decPlaces(ans)>4)return null;}else if(ans.d>144)return null;if(fv(ans)>99999)return null;
  const W=[];const ltr=evalLTR(vals,g.sy);if(!feq(ltr,ans))W.push({q:ltr,note:'Worked left to right. Do × and ÷ before + and −.'});
  g.sy.forEach((op,i)=>{const sy2=g.sy.slice();sy2[i]=SWAP[op];W.push({q:evalOps(vals,sy2),note:SWAPNOTE[op]});});
  g.xs.forEach((x,i)=>{if(isMixed(x)){const v2=vals.slice();v2[i]=F(x.o.w+x.o.n,x.o.d);W.push({q:evalOps(v2,g.sy),note:'Changed a mixed number to an improper fraction wrong: multiply the whole number by the bottom, then add the top.'});}});
  if(!g.dec&&g.xs.length===2&&g.xs.every(x=>x.k==='f')){const a=g.xs[0].o,b=g.xs[1].o,op=g.sy[0];
    if((op==='+'||op==='-')&&a.d!==b.d){const fn=op==='+'?a.n+b.n:a.n-b.n;if(fn>0)W.push({q:fa(F(op==='+'?a.w+b.w:a.w-b.w),F(fn,a.d+b.d)),note:`${op==='+'?'Added':'Subtracted'} the fractions straight across. Change them to a common bottom number first.`});}
    if(op==='x'&&(a.w||b.w))W.push({q:fa(F(a.w*b.w),fm(F(a.n,a.d),F(b.n,b.d))),note:'Multiplied the whole numbers and the fractions separately. Change mixed numbers to improper fractions first.'});}
  if(g.dec){W.push(x10(ans));W.push(d10(ans));if(g.sy.every(o=>o==='+')&&g.xs.every(x=>x.k==='d')){const mis=misaligned(g.xs.map(x=>x.s));if(!feq(mis,ans))W.unshift({q:mis,note:'Lined up the last digits instead of the decimal points.'});}}
  const ok=w=>w&&w.q&&w.q.n>0&&(!g.dec||(terminates(w.q)&&decPlaces(w.q)<=5));
  let wrong;try{wrong=pickWrong(ans,W.filter(ok),(g.dec?nearD(ans,Math.max(1,decPlaces(ans))):nearF(ans,ans.d)).filter(ok),g.dec?dch:fch);}catch(e){return null;}
  const exprH=g.xs.map(oH).map((h,i)=>i?` ${SIGN[g.sy[i-1]]} ${h}`:h).join('')+' =',exprT=g.xs.map(oT).map((h,i)=>i?` ${SIGN[g.sy[i-1]]==='−'?'-':SIGN[g.sy[i-1]]} ${h}`:h).join('')+' =';
  const pre=(g.xs.some(isMixed)?'Change mixed numbers to improper fractions. ':'')+(!feq(ltr,ans)?'Do × and ÷ before + and −. ':'');
  const exH=pre+stepsH(g.xs,g.sy,g.dec).join('; ')+'.';
  return{sub:g.sub,exprH,exprT,ans:g.dec?dch(ans):fch(ans),wrong,exH};}
const DH=[2,3,4,5,6,8,9,10,12,16],DX=[2,3,4,5,6,7,8,9,10,12,15,16];
const lcdOk=(xs,max)=>xs.filter(x=>x.k==='f').map(x=>x.o.d).reduce(lcm,1)<=max;
const NCX={
 h_fadd3(R){const xs=[fOp(R,DH,0.5,9),fOp(R,DH,0.4,9),fOp(R,DH,0.3,9)];if(!lcdOk(xs,72)||new Set(xs.map(x=>x.o.d)).size<2)return null;return{sub:'Adding fractions',xs,sy:['+','+']};},
 h_fsub(R){const b=R.pick(DH),d=R.pick(DH);if(b===d||lcm(b,d)>60)return null;const p1=properP(R,b),p2=properP(R,d);if(fv(p1)>=fv(p2))return null;const w1=R.int(5,24);
   return{sub:'Subtracting mixed numbers',xs:[oF(Mx(w1,p1.n,b)),oF(Mx(R.int(1,w1-2),p2.n,d))],sy:['-']};},
 h_fmix(R){const xs=[fOp(R,DH,0.6,12),fOp(R,DH,0.4,6),fOp(R,DH,0.3,4)];if(!lcdOk(xs,60))return null;return{sub:'Adding and subtracting fractions',xs,sy:[R.pick(['+','-']),'-']};},
 h_fmul(R){const b=R.int(2,9),d=R.int(2,9);return{sub:'Multiplying mixed numbers',xs:[oF(Mx(R.int(1,6),properP(R,b).n,b)),oF(Mx(R.int(1,5),properP(R,d).n,d))],sy:['x']};},
 h_fdiv(R){const b=R.int(2,9),d=R.int(2,9);const a=oF(Mx(R.int(1,9),properP(R,b).n,b));const c=R.chance(0.6)?oF(Mx(R.int(1,4),properP(R,d).n,d)):oF(properP(R,d));return{sub:'Dividing fractions',xs:[a,c],sy:['/']};},
 h_dadd(R){const n=R.pick([3,4]);const xs=[];for(let i=0;i<n;i++){const k=R.pick([0,1,2,3]);xs.push(oD(k?dRand(R,0,R.pick([9,99]),k):dRand(R,2,199,0)));}if(new Set(xs.map(x=>x.s)).size<n||xs.every(x=>!x.s.includes('.')))return null;return{sub:'Adding decimals',xs,sy:Array(n-1).fill('+'),dec:true};},
 h_dsub(R){const a=R.chance(0.5)?dRand(R,10,300,0):dRand(R,10,300,1);const b=dRand(R,1,Math.floor(fv(decF(a)))-1,3);return{sub:'Subtracting decimals',xs:[oD(a),oD(b)],sy:['-'],dec:true};},
 h_dmul(R){return{sub:'Multiplying decimals',xs:[oD(dRand(R,1,R.pick([9,99]),R.pick([2,3]))),oD(dRand(R,1,R.pick([9,30]),R.pick([1,2])))],sy:['x'],dec:true};},
 h_ddiv(R){const dv=R.int(11,48);const q=dRand(R,0,R.pick([9,30]),3);const a=decS(fm(decF(q),F(dv)));return{sub:'Dividing decimals',xs:[oD(a),oD(String(dv))],sy:['/'],dec:true};},
 h_ddivdec(R){const dvs=dRand(R,0,R.pick([3,9]),R.pick([2,3]));const q=dRand(R,2,R.pick([90,300]),R.pick([0,1]));const a=decS(fm(decF(q),decF(dvs)));if(decPlaces(decF(a))>5)return null;return{sub:'Dividing decimals',xs:[oD(a),oD(dvs)],sy:['/'],dec:true};},
 x_forder(R){const sy=R.pick([['+','x'],['-','x'],['+','/'],['-','/'],['x','+'],['/','-']]);const xs=[fOp(R,DX,0.5,9),fOp(R,DX,0.4,4),fOp(R,DX,0.3,3)];if(!lcdOk(xs,96))return null;return{sub:'Order of operations (fractions)',xs,sy};},
 x_fchain(R){const sy=R.pick([['x','/'],['/','x'],['x','x'],['/','/']]);const xs=[fOp(R,DX,0.5,6),fOp(R,DX,0.4,4),fOp(R,DX,0.3,3)];return{sub:'Multiplying and dividing fractions',xs,sy};},
 x_dorder(R){const sy=R.pick([['+','x'],['-','x'],['x','+'],['x','-']]);const xs=sy[0]==='x'?[oD(dRand(R,1,30,R.pick([1,2]))),oD(dRand(R,1,9,1)),oD(dRand(R,1,60,R.pick([1,2])))]:[oD(dRand(R,20,90,R.pick([1,2]))),oD(dRand(R,1,9,R.pick([1,2]))),oD(dRand(R,1,9,1))];
   return{sub:'Order of operations (decimals)',xs,sy,dec:true};},
 x_dchain(R){const a=dRand(R,1,40,R.pick([1,2])),b=dRand(R,1,9,1);const c=R.pick(['2','4','5','8','.5','.25','1.5','2.5','.8']);return{sub:'Multiplying and dividing decimals',xs:[oD(a),oD(b),oD(c)],sy:['x','/'],dec:true};},
 x_fd(R){const f=R.pick([[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,8],[3,8],[5,8],[7,8]]);const fo=oF(P(f[0],f[1]));const dd=oD(dRand(R,1,99,R.pick([1,2])));const k=R.int(0,2);
   return{sub:'Fractions with decimals',xs:k===0?[fo,dd]:k===1?[dd,fo]:[dd,fo],sy:k===2?['/']:['x'],dec:true};},
};
const NC_PLAN_H=['h_fadd3','h_fsub','h_fmix','h_fmul','h_fdiv','h_fdiv','h_dadd','h_dsub','h_dmul','h_dmul','h_ddiv','h_ddivdec','h_ddivdec'];
const NC_PLAN_X=['x_forder','x_forder','x_fchain','x_fchain','x_dorder','x_dorder','x_dchain','x_fd','x_fd','h_fadd3','h_fsub','h_fmul','h_fdiv','h_dmul','h_ddivdec'];
function genCompX(seed,t,pos){const R=RNG(seed);
  for(let att=0;att<600;att++){let g=null;try{g=NCX[t](R);if(g)g=exprItem(g);}catch(e){g=null;}if(!g)continue;
    return pack({type:'gnc',sub:g.sub,stem:`Work out: ${g.exprT}`,stemH:'Work out the answer.',fig:blk(g.exprH),ans:g.ans,wrong:g.wrong,pos,explain:g.exH.replace(/<[^>]+>/g,' '),explainH:g.exH,params:{t,e:g.exprT}});}
  throw new Error('compx '+t);}

/* reasoning, harder rules */
function predictionsX(s){const out=predictions(s);const n=s.length,d=s.slice(1).map((x,i)=>x-s[i]);
  if(d.length>=3&&d.every(x=>x!==0)){const r=d.slice(1).map((x,i)=>x/d[i]);if(r.every(x=>Math.abs(x-r[0])<1e-12))out.push(s[n-1]+d[d.length-1]*r[0]);}
  if(n>=6){const ev=s.filter((_,i)=>i%2===0),od=s.filter((_,i)=>i%2===1);const nx=n%2===0?ev:od,ot=n%2===0?od:ev;
    const fit=a=>{const r=[];const dd=a.slice(1).map((x,i)=>x-a[i]);if(dd.length>=2&&dd.every(x=>x===dd[0]))r.push(a[a.length-1]+dd[0]);if(a.every(x=>x)){const rr=a.slice(1).map((x,i)=>x/a[i]);if(rr.length>=2&&rr.every(x=>Math.abs(x-rr[0])<1e-12))r.push(a[a.length-1]*rr[0]);}return r;};
    if(nx.length>=3&&ot.length>=3&&fit(ot).length)out.push(...fit(nx));}
  return out;}
const sgn=x=>(x>0?'+':'−')+Math.abs(x);
const NRX={
 h_arith(R){const d=R.int(7,25)*(R.chance(0.5)?-1:1),len=R.int(5,6);const a=d<0?R.int(-d*len+10,-d*len+150):R.int(20,200);const s=[];for(let i=0;i<len;i++)s.push(a+i*d);const nx=a+len*d,l=s[len-1];
   return{sub:'Series: add or subtract',s,nx,why:`${d>0?'Add':'Subtract'} ${Math.abs(d)} each time.`,ops:s.slice(1).map(()=>sgn(d)),wrong:[{v:l+2*d,note:'Skipped a step: that is two terms ahead.'},{v:l-d,note:'Went the wrong direction.'},{v:nx+10,note:SLIP},{v:nx-10,note:SLIP},{v:nx+1,note:SLIP}]};},
 h_geo(R){const r=R.int(2,6),a=R.int(2,9),len=4;const s=[];for(let i=0;i<len;i++)s.push(a*r**i);const l=s[len-1],nx=l*r;if(nx>99999)return null;
   return{sub:'Series: multiply or divide',s,nx,why:`Multiply by ${r} each time.`,ops:s.slice(1).map(()=>'×'+r),wrong:[{v:l+(l-s[len-2]),note:'Added the last gap again. The gaps grow, because each number is multiplied.'},{v:l*(r+1),note:`Multiplied by ${r+1} instead of ${r}.`},{v:l*(r-1),note:`Multiplied by ${r-1} instead of ${r}.`},{v:nx+a,note:SLIP},{v:nx-a,note:SLIP}]};},
 h_div(R){const r=R.int(2,6),len=R.int(4,5),e=R.int(2,9);const s=[];for(let i=len;i>=1;i--)s.push(e*r**i);if(s[0]>99999)return null;const nx=e,l=s[len-1];
   return{sub:'Series: multiply or divide',s,nx,why:`Divide by ${r} each time.`,ops:s.slice(1).map(()=>'÷'+r),wrong:[{v:l-(s[len-2]-l),note:'Subtracted the last gap again. The gaps shrink, because each number is divided.'},{v:l*r,note:'Multiplied instead of dividing.'},{v:l-r,note:`Subtracted ${r} instead of dividing by it.`},{v:nx+1,note:SLIP},{v:nx*2,note:SLIP}]};},
 h_growdiff(R){const d0=R.int(2,9),dd=R.int(2,6),down=R.chance(0.4),len=6;const a=down?R.int(150,300):R.int(3,40);const s=[a];let d=d0;for(let i=1;i<len;i++){s.push(s[i-1]+(down?-d:d));d+=dd;}const nx=s[len-1]+(down?-d:d);
   if(s.some(x=>x<1)||nx<1)return null;const ds=s.slice(1).map((x,i)=>x-s[i]),l=s[len-1],last=ds[ds.length-1];
   return{sub:'Series: growing steps',s,nx,why:`The steps ${down?'subtracted ':''}grow by ${dd}: ${ds.map(Math.abs).join(', ')}, so next is ${Math.abs(nx-l)}.`,ops:ds.map(sgn),wrong:[{v:l+last,note:'Repeated the last step. The steps keep growing.'},{v:l+last+(down?-2*dd:2*dd),note:`The steps grow by ${dd}, not ${2*dd}.`},{v:l+last+(down?-1:1),note:`The steps grow by ${dd}, not 1.`},{v:nx+dd,note:SLIP},{v:nx-dd,note:SLIP}]};},
 h_interleave(R){const len=R.pick([7,8]);const da=R.int(3,12)*(R.chance(0.4)?-1:1),db=R.int(2,15)*(R.chance(0.4)?-1:1);if(da===db)return null;const a=R.int(10,60)+(da<0?60:0),b=R.int(10,60)+(db<0?60:0);
   const s=[];for(let i=0;i<len;i++)s.push(i%2===0?a+(i/2)*da:b+((i-1)/2)*db);if(s.some(x=>x<1))return null;const A=s.filter((_,i)=>i%2===0),B=s.filter((_,i)=>i%2===1);
   const mine=len%2===0?A:B,step=len%2===0?da:db,other=len%2===0?B:A,ostep=len%2===0?db:da;const nx=mine[mine.length-1]+step,l=s[len-1];
   return{sub:'Series: two series mixed',s,nx,why:`Two series take turns. The next number continues ${mine.join(', ')} (${sgn(step)} each time), so it is ${nx}. The other series: ${other.join(', ')} (${sgn(ostep)}).`,ops:null,
     wrong:[{v:l+ostep,note:'Continued the wrong series. Count which series the next number belongs to.'},{v:nx+step,note:'Skipped a step in the series.'},{v:l+(l-s[len-2]),note:'Repeated the last jump, but the numbers take turns between two series.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
 h_alt2(R){const combos=[['+','-'],['x','-'],['x','+'],['+','/'],['-','/'],['x','/'],['/','+'],['/','x'],['-','x']];const [o1,o2]=R.pick(combos);const big=o=>o==='x'||o==='/';const k1=big(o1)?R.int(2,5):R.int(3,19),k2=big(o2)?R.int(2,5):R.int(3,19);
   if(!big(o1)&&!big(o2)&&k1===k2)return null;if(o1==='x'&&o2==='/'&&k1===k2||o1==='/'&&o2==='x'&&k1===k2)return null;
   const ap=(x,o,k)=>o==='+'?x+k:o==='-'?x-k:o==='x'?x*k:x/k;const a=R.int(2,120);const s=[a];for(let i=1;i<7;i++)s.push(ap(s[i-1],i%2?o1:o2,i%2?k1:k2));
   if(s.some(x=>x<1||x!==Math.floor(x)||x>9999))return null;const nx=ap(s[6],o1,k1);if(nx<1||nx!==Math.floor(nx))return null;const nm={'+':'add','-':'subtract','x':'multiply by','/':'divide by'};const sy={'+':'+','-':'−','x':'×','/':'÷'};
   const l=s[6];return{sub:'Series: two-step pattern',s,nx,why:`Two steps take turns: ${nm[o1]} ${k1}, then ${nm[o2]} ${k2}. The next step is ${nm[o1]} ${k1}.`,ops:s.slice(1).map((_,i)=>i%2===0?sy[o1]+k1:sy[o2]+k2),
     wrong:[{v:ap(l,o2,k2),note:`Used the wrong step: after ${sy[o2]}${k2} comes ${sy[o1]}${k1}.`},{v:l+(l-s[5]),note:'Repeated the last change. The steps take turns.'},{v:ap(nx,o2,k2),note:'Went one step too far.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
 h_cycle3(R){const a=R.int(2,15),b=R.int(2,15),c=R.int(2,15);const ops=R.pick([[a,-b,c],[-a,b,-c],[a,b,-c],[-a,-b,c]]);const net=ops[0]+ops[1]+ops[2];if(!net||new Set(ops).size<3)return null;
   const st=R.int(20,90);const s=[st];for(let i=1;i<7;i++)s.push(s[i-1]+ops[(i-1)%3]);if(s.some(x=>x<1))return null;const nx=s[6]+ops[0],l=s[6];
   return{sub:'Series: three-step pattern',s,nx,why:`Three steps repeat: ${ops.map(sgn).join(', ')}. The next step is ${sgn(ops[0])}.`,ops:s.slice(1).map((_,i)=>sgn(ops[i%3])),
     wrong:[{v:l+ops[1],note:`Used the wrong step: the pattern starts again with ${sgn(ops[0])}.`},{v:l+ops[2],note:'That is the third step of the pattern; it starts again here.'},{v:l+(l-s[5]),note:'Repeated the last change.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
 x_stepratio(R){const r=R.pick([2,2,3]),d0=R.int(1,r===3?3:5),len=R.int(5,6),down=R.chance(0.3);const tot=d0*(r**(len-1)-1)/(r-1)+d0*r**(len-1);const a=down?R.int(tot+5,tot+80):R.int(1,30);const s=[a];let d=d0;for(let i=1;i<len;i++){s.push(s[i-1]+(down?-d:d));d*=r;}
   const nx=s[len-1]+(down?-d:d);if(nx<1||s.some(x=>x<1)||nx>9999)return null;const ds=s.slice(1).map((x,i)=>x-s[i]),l=s[len-1],last=ds[ds.length-1];
   return{sub:'Series: steps that multiply',s,nx,why:`Each step is ${r} times the one before: ${ds.map(Math.abs).join(', ')}, so next is ${Math.abs(nx-l)}.`,ops:ds.map(sgn),
     wrong:[{v:l+last,note:'Repeated the last step. Each step is multiplied.'},{v:l+(down?-1:1)*(Math.abs(last)+Math.abs(last-ds[ds.length-2])),note:'Made the steps grow by the same amount each time. They multiply.'},{v:l*r,note:'Multiplied the last number instead of the last step.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
 x_cycle3mul(R){const m=R.pick([2,3]),k1=R.int(1,9),k2=R.int(1,15);const pats=[[['+',k1],['x',m],['-',k2]],[['x',m],['-',k2],['+',k1]],[['-',k1],['x',m],['+',k2]],[['x',m],['+',k1],['-',k2]]];const ops=R.pick(pats);
   const ap=(x,[o,k])=>o==='+'?x+k:o==='-'?x-k:x*k;const st=R.int(1,12);const s=[st];for(let i=1;i<7;i++)s.push(ap(s[i-1],ops[(i-1)%3]));if(s.some(x=>x<1||x>9999))return null;const nx=ap(s[6],ops[0]),l=s[6];if(nx<1)return null;
   const f=([o,k])=>({'+':'+','-':'−','x':'×'}[o])+k;
   return{sub:'Series: three-step pattern',s,nx,why:`Three steps repeat: ${ops.map(f).join(', ')}. The next step is ${f(ops[0])}.`,ops:s.slice(1).map((_,i)=>f(ops[i%3])),
     wrong:[{v:ap(l,ops[1]),note:`Used the wrong step: the pattern starts again with ${f(ops[0])}.`},{v:ap(l,ops[2]),note:'That is the third step of the pattern; it starts again here.'},{v:l+(l-s[5]),note:'Repeated the last change.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
 x_interleave_geo(R){const len=R.pick([7,8]);const r=R.pick([2,3]),k=R.int(2,12)*(R.chance(0.3)?-1:1);const g0=R.int(1,r===2?6:3),b0=R.int(5,40)+(k<0?50:0);const geoFirst=R.chance(0.5);
   const s=[];let g=g0,b=b0;for(let i=0;i<len;i++){const geoTurn=(i%2===0)===geoFirst;if(geoTurn){s.push(g);g*=r;}else{s.push(b);b+=k;}}if(s.some(x=>x<1||x>9999))return null;
   const nextGeo=(len%2===0)===geoFirst;const nx=nextGeo?g:b;const G=s.filter((_,i)=>(i%2===0)===geoFirst),B=s.filter((_,i)=>(i%2===0)!==geoFirst);const l=s[len-1];
   return{sub:'Series: two series mixed',s,nx,why:`Two series take turns: ${G.join(', ')} (×${r} each time) and ${B.join(', ')} (${sgn(k)} each time). The next number continues the ${nextGeo?'×'+r:sgn(k)} series: ${nx}.`,ops:null,
     wrong:[{v:nextGeo?b:g,note:'Continued the wrong series. Count which series the next number belongs to.'},{v:nextGeo?G[G.length-1]+(G[G.length-1]-G[G.length-2]):nx+k,note:nextGeo?'That series multiplies; it doesn’t add the same amount.':'Skipped a step in the series.'},{v:l+(l-s[len-2]),note:'Repeated the last jump, but the numbers take turns between two series.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
 x_fib(R){const a=R.int(1,9),b=R.int(a+1,a+12),len=R.int(6,7);const s=[a,b];while(s.length<len)s.push(s[s.length-1]+s[s.length-2]);const nx=s[len-1]+s[len-2],l=s[len-1];if(nx>9999)return null;
   return{sub:'Series: add the two before',s,nx,why:`Each number is the sum of the two before it: ${s[len-2]} + ${l} = ${nx}.`,ops:null,
     wrong:[{v:l+(l-s[len-2]),note:'Added the last gap again. Each number is the sum of the two before it.'},{v:l*2,note:'Doubled the last number.'},{v:l+s[len-3],note:'Added the wrong pair: use the last two numbers.'},{v:nx+1,note:SLIP},{v:nx-1,note:SLIP}]};},
 x_squares(R){const m=R.pick([1,1,2,3]),st=R.int(1,6),c=R.int(-5,9),len=5;const s=[];for(let i=0;i<len;i++)s.push(m*(st+i)**2+c);if(s.some(x=>x<1))return null;const nx=m*(st+len)**2+c,l=s[len-1];const ds=s.slice(1).map((x,i)=>x-s[i]);
   return{sub:'Series: growing steps',s,nx,why:`The steps grow by ${2*m}: ${ds.join(', ')}, so next is ${nx-l}.`,ops:ds.map(sgn),wrong:[{v:l+ds[ds.length-1],note:'Repeated the last step. The steps keep growing.'},{v:l+ds[ds.length-1]+4*m,note:`The steps grow by ${2*m}, not ${4*m}.`},{v:nx+2*m,note:SLIP},{v:nx-1,note:SLIP},{v:nx+1,note:SLIP}]};},
};
const NR_PLAN_H=['h_arith','h_geo','h_div','h_growdiff','h_growdiff','h_interleave','h_interleave','h_alt2','h_alt2','h_alt2','h_cycle3'];
const NR_PLAN_X=['h_growdiff','h_interleave','h_alt2','h_cycle3','x_stepratio','x_stepratio','x_cycle3mul','x_cycle3mul','x_interleave_geo','x_interleave_geo','x_fib','x_squares','h_alt2'];
function genReasonX(seed,t,pos){const R=RNG(seed);
  for(let att=0;att<800;att++){let g=null;try{g=NRX[t](R);}catch(e){g=null;}if(!g)continue;
    if(g.s.some(x=>x!==Math.floor(x))||g.s.every((x,i)=>i<2||x===g.s[i-2]))continue;const pr=predictionsX(g.s);if(!pr.some(p=>p===g.nx))continue;if(pr.some(p=>Math.abs(p-g.nx)>1e-9&&p===Math.floor(p)&&p>0))continue;
    const seen=new Set([g.nx]);const wrong=[];for(const w of g.wrong){const v=w.v;if(!(v>0)||v!==Math.floor(v)||seen.has(v)||pr.includes(v))continue;seen.add(v);wrong.push({t:String(v),h:String(v),key:String(v),note:w.note});if(wrong.length===4)break;}
    for(const v of [g.nx+2,g.nx-2,g.nx+3,g.nx+5,g.nx-3,g.nx+10]){if(wrong.length===4)break;if(v>0&&!seen.has(v)){seen.add(v);wrong.push({t:String(v),h:String(v),key:String(v),note:SLIP});}}
    if(wrong.length<4)continue;
    const steps=g.ops?`<p class="wds">${g.s.map((x,i)=>i?`<span class="muted">${g.ops[i-1]}</span> ${x}`:x).join(' ')} <span class="muted">→</span> <b>${g.nx}</b></p>`:'';
    return pack({type:'gnr',sub:g.sub,stem:`What number comes next? ${g.s.join(', ')}, ?`,stemH:'What number comes next in the series?',fig:blk(`<span class="series">${g.s.join('&ensp;')}&ensp;<b>?</b></span>`),
      ans:{t:String(g.nx),h:String(g.nx),key:String(g.nx)},wrong,pos,explain:g.why+' The answer is '+g.nx+'.',explainH:esc(g.why)+' The answer is '+g.nx+'.'+steps,params:{t,s:g.s}});}
  throw new Error('reasonx '+t);}

/* a section: types cycle through the plan, correct letters spread evenly over A-E.
   level 'std' is the test-like mix (unchanged); 'hard' and 'expert' use the plans above. */
function build(code,sec,n,level){level=level==='hard'||level==='expert'?level:'std';const L=level==='std'?'':level;
  const R=RNG(L?hashSeed('ganmath',sec,code,L):hashSeed('ganmath',sec,code));
  const plan=sec==='ncomp'?(L==='hard'?NC_PLAN_H:L==='expert'?NC_PLAN_X:NC_PLAN):(L==='hard'?NR_PLAN_H:L==='expert'?NR_PLAN_X:NR_PLAN);
  const types=[];while(types.length<n)R.shuffle(plan).forEach(t=>{if(types.length<n)types.push(t);});
  const pos=[];while(pos.length<n)R.shuffle([0,1,2,3,4]).forEach(p=>pos.push(p));const P2=R.shuffle(pos.slice(0,n));
  const gen=t=>sec==='ncomp'?(NCX[t]?genCompX:genComp):(NRX[t]?genReasonX:genReason);
  const seen=new Set();return types.map((t,i)=>{let it,salt=0;do{it=gen(t)(L?hashSeed(code,sec,L,t,i,salt++):hashSeed(code,sec,t,i,salt++),t,P2[i]);}while(seen.has(JSON.stringify(it.params))&&salt<40);
    seen.add(JSON.stringify(it.params));it.id=(sec==='ncomp'?'NC':'NR')+(i+1);it.sec=sec;it.level=level;return it;});}
/* one question for Meltdown: computation or reasoning at a level picked from the Meltdown level */
function one(seed,mlevel){const R=RNG(seed);const level=mlevel<=3?'std':mlevel<=6?'hard':'expert';const sec=R.chance(0.6)?'ncomp':'nreason';
  const plan=sec==='ncomp'?(level==='hard'?NC_PLAN_H:level==='expert'?NC_PLAN_X:NC_PLAN):(level==='hard'?NR_PLAN_H:level==='expert'?NR_PLAN_X:NR_PLAN);const t=R.pick(plan);const pos=R.int(0,4);
  const it=(sec==='ncomp'?(NCX[t]?genCompX:genComp):(NRX[t]?genReasonX:genReason))(hashSeed(seed,'gm',t),t,pos);it.sec=sec;it.level=level;return it;}

/* ================= Study guide: the JumpStart Math guide's own practice problems =================
   Printed exactly (choices in the printed order). The guide has no answer key: the answers below were
   worked out by hand and are re-solved by verify_ganmath.py from what is shown. */
const JS_NC=[['2/5 + 1/5',['3/10','4/5','3/5','1/10','1/5'],2],['.3 + .4 + .7',['1.4','14','1.7','.15','0'],0],['.9 − .2',['.1','.7','7.8','.6','.11'],1],
 ['1/3 + 5/6',['4/3','4/6','6/18','7/18','1 1/6'],4],['1/5 + 2/7',['17/35','3/12','2/12','3/35','3/7'],0],['5/8 − 3/8',['8/8','2/16','1/8','3/4','1/4'],4],
 ['6.34 × 9',['5.706','57.07','5.77','57.06','50.6'],3],['4.912 ÷ 16',['3.07','3.08','0','30.7','.307'],4],['25/37 − 13/37',['12/35','12/37','12/25','38/37','3/7'],1],
 ['5.3 + 70.6',['7.59','75.9','759','.759','7'],1],['9 ÷ 1 1/4',['7 2/5','7 1/5','6 3/5','7 5/36','9/50'],1],['1.65 − 1.49',['16','1.06','.15','0.16','.11'],3],
 ['5 − 3 1/7',['2 6/7','17/7','1 6/7','1 5/7','2 13/14'],2],['5 × 4/5',['5 4/5','4','5 5/20','20 1/5','5 1/5'],1],['81.6 × .7',['571.2','57.23','5.712','57.12','57'],3],
 ['2/7 × 4/3',['6/28','3/14','8/21','6/21','6/10'],2],['8.00 − 1.35',['6.75','7.65','7.35','6.5','6.65'],4],['2.772 ÷ 7',['.396','.0025','3.96','.296','0'],0],
 ['11/12 × 1 1/2',['1 9/24','1 3/8','11/36','2 1/8','2 3/8'],1],['.70 − .25',['.55','.45','5.5','4.5','5'],1],['29.4 × 1.4',['41.16','30.576','4.116','3.57','28'],0],
 ['9/10 ÷ 1/5',['4 1/2','9/2','5 1/2','7 1/15','9/50'],0],['.65 + 4.2 + 3.85',['8.7','8.52','8.2','14.55','8.8'],0],['1/4 ÷ 7',['7/4','5/21','7 3/4','7 1/4','1/28'],4],
 ['.2 + .002 + 2',['22.2','22.02','.22','2.202','2'],3],['34.6 × 15',['51.9','5.19','519','1076','4'],2]];
const JS_TYPES=[['A proper fraction',['53/8','7/8','7/5','16/16'],1,'A proper fraction has a top smaller than its bottom and can’t be reduced: @7/8@. (@53/8@ and @7/5@ are improper; @16/16@ is 1.)'],
 ['An improper fraction',['7 1/2','8/5','5 2/3','6/9'],1,'An improper fraction has a top bigger than its bottom: @8/5@. (@7 1/2@ and @5 2/3@ are mixed numbers; @6/9@ is proper but not reduced.)'],
 ['A mixed number',['13 4/5','35/67','7/16','7/7'],0,'A mixed number is a whole number together with a fraction: @13 4/5@.'],
 ['An unreduced fraction',['4/8','1/3','13/14','5 1/2'],0,'@4/8@ can be reduced to @1/2@, so it is unreduced. @1/3@ and @13/14@ are already in lowest terms.']];
const JS_NR=[['1','5 10 20 40',['100','60','80','120','30'],2,'Each number is 2 times the one before: 40 × 2 = 80.'],
 ['1','5 8 6 9 7 10',['8','13','7','14','23'],0,'Two series take turns: 5, 6, 7, … and 8, 9, 10. The next number continues 5, 6, 7: it is 8.'],
 ['1','74 70 66 62 58',['56','64','52','50','54'],4,'Subtract 4 each time: 58 − 4 = 54.'],
 ['1','2 4 8 14 22',['44','32','30','28','34'],1,'The steps grow by 2: +2, +4, +6, +8, so the next step is +10: 22 + 10 = 32.'],
 ['1','243 81 27 9',['28','4','18','3','54'],3,'Divide by 3 each time: 9 ÷ 3 = 3.'],
 ['1','1 5 2 6 3 7',['21','6','4','18','10'],2,'Two series take turns: 1, 2, 3, … and 5, 6, 7. The next number continues 1, 2, 3: it is 4.'],
 ['1','1 4 16 64 256',['20','48','192','1024','16384'],3,'Multiply by 4 each time: 256 × 4 = 1024.'],
 ['2','22 20 23 21 24 22 25',['21','23','25','27','28'],1,'Subtract 2, then add 3, and repeat: 25 − 2 = 23.'],
 ['2','68 72 36 40 20 24 12',['6','16','20','24','28'],1,'Add 4, then divide by 2, and repeat: 12 + 4 = 16.'],
 ['2','16 18 21 14 16 19 12',['5','8','9','13','14'],4,'Three steps repeat: +2, +3, −7. Next is +2: 12 + 2 = 14.'],
 ['2','8 24 12 36 18 54 27',['13','18','54','69','81'],4,'Multiply by 3, then divide by 2, and repeat: 27 × 3 = 81.'],
 ['2','24 48 12 24 6 12 3',['6','12','18','24','48'],0,'Multiply by 2, then divide by 4, and repeat: 3 × 2 = 6.'],
 ['2','12 10 8 16 14 12 20',['12','14','16','18','22'],3,'Three steps repeat: −2, −2, +8. Next is −2: 20 − 2 = 18.'],
 ['2','13 4 14 5 15 6 16',['6','7','8','17','18'],1,'Two series take turns: 13, 14, 15, 16 and 4, 5, 6. The next number continues 4, 5, 6: it is 7.'],
 ['2','82 73 64 55 46 37 28',['14','18','19','20','27'],2,'Subtract 9 each time: 28 − 9 = 19.'],
 ['2','78 76 38 36 18 16 8',['3','4','5','6','7'],3,'Subtract 2, then divide by 2, and repeat: 8 − 2 = 6.'],
 ['2','17 19 16 20 15 21 14',['18','19','20','21','22'],4,'Two series take turns: 17, 16, 15, 14 (down 1) and 19, 20, 21 (up 1). The next number continues 19, 20, 21: it is 22.']];
/* the guide's notation -> stacked fractions: "1 1/4" mixed, "3/8" fraction, ".307" decimal */
const JTOK=/(\d+) (\d+)\/(\d+)|(\d+)\/(\d+)|(\d*\.\d+|\d+)|([+−×÷()])/g;
function jsParse(s){const out=[];let m;JTOK.lastIndex=0;while((m=JTOK.exec(s))){if(m[1])out.push({k:'f',o:Mx(+m[1],+m[2],+m[3])});else if(m[4])out.push({k:'f',o:P(+m[4],+m[5])});else if(m[6])out.push(m[6].includes('.')?{k:'d',s:m[6]}:{k:'f',o:W(+m[6])});else out.push({op:m[7]});}return out;}
const jsH=s=>jsParse(s).map(t=>t.op?(t.op==='('?' (':t.op===')'?')':` ${t.op} `):oH(t)).join('').replace(/\(\s+/g,'(').replace(/\s+\)/g,')').replace(/\s+/g,' ').trim();
const jsT=s=>s.replace(/−/g,'-');
function sgItems(code,counts){const R=RNG(hashSeed('sgganm',code||'x'));counts=counts||{};const L='ABCDE';const lab=t=>`<span class="muted" style="font-size:14px">${t}</span><br>`;
  const nc=JS_NC.map((q,i)=>{const tk=jsParse(q[0]);const xs=tk.filter(t=>!t.op),sy=tk.filter(t=>t.op).map(t=>({'+':'+','−':'-','×':'x','÷':'/'}[t.op]));const dec=xs.some(x=>x.k==='d');
      const ans=evalOps(xs.map(oV),sy);const steps=(dec?[]:stepsH(xs,sy,false));const ch=q[1].map((c,j)=>({t:jsT(c),h:jsH(c),key:j,note:null}));
      const same=q[1].map((c,j)=>j!==q[2]&&feq(evalOps(jsParse(c).filter(t=>!t.op).map(oV),[]),ans)?j:-1).filter(j=>j>=0);
      same.forEach(j=>{ch[j].note=`Same amount as the answer, but ${/ /.test(q[1][j])?'not reduced to lowest terms':'left as an improper fraction'}. The guide reduces every answer and writes improper fractions as mixed numbers, so ${L[q[2]]} is the answer to mark.`;});
      const work=dec?`${q[0].includes('+')||q[0].includes('−')?'Line up the decimal points':q[0].includes('×')?'Multiply, then count the decimal places in both numbers':'Divide and bring the point straight up (move both points right first if you divide by a decimal)'}: ${jsH(q[0])} = ${ch[q[2]].h}.`
        :`${tk.some(t=>t.k==='f'&&t.o.w&&t.o.n)?'Change mixed numbers to improper fractions. ':''}${steps.join('; ')}.`;
      return{type:'gsgnc',skill:'Math',sub:'Study guide computation',diff:0,stem:`JumpStart Math · Numerical Computation practice Q${i+1}: ${jsT(q[0])} =`,stemH:lab(`JumpStart Math · Numerical Computation practice · Q${i+1}`)+'Work out the answer.',svg:blk(jsH(q[0])+' ='),grid:false,
        choices:ch,correct:q[2],explain:'The answer is '+L[q[2]]+'.',explainH:work+` The answer is ${L[q[2]]}.`,params:{sg:'nc'+(i+1)},id:'SGNC'+(i+1)};});
  const ty=JS_TYPES.map((q,i)=>({type:'gsgtype',skill:'Math',sub:'Study guide types of fractions',diff:0,stem:`JumpStart Math · Types of fractions Q${i+1}: ${q[0]}`,stemH:lab(`JumpStart Math · Types of fractions · Q${i+1}`)+`Which one is <b>${q[0].toLowerCase()}</b>?`,svg:'',grid:false,
    choices:q[1].map((c,j)=>({t:c,h:jsH(c),key:j,note:null})),correct:q[2],explain:q[3].replace(/@/g,''),explainH:q[3].replace(/@([^@]+)@/g,(_,x)=>jsH(x)),params:{sg:'ty'+(i+1),ask:q[0]},id:'SGTY'+(i+1)}));
  const nr=JS_NR.map((q,i)=>{const n=i<7?i+1:i-6;const s=q[1].split(' ');return{type:'gsgnr',skill:'Math',sub:'Study guide number series',diff:0,stem:`JumpStart Math · Numerical Reasoning Practice Test ${q[0]} Q${n}: ${s.join(', ')}, ?`,
    stemH:lab(`JumpStart Math · Numerical Reasoning Practice Test ${q[0]} · Q${n}`)+'What number comes next in the series?',svg:blk(`<span class="series">${s.join('&ensp;')}&ensp;<b>?</b></span>`),grid:false,
    choices:q[2].map((c,j)=>({t:c,h:c,key:j,note:null})),correct:q[3],explain:q[4],explainH:esc(q[4]),params:{sg:'nr'+q[0]+'-'+n},id:'SGNR'+(i+1)};});
  const take=(arr,k)=>R.shuffle(arr).slice(0,Math.max(1,Math.min(arr.length,k||arr.length)));
  return{sgncomp:take(nc.concat(ty),counts.ncomp||30),sgnreason:take(nr,counts.nreason||20)};}
/* ================= JumpStart Math answer key =================
   The guide's practice drills, handouts and word problems have no answers printed. Answers worked out by
   hand; verify_ganmath.py re-solves every one from the problem as typed here.
   Each row: [number, problem in the guide's notation, answer, words (word problems), check]
   check: '' = value in lowest terms (mixed number if over 1), 'lcd' = lowest common denominator,
   'd12' = same value written over 12, 'whole' = how many whole ones fit. */
const JS_KEY=[
 ['Reducing fractions','14',[[1,'3/9','1/3'],[2,'4/8','1/2'],[3,'6/12','1/2'],[4,'4/2','2'],[5,'9/12','3/4'],[6,'6/10','3/5'],[7,'5/10','1/2'],[8,'12/14','6/7'],[9,'8/12','2/3'],[10,'20/30','2/3']]],
 ['Finding a lowest common denominator','16',[[1,'4/5 + 9/10','10',0,'lcd'],[2,'1/6 + 5/8 − 4/7','168',0,'lcd'],[3,'1/3 − 5/7','21',0,'lcd'],[4,'4/9 − 5/6 + 1/4','36',0,'lcd'],[5,'3/16 + 5/8 + 1/2','16',0,'lcd']]],
 ['Improper fractions to whole or mixed numbers','17',[[1,'28/8','3 1/2'],[2,'14/3','4 2/3'],[3,'53/20','2 13/20'],[4,'9/9','1'],[5,'16/6','2 2/3']]],
 ['Mixed numbers to improper fractions','18',[[1,'5 2/11','57/11',0,'imp'],[2,'7 5/12','89/12',0,'imp'],[3,'4 3/7','31/7',0,'imp'],[4,'10 2/3','32/3',0,'imp'],[5,'9 7/8','79/8',0,'imp']]],
 ['Adding fractions with the same denominator','19',[[1,'2/7 + 1/7','3/7'],[2,'1/3 + 1/3','2/3'],[3,'4/14 + 2/14','3/7'],[4,'2/9 + 4/9','2/3'],[5,'3/13 + 8/13','11/13']]],
 ['Adding fractions with different denominators','20',[[1,'3/5 + 8/15 + 2/3','1 4/5'],[2,'3/5 + 1/2 + 7/10','1 4/5'],[3,'6 5/48 + 2 5/8','8 35/48'],[4,'5/9 + 11/36','31/36'],[5,'5/8 + 7/32 + 9/16','1 13/32']]],
 ['Subtracting fractions','21',[[1,'2/3 − 1/4','5/12'],[2,'9/16 − 1/4','5/16'],[3,'7/8 − 5/6','1/24'],[4,'8 5/9 − 3 1/6','5 7/18'],[5,'2/3 − 2/9','4/9']]],
 ['Borrowing and subtracting fractions','22',[[1,'7 − 5/8','6 3/8'],[2,'14 − 4 3/5','9 2/5'],[3,'10 − 7/9','9 2/9'],[4,'3 − 3/4','2 1/4'],[5,'2 − 1/4','1 3/4']]],
 ['Multiplying fractions with fractions','23',[[1,'2/3 × 1/4','1/6'],[2,'1/3 × 1/5','1/15'],[3,'1/2 × 1/4 × 3/5','3/40'],[4,'1/5 × 6/7','6/35'],[5,'1/2 × 3/4','3/8']]],
 ['Multiplying whole numbers and fractions','24',[[1,'2/9 × 4','8/9'],[2,'5 × 2/3','3 1/3'],[3,'1/4 × 5','1 1/4'],[4,'2/7 × 6','1 5/7'],[5,'8 × 2/5','3 1/5']]],
 ['Multiplying mixed numbers and fractions','25',[[1,'3/4 × 5 1/2','4 1/8'],[2,'5/7 × 2 2/3','1 19/21'],[3,'1 1/2 × 2 2/3','4'],[4,'4/5 × 2 1/3','1 13/15'],[5,'3 1/3 × 4/9','1 13/27']]],
 ['Dividing fractions','27',[[1,'1/2 ÷ 1/4','2'],[2,'2/3 ÷ 3','2/9'],[3,'1/6 ÷ 2','1/12'],[4,'1/4 ÷ 1/8','2'],[5,'1 3/4 ÷ 1/4','7']]],
 ['Adding decimals','28',[[1,'.3 + .07 + 5.3','5.67'],[2,'.75 + 7.50 + .075','8.325'],[3,'6.007 + 5.3 + .75','12.057'],[4,'3.5 + 75.39','78.89'],[5,'59 + 5.4 + .07','64.47']]],
 ['Subtracting decimals','29',[[1,'75 − 10.3','64.7'],[2,'4.507 − 3.6','.907'],[3,'100.73 − 47.4','53.33'],[4,'39.5 − 27.06','12.44'],[5,'97.03 − 36.05','60.98']]],
 ['Multiplying decimals','30',[[1,'73.5 × 6','441'],[2,'92.3 × 15.04','1388.192'],[3,'17.6 × 9.07','159.632'],[4,'10 × 2.5','25'],[5,'6.34 × 5.71','36.2014']]],
 ['Dividing decimals by whole numbers','31',[[1,'7.5 ÷ 3','2.5'],[2,'75.6 ÷ 45','1.68'],[3,'13.09 ÷ 7','1.87'],[4,'47.4 ÷ 6','7.9'],[5,'97.24 ÷ 2','48.62']]],
 ['Dividing decimals by decimals','32',[[1,'.36 ÷ .6','.6'],[2,'3.3 ÷ 1.2','2.75'],[3,'44.1 ÷ .7','63'],[4,'18.98 ÷ .26','73'],[5,'19.98 ÷ 5.4','3.7']]],
 ['Dividing whole numbers by decimals','33',[[1,'9 ÷ .6','15'],[2,'37 ÷ .25','148'],[3,'343 ÷ .7','490'],[4,'1178 ÷ .019','62000'],[5,'2592 ÷ .36','7200']]],
 ['Problem Solving: study suggestions and sample problems','',[
   ['Tip 2','8 + 6 + 8 + 6','28','Rope around an 8 ft by 6 ft work site: 28 ft (the 10 ft to the flag pole doesn’t matter).'],
   [1,'150 ÷ (6 × 5)','5','Cars per day: 150 cars over 6 weeks of 5 working days = 5 cars a day.'],
   [2,'1 + 3 + 3 × 4','16','Boxes altogether: 1 large + 3 smaller + 12 tiny = 16 boxes.'],
   [3,'10 × 80','800','Cards in the even-numbered drawers (2, 4, …, 20 is 10 drawers): 800 cards.'],
   [4,'3 ÷ 2 × 60','90','Miles per hour: 3 miles every 2 minutes, 60 minutes in an hour = 90 mph.'],
   [5,'460 − 460 × 1/2','230','Sale price after 50% off $460: $230.']]],
 ['Fractions Handout #1: equivalent with a denominator of 12','',[[1,'5/6','10/12',0,'d12'],[2,'3/4','9/12',0,'d12'],[3,'5/4','15/12',0,'d12'],[4,'56/84','8/12',0,'d12'],[5,'143/156','11/12',0,'d12']]],
 ['Fractions Handout #1: reduce, improper to mixed','',[[6,'36/20','1 4/5'],[7,'14/98','1/7'],[8,'105/30','3 1/2'],[9,'66/84','11/14'],[10,'102/114','17/19']]],
 ['Fractions Handout #1: multiply and reduce','',[[11,'3/5 × 4/7','12/35'],[12,'3/4 × 9','6 3/4'],[13,'2/3 × 4/5 × 1/3','8/45'],[14,'196/27 × 9/392','1/6'],[15,'3/5 × 15 × 8/9','8'],[16,'72/35 × 55/108 × 7/110','1/15'],
   [17,'5 1/8 × 2 2/3','13 2/3'],[18,'3 1/2 × 2 1/6','7 7/12'],[19,'2 1/2 × 3 1/3 × 1 1/2','12 1/2'],[20,'7/8 × 6 × 1 5/6','9 5/8']]],
 ['Fractions Handout #1: divide and reduce','',[[21,'1/3 ÷ 2','1/6'],[22,'8 ÷ 3/4','10 2/3'],[23,'3/5 ÷ 2','3/10'],[24,'25/46 ÷ 40/69','15/16'],[25,'28/125 ÷ 5/2','56/625'],[26,'30/27 ÷ 6','5/27'],
   [27,'1 4/5 ÷ 2 5/6','54/85'],[28,'12 ÷ 3 1/6','3 15/19'],[29,'12 6/7 ÷ 3','4 2/7'],[30,'7/8 ÷ (1 1/4 ÷ 4)','2 4/5']]],
 ['Fractions Handout #1: word problems','',[
   [31,'3/8 × 1/2','3/16','Vise jaws close in half a turn: @3/16@ inch.'],
   [32,'3 × 1 1/2','4 1/2','Three @1 1/2@ V cells in series: @4 1/2@ volts.'],
   [33,'4 3/4 × 1 1/2','7 1/8','Overtime paid at time and a half: @7 1/8@ hours.'],
   [34,'2/5 × 1/20','1/50','Kilowatts lost: @1/50@ kW.'],
   [35,'2/5 × 11/16','11/40','Acid in the battery: @11/40@ lb.'],
   [36,'6 × 4 1/4','25 1/2','BX cable needed: @25 1/2@ ft.'],
   [37,'16 ÷ 2/3','24','Pieces of pipe: 24.'],
   [38,'12 2/3 ÷ 1/4','50','Bags filled: 50 full bags, with @1/6@ lb of screws left over.','whole'],
   [39,'159 9/100 × 1/2','79 109/200','Half a gallon costs @79 109/200@ cents (about 79.5¢).'],
   [40,'3/8 ÷ 5/8','3/5','Quotient of @3/8@ and @5/8@: @3/5@.']]],
 ['Fractions Handout #2: add or subtract and reduce','',[[1,'3/6 + 1/6','2/3'],[2,'2/5 + 3/5','1'],[3,'5/8 − 3/8','1/4'],[4,'6/7 − 1/7','5/7'],[5,'1/4 + 2/4 + 3/4','1 1/2'],[6,'2/5 + 3/5 + 4/5','1 4/5'],[7,'7/9 − 4/9','1/3'],[8,'9/8 − 1/8','1'],[9,'3/20 + 1/20 + 4/20','2/5'],[10,'5/4 + 4/4 + 3/4','3']]],
 ['Fractions Handout #2: find the LCD, then add or subtract','',[[11,'1/8 + 3/4','7/8'],[12,'5/6 − 1/12','3/4'],[13,'2 + 1/3','2 1/3'],[14,'2 − 3/4','1 1/4'],[15,'2/3 + 3/4','1 5/12'],[16,'1/2 − 1/5','3/10'],[17,'5/12 + 3/8','19/24'],[18,'9/16 + 7/12','1 7/48'],[19,'8/30 − 1/20','13/60'],[20,'9/40 − 1/30','23/120']]],
 ['Fractions Handout #2: mixed numbers','',[[21,'4 3/10 + 8 1/10','12 2/5'],[22,'12 5/12 − 7 1/12','5 1/3'],[23,'1 5/8 + 2 1/2','4 1/8'],[24,'6 1/3 − 4 1/4','2 1/12'],[25,'6 1/2 + 2 5/14','8 6/7'],[26,'5 4/10 − 3 1/3','2 1/15'],
   [27,'1 5/6 + 2 3/4 + 5 1/2','10 1/12'],[28,'9 4/7 − 7 2/3','1 19/21'],[29,'18 7/12 + 19 3/16 + 10 2/3','48 7/16'],[30,'21 2/5 − 20 5/16','1 7/80']]],
 ['Fractions Handout #2: word problems','',[
   [31,'1/3 + 1/4 + 1/8','17/24','Total horsepower: @17/24@ HP.'],
   [32,'1/32 + 1/8 + 5/16','15/32','Bolt covered by the lock washer, washer and nut: @15/32@ inch.'],
   [33,'7/16 − 7/32','7/32','Thread left for the bushing: @7/32@ inch.'],
   [34,'16 1/4 − 11 5/12','4 5/6','Conduit left: @4 5/6@ ft.'],
   [35,'15/16 − 2 × 1/64','29/32','Thickness of the carbon (coating on both sides): @29/32@ inch.'],
   [36,'16/14 + 4 1/8 + 2 1/2','7 43/56','Total weight of the three coils: @7 43/56@ lb.'],
   [37,'6 1/4 + 8 7/12 + 10 5/8 + 4 5/10','29 23/24','Conduit for the four runs between five receptacles: @29 23/24@ ft.']]],
];

return{build,one,sgItems,JS_KEY,jsH,genComp,genReason,predictions,predictionsX,NC_PLAN,NR_PLAN,NC_PLAN_H,NC_PLAN_X,NR_PLAN_H,NR_PLAN_X,JS_NC,JS_NR,JS_TYPES};})();

