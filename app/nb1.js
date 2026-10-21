/* ================= new types, batch 1 (from the study guides) ================= */
function ab(noun,sameText,ans,noteFn){return noteAll([{t:noun+' A',key:'A'},{t:noun+' B',key:'B'},{t:sameText,key:'same'}],ans,noteFn);}
/* animation hooks: wrap fragments in <g class="mv" data-a="ops"> (see genericScene) */
function mvG(ops,inner){return `<g class="mv" data-a="${ops}">${inner}</g>`;}
function mvN(n){return String(+(+n).toFixed(5));}
/* steady straight-line slide by (dx,dy) over the 9 s run with no turning: two pairs of opposite rotations
   about far-off centres cancel the turning and leave a pure translation of 2·Rf·sin(θ), θ ≤ 0.2 rad (≈ linear). */
function mvSlide(cx,cy,dx,dy){const D=Math.hypot(dx,dy);if(!D)return '';const th=0.2,w=th/9,Rf=D/(2*Math.sin(th)),ux=dy/D*Rf,uy=-dx/D*Rf;
  return `rot:${P(cx-ux)},${P(cy-uy)},${mvN(w)};rot:${P(cx)},${P(cy)},${mvN(-w)};rot:${P(cx+ux)},${P(cy+uy)},${mvN(-w)};rot:${P(cx)},${P(cy)},${mvN(w)}`;}
function flipAB(k){return k==='A'?'B':k==='B'?'A':k;}
function person(x,y,pose,s){s=s||1;let b='';const hd=(cx,cy)=>C(cx,cy,9*s,'person');
  if(pose==='upright'){b+=L(x,y-40*s,x,y-78*s,'personl')+L(x,y-40*s,x-5*s,y,'personl')+L(x,y-40*s,x+5*s,y,'personl')+L(x,y-72*s,x-14*s,y-100*s,'personl')+L(x,y-72*s,x+14*s,y-100*s,'personl')+hd(x,y-88*s);}
  else if(pose==='crouch'){b+=L(x-20*s,y,x-12*s,y-22*s,'personl')+L(x-12*s,y-22*s,x,y-34*s,'personl')+L(x+20*s,y,x+14*s,y-22*s,'personl')+L(x+14*s,y-22*s,x,y-34*s,'personl')+L(x,y-34*s,x+8*s,y-62*s,'personl')+L(x+6*s,y-56*s,x+24*s,y-40*s,'personl')+L(x+6*s,y-56*s,x-10*s,y-40*s,'personl')+hd(x+11*s,y-72*s);}
  else if(pose==='sit'){b+=L(x,y,x,y-26*s,'personl')+L(x,y,x-14*s,y+18*s,'personl')+L(x,y,x+14*s,y+18*s,'personl')+L(x,y-20*s,x-12*s,y-4*s,'personl')+L(x,y-20*s,x+12*s,y-4*s,'personl')+hd(x,y-36*s);}
  else if(pose==='walk'){b+=L(x,y-40*s,x,y-78*s,'personl')+L(x,y-40*s,x-10*s,y,'personl')+L(x,y-40*s,x+10*s,y,'personl')+hd(x,y-88*s);}
  return b;}
function cartDraw(x,y,w){return Rect(x,y-30,w,20,'carbody',3)+C(x+14,y-6,8,'tire2')+C(x+w-14,y-6,8,'tire2');}

/* ---- wheels that turn at different rates ---- */
function genWheels2(seed,diff){
  const R=RNG(seed);const v=R.pick(diff===1?['wagon','dots']:['wagon','dots','rim']);
  if(v==='wagon'){const ask=R.pick(['more','fewer']);let rA=R.pick([16,20,24]),rB=R.pick([30,36,42]);const eq=diff>=2&&R.chance(0.2);if(eq)rB=rA;if(R.chance(.5))[rA,rB]=[rB,rA];
    const gy=150,x1=70,x2=250,run=44,sl=mvSlide(160,gy-40,run,0);let b=ground(20,320,gy)+'<g class="mv" data-a="'+sl+'">'+Rect(x1-10,gy-Math.max(rA,rB)-44,x2-x1+20,30,'carbody',3);
    b+=L(x1,gy-rA,x1,gy-Math.max(rA,rB)-14,'rod')+L(x2,gy-rB,x2,gy-Math.max(rA,rB)-14,'rod')+'</g>';
    [[x1,rA,'A'],[x2,rB,'B']].forEach(([x,r,l])=>{let wh=C(x,gy-r,r,'wheel')+C(x,gy-r,4,'dot');for(let k=0;k<6;k++){const t=k*Math.PI/3;wh+=L(x,gy-r,x+(r-3)*Math.cos(t),gy-r+(r-3)*Math.sin(t),'spoke');}b+=mvG(`${sl};rot:${P(x)},${P(gy-r)},${mvN(run/9/r)}`,wh)+T(x,gy+22,'Wheel '+l,'lbl-b');});
    b+=arrow(140,gy-Math.max(rA,rB)-62,210,gy-Math.max(rA,rB)-62);
    const small=rA===rB?'same':(rA<rB?'A':'B');const ans=small==='same'?'same':(ask==='more'?small:flipAB(small));
    return mk({type:'wheels2',sub:'Wheels & turning rates',diff,stem:`The cart rolls along the ground. Which wheel turns ${ask==='more'?'more':'fewer'} times?`,svg:svgWrap(340,gy+32,b,'cart with two wheels of different sizes'),answer:ans,
      choices:ab('Wheel','Both turn the same number of times',ans,k=>k==='same'?'The wheels are different sizes. Both cover the same ground, so the smaller one has to turn more times.':'Both wheels roll the same distance. The smaller wheel has a shorter rim, so it turns more times.'),
      explain:small==='same'?'The wheels are the same size and roll the same distance, so they turn the same number of times.':`Both wheels roll the same distance along the ground. Each turn of a wheel covers one rim-length, so the smaller wheel (${small}) has to turn more times and the bigger one fewer.`,params:{v,rA,rB,ask}});}
  const ask='faster';let rA=R.pick([22,26,30]),rB=R.pick([44,50,56]);if(R.chance(.5))[rA,rB]=[rB,rA];
  let dA,dB;if(v==='rim'){dA=rA;dB=rB;}else{const d=Math.min(rA,rB)-6;dA=d;dB=d;}
  const cy=86,xA=40+rA,xB=xA+rA+rB+110;let b='';const vb=40;for(const l of beltLines({x:xA,y:cy,r:rA},{x:xB,y:cy,r:rB},false))b+=mvG(`flow:${l[1]<cy?vb:-vb}`,L(l[0],l[1],l[2],l[3],'belt'));
  const ang=R.pick([-0.8,-2.3,0.6]);[[xA,rA,dA,'A'],[xB,rB,dB,'B']].forEach(([x,r,d,l])=>{b+=mvG(`rot:${P(x)},${P(cy)},${mvN(vb/r)}`,C(x,cy,r,'wheel')+C(x,cy,4,'dot')+L(x,cy,x+d*Math.cos(ang),cy+d*Math.sin(ang),'dim')+C(x+d*Math.cos(ang),cy+d*Math.sin(ang),6,'ball2'))+T(x,cy+Math.max(rA,rB)+26,'Spot '+l,'lbl-b');});
  b+=arcArrow(xA,cy,rA+12,-Math.PI/2,1,true);
  const vA=dA/rA,vB=dB/rB;const ans=Math.abs(vA-vB)<1e-9?'same':(vA>vB?'A':'B');
  return mk({type:'wheels2',sub:'Wheels & turning rates',diff,stem:`The belt does not slip. ${v==='rim'?'Each black spot is on the edge of its pulley.':'Both black spots are the same distance from the center of their pulley.'} Which spot moves faster?`,svg:svgWrap(xB+rB+40,cy+Math.max(rA,rB)+36,b,'two belted pulleys with a marked spot on each'),answer:ans,
    choices:ab('Spot','Both move at the same speed',ans,k=>k==='same'?'The small pulley turns more times than the big one, so a spot the same distance from the center goes around more often and moves faster.':(v==='rim'?'A spot on the edge moves along with the belt. The belt runs at one speed, so both edge spots move at the same speed.':'The small pulley turns faster. A spot the same distance from its center goes around more often, so it moves faster.')),
    explain:v==='rim'?'A spot on the edge of a pulley moves at the same speed as the belt touching it. There is only one belt, so both edge spots move at the same speed, even though the small pulley turns more times.':`The small pulley turns more times than the big one. Both spots are the same distance from their centers, so the spot on the small pulley goes around its circle more often and moves faster.`,params:{v,rA,rB,dA,dB}});
}

/* ---- how far does the other gear turn ---- */
function genGearTurns(seed,diff){
  const R=RNG(seed),m=3.2,a=0.95*m;let nA,nB;const eq=diff>=2&&R.chance(0.2);
  for(;;){nA=R.pick([12,15,16,18,20,24,30,36,40]);nB=eq?nA:R.pick([12,15,16,18,20,24,30,36,40]);if(eq||Math.max(nA,nB)/Math.min(nA,nB)>=1.5)break;}
  const gs=[{n:nA},{n:nB}];gs.forEach(g=>g.r=g.n*m/2);const maxR=Math.max(gs[0].r,gs[1].r),cy=30+maxR+a;gs[0].x=30+gs[0].r+a;gs[0].y=cy;gs[1].x=gs[0].x+gs[0].r+gs[1].r;gs[1].y=cy;gs[0].phase=R.f()*6.28;meshPhase(gs[0],gs[1]);
  const wA=2*Math.PI/9,gb=(g,w,l)=>mvG(`rot:${P(g.x)},${P(g.y)},${mvN(w)}`,gearPath(g.x,g.y,g.r,g.n,g.phase,m)+C(g.x,g.y,Math.min(13,g.r*0.5),'hub'))+T(g.x,g.y+5,l,'glbl');
  let b=gb(gs[0],wA,'A')+gb(gs[1],-wA*nA/nB,'B')+arcArrow(gs[0].x,cy,gs[0].r+a+10,-Math.PI/2-0.4,1.1,true);
  const W=gs[1].x+gs[1].r+a+30;const ans=nA===nB?'one':(nA>nB?'more':'less');
  const ch=[{t:'Less than one full turn',key:'less'},{t:'Exactly one full turn',key:'one'},{t:'More than one full turn',key:'more'}];
  noteAll(ch,ans,k=>k==='one'?'Only gears of the same size turn the same amount.':k==='more'?'A bigger gear driven by a smaller one turns less, not more.':'A smaller gear driven by a bigger one turns more, not less.');
  return mk({type:'gearturns',sub:'Gear speed',diff,stem:'Gear A turns around exactly once. How far does gear B turn?',svg:svgWrap(W,cy+maxR+a+20,b,'two meshing gears'),choices:ch,answer:ans,
    explain:nA===nB?'The gears are the same size (same number of teeth), so one turn of A makes exactly one turn of B.':`Every tooth of A that passes pushes one tooth of B along. Gear B is ${nB>nA?'bigger (more teeth)':'smaller (fewer teeth)'}, so one turn of A moves B ${nB>nA?'less than':'more than'} a full turn.`,params:{nA,nB}});
}

/* ---- dragging a load with a pulley ---- */
function dragRow(y,rig,label,scene){let b='';const sx=250,d=14,sl=mvSlide(sx,y,-d,0);
  if(scene==='stone')b+=mvG(sl,`<path class="stone" d="M${sx} ${y+26} Q${sx+4} ${y-8} ${sx+40} ${y-10} Q${sx+82} ${y-6} ${sx+86} ${y+26} Z"/>`);
  else b+=mvG(sl,Rect(sx,y-14,70,40,'crate',3));
  b+=L(10,y+26,380,y+26,'ground');
  const px=sx-10;
  if(rig==='pulley'){b+=Rect(26,y-26,14,52,'post')+mvG(sl,L(40,y-8,px,y-8,'rope')+mvG(`flow:${mvN(d/9)}`,L(px,y+12,70,y+12,'rope'))+C(px,y+2,10,'sheave')+C(px,y+2,2.5,'dot')+L(px+8,y+2,sx,y+2,'strap'))+mvG(mvSlide(65,y+12,-2*d,0),arrow(80,y+12,50,y+12,'acc'));}
  else{b+=mvG(sl,L(sx,y+2,90,y+2,'rope')+arrow(100,y+2,60,y+2,'acc'));}
  b+=T(sx+40,y+50,label,'lbl-b');return b;}
function genDrag(seed,diff){
  const R=RNG(seed);const ask=R.pick(['easier','harder','farther']);const scene=R.pick(['stone','crate']);const eq=diff>=2&&R.chance(0.22);
  let rA=R.pick(['pulley','direct']),rB=eq?rA:(rA==='pulley'?'direct':'pulley');
  const b=dragRow(50,rA,scene==='stone'?'Stone A':'Crate A',scene)+dragRow(150,rB,scene==='stone'?'Stone B':'Crate B',scene);
  const n={A:rA==='pulley'?2:1,B:rB==='pulley'?2:1};const more=n.A===n.B?'same':(n.A>n.B?'A':'B');
  const ans=more==='same'?'same':(ask==='harder'?flipAB(more):more);const noun=scene==='stone'?'Stone':'Crate';
  const stem={easier:`Both ${scene}s are the same. Which one takes less pulling force to drag in the direction of the arrow?`,harder:`Both ${scene}s are the same. Which one takes more pulling force to drag in the direction of the arrow?`,farther:`Both ${scene}s are dragged the same distance. For which one must the rope be pulled farther?`}[ask];
  return mk({type:'drag',sub:'Movable pulleys & distance',diff,stem,svg:svgWrap(390,210,b,'two loads dragged along the ground'),answer:ans,
    choices:ab(noun,ask==='farther'?'The same distance':'The same force',ans,k=>k==='same'?'One load has a pulley on it with the rope’s other end tied to a post. Two rope strands pull that load, which halves the force and doubles the rope.':'Count the rope strands pulling on each load. The pulley on the load gives two strands: half the force, twice the rope.'),
    explain:more==='same'?'Both loads are rigged the same way, so the force and the rope pulled are the same.':`${noun} ${more} has a pulley on it and the rope’s other end is tied to a post, so two rope strands pull it. That halves the force needed but you must pull twice as much rope. ${noun} ${flipAB(more)} is pulled by one strand: full force, rope equal to the distance moved.`,params:{rigs:[rA,rB],ask}});
}

/* ---- two winches sharing one pulley ---- */
function genTwoWinch(seed,diff){
  const R=RNG(seed);const ask=R.pick(['harder','easier']);let A,B;const eq=diff>=2&&R.chance(0.22);
  for(;;){A={r:R.pick([8,11,14,18]),h:R.pick([34,42,50])};B=eq?{r:A.r,h:A.h}:{r:R.pick([8,11,14,18]),h:R.pick([34,42,50])};if(eq)break;const q=(A.r/A.h)/(B.r/B.h);if(q>1.4||q<1/1.4)break;}
  const by=92,xA=80,xB=300,cx=190,ly=250;let b=Rect(20,by+22,340,12,'beam',2);
  /* load rises H over the run: each rope swings about its drum end (the extra length tucks under the sheave) and each drum winds in what its rope loses */
  const H=14,wind={};[[xA,A,-1,'A'],[xB,B,1,'B']].forEach(([x,w,sd,l])=>{const dx=x-sd*w.r*1.3,sx=cx+sd*16,l0=Math.hypot(sx-dx,ly-by),l1=Math.hypot(sx-dx,ly-H-by);
    wind[l]={drum:sd*(l0-l1)/(w.r*1.3)/9,rope:(Math.atan2(ly-H-by,sx-dx)-Math.atan2(ly-by,sx-dx))/9,dx};});
  [[xA,A,-1,'A'],[xB,B,1,'B']].forEach(([x,w,sd,l])=>{const hx=x+sd*w.h*0.9,hy=by-w.h*0.5;b+=Rect(x-6,by,12,24,'metal')+mvG(`rot:${P(x)},${P(by)},${mvN(wind[l].drum)}`,C(x,by,w.r*1.3,'drum')+C(x,by,3,'dot')+L(x,by,hx,hy,'crank')+C(hx,hy,6,'knob'))+T(x,by-46,'Winch '+l,'lbl-b');});
  const pr=16;b+=mvG(`rot:${P(wind.A.dx)},${P(by)},${mvN(wind.A.rope)}`,L(xA+A.r*1.3,by,cx-pr,ly,'rope'))+mvG(`rot:${P(wind.B.dx)},${P(by)},${mvN(wind.B.rope)}`,L(xB-B.r*1.3,by,cx+pr,ly,'rope'))+mvG(mvSlide(cx,ly,0,-H),C(cx,ly,pr,'sheave')+C(cx,ly,3,'dot')+`<path class="rope" d="M${cx-pr} ${ly} A${pr} ${pr} 0 0 0 ${cx+pr} ${ly}"/>`+L(cx,ly,cx,ly+26,'strap')+Rect(cx-28,ly+26,56,36,'load',3));
  const fA=A.r/A.h,fB=B.r/B.h;const harder=Math.abs(fA-fB)<1e-9?'same':(fA>fB?'A':'B');const ans=harder==='same'?'same':(ask==='harder'?harder:flipAB(harder));
  return mk({type:'twowinch',sub:'Winches & wheel and axle',diff,stem:`Both ropes run down to one pulley on the load, so each winch holds up half of it. Which winch is ${ask==='harder'?'harder':'easier'} to turn?`,svg:svgWrap(380,ly+72,b,'two winches sharing one load'),answer:ans,
    choices:ab('Winch','Both are equally hard',ans,k=>k==='same'?'Each rope carries the same pull, but the drums and handles are different, so the effort is different.':'Both ropes carry the same pull. Compare each drum with its handle: a bigger drum or a shorter handle is harder to turn.'),
    explain:harder==='same'?'Each rope carries half the load, and both winches have the same drum and handle, so they are equally hard to turn.':`Each rope carries the same pull (half the load). The effort on a handle depends on the drum size compared with the handle length. Winch ${harder} has the bigger drum for its handle, so it is harder to turn.`,params:{A,B,ask}});
}

/* ---- dropped vs thrown ---- */
function genDropThrow(seed,diff){
  const R=RNG(seed);const v=diff===1?'dropthrow':R.pick(['dropthrow','twothrow','heights']);const ask=v==='twothrow'?R.pick(['first','farther']):'first';
  const wy=240;let b=Rect(0,wy,420,40,'water')+L(0,wy,420,wy,'surface');let ans,params,stem,explain;
  if(v==='heights'){const hA=R.pick([90,110]),hB=R.pick([160,180]);const swap=R.chance(.5);const H={A:swap?hB:hA,B:swap?hA:hB};
    /* same gravity for both: mov eases as 2u² in its first half, i.e. true free fall; the higher ball reaches the water at u=0.5, then each ball sinks out of view */
    const hL=Math.max(H.A,H.B)-6,Dm=2*hL;[[0,'A'],[210,'B']].forEach(([ox,l])=>{const top=wy-H[l];b+=Rect(ox,top,90,wy-top,'concrete')+mvG(`mov:0,${P(Dm)};hide:${mvN(0.85*Math.sqrt((H[l]-6)/(2*Dm)))}`,C(ox+100,top-8,8,'ball'))+L(ox+100,top,ox+100,wy-6,'opt')+T(ox+100,top-24,'Ball '+l,'lbl-b');});
    ans=H.A<H.B?'A':'B';stem='Both balls are let go at the same moment and fall straight down. Which hits the water first?';explain=`Both fall with the same pull of gravity, so the one with less height to fall (ball ${ans}) lands first.`;params={v,H};}
  else{const top=wy-150;b+=Rect(0,top,80,150,'concrete');let sA,sB;
    if(v==='dropthrow'){sA=0;sB=1;if(R.chance(.5))[sA,sB]=[sB,sA];}else{sA=R.pick([1,2]);sB=sA===1?2:1;}
    const S={A:sA,B:sB};let yy=top-10;
    ['A','B'].forEach((l,i)=>{const y0=top-10-i*26;const s=S[l];const ball=C(92,y0,8,i?'ball3':'ball');b+=mvG(`mov:0,${P(2*(wy+2-y0))};hide:0.425`,s?mvG(`path:${s*120},0`,ball):ball)+T(66,y0+5,l,'lbl-b','end');if(s)b+=arrow(104,y0,104+s*38,y0,'acc');else b+=T(112,y0+5,'(let go)','lbl-s','start');});
    if(ask==='first'){ans='same';stem=v==='dropthrow'?'At the same moment, one ball is dropped and the other is thrown straight out sideways. Which hits the water first?':`At the same moment, both balls are thrown straight out sideways, ${sB>sA?'B harder than A':'A harder than B'} (longer arrow means faster). Which hits the water first?`;
      explain='Throwing a ball sideways doesn’t change how fast it falls. Both start with no downward speed from the same height, so they hit the water at the same time; the thrown one just lands farther out.';}
    else{ans=sA>sB?'A':'B';stem='At the same moment, both balls are thrown straight out sideways (longer arrow means faster). Which lands farther from the cliff?';explain=`Both take the same time to fall, but ball ${ans} moves sideways faster the whole way down, so it lands farther out.`;}
    params={v,S,ask};}
  return mk({type:'dropthrow',sub:'Falling & thrown objects',diff,stem,svg:svgWrap(420,280,b,'balls falling from a cliff into water'),answer:ans,
    choices:ab('Ball',ask==='farther'?'Both land the same distance out':'Both hit at the same time',ans,k=>k==='same'?(v==='heights'?'They fall different heights, so they can’t land together.':'The sideways speeds differ, so they land at different distances.'):(v==='heights'?'The lower ball has less distance to fall.':ask==='farther'?'The faster throw carries the ball farther in the same falling time.':'Sideways speed doesn’t change how fast a ball falls. Both land at the same time.')),explain,params});
}

/* ---- dropped from a moving plane ---- */
function genPlaneDrop(seed,diff){
  const R=RNG(seed);const moving=diff===1?true:R.chance(0.7);const dir=R.chance(.5)?1:-1;const cx=210,py=60;let b='';
  const run=300,fall=300-(py+22);b+=(moving?`<g class="mv" data-a="path:${dir*run},0">`:'<g>')+`<g transform="translate(${cx} ${py}) scale(${dir} 1)"><path class="carbody" d="M-60 0 Q-50 -12 20 -10 L50 -4 Q58 0 50 4 L-50 6 Z"/><path class="carbody" d="M-10 -8 L-30 -34 L-18 -34 L10 -8 Z"/><path class="carbody" d="M-54 -4 L-66 -24 L-56 -24 L-44 -4 Z"/></g></g>`;
  b+=moving?arrow(cx+dir*70,py-30,cx+dir*130,py-30):T(cx,py-40,'(hovering in place)','lbl-s');
  b+=mvG(`mov:0,${2*fall};hide:0.425`,mvG(`path:${moving?dir*run:0},0`,Rect(cx-6,py+10,12,12,'crate',2)));const gy=300;b+=ground(20,400,gy);
  const paths={down:`M${cx} ${py+24} L${cx} ${gy-4}`,fwd:`M${cx} ${py+24} Q${cx+dir*120} ${py+40} ${cx+dir*150} ${gy-4}`,back:`M${cx} ${py+24} Q${cx-dir*120} ${py+40} ${cx-dir*150} ${gy-4}`};
  const ends={down:cx,fwd:cx+dir*150,back:cx-dir*150};const labs=R.shuffle(['A','B','C']);const keys=['down','fwd','back'];
  keys.forEach((k,i)=>{b+=`<path class="opt" d="${paths[k]}"/>`+T(ends[k],gy+22,labs[i],'lbl-b');});
  const ans=moving?'fwd':'down';const lab=k=>labs[keys.indexOf(k)];
  const ch=['A','B','C'].map(l=>{const k=keys[labs.indexOf(l)];return{t:'Path '+l,key:k};});noteAll(ch,ans,k=>moving?(k==='down'?'The box keeps the plane’s forward speed after it is let go, so it doesn’t fall straight down.':'Nothing pushes the box backward. It keeps moving forward with the plane’s speed while it falls.'):(k==='down'?'':'The helicopter isn’t moving, so the box has no sideways speed and falls straight down.'));
  ch.sort((x,y)=>lab(x.key)<lab(y.key)?-1:1);
  return mk({type:'planedrop',sub:'Falling & thrown objects',diff,stem:moving?'The plane is flying in the direction of the arrow when it lets go of the box. Seen from the ground, which path does the box follow?':'A helicopter hovering in one spot lets go of a box. Seen from the ground, which path does the box follow?',
    svg:svgWrap(420,330,b,'aircraft dropping a box with three possible paths'),choices:ch,answer:ans,
    explain:moving?'When it is let go, the box is already moving forward as fast as the plane. It keeps that forward speed while gravity pulls it down, so it curves forward and down.':'A hovering helicopter isn’t moving, so the box starts with no sideways speed and falls straight down.',params:{moving,dir,ends}});
}

/* ---- mud flying off a spinning wheel ---- */
function genMud(seed,diff){
  const R=RNG(seed);const cw=R.chance(.5);const ang=R.pick([-Math.PI/2,-Math.PI/4,-3*Math.PI/4,0,Math.PI]);const cx=200,cy=160,r=70;const vm=50;let b=mvG(`flow:${cw?vm:-vm}`,C(cx,cy,r,'tire'))+C(cx,cy,r-10,'wheel')+C(cx,cy,10,'hub');
  b+=arcArrow(cx,cy,r+18,ang+Math.PI,1.2,cw);const p=[cx+r*Math.cos(ang),cy+r*Math.sin(ang)];const t0=cw?[-Math.sin(ang),Math.cos(ang)]:[Math.sin(ang),-Math.cos(ang)];b+=mvG(`path:${P(t0[0]*vm*7.65)},${P(t0[1]*vm*7.65)}`,C(p[0],p[1],7,'stone'));
  const tv=cw?[-Math.sin(ang),Math.cos(ang)]:[Math.sin(ang),-Math.cos(ang)];const rv=[Math.cos(ang),Math.sin(ang)];
  const dirs={tan:tv,rad:rv,back:[-tv[0],-tv[1]]};const labs=R.shuffle(['A','B','C']);const keys=['tan','rad','back'];let paths={};
  keys.forEach((k,i)=>{const d=dirs[k];const q=[p[0]+d[0]*110,p[1]+d[1]*110];b+=L(p[0]+d[0]*10,p[1]+d[1]*10,q[0],q[1],'opt')+T(q[0]+d[0]*14,q[1]+d[1]*14+5,labs[i],'lbl-b');paths[k]=d;});
  const ch=['A','B','C'].map(l=>({t:'Path '+l,key:keys[labs.indexOf(l)]}));const ans='tan';
  noteAll(ch,ans,k=>k==='rad'?'Nothing pushes the mud straight outward. Once it lets go, it keeps moving the way the rim was moving at that moment.':'The rim at that spot is moving the other way. The mud flies off in the direction it was already moving.');
  return mk({type:'mud',sub:'Circular motion',diff,stem:'The wheel spins in the direction of the arrow. The lump of mud comes loose at the spot shown. Which way does it fly?',svg:svgWrap(420,330,b,'spinning wheel with mud on the rim'),choices:ch,answer:ans,
    explain:'When the mud lets go, nothing holds it on the circle any more, so it flies off in a straight line in the direction the rim was moving at that spot: along the edge (tangent), not straight out from the center.',params:{cw,ang,paths}});
}

/* ---- tipping on a slope ---- */
function genSlopeTip(seed,diff){
  const R=RNG(seed);const ask=R.pick(['easier','stable']);let A,B;const eq=diff>=3&&R.chance(0.22);
  for(;;){A=[R.int(1,3),R.int(2,5)];B=eq?null:[R.int(1,3),R.int(2,5)];if(eq){const k=R.pick([1.5,2]);B=[A[0]*k,A[1]*k];if(B[1]>5.5)continue;break;}if(A[0]>=A[1]&&B[0]>=B[1])continue;if(Math.abs(A[0]/A[1]-B[0]/B[1])>0.25)break;}
  const th=0.34,s=24;const x0=20,y0=300,x1=440,y1=y0-(x1-x0)*Math.tan(th);let b=Poly([[x0,y0],[x1,y0],[x1,y1]],'ramp');
  const place=(bl,t,l)=>{const w=bl[0]*s,h=bl[1]*s;const bx=x0+t*(x1-x0),by=y0-(bx-x0)*Math.tan(th);const deg=-th*180/Math.PI;
    let g=`<g transform="translate(${P(bx)} ${P(by)}) rotate(${P(deg)})">`+Rect(0,-h,w,h,'block')+C(w/2,-h/2,4,'cg')+'</g>';
    const c=[bx+(w/2)*Math.cos(-th)-(-h/2)*Math.sin(-th),by+(w/2)*Math.sin(-th)+(-h/2)*Math.cos(-th)];const yg=y0-(c[0]-x0)*Math.tan(th);g+=L(c[0],c[1],c[0],yg,'opt')+C(c[0],c[1],4,'cg');
    return g+T(bx+w/2,by-h-22,l,'lbl-L');};
  b+=place(A,0.18,'A')+place(B,0.6,'B');
  const ra=A[0]/A[1],rb=B[0]/B[1];const tippier=Math.abs(ra-rb)<1e-9?'same':(ra<rb?'A':'B');const ans=tippier==='same'?'same':(ask==='easier'?tippier:flipAB(tippier));
  return mk({type:'slopetip',sub:'Center of gravity',diff,stem:`Both blocks are solid and evenly weighted, sitting on the same slope. The dashed line hangs straight down from each center of gravity. Which block ${ask==='easier'?'would tip over more easily':'is more stable'}?`,svg:svgWrap(460,320,b,'two blocks on a slope with plumb lines'),answer:ans,
    choices:ab('Block','Both the same',ans,k=>k==='same'?'The blocks have different shapes, so their plumb lines fall at different places on their bases.':'Look where each plumb line meets the base. The closer it comes to the downhill corner, the closer the block is to tipping.'),
    explain:tippier==='same'?'The blocks are the same shape, just different sizes, so each plumb line lands the same way on its base. They are equally stable.':`A block tips when the line straight down from its center of gravity passes outside its downhill corner. Block ${tippier} is tall and narrow for its size, so its line lands closer to that corner: it tips more easily.`,params:{A,B,ask}});
}

/* ---- balance pole ---- */
function genPoleBal(seed,diff){
  const R=RNG(seed);const low=R.pick(['A','B']);const v=diff===1?'none':R.pick(['none','straight']);const ask=R.pick(['steady','fall']);
  const ry=220;let b=L(0,ry,440,ry,'cable')+C(4,ry,4,'dot');
  ['A','B'].forEach((l,i)=>{const x=110+i*220;b+=person(x,ry,'upright',1);const hy=ry-72;
    if(l===low){b+=`<path class="cable" style="stroke-width:3.5" d="M${x-90} ${hy+40} Q${x} ${hy-24} ${x+90} ${hy+40}"/>`+Rect(x-98,hy+40,16,22,'load',2)+Rect(x+82,hy+40,16,22,'load',2);}
    else if(v==='straight')b+=L(x-90,hy-12,x+90,hy-12,'pole');
    b+=T(x,ry+26,'Walker '+l,'lbl-b');});
  const ans=ask==='steady'?low:flipAB(low);
  return mk({type:'polebal',sub:'Center of gravity',diff,stem:`Two people walk along a tightrope. Which one ${ask==='steady'?'is steadier':'is more likely to fall'}?`,svg:svgWrap(440,260,b,'two tightrope walkers'),answer:ans,
    choices:ab('Walker','Both are equally steady',ans,k=>k==='same'?'One walker carries a bent pole with weights hanging low. That lowers the center of gravity and makes balancing easier.':'The weights hanging below the rope pull the combined center of gravity down, which makes that walker steadier.'),
    explain:`Walker ${low} holds a pole that bends down, with weights hanging low on both ends. That brings the center of gravity down toward (or below) the rope, so it is much easier to stay balanced.`,params:{low,v,ask}});
}

/* ---- posture ---- */
function genPosture(seed,diff){
  const R=RNG(seed);const low=R.pick(['A','B']);const scene=R.pick(['ball','push']);const gy=220;let b=ground(20,420,gy);
  ['A','B'].forEach((l,i)=>{const x=120+i*200;b+=person(x,gy,l===low?'crouch':'upright',1);
    if(scene==='ball')b+=l===low?C(x+30,gy-12,9,'ball'):C(x+16,gy-112,9,'ball');else b+=arrow(x-80,gy-60,x-34,gy-60);
    b+=T(x,gy+26,'Player '+l,'lbl-b');});
  const ask=R.pick(['better','worse']);const ans=ask==='better'?low:flipAB(low);
  const stem=scene==='ball'?`Which player is ${ask==='better'?'more':'less'} likely to keep control of the ball?`:`Each person is pushed from the side with the same force. Which one is ${ask==='better'?'harder':'easier'} to knock over?`;
  return mk({type:'posture',sub:'Center of gravity',diff,stem,svg:svgWrap(440,250,b,'two people, one upright and one crouched'),answer:ans,
    choices:ab('Player','No difference',ans,k=>k==='same'?'Crouching lowers the center of gravity and widens the stance, which makes a real difference.':'The crouched person has a lower center of gravity and wider feet, so they are steadier.'),
    explain:`Crouching lowers the body’s center of gravity and a wide stance gives a bigger base. Player ${low} is low and wide, so they are steadier and keep control more easily.`,params:{low,ask,scene}});
}

/* ---- scissor lift tie ---- */
function genScissor(seed,diff){
  const R=RNG(seed);const ask=R.pick(['more','less']);let A,B;const eq=diff>=3&&R.chance(0.22);
  for(;;){A=[R.pick([140,160,180]),R.pick([40,60,90,120])];if(eq){const k=R.pick([0.75,1.25]);B=[A[0]*k,A[1]*k];if(B[0]>190||B[1]>130)continue;break;}B=[R.pick([140,160,180]),R.pick([40,60,90,120])];if(Math.abs(A[0]/A[1]-B[0]/B[1])>0.6)break;}
  const gy=250;let b=ground(10,470,gy);
  [[A,20,'A'],[B,250,'B']].forEach(([s,ox,l])=>{const w=s[0],h=s[1],x=ox+(210-w)/2,top=gy-12-h;b+=Rect(x-6,gy-12,w+12,12,'metal');
    b+=L(x,gy-12,x+w,top,'strut')+L(x+w,gy-12,x,top,'strut')+C(x+w/2,(gy-12+top)/2,4,'dot');b+=L(x,(gy-12+top)/2,x+w,(gy-12+top)/2,'tie');
    b+=Rect(x-6,top-10,w+12,10,'metal')+Rect(x+w/2-26,top-44,52,34,'load',3)+T(x+w/2,gy+24,'Lift '+l,'lbl-b');});
  const tA=A[0]/A[1],tB=B[0]/B[1];const more=Math.abs(tA-tB)<1e-9?'same':(tA>tB?'A':'B');const ans=more==='same'?'same':(ask==='more'?more:flipAB(more));
  return mk({type:'scissor',sub:'Cable angles & slings',diff,stem:`Both lifts hold the same load. A tie bar (brown) holds each frame from spreading. Which tie bar is under ${ask} strain?`,svg:svgWrap(480,280,b,'two scissor lifts'),answer:ans,
    choices:ab('Lift','Both the same',ans,k=>k==='same'?'The frames are at different angles, and the angle sets the strain on the tie.':'The flatter the frame, the more the load tries to spread it sideways, so the tie holds more strain.'),
    explain:more==='same'?'The two frames have the same shape (same angle), just different sizes, so the tie strain is the same.':`The load pushes the crossed arms apart. The flatter the arms lie, the harder they push outward, so the flatter lift (${more}) puts more strain on its tie.`,params:{A,B,ask}});
}

/* ---- truss depth ---- */
function genTruss(seed,diff){
  const R=RNG(seed);const ask=R.pick(['stronger','weaker']);let dA=R.pick([30,40]),dB=R.pick([70,90]);if(R.chance(.5))[dA,dB]=[dB,dA];
  let b='';[[dA,30,'A'],[dB,190,'B']].forEach(([d,oy,l])=>{const x0=40,x1=400,y=oy+100,n=6,st=(x1-x0)/n;b+=Rect(x0-30,y,30,40,'concrete')+Rect(x1,y,30,40,'concrete');
    b+=L(x0,y,x1,y,'strut')+L(x0+st,y-d,x1-st,y-d,'strut');for(let i=0;i<=n;i++){const x=x0+i*st;if(i>0&&i<n)b+=L(x,y,x,y-d,'strut');if(i<n){const xa=x,xb=x+st;if(i===0)b+=L(xa,y,xb,y-d,'strut');else if(i===n-1)b+=L(xa,y-d,xb,y,'strut');else b+=L(i<n/2?xa:xb,y,i<n/2?xb:xa,y-d,'strut');}}
    b+=T(20,y-d/2,l,'lbl-L','start');});
  const deeper=dA>dB?'A':'B';const ans=ask==='stronger'?deeper:flipAB(deeper);
  return mk({type:'truss',sub:'Bridges & trusses',diff,stem:`Both bridges span the same gap and are made of the same steel bars. Which bridge is ${ask}?`,svg:svgWrap(440,340,b,'two truss bridges of different depth'),answer:ans,
    choices:ab('Bridge','Both are equally strong',ans,k=>k==='same'?'The trusses are different depths, and depth makes a big difference.':'A deeper truss holds the top and bottom bars farther apart, so it resists bending much better.'),
    explain:`A truss resists bending by pulling on its bottom bars and pushing on its top bars. The farther apart those bars are, the more leverage they have, so the deeper truss (${deeper}) is stronger and the shallow one weaker.`,params:{dA,dB,ask}});
}

/* ---- hammock / rope between two posts ---- */
function genHammock(seed,diff){
  const R=RNG(seed);const ask=R.pick(['more','less']);const eq=diff>=2&&R.chance(0.2);const f=eq?0.5:R.pick([0.22,0.3,0.7,0.78]);const x0=50,x1=390,ty=60,sag=R.pick([90,110]);const px=x0+f*(x1-x0),py=ty+sag;
  let b=Rect(x0-16,ty-20,16,230,'post')+Rect(x1,ty-20,16,230,'post')+ground(10,440,250);b+=L(x0,ty,px,py,'rope')+L(x1,ty,px,py,'rope')+person(px,py-2,'sit',1)+C(x0,ty,3,'dot')+C(x1,ty,3,'dot');
  b+=T((x0+px)/2-14,(ty+py)/2-8,'A','lbl-L')+T((x1+px)/2+14,(ty+py)/2-8,'B','lbl-L');
  const TA=Math.hypot(px-x0,py-ty)/(px-x0),TB=Math.hypot(x1-px,py-ty)/(x1-px);
  const more=Math.abs(TA-TB)<1e-9?'same':(TA>TB?'A':'B');const ans=more==='same'?'same':(ask==='more'?more:flipAB(more));
  return mk({type:'hammock',sub:'Cable angles & slings',diff,stem:`A person sits on a rope seat hung between two posts. Which side of the rope, A or B, carries ${ask} pull?`,svg:svgWrap(450,262,b,'person on a rope seat between two posts'),answer:ans,
    choices:ab('Rope','Both carry the same pull',ans,k=>k==='same'?'The person is closer to one post, so the two sides hang at different angles and share the weight unevenly.':'The side nearer the person hangs steeper and holds up more of the weight.'),
    explain:more==='same'?'The person sits in the middle, so both sides hang at the same angle and carry the same pull.':`Both sides pull sideways equally, but the side closer to the person (${f<0.5?'A':'B'}) is steeper and holds up more of the weight, so it carries more pull.`,params:{x0,x1,ty,px,py,ask}});
}

/* ---- rope angle pulling a cart ---- */
function genRopeAngle(seed,diff){
  const R=RNG(seed);const ask=R.pick(['easier','harder']);const eq=diff>=2&&R.chance(0.25);let aA=R.pick([10,15]),aB=R.pick([45,55]);if(eq)aB=aA;if(R.chance(.5))[aA,aB]=[aB,aA];
  let b='';[[aA,0,'A'],[aB,150,'B']].forEach(([a,oy,l],i)=>{const gy=oy+130;b+=ground(10,440,gy)+cartDraw(260,gy,110)+Rect(285,gy-58,50,28,'stone',3);const t=a*Math.PI/180,rise=52;const hx=260-rise/Math.tan(t),hy=gy-14-rise;
    b+=L(260,gy-14,hx,hy,'rope')+person(hx-8,gy,'walk',0.85)+T(400,gy-70,l,'lbl-L');});
  const flatter=aA===aB?'same':(aA<aB?'A':'B');const ans=flatter==='same'?'same':(ask==='easier'?flatter:flipAB(flatter));
  return mk({type:'ropeangle',sub:'Forces & angles',diff,stem:`Both carts and loads are the same. Which cart is ${ask==='easier'?'easier':'harder'} to pull along?`,svg:svgWrap(450,300,b,'two carts pulled by ropes at different angles'),answer:ans,
    choices:ab('Cart','Both the same',ans,k=>k==='same'?'The ropes pull at different angles. A steep rope wastes part of the pull lifting upward.':(eq?'':'A steep rope spends part of the pull lifting upward instead of moving the cart forward.')),
    explain:flatter==='same'?'Both ropes pull at the same angle, so they are equally easy.':`Only the forward part of the pull moves the cart. A flatter rope puts more of the pull forward; a steep rope wastes some of it pulling upward. Cart ${flatter} has the flatter rope, so it is easier to pull.`,params:{aA,aB,ask}});
}

/* ---- shovel grip ---- */
function genShovel(seed,diff){
  const R=RNG(seed);const ask=R.pick(['easier','harder']);const eq=diff>=3&&R.chance(0.2);let dA=R.pick([0.35,0.45]),dB=R.pick([0.7,0.8]);if(eq)dB=dA;if(R.chance(.5))[dA,dB]=[dB,dA];
  let b='';[[dA,0,'A'],[dB,220,'B']].forEach(([d,ox,l])=>{const bx=ox+70,by=170,tx=ox+200,ty=40;b+=Poly([[bx-46,by+8],[bx+22,by+8],[bx+26,by-8],[bx-50,by-8]],'metal')+`<path class="load" d="M${bx-46} ${by-8} Q${bx-14} ${by-40} ${bx+20} ${by-8} Z"/>`;
    b+=L(bx+18,by-6,tx,ty,'pole');const hx=bx+18+(tx-bx-18)*d,hy=by-6+(ty-by+6)*d;b+=C(tx-4,ty+4,8,'knob')+C(hx,hy,8,'knob')+T(ox+110,by+40,'Grip '+l,'lbl-b');});
  const better=dA===dB?'same':(dA<dB?'A':'B');const ans=better==='same'?'same':(ask==='easier'?better:flipAB(better));
  return mk({type:'shovel',sub:'Levers & balance',diff,stem:`The top hand stays at the end of the handle. With which grip is it ${ask} to lift the same shovelful?`,svg:svgWrap(440,230,b,'two shovels with the lower hand in different places'),answer:ans,
    choices:ab('Grip','Both the same',ans,k=>k==='same'?'The lower hand is in a different place on each shovel, which changes the leverage.':'The top hand acts as the pivot. The closer the lower (lifting) hand is to the blade, the less force it needs.'),
    explain:better==='same'?'The hands are in the same places on both shovels, so the lift is the same.':`The top hand acts as the pivot and the lower hand does the lifting. The closer the lower hand is to the load on the blade, the better the leverage, so grip ${better} is easier.`,params:{dA,dB,ask}});
}

/* ---- board on edge vs flat ---- */
function genBeamEdge(seed,diff){
  const R=RNG(seed);const ask=R.pick(['strong','sag']);const edge=R.pick(['A','B']);let b='';
  ['A','B'].forEach((l,i)=>{const oy=i*150,y=oy+80;const isE=l===edge;const th=isE?36:12;b+=Rect(40,y,320,th,'beam',2);
    [70,330].forEach(x=>{b+=L(x-18,y+th+60,x,y+th,'leg')+L(x+18,y+th+60,x,y+th,'leg')+Rect(x-24,y+th,48,6,'wood');});
    const ex=400,ey=y+th/2;b+=Rect(isE?ex-6:ex-18,isE?ey-18:ey-6,isE?12:36,isE?36:12,'beam')+T(ex,y-14,'end view','lbl-s');
    b+=L(200,y+th,200,y+th+30,'rope')+Rect(186,y+th+30,28,22,'load',2)+T(20,y+th/2+6,l,'lbl-L','start');});
  const ans=ask==='strong'?edge:flipAB(edge);
  return mk({type:'beamedge',sub:'Beams & supports',diff,stem:ask==='strong'?'The two boards are identical; one lies flat and one stands on its edge. Which can safely hold more weight in the middle?':'The two boards are identical; one lies flat and one stands on its edge. With the same weight hung in the middle, which board bends more?',
    svg:svgWrap(450,345,b,'two identical boards across sawhorses, one flat and one on edge'),answer:ans,
    choices:ab('Board','Both the same',ans,k=>k==='same'?'Turning a board on edge makes it much stiffer and stronger, even though it is the same board.':'A board standing on its edge is much deeper top to bottom, so it resists bending far better than the same board lying flat.'),
    explain:'Stiffness depends mostly on how deep the board is from top to bottom. On edge, the board is deep, so it bends much less and holds more (that’s why floor joists stand on edge). Laid flat, it is thin top to bottom and sags easily.',params:{edge,ask,w:3,t:1}});
}

/* ---- crane boom angle ---- */
function genCrane(seed,diff){
  const R=RNG(seed);const ask=R.pick(['tip','safe']);const eq=diff>=2&&R.chance(0.2);let aA=R.pick([25,35]),aB=R.pick([60,70]);if(eq)aB=aA;if(R.chance(.5))[aA,aB]=[aB,aA];const L0=170;
  let b='';[[aA,0,'A'],[aB,240,'B']].forEach(([a,ox,l])=>{const gy=260,px=ox+60,py=gy-50;b+=ground(ox+10,ox+230,gy)+Rect(ox+20,gy-24,90,20,'track',6)+Rect(ox+30,gy-54,70,30,'carbody',3);
    const t=a*Math.PI/180,ex=px+L0*Math.cos(t),ey=py-L0*Math.sin(t);b+=L(px,py,ex,ey,'strut')+L(ex,ey,ex,Math.min(gy-40,ey+70),'rope')+Rect(ex-14,Math.min(gy-40,ey+70),28,22,'load',2)+T(ox+60,gy+24,'Crane '+l,'lbl-b');});
  const reachA=Math.cos(aA*Math.PI/180),reachB=Math.cos(aB*Math.PI/180);const tip=Math.abs(reachA-reachB)<1e-9?'same':(reachA>reachB?'A':'B');const ans=tip==='same'?'same':(ask==='tip'?tip:flipAB(tip));
  return mk({type:'crane',sub:'Center of gravity',diff,stem:`The cranes, booms and loads are identical. Which crane is ${ask==='tip'?'more likely to tip over':'safer from tipping'}?`,svg:svgWrap(480,290,b,'two cranes with booms at different angles'),answer:ans,
    choices:ab('Crane','Both the same',ans,k=>k==='same'?'The booms are at different angles, so the loads hang at different distances out from the crane.':'A lower (flatter) boom holds the load farther out from the crane, which gives it more leverage to tip the crane.'),
    explain:tip==='same'?'Both booms are at the same angle, so the loads hang the same distance out. The tipping risk is the same.':`A crane tips when the load’s leverage beats the crane’s weight. The flatter boom on crane ${tip} holds the load farther out, so crane ${tip} is more likely to tip.`,params:{aA,aB,ask}});
}

Object.assign(GENS,{wheels2:genWheels2,gearturns:genGearTurns,drag:genDrag,twowinch:genTwoWinch,dropthrow:genDropThrow,planedrop:genPlaneDrop,mud:genMud,slopetip:genSlopeTip,polebal:genPoleBal,posture:genPosture,scissor:genScissor,truss:genTruss,hammock:genHammock,ropeangle:genRopeAngle,shovel:genShovel,beamedge:genBeamEdge,crane:genCrane});
CONCEPT_TYPES.push('wheels2','gearturns','drag','twowinch','dropthrow','planedrop','mud','slopetip','polebal','posture','scissor','truss','hammock','ropeangle','shovel','beamedge','crane');
