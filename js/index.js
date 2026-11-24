const LEVELS=[
 {n:1,f:'nivel1_autocompleta.html',ic:'⌨️',t:'Autocompleta',q:'¿Cómo adivina la siguiente palabra?',d:'Un modelo que solo cuenta: lee textos, anota qué palabra sigue a cuál y escribe frases. Descubre su memoria, sus límites y por qué se confía de más.',min:15,tot:140,u:'pts'},
 {n:2,f:'nivel2_mapa_palabras.html',ic:'🗺️',t:'El mapa de las palabras',q:'¿Qué es una palabra para un computador?',d:'Cada palabra es una flecha de 300 números. Explora un mapa 2D, que es solo una sombra, y compara cuándo engaña.',min:20,tot:140,u:'pts'},
 {n:3,f:'nivel3_calculadora_palabras.html',ic:'🧮',t:'Calculadora de palabras',q:'¿Se pueden sumar y restar significados?',d:'rey − hombre + mujer ≈ reina. Usa vectores reales, prueba analogías que funcionan y otras que fallan.',min:15,tot:130,u:'pts'},
 {n:4,f:'nivel4_entrena_neurona.html',ic:'🧠',t:'Entrena la neurona',q:'¿Cómo aprende una neurona artificial?',d:'Enséñale conceptos con pocas tarjetas, entrénala de verdad en tu navegador y presenta el examen por rondas.',min:20,tot:18,u:'⭐'},
 {n:5,f:'nivel5_temperatura.html',ic:'🌡️',t:'Temperatura y alucinaciones',q:'¿Por qué a veces se inventa cosas?',d:'Una ruleta de probabilidades y un termómetro: cuándo el modelo es fiable, cuándo es creativo y cuándo alucina.',min:15,tot:130,u:'pts'}
];
const get=n=>{try{return JSON.parse(localStorage.getItem('usb_llm_n'+n)||'null');}catch(e){return null;}};
function render(){
  let S=0,T=0,next=null;
  const html=LEVELS.map(L=>{
    const p=get(L.n)||{s:0,t:L.tot}, t=p.t||L.tot, pct=t?Math.min(100,Math.round(p.s/t*100)):0, done=pct>=60;
    S+=p.s/t; T+=1; if(!next&&pct<60) next=L;
    return `<a class="lv ${done?'done':''}" href="${L.f}"><span class="num">NIVEL ${L.n}${done?' ✓':''}</span><div class="ic">${L.ic}</div><h3>${L.t}</h3><p class="q">${L.q}</p><p class="d">${L.d}</p>
      <div class="pbar2"><i style="width:${pct}%"></i></div>
      <div class="meta"><span>${p.s>0?(L.u==='⭐'?'⭐ '+p.s+'/'+t:p.s+'/'+t+' pts'):'Sin jugar'} · ≈ ${L.min} min</span></div><span class="go">${p.s>0?'Seguir jugando':'Jugar'} →</span></a>`;
  }).join('');
  $('levels').innerHTML=html;
  const pct=Math.round(S/T*100);
  $('pct').textContent=pct; $('mbar').style.width=pct+'%';
  $('rank').textContent=pct>=80?'🏆 Maestro del espacio vectorial':pct>=50?'🧭 Navegante vectorial':pct>=20?'🔭 Explorador':pct>0?'🥚 Aprendiz':'🥚 Aprendiz · aún no has jugado';
  const target=next||LEVELS[0], any=LEVELS.some(L=>(get(L.n)||{s:0}).s>0);
  $('cta').href=target.f; $('ctaTxt').textContent=!any?'Empezar el taller':next?'Continuar: Nivel '+next.n:'Volver a jugar el Nivel 1';
}
const $=id=>document.getElementById(id);
$('reset').addEventListener('click',()=>{ if(confirm('¿Borrar tu progreso en todos los niveles?')){ LEVELS.forEach(L=>{try{localStorage.removeItem('usb_llm_n'+L.n);}catch(e){}}); render(); } });
render();
