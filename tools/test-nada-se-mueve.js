// NADA SE MUEVE NI CAMBIA DE TAMAÑO AL MARCAR.
//
// Jose, 10/11, con vídeo: *"al seleccionar y pasar de un número a otro, en
// especial de 9 a 10, de una cifra a 2 cifras, se mueve todo dentro de la
// franja azul: todos los botones y los textos se mueven y cambian de tamaño.
// No quiero eso. Quiero que todo tenga su espacio y todo se mueva dentro de su
// espacio, nada debe saltar ni moverse."*
//
// ── Y DE PASO ENCONTRÓ UN FALLO MÍO ───────────────────────────────────────
//
// Con capturas de Projects: al marcar uno, el recuadro de renombrar se comía
// la franja entera y los botones bajaban a una segunda línea, encima de la
// lista. La causa, medida: dentro de Ajustes hay una regla
// `.modal input{width:100%}`, y la franja tenía `min-height` —que impide
// encogerse pero no crecer—. **Pasaba de 44 px a 95 px.**
//
// ── POR QUÉ ESTO SE MIDE EN UN NAVEGADOR ──────────────────────────────────
//
// Porque lo que falla es GEOMETRÍA. Que el CSS diga `height` no demuestra que
// la caja mida siempre igual: lo demuestra medirla con 0, 1, 2… 12 marcados y
// comparar. Una prueba que lee el CSS habría pasado con la franja creciendo.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=... node tools/test-nada-se-mueve.js

const fs=require('fs'), path=require('path'), os=require('os');
const { chromium } = require('playwright');
/* La raíz se calcula desde ESTE fichero, nunca una ruta absoluta escrita a
 * mano. La primera versión llevaba `/home/user/ox-glass-wms` fija, así que al
 * ejecutarla sobre una copia modificada seguía midiendo el archivo de verdad
 * — y daba verde contra un fallo que yo mismo acababa de meter a propósito
 * para comprobarla. Una prueba que no se puede ejecutar contra otra copia no
 * se puede verificar. */
const RAIZ = path.join(__dirname, '..');
const html=fs.readFileSync(path.join(RAIZ,'Index_v3_fixed.html'),'utf8');
const css=(html.match(/<style>[\s\S]*?<\/style>/g)||[]).join('\n');
const fn = n => { const i=html.indexOf('function '+n+'('); let d=0;
  for(let j=html.indexOf('{',i);j<html.length;j++){ if(html[j]==='{')d++; else if(html[j]==='}'){d--; if(!d) return html.slice(i,j+1);} } };
const NOMBRES=Array.from({length:12},(_,i)=>'PROJECT NUMBER '+(i+1));
const page=`<!doctype html><html><head><meta charset="utf-8">${css}</head>
<body style="margin:0;background:#fff"><div class="modal show"><div class="modal-content" style="padding:20px">
<div id="bar" class="cfg-pickbar"></div>
<ul class="cfg-list">${NOMBRES.map(n=>'<li class="cfg-item" data-val="'+n+'"><input type="checkbox" class="cfg-pick"><span class="cfg-item-name">'+n+'</span></li>').join('')}</ul>
</div></div><script>
function _he(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function _escAttr(s){return _he(s);}
function _vigilarGuardar(){return{revisar(){},guardado(){}};}
${fn('_barraMarcados')}
var TODOS=${JSON.stringify(NOMBRES)}, SEL=[];
function pinta(n){ SEL=TODOS.slice(0,n);
  _barraMarcados({barId:'bar',prefijo:'cfgPick',marcadas:()=>SEL,
    instruccion:'Tick a project to rename or delete it. Tick two or more to merge them.',
    limpiar:function(){}, renombrar:{hacer:function(){}}, fusionar:{hacer:function(){}},
    acciones:[{id:'DelBtn',clase:'cfg-btn-danger',texto:'\u{1F5D1} Delete',conVarias:true,hacer:function(){}}]});
}
<\/script></body></html>`;
const f=path.join(os.tmpdir(),'mide-'+Math.random().toString(36).slice(2)+'.html');
fs.writeFileSync(f,page);
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH});
  const p=await b.newPage({viewport:{width:1100,height:800}});
  await p.goto('file://'+f);
  const filas=[];
  for (let n=0;n<=12;n++){
    await p.evaluate(k=>pinta(k), n);
    await p.waitForTimeout(40);
    filas.push(await p.evaluate(()=>{
      const bar=document.getElementById('bar');
      const li=document.querySelector('li.cfg-item');
      const bb=bar.getBoundingClientRect();
      const del=document.getElementById('cfgPickDelBtn');
      const clr=document.getElementById('cfgPickClearBtn');
      return {alto:Math.round(bb.height),
              listaY:Math.round(li.getBoundingClientRect().top),
              delW: del?Math.round(del.getBoundingClientRect().width):null,
              numW: del?(del.querySelector('.num')?Math.round(del.querySelector('.num').getBoundingClientRect().width):null):null,
              delX: del?Math.round(del.getBoundingClientRect().left):null,
              clrX: clr?Math.round(clr.getBoundingClientRect().left):null};
    }));
  }
  console.log('  n   altoBarra  listaY   anchoDelete  xDelete  xClear');
  filas.forEach((r,i)=>console.log(`  ${String(i).padStart(2)}   ${String(r.alto).padStart(7)}  ${String(r.listaY).padStart(6)}  ${String(r.delW??'-').padStart(11)}  ${String(r.delX??'-').padStart(7)}  ${String(r.clrX??'-').padStart(6)}`));
  const altos=new Set(filas.map(r=>r.alto)), listas=new Set(filas.map(r=>r.listaY));
  const conBtn=filas.filter(r=>r.delW!==null);
  const anchos=new Set(conBtn.map(r=>r.delW)), xs=new Set(conBtn.map(r=>r.delX));
  /* EL HUECO DEL NÚMERO, MEDIDO APARTE. El ancho del BOTÓN no bastaba: tiene
     un ancho mínimo propio que lo mantenía en 97 px aunque el número creciera,
     así que esa comprobación pasaba incluso con el hueco roto. Lo comprobé
     rompiéndolo a propósito. Lo que de verdad cambia de tamaño de 9 a 10 es el
     hueco del número, y es eso lo que hay que medir. */
  const nums=new Set(conBtn.filter(r=>r.numW!==null).map(r=>r.numW));
  let fail=0;
  function check(q,ok,extra){ if(ok){console.log('  ok   '+q);} else {fail++;console.log('  ✗    '+q+'  →  '+JSON.stringify(extra));} }
  console.log('');
  check('la franja no cambia de alto, de 0 a 12 marcados', altos.size===1, [...altos]);
  check('...así que la lista de abajo nunca se mueve', listas.size===1, [...listas]);
  /* EL CASO DEL VÍDEO: de 9 a 10 el contador pasa de una cifra a dos. Con el
     número en un hueco de ancho fijo y cifras de ancho igual, el botón mide lo
     mismo con 9 que con 10. */
  check('el hueco del número mide lo mismo con 9 que con 10 — es el salto del vídeo',
    nums.size===1, [...nums]);
  check('...y por tanto el botón entero tampoco cambia de ancho',
    anchos.size===1, [...anchos]);
  check('...ni se mueve de sitio, ni siquiera al pasar de 1 a 2 — que es cuando ' +
        'Renombrar deja paso a Fusionar', xs.size===1, [...xs]);
  /* Y el desplegable donde se elige qué nombre se queda tiene que seguir
     siendo usable: estabilidad no puede significar aplastarlo. */
  await p.evaluate(()=>pinta(3)); await p.waitForTimeout(40);
  const anchoSel = await p.evaluate(()=>Math.round(document.querySelector('#bar select').getBoundingClientRect().width));
  check('y el desplegable sigue siendo ancho para leer un nombre', anchoSel >= 100, anchoSel);
  await b.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s)' : '✓ todo bien') + '\n');
  process.exit(fail?1:0);
})();
