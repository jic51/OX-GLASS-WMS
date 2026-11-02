// PONERLE PRECIO A LO QUE YA ESTÁ EN LA ESTANTERÍA.
//
// Jose, 3/11: OX quiere el valor del inventario utilizado cada mes, empezando
// por el FLASHING. *"No sé si podemos asignar valores de precio a los
// materiales luego de hacer un ingreso."*
//
// Hasta la v13.6, no. La hoja PACKS guarda **el precio de la PRÓXIMA entrada**,
// y el promedio de un material sólo se movía cuando entraba mercancía con
// precio. Así que lo que ya estaba en el almacén no valía nada, y sus salidas
// se escribían con el coste en blanco — **sin avisar**. El informe del mes
// salía bajo y nada decía por qué.
//
// ── QUÉ SUJETA ESTA PRUEBA ─────────────────────────────────────────────────
//
// Tres cosas, y las tres pueden romperse en silencio:
//
//   1 · que el 0 NO se pueda guardar. «Gratis» y «no lo sé» se escriben igual
//       de fácil, y el motor trata el 0 como «sin precio»: aceptarlo sería
//       dejar guardar algo que no hace nada y parece que sí.
//   2 · que escriba en el MISMO sitio que lee el motor de costes (el promedio),
//       y no en una columna nueva que sería un segundo dueño del dato.
//   3 · que la pantalla diga cuántos materiales se quedan SIN precio. Ese
//       contador es la mitad del trabajo: sin él, el mes sale bajo en silencio.
//
// Uso:  node tools/test-precio-al-material.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

const RAIZ = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

function fnSrc(src, nombre) {
  const ini = src.indexOf('function ' + nombre + '(');
  if (ini === -1) throw new Error('no encontrada: ' + nombre);
  let prof = 0;
  for (let j = src.indexOf('{', ini); j < src.length; j++) {
    if (src[j] === '{') prof++;
    else if (src[j] === '}') { prof--; if (prof === 0) return src.slice(ini, j + 1); }
  }
  throw new Error('sin cerrar: ' + nombre);
}

console.log('\n═══ 1. el servidor, ejecutado ═══\n');

/* Lo escrito en la hoja se recoge aquí para poder mirarlo después. */
let escrito = null, auditado = null;
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: function () { return { nombre: 'ss' }; } },
  Logger: { log: function () {} },
  requireAuth_:  function () { return { email: 'jose@x.com', role: 'ADMIN' }; },
  requirePerm_:  function () {},
  canSeeCosts_:  function () { return true; },
  loadConfig:    function () { return { avgCost: { 'FLASHING|||DRIP EDGE': { category: 'FLASHING', name: 'DRIP EDGE', avg: 9 } } }; },
  saveAvgCostUpdates_: function (ss, touched, mapa) { escrito = { touched: touched, mapa: mapa }; },
  auditLog_: function (ss, accion, quien, detalle, viejo, nuevo) {
    auditado = { accion: accion, quien: quien, detalle: detalle, viejo: viejo, nuevo: nuevo };
  }
};
const DOBLES = ['requireAuth_','requirePerm_','canSeeCosts_','loadConfig',
                'saveAvgCostUpdates_','auditLog_'];
const M = A.montar(ctx, GS, ['setMaterialPrice'], { dobles: DOBLES });
const poner = M.setMaterialPrice;

function intento(data) {
  escrito = null; auditado = null;
  try { return { res: poner(data, null) }; }
  catch (e) { return { err: e.message }; }
}

const bien = intento({ category: 'FLASHING', name: 'FLASHING TAPE 6"', price: 12.345 });
check('un precio normal se guarda', bien.res && bien.res.status === 'success', bien);
check('...redondeado a dos decimales, que es lo que se enseña',
  bien.res && bien.res.avg === 12.35, bien.res && bien.res.avg);
/* La clave NO se escribe a mano aquí: `getMaterialId` normaliza (las comillas
 * de «6"» se vuelven `_`, entre otras cosas), y una clave copiada sería otra
 * pareja que tiene que coincidir sin que nada lo obligue. Se usa la que
 * devolvió la propia función. */
const clave = bien.res && bien.res.matId;
check('...y en el promedio, que es lo que el motor de costes YA lee',
  !!escrito && !!clave && !!escrito.mapa[clave], { clave: clave, escrito: escrito });
check('...bajo una sola clave, la del material',
  Object.keys(escrito.mapa).length === 1 && Object.keys(escrito.touched).length === 1);
check('...con su categoría y su nombre, no sólo el número',
  escrito.mapa[clave].category === 'FLASHING' &&
  escrito.mapa[clave].name === 'FLASHING TAPE 6"', escrito.mapa[clave]);
check('...y `touched` apunta al mismo material que el mapa de valores',
  Object.keys(escrito.touched)[0] === clave);

console.log('\n  — el 0 y lo que no es un número —\n');

/* EL 0 ES EL CASO QUE IMPORTA. El motor trata 0 como «sin precio», así que
 * guardarlo deja al material exactamente igual de sin valorar que antes, pero
 * con la pantalla diciendo que ya tiene precio. Un informe que miente. */
check('un 0 no se guarda', !!intento({ category: 'FLASHING', name: 'X', price: 0 }).err);
check('...y lo dice en vez de callarse',
  /greater than zero/i.test(intento({ category: 'FLASHING', name: 'X', price: 0 }).err));
check('un negativo tampoco', !!intento({ category: 'FLASHING', name: 'X', price: -5 }).err);
check('ni un texto', !!intento({ category: 'FLASHING', name: 'X', price: 'doce' }).err);
check('ni un vacío', !!intento({ category: 'FLASHING', name: 'X', price: '' }).err);
check('y ninguno de esos llegó a escribir nada', escrito === null);

check('sin categoría no se guarda', !!intento({ name: 'X', price: 5 }).err);
check('sin material tampoco', !!intento({ category: 'FLASHING', price: 5 }).err);

console.log('\n  — quién puede, y el rastro —\n');

/* Quien no puede VER precios tampoco los pone: si no, alguien sin acceso al
 * dinero podría mover el valor del almacén entero sin poder leer el daño. */
/* Un contexto NUEVO, no una copia del de arriba: `montar` instala en el
 * contexto lo que levanta, así que copiar el ya usado traería las funciones de
 * verdad y el andamio —con razón— se negaría. */
const ctxSinCostes = {
  SpreadsheetApp: ctx.SpreadsheetApp,
  Logger: { log: function () {} },
  requireAuth_:  function () { return { email: 'ana@x.com', role: 'WAREHOUSE' }; },
  requirePerm_:  function () {},
  canSeeCosts_:  function () { return false; },
  loadConfig:    function () { return { avgCost: {} }; },
  saveAvgCostUpdates_: function () { escrito = 'NO DEBERÍA HABER ESCRITO'; },
  auditLog_:     function () {}
};
const sinCostes = A.montar(ctxSinCostes, GS, ['setMaterialPrice'], { dobles: DOBLES }).setMaterialPrice;
let negado = null;
escrito = null;
try { sinCostes({ category: 'FLASHING', name: 'X', price: 5 }, null); }
catch (e) { negado = e.message; }
check('quien no puede ver precios no puede ponerlos', !!negado, negado);
check('...y no llegó a escribir nada', escrito === null, escrito);

intento({ category: 'FLASHING', name: 'DRIP EDGE', price: 11 });
check('queda en el registro de auditoría',
  auditado && auditado.accion === 'MATERIAL_PRICE_SET', auditado);
check('...con el número de antes y el de después, que es lo que se audita',
  auditado.viejo === '9' && auditado.nuevo === '11', auditado);
check('...y con quién lo hizo', auditado.quien === 'jose@x.com');

const nuevoMat = intento({ category: 'FLASHING', name: 'ALGO NUEVO', price: 3 });
check('un material que no tenía precio no inventa uno anterior',
  nuevoMat.res.previous === null, nuevoMat.res);

console.log('\n═══ 2. la pantalla, en el orden que pidió Jose ═══\n');

check('hay una pestaña de precios en Ajustes',
  /data-tab="prices"/.test(HTML) && /switchSettingsTab\('prices'\)/.test(HTML));
check('...y está enganchada a su pintor',
  /tab === 'prices'[\s\S]{0,60}_renderPricesTab\(\)/.test(HTML));

const pintar = fnSrc(HTML, '_renderPricesTab');
check('1 · primero pide la CATEGORÍA', /priceCatSel/.test(pintar) && /config\.categories/.test(pintar));

const cuerpo = fnSrc(HTML, '_preciosPintarCuerpo');
check('2 · luego deja BUSCAR en la lista', /priceSearchInp/.test(cuerpo));
const filtrar = fnSrc(HTML, '_preciosFiltrar');
check('...y el buscador filtra de verdad por nombre',
  /indexOf\(q\)/.test(filtrar));
check('3 · la UNIDAD se enseña al lado del precio',
  /per ' \+ _he\(m\.unit\)/.test(filtrar), filtrar.slice(0, 200));
check('4 · y el PRECIO se escribe en la propia fila', /class="price-inp"/.test(filtrar));

/* LA UNIDAD SE ENSEÑA, NO SE ELIGE. Si esta pantalla dejara elegir otra unidad
 * habría dos unidades para el mismo material y nada que obligara a que
 * coincidieran. Un precio por caja va por los paquetes, que ya hacen esa
 * cuenta. Esto lo sujeta: que no aparezca un selector de unidad aquí. */
check('la unidad NO es un desplegable que pueda discrepar del material',
  !/<select[^>]*unit/i.test(filtrar) && !/priceUnitSel/.test(HTML), 'hay un selector de unidad');

console.log('\n  — el contador, que es la mitad del trabajo —\n');

check('la pantalla dice cuántos tienen precio y cuántos son',
  /conPrecio \+ ' of ' \+ lista\.length/.test(cuerpo), cuerpo.slice(0, 300));
check('...y qué significa quedarse sin precio, no sólo el número',
  /counted as worth nothing/.test(cuerpo));
check('...y cuando están todos, lo dice también',
  /Every movement out of this category is valued/.test(cuerpo));

console.log('\n  — guardar —\n');

const guardar = fnSrc(HTML, '_guardarPrecio');
check('llama a la acción del servidor', /'setMaterialPrice'/.test(guardar));
check('el 0 se para también aquí, antes de salir a la red',
  /val <= 0/.test(guardar));
check('la copia del navegador se pone al día con lo que CONTESTÓ el servidor',
  /config\.avgCost\[res\.matId\]/.test(guardar) && /res\.avg/.test(guardar));
check('...y no con lo tecleado, que el servidor redondea',
  !/config\.avgCost\[[^\]]*\]\s*=\s*\{[^}]*avg:\s*val/.test(guardar));
check('se repinta el contador, no sólo la fila', /_preciosPintarCuerpo\(\)/.test(guardar));
check('...conservando lo escrito en el buscador',
  /priceSearchInp/.test(guardar));

console.log('\n═══ 3. y está abierta en Básico, a propósito ═══\n');

/* Jose, 3/11: *"tienes razón, sería un buen feature para algo básico"*. Poner
 * precios no necesita ningún permiso extra de Google, así que no hay motivo
 * técnico para cerrarlo — y un almacén que no puede valorar lo que tiene es un
 * almacén al que le falta la mitad. */
check('la pestaña de precios no está en la lista de lo que Básico no lleva',
  !/BASIC_PRO_AJUSTES\s*=\s*\{[^}]*prices/.test(HTML));
check('ni el servidor la niega en Básico',
  !/basicNiega_[\s\S]{0,80}setMaterialPrice/.test(GS) &&
  !/function setMaterialPrice[\s\S]{0,700}basicNiega_/.test(GS));

/* Y quien no puede ver precios se encuentra una explicación, no una pantalla
 * vacía que parece rota. */
check('a quien no puede ver precios se le explica por qué',
  /_canSeeCosts\(\)/.test(pintar) && /Permissions/.test(pintar));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Un material sin precio sale del almacén con el coste en\n' +
                '  blanco, y el informe del mes sale bajo sin que nada lo diga.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
