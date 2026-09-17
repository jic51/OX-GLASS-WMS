// EL MAZO DICE 4 Y TIENE 6 TARJETAS. Y ABRE ENSEÑANDO LA MÁS VIEJA.
//
// Jose, 2026-09-17, en video: "el número en las tarjetas (4) no coincide con la
// cantidad de tarjetas mostradas". Y antes, del mismo mazo: "al abrir el mazo
// debe quedarse abajo para mostrar la última, no la primera".
//
// Son dos fallos distintos en el mismo trozo de pantalla, y los dos son de la
// misma clase: algo que se construye con TRES piezas y se mide con dos.
//
// ── 1. El contador ───────────────────────────────────────────────────────────
//
//     deck.innerHTML = _sysDeckHtml + _cfgDeckHtml + _todoDeckHtml;   // tres
//     ...
//     var total = _cfgDeckTotal + _sysDeckTotal;                      // dos
//
// Faltaban las naranjas — "llegó y nadie registró la entrada". Nacieron así:
// cuando se añadieron, se actualizó el contador de la campana (_syncCfgBell) y
// se olvidó el del mazo. Resultado: la campana y el mazo se contradecían entre
// sí, en la misma pantalla, al mismo tiempo.
//
// Esto ya había pasado ANTES con otra de las tres clases y por eso existe
// test-bell-count.js. Aquel archivo protege la campana. Éste protege el mazo, y
// además ATA LOS DOS CONTADORES ENTRE SÍ: si mañana aparece una cuarta clase de
// tarjeta y sólo uno de los dos la suma, esto se pone rojo aunque cada contador
// por separado sea coherente consigo mismo.
//
// ── 2. El scroll ─────────────────────────────────────────────────────────────
//
// La tarjeta más nueva es la ÚLTIMA del DOM, o sea la de abajo. Desde la v11.98
// el mazo tiene tope de altura y barra propia, y un contenedor con scroll abre
// en scrollTop 0 — arriba — o sea enseñando la MÁS VIEJA.
//
// LO QUE ESTE ARCHIVO MIDE DE VERDAD, y es lo que justifica el bucle de
// _deckAnclarFondo: que un solo empujón NO alcanza. El abanico se despliega con
// transición, así que scrollHeight sigue creciendo casi un segundo después del
// clic. El DOM de mentira de aquí abajo hace crecer scrollHeight cuadro a
// cuadro justo para eso: si alguien cambia el bucle por una línea suelta, esta
// prueba lo ve. Una que midiera scrollHeight fijo pasaría con el código roto.
//
// Uso:  node tools/test-mazo-contador.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(name){
  const start = HTML.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = HTML.indexOf('{', start); j < HTML.length; j++) {
    if (HTML[j] === '{') depth++;
    else if (HTML[j] === '}') { depth--; if (depth === 0) return HTML.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// Sin comentarios. Las dos sumas se buscan en el CÓDIGO, y este archivo entero
// nombra las variables que busca: sin esto, la prueba encontraría sus propias
// explicaciones. Ya pasó una vez con una regla de CSS.
function sinComentarios(s){
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

// ── El DOM de mentira ────────────────────────────────────────────────────────
//
// TRES cosas que tiene que imitar bien, y cada una atrapó un fallo distinto:
//
//  1. scrollHeight NO es constante mientras el mazo está abierto: crece cuadro
//     a cuadro hasta el tope. Es el abanico desplegándose. Sin esto, un solo
//     empujón al abrir pasaría la prueba y en pantalla dejaría el scroll a
//     media altura.
//
//  2. clientHeight se TOPA. El scroll de este mazo existe sólo por el tope de
//     altura de la v11.98; por debajo del tope no hay nada que bajar.
//
//  3. CERRADO, la caja mide MUCHO MENOS que su contenido, por los márgenes
//     negativos del colapso y de la tarjeta que se va. Los números de aquí
//     abajo son los medidos de verdad en el navegador con test-topbar-deck
//     (clientHeight 38, scrollHeight 143). Para el navegador eso es desborde;
//     un scrollTop ahí arrastra la pila 105px y la esquina de la tarjeta de
//     adelante salta. Esa versión existió y esta prueba es la que la vio.
//
// Y scrollTop se recorta como en un navegador de verdad. Un scrollTop que
// aceptara cualquier número habría dejado pasar el fallo 3 igualmente.
const TOPE          = 577;   // ≈ calc(66.6vh - 22px) en una ventana de 900
const ALTO_CERRADO  = 143;   // lo que PINTA la pila colapsada
const CAJA_CERRADA  =  38;   // lo que MIDE la caja colapsada
const ALTO_ABIERTO  = 900;

function nuevoMazo(){
  const clases = new Set();
  const m = {
    _html: '',
    _scrollTop: 0,
    _crec: 200,
    oyentes: {},
    badges: [],
    maxHeight: TOPE + 'px',
    get scrollHeight(){
      return clases.has('open') ? m._crec : ALTO_CERRADO;
    },
    // El abanico avanza UN cuadro. Lo llama el reloj de abajo, no el getter: si
    // crecer fuera efecto de leer scrollHeight, cada lectura extra del código
    // adelantaría el abanico y la prueba mediría su propio andamio.
    _cuadro(){ if (clases.has('open')) m._crec = Math.min(ALTO_ABIERTO, m._crec + 100); },
    // _saliendo = una tarjeta en pleno .leaving, con su margen negativo. La
    // caja se encoge de golpe mientras el contenido sigue pintando lo mismo.
    // Pasa CON EL MAZO ABIERTO, que es cuando el bucle está corriendo.
    _saliendo: false,
    get clientHeight(){
      if (m._saliendo) return CAJA_CERRADA;
      if (!clases.has('open')) return CAJA_CERRADA;
      return Math.min(TOPE, m._crec);
    },
    set scrollTop(v){
      const max = Math.max(0, m.scrollHeight - m.clientHeight);
      m._scrollTop = Math.max(0, Math.min(Number(v) || 0, max));
    },
    get scrollTop(){ return m._scrollTop; },
    classList: {
      add: c => clases.add(c),
      remove: c => clases.delete(c),
      contains: c => clases.has(c),
      toggle: (c, on) => { if (on) clases.add(c); else clases.delete(c); return on; }
    },
    set innerHTML(v){ m._html = String(v); },
    get innerHTML(){ return m._html; },
    querySelectorAll(sel){
      // Cuenta de verdad. Una lista siempre vacía dejaría pasar el fallo del
      // contador, que es justo lo que esta prueba existe para ver.
      const clase = sel.replace(/^\./, '');
      const re = new RegExp('class="[^"]*\\b' + clase.replace(/[-]/g, '\\-') + '\\b', 'g');
      const n = (m._html.match(re) || []).length;
      const arr = [];
      for (let i = 0; i < n; i++) arr.push({ style:{ setProperty(){} }, classList:{ add(){}, remove(){} },
                                             getAttribute: () => 'id' + i, addEventListener(){} });
      return arr;
    },
    get lastElementChild(){
      if (!m._html) return null;
      return { appendChild: b => m.badges.push(b) };
    },
    addEventListener(ev, fn){ (m.oyentes[ev] = m.oyentes[ev] || []).push(fn); },
    _reset(){ m._crec = 200; m.badges = []; m._scrollTop = 0; m._saliendo = false; }
  };
  return m;
}

// ── Reloj y cuadros, a mano ──────────────────────────────────────────────────
let ahora = 0;
const cola = [];
function correrCuadros(n, msPorCuadro){
  for (let i = 0; i < n; i++){
    ahora += (msPorCuadro === undefined ? 16 : msPorCuadro);
    mazo._cuadro();
    const pend = cola.splice(0, cola.length);
    pend.forEach(f => f());
  }
}

const mazo = nuevoMazo();

const ctx = {
  console,
  document: {
    getElementById: id => (id === 'cornerDeck' ? mazo : null),
    createElement: () => ({ className:'', title:'', textContent:'', appendChild(){} }),
    documentElement: { classList: { toggle(){}, add(){}, remove(){}, contains: () => false } },
    addEventListener(){}
  },
  window: { getComputedStyle: el => ({ maxHeight: el.maxHeight }) },
  requestAnimationFrame: fn => { cola.push(fn); return cola.length; },
  cancelAnimationFrame: () => { cola.length = 0; },
  Date: { now: () => ahora },
  // Dobles: nada de esto es lo que se está midiendo.
  _dismissSysCard(){}, _todoDrop(){}, _todoDo(){}, _openSystemActivity(){},
  _cfgAddAll(){}, _cfgCardAction(){}, _cfgWake(){}, _cfgScheduleDim(){},
  _CFG_REDIM_MS: 1,
  _deckSeenIds: {},
  _cfgDeckHtml: '', _sysDeckHtml: '', _todoDeckHtml: '',
  _cfgDeckTotal: 0, _sysDeckTotal: 0, _todoDeckTotal: 0,
  _deckHover: false, _deckPinned: false, _deckLeaveTimer: null
};
vm.createContext(ctx);
vm.runInContext([
  'var _DECK_FAN_MS, _DECK_STEP_MS, _deckPinRaf = null, _deckPinHasta = 0, _DECK_LEAVE_MS;',
  fnSrc('_paintDeck'),
  fnSrc('_deckTopado'),
  fnSrc('_deckSoltarFondo'),
  fnSrc('_deckAnclarFondo'),
  fnSrc('_deckApply'),
  fnSrc('_deckEnter'),
  fnSrc('_deckLeave'),
  fnSrc('_deckTogglePin'),
  // El enganche de oyentes es un IIFE en el archivo; aquí se levanta como
  // función y se llama a mano. Tiene que venir DEL ARCHIVO: el oyente de rueda
  // que suelta el anclaje es parte de lo que se está midiendo, y una prueba que
  // lo fingiera no estaría midiendo nada.
  fnSrc('_wireCfgDeckFade'),
  // Las constantes se leen DEL ARCHIVO. Copiarlas a mano aquí sería exactamente
  // la clase de copia que se queda vieja sin avisar.
  /^var _DECK_FAN_MS\s*=.*$/m.exec(sinComentarios(HTML) ? HTML : HTML)[0],
  /^var _DECK_STEP_MS\s*=.*$/m.exec(HTML)[0],
  '_wireCfgDeckFade();'
].join('\n'), ctx);

const carta = (clase, n) => Array.from({length:n},
  (_, i) => '<div class="deck-card ' + clase + '" data-card-id="' + clase + i + '"></div>').join('');

console.log('\n── 1. El contador suma LAS TRES clases ──');

function pintarCon(sys, cfg, todo){
  ctx._sysDeckHtml  = carta('sys-card',  sys);
  ctx._cfgDeckHtml  = carta('cfg-card',  cfg);
  ctx._todoDeckHtml = carta('todo-card', todo);
  ctx._sysDeckTotal = sys; ctx._cfgDeckTotal = cfg; ctx._todoDeckTotal = todo;
  mazo._reset();
  mazo.classList.remove('open');
  vm.runInContext('_paintDeck()', ctx);
  return { badge: mazo.badges.length ? Number(mazo.badges[0].textContent) : null,
           tarjetas: mazo.querySelectorAll('.deck-card').length };
}

// EL CASO DEL VIDEO: cuatro notificaciones y dos naranjas. Decía 4.
let r = pintarCon(4, 0, 2);
check('4 sys + 2 todo → 6 tarjetas', r.tarjetas === 6, r);
check('...y la insignia dice 6, no 4', r.badge === 6, r);

r = pintarCon(0, 0, 3);
check('sólo naranjas: 3 tarjetas → insignia 3', r.badge === 3 && r.tarjetas === 3, r);

r = pintarCon(2, 3, 4);
check('las tres clases mezcladas: 9 → insignia 9', r.badge === 9 && r.tarjetas === 9, r);

r = pintarCon(1, 0, 0);
check('una sola tarjeta no lleva insignia', r.badge === null, r);

// El mazo recorta cuánto mete en el DOM (slice(0,5) en las naranjas), así que
// la insignia tiene que seguir contando el TOTAL, no lo que se ve. Se simula
// con más total que HTML.
ctx._sysDeckHtml = ''; ctx._cfgDeckHtml = ''; ctx._todoDeckHtml = carta('todo-card', 5);
ctx._sysDeckTotal = 0; ctx._cfgDeckTotal = 0; ctx._todoDeckTotal = 12;
mazo._reset(); mazo.classList.remove('open');
vm.runInContext('_paintDeck()', ctx);
check('con 12 pendientes y 5 en pantalla, la insignia dice 12',
      Number(mazo.badges[0].textContent) === 12, mazo.badges[0].textContent);

console.log('\n── 2. Los dos contadores cuentan LO MISMO ──');
//
// No comparan las mismas variables (el mazo usa _cfgDeckTotal, la campana usa
// _pendingCfgAdds.length) pero tienen que representar las mismas tres cosas.
// Si aparece una cuarta clase, esto se cae aunque cada suma sea coherente.
const sumaMazo    = sinComentarios(fnSrc('_paintDeck'))
                      .match(/var total\s*=\s*([^;]+);/)[1];
const sumaCampana = sinComentarios(fnSrc('_syncCfgBell'))
                      .match(/var total\s*=\s*([^;]+);/)[1];
const piezas = s => (s.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [])
                      .filter(x => x !== 'length').sort();
check('el mazo suma tres piezas', piezas(sumaMazo).length === 3, sumaMazo);
check('la campana suma tres piezas', piezas(sumaCampana).length === 3, sumaCampana);
check('el mazo cuenta las naranjas', /_todoDeckTotal/.test(sumaMazo), sumaMazo);
check('la campana cuenta las naranjas', /_todoDeckTotal/.test(sumaCampana), sumaCampana);
check('los dos suman el mismo número de piezas',
      piezas(sumaMazo).length === piezas(sumaCampana).length,
      { mazo: sumaMazo, campana: sumaCampana });

console.log('\n── 3. Abrir el mazo lo deja ABAJO ──');

// CIERRA PRIMERO, siempre. _deckAnclarFondo sólo se dispara en el FLANCO de
// apertura, así que una segunda llamada sobre un mazo que ya estaba abierto no
// ancla nada — y las comprobaciones de abajo pasarían sin que el código hiciera
// nada. La primera versión de esta prueba tenía justo ese agujero.
function abrir(){
  vm.runInContext('_deckHover = false; _deckPinned = false; _deckApply();', ctx);
  if (mazo.classList.contains('open')) throw new Error('abrir(): el mazo no se cerró antes');
  cola.length = 0;
  mazo._reset();
  mazo.scrollTop = 0;
  vm.runInContext('_deckHover = true; _deckApply();', ctx);
}

abrir();
check('al abrir, el mazo está marcado open', mazo.classList.contains('open'));
check('mientras el abanico todavía cabe entero, no se toca el scroll',
      mazo.scrollTop === 0, mazo.scrollTop);

correrCuadros(6);
const mitad = mazo.scrollTop;
check('en cuanto el abanico llega al tope, empieza a bajar', mitad > 0, mitad);

correrCuadros(12);
const fondo = mazo.scrollHeight - mazo.clientHeight;
check('sigue bajando mientras el abanico se despliega',
      mazo.scrollTop > mitad, { mitad, fin: mazo.scrollTop });
check('termina PEGADO al fondo — la tarjeta más nueva a la vista',
      mazo.scrollTop === fondo && fondo > 0, { scrollTop: mazo.scrollTop, fondo });
check('...y ese fondo es el del mazo ABIERTO, no el del cerrado',
      mazo.scrollTop > ALTO_CERRADO, { scrollTop: mazo.scrollTop, cerrado: ALTO_CERRADO });

console.log('\n── 4. El anclaje se suelta solo, y se suelta antes si tocan la rueda ──');

abrir();
correrCuadros(3);
check('el bucle está vivo mientras dura el abanico', cola.length > 0);
correrCuadros(200);          // muy pasado el final del despliegue
check('el bucle se apaga solo al terminar', cola.length === 0, cola.length);

abrir();
correrCuadros(8);
const dondeIba = mazo.scrollTop;
check('el anclaje estaba trabajando antes de tocar la rueda', dondeIba > 0, dondeIba);
check('hay oyente de rueda en el mazo', (mazo.oyentes.wheel || []).length > 0);
(mazo.oyentes.wheel || []).forEach(f => f());
mazo.scrollTop = 5;                       // la persona sube a leer las viejas
correrCuadros(10);
check('tras tocar la rueda el mazo NO vuelve a arrastrar el scroll',
      mazo.scrollTop === 5, { dondeIba, ahora: mazo.scrollTop });

console.log('\n── 5. La pila COLAPSADA no es desborde, aunque el navegador lo diga ──');
//
// EL FALLO QUE CAZÓ test-topbar-deck, con sus números de verdad: caja 38,
// contenido 143. Los márgenes negativos del colapso (y los de una tarjeta
// saliendo) hacen que la caja mida menos que lo que pinta. Bajar el scroll ahí
// arrastra la pila entera 105px y la tarjeta de adelante salta de sitio.
const topado = (c, s, tope) =>
  vm.runInContext('_deckTopado({clientHeight:' + c + ',scrollHeight:' + s + '},' + tope + ')', ctx);
check('pila colapsada (38 de caja, 143 de contenido) → NO se toca', topado(38, 143, TOPE) === false);
check('caja en el tope y contenido de sobra → sí se baja',          topado(TOPE, 900, TOPE) === true);
check('caja por debajo del tope → no hay fondo al que ir',          topado(300, 900, TOPE) === false);
check('caja topada pero sin nada que sobre → no se toca',           topado(TOPE, TOPE, TOPE) === false);
check('sin tope declarado (max-height:none) → no se toca',          topado(38, 143, NaN) === false);

// Y AHORA EL CASO DE VERDAD: el mazo ABIERTO, con el bucle corriendo, y una
// tarjeta encogiéndose al irse. Sin la guarda dentro del bucle, este es el
// cuadro en el que la pila entera pega el tirón. Comprobar _deckTopado suelta
// NO alcanza: mide la regla, no que alguien la use.
abrir();
correrCuadros(10);
const anclado = mazo.scrollTop;
check('el mazo está anclado al fondo antes de que nadie cierre nada', anclado > 0, anclado);
mazo._saliendo = true;                    // alguien pulsa la ✕ de una tarjeta
check('con la tarjeta saliendo, el navegador ve un desborde falso',
      mazo.scrollHeight > mazo.clientHeight && mazo.clientHeight < TOPE,
      { caja: mazo.clientHeight, contenido: mazo.scrollHeight });
correrCuadros(6);
check('el bucle NO arrastra la pila mientras la tarjeta se va',
      mazo.scrollTop === anclado, { antes: anclado, ahora: mazo.scrollTop });
mazo._saliendo = false;

mazo.classList.remove('open');
mazo._scrollTop = 0;
check('cerrado, el navegador SÍ cree que desborda', mazo.scrollHeight > mazo.clientHeight,
      { caja: mazo.clientHeight, contenido: mazo.scrollHeight });
vm.runInContext('_deckHover = false; _deckPinned = false; _deckApply();', ctx);
correrCuadros(30);
check('...y aun así el mazo cerrado se queda donde estaba', mazo.scrollTop === 0, mazo.scrollTop);

console.log('\n── 6. Un repintado no tira al que está leyendo ──');
//
// _paintDeck reescribe innerHTML en CADA refresco de fondo, y eso pone
// scrollTop en 0. Con el mazo abierto y alguien leyendo, sería un salto al
// principio cada vez que se guarda algo en otra pestaña.
ctx._sysDeckHtml = carta('sys-card', 6);
ctx._cfgDeckHtml = ''; ctx._todoDeckHtml = '';
ctx._sysDeckTotal = 6; ctx._cfgDeckTotal = 0; ctx._todoDeckTotal = 0;

mazo.classList.add('open');
mazo.scrollTop = 137;
vm.runInContext('_paintDeck()', ctx);
check('abierto: el repintado respeta dónde iba leyendo', mazo.scrollTop === 137, mazo.scrollTop);

mazo.classList.remove('open');
mazo._scrollTop = 0;
vm.runInContext('_paintDeck()', ctx);
check('cerrado: el repintado no mueve nada', mazo.scrollTop === 0, mazo.scrollTop);

console.log('\n── 7. Las constantes del JS coinciden con las del CSS ──');
//
// _DECK_FAN_MS y _DECK_STEP_MS son copias de --deck-in y --deck-step. Si el CSS
// cambia y el JS no, el anclaje se suelta antes de que el abanico termine y el
// mazo vuelve a abrir a media altura — sin que nada parezca roto.
const cssVars = /--deck-in:\s*([\d.]+)s[^}]*--deck-step:\s*(\d+)ms/.exec(HTML);
check('el CSS declara --deck-in y --deck-step', !!cssVars);
if (cssVars){
  check('_DECK_FAN_MS = --deck-in', ctx._DECK_FAN_MS === Math.round(Number(cssVars[1]) * 1000),
        { js: ctx._DECK_FAN_MS, css: cssVars[1] });
  check('_DECK_STEP_MS = --deck-step', ctx._DECK_STEP_MS === Number(cssVars[2]),
        { js: ctx._DECK_STEP_MS, css: cssVars[2] });
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
process.exit(fail ? 1 : 0);
