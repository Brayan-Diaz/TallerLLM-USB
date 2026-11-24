(()=>{
'use strict';
const $=s=>document.querySelector(s);
const NS='http://www.w3.org/2000/svg';
const S=350, C=400;                         // escala y centro del plano
const X=u=>C+u*S, Y=u=>C-u*S;
const clamp=u=>Math.max(-1,Math.min(1,u));
const f2=n=>(n<0?'−':'')+Math.abs(n).toFixed(2);
const pc=c=>Math.round(c*100)+'%';
const CATCOL={ani:'#E87800',tec:'#202050',nat:'#1E9C8A',com:'#802080',esc:'#D4A017',fam:'#E0407B',geo:'#2F6FD6'};
const NPC=6;                                // componentes automáticos disponibles

/* ---------- datos reales ---------- */
const words=DATA.words.map((w,i)=>{
  const nr=Math.hypot(...w.v);
  return {i,n:w.n,e:w.e,c:w.c,v:w.v,p:w.p,u:w.v.map(x=>x/nr),x:0,y:0,tx:0,ty:0,moved:false,el:null};
});
const N=words.length;
const COS=words.map(a=>words.map(b=>{let s=0;for(let k=0;k<300;k++)s+=a.u[k]*b.u[k];return s;}));
const cosw=(a,b)=>COS[a.i][b.i];
const md=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);   // distancia en el MAPA (solo el dibujo)
const idxOf=n=>words.findIndex(w=>w.n===n);

/* ---------- estado ---------- */
const svg=$('#map'), gridL=$('#gridL'), axL=$('#axL'), vecL=$('#vecL'), wordL=$('#wordL');
let mode='pca';
const pa={x:0,y:1}, ra={x:16,y:202};
let hist=[], catFocus=null, drag=null, sched=0, raf=0, score=0, xCh=false, yCh=false;
const done={};
const ax=()=>mode==='pca'?pa.x:ra.x, ay=()=>mode==='pca'?pa.y:ra.y;
const axisVal=(w,k)=>mode==='pca'?w.p[k]:w.v[k];

const MIS=[
 {id:'m1',ic:'🧭',t:'Explorador de ejes',d:'Cambia la coordenada horizontal y la vertical al menos una vez cada una.',p:10},
 {id:'m2',ic:'🕵️',t:'Sombra engañosa',d:'Haz clic en dos palabras que se vean pegaditas en el mapa pero que en los 300 números casi no se parezcan. Pista: cambia los ejes.',p:30},
 {id:'m3',ic:'👯',t:'Gemelas',d:'Encuentra dos palabras muy parecidas en los 300 números reales (similitud de 65% o más).',p:20},
 {id:'m4',ic:'🚫',t:'Nada en común',d:'Encuentra dos palabras con similitud negativa (menor a −10%). En vectores reales casi nunca hay opuestos perfectos.',p:20},
 {id:'m5',ic:'😲',t:'Vecina sorpresa',d:'Encuentra dos palabras de categorías distintas que se parezcan mucho (50% o más). ¿Por qué el modelo las vería cercanas?',p:30},
 {id:'m6',ic:'🔢',t:'Números crudos',d:'Pasa al modo "Números crudos" y mira cómo se ve el mapa con solo 2 de los 300 números.',p:10},
 {id:'m7',ic:'🎭',t:'Camuflaje',d:'Haz clic en una palabra y arrastra otra encima hasta que se tapen. En el mapa ya son "iguales"... ¿y en los 300 números?',p:20}
];
const RANKS=[[0,'🥚 Principiante'],[40,'🔭 Explorador'],[90,'🧭 Navegante vectorial'],[140,'🏆 Maestro del espacio vectorial']];
const TOTAL=MIS.reduce((s,m)=>s+m.p,0);

/* ---------- ejes y posiciones ---------- */
function retarget(snap){
  const kx=ax(), ky=ay();
  let mx=0,my=0;
  for(const w of words){ mx=Math.max(mx,Math.abs(axisVal(w,kx))); my=Math.max(my,Math.abs(axisVal(w,ky))); }
  const sx=mx?0.92/mx:1, sy=my?0.92/my:1;
  for(const w of words){
    w.tx=axisVal(w,kx)*sx; w.ty=axisVal(w,ky)*sy; w.moved=false;
    if(snap){w.x=w.tx;w.y=w.ty;}
  }
}
function axName(k){ return mode==='pca' ? `Componente ${k+1} (${Math.round(DATA.ev[k]*100)}%)` : `Número #${k+1}`; }
function updateAxisLabels(){
  $('#lxL').textContent='◀ menor'; $('#lxR').textContent='mayor ▶';
  $('#lyT').textContent='▲ mayor'; $('#lyB').textContent='▼ menor';
  $('#lxy').innerHTML=`<tspan fill="#202050">➡ ${axName(ax())}</tspan><tspan fill="#9a9ab5">   ·   </tspan><tspan fill="#802080">⬆ ${axName(ay())}</tspan>`;
}
function updateMeter(){
  const f=mode==='pca' ? DATA.ev[ax()]+DATA.ev[ay()] : DATA.rawvar[ax()]+DATA.rawvar[ay()];
  const pct=f*100, txt=pct<10?pct.toFixed(2):pct.toFixed(1);
  $('#meterTxt').innerHTML=`👁 El mapa conserva solo el <b>${txt}%</b> de la información · <span class="hid">🙈 el otro ${(100-pct).toFixed(pct<10?2:1)}% está oculto</span>`;
  $('#meterBar').style.width=Math.max(pct,0.8)+'%';
}
function buildStatic(){
  let g='';
  for(const u of [-1,-.5,0,.5,1]){
    const z=u===0;
    g+=`<line x1="${X(u)}" y1="${Y(-1)}" x2="${X(u)}" y2="${Y(1)}" stroke="${z?'#8f8fb8':'#ECECF4'}" stroke-width="${z?2.5:1.5}"/>`;
    g+=`<line x1="${X(-1)}" y1="${Y(u)}" x2="${X(1)}" y2="${Y(u)}" stroke="${z?'#8f8fb8':'#ECECF4'}" stroke-width="${z?2.5:1.5}"/>`;
  }
  g+=`<rect x="${X(-1)}" y="${Y(1)}" width="${2*S}" height="${2*S}" fill="none" stroke="#D8D8E8" stroke-width="2"/>`;
  gridL.innerHTML=g;
  axL.innerHTML=`
   <text id="lxL" class="axlab" x="${X(-1)+8}" y="${C-10}" text-anchor="start"></text>
   <text id="lxR" class="axlab" x="${X(1)-8}"  y="${C-10}" text-anchor="end"></text>
   <text id="lyT" class="axlab" x="${C+10}" y="${Y(1)+22}" text-anchor="start"></text>
   <text id="lyB" class="axlab" x="${C+10}" y="${Y(-1)-12}" text-anchor="start"></text>
   <text id="lxy" class="axtit" x="${C}" y="788" text-anchor="middle"></text>`;
}

/* ---------- burbujas ---------- */
function svgPt(e){
  const pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function buildWordEl(w){
  const g=document.createElementNS(NS,'g');
  g.setAttribute('class','w');
  g.innerHTML=`<circle class="ring" r="30"></circle><circle class="bub" r="20" stroke="${CATCOL[w.c]}"></circle><text class="em">${w.e}</text><text class="lb" y="41">${w.n}</text>`;
  g.addEventListener('pointerdown',e=>{
    e.preventDefault();
    try{g.setPointerCapture(e.pointerId)}catch(_){}
    const p=svgPt(e);
    drag={w,ox:p.x-X(w.x),oy:p.y-Y(w.y),sx:e.clientX,sy:e.clientY,moved:false};
    select(w.i);
  });
  g.addEventListener('pointermove',e=>{
    if(!drag||drag.w!==w)return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<5)return;
    drag.moved=true; w.moved=true;
    const p=svgPt(e);
    w.x=clamp((p.x-drag.ox-C)/S); w.y=clamp(-(p.y-drag.oy-C)/S);   // solo mueve el dibujo
    schedule();
  });
  const end=()=>{ if(drag&&drag.w===w){drag=null;schedule();} };
  g.addEventListener('pointerup',end);
  g.addEventListener('pointercancel',end);
  w.el=g; wordL.appendChild(g);
}
function select(i){
  if(hist[hist.length-1]!==i){ hist.push(i); if(hist.length>2)hist.shift(); }
  schedule();
}
const cur=()=>hist.length?words[hist[hist.length-1]]:null;
const prv=()=>hist.length>1?words[hist[0]]:null;

/* ---------- animación y dibujo ---------- */
function schedule(){ if(!sched) sched=requestAnimationFrame(()=>{sched=0;render();renderExplore();check();}); }
function kick(){ if(!raf) raf=requestAnimationFrame(tick); }
function tick(){
  let moving=false;
  for(const w of words){
    if(w.moved)continue;
    const dx=w.tx-w.x, dy=w.ty-w.y;
    if(Math.abs(dx)>.001||Math.abs(dy)>.001){w.x+=dx*.16;w.y+=dy*.16;moving=true;}else{w.x=w.tx;w.y=w.ty;}
  }
  render();
  raf=moving?requestAnimationFrame(tick):0;
}
function arrowTo(x,y,col,mk){
  const px=X(x), py=Y(y), L=Math.hypot(px-C,py-C);
  if(L<46) return '';
  const k=(L-23)/L;
  return `<line x1="${C}" y1="${C}" x2="${C+(px-C)*k}" y2="${C+(py-C)*k}" stroke="${col}" stroke-width="4" stroke-linecap="round" marker-end="url(#${mk})"/>`;
}
function proj(w,col){
  const px=X(w.x), py=Y(w.y);
  return `<line x1="${px}" y1="${py}" x2="${px}" y2="${C}" stroke="${col}" stroke-width="2" stroke-dasharray="5 4" opacity=".7"/>
          <line x1="${px}" y1="${py}" x2="${C}" y2="${py}" stroke="${col}" stroke-width="2" stroke-dasharray="5 4" opacity=".7"/>`;
}
function coordTxt(w,col){
  const px=X(w.x), py=Y(w.y);
  const tx=Math.min(Math.max(px+(px>C?-36:36),60),740), ty=py+(py>C?-40:48);
  return `<text class="coord" x="${tx}" y="${ty}" text-anchor="middle" fill="${col}">(${f2(w.x)}, ${f2(w.y)})</text>`;
}
function render(){
  const a=prv(), b=cur();
  for(const w of words){
    w.el.setAttribute('transform',`translate(${X(w.x)},${Y(w.y)})`);
    w.el.classList.toggle('cur',w===b);
    w.el.classList.toggle('prev',w===a);
    w.el.classList.toggle('dim',catFocus!==null&&w.c!==catFocus&&w!==a&&w!==b);
  }
  let h='';
  if($('#tgAll').checked){
    for(const w of words){ h+=`<line x1="${C}" y1="${C}" x2="${X(w.x)}" y2="${Y(w.y)}" stroke="${CATCOL[w.c]}" stroke-width="1.6" opacity=".2"/>`; }
  }
  if(a){ h+=proj(a,'#802080')+arrowTo(a.x,a.y,'#802080','ahP'); }
  if(b){ h+=proj(b,'#E87800')+arrowTo(b.x,b.y,'#E87800','ahO'); }
  if(a&&b){
    const r=62, p1={x:X(a.x)-C,y:Y(a.y)-C}, p2={x:X(b.x)-C,y:Y(b.y)-C};
    const l1=Math.hypot(p1.x,p1.y), l2=Math.hypot(p2.x,p2.y);
    if(l1>80&&l2>80){
      const a1=Math.atan2(p1.y,p1.x), a2=Math.atan2(p2.y,p2.x);
      let d=a2-a1; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
      const sx=C+r*Math.cos(a1), sy=C+r*Math.sin(a1), ex=C+r*Math.cos(a2), ey=C+r*Math.sin(a2);
      const mid=a1+d/2, deg=Math.round(Math.abs(d)*180/Math.PI);
      h+=`<path d="M${sx},${sy} A${r},${r} 0 0 ${d>0?1:0} ${ex},${ey}" fill="none" stroke="#202050" stroke-width="3"/>
          <text class="coord" x="${C+(r+26)*Math.cos(mid)}" y="${C+(r+26)*Math.sin(mid)+4}" text-anchor="middle" fill="#202050">${deg}°</text>`;
    }
  }
  if(a) h+=coordTxt(a,'#802080');
  if(b) h+=coordTxt(b,'#E87800');
  vecL.innerHTML=h;
}

/* ---------- panel Explorar ---------- */
function hm(v,cls,hl){
  let h=`<div class="hm ${cls||''}">`;
  for(let k=0;k<300;k++){
    const x=v[k], a=Math.min(1,Math.pow(Math.abs(x)/4,.8)).toFixed(2);
    const col=x>=0?`rgba(232,120,0,${a})`:`rgba(32,32,80,${a})`;
    const on=hl&&(k===hl[0]||k===hl[1]);
    h+=`<i style="background:${col}"${on?' class="hl"':''} title="número #${k+1}: ${x.toFixed(2)}"></i>`;
  }
  return h+'</div>';
}
function trk(val,cls){const wd=Math.abs(val)*50,left=val<0?50-wd:50;return `<div class="track"><i class="mid"></i><b class="${cls||''}" style="left:${left}%;width:${wd}%"></b></div>`;}
function barsHTML(b,a){
  const rows=[['x','➡ '+axName(ax())],['y','⬆ '+axName(ay())]];
  let h=rows.map(([k,nm])=>`<div class="brow vis"><div class="nm">${nm}<span class="tag">👁 se ve en el mapa</span></div>
    <div>${a?trk(a[k],'pb')+'':''}${trk(b[k],'ob')}</div><em>${f2(b[k])}</em></div>`).join('');
  h+=`<div class="brow hid"><div class="nm">🙈 Otros 298 números<span class="tag">ocultos: el mapa no los dibuja</span></div>
    <div><div class="track hidtrack"></div></div><em>🔒</em></div>`;
  return h;
}
const LEG='<div class="hmleg"><span>negativo</span><span class="g"></span><span>positivo</span></div>';
function neighbors(w,k){
  return words.filter(o=>o!==w).map(o=>({o,c:cosw(w,o)})).sort((p,q)=>q.c-p.c).slice(0,k);
}
function mapRanks(w){
  const r={}; words.filter(o=>o!==w).sort((p,q)=>md(w,p)-md(w,q)).forEach((o,i)=>{r[o.i]=i+1;}); return r;
}
function compareHTML(a,b){
  const c=cosw(a,b), ang=Math.round(Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI), m=md(a,b);
  const diff=a.v.map((x,k)=>x-b.v[k]);
  let vd;
  if(m<.25&&c<.30) vd=`<div class="verdict bad">⚠️ ¡La sombra te engañó! En el mapa se ven pegaditas, pero en los 300 números casi no se parecen (similitud ${pc(c)}).</div>`;
  else if(m>.9&&c>=.5) vd=`<div class="verdict pu">🙈 Al revés: en el mapa se ven lejos, pero en los 300 números sí se parecen (${pc(c)}). El mapa pierde información.</div>`;
  else if(c>=.65) vd=`<div class="verdict good">✅ Muy parecidas en los 300 números reales (${pc(c)}).</div>`;
  else if(c<=-.1) vd=`<div class="verdict neu">🚫 Similitud negativa: no tienen nada en común. Pero ojo: en vectores reales casi nunca hay opuestos perfectos.</div>`;
  else vd=`<div class="verdict neu">🔎 Cambia las coordenadas del mapa y mira si siguen viéndose igual de cerca o de lejos.</div>`;
  return `<div class="pair"><span class="pp a">${a.e} ${a.n}</span><span>↔</span><span class="pp b">${b.e} ${b.n}</span></div>
   <div class="tiles">
     <div class="tile"><small>Distancia en el mapa (solo el dibujo)</small><strong>${m.toFixed(2)}</strong></div>
     <div class="tile ${m<.25&&c<.30?'warn':''}"><small>Similitud real (300 números)</small><strong>${pc(c)}</strong></div>
     <div class="tile"><small>Ángulo real entre las flechas</small><strong>${ang}°</strong></div>
   </div>
   ${vd}
`;
}
function renderExplore(){
  const b=cur(), a=prv(), el=$('#explore');
  if(!b){ el.innerHTML='<div class="empty">👆 Haz clic en una palabra del mapa para ver su vector real.</div>'; return; }
  const nb=neighbors(b,5), rk=mapRanks(b);
  const hl=mode==='raw'?[ax(),ay()]:null;
  el.innerHTML=`
   <div class="wcard"><div class="big" style="border-color:${CATCOL[b.c]}">${b.e}</div>
     <div><h3>${b.n}</h3><span class="cat" style="background:${CATCOL[b.c]}">${DATA.cats[b.c]}</span></div>
     ${b.moved?'<button class="back" id="btnBack">↩ A su lugar real</button>':''}</div>
   <h4>📍 Lo que ve el mapa ${a?'<span style="font-weight:600;font-size:12px">(<span style="color:#802080">🟣 '+a.n+'</span> · <span style="color:#E87800">🟠 '+b.n+'</span>)</span>':'de '+b.n}</h4>
   ${barsHTML(b,a)}
   <p style="font-size:12px;color:var(--mut);margin:6px 0 0">Mueve la burbuja y mira cómo cambian las barras. Pero ojo: dentro de la palabra siguen estando sus 300 números reales, y esos no cambian.</p>
   <h4>🧲 Sus vecinas más parecidas (en los 300 números)</h4>
   <div class="nbs">${nb.map(n=>{
      const near=rk[n.o.i]<=10;
      return `<button class="nb" data-i="${n.o.i}"><span class="e">${n.o.e}</span><span class="nm2">${n.o.n}<span class="eye ${near?'near':'far'}">${near?'👁 se ve cerca en el mapa':'🙈 se ve lejos en el mapa'}</span></span><span class="pc">${pc(n.c)}</span></button>`;}).join('')}</div>
   <h4>⚖️ Comparar con la palabra anterior</h4>
   ${a?compareHTML(a,b):'<div class="empty">Haz clic en <b>otra</b> palabra y las comparamos.</div>'}`;
}
$('#explore').addEventListener('click',e=>{
  const nbtn=e.target.closest('.nb'); if(nbtn){ select(+nbtn.dataset.i); return; }
  if(e.target.closest('#btnBack')){ const w=cur(); if(w){ w.moved=false; kick(); schedule(); } }
});

/* ---------- misiones y puntaje ---------- */
function rankOf(s){let r=RANKS[0][1];for(const [t,n] of RANKS)if(s>=t)r=n;return r;}
function renderScore(){ try{const k='usb_llm_n2',o=JSON.parse(localStorage.getItem(k)||'{}');if(!(o.s>=score))localStorage.setItem(k,JSON.stringify({s:score,t:TOTAL}));}catch(e){}  $('#score').innerHTML=`⭐ ${score}/${TOTAL} pts · <small>${rankOf(score)}</small>`; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.h); toast.h=setTimeout(()=>t.classList.remove('show'),3000); }
function award(id){
  if(done[id])return;
  done[id]=true; const m=MIS.find(x=>x.id===id); score+=m.p;
  renderScore(); renderMissions(); toast(`🎉 ¡Misión cumplida! ${m.t} · +${m.p} pts`);
}
function renderMissions(){
  $('#missions').innerHTML=MIS.map(m=>`<div class="mis ${done[m.id]?'done':''}"><div class="ic">${done[m.id]?'✅':m.ic}</div><div><h5>${m.t}</h5><p>${m.d}</p></div><div class="pts">${done[m.id]?'¡Listo!':'+'+m.p}</div></div>`).join('');
}
function check(){
  if(xCh&&yCh) award('m1');
  const a=prv(), b=cur();
  if(!a||!b) return;
  const c=cosw(a,b), m=md(a,b), quiet=!a.moved&&!b.moved;
  if(quiet&&m<.25&&c<.30) award('m2');
  if(c>=.65) award('m3');
  if(c<=-.1) award('m4');
  if(a.c!==b.c&&c>=.5) award('m5');
  if((a.moved||b.moved)&&m<.15&&c<.5) award('m7');
}
function renderDatos(){
  $('#datos').innerHTML=`
   <p><b>Modelo:</b> ${DATA.modelo}.</p>
   <p><b>Los números:</b> cada palabra tiene ${DATA.dims} números. Nadie los escribió a mano: el modelo los fue ajustando mientras leía millones de textos en español. Palabras que aparecen en contextos parecidos terminan con números parecidos.</p>
   <p><b>Parecido real:</b> se mide con el <b>coseno</b>, que compara la dirección de dos flechas de 300 números (100% = misma dirección; 0% = sin relación; negativo = direcciones contrarias).</p>
   <p><b>El mapa:</b> es solo una sombra. Con <i>Componentes automáticos</i> dibuja las 2 combinaciones de los 300 números que más información conservan (cerca de ${Math.round((DATA.ev[0]+DATA.ev[1])*100)}%). Con <i>Números crudos</i> dibuja 2 números cualquiera, y verás que cada uno por separado no significa nada.</p>
   <p><b>Mover una burbuja</b> solo mueve el dibujo: el vector real no cambia, y por eso la similitud real tampoco.</p>
   <p><b>Ojo:</b> no es ChatGPT. Es una tabla de vectores de palabras, la pieza básica sobre la que se construyen los modelos de lenguaje.</p>`;
}

/* ---------- ejes: chips, números crudos, modo ---------- */
function buildChips(){
  for(const [id,axis] of [['#chipsX','x'],['#chipsY','y']]){
    $(id).innerHTML=Array.from({length:NPC},(_,k)=>{
      const on=(axis==='x'?pa.x:pa.y)===k;
      return `<button class="chip ${on?(axis==='x'?'on':'onY'):''}" data-a="${axis}" data-k="${k}">PC${k+1} · ${Math.round(DATA.ev[k]*100)}%</button>`;
    }).join('');
  }
}
function afterAxes(){
  retarget(false); buildChips(); updateAxisLabels(); updateMeter();
  $('#rawX').value=ra.x+1; $('#rawY').value=ra.y+1;
  kick(); schedule();
}
function setPca(axis,k){
  if(axis==='x'){ if(k===pa.x)return; if(k===pa.y){pa.y=pa.x;yCh=true;} pa.x=k; xCh=true; }
  else { if(k===pa.y)return; if(k===pa.x){pa.x=pa.y;xCh=true;} pa.y=k; yCh=true; }
  afterAxes();
}
function setRaw(axis,val){
  let n=Math.round(+val); if(!isFinite(n))return; n=Math.max(1,Math.min(300,n))-1;
  if(axis==='x'){ if(n===ra.x){afterAxes();return;} ra.x=n; xCh=true; } else { if(n===ra.y){afterAxes();return;} ra.y=n; yCh=true; }
  afterAxes();
}
document.addEventListener('click',e=>{
  const c=e.target.closest('.chip'); if(c){ setPca(c.dataset.a,+c.dataset.k); }
});
$('#rawX').addEventListener('change',e=>setRaw('x',e.target.value));
$('#rawY').addEventListener('change',e=>setRaw('y',e.target.value));
$('#rxr').addEventListener('click',()=>setRaw('x',1+Math.floor(Math.random()*300)));
$('#ryr').addEventListener('click',()=>setRaw('y',1+Math.floor(Math.random()*300)));
$('#seg').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b||b.dataset.m===mode)return;
  mode=b.dataset.m;
  document.querySelectorAll('#seg button').forEach(x=>x.classList.toggle('on',x===b));
  $('#axPCA').hidden=(mode!=='pca'); $('#axRAW').hidden=(mode!=='raw');
  if(mode==='raw') award('m6');
  afterAxes();
});

/* ---------- leyenda y controles ---------- */
function buildLegend(){
  $('#legend').innerHTML=Object.entries(DATA.cats).map(([k,n])=>`<button class="lg ${catFocus===k?'on':''}" data-c="${k}"><i style="background:${CATCOL[k]}"></i>${n}</button>`).join('');
}
$('#legend').addEventListener('click',e=>{
  const b=e.target.closest('.lg'); if(!b)return;
  catFocus=(catFocus===b.dataset.c)?null:b.dataset.c; buildLegend(); render();
});
$('#tgNames').addEventListener('change',e=>svg.classList.toggle('names-off',!e.target.checked));
$('#tgAll').addEventListener('change',render);
$('#btnReset').addEventListener('click',()=>{
  catFocus=null; buildLegend();
  hist=[idxOf('perro')];
  retarget(false); kick(); render(); renderExplore(); toast('↺ Mapa reiniciado');
});
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x===t));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id==='p-'+t.dataset.t));
}));

/* ---------- inicio ---------- */
buildStatic(); words.forEach(buildWordEl); retarget(true);
buildChips(); updateAxisLabels(); updateMeter(); buildLegend(); renderDatos();
$('#rawX').value=ra.x+1; $('#rawY').value=ra.y+1;
hist=[idxOf('perro')];
renderScore(); renderMissions(); render(); renderExplore();
$('#btnHow').addEventListener('click',()=>$('#howto').classList.add('show'));
$('#hwOk').addEventListener('click',()=>$('#howto').classList.remove('show'));
})();
