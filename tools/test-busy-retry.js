// "OCUPADO" NO ES UN ERROR DE QUIEN GUARDA.
//
// Jose, prueba con tres cuentas (2026-09-04): tres salidas del mismo estante
// que sumaban exactamente lo que había, 142 = 42 + 50 + 50. Los tres
// movimientos eran legítimos. Una pasó y dos vieron un error rojo.
//
//   "no debemos dejar que la app muestre un error cuando los movimientos sí
//    están hechos correctamente, pero es el sistema el que no lo está haciendo
//    bien. debemos poner en cola los movimientos o reintentar hacerlos otra
//    vez, si todo está correcto."
//
// El servidor ya serializaba bien las escrituras. Lo que estaba mal era el
// final de la espera: el candado se rinde a los 8 segundos y devuelve un error,
// y el navegador lo enseñaba igual que enseñaría "no hay suficiente material".
// Dos cosas opuestas con la misma cara — una dice QUE NO y la otra TODAVÍA NO.
//
// LO QUE ESTE ARCHIVO PROTEGE, y en este orden de importancia:
//
//   1. Que un "ocupado" se reintente y que un "no hay suficiente" NO. Confundir
//      el segundo con el primero sería reintentar en bucle algo que nunca va a
//      pasar, y peor: si algún día un error POSTERIOR a la escritura llevara la
//      marca, el reintento duplicaría movimientos. Por eso también se comprueba
//      que la marca sólo se ponga donde se pide el candado.
//   2. Que las esperas lleven una parte AL AZAR. Sin ella, tres navegadores
//      reintentan a los mismos milisegundos y vuelven a chocar los tres en cada
//      ronda; el tercero podría no pasar nunca. Parece un adorno y es lo que
//      hace que la cola avance.
//   3. Que al agotarse los reintentos se diga de quién es el problema. "Error:
//      ..." a secas le dice a la persona que hizo algo mal cuando no lo hizo.
//
// Se EJECUTA el reintento con un servidor falso que dice "ocupado" un número
// exacto de veces. Leer el código no distingue un reintento que funciona de uno
// que se queda colgado.
//
// Uso:  node tools/test-busy-retry.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC  = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function fnSrc(src, name){
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// ── 1. Los dos lados del contrato usan la MISMA marca ───────────────────────
console.log('\n═══ servidor y navegador hablan de lo mismo ═══\n');
{
  const m = /var BUSY_PREFIX = '([^']+)'/.exec(GS);
  check('el servidor declara la marca en una constante, no suelta por ahí', !!m);
  const marca = m ? m[1] : '';
  check('y el navegador reconoce esa misma marca (' + marca + ')',
    SRC.indexOf("indexOf('" + marca + "')") !== -1);

  // DÓNDE se pone la marca es lo que hace seguro el reintento: sólo al pedir el
  // candado, o sea antes de escribir nada. Un "ocupado" posterior a la
  // escritura convertiría cada reintento en un movimiento duplicado.
  const usos = GS.split('\n')
    .map((l, i) => ({ l, n: i + 1 }))
    .filter(x => x.l.indexOf('BUSY_PREFIX +') !== -1);
  check('la marca se pone en exactamente dos sitios (' + usos.length + ')',
    usos.length === 2);
  const contexto = usos.map(x => GS.split('\n').slice(x.n - 4, x.n).join(' '));
  check('LOS DOS SON AL PEDIR EL CANDADO, antes de escribir nada — que es lo ' +
        'que hace que reintentar no pueda duplicar un movimiento',
    contexto.every(c => /tryLock|waitLock/.test(c)));
}

// ── 2. El reintento, ejecutado ──────────────────────────────────────────────
console.log('\n═══ se reintenta solo, y el botón lo dice ═══\n');

function escenario(opciones){
  const ctx = vm.createContext({
    console,
    // Un reloj falso: los setTimeout se apuntan y se disparan a mano, para que
    // la prueba no tarde los segundos de verdad de la espera creciente.
    _pendientes: [],
    setTimeout: (fn, ms) => { ctx._pendientes.push({ fn, ms }); return ctx._pendientes.length; },
    Math: Math,
    _botones: [],
    _avisos: [],
    _btnBusy: (btn, txt) => { btn.texto = txt; btn.pulsable = false; ctx._botones.push(txt); },
    _btnReset: (btn) => { btn.texto = 'Save to System'; btn.pulsable = true; },
    _setModalBusy: (id, on) => { ctx._modalOcupado = on; },
    showToast: (m, k) => { ctx._avisos.push({ m, k }); }
  });
  vm.runInContext(SRC.slice(SRC.indexOf('var BUSY_MAX_RETRIES'),
                            SRC.indexOf('// ── Modal: Submit')), ctx);

  const btn = { texto: 'Saving…', pulsable: false };
  const state = { tries: 0 };
  let intentos = 0;
  const err = () => new Error('Error: SYSTEM_BUSY|System busy — another save is in progress.');

  function intentar(){
    intentos++;
    if (intentos > opciones.ocupadoHasta) { ctx._exito = true; return; }
    const manejado = vm.runInContext('_busyRetry', ctx)(
      opciones.error ? opciones.error() : err(),
      { btn: btn, overlay: 'moveOverlay', state: state, retry: intentar });
    ctx._noManejado = !manejado;
  }
  intentar();
  // Disparar todos los tiempos apuntados, en orden.
  let guard = 0;
  while (ctx._pendientes.length && guard++ < 50) {
    const t = ctx._pendientes.shift();
    ctx._esperas = (ctx._esperas || []).concat(t.ms);
    t.fn();
  }
  return { intentos, btn, state, ctx };
}

{
  // Ocupado dos veces y a la tercera pasa — el caso de Jose con tres personas.
  const r = escenario({ ocupadoHasta: 2 });
  check('con el sistema ocupado dos veces, el guardado ACABA PASANDO solo (' +
        r.intentos + ' intentos)', r.ctx._exito === true && r.intentos === 3);
  check('...sin enseñar ni un error por el camino', r.ctx._avisos.length === 0);
  check('...y el botón dice que está esperando turno, no que falló ("' +
        r.btn.texto + '")', /Waiting its turn/.test(r.ctx._botones.join(' ')));
  check('...y no se puede volver a pulsar mientras espera — pulsarlo otra vez ' +
        'es justo lo que hay que evitar', r.btn.pulsable === false);
}

console.log('\n═══ las esperas crecen y no van todas a la vez ═══\n');
{
  const r = escenario({ ocupadoHasta: 99 });   // nunca pasa: se agotan
  const esperas = r.ctx._esperas || [];
  check('espera entre intento e intento (' + esperas.join(', ') + ' ms)',
    esperas.length === 4);
  check('cada espera es mayor que la anterior — si el sistema sigue ocupado, ' +
        'insistir más rápido sólo empeora la cola',
    esperas.every((v, i) => i === 0 || v > esperas[i - 1]));

  // La parte al azar: dos escenarios idénticos NO pueden dar la misma espera.
  // Si la dieran, tres navegadores reintentarían a la vez y volverían a chocar.
  const otra = escenario({ ocupadoHasta: 99 }).ctx._esperas || [];
  check('DOS NAVEGADORES NO ESPERAN LO MISMO (' + esperas[0] + ' vs ' +
        otra[0] + ') — sin esa parte al azar, tres personas reintentan al ' +
        'mismo milisegundo y vuelven a chocar las tres en cada ronda',
    esperas.join(',') !== otra.join(','));
}

console.log('\n═══ cuando de verdad se agota, se dice de quién es el problema ═══\n');
{
  const r = escenario({ ocupadoHasta: 99 });
  check('se rinde tras un número acotado de intentos, no en bucle (' +
        r.intentos + ')', r.intentos === 5);
  check('devuelve el botón a la persona', r.btn.pulsable === true);
  const aviso = (r.ctx._avisos[0] || {}).m || '';
  check('avisa una sola vez, no una por intento', r.ctx._avisos.length === 1);
  check('DICE QUE NO SE GUARDÓ NADA — sin eso, quien lo lee no sabe si tiene ' +
        'que volver a escribirlo todo', /nothing was saved|Nothing was saved/i.test(aviso));
  check('...y que lo que escribió está bien: el problema fue del sistema',
    /nothing is wrong with what you entered/i.test(aviso));
  check('...y no se pinta como error rojo, porque no lo es (' +
        (r.ctx._avisos[0] || {}).k + ')', (r.ctx._avisos[0] || {}).k === 'warn');
}

console.log('\n═══ y un "no hay suficiente" NO se reintenta ═══\n');
{
  const r = escenario({
    ocupadoHasta: 99,
    error: () => new Error('Error: Cannot remove 50. Only 42 available.')
  });
  check('un error de verdad pasa de largo y lo enseña quien llama — ' +
        'reintentar algo que nunca va a caber sería un bucle',
    r.ctx._noManejado === true && r.intentos === 1);
  check('...sin tocar el botón ni avisar por su cuenta',
    r.ctx._avisos.length === 0);
}

// ── 3. Los TRES caminos de guardado, no uno ────────────────────────────────
console.log('\n═══ los tres caminos, no sólo el que se probó ═══\n');
{
  // Este archivo ya lleva dos comentarios que dicen "addMultiExit never got it
  // wired up" y "addMultiEntry never got it wired up" sobre el aviso de
  // duplicado: se escribió tres veces y sólo llegó a una. El reintento se
  // escribió UNA vez por eso mismo, y esto lo comprueba.
  const caminos = [
    ['movimiento suelto', 'submitMovement'],
    ['salidas (el que reventó en la prueba)', 'submitMultiExit'],
    ['entradas', 'submitMultiEntry']
  ];
  caminos.forEach(([que, fn]) => {
    let cuerpo;
    try { cuerpo = fnSrc(SRC, fn); } catch (e) { cuerpo = ''; }
    check(que + ': reintenta cuando el sistema está ocupado',
      /_busyRetry\(err/.test(cuerpo));
    check(que + ': ...y lo hace ANTES de soltar el botón, para que no se ' +
          'pueda volver a pulsar durante la espera',
      cuerpo.indexOf('_busyRetry(err') !== -1 &&
      (cuerpo.indexOf('_busyRetry(err') < cuerpo.indexOf("btn.disabled=false") ||
       cuerpo.indexOf('btn.disabled=false') === -1));
    check(que + ': su contador de intentos es propio, no global — si no, los ' +
          'intentos de un guardado contarían en el siguiente',
      /var _busyState = \{ tries: 0 \}/.test(cuerpo));
  });

  const veces = (SRC.match(/function _busyRetry\(/g) || []).length;
  check('y el reintento está escrito UNA sola vez (' + veces + ')', veces === 1);
}

console.log('\n' + '─'.repeat(72));
console.log('El servidor siempre hizo lo correcto: pone las escrituras en fila');
console.log('para que nadie se pise. Lo que faltaba era el final de la espera —');
console.log('rendirse a los 8 segundos y llamarlo error. Los movimientos de');
console.log('Jose eran los tres válidos; sólo les faltaba turno.');
console.log('─'.repeat(72));

console.log('\nbusy retry: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
