// LAS COLUMNAS NO SE MUEVEN AL CAMBIAR DE FILTRO.
//
// Jose, 2026-09-22, con dos vídeos:
//
//   "Quiero quitar todos los saltos que da la pantalla y dejar cada cosa en su
//    propio lugar sin que tengan que moverse todas. Cuando cambio de categoría,
//    todas las columnas se mueven horizontalmente, porque no tienen su espacio
//    fijo sino que están condicionadas a la cantidad de caracteres y tamaño de
//    letra."
//
// Su diagnóstico es exacto, y lo midió el ojo antes que esta prueba: sobre los
// fotogramas de su vídeo, la columna `Project` empezaba en x=476 con el filtro
// Return, en x=1318 con SCREEN y en x=415 con MIRROR. **Casi 900px de
// diferencia por mirar otra categoría.** En una tabla así no se puede aprender
// dónde mirar: cada filtro es una pantalla nueva.
//
// ── POR QUÉ ESTA PRUEBA ABRE UN NAVEGADOR ───────────────────────────────────
//
// Porque lo que hay que comprobar es una POSICIÓN, y una posición no está
// escrita en ninguna parte: sale de que el navegador reparta el ancho. Se puede
// declarar `table-layout:fixed` en el CSS y que no aplique —otra regla más
// específica, un `max-width` en la celda, una columna elástica de más— y el
// archivo seguiría diciendo lo correcto. La única forma honesta de preguntar
// "¿se movió?" es dibujarlo dos veces y comparar.
//
// ── LO QUE SE MIDE ──────────────────────────────────────────────────────────
//
//   1. Con siete filtros distintos, que la x y el ancho de CADA columna sean
//      idénticos. Es la queja de Jose, medida.
//   2. Que haya EXACTAMENTE UNA columna elástica, y que sea la del material.
//      Con dos, el hueco se reparte a medias y el nombre se queda sin sitio —
//      pasó: la columna de los botones era la segunda, y el material bajaba de
//      216px a 100px.
//   3. Que esconder una columna no cambie el ancho de ninguna otra.
//   4. Que nada se salga de su columna. Ancho fijo sin esto es recortar datos.
//
// Uso:  CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-columnas.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* Los datos imitan el almacén de Jose en lo único que importa aquí: que el
 * LARGO del texto varíe mucho entre categorías. Una categoría de tres letras
 * junto a `IGU (ISOLATED GLASS UNIT)`, nombres de seis caracteres junto a
 * `DAL-KotterRed-OA-TT-090926`, y obras con y sin nombre. Con datos parejos
 * esta prueba pasaría incluso con la tabla rota. */
const CATS = ['WINDOW', 'SCREEN', 'IGU (ISOLATED GLASS UNIT)', 'MIRROR', 'FLASHING PAPER'];
const NOMBRES = ['MH 159', 'GHH-SCENICMTN-P2,5P-TT', 'CLINTON RES SCREEN',
  'M-LGI-OQU173,186,201', 'DAL-KotterRed-OA-TT-090926', '44 NORTH', 'TOL MH146',
  'WINDOW SCREEN', 'PAT-SEI912-AA-9.9.26', 'M-LIBERTYWELLS-CO- JL',
  'EDISON IGU ORDER 5', 'SP 654 BROOKE'];
const PROY = ['', 'GHH SCENIC MOUNTAIN', 'DAL CLINTON RESIDENCE',
              'LIBERTY WELLS TOWNHOMES', 'GENERIC', 'HH PROVO REMODEL'];
const PROV = ['AMSCO', 'ALSIDE', 'HARTUNG', 'MILGARD', '', ''];
const LOCS = ['C1B', 'A1B → ALVIN JENSON', 'MIRRORS/SHOWERS WAREHOUSE', 'B1B', 'P4C', 'C2A → A'];

const movs = [];
for (let i = 0; i < 220; i++) {
  movs.push({
    rowIdx: i + 2, movementId: 'M' + i,
    moveType: ['ENTRY', 'EXIT', 'TRANSFER', 'RETURN', 'WASTE'][i % 5],
    /* La categoría cambia cada CINCO movimientos y el tipo cada uno, para que
     * las dos listas no queden emparejadas. Con `CATS[i % 5]` y el tipo también
     * cada 5, la categoría MIRROR salía SIEMPRE con el tipo RETURN — y entonces
     * filtrar por MIRROR y filtrar por RETURN daban la misma tabla, con lo que
     * la comprobación de contraste de abajo fallaba sin que hubiera nada mal en
     * el producto. */
    category: CATS[Math.floor(i / 5) % CATS.length], name: NOMBRES[i % NOMBRES.length],
    qty: (i % 40) + 1, unit: 'UNIT',
    po: ['', '09-677', 'L388', '2444540', '07-6329'][i % 5],
    dateRec: '2026-09-' + String((i % 28) + 1).padStart(2, '0'),
    sourceLoc: i % 2 ? LOCS[i % LOCS.length] : '',
    destLoc: LOCS[(i + 2) % LOCS.length],
    project: PROY[i % PROY.length], supplier: PROV[i % PROV.length],
    responsible: ['JOSE', 'ALVIN JENSON', 'Adam Allred', ''][i % 4],
    comments: ['', 'A-FRAME', 'WHITE WINDOW SCREENS, DIFFERENT SIZES'][i % 3],
    pm: '', gc: '', userEmail: 'joseisrael5101@gmail.com', docLinks: '',
    unitCost: '', totalCost: ''
  });
}

const DATA = {
  userRole:'ADMIN', userEmail:'jose@ox.com', userName:'Jose Castro', serverVersion:'test',
  company:{ name:'OX Glass LLC.' }, movements: movs, stock:{}, materialLocks:[],
  monitoredMaterials:null,
  config:{ categories: CATS, projects: PROY.filter(Boolean), suppliers: PROV.filter(Boolean),
           locations:[{ name:'A1A', type:'RACK' }], units:['UNIT'] },
  incoming:[], rackPhotos:{}, systemActivity:[],
  rolePerms:{ canSeeCosts:true, canEditMovements:true, canManageCatalog:true, canExportData:true },
  warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:''
};

function pagina(){
  const stub = `<script>
window.google=window.google||{};window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){return window.google.script.run;}
 var ok=t._ok;
 if(k==='getInitialData'){setTimeout(function(){ok&&ok(window.__DATA);},20);return;}
 setTimeout(function(){ok&&ok({});},10);};}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-cols-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
  return f;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + pagina());
  await page.waitForTimeout(900);
  await page.evaluate(() => showTab('movements', 'btn-movements'));
  await page.waitForTimeout(400);

  await page.evaluate(`window.__leerCols = function () {
    const out = {};
    document.querySelectorAll('#movHeadRow th').forEach(function (th) {
      const m = String(th.className).match(/mc-([a-zA-Z]+)/);
      const k = m ? m[1] : (th.querySelector('input') ? '(casillas)' : '(acciones)');
      const r = th.getBoundingClientRect();
      out[k] = { x: Math.round(r.left), w: Math.round(r.width) };
    });
    return out;
  };`);

  const conFiltro = async (tf, cf) => {
    await page.evaluate(([a, b]) => {
      document.getElementById('movTypeFilter').value = a;
      document.getElementById('movCatFilter').value = b;
      renderMovements();
    }, [tf, cf]);
    await page.waitForTimeout(220);
    return page.evaluate(() => window.__leerCols());
  };

  console.log('\n═══ 1. Siete filtros, ni una columna se mueve ═══\n');

  const FILTROS = [['', ''], ['', 'SCREEN'], ['', 'IGU (ISOLATED GLASS UNIT)'],
                   ['', 'MIRROR'], ['RETURN', ''], ['EXIT', ''], ['', 'FLASHING PAPER']];
  const tomas = {};
  for (const [tf, cf] of FILTROS) tomas[(tf || 'todos') + '/' + (cf || 'todas')] = await conFiltro(tf, cf);

  const base = tomas[Object.keys(tomas)[0]];
  const claves = Object.keys(base);
  check('se midieron las columnas de la tabla', claves.length >= 10, claves.length);

  const movidas = [];
  claves.forEach(k => {
    const xs = [], ws = [];
    Object.values(tomas).forEach(t => { if (t[k]) { xs.push(t[k].x); ws.push(t[k].w); } });
    const dx = Math.max(...xs) - Math.min(...xs);
    const dw = Math.max(...ws) - Math.min(...ws);
    if (dx > 1 || dw > 1) movidas.push(k + ' (x±' + dx + ', ancho±' + dw + ')');
  });
  check('NINGUNA COLUMNA CAMBIA DE SITIO NI DE ANCHO al cambiar de filtro — ' +
        'ésta es la queja de Jose, medida' +
        (movidas.length ? ' — SE MUEVEN: ' + movidas.join('; ') : ''),
        movidas.length === 0);

  // Y que el contraste existe: si los datos fueran parejos, lo de arriba
  // pasaría con la tabla rota. Los filtros tienen que producir filas distintas.
  /* Y QUE EL CONTRASTE EXISTA: si los datos fueran parejos, lo de arriba
   * pasaría con la tabla rota. Se compara el CONTENIDO de la tabla, no cuántas
   * filas tiene — la primera versión contaba filas y dos filtros distintos
   * dieron 44 y 44 por el tamaño de página, así que la comprobación fallaba
   * sin que hubiera nada mal. */
  const huellas = {};
  for (const [tf, cf] of [['', ''], ['', 'MIRROR'], ['RETURN', '']]) {
    await page.evaluate(([a, b]) => {
      document.getElementById('movTypeFilter').value = a;
      document.getElementById('movCatFilter').value = b;
      renderMovements();
    }, [tf, cf]);
    await page.waitForTimeout(200);
    // La huella es la tabla ENTERA. Recortarla a los primeros 400 caracteres
    // hacía que dos filtros distintos parecieran iguales sólo porque las
    // primeras filas coincidían — la tabla va de lo más nuevo a lo más viejo,
    // así que las de arriba se repiten entre filtros con facilidad.
    huellas[(tf || 'todos') + '/' + (cf || 'todas')] = await page.evaluate(() =>
      Array.prototype.map.call(document.querySelectorAll('#tableContainer tbody tr'),
        tr => tr.textContent.replace(/\s+/g, ' ').trim()).join('|'));
  }
  check('los filtros producen tablas MUY distintas — si no, no se estaría ' +
        'midiendo nada', new Set(Object.values(huellas)).size === 3,
        Object.keys(huellas).map(k => k + ': ' + huellas[k].length + ' car.'));

  console.log('\n═══ 2. Una sola columna elástica, y es la del material ═══\n');

  await page.evaluate(() => {
    document.getElementById('movTypeFilter').value = '';
    document.getElementById('movCatFilter').value = '';
    renderMovements();
  });
  await page.waitForTimeout(250);

  const css = (html.match(/<style>([\s\S]*?)<\/style>/g) || []).join('\n');
  const declarados = (css.match(/#tableContainer th\.mc-([a-zA-Z]+)\{width:/g) || [])
    .map(s => /mc-([a-zA-Z]+)/.exec(s)[1]);
  const MOV_COLS = (/var MOV_COLS = \[([\s\S]*?)\];/.exec(html) || [])[1] || '';
  const todasLasCols = (MOV_COLS.match(/key:'([a-zA-Z]+)'/g) || []).map(s => /'([a-zA-Z]+)'/.exec(s)[1]);
  const sinAncho = todasLasCols.filter(k => declarados.indexOf(k) === -1);

  check('la tabla reparte por reglas y no por contenido',
        /#tableContainer table\{[^}]*table-layout:fixed/.test(css));
  check('hay exactamente UNA columna sin ancho declarado', sinAncho.length === 1, sinAncho);
  check('...y es la del material, que es la que más varía y más se lee',
        sinAncho[0] === 'what', sinAncho);

  const anchos = await page.evaluate(() => window.__leerCols());
  check('la columna de acciones también lleva ancho — si no, se reparte el ' +
        'hueco con el material a medias', anchos['(acciones)'] &&
        anchos['(acciones)'].w > 0 && anchos['(acciones)'].w < 80,
        anchos['(acciones)']);
  check('y al material le queda sitio de verdad', anchos.what && anchos.what.w >= 180,
        anchos.what);

  console.log('\n═══ 3. Esconder una columna no cambia el ancho de las demás ═══\n');

  const antes = await page.evaluate(() => window.__leerCols());
  await page.evaluate(() => {
    // Por el camino que usa la persona: la lista de escondidas del navegador.
    var l = _colHidden('mov').slice();
    l.push('po');
    localStorage.setItem(_colCfg('mov').hiddenKey, JSON.stringify(l));
    renderMovements();
  });
  await page.waitForTimeout(250);
  const despues = await page.evaluate(() => window.__leerCols());

  check('la columna escondida desaparece', !despues.po, despues.po);
  const cambiadas = Object.keys(antes).filter(k =>
    k !== 'po' && k !== 'what' && despues[k] && despues[k].w !== antes[k].w)
    .map(k => k + ' ' + antes[k].w + '→' + despues[k].w);
  check('...y ninguna otra columna cambia de ancho' +
        (cambiadas.length ? ' — CAMBIAN: ' + cambiadas.join('; ') : ''),
        cambiadas.length === 0);
  check('el hueco se lo queda el material, que para eso es la elástica',
        despues.what.w > antes.what.w,
        { antes: antes.what.w, despues: despues.what.w });

  console.log('\n═══ 4. Nada se sale de su columna ═══\n');

  /* EL COMENTARIO ES LA EXCEPCIÓN, y ya lo era antes de esto: se recorta con
   * puntos suspensivos y lleva el texto entero en la ayuda al pasar el ratón.
   * Es texto libre de una persona y puede tener doscientas palabras; darle
   * columna para todas sería quitársela a lo que se lee siempre. Las demás se
   * parten, que es la regla que Jose fijó para la tira de reservas. */
  const desbordan = await page.evaluate(() => {
    const malas = [];
    document.querySelectorAll('#tableContainer tbody td').forEach(function (td) {
      if (td.classList.contains('mc-comment')) return;
      if (td.scrollWidth > td.clientWidth + 1) {
        const k = (String(td.className).match(/mc-([a-zA-Z]+)/) || [])[1] || '?';
        malas.push(k + ': ' + td.textContent.trim().slice(0, 28));
      }
    });
    return malas.slice(0, 8);
  });
  check('ninguna celda se sale de su columna' +
        (desbordan.length ? ' — SE SALEN: ' + desbordan.join('; ') : ''),
        desbordan.length === 0);

  const comentario = await page.evaluate(() => {
    const td = document.querySelector('#tableContainer td.mc-comment[title]:not([title=""])');
    return td ? { recorta: getComputedStyle(td).textOverflow === 'ellipsis',
                  ayuda: (td.getAttribute('title') || '').length > 0 } : null;
  });
  check('el comentario, que sí se recorta, conserva su ayuda con el texto entero',
        comentario && comentario.recorta && comentario.ayuda, comentario);

  check('y la página no tiró ningún error', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
  process.exit(fail ? 1 : 0);
})();
