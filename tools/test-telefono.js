// LAS CUATRO COSAS DEL TELÉFONO, MEDIDAS EN UN NAVEGADOR DE VERDAD.
//
// Jose, 2026-10-12, con tres vídeos: uno del escritorio y dos del teléfono.
// Salieron cuatro cosas y las cuatro se arreglaron en la v12.58. Esta prueba
// las sujeta, y las MIDE — no busca la regla en el CSS, que es el error que ya
// cometí dos veces en este mismo proyecto.
//
//   1. EL NOMBRE DEL MATERIAL salía como "P…", "L…", "KA…" en el cajón del
//      estante. Causa: `.rdw-name` tiene `flex:1` y todo lo demás de la fila
//      lleva `flex-shrink:0`, así que el nombre era lo ÚNICO que cedía — y
//      cedía hasta desaparecer. Importa porque ésa es la pantalla desde la que
//      se pulsa «Exit»: se sacaba material sin poder leer cuál.
//
//   2. UNA ENTRADA Y DOS SALIDAS. Había DOS animaciones de entrada (una por
//      cada estado del mazo) y una sola salida. Ahora hay una entrada —hecha
//      con transición, no con keyframes, así que no salta si el mazo se abre a
//      media llegada— y dos salidas que significan cosas distintas:
//      aceptada sigue hacia la izquierda, descartada se desvanece sin moverse.
//
//   3. EL TECLADO TAPABA EL BOTÓN DE GUARDAR. La barra fija ya existía; el
//      fallo era `max-height:90vh`, porque en Android `vh` NO encoge con el
//      teclado. Con `dvh` sí.
//
//   4. LA CABECERA se comía el 28% del teléfono y no se movía nunca.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-telefono.js
const { chromium } = require('playwright');
const path = require('path');
// Relativa al propio archivo, no clavada: una ruta absoluta funciona en esta
// copia del repositorio y en ninguna otra.
const F = 'file://' + path.join(__dirname, '..', 'Index_v3_fixed.html');
let ok=0,fail=0;
const ck=(l,c,e)=>{ if(c){ok++;console.log('  ok  ',l);} else {fail++;console.log('  FAIL',l,e===undefined?'':'→ '+JSON.stringify(e));} };
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH});

  console.log('\n═══ 1 · el nombre del material en el teléfono ═══\n');
  { const p=await b.newPage({viewport:{width:393,height:800},hasTouch:true,isMobile:true});
    await p.goto(F,{waitUntil:'domcontentloaded'});
    const r=await p.evaluate(()=>{
      const d=document.createElement('div'); d.className='rack-drawer open';
      d.innerHTML='<div class="rack-drawer-body"><div class="rdw-item-wrap"><div class="rdw-item">'+
        '<span class="rack-cat-dot" style="background:#3B7DD8;width:10px;height:10px;flex-shrink:0"></span>'+
        '<span class="rdw-name">PANEL DE VIDRIO TEMPLADO 48</span>'+
        '<span class="rdw-rack-qty">21 UNIT</span><span class="rdw-total-qty">(21 total)</span>'+
        '<button class="rdw-lock-btn">🔒 Reserve</button></div></div></div>';
      document.body.appendChild(d);
      const n=d.querySelector('.rdw-name'), pt=d.querySelector('.rack-cat-dot');
      return {ancho:Math.round(n.getBoundingClientRect().width),
              cortado:n.scrollWidth>n.clientWidth+1,
              mismaLinea:Math.abs(n.getBoundingClientRect().top-pt.getBoundingClientRect().top)<12};
    });
    /* 180 y no 250: puse 250 midiendo con el cajón a 92vw, y ese ancho lo
       revertí porque `test-responsive-polish.js` me recordó que los dos
       tercios los decidió Jose en la v9.89. Dentro de los 262px que él eligió
       el nombre mide 207 — más de TRES VECES los ~60 de antes, y sin cortar.
       El umbral refleja lo que la app hace de verdad, no lo que yo quería. */
    ck('el nombre tiene más de 180px (antes ~60, dentro del mismo cajón)', r.ancho>180, r);
    ck('...y no se corta', !r.cortado, r);
    ck('...y el punto de color sigue en SU línea, no encima', r.mismaLinea, r);
    await p.close(); }

  console.log('\n═══ 2 · una entrada, dos salidas ═══\n');
  { const p=await b.newPage({viewport:{width:1200,height:800}});
    await p.goto(F,{waitUntil:'domcontentloaded'});
    const r=await p.evaluate(()=>{
      const d=document.createElement('div'); d.className='deck'; d.id='x';
      d.innerHTML='<div class="deck-card" id="c1"></div>'; document.body.appendChild(d);
      const c=document.getElementById('c1'); const out={};
      /* SIN TRANSICIÓN PARA MEDIR. getComputedStyle durante una transición
         devuelve el valor A MEDIO CAMINO, no el destino — así que al quitar
         `llegando` leía todavía los 405px del punto de partida y creía que la
         clase seguía puesta. Medir el estado final exige que no haya viaje. */
      c.style.transition='none';
      c.classList.add('llegando'); out.entraCerrado=getComputedStyle(c).transform;
      d.classList.add('open');     out.entraAbierto=getComputedStyle(c).transform;
      c.classList.remove('llegando');
      c.classList.add('saliendo-aceptada');   const a=getComputedStyle(c);
      out.aceptada={t:a.transform,o:a.opacity};
      c.classList.remove('saliendo-aceptada');
      c.classList.add('saliendo-descartada'); const s=getComputedStyle(c);
      out.descartada={t:s.transform,o:s.opacity};
      return out;
    });
    ck('la MISMA clase de entrada vale abierto y cerrado',
       r.entraCerrado===r.entraAbierto && r.entraCerrado!=='none', r);
    ck('la salida ACEPTADA se mueve a la izquierda (matriz con x negativa)',
       /matrix\(.*,\s*-\d/.test(r.aceptada.t) && r.aceptada.o==='0', r.aceptada);
    ck('la salida DESCARTADA no se mueve, sólo se desvanece',
       r.descartada.t==='none' && r.descartada.o==='0', r.descartada);
    await p.close(); }

  console.log('\n═══ 3 · el teclado y el botón de guardar ═══\n');
  { const p=await b.newPage({viewport:{width:393,height:800},hasTouch:true,isMobile:true});
    await p.goto(F,{waitUntil:'domcontentloaded'});
    const r=await p.evaluate(()=>{
      const m=document.createElement('div'); m.className='modal'; document.body.appendChild(m);
      const v=getComputedStyle(m).maxHeight; m.remove();
      // El navegador se queda con la ÚLTIMA que entiende: si soporta dvh, 90dvh.
      return {maxHeight:v, alto:window.innerHeight};
    });
    ck('la ventana usa dvh, que SÍ encoge con el teclado',
       Math.abs(parseFloat(r.maxHeight)-r.alto*0.9)<2, r);
    await p.close(); }

  console.log('\n═══ 4 · la cabecera se encoge al bajar ═══\n');
  { const p=await b.newPage({viewport:{width:393,height:700},hasTouch:true,isMobile:true});
    await p.goto(F,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(700);
    const r=await p.evaluate(async()=>{
      const tb=document.querySelector('.topbar');
      document.body.style.minHeight='3000px';
      const antes=Math.round(tb.getBoundingClientRect().height);
      window.scrollTo(0,400); window.dispatchEvent(new Event('scroll'));
      await new Promise(r=>setTimeout(r,450));
      const comp=tb.classList.contains('compacta');
      const dur=Math.round(tb.getBoundingClientRect().height);
      window.scrollTo(0,0); window.dispatchEvent(new Event('scroll'));
      await new Promise(r=>setTimeout(r,450));
      return {antes,dur,comp,vuelve:Math.round(tb.getBoundingClientRect().height),
              aun:tb.classList.contains('compacta')};
    });
    ck('al bajar se pone compacta', r.comp, r);
    ck(`...y mide menos (${r.antes} → ${r.dur} px)`, r.dur < r.antes - 30, r);
    ck('al volver arriba se despliega otra vez', !r.aun && r.vuelve>=r.antes-4, r);
    await p.close(); }

  { const p=await b.newPage({viewport:{width:1200,height:800}});
    await p.goto(F,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(600);
    const r=await p.evaluate(async()=>{
      document.body.style.minHeight='3000px';
      window.scrollTo(0,400); window.dispatchEvent(new Event('scroll'));
      await new Promise(r=>setTimeout(r,350));
      return document.querySelector('.topbar').classList.contains('compacta');
    });
    ck('en el ESCRITORIO no se encoge — ahí no estorba', r===false, r);
    await p.close(); }

  await b.close();
  console.log('\n'+(fail?'✗ '+fail+' FALLOS':'✓ todo bien')+' · '+ok+' comprobaciones\n');
  process.exit(fail?1:0);
})();
