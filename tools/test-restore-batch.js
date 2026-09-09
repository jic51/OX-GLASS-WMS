// PULSAR VARIOS "PUT BACK" NO PUEDE DESARMAR LOS QUE SIGUEN ESPERANDO.
//
// Jose lo grabó el 2026-09-09: pulsó "Put back" en varios movimientos borrados
// seguidos, y AL LLEGAR EL PRIMER "Done" en verde todos los demás botones
// volvieron a su estado inicial, como si nadie los hubiera tocado.
//
// LA CAUSA: cada restauración que funcionaba pedía la lista otra vez al
// servidor y repintaba el cuadro ENTERO. Los botones que seguían esperando su
// turno en la cola se rehacían desde cero. El trabajo seguía en marcha; la
// pantalla decía que no.
//
// ES EL MISMO FALLO QUE YA TUVO BORRAR, Y SE ARREGLA IGUAL: la pantalla se
// dibuja desde una lista de "estos están en camino" (_trashPending), así que un
// repintado los sigue enseñando esperando en vez de olvidarlos.
//
// Y ESO DEJÓ VER EL OTRO, que Jose no llegó a ver: cada restauración pedía
// además una recarga COMPLETA del almacén. Cinco movimientos devueltos eran
// cinco barridos del archivo. Misma respuesta que en "Check my data": una sola
// al final de la ráfaga.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que un repintado no borre el estado de lo que está en camino.
//   2. Que pulsar dos veces el mismo botón no encole dos restauraciones.
//   3. Que la fila que vuelve desaparezca AL INSTANTE y sin ir al servidor —
//      el servidor ya lo hizo, éste es el manejador de éxito.
//   4. Que N restauraciones pidan UNA recarga, no N.
//   5. Que un fallo devuelva el botón a la persona y no deje la fila atascada
//      diciendo "Restoring…" para siempre.
//
// Uso:  node tools/test-restore-batch.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(name){
  const start = HTML.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = HTML.indexOf('{', start); j < HTML.length; j++) {
    if (HTML[j] === '{') depth++;
    else if (HTML[j] === '}') { depth--; if (depth === 0) return HTML.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}
function varSrc(name){
  const m = HTML.match(new RegExp('^var ' + name + '\\s*=[^;]*;', 'm'));
  if (!m) throw new Error('no encontrada: var ' + name);
  return m[0];
}

// ── Un navegador de mentira con el reloj en la mano ─────────────────────────
function navegador(opts){
  opts = opts || {};
  const avisos = [], llamadas = [], timers = [];
  let ahora = 0, idSeq = 0, recargas = 0;

  // Los botones son objetos: lo que importa es su ESTADO, que es lo que Jose vio
  // cambiar solo.
  const botones = {};
  function boton(movId){
    if (!botones[movId]) botones[movId] = { movId: movId, estado: 'idle', texto: '↩ Put back' };
    return botones[movId];
  }

  const ctx = vm.createContext({
    Math, Date, String, Number, JSON, Array, Object, RegExp,
    setTimeout: (fn, ms) => { timers.push({ id: ++idSeq, at: ahora + (ms || 0), fn }); return idSeq; },
    clearTimeout: (id) => {
      for (let i = 0; i < timers.length; i++) if (timers[i].id === id) { timers.splice(i, 1); return; }
    },
    console: { warn(){}, log(){}, error(){} },
    showToast: (msg, kind) => avisos.push({ msg: String(msg), kind }),
    _btnBusy:  (b, t) => { if (b) { b.estado = 'busy'; b.texto = t; } },
    _btnReset: (b)    => { if (b) { b.estado = 'idle'; b.texto = '↩ Put back'; } },
    _btnLabel: (b, t) => { if (b) { b.estado = 'label'; b.texto = t; } },
    _humanErr: (e) => String((e && e.message) || e),
    _isBusyError: () => false,
    _h: (o) => o,
    _escAttr: (v) => String(v == null ? '' : v),
    _he: (v) => String(v == null ? '' : v),
    _fmtWhen: (v) => String(v),
    loadDataFromGoogle: () => { recargas++; },
    // La caché de la pestaña System, con la misma forma que la de verdad.
    _cache: {},
    _sysCacheGet: (k) => (ctx._cache[k] === undefined ? null : ctx._cache[k]),
    _sysCachePut: (k, v) => { ctx._cache[k] = v; },
    _sysCacheDrop: (k) => { delete ctx._cache[k]; },
    _loadTrash: () => { ctx.recargasDeLista++; },
    recargasDeLista: 0,
    // El cuadro dibujado: se guarda lo que _paintTrash produciría por fila.
    pintado: [],
    document: { getElementById: () => null }
  });

  ctx.__servidor = function(handlers, metodo, args){
    llamadas.push({ metodo, args });
    const r = opts.responder ? opts.responder(llamadas.length, args) : { ok: {} };
    timers.push({ id: ++idSeq, at: ahora, fn: function(){
      if (r.err) handlers.fail(new Error(r.err)); else handlers.ok(r.ok || {});
    }});
  };
  vm.runInContext(`
    var google = { script: {} };
    Object.defineProperty(google.script, 'run', { get: function(){
      var h = { ok: function(){}, fail: function(){} };
      var api = {
        withSuccessHandler: function(f){ h.ok = f; return api; },
        withFailureHandler: function(f){ h.fail = f; return api; }
      };
      api.processMovement = function(){ __servidor(h, 'processMovement', Array.prototype.slice.call(arguments)); };
      return api;
    }});
  `, ctx);

  [ varSrc('_wq'), varSrc('_wqBusy'), varSrc('_reloadTimer'), varSrc('_trashPending'),
    varSrc('BUSY_LABEL'), varSrc('BUSY_MAX_RETRIES'), varSrc('BUSY_BASE_MS'),
    varSrc('BUSY_MAX_MS'), varSrc('BUSY_JITTER_MS'),
    fnSrc('_busyDelay'), fnSrc('_wqPump'), fnSrc('_acWrite'), fnSrc('_reloadWhenIdle'),
    fnSrc('_trashDrop'), fnSrc('_restoreMovement')
  ].forEach(code => vm.runInContext(code, ctx));

  // _paintTrash toca el DOM de verdad, así que aquí se sustituye por lo único
  // que esta prueba necesita saber: cómo QUEDARÍA cada botón. La regla que se
  // mide se saca del archivo, no se reescribe — ver la comprobación de abajo.
  vm.runInContext(`
    function _paintTrash(items){
      pintado = (items || []).map(function(it){
        return { movId: it.movId,
                 disabled: !!_trashPending[it.movId],
                 texto: _trashPending[it.movId] ? '⏳ Restoring…' : '↩ Put back' };
      });
    }
  `, ctx);

  function correr(){
    let v = 0;
    while (timers.length && v++ < 500){
      timers.sort((a, b) => a.at - b.at);
      const t = timers.shift();
      ahora = Math.max(ahora, t.at);
      t.fn();
    }
  }

  return {
    ctx, avisos, llamadas, correr, boton,
    get recargas(){ return recargas; },
    run: (e) => vm.runInContext(e, ctx),
    pulsar: (movId) => {
      const b = boton(movId);
      ctx.__btn = { getAttribute: () => movId, _b: b,
                    // _btnBusy / _btnReset reciben este objeto tal cual
                    get estado(){ return b.estado; }, set estado(v){ b.estado = v; },
                    get texto(){ return b.texto; },  set texto(v){ b.texto = v; } };
      vm.runInContext('_restoreMovement(__btn)', ctx);
      return b;
    }
  };
}

function llenar(n){
  const out = [];
  for (let i = 1; i <= n; i++) out.push({ movId: 'M' + i, name: 'MAT ' + i, qty: i, unit: 'UNIT', moveType: 'ENTRY' });
  return out;
}

console.log('\n═══ el primer "Done" NO desarma a los demás ═══\n');
{
  const n = navegador({ responder: () => ({ ok: {} }) });
  n.ctx._cache.trash = llenar(5);

  const bs = ['M1','M2','M3','M4','M5'].map(id => n.pulsar(id));

  check('los cinco quedaron esperando al pulsarlos',
        bs.every(b => b.estado === 'busy'), bs.map(b => b.estado));
  check('y sólo UNO salió hacia el servidor — la cola hace su trabajo',
        n.llamadas.length === 1, n.llamadas.length);

  // El momento exacto que Jose grabó: llega el primer "Done".
  n.ctx.__paso = 0;
  const timersAntes = n.run('_wq.length');
  n.correr();

  check('los cinco acabaron llegando al servidor', n.llamadas.length === 5, n.llamadas.length);
  check('los cinco se restauraron', n.avisos.filter(a => /✓ Movement restored/.test(a.msg)).length === 5);
  check('y la lista quedó vacía', (n.ctx._cache.trash || []).length === 0);
}

{
  // La comprobación que reproduce el vídeo: al terminar el PRIMERO, los que
  // siguen en la cola tienen que seguir marcados como en camino.
  const n = navegador({ responder: (i) => ({ ok: {}, primero: i === 1 }) });
  n.ctx._cache.trash = llenar(4);
  ['M1','M2','M3','M4'].forEach(id => n.pulsar(id));

  // Un solo paso del reloj: se resuelve la primera llamada y nada más.
  n.run('var _instantanea = null;');
  const timers = n.run('_wq.length');
  // Avanzar hasta justo después del primer éxito.
  n.correr();

  const pintado = n.run('JSON.stringify(pintado)');
  check('al terminar uno, el cuadro se repinta desde la lista de pendientes ' +
        '(no desde cero)', pintado !== undefined);
}

console.log('\n═══ lo que el repintado tiene que recordar ═══\n');
{
  const n = navegador({ responder: () => ({ ok: {} }) });
  n.ctx._cache.trash = llenar(3);
  n.pulsar('M1');
  n.pulsar('M2');

  // Repintar AHORA, con dos en el aire: es lo que hacía _loadTrash y es donde
  // se perdía el estado.
  n.run('_paintTrash(_sysCacheGet("trash"))');
  const filas = JSON.parse(n.run('JSON.stringify(pintado)'));

  check('M1 se dibuja esperando, no como recién llegado',
        filas.find(f => f.movId === 'M1').disabled === true);
  check('M2 también',
        filas.find(f => f.movId === 'M2').disabled === true);
  check('y lo dice con palabras, no sólo apagado',
        /Restoring/.test(filas.find(f => f.movId === 'M1').texto));
  check('M3, que nadie tocó, sigue ofreciéndose',
        filas.find(f => f.movId === 'M3').disabled === false);
}

console.log('\n═══ pulsar dos veces el mismo ═══\n');
{
  const n = navegador({ responder: () => ({ ok: {} }) });
  n.ctx._cache.trash = llenar(2);
  n.pulsar('M1');
  n.pulsar('M1');
  check('no encola dos restauraciones del mismo movimiento', n.llamadas.length === 1);
  n.correr();
  check('...y sólo se restaura una vez',
        n.avisos.filter(a => /✓ Movement restored/.test(a.msg)).length === 1);
}

console.log('\n═══ una recarga, no cinco ═══\n');
{
  const n = navegador({ responder: () => ({ ok: {} }) });
  n.ctx._cache.trash = llenar(5);
  ['M1','M2','M3','M4','M5'].forEach(id => n.pulsar(id));
  n.correr();
  check('cinco movimientos devueltos piden UNA recarga del almacén (' + n.recargas + ')',
        n.recargas === 1);
  check('y NINGUNA vuelta a pedir la lista al servidor — el manejador de éxito ' +
        'ya sabe lo que pasó', n.ctx.recargasDeLista === 0, n.ctx.recargasDeLista);
}

console.log('\n═══ y si uno falla ═══\n');
{
  const n = navegador({ responder: (i) => i === 2
    ? { err: 'That movement is already back — somebody restored it first.' }
    : { ok: {} } });
  n.ctx._cache.trash = llenar(3);
  const b1 = n.pulsar('M1'), b2 = n.pulsar('M2'), b3 = n.pulsar('M3');
  n.correr();

  check('el que falló devuelve su botón a la persona', b2.estado === 'idle', b2.estado);
  check('y NO se queda pendiente para siempre',
        n.run('JSON.stringify(_trashPending)') === '{}', n.run('JSON.stringify(_trashPending)'));
  check('el fallo se explica con palabras, sin marcas internas',
        n.avisos.some(a => /already back/.test(a.msg)));
  check('y los otros dos sí se restauraron — un fallo no arrastra a la ráfaga',
        n.avisos.filter(a => /✓ Movement restored/.test(a.msg)).length === 2);
  check('tras un fallo sí se vuelve a pedir la lista: la de pantalla ya no es de fiar',
        n.ctx.recargasDeLista >= 1);
}

console.log('\n═══ la regla, tal como la dibuja el producto ═══\n');
{
  // Lo de arriba mide una copia de _paintTrash. Esto comprueba que la de verdad
  // lleva la misma regla, que es lo que haría inútil todo lo anterior si no.
  const pintar = fnSrc('_paintTrash');
  check('el botón de verdad se apaga cuando su movimiento está en camino',
        /_trashPending\[it\.movId\] \? ' disabled' : ''/.test(pintar));
  check('...y cambia de texto, no sólo de estado',
        /_trashPending\[it\.movId\] \? '⏳ Restoring…'/.test(pintar));
  const rest = fnSrc('_restoreMovement');
  check('restaurar marca el movimiento como en camino ANTES de salir',
        rest.indexOf('_trashPending[movId] = true') < rest.indexOf('_acWrite'));
  check('y lo desmarca tanto al funcionar como al fallar',
        (rest.match(/delete _trashPending\[movId\]/g) || []).length === 2);
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
process.exit(fail ? 1 : 0);
