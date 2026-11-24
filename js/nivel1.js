(()=>{
'use strict';
const $=s=>document.querySelector(s);
const pc=c=>Math.round(c*100)+'%';
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

/* ---------- vectores reales (puente al Nivel 2) ---------- */
const words=DATA.words.map((w,i)=>{const nr=Math.hypot(...w.v);return {i,n:w.n,u:w.v.map(x=>x/nr)};});
const byLc=new Map(words.map(w=>[w.n.toLowerCase(),w]));
const dot=(a,b)=>{let s=0;for(let k=0;k<a.length;k++)s+=a[k]*b[k];return s;};

/* ---------- el modelo: contar qué palabra sigue a cuál ---------- */
const BASE=CORPUS.trim();
let c1=new Map(), c2=new Map(), nSent=0, nTok=0, vocab=new Set();
const lc=s=>s.toLowerCase();
function tokens(line){
  return line.replace(/[¿¡?!,;:"()]/g,' ').replace(/\./g,' . ').split(/\s+/).filter(Boolean).map(lc);
}
function bump(m,k,n){ let d=m.get(k); if(!d){d=new Map();m.set(k,d);} d.set(n,(d.get(n)||0)+1); }
function train(text){
  c1=new Map(); c2=new Map(); nSent=0; nTok=0; vocab=new Set();
  for(const line of text.split('\n')){
    const t=tokens(line); if(!t.length)continue;
    if(t[t.length-1]!=='.') t.push('.');
    const f=['^',...t]; nSent++;
    for(let k=0;k<f.length-1;k++){
      bump(c1,f[k],f[k+1]); if(k>=1) bump(c2,f[k-1]+' '+f[k],f[k+1]);
      if(f[k]!=='^'&&f[k]!=='.'){vocab.add(f[k]);nTok++;}
    }
  }
}
function listFrom(d,src,note,extra){
  let tot=0; for(const v of d.values()) tot+=v;
  const list=[...d.entries()].map(([w,c])=>({w,c,p:c/tot})).sort((a,b)=>b.c-a.c||(a.w==='.')-(b.w==='.')||a.w.localeCompare(b.w));
  return Object.assign({list,total:tot,src,note},extra||{});
}
let vecOn=false, mem=2;
function nearestKnown(word){
  const wv=byLc.get(word); if(!wv) return null;
  let best=null,bs=-9;
  for(const w of words){ if(w.n.toLowerCase()===word) continue;
    if(!c1.has(w.n.toLowerCase())) continue;
    const s=dot(wv.u,w.u); if(s>bs){bs=s;best=w;} }
  return best?{w:best.n.toLowerCase(),s:bs}:null;
}
function predict(ctx,m,vec){
  const f=['^',...ctx], prev=f[f.length-1];
  if(m===2&&f.length>=3){
    const d=c2.get(f[f.length-2]+' '+prev);
    if(d) return listFrom(d,'tri','', {used:[f[f.length-2],prev]});
  }
  const d1=c1.get(prev);
  if(d1){ const fell=(m===2&&f.length>=3); return listFrom(d1,'bi',fell?`Nunca leí «${f[f.length-2]} ${prev}» juntas, así que uso solo la última palabra.`:'',{used:[prev]}); }
  if(vec){
    const nb=nearestKnown(prev);
    if(nb) return listFrom(c1.get(nb.w),'vec',`Nunca leí «${prev}», pero sus 300 números se parecen un ${pc(nb.s)} a los de «${nb.w}». Uso lo que leí sobre «${nb.w}».`,{used:[nb.w],nb});
  }
  return {list:[],total:0,src:'none',note:'',used:[prev]};
}

/* ---------- estado de la frase ---------- */
let sent=[], ended=false, sugg=0, usedM1=false, usedM2=true, score=0, diceRuns=0;
const done={};
const ctxKeys=()=>sent.map(t=>t.k);

function renderSent(){
  const el=$('#sent');
  if(!sent.length){ el.innerHTML='<span class="ph">Elige un comienzo de abajo o escribe una palabra…</span><i class="cur"></i>'; return; }
  el.innerHTML=sent.map(t=>`<span class="tk ${t.k==='.'?'dot':t.u?'u':''}">${esc(t.d)}</span>`).join('')+(ended?'':'<i class="cur"></i>');
}
function addTok(d,k,user){
  if(ended) return false;
  if(k==='.'){ ended=true; sent.push({d:'.',k:'.'}); }
  else sent.push({d,k:lc(k),u:!!user});
  return true;
}
function pushSuggestion(w){
  if(w==='.') addTok('.','.');
  else addTok(w,w,false);
  sugg++; update();
}

/* ---------- predicciones ---------- */
function renderPreds(pr){
  const el=$('#preds');
  if(ended){ el.innerHTML='<div class="nomod">✅ ¡La frase terminó! Pulsa 🧹 <b>Empezar de nuevo</b> o ⌫ para seguir probando.</div>'; return; }
  if(!pr.list.length){
    el.innerHTML=`<div class="nomod">🤷 No sé qué sigue: <b>nunca leí la palabra «${esc(pr.used[0])}»</b>. Un modelo que solo cuenta no puede adivinar lo que no vio.${byLc.has(pr.used[0])?' Pero esa palabra sí tiene vector: activa <b>🧭 Usar vectores</b> y mira.':''}</div>`;
    return;
  }
  const mx=pr.list[0].p;
  const low=pr.total<=2?`<div class="lowev">⚠️ <b>Poca evidencia:</b> solo leí «${esc(pr.used.join(' '))}» ${pr.total} ${pr.total===1?'vez':'veces'}. Estoy muy seguro por pura casualidad, ¡no me creas tanto!</div>`:'';
  el.innerHTML=low+pr.list.slice(0,8).map((o,k)=>`<button class="pw ${k===0?'top':''}" data-w="${esc(o.w)}"><b>${o.w==='.'?'⏹ fin de la frase':esc(o.w)}</b><span>${pc(o.p)} · leída ${o.c} ${o.c===1?'vez':'veces'}${o.c<=1&&pr.total<=2?' ⚠️':''}</span><i style="width:${Math.max(6,o.p/mx*100)}%"></i></button>`).join('');
}
function renderNote(pr){
  const k=ctxKeys();
  const last=k.length?k.slice(-mem).join(' '):'(inicio de frase)';
  let h=`🧠 El modelo mira solo las últimas <b>${mem}</b> palabra${mem>1?'s':''}: «<b>${esc(last)}</b>»`;
  if(pr.note) h+=`<br>ℹ️ ${esc(pr.note)}`;
  if(k.length>mem) h+=`<br>🙈 Ya <b>olvidó</b> el principio: «${esc(k.slice(0,k.length-mem).join(' '))}». Por eso una frase puede tener sentido de dos en dos palabras y ninguno en total.`;
  $('#ctxnote').innerHTML=h;
}
function renderResult(pr){
  if(!pr.list.length){ $('#result').innerHTML=`<div class="verdict bad">🤷 No hay nada que contar: el modelo no leyó «${esc(pr.used[0])}» en ningún texto.</div><p class="hlp">Ve a la pestaña 📚 Textos y agrégale una frase con esa palabra, o activa 🧭 vectores.</p>`; return; }
  const ctx=pr.used.join(' ');
  const rows=pr.list.slice(0,8).map(o=>`<div class="pbar"><span>${o.w==='.'?'⏹ fin':esc(o.w)}<small>leída ${o.c}×</small></span><div class="tr"><i style="width:${Math.max(o.p*100,1)}%"></i></div><em>${pc(o.p)}</em></div>`).join('');
  const calc=pr.list.slice(0,3).map(o=>`${o.c}/${pr.total} = ${pc(o.p)}`).join(' · ');
  $('#result').innerHTML=`<div class="verdict ${pr.src==='vec'?'pu':'neu'}">📖 En los textos, después de «<b>${esc(ctx)}</b>» el modelo leyó <b>${pr.total}</b> vez${pr.total>1?'es':''} alguna palabra.</div>
   ${pr.total<=2?`<div class="verdict bad">⚠️ <b>¡Cuidado!</b> Mi 100% sale de contar solo ${pr.total} ${pr.total===1?'vez':'veces'}. Con tan pocos ejemplos, la seguridad no vale mucho. Agrega más frases en 📚 Textos y mira cómo cambia.</div>`:''}
   <h4>🔢 La cuenta</h4><p class="hlp">Probabilidad = veces que apareció esa palabra ÷ veces totales.<br>${calc}</p>${rows}
   ${pr.src==='vec'?`<div class="verdict pu">🧭 <b>Vectores al rescate:</b> ${esc(pr.note)} Los números dieron una pista donde contar no alcanzaba.</div>`:''}
   ${pr.src==='bi'&&pr.note?`<div class="verdict neu">ℹ️ ${esc(pr.note)}</div>`:''}
   <p class="hlp">Con memoria de 1 palabra el modelo olvida casi todo lo anterior; con 2 palabras acierta más, pero necesita haber leído esas dos juntas.</p>`;
}
function update(){
  const k=ctxKeys(), pr=predict(k,mem,vecOn);
  renderSent(); renderPreds(pr); renderNote(pr); renderResult(pr); checkMissions(pr);
}

/* ---------- autocompletar ---------- */
function autoComplete(dice){
  if(ended){ sent=[];ended=false; }
  if(!sent.length){ const pr=predict([],mem,vecOn); if(pr.list.length) addTok(pr.list[0].w,pr.list[0].w); }
  for(let i=0;i<14&&!ended;i++){
    const pr=predict(ctxKeys(),mem,vecOn); if(!pr.list.length) break;
    let pick=pr.list[0];
    if(dice){ let r=Math.random()*pr.total,acc=0; for(const o of pr.list){acc+=o.c; if(r<=acc){pick=o;break;}} }
    if(pick.w==='.') addTok('.','.'); else addTok(pick.w,pick.w);
  }
  if(!ended) addTok('.','.');
}

/* ---------- textos: lo que leyó ---------- */
let corpusText=BASE;
function renderTexts(){
  $('#texts').innerHTML=`<p class="hlp">Esto es <b>todo lo que leyó</b> el modelo (una frase por línea). Si cambias el texto, cambia lo que sabe.</p>
   <div class="tiles"><div class="tile"><small>Frases</small><strong id="stS">${nSent}</strong></div><div class="tile"><small>Palabras leídas</small><strong id="stT">${nTok}</strong></div><div class="tile"><small>Palabras distintas</small><strong id="stV">${vocab.size}</strong></div></div>
   <h4>➕ Enséñale una frase nueva</h4>
   <div class="trainbar"><input type="text" id="newS" class="wIn" placeholder="ej: el perro come pizza ."> <select id="rep"><option value="1">×1</option><option value="3" selected>×3</option><option value="5">×5</option></select> <button class="btn" id="addS">Enseñar</button></div>
   <h4>📖 Todo el texto</h4><textarea id="corp" spellcheck="false"></textarea>
   <div class="trainbar" style="margin-top:6px"><button class="btn ghost" id="resetC">↺ Restaurar texto original</button></div>`;
  $('#corp').value=corpusText;
  $('#corp').addEventListener('input',e=>{ corpusText=e.target.value; retrain(); });
  $('#addS').addEventListener('click',addSentence);
  $('#newS').addEventListener('keydown',e=>{ if(e.key==='Enter') addSentence(); });
  $('#resetC').addEventListener('click',()=>{ corpusText=BASE; $('#corp').value=corpusText; retrain(); toast('📖 Texto original restaurado'); });
}
function addSentence(){
  const v=$('#newS').value.trim(); if(!v) return;
  const n=+$('#rep').value; let add=''; for(let i=0;i<n;i++) add+='\n'+v;
  corpusText=corpusText.replace(/\s+$/,'')+add; $('#corp').value=corpusText; $('#newS').value='';
  retrain(); toast(`📚 Aprendió la frase ${n} ${n>1?'veces':'vez'}`);
}
function retrain(){
  train(corpusText);
  const s=$('#stS'); if(s){ s.textContent=nSent; $('#stT').textContent=nTok; $('#stV').textContent=vocab.size; }
  update(); duelRefresh();
}

/* ---------- duelo contra la máquina ---------- */
const DUEL=[
 {p:'el perro come',a:'carne',o:['luz','hielo','tren']},
 {p:'la ballena nada en el',a:'mar',o:['sol','pan','libro']},
 {p:'Bogotá es la',a:'capital',o:['selva','cama','luna']},
 {p:'el estudiante lee un',a:'libro',o:['volcán','pescado','mar']},
 {p:'en Alemania se habla',a:'alemán',o:['español','francés','japonés']},
 {p:'el sol brilla en el',a:'cielo',o:['plato','mar','suelo']},
 {p:'el elefante es muy',a:'grande',o:['pequeño','frío','rápido']},
 {p:'mi madre cocina',a:'arroz',o:['avión','sol','planeta']},
 {p:'el gato duerme en la',a:'cama',o:['luna','sopa','ciudad']},
 {p:'el delfín nada en el',a:'mar',o:['cielo','campo','sofá']}
];
let dq=[], di=0, dMe=0, dAi=0, dPick=null, dAiPick=null;
function duelStart(){
  dq=DUEL.slice().sort(()=>Math.random()-.5).map(x=>({...x,opts:[x.a,...x.o].sort(()=>Math.random()-.5)}));
  di=0;dMe=0;dAi=0;dPick=null;dAiPick=null; renderDuel();
}
function machinePick(item){
  const ctx=tokens(item.p), pr=predict(ctx,mem,vecOn);
  const pm=new Map(pr.list.map(o=>[o.w,o.p]));
  let best=null,bp=0;
  for(const o of item.opts){ const p=pm.get(lc(o))||0; if(p>bp){bp=p;best=o;} }
  if(!best) return {w:item.opts[Math.floor(Math.random()*item.opts.length)],p:0,guess:true};
  return {w:best,p:bp,guess:false};
}
function renderDuel(){
  const el=$('#duel');
  if(di>=dq.length){
    const win=dMe>dAi, tie=dMe===dAi;
    if(win) award('m6');
    el.innerHTML=`<div class="score2"><div class="me">🧑 Tú<br>${dMe}/${dq.length}</div><div class="ai">🤖 Máquina<br>${dAi}/${dq.length}</div></div>
     <div class="verdict ${win?'good':tie?'neu':'bad'}">${win?'🏆 ¡Le ganaste a la máquina!':tie?'🤝 Empate.':'😅 La máquina ganó esta vez.'} ${dAi<dMe?'Ella solo sabe lo que leyó: no conoce, por ejemplo, el idioma de Alemania.':'Prueba enseñándole más frases en 📚 Textos o activando 🧭 vectores y repite.'}</div>
     <div class="trainbar"><button class="btn" id="dAgain">🔁 Jugar otra vez</button></div>`;
    $('#dAgain').addEventListener('click',duelStart); return;
  }
  const it=dq[di], picked=dPick!==null;
  const pf=esc(it.p)+' <u>'+(picked?esc(it.a):'&nbsp;&nbsp;&nbsp;&nbsp;')+'</u>';
  el.innerHTML=`<div class="score2"><div class="me">🧑 Tú<br>${dMe}</div><div class="ai">🤖 Máquina<br>${dAi}</div></div>
   <p class="hlp">Pregunta ${di+1} de ${dq.length}: ¿qué palabra sigue? La máquina usa su memoria de ${mem} palabra${mem>1?'s':''}${vecOn?' y los vectores':''}.</p>
   <div class="pfx">${pf}</div>
   <div class="opts">${it.opts.map(o=>`<button class="opt ${picked?(o===it.a?'good':o===dPick?'bad':''):''}" data-o="${esc(o)}" ${picked?'disabled':''}>${esc(o)}</button>`).join('')}</div>
   ${picked?`<div class="verdict ${dAiPick.w===it.a?'good':'bad'}">🤖 La máquina eligió <b>${esc(dAiPick.w)}</b> ${dAiPick.guess?'(¡no sabía y adivinó al azar!)':'('+pc(dAiPick.p)+' de probabilidad)'} → ${dAiPick.w===it.a?'acertó':'falló'}.</div>
   <div class="trainbar"><button class="btn" id="dNext">${di+1<dq.length?'➡ Siguiente':'🏁 Ver resultado'}</button></div>`:''}`;
  el.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>{
    if(dPick!==null)return; dPick=b.dataset.o; dAiPick=machinePick(it);
    if(dPick===it.a)dMe++; if(dAiPick.w===it.a)dAi++; renderDuel();
  }));
  const nx=$('#dNext'); if(nx) nx.addEventListener('click',()=>{ di++; dPick=null; dAiPick=null; renderDuel(); });
}
function duelRefresh(){ /* si cambias el modelo a mitad, la máquina usa lo nuevo en la siguiente pregunta */ }

/* ---------- misiones ---------- */
const MIS=[
 {id:'m1',ic:'⌨️',t:'Primera frase',d:'Arma una frase de 5 palabras o más tocando al menos 3 sugerencias del modelo.',p:10},
 {id:'m2',ic:'⚡',t:'Autocompleta',d:'Pulsa "Autocompletar la frase" y mira cómo el modelo escribe palabra por palabra. Así genera texto un LLM.',p:10},
 {id:'m3',ic:'📚',t:'Enséñale al modelo',d:'En 📚 Textos, enséñale frases hasta que "pizza" sea la palabra más probable después de "el perro come".',p:30},
 {id:'m4',ic:'🧠',t:'Memoria corta y larga',d:'Con una frase de 2 palabras o más, cambia entre memoria de 1 y de 2 palabras hasta que la mejor sugerencia sea distinta.',p:20},
 {id:'m5',ic:'🧭',t:'Vectores al rescate',d:'Escribe un animal que el modelo nunca leyó (por ejemplo "zorro" o "oveja") y activa 🧭 vectores para que logre predecir.',p:30},
 {id:'m6',ic:'🥊',t:'Gana el duelo',d:'En 🥊 Duelo, consigue más aciertos que la máquina.',p:30},
 {id:'m7',ic:'🎲',t:'Dado loco',d:'Pulsa "Autocompletar con dado" 2 veces: ¿salieron frases distintas?',p:10}
];
const TOTAL=MIS.reduce((s,m)=>s+m.p,0);
const RANKS=[[0,'🥚 Principiante'],[40,'🔭 Explorador'],[90,'🧭 Navegante vectorial'],[140,'🏆 Maestro del espacio vectorial']];
const rankOf=v=>{let r=RANKS[0][1];for(const [t,n] of RANKS)if(v>=t)r=n;return r;};
function renderScore(){ try{const k='usb_llm_n1',o=JSON.parse(localStorage.getItem(k)||'{}');if(!(o.s>=score))localStorage.setItem(k,JSON.stringify({s:score,t:TOTAL}));}catch(e){}  $('#score').innerHTML=`⭐ ${score}/${TOTAL} pts · <small>${rankOf(score)}</small>`; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.h); toast.h=setTimeout(()=>t.classList.remove('show'),3200); }
function award(id){ if(done[id])return; done[id]=true; const m=MIS.find(x=>x.id===id); score+=m.p; renderScore(); renderMissions(); toast(`🎉 ¡Misión cumplida! ${m.t} · +${m.p} pts`); }
function renderMissions(){ $('#missions').innerHTML=MIS.map(m=>`<div class="mis ${done[m.id]?'done':''}"><div class="ic">${done[m.id]?'✅':m.ic}</div><div><h5>${m.t}</h5><p>${m.d}</p></div><div class="pts">${done[m.id]?'¡Listo!':'+'+m.p}</div></div>`).join(''); }
function checkMissions(pr){
  if(sugg>=3&&sent.filter(t=>t.k!=='.').length>=5) award('m1');
  const d=c2.get('perro come');
  if(d){ const top=[...d.entries()].sort((a,b)=>b[1]-a[1])[0]; if(top&&top[0]==='pizza') award('m3'); }
  const k=ctxKeys();
  if(k.length>=2&&usedM1&&usedM2){
    const a=predict(k,1,vecOn).list[0], b=predict(k,2,vecOn).list[0];
    if(a&&b&&a.w!==b.w) award('m4');
  }
  if(pr.src==='vec') award('m5');
}

/* ---------- controles ---------- */
$('#memSeg').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return; mem=+b.dataset.m;
  if(mem===1)usedM1=true; else usedM2=true;
  document.querySelectorAll('#memSeg button').forEach(x=>x.classList.toggle('on',x===b)); update();
});
$('#tgVec').addEventListener('change',e=>{ vecOn=e.target.checked; update(); });
$('#preds').addEventListener('click',e=>{ const b=e.target.closest('.pw'); if(b) pushSuggestion(b.dataset.w); });
$('#wIn').addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const t=tokens(e.target.value); if(!t.length)return;
  if(ended){ sent=[]; ended=false; }
  t.forEach(w=>{ if(w==='.') addTok('.','.'); else addTok(w,w,true); });
  e.target.value=''; update();
});
$('#bBack').addEventListener('click',()=>{ if(sent.length){ sent.pop(); ended=false; update(); } });
$('#bClear').addEventListener('click',()=>{ sent=[]; ended=false; update(); });
$('#bAuto').addEventListener('click',()=>{ autoComplete(false); award('m2'); update(); });
$('#bDice').addEventListener('click',()=>{ autoComplete(true); diceRuns++; if(diceRuns>=2) award('m7'); update(); });
const STARTERS=['el perro','la niña','mi madre','en Colombia','me gusta','el sol','el zorro'];
$('#starters').innerHTML=STARTERS.map(s=>`<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('');
$('#starters').addEventListener('click',e=>{
  const b=e.target.closest('.chip'); if(!b)return;
  sent=[]; ended=false; tokens(b.dataset.s).forEach(w=>addTok(w,w,false)); update();
});
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id==='p-'+t.dataset.t));
}));
$('#btnHow').addEventListener('click',()=>$('#howto').classList.add('show'));
$('#hwOk').addEventListener('click',()=>$('#howto').classList.remove('show'));

train(corpusText); renderTexts(); renderScore(); renderMissions(); duelStart(); update();
})();
