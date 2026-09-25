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
  /* Los anchos se leen de MOV_COLS, que desde la v12.12 es el único sitio donde
   * viven. Antes esta prueba los buscaba en el CSS — y eso era parte del
   * problema: había DOS listas que tenían que decir lo mismo (las columnas en el
   * JavaScript, sus anchos en el CSS) y nada que lo obligara. */
  const MOV_COLS = (/var MOV_COLS = \[([\s\S]*?)\n\];/.exec(html) || [])[1] || '';
  const filas = MOV_COLS.split('\n').filter(l => /key:'/.test(l));
  const todasLasCols = filas.map(l => /key:'([a-zA-Z]+)'/.exec(l)[1]);
  const sinAncho = filas.filter(l => !/\bw:\s*\d+/.test(l))
                        .map(l => /key:'([a-zA-Z]+)'/.exec(l)[1]);

  check('la tabla reparte por reglas y no por contenido',
        /#tableContainer table\{[^}]*table-layout:fixed/.test(css));
  check('se leyeron las dieciséis columnas de Movements',
        todasLasCols.length === 16, todasLasCols.length);
  check('hay exactamente UNA columna sin ancho declarado', sinAncho.length === 1, sinAncho);
  check('...y es la del material, que es la que más varía y más se lee',
        sinAncho[0] === 'what', sinAncho);
  check('ningún ancho quedó suelto en el CSS, donde nadie lo sumaría',
        !/#tableContainer th\.mc-[a-zA-Z]+\{width:/.test(css));

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

  /* EL ESTADO MÁS APRETADO, Y ESO ES EL ARREGLO DE ESTA COMPROBACIÓN.
   *
   * Antes esta sección medía tal cual quedaba la tabla al terminar la sección 3
   * — o sea CON UNA COLUMNA ESCONDIDA, que le regala 86px al material. Medía el
   * caso cómodo y daba verde. Con las columnas de fábrica había 15 celdas
   * desbordadas y esta prueba no las veía. Es el mismo fallo de siempre: la
   * prueba miraba donde no dolía. */
  await page.evaluate(() => {
    localStorage.removeItem(_colCfg('mov').hiddenKey);   // vuelta a las de fábrica
    renderMovements();
  });
  await page.waitForTimeout(250);

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

  /* ══════════════════════════════════════════════════════════════════════════
   * 5. EL MATERIAL NUNCA SE QUEDA SIN SITIO — el fallo que Jose fotografió
   *
   * La v12.11 puso `min-width:1300px` en la tabla, un número escrito a mano. La
   * suma de los anchos declarados de las DIECISÉIS columnas es 1748. En cuanto
   * alguien enseñaba columnas con el ojo de "⚙ Columns", la suma pasaba de
   * 1300 y al material —la única elástica— le quedaba lo que sobrara, que era
   * NADA. Medido en la copia de OX de Jose: con Supplier enseñada, 4px de
   * ancho y filas de 428px de alto, el nombre dibujado una letra por renglón.
   *
   * Y le pasaba en su trabajo, no en un caso raro: le bastó ENSEÑAR UNA COLUMNA.
   *
   * Esto lo mide en los cuatro estados que importan, a dos anchos de ventana, y
   * por los DOS caminos que construyen la cabecera: `renderMovements`, que se
   * dibuja la tabla entera de una pieza, y `renderColHead`. Que sean dos es la
   * forma de fallo más repetida de este proyecto —una conducta enchufada en un
   * camino y no en los otros—, así que se comprueban por separado.
   * ══════════════════════════════════════════════════════════════════════════ */
  console.log('\n═══ 5. El material nunca se queda sin sitio ═══\n');

  const SUELO = Number((/var _MOV_MIN_WHAT = (\d+)/.exec(html) || [])[1] || 0);
  check('el suelo del material está declarado y es un número creíble',
        SUELO >= 150 && SUELO <= 400, SUELO);

  const ESTADOS = [
    ['de fábrica',            []],
    ['+ Supplier (lo de Jose)', ['supplier']],
    ['+ las cinco escondidas', ['supplier', 'rawLoc', 'gc', 'pm', 'sysDate']]
  ];

  for (const W of [960, 1600]) {
    const p = await browser.newPage({ viewport: { width: W, height: 900 } });
    p.on('pageerror', e => errores.push(e.message));
    await p.goto('file://' + pagina());
    await p.waitForTimeout(800);
    await p.evaluate(() => showTab('movements', 'btn-movements'));
    await p.waitForTimeout(300);

    for (const [nombre, mostrar] of ESTADOS) {
      await p.evaluate((m) => {
        // Por el camino de la persona: la lista de escondidas de su navegador.
        const l = _colHidden('mov').filter(k => m.indexOf(k) === -1);
        localStorage.setItem(_colCfg('mov').hiddenKey, JSON.stringify(l));
        renderMovements();
      }, mostrar);
      await p.waitForTimeout(220);
      const r = await p.evaluate(() => {
        const th = document.querySelector('#movHeadRow th.mc-what');
        let alto = 0;
        document.querySelectorAll('#tableContainer tbody tr').forEach(tr => {
          const h = tr.getBoundingClientRect().height; if (h > alto) alto = h;
        });
        return { w: th ? Math.round(th.getBoundingClientRect().width) : -1, alto: Math.round(alto) };
      });
      check('ventana ' + W + ', ' + nombre + ': el material conserva su sitio',
            r.w >= SUELO, r);
      /* El alto de fila es la otra cara de lo mismo y es lo que se VE: cuando la
       * columna se estruja, el texto se pone vertical y la fila se dispara a
       * 428px. Medirlo aparte hace que la prueba falle por el síntoma que Jose
       * fotografió, no sólo por el número que lo causa. */
      check('ventana ' + W + ', ' + nombre + ': las filas no se disparan de alto',
            r.alto > 0 && r.alto < 140, r);
    }

    // Y con el editor abierto, que es donde se ven las dieciséis a la vez.
    await p.evaluate(() => {
      localStorage.removeItem(_colCfg('mov').hiddenKey);
      renderMovements();
      toggleColEdit('mov');
    });
    await p.waitForTimeout(350);
    const ed = await p.evaluate(() => {
      const th = document.querySelector('#movHeadRow th.mc-what');
      let alto = 0;
      document.querySelectorAll('#tableContainer tbody tr').forEach(tr => {
        const h = tr.getBoundingClientRect().height; if (h > alto) alto = h;
      });
      return { w: th ? Math.round(th.getBoundingClientRect().width) : -1, alto: Math.round(alto),
               cols: document.querySelectorAll('#movHeadRow th').length };
    });
    check('ventana ' + W + ', editor abierto: se ven las dieciséis columnas',
          ed.cols >= 18, ed.cols);          // 16 + casilla + acciones
    check('ventana ' + W + ', editor abierto: el material conserva su sitio',
          ed.w >= SUELO, ed);
    check('ventana ' + W + ', editor abierto: las filas no se disparan de alto',
          ed.alto > 0 && ed.alto < 140, ed);

    // El OTRO camino: renderColHead, que redibuja sólo la cabecera.
    await p.evaluate(() => { toggleColEdit('mov'); renderColHead('mov'); });
    await p.waitForTimeout(250);
    const rc = await p.evaluate(() => {
      const th = document.querySelector('#movHeadRow th.mc-what');
      const tb = document.querySelector('#tableContainer table');
      return { w: th ? Math.round(th.getBoundingClientRect().width) : -1,
               min: tb ? tb.style.minWidth : '' };
    });
    check('ventana ' + W + ': renderColHead también fija el mínimo de la tabla',
          /^\d+px$/.test(rc.min) && rc.w >= SUELO, rc);

    await p.close();
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 6. EL EDITOR DE COLUMNAS — el ojo se ve, y lo fijo ni se mueve ni lo aparenta
   *
   * Jose, con vídeo (2026-09-25): *"no se muestra el botón del ojo al editar, o
   * queda debajo de la columna de al lado."* Era literal: la cabecera en
   * edición lleva asa, campo de nombre y ojo, y en Qty o Unit todo eso vivía en
   * 58px con `white-space:nowrap`. El ojo no se envolvía: se salía y la celda
   * vecina lo tapaba. El botón para esconder una columna era invisible justo en
   * las columnas más estrechas.
   *
   * Y lo otro que pidió: *"tampoco se debería poder cambiar o mover."* `lock`
   * significaba sólo "no se puede esconder" — las bloqueadas llevaban asa Y SE
   * ARRASTRABAN DE VERDAD. Ahora no se mueven, no se puede soltar nada encima,
   * y van pegadas al principio en su orden de fábrica.
   *
   * SE MIDE LA POSICIÓN DEL BOTÓN, no que exista. Que el `<button>` esté en el
   * HTML era cierto ANTES del arreglo, mientras Jose no podía pulsarlo.
   * ══════════════════════════════════════════════════════════════════════════ */
  console.log('\n═══ 6. El editor de columnas ═══\n');

  const EDIT_MIN = Number((/var _COL_EDIT_MIN = (\d+)/.exec(html) || [])[1] || 0);
  check('el ancho mínimo de una cabecera en edición está declarado',
        EDIT_MIN >= 100 && EDIT_MIN <= 300, EDIT_MIN);
  /* Si el suelo del material bajara de lo que miden los mandos, la elástica
   * —que en edición no lleva ancho— se quedaría sin sitio para su propio ojo.
   * Hoy 192 > 176; esto lo deja escrito para que nadie lo rompa sin enterarse. */
  check('el suelo del material cubre lo que miden los mandos del editor',
        SUELO >= EDIT_MIN, { SUELO, EDIT_MIN });

  for (const W of [960, 1600]) {
    const p = await browser.newPage({ viewport: { width: W, height: 900 } });
    p.on('pageerror', e => errores.push(e.message));
    await p.goto('file://' + pagina());
    await p.waitForTimeout(800);
    await p.evaluate(() => showTab('movements', 'btn-movements'));
    await p.waitForTimeout(300);
    await p.evaluate(() => toggleColEdit('mov'));
    await p.waitForTimeout(400);

    const e6 = await p.evaluate(() => {
      const fuera = [], conAsa = [], arrastrables = [];
      let ojos = 0, dentro = 0, candados = 0, fijas = 0, apretadas = [];
      const orden = [];
      document.querySelectorAll('#movHeadRow th.col-edit').forEach(th => {
        const k = th.getAttribute('data-col');
        orden.push(k);
        const rTh = th.getBoundingClientRect();
        const esFija = th.classList.contains('col-fija');
        if (esFija){
          fijas++;
          if (th.querySelector('.col-drag')) conAsa.push(k);
          if (th.getAttribute('draggable') !== 'false') arrastrables.push(k);
        }
        if (th.querySelector('.col-lock')) candados++;
        const ojo = th.querySelector('.col-eye');
        if (ojo){
          ojos++;
          const rO = ojo.getBoundingClientRect();
          // Dentro de su celda POR LOS CUATRO LADOS, y con tamaño real.
          if (rO.width > 0 && rO.height > 0 &&
              rO.right <= rTh.right + 0.5 && rO.left >= rTh.left - 0.5) dentro++;
          else fuera.push(k + ' se sale ' + Math.round(rO.right - rTh.right) + 'px');
        }
        if (th.scrollWidth > th.clientWidth + 1) apretadas.push(k);
      });
      const cand = document.querySelector('#movHeadRow .col-lock');
      return { ojos, dentro, fuera: fuera.slice(0,6), candados, fijas, conAsa,
               arrastrables, apretadas: apretadas.slice(0,6), orden,
               tieneAyuda: !!(cand && (cand.getAttribute('data-tip') || '').length > 20) };
    });

    check('ventana ' + W + ': se abrieron las dieciséis con sus mandos',
          e6.ojos + e6.candados === 16, e6);
    check('ventana ' + W + ': TODOS los ojos caben dentro de su celda' +
          (e6.fuera.length ? ' — SE SALEN: ' + e6.fuera.join('; ') : ''),
          e6.ojos > 0 && e6.dentro === e6.ojos, { ojos: e6.ojos, dentro: e6.dentro });
    check('ventana ' + W + ': ninguna cabecera va más apretada que sus mandos' +
          (e6.apretadas.length ? ' — APRETADAS: ' + e6.apretadas.join(', ') : ''),
          e6.apretadas.length === 0);
    check('ventana ' + W + ': las tres bloqueadas se ven como un bloque aparte',
          e6.fijas === 3, e6.fijas);
    check('ventana ' + W + ': ninguna bloqueada ofrece asa de arrastre',
          e6.conAsa.length === 0, e6.conAsa);
    check('ventana ' + W + ': ...y ninguna es arrastrable de verdad — quitar el ' +
          'asa sola no bastaba, `draggable` es del elemento entero',
          e6.arrastrables.length === 0, e6.arrastrables);
    check('ventana ' + W + ': el candado explica POR QUÉ, no sólo que lo está',
          e6.tieneAyuda);
    check('ventana ' + W + ': las bloqueadas van pegadas al principio',
          e6.orden.slice(0, 3).join(',') === 'when,what,qty', e6.orden.slice(0, 5));

    await p.close();
  }

  /* Y que el orden guardado NO pueda dejar una bloqueada en medio: alguien que
   * ya la hubiera movido —se podía— tiene ese orden en su navegador ahora mismo. */
  const pOrden = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  pOrden.on('pageerror', e => errores.push(e.message));
  await pOrden.goto('file://' + pagina());
  await pOrden.waitForTimeout(800);
  await pOrden.evaluate(() => showTab('movements', 'btn-movements'));
  await pOrden.waitForTimeout(300);
  const reparado = await pOrden.evaluate(() => {
    // Un orden como el que tendría quien arrastró Category/Name al final.
    localStorage.setItem(_colCfg('mov').orderKey, JSON.stringify(
      ['unit', 'po', 'when', 'locFlow', 'project', 'qty', 'resp', 'comment',
       'user', 'doc', 'rawLoc', 'gc', 'supplier', 'pm', 'sysDate', 'what']));
    renderMovements();
    return _colOrder('mov');
  });
  check('un orden guardado con las bloqueadas desperdigadas se normaliza solo',
        reparado.slice(0, 3).join(',') === 'when,what,qty', reparado.slice(0, 6));
  check('...sin perder ninguna columna por el camino',
        reparado.length === 16 && new Set(reparado).size === 16, reparado.length);
  await pOrden.close();

  /* LA MUTACIÓN QUE TIENE QUE MATAR ESTA PRUEBA: devolver el mínimo a un número
   * fijo. Se comprueba que el código NO lo lleva escrito, porque un `min-width`
   * en el CSS de la tabla volvería a ser un número que no sabe cuántas columnas
   * hay a la vista — que es exactamente el fallo de la v12.11. */
  check('el mínimo de la tabla se calcula, no está escrito en el CSS',
        !/#tableContainer table\{[^}]*min-width:/.test(css));
  check('...y se calcula sumando los anchos que SE VEN',
        /_fijarMinTabla/.test(html) && /_anchoDeclarado/.test(html));

  check('y la página no tiró ningún error', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
  process.exit(fail ? 1 : 0);
})();
