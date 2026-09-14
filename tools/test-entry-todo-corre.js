// LA TARJETA SE SALDA PORQUE LO VIMOS PASAR, NO PORQUE ESTÉ ESCRITO.
//
// EL FALLO ORIGINAL, y por qué esta prueba existe aparte de las que ya hay:
//
// Hasta la v11.70 la tarjeta naranja de "llegó y falta su entrada" no se
// saldaba nunca al guardar una ENTRY. Seguía ahí con su botón "Make the entry",
// que reabría el formulario relleno con lo mismo: guardar otra vez creaba el
// mismo movimiento otra vez, y otra, sin límite. Jose lo demostró con una
// captura de un M-KUNA D-JA +44 PO 2444540 duplicado.
//
// LO QUE HACE ESTO IMPORTANTE NO ES EL FALLO: ES QUE HABÍA UNA PRUEBA EN VERDE
// ENCIMA. Comprobaba que _entryTodoResolve APARECÍA en el texto de
// submitMovement. Y aparecía. Lo que no comprobaba es que llegara a
// ejecutarse — y no llegaba, porque submitMovement sale hacia submitMultiEntry
// en su tercera línea:
//
//     if (currentMoveType === 'ENTRY') { submitMultiEntry(); return; }
//
// La llamada estaba escrita en código que ninguna ENTRY pisa jamás.
//
// POR QUÉ NO SE ARREGLA CON UN DETECTOR. Lo intenté: buscar "código detrás de
// un return incondicional" leyendo el texto da 66 avisos sobre este mismo
// archivo, casi todos falsos (un return que ocupa varias líneas le descuadra
// la cuenta de llaves). Hacerlo bien necesita un analizador de JavaScript de
// verdad, y este repositorio no tiene ni una dependencia declarada.
//
// La respuesta buena es más simple y no necesita detector: EJECUTAR. Una
// llamada en código muerto no ocurre, y aquí se comprueba que ocurre.
//
// Se ejercita submitMultiEntry DE VERDAD, sacada del archivo. Lo único falso es
// el navegador y el servidor: catorce casillas de formulario y un
// google.script.run que contesta como contestaría Apps Script. Doblar
// submitMultiEntry habría medido el doble.
//
// Uso:  node tools/test-entry-todo-corre.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(name){
  const ini = HTML.indexOf('function ' + name + '(');
  if (ini === -1) throw new Error('no encontrada: ' + name);
  let d = 0;
  for (let j = HTML.indexOf('{', ini); j < HTML.length; j++) {
    if (HTML[j] === '{') d++;
    else if (HTML[j] === '}') { d--; if (d === 0) return HTML.slice(ini, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// ── El mundo ────────────────────────────────────────────────────────────────
function mundo(opciones){
  opciones = opciones || {};
  const visto = {
    resueltas: [],        // cada llamada a _entryTodoResolve, con su argumento
    etiquetas: 0,         // _openLabels
    tambienLlego: 0,      // _offerAlsoArrived
    cerrado: [],
    enviado: null,        // el payload que recibiría el servidor
    temporizadores: [],   // lo aplazado con setTimeout, sin disparar
    orden: []             // en qué orden pasaron las cosas
  };

  const casillas = Object.assign({
    mDateRec: '2026-09-14', mSup: 'AMSCO', mGC: '', mPO: '08-4885',
    mProj: 'SUNBRIDGE', mResp: '', mPM: '', mComm: '', mTruck: '',
    mNotifyEmails: '', mNotifyMsg: ''
  }, opciones.casillas || {});

  const ctx = vm.createContext({
    console, String, Number, Math, Array, Object, JSON, Date,
    // El temporizador se guarda en vez de dispararse solo. El bloque de
    // después de guardar —el aviso, las etiquetas, el "¿también llegó esto?"—
    // va dentro de un setTimeout, y una prueba que no lo espera mide medio
    // camino y cree que el resto no pasa. Guardarlo lo hace explícito: se ve
    // QUE se aplaza, y se dispara a mano para ver el orden de dentro.
    setTimeout: (fn) => { visto.temporizadores.push(fn); },
    alert: (m) => { visto.orden.push('alert:' + m); },
    BUSY_LABEL: 'Still saving…',
    currentMoveType: 'ENTRY',
    _entryFromIncId: opciones.incId || 'INC-1',
    _entryTodo: opciones.todo || null,

    // El DOM, tal como lo recorre submitMultiEntry: encuentra las líneas de
    // material por querySelectorAll y luego pide CADA CASILLA por su id,
    // compuesto con el número de la línea. Un doble que devolviera objetos
    // genéricos no habría ejercitado ese camino.
    document: {
      getElementById: (id) => {
        if (id === 'moveSubmit') return { id: 'moveSubmit' };
        if (id === 'mSameEntryInfoChk' || id === 'mNotify') return { checked: false };
        if (id === 'mat-cat-1')  return { value: 'WINDOW' };
        if (id === 'mat-name-1') return { value: opciones.nombre !== undefined ? opciones.nombre : 'MH 145' };
        if (id === 'mat-unit-1') return { value: 'UNIT' };
        if (id === 'mat-locs-1') return {
          querySelectorAll: () => [{
            querySelector: (sel) => /loc-rack/.test(sel) ? { value: 'B2A' } : { value: '44' }
          }]
        };
        return { value: casillas[id] !== undefined ? casillas[id] : '' };
      },
      querySelectorAll: (sel) => /mat-line/.test(sel) ? [{ id: 'mat-line-1' }] : []
    },

    // El servidor. Contesta como Apps Script: el manejador de éxito recibe el
    // objeto que devuelve addMultiEntry.
    google: { script: { run: null } },

    // Lo que no decide nada en esta prueba.
    _collectDocGroups: () => [],
    _entryUnitCost:    () => null,
    _qty:  (v) => Number(v) || 0,
    nt:    (v) => String(v || '').toUpperCase().trim(),
    _btnBusy: () => {}, _btnLabel: () => {}, _setModalBusy: () => {},
    _busyRetry: () => false,
    _showConfirm: () => {},
    loadDataFromGoogle: () => { visto.orden.push('recargar'); },
    showToast: () => {},
    closeModal: (id) => { visto.cerrado.push(id); visto.orden.push('cerrar'); },

    // LAS TRES QUE IMPORTAN, espiadas.
    _entryTodoResolve: (tipo) => {
      visto.resueltas.push(tipo);
      visto.orden.push('saldar:' + tipo);
    },
    _labelsFromEntry: () => [{ name: 'MH 145', qty: 44, loc: 'B2A', copies: 1 }],
    _openLabels: (filas, alCerrar) => {
      visto.etiquetas++;
      visto.orden.push('etiquetas');
      if (alCerrar) alCerrar();        // el usuario cierra la ventana de etiquetas
    },
    _offerAlsoArrived: () => { visto.tambienLlego++; visto.orden.push('tambien-llego'); }
  });

  // El encadenado de Apps Script, con el payload capturado por el camino.
  //
  // La llamada de verdad es .processMovement('addMultiEntry', _h(payload)) —
  // un único punto de entrada con la acción por nombre, no un método por
  // acción. Se imita tal cual: inventarme .addMultiEntry(p) habría hecho que
  // esta prueba ejercitara un camino que la app no usa.
  vm.runInContext(
    'var _sessionToken = "tok-123";\n' +
    'google.script.run = {' +
    '  withSuccessHandler: function(f){ this._ok = f; return this; },' +
    '  withFailureHandler: function(f){ this._no = f; return this; },' +
    '  processMovement: function(accion, p){ __capturar(accion, p, this._ok, this._no); }' +
    '};', ctx);
  // _h de verdad: es quien cuelga el token de sesión del payload. Doblarla
  // habría dejado sin comprobar que el token viaja.
  vm.runInContext(fnSrc('_h'), ctx);

  ctx.__capturar = (accion, payload, alOk, alNo) => {
    visto.accion  = accion;
    visto.enviado = payload;
    visto.orden.push('enviar');
    if (opciones.falla) alNo(new Error(opciones.falla));
    else alOk({ count: 1, rowCount: 1 });
  };

  // LA FUNCIÓN DE VERDAD, sacada del archivo.
  vm.runInContext(fnSrc('submitMultiEntry'), ctx);

  return {
    visto,
    correr: () => vm.runInContext('submitMultiEntry()', ctx),
    // "y entonces salta el temporizador"
    correrTimers: () => { const t = visto.temporizadores.splice(0); t.forEach(f => f()); }
  };
}

console.log('\n═══ guardar una ENTRY salda la tarjeta — ejecutándolo ═══\n');
{
  const m = mundo();
  m.correr();

  // LA ASERCIÓN. Antes de la v11.70 esto era [] y la prueba de al lado seguía
  // en verde, porque miraba el texto.
  check('_entryTodoResolve SE EJECUTÓ al guardar — no "está escrito": ocurrió',
    m.visto.resueltas.length === 1, m.visto.resueltas);
  check('...y con ENTRY, que es el tipo de tarjeta que salda',
    m.visto.resueltas[0] === 'ENTRY', m.visto.resueltas);
  check('el movimiento llegó al servidor antes de saldar nada — saldar una ' +
        'tarjeta por un guardado que aún podía fallar la borraría en falso',
    m.visto.orden.indexOf('enviar') < m.visto.orden.indexOf('saldar:ENTRY'),
    m.visto.orden);
  check('y el PO viaja entero en el payload, con su forma de fecha',
    m.visto.enviado && m.visto.enviado.po === '08-4885', m.visto.enviado && m.visto.enviado.po);
  check('...por la acción addMultiEntry, que es la que el servidor enruta',
    m.visto.accion === 'addMultiEntry', m.visto.accion);
  check('...y con el token de sesión colgado por _h, sin el cual el servidor ' +
        'no sabría quién guarda',
    m.visto.enviado && m.visto.enviado._sessionToken === 'tok-123');
}

console.log('\n═══ si el guardado FALLA, la tarjeta NO se salda ═══\n');
{
  // La otra mitad, y la que de verdad protege los datos: una tarjeta saldada
  // sin movimiento detrás es el mismo agujero al revés — el material llegó,
  // nadie lo registró, y ya nada lo recuerda.
  const m = mundo({ falla: 'SYSTEM_BUSY|inténtalo otra vez' });
  m.correr();
  m.correrTimers();   // aunque salte todo lo aplazado, no debe aparecer nada
  check('con el guardado fallido, la tarjeta sigue viva',
    m.visto.resueltas.length === 0, m.visto.resueltas);
  check('...y no se ofrecieron etiquetas de algo que no se guardó',
    m.visto.etiquetas === 0);
  check('...ni se preguntó por otras entregas', m.visto.tambienLlego === 0);
}

console.log('\n═══ el orden de después de guardar ═══\n');
{
  const m = mundo();
  m.correr();

  // Antes del temporizador no se ofrece nada: el formulario ya se cerró y los
  // números ya se están recargando, pero al usuario todavía no se le pregunta.
  check('nada se ofrece antes de que salte el temporizador',
    m.visto.etiquetas === 0 && m.visto.tambienLlego === 0);
  check('...y hay UN temporizador esperando, no ninguno',
    m.visto.temporizadores.length === 1, m.visto.temporizadores.length);

  m.correrTimers();
  const o = m.visto.orden;
  check('las etiquetas se ofrecen —es la cosa física— ', m.visto.etiquetas === 1);
  check('...y el "¿también llegó esto?" DESPUÉS, cuando la ventana de ' +
        'etiquetas se cierra, nunca las dos encima',
    m.visto.tambienLlego === 1 && o.indexOf('etiquetas') < o.indexOf('tambien-llego'), o);
  check('el formulario se cierra antes de ofrecer nada',
    o.indexOf('cerrar') < o.indexOf('etiquetas'), o);
}

console.log('\n═══ y la razón por la que esta prueba existe ═══\n');
{
  // submitMovement sigue teniendo la llamada escrita, y sigue sin ejecutarla
  // para una ENTRY. Que la tenga no es el fallo; creerle a eso, sí.
  const sm = fnSrc('submitMovement');
  const delega = sm.indexOf("submitMultiEntry(); return;");
  const escrita = sm.indexOf('_entryTodoResolve');
  check('submitMovement TODAVÍA contiene _entryTodoResolve escrita',
    escrita !== -1);
  check('...y TODAVÍA sale hacia submitMultiEntry antes de llegar a ella, así ' +
        'que para una ENTRY esa línea no se ejecuta jamás',
    delega !== -1 && delega < escrita, { delega, escrita });
  check('por eso una aserción de TEXTO sobre submitMovement pasaría hoy mismo ' +
        'aunque el arreglo no existiera — y esta prueba no',
    /_entryTodoResolve/.test(sm));
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('Ejecutar no es más trabajo que leer: son catorce casillas de');
console.log('formulario y un google.script.run de mentira. Lo que cuesta caro');
console.log('es lo otro — una prueba en verde encima de un fallo que duplicaba');
console.log('movimientos en el almacén de Jose.');
console.log('────────────────────────────────────────────────────────────────────────\n');

console.log((fail ? 'entry todo corre: ' + fail + ' FALLO(S)' : 'entry todo corre: ok (' + ok + ')') + '\n');
process.exit(fail ? 1 : 0);
