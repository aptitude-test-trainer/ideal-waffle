(function(){
'use strict';
const G=window.GEN;const $=s=>document.querySelector(s);
const SEC={fold:{name:'Paper Folding',min:15,pace:38,count:24,choices:5},mech:{name:'Mechanical Reasoning',min:20,pace:27,count:45,choices:3},concept:{name:'Tricky Concepts Drill',min:20,pace:27,count:45,choices:3},net:{name:'Box Folding Drill',min:10,pace:40,count:15,choices:4},sgfold:{name:'Study Guide: Paper Folding',min:15,pace:38,count:24,choices:5},sgmech:{name:'Study Guide: Mechanical',min:20,pace:27,count:45,choices:'2 to 4'},sgnet:{name:'Study Guide: Box Folding',min:10,pace:40,count:15,choices:4},eta:{name:'Algebra & Functions',min:46,pace:84,count:33,choices:4},ncomp:{name:'Numerical Computation',min:26,pace:52,count:30,choices:5},nreason:{name:'Numerical Reasoning',min:22,pace:66,count:20,choices:5},sgeta:{name:'Study Guide: Algebra & Functions',min:46,pace:84,count:33,choices:4}};
const LET='ABCDE';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
function newCode(){const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=a[Math.floor(Math.random()*a.length)];return s;}
function show(id){['home','etahome','exam','inter','results','melt','paused'].forEach(x=>$('#'+x).hidden=x!==id);const hm=id==='home'||id==='etahome';$('#tabs').hidden=!hm;$('#shared').hidden=!hm;window.scrollTo(0,0);}
let curTab='gan';try{curTab=localStorage.getItem('fm-tab')==='eta'?'eta':'gan';}catch(e){}
function setTab(t){curTab=t;try{localStorage.setItem('fm-tab',t);}catch(e){}$('#tab-gan').setAttribute('aria-selected',String(t==='gan'));$('#tab-eta').setAttribute('aria-selected',String(t==='eta'));show(t==='eta'?'etahome':'home');}
const mmss=s=>{s=Math.max(0,Math.round(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};

let run=null,tick=null;

/* ---------- saving, pausing, resuming ---------- */
const SAVES='fm-saves',BOARD='fm-melt-board';
function rcode(prefix){const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let s=prefix;for(let i=0;i<5;i++)s+=a[Math.floor(Math.random()*a.length)];return s;}
function player(){const v=($('#pname').value||'').trim();return v||'Player 1';}
$('#pname').value=store.get('fm-player','');$('#pname').addEventListener('change',()=>store.set('fm-player',$('#pname').value.trim()));
function putSave(st){const all=store.get(SAVES,{});all[st.rid]=st;store.set(SAVES,all);}
function dropSave(rid){const all=store.get(SAVES,{});delete all[rid];store.set(SAVES,all);}
function toFull(st){try{return 'X'+btoa(unescape(encodeURIComponent(JSON.stringify(st)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}catch(e){return '';}}
function fromFull(s){try{s=s.replace(/\s+/g,'').slice(1).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(decodeURIComponent(escape(atob(s))));}catch(e){return null;}}
function copyText(txt,btn,sel){const done=()=>{const o=btn.textContent;btn.textContent='Copied';setTimeout(()=>btn.textContent=o,1500);};
  try{navigator.clipboard.writeText(txt).then(done,()=>{if(sel){sel.focus();sel.select();}btn.textContent='Select and copy';});}catch(e){if(sel){sel.focus();sel.select();}}}
function showPaused(st){const isM=st.k==='M';$('#p-eye').textContent=isM?'Meltdown ∞ paused':'Test paused';$('#p-title').textContent=isM?`${st.name}: ${st.score.toLocaleString()} points, level ${st.level}`:`${st.name}: ${SEC[st.order[st.sIdx]].name}`;
  $('#p-desc').textContent=isM?`${st.n-(st.locked?0:1)} answered. The clock is stopped at ${mmss(st.el)}.`:(st.timing==='real'?`The clock is stopped with ${mmss(st.remaining)} left in this section. `:'Untimed. ')+`Question ${st.q+1} of ${st.lens[st.sIdx]}.`;
  $('#p-code').textContent=st.rid;$('#p-full').value=toFull(st);show('paused');
  $('#p-copy').onclick=()=>copyText(st.rid,$('#p-copy'));$('#p-copyfull').onclick=()=>copyText($('#p-full').value,$('#p-copyfull'),$('#p-full'));
  $('#p-resume').onclick=()=>resumeState(st);$('#p-home').onclick=()=>goHome();}
function goHome(){renderSaved();renderBoard();meltBestText();setTab(curTab);}
function resumeState(st){if(!st)return false;if(st.k==='M'){resumeMelt(st);return true;}if(st.k==='T'){resumeRun(st);return true;}return false;}
$('#rgo').onclick=()=>{const v=$('#rcode').value.trim();const msg=$('#rmsg');msg.className='rmsg';if(!v){msg.textContent='Type or paste a code first.';msg.classList.add('err');return;}
  let st=null;if(v[0]==='X'&&v.length>20)st=fromFull(v);else st=store.get(SAVES,{})[v.toUpperCase()];
  if(!st){msg.textContent=v.length>20?'That full code is damaged. Copy it again from the pause screen.':'No saved progress with that code on this device. On another device, use the full code from the pause screen.';msg.classList.add('err');return;}
  msg.textContent='';$('#rcode').value='';resumeState(st);};
function renderSaved(){const all=Object.values(store.get(SAVES,{})).sort((a,b)=>b.saved-a.saved);$('#saved-wrap').hidden=!all.length;
  $('#saved').innerHTML=all.map(s=>{const isM=s.k==='M';const what=isM?`Meltdown ∞ · ${s.score.toLocaleString()} pts · level ${s.level}`:`${s.order.length>1?s.order.map(o=>SEC[o].name).join(' + ')+' · now ':''}${SEC[s.order[s.sIdx]].name} Q${s.q+1}/${s.lens[s.sIdx]}${s.timing==='real'?' · '+mmss(s.remaining)+' left':''}`;
    return `<div class="srow"><span><b>${esc(s.name)}</b> · <span class="mono">${esc(s.rid)}</span> <span class="tag ${s.status==='paused'?'paused':'active'}">${s.status==='paused'?'Paused':'Left mid-way'}</span><br><span class="muted" style="font-size:14px">${esc(what)} · ${new Date(s.saved).toLocaleString()}</span></span>
      <span class="start-row"><button type="button" class="btn small primary" data-r="${esc(s.rid)}">Resume</button><button type="button" class="btn small" data-d="${esc(s.rid)}">Delete</button></span></div>`;}).join('');
  $('#saved').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>resumeState(store.get(SAVES,{})[b.dataset.r]));
  $('#saved').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{if(b.dataset.armed){dropSave(b.dataset.d);const bd=store.get(BOARD,{});if(bd[b.dataset.d]&&bd[b.dataset.d].status!=='finished'){bd[b.dataset.d].status='finished';store.set(BOARD,bd);}renderSaved();renderBoard();}else{b.dataset.armed='1';b.textContent='Tap again to delete';}});}
function cfgFromForm(){const g=(id,d,lo,hi)=>{const n=Math.round(+$('#'+id).value);return isFinite(n)&&n>=lo&&n<=hi?n:d;};
  return{fold:{min:g('fold-min',15,1,180),count:g('fold-n',24,1,150)},mech:{min:g('mech-min',20,1,180),count:g('mech-n',45,1,150)},concept:{min:g('concept-min',20,1,180),count:g('concept-n',45,1,150)},ncomp:{min:g('ncomp-min',26,1,180),count:g('ncomp-n',30,1,150)},nreason:{min:g('nreason-min',22,1,180),count:g('nreason-n',20,1,150)},net:{min:10,count:15}};}
$('#cdefault').onclick=()=>{[['fold-min',15],['fold-n',24],['mech-min',20],['mech-n',45],['concept-min',20],['concept-n',45],['ncomp-min',26],['ncomp-n',30],['nreason-min',22],['nreason-n',20]].forEach(([i,v])=>$('#'+i).value=v);store.set('fm-cfg2',null);};
{const c=store.get('fm-cfg2',null);if(c&&c.practice){const el=document.getElementById('pm-prac');if(el)el.checked=true;}}
{const q=store.get('fm-qsrc','rand');const el=document.getElementById(q==='sg'?'src-sg':'src-rand');if(el)el.checked=true;}
{const c=store.get('fm-cfg2',null);if(c){['fold','mech','concept','ncomp','nreason'].forEach(s=>{if(c[s]){$('#'+s+'-min').value=c[s].min;$('#'+s+'-n').value=c[s].count;}});}}

/* ---------- home ---------- */
$('#code').value=newCode();
$('#newcode').onclick=()=>{$('#code').value=newCode();};
$('#code').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');});
$('#setup').addEventListener('submit',e=>{e.preventDefault();curTab='gan';let code=$('#code').value.trim();if(!code){code=newCode();$('#code').value=code;}
  const secs=document.querySelector('input[name="sections"]:checked').value;const timing=document.querySelector('input[name="timing"]:checked').value;const level=document.querySelector('input[name="flevel"]:checked').value,mlevel=document.querySelector('input[name="mlevel"]:checked').value;const cfg=cfgFromForm();cfg.practice=(document.querySelector('input[name="pmode"]:checked')||{}).value==='practice';store.set('fm-cfg2',cfg);store.set('fm-player',$('#pname').value.trim());const src=(document.querySelector('input[name="qsrc"]:checked')||{}).value||'rand';store.set('fm-qsrc',src);let order=secs==='full'?['ncomp','nreason','mech','fold']:secs==='math'?['ncomp','nreason']:secs==='both'?['fold','mech']:[secs];if(src==='sg')order=order.map(s=>s==='concept'?'sgmech':s==='net'||s==='ncomp'||s==='nreason'?s:'sg'+s);startRun(code,order,timing,level,mlevel,cfg);});
/* ---------- tap a wide picture to enlarge it ---------- */
function zoomOpen(svg,graph){const o=document.createElement('div');o.className='zoomov';o.innerHTML=`<div class="zoombar"><span>${graph&&window.innerWidth>=700?'Enlarged choice':'Pinch or scroll to look around'}</span><button type="button" class="btn small">Close ✕</button></div><div class="zoombox${svg.classList.contains('gr')?' gr-z':''}">${svg.outerHTML}</div>`;
  document.body.appendChild(o);const s=o.querySelector('svg');s.style.maxWidth='none';s.style.maxHeight='none';
  if(graph){/* answer-choice graph: big enough to read every grid line and label; fills the screen on a computer, wider than the screen (pan) on a phone */
    const vb=(svg.getAttribute('viewBox')||'0 0 1 1').split(' ').map(Number),ar=vb[3]/vb[2],W=window.innerWidth,H=window.innerHeight-70;
    s.style.width=Math.round(W<700?W*1.8:Math.min(W-40,H/ar))+'px';s.style.margin='0 auto';}
  else s.style.width=Math.max(window.innerWidth*1.9,700)+'px';
  o.querySelector('button').focus();
  const close=()=>o.remove();o.querySelector('button').onclick=close;document.addEventListener('keydown',function f(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',f);}});}
/* graph answer choices: tapping the picture enlarges it and does NOT pick the answer (the label's default action is cancelled) */
const gfigOf=t=>t&&t.closest&&t.closest('.choices.graphs .gfig, .rch.graphs .gfig');
document.addEventListener('click',e=>{const f=gfigOf(e.target);if(!f)return;e.preventDefault();e.stopPropagation();zoomOpen(f.querySelector('svg'),true);},true);
document.addEventListener('keydown',e=>{const f=gfigOf(e.target);if(!f||(e.key!=='Enter'&&e.key!==' '))return;e.preventDefault();e.stopPropagation();zoomOpen(f.querySelector('svg'),true);},true);
document.addEventListener('click',e=>{const s=e.target.closest&&e.target.closest('#figure svg, .ritem .figure svg');if(!s)return;const vb=(s.getAttribute('viewBox')||'').split(' ').map(Number);
  if(vb[2]>900&&s.getBoundingClientRect().width<vb[2]*0.6)zoomOpen(s);});
/* ---------- ETA math tab ---------- */
$('#tab-gan').onclick=()=>setTab('gan');$('#tab-eta').onclick=()=>setTab('eta');
$('#eta-code').value=newCode();$('#eta-newcode').onclick=()=>{$('#eta-code').value=newCode();};
$('#eta-code').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');});
$('#eta-default').onclick=()=>{$('#eta-min').value=46;$('#eta-n').value=33;};
{const c=store.get('fm-eta',null);if(c){if(c.min)$('#eta-min').value=c.min;if(c.count)$('#eta-n').value=c.count;if(c.practice)$('#em-prac').checked=true;if(c.src==='sg')$('#es-sg').checked=true;}}
$('#eta-setup').addEventListener('submit',e=>{e.preventDefault();let code=$('#eta-code').value.trim();if(!code){code=newCode();$('#eta-code').value=code;}
  const g=(id,d,lo,hi)=>{const n=Math.round(+$('#'+id).value);return isFinite(n)&&n>=lo&&n<=hi?n:d;};
  const timing=document.querySelector('input[name="etiming"]:checked').value;const practice=document.querySelector('input[name="emode"]:checked').value==='practice';
  const cfg=Object.assign({},DEF_CFG,{eta:{min:g('eta-min',46,1,180),count:g('eta-n',33,1,150)},practice});store.set('fm-eta',{min:cfg.eta.min,count:cfg.eta.count,practice});store.set('fm-player',$('#pname').value.trim());
  const src=(document.querySelector('input[name="esrc"]:checked')||{}).value||'rand';store.set('fm-eta',{min:cfg.eta.min,count:cfg.eta.count,practice,src});
  curTab='eta';startRun(code,[src==='sg'?'sgeta':'eta'],timing,'std','std',cfg);});
function renderHistory(){const h=store.get('fm-history',[]);$('#hist-wrap').hidden=!h.length;
  $('#history').innerHTML=h.slice(0,8).map(r=>`<div class="row"><span><span class="mono">${esc(r.code)}</span> · ${esc(r.date)}${r.timing==='untimed'?' · untimed':''}</span><span>${r.parts.map(p=>`${esc(SEC[p.sec].name)} <b>${p.right}/${p.total}</b>`).join(' · ')}</span></div>`).join('');}
renderHistory();

/* ---------- exam ---------- */
const DEF_CFG={fold:{min:15,count:24},mech:{min:20,count:45},concept:{min:20,count:45},net:{min:10,count:15},ncomp:{min:26,count:30},nreason:{min:22,count:20}};
const SGBASE={sgfold:'fold',sgmech:'mech',sgnet:'net',sgeta:'eta'};
const secMin=sec=>{const k=SGBASE[sec]||sec;return run&&run.cfg&&run.cfg[k]?run.cfg[k].min:SEC[sec].min;};
function counts(cfg){if(!cfg.net)cfg.net={min:10,count:15};if(!cfg.eta)cfg.eta={min:46,count:33};if(!cfg.ncomp)cfg.ncomp={min:26,count:30};if(!cfg.nreason)cfg.nreason={min:22,count:20};return{fold:cfg.fold.count,mech:cfg.mech.count,concept:cfg.concept.count,net:cfg.net.count,eta:cfg.eta.count,ncomp:cfg.ncomp.count,nreason:cfg.nreason.count};}
function startRun(code,order,timing,level,mlevel,cfg){
  level=level||'std';mlevel=mlevel||'std';cfg=cfg||DEF_CFG;const test=G.buildTest(code,level,mlevel,counts(cfg));
  run={tout:{},bank:0,rid:rcode('T'),name:player(),code,order,timing,level,mlevel,cfg,test,sIdx:0,q:0,ans:{},flag:{},used:{},timedOut:{},remaining:0,elapsed:0,stage:'exam'};
  beginSection();
}
function beginSection(){const sec=run.order[run.sIdx];run.q=0;run.remaining=secMin(sec)*60;run.elapsed=0;run.stage='exam';enterExam();}
function enterExam(){show('exam');$('#gridpanel').hidden=true;$('#gridbtn').setAttribute('aria-expanded','false');renderQ();startClock();saveRun('active');}
let lastAuto=0;
function startClock(){clearInterval(tick);const sec=run.order[run.sIdx];const t0=Date.now(),rem0=run.remaining,el0=run.elapsed;
  const upd=()=>{const dt=(Date.now()-t0)/1000;if(run.timing==='real'){const left=rem0-dt;run.remaining=Math.max(0,left);$('#clock').textContent=mmss(left);$('#clock').classList.toggle('low',left<=120);if(left<=0){run.timedOut[sec]=true;finishSection();return;}}
    else{run.elapsed=el0+dt;$('#clock').textContent=mmss(run.elapsed);}
    pracTick();
    if(Date.now()-lastAuto>8000){lastAuto=Date.now();saveRun('active');}};
  upd();tick=setInterval(upd,500);}
function runState(status){const ser=f=>{const o={};run.order.forEach(s=>{o[s]=run.test[s].map(it=>f(it)).join('');});return o;};
  return{k:'T',rid:run.rid,name:run.name,status,saved:Date.now(),code:run.code,order:run.order,timing:run.timing,level:run.level,mlevel:run.mlevel,cfg:run.cfg,sIdx:run.sIdx,q:run.q,remaining:Math.round(run.remaining),elapsed:Math.round(run.elapsed),stage:run.stage,
    used:run.used,timedOut:run.timedOut,tout:Object.keys(run.tout||{}),lens:run.order.map(s=>run.test[s].length),a:ser(it=>run.ans[it.id]===undefined?'.':String(run.ans[it.id])),f:ser(it=>run.flag[it.id]?'1':'.')};}
function saveRun(status){if(!run||run.done)return;putSave(runState(status));}
function resumeRun(st){const test=G.buildTest(st.code,st.level,st.mlevel,counts(st.cfg||DEF_CFG));
  run={tout:Object.fromEntries((st.tout||[]).map(k=>[k,true])),bank:0,rid:st.rid,name:st.name||player(),code:st.code,order:st.order,timing:st.timing,level:st.level,mlevel:st.mlevel,cfg:st.cfg||DEF_CFG,test,sIdx:st.sIdx,q:st.q,ans:{},flag:{},used:st.used||{},timedOut:st.timedOut||{},remaining:st.remaining,elapsed:st.elapsed||0,stage:st.stage};
  st.order.forEach(s=>{const A=(st.a&&st.a[s])||'',F=(st.f&&st.f[s])||'';test[s].forEach((it,i)=>{if(A[i]&&A[i]!=='.')run.ans[it.id]=+A[i];if(F[i]==='1')run.flag[it.id]=true;});});
  if(run.stage==='inter'){showInter(run.order[run.sIdx-1]);saveRun('active');}else enterExam();}
$('#pausebtn').onclick=()=>{clearInterval(tick);saveRun('paused');showPaused(runState('paused'));};
function autoSaveAll(){if(run&&!$('#exam').hidden)saveRun('active');if(M&&!$('#melt').hidden&&!$('#m-play').hidden)saveMelt('active');}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')return;
  if(run&&!run.done&&!$('#exam').hidden){clearInterval(tick);saveRun('paused');showPaused(runState('paused'));$('#p-eye').textContent='Paused automatically when you left the page';return;}
  if(M&&!M.over&&!$('#melt').hidden&&!$('#m-play').hidden){clearInterval(mtick);saveMelt('paused');showPaused(meltState('paused'));$('#p-eye').textContent='Paused automatically when you left the page';return;}
  autoSaveAll();});
window.addEventListener('pagehide',autoSaveAll);
const SRO='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
const isGraphQ=it=>it.skill==='Math'&&!!it.grid;
function graphBody(c,i){return c.svg?`<span class="gfig" role="button" tabindex="0" aria-label="Enlarge choice ${LET[i]}">${c.svg}</span>`:`<div class="mch">${c.h||esc(c.t)}</div>`;}
/* shown big, the drawn graphs' built-in margins become wide empty bands: frame each one to its drawing (display only) */
function tightGraphs(root){root.querySelectorAll('.gfig svg.gr').forEach(s=>{try{const b=s.getBBox();if(b.width>0&&b.height>0)s.setAttribute('viewBox',[b.x-3,b.y-3,b.width+6,b.height+6].map(v=>+v.toFixed(1)).join(' '));}catch(e){}});}
function choiceBody(c,pics){return pics?(c.svg||`<div class="mch">${c.h||esc(c.t)}</div>`):`<span class="ctext${c.h?' mch':''}">${c.h||esc(c.t)}</span>`;}
function stemHtml(it,n){if(it.stemH)return `<span class="qn">${n}.</span>${it.stemH}`;return (it.type==='fold'||it.type==='cubenet'||it.type==='sgfold')?`<span class="qn">${n}.</span><span style="${SRO}">${esc(it.stem)}</span>`:`<span class="qn">${n}.</span>${esc(it.stem)}`;}
function items(){return run.test[run.order[run.sIdx]];}
function renderQ(){
  const sec=run.order[run.sIdx],list=items(),it=list[run.q];
  $('#secname').textContent=SEC[sec].name;$('#qpos').textContent=`Question ${run.q+1} of ${list.length}`;
  $('#stem').innerHTML=stemHtml(it,run.q+1);$('#figure').innerHTML=it.svg;$('#figure').hidden=!it.svg;{const s=[...document.querySelectorAll('#figure svg')].sort((p,q)=>(+(q.getAttribute('viewBox')||'0 0 0').split(' ')[2])-(+(p.getAttribute('viewBox')||'0 0 0').split(' ')[2]))[0];const vb=s?(s.getAttribute('viewBox')||'').split(' ').map(Number):[];if(vb[2]>900&&s.getBoundingClientRect().width<vb[2]*0.6)$('#figure').insertAdjacentHTML('beforeend','<span class="zoomhint">Tap the picture to enlarge</span>');}
  const pics=!!it.choices[0].svg||!!it.grid;const gq=isGraphQ(it);const fs=$('#choices');fs.className='choices'+(pics?' pics':'')+(gq?' graphs':'');
  if(gq)fs.innerHTML='<legend>Answer choices</legend><p class="ghint">Tap a picture to enlarge it. Tap the letter bar to choose.</p>'+it.choices.map((c,i)=>`<label class="choice" for="c${i}"><input type="radio" name="ans" id="c${i}" value="${i}"${run.ans[it.id]===i?' checked':''}><span class="gpick"><span class="bubble" aria-hidden="true">${LET[i]}</span><span class="gpick-t" aria-hidden="true"></span></span>${graphBody(c,i)}${c.svg?`<span class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${LET[i]}: ${esc(c.t)}</span>`:''}</label>`).join('');
  else fs.innerHTML='<legend>Answer choices</legend>'+it.choices.map((c,i)=>`<label class="choice" for="c${i}"><input type="radio" name="ans" id="c${i}" value="${i}"${run.ans[it.id]===i?' checked':''}><span class="bubble" aria-hidden="true">${LET[i]}</span>${choiceBody(c,pics)}${pics&&c.svg?`<span class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${LET[i]}: ${esc(c.t)}</span>`:''}</label>`).join('');
  if(gq)tightGraphs(fs);
  fs.querySelectorAll('input').forEach(inp=>inp.addEventListener('change',()=>{if(isPrac()){pracAnswer(+inp.value);return;}run.ans[it.id]=+inp.value;renderGrid();saveRun('active');}));
  pracRender(it);
  $('#flagbtn').setAttribute('aria-pressed',run.flag[it.id]?'true':'false');$('#flagbtn').textContent=run.flag[it.id]?'Flagged':'Flag';
  $('#prev').disabled=run.q===0;$('#next').textContent=run.q===list.length-1?(isPrac()?'Finish section':'Review & finish'):'Next →';
  pracScore();
  renderGrid();
}
function renderGrid(){const list=items();let answered=0,flagged=0;
  $('#grid').innerHTML=list.map((it,i)=>{const a=run.ans[it.id]!==undefined,f=!!run.flag[it.id];if(a)answered++;if(f)flagged++;return `<button type="button" data-i="${i}" class="${a?'ans ':''}${f?'flag ':''}${i===run.q?'cur':''}" aria-label="Question ${i+1}${a?', answered':', blank'}${f?', flagged':''}">${i+1}</button>`;}).join('');
  $('#grid').querySelectorAll('button').forEach(b=>b.onclick=()=>{run.q=+b.dataset.i;renderQ();});
  $('#gridsum').textContent=`${answered} answered · ${list.length-answered} blank · ${flagged} flagged`;}
function go(d){const n=run.q+d,list=items();if(n<0)return;if(n>=list.length){openGrid(true);return;}run.q=n;renderQ();saveRun('active');window.scrollTo(0,0);}
function openGrid(ask){$('#gridpanel').hidden=false;$('#gridbtn').setAttribute('aria-expanded','true');if(ask)askFinish();window.scrollTo(0,0);}
$('#prev').onclick=()=>go(-1);$('#next').onclick=()=>go(1);
$('#gridbtn').onclick=()=>{const p=$('#gridpanel');p.hidden=!p.hidden;$('#gridbtn').setAttribute('aria-expanded',String(!p.hidden));$('#confirm').hidden=true;};
$('#flagbtn').onclick=()=>{const it=items()[run.q];run.flag[it.id]=!run.flag[it.id];renderQ();saveRun('active');};
function askFinish(){const list=items();const blank=list.filter(it=>run.ans[it.id]===undefined).length,fl=list.filter(it=>run.flag[it.id]).length;
  $('#confirm-msg').textContent=(blank?`You have ${blank} blank question${blank>1?'s':''}. `:'Every question is answered. ')+(fl?`${fl} flagged for review. `:'')+'Once you finish, you can’t come back to this section.'+(blank?' Unless your official instructions say wrong answers cost points, fill in a best guess.':'');
  $('#confirm').hidden=false;}
$('#endsec').onclick=askFinish;$('#keep').onclick=()=>{$('#confirm').hidden=true;};$('#really').onclick=()=>finishSection();
function finishSection(){clearInterval(tick);const sec=run.order[run.sIdx];run.used[sec]=run.timing==='untimed'?run.elapsed:Math.min(secMin(sec)*60,secMin(sec)*60-run.remaining);
  if(run.sIdx<run.order.length-1){run.sIdx++;run.stage='inter';saveRun('active');showInter(sec);}
  else{run.done=true;dropSave(run.rid);showResults();}}
function showInter(prev){const nx=run.order[run.sIdx];$('#timeup').hidden=!run.timedOut[prev];$('#timeup').textContent=`Time’s up for ${SEC[prev].name}. Your answers are saved.`;
  $('#inter-eye').textContent=`Section ${run.sIdx+1} of ${run.order.length}`;$('#inter-name').textContent=SEC[nx].name;$('#inter-desc').textContent=`${run.test[nx].length} questions · ${run.timing==='real'?secMin(nx)+' minutes':'untimed'} · ${SEC[nx].choices} answer choices each. On the real test the next section starts right away.`;show('inter');$('#inter-go').focus();}
$('#inter-go').onclick=beginSection;
document.addEventListener('keydown',e=>{if($('#exam').hidden||!$('#melt').hidden||e.target.tagName==='INPUT'&&e.target.type!=='radio'||e.metaKey||e.ctrlKey||e.altKey)return;const k=e.key.toLowerCase();const it=items()[run.q];
  let idx='abcde'.indexOf(k);if(idx<0&&/^[1-5]$/.test(k))idx=+k-1;
  if(idx>=0&&k.length===1){if(idx<it.choices.length){if(isPrac()){pracAnswer(idx);}else{run.ans[it.id]=idx;renderQ();saveRun('active');}}e.preventDefault();return;}
  if(k==='enter'&&isPrac()&&pracLocked(it)&&!$('#pfb').hidden){go(1);e.preventDefault();return;}
  if(k==='n'||k==='arrowright'){go(1);e.preventDefault();}else if(k==='p'||k==='arrowleft'){go(-1);e.preventDefault();}else if(k==='f'){$('#flagbtn').click();e.preventDefault();}});

/* ---------- results ---------- */
function showResults(){
  const parts=run.order.map(sec=>{const list=run.test[sec];const right=list.filter(it=>run.ans[it.id]===it.correct).length;const blank=list.filter(it=>run.ans[it.id]===undefined).length;return{sec,right,total:list.length,blank,used:run.used[sec]};});
  const R=parts.reduce((a,p)=>a+p.right,0),Tt=parts.reduce((a,p)=>a+p.total,0),pct=Math.round(100*R/Tt);
  const h=store.get('fm-history',[]);h.unshift({code:run.code,date:new Date().toLocaleDateString(),timing:run.timing,parts:parts.map(p=>({sec:p.sec,right:p.right,total:p.total}))});store.set('fm-history',h.slice(0,20));
  const bySub={};run.order.forEach(sec=>run.test[sec].forEach(it=>{const s=bySub[it.sub]||(bySub[it.sub]={n:0,r:0});s.n++;if(run.ans[it.id]===it.correct)s.r++;}));
  const subRows=Object.entries(bySub).sort((a,b)=>a[1].r/a[1].n-b[1].r/b[1].n).map(([k,v])=>{const p=Math.round(100*v.r/v.n);return `<tr><td>${esc(k)}</td><td><div class="bar"><i class="${p<60?'lo':p>=85?'hi':''}" style="width:${p}%"></i></div></td><td class="n">${v.r}/${v.n}</td></tr>`;}).join('');
  const secRows=parts.map(p=>{const pace=(p.used||0)/p.total;return `<tr><td>${SEC[p.sec].name}</td><td class="n"><b>${p.right}/${p.total}</b> (${Math.round(100*p.right/p.total)}%)</td><td class="n">${mmss(p.used||0)}${run.timedOut[p.sec]?' · timed out':''}</td><td class="n">${Math.round(pace)}s <span class="muted">vs ${Math.round(secMin(p.sec)*60/p.total)}s</span></td><td class="n">${p.blank}</td></tr>`;}).join('');
  $('#results').innerHTML=`
    <div class="hero"><span class="eyebrow">Results · test code <span class="mono">${esc(run.code)}</span>${run.timing==='untimed'?' · untimed':''}</span>
      <div class="score"><span class="big">${R}/${Tt}</span><span style="font:700 28px var(--display)">${pct}%</span></div>
      <p class="muted">${pct>=85?'At or above this site’s 85% readiness target.':'This site’s readiness target is 85% at real time. It’s the site’s own guideline, not an official pass mark; the real cutoff isn’t published.'}</p></div>
    <div class="tablewrap"><table class="spec"><thead><tr><th>Section</th><th class="n">Score</th><th class="n">Time used</th><th class="n">Pace</th><th class="n">Blank</th></tr></thead><tbody>${secRows}</tbody></table></div>
    <div><h2 style="margin-bottom:10px">By question type</h2><div class="tablewrap"><table class="spec skills"><thead><tr><th>Type</th><th>Accuracy</th><th class="n">Right</th></tr></thead><tbody>${subRows}</tbody></table></div></div>
    <div class="start-row"><button class="btn primary" id="r-new">New test</button><button class="btn" id="r-same">Retake code ${esc(run.code)}</button></div>
    <div><h2 style="margin-bottom:10px">Review</h2>
      <div class="filters" role="radiogroup" aria-label="Show"><div class="seg">
        <label><input type="radio" name="rf" id="rf-miss" value="miss" checked><span>Missed &amp; blank</span></label>
        <label><input type="radio" name="rf" id="rf-flag" value="flag"><span>Flagged</span></label>
        <label><input type="radio" name="rf" id="rf-all" value="all"><span>All</span></label></div></div></div>
    <div class="review" id="review"></div>`;
  show('results');
  $('#r-new').onclick=()=>{$('#code').value=newCode();$('#eta-code').value=newCode();renderHistory();goHome();};
  $('#r-same').onclick=()=>startRun(run.code,run.order,run.timing,run.level,run.mlevel,run.cfg);
  document.querySelectorAll('input[name="rf"]').forEach(i=>i.addEventListener('change',()=>renderReview(i.value)));
  renderReview('miss');
}
function renderReview(filter){
  let html='';run.order.forEach(sec=>{run.test[sec].forEach((it,i)=>{const a=run.ans[it.id],ok=a===it.correct,blank=a===undefined;
    if(filter==='miss'&&ok)return;if(filter==='flag'&&!run.flag[it.id])return;const pics=!!it.choices[0].svg||!!it.grid;const gq=isGraphQ(it);
    const ch=it.choices.map((c,j)=>`<div class="rc${j===it.correct?' is-correct':''}${j===a&&!ok?' is-picked':''}"><span class="bubble">${LET[j]}</span>${gq?graphBody(c,j):choiceBody(c,pics)}</div>`).join('');
    const why=(!ok&&!blank&&it.choices[a].note)?`<p><b>Your pick (${LET[a]}):</b> ${esc(it.choices[a].note)}</p>`:'';
    html+=`<article class="ritem ${ok?'right':blank?'blank':'wrong'}"><div class="head"><span>${SEC[sec].name} · Q${i+1}${run.flag[it.id]?' · flagged':''}</span><span>${ok?'Correct':blank?'Blank · answer '+LET[it.correct]:'Missed · answer '+LET[it.correct]}</span></div>
      ${(it.type==='fold'||it.type==='cubenet'||it.type==='sgfold')?'':`<p>${it.stemH||esc(it.stem)}</p>`}${it.svg?`<div class="figure">${it.svg}</div>`:''}<div class="rch${pics?' pics':''}${gq?' graphs':''}">${ch}</div>
      <div class="why">${why}<p><b>How to get it:</b> ${it.explainH||esc(it.explain)}</p><p class="muted" style="font-size:13px">${esc(it.sub)}</p></div>${G.ANIM.can(it)?`<div class="anim-slot"><button type="button" class="btn small primary anim-go" data-sec="${sec}" data-i="${i}">▶ Watch it worked out</button></div>`:''}</article>`;});});
  $('#review').innerHTML=html||'<p class="muted">Nothing to show here.</p>';tightGraphs($('#review'));
  $('#review').querySelectorAll('.anim-go').forEach(b=>b.onclick=()=>G.ANIM.mount(b.parentElement,run.test[b.dataset.sec][+b.dataset.i],true));
}

/* ---------- practice mode: instant feedback, per-question timer, replays ---------- */
const PBANK=60;
function isPrac(){return !!(run&&run.cfg&&run.cfg.practice);}
function pracLocked(it){return run.ans[it.id]!==undefined||!!(run.tout&&run.tout[it.id]);}
function pracPace(){const sec=run.order[run.sIdx];return secMin(sec)*60/items().length;}
function pracRender(it){const pq=$('#pq'),fb=$('#pfb');if(!isPrac()){pq.hidden=true;fb.hidden=true;return;}
  const locked=pracLocked(it);$('#choices').classList.toggle('locked',locked);
  if(locked){pq.hidden=true;run.qId=null;pracShow(it,false);return;}
  fb.hidden=true;fb.innerHTML='';
  if(run.timing==='untimed'){pq.hidden=true;run.qId=null;return;}
  run.qId=it.id;run.qStart=Date.now();run.qLimit=Math.round(pracPace())+(run.bank||0);run.qBank=run.bank||0;pq.hidden=false;pracTick();}
function pracTick(){if(!isPrac()||!run.qId||run.timing==='untimed')return;const it=items()[run.q];if(!it||it.id!==run.qId)return;
  const left=run.qLimit-(Date.now()-run.qStart)/1000;$('#pq-t').textContent=Math.max(0,Math.ceil(left))+'s'+(run.qBank?` (+${run.qBank}s banked)`:'');
  const bar=$('#pq-bar');bar.style.width=Math.max(0,100*left/run.qLimit)+'%';bar.classList.toggle('low',left<=5);
  if(left<=0){run.tout[it.id]=true;run.bank=0;run.qId=null;$('#pq').hidden=true;pracShow(it,true);renderGrid();saveRun('active');}}
function pracAnswer(i){const it=items()[run.q];if(pracLocked(it))return;const ok=i===it.correct;
  const used=run.qStart?(Date.now()-run.qStart)/1000:0;run.bank=(ok&&run.timing!=='untimed'&&run.qLimit)?Math.min(PBANK,Math.max(0,Math.round(run.qLimit-used))):0;
  run.ans[it.id]=i;run.qId=null;$('#pq').hidden=true;renderQ();pracShow(it,true);saveRun('active');}
function pracScore(){if(!isPrac())return;const list=items(),r=list.filter(x=>run.ans[x.id]===x.correct).length,d=list.filter(x=>pracLocked(x)).length;$('#qpos').textContent=`Question ${run.q+1} of ${list.length}`+(d?` · ${r}/${d} right`:'');}
function pracShow(it,fresh){pracScore();const fb=$('#pfb'),a=run.ans[it.id],to=a===undefined,ok=a===it.correct;
  $('#choices').classList.add('locked');$('#choices').querySelectorAll('.choice').forEach((c,j)=>{c.classList.toggle('good',j===it.correct);c.classList.toggle('badpick',j===a&&!ok);const inp=c.querySelector('input');if(inp)inp.disabled=true;});
  const note=!ok&&!to&&it.choices[a].note?`<p><b>Your pick (${LET[a]}):</b> ${esc(it.choices[a].note)}</p>`:'';const can=G.ANIM.can(it);const last=run.q===items().length-1;
  fb.innerHTML=`<div class="verdict ${ok?'ok':'no'}">${ok?'Correct':to?`Time’s up · answer ${LET[it.correct]}`:`Missed · answer ${LET[it.correct]}`}</div>
    <div class="why">${note}<p><b>How to get it:</b> ${it.explainH||esc(it.explain)}</p>${ok&&fresh&&run.bank?`<p class="muted" style="font-size:13px">+${run.bank}s banked for the next question</p>`:''}</div>
    ${can?`<div class="anim-slot" id="p-anim">${ok||!fresh?'<button type="button" class="btn small primary" id="p-anim-go">▶ Watch it worked out</button>':''}</div>`:''}
    <div class="start-row"><button type="button" class="btn primary" id="p-next">${last?'Finish section':'Next question →'}</button><span class="keys"><kbd>Enter</kbd> next</span></div>`;
  fb.hidden=false;$('#p-next').onclick=()=>go(1);
  if(can){if(!ok&&fresh)G.ANIM.mount($('#p-anim'),it,true);else $('#p-anim-go').onclick=()=>G.ANIM.mount($('#p-anim'),it,true);}
  if(fresh)fb.scrollIntoView({behavior:'smooth',block:'nearest'});}

/* ---------- MELTDOWN ∞ (endless) ---------- */
let M=null,mtick=null;
function meltBestText(){const b=store.get('fm-melt-best',null);$('#melt-best').textContent=b?`Best: ${b.score.toLocaleString()} points · level ${b.level} · longest streak ${b.streak}`:'No runs yet.';}
meltBestText();
$('#melt-go').onclick=startMelt;
function startMelt(){store.set('fm-player',$('#pname').value.trim());M={rid:rcode('M'),name:player(),seed:Math.floor(Math.random()*1e9),n:0,right:0,score:0,streak:0,bestStreak:0,level:1,el:0,t0:Date.now(),recent:[],recentBefore:[],genLevel:1,cur:null,locked:false,byType:{},bank:0};const pc=mpaceRead();M.pf=pc.fold;M.pm=pc.mech;
  enterMelt();nextMelt();}
function meltEl(){return M.el+(Date.now()-M.t0)/1000;}
const BANKCAP=60;
const MPACE={std:[38,27],easy:[60,40]};
function mpaceGet(){const c=store.get('fm-mpace',null);return c&&c.mode?c:{mode:'std',fold:38,mech:27};}
function mpaceForm(){const c=mpaceGet();document.querySelector('input[name="mpace"][value="'+c.mode+'"]').checked=true;$('#mp-fold').value=c.fold;$('#mp-mech').value=c.mech;}
function mpaceRead(){const mode=document.querySelector('input[name="mpace"]:checked').value;const cl=v=>Math.max(5,Math.min(300,Math.round(+v)||5));const c=mode==='custom'?{mode,fold:cl($('#mp-fold').value),mech:cl($('#mp-mech').value)}:{mode,fold:MPACE[mode][0],mech:MPACE[mode][1]};store.set('fm-mpace',c);return c;}
document.querySelectorAll('input[name="mpace"]').forEach(r=>r.onchange=()=>{if(r.value!=='custom'){$('#mp-fold').value=MPACE[r.value][0];$('#mp-mech').value=MPACE[r.value][1];}});
['mp-fold','mp-mech'].forEach(i=>$('#'+i).oninput=()=>{document.querySelector('input[name="mpace"][value="custom"]').checked=true;});
mpaceForm();
function qLimit(it,lv){const base=it.sec==='fold'?M.pf:M.pm;return Math.max(5,Math.round(base*Math.max(0.8,1-0.02*(lv-1))));}
function qElapsed(){return (M.qUsed||0)+(Date.now()-M.qT0)/1000;}
function meltQTick(){if(!M||!M.cur||M.locked)return;const e=qElapsed(),left=Math.max(0,M.qLimit-e),f=left/M.qLimit;$('#m-qt').textContent=Math.ceil(left)+'s';$('#m-ql').textContent=M.bank?`Question time (+${M.bank}s banked)`:'Question time';const b=$('#m-qbar');b.style.width=(f*100)+'%';b.className=f<.25?'low':'';if(left<=0)answerMelt(-1);}
function enterMelt(){show('melt');$('#m-over').hidden=true;$('#m-play').hidden=false;clearInterval(mtick);M.t0=Date.now();mtick=setInterval(()=>{$('#m-clock').textContent=mmss(meltEl());meltQTick();if(Date.now()-lastAuto>8000){lastAuto=Date.now();saveMelt('active');}},500);}
function meltState(status){return{k:'M',rid:M.rid,name:M.name,status,saved:Date.now(),seed:M.seed,n:M.n,right:M.right,score:M.score,streak:M.streak,bestStreak:M.bestStreak,level:M.level,el:Math.round(meltEl()),recent:M.recent,recentBefore:M.recentBefore,genLevel:M.genLevel,locked:M.locked,byType:M.byType,bank:M.bank||0,pf:M.pf,pm:M.pm,qUsed:(M.cur&&!M.locked)?Math.round(qElapsed()):0};}
function boardPut(status){const bd=store.get(BOARD,{});const answered=M.locked?M.n:M.n-1;if(answered<=0&&!bd[M.rid])return;bd[M.rid]={rid:M.rid,name:M.name,score:M.score,level:M.level,streak:M.bestStreak,answered,right:M.right,time:Math.round(meltEl()),status,date:Date.now()};store.set(BOARD,bd);}
function saveMelt(status){if(!M||M.over)return;putSave(meltState(status));boardPut(status==='paused'?'paused':'active');}
function resumeMelt(st){M=Object.assign({},st,{t0:Date.now(),cur:null,byType:st.byType||{}});M.el=st.el||0;M.carry=st.locked?0:(st.qUsed||0);if(!M.pf){M.pf=60;M.pm=40;}if(!M.name)M.name=player();enterMelt();
  if(st.locked){nextMelt();}else{M.n=st.n-1;M.recent=(st.recentBefore||[]).slice();M.level=st.genLevel||st.level;nextMelt();M.level=st.level;}updateMeltBar();saveMelt('active');}
$('#m-pause').onclick=()=>{clearInterval(mtick);saveMelt('paused');showPaused(meltState('paused'));};
function meltLevel(){return 1+Math.floor(M.right/4);}
function nextMelt(){M.n++;M.recentBefore=M.recent.slice();M.genLevel=M.level;let it=null;for(let k=0;k<5&&!it;k++){try{it=G.endlessItem(G.hashSeed(M.seed,M.n,k),M.level,M.recent);}catch(e){it=null;}}
  M.cur=it;M.locked=false;M.qStart=Date.now();M.baseLimit=qLimit(it,M.level);M.qLimit=M.baseLimit+(M.bank||0);M.qUsed=M.carry||0;M.carry=0;M.qT0=Date.now();M.recent.push(it.type);if(M.recent.length>6)M.recent.shift();
  $('#m-stem').innerHTML=stemHtml(it,M.n);$('#m-fig').innerHTML=it.svg;const pics=!!it.choices[0].svg;const fs=$('#m-choices');fs.className='choices'+(pics?' pics':'');
  fs.innerHTML='<legend>Answer choices</legend>'+it.choices.map((c,i)=>`<button type="button" class="choice" data-i="${i}"><span class="bubble" aria-hidden="true">${LET[i]}</span>${pics?c.svg+`<span class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${LET[i]}: ${esc(c.t)}</span>`:`<span class="ctext">${esc(c.t)}</span>`}</button>`).join('');
  fs.querySelectorAll('.choice').forEach(b=>b.onclick=()=>answerMelt(+b.dataset.i));$('#m-fb').hidden=true;updateMeltBar();meltQTick();saveMelt('active');window.scrollTo(0,0);}
function updateMeltBar(){$('#m-lvl').textContent=M.level;$('#m-score').textContent=M.score.toLocaleString();$('#m-heat').style.width=((M.right%4)/4*100)+'%';}
function answerMelt(i){if(M.locked)return;M.locked=true;const it=M.cur,to=i<0,ok=i===it.correct,secs=qElapsed();const oldLevel=M.level;let pts=0,fast=false;
  const bt=M.byType[it.sub]||(M.byType[it.sub]={n:0,r:0});bt.n++;
  if(ok){M.right++;M.streak++;M.bestStreak=Math.max(M.bestStreak,M.streak);const mult=1+0.1*Math.min(M.streak-1,20);fast=secs<=M.baseLimit/2;pts=Math.round(100*M.level*mult*(fast?1.25:1));M.score+=pts;bt.r++;}else M.streak=0;
  const bankIn=M.bank||0;M.bank=ok?Math.min(BANKCAP,Math.max(0,Math.round(M.qLimit-secs))):0;M.level=meltLevel();const up=M.level>oldLevel;
  $('#m-choices').querySelectorAll('.choice').forEach((b,j)=>{b.setAttribute('aria-disabled','true');if(j===it.correct)b.classList.add('good');if(j===i&&!ok)b.classList.add('badpick');});
  saveMelt('active');const el=meltEl();const note=!ok&&!to&&it.choices[i].note?`<p><b>Your pick (${LET[i]}):</b> ${esc(it.choices[i].note)}</p>`:'';
  const fb=$('#m-fb');fb.innerHTML=`<div class="verdict ${ok?'ok':'no'}">${ok?`Correct · +${pts.toLocaleString()}${fast?' · fast bonus ×1.25':''}`:to?`Time's up · answer ${LET[it.correct]}`:`Missed · answer ${LET[it.correct]}`}</div>
    ${up?`<div class="levelup">Level ${M.level}. It gets harder from here.</div>`:''}
    <div class="why">${note}<p><b>How to get it:</b> ${it.explainH||esc(it.explain)}</p><p class="muted" style="font-size:13px">${ok&&M.bank?`+${M.bank}s banked for the next question · `:''}${esc(it.sub)} · ${to?'ran out of time ('+M.qLimit+'s limit)':'answered in '+Math.round(secs)+'s of '+M.qLimit+'s'}</p></div>
    ${G.ANIM.can(it)?`<div class="anim-slot" id="m-anim">${ok?'<button type="button" class="btn small primary" id="m-anim-go">▶ Watch it worked out</button>':''}</div>`:''}
    <div class="board">
      <div class="up"><span>Score</span><b>${M.score.toLocaleString()}</b></div>
      <div class="up"><span>Level</span><b>${M.level}</b></div>
      <div><span>Streak</span><b>${M.streak}</b></div>
      <div><span>Best streak</span><b>${M.bestStreak}</b></div>
      <div><span>Answered</span><b>${M.n}</b></div>
      <div><span>Accuracy</span><b>${Math.round(100*M.right/M.n)}%</b></div>
      <div><span>Time</span><b>${mmss(el)}</b></div>
      <div><span>Avg / question</span><b>${Math.round(el/M.n)}s</b></div>
    </div>
    <div class="start-row"><button type="button" class="btn heat" id="m-next">Next question →</button><span class="keys"><kbd>Enter</kbd> next</span></div>`;
  if(G.ANIM.can(it)){if(!ok)G.ANIM.mount($('#m-anim'),it,true);else $('#m-anim-go').onclick=()=>G.ANIM.mount($('#m-anim'),it,true);}
  fb.hidden=false;$('#m-next').onclick=nextMelt;updateMeltBar();$('#m-next').focus({preventScroll:true});fb.scrollIntoView({behavior:'smooth',block:'nearest'});}
$('#m-end').onclick=endMelt;
function endMelt(){if(!M)return;clearInterval(mtick);const el=meltEl();boardPut('finished');M.over=true;dropSave(M.rid);const answered=M.locked?M.n:M.n-1;const best=store.get('fm-melt-best',null);const isBest=!best||M.score>best.score;
  if(isBest&&answered>0)store.set('fm-melt-best',{score:M.score,level:M.level,streak:M.bestStreak});
  const rows=Object.entries(M.byType).sort((a,b)=>a[1].r/a[1].n-b[1].r/b[1].n).map(([k,v])=>{const p=Math.round(100*v.r/v.n);return `<tr><td>${esc(k)}</td><td><div class="bar"><i class="${p<60?'lo':p>=85?'hi':''}" style="width:${p}%"></i></div></td><td class="n">${v.r}/${v.n}</td></tr>`;}).join('');
  $('#m-play').hidden=true;const o=$('#m-over');o.hidden=false;o.innerHTML=`<div class="hero"><span class="eyebrow">Meltdown over${isBest&&answered>0?' · new best':''}</span>
    <div class="score"><span class="big">${M.score.toLocaleString()}</span><span style="font:700 28px var(--display)">level ${M.level}</span></div>
    <p class="muted">${answered} answered · ${M.right} right (${answered?Math.round(100*M.right/answered):0}%) · longest streak ${M.bestStreak} · ${mmss(el)}</p></div>
    ${rows?`<div><h2 style="margin-bottom:10px">By question type</h2><div class="tablewrap"><table class="spec skills"><thead><tr><th>Type</th><th>Accuracy</th><th class="n">Right</th></tr></thead><tbody>${rows}</tbody></table></div></div>`:''}
    <div><h2 style="margin-bottom:10px">High scores</h2><div class="tablewrap">${boardHtml(M.rid)}</div></div>
    <div class="start-row"><button class="btn heat" id="m-again">Run it again</button><button class="btn" id="m-home">Back to tests</button></div>`;
  $('#m-again').onclick=startMelt;$('#m-home').onclick=goHome;wireBoard(o);}
function boardHtml(me){const rows=Object.values(store.get(BOARD,{})).sort((a,b)=>b.score-a.score||b.level-a.level).slice(0,15);if(!rows.length)return '<p class="muted">No runs yet. Finished and paused runs show up here.</p>';const saves=store.get(SAVES,{});
  return `<table class="spec board-t"><thead><tr><th>#</th><th>Player</th><th class="n">Score</th><th class="n">Level</th><th class="n">Streak</th><th class="n">Right</th><th class="n">Time</th><th>Status</th></tr></thead><tbody>${rows.map((r,i)=>{const can=r.status!=='finished'&&saves[r.rid];
    return `<tr class="${r.rid===me?'me':''}"><td>${i+1}</td><td><b>${esc(r.name)}</b><br><span class="muted mono" style="font-size:12px">${esc(r.rid)}</span></td><td class="n"><b>${r.score.toLocaleString()}</b></td><td class="n">${r.level}</td><td class="n">${r.streak}</td><td class="n">${r.right}/${r.answered}</td><td class="n">${mmss(r.time)}</td><td>${r.status==='finished'?'<span class="tag done">Finished</span>':`<span class="tag paused">${r.status==='paused'?'Paused':'Left mid-run'}</span>`}${can?` <button type="button" class="btn small" data-mr="${esc(r.rid)}">Resume</button>`:''}</td></tr>`;}).join('')}</tbody></table>`;}
function wireBoard(root){root.querySelectorAll('[data-mr]').forEach(b=>b.onclick=()=>resumeState(store.get(SAVES,{})[b.dataset.mr]));}
function renderBoard(){$('#melt-board').innerHTML=boardHtml(null);wireBoard($('#melt-board'));}
renderSaved();renderBoard();
document.addEventListener('keydown',e=>{if($('#melt').hidden||e.metaKey||e.ctrlKey||e.altKey)return;if(!M||$('#m-play').hidden)return;const k=e.key.toLowerCase();
  if(M.locked){if(k==='enter'||k==='n'){e.preventDefault();nextMelt();}return;}
  let idx='abcde'.indexOf(k);if(idx<0&&/^[1-5]$/.test(k))idx=+k-1;if(idx>=0&&k.length===1&&idx<M.cur.choices.length){e.preventDefault();answerMelt(idx);}});
setTab(curTab);
})();
