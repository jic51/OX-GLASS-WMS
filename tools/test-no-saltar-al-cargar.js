// CARGAR MÁS NO PUEDE MOVERTE DE SITIO.
//
// Jose, 2026-10-04, con 1.065 movimientos delante:
//
//   "Cada vez que se pulsa el botón Load more se cargan los movimientos, pero la
//    vista siempre se va al final, al último movimiento de esos 75 recién
//    añadidos. La vista del usuario debe quedarse viendo los movimientos que ya
//    se veían y añadir los demás debajo, no debemos irnos hasta el último."
//
// La causa era una línea escrita a propósito, debajo de un comentario que
// prometía lo contrario de lo que hacía:
//
//     // Scroll to keep position near the new rows
//     if (tc) tc.scrollTop = tc.scrollHeight;
//
// `scrollHeight` es el fondo del todo.
//
// ── POR QUÉ ESTA PRUEBA ES DE NAVEGADOR Y MIDE PÍXELES ──────────────────────
//
// Porque lo que falla es una POSICIÓN, y una posición no se lee en el código: la
// línea mala está escrita, se lee perfectamente, y lo que no se ve leyéndola es
// dónde acabas tú. Una prueba que comprobara "ya no aparece scrollHeight" se
// pondría verde con cualquier otra forma de saltar —un scrollIntoView, un focus
// en el botón— y volveríamos a tener el mismo problema con la prueba en verde.
//
// Así que esto abre la app de verdad, baja a una fila concreta, pulsa el botón y
// MIDE si esa fila sigue a la misma altura de la pantalla.
//
// Uso:  node tools/test-no-saltar-al-cargar.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

const APP_VERSION = (html.match(/var APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || 'test';

/* 400 movimientos: más de las 75 de una página, para que el botón exista y
 * haya varias páginas que recorrer. Y con nombres numerados, para poder decir
 * QUÉ fila se estaba mirando y no sólo que había una. */
function movimientos(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push({
      rowIdx: i + 1, movId: 'M-' + i, moveType: (i % 3 === 0 ? 'EXIT' : 'ENTRY'),
      dateRec: '2026-08-01', category: 'WINDOW', name: 'MOV ' + String(i).padStart(4, '0'),
      qty: 10, unit: 'pcs', destLoc: 'A1A',
      timestamp: '2026-08-01 10:00', userEmail: 'jose@ox-glass.com'
    });
  }
  return out;
}

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'${APP_VERSION}', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:${JSON.stringify(movimientos(400))},
 stock:{ 'WINDOW|||GLASS': { name:'GLASS', category:'WINDOW', unit:'pcs', warehouseQty:10, siteQty:0,
   availableQty:10, wastedQty:0, reservedQty:0, matId:'WINDOW|||GLASS', warehouseLocs:{ 'A1A': 10 }, status:'OK' } },
 monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:[], suppliers:[],
   locations:[{name:'A1A',group:'RACKS'}], units:['pcs'] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;

html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-no-saltar.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));

  await page.goto('file://' + f);
  await page.waitForTimeout(350);
  await page.click('#btn-movements');
  await page.waitForTimeout(350);

  const filas = () => page.evaluate(() =>
    document.querySelectorAll('#tableContainer tbody tr').length);

  const primeras = await filas();
  check('se pintan 75 de las 400 — si no, no hay botón que probar',
        primeras === 75, primeras);

  /* BAJAR A MITAD DE LA LISTA, que es desde donde se pulsa en la vida real:
   * nadie pulsa "cargar más" sin haber llegado antes al final de lo que ve. */
  await page.evaluate(() => {
    const tc = document.getElementById('tableContainer');
    tc.scrollTop = Math.floor(tc.scrollHeight * 0.6);
  });
  await page.waitForTimeout(120);

  /* La fila que se está mirando, y DÓNDE está en la pantalla. Esto es lo que
   * tiene que seguir igual: no el scrollTop en abstracto, sino la fila que la
   * persona tiene delante de los ojos. */
  const antes = await page.evaluate(() => {
    const tc = document.getElementById('tableContainer');
    const cajaT = tc.getBoundingClientRect();
    const tr = Array.from(tc.querySelectorAll('tbody tr')).find(r => {
      const c = r.getBoundingClientRect();
      return c.top >= cajaT.top + 40 && c.top <= cajaT.bottom - 40;
    });
    return {
      scrollTop: tc.scrollTop,
      texto: tr ? tr.innerText.replace(/\s+/g, ' ').slice(0, 40) : null,
      top:   tr ? tr.getBoundingClientRect().top : null
    };
  });
  check('hay una fila concreta a la vista para vigilarla',
        !!antes.texto, antes);

  await page.evaluate(() => _loadMoreMovements());
  await page.waitForTimeout(350);

  const despues = await page.evaluate((txt) => {
    const tc = document.getElementById('tableContainer');
    const tr = Array.from(tc.querySelectorAll('tbody tr'))
      .find(r => r.innerText.replace(/\s+/g, ' ').slice(0, 40) === txt);
    return {
      scrollTop: tc.scrollTop,
      alFondo: tc.scrollTop >= tc.scrollHeight - tc.clientHeight - 2,
      top: tr ? tr.getBoundingClientRect().top : null,
      filas: tc.querySelectorAll('tbody tr').length
    };
  }, antes.texto);

  check('trajo otras 75', despues.filas === 150, despues.filas);

  /* LA MEDIDA. Dos píxeles de margen porque un repintado puede redondear
   * distinto; cualquier salto de verdad son cientos. */
  check('LA FILA QUE SE ESTABA MIRANDO SIGUE A LA MISMA ALTURA (' +
        (antes.top === null ? '?' : antes.top.toFixed(1)) + ' → ' +
        (despues.top === null ? 'desapareció' : despues.top.toFixed(1)) + ')',
        despues.top !== null && Math.abs(despues.top - antes.top) < 2,
        { antes: antes.top, despues: despues.top });

  /* Y el síntoma concreto que describió Jose, dicho tal cual: acabar al final
   * del todo. Es redundante con la anterior y se queda a propósito — es la
   * frase que él reconocería en el informe si volviera a pasar. */
  check('Y NO ACABA AL FINAL DE LA LISTA — "la vista siempre se va al final, ' +
        'al último movimiento de esos 75 recién añadidos"',
        !despues.alFondo, despues);

  /* ── EL SEGUNDO BOTÓN ─────────────────────────────────────────────────────
   * El histórico viejo hace crecer la MISMA lista, y arreglar uno solo deja al
   * otro sorprendiendo igual. Aquí se mide lo que hacía de más: volver a la
   * primera página, que escondía todo lo que el usuario ya había traído. */
  /* Y SE LLAMA AL BOTÓN DE VERDAD, no a un apaño que haga lo mismo. La primera
   * versión de esta comprobación invocaba `_repintarSinSaltar(renderMovements)`
   * a mano, que es exactamente lo que hace el manejador arreglado — así que
   * habría seguido en verde el día que alguien devolviera el `_movPage = 1` al
   * manejador. Una prueba que reconstruye lo que debería pasar en vez de
   * provocarlo mide su propia copia, no el producto. */
  const antesDelHistorico = await filas();
  await page.evaluate(() => _loadOlderHistoryClicked());
  await page.waitForTimeout(400);
  const trasHistorico = await filas();

  check('AL TRAER HISTÓRICO VIEJO NO SE ENCOGE LA LISTA — antes volvía a la ' +
        'página 1 y quien había pulsado "Load more" diez veces las perdía',
        trasHistorico >= antesDelHistorico,
        { antes: antesDelHistorico, despues: trasHistorico });

  check('y la página sigue sin errores de JavaScript', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
