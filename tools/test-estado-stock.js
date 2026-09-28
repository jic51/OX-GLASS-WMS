// EL FILTRO DE ESTADO TIENE QUE DECIR LO MISMO QUE LA INSIGNIA.
//
// Jose, con vídeo (2026-09-22): *"en la app sólo se puede filtrar por 2 estados
// (zero stock e in stock) y por todo, pero en la app existen también los estados
// at site y reserved, así que hay un fallo ahí."*
//
// Tenía razón, y al arreglarlo apareció que eran TRES fallos y no dos:
//
//   1. Faltaba `Reserved` en el desplegable.
//   2. Faltaba `All at Site`.
//   3. Y "In Stock only" NO significaba lo mismo que la insignia verde:
//      filtraba por `warehouseQty > 0`, que incluye a las `Reserved` — material
//      que está en el estante pero que NO se puede sacar. Quien filtraba
//      "In Stock only" para saber qué podía llevarse veía cosas que no podía
//      llevarse. Ése es el que hace caminar hasta el estante para nada, y es el
//      que Jose no había visto porque desde fuera no se nota.
//
// LA CAUSA DE LOS TRES ERA LA MISMA: la insignia se decidía en un sitio y el
// filtro en otro, cada uno con su aritmética. Dos listas que tenían que decir lo
// mismo y nada que lo obligara — el mismo patrón que borró el archivo de
// movimientos y que dejó el mínimo de la tabla en un número escrito a mano.
//
// ── LO QUE SE MIDE ──────────────────────────────────────────────────────────
//
// No que las opciones existan: que FILTREN lo que dicen. Para cada estado se
// elige su opción y se comprueba que las filas que quedan son EXACTAMENTE las
// que llevan esa insignia — ni una de más ni una de menos. Un desplegable con
// cuatro opciones que filtran mal es peor que uno con dos que filtran bien.
//
// Uso:  node tools/test-estado-stock.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* Un material en cada uno de los cuatro estados, y los casos de borde que
 * separan unos de otros. `availableQty` es lo que se puede sacar;
 * `warehouseQty` es lo que hay en el estante, esté libre o apartado. */
function mat(name, wh, site, avail){
  return { matId: 'window|||' + name.toLowerCase(), name: name, category: 'WINDOW',
           project: '', unit: 'UNIT',
           warehouseQty: wh, siteQty: site, availableQty: avail,
           wastedQty: 0, reservedQty: Math.max(0, wh - avail), totalQty: wh + site,
           warehouseLocs: wh ? { A1A: wh } : {}, status: 'OK' };
}

const MATS = {
  // libre en el estante → In Stock
  'LIBRE':          mat('LIBRE', 10, 0, 10),
  // en el estante pero TODO apartado → Reserved. Es el caso del fallo nº 3.
  'TODO APARTADO':  mat('TODO APARTADO', 8, 0, 0),
  // algo apartado y algo libre → In Stock: lo que se pregunta es "¿me puedo
  // llevar algo?", y la respuesta es sí.
  'MITAD Y MITAD':  mat('MITAD Y MITAD', 10, 0, 3),
  // nada en el estante, todo en obra → All at Site
  'TODO EN OBRA':   mat('TODO EN OBRA', 0, 25, 0),
  // apartado en el estante Y además hay en obra: manda el estante, porque la
  // pregunta sigue siendo qué pasa con lo que está aquí.
  'APARTADO Y OBRA':mat('APARTADO Y OBRA', 5, 12, 0),
  // nada en ninguna parte → Zero Stock
  'NADA':           mat('NADA', 0, 0, 0)
};

const DATA = {
  userRole: 'ADMIN', userEmail: 'jose@ox.com', userName: 'Jose', serverVersion: 'test',
  company: { name: 'OX Glass LLC.' }, movements: [],
  stock: MATS, monitoredMaterials: null,
  config: { categories: ['WINDOW'], projects: [], suppliers: [],
            locations: [{ name: 'A1A', type: 'RACK' }], units: ['UNIT'] },
  incoming: [], rackPhotos: {}, systemActivity: [], materialLocks: [],
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
const f = path.join(os.tmpdir(), 'ac-estado-stock.html');
fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(900);

  /** Las filas visibles, con el nombre y la insignia que lleva cada una. */
  /* POR SU CLASE, NO POR "el primer badge de la fila".
   *
   * La primera versión de esto cogía `td .badge` y se traía la insignia de
   * CATEGORÍA, que va antes en la fila — así que todas las filas parecían llevar
   * la insignia "WINDOW" y la prueba fallaba sobre un filtro que funcionaba. La
   * de estado vive en `.sc-status` y el nombre en `.sc-name`; pedirlos por su
   * clase es lo único que no depende del orden de las columnas, que además la
   * persona puede cambiar. */
  async function filas(){
    return page.evaluate(() => {
      const out = [];
      document.querySelectorAll('#stockBody tr').forEach(tr => {
        const n = tr.querySelector('.sc-name strong');
        const b = tr.querySelector('.sc-status .badge');
        if (n && b) out.push({ nombre: n.textContent.trim(), insignia: b.textContent.trim() });
      });
      return out;
    });
  }

  async function ponerEstado(v){
    await page.evaluate((x) => {
      document.getElementById('stockStatusFilter').value = x;
      renderStock();
    }, v);
    await page.waitForTimeout(200);
  }

  console.log('\n═══ 1. Los cuatro estados existen y se dibujan ═══\n');

  await ponerEstado('');
  const todas = await filas();
  check('se dibujaron los seis materiales de la caja', todas.length === 6, todas.length);

  const porNombre = {};
  todas.forEach(r => { porNombre[r.nombre] = r.insignia; });
  const esperado = {
    'LIBRE': 'In Stock', 'MITAD Y MITAD': 'In Stock',
    'TODO APARTADO': 'Reserved', 'APARTADO Y OBRA': 'Reserved',
    'TODO EN OBRA': 'All at Site', 'NADA': 'Zero Stock'
  };
  const malas = Object.keys(esperado).filter(n => porNombre[n] !== esperado[n])
                      .map(n => n + ': ' + porNombre[n] + ' (debería ' + esperado[n] + ')');
  check('cada material lleva la insignia que le toca' +
        (malas.length ? ' — MAL: ' + malas.join('; ') : ''), malas.length === 0, porNombre);
  check('los cuatro estados aparecen de verdad en la tabla — si no, lo de abajo ' +
        'no estaría midiendo nada',
        new Set(Object.values(porNombre)).size === 4, [...new Set(Object.values(porNombre))]);

  console.log('\n═══ 2. El desplegable ofrece los cuatro ═══\n');

  const ops = await page.evaluate(() =>
    Array.prototype.map.call(document.querySelectorAll('#stockStatusFilter option'),
      o => ({ v: o.value, t: o.textContent.trim() })));
  check('hay una opción por estado, más "todos"', ops.length === 5, ops);
  ['in', 'resv', 'site', 'zero'].forEach(k => {
    check('...está la opción "' + k + '"', ops.some(o => o.v === k), ops.map(o => o.v));
  });
  check('la primera sigue siendo "All Status"', ops[0] && ops[0].v === '' , ops[0]);

  console.log('\n═══ 3. Cada opción filtra EXACTAMENTE lo que dice ═══\n');
  //
  // Es la comprobación que importa. Que la opción exista no dice nada: las dos
  // que ya existían existían, y una de ellas filtraba por otra cosa.
  const etiquetaDe = { in: 'In Stock', resv: 'Reserved', site: 'All at Site', zero: 'Zero Stock' };
  for (const k of ['in', 'resv', 'site', 'zero']) {
    await ponerEstado(k);
    const vistas = await filas();
    const deberian = todas.filter(r => r.insignia === etiquetaDe[k]).map(r => r.nombre).sort();
    const salieron = vistas.map(r => r.nombre).sort();
    check('"' + etiquetaDe[k] + ' only" deja las que llevan esa insignia y sólo ésas',
          JSON.stringify(salieron) === JSON.stringify(deberian),
          { salieron: salieron, deberian: deberian });
    check('...y ninguna fila visible lleva otra insignia',
          vistas.every(r => r.insignia === etiquetaDe[k]),
          vistas.map(r => r.nombre + ':' + r.insignia));
  }

  console.log('\n═══ 4. El fallo que Jose NO había visto ═══\n');
  //
  // "In Stock only" filtraba por warehouseQty > 0, así que un material con 8 en
  // el estante y 0 disponibles —todo apartado— pasaba el filtro. Quien lo usaba
  // para saber qué podía sacar, veía algo que no podía sacar.
  await ponerEstado('in');
  const enStock = await filas();
  check('"In Stock only" NO deja pasar un material con todo apartado',
        !enStock.some(r => r.nombre === 'TODO APARTADO'),
        enStock.map(r => r.nombre));
  check('...ni uno que sólo está en obra',
        !enStock.some(r => r.nombre === 'TODO EN OBRA'),
        enStock.map(r => r.nombre));
  check('...pero sí deja el que tiene algo libre aunque parte esté apartada — ' +
        'la pregunta es "¿me puedo llevar algo?"',
        enStock.some(r => r.nombre === 'MITAD Y MITAD'),
        enStock.map(r => r.nombre));

  console.log('\n═══ 5. Una sola fuente, para que no puedan volver a separarse ═══\n');

  const fuente = await page.evaluate(() => ({
    estados: (typeof STOCK_STATES !== 'undefined') ? STOCK_STATES.map(s => s.key) : null,
    insigniaUsaLista: typeof _stockState === 'function'
  }));
  check('existe UNA lista de estados', !!fuente.estados && fuente.estados.length === 4, fuente.estados);
  check('la insignia sale de ella', fuente.insigniaUsaLista);

  /* Y QUE EL FILTRO PREGUNTE POR EL ESTADO en vez de repetir la aritmética.
   * Se lee el código, no la pantalla: lo que hay que impedir es que alguien
   * vuelva a escribir `warehouseQty > 0` aquí dentro. */
  const cuerpo = (function(){
    const i = html.indexOf('function renderStock(');
    if (i === -1) return '';
    let d = 0;
    for (let j = html.indexOf('{', i); j < html.length; j++) {
      if (html[j] === '{') d++;
      else if (html[j] === '}') { d--; if (!d) return html.slice(i, j + 1); }
    }
    return '';
  })();
  check('el filtro compara contra el estado, no contra las cantidades',
        /_stockState\(s\)\.key !== sf/.test(cuerpo));
  check('...y ya no quedan las cuentas viejas dentro del filtro',
        !/sf === 'in'\s*&&/.test(cuerpo) && !/sf === 'zero'\s*&&/.test(cuerpo));

  /* Añadir un quinto estado tiene que ser añadir UNA fila. Se comprueba de
   * verdad: se mete uno en caliente y se mira si aparece en el desplegable. */
  const quinto = await page.evaluate(() => {
    STOCK_STATES.splice(3, 0, { key:'xx', label:'Prueba', clase:'badge-gray',
                                opcion:'Prueba only', test:function(){ return false; } });
    _llenarFiltroDeEstado();
    const hay = Array.prototype.some.call(
      document.querySelectorAll('#stockStatusFilter option'), o => o.value === 'xx');
    STOCK_STATES.splice(3, 1);
    _llenarFiltroDeEstado();
    return hay;
  });
  check('añadir un estado a la lista lo hace aparecer en el desplegable solo — ' +
        'no hay una segunda copia que actualizar', quinto);

  check('y la página no tiró ningún error', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
  process.exit(fail ? 1 : 0);
})();
