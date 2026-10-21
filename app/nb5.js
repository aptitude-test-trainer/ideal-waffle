/* ---- animated walkthroughs: paper folding (fold, punch, unfold) and gears ---- */
const ANIM=(()=>{
const ease=t=>t<=0?0:t>=1?1:t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const clamp01=t=>t<0?0:t>1?1:t;
/* move a point partway through a fold: s=1 where it started, s=-1 folded over (mirror), in between = flap seen edge-on */
const Tf=(f,p,s)=>{const x=p[0],y=p[1];let d,v;switch(f.k){case'x':d=x-f.c;v=[1,0];break;case'y':d=y-f.c;v=[0,1];break;case'p':d=(x+y-f.c)/2;v=[1,1];break;default:d=(x-y-f.c)/2;v=[1,-1];}const k=(1-s)*d;return[x-k*v[0],y-k*v[1]];};
const PINK='#1D2227',BACK='#B9BEBF',ACC='#2347A6',HOT='#C2410C';
function creaseSeg(f){const n=N2,pts=[];const add=p=>{if(p[0]>=-1e-6&&p[0]<=n+1e-6&&p[1]>=-1e-6&&p[1]<=n+1e-6)pts.push(p);};
  if(f.k==='x')return[[f.c,0],[f.c,n]];if(f.k==='y')return[[0,f.c],[n,f.c]];
  if(f.k==='p'){add([0,f.c]);add([n,f.c-n]);add([f.c,0]);add([f.c-n,n]);}else{add([0,-f.c]);add([n,n-f.c]);add([f.c,0]);add([f.c+n,n]);}
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);return pts.length>=2?[pts[0],pts[pts.length-1]]:null;}
const half=(fl,po)=>Math.abs(area(fl)/area(po)-0.5)<0.01;
function foldWords(f,h){const r=REGION[f.k][f.sg];if(f.k==='x'||f.k==='y')return h?`fold the ${r} half ${TOWARD[f.k][f.sg]}`:`fold the ${r} strip ${TOWARD[f.k][f.sg]}`;return h?`fold the ${r} half over the diagonal`:`fold the ${r} corner in`;}

function paperScene(it){const P0=it.params;if(!P0||!P0.folds||!P0.punches)return null;
  const folds=P0.folds.map(f=>({k:f.k,c:f.c,sg:f.sg}));
  let poly=[[0,0],[N2,0],[N2,N2],[0,N2]],S=ALL_PTS.map(p=>p.slice());const st=[];
  for(const f of folds){const flap=clipPoly(poly,f,true),keep=clipPoly(poly,f,false);if(flap.length<3||keep.length<3)return null;if(!flap.map(p=>fRefl(f,p)).every(p=>insideConvex(keep,p)))return null;st.push({f,poly,S,flap,keep,h:half(flap,poly)});S=nextShape(S,f);poly=keep;}
  const finalPoly=poly;let H=P0.punches.map(p=>p.slice());const un=[];
  for(let k=folds.length-1;k>=0;k--){const {f,S:Sk}=st[k];const set=new Set(Sk.map(pk));const copies=[];
    H.forEach(h=>{const q=fRefl(f,h);if(moved(f,q)&&set.has(pk(q)))copies.push({from:h,to:q});});un.push({k,before:H.slice(),copies});H=H.concat(copies.map(c=>c.to));}
  const all=H;const sc=11,mg=18,W=2*mg+N2*sc*PF_SX,Hh=2*mg+N2*sc;const U=p=>[mg+p[0]*sc*PF_SX,mg+p[1]*sc];
  const poly2=(pts,fill,extra)=>`<polygon points="${pts.map(U).map(p=>P(p[0])+','+P(p[1])).join(' ')}" fill="${fill}" stroke="${PINK}" stroke-width="1.6" stroke-linejoin="round"${extra||''}/>`;
  const dot=(p,col,r)=>{const q=U(p);return `<circle cx="${P(q[0])}" cy="${P(q[1])}" r="${P(r||3.6)}" fill="${col||PINK}"/>`;};
  const ring=(p,a)=>{const q=U(p);return `<circle cx="${P(q[0])}" cy="${P(q[1])}" r="${P(6+8*a)}" fill="none" stroke="${ACC}" stroke-width="2" opacity="${P(1-a)}"/>`;};
  const ghost=`<rect x="${mg}" y="${mg}" width="${P(N2*sc*PF_SX)}" height="${P(N2*sc)}" fill="none" stroke="#9AA3AB" stroke-width="1.2" stroke-dasharray="5 5"/>`;
  const crease=(f,col,w)=>{const s=creaseSeg(f);if(!s)return'';const a=U(s[0]),b=U(s[1]);return `<line x1="${P(a[0])}" y1="${P(a[1])}" x2="${P(b[0])}" y2="${P(b[1])}" stroke="${col||HOT}" stroke-width="${w||2.2}" stroke-dasharray="7 5"/>`;};
  const seg=[];let T=0;const add=(type,dur,d)=>{seg.push(Object.assign({type,t0:T,t1:T+dur},d||{}));T+=dur;};
  add('intro',1.1);st.forEach((s,i)=>{add('crease0',0.7,{i});add('fold',1.5,{i});});add('punch',1.6);
  un.forEach(u=>{add('crease',0.9,{u});add('unfold',1.9,{u});add('hold',1.7,{u});});add('final',3);
  const n=folds.length,LT='ABCDE'[it.correct];
  function draw(t){const g=seg.find(s=>t<s.t1)||seg[seg.length-1];const e=clamp01((t-g.t0)/(g.t1-g.t0));let b=ghost,cap='',step='';
    if(g.type==='intro'){b+=poly2(st[0].poly,'#fff');cap='Start with a flat sheet.';step='Fold it up';}
    else if(g.type==='crease0'||g.type==='fold'){const s=st[g.i];const sv=g.type==='fold'?1-2*ease(e):1;
      b+=poly2(s.keep,'#fff');const fp=s.flap.map(p=>Tf(s.f,p,sv));b+=poly2(fp,sv>=0?'#fff':BACK);b+=crease(s.f);
      cap=`Fold ${g.i+1} of ${n}: ${foldWords(s.f,s.h)}.`;step='Fold it up';}
    else if(g.type==='punch'){b+=poly2(finalPoly,'#fff');const a=ease(e*1.4);P0.punches.forEach(p=>{b+=dot(p,PINK,3.6*clamp01(a*1.6));if(e<.8)b+=ring(p,clamp01(e*1.25));});
      cap=`Punch ${P0.punches.length===1?'the hole':'the '+P0.punches.length+' holes'} through every layer.`;step='Punch';}
    else if(g.type==='crease'||g.type==='unfold'){const u=g.u,s=st[u.k];const sv=g.type==='unfold'?-1+2*ease(e):-1;
      b+=poly2(s.keep,'#fff');u.before.forEach(p=>b+=dot(p));
      const fp=s.flap.map(p=>Tf(s.f,p,sv));b+=poly2(fp,sv>=0?'#fff':BACK,g.type==='crease'?` stroke="${ACC}" stroke-width="3"`:'');
      if(g.type==='crease')b+=poly2(s.flap.map(p=>fRefl(s.f,p)),ACC,` fill-opacity=".18" stroke="${ACC}" stroke-width="3"`);
      u.copies.forEach(c=>{b+=dot(Tf(s.f,c.to,sv),sv>=0?ACC:'#3F4A55');});b+=crease(s.f);
      cap=g.type==='crease'?`Now undo fold ${u.k+1} (last fold first). The blue flap swings back across the dashed crease${u.copies.length?' and carries a copy of every hole punched through it':', but no hole went through it'}.`:`Unfolding fold ${u.k+1}…`;step='Unfold';}
    else if(g.type==='hold'){const u=g.u,s=st[u.k];b+=poly2(s.poly,'#fff');b+=crease(s.f,'#9AA3AB',1.4);u.before.forEach(p=>b+=dot(p));u.copies.forEach(c=>{b+=dot(c.to,ACC);if(e<.6)b+=ring(c.to,clamp01(e/.6));});
      const tot=u.before.length+u.copies.length;cap=u.copies.length?`${u.copies.length} new hole${u.copies.length>1?'s':''} (blue), each the same distance from the crease as its twin. ${tot} holes now.`:`Nothing was on that flap, so no new holes. Still ${tot}.`;
      if(u.copies.length&&u.copies.length<u.before.length)cap+=' Only holes that went through the flap get copied.';step='Unfold';}
    else{b+=poly2(st[0].poly,'#fff');all.forEach(p=>b+=dot(p));cap=`Fully unfolded: ${all.length} hole${all.length>1?'s':''}. That is answer ${LT}${P0.turned?' (shown turned in the choices)':''}.`;step='Done';}
    return{svg:b,cap,step};}
  return{W,H:Hh,dur:T,draw,light:true,marks:seg.filter(s=>s.type==='fold'||s.type==='punch'||s.type==='crease'||s.type==='final').map(s=>s.t0)};}

function gearArrow(g,cw,a,col){const R=g.r+a+9,mid=-Math.PI/2,span=1.25;const a0=cw?mid-span/2:mid+span/2,a1=cw?a0+span:a0-span;const p0=[g.x+R*Math.cos(a0),g.y+R*Math.sin(a0)],p1=[g.x+R*Math.cos(a1),g.y+R*Math.sin(a1)];const tg=cw?a1+Math.PI/2:a1-Math.PI/2;
  const hx=p1[0]+5*Math.cos(tg),hy=p1[1]+5*Math.sin(tg),s=11,k1=tg+Math.PI*.83,k2=tg-Math.PI*.83;
  return `<path d="M${P(p0[0])} ${P(p0[1])} A${P(R)} ${P(R)} 0 0 ${cw?1:0} ${P(p1[0])} ${P(p1[1])}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/><polygon points="${P(hx)},${P(hy)} ${P(hx+s*Math.cos(k1))},${P(hy+s*Math.sin(k1))} ${P(hx+s*Math.cos(k2))},${P(hy+s*Math.sin(k2))}" fill="${col}"/>`;}
function gearG(g,m,ang,lab,hl,mark){let s=`<g transform="rotate(${P(ang*180/Math.PI)} ${P(g.x)} ${P(g.y)})">`+gearPath(g.x,g.y,g.r,g.n,g.phase||0,m)+(mark?`<circle cx="${P(g.x)}" cy="${P(g.y-g.r+m*1.6)}" r="${P(Math.max(3,m*0.9))}" fill="${HOT}"/>`:'')+`</g>`+C(g.x,g.y,Math.min(13,g.r*0.5),'hub');
  if(hl)s+=`<circle cx="${P(g.x)}" cy="${P(g.y)}" r="${P(g.r+m*1.6)}" fill="none" stroke="var(--accent)" stroke-width="3"/>`;if(lab)s+=T(g.x,g.y+5,lab,'glbl');return s;}

function gearDirScene(it){const p=it.params;if(!p||!p.gears||!p.edges)return null;const m=5,a=0.95*m;
  const gs=p.gears.map(g=>Object.assign({},g));const adj=gs.map(()=>[]);p.edges.forEach(([i,j])=>{adj[i].push(j);adj[j].push(i);});
  const dir=gs.map(()=>0),par=gs.map(()=>-1),order=[0];dir[0]=p.cw?1:-1;gs[0].phase=0;const q=[0];let clash=null;
  while(q.length){const u=q.shift();for(const v of adj[u]){if(dir[v]===0){dir[v]=-dir[u];par[v]=u;meshPhase(gs[u],gs[v]);q.push(v);order.push(v);}else if(dir[v]===dir[u]&&!clash)clash=[u,v];}}
  let x1=0,y1=0;gs.forEach(g=>{x1=Math.max(x1,g.x+g.r+40);y1=Math.max(y1,g.y+g.r+40);});const W=x1,H=y1;
  const seg=[];let T=0;const add=(type,dur,d)=>{seg.push(Object.assign({type,t0:T,t1:T+dur},d||{}));T+=dur;};
  add('start',1.6);order.slice(1).forEach(v=>add('reveal',1.5,{v}));add('final',clash?3:4);
  const target=p.target,w=0.75,word=d=>d===1?'clockwise':'counterclockwise';
  function draw(t){const g=seg.find(s=>t<s.t1)||seg[seg.length-1];const e=clamp01((t-g.t0)/(g.t1-g.t0));
    const shown=new Set([0]);for(const s of seg){if(s.type==='reveal'&&s.t0<=t)shown.add(s.v);}if(g.type==='final')order.forEach(v=>shown.add(v));
    let b='';gs.forEach((G2,i)=>{let ang=0;if(!clash)ang=dir[i]*w*t*(gs[0].r/G2.r);else if(g.type==='final')ang=0.035*Math.sin(t*40);
      b+=gearG(G2,m,ang,LET[i],(g.type==='reveal'&&g.v===i)||(g.type==='final'&&i===target),false);});
    gs.forEach((G2,i)=>{if(shown.has(i)&&!(clash&&g.type==='final'&&i===clash[1]))b+=gearArrow(G2,dir[i]===1,a,i===0?'var(--accent)':i===target?HOT:'var(--accent)');});
    let cap='';
    if(g.type==='start')cap=`Gear A turns ${word(dir[0])}. Watch each gear it touches.`;
    else if(g.type==='reveal'){const v=g.v;cap=`${LET[par[v]]} turns ${word(dir[par[v]])}, so ${LET[v]}, which meshes with it, turns the other way: ${word(dir[v])}.`;
      if(clash&&(v===clash[1]||v===clash[0]))cap+=` But ${LET[clash[0]]} and ${LET[clash[1]]} also touch each other…`;}
    else if(clash){const [u,v]=clash;b+=`<g stroke="${HOT}" stroke-width="5" stroke-linecap="round"><line x1="${P(gs[v].x-16)}" y1="${P(gs[v].y-16)}" x2="${P(gs[v].x+16)}" y2="${P(gs[v].y+16)}"/><line x1="${P(gs[v].x+16)}" y1="${P(gs[v].y-16)}" x2="${P(gs[v].x-16)}" y2="${P(gs[v].y+16)}"/></g>`;
      cap=`${LET[u]} and ${LET[v]} touch, so they must turn opposite ways, but the chain already makes them turn the same way. Three gears meshed in a loop can’t move: gear ${LET[target]} will not turn.`;}
    else{const path=[];for(let v=target;v!==-1;v=par[v])path.unshift(v);cap=`Gear ${LET[target]} turns ${word(dir[target])}. ${path.length} gears from A to ${LET[target]}: ${path.length%2?'odd count, so it turns the same way as A':'even count, so it turns opposite to A'}.`;}
    return{svg:b,cap,step:g.type==='final'?'Done':'Follow the chain'};}
  return{W,H,dur:T,draw,marks:seg.map(s=>s.t0)};}

function gearSpeedScene(it){const p=it.params;if(!p||p.t1==null||p.t2==null||!p.ids)return null;const ns=[p.t1].concat(p.ids,[p.t2]);const m=Math.min(6,360/ns.reduce((x,y)=>x+y,0)),a=0.95*m;
  const gs=ns.map(n=>({n,r:n*m/2}));const maxR=Math.max(...gs.map(g=>g.r));const cy=24+maxR+a;let x=24+gs[0].r+a;
  gs.forEach((g,i)=>{if(i>0)x+=gs[i-1].r+g.r;g.x=x;g.y=cy;});gs[0].phase=0;for(let i=1;i<gs.length;i++)meshPhase(gs[i-1],gs[i]);
  const W=x+gs[gs.length-1].r+a+24,ly=cy+maxR+a+22,H=ly+26;const last=gs.length-1;const w=0.9;
  const seg=[{type:'spin',t0:0,t1:9},{type:'final',t0:9,t1:13}];
  function draw(t){const tt=Math.min(t,9);let b='';
    gs.forEach((g,i)=>{const d=i%2?-1:1;const ang=d*w*tt*(gs[0].r/g.r);const nm=i===0?'A':i===last?'B':'';b+=gearG(g,m,ang,nm,false,true);
      const turns=Math.abs(ang)/(2*Math.PI);b+=T(g.x,ly,nm?`Gear ${nm}`:'Idler','lbl-sb');b+=T(g.x,ly+18,`${turns.toFixed(1)} turns`,'lbl-xs');});
    const tA=w*tt/(2*Math.PI),tB=tA*gs[0].r/gs[last].r;let cap;
    if(t<9)cap=`Watch the orange dots. Both gears move the same amount of rim per second, so the smaller gear has to spin more times to keep up.`;
    else cap=p.t1===p.t2?'Same size, same speed. Idlers change direction, never speed.':`Gear ${p.t1<p.t2?'A':'B'} is smaller, so it turns faster. Gear ${p.t1<p.t2?'B':'A'} is bigger, so it turns slower.${p.ids.length?' The idler in the middle doesn’t change the speed, only the direction.':''}`;
    return{svg:b,cap,step:t<9?'Spinning':'Done'};}
  return{W,H,dur:13,draw,marks:[0,9]};}


/* ---- generic: animate the question's own drawing. Moving parts are wrapped in <g class="mv" data-a="op:args;op:args">
   rot:cx,cy,w      spin about (cx,cy), w rad/s, + = clockwise on screen
   osc:cx,cy,deg,hz rock back and forth
   tilt:cx,cy,deg   ease round to deg and hold (tipping, see-saws)
   mov:dx,dy        ease along to (dx,dy) and hold (loads rising, racks, carts)
   path:x,y,x,y,... follow a polyline of offsets from the start (thrown balls, skids)
   flow:v           marching dashes along the stroke at v px/s (belts, ropes, chains, water); negative = reverse
   show:f / hide:f  appear / disappear at fraction f of the run                     ---- */
function parseOps(str){return String(str||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf(':');return{op:x.slice(0,i).trim(),a:x.slice(i+1).split(',').map(Number)};});}
function sentences(s){return String(s||'').replace(/\s+/g,' ').trim().split(/(?<=[.!?)])\s+(?=[A-Z(])/).filter(Boolean);}
function genericScene(it){const SRC=it.anim||it.svg;if(!SRC||SRC.indexOf('class="mv"')<0)return null;
  const D=9,MV=0.85*D;const sents=sentences(it.explain).map(x=>x.trim()).filter(Boolean);const L='ABCDE';
  const ans=`Correct answer (${L[it.correct]}): ${it.choices[it.correct].t||''}`.trim();const caps=sents.length?sents:[ans];
  const marks=caps.map((_,i)=>i*D/caps.length);
  return{dom:true,svg:SRC,dur:D+2.5,marks:marks.concat([D]),
    setup(root){const els=[...root.querySelectorAll('g.mv')].map(g=>({g,ops:parseOps(g.getAttribute('data-a')),base:g.getAttribute('transform')||''}));
      els.forEach(e=>e.ops.forEach(o=>{if(o.op==='flow'){e.flow=o.a[0];const kids=[...e.g.querySelectorAll('line,path,polyline,polygon,rect,circle,ellipse')];if(!kids.length&&e.g.tagName)kids.push(e.g);e.kids=kids;kids.forEach(k=>{k.style.strokeDasharray='9 7';});}
        if(o.op==='path'){const p=[[0,0]];for(let i=0;i+1<o.a.length;i+=2)p.push([o.a[i],o.a[i+1]]);let len=0;const cum=[0];for(let i=1;i<p.length;i++){len+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);cum.push(len);}o.p=p;o.cum=cum;o.len=len||1;}}));
      return els;},
    frame(els,t){const tm=Math.min(t,D),e=ease(clamp01(tm/MV)),f=tm/D;
      els.forEach(E=>{let tx=0,ty=0,rot='';let vis=null;
        E.ops.forEach(o=>{const a=o.a;
          if(o.op==='rot')rot+=` rotate(${P(a[2]*tm*180/Math.PI)} ${a[0]} ${a[1]})`;
          else if(o.op==='osc')rot+=` rotate(${P(a[2]*Math.sin(2*Math.PI*(a[3]||0.5)*tm))} ${a[0]} ${a[1]})`;
          else if(o.op==='tilt')rot+=` rotate(${P(a[2]*ease(clamp01(tm/(0.5*D))))} ${a[0]} ${a[1]})`;
          else if(o.op==='mov'){tx+=a[0]*e;ty+=a[1]*e;}
          else if(o.op==='path'){const s=clamp01(tm/MV)*o.len;let i=1;while(i<o.cum.length-1&&o.cum[i]<s)i++;const s0=o.cum[i-1],s1=o.cum[i],u=s1>s0?(s-s0)/(s1-s0):0;tx+=o.p[i-1][0]+(o.p[i][0]-o.p[i-1][0])*clamp01(u);ty+=o.p[i-1][1]+(o.p[i][1]-o.p[i-1][1])*clamp01(u);}
          else if(o.op==='show')vis=f>=a[0];else if(o.op==='hide')vis=f<a[0];});
        E.g.setAttribute('transform',(E.base+(tx||ty?` translate(${P(tx)} ${P(ty)})`:'')+rot).trim());
        if(vis!==null)E.g.style.opacity=vis?1:0;
        if(E.flow&&E.kids)E.kids.forEach(k=>k.style.strokeDashoffset=String(-E.flow*tm));});
      const i=Math.min(caps.length-1,Math.floor(tm/D*caps.length));
      return t>=D?{cap:ans+'. '+(caps.length>1?caps[caps.length-1]:''),step:'Done'}:{cap:caps[i],step:`Step ${i+1} of ${caps.length}`};}};}
const SCENES={sgfold:paperScene,fold:paperScene,gearDir:gearDirScene,gearSpeed:gearSpeedScene};
function scene(it){try{const f=SCENES[it.type];const s=f?f(it):null;return s||genericScene(it);}catch(e){return null;}}
function can(it){return !!scene(it);}
function mount(el,it,auto){const sc=scene(it);if(!sc)return false;
  const stage=sc.dom?`<div class="anim-stage">${sc.svg}</div>`:`<svg class="fig anim-svg" viewBox="0 0 ${P(sc.W)} ${P(sc.H)}" style="max-width:${Math.round(sc.W*1.25)}px" role="img" aria-label="animated walkthrough"><g></g></svg>`;
  el.innerHTML=`<div class="anim${sc.light?' anim-light':''}"><div class="anim-step"></div>${stage}<p class="anim-cap" aria-live="polite"></p>
    <div class="anim-ctl"><button type="button" class="btn small anim-pp">Pause</button><button type="button" class="btn small anim-back" aria-label="Previous step">◀ Step</button><button type="button" class="btn small anim-fwd" aria-label="Next step">Step ▶</button><input type="range" class="anim-rng" min="0" max="${P(sc.dur)}" step="0.01" value="0" aria-label="Scrub the animation"><button type="button" class="btn small anim-spd">1×</button></div></div>`;
  const g=sc.dom?null:el.querySelector('svg g'),cap=el.querySelector('.anim-cap'),stp=el.querySelector('.anim-step'),pp=el.querySelector('.anim-pp'),rng=el.querySelector('.anim-rng'),spd=el.querySelector('.anim-spd');
  const st=sc.dom?sc.setup(el.querySelector('.anim-stage')):null;
  let t=0,playing=auto!==false,last=null,speed=1,lastCap='';
  const render=()=>{const f=sc.dom?sc.frame(st,t):sc.draw(t);if(!sc.dom)g.innerHTML=f.svg;if(f.cap!==lastCap){cap.textContent=f.cap;lastCap=f.cap;}stp.textContent=f.step;rng.value=t;pp.textContent=playing?'Pause':(t>=sc.dur?'Replay':'Play');};
  const loop=ts=>{if(!el.isConnected)return;if(playing){if(last!=null)t+=(ts-last)/1000*speed;last=ts;if(t>=sc.dur){t=sc.dur;playing=false;}render();}else last=null;requestAnimationFrame(loop);};
  pp.onclick=()=>{if(t>=sc.dur)t=0;playing=!playing;render();};
  spd.onclick=()=>{speed=speed===1?0.5:speed===0.5?2:1;spd.textContent=speed===0.5?'½×':speed+'×';};
  rng.oninput=()=>{t=+rng.value;playing=false;render();};
  const jump=d=>{playing=false;const mk=sc.marks.concat([sc.dur]);if(d>0){const nx=mk.find(x=>x>t+0.05);t=nx==null?sc.dur:Math.min(sc.dur,nx+0.01);}else{const pv=mk.filter(x=>x<t-0.4);t=pv.length?pv[pv.length-1]+0.01:0;}render();};
  el.querySelector('.anim-back').onclick=()=>jump(-1);el.querySelector('.anim-fwd').onclick=()=>jump(1);
  render();requestAnimationFrame(loop);return true;}
return{can,mount};})();
