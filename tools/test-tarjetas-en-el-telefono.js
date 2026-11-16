// M-01 · EN EL TELÉFONO, CADA MOVIMIENTO ES UNA TARJETA QUE CABE.
//
// Jose, 11/11, con una captura de Movements en su teléfono: *"en el teléfono
// la app debe comportarse como una app; cada fila o movimiento debe mostrar
// sus propias opciones, y debe ser del tamaño de una tarjeta que entre en la
// pantalla con toda la información… si es posible, sin mover nada"*.
//
// ── LO QUE SE MIDE, Y POR QUÉ NO SE PUEDE LEER DEL CSS ─────────────────────
//
// Lo que hay que comprobar es **que no haya que arrastrar de lado**, y eso no
// está escrito en ninguna regla: sale de sumar anchos, márgenes y el
// `min-width` que `_fijarMinTabla` pone en cada dibujado. Una regla puede
// decir `min-width:0` y perder contra otra más específica, y el archivo
// seguiría diciendo lo correcto. Aquí se dibuja en tres teléfonos de verdad y
// se mide el desbordamiento.
//
// Y se comprueba lo contrario con la misma fuerza: **en el ordenador sigue
// siendo una tabla**. Un arreglo del teléfono que se cuela en el escritorio es
// un arreglo peor que el fallo.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux*/chrome \
//       node tools/test-tarjetas-en-el-telefono.js

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

/* Movimientos con los campos llenos y vacíos mezclados, que es como son de
 * verdad: una entrada lleva proveedor y PO, una salida no lleva ninguno. */
const MOVS = [];
for (let i = 0; i < 12; i++) {
  const entrada = i % 3 === 0;
  MOVS.push({
    rowIdx: 2 + i, movId: 'M' + i,
    moveType: entrada ? 'ENTRY' : (i % 3 === 1 ? 'EXIT' : 'TRANSFER'),
    category: 'WINDOW',
    name: 'SINGLE HUNG 3048 WHITE LOW-E ' + i,
    qty: 7 + i, unit: 'UNIT',
    po: entrada ? '10' + (400 + i) : '',
    sourceLoc: entrada ? '' : 'B2C', destLoc: entrada ? 'A1A' : 'D3B',
    project: entrada ? '' : 'MAPLE STREET REMODEL',
    supplier: entrada ? 'NORTHGATE SUPPLY' : '',
    responsible: 'SAM ORTEGA',
    comments: i % 4 === 0 ? 'Two panes chipped, check before pulling' : '',
    pm: '', gc: '', userEmail: 'sam@cedarlineglass.com', docLinks: '',
    dateRec: '2026-11-' + String(10 + (i % 5)).padStart(2, '0'),
    timestamp: '2026-11-12 09:0' + (i % 9), unitCost: '', totalCost: ''
  });
}

const DATA = {
  userRole: 'ADMIN', userEmail: 'sam@cedarlineglass.com', userName: 'Sam Ortega',
  serverVersion: (HTML.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || '',
  company: { name: 'Cedarline Glass Co.' },
  movements: MOVS, stock: {}, materialLocks: [], monitoredMaterials: null,
  config: { categories: ['WINDOW'], projects: ['MAPLE STREET REMODEL'],
            suppliers: ['NORTHGATE SUPPLY'], locations: [{ name: 'A1A', type: 'RACK' }],
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
  const f = path.join(os.tmpdir(), 'ac-m01-' + Date.now() + '.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));

  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });

  async function abrir(opciones) {
    const p = await b.newPage(opciones);
    p._err = [];
    p.on('pageerror', e => p._err.push(e.message));
    await p.goto('file://' + f, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900);
    await p.evaluate(() => showTab('movements', 'btn-movements'));
    await p.waitForTimeout(500);
    return p;
  }

  console.log('\n═══ 1 · NO HAY QUE ARRASTRAR DE LADO, EN TRES TELÉFONOS ═══\n');

  for (const nombre of TELEFONOS) {
    const p = await abrir(devices[nombre]);
    const r = await p.evaluate(() => {
      const tc = document.getElementById('tableContainer');
      const tr = tc.querySelector('tbody tr');
      return {
        modo:    tc.classList.contains('mov-tarjetas'),
        // Lo único que de verdad importa: ¿se sale algo del ancho de la pantalla?
        desbordePagina: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        desbordeCaja:   tc.scrollWidth - tc.clientWidth,
        anchoTarjeta:   tr ? Math.round(tr.getBoundingClientRect().width) : 0,
        pantalla:       window.innerWidth
      };
    });
    check(nombre + ': la tabla se dibuja como tarjetas', r.modo, r);
    /* ESTA ES LA COMPROBACIÓN QUE CONTESTA LA QUEJA. 2 px de tolerancia por el
     * redondeo del navegador al escalar; más que eso es arrastrar. */
    check(nombre + ': no se desborda de lado', r.desbordePagina <= 2 && r.desbordeCaja <= 2, r);
    check(nombre + ': la tarjeta ocupa el ancho de la pantalla',
      r.anchoTarjeta > r.pantalla * 0.8, r);
    await p.close();
  }

  console.log('\n═══ 2 · LO ESENCIAL SE VE; EL RESTO ESPERA AL TOQUE ═══\n');

  {
    const p = await abrir(devices['Pixel 5']);

    const visible = (sel) => p.evaluate((s) => {
      const el = document.querySelector('#tableContainer tbody tr ' + s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }, sel);

    check('se ve el material', await visible('td.mc-what') === true);
    check('se ve la cantidad', await visible('td.mc-qty') === true);
    check('se ve el tipo y la fecha', await visible('td.mc-when') === true);
    check('NO se ve todavía quién lo registró', await visible('td.mc-user') === false);
    check('...ni el comentario', await visible('td.mc-comment') === false);

    /* LA PISTA. Si no hay nada que diga que hay más, la mitad de los datos
     * existe y nadie lo sabe — una tarjeta cerrada se lee como completa. */
    const pista = await p.evaluate(() => {
      const tr = document.querySelector('#tableContainer tbody tr');
      return getComputedStyle(tr, '::before').content || '';
    });
    check('la tarjeta avisa de que hay más', /More/.test(pista), pista);

    // Y ahora se toca.
    await p.evaluate(() => {
      document.querySelector('#tableContainer tbody tr td.mc-what').click();
    });
    await p.waitForTimeout(250);

    check('al tocarla, aparece quién lo registró', await visible('td.mc-user') === true);
    check('...y el resto de los datos', await visible('td.mc-comment') === true);

    /* LAS OPCIONES VIENEN EN EL MISMO GESTO. Jose eligió las dos cosas por
     * separado y son el mismo toque, así que abren la tarjeta entera. */
    const botones = await p.evaluate(() => {
      const tr = document.querySelector('#tableContainer tbody tr.abierta');
      const b = tr ? tr.querySelectorAll('td:last-child button') : [];
      return Array.prototype.map.call(b, function(x){
        const r = x.getBoundingClientRect();
        return { t: x.getAttribute('data-rowact'), w: Math.round(r.width), h: Math.round(r.height) };
      });
    });
    check('...y sus propias opciones, en el mismo toque', botones.length >= 2, botones);
    /* 44 px es el mínimo que se puede tocar con un dedo, y es la misma regla
     * que se aplicó a la casilla en la v14.9. Con guantes, más. */
    check('...que se pueden tocar con el dedo',
      botones.length >= 2 && botones.every(x => x.w >= 44 && x.h >= 44), botones);

    // Y se cierra con otro toque.
    await p.evaluate(() => {
      document.querySelector('#tableContainer tbody tr.abierta td.mc-what').click();
    });
    await p.waitForTimeout(200);
    check('otro toque la vuelve a cerrar', await visible('td.mc-user') === false);

    /* LO QUE NO PUEDE ABRIR LA TARJETA. La casilla de marcar ya hace algo; si
     * además desplegara, marcar diez para borrarlas dejaría diez tarjetas
     * abiertas y la pantalla sería ilegible. */
    await p.evaluate(() => {
      const cb = document.querySelector('#tableContainer tbody tr .mov-select-cb');
      if (cb) cb.click();
    });
    await p.waitForTimeout(200);
    const trasMarcar = await p.evaluate(() => ({
      abierta: !!document.querySelector('#tableContainer tbody tr.abierta'),
      marcada: !!document.querySelector('#tableContainer tbody tr .mov-select-cb:checked')
    }));
    check('marcar la casilla NO abre la tarjeta', trasMarcar.marcada && !trasMarcar.abierta, trasMarcar);

    check('ni un error en la página', p._err.filter(m => !/ResizeObserver/.test(m)).length === 0, p._err[0]);
    await p.close();
  }

  console.log('\n═══ 3 · EN EL ORDENADOR SIGUE SIENDO UNA TABLA ═══\n');

  {
    const p = await abrir({ viewport: { width: 1600, height: 900 } });
    const r = await p.evaluate(() => {
      const tc = document.getElementById('tableContainer');
      const tr = tc.querySelector('tbody tr');
      const td = tc.querySelector('tbody tr td.mc-what');
      return {
        modo: tc.classList.contains('mov-tarjetas'),
        display: tr ? getComputedStyle(tr).display : '',
        cabecera: !!tc.querySelector('thead th'),
        usuarioVisible: (() => { const u = tc.querySelector('td.mc-user');
          if (!u) return null; const b = u.getBoundingClientRect(); return b.width > 0; })(),
        etiqueta: td ? getComputedStyle(td, '::before').content : ''
      };
    });
    check('no entra en modo tarjeta', !r.modo, r);
    check('las filas siguen siendo filas de tabla', /table-row/.test(r.display), r.display);
    check('la cabecera sigue ahí', r.cabecera, r);
    check('y todas las columnas se ven sin tocar nada', r.usuarioVisible === true, r);

    /* El `data-label` viaja en todas las celdas, también en el ordenador —
     * es un atributo, no algo que se vea. Si se viera, la tabla tendría el
     * nombre de la columna repetido en cada celda. */
    check('el nombre de la columna no se repite dentro de cada celda',
      r.etiqueta === 'none' || r.etiqueta === '' || r.etiqueta === 'normal', r.etiqueta);

    /* Y AL ENCOGER LA VENTANA, CAMBIA SOLO. Es lo que hace que una tableta en
     * vertical reciba el mismo trato que un teléfono sin preguntarle qué es. */
    await p.setViewportSize({ width: 420, height: 900 });
    await p.waitForTimeout(350);
    const t2 = await p.evaluate(() =>
      document.getElementById('tableContainer').classList.contains('mov-tarjetas'));
    check('al estrechar la ventana pasa a tarjetas solo', t2 === true);

    await p.close();
  }

  await b.close();

  if (fallos.length) {
    console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
    console.error('  Movements es la pantalla que se mira desde la bodega, de pie\n' +
                  '  y con una mano. Si hay que arrastrarla de lado para leer una\n' +
                  '  fila, no se usa — se vuelve a la oficina.\n');
    process.exit(1);
  }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
