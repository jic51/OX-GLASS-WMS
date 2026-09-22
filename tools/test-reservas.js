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
console.log('\n── 3b. Una reserva que no retiene nada lo DICE ──');
//
// Jose, 2026-09-21, con cinco capturas: "hay un material llamado EVELYN A
// QUINONEZ que no tiene cantidad pero sí aparece como reservado, pero no hay un
// lugar donde esté."
//
// Tenía razón y eran DOS cosas en una:
//
//   1. _he(0) devolvía CADENA VACÍA, porque 0 es falsy y el escapador hacía
//      String(s||''). La cantidad era 0 y se dibujaba un hueco. No pasaba sólo
//      en la tira: toda la app pasa cantidades por _he.
//
//   2. La reserva era real y estaba activa desde el 5 de septiembre, pero el
//      estante no tenía ese material y el material no tenía NI UNA fila de
//      stock. Aparta lo que haya en el estante, y no había nada: 0 es la
//      respuesta correcta. Lo que estaba mal era callarlo.

{
  const ctx = {
    console,
    _normKey: s2 => String(s2 || '').toUpperCase().trim().replace(/\s+/g, ' '),
    nt: s2 => String(s2 || '').toUpperCase().trim(),
    materialLocks: [
      // El caso de Jose: material sin ninguna fila de stock.
      { id:'V1', matId:'WINDOW|||EVELYN A QUINONEZ', category:'WINDOW',
        name:'EVELYN A QUINONEZ', rack:'B', reason:'Si',
        lockedBy:'joseisrael5101@gmail.com', lockedAt:'09/05/2026 17:06', allowedDest:[] },
      // El otro caso: el material existe, pero ya no está en ESE estante.
      { id:'V2', matId:'WINDOW|||MH 145', category:'WINDOW', name:'MH 145', rack:'B2A',
        reason:'para enero', lockedBy:'jose@ox.com', lockedAt:'', allowedDest:[] },
      // Y una que sí retiene.
      { id:'V3', matId:'WINDOW|||44 NORTH', category:'WINDOW', name:'44 NORTH', rack:'C3B',
        reason:'otra obra', lockedBy:'jose@ox.com', lockedAt:'', allowedDest:[] }
    ],
    stockData: {
      'WINDOW|||MH 145':   { unit:'UNIT', warehouseQty: 51, warehouseLocs:{ C1C: 51 } },
      'WINDOW|||44 NORTH': { unit:'UNIT', warehouseQty: 142, warehouseLocs:{ C3B: 142 } }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(HTML, ['_reservasActivas', '_reservasResumen'],
                             { dobles: ['_normKey', 'nt'] }), ctx);

  const l = vm.runInContext('_reservasActivas()', ctx);
  const porId = {};
  l.forEach(r => { porId[r.id] = r; });

  check('la reserva sigue apareciendo — está activa en la hoja', l.length === 3, l.length);
  check('sin fila de stock: se marca "sin-material"', porId.V1.vacia === 'sin-material',
        porId.V1.vacia);
  check('...y su cantidad es 0, no undefined', porId.V1.qty === 0, porId.V1.qty);
  check('material que se mudó de estante: se marca "sin-stock-aqui"',
        porId.V2.vacia === 'sin-stock-aqui', porId.V2.vacia);
  check('...y dice DÓNDE está ahora, que es lo accionable',
        porId.V2.otrosEstantes.join(',') === 'C1C', porId.V2.otrosEstantes);
  check('la que sí retiene no se marca', porId.V3.vacia === '' && porId.V3.qty === 142,
        { v: porId.V3.vacia, q: porId.V3.qty });

  const res = vm.runInContext('_reservasResumen()', ctx);
  check('el resumen cuenta cuántas no retienen nada', res.vacias === 2, res.vacias);
  check('...y el total de unidades sólo suma lo que de verdad se retiene',
        res.unidades === 142, res.unidades);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 3c. El escapador no se come el cero ──');
//
// La mitad de abajo del hallazgo de Jose, y la que afecta a TODA la app: el
// cajón del estante, las tarjetas de llegada y el "% used" del indicador de
// espacio pasan cantidades por _he. Con String(s||''), un 0 salía como un
// hueco en todos ellos, y un hueco parece un dato perdido.
{
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(HTML, ['_he', '_escAttr']), ctx);
  const he = v => vm.runInContext('_he(' + JSON.stringify(v) + ')', ctx);
  const ea = v => vm.runInContext('_escAttr(' + JSON.stringify(v) + ')', ctx);

  check('_he(0) escribe "0"', he(0) === '0', he(0));
  check('_escAttr(0) escribe "0"', ea(0) === '0', ea(0));
  check('_he(false) escribe "false"', he(false) === 'false', he(false));
  // Lo que SÍ tiene que desaparecer: lo que no existe.
  check('_he(null) sigue vacío', vm.runInContext('_he(null)', ctx) === '');
  check('_he(undefined) sigue vacío', vm.runInContext('_he(undefined)', ctx) === '');
  check('_escAttr(null) sigue vacío', vm.runInContext('_escAttr(null)', ctx) === '');
  // Y que siga escapando, que es para lo que existe.
  check('_he sigue escapando < > & y comillas',
        he('<a href="x">&') === '&lt;a href=&quot;x&quot;&gt;&amp;', he('<a href="x">&'));
  check('_escAttr sigue escapando comillas y <',
        ea('a"<b&') === 'a&quot;&lt;b&amp;', ea('a"<b&'));
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
    // La tira pinta botones que sólo un ADMIN puede pulsar, así que el rol es
    // parte del dibujo. Se prueban los dos roles más abajo.
    userRole: 'ADMIN',
    // La tira arranca plegada. Es un `var` del archivo, no una función, así que
    // el andamio no lo levanta: viaja en el contexto.
    _resvAbierta: false,
    // Y el ancho de letra medido SE LEE DEL ARCHIVO, no se copia aquí. Copiarlo
    // dejaría la prueba midiendo un número que ya nadie usa el día que alguien
    // cambie el del producto — que es la forma más silenciosa de que un test
    // deje de medir el producto.
    _RESV_PX_LETRA: (function(){
      const m = /var _RESV_PX_LETRA = ([\d.]+)/.exec(HTML);
      if (!m) throw new Error('test-reservas: _RESV_PX_LETRA ya no está en el archivo. ' +
        'Si se renombró, esta prueba tiene que enterarse.');
      return Number(m[1]);
    })(),
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
  // El corchete excluye a propósito `resv-row-wrap`, que empieza igual: contar
  // envoltorios en vez de filas daría el número bueno por la razón equivocada.
  check('el mapa dibuja una fila por reserva',
        (html.match(/class="resv-row["' ]/g) || []).length === 2,
        (html.match(/class="resv-row["' ]/g) || []).length);
  check('...con el total de unidades en la cabecera', html.indexOf('50 units') !== -1);
  check('...y los estantes contados', html.indexOf('2 racks') !== -1);
  check('cada fila lleva a su estante — el mapa ya sabe abrir el cajón',
        html.indexOf('data-action="open-rack"') !== -1 &&
        html.indexOf('data-rack="A1A"') !== -1);
  check('el motivo viaja en la fila', html.indexOf('obra 12') !== -1);

  /* ── 6b. PLEGADA ──────────────────────────────────────────────────────────
   * Jose: "si existen 100 materiales reservados habrá una lista de 100 cosas,
   * será bien larga; debemos hacerlo expandible como el Low Stock." */
  check('arranca plegada — las filas vienen ocultas',
        /<div class="resv-rows" hidden>/.test(html), html.slice(0, 900));
  check('...y la cabecera dice cómo verlas', html.indexOf('click to show') !== -1);
  check('...sin dejar de contar cuántas hay sin abrirla',
        /2 reservations/.test(html), html.slice(0, 900));
  /* EL ORDEN QUE PIDIÓ JOSE: los números seguidos, y la frase larga fuera de la
   * cabecera, en una ⓘ. Antes la explicación iba EN MEDIO de las cifras. */
  check('los tres números van seguidos, sin la explicación en medio',
        /50 units · 2 reservations · in 2 racks/.test(html), html.slice(0, 700));
  check('la explicación larga ya no está en la cabecera',
        html.indexOf('>nothing here can leave') === -1);
  check('...sino en la ⓘ que la app ya usa en otros sitios',
        /class="info-ic tip resv-info"[^>]*data-tip="Nothing here can leave/.test(html),
        html.slice(0, 900));
  // Y la ⓘ FUERA del botón: es enfocable, y algo enfocable dentro de un
  // <button> no es HTML válido — el navegador desarma la pareja.
  check('...y fuera del botón de plegar, que si no es HTML inválido',
        html.indexOf('</button><span class="info-ic') !== -1, html.slice(0, 900));
  ctx._resvAbierta = true;
  const abierta = vm.runInContext('_reservasTiraHtml()', ctx);
  check('abierta, las filas se ven', /<div class="resv-rows">/.test(abierta));
  check('...y la tira se marca abierta para girar la flecha',
        /class="resv-strip abierta"/.test(abierta));
  check('...y el texto cambia a cerrar', abierta.indexOf('click to hide') !== -1);
  ctx._resvAbierta = false;

  /* ── 6c. COLUMNAS FIJAS, Y LO LARGO SE ENCOGE ANTES DE PARTIRSE ───────────
   * Jose: "todo depende del tamaño de los nombres, cada cosa se mueve si se
   * ponen más letras; démosle un espacio horizontal fijo a cada uno y si tiene
   * más letras que se encoja hasta un punto que se pueda leer, y si es mucha
   * letra entonces doble línea."
   *
   * La parte de "espacio fijo" vive en el CSS y se comprueba allí; lo que se
   * ejecuta aquí es la escalera, que es donde se puede equivocar uno. Los 120px
   * son los de la columna del estante, escritos en el CSS. */
  check('un nombre corto no se toca', vm.runInContext('_resvFit("B1B", 120)', ctx) === '');
  check('DELIVERY SHELF entra entero a tamaño normal',
        vm.runInContext('_resvFit("DELIVERY SHELF", 120)', ctx) === '');
  // Uno que cabe justo con el peldaño de en medio, para que el peldaño exista
  // de verdad y no sea una rama que nunca se toma.
  check('lo que cabe encogiendo un poco, encoge un poco',
        vm.runInContext('_resvFit("MIRRORS SHOWERS", 120)', ctx) === 'fit-sm',
        vm.runInContext('_resvFit("MIRRORS SHOWERS", 120)', ctx));
  // WINDOW WAREHOUSE —el de la captura de Jose— necesita el peldaño de abajo:
  // 16 letras no entran en 120px ni al tamaño de en medio. Al pequeño sí, y la
  // prueba de navegador confirma que sale en UNA línea y entero.
  check('WINDOW WAREHOUSE baja al peldaño pequeño, no se corta',
        vm.runInContext('_resvFit("WINDOW WAREHOUSE", 120)', ctx) === 'fit-xs');
  check('y uno muy largo también, dejando que el CSS lo parta',
        vm.runInContext('_resvFit("MIRRORS/SHOWERS BACK WALL", 120)', ctx) === 'fit-xs');
  check('el vacío no revienta', vm.runInContext('_resvFit(null, 120)', ctx) === '');
  check('...y el cero tampoco — es texto, no ausencia',
        vm.runInContext('_resvFit(0, 120)', ctx) === '');
  // Y que la tira la use de verdad: la escalera sólo sirve si llega al HTML, y
  // sólo mide bien si recibe EL ANCHO DE SU COLUMNA. Pasar el mismo número a
  // las cuatro sería volver a los umbrales a ojo.
  const anchos = (A.sinComentarios(A.fnSrc(HTML, '_reservasTiraHtml'))
                   .match(/_resvFit\([^,]+,\s*(\d+)\)/g) || []);
  check('cada columna se mide con SU ancho, no con uno cualquiera',
        anchos.length === 4 && new Set(anchos.map(s => /(\d+)\)/.exec(s)[1])).size >= 3,
        anchos);
  check('y los nombres de clase siguen llegando a las cuatro celdas',
        /class="resv-rack /.test(html) && /class="resv-name /.test(html) &&
        /class="resv-qty /.test(html) && /class="resv-why /.test(html));

  // Sin reservas, NADA. Una tira que dice "0 reservations" todos los días le
  // roba sitio al plano, que es a lo que se viene al mapa.
  ctx.materialLocks = [];
  check('sin reservas no dibuja nada', vm.runInContext('_reservasTiraHtml()', ctx) === '');

  // LA QUE NO RETIENE NADA, DIBUJADA. No basta con que _reservasActivas la
  // marque: si la tira no lo pinta, Jose vuelve a ver el mismo hueco.
  ctx.materialLocks = [
    { id:'V1', matId:'WINDOW|||EVELYN A QUINONEZ', category:'SCREEN',
      name:'EVELYN A QUINONEZ', rack:'B', reason:'Si',
      lockedBy:'joseisrael5101@gmail.com', lockedAt:'09/05/2026 17:06', allowedDest:[] }
  ];
  const vacio = vm.runInContext('_reservasTiraHtml()', ctx);
  check('la fila vacía se dibuja, no se esconde', vacio.indexOf('EVELYN A QUINONEZ') !== -1);
  check('...con un 0 visible, no con un hueco', /class="resv-qty[^"]*">0 UNIT/.test(vacio), vacio);
  check('...marcada como que no retiene nada', vacio.indexOf('resv-vacia') !== -1);
  check('...y diciendo POR QUÉ, en el sitio del motivo',
        vacio.indexOf('no stock recorded for this material anywhere') !== -1);
  check('la cabecera avisa de cuántas no retienen nada',
        /1 holds nothing/.test(vacio), vacio.slice(0, 900));

  /* ── 6d. Y AHORA SE PUEDE ARREGLAR ───────────────────────────────────────
   * Jose, 2026-09-21: "no veo solución para el material EVELYN A QUINONEZ,
   * ¿por qué sigue en hold y por qué no lo puedo borrar? ¿Qué propósito tiene
   * ponerle una advertencia?"
   *
   * Ninguno. El único botón de soltar vivía DENTRO del cajón del estante, en la
   * fila del material — y una reserva que no retiene nada no tiene fila ahí. El
   * aviso describía el problema y no daba salida. Estas cuatro comprobaciones
   * son la salida, y están aquí para que nadie la vuelva a quitar. */
  check('cada fila trae su propio botón de soltar',
        vacio.indexOf('data-action="unlock-material"') !== -1);
  check('...con la reserva concreta, no con el material',
        /data-lock-id="V1"/.test(vacio), vacio);
  check('...y el botón vive FUERA del botón de abrir el estante',
        vacio.indexOf('</button><button class="resv-soltar"') !== -1);
  check('y la cabecera ofrece soltar de golpe las que no retienen nada',
        vacio.indexOf('data-action="release-empty"') !== -1 &&
        /Release the 1 holding nothing/.test(vacio));

  // QUIEN NO PUEDE, NO VE EL BOTÓN. El servidor exige ADMIN en las dos puertas;
  // pintarle a un WAREHOUSE un botón que sólo le puede devolver un error es
  // peor que no pintarlo.
  ctx.userRole = 'WAREHOUSE';
  const sinPermiso = vm.runInContext('_reservasTiraHtml()', ctx);
  check('un WAREHOUSE no ve el botón de soltar',
        sinPermiso.indexOf('data-action="unlock-material"') === -1);
  check('...ni el de soltar de golpe',
        sinPermiso.indexOf('data-action="release-empty"') === -1);
  check('...pero sigue viendo la reserva y su aviso',
        sinPermiso.indexOf('EVELYN A QUINONEZ') !== -1 &&
        sinPermiso.indexOf('holds nothing') !== -1);
  check('...y su fila no deja el hueco de la columna que no hay',
        sinPermiso.indexOf('resv-row-wrap sin-accion') !== -1);
  ctx.userRole = 'ADMIN';
}

/* ── 6e. SOLTAR DE GOLPE: UNA LLAMADA, Y NOMBRANDO LO QUE SE SUELTA ─────────
 *
 * Jose: "¿y cuándo tenga 10 cosas así?" Diez llamadas de una en una son diez
 * viajes al servidor. Y como soltar no se deshace —hay que volver a apartar a
 * mano, con su motivo— lo que se va a soltar se LEE antes de soltarlo. */
{
  const ctx = {
    console,
    _normKey: s2 => String(s2 || '').toUpperCase().trim().replace(/\s+/g, ' '),
    userRole: 'ADMIN',
    stockData: { 'HAY': { unit:'UNIT', warehouseLocs:{ A1A: 12 } } },
    materialLocks: [
      { id:'V1', matId:'NADA1', category:'C', name:'EVELYN A QUINONEZ', rack:'B',
        reason:'Si', lockedBy:'j@x.com', lockedAt:'', allowedDest:[] },
      { id:'V2', matId:'NADA2', category:'C', name:'KOTTER RESIDENCE', rack:'B',
        reason:'', lockedBy:'j@x.com', lockedAt:'', allowedDest:[] },
      { id:'OK', matId:'HAY',   category:'C', name:'MH 159', rack:'A1A',
        reason:'Ordered wrong', lockedBy:'j@x.com', lockedAt:'', allowedDest:[] }
    ],
    showToast: () => {},
    confirmado: null
  };
  ctx._showConfirm = function(o){ ctx.confirmado = o; };
  ctx._doUnlockMany = function(ids){ ctx.soltadas = ids; };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(HTML, ['releaseEmptyReservationsConfirm'],
                             { dobles: ['_normKey', '_showConfirm', '_doUnlockMany',
                                        'showToast'] }), ctx);

  vm.runInContext('releaseEmptyReservationsConfirm()', ctx);
  check('propone soltar SÓLO las que no retienen nada',
        /Release 2 reservations holding nothing\?/.test(ctx.confirmado.title),
        ctx.confirmado && ctx.confirmado.title);
  check('...nombrándolas una por una, no "2 reservations"',
        ctx.confirmado.message.indexOf('EVELYN A QUINONEZ @ B') !== -1 &&
        ctx.confirmado.message.indexOf('KOTTER RESIDENCE @ B') !== -1);
  check('...y sin arrastrar la que sí retiene material',
        ctx.confirmado.message.indexOf('MH 159') === -1);
  check('...diciendo que no cambia ninguna cantidad',
        /changes no quantity/.test(ctx.confirmado.message));
  check('...y que volver atrás es apartar otra vez a mano',
        /reserve it again/.test(ctx.confirmado.message));
  check('no suelta nada hasta que se confirma', ctx.soltadas === undefined);
  ctx.confirmado.onConfirm();
  check('al confirmar manda las dos de un tirón, en UNA llamada',
        Array.isArray(ctx.soltadas) && ctx.soltadas.length === 2 &&
        ctx.soltadas.indexOf('V1') !== -1 && ctx.soltadas.indexOf('V2') !== -1,
        ctx.soltadas);

  // Y si no hay ninguna vacía no abre un diálogo vacío: lo dice y se acaba.
  ctx.materialLocks = ctx.materialLocks.filter(l => l.id === 'OK');
  ctx.confirmado = null;
  vm.runInContext('releaseEmptyReservationsConfirm()', ctx);
  check('sin ninguna vacía no abre diálogo', ctx.confirmado === null);
}

/* ── 6f. EL SERVIDOR DE SOLTAR VARIAS ──────────────────────────────────────
 * Mismo permiso, misma marca, y UNA línea de auditoría POR RESERVA: cuando
 * alguien pregunte dentro de seis meses por qué se soltó ésta en concreto, la
 * respuesta tiene que estar en su propia línea, no en un "soltó diez". */
{
  const src = A.sinComentarios(A.fnSrc(GS, 'unlockMaterials'));
  check('exige ADMIN, igual que soltar una', /requireAuth_\('ADMIN'\)/.test(src));
  check('sólo toca las que siguen activas', /!==\s*'ACTIVE'/.test(src));
  check('marca quién y cuándo, como unlockMaterial',
        /'Removed', auth\.email/.test(src));
  check('deja una línea de auditoría por reserva, dentro del bucle',
        /for \([\s\S]*auditLog_\(ss, 'UNLOCK_MATERIAL'[\s\S]*\}/.test(src));
  check('tira la caché de candados para que los demás lo vean',
        /remove\('materialLocksV1'\)/.test(src));
  check('una lista vacía es un error, no un no-op silencioso',
        /No reservations were selected/.test(src));
  check('que alguna ya estuviera suelta NO es un error',
        /alreadyGone/.test(src) && !/throw[\s\S]{0,120}already/i.test(src));
  check('y está enrutada', /action === 'unlockMaterials'/.test(A.sinComentarios(GS)));
  check('...y avisa a las demás sesiones, como soltar una',
        /unlockMaterials:\s*true/.test(A.sinComentarios(GS)));
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

/* ── 6g. EL ANCHO DE LAS COLUMNAS ESTÁ EN PÍXELES ──────────────────────────
 *
 * Ésta es la mitad que no se puede ejecutar, y es justo la que Jose vio: con
 * `grid-template-columns:auto …` la columna del estante mide lo que mida el
 * nombre de estante más largo DE LA LISTA, así que añadir una reserva mueve
 * todas las demás. La escalera de tamaños de arriba no arregla eso: por muy
 * bien que se encoja el texto, la rejilla sigue bailando.
 *
 * Se mira sobre el bloque .resv-row concreto, no sobre el archivo, porque el
 * archivo tiene cuarenta rejillas y cualquiera de ellas daría un falso verde. */
{
  const css   = A.sinComentarios(HTML);
  const i     = css.indexOf('.resv-row{');
  const bloque = i === -1 ? '' : css.slice(i, css.indexOf('}', i));
  const cols  = /grid-template-columns:([^;}]+)/.exec(bloque);
  check('la fila de reservas define sus columnas', !!cols, bloque.slice(0, 200));
  check('...y ninguna es `auto` — ahí es donde bailaban',
        !!cols && cols[1].indexOf('auto') === -1, cols && cols[1]);
  check('...el estante y la cantidad miden lo mismo tenga la tira 1 fila o 100',
        !!cols && (cols[1].match(/\d+px/g) || []).length >= 2, cols && cols[1]);
  check('...y lo que se parte en dos líneas se para a las dos',
        /-webkit-line-clamp:2/.test(css));
  check('el botón de soltar tiene su propia columna fija, no empuja al texto',
        /\.resv-row-wrap\{[^}]*grid-template-columns:minmax\(0,1fr\) \d+px/.test(css));
}

check('y no se añadió ninguna pestaña nueva al topbar',
      (htmlLimpio.match(/class="nav-btn"|id="btn-[a-z]+"/g) || []).join(' ').indexOf('reserv') === -1);
// Una sola familia de funciones calcula. Si aparece una quinta, es que alguien
// volvió a contar por su cuenta en alguna pantalla.
const fuentes = (htmlLimpio.match(/function _reservas[A-Za-z]*\(/g) || []);
check('las funciones de reservas del navegador son exactamente 4', fuentes.length === 4, fuentes);

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
process.exit(fail ? 1 : 0);
