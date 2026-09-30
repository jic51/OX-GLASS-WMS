// EL CANARIO QUE NUNCA PUDO CANTAR.
//
// La v12.14 puso un aviso para que el desastre del 26/09 —el archivo entero
// borrado y la app enseñando "No movements match your filters" durante catorce
// horas— no volviera a pasar desapercibido. Estaba escrito así:
//
//     for (var av = 0; av < stock.length; av++) { var s = stock[av]; ... }
//
// `stock` NO ES UN ARRAY. Es un mapa `{ matId: {...} }` — así lo devuelven
// calculateStock y buildStockFromDerivedSheets_, y así lo consume el navegador
// con Object.values. `stock.length` es `undefined`, `0 < undefined` es false, el
// bucle no da ni una vuelta, y la expresión devolvía `false` SIEMPRE.
//
// Diez días con la red puesta y rota. El 29/09 Jose abrió Movements, vio la
// tabla vacía, y la app le enseñó el mismo mensaje educado del 26/09.
//
// ── LO QUE ESTO DICE DE CÓMO SE ESCRIBEN LAS PROTECCIONES ───────────────────
//
// Es el MISMO fallo que writeConfigSnapshot_, que llamaba a openById sobre una
// hoja que el manifiesto no le dejaba abrir y se tragaba el error: dieciséis
// versiones de backups sin configuración, todos con aspecto sano.
//
// Lo que las dos tienen en común no es el descuido. Es que NINGUNA TENÍA PRUEBA.
// Una protección sin prueba no es una protección: es una intención. Y las dos
// veces se descubrió igual — el día que hizo falta.
//
// Por eso esta prueba EJECUTA la expresión del producto en vez de leerla. Una
// comprobación que mirase si el campo `archiveVacioConStock` "está en el código"
// habría pasado en verde los diez días.
//
// Uso:  node tools/test-canario-archivo.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');
const HTML = A.fuente('html');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* LA EXPRESIÓN DEL PRODUCTO, SACADA DEL ARCHIVO, no copiada aquí.
 *
 * Copiarla sería escribir una segunda versión que siempre se da la razón a sí
 * misma — exactamente lo que dejó pasar el fallo original. Se extrae el valor de
 * la clave `archiveVacioConStock:` tal cual está escrito y se evalúa con un
 * `stock` y unos `movements` sembrados. */
function expresionDelCanario() {
  const marca = 'archiveVacioConStock:';
  const i = GS.indexOf(marca);
  if (i === -1) throw new Error('no existe archiveVacioConStock en el producto');
  // Desde el valor hasta el cierre de su paréntesis: se cuenta el balance.
  let j = i + marca.length, prof = 0, arranco = false;
  for (; j < GS.length; j++) {
    const c = GS[j];
    if (c === '(') { prof++; arranco = true; }
    else if (c === ')') { prof--; if (arranco && prof === 0) { j++; break; } }
  }
  return GS.slice(i + marca.length, j).trim();
}

const expr = expresionDelCanario();

function correr(movements, stock) {
  const ctx = { movements, stock };
  vm.createContext(ctx);
  return vm.runInContext('(' + expr + ')', ctx);
}

/** Un material tal como lo devuelve calculateStock: en un MAPA, no en un array. */
function mapa(lista) {
  const out = {};
  lista.forEach(function (m, i) {
    out['cat|||' + i] = { warehouseQty: m[0], siteQty: m[1] };
  });
  return out;
}

console.log('\n═══ 1. El caso del 26 de septiembre ═══\n');
{
  // Archivo vacío, almacén con 5.643 unidades. Es imposible y hay que gritarlo.
  const r = correr([], mapa([[5643, 0], [0, 0]]));
  check('con el archivo vacío y existencias en el almacén, el canario CANTA',
        r === true, r);
}

console.log('\n═══ 2. Lo mismo pero con material en obra ═══\n');
{
  const r = correr([], mapa([[0, 4504]]));
  check('también cuenta lo que está en obra, no sólo lo del almacén', r === true, r);
}

console.log('\n═══ 3. Los casos en los que NO debe cantar ═══\n');
{
  check('con movimientos, calla aunque haya existencias',
        correr([{}], mapa([[5643, 0]])) === false);
  check('sin movimientos y sin existencias, calla — una instalación nueva ' +
        'está legítimamente vacía',
        correr([], mapa([[0, 0]])) === false);
  check('sin movimientos y sin materiales, calla', correr([], {}) === false);
}

console.log('\n═══ 4. La forma del dato, que es donde estaba el fallo ═══\n');
{
  /* La comprobación que habría ahorrado diez días: que la expresión recorra un
   * MAPA. Si alguien vuelve a escribirla como si `stock` fuera un array, esto se
   * pone rojo aunque los casos de arriba parezcan pasar — porque con un array
   * pasarían, y el producto no usa arrays.
   *
   * Se mira que NO haya un recorrido por índice. `stock.length` sobre un mapa es
   * undefined y eso es justamente lo que no falla ruidosamente. */
  check('la expresión NO recorre stock por índice — stock es un mapa',
        !/stock\.length/.test(expr) && !/stock\[\s*av\s*\+\+/.test(expr), expr);
  check('...la recorre con for..in', /for\s*\(\s*var\s+\w+\s+in\s+stock\s*\)/.test(expr), expr);
  check('...y salta lo heredado, como todo recorrido de mapa de este archivo',
        /hasOwnProperty/.test(expr), expr);

  // Y la prueba de fuego: correrla con un ARRAY, que es lo que el autor original
  // creyó tener. Tiene que seguir dando el resultado correcto, porque un array
  // también se recorre con for..in.
  check('y si alguien le pasara un array, tampoco se equivocaría',
        correr([], [{ warehouseQty: 5643, siteQty: 0 }]) === true);
}

console.log('\n═══ 5. Los TRES vacíos en la pantalla ═══\n');
{
  /* El tercer vacío, que Jose destapó el 29/09: el archivo vacío porque el
   * trabajo nocturno se llevó TODO al histórico. No se perdió nada y la pantalla
   * se veía igual que el desastre. Decirle a alguien que su almacén se rompió
   * cuando sólo hay que pulsar un botón es casi tan malo como lo contrario. */
  const render = A.sinComentarios(A.fnSrc(HTML, 'renderMovements'));
  check('el navegador recibe cuántas filas tiene el histórico',
        /historicoFilas/.test(A.sinComentarios(GS)));
  check('y la pantalla distingue los TRES vacíos, no dos',
        /_historicoFilas\s*>\s*0/.test(render), render.slice(0, 0));
  check('el caso "está todo en el histórico" manda al botón que lo trae',
        /Load Older History/.test(render));
  check('y el caso imposible sigue diciendo que no se toque nada',
        /Do not add movements/.test(render));
  check('el mensaje de filtros sigue existiendo para cuando es un filtro',
        /No movements match your filters/.test(render));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos, ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
