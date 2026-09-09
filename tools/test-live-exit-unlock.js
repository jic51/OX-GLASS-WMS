// DOS COSAS QUE LA APP SABÍA Y NO DECÍA A TIEMPO.
//
// Jose, 2026-09-06, probando la v11.50 con dos cuentas:
//
//   "el refresh de la cantidad al hacer un exit... no es lo suficientemente
//    rápido... necesitamos que apenas la app detecta que no se puede hacer exit
//    de esa cantidad, se le avise al usuario el porqué (no con el toast actual)
//    y se actualice la cantidad en la ventana del exit"
//
//   "al dos usuarios desbloquear un material al mismo tiempo, uno recibe el
//    toast 'error: lock not found or already removed' pero en el material
//    todavía se ve el candado y la palabra 'unlock'... no debería decirle error
//    al usuario, debe darle la explicación sin hacerlo sentir como que hizo
//    algo malo o que la app está fallando"
//
// SON EL MISMO PATRÓN POR TERCERA Y CUARTA VEZ: el servidor sabe la verdad y el
// navegador la tira. Ya pasó con SYSTEM_BUSY| (un "todavía no" enseñado como un
// "no") y con SHORT_STOCK| (el número correcto dentro de un texto rojo).
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que el aviso del EXIT salga DENTRO de la ventana y no en un toast. Es lo
//      que Jose pidió por su nombre, y el motivo es bueno: un toast aparece en
//      otra esquina, dura unos segundos y se va; para cuando se lee, el número
//      del que habla ya no está al lado.
//   2. Que NO se toque la cantidad que la persona escribió — sólo se avisa.
//      Cambiarle el número mientras teclea es quitarle el control; puede que
//      esté a punto de cambiar de estante.
//   3. Que sólo se avise cuando algo EMPEORÓ. Si llega más material también
//      cambia el número, y no hay por qué interrumpir a nadie.
//   4. Que el desbloqueo doble se trate como ÉXITO, porque el objetivo se
//      cumplió — y que por tanto el candado desaparezca de la pantalla, que es
//      lo que no pasaba.
//
// Uso:  node tools/test-live-exit-unlock.js

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

// ── 1. El aviso en vivo del EXIT, ejecutado ─────────────────────────────────
console.log('\n═══ la ventana de salida se entera sola ═══\n');

function escenario(op){
  function campo(v){
    let _v = String(v);
    return { get value(){ return _v; }, set value(x){ _v = String(x); } };
  }
  const clases = [];
  function fila(rack, qty){
    const set = new Set();
    const inputs = { '.el-rack': campo(rack), '.el-qty': campo(qty) };
    const f = {
      querySelector: (s) => inputs[s] || null,
      classList: { add: c => set.add(c), remove: c => set.delete(c),
                   contains: c => set.has(c) },
      offsetWidth: 0,
      _inputs: inputs, _clases: set
    };
    clases.push(set);
    return f;
  }
  const filas = op.filas.map(f => fila(f.rack, f.qty));
  const caja = { style: { display: 'none' }, innerHTML: '' };
  const ctx = vm.createContext({
    console, String, Number,
    stockData: op.stockData,
    _avisos: [],
    showToast: (m, k) => { ctx._avisos.push({ m, k }); },
    _he: (s) => String(s == null ? '' : s),
    _qtyText: (n) => String(n),
    nt: (s) => String(s || '').toUpperCase().trim(),
    _normKey: (s) => String(s || '').toUpperCase().trim(),
    _qty: (v) => Number(v) || 0,
    document: {
      getElementById: (id) => {
        if (id === 'multiExitSection') return { style: { display: op.abierto ? '' : 'none' } };
        if (id === 'exitLiveWarn') return caja;
        if (id === 'moveOverlay') return { classList: { contains: () => !!op.abierto } };
        if (id === 'exit-cat-1')  return { value: 'SCREEN' };
        if (id === 'exit-name-1') return { value: op.material || '44 NORTH' };
        return null;
      },
      querySelectorAll: (sel) => sel === '[id^="exit-locs-"]'
        ? [{ id: 'exit-locs-1', querySelectorAll: () => filas }] : []
    }
  });
  vm.runInContext(fnSrc(SRC, '_exitLiveNotice'), ctx);
  vm.runInContext('_exitLiveNotice()', ctx);
  return { caja, filas, ctx };
}

const STOCK = () => ({ 'SCREEN|||44 NORTH': { warehouseLocs: { C3B: 42, A1A: 30 } } });

{
  // Alguien se llevó material: pedías 92, quedan 42.
  const r = escenario({ abierto: true, stockData: STOCK(),
                        filas: [{ rack: 'C3B', qty: 92 }] });
  check('el aviso aparece DENTRO de la ventana, no como toast — es lo que Jose ' +
        'pidió por su nombre', r.caja.style.display === 'flex');
  check('...y no se dispara ningún toast', r.ctx._avisos.length === 0);
  check('dice el material, el estante, lo que pediste y lo que queda ("' +
        String(r.caja.innerHTML).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70) + '…")',
    /44 NORTH/.test(r.caja.innerHTML) && /C3B/.test(r.caja.innerHTML) &&
    /92/.test(r.caja.innerHTML) && /42/.test(r.caja.innerHTML));
  check('...y qué hacer, en vez de dejar a la persona parada',
    /Lower the amount|pick another rack|remove the line/i.test(r.caja.innerHTML));
  check('LA CANTIDAD ESCRITA NO SE TOCA (' + r.filas[0]._inputs['.el-qty'].value +
        ') — avisar es una cosa y decidir por alguien es otra; puede estar a ' +
        'punto de cambiar de estante',
    r.filas[0]._inputs['.el-qty'].value === '92');
  check('la fila que cambió parpadea, para no tener que buscar cuál de cinco ' +
        'se movió', r.filas[0]._clases.has('just-changed'));
}
{
  // Todo cabe: no hay nada que decir.
  const r = escenario({ abierto: true, stockData: STOCK(),
                        filas: [{ rack: 'C3B', qty: 40 }] });
  check('si lo pedido cabe, NO se avisa de nada — una ventana que avisa cuando ' +
        'no pasa nada enseña a no leer los avisos',
    r.caja.style.display === 'none');
  check('...y la fila no parpadea', !r.filas[0]._clases.has('just-changed'));
}
{
  // Llegó MÁS material. También cambió el número, y tampoco hay que molestar.
  const stock = { 'SCREEN|||44 NORTH': { warehouseLocs: { C3B: 500 } } };
  const r = escenario({ abierto: true, stockData: stock,
                        filas: [{ rack: 'C3B', qty: 92 }] });
  check('si llegó MÁS material tampoco se avisa: cambió el número, pero a mejor',
    r.caja.style.display === 'none');
}
{
  // Dos filas, una corta y otra no.
  const r = escenario({ abierto: true, stockData: STOCK(),
                        filas: [{ rack: 'A1A', qty: 10 }, { rack: 'C3B', qty: 92 }] });
  check('con varias filas sólo se nombra la que falla',
    /C3B/.test(r.caja.innerHTML) && !/A1A/.test(r.caja.innerHTML));
  check('...y sólo parpadea ésa',
    !r.filas[0]._clases.has('just-changed') && r.filas[1]._clases.has('just-changed'));
}
{
  // La ventana está cerrada: no hay nada que avisar ni que tocar.
  const r = escenario({ abierto: false, stockData: STOCK(),
                        filas: [{ rack: 'C3B', qty: 92 }] });
  check('con la ventana cerrada no se hace nada', r.caja.style.display === 'none');
}

console.log('\n═══ y se llama cada vez que llegan datos frescos ═══\n');
{
  const carga = fnSrc(SRC, 'loadDataFromGoogle');
  check('el refresco de datos repinta la ventana de salida abierta — va ahí y ' +
        'no en el latido, para que valga venga el refresco de donde venga',
    /_refreshOpenExitForm\(\)/.test(carga));
  const refresco = fnSrc(SRC, '_refreshOpenExitForm');
  check('...repintando desde stockData (los disponibles y el total), no a mano',
    /syncExitRackAvail\(n\)/.test(refresco) && /syncExitMatTotal\(n\)/.test(refresco));
  check('...y termina avisando si algo ya no cabe',
    /_exitLiveNotice\(\)/.test(refresco));
  check('y si algo revienta ahí dentro no se lleva por delante la carga de ' +
        'datos entera', /catch \(e\) \{ console\.error\('_refreshOpenExitForm/.test(refresco));
  check('el aviso se limpia al abrir la ventana, para no heredar el de la vez ' +
        'anterior', /exitLiveWarn[\s\S]{0,120}display = 'none'/.test(fnSrc(SRC, 'openMoveModal')));
}

// ── 2. El desbloqueo doble ──────────────────────────────────────────────────
console.log('\n═══ desbloquear algo que otro ya desbloqueó no es un error ═══\n');
{
  const fn = fnSrc(GS, 'unlockMaterial');
  check('EL SERVIDOR YA NO LANZA: devuelve éxito. La persona quería el material ' +
        'desbloqueado y está desbloqueado — que lo consiguiera otro no lo ' +
        'convierte en un fallo suyo',
    /return \{ status: 'success', alreadyGone: true \}/.test(fn) &&
    !/throw new Error\('Lock not found/.test(fn));

  const cli = fnSrc(SRC, '_doUnlockMaterial');
  check('el navegador distingue los dos casos para poder decirlo con otras ' +
        'palabras', /res && res\.alreadyGone/.test(cli));
  check('...y no dice "Error" en ninguno de los dos',
    !/showToast\('Error[\s\S]{0,80}alreadyGone/.test(cli) &&
    /Already unlocked/.test(cli));

  // LO QUE DE VERDAD ARREGLA EL CANDADO PINTADO: que este caso pase por el
  // manejador de ÉXITO, que ya quitaba el candado y repintaba. El de FALLO no
  // hacía nada de eso, y por eso el candado se quedaba en pantalla con la
  // palabra "Unlock" al lado.
  const exito = cli.slice(cli.indexOf('withSuccessHandler'), cli.indexOf('withFailureHandler'));
  check('EL CANDADO DESAPARECE DE LA PANTALLA: el camino de éxito lo quita de ' +
        'la lista...', /materialLocks = materialLocks\.filter/.test(exito));
  check('...reconstruye el índice...', /_rebuildLocksIndex\(\)/.test(exito));
  check('...y repinta el estante abierto y el mapa — esto es lo que faltaba, y ' +
        'no había que escribirlo: ya existía en el camino equivocado',
    /openRackDrawer/.test(exito) && /renderWarehouseMap\(\)/.test(exito));
  check('y el error de verdad, si lo hubiera, se enseña sin etiquetas internas',
    /_stripTags\(err\)/.test(cli));
}

// ── Quién lo cerró, cuándo y por qué — ANTES de quitarlo ────────────────────
// Jose: "al desbloquear deberíamos decir quién lo hizo y mostrar la razón que
// dio esa persona... ya tenemos la información, sólo hay que mostrarla". Y es
// literal: el motivo, quién y cuándo viajan en cada candado desde que existen.
// Sólo se veían pasando el ratón por un icono diminuto, que es el sitio
// equivocado: un candado lo pone alguien PARA QUE NADIE TOQUE ese material, y
// quien va a quitarlo es justo quien necesita leer el motivo, justo en el
// momento en que todavía puede parar.
{
  const conf = fnSrc(SRC, 'unlockMaterialConfirm');
  check('el aviso de desbloqueo dice QUIÉN lo cerró', /Locked by/.test(conf) && /lock\.lockedBy/.test(conf));
  check('...y CUÁNDO', /lock\.lockedAt/.test(conf));
  check('...y SU RAZÓN, entre comillas y tal cual la escribió — es lo que dijo ' +
        'una persona, no un estado que la app calculó',
    /Their reason/.test(conf) && /lock\.reason/.test(conf));
  check('...y si no dio ninguna, lo dice: un hueco en blanco parece que la app ' +
        'perdió el dato', /did not give a reason/.test(conf));
  check('...y a dónde se permitía moverlo, cuando el candado lo limitaba',
    /allowedDest/.test(conf));
  check('el candado se busca por su id en lo que el navegador YA tiene — no ' +
        'hace falta pedirle nada al servidor para esto',
    /_lockById\(lockId\)/.test(conf));

  const doUnlock = fnSrc(SRC, '_doUnlockMaterial');
  check('y al soltarlo el aviso dice QUÉ se soltó, no sólo que se soltó',
    /lock && lock\.name/.test(doUnlock));
  check('...leyéndolo ANTES de quitarlo de la lista, porque después ya no está',
    doUnlock.indexOf('_lockById(lockId)') < doUnlock.indexOf('materialLocks.filter'));
}

console.log('\n' + '─'.repeat(72));
console.log('Tercera y cuarta vez del mismo patrón: el servidor sabe la verdad');
console.log('y el navegador la tira. Y otra vez, el código correcto ya estaba');
console.log('escrito — al desbloqueo doble sólo había que mandarlo por el');
console.log('camino bueno en vez de por el de los errores.');
console.log('─'.repeat(72));

console.log('\nlive exit + unlock: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
