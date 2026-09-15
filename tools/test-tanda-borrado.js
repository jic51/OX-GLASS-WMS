#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────────────────
   BORRAR VARIOS: QUE NO VUELVAN, Y QUE SE VEA UNA SOLA LÍNEA.

   Jose grabó esto el 2026-09-15, borrando trece movimientos de golpe:

     "se eliminan todas las filas enseguida, pero luego de algunos segundos
      empiezan a salir los toasts de confirmación y REGRESAN TODAS LAS FILAS
      opacas a eliminarse una por una; también regresan algunas SIN estar
      opacas y al tratar de eliminarlas otra vez me sale un error... si ya se
      desaparecieron al principio, ¿por qué aparecen otra vez?"

   Y el registro del error que sacó de ahí:

     3:09:50 PM  ERROR  joseisrael5101@gmail.com  backend/manageMaterial
     GONE|Already deleted by joseisrael5101@gmail.com on Sep 15, 3:08 PM.

   Borrado a las 3:08, error a las 3:09:50, MISMA CUENTA, mismo movimiento. Eso
   no es dos personas pisándose: es una sola pantalla enseñando dos veces la
   misma fila.

   LA CAUSA, UNA SOLA PARA LOS DOS SÍNTOMAS. Cada borrado mueve el sello de
   datos; el latido de esta misma ventana lo ve cambiado y pide una recarga
   silenciosa. Esa recarga trae del servidor los que todavía no han salido de la
   cola y los vuelve a pintar. Los que siguen esperando vuelven en gris; el que
   el servidor borró entre que se pidió la foto y llegó vuelve SIN gris, porque
   su marca de "esperando" ya se quitó — y se puede volver a marcar y volver a
   borrar. Segundo intento, GONE|.

   POR QUÉ EL NÚMERO DE ORDEN DE LA v11.53 NO LO COGE, que es lo que hace falta
   probar ejecutando y no leyendo: aquella regla descarta respuestas que llegan
   DESORDENADAS. Ésta llega en su turno, es la más nueva que hay. Lo viejo no es
   la respuesta: es el momento en que se sacó la foto.

   Aquí no se lee el archivo buscando frases. Se SACA el guardián de verdad de
   loadDataFromGoogle y se ejecuta, y se corre la cola de borrados de verdad
   contra un servidor fingido que contesta en diferido — que es la única forma
   de que la cola llegue a tener fondo. Una prueba que conteste al momento
   nunca vería la tanda, igual que no la veía test-refresco-tanda hasta que se
   le puso el retraso.
   ───────────────────────────────────────────────────────────────────────── */

const vm = require('vm');
const A  = require('./andamio.js');

const HTML = A.fuente('html');
const m    = A.marcador('tanda de borrado');

/* ── EL GUARDIÁN DE VERDAD, SACADO DEL ARCHIVO ──────────────────────────────
   No una copia: el trozo literal del manejador de éxito de loadDataFromGoogle,
   desde que entra hasta justo antes del try que aplica los datos. Si mañana
   alguien quita el guardián, esto deja de proteger y la prueba se cae. */
function guardianDeCarga() {
  const cuerpo = A.fnSrc(HTML, 'loadDataFromGoogle');
  if (!cuerpo) throw new Error('no está loadDataFromGoogle');
  const ini = cuerpo.indexOf('.withSuccessHandler(function(data){');
  if (ini === -1) throw new Error('no está el manejador de éxito de la carga');
  const abre = cuerpo.indexOf('{', cuerpo.indexOf('function(data)', ini));
  const fin  = cuerpo.indexOf('try {', abre);
  if (fin === -1) throw new Error('no está el try que aplica los datos');
  const trozo = cuerpo.slice(abre + 1, fin);

  // Los `return` del trozo significan "no pintes" — y devuelven undefined, no
  // false, así que quien pregunte tiene que preguntar por `=== true`. Para eso
  // está pinta() más abajo: comparar contra false aquí habría dado por buenas
  // las tres salidas del guardián.
  return 'function _aplicar(seq, gen){\n' + trozo + '\n  return true;\n}';
}

const GUARDIAN = guardianDeCarga();

m.check('el guardián menciona las dos reglas: el orden y la tanda',
  /seq < _loadApplied/.test(GUARDIAN) &&
  /_delQueue\.length \|\| _delRunning \|\| gen !== _delGen/.test(GUARDIAN));

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('una foto de en medio de la tanda no pinta');

function cajaGuardian(estado) {
  const ctx = vm.createContext(Object.assign({
    _loadBusy: false, _loadApplied: 0, _loadSeq: 0,
    _delQueue: [], _delRunning: false, _delGen: 0
  }, estado));
  vm.runInContext(GUARDIAN, ctx);
  return ctx;
}

/** ¿Pintó? Sólo llegar al final del guardián cuenta como pintar. */
function pinta(ctx, seq, gen){ return ctx._aplicar(seq, gen) === true; }

{
  // Lo que pasaba en el video: quedan borrados en la cola y llega la recarga
  // que el latido pidió.
  const c = cajaGuardian({ _delQueue: [1, 2, 3], _delRunning: true, _delGen: 4 });
  m.check('con la cola llena y uno en el aire, la recarga NO pinta', !pinta(c, 9, 4));
  m.check('...pero se apunta su número, para que nada más viejo pinte tampoco',
    c._loadApplied === 9, c._loadApplied);
}

{
  /* EL HUECO QUE EL NÚMERO DE ORDEN NO VE, y el que de verdad produjo el GONE|.
     La cola ya está vacía y no queda nadie en el aire —o sea, por los dos
     primeros criterios esta recarga sería buena— pero la foto se pidió cuando
     _delGen valía 3 y ahora vale 4: entre medias el servidor confirmó un
     borrado. Esa fila viene en la foto y ya no existe. */
  const c = cajaGuardian({ _delQueue: [], _delRunning: false, _delGen: 4 });
  m.check('una foto pedida ANTES del último borrado confirmado no pinta, ' +
          'aunque la cola ya esté vacía',
    !pinta(c, 9, 3));
}

{
  const c = cajaGuardian({ _delGen: 7 });
  m.check('sin tanda ninguna, la recarga pinta con normalidad',
    pinta(c, 9, 7));
  m.check('...y se apunta como aplicada', c._loadApplied === 9);
}

{
  // La regla vieja sigue puesta: una respuesta desordenada tampoco pinta.
  const c = cajaGuardian({ _loadApplied: 12, _delGen: 0 });
  m.check('la regla de la v11.53 sigue en pie: una respuesta más vieja que la ' +
          'última aplicada no pinta', !pinta(c, 9, 0));
}

{
  /* Y LA DEMOSTRACIÓN DE QUE HACÍAN FALTA LAS DOS. Con sólo la regla del orden
     —la que había antes de este arreglo— la foto de en medio de la tanda entra
     sin oposición: su número es el más alto que ha habido. Esto no prueba el
     producto, prueba que el fallo era real y que la regla vieja no lo tapaba. */
  const soloOrden = vm.createContext({ _loadApplied: 0 });
  vm.runInContext(
    'function _viejo(seq){ if (seq < _loadApplied) return false; _loadApplied = seq; return true; }',
    soloOrden);
  m.check('con la regla vieja sola, la foto de en medio SÍ habría pintado — ' +
          'que es exactamente lo que Jose vio',
    soloOrden._viejo(9) === true);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la tanda de verdad, corrida entera');

/* El navegador fingido. Lo importante es que el servidor conteste EN DIFERIDO:
   con una respuesta inmediata cada borrado terminaría antes de encolarse el
   siguiente, la cola nunca tendría fondo y la prueba diría que todo va bien
   sobre un caso que no llegó a existir. */
function navegador(opts) {
  opts = opts || {};
  const fallan   = opts.fallan   || {};   // rowIdx → mensaje de error
  const pendientes = [];
  const toasts   = [];
  const pantalla = { icono: '', texto: '', contador: '', clases: '' };

  const nodos = {
    progWrap: { set className(v){ pantalla.clases = v; }, get className(){ return pantalla.clases; } },
    progIcon: { set className(v){ pantalla.iconoCls = v; }, get className(){ return pantalla.iconoCls || ''; },
                set textContent(v){ pantalla.icono = v; }, get textContent(){ return pantalla.icono; } },
    progMsg:  { set textContent(v){ pantalla.texto = v; }, get textContent(){ return pantalla.texto; } },
    progCount:{ set textContent(v){ pantalla.contador = v; }, get textContent(){ return pantalla.contador; } }
  };

  const movimientos = [];
  const ctx = {
    Math, Date, String, Number, JSON, Array, Object, RegExp,
    setTimeout: (fn) => { pendientes.push(fn); return pendientes.length; },
    clearTimeout: () => {},
    console: { log(){}, warn(){}, error(){} },
    document: { getElementById: (id) => nodos[id] || null },
    movements: movimientos,

    // El estado de la cola y de la línea. Se pone aquí y no con A.constantes
    // porque estas declaraciones llevan comentario al final de la línea, y el
    // lector de constantes se pasaría de largo hasta el siguiente punto y coma
    // —que está dentro del comentario de arriba— y metería basura en la caja.
    _delQueue: [], _delRunning: false, _delPending: {}, _delGen: 0,
    _prog: null, _progHideT: null,

    // Dobles de todo lo que es pintar o avisar. Lo que se mide es la cola y la
    // línea, no el DOM de la tabla.
    _movByRowIdx: (r) => movimientos.filter(x => x.rowIdx === r)[0] || null,
    _movRowEl: () => null,
    _rowLeave: (el, done) => { done(); },     // la fila se va al pulsar
    renderAll: () => { pantalla.repintados = (pantalla.repintados || 0) + 1; },
    _sysCacheDrop: () => {},
    showToast: (msg, tipo) => toasts.push({ msg: String(msg), tipo: tipo || 'ok' }),
    _isBusyError: () => false,
    _isGoneError: (e) => /^GONE\|/.test(String(e && e.message || e)),
    _busyDelay: () => 1,
    _stripTags: (e) => String(e && e.message || e).replace(/^[A-Z_]+\|/, ''),
    _h: (o) => o,
    BUSY_MAX_RETRIES: 3,

    // La recarga de cierre. Se cuenta, porque el número importa: la gracia de
    // la cola es que trece borrados cuesten UNA recarga, no trece.
    loadDataFromGoogle: () => { pantalla.recargas = (pantalla.recargas || 0) + 1; },

    // El servidor. Guarda la llamada y NO contesta hasta que la prueba lo diga.
    google: { script: { run: null } }
  };

  const enCola = [];
  ctx.google.script.run = (function(){
    const api = {};
    let onOk = null, onErr = null;
    api.withSuccessHandler = function(f){ onOk = f; return api; };
    api.withFailureHandler = function(f){ onErr = f; return api; };
    api.processMovement = function(accion, carga){
      enCola.push({ accion, carga, ok: onOk, err: onErr });
      onOk = null; onErr = null;
    };
    return api;
  })();

  const caja = A.montar(ctx, HTML,
    ['_doDeleteMovementRow', '_delEnqueue', '_delPump',
     '_progStart', '_progStep', '_progPaint', '_progFinish'],
    { dobles: ['_movByRowIdx', '_movRowEl', '_rowLeave', 'renderAll',
               '_sysCacheDrop', 'showToast', '_isBusyError', '_isGoneError',
               '_busyDelay', '_stripTags', '_h', 'loadDataFromGoogle'] });

  return {
    ctx: caja, toasts, pantalla, enCola, movimientos, fallan,
    /** Contesta la llamada que esté en el aire. */
    contestar(){
      if (!enCola.length) return false;
      const j = enCola.shift();
      const fallo = fallan[j.carga.rowIdx];
      if (fallo) j.err({ message: fallo }); else j.ok();
      return true;
    },
    /** Contesta todo lo que vaya apareciendo, hasta que no quede nada. */
    drenar(){ let n = 0; while (this.contestar() && n < 500) n++; return n; }
  };
}

{
  const n = navegador();
  for (let i = 1; i <= 13; i++) n.movimientos.push({ rowIdx: i, movId: 'M' + i, qty: 1, name: 'X' });

  // Lo que hace el botón: encolar los trece y abrir la línea.
  let pedidos = 0;
  for (let i = 1; i <= 13; i++) if (n.ctx._doDeleteMovementRow(i)) pedidos++;
  n.ctx._progStart(pedidos, 'Deleting movements');

  m.check('los trece se encolan', pedidos === 13);
  m.check('las trece filas se van de la pantalla AL PULSAR, sin esperar al ' +
          'servidor — es lo que Jose dijo que estaba bien',
    n.movimientos.length === 0, n.movimientos.length);
  m.check('...y el servidor todavía no ha contestado ninguna', n.enCola.length === 1);
  m.check('la línea dice lo que está pasando', n.pantalla.texto === 'Deleting movements…');
  m.check('...y cuánto falta', n.pantalla.contador === '0 of 13', n.pantalla.contador);

  // LA CARRERA DEL VIDEO. A mitad de la tanda llega la recarga silenciosa que
  // el latido pidió, con la foto de cuando todavía estaban los doce.
  for (let k = 0; k < 4; k++) n.contestar();
  m.check('a los cuatro borrados quedan nueve en la cola',
    n.ctx._delQueue.length + (n.ctx._delRunning ? 1 : 0) === 9,
    { cola: n.ctx._delQueue.length, corriendo: n.ctx._delRunning });

  const g = cajaGuardian({
    _delQueue: n.ctx._delQueue, _delRunning: n.ctx._delRunning, _delGen: n.ctx._delGen
  });
  m.check('la recarga que llega en ese momento NO pinta — las nueve filas que ' +
          'trae NO vuelven a la pantalla',
    !pinta(g, 99, 0));
  m.check('...y la pantalla sigue sin ninguna fila', n.movimientos.length === 0);

  n.drenar();
  m.check('al final se borraron los trece', n.ctx._delGen === 13, n.ctx._delGen);
  m.check('...y no queda ninguno marcado como esperando',
    Object.keys(n.ctx._delPending).length === 0);
  m.check('...la cola quedó vacía y sin nadie en el aire',
    n.ctx._delQueue.length === 0 && n.ctx._delRunning === false);
  m.check('...y AHORA sí, la recarga de cierre pinta',
    pinta(cajaGuardian({ _delGen: n.ctx._delGen }), 100, n.ctx._delGen));

  /* Y SE PIDE UNA SOLA VEZ. Ésa es la otra mitad del trato: no basta con
     descartar las de en medio, hay que no pedirlas. Trece recargas son trece
     veces el almacén entero por el cable para enseñar lo mismo. */
  m.check('trece borrados cuestan UNA recarga, no trece',
    n.pantalla.recargas === 1, n.pantalla.recargas);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('una línea, no trece avisos');

{
  const n = navegador();
  for (let i = 1; i <= 13; i++) n.movimientos.push({ rowIdx: i, movId: 'M' + i, qty: 1, name: 'X' });
  let pedidos = 0;
  for (let i = 1; i <= 13; i++) if (n.ctx._doDeleteMovementRow(i)) pedidos++;
  n.ctx._progStart(pedidos, 'Deleting movements');

  n.contestar(); n.contestar(); n.contestar();
  m.check('la línea va contando sola', n.pantalla.contador === '3 of 13', n.pantalla.contador);
  m.check('...y sigue girando mientras queda algo', n.pantalla.icono === '⏳');
  m.check('hasta aquí, CERO avisos de confirmación — antes iban tres',
    n.toasts.filter(t => t.tipo === 'ok').length === 0,
    n.toasts.map(t => t.msg));

  n.drenar();
  m.check('trece borrados dan trece avisos… CERO. Ésa era la queja',
    n.toasts.length === 0, n.toasts.map(t => t.msg));
  m.check('la línea termina en check verde', n.pantalla.icono === '✅');
  m.check('...diciendo cuántos, no "listo" a secas',
    n.pantalla.texto === '13 movements moved to the trash.', n.pantalla.texto);
  m.check('...y sin contador, que ya no cuenta nada', n.pantalla.contador === '');
  m.check('...y el borde en verde', /done/.test(n.pantalla.clases), n.pantalla.clases);
}

{
  // Uno solo no dice "1 of 1", que no le dice nada a nadie.
  const n = navegador();
  n.movimientos.push({ rowIdx: 1, movId: 'M1', qty: 1, name: 'X' });
  n.ctx._doDeleteMovementRow(1);
  n.ctx._progStart(1, 'Deleting movement');
  m.check('un borrado suelto no enseña contador', n.pantalla.contador === '');
  n.drenar();
  m.check('...y termina en singular', n.pantalla.texto === 'Moved to the trash.',
    n.pantalla.texto);
}

{
  /* LOS QUE FALLAN SE DICEN, Y SE DICEN LOS DOS NÚMEROS. Decir sólo "11 moved"
     dejaría creer que salieron los trece. El porqué de cada uno sigue siendo un
     toast, porque hay que leerlo; la línea lleva la cuenta. */
  const n = navegador({ fallan: { 3: 'GONE|Already deleted by jose@ox-glass.com.', 7: 'Something broke' } });
  for (let i = 1; i <= 13; i++) n.movimientos.push({ rowIdx: i, movId: 'M' + i, qty: 1, name: 'X' });
  let pedidos = 0;
  for (let i = 1; i <= 13; i++) if (n.ctx._doDeleteMovementRow(i)) pedidos++;
  n.ctx._progStart(pedidos, 'Deleting movements');
  n.drenar();

  m.check('con fallos, la línea cuenta los dos lados',
    n.pantalla.texto === '11 moved to the trash · 2 could not be deleted',
    n.pantalla.texto);
  m.check('...con el aviso amarillo, no el check verde', n.pantalla.icono === '⚠️');
  m.check('...y el borde en amarillo', /warn/.test(n.pantalla.clases), n.pantalla.clases);
  m.check('los DOS fallos sí sacan su toast, porque hay que leerlos',
    n.toasts.length === 2, n.toasts.map(t => t.msg));
  m.check('...y el de "ya no está" no dice que la fila volvió, porque no volvió',
    !/back where it was/.test(n.toasts.filter(t => /Already deleted/.test(t.msg))[0].msg));
  m.check('...mientras que el otro sí lo dice',
    /back where it was/.test(n.toasts.filter(t => /Something broke/.test(t.msg))[0].msg));
}

{
  /* EL CONTADOR NO PUEDE PROMETER MÁS DE LO QUE SE PIDIÓ. Si una fila ya tenía
     su borrado en el aire, no se encola otro — y contarla dejaría la línea en
     "12 of 13" para siempre, esperando una respuesta que no viene. */
  const n = navegador();
  n.movimientos.push({ rowIdx: 1, movId: 'M1', qty: 1, name: 'X' });
  n.movimientos.push({ rowIdx: 2, movId: 'M2', qty: 1, name: 'X' });

  m.check('la primera vez sí encola', n.ctx._doDeleteMovementRow(1) === true);
  m.check('la segunda vez sobre la misma fila NO encola', n.ctx._doDeleteMovementRow(1) === false);
  m.check('una fila que ya no existe tampoco', n.ctx._doDeleteMovementRow(99) === false);

  n.ctx._doDeleteMovementRow(2);
  n.ctx._progStart(2, 'Deleting movements');
  n.drenar();
  m.check('la línea llega al final: contó lo encolado, no lo seleccionado',
    n.pantalla.texto === '2 movements moved to the trash.', n.pantalla.texto);
}

{
  // Una segunda tanda encima de una viva SUMA. Reiniciar a cero enseñaría "0 de
  // 3" con cinco ya hechos detrás.
  const n = navegador();
  for (let i = 1; i <= 8; i++) n.movimientos.push({ rowIdx: i, movId: 'M' + i, qty: 1, name: 'X' });
  for (let i = 1; i <= 5; i++) n.ctx._doDeleteMovementRow(i);
  n.ctx._progStart(5, 'Deleting movements');
  n.contestar(); n.contestar();
  for (let i = 6; i <= 8; i++) n.ctx._doDeleteMovementRow(i);
  n.ctx._progStart(3, 'Deleting movements');
  m.check('una tanda encima de otra suma en vez de reiniciar',
    n.pantalla.contador === '2 of 8', n.pantalla.contador);
  n.drenar();
  m.check('...y el final cuenta las ocho',
    n.pantalla.texto === '8 movements moved to the trash.', n.pantalla.texto);
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('la fila que espera no se puede volver a marcar');

{
  /* El gris ya estaba; decirlo no bastaba. Si la casilla se puede marcar, se
     marca — y el segundo intento se encuentra con que ya no está. Es el GONE|
     del registro de Jose. */
  const render = A.fnSrc(HTML, 'renderMovements') || HTML;
  const trozo  = render.slice(render.indexOf('var esperando'),
                              render.indexOf('var esperando') + 1400);
  m.check('la casilla se deshabilita cuando el borrado está en el aire',
    /esperando \? ' disabled title="This movement is being deleted"'/.test(trozo),
    trozo.slice(0, 80));
  m.check('...y la fila sigue pintándose en gris', /esperando \? ' row-deleting'/.test(trozo));
}

{
  // Y la papelera de la fila tampoco responde: el CSS le quita los clics.
  m.check('la papelera de una fila en gris no acepta clics',
    /tr\.row-deleting \.btn-icon\{pointer-events:none\}/.test(HTML));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('el latido no pide lo que va a tirar');

{
  const p = A.fnSrc(HTML, '_pulseOk');
  m.check('el latido no dispara recargas mientras se está borrando',
    /!_loadBusy && !_delQueue\.length && !_delRunning/.test(p));
  /* Y el sello NO se apunta al descartar, que es lo que hace que esto se
     arregle solo: en cuanto la tanda acabe, el siguiente latido lo vuelve a ver
     distinto y pide la recarga buena. Si se apuntara aquí, el cambio quedaría
     dado por visto y nadie volvería a pedirlo — el fallo de la v11.48, otra vez
     y en otro sitio. */
  m.check('...y el sello se sigue aprendiendo sólo en una carga aplicada',
    !/_dataStamp\s*=/.test(p));
}

// ─────────────────────────────────────────────────────────────────────────────
m.seccion('restaurar también cuenta, y no avisa uno por uno');

/* Jose, viendo restaurar cinco movimientos: "también quiero que los toast no
   aparezcan al hacer otras cosas que no necesitan, ejemplo: restaurar
   movimientos... y como todos los movimientos van desapareciendo, al final
   debería decir cuántos fueron restaurados".

   Restaurar NO va por la cola de borrados, va por la cola de escrituras, y cada
   clic es suyo: no hay botón de "restaurar todos". Así que la línea tiene que
   saber sumar clics sueltos a una tanda viva. */
{
  const ctx = {
    Math, Date, String, Number, JSON, Array, Object,
    setTimeout: () => 1, clearTimeout: () => {},
    console: { log(){}, warn(){}, error(){} }
  };
  const pantalla = { icono: '', texto: '', contador: '', clases: '' };
  ctx.document = { getElementById: (id) => ({
    progWrap:  { set className(v){ pantalla.clases = v; }, get className(){ return pantalla.clases; } },
    progIcon:  { set className(v){}, get className(){ return ''; },
                 set textContent(v){ pantalla.icono = v; }, get textContent(){ return pantalla.icono; } },
    progMsg:   { set textContent(v){ pantalla.texto = v; }, get textContent(){ return pantalla.texto; } },
    progCount: { set textContent(v){ pantalla.contador = v; }, get textContent(){ return pantalla.contador; } }
  }[id] || null) };
  ctx._prog = null; ctx._progHideT = null;

  const caja = A.montar(ctx, HTML,
    ['_progStart', '_progStep', '_progPaint', '_progFinish', '_progHide',
     '_progFinBorrado', '_progFinRestaurado'], {});

  // Cinco clics sueltos en "Put back", uno detrás de otro.
  for (let i = 0; i < 5; i++) caja._progStart(1, 'Restoring movements', caja._progFinRestaurado);
  m.check('cinco clics sueltos son UNA tanda de cinco, no cinco de uno',
    pantalla.contador === '0 of 5', pantalla.contador);
  m.check('...y la línea dice qué está pasando',
    pantalla.texto === 'Restoring movements…', pantalla.texto);

  for (let i = 0; i < 5; i++) caja._progStep(true);
  m.check('al final dice CUÁNTOS fueron restaurados, que es lo que Jose pidió',
    pantalla.texto === '5 movements put back.', pantalla.texto);
  m.check('...con el check verde', pantalla.icono === '✅');

  /* Y CADA TANDA TERMINA COMO LO SUYO. Sin esto, restaurar cinco habría dicho
     "5 movements moved to the trash" — lo contrario de lo que pasó. */
  m.check('el final del borrado y el de restaurar son frases distintas',
    caja._progFinBorrado(5, 0) !== caja._progFinRestaurado(5, 0));
  m.check('...y ninguno dice lo del otro',
    !/trash/.test(caja._progFinRestaurado(5, 0)) &&
    !/put back/.test(caja._progFinBorrado(5, 0)));
  m.check('restaurar uno solo va en singular',
    caja._progFinRestaurado(1, 0) === 'Movement put back.');
  m.check('...y con fallos dice los dos números',
    caja._progFinRestaurado(3, 2) === '3 put back · 2 could not be restored');

  /* DOS TRABAJOS DISTINTOS NO COMPARTEN CONTADOR. Si borrar y restaurar
     sumaran en la misma tanda, el final contaría una cosa de la otra. */
  caja._progStart(4, 'Restoring movements', caja._progFinRestaurado);
  caja._progStep(true);
  caja._progStart(2, 'Deleting movements');
  m.check('empezar otro trabajo abre tanda nueva en vez de sumar a la anterior',
    pantalla.contador === '0 of 2', pantalla.contador);
  caja._progStep(true); caja._progStep(true);
  m.check('...y termina con la frase del trabajo que de verdad se hizo',
    pantalla.texto === '2 movements moved to the trash.', pantalla.texto);

  // Un clic la cierra: seis segundos delante de algo que quieres leer son seis
  // segundos.
  caja._progHide();
  m.check('un clic la cierra', pantalla.clases === '');
}

{
  // Y que el camino de restaurar de verdad haya dejado de avisar uno por uno.
  const rest = A.fnSrc(HTML, '_restoreMovement');
  m.check('restaurar abre la tanda al pulsar',
    /_progStart\(1, 'Restoring movements', _progFinRestaurado\)/.test(rest));
  m.check('...cuenta el éxito en la línea, sin toast', /_progStep\(true\)/.test(rest));
  m.check('...y ya no saca "Movement restored"', !/Movement restored/.test(rest));
  m.check('pero un FALLO sigue siendo un aviso, porque hay que leerlo',
    /_progStep\(false\)[\s\S]{0,200}showToast\(/.test(rest));
}

{
  // El sitio. A la derecha se sentaba encima de las tarjetas en pantalla grande.
  const css = HTML.slice(HTML.indexOf('#progWrap{'), HTML.indexOf('#progWrap{') + 400);
  m.check('la línea va a la IZQUIERDA, no encima de las tarjetas',
    /left:1\.25rem/.test(css) && !/right:1\.25rem/.test(css), css.slice(0, 60));
  m.check('...y el final se queda seis segundos, no dos y medio',
    /fallados \? 10000 : 6000/.test(A.fnSrc(HTML, '_progFinish')));
}

m.fin();
