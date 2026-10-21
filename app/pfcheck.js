// usage: node pfcheck.js '{"folds":[{"k":"x","c":12,"sg":-1}],"punches":[[17,5]]}'
// Grid: square sheet 0..24 both ways, x right, y DOWN. Fold lines: k='x' (x=c), 'y' (y=c), 'p' (x+y=c), 'm' (x-y=c); c even.
// sg picks the flap that moves: the side where sg*(value-c) > 0 is folded OVER onto the other side.
// Punch positions must be odd numbers (cell centres) inside the final folded paper.
const G=require(require('path').join(__dirname,'gen.js')).PF;const m=JSON.parse(process.argv[2]);
let poly=[[0,0],[24,0],[24,24],[0,24]],S=G.ALL_PTS.map(p=>p.slice());const st=[];
const show=(pts,marks)=>{const rows=[];for(let y=1;y<24;y+=2){let r='';for(let x=1;x<24;x+=2){const k=x+','+y;r+=marks&&marks.has(k)?'O':(pts.has(k)?'.':' ');}rows.push(r);}return rows.join('\n');};
m.folds.forEach((f,i)=>{const flap=G.clipPoly(poly,f,true),keep=G.clipPoly(poly,f,false);if(flap.length<3||keep.length<3){console.log('FOLD',i+1,'INVALID: line does not cut the paper');process.exit(1);}
  const ok=flap.map(p=>G.fRefl(f,p)).every(p=>keep.length>=3);st.push({f,S});S=G.nextShape(S,f);poly=keep;
  console.log(`after fold ${i+1} (flap area ${(G.area(flap)/G.area(st.length===1?[[0,0],[24,0],[24,24],[0,24]]:poly)).toFixed(2)} of paper before):`);console.log(show(new Set(S.map(p=>p+''))));});
const set=new Set(S.map(p=>p+''));const bad=m.punches.filter(p=>!set.has(p+''));if(bad.length){console.log('PUNCH NOT ON FOLDED PAPER:',JSON.stringify(bad));process.exit(1);}
let H=m.punches.map(p=>p.slice());for(let k=st.length-1;k>=0;k--){const {f,S:Sk}=st[k];const s2=new Set(Sk.map(p=>p+''));const add=[];H.forEach(h=>{const q=G.fRefl(f,h);if(G.moved(f,q)&&s2.has(q+''))add.push(q);});H=H.concat(add);}
const hs=[...new Set(H.map(p=>p+''))];console.log('UNFOLDED holes ('+hs.length+'), as fractions of width,height from top-left:',hs.map(k=>{const [x,y]=k.split(',').map(Number);return `(${(x/24).toFixed(2)},${(y/24).toFixed(2)})`;}).join(' '));
console.log(show(new Set(G.ALL_PTS.map(p=>p+'')),new Set(hs)));
console.log('JSON_HOLES '+JSON.stringify(hs.map(k=>k.split(',').map(Number))));
