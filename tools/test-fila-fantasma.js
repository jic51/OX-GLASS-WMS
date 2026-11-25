// N-08 — LA FILA GRIS APARECE EN LA PANTALLA. MEDIDO EN UN NAVEGADOR.
//
// Jose, 25/11, probando la v16.3:
//
//   *"Pues no aparece. Al guardar el entry la ventana se cierra, aparece el
//   toast de guardando (que se vería mejor con un anillo de carga mientras se
//   está creando el entry) y luego de varios segundos aparece la fila de
//   movimiento junto con el toast de los label en el mismo lugar que el toast
//   de guardando. **Nunca aparece la fila gris de carga.**"*
//
// ── LA CAUSA ERA DE UNA LÍNEA, Y NO ES LO IMPORTANTE ─────────────────────────
//
// `_filaFantasma` pedía `document.getElementById('movBody')`. **Ese elemento no
// existe y nunca existió:** la tabla de movimientos se pinta dentro de
// `#tableContainer` y su `<tbody>` no tiene id. Así que la función devolvía
// `null` en cada guardado y lo único que quedaba era el aviso de la esquina —
// exactamente lo que él describe.
//
// ── LO IMPORTANTE ES POR QUÉ NINGUNA PRUEBA LO VIO ───────────────────────────
//
// `test-cerrar-y-seguir` ejercita este mismo camino y pasó en verde las dos
// versiones. Su DOM de mentira contesta a `getElementById` con un elemento para
// CUALQUIER id que se le pida, así que el doble contestaba lo que la prueba
// quería oír mientras el producto no encontraba nada.
//
// Es la cuarta vez este mes que un doble tapa un fallo del lado que no se
// ejecuta, y la primera que llega a manos de Jose. **Por eso esta prueba abre
// un navegador de verdad y mira la pantalla:** un DOM de mentira no puede decir
// si una fila apareció, sólo si se llamó a una función.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-fila-fantasma.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); }
  else { fail++; console.log('  FAIL ' + etiqueta +
    (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}

const MOVS = [];
for (let i = 0; i < 5; i++) {
  MOVS.push({
    rowIdx: 2 + i, movId: 'M' + i, moveType: 'ENTRY',
    category: 'WINDOW', name: 'SINGLE HUNG 3048 ' + i,
    qty: 7 + i, unit: 'UNIT', po: '10' + (400 + i),
    sourceLoc: '', destLoc: 'A1A', project: '', supplier: 'NORTHGATE SUPPLY',
    responsible: 'SAM ORTEGA', comments: '', pm: '', gc: '',
    userEmail: 'sam@cedarlineglass.com', docLinks: '',
    dateRec: '2026-11-20', timestamp: '2026-11-20 09:0' + i,
    unitCost: '', totalCost: ''
  });
}

const DATA = {
  userRole: 'ADMIN', userEmail: 'sam@cedarlineglass.com', userName: 'Sam Ortega',
  serverVersion: (HTML.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || '',
  company: { name: 'Cedarline Glass Co.' },
  movements: MOVS, stock: {}, materialLocks: [], monitoredMaterials: null,
  config: { categories: ['WINDOW'], projects: [], suppliers: ['NORTHGATE SUPPLY'],
            locations: [{ name: 'A1A', type: 'RACK' }], units: ['UNIT'] },
  incoming: [], rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts: true, canEditMovements: true, canManageCatalog: true, canExportData: true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId: '', oauthRedirectUri: ''
};

/* EL SERVIDOR NO CONTESTA HASTA QUE LA PRUEBA LO DIGA. Es la única forma de
   mirar lo que se ve DURANTE la espera, que es justo lo que falló: con una
   respuesta inmediata, la fila gris nacería y moriría en el mismo instante y
   nadie podría decir si existió. */
const stub = `<script>
window.google=window.google||{};
window.google.charts={load:function(){},setOnLoadCallback:function(){}};
window.__pend=[];
Object.assign(window.google,{script:{run:new Proxy({},{get:function(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){t._no=arguments[0];return window.google.script.run;}
 var o=t._ok, n=t._no;
 if(k==='getInitialData'){setTimeout(function(){o&&o(window.__DATA);},15);return;}
 var a0=String(arguments[0]||'');
 if(k==='processMovement'&&/^list/i.test(a0)){setTimeout(function(){o&&o([]);},5);return;}
 if(k==='processMovement'&&/^addMulti/i.test(a0)){window.__pend.push({ok:o,no:n});return;}
 setTimeout(function(){o&&o({});},5);};}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;

(async () => {
  const f = path.join(os.tmpdir(), 'ac-fantasma-' + Date.now() + '.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));

  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto('file://' + f, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  await p.evaluate(() => showTab('movements', 'btn-movements'));
  await p.waitForTimeout(400);

  console.log('\n═══ 1 · EL SITIO EXISTE ═══\n');
  {
    /* LA COMPROBACIÓN QUE HABRÍA AHORRADO ESTO. Sin ella, lo de abajo podría
       fallar por treinta razones y ninguna diría cuál. */
    const r = await p.evaluate(() => ({
      viejo: !!document.getElementById('movBody'),
      nuevo: !!document.querySelector('#tableContainer tbody'),
      filas: document.querySelectorAll('#tableContainer tbody tr').length
    }));
    check('la tabla de movimientos está pintada', r.filas >= 5, r.filas);
    check('`#tableContainer tbody` existe — es el sitio de verdad', r.nuevo === true);
    check('`movBody` NO existe, que es lo que la función pedía y por lo que ' +
          'nunca encontró nada', r.viejo === false, r.viejo);
  }

  console.log('\n═══ 2 · AL GUARDAR, LA FILA GRIS APARECE ═══\n');
  {
    /* Se llama al camino de verdad: el guardado de una entrada de varios
       materiales, que es el que Jose usa. Nada de invocar `_filaFantasma` a
       mano — eso mediría la función, no el producto. */
    await p.evaluate(() => {
      _cerrarYSeguir('moveOverlay', function(){}, 'SINGLE HUNG 3048 · 12');
    });
    await p.waitForTimeout(250);

    const r = await p.evaluate(() => {
      var tb = document.querySelector('#tableContainer tbody');
      var f  = tb ? tb.querySelector('tr.fila-fantasma') : null;
      var av = document.querySelector('#toastContainer .toast');
      var caja = f ? f.getBoundingClientRect() : null;
      return {
        existe: !!f,
        esLaPrimera: !!f && tb.firstElementChild === f,
        texto: f ? f.textContent.trim() : null,
        visible: !!caja && caja.height > 0 && caja.width > 0,
        anima: f ? getComputedStyle(f.querySelector('td')).animationName : null,
        punto: !!f && !!f.querySelector('.fantasma-pt'),
        // El aviso, y su anillo
        avisoTipo: av ? av.getAttribute('data-tipo') : null,
        avisoTexto: av ? (av.querySelector('.toast-msg') || {}).textContent : null,
        anillo: !!(av && av.querySelector('.toast-icon .btn-spin')),
        anilloGira: av && av.querySelector('.toast-icon .btn-spin')
          ? getComputedStyle(av.querySelector('.toast-icon .btn-spin')).animationName : null
      };
    });

    check('LA FILA GRIS EXISTE — es el fallo que Jose vio el 25/11',
      r.existe === true, r);
    check('...y está ARRIBA de la lista, donde va a aparecer la de verdad',
      r.esLaPrimera === true);
    check('...y se ve de verdad en la pantalla (alto y ancho mayores que cero)',
      r.visible === true, r.visible);
    check('dice el material y la cantidad', /SINGLE HUNG 3048/.test(r.texto || '') &&
      /12/.test(r.texto || ''), r.texto);
    check('y dice que está guardando', /saving/i.test(r.texto || ''), r.texto);
    check('late: la animación está puesta de verdad, no sólo escrita',
      r.anima === 'fantasmaLatido', r.anima);
    check('lleva su punto', r.punto === true);

    console.log('');
    check('el aviso de la esquina sigue estando', /Saving/.test(r.avisoTexto || ''),
      r.avisoTexto);
    check('EL ANILLO DE CARGA está, que es lo que pidió Jose — un icono quieto ' +
          'se lee como etiqueta, no como movimiento', r.anillo === true, r);
    check('...y gira de verdad', r.anilloGira === 'btn-spin', r.anilloGira);
  }

  console.log('\n═══ 3 · Y SE VA CUANDO EL SERVIDOR CONTESTA ═══\n');
  {
    await p.evaluate(() => {
      /* Se contesta como contesta el servidor de verdad, para que el camino de
         éxito corra entero: si se limpiara desde otro sitio, esto mediría una
         limpieza que en producción no ocurre. */
      _limpiarGuardando();
    });
    await p.waitForTimeout(60);
    /* DOS MOMENTOS, Y LOS DOS IMPORTAN. `dismissToast` marca el aviso para que
       se desvanezca y lo quita 320 ms después. Mirar sólo el final no
       distinguiría «no se mandó quitar» de «se está yendo», y mirar sólo el
       principio dejaría pasar un aviso que se marca y nunca se va. */
    const ya = await p.evaluate(() => ({
      fila: !!document.querySelector('#tableContainer tbody tr.fila-fantasma'),
      seVa: !!document.querySelector('#toastContainer .toast[data-tipo="cargando"].fade-out')
    }));
    check('la fila gris se fue EN EL ACTO — no espera ninguna animación, ' +
          'porque lo que viene detrás es la fila de verdad', ya.fila === false);
    check('y al aviso de guardando se le mandó irse', ya.seVa === true, ya);

    await p.waitForTimeout(420);
    const r = await p.evaluate(() => ({
      avisos: document.querySelectorAll('#toastContainer .toast[data-tipo="cargando"]').length
    }));
    check('...y ya no está: no se queda debajo del aviso de las etiquetas',
      r.avisos === 0, r.avisos);
    /* UNA FILA FANTASMA QUE SE QUEDA ES PEOR QUE NO HABERLA PUESTO: parece un
       movimiento de verdad que no se puede tocar. */
  }

  console.log('\n═══ 4 · NINGÚN ERROR SUELTO ═══\n');
  check('sin errores de página', errores.length === 0, errores.slice(0, 3));

  await b.close();
  console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
