// M-06 · LLEGAR A LOS MOVIMIENTOS SIN BAJAR UNA PANTALLA ENTERA.
//
// Encontrado haciendo la captura de M-01, no buscándolo: en un Pixel 5 había
// que bajar **una pantalla completa** antes de ver el primer movimiento. Siete
// controles, cada uno a ancho completo y uno debajo de otro.
//
// ── LO QUE SE MIDE ─────────────────────────────────────────────────────────
//
// Una distancia: **cuántos píxeles hay desde arriba hasta el primer
// movimiento**. Eso no está escrito en ninguna regla — sale de sumar lo que
// ocupa cada control, y una regla puede decir lo correcto y perder contra otra
// más específica. Se dibuja y se mide.
//
// Y se mide con la misma fuerza lo contrario: **en el ordenador la barra no se
// movió ni un píxel**. Agrupar controles para el teléfono es la forma más
// fácil de estropear el escritorio sin enterarse.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux*/chrome \
//       node tools/test-barra-que-cabe.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium, devices } = require('playwright');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0; const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

const MOVS = [];
for (let i = 0; i < 8; i++) MOVS.push({
  rowIdx: 2 + i, movId: 'M' + i, moveType: i % 2 ? 'EXIT' : 'ENTRY',
  category: i % 3 ? 'WINDOW' : 'SCREEN', name: 'SH 3048 WHITE ' + i,
  qty: 5 + i, unit: 'UNIT', po: '104' + i, sourceLoc: '', destLoc: 'A1A',
  project: '', supplier: 'NORTHGATE SUPPLY', responsible: 'SAM ORTEGA',
  comments: '', pm: '', gc: '', userEmail: 'sam@cedarlineglass.com', docLinks: '',
  dateRec: '2026-11-12', timestamp: '2026-11-12 09:00', unitCost: '', totalCost: ''
});

const DATA = {
  userRole: 'ADMIN', userEmail: 'sam@cedarlineglass.com', userName: 'Sam Ortega',
  serverVersion: (HTML.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || '',
  company: { name: 'Cedarline Glass Co.' },
  movements: MOVS, stock: {}, materialLocks: [], monitoredMaterials: null,
  config: { categories: ['WINDOW', 'SCREEN'], projects: [], suppliers: ['NORTHGATE SUPPLY'],
            locations: [{ name: 'A1A', type: 'RACK' }], units: ['UNIT'] },
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

(async () => {
  const f = path.join(os.tmpdir(), 'ac-m06-' + Date.now() + '.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });

  async function abrir(op) {
    const p = await b.newPage(op);
    p._err = [];
    p.on('pageerror', e => p._err.push(e.message));
    await p.goto('file://' + f, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      var ov = document.querySelector('.morning-overlay'); if (ov) ov.remove();
      showTab('movements', 'btn-movements');
    });
    await p.waitForTimeout(450);
    return p;
  }

  console.log('\n═══ 1 · EL PRIMER MOVIMIENTO SE VE SIN BAJAR ═══\n');

  for (const tel of ['Pixel 5', 'Galaxy S9+']) {
    const p = await abrir(devices[tel]);
    const r = await p.evaluate(() => {
      const tr = document.querySelector('#tableContainer tbody tr');
      const tb = document.getElementById('movToolbar');
      return {
        hastaElPrimero: tr ? Math.round(tr.getBoundingClientRect().top + window.scrollY) : -1,
        alto: window.innerHeight,
        barra: tb ? Math.round(tb.getBoundingClientRect().height) : -1,
        desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    /* LA COMPROBACIÓN QUE CONTESTA EL HALLAZGO: el primer movimiento tiene que
     * estar DENTRO de la primera pantalla, no debajo de ella. */
    check(tel + ': el primer movimiento cae dentro de la primera pantalla',
      r.hastaElPrimero > 0 && r.hastaElPrimero < r.alto, r);
    check(tel + ': y la barra no se sale de lado', r.desborde <= 2, r);
    await p.close();
  }

  console.log('\n═══ 2 · ENTRY Y EXIT ARRIBA, UNO AL LADO DEL OTRO ═══\n');

  {
    const p = await abrir(devices['Pixel 5']);
    const r = await p.evaluate(() => {
      /* El buscador se mide por SU CAJA, que es el `span.tiene-x` que le pone
       * la ✕ — es lo que se reparte en la barra, no el `<input>` de dentro. */
      const g = id => { let e = document.getElementById(id); if (!e) return null;
        if (e.parentElement && e.parentElement.classList.contains('tiene-x')) e = e.parentElement;
        const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top),
          w: Math.round(b.width), h: Math.round(b.height) }; };
      return { entry: g('btnEntry'), exit: g('btnExit'), busca: g('movSearch'),
               filtros: g('btnMovFiltros'), tipo: g('movTypeFilter') };
    });
    check('Entry y Exit están en el mismo renglón',
      Math.abs(r.entry.y - r.exit.y) < 6, r);
    check('...y Entry va antes que Exit', r.entry.x < r.exit.x, r);
    check('...por encima del buscador', r.entry.y < r.busca.y, r);
    /* 44 px es lo que se puede tocar con un dedo, y con guantes más. Son los
     * dos botones que se pulsan de pie en la bodega. */
    check('...y los dos se pueden tocar con el dedo',
      r.entry.h >= 40 && r.exit.h >= 40, r);
    check('el botón de filtros está al lado del buscador',
      Math.abs(r.filtros.y - r.busca.y) < 8 && r.filtros.x > r.busca.x, r);

    /* LO QUE SE PLIEGA. El filtro de tipo no se ve hasta que se abre. */
    check('los filtros empiezan plegados', r.tipo === null || r.tipo.w === 0, r.tipo);

    await p.evaluate(() => document.getElementById('btnMovFiltros').click());
    await p.waitForTimeout(250);
    const r2 = await p.evaluate(() => {
      const e = document.getElementById('movTypeFilter');
      const c = document.getElementById('btnExportCSV');
      const b = e.getBoundingClientRect(), b2 = c.getBoundingClientRect();
      return { tipo: b.width > 0, csv: b2.width > 0,
               desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    check('al pulsar Filters se abren', r2.tipo && r2.csv, r2);
    check('...sin salirse de lado', r2.desborde <= 2, r2);

    console.log('\n═══ 3 · UN FILTRO PUESTO NO SE PUEDE ESCONDER ═══\n');

    /* ESTO ES LO QUE HACE QUE PLEGAR SEA ACEPTABLE. Un filtro escondido que
     * nadie recuerda haber puesto es una tabla que miente sin avisar: enseña
     * tres movimientos de ciento ochenta y parece que el almacén está vacío. */
    await p.evaluate(() => {
      const e = document.getElementById('movTypeFilter');
      e.value = 'EXIT'; e.dispatchEvent(new Event('change'));
      document.getElementById('movToolbar').classList.remove('filtros-abiertos');
      renderMovements();
    });
    await p.waitForTimeout(300);
    const r3 = await p.evaluate(() => {
      const btn = document.getElementById('btnMovFiltros');
      return { texto: btn.textContent.trim(), encendido: btn.classList.contains('con-filtros'),
               abierto: document.getElementById('movToolbar').classList.contains('filtros-abiertos') };
    });
    check('con un filtro puesto, el botón lo dice', /1/.test(r3.texto), r3);
    check('...y se enciende', r3.encendido, r3);
    check('...y se vuelve a abrir solo', r3.abierto, r3);

    check('ni un error en la página', p._err.filter(m => !/ResizeObserver/.test(m)).length === 0, p._err[0]);
    await p.close();
  }

  console.log('\n═══ 4 · EN EL ORDENADOR NO SE MOVIÓ NI UN PÍXEL ═══\n');

  {
    const p = await abrir({ viewport: { width: 1600, height: 900 } });
    const r = await p.evaluate(() => {
      const g = id => { let e = document.getElementById(id); if (!e) return null;
        if (e.parentElement && e.parentElement.classList.contains('tiene-x')) e = e.parentElement;
        const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top) }; };
      const tb = document.getElementById('movToolbar');
      return {
        filtrosWrap: getComputedStyle(document.getElementById('movFiltros')).display,
        botonFiltros: getComputedStyle(document.getElementById('btnMovFiltros')).display,
        // El orden de izquierda a derecha es el de siempre.
        busca: g('movSearch'), tipo: g('movTypeFilter'), cat: g('movCatFilter'),
        csv: g('btnExportCSV'), viejo: g('btnLoadOlderHistory'),
        entry: g('btnEntry'), exit: g('btnExit'),
        /* UN RENGLÓN SE MIDE POR LA DISTANCIA, NO POR CUBOS. El primer
         * intento agrupaba por `top/10` redondeado, y tres controles de la
         * MISMA fila —116, 115 y 114— caían en dos cubos distintos por dos
         * píxeles de diferencia de alto. Decía «dos renglones» sobre una barra
         * que tiene uno.
         *
         * Y se miden los SIETE controles, no los hijos de la barra: cuatro de
         * ellos viven dentro de `#movFiltros`, que con `display:contents` no
         * devuelve caja. Contar hijos dejaba fuera justo lo que se agrupó. */
        alturas: ['movSearch','movTypeFilter','movCatFilter','btnExportCSV',
                  'btnLoadOlderHistory','btnEntry','btnExit']
          .map(function(id){ const e = document.getElementById(id);
            return e ? Math.round(e.getBoundingClientRect().top) : null; })
          .filter(function(v){ return v !== null; })
      };
    });
    /* `display:contents` es lo que permite agrupar sin cambiar el reparto: la
     * caja no se dibuja y sus hijos se colocan como si no existiera. */
    check('la caja de filtros no existe para el reparto', r.filtrosWrap === 'contents', r.filtrosWrap);
    check('el botón de filtros no se ve', r.botonFiltros === 'none', r.botonFiltros);
    check('el orden de la barra es el de siempre',
      r.busca.x < r.tipo.x && r.tipo.x < r.cat.x && r.cat.x < r.csv.x &&
      r.csv.x < r.viejo.x && r.viejo.x < r.entry.x && r.entry.x < r.exit.x, r);
    check('...y sigue siendo UN solo renglón',
      Math.max.apply(null, r.alturas) - Math.min.apply(null, r.alturas) <= 8, r.alturas);
    await p.close();
  }

  await b.close();

  if (fallos.length) {
    console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
    console.error('  Movements se abre decenas de veces al día desde la bodega.\n' +
                  '  Si lo primero que se ve es una pila de controles, la pantalla\n' +
                  '  empieza con un desplazamiento que nadie pidió.\n');
    process.exit(1);
  }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
