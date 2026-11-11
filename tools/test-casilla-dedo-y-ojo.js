// LA CASILLA: LO QUE SE VE Y LO QUE SE PUEDE TOCAR NO SON LO MISMO.
//
// Jose, 10/11, con capturas de DOS teléfonos distintos: *"no sé por qué el
// checkbox es tan grande."*
//
// Medido, era peor que grande: **34 × 34 px dentro de una celda de 30**. Se
// salía cuatro píxeles y se montaba encima de la fecha.
//
// ── Y EL ERROR DE FONDO ERA MÍO, DE UN ARREGLO ANTERIOR ───────────────────
//
// N-15 encontró que las casillas medían 13 px —el tamaño por defecto del
// navegador, el que sale cuando nadie decide nada— donde Apple pide 44. El
// arreglo fue agrandar LA CASILLA, y ahí estuvo el fallo: lo que N-15 pedía
// era un ÁREA DE TOQUE. No es lo mismo. Una casilla nativa estirada a 34 px
// no se lee como una casilla grande; se lee como un cuadro vacío.
//
// Lo que esta prueba sujeta son LAS DOS COSAS A LA VEZ, porque arreglar una
// rompiendo la otra es como llegamos hasta aquí:
//
//     lo que se VE    ≈ 20 px  (se lee como una casilla)
//     lo que se TOCA  ≥ 44 px  (Apple pide 44, Android 48)
//     y la casilla NO se sale de su celda
//
// Se mide en tres teléfonos de verdad porque el reparto depende del ancho, y
// una regla de CSS que diga 20 px no demuestra dónde acaba la caja.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=... node tools/test-casilla-dedo-y-ojo.js

const fs=require('fs'), path=require('path'), os=require('os');
const { chromium, devices } = require('playwright');
/* Desde ESTE fichero, nunca una ruta absoluta: una prueba que no se puede
 * ejecutar contra otra copia no se puede verificar. */
const RAIZ = path.join(__dirname, '..');
const html=fs.readFileSync(path.join(RAIZ,'Index_v3_fixed.html'),'utf8');
const css=(html.match(/<style>[\s\S]*?<\/style>/g)||[]).join('\n');
const filas=[
 ['EXIT','WINDOW','4963 PONDEROSA','-14','2026-11-09'],
 ['ENTRY','IGU (ISOLATED GLASS UNIT)','IGU.PARANAIBASILVA','+1','2026-11-06'],
 ['ENTRY','MIRROR','M.MTNRIDGE.BB','+125','2026-11-06']];
const page=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head>
<body style="margin:0"><div id="tableContainer" style="overflow:auto">
<table class="data-table"><thead><tr>
<th class="mov-sel-cell"><label class="sel-hit"><input type="checkbox" id="movSelAll"></label></th>
<th>TYPE / DATE</th><th>CATEGORY / NAME</th><th>QTY</th></tr></thead><tbody>
${filas.map((f,i)=>`<tr><td class="mov-sel-cell"><label class="sel-hit"><input type="checkbox" class="mov-select-cb" data-movid="M${i}"></label></td>
<td><span class="badge">${f[0]}</span><br>${f[4]}</td><td>${f[1]}<br><b>${f[2]}</b></td><td>${f[3]}</td></tr>`).join('')}
</tbody></table></div></body></html>`;
const f=path.join(os.tmpdir(),'chk-'+Math.random().toString(36).slice(2)+'.html');
fs.writeFileSync(f,page);
let fail = 0;
function check(q, ok, extra){
  if (ok){ console.log('  ok   ' + q); return; }
  fail++; console.log('  ✗    ' + q + '  →  ' + JSON.stringify(extra));
}

(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH});
  for (const d of ['Galaxy S9+','iPhone 12','Pixel 5']){
    const ctx=await b.newContext({...devices[d]});
    const p=await ctx.newPage(); await p.goto('file://'+f); await p.waitForTimeout(120);
    const r=await p.evaluate(()=>{
      const cb=document.querySelector('.mov-select-cb'), td=cb.closest('td');
      const hit=cb.closest('.sel-hit');
      const th=document.querySelector('thead th');
      const rb=cb.getBoundingClientRect(), tb=td.getBoundingClientRect();
      const hb=hit.getBoundingClientRect();
      return {hit:[Math.round(hb.width),Math.round(hb.height)],
              cb:[Math.round(rb.width),Math.round(rb.height)],
              celda:[Math.round(tb.width),Math.round(tb.height)],
              th:Math.round(th.getBoundingClientRect().width),
              seSale: rb.right > tb.right+0.5 || rb.bottom > tb.bottom+0.5};
    });
    console.log(`  ${d.padEnd(12)} casilla ${r.cb[0]}×${r.cb[1]}  área táctil ${r.hit[0]}×${r.hit[1]}  celda ${r.celda[0]}`);
    check(d + ': la casilla se lee como una casilla, no como un cuadro vacío',
      r.cb[0] >= 14 && r.cb[0] <= 24, r.cb);
    check(d + ': ...y el sitio donde se puede tocar llega a 44',
      r.hit[0] >= 44 && r.hit[1] >= 44, r.hit);
    check(d + ': ...y no se sale de su celda, que es lo que tapaba la fecha',
      !r.seSale, { casilla: r.cb, celda: r.celda });
    await ctx.close();
  }
  await b.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s)' : '✓ todo bien') + '\n');
  process.exit(fail ? 1 : 0);
})();


