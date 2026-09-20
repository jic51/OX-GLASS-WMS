// BLOQUEAR Y RESERVAR ERAN LO MISMO, Y SÓLO UNO DE LOS DOS FUNCIONABA.
//
// Jose, 2026-09-19: *"actualmente no hay una diferencia entre bloquear y
// reservar"* y *"no quiero que se llame bloqueo ni quiero que el usuario vea que
// dice bloquear algo, debe decir reservar"*.
//
// LO QUE HABÍA:
//
//   LAS RESERVAS (hoja RESERVATIONS) llevaban cantidad y proyecto, y eran CÓDIGO
//   MUERTO: addReservation y cancelReservation no tenían UN SOLO LLAMADOR en la
//   interfaz. La hoja sólo se llenaba a mano en el Sheet. Por eso el "Reserved"
//   del tablero decía 0 siempre — no fallaba la cuenta, es que no había nada que
//   contar.
//
//   LOS CANDADOS (hoja MATERIAL_LOCKS) no llevan cantidad, pero son reales:
//   tienen ventana y enforceMaterialLock_ los hace cumplir.
//
// Se quedó el mecanismo del candado con el nombre "reserva". Por dentro sigue
// llamándose lock —renombrar la hoja sería una migración de datos de cada
// cliente a cambio de nada que el usuario vea.
//
// ── LO QUE ESTE ARCHIVO PROTEGE, y son tres cosas distintas ─────────────────
//
// 1. QUE LA CANTIDAD SE DERIVE DEL ESTANTE. Una reserva aparta lo que haya en
//    ese estante, y esa cifra no se guarda en ningún sitio: se calcula. Si
//    alguien la guardara, quedaría vieja en cuanto entrara o saliera material, y
//    un "reservado: 44" sobre un estante con 12 unidades es peor que no tener
//    reservas.
//
// 2. QUE LAS DOS MITADES CUENTEN IGUAL. El servidor (reservedQtyFromRacks_) y
//    el navegador (_reservasActivas) hacen la MISMA cuenta en dos idiomas. Si
//    divergen, el tablero y el mapa se contradicen — que es exactamente lo que
//    acababa de pasar con la insignia del mazo y la campana.
//
// 3. QUE LA PALABRA "LOCK" NO SALGA A PANTALLA. Es lo que pidió Jose, y es la
//    clase de cosa que vuelve sola: basta con que alguien escriba un mensaje de
//    error nuevo. Se cuenta, no se busca a ojo.
//
// Uso:  node tools/test-reservas.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS   = A.fuente('gs');
const HTML = A.fuente('html');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 1. El servidor: lo apartado se deriva del estante ──');

{
  const ctx = {
    console,
    normalizeString: s => String(s || '').toUpperCase().trim().replace(/\s+/g, ' ')
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['reservedQtyFromRacks_'], { dobles: ['normalizeString'] }), ctx);

  const mapa = { 'SCREEN|||A1A': { reason: 'obra 12' }, 'SCREEN|||B2B': { reason: 'QC' } };
  const q = (locs, matId) =>
    vm.runInContext('reservedQtyFromRacks_(' + JSON.stringify(mapa) + ',' +
                    JSON.stringify(matId || 'SCREEN') + ',' + JSON.stringify(locs) + ')', ctx);

  check('un estante apartado aparta lo que hay en él', q({ A1A: 44 }) === 44);
  check('dos estantes apartados suman', q({ A1A: 44, B2B: 6 }) === 50);
  check('un estante NO apartado no cuenta', q({ A1A: 44, C3C: 100 }) === 44);
  check('sin estantes apartados, cero', q({ C3C: 100 }) === 0);
  check('otro material con el mismo estante no hereda la reserva',
        q({ A1A: 44 }, 'WINDOW') === 0);

  // LA PROPIEDAD QUE JUSTIFICA NO GUARDAR LA CIFRA: si el estante cambia, lo
  // reservado cambia con él, solo, sin que nadie actualice nada.
  check('sacar material del estante baja lo reservado, sin tocar la reserva',
        q({ A1A: 12 }) === 12);
  check('vaciar el estante deja lo reservado en cero', q({ A1A: 0 }) === 0);
  check('un estante con cantidad negativa no resta', q({ A1A: -5 }) === 0);
  check('el nombre del estante se compara normalizado', q({ ' a1a ': 44 }) === 44);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 2. availableQty sale de lo apartado ──');

{
  const ctx = {
    console, Logger: { log(){} },
    normalizeString: s => String(s || '').toUpperCase().trim().replace(/\s+/g, ' ')
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['applyReservationsAndFinalize_'],
                             { dobles: ['normalizeString'] }), ctx);

  const stock = {
    'SCREEN': { warehouseQty: 50, siteQty: 0, wastedQty: 0, reservedQty: 0,
                warehouseLocs: { A1A: 44, C3C: 6 } },
    'WINDOW': { warehouseQty: 10, siteQty: 2, wastedQty: 0, reservedQty: 0,
                warehouseLocs: { A1A: 10 } }
  };
  ctx.stock = stock;
  ctx.mapa  = { 'SCREEN|||A1A': { reason: 'obra 12' } };
  vm.runInContext('applyReservationsAndFinalize_(stock, mapa)', ctx);

  check('lo apartado llega al material correcto', stock.SCREEN.reservedQty === 44,
        stock.SCREEN.reservedQty);
  check('disponible = almacén − apartado', stock.SCREEN.availableQty === 6,
        stock.SCREEN.availableQty);
  check('el material sin reserva no se toca aunque comparta estante',
        stock.WINDOW.reservedQty === 0 && stock.WINDOW.availableQty === 10,
        { r: stock.WINDOW.reservedQty, a: stock.WINDOW.availableQty });

  // EL ORDEN IMPORTA: los estantes vacíos se limpian ANTES de contar. Contar uno
  // que acaba de vaciarse apartaría unidades que ya no están, y dejaría el
  // disponible por debajo de la realidad — en un almacén, un camión que no sale.
  const stock2 = { 'SCREEN': { warehouseQty: 6, siteQty: 0, wastedQty: 0, reservedQty: 0,
                               warehouseLocs: { A1A: 0, C3C: 6 } } };
  ctx.stock2 = stock2;
  vm.runInContext('applyReservationsAndFinalize_(stock2, mapa)', ctx);
  check('un estante que quedó a cero no aparta nada', stock2.SCREEN.reservedQty === 0,
        stock2.SCREEN.reservedQty);
  check('...y el disponible es todo lo que queda', stock2.SCREEN.availableQty === 6,
        stock2.SCREEN.availableQty);

  // Sin reservas, todo disponible. El caso de hoy en casi todas las
  // instalaciones, y el que no puede romperse.
  const stock3 = { 'SCREEN': { warehouseQty: 50, siteQty: 0, wastedQty: 0, reservedQty: 0,
                               warehouseLocs: { A1A: 44, C3C: 6 } } };
  ctx.stock3 = stock3;
  vm.runInContext('applyReservationsAndFinalize_(stock3, {})', ctx);
  check('sin ninguna reserva, disponible = almacén',
        stock3.SCREEN.reservedQty === 0 && stock3.SCREEN.availableQty === 50);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 3. El navegador cuenta LO MISMO que el servidor ──');

{
  const ctx = {
    console,
    _normKey: s => String(s || '').toUpperCase().trim().replace(/\s+/g, ' '),
    nt: s => String(s || '').toUpperCase().trim(),
    materialLocks: [
      { id:'L1', matId:'SCREEN', category:'SCREEN', name:'YOGU', rack:'A1A',
        reason:'obra 12', lockedBy:'jose@ox-glass.com', lockedAt:'09/19/2026 10:00',
        allowedDest:[] },
      { id:'L2', matId:'SCREEN', category:'SCREEN', name:'YOGU', rack:'B2B',
        reason:'QC', lockedBy:'jc@ox-glass.com', lockedAt:'', allowedDest:[] },
      // Una liberada: no debe contar en ningún sitio.
      { id:'L3', matId:'WINDOW', category:'WINDOW', name:'VENT', rack:'C3C',
        reason:'ya no', lockedBy:'x', status:'Released', allowedDest:[] }
    ],
    stockData: {
      'SCREEN': { unit:'UNIT', warehouseLocs:{ A1A:44, B2B:6, C3C:100 } },
      'WINDOW': { unit:'UNIT', warehouseLocs:{ C3C:10 } }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(HTML, ['_reservasActivas', '_reservasResumen', '_reservasDeEstante'],
                             { dobles: ['_normKey', 'nt'] }), ctx);

  const lista = vm.runInContext('_reservasActivas()', ctx);
  check('sólo las activas', lista.length === 2, lista.map(r => r.id));
  check('la liberada queda fuera', !lista.some(r => r.id === 'L3'));
  check('la cantidad sale del estante, no de un campo guardado',
        lista[0].qty === 44 && lista[1].qty === 6,
        lista.map(r => r.rack + ':' + r.qty));
  check('vienen ordenadas por estante', lista[0].rack === 'A1A' && lista[1].rack === 'B2B',
        lista.map(r => r.rack));

  const res = vm.runInContext('_reservasResumen()', ctx);
  check('el resumen suma las unidades', res.unidades === 50, res.unidades);
  check('...cuenta las reservas', res.n === 2, res.n);
  check('...y los estantes distintos', res.estantes === 2, res.estantes);

  // ── LA COMPROBACIÓN QUE DE VERDAD IMPORTA ──
  // El mismo caso, por los dos caminos, y el resultado tiene que coincidir. Es
  // la única forma de que el tablero y el mapa no puedan discrepar.
  const ctxGS = { console, normalizeString: ctx._normKey };
  vm.createContext(ctxGS);
  vm.runInContext(A.levantar(GS, ['reservedQtyFromRacks_'], { dobles: ['normalizeString'] }), ctxGS);
  const mapa = { 'SCREEN|||A1A': {}, 'SCREEN|||B2B': {} };
  const delServidor = vm.runInContext(
    'reservedQtyFromRacks_(' + JSON.stringify(mapa) + ',"SCREEN",' +
    JSON.stringify(ctx.stockData.SCREEN.warehouseLocs) + ')', ctxGS);
  const delNavegador = lista.filter(r => r.matId === 'SCREEN')
                            .reduce((a, r) => a + r.qty, 0);
  check('servidor y navegador dan el MISMO número',
        delServidor === delNavegador && delServidor === 50,
        { servidor: delServidor, navegador: delNavegador });

  const enA1A = vm.runInContext('_reservasDeEstante("a1a")', ctx);
  check('por estante, y comparando normalizado', enA1A.length === 1 && enA1A[0].rack === 'A1A',
        enA1A.map(r => r.rack));
  check('un estante sin reservas devuelve lista vacía',
        vm.runInContext('_reservasDeEstante("Z9Z")', ctx).length === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 4. Las reservas muertas ya no existen ──');

const gsLimpio   = A.sinComentarios(GS);
const htmlLimpio = A.sinComentarios(HTML);

check('addReservation_ borrado del servidor',   gsLimpio.indexOf('addReservation_') === -1);
check('cancelReservation_ borrado del servidor', gsLimpio.indexOf('cancelReservation_') === -1);
check('...y sus dos puertas del enrutador también',
      gsLimpio.indexOf("'addReservation'") === -1 &&
      gsLimpio.indexOf("'cancelReservation'") === -1);
check('el navegador ya no recibe la lista muerta',
      !/\breservations\s*[=:]/.test(htmlLimpio),
      (htmlLimpio.match(/\breservations\s*[=:][^,;\n]*/g) || []).slice(0, 3));
// La hoja NO se borra: si un cliente escribió filas a mano, siguen siendo suyas.
check('pero la hoja RESERVATIONS se sigue creando, no se destruye nada',
      gsLimpio.indexOf('RESERVATIONS') !== -1);

// Nadie vuelve a leer esa hoja para calcular nada. Es lo que impide que dentro
// de un año haya otra vez dos fuentes para el mismo número.
const lectores = (gsLimpio.match(/SHEETS\.RESERVATIONS/g) || []).length;
check('y ya sólo se la nombra UNA vez — la creación', lectores === 1, lectores);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 5. El usuario no lee "lock" en ninguna pantalla ──');
//
// SE CUENTA, no se busca a ojo. Y sobre el código sin comentarios, porque los
// comentarios de este proyecto explican el cambio nombrando lo que quitaron.

/* SÓLO LAS FRASES, y ahí está toda la dificultad de esta comprobación.
 *
 * El primer intento sacaba "todo lo que hay entre comillas" con
 * /'[^'\n]{4,}'/ y dio cinco falsos positivos, porque ese regex empareja la
 * comilla de CIERRE de un literal con la de APERTURA del siguiente: en
 * `by: l.lockedBy || '', at: l.lockedAt` se inventa la cadena
 * "', by: l.lockedBy || '". Estaba midiendo mi regex, no el producto.
 *
 * El segundo intento buscó "lock" como palabra suelta en todo el archivo y dio
 * 101, casi todas del `{ key:'qty', lock:true }` de las columnas — donde "lock"
 * significa "esta columna no se puede ocultar" y no tiene nada que ver.
 *
 * Lo que funciona es pedir las dos cosas a la vez:
 *   · un literal BIEN EMPAREJADO (respetando escapes), y
 *   · que PAREZCA una frase: con un espacio dentro y mayoría de letras — lo que
 *     deja fuera los identificadores, las clases de CSS y los selectores.
 * Y luego "lock" como PALABRA, ni pegada a letras (lockedBy) ni a guiones
 * (col-lock).
 *
 * Con eso quedaron tres, y las tres eran de verdad. */
function frasesDe(src){
  const limpio = A.sinComentarios(src);
  const out = [];
  const pon = t => {
    if (!t || t.indexOf(' ') === -1) return;
    const letras = (t.match(/[A-Za-z ]/g) || []).length;
    if (letras / t.length < 0.6) return;
    out.push(t);
  };
  // (a) literales de JS, bien emparejados
  const reStr = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
  let m;
  while ((m = reStr.exec(limpio))) pon(m[1] !== undefined ? m[1] : m[2]);
  // (b) TEXTO ENTRE ETIQUETAS. Faltaba, y la mutación lo demostró: devolver el
  // <h3> a "Lock Material" no ponía roja esta comprobación, sólo la positiva de
  // más abajo. Un guardia que sólo mira las cadenas de JS deja fuera todo el
  // HTML escrito a mano, que es donde vive el título de cada ventana.
  //
  // Se descarta lo que traiga comilla o salto de línea: esos trozos no son
  // texto de una etiqueta, son CÓDIGO que casualmente cae entre un '>' y un
  // '<' de dos cadenas concatenadas. El primer intento coló uno —"') + (c.lock
  // ? '"— y habría dejado la comprobación midiendo otra vez el extractor en vez
  // del producto.
  const reTag = />([^<>{}'"\n]+)</g;
  while ((m = reTag.exec(limpio))) pon(m[1].trim());
  return out;
}
const PALABRA_LOCK = /(^|[^A-Za-z0-9_$-])((?:un)?lock(?:ed|ing|s)?)([^A-Za-z0-9_$-]|$)/i;

// Lo que SÍ puede decir "locked" sin hablar de apartar material: una pantalla
// que no se mueve, y el dueño que se queda fuera de su propia app.
const PERMITIDO = [/scroll|overflow|position/i, /locked out/i];

const sospechosas = frasesDe(HTML).concat(frasesDe(GS))
  .filter(t => PALABRA_LOCK.test(t))
  .filter(t => !PERMITIDO.some(re => re.test(t)));

check('ninguna frase visible dice lock/locked/unlock', sospechosas.length === 0,
      sospechosas.slice(0, 6));

// EL OTRO LADO DEL MISMO CAMBIO, y no es decorativo: esta lista del servidor
// decide si un mensaje se registra como "la app rechazó algo correctamente" o
// como "la app se rompió". Renombrar el mensaje sin renombrarlo aquí convertía
// cada reserva respetada en un error de sistema en el registro. Pasó.
check('el clasificador de errores conoce el prefijo nuevo',
      gsLimpio.indexOf("'RESERVED'") !== -1);
check('...y ya no el viejo', !/_KNOWN_VALIDATION_PREFIXES[\s\S]{0,400}'LOCKED'/.test(gsLimpio));

// Y las palabras que SÍ tiene que haber, para que esto no pase estando todo
// borrado. Un guardia que se cumple con una pantalla en blanco no guarda nada.
[['Reserve Material', HTML], ['🔒 Reserve', HTML], ['Release', HTML],
 ['Reserved by ', HTML], ['RESERVED: This material is reserved at ', GS]].forEach(([t, src]) => {
  check('la app dice "' + t.trim() + '"', src.indexOf(t) !== -1);
});

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 6. Las tres pantallas la enseñan, y comparten la cuenta ──');
//
// Jose: "un lugar en el mapa, un lugar en settings (locations) y un lugar en el
// stock dashboard, no quiero una pestaña más."
// LA TIRA DEL MAPA SE EJECUTA, no se busca. La primera versión de este bloque
// era un grep de "_reservasResumen()" y pasó en verde sobre un tablero al que
// le había quitado la llamada — porque la misma cadena aparece dentro de la
// tira. Un grep sobre el archivo entero no puede decir QUIÉN llama.
{
  const ctx = {
    console,
    _normKey: s2 => String(s2 || '').toUpperCase().trim().replace(/\s+/g, ' '),
    nt: s2 => String(s2 || '').toUpperCase().trim(),
    _he: s2 => String(s2 === undefined || s2 === null ? '' : s2)
                 .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
    _escAttr: s2 => String(s2 === undefined || s2 === null ? '' : s2)
                 .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'),
    materialLocks: [
      { id:'L1', matId:'SCREEN', category:'SCREEN', name:'YOGU', rack:'A1A',
        reason:'obra 12', lockedBy:'jose@ox-glass.com', lockedAt:'', allowedDest:[] },
      { id:'L2', matId:'SCREEN', category:'SCREEN', name:'YOGU', rack:'B2B',
        reason:'QC', lockedBy:'jc@ox-glass.com', lockedAt:'', allowedDest:[] }
    ],
    stockData: { 'SCREEN': { unit:'UNIT', warehouseLocs:{ A1A:44, B2B:6 } } }
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(HTML, ['_reservasTiraHtml'],
                             { dobles: ['_normKey', 'nt', '_he', '_escAttr'] }), ctx);

  const html = vm.runInContext('_reservasTiraHtml()', ctx);
  check('el mapa dibuja una fila por reserva',
        (html.match(/class="resv-row"/g) || []).length === 2,
        (html.match(/class="resv-row"/g) || []).length);
  check('...con el total de unidades en la cabecera', html.indexOf('50 units') !== -1);
  check('...y los estantes contados', html.indexOf('2 racks') !== -1);
  check('cada fila lleva a su estante — el mapa ya sabe abrir el cajón',
        html.indexOf('data-action="open-rack"') !== -1 &&
        html.indexOf('data-rack="A1A"') !== -1);
  check('el motivo viaja en la fila', html.indexOf('obra 12') !== -1);

  // Sin reservas, NADA. Una tira que dice "0 reservations" todos los días le
  // roba sitio al plano, que es a lo que se viene al mapa.
  ctx.materialLocks = [];
  check('sin reservas no dibuja nada', vm.runInContext('_reservasTiraHtml()', ctx) === '');
}

// Las otras dos pantallas se comprueban EN SU PROPIO TROZO de código, no en el
// archivo entero — que es lo que dejó pasar la mutación.
{
  const stats = A.sinComentarios(HTML);
  const desde = stats.indexOf("getElementById('statsRow').innerHTML");
  const cacho = stats.slice(Math.max(0, desde - 400), desde + 3000);
  check('el tablero construye su tarjeta desde el resumen compartido',
        desde !== -1 && /var resumen = _reservasResumen\(\)/.test(cacho) &&
        /resumen\.unidades/.test(cacho) && /resumen\.n/.test(cacho));

  const loc = stats.indexOf('class="loc-item"');
  const cachoLoc = stats.slice(loc, loc + 2500);
  check('Settings → Locations pregunta por su propio estante',
        loc !== -1 && /_reservasDeEstante\(l\.name\)/.test(cachoLoc));
}

check('y no se añadió ninguna pestaña nueva al topbar',
      (htmlLimpio.match(/class="nav-btn"|id="btn-[a-z]+"/g) || []).join(' ').indexOf('reserv') === -1);
// Una sola familia de funciones calcula. Si aparece una quinta, es que alguien
// volvió a contar por su cuenta en alguna pantalla.
const fuentes = (htmlLimpio.match(/function _reservas[A-Za-z]*\(/g) || []);
check('las funciones de reservas del navegador son exactamente 4', fuentes.length === 4, fuentes);

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
process.exit(fail ? 1 : 0);
