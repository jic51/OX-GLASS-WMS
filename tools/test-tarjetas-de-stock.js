// M-01, EL RESTO — EL STOCK DASHBOARD EN TARJETAS, MEDIDO EN UN NAVEGADOR.
//
// Movements ya eran tarjetas desde la v15.3. El Dashboard es la segunda
// pantalla más mirada y seguía siendo una tabla de nueve columnas que había que
// arrastrar de lado.
//
// ── POR QUÉ ESTA PRUEBA ABRE UN NAVEGADOR DE VERDAD ──────────────────────────
//
// Porque la promesa es «no hay que arrastrar de lado», y eso no se lee en el
// CSS: se mide. Un `var()` mal escrito deja la propiedad en su valor inicial y
// un grep pasa igual de contento — ya pasó en este repositorio, y lo que lo
// encontró fue una captura, no la prueba.
//
// Y hay un riesgo concreto, escrito en `docs/PLAN-TELEFONO.md` antes de
// empezar: **la barra de existencias se dibuja con anchos en píxeles.** En una
// tarjeta del ancho de la pantalla hay que comprobar que no se desborde — que
// es exactamente el fallo que salió en M-01 con la barra de selección en 320 px
// y que nadie vio hasta medirlo.
//
// ── LO QUE SE COMPRUEBA, Y EL ORDEN IMPORTA ──────────────────────────────────
//
//  1. Que no haya que arrastrar la página de lado, en tres teléfonos.
//  2. Que lo que manda se vea CON LA TARJETA CERRADA: la insignia de estado y
//     la barra. Esconderlas tras un toque dejaría la tarjeta bonita y muda.
//  3. Que el resto espere al toque, y que al tocar se abra TODO — datos y
//     panel de fotos — porque es un solo gesto.
//  4. Que la fila del panel de detalle NO se dibuje como una tarjeta más: si lo
//     hiciera, la lista se leería como el doble de materiales de los que hay.
//  5. Que en el ordenador siga siendo la misma tabla. Si ahí cambió algo, es un
//     fallo.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-tarjetas-de-stock.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium, devices } = require('playwright');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); }
  else { fail++; console.log('  FAIL ' + etiqueta +
    (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}

/* NOMBRES LARGOS A PROPÓSITO. Un material llamado «A» cabe en cualquier sitio;
   los de este almacén son «SINGLE HUNG 3048 WHITE LOW-E», y es con ésos con los
   que una tarjeta se desborda o no. */
const STOCK = {};
for (let i = 0; i < 8; i++) {
  const avail = i === 3 ? 0 : 40 + i * 7;
  STOCK['WINDOW|||SINGLE HUNG 3048 WHITE LOW-E ' + i] = {
    matId: 'WINDOW|||SINGLE HUNG 3048 WHITE LOW-E ' + i,
    category: 'WINDOW',
    name: 'SINGLE HUNG 3048 WHITE LOW-E ' + i,
    project: i % 2 ? 'MAPLE STREET REMODEL PHASE 2' : 'GENERIC',
    unit: 'UNIT',
    warehouseQty: avail + (i % 3) * 5,
    availableQty: avail,
    reservedQty: (i % 3) * 5,
    siteQty: i * 3,
    wastedQty: i === 5 ? 2 : 0,
    minStock: i === 3 ? 10 : 0,
    warehouseLocs: { 'A1A': Math.ceil(avail / 2), 'B2C': Math.floor(avail / 2) },
    lastNote: i === 1
      ? 'Two panes chipped on arrival, check the frames before pulling any of these'
      : '',
    dateReceived: '2026-11-' + String(10 + (i % 5)).padStart(2, '0'),
    docLinks: ''
  };
}

const DATA = {
  userRole: 'ADMIN', userEmail: 'sam@cedarlineglass.com', userName: 'Sam Ortega',
  serverVersion: (HTML.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || '',
  company: { name: 'Cedarline Glass Co.' },
  movements: [], stock: STOCK, materialLocks: [], monitoredMaterials: null,
  config: { categories: ['WINDOW'], projects: ['MAPLE STREET REMODEL PHASE 2'],
            suppliers: ['NORTHGATE SUPPLY'],
            locations: [{ name: 'A1A', type: 'RACK' }, { name: 'B2C', type: 'RACK' }],
            units: ['UNIT'] },
  incoming: [], rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts: true, canEditMovements: true, canManageCatalog: true, canExportData: true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId: '', oauthRedirectUri: ''
};

const stub = `<script>
window.google=window.google||{};
window.google.charts={load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get:function(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){return window.google.script.run;}
 var o=t._ok;
 if(k==='getInitialData'){setTimeout(function(){o&&o(window.__DATA);},15);return;}
 var a0=String(arguments[0]||'');
 if(k==='processMovement'&&/^list/i.test(a0)){setTimeout(function(){o&&o([]);},5);return;}
 setTimeout(function(){o&&o({});},5);};}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;

const TELEFONOS = ['Galaxy S9+', 'iPhone 12', 'Pixel 5'];

(async () => {
  const f = path.join(os.tmpdir(), 'ac-stock-tarjetas-' + Date.now() + '.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));

  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });

  async function abrir(opciones) {
    const p = await b.newPage(opciones);
    p._err = [];
    p.on('pageerror', e => p._err.push(e.message));
    await p.goto('file://' + f, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900);
    await p.evaluate(() => showTab('dashboard', 'btn-dashboard'));
    await p.waitForTimeout(500);
    return p;
  }

  console.log('\n═══ 1 · NO HAY QUE ARRASTRAR DE LADO, EN TRES TELÉFONOS ═══\n');

  for (const nombre of TELEFONOS) {
    const p = await abrir(devices[nombre]);
    const r = await p.evaluate(() => {
      var wrap = document.getElementById('stockTableWrap');
      var filas = document.querySelectorAll('#stockBody tr:not(.stock-detail-row)');
      var anchos = [];
      Array.prototype.forEach.call(filas, function(tr, i){
        if (i < 4) anchos.push(Math.round(tr.getBoundingClientRect().width));
      });
      // La barra de existencias, que es el riesgo apuntado antes de empezar.
      var barras = [];
      Array.prototype.forEach.call(document.querySelectorAll('#stockBody .lv-wrap'),
        function(el, i){
          if (i < 4) barras.push(Math.round(el.getBoundingClientRect().right));
        });
      return {
        esTarjeta: !!wrap && wrap.classList.contains('tarjetas'),
        paginaAncho: document.documentElement.scrollWidth,
        ventana: window.innerWidth,
        filas: filas.length,
        anchos: anchos,
        barraDerecha: barras
      };
    });
    console.log('  — ' + nombre + ' (' + r.ventana + 'px):');
    check(nombre + ': el Dashboard está en modo tarjeta', r.esTarjeta, r);
    check(nombre + ': hay tarjetas pintadas', r.filas >= 8, r.filas);
    /* +1 de tolerancia: un ancho fraccionario se redondea hacia arriba y un
       píxel de diferencia no es un arrastre. */
    check(nombre + ': la página NO se arrastra de lado',
      r.paginaAncho <= r.ventana + 1, { pagina: r.paginaAncho, ventana: r.ventana });
    check(nombre + ': ninguna tarjeta se sale de la pantalla',
      r.anchos.every(a => a <= r.ventana), r.anchos);
    check(nombre + ': LA BARRA DE EXISTENCIAS no se desborda — es el riesgo ' +
          'que estaba apuntado antes de escribir una línea',
      r.barraDerecha.length > 0 && r.barraDerecha.every(x => x <= r.ventana),
      { barras: r.barraDerecha, ventana: r.ventana });
    check(nombre + ': ningún error suelto', p._err.length === 0, p._err.slice(0, 2));
    await p.close();
  }

  console.log('\n═══ 2 · LO QUE MANDA SE VE SIN TOCAR NADA ═══\n');
  {
    const p = await abrir(devices['Galaxy S9+']);
    const r = await p.evaluate(() => {
      var tr = document.querySelector('#stockBody tr:not(.stock-detail-row)');
      function visible(sel){
        var td = tr.querySelector(sel);
        if (!td) return 'no existe';
        return getComputedStyle(td).display !== 'none';
      }
      return {
        nombre:   visible('td.sc-name'),
        estado:   visible('td.sc-status'),
        barra:    visible('td.sc-levels'),
        categoria:visible('td.sc-category'),
        donde:    visible('td.sc-location'),
        // y lo que espera
        fecha:    visible('td.sc-dateReceived'),
        nota:     visible('td.sc-lastNote'),
        docs:     visible('td.sc-docs'),
        hayMas:   getComputedStyle(tr, '::before').content
      };
    });
    check('se ve el nombre del material', r.nombre === true, r.nombre);
    check('se ve LA INSIGNIA DE ESTADO — es lo que dice de un vistazo si hay ' +
          'un problema', r.estado === true, r.estado);
    check('se ve LA BARRA DE EXISTENCIAS, por lo mismo', r.barra === true, r.barra);
    check('se ve la categoría', r.categoria === true, r.categoria);
    check('se ve dónde está', r.donde === true, r.donde);
    check('la fecha de entrada espera al toque', r.fecha === false, r.fecha);
    check('la última nota espera al toque', r.nota === false, r.nota);
    check('los documentos esperan al toque', r.docs === false, r.docs);
    check('y la tarjeta dice que hay más', /More/.test(r.hayMas || ''), r.hayMas);
    await p.close();
  }

  console.log('\n═══ 3 · AL TOCAR SE ABRE TODO, EN UN SOLO GESTO ═══\n');
  {
    const p = await abrir(devices['Galaxy S9+']);
    await p.evaluate(() => {
      var tr = document.querySelector('#stockBody tr:not(.stock-detail-row)');
      tr.querySelector('td.sc-name').click();
    });
    await p.waitForTimeout(250);
    const r = await p.evaluate(() => {
      var tr = document.querySelector('#stockBody tr:not(.stock-detail-row)');
      var det = tr.nextElementSibling;
      return {
        abierta: tr.classList.contains('abierta'),
        fecha: getComputedStyle(tr.querySelector('td.sc-dateReceived')).display !== 'none',
        docs:  getComputedStyle(tr.querySelector('td.sc-docs')).display !== 'none',
        detEsPanel: !!det && det.classList.contains('stock-detail-row'),
        detAbierto: !!det && det.classList.contains('open'),
        /* Y EL PANEL NO ES UNA TARJETA: sin esto se dibujaría con su borde y su
           sombra y la lista se leería como el doble de materiales. */
        detBorde: det ? getComputedStyle(det).borderTopWidth : null,
        detSombra: det ? getComputedStyle(det).boxShadow : null,
        menos: getComputedStyle(tr, '::before').content
      };
    });
    check('la tarjeta queda abierta', r.abierta === true);
    check('ahora se ve la fecha de entrada', r.fecha === true);
    check('y los documentos', r.docs === true);
    check('el MISMO toque abrió su panel de fotos y documentos — un gesto, una ' +
          'cosa', r.detEsPanel && r.detAbierto, r);
    check('el panel NO se dibuja como una tarjeta: ni borde ni sombra',
      r.detBorde === '0px' && (r.detSombra === 'none' || !r.detSombra),
      { borde: r.detBorde, sombra: r.detSombra });
    check('y ahora dice que se puede cerrar', /Less/.test(r.menos || ''), r.menos);
    await p.close();
  }

  console.log('\n═══ 4 · EN EL ORDENADOR SIGUE SIENDO LA MISMA TABLA ═══\n');
  {
    const p = await abrir({ viewport: { width: 1440, height: 900 } });
    const r = await p.evaluate(() => {
      var wrap = document.getElementById('stockTableWrap');
      var tr = document.querySelector('#stockBody tr:not(.stock-detail-row)');
      var tds = tr ? tr.querySelectorAll('td') : [];
      var vis = 0;
      Array.prototype.forEach.call(tds, function(td){
        if (getComputedStyle(td).display !== 'none') vis++;
      });
      return {
        esTarjeta: !!wrap && wrap.classList.contains('tarjetas'),
        celdas: tds.length,
        visibles: vis,
        cabecera: !!document.querySelector('#stockHeadRow th')
      };
    });
    check('NO está en modo tarjeta', r.esTarjeta === false, r.esTarjeta);
    check('la cabecera de columnas sigue ahí', r.cabecera === true);
    check('y TODAS las celdas de la fila se ven — ninguna espera a un toque ' +
          'que en el ordenador no existe',
      r.celdas > 5 && r.visibles === r.celdas, r);
    await p.close();
  }

  await b.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
