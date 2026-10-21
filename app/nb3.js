/* ================= new types, batch 3 ================= */
function potScene(x,y){return Rect(x-30,y,60,34,'metal',3)+Rect(x-26,y+4,52,22,'water')+Rect(x-38,y+34,76,10,'carbody',2)+`<path class="load" style="fill:#E8742A" d="M${x-14} ${y+54} Q${x-8} ${y+40} ${x-2} ${y+54} Q${x+4} ${y+40} ${x+10} ${y+54} Z"/>`;}

/* ---- boiling and altitude ---- */
function genAltitude(seed,diff){
  const R=RNG(seed);const top=R.pick(['A','B']);const ask=R.pick(['temp','cook']);let b=`<path class="ramp" d="M10 300 L200 60 L390 300 Z"/>`+ground(0,420,300);
  const pos={top:[200,60],low:[360,300]};const lab={[top]:'top',[flipAB(top)]:'low'};
  ['A','B'].forEach(l=>{const [x,y]=pos[lab[l]];b+=potScene(x,y-58)+T(x-48,y-40,l,'lbl-L','end');});
  const ans=top;
  return mk({type:'altitude',sub:'Heat & pressure',diff,stem:ask==='temp'?'The same pot of water is heated on a mountaintop and in the valley below. Where does the water boil at a lower temperature?':'Potatoes are boiled in the same pot on a mountaintop and in the valley below. Where do they take longer to cook?',
    svg:svgWrap(420,320,b,'pots of water on a mountaintop and in a valley'),answer:ans,
    choices:ab('Pot','No difference',ans,k=>k==='same'?'Air pressure is lower high up, and that changes the boiling point.':'High up there is less air pressing on the water, so it boils at a lower temperature. Boiling water that isn’t as hot cooks food more slowly.'),
    explain:'On a mountain there is less air pressing down on the water, so it starts boiling at a lower temperature. The boiling water there is not as hot, so food takes longer to cook.',params:{top,ask}});
}

/* ---- river bend ---- */
function genRiverBend(seed,diff){
  const R=RNG(seed);const outer=R.pick(['A','B']);const ask=R.pick(['wear','sand']);let b=Rect(0,0,420,300,'sand');
  b+=`<path class="water" d="M0 70 Q300 60 300 170 Q300 280 0 270 L0 190 Q200 200 200 170 Q200 140 0 150 Z"/>`;
  b+=`<path class="ink" style="fill:none;stroke-width:2" d="M0 70 Q300 60 300 170 Q300 280 0 270"/><path class="ink" style="fill:none;stroke-width:2" d="M0 190 Q200 200 200 170 Q200 140 0 150"/>`;
  for(const [x,y,a] of [[80,108,0],[240,90,0.5],[250,240,2.6],[80,230,3.1]])b+=`<g transform="translate(${x} ${y}) rotate(${a*57.3})">`+arrow(-20,0,20,0,'acc')+'</g>';
  b+=T(328,176,outer,'lbl-L','start')+T(176,176,flipAB(outer),'lbl-L','end');
  const ans=ask==='wear'?outer:flipAB(outer);
  return mk({type:'riverbend',sub:'Fluids & flow',diff,stem:ask==='wear'?'Seen from above, a river flows around a bend. Which bank gets worn away over time?':'Seen from above, a river flows around a bend. On which bank does sand and gravel pile up over time?',
    svg:svgWrap(420,300,b,'river bend seen from above'),answer:ans,
    choices:ab('Bank','Both banks equally',ans,k=>k==='same'?'The water moves faster on the outside of the bend than on the inside, so the two banks are treated differently.':'Water swings wide around a bend and runs fastest along the outside bank, cutting it away; it slows on the inside and drops sand there.'),
    explain:`Going around a bend, the water swings to the outside and flows fastest there, so it wears away the outer bank (${outer}). On the inside the water slows down and drops the sand and gravel it was carrying.`,params:{outer,ask}});
}

/* ---- dark vs light in the sun ---- */
function genDarkRock(seed,diff){
  const R=RNG(seed);const dark=R.pick(['A','B']);const ask=R.pick(['hot','cool']);const obj=R.pick(['rock','roof']);let b=C(210,40,24,'load')+ground(10,420,230);
  for(let k=0;k<8;k++){const t=k*Math.PI/4;b+=L(210+30*Math.cos(t),40+30*Math.sin(t),210+42*Math.cos(t),40+42*Math.sin(t),'ink');}
  ['A','B'].forEach((l,i)=>{const x=110+i*200,isD=l===dark;const st=isD?'fill:var(--ink)':'fill:var(--sheet)';
    if(obj==='rock')b+=`<path class="stone" style="${st}" d="M${x-60} 230 Q${x-50} 160 ${x} 150 Q${x+56} 156 ${x+60} 230 Z"/>`;else b+=Rect(x-70,200,140,30,'carbody',6)+`<path class="carbody" style="${st}" d="M${x-46} 200 L${x-30} 166 L${x+30} 166 L${x+46} 200 Z"/>`+C(x-44,232,10,'tire2')+C(x+44,232,10,'tire2');
    b+=T(x,262,l,'lbl-L');});
  const ans=ask==='hot'?dark:flipAB(dark);
  return mk({type:'darkrock',sub:'Heat & light',diff,stem:`The two ${obj==='rock'?'rocks':'cars'} are the same except for color and sit in the same sunshine. Which one gets ${ask==='hot'?'hotter':'less hot'}?`,svg:svgWrap(420,275,b,'a dark and a light object in the sun'),answer:ans,
    choices:ab(obj==='rock'?'Rock':'Car','Both the same',ans,k=>k==='same'?'Color makes a difference: dark surfaces soak up sunlight, light ones reflect it.':'Dark surfaces absorb most of the sunlight and turn it into heat; light surfaces reflect much of it away.'),
    explain:'A dark surface absorbs most of the sunlight that hits it and turns it into heat. A light surface reflects much of the light away. So the dark one gets hotter.',params:{dark,ask}});
}

/* ---- aiming at something under water ---- */
function genRefraction(seed,diff){
  const R=RNG(seed);const wy=150;let b=Rect(0,wy,420,150,'water')+L(0,wy,420,wy,'surface')+Rect(0,wy-10,110,160,'sand');
  b+=person(60,wy-10,'upright',0.9);const eye=[62,wy-90];const fx=320,fy=225;b+=`<path class="stone" style="fill:var(--wood)" d="M${fx-30} ${fy} Q${fx} ${fy-16} ${fx+24} ${fy} Q${fx} ${fy+16} ${fx-30} ${fy} Z M${fx+24} ${fy} L${fx+40} ${fy-12} L${fx+40} ${fy+12} Z"/>`;
  const labs=R.shuffle(['A','B','C']);const keys=['above','at','below'];const ty={above:fy-40,at:fy,below:fy+40};
  keys.forEach((k,i)=>{b+=L(eye[0],eye[1],fx+10,ty[k],'opt')+T(fx+60,ty[k]+6,labs[i],'lbl-L');});
  const ch=['A','B','C'].map(l=>({t:'Line '+l,key:keys[labs.indexOf(l)]}));const ans='below';noteAll(ch,ans,k=>'Light bends as it leaves the water, which makes an underwater object look higher than it really is. The real fish is deeper than where you see it.');
  return mk({type:'refraction',sub:'Light & water',diff,stem:'A fisherman sees a fish where it is drawn. Along which line should he aim a spear to hit it?',svg:svgWrap(420,300,b,'person aiming at a fish under water'),choices:ch,answer:ans,
    explain:'Light from the fish bends where it leaves the water, so the fish appears higher (shallower) than it really is. To hit it, aim below where you see it.',params:{labs,keys}});
}

/* ---- wire length and thickness ---- */
function genCoil(seed,diff){
  const R=RNG(seed);const attr=R.pick(['len','thick']);const ask=R.pick(['least','most']);const vals=attr==='len'?R.shuffle([3,5,8]):R.shuffle([1.5,3,5]);let b=Rect(40,40,14,250,'metal')+Rect(366,40,14,250,'metal');
  b+=Rect(180,6,60,24,'carbody',3)+T(170,24,'+','lbl-b','end')+T(250,24,'−','lbl-b','start')+L(47,40,47,18,'wire')+L(47,18,180,18,'wire')+L(373,40,373,18,'wire')+L(373,18,240,18,'wire');
  ['A','B','C'].forEach((l,i)=>{const y=80+i*80;const n=attr==='len'?vals[i]:5;const w=attr==='thick'?vals[i]:2.2;const amp=attr==='len'?8+n*3:18;
    let d=`M54 ${y} L100 ${y}`;const seg=260/(n*2);for(let k=0;k<n*2;k++)d+=` L${P(100+seg*(k+0.5))} ${P(y+(k%2?amp:-amp))}`;d+=` L360 ${y} L366 ${y}`;
    b+=`<path d="${d}" style="fill:none;stroke:#B8732E;stroke-width:${w};stroke-linejoin:round"/>`+T(22,y+6,l,'lbl-L');});
  const lenOf=i=>{const n=attr==='len'?vals[i]:5;const amp=attr==='len'?8+n*3:18;const seg=260/(n*2);return 92+n*2*Math.hypot(seg,2*amp);};
  const res=[0,1,2].map(i=>lenOf(i)/Math.pow(attr==='thick'?vals[i]:2.2,2));const pick=ask==='least'?res.indexOf(Math.max(...res)):res.indexOf(Math.min(...res));const ans=LET[pick];
  const ch=[0,1,2].map(i=>({t:'Wire '+LET[i],key:LET[i]}));noteAll(ch,ans,k=>attr==='len'?'A longer wire resists the current more, so less current flows through it.':'A thinner wire resists the current more, so less current flows through it.');
  return mk({type:'coil',sub:'Electricity',diff,stem:`The three copper wires are connected across the same battery. ${attr==='len'?'They are the same thickness but different lengths.':'They are the same length but different thicknesses.'} Which wire lets the ${ask} current through?`,svg:svgWrap(420,300,b,'three wires across a battery'),choices:ch,answer:ans,
    explain:`A wire resists the flow of current more when it is longer or thinner. With the same battery, the wire with the most resistance lets the least current through, and the one with the least resistance lets the most through. That is wire ${ans}.`,params:{attr,vals,ask,res}});
}

/* ---- glass and boiling water ---- */
function glassDraw(x,wall,content){let b=`<path class="glass" style="fill:none;stroke-width:${wall}" d="M${x-40} 80 L${x-34} 230 L${x+34} 230 L${x+40} 80"/>`;
  if(content==='metal')b+=L(x+10,60,x-14,220,'crank')+`<ellipse class="metal" cx="${x-14}" cy="218" rx="10" ry="6"/>`;else if(content==='wood')b+=`<path class="wood" d="M${x+6} 60 L${x+14} 60 L${x-6} 214 L${x-14} 214 Z"/>`;return b;}
function genThermal(seed,diff){
  const R=RNG(seed);const v=R.pick(['thick','spoon']);const labs=['A','B','C'];let b='',keys,ans,stem,explain,noteF;
  if(v==='thick'){keys=R.shuffle(['thin','mid','thick']);const W={thin:2,mid:5,thick:10};keys.forEach((k,i)=>b+=glassDraw(80+i*130,W[k],null)+T(80+i*130,262,labs[i],'lbl-L'));
    ans='thick';stem='The glasses are the same except for how thick their walls are. Boiling water is poured into each. Which is most likely to crack?';explain='Hot water heats the inside of the glass first, so the inside expands before the outside. In a thick wall the difference between inside and outside is biggest, which strains the glass most. Thin glass warms through evenly and quickly.';noteF='Thin glass warms through quickly and evenly. A thick wall stays cold on the outside while the inside heats and expands, so it strains most.';}
  else{keys=R.shuffle(['metal','wood','none']);keys.forEach((k,i)=>b+=glassDraw(80+i*130,4,k)+T(80+i*130,262,labs[i],'lbl-L'));
    ans='metal';stem='Three identical glasses: one has a metal spoon in it, one a wooden spoon, one nothing. Boiling water is poured into each. Which is least likely to crack?';explain='A metal spoon soaks up a lot of heat very quickly, so the water that touches the glass is a little less hot and the glass heats more gently. Wood hardly takes in any heat.';noteF='Only metal soaks up heat fast enough to take the shock off the glass. Wood barely absorbs heat.';}
  const ch=labs.map((l,i)=>({t:'Glass '+l,key:keys[i]}));noteAll(ch,ans,k=>noteF);
  return mk({type:'thermal',sub:'Heat & materials',diff,stem,svg:svgWrap(420,280,b,'three glasses'),choices:ch,answer:ans,explain,params:{v,keys}});
}

/* ---- condensation ---- */
function genCondense(seed,diff){
  const R=RNG(seed);const wet=R.pick(['A','B']);const ask=R.pick(['fridge','warm']);let b=ground(10,420,250);
  ['A','B'].forEach((l,i)=>{const cx=120+i*180;b+=`<path class="bottle" d="M${cx-10} 40 L${cx-10} 70 Q${cx-40} 84 ${cx-40} 110 L${cx-40} 250 L${cx+40} 250 L${cx+40} 110 Q${cx+40} 84 ${cx+10} 70 L${cx+10} 40 Z"/>`+Rect(cx-38,130,76,118,'water');
    if(l===wet){const Rr=RNG(hashSeed(seed,'drops'));for(let k=0;k<22;k++){const side=k%2?1:-1;b+=`<ellipse cx="${P(cx+side*(41+Rr.f()*2))}" cy="${P(110+Rr.f()*136)}" rx="3" ry="4.2" class="ice" style="fill:var(--water)"/>`;}b+=`<ellipse cx="${cx}" cy="251" rx="52" ry="4" style="fill:var(--water)"/>`;for(let k=0;k<14;k++)b+=`<ellipse cx="${P(cx-30+Rr.f()*60)}" cy="${P(96+Rr.f()*30)}" rx="2.4" ry="3.2" class="ice" style="fill:var(--water)"/>`;}
    b+=T(cx,276,'Bottle '+l,'lbl-b');});
  const ans=ask==='fridge'?wet:flipAB(wet);
  return mk({type:'condense',sub:'Heat & water',diff,stem:ask==='fridge'?'One bottle has just come out of the refrigerator; the other has been sitting in a warm room. Which one came out of the refrigerator?':'One bottle has just come out of the refrigerator; the other has been sitting in a warm room. Which one has been sitting in the room?',
    svg:svgWrap(420,290,b,'two bottles, one covered in droplets'),answer:ans,
    choices:ab('Bottle','You can’t tell',ans,k=>k==='same'?'You can tell: a cold bottle collects droplets from the air.':'Water vapor in warm air turns into droplets when it touches something cold. The bottle with droplets is the cold one.'),
    explain:'Warm room air holds water vapor. When it touches a cold surface it cools and the vapor turns back into droplets. So the bottle covered in droplets is the cold one from the refrigerator.',params:{wet,ask}});
}

/* ---- fan blades ---- */
function fanDraw(cx,cy,n,r){let b=C(cx,cy,r+10,'ink-thin')+`<g class="mv" data-a="rot:${P(cx)},${P(cy)},2.5">`;for(let k=0;k<n;k++){const t=k*2*Math.PI/n;const a=[cx+14*Math.cos(t-0.3),cy+14*Math.sin(t-0.3)],c=[cx+r*Math.cos(t+0.22),cy+r*Math.sin(t+0.22)],d=[cx+r*Math.cos(t-0.22),cy+r*Math.sin(t-0.22)];b+=Poly([[cx,cy],c,d],'metal');}return b+C(cx,cy,12,'hub')+'</g>';}
function genFanBlades(seed,diff){
  const R=RNG(seed);const ask=R.pick(['more','less']);const eq=diff>=2&&R.chance(0.2);let nA=R.pick([2,3,4]),nB=eq?nA:R.pick([6,8]);if(R.chance(.5))[nA,nB]=[nB,nA];
  let b=fanDraw(110,130,nA,80)+fanDraw(320,130,nB,80)+T(110,250,'Fan A','lbl-b')+T(320,250,'Fan B','lbl-b');
  const more=nA===nB?'same':(nA>nB?'A':'B');const ans=more==='same'?'same':(ask==='more'?more:flipAB(more));
  return mk({type:'fanblades',sub:'Everyday mechanics',diff,stem:`The fans are the same size and the blades are the same shape. To spin at the same speed, which fan needs ${ask==='more'?'more':'less'} power?`,svg:svgWrap(430,265,b,'two fans with different numbers of blades'),answer:ans,
    choices:ab('Fan','Both the same',ans,k=>k==='same'?'The fans have different numbers of blades, so they push different amounts of air.':'Each blade pushes air, and pushing air takes work. More blades push more air at the same speed and need more power.'),
    explain:more==='same'?'Same size, same blades, same number of blades: they push the same air and need the same power.':`Every blade has to push air out of the way, and that takes work. At the same speed, the fan with more blades (${more}) moves more air and needs more power.`,params:{nA,nB,ask}});
}

/* ---- umbrellas ---- */
function umbDraw(cx,n){let b='';const top=70,w=150,h=60;b+=`<path class="load" d="M${cx-w/2} ${top+h} Q${cx-w/2} ${top} ${cx} ${top} Q${cx+w/2} ${top} ${cx+w/2} ${top+h} Z"/>`;
  for(let k=1;k<n;k++){const x=cx-w/2+k*w/n;b+=`<path class="ink-thin" style="fill:none" d="M${cx} ${top} Q${(cx+x)/2} ${top+10} ${x} ${top+h}"/>`;}return b+L(cx,top,cx,top+170,'pole')+`<path class="hook" d="M${cx} ${top+170} q0 16 -14 16"/>`;}
function genUmbrella(seed,diff){
  const R=RNG(seed);const ask=R.pick(['flip','hold']);let nA=R.pick([4,5]),nB=R.pick([8,10]);if(R.chance(.5))[nA,nB]=[nB,nA];let b=umbDraw(110,nA)+umbDraw(320,nB)+T(110,280,'Umbrella A','lbl-b')+T(320,280,'Umbrella B','lbl-b');
  const fewer=nA<nB?'A':'B';const ans=ask==='flip'?fewer:flipAB(fewer);
  return mk({type:'umbrella',sub:'Structures & shapes',diff,stem:`The umbrellas are the same size and the same cloth; the lines show the ribs. In a strong wind, which one ${ask==='flip'?'is more likely to turn inside out':'holds its shape better'}?`,svg:svgWrap(430,295,b,'two umbrellas with different numbers of ribs'),answer:ans,
    choices:ab('Umbrella','Both the same',ans,k=>k==='same'?'They have different numbers of ribs, so the cloth is supported differently.':'Each rib carries part of the wind’s push. Fewer ribs means each one carries more and the cloth between them bulges more, so it flips more easily.'),
    explain:`The ribs hold the cloth against the wind. With fewer ribs (${fewer}), each rib carries more of the push and the cloth between ribs is less supported, so it turns inside out more easily.`,params:{nA,nB,ask}});
}

/* ---- windmills ---- */
function millDraw(cx,n,len){let b=Poly([[cx-18,250],[cx+18,250],[cx+8,120],[cx-8,120]],'wood');for(let k=0;k<n;k++){const t=-Math.PI/2+k*2*Math.PI/n;const c=Math.cos(t),s=Math.sin(t);b+=Poly([[cx+8*c-6*s,110+8*s+6*c],[cx+len*c-14*s,110+len*s+14*c],[cx+len*c+2*s,110+len*s-2*c],[cx+8*c+6*s,110+8*s-6*c]],'sheet');}return b+C(cx,110,7,'hub');}
function genWindmill(seed,diff){
  const R=RNG(seed);const v=R.pick(['count','size']);const eq=diff>=2&&R.chance(0.2);let a,bb;
  if(v==='count'){a={n:R.pick([3,4]),len:80};bb={n:eq?a.n:R.pick([6,8]),len:80};}else{a={n:4,len:55};bb={n:4,len:eq?55:95};}if(R.chance(.5))[a,bb]=[bb,a];
  let b=millDraw(110,a.n,a.len)+millDraw(320,bb.n,bb.len)+ground(10,420,250)+T(110,276,'Windmill A','lbl-b')+T(320,276,'Windmill B','lbl-b');
  const area=m=>m.n*m.len*m.len;const ans=area(a)===area(bb)?'same':(area(a)>area(bb)?'A':'B');
  return mk({type:'windmill',sub:'Everyday mechanics',diff,stem:'The same wind blows on both windmills. Which one can do more work (for example, pump more water)?',svg:svgWrap(430,290,b,'two windmills with different sails'),answer:ans,
    choices:ab('Windmill','Both the same',ans,k=>k==='same'?'The sails catch different amounts of wind.':'More sail area catches more of the wind, and that is where the work comes from.'),
    explain:ans==='same'?'The sails are the same, so they catch the same wind and can do the same work.':`A windmill’s power comes from the wind its sails catch. Windmill ${ans} has more sail area (${v==='count'?'more sails':'bigger sails'}), so it catches more wind and can do more work.`,params:{a,b:bb}});
}

/* ---- solids of the same size ---- */
const SOLID_VOL={cube:1,cyl:Math.PI/4,ball:Math.PI/6,hex:3*Math.sqrt(3)/8,cone:Math.PI/12,pyr:1/3};
const SOLID_NAME={cube:'cube',cyl:'cylinder',ball:'ball',hex:'six-sided post',cone:'cone',pyr:'pyramid'};
function solidDraw(k,x,y,a){let b='';const dx=a*0.36,dy=-a*0.26;const box=`<path class="hidden" d="M${x} ${y} L${x+a} ${y} L${x+a} ${y-a} L${x} ${y-a} Z M${x} ${y-a} L${x+dx} ${y-a+dy} L${x+a+dx} ${y-a+dy} L${x+a} ${y-a} M${x+a} ${y} L${x+a+dx} ${y+dy} L${x+a+dx} ${y-a+dy}"/>`;
  const cx=x+a/2+dx/2,rx=a/2,ry=a*0.16;
  if(k==='cube')return Rect(x,y-a,a,a,'solid1')+Poly([[x,y-a],[x+dx,y-a+dy],[x+a+dx,y-a+dy],[x+a,y-a]],'solid2')+Poly([[x+a,y],[x+a+dx,y+dy],[x+a+dx,y-a+dy],[x+a,y-a]],'solid3');
  b+=box;
  if(k==='cyl')b+=`<path class="solid1" d="M${cx-rx} ${y-a+dy/2} V${y+dy/2} A${rx} ${ry} 0 0 0 ${cx+rx} ${y+dy/2} V${y-a+dy/2} Z"/><ellipse class="solid2" cx="${cx}" cy="${y-a+dy/2}" rx="${rx}" ry="${ry}"/>`;
  else if(k==='ball')b+=C(cx,y-a/2+dy/2,a/2,'solid1')+`<ellipse class="hidden" cx="${cx}" cy="${y-a/2+dy/2}" rx="${a/2}" ry="${a*0.14}"/>`;
  else if(k==='cone')b+=`<path class="solid1" d="M${cx} ${y-a+dy/2} L${cx-rx} ${y+dy/2} A${rx} ${ry} 0 0 0 ${cx+rx} ${y+dy/2} Z"/>`;
  else if(k==='pyr')b+=Poly([[x,y],[x+a,y],[cx,y-a+dy/2]],'solid1')+Poly([[x+a,y],[x+a+dx,y+dy],[cx,y-a+dy/2]],'solid3');
  else{const hx=[0,1,2,3,4,5].map(i=>{const t=i*Math.PI/3;return[cx+rx*Math.cos(t),ry*Math.sin(t)];});b+=Poly([[hx[3][0],y+dy/2+hx[3][1]],[hx[4][0],y+dy/2+hx[4][1]],[hx[5][0],y+dy/2+hx[5][1]],[hx[0][0],y+dy/2+hx[0][1]],[hx[0][0],y-a+dy/2+hx[0][1]],[hx[3][0],y-a+dy/2+hx[3][1]]],'solid1')+Poly(hx.map(p=>[p[0],y-a+dy/2+p[1]]),'solid2');}
  return b;}
function genSolids(seed,diff){
  const R=RNG(seed);const ask=R.pick(['heavier','lighter']);const pool=diff===1?['cube','cyl','ball']:['cube','cyl','ball','hex','cone','pyr'];let kA,kB;
  do{kA=R.pick(pool);kB=R.pick(pool);}while(kA===kB);const a=110;let b=solidDraw(kA,50,230,a)+solidDraw(kB,260,230,a)+T(125,262,'A','lbl-L')+T(335,262,'B','lbl-L');
  const h=SOLID_VOL[kA]>SOLID_VOL[kB]?'A':'B';const ans=ask==='heavier'?h:flipAB(h);
  return mk({type:'solids',sub:'Weight & volume',diff,stem:`Both objects are solid and made of the same material. Each fits exactly inside the same size box (dashed). Which one is ${ask}?`,svg:svgWrap(430,275,b,`a ${SOLID_NAME[kA]} and a ${SOLID_NAME[kB]}`),answer:ans,
    choices:ab('Object','They weigh the same',ans,k=>k==='same'?'They fill different amounts of the same box, so they hold different amounts of material.':'Same material, so the one that fills more of its box has more material and weighs more.'),
    explain:`Made of the same material, the object that fills more of the same box weighs more. A cube fills its box completely; a cylinder about three quarters; a six-sided post about two thirds; a ball about half; a pyramid a third; a cone about a quarter. The ${SOLID_NAME[h==='A'?kA:kB]} (${h}) fills more.`,params:{kA,kB,ask}});
}

/* ---- buckets ---- */
function genBucket(seed,diff){
  const R=RNG(seed);const v=R.pick(['apples','cream']);const which=R.pick(['A','B']);let b='';
  ['A','B'].forEach((l,i)=>{const cx=120+i*190;b+=`<path class="metal" d="M${cx-60} 80 L${cx-46} 250 L${cx+46} 250 L${cx+60} 80 Z"/>`+`<path class="hook" d="M${cx-60} 80 Q${cx} 20 ${cx+60} 80"/>`;
    const special=l===which;if(v==='apples'){if(special){for(let r=0;r<5;r++)for(let c=0;c<4-(r%2);c++){b+=C(cx-38+c*26+(r%2)*13+r*1.5,236-r*34,13,'ball');}}else b+=Poly([[cx-58,86],[cx+58,86],[cx+46,248],[cx-46,248]],'water');}
    else b+=Poly([[cx-58,86],[cx+58,86],[cx+46,248],[cx-46,248]],special?'sheet':'water');
    b+=T(cx,276,(v==='apples'?(special?'apples':'water'):(special?'cream':'milk')),'lbl-s')+T(cx,300,'Bucket '+l,'lbl-b');});
  const ans=flipAB(which);
  return mk({type:'bucket',sub:'Weight & volume',diff,stem:v==='apples'?'Two identical buckets are filled to the brim: one with apples, one with water. Which is heavier?':'Two identical buckets are filled to the brim: one with cream, one with milk. Which is heavier?',
    svg:svgWrap(430,310,b,'two filled buckets'),answer:ans,
    choices:ab('Bucket','They weigh the same',ans,k=>k==='same'?'Same bucket, same level, but different contents per bit of space.':(v==='apples'?'Apples float (they are lighter than water) and leave gaps full of air between them.':'Cream is the fatty part of milk and floats on top of it, so it is lighter for the same amount.')),
    explain:v==='apples'?'Apples are a little lighter than water (they float), and round apples leave air gaps between them. Water fills every bit of the bucket, so the bucket of water is heavier.':'Cream rises to the top of milk because it is lighter for its size. The same bucketful of milk is heavier.',params:{v,which}});
}

/* ---- tank capacity ---- */
function tankRect(x,y,w,h){return Rect(x,y-h,w,h,'glass')+`<path class="hidden" d="M${x} ${y-h} L${x+18} ${y-h-12} L${x+w+18} ${y-h-12} L${x+w} ${y-h} M${x+w} ${y} L${x+w+18} ${y-12} L${x+w+18} ${y-h-12}"/>`;}
function genTanks(seed,diff){
  const R=RNG(seed);const v=R.pick(['twoshort','square']);let b=ground(10,430,250),ans,stem,explain,noteF;const tall=R.pick(['A','B']);
  if(v==='twoshort'){const side={[tall]:'tall',[flipAB(tall)]:'two'};['A','B'].forEach((l,i)=>{const x=40+i*210;if(side[l]==='tall')b+=tankRect(x+40,250,70,160)+L(x+40,170,x+110,170,'opt');else b+=tankRect(x,250,70,80)+tankRect(x+90,250,70,80);b+=T(x+80,276,l,'lbl-L');});
    ans='same';stem='All the tanks are the same width and depth. The tall tank is exactly twice as high as each short one. Which side holds more water?';explain='The tall tank is the same as two short tanks stacked on top of each other (the dashed line), so side A and side B hold exactly the same amount.';noteF='Stack the two short tanks and you get the tall one: the amounts are equal.';}
  else{const sq=tall;['A','B'].forEach((l,i)=>{const x=80+i*210;if(l===sq)b+=tankRect(x,250,110,130);else b+=`<path class="glass" d="M${x} 130 V250 A55 14 0 0 0 ${x+110} 250 V130 Z"/><ellipse class="glass" cx="${x+55}" cy="130" rx="55" ry="14"/>`;b+=T(x+55,286,l,'lbl-L');});
    ans=sq;stem='One can is square and one is round. They are the same height, and the round can is exactly as wide as the square one. Which holds more?';explain='A round can fits inside a square can of the same width and height, with room left over in the corners. So the square can holds more (about a quarter more).';noteF='The round can fits inside the square one with space left in the corners.';}
  return mk({type:'tanks',sub:'Weight & volume',diff,stem,svg:svgWrap(440,300,b,'containers of different shapes'),answer:ans,choices:ab(v==='twoshort'?'Side':'Can','They hold the same',ans,k=>noteF),explain,params:{v,tall}});
}

/* ---- pressure at the bottom of jars ---- */
function genJars(seed,diff){
  const R=RNG(seed);const eq=R.chance(0.55);let dA=R.pick([90,110]),dB=eq?dA:R.pick([130,150]);if(R.chance(.5))[dA,dB]=[dB,dA];const flared=R.pick(['A','B']);let b='';const base=250;
  [['A',dA,120],['B',dB,340]].forEach(([l,d,cx])=>{const f=l===flared;const top=base-170;b+=Poly(f?[[cx-40,base],[cx+40,base],[cx+40+0.35*d,base-d],[cx-40-0.35*d,base-d]]:[[cx-40,base],[cx+40,base],[cx+40,base-d],[cx-40,base-d]],'water');
    b+=`<path class="glass" style="fill:none" d="${f?`M${cx-100} ${top} L${cx-40} ${base} L${cx+40} ${base} L${cx+100} ${top}`:`M${cx-40} ${top} L${cx-40} ${base} L${cx+40} ${base} L${cx+40} ${top}`}"/>`+C(cx,base-6,5,'pt')+T(cx,base+24,'Jar '+l,'lbl-b');});
  const ans=dA===dB?'same':(dA>dB?'A':'B');
  return mk({type:'jars',sub:'Fluids & pressure',diff,stem:'Which jar has the greater water pressure at the dot on its bottom?',svg:svgWrap(460,285,b,'two jars of water of different shapes'),answer:ans,
    choices:ab('Jar','The same in both',ans,k=>k==='same'?'The water is deeper in one jar, and depth is what sets the pressure.':'Pressure at the bottom depends only on how deep the water is, not on the jar’s shape or how much water there is.'),
    explain:ans==='same'?'The water is the same depth in both jars. Pressure depends only on depth, not on the shape of the jar or the amount of water, so it is the same.':`Pressure depends only on depth. The water in jar ${ans} is deeper, so the pressure at its bottom is greater, whatever the shape.`,params:{dA,dB}});
}

/* ---- hydrants on one water main ---- */
function genHydrant(seed,diff){
  const R=RNG(seed);const low=R.pick(['A','B']);const ask=R.pick(['high','low']);let b=`<path class="ramp" d="M0 300 L0 210 Q70 200 120 140 Q170 90 220 140 Q270 200 330 240 L420 250 L420 300 Z"/>`;
  const pos={hill:[170,108],valley:[360,246]},vq=k=>2.98*Math.sqrt(pos[k][1]-22-44),vH=vq('hill'),vV=vq('valley');
  b+=Rect(20,40,60,60,'metal')+Rect(24,44,52,52,'water')+mvG(`flow:${mvN(vH+vV)}`,L(46,100,46,280,'pipe'))+mvG(`flow:${mvN(vV)}`,`<path class="tube" style="stroke:var(--metal)" d="M46 282 L400 282"/>`);
  const lab={[low]:'valley',[flipAB(low)]:'hill'};
  ['A','B'].forEach(l=>{const [x,y]=pos[lab[l]];b+=mvG(`flow:${mvN(vq(lab[l]))}`,L(x,282,x,y,'pipe'))+Rect(x-8,y-22,16,22,'load',3)+T(x+20,y-10,l,'lbl-L','start');});
  const ans=ask==='high'?low:flipAB(low);
  return mk({type:'hydrant',sub:'Fluids & pressure',diff,stem:`Both hydrants are fed by the same water main from the tank. When each is opened, which one sprays water ${ask==='high'?'harder':'less hard'}?`,svg:svgWrap(420,300,b,'two hydrants at different heights on one water main'),answer:ans,
    choices:ab('Hydrant','Both the same',ans,k=>k==='same'?'The hydrants are at different heights below the tank, so the water pressure at each is different.':'The lower hydrant has more height of water above it (from the tank level), so its pressure is higher.'),
    explain:`The pressure at each hydrant depends on how far it sits below the water level in the tank. The hydrant in the valley (${low}) is much farther below it, so its pressure is higher and it sprays harder; the one on the hill sprays weakest.`,params:{low,ask}});
}

/* ---- switchback roads ---- */
function genSwitchback(seed,diff){
  const R=RNG(seed);const ask=R.pick(['steep','easy']);let nA=R.pick([1,2]),nB=R.pick([4,5]);if(R.chance(.5))[nA,nB]=[nB,nA];let b='';
  [[nA,0,'A'],[nB,220,'B']].forEach(([n,ox,l])=>{const cx=ox+110;b+=`<path class="ramp" d="M${cx-100} 250 L${cx} 50 L${cx+100} 250 Z"/>`;const pts=[];for(let k=0;k<=n;k++){const y=250-k*(200/n);const half=100*(250-y)/200;const w=100-half-8;pts.push([cx+(k%2?w:-w),y]);}
    pts[pts.length-1]=[cx,56];b+=`<path class="road" style="stroke:var(--ink)" d="M${pts.map(p=>P(p[0])+' '+P(p[1])).join(' L')}"/>`+T(cx,276,'Road '+l,'lbl-b');});
  const fewer=nA<nB?'A':'B';const ans=ask==='steep'?fewer:flipAB(fewer);
  return mk({type:'switchback',sub:'Inclined planes',diff,stem:`Both roads climb from the bottom to the top of the same hill. Which road is ${ask==='steep'?'steeper':'easier for a heavy truck to climb'}?`,svg:svgWrap(440,290,b,'two roads zig-zagging up the same hill'),answer:ans,
    choices:ab('Road','Both the same',ans,k=>k==='same'?'The roads are different lengths for the same climb, so their slopes are different.':'Both roads climb the same height. The one with more bends is longer, so it rises more gently.'),
    explain:`Both roads climb the same height. The road with more bends is longer, so it spreads the climb over more distance and is gentler (easier to drive up). Road ${fewer} has fewer bends, so it is shorter and steeper.`,params:{nA,nB,ask}});
}

/* ---- flywheels at high speed ---- */
function genBurst(seed,diff){
  const R=RNG(seed);const rim=R.pick(['A','B']);const ask=R.pick(['burst','safe']);let b='';
  ['A','B'].forEach((l,i)=>{const cx=110+i*210,cy=140,r=90;const heavyRim=l===rim;b+=L(cx-110,cy,cx+110,cy,'shaft');
    b+=heavyRim?Poly([[cx-10,cy-r],[cx+10,cy-r],[cx+10,cy+r],[cx-10,cy+r]],'metal')+Rect(cx-22,cy-r,44,22,'metal',3)+Rect(cx-22,cy+r-22,44,22,'metal',3):`<path class="metal" d="M${cx} ${cy-r} Q${cx+30} ${cy} ${cx} ${cy+r} Q${cx-30} ${cy} ${cx} ${cy-r} Z"/>`;
    b+=T(cx,268,'Wheel '+l,'lbl-b');});
  b+=T(215,26,'side view of two wheels (cut through the middle)','lbl-s');
  const ans=ask==='burst'?rim:flipAB(rim);
  return mk({type:'burst',sub:'Circular motion',diff,stem:`The wheels are the same size and weight, spinning at the same very high speed. Which one is ${ask==='burst'?'more likely to fly apart':'safer at high speed'}?`,svg:svgWrap(430,285,b,'cross-sections of two wheels'),answer:ans,
    choices:ab('Wheel','Both the same',ans,k=>k==='same'?'The weight is placed differently, and weight out at the rim is pulled on hardest.':'Weight far from the center needs the most force to keep it going in a circle, and the thin web holding it strains the most.'),
    explain:`At high speed, every bit of the wheel has to be held in its circle, and the farther out the weight is, the harder it pulls. A wheel with a heavy rim on a thin web (${rim}) puts the most strain where it is weakest, so it is more likely to fly apart. A wheel thick at the center and thin at the edge is the safest shape.`,params:{rim,ask}});
}

/* ---- handwheel size ---- */
function genHandwheel(seed,diff){
  const R=RNG(seed);const ask=R.pick(['less','more']);const eq=diff>=2&&R.chance(0.2);let rA=R.pick([40,50]),rB=eq?rA:R.pick([80,95]);if(R.chance(.5))[rA,rB]=[rB,rA];let b=ceiling(10,430,20);
  const lift=20,w=-lift/16/9;[[rA,110,'A'],[rB,320,'B']].forEach(([r,cx,l])=>{const cy=130;b+=L(cx,20,cx,cy,'strap')+`<g class="mv" data-a="rot:${cx},${cy},${mvN(w)}">`+C(cx,cy,r,'wheel2')+C(cx,cy,16,'drum')+C(cx,cy,3,'dot');for(let k=0;k<4;k++){const t=k*Math.PI/4;b+=L(cx-r*Math.cos(t),cy-r*Math.sin(t),cx+r*Math.cos(t),cy+r*Math.sin(t),'spoke');}b+='</g>';
    b+=mvG(`flow:${mvN(16*w)}`,L(cx+16,cy,cx+16,250,'rope'))+mvG(mvSlide(cx+16,263,0,-lift),Rect(cx+2,250,28,26,'load',2))+mvG(`flow:${mvN(-r*w)}`,L(cx-r,cy,cx-r,cy+r+30,'rope'))+arrow(cx-r,cy+r+20,cx-r,cy+r+50)+T(cx,300,'Wheel '+l,'lbl-b');});
  const big=rA===rB?'same':(rA>rB?'A':'B');const ans=big==='same'?'same':(ask==='less'?big:flipAB(big));
  return mk({type:'handwheel',sub:'Winches & wheel and axle',diff,stem:`Each load hangs from the same small drum. A rope around the big wheel is pulled to hold the load. Which setup needs ${ask} pulling force?`,svg:svgWrap(430,310,b,'two wheel and axle setups with different wheel sizes'),answer:ans,
    choices:ab('Setup','Both the same',ans,k=>k==='same'?'The wheels are different sizes, and a bigger wheel gives more leverage.':'The pull on the rim of a bigger wheel acts farther from the axle, so it needs less force to hold the same load.'),
    explain:big==='same'?'The wheels and drums are the same size, so the force is the same.':`A wheel and axle is a lever that goes all the way around. The load pulls on the small drum; you pull on the rim of the wheel. The bigger the wheel compared with the drum, the less force you need, so wheel ${big} is easier.`,params:{rA,rB,ask}});
}

Object.assign(GENS,{altitude:genAltitude,riverbend:genRiverBend,darkrock:genDarkRock,refraction:genRefraction,coil:genCoil,thermal:genThermal,condense:genCondense,fanblades:genFanBlades,umbrella:genUmbrella,windmill:genWindmill,solids:genSolids,bucket:genBucket,tanks:genTanks,jars:genJars,hydrant:genHydrant,switchback:genSwitchback,burst:genBurst,handwheel:genHandwheel});
CONCEPT_TYPES.push('altitude','riverbend','darkrock','refraction','coil','thermal','condense','fanblades','umbrella','windmill','solids','bucket','tanks','jars','hydrant','switchback','burst','handwheel');
