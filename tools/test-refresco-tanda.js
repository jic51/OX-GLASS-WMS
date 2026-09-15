// DIEZ BORRADOS, DOS RECONSTRUCCIONES — NO DIEZ.
//
// Jose, 2026-09-15, después de probar dos cuentas a la vez: "todo se actualiza,
// NO CON LA VELOCIDAD QUE ME GUSTARÍA".
//
// Y tenía un número detrás. refreshDerivedSheets_ reconstruye LIVE_STOCK,
// SITE_STOCK y WASTED_STOCK, y eso son unos nueve viajes a Google — medidos en
// SU hoja el 2026-09-10: 3,7 segundos. Cada operación lo pagaba por su cuenta,
// así que borrar diez filas costaba unos cuarenta segundos de trabajo que sólo
// necesitaba uno.
//
// El navegador YA agrupaba su propia recarga (_reloadWhenIdle, escrito cuando
// Jose aplicó veinte arreglos de "Check my data" seguidos). Lo que no se
// agrupaba era el trabajo del SERVIDOR.
//
// LA PREGUNTA QUE HABÍA QUE CONTESTAR ANTES DE ESCRIBIRLO, y se contestó
// leyendo el código: ¿se puede aplazar sin que alguien saque material que ya no
// está? Sí — porque las hojas derivadas son para MOSTRAR. Validar un movimiento
// (¿queda?, ¿alcanza en ese estante?) se hace con buildStockSnapshot_, que lee
// EL ARCHIVO. Aplazar puede hacer que los números se vean con retraso; no puede
// dejar pasar una salida imposible.
//
// LO QUE ESTE ARCHIVO PROTEGE, y las dos mitades importan igual:
//   1. Que diez operaciones seguidas cuesten DOS reconstrucciones, no diez.
//      DOS y no una, y hay que decirlo así: la PRIMERA no puede aplazar porque
//      cuando sale todavía no hay nadie detrás —las otras nueve se encolan
//      mientras ella viaja—, y la ÚLTIMA refresca ella misma porque ya no viene
//      nadie. Redondear eso a "una" sería redondear a mi favor.
//   2. Que ese refresco OCURRA — aplazar para siempre sería enseñar números
//      viejos, que es peor que ir lento.
//
// Uso:  node tools/test-refresco-tanda.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS   = A.fuente('gs');
const HTML = A.fuente('html');
const m = A.marcador('refresco por tanda');

// ── El navegador: la cola de verdad, sacada del archivo ─────────────────────
function navegador(){
  const visto = { enviados: [], refrescos: 0 };

  const ctx = vm.createContext({
    console, String, Number, Math, Array, Object, JSON, Date,
    setTimeout: (fn) => { visto.timers = visto.timers || []; visto.timers.push(fn); },
    clearTimeout: () => {},
    _wq: [], _wqBusy: false,
    _sessionToken: 'tok',
    BUSY_LABEL: 'Waiting…', BUSY_MAX_RETRIES: 8,
    _btnBusy: () => {}, _btnReset: () => {},
    _isBusyError: () => false,
    _busyDelay: () => 1,
    _humanErr: (e) => String(e),
    showToast: () => {},
    loadDataFromGoogle: () => {},
    _reloadWhenIdle: () => {},
    google: { script: { run: null } }
  });

  // _refrescoAplazado es una VARIABLE, no una función: el andamio levanta
  // funciones y el estado suelto se pide aparte con constantes(). Está dicho en
  // su cabecera y aquí se ve por qué — se lee del archivo, nunca se copia a
  // mano, para que su valor inicial sea el de hoy.
  vm.runInContext(A.constantes(HTML, ['_refrescoAplazado']) + '\n' +
    A.levantar(HTML, ['_acWrite', '_wqPump', '_h'], {
      dobles: ['_btnBusy', '_btnReset', '_isBusyError', '_busyDelay', '_humanErr',
               'showToast', '_reloadWhenIdle', 'loadDataFromGoogle']
    }), ctx);

  // El servidor de mentira: apunta cada acción y si venía con _skipRefresh.
  vm.runInContext(
    'google.script.run = {' +
    '  withSuccessHandler: function(f){ this._ok = f; return this; },' +
    '  withFailureHandler: function(f){ this._no = f; return this; },' +
    '  processMovement: function(accion, carga){ __servidor(accion, carga, this._ok); }' +
    '};', ctx);

  // EL SERVIDOR CONTESTA DESPUÉS, NO AL INSTANTE.
  //
  // El primer intento de esta prueba respondía en la misma línea, y las diez
  // salían sin aplazar. No era un fallo del producto: era que con un servidor
  // instantáneo cada trabajo TERMINA antes de que se encole el siguiente, así
  // que la cola nunca tiene profundidad y nunca hay "más trabajo detrás".
  // google.script.run es asíncrono; un doble que conteste ya mide otra cosa.
  const pendientes = [];
  ctx.__servidor = (accion, carga, alOk) => {
    visto.enviados.push({ accion: accion, aplaza: !!(carga && carga._skipRefresh) });
    if (accion === 'refreshNow') visto.refrescos++;
    pendientes.push(alOk);
  };

  return {
    visto, ctx,
    encolar: (accion) => vm.runInContext(
      '_acWrite({ args: ["' + accion + '", _h({ op: "x" })], what: "prueba" })', ctx),
    // "y entonces el servidor va contestando". Se vacía en orden, y cada
    // respuesta puede provocar el siguiente envío — como en la app.
    responder: () => {
      let vueltas = 0;
      while (pendientes.length && vueltas++ < 100) pendientes.shift()({ status: 'success' });
    }
  };
}

m.seccion('diez operaciones seguidas: DOS reconstrucciones, no diez');
{
  const n = navegador();
  // Se encolan diez de golpe, como cuando se borran diez filas seguidas.
  for (let i = 0; i < 10; i++) n.encolar('manageMaterial');
  n.responder();

  const ops = n.visto.enviados.filter(e => e.accion === 'manageMaterial');
  m.check('las diez llegaron al servidor', ops.length === 10, ops.length);

  // LA PRIMERA NO APLAZA, Y NO SE PUEDE HACER MEJOR. Cuando sale, es la única
  // en la cola: las otras nueve se encolan mientras ella viaja. Nadie puede
  // saber que vienen más antes de que existan, y fingir que sí sería inventarse
  // un dato. Se dice aquí para que nadie lo lea como un descuido.
  m.check('la primera refresca ella misma — todavía no había nadie detrás',
    ops[0].aplaza === false, ops[0]);
  m.check('las ocho de en medio SÍ aplazan',
    ops.slice(1, 9).every(e => e.aplaza === true), ops.map(e => e.aplaza));
  m.check('...y la décima tampoco aplaza: detrás de ella ya no viene nadie',
    ops[9].aplaza === false, ops[9]);

  // LA CUENTA QUE ES LA PETICIÓN DE JOSE. Diez operaciones costaban diez
  // reconstrucciones. Ahora cuestan DOS: la de la primera y la de la última.
  // No una — y decirlo como "una" sería redondear a mi favor.
  m.check('...así que la décima ya deja los números al día y el refreshNow de ' +
          'después sobra: sería un viaje más para rehacer lo recién hecho',
    n.visto.refrescos === 0, n.visto.enviados.map(e => e.accion).join(','));

  const reconstrucciones = ops.filter(e => !e.aplaza).length + n.visto.refrescos;
  m.check('DIEZ operaciones cuestan DOS reconstrucciones, no diez (' +
          reconstrucciones + ')', reconstrucciones === 2, reconstrucciones);
}

m.seccion('una sola operación no aplaza nada');
{
  // El caso normal: alguien borra UNA fila. Aplazar aquí sería añadir un viaje
  // extra al servidor para ahorrar cero.
  const n = navegador();
  n.encolar('manageMaterial');
  n.responder();
  m.check('la única operación refresca ella misma',
    n.visto.enviados[0].aplaza === false, n.visto.enviados[0]);
  m.check('...y NO se manda un refreshNow de más',
    n.visto.refrescos === 0, n.visto.enviados.map(e => e.accion));
}

m.seccion('el servidor hace lo que le dicen');
{
  const visto = { refrescos: 0, marcas: [], borradas: 0 };
  const ctx = vm.createContext({
    console, String, Logger: { log: () => {} },
    PropertiesService: { getScriptProperties: () => ({
      setProperty: (k, v) => { visto.marcas.push(k + '=' + v); },
      getProperty: () => (visto.marcas.length ? '1' : null),
      deleteProperty: () => { visto.borradas++; }
    })},
    refreshDerivedSheets_: () => { visto.refrescos++; }
  });
  vm.runInContext(A.constantes(GS, ['REFRESH_PENDING_KEY']) + '\n' +
    A.levantar(GS, ['refreshOrDefer_', '_clearRefreshPending_', 'refreshPending_'],
               { dobles: ['refreshDerivedSheets_'] }), ctx);

  vm.runInContext('refreshOrDefer_({}, { _skipRefresh: true })', ctx);
  m.check('con _skipRefresh NO refresca', visto.refrescos === 0);
  m.check('...pero deja la marca puesta — sin ella, nadie refrescaría nunca',
    visto.marcas.length === 1 && /=1$/.test(visto.marcas[0]), visto.marcas);
  m.check('...y la marca se puede leer después', vm.runInContext('refreshPending_()', ctx));

  vm.runInContext('refreshOrDefer_({}, {})', ctx);
  m.check('sin _skipRefresh refresca de verdad', visto.refrescos === 1);
  m.check('...y borra la marca, para que el siguiente que cargue no repita',
    visto.borradas === 1);
}

m.seccion('si la marca no se puede poner, NO se aplaza');
{
  // Refrescar de más cuesta segundos. No refrescar cuando nadie va a hacerlo
  // cuesta números falsos. Ante la duda, se paga el tiempo.
  const visto = { refrescos: 0 };
  const ctx = vm.createContext({
    console, String, Logger: { log: () => {} },
    PropertiesService: { getScriptProperties: () => ({
      setProperty: () => { throw new Error('cuota agotada'); },
      getProperty: () => null, deleteProperty: () => {}
    })},
    refreshDerivedSheets_: () => { visto.refrescos++; }
  });
  vm.runInContext(A.constantes(GS, ['REFRESH_PENDING_KEY']) + '\n' +
    A.levantar(GS, ['refreshOrDefer_', '_clearRefreshPending_'],
               { dobles: ['refreshDerivedSheets_'] }), ctx);
  vm.runInContext('refreshOrDefer_({}, { _skipRefresh: true })', ctx);
  m.check('si la marca falla, refresca AHORA en vez de confiar en nadie',
    visto.refrescos === 1, visto.refrescos);
}

m.seccion('la red de seguridad: una tanda a medias no deja números viejos');
{
  /* La parte que hace esto aceptable. Si el navegador se cierra a mitad —o el
     refreshNow final se pierde—, la marca se queda puesta. El PRIMER
     getInitialData que la vea refresca ANTES de leer las derivadas, así que
     nadie llega a ver números atrasados: el coste se le cobra a quien de verdad
     necesita los datos, una vez, en vez de N veces a quien borraba filas. */
  const cuerpo = A.fnSrc(GS, 'getInitialData');
  const iMarca = cuerpo.indexOf('refreshPending_()');
  const iLeer  = cuerpo.indexOf('buildStockFromDerivedSheets_(ss)');
  m.check('getInitialData mira si quedó una tanda a medias', iMarca !== -1);
  m.check('...ANTES de leer las hojas derivadas — después sería enseñar los ' +
          'números viejos y arreglarlos para la próxima vez',
    iMarca !== -1 && iLeer !== -1 && iMarca < iLeer, { iMarca, iLeer });
  m.check('...y lo hace por el camino que toma el candado, no llamando al ' +
          'reconstructor a pelo',
    /refreshPending_\(\)[\s\S]{0,200}refreshDerivedSheetsSafely_\(ss\)/.test(cuerpo));

  /* EL FALLO QUE CASI SE ESCAPA. El refresco aplazado sale FUERA de la acción
     que lo pidió, así que ya no hereda el candado de nadie. Y
     refreshDerivedSheets_ hace clearContents() y luego setValues(): dos a la
     vez se entrelazan y dejan filas colgando. Eso no es un número viejo, es un
     número que nadie escribió. Por eso el cierre de tanda va SIEMPRE por
     refreshDerivedSheetsSafely_, que toma el candado él mismo. */
  const seguro = A.fnSrc(GS, 'refreshDerivedSheetsSafely_');
  m.check('el refresco de cierre toma el candado antes de reconstruir',
    /getScriptLock\(\)/.test(seguro) && /tryLock\(/.test(seguro));
  m.check('...y si no lo consigue no reconstruye: avisa que no pudo',
    /tryLock\([\s\S]{0,40}\)\)\s*return false/.test(seguro));
  m.check('...reconstruye y borra la marca cuando sí lo consigue',
    /refreshDerivedSheets_\(ss\)[\s\S]{0,80}_clearRefreshPending_\(\)/.test(seguro));
  m.check('...y suelta el candado pase lo que pase',
    /finally[\s\S]{0,120}releaseLock\(\)/.test(seguro));

  /* Y si no pudo tomarlo, getInitialData no puede enseñar las derivadas: están
     a medias. Cae al barrido completo del archivo — más lento, pero cierto. */
  m.check('si el refresco de cierre no pudo correr, la carga NO lee las ' +
          'derivadas a medias',
    /derivadasAlDia\s*\?\s*buildStockFromDerivedSheets_\(ss\)\s*:\s*null/.test(cuerpo));

  // Y la acción de cierre existe y hace las dos cosas.
  const router = A.fnSrc(GS, 'processMovementInner_');
  m.check("existe la acción 'refreshNow' que manda el navegador al vaciarse la cola",
    /action === 'refreshNow'/.test(router));
  m.check('...y va por el mismo camino con candado',
    /refreshNow'[\s\S]{0,300}refreshDerivedSheetsSafely_\(ss\)/.test(router));
}

m.seccion('lo que NO se aplaza, y por qué');
{
  /* Guardar un movimiento NO va por la cola: es una acción suelta de una
     persona esperando delante de la pantalla. Aplazarlo no ahorraría nada y
     dejaría sus propios números atrás justo cuando los va a mirar. */
  const guardar = A.fnSrc(GS, 'addMovementsBatch_');
  m.check('guardar un movimiento refresca en el momento, sin aplazar',
    /refreshDerivedSheets_\(ss\)/.test(guardar) && !/refreshOrDefer_/.test(guardar));

  // Y las que SÍ: las que el navegador encola.
  ['manageMaterialLocked_', 'modifyMovementLocked_', 'dqFillGapLocked_',
   'mergeLocationsLocked_', 'mergeConfigValuesLocked_'].forEach(fn => {
    m.check(fn + ' —de las que van por la cola— sí aplaza',
      /refreshOrDefer_\(ss, data\)/.test(A.fnSrc(GS, fn)));
  });
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('Las dos mitades importan igual. Agrupar sin la red de seguridad');
console.log('sería cambiar "va lento" por "enseña números viejos", y de las dos');
console.log('la segunda es la que no se nota hasta que ya decidiste algo con');
console.log('ella. Por eso la marca, y por eso getInitialData la mira ANTES.');
console.log('────────────────────────────────────────────────────────────────────────');

m.fin();
