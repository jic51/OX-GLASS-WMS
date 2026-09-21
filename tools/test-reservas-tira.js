// LA TIRA DE RESERVAS, MEDIDA EN PÍXELES.
//
// test-reservas.js ya ejecuta la función y lee el HTML que produce. Esto es
// otra cosa: Jose no se quejó del HTML, se quejó de lo que VEÍA.
//
//   *"si te das cuenta todo depende del tamaño de los nombres y demás, cada
//    cosa se mueve si se ponen más letras; debemos hacerlo estándar y más
//    unido, darle un espacio horizontal fijo a cada uno, y si tienen más letras
//    que se encojan hasta un punto que sí se pueda leer, pero si es mucha letra
//    entonces se hace doble línea."*
//
// Eso son tres medidas —dónde empieza cada columna, cuánto mide la letra,
// cuántas líneas ocupa— y ninguna de las tres se puede leer de una cadena de
// HTML. Un `grid-template-columns` escrito en píxeles puede estar en el archivo
// y no aplicarse, porque otra regla más específica lo pisa; y `line-clamp` con
// `white-space:nowrap` delante no parte nada. Las dos veces el test de HTML
// pasaría en verde sobre una pantalla rota.
//
// LO QUE SE MIDE, Y POR QUÉ CADA UNA:
//
//   1. Que las columnas NO BAILAN. Se dibuja la tira, se apunta dónde empieza
//      cada columna, se añade una reserva con un nombre larguísimo y se vuelve
//      a mirar. Si algún borde se movió, volvió el `auto`.
//   2. Que lo largo se ENCOGE antes de partirse, y que no se sale de su celda.
//   3. Que de verdad se para en dos líneas — no en cinco.
//   4. Que arranca plegada y que el clic la abre. Es lo que Jose pidió para
//      cuando haya cien.
//   5. Que la reserva que no retiene nada TIENE BOTÓN. Ésa es la que no se
//      podía arreglar, y la que hizo falta arreglar.
//
// Uso:  CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-reservas-tira.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function mat(id, name, locs){
  const wh = Object.keys(locs).reduce((a, k) => a + locs[k], 0);
  return { matId: id, name: name, category: 'WINDOW', project: '', unit: 'UNIT',
           warehouseQty: wh, siteQty: 0, wastedQty: 0, reservedQty: 0,
           availableQty: wh, totalQty: wh, warehouseLocs: locs, status: 'OK' };
}

// Las cinco de la captura de Jose del 2026-09-21, con sus nombres reales: es
// la mezcla que hace falta —estantes de tres letras y de dieciséis, motivos de
// dos letras y de una frase— y la que enseñó el problema.
const DATA = {
  userRole: 'ADMIN', userEmail: 'jose@ox.com', userName: 'Jose', serverVersion: 'test',
  company: { name: 'OX Glass LLC.' }, movements: [],
  stock: {
    'window|||mh 159':  mat('window|||mh 159',  'MH 159',  { A4A: 48 }),
    'window|||kotter':  mat('window|||kotter',  'KOTTER RESIDENCE', { B: 20 }),
    'window|||mh 145':  mat('window|||mh 145',  'MH 145',  { B2A: 51 }),
    'window|||44north': mat('window|||44north', '44 NORTH', { C3B: 142 }),
    'window|||noname':  mat('window|||noname',  'NO NAME', { 'WINDOW WAREHOUSE': 87 })
  },
  materialLocks: [
    { id:'R1', matId:'window|||mh 159', category:'WINDOW', name:'MH 159', rack:'A4A',
      reason:'Ordered wrong', lockedBy:'jose@ox.com', lockedAt:'09/05/2026 17:06', allowedDest:[] },
    // La huérfana: activa, y su material no existe en ninguna parte.
    { id:'R2', matId:'window|||evelyn', category:'WINDOW', name:'EVELYN A QUINONEZ', rack:'B',
      reason:'Si', lockedBy:'jose@ox.com', lockedAt:'09/05/2026 17:06', allowedDest:[] },
    { id:'R3', matId:'window|||kotter', category:'WINDOW', name:'KOTTER RESIDENCE', rack:'B',
      reason:'Si', lockedBy:'jose@ox.com', lockedAt:'09/05/2026 17:06', allowedDest:[] },
    { id:'R4', matId:'window|||mh 145', category:'WINDOW', name:'MH 145', rack:'B2A',
      reason:'reserved for a job in January 24', lockedBy:'jose@ox.com', lockedAt:'', allowedDest:[] },
    { id:'R5', matId:'window|||44north', category:'WINDOW', name:'44 NORTH', rack:'C3B',
      reason:'NEEDED FOR OTHER PROJECT', lockedBy:'jose@ox.com', lockedAt:'', allowedDest:[] },
    { id:'R6', matId:'window|||noname', category:'WINDOW', name:'NO NAME', rack:'WINDOW WAREHOUSE',
      reason:'NOT GOOD, RETURN TO SUPPLIER.', lockedBy:'jose@ox.com', lockedAt:'', allowedDest:[] }
  ],
  monitoredMaterials: null,
  config: { categories:['WINDOW'], projects:[], suppliers:[],
            locations:[{ name:'A4A', type:'RACK' }, { name:'B', type:'RACK' },
                       { name:'B2A', type:'RACK' }, { name:'C3B', type:'RACK' },
                       { name:'WINDOW WAREHOUSE', type:'RACK' }],
            units:['UNIT'] },
  incoming: [], rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts:false, canEditMovements:true, canManageCatalog:true, canExportData:true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId:'', oauthRedirectUri:''
};

function pagina(){
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
  const out = html.replace('</head>', stub + '</head>');
  const f = path.join(os.tmpdir(), 'ac-resv-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, out);
  return f;
}

// Dónde empieza cada columna, medido desde el borde izquierdo de SU PROPIA fila.
// Restar el origen de la fila es lo que hace comparables dos filas que podrían
// estar a distinta altura pero deben estar a la misma izquierda.
const LEER_COLUMNAS = () => {
  const filas = Array.prototype.slice.call(document.querySelectorAll('.resv-row'));
  return filas.map(f => {
    const o = f.getBoundingClientRect();
    const celda = c => {
      const e = f.querySelector('.' + c);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      // `line-height` puede venir como "normal", y entonces parseFloat da NaN.
      // La primera versión de esta prueba devolvía `lineas: null` por eso y la
      // comprobación de "no más de dos líneas" pasaba en verde sin medir nada.
      const fuente = parseFloat(cs.fontSize);
      const unaLinea = parseFloat(cs.lineHeight) || fuente * 1.2;
      return { x: Math.round(r.left - o.left), w: Math.round(r.width),
               alto: Math.round(r.height),
               fuente: Math.round(fuente * 100) / 100,
               lineas: Math.max(1, Math.round(r.height / unaLinea)),
               desborda: e.scrollWidth > e.clientWidth + 1,
               texto: e.textContent.trim() };
    };
    return { anchoFila: Math.round(o.width), rack: celda('resv-rack'),
             name: celda('resv-name'), qty: celda('resv-qty'), why: celda('resv-why') };
  });
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + pagina());
  await page.waitForTimeout(600);
  // La tira vive en el mapa. Y se limpia la preferencia guardada para medir el
  // arranque de verdad y no el de la sesión anterior.
  await page.evaluate(() => { try { localStorage.removeItem('acopio_resv_abierta'); } catch(e){} });
  await page.evaluate(() => { _resvAbierta = false; showTab('warehouse', 'btn-warehouse'); });
  await page.waitForTimeout(300);

  console.log('\n═══ 1. Arranca plegada, y el clic la abre ═══\n');

  const plegada = await page.evaluate(() => {
    const strip = document.querySelector('.resv-strip');
    const rows  = strip && strip.querySelector('.resv-rows');
    return { hayTira: !!strip,
             filasVisibles: !!(rows && rows.offsetParent !== null),
             cabecera: strip ? strip.querySelector('.resv-toggle').textContent.replace(/\s+/g,' ').trim() : '',
             altura: strip ? Math.round(strip.getBoundingClientRect().height) : 0 };
  });
  check('la tira está en el mapa', plegada.hayTira);
  check('...y empieza con las filas escondidas', !plegada.filasVisibles);
  check('...ocupando poco: una cabecera, no una lista',
        plegada.altura > 0 && plegada.altura < 90, plegada.altura);
  check('...que ya dice cuántas hay sin abrirla',
        /6 reservations/.test(plegada.cabecera), plegada.cabecera);
  check('...y cuántas no retienen nada',
        /1 holds nothing/.test(plegada.cabecera), plegada.cabecera);

  await page.click('.resv-toggle');
  await page.waitForTimeout(250);
  const abierta = await page.evaluate(() => {
    const strip = document.querySelector('.resv-strip');
    return { filas: strip.querySelectorAll('.resv-row').length,
             visibles: strip.querySelector('.resv-rows').offsetParent !== null,
             marcada: strip.classList.contains('abierta'),
             guardado: (function(){ try { return localStorage.getItem('acopio_resv_abierta'); }
                                    catch(e){ return null; } })() };
  });
  check('al pulsar la cabecera se abre', abierta.visibles);
  check('...con una fila por reserva', abierta.filas === 6, abierta.filas);
  check('...marcada abierta, que es lo que gira la flecha', abierta.marcada);
  check('...y la elección queda guardada para mañana', abierta.guardado === '1');

  await page.click('.resv-toggle');
  await page.waitForTimeout(250);
  const recerrada = await page.evaluate(() => ({
    visibles: document.querySelector('.resv-rows').offsetParent !== null,
    guardado: (function(){ try { return localStorage.getItem('acopio_resv_abierta'); }
                           catch(e){ return null; } })()
  }));
  check('y se vuelve a cerrar con otro clic', !recerrada.visibles);
  check('...guardando también ese "no"', recerrada.guardado === '0');

  console.log('\n═══ 2. Las columnas no se mueven ═══\n');
  //
  // El corazón de la queja de Jose. Se mide ANTES y DESPUÉS de meter una
  // reserva con un nombre mucho más largo que todas las demás.

  await page.evaluate(() => { _resvAbierta = true; renderWarehouseMap(); });
  await page.waitForTimeout(250);
  const antes = await page.evaluate(LEER_COLUMNAS);

  check('se midieron las seis filas', antes.length === 6, antes.length);

  const bordes = ['rack', 'name', 'qty', 'why'];
  let alineadas = 0;
  bordes.forEach(c => {
    const xs = antes.map(f => f[c].x);
    if (xs.every(x => x === xs[0])) alineadas++;
  });
  check('las cuatro columnas empiezan en la misma x en TODAS las filas',
        alineadas === 4, bordes.map(c => ({ col: c, xs: antes.map(f => f[c].x) })));

  await page.evaluate(() => {
    materialLocks.push({ id:'R9', matId:'window|||largo', category:'WINDOW',
      name:'TEMPERED LAMINATED GLASS PANEL, BRONZE, 96 INCH',
      rack:'MIRRORS/SHOWERS BACK WALL', reason:'holding for the Sunbridge phase two ' +
      'install, do not move without asking the project manager first',
      lockedBy:'jose@ox.com', lockedAt:'', allowedDest:[] });
    stockData['window|||largo'] = { matId:'window|||largo', name:'X', category:'WINDOW',
      unit:'UNIT', warehouseQty:7, siteQty:0, wastedQty:0, reservedQty:0,
      availableQty:7, totalQty:7, warehouseLocs:{ 'MIRRORS/SHOWERS BACK WALL': 7 }, status:'OK' };
    renderWarehouseMap();
  });
  await page.waitForTimeout(250);
  const despues = await page.evaluate(LEER_COLUMNAS);

  check('ahora hay siete filas', despues.length === 7, despues.length);
  // La comparación que importa: la fila que YA ESTABA no puede haberse movido.
  const movidas = [];
  bordes.forEach(c => {
    const a = antes[0][c].x, d = despues.find(f => f.rack.texto === 'A4A')[c].x;
    if (a !== d) movidas.push({ col: c, antes: a, despues: d });
  });
  check('AÑADIR LA RESERVA MÁS LARGA NO MUEVE NI UNA COLUMNA — esto era lo roto',
        movidas.length === 0, movidas);
  check('...y el ancho de la fila tampoco cambió',
        antes[0].anchoFila === despues[0].anchoFila,
        { antes: antes[0].anchoFila, despues: despues[0].anchoFila });

  console.log('\n═══ 3. Lo largo se encoge, y luego se parte ═══\n');

  const larga = despues.find(f => f.rack.texto === 'MIRRORS/SHOWERS BACK WALL');
  const corta = despues.find(f => f.rack.texto === 'A4A');

  check('el estante corto se queda al tamaño normal',
        corta.rack.fuente >= 12, corta.rack.fuente);
  check('el estante larguísimo baja de tamaño', larga.rack.fuente < corta.rack.fuente,
        { corto: corta.rack.fuente, largo: larga.rack.fuente });
  check('...pero no por debajo de lo legible', larga.rack.fuente >= 10, larga.rack.fuente);
  check('...y se parte en dos líneas en vez de recortarse',
        larga.rack.lineas === 2, larga.rack);
  check('...sin pasar de dos', despues.every(f => f.rack.lineas <= 2),
        despues.map(f => f.rack.lineas));

  const anchos = despues.map(f => f.rack.w);
  check('el nombre más largo NO se sale de su columna',
        anchos.every(w => w === anchos[0]), anchos);
  check('...ni desborda por los lados',
        !larga.rack.desborda && !larga.name.desborda, larga);

  // WINDOW WAREHOUSE es el caso concreto de la captura de Jose, y es el que
  // enseñó que la columna de 96px con la que empecé no daba: a ningún tamaño
  // legible cabía dentro, así que salía CORTADO con puntos suspensivos — que es
  // exactamente lo que él no quería. Con 120px cabe entero, encogido un paso.
  const ww = despues.find(f => f.rack.texto === 'WINDOW WAREHOUSE');
  check('WINDOW WAREHOUSE se lee ENTERO, no cortado', !ww.rack.desborda, ww.rack);
  check('...cabiendo en una línea, encogido',
        ww.rack.lineas === 1 && ww.rack.fuente < corta.rack.fuente, ww.rack);
  // Y NINGUNA celda puede salir cortada: la regla de Jose es encoger y luego
  // partir, nunca esconder el final de una palabra.
  const cortadas = [];
  despues.forEach(f => ['rack','name','qty','why'].forEach(c => {
    if (f[c].desborda) cortadas.push({ col: c, t: f[c].texto });
  }));
  check('ninguna celda se recorta — se parten, no se esconden',
        cortadas.length === 0, cortadas);

  console.log('\n═══ 4. Y la huérfana se puede arreglar ═══\n');

  const huerfana = await page.evaluate(() => {
    const filas = Array.prototype.slice.call(document.querySelectorAll('.resv-row-wrap'));
    const f = filas.find(x => x.textContent.indexOf('EVELYN A QUINONEZ') !== -1);
    if (!f) return null;
    const b = f.querySelector('.resv-soltar');
    return { tieneBoton: !!b, texto: b ? b.textContent.trim() : '',
             ancho: b ? Math.round(b.getBoundingClientRect().width) : 0,
             aviso: (f.querySelector('.resv-alerta') || {}).textContent || '',
             apagada: f.querySelector('.resv-row').classList.contains('resv-vacia') };
  });
  check('la reserva que no retiene nada sigue en la lista', !!huerfana);
  check('...marcada, no escondida', huerfana.apagada);
  check('...diciendo por qué', /no stock recorded/.test(huerfana.aviso), huerfana.aviso);
  check('...Y CON UN BOTÓN PARA SOLTARLA, que es lo que faltaba',
        huerfana.tieneBoton && huerfana.texto === 'Release', huerfana);
  check('...del mismo ancho en todas las filas, no empujando al texto',
        huerfana.ancho > 40, huerfana.ancho);

  await page.evaluate(() => {
    const filas = Array.prototype.slice.call(document.querySelectorAll('.resv-row-wrap'));
    filas.find(x => x.textContent.indexOf('EVELYN A QUINONEZ') !== -1)
         .querySelector('.resv-soltar').click();
  });
  await page.waitForTimeout(250);
  const dialogo = await page.evaluate(() => ({
    abierto: document.getElementById('confirmOverlay').classList.contains('show'),
    titulo:  document.getElementById('confirmTitle').textContent,
    boton:   document.getElementById('confirmOkBtn').textContent
  }));
  check('pulsarlo abre la confirmación de soltar', dialogo.abierto);
  check('...nombrando el material', /EVELYN A QUINONEZ/.test(dialogo.titulo), dialogo.titulo);
  check('...y el botón dice lo que hace', dialogo.boton === 'Release', dialogo.boton);
  await page.evaluate(() => _confirmCancel());

  // Y la limpieza de golpe, que es la respuesta a "¿y cuándo tenga 10 así?".
  await page.waitForTimeout(150);
  await page.click('.resv-limpiar');
  await page.waitForTimeout(250);
  const limpieza = await page.evaluate(() => ({
    abierto: document.getElementById('confirmOverlay').classList.contains('show'),
    titulo:  document.getElementById('confirmTitle').textContent,
    cuerpo:  document.getElementById('confirmMessage').textContent
  }));
  check('la cabecera ofrece soltar de golpe las que no retienen nada', limpieza.abierto);
  check('...diciendo cuántas', /Release 1 reservation holding nothing/.test(limpieza.titulo),
        limpieza.titulo);
  check('...y nombrándola, no "1 reservation"',
        /EVELYN A QUINONEZ @ B/.test(limpieza.cuerpo), limpieza.cuerpo);

  console.log('\n═══ 5. Y en pantalla estrecha ═══\n');

  await page.evaluate(() => _confirmCancel());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const movil = await page.evaluate(() => {
    const strip = document.querySelector('.resv-strip');
    const r = strip.getBoundingClientRect();
    const filas = Array.prototype.slice.call(strip.querySelectorAll('.resv-row'));
    return { derecha: Math.round(r.right), ancho: Math.round(window.innerWidth),
             scrollH: document.documentElement.scrollWidth,
             clientH: document.documentElement.clientWidth,
             desbordan: filas.filter(f => f.scrollWidth > f.clientWidth + 1).length };
  });
  check('la tira no se sale de la pantalla', movil.derecha <= movil.ancho + 1, movil);
  check('...ni hace que la página se mueva de lado',
        movil.scrollH <= movil.clientH + 1, movil);
  check('...y ninguna fila desborda', movil.desbordan === 0, movil.desbordan);

  check('y la página no tiró ningún error', errores.length === 0, errores);

  await browser.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
  process.exit(fail ? 1 : 0);
})();
