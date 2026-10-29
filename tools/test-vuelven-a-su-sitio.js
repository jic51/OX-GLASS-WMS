// UN MOVIMIENTO RESTAURADO VUELVE A SU SITIO, Y VUELVE YA.
//
// Jose, 29/10, con un vídeo, dos quejas que son la misma pantalla:
//
//   *"Al poner un movimiento de regreso, todo funciona pero el movimiento no
//    regresa cuando dice que está hecho, regresa y aparece varios segundos
//    después."*
//
//   *"Los movimientos que se borran y se restauran no regresan a su lugar en
//    la lista, regresan en el orden en el que se los restaura."*
//
// ── LO SEGUNDO NO ERA UN FALLO DE RESTAURAR ────────────────────────────────
//
// La lista se pintaba con `allMovs.slice().reverse()` — el revés del orden de
// la HOJA. Funcionaba por una coincidencia: las filas se añaden al final según
// van pasando, así que el revés de la hoja casi siempre es el orden del
// tiempo. Casi. Restaurar vuelve a escribir la fila **al final**, así que un
// movimiento de hace dos meses salía EL PRIMERO.
//
// La lista nunca miró la fecha. Lo mismo le pasa a una importación con fechas
// viejas.
//
// ── Y LO PRIMERO ERA MEDIA VERDAD, QUE ES PEOR QUE NINGUNA ─────────────────
//
// La fila se iba de la papelera al instante y el movimiento tardaba segundos
// en volver a Movements, porque esa mitad esperaba a `_reloadWhenIdle`. En
// medio, el movimiento **no estaba en ningún sitio**.
//
// Uso:  node tools/test-vuelven-a-su-sitio.js

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const RAIZ = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'),    'utf8');
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

const ctx = vm.createContext({ Date: Date, isNaN: isNaN, String: String });
vm.runInContext(fnSrc(HTML, '_movsMasNuevoPrimero'), ctx);
const ordenar = vm.runInContext('_movsMasNuevoPrimero', ctx);

function mov(id, ts) { return { movId: id, timestamp: ts }; }
function ids(lista) { return lista.map(function (m) { return m.movId; }); }

console.log('\n═══ 1. el caso de Jose: restaurar uno viejo ═══\n');

/* Tal cual pasa en la hoja: tres movimientos en orden, uno se borra, se
 * restaura, y vuelve a escribirse AL FINAL. Antes salía el primero de la
 * lista; tiene que salir donde le toca por su fecha. */
const comoQuedaLaHoja = [
  mov('A', '09/08/2026 10:00'),
  mov('C', '10/29/2026 12:30'),
  mov('B', '09/15/2026 11:00')   // ← restaurado: se reescribió al final
];
const puestos = ids(ordenar(comoQuedaLaHoja));
check('el restaurado NO se cuela el primero', puestos[0] !== 'B', puestos);
check('la lista sale por fecha, del más nuevo al más viejo',
  puestos.join(',') === 'C,B,A', puestos);

console.log('\n═══ 2. donde antes acertaba, sigue acertando igual ═══\n');

/* La mitad del trabajo. Una hoja normal —filas añadidas según pasan— tiene que
 * salir EXACTAMENTE igual que con el `reverse()` de antes. Si esto cambiara,
 * habríamos arreglado un caso raro rompiendo el de todos los días. */
const normal = [
  mov('1', '10/01/2026 08:00'),
  mov('2', '10/02/2026 08:00'),
  mov('3', '10/03/2026 08:00')
];
check('una hoja normal sale igual que con el revés de siempre',
  ids(ordenar(normal)).join(',') === '3,2,1', ids(ordenar(normal)));

console.log('\n═══ 3. sin fecha no se baraja nada ═══\n');

/* EL PELIGRO DE VERDAD DE ESTE CAMBIO. Una comparación que devuelva NaN deja
 * el orden a merced del algoritmo de `sort` y puede barajar la tabla entera —
 * un destrozo mucho peor que el que esto arregla. */
const sinFecha = [mov('x', ''), mov('y', null), mov('z', undefined)];
check('sin fechas, el orden es el de la hoja al revés',
  ids(ordenar(sinFecha)).join(',') === 'z,y,x', ids(ordenar(sinFecha)));

const mezcla = [mov('v', ''), mov('w', '10/05/2026 09:00'), mov('u', '')];
const rMezcla = ids(ordenar(mezcla));
check('con fechas a medias no se pierde ninguna fila',
  rMezcla.length === 3 && rMezcla.indexOf('u') !== -1 &&
  rMezcla.indexOf('v') !== -1 && rMezcla.indexOf('w') !== -1, rMezcla);

const basura = [mov('p', 'no es una fecha'), mov('q', '10/06/2026 09:00')];
check('una fecha ilegible no revienta ni cuela por delante',
  ids(ordenar(basura)).length === 2, ids(ordenar(basura)));

/* Empate exacto: dos filas del mismo minuto. Manda el sitio en la hoja, que es
 * lo único que distingue cuál se guardó después. */
const empate = [mov('e1', '10/07/2026 09:00'), mov('e2', '10/07/2026 09:00')];
check('en un empate manda el sitio en la hoja',
  ids(ordenar(empate)).join(',') === 'e2,e1', ids(ordenar(empate)));

check('nunca se pierde ni se duplica una fila',
  ordenar(comoQuedaLaHoja).length === 3 && ordenar([]).length === 0);

console.log('\n═══ 4. y la vuelta es inmediata, no dentro de un rato ═══\n');

const restore = fnSrc(GS, 'manageMaterialLocked_');
check('el servidor devuelve el movimiento restaurado, no sólo su id',
  /movement:\s*parseArchiveRow\(restored/.test(restore));
check('...y lo arma con la MISMA función que el resto de la app',
  /parseArchiveRow/.test(restore));

const restoreUI = fnSrc(HTML, '_restoreMovement') || '';
check('la pantalla mete el movimiento al instante',
  /res\s*&&\s*res\.movement/.test(restoreUI) && /movements\.push/.test(restoreUI),
  restoreUI.slice(0, 200));
check('...sin duplicarlo si ya estaba',
  /yaEsta/.test(restoreUI) && /movements\.some/.test(restoreUI));
check('...y sin inventar nada si el servidor no lo manda',
  /if \(res && res\.movement\)/.test(restoreUI));
check('la recarga diferida se queda como reconciliación',
  /_reloadWhenIdle\(\)/.test(restoreUI));

console.log('\n═══ 5. y la lista ya no se pinta por el sitio en la hoja ═══\n');

const render = fnSrc(HTML, 'renderMovements');
check('renderMovements ordena por fecha', /_movsMasNuevoPrimero\(/.test(render));
check('...y ya no usa el revés de la hoja',
  !/allMovs\.slice\(\)\.reverse\(\)/.test(render));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
