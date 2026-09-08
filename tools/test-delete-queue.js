// BORRAR VARIOS A LA VEZ NO DEBE DAR UN ERROR.
//
// Jose, 2026-09-08: borró cuatro movimientos seguidos y los últimos salieron con
// "System busy". Pidió lo mismo que ya hace un guardado — ponerse en cola en vez
// de enseñar un error. Tenía razón dos veces, porque la cola YA EXISTÍA
// (`_busyRetry`, v11.47) y estaba enganchada a los tres caminos de guardado y a
// NINGÚN borrado. Hueco mío.
//
// PERO LA COLA DEL SERVIDOR NO ES LA PRIMERA RESPUESTA, ES LA SEGUNDA.
//
// La razón de que saltara tan fácil es que cada borrado reconstruye los totales
// de TODO el almacén con el candado en la mano. Cuatro borrados a la vez son
// cuatro reconstrucciones enteras peleándose por el mismo candado — y el
// navegador se las pedía todas de golpe. Contra eso, reintentar más rápido no
// arregla nada: lo que hay que hacer es NO PEDIRLO TODO A LA VEZ.
//
// Así que hay dos mecanismos, y este archivo protege los dos:
//
//   1. UNA COLA EN EL NAVEGADOR. Los borrados salen de uno en uno, en el orden
//      en que se pulsaron. Esto quita la causa.
//   2. EL REINTENTO CON ESPERA CRECIENTE, detrás, para cuando quien tiene el
//      candado es OTRA persona — eso el navegador no lo puede evitar.
//
// Y una tercera cosa que es fácil perder: la recarga silenciosa NO puede correr
// entre un borrado y el siguiente. Traerse el almacén entero cuatro veces en
// mitad de una ráfaga es justo lo que la hacía lenta.
//
// Se EJECUTAN las funciones de verdad contra un servidor falso que se puede
// poner ocupado a voluntad.
//
// Uso:  node tools/test-delete-queue.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
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
  // Tolerante con el espaciado: las tres se declaran alineadas en columna.
  const m = new RegExp('var\\s+' + name + '\\s*=[^;]*;').exec(HTML);
  if (!m) throw new Error('no encontrada: ' + name);
  return m[0];
}

// ── El mundo ────────────────────────────────────────────────────────────────
// El servidor falso no contesta solo: cada llamada se queda esperando y se
// resuelve a mano. Es la única forma de comprobar que sale UNA y no cuatro.
function mundo(){
  const pendientes = [];
  const eventos = [];
  const movs = [
    { rowIdx: 2, movId: 'M-1', name: 'A' },
    { rowIdx: 3, movId: 'M-2', name: 'B' },
    { rowIdx: 4, movId: 'M-3', name: 'C' },
    { rowIdx: 5, movId: 'M-4', name: 'D' }
  ];

  const runner = {
    withSuccessHandler(fn){ this._ok = fn; return this; },
    withFailureHandler(fn){ this._no = fn; return this; },
    processMovement(action, data){
      pendientes.push({ action, data, ok: this._ok, no: this._no });
      eventos.push('call:' + data.movId);
    }
  };

  const c = vm.createContext({
    console, String, Number, Math, Object, Array, JSON, Date,
    setTimeout: (fn) => { c._timers.push(fn); },   // el tiempo se avanza a mano
    _timers: [],
    movements: movs,
    google: { script: { run: runner } },
    _h: (d) => d,
    _stripTags: (e) => String(e && e.message || e),
    renderAll: () => { eventos.push('render'); },
    showToast: (m, t) => { eventos.push('toast:' + (t || 'ok')); },
    loadDataFromGoogle: () => { eventos.push('reload'); },
    _sysCacheDrop: () => {},
    BUSY_MAX_RETRIES: 4,
    _busyDelay: () => 10,
    _isBusyError: (e) => String(e && e.message || e).indexOf('SYSTEM_BUSY|') !== -1
  });
  vm.runInContext([
    varSrc('_delQueue'), varSrc('_delRunning'), varSrc('_delPending'),
    fnSrc('_delEnqueue'), fnSrc('_delPump'),
    fnSrc('_movByRowIdx'), fnSrc('_doDeleteMovementRow')
  ].join('\n'), c);

  return {
    ctx: c, pendientes, eventos, movs,
    borrar(rowIdx){ c._r = rowIdx; vm.runInContext('_doDeleteMovementRow(_r)', c); },
    // Avanza los temporizadores pendientes (los reintentos).
    tic(){ const t = c._timers.slice(); c._timers.length = 0; t.forEach(f => f()); },
    pend(){ return vm.runInContext('Object.keys(_delPending)', c); },
    cola(){ return vm.runInContext('_delQueue.length', c); }
  };
}

const OCUPADO = new Error('SYSTEM_BUSY|System busy — someone else is saving right now.');

console.log('\n═══ cuatro papeleras seguidas, una sola llamada ═══\n');
{
  const m = mundo();
  m.borrar(2); m.borrar(3); m.borrar(4); m.borrar(5);

  check('SÓLO SALE UNA — es lo que quita la causa. Cuatro de golpe eran cuatro ' +
        'reconstrucciones del almacén entero peleándose por el mismo candado',
    m.pendientes.length === 1);
  check('y es la primera que se pulsó', m.pendientes[0].data.movId === 'M-1');
  check('las otras tres esperan turno', m.cola() === 3);
  check('las cuatro filas se ven esperando — siguen en la tabla porque TODAVÍA ' +
        'no se han borrado, y atenuarlas es la verdad',
    m.pend().length === 4);

  m.pendientes[0].ok({ status: 'success' });
  check('al contestar la primera sale la segunda, en orden',
    m.pendientes.length === 2 && m.pendientes[1].data.movId === 'M-2');
  check('y esa fila ya no está esperando', m.pend().indexOf('M-1') === -1);
  check('la fila desaparece de la lista al instante, no al recargar',
    m.movs.length === 3 && !m.movs.some(x => x.movId === 'M-1'));

  m.pendientes[1].ok({ status: 'success' });
  m.pendientes[2].ok({ status: 'success' });
  check('la tercera y la cuarta salen igual, de una en una',
    m.pendientes.length === 4 && m.pendientes[3].data.movId === 'M-4');
}

console.log('\n═══ la recarga no se mete en medio de la ráfaga ═══\n');
{
  const m = mundo();
  m.borrar(2); m.borrar(3);
  m.pendientes[0].ok({ status: 'success' });
  check('tras el primero, con otro esperando, NO se recarga — traerse el ' +
        'almacén entero entre un borrado y el siguiente es lo que hacía lenta ' +
        'la ráfaga (' + m.eventos.filter(e => e === 'reload').length + ' recargas)',
    m.eventos.filter(e => e === 'reload').length === 0);

  m.pendientes[1].ok({ status: 'success' });
  check('y al terminar el último sí se recarga, UNA vez, para reconciliar los ' +
        'totales que calcula el servidor',
    m.eventos.filter(e => e === 'reload').length === 1);
}

console.log('\n═══ ocupado no es un fallo: es un turno ═══\n');
{
  const m = mundo();
  m.borrar(2);
  m.pendientes[0].no(OCUPADO);

  check('no se le enseña ningún error a nadie — la fila ya se ve esperando, y ' +
        'un aviso por cada reintento sería ruido sobre algo que se arregla solo',
    m.eventos.filter(e => e.indexOf('toast:err') === 0).length === 0);
  check('la fila sigue esperando, no vuelve a su sitio como si nada',
    m.pend().indexOf('M-1') !== -1);
  check('y hay un reintento programado', m.ctx._timers.length === 1);

  m.tic();
  check('el reintento pide OTRA VEZ el mismo movimiento',
    m.pendientes.length === 2 && m.pendientes[1].data.movId === 'M-1');

  m.pendientes[1].ok({ status: 'success' });
  check('y cuando entra, se comporta como cualquier borrado',
    m.movs.length === 3 && m.pend().length === 0);
}

console.log('\n═══ pero no se reintenta para siempre ═══\n');
{
  const m = mundo();
  m.borrar(2);
  // Se falla la ÚLTIMA llamada y se avanza el reloj, hasta que deja de salir
  // una nueva. Un bucle de vueltas fijas fallaría la misma llamada dos veces
  // después de que se rindiera, y contaría dos avisos donde el código da uno —
  // la prueba midiéndose a sí misma en vez de al producto.
  for (let guard = 0; guard < 20; guard++){
    const antes = m.pendientes.length;
    m.pendientes[antes - 1].no(OCUPADO);
    m.tic();
    if (m.pendientes.length === antes) break;
  }
  check('para a las ' + (m.ctx.BUSY_MAX_RETRIES + 1) + ' — un reintento infinito ' +
        'es una app colgada con buenos modales',
    m.pendientes.length === m.ctx.BUSY_MAX_RETRIES + 1);
  check('y AHÍ SÍ habla, diciendo que no se borró nada',
    m.eventos.filter(e => e === 'toast:err').length === 1);
  check('la fila vuelve a la normalidad: se puede volver a intentar',
    m.pend().length === 0);
  check('y no se quedó nada trabado en la cola',
    m.cola() === 0 && vm.runInContext('_delRunning', m.ctx) === false);
}

console.log('\n═══ un error que NO es "ocupado" no se reintenta ═══\n');
{
  const m = mundo();
  m.borrar(2);
  m.pendientes[0].no(new Error('Already deleted by jose@ox-glass.com on Sep 8.'));
  check('se dice a la primera — "ya lo borró otro" no mejora por insistir',
    m.pendientes.length === 1 && m.eventos.filter(e => e === 'toast:err').length === 1);
  check('la fila se queda en la tabla, que es la verdad: no la borró esta persona',
    m.movs.length === 4);
  check('y la cola sigue corriendo para los demás', m.cola() === 0);
}

console.log('\n═══ dos toques en la misma papelera ═══\n');
{
  const m = mundo();
  m.borrar(2); m.borrar(2);
  check('no encola dos borrados del mismo movimiento — el segundo recibiría ' +
        '"ya lo borró jose@…", que es verdad y no ayuda a nadie',
    m.pendientes.length === 1 && m.cola() === 0);
}

console.log('\n' + '─'.repeat(72));
console.log('La cola del servidor era la segunda respuesta. La primera es no');
console.log('pedirle cuatro reconstrucciones del almacén a la vez.');
console.log('─'.repeat(72));

console.log('\ndelete queue: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
