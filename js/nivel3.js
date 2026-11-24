(()=>{
'use strict';
const $=s=>document.querySelector(s);
const NS='http://www.w3.org/2000/svg';
const pc=c=>Math.round(c*100)+'%';
const CATCOL={ani:'#E87800',tec:'#202050',nat:'#1E9C8A',com:'#802080',gen:'#E0407B',geo:'#2F6FD6',idi:'#D4A017',opu:'#6B6B9A',acc:'#0F8F5F',ofi:'#B0502A'};
const CATEM={ani:'🐾',tec:'⚙️',nat:'🌿',com:'🍽️',gen:'🧑',geo:'🌍',idi:'🗣️',opu:'↔️',acc:'🏃',ofi:'🛠️'};

const words=DATA.words.map((w,i)=>{
  const nr=Math.hypot(...w.v);
  return {i,n:w.n,e:w.e||CATEM[w.c],c:w.c,p:w.p,u:w.v.map(x=>x/nr)};
});
const idx=n=>words.findIndex(w=>w.n===n);
const dot=(a,b)=>{let s=0;for(let k=0;k<a.length;k++)s+=a[k]*b[k];return s;};
const norm=a=>Math.sqrt(dot(a,a));
const cosv=(a,b)=>dot(a,b)/(norm(a)*norm(b));

/* ---------- estado ---------- */
let A=idx('rey'), B=idx('hombre'), C=idx('mujer');
let lens='auto', score=0, st=null;
const done={};
const AN=DATA.an.filter(a=>[a.a,a.b,a.c,a.d].every(n=>idx(n)>=0));
const FAV=[['rey','hombre','mujer'],['París','Francia','Colombia'],['Madrid','España','Italia'],['abuelo','hombre','mujer'],['francés','Francia','Japón'],['caminando','caminar','correr']];
const presetKey=new Set(AN.map(a=>[a.a,a.b,a.c].join('|')).concat(FAV.map(t=>t.join('|'))));
const PAIRS=[['Colombia','Bogotá'],['Francia','París'],['España','Madrid'],['Perú','Lima'],['Japón','Tokio'],['Italia','Roma'],['Alemania','Berlín'],['Portugal','Lisboa'],['Chile','Santiago'],['Venezuela','Caracas'],['Ecuador','Quito'],['Rusia','Moscú'],['China','Pekín'],['Grecia','Atenas'],['Inglaterra','Londres'],['Austria','Viena'],['Brasil','Brasilia'],['Uruguay','Montevideo'],['Turquía','Ankara'],['Suecia','Estocolmo'],['Noruega','Oslo'],['Irlanda','Dublín'],['Polonia','Varsovia'],['Hungría','Budapest'],['Tailandia','Bangkok'],['Canadá','Ottawa'],['Paraguay','Asunción'],['Cuba','Habana']];
const CITY={}; for(const [p,c] of PAIRS) CITY[c]=p;
const LANG={español:'España',francés:'Francia',japonés:'Japón',italiano:'Italia',alemán:'Alemania',inglés:'Inglaterra',portugués:'Portugal',chino:'China',ruso:'Rusia',griego:'Grecia'};
const FAM=[['niño','niña'],['padre','madre'],['abuelo','abuela'],['príncipe','princesa'],['hijo','hija'],['hermano','hermana'],['tío','tía'],['sobrino','sobrina'],['esposo','esposa'],['novio','novia'],['actor','actriz'],['emperador','emperatriz'],['duque','duquesa'],['conde','condesa'],['chico','chica'],['señor','señora'],['profesor','profesora'],['doctor','doctora'],['rey','reina']];

const MIS=[
 {id:'m1',ic:'👑',t:'La clásica',d:'Haz que rey − hombre + mujer dé reina.',p:10},
 {id:'m2',ic:'🌎',t:'Capital viajera',d:'Con una capital, su país y otro país, haz que la calculadora encuentre la capital del otro país.',p:20},
 {id:'m3',ic:'👨‍👩‍👧',t:'Otra pareja',d:'Usa hombre y mujer para pasar de un familiar a su pareja femenina o masculina (sin usar rey ni reina).',p:20},
 {id:'m4',ic:'🧪',t:'Inventor de analogías',d:'Inventa una cuenta que no esté en los botones y que dé una respuesta con 70% de similitud o más.',p:30},
 {id:'m5',ic:'🤪',t:'Cuenta absurda',d:'Encuentra una cuenta donde la mejor respuesta tenga menos de 45% de similitud: la calculadora también se pierde.',p:20},
 {id:'m7',ic:'🗣️',t:'Políglota',d:'Haz que la calculadora encuentre un idioma: idioma − país + otro país = otro idioma (por ejemplo, francés − Francia + Japón).',p:20},
 {id:'m6',ic:'🙈',t:'La sombra engaña',d:'Con una cuenta que funcione (65% o más), cambia a la "Lente general" y mira qué pasa con la flecha resultante.',p:10}
];
const TOTAL=MIS.reduce((s,m)=>s+m.p,0);
const RANKS=[[0,'🥚 Principiante'],[30,'🔭 Explorador'],[80,'🧭 Navegante vectorial'],[130,'🏆 Maestro del espacio vectorial']];

/* ---------- cálculo real (300 números) ---------- */
function compute(){
  const a=words[A],b=words[B],c=words[C];
  const r=a.u.map((x,k)=>x-b.u[k]+c.u[k]);
  const all=words.map(w=>({w,s:cosv(r,w.u)})).sort((p,q)=>q.s-p.s);
  const top=all.filter(o=>![A,B,C].includes(o.w.i));
  st={r,top:top.slice(0,5),T:top[0].w,sim:top[0].s,raw:all[0]};
}

/* ---------- lentes (proyección 2D) ---------- */
function jacobi(G){
  const n=G.length, V=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0));
  for(let it=0;it<100;it++){
    let p=0,q=1,mx=0;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(G[i][j])>mx){mx=Math.abs(G[i][j]);p=i;q=j;}
    if(mx<1e-12)break;
    const th=(G[q][q]-G[p][p])/(2*G[p][q]);
    const t=Math.sign(th||1)/(Math.abs(th)+Math.sqrt(th*th+1)), c=1/Math.sqrt(t*t+1), s=t*c;
    for(let k=0;k<n;k++){ if(k!==p&&k!==q){ const x=G[k][p],y=G[k][q]; G[k][p]=G[p][k]=c*x-s*y; G[k][q]=G[q][k]=s*x+c*y; } }
    const app=G[p][p],aqq=G[q][q],apq=G[p][q];
    G[p][p]=c*c*app-2*s*c*apq+s*s*aqq; G[q][q]=s*s*app+2*s*c*apq+c*c*aqq; G[p][q]=G[q][p]=0;
    for(let k=0;k<n;k++){ const x=V[k][p],y=V[k][q]; V[k][p]=c*x-s*y; V[k][q]=s*x+c*y; }
  }
  return {vals:G.map((_,i)=>G[i][i]),V};
}
let basis=null;
function makeBasis(){
  const rows=[words[A].u,words[B].u,words[C].u,st.r,st.T.u];
  const G=rows.map(x=>rows.map(y=>dot(x,y)));
  const tr=G.reduce((s,_,i)=>s+G[i][i],0);
  const {vals,V}=jacobi(G.map(r=>r.slice()));
  const ord=vals.map((v,i)=>[v,i]).sort((p,q)=>q[0]-p[0]);
  const es=[0,1].map(k=>{
    const col=ord[k][1], lam=ord[k][0];
    const e=new Array(300).fill(0);
    rows.forEach((row,i)=>{const cf=V[i][col]/Math.sqrt(lam);for(let d=0;d<300;d++)e[d]+=cf*row[d];});
    return e;
  });
  let [e1,e2]=es;
  if(dot(st.r,e1)<0)e1=e1.map(x=>-x);
  if(dot(words[A].u,e2)<0)e2=e2.map(x=>-x);
  basis={e1,e2,kept:(ord[0][0]+ord[1][0])/tr};
}
function proj(u,kind,pr){        // u: vector 300; pr: puntajes PC (solo lente general)
  if(lens==='auto') return [dot(u,basis.e1),dot(u,basis.e2)];
  return pr;
}
function pcOf(w){return [w.p[0],w.p[1]];}
const PCR=()=>{const a=words[A].p,b=words[B].p,c=words[C].p;return [a[0]-b[0]+c[0],a[1]-b[1]+c[1]];};

/* ---------- dibujo ---------- */
function layout(){
  const get=(w)=>lens==='auto'?[dot(w.u,basis.e1),dot(w.u,basis.e2)]:pcOf(w);
  const pa=get(words[A]),pb=get(words[B]),pcc=get(words[C]),pt=get(st.T);
  const pr=lens==='auto'?[dot(st.r,basis.e1),dot(st.r,basis.e2)]:PCR();
  const pab=[pa[0]-pb[0],pa[1]-pb[1]];
  const pts=[[0,0],pa,pb,pcc,pt,pr,pab];
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const p of pts){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);}
  const sc=560/Math.max(x1-x0,y1-y0,1e-6), cx=(x0+x1)/2, cy=(y0+y1)/2;
  const M=p=>[400+(p[0]-cx)*sc, 400-(p[1]-cy)*sc];
  return {M,get,pa,pb,pcc,pt,pr,pab};
}
function arrow(p,q,col,mk,delay,w,dash){
  const L=Math.hypot(q[0]-p[0],q[1]-p[1]); if(L<4)return '';
  const k=Math.max(0,(L-22)/L);
  return `<line class="draw" pathLength="1" style="animation-delay:${delay}s" x1="${p[0]}" y1="${p[1]}" x2="${p[0]+(q[0]-p[0])*k}" y2="${p[1]+(q[1]-p[1])*k}" stroke="${col}" stroke-width="${w||4}" stroke-linecap="round" ${dash?`stroke-dasharray="${dash}"`:''} marker-end="url(#${mk})"/>`;
}
function bubble(w,p,ring,lab,delay){
  return `<g class="pop" style="animation-delay:${delay}s" transform="translate(${p[0]},${p[1]})">
    <circle r="22" fill="#fff" stroke="${ring}" stroke-width="5"/>
    <text text-anchor="middle" dominant-baseline="central" font-size="22">${w.e}</text>
    <text class="blb" y="${lab>0?42:-30}">${w.n}</text></g>`;
}
function drawMap(){
  const L=layout(), O=L.M([0,0]);
  const a=words[A],b=words[B],c=words[C],t=st.T;
  const PA=L.M(L.pa),PB=L.M(L.pb),PC=L.M(L.pcc),PT=L.M(L.pt),PR=L.M(L.pr),PAB=L.M(L.pab);
  // puntos de todas las palabras
  const show=$('#tgNames').checked, top5=new Set(st.top.map(o=>o.w.i));
  let d='';
  for(const w of words){
    if([A,B,C,t.i].includes(w.i))continue;
    const p=L.M(L.get(w)); if(p[0]<-20||p[0]>820||p[1]<-20||p[1]>820)continue;
    const big=top5.has(w.i);
    d+=`<circle class="dot" cx="${p[0]}" cy="${p[1]}" r="${big?8:5}" fill="${CATCOL[w.c]}" opacity="${big?.95:.55}"><title>${w.n}</title></circle>`;
    if(show||big) d+=`<text class="dlb" x="${p[0]}" y="${p[1]-11}">${w.n}</text>`;
  }
  $('#dotL').innerHTML=d;
  // origen y cadena de flechas: A, luego −B, luego +C
  let h=`<circle cx="${O[0]}" cy="${O[1]}" r="5" fill="#202050"/>`;
  h+=`<line x1="${O[0]}" y1="${O[1]}" x2="${PB[0]}" y2="${PB[1]}" stroke="#D64550" stroke-width="2" stroke-dasharray="3 6" opacity=".55"/>`;
  h+=`<line x1="${O[0]}" y1="${O[1]}" x2="${PC[0]}" y2="${PC[1]}" stroke="#802080" stroke-width="2" stroke-dasharray="3 6" opacity=".55"/>`;
  h+=arrow(O,PA,'#202050','mN',0,4.5);
  h+=arrow(PA,PAB,'#D64550','mR',.7,4.5);
  h+=arrow(PAB,PR,'#802080','mP',1.4,4.5);
  h+=`<line x1="${PR[0]}" y1="${PR[1]}" x2="${PT[0]}" y2="${PT[1]}" stroke="#E87800" stroke-width="2.5" stroke-dasharray="6 5" class="pop" style="animation-delay:2.1s"/>`;
  h+=`<g class="pop" style="animation-delay:2.1s" transform="translate(${PR[0]},${PR[1]})"><path d="M0,-13 L4,-4 L13,-4 L6,2 L9,11 L0,5 L-9,11 L-6,2 L-13,-4 L-4,-4 z" fill="#FFC678" stroke="#E87800" stroke-width="2"/></g>`;
  $('#chainL').innerHTML=h;
  // burbujas
  let g='';
  g+=bubble(b,PB,'#D64550',1,.2);
  g+=bubble(c,PC,'#802080',1,.2);
  g+=bubble(a,PA,'#202050',-1,.2);
  g+=bubble(t,PT,'#E87800',1,2.1);
  $('#bubL').innerHTML=g;
}
function updateMeter(){
  let pct;
  if(lens==='auto') pct=basis.kept*100;
  else pct=(DATA.ev[0]+DATA.ev[1])*100;
  const txt=pct.toFixed(1);
  $('#meterTxt').innerHTML=lens==='auto'
    ? `👁 Esta lente conserva el <b>${txt}%</b> de la información de las palabras de la cuenta · <span class="hid">🙈 el resto está oculto</span>`
    : `👁 La lente general conserva solo el <b>${txt}%</b> de la información · <span class="hid">🙈 el resto está oculto</span>`;
  $('#meterBar').style.width=Math.max(pct,1)+'%';
}

/* ---------- panel resultado ---------- */
function numTable(){
  const K=6, ro=x=>Math.round(x*100);
  const ra=words[A].u.slice(0,K).map(ro), rb=words[B].u.slice(0,K).map(x=>-ro(x)), rc=words[C].u.slice(0,K).map(ro);
  const rs=ra.map((x,k)=>x+rb[k]+rc[k]);
  const row=(lab,arr,cls)=>`<tr class="${cls||''}"><th>${lab}</th>${arr.map(v=>`<td>${v>0&&cls!=='sum'&&false?'+':''}${v}</td>`).join('')}<td class="more">…</td></tr>`;
  return `<table class="ntab"><tr><th></th>${Array.from({length:K},(_,k)=>`<td><small>#${k+1}</small></td>`).join('')}<td class="more"><small>#7…300</small></td></tr>
   ${row(words[A].e+' '+words[A].n,ra)}${row('− '+words[B].e+' '+words[B].n,rb)}${row('+ '+words[C].e+' '+words[C].n,rc)}
   ${row('= resultado',rs,'sum')}</table>
   <p style="font-size:11.5px;color:var(--mut);margin:6px 0 0">Aquí solo ves los 6 primeros de los 300 números (multiplicados por 100 para que se lean mejor). La calculadora hace esta misma cuenta con los 300.</p>`;
}
function verdict(){
  const T=st.T, s=st.sim;
  if(s>=.7) return `<div class="verdict good">✅ ¡Funcionó! La flecha resultante apunta casi igual que <b>${T.e} ${T.n}</b> (${pc(s)} de similitud).</div>`;
  if(s>=.5) return `<div class="verdict neu">🔎 Casi: lo más cercano es <b>${T.e} ${T.n}</b> (${pc(s)}), pero no con mucha seguridad.</div>`;
  return `<div class="verdict bad">🤔 Aquí la calculadora se pierde: lo mejor que encuentra es <b>${T.e} ${T.n}</b> con solo ${pc(s)}. No todas las cuentas tienen sentido.</div>`;
}
function renderResult(){
  const a=words[A],b=words[B],c=words[C],T=st.T;
  $('#resBox').innerHTML=`${T.e} ${T.n}`;
  const raw=st.raw.w, note=[A,B,C].includes(raw.i)
    ?`<p style="font-size:12px;color:var(--mut);margin:8px 0 0">💡 La flecha resultante queda más cerca de <b>${raw.n}</b> (${pc(st.raw.s)}), una de las 3 palabras que usaste. Por eso, en las analogías, esas 3 no se cuentan como respuesta.</p>`:'';
  $('#result').innerHTML=`
   <p class="bigeq">${a.e} ${a.n} − ${b.e} ${b.n} + ${c.e} ${c.n} ≈ <b>${T.e} ${T.n}</b></p>
   ${verdict()}
   <h4>🔢 La cuenta por dentro</h4>${numTable()}
   <h4>🧲 Palabras más cercanas al resultado (en los 300 números)</h4>
   <div class="nbs">${st.top.map((o,i)=>`<div class="nb ${i===0?'first':''}"><span class="e">${o.w.e}</span><span class="nm2">${o.w.n}${i===0?'<span class="eye near">🏆 respuesta</span>':''}</span><span class="pc">${pc(o.s)}</span></div>`).join('')}</div>
   ${note}`;
}

/* ---------- misiones ---------- */
const nm=i=>words[i].n;
function rankOf(s){let r=RANKS[0][1];for(const [t,n] of RANKS)if(s>=t)r=n;return r;}
function renderScore(){ try{const k='usb_llm_n3',o=JSON.parse(localStorage.getItem(k)||'{}');if(!(o.s>=score))localStorage.setItem(k,JSON.stringify({s:score,t:TOTAL}));}catch(e){}  $('#score').innerHTML=`⭐ ${score}/${TOTAL} pts · <small>${rankOf(score)}</small>`; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.h); toast.h=setTimeout(()=>t.classList.remove('show'),3200); }
function award(id){
  if(done[id])return; done[id]=true;
  const m=MIS.find(x=>x.id===id); score+=m.p; renderScore(); renderMissions();
  toast(`🎉 ¡Misión cumplida! ${m.t} · +${m.p} pts`);
}
function renderMissions(){
  $('#missions').innerHTML=MIS.map(m=>`<div class="mis ${done[m.id]?'done':''}"><div class="ic">${done[m.id]?'✅':m.ic}</div><div><h5>${m.t}</h5><p>${m.d}</p></div><div class="pts">${done[m.id]?'¡Listo!':'+'+m.p}</div></div>`).join('');
}
function check(){
  const a=nm(A),b=nm(B),c=nm(C),t=st.T.n, s=st.sim;
  if(a==='rey'&&b==='hombre'&&c==='mujer'&&t==='reina') award('m1');
  if(CITY[a]&&CITY[t]&&CITY[a]===b&&CITY[t]===c) award('m2');
  if(LANG[a]&&LANG[t]&&LANG[a]===b&&LANG[t]===c) award('m7');
  const hm=(b==='hombre'&&c==='mujer'), mh=(b==='mujer'&&c==='hombre');
  if(hm||mh){
    for(const [m,f] of FAM){ if(m==='rey')continue;
      if((hm&&a===m&&t===f)||(mh&&a===f&&t===m)) award('m3'); }
  }
  if(s>=.7&&!presetKey.has([a,b,c].join('|'))) award('m4');
  if(s<.45) award('m5');
  if(lens==='pc'&&s>=.65) award('m6');
}

/* ---------- datos ---------- */
function renderDatos(){
  $('#datos').innerHTML=`
   <p><b>Modelo:</b> ${DATA.modelo}. Cada palabra tiene ${DATA.dims} números.</p>
   <p><b>La cuenta:</b> se suman y restan los 300 números de cada palabra, uno por uno. El resultado es otra flecha de 300 números.</p>
   <p><b>La respuesta:</b> es la palabra cuya flecha apunta más parecido al resultado (se mide con el coseno), sin contar las 3 palabras que usaste. Solo compite con las ${words.length} palabras de este taller.</p>
   <p><b>El mapa:</b> es una sombra en 2D. La <i>lente ajustada</i> se calcula para que se vea bien esta cuenta; la <i>lente general</i> es la sombra automática (PCA) y puede ocultar justo lo importante.</p>
   <p><b>Ojo:</b> funciona porque el modelo leyó muchísimo texto, no porque entienda de reyes o de países. Y con ${words.length} palabras es más fácil acertar que con un diccionario entero.</p>`;
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
function syncSelects(){ CB.A.set(A); CB.B.set(B); CB.C.set(C); }
function buildPresets(){
  $('#presets').innerHTML=FAV.map((t,i)=>{const [a,b,c]=t.map(idx).map(j=>words[j]);return `<button class="chip" data-i="${i}">${a.e} ${a.n} − ${b.n} + ${c.n}</button>`;}).join('')
   +`<select id="anSel" class="anSel"><option value="">📚 Más analogías…</option>
     <optgroup label="✅ Funcionan">${AN.map((a,i)=>a.ok?`<option value="${i}">${a.a} − ${a.b} + ${a.c}</option>`:'').join('')}</optgroup>
     <optgroup label="❌ Fallan (¿por qué?)">${AN.map((a,i)=>!a.ok?`<option value="${i}">${a.a} − ${a.b} + ${a.c}</option>`:'').join('')}</optgroup></select>
    <button class="chip" id="rnd">🎲 Al azar</button>`;
}
function update(){
  compute(); makeBasis(); syncSelects();
  drawMap(); updateMeter(); renderResult(); check();
}
CB.A=makeCombo($('#sA'),i=>{A=i;update();},A);
CB.B=makeCombo($('#sB'),i=>{B=i;update();},B);
CB.C=makeCombo($('#sC'),i=>{C=i;update();},C);
$('#presets').addEventListener('click',e=>{
  const b=e.target.closest('.chip'); if(!b)return;
  if(b.id==='rnd'){ const a=AN[Math.floor(Math.random()*AN.length)]; [A,B,C]=[a.a,a.b,a.c].map(idx); update(); return; }
  [A,B,C]=FAV[+b.dataset.i].map(idx); update();
});
$('#presets').addEventListener('change',e=>{
  if(e.target.id!=='anSel'||e.target.value==='')return;
  const a=AN[+e.target.value]; [A,B,C]=[a.a,a.b,a.c].map(idx); update(); e.target.value='';
});
$('#lens').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b||b.dataset.l===lens)return;
  lens=b.dataset.l;
  document.querySelectorAll('#lens button').forEach(x=>x.classList.toggle('on',x===b));
  update();
});
$('#tgNames').addEventListener('change',drawMap);
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id==='p-'+t.dataset.t));
}));

buildPresets(); renderDatos(); renderScore(); renderMissions(); update();
$('#btnHow').addEventListener('click',()=>$('#howto').classList.add('show'));
$('#hwOk').addEventListener('click',()=>$('#howto').classList.remove('show'));
})();
