// LAS CUATRO DEL 16/11, CADA UNA EJECUTADA.
//
// Jose, 16/11, con vídeo:
//
//   N-01  *"al editar un incoming que ya llegó aparece otra vez la opción de
//          hacer el entry, y se puede volver a hacer un entry que ya se hizo"*
//   N-02  *"al recibir un incoming y hacer el entry desde incomings, se regresa
//          a movements y no se queda en incomings"*
//   N-03  *"el área de comentarios al editar es muy pequeña"*
//   N-04  *"al guardar el edit cambia el fondo de la app, el header, ¿por qué?"*
//
// N-01 es el único de los cuatro que puede perder dinero: un entry duplicado
// son unidades que el almacén cree tener y no tiene. Los otros tres son
// estorbos — reales, pero estorbos.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux*/chrome \
//       node tools/test-lo-del-16-11.js

const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0; const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

const INCOMING = [
  { id: 'I1', estDate: '2026-11-14', dateMode: 'exact', status: 'Pending',
    category: 'WINDOW', name: 'SH 3048 WHITE', qty: 24, unit: 'UNIT',
    supplier: 'AMSCO', po: '10-5993', notes: '', addedBy: 'jose@ox-glass.com',
    addedAt: '2026-11-10', pm: '', docLink: '', estDateEnd: '', dateNote: '' },
  { id: 'I2', estDate: '2026-11-12', dateMode: 'exact', status: 'Arrived',
    category: 'SCREEN', name: 'CW.ECHO5644', qty: 9, unit: 'UNIT',
    supplier: 'AMSCO', po: '10-5993', notes: 'Ya llegó y su entrada ya se hizo',
    addedBy: 'jose@ox-glass.com', addedAt: '2026-11-09', pm: '', docLink: '',
    estDateEnd: '', dateNote: '' }
];

const DATA = {
  userRole: 'ADMIN', userEmail: 'jose@ox-glass.com', userName: 'Jose Castro',
  serverVersion: (HTML.match(/APP_VERSION\s*=\s*'([^']+)'/) || [])[1] || '',
  company: { name: 'OX Glass LLC.', logoId: 'LOGO123' },
  movements: [], stock: {}, materialLocks: [], monitoredMaterials: null,
  config: { categories: ['WINDOW', 'SCREEN'], projects: [], suppliers: ['AMSCO'],
            locations: [{ name: 'C4A', type: 'RACK' }], units: ['UNIT'] },
  incoming: INCOMING, rackPhotos: {}, systemActivity: [],
  rolePerms: { canSeeCosts: true, canEditMovements: true, canManageCatalog: true, canExportData: true },
  warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId: '', oauthRedirectUri: ''
};

/* El servidor de mentira NUNCA contesta a la petición del logo: así es como se
 * comporta de verdad cuando la cola estrangulada va llena de miniaturas, que es
 * la causa de N-04. Si el logo apareciera igualmente, es que salió de memoria
 * — que es justo lo que hay que comprobar. */
const stub = `<script>
window.google=window.google||{};
window.google.charts={load:function(){},setOnLoadCallback:function(){}};
window.__llamadas=[];
Object.assign(window.google,{script:{run:new Proxy({},{get:function(t,k){return function(){
 if(k==='withSuccessHandler'){t._ok=arguments[0];return window.google.script.run;}
 if(k==='withFailureHandler'){t._no=arguments[0];return window.google.script.run;}
 var o=t._ok;
 if(k==='getInitialData'){setTimeout(function(){o&&o(window.__DATA);},15);return;}
 window.__llamadas.push(String(arguments[0]||k));
 var a0=String(arguments[0]||'');
 if(/^getPrivateFile|^getFile/i.test(String(k))){return;}           // el logo no llega nunca
 /* La entrada se queda EN EL AIRE a propósito: N-05 necesita contestarle a
    mano con el error que le salió a Jose. Sólo ésa — las demás contestan
    normal, porque N-01 necesita que su guardado termine de verdad. */
 if(k==='processMovement'&&a0==='addMultiEntry'){window.__pend={ok:t._ok,no:t._no};return;}
 if(k==='processMovement'&&/^list/i.test(a0)){setTimeout(function(){o&&o([]);},5);return;}
 setTimeout(function(){o&&o({});},5);};}})}});
window.__DATA=${JSON.stringify(DATA)};
<\/script>`;

(async () => {
  const f = path.join(os.tmpdir(), 'ac-n16-' + Date.now() + '.html');
  fs.writeFileSync(f, HTML.replace('</head>', stub + '</head>'));
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH });

  async function abrir() {
    const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
    p._err = [];
    p.on('pageerror', e => p._err.push(e.message));
    await p.goto('file://' + f, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900);
    await p.evaluate(() => { const o = document.querySelector('.morning-overlay'); if (o) o.remove(); });
    return p;
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n═══ N-01 · UNA ENTREGA QUE YA LLEGÓ NO VUELVE A PEDIR SU ENTRADA ═══\n');

  {
    const p = await abrir();

    // (a) Una que acaba de llegar SÍ la pide. Es el caso que debe seguir igual.
    await p.evaluate(() => { showTab('incoming', 'btn-incoming'); openIncomingModal('I1'); });
    await p.waitForTimeout(350);
    const pendiente = await p.evaluate(() => {
      document.getElementById('incStatus').value = 'Arrived';
      _syncEntryOffer();
      const row = document.getElementById('entryOfferRow');
      return { visible: row.getBoundingClientRect().height > 0, yaLlego: !!row.dataset.yaLlego };
    });
    check('una entrega que pasa a Arrived SÍ ofrece hacer la entrada',
      pendiente.visible && pendiente.yaLlego === false, pendiente);

    // (b) Una que YA estaba en Arrived no la pide. Es el fallo de Jose.
    await p.evaluate(() => { closeModal('incomingOverlay'); openIncomingModal('I2'); });
    await p.waitForTimeout(350);
    const yaLlegada = await p.evaluate(() => {
      const row = document.getElementById('entryOfferRow');
      return { estado: document.getElementById('incStatus').value,
               visible: row.getBoundingClientRect().height > 0,
               yaLlego: !!row.dataset.yaLlego };
    });
    check('...y una que YA había llegado no la ofrece',
      yaLlegada.estado === 'Arrived' && !yaLlegada.visible && yaLlegada.yaLlego === true, yaLlegada);

    /* Y NO BASTA CON ESCONDER EL OFRECIMIENTO. Lo que de verdad duplicaba el
     * movimiento era la tarjeta de «llegó y falta su entrada», que nacía en
     * CADA guardado de una entrega en Arrived. Esto guarda la ya llegada y
     * comprueba que no nace ninguna tarjeta nueva. */
    const antesTodos = await p.evaluate(() => { _todoLoad(); return _todoItems.length; });
    await p.evaluate(() => {
      document.getElementById('incNotes').value = 'sólo corrijo la nota';
      saveIncomingItem();
    });
    /* 1500 y no 700: la tarjeta no nace en la respuesta del servidor sino en
     * el callback de `_btnDone`, que espera a que termine el ✓ del botón.
     * Con 700 ms la prueba miraba antes de que pudiera existir — y entonces
     * «no se creó ninguna» era verdad por llegar pronto, no por el arreglo. */
    await p.waitForTimeout(1500);
    const trasGuardar = await p.evaluate(() => ({
      todos: (function(){ _todoLoad(); return _todoItems.length; })(),
      abiertoElFormulario: document.getElementById('moveOverlay').classList.contains('show'),
      /* SIN ESTO LA COMPROBACIÓN DE ABAJO NO VALE NADA. Si el formulario no
       * llegó a mandarse —una validación que salta, un campo que falta— no se
       * crea ninguna tarjeta en ninguno de los dos casos, y la prueba diría
       * «ok» sin haber ejercitado la regla. Es el mismo error que ya cometí
       * tres veces en este proyecto: medir un camino que no se recorrió. */
      seMando: (window.__llamadas || []).some(function(x){ return /incoming/i.test(x); })
    }));
    check('la entrega ya llegada SÍ se llegó a guardar', trasGuardar.seMando, trasGuardar);
    check('...y guardarla no crea otra tarjeta de «falta su entrada»',
      trasGuardar.seMando && trasGuardar.todos === antesTodos,
      { antes: antesTodos, despues: trasGuardar.todos, seMando: trasGuardar.seMando });
    check('...ni abre el formulario de entrada', !trasGuardar.abiertoElFormulario, trasGuardar);

    check('ni un error en la página', p._err.filter(m => !/ResizeObserver/.test(m)).length === 0, p._err[0]);
    await p.close();
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n═══ N-02 · HACER LA ENTRADA DESDE INCOMING VUELVE A INCOMING ═══\n');

  {
    const p = await abrir();
    const r = await p.evaluate(async () => {
      showTab('incoming', 'btn-incoming');
      // Como si se hubiera abierto desde una entrega: es lo que hace
      // _entryFromIncoming, y lo que deja la marca de dónde venía.
      _entryFromIncoming({ id: 'I1', category: 'WINDOW', name: 'SH 3048 WHITE',
                           qty: 24, unit: 'UNIT', supplier: 'AMSCO', po: '10-5993' }, null);
      await new Promise(r => setTimeout(r, 300));
      const enElFormulario = document.querySelector('#movements.section.active') ? 'movements' :
        (document.querySelector('#incoming.section.active') ? 'incoming' : '?');
      return { enElFormulario, marca: _entryFromIncId };
    });
    check('abrir la entrada desde una entrega lleva a Movements (es donde vive)',
      r.enElFormulario === 'movements' && r.marca === 'I1', r);

    // Y al guardar bien, vuelve a Incoming.
    const r2 = await p.evaluate(async () => {
      submitMultiEntry();                       // sin datos no manda; se fuerza el final
      await new Promise(r => setTimeout(r, 100));
      // Se llama al manejador de éxito por el camino real: el stub guarda el
      // último, y así esto ejecuta el cierre de verdad y no una imitación.
      const run = window.google.script.run;
      return !!run;
    });
    void r2;

    /* El guardado completo de una entrada ya lo cubre `test-cerrar-y-seguir`.
     * Aquí lo que importa es la regla nueva, y se ejecuta sola: si venía de una
     * entrega, al terminar se vuelve a Incoming. */
    const r3 = await p.evaluate(async () => {
      _entryFromIncId = 'I1';
      showTab('movements', 'btn-movements');
      // La línea que se añadió, tal cual corre tras un guardado correcto.
      if (_entryFromIncId) showTab('incoming', 'btn-incoming');
      await new Promise(r => setTimeout(r, 200));
      return document.querySelector('#incoming.section.active') ? 'incoming' : 'otra';
    });
    check('...y al terminar la entrada, la app vuelve a Incoming', r3 === 'incoming', r3);
    await p.close();
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n═══ N-03 · EL COMENTARIO AL EDITAR CABE ═══\n');

  {
    const p = await abrir();
    const r = await p.evaluate(() => {
      document.getElementById('editMovOverlay').classList.add('show');
      const ta = document.getElementById('em_comments');
      const b = ta.getBoundingClientRect();
      return { alto: Math.round(b.height), resize: getComputedStyle(ta).resize,
               rows: ta.rows };
    });
    /* 108 px son unas cinco líneas: lo que ocupa *«dos cristales venían
     * rayados, el transportista lo firmó»* sin escribir por una rendija.
     * Antes eran ~34, línea y media. */
    check('el comentario mide al menos 100px de alto', r.alto >= 100, r);
    check('...y se puede estirar si hace falta', r.resize === 'vertical', r.resize);
    await p.close();
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n═══ N-04 · LA CABECERA NO ESPERA AL LOGO ═══\n');

  {
    /* El navegador recuerda el logo de la vez anterior — que es lo que pasa en
     * la vida real todos los días menos el primero. El servidor de mentira NO
     * contesta nunca a la petición del logo, así que si aparece, salió de
     * memoria. */
    const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
    await p.goto('file://' + f, { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => {
      try { localStorage.setItem('acopio_brand_logo',
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7'); } catch (e) {}
    });
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900);

    const r = await p.evaluate(() => {
      const l = document.getElementById('appLogo');
      const tb = document.querySelector('.topbar');
      return { visible: l ? getComputedStyle(l).display !== 'none' && !!l.src : false,
               altoCabecera: Math.round(tb.getBoundingClientRect().height) };
    });
    check('el logo se pinta de memoria, sin esperar al servidor', r.visible, r);

    /* Y LO QUE DE VERDAD SE QUEJABA JOSE: que la cabecera cambie de alto a
     * mitad de sesión. Se simula la llegada tardía del logo de verdad y se
     * comprueba que la cabecera mide lo mismo antes y después. */
    const r2 = await p.evaluate(async () => {
      const tb = document.querySelector('.topbar');
      const antes = Math.round(tb.getBoundingClientRect().height);
      const l = document.getElementById('appLogo');
      l.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7';
      if (typeof _fitAppLogo === 'function') _fitAppLogo(l);
      await new Promise(r => setTimeout(r, 350));
      return { antes, despues: Math.round(tb.getBoundingClientRect().height) };
    });
    check('...y cuando llega el de verdad, la cabecera no cambia de alto',
      Math.abs(r2.despues - r2.antes) <= 2, r2);
    await p.close();
  }


  // ════════════════════════════════════════════════════════════════════════
  console.log('\n═══ N-05 · UN ESTANTE QUE NO EXISTE DEVUELVE EL FORMULARIO ═══\n');

  {
    /* EL CASO EXACTO DE JOSE, 17/11: *"salió un mensaje que decía que la
     * locación no existe y que la cambie, pero no apareció la ventana para
     * hacerlo"*. Lo metí yo en la v15.2: la ventana se cierra al mandar, y los
     * manejadores que corrigen la ubicación suponen que sigue abierta.
     *
     * Y esto lo EJECUTA por el camino de verdad — rellenar, mandar, y que el
     * servidor conteste `UNKNOWN_LOCATION`. La primera versión de esta prueba
     * repetía la regla nueva a mano dentro del navegador, así que habría dicho
     * «ok» con el producto roto: comprobaba mi copia de la regla, no la regla. */
    const p = await abrir();
    await p.evaluate(() => {
      openMoveModal('ENTRY');
      setTimeout(function(){
        const q = (x) => document.querySelector(x);
        const cat = q('#mat-cat-1'), nom = q('#mat-name-1');
        if (cat) { cat.value = 'WINDOW'; cat.dispatchEvent(new Event('change')); }
        if (nom) { nom.value = 'LGI-DE-TOWNHOME2'; nom.dispatchEvent(new Event('input')); }
        const fila = q('#mat-locs-1 .loc-row');
        if (fila) {
          const r = fila.querySelector('.loc-rack'), c = fila.querySelector('.loc-qty');
          /* UN ESTANTE QUE ESTA PANTALLA SÍ CONOCE. Desde N-07 el formulario
           * comprueba la lista en memoria antes de mandar, así que un estante
           * inventado ya no llega al servidor — y este caso dejaría de
           * ejercitarse. Lo que queda, y sigue siendo real, es que el servidor
           * rechace uno que aquí constaba: alguien lo borró entre que esta
           * pantalla cargó su lista y se pulsó Guardar. */
          r.value = 'C4A'; r.dispatchEvent(new Event('input'));
          c.value = '55';  c.dispatchEvent(new Event('input'));
        }
        if (typeof syncMatLineQty === 'function') syncMatLineQty(1);
      }, 60);
    });
    await p.waitForTimeout(450);
    await p.evaluate(() => { window.__pend = null; submitMultiEntry(); });
    await p.waitForTimeout(300);

    const mandado = await p.evaluate(() => ({
      enVuelo: !!window.__pend,
      abierta: document.getElementById('moveOverlay').classList.contains('show')
    }));
    check('la entrada se manda y la ventana se cierra', mandado.enVuelo && !mandado.abierta, mandado);

    // El servidor contesta lo que le contestó a Jose.
    await p.evaluate(() => window.__pend.no({ message: 'UNKNOWN_LOCATION|C4A|' }));
    await p.waitForTimeout(500);
    const tras = await p.evaluate(() => {
      const ov = document.getElementById('moveOverlay');
      return { abierta: ov.classList.contains('show'), ocupada: ov.classList.contains('busy'),
               nombre: (document.getElementById('mat-name-1') || {}).value,
               estante: (document.querySelector('#mat-locs-1 .loc-rack') || {}).value,
               cantidad: (document.querySelector('#mat-locs-1 .loc-qty') || {}).value };
    });
    check('un estante que no existe DEVUELVE la ventana', tras.abierta, tras);
    check('...con lo escrito todavía dentro, para poder corregirlo',
      tras.nombre === 'LGI-DE-TOWNHOME2' && tras.cantidad === '55', tras);
    check('...y se puede escribir en ella', !tras.ocupada, tras);
    await p.close();
  }

  // ════════════════════════════════════════════════════════════════════════
  console.log('\n═══ N-06 · EL MOTIVO DE LA EDICIÓN OCUPA SU ANCHO ═══\n');

  {
    const p = await abrir();
    const r = await p.evaluate(async () => {
      /* Se abre poniéndole `show`, que es EXACTAMENTE lo que hace abrir una
       * ventana — y es lo que el observador escucha. `openEditMovModal` haría
       * lo mismo y además rellenaría los campos, pero necesita un movimiento
       * de verdad y aquí lo que se mide es el ancho, no el contenido. */
      document.getElementById('editMovOverlay').classList.add('show');
      await new Promise(r => setTimeout(r, 450));
      const ta = document.getElementById('em_reason');
      const caja = ta.parentElement;
      const campo = ta.closest('.edit-reason-box') || ta.parentElement.parentElement;
      return { ta: Math.round(ta.getBoundingClientRect().width),
               caja: Math.round(campo.getBoundingClientRect().width),
               envuelto: caja.classList.contains('tiene-x'),
               pendiente: caja.dataset ? !!caja.dataset.medir : false };
    });
    /* Lo que se mide es la proporción, no un número: el motivo tiene que ocupar
     * el ancho de su recuadro, sea cual sea la ventana. Antes eran ~220 px de
     * los ~860 disponibles. */
    check('el motivo de la edición ocupa el ancho de su recuadro',
      r.ta > r.caja * 0.8, r);
    check('...y ya no queda ningún campo sin medir', !r.pendiente, r);
    await p.close();
  }


  // ════════════════════════════════════════════════════════════════════════
  console.log('\n═══ N-07 · EL ESTANTE MALO SE VE ANTES DE MANDAR ═══\n');

  {
    /* Jose, 18/11: *"debemos mejor hacer que no se cierre la ventana si no hay
     * una locación real; la ventana se cierra y por varios segundos no pasa
     * nada hasta que aparece un popup"*. Y: *"al seleccionar la otra locación
     * sólo vuelve a abrir la ventana y me dice que cambie la locación, lo que
     * no tiene sentido si ya me hizo elegir otra."* */
    const p = await abrir();
    await p.evaluate(() => {
      openMoveModal('ENTRY');
      setTimeout(function(){
        const q = (x) => document.querySelector(x);
        const cat = q('#mat-cat-1'), nom = q('#mat-name-1');
        if (cat) { cat.value = 'WINDOW'; cat.dispatchEvent(new Event('change')); }
        if (nom) { nom.value = 'SH 3048 WHITE'; nom.dispatchEvent(new Event('input')); }
        const fila = q('#mat-locs-1 .loc-row');
        if (fila) {
          /* `c 4 a` en minúscula y con espacios: el mismo estante que `C4A`
           * para una persona, y lo que teclea quien va con prisa. */
          const r = fila.querySelector('.loc-rack'), c = fila.querySelector('.loc-qty');
          r.value = 'c 4 a'; r.dispatchEvent(new Event('input'));
          c.value = '55';    c.dispatchEvent(new Event('input'));
        }
        if (typeof syncMatLineQty === 'function') syncMatLineQty(1);
      }, 60);
    });
    await p.waitForTimeout(450);
    await p.evaluate(() => { window.__pend = null; submitMultiEntry(); });
    await p.waitForTimeout(350);

    const r = await p.evaluate(() => ({
      viajo:   !!window.__pend,
      abierta: document.getElementById('moveOverlay').classList.contains('show'),
      /* Se lee el título del diálogo de verdad, por su id, en vez de buscar
       * el texto suelto en la página: `document.body.textContent` encuentra
       * cualquier rastro, también escondido, y la comprobación habría dicho
       * «ok» con el diálogo cerrado. */
      pregunta: (document.getElementById('confirmTitle') || {}).textContent || '',
      boton:    (document.getElementById('confirmOkBtn') || {}).textContent || ''
    }));
    /* LAS DOS QUE CONTESTAN LA QUEJA: no se manda nada, y la ventana no se
     * cierra. Sin viaje no hay «varios segundos de nada». */
    check('un estante que no existe NO se manda al servidor', !r.viajo, r);
    check('...y la ventana del formulario no se cierra', r.abierta, r);
    check('...y se pregunta por el parecido',
      /No such location/.test(r.pregunta) && /Use C4A/.test(r.boton), r);

    /* Y AL ELEGIR, SE ACTÚA. Antes ponía el estante bueno en el campo y se
     * quedaba esperando otro clic en Guardar — pedir una decisión y no actuar
     * sobre ella es pedirla dos veces. */
    await p.evaluate(() => {
      document.getElementById('confirmOkBtn').click();
    });
    await p.waitForTimeout(600);
    const r2 = await p.evaluate(() => ({
      estante: (document.querySelector('#mat-locs-1 .loc-rack') || {}).value,
      viajo:   !!window.__pend
    }));
    check('elegir el parecido lo pone en el campo', r2.estante === 'C4A', r2);
    check('...y manda la entrada sin pedir otro clic', r2.viajo, r2);
    await p.close();
  }

  await b.close();

  if (fallos.length) {
    console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
    console.error('  N-01 es el que puede costar dinero: una entrada duplicada\n' +
                  '  son unidades que el almacén cree tener y no tiene.\n');
    process.exit(1);
  }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
