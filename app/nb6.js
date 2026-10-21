/* ================= ETA / IBEW Algebra & Functions (math tab) ================= */
const ETA=(()=>{
const MI='−';
const gcdI=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;};
/* exact fractions */
function Q(n,d){d=d==null?1:d;if(d===0)throw new Error('div0');if(d<0){n=-n;d=-d;}const g=gcdI(n,d);return{n:n/g,d:d/g};}
const qa=(a,b)=>Q(a.n*b.d+b.n*a.d,a.d*b.d),qs=(a,b)=>Q(a.n*b.d-b.n*a.d,a.d*b.d),qm=(a,b)=>Q(a.n*b.n,a.d*b.d),qd=(a,b)=>Q(a.n*b.d,a.d*b.n);
const qi=x=>typeof x==='number'?Q(x,1):x;const qeq=(a,b)=>a.n===b.n&&a.d===b.d;const qv=a=>a.n/a.d;
/* number formatting: minus sign, trimmed decimals */
function num(x){if(typeof x==='object')x=qv(x);const r=Math.round(x*1000)/1000;const s=String(Math.abs(r));return (r<0?MI:'')+s;}
const fr=(a,b)=>`<span class="fr"><span>${a}</span><span>${b}</span></span>`;
const sup=e=>`<sup>${e}</sup>`;
const v=s=>`<i>${s}</i>`;
const sub=(s,k)=>`<i>${s}</i><sub>${k}</sub>`;
function qH(q){q=qi(q);if(q.d===1)return num(q.n);return (q.n<0?MI:'')+fr(Math.abs(q.n),q.d);}
function qT(q){q=qi(q);if(q.d===1)return num(q.n);return (q.n<0?'-':'')+Math.abs(q.n)+'/'+q.d;}
const sq=x=>`<span class="sqrt">√<span>${x}</span></span>`;
/* polynomial terms: [{c:Q|number, p:{x:2,y:1}}] in display order */
function monoH(c,p,first,plain){c=qi(c);const neg=qv(c)<0;const a=Q(Math.abs(c.n),c.d);const vars=Object.keys(p).filter(k=>p[k]);
  let co=(a.n===1&&a.d===1&&vars.length)?'':(plain?qT(a):qH(a));
  const vs=vars.map(k=>plain?(k+(p[k]>1?'^'+p[k]:'')):(v(k)+(p[k]>1?sup(p[k]):''))).join('');
  const s=co+vs;return first?(neg?(plain?'-':MI)+s:s):(neg?` ${plain?'-':MI} `:' + ')+s;}
function polyH(ts,plain){const t=ts.filter(x=>qv(qi(x.c))!==0);if(!t.length)return '0';return t.map((x,i)=>monoH(x.c,x.p,i===0,plain)).join('');}
/* canonical key for a polynomial (sum of like terms) */
function polyKey(ts){const m={};ts.forEach(t=>{const k=Object.keys(t.p).filter(z=>t.p[z]).sort().map(z=>z+t.p[z]).join('');const c=qi(t.c);m[k]=m[k]?qa(m[k],c):c;});return Object.keys(m).filter(k=>m[k].n!==0).sort().map(k=>k+':'+m[k].n+'/'+m[k].d).join('|');}
function polyMul(A,B){const out=[];A.forEach(a=>B.forEach(b=>{const p=Object.assign({},a.p);Object.keys(b.p).forEach(k=>p[k]=(p[k]||0)+b.p[k]);out.push({c:qm(qi(a.c),qi(b.c)),p});}));return out;}
const T=(c,p)=>({c,p:p||{}});

/* --- item maker: shuffles choices, checks exactly one right and no duplicates --- */
function mkM(R,o){let ch=o.choices.slice();if(ch.length!==4)throw new Error('need 4 choices '+o.type);
  const keys=ch.map(c=>String(c.key));if(new Set(keys).size!==4)throw new Error('dup '+o.type+' '+keys.join(';'));
  if(ch.filter(c=>c.ok).length!==1)throw new Error('one correct '+o.type);
  if(!o.keepOrder)ch=R.shuffle(ch);const correct=ch.findIndex(c=>c.ok);
  return{type:o.type,skill:'Math',sub:o.sub,diff:o.diff||2,stem:o.stem,stemH:o.stemH||null,svg:o.fig||'',grid:!!o.grid,
    choices:ch.map(c=>({t:c.t,h:c.h||null,svg:c.svg||null,key:String(c.key),note:c.ok?null:(c.note||null)})),correct,explain:o.explain,explainH:o.explainH||null,params:o.params||{}};}
const blk=h=>`<div class="mathblk">${h}</div>`;

/* ================= 1. number series ================= */
function genSeries(seed){const R=RNG(seed);
  for(let att=0;att<500;att++){const kind=R.pick(['geo','lin1','lin2','diffs','halve','interleave','opcycle','squares','pow3','fib','groups','dec','decdiff']);
    let s=[],nx,rule,wrong=[];
    if(kind==='geo'){const r=R.pick([2,3,4]),a=R.int(1,6);for(let i=0;i<4;i++)s.push(a*r**i);nx=s[3]*r;rule=`each number is ${r} times the one before`;wrong=[s[3]+(s[3]-s[2]),s[3]*r-r,s[3]+2*(s[3]-s[2])];}
    else if(kind==='lin1'){const r=R.pick([2,3]),c=R.pick([1,-1,2,-2,3,-3]),a=R.int(2,6);s=[a];for(let i=0;i<4;i++)s.push(s[i]*r+c);nx=s[4]*r+c;rule=`multiply by ${r}, then ${c>0?'add':'subtract'} ${Math.abs(c)}`;wrong=[s[4]*r,s[4]*r-c,s[4]+(s[4]-s[3])];}
    else if(kind==='lin2'){const a=R.int(3,7);const c=R.pick([1,2]);s=[a];for(let i=0;i<4;i++)s.push(s[i]*2+(i%2?c:-c));nx=s[4]*2+(4%2?c:-c);rule=`double it, then alternately subtract and add ${c}`;wrong=[s[4]*2+c,s[4]*2,s[4]*2+2*c];}
    else if(kind==='diffs'){const a=R.int(40,90),d0=R.int(9,14),dd=R.pick([2,3]);s=[a];let d=d0;for(let i=0;i<4;i++){s.push(s[i]-d);d-=dd;}nx=s[4]-d;rule=`the amount subtracted goes down by ${dd} each time (${[0,1,2,3,4].map(i=>d0-i*dd).join(', ')})`;wrong=[s[4]-(d+dd),s[4]-d-1,s[4]+dd];}
    else if(kind==='halve'){const k=R.pick([2,4]),d0=R.pick([16,32])*k/2,a=R.int(30,60)+d0;s=[a];let d=d0;for(let i=0;i<3;i++){s.push(s[i]-d);d/=2;}nx=s[3]-d;rule=`the amount subtracted is halved each time (${d0}, ${d0/2}, ${d0/4}, then ${d0/8})`;wrong=[s[3]-d*2,s[3]-d+1,s[3]-d-1];}
    else if(kind==='interleave'){const a=R.int(3,9),b=a+R.int(3,6),da=R.pick([2,3,4]),db=da+R.pick([1,2,3]);s=[a,b,a+da,b+db,a+2*da,b+2*db];nx=a+3*da;rule=`two series take turns: ${a}, ${a+da}, ${a+2*da}, … goes up by ${da} and ${b}, ${b+db}, ${b+2*db}, … goes up by ${db}`;wrong=[b+3*db,a+3*da+1,s[5]-(s[5]-s[4])+db];}
    else if(kind==='opcycle'){const a=R.int(2,5),m=R.pick([2,3]),k=R.pick([2,3,4]);s=[a];let i=0;while(s.length<6){const p=s[s.length-1];s.push(i%2===0?p*m:p-k);i++;}nx=i%2===0?s[5]*m:s[5]-k;rule=`multiply by ${m}, then subtract ${k}, and repeat`;wrong=[i%2===0?s[5]-k:s[5]*m,nx+k,nx-k];}
    else if(kind==='squares'){const c=R.pick([1,-1,2,3]),st=R.int(1,3);for(let i=st;i<st+4;i++)s.push(i*i+c);nx=(st+4)**2+c;rule=`the gaps go up by 2 each time (squares ${c>0?'plus':'minus'} ${Math.abs(c)})`;wrong=[s[3]+(s[3]-s[2]),nx+2,nx-2];}
    else if(kind==='pow3'){const a=R.int(5,12);s=[a];let d=1;for(let i=0;i<4;i++){s.push(s[i]+d);d*=3;}nx=s[4]+d;rule=`the gaps are 1, 3, 9, 27, 81: each gap is 3 times the one before`;wrong=[s[4]+d/3*2,s[4]+2*(s[4]-s[3]),s[4]+d/3+d/9];}
    else if(kind==='fib'){const a=R.int(2,7),b=R.int(a+1,a+5);s=[a,b,a+b,a+2*b];nx=s[2]+s[3];rule='each number is the sum of the two before it';wrong=[s[3]+(s[3]-s[2]),s[3]+b,nx-1];}
    else if(kind==='groups'){const a=R.int(3,6),u=R.pick([5,6,7]),dn=R.pick([2,3]);s=[a];let i=0;while(s.length<8){const p=s[s.length-1];s.push(i%2===0?p+u:p-dn);i++;}nx=i%2===0?s[7]+u:s[7]-dn;rule=`add ${u}, then subtract ${dn}, and repeat`;wrong=[i%2===0?s[7]-dn:s[7]+u,nx+1,nx-1];}
    else if(kind==='dec'){const a=R.pick([1.2,1.3,1.4,2.1,1.5]),r=3;for(let i=0;i<4;i++)s.push(Math.round(a*r**i*10)/10);nx=Math.round(s[3]*r*10)/10;rule='each number is 3 times the one before';wrong=[Math.round((s[3]+2*(s[3]-s[2]))*10)/10,Math.round((s[3]*2)*10)/10,Math.round((nx-a*10)*10)/10];}
    else{const a=R.int(60,90),d0=R.int(18,24),dd=R.pick([4,5,6]);s=[a];let d=d0;for(let i=0;i<3;i++){s.push(s[i]-d);d-=dd;}nx=s[3]-d;rule=`the amount subtracted goes down by ${dd} each time`;wrong=[s[3]-(d+dd),s[3]-d+dd,s[3]-d-dd];}
    const vals=[nx].concat(wrong.map(w=>Math.round(w*10)/10));if(new Set(vals).size!==4||vals.some(x=>x<0||!isFinite(x)))continue;
    if(s.some(x=>x<0))continue;
    const notes=['Check the rule on every step, not just the last two numbers.','Close, but the rule gives a different next step.','That doesn’t follow the same rule all the way through.'];
    return mkM(R,{type:'etaSeries',sub:'Number series',stem:`What is the next number in the following series of numbers? ${s.join(', ')}, ?`,
      stemH:`What is the next number in the following series of numbers?`,fig:blk(`<span class="series">${s.map(num).join('&ensp;')}&ensp;<b>?</b></span>`),
      choices:vals.map((x,i)=>({t:num(x),h:num(x),key:x,ok:i===0,note:notes[i-1]})),explain:`The rule: ${rule}. So the next number is ${num(nx)}.`,params:{s,kind}});}
  throw new Error('series');}

/* ================= 2. plug in / solve ================= */
/* linear equations in one unknown: templates show the formula, given values fill the rest */
const SOLVE_T=[
 {vars:['A','B','C'],u:'A',show:k=>`(${k.k}${v('A')} ${MI} (${v('B')} + ${k.m}${v('C')})) + ${k.c} = ${v('A')}${v('B')} ${MI} ${v('C')}`,f:(k,g,u)=>qs(qi(k.k*u-(g.B+k.m*g.C)+k.c),qi(u*g.B-g.C)),side:(k,g,u)=>u*g.B-g.C},
 {vars:['A','B','D'],u:'B',show:k=>`${v('D')}(${v('B')} + ${k.m}) = ${k.c} ${MI} (${v('B')} + ${v('A')}(${v('B')} ${MI} ${k.k}))`,f:(k,g,u)=>qs(qi(g.D*(u+k.m)),qi(k.c-(u+g.A*(u-k.k)))),side:(k,g,u)=>g.D*(u+k.m)},
 {vars:['x','y','z'],u:'x',show:k=>`${k.k}(${v('x')} ${MI} ${v('y')}) + ${v('z')} = ${k.m}${v('x')} ${MI} ${k.c}`,f:(k,g,u)=>qs(qi(k.k*(u-g.y)+g.z),qi(k.m*u-k.c)),side:(k,g,u)=>k.m*u-k.c},
 {vars:['P','Q','R'],u:'R',show:k=>`${v('P')}${v('R')} ${MI} ${k.k}(${v('Q')} + ${v('R')}) = ${k.c} + ${v('Q')}`,f:(k,g,u)=>qs(qi(g.P*u-k.k*(g.Q+u)),qi(k.c+g.Q)),side:(k,g,u)=>k.c+g.Q}];
function genSolve(seed){const R=RNG(seed);
  for(let att=0;att<3000;att++){const tp=R.pick(SOLVE_T);const k={k:R.int(2,5),m:R.int(2,4),c:R.int(2,48)};const g={};tp.vars.filter(x=>x!==tp.u).forEach(x=>g[x]=R.int(1,9));
    const f0=tp.f(k,g,0),f1=tp.f(k,g,1);const sl=qs(f1,f0);if(sl.n===0)continue;const u=qd(qs(Q(0),f0),sl);if(u.d!==1||u.n<1||u.n>9)continue;
    const ans=u.n;const start=R.int(Math.max(1,ans-3),ans);const vals=[0,1,2,3].map(i=>start+i);
    const givens=Object.keys(g).map(x=>`${x} = ${g[x]}`).join(' and ');
    return mkM(R,{type:'etaSolve',sub:'Plugging in & solving',keepOrder:true,stem:`Consider the formula. If ${givens}, what is the value of ${tp.u}?`,
      stemH:`Consider the formula. If ${Object.keys(g).map(x=>`${v(x)} = ${g[x]}`).join(' and ')}, what is the value of ${v(tp.u)}?`,fig:blk(tp.show(k)),
      choices:vals.map(x=>({t:String(x),key:x,ok:x===ans,note:'Plug this value back in: the two sides don’t come out equal.'})),
      explain:`Put in the given values; everything except ${tp.u} becomes a number, so it is a one-letter equation. Solve it, or try each choice: with ${tp.u} = ${ans} both sides come out to ${num(tp.side(k,g,ans))}.`,params:{k,g,tp:SOLVE_T.indexOf(tp)}});}
  throw new Error('solve');}

/* evaluate an expression built from fractions */
const EVAL_T=[
 {vars:['p','q','r','s'],show:()=>`${fr(v('p'),`${v('q')} ${MI} ${v('r')}`)} + ${fr(`${v('p')}(${v('s')} ${MI} ${v('r')})`,`${v('q')} ${MI} ${v('s')}`)} = ${v('M')}`,
  parts:g=>[qd(qi(g.p),qi(g.q-g.r)),qd(qi(g.p*(g.s-g.r)),qi(g.q-g.s))],op:'+',f:g=>qa(qd(qi(g.p),qi(g.q-g.r)),qd(qi(g.p*(g.s-g.r)),qi(g.q-g.s))),slip:g=>qa(qd(qi(g.p),qi(g.q-g.r)),qd(qi(g.p*(g.r-g.s)),qi(g.q-g.s))),slipN:'Flipped (s − r) to (r − s).'},
 {vars:['a','b','c','d'],show:()=>`${fr(`${v('a')} + ${v('b')}`,v('c'))} ${MI} ${v('d')}(${v('b')} ${MI} ${v('c')}) = ${v('M')}`,
  parts:g=>[qd(qi(g.a+g.b),qi(g.c)),qi(g.d*(g.b-g.c))],op:'−',f:g=>qs(qd(qi(g.a+g.b),qi(g.c)),qi(g.d*(g.b-g.c))),slip:g=>qa(qd(qi(g.a+g.b),qi(g.c)),qi(g.d*(g.b-g.c))),slipN:'Added the second part instead of subtracting it.'},
 {vars:['x','y','z','w'],show:()=>`${fr(`${v('x')}${sup(2)} ${MI} ${v('y')}`,v('z'))} + ${fr(`${v('w')}${v('z')}`,`${v('x')} + ${v('w')}`)} = ${v('M')}`,
  parts:g=>[qd(qi(g.x*g.x-g.y),qi(g.z)),qd(qi(g.w*g.z),qi(g.x+g.w))],op:'+',f:g=>qa(qd(qi(g.x*g.x-g.y),qi(g.z)),qd(qi(g.w*g.z),qi(g.x+g.w))),slip:g=>qa(qd(qi(2*g.x-g.y),qi(g.z)),qd(qi(g.w*g.z),qi(g.x+g.w))),slipN:'Doubled x instead of squaring it.'}];
function genEval(seed){const R=RNG(seed);
  for(let att=0;att<5000;att++){const tp=R.pick(EVAL_T);const g={};tp.vars.forEach(x=>g[x]=R.int(1,12));let a,b;try{a=tp.f(g);b=tp.slip(g);}catch(e){continue;}
    if(a.d!==1&&a.d!==2)continue;if(b.d!==1&&b.d!==2)continue;if(Math.abs(qv(a))>40||qeq(a,b))continue;
    const A=qv(a);const others=[qv(b),A+(R.chance(.5)?2:-2),-A].filter(x=>x!==A);const vals=[A].concat([...new Set(others)]).slice(0,4);if(vals.length<4||new Set(vals).size<4)continue;
    const notes=[tp.slipN,'An arithmetic slip somewhere: redo each fraction on its own.','Sign error: check which parts come out negative.'];
    return mkM(R,{type:'etaEval',sub:'Plugging in & solving',stem:`Find the unknown variable M, given ${tp.vars.map(x=>x+' = '+g[x]).join(', ')}.`,
      stemH:`Find the unknown variable ${v('M')}, given ${tp.vars.map(x=>`${v(x)} = ${g[x]}`).join(', ')}.`,fig:blk(tp.show()),
      choices:vals.map((x,i)=>({t:num(x),key:x,ok:i===0,note:notes[i-1]})),explain:`Work each part on its own, then combine: ${qT(tp.parts(g)[0])} ${tp.op} ${qT(tp.parts(g)[1])} = ${num(A)}.`,explainH:`Work each part on its own, then combine: ${qH(tp.parts(g)[0])} ${tp.op} ${qH(tp.parts(g)[1])} = ${num(A)}.`,params:{g,tp:EVAL_T.indexOf(tp)}});}
  throw new Error('eval');}

/* ================= 3. polynomials ================= */
function genPoly(seed){const R=RNG(seed);const kind=R.pick(['simplify','expand','gcf','trinomial']);const X={x:1},X2={x:2},X3={x:3};
  for(let att=0;att<2000;att++){let stem,stemH,fig,opts,explain;
    if(kind==='simplify'){const k=R.int(2,4),a=R.int(1,4),b=R.int(1,4),c=R.int(2,6),d=R.int(2,6),e=R.int(1,a*k-1),f=R.pick([1,2]);
      fig=blk(`${k}(${a===1?'':a}${v('x')}${sup(3)} ${MI} ${b===1?'':b}${v('x')}${sup(2)} + ${c} ${MI} ${d}${v('x')}) ${MI} ${e===1?'':e}${v('x')}${sup(3)} + ${f===1?'':f}${v('x')}${sup(2)}`);
      const P=(c3,c2,c1,c0)=>[T(c3,X3),T(c2,X2),T(c1,X),T(c0)];
      opts=[{p:P(k*a-e,-k*b+f,-k*d,k*c),ok:true},{p:P(k*a-e,-k*b+f,-k*d,c),note:'Forgot to multiply the constant by '+k+'.'},{p:P(k*a+e,-k*b+f,-k*d,k*c),note:'Added the x³ terms instead of subtracting.'},{p:P(k*a-e,-k*b-f,-k*d,k*c),note:'Sign error combining the x² terms.'}];
      stem='Simplify the following expression:';explain=`Distribute ${k} to every term inside, then combine like terms: x³: ${k*a} − ${e} = ${k*a-e}; x²: −${k*b} + ${f} = ${-k*b+f}; x: −${k*d}; constant: ${k*c}.`;}
    else if(kind==='expand'){const a=R.int(2,4),p=R.int(1,6),q=R.int(1,6);if(p===q)continue;
      fig=blk(`${v('y')} = ${a}(${v('x')} ${MI} ${p})(${v('x')} + ${q})`);const P=(c2,c1,c0)=>[T(c2,X2),T(c1,X),T(c0)];
      opts=[{p:P(a,a*(q-p),-a*p*q),ok:true},{p:P(a,a*(p-q),-a*p*q),note:'Sign error on the middle term.'},{p:P(1,q-p,-p*q),note:`Forgot to multiply everything by ${a}.`},{p:P(a,q-p,-a*p*q),note:`Only multiplied part of it by ${a}.`}];
      stem='Consider the following formula. Which formula is equivalent to this one?';explain=`FOIL first: (x − ${p})(x + ${q}) = x² + ${q-p}x − ${p*q}. Then multiply every term by ${a}.`.replace('+ -','− ');}
    else if(kind==='gcf'){const g=R.int(2,5),m=R.int(2,4),n=R.int(1,3);const a=R.int(1,3),b=R.int(1,2);
      // g x^(a+1) y + g*m x^a y^(b+1)  = g x^a y (x + m y^b)
      const poly=[T(g,{x:a+1,y:1}),T(g*m,{x:a,y:b+1})];fig=blk(polyH(poly));const key=polyKey(poly);
      const F=(c,px,py,in1,in2)=>({fac:[T(c,{x:px,y:py})],in:[in1,in2]});
      const cand=[{f:F(g,a,1,T(1,{x:1}),T(m,{y:b})),ok:true},{f:F(g*m,a,1,T(1,{x:1}),T(1,{y:b})),note:'The common factor’s number is too big: both terms don’t share '+g*m+'.'},{f:F(g,a+1,1,T(1),T(m,{y:b})),note:'Took too many x’s out of the second term.'},{f:F(g,a,1,T(m,{x:1}),T(1,{y:b})),note:'Put the '+m+' with the wrong term.'}];
      opts=cand.map(c=>({fp:c.f,ok:c.ok,note:c.note}));
      opts.forEach(o=>{o.p=polyMul(o.fp.fac,o.fp.in);o.h=`${polyH(o.fp.fac)}(${polyH(o.fp.in)})`;o.t=`${polyH(o.fp.fac,true)}(${polyH(o.fp.in,true)})`;});
      if(new Set(opts.map(o=>polyKey(o.p))).size!==4||polyKey(opts[0].p)!==key)continue;
      stem='Factor the polynomial. Which is the correct factorization?';explain=`Find what both terms share: ${g} and the smallest powers of x and y. Take it out and divide each term by it. Multiply back to check.`;}
    else{const m=R.int(1,9)*(R.chance(.5)?1:-1),n=R.int(1,9)*(R.chance(.5)?1:-1);if(m===n||m===-n)continue;const b=m+n,c=m*n;if(b===0)continue;
      fig=blk(polyH([T(1,X2),T(b,X),T(c)]));const fac=(a,b2)=>({h:`(${v('x')} ${a<0?MI:'+'} ${Math.abs(a)})(${v('x')} ${b2<0?MI:'+'} ${Math.abs(b2)})`,t:`(x ${a<0?'-':'+'} ${Math.abs(a)})(x ${b2<0?'-':'+'} ${Math.abs(b2)})`,p:polyMul([T(1,X),T(a)],[T(1,X),T(b2)])});
      const pairs=[];for(let i=1;i<=Math.abs(c);i++)if(Math.abs(c)%i===0){const j=c/i;pairs.push([i,j],[-i,-j]);}
      const wrong=R.shuffle(pairs.filter(([i,j])=>i+j!==b&&!(i===m&&j===n))).slice(0,2);if(wrong.length<2)continue;
      opts=[Object.assign(fac(m,n),{ok:true}),Object.assign(fac(-m,-n),{note:'Both signs are flipped: that gives the wrong middle term.'}),...wrong.map(([i,j])=>Object.assign(fac(i,j),{note:`These multiply to ${c} but add to ${i+j}, not ${b}.`}))];
      stem='Factor the polynomial. Which is the correct factorization?';explain=`Find two numbers that multiply to ${c} and add to ${b}: ${m} and ${n}. So the answer is ${opts[0].t}.`;}
    opts.forEach(o=>{if(!o.h){o.h=polyH(o.p);o.t=polyH(o.p,true);}o.key=polyKey(o.p);});
    if(new Set(opts.map(o=>o.key)).size!==4)continue;
    return mkM(R,{type:'etaPoly',sub:kind==='simplify'?'Simplifying':kind==='expand'?'Expanding':'Factoring',stem,stemH:stem,fig,
      choices:opts.map(o=>({t:o.t,h:o.h,key:o.key,ok:!!o.ok,note:o.note})),explain,params:{kind}});}
  throw new Error('poly');}

/* ================= 4. variable relationships (which statement is true) ================= */
/* relation α·u + β·w = γ between letters (u, w) with whole-number crossing points */
const PAIRS=[['x','y'],['A','B'],['H','M'],['P','Q'],['y','x']];
function relForm(R){for(let att=0;att<400;att++){const [U,W]=R.pick(PAIRS);const form=R.pick(['slope','int','frac','dec','neg']);
    if(form==='slope'||form==='neg'){/* U = m·W + c */const m=R.pick([2,3,4,-2,-3,-1])*(form==='neg'?-1:1);const c=R.int(2,12)*(R.chance(.5)?1:-1);if((-c)%m!==0)continue;
      return{U,W,a:Q(1),b:Q(-m),g:Q(c),h:`${v(U)} = ${m===-1?MI:m===1?'':num(m)}${v(W)} ${c<0?MI:'+'} ${Math.abs(c)}`,form};}
    if(form==='int'){/* a·U = b·W + d */const a=R.pick([2,3,4,5]),b=R.pick([2,4,6,3,-2,-4]),d=R.pick([4,6,8,12,-6,-8,-12]);if(d%a||d%b||b===a)continue;
      return{U,W,a:Q(a),b:Q(-b),g:Q(d),h:`${a}${v(U)} = ${b<0?MI:''}${Math.abs(b)}${v(W)} ${d<0?MI:'+'} ${Math.abs(d)}`,form};}
    if(form==='frac'){/* (1/p)U = c − (1/q)W */const p=R.pick([2,3,4]),q=R.pick([2,3,4,5]),c=R.int(2,6);
      return{U,W,a:Q(1,p),b:Q(1,q),g:Q(c),h:`${fr(1,p)}${v(U)} = ${c} ${MI} ${fr(1,q)}${v(W)}`,form};}
    /* dec: U = 0.25W − c */const m=R.pick([0.25,0.5]),c=R.int(2,6);const mq=m===0.25?Q(1,4):Q(1,2);
    return{U,W,a:Q(1),b:qs(Q(0),mq),g:Q(-c),h:`${v(U)} = ${m}${v(W)} ${MI} ${c}`,form};}
  throw new Error('relform');}
function genRelation(seed){const R=RNG(seed);
  for(let att=0;att<800;att++){const F=relForm(R);const {U,W}=F;
    /* out as function of in: for in-letter W: U = (γ − β W)/α */
    const fns={[W]:{out:U,s:qd(qs(Q(0),F.b),F.a),z:qd(F.g,F.b)},[U]:{out:W,s:qd(qs(Q(0),F.a),F.b),z:qd(F.g,F.a)}};
    if(fns[W].z.d!==1||fns[U].z.d!==1||fns[W].z.n===0)continue;
    const val=(inL,x)=>{const f=fns[inL];return qv(f.s)*(x-qv(f.z));};
    /* candidate statements */
    const cands=[];for(const inL of [W,U]){const z=fns[inL].z.n;for(const d of [0,2,4,6,-2,-4,-6])for(const cmp of ['gt','lt'])for(const sg of ['pos','neg']){const Tv=z+d;
      /* truth by sampling many values in the range (independent of the algebra above) */
      let all=true,some=false;for(let i=1;i<=400;i++){const x=cmp==='gt'?Tv+i*0.05:Tv-i*0.05;const y=val(inL,x);const okv=sg==='pos'?y>1e-9:y<-1e-9;if(okv)some=true;else all=false;}
      cands.push({inL,out:fns[inL].out,cmp,Tv,sg,all,some,t:`When the value of ${inL} is ${cmp==='gt'?'greater':'less'} than ${num(Tv)}, ${fns[inL].out} is ${sg==='pos'?'positive':'negative'}.`});}}
    const notMode=R.chance(.25);
    const trues=R.shuffle(cands.filter(c=>c.all)),partly=R.shuffle(cands.filter(c=>!c.all&&c.some)),never=R.shuffle(cands.filter(c=>!c.some));
    let pick;if(!notMode){if(!trues.length||!partly.length)continue;const rest=R.shuffle(partly.slice(1).concat(never)).filter(c=>c.t!==partly[0].t);pick=[Object.assign({},trues[0],{ok:true}),partly[0],rest[0],rest.find(c=>rest[0]&&c.t!==rest[0].t)];}
    else{if(trues.length<3||!partly.length)continue;pick=[Object.assign({},partly[0],{ok:true}),trues[0],trues[1],trues[2]];}
    if(pick.some(p=>!p)||new Set(pick.map(p=>p.t)).size!==4)continue;
    const z=n=>num(n);
    const explain=`Find where each letter crosses zero: ${U} = 0 when ${W} = ${z(fns[W].z.n)}, and ${W} = 0 when ${U} = ${z(fns[U].z.n)}. ${qv(fns[W].s)>0?`They move the same way: as ${W} goes up, ${U} goes up.`:`They move opposite ways: as ${W} goes up, ${U} goes down.`} A statement is only true if it holds for every value in its range.`;
    return mkM(R,{type:'etaRelation',sub:'Variable relationships',stem:`Consider the formula. Which statement is ${notMode?'NOT ':''}true?`,stemH:`Consider the formula. Which statement is ${notMode?'<b>NOT</b> ':''}true?`,fig:blk(F.h),
      choices:pick.map(p=>({t:p.t,key:p.t,ok:!!p.ok,note:notMode?'This one is always true.':(p.some?'Only partly true: it fails for some values in that range.':'Never true in that range.')})),
      explain,params:{form:F.form,U,W}});}
  throw new Error('relation');}

/* ================= graphs ================= */
function niceStep(n){return n<=10?1:n<=16?2:n<=30?5:10;}
function graphSvg(lines,o){o=o||{};const xr=o.xr||[-5,5],yr=o.yr||[-5,5],S=o.size||150,pad=o.pad||18;const nx=xr[1]-xr[0],ny=yr[1]-yr[0];
  const eq=o.equal!==false&&Math.max(nx,ny)/Math.min(nx,ny)<=1.3;const sx=eq?Math.min((S-2*pad)/nx,(S-2*pad)/ny):(S-2*pad)/nx,sy=eq?sx:(S-2*pad)/ny;
  const W=nx*sx+2*pad,H=ny*sy+2*pad;const X=x=>pad+(x-xr[0])*sx,Y=y=>pad+(yr[1]-y)*sy;let b='';
  for(let x=xr[0];x<=xr[1];x++)b+=`<line x1="${P(X(x))}" y1="${P(Y(yr[0]))}" x2="${P(X(x))}" y2="${P(Y(yr[1]))}" class="gr-grid"/>`;
  for(let y=yr[0];y<=yr[1];y++)b+=`<line x1="${P(X(xr[0]))}" y1="${P(Y(y))}" x2="${P(X(xr[1]))}" y2="${P(Y(y))}" class="gr-grid"/>`;
  b+=`<line x1="${P(X(xr[0]))}" y1="${P(Y(0))}" x2="${P(X(xr[1]))}" y2="${P(Y(0))}" class="gr-axis"/><line x1="${P(X(0))}" y1="${P(Y(yr[0]))}" x2="${P(X(0))}" y2="${P(Y(yr[1]))}" class="gr-axis"/>`;
  const st=o.step||Math.max(niceStep(nx),S<200&&nx>8?2:1);for(let x=xr[0];x<=xr[1];x++)if(x&&x%st===0)b+=`<text x="${P(X(x))}" y="${P(Y(0)+12)}" class="gr-t">${num(x)}</text>`;
  const sty=o.ystep||Math.max(niceStep(ny),S<200&&ny>8?2:1);for(let y=yr[0];y<=yr[1];y++)if(y&&y%sty===0)b+=`<text x="${P(X(0)-4)}" y="${P(Y(y)+3.5)}" class="gr-t" text-anchor="end">${num(y)}</text>`;
  lines.forEach((L,i)=>{/* clip y=mx+b to the box */const pts=[];const add=(x,y)=>{if(x>=xr[0]-1e-9&&x<=xr[1]+1e-9&&y>=yr[0]-1e-9&&y<=yr[1]+1e-9)pts.push([x,y]);};
    if(L.vert!=null){add(L.vert,yr[0]);add(L.vert,yr[1]);}else{add(xr[0],L.m*xr[0]+L.b);add(xr[1],L.m*xr[1]+L.b);if(L.m){add((yr[0]-L.b)/L.m,yr[0]);add((yr[1]-L.b)/L.m,yr[1]);}}
    pts.sort((a,c)=>a[0]-c[0]||a[1]-c[1]);if(pts.length>=2){const a=pts[0],c=pts[pts.length-1];b+=`<line x1="${P(X(a[0]))}" y1="${P(Y(a[1]))}" x2="${P(X(c[0]))}" y2="${P(Y(c[1]))}" class="gr-line${i?' l2':''}"/>`;}
    (L.pts||[]).forEach(p=>{b+=`<circle cx="${P(X(p[0]))}" cy="${P(Y(p[1]))}" r="3" class="gr-pt${i?' l2':''}"/>`;if(p[2]!=null)b+=`<text x="${P(X(p[0])+5)}" y="${P(Y(p[1])-5)}" class="gr-pl">${p[2]}</text>`;});});
  (o.marks||[]).forEach(p=>{b+=`<circle cx="${P(X(p[0]))}" cy="${P(Y(p[1]))}" r="3.6" class="gr-mk"/><text x="${P(X(p[0])+6)}" y="${P(Y(p[1])-6)}" class="gr-ml">${p[2]}</text>`;});
  return `<svg class="fig gr" viewBox="0 0 ${P(W)} ${P(H)}" style="max-width:${Math.round(o.max||W*1.4)}px" role="img" aria-label="${esc(o.label||'graph')}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;}
const lineEqH=(m,b,yl,xl)=>{yl=yl||'y';xl=xl||'x';const mq=qi(m);const mh=qv(mq)===1?'':qv(mq)===-1?MI:qH(mq);const bq=qi(b);return `${v(yl)} = ${qv(mq)===0?'':mh+v(xl)}${qv(bq)===0?(qv(mq)===0?'0':''):(qv(mq)===0?qH(bq):` ${qv(bq)<0?MI:'+'} ${qH(Q(Math.abs(bq.n),bq.d))}`)}`;};
const lineEqT=(m,b)=>{const mq=qi(m),bq=qi(b);const mt=qv(mq)===1?'':qv(mq)===-1?'-':qT(mq);return `y = ${mt}x${qv(bq)===0?'':` ${qv(bq)<0?'-':'+'} ${qT(Q(Math.abs(bq.n),bq.d))}`}`;};
function fitRange(lines){/* y range that shows the lines near x in [-4,4] */let lo=-5,hi=5;lines.forEach(L=>{[0,-2,2].forEach(x=>{const y=qv(qi(L.m))*x+qv(qi(L.b));lo=Math.min(lo,Math.floor(y)-1);hi=Math.max(hi,Math.ceil(y)+1);});});return [Math.max(lo,-12),Math.min(hi,12)];}

function genGraphPick(seed){const R=RNG(seed);
  for(let att=0;att<500;att++){const m=R.pick([1,2,3,-1,-2,-3,Q(1,2),Q(-1,2)]),b=R.int(-4,5);if(b===0)continue;const mq=qi(m);
    const sw=mq.d===1&&Math.abs(b)<=4&&mq.n!==b;const alts=[{m:qs(Q(0),mq),b,note:'The slope has the wrong sign: this line goes the other way.'},{m:mq,b:-b,note:'Right slope, but it crosses the y-axis at the wrong place.'},{m:sw?Q(b):qm(mq,Q(2)),b:sw?mq.n:b,note:sw?'Slope and intercept mixed up.':'Too steep: this line rises twice as fast.'}];
    const all=[{m:mq,b,ok:true}].concat(alts);const keys=all.map(a=>qT(a.m)+'|'+a.b);if(new Set(keys).size!==4)continue;
    const yr=fitRange(all.map(a=>({m:a.m,b:a.b})));const xr=[-4,4];
    const svg=a=>graphSvg([{m:qv(a.m),b:a.b,pts:[[0,a.b]]}],{xr,yr,size:165,max:200,label:'line graph'});
    return mkM(R,{type:'etaGraph',sub:'Graphing',stem:`Which graph represents the function ${lineEqT(mq,b)}?`,stemH:`Which graph represents the function ${lineEqH(mq,b)}?`,
      choices:all.map(a=>({t:lineEqT(a.m,a.b),svg:svg(a),key:qT(a.m)+'|'+a.b,ok:!!a.ok,note:a.note})),grid:true,
      explain:`Start at the y-intercept (0, ${num(b)}). The slope ${qT(mq)} means for every 1 step right the line goes ${qv(mq)>0?'up':'down'} ${num(Math.abs(qv(mq)))}. Only one graph does both.`,params:{m:qT(mq),b}});}
  throw new Error('graph');}

function genSystemGraph(seed){const R=RNG(seed);
  for(let att=0;att<2000;att++){const x0=R.int(-3,3),y0=R.int(-3,4);const m1=R.pick([1,-1,2,-2]),m2=R.pick([1,-1,2,-2,3,-3]);if(m1===m2)continue;const b1=y0-m1*x0,b2=y0-m2*x0;if(Math.abs(b1)>6||Math.abs(b2)>6)continue;
    /* show as standard form a x + b y = c */const std=(m,b)=>{/* y = mx + b  ->  -m x + y = b */const a=-m;return{h:`${a===1?'':a===-1?MI:a<0?MI+Math.abs(a):a}${v('x')} + ${v('y')} = ${num(b)}`.replace('+ '+v('y'),'+ '+v('y')),t:`${a===1?'':a===-1?'-':a}x + y = ${b}`};};
    const e1=std(m1,b1),e2=std(m2,b2);
    const alts=[{l:[[m1,b1],[m2,-b2]],note:'The second line crosses the y-axis on the wrong side.'},{l:[[-m1,b1],[m2,b2]],note:'The first line slopes the wrong way.'},{l:[[m1,b1+2],[m2,b2]],note:'The first line is shifted: check where it crosses the y-axis.'}];
    const all=[{l:[[m1,b1],[m2,b2]],ok:true}].concat(alts);const keys=all.map(a=>JSON.stringify(a.l));if(new Set(keys).size!==4)continue;
    const yr=[-7,7],xr=[-6,6];const svg=a=>graphSvg(a.l.map(([m,b])=>({m,b})),{xr,yr,size:150,max:180,step:2,ystep:2,label:'two lines'});
    return mkM(R,{type:'etaSystemGraph',sub:'Graphing',stem:`Which graph represents the following two linear equations? ${e1.t} and ${e2.t}`,stemH:'Which graph represents the following two linear equations?',fig:blk(`${e1.h}<br>${e2.h}`),
      choices:all.map(a=>({t:'graph',svg:svg(a),key:JSON.stringify(a.l),ok:!!a.ok,note:a.note})),grid:true,
      explain:`Rewrite each as y = mx + b: y = ${num(m1)}x ${b1<0?'−':'+'} ${Math.abs(b1)} and y = ${num(m2)}x ${b2<0?'−':'+'} ${Math.abs(b2)}. Check each line’s y-intercept and direction; the correct pair crosses at (${x0}, ${y0}).`,params:{x0,y0,m1,m2}});}
  throw new Error('sysgraph');}

function genSlopeMatch(seed){const R=RNG(seed);
  for(let att=0;att<500;att++){const m=R.pick([Q(1,2),Q(-1,2),Q(2),Q(-2),Q(1,3),Q(-1,3),Q(3,2)]),b=R.int(-3,4);if(b===0||Math.abs(b+m.n)>5)continue;
    const fig=graphSvg([{m:qv(m),b,pts:[[0,b],[m.d,b+m.n]]}],{xr:[-5,5],yr:[-5,5],size:220,max:260,label:'given line'});
    const recip=Q(m.d*(m.n<0?-1:1),Math.abs(m.n));const opts=[{m,b,ok:true},{m:qs(Q(0),m),b,note:'Same intercept, but the slope has the wrong sign.'},{m:recip,b,note:'Slope is flipped upside down (rise and run swapped).'},{m,b:-b,note:'Same slope, but the line crosses the y-axis at the wrong place.'}];
    const keys=opts.map(o=>qT(o.m)+'|'+o.b);if(new Set(keys).size!==4)continue;
    return mkM(R,{type:'etaSlope',sub:'Graphing',stem:'Consider the graph of the function y = mx + b. Which function has the same slope and the same y-intercept as this graph?',
      stemH:`Consider the graph of the function ${v('y')} = ${v('m')}${v('x')} + ${v('b')}. Which function has the same slope and the same intercept point with the y-axis?`,fig,
      choices:opts.map(o=>({t:lineEqT(o.m,o.b),h:lineEqH(o.m,o.b),key:qT(o.m)+'|'+o.b,ok:!!o.ok,note:o.note})),
      explain:`Read the y-intercept where the line crosses the y-axis: ${b}. From there count rise over run between two grid points: ${qT(m)}. So the line is ${lineEqT(m,b)}.`,params:{m:qT(m),b}});}
  throw new Error('slope');}

/* ================= 5. same relationship (formula / words / table / graph) ================= */
const WORDS=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
const W2=n=>n<=20?WORDS[n]:String(n);
function sentence(m,b,R){const mq=qi(m);let s;
  if(mq.d===1&&mq.n>0&&b===0&&R.chance(.6)){const k=R.pick([2,3,4,5]);s=`y is equivalent to ${W2(Math.abs(mq.n)*k)} times the value of x divided by ${W2(k)}`;}
  else{const ms=(Math.abs(mq.n)===1?(mq.n<0?'the negative of the value of x':'the value of x'):`${mq.n<0?'negative ':''}${W2(Math.abs(mq.n))} times the value of x`)+(mq.d===1?'':` divided by ${W2(mq.d)}`);s=`y is equal to ${ms}${b===0?'':b>0?`, plus ${W2(b)}`:`, minus ${W2(-b)}`}`;}
  return s.charAt(0).toUpperCase()+s.slice(1)+'.';}
function tableH(m,b,xs){return `<table class="vt"><tr><th>${v('x')}</th><th>${v('y')}</th></tr>${xs.map(x=>`<tr><td>${num(x)}</td><td>${num(qv(qi(m))*x+b)}</td></tr>`).join('')}</table>`;}
function genSame(seed){const R=RNG(seed);
  for(let att=0;att<800;att++){const m=R.pick([Q(1),Q(2),Q(3),Q(-1),Q(-2),Q(1,2),Q(-3)]),b=R.pick([0,1,2,3,-1,-2,-3,4]);
    const xs=m.d===2?[0,2,4,6,8]:R.pick([[-1,0,1,2,3],[0,1,2,3,4],[-2,-1,0,1,2]]);
    const given=R.pick(['formula','words','table']);
    const sw=m.d===1&&b!==0&&Math.abs(b)<=4&&b!==m.n;const wrongs=[{m:qs(Q(0),m),b,note:'This has the slope going the wrong way.'},{m,b:b===0?2:-b,note:'Right slope, wrong starting value (y-intercept).'},{m:sw?Q(b):qa(m,Q(1)),b:sw?m.n:b,note:sw?'This mixes up the slope and the intercept.':'Same start, but y changes by a different amount each step.'}];
    const fs=[{m,b,ok:true}].concat(wrongs);if(new Set(fs.map(f=>qT(f.m)+'|'+f.b)).size!==4)continue;
    /* choice kinds: never the same kind as the given */
    const kinds=R.shuffle(['table','graph','words','table2'].filter(k=>!(k==='words'&&given==='words')&&!(k==='table'&&given==='table'))).slice(0,4);while(kinds.length<4)kinds.push('graph2');
    const yr=fitRange(fs.map(f=>({m:f.m,b:f.b})));
    const rep=(f,k)=>{if(k==='graph'||k==='graph2'){const pts=[[0,f.b],[f.m.d,f.b+f.m.n]].map(p=>[p[0],p[1],`(${num(p[0])}, ${num(p[1])})`]);return{svg:graphSvg([{m:qv(f.m),b:f.b,pts}],{xr:[-4,4],yr,size:165,max:200,label:'graph'}),t:'graph'};}
      if(k==='words')return{h:`<p class="wds">${sentence(f.m,f.b,R)}</p>`,t:sentence(f.m,f.b,R)};
      const xs2=k==='table2'?xs.map(x=>x+(f.m.d===2?2:1)):xs;return{h:tableH(f.m,f.b,xs2),t:'table'};};
    const ch=fs.map((f,i)=>Object.assign(rep(f,kinds[i]),{key:qT(f.m)+'|'+f.b,ok:!!f.ok,note:f.note}));
    let fig,stem,stemH;
    if(given==='formula'){fig=blk(lineEqH(m,b));stemH='Which choice represents the same relationship as the given function?';}
    else if(given==='words'){fig=blk(`<p class="wds">${sentence(m,b,R)}</p>`);stemH='Which choice represents the same relationship as the information below?';}
    else{fig=blk(tableH(m,b,m.d===2?[0,2,4,6,8]:[0,1,2,3,4]));stemH='Consider the table. Which choice represents the same relationship as the given table?';}
    stem=stemH;
    return mkM(R,{type:'etaSame',sub:'Same relationship',stem,stemH,fig,grid:true,choices:ch,
      explain:`The relationship is ${lineEqT(m,b)}. Test each choice with two points: put x = 0 (you should get y = ${num(b)}) and x = ${m.d} (you should get y = ${num(b+m.n)}).`,params:{m:qT(m),b,given}});}
  throw new Error('same');}

/* ================= 6. isolate a variable ================= */
const ISO_T=[
 {sub:'C',show:()=>`${v('X')}${v('Y')} = ${fr(`${v('A')}(${v('B')} + ${v('C')})`,v('D'))} + ${fr(v('E'),v('F'))}`,vars:['X','Y','A','B','D','E','F'],
  opts:[{h:`${fr(`${v('D')}(${v('X')}${v('Y')} ${MI} ${fr(v('E'),v('F'))})`,v('A'))} ${MI} ${v('B')}`,f:g=>g.D*(g.X*g.Y-g.E/g.F)/g.A-g.B,ok:true},
        {h:`${fr(`${v('D')}(${v('X')}${v('Y')} + ${fr(v('E'),v('F'))})`,v('A'))} ${MI} ${v('B')}`,f:g=>g.D*(g.X*g.Y+g.E/g.F)/g.A-g.B,note:'The E/F term should be subtracted when you move it across.'},
        {h:`${fr(`${v('A')}(${v('X')}${v('Y')} ${MI} ${fr(v('E'),v('F'))})`,v('D'))} ${MI} ${v('B')}`,f:g=>g.A*(g.X*g.Y-g.E/g.F)/g.D-g.B,note:'A and D are swapped: multiply by D and divide by A.'},
        {h:`${fr(`${v('D')}(${v('X')}${v('Y')} ${MI} ${fr(v('E'),v('F'))})`,v('A'))} + ${v('B')}`,f:g=>g.D*(g.X*g.Y-g.E/g.F)/g.A+g.B,note:'B should be subtracted at the end, not added.'}],
  orig:(g,c)=>g.X*g.Y-(g.A*(g.B+c)/g.D+g.E/g.F),explain:'Move E/F to the left, multiply both sides by D, divide by A, then subtract B.'},
 {sub:'p₁',show:()=>`${v('M')} = ${fr(`${sub('p',1)}(${sub('p',2)} ${MI} 3)`,'4')}`,vars:['M','p2'],
  opts:[{h:fr(`4${v('M')}`,`${sub('p',2)} ${MI} 3`),f:g=>4*g.M/(g.p2-3),ok:true},{h:`${fr(`4${v('M')}`,sub('p',2))} ${MI} 3`,f:g=>4*g.M/g.p2-3,note:'You have to divide by the whole (p₂ − 3), not just p₂.'},
        {h:fr(`${v('M')}(${sub('p',2)} ${MI} 3)`,'4'),f:g=>g.M*(g.p2-3)/4,note:'That multiplies by (p₂ − 3) instead of dividing.'},{h:fr(`${sub('p',2)} ${MI} 3`,`4${v('M')}`),f:g=>(g.p2-3)/(4*g.M),note:'Upside down: 4M goes on top.'}],
  orig:(g,c)=>g.M-c*(g.p2-3)/4,explain:'Multiply both sides by 4, then divide both sides by (p₂ − 3).'},
 {sub:'Q',show:()=>`${v('Q')} = ${fr(1,v('r'))}&emsp;&emsp;${v('r')} = ${fr(v('n'),'2π')}`,vars:['n'],
  opts:[{h:fr('2π',v('n')),f:g=>2*Math.PI/g.n,ok:true},{h:fr(v('n'),'2π'),f:g=>g.n/(2*Math.PI),note:'That is r itself; Q is 1 over r.'},{h:fr(1,`2π${v('n')}`),f:g=>1/(2*Math.PI*g.n),note:'Dividing by a fraction flips it: 1 ÷ n/2π = 2π/n.'},{h:`2π${v('n')}`,f:g=>2*Math.PI*g.n,note:'n belongs on the bottom.'}],
  orig:(g,c)=>c-1/(g.n/(2*Math.PI)),explain:'Put r into Q = 1/r: Q = 1 ÷ (n/2π). Dividing by a fraction flips it, so Q = 2π/n.'},
 {sub:'c',show:()=>`${v('E')} = ${v('m')}${v('c')}${sup(2)}`,vars:['E','m'],
  opts:[{h:sq(fr(v('E'),v('m'))),f:g=>Math.sqrt(g.E/g.m),ok:true},{h:fr(v('E'),`2${v('m')}`),f:g=>g.E/(2*g.m),note:'Squared means times itself, not times 2: undo it with a square root.'},{h:sq(`${v('E')}${v('m')}`),f:g=>Math.sqrt(g.E*g.m),note:'Divide by m before taking the root.'},{h:fr(sq(v('E')),v('m')),f:g=>Math.sqrt(g.E)/g.m,note:'The square root has to cover m too.'}],
  orig:(g,c)=>g.E-g.m*c*c,explain:'Divide both sides by m, then take the square root of both sides.'},
 {sub:'R',show:()=>`${v('P')} = ${fr(`${v('V')}${sup(2)}`,v('R'))}`,vars:['P','V'],
  opts:[{h:fr(`${v('V')}${sup(2)}`,v('P')),f:g=>g.V*g.V/g.P,ok:true},{h:fr(v('P'),`${v('V')}${sup(2)}`),f:g=>g.P/(g.V*g.V),note:'Upside down: V² goes on top.'},{h:`${v('P')}${v('V')}${sup(2)}`,f:g=>g.P*g.V*g.V,note:'P should divide, not multiply.'},{h:fr(v('V'),v('P')),f:g=>g.V/g.P,note:'Lost the square on V.'}],
  orig:(g,c)=>g.P-g.V*g.V/c,explain:'Multiply both sides by R, then divide both sides by P.'},
 {sub:'C',show:()=>`${v('F')} = ${fr(9,5)}${v('C')} + 32`,vars:['F'],
  opts:[{h:`${fr(5,9)}(${v('F')} ${MI} 32)`,f:g=>5/9*(g.F-32),ok:true},{h:`${fr(9,5)}(${v('F')} ${MI} 32)`,f:g=>9/5*(g.F-32),note:'Multiply by the flipped fraction (5/9) to undo 9/5.'},{h:`${fr(5,9)}${v('F')} ${MI} 32`,f:g=>5/9*g.F-32,note:'Subtract 32 first, then multiply all of it by 5/9.'},{h:`${fr(5,9)}(${v('F')} + 32)`,f:g=>5/9*(g.F+32),note:'Moving +32 across makes it −32.'}],
  orig:(g,c)=>g.F-(9/5*c+32),explain:'Subtract 32 from both sides, then multiply by 5/9 (the flip of 9/5).'},
 {sub:'v',show:()=>`${v('a')} = ${fr(`${v('v')} ${MI} ${v('u')}`,v('t'))}`,vars:['a','u','t'],
  opts:[{h:`${v('a')}${v('t')} + ${v('u')}`,f:g=>g.a*g.t+g.u,ok:true},{h:`${v('a')}${v('t')} ${MI} ${v('u')}`,f:g=>g.a*g.t-g.u,note:'Moving −u across makes it +u.'},{h:fr(`${v('a')} + ${v('u')}`,v('t')),f:g=>(g.a+g.u)/g.t,note:'Multiply by t first: a·t = v − u.'},{h:`${v('u')} ${MI} ${v('a')}${v('t')}`,f:g=>g.u-g.a*g.t,note:'Signs are reversed.'}],
  orig:(g,c)=>g.a-(c-g.u)/g.t,explain:'Multiply both sides by t, then add u to both sides.'},
 {sub:'R',show:()=>`${fr(1,v('R'))} = ${fr(1,sub('R',1))} + ${fr(1,sub('R',2))}`,vars:['R1','R2'],
  opts:[{h:fr(`${sub('R',1)}${sub('R',2)}`,`${sub('R',1)} + ${sub('R',2)}`),f:g=>g.R1*g.R2/(g.R1+g.R2),ok:true},{h:`${sub('R',1)} + ${sub('R',2)}`,f:g=>g.R1+g.R2,note:'You can’t flip each fraction separately.'},{h:fr(`${sub('R',1)} + ${sub('R',2)}`,`${sub('R',1)}${sub('R',2)}`),f:g=>(g.R1+g.R2)/(g.R1*g.R2),note:'That is 1/R; flip it to get R.'},{h:fr(`${sub('R',1)}${sub('R',2)}`,`${sub('R',1)} ${MI} ${sub('R',2)}`),f:g=>g.R1*g.R2/(g.R1-g.R2),note:'The bottom is a sum, not a difference.'}],
  orig:(g,c)=>1/c-(1/g.R1+1/g.R2),explain:'Add the fractions on the right over a common bottom: (R₂ + R₁)/(R₁R₂). Then flip both sides.'}];
function genIsolate(seed){const R=RNG(seed);const tp=R.pick(ISO_T);
  /* numeric check: the correct formula satisfies the original, the others don't */
  for(let k=0;k<5;k++){const g={};tp.vars.forEach(x=>g[x]=2+R.f()*7);if(tp.vars.includes('p2'))g.p2=4+R.f()*6;
    tp.opts.forEach(o=>{const c=o.f(g);const r=Math.abs(tp.orig(g,c));if(o.ok?r>1e-7:r<1e-7)throw new Error('isolate check '+tp.sub);});}
  return mkM(R,{type:'etaIsolate',sub:'Isolating a variable',stem:`Isolate ${tp.sub} from the formula.`,stemH:`Isolate ${v(tp.sub.replace('₁',''))}${tp.sub.includes('₁')?'<sub>1</sub>':''} from the formula:`,fig:blk(tp.show()),
    choices:tp.opts.map((o,i)=>({t:'choice '+i,h:`${v(tp.sub.replace('₁',''))}${tp.sub.includes('₁')?'<sub>1</sub>':''} = ${o.h}`,key:'o'+i,ok:!!o.ok,note:o.note})),explain:tp.explain,params:{t:ISO_T.indexOf(tp)}});}

/* ================= 7. proportions & systems ================= */
function genProportion(seed){const R=RNG(seed);
  for(let att=0;att<3000;att++){const a=R.int(1,8),m=a+R.int(1,6),bb=m+R.int(1,8);const g=gcdI(m-a,bb-m);const p=(m-a)/g,q=(bb-m)/g;const k=R.pick([1,2,3]);if(p===q)continue;
    /* wrong-way solve: q(m − a) = p(m − b) */const wrongD=q-p;let w1=null;if(wrongD!==0&&(q*a-p*bb)%wrongD===0)w1=(q*a-p*bb)/wrongD;
    const flipD=p+q;const w2=(p*a+q*bb)%flipD===0?(p*a+q*bb)/flipD:null;/* fraction flipped */
    const vals=[m];[w1,w2,m+1,m-1,m+2].forEach(x=>{if(x!=null&&x>0&&!vals.includes(x)&&vals.length<4)vals.push(x);});if(vals.length<4)continue;
    const notes={};notes[w1]='Sign slip when cross-multiplying the (16 − m) side.';notes[w2]='Cross-multiplied with the fraction flipped.';
    return mkM(R,{type:'etaProp',sub:'Proportions & systems',stem:`Solve the proportion. Which value of m is correct? (m − ${a})/(${bb} − m) = ${p*k}/${q*k}`,stemH:`Solve the proportion. Which value of ${v('m')} is correct?`,
      fig:blk(`${fr(`${v('m')} ${MI} ${a}`,`${bb} ${MI} ${v('m')}`)} = ${fr(p*k,q*k)}`),choices:vals.map(x=>({t:String(x),key:x,ok:x===m,note:(notes[x]||'Put it back in: the two fractions aren’t equal.').replace('(16 − m)',`(${bb} − m)`)})),
      explain:`Cross-multiply: ${q*k}(m − ${a}) = ${p*k}(${bb} − m). Solve: m = ${m}. Check: (${m} − ${a})/(${bb} − ${m}) = ${m-a}/${bb-m}, which equals ${p*k}/${q*k}.`,params:{a,b:bb,p,q,k}});}
  throw new Error('prop');}
function genSystem(seed){const R=RNG(seed);
  for(let att=0;att<3000;att++){const x=R.int(-3,5),y=R.int(-3,5);if(x===y)continue;const a1=R.int(1,4),b1=R.pick([1,2,3,-1,-2]),a2=R.int(1,5),b2=R.pick([1,-1,2,-2,3]);if(a1*b2-a2*b1===0)continue;
    const c1=a1*x+b1*y,c2=a2*x+b2*y;
    /* a decoy that satisfies only the first equation */let dec=null;for(let t=-4;t<=4&&!dec;t++){const xx=x+t*b1,yy=y-t*a1;if(t&&Math.abs(xx)<=8&&Math.abs(yy)<=8&&a2*xx+b2*yy!==c2)dec=[xx,yy];}
    const cand=[[x,y],[y,x],[x,-y],dec].filter(Boolean);const keys=cand.map(p=>p.join(','));if(new Set(keys).size!==4)continue;
    const eq=(a,b,c)=>`${a===1?'':a}${v('x')} ${b<0?MI:'+'} ${Math.abs(b)===1?'':Math.abs(b)}${v('y')} = ${num(c)}`;const eqT=(a,b,c)=>`${a===1?'':a}x ${b<0?'-':'+'} ${Math.abs(b)===1?'':Math.abs(b)}y = ${c}`;
    const notes=['x and y are swapped.','Sign error on y.','This works in the first equation but not the second.'];
    return mkM(R,{type:'etaSystem',sub:'Proportions & systems',stem:`Solve the following system of equations. Which ordered pair (x, y) is the solution? ${eqT(a1,b1,c1)}; ${eqT(a2,b2,c2)}`,stemH:`Solve the following system of equations. Which ordered pair (${v('x')}, ${v('y')}) is the solution?`,
      fig:blk(`${eq(a1,b1,c1)}<br>${eq(a2,b2,c2)}`),choices:cand.map((p,i)=>({t:`(${num(p[0])}, ${num(p[1])})`,key:p.join(','),ok:i===0,note:notes[i-1]})),
      explain:`Quickest check: put each pair into BOTH equations. (${x}, ${y}): ${a1}(${x}) + ${b1}(${y}) = ${c1} ✓ and ${a2}(${x}) + ${b2}(${y}) = ${c2} ✓.`.replace(/\+ -/g,'− '),params:{x,y,a1,b1,a2,b2}});}
  throw new Error('system');}

/* ================= test plan ================= */
const MATH_GENS={etaSeries:genSeries,etaSolve:genSolve,etaEval:genEval,etaPoly:genPoly,etaRelation:genRelation,etaSame:genSame,etaGraph:genGraphPick,etaSystemGraph:genSystemGraph,etaSlope:genSlopeMatch,etaIsolate:genIsolate,etaProp:genProportion,etaSystem:genSystem};
/* per 33: plug-in 6 (solve 3 + eval 3), series 5, polynomials 5, relationships 6, same relationship 4, graphing 3, isolate 2, proportion/system 2 */
const PLAN33=[['etaSolve',3],['etaEval',3],['etaSeries',5],['etaPoly',5],['etaRelation',6],['etaSame',4],['etaGraph',1],['etaSystemGraph',1],['etaSlope',1],['etaIsolate',2],['etaProp',1],['etaSystem',1]];
function buildMath(code,n){n=Math.max(1,Math.min(150,n||33));const R=RNG(hashSeed('eta',code));let list=[];
  while(list.length<n){PLAN33.forEach(([t,k])=>{for(let i=0;i<k;i++)list.push(t);});}
  list=R.shuffle(list).slice(0,n);
  /* spread out same-type questions so they don't bunch up */
  for(let pass=0;pass<4;pass++)for(let i=1;i<list.length;i++)if(list[i]===list[i-1]){const j=list.findIndex((t,k)=>k>i+1&&t!==list[i]&&t!==list[i-1]&&(k+1>=list.length||list[k+1]!==list[i]));if(j>0)[list[i],list[j]]=[list[j],list[i]];}
  const seen=new Set();
  return list.map((t,i)=>{let it,s=0;do{it=MATH_GENS[t](hashSeed(code,'eta',t,i,s++));}while(seen.has(it.stem+'|'+JSON.stringify(it.params))&&s<40);seen.add(it.stem+'|'+JSON.stringify(it.params));it.id='E'+(i+1);return it;});}
return{buildMath,MATH_GENS,Q,qv,num};})();
