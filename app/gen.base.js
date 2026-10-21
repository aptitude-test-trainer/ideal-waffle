(function (root) {
'use strict';
/* ================= utilities ================= */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashSeed(){let h=2166136261>>>0;for(let k=0;k<arguments.length;k++){const s=String(arguments[k]);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}h^=124;h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function RNG(seed){const f=mulberry32(seed);return{f,int:(a,b)=>a+Math.floor(f()*(b-a+1)),pick:a=>a[Math.floor(f()*a.length)],chance:p=>f()<p,shuffle(arr){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(f()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;}};}
const P=n=>Math.round(n*10)/10;
const isInt=n=>Number.isInteger(n);
const LET='ABCDEFGH';
const fmt=n=>isInt(n)?String(n):String(Math.round(n*100)/100);
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function svgWrap(w,h,body,label){return `<svg class="fig" viewBox="0 0 ${P(w)} ${P(h)}" style="max-width:${Math.round(w)}px" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;}
function T(x,y,s,cls,anchor){return `<text x="${P(x)}" y="${P(y)}" class="${cls||'lbl'}" text-anchor="${anchor||'middle'}">${esc(s)}</text>`;}
function L(x1,y1,x2,y2,cls){return `<line x1="${P(x1)}" y1="${P(y1)}" x2="${P(x2)}" y2="${P(y2)}" class="${cls||'ink'}"/>`;}
function C(cx,cy,r,cls){return `<circle cx="${P(cx)}" cy="${P(cy)}" r="${P(r)}" class="${cls||'ink'}"/>`;}
function Rect(x,y,w,h,cls,rx){return `<rect x="${P(x)}" y="${P(y)}" width="${P(w)}" height="${P(h)}" class="${cls||'ink'}"${rx?` rx="${rx}"`:''}/>`;}
function Poly(pts,cls){return `<polygon points="${pts.map(p=>P(p[0])+','+P(p[1])).join(' ')}" class="${cls}"/>`;}
function head(x,y,ang,size,cls){size=size||10;const a1=ang+Math.PI*0.83,a2=ang-Math.PI*0.83;return Poly([[x,y],[x+size*Math.cos(a1),y+size*Math.sin(a1)],[x+size*Math.cos(a2),y+size*Math.sin(a2)]],cls||'acc-f');}
function arcArrow(cx,cy,R,mid,span,cw){const a0=cw?mid-span/2:mid+span/2;const a1=cw?a0+span:a0-span;const p0=[cx+R*Math.cos(a0),cy+R*Math.sin(a0)],p1=[cx+R*Math.cos(a1),cy+R*Math.sin(a1)];const tang=cw?a1+Math.PI/2:a1-Math.PI/2;
  return `<path class="acc" d="M${P(p0[0])} ${P(p0[1])} A${P(R)} ${P(R)} 0 0 ${cw?1:0} ${P(p1[0])} ${P(p1[1])}"/>`+head(p1[0]+5*Math.cos(tang),p1[1]+5*Math.sin(tang),tang,12);}
function arrow(x1,y1,x2,y2,cls){const a=Math.atan2(y2-y1,x2-x1);return L(x1,y1,x2-7*Math.cos(a),y2-7*Math.sin(a),cls||'acc')+head(x2,y2,a,12,cls==='ink-a'?'ink-fill':'acc-f');}
function hdim(x1,x2,y,label){return L(x1,y,x2,y,'dim')+L(x1,y-5,x1,y+5,'dim')+L(x2,y-5,x2,y+5,'dim')+T((x1+x2)/2,y-6,label,'lbl-s');}
function vdim(x,y1,y2,label,side){side=side||1;return L(x,y1,x,y2,'dim')+L(x-5,y1,x+5,y1,'dim')+L(x-5,y2,x+5,y2,'dim')+T(x+side*8,(y1+y2)/2+4,label,'lbl-s',side>0?'start':'end');}
function slopeLabel(x1,y1,x2,y2,t,off){const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy);return T((x1+x2)/2+dy/l*off,(y1+y2)/2-dx/l*off+4,t,'lbl-s');}
function ceiling(x1,x2,y){let s=Rect(x1,y-10,x2-x1,10,'metal');for(let hx=x1+4;hx<x2-4;hx+=11)s+=L(hx,y-10,hx+7,y-17,'hatch');return s;}
function ground(x1,x2,y){let s=L(x1,y,x2,y,'ground');for(let hx=x1+4;hx<x2-4;hx+=11)s+=L(hx,y,hx-7,y+7,'hatch');return s;}
/* animation hooks: <g class="mv" data-a="ops"> wrappers read by the generic animator; they never change the still drawing */
const R2=n=>Math.round(n*100)/100;
function MV(a,s){return `<g class="mv" data-a="${a}">${s}</g>`;}
/* path op with true timing: pts are offsets sampled at equal time steps (pts[0]=[0,0]). The animator moves at constant speed along the
   polyline, so slow stretches get sub-pixel forward-and-back wiggles that use up the spare length and keep arc length even in time. */
function timedPath(pts){const st=[];let c=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);st.push(d);c=Math.max(c,d);}
  let lu=null;for(let i=1;i<pts.length&&!lu;i++)if(st[i-1]>1e-9)lu=[(pts[i][0]-pts[i-1][0])/st[i-1],(pts[i][1]-pts[i-1][1])/st[i-1]];lu=lu||[1,0];const out=[];
  for(let i=1;i<pts.length;i++){const p=pts[i],q=pts[i-1],d=st[i-1];if(d>1e-9)lu=[(p[0]-q[0])/d,(p[1]-q[1])/d];const e=(c-d)/2;if(e>0.01)out.push([p[0]+lu[0]*e,p[1]+lu[1]*e]);out.push(p);}
  return 'path:'+out.map(p=>R2(p[0])+','+R2(p[1])).join(',');}
/* block and tackle: rope speed (px/s, ground frame) in each segment when the moving block rises at v; segment n-1 runs to the pull end */
function tackleRopeV(n,endsTop,v){const sp=[];let x=n*v;for(let i=n-1;i>=0;i--){sp[i]=x;if(i>0&&!endsTop(i-1))x-=2*v;}return sp;}
/* ---- animation hooks: <g class="mv" data-a="..."> wrappers read by the generic animator (nb5.js). They never change the drawing.
   A "series" {w,terms:[[amp,hz]]} is a motion value  w*t + Σ amp*sin(2π hz t)  over the 9 s run (rad for turning, px for sliding).
   Steady turning is a plain rot; uneven turning (stop-and-go, rocking, coasting) is a fitted series of rot + osc terms.
   Sliding is built from pairs of equal and opposite turns about two points (a pure shift), so it stays in step with the turning parts. ---- */
const MV_T=9;
const nf=x=>String(+(+x).toFixed(4));
function mvg(a,inner){return a?`<g class="mv" data-a="${a}">${inner}</g>`:inner;}
function aRot(cx,cy,w){return `rot:${P(cx)},${P(cy)},${nf(w)}`;}
function aSer(cx,cy,s,k){k=k||1;const o=[];if(Math.abs(s.w*k)>1e-6)o.push(`rot:${P(cx)},${P(cy)},${nf(s.w*k)}`);s.terms.forEach(([a,h])=>{const d=a*k*180/Math.PI;if(Math.abs(d)>=0.01)o.push(`osc:${P(cx)},${P(cy)},${nf(d)},${nf(h)}`);});return o.join(';');}
function fitSer(f,K){const N=1800,T=MV_T,w=f(T)/T,g=[];for(let i=0;i<=N;i++){const t=i*T/N;g.push(f(t)-w*t);}
  const terms=[];for(let k=1;k<=K;k++){let s=0;for(let i=0;i<=N;i++)s+=(i===0||i===N?0.5:1)*g[i]*Math.sin(Math.PI*k*i/N);terms.push([2*s/N,k/(2*T)]);}
  return {w,terms};}
function linSer(w){return {w,terms:[]};}
function aSlide(dx,dy,s,V){const l=Math.hypot(dx,dy);if(!l)return '';const ux=dx/l,uy=dy/l;V=V||400;const k=2/V,v=[uy*V,-ux*V],u=[-uy*V/4,ux*V/4];
  return [aSer(0,0,s,k),aSer(v[0],v[1],s,-k),aSer(0,0,s,2*k),aSer(u[0],u[1],s,-2*k)].filter(Boolean).join(';');}
function aCircle(cx,cy,px,py,w){return `rot:${P(cx)},${P(cy)},${nf(w)};rot:${P(px)},${P(py)},${nf(-w)}`;}
function mvWrap(str,frag,ops){const i=str.indexOf(frag);if(i<0||!ops)return str;return str.slice(0,i)+mvg(ops,frag)+str.slice(i+frag.length);}
function beltFlow(l,c,w){const t=Math.atan2(l[1]-c.y,l[0]-c.x),vx=-w*c.r*Math.sin(t),vy=w*c.r*Math.cos(t),dx=l[2]-l[0],dy=l[3]-l[1];return 'flow:'+nf((vx*dx+vy*dy)/Math.hypot(dx,dy));}

function mk(o){
  const matches=o.choices.map((c,i)=>JSON.stringify(c.key)===JSON.stringify(o.answer)?i:-1).filter(i=>i>=0);
  if(matches.length!==1)throw new Error('item '+o.type+' has '+matches.length+' correct choices');
  const keys=o.choices.map(c=>JSON.stringify(c.key));
  if(new Set(keys).size!==keys.length)throw new Error('duplicate choices in '+o.type);
  o.choices[matches[0]].note=null;
  return {type:o.type,skill:o.skill||'Mechanical',sub:o.sub,diff:o.diff,stem:o.stem,svg:o.svg,choices:o.choices,correct:matches[0],explain:o.explain,params:o.params};
}
function numChoices(list,unit){const h=hashSeed(JSON.stringify(list.map(c=>c.v)));return list.slice().sort((a,b)=>hashSeed(h,a.v)-hashSeed(h,b.v)).map(c=>({t:fmt(c.v)+(unit?' '+unit:''),key:c.v,note:c.note||null}));}
const DIR_CH=(wrongDirNote,noneNote)=>[{t:'Clockwise',key:'cw'},{t:'Counterclockwise',key:'ccw'},{t:'It will not turn',key:'none'}];
function dirWord(k){return k==='cw'?'clockwise':'counterclockwise';}
function cmpChoices(noun,sameText,notes){return [{t:noun+' A',key:'A',note:notes.A||null},{t:noun+' B',key:'B',note:notes.B||null},{t:sameText,key:'same',note:notes.same||null}];}

/* ================= gears ================= */
function gearPath(cx,cy,r,n,phase,m){const a=0.95*m,step=2*Math.PI/n,pts=[];
  for(let k=0;k<n;k++){const c=phase+k*step;for(const [t,rr] of [[c-0.30*step,r-a],[c-0.15*step,r+a],[c+0.15*step,r+a],[c+0.30*step,r-a]])pts.push([cx+rr*Math.cos(t),cy+rr*Math.sin(t)]);}
  return Poly(pts,'gear');}
function meshPhase(p,c){const th=Math.atan2(c.y-p.y,c.x-p.x);const sp=2*Math.PI/p.n,sc=2*Math.PI/c.n;let fr=((th-p.phase)/sp)%1;if(fr<0)fr+=1;c.phase=th+Math.PI-((fr+0.5)%1)*sc;}
function drawGear(g,m,label){return gearPath(g.x,g.y,g.r,g.n,g.phase,m)+C(g.x,g.y,Math.min(13,g.r*0.5),'hub')+(label?T(g.x,g.y+5,label,'glbl'):'');}

function genGearDir(seed,diff){
  const R=RNG(seed),m=5,a=0.95*m;
  for(let att=0;att<800;att++){
    const jam=diff>=3&&R.chance(0.4);
    const count=diff===1?R.int(2,3):diff===2?R.int(4,5):diff>=4?(jam?R.int(4,6):R.int(6,7)):(jam?R.int(3,5):R.int(5,6));
    const mkG=()=>{const n=R.pick([10,12,14,16,18,20,22,24]);return{n,r:n*m/2};};
    const gs=[Object.assign(mkG(),{x:0,y:0})],edges=[];let bad=false;
    for(let i=1;i<count;i++){const g=mkG();
      if(jam&&i===2){const g0=gs[0],g1=gs[1],d=Math.hypot(g1.x-g0.x,g1.y-g0.y),A=g0.r+g.r,B=g1.r+g.r,x=(A*A-B*B+d*d)/(2*d),h2=A*A-x*x;if(h2<=0){bad=true;break;}
        const h=Math.sqrt(h2),ux=(g1.x-g0.x)/d,uy=(g1.y-g0.y)/d,sd=R.chance(.5)?1:-1;g.x=g0.x+ux*x-uy*h*sd;g.y=g0.y+uy*x+ux*h*sd;edges.push([0,2],[1,2]);}
      else{const p=gs[i-1],th=(R.f()*80-40)*Math.PI/180;g.x=p.x+(p.r+g.r)*Math.cos(th);g.y=p.y+(p.r+g.r)*Math.sin(th);edges.push([i-1,i]);}
      gs.push(g);}
    if(bad)continue;
    let ok=true;
    for(let i=0;i<gs.length&&ok;i++)for(let j=i+1;j<gs.length;j++){const d=Math.hypot(gs[i].x-gs[j].x,gs[i].y-gs[j].y),s=gs[i].r+gs[j].r;
      const e=edges.some(q=>(q[0]===i&&q[1]===j)||(q[0]===j&&q[1]===i));if(e?Math.abs(d-s)>1e-6:d<s+2*a+10){ok=false;break;}}
    if(!ok)continue;
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const g of gs){x0=Math.min(x0,g.x-g.r-a);y0=Math.min(y0,g.y-g.r-a);x1=Math.max(x1,g.x+g.r+a);y1=Math.max(y1,g.y+g.r+a);}
    const pad=40,W=x1-x0+2*pad,H=y1-y0+2*pad;if(W>620||H>330)continue;
    gs.forEach(g=>{g.x=P(g.x-x0+pad);g.y=P(g.y-y0+pad);});
    // recompute exact mesh distances after rounding is irrelevant for logic; store rounded coords + edges
    const adj=gs.map(()=>[]);edges.forEach(([i,j])=>{adj[i].push(j);adj[j].push(i);});
    const cw=R.chance(.5),dir=gs.map(()=>0),par=gs.map(()=>-1);dir[0]=cw?1:-1;const q=[0];let conflict=false;gs[0].phase=R.f()*6.283;
    while(q.length){const u=q.shift();for(const v of adj[u]){if(dir[v]===0){dir[v]=-dir[u];par[v]=u;meshPhase(gs[u],gs[v]);q.push(v);}else if(dir[v]===dir[u])conflict=true;}}
    const target=count-1,ans=conflict?'none':(dir[target]===1?'cw':'ccw');
    let body='';gs.forEach((g,i)=>body+=drawGear(g,m,LET[i]));
    const b=gs[1],mid=Math.atan2(gs[0].y-b.y,gs[0].x-b.x);body+=arcArrow(gs[0].x,gs[0].y,gs[0].r+a+11,mid,1.3,cw);
    let explain;
    if(conflict)explain=`Gears A, B and C all mesh with each other. B must turn opposite to A, and C must turn opposite to both A and B, which is impossible. Three gears meshed in a loop lock up, so gear ${LET[target]} will not turn.`;
    else{const path=[];for(let v=target;v!==-1;v=par[v])path.unshift(v);
      explain=`Every time two gears mesh, the direction flips. `+path.map(v=>`${LET[v]} ${dir[v]===1?'clockwise':'counterclockwise'}`).join(' → ')+`. Quick check: ${path.length} gears in the chain, ${path.length%2?'odd count, so the last one turns the same way as A':'even count, so the last one turns opposite to A'}.`;}
    const ch=[{t:'Clockwise',key:'cw'},{t:'Counterclockwise',key:'ccw'},{t:'It will not turn',key:'none'}];
    ch.forEach(c=>{if(c.key===ans)return;c.note=conflict?'Missed the closed loop: A, B and C all touch, and three gears meshed in a loop jam.':(c.key==='none'?'This is a simple chain with no closed loop, so every gear turns freely.':'Off by one flip. Each meshing pair reverses direction; count the gears along the chain.');});
    return mk({type:'gearDir',sub:'Gear direction',diff,stem:`Gear A turns ${cw?'clockwise':'counterclockwise'}, as shown by the arrow. Which way does gear ${LET[target]} turn?`,
      svg:svgWrap(W,H,body,`${count} meshed gears labeled A to ${LET[count-1]}`),choices:ch,answer:ans,explain,
      params:{gears:gs.map(g=>({x:g.x,y:g.y,r:g.r,n:g.n})),edges,cw,target}});
  }
  throw new Error('gearDir failed');
}

function genGearSpeed(seed,diff){
  if(diff>=4)return genGearSpeed4(seed);
  const R=RNG(seed),m=3.2,a=0.95*m,TT=[12,15,16,18,20,24,30,32,36,40,45,48,60],RPM=[20,30,40,45,60,80,90,100,120,150,180,240,300];
  let t1,t2,ti=null,rpm,ans,inv,di;
  for(let att=0;;att++){if(att>5000)throw new Error('gearSpeed');
    t1=R.pick(TT);t2=R.pick(TT);if(t1===t2)continue;if(Math.max(t1,t2)/Math.min(t1,t2)>3)continue;rpm=R.pick(RPM);ans=rpm*t1/t2;inv=rpm*t2/t1;
    if(!isInt(ans)||!isInt(inv))continue;
    if(diff>=3){ti=R.pick(TT.filter(t=>t!==t1&&t!==t2&&t<=36));di=rpm*t1/ti;if(!isInt(di)||di===ans||di===inv)continue;}
    break;}
  const gs=[{n:t1},{n:t2}];if(ti)gs.splice(1,0,{n:ti});
  gs.forEach(g=>g.r=g.n*m/2);const maxR=Math.max(...gs.map(g=>g.r));const cy=38+maxR+a;let x=30+gs[0].r+a;
  gs.forEach((g,i)=>{if(i>0)x+=gs[i-1].r+g.r;g.x=x;g.y=cy;});gs[0].phase=R.f()*6.283;for(let i=1;i<gs.length;i++)meshPhase(gs[i-1],gs[i]);
  const W=x+gs[gs.length-1].r+a+30,ly=cy+maxR+a+22;let body='';
  const names=ti?['A','Idler','B']:['A','B'];
  gs.forEach((g,i)=>{body+=drawGear(g,m,names[i]==='Idler'?'':names[i]);body+=T(g.x,ly,names[i]==='Idler'?'Idler':'Gear '+names[i],'lbl-b')+T(g.x,ly+17,g.n+' teeth','lbl');
    if(i===0)body+=T(g.x,ly+34,rpm+' rpm','lbl-acc');if(i===gs.length-1)body+=T(g.x,ly+34,'? rpm','lbl-acc');});
  body+=arcArrow(gs[0].x,gs[0].y,gs[0].r+a+10,-Math.PI/2-0.5,1.2,true);
  const list=[{v:ans},{v:inv,note:'Flipped the ratio. The gear with more teeth turns slower, not faster.'}];
  if(ti)list.push({v:di,note:'Used the idler’s teeth. An idler only changes direction; speed depends on the first and last gears.'});
  else list.push({v:rpm,note:'Meshed gears of different sizes don’t turn at the same speed.'});
  return mk({type:'gearSpeed',sub:'Gear speed',diff,stem:`Gear A has ${t1} teeth and turns at ${rpm} rpm.${ti?` It drives an idler gear with ${ti} teeth, which drives`:' It drives'} gear B, which has ${t2} teeth. How fast does gear B turn?`,
    svg:svgWrap(W,ly+44,body,'gear train with tooth counts'),choices:numChoices(list,'rpm'),answer:ans,
    explain:`For meshed gears, teeth × rpm stays the same. ${t1} × ${rpm} = ${t1*rpm}. Gear B: ${t1*rpm} ÷ ${t2} = ${fmt(ans)} rpm.${ti?' The idler cancels out; it only makes A and B turn the same direction.':''} Sanity check: B has ${t2>t1?'more':'fewer'} teeth, so it turns ${t2>t1?'slower':'faster'}.`,
    params:{t1,t2,ti,rpm}});
}

/* ================= belts ================= */
function beltLines(c1,c2,crossed){const dx=c2.x-c1.x,dy=c2.y-c1.y,d=Math.hypot(dx,dy),phi=Math.atan2(dy,dx),out=[];
  for(const s of [1,-1]){if(!crossed){const al=Math.acos((c1.r-c2.r)/d),t=phi+s*al;out.push([c1.x+c1.r*Math.cos(t),c1.y+c1.r*Math.sin(t),c2.x+c2.r*Math.cos(t),c2.y+c2.r*Math.sin(t)]);}
    else{const al=Math.acos((c1.r+c2.r)/d),t=phi+s*al;out.push([c1.x+c1.r*Math.cos(t),c1.y+c1.r*Math.sin(t),c2.x-c2.r*Math.cos(t),c2.y-c2.r*Math.sin(t)]);}}
  return out;}
function drawPulleyWheel(p,label){return C(p.x,p.y,p.r,'wheel')+C(p.x,p.y,p.r-6,'ink-thin')+C(p.x,p.y,Math.max(10,p.r*0.32),'hub')+(label?T(p.x,p.y+5,label,'glbl'):'');}
function genBeltDir(seed,diff){
  const R=RNG(seed),count=diff>=3?3:2,ps=[];let x=0;
  for(let i=0;i<count;i++){const r=R.pick([22,28,34,40,48]);if(i>0)x+=ps[i-1].r+r+R.int(70,120);ps.push({x,y:R.int(-18,18),r});}
  const belts=[];for(let i=0;i<count-1;i++)belts.push(diff===1?R.pick(['open','crossed']):R.pick(['open','crossed','crossed']));
  const cw=R.chance(.5);const pad=46,maxR=Math.max(...ps.map(p=>p.r));
  const miny=Math.min(...ps.map(p=>p.y-p.r)),maxy=Math.max(...ps.map(p=>p.y+p.r));
  ps.forEach(p=>{p.x+=pad+ps[0].r;p.y+=pad-miny;});
  const W=ps[count-1].x+ps[count-1].r+pad,H=maxy-miny+2*pad;
  /* motion: A turns as its arrow shows; open belt same sense, crossed belt opposite, rim speeds equal (w ∝ 1/r) */
  const wd=[cw?0.7:-0.7];for(let i=1;i<count;i++)wd.push((belts[i-1]==='crossed'?-1:1)*wd[i-1]*ps[i-1].r/ps[i].r);
  let body='';for(let i=0;i<count-1;i++)for(const l of beltLines(ps[i],ps[i+1],belts[i]==='crossed'))body+=mvg(beltFlow(l,ps[i],wd[i]),L(l[0],l[1],l[2],l[3],'belt'));
  ps.forEach((p,i)=>body+=mvg(aRot(p.x,p.y,wd[i]),drawPulleyWheel(p))+T(p.x,p.y+5,LET[i],'glbl'));
  body+=arcArrow(ps[0].x,ps[0].y,ps[0].r+14,Math.PI,1.2,cw);
  const flips=belts.filter(b=>b==='crossed').length;const same=flips%2===0;const ans=same?(cw?'cw':'ccw'):(cw?'ccw':'cw');
  const ch=[{t:'Clockwise',key:'cw'},{t:'Counterclockwise',key:'ccw'},{t:'It will not turn',key:'none'}];
  ch.forEach(c=>{if(c.key===ans)return;c.note=c.key==='none'?'A tight belt carries the motion, so the pulley turns.':'An open belt keeps the same direction; a crossed belt reverses it. Check each belt.';});
  const desc=belts.map((b,i)=>`${LET[i]}→${LET[i+1]} ${b}`).join(', ');
  return mk({type:'beltDir',sub:'Belt direction',diff,stem:`Pulley A turns ${cw?'clockwise':'counterclockwise'}. Which way does pulley ${LET[count-1]} turn?`,
    svg:svgWrap(W,H,body,'pulleys connected by belts'),choices:ch,answer:ans,
    explain:`Open belt: same direction. Crossed belt: opposite direction. Here: ${desc}. ${flips} crossed belt${flips===1?'':'s'}, so ${LET[count-1]} turns ${dirWord(ans)}.`,
    params:{belts,cw,pulleys:ps.map(p=>({x:p.x,y:p.y,r:p.r}))}});
}
function genBeltSpeed(seed,diff){
  const R=RNG(seed),D=[4,5,6,8,10,12,15,16];
  if(diff===1){let dA=R.pick(D),dB=R.pick(D);const eq=R.chance(0.2);if(eq)dB=dA;else while(dB===dA)dB=R.pick(D);
    const ps=[{d:dA},{d:dB}];return beltSpeedItem(R,diff,ps,null,eq?'same':(dA<dB?'A':'B'));}
  for(let att=0;;att++){if(att>5000)throw new Error('beltSpeed');const dA=R.pick(D),dB=R.pick(D);if(dA===dB)continue;const rpm=R.pick([60,90,120,150,180,240,300,360,400,600]);const ans=rpm*dA/dB,inv=rpm*dB/dA;if(!isInt(ans)||!isInt(inv))continue;
    return beltSpeedItem(R,diff,[{d:dA},{d:dB}],rpm,ans);}
}
function beltSpeedItem(R,diff,ps,rpm,ans){
  const k=4;ps.forEach(p=>p.r=p.d*k);const cy=40+Math.max(ps[0].r,ps[1].r);ps[0].x=40+ps[0].r;ps[0].y=cy;ps[1].x=ps[0].x+ps[0].r+ps[1].r+R.int(90,140);ps[1].y=cy;
  const ly=cy+Math.max(ps[0].r,ps[1].r)+24,W=ps[1].x+ps[1].r+40;let body='';
  for(const l of beltLines(ps[0],ps[1],false))body+=L(l[0],l[1],l[2],l[3],'belt');
  ps.forEach((p,i)=>{body+=drawPulleyWheel(p,LET[i])+T(p.x,ly,`${p.d} in. diameter`,'lbl');});
  if(rpm){body+=T(ps[0].x,ly+18,rpm+' rpm','lbl-acc')+T(ps[1].x,ly+18,'? rpm','lbl-acc');body+=arcArrow(ps[0].x,ps[0].y,ps[0].r+13,-Math.PI/2-0.4,1.1,true);}
  const H=ly+(rpm?30:14);
  if(!rpm){const smaller=ans;return mk({type:'beltSpeed',sub:'Belt & pulley speed',diff,stem:'Pulleys A and B are connected by a belt that does not slip. Which pulley turns faster (more turns per minute)?',
    svg:svgWrap(W,H,body,'two belted pulleys of labeled diameters'),answer:ans,
    choices:cmpChoices('Pulley','Both turn at the same speed',{A:'Picked the bigger pulley. The belt moves the same distance at both rims, so the smaller pulley must spin more times.',B:'Picked the bigger pulley. The belt moves the same distance at both rims, so the smaller pulley must spin more times.',same:'Equal speed only happens when the pulleys are the same size.'}),
    explain:ans==='same'?'Both pulleys are the same size, so each turn of one is one turn of the other.':`The belt moves the same length at both rims. The smaller pulley (${ans}, ${ps[ans==='A'?0:1].d} in.) has a shorter rim, so it must turn more times to keep up.`,params:{dA:ps[0].d,dB:ps[1].d,rpm:null}});}
  const dA=ps[0].d,dB=ps[1].d;
  return mk({type:'beltSpeed',sub:'Belt & pulley speed',diff,stem:`A ${dA}-inch pulley turning at ${rpm} rpm drives a ${dB}-inch pulley with a belt. How fast does the ${dB}-inch pulley turn?`,
    svg:svgWrap(W,H,body,'two belted pulleys'),answer:ans,
    choices:numChoices([{v:ans},{v:rpm*dB/dA,note:'Flipped the ratio. A bigger driven pulley turns slower.'},{v:rpm,note:'Belted pulleys of different sizes turn at different speeds.'}],'rpm'),
    explain:`Diameter × rpm stays the same on both pulleys: ${dA} × ${rpm} = ${dA*rpm}. Then ${dA*rpm} ÷ ${dB} = ${fmt(ans)} rpm.`,params:{dA,dB,rpm}});
}

/* ================= pulleys / block and tackle ================= */
function genPulley(seed,diff){
  if(diff>=4&&RNG(seed^77).chance(0.6))return genPulley4(seed);
  const R=RNG(seed);const n=diff===1?R.int(1,2):diff===2?R.int(2,3):R.int(3,4);const rope=diff>=2&&n>=2&&R.chance(0.35);
  const Wt=R.pick([60,120,180,240,300,360,480]);const h=R.pick([2,3,4,5,6]);
  const s=34,rad=s/2,x0=110,ceil=28,ytop=80;const xs=[];for(let i=0;i<=n;i++)xs.push(x0+i*s);
  const ybot=n>1?206:null,loadTop=n>1?null:196;const endsTop=i=>((n-1-i)%2===0);
  let body='';const topC=[],botC=[];
  for(let i=0;i<n;i++){const c=(xs[i]+xs[i+1])/2;if(endsTop(i))topC.push(c);else botC.push(c);}
  const W=xs[n]+90;body+=ceiling(40,W-30,ceil);
  // hangers for top sheaves
  topC.forEach(c=>body+=L(c,ceil,c,ytop,'strap'));
  const anchorTop=!endsTop(0);
  let plateY=null,mx0,mx1;
  // animation: the moving block rises dL px; each rope segment shifts up dL/2 (so it stays tucked against both sheaves) and its dashes march at the real rope speed
  const dL=20,vL=dL/7.65,UP=`mov:0,${-dL}`,sv=tackleRopeV(n,endsTop,vL),sIdx=c=>Math.round((c-xs[0])/s-0.5);
  if(n>1){plateY=ybot+rad+14;mx0=Math.min(xs[0],...botC.map(c=>c-rad))-10;mx1=Math.max(...botC.map(c=>c+rad))+10;if(!anchorTop)mx0=Math.min(mx0,xs[0]-10);
    botC.forEach(c=>body+=MV(UP,L(c,ybot,c,plateY,'strap')));}
  // rope
  const segs=[];let rp='';
  for(let i=0;i<n;i++){let yA=ytop,yB=n>1?ybot:loadTop;if(i===0){if(anchorTop)yA=ceil;else if(n>1)yB=plateY;}segs.push([xs[i],yA,xs[i],yB]);rp+=MV(`mov:0,${-dL/2};flow:${R2((endsTop(i)?-1:1)*sv[i])}`,L(xs[i],yA,xs[i],yB,'rope'));}
  const yFree=n>1?ybot+72:loadTop+46;segs.push([xs[n],ytop,xs[n],yFree]);rp+=MV(`flow:${R2(n*vL)}`,L(xs[n],ytop,xs[n],yFree-8,'rope'))+head(xs[n],yFree+4,Math.PI/2,12,'acc-f');
  topC.forEach(c=>{body+=C(c,ytop,rad-2,'sheave')+C(c,ytop,2.5,'dot');rp+=MV(`flow:${R2(sv[sIdx(c)])}`,`<path class="rope" d="M${P(c-rad)} ${ytop} A${rad} ${rad} 0 0 1 ${P(c+rad)} ${ytop}"/>`);});
  botC.forEach(c=>{body+=MV(UP,C(c,ybot,rad-2,'sheave')+C(c,ybot,2.5,'dot'));rp+=MV(`${UP};flow:${R2(sv[sIdx(c)+1]-vL)}`,`<path class="rope" d="M${P(c-rad)} ${ybot} A${rad} ${rad} 0 0 0 ${P(c+rad)} ${ybot}"/>`);});
  if(anchorTop)body+=C(xs[0],ceil,3.5,'dot');
  let lx,ly2;
  if(n>1){lx=(mx0+mx1)/2;ly2=plateY+20;body+=MV(UP,Rect(mx0,plateY,mx1-mx0,7,'metal',2)+L(lx,plateY+7,lx,plateY+20,'strap')+(!anchorTop?C(xs[0],plateY,3.5,'dot'):''));}
  else{lx=xs[0];ly2=loadTop;mx0=lx-24;mx1=lx+24;}
  const lw=n>1?Math.max(70,mx1-mx0):48;body+=rp;body+=MV(UP,Rect(lx-lw/2,ly2,lw,48,'load',3)+T(lx,ly2+29,Wt+' lb','lbl-b'));
  body+=T(xs[n]+10,yFree-2,'Pull','lbl-acc','start');
  const H=ly2+62;
  let stem,list,explain,ans;
  if(!rope){ans=Wt/n;stem=`How much force must be applied at the pull end to hold the ${Wt}-lb load? (Ignore friction and the weight of the pulleys.)`;
    if(n===1)list=[{v:Wt},{v:Wt/2,note:'A single fixed pulley only changes the direction of the pull; it doesn’t reduce the force.'},{v:Wt*2,note:'An ideal pulley never makes you pull more than the load.'}];
    else list=[{v:ans},{v:Wt,note:'Treated the system as if it gave no mechanical advantage.'},{v:n===4?Wt/2:(n===2?Wt/3:Wt/2),note:'Miscounted the rope segments holding up the moving block.'}];
    explain=n===1?`With one fixed pulley, 1 rope segment holds the load, so the pull equals the load: ${Wt} lb. The pulley only changes direction.`:`Count the rope segments that hold up the moving block: ${n}. Each carries an equal share, so the pull is ${Wt} ÷ ${n} = ${fmt(ans)} lb. (The pull end itself doesn’t count; it doesn’t hold the block up.)`;}
  else{ans=n*h;stem=`To raise the ${Wt}-lb load ${h} ft, how many feet of rope must be pulled through?`;
    list=[{v:ans},{v:h,note:'A pulley system that cuts the force makes you pull more rope, not the same amount.'},{v:(n+1)*h,note:'Counted the pull end as a supporting segment.'}];
    explain=`${n} segments hold the moving block. To lift it ${h} ft, every one of those segments must get ${h} ft shorter: ${n} × ${h} = ${ans} ft of rope. Less force, more rope.`;}
  return mk({type:'pulley',sub:'Pulleys & block and tackle',diff,stem,svg:svgWrap(W,H,body,'pulley system lifting a load'),choices:numChoices(list,rope?'ft':'lb'),answer:ans,explain,
    params:{n,W:Wt,h,rope,segs,ytop,movingY:n>1?ybot:loadTop,span:[mx0,mx1]}});
}

/* ================= lever ================= */
function genLever(seed,diff){
  if(diff>=4)return genLever4(seed);
  const R=RNG(seed),Ws=[10,15,20,25,30,40,50,60,80,90,100,120];
  for(let att=0;att<5000;att++){
    const f=R.int(3,7);let known,uPos,ans,list,explain;
    if(diff<3){const d1=R.int(1,f),d2=R.int(1,10-f);if(d1===d2)continue;const W1=R.pick(Ws);ans=W1*d1/d2;const inv=W1*d2/d1;if(!isInt(ans)||!isInt(inv)||ans>400)continue;
      if(diff===1&&!(isInt(d1/d2)||isInt(d2/d1)))continue;
      known=[{w:W1,pos:f-d1}];uPos=f+d2;
      list=[{v:ans},{v:inv,note:'Flipped the ratio. The weight farther from the fulcrum needs to be lighter, not heavier.'},{v:W1,note:'Equal weights only balance at equal distances.'}];
      explain=`To balance, weight × distance must match on both sides. Known side: ${W1} × ${d1} = ${W1*d1}. Other side: ? × ${d2} = ${W1*d1}, so ? = ${fmt(ans)} lb.`;}
    else{const d1=R.int(1,f),d3=R.int(1,f);if(d1===d3)continue;const d2=R.int(1,10-f);const W1=R.pick(Ws),W3=R.pick(Ws);const Tq=W1*d1+W3*d3;ans=Tq/d2;if(!isInt(ans)||ans>400)continue;
      const sum=W1+W3;if(sum===ans)continue;const p1=f-d1,p3=f-d3,p2=f+d2;let alt=(W1*p1+W3*p3)/p2,altNote='Measured distances from the end of the beam instead of from the fulcrum.';
      if(!isInt(alt)||alt===ans||alt===sum||alt<=0){alt=W1*d1/d2;altNote='Forgot to include one of the two weights.';if(!isInt(alt)||alt===ans||alt===sum)continue;}
      known=[{w:W1,pos:p1},{w:W3,pos:p3}];uPos=p2;
      list=[{v:ans},{v:sum,note:'Added the weights and ignored the distances. Distance from the fulcrum matters.'},{v:alt,note:altNote}];
      explain=`Add up weight × distance on the loaded side: ${W1} × ${d1} + ${W3} × ${d3} = ${W1*d1} + ${W3*d3} = ${Tq}. Other side: ? × ${d2} = ${Tq}, so ? = ${fmt(ans)} lb.`;}
    const flip=R.chance(.5);const fp=flip?10-f:f;const kn=known.map(k=>({w:k.w,pos:flip?10-k.pos:k.pos}));const up=flip?10-uPos:uPos;
    const s=48,bx=40,by=112,X=p=>bx+p*s;let body='';
    body+=Rect(bx-6,by,10*s+12,10,'beam',2);for(let i=0;i<=10;i++)body+=L(X(i),by+10,X(i),by+15,'dim');
    body+=Poly([[X(fp),by+10],[X(fp)-18,by+52],[X(fp)+18,by+52]],'fulcrum')+ground(X(fp)-44,X(fp)+44,by+52);
    kn.forEach(k=>{const hgt=26+Math.min(14,k.w/10);body+=Rect(X(k.pos)-23,by-hgt,46,hgt,'load',2)+T(X(k.pos),by-hgt/2+5,k.w+' lb','lbl-sb');});
    body+=Rect(X(up)-23,by-32,46,32,'unknown',2)+T(X(up),by-11,'?','lbl-q');
    const leftSide=[...kn.map(k=>({pos:k.pos,lab:Math.abs(k.pos-fp)+' ft'})),{pos:up,lab:Math.abs(up-fp)+' ft'}];
    const rowY=[by+74,by+96];const used={l:0,r:0};
    leftSide.sort((a,b)=>Math.abs(a.pos-fp)-Math.abs(b.pos-fp)).forEach(d=>{const side=d.pos<fp?'l':'r';body+=hdim(Math.min(X(d.pos),X(fp)),Math.max(X(d.pos),X(fp)),rowY[used[side]++]+14,d.lab);});
    const H=by+124;
    return mk({type:'lever',sub:'Levers & balance',diff,stem:`The beam weighs nothing and rests on the fulcrum shown. How much weight must be placed at the “?” to balance the beam?`,
      svg:svgWrap(10*s+80,H,body,'lever beam on a fulcrum with weights'),choices:numChoices(list,'lb'),answer:ans,explain,params:{f:fp,known:kn,unknown:up}});
  }
  throw new Error('lever');
}

/* ================= inclined plane ================= */
function genRamp(seed,diff){
  const R=RNG(seed);
  if(diff===1){const h=R.int(2,4);let La=R.int(h+2,h+8),Lb=R.int(h+2,h+8);const eq=R.chance(0.15);if(eq)Lb=La;else while(Lb===La)Lb=R.int(h+2,h+8);
    const s=26;let body='';const rowH=h*s+64;let maxX=0;
    [La,Lb].forEach((Lr,i)=>{const run=Math.sqrt(Lr*Lr-h*h);const bY=24+h*s+i*rowH;const x1=70,x2=x1+run*s,yt=bY-h*s;body+=Poly([[x1,bY],[x2,bY],[x2,yt]],'ramp')+ground(x1-20,x2+24,bY);
      const ang=Math.atan2(yt-bY,x2-x1),mx=x1+(x2-x1)*0.3,my=bY+(yt-bY)*0.3;body+=`<g transform="translate(${P(mx)} ${P(my)}) rotate(${P(ang*180/Math.PI)})">`+Rect(-12,-24,24,24,'crate',2)+'</g>';
      body+=vdim(x2+12,yt,bY,h+' ft',1)+slopeLabel(x1+(x2-x1)*0.55,bY+(yt-bY)*0.55,x2,yt,Lr+' ft',16)+T(x1-12,bY-6,LET[i],'lbl-q','end');maxX=Math.max(maxX,x2);});
    const x=maxX+110;
    const ans=eq?'same':(La>Lb?'A':'B');
    return mk({type:'ramp',sub:'Inclined planes',diff,stem:'The same crate is pushed to the same height up each ramp. Ignoring friction, which ramp takes less force to push the crate up?',
      svg:svgWrap(x-30,24+h*s+rowH+20,body,'two ramps of the same height'),answer:ans,
      choices:cmpChoices('Ramp','The same force on both',{A:'The steeper (shorter) ramp takes more force, not less.',B:'The steeper (shorter) ramp takes more force, not less.',same:'Same height doesn’t mean same force. A longer, gentler ramp spreads the work over more distance.'}),
      explain:ans==='same'?'Same height and same length means the same slope, so the force is the same.':`Both ramps rise to the same height, so the longer, gentler ramp (${ans}) needs less force. You trade force for distance.`,
      params:{h,La,Lb}});}
  const TR=[[3,4,5],[6,8,10],[5,12,13],[8,15,17],[9,12,15],[7,24,25],[12,16,20]];
  const gcd=(a,b)=>b?gcd(b,a%b):a,lcm=(a,b)=>a/gcd(a,b)*b;
  for(let att=0;;att++){if(att>5000)throw new Error('ramp');
    let [a,b,c]=R.pick(TR);let h=a,run=b;if(R.chance(0.3)){h=b;run=a;}if(h/run>1.2)continue;
    const base=lcm(c/gcd(c,h),run/gcd(run,h));const opts=[];for(let k=1;k*base<=600;k++)if(k*base>=60)opts.push(k*base);if(!opts.length)continue;
    const Wt=R.pick(opts);const ans=Wt*h/c,alt=Wt*h/run;if(ans===alt)continue;
    const s=Math.min(300/run,170/h,24);const x1=40,bY=30+h*s,x2=x1+run*s,yt=bY-h*s;let body=Poly([[x1,bY],[x2,bY],[x2,yt]],'ramp')+ground(20,x2+30,bY);
    const ang=Math.atan2(yt-bY,x2-x1),mx=x1+(x2-x1)*0.5,my=bY+(yt-bY)*0.5;
    body+=`<g transform="translate(${P(mx)} ${P(my)}) rotate(${P(ang*180/Math.PI)})">`+Rect(-16,-30,32,30,'crate',2)+T(0,-11,Wt+' lb','lbl-xs')+arrow(-80,-15,-22,-15)+'</g>';
    body+=vdim(x2+12,yt,bY,h+' ft',1)+hdim(x1,x2,bY+26,run+' ft');
    body+=slopeLabel(x1+(x2-x1)*0.62,bY+(yt-bY)*0.62,x2,yt,c+' ft',18);
    return mk({type:'ramp',sub:'Inclined planes',diff,stem:`A ${Wt}-lb crate is pushed up the ramp shown. Ignoring friction, how much force must be applied along the ramp?`,
      svg:svgWrap(x2+80,bY+40,body,'ramp with height, run and slope length'),answer:ans,
      choices:numChoices([{v:ans},{v:alt,note:'Used the flat distance along the ground. Use the length of the ramp surface itself.'},{v:Wt,note:'A ramp always takes less force than lifting straight up.'}],'lb'),
      explain:`Force × ramp length = weight × height. Force = ${Wt} × ${h} ÷ ${c} = ${fmt(ans)} lb. Use the sloped length (${c} ft), not the ground distance (${run} ft).`,params:{h,run,L:c,W:Wt}});}
}

/* ================= hydraulics ================= */
function genHydraulic(seed,diff){
  if(diff>=4&&RNG(seed^91).chance(0.6))return genHydraulic4(seed);
  const R=RNG(seed);const d=R.pick([1,2,3]),k=R.pick([2,3,4]),D=d*k;const smallIsA=R.chance(.5);
  const ws=24,wl=ws*k,xs=40,xl=150,top=70,base=250,lvlS=120,lvlL=120;let body='';
  body+=Rect(xs,lvlS,ws,base-lvlS,'fluid')+Rect(xl,lvlL,wl,base-lvlL,'fluid')+Rect(xs,base-28,xl+wl-xs,28,'fluid');
  body+=`<path class="ink" d="M${xs} ${top} V${base} H${xl+wl} V${top} M${xs+ws} ${top} V${base-28} H${xl} V${top}"/>`;
  body+=Rect(xs+1,lvlS-12,ws-2,12,'metal')+Rect(xl+1,lvlL-12,wl-2,12,'metal')+L(xs+ws/2,lvlS-12,xs+ws/2,lvlS-44,'rod')+L(xl+wl/2,lvlL-12,xl+wl/2,lvlL-44,'rod');
  const nmS=smallIsA?'A':'B',nmL=smallIsA?'B':'A';
  body+=T(xs+ws/2,base+20,`${d} in. dia.`,'lbl-s')+T(xl+wl/2,base+20,`${D} in. dia.`,'lbl-s')+T(xs+ws/2,base+37,'Piston '+nmS,'lbl-b')+T(xl+wl/2,base+37,'Piston '+nmL,'lbl-b');
  let F,stem,list,ans,explain;const W=xl+wl+60;
  if(diff===1){F=R.pick([10,20,25,50]);body+=arrow(xs+ws/2,lvlS-92,xs+ws/2,lvlS-48)+T(xs+ws/2+10,lvlS-80,F+' lb','lbl-acc','start');body+=arrow(xl+wl/2,lvlL-48,xl+wl/2,lvlL-90)+T(xl+wl/2+10,lvlL-78,'?','lbl-acc','start');
    ans=smallIsA?'B':'A';return mk({type:'hydraulic',sub:'Hydraulics',diff,stem:`A ${F}-lb force pushes down on the ${d}-inch piston. The system is filled with oil. Which piston pushes with the greater force?`,
      svg:svgWrap(W,base+48,body,'hydraulic press with two pistons'),answer:ans,
      choices:cmpChoices('Piston','Both push with the same force',{[smallIsA?'A':'B']:'The small piston is where the force goes in. The larger area multiplies it.',same:'The pressure is the same everywhere in the fluid, but force = pressure × area, so the bigger piston pushes harder.'}),
      explain:`Pressure is the same everywhere in the fluid. Force = pressure × area, so the ${D}-inch piston, with ${k*k} times the area, pushes with ${k*k} times the force.`,params:{d,D,F,mode:'compare',smallLabel:nmS}});}
  if(diff===2){F=R.pick([5,10,15,20,25,30,50]);ans=F*k*k;
    body+=arrow(xs+ws/2,lvlS-92,xs+ws/2,lvlS-48)+T(xs+ws/2+10,lvlS-80,F+' lb','lbl-acc','start')+arrow(xl+wl/2,lvlL-48,xl+wl/2,lvlL-90)+T(xl+wl/2+10,lvlL-78,'? lb','lbl-acc','start');
    stem=`A ${F}-lb force pushes down on the ${d}-inch piston. How much force does the ${D}-inch piston push up with?`;
    list=[{v:ans},{v:F*k,note:'Used the diameter ratio. Force follows area, and area goes with diameter squared.'},{v:F,note:'The pressure is equal, but the force is not. Bigger area means more force.'}];
    explain=`The big piston is ${k} times wider, so its area is ${k} × ${k} = ${k*k} times bigger. Force out = ${F} × ${k*k} = ${ans} lb.`;}
  else{const Wl=R.pick([4,8,10,12,15,20,25,30])*k*k;ans=Wl/(k*k);
    body+=arrow(xs+ws/2,lvlS-92,xs+ws/2,lvlS-48)+T(xs+ws/2+10,lvlS-80,'? lb','lbl-acc','start')+Rect(xl+wl/2-30,lvlL-76,60,32,'load',2)+T(xl+wl/2,lvlL-55,Wl+' lb','lbl-sb');
    stem=`A ${Wl}-lb load sits on the ${D}-inch piston. What force on the ${d}-inch piston will hold it up?`;
    list=[{v:ans},{v:Wl/k,note:'Used the diameter ratio. Area (and force) goes with diameter squared.'},{v:Wl,note:'A hydraulic press multiplies force; the small piston needs much less than the load.'}];
    explain=`Area ratio = (${D} ÷ ${d})² = ${k*k}. The small piston needs ${Wl} ÷ ${k*k} = ${fmt(ans)} lb.`;}
  return mk({type:'hydraulic',sub:'Hydraulics',diff,stem,svg:svgWrap(W,base+48,body,'hydraulic press with two pistons'),choices:numChoices(list,'lb'),answer:ans,explain,params:{d,D,mode:diff===2?'out':'in',value:diff===2?F:null,load:diff>=3?ans*k*k:null}});
}

/* ================= springs ================= */
function springPath(x,y1,y2,coils){coils=coils||6;const w=9,lead=7,len=y2-y1-2*lead,st=len/(coils*2);let d=`M${P(x)} ${P(y1)} V${P(y1+lead)}`;for(let i=0;i<coils*2;i++)d+=` L${P(x+(i%2?-w:w))} ${P(y1+lead+st*(i+0.5))}`;d+=` L${P(x)} ${P(y2-lead)} V${P(y2)}`;return `<path class="spring" d="${d}"/>`;}
function drawSprings(ox,arr,n,Wl,label){let b='';const ceilY=24;
  if(arr==='series'){const len=Math.min(62,150/n);let y=ceilY;b+=ceiling(ox-30,ox+30,ceilY);for(let i=0;i<n;i++){b+=springPath(ox,y,y+len,n>2?4:5);y+=len;if(i<n-1)b+=C(ox,y,3,'dot');}b+=Rect(ox-26,y,52,36,'load',3)+T(ox,y+23,Wl+' lb','lbl-sb');if(label)b+=T(ox,y+56,label,'lbl-b');return {b,w:70,h:y+(label?64:44)};}
  const gap=40,x0=ox-(n-1)*gap/2;b+=ceiling(x0-26,x0+(n-1)*gap+26,ceilY);for(let i=0;i<n;i++)b+=springPath(x0+i*gap,ceilY,ceilY+100);const by=ceilY+100;b+=Rect(x0-14,by,(n-1)*gap+28,7,'metal',2)+L(ox,by+7,ox,by+18,'strap')+Rect(ox-26,by+18,52,36,'load',3)+T(ox,by+41,Wl+' lb','lbl-sb');
  if(label)b+=T(ox,by+74,label,'lbl-b');return {b,w:(n-1)*gap+60,h:by+(label?82:62)};}
function genSprings(seed,diff){
  if(diff>=4)return genSprings4(seed);
  const R=RNG(seed);const s=R.pick([1,2,3]),w0=R.pick([5,10]);
  if(diff===1){const seriesIsA=R.chance(.5);const Wl=w0*2*R.int(1,3);const A=drawSprings(70,seriesIsA?'series':'parallel',2,Wl,'Setup A'),B=drawSprings(230,seriesIsA?'parallel':'series',2,Wl,'Setup B');
    const ans=seriesIsA?'A':'B';return mk({type:'springs',sub:'Springs',diff,stem:`All four springs are identical, and both weights are ${Wl} lb. Which setup stretches farther?`,
      svg:svgWrap(310,Math.max(A.h,B.h),A.b+B.b,'two spring setups'),answer:ans,
      choices:cmpChoices('Setup','Both stretch the same amount',{[seriesIsA?'B':'A']:'Side-by-side springs share the load, so each stretches less.',same:'The arrangement changes how much each spring carries.'}),
      explain:'End to end (series), each spring carries the full weight, so the stretches add up. Side by side (parallel), the springs share the weight, so the total stretch is smaller.',params:{mode:'compare',seriesLabel:ans}});}
  const n=diff===2?2:3;const arr=R.pick(['series','parallel']);const Wl=w0*n*R.int(1,4);const per=s/w0;
  const ser=n*Wl*per,par=Wl*per/n,one=Wl*per;const ans=arr==='series'?ser:par;const D=drawSprings(90,arr,n,Wl,'');
  return mk({type:'springs',sub:'Springs',diff,stem:`Each spring stretches ${s} in. when ${w0} lb hangs from it. The springs are identical and weigh nothing. How far does the ${Wl}-lb weight stretch the setup in total?`,
    svg:svgWrap(180,D.h,D.b,`${n} springs in ${arr}`),answer:ans,
    choices:numChoices([{v:ans},{v:arr==='series'?par:ser,note:arr==='series'?'Treated series springs as if they shared the load. End to end, each spring carries all of it.':'Treated parallel springs as if each carried the whole load. Side by side, they share it.'},{v:one,note:'Figured the stretch of just one spring carrying the whole weight.'}],'in.'),
    explain:arr==='series'?`End to end, every spring carries the full ${Wl} lb: ${Wl} ÷ ${w0} × ${s} = ${fmt(one)} in. each. ${n} springs × ${fmt(one)} = ${fmt(ser)} in.`:`Side by side, the ${n} springs share the ${Wl} lb: ${fmt(Wl/n)} lb each. ${fmt(Wl/n)} ÷ ${w0} × ${s} = ${fmt(par)} in. They all stretch together, so the total is ${fmt(par)} in.`,
    params:{mode:arr,n,s,w0,W:Wl}});
}

/* ================= fluid pressure ================= */
function genPressure(seed,diff){
  const R=RNG(seed);const u=24,surf=58;let body='',ptA,ptB,W,H,dA,dB;
  if(diff<3){const tx0=50,tx1=370,bot=surf+7*u+14;dA=R.int(1,6);dB=R.int(1,6);if(diff===2&&R.chance(0.35))dB=dA;else if(dB===dA)dB=dA===6?2:dA+R.int(1,6-dA);
    body+=Rect(tx0,surf,tx1-tx0,bot-surf,'water')+`<path class="ink" d="M${tx0} ${surf-30} V${bot} H${tx1} V${surf-30}"/>`+L(tx0,surf,tx1,surf,'surface');
    let xa=R.int(tx0+40,tx1-40),xb;do{xb=R.int(tx0+40,tx1-40);}while(Math.abs(xb-xa)<90);ptA=[xa,surf+dA*u];ptB=[xb,surf+dB*u];W=tx1+40;H=bot+16;}
  else{const tx0=40,tx1=210,px0=290,px1=318,bot=surf+7*u+14;dA=R.int(1,6);dB=R.chance(0.45)?dA:R.int(1,6);
    body+=Rect(tx0,surf,tx1-tx0,bot-surf,'water')+Rect(px0,surf,px1-px0,bot-surf,'water')+Rect(tx1,bot-30,px0-tx1,30,'water');
    body+=`<path class="ink" d="M${tx0} ${surf-30} V${bot} H${px1} V${surf-30} M${tx1} ${surf-30} V${bot-30} H${px0} V${surf-30}"/>`+L(tx0,surf,tx1,surf,'surface')+L(px0,surf,px1,surf,'surface');
    ptA=[R.int(tx0+40,tx1-40),surf+dA*u];ptB=[(px0+px1)/2,surf+dB*u];W=px1+60;H=bot+16;}
  const sw=R.chance(.5);const P1=sw?ptB:ptA,P2=sw?ptA:ptB,d1=sw?dB:dA,d2=sw?dA:dB;
  const lx=pt=>diff>=3&&pt===ptB?pt[0]+26:pt[0]+12;body+=C(P1[0],P1[1],5.5,'pt')+T(lx(P1),P1[1]+5,'A','lbl-b','start')+C(P2[0],P2[1],5.5,'pt')+T(lx(P2),P2[1]+5,'B','lbl-b','start');
  const ans=d1===d2?'same':(d1>d2?'A':'B');
  return mk({type:'pressure',sub:'Fluid pressure',diff,stem:diff<3?'The tank is filled with water. At which point is the water pressure greater?':'The two sections are connected at the bottom and filled with water to the same level. At which point is the water pressure greater?',
    svg:svgWrap(W,H,body,'water container with two marked points'),answer:ans,
    choices:cmpChoices('Point','The pressure is the same at both',{A:'Water pressure depends only on depth below the surface, not on position or container width.',B:'Water pressure depends only on depth below the surface, not on position or container width.',same:'These points are at different depths. Deeper water pushes harder.'}),
    explain:ans==='same'?'Both points are the same depth below the water surface, so the pressure is the same. Sideways position and the width of the container don’t matter.':`Pressure depends only on depth below the surface. Point ${ans} is deeper, so it has more water above it and more pressure.`,
    params:{dA:d1,dB:d2,connected:diff>=3}});
}

/* ================= rotation speed ================= */
function genWheel(seed,diff){
  const R=RNG(seed);const Rw=100,cx=140,cy=130;const fr=[0.3,0.45,0.6,0.75,0.9];let fa=R.pick(fr),fb=R.pick(fr);const eq=R.chance(diff===1?0.15:0.35);if(eq)fb=fa;else while(fb===fa)fb=R.pick(fr);
  let aa=R.f()*6.28,ab=aa+R.int(2,5)*0.9;let body=C(cx,cy,Rw,'wheel')+C(cx,cy,Rw-8,'ink-thin');for(let i=0;i<6;i++){const t=i*Math.PI/3;body+=L(cx+14*Math.cos(t),cy+14*Math.sin(t),cx+(Rw-8)*Math.cos(t),cy+(Rw-8)*Math.sin(t),'spoke');}
  /* motion: one steady turn the way the arrow shows; spokes, marks and radius lines turn together, the letters ride along upright */
  const wcw=R.chance(.5),wW=(wcw?1:-1)*2*Math.PI/MV_T;body=mvg(aRot(cx,cy,wW),body);
  body+=C(cx,cy,14,'hub');body+=arcArrow(cx,cy,Rw+14,-Math.PI/2,1.2,wcw);
  const pa=[cx+fa*Rw*Math.cos(aa),cy+fa*Rw*Math.sin(aa)],pb=[cx+fb*Rw*Math.cos(ab),cy+fb*Rw*Math.sin(ab)];
  body+=mvg(aRot(cx,cy,wW),L(cx,cy,pa[0],pa[1],'dim')+L(cx,cy,pb[0],pb[1],'dim')+C(pa[0],pa[1],6,'pt')+C(pb[0],pb[1],6,'pt'));
  const off=(p,t)=>[p[0]+17*Math.cos(t+Math.PI/2),p[1]+17*Math.sin(t+Math.PI/2)+5];const oa=off(pa,aa),ob=off(pb,ab);
  body+=mvg(aCircle(cx,cy,oa[0],oa[1],wW),T(oa[0],oa[1],'A','lbl-b'))+mvg(aCircle(cx,cy,ob[0],ob[1],wW),T(ob[0],ob[1],'B','lbl-b'));
  const ans=eq?'same':(fa>fb?'A':'B');
  return mk({type:'wheel',sub:'Rotation speed',diff,stem:'The wheel turns at a steady speed. Which point travels farther each second?',svg:svgWrap(280,260,body,'wheel with two marked points'),answer:ans,
    choices:cmpChoices('Point','Both travel the same distance',{A:'Every point makes one turn per turn of the wheel, but points farther from the center travel a bigger circle.',B:'Every point makes one turn per turn of the wheel, but points farther from the center travel a bigger circle.',same:'The turns per minute are the same, but the distance isn’t. The point farther from the center moves faster.'}),
    explain:ans==='same'?'Both points are the same distance from the center, so they travel circles of the same size in the same time.':`Both points make the same number of turns, but point ${ans} is farther from the center, so its circle is bigger. It covers more distance each second.`,params:{rA:fa,rB:fb}});
}

/* ================= center of gravity ================= */
function genStability(seed,diff){
  const R=RNG(seed);let a,b;
  for(let att=0;;att++){a=[R.int(1,4),R.int(2,7)];if(a[0]>=a[1])continue;if(R.chance(diff===1?0.15:0.35)){const k=R.pick([2,0.5]);b=[a[0]*k,a[1]*k];if(!isInt(b[0])||!isInt(b[1])||b[1]>8||b[0]<1)continue;}
    else{b=[R.int(1,4),R.int(2,8)];if(b[0]>=b[1])continue;if(Math.abs(a[0]/a[1]-b[0]/b[1])<0.18)continue;}break;}
  const s=24,gy=220;let body='';let x=50;const blocks=[a,b];
  blocks.forEach((bl,i)=>{const w=bl[0]*s,h=bl[1]*s;body+=Rect(x,gy-h,w,h,'block')+C(x+w/2,gy-h/2,5,'cg')+L(x+w/2-4,gy-h/2,x+w/2+4,gy-h/2,'cgx')+L(x+w/2,gy-h/2-4,x+w/2,gy-h/2+4,'cgx');
    body+=T(x+w/2,gy+30,'Block '+LET[i],'lbl-b');x+=w+100;});
  body+=ground(30,x-50,gy);
  const ra=a[0]/a[1],rb=b[0]/b[1];const ans=Math.abs(ra-rb)<1e-9?'same':(ra<rb?'A':'B');
  return mk({type:'stability',sub:'Center of gravity',diff,stem:'Both blocks are solid and evenly weighted (the dot marks each center of gravity). Each is slowly tipped up onto one bottom corner. Which block falls over at the smaller tilt angle?',
    svg:svgWrap(x-20,gy+44,body,'two upright blocks'),answer:ans,
    choices:cmpChoices('Block','Both tip at the same angle',{A:'A block tips when its center of gravity passes over the corner. Compare width to height, not size.',B:'A block tips when its center of gravity passes over the corner. Compare width to height, not size.',same:'These blocks have different width-to-height shapes, so they tip at different angles.'}),
    explain:ans==='same'?`Block B is the same shape as block A, just scaled. Width compared with height is the same for both, so the center of gravity passes over the corner at the same angle.`:`A block falls once its center of gravity moves past the corner it’s resting on. The narrower it is compared to its height, the sooner that happens. Block ${ans} is narrower for its height, so it tips first.`,
    params:{A:a,B:b}});
}

/* ================= circuits ================= */
function lamp(x,y,id,vertical){return C(x,y,12,'lamp')+L(x-8.5,y-8.5,x+8.5,y+8.5,'ink-thin')+L(x-8.5,y+8.5,x+8.5,y-8.5,'ink-thin')+(vertical?T(x+18,y+5,'L'+id,'lbl-b','start'):T(x,y-18,'L'+id,'lbl-b'));}
function sw(x,y,state,id,vertical){let b='';if(vertical){b+=Rect(x-4,y-18,8,36,'gap')+C(x,y-15,3,'dot')+C(x,y+15,3,'dot');b+=state==='closed'?L(x,y+15,x,y-15,'wire'):L(x,y+15,x+16,y-11,'wire');b+=T(x-12,y+5,id,'lbl-s','end');}
  else{b+=Rect(x-18,y-4,36,8,'gap')+C(x-15,y,3,'dot')+C(x+15,y,3,'dot');b+=state==='closed'?L(x-15,y,x+15,y,'wire'):L(x-15,y,x+11,y-16,'wire');b+=T(x,y+22,id,'lbl-s');}return b;}
function genCircuit(seed,diff){
  const R=RNG(seed);
  for(let att=0;att<2000;att++){
    let lampN=0;const p={main:null,mainLamp:null,branches:[]};
    if(diff===1){p.branches=[{sw:R.pick(['open','closed']),lamps:[++lampN,++lampN]}];}
    else{const nb=diff===2?R.int(2,3):R.int(2,3);if(diff>=3){if(R.chance(0.6))p.main=R.chance(0.7)?'closed':'open';if(!p.main||R.chance(0.5))p.mainLamp=++lampN;}
      for(let i=0;i<nb;i++){const nl=(i===0&&nb===2&&R.chance(0.4))?2:1;const lamps=[];for(let k=0;k<nl;k++)lamps.push(++lampN);p.branches.push({sw:R.pick([null,'open','closed']),lamps});}
      if(!p.branches.some(b=>b.sw==='open'))continue;}
    // label switches
    let sN=0;p.branches.forEach(b=>{if(b.sw)b.id='S'+(++sN);});
    const all=[];if(p.mainLamp)all.push(p.mainLamp);p.branches.forEach(b=>all.push(...b.lamps));all.sort((x,y)=>x-y);
    const lit=(ignoreMain)=>{const mOK=ignoreMain||p.main!=='open';const out=[];let any=false;p.branches.forEach(b=>{if(mOK&&b.sw!=='open'){any=true;out.push(...b.lamps);}});if(p.mainLamp&&any)out.push(p.mainLamp);return out.sort((x,y)=>x-y);};
    const ans=lit(false);
    const cand=[];const add=(set,note)=>cand.push({set:set.slice().sort((x,y)=>x-y),note});
    if(diff===1){add(ans.length?[]:all,ans.length?'The switch is closed, so current flows around the whole loop.':'The switch is open, so the loop is broken and no current flows.');add([1],'In a series loop the same current passes through every lamp; they are all on or all off together.');add([2],'In a series loop the same current passes through every lamp; they are all on or all off together.');}
    else{
      if(p.main==='open')add(lit(true),'The main switch is open, so no current leaves the battery at all.');
      add(all.filter(l=>!ans.includes(l)),'Reversed open and closed. Current flows through closed switches, not open ones.');
      if(p.mainLamp){if(ans.includes(p.mainLamp))add(ans.filter(l=>l!==p.mainLamp),'The lamp on the main line carries the current for every branch, so it lights whenever any branch is complete.');else add(ans.concat([p.mainLamp]),'The main-line lamp can only light if some branch completes the circuit.');}
      const noSw=[];p.branches.forEach(b=>{if(!b.sw)noSw.push(...b.lamps);});if(p.mainLamp&&noSw.length)noSw.push(p.mainLamp);add(noSw,'Branches with a closed switch also carry current.');
      add(all,'A branch with an open switch is broken, so its lamps stay dark.');add([],'At least one branch has a complete path back to the battery.');}
    const seen=new Set([JSON.stringify(ans)]);const pickd=[];for(const c of R.shuffle(cand)){const k=JSON.stringify(c.set);if(seen.has(k))continue;seen.add(k);pickd.push(c);if(pickd.length===2)break;}
    if(pickd.length<2)continue;
    const setText=s=>s.length===0?'None of the lamps':s.length===all.length?'All of the lamps':s.length===1?`Only L${s[0]}`:`${s.slice(0,-1).map(l=>'L'+l).join(', ')} and L${s[s.length-1]} only`;
    const choices=R.shuffle([{set:ans,note:null},...pickd]).map(c=>({t:setText(c.set),key:c.set,note:c.note}));
    // draw
    const yT=44,yB=236,xBat=46;let cx=xBat+62;const top=[];if(p.main){top.push({k:'sw',x:cx});cx+=74;}if(p.mainLamp){top.push({k:'lamp',x:cx});cx+=74;}
    const bx=p.branches.map((b,i)=>cx+20+i*96);const xEnd=bx[bx.length-1];let body='';
    body+=L(xBat,yT,xEnd,yT,'wire')+L(xBat,yB,xEnd,yB,'wire')+L(xBat,yT,xBat,yB,'wire');bx.forEach(x=>body+=L(x,yT,x,yB,'wire'));
    const my=(yT+yB)/2;body+=Rect(xBat-20,my-9,40,18,'gap')+L(xBat-18,my-6,xBat+18,my-6,'plate')+L(xBat-9,my+6,xBat+9,my+6,'plate-thick')+T(xBat-24,my-2,'+','lbl-b','end')+T(xBat-24,my+16,'−','lbl-b','end');
    top.forEach(t=>{if(t.k==='sw')body+=sw(t.x,yT,p.main,'Main',false);else body+=Rect(t.x-13,yT-3,26,6,'gap')+lamp(t.x,yT,p.mainLamp,false);});
    p.branches.forEach((b,i)=>{const x=bx[i];let y=yT+50;if(b.sw){body+=sw(x,y,b.sw,b.id,true);y+=48;}const span=(yB-28)-y;b.lamps.forEach((l,k)=>{const ly=y+span*(k+0.5)/b.lamps.length;body+=lamp(x,ly,l,true);});});
    const lampTxt=[];p.branches.forEach((b,i)=>lampTxt.push(`branch ${i+1}: ${b.sw?`switch ${b.id} ${b.sw}, `:'no switch, '}lamp${b.lamps.length>1?'s':''} ${b.lamps.map(l=>'L'+l).join(' and ')}`));
    let explain;
    if(diff===1)explain=`All the parts are in one loop (series). The switch is ${p.branches[0].sw}, so ${p.branches[0].sw==='closed'?'current flows through both lamps and both light':'the loop is broken and neither lamp lights'}.`;
    else explain=`${p.main==='open'?'The main switch is open, so the whole circuit is dead and nothing lights. ':''}${p.main!=='open'?'Each branch is its own path from the top wire to the bottom wire. A branch lights if it has no switch or a closed switch; an open switch breaks only its own branch. ':''}${p.mainLamp&&p.main!=='open'?`L${p.mainLamp} is on the main line, so it lights if any branch is complete. `:''}Lit: ${ans.length?ans.map(l=>'L'+l).join(', '):'none'}.`;
    return mk({type:'circuit',sub:'Basic circuits',diff,stem:'The switches are shown open or closed. Which lamps are lit?',svg:svgWrap(xEnd+50,yB+18,body,'circuit with battery, switches and lamps'),
      choices,answer:ans,explain,params:{main:p.main,mainLamp:p.mainLamp,branches:p.branches.map(b=>({sw:b.sw,lamps:b.lamps}))}});
  }
  throw new Error('circuit');
}

/* ================= paper folding (general engine) ================= */
const N2=24;
const setKey=s=>JSON.stringify(s.slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
function centroid(pts){let x=0,y=0;pts.forEach(p=>{x+=p[0];y+=p[1];});return[x/pts.length,y/pts.length];}
const D4={id:p=>[p[0],p[1]],r90:p=>[N2-p[1],p[0]],r180:p=>[N2-p[0],N2-p[1]],r270:p=>[p[1],N2-p[0]],fx:p=>[N2-p[0],p[1]],fy:p=>[p[0],N2-p[1]],tr:p=>[p[1],p[0]],at:p=>[N2-p[1],N2-p[0]]};
const canon=s=>Object.values(D4).map(f=>setKey(s.map(f))).sort()[0];
const fSide=(f,p)=>{const x=p[0],y=p[1];switch(f.k){case'x':return x-f.c;case'y':return y-f.c;case'p':return x+y-f.c;default:return x-y-f.c;}};
const fRefl=(f,p)=>{const x=p[0],y=p[1];switch(f.k){case'x':return[2*f.c-x,y];case'y':return[x,2*f.c-y];case'p':return[f.c-y,f.c-x];default:return[y+f.c,x-f.c];}};
const moved=(f,p)=>f.sg*fSide(f,p)>0;
function clipPoly(poly,f,keepMoved){const out=[],n=poly.length,val=p=>(keepMoved?1:-1)*f.sg*fSide(f,p);
  for(let i=0;i<n;i++){const a=poly[i],b=poly[(i+1)%n],va=val(a),vb=val(b);if(va>=-1e-9)out.push(a);if((va>1e-9&&vb<-1e-9)||(va<-1e-9&&vb>1e-9)){const t=va/(va-vb);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}
  const ded=[];out.forEach(p=>{if(!ded.length||Math.hypot(p[0]-ded[ded.length-1][0],p[1]-ded[ded.length-1][1])>1e-7)ded.push(p);});if(ded.length>1&&Math.hypot(ded[0][0]-ded[ded.length-1][0],ded[0][1]-ded[ded.length-1][1])<1e-7)ded.pop();return ded;}
function area(poly){let a=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length];a+=p[0]*q[1]-q[0]*p[1];}return Math.abs(a)/2;}
function insideConvex(poly,p){let s=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const c=(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);if(Math.abs(c)<1e-6)continue;const sg=Math.sign(c);if(s&&sg!==s)return false;s=sg;}return true;}
function edgeDist(poly,p){let m=1e9;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);m=Math.min(m,Math.abs(dx*(a[1]-p[1])-dy*(a[0]-p[0]))/L);}return m;}
const ALL_PTS=(()=>{const a=[];for(let x=1;x<N2;x+=2)for(let y=1;y<N2;y+=2)a.push([x,y]);return a;})();
const pk=p=>p[0]+','+p[1];
function foldCandidates(poly,S){const out=[];const A=area(poly);const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
  const rng={x:[Math.min(...xs),Math.max(...xs)],y:[Math.min(...ys),Math.max(...ys)],p:[Math.min(...poly.map(p=>p[0]+p[1])),Math.max(...poly.map(p=>p[0]+p[1]))],m:[Math.min(...poly.map(p=>p[0]-p[1])),Math.max(...poly.map(p=>p[0]-p[1]))]};
  for(const k of ['x','y','p','m'])for(let c=Math.ceil(rng[k][0]/2)*2+2;c<=rng[k][1]-2;c+=2)for(const sg of [1,-1]){const f={k,c,sg};
    const flap=clipPoly(poly,f,true),keep=clipPoly(poly,f,false);if(flap.length<3||keep.length<3)continue;const fr=area(flap)/A;if(fr<0.1||fr>0.5+1e-9)continue;
    if(!flap.map(p=>fRefl(f,p)).every(p=>insideConvex(keep,p)))continue;
    const Sm=S.filter(p=>moved(f,p));if(!Sm.length)continue;f.frac=fr;f.half=Math.abs(fr-0.5)<0.005;f.flap=flap;f.keep=keep;out.push(f);}
  return out;}
function nextShape(S,f){const keepSet=S.filter(p=>!moved(f,p));const ks=new Set(keepSet.map(pk));S.filter(p=>moved(f,p)).forEach(p=>{const q=fRefl(f,p);if(!ks.has(pk(q))){ks.add(pk(q));keepSet.push(q);}});return keepSet;}
const REGION={x:{'1':'right','-1':'left'},y:{'1':'bottom','-1':'top'},p:{'1':'bottom-right','-1':'top-left'},m:{'1':'top-right','-1':'bottom-left'}};
const TOWARD={x:{'1':'over to the left','-1':'over to the right'},y:{'1':'up','-1':'down'},p:{'1':'up and over','-1':'down and over'},m:{'1':'down and over','-1':'up and over'}};
function foldText(f){const r=REGION[f.k][f.sg];if(f.k==='x'||f.k==='y')return f.half?`${r} half folded ${TOWARD[f.k][f.sg]}`:`a narrow strip on the ${r} folded ${TOWARD[f.k][f.sg]}`;return f.half?`${r} half folded across the diagonal`:`the ${r} corner folded in`;}
function unfoldH(folds,shapes,punches,opt){opt=opt||{};let H=punches.map(p=>p.slice());const counts=[];
  for(let k=folds.length-1;k>=0;k--){if(opt.skip===k){counts.push({k,n:H.length});continue;}const f=folds[k],S=new Set(shapes[k].map(pk));const add=[];
    for(const h of H){if(fSide(f,h)===0)opt.bad=true;const q=fRefl(f,h);const covered=moved(f,q)&&S.has(pk(q));
      if(covered||opt.all){if(opt.wrong===k){add.push(opt.wrongFn(h));}else add.push(q);}}
    H=H.concat(add);counts.push({k,n:H.length});}
  opt.counts=counts;const seen=new Set(),out=[];for(const p of H){const kk=pk(p);if(!seen.has(kk)){seen.add(kk);out.push(p);}else opt.dup=true;}return out.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);}
const PF_SX=1.2;
function paperChoice(holes){const S=80,pd=5,ins=3,sc=(S-2*ins)/N2,W=S*PF_SX;let b=Rect(pd,pd,W,S,'pf-sheet');holes.forEach(h=>b+=C(pd+ins*PF_SX+h[0]*sc*PF_SX,pd+ins+h[1]*sc,2.6,'pf-dot'));return svgWrap(W+2*pd,S+2*pd,b,`unfolded sheet with ${holes.length} hole${holes.length===1?'':'s'}`);}
const FOLD_CFG={1:{n:[1],odd:0.25,minOdd:0,np:[1,2,2,3],turn:0.1,max:8},2:{n:[2],odd:0.35,minOdd:0,np:[1,2,2,3],turn:0.1,max:10},3:{n:[2,3],odd:0.4,minOdd:0,np:[1,2,3],turn:0.1,max:12},
  4:{n:[3],odd:0.5,minOdd:1,np:[2,3],turn:0.15,max:14},5:{n:[3,4],odd:0.6,minOdd:1,np:[2,3],turn:0.2,max:16},6:{n:[4],odd:0.7,minOdd:2,np:[2,3],turn:0.25,max:18}};
function genFold(seed,diff){
  const R=RNG(seed);const cfg=FOLD_CFG[Math.min(6,Math.max(1,diff))];const hard=diff>=4;
  for(let att=0;att<900;att++){
    const n=R.pick(cfg.n);let poly=[[0,0],[N2,0],[N2,N2],[0,N2]],S=ALL_PTS.map(p=>p.slice());const folds=[],shapes=[],polys=[];let ok=true;
    for(let i=0;i<n;i++){const cands=foldCandidates(poly,S).filter(f=>f.half||f.k==='p'||f.k==='m');if(!cands.length){ok=false;break;}
      const odd=cands.filter(f=>!f.half),halves=cands.filter(f=>f.half);const wantOdd=R.chance(cfg.odd)&&odd.length;
      let pool=wantOdd?odd:halves.length?halves:odd;if(!wantOdd&&halves.length){const ax=halves.filter(f=>f.k==='x'||f.k==='y');if(ax.length&&R.chance(0.72))pool=ax;}
      const f=R.pick(pool);shapes.push(S);polys.push(poly);folds.push(f);S=nextShape(S,f);poly=f.keep;}
    if(!ok)continue;if(folds.filter(f=>!f.half).length<cfg.minOdd)continue;
    const cells=S.filter(p=>edgeDist(poly,p)>=2.4&&folds.every(f=>Math.abs(fSide(f,p))>=1.5));if(!cells.length)continue;
    const np=Math.min(R.pick(cfg.np),cells.length);const punches=[];for(const c of R.shuffle(cells)){if(punches.every(q=>Math.max(Math.abs(q[0]-c[0]),Math.abs(q[1]-c[1]))>=4))punches.push(c);if(punches.length===np)break;}if(punches.length<np)continue;
    const uo={};const correct=unfoldH(folds,shapes,punches,uo);if(uo.bad||uo.dup)continue;if(correct.length>cfg.max||correct.length<(hard?4:1))continue;
    if(!correct.every(p=>p[0]>=1&&p[0]<=N2-1&&p[1]>=1&&p[1]<=N2-1))continue;
    const ck=setKey(correct),cc=canon(correct);const onSheet=p=>p[0]>=1&&p[0]<=N2-1&&p[1]>=1&&p[1]<=N2-1&&p[0]%2===1&&p[1]%2===1;const pool=[];const seenC=new Set([cc]);
    const add=(set,kind,note)=>{if(!set||!set.length||!set.every(onSheet))return;const s=JSON.parse(setKey(set));if(new Set(s.map(pk)).size!==s.length)return;const c=canon(s);if(seenC.has(c))return;seenC.add(c);pool.push({set:s,kind,note});};
    if(folds.some(f=>!f.half))add(unfoldH(folds,shapes,punches,{all:true}).filter(onSheet),'doubleAll','Gave a mirror copy to holes outside the folded flap. A strip or corner flap only covers part of the paper, so holes outside it go through one layer and don’t get a copy.');
    folds.forEach((f,i)=>add(unfoldH(folds,shapes,punches,{skip:i}),'skip','Forgot to undo one of the folds, so some mirrored holes are missing.'));
    folds.forEach((f,i)=>{const P0=centroid(polys[i]);const alt=f.k==='x'?{k:'y',c:2*Math.round(P0[1]/2)}:f.k==='y'?{k:'x',c:2*Math.round(P0[0]/2)}:f.k==='p'?{k:'m',c:2*Math.round((P0[0]-P0[1])/2)}:{k:'p',c:2*Math.round((P0[0]+P0[1])/2)};
      add(unfoldH(folds,shapes,punches,{wrong:i,wrongFn:h=>fRefl(alt,h)}),'wrong','Mirrored the holes across the wrong crease.');});
    const shiftOf=src=>{const s=src.map(p=>p.slice());const i=R.int(0,s.length-1);for(const d of R.shuffle([[4,0],[-4,0],[0,4],[0,-4],[4,4],[-4,4],[4,-4],[-4,-4]])){const q=[s[i][0]+d[0],s[i][1]+d[1]];if(onSheet(q)&&s.every((z,j)=>j===i||Math.max(Math.abs(z[0]-q[0]),Math.abs(z[1]-q[1]))>=4)){s[i]=q;return s;}}return null;};
    const dropOf=src=>{if(src.length<2)return null;const s=src.slice();s.splice(R.int(0,s.length-1),1);return s;};
    for(let k=0;k<3;k++){add(shiftOf(correct),'shift','One hole is out of place. A mirrored hole sits exactly as far from the crease as the original.');add(dropOf(correct),'missing','Missing one of the mirrored holes.');}
    {const free=ALL_PTS.filter(p=>correct.every(q=>Math.max(Math.abs(q[0]-p[0]),Math.abs(q[1]-p[1]))>=4));if(!free.length)continue;add(correct.concat([R.pick(free)]),'extra','Has an extra hole that no punch made.');}
    pool.filter(w=>w.kind==='skip'||w.kind==='wrong'||w.kind==='doubleAll').forEach(w=>{add(shiftOf(w.set),w.kind+'+',w.note+' It also has one hole out of place.');add(dropOf(w.set),w.kind+'+',w.note+' It is also missing a hole.');});
    const D=(a,b)=>{const A=new Set(a.map(pk)),B=new Set(b.map(pk));let d=0;A.forEach(x=>{if(!B.has(x))d++;});B.forEach(x=>{if(!A.has(x))d++;});return d;};
    let wrong=null;
    for(let tr=0;tr<400&&!wrong&&pool.length>=4;tr++){const pick=R.shuffle(pool).slice(0,4);const minC=Math.min(...pick.map(w=>D(w.set,correct)));let minW=1e9;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)minW=Math.min(minW,D(pick[i].set,pick[j].set));
      if(minW>minC)continue;if(hard&&minC>3)continue;if(pick.filter(w=>w.kind==='extra').length>1)continue;if(pick.filter(w=>w.kind==='shift'||w.kind==='missing').length>2)continue;wrong=pick;}
    if(!wrong)continue;
    const turned=R.chance(cfg.turn);const rots=['r90','r180','r270'];
    const opts=R.shuffle([{set:correct,note:null,c:true},...wrong.map(w=>({set:w.set,note:w.note}))]).map(o=>{const r=turned?(o.c?R.pick(rots):R.pick(['id',...rots])):'id';return Object.assign(o,{show:JSON.parse(setKey(o.set.map(D4[r])))});});
    const choices=opts.map(o=>({svg:paperChoice(o.show),t:`${o.show.length} hole${o.show.length===1?'':'s'}`,key:o.show,note:o.note?(o.note+(turned?' (Turning the sheet doesn’t make it match.)':'')):null}));
    const ans=opts.find(o=>o.c).show;
    // panels (GAN style: whole sheet outline, grey where paper has been folded away, curved arrow, dots on the last panel)
    const S0=92,sc=S0/N2,pw=S0*PF_SX,gap=18,pad=26,cols=n>3?2:n,rowH=S0+2*pad;let oy=0;const U=(ox,p)=>[ox+pad+p[0]*sc*PF_SX,oy+pad+p[1]*sc];let body='';
    const full=[[0,0],[N2,0],[N2,N2],[0,N2]];
    folds.forEach((f,i)=>{const ox=(i%cols)*(pw+2*pad+gap);oy=Math.floor(i/cols)*rowH;
      body+=Poly(full.map(p=>U(ox,p)),'pf-shade');body+=Poly(f.keep.map(p=>U(ox,p)),'pf-sheet');
      body+=Poly(f.flap.map(p=>fRefl(f,p)).map(p=>U(ox,p)),'pf-sheet');
      const c0=centroid(f.flap),c1=fRefl(f,c0);let a=U(ox,c0),b=U(ox,c1);
      const dq={x:[0,1],y:[1,0],p:[1,-1],m:[1,1]}[f.k];let d=[dq[0]*sc*PF_SX,dq[1]*sc];const dl=Math.hypot(d[0],d[1]);d=[d[0]/dl,d[1]/dl];
      const verts=f.flap.concat(f.flap.map(p=>fRefl(f,p))).map(p=>U(ox,p));let best=null;
      for(const s of [1,-1]){const t=Math.max(...verts.map(v=>s*((v[0]-a[0])*d[0]+(v[1]-a[1])*d[1])))+9;if(!best||t<best.t)best={s,t};}
      const sh=[best.s*d[0]*best.t,best.s*d[1]*best.t];
      const along=[b[0]-a[0],b[1]-a[1]];const al=Math.hypot(along[0],along[1]);const u=[along[0]/al,along[1]/al];
      a=[a[0]+sh[0]+u[0]*al*0.12,a[1]+sh[1]+u[1]*al*0.12];b=[b[0]+sh[0]-u[0]*al*0.12,b[1]+sh[1]-u[1]*al*0.12];
      const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,bulge=Math.min(18,0.3*al);const cxp=mx+best.s*d[0]*bulge,cyp=my+best.s*d[1]*bulge;const ang=Math.atan2(b[1]-cyp,b[0]-cxp);
      body+=`<path class="pf-arr" d="M${P(a[0])} ${P(a[1])} Q${P(cxp)} ${P(cyp)} ${P(b[0]-5*Math.cos(ang))} ${P(b[1]-5*Math.sin(ang))}"/>`+head(b[0],b[1],ang,8,'pf-head');
      if(i===n-1)punches.forEach(p=>{const q=U(ox,p);body+=C(q[0],q[1],3.2,'pf-dot');});});
    const W=cols*(pw+2*pad)+(cols-1)*gap,H=Math.ceil(n/cols)*rowH;
    const steps=uo.counts.map(({k,n:c})=>{const f=folds[k];return f.half?`Undo fold ${k+1} (${foldText(f)}): mirror every hole across that crease → ${c} holes.`:`Undo fold ${k+1} (${foldText(f)}): only holes under the folded flap get a mirror copy → ${c} holes.`;});
    const explain=`Work backward from the last fold. `+steps.join(' ')+(turned?' The correct choice shows the sheet turned to a different position; turn it back and it matches.':'');
    const oddN=folds.filter(f=>!f.half).length;
    return mk({type:'fold',skill:'Spatial',sub:diff>=6?'Paper folding: meltdown':diff===5?'Paper folding: expert':diff===4?'Paper folding: hard':`Paper folding: ${n} fold${n>1?'s':''}${oddN?' + corner/strip':''}`,diff,
      stem:`A sheet of paper is folded as shown and ${np>1?np+' holes are':'a hole is'} punched through all layers. Which choice shows the sheet when it is completely unfolded?${turned?' The answer may be shown turned to a different position.':''}`,
      svg:svgWrap(W,H,body,`paper folding steps: ${folds.map((f,i)=>`(${i+1}) ${foldText(f)}`).join(', ')}`),choices,answer:ans,explain,
      params:{folds:folds.map(f=>({k:f.k,c:f.c,sg:f.sg})),punches,turned}});
  }
  throw new Error('fold');
}

/* ================= cube nets (pattern folding) ================= */
const MARKS=['blank','shade','dot','ring','bull','square'];
const MARK_NAME={blank:'plain',shade:'shaded',dot:'dot',ring:'ring',bull:'bull\u2019s-eye',square:'small square'};
function markSvg(m){switch(m){case'shade':return '<rect x="0" y="0" width="1" height="1" class="cshade"/>';case'dot':return '<circle cx=".5" cy=".5" r=".14" class="cdot"/>';case'ring':return '<circle cx=".5" cy=".5" r=".27" class="cring" vector-effect="non-scaling-stroke"/>';
  case'bull':return '<circle cx=".5" cy=".5" r=".3" class="cring" vector-effect="non-scaling-stroke"/><circle cx=".5" cy=".5" r=".1" class="cdot"/>';case'square':return '<rect x=".36" y=".36" width=".28" height=".28" class="cdot"/>';}return '';}
function faceSvg(O,E1,E2,m){const M=`matrix(${P(E1[0])} ${P(E1[1])} ${P(E2[0])} ${P(E2[1])} ${P(O[0])} ${P(O[1])})`;return `<g transform="${M}">${markSvg(m)}<path d="M0 0 H1 V1 H0 Z" class="cface" vector-effect="non-scaling-stroke"/></g>`;}
const V3={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],neg:a=>[-a[0],-a[1],-a[2]],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],key:a=>a.join(',')};
function rollNet(cells){const byK=new Map(cells.map((c,i)=>[c.join(','),i]));const fr=cells.map(()=>null);fr[0]={r:[1,0,0],u:[0,1,0],n:[0,0,1]};const q=[0];
  while(q.length){const i=q.shift(),F=fr[i],[x,y]=cells[i];
    for(const [dx,dy] of [[1,0],[-1,0],[0,-1],[0,1]]){const j=byK.get((x+dx)+','+(y+dy));if(j===undefined||fr[j])continue;let G;
      if(dx===1)G={r:V3.neg(F.n),u:F.u,n:F.r};else if(dx===-1)G={r:F.n,u:F.u,n:V3.neg(F.r)};else if(dy===-1)G={r:F.r,u:V3.neg(F.n),n:F.u};else G={r:F.r,u:F.n,n:V3.neg(F.u)};fr[j]=G;q.push(j);}}
  return fr.map(f=>f&&f.n);}
function randomNet(R){for(let att=0;att<500;att++){const cells=[[0,0]];const has=new Set(['0,0']);while(cells.length<6){const c=R.pick(cells),d=R.pick([[1,0],[-1,0],[0,1],[0,-1]]);const nc=[c[0]+d[0],c[1]+d[1]];if(has.has(nc.join(',')))continue;has.add(nc.join(','));cells.push(nc);}
    const xs=cells.map(c=>c[0]),ys=cells.map(c=>c[1]);const w=Math.max(...xs)-Math.min(...xs)+1,h=Math.max(...ys)-Math.min(...ys)+1;if(w>4||h>4)continue;
    const norm=cells.map(c=>[c[0]-Math.min(...xs),c[1]-Math.min(...ys)]);const ns=rollNet(norm);if(ns.some(n=>!n))continue;if(new Set(ns.map(V3.key)).size!==6)continue;return {cells:norm,normals:ns,w,h};}
  throw new Error('net');}
function isoCube(cx,cy,a,T,Lf,Rf){const c=Math.cos(Math.PI/6)*a;const top=[cx,cy-a],rt=[cx+c,cy-a/2],ct=[cx,cy],lt=[cx-c,cy-a/2],bt=[cx,cy+a],lb=[cx-c,cy+a/2],rb=[cx+c,cy+a/2];
  const sub=(p,q)=>[q[0]-p[0],q[1]-p[1]];
  return faceSvg(lt,sub(lt,top),sub(lt,ct),T)+faceSvg(lt,sub(lt,ct),sub(lt,lb),Lf)+faceSvg(ct,sub(ct,rt),sub(ct,bt),Rf);}
function genCubeNet(seed,diff){
  const R=RNG(seed);
  for(let att=0;att<300;att++){const net=randomNet(R);const marks=R.shuffle(MARKS);const faceOf=V3.key;const markByN={};net.normals.forEach((n,i)=>markByN[faceOf(n)]=marks[i]);
    const N=net.normals;const trip=(a,b,c)=>[a,b,c];const valid=[],mirror=[],opp=[];
    for(const a of N)for(const b of N)for(const c of N){if(a===b||b===c||a===c)continue;const ab=V3.dot(a,b),bc=V3.dot(b,c),ac=V3.dot(a,c);
      if(ab===0&&bc===0&&ac===0){const t=V3.dot(a,V3.cross(b,c));(t>0?valid:mirror).push(trip(a,b,c));}else opp.push(trip(a,b,c));}
    const show=t=>t.map(n=>markByN[faceOf(n)]);const K=t=>show(t).join('|');
    const corr=R.pick(valid);const used=new Set([K(corr)]);const wr=[];
    const tryAdd=(t,note)=>{if(!t)return;const k=K(t);if(used.has(k))return;if(valid.some(v=>K(v)===k))return;used.add(k);wr.push({t,note});};
    const nMir=diff>=4?3:diff>=2?2:1;
    tryAdd([corr[0],corr[2],corr[1]],'This is the mirror image of a real corner: the faces are right but the left and right sides are swapped.');
    for(const m of R.shuffle(mirror)){if(wr.length>=nMir)break;tryAdd(m,'These three faces do meet at a corner, but not in this order. Fold it in your head and the left and right sides come out swapped.');}
    for(const o of R.shuffle(opp)){if(wr.length>=3)break;tryAdd(o,'Two of these faces are opposite each other on the box, so you can never see them side by side.');}
    if(wr.length<3)continue;
    const opts=R.shuffle([{t:corr,c:true},...wr.slice(0,3)]);
    const choices=opts.map(o=>{const s=show(o.t);return{svg:svgWrap(110,120,isoCube(55,58,38,s[0],s[1],s[2]),`box showing ${s.map(m=>MARK_NAME[m]).join(', ')}`),t:`Top ${MARK_NAME[s[0]]}, left ${MARK_NAME[s[1]]}, right ${MARK_NAME[s[2]]}`,key:s.join('|'),note:o.c?null:o.note};});
    const a=34,pad=10;let b='';net.cells.forEach((c,i)=>{b+=faceSvg([pad+c[0]*a,pad+c[1]*a],[a,0],[0,a],marks[i]);});
    const oppPairs=[];for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)if(V3.dot(N[i],N[j])===-1)oppPairs.push(`${MARK_NAME[marks[i]]} and ${MARK_NAME[marks[j]]}`);
    const cs=show(corr);
    return mk({type:'cubenet',skill:'Spatial',sub:'Pattern folding (cube nets)',diff,stem:'The pattern shows the outside of a box. Fold it up. Which box can be made from this pattern?',
      svg:svgWrap(net.w*a+2*pad,net.h*a+2*pad,b,'flat cube pattern with marked faces'),choices,answer:cs.join('|'),
      explain:`Opposite faces on this box: ${oppPairs.join('; ')}. Two opposite faces can never be seen together. For the faces that do meet at a corner, the order matters: with ${MARK_NAME[cs[0]]} on top, ${MARK_NAME[cs[1]]} sits on the left and ${MARK_NAME[cs[2]]} on the right. The mirror arrangement is impossible.`,
      params:{cells:net.cells,marks}});}
  throw new Error('cubenet');
}

/* ================= concept questions (added set) ================= */
function FIGC(noun,labels,extra){const c=labels.map(l=>({t:noun+' '+l,key:l}));if(extra)c.push({t:extra,key:'same'});return c;}
function noteAll(ch,ans,f){ch.forEach(c=>{if(c.key!==ans)c.note=f(c.key);});return ch;}
function pathD(pts){return 'M'+pts.map(p=>P(p[0])+' '+P(p[1])).join(' L');}
function Path(pts,cls){return `<path class="${cls}" d="${pathD(pts)}"/>`;}
function perpDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];return Math.abs(dx*(a[1]-p[1])-dy*(a[0]-p[0]))/Math.hypot(dx,dy);}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function pickDiff(R,diff,arr){return arr[Math.min(arr.length-1,diff-1)];}

/* ---------- guy cables on a pole ---------- */
function genGuy(seed,diff){
  const R=RNG(seed);
  for(let att=0;att<600;att++){
    const H=R.int(180,205),gy=H+46,cx=110,W=360,bh=22;
    const dn=R.int(50,78),df=R.int(155,205),low=R.pick([0.45,0.5,0.6]);
    const dl=R.chance(0.5)?dn:R.int(95,135);
    const base=[cx,gy],wireY=gy-H+6;
    const cabs=[{kind:'low',a:[cx,P(gy-H*low)],b:[cx+dl,gy-bh]},{kind:'near',a:[cx,gy-H+10],b:[cx+dn,gy-bh]},{kind:'far',a:[cx,gy-H+10],b:[cx+df,gy-bh]}];
    cabs.forEach(c=>c.T=(gy-wireY)/perpDist(base,c.a,c.b));
    const mode=diff===1?'best':(R.chance(0.3)?'worst':'best');
    const s=cabs.slice().sort((p,q)=>p.T-q.T);
    if(mode==='best'&&s[0].T>0.85*s[1].T)continue;
    if(mode==='worst'&&s[1].T>0.85*s[2].T)continue;
    const labs=R.shuffle(['A','B','C']);cabs.forEach((c,i)=>c.label=labs[i]);
    const tgt=mode==='best'?s[0]:s[2];
    const mir=R.chance(.5),X=x=>mir?W-x:x;
    let b=ground(0,W,gy)+Rect(X(cx)-24,gy,48,9,'metal');
    b+=Poly([[X(cx-9),gy],[X(cx-9),gy-H+4],[X(cx),gy-H-8],[X(cx+9),gy-H+4],[X(cx+9),gy]],'post');
    b+=`<path class="wire2" d="M${P(X(cx-9))} ${P(wireY)} Q${P(X(cx-55))} ${P(wireY+18)} ${P(X(4))} ${P(wireY+6)}"/>`;
    b+=arrow(X(cx-40),wireY-16,X(cx-92),wireY-16)+T(X(cx-66),wireY-24,'wire pulls','lbl-acc');
    [...new Set(cabs.map(c=>c.b[0]))].forEach(x=>b+=Rect(X(x)-13,gy-bh,26,bh,'concrete',2));
    cabs.forEach(c=>{b+=L(X(c.a[0]),c.a[1],X(c.b[0]),c.b[1],'cable')+C(X(c.a[0]),c.a[1],3.2,'dot');});
    cabs.forEach(c=>{const t={low:0.5,near:0.4,far:0.62}[c.kind];const px=c.a[0]+(c.b[0]-c.a[0])*t,py=c.a[1]+(c.b[1]-c.a[1])*t;b+=T(X(px),py+6,c.label,'lbl-on');});
    const NOTE={low:'This cable is attached partway down. The wire pulls at the top, so a low cable has less leverage and leaves the top free to bend.',near:'This cable is steep, anchored close to the pole. It pulls mostly downward and only a little sideways, so it needs a lot of tension.',far:'This cable is attached at the top and anchored far out. That flatter angle pulls the most sideways, so it needs the least tension.'};
    const ch=noteAll(FIGC('Cable',['A','B','C']),tgt.label,k=>NOTE[cabs.find(c=>c.label===k).kind]);
    const explain=mode==='best'?`A guy cable works best when it is attached at the top, where the wire pulls, and anchored far from the pole so it pulls more sideways. Cable ${tgt.label} does both, so it holds the pole with the least tension.`:`Cable ${tgt.label} ${tgt.kind==='low'?'is attached low on the pole, so it has little leverage against a pull at the top':'is anchored close to the pole, so it pulls mostly downward and very little sideways'}. It needs the most tension to hold the pole.`;
    return mk({type:'guy',sub:'Guy cables & angles',diff,stem:mode==='best'?'The overhead wire pulls sideways on the top of the pole. Which cable holds the pole best?':'The overhead wire pulls sideways on the top of the pole. Which cable has to pull the hardest (carries the most tension)?',
      svg:svgWrap(W,gy+14,b,'pole with overhead wire and three guy cables'),choices:ch,answer:tgt.label,explain,params:{base,wireY,mode,cables:cabs.map(c=>({label:c.label,a:c.a,b:c.b}))}});
  }
  throw new Error('guy');
}

/* ---------- steel cable on a bridge ---------- */
function genBridge(seed,diff){
  const R=RNG(seed);const posts=diff===1?1:R.pick([1,2]);const kinds=R.shuffle(['under','over','outside']);const labs=['A','B','C'];
  const W=470,ph=112;let b='';const panels=[];
  kinds.forEach((k,i)=>{const gY=64+i*ph,x1=105,x2=365,top=gY-18;
    b+=`<path class="water" d="M${x1} ${gY} Q${(x1+x2)/2} ${gY+92} ${x2} ${gY} Z"/><path class="bank" d="M${x1} ${gY} Q${(x1+x2)/2} ${gY+92} ${x2} ${gY}"/>`;
    b+=L(12,gY,x1,gY,'ground')+L(x2,gY,W-44,gY,'ground');
    b+=Rect(x1,top,x2-x1,18,'deck');[0.25,0.5,0.75].forEach(f=>b+=L(x1+(x2-x1)*f,top,x1+(x2-x1)*f,gY,'ink-thin'));
    const xs=posts===1?[(x1+x2)/2]:[x1+(x2-x1)/3,x1+2*(x2-x1)/3];let pts;
    if(k==='under'){pts=[[x1,gY],...xs.map(x=>[P(x),gY+30]),[x2,gY]];xs.forEach(x=>b+=L(x,gY,x,gY+30,'strut'));b+=Path(pts,'cable');}
    else if(k==='over'){pts=[[x1,top],...xs.map(x=>[P(x),top-34]),[x2,top]];xs.forEach(x=>b+=L(x,top,x,top-34,'strut'));b+=Path(pts,'cable');}
    else{pts=[[x1,top],[x1-52,gY],null,[x2,top],[x2+52,gY]];b+=L(x1,top,x1-52,gY,'cable')+L(x2,top,x2+52,gY,'cable');}
    b+=T(W-24,gY+6,labs[i],'lbl-L');
    panels.push({label:labs[i],kind:k,deckTop:top,deckBot:gY,span:[x1,x2],cable:pts});});
  const ans=labs[kinds.indexOf('under')];
  const NOTE={over:'Above the deck, a load in the middle drags the peak down and squeezes the cable. A cable can’t resist being squeezed; it just goes slack.',outside:'These cables run from the ends of the bridge to the ground. They never reach the middle of the span, so they don’t help carry a load there.'};
  const ch=noteAll(FIGC('Fig.',labs),ans,k=>NOTE[panels.find(p=>p.label===k).kind]);
  return mk({type:'bridge',sub:'Cables: tension only',diff,stem:diff<3?'A steel cable can pull but it can’t push. Which is the right way to fix the cable so it helps the bridge hold a heavy load in the middle?':'Which is the right way to fix the steel cable so it helps hold up the bridge?',
    svg:svgWrap(W,64+2*ph+56,b,'three bridges with a steel cable fixed three ways'),choices:ch,answer:ans,
    explain:`A steel cable only works when it is pulled tight (tension). In Fig. ${ans} the cable runs under the deck: a load in the middle pushes the post${posts>1?'s':''} down, which stretches the cable, and the cable carries the load out to the banks. Above the deck the same load would squeeze the cable, and a cable can’t push, so it goes slack.`,
    params:{panels}});
}

/* ---------- flywheels ---------- */
function genFlywheel(seed,diff){
  const R=RNG(seed);const Rw=58;const ts=R.shuffle([8,16,26,38]).slice(0,3);const labs=['A','B','C'];const mode=R.pick(['longest','energy','easiest']);
  const I=t=>{const r=Rw-t;return Math.PI/2*(Math.pow(Rw,4)-Math.pow(r,4))+16*(Math.pow(r,3)-343)/3;};
  /* motion: the same torque on every wheel, so each speeds up or slows down at a rate ∝ 1/(its rotating mass I).
     'easiest': all start from rest; otherwise all start at the same speed and the same friction/brake stops them (the heaviest rim coasts longest). */
  const mI=ts.map(I),Ihi=Math.max(...mI),Ilo=Math.min(...mI);const spin=k=>{const Ik=mI[k];if(mode==='easiest'){const al=(1.2/MV_T)*Ilo/Ik;return t=>al*t*t/2;}const w0=0.9,Ts=8.5*Ik/Ihi;return t=>t<Ts?w0*t-w0*t*t/(2*Ts):w0*Ts/2;};
  let b='';ts.forEach((t,i)=>{const cx=72+i*140,cy=74,r=Rw-t;let wb='';
    wb+=`<path class="rim" fill-rule="evenodd" d="M${cx-Rw} ${cy}a${Rw} ${Rw} 0 1 0 ${2*Rw} 0a${Rw} ${Rw} 0 1 0 ${-2*Rw} 0ZM${cx-r} ${cy}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z"/>`;
    for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;wb+=L(cx+7*Math.cos(a),cy+7*Math.sin(a),cx+r*Math.cos(a),cy+r*Math.sin(a),'spoke-s');}
    b+=mvg(aSer(cx,cy,fitSer(spin(i),20)),wb+C(cx,cy,8,'hub'))+T(cx,cy+Rw+26,labs[i],'lbl-L');});
  const Is=ts.map(I);const big=mode!=='easiest';const tgtI=big?Math.max(...Is):Math.min(...Is);const idx=Is.indexOf(tgtI),ans=labs[idx];
  const stem={longest:'The wheels are the same size and made of the same material, and their bearings have the same friction. Each is spun up to the same speed and let go. Which wheel keeps spinning the longest?',
    energy:'The wheels are the same size and made of the same material. All three spin at the same speed. Which one would be hardest to stop?',
    easiest:'The wheels are the same size and made of the same material. Which wheel is easiest to get spinning up to speed?'}[mode];
  const ch=noteAll(FIGC('Wheel',labs),ans,k=>{const t=ts[labs.indexOf(k)];return `Wheel ${k} has a ${t>ts[idx]?'thicker':'thinner'} rim, so it has ${t>ts[idx]?'more':'less'} mass out at the edge.`;});
  return mk({type:'flywheel',sub:'Flywheels & rotating mass',diff,stem,svg:svgWrap(420,176,b,'three wheels with rims of different thickness'),choices:ch,answer:ans,
    explain:`Mass far from the center makes a wheel hard to speed up and hard to slow down; that’s how a flywheel works. Wheel ${ans} has the ${big?'thickest':'thinnest'} rim, so it has the ${big?'most':'least'} mass out at the edge${mode==='easiest'?' and takes the least effort to spin up.':', so it '+(mode==='longest'?'keeps spinning the longest.':'is the hardest to stop.')}`,
    params:{mode,R:Rw,rims:ts.map((t,i)=>({label:labs[i],t}))}});
}

/* ---------- skids and thrown objects ---------- */
function genTurn(seed,diff){
  const R=RNG(seed);const mode=diff===1?R.pick(['skid','bank']):R.pick(['skid','tangent','bank']);
  if(mode==='skid'||mode==='bank'){const bank=mode==='bank';
    const W=380,H=300,w=22,Rc=108,xs=150,y0=246,cyc=y0-Rc;const fx=R.chance(.5),fy=R.chance(.5);const X=x=>fx?W-x:x,Y=y=>fy?H-y:y,tp=p=>[P(X(p[0])),P(Y(p[1]))];
    const edge=r=>{const pts=[[16,cyc+r]];for(let k=0;k<=18;k++){const th=Math.PI/2*(1-k/18);pts.push([xs+r*Math.cos(th),cyc+r*Math.sin(th)]);}pts.push([xs+r,14]);return pts.map(tp);};
    let b='';if(bank){for(let k=-3;k<=22;k++){let p1,p2;if(k<0){const x=150+k*18;p1=[x,y0-22];p2=[x,y0+22];}else if(k<=18){const th=Math.PI/2*(1-k/18);p1=[xs+(Rc-22)*Math.cos(th),cyc+(Rc-22)*Math.sin(th)];p2=[xs+(Rc+22)*Math.cos(th),cyc+(Rc+22)*Math.sin(th)];}else{const y=cyc-(k-18)*18;p1=[xs+Rc-22,y];p2=[xs+Rc+22,y];}p1=tp(p1);p2=tp(p2);b+=L(p1[0],p1[1],p2[0],p2[1],'tie');}b+=Path(edge(Rc-12),'rail')+Path(edge(Rc+12),'rail');}else b=Path(edge(Rc-w),'road')+Path(edge(Rc+w),'road');
    const cl=edge(Rc).slice(0,-1);cl.push(tp([xs+Rc,64]));b+=Path(cl.slice(3),'path-acc');const e=tp([xs+Rc,58]);b+=head(e[0],e[1],fy?Math.PI/2:-Math.PI/2,12);
    if(!bank){const car=[[44,y0-10],[92,y0-10],[98,y0-6],[98,y0+6],[92,y0+10],[44,y0+10]].map(tp);const ws=[tp([80,y0-8]),tp([80,y0+8])];
      // animation: the car runs up to the bend, loses grip and slides off along a much wider curve, out past the outside edge
      const sk=[[79,0]];for(let k=1;k<=12;k++){const ph=0.78*k/12;sk.push([79+270*Math.sin(ph),-270*(1-Math.cos(ph))]);}
      b+=MV('path:'+sk.map(p=>R2(fx?-p[0]:p[0])+','+R2(fy?-p[1]:p[1])).join(','),Poly(car,'car')+L(ws[0][0],ws[0][1],ws[1][0],ws[1][1],'ink'));}
    const inside=R.chance(.5)?'A':'B',outside=inside==='A'?'B':'A';const ri=Rc-w-32,ro=Rc+w+30,c45=Math.SQRT1_2;
    const pi=tp([xs+ri*c45,cyc+ri*c45]),po=tp([xs+ro*c45,cyc+ro*c45]);b+=T(pi[0],pi[1]+7,inside,'lbl-L')+T(po[0],po[1]+7,outside,'lbl-L');
    if(bank){const ch=noteAll([{t:'Rail A',key:'A'},{t:'Rail B',key:'B'},{t:'Both at the same height',key:'same'}],outside,k=>k==='same'?'On a level curve the train pushes hard sideways on the outer rail. Tilting the track inward helps it turn.':'That\u2019s the inner rail. Raising it would tilt the train outward, the way it already wants to go.');
      return mk({type:'turn',sub:'Motion: skids & curves',diff,stem:'A train takes this curve at speed in the direction of the arrow. Which rail should be set higher?',svg:svgWrap(W,H,b,'curved railway track with rails A and B'),choices:ch,answer:outside,
        explain:`A train on a curve wants to keep going straight, which pushes it toward the outside. Raising the outer rail (${outside}) tilts the track inward, like a banked race track, so the tilt helps steer the train around.`,params:{mode,center:tp([xs,cyc]),labels:[{label:inside,pt:pi},{label:outside,pt:po}]}});}
    const ch=[{t:'Toward A',key:'A'},{t:'Toward B',key:'B'},{t:'Either way; it\u2019s random',key:'same'}];
    noteAll(ch,outside,k=>k==='same'?'A skid isn’t random. The car keeps trying to go straight, which carries it to the outside of the curve.':'That’s the inside of the curve. Nothing pulls a skidding car inward, so it slides the other way.');
    return mk({type:'turn',sub:'Motion: skids & curves',diff,stem:'The car takes the curve along the arrow too fast and starts to skid. Which way does it slide?',svg:svgWrap(W,H,b,'car entering a curve with sides A and B'),choices:ch,answer:outside,
      explain:`A moving car wants to keep going straight. On a curve, only the grip of the tires turns it. When the tires lose grip, the car slides toward the outside of the curve, side ${outside}.`,
      params:{mode,center:tp([xs,cyc]),labels:[{label:inside,pt:pi},{label:outside,pt:po}]}});
  }
  const W=330,H=300,cx=165,cy=150,r=86,dir=R.chance(.5)?1:-1;const phi=R.pick([-150,-120,-60,-30,30,60,120,150,90,-90,0,180])*Math.PI/180;
  const Pt=[cx+r*Math.cos(phi),cy+r*Math.sin(phi)],tg=[-Math.sin(phi)*dir,Math.cos(phi)*dir],rd=[Math.cos(phi),Math.sin(phi)];
  const mkP={tangent:()=>[Pt,[Pt[0]+tg[0]*104,Pt[1]+tg[1]*104]],back:()=>[Pt,[Pt[0]-tg[0]*104,Pt[1]-tg[1]*104]],radial:()=>[Pt,[Pt[0]+rd[0]*54,Pt[1]+rd[1]*54]],
    curve:()=>{const a=[];for(let j=0;j<=14;j++){const f=j/14,ang=phi+dir*f*1.0,rr=r+f*52;a.push([cx+rr*Math.cos(ang),cy+rr*Math.sin(ang)]);}return a;}};
  const kinds=R.shuffle(['tangent',...R.shuffle(['radial','curve','back']).slice(0,2)]);const labs=['A','B','C'];
  let b=`<circle cx="${cx}" cy="${cy}" r="${r}" class="orbit"/>`+C(cx,cy,5,'dot')+MV('hide:0.04',L(cx,cy,Pt[0],Pt[1],'string'));// animation: string snaps at once
  b+=arcArrow(cx,cy,r,phi-dir*1.7,1.0,dir===1);
  const paths=kinds.map((k,i)=>{const pts=mkP[k]().map(p=>[P(p[0]),P(p[1])]);const n=pts.length,e=pts[n-1],q=pts[n-2],ang=Math.atan2(e[1]-q[1],e[0]-q[0]);
    b+=Path(pts.slice(0,-1).concat([[e[0]-7*Math.cos(ang),e[1]-7*Math.sin(ang)]]),'opt')+head(e[0],e[1],ang,11,'ink-fill');
    let lp;if(k==='curve'){const m=pts[8],rr=Math.hypot(m[0]-cx,m[1]-cy);lp=[m[0]+(m[0]-cx)/rr*18,m[1]+(m[1]-cy)/rr*18];}else lp=[e[0]+16*Math.cos(ang),e[1]+16*Math.sin(ang)];
    b+=T(clamp(lp[0],12,W-12),clamp(lp[1]+6,18,H-6),labs[i],'lbl-on');return{label:labs[i],kind:k,pts};});
  b+=MV(`path:${R2(tg[0]*100)},${R2(tg[1]*100)}`,C(Pt[0],Pt[1],8,'ball'));// ...and the ball carries straight on along the tangent at steady speed
  const ans=labs[kinds.indexOf('tangent')];const NOTE={radial:'Nothing pushes the ball outward; the string only ever pulled it inward. It goes straight ahead, not straight out.',curve:'With the string gone, nothing curves its path, so it moves in a straight line.',back:'This line points backward, against the way the ball was moving.'};
  const ch=noteAll(FIGC('Path',labs),ans,k=>NOTE[paths.find(p=>p.label===k).kind]);
  return mk({type:'turn',sub:'Motion: skids & curves',diff,stem:'Seen from above, a ball on a string is swung in a circle in the direction of the arrow. The string breaks when the ball is at the spot shown. Which path does the ball take?',
    svg:svgWrap(W,H,b,'ball swung on a string with three possible paths'),choices:ch,answer:ans,
    explain:`Once the string breaks, nothing pulls the ball toward the center, so it keeps going in a straight line in the direction it was moving at that instant: along the tangent, at a right angle to the string. That’s path ${ans}.`,
    params:{mode,center:[cx,cy],ball:[P(Pt[0]),P(Pt[1])],dir,paths:paths.map(p=>({label:p.label,pts:p.pts}))}});
}

/* ---------- gate cable or brace ---------- */
function genGate(seed,diff){
  const R=RNG(seed);const hingeLeft=R.chance(.5);const kind=diff===1?'cable':R.pick(['cable','brace']);
  const gw=140,gh=170,top=34,W=2*gw+104,H=top+gh+22;const good=kind==='cable'?'hiTop':'hiBot';const other=good==='hiTop'?'hiBot':'hiTop';
  const cfg=R.chance(.5)?{A:good,B:other}:{A:other,B:good};let b='';const members=[];
  ['A','B'].forEach((lab,i)=>{const gx=26+i*(gw+52);const hx=hingeLeft?gx:gx+gw,fx=hingeLeft?gx+gw:gx;
    b+=Rect(gx-14,top-14,12,gh+28,'wood')+Rect(gx+gw+2,top-14,12,gh+28,'wood');
    b+=Rect(gx,top,gw,gh,'gate');for(let x=gx+20;x<gx+gw;x+=20)b+=L(x,top,x,top+gh,'ink-thin');
    b+=Rect(gx,top+20,gw,12,'rail')+Rect(gx,top+gh-32,gw,12,'rail');
    [top+22,top+gh-30].forEach(y=>b+=Rect(hx-7,y-3,14,14,'metal',2));b+=Rect(fx-(hingeLeft?9:-1),top+gh/2-14,8,28,'latch',2);
    const inx=hingeLeft?8:-8;const H0=[hx+inx,cfg[lab]==='hiTop'?top+8:top+gh-8],F0=[fx-inx,cfg[lab]==='hiTop'?top+gh-8:top+8];
    if(kind==='cable')b+=L(H0[0],H0[1],F0[0],F0[1],'cable2')+C(H0[0],H0[1],3.5,'dot')+C(F0[0],F0[1],3.5,'dot');
    else{const dx=F0[0]-H0[0],dy=F0[1]-H0[1],l=Math.hypot(dx,dy),nx=-dy/l*6,ny=dx/l*6;b+=Poly([[H0[0]+nx,H0[1]+ny],[F0[0]+nx,F0[1]+ny],[F0[0]-nx,F0[1]-ny],[H0[0]-nx,H0[1]-ny]],'brace');}
    b+=T(gx+gw/2,top-20,lab,'lbl-L');members.push({label:lab,h:H0,f:F0});});
  const ans=cfg.A===good?'A':'B';const side=hingeLeft?'left':'right';
  const ch=noteAll([{t:'Gate A',key:'A'},{t:'Gate B',key:'B'},{t:'Both work equally well',key:'same'}],ans,k=>k==='same'?'The two diagonals act oppositely when a gate sags: one gets stretched and the other gets squeezed.':(kind==='cable'?'This cable runs along the diagonal that gets shorter when the gate sags, so it goes slack and holds nothing.':'This brace runs along the diagonal that gets stretched when the gate sags. A nailed brace is weak when it’s pulled.'));
  return mk({type:'gate',sub:'Gates: cable vs brace',diff,stem:`Both gates hang on hinges on the ${side} side, and their open ends tend to sag. ${kind==='cable'?'A steel cable':'A wooden brace'} is added to each gate to stop the sag. On which gate is it ${kind==='cable'?'fixed':'placed'} correctly?`,
    svg:svgWrap(W,H,b,`two gates with a diagonal ${kind}`),choices:ch,answer:ans,
    explain:kind==='cable'?`When a gate sags, its free end drops. The diagonal from the top hinge corner down to the bottom free corner gets stretched, so a cable there is pulled tight and holds the corner up. That’s gate ${ans}. On the other diagonal a cable would just go slack.`:`When a gate sags, its free end drops. The diagonal from the bottom hinge corner up to the top free corner gets squeezed, so a stiff brace there pushes the free corner back up. That’s gate ${ans}. Braces work in compression; cables work in tension.`,
    params:{hingeLeft,kind,members}});
}

/* ---------- water jets ---------- */
function hoseTank(x0,wt,ys,dir,yn){const top=70,bot=200;const fv=yn>ys?R2(4*Math.sqrt(yn-ys)):0;/* animation: spray flows at a speed ∝ √(head); 0 = nozzle above the water, spray vanishes */let b=Rect(x0,ys,wt,bot-ys,'water')+L(x0,ys,x0+wt,ys,'surface')+`<path class="ink" d="M${x0} ${top} V${bot} H${x0+wt} V${top}"/>`;
  const xw=dir>0?x0+wt:x0,y=bot-12,xn=xw+dir*84;const d=`M${xw} ${y} H${xw+dir*20} Q${xw+dir*40} ${y} ${xw+dir*40} ${y+20} V244 Q${xw+dir*40} 266 ${xw+dir*62} 266 Q${xn} 266 ${xn} 244 V${yn}`;
  b+=`<path class="hose-o" d="${d}"/>`+`<path class="hose-i" d="${d}"/>`+Rect(xn-6,yn-6,12,8,'metal',1);
  b+=MV(fv?`flow:${fv}`:'hide:0.06',[-5,0,5].map(o=>L(xn+o,yn-12,xn+o*1.6,yn-22,'spray')).join(''));return{b,xn};}
function genJet(seed,diff){
  const R=RNG(seed);const mode=diff===1?'level':R.pick(['level','none','two']);
  if(mode==='two'){const W=420;const eq=R.chance(0.35);let wA=R.int(50,115),wB=R.int(50,Math.min(115,188-wA));if(Math.abs(wA-wB)<20){if(wA<wB)wA=Math.max(50,wB-30);else wB=Math.max(50,wA-30);}
    const ysA=R.int(90,150),ysB=eq?ysA:((ysA<106||R.chance(.5))?ysA+R.int(22,40):ysA-R.int(22,Math.min(40,ysA-80)));const yn=R.int(205,225);
    const A=hoseTank(20,wA,ysA,1,yn),B=hoseTank(W-20-wB,wB,ysB,-1,yn);let b=A.b+B.b+T(20+wA/2,60,'A','lbl-L')+T(W-20-wB/2,60,'B','lbl-L');
    const ans=ysA===ysB?'same':(ysA<ysB?'A':'B');
    const ch=noteAll([{t:'Jet A',key:'A'},{t:'Jet B',key:'B'},{t:'Both reach the same height',key:'same'}],ans,k=>k==='same'?'The water levels differ, and the level is what sets the jet height.':'Tank width doesn’t matter. Only the height of the water surface above the nozzle does.');
    return mk({type:'jet',sub:'Water level & jets',diff,stem:'The hoses and nozzles are the same. Ignoring friction, which jet of water shoots higher?',svg:svgWrap(W,284,b,'two tanks of different widths feeding upward nozzles'),choices:ch,answer:ans,
      explain:ans==='same'?'Both tanks are filled to the same level. Jet height depends only on the water level above the nozzle, not the size of the tank, so both reach the same height.':`Jet height depends only on how high the water surface is above the nozzle, not on how wide the tank is. Tank ${ans} has the higher water level, so jet ${ans} goes higher.`,
      params:{mode,tanks:[{label:'A',ys:ysA,w:wA},{label:'B',ys:ysB,w:wB}],yn}});}
  const W=360;let ys,yn,lines;
  if(mode==='level'){ys=R.int(100,128);const pos=R.int(0,2);lines=[0,1,2].map(k=>ys+(k-pos)*28);yn=R.int(Math.max(lines[2]+16,ys+40),236);}
  else{ys=R.int(150,172);yn=R.int(84,ys-34);lines=[yn-30,ys];}
  const Tk=hoseTank(40,110,ys,1,yn);let b='';lines.forEach((y,i)=>{b+=L(26,y,322,y,'ref')+T(338,y+5,String(i+1),'lbl-L');});b+=Tk.b;
  const ansLine=lines.findIndex(y=>y===ys);let ch,ans;
  if(mode==='level'){ans=String(ansLine+1);ch=lines.map((y,i)=>({t:'Line '+(i+1),key:String(i+1)}));noteAll(ch,ans,k=>+k-1<ansLine?'Water can’t rise above the level it comes from.':'With no friction, the water climbs all the way back to the tank’s water level, not lower.');}
  else{ans='none';ch=[{t:'Line 1',key:'1'},{t:'Line 2',key:'2'},{t:'No water comes out',key:'none'}];noteAll(ch,ans,k=>k==='1'?'Water can’t rise above the level it comes from, and this line is higher still.':'Line 2 is the tank’s water level, but the nozzle is above it. The water can’t even reach the nozzle.');}
  return mk({type:'jet',sub:'Water level & jets',diff,stem:mode==='level'?'The tank is filled to the dashed water line and the hose is opened. Ignoring friction, about how high does the water jet rise?':'The hose runs from the bottom of the tank up to the nozzle. Ignoring friction, how high does water shoot out of the nozzle?',
    svg:svgWrap(W,284,b,'tank with hose and numbered height lines'),choices:ch,answer:ans,
    explain:mode==='level'?`Water can only rise as high as the level it comes from. With no friction, the jet climbs back up to the water level in the tank, line ${ans}. The shape of the hose doesn’t matter.`:'The nozzle sits higher than the water level in the tank. Water in the hose only rises to the tank’s level, so it never reaches the nozzle and nothing comes out.',
    params:{mode,ys,yn,lines}});
}

/* ---------- comparing block and tackle ---------- */
function tackleDraw(n,x0,s,ceil,Wt){
  const rad=s/2,ytop=ceil+46,xs=[];for(let i=0;i<=n;i++)xs.push(x0+i*s);const ybot=n>1?ceil+170:null,loadTop=n>1?null:ceil+160;const endsTop=i=>((n-1-i)%2===0);
  let body='';const topC=[],botC=[];for(let i=0;i<n;i++){const c=(xs[i]+xs[i+1])/2;if(endsTop(i))topC.push(c);else botC.push(c);}
  // animation: every load rises the same dL px; rope dashes march at the real rope speed (pull end = segments × load speed)
  const dL=20,vL=dL/7.65,UP=`mov:0,${-dL}`,sv=tackleRopeV(n,endsTop,vL),sIdx=c=>Math.round((c-xs[0])/s-0.5);
  topC.forEach(c=>body+=L(c,ceil,c,ytop,'strap'));const anchorTop=!endsTop(0);let plateY=null,mx0,mx1;
  if(n>1){plateY=ybot+rad+14;mx0=Math.min(xs[0],...botC.map(c=>c-rad))-10;mx1=Math.max(...botC.map(c=>c+rad))+10;if(!anchorTop)mx0=Math.min(mx0,xs[0]-10);botC.forEach(c=>body+=MV(UP,L(c,ybot,c,plateY,'strap')));}
  const segs=[];let rp='';for(let i=0;i<n;i++){let yA=ytop,yB=n>1?ybot:loadTop;if(i===0){if(anchorTop)yA=ceil;else if(n>1)yB=plateY;}segs.push([xs[i],yA,xs[i],yB]);rp+=MV(`mov:0,${-dL/2};flow:${R2((endsTop(i)?-1:1)*sv[i])}`,L(xs[i],yA,xs[i],yB,'rope'));}
  const yFree=n>1?ybot+60:loadTop+40;segs.push([xs[n],ytop,xs[n],yFree]);rp+=MV(`flow:${R2(n*vL)}`,L(xs[n],ytop,xs[n],yFree-8,'rope'))+head(xs[n],yFree+4,Math.PI/2,12,'acc-f');
  topC.forEach(c=>{body+=C(c,ytop,rad-2,'sheave')+C(c,ytop,2.5,'dot');rp+=MV(`flow:${R2(sv[sIdx(c)])}`,`<path class="rope" d="M${P(c-rad)} ${ytop} A${rad} ${rad} 0 0 1 ${P(c+rad)} ${ytop}"/>`);});
  botC.forEach(c=>{body+=MV(UP,C(c,ybot,rad-2,'sheave')+C(c,ybot,2.5,'dot'));rp+=MV(`${UP};flow:${R2(sv[sIdx(c)+1]-vL)}`,`<path class="rope" d="M${P(c-rad)} ${ybot} A${rad} ${rad} 0 0 0 ${P(c+rad)} ${ybot}"/>`);});
  if(anchorTop)body+=C(xs[0],ceil,3.5,'dot');let lx,ly2;
  if(n>1){lx=(mx0+mx1)/2;ly2=plateY+18;body+=MV(UP,Rect(mx0,plateY,mx1-mx0,7,'metal',2)+L(lx,plateY+7,lx,plateY+18,'strap')+(!anchorTop?C(xs[0],plateY,3.5,'dot'):''));}
  else{lx=xs[0];ly2=loadTop;mx0=lx-s*0.6;mx1=lx+s*0.6;}
  body+=rp+MV(UP,Rect(lx-32,ly2,64,42,'load',3)+T(lx,ly2+26,Wt+' lb','lbl-sb'));
  return{body,segs,span:[P(mx0),P(mx1)],ytop,movingY:n>1?ybot:loadTop,right:xs[n]+14,bottom:ly2+42,cx:(Math.min(xs[0],lx-32)+Math.max(xs[n],lx+32))/2};}
function genTackle(seed,diff){
  const R=RNG(seed);let nA,nB;const eq=diff>1&&R.chance(0.3);nA=R.int(1,4);if(eq)nB=nA;else{do{nB=R.int(1,4);}while(nB===nA);}
  const sA=R.pick([28,34,40]),sB=eq?(sA===34?40:34):R.pick([28,34,40]);const mode=R.pick(['force','rope','harder']);const Wt=R.pick([120,180,240,300]);
  const ceil=26;const A=tackleDraw(nA,50,sA,ceil,Wt);const bx=Math.max(A.right+50,190);const B=tackleDraw(nB,bx,sB,ceil,Wt);const W=B.right+40,H=Math.max(A.bottom,B.bottom)+34;
  let b=ceiling(20,W-20,ceil)+A.body+B.body+T(A.cx,H-10,'System A','lbl-b')+T(B.cx,H-10,'System B','lbl-b');
  const more=nA===nB?'same':(nA>nB?'A':'B'),fewer=nA===nB?'same':(nA<nB?'A':'B');const ans=mode==='harder'?fewer:more;
  const stem={force:'Both loads weigh the same. Which system needs less pulling force to hold its load? (Ignore friction.)',rope:'Both loads are raised the same height. Which system needs more rope pulled through?',harder:'Both loads weigh the same. Which system is harder to pull? (Ignore friction.)'}[mode];
  const ch=noteAll([{t:'System A',key:'A'},{t:'System B',key:'B'},{t:'The same',key:'same'}],ans,k=>k==='same'?'Count the rope segments holding up each moving block; the counts are different.':(nA===nB?'Both have the same number of supporting rope segments; the size and spacing of the pulleys doesn’t matter.':'Count only the rope segments that hold up the moving block (not the pull end).'));
  return mk({type:'tackle',sub:'Block & tackle compare',diff,stem,svg:svgWrap(W,H,b,'two pulley systems'),choices:ch,answer:ans,
    explain:`Count the rope segments holding up each load: A has ${nA}, B has ${nB}. More segments means less force but more rope to pull (force = load ÷ segments; rope = lift × segments). ${ans==='same'?'The counts match, so the systems behave the same even though they look different.':''}`,
    params:{mode,systems:[{label:'A',segs:A.segs,span:A.span,ytop:A.ytop,movingY:A.movingY},{label:'B',segs:B.segs,span:B.span,ytop:B.ytop,movingY:B.movingY}]}});
}

/* ---------- pump valves ---------- */
function pumpDraw(ox,top,bot,label,flat,hTop,hBot,anim){
  // anim ('down'|'up', stroke mode only): piston moves 7 px that way, handle turns about its pivot, and the one valve that opens tilts up
  const xL=ox+30,xR=ox+100,xc=ox+65;let b='';
  b+=`<path class="wall" d="M${xL} 64 V88 H${xL-24} M${xL-24} 104 H${xL} V252 H${ox+52} V296 M${xR} 64 V252 H${ox+78} V296"/>`;
  b+=Rect(ox+53,252,24,44,'water')+Rect(xL+2,196,xR-xL-4,56,'water');
  const flap=(y,hingeLeft,dir,x1,x2,open)=>{const px=hingeLeft?x1:x2,sg=hingeLeft?1:-1,len=(x2-x1)-3,ang=flat?0:0.42;let s='';
    const ledge=dir==='up'?y+2:y-7;s+=Rect(hingeLeft?x2-5:x1,ledge,5,5,'metal');const fl=L(px,y,px+sg*len*Math.cos(ang),y+(dir==='up'?-1:1)*len*Math.sin(ang),'vflap');
    s+=(open?MV(`tilt:${px},${y},${-sg*38}`,fl):fl)+C(px,y,4.5,'dot');return s;};
  b+=flap(210,hBot,bot,xL+1,xR-1,anim==='up');
  const yp=138,dy=anim==='down'?7:-7;let pi=L(xc,32,xc,yp-22,'rodline')+L(xc,yp-22,xL+8,yp,'ink')+L(xc,yp-22,xR-8,yp,'ink');
  pi+=Rect(xL+1,yp,12,16,'metal')+Rect(xR-13,yp,12,16,'metal');pi+=flap(yp+8,hTop,top,xL+13,xR-13,anim==='down');b+=anim?MV(`mov:0,${dy}`,pi):pi;
  const hd=`<path class="handle" d="M${xc} 32 Q${xc+30} 16 ${xc+58} 14"/>`;b+=(anim?MV(`tilt:${xc+22},26,${R2(-Math.asin(dy/22)*180/Math.PI)}`,hd):hd)+L(xR,64,xc+22,26,'ink')+C(xc+22,26,3,'dot');
  if(label)b+=T(xc,318,label,'lbl-L');return b;}
function genPump(seed,diff){
  const R=RNG(seed);const mode=diff===1?'place':R.pick(['place','place','stroke']);
  if(mode==='place'){const wrong=R.shuffle([['down','up'],['up','down'],['down','down']]).slice(0,2);const cfgs=R.shuffle([['up','up'],...wrong]);const labs=['A','B','C'];let b='';
    const pumps=cfgs.map((c,i)=>{const hT=R.chance(.5),hB=R.chance(.5);b+=pumpDraw(8+i*140,c[0],c[1],labs[i],false,hT,hB);return{label:labs[i],top:c[0],bot:c[1]};});
    const ans=labs[cfgs.findIndex(c=>c[0]==='up'&&c[1]==='up')];
    const ch=noteAll(FIGC('Pump',labs),ans,k=>{const p=pumps.find(q=>q.label===k);const bad=[p.top==='down'?'the piston valve':null,p.bot==='down'?'the bottom valve':null].filter(Boolean);return `In pump ${k}, ${bad.join(' and ')} open${bad.length>1?'':'s'} downward, so water would run back down instead of being lifted.`;});
    return mk({type:'pump',sub:'Pumps & check valves',diff,stem:diff<3?'In a hand pump, water must only be able to move upward. In which pump are both valves placed correctly?':'In which pump are the valves placed correctly?',
      svg:svgWrap(430,326,b,'three hand pumps with flap valves'),choices:ch,answer:ans,
      explain:`Both valves in a lift pump must open upward. On the down-stroke the piston valve opens so water passes up through the piston, while the bottom valve stays shut. On the up-stroke the piston valve shuts and lifts the water out, while the bottom valve opens to let more water in. Pump ${ans} is the only one with both flaps opening upward.`,
      params:{mode,pumps}});}
  const stroke=R.pick(['down','up']);const hT=R.chance(.5),hB=R.chance(.5);let b=pumpDraw(110,'up','up','',true,hT,hB,stroke);
  b+=arrow(228,stroke==='down'?52:112,228,stroke==='down'?112:52)+T(236,86,stroke==='down'?'piston down':'piston up','lbl-acc','start');
  b+=T(252,150,'piston valve','lbl-s','start')+L(212,146,248,146,'dim')+T(252,214,'bottom valve','lbl-s','start')+L(212,210,248,210,'dim');
  const ans=stroke==='down'?'piston':'foot';
  const ch=noteAll([{t:'Only the piston valve',key:'piston'},{t:'Only the bottom valve',key:'foot'},{t:'Both valves',key:'both'}],ans,k=>k==='both'?'If both were open at once, the water would just slosh back down. One valve always holds while the other opens.':(stroke==='down'?'On the down-stroke the piston squeezes the water below it. That pressure pushes the bottom flap shut and the piston flap open.':'On the up-stroke the water above the piston is being lifted. Its weight holds the piston flap shut while the space below opens the bottom flap.'));
  return mk({type:'pump',sub:'Pumps & check valves',diff,stem:`Both valves can only open upward. The piston is moving ${stroke.toUpperCase()}. Which valve is open?`,svg:svgWrap(360,326,b,'hand pump with closed flap valves'),choices:ch,answer:ans,
    explain:stroke==='down'?'Moving down, the piston pushes on the water below it. The bottom valve is pushed shut, and the water flows up through the open piston valve to get above the piston.':'Moving up, the piston lifts the water above it, so the piston valve is held shut. The space below the piston opens up, and the bottom valve opens to let water in.',
    params:{mode,stroke}});
}

/* ---------- chain between hooks ---------- */
function genChain(seed,diff){
  const R=RNG(seed);for(let att=0;att<400;att++){
    const xA=86,xB=314,eq=R.chance(diff===1?0.15:0.3);const a=R.int(80,170),x0=eq?200:200+(R.chance(.5)?1:-1)*R.int(28,80);const yv=230;
    const yAt=x=>yv-a*(Math.cosh((x-x0)/a)-1);const yL=yAt(xA),yR=yAt(xB);if(Math.min(yL,yR)<40||Math.max(yL,yR)>yv-18)continue;if(!eq&&Math.abs(yL-yR)<18)continue;
    const pts=[];for(let x=xA;x<=xB;x+=6)pts.push([x,P(yAt(x))]);pts.push([xB,P(yR)]);
    let b=Rect(10,yL-4,xA-18,266-yL,'concrete')+Rect(xB+8,yR-4,W0-18-xB,266-yR,'concrete');
    b+=`<path class="hook" d="M${xA-8} ${P(yL-2)} H${xA} q6 0 6 6 q0 6 -6 6"/>`+`<path class="hook" d="M${xB+8} ${P(yR-2)} H${xB} q-6 0 -6 6 q0 6 6 6"/>`;
    b+=Path(pts,'chain');
    const leftIsA=R.chance(.5);const lL=leftIsA?'A':'B',lR=leftIsA?'B':'A';b+=T(xA+4,yL-16,lL,'lbl-L')+T(xB-4,yR-16,lR,'lbl-L');
    const higher=eq?'same':(yL<yR?lL:lR);
    const ch=noteAll([{t:'Hook A carries more',key:'A'},{t:'Hook B carries more',key:'B'},{t:'Both carry the same',key:'same'}],higher,k=>k==='same'?'The hooks are at different heights, so the lowest point of the chain isn’t in the middle.':'The lowest point of the chain is closer to this hook, so less chain hangs from it.');
    return mk({type:'chain',sub:'Hanging chains',diff,stem:'A chain hangs between hooks A and B. How is the chain’s weight shared between the hooks?',svg:svgWrap(W0,272,b,'chain hanging between two hooks'),choices:ch,answer:higher,
      explain:higher==='same'?'The hooks are at the same height, so the chain’s lowest point is right in the middle and each hook holds half.':`Each hook holds the chain from itself down to the lowest point. The lowest point is closer to the lower hook, so the higher hook (${higher}) holds the longer piece, and more weight.`,
      params:{a,x0,hooks:[{label:lL,x:xA},{label:lR,x:xB}]}});}
  throw new Error('chain');
}
const W0=400;

/* ---------- cable sag and sling angles ---------- */
function genSag(seed,diff){
  const R=RNG(seed);const kind=diff===1?'sag':R.pick(['sag','sling']);const eq=diff>1&&R.chance(0.25);const mode=R.pick(['more','less']);const Wt=R.pick([100,200,300,400,500]);
  let b='';const setups=[];const labs=['A','B'];
  const flat=R.pick([0,1]);
  labs.forEach((lab,i)=>{const p0=i*210;let geo;
    if(kind==='sag'){let half=74,s=(i===flat)?R.int(10,18):R.int(46,74);if(eq){s=i===0?R.int(24,40):null;}
      if(eq&&i===1){const k=0.62;half=74*k;s=setups[0].s*k;}
      const x1=p0+105-half,x2=p0+105+half,yt=62;b+=Rect(x1-16,yt-10,16,190,'concrete')+Rect(x2,yt-10,16,190,'concrete');
      const m=[p0+105,yt+s];b+=Path([[x1,yt],m,[x2,yt]],'cable')+C(x1,yt,3,'dot')+C(x2,yt,3,'dot')+L(m[0],m[1],m[0],m[1]+26,'cable')+Rect(m[0]-28,m[1]+26,56,30,'load',3)+T(m[0],m[1]+46,Wt+' lb','lbl-sb');
      geo={half,s};}
    else{let h=(i===flat)?R.int(34,48):R.int(92,118),sp=120;if(eq){h=i===0?R.int(55,80):setups[0].s*0.7;sp=i===0?120:84;}
      const hx=p0+105,hy=36,ly=hy+h;b+=`<path class="hook" d="M${hx} ${hy-22} V${hy-8} q0 8 -8 8 q-8 0 -8 -8"/>`+C(hx,hy,3,'dot');
      b+=L(hx,hy,hx-sp/2,ly,'cable')+L(hx,hy,hx+sp/2,ly,'cable')+Rect(hx-sp/2-14,ly,sp+28,36,'load',3)+T(hx,ly+23,Wt+' lb','lbl-sb');geo={half:sp/2,s:h};}
    b+=T(p0+105,272,(kind==='sag'?'Cable ':'Setup ')+lab,'lbl-b');setups.push(Object.assign({label:lab},geo));});
  const Tn=g=>Wt*Math.hypot(g.half,g.s)/(2*g.s);const t0=Tn(setups[0]),t1=Tn(setups[1]);
  const ans=Math.abs(t0-t1)<1e-6*t0?'same':((mode==='more')===(t0>t1)?'A':'B');
  const noun=kind==='sag'?'Cable':'Setup';
  const ch=noteAll([{t:noun+' A',key:'A'},{t:noun+' B',key:'B'},{t:'Both the same',key:'same'}],ans,k=>k==='same'?'The angles are different, and the angle is what sets the tension.':(eq?'This is just a scaled copy of the other one. Same angles, same tension.':`The flatter the ${kind==='sag'?'cable':'slings'}, the harder ${kind==='sag'?'it pulls':'they pull'}; ${mode==='more'?'this one is steeper, so it carries less.':'this one is flatter, so it carries more.'}`));
  const stem=kind==='sag'?`Both cables are the same and carry the same weight at the middle. Which cable ${mode==='more'?'is under more tension (more likely to break)':'is under less tension'}?`:`Both loads weigh the same and hang from two slings. In which setup ${mode==='more'?'does each sling carry more tension':'does each sling carry less tension'}?`;
  return mk({type:'sag',sub:'Cable angles & slings',diff,stem,svg:svgWrap(420,282,b,kind==='sag'?'two cables with different sag holding weights':'two sling setups with different angles'),choices:ch,answer:ans,
    explain:ans==='same'?'Setup B is a smaller copy of setup A with the same angles. Tension depends on the angle, not the size, so it’s the same.':`Only the up-and-down part of a ${kind==='sag'?'cable’s':'sling’s'} pull holds the weight. The flatter it runs, the harder it has to pull to give the same lift. ${kind==='sag'?'A tight, flat cable':'Slings at a flat angle'} can carry several times the load itself. That’s why riggers avoid flat sling angles.`,
    params:{kind,mode,W:Wt,setups}});
}

/* ---------- gear between two racks ---------- */
function genRack(seed,diff){
  const R=RNG(seed);const mode=diff===1?'rack':diff===2?R.pick(['rack','center']):diff>=4?R.pick(['center','same','opp']):R.pick(['rack','center','same','opp']);const d=R.pick([8,12,16,20,24]);
  const topMoves=R.chance(.5);const right=R.chance(.5)?1:-1;let vT=null,vB=null,vC=null,ask,ans,ks,stem,explain;
  const RCH={half:'Half as far',same:'The same distance',twice:'Twice as far',none:'It does not move'};
  const mv=topMoves?'top':'bottom',fx=topMoves?'bottom':'top';
  if(mode==='rack'){if(topMoves){vT=right*d;vB=0;}else{vB=right*d;vT=0;}ask='C';ans='half';ks=['half','same','twice'];
    stem=`The ${mv} rack moves in the direction of the arrow. The ${fx} rack is fixed. How far does the center of the gear move, compared with the moving rack?`;
    explain='The gear’s center always moves the average of the two racks. One rack is fixed, so the gear rolls along it and its center moves half as far as the moving rack.';}
  else if(mode==='center'){vC=right*d;if(topMoves)vB=0;else vT=0;ask=topMoves?'T':'B';ans='twice';ks=['twice','same','half'];
    stem=`The gear’s axle is pushed in the direction of the arrow. The ${fx} rack is fixed. How far does the ${mv} rack move, compared with the axle?`;
    explain='The fixed rack doesn’t move, so the gear rolls along it. The top of a rolling wheel moves twice as far as its center, so the loose rack moves twice as far as the axle.';}
  else if(mode==='same'){vT=right*d;vB=right*d;ask='C';ans='same';ks=['same','half','none'];
    stem='Both racks move the same distance in the same direction. How far does the center of the gear move, compared with each rack?';
    explain='Both racks move together, so the gear doesn’t turn. It just rides along and moves the same distance as the racks.';}
  else{vT=right*d;vB=-right*d;ask='C';ans='none';ks=['none','same','half'];
    stem='The top rack moves one way while the bottom rack moves the same distance the other way. How far does the center of the gear move?';
    explain='The racks pull in opposite directions by the same amount, so they cancel out. The gear spins in place and its center doesn’t move.';}
  const cx=200,cy=128,m=9,n=10,rp=45,a=0.95*m,p=Math.PI*m;let b='';
  const rack=(pitchY,up)=>{let s=Rect(18,up?pitchY+a:pitchY-a-34,364,34,'rack');for(let k=-7;k<=6;k++){const xc=cx+(k+0.5)*p;if(xc<24||xc>376)continue;const y0=up?pitchY+a:pitchY-a,y1=up?pitchY-a:pitchY+a;s+=Poly([[xc-0.3*p,y0],[xc+0.3*p,y0],[xc+0.15*p,y1],[xc-0.15*p,y1]],'rack');}return s;};
  /* motion: racks and axle slide at steady speed (px over the run); the gear turns at (top - bottom)/(2r) */
  const S=mode==='same'||mode==='opp'?40:56,dT=mode==='rack'?(topMoves?right*S:0):mode==='center'?(topMoves?right*S:0):vT/Math.abs(vT)*S,dB=mode==='rack'?(topMoves?0:right*S):mode==='center'?(topMoves?0:right*S):vB/Math.abs(vB)*S;
  const dC=(dT+dB)/2,wG=(dT-dB)/(2*rp)/MV_T,sl=d=>d?aSlide(d,0,linSer(Math.abs(d)/MV_T),8*Math.abs(d)):'';
  b+=mvg(sl(dT),rack(cy-rp,false))+mvg(sl(dB),rack(cy+rp,true));
  if(vT===0)b+=ceiling(18,382,cy-rp-a-34);if(vB===0)b+=ground(18,382,cy+rp+a+34);
  b+=mvg([sl(dC),wG?aRot(cx,cy,wG):''].filter(Boolean).join(';'),gearPath(cx,cy,rp,n,-Math.PI/2,m)+C(cx,cy,6,'dot'));
  const arr=(y,v)=>{const s=Math.sign(v);return arrow(cx-s*60,y,cx+s*60,y);};
  if(vT)b+=arr(cy-rp-a-17+6,vT);if(vB)b+=arr(cy+rp+a+17+6,vB);
  if(vC)b+=arrow(cx,cy,cx+Math.sign(vC)*70,cy);
  if(ask==='T')b+=T(cx,cy-rp-a-10,'?','lbl-acc');if(ask==='B')b+=T(cx,cy+rp+a+30,'?','lbl-acc');
  const ch=R.shuffle(ks).map(k=>({t:RCH[k],key:k,note:k===ans?null:({half:'The center of a gear between two racks moves the average of the two racks.',same:'Only if both racks move together does the center move the same as the racks.',twice:'The rolling gear’s center moves less than the loose rack, not more.',none:'The gear’s center only stays put when the two racks cancel each other out.'})[k]}));
  return mk({type:'rack',sub:'Gears & racks',diff,stem,svg:svgWrap(400,262,b,'gear between two toothed racks'),choices:ch,answer:ans,explain,
    params:{vT,vB,vC,ask,rel:ans}});
}

/* ---------- bicycle gearing ---------- */
function genBike(seed,diff){
  const R=RNG(seed);const F=[24,28,32,36,40,44,48,52],Rr=[11,12,14,16,18,21,24,28];const mode=R.pick(['hard','easy','fast']);
  for(let att=0;att<500;att++){const sameRear=diff===1;const r0=R.pick(Rr);const bikes=[0,1,2].map(()=>({f:R.pick(F),r:sameRear?r0:R.pick(Rr)}));
    const rs=bikes.map(x=>x.f/x.r).sort((a,b)=>a-b);if(rs[1]/rs[0]<1.3||rs[2]/rs[1]<1.3)continue;
    const labs=['A','B','C'];let b='';bikes.forEach((bk,i)=>{const y=58+i*112,fr={x:92,y,r:bk.f*0.78},rr={x:300,y,r:bk.r*0.78};bk.label=labs[i];
      /* motion: every rider pedals at the same steady rate (counterclockwise: the bikes face left); the chain carries the rim speed, so the rear turns f/r times as fast */
      const wF=-0.7,wR=wF*bk.f/bk.r;
      b+=mvg(aRot(300,y,wR),C(300,y,50,'tire')+C(300,y,44,'ink-thin'));for(const l of beltLines(fr,rr,false))b+=mvg(beltFlow(l,fr,wF),L(l[0],l[1],l[2],l[3],'chainline'));
      b+=mvg(aRot(fr.x,y,wF),C(fr.x,y,fr.r,'sprocket'))+mvg(aRot(rr.x,y,wR),C(rr.x,y,rr.r,'sprocket')+C(300,y,3,'dot'));const ca=-1.0,cl=fr.r+14;
      b+=mvg(aRot(fr.x,y,wF),L(fr.x-cl*Math.cos(ca),y-cl*Math.sin(ca),fr.x+cl*Math.cos(ca),y+cl*Math.sin(ca),'crank')+C(fr.x,y,4,'dot'));
      [1,-1].forEach(s=>{const px=fr.x+s*cl*Math.cos(ca),py=y+s*cl*Math.sin(ca);b+=mvg(aCircle(fr.x,y,px,py,wF),L(px-9,py,px+9,py,'pedal'));});
      b+=T(22,y+6,labs[i],'lbl-L')+T(362,y-3,`front ${bk.f}T`,'lbl-s','start')+T(362,y+15,`rear ${bk.r}T`,'lbl-s','start');});
    const ratio=bk=>bk.f/bk.r;const pick=mode==='easy'?Math.min(...bikes.map(ratio)):Math.max(...bikes.map(ratio));const ans=bikes.find(bk=>ratio(bk)===pick).label;
    const ordr=bikes.slice().sort((a,b)=>ratio(a)-ratio(b)).map(x=>x.label);const rk=k=>['the smallest','the middle','the largest'][ordr.indexOf(k)];
    const ch=noteAll(FIGC('Bike',labs),ans,k=>`Bike ${k} has ${rk(k)} front-to-rear sprocket size ratio of the three. A big front sprocket with a small rear one covers more ground per pedal turn but is harder to push.`);
    const stem={hard:'The wheels are the same size. Which bike is hardest to pedal up a hill?',easy:'The wheels are the same size. Which bike is easiest to pedal up a hill?',fast:'The wheels are the same size. Pedaling at the same speed on flat ground, which bike goes fastest?'}[mode];
    return mk({type:'bike',sub:'Chain drives & bike gears',diff,stem,svg:svgWrap(460,350,b,'three bicycle chain drives'),choices:ch,answer:ans,
      explain:`Compare the front sprocket with the rear sprocket on each bike. A big front sprocket with a small rear one sends the wheel around more times per pedal turn: it is hard to push uphill but fast on flat ground. A small front sprocket with a big rear one is easy to push. ${mode==='easy'?'The smallest':'The biggest'} front-to-rear size ratio here is bike ${ans}.`,
      params:{mode,bikes:bikes.map(x=>({label:x.label,f:x.f,r:x.r}))}});}
  throw new Error('bike');
}

/* ---------- winch drums ---------- */
function winchDraw(p0,r,Rh,label,w){const k=4.6,cx=p0+108,cy=100,rp=r*k,Rp=Rh*k;let b=Poly([[cx,cy],[cx-56,200],[cx-26,200]],'metal')+ground(p0+20,p0+200,200);
  /* motion (w<0, counterclockwise): the rope on the right of the drum winds in at w*r and the load rises with it */
  const up=w?-w*rp:0;b+=mvg(w?'flow:'+nf(-up):'',L(cx+rp,cy,cx+rp,212,'rope'))+mvg(w?aSlide(0,-1,linSer(up),8*up*MV_T):'',Rect(cx+rp-24,212,48,32,'load',3));
  const ang=-2.4,ex=cx+Rp*Math.cos(ang),ey=cy+Rp*Math.sin(ang);b+=mvg(w?aRot(cx,cy,w):'',C(cx,cy,rp,'drum')+L(cx,cy,cx+rp,cy,'dim')+C(cx,cy,3,'dot')+L(cx,cy,ex,ey,'crank')+C(ex,cy+Rp*Math.sin(ang),7,'knob'));
  if(label)b+=T(p0+108,22,label,'lbl-b');return b;}
function genWinch(seed,diff){
  const R=RNG(seed);const Wt=120;const RS=[8,10,12,15,16,18,20];
  for(let att=0;att<2000;att++){const eq=diff>1&&R.chance(0.25);const rA=R.int(2,6),RA=R.pick(RS);let rB,RB;
    if(eq){const k=R.pick([0.5,1.5,2]);rB=rA*k;RB=RA*k;if(!isInt(rB)||!isInt(RB)||rB>6||rB<2||RB>20||RB<8)continue;}else{rB=R.int(2,6);RB=R.pick(RS);const q=(rA/RA)/(rB/RB);if(q<1.4&&q>1/1.4)continue;}
    const fA=rA/RA,fB=rB/RB;const harder=Math.abs(fA-fB)<1e-9?'same':(fA>fB?'A':'B');
    const wW=-Math.min(0.6,55/(MV_T*4.6*Math.max(rA,rB)));const b=winchDraw(0,rA,RA,'Winch A',wW)+winchDraw(220,rB,RB,'Winch B',wW);
    const note='Compare the length of the handle with the radius of the drum (the dashed line). A longer handle for the same drum makes the load easier to turn; a bigger drum for the same handle makes it harder.';
    const ch=noteAll([{t:'Winch A',key:'A'},{t:'Winch B',key:'B'},{t:'The same',key:'same'}],harder,k=>k==='same'?'The handle and drum are in different proportions on these two winches.':note);
    return mk({type:'winch',sub:'Winches & wheel and axle',diff,stem:'Both winches lift the same load. With which winch is it harder to turn the handle?',svg:svgWrap(440,262,b,'two winches with different drums and handles'),choices:ch,answer:harder,
      explain:`A winch is a wheel and axle. The longer the handle compared with the drum radius, the easier it is to turn. ${harder==='same'?'Both winches have the same proportion of handle to drum, so they are equally hard.':`Winch ${harder} has the shorter handle compared with its drum, so it is harder to turn.`}`,
      params:{mode:'compare',W:Wt,winches:[{label:'A',r:rA,R:RA},{label:'B',r:rB,R:RB}]}});}
  throw new Error('winch');
}

/* ---------- pulling a boat ---------- */
function boatRow(y,type,bx,label){let b='';const post=[118,y-58];
  // animation: each boat comes dx px toward the bank. Tied straight on, the vehicle drives dx too; with the pulley on the boat (far end tied
  // to the post) the vehicle must drive 2·dx. Rope lines can't stretch, so the pulley ropes split the difference (gaps stay under the sheave).
  const dx=10,boatA=`mov:${-dx},0`,carA=`mov:${type==='pulley'?-2*dx:-dx},0`,ropeA=type==='pulley'?[`mov:${-1.5*dx},0`,`mov:${-0.5*dx},0`]:[boatA];
  b+=MV(boatA,`<path class="hull" d="M${bx} ${y} L${bx+30} ${y-22} H${bx+108} Q${bx+124} ${y-22} ${bx+124} ${y} Q${bx+124} ${y+22} ${bx+108} ${y+22} H${bx+30} Z"/>`+L(bx+54,y-22,bx+54,y+22,'ink-thin')+L(bx+84,y-22,bx+84,y+22,'ink-thin'));
  b+=MV(carA,Rect(38,y-22,60,10,'track')+Rect(38,y+12,60,10,'track')+Rect(46,y-14,44,28,'car',3)+C(68,y,5,'dot'))+arrow(32,y,6,y,'ink-a');
  const ropes=[];if(type==='direct'){ropes.push([98,y,bx,y]);}
  else{const pc=[bx-9,y];ropes.push([98,y+2,pc[0],y+8]);ropes.push([post[0],post[1],pc[0],y-8]);b+=C(post[0],post[1],7,'dot');}
  ropes.forEach((r,i)=>b+=MV(ropeA[i],L(r[0],r[1],r[2],r[3],'rope')));if(type==='pulley')b+=MV(boatA,C(bx-9,y,9,'sheave')+C(bx-9,y,2.5,'dot'));
  if(label)b+=T(68,y-32,label,'lbl-on');return{b,ropes};}
function boatBase(H){let b=Rect(0,0,140,H,'sand')+`<path class="ink" d="M140 0 Q146 ${H*0.25} 138 ${H*0.5} Q132 ${H*0.75} 140 ${H}"/>`;for(let y=18;y<H;y+=26)for(let x=168+(y%52?17:0);x<424;x+=36)b+=L(x,y,x+16,y,'waterline');return b;}
function genBoat(seed,diff){
  const R=RNG(seed);const mode='compare';const bx=R.int(270,292);
  if(mode==='compare'){const ask=R.pick(['farther','harder']);const eq=diff>1&&R.chance(0.3);let tA=R.pick(['direct','pulley']),tB=eq?tA:(tA==='direct'?'pulley':'direct');
    let b=boatBase(270);const A=boatRow(76,tA,bx,'A'),B=boatRow(196,tB,bx,'B');b+=A.b+B.b;
    const pul=tA===tB?'same':(tA==='pulley'?'A':'B');const ans=ask==='farther'?pul:(pul==='same'?'same':(pul==='A'?'B':'A'));
    const ch=ask==='farther'?noteAll([{t:'Vehicle A',key:'A'},{t:'Vehicle B',key:'B'},{t:'Both the same distance',key:'same'}],ans,k=>k==='same'?'One boat has a pulley on it with the rope\u2019s other end tied on shore. That doubles the rope that must be pulled in.':'This rope is tied straight to the boat, so the vehicle drives exactly as far as the boat moves.')
      :noteAll([{t:'Vehicle A',key:'A'},{t:'Vehicle B',key:'B'},{t:'Both pull equally hard',key:'same'}],ans,k=>k==='same'?'One boat has a pulley on it, with the other rope end tied on shore. Two rope segments share that pull.':'This vehicle\u2019s rope runs around a pulley on the boat, with the other end tied on shore. The post takes half the load, so the vehicle pulls half as hard.');
    if(ask==='harder')return mk({type:'boat',sub:'Movable pulleys & distance',diff,stem:'Each vehicle pulls its boat toward the bank. Ignoring friction, which vehicle has to pull harder?',svg:svgWrap(424,270,b,'two vehicles pulling boats to the bank'),choices:ch,answer:ans,
      explain:ans==='same'?'Both boats are rigged the same way, so both vehicles pull equally hard.':`The pulley rides on the other boat and the rope\u2019s far end is tied to a post, so two rope segments pull that boat and each carries half. Vehicle ${ans} is tied straight to its boat and has to supply the whole pull.`,
      params:{mode,ask,rows:[{label:'A',ropes:A.ropes,bx},{label:'B',ropes:B.ropes,bx}]}});
    return mk({type:'boat',sub:'Movable pulleys & distance',diff,stem:'Each vehicle drives away from the water to pull its boat up to the bank. Which vehicle has to drive farther?',svg:svgWrap(424,270,b,'two vehicles pulling boats to the bank'),choices:ch,answer:ans,
      explain:ans==='same'?`Both boats are rigged the same way (${tA==='pulley'?'each with a pulley on the boat':'rope tied straight to the boat'}), so both vehicles drive the same distance.`:`Boat ${ans} has a pulley on it, and the rope’s other end is tied to a post on shore. Two rope segments pull the boat, so the vehicle must reel in twice the distance the boat moves (half the force, twice the distance).`,
      params:{mode,ask,rows:[{label:'A',ropes:A.ropes,bx},{label:'B',ropes:B.ropes,bx}]}});}
  const t=R.chance(0.7)?'pulley':'direct';const D=R.pick([10,12,16,20,24,30,40]);let b=boatBase(170);const Rw=boatRow(96,t,bx,'');b+=Rw.b+hdim(140,bx,150,D+' ft');
  const ans=t==='pulley'?2*D:D;const list=t==='pulley'?[{v:2*D},{v:D,note:'The pulley on the boat means two rope segments pull it; the truck must reel in both.'},{v:D/2,note:'Half is the force, not the distance. A movable pulley halves the force and doubles the distance.'}]:[{v:D},{v:2*D,note:'There’s no pulley here; the rope is tied straight to the boat.'},{v:D/2,note:'Without a pulley the truck moves exactly as far as the boat.'}];
  return mk({type:'boat',sub:'Movable pulleys & distance',diff,stem:`The boat is ${D} ft from the bank. How far must the vehicle drive to pull it all the way to the bank?`,svg:svgWrap(424,170,b,'vehicle pulling a boat'),choices:numChoices(list,'ft'),answer:ans,
    explain:t==='pulley'?`The pulley rides on the boat and the rope’s end is tied on shore, so two rope segments pull the boat. Each must shorten by ${D} ft, so the vehicle drives 2 × ${D} = ${2*D} ft.`:`The rope is tied straight to the boat, so the vehicle drives the same ${D} ft the boat moves.`,params:{mode,rows:[{label:'X',ropes:Rw.ropes,bx}],D}});
}

/* ---------- weight of solid shapes ---------- */
const DV=[0.41,-0.29];
const SHAPES={cube:{k:'box',l:1,h:1,w:1},boxTall:{k:'box',l:1,h:2,w:1},boxLong:{k:'box',l:2,h:1,w:1},boxDeep:{k:'box',l:1,h:1,w:2},cyl11:{k:'cyl',d:1,h:1},cyl12:{k:'cyl',d:1,h:2},cyl21:{k:'cyl',d:2,h:1},
  hex11:{k:'hex',c:1,h:1},hex12:{k:'hex',c:1,h:2},pyr11:{k:'pyr',b:1,h:1},pyr13:{k:'pyr',b:1,h:3},pyr21:{k:'pyr',b:2,h:1},cone11:{k:'cone',d:1,h:1},cone13:{k:'cone',d:1,h:3},cone21:{k:'cone',d:2,h:1},tri11:{k:'tri',s:1,l:1},tri12:{k:'tri',s:1,l:2}};
const al=n=>n===1?'a':n+'a';
function volOf(s){switch(s.k){case'box':return s.l*s.h*s.w;case'cyl':return Math.PI*s.d*s.d*s.h/4;case'hex':return 3*Math.sqrt(3)/8*s.c*s.c*s.h;case'pyr':return s.b*s.b*s.h/3;case'cone':return Math.PI*s.d*s.d*s.h/12;case'tri':return Math.sqrt(3)/4*s.s*s.s*s.l;}}
function volText(s){switch(s.k){case'box':return `${al(s.l)} × ${al(s.w)} × ${al(s.h)} = ${fmt(s.l*s.w*s.h)}a³`;case'cyl':return `π/4 × ${al(s.d)}² × ${al(s.h)} ≈ ${fmt(Math.round(volOf(s)*100)/100)}a³`;case'hex':return `a hexagon ${al(s.c)} across the corners fills only about 65% of the ${al(s.c)} × ${al(s.c)} square around it, so 0.65 × ${al(s.c)}² × height ${al(s.h)} ≈ ${fmt(Math.round(volOf(s)*100)/100)}a³`;
  case'pyr':return `⅓ × base ${al(s.b)} × ${al(s.b)} × height ${al(s.h)} = ${fmt(Math.round(volOf(s)*100)/100)}a³`;case'cone':return `⅓ of a cylinder: π/12 × ${al(s.d)}² × ${al(s.h)} ≈ ${fmt(Math.round(volOf(s)*100)/100)}a³`;case'tri':return `½ × ${al(s.s)} × ${al(s.s)} × 0.87 × ${al(s.l)} ≈ ${fmt(Math.round(volOf(s)*100)/100)}a³`;}}
function drawShape(s,x0,y0,A){let b='';const dv=w=>[w*A*DV[0],w*A*DV[1]];
  if(s.k==='box'){const l=s.l*A,h=s.h*A,[dx,dy]=dv(s.w);b+=Rect(x0,y0-h,l,h,'solid1')+Poly([[x0,y0-h],[x0+l,y0-h],[x0+l+dx,y0-h+dy],[x0+dx,y0-h+dy]],'solid2')+Poly([[x0+l,y0],[x0+l,y0-h],[x0+l+dx,y0-h+dy],[x0+l+dx,y0+dy]],'solid3');
    b+=hdim(x0,x0+l,y0+16,al(s.l))+vdim(x0-12,y0-h,y0,al(s.h),-1)+T(x0+l+dx/2+12,y0+dy/2+12,al(s.w),'lbl-s','start');}
  else if(s.k==='cyl'){const rx=s.d*A/2,ry=s.d*A*0.17,h=s.h*A,cx=x0+rx;b+=`<path class="solid1" d="M${P(cx-rx)} ${P(y0-h)} V${P(y0)} A${P(rx)} ${P(ry)} 0 0 0 ${P(cx+rx)} ${P(y0)} V${P(y0-h)} Z"/>`+`<ellipse cx="${P(cx)}" cy="${P(y0-h)}" rx="${P(rx)}" ry="${P(ry)}" class="solid2"/>`;
    b+=hdim(cx-rx,cx+rx,y0+ry+16,al(s.d))+vdim(x0-12,y0-h,y0,al(s.h),-1);}
  else if(s.k==='hex'){const c=s.c*A,h=s.h*A,cx=x0+c/2,sq=0.34;const V=(th,y)=>[cx+c/2*Math.cos(th),y-c/2*Math.sin(th)*sq*-1];const ths=[0,1,2,3,4,5].map(i=>i*Math.PI/3);
    const top=ths.map(t=>[cx+c/2*Math.cos(t),y0-h+c/2*Math.sin(t)*sq]);const bot=ths.map(t=>[cx+c/2*Math.cos(t),y0+c/2*Math.sin(t)*sq]);
    [[3,2],[2,1],[1,0]].forEach(([i,j])=>b+=Poly([bot[i],bot[j],top[j],top[i]],i===2?'solid1':'solid3'));b+=Poly(top,'solid2');
    b+=hdim(cx-c/2,cx+c/2,y0+c/2*sq+18,al(s.c))+vdim(x0-12,y0-h,y0,al(s.h),-1);}
  else if(s.k==='pyr'){const bb=s.b*A,h=s.h*A,[dx,dy]=dv(s.b);const FL=[x0,y0],FR=[x0+bb,y0],BR=[x0+bb+dx,y0+dy],BL=[x0+dx,y0+dy],ap=[x0+bb/2+dx/2,y0+dy/2-h];
    b+=L(BL[0],BL[1],FL[0],FL[1],'hidden')+L(BL[0],BL[1],BR[0],BR[1],'hidden')+L(BL[0],BL[1],ap[0],ap[1],'hidden')+Poly([FL,FR,ap],'solid1')+Poly([FR,BR,ap],'solid3');
    b+=L(ap[0],ap[1],ap[0],y0+dy/2,'hidden')+T(ap[0]+6,(ap[1]+y0+dy/2)/2+4,al(s.h),'lbl-s','start')+hdim(x0,x0+bb,y0+16,al(s.b))+T(FR[0]+dx/2+10,y0+dy/2+12,al(s.b),'lbl-s','start');}
  else if(s.k==='cone'){const rx=s.d*A/2,ry=s.d*A*0.17,h=s.h*A,cx=x0+rx;b+=`<path class="hidden" d="M${P(cx-rx)} ${P(y0)} A${P(rx)} ${P(ry)} 0 0 1 ${P(cx+rx)} ${P(y0)}"/>`;
    b+=`<path class="solid1" d="M${P(cx)} ${P(y0-h)} L${P(cx-rx)} ${P(y0)} A${P(rx)} ${P(ry)} 0 0 0 ${P(cx+rx)} ${P(y0)} Z"/>`+L(cx,y0-h,cx,y0,'hidden')+T(cx+6,y0-h/2+4,al(s.h),'lbl-s','start')+hdim(cx-rx,cx+rx,y0+ry+16,al(s.d));}
  else{const ss=s.s*A,th=ss*0.866,[dx,dy]=dv(s.l);const A0=[x0,y0],B0=[x0+ss,y0],C0=[x0+ss/2,y0-th];const sh=p=>[p[0]+dx,p[1]+dy];
    b+=Poly([sh(A0),sh(B0),sh(C0)],'solid3')+Poly([A0,C0,sh(C0),sh(A0)],'solid2')+Poly([B0,C0,sh(C0),sh(B0)],'solid3')+Poly([A0,B0,C0],'solid1');
    b+=hdim(x0,x0+ss,y0+16,al(s.s))+T(x0+ss+dx/2+10,y0+dy/2+12,al(s.l),'lbl-s','start');}
  return b;}
function genVolume(seed,diff){
  const R=RNG(seed);const names=Object.keys(SHAPES);const EQ=[['boxTall','boxLong'],['pyr13','cube'],['cone13','cyl11'],['boxDeep','boxTall']];const mode=R.pick(['more','less']);
  for(let att=0;att<500;att++){let pair;if(diff>1&&R.chance(0.22))pair=R.shuffle(R.pick(EQ));else{pair=R.shuffle(names).slice(0,2);const v0=volOf(SHAPES[pair[0]]),v1=volOf(SHAPES[pair[1]]);const q=v0/v1;if(q<1.25&&q>0.8)continue;}
    const sA=SHAPES[pair[0]],sB=SHAPES[pair[1]];const vA=volOf(sA),vB=volOf(sB);const Aa=52;const base=Math.max(sA.h||sA.s||1,sB.h||sB.s||1)*Aa+60;
    const b=drawShape(sA,40,base,Aa)+drawShape(sB,250,base,Aa)+T(40+52,24,'A','lbl-L')+T(250+52,24,'B','lbl-L');
    const ans=Math.abs(vA-vB)<1e-9?'same':((mode==='more')===(vA>vB)?'A':'B');
    const ch=noteAll([{t:'Object A',key:'A'},{t:'Object B',key:'B'},{t:'They weigh the same',key:'same'}],ans,k=>k==='same'?'Work out each volume; they aren’t equal.':'Compare volumes, not how big the shapes look. Same material means more volume weighs more.');
    return mk({type:'volume',sub:'Volume & weight',diff,stem:`Both objects are solid and made of the same material. Which one weighs ${mode}?`,svg:svgWrap(430,base+50,b,'two solid shapes with labeled dimensions'),choices:ch,answer:ans,
      explain:`Same material, so weight follows volume. A: ${volText(sA)}. B: ${volText(sB)}. ${ans==='same'?'The volumes match, so they weigh the same.':`Object ${ans} weighs ${mode}.`}`,params:{mode,A:sA,B:sB}});}
  throw new Error('volume');
}

/* ---------- linkage between wheels ---------- */
function solveRocker(c1,c2,r2,pin1,c,prevAng){const dx=pin1[0]-c2[0],dy=pin1[1]-c2[1],d=Math.hypot(dx,dy);if(d>r2+c||d<Math.abs(r2-c))return null;const a=(r2*r2-c*c+d*d)/(2*d),h=Math.sqrt(Math.max(0,r2*r2-a*a));
  const mx=c2[0]+a*dx/d,my=c2[1]+a*dy/d;const s1=[mx+h*dy/d,my-h*dx/d],s2=[mx-h*dy/d,my+h*dx/d];const angs=[s1,s2].map(p=>Math.atan2(p[1]-c2[1],p[0]-c2[0]));
  if(prevAng==null)return {p:s1[0]>s2[0]?s1:s2,ang:s1[0]>s2[0]?angs[0]:angs[1]};const df=x=>Math.abs(Math.atan2(Math.sin(x-prevAng),Math.cos(x-prevAng)));return df(angs[0])<df(angs[1])?{p:s1,ang:angs[0]}:{p:s2,ang:angs[1]};}
function genLinkage(seed,diff){
  const R=RNG(seed);const kind=diff===1?'rock':R.pick(['rock','rock','parallel']);const cw=R.chance(.5);
  for(let att=0;att<800;att++){const d=R.int(140,160);const c1=[150,86],c2=[150,86+d];let r1,r2,c,th1=(R.f()*120-60)*Math.PI/180,pin1,pin2,R1,R2;
    if(kind==='rock'){r1=R.int(22,32);r2=R.int(56,74);R1=r1+16;R2=r2+12;pin1=[c1[0]+r1*Math.cos(th1),c1[1]+r1*Math.sin(th1)];c=R.int(d-18,d+8);
      const L4=[d,r1,r2,c].sort((a,b)=>a-b);if(L4[0]!==r1||L4[0]+L4[3]>L4[1]+L4[2]-4)continue;const s=solveRocker(c1,c2,r2,pin1,c,null);if(!s)continue;pin2=s.p;
      if(pin2[0]<c2[0]+10)continue;}
    else{r1=r2=R.int(34,48);R1=R2=r1+14;c=d;pin1=[c1[0]+r1*Math.cos(th1),c1[1]+r1*Math.sin(th1)];pin2=[c2[0]+r2*Math.cos(th1),c2[1]+r2*Math.sin(th1)];}
    /* motion: wheel 1 makes one steady turn over the run. Parallel: wheel 2 copies it and the rod shifts round without turning.
       Rocker: wheel 2's swing and the rod's tilt are worked out from the real linkage at each instant and fitted as rot+osc series. */
    const wL=(cw?1:-1)*2*Math.PI/MV_T;let o1=aRot(c1[0],c1[1],wL),o2,oR=aCircle(c1[0],c1[1],pin1[0],pin1[1],wL);
    if(kind==='rock'){const N=1800,a2=[],ps=[];let prev=null,u2=0,uR=0,l2=null,lR=null;
      for(let i=0;i<=N;i++){const t1=th1+wL*i*MV_T/N,q1=[c1[0]+r1*Math.cos(t1),c1[1]+r1*Math.sin(t1)];const sv=solveRocker(c1,c2,r2,q1,c,prev);prev=sv.ang;
        const g2=sv.ang,gR=Math.atan2(sv.p[1]-q1[1],sv.p[0]-q1[0]);if(l2!=null){u2+=Math.atan2(Math.sin(g2-l2),Math.cos(g2-l2));uR+=Math.atan2(Math.sin(gR-lR),Math.cos(gR-lR));}l2=g2;lR=gR;a2.push(u2);ps.push(uR);}
      const at=arr=>t=>arr[Math.round(t/MV_T*N)];o2=aSer(c2[0],c2[1],fitSer(at(a2),24));oR+=';'+aSer(pin1[0],pin1[1],fitSer(at(ps),24));}
    else o2=aRot(c2[0],c2[1],wL);
    let b='';[[c1,R1],[c2,R2]].forEach(([cc,RR],i)=>{b+=mvg(i?o2:o1,C(cc[0],cc[1],RR,'wheel2')+L(cc[0]-8,cc[1],cc[0]+8,cc[1],'ink-thin')+L(cc[0],cc[1]-8,cc[0],cc[1]+8,'ink-thin')+C(cc[0],cc[1],3.5,'dot'))+T(cc[0]-RR-16,cc[1]+6,String(i+1),'lbl-L');});
    b+=arcArrow(c1[0],c1[1],R1+12,-Math.PI*0.25,1.1,cw);
    b+=mvg(oR,L(pin1[0],pin1[1],pin2[0],pin2[1],'link-o')+L(pin1[0],pin1[1],pin2[0],pin2[1],'link-i'))+mvg(o1,C(pin1[0],pin1[1],4.5,'pin'))+mvg(o2,C(pin2[0],pin2[1],4.5,'pin'));
    const ans=kind==='rock'?'rock':'same';
    const ch=noteAll([{t:'Turns all the way around the same way as wheel 1',key:'same'},{t:'Turns all the way around the opposite way',key:'opp'},{t:'Rocks back and forth',key:'rock'}],ans,k=>k==='opp'?'A rod joining two pins never makes the wheels spin in opposite directions all the way around.':k==='rock'?'Both pins are the same distance from their centers and the rod matches the center distance, so wheel 2 copies wheel 1 exactly.':'Wheel 2’s pin is farther from its center than wheel 1’s, so the rod can only swing it through part of a circle.');
    const H=c2[1]+R2+18;
    return mk({type:'linkage',sub:'Linkages & cranks',diff,stem:'Wheel 1 turns steadily all the way around in the direction of the arrow. The rod is pinned to both wheels. What does wheel 2 do?',svg:svgWrap(300,H,b,'two wheels joined by a rod'),choices:ch,answer:ans,
      explain:kind==='rock'?'Wheel 2’s pin sits farther from its center than wheel 1’s pin. As wheel 1 goes around, the rod pushes and pulls wheel 2’s pin through only part of its circle, so wheel 2 swings back and forth instead of turning all the way around.':'Both pins are the same distance from their centers, and the rod is as long as the distance between the centers. The rod stays parallel, so wheel 2 copies wheel 1 exactly, same direction and same speed, like the side rods on a locomotive.',
      params:{kind,c1,c2,r1,r2,c,pin1:[P(pin1[0]),P(pin1[1])],pin2:[P(pin2[0]),P(pin2[1])],cw}});}
  throw new Error('linkage');
}

/* ---------- gear pump ---------- */
function genGearPump(seed,diff){
  const R=RNG(seed);const rot=R.chance(.5)?90:0;const leftCW=R.chance(.5);const m=9,n=8,rp=36,a=0.95*m,cx=170,cy=170;
  const gL={x:cx-rp,y:cy,r:rp,n,phase:R.f()},gR={x:cx+rp,y:cy,r:rp,n};meshPhase(gL,gR);
  let g=Rect(cx-92,cy-58,184,116,'housing',58)+Rect(cx-20,cy-150,40,100,'water')+Rect(cx-20,cy+50,40,100,'water');
  g+=L(cx-20,cy-150,cx-20,cy-52,'wall')+L(cx+20,cy-150,cx+20,cy-52,'wall')+L(cx-20,cy+52,cx-20,cy+150,'wall')+L(cx+20,cy+52,cx+20,cy+150,'wall');
  /* motion: equal meshed gears, equal and opposite speeds, each the way its arrow shows (the wrapper's turn keeps the sense) */
  const wP=leftCW?0.7:-0.7;g+=mvg(aRot(gL.x,gL.y,wP),gearPath(gL.x,gL.y,rp,n,gL.phase,m))+mvg(aRot(gR.x,gR.y,-wP),gearPath(gR.x,gR.y,rp,n,gR.phase,m))+C(gL.x,gL.y,9,'hub')+C(gR.x,gR.y,9,'hub');
  g+=arcArrow(gL.x,gL.y,20,-Math.PI/2,1.4,leftCW)+arcArrow(gR.x,gR.y,20,-Math.PI/2,1.4,!leftCW);
  const rotP=p=>{if(!rot)return p;const dx=p[0]-cx,dy=p[1]-cy;return[cx-dy,cy+dx];};
  const topIsA=R.chance(.5);const portT=rotP([cx,cy-138]),portB=rotP([cx,cy+138]);
  let b=`<g transform="rotate(${rot} ${cx} ${cy})">${g}</g>`;const off=rot?[0,-12]:[34,0];
  b+=T(portT[0]+off[0],portT[1]+off[1]+6,topIsA?'A':'B','lbl-L')+T(portB[0]+off[0],portB[1]+off[1]+6,topIsA?'B':'A','lbl-L');
  const gears=[{c:rotP([gL.x,gL.y]),cw:leftCW},{c:rotP([gR.x,gR.y]),cw:!leftCW}];
  const ports=[{label:topIsA?'A':'B',p:portT},{label:topIsA?'B':'A',p:portB}];
  const g0=gears[0],o=[g0.c[0]-cx,g0.c[1]-cy],ol=Math.hypot(o[0],o[1]);const off2=[o[0]/ol*rp,o[1]/ol*rp];const v=g0.cw?[-off2[1],off2[0]]:[off2[1],-off2[0]];
  const ans=ports.find(pt=>((pt.p[0]-cx)*v[0]+(pt.p[1]-cy)*v[1])>0).label;
  const ch=noteAll([{t:'Toward A',key:'A'},{t:'Toward B',key:'B'},{t:'Back and forth',key:'same'}],ans,k=>k==='same'?'The gears turn steadily one way, so the flow is steady one way too.':'Fluid doesn’t go through the middle where the teeth mesh. It’s carried around the outside of each gear, in the pockets between the teeth.');
  return mk({type:'gearpump',sub:'Gear pumps',diff,stem:'The gears of this pump turn as the arrows show. Which way does the water flow?',svg:svgWrap(340,340,b,'gear pump with two meshed gears and two ports'),choices:ch,answer:ans,
    explain:`In a gear pump the water is carried around the outside of each gear, trapped between the teeth and the casing. It can’t slip back through the middle because the teeth are meshed there. Follow the outer edge of either gear in its arrow’s direction: it carries water toward ${ans}.`,
    params:{center:[cx,cy],gears,ports}});
}

/* ---------- chain holding a beam ---------- */
function bracketDraw(p0,xa,xb,Wt,label){const px=p0+44,py=160;let b=Rect(p0+34,16,20,212,'wood')+Rect(p0+34,16,160,18,'wood')+Rect(p0+22,py-8,172,16,'beam');
  const A=[p0+xa,34],B=[p0+xb,py-8];b+=L(A[0],A[1],B[0],B[1],'chain')+C(A[0],A[1],3,'dot')+C(B[0],B[1],3,'dot')+C(px,py,4.5,'pin');
  b+=L(p0+186,py+8,p0+186,py+22,'cable')+Rect(p0+168,py+22,36,28,'load',2)+T(p0+186,py+41,Wt+' lb','lbl-xs');if(label)b+=T(p0+120,254,label,'lbl-b');return{b,pivot:[px,py],A,B,load:[p0+186,py]};}
function genBracket(seed,diff){
  const R=RNG(seed);const mode=R.pick(['less','more']);const Wt=R.pick([50,80,100,120]);const XA=[70,110,150,186],XB=[100,140,186];
  for(let att=0;att<500;att++){const c=[0,1].map(()=>({xa:R.pick(XA),xb:R.pick(XB)}));if(c[0].xa===c[1].xa&&c[0].xb===c[1].xb)continue;
    const s=[bracketDraw(0,c[0].xa,c[0].xb,Wt,'A'),bracketDraw(220,c[1].xa,c[1].xb,Wt,'B')];const T0=s.map(q=>Wt*(q.load[0]-q.pivot[0])/perpDist(q.pivot,q.A,q.B));
    const q=T0[0]/T0[1];if(q<1.2&&q>1/1.2)continue;const ans=(mode==='less')===(T0[0]<T0[1])?'A':'B';
    const ch=noteAll([{t:'Chain A',key:'A'},{t:'Chain B',key:'B'},{t:'Both the same',key:'same'}],ans,k=>k==='same'?'The chains meet the beam at different angles or points, so the strain differs.':`Chain ${k} ${mode==='less'?'has less leverage: it is steeper or closer to the pivot, so it must pull harder.':'has more leverage: it is closer to vertical or farther from the pivot, so it pulls less.'}`);
    return mk({type:'bracket',sub:'Chains, levers & leverage',diff,stem:`The beam swings on the pin at the post and carries the same load at its end. Ignore the weight of the beam. Which chain is under ${mode} strain?`,
      svg:svgWrap(430,264,b2(s),'two beams held by chains'),choices:ch,answer:ans,
      explain:`The chain holds the beam up by turning it about the pin. Its leverage is the straight-line distance from the pin to the chain, measured at a right angle to the chain. A chain that meets the beam far from the pin and runs close to vertical has the most leverage, so it needs the least pull. Chain ${ans} has ${mode==='less'?'more':'less'} leverage, so it is under ${mode} strain.`,
      params:{mode,W:Wt,setups:s.map((x,i)=>({label:'AB'[i],pivot:x.pivot,A:x.A,B:x.B,load:x.load}))}});}
  throw new Error('bracket');
}
function b2(s){return s.map(x=>x.b).join('');}

const CGENS={guy:genGuy,bridge:genBridge,flywheel:genFlywheel,turn:genTurn,gate:genGate,jet:genJet,tackle:genTackle,pump:genPump,chain:genChain,sag:genSag,rack:genRack,bike:genBike,winch:genWinch,boat:genBoat,volume:genVolume,linkage:genLinkage,gearpump:genGearPump,bracket:genBracket};

/* ================= concept questions (set 2) ================= */
function stoneBlob(cx,cy,w,h,ang){return `<g transform="translate(${P(cx)} ${P(cy)}) rotate(${P(ang*180/Math.PI)})"><path class="stone" d="M${-w/2} ${h*0.1} C${-w/2} ${-h*0.7} ${-w*0.1} ${-h*0.55} ${w*0.05} ${-h*0.5} C${w*0.3} ${-h*0.62} ${w/2} ${-h*0.3} ${w/2} ${h*0.15} C${w/2} ${h*0.5} ${-w/2} ${h*0.5} ${-w/2} ${h*0.1} Z"/></g>`;}

/* ---------- stepped belt trains ---------- */
function genBeltTrain(seed,diff){
  const R=RNG(seed);const RS=[16,24,32,48];
  for(let att=0;att<800;att++){
    const rA=R.pick(RS),rB1=R.pick(RS),rB2=R.pick(RS),rC=R.pick(RS);if(Math.abs(rB1-rB2)<14)continue;
    const mode=R.pick(['slow','fast']);
    const n={A:1,B:rA/rB1};n.C=n.B*rB2/rC;
    let ans,list,rpm,one;
    if(mode==='num'){rpm=R.pick([120,180,240,300,360,480,600]);const dA=rA/4,dB1=rB1/4,dB2=rB2/4,dC=rC/4;one=rpm*dA/dB1;const c=rpm*dA*dB2/(dB1*dC),inv=rpm*dB1*dC/(dA*dB2);
      if(!isInt(c)||!isInt(one)||!isInt(inv)||new Set([c,one,inv]).size<3||c===rpm)continue;ans=c;
      list=[{v:c},{v:one,note:'That’s how fast shaft B turns. Shaft C is one more belt stage along.'},{v:inv,note:'Flipped both ratios. A small pulley driving a big one slows it down.'}];}
    else{const s=Object.entries(n).sort((a,b)=>a[1]-b[1]);if(mode==='slow'&&s[1][1]<1.3*s[0][1])continue;if(mode==='fast'&&s[2][1]<1.3*s[1][1])continue;ans=mode==='slow'?s[0][0]:s[2][0];}
    const cross=[diff>1&&R.chance(0.3),diff>1&&R.chance(0.3)];const y=138,cA={x:80,y,r:rA},cB1={x:230,y,r:rB1},cB2={x:230,y,r:rB2},cC={x:385,y:y+8,r:rC};
    /* motion: shaft A turns clockwise; each belt carries its driving pulley's rim speed (open keeps the sense, crossed flips it); pulleys on shaft B share one speed */
    const wA=0.7,wB=(cross[0]?-1:1)*wA*rA/rB1,wC=(cross[1]?-1:1)*wB*rB2/rC;
    let b='';for(const l of beltLines(cA,cB1,cross[0]))b+=mvg(beltFlow(l,cA,wA),L(l[0],l[1],l[2],l[3],'belt'));for(const l of beltLines(cB2,cC,cross[1]))b+=mvg(beltFlow(l,cB2,wB),L(l[0],l[1],l[2],l[3],'belt'));
    b+=mvg(aRot(cA.x,y,wA),C(cA.x,y,rA,'wheel'));const big=Math.max(rB1,rB2),small=Math.min(rB1,rB2);b+=mvg(aRot(230,y,wB),C(230,y,big,'wheel')+C(230,y,small,'wheel'));b+=mvg(aRot(cC.x,cC.y,wC),C(cC.x,cC.y,rC,'wheel'));
    [[cA,'A'],[cB1,'B'],[cC,'C']].forEach(([c,l])=>{b+=L(c.x,c.y,c.x+46,c.y-82,'shaft')+T(c.x+56,c.y-86,l,'lbl-L','start');});
    if(mode==='num'){b+=T(80,y+rA+22,`${rA/4} in.`,'lbl-s')+T(230,y+big+22,`${rB1/4} in. to A · ${rB2/4} in. to C`,'lbl-s')+T(cC.x,cC.y+rC+22,`${rC/4} in.`,'lbl-s');}
    const stem=mode==='num'?`Shaft A turns at ${rpm} rpm. Pulley diameters are shown. How fast does shaft C turn?`:`Pulleys on the same shaft turn together. Which shaft turns the ${mode==='slow'?'slowest':'fastest'}?`;
    const ch=mode==='num'?numChoices(list,'rpm'):noteAll(FIGC('Shaft',['A','B','C']),ans,k=>`Shaft ${k} ${k==='A'?'is the drive shaft, the one turned directly.':n[k]>1?'turns faster than shaft A.':'turns slower than shaft A.'}`);
    return mk({type:'belttrain',sub:'Stepped belt drives',diff,stem,svg:svgWrap(470,y+big+34,b,'three shafts linked by two belts, with a stepped pulley on the middle shaft'),choices:ch,answer:ans,
      explain:mode==='num'?`Work one belt at a time. A to B: ${rpm} × ${rA/4} ÷ ${rB1/4} = ${fmt(one)} rpm. B to C: ${fmt(one)} × ${rB2/4} ÷ ${rC/4} = ${fmt(ans)} rpm.`:`Work one belt at a time: a small pulley driving a big one slows it down, a big one driving a small one speeds it up. Shaft ${ans} is the ${mode==='slow'?'slowest':'fastest'}.`,
      params:{mode,rA,rB1,rB2,rC,rpm:rpm||null}});
  }
  throw new Error('belttrain');
}

/* ---------- wheelbarrow poles ---------- */
function genBarrow(seed,diff){
  const R=RNG(seed);const us=R.shuffle([0.16,0.36,0.56,0.78]).slice(0,3);const mode=R.pick(['easy','easy','hard']);let b='';const rows=[];
  us.forEach((u,i)=>{const y0=34+i*96,ax=[330,y0+58],hd=[44,y0+4];const dx=ax[0]-hd[0],dy=ax[1]-hd[1],len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx);
    const lift=`tilt:${ax[0]},${ax[1]},6`;// handle (left of the axle) lifted: the pole turns clockwise about the axle
    const lx=hd[0]+dx*0.55,ly=hd[1]+dy*0.55;b+=MV(lift,L(hd[0],hd[1],ax[0],ax[1],'pole')+L(lx,ly,lx,y0+74,'pole'));
    b+=C(ax[0],ax[1],22,'wheel2')+C(ax[0],ax[1],3.5,'dot');const s=[ax[0]-dx*u,ax[1]-dy*u];b+=MV(lift,stoneBlob(s[0]+Math.sin(ang)*12,s[1]-Math.cos(ang)*12,42,26,ang));
    b+=T(18,y0+10,LET[i],'lbl-L');rows.push({label:LET[i],axle:ax,handle:hd,stone:[P(s[0]),P(s[1])]});});
  const idx=us.indexOf(mode==='easy'?Math.min(...us):Math.max(...us));const ans=LET[idx];
  const ch=noteAll(FIGC('Method',['A','B','C']),ans,k=>{const u=us[LET.indexOf(k)];return `In ${k} the stone sits ${u>us[idx]?'farther from':'closer to'} the wheel, so you hold up ${u>us[idx]?'more':'less'} of its weight.`;});
  return mk({type:'barrow',sub:'Wheelbarrows & levers',diff,stem:mode==='easy'?'The same stone rides on each pole, and the wheel rolls on a smooth road. You lift and pull at the left end. Which is the easiest way to move the stone?':'The same stone rides on each pole, and the wheel rolls on a smooth road. You lift and pull at the left end. Which way takes the most effort?',
    svg:svgWrap(380,318,b,'three poles on wheels carrying a stone at different spots'),choices:ch,answer:ans,
    explain:`It works like a wheelbarrow: the wheel’s axle is the pivot. The closer the stone sits to the wheel, the more of its weight the wheel carries and the less you hold at the handle. Stone ${ans} is ${mode==='easy'?'closest to':'farthest from'} the wheel.`,params:{mode,rows}});
}

/* ---------- capacity marks ---------- */
function frustV(r0,r1,H,h){const r=r0+(r1-r0)*h/H;return Math.PI*h*(r0*r0+r0*r+r*r)/3;}
function marksFor(r0,r1,H,top,N){const Vt=frustV(r0,r1,H,top),out=[];for(let k=1;k<=N;k++){const tg=Vt*k/N;let lo=0,hi=top;for(let it=0;it<60;it++){const m=(lo+hi)/2;if(frustV(r0,r1,H,m)<tg)lo=m;else hi=m;}out.push((lo+hi)/2);}return out;}
function genCapacity(seed,diff){
  const R=RNG(seed);const shape=diff>1&&R.chance(0.25)?'straight':R.pick(['wide','narrow']);const r0=shape==='wide'?30:shape==='narrow'?58:44,r1=shape==='wide'?58:shape==='narrow'?30:44;
  const H=160,top=144,N=8;const even=[...Array(N)].map((_,k)=>top*(k+1)/N);const rev=m=>m.map((_,k)=>top-(k===N-1?0:m[N-2-k]));
  let pats;if(shape==='straight'){const w=marksFor(30,58,H,top,N);pats=[{k:'right',m:even},{k:'topDense',m:w},{k:'botDense',m:rev(w)}];}
  else{const c=marksFor(r0,r1,H,top,N);pats=[{k:'right',m:c},{k:'even',m:even},{k:'reversed',m:rev(c)}];}
  pats=R.shuffle(pats);let b='';const figs=[];const base=212;
  pats.forEach((p,i)=>{const cx=76+i*146;const wall=h=>{const r=r0+(r1-r0)*h/H;return[cx-r,cx+r];};
    b+=Poly([[cx-r1,base-H],[cx+r1,base-H],[cx+r0,base],[cx-r0,base]],'glass');p.m.forEach(h=>{const x=wall(h)[0],y=base-h;b+=L(x,y,x+(h>top-1?30:22),y,'ink');});
    b+=T(cx,base-H-14,LET[i],'lbl-L');figs.push({label:LET[i],marks:p.m.map(P)});});
  const ans=LET[pats.findIndex(p=>p.k==='right')];
  const ch=noteAll([{t:'Container A',key:'A'},{t:'Container B',key:'B'},{t:'Container C',key:'C'}],ans,k=>{const kind=pats[LET.indexOf(k)].k;return kind==='even'?'Evenly spaced marks only work when the walls are straight up and down.':kind==='reversed'||kind==='botDense'||kind==='topDense'?`Where the container is ${shape==='straight'?'the same width':'wider'}, each unit of liquid makes a ${shape==='straight'?'same-size':'smaller'} rise, so the marks must be ${shape==='straight'?'evenly spaced':'closer together there'}.`:'';});
  const expl=shape==='straight'?'The walls are straight, so every unit of liquid raises the level by the same amount. The marks must be evenly spaced.':`Each mark adds the same amount of liquid. Where the container is wider, that amount spreads out and only raises the level a little, so the marks bunch up there. This container is wider at the ${shape==='wide'?'top':'bottom'}, so the marks should be closest together near the ${shape==='wide'?'top':'bottom'}.`;
  return mk({type:'capacity',sub:'Volume & capacity marks',diff,stem:diff<3?'Each mark is supposed to show the same added amount of liquid. On which container are the marks placed correctly?':'Which capacity marks are placed correctly?',
    svg:svgWrap(440,226,b,'three containers with measuring marks'),choices:ch,answer:ans,explain:expl,params:{r0,r1,H,figs}});
}

/* ---------- surface area: cooling and melting ---------- */
const SOL={sphere:{k:'sphere',r:Math.cbrt(3/(4*Math.PI))},cube:{k:'box',l:1,h:1,w:1},cyl:{k:'cyl',d:Math.cbrt(4/Math.PI),h:Math.cbrt(4/Math.PI)},tallCyl:{k:'cyl',d:Math.cbrt(4/(3*Math.PI)),h:3*Math.cbrt(4/(3*Math.PI))},
  flatBox:{k:'box',l:2,h:0.25,w:2},sink:{k:'sink',bw:1.2,bh:0.2,d:1,n:5,t:0.08,f:(1-0.24)/(5*0.08)}};
function areaOf(s){switch(s.k){case'sphere':return 4*Math.PI*s.r*s.r;case'box':return 2*(s.l*s.h+s.l*s.w+s.h*s.w);case'cyl':return Math.PI*s.d*s.h+Math.PI*s.d*s.d/2;
  case'sink':{const base=2*(s.bw*s.bh+s.bw*s.d+s.bh*s.d);const fin=2*(s.t*s.f+s.t*s.d+s.f*s.d)-2*s.t*s.d;return base+s.n*fin;}}}
function drawSolid(s,x0,y0,A){let b='';const dvv=w=>[w*A*DV[0],w*A*DV[1]];const box=(x,y,l,h,w)=>{const L0=l*A,H0=h*A,[dx,dy]=dvv(w);return Rect(x,y-H0,L0,H0,'solid1')+Poly([[x,y-H0],[x+L0,y-H0],[x+L0+dx,y-H0+dy],[x+dx,y-H0+dy]],'solid2')+Poly([[x+L0,y],[x+L0,y-H0],[x+L0+dx,y-H0+dy],[x+L0+dx,y+dy]],'solid3');};
  if(s.k==='box')b+=box(x0,y0,s.l,s.h,s.w);
  else if(s.k==='cyl'){const rx=s.d*A/2,ry=s.d*A*0.17,h=s.h*A,cx=x0+rx;b+=`<path class="solid1" d="M${P(cx-rx)} ${P(y0-h)} V${P(y0)} A${P(rx)} ${P(ry)} 0 0 0 ${P(cx+rx)} ${P(y0)} V${P(y0-h)} Z"/><ellipse cx="${P(cx)}" cy="${P(y0-h)}" rx="${P(rx)}" ry="${P(ry)}" class="solid2"/>`;}
  else if(s.k==='sphere'){const r=s.r*A,cx=x0+r,cy=y0-r;b+=C(cx,cy,r,'solid1')+`<ellipse cx="${P(cx)}" cy="${P(cy)}" rx="${P(r)}" ry="${P(r*0.3)}" class="hidden"/>`+C(cx-r*0.35,cy-r*0.4,r*0.16,'solid2');}
  else{b+=box(x0,y0,s.bw,s.bh,s.d);const step=(s.bw-s.t)/(s.n-1);for(let i=0;i<s.n;i++)b+=box(x0+i*step*A,y0-s.bh*A,s.t,s.f,s.d);}
  return b;}
function solW(s){return s.k==='box'?s.l+s.w*0.41:s.k==='cyl'?s.d:s.k==='sphere'?2*s.r:s.bw+s.d*0.41;}
function genSurface(seed,diff){
  const R=RNG(seed);const mode=diff===1?'cool':R.pick(['cool','cool','melt']);const A=62;
  if(mode==='cool'){for(let att=0;att<200;att++){const names=R.shuffle(['sphere','cube','cyl','sink','tallCyl']).slice(0,3);const ask=R.pick(['fast','slow']);
      const ar=names.map(n=>areaOf(SOL[n]));const s=ar.slice().sort((a,b)=>a-b);if(ask==='fast'&&s[2]<1.12*s[1])continue;if(ask==='slow'&&s[1]<1.08*s[0])continue;
      let b='';names.forEach((n,i)=>{const w=solW(SOL[n])*A;const x=20+i*148+(118-w)/2;b+=drawSolid(SOL[n],x,200,A)+T(20+i*148+59,228,LET[i],'lbl-L');});
      const idx=ar.indexOf(ask==='fast'?s[2]:s[0]),ans=LET[idx];
      const ch=noteAll(FIGC('Object',['A','B','C']),ans,k=>`Object ${k} has ${ar[LET.indexOf(k)]>ar[idx]?'more':'less'} outside surface for the same amount of metal.`);
      return mk({type:'surface',sub:'Heat & surface area',diff,stem:`All three are solid, made of the same metal and weigh the same. They are heated to the same temperature and set outdoors. Which one ${ask==='fast'?'cools down fastest':'stays hot the longest'}?`,
        svg:svgWrap(444,238,b,'three metal objects of equal weight with different shapes'),choices:ch,answer:ans,
        explain:`Heat escapes through the surface. For the same amount of metal, the shape with the ${ask==='fast'?'most':'least'} surface area ${ask==='fast'?'cools fastest':'holds its heat longest'}. ${ask==='fast'?'Fins (like on a motor or a heat sink) add lots of surface.':'A ball has the least surface for its size.'} That’s object ${ans}.`,
        params:{mode,ask,solids:names.map((n,i)=>({label:LET[i],s:SOL[n]}))}});}
    throw new Error('surface');}
  const pair=R.shuffle(R.pick([['tallCyl','flatBox'],['cube','flatBox'],['sphere','flatBox'],['sphere','tallCyl']]));const ar=pair.map(n=>areaOf(SOL[n]));
  let b='';pair.forEach((n,i)=>{const w=solW(SOL[n])*A;const x=20+i*220+(170-w)/2;b+=drawSolid(SOL[n],x,210,A)+T(20+i*220+85,238,LET[i],'lbl-L');});
  const ans=ar[0]>ar[1]?'A':'B';
  const ch=noteAll([{t:'Block A',key:'A'},{t:'Block B',key:'B'},{t:'They melt at the same rate',key:'same'}],ans,k=>k==='same'?'Same weight doesn’t mean same surface. The shape with more surface soaks up heat faster.':'This block is more compact, so less of its surface is exposed to the warm air.');
  return mk({type:'surface',sub:'Heat & surface area',diff,stem:'Both blocks of ice weigh the same and start at the same temperature. Which melts faster on a warm day?',svg:svgWrap(460,248,b,'two ice blocks of equal weight'),choices:ch,answer:ans,
    explain:`Heat gets in through the surface. The same amount of ice spread out thin (block ${ans}) has much more surface touching the warm air, so it melts faster.`,params:{mode,solids:pair.map((n,i)=>({label:LET[i],s:SOL[n]}))}});
}

/* ---------- jets from holes and taps ---------- */
function genHoles(seed,diff){
  const R=RNG(seed);const mode=diff===1?'figs':R.pick(['figs','taps']);
  if(mode==='figs'){const surf=74,ys=[112,156,200],ds=ys.map(y=>y-surf),g=1,drop=32,te=Math.sqrt(2*drop/g),k=0.5;
    const pats=R.shuffle(['right','reversed','equal']);let b='';const figs=[];
    pats.forEach((p,i)=>{const x0=18+i*148,w=84,xw=x0+w;b+=Rect(x0,surf,w,230-surf,'water')+`<path class="ink" d="M${x0} 50 V230 H${xw} V50"/>`+L(x0,surf,xw,surf,'surface');
      const vs=ds.map((d,j)=>p==='right'?k*Math.sqrt(d):p==='reversed'?k*Math.sqrt(ds[2-j]):k*Math.sqrt(ds[1]));
      ys.forEach((y,j)=>{const pts=[];for(let q=0;q<=12;q++){const t=te*q/12;pts.push([xw+vs[j]*t,y+0.5*g*t*t]);}b+=p==='right'?MV(`flow:${R2(8*vs[j])}`,Path(pts,'jet')):Path(pts,'jet');});
      b+=T(x0+w/2,36,LET[i],'lbl-L');figs.push({label:LET[i],v:vs.map(v=>+v.toFixed(4)),depths:ds});});
    const ans=LET[pats.indexOf('right')];
    const ch=noteAll(FIGC('Figure',['A','B','C']),ans,k=>pats[LET.indexOf(k)]==='reversed'?'Here the top hole shoots farthest. But the top hole has the least water pressing above it.':'The jets can’t be equal: deeper holes have more water pushing on them.');
    return mk({type:'holes',sub:'Water pressure & jets',diff,stem:'Water spurts from three holes in the side of each tank. Which figure shows the jets correctly?',svg:svgWrap(452,240,b,'three tanks with water spurting from holes'),choices:ch,answer:ans,
      explain:`Water pressure grows with depth. The lowest hole has the most water above it, so its jet comes out fastest and shoots out farthest from the wall; the top hole’s jet is weakest. Figure ${ans} shows that.`,params:{mode,figs}});}
  for(let att=0;;att++){const surf=60,bot=236;const ws=[R.int(46,96),R.int(40,70),R.int(40,70)];let x=16;const cols=ws.map(w=>{const c={x0:x,x1:x+w};x+=w+44;return c;});
    const eq=R.chance(0.25);const tA=R.int(96,200),tB=eq?tA:R.int(96,200);if(!eq&&Math.abs(tA-tB)<30)continue;const ci=R.shuffle([0,1,2]).slice(0,2);
    let b='';cols.forEach(c=>b+=Rect(c.x0,surf,c.x1-c.x0,bot-surf,'water')+L(c.x0,surf,c.x1,surf,'surface'));b+=Rect(16,bot-30,x-44-16,30,'water');
    cols.forEach((c,i)=>{b+=L(c.x0,36,c.x0,i===0?bot:bot-30,'wall2')+L(c.x1,36,c.x1,bot-30,'wall2');if(i>0)b+=L(cols[i-1].x1,bot-30,c.x0,bot-30,'wall2');});
    b+=L(16,bot,x-44,bot,'wall2')+L(x-44,bot,x-44,bot-30,'wall2');
    const taps=[{label:'A',y:tA,c:cols[ci[0]]},{label:'B',y:tB,c:cols[ci[1]]}];taps.forEach(t=>{b+=Rect(t.c.x1,t.y-8,20,16,'tap')+Rect(t.c.x1+6,t.y-17,8,9,'tap')+Rect(t.c.x1+1,t.y-22,18,4,'tap')+T(t.c.x1+10,t.y-28,t.label,'lbl-L');});
    const ans=tA===tB?'same':(tA>tB?'A':'B');
    const ch=noteAll([{t:'Jet A',key:'A'},{t:'Jet B',key:'B'},{t:'Both the same',key:'same'}],ans,k=>k==='same'?'The taps are at different depths below the water surface.':'This tap is higher up, closer to the water surface, so less water presses on it. The width of its column doesn’t matter.');
    return mk({type:'holes',sub:'Water pressure & jets',diff,stem:'The columns are joined at the bottom and filled with water. Both taps are opened at the same time. Which jet comes out stronger?',svg:svgWrap(x-10,bot+8,b,'connected water columns with two taps'),choices:ch,answer:ans,
      explain:ans==='same'?'Connected columns fill to the same level, and both taps are the same depth below it, so the jets are equally strong.':`Connected columns always fill to the same level. Tap ${ans} is lower, so it is deeper below the water surface and has more pressure behind it. How wide each column is doesn’t matter.`,
      params:{mode,surf,taps:taps.map(t=>({label:t.label,y:t.y}))}});}
}

/* ---------- weighted disk ---------- */
function genDisk(seed,diff){
  const R=RNG(seed);const centered=diff>1&&R.chance(0.25);const three=!centered&&R.chance(0.5);const Rr=56,ins=17,off=centered?0:34;
  const dirs=R.shuffle(centered?[90,200]:three?[90,-90,R.pick([0,180])]:[90,R.pick([-90,0,180,-60,-120])]);let b='';const figs=[];
  dirs.forEach((d,i)=>{const cx=70+i*(three?140:190),cy=86;const a=d*Math.PI/180,ix=cx+off*Math.cos(a),iy=cy+off*Math.sin(a);
    b+=C(cx,cy,Rr,'wooddisk')+C(ix,iy,ins,'insert');const m=a+Math.PI*0.7;b+=L(cx+(Rr-10)*Math.cos(m),cy+(Rr-10)*Math.sin(m),cx+Rr*Math.cos(m),cy+Rr*Math.sin(m),'ink')+L(cx,cy+Rr,cx,cy+Rr+2,'ink');
    b+=ground(cx-72,cx+72,cy+Rr)+T(cx,cy+Rr+30,LET[i],'lbl-L');figs.push({label:LET[i],off:[P(off*Math.cos(a)),P(off*Math.sin(a))]});});
  const labs=figs.map(f=>f.label);const ch=(three?FIGC('Position',labs):FIGC('Position',labs,'In any position'));
  const ansIdx=centered?-1:dirs.indexOf(90);const ans=centered?'same':labs[ansIdx];
  noteAll(ch,ans,k=>k==='same'?'The metal is off-center, so the disk has a heavy side. It rolls until the heavy side is at the bottom.':centered?'The metal is right at the center, so no side is heavier than another.':'The heavy metal isn’t at the bottom here, so gravity keeps rolling the disk until it is.');
  const W=three?420:400;
  return mk({type:'disk',sub:'Balance & center of gravity',diff,stem:'A wooden disk has a metal plug set into it (the shaded circle). The disk is rolled and left to come to rest. In which position does it stop?',svg:svgWrap(W,184,b,'wooden disks with a metal plug in different positions'),choices:ch,answer:ans,
    explain:centered?'The metal plug is exactly at the center, so the disk is balanced the same all the way around. It can stop in any position.':`The metal makes one side heavier, so the disk’s center of gravity is off-center. It keeps rolling until the heavy part is at the very bottom, directly under the center: position ${ans}.`,
    params:{figs}});
}

/* ---------- where a stick breaks ---------- */
function genBreak(seed,diff){
  const R=RNG(seed);for(let att=0;att<300;att++){const xL=30,xR=390,xf=R.int(150,270),stoneRight=R.chance(.5);
    const others=[R.int(60,360),R.int(60,360)];if(others.some(x=>Math.abs(x-xf)<40)||Math.abs(others[0]-others[1])<40)continue;
    const pts=[xf,...others].sort((a,b)=>a-b);const y=158;let b=Rect(xL,y-6,xR-xL,12,'beam')+Poly([[xf,y+6],[xf-22,y+44],[xf+22,y+44]],'fulcrum')+ground(xf-50,xf+50,y+44);
    const sx=stoneRight?xR-30:xL+30,px=stoneRight?xL+8:xR-8;b+=stoneBlob(sx,y-22,56,34,0)+arrow(px,y-70,px,y-10)+T(px,y-78,'push','lbl-acc');
    pts.forEach((x,i)=>b+=arrow(x,50,x,y-12,'ink-a')+T(x,40,LET[i],'lbl-L'));
    const ans=LET[pts.indexOf(xf)];
    const ch=noteAll([{t:'At point A',key:'A'},{t:'At point B',key:'B'},{t:'At point C',key:'C'}],ans,k=>'Bending is strongest right over the support, where the push and the stone both lever the stick around it. Away from the support the bending is less.');
    return mk({type:'break',sub:'Bending & breaking',diff,stem:`A heavy stone rests on the ${stoneRight?'right':'left'} end of the stick. The ${stoneRight?'left':'right'} end is pushed down sharply. Where is the stick most likely to break?`,
      svg:svgWrap(420,212,b,'stick on a support with a stone on one end and three marked points'),choices:ch,answer:ans,
      explain:`The push on one end and the stone on the other both lever the stick around the support. The bending is greatest right over the support and fades to nothing at the ends, so it breaks at point ${ans}.`,
      params:{xL,xR,xf,stoneRight,points:pts.map((x,i)=>({label:LET[i],x}))}});}
  throw new Error('break');
}

/* ---------- steelyards ---------- */
function steelyard(p0,db,xc,label){const px=p0+80,by=96;let b=C(px,26,10,'pin')+L(px,36,px,by-5,'ink');let m=Rect(px-db-6,by-5,db+150+6,10,'beam');for(let x=px+10;x<px+150;x+=10)m+=L(x,by-5,x,by+5,'ink-thin');
  const hx=px-db;m+=Poly([[hx,by+5],[hx-22,by+26],[hx+22,by+26]],'hanger')+Rect(hx-28,by+26,56,48,'load',2)+T(hx,by+57,label,'lbl-L');m+=Rect(px+xc-14,by-15,28,30,'metal',2);
  return b+MV(`osc:${px},${by-5},1.2,0.45`,m);}
function genSteelyard(seed,diff){
  const R=RNG(seed);const ask=R.pick(['less','more']);
  for(let att=0;att<500;att++){const eq=diff>1&&R.chance(0.25);let dA=R.pick([30,40,50]),xA=R.int(4,13)*10,dB=R.pick([30,40,50]),xB=R.int(4,13)*10;
    if(eq){const k=R.pick([[30,40],[40,30],[30,50],[50,30],[40,50],[50,40]]);dA=k[0];dB=k[1];xA=R.int(3,13)*10;xB=xA*dB/dA;if(!isInt(xB/10)||xB>130||xB<30)continue;}
    else{const q=(xA/dA)/(xB/dB);if(q<1.2&&q>1/1.2)continue;if(diff===1)dB=dA;if(diff===1&&Math.abs(xA-xB)<30)continue;}
    const wA=xA/dA,wB=xB/dB;const b=steelyard(0,dA,xA,'A')+steelyard(236,dB,xB,'B');
    const lighter=Math.abs(wA-wB)<1e-9?'same':(wA<wB?'A':'B');const ans=lighter==='same'?'same':(ask==='less'?lighter:(lighter==='A'?'B':'A'));
    const ch=noteAll([{t:`Box A weighs ${ask}`,key:'A'},{t:`Box B weighs ${ask}`,key:'B'},{t:'Both boxes weigh the same',key:'same'}],ans,k=>k==='same'?'Compare how far the counterweight sits from the pivot with how far the box hangs from it, on each steelyard. They are different.':(eq?'Look at where each box hangs, too. A box hanging closer to the pivot has to be heavier to balance the same counterweight.':'The counterweight farther out on the beam balances a heavier box.'));
    return mk({type:'steelyard',sub:'Steelyards & balance',diff,stem:'Both steelyards are balanced, and the sliding counterweights are identical. How do the boxes compare?',svg:svgWrap(470,182,b,'two steelyard balances with boxes and sliding weights'),choices:ch,answer:ans,
      explain:`A steelyard is a lever: box weight × box distance = counterweight × counterweight distance. The farther the counterweight has to slide out, and the closer the box hangs to the pivot, the heavier the box. ${lighter==='same'?'Both steelyards have the same proportion, so the boxes weigh the same.':`Box ${lighter} balances with the weight closer in compared with its box distance, so it is the lighter one.`}`,
      params:{ask,A:{db:dA,xc:xA},B:{db:dB,xc:xB}}});}
  throw new Error('steelyard');
}

/* ---------- speed along a thrown path ---------- */
function genThrow(seed,diff){
  const R=RNG(seed);const T0=10,g=12.8,vy=64,vx=34,x0=26,y0=226;const pos=t=>[x0+vx*t,y0-(vy*t-0.5*g*t*t)];
  for(let att=0;att<300;att++){const eq=diff>1&&R.chance(0.25);let tA=R.pick([1.2,2,2.8,3.6,4.4,5]),tB;if(eq)tB=T0-tA;else{tB=R.pick([3.8,5,6.2,7.4,8.4]);if(Math.abs(tA-tB)<1.2)continue;}
    const sp=t=>Math.hypot(vx,vy-g*t);if(!eq&&Math.max(sp(tA),sp(tB))/Math.min(sp(tA),sp(tB))<1.12)continue;
    const pts=[];for(let q=0;q<=40;q++)pts.push(pos(T0*q/40));let b=Path(pts,'opt');const e=pos(T0),ang=Math.atan2(vy-g*T0*-1,vx);
    // animation: ball (hidden) jumps back to the launch point, then flies the dashed path with true timing and rolls to where it rests
    const rest=[e[0]+8,e[1]-14],fl=[];for(let q=0;q<=300;q++){const p=pos(T0*q/300);fl.push([p[0]-rest[0],p[1]-rest[1]]);}
    for(let q=1;q<=10;q++)fl.push([fl[300][0]*(1-q/10),fl[300][1]*(1-q/10)]);
    const tp=timedPath(fl.map(p=>[p[0]-fl[0][0],p[1]-fl[0][1]])).slice(5).split(',').map(Number);const fly=[];for(let i=0;i<tp.length;i+=2)fly.push(R2(tp[i]+fl[0][0]),R2(tp[i+1]+fl[0][1]));
    let flen=0;for(let i=2;i<tp.length;i+=2)flen+=Math.hypot(tp[i]-tp[i-2],tp[i+1]-tp[i-1]);flen+=Math.hypot(tp[0],tp[1]);const jump=Math.hypot(fl[0][0],fl[0][1]);
    b+=MV(`path:${R2(fl[0][0])},${R2(fl[0][1])},${fly.join(',')};show:${R2(0.85*jump/(jump+flen)+0.005)}`,C(e[0]+8,e[1]-14,14,'ball2'))+ground(10,390,y0+2);
    const sw=R.chance(.5);const pA=pos(tA),pB=pos(tB);const lab=[{t:tA,l:sw?'B':'A',p:pA},{t:tB,l:sw?'A':'B',p:pB}];
    lab.forEach(o=>{const [x,y]=o.p;b+=L(x-8,y-8,x+8,y+8,'cross')+L(x-8,y+8,x+8,y-8,'cross')+T(x,y-18,o.l,'lbl-L');});
    const sA=sp(lab.find(o=>o.l==='A').t),sB=sp(lab.find(o=>o.l==='B').t);const ans=Math.abs(sA-sB)<1e-9?'same':(sA>sB?'A':'B');
    const ch=noteAll([{t:'At point A',key:'A'},{t:'At point B',key:'B'},{t:'The speed is the same at both points',key:'same'}],ans,k=>k==='same'?'The points are at different heights. The ball is slower where it is higher.':'This point is higher. The ball slows down as it climbs and speeds up as it falls.');
    return mk({type:'throw',sub:'Motion: thrown objects',diff,stem:'A ball is thrown and follows the dashed path. Ignoring air resistance, at which point is it moving faster?',svg:svgWrap(400,240,b,'dashed path of a thrown ball with two marked points'),choices:ch,answer:ans,
      explain:ans==='same'?'Both points are at the same height, one on the way up and one on the way down. With no air resistance the ball has the same speed at the same height.':`A thrown ball keeps its sideways speed but slows as it climbs and speeds up as it falls. So the lower point on the path is the faster one: point ${ans}. It’s slowest at the very top.`,
      params:{vx,vy,g,points:lab.map(o=>({label:o.l,t:o.t}))}});}
  throw new Error('throw');
}

/* ---------- mixing layers ---------- */
function genMix(seed,diff){
  const R=RNG(seed);const kind=R.pick(diff===1?['dry']:['dry','dry','water','wet']);let b='';const x0=110,x1=290,bot=232;
  const pebbles=(y0,y1)=>{let s='';for(let y=y0+7;y<y1-4;y+=12)for(let x=x0+8+((y/12|0)%2)*6;x<x1-6;x+=15){const rx=5+R.f()*2.5,ry=4+R.f()*2;s+=`<ellipse cx="${P(x+R.f()*3)}" cy="${P(y+R.f()*3)}" rx="${P(rx)}" ry="${P(ry)}" transform="rotate(${R.int(-40,40)} ${P(x)} ${P(y)})" class="pebble"/>`;}return s;};
  const sand=(y0,y1)=>{let s=Rect(x0,y0,x1-x0,y1-y0,'sand2');for(let i=0;i<150;i++)s+=C(x0+4+R.f()*(x1-x0-8),y0+3+R.f()*(y1-y0-6),0.9,'sanddot');return s;};
  let layers;
  if(kind==='dry'){b+=sand(160,bot)+pebbles(96,160);layers=[{name:'sand',grain:1,gaps:'air'},{name:'pebbles',grain:3,gaps:'air'}];}
  else if(kind==='water'){b+=sand(150,bot)+Rect(x0,100,x1-x0,50,'water')+L(x0,100,x1,100,'surface');layers=[{name:'dry sand',grain:1,gaps:'air'},{name:'water',grain:0,gaps:'none'}];}
  else{b+=Rect(x0,110,x1-x0,bot-110,'water')+L(x0,110,x1,110,'surface')+pebbles(150,bot);layers=[{name:'pebbles',grain:3,gaps:'water'},{name:'water',grain:0,gaps:'none'}];}
  b+=`<path class="wall" d="M${x0} 70 V${bot} H${x1} V70"/>`;
  const ans=layers.some(l=>l.gaps==='air')?'down':'same';
  const stem={dry:'A layer of pebbles sits on top of dry sand. How will the level of the fill change if the sand and pebbles are mixed together?',water:'Water is poured on top of dry sand, but hasn’t soaked in yet. How will the top level change once the water and sand are mixed?',wet:'Pebbles sit at the bottom of a container of water. How will the water level change if the pebbles are stirred around?'}[kind];
  const ch=noteAll([{t:'It will rise',key:'up'},{t:'It will go down',key:'down'},{t:'It will stay the same',key:'same'}],ans,k=>k==='up'?'Mixing doesn’t add any material, so the level can’t go up.':k==='same'?'There is air in the gaps between the grains. When mixed, the smaller stuff fills those gaps.':'The gaps between the pebbles are already full of water, so there’s no empty space left to fill.');
  return mk({type:'mix',sub:'Mixing & packing',diff,stem,svg:svgWrap(400,244,b,'container with two layers'),choices:ch,answer:ans,
    explain:ans==='down'?`There is air in the gaps between the ${kind==='dry'?'pebbles':'grains of sand'}. When the layers are mixed, the ${kind==='dry'?'fine sand':'water'} slips into those gaps instead of sitting on top, so the total level goes down.`:'The gaps between the pebbles are already filled with water. Moving the pebbles around doesn’t change how much room everything takes up, so the level stays the same.',
    params:{kind,layers}});
}

/* ---------- stop-and-go winder ---------- */
function tangentPt(P0,c,r,upper){const dx=c[0]-P0[0],dy=c[1]-P0[1],d=Math.hypot(dx,dy),a=Math.asin(r/d),base=Math.atan2(dy,dx);const cand=[base+a,base-a].map(t=>{const l=Math.sqrt(d*d-r*r);return[P0[0]+l*Math.cos(t),P0[1]+l*Math.sin(t)];});return cand.sort((p,q)=>upper?p[1]-q[1]:q[1]-p[1])[0];}
function genWinder(seed,diff){
  const R=RNG(seed);const inter=R.chance(0.6),driverCW=R.chance(.5),top=R.chance(.6);const gc=[290,196],m=7,n=10,rp=35,dr=22;
  const dp=28,ang=-58*Math.PI/180,dc=[gc[0]+(rp+dp)*Math.cos(ang),gc[1]+(rp+dp)*Math.sin(ang)];const pc=[96,62];
  let b=ceiling(40,176,34)+Poly([[pc[0],pc[1]],[pc[0]-10,34],[pc[0]+10,34]],'metal')+C(pc[0],pc[1],14,'sheave')+C(pc[0],pc[1],3,'dot');
  b+=L(pc[0]-14,pc[1],pc[0]-14,214,'rope')+Rect(pc[0]-44,214,62,44,'load',3);
  const lower={x:gc[0],y:gc[1],r:rp,n,phase:R.f()*6};b+=gearPath(gc[0],gc[1],rp,n,lower.phase,m)+C(gc[0],gc[1],dr,'drum')+C(gc[0],gc[1],4,'dot');
  let ta=null,upS='';if(inter){b+=C(dc[0],dc[1],dp,'gear');ta=ang+Math.PI+R.pick([-1.4,1.4,2.4,-2.4]);upS=C(dc[0],dc[1],dp,'gear')+Poly([[dc[0]+(dp-2)*Math.cos(ta-0.16),dc[1]+(dp-2)*Math.sin(ta-0.16)],[dc[0]+(dp+11)*Math.cos(ta-0.11),dc[1]+(dp+11)*Math.sin(ta-0.11)],[dc[0]+(dp+11)*Math.cos(ta+0.11),dc[1]+(dp+11)*Math.sin(ta+0.11)],[dc[0]+(dp-2)*Math.cos(ta+0.16),dc[1]+(dp-2)*Math.sin(ta+0.16)]],'gear');b+=upS.slice(C(dc[0],dc[1],dp,'gear').length);}
  else{const up={x:dc[0],y:dc[1],r:dp,n:8};meshPhase(lower,up);upS=gearPath(dc[0],dc[1],dp,8,up.phase,m);b+=upS;}
  b+=C(dc[0],dc[1],6,'hub')+C(dc[0],dc[1],2.5,'dot')+arcArrow(dc[0],dc[1],dp+20,-Math.PI/2,1.3,driverCW);
  const from=[pc[0]+(top?0:0),pc[1]-14];const tp=tangentPt([pc[0]+10,pc[1]-10],gc,dr,top);b+=L(pc[0]+10,pc[1]-10,tp[0],tp[1],'rope');b+=`<path class="rope" d="M${pc[0]-14} ${pc[1]} A14 14 0 0 1 ${pc[0]+10} ${pc[1]-10}"/>`;
  const drumCW=!driverCW;const o=[tp[0]-gc[0],tp[1]-gc[1]];const v=drumCW?[-o[1],o[0]]:[o[1],-o[0]];const u=[pc[0]+10-tp[0],pc[1]-10-tp[1]];const toward=v[0]*u[0]+v[1]*u[1]>0;
  const dir=toward?'down':'up',how=inter?'steps':'smooth';const key=dir+'-'+how;
  /* motion: the upper wheel turns steadily as its arrow shows. Full gear: the lower gear turns the other way at 8/10 of its speed.
     One tooth: the lower gear is kicked on one tooth (1/10 turn) each time the tooth sweeps through the mesh, and waits otherwise.
     The drum (radius dr) winds the rope in or pays it out, so the load and rope move with it. */
  {const sD=driverCW?1:-1,wD=sD*(inter?0.8:dir==='up'?0.45:0.1);let lowS,ldS;
    if(!inter){lowS=linSer(-wD*0.8);ldS=linSer(Math.abs(wD)*0.8*dr);}
    else{const mesh=ang+Math.PI,x0=Math.atan2(Math.sin(sD*(ta-mesh)),Math.cos(sD*(ta-mesh))),be=0.7,k0=x0<0?0:1;
      const F=t=>{const x=x0+Math.abs(wD)*t;let f=0;for(let k=k0;k<k0+3;k++){const u=Math.min(1,Math.max(0,(x-2*Math.PI*k+be)/(2*be)));f+=u*u*(3-2*u);}return f;};
      lowS=fitSer(t=>-sD*2*Math.PI/10*F(t),24);ldS=fitSer(t=>2*Math.PI/10*F(t)*dr,24);}
    const sgn=dir==='up'?1:-1,vR=Math.abs(lowS.w)*dr,fl=v=>inter?'':'flow:'+nf(v);
    const ldOps=aSlide(0,-sgn,ldS,Math.max(160,8*Math.abs(ldS.w)*MV_T));/* rising: the load slides up over its rope; lowering: the hanging rope goes down with the load so they stay joined */
    b=mvWrap(b,L(pc[0]-14,pc[1],pc[0]-14,214,'rope'),sgn>0?fl(-sgn*vR):ldOps);b=mvWrap(b,Rect(pc[0]-44,214,62,44,'load',3),ldOps);
    b=mvWrap(b,gearPath(gc[0],gc[1],rp,n,lower.phase,m)+C(gc[0],gc[1],dr,'drum')+C(gc[0],gc[1],4,'dot'),aSer(gc[0],gc[1],lowS));b=mvWrap(b,upS,aRot(dc[0],dc[1],wD));
    b=mvWrap(b,L(pc[0]+10,pc[1]-10,tp[0],tp[1],'rope'),fl(sgn*vR));b=mvWrap(b,`<path class="rope" d="M${pc[0]-14} ${pc[1]} A14 14 0 0 1 ${pc[0]+10} ${pc[1]-10}"/>`,fl(sgn*vR));}
  const TXT={'up-smooth':'Upward, smoothly','up-steps':'Upward, in stop-and-go steps','down-smooth':'Downward, smoothly','down-steps':'Downward, in stop-and-go steps'};
  const others=R.shuffle(Object.keys(TXT).filter(k=>k!==key)).slice(0,2);const ch=R.shuffle([key,...others]).map(k=>({t:TXT[k],key:k}));
  noteAll(ch,key,k=>k.split('-')[0]!==dir?`Follow the rope: the lower gear turns ${drumCW?'clockwise':'counterclockwise'} (opposite the upper wheel), which ${dir==='up'?'winds the rope in':'lets the rope out'}.`:`The upper wheel has ${inter?'only one tooth, so it only moves the lower gear for a moment each turn':'teeth all the way around, so it drives the lower gear steadily'}.`);
  return mk({type:'winder',sub:'Gears, drums & intermittent motion',diff,stem:'The upper wheel turns steadily in the direction of the arrow. How does the load move?',svg:svgWrap(380,270,b,'load on a rope wound on a gear driven by an upper wheel'),choices:ch,answer:key,
    explain:`Meshed wheels turn opposite ways, so the lower gear and its drum turn ${drumCW?'clockwise':'counterclockwise'}. At the point where the rope leaves the drum, that ${dir==='up'?'winds the rope in, lifting':'lets rope out, lowering'} the load. ${inter?'The upper wheel has only one tooth, so the drum moves a little once per turn and then stops: stop-and-go.':'The upper wheel is a full gear, so the motion is smooth.'}`,
    params:{inter,driverCW,drum:gc,tangent:[P(tp[0]),P(tp[1])],pulleyPt:[pc[0]+10,pc[1]-10]}});
}

/* ---------- melting and freezing ---------- */
function genIce(seed,diff){
  const R=RNG(seed);const kind=diff===1?'block':R.pick(['block','float','freeze']);const x0=120,x1=290,lv=96;
  let b=`<path class="water" d="M${x0} ${lv} V200 Q${x0} 250 ${(x0+x1)/2} 250 Q${x1} 250 ${x1} 200 V${lv} Z"/>`;
  if(kind==='block'){b=b.replace('class="water"','class="ice"');for(let y=lv+14;y<236;y+=24)for(let x=x0+14+((y/24|0)%2)*18;x<x1-10;x+=36){b+=L(x,y,x+20,y,'ink-thin')+L(x-6,y-8,x-6,y+8,'ink-thin');}}
  else if(kind==='float'){b+=L(x0,lv,x1,lv,'surface');[[150,0],[196,4],[244,-3]].forEach(([x,r])=>b+=`<rect x="${x-16}" y="${lv-9}" width="32" height="32" class="ice" transform="rotate(${r} ${x} ${lv+7})"/>`);}
  else{b+=L(x0,lv,x1,lv,'surface')+T((x0+x1)/2,40,'put in the freezer','lbl-acc');}
  b+=`<path class="wall" d="M${x0-40} 60 H${x0} V200 Q${x0} 250 ${(x0+x1)/2} 250 Q${x1} 250 ${x1} 200 V60 H${x1+40}"/>`+L(x1+4,lv,x1+36,lv,'dim')+T(x1+40,lv+5,'level','lbl-s','start');
  const ans=kind==='block'?'down':kind==='float'?'same':'up';
  const stem={block:'The vessel is filled with a solid block of ice up to the level shown. When the ice melts, how does the water level compare with the ice level?',float:'Ice cubes float in a vessel of water filled to the level shown. When the ice melts, how does the water level change?',freeze:'The vessel is filled with water up to the level shown and frozen solid. How does the level of the ice compare?'}[kind];
  const ch=noteAll([{t:'The level will rise',key:'up'},{t:'The level will go down',key:'down'},{t:'The level won’t change',key:'same'}],ans,k=>kind==='float'?'Floating ice already pushes aside exactly its own weight of water. When it melts, it fills that same space.':'Water expands by a little when it freezes, and shrinks back when ice melts.');
  return mk({type:'ice',sub:'Ice & water volume',diff,stem,svg:svgWrap(400,262,b,'vessel with ice and water'),choices:ch,answer:ans,
    explain:kind==='block'?'Ice takes up a little more room than the water it came from. When the block melts, the water fills less space, so the level ends up lower than the ice was.':kind==='float'?'A floating ice cube pushes aside exactly its own weight of water. When it melts, it turns into exactly that much water, which fills the space it was already taking up. The level stays the same.':'Water expands by a little when it freezes, so the ice rises above the old water level. That’s why frozen pipes burst.',
    params:{kind}});
}

Object.assign(CGENS,{belttrain:genBeltTrain,barrow:genBarrow,capacity:genCapacity,surface:genSurface,holes:genHoles,disk:genDisk,break:genBreak,steelyard:genSteelyard,throw:genThrow,mix:genMix,winder:genWinder,ice:genIce});

/* ================= concept questions (set 3: study-guide types) ================= */
const DIRCH=[{t:'Clockwise',key:'cw'},{t:'Counterclockwise',key:'ccw'},{t:'It will not turn',key:'none'}];
function person(x,yFeet,h,face){const hy=yFeet-h;let b=L(x,hy+26,x+(face||0)*14,hy+20,'personl')+C(x,hy+8,8,'person')+L(x,hy+16,x,yFeet-28,'personl')+L(x,yFeet-28,x-9,yFeet,'personl')+L(x,yFeet-28,x+9,yFeet,'personl');return b;}

/* ---------- towers & stools ---------- */
function genTowers(seed,diff){
  const R=RNG(seed);const mode=diff===1?'boxes':R.pick(['boxes','boxes','stool']);const ask=R.pick(['tip','stable']);
  if(mode==='boxes'){
    for(let att=0;att<400;att++){const n=diff>=2&&R.chance(0.5)?3:2;const eq=n===2&&diff>=2&&R.chance(0.3);
      const TW=[];for(let i=0;i<n;i++)TW.push({w:R.int(1,4),h:R.int(2,8)});if(eq){TW[1]={w:TW[0].w,h:TW[0].h,split:true};}
      if(TW.some(t=>t.h<t.w))continue;
      const r1=TW.map(t=>t.w/t.h),r2=TW.map(t=>t.w*t.w/t.h);
      let ans;if(eq)ans='same';else{const pickI=a=>ask==='tip'?a.indexOf(Math.min(...a)):a.indexOf(Math.max(...a));const i1=pickI(r1),i2=pickI(r2);if(i1!==i2)continue;
        const s1=r1.slice().sort((a,b)=>a-b),s2=r2.slice().sort((a,b)=>a-b);const m=ask==='tip'?[s1[1]/s1[0],s2[1]/s2[0]]:[s1[n-1]/s1[n-2],s2[n-1]/s2[n-2]];if(Math.min(...m)<1.3)continue;ans=LET[i1];}
      const u=18,gy=210;let b='';let x=30;TW.forEach((t,i)=>{const cell=t.split?u/2:u,cw=t.split?t.w*2:t.w,ch=t.split?t.h*2:t.h;for(let r=0;r<ch;r++)for(let c=0;c<cw;c++)b+=Rect(x+c*cell,gy-(r+1)*cell,cell,cell,'boxc');b+=T(x+t.w*u/2,gy+24,LET[i],'lbl-L');t.x=x;x+=t.w*u+60;});
      b+=ground(10,x-30,gy)+arrow(x-40,40,x-110,40)+T(x-75,30,'wind','lbl-acc');
      const labs=TW.map((t,i)=>LET[i]);const ch=n===2?FIGC('Stack',labs,'Both are equally likely'):FIGC('Stack',labs);
      noteAll(ch,ans,k=>k==='same'?'The stacks differ in shape, so they don’t resist the wind equally.':eq?'Smaller boxes don’t matter: both stacks have the same outside size and are made of the same material.':ask==='tip'?'This stack is wider for its height, so its center of gravity stays over its base longer.':'This stack is taller for its width, so wind tips it more easily.');
      return mk({type:'towers',sub:'Center of gravity & tipping',diff,stem:ask==='tip'?'The stacks are made of identical boxes of the same material. Which stack is most likely to blow over in a strong wind?':'The stacks are made of identical boxes of the same material. Which stack is hardest to blow over?',
        svg:svgWrap(x-10,gy+34,b,'stacks of boxes in the wind'),choices:ch,answer:ans,
        explain:eq?'Both stacks have the same outside size and the same material, so they weigh the same and have the same shape. The number of boxes inside doesn’t matter.':`A tall, narrow stack has a high center of gravity over a small base, so the wind has more leverage and the weight has less. ${ask==='tip'?'The tallest, narrowest':'The widest, squattest'} stack is ${ans}.`,
        params:{mode,ask,towers:TW.map((t,i)=>({label:LET[i],w:t.w,h:t.h}))}});}
    throw new Error('towers');}
  for(let att=0;att<200;att++){const eq=R.chance(0.3);const seat=R.int(50,70);const fA=R.int(60,120);const fB=eq?fA:R.int(60,120);if(!eq&&Math.abs(fA-fB)<25)continue;
    const sw=[eq?fA:R.int(50,Math.min(fA,90)),eq?Math.max(50,fB-R.int(20,40)):R.int(50,Math.min(fB,90))];
    const feet=[fA,fB];const legs=feet.map((f,i)=>Math.abs(sw[i]-f)<4?'straight':'splayed');if(eq&&legs[0]===legs[1])continue;
    let b='';const gy=180;[0,1].forEach(i=>{const cx=100+i*200,top=gy-110;b+=`<ellipse cx="${cx}" cy="${top}" rx="${sw[i]/2+10}" ry="10" class="seat"/>`;const f=feet[i]/2,s=sw[i]/2;
      b+=L(cx-s,top+8,cx-f,gy,'leg')+L(cx+s,top+8,cx+f,gy,'leg')+L(cx-s*0.55,top+10,cx-f*0.55,gy-4,'leg2')+L(cx+s*0.55,top+10,cx+f*0.55,gy-4,'leg2')+T(cx,top-22,LET[i],'lbl-L');});
    b+=ground(20,380,gy);const ans=fA===fB?'same':(fA>fB?'A':'B');
    const ch=noteAll(FIGC('Stool',['A','B'],'No difference'),ans,k=>k==='same'?'Look at where the feet touch the floor; the stools stand on bases of different widths.':eq?'The legs look different, but the feet touch the floor the same distance apart. That footprint is what matters.':'Its feet are closer together, so its base is narrower and it tips sooner.');
    return mk({type:'towers',sub:'Center of gravity & tipping',diff,stem:'Which stool is less wobbly if you rock while sitting on it?',svg:svgWrap(400,gy+14,b,'two stools with different legs'),choices:ch,answer:ans,
      explain:ans==='same'?'What keeps a stool from tipping is how far apart its feet are on the floor. Both stools have the same footprint, so they’re equally steady.':`A stool tips when your weight moves past the edge of its base. Stool ${ans}’s feet are spread wider, so it is steadier.`,
      params:{mode,feet}});}
  throw new Error('stool');
}

/* ---------- inertia: hanging ball, braking ---------- */
function genInertia(seed,diff){
  const R=RNG(seed);const mode=diff===1?'accel':R.pick(['accel','brake','still','load']);
  const aLeft=R.chance(.5);const labL=aLeft?'A':'B',labR=aLeft?'B':'A';
  if(mode==='load'){const act=R.pick(['brake','accel']);let b='';const gy=150;
    // animation: car rolls right, speeding up (x∝t²) or braking to a stop; the body pitches nose-down when braking, nose-up when speeding up
    const drive=timedPath(Array.from({length:201},(_,k)=>{const u=k/200;return[30*(act==='brake'?2*u-u*u:u*u),0];}));
    b+=MV(drive,MV(`tilt:170,${gy-30},${act==='brake'?2.5:-2.5}`,`<path class="carbody" d="M40 ${gy-22} L60 ${gy-52} L150 ${gy-58} L200 ${gy-58} L240 ${gy-30} L300 ${gy-26} L300 ${gy-12} L40 ${gy-12} Z"/>`)+C(90,gy-12,16,'tire2')+C(255,gy-12,16,'tire2'));
    b+=ground(10,330,gy+4)+arrow(170,30,290,30)+T(230,20,act==='brake'?'moving, brakes on':'speeding up','lbl-acc');
    const ans=act==='brake'?'more':'less';const ch=[{t:'Greater than when cruising',key:'more'},{t:'Less than when cruising',key:'less'},{t:'Unchanged',key:'same'}];
    noteAll(ch,ans,k=>k==='same'?'Speeding up or braking shifts weight between the wheels.':act==='brake'?'Braking throws the car’s weight forward, onto the front wheels.':'Speeding up pushes weight back onto the rear wheels, off the front.');
    return mk({type:'inertia',sub:'Inertia & motion',diff,stem:`The car is moving to the right and ${act==='brake'?'brakes hard':'speeds up hard'}. How much load is on the front wheels?`,svg:svgWrap(340,gy+14,b,'car on a road'),choices:ch,answer:ans,
      explain:act==='brake'?'When a car brakes, its body keeps trying to move forward, so it pitches forward and more of its weight lands on the front wheels. That’s why the nose dips.':'When a car speeds up, its body lags behind, so weight shifts toward the rear wheels and the front gets lighter.',params:{mode,act}});}
  const lean=mode==='still'?0:(R.chance(.5)?1:-1);let b='';const x0=60,x1=300,yt=70,yb=170;
  // animation: bus travels its way (lean<0 & accel or lean>0 & brake = rightward): steady speed, speeding up (x∝t²) or braking to a stop;
  // the hanging ball rocks about its leaning rest angle (a steadily changing speed holds it at that lean)
  const goR=mode==='still'?true:(mode==='accel'?lean<0:lean>0),sg=goR?1:-1;
  const bus=timedPath(Array.from({length:201},(_,k)=>{const u=k/200;return[sg*40*(mode==='still'?u:mode==='accel'?u*u:2*u-u*u),0];}));
  b+=MV(bus,Rect(x0,yt,x1-x0,yb-yt,'carbody',6)+C(x0+40,yb+12,16,'tire2')+C(x1-40,yb+12,16,'tire2'))+ground(20,340,yb+28);
  const px=180,py=yt+6,len=62,ang=lean*0.42;const bx=px+len*Math.sin(ang),by=py+len*Math.cos(ang);const sw=L(px,py,bx,by,'string')+C(bx,by,11,'ball');
  b+=MV(bus,L(px-12,py,px+12,py,'ink')+(mode==='still'?sw:MV(`osc:${px},${py},5,0.5`,sw)));
  b+=arrow(150,40,50,40)+T(100,30,labL,'lbl-L')+arrow(210,40,310,40)+T(260,30,labR,'lbl-L');
  if(mode==='still'){const ch=[{t:'It is speeding up',key:'accel'},{t:'It is slowing down',key:'brake'},{t:'It is moving at a steady speed (or stopped)',key:'same'}];noteAll(ch,'same',k=>'If the bus were changing speed, the ball would swing away from straight down.');
    return mk({type:'inertia',sub:'Inertia & motion',diff,stem:'A ball hangs on a string from the ceiling of a moving bus. The string hangs straight down. What is the bus doing?',svg:svgWrap(360,yb+36,b,'bus with a ball hanging straight down'),choices:ch,answer:'same',
      explain:'A hanging ball only swings away from vertical when the bus speeds up or slows down. Straight down means the speed isn’t changing.',params:{mode,lean:0}});}
  const moveRight=mode==='accel'?lean<0:lean>0;const ans=moveRight?labR:labL;
  const ch=noteAll([{t:'Direction A',key:'A'},{t:'Direction B',key:'B'},{t:'You can’t tell',key:'same'}],ans,k=>k==='same'?'The lean of the ball does tell you. It lags behind when the bus speeds up and swings ahead when it brakes.':mode==='accel'?'When speeding up, the ball lags behind, so the bus is heading away from the side the ball leans toward.':'When braking, the ball keeps going and swings ahead, toward the direction of travel.');
  return mk({type:'inertia',sub:'Inertia & motion',diff,stem:mode==='accel'?'A ball hangs on a string from the ceiling of a bus that is speeding up. Which way is the bus going?':'A ball hangs on a string from the ceiling of a bus that is braking. Which way was the bus going?',
    svg:svgWrap(360,yb+36,b,'bus with a hanging ball leaning to one side'),choices:ch,answer:ans,
    explain:mode==='accel'?`The ball tends to stay where it is. When the bus speeds up, the bus moves out from under it, so the ball leans back. It leans ${lean<0?'left':'right'}, so the bus is going ${moveRight?'right':'left'}: direction ${ans}.`:`When the bus brakes, the ball keeps moving forward and swings ahead. It leans ${lean<0?'left':'right'}, so the bus was going ${moveRight?'right':'left'}: direction ${ans}.`,
    params:{mode,lean,labL,labR}});
}

/* ---------- ring (internal) gears ---------- */
function ringPath(cx,cy,R,n,phase,m){const a=0.95*m,step=2*Math.PI/n;let d=`M${P(cx+R+a+10)} ${P(cy)} A${P(R+a+10)} ${P(R+a+10)} 0 1 0 ${P(cx-R-a-10)} ${P(cy)} A${P(R+a+10)} ${P(R+a+10)} 0 1 0 ${P(cx+R+a+10)} ${P(cy)} Z `;const pts=[];
  for(let k=0;k<n;k++){const c=phase+k*step;for(const [t,rr] of [[c-0.30*step,R+a],[c-0.15*step,R-a],[c+0.15*step,R-a],[c+0.30*step,R+a]])pts.push([cx+rr*Math.cos(t),cy+rr*Math.sin(t)]);}
  d+='M'+pts.map(p=>P(p[0])+' '+P(p[1])).join(' L')+' Z';return `<path class="ring" fill-rule="evenodd" d="${d}"/>`;}
function genRing(seed,diff){
  const R=RNG(seed);const m=5.5;
  for(let att=0;att<300;att++){const cfg=diff===1?'pinion':R.pick(['pinion','idler','two']);const cx=170,cy=160;let gs=[],ring;
    if(cfg==='pinion'){const nr=R.pick([36,40,44]),np=R.pick([10,12,14]);ring={r:nr*m/2,n:nr};const rp=np*m/2,th=R.f()*6.28;gs=[{n:np,r:rp,x:cx+(ring.r-rp)*Math.cos(th),y:cy+(ring.r-rp)*Math.sin(th)}];}
    else if(cfg==='idler'){const ns=R.pick([12,14,16]),ni=R.pick([8,10,12]);const nr=ns+2*ni;ring={r:nr*m/2,n:nr};const th=R.f()*6.28;gs=[{n:ns,r:ns*m/2,x:cx,y:cy},{n:ni,r:ni*m/2,x:cx+(ns+ni)*m/2*Math.cos(th),y:cy+(ns+ni)*m/2*Math.sin(th)}];}
    else{const ns=R.pick([10,12]),n1=R.pick([8,10]),n2=R.pick([8,10]);const nr=R.pick([40,44]);ring={r:nr*m/2,n:nr};const rs=ns*m/2,r1=n1*m/2,r2=n2*m/2;const th=R.f()*6.28;const g1={n:n1,r:r1,x:cx+(rs+r1)*Math.cos(th),y:cy+(rs+r1)*Math.sin(th)};
      const d1=Math.hypot(g1.x-cx,g1.y-cy),A=ring.r-r2,B=r1+r2;const xx=(A*A-B*B+d1*d1)/(2*d1),h2=A*A-xx*xx;if(h2<=0)continue;const h=Math.sqrt(h2)*(R.chance(.5)?1:-1);const ux=(g1.x-cx)/d1,uy=(g1.y-cy)/d1;
      const g2={n:n2,r:r2,x:cx+ux*xx-uy*h,y:cy+uy*xx+ux*h};if(Math.hypot(g2.x-cx,g2.y-cy)<rs+r2+2*m+4)continue;gs=[{n:ns,r:rs,x:cx,y:cy},g1,g2];}
    const driverIsRing=cfg==='pinion'&&diff>=2&&R.chance(0.35);const cw=R.chance(.5);
    gs[0].phase=R.f()*6.28;for(let i=1;i<gs.length;i++)meshPhase(gs[i-1],gs[i]);const last=gs[gs.length-1];const th=Math.atan2(last.y-cy,last.x-cx);const stepL=2*Math.PI/last.n,stepR=2*Math.PI/ring.n;
    const tstar=last.phase+Math.round((th-last.phase)/stepL)*stepL;ring.phase=th+(tstar-th)*last.r/ring.r+stepR/2;
    /* motion: equal pitch-line speed at every mesh; outside meshes reverse the sense, the mesh inside the ring keeps it (w ∝ 1/r) */
    const sg0=cw?1:-1;let wR;if(driverIsRing){wR=sg0*0.6;gs[0].w=wR*ring.r/gs[0].r;}else{gs[0].w=sg0*0.7;for(let i=1;i<gs.length;i++)gs[i].w=-gs[i-1].w*gs[i-1].r/gs[i].r;wR=last.w*last.r/ring.r;}
    let b=mvg(aRot(cx,cy,wR),ringPath(cx,cy,ring.r,ring.n,ring.phase,m));gs.forEach((g,i)=>{b+=mvg(aRot(g.x,g.y,g.w),gearPath(g.x,g.y,g.r,g.n,g.phase,m)+C(g.x,g.y,Math.min(9,g.r*0.4),'hub'));});
    const lab=driverIsRing?'the ring gear':'gear X';if(!driverIsRing)b+=T(gs[0].x,gs[0].y+5,'X','glbl');
    if(driverIsRing)b+=arcArrow(cx,cy,ring.r+0.95*m+22,-Math.PI/2,1.0,cw);else b+=arcArrow(gs[0].x,gs[0].y,gs[0].r+0.95*m+10,-Math.PI/2-0.3,1.2,cw);
    const nMesh=gs.length;const flips=gs.length-1;const ringSame=(flips%2===0);const target=driverIsRing?'X':'ring';
    const ans=ringSame?(cw?'cw':'ccw'):(cw?'ccw':'cw');
    const ch=DIRCH.map(c=>Object.assign({},c));noteAll(ch,ans,k=>k==='none'?'Nothing here is jammed; every gear can turn.':'A gear meshing inside a ring turns the same way as the ring, not opposite. Only outside-to-outside meshes reverse direction.');
    if(driverIsRing)b+=T(gs[0].x,gs[0].y+5,'X','glbl');
    return mk({type:'ring',sub:'Ring (internal) gears',diff,stem:driverIsRing?'The large ring gear turns in the direction of the arrow. Which way does gear X turn?':'Gear X turns in the direction of the arrow. Which way does the large ring gear turn?',
      svg:svgWrap(340,320,b,'gears inside a ring gear'),choices:ch,answer:ans,
      explain:`Two gears meshing on their outsides turn in opposite directions. A gear meshing on the inside of a ring turns the same direction as the ring. ${cfg==='pinion'?'Here the small gear meshes directly inside the ring, so they turn the same way.':cfg==='idler'?'X reverses the idler, and the idler turns the ring its own way, so the ring turns opposite to X.':'X reverses the first idler, which reverses the second, which turns the ring its own way. Two reversals cancel, so the ring turns the same way as X.'}`,
      params:{cfg,cw,driverIsRing,center:[cx,cy],ringR:ring.r,gears:gs.map(g=>({x:P(g.x),y:P(g.y),r:g.r}))}});}
  throw new Error('ring');
}

/* ---------- moving a box to balance ---------- */
function genSeesawMove(seed,diff){
  const R=RNG(seed);for(let att=0;att<300;att++){const eq=diff>=2&&R.chance(0.2);const dC=R.int(2,4),dD=R.int(2,5),wC=R.int(1,3),wD=R.int(1,3);const tq=wD*dD-wC*dC;if(eq?tq!==0:tq===0)continue;
    const cLeft=R.chance(.5);const sgn=Math.sign(tq)*(cLeft?1:-1);// + means right side down
    const s=34,cx=200,cy=150,ang=eq?0:sgn*0.2;const pt=d=>[cx+d*s*Math.cos(ang),cy+d*s*Math.sin(ang)];let b=Poly([[cx,cy+4],[cx-22,cy+44],[cx+22,cy+44]],'fulcrum')+ground(cx-60,cx+60,cy+44);
    const e1=pt(-5.6),e2=pt(5.6);
    // animation: C slides (along the board) toward the spot where wC×d = wD×dD; the board only levels if that spot is on the board
    const dBal=wD*dD/wC,lim=5.6-(24+wC*6)/2/s,dGo=Math.max(0.7,Math.min(lim,dBal)),fits=Math.abs(dGo-dBal)<1e-9;
    const slide=(dGo-dC)*s*(cLeft?-1:1),boardA=eq?`osc:${cx},${cy},1.2,0.45`:(fits?`tilt:${cx},${cy},${R2(-ang*180/Math.PI)}`:'');
    const cA=eq?'':timedPath(Array.from({length:61},(_,k)=>{const u=Math.min(1,k/12),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;return[slide*e,0];}));
    b+=`<g${boardA?` class="mv" data-a="${boardA}"`:''} transform="rotate(${P(ang*180/Math.PI)} ${cx} ${cy})">`+Rect(cx-5.6*s,cy-5,11.2*s,10,'beam',2);
    const box=(d,w,label)=>{const x=cx+d*s,hh=24+w*8,ww=24+w*6;return Rect(x-ww/2,cy-5-hh,ww,hh,'load',2)+(label?T(x,cy-5-hh/2+6,label,'lbl-sb'):'');};
    const dCs=cLeft?-dC:dC,dDs=cLeft?dD:-dD;b+=(cA?MV(cA,box(dCs,wC,'C')):box(dCs,wC,'C'))+box(dDs,wD,'');
    const outward=cLeft?-1:1;const aOut=R.chance(.5);const x0=cx+dCs*s;const ay=cy-5-(24+wC*8)-26;
    b+=arrow(x0,ay,x0+outward*52,ay)+T(x0+outward*30,ay-8,aOut?'A':'B','lbl-L')+arrow(x0,ay-34,x0-outward*52,ay-34)+T(x0-outward*30,ay-42,aOut?'B':'A','lbl-L');b+='</g>';
    const cSideDown=eq?null:((sgn>0)!==cLeft);const want=eq?'same':(cSideDown?'in':'out');const ans=want==='same'?'same':((want==='out')===aOut?'A':'B');
    const ch=noteAll([{t:'Direction A',key:'A'},{t:'Direction B',key:'B'},{t:'Neither; it is already balanced',key:'same'}],ans,k=>k==='same'?'The board is tilted, so one side has more turning force.':cSideDown?'Box C is on the low side. Moving it outward adds even more turning force to that side.':'Box C is on the high side. Moving it inward takes away turning force from the side that needs more.');
    return mk({type:'seesaw',sub:'Levers & balance',diff,stem:'Which way should box C slide to balance the board?',svg:svgWrap(400,230,b,'tilted board on a pivot with two boxes'),choices:ch,answer:ans,
      explain:eq?'The board is level, so the turning forces already match. Moving C either way would tip it.':`The low side has more turning force (weight × distance from the pivot). Box C is on the ${cSideDown?'low':'high'} side, so it should move ${cSideDown?'toward':'away from'} the pivot.`,
      params:{wC,dC,wD,dD,cLeft,aOut}});}
  throw new Error('seesaw');
}

/* ---------- prop under a leaning plank ---------- */
function genProp(seed,diff){
  const R=RNG(seed);for(let att=0;att<300;att++){const eq=diff>=2&&R.chance(0.3);const L0=200;const fA=R.pick([0.55,0.65,0.75,0.9]),fB=eq?fA:R.pick([0.55,0.65,0.75,0.9]);if(!eq&&fA===fB)continue;
    const angA=R.pick([0.2,0.3,0.4]),angB=eq?R.pick([0.2,0.3,0.4].filter(a=>a!==angA)):R.pick([0.2,0.3,0.4]);
    let b='';const gy=190;const draw=(ox,f,ang,label)=>{const x0=ox,x1=ox+L0*Math.cos(ang),y1=gy-L0*Math.sin(ang);const px=ox+L0*f*Math.cos(ang),py=gy-L0*f*Math.sin(ang);
      let s=Rect(px-5,py,10,gy-py,'postd')+`<g transform="rotate(${P(-ang*180/Math.PI)} ${x0} ${gy})">`+Rect(x0,gy-16,L0,16,'plank',2)+T(x0+L0/2,gy-4,'','lbl')+'</g>';s+=T(x1-10,y1-20,label,'lbl-L');return s;};
    b+=draw(20,fA,angA,'A')+draw(240,fB,angB,'B')+ground(10,470,gy);
    const lA=0.5/fA,lB=0.5/fB;const ans=eq?'same':(lA>lB?'A':'B');
    const ch=noteAll(FIGC('Post',['A','B'],'No difference'),ans,k=>k==='same'?'The posts sit at different spots along the planks.':eq?'The planks lean at different angles, but each post sits at the same fraction of the way along its plank. The angle doesn’t change the share.':'This post is farther out toward the end, so the ground end takes more of the weight.');
    return mk({type:'prop',sub:'Supports & load sharing',diff,stem:'Identical planks rest on the ground at one end and on a post. Which post carries more weight?',svg:svgWrap(480,gy+14,b,'two leaning planks each resting on a post'),choices:ch,answer:ans,
      explain:eq?'Each post sits the same fraction of the way along its plank, so each carries the same share of the weight. The steepness doesn’t matter.':`The plank’s weight acts at its middle. The ground and the post share it, and the support closer to the middle carries more. Post ${ans} sits closer to the middle of its plank.`,
      params:{fA,fB,angA,angB}});}
  throw new Error('prop');
}

/* ---------- two supports sharing a load ---------- */
function genCarry(seed,diff){
  const R=RNG(seed);const mode=diff===1?'pole':R.pick(['pole','pole','cart','bindle']);
  if(mode==='bindle'){for(let att=0;att<100;att++){const aA=R.int(30,90),aB=R.int(30,90);if(Math.abs(aA-aB)<20)continue;const hand=40;let b='';const gy=200;
      [[40,aA,'A'],[260,aB,'B']].forEach(([ox,a,lab])=>{const sx=ox+60,sy=gy-120;b+=person(sx,gy,130);b+=L(sx-hand,sy+14,sx+a+30,sy-8,'stick');const bx=sx+a,by=sy-3;b+=L(bx,by,bx,by+18,'string')+`<ellipse cx="${bx}" cy="${by+32}" rx="16" ry="14" class="bag"/>`+T(sx,gy+22,lab,'lbl-L');});
      b+=ground(10,480,gy);const ans=aA<aB?'A':'B';
      const ch=noteAll(FIGC('Way',['A','B'],'Both the same'),ans,k=>k==='same'?'The bundles hang at different distances from the shoulder.':'The bundle is farther out, so the hand has to push down harder to balance it.');
      return mk({type:'carry',sub:'Supports & load sharing',diff,stem:'The same bundle is carried on a stick over the shoulder. Which way is easier to carry?',svg:svgWrap(480,gy+30,b,'two people carrying a bundle on a stick'),choices:ch,answer:ans,
        explain:`The shoulder is the pivot. The farther out the bundle hangs, the harder the hand must push down on the other end, and the more weight lands on the shoulder. Way ${ans} keeps the bundle closer in.`,params:{mode,aA,aB}});}}
  for(let att=0;att<100;att++){const eq=diff>=2&&R.chance(0.2);const Lp=260;const f=eq?0.5:R.pick([0.25,0.33,0.4,0.6,0.67,0.75]);let b='';const gy=210,x0=60;
    if(mode==='pole'){b+=person(x0,gy,150)+person(x0+Lp,gy,150)+L(x0-20,gy-128,x0+Lp+30,gy-128,'stick');const lx=x0+Lp*f;b+=L(lx,gy-128,lx,gy-90,'string')+Rect(lx-20,gy-90,40,32,'load',2);
      b+=T(x0,gy+22,'A','lbl-L')+T(x0+Lp,gy+22,'B','lbl-L');}
    else{b+=Rect(x0-20,gy-58,Lp+40,14,'plank',2)+C(x0,gy-18,18,'wheel2')+C(x0+Lp,gy-18,18,'wheel2')+C(x0,gy-18,3,'dot')+C(x0+Lp,gy-18,3,'dot');const lx=x0+Lp*f;b+=stoneBlob(lx,gy-76,70,36,0);b+=T(x0,gy+24,'A','lbl-L')+T(x0+Lp,gy+24,'B','lbl-L');}
    b+=ground(10,400,gy);const ans=eq?'same':(f<0.5?'A':'B');
    const noun=mode==='pole'?'Person':'Wheel';
    const ch=noteAll(FIGC(noun,['A','B'],'Both the same'),ans,k=>k==='same'?'The load isn’t in the middle, so the two ends don’t share it equally.':'The load is closer to the other end, so this end carries less.');
    return mk({type:'carry',sub:'Supports & load sharing',diff,stem:mode==='pole'?'Two people carry a load hanging from a pole. Which person carries more weight?':'A heavy stone rides on a flat cart. Which wheel presses harder on the rail?',
      svg:svgWrap(420,gy+32,b,mode==='pole'?'two people carrying a pole with a hanging load':'cart with a stone'),choices:ch,answer:ans,
      explain:eq?'The load sits exactly in the middle, so both ends carry the same share.':`The end closer to the load carries more of it. Here the load is closer to ${ans}.`,params:{mode,f}});}
  throw new Error('carry');
}

/* ---------- which chain holds the shelf ---------- */
function genChainHold(seed,diff){
  const R=RNG(seed);for(let att=0;att<300;att++){const loadRight=R.chance(.5);const n=diff===1?2:R.pick([2,3]);const spots=R.shuffle([['top','load'],['top','far'],['bot','load'],['bot','far']]).slice(0,n);
    const works=spots.map(([v,s])=>(v==='top'&&s==='load')||(v==='bot'&&s==='far'));const cnt=works.filter(Boolean).length;if(n===3&&cnt!==1)continue;if(n===2&&cnt===0)continue;
    const cx=200,cy=150;let b=Rect(cx-10,40,20,230,'wood')+Rect(cx-150,cy-6,300,12,'beam',2)+C(cx,cy,5,'pin');const sgL=loadRight?1:-1;
    b+=Rect(cx+sgL*95-30,cy-38,60,32,'load',3);const labs=['A','B','C'];const chains=[];
    spots.forEach(([v,s],i)=>{const side=s==='load'?sgL:-sgL;const Pp=[cx+side*10,cy+(v==='top'?-70:70)],Q=[cx+side*110,cy+(v==='top'?-6:6)];b+=L(Pp[0],Pp[1],Q[0],Q[1],'chain');b+=T((Pp[0]+Q[0])/2+side*16,(Pp[1]+Q[1])/2+(v==='top'?-6:18),labs[i],'lbl-on');chains.push({label:labs[i],P:Pp,Q});});
    const ok=labs.slice(0,n).filter((l,i)=>works[i]);const ans=n===2&&cnt===2?'same':ok[0];
    const ch=n===2?FIGC('Chain',['A','B'],'Either one'):FIGC('Chain',['A','B','C']);
    noteAll(ch,ans,k=>{if(k==='same')return 'Only one of these chains gets pulled tight when the load pushes down.';const i=labs.indexOf(k);return works[i]?'This chain also works, but so does the other one.':'When the loaded end drops, this chain goes slack. A chain can only pull.';});
    return mk({type:'chainhold',sub:'Cables: tension only',diff,stem:n===2?'The arm pivots on a bolt through the post. Which one piece of chain alone will hold up the load?':'The arm pivots on a bolt through the post. Which one piece of chain alone will hold up the load?',
      svg:svgWrap(400,290,b,'arm pinned to a post with chains'),choices:ch,answer:ans,
      explain:`The load pushes its end of the arm down, so the arm tries to rotate about the bolt: the loaded end goes down and the other end goes up. A chain only helps if that motion would stretch it. That means a chain from above to the loaded end, or from below to the other end.${ans==='same'?' Both chains here do that.':''}`,
      params:{loadRight,pivot:[cx,cy],chains}});}
  throw new Error('chainhold');
}

/* ---------- differential windlass (end view) ---------- */
function genDiffWinch(seed,diff){
  const R=RNG(seed);const cfg=diff===1?R.pick(['same','opp']):R.pick(['same','opp','opp','equal']);const cw=R.chance(.5);const cx=180,cy=90;
  const RB=46,rs=cfg==='equal'?46:26;const bigSide=R.chance(.5)?-1:1;const smallSide=cfg==='same'?bigSide:-bigSide;const ropes=[{r:RB,side:bigSide},{r:rs,side:smallSide}];
  const gy=300,py=196;let b='';b+=C(cx,cy,RB,'drum')+C(cx,cy,rs,cfg==='equal'?'drum':'drum2')+C(cx,cy,6,'hub');
  const pr=Math.abs(ropes[0].side*ropes[0].r-ropes[1].side*ropes[1].r)/2||10;const pcx=cx+(ropes[0].side*ropes[0].r+ropes[1].side*ropes[1].r)/2;
  ropes.forEach(rp=>{const x=cx+rp.side*rp.r;b+=L(x,cy,x,py,'rope');});
  b+=`<path class="rope" d="M${P(pcx-pr)} ${py} A${P(pr)} ${P(pr)} 0 0 0 ${P(pcx+pr)} ${py}"/>`+C(pcx,py,Math.max(pr-3,6),'sheave')+C(pcx,py,3,'dot')+L(pcx,py,pcx,py+Math.max(pr,8)+14,'strap')+Rect(pcx-24,py+Math.max(pr,8)+14,48,30,'load',3);
  const ha=-2.2;b+=L(cx,cy,cx+74*Math.cos(ha),cy+74*Math.sin(ha),'crank')+C(cx+74*Math.cos(ha),cy+74*Math.sin(ha),7,'knob')+arcArrow(cx,cy,RB+24,-Math.PI/2+0.9,1.1,cw);
  b+=T(cx,gy-4,cfg==='equal'?'two drums, same size':'large drum + small drum on one shaft','lbl-s');
  const rate=ropes.reduce((s,rp)=>s+(cw?-rp.side:rp.side)*rp.r,0);const ans=rate>0?'up':rate<0?'down':'still';
  /* motion: both drums and the crank turn together. A rope leaving the right side of a drum goes down at w*r when the drum turns clockwise
     (the left side goes up). The pulley moves at the average of its two rope ends; the load moves with it. Crank speed is kept low enough
     that the load stays in view. */
  {const Sg=ropes.reduce((s,rp)=>s+rp.side*rp.r,0),cap=ans==='up'?20:14,wm=Sg?Math.min(0.6,cap/(MV_T/2*Math.abs(Sg))):0.6,w=(cw?1:-1)*wm,vP=w*Sg/2;
    const rd=ropes.map(rp=>({x:cx+rp.side*rp.r,v:w*rp.r*rp.side}));const vLeft=rd[0].x<rd[1].x?rd[0].v:rd[1].v;
    b=mvWrap(b,C(cx,cy,RB,'drum')+C(cx,cy,rs,cfg==='equal'?'drum':'drum2')+C(cx,cy,6,'hub'),aRot(cx,cy,w));
    rd.forEach(r=>{b=mvWrap(b,L(r.x,cy,r.x,py,'rope'),'flow:'+nf(r.v));});
    const pf=`<path class="rope" d="M${P(pcx-pr)} ${py} A${P(pr)} ${P(pr)} 0 0 0 ${P(pcx+pr)} ${py}"/>`;
    b=mvWrap(b,pf+C(pcx,py,Math.max(pr-3,6),'sheave')+C(pcx,py,3,'dot')+L(pcx,py,pcx,py+Math.max(pr,8)+14,'strap')+Rect(pcx-24,py+Math.max(pr,8)+14,48,30,'load',3),vP?aSlide(0,Math.sign(vP),linSer(Math.abs(vP)),Math.max(120,8*Math.abs(vP)*MV_T)):'');
    b=mvWrap(b,pf,'flow:'+nf(vLeft-vP));
    b=mvWrap(b,L(cx,cy,cx+74*Math.cos(ha),cy+74*Math.sin(ha),'crank')+C(cx+74*Math.cos(ha),cy+74*Math.sin(ha),7,'knob'),aRot(cx,cy,w));}
  const ch=noteAll([{t:'The load rises',key:'up'},{t:'The load lowers',key:'down'},{t:'The load stays where it is',key:'still'}],ans,k=>k==='still'?'The two rope ends don’t cancel out here; one side winds in faster.':cfg==='opp'?'One drum winds rope in while the other lets it out. The larger drum moves more rope per turn, so it wins.':cfg==='equal'?'The drums are the same size, so one lets out exactly as much rope as the other takes in.':'Both ropes wind the same way here, so they work together.');
  return mk({type:'diffwinch',sub:'Winches & wheel and axle',diff,stem:'Seen from the end: two drums are fixed on the same shaft and turn together. One rope runs from one drum, down around the pulley, and up to the other drum. The crank turns as shown. What happens to the load?',
    svg:svgWrap(360,gy+10,b,'end view of two drums with a rope loop and a pulley'),choices:ch,answer:ans,
    explain:cfg==='equal'?'Both drums are the same size, so every turn winds in exactly as much rope on one side as it lets out on the other. The loop stays the same length and the load doesn’t move.':cfg==='same'?'Both rope ends leave the drums on the same side, so they both wind in (or both let out) together.':'This is a differential windlass. One drum winds rope in while the other lets it out. The large drum moves more rope per turn, so the loop changes by the difference, very slowly, with a lot of force.',
    params:{cw,ropes}});
}

/* ---------- ratchets ---------- */
function genRatchet(seed,diff){
  const R=RNG(seed);const allowCW=R.chance(.5);const cx=170,cy=150,ri=62,ro=80,n=12,step=2*Math.PI/n,dl=step*0.92;const ph=R.f()*step;
  const prof=allowCW?[[0,ri],[0,ro],[dl,ri]]:[[0,ri],[dl,ro],[dl,ri]];let pts=[];for(let k=0;k<n;k++){const t0=ph+k*step;if(allowCW){pts.push([t0,ri],[t0,ro],[t0+dl,ri]);}else{pts.push([t0,ri],[t0+dl,ro],[t0+dl,ri]);}}
  const xy=([t,r])=>[cx+r*Math.cos(t),cy+r*Math.sin(t)];let b=Poly(pts.map(xy),'ratchet')+C(cx,cy,14,'hub');
  const k0=Math.floor(((-Math.PI/2)-ph)/step);const tFace=allowCW?ph+k0*step:ph+k0*step+dl;const tipA=allowCW?tFace-0.05:tFace+0.05;const tip=xy([tipA,ri+4]);
  const pivA=allowCW?tipA-0.55:tipA+0.55;const piv=xy([pivA,ro+26]);b+=L(piv[0],piv[1],tip[0],tip[1],'pawl')+C(piv[0],piv[1],5,'pin');
  const mode=diff===1?'hold':R.pick(['hold','drive']);let ans;const aIsCW=R.chance(.5);
  /* motion: the wheel only ever advances the free way (the way that slides the sloped backs under the catch). Hold: it turns steadily that way.
     Drive: the handle rocks to and fro and the wheel moves only on the strokes that go the free way, then waits.
     The catch rides up each slope and drops off the steep face; its swing is worked out from the tooth shape and fitted as osc terms. */
  const ratMove=sv=>{const sA=allowCW?1:-1,N=1800,dt=MV_T/N,Ah=14*Math.PI/180,hz=0.3;const phi=[0];
    for(let i=1;i<=N;i++){const t=i*dt;const dth=mode==='drive'?Ah*(Math.sin(2*Math.PI*hz*t)-Math.sin(2*Math.PI*hz*(t-dt))):0.22*sA*dt;phi.push(phi[i-1]+(mode==='drive'?sA*Math.max(0,sA*dth):dth));}
    const poly=pts.map(xy),prof=lam=>{const ux=Math.cos(lam),uy=Math.sin(lam);let best=0;for(let j=0;j<poly.length;j++){const a=poly[j],q=poly[(j+1)%poly.length];const ax=a[0]-cx,ay=a[1]-cy,bx=q[0]-a[0],by=q[1]-a[1];const den=ux*by-uy*bx;if(Math.abs(den)<1e-12)continue;
      const r=(ax*by-ay*bx)/den,s2=(ax*uy-ay*ux)/den;if(r>0&&s2>=-1e-9&&s2<=1+1e-9)best=Math.max(best,r);}return best;};
    const tip0=xy([tipA,ri+4]),rotP=(p0,a)=>{const dx=p0[0]-piv[0],dy=p0[1]-piv[1];return[piv[0]+dx*Math.cos(a)-dy*Math.sin(a),piv[1]+dx*Math.sin(a)+dy*Math.cos(a)];};
    const rho=a=>{const q=rotP(tip0,a);return Math.hypot(q[0]-cx,q[1]-cy);};const lift=rho(0.01)>rho(-0.01)?1:-1;
    const gap=(a,f)=>{const q=rotP(tip0,lift*a);return Math.hypot(q[0]-cx,q[1]-cy)-prof(Math.atan2(q[1]-cy,q[0]-cx)-f)-4;};
    const al=[];for(let i=0;i<=N;i++){let a=0;while(a<0.9&&gap(a,phi[i])<0)a+=0.002;al.push(a);}
    {const m=24,a0=al.slice();for(let i=0;i<=N;i++){let v=0;for(let j=Math.max(0,i-m);j<=Math.min(N,i+m);j++)v=Math.max(v,a0[j]);al[i]=i<m?a0[i]:v;}}
    for(let i=1;i<=N;i++)al[i]=Math.max(al[i],al[i-1]-0.75*dt);
    const at=arr=>t=>arr[Math.round(t/MV_T*N)];
    let o=mvWrap(sv,Poly(pts.map(xy),'ratchet')+C(cx,cy,14,'hub'),mode==='drive'?aSer(cx,cy,fitSer(at(phi),40)):aRot(cx,cy,0.22*sA));
    o=mvWrap(o,L(piv[0],piv[1],tip[0],tip[1],'pawl'),aSer(piv[0],piv[1],fitSer(t=>lift*at(al)(t),40)));
    if(mode==='drive')o=mvWrap(o,L(cx,cy,cx-40,cy-120,'crank'),`osc:${P(cx)},${P(cy)},14,${hz}`);
    return o;};
  if(mode==='drive'){b+=arcArrow(cx,cy,ro+50,Math.PI/2+0.9,0.9,aIsCW)+arcArrow(cx,cy,ro+50,Math.PI/2-0.9,0.9,!aIsCW);const pA=xy([Math.PI/2+1.35,ro+62]),pB=xy([Math.PI/2-1.35,ro+62]);b+=T(pA[0],pA[1],'A','lbl-L')+T(pB[0],pB[1],'B','lbl-L');
    b+=L(cx,cy,cx-40,cy-120,'crank')+arcArrow(cx,cy,130,-Math.PI/2-0.35,0.5,true)+arcArrow(cx,cy,130,-Math.PI/2-0.35,0.5,false);
    ans=(allowCW===aIsCW)?'A':'B';const ch=noteAll([{t:'In direction A',key:'A'},{t:'In direction B',key:'B'},{t:'First one way, then the other',key:'same'}],ans,k=>k==='same'?'The holding catch stops the wheel from ever turning backward, so it only goes one way.':'The catch jams against the steep side of the teeth when the wheel tries to go this way.');
    return mk({type:'ratchet',sub:'Ratchets & catches',diff,stem:'The handle is rocked back and forth. The catch shown keeps the wheel from slipping. Which way does the wheel turn?',svg:svgWrap(340,320,ratMove(b),'ratchet wheel with a catch'),choices:ch,answer:ans,
      explain:`The catch rides up the sloped backs of the teeth in one direction and jams against the steep faces in the other. So no matter how the handle rocks, the wheel can only advance ${allowCW?'clockwise':'counterclockwise'}: direction ${ans}.`,params:{mode,allowCW,prof,ph,n,tip:[tipA,ri+4],aIsCW}});}
  ans=allowCW?'cw':'ccw';const ch=[{t:'Only clockwise',key:'cw'},{t:'Only counterclockwise',key:'ccw'},{t:'Either way',key:'same'}];noteAll(ch,ans,k=>k==='same'?'The catch sits against a steep tooth face, so one direction is blocked.':'That way pushes the steep tooth face straight into the tip of the catch.');
  return mk({type:'ratchet',sub:'Ratchets & catches',diff,stem:'A catch (pawl) rests against this toothed wheel. Which way can the wheel turn?',svg:svgWrap(340,300,ratMove(b),'ratchet wheel with a catch'),choices:ch,answer:ans,
    explain:`The catch jams against the steep face of a tooth, but it can ride up the gentle slope. The wheel can only turn the way that slides the slopes under the catch: ${allowCW?'clockwise':'counterclockwise'}.`,params:{mode,allowCW,prof,ph,n,tip:[tipA,ri+4]}});
}

/* ---------- wind cups ---------- */
function genCups(seed,diff){
  const R=RNG(seed);const openCW=R.chance(.5);const cx=180,cy=150,arm=80,cr=20;const a0=R.f()*Math.PI/2;let b=C(cx,cy,8,'hub');const wind=R.pick([0,Math.PI,Math.PI/2,-Math.PI/2]);
  /* motion: the rotor turns rounded side first (opposite the way the hollows face), whatever the wind direction */
  const b0=b;b='';
  for(let k=0;k<4;k++){const a=a0+k*Math.PI/2;const px=cx+arm*Math.cos(a),py=cy+arm*Math.sin(a);b+=L(cx,cy,px,py,'ink');const t=a+(openCW?Math.PI/2:-Math.PI/2);// direction the hollow side faces
    const ccx=px+cr*Math.cos(t),ccy=py+cr*Math.sin(t);const pts=[];for(let q=0;q<=18;q++){const ph2=t+Math.PI/2+q/18*Math.PI;pts.push([ccx+cr*Math.cos(ph2),ccy+cr*Math.sin(ph2)]);}
    b+=Poly(pts,'cupin')+Path(pts,'cup');}
  b=b0+mvg(aRot(cx,cy,openCW?-0.8:0.8),b);
  const wx=cx+140*Math.cos(wind),wy=cy+140*Math.sin(wind);b+=arrow(wx,wy,wx-60*Math.cos(wind),wy-60*Math.sin(wind))+T(wx-30*Math.cos(wind)+(Math.abs(Math.sin(wind))>0.5?30:0),wy-30*Math.sin(wind)+(Math.abs(Math.cos(wind))>0.5?-10:4),'wind','lbl-acc',Math.abs(Math.sin(wind))>0.5?'start':'middle');
  const aCW=R.chance(.5);b+=arcArrow(cx,cy,arm+44,-Math.PI/2-0.6,0.8,aCW)+arcArrow(cx,cy,arm+44,-Math.PI/2+0.6,0.8,!aCW);const pA=[cx+(arm+62)*Math.cos(-Math.PI/2-1.1),cy+(arm+62)*Math.sin(-Math.PI/2-1.1)],pB=[cx+(arm+62)*Math.cos(-Math.PI/2+1.1),cy+(arm+62)*Math.sin(-Math.PI/2+1.1)];
  b+=T(pA[0],pA[1]+5,'A','lbl-L')+T(pB[0],pB[1]+5,'B','lbl-L');
  const turnCW=!openCW;const ans=turnCW===aCW?'A':'B';
  const ch=noteAll([{t:'Direction A',key:'A'},{t:'Direction B',key:'B'},{t:'It depends on the wind direction',key:'same'}],ans,k=>k==='same'?'Cups like these turn the same way whichever way the wind blows; that’s why they are used to measure wind speed.':'That would drive the cups open side first. The hollow side catches more wind and gets pushed back.');
  return mk({type:'cups',sub:'Wind & fluid drag',diff,stem:'Seen from above, the wind blows on these cups as shown. Which way will they turn?',svg:svgWrap(360,320,b,'wind cups on arms seen from above'),choices:ch,answer:ans,
    explain:`The hollow side of a cup catches much more wind than the rounded back. So the cups are always pushed hollow-side back, rounded-side first, whichever way the wind comes from. Here that is ${turnCW?'clockwise':'counterclockwise'}: direction ${ans}.`,params:{openCW,aCW}});
}

/* ---------- tracks & turning ---------- */
function genTracks(seed,diff){
  const R=RNG(seed);const turnLeft=R.chance(.5);const ask=R.pick(diff===1?['slow']:['slow','fast','far']);const cx=190,cy=150;let b='';
  const vehicle=ask==='far'?'car':'tractor';
  // animation: the vehicle (with its side labels) pivots 60° about a turn centre 110 px out on the inside, so the outside side sweeps the bigger arc
  const sgT=turnLeft?-1:1,turnA=`rot:${cx},${cy+sgT*110},${R2(sgT*(Math.PI/3)/9)}`;let b0='';
  if(vehicle==='tractor'){b+=Rect(cx-70,cy-58,140,30,'track',4)+Rect(cx-70,cy+28,140,30,'track',4);for(let x=cx-64;x<cx+66;x+=12){b+=L(x,cy-58,x,cy-28,'cleat')+L(x,cy+28,x,cy+58,'cleat');}b+=Rect(cx-50,cy-26,100,52,'carbody',6);}
  else{b+=Rect(cx-72,cy-34,144,68,'carbody',14);[[-46,-40],[46,-40],[-46,40],[46,40]].forEach(([dx,dy])=>b+=Rect(cx+dx-14,cy+dy-7,28,14,'tire3',4));}
  b+=Poly([[cx+76,cy],[cx+64,cy-8],[cx+64,cy+8]],'ink-fill');b0=b;b='';
  const sg=turnLeft?-1:1;b+=`<path class="acc" d="M${cx+90} ${cy} Q${cx+170} ${cy} ${cx+180} ${cy+sg*80}"/>`+head(cx+181,cy+sg*88,sg*Math.PI/2+(turnLeft?0.2:-0.2),12);
  const topLab=R.chance(.5)?'A':'B',botLab=topLab==='A'?'B':'A';const ty=vehicle==='tractor'?[cy-72,cy+80]:[cy-54,cy+64];b=MV(turnA,b0)+b+MV(turnA,T(cx-86,ty[0]+5,topLab,'lbl-L')+T(cx-86,ty[1]-5,botLab,'lbl-L'));
  const inside=turnLeft?topLab:botLab,outside=turnLeft?botLab:topLab;const ans=ask==='slow'?inside:outside;
  const noun=vehicle==='tractor'?'Track':'Side';
  const stem=ask==='slow'?'Seen from above, this tractor steers by running its two tracks at different speeds. Which track must move slower to turn the way the arrow shows?':ask==='fast'?'Seen from above, this tractor steers by running its two tracks at different speeds. Which track must move faster to turn the way the arrow shows?':'Seen from above, the car turns the way the arrow shows. Which side’s wheels travel farther during the turn?';
  const ch=noteAll(FIGC(noun,['A','B'],ask==='far'?'Both travel the same distance':'Both at the same speed'),ans,k=>k==='same'?'In a turn the inside travels a smaller circle than the outside.':ask==='slow'?'That’s the outside of the turn, which has to cover more ground.':'That’s the inside of the turn, which travels the smaller circle.');
  return mk({type:'tracks',sub:'Motion: skids & curves',diff,stem,svg:svgWrap(400,300,b,'vehicle seen from above turning'),choices:ch,answer:ans,
    explain:`Turning ${turnLeft?'left':'right'}, the ${turnLeft?'top':'bottom'} side (${inside}) is on the inside of the curve. The inside travels a smaller circle, so it moves slower and covers less distance; the outside (${outside}) moves faster and farther.`,
    params:{turnLeft,topLab,ask}});
}

/* ---------- floating ---------- */
function genFloat(seed,diff){
  const R=RNG(seed);const mode=diff===1?'liquid':R.pick(['liquid','block']);const eq=diff>=2&&R.chance(0.25);
  const sA=R.pick([0.3,0.45,0.6,0.75]),sB=eq?sA:R.pick([0.3,0.45,0.6,0.75]);if(!eq&&sA===sB)return genFloat(seed+1,diff);
  let b='';const top=70,bot=230,lvl=120,bh=50;[[40,sA,'A'],[240,sB,'B']].forEach(([ox,s,lab])=>{b+=Rect(ox+50,lvl-bh*(1-s),60,bh,'woodblk',3)+Rect(ox,lvl,160,bot-lvl,mode==='liquid'&&lab==='B'?'water2 front':'water front')+`<path class="wall" d="M${ox} ${top} V${bot} H${ox+160} V${top}"/>`+L(ox,lvl,ox+160,lvl,'surface')+T(ox+80,top-14,lab,'lbl-L');});
  let ans,ch,stem,explain;
  if(mode==='liquid'){ans=eq?'same':(sA<sB?'A':'B');stem='Identical wooden blocks float in two different liquids. Which liquid is heavier (denser)?';
    ch=noteAll([{t:'Liquid A',key:'A'},{t:'Liquid B',key:'B'},{t:'They are the same',key:'same'}],ans,k=>k==='same'?'The blocks float at different depths, so the liquids push up differently.':'The block sinks deeper here, so this liquid is lighter; it needs more of itself pushed aside to hold the block up.');
    explain=eq?'The blocks float at the same depth, so the liquids are equally dense.':`A floating block sinks until it pushes aside its own weight of liquid. In a heavier liquid, less needs to be pushed aside, so the block floats higher. It floats higher in ${ans}.`;}
  else{ans=eq?'same':(sA>sB?'A':'B');stem='Two blocks of the same size float in the same water. Which block is heavier?';
    ch=noteAll([{t:'Block A',key:'A'},{t:'Block B',key:'B'},{t:'They weigh the same',key:'same'}],ans,k=>k==='same'?'They float at different depths, so they push aside different amounts of water.':'This block floats higher, so it pushes aside less water and weighs less.');
    explain=eq?'Same depth, same water pushed aside, same weight.':`A floating block pushes aside its own weight of water. Block ${ans} sits deeper, so it pushes aside more water and is heavier.`;}
  return mk({type:'float',sub:'Floating & density',diff,stem,svg:svgWrap(440,bot+10,b,'blocks floating in two tanks'),choices:ch,answer:ans,explain,params:{mode,sA,sB}});
}

/* ---------- siphons ---------- */
function genSiphon(seed,diff){
  const R=RNG(seed);for(let att=0;att<100;att++){const eq=diff>=2&&R.chance(0.25);const sA=R.int(60,130),oA=R.int(150,240),sB=eq?R.int(60,130):R.int(60,130);const oB=eq?sB+(oA-sA):R.int(150,240);if(oB>245||oB<150)continue;if(!eq&&Math.abs((oA-sA)-(oB-sB))<25)continue;
    let b='';[[20,sA,oA,'A'],[240,sB,oB,'B']].forEach(([ox,s,o,lab])=>{const ux=ox+20,uw=70,uy0=s-20,uy1=s+50;b+=Rect(ux,s,uw,uy1-s,'water')+`<path class="wall" d="M${ux} ${uy0} V${uy1} H${ux+uw} V${uy0}"/>`+L(ux,s,ux+uw,s,'surface')+Rect(ux-6,uy1,uw+12,6,'metal');
      const tx=ux+uw-14,topY=uy0-26,dx=ux+uw+44;b+=MV(`flow:${R2(3.5*Math.sqrt(o-s))}`,`<path class="tube" d="M${tx} ${uy1-8} V${topY+10} Q${tx} ${topY} ${tx+10} ${topY} H${dx-10} Q${dx} ${topY} ${dx} ${topY+10} V${o}"/>`);
      b+=Rect(dx-30,o-8,60,262-o+8,'glass')+T(ux+uw/2,uy0-40,lab,'lbl-L');});
    const hA=oA-sA,hB=oB-sB;const ans=hA===hB?'same':(hA>hB?'A':'B');
    const ch=noteAll([{t:'Container A',key:'A'},{t:'Container B',key:'B'},{t:'Both empty at the same rate',key:'same'}],ans,k=>k==='same'?'The drop from the water surface to the tube outlet is different for the two.':'Its tube outlet is not as far below its water surface, so the water is pushed through more slowly.');
    return mk({type:'siphon',sub:'Siphons & flow',diff,stem:'Water siphons out of the upper containers through identical tubes. Which upper container empties faster (at first)?',svg:svgWrap(470,270,b,'two siphons draining containers'),choices:ch,answer:ans,
      explain:ans==='same'?'Both outlets sit the same distance below their water surfaces, so both siphons flow at the same rate.':`A siphon runs faster the farther its outlet is below the water surface it draws from. The tube height over the top doesn’t matter. ${ans} has the bigger drop.`,params:{sA,oA,sB,oB}});}
  throw new Error('siphon');
}

/* ---------- two pushes ---------- */
function genForces(seed,diff){
  const R=RNG(seed);for(let att=0;att<200;att++){const a1=R.f()*6.28,gapA=R.pick([60,75,90,105,120])*Math.PI/180,a2=a1+(R.chance(.5)?1:-1)*gapA;const m1=diff>=3?R.pick([1,1.5,2]):1,m2=1;
    const rx=m1*Math.cos(a1)+m2*Math.cos(a2),ry=m1*Math.sin(a1)+m2*Math.sin(a2);const ar=Math.atan2(ry,rx);const opts=[ar,a1,a2,ar+Math.PI];
    const dist=(x,y)=>Math.abs(Math.atan2(Math.sin(x-y),Math.cos(x-y)));const cand=[{a:ar,c:true},{a:R.chance(.5)?a1:a2,n:'That’s the direction of just one of the pushes. Both pushes act together.'},{a:ar+Math.PI,n:'That points back toward the people pushing.'},{a:a1+(a1-ar),n:'Both pushes add together, so the ball goes between them, not outside them.'}];
    const pushDirs=[a1+Math.PI,a2+Math.PI];const pick=[cand[0]];if(pushDirs.some(q=>dist(q,ar)<0.6))continue;for(const c of R.shuffle(cand.slice(1))){if(pick.every(p=>dist(p.a,c.a)>0.6)&&pushDirs.every(q=>dist(q,c.a)>0.6))pick.push(c);if(pick.length===3)break;}if(pick.length<3)continue;
    const cx=190,cy=160,rr=34;let b=C(cx,cy,rr,'ball3');[[a1,m1],[a2,m2]].forEach(([a,m])=>{const L1=40+30*m;const sx=cx-(rr+L1+8)*Math.cos(a),sy=cy-(rr+L1+8)*Math.sin(a),ex=cx-(rr+6)*Math.cos(a),ey=cy-(rr+6)*Math.sin(a);b+=L(sx,sy,ex-8*Math.cos(a),ey-8*Math.sin(a),'push')+head(ex,ey,a,14,'ink-fill');});
    const labs=R.shuffle(['A','B','C']);const opt=pick.map((p,i)=>({label:labs[i],a:p.a,c:!!p.c,n:p.n}));opt.forEach(o=>{const ex=cx+(rr+70)*Math.cos(o.a),ey=cy+(rr+70)*Math.sin(o.a);b+=L(cx+(rr+6)*Math.cos(o.a),cy+(rr+6)*Math.sin(o.a),ex-7*Math.cos(o.a),ey-7*Math.sin(o.a),'opt')+head(ex,ey,o.a,11,'acc-f')+T(cx+(rr+90)*Math.cos(o.a),cy+(rr+90)*Math.sin(o.a)+6,o.label,'lbl-L');});
    const ans=opt.find(o=>o.c).label;const ch=['A','B','C'].map(l=>{const o=opt.find(q=>q.label===l);return{t:'Direction '+l,key:l,note:o.c?null:o.n};});
    return mk({type:'forces',sub:'Combining forces',diff,stem:m1!==m2?'Two people push the ball in the directions shown; the longer arrow is the harder push. Which way is the ball most likely to go?':'Two people push the ball equally hard in the directions shown. Which way is the ball most likely to go?',
      svg:svgWrap(380,330,b,'ball pushed from two directions with three possible paths'),choices:ch,answer:ans,
      explain:`Two pushes combine. The ball goes in between the two push directions${m1!==m2?', leaning toward the harder push':', exactly halfway when they are equal'}: direction ${ans}.`,params:{a1,a2,m1,m2,opts:opt.map(o=>({label:o.label,a:o.a}))}});}
  throw new Error('forces');
}

/* ---------- mirror clock ---------- */
function clockSvg(h,m,ox,oy,flipX,lab){const cx=ox+60,cy=oy+60,r=50;let b=C(cx,cy,r+6,'clockcase')+C(cx,cy,r,'clockface');for(let k=0;k<12;k++){const a=k*Math.PI/6,l=k%3?5:10;b+=L(cx+(r-2)*Math.sin(a),cy-(r-2)*Math.cos(a),cx+(r-2-l)*Math.sin(a),cy-(r-2-l)*Math.cos(a),k%3?'ink-thin':'ink');}
  b+=Poly([[cx,cy-r+14],[cx-5,cy-r+23],[cx+5,cy-r+23]],'ink-fill');const s=flipX?-1:1;const ha=(h%12+m/60)*Math.PI/6,ma=m*Math.PI/30;
  b+=L(cx,cy,cx+s*26*Math.sin(ha),cy-26*Math.cos(ha),'hourhand')+L(cx,cy,cx+s*40*Math.sin(ma),cy-40*Math.cos(ma),'minhand')+C(cx,cy,3.5,'dot');if(lab)b+=T(cx,oy+140,lab,'lbl-L');return b;}
function genMirrorClock(seed,diff){
  const R=RNG(seed);for(let att=0;att<100;att++){const h=R.int(1,11),m=R.pick([5,10,15,20,25,35,40,45,50,55]);const hd=((h%12)*30+m/2)%360,md=m*6;const nearV=a=>Math.min(a%180,180-a%180)<18;if(nearV(hd)||nearV(md))continue;const df=Math.abs(hd-md)%360;if(Math.min(df,360-df)<40)continue;
    const kinds=R.shuffle(['mirror','same','swap']);let b=clockSvg(h,m,120,0,false,'')+T(180,138,'the clock','lbl-s');const opts=[];
    kinds.forEach((k,i)=>{const ox=10+i*130,oy=160;if(k==='mirror')b+=clockSvg(h,m,ox,oy,true,LET[i]);else if(k==='same')b+=clockSvg(h,m,ox,oy,false,LET[i]);else{const mh=Math.round(((h%12)+m/60)*5)%60,nh=Math.floor(m/5)||12;b+=clockSvg(nh,mh,ox,oy,true,LET[i]);}opts.push({label:LET[i],k});});
    const ans=LET[kinds.indexOf('mirror')];const ch=noteAll(FIGC('Picture',['A','B','C']),ans,k=>{const kk=kinds[LET.indexOf(k)];return kk==='same'?'That’s the clock itself. A mirror swaps left and right.':'The hands are swapped: the short hour hand and long minute hand trade places. A mirror only flips left and right.';});
    return mk({type:'mirrorclock',sub:'Mirror images',diff,stem:'The clock at the top is held up to a mirror. Which picture shows what you see in the mirror?',svg:svgWrap(400,310,b,'a clock and three possible mirror images'),choices:ch,answer:ans,
      explain:`A mirror flips left and right but not up and down. The 12 stays at the top, and each hand swings to the same angle on the other side. Picture ${ans} shows that.`,params:{h,m,kinds}});}
  throw new Error('clock');
}

/* ---------- centrifugal pump ---------- */
function genVolute(seed,diff){
  const R=RNG(seed);const mode=diff===1?'inlet':R.pick(['inlet','spin']);const outCW=R.chance(.5);const cx=180,cy=150,r=78;let b='';
  const pts=[];for(let k=0;k<=40;k++){const t=k/40*2*Math.PI;const rr=r*(0.82+0.18*k/40);pts.push([cx+rr*Math.cos((outCW?1:-1)*t-Math.PI/2),cy+rr*Math.sin((outCW?1:-1)*t-Math.PI/2)]);}
  b+=Path(pts,'volute');const top=[cx,cy-r];const sg=outCW?1:-1;b+=Rect(sg>0?cx:cx-100,cy-r-2,100,24,'pipe')+Rect(sg>0?cx+96:cx-104,cy-r-8,8,36,'metal');
  const labOut=R.chance(.5)?'A':'B',labIn=labOut==='A'?'B':'A';b+=T(sg>0?cx+118:cx-118,cy-r+16,labOut,'lbl-L');
  b+=Rect(cx-150,cy-12,150,24,'pipe')+C(cx,cy,26,'hubring')+C(cx,cy,5,'dot')+Rect(cx-156,cy-18,8,36,'metal')+T(cx-172,cy+6,labIn,'lbl-L');
  /* motion: the impeller turns the way the casing spirals out toward the outlet */
  let vn='';for(let k=0;k<6;k++){const a=k*Math.PI/3;vn+=`<path class="vane" d="M${P(cx+30*Math.cos(a))} ${P(cy+30*Math.sin(a))} Q${P(cx+48*Math.cos(a+sg*0.3))} ${P(cy+48*Math.sin(a+sg*0.3))} ${P(cx+62*Math.cos(a+sg*0.6))} ${P(cy+62*Math.sin(a+sg*0.6))}"/>`;}b+=mvg(aRot(cx,cy,sg*0.8),vn);
  b+=ground(60,300,cy+r+26)+Poly([[cx-50,cy+r+26],[cx-30,cy+r-6],[cx+30,cy+r-6],[cx+50,cy+r+26]],'metal');
  if(mode==='inlet'){const ans=labIn;const ch=noteAll([{t:'Pipe A',key:'A'},{t:'Pipe B',key:'B'},{t:'Either pipe',key:'same'}],ans,k=>k==='same'?'This pump only works one way: in at the center, out at the rim.':'That pipe leaves along the rim; it’s where the spun-out water leaves.');
    return mk({type:'volute',sub:'Pumps & check valves',diff,stem:'Through which pipe does water enter this spinning-impeller pump?',svg:svgWrap(360,cy+r+36,b,'centrifugal pump with two pipes'),choices:ch,answer:ans,
      explain:'A centrifugal pump flings water outward from its spinning center. Water is drawn in at the center (the eye) and pushed out through the pipe on the rim.',params:{mode,labIn,outCW}});}
  const ans=outCW?'cw':'ccw';const ch=[{t:'Clockwise',key:'cw'},{t:'Counterclockwise',key:'ccw'},{t:'Either way works the same',key:'same'}];noteAll(ch,ans,k=>k==='same'?'The casing spirals out toward the outlet in one direction only.':'The water would be flung toward the closed end of the spiral, away from the outlet.');
  return mk({type:'volute',sub:'Pumps & check valves',diff,stem:'Water enters this pump at the center and leaves through the pipe at the top. Which way must the impeller spin?',svg:svgWrap(360,cy+r+36,b,'centrifugal pump with a spiral casing'),choices:ch,answer:ans,
    explain:`The spinning water is flung around the casing and out along the spiral, which widens toward the outlet. The outlet pipe leads off ${outCW?'to the right from the top, so the water must travel clockwise':'to the left from the top, so the water must travel counterclockwise'}.`,params:{mode,outCW}});
}

/* ---------- liquids settling ---------- */
const LIQ={oil:{d:0.92,cls:'oil',name:'OIL'},water:{d:1.0,cls:'water',name:'WATER'},syrup:{d:1.35,cls:'syrup',name:'SYRUP'}};
function genLayers(seed,diff){
  const R=RNG(seed);const three=diff>=3||(diff===2&&R.chance(0.4));const names=three?['oil','water','syrup']:R.pick([['oil','water'],['water','syrup'],['oil','syrup']]);
  const right=names.slice().sort((a,b)=>LIQ[a].d-LIQ[b].d);// top to bottom
  const cands=[{k:'right',o:right},{k:'rev',o:right.slice().reverse()}];if(three){cands.push({k:'swap',o:[right[1],right[0],right[2]]},{k:'swap2',o:[right[0],right[2],right[1]]});}else cands.push({k:'mixed',o:null});
  const pick=[cands[0],...R.shuffle(cands.slice(1)).slice(0,2)];const order=R.shuffle(pick);let b='';
  order.forEach((c,i)=>{const ox=20+i*140,top=70,bot=250;b+=`<path class="bottle" d="M${ox+40} ${top-30} V${top-10} Q${ox} ${top} ${ox} ${top+30} V${bot} H${ox+100} V${top+30} Q${ox+100} ${top} ${ox+60} ${top-10} V${top-30} Z"/>`;
    if(c.o){const hh=(bot-top-20)/c.o.length;c.o.forEach((l,j)=>{const y=top+20+j*hh;b+=Rect(ox+2,y,96,hh,LIQ[l].cls)+T(ox+50,y+hh/2+5,LIQ[l].name,'lbl-xs');});}
    else{b+=Rect(ox+2,top+20,96,bot-top-20,'mixliq');for(let k=0;k<40;k++)b+=C(ox+8+((k*37)%84),top+28+((k*53)%(bot-top-36)),3,'bubble');b+=T(ox+50,(top+bot)/2,names.map(n=>LIQ[n].name).join(' & '),'lbl-xs');}
    b+=T(ox+50,bot+26,LET[i],'lbl-L');});
  const ans=LET[order.findIndex(c=>c.k==='right')];
  const ch=noteAll(FIGC('Picture',['A','B','C']),ans,k=>{const c=order[LET.indexOf(k)];return c.k==='mixed'?'These liquids don’t stay mixed; left standing, they separate.':'A heavier liquid sinks below a lighter one. This order has a heavier liquid on top.';});
  return mk({type:'layers',sub:'Floating & density',diff,stem:`Which picture shows how ${names.map(n=>LIQ[n].name.toLowerCase()).join(' and ')} settle after standing for a while?`,svg:svgWrap(440,290,b,'bottles with layers of liquid'),choices:ch,answer:ans,
    explain:`Liquids that don’t mix settle by weight: the heaviest at the bottom, the lightest on top. From top to bottom: ${right.map(n=>LIQ[n].name.toLowerCase()).join(', ')}.`,params:{names,order:order.map(c=>c.o)}});
}

Object.assign(CGENS,{towers:genTowers,inertia:genInertia,ring:genRing,seesaw:genSeesawMove,prop:genProp,carry:genCarry,chainhold:genChainHold,diffwinch:genDiffWinch,ratchet:genRatchet,cups:genCups,tracks:genTracks,float:genFloat,siphon:genSiphon,forces:genForces,mirrorclock:genMirrorClock,volute:genVolute,layers:genLayers});

/* ================= expert-level (multi-step) versions ================= */
function genGearSpeed4(seed){
  const R=RNG(seed),m=3.0,a=0.95*m,TT=[12,15,16,18,20,24,30,32,36,40,45,48],RPM=[30,40,45,60,80,90,100,120,150,180,240];
  for(let att=0;att<5000;att++){const t1=R.pick(TT),t2=R.pick(TT);if(t1===t2||Math.max(t1,t2)/Math.min(t1,t2)>3)continue;const rpm=R.pick(RPM);const ans=rpm*t1/t2,inv=rpm*t2/t1;if(!isInt(ans)||!isInt(inv)||ans===inv)continue;
    const nI=R.int(1,2);const ids=[];for(let k=0;k<nI;k++)ids.push(R.pick(TT.filter(t=>t<=30&&t!==t1&&t!==t2)));const cw=R.chance(.5);
    const teeth=[t1,...ids,t2];const gs=teeth.map(n=>({n,r:n*m/2}));const maxR=Math.max(...gs.map(g=>g.r));const cy=40+maxR+a;let x=30+gs[0].r+a;
    gs.forEach((g,i)=>{if(i>0)x+=gs[i-1].r+g.r;g.x=x;g.y=cy;});const W=x+gs[gs.length-1].r+a+30;if(W>640)continue;gs[0].phase=R.f()*6.283;for(let i=1;i<gs.length;i++)meshPhase(gs[i-1],gs[i]);
    const ly=cy+maxR+a+22;let b='';gs.forEach((g,i)=>{const last=i===gs.length-1,nm=i===0?'A':last?'B':'Idler';b+=drawGear(g,m,nm==='Idler'?'':nm)+T(g.x,ly,nm==='Idler'?'Idler':'Gear '+nm,'lbl-b')+T(g.x,ly+17,g.n+' teeth','lbl');
      if(i===0)b+=T(g.x,ly+34,rpm+' rpm','lbl-acc');if(last)b+=T(g.x,ly+34,'? rpm','lbl-acc');});
    b+=arcArrow(gs[0].x,gs[0].y,gs[0].r+a+10,-Math.PI/2-0.5,1.2,cw);
    const same=teeth.length%2===1;const dB=same?(cw?'cw':'ccw'):(cw?'ccw':'cw');const opp=dB==='cw'?'ccw':'cw';const word=d=>d==='cw'?'clockwise':'counterclockwise';
    const ch=[{t:`${ans} rpm ${word(dB)}`,key:`${ans}|${dB}`},{t:`${ans} rpm ${word(opp)}`,key:`${ans}|${opp}`,note:`Right speed, wrong direction. Count the gears: ${teeth.length} in a row, so B turns ${same?'the same way as':'opposite to'} A.`},{t:`${inv} rpm ${word(dB)}`,key:`${inv}|${dB}`,note:'Flipped the ratio. The gear with more teeth turns slower.'}];
    return mk({type:'gearSpeed',sub:'Gear speed',diff:4,stem:`Gear A has ${t1} teeth and turns at ${rpm} rpm in the direction of the arrow. It drives ${nI===1?'an idler':'two idlers'}, which drive${nI===1?'s':''} gear B with ${t2} teeth. How fast, and which way, does gear B turn?`,
      svg:svgWrap(W,ly+44,b,'gear train with idlers and tooth counts'),choices:R.shuffle(ch),answer:`${ans}|${dB}`,
      explain:`Speed: idlers cancel out, so only A and B matter. ${t1} × ${rpm} ÷ ${t2} = ${ans} rpm. Direction: every mesh flips it. ${teeth.length} gears in a row is ${same?'an odd':'an even'} count, so B turns ${word(dB)}.`,
      params:{t1,t2,ids,rpm,cw}});}
  throw new Error('gearSpeed4');
}
function genPulley4(seed){
  const R=RNG(seed);for(let att=0;att<2000;att++){const n=R.int(2,4),bw=R.pick([10,20,30,40]),Wt=R.pick([60,90,120,150,180,200,240,300,360]);const ans=(Wt+bw)/n,alt=Wt/n;if(!isInt(ans)||ans===Wt+bw)continue;
    const T0=tackleDraw(n,90,36,26,Wt);const W=Math.max(T0.span[1]+170,T0.right+40,300),H=T0.bottom+20;let b=ceiling(20,W-20,26)+T0.body+T(T0.span[1]+10,T0.movingY+30,`lower block: ${bw} lb`,'lbl-acc','start');
    if(!isInt(alt))continue;const list=[{v:ans},{v:alt,note:'Forgot that the lower block itself has to be lifted too.'},{v:alt+bw,note:'The block\u2019s weight is shared by the rope segments too, just like the load.'}];
    if(new Set(list.map(l=>l.v)).size<3||list.some(l=>!isFinite(l.v)))continue;
    return mk({type:'pulley',sub:'Pulleys & block and tackle',diff:4,stem:`The load weighs ${Wt} lb and the lower pulley block weighs ${bw} lb. What force at the pull end holds everything still? (Ignore friction.)`,
      svg:svgWrap(W,H,b,'block and tackle with a heavy lower block'),choices:numChoices(list,'lb'),answer:ans,
      explain:`The rope segments hold up the load and the lower block together: ${Wt} + ${bw} = ${Wt+bw} lb. There are ${n} segments holding the lower block, so the pull is ${Wt+bw} ÷ ${n} = ${fmt(ans)} lb.`,
      params:{n,W:Wt,bw,h:0,rope:false,segs:T0.segs,ytop:T0.ytop,movingY:T0.movingY,span:T0.span}});}
  throw new Error('pulley4');
}
function genLever4(seed){
  const R=RNG(seed),Ws=[10,15,20,25,30,40,50,60,80,100];
  for(let att=0;att<8000;att++){const f=R.int(4,6);const d1=R.int(1,f),d2=R.int(1,f);if(d1===d2)continue;const d3=R.int(1,10-f),d4=R.int(1,10-f);if(d3===d4)continue;
    const W1=R.pick(Ws),W2=R.pick(Ws),W3=R.pick(Ws);const net=W1*d1+W2*d2-W3*d3;if(net<=0)continue;const ans=net/d4;if(!isInt(ans)||ans>300)continue;
    const forgot=(W1*d1+W2*d2)/d4,naive=W1+W2-W3;if(!isInt(forgot)||naive<=0||new Set([ans,forgot,naive]).size<3)continue;
    const flip=R.chance(.5);const P0=p=>flip?10-p:p;const fp=P0(f);const kn=[{w:W1,pos:P0(f-d1)},{w:W2,pos:P0(f-d2)},{w:W3,pos:P0(f+d3)}];const up=P0(f+d4);
    const s=48,bx=40,by=112,X=p=>bx+p*s;let body=Rect(bx-6,by,10*s+12,10,'beam',2);for(let i=0;i<=10;i++)body+=L(X(i),by+10,X(i),by+15,'dim');
    body+=Poly([[X(fp),by+10],[X(fp)-18,by+52],[X(fp)+18,by+52]],'fulcrum')+ground(X(fp)-44,X(fp)+44,by+52);
    kn.forEach(k=>{const hgt=26+Math.min(14,k.w/10);body+=Rect(X(k.pos)-23,by-hgt,46,hgt,'load',2)+T(X(k.pos),by-hgt/2+5,k.w+' lb','lbl-sb');});
    body+=Rect(X(up)-23,by-32,46,32,'unknown',2)+T(X(up),by-11,'?','lbl-q');
    const items=[...kn.map(k=>k.pos),up].map(p=>({pos:p,lab:Math.abs(p-fp)+' ft'}));const used={l:0,r:0},rowY=[by+74,by+96];
    items.sort((a,b)=>Math.abs(a.pos-fp)-Math.abs(b.pos-fp)).forEach(d=>{const side=d.pos<fp?'l':'r';body+=hdim(Math.min(X(d.pos),X(fp)),Math.max(X(d.pos),X(fp)),rowY[used[side]++]+14,d.lab);});
    return mk({type:'lever',sub:'Levers & balance',diff:4,stem:'The beam weighs nothing and rests on the fulcrum. How much weight must go at the “?” to balance the beam?',
      svg:svgWrap(10*s+80,by+124,body,'lever with weights on both sides'),answer:ans,
      choices:numChoices([{v:ans},{v:forgot,note:`Forgot the ${W3}-lb weight already on the same side as the “?”. It helps balance, so less is needed.`},{v:naive,note:'Added and subtracted weights without their distances. Each weight counts as weight × distance.'}],'lb'),
      explain:`Turning effect (weight × distance) must match on both sides. Side with two weights: ${W1} × ${d1} + ${W2} × ${d2} = ${W1*d1+W2*d2}. The other side already has ${W3} × ${d3} = ${W3*d3}, leaving ${net} for the “?”. ${net} ÷ ${d4} = ${ans} lb.`,
      params:{f:fp,known:kn,unknown:up}});}
  throw new Error('lever4');
}
function genHydraulic4(seed){
  const R=RNG(seed);const d=R.pick([1,2,3]),k=R.pick([2,3,4]),D=d*k;const X=R.pick([4,8,12,16,18,27,32,36,48].filter(x=>x%(k*k)===0));
  const ws=24,wl=ws*k,xs=40,xl=150,top=70,base=250,lvl=120;let b=Rect(xs,lvl,ws,base-lvl,'fluid')+Rect(xl,lvl,wl,base-lvl,'fluid')+Rect(xs,base-28,xl+wl-xs,28,'fluid');
  b+=`<path class="ink" d="M${xs} ${top} V${base} H${xl+wl} V${top} M${xs+ws} ${top} V${base-28} H${xl} V${top}"/>`+Rect(xs+1,lvl-12,ws-2,12,'metal')+Rect(xl+1,lvl-12,wl-2,12,'metal')+L(xs+ws/2,lvl-12,xs+ws/2,lvl-44,'rod')+L(xl+wl/2,lvl-12,xl+wl/2,lvl-44,'rod');
  b+=T(xs+ws/2,base+20,`${d} in. dia.`,'lbl-s')+T(xl+wl/2,base+20,`${D} in. dia.`,'lbl-s')+arrow(xs+ws/2,lvl-92,xs+ws/2,lvl-48)+T(xs+ws/2+10,lvl-80,X+' in.','lbl-acc','start')+arrow(xl+wl/2,lvl-48,xl+wl/2,lvl-90)+T(xl+wl/2+10,lvl-78,'? in.','lbl-acc','start');
  const ans=X/(k*k);
  return mk({type:'hydraulic',sub:'Hydraulics',diff:4,stem:`The ${d}-inch piston is pushed down ${X} in. How far does the ${D}-inch piston rise?`,svg:svgWrap(xl+wl+60,base+32,b,'hydraulic press with two pistons'),answer:ans,
    choices:numChoices([{v:ans},{v:X/k,note:'Used the diameter ratio. The oil pushed out spreads over the area, which goes with diameter squared.'},{v:X,note:'The same amount of oil spreads over a much bigger piston, so it rises less.'}],'in.'),
    explain:`The oil pushed out of the small cylinder fills the big one. The big piston has (${D} ÷ ${d})² = ${k*k} times the area, so it rises ${X} ÷ ${k*k} = ${fmt(ans)} in. It pushes ${k*k} times harder but moves ${k*k} times less.`,
    params:{d,D,mode:'dist',value:X}});
}
function genSprings4(seed){
  const R=RNG(seed);for(let att=0;att<2000;att++){const s=R.pick([1,2,3]),w0=R.pick([5,10]),n=R.pick([2,3]),arr=R.pick(['series','parallel']);const Wl=w0*n*R.int(1,4);
    const Tot=arr==='series'?n*Wl*s/w0:Wl*s/(n*w0);if(!isInt(Tot))continue;const one=Tot*w0/s,other=arr==='series'?n*Tot*w0/s:Tot*w0/(n*s);if(!isInt(other)||new Set([Wl,one,other]).size<3)continue;
    const Dd=drawSprings(90,arr,n,'?','');
    return mk({type:'springs',sub:'Springs',diff:4,stem:`Each spring stretches ${s} in. when ${w0} lb hangs from it. The springs are identical and weigh nothing. The whole setup stretches ${fmt(Tot)} in. How heavy is the weight?`,
      svg:svgWrap(180,Dd.h,Dd.b,`${n} springs in ${arr}`),answer:Wl,
      choices:numChoices([{v:Wl},{v:one,note:'Treated the whole setup like one spring.'},{v:other,note:arr==='series'?'Mixed up series and parallel. End to end, each spring carries the whole weight and the stretches add.':'Mixed up series and parallel. Side by side, the springs share the weight.'}],'lb'),
      explain:arr==='series'?`End to end, each spring carries the whole weight and the stretches add. Each spring stretches ${fmt(Tot)} ÷ ${n} = ${fmt(Tot/n)} in., which takes ${fmt(Tot/n)} ÷ ${s} × ${w0} = ${Wl} lb.`:`Side by side, all ${n} springs stretch the full ${fmt(Tot)} in. Each then holds ${fmt(Tot)} ÷ ${s} × ${w0} = ${fmt(Wl/n)} lb, so the weight is ${n} × ${fmt(Wl/n)} = ${Wl} lb.`,
      params:{mode:'weight',arr,n,s,w0,T:Tot}});}
  throw new Error('springs4');
}
function genBike4(seed){
  const R=RNG(seed);const F=[24,28,32,36,40,44,48,52],Rr=[11,12,14,16,18,21,24,28],CAD=[48,56,60,63,70,72,80,84,90,96];
  for(let att=0;att<3000;att++){const bikes=[0,1,2].map(()=>({f:R.pick(F),r:R.pick(Rr)}));const rs=bikes.map(x=>x.f/x.r).sort((a,b)=>a-b);if(rs[1]/rs[0]<1.12||rs[2]/rs[1]<1.12)continue;
    const ti=R.int(0,2),bk=bikes[ti],cad=R.pick(CAD);const ans=cad*bk.f/bk.r,inv=cad*bk.r/bk.f;if(!isInt(ans)||!isInt(inv)||ans===cad||inv===cad)continue;
    let b='';bikes.forEach((x,i)=>{const y=58+i*112,fr={x:92,y,r:x.f*0.78},rr={x:300,y,r:x.r*0.78};b+=C(300,y,50,'tire')+C(300,y,44,'ink-thin');for(const l of beltLines(fr,rr,false))b+=L(l[0],l[1],l[2],l[3],'chainline');
      b+=C(fr.x,y,fr.r,'sprocket')+C(rr.x,y,rr.r,'sprocket')+C(300,y,3,'dot')+T(22,y+6,LET[i],'lbl-L')+T(362,y-3,`front ${x.f}T`,'lbl-s','start')+T(362,y+15,`rear ${x.r}T`,'lbl-s','start');});
    return mk({type:'bike',sub:'Chain drives & bike gears',diff:4,stem:`The rider of bike ${LET[ti]} pedals at ${cad} rpm. How fast does that bike’s rear wheel turn?`,svg:svgWrap(460,350,b,'three bicycle chain drives'),answer:ans,
      choices:numChoices([{v:ans},{v:inv,note:'Flipped the ratio. A big front sprocket driving a small rear one speeds the wheel up.'},{v:cad,note:'The chain links sprockets of different sizes, so the wheel doesn’t turn at the pedal speed.'}],'rpm'),
      explain:`Teeth × rpm is the same at both sprockets. ${bk.f} × ${cad} ÷ ${bk.r} = ${fmt(ans)} rpm at the rear wheel. Only bike ${LET[ti]} matters; the others are distractions.`,
      params:{mode:'num',target:LET[ti],cad,bikes:bikes.map((x,i)=>({label:LET[i],f:x.f,r:x.r}))}});}
  throw new Error('bike4');
}

/* ================= test assembly ================= */
const MECH_PLAN=[['gearDir',2],['gearSpeed',2],['beltDir',1],['beltSpeed',1],['lever',1],['ramp',1],['hydraulic',1],['springs',1],['pressure',1],['wheel',1],['stability',1],['circuit',1],
  ['guy',1],['bridge',1],['flywheel',1],['turn',1],['gate',1],['jet',1],['tackle',1],['pump',1],['chain',1],['sag',1],['rack',1],['bike',1],['winch',1],['boat',1],['linkage',1],['gearpump',1],['bracket',1],
  ['belttrain',1],['barrow',1],['capacity',1],['surface',1],['holes',1],['disk',1],['break',1],['steelyard',1],['throw',1],['mix',1],['winder',1],['ice',1]];
const CONCEPT_TYPES=['guy','bridge','flywheel','turn','gate','jet','tackle','pump','chain','sag','rack','bike','winch','boat','linkage','gearpump','bracket','belttrain','barrow','capacity','surface','holes','disk','break','steelyard','throw','mix','winder','ice','towers','inertia','ring','seesaw','prop','carry','chainhold','diffwinch','ratchet','cups','tracks','float','siphon','forces','mirrorclock','volute','layers'];
const GENS=Object.assign({},CGENS,{gearDir:genGearDir,gearSpeed:genGearSpeed,beltDir:genBeltDir,beltSpeed:genBeltSpeed,pulley:genPulley,lever:genLever,ramp:genRamp,hydraulic:genHydraulic,springs:genSprings,pressure:genPressure,wheel:genWheel,stability:genStability,circuit:genCircuit});
/* ================= number-free versions: no quantities printed, no arithmetic needed ================= */
const QTXT=/<text[^>]*>[^<]*(?:\d\s*(?:lb|lbs|in\.?|ft|rpm|teeth|T)\b|\?\s*(?:lb|in\.|rpm|ft))[^<]*<\/text>/g;
function deNum(svg){return svg.replace(QTXT,'');}
function withDeNum(g){return function(seed,diff){const it=g(seed,diff);it.svg=deNum(it.svg);return it;};}

/* ---- gear speed: which gear turns faster, judged from the gear sizes ---- */
function genGearSpeedQ(seed,diff){
  const R=RNG(seed),m=3.2,a=0.95*m,TT=[12,15,16,18,20,24,30,32,36,40,48],ID=[12,15,16,18,20,24];
  const ask=R.pick(['faster','slower']);const nId=diff<=1?0:diff===2?1:diff===3?1:2;let t1,t2,ids;
  for(let att=0;;att++){if(att>4000)throw new Error('gearSpeedQ');
    t1=R.pick(TT);if(R.chance(0.22))t2=t1;else{t2=R.pick(TT);if(t2===t1||Math.max(t1,t2)/Math.min(t1,t2)<1.3||Math.max(t1,t2)/Math.min(t1,t2)>3)continue;}
    ids=[];for(let i=0;i<nId;i++)ids.push(R.pick(ID));if(nId===2&&ids[0]===ids[1])continue;
    if(nId&&ids.some(t=>t===t1&&t===t2))continue;break;}
  const gs=[t1].concat(ids,[t2]).map(n=>({n}));gs.forEach(g=>g.r=g.n*m/2);
  const maxR=Math.max(...gs.map(g=>g.r));const cy=38+maxR+a;let x=30+gs[0].r+a;
  gs.forEach((g,i)=>{if(i>0)x+=gs[i-1].r+g.r;g.x=x;g.y=cy;});gs[0].phase=R.f()*6.283;for(let i=1;i<gs.length;i++)meshPhase(gs[i-1],gs[i]);
  const W=x+gs[gs.length-1].r+a+30,ly=cy+maxR+a+22;let body='';
  gs.forEach((g,i)=>{const nm=i===0?'A':i===gs.length-1?'B':'';body+=drawGear(g,m,nm);body+=T(g.x,ly,nm?'Gear '+nm:'Idler','lbl-b');});
  body+=arcArrow(gs[0].x,gs[0].y,gs[0].r+a+10,-Math.PI/2-0.5,1.2,true);
  const smallerA=t1<t2;const ans=t1===t2?'same':(ask==='faster'?(smallerA?'A':'B'):(smallerA?'B':'A'));
  const wrongNote='Meshed gears pass the same amount of rim along each minute. The gear with fewer teeth (the smaller one) has to spin more times to keep up.';
  const stem=`Gear A is turned by hand${nId?` and drives gear B through ${nId===1?'an idler gear':'two idler gears'}`:' and drives gear B'}. Which gear turns ${ask==='faster'?'faster (more turns per minute)':'slower (fewer turns per minute)'}?`;
  return mk({type:'gearSpeed',sub:'Gear speed',diff,stem,svg:svgWrap(W,ly+14,body,'gear train'),answer:ans,
    choices:cmpChoices('Gear','Both turn at the same speed',{A:wrongNote,B:wrongNote,same:t1===t2?'':'The two gears are different sizes, so they can’t turn at the same speed.'}),
    explain:ans==='same'?'Gears A and B are the same size, so they turn at the same speed. An idler only changes the direction, never the speed.':`The smaller gear has fewer teeth, so it turns more times for each turn of the bigger gear.${nId?' The idler gear only changes the direction; it never changes the speed, so only the sizes of A and B matter.':''} Gear ${smallerA?'A':'B'} is the smaller one, so it turns faster and gear ${smallerA?'B':'A'} turns slower.`,
    params:{t1,t2,ids,ask,rpm:null}});
}

/* ---- belt and pulley speed ---- */
function genBeltSpeedQ(seed,diff){
  const R=RNG(seed),D=[4,5,6,8,10,12,15,16];const ask=R.pick(['faster','slower']);const eq=R.chance(diff===1?0.2:0.25);
  let dA=R.pick(D),dB;if(eq)dB=dA;else{const gap=diff<=2?1.5:1.25;do{dB=R.pick(D);}while(Math.max(dA,dB)/Math.min(dA,dB)<gap);}
  const ps=[{d:dA},{d:dB}];const k=4;ps.forEach(p=>p.r=p.d*k);const cy=40+Math.max(ps[0].r,ps[1].r);ps[0].x=40+ps[0].r;ps[0].y=cy;ps[1].x=ps[0].x+ps[0].r+ps[1].r+R.int(90,140);ps[1].y=cy;
  const ly=cy+Math.max(ps[0].r,ps[1].r)+18,W=ps[1].x+ps[1].r+40;let body='';
  /* motion: A turns clockwise, the open belt turns B the same way at the same rim speed (w ∝ 1/r) */
  const wQ=[0.7,0.7*ps[0].r/ps[1].r];
  for(const l of beltLines(ps[0],ps[1],false))body+=mvg(beltFlow(l,ps[0],wQ[0]),L(l[0],l[1],l[2],l[3],'belt'));
  ps.forEach((p,i)=>{body+=mvg(aRot(p.x,p.y,wQ[i]),drawPulleyWheel(p))+T(p.x,p.y+5,LET[i],'glbl');});
  const ans=eq?'same':((dA<dB)===(ask==='faster')?'A':'B');
  const note='The belt moves the same length past both rims. The smaller pulley has a shorter rim, so it turns more times to keep up.';
  return mk({type:'beltSpeed',sub:'Belt & pulley speed',diff,stem:`Pulleys A and B are connected by a belt that does not slip. Which pulley turns ${ask==='faster'?'faster (more turns per minute)':'slower (fewer turns per minute)'}?`,
    svg:svgWrap(W,ly+4,body,'two belted pulleys'),answer:ans,
    choices:cmpChoices('Pulley','Both turn at the same speed',{A:note,B:note,same:'Equal speed only happens when the pulleys are the same size.'}),
    explain:eq?'Both pulleys are the same size, so each turn of one is one turn of the other.':`The belt moves the same length at both rims. The smaller pulley has a shorter rim, so it must turn more times to keep up. Pulley ${dA<dB?'A':'B'} is the smaller one, so it turns faster and pulley ${dA<dB?'B':'A'} turns slower.`,params:{dA,dB,rpm:null,ask}});
}

/* ---- levers: same load, which needs less effort ---- */
function leverRow(y0,cfg,label,s,deg){let b='';const bx=50,by=y0+72,Lb=cfg.L*s;const fx=bx+cfg.f*s,tl=x=>deg?MV(`tilt:${P(fx)},${by+10},${R2(deg)}`,x):x;
  b+=tl(Rect(bx,by,Lb,10,'beam',2)+Array.from({length:cfg.L+1},(_,i)=>L(bx+i*s,by+10,bx+i*s,by+15,'dim')).join(''));
  b+=Poly([[fx,by+10],[fx-17,by+50],[fx+17,by+50]],'fulcrum')+ground(fx-42,fx+42,by+50);
  const lx=bx+cfg.p*s;const ex=bx+Lb;b+=tl(Rect(lx-22,by-38,44,38,'load',2)+T(lx,by-14,'Load','lbl-sb')+arrow(ex,by-52,ex,by-6));b+=T(ex,by-58,'Effort','lbl-acc');
  b+=T(10,by+6,label,'lbl-L','start');return b;}
function genLeverQ(seed,diff){
  const R=RNG(seed);const ask=R.pick(['less','more']);const s=34;
  const mkc=()=>{const L=R.int(6,10),p=diff>=4?R.int(0,2):0,f=R.int(p+1,L-1);return{L,p,f};};
  const ratio=c=>(c.f-c.p)/(c.L-c.f);let A,B;
  const tie=diff>=3&&R.chance(0.28);
  for(let att=0;;att++){if(att>6000)throw new Error('leverQ');A=mkc();B=mkc();if(A.L===B.L&&A.f===B.f&&A.p===B.p)continue;
    if(diff===1){B.L=A.L;B.p=0;A.p=0;B.f=R.int(1,A.L-1);if(A.f===B.f)continue;}
    const ra=ratio(A),rb=ratio(B);
    if(tie){if(Math.abs(ra-rb)>1e-9)continue;}else{if(Math.max(ra,rb)/Math.min(ra,rb)<1.45)continue;}
    break;}
  // animation: both effort ends pushed down, each beam turns the same angle about its fulcrum (biggest end travel ≤ 26 px)
  const arm=Math.max(A.f-A.p,A.L-A.f,B.f-B.p,B.L-B.f)*s,tdeg=Math.min(7,Math.asin(Math.min(1,26/arm))*180/Math.PI);
  const W=50+10*s+70;let body=leverRow(0,A,'A',s,tdeg)+leverRow(165,B,'B',s,tdeg);
  const ra=ratio(A),rb=ratio(B);const easier=Math.abs(ra-rb)<1e-9?'same':(ra<rb?'A':'B');const ans=easier==='same'?'same':(ask==='less'?easier:(easier==='A'?'B':'A'));
  const note=ask==='less'?'The lever with the pivot closer to the load gives more leverage, so it needs less effort. Compare the short side (load to pivot) against the long side (pivot to effort).':'The lever with the pivot farther from the load gives less leverage, so it needs more effort. Compare the short side (load to pivot) against the long side (pivot to effort).';
  return mk({type:'lever',sub:'Levers & balance',diff,stem:`Both levers lift the same load. Which lever needs ${ask==='less'?'less':'more'} effort at the arrow?`,
    svg:svgWrap(W,335,body,'two levers with the pivot in different places'),answer:ans,
    choices:cmpChoices('Lever',ask==='less'?'Both need the same effort':'Both need the same effort',{A:note,B:note,same:'The pivots sit in different spots on these levers, so the effort is different.'}),
    explain:ans==='same'?'These two levers have the same shape of leverage (the load side and effort side are in the same proportion), so the effort is the same even though the levers are different sizes.':`Effort gets smaller the closer the pivot is to the load and the farther it is from the effort. Lever ${easier} has the better leverage, so it needs less effort; lever ${easier==='A'?'B':'A'} needs more.`,
    params:{A:{load:A.f-A.p,eff:A.L-A.f},B:{load:B.f-B.p,eff:B.L-B.f},ask}});
}

/* ---- inclined planes: which ramp is easier ---- */
function genRampQ(seed,diff){
  const R=RNG(seed);const ask=R.pick(['less','more']);const s=20;const tie=diff>=3&&R.chance(0.25);let A,B;
  const sn=r=>r.h/Math.hypot(r.h,r.run);
  for(let att=0;;att++){if(att>6000)throw new Error('rampQ');A={h:R.int(1,5),run:R.int(2,10)};B={h:R.int(1,5),run:R.int(2,10)};
    if(A.h===B.h&&A.run===B.run)continue;if(A.h>=A.run*1.6||B.h>=B.run*1.6)continue;
    if(tie){const k=R.pick([0.5,1.5,2,3]);B={h:A.h*k,run:A.run*k};if(!isInt(B.h)||!isInt(B.run)||B.h>6||B.run>12||B.h<1)continue;}
    else{if(Math.abs(sn(A)-sn(B))<0.13)continue;}
    break;}
  const rows=[A,B];const hMax=Math.max(A.h,B.h);const rowH=hMax*s+56;let body='',maxX=0;
  rows.forEach((r,i)=>{const bY=24+hMax*s+i*rowH,x1=70,x2=x1+r.run*s,yt=bY-r.h*s;body+=Poly([[x1,bY],[x2,bY],[x2,yt]],'ramp')+ground(x1-20,x2+24,bY);
    const ang=Math.atan2(yt-bY,x2-x1),mx=x1+(x2-x1)*0.32,my=bY+(yt-bY)*0.32;body+=`<g transform="translate(${P(mx)} ${P(my)}) rotate(${P(ang*180/Math.PI)})">`+Rect(-12,-24,24,24,'crate',2)+'</g>';
    body+=T(x1-14,bY-6,LET[i],'lbl-q','end');maxX=Math.max(maxX,x2);});
  const gentler=Math.abs(sn(A)-sn(B))<1e-9?'same':(sn(A)<sn(B)?'A':'B');const ans=gentler==='same'?'same':(ask==='less'?gentler:(gentler==='A'?'B':'A'));
  const note=ask==='less'?'A steeper ramp takes more force. Compare how much each ramp rises for how far it runs, not just how tall it is or how long it is.':'A gentler ramp takes less force. Compare how much each ramp rises for how far it runs, not just how tall it is or how long it is.';
  return mk({type:'ramp',sub:'Inclined planes',diff,stem:`The same crate is pushed up each ramp. Ignoring friction, which ramp takes ${ask} force to push the crate up?`,
    svg:svgWrap(maxX+70,24+hMax*s+rowH+16,body,'two ramps of different steepness'),answer:ans,
    choices:cmpChoices('Ramp','The same force on both',{A:note,B:note,same:'These ramps are different steepness, so the force is different.'}),
    explain:ans==='same'?'The ramps are different sizes but the same steepness, so they take the same force.':`The gentler (less steep) ramp needs less force. Ramp ${gentler} rises less for the same distance along it, so it takes less push, and ramp ${gentler==='A'?'B':'A'} is steeper and takes more.`,
    params:{A:{h:A.h,run:A.run},B:{h:B.h,run:B.run},ask}});
}

/* ---- hydraulic presses ---- */
function pressDraw(ox,d,k,label,base,top){const ws=14*d,wl=ws*k,xs=ox,xl=ox+ws+34;let b='';const lv=112;
  b+=Rect(xs,lv,ws,base-lv,'fluid')+Rect(xl,lv,wl,base-lv,'fluid')+Rect(xs,base-26,xl+wl-xs,26,'fluid');
  b+=`<path class="ink" d="M${xs} ${top} V${base} H${xl+wl} V${top} M${xs+ws} ${top} V${base-26} H${xl} V${top}"/>`;
  b+=Rect(xs+1,lv-12,ws-2,12,'metal')+Rect(xl+1,lv-12,wl-2,12,'metal')+L(xs+ws/2,lv-12,xs+ws/2,lv-40,'rod')+L(xl+wl/2,lv-12,xl+wl/2,lv-40,'rod');
  b+=arrow(xs+ws/2,lv-84,xs+ws/2,lv-44)+arrow(xl+wl/2,lv-44,xl+wl/2,lv-84)+T(xs+ws/2,lv-92,'push','lbl-acc')+T(xl+wl/2,lv-92,'lifts','lbl-acc');
  b+=T(xs+(xl+wl-xs)/2,base+22,label,'lbl-b');return{b,w:xl+wl-ox};}
function genHydraulicQ(seed,diff){
  const R=RNG(seed);
  if(diff===1){const d=R.pick([1,2]),k=R.pick([2,3,4]);const smallIsA=R.chance(.5);const ws=24,wl=ws*k,xs=40,xl=150,top=70,base=250,lv=120;let body='';
    body+=Rect(xs,lv,ws,base-lv,'fluid')+Rect(xl,lv,wl,base-lv,'fluid')+Rect(xs,base-28,xl+wl-xs,28,'fluid');
    body+=`<path class="ink" d="M${xs} ${top} V${base} H${xl+wl} V${top} M${xs+ws} ${top} V${base-28} H${xl} V${top}"/>`;
    body+=Rect(xs+1,lv-12,ws-2,12,'metal')+Rect(xl+1,lv-12,wl-2,12,'metal')+L(xs+ws/2,lv-12,xs+ws/2,lv-44,'rod')+L(xl+wl/2,lv-12,xl+wl/2,lv-44,'rod');
    const nmS=smallIsA?'A':'B',nmL=smallIsA?'B':'A';body+=T(xs+ws/2,base+20,'Piston '+nmS,'lbl-b')+T(xl+wl/2,base+20,'Piston '+nmL,'lbl-b');
    body+=arrow(xs+ws/2,lv-92,xs+ws/2,lv-48)+T(xs+ws/2+10,lv-80,'push','lbl-acc','start');
    const ans=smallIsA?'B':'A';
    return mk({type:'hydraulic',sub:'Hydraulics',diff,stem:'A force pushes down on the small piston. The system is filled with oil. Which piston pushes with the greater force?',svg:svgWrap(xl+wl+60,base+48,body,'hydraulic press with two pistons'),answer:ans,
      choices:cmpChoices('Piston','Both push with the same force',{[smallIsA?'A':'B']:'The small piston is where the force goes in. The larger area multiplies it.',same:'The pressure is the same everywhere in the fluid, but force = pressure × area, so the bigger piston pushes harder.'}),
      explain:'Pressure is the same everywhere in the fluid. Force = pressure × area, so the wider piston, with more area, pushes with more force.',params:{mode:'compare',d:d,D:d*k,smallLabel:nmS}});}
  const ask=R.pick(['heavier','easier']);const tie=diff>=3&&R.chance(0.28);let a,b2;
  for(let att=0;;att++){if(att>500)throw new Error('hydQ');a={d:R.pick([1,2]),k:R.pick([2,3,4])};b2={d:R.pick([1,2]),k:R.pick([2,3,4])};if(a.d===b2.d&&a.k===b2.k)continue;
    if(tie){if(a.k!==b2.k)continue;if(a.d===b2.d)continue;}else{if(Math.max(a.k,b2.k)/Math.min(a.k,b2.k)<1.5)continue;}break;}
  const base=250,top=64;const PA=pressDraw(30,a.d,a.k,'Press A',base,top),PB=pressDraw(30+PA.w+70,b2.d,b2.k,'Press B',base,top);const W=30+PA.w+70+PB.w+40;
  const bigger=a.k===b2.k?'same':(a.k>b2.k?'A':'B');const ans=bigger;
  const stem=ask==='heavier'?'The same push is applied to the small piston of each press. Which press can lift the heavier load?':'Both presses must lift the same heavy load. Which press needs less push on its small piston?';
  const note='Compare how much wider the big piston is than the small piston in each press. The wider it is compared with the small one, the more the press multiplies your push.';
  return mk({type:'hydraulic',sub:'Hydraulics',diff,stem,svg:svgWrap(W,base+42,PA.b+PB.b,'two hydraulic presses'),answer:ans,
    choices:cmpChoices('Press',ask==='heavier'?'Both can lift the same load':'Both need the same push',{A:note,B:note,same:'The big piston is a different width compared with its small piston in these two presses.'}),
    explain:bigger==='same'?'Both presses have the same proportion of big piston to small piston, so they multiply the push by the same amount, even though the sizes differ.':`Force is multiplied by the area of the big piston compared with the small one. Press ${bigger} has the bigger difference in width, so it multiplies the push more: it lifts the heavier load and needs less push for the same load.`,
    params:{mode:'press',ks:[a.k,b2.k],ask}});
}

/* ---- springs: series and parallel, judged from the drawing ---- */
function sprSet(cfg,ox,label){const y0=24,len=48;let b='',y=y0;
  const hang=(x,yy)=>Rect(x-26,yy,52,34,'load',3);
  const bar=(x0,x1,yy)=>Rect(x0,yy,x1-x0,7,'metal',2);
  b+=ceiling(ox-40,ox+40,y0);
  if(cfg==='single'){b+=springPath(ox,y0,y0+len*2,6);y=y0+len*2;b+=hang(ox,y);return{b:b+T(ox,y+56,label,'lbl-b'),h:y+64};}
  if(cfg==='ser2'||cfg==='ser3'){const n=cfg==='ser2'?2:3,l=cfg==='ser2'?len:len*0.72;y=y0;for(let i=0;i<n;i++){b+=springPath(ox,y,y+l,4);y+=l;if(i<n-1)b+=C(ox,y,3,'dot');}b+=hang(ox,y);return{b:b+T(ox,y+56,label,'lbl-b'),h:y+64};}
  if(cfg==='par2'||cfg==='par3'){const n=cfg==='par2'?2:3,gap=36,x0=ox-(n-1)*gap/2;for(let i=0;i<n;i++)b+=springPath(x0+i*gap,y0,y0+len*2,6);y=y0+len*2;b+=bar(x0-14,x0+(n-1)*gap+14,y)+L(ox,y+7,ox,y+16,'strap');y+=16;b+=hang(ox,y);return{b:b+T(ox,y+56,label,'lbl-b'),h:y+64};}
  if(cfg==='parOfSer'){const gap=40,x0=ox-gap/2;for(let i=0;i<2;i++){b+=springPath(x0+i*gap,y0,y0+len,4)+C(x0+i*gap,y0+len,3,'dot')+springPath(x0+i*gap,y0+len,y0+len*2,4);}y=y0+len*2;b+=bar(x0-14,x0+gap+14,y)+L(ox,y+7,ox,y+16,'strap');y+=16;b+=hang(ox,y);return{b:b+T(ox,y+56,label,'lbl-b'),h:y+64};}
  {const gap=40,x0=ox-gap/2;for(let i=0;i<2;i++)b+=springPath(x0+i*gap,y0,y0+len,4);y=y0+len;b+=bar(x0-14,x0+gap+14,y);for(let i=0;i<2;i++)b+=springPath(x0+i*gap,y+7,y+7+len,4);y=y+7+len;b+=bar(x0-14,x0+gap+14,y)+L(ox,y+7,ox,y+16,'strap');y+=16;b+=hang(ox,y);return{b:b+T(ox,y+56,label,'lbl-b'),h:y+64};}
}
const SPR_TREE={single:'s',ser2:['S','s','s'],ser3:['S','s','s','s'],par2:['P','s','s'],par3:['P','s','s','s'],parOfSer:['P',['S','s','s'],['S','s','s']],serOfPar:['S',['P','s','s'],['P','s','s']]};
const SPR_STRETCH={single:1,ser2:2,ser3:3,par2:0.5,par3:1/3,parOfSer:1,serOfPar:1};
function genSpringsQ(seed,diff){
  const R=RNG(seed);const ask=R.pick(['farther','less']);
  const pool=diff===1?['ser2','par2']:diff===2?['single','ser2','par2','ser3','par3']:['single','ser2','par2','ser3','par3','parOfSer','serOfPar'];
  const tie=diff>=3&&R.chance(0.3);let A,B;
  for(let att=0;;att++){if(att>500)throw new Error('sprQ');A=R.pick(pool);B=R.pick(pool);if(A===B)continue;
    const same=Math.abs(SPR_STRETCH[A]-SPR_STRETCH[B])<1e-9;if(tie!==same)continue;break;}
  const SA=sprSet(A,90,'Setup A'),SB=sprSet(B,270,'Setup B');const H=Math.max(SA.h,SB.h);
  const more=Math.abs(SPR_STRETCH[A]-SPR_STRETCH[B])<1e-9?'same':(SPR_STRETCH[A]>SPR_STRETCH[B]?'A':'B');const ans=more==='same'?'same':(ask==='farther'?more:(more==='A'?'B':'A'));
  const note=ask==='farther'?'Springs end to end (in series) each carry the whole weight, so their stretches add up. Springs side by side (in parallel) share the weight, so they stretch less.':'Springs side by side (in parallel) share the weight, so they stretch less. Springs end to end (in series) each carry the whole weight, so their stretches add up.';
  return mk({type:'springs',sub:'Springs',diff,stem:`All the springs are identical and both weights are the same. Which setup stretches ${ask==='farther'?'farther':'less'}?`,
    svg:svgWrap(360,H,SA.b+SB.b,'two spring setups'),answer:ans,
    choices:cmpChoices('Setup','Both stretch the same amount',{A:note,B:note,same:'These two arrangements share the weight differently, so they don’t stretch the same.'}),
    explain:more==='same'?'The two arrangements are equally stiff: the extra springs added side by side make up for the extra springs added end to end, so they stretch the same amount.':`End to end (series), each spring carries the full weight, so stretches add up. Side by side (parallel), the springs share the weight, so the total stretch is smaller. Setup ${more} is the softer arrangement and stretches farther.`,
    params:{A:SPR_TREE[A],B:SPR_TREE[B],ask}});
}

GENS.gearSpeed=genGearSpeedQ;GENS.beltSpeed=genBeltSpeedQ;GENS.lever=genLeverQ;GENS.hydraulic=genHydraulicQ;GENS.springs=genSpringsQ;
{const r1=GENS.ramp;GENS.ramp=withDeNum((seed,diff)=>{const it=diff>=2?genRampQ(seed,diff):r1(seed,diff);it.svg=it.svg.replace(/<line[^>]*class="dim"[^>]*\/>/g,'');return it;});}
['tackle','sag','bracket','bike','boat','belttrain','rack','winch','stability','jet'].forEach(t=>{GENS[t]=withDeNum(GENS[t]);});
/*NEWTYPES*/
const DIFF_CYCLE=[1,2,3,2,3];
const CALC_TYPES=['gearDir','gearSpeed','beltDir','beltSpeed','lever','ramp','hydraulic','springs','pressure','wheel','stability','circuit'];
function buildTest(code,level,mlevel,counts){mlevel=mlevel||'std';const mk2=mlevel==='std'?'':mlevel;counts=counts||{};
  const nF=Math.max(1,Math.min(150,counts.fold||24)),nM=Math.max(1,Math.min(150,counts.mech||45)),nC=Math.max(1,Math.min(150,counts.concept||45));
  const R=RNG(hashSeed('order2',code,level||'std',mlevel));const seen=new Set();const sig=it=>it.type+JSON.stringify(it.params);
  const make=(t,d,k,sec)=>{let it,salt=0;do{it=GENS[t](hashSeed(code,sec,mk2,t,k,salt++),d);}while(seen.has(sig(it))&&salt<60);seen.add(sig(it));return it;};
  const split=(n,fr)=>{const out=fr.map(f=>Math.round(n*f));out[out.length-1]=n-out.slice(0,-1).reduce((a,b)=>a+b,0);if(out[out.length-1]<0){out[out.length-1]=0;}return out;};
  let fplan;
  if(level==='expert'){const a=Math.round(nF*0.4);fplan=[].concat(Array(a).fill(4),Array(Math.max(0,nF-a)).fill(5));}
  else if(level==='hard'){const a=Math.round(nF*0.4);fplan=[].concat(Array(a).fill(3),Array(Math.max(0,nF-a)).fill(4));}
  else{const [a,b]=[Math.round(nF/3),Math.round(nF*0.4)];fplan=[].concat(Array(a).fill(1),Array(b).fill(2),Array(Math.max(0,nF-a-b)).fill(3));}
  fplan=fplan.slice(0,nF);
  const forder=R.shuffle(fplan);
  const fold=forder.map((d,i)=>{let it,salt=0;do{it=d==='net'?genCubeNet(hashSeed(code,'net',level,i,salt++),level==='expert'?5:4):genFold(hashSeed(code,'fold',level||'std',i,salt++),d);}while(seen.has(sig(it))&&salt<50);seen.add(sig(it));it.id='F'+(i+1);return it;});
  const md=()=>mlevel==='hard'?3:mlevel==='expert'?4:R.pick([1,2,2,3,3]);
  const cycle=(arr,n)=>{const out=[];let round=0;while(out.length<n){R.shuffle(arr).forEach(t=>{if(out.length<n)out.push([t,round]);});round++;}return out;};
  const nCalc=Math.round(nM*10/45);const mtypes=cycle(CALC_TYPES,nCalc).concat(cycle(CONCEPT_TYPES,nM-nCalc));
  const mech=R.shuffle(mtypes).map(([t,k],i)=>{const it=make(t,md(),k,'mech');it.id='M'+(i+1);return it;});
  const cd=()=>mlevel==='hard'?3:mlevel==='expert'?4:R.pick([2,3]);
  const concept=cycle(CONCEPT_TYPES,nC).map(([t,k],i)=>{const it=make(t,cd(),k,'concept');it.id='C'+(i+1);return it;});
  const nN=Math.max(1,Math.min(60,counts.net||15));const nd=level==='expert'?5:level==='hard'?4:3;
  const net=Array.from({length:nN},(_,i)=>{let it,salt=0;do{it=genCubeNet(hashSeed(code,'netdrill',level||'std',i,salt++),nd);}while(seen.has(sig(it))&&salt<50);seen.add(sig(it));it.id='N'+(i+1);return it;});
  const sg=sgItems(code,counts);
  const eta=ETA.buildMath(code,counts.eta||33);const sgeta=sgEtaItems(code,counts.eta||33);
  return {fold,mech,concept,net,sgfold:sg.sgfold,sgmech:sg.sgmech,sgnet:sg.sgnet,eta,sgeta};
}
/* ---- endless mode: one question at a time, harder as the level climbs ---- */
const ALL_MECH=CALC_TYPES.concat(CONCEPT_TYPES);
function endlessDiffs(level){const fd=level<=1?1:level<=3?2:level<=5?3:level<=7?4:level<=9?5:6;const md=level<=2?1:level<=4?2:level<=7?3:4;return{fd,md};}
function endlessItem(seed,level,recent){const R=RNG(seed);const {fd,md}=endlessDiffs(level);recent=recent||[];
  if(R.chance(0.4)){const it=genFold(hashSeed(seed,'f'),fd);it.sec='fold';return it;}
  let t;for(let k=0;k<20;k++){t=R.pick(ALL_MECH);if(!recent.includes(t))break;}const it=GENS[t](hashSeed(seed,'m',t),md);it.sec='mech';return it;}
const API={PF:{clipPoly,nextShape,fRefl,moved,fSide,ALL_PTS,N2,area},ETA,ANIM,buildTest,endlessItem,endlessDiffs,genFold,genCubeNet,CALC_TYPES,GENS,CGENS,hashSeed,RNG,MECH_PLAN,CONCEPT_TYPES};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.GEN=API;
})(typeof window!=='undefined'?window:this);
