(()=>{
'use strict';
const $=s=>document.querySelector(s);
const NS='http://www.w3.org/2000/svg';
const pc=c=>Math.round(c*100)+'%';
const f2=n=>(n<0?'−':'')+Math.abs(n).toFixed(2);
const CATEM={ani:'🐾',tec:'⚙️',nat:'🌿',com:'🍽️',gen:'🧑',geo:'🌍',idi:'🗣️',opu:'↔️',acc:'🏃',ofi:'🛠️'};

/* ---------- datos reales ---------- */
const words=DATA.words.map((w,i)=>{
  const nr=Math.hypot(...w.v), u=w.v.map(x=>x/nr);
  return {i,n:w.n,e:w.e||CATEM[w.c],c:w.c,p:w.p,u,x:Float64Array.from(u,v=>v*10)};
});
const N=words.length, D=300;
const idx=n=>words.findIndex(w=>w.n===n);
const FEM=new Set('reina mujer niña madre abuela princesa hija hermana tía sobrina esposa novia actriz emperatriz duquesa condesa chica señora profesora doctora dama bruja hada gata perra leona yegua vaca gallina'.split(' '));
const MAS=new Set('rey hombre niño padre abuelo príncipe hijo hermano tío sobrino esposo novio actor emperador duque conde chico señor profesor doctor caballero brujo mago gato perro león toro gallo caballo'.split(' '));
const TASKS={
  ani:{ic:'🐾',t:'¿Es un animal?',yes:'animal',truth:w=>w.c==='ani'},
  geo:{ic:'🌍',t:'¿Es un país o una ciudad?',yes:'lugar',truth:w=>w.c==='geo'},
  fem:{ic:'👩',t:'¿Es femenino?',yes:'femenino',truth:w=>FEM.has(w.n)?true:MAS.has(w.n)?false:null},
  own:{ic:'✏️',t:'Mi propio concepto',yes:'tu concepto',truth:()=>null}
};
const AXES=[[0,1],[0,2],[1,2]];

/* ---------- estado ---------- */
let task='ani', axi=0, running=false, raf=0, score=0, insp=idx('perro');
const lab=new Int8Array(N);
let w=new Float64Array(D), b=0, epoch=0, hist=[], P=new Float64Array(N), trained=false, lastLoss=1;
const seedRand=(()=>{let s=7;return()=>{s=(s*16807)%2147483647;return s/2147483647;};})();
const randn=()=>{let u=0,v=0;while(!u)u=seedRand();while(!v)v=seedRand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const lrVal=()=>0.004*Math.pow(1.55,+$('#lr').value);   // 1..10 → ~0.006..0.3

const ROUNDS=[{task:'ani',k:6},{task:'geo',k:4},{task:'fem',k:6},{task:'ani',k:2},{task:'geo',k:2},{task:'fem',k:4}];
const TOTAL=ROUNDS.length*3;
const RANKS=[[0,'🥚 Principiante'],[6,'🔭 Explorador'],[12,'🧭 Navegante vectorial'],[17,'🏆 Maestro del espacio vectorial']];
let mode='game', round=0, stars=ROUNDS.map(()=>0), exam=[], examRes=null;
const used=()=>labeled().length;
const budget=()=>mode==='game'?ROUNDS[round].k:99;

/* ---------- la neurona ---------- */
const sig=z=>1/(1+Math.exp(-z));
function resetNeuron(){
  for(let k=0;k<D;k++) w[k]=randn()*0.01; b=0; epoch=0; hist=[]; trained=false; running=false; lastLoss=1;
  predictAll();
}
function zOf(i){ let s=b; const x=words[i].x; for(let k=0;k<D;k++) s+=w[k]*x[k]; return s; }
function predictAll(){ for(let i=0;i<N;i++) P[i]=sig(zOf(i)); }
function labeled(){ const L=[]; for(let i=0;i<N;i++) if(lab[i]!==0) L.push(i); return L; }
function canTrain(){ const L=labeled(); return L.some(i=>lab[i]===1)&&L.some(i=>lab[i]===-1); }
function step(lr){
  const L=labeled(), g=new Float64Array(D); let gb=0, loss=0;
  for(const i of L){
    const y=lab[i]===1?1:0, p=sig(zOf(i)), e=p-y, x=words[i].x;
    for(let k=0;k<D;k++) g[k]+=e*x[k];
    gb+=e; loss+=-(y*Math.log(p+1e-12)+(1-y)*Math.log(1-p+1e-12));
  }
  const n=L.length, lam=1e-3;
  for(let k=0;k<D;k++) w[k]-=lr*(g[k]/n+lam*w[k]);
  b-=lr*gb/n; epoch++; lastLoss=loss/n; hist.push(lastLoss); if(hist.length>500)hist.shift();
}
function metrics(){
  const L=labeled(); let ok=0;
  for(const i of L) if((P[i]>.5)===(lab[i]===1)) ok++;
  const tr=L.length?ok/L.length:null;
  let ty=0,ky=0,tn=0,kn=0; const wrong=[];
  const T=TASKS[task];
  for(let i=0;i<N;i++){
    if(lab[i]!==0||mode==='game')continue; const tv=T.truth(words[i]); if(tv===null)continue;
    const pr=P[i]>.5;
    if(tv){ky++; if(pr)ty++;} else {kn++; if(!pr)tn++;}
    if(pr!==tv) wrong.push(i);
  }
  const te=(ky&&kn)&&trained&&mode==='free'?((ty/ky)+(tn/kn))/2:null;
  return {tr,te,wrong,nlab:L.length,ny:L.filter(i=>lab[i]===1).length,nn:L.filter(i=>lab[i]===-1).length};
}

/* ---------- ejemplos ---------- */
function clearLabels(){ lab.fill(0); }
function randomExamples(k){
  const T=TASKS[task]; if(task==='own')return;
  clearLabels();
  const yes=[],no=[];
  words.forEach(wd=>{const t=T.truth(wd); if(t===true)yes.push(wd.i); else if(t===false)no.push(wd.i);});
  const pick=(a,n)=>{const c=a.slice(),o=[];while(o.length<n&&c.length)o.push(c.splice(Math.floor(Math.random()*c.length),1)[0]);return o;};
  pick(yes,k).forEach(i=>lab[i]=1); pick(no,k).forEach(i=>lab[i]=-1);
}
function newExam(){
  const T=TASKS[task], yes=[],no=[];
  words.forEach(wd=>{const t=T.truth(wd); if(t===true)yes.push(wd.i); else if(t===false)no.push(wd.i);});
  const pick=(a,n)=>{const c=a.slice(),o=[];while(o.length<n&&c.length)o.push(c.splice(Math.floor(Math.random()*c.length),1)[0]);return o;};
  exam=pick(yes,5).concat(pick(no,5)).sort(()=>Math.random()-.5); examRes=null;
}
function startRound(r){
  mode='game'; round=r; task=ROUNDS[r].task; running=false; resetNeuron(); clearLabels(); newExam();
  buildTasks(); renderMissions(); drawAll();
}
function setTask(t){
  mode='free'; task=t; running=false; resetNeuron(); clearLabels(); exam=[]; examRes=null;
  if(t!=='own') randomExamples(3);
  buildTasks(); renderMissions(); drawAll();
}
function presentExam(){
  if(!trained||examRes)return;
  const T=TASKS[task], items=exam.map(i=>({i,truth:T.truth(words[i]),pred:P[i]>.5}));
  const correct=items.filter(o=>o.truth===o.pred).length, st=correct>=9?3:correct>=7?2:correct>=5?1:0;
  const m=metrics(); stars[round]=Math.max(stars[round],st);
  examRes={items,correct,st,tr:m.tr,nlab:m.nlab}; running=false;
  score=stars.reduce((a,c)=>a+c,0); renderScore(); renderMissions();
  toast(st?`${'⭐'.repeat(st)} ¡Acertó ${correct} de 10 en el examen!`:`Acertó ${correct} de 10: ¡intenta de nuevo!`);
  drawAll();
}

/* ---------- mapa ---------- */
function mix(c1,c2,t){return c1.map((v,k)=>Math.round(v+(c2[k]-v)*t));}
const GR=[205,206,224], OR=[232,120,0], NV=[32,32,80];
function colOf(p){ const t=2*p-1, c=t>=0?mix(GR,OR,t):mix(GR,NV,-t); return `rgb(${c})`; }
let pos=[];
function layoutPos(){
  const [a,c]=AXES[axi]; let m1=0,m2=0;
  for(const wd of words){m1=Math.max(m1,Math.abs(wd.p[a]));m2=Math.max(m2,Math.abs(wd.p[c]));}
  pos=words.map(wd=>[400+wd.p[a]/m1*350, 400-wd.p[c]/m2*350]);
}
function drawMap(m){
  const wrongSet=new Set(m.wrong);
  let h=`<rect x="50" y="50" width="700" height="700" fill="none" stroke="#D8D8E8" stroke-width="2" rx="8"/>
         <line x1="50" y1="400" x2="750" y2="400" stroke="#ECECF4" stroke-width="2"/><line x1="400" y1="50" x2="400" y2="750" stroke="#ECECF4" stroke-width="2"/>`;
  const labs=[], top=[];
  for(const wd of words){
    const [x,y]=pos[wd.i]; const L=lab[wd.i];
    if(L!==0){ labs.push(wd); continue; }
    if(mode==='game'&&exam.includes(wd.i)){
      if(!examRes) h+=`<g data-i="${wd.i}" style="cursor:not-allowed"><circle cx="${x}" cy="${y}" r="11" fill="#fff" stroke="#802080" stroke-width="3" stroke-dasharray="4 3"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="800" fill="#802080">?</text></g>`;
      continue;
    }
    const wr=trained&&wrongSet.has(wd.i);
    h+=`<g data-i="${wd.i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="13" fill="transparent"/><circle cx="${x}" cy="${y}" r="${wr?8:7}" fill="${trained?colOf(P[wd.i]):'#CFCFE0'}" stroke="${wr?'#D64550':'#fff'}" stroke-width="${wr?3:1.5}"><title>${wd.n}${trained?' · '+pc(P[wd.i])+' sí':''}</title></circle></g>`;
    if(wr&&top.length<10) top.push(wd);
  }
  for(const wd of top){ const [x,y]=pos[wd.i]; h+=`<text class="dlb" x="${x}" y="${y-12}" style="fill:#9A2630">${wd.n}</text>`; }
  for(const wd of labs){
    const [x,y]=pos[wd.i], yes=lab[wd.i]===1;
    h+=`<g data-i="${wd.i}" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="19" fill="#fff" stroke="${yes?'#E87800':'#202050'}" stroke-width="5"/>
        <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="19">${wd.e}</text>
        <circle cx="${x+15}" cy="${y-15}" r="9" fill="${yes?'#E87800':'#202050'}"/><text x="${x+15}" y="${y-15}" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#fff" font-weight="800">${yes?'✓':'✗'}</text>
        <text class="blb" x="${x}" y="${y+36}">${wd.n}</text></g>`;
  }
  if(examRes){ for(const o of examRes.items){ const [x,y]=pos[o.i], ok=o.truth===o.pred, c=ok?'#1E9C8A':'#D64550'; h+=`<g data-i="${o.i}"><circle cx="${x}" cy="${y}" r="19" fill="#fff" stroke="${c}" stroke-width="5"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="19">${words[o.i].e}</text><circle cx="${x+15}" cy="${y-15}" r="9" fill="${c}"/><text x="${x+15}" y="${y-15}" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#fff" font-weight="800">${ok?'✓':'✗'}</text><text class="blb" x="${x}" y="${y+36}">${words[o.i].n}</text></g>`; } }
  if(insp!==null&&lab[insp]===0&&!(mode==='game'&&exam.includes(insp)&&!examRes)){ const [x,y]=pos[insp]; h+=`<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="#802080" stroke-width="3" stroke-dasharray="4 3" pointer-events="none"/><text class="blb" x="${x}" y="${y-18}" style="fill:#802080">${words[insp].n}</text>`; }
  $('#map').innerHTML=h;
}
function metersText(m){
  const T=TASKS[task];
  if(mode==='game'){
    const R=ROUNDS[round];
    $('#meterTxt').innerHTML=`🎮 <b>Ronda ${round+1}/${ROUNDS.length}</b> · ${T.t} · 🃏 Tarjetas <b>${m.nlab}/${R.k}</b> (✅ ${m.ny} · ❌ ${m.nn})${trained&&m.tr!==null?` · acierto en tus tarjetas <b>${pc(m.tr)}</b>`:''}`;
    return;
  }
  if(!m.nlab){ $('#meterTxt').innerHTML=`👆 <b>Toca palabras</b> para darles un ✅ (sí ${T.yes==='tu concepto'?'es parte de tu concepto':'es '+T.yes}) o un ❌ (no). Un toque más las quita.`; return; }
  const bits=[`✅ ${m.ny} · ❌ ${m.nn} ejemplos`];
  if(trained&&m.tr!==null) bits.push(`acierto en tus ejemplos <b>${pc(m.tr)}</b>`);
  if(trained&&m.te!==null) bits.push(`en palabras nuevas <b>${pc(m.te)}</b>`);
  else if(trained&&task==='own') bits.push('<span class="hid">en tu concepto no hay respuesta correcta: ¿tiene sentido lo que opina?</span>');
  $('#meterTxt').innerHTML='🧠 '+bits.join(' · ');
}

/* ---------- panel neurona ---------- */
const sigSvg=z=>{
  const W=320,H=84, X=v=>10+(v+6)/12*(W-20), Y=v=>H-8-v*(H-18);
  let d=''; for(let v=-6;v<=6;v+=.25) d+=(d?'L':'M')+X(v).toFixed(1)+','+Y(sig(v)).toFixed(1);
  const zc=Math.max(-6,Math.min(6,z));
  return `<svg class="sig" viewBox="0 0 ${W} ${H}"><line x1="${X(0)}" y1="4" x2="${X(0)}" y2="${H-4}" stroke="#D8D8E8"/><line x1="10" y1="${Y(.5)}" x2="${W-10}" y2="${Y(.5)}" stroke="#D8D8E8" stroke-dasharray="3 3"/>
   <path d="${d}" fill="none" stroke="#202050" stroke-width="3"/><circle cx="${X(zc)}" cy="${Y(sig(zc))}" r="7" fill="#E87800" stroke="#fff" stroke-width="2"/>
   <text x="12" y="${H-14}" font-size="10" fill="#7a7a98">muy NO</text><text x="${W-12}" y="14" font-size="10" fill="#7a7a98" text-anchor="end">muy SÍ</text></svg>`;
};
const spark=()=>{
  const W=320,H=70; if(hist.length<2) return `<svg class="spark" viewBox="0 0 ${W} ${H}"><text x="${W/2}" y="${H/2}" text-anchor="middle" font-size="11" fill="#7a7a98">Pulsa ▶ Entrenar para ver cómo baja la pérdida</text></svg>`;
  const mx=Math.max(...hist,.01); let d='';
  hist.forEach((v,k)=>{ d+=(k?'L':'M')+(8+k/(hist.length-1)*(W-16)).toFixed(1)+','+(H-8-(v/mx)*(H-16)).toFixed(1); });
  return `<svg class="spark" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="#E87800" stroke-width="2.5"/></svg>`;
};
function inspectHTML(){
  if(insp===null) return '';
  const wd=words[insp], K=6, z=zOf(insp), p=sig(z);
  let rows='';
  const cell=(v,cls)=>`<td class="${cls||''}">${f2(v)}</td>`;
  let xs='',ws='',ps='';
  for(let k=0;k<K;k++){ const x=wd.x[k], ww=w[k]; xs+=cell(x); ws+=cell(ww,ww>=0?'pos':'neg'); ps+=cell(x*ww,x*ww>=0?'pos':'neg'); }
  const verdict=p>.5?`<b style="color:var(--or-d)">SÍ</b> (${pc(p)})`:`<b>NO</b> (${pc(p)} de sí)`;
  return `<h4>🔬 La neurona por dentro: ${wd.e} ${wd.n}</h4>
   <div class="flow"><span class="b">300 números de la palabra</span>→<span class="b">× 300 pesos</span>→<span class="b">Σ suma + sesgo</span>→<span class="b">σ</span>→<span class="o">${verdict}</span></div>
   <table class="ntab"><tr><th></th>${Array.from({length:K},(_,k)=>`<td><small>#${k+1}</small></td>`).join('')}<td class="more"><small>#7…300</small></td></tr>
   <tr><th>número (×10)</th>${xs}<td class="more">…</td></tr><tr><th>peso</th>${ws}<td class="more">…</td></tr><tr class="sum"><th>número × peso</th>${ps}<td class="more">…</td></tr></table>
   <p class="hlp">Suma de los 300 productos + sesgo (${f2(b)}) = <b>z = ${f2(z)}</b>. La curva σ convierte z en una probabilidad:</p>${sigSvg(z)}`;
}
function direction(){
  const nw=Math.sqrt(w.reduce((s,v)=>s+v*v,0)); if(nw<1e-6) return '';
  const sc=words.map(wd=>({wd,c:wd.u.reduce((s,v,k)=>s+v*w[k],0)/nw})).sort((a,c)=>c.c-a.c);
  const chip=(o,cls)=>`<span class="wl ${cls}">${o.wd.e} ${o.wd.n} <small>${pc(o.c)}</small></span>`;
  let extra='';
  if(task==='fem'){
    const a=words[idx('mujer')].u, c=words[idx('hombre')].u, d=a.map((v,k)=>v-c[k]), nd=Math.hypot(...d);
    const cs=d.reduce((s,v,k)=>s+v*w[k],0)/nd/nw;
    extra=`<div class="verdict ${cs>=.5?'good':'neu'}">🔗 La dirección de tu neurona se parece en <b>${pc(cs)}</b> a la flecha <b>mujer − hombre</b> del Nivel 3. ${cs>=.5?'¡La neurona redescubrió esa misma dirección sola!':'Entrena más o pon más ejemplos y mira cómo sube.'}</div>`;
  }
  return `<h4>🧭 ¿Hacia dónde apunta la neurona?</h4>
   <p class="hlp">Los 300 pesos también son una flecha. Estas palabras apuntan igual que ella (sí) y al contrario (no):</p>
   <div class="wlist">${sc.slice(0,6).map(o=>chip(o,'y')).join('')}${sc.slice(-3).map(o=>chip(o,'n')).join('')}</div>${extra}`;
}
function gameBlock(m){
  const R=ROUNDS[round], T=TASKS[task], last=round===ROUNDS.length-1;
  const ck=b=>b?'✅':'⬜';
  let h=`<div class="verdict pu"><b>Ronda ${round+1} de ${ROUNDS.length}</b> · ${T.ic} ${T.t}<br>Tienes <b>${R.k} tarjetas</b> ✅/❌ para enseñarle a la neurona. Después te examina con <b>10 palabras escondidas</b> (los círculos con <b>?</b> del mapa).</div>
   <div class="steps3"><div>${ck(m.ny>=1&&m.nn>=1)} <b>1.</b> Toca palabras del mapa: ✅ las que <b>sí</b> son, ❌ las que <b>no</b></div>
   <div>${ck(trained)} <b>2.</b> Pulsa <b>▶ Entrenar</b> y mira cómo se pinta el mapa</div>
   <div>${ck(!!examRes)} <b>3.</b> Pulsa <b>📝 Presentar examen</b>: ganas ⭐ según los aciertos</div></div>`;
  if(examRes){
    const e=examRes, memo=e.tr===1&&e.correct<7&&e.nlab<=4;
    h+=`<div class="verdict ${e.st>=2?'good':e.st===1?'neu':'bad'}"><b>${e.st?'⭐'.repeat(e.st):'😅'} Acertó ${e.correct} de 10.</b> ${e.st===3?'¡Perfecto o casi!':e.st>=1?'Bien, pero puedes mejorar: ¿elegiste ejemplos bien distintos?':'No le alcanzó. Elige ejemplos más variados y vuelve a probar.'}${memo?' 🧠 Recordó tus tarjetas pero no aprendió la idea: con pocos ejemplos, elegirlos bien es clave.':''}</div>
     <div class="wlist">${e.items.map(o=>`<span class="wl ${o.truth===o.pred?'y':'x'}">${o.truth===o.pred?'✓':'✗'} ${words[o.i].e} ${words[o.i].n} <small>(${o.truth?'sí':'no'} · dijo ${o.pred?'sí':'no'})</small></span>`).join('')}</div>
     <div class="trainbar" style="margin-top:8px"><button class="btn ghost" id="rRep">🔁 Repetir ronda</button>${last?'<button class="btn" id="rEnd">🏁 Ver mis estrellas</button>':'<button class="btn" id="rNext">➡ Siguiente ronda</button>'}</div>`;
  }
  return h;
}
function renderResult(m){
  const T=TASKS[task];
  let status='';
  if(mode==='game'){
    if(!examRes){
      if(!canTrain()) status=`<div class="verdict neu">👆 Marca al menos un ✅ y un ❌ en el mapa para que la neurona pueda aprender.</div>`;
      else if(!trained) status=`<div class="verdict neu">🌱 La neurona todavía no sabe nada. Pulsa <b>▶ Entrenar</b>.</div>`;
      else status=`<div class="verdict good">🧠 Ya entrenó. Si crees que aprendió, pulsa <b>📝 Presentar examen</b>. Si no, cambia tus tarjetas y vuelve a entrenar.</div>`;
    }
    const tiles0=`<div class="tiles"><div class="tile"><small>Época (pasos de ajuste)</small><strong>${epoch}</strong></div><div class="tile"><small>Pérdida (error)</small><strong>${trained?lastLoss.toFixed(3):'—'}</strong></div><div class="tile"><small>Tarjetas usadas</small><strong>${m.nlab}/${ROUNDS[round].k}</strong></div></div>`;
    $('#result').innerHTML=`${gameBlock(m)}${status}${tiles0}<h4>📉 Pérdida mientras entrena</h4>${spark()}${inspectHTML()}${trained?direction():''}`;
    return;
  }
  if(!canTrain()) status=`<div class="verdict neu">👆 Necesito al menos un ✅ y un ❌ para aprender.</div>`;
  else if(!trained) status=`<div class="verdict neu">🌱 La neurona todavía no aprendió nada: sus pesos son casi cero. Pulsa <b>▶ Entrenar</b>.</div>`;
  else if(m.tr===1&&m.te!==null&&m.te<.7&&m.nlab<=6) status=`<div class="verdict bad">🧠 ¡Memorizó! Acierta todos tus ejemplos pero falla con las nuevas (${pc(m.te)}). Con tan pocos ejemplos no aprendió la idea, solo los recordó. Pon más ejemplos variados.</div>`;
  else if(m.te!==null&&m.te>=.9) status=`<div class="verdict good">✅ ¡Aprendió! Acierta ${pc(m.te)} de las palabras que nunca vio.</div>`;
  else if(m.te!==null) status=`<div class="verdict neu">🔎 Va en ${pc(m.te)} con palabras nuevas. Mira en el mapa las que fallan (borde rojo) y agrega ejemplos de ese tipo.</div>`;
  else status=`<div class="verdict neu">🔎 Mira qué palabras cree la neurona que sí son "${T.t.replace(/[¿?]/g,'')}". ¿Tiene sentido?</div>`;
  const tiles=`<div class="tiles"><div class="tile"><small>Época (pasos de ajuste)</small><strong>${epoch}</strong></div>
    <div class="tile"><small>Pérdida (error)</small><strong>${trained?lastLoss.toFixed(3):'—'}</strong></div>
    <div class="tile ${m.te!==null&&m.te<.7?'warn':''}"><small>Acierto en palabras nuevas</small><strong>${m.te!==null?pc(m.te):'—'}</strong></div></div>`;
  let wr='';
  if(trained&&m.wrong.length){
    wr=`<h4>❗ Palabras nuevas que falla (${m.wrong.length})</h4><div class="wlist">${m.wrong.slice(0,10).map(i=>`<span class="wl x">${words[i].e} ${words[i].n}</span>`).join('')}</div>`;
  }
  let own='';
  if(task==='own'&&trained){
    const sc=words.filter(wd=>lab[wd.i]===0).sort((a,c)=>P[c.i]-P[a.i]).slice(0,12);
    own=`<h4>🔮 Lo que tu neurona cree que SÍ es parte de tu concepto</h4><div class="wlist">${sc.map(wd=>`<span class="wl y">${wd.e} ${wd.n} <small>${pc(P[wd.i])}</small></span>`).join('')}</div>`;
  }
  $('#result').innerHTML=`${status}${tiles}<h4>📉 Pérdida mientras entrena</h4>${spark()}${wr}${own}${inspectHTML()}${trained?direction():''}`;
}

/* ---------- rondas y puntaje ---------- */
const rankOf=v=>{let r=RANKS[0][1];for(const [t,n] of RANKS)if(v>=t)r=n;return r;};
function renderScore(){ try{const k='usb_llm_n4',o=JSON.parse(localStorage.getItem(k)||'{}');if(!(o.s>=score))localStorage.setItem(k,JSON.stringify({s:score,t:TOTAL}));}catch(e){}  $('#score').innerHTML=`⭐ ${score}/${TOTAL} · <small>${rankOf(score)}</small>`; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.h); toast.h=setTimeout(()=>t.classList.remove('show'),3200); }
function renderMissions(){
  $('#missions').innerHTML=`<p class="hlp">Cada ronda: pocas tarjetas, un examen de 10 palabras escondidas y hasta 3 ⭐ (9-10 aciertos = ⭐⭐⭐, 7-8 = ⭐⭐, 5-6 = ⭐). Cada vez hay menos tarjetas.</p>`+
   ROUNDS.map((R,r)=>`<div class="mis ${stars[r]===3?'done':''}"><div class="ic">${TASKS[R.task].ic}</div><div><h5>Ronda ${r+1}: ${TASKS[R.task].t}</h5><p>${R.k} tarjetas${R.k<=2?' · ¡elige muy bien!':''}</p></div><div class="pts"><span style="letter-spacing:1px">${'⭐'.repeat(stars[r])||'☆☆☆'}</span><br><button class="btn ghost goR" data-r="${r}" style="padding:2px 10px;font-size:11px">${mode==='game'&&round===r?'jugando':'jugar'}</button></div></div>`).join('');
}
function check(){}

/* ---------- bucle ---------- */
function drawAll(){
  const m=metrics(); metersText(m); drawMap(m); renderResult(m); check(m);
  $('#btnRun').textContent=running?'⏸ Pausar':'▶ Entrenar';
}
function loop(){
  raf=0; if(!running)return;
  if(!canTrain()){ running=false; drawAll(); return; }
  const lr=lrVal();
  for(let s=0;s<3;s++) step(lr);
  trained=true; predictAll();
  const n=hist.length;
  if(epoch>=1500||(n>40&&Math.abs(hist[n-1]-hist[n-31])<2e-5)){ running=false; toast('✔ La neurona dejó de mejorar'); }
  drawAll();
  if(running) raf=requestAnimationFrame(loop);
}
function start(){ if(!canTrain()){ drawAll(); return; } running=true; if(!raf) raf=requestAnimationFrame(loop); drawAll(); }

/* ---------- controles ---------- */
function buildTasks(){
  const modes=`<button class="chip ${mode==='game'?'on':''}" data-m="game">🎮 Rondas</button><button class="chip ${mode==='free'?'on':''}" data-m="free">🧪 Modo libre</button><span style="width:10px"></span>`;
  const sub=mode==='game'
    ? ROUNDS.map((R,r)=>`<button class="chip ${r===round?'on':''}" data-r="${r}">${r+1} ${stars[r]?'⭐'.repeat(stars[r]):''}</button>`).join('')
    : Object.entries(TASKS).map(([k,t])=>`<button class="chip ${k===task?'on':''}" data-k="${k}">${t.ic} ${t.t}</button>`).join('');
  $('#tasks').innerHTML=modes+sub;
  $('#btnExam').style.display=mode==='game'?'':'none';
  $('#btnRand').style.display=mode==='game'?'none':'';
}
$('#tasks').addEventListener('click',e=>{
  const b=e.target.closest('.chip'); if(!b)return;
  if(b.dataset.m==='game'){ if(mode!=='game') startRound(round); }
  else if(b.dataset.m==='free'){ if(mode!=='free') setTask('ani'); }
  else if(b.dataset.r!==undefined) startRound(+b.dataset.r);
  else if(b.dataset.k&&(mode!=='free'||b.dataset.k!==task)) setTask(b.dataset.k);
});
$('#btnExam').addEventListener('click',()=>{ if(!trained||epoch<15){ toast('Primero pulsa ▶ Entrenar y deja que aprenda un poco'); return; } presentExam(); });
$('#result').addEventListener('click',e=>{
  if(e.target.closest('#rRep')) startRound(round);
  else if(e.target.closest('#rNext')) startRound(round+1);
  else if(e.target.closest('#rEnd')){ document.querySelector('.tab[data-t=mis]').click(); }
});
$('#missions').addEventListener('click',e=>{ const b=e.target.closest('.goR'); if(b) startRound(+b.dataset.r); });
$('#btnHow').addEventListener('click',()=>$('#howto').classList.add('show'));
$('#hwOk').addEventListener('click',()=>$('#howto').classList.remove('show'));
$('#btnRun').addEventListener('click',()=>{ if(running){running=false;drawAll();} else start(); });
$('#btnReset').addEventListener('click',()=>{ resetNeuron(); drawAll(); });
$('#btnRand').addEventListener('click',()=>{
  if(task==='own'){ toast('En "Mi propio concepto" tú eliges los ejemplos tocando las palabras'); return; }
  randomExamples(3); drawAll();
});
$('#btnClear').addEventListener('click',()=>{ clearLabels(); drawAll(); });
$('#axsel').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; axi=+b.dataset.a; document.querySelectorAll('#axsel button').forEach(x=>x.classList.toggle('on',x===b)); layoutPos(); drawAll(); });
$('#map').addEventListener('click',e=>{
  const g=e.target.closest('[data-i]'); if(!g)return;
  const i=+g.dataset.i;
  if(mode==='game'){
    if(examRes){ toast('Ya presentaste el examen. Usa 🔁 Repetir ronda o ➡ Siguiente ronda.'); return; }
    if(exam.includes(i)){ toast('🔒 Esa palabra es del examen: no puedes usarla como tarjeta.'); return; }
    if(lab[i]===0&&used()>=budget()){ toast(`Solo tienes ${budget()} tarjetas. Quita una (tócala hasta que desaparezca) para usar otra.`); return; }
  }
  lab[i]=lab[i]===0?1:lab[i]===1?-1:0; insp=i;
  if(trained) predictAll();
  drawAll(); if(running&&!raf) raf=requestAnimationFrame(loop);
});
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id==='p-'+t.dataset.t));
}));
function renderDatos(){
  $('#datos').innerHTML=`
   <p><b>Los datos:</b> los mismos ${N} vectores reales de 300 números que usaste en los niveles anteriores (${DATA.modelo}).</p>
   <p><b>La neurona:</b> tiene 300 pesos y un sesgo. Calcula <i>z = (peso₁·número₁) + … + (peso₃₀₀·número₃₀₀) + sesgo</i> y lo pasa por σ para obtener una probabilidad de "sí".</p>
   <p><b>Entrenar:</b> en cada paso mide el error con tus ejemplos y mueve un poquito cada peso en la dirección que lo reduce (descenso de gradiente). La velocidad 🐢/🐇 es cuánto se mueve en cada paso. Todo ocurre de verdad en tu navegador.</p>
   <p><b>Acierto en palabras nuevas:</b> promedio entre las palabras ✅ y ❌ que no usaste como ejemplo, comparadas con la respuesta correcta del reto.</p>
   <p><b>El mapa:</b> es la sombra 2D de siempre, solo para dibujar. La neurona decide con los 300 números, no con las 2 coordenadas.</p>
   <p><b>Ojo:</b> un LLM es esto mismo multiplicado: miles de millones de pesos en muchas capas, entrenados con texto en vez de ejemplos tuyos.</p>`;
}

layoutPos(); renderDatos(); renderScore(); startRound(0); $('#howto').classList.add('show');
})();
