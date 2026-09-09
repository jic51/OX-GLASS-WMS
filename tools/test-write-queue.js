// "OCUPADO" NO ES UN ERROR, Y NUNCA DEBE LEERSE COMO UNO.
//
// Jose vio esto en pantalla el 2026-09-09, dos veces seguidas, al pulsar
// "Check my data → Apply":
//
//   Could not apply: Error: SYSTEM_BUSY|System busy — someone else is saving
//   right now. Please try again in a moment. [ID: 3da14230]
//
// Y dijo lo que había que decir:
//
//   "¿este feature tiene una cola? ¿cuántos de estos requests podemos poner en
//    la cola? No tiene sentido poner una cola si la cola solo puede con 3 o 4
//    cosas a la vez. Debemos hacer que el sistema los maneje todos, los
//    mantenga en la cola hasta que se puedan realizar, pero estos mensajes no
//    le ayudan al usuario. A mí me dicen algo, pero al usuario no."
//
// LO QUE SE MIDIÓ EN EL CÓDIGO ANTES DE TOCAR NADA, porque su premisa había que
// corregirla en un punto: OCHO funciones del servidor toman el candado del
// stock y pueden contestar "ocupado", y sólo DOS estaban protegidas en el
// navegador. La cola que existía (la de borrar) NO tenía límite de tamaño; lo
// que estaba limitado a 4 era el REINTENTO — unos trece segundos.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que NINGUNA marca interna llegue a la pantalla. Ni SYSTEM_BUSY|, ni
//      SHORT_STOCK|, ni el "Error:" de Apps Script, ni el [ID: 3da14230] — que
//      es la referencia del registro del servidor y le ocupa media línea del
//      aviso a alguien que no puede hacer nada con ella.
//   2. Que el ID no se pierda: va a la consola, que es donde el soporte lo
//      busca. Quitarlo del todo sería cambiar un problema por otro.
//   3. Que la espera dure de verdad. Trece segundos es poco para un almacén
//      donde tres personas guardan a la vez.
//   4. Que haya UNA cola, no tres comportamientos distintos. Dos pestañas de la
//      misma persona ya no compiten entre sí.
//   5. Que "ocupado" y "no se puede" digan cosas DISTINTAS. Confundirlas deja a
//      la persona sin saber si volver a intentarlo sirve de algo.
//   6. Que los ocho caminos con candado estén cubiertos, no dos.
//
// Uso:  node tools/test-write-queue.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
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
function fnSrcOf(name){ return fnSrc(HTML, name); }
function varSrc(name){
  const re = new RegExp('^var ' + name + '\\s*=[^;]*;', 'm');
  const m = HTML.match(re);
  if (!m) throw new Error('no encontrada: var ' + name);
  return m[0];
}

// ── Un navegador de mentira, con el reloj en la mano ────────────────────────
// Los setTimeout se guardan en vez de dispararse, para poder adelantar el
// tiempo a voluntad y MEDIR cuánto habría esperado de verdad.
function navegador(opts){
  opts = opts || {};
  const avisos = [], consola = [], botones = [];
  let ahora = 0, idSeq = 0;
  const timers = [];

  const ctx = vm.createContext({
    Math, Date, String, Number, JSON, Array, Object, RegExp,
    setTimeout: (fn, ms) => { timers.push({ id: ++idSeq, at: ahora + (ms || 0), fn }); return idSeq; },
    // clearTimeout de verdad: quita el temporizador de la lista. Uno fingido
    // dejaría correr veinte recargas y la prueba diría que hay veinte cuando el
    // código sólo pidió una.
    clearTimeout: (id) => {
      for (let i = 0; i < timers.length; i++) if (timers[i].id === id) { timers.splice(i, 1); return; }
    },
    console: { warn: (...a) => consola.push(a.join(' ')), log(){}, error(){} },
    showToast: (msg, kind, ms) => avisos.push({ msg: String(msg), kind: kind, ms: ms }),
    _btnBusy:  (b, t) => { if (b) { b.estado = 'busy'; b.texto = t; } botones.push('busy'); },
    _btnReset: (b)    => { if (b) b.estado = 'reset'; botones.push('reset'); },
    _btnLabel: (b, t) => { if (b) { b.estado = 'label'; b.texto = t; } },
    _btnDone:  (b, x, cb) => { if (b) b.estado = 'done'; if (cb) cb(); },
    _settingMsg: (msg, kind) => avisos.push({ msg: String(msg), kind: kind }),
    google: { script: { run: null } }
  });

  [ varSrc('BUSY_LABEL'), varSrc('BUSY_MAX_RETRIES'), varSrc('BUSY_BASE_MS'),
    varSrc('BUSY_MAX_MS'), varSrc('BUSY_JITTER_MS'), varSrc('SHORT_PREFIX'),
    varSrc('_wq'), varSrc('_wqBusy'),
    fnSrc(HTML, '_isBusyError'), fnSrc(HTML, '_stripTags'), fnSrc(HTML, '_humanErr'),
    fnSrc(HTML, '_busyDelay'), fnSrc(HTML, '_wqPump'), fnSrc(HTML, '_acWrite')
  ].forEach(code => vm.runInContext(code, ctx));

  // El servidor falso: cada llamada consulta `respuestas` y contesta lo que
  // toque. `enVuelo` es lo que hace visible si la cola está serializando.
  const llamadas = [];
  let enVuelo = 0, maxEnVuelo = 0;
  ctx.__servidor = function(handlers, metodo, args){
    llamadas.push({ metodo, args });
    enVuelo++; if (enVuelo > maxEnVuelo) maxEnVuelo = enVuelo;
    const r = opts.responder ? opts.responder(llamadas.length, metodo, args) : { ok: {} };
    // La respuesta llega en el siguiente turno, como una de verdad.
    timers.push({ id: ++idSeq, at: ahora, fn: function(){
      enVuelo--;
      if (r.err) handlers.fail(typeof r.err === 'string' ? new Error(r.err) : r.err);
      else handlers.ok(r.ok || {});
    }});
  };

  vm.runInContext(`
    google.script.run = (function(){
      function nuevo(){
        var h = { ok: function(){}, fail: function(){} };
        var api = {
          withSuccessHandler: function(f){ h.ok = f; return api; },
          withFailureHandler: function(f){ h.fail = f; return api; }
        };
        ['processMovement','adminAction'].forEach(function(m){
          api[m] = function(){ __servidor(h, m, Array.prototype.slice.call(arguments)); };
        });
        return api;
      }
      return nuevo();
    })();
    Object.defineProperty(google.script, 'run', {
      get: function(){
        var h = { ok: function(){}, fail: function(){} };
        var api = {
          withSuccessHandler: function(f){ h.ok = f; return api; },
          withFailureHandler: function(f){ h.fail = f; return api; }
        };
        ['processMovement','adminAction'].forEach(function(m){
          api[m] = function(){ __servidor(h, m, Array.prototype.slice.call(arguments)); };
        });
        return api;
      }
    });
  `, ctx);

  // Adelanta el reloj hasta que no quede nada pendiente (o se acabe la cuerda).
  function correr(){
    let vueltas = 0;
    while (timers.length && vueltas++ < 500){
      timers.sort((a, b) => a.at - b.at);
      const t = timers.shift();
      ahora = Math.max(ahora, t.at);
      t.fn();
    }
    return ahora;
  }

  return {
    ctx, avisos, consola, llamadas, correr,
    boton: () => ({ estado: 'idle', texto: '' }),
    get maxEnVuelo(){ return maxEnVuelo; },
    get transcurrido(){ return ahora; },
    run: (e) => vm.runInContext(e, ctx)
  };
}

const BUSY = 'SYSTEM_BUSY|System busy — someone else is saving right now. ' +
             'Please try again in a moment. [ID: 3da14230]';

console.log('\n═══ lo que se le enseña a una persona ═══\n');
{
  const n = navegador();
  const h = (m) => { n.ctx.__e = new Error(m); return n.run('_humanErr(__e)'); };

  // El mensaje exacto que Jose fotografió.
  const salida = h(BUSY);
  check('la marca SYSTEM_BUSY| no llega a la pantalla',   salida.indexOf('SYSTEM_BUSY') === -1);
  check('el [ID: 3da14230] tampoco',                      salida.indexOf('[ID:') === -1);
  check('ni el "Error:" que añade Apps Script',           !/^Error:/i.test(salida));
  check('pero la frase que sí sirve se queda entera',
        /System busy/.test(salida) && /try again/.test(salida));

  check('EL ID NO SE PIERDE: va a la consola, que es donde el soporte lo busca',
        n.consola.some(l => l.indexOf('3da14230') !== -1));

  check('un error de verdad se lee tal cual',
        h('Error: That location is not empty.') === 'That location is not empty.');
  check('SHORT_STOCK| también se limpia',
        h('Only 42 left. SHORT_STOCK|{"there":42}').indexOf('SHORT_STOCK') === -1);
  check('un error vacío no deja un aviso en blanco',      h('').length > 10);
  check('...y ese aviso dice que no se guardó nada',      /nothing was saved/i.test(h('')));
}

console.log('\n═══ la espera dura de verdad ═══\n');
{
  const n = navegador();
  check('ocho intentos, no cuatro',   n.run('BUSY_MAX_RETRIES') === 8);

  // Sin jitter, para medir el suelo de la espera.
  n.run('BUSY_JITTER_MS = 0');
  let total = 0;
  for (let i = 1; i <= n.run('BUSY_MAX_RETRIES'); i++){
    n.ctx.__i = i;
    total += n.run('_busyDelay(__i)');
  }
  check('la espera total pasa de 40 segundos (antes eran 13)', total > 40000);
  check('...y no se dispara a minutos',                        total < 70000);

  n.ctx.__i = 8;
  check('EL TOPE IMPORTA: ningún intento espera más de 8s. Sin él, el octavo ' +
        'esperaría dos minutos él solo y la app parecería colgada justo cuando ' +
        'ya iba a funcionar',
        n.run('_busyDelay(__i)') <= 8000);
}

console.log('\n═══ es una cola, no sólo un reintento ═══\n');
{
  // Tres escrituras a la vez. Con cola, el servidor ve una cada vez.
  const n = navegador({ responder: () => ({ ok: { rows: 1 } }) });
  const hechos = [];
  n.ctx.__hecho = (x) => hechos.push(x);
  n.run(`
    _acWrite({ args:['a', 1], ok: function(){ __hecho('a'); } });
    _acWrite({ args:['b', 2], ok: function(){ __hecho('b'); } });
    _acWrite({ args:['c', 3], ok: function(){ __hecho('c'); } });
  `);
  n.correr();
  check('las tres llegaron al servidor',        n.llamadas.length === 3);
  check('NUNCA HUBO DOS EN EL AIRE A LA VEZ — es lo que quita el choque que uno ' +
        'se hace a sí mismo pulsando dos botones seguidos',  n.maxEnVuelo === 1);
  check('y salieron en el orden en que se pidieron',  hechos.join('') === 'abc');
  check('la cola queda vacía al final',               n.run('_wq.length') === 0);
  check('y libre para la siguiente',                  n.run('_wqBusy') === false);
}

console.log('\n═══ ocupado: espera callado, y avisa sólo al final ═══\n');
{
  // Ocupado siempre. Debe reintentar los 8 y luego hablar UNA vez.
  const n = navegador({ responder: () => ({ err: BUSY }) });
  const btn = { estado: 'idle', texto: '' };
  n.ctx.__btn = btn;
  n.run(`_acWrite({ args:['applyDataQualityFix', {}], btn: __btn, what: 'Could not apply' });`);
  n.correr();

  check('lo intentó 9 veces (el primero y ocho reintentos)', n.llamadas.length === 9);
  check('MIENTRAS ESPERABA NO DIJO NADA — un aviso por intento sería nueve ' +
        'avisos por una cosa que no ha fallado',              n.avisos.length === 1);
  check('al rendirse habla una sola vez',                     n.avisos.length === 1);
  check('y NO enseña la marca',        n.avisos[0].msg.indexOf('SYSTEM_BUSY') === -1);
  check('ni el ID',                    n.avisos[0].msg.indexOf('[ID:') === -1);
  check('dice que no se perdió nada',  /nothing was lost/i.test(n.avisos[0].msg));
  check('y que la culpa no es de quien lo pulsó',
        /nothing you did is wrong/i.test(n.avisos[0].msg));
  check('el aviso es de espera, no de error rojo',           n.avisos[0].kind === 'warn');
  check('el botón se queda esperando mientras tanto, no vuelve a ofrecerse',
        btn.texto === 'Waiting…');
  check('y al final se le devuelve a la persona',            btn.estado === 'reset');
  check('la cola queda libre aunque se haya rendido',        n.run('_wqBusy') === false);
}

console.log('\n═══ ocupado una vez, bien la segunda ═══\n');
{
  const n = navegador({ responder: (i) => i === 1 ? { err: BUSY } : { ok: { rows: 7 } } });
  let filas = 0;
  n.ctx.__ok = (r) => { filas = r.rows; };
  n.run(`_acWrite({ args:['applyDataQualityFix', {}], ok: function(r){ __ok(r); } });`);
  n.correr();
  check('reintentó y funcionó',            n.llamadas.length === 2);
  check('y el resultado llegó a quien lo pidió',  filas === 7);
  check('SIN DECIRLE NADA A NADIE — la primera respuesta no era un fallo, era ' +
        'un "todavía no"',                 n.avisos.length === 0);
}

console.log('\n═══ un error de verdad se explica, no se reintenta ═══\n');
{
  const n = navegador({ responder: () => ({ err: 'Error: That movement is not in the trash.' }) });
  n.run(`_acWrite({ args:['manageMaterial', {}], what: 'Could not apply' });`);
  n.correr();
  check('no lo reintenta — reintentar un "no se puede" es perder el tiempo de ' +
        'la persona',                                        n.llamadas.length === 1);
  check('lo dice una vez',                                   n.avisos.length === 1);
  check('en rojo, porque esto sí es un fallo',               n.avisos[0].kind === 'err');
  check('con el contexto de qué se estaba haciendo',
        /Could not apply/.test(n.avisos[0].msg));
  check('y con la razón de verdad',
        /not in the trash/.test(n.avisos[0].msg));
  check('sin el "Error:" de Apps Script pegado en medio',
        n.avisos[0].msg.indexOf('Error:') === -1);
}

console.log('\n═══ los ocho caminos con candado ═══\n');
{
  // El servidor: exactamente estas ocho funciones toman withStockLock_ y por
  // tanto pueden contestar SYSTEM_BUSY. Si alguien añade una novena, esta
  // cuenta lo dice y hay que protegerla en el navegador.
  const conCandado = (GS.match(/withStockLock_\(/g) || []).length - 1;  // -1: la definición
  check('siguen siendo ocho las funciones del servidor que pueden decir "ocupado"',
        conCandado === 7 || conCandado === 8);

  const sitios = [
    ['Check my data → Apply', /_acWrite\(\{\s*\n?\s*args: \['applyDataQualityFix'/],
    ['editar un movimiento',  /args: \['modifyMovement'/],
    ['vaciar la papelera',    /args: \['manageMaterial', _h\(\{ op: 'emptyTrash' \}\)\]/],
    ['restaurar',             /args: \['manageMaterial', _h\(\{ op: 'restoreMovement'/],
    ['rellenar los IDs',      /args: \['adminAction', _h\(\{ action: 'backfillMovementIds' \}\)\]/],
    ['renombrar/fusionar material', /args: \['manageMaterial', _h\(payload\)\]/]
  ];
  sitios.forEach(([n2, re]) => check('por la cola: ' + n2, re.test(HTML)));

  // Las tres fusiones no van por la cola a propósito — encolarlas las dejaría
  // ejecutándose minutos después sobre datos que ya no son los que se vieron —
  // pero sí tienen que distinguir "ocupado" de "no se pudo".
  check('las tres fusiones comparten un solo manejador de fallo',
        (HTML.match(/withFailureHandler\(_mergeFailed\(btn,/g) || []).length === 3);
  check('...que separa "ocupado" de un fallo de verdad',
        /_isBusyError\(e\)[\s\S]{0,200}busy right now/.test(fnSrc(HTML, '_mergeFailed')));

  // Y que no quede ningún manejador enseñando el error crudo del servidor.
  const crudos = HTML.split('\n').filter(l =>
    /showToast\(/.test(l) &&
    /\(e\.message \|\| e\)|\(err\.message \|\| err\)|\(\(e && e\.message\) \|\| e\)|\(\(err && err\.message\) \|\| err\)/.test(l));
  check('ningún aviso enseña ya el error crudo del servidor en los caminos con candado',
        !crudos.some(l => /merge|apply|modify|restore|empty/i.test(l)));
}

console.log('\n═══ el check no sobrevive a irse de la pantalla ═══\n');
{
  const limpiar = fnSrc(HTML, '_clearMovSelection');
  check('vaciar el mapa no basta: también DESMARCA las casillas dibujadas',
        /\.mov-select-cb/.test(limpiar) && /checked = false/.test(limpiar));
  check('y vuelve a pintar la barra de acciones, que si no seguiría contando ' +
        'lo que ya no está',
        /_updateMovActionBar\(\)/.test(limpiar));

  const tab = fnSrc(HTML, 'showTab');
  check('CAMBIAR DE PESTAÑA LO LIMPIA — era la línea que faltaba desde la v11.59',
        /_clearMovSelection\(\)/.test(tab));
  check('junto al limpiado de los modos de fila, que ya lo hacía por el mismo motivo',
        tab.indexOf('_clearRowModes()') < tab.indexOf('_clearMovSelection()'));

  const guardar = HTML.slice(HTML.indexOf("args: ['modifyMovement'"));
  check('GUARDAR UNA EDICIÓN LO LIMPIA',
        guardar.slice(0, 1200).indexOf('_clearMovSelection()') !== -1);

  // Y lo que NO debe limpiarlo: "load more" deja a la persona en la misma
  // pantalla mirando las mismas filas, sólo que con más debajo.
  const masFilas = HTML.slice(HTML.indexOf('_movPage++'), HTML.indexOf('_movPage++') + 400);
  check('"load more" NO lo limpia — es la misma página, sólo que más larga',
        masFilas.indexOf('_clearMovSelection') === -1);
}

console.log('\n═══ veinte arreglos, UNA recarga ═══\n');
{
  // Cada "Apply" pedía por su cuenta una recarga COMPLETA del almacén. Veinte
  // arreglos seguidos eran veinte barridos del archivo — cuota del dueño
  // tirada, y lo que hizo pensar a Jose que el caché de la v11.58 había dejado
  // de funcionar: cada recarga cambia el sello de los datos, y el sello es lo
  // que invalida el caché.
  const n = navegador({ responder: () => ({ ok: { rows: 1 } }) });
  let recargas = 0;
  n.ctx.loadDataFromGoogle = () => { recargas++; };
  n.run(varSrc('_reloadTimer') + '\n' + fnSrcOf('_reloadWhenIdle'));

  for (let i = 0; i < 20; i++){
    n.run(`_acWrite({ args:['applyDataQualityFix', {}], ok: function(){ _reloadWhenIdle(); } });`);
  }
  n.correr();

  check('los veinte arreglos llegaron al servidor',        n.llamadas.length === 20);
  check('UNA SOLA RECARGA, no veinte (' + recargas + ')',  recargas === 1);
  check('y no queda ningún temporizador colgado',          n.run('_reloadTimer') === null);
}

{
  // Y la recarga espera a que la cola esté vacía: hacerla a medias daría una
  // foto que hay que repetir igual.
  const n = navegador({ responder: () => ({ ok: {} }) });
  const orden = [];
  n.ctx.loadDataFromGoogle = () => orden.push('recarga');
  n.run(varSrc('_reloadTimer') + '\n' + fnSrcOf('_reloadWhenIdle'));
  n.run(`
    _acWrite({ args:['a', {}], ok: function(){ _reloadWhenIdle(); } });
    _acWrite({ args:['b', {}], ok: function(){ _reloadWhenIdle(); } });
    _acWrite({ args:['c', {}], ok: function(){ _reloadWhenIdle(); } });
  `);
  n.correr();
  check('la recarga va DESPUÉS de que la cola se vacíe',
        orden.length === 1 && n.run('_wq.length') === 0 && n.run('_wqBusy') === false);
}

console.log('\n═══ lo que ya se encontró se vuelve a pintar ═══\n');
{
  // Jose aplicó veinte arreglos, cerró la ventana y al volver no había nada.
  // _dqFindings nunca se perdió: el render reconstruía el recuadro con sólo el
  // botón y no volvía a dibujar lo que seguía en memoria.
  const sys = fnSrc(HTML, '_renderSystemTab');
  check('al dibujar la pestaña System se repintan los hallazgos que siguen en memoria',
        /if \(_dqFindings\.length\) _drawDataCheck\(/.test(sys));
  // El botón "Check my data" lleva onclick="_runDataCheck()" en su marcado, y
  // eso NO es una llamada — es texto dentro de un atributo. Buscar el nombre a
  // secas daba positivo sobre código correcto.
  check('...y NO se vuelve a escanear solo, que costaría un barrido entero del ' +
        'archivo para enseñar algo que ya se sabe',
        !/(^|[^"'])_runDataCheck\(\)\s*;/.test(sys));
  check('el resultado entero se guarda, no sólo los hallazgos — hace falta para ' +
        'la frase "los N mayores de M"',
        /_dqLast\s*=\s*res \|\| \{\}/.test(HTML));
  check('y el fallo de "Check my data" tampoco enseña ya el error crudo',
        /Could not check: ' \+ _humanErr\(err\)/.test(HTML));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
process.exit(fail ? 1 : 0);
