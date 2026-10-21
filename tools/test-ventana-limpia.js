// LA VENTANA DE MOVIMIENTO, LIMPIA — MEDIDA EN EL NAVEGADOR.
//
// Jose, 21/10, marcando cuatro cosas en tres capturas: *"quiero que todas las
// cosas que no se usen no molesten en la pantalla o ventana... analiza qué cosas
// puedes esconder detrás de un checkbox y deja la ventana mucho más limpia"*.
//
// Eran DIECISÉIS controles para registrar «llegaron 20 ventanas, están en A1A».
// Dos de ellos son el movimiento; los otros catorce son contexto que algunas
// bodegas llenan siempre y otras nunca.
//
// ── LAS TRES COSAS QUE SE HICIERON, Y POR QUÉ SON DISTINTAS ─────────────────
//
//   B · Documentos se pliega a una línea. No es un dato del movimiento: es algo
//       que se hace a veces y después. Aquí el checkbox que propuso Jose es
//       exactamente lo correcto.
//   D · La casilla «🏷 Label» se va de la línea de cada material. Imprimir no es
//       un dato de la recepción, y la pregunta se mueve al aviso de guardado,
//       que es donde se puede contestar con los bultos delante.
//   A · Los campos que ESTA bodega nunca llena se pliegan solos. No hay checkbox
//       porque no hay nada que preguntar: la app ya tiene todos los movimientos
//       guardados, y un campo vacío en sesenta movimientos es ruido para esa
//       bodega.
//
// ── LO QUE ESTA PRUEBA DEFIENDE DE VERDAD ───────────────────────────────────
//
// Plegar es fácil; plegar SIN PERDER NADA es lo difícil, y es donde está todo el
// riesgo. Media prueba son las cuatro reglas que lo hacen seguro:
//
//   · con poca historia no se esconde NADA (una instalación nueva no puede
//     decidir por una bodega que todavía no ha dicho nada);
//   · nunca se esconde un campo CON VALOR;
//   · la línea «+ N campos más» está siempre y dice cuántos esconde;
//   · y no se pliega lo que este tipo de movimiento ya tenía escondido, porque
//     decir «+ 3» y abrir para encontrar dos es mentir con un número.
//
// Uso:  node tools/test-ventana-limpia.js

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0; const fails = [];
function check(label, got, want) {
  const bien = (want === undefined) ? !!got : JSON.stringify(got) === JSON.stringify(want);
  if (bien) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + ': esperaba ' + JSON.stringify(want) + ', salió ' + JSON.stringify(got));
         console.log('  FALLA ' + label + '  → ' + JSON.stringify(got)); }
}

/* Una bodega que lleva 40 movimientos y NUNCA ha escrito GC, PO ni jefe de
 * obra, pero sí proveedor y quién lo recibió. Es el caso real: cada almacén
 * usa un subconjunto distinto, y la misma ventana no puede ser la correcta para
 * todos. */
function movs(n, con) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(Object.assign({
      id: 'M' + i, rowIndex: i + 2, moveType: 'ENTRY', category: 'WINDOW',
      name: 'VINYL WINDOW', qty: 5, unit: 'UNIT', date: '2026-09-01',
      destLoc: 'A1A', sourceLoc: '', status: 'In Stock',
      supplier: 'NORTHGATE SUPPLY', gc: '', po: '', project: 'GENERIC',
      responsible: 'SAM', pm: '', comments: '', user: 'jose@ox.com', truck: ''
    }, con || {}));
  }
  return out;
}

function DATOS(opciones) {
  const o = opciones || {};
  return {
    userRole: 'ADMIN', userEmail: 'jose@ox.com', userName: 'Jose', serverVersion: 'test',
    company: { name: 'OX Glass LLC.' },
    movements: o.movements || movs(40),
    stock: {}, materialLocks: [], monitoredMaterials: null,
    config: { categories: ['WINDOW'], projects: [], suppliers: [],
              locations: [{ name: 'A1A', type: 'RACK' }], units: ['UNIT'],
              trucks: o.trucks || [] },
    incoming: [], rackPhotos: {}, systemActivity: [],
    rolePerms: { canSeeCosts: true, canEditMovements: true, canManageCatalog: true, canExportData: true },
    warehouseRoleLabel: 'Warehouse', archiveCutoffMonths: 12, oauthClientId: '', oauthRedirectUri: ''
  };
}

function pagina(datos){
  const stub = `<script>
window.google=window.google||{};window.google.charts={load:function(){},setOnLoadCallback:function(){}};
/* El ayudante que usan todas las comprobaciones. Mira el display CALCULADO y no
   el atributo: un campo se puede esconder por su style (lo hace setModalType) o
   por una clase (lo hace el plegado), y preguntar por uno solo de los dos
   caminos dejaria la mitad sin vigilar. */
window.visibleId=function(id){
  var el=document.getElementById(id);
  if(!el) return 'no existe';
  return getComputedStyle(el).display==='none' ? 'escondido' : 'visible';
};
window.__DATA=${JSON.stringify(datos)};
(function(){
  var ok=null;
  var api={
    withSuccessHandler:function(f){ ok=f; return proxy; },
    withFailureHandler:function(){ return proxy; },
    getInitialData:function(){ var h=ok; setTimeout(function(){h&&h(window.__DATA);},20); },
    processMovement:function(a){ var h=ok, v=(a==='getPmDirectory')?[]:{}; setTimeout(function(){h&&h(v);},10); }
  };
  var proxy=new Proxy(api,{get:function(t,k){
    if(k in t) return t[k];
    return function(){ var h=ok; setTimeout(function(){h&&h({});},10); };
  }});
  window.google.script={run:proxy};
})();
<\/script>`;
  const f = path.join(os.tmpdir(), 'ac-limpia-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(f, html.replace('</head>', stub + '</head>'));
  return f;
}

async function abrir(browser, datos){
  const p = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto('file://' + pagina(datos));
  await p.waitForTimeout(1100);
  return { p, errores };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });

  console.log('\n═══ D · La casilla 🏷 Label ya no está en la línea del material ═══\n');
  {
    const { p, errores } = await abrir(browser, DATOS());
    await p.evaluate(() => openMoveModal('ENTRY'));
    await p.waitForTimeout(150);

    const casilla = await p.evaluate(() =>
      document.querySelectorAll('[id^="mat-label-"]').length);
    check('no queda ninguna casilla de etiqueta en las líneas de material — ' +
          'imprimir no es un dato de la recepción, y en la gratis además era ' +
          'una puerta cerrada en el formulario más usado de la app', casilla, 0);

    /* Y la pregunta NO se perdió: el aviso de guardado la hace. Se mide la
     * pieza que la hace posible, porque montar un guardado entero aquí sería
     * medir el guardado, no esto. */
    const avisoConBoton = await p.evaluate(async () => {
      let pulsado = 0, pasado = 0;
      showToast('Saved ✓', 'ok', 220, {
        texto: '🏷 Print labels',
        hacer: function(){ pulsado++; },
        siNo:  function(){ pasado++; }
      });
      const b = document.querySelector('#toastContainer .toast-accion');
      const texto = b ? b.textContent : null;
      b && b.click();
      await new Promise(r => setTimeout(r, 400));
      return { texto: texto, pulsado: pulsado, pasado: pasado };
    });
    check('el aviso de guardado puede llevar un botón', avisoConBoton.texto, '🏷 Print labels');
    check('al pulsarlo corre lo suyo', avisoConBoton.pulsado, 1);
    check('Y NO corre además lo de «si no se pulsa» — si corrieran las dos, se ' +
          'abrirían dos ventanas a la vez, que es el error que costó la v11.29',
      avisoConBoton.pasado, 0);

    const avisoIgnorado = await p.evaluate(async () => {
      let pulsado = 0, pasado = 0;
      showToast('Saved ✓', 'ok', 200, {
        texto: '🏷 Print labels', hacer: function(){ pulsado++; }, siNo: function(){ pasado++; }
      });
      await new Promise(r => setTimeout(r, 500));
      return { pulsado: pulsado, pasado: pasado };
    });
    check('y si nadie lo pulsa, lo de después corre solo — la pregunta de las ' +
          'entregas no se puede quedar colgada de un botón que nadie tocó',
      avisoIgnorado, { pulsado: 0, pasado: 1 });

    check('ningún error de JavaScript', errores, []);
    await p.close();
  }

  console.log('\n═══ B · Documentos es una línea, y se abre sola si hay algo ═══\n');
  {
    const { p, errores } = await abrir(browser, DATOS());
    await p.evaluate(() => openMoveModal('ENTRY'));
    await p.waitForTimeout(200);

    const plegado = await p.evaluate(() => ({
      linea: visibleId('fileToggle'), cuerpo: visibleId('fileBody')
    }));
    check('al abrir, Documentos es sólo una línea', plegado.linea, 'visible');
    check('...y el bloque entero está plegado', plegado.cuerpo, 'escondido');

    const abierto = await p.evaluate(() => {
      document.getElementById('fileToggle').click();
      return { linea: visibleId('fileToggle'), cuerpo: visibleId('fileBody') };
    });
    check('pulsar la línea lo abre', abierto.cuerpo, 'visible');
    check('...y la línea se quita de en medio', abierto.linea, 'escondido');

    /* LA REGLA QUE IMPIDE PERDER UN ARCHIVO. Plegar encima de algo que alguien
     * ya adjuntó es perderlo de vista, y perderlo de vista es perderlo. */
    const conContenido = await p.evaluate(() => {
      const txt = document.querySelector('#docGroupsContainer input[type=text]');
      if (txt) txt.value = 'ALBARAN 4471';
      _docsPlegar();
      return { cuerpo: visibleId('fileBody'), conContenido: _docsConContenido() };
    });
    check('la app sabe que hay algo dentro', conContenido.conContenido, true);
    check('y entonces SE NIEGA a plegarse — esconder un documento que alguien ' +
          'ya puso es hacerlo desaparecer', conContenido.cuerpo, 'visible');

    const vacio = await p.evaluate(() => {
      const txt = document.querySelector('#docGroupsContainer input[type=text]');
      if (txt) txt.value = 'Document';          // el nombre de serie no cuenta
      _docsPlegar();
      return visibleId('fileBody');
    });
    check('con el nombre de serie sí se pliega — «existe un grupo» no es «hay ' +
          'un documento»', vacio, 'escondido');

    check('ningún error de JavaScript', errores, []);
    await p.close();
  }

  console.log('\n═══ A · Los campos que esta bodega nunca llena ═══\n');
  {
    const { p, errores } = await abrir(browser, DATOS());
    await p.evaluate(() => openMoveModal('ENTRY'));
    await p.waitForTimeout(200);

    const est = await p.evaluate(() => ({
      gc:    visibleId('mGCField'),
      po:    visibleId('mPOField'),
      sup:   visibleId('mSupField'),
      resp:  visibleId('mRespFieldWrap'),
      linea: visibleId('camposMas'),
      texto: (document.getElementById('camposMas') || {}).textContent
    }));
    check('GC se pliega — 40 movimientos sin uno solo', est.gc, 'escondido');
    check('PO# también', est.po, 'escondido');
    check('pero Supplier NO, porque esta bodega sí lo llena', est.sup, 'visible');
    check('ni «Received By»', est.resp, 'visible');
    check('la puerta de vuelta está a la vista', est.linea, 'visible');
    /* CUATRO: GC, PO#, Project y PM. Project entra porque las 40 filas llevan
     * `GENERIC`, que es el relleno que pone la app cuando no hay proyecto — y
     * eso no es alguien escribiendo uno. Sin esa salvedad, «Project» no se
     * plegaría jamás en ninguna instalación. */
    check('...y dice cuántos esconde, que es lo que la hace una puerta y no un ' +
          'adorno', est.texto, '+ 4 more fields');

    const tras = await p.evaluate(() => {
      document.getElementById('camposMas').click();
      return { gc: visibleId('mGCField'), po: visibleId('mPOField'),
               linea: visibleId('camposMas') };
    });
    check('al pulsarla vuelven todos', tras.gc === 'visible' && tras.po === 'visible', true);
    check('y la línea desaparece porque ya no esconde nada', tras.linea, 'escondido');

    /* REGLA 4: quien la abrió está buscando algo. Volver a plegársela en el
     * siguiente movimiento sería discutir con él. */
    const otraVez = await p.evaluate(() => {
      setModalType('EXIT'); setModalType('ENTRY');
      return visibleId('mGCField');
    });
    check('y no se vuelven a plegar al cambiar de pestaña — quien la abrió ' +
          'está buscando algo', otraVez, 'visible');

    check('ningún error de JavaScript', errores, []);
    await p.close();
  }

  console.log('\n═══ A · Las tres reglas que lo hacen seguro ═══\n');
  {
    /* REGLA 1: con poca historia no se esconde nada. Una instalación recién
     * hecha no puede decidir por una bodega que todavía no ha dicho nada. */
    const { p, errores } = await abrir(browser, DATOS({ movements: movs(6) }));
    await p.evaluate(() => openMoveModal('ENTRY'));
    await p.waitForTimeout(200);
    const nueva = await p.evaluate(() => ({
      gc: visibleId('mGCField'), po: visibleId('mPOField'), linea: visibleId('camposMas')
    }));
    check('con 6 movimientos no se esconde NADA — una bodega nueva no ha dicho ' +
          'todavía qué usa', nueva.gc, 'visible');
    check('...ni PO#', nueva.po, 'visible');
    check('...y la línea ni aparece', nueva.linea, 'escondido');
    check('ningún error de JavaScript', errores, []);
    await p.close();
  }
  {
    /* REGLA 2: nunca se esconde un campo CON VALOR. */
    const { p, errores } = await abrir(browser, DATOS());
    const conValor = await p.evaluate(() => {
      openMoveModal('ENTRY');
      document.getElementById('mPO').value = '16598';   // lo puso alguien, o una entrega
      setModalType('ENTRY');                            // vuelve a decidir
      return { po: visibleId('mPOField'), gc: visibleId('mGCField'),
               texto: (document.getElementById('camposMas') || {}).textContent };
    });
    check('un campo CON VALOR no se pliega aunque la historia diga que no se ' +
          'usa — esconder un dato que ya está puesto es hacerlo desaparecer',
      conValor.po, 'visible');
    check('...y los otros sí', conValor.gc, 'escondido');
    check('y la cuenta de la línea baja a los que de verdad esconde',
      conValor.texto, '+ 3 more fields');
    check('ningún error de JavaScript', errores, []);
    await p.close();
  }
  {
    /* REGLA 3: no se pliega lo que este tipo de movimiento YA tenía escondido.
     * Decir «+ 3» y abrir para encontrar dos es mentir con un número. */
    const { p, errores } = await abrir(browser, DATOS());
    const enWaste = await p.evaluate(() => {
      openMoveModal('WASTE');
      return { gc: visibleId('mGCField'), linea: visibleId('camposMas') };
    });
    /* WASTE ya esconde por su cuenta Supplier, GC, PO# y Project, y el PM sólo
     * sale en ENTRY y RETURN. De los seis plegables, el único que queda en
     * pantalla es «Received By» — y esta bodega sí lo llena. Así que no hay
     * NADA que plegar, y la línea no debe aparecer. */
    check('en WASTE, GC sigue escondido por el tipo de movimiento, no por esto',
      enWaste.gc, 'escondido');
    check('y la línea NO aparece, porque de lo que estaba a la vista no sobra ' +
          'nada — si contara los que el tipo ya había escondido dirÍa «+ 4» y ' +
          'abrirla no enseñaría ninguno: mentir con un número',
      enWaste.linea, 'escondido');
    check('ningún error de JavaScript', errores, []);
    await p.close();
  }

  console.log('\n═══ El camión aparece sólo si la bodega tiene camiones ═══\n');
  {
    const { p } = await abrir(browser, DATOS());
    await p.evaluate(() => openMoveModal('ENTRY'));
    await p.waitForTimeout(150);
    check('sin camiones registrados, el campo no existe para esa bodega',
      await p.evaluate(() => visibleId('mTruckField')), 'escondido');
    await p.close();
  }
  {
    const { p, errores } = await abrir(browser, DATOS({
      trucks: [{ name: 'TRUCK 1', person: 'SAM', status: 'ACTIVE' }]
    }));
    await p.evaluate(() => openMoveModal('ENTRY'));
    await p.waitForTimeout(150);
    const camion = await p.evaluate(() => ({
      campo: visibleId('mTruckField'),
      opciones: [].slice.call(document.getElementById('mTruck').options).map(o => o.textContent)
    }));
    check('con uno registrado, aparece — la lista de camiones YA ES la ' +
          'respuesta a «que no moleste si no los tiene»', camion.campo, 'visible');
    check('y el desplegable trae el camión con su persona',
      camion.opciones, ['— None —', 'TRUCK 1 — SAM']);
    check('ningún error de JavaScript', errores, []);
    await p.close();
  }

  await browser.close();
  if (fails.length){ console.error('\nFALLÓ:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
})();
