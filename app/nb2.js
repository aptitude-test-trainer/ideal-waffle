/* ================= new types, batch 2 ================= */
function ellArrow(cx,cy,rx,ry,t0,t1){const n=12;let d='';const pts=[];for(let i=0;i<=n;i++){const t=t0+(t1-t0)*i/n;pts.push([cx+rx*Math.cos(t),cy+ry*Math.sin(t)]);}
  d='M'+pts.map(p=>P(p[0])+' '+P(p[1])).join(' L');const a=pts[n-1],b=pts[n];const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);return `<path class="acc" d="${d}"/>`+head(b[0]+4*Math.cos(ang),b[1]+4*Math.sin(ang),ang,11);}

/* ---- bevel gears ---- */
function genBevel(seed,diff){
  const R=RNG(seed);const mode=diff===1?'VtoH':R.pick(['VtoH','HtoV']);const vcw=R.chance(.5);const hfront=R.pick(['l','r']);
  const hx=210,hy=210,rx=120,ry=38,th=16,rv=56,m=5.2;const vy=hy-ry-rv+6;let b='';
  /* where they touch (A's bottom, B's back edge) the teeth move together: A clockwise <=> B's front moves right. The ellipse outline starts at its right end and runs across the front first, so +flow = front moving left */
  const fr=mode==='VtoH'?vcw:hfront==='r',wA=fr?0.6:-0.6;
  b+=mvG(`rot:${P(hx)},${P(vy)},${wA}`,gearPath(hx,vy,rv,18,R.f()*6.28,m)+C(hx,vy,10,'hub'))+T(hx,vy+5,'A','glbl');
  b+=`<path class="gear" d="M${hx-rx} ${hy} L${hx-rx} ${hy+th} A${rx} ${ry} 0 0 0 ${hx+rx} ${hy+th} L${hx+rx} ${hy} Z"/>`+mvG(`flow:${mvN(-wA*rv)}`,`<ellipse class="gear" cx="${hx}" cy="${hy}" rx="${rx}" ry="${ry}"/>`);
  for(let k=0;k<28;k++){const t=k*2*Math.PI/28;b+=L(hx+(rx-10)*Math.cos(t),hy+(ry-4)*Math.sin(t),hx+rx*Math.cos(t),hy+ry*Math.sin(t),'ink-thin');}
  b+=`<ellipse class="hub" cx="${hx}" cy="${hy}" rx="18" ry="6"/>`+L(hx,hy+th,hx,hy+70,'shaft')+T(hx+34,hy+6,'B','glbl');
  let ans,stem,ch,params;
  if(mode==='VtoH'){b+=arcArrow(hx,vy,rv+16,-Math.PI/2,1.1,vcw);const labs=R.chance(.5)?{fl:'A',fr:'B'}:{fl:'B',fr:'A'};
    b+=ellArrow(hx,hy+th,rx+16,ry+22,Math.PI*0.62,Math.PI*0.9)+T(hx-rx-10,hy+ry+34,labs.fl,'lbl-L')+ellArrow(hx,hy+th,rx+16,ry+22,Math.PI*0.38,Math.PI*0.1)+T(hx+rx+10,hy+ry+34,labs.fr,'lbl-L');
    ans=vcw?'fr':'fl';stem='Gear A (standing up) turns in the direction of its arrow and drives the flat gear B underneath it. Which way does gear B turn?';
    ch=[{t:'Arrow '+labs.fl,key:'fl'},{t:'Arrow '+labs.fr,key:'fr'},{t:'It will not turn',key:'none'}].sort((x,y)=>x.t<y.t?-1:1);
    noteAll(ch,ans,k=>k==='none'?'Meshed bevel gears always turn each other; the teeth just meet at a right angle.':'Follow the teeth where the gears touch (at the back of gear B). Both gears move the same way there, so the front edge of gear B moves the opposite way.');params={mode,vcw,labs};}
  else{const dir=hfront==='r'?[Math.PI*0.38,Math.PI*0.1]:[Math.PI*0.62,Math.PI*0.9];b+=ellArrow(hx,hy+th,rx+16,ry+22,dir[0],dir[1]);
    ans=hfront==='r'?'cw':'ccw';stem='The flat gear B turns in the direction of the arrow and drives gear A, which stands on its back edge. Seen from the front, which way does gear A turn?';
    ch=[{t:'Clockwise',key:'cw'},{t:'Counterclockwise',key:'ccw'},{t:'It will not turn',key:'none'}];
    noteAll(ch,ans,k=>k==='none'?'Meshed bevel gears always turn each other.':'Where the gears touch (the back edge of B) the teeth move together. The back of B moves opposite to its front, and that sets which way the bottom of gear A moves.');params={mode,hfront};}
  return mk({type:'bevel',sub:'Bevel gears',diff,stem,svg:svgWrap(420,310,b,'two bevel gears meeting at a right angle'),choices:ch,answer:ans,
    explain:'Where two bevel gears touch, their teeth move in the same direction. Gear A touches the back edge of gear B, and the back of a turning disk always moves opposite to its front. So if the bottom of A moves right, the back of B moves right and the front of B moves left (and the other way round).',params});
}

/* ---- differential chain hoist ---- */
function genChainHoist(seed,diff){
  const R=RNG(seed);const pull=diff===1?'big':R.pick(['big','small']);const cx=200,cy=78,Rb=46,rs=28;const lx=cx+(Rb-rs)/2,ly=250,lr=(Rb+rs)/2;let b=ceiling(120,280,24)+L(cx,24,cx,cy,'strap');
  /* w>0 = wheels clockwise. Big wheel's right side moves down at Rb·w, small wheel's left side up at rs·w; the loop (and load) moves at the average (Rb−rs)·w/2 */
  const w=pull==='big'?-0.25:0.25,uy=(Rb-rs)*w/2;
  b+=mvG(`flow:${mvN(Rb*w)}`,C(cx,cy,Rb,'wheel'))+mvG(`flow:${mvN(rs*w)}`,C(cx,cy,rs,'drum'))+C(cx,cy,4,'dot');
  b+=mvG(mvSlide(lx,ly,0,uy*9),mvG(`flow:${mvN(Rb*w-uy)}`,L(cx+Rb,cy,cx+Rb,ly,'chain'))+mvG(`flow:${mvN(-rs*w-uy)}`,L(cx-rs,cy,lx-lr,ly,'chain'))+C(lx,ly,lr,'sheave')+C(lx,ly,3,'dot')+mvG(`flow:${mvN(-w*lr)}`,`<path class="chain" d="M${lx-lr} ${ly} A${lr} ${lr} 0 0 0 ${lx+lr} ${ly}"/>`)+L(lx,ly+lr,lx,ly+lr+16,'strap')+Rect(lx-30,ly+lr+16,60,40,'load',3));
  const hy=372;b+=mvG(`flow:${mvN(-Rb*w)}`,`<path class="chain" style="stroke:var(--muted)" d="M${cx-Rb} ${cy} L${cx-Rb} ${hy} Q${cx-Rb} ${hy+22} ${cx-Rb-30} ${hy+22} Q${cx-Rb-60} ${hy+22} ${cx-Rb-60} ${hy-10} L${cx-Rb-60} ${hy-40} Q${cx-Rb-60} ${cy+30} ${cx+rs} ${cy+2}"/>`);
  const px=pull==='big'?cx-Rb:cx-Rb-60,py=hy-60;b+=arrow(px-18,py-20,px-18,py+30)+T(px-22,py+48,'pull','lbl-acc','end');
  const ans=pull==='big'?'up':'down';const ch=[{t:'The load goes up',key:'up'},{t:'The load goes down',key:'down'},{t:'The load does not move',key:'none'}];
  noteAll(ch,ans,k=>k==='none'?'The two wheels are different sizes, so turning them always winds on more chain on one side than it lets out on the other.':'Pulling this strand turns the joined wheels the other way. Work out which side winds chain on: the big wheel winds on more per turn than the small one lets out.');
  return mk({type:'chainhoist',sub:'Differential hoists',diff,stem:'The big and small chain wheels at the top are joined and turn together. The grey hand chain is pulled down at the arrow. What happens to the load?',svg:svgWrap(400,420,b,'differential chain hoist'),choices:ch,answer:ans,
    explain:pull==='big'?'Pulling the strand hanging from the big wheel turns both wheels so the big wheel winds its load chain up while the small wheel lets its load chain down. The big wheel winds more per turn than the small one lets out, so the loop under the load gets shorter and the load rises slowly.':'Pulling the strand that feeds the small wheel turns both wheels the other way: now the big wheel lets out more chain than the small one takes up, so the loop under the load gets longer and the load goes down.',params:{pull}});
}

/* ---- which plank balances ---- */
function genBalFig(seed,diff){
  const R=RNG(seed);const good=R.int(0,3);const figs=[];const seen=new Set();
  while(figs.length<4){const i=figs.length;let cL,dL,cR,dR;
    if(i===good){for(;;){cL=R.int(1,3);dL=R.int(1,4);cR=R.int(1,3);if((cL*dL)%cR)continue;dR=cL*dL/cR;if(dR<1||dR>4||(cL===cR&&diff>=3&&R.chance(0.7)))continue;break;}}
    else{for(;;){cL=R.int(1,3);dL=R.int(1,4);cR=R.int(1,3);dR=R.int(1,4);if(cL*dL===cR*dR)continue;if(Math.abs(cL*dL-cR*dR)>2&&R.chance(0.6))continue;break;}}
    const k=[cL,dL,cR,dR].join();if(seen.has(k))continue;seen.add(k);if(R.chance(.5))figs.push({cL,dL,cR,dR});else figs.push({cL:cR,dL:dR,cR:cL,dR:dL});}
  let b='';const pw=200,s=22;figs.forEach((f,i)=>{const ox=(i%2)*(pw+30),oy=Math.floor(i/2)*150,cx=ox+pw/2,by=oy+96;const mL=f.cL*f.dL,mR=f.cR*f.dR,tl=`tilt:${P(cx)},${P(by+8)},${mL>mR?-12:mL<mR?12:0}`;b+=`<g class="mv" data-a="${tl}">`+Rect(cx-4.5*s,by,9*s,8,'plank',2);for(let t=-4;t<=4;t++)b+=L(cx+t*s,by+8,cx+t*s,by+12,'dim');b+='</g>';
    b+=Poly([[cx,by+8],[cx-14,by+40],[cx+14,by+40]],'fulcrum')+ground(cx-34,cx+34,by+40);
    const stack=(x,c)=>{let g='';for(let j=0;j<c;j++)g+=Rect(x-9,by-18*(j+1),18,18,'load',2);return g;};b+=mvG(tl,stack(cx-f.dL*s,f.cL)+stack(cx+f.dR*s,f.cR))+T(ox+10,oy+30,LET[i],'lbl-L','start');});
  const ans=LET[good];const ch=[0,1,2,3].map(i=>({t:'Plank '+LET[i],key:LET[i]}));
  noteAll(ch,ans,k=>{const f=figs[LET.indexOf(k)];return `Here the ${f.cL*f.dL>f.cR*f.dR?'left':'right'} side has more turning effect (blocks × distance from the pivot), so this plank tips.`;});
  return mk({type:'balfig',sub:'Levers & balance',diff,stem:'All the blocks are identical. Each plank is held level and then let go. Which plank stays level?',svg:svgWrap(2*pw+40,300,b,'four planks on pivots with stacks of blocks'),choices:ch,answer:ans,
    explain:`A plank balances when the turning effect is the same on both sides: the number of blocks times their distance from the pivot (count the tick marks). Plank ${ans} is the only one where both sides match.`,params:{figs}});
}

/* ---- ice in pitchers ---- */
function genPitchers(seed,diff){
  const R=RNG(seed);const v=R.chance(0.55)?'equal':'crushed';const cr=R.pick(['A','B']);let b='';
  ['A','B'].forEach((l,i)=>{const ox=40+i*200,top=60,bot=240;b+=`<path class="glass" d="M${ox} ${top} L${ox+10} ${bot} L${ox+110} ${bot} L${ox+120} ${top}"/>`+`<path class="glass" style="fill:none" d="M${ox+118} ${top+30} Q${ox+160} ${top+40} ${ox+150} ${top+100} Q${ox+144} ${top+130} ${ox+114} ${top+140}"/>`;
    b+=Poly([[ox+4,top+30],[ox+116,top+30],[ox+109,bot-2],[ox+11,bot-2]],'water');
    if(v==='crushed'&&l===cr){for(let j=0;j<16;j++)b+=Rect(ox+14+(j%8)*12+(j>7?5:0),top+34+Math.floor(j/8)*11,9,8,'ice',1);}else{for(let j=0;j<3;j++)b+=Rect(ox+18+j*30,top+34,24,22,'ice',2);}
    b+=T(ox+60,bot+26,'Pitcher '+l,'lbl-b');});
  const ans=v==='equal'?'same':cr;
  return mk({type:'pitchers',sub:'Heat & melting',diff,stem:v==='equal'?'The pitchers hold the same water at the same temperature, with the same amount of ice in the same size cubes. In which pitcher does the ice melt first?':'The pitchers hold the same water at the same temperature and the same amount of ice. In one, the ice is broken into small pieces. In which pitcher does the ice melt first?',
    svg:svgWrap(420,280,b,'two pitchers of water with ice'),answer:ans,
    choices:ab('Pitcher','At the same time',ans,k=>k==='same'?'The same amount of ice melts faster when it is broken up, because more of its surface touches the water.':(v==='equal'?'Everything that matters is the same: water, temperature, amount and size of ice. Small differences in where the cubes float don’t change the melting time.':'Small pieces have more surface touching the water, so they soak up heat faster.')),
    explain:v==='equal'?'Same water, same temperature and the same ice in the same size cubes: nothing that affects melting is different, so both melt at the same time.':`The same amount of ice melts faster when it is broken up, because more of its surface touches the warm water. Pitcher ${cr} has the crushed ice.`,params:{v,cr}});
}

/* ---- spring on a lever ---- */
function genSpringLever(seed,diff){
  const R=RNG(seed);const thru=R.pick(['A','B']);const ask=R.pick(['cannot','can']);let b='';const geo={};
  ['A','B'].forEach((l,i)=>{const ox=i*220,px=ox+70,py=150,ang=R.pick([-0.5,-0.3,0.3,0.5]);const Lv=90;const ex=px+Lv*Math.cos(ang),ey=py+Lv*Math.sin(ang);
    b+=L(px-30*Math.cos(ang),py-30*Math.sin(ang),ex,ey,'crank')+C(px,py,7,'pin')+C(px,py,2.5,'dot');let ax,ay;
    if(l===thru){ax=ex+60*Math.cos(ang);ay=ey+60*Math.sin(ang);}else{const t=ang+(R.chance(.5)?1:-1)*Math.PI/2;ax=ex+60*Math.cos(t);ay=ey+60*Math.sin(t);}
    const d=Math.hypot(ax-ex,ay-ey),ux=(ax-ex)/d,uy=(ay-ey)/d;let pth=`M${P(ex)} ${P(ey)}`;const n=10;for(let k=1;k<n;k++){const s=d*k/n,o=(k%2?7:-7);pth+=` L${P(ex+ux*s-uy*o)} ${P(ey+uy*s+ux*o)}`;}pth+=` L${P(ax)} ${P(ay)}`;
    b+=`<path class="spring" d="${pth}"/>`+Rect(ax-6,ay-6,12,12,'metal')+C(ex,ey,3.5,'dot')+T(px-24,py-22,l,'lbl-L');geo[l]={pivot:[px,py],end:[ex,ey],anchor:[ax,ay]};});
  const ans=ask==='cannot'?thru:flipAB(thru);
  return mk({type:'springlever',sub:'Levers & leverage',diff,stem:`Each lever turns on the pin at the circle, and a stretched spring pulls on its end. Which spring ${ask==='cannot'?'cannot turn the lever at all':'can turn the lever'}?`,svg:svgWrap(440,300,b,'two levers pulled by springs'),answer:ans,
    choices:ab('Lever','Both',ans,k=>k==='same'?(ask==='cannot'?'One spring pulls at an angle to its lever, so it can turn it.':'One spring pulls straight along the lever toward the pin, so it cannot turn it.'):(ask==='cannot'?'This spring pulls at an angle to the lever, so it has leverage about the pin and can turn it.':'This spring pulls straight along the lever, in line with the pin, so it has no leverage.')),
    explain:`A pull can only turn a lever if its line passes to one side of the pin. On lever ${thru} the spring pulls straight along the lever, in line with the pin, so it has no leverage and cannot turn it; the other spring pulls at an angle and can.`,params:{geo,ask}});
}

/* ---- dam shape ---- */
function genDam(seed,diff){
  const R=RNG(seed);const good=R.pick(['A','B']);const other=R.pick(['down','straight']);const ask=R.pick(['stronger','weaker']);let b='';
  ['A','B'].forEach((l,i)=>{const ox=i*220;b+=Rect(ox+10,40,200,90,'water');for(let k=0;k<5;k++)b+=`<path class="ink-thin" style="fill:none" d="M${ox+30+k*36} ${70+(k%2)*22} q8 -6 16 0 t16 0"/>`;
    b+=Rect(ox+10,40,40,210,'concrete')+Rect(ox+170,40,40,210,'concrete');const kind=l===good?'up':other;const y=130;
    const d=kind==='up'?`M${ox+50} ${y} Q${ox+110} ${y-60} ${ox+170} ${y}`:kind==='down'?`M${ox+50} ${y} Q${ox+110} ${y+60} ${ox+170} ${y}`:`M${ox+50} ${y} L${ox+170} ${y}`;
    b+=`<path class="wall" style="stroke-width:9;fill:none" d="${d}"/>`+T(ox+110,275,'Dam '+l,'lbl-b');});
  b+=T(220,30,'water side (seen from above)','lbl-s');const ans=ask==='stronger'?good:flipAB(good);
  return mk({type:'dam',sub:'Structures & shapes',diff,stem:`Seen from above, the water is at the top and each dam spans the same gorge. Which dam is ${ask}?`,svg:svgWrap(440,290,b,'two dams seen from above'),answer:ans,
    choices:ab('Dam','Both are equally strong',ans,k=>k==='same'?'The shape matters. An arch that bulges toward the water pushes the load into the rock walls.':'An arch bulging toward the water is squeezed together by the water and passes the push into the rock sides.'),
    explain:`A dam curved like an arch with its bulge toward the water turns the water’s push into squeezing along the arch, which passes into the solid rock on both sides. Stone and concrete are very strong when squeezed. Dam ${good} is shaped that way; a straight dam or one bent the other way has to resist bending instead.`,params:{good,ask}});
}

/* ---- caster wheels ---- */
function genCaster(seed,diff){
  const R=RNG(seed);const off=R.chance(.5)?1:-1;const labA=R.chance(.5)?-1:1;const gy=220;let b=ground(20,420,gy)+`<g class="mv" data-a="mov:${-off*60},0">`+Rect(90,110,260,40,'carbody',4);
  [130,310].forEach(x=>{b+=L(x,150,x,176,'rod')+C(x,176,4,'dot');const wx=x+off*18;b+=L(x,176,wx,gy-18,'crank')+C(wx,gy-18,18,'wheel')+C(wx,gy-18,3,'dot');});
  b+='</g>'+arrow(220,80,220+labA*-90,80)+T(220+labA*-110,86,'A','lbl-L')+arrow(220,80,220+labA*90,80)+T(220+labA*110,86,'B','lbl-L');
  const moved=-off;const ans=moved===-labA?'A':'B';
  const ch=[{t:'Toward A',key:'A'},{t:'Toward B',key:'B'},{t:'You can’t tell',key:'same'}];noteAll(ch,ans,k=>k==='same'?'You can tell: swivel wheels always swing around to trail behind their posts.':'Swivel wheels trail behind their posts. The wheels here are behind the posts on this side, so the cart moved the other way.');
  return mk({type:'caster',sub:'Everyday mechanics',diff,stem:'The cart has swivel wheels (casters) like a shopping cart. It was just pushed and has stopped. Which way was it pushed?',svg:svgWrap(440,240,b,'cart with swivel wheels'),choices:ch,answer:ans,
    explain:'A swivel wheel always swings around so it trails behind its post, like a shopping-cart wheel. Both wheels sit on the same side of their posts, so the cart was moving toward the other side.',params:{off,labA}});
}

/* ---- rudder ---- */
function genRudder(seed,diff){
  const R=RNG(seed);const s=R.chance(.5)?1:-1;const cx=210,cy=250;let b=Rect(0,0,420,400,'water');
  b+=`<g class="mv" data-a="rot:${cx+s*100},${cy-120},${mvN(s*Math.PI/3/9)}">`+`<path class="hull" d="M${cx} ${cy-110} Q${cx+44} ${cy-60} ${cx+40} ${cy+60} L${cx-40} ${cy+60} Q${cx-44} ${cy-60} ${cx} ${cy-110} Z"/>`;
  const rx=cx,ry=cy+60;b+=L(rx,ry,rx+s*16,ry+34,'crank')+C(rx,ry,4,'dot')+'</g>';
  const labs=R.chance(.5)?{l:'A',r:'B'}:{l:'B',r:'A'};b+=`<path class="path-acc" d="M${cx} ${cy-120} Q${cx} ${cy-190} ${cx-110} ${cy-200}"/>`+T(cx-126,cy-196,labs.l,'lbl-L')+`<path class="path-acc" d="M${cx} ${cy-120} Q${cx} ${cy-190} ${cx+110} ${cy-200}"/>`+T(cx+126,cy-196,labs.r,'lbl-L');
  b+=arrow(cx+80,cy+40,cx+80,cy-20,'acc')+T(cx+86,cy+60,'moving','lbl-s','start');
  const ans=s===1?'r':'l';const ch=[{t:'Path '+labs.l,key:'l'},{t:'Path '+labs.r,key:'r'},{t:'Straight ahead',key:'straight'}].sort((x,y)=>x.t<y.t?-1:1);
  noteAll(ch,ans,k=>k==='straight'?'A rudder turned to one side pushes the back of the boat sideways, so the boat turns.':'The water pushes the back of the boat away from the side the rudder points to, which swings the front toward that side.');
  return mk({type:'rudder',sub:'Steering',diff,stem:'Seen from above, the boat moves forward with its rudder turned as shown. Which way does it turn?',svg:svgWrap(420,400,b,'boat seen from above with an angled rudder'),choices:ch,answer:ans,
    explain:`The water flowing past hits the angled rudder and pushes the back of the boat the opposite way. The back of the boat swings ${s===1?'left':'right'}, so the front swings ${s===1?'right':'left'}: the boat turns toward the side the rudder’s back edge points to.`,params:{s,labs}});
}

/* ---- backing a trailer ---- */
function genTrailer(seed,diff){
  const R=RNG(seed);const want=R.pick(['left','right']);const cx=210;
  /* reversing with the front wheels steered to side sg: the truck pivots about a point on its rear-axle line (wheelbase 76, 25° steer -> 163 px out),
     its back (and the hitch) swings toward sg; the trailer (axle 90 behind the hitch, hitch 52 behind the truck axle) turns the other way. Small-angle rates. */
  const sg=want==='left'?1:-1,Wt=(12*Math.PI/180)/9;
  let b=`<g class="mv" data-a="rot:${cx+sg*163},138,${mvN(-sg*Wt)}">`+Rect(cx-34,40,68,120,'carbody',6)+Rect(cx-30,48,60,28,'metal',3);
  [[cx-38,62],[cx+38,62],[cx-38,138],[cx+38,138]].forEach(([x,y])=>b+=y===62?mvG(`tilt:${x},${y},${sg*25}`,Rect(x-6,y-14,12,28,'tire2',2)):Rect(x-6,y-14,12,28,'tire2',2));b+=L(cx,160,cx,190,'rod')+C(cx,190,5,'dot')+`<g class="mv" data-a="rot:${cx},190,${mvN(sg*Wt*(1+52/90))}">`+Rect(cx-44,190,88,130,'crate',4);
  [[cx-50,280],[cx+50,280]].forEach(([x,y])=>b+=Rect(x-6,y-14,12,28,'tire2',2));b+='</g></g>';
  const dx=want==='left'?-1:1;b+=`<path class="path-acc" d="M${cx} 330 Q${cx} 380 ${cx+dx*90} 390"/>`+head(cx+dx*96,390,dx>0?0:Math.PI,11)+T(cx,30,'front','lbl-s');
  const ans=want==='left'?'right':'left';const ch=[{t:'Turn the front wheels to the left',key:'left'},{t:'Turn the front wheels to the right',key:'right'},{t:'Keep the front wheels straight',key:'straight'}];
  noteAll(ch,ans,k=>k==='straight'?'With straight wheels the trailer just keeps backing straight.':'When backing up, the back of the truck swings the way the front wheels point, which pushes the hitch that way and sends the trailer the opposite way.');
  return mk({type:'trailer',sub:'Steering',diff,stem:`Seen from above, a truck is backing up with a trailer. The driver wants the back of the trailer to swing to the ${want} (dashed arrow). How should the front wheels be turned?`,svg:svgWrap(420,400,b,'truck and trailer seen from above'),choices:ch,answer:ans,
    explain:`When a truck backs up, its back end swings toward the side the front wheels are turned. That pushes the hitch that way, and the trailer pivots so its back end swings the opposite way. So to send the trailer ${want}, turn the front wheels to the ${ans}.`,params:{want}});
}

/* ---- smoothest seat ---- */
function genSmoothSeat(seed,diff){
  const R=RNG(seed);const ask=R.pick(['smooth','rough']);const gy=200,f=120,r=330;let b=ground(10,450,gy)+Rect(40,70,380,100,'carbody',8);
  [f,r].forEach(x=>b+=C(x,gy-26,26,'tire2')+C(x,gy-26,9,'hub'));const xs={front:f,mid:(f+r)/2,rear:410};const labs=R.shuffle(['A','B','C']);const keys=['front','mid','rear'];
  keys.forEach((k,i)=>{b+=Rect(xs[k]-14,112,28,34,'seat',3)+T(xs[k],100,labs[i],'lbl-L');});
  const d=k=>Math.abs(xs[k]-(f+r)/2);const best=keys.slice().sort((a,c)=>ask==='smooth'?d(a)-d(c):d(c)-d(a))[0];
  const ch=['A','B','C'].map(l=>({t:'Seat '+l,key:keys[labs.indexOf(l)]}));noteAll(ch,best,k=>ask==='smooth'?'Bumps rock the bus about a point between the axles. Seats farther from that point bounce more.':'Seats close to the middle between the axles move least; the one farthest out moves most.');
  return mk({type:'smoothseat',sub:'Everyday mechanics',diff,stem:`On a bumpy road, which seat gives the ${ask==='smooth'?'smoothest':'roughest'} ride?`,svg:svgWrap(460,220,b,'bus with three seats'),choices:ch,answer:best,
    explain:'When the wheels hit bumps, the bus rocks front to back about a point roughly midway between the axles. A seat near that point barely moves up and down; seats out toward the ends, especially behind the rear axle, bounce the most.',params:{xs,f,r,ask}});
}

/* ---- flow tubes ---- */
function genFlowTube(seed,diff){
  const R=RNG(seed);const eq=diff>=2&&R.chance(0.2);let hA=R.pick([30,40]),hB=R.pick([70,85]);if(eq)hB=hA;if(R.chance(.5))[hA,hB]=[hB,hA];let b='';
  [[hA,0,'A'],[hB,220,'B']].forEach(([h,ox,l])=>{const sy=150;b+=Rect(ox+10,sy,200,90,'water')+L(ox+10,sy,ox+210,sy,'surface')+L(ox+10,240,ox+210,240,'ground');
    for(const y of [175,205,228])b+=arrow(ox+150,y,ox+96,y,'acc');const tx=ox+70;b+=Rect(tx-3,sy-h,6,h+59,'water')+Rect(tx+3,209,34,6,'water')+`<path class="ink" style="fill:none;stroke-width:2" d="M${tx-6} ${sy-110} L${tx-6} 218 L${tx+38} 218 M${tx+6} ${sy-110} L${tx+6} 206 L${tx+38} 206"/>`+L(tx-12,sy-h,tx+12,sy-h,'ink');
    b+=T(ox+110,270,'Stream '+l,'lbl-b');});
  const ans=Math.abs(hA-hB)<1e-9?'same':(hA>hB?'A':'B');
  return mk({type:'flowtube',sub:'Fluids & pressure',diff,stem:'A bent glass tube faces into each stream, and water rises up inside it above the surface. Which stream is flowing faster?',svg:svgWrap(440,285,b,'two streams with bent tubes facing the current'),answer:ans,
    choices:ab('Stream','Both flow at the same speed',ans,k=>k==='same'?'The water stands at different heights in the tubes, so the streams hit them with different force.':'The faster the current rams into the tube’s opening, the higher it pushes the water up the tube.'),
    explain:ans==='same'?'The water stands at the same height in both tubes, so both currents push equally hard: the same speed.':`Moving water pushing into the open end of the tube forces water up inside it. The faster the current, the harder it pushes and the higher the water stands. It stands higher in stream ${ans}’s tube.`,params:{hA,hB}});
}

/* ---- hot water loop ---- */
function genHotLoop(seed,diff){
  const R=RNG(seed);const topLab=R.pick(['A','B']);const ask=R.pick(['hot','cool']);let b=Rect(60,200,90,90,'metal',4)+`<path class="load" style="fill:#E8742A" d="M85 280 Q95 250 105 270 Q112 240 122 272 Q128 258 132 280 Z"/>`;
  b+=Rect(260,40,110,130,'glass')+Rect(262,60,106,108,'water');b+=`<path class="tube" d="M130 200 L130 120 L260 120"/><path class="tube" d="M140 270 L220 270 L220 160 L260 160"/>`;
  b+=T(180,112,topLab,'lbl-L')+T(236,262,flipAB(topLab),'lbl-L')+T(105,318,'stove','lbl-s')+T(315,190,'tank','lbl-s');
  const ans=ask==='hot'?topLab:flipAB(topLab);
  return mk({type:'hotloop',sub:'Heat & convection',diff,stem:`Water circulates on its own between the stove and the tank through pipes A and B. Which pipe carries the ${ask==='hot'?'hotter':'cooler'} water?`,svg:svgWrap(400,330,b,'stove heating water that flows to a tank'),answer:ans,
    choices:ab('Pipe','Both the same',ans,k=>k==='same'?'The water heated in the stove rises out of the top; cooler water sinks back in at the bottom.':'Hot water is lighter and rises out of the top of the stove; cooled water sinks back into the bottom.'),
    explain:'Heated water expands and gets lighter, so it rises out of the top of the stove and into the tank. Cooler, heavier water sinks from the tank back down into the bottom of the stove. The top pipe carries hot water, the lower pipe carries cooler water.',params:{topLab,ask}});
}

/* ---- pipe capacity ---- */
function genPipeCap(seed,diff){
  const R=RNG(seed);const v=diff===1?'two':R.pick(['two','four','two']);const r=16;const big={n:1,r:2*r},small={n:v==='four'?4:2,r};const aIsSmall=R.chance(.5);const A=aIsSmall?small:big,B=aIsSmall?big:small;let b='';
  [[A,0,'A'],[B,220,'B']].forEach(([p,ox,l])=>{const cx=ox+110,cy=110;if(p.n===1)b+=C(cx,cy,p.r,'pipe')+C(cx,cy,p.r-5,'water');else if(p.n===2){[-1,1].forEach(s=>b+=C(cx+s*p.r,cy,p.r,'pipe')+C(cx+s*p.r,cy,p.r-4,'water'));}else{[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sy])=>b+=C(cx+sx*p.r,cy+sy*p.r,p.r,'pipe')+C(cx+sx*p.r,cy+sy*p.r,p.r-4,'water'));}
    b+=hdim(cx-2*r,cx+2*r,cy+2*r+22,'')+T(cx,210,'Pipe'+(p.n>1?'s ':' ')+l,'lbl-b');});
  b+=T(220,26,'pipe openings seen end-on','lbl-s');
  const aA=A.n*A.r*A.r,aB=B.n*B.r*B.r;const ans=aA===aB?'same':(aA>aB?'A':'B');
  return mk({type:'pipecap',sub:'Fluids & pressure',diff,stem:'The pipe openings are shown end-on; the brackets under each side are the same width. Water flows through every pipe at the same speed. Which side carries more water?',svg:svgWrap(440,230,b,'pipe openings seen end-on'),answer:ans,
    choices:ab('Side','Both carry the same',ans,k=>k==='same'?'The openings have different total areas. A pipe twice as wide has four times the opening, not twice.':'Doubling a pipe’s width gives it four times the opening. Compare the total opening area, not the width.'),
    explain:ans==='same'?'A pipe twice as wide has four times the opening area, so it carries exactly as much as four of the smaller pipes.':`A pipe twice as wide has four times the opening area, so it carries as much as four of the small pipes, which is more than two of them. Side ${ans} has more total opening.`,params:{A,B}});
}

/* ---- parachutes ---- */
function genParachute(seed,diff){
  const R=RNG(seed);const ask=diff===1?'speed':R.pick(['speed','first']);let hA=R.pick([80,100]),hB=R.pick([190,210]);if(R.chance(.5))[hA,hB]=[hB,hA];const gy=300;let b=ground(10,430,gy);
  const drop=Math.min(hA,hB)-56;[[hA,110,'A'],[hB,320,'B']].forEach(([h,x,l])=>{const y=gy-h;b+=mvG(mvSlide(x,y,0,drop),`<path class="load" d="M${x-30} ${y} Q${x} ${y-36} ${x+30} ${y} Z"/>`+L(x-30,y,x,y+30,'string')+L(x+30,y,x,y+30,'string')+C(x,y+34,5,'person')+L(x,y+38,x,y+52,'personl'))+L(x,y+52,x,gy-4,'opt')+T(x+40,y,l,'lbl-L','start');});
  const ans=ask==='speed'?'same':(hA<hB?'A':'B');
  return mk({type:'parachute',sub:'Falling & thrown objects',diff,stem:ask==='speed'?'Two identical parachutists with identical open parachutes are coming down from different heights. Which is falling faster just before touching the ground?':'Two identical parachutists with open parachutes start coming down at the same moment from the heights shown. Which lands first?',
    svg:svgWrap(440,320,b,'two parachutists at different heights'),answer:ans,
    choices:ab('Parachutist','Both the same',ans,k=>k==='same'?'They start the same way but one has farther to fall, so it takes longer.':(ask==='speed'?'Once a parachute is open, air resistance holds it to a steady top speed. Starting higher doesn’t make it land faster.':'They fall at the same steady speed, so the one with less distance to go lands first.')),
    explain:ask==='speed'?'With the parachute open, air resistance quickly balances the weight and the jumper falls at a steady top speed. Identical jumpers reach the same speed, no matter how high they started.':`Both fall at the same steady speed, so the one closer to the ground (${ans}) lands first.`,params:{hA,hB,ask}});
}

/* ---- sound ---- */
function genSound(seed,diff){
  const R=RNG(seed);const v=R.pick(['bells','strings','bottles','tunnel']);let b='',ans,stem,explain,params,noteF;
  if(v==='tunnel'){const inT=R.pick(['A','B']);['A','B'].forEach((l,i)=>{const oy=i*130;b+=L(10,oy+110,430,oy+110,'road');if(l===inT)b+=`<path class="concrete" d="M90 ${oy+110} L90 ${oy+40} Q220 ${oy-10} 350 ${oy+40} L350 ${oy+110} L336 ${oy+110} L336 ${oy+48} Q220 ${oy+6} 104 ${oy+48} L104 ${oy+110} Z"/>`;
      b+=cartDraw(180,oy+110,80)+T(24,oy+70,l,'lbl-L','start')+`<path class="opt" d="M268 ${oy+80} q8 -8 0 -16 M276 ${oy+86} q14 -14 0 -28"/>`;});
    ans=inT;stem='The same car sounds the same horn in both places. Where does the horn sound louder to the driver?';explain='In the tunnel the walls and roof bounce the sound back instead of letting it spread out into open air, so more of it reaches the driver and it sounds louder.';params={v,inT};noteF='Hard walls close around the car reflect the sound back, making it louder.';
    return mk({type:'sound',sub:'Sound',diff,stem,svg:svgWrap(440,250,b,'car on an open road and in a tunnel'),answer:ans,choices:ab('Place','Just as loud in both',ans,k=>noteF),explain,params});}
  const ask=R.pick(['high','low']);const small=R.pick(['A','B']);
  if(v==='bells'){['A','B'].forEach((l,i)=>{const s=l===small?0.6:1,cx=110+i*220,top=60;b+=`<path class="metal" d="M${cx-60*s} ${top+120*s} Q${cx-50*s} ${top} ${cx} ${top} Q${cx+50*s} ${top} ${cx+60*s} ${top+120*s} Z"/>`+C(cx,top+124*s,8*s,'ball2')+T(cx,250,'Bell '+l,'lbl-b');});
    stem=`The bells are made of the same metal and shaped alike. Which rings with a ${ask==='high'?'higher':'lower'} note?`;explain='A smaller bell vibrates faster, which makes a higher note. A big bell vibrates slowly and rings low.';}
  else if(v==='strings'){['A','B'].forEach((l,i)=>{const oy=40+i*90,len=l===small?180:340;b+=Rect(30,oy,400,40,'wood',4)+Rect(46,oy-8,10,56,'metal')+Rect(46+len,oy-8,10,56,'metal')+L(56,oy+20,46+len,oy+20,'cable')+T(18,oy+26,l,'lbl-L','end');});
    stem=`The strings are the same kind and pulled equally tight. Which one plays a ${ask==='high'?'higher':'lower'} note when plucked?`;explain='A shorter string vibrates faster and gives a higher note; a longer one vibrates slower and gives a lower note.';}
  else{['A','B'].forEach((l,i)=>{const cx=120+i*200,top=50,bot=250,lvl=l===small?100:200;b+=Rect(cx-36,lvl,72,bot-lvl,'water')+`<path class="bottle" style="fill:none" d="M${cx-10} ${top} L${cx-10} ${top+30} Q${cx-36} ${top+44} ${cx-36} ${top+70} L${cx-36} ${bot} L${cx+36} ${bot} L${cx+36} ${top+70} Q${cx+36} ${top+44} ${cx+10} ${top+30} L${cx+10} ${top}"/>`+T(cx,bot+24,'Bottle '+l,'lbl-b');});
    b+=arrow(60,40,98,48,'acc');stem=`You blow across the top of each identical bottle. Which gives a ${ask==='high'?'higher':'lower'} note?`;explain='Blowing across the top makes the air inside vibrate. The more water in the bottle, the shorter the column of air, and a shorter air column gives a higher note.';}
  ans=ask==='high'?small:flipAB(small);const H={bells:260,strings:230,bottles:285}[v];
  return mk({type:'sound',sub:'Sound',diff,stem,svg:svgWrap(440,H,b,'two sound sources of different size'),answer:ans,
    choices:ab(v==='bells'?'Bell':v==='strings'?'String':'Bottle','The same note',ans,k=>k==='same'?'They are different sizes, so they vibrate at different speeds and give different notes.':'Smaller, shorter things vibrate faster and give higher notes.'),explain,params:{v,small,ask}});
}

/* ---- venting a jar ---- */
function genVent(seed,diff){
  const R=RNG(seed);const vent=R.int(0,2);let b='';
  for(let i=0;i<3;i++){const cx=80+i*140,top=40;b+=Rect(cx-40,top,80,120,'water')+`<path class="glass" style="fill:none" d="M${cx-40} ${top} L${cx+40} ${top} L${cx+40} ${top+120} L${cx+8} ${top+120} M${cx-8} ${top+120} L${cx-40} ${top+120} Z"/>`;
    b+=L(cx,top+120,cx,top+200,'tube')+Rect(cx-50,top+200,100,40,'glass');if(i===vent)b+=`<path class="tube" style="stroke-width:3" d="M${cx+30} ${top+20} L${cx+30} ${top-20} L${cx+60} ${top-20}"/>`;
    b+=T(cx,top+270,LET[i],'lbl-L');}
  const ans=LET[vent];const ch=[0,1,2].map(i=>({t:'Jar '+LET[i],key:LET[i]}));noteAll(ch,ans,k=>'This jar is sealed at the top. For water to run out, air has to get in to take its place, and there is no way in.');
  return mk({type:'vent',sub:'Air pressure',diff,stem:'Each closed jar is full of water with a narrow pipe leading down into a basin. The taps are opened. Which jar empties?',svg:svgWrap(420,340,b,'three sealed jars draining into basins'),choices:ch,answer:ans,
    explain:`Water can only run out of a closed jar if air can get in to fill the space. Jar ${ans} has a small air pipe at the top, so air enters and the water drains. In the sealed jars, the air pressure outside holds the water in the narrow pipe.`,params:{vent}});
}

/* ---- candle under a jar ---- */
function candleScene(ox,risen,flame){const w=180,base=ox+10;let b=Rect(base+10,risen?150:200,w-20,60,'water');b=Rect(base+10,200,w-20,60,'water')+(risen?Rect(base+56,150,68,50,'water'):'');
  b+=`<path class="glass" style="fill:none" d="M${base} 170 L${base} 262 L${base+w} 262 L${base+w} 170"/>`+`<path class="glass" style="fill:none" d="M${base+54} 262 L${base+54} 90 Q${base+54} 76 ${base+68} 76 L${base+112} 76 Q${base+126} 76 ${base+126} 90 L${base+126} 262"/>`;
  b+=Rect(base+78,170,24,40,'wood')+L(base+90,170,base+90,160,'ink');if(flame)b+=`<path class="load" style="fill:#E8742A" d="M${base+90} 140 Q${base+100} 156 ${base+90} 162 Q${base+80} 156 ${base+90} 140 Z"/>`;return b;}
function genCandle(seed,diff){
  const R=RNG(seed);const v=R.pick(['ask','pic']);
  if(v==='ask'){const b=candleScene(110,false,true);const ch=[{t:'The water inside the jar rises',key:'up'},{t:'The water inside the jar goes down',key:'down'},{t:'The water stays where it is',key:'same'}];noteAll(ch,'up',k=>'As the flame goes out, the air inside the jar cools and some of it has been used up, so the pressure inside drops and the outside air pushes water up into the jar.');
    return mk({type:'candle',sub:'Air pressure',diff,stem:'A lit candle stands in a dish of water and a glass jar is placed over it, open end down in the water. The candle burns for a while and goes out. What happens to the water inside the jar?',svg:svgWrap(420,280,b,'a jar over a candle standing in water'),choices:ch,answer:'up',
      explain:'The flame heats the air and uses up some of it. When the flame goes out, the air inside cools and shrinks, so the pressure in the jar drops below the air pressure outside, which pushes water up into the jar.',params:{v}});}
  const risen=R.pick(['A','B']);let b=candleScene(0,risen==='A',false)+candleScene(210,risen==='B',false)+T(100,290,'A','lbl-L')+T(310,290,'B','lbl-L');
  return mk({type:'candle',sub:'Air pressure',diff,stem:'A candle stood in a dish of water under a glass jar. It burned for a while and went out. Which picture shows the jar after the flame went out?',svg:svgWrap(420,300,b,'two jars over candles standing in water'),answer:risen,
    choices:ab('Picture','You can’t tell',risen,k=>k==='same'?'You can tell: after the flame goes out, water is pushed up into the jar.':'After the flame goes out, the air inside cools and the pressure drops, so water is pushed up into the jar. In this picture the water hasn’t risen.'),
    explain:'While burning, the flame heats the air and uses some of it. After it goes out, the air in the jar cools and its pressure drops, so the outside air pushes water up into the jar. Only the picture with raised water inside the jar can be after the flame went out.',params:{v,risen}});
}

Object.assign(GENS,{bevel:genBevel,chainhoist:genChainHoist,balfig:genBalFig,pitchers:genPitchers,springlever:genSpringLever,dam:genDam,caster:genCaster,rudder:genRudder,trailer:genTrailer,smoothseat:genSmoothSeat,flowtube:genFlowTube,hotloop:genHotLoop,pipecap:genPipeCap,parachute:genParachute,sound:genSound,vent:genVent,candle:genCandle});
CONCEPT_TYPES.push('bevel','chainhoist','balfig','pitchers','springlever','dam','caster','rudder','trailer','smoothseat','flowtube','hotloop','pipecap','parachute','sound','vent','candle');
