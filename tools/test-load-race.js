// UNA RESPUESTA VIEJA NO PUEDE PINTAR ENCIMA DE UNA NUEVA.
//
// Jose, 2026-09-07. Borró cuatro movimientos en una cuenta; doce minutos
// después la OTRA cuenta seguía enseñando uno de ellos. Las dos en verde, la
// consola limpia, y el latido llamando al servidor todo el rato — o sea que los
// datos frescos SÍ estaban llegando, y aun así la pantalla enseñaba lo viejo.
//
// LA CAUSA: NADA IMPEDÍA QUE DOS CARGAS SE SOLAPARAN.
//
// Desde la v11.48 el latido puede disparar una recarga silenciosa cada 20 s, y
// además la disparan cada guardado, cada borrado y cada vuelta de off-line.
// Apps Script no promete que las respuestas lleguen en el orden en que se
// pidieron. Si la carga A —pedida ANTES del borrado— tarda seis segundos y la
// carga B —pedida después— tarda dos, entonces:
//
//     B llega: pinta el almacén sin el movimiento borrado.  ✔
//     A llega: pinta el almacén DE ANTES, con el movimiento. ✘
//
// El movimiento borrado reaparece y no hay un solo error en ninguna parte,
// porque las dos llamadas fueron un éxito. Por eso la consola estaba limpia:
// no había nada que registrar.
//
// Y ES INTERMITENTE POR DEFINICIÓN — depende de qué respuesta gane la carrera.
// Eso es literalmente lo que Jose describía: "a veces deja de actualizarse aun
// cuando estamos trabajando en ella".
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que una respuesta atrasada se DESCARTE, sin tocar la pantalla. Es la
//      línea que arregla el fallo, y la única que no se puede comprobar
//      leyendo: hay que hacer llegar dos respuestas al revés.
//   2. Que el número aplicado NUNCA RETROCEDA. Con `<=` en vez de `<`, o
//      reasignando sin comparar, la protección se deshace sin que nada falle.
//   3. Que el sello del latido se aprenda SÓLO de una carga aplicada. Si se
//      apunta antes, una carga perdida da el cambio por visto y nadie vuelve a
//      intentarlo — el fallo se vuelve permanente en vez de intermitente.
//
// Se EJECUTA con un servidor falso que responde AL REVÉS a propósito.
//
// Uso:  node tools/test-load-race.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC  = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function fnSrc(name){
  const start = SRC.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = SRC.indexOf('{', start); j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) return SRC.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// ── El escenario: dos cargas, respuestas al revés ───────────────────────────
console.log('\n═══ la respuesta atrasada no pinta ═══\n');

function mundo(){
  const pendientes = [];
  const ctx = vm.createContext({
    console, Date, JSON,
    // Lo único que nos importa: qué acabó en pantalla.
    movements: [], stockData: {},
    _pintados: [],
    lastLoadTime: null,
    _dataStamp: null,
    _applyData: (d) => { ctx._pintados.push(d.marca); ctx.movements = d.movements; },
    _saveCache: () => {}, _announceSystemActivity: () => {},
    applyCompanyBranding: () => {}, _setAccountIdentity: () => {},
    renderActiveUsers: () => {}, applyRoleUI: () => {},
    refreshCategoryDropdowns: () => {}, refreshDropdowns: () => {},
    refreshProjectDropdown: () => {}, renderAll: () => {},
    _restoreTab: () => {}, checkMorningPopup: () => {},
    _offerSetupIfUnconfigured: () => {}, _showSetupNudge: () => {},
    _refreshOpenExitForm: () => {}, _checkVersionMatch: () => {},
    setConnStatus: (s) => { ctx._estado = s; },
    setLoading: () => {}, _hideSplash: () => {}, _loadCache: () => null,
    _sessionToken: 'tok', userEmail: '', userRole: 'ADMIN',
    document: { getElementById: () => null },
    google: { script: { run: {
      withSuccessHandler(fn){ this._ok = fn; return this; },
      withFailureHandler(fn){ this._no = fn; return this; },
      // No responde: la respuesta se dispara a mano, en el orden que queramos.
      getInitialData(){ pendientes.push({ ok: this._ok, no: this._no }); }
    }}}
  });
  vm.runInContext(SRC.slice(SRC.indexOf('var _loadSeq'),
                            SRC.indexOf('// ── Charts Load')), ctx);
  return { ctx, pendientes,
           cargar: (q) => vm.runInContext('loadDataFromGoogle(true, ' + !!q + ')', ctx) };
}

{
  const m = mundo();
  m.cargar(true);   // carga A — pedida antes del borrado
  m.cargar(true);   // carga B — pedida después
  check('las dos llamadas salieron', m.pendientes.length === 2);

  // Responden AL REVÉS: primero la nueva, y la vieja detrás.
  m.pendientes[1].ok({ marca: 'B-nueva', movements: [1, 2], accessStatus: 'OK', userRole: 'ADMIN' });
  m.pendientes[0].ok({ marca: 'A-vieja', movements: [1, 2, 3], accessStatus: 'OK', userRole: 'ADMIN' });

  check('la respuesta NUEVA pinta (' + m.ctx._pintados.join(', ') + ')',
    m.ctx._pintados.indexOf('B-nueva') !== -1);
  check('LA VIEJA NO PINTA — es la línea que arregla el fallo de Jose: sin ' +
        'ella, el movimiento borrado reaparece y nadie se entera porque las ' +
        'dos llamadas fueron un éxito',
    m.ctx._pintados.indexOf('A-vieja') === -1);
  check('y lo que queda en pantalla son los datos nuevos, no los de antes (' +
        JSON.stringify(m.ctx.movements) + ')',
    m.ctx.movements.length === 2);
}

console.log('\n═══ en el orden normal no estorba ═══\n');
{
  const m = mundo();
  m.cargar(true);
  m.pendientes[0].ok({ marca: 'primera', movements: [1], accessStatus: 'OK', userRole: 'ADMIN' });
  m.cargar(true);
  m.pendientes[1].ok({ marca: 'segunda', movements: [1, 2], accessStatus: 'OK', userRole: 'ADMIN' });
  check('dos cargas seguidas, cada una en su turno, pintan las dos',
    m.ctx._pintados.join(',') === 'primera,segunda');
}

console.log('\n═══ una carga fallida no bloquea la siguiente ═══\n');
{
  const m = mundo();
  m.cargar(true);
  m.pendientes[0].no(new Error('sin red'));
  check('el fallo se ve', m.ctx._estado === 'offline');
  m.cargar(true);
  m.pendientes[1].ok({ marca: 'después', movements: [9], accessStatus: 'OK', userRole: 'ADMIN' });
  check('y la siguiente carga sí pinta — un fallo no puede dejar la pantalla ' +
        'congelada para siempre', m.ctx._pintados.join(',') === 'después');
}

// ── Las reglas del contador, leídas del archivo ─────────────────────────────
console.log('\n═══ el contador no puede retroceder ═══\n');
{
  const cuerpo = fnSrc('loadDataFromGoogle');
  check('cada llamada toma su número al entrar, antes de pedir nada',
    /var seq = \+\+_loadSeq;/.test(cuerpo));
  check('se descarta con `<`, no con `<=` — con `<=` dos respuestas del mismo ' +
        'número se descartarían entre sí y no pintaría ninguna',
    /if \(seq < _loadApplied\) return;/.test(cuerpo));
  check('y el aplicado se sube DESPUÉS de decidir, nunca antes',
    cuerpo.indexOf('if (seq < _loadApplied) return;') <
    cuerpo.indexOf('_loadApplied = seq;'));
  check('la bandera de "hay una en camino" se baja en los DOS finales, éxito ' +
        'y fallo — si sólo se bajara en el éxito, un fallo la dejaría trabada ' +
        'y el latido no volvería a pedir datos nunca',
    (cuerpo.match(/_loadBusy = false;/g) || []).length === 2);
}

console.log('\n═══ y el sello sólo se aprende de una carga aplicada ═══\n');
{
  const pulso = fnSrc('_pulseOk');
  check('el latido NO apunta el sello por su cuenta — si lo apuntara antes de ' +
        'tener los datos, una carga perdida daría el cambio por visto y nadie ' +
        'volvería a intentarlo',
    !/_dataStamp = res\.stamp/.test(pulso));
  check('...lo compara, nada más', /res\.stamp !== _dataStamp/.test(pulso));
  check('y quien lo apunta es la carga, cuando ya tiene los datos en la mano',
    /if \(data\.dataStamp\) _dataStamp = data\.dataStamp;/.test(fnSrc('loadDataFromGoogle')));
  check('el latido tampoco amontona cargas si ya hay una en camino',
    /&& !_loadBusy\)/.test(pulso));
}

console.log('\n' + '─'.repeat(72));
console.log('Las dos llamadas eran un éxito. Por eso la consola estaba limpia y');
console.log('los dos puntos en verde: no había nada averiado que registrar, sólo');
console.log('dos respuestas correctas llegando en el orden equivocado.');
console.log('─'.repeat(72));

console.log('\nload race: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
