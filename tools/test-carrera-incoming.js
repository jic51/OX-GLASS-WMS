// DOS PERSONAS A LA VEZ: EDITAR UNA ENTREGA NO PUEDE ESCRIBIR SOBRE OTRA.
//
// Barrido de concurrencia, 2026-09-14. deleteIncoming borraba la fila por su
// NÚMERO —deleteRow(i + 1), y todo lo de abajo sube una— y updateIncoming
// escribía por el suyo. Ninguna de las dos tomaba el candado:
//
//   1. A abre la entrega #5. El servidor la lee y la encuentra en la fila 6.
//   2. B borra la entrega #2. Todo sube una fila.
//   3. A guarda: escribe en la fila 6, que ahora es OTRA entrega.
//
// La edición de A cae encima de una entrega que nadie estaba tocando. Las dos
// acciones son de ADMIN, y Jose trabaja con dos cuentas abiertas.
//
// ES LA MISMA LECCIÓN DEL 2026-09-07 —"un número de fila es lo que hacía esto
// peligroso"—, que se aplicó a los movimientos y nunca se conectó aquí.
//
// CÓMO SE MIDE. No comprobando que la palabra withStockLock_ aparezca: eso ya
// nos dejó pasar dos fallos en verde esta semana. Se ejecutan las funciones DE
// VERDAD contra una hoja de mentira, con un candado de mentira que lleva la
// cuenta de quién lo tiene, y se INTERCALA el borrado en mitad de la edición
// —exactamente donde dolía—. Lo que se afirma es lo que quedó escrito en la
// hoja.
//
// Uso:  node tools/test-carrera-incoming.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS   = A.fuente('gs');
const HTML = A.fuente('html');
const fnSrc = A.fnSrc;

// PRIMERA PRUEBA QUE USA EL ANDAMIO COMPARTIDO (2026-09-15). Antes, cada
// archivo llevaba su propia copia de fnSrc, su propia hoja falsa y su propia
// lista de dependencias A MANO — y esa lista se quedó vieja seis veces en una
// semana, cada una con la suite roja por "X is not defined". Aquí las
// dependencias se buscan solas: A.levantar() lee la función pedida, mira qué
// otras funciones del archivo nombra, y las trae. Ver tools/andamio.js.
const marca = A.marcador('carrera incoming');
const check = marca.check;

// La hoja es la del andamio: parsea como Sheets, se come la comilla de delante
// y su deleteRow DESPLAZA de verdad, que es lo que deja ver la carrera.
const Hoja = A.Hoja;

function entrega(id, nombre){
  const f = new Array(17).fill('');
  f[0] = id; f[1] = '2026-09-20'; f[2] = 'WINDOW'; f[3] = nombre;
  f[4] = 10; f[5] = 'UNIT'; f[6] = 'AMSCO'; f[7] = 'PO-' + id;
  f[9] = 'Pending'; f[10] = 'jose@ox'; f[14] = 'exact';
  return f;
}

// ── El mundo del servidor, con un candado que lleva la cuenta ───────────────
function mundo(){
  const cab = new Array(17).fill('');
  const hoja = new Hoja('INCOMING_V3', [cab,
    entrega('INC-1', 'PRIMERA'),
    entrega('INC-2', 'SEGUNDA'),
    entrega('INC-3', 'TERCERA'),
    entrega('INC-4', 'CUARTA'),
    entrega('INC-5', 'QUINTA')]);

  const candado = { tomado: 0, maximoSimultaneo: 0, vecesTomado: 0 };

  const ctx = vm.createContext({
    console, String, Number, Math, Array, Object, JSON, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => hoja }) },
    ensureIncomingSheet_: () => hoja,
    getUserRole: () => ({ role: 'ADMIN', email: 'jose@ox' }),
    // El candado de verdad es LockService; aquí basta con uno que se queje si
    // dos entran a la vez, que es justo lo que se quiere comprobar.
    withStockLock_: function(fn){
      candado.tomado++; candado.vecesTomado++;
      candado.maximoSimultaneo = Math.max(candado.maximoSimultaneo, candado.tomado);
      try { return fn(); } finally { candado.tomado--; }
    },
    incomingStatus_:   (v) => String(v || 'Pending'),
    incomingDateMode_: (v) => String(v || 'exact'),
    incomingDateCell_: (v) => String(v || ''),
    uploadIncomingDoc_: () => '',
    INCOMING_STATUSES: ['Pending', 'Arrived', 'Cancelled']
  });
  // Se piden las TRES que se quieren ejercitar y nada más: textCell_,
  // textSafeRow_, safeStr_ y withStockLock_ vienen solas porque el archivo dice
  // que hacen falta. El día que una de ellas crezca una dependencia nueva, esta
  // prueba la tendrá sin que nadie la toque.
  vm.runInContext(A.levantar(GS, ['addIncoming', 'updateIncoming', 'deleteIncoming'], {
    dobles: ['ensureIncomingSheet_', 'getUserRole', 'uploadIncomingDoc_',
             'incomingStatus_', 'incomingDateMode_', 'incomingDateCell_',
             'withStockLock_']
  }), ctx);

  return {
    hoja, candado, ctx,
    nombreDe: (id) => {
      const f = hoja.rows.find(r => String(r[0]) === id);
      return f ? f[3] : null;
    },
    editar:  (d) => vm.runInContext('updateIncoming(' + JSON.stringify(d) + ')', ctx),
    borrar:  (id) => vm.runInContext('deleteIncoming(' + JSON.stringify(id) + ', "tok")', ctx)
  };
}

console.log('\n═══ el candado se toma de verdad, no está sólo escrito ═══\n');
{
  const m = mundo();
  m.editar({ id: 'INC-5', name: 'QUINTA EDITADA', category: 'WINDOW', qty: 10,
             unit: 'UNIT', supplier: 'AMSCO', po: 'PO-INC-5',
             estDate: '2026-09-20', dateMode: 'exact', status: 'Pending' });
  check('editar una entrega TOMÓ el candado', m.candado.vecesTomado === 1,
    m.candado.vecesTomado);
  m.borrar('INC-1');
  check('borrar una entrega también', m.candado.vecesTomado === 2);
  check('y lo suelta al terminar — un candado que no se suelta cuelga la app ' +
        'entera para todos', m.candado.tomado === 0);
}

console.log('\n═══ LA CARRERA: borrar por en medio mientras otro edita ═══\n');
{
  // SE INTERCALA UNA LLAMADA DE VERDAD, no una escritura a mano en la hoja.
  //
  // El primer intento de esta prueba metía hoja.deleteRow() directamente desde
  // dentro de la escritura — y eso se saltaba el candado, así que medía algo
  // que el candado NO PUEDE impedir. Forzar el fallo por debajo del arreglo no
  // demuestra que el arreglo falte: demuestra que la prueba estaba mal.
  //
  // Así es como ocurre de verdad: son dos EJECUCIONES distintas de Apps Script.
  // La segunda llama a deleteIncoming, encuentra el candado tomado por la
  // primera y LockService.tryLock le dice que no. Eso es lo que se modela aquí:
  // el candado de mentira se queja si alguien intenta entrar mientras está
  // dentro, igual que el de verdad.
  const m = mundo();
  vm.runInContext(
    'var BUSY_PREFIX = "SYSTEM_BUSY|";\n' +
    'withStockLock_ = function(fn){ return __lock(fn); };', m.ctx);
  let reentradas = 0, rechazos = 0, dentro = 0;
  m.ctx.__lock = (fn) => {
    if (dentro > 0){ rechazos++; throw new Error('SYSTEM_BUSY|System busy'); }
    dentro++;
    try { return fn(); } finally { dentro--; }
  };

  // B intenta borrar la PRIMERA entrega justo cuando A ya leyó y aún no ha
  // escrito. Con el candado puesto, B rebota.
  const original = m.hoja.getRange.bind(m.hoja);
  let intercalado = false;
  m.hoja.getRange = function(r, c, nr, nc){
    const rango = original(r, c, nr, nc);
    const setValuesOriginal = rango.setValues.bind(rango);
    rango.setValues = function(vals){
      if (!intercalado && r > 1){
        intercalado = true;
        reentradas++;
        try { m.borrar('INC-1'); } catch (e) { /* rebotado por el candado */ }
      }
      return setValuesOriginal(vals);
    };
    return rango;
  };

  m.editar({ id: 'INC-5', name: 'QUINTA EDITADA', category: 'WINDOW', qty: 10,
             unit: 'UNIT', supplier: 'AMSCO', po: 'PO-INC-5',
             estDate: '2026-09-20', dateMode: 'exact', status: 'Pending' });

  check('el borrado de B llegó a intentarse en mitad de la edición de A',
    reentradas === 1, reentradas);
  check('...y el candado lo rebotó en vez de dejarlo entrar',
    rechazos === 1, rechazos);

  // LAS DOS ASERCIONES DEL FALLO. Sin candado, B habría borrado la fila 2, todo
  // habría subido una, y la escritura de A habría caído en la entrega
  // equivocada.
  check('la entrega que se editó es la que cambió',
    m.nombreDe('INC-5') === 'QUINTA EDITADA', m.nombreDe('INC-5'));
  check('...y NINGUNA otra se tocó — escribir sobre la entrega del compañero ' +
        'es el daño de verdad: él no se entera nunca',
    m.nombreDe('INC-1') === 'PRIMERA' && m.nombreDe('INC-2') === 'SEGUNDA' &&
    m.nombreDe('INC-3') === 'TERCERA' && m.nombreDe('INC-4') === 'CUARTA',
    { i1: m.nombreDe('INC-1'), i2: m.nombreDe('INC-2'),
      i3: m.nombreDe('INC-3'), i4: m.nombreDe('INC-4') });
  check('y la hoja sigue teniendo las cinco entregas y su cabecera',
    m.hoja.rows.length === 6, m.hoja.rows.length);
}

console.log('\n═══ borrar sigue borrando la que se pidió ═══\n');
{
  const m = mundo();
  m.borrar('INC-3');
  check('desapareció la pedida', m.nombreDe('INC-3') === null);
  check('...y las otras cuatro siguen ahí, con sus nombres',
    m.nombreDe('INC-1') === 'PRIMERA' && m.nombreDe('INC-2') === 'SEGUNDA' &&
    m.nombreDe('INC-4') === 'CUARTA'  && m.nombreDe('INC-5') === 'QUINTA');
  check('borrar una que no existe se queja en vez de borrar otra cosa',
    (() => { try { m.borrar('INC-99'); return false; } catch (e) { return true; } })());
}

console.log('\n═══ y la otra mitad: el reintento en el navegador ═══\n');
{
  // Poner el candado sin el reintento cambia una carrera silenciosa por un
  // error visible, y eso no es un arreglo. Las dos pantallas que llaman a estas
  // acciones tienen que saber esperar su turno.
  const guardar = fnSrc(HTML, 'saveIncomingItem');
  const borrar  = fnSrc(HTML, '_doDeleteIncomingItem');

  check('guardar una entrega reintenta si el sistema está ocupado',
    /_busyRetry\(/.test(guardar));
  check('borrar una entrega también', /_busyRetry\(/.test(borrar));
  check('las dos llevan su propio contador de intentos — uno compartido haría ' +
        'que el segundo botón heredara los intentos gastados por el primero',
    /tries:\s*0/.test(guardar) && /tries:\s*0/.test(borrar));

  // EL ERROR QUE ESTUVO A PUNTO DE IRSE ASÍ. El primer intento le pasaba a
  // _busyRetry un retry que volvía a entrar por _doDeleteIncomingItem(id) — y
  // eso no reintenta nada: _busyRetry deja el botón ocupado mientras espera,
  // así que la reentrada se daba la vuelta en `if (btn && btn.disabled) return`
  // y el borrado se perdía EN SILENCIO. Peor que el error que se quería evitar.
  check('el reintento del borrado vuelve a ENVIAR, no a entrar por la puerta ' +
        'que comprueba si el botón está ocupado',
    /retry:\s*enviar/.test(borrar) && !/retry:\s*function\(\)\{\s*_doDeleteIncomingItem/.test(borrar),
    borrar.match(/retry:[^,}]*/g));
  check('...y el guardado igual: reintenta su envío',
    /retry:\s*function\(\)\{\s*_send\(\);\s*\}/.test(guardar.replace(/\s+/g, ' ')) ||
    /retry:\s*function\s*\(\)\s*\{\s*_send\(\)/.test(guardar));
}

console.log('\n═══ y quitar un usuario ya no borra una fila de CONFIG ═══\n');
{
  // En CONFIG cada COLUMNA es una lista: A proyectos, B categorías, C
  // proveedores, D locaciones, F/G usuarios. deleteRow se llevaba por delante
  // lo que compartiera renglón con el usuario.
  const cuerpo = fnSrc(GS, 'removeUser_');
  check('removeUser_ ya no llama a deleteRow', !/deleteRow/.test(cuerpo), cuerpo);
  check('...y vacía sólo las dos celdas del usuario, F y G',
    /getRange\(i \+ 1, 6, 1, 2\)\.setValues\(\[\['', ''\]\]\)/.test(cuerpo));

  // Y que de verdad haga lo que dice, ejecutándolo.
  const cfg = new Hoja('CONFIG', [
    ['Proyectos','Categorias','Proveedores','Locaciones','','Email','Rol'],
    ['SUNBRIDGE','WINDOW','AMSCO','B2A','','bob@ox','WAREHOUSE'],
    ['KOTTER','MIRROR','WESTERN','A3A','','ana@ox','ADMIN']
  ]);
  const c = vm.createContext({ String, Object, Array, Error });
  vm.runInContext('var SHEETS = { CONFIG: "CONFIG" };\n' +
                  A.levantar(GS, ['removeUser_']), c);
  c.__ss = { getSheetByName: () => cfg };
  vm.runInContext('removeUser_(__ss, { email: "bob@ox" })', c);

  check('el usuario se fue', cfg.rows[1][5] === '' && cfg.rows[1][6] === '');
  check('...y el proyecto que compartía fila con él SIGUE AHÍ',
    cfg.rows[1][0] === 'SUNBRIDGE', cfg.rows[1][0]);
  check('...y la categoría, el proveedor y la locación también',
    cfg.rows[1][1] === 'WINDOW' && cfg.rows[1][2] === 'AMSCO' && cfg.rows[1][3] === 'B2A');
  check('...y la fila no se movió: el otro usuario sigue en la suya',
    cfg.rows.length === 3 && cfg.rows[2][5] === 'ana@ox');
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('El candado de Apps Script es UNO para todo el script, así que esto');
console.log('tiene un precio: una edición de entrega puede esperar a que termine');
console.log('un guardado de movimiento. Por eso el reintento es parte del mismo');
console.log('arreglo y se comprueba aquí — sin él, esto sólo habría cambiado una');
console.log('carrera silenciosa por un error visible.');
console.log('────────────────────────────────────────────────────────────────────────\n');

marca.fin();
