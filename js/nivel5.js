(()=>{
'use strict';
const $=s=>document.querySelector(s);
const pc=c=>Math.round(c*100)+'%';
const pc1=c=>c>=.1?Math.round(c*100)+'%':c>=.001?(c*100).toFixed(1)+'%':'<0,1%';
const CATEM={ani:'🐾',tec:'⚙️',nat:'🌿',com:'🍽️',gen:'🧑',geo:'🌍',idi:'🗣️',opu:'↔️',acc:'🏃',ofi:'🛠️'};
const COLS=['#E87800','#802080','#202050','#1E9C8A','#D4A017','#E0407B','#2F6FD6','#B0502A'], OTH='#C9C9DC';

const words=DATA.words.map((w,i)=>{
  const nr=Math.hypot(...w.v);
  return {i,n:w.n,e:w.e||CATEM[w.c],c:w.c,u:w.v.map(x=>x/nr)};
});
const N=words.length;
const idx=n=>words.findIndex(w=>w.n===n);
const dot=(a,b)=>{let s=0;for(let k=0;k<a.length;k++)s+=a[k]*b[k];return s;};
const AN=DATA.an.filter(a=>[a.a,a.b,a.c,a.d].every(n=>idx(n)>=0));
const FAV=[['rey','hombre','mujer'],['París','Francia','Colombia'],['bombero','fuego','piloto'],['amor','odio','paz'],['toro','hombre','mujer'],['Lisboa','Portugal','Chile']];
const anKey=a=>[a.a,a.b,a.c].join('|');
const AMAP=new Map(AN.map(a=>[anKey(a),a]));

/* ---------- estado ---------- */
let A=idx('rey'),B=idx('hombre'),C=idx('mujer');
let v=45, T=0.05, st=null, rot=0, spins=0, score=0, last=null, spinning=false;
const hist=[], done={};
const tOf=x=>0.01*Math.pow(40,x/100);

const MIS=[
 {id:'m1',ic:'🎲',t:'Primer giro',d:'Gira la ruleta 5 veces.',p:10},
 {id:'m2',ic:'🧊',t:'Modo fiable',d:'En una analogía que sí funciona, baja la temperatura hasta que la respuesta correcta tenga 90% o más de probabilidad.',p:20},
 {id:'m3',ic:'🔥',t:'Modo creativo',d:'En una analogía que sí funciona, sube la temperatura hasta que haya 4 o más palabras con 5% o más de probabilidad, pero la correcta siga con 20% o más.',p:30},
 {id:'m4',ic:'🤥',t:'Atrapa una alucinación',d:'En una analogía que falla (como "bombero − fuego + piloto"), consigue que el modelo se equivoque con 55% o más de seguridad.',p:30},
 {id:'m5',ic:'🌋',t:'Termómetro al rojo',d:'Con el termómetro casi al máximo, gira hasta que salga una palabra que casi no se parece a la pregunta (menos de 20% de similitud).',p:20},
 {id:'m6',ic:'🧐',t:'Siempre responde',d:'Inventa una cuenta con tres palabras que no tengan relación y gira: el modelo responde igual, aunque ni la mejor palabra se parezca (menos de 40%).',p:20}
];
const TOTAL=MIS.reduce((s,m)=>s+m.p,0);
const RANKS=[[0,'🥚 Principiante'],[30,'🔭 Explorador'],[80,'🧭 Navegante vectorial'],[130,'🏆 Maestro del espacio vectorial']];

/* ---------- el modelo: probabilidad de cada palabra ---------- */
function compute(){
  const a=words[A],b=words[B],c=words[C];
  const r=a.u.map((x,k)=>x-b.u[k]+c.u[k]), nr=Math.sqrt(dot(r,r));
  const cand=words.filter(w=>![A,B,C].includes(w.i)).map(w=>({w,s:dot(r,w.u)/nr}));
  const mx=Math.max(...cand.map(o=>o.s));
  let Z=0; for(const o of cand){ o.q=Math.exp((o.s-mx)/T); Z+=o.q; }
  for(const o of cand) o.p=o.q/Z;
  cand.sort((p,q)=>q.p-p.p);
  const known=AMAP.get([a.n,b.n,c.n].join('|'))||null;
  const exp=known?cand.find(o=>o.w.n===known.d):null;
  st={cand,top:cand[0],known,exp,n5:cand.filter(o=>o.p>=.05).length,n1:cand.filter(o=>o.p>=.01).length,
      H:-cand.reduce((s,o)=>s+(o.p>0?o.p*Math.log2(o.p):0),0)};
}

/* ---------- ruleta ---------- */
const CX=280,CY=280,RO=235,RI=105;
const pol=(r,deg)=>{const a=deg*Math.PI/180;return [CX+r*Math.sin(a),CY-r*Math.cos(a)];};
function slicePath(a0,a1){
  if(a1-a0>=359.9) a1=a0+359.9;
  const [x0,y0]=pol(RO,a0),[x1,y1]=pol(RO,a1),[x2,y2]=pol(RI,a1),[x3,y3]=pol(RI,a0), big=(a1-a0)>180?1:0;
  return `M${x0},${y0} A${RO},${RO} 0 ${big} 1 ${x1},${y1} L${x2},${y2} A${RI},${RI} 0 ${big} 0 ${x3},${y3} Z`;
}
let slices=[];
function buildSlices(){
  const top=st.cand.slice(0,8); let a=0; slices=[];
  top.forEach((o,k)=>{ const d=o.p*360; slices.push({o,a0:a,a1:a+d,col:COLS[k]}); a+=d; });
  const rest=st.cand.slice(8), pr=rest.reduce((s,o)=>s+o.p,0);
  if(pr>1e-6) slices.push({rest,a0:a,a1:360,col:OTH,pr});
}
function drawWheel(){
  buildSlices();
  let h='<g id="wg" style="transform-origin:280px 280px;transform:rotate('+rot+'deg)">';
  for(const s of slices){
    h+=`<path d="${slicePath(s.a0,s.a1)}" fill="${s.col}" stroke="#fff" stroke-width="2.5"/>`;
    const d=s.a1-s.a0;
    if(d>=16){
      const [x,y]=pol((RO+RI)/2,(s.a0+s.a1)/2), nm=s.o?s.o.w.n:'otras';
      h+=`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${d>40?15:12}" font-weight="700" fill="${s.o?'#fff':'#4a4a70'}" style="paint-order:stroke;stroke:rgba(0,0,0,.18);stroke-width:2px">${nm}</text>`;
    }
  }
  h+='</g>';
  h+=`<polygon points="${CX-16},${CY-RO-14} ${CX+16},${CY-RO-14} ${CX},${CY-RO+22}" fill="#202050" stroke="#fff" stroke-width="3"/>`;
  h+=`<circle cx="${CX}" cy="${CY}" r="${RI-8}" fill="#fff" stroke="#E4E4F0" stroke-width="3"/>`;
  if(last){
    h+=`<text x="${CX}" y="${CY-22}" text-anchor="middle" font-size="40">${last.w.e}</text><text x="${CX}" y="${CY+24}" text-anchor="middle" font-size="20" font-weight="800" fill="#202050">${last.w.n}</text><text x="${CX}" y="${CY+46}" text-anchor="middle" font-size="12" fill="#7a7a98">salió con ${pc1(last.p)}</text>`;
  } else {
    h+=`<text x="${CX}" y="${CY-6}" text-anchor="middle" font-size="16" font-weight="700" fill="#202050">Gira para</text><text x="${CX}" y="${CY+16}" text-anchor="middle" font-size="16" font-weight="700" fill="#202050">responder</text>`;
  }
  $('#wheel').innerHTML=h;
}
function sample(){
  let r=Math.random(), acc=0;
  for(const o of st.cand){ acc+=o.p; if(r<=acc) return o; }
  return st.cand[0];
}
function spin(){
  if(spinning)return; spinning=true;
  const pick=sample();
  buildSlices();
  let sl=slices.find(s=>s.o&&s.o===pick)||slices.find(s=>s.rest);
  const span=sl.a1-sl.a0, land=sl.a0+span*(0.2+0.6*Math.random());
  const delta=(((-land-rot)%360)+360)%360;
  rot=rot+1440+delta;
  const g=$('#wg'); g.style.transform=`rotate(${rot}deg)`;
  $('#btnSpin').disabled=true;
  setTimeout(()=>{
    spinning=false; $('#btnSpin').disabled=false;
    last=pick; spins++;
    const ok=st.known?(pick.w.n===st.known.d):null;
    hist.unshift({w:pick.w,ok,p:pick.p}); if(hist.length>14)hist.pop();
    afterSpin(pick);
    drawWheel(); renderResult(); renderHist(); renderMissions();
  },2700);
}

/* ---------- paneles ---------- */
function regime(){
  if(T<.03) return ['🧊 <b>Muy frío:</b> casi siempre sale la misma palabra, la más probable. Seguro, pero siempre dice lo mismo.','#E6F1FB','#0C447C'];
  if(T<.09) return ['🌤️ <b>Tibio:</b> casi siempre sale una de las mejores, y a veces varía. Suele ser el punto dulce.','#E3F5F1','#0E6657'];
  if(T<.2)  return ['🔥 <b>Caliente:</b> la probabilidad se reparte entre muchas palabras. Sorprende, pero se equivoca más.','#FFF3E2','#8C4700'];
  return ['🌋 <b>Hirviendo:</b> casi todas las palabras tienen la misma probabilidad. Las respuestas ya son al azar, sin sentido.','#FBE3E5','#9A2630'];
}
function renderRegime(){
  const [t,bg,fg]=regime(); const el=$('#regime'); el.innerHTML=t; el.style.background=bg; el.style.color=fg;
  $('#tval').textContent='T = '+T.toFixed(3);
}
function renderHist(){
  $('#hist').innerHTML=hist.length?hist.map(o=>`<span class="wl ${o.ok===true?'y':o.ok===false?'x':''}">${o.ok===true?'✓ ':o.ok===false?'✗ ':''}${o.w.e} ${o.w.n}</span>`).join(''):'<span class="hlp">Aquí aparecerán tus respuestas. ¿Cambian cada vez?</span>';
}
function renderResult(){
  const a=words[A],b=words[B],c=words[C], top=st.top, K=st.known;
  $('#resBox').innerHTML=`${a.e} − ${b.e} + ${c.e}`;
  let msg='';
  if(top.s<.4) msg=`<div class="verdict bad">🤥 <b>¡Ojo!</b> Ni la mejor palabra (<b>${top.w.n}</b>) se parece mucho a la pregunta (${pc(top.s)} de similitud), pero el modelo responde igual y con la misma "voz" de seguridad. Eso es una <b>alucinación</b>.</div>`;
  else if(K&&!K.ok&&top.w.n!==K.d) msg=`<div class="verdict bad">😬 La respuesta esperada era <b>${K.d}</b>, pero el modelo prefiere <b>${top.w.n}</b> (${pc1(top.p)} de probabilidad). Se equivoca, y puede equivocarse con seguridad.</div>`;
  else if(K&&st.exp) msg=`<div class="verdict ${st.exp.p>=.5?'good':'neu'}">🎯 La respuesta correcta (<b>${K.d}</b>) tiene <b>${pc1(st.exp.p)}</b> de probabilidad con esta temperatura.</div>`;
  else msg=`<div class="verdict neu">🔎 Esta pregunta no tiene respuesta "oficial". Mira cuánta probabilidad le da el modelo a cada palabra.</div>`;
  const tiles=`<div class="tiles"><div class="tile"><small>Probabilidad de la mejor palabra</small><strong>${pc1(top.p)}</strong></div>
   <div class="tile"><small>Palabras con 5% o más</small><strong>${st.n5}</strong></div>
   <div class="tile"><small>Palabras con 1% o más</small><strong>${st.n1}</strong></div></div>`;
  const bars=st.cand.slice(0,10).map((o,k)=>{
    const okc=K&&o.w.n===K.d;
    return `<div class="pbar ${okc?'ok':''}"><span>${o.w.e} ${o.w.n}<small>similitud ${pc(o.s)}${okc?' · ✔ correcta':''}</small></span><div class="tr"><i style="width:${Math.max(o.p*100,.6)}%"></i></div><em>${pc1(o.p)}</em></div>`;
  }).join('');
  $('#result').innerHTML=`${msg}${tiles}<h4>📊 Probabilidad de cada palabra (las 10 mejores)</h4>${bars}
   <p class="hlp">Las otras ${st.cand.length-10} palabras se reparten el <b>${pc1(st.cand.slice(10).reduce((s,o)=>s+o.p,0))}</b> restante: eso es el trozo gris de la ruleta.</p>`;
}

/* ---------- misiones ---------- */
const rankOf=s=>{let r=RANKS[0][1];for(const [t,n] of RANKS)if(s>=t)r=n;return r;};
function renderScore(){ try{const k='usb_llm_n5',o=JSON.parse(localStorage.getItem(k)||'{}');if(!(o.s>=score))localStorage.setItem(k,JSON.stringify({s:score,t:TOTAL}));}catch(e){}  $('#score').innerHTML=`⭐ ${score}/${TOTAL} pts · <small>${rankOf(score)}</small>`; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.h); toast.h=setTimeout(()=>t.classList.remove('show'),3200); }
function award(id){ if(done[id])return; done[id]=true; const m=MIS.find(x=>x.id===id); score+=m.p; renderScore(); renderMissions(); toast(`🎉 ¡Misión cumplida! ${m.t} · +${m.p} pts`); }
function renderMissions(){ $('#missions').innerHTML=MIS.map(m=>`<div class="mis ${done[m.id]?'done':''}"><div class="ic">${done[m.id]?'✅':m.ic}</div><div><h5>${m.t}</h5><p>${m.d}</p></div><div class="pts">${done[m.id]?'¡Listo!':'+'+m.p}</div></div>`).join(''); }
function checkState(){
  const K=st.known;
  if(K&&K.ok&&st.exp){
    if(st.exp.p>=.9) award('m2');
    if(st.n5>=4&&st.exp.p>=.2) award('m3');
  }
  if(K&&!K.ok&&st.top.w.n!==K.d&&st.top.p>=.55) award('m4');
}
function afterSpin(pick){
  if(spins>=5) award('m1');
  if(T>=.25&&pick.s<.2) award('m5');
  if(!st.known&&st.top.s<.4) award('m6');
}

/* ---------- controles ---------- */
/* ---------- cuadro de búsqueda de palabras (escribe "b" y salen las que empiezan con b) ---------- */
const normTxt=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const WSORT=words.slice().sort((a,b)=>a.n.localeCompare(b.n,'es'));
function makeCombo(el,onPick,start){
  el.classList.add('cb');
  el.innerHTML='<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Escribe o elige una palabra"><div class="cbl" hidden></div>';
  const inp=el.querySelector('input'), list=el.querySelector('.cbl');
  let cur=start, items=[], hi=0;
  const label=i=>words[i].e+' '+words[i].n;
  const mark=()=>{ [...list.children].forEach((c,k)=>c.classList.toggle('hi',k===hi)); const c=list.children[hi]; if(c&&c.scrollIntoView) c.scrollIntoView({block:'nearest'}); };
  function render(q){
    const nq=normTxt(q.trim()), pre=[], inc=[];
    for(const w of WSORT){ const nn=normTxt(w.n); if(!nq||nn.startsWith(nq)) pre.push(w); else if(nn.includes(nq)) inc.push(w); }
    items=pre.concat(inc).slice(0,80); hi=0;
    list.innerHTML=items.length?items.map((w,k)=>`<div class="cbi${k===0?' hi':''}" data-i="${w.i}">${w.e} ${w.n}</div>`).join(''):'<div class="cbn">Sin resultados</div>';
    list.hidden=false;
  }
  function pick(i){ cur=i; inp.value=label(i); list.hidden=true; onPick(i); }
  inp.value=label(cur);
  inp.addEventListener('focus',()=>{ inp.select(); render(''); });
  inp.addEventListener('input',()=>render(inp.value));
  inp.addEventListener('keydown',e=>{
    if(e.key==='ArrowDown'){ e.preventDefault(); if(list.hidden) render(inp.value); else { hi=Math.min(items.length-1,hi+1); mark(); } }
    else if(e.key==='ArrowUp'){ e.preventDefault(); hi=Math.max(0,hi-1); mark(); }
    else if(e.key==='Enter'||e.key==='Tab'){ if(!list.hidden&&items[hi]){ if(e.key==='Enter')e.preventDefault(); pick(items[hi].i); if(e.key==='Enter')inp.blur(); } }
    else if(e.key==='Escape'){ inp.blur(); }
  });
  list.addEventListener('mousedown',e=>{ const it=e.target.closest('.cbi'); if(it){ e.preventDefault(); pick(+it.dataset.i); inp.blur(); } });
  inp.addEventListener('blur',()=>{ list.hidden=true; inp.value=label(cur); });
  return {set(i){ cur=i; if(document.activeElement!==inp) inp.value=label(i); }};
}
let CB={};
function buildPresets(){
  $('#presets').innerHTML=FAV.map((t,i)=>{const [a,b,c]=t.map(idx).map(j=>words[j]);return `<button class="chip" data-i="${i}">${a.e} ${a.n} − ${b.n} + ${c.n}</button>`;}).join('')
   +`<select id="anSel" class="anSel"><option value="">📚 Más preguntas…</option>
     <optgroup label="✅ Funcionan">${AN.map((a,i)=>a.ok?`<option value="${i}">${a.a} − ${a.b} + ${a.c}</option>`:'').join('')}</optgroup>
     <optgroup label="❌ Fallan (¿alucinará?)">${AN.map((a,i)=>!a.ok?`<option value="${i}">${a.a} − ${a.b} + ${a.c}</option>`:'').join('')}</optgroup></select>`;
}
function setTrip(a,b,c){ A=a;B=b;C=c; last=null; CB.A.set(A); CB.B.set(B); CB.C.set(C); update(); }
function update(){ compute(); drawWheel(); renderResult(); renderRegime(); checkState(); }
CB.A=makeCombo($('#sA'),i=>{A=i;last=null;update();},A);
CB.B=makeCombo($('#sB'),i=>{B=i;last=null;update();},B);
CB.C=makeCombo($('#sC'),i=>{C=i;last=null;update();},C);
$('#presets').addEventListener('click',e=>{ const b=e.target.closest('.chip'); if(b) setTrip(...FAV[+b.dataset.i].map(idx)); });
$('#presets').addEventListener('change',e=>{ if(e.target.id!=='anSel'||e.target.value==='')return; const a=AN[+e.target.value]; setTrip(idx(a.a),idx(a.b),idx(a.c)); e.target.value=''; });
$('#temp').addEventListener('input',e=>{ v=+e.target.value; T=tOf(v); update(); });
$('#btnSpin').addEventListener('click',spin);
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id==='p-'+t.dataset.t));
}));
$('#btnHow').addEventListener('click',()=>$('#howto').classList.add('show'));
$('#hwOk').addEventListener('click',()=>$('#howto').classList.remove('show'));
function renderDatos(){
  $('#datos').innerHTML=`
   <p><b>Cómo se calcula:</b> para cada palabra se mide su <b>similitud</b> (coseno, con los 300 números reales) con el resultado de la cuenta. Esa similitud es la "puntuación" de la palabra.</p>
   <p><b>Probabilidad:</b> las puntuaciones se convierten en probabilidades con <i>softmax</i>: <i>p = e<sup>puntuación / T</sup></i>, normalizado para que sumen 100%. <b>T</b> es la temperatura.</p>
   <p><b>Temperatura baja:</b> la mejor palabra se lleva casi toda la probabilidad. <b>Alta:</b> todas se parecen en probabilidad y sale casi cualquiera.</p>
   <p><b>Alucinar:</b> el modelo siempre reparte 100% entre sus palabras: nunca dice "no sé". Aunque ninguna se parezca a la pregunta, igual entrega una respuesta.</p>
   <p><b>Ojo:</b> aquí las puntuaciones salen de la similitud entre vectores de ${N} palabras. Un LLM real calcula las suyas con una red enorme, pero convierte puntuaciones en probabilidades con la misma fórmula y la misma temperatura.</p>`;
}
buildPresets();
renderDatos(); renderScore(); renderMissions(); renderHist(); update();
})();
