// UNA COLUMNA DONDE TODAS LAS FILAS DICEN LO MISMO NO ES INFORMACIÓN, ES MARGEN.
//
// Idea de Jose, 2026-09-09:
//
//   "si al seleccionar un material en 'All Categories' en específico ya sabemos
//    que solo nos mostrará ese material… solo en ese caso podemos eliminar la
//    columna de category y poner la category arriba donde se vea bien, y
//    eliminamos ese espacio haciendo la lista más pequeña horizontalmente."
//
// Es el mismo razonamiento que la v11.61 aplicó a Movements, y es correcto: con
// el filtro puesto en una categoría concreta, la columna Category repite el
// mismo texto en TODAS las filas.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que la columna DESAPAREZCA de verdad al elegir una categoría — cabecera
//      y celdas, no una sola de las dos, que es como se descuadra una tabla.
//   2. Que la tabla se estreche DE VERDAD. Es el punto entero de la idea, y es
//      lo único que no se puede comprobar leyendo el código: se mide en píxeles.
//   3. Que vuelva sola al quitar el filtro. Nadie tiene que ir a "Columns" a
//      recuperar algo que él no escondió.
//   4. Que el ORDEN GUARDADO de cada persona no se toque. Esconder no es
//      ocultar: si esto guardara la columna como oculta, volver a "All
//      Categories" no la traería de vuelta y sería una pérdida silenciosa.
//   5. Que en MODO EDICIÓN se vea siempre. No se puede reordenar lo que no
//      está, y quien abra el editor con un filtro puesto tiene que ver su tabla
//      entera, no la de este instante.
//   6. Que la categoría se diga UNA vez en el título, con el nombre tal como se
//      escribió — no con la forma normalizada que usa el filtro por dentro.
//
// Uso:  node tools/test-stock-cat-column.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function mat(cat, name, wh){
  return { matId: cat.toLowerCase() + '|||' + name.toLowerCase(), name: name, category: cat,
           project: '', unit: 'UNIT', warehouseQty: wh, siteQty: 0, availableQty: wh,
           wastedQty: 0, reservedQty: 0, totalQty: wh, warehouseLocs: { A1A: wh }, status: 'OK' };
}

const DATA = {
  userRole: 'ADMIN', userEmail: 'jose@ox.com', userName: 'Jose', serverVersion: 'test',
  company: { name: 'OX Glass LLC.' }, movements: [],
  stock: {
    'window|||mh 145':   mat('WINDOW', 'MH 145', 120),
    'window|||mh 200':   mat('WINDOW', 'MH 200', 80),
    'sealant/caulk|||rain buster 444': mat('SEALANT/CAULK', 'RAIN BUSTER 444', 300)
  },
  monitoredMaterials: null,
  config: { categories: ['WINDOW', 'SEALANT/CAULK'], projects: [], suppliers: [],
            locations: [{ name: 'A1A', type: 'RACK' }], units: ['UNIT'] },
  incoming: [], rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts: false, canEditMovements: true, canManageCatalog: true, canExportData: true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId: '', oauthRedirectUri: ''
};

const stub = `<script>
window.google=window.google||{}; window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'ac-stock-cat.html');
fs.writeFileSync(f, html);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  /* ESTRECHA A PROPÓSITO.
   *
   * Con la ventana ancha la tabla CABE, así que quitar una columna no la
   * encoge: las demás se reparten el hueco y el ancho total no se mueve. La
   * primera versión de esta prueba medía eso y decía "no se estrecha" sobre
   * código correcto — medía un caso en el que la idea no tiene nada que hacer.
   *
   * Lo que Jose pidió es "que la pantalla no se haga muy larga
   * horizontalmente", o sea: menos scroll lateral. Eso sólo se puede medir
   * donde HAY scroll lateral. */
  const page = await browser.newPage({ viewport: { width: 760, height: 900 } });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(600);

  // El filtro se llena desde config; se comprueba que la opción exista antes de
  // elegirla, o el resto de la prueba mediría una tabla sin filtrar.
  const opciones = await page.evaluate(() =>
    Array.prototype.map.call(document.querySelectorAll('#stockFilter option'), o => o.value));
  check('el filtro ofrece las categorías de los datos', opciones.length >= 3, opciones);

  async function foto(){
    return page.evaluate(() => {
      const th = Array.prototype.map.call(
        document.querySelectorAll('#stockHeadRow th'), t => (t.className || '') + '|' + t.textContent.trim());
      const fila = document.querySelector('#stockBody tr');
      const tabla = document.querySelector('#stockBody').closest('table');
      const badge = document.getElementById('stockCatBadge');
      return {
        cabeceras: th,
        tieneCategoryTh: th.some(t => /sc-category/.test(t)),
        celdas: fila ? fila.querySelectorAll('td').length : 0,
        tieneCategoryTd: !!(fila && fila.querySelector('td.sc-category')),
        // scrollWidth, no el ancho visible: el visible lo fija el contenedor y
        // no cambia nunca. Lo que encoge es lo que la tabla NECESITA, que es
        // exactamente el scroll lateral del que se quejaba Jose.
        ancho: Math.round(tabla.scrollWidth),
        desborda: tabla.scrollWidth > tabla.parentElement.clientWidth + 1,
        filas: document.querySelectorAll('#stockBody tr[data-row-id]').length,
        badgeVisible: !!(badge && !badge.hidden),
        badgeTexto: badge ? badge.textContent : null,
        guardado: (function(){ try { return localStorage.getItem('acopio_cols_hidden_stock'); } catch(e){ return null; } })()
      };
    });
  }

  console.log('\n═══ con "All Categories": la columna está ═══\n');
  const todas = await foto();
  check('la cabecera Category está',      todas.tieneCategoryTh === true);
  check('y la celda también',             todas.tieneCategoryTd === true);
  check('se ven los tres materiales',     todas.filas === 3, todas.filas);
  check('y el título no dice ninguna categoría', todas.badgeVisible === false);
  check('LA TABLA SE SALE DE SU CONTENEDOR — sin esto, lo de abajo no mediría ' +
        'nada: quitar una columna de una tabla que ya cabe no la encoge, sólo ' +
        'reparte el hueco entre las demás',
        todas.desborda === true, { ancho: todas.ancho });

  console.log('\n═══ elegida WINDOW: la columna se va ═══\n');
  await page.selectOption('#stockFilter', { index: 1 });
  await page.waitForTimeout(200);
  const una = await foto();

  check('la cabecera Category YA NO ESTÁ',  una.tieneCategoryTh === false, una.cabeceras);
  check('y la celda tampoco — las dos, o la tabla se descuadra',
        una.tieneCategoryTd === false);
  check('la fila tiene una celda menos que antes',
        una.celdas === todas.celdas - 1, { antes: todas.celdas, ahora: una.celdas });
  check('sólo quedan los de esa categoría', una.filas === 2, una.filas);

  // ESTO es la idea de Jose, y es lo único que no se puede leer en el código.
  check('LA TABLA NECESITA MENOS ANCHO (' + todas.ancho + 'px → ' + una.ancho +
        'px) — que es la idea entera: menos scroll lateral',
        una.ancho < todas.ancho, { antes: todas.ancho, ahora: una.ancho });

  console.log('\n═══ y la categoría se dice una vez, arriba ═══\n');
  check('el título la enseña',            una.badgeVisible === true);
  check('con el nombre tal como se escribió, no la forma normalizada del filtro',
        una.badgeTexto === 'WINDOW', una.badgeTexto);

  // Una categoría con caracteres que nt() cambia: el título tiene que decir el
  // nombre de verdad, no "sealant/caulk".
  await page.selectOption('#stockFilter', { index: 2 });
  await page.waitForTimeout(200);
  const otra = await foto();
  check('y con una categoría con barra dentro, también',
        otra.badgeTexto === 'SEALANT/CAULK', otra.badgeTexto);

  console.log('\n═══ vuelve sola, y sin haber tocado nada de nadie ═══\n');
  await page.selectOption('#stockFilter', { index: 0 });   // All Categories
  await page.waitForTimeout(200);
  const vuelta = await foto();

  check('la columna vuelve al quitar el filtro',   vuelta.tieneCategoryTh === true);
  check('y la celda con ella',                     vuelta.tieneCategoryTd === true);
  check('la tabla recupera su ancho',              vuelta.ancho === todas.ancho,
        { antes: todas.ancho, ahora: vuelta.ancho });
  check('el título vuelve a callar',               vuelta.badgeVisible === false);
  check('EL ORDEN GUARDADO DE ESTA PERSONA NO SE TOCÓ — si esto la hubiera ' +
        'guardado como oculta, quitar el filtro no la traería de vuelta',
        vuelta.guardado === todas.guardado, { antes: todas.guardado, ahora: vuelta.guardado });

  console.log('\n═══ en modo edición se ve siempre ═══\n');
  await page.selectOption('#stockFilter', { index: 1 });
  await page.waitForTimeout(200);
  await page.click('#btnEditCols_stock');
  await page.waitForTimeout(250);
  const editando = await page.evaluate(() => ({
    tieneCategoryTh: !!document.querySelector('#stockHeadRow th.sc-category'),
    editables: document.querySelectorAll('#stockHeadRow th.col-edit').length
  }));
  check('el editor está abierto',  editando.editables > 0, editando);
  check('CON EL FILTRO PUESTO, el editor sigue enseñando Category — no se puede ' +
        'reordenar lo que no está', editando.tieneCategoryTh === true);

  await page.click('#btnEditCols_stock');   // cerrar
  await page.waitForTimeout(200);
  const cerrado = await foto();
  check('al cerrar el editor vuelve a esconderse', cerrado.tieneCategoryTh === false);

  check('sin errores de página', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
