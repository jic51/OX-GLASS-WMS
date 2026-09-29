// EL SERVIDOR YA DIJO SÍ Y LA PANTALLA TODAVÍA NO.
//
// Jose, 2026-09-17, con video y cronómetro sobre "Mark arrived":
//
//   segundo  8–14   el botón en "Saving…"
//   segundo    15   la ventana se cierra — EL SERVIDOR YA CONFIRMÓ
//   segundo    16   sale el toast
//   segundo 17–25   el popup sigue diciendo "Pending"
//   segundo    26   por fin dice "Arrived"
//
// Once segundos. Jose: "SI YA SE VALIDÓ EN EL SERVIDOR, LA APP NO DEBE ESPERAR
// NADA MÁS PARA DAR EL FEEDBACK VISUAL."
//
// Eran dos fallos, y venían juntos en los tres caminos:
//
//   1. El manejador de éxito no tocaba la copia local. La pantalla repintaba el
//      dato viejo porque el dato viejo era el único que había.
//   2. Recargaba con loadDataFromGoogle(false) — y ese `false` significa USA EL
//      CACHÉ. Repintaba el dato viejo otra vez y sólo se corregía al terminar un
//      getInitialData entero. Ése es el grueso de los once segundos.
//
// ── POR QUÉ ESTA PRUEBA EJECUTA Y NO BUSCA ───────────────────────────────────
//
// Es el tercer archivo de pruebas de este proyecto que existe por la misma
// razón: una comprobación que mira si una llamada ESTÁ en el código pasa en
// verde sobre código que nunca la corre. Así que aquí se llaman las funciones de
// verdad, con un DOM de mentira, y se mira QUÉ QUEDÓ en `incoming` y en
// `movements` después del sí del servidor.
//
// Y de paso la otra trampa conocida: el recuento de loadDataFromGoogle(false) se
// hace SOBRE EL CÓDIGO SIN COMENTARIOS, porque el comentario que explica este
// arreglo NOMBRA la llamada que quita. Buscando a ojo se cuenta cuatro donde hay
// tres.
//
// Uso:  node tools/test-pintar-al-confirmar.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const A = require('./andamio.js');
const HTML = A.fuente('html');
const GS   = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

// Del andamio, no una copia: la copia ingenua toma el `/*` de accept="image/*"
// por una apertura de bloque y borra 38.780 caracteres del archivo, lo que
// dejaría este recuento midiendo sólo parte de la app. Ver
// andamio.sinComentarios.
const sinComentarios = A.sinComentarios;

// ── EL RELOJ SE CONGELA ─────────────────────────────────────────────────────
//
// _incAplicarLocal pone addedAt con new Date() al INSERTAR una entrega, y aquí
// abajo hay fechas fijas (estDate '2026-09-18', '2026-09-20') con las que se
// comprueba el orden. Mezclar las dos cosas es cómo una prueba se pone roja
// sola el día que cambia la semana, que es lo que ya pasó con
// test-morning-arrivals el 2026-09-14.
//
// test-no-caduca.js señaló este archivo el día que se escribió — que es
// exactamente para lo que está ese guardia. Congelar el reloj cuesta ocho
// líneas y deja de haber nada que explicar; añadirlo a la lista de excusas
// habría dejado la mezcla dentro.
const HOY = '2026-09-17';
const RelojReal = Date;
function Reloj(){
  if (!arguments.length) return new RelojReal(HOY + 'T12:00:00');
  return new (Function.prototype.bind.apply(
    RelojReal, [null].concat([].slice.call(arguments))))();
}
Reloj.now       = () => new RelojReal(HOY + 'T12:00:00').getTime();
Reloj.UTC       = RelojReal.UTC;
Reloj.parse     = RelojReal.parse;
Reloj.prototype = RelojReal.prototype;

// ── Un DOM de mentira que devuelve lo que se le sembró ──────────────────────
// Los formularios se leen por getElementById(...).value, así que basta con un
// diccionario. querySelector('.btn-primary') tiene que devolver ALGO, porque el
// código le pasa el botón a _btnBusy.
function nuevoDom(campos){
  const nodos = {};
  const botón = { id:'btn', textContent:'', disabled:false, classList:{ add(){}, remove(){}, contains:()=>false },
                  querySelector(){ return botón; }, style:{}, getAttribute(){ return null; },
                  setAttribute(){}, addEventListener(){} };
  function nodo(id){
    if (nodos[id]) return nodos[id];
    return (nodos[id] = {
      id, value: Object.prototype.hasOwnProperty.call(campos, id) ? campos[id] : '',
      checked: !!campos['@' + id], textContent:'', innerHTML:'', style:{}, files:null,
      classList:{ add(){}, remove(){}, contains:()=>false },
      querySelector(){ return botón; }, querySelectorAll(){ return []; },
      addEventListener(){}, focus(){}, getAttribute(){ return null; }
    });
  }
  return {
    getElementById: nodo,
    querySelector(){ return botón; },
    querySelectorAll(){ return []; },
    createElement(){ return { className:'', style:{}, appendChild(){}, classList:{add(){},remove(){}} }; },
    documentElement: { classList:{ toggle(){}, add(){}, remove(){}, contains:()=>false } },
    addEventListener(){},
    _botón: botón
  };
}

// google.script.run de mentira: guarda la llamada y deja que la prueba decida
// cuándo y con qué contesta el servidor. Es lo que permite comprobar el ORDEN —
// que el parche local pase ANTES de que nadie recargue nada.
function nuevoRunner(registro){
  const api = {};
  let okFn = null, failFn = null;
  api.withSuccessHandler = f => { okFn = f; return api; };
  api.withFailureHandler = f => { failFn = f; return api; };
  api.processMovement = (accion, carga) => {
    registro.push({ accion, carga, responder: r => okFn && okFn(r), fallar: e => failFn && failFn(e) });
    return api;
  };
  return api;
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 1. _incAplicarLocal: update-or-insert, con el orden del servidor ──');

{
  const ctx = {
    console, Date: Reloj,
    incoming: [
      { id:'INC-1', estDate:'2026-09-20', category:'SCREEN', name:'YOGU YOGU', qty:20, unit:'UNIT',
        supplier:'JOSE JOSE', po:'789456', notes:'', status:'Pending',
        addedBy:'jose@ox-glass.com', addedAt:'2026-09-01T10:00:00Z', pm:'', docLink:'',
        dateMode:'exact', estDateEnd:'', dateNote:'' }
    ],
    userEmail: 'yo@ox-glass.com'
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(HTML, ['_incAplicarLocal']), ctx);

  // EL CASO DEL VIDEO: la misma fila, con el estado cambiado.
  vm.runInContext(`_incAplicarLocal({
    id:'INC-1', estDate:'2026-09-20', dateMode:'exact', estDateEnd:'', dateNote:'',
    status:'Arrived', category:'SCREEN', name:'YOGU YOGU', qty:20, unit:'UNIT',
    supplier:'JOSE JOSE', po:'789456', pm:'', notes:''
  }, { status:'success' })`, ctx);
  check('el estado cambia en la copia local, sin esperar recarga',
        ctx.incoming[0].status === 'Arrived', ctx.incoming[0].status);
  check('no se duplicó la fila', ctx.incoming.length === 1, ctx.incoming.length);
  check('addedBy se conserva, como hace el servidor',
        ctx.incoming[0].addedBy === 'jose@ox-glass.com', ctx.incoming[0].addedBy);
  check('addedAt se conserva, como hace el servidor',
        ctx.incoming[0].addedAt === '2026-09-01T10:00:00Z', ctx.incoming[0].addedAt);

  // estDate vacío con modo distinto de 'unknown' mantiene la fecha que había.
  // Es lo que hace updateIncoming en el servidor; si aquí no, la recarga
  // "corrige" algo que estaba bien y se ve un parpadeo.
  vm.runInContext(`_incAplicarLocal({
    id:'INC-1', estDate:'', dateMode:'exact', status:'Arrived', category:'SCREEN',
    name:'YOGU YOGU', qty:20, unit:'UNIT', supplier:'JOSE JOSE', po:'789456', pm:'', notes:''
  }, { status:'success' })`, ctx);
  check('estDate vacío con modo exact mantiene la fecha anterior',
        ctx.incoming[0].estDate === '2026-09-20', ctx.incoming[0].estDate);

  // Modo 'unknown' sí la borra — también como el servidor.
  vm.runInContext(`_incAplicarLocal({
    id:'INC-1', estDate:'2026-09-20', dateMode:'unknown', status:'Arrived', category:'SCREEN',
    name:'YOGU YOGU', qty:20, unit:'UNIT', supplier:'JOSE JOSE', po:'789456', pm:'', notes:''
  }, { status:'success' })`, ctx);
  check('modo unknown borra la fecha, como el servidor',
        ctx.incoming[0].estDate === '', ctx.incoming[0].estDate);

  // INSERT: el id lo pone el servidor y vuelve en la respuesta.
  vm.runInContext(`_incAplicarLocal({
    estDate:'2026-09-18', dateMode:'exact', status:'Pending', category:'WINDOW',
    name:'VENTANA NUEVA', qty:5, unit:'UNIT', supplier:'ACME', po:'1', pm:'', notes:''
  }, { status:'success', id:'INC-2', docLink:'https://drive/x' })`, ctx);
  check('la entrega nueva entra en la lista', ctx.incoming.length === 2, ctx.incoming.length);
  const nueva = ctx.incoming.filter(x => x.id === 'INC-2')[0];
  check('...con el id que puso el servidor', !!nueva);
  check('...y con el docLink que devolvió el servidor',
        nueva && nueva.docLink === 'https://drive/x', nueva && nueva.docLink);

  // EL ORDEN. getIncoming ordena por fecha y manda las sin fecha al final.
  // Pegarla al final dejaría la nueva en el sitio equivocado hasta la recarga —
  // un salto en vez de un retraso, que es peor.
  check('la lista queda en el orden que devuelve el servidor (fecha, sin fecha al final)',
        ctx.incoming[0].id === 'INC-2' && ctx.incoming[1].id === 'INC-1',
        ctx.incoming.map(x => x.id + ':' + (x.estDate || '—')));

  // Sin id no hay nada que casar, y no debe inventarse una fila.
  const antes = ctx.incoming.length;
  vm.runInContext(`_incAplicarLocal({ status:'Pending', name:'SIN ID' }, { status:'success' })`, ctx);
  check('sin id no se inventa ninguna fila', ctx.incoming.length === antes, ctx.incoming.length);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 2. saveIncomingItem: parcha y repinta EN el sí del servidor ──');

{
  const llamadas = [];
  let pintados = 0, recargasCacheadas = 0, recargasOciosas = 0;
  const dom = nuevoDom({
    incId:'INC-1', incDateMode:'exact', incDate:'2026-09-20', incDateEnd:'', incDateNote:'',
    incName:'YOGU YOGU', incStatus:'Arrived', incCategory:'SCREEN', incQty:'20',
    incUnit:'UNIT', incSupplier:'JOSE JOSE', incPO:'789456', incPM:'', incNotes:'',
    '@incMakeEntry': false
  });
  const ctx = {
    console, Date: Reloj, document: dom, alert(){}, setTimeout: f => f(),
    google: { script: { run: nuevoRunner(llamadas) } },
    incoming: [
      { id:'INC-1', estDate:'2026-09-20', category:'SCREEN', name:'YOGU YOGU', qty:20, unit:'UNIT',
        supplier:'JOSE JOSE', po:'789456', notes:'', status:'Pending', addedBy:'a@b.c',
        addedAt:'2026-09-01T10:00:00Z', pm:'', docLink:'', dateMode:'exact', estDateEnd:'', dateNote:'' }
    ],
    userEmail:'yo@ox-glass.com',
    // Dobles. renderAll y las dos recargas son justo lo que se está midiendo.
    renderAll(){ pintados++; },
    loadDataFromGoogle(a){ if (a === false) recargasCacheadas++; },
    _reloadWhenIdle(){ recargasOciosas++; },
    _btnBusy(){}, _btnDone(b, x, cb){ if (cb) cb(); }, _btnReset(){}, _btnLabel(){},
    showToast(){}, closeModal(){}, _todoAdd(){ return 'T1'; }, _entryFromIncoming(){},
    _busyRetry(){ return false; }, _stripTags(e){ return String(e); },
    _h(x){ return x; }, _readFileAsBase64(){}
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(HTML, ['saveIncomingItem'], {
    dobles: ['_btnBusy','_btnDone','_btnReset','_btnLabel','showToast','closeModal','_todoAdd',
             '_entryFromIncoming','_busyRetry','_stripTags','_h','_readFileAsBase64',
             'renderAll','loadDataFromGoogle','_reloadWhenIdle']
  }), ctx);

  vm.runInContext('saveIncomingItem()', ctx);
  check('se mandó updateIncoming al servidor',
        llamadas.length === 1 && llamadas[0].accion === 'updateIncoming',
        llamadas.map(c => c.accion));
  check('ANTES del sí del servidor, la copia local NO se toca',
        ctx.incoming[0].status === 'Pending', ctx.incoming[0].status);
  check('...y no se ha repintado nada', pintados === 0, pintados);

  llamadas[0].responder({ status: 'success' });
  check('EN el sí del servidor, el estado ya cambió',
        ctx.incoming[0].status === 'Arrived', ctx.incoming[0].status);
  check('...y se repintó', pintados > 0, pintados);
  check('la recarga cacheada (el `false`) ya no se usa', recargasCacheadas === 0, recargasCacheadas);
  check('se recarga silenciosamente y sin caché', recargasOciosas === 1, recargasOciosas);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 3. submitAttachment: la columna DOC, en el acto ──');

function correrAdjunto(respuesta){
  const llamadas = [];
  let pintados = 0, recargasCacheadas = 0;
  const dom = nuevoDom({ aRowIdx:'7' });
  const ctx = {
    console, Date: Reloj, document: dom, setTimeout: f => f(),
    google: { script: { run: nuevoRunner(llamadas) } },
    movements: [ { rowIdx:6, docLinks:'otra||https://drive/otra' },
                 { rowIdx:7, docLinks:'vieja||https://drive/vieja' } ],
    _attachExistingDocs: [ { raw:'vieja||https://drive/vieja' } ],
    _attachRemovedIdx: {}, _attachOrigCategory:'SCREEN', _attachOrigName:'YOGU',
    TOAST_QUICK: 2000,
    _collectDocGroups(){ return [ { name:'nueva', photos:['x'] } ]; },
    renderAll(){ pintados++; },
    loadDataFromGoogle(a){ if (a === false) recargasCacheadas++; },
    _reloadWhenIdle(){},
    _btnBusy(){}, _btnDone(b, x, cb){ if (cb) cb(); }, _btnReset(){},
    _setModalBusy(){}, showToast(){}, closeModal(){}, _h(x){ return x; }
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(HTML, ['submitAttachment'], {
    dobles: ['_collectDocGroups','renderAll','loadDataFromGoogle','_reloadWhenIdle','_btnBusy',
             '_btnDone','_btnReset','_setModalBusy','showToast','closeModal','_h']
  }), ctx);
  vm.runInContext('submitAttachment()', ctx);
  if (llamadas.length) llamadas[0].responder(respuesta);
  return { ctx, llamadas, pintados: () => pintados, recargasCacheadas: () => recargasCacheadas };
}

{
  const r = correrAdjunto({ status:'success', docLinks:'vieja||https://drive/vieja\nnueva||https://drive/nueva' });
  check('se mandó updateDocument', r.llamadas.length === 1 && r.llamadas[0].accion === 'updateDocument',
        r.llamadas.map(c => c.accion));
  check('la fila 7 toma el texto que devolvió el servidor',
        r.ctx.movements[1].docLinks.indexOf('nueva') !== -1, r.ctx.movements[1].docLinks);
  check('la fila 6, que no se tocó, sigue igual',
        r.ctx.movements[0].docLinks === 'otra||https://drive/otra', r.ctx.movements[0].docLinks);
  check('se repintó', r.pintados() > 0);
  check('la recarga cacheada ya no se usa', r.recargasCacheadas() === 0);
}
{
  // '' = "se quitaron todos". Tiene que VACIAR la columna.
  const r = correrAdjunto({ status:'success', docLinks:'' });
  check("docLinks '' vacía la columna", r.ctx.movements[1].docLinks === '', r.ctx.movements[1].docLinks);
}
{
  // null = "no se tocó la celda". Tiene que DEJARLA como estaba. Comprobar
  // contra falsy en vez de contra null confundiría los dos casos, y dejaría los
  // recortes en pantalla justo cuando se acaban de borrar.
  const r = correrAdjunto({ status:'success', docLinks:null });
  check('docLinks null deja la columna como estaba',
        r.ctx.movements[1].docLinks === 'vieja||https://drive/vieja', r.ctx.movements[1].docLinks);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 4. saveEditMov: la fila editada, en el acto y normalizada ──');

{
  let pintados = 0;
  const llamadas = [];
  const dom = nuevoDom({
    em_reason:'se escribió mal', em_category:'screen', em_name:'  yogu   yogu  ',
    em_qty:'-40', em_unit:'UNIT', em_dateRec:'2026-09-17', em_responsible:'Jose',
    em_sourceLoc:'a1a', em_destLoc:'b2b', em_project:'Casa', em_gc:'GC1',
    em_supplier:'ACME', em_po:'99', em_pm:'PM1', em_comments:'ok'
  });
  const ctx = {
    console, Date: Reloj, document: dom, setTimeout: f => f(),
    movements: [ { rowIdx:12, category:'WINDOW', name:'OTRA COSA', qty:1, unit:'UNIT',
                   dateRec:'2026-01-01', responsible:'', sourceLoc:'', destLoc:'',
                   project:'', gc:'', supplier:'', po:'', pm:'', comments:'' } ],
    _editMovRowIdx: 12, _editMovOrigCategory:'WINDOW', _editMovOrigName:'OTRA COSA',
    TOAST_QUICK: 2000,
    renderAll(){ pintados++; },
    _acWrite(o){ llamadas.push(o); },
    _btnBusy(){}, _btnLabel(){}, _setModalBusy(){}, closeModal(){}, showToast(){},
    _clearMovSelection(){}, loadDataFromGoogle(){}, _humanErr(e){ return String(e); },
    _h(x){ return x; }
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(HTML, ['saveEditMov'], {
    dobles: ['_acWrite','renderAll','_btnBusy','_btnLabel','_setModalBusy','closeModal',
             'showToast','_clearMovSelection','loadDataFromGoogle','_humanErr','_h']
  }), ctx);

  vm.runInContext('saveEditMov()', ctx);
  check('se encoló modifyMovement', llamadas.length === 1 && llamadas[0].args[0] === 'modifyMovement',
        llamadas.map(c => c.args && c.args[0]));
  check('ANTES del sí del servidor la fila NO cambia',
        ctx.movements[0].name === 'OTRA COSA', ctx.movements[0].name);

  llamadas[0].ok({ status:'success', changes: 5 });
  const m = ctx.movements[0];
  check('la fila ya lleva el nombre nuevo', m.name === 'YOGU YOGU', m.name);
  check('...normalizado como cleanDisplay_ (mayúsculas, trim, espacios colapsados)',
        m.name === 'YOGU YOGU', JSON.stringify(m.name));
  check('la categoría en mayúsculas, como el servidor', m.category === 'SCREEN', m.category);
  check('los estantes en mayúsculas, como el servidor',
        m.sourceLoc === 'A1A' && m.destLoc === 'B2B', { src:m.sourceLoc, dst:m.destLoc });
  check('la cantidad en valor absoluto, como parseArchiveRow', m.qty === 40, m.qty);
  check('los demás campos también', m.project === 'Casa' && m.po === '99' && m.pm === 'PM1',
        { project:m.project, po:m.po, pm:m.pm });
  check('se repintó', pintados > 0, pintados);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 5. Ningún camino corregido vuelve al caché ──');
//
// SE CUENTA, no se busca a ojo. Y sobre el código SIN COMENTARIOS, porque el
// comentario que explica este arreglo nombra la llamada que quita: a ojo se
// cuentan cuatro donde hay tres.
const limpio = sinComentarios(HTML);
const cacheadas = (limpio.match(/loadDataFromGoogle\(false\)/g) || []).length;
/* CERO, desde la v12.24. Esto decía 3, y las tres eran las de guardar un
 * movimiento — las que este mismo archivo listaba abajo como "deliberado,
 * pendiente". Ya no están pendientes: Jose las cronometró y eran justo los
 * segundos que veía entre el "listo" y el número que cambiaba. */
check('NO queda ni una recarga cacheada en toda la app', cacheadas === 0, cacheadas);

// Y NINGUNA en los tres caminos arreglados. Esta es la comprobación que impide
// que vuelvan: el recuento de arriba seguiría en 3 si alguien cambiara una por
// otra.
['saveIncomingItem', 'submitAttachment', 'saveEditMov'].forEach(function(fn){
  const cuerpo = sinComentarios(A.fnSrc(HTML, fn));
  check(fn + ' no usa la recarga cacheada',
        cuerpo.indexOf('loadDataFromGoogle(false)') === -1);
  check(fn + ' parcha la copia local y repinta',
        /renderAll\s*\(/.test(cuerpo) || /_incAplicarLocal\s*\(/.test(cuerpo));
});

/* ── LOS TRES QUE ESTABAN PENDIENTES, YA NO (v12.24) ────────────────────────
 *
 * Aquí ponía "sigue con la recarga cacheada (deliberado, pendiente)" y la
 * excusa era que quien guarda un movimiento ya se fue del formulario. Jose lo
 * midió y la excusa no se sostenía: el número de la pantalla que SÍ estaba
 * mirando —el Dashboard— seguía siendo el viejo varios segundos después del
 * "listo".
 *
 * Y la salida NO fue rehacer la aritmética en el navegador, que es lo que
 * parecía tocar. El servidor ya tenía las cifras de después —muta su snapshot
 * fila a fila para validar— y las tiraba. Ahora las manda. No hay dos
 * aritméticas que puedan discrepar; ésa era toda la razón para no hacerlo
 * antes. */
['_doSubmit', '_doMultiSubmit', 'submitMultiExit'].forEach(function(fn){
  const cuerpo = sinComentarios(A.fnSrc(HTML, fn));
  check(fn + ' ya no usa la recarga cacheada',
        cuerpo.indexOf('loadDataFromGoogle(false)') === -1);
  check(fn + ' pone las cifras que mandó el servidor',
        /_aplicarStockDelServidor\s*\(\s*res\s*\)/.test(cuerpo));
  check(fn + ' y pide la foto completa detrás, en silencio',
        /_reloadWhenIdle\s*\(/.test(cuerpo));
});

/* Y lo que hace que esto sea correcto y no sólo rápido: las cifras vienen del
 * servidor, no se calculan aquí. Si alguien un día mete aritmética de almacén
 * en esta función, esto lo caza. */
{
  const cuerpo = sinComentarios(A.fnSrc(HTML, '_aplicarStockDelServidor'));
  check('_aplicarStockDelServidor COPIA, no calcula — nada de sumas ni restas',
        !/[+\-]=\s/.test(cuerpo) && !/Math\.max/.test(cuerpo), cuerpo.slice(0, 200));
  check('...y se salta un material que esta pantalla no tenía, en vez de ' +
        'inventarse media fila', /if\s*\(!s\)\s*continue/.test(cuerpo));
  check('...y repinta, que es donde el badge In Stock → All at Site se corrige solo',
        /renderAll\s*\(/.test(cuerpo));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 6. El servidor devuelve lo que el navegador necesita ──');
//
// La mitad de servidor del arreglo del adjunto. Sin este dato el navegador no
// puede pintar el documento nuevo: sabe qué enlaces sobreviven —los manda él—
// pero no la URL de Drive del archivo que se acaba de subir.
const updDoc = A.fnSrc(GS, 'updateDocument_');
check('updateDocument_ devuelve docLinks', /return\s*\{[^}]*docLinks/.test(sinComentarios(updDoc)),
      (sinComentarios(updDoc).match(/return\s*\{[^}]*\}/g) || []).pop());

/* La otra mitad de servidor, la de la v12.24: sin `stockAfter` el navegador no
 * tiene de dónde sacar el número bueno y volvería al caché. */
{
  const lote = sinComentarios(A.fnSrc(GS, 'addMovementsBatch_'));
  check('addMovementsBatch_ devuelve stockAfter', /stockAfter:\s*stockAfter/.test(lote));
  check('...con las cuatro cifras que la pantalla enseña',
        /warehouseQty:/.test(lote) && /siteQty:/.test(lote) &&
        /availableQty:/.test(lote) && /totalQty:/.test(lote));
  check('...y SÓLO de los materiales de este lote, no del archivo entero — ' +
        'en OX serían 652 en cada guardado de una línea',
        /tocados\[rowMeta\[/.test(lote) && /for \(var m2 in tocados\)/.test(lote));
}
check('addIncoming devuelve el id que generó',
      /return\s*\{[^}]*id:\s*id/.test(sinComentarios(A.fnSrc(GS, 'addIncoming'))));
check('updateIncoming devuelve docLink',
      /return\s*\{[^}]*docLink/.test(sinComentarios(A.fnSrc(GS, 'updateIncoming'))));

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 7. Y EJECUTANDO: el número y el badge cambian en el acto ──');
//
// Las de arriba miran el código. Ésta lo CORRE, que es la única forma de saber
// que lo que llega del servidor acaba en la pantalla — y sobre todo que el
// badge se corrige SOLO, que es la mitad que Jose nombró expresamente:
// "cambiar el estado de In Stock a At Site".
//
// Es la deuda que cobra la v12.17: desde que el estado lo decide _stockState()
// a partir de los números, parchear los números arregla el badge sin una línea
// más. Si algún día alguien vuelve a poner el estado en un campo aparte, esto
// se pone rojo.
{
  const ctx = {
    console,
    stockData: {
      'A|||B': { matId:'A|||B', category:'A', name:'B',
                 warehouseQty: 37, siteQty: 0, reservedQty: 0,
                 availableQty: 37, totalQty: 37, warehouseLocs: { B4A: 37 } }
    },
    _repintados: 0
  };
  ctx.renderAll = function(){ ctx._repintados++; };
  vm.createContext(ctx);
  // STOCK_STATES sale del archivo, no se copia: una copia aquí dejaría esta
  // prueba en verde el día que alguien cambie el orden de los estados en el
  // producto — y el orden ES la regla (gana el primero que encaja).
  vm.runInContext(A.constantes(HTML, ['STOCK_STATES']), ctx);
  vm.runInContext(A.levantar(HTML, ['_aplicarStockDelServidor', '_stockState'],
                             { dobles: ['renderAll'] }), ctx);

  const antes = ctx._stockState(ctx.stockData['A|||B']);
  check('de partida el material está In Stock', antes.key === 'in', antes.key);

  // Lo que devolvería el servidor tras una salida de los 37: almacén a 0, todo
  // en obra. Exactamente el caso del vídeo.
  const puestos = ctx._aplicarStockDelServidor({ stockAfter: {
    'A|||B': { warehouseQty: 0, siteQty: 37, reservedQty: 0,
               availableQty: 0, totalQty: 37, warehouseLocs: {} }
  }});

  check('se aplicó al material', puestos === 1, puestos);
  check('la cantidad es la del servidor, no una calculada aquí',
        ctx.stockData['A|||B'].warehouseQty === 0 &&
        ctx.stockData['A|||B'].siteQty === 37, ctx.stockData['A|||B']);
  const despues = ctx._stockState(ctx.stockData['A|||B']);
  check('EL BADGE YA DICE All at Site, sin tocarlo — la deuda que cobra la v12.17',
        despues.key === 'site', despues.key);
  check('y repintó una sola vez, no una por material', ctx._repintados === 1, ctx._repintados);

  // Un material que esta pantalla no conocía: no se inventa media fila.
  const antesN = Object.keys(ctx.stockData).length;
  ctx._aplicarStockDelServidor({ stockAfter: {
    'NUEVO|||X': { warehouseQty: 5, siteQty: 0, reservedQty: 0,
                   availableQty: 5, totalQty: 5, warehouseLocs: {} }
  }});
  check('un material que la pantalla no tenía NO se inventa a medias',
        Object.keys(ctx.stockData).length === antesN, Object.keys(ctx.stockData));

  // Y una respuesta sin stockAfter —un servidor viejo, un camino que no lo
  // manda— no puede reventar el manejador de éxito.
  let lanzo = null;
  try { ctx._aplicarStockDelServidor({}); ctx._aplicarStockDelServidor(null); }
  catch (e) { lanzo = e.message; }
  check('una respuesta sin stockAfter no lanza', !lanzo, lanzo);
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
process.exit(fail ? 1 : 0);
