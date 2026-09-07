// EL LATIDO: VER LO DE LOS DEMÁS, Y VOLVER DE OFF-LINE SOLO.
//
// Dos cosas que Jose reportó el 2026-09-05 haciendo la prueba con tres cuentas,
// y que resultaron ser la misma pieza:
//
//   "cada persona en la app necesita ver cada cambio cuando se realiza... o
//    mejor dicho actualizar solo ese cambio, pero pensaba en algunas reglas, la
//    pagina no se actualiza cuando esta off-line, si el usuario esta on line,
//    se actualiza cada vez que haya un cambio en los datos, hay que verificar
//    que no se actualize por otras cosas como crear la copia de seguridad,
//    cambios en los permisos de los usuarios, nuevas tarjetas, solo debe ser
//    por los datos, ingresos, salidas, transfers, etc."
//
//   "cuando la app pasa a modo off-line y el cliente vuelve a la pagina, esta,
//    no se actualiza rapido, puede pasar minutos con el punto naranja... solo
//    se actualiza cuando alguien toca el punto naranja... pero sino nunca."
//
// LO SEGUNDO ERA LITERAL Y ESTABA EN EL CÓDIGO: nada reintentaba. El estado
// off-line se ponía sólo desde el fallo de la carga; el latido tenía el
// manejador de fallo VACÍO —`withFailureHandler(function(){})`— así que sabía
// que no había conexión y no se lo decía a nadie; y el temporizador de 60 s
// sólo marcaba "stale" a los cinco minutos, sin volver a probar.
//
// LO QUE ESTE ARCHIVO PROTEGE, por orden:
//
//   1. QUE NO SE REFRESQUE POR LO QUE NO TOCA. Es la regla que Jose escribió
//      con más detalle, y la que se rompe sin que nadie lo note: añadir una
//      acción nueva a la lista es un momento, y de pronto la pantalla de todo
//      el mundo se sacude porque alguien corrió un respaldo. Una pantalla que
//      se mueve sola sin motivo enseña a desconfiar del movimiento — y entonces
//      tampoco se cree el movimiento que sí importa.
//   2. Que un sello igual NO refresque. Sin esto, la app se recargaría cada 20
//      segundos para siempre y habríamos construido justo lo que Jose pidió
//      evitar.
//   3. Que el punto vuelva a verde solo, y que al volver se recupere lo
//      perdido.
//
// Se EJECUTA el manejador del latido contra un servidor falso. Leer el código
// no distingue un refresco que ocurre de uno que no.
//
// Uso:  node tools/test-live-pulse.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC  = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// ── 1. La lista de acciones ES la regla de Jose ─────────────────────────────
console.log('\n═══ qué mueve el sello, y sobre todo qué no ═══\n');
{
  const m = /var DATA_STAMP_ACTIONS = \{([\s\S]*?)\};/.exec(GS);
  check('la lista existe y es una lista, no una condición desperdigada', !!m);
  const dentro = m ? (m[1].match(/^\s*([A-Za-z]+):/gm) || [])
    .map(s => s.trim().replace(':', '')) : [];
  console.log('  mueven el sello: ' + dentro.join(', ') + '\n');

  // Lo que TIENE que estar: si después de la acción el AVAILABLE de un material
  // puede ser distinto, va dentro.
  [['addMovement', 'entradas, salidas, transfers, waste, adjust'],
   ['addMultiEntry', 'una entrada con varios materiales'],
   ['addMultiExit',  'una salida con varios materiales'],
   ['modifyMovement','editar un movimiento guardado'],
   ['manageMaterial','borrar una fila, renombrar o fusionar'],
   ['commitImport',  'una importación son entradas de verdad']
  ].forEach(([a, que]) => {
    check('SÍ mueve el sello: ' + a + ' — ' + que, dentro.indexOf(a) !== -1);
  });

  // Y lo que Jose excluyó por su nombre. Ésta es la mitad que importa.
  [['runBackupOnDemand', 'Jose lo dijo: "crear la copia de seguridad"'],
   ['setBackupEnabled',  'lo mismo'],
   ['setRolePerms',      '"cambios en los permisos de los usuarios"'],
   ['addUser',           'lo mismo'],
   ['removeUser',        'lo mismo'],
   ['dismissSystemCard', '"nuevas tarjetas"'],
   ['updateConfig',      'catálogo: nombres, no existencias'],
   ['mergeConfigValues', 'lo mismo'],
   ['saveLocationLayout','lo mismo'],
   ['lockMaterial',      'cambia permisos sobre el material, no cuánto hay'],
   ['unlockMaterial',    'lo mismo'],
   ['getSettings',       'no escribe nada']
  ].forEach(([a, por]) => {
    check('NO mueve el sello: ' + a + ' — ' + por, dentro.indexOf(a) === -1);
  });

  // El sello se pone en UN sitio. Repartirlo por las funciones que escriben
  // habría significado cuatro funciones con varios `return` cada una, que es
  // exactamente cómo se olvida uno.
  // Sin la definición: `function bumpDataStamp_()` también encaja, y contarla
  // haría que la aserción dijera 2 con una sola llamada de verdad.
  const bumps = (GS.match(/(?<!function )bumpDataStamp_\(\)/g) || []).length;
  check('bumpDataStamp_ se llama desde un solo sitio (' + bumps +
        ' llamada) — en el despachador, después de que la acción salga bien',
    bumps === 1);
  check('...y ese sitio es processMovement, después de processMovementInner_',
    /processMovementInner_\(ss, action, data, auth\);[\s\S]{0,900}DATA_STAMP_ACTIONS\[action\]\) bumpDataStamp_\(\)/.test(GS));
  check('el sello se guarda en ScriptProperties, no en la caché — una caché ' +
        'caduca sola, y un sello que desaparece se lee como "todo cambió" en ' +
        'todos los navegadores a la vez',
    /PropertiesService\.getScriptProperties\(\)[\s\S]{0,120}DATA_STAMP_KEY/.test(GS));
}

// ── 2. El manejador del latido, ejecutado ───────────────────────────────────
console.log('\n═══ el latido, ejecutado contra un servidor falso ═══\n');

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

function escenario(op){
  const clases = { connBtn: op.claseInicial || 'conn-btn online' };
  const ctx = vm.createContext({
    console, Math, Date,
    document: {
      hidden: false,
      getElementById: (id) => id === 'connBtn'
        ? { get className(){ return clases.connBtn; },
            set className(v){ clases.connBtn = v; },
            set title(v){} }
        : null,
      addEventListener: () => {}
    },
    _sessionToken: 'tok',
    _recargas: [],
    _usuariosPintados: null,
    _estados: [],
    renderActiveUsers: (u) => { ctx._usuariosPintados = u; },
    setConnStatus: (s) => { ctx._estados.push(s); clases.connBtn = 'conn-btn ' + s; },
    loadDataFromGoogle: (a, b) => { ctx._recargas.push([a, b]); },
    clearTimeout: () => {}, setTimeout: () => 0,
    google: { script: { run: (function(){
      const r = {
        withSuccessHandler(fn){ this._ok = fn; return this; },
        withFailureHandler(fn){ this._no = fn; return this; },
        heartbeat(){ ctx._usoHeartbeat = true;
          op.falla ? this._no(new Error('net')) : this._ok((op.respuesta || {}).users || []); }
      };
      // `sinPulse` imita un servidor todavía en la versión anterior: en Apps
      // Script, google.script.run SÓLO conoce las funciones desplegadas de
      // verdad, así que llamar a una que no existe lanza.
      if (!op.sinPulse) {
        r.pulse = function(){ ctx._usoPulse = true;
          op.falla ? this._no(new Error('net')) : this._ok(op.respuesta); };
      }
      return r;
    })() }}
  });
  vm.runInContext('var _dataStamp = ' + JSON.stringify(op.selloConocido) + ';' +
                  'var _lastActivity = Date.now(), _lastPulseOk = null, _pulseTimer = null;' +
                  // La bandera de "hay una carga en camino" (v11.52): el latido
                  // no pide datos si ya hay una pedida. Por defecto libre, y un
                  // escenario puede ponerla a true para comprobarlo.
                  'var _loadBusy = ' + (op.cargando ? 'true' : 'false') + ';' +
                  'var PULSE_FAST_MS = 20000, PULSE_SLOW_MS = 150000, PULSE_ACTIVE_MS = 180000;', ctx);
  vm.runInContext(fnSrc('_pulseInterval'), ctx);
  vm.runInContext(fnSrc('_pulseOk'), ctx);
  vm.runInContext(fnSrc('_pulseFail'), ctx);
  vm.runInContext(fnSrc('_pulseOnce'), ctx);
  vm.runInContext('_pulseOnce()', ctx);
  return {
    usoPulse: ctx._usoPulse, usoHeartbeat: ctx._usoHeartbeat,
    recargas: ctx._recargas, estados: ctx._estados,
    sello: vm.runInContext('_dataStamp', ctx),
    usuarios: ctx._usuariosPintados,
    pulseOk: vm.runInContext('_lastPulseOk', ctx)
  };
}

{
  // Nadie ha guardado nada: el sello es el mismo.
  const r = escenario({ selloConocido: '100', respuesta: { users: [{ email: 'a' }], stamp: '100' } });
  check('con el sello igual NO se refresca nada — sin esto la app se ' +
        'recargaría cada 20 segundos para siempre', r.recargas.length === 0);
  check('...pero el latido sí cuenta como contacto con el servidor',
    typeof r.pulseOk === 'number');
  check('...y la lista de usuarios activos se pinta igual', !!r.usuarios);
}
{
  // Otra persona guardó un movimiento.
  const r = escenario({ selloConocido: '100', respuesta: { users: null, stamp: '200' } });
  check('con el sello distinto SÍ se refresca — es lo que hace que Jose vea ' +
        'la salida que acaba de hacer otra persona', r.recargas.length === 1);
  check('...y se refresca EN SILENCIO, sin desarmar el tablero. Ver el trabajo ' +
        'de otro no puede costar un parpadeo cada vez',
    r.recargas[0][0] === true && r.recargas[0][1] === true);
  // ESTA ASERCIÓN DECÍA LO CONTRARIO HASTA LA v11.52, y estaba bien entonces:
  // el latido apuntaba el sello él mismo. Se cambió al descubrir que apuntarlo
  // ANTES de tener los datos daba el cambio por visto aunque la carga fallara,
  // se perdiera o llegara tarde y se descartara — y entonces nadie volvía a
  // intentarlo. Ahora el sello lo aprende la carga que se aplica de verdad, y
  // el bucle se evita por ahí, no aquí.
  check('el latido NO apunta el sello por su cuenta: sigue en ' +
        JSON.stringify(r.sello) + ' hasta que unos datos lleguen y se apliquen',
    r.sello === '100');
  check('users:null no borra la lista de usuarios — significa "el limitador ' +
        'cortó", no "no hay nadie"', r.usuarios === null);
}
{
  // Con una carga ya en camino, el latido no pide otra. La v11.52 lo añadió
  // porque amontonar cargas es justo lo que hace probable la carrera que ese
  // mismo cambio arregla — y el sello sigue distinto, así que el próximo latido
  // lo verá igual. No se pierde nada, sólo se deja de insistir.
  const r = escenario({ selloConocido: '100', cargando: true,
                        respuesta: { users: null, stamp: '200' } });
  check('si ya hay una carga en camino, no se pide otra — insistir gasta cuota ' +
        'y hace más probable que dos respuestas se crucen',
    r.recargas.length === 0);
}
{
  // Primera vuelta: todavía no hay sello conocido.
  const r = escenario({ selloConocido: null, respuesta: { users: null, stamp: '200' } });
  check('sin sello previo no se refresca — un sello desconocido no es un ' +
        'sello cambiado, y refrescar aquí sería una recarga de más nada más ' +
        'entrar', r.recargas.length === 0);
  check('...y tampoco se apunta aquí: quien lo aprende es la carga inicial, que ' +
        'ya trae el sello dentro de los datos', r.sello === null);
}

console.log('\n═══ el punto naranja vuelve solo ═══\n');
{
  const r = escenario({ falla: true, claseInicial: 'conn-btn online' });
  check('si el latido falla, el punto se pone naranja — el manejador estaba ' +
        'VACÍO y ése era el fallo entero', r.estados.indexOf('offline') !== -1);
  check('...y NO se refresca nada estando caído, que es la regla de Jose',
    r.recargas.length === 0);
}
{
  const r = escenario({ selloConocido: '100', claseInicial: 'conn-btn offline',
                        respuesta: { users: null, stamp: '100' } });
  check('al recuperarse, el punto vuelve a verde SOLO, sin que nadie lo toque',
    r.estados.indexOf('online') !== -1);
  check('...y refresca aunque el sello no haya cambiado: volver de off-line es ' +
        'justo cuando más probable es haberse perdido algo',
    r.recargas.length === 1 && r.recargas[0][1] === true);
}
{
  const r = escenario({ selloConocido: '100', claseInicial: 'conn-btn stale',
                        respuesta: { users: null, stamp: '100' } });
  check('lo mismo desde "stale"', r.recargas.length === 1);
}

console.log('\n═══ y si el servidor todavía es de la versión anterior ═══\n');
{
  // EL CASO QUE MATÓ EL LATIDO EN CASA DE JOSE (v11.48). Los dos archivos se
  // despliegan a mano y por separado, así que "Index nuevo, Code.gs viejo" es
  // media hora de cualquier despliegue. Y google.script.run sólo conoce las
  // funciones DESPLEGADAS, así que llamar a `pulse` cuando el servidor no la
  // tiene lanza de forma síncrona — dentro del temporizador, matando el bucle.
  const r = escenario({ sinPulse: true, selloConocido: '100',
                        respuesta: { users: [{ email: 'a' }] } });
  check('no se cae: usa el latido de siempre cuando `pulse` no existe todavía ' +
        'en el servidor', r.usoHeartbeat === true && !r.usoPulse);
  check('...y con eso el punto y la lista de usuarios siguen vivos',
    r.estados.indexOf('online') !== -1 && !!r.usuarios);
  check('...aunque sin sello, o sea sin ver los cambios de los demás hasta ' +
        'desplegar el servidor. Degradarse no es caerse', r.recargas.length === 0);
}

console.log('\n═══ un tick malo cuesta un tick, no la sesión ═══\n');
{
  // La v11.48 tenía `_pulseOnce(); _pulseSchedule();` seguidos en el cuerpo del
  // temporizador. Si el primero lanzaba, el segundo no llegaba a ejecutarse y
  // el latido no volvía nunca — en silencio, sin nada en pantalla.
  const cuerpo = fnSrc('_pulseSchedule');
  check('el bucle se rearma dentro de un `finally`, así que ningún error de ' +
        'dentro puede dejar la app sin latido para siempre',
    /try \{[\s\S]*_pulseOnce\(\)[\s\S]*finally \{[\s\S]*_pulseSchedule\(\)/.test(cuerpo));
  check('...y el error se registra en vez de tragarse — un latido muerto en ' +
        'silencio es exactamente lo que costó encontrar esto',
    /console\.error\('pulse:'/.test(cuerpo));
}

console.log('\n═══ el navegador avisa cuando vuelve el wifi ═══\n');
{
  // Jose apagó y encendió el wifi: una cuenta volvió a verde y la otra se quedó
  // en rojo. Esperar al siguiente latido puede ser dos minutos y medio; el
  // navegador lo sabe en el momento y sólo había que escucharlo.
  check("se escucha el evento 'online' del navegador y se late al instante",
    /addEventListener\('online'[\s\S]{0,260}_pulseOnce\(\)/.test(SRC));
  check("...y el 'offline', para no seguir enseñando verde sin red",
    /addEventListener\('offline'[\s\S]{0,140}setConnStatus\('offline'\)/.test(SRC));
  check('y también al traer la ventana al frente — `visibilitychange` NO cubre ' +
        'una ventana visible pero detrás de otra, que es como Jose prueba con ' +
        'dos cuentas a la vez',
    /addEventListener\('focus'[\s\S]{0,200}_pulseOnce\(\)/.test(SRC));
}

console.log('\n═══ el ritmo se adapta ═══\n');
{
  const ctx = vm.createContext({ Date, PULSE_FAST_MS: 20000, PULSE_SLOW_MS: 150000,
                                 PULSE_ACTIVE_MS: 180000 });
  vm.runInContext('var _lastActivity = Date.now();', ctx);
  vm.runInContext(fnSrc('_pulseInterval'), ctx);
  check('con actividad reciente late rápido (' +
        vm.runInContext('_pulseInterval()', ctx) + ' ms) — es lo que hace ' +
        'utilizable la prueba con tres personas',
    vm.runInContext('_pulseInterval()', ctx) === 20000);
  vm.runInContext('_lastActivity = Date.now() - 10*60*1000;', ctx);
  check('quieto un rato, late lento (' +
        vm.runInContext('_pulseInterval()', ctx) + ' ms) — cada latido gasta ' +
        'cuota de Apps Script, y un almacén tranquilo no debe quemarla',
    vm.runInContext('_pulseInterval()', ctx) === 150000);
}

console.log('\n═══ y no se late con la pestaña escondida ═══\n');
{
  // Varias pestañas abiertas por el almacén es normal, y latir en todas es
  // como se llega al techo de cuota sin que nadie esté mirando nada.
  check('el latido sale antes si la pestaña está oculta',
    /function _pulseOnce\(\)\{?\s*\n\s*if \(document\.hidden\) return;/.test(SRC));
  check('...y se dispara uno en cuanto se vuelve a ella, que es a la vez el ' +
        'reintento de una conexión caída',
    /visibilitychange[\s\S]{0,320}_pulseOnce\(\)/.test(SRC));
}

console.log('\n═══ y el sello no se le sirve a cualquiera ═══\n');
{
  // pulse es un global sin guion bajo: alcanzable por google.script.run desde
  // cualquier cuenta de Google con la URL. La primera versión delegaba la
  // comprobación en heartbeat y el SELLO se escapaba por fuera — con él se
  // podría deducir a qué horas se mueve material en este almacén.
  const cuerpo = /function pulse\(sessionToken\)\s*\{[\s\S]*?\n\}/.exec(GS);
  check('pulse comprueba la identidad ÉL MISMO, no delegándola',
    !!cuerpo && /getUserRole\(sessionToken\)/.test(cuerpo[0]));
  check('...y devuelve vacío en vez de lanzar, para no sacar un aviso rojo en ' +
        'una sesión sana', !!cuerpo && /return \{ users: null, stamp: '' \}/.test(cuerpo[0]));
}

console.log('\n' + '─'.repeat(72));
console.log('No se construyó un mecanismo nuevo: el latido ya corría cada dos');
console.log('minutos y medio y ya se disparaba al volver a la pestaña. Sólo le');
console.log('faltaba traer un número y que alguien escuchara cuando fallaba.');
console.log('─'.repeat(72));

console.log('\nlive pulse: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
