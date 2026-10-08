// LO GUARDADO SE VE EN EL MISMO SEGUNDO, NO DIECISÉIS DESPUÉS.
//
// Jose, 2026-10-08: *"lo que quiero es que la app muestre lo que guardó,
// modificó, cambió, borró, etc. exactamente en el mismo segundo que termina de
// hablar con el servidor. Y eso va para todo lo que hace la app."*
//
// Cronometrado fotograma a fotograma en su vídeo del 07/10, guardando diez
// entradas:
//
//     t = 49,6 s   pulsa Guardar
//     t = 63,9 s   la ventana se cierra        (14,3 s de "Saving…")
//     t = 80,5 s   las filas aparecen          (16,6 s MÁS)
//
// Dieciséis segundos y medio mirando una tabla que NO contiene lo que acabas de
// meter. Es exactamente el momento en que uno piensa que falló y vuelve a
// darle.
//
// ── Y NO TARDABA POR LENTA ────────────────────────────────────────────────
//
// Tardaba porque el navegador pedía la foto entera otra vez para enterarse de
// unas filas que el servidor ACABABA DE ESCRIBIR y tenía delante.
//
// ── EL HALLAZGO GORDO, QUE NO ERA EL QUE BUSCABA ──────────────────────────
//
// Al abrirlo apareció que `stockAfter` —el arreglo de la v12.24, "el servidor
// ya tenía las cifras de después y las tiraba"— LO PRODUCÍA
// `addMovementsBatch_` Y NINGUNA DE LAS ENVOLTURAS LO REENVIABA. Las tres
// pantallas llamaban a `_aplicarStockDelServidor(res)` y recibían `undefined`.
//
// Un arreglo escrito, probado, y muerto en el camino de vuelta durante
// versiones. Dos cosas que tienen que coincidir —lo que una función produce y
// lo que la de arriba reenvía— sin que nada lo obligue.
//
// ESO es lo que mide la sección 3, y es la razón de ser de esta prueba: que no
// se vuelva a perder entre dos funciones del mismo archivo.
//
// Uso:  node tools/test-se-ve-al-guardar.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const A    = require('./andamio.js');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

console.log('\n═══ 1. El servidor devuelve las filas que acaba de escribir ═══\n');
{
  const src = A.fnSrc(GS, 'addMovementsBatch_');
  check('addMovementsBatch_ existe y se recortó entero', src.length > 2000, src.length);
  check('devuelve `movimientos`', /movimientos:\s*guardados/.test(src));
  check('...construidas con el MISMO parseArchiveRow que usa getInitialData — dos formas ' +
        'distintas del mismo dato es el fallo que llevamos meses cazando',
    /parseArchiveRow\(newRows\[g\]/.test(src));
  check('...con los costes tapados igual que en los otros dos sitios donde estos objetos ' +
        'salen del servidor — si no, ésta sería la tercera puerta de los costes',
    /canSeeCosts_\(auth\)/.test(src) && /mg\.unitCost = null/.test(src));
  check('...y envuelto en try: un fallo pintando una fila NO puede tumbar un guardado que ' +
        'YA está hecho', /catch\s*\(eGuardados\)/.test(src));
  check('...y si falla va VACÍO, que significa "no sé" — y el navegador entonces recarga, ' +
        'que es lo de antes', /guardados = \[\];/.test(src));
}

console.log('\n═══ 2. La pantalla las mete sin preguntar otra vez ═══\n');
{
  const src = A.fnSrc(HTML, '_pintarGuardado');
  check('_pintarGuardado existe', src.length > 200, src.length);

  const sandbox = { console, movements: [], renderMovements: function(){ sandbox._pintado = (sandbox._pintado||0)+1; } };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);

  const diez = [];
  for (let i = 0; i < 10; i++) diez.push({ movId: 'M-' + i, category: 'SEALANT', name: 'X' + i, qty: 1 });

  const n = sandbox._pintarGuardado({ movimientos: diez });
  check('las diez filas de la tanda entran de una vez', n === 10 && sandbox.movements.length === 10, n);
  check('...y la tabla se repinta UNA sola vez, no diez', sandbox._pintado === 1, sandbox._pintado);

  /* Lo que de verdad protege: la recarga silenciosa llega detrás con las mismas
   * filas. Si se metieran otra vez, la persona vería cada movimiento DOS VECES
   * y creería que guardó el doble — un fallo peor que el que esto arregla. */
  const otra = sandbox._pintarGuardado({ movimientos: diez });
  check('volver a recibir las mismas NO las duplica — se comparan por su id propio, no por ' +
        'posición', otra === 0 && sandbox.movements.length === 10, sandbox.movements.length);

  const mezcla = sandbox._pintarGuardado({ movimientos: [diez[3], { movId: 'M-99', name: 'nuevo' }] });
  check('...y de una mezcla sólo entra la que falta', mezcla === 1 && sandbox.movements.length === 11);

  check('sin `movimientos` no hace nada y lo dice — vacío significa "no sé", y entonces manda ' +
        'la recarga de siempre',
    sandbox._pintarGuardado({}) === 0 && sandbox._pintarGuardado({ movimientos: [] }) === 0 &&
    sandbox._pintarGuardado(null) === 0);

  /* `movements` va en ORDEN DE HOJA y la tabla hace .reverse() para enseñar lo
   * último arriba. Meterlas al principio las dejaría abajo del todo: lo que
   * acabas de guardar, enterrado bajo un año de historial. */
  check('se añaden al FINAL de la lista, que es donde la tabla las lee como lo más nuevo',
    sandbox.movements[0].movId === 'M-0' && sandbox.movements[10].movId === 'M-99',
    sandbox.movements.map(m => m.movId).join(','));
}

console.log('\n═══ 3. Y el camino de vuelta no se pierde por el camino ═══\n');
{
  /* LA SECCIÓN QUE DE VERDAD IMPORTA. `stockAfter` existía desde la v12.24 y
   * ninguna de las tres envolturas lo reenviaba, así que el navegador recibía
   * undefined y no ponía nada. Nadie lo notó porque la recarga de detrás
   * acababa cuadrándolo — tarde. */
  [['addMultiEntry', GS], ['addMultiExit', GS]].forEach(function(par){
    const src = A.fnSrc(par[1], par[0]);
    check(par[0] + ' reenvía stockAfter — lo producía addMovementsBatch_ y se perdía aquí',
      /stockAfter:\s*res\.stockAfter/.test(src), par[0]);
    check(par[0] + ' reenvía movimientos', /movimientos:\s*res\.movimientos/.test(src));
  });

  // El despachador de movimientos sueltos: ENTRY, EXIT, TRANSFER y el individual.
  const disp = A.fnSrc(GS, 'processMovement') || GS;
  ['entryRes', 'exitRes', 'transferRes', 'singleRes'].forEach(function(v){
    check('el camino de ' + v + ' reenvía stockAfter',
      new RegExp('stockAfter:\\s*' + v + '\\.stockAfter').test(GS), v);
    check('...y movimientos',
      new RegExp('movimientos:\\s*' + v + '\\.movimientos').test(GS), v);
  });
}

console.log('\n═══ 4. Y las tres pantallas lo usan ═══\n');
{
  // Las LLAMADAS, no la definición: `function _pintarGuardado(res){` también
  // dice "_pintarGuardado(res)" y contaba como una cuarta pantalla. Primer
  // intento de esta prueba, y falló por eso — medir la letra en vez de la
  // intención, que es el error que más veces hemos cazado este mes.
  const veces = (HTML.match(/^\s*_pintarGuardado\(res\);/gm) || []).length;
  check('las TRES pantallas que guardan lo llaman — entrada, salida y movimiento suelto; ' +
        'una que se olvidara volvería a tardar dieciséis segundos y nadie lo notaría',
    veces === 3, veces);
  check('...y la recarga silenciosa SIGUE detrás, porque esto adelanta lo que ya se sabe y ' +
        'no sustituye a la foto completa',
    (HTML.match(/_pintarGuardado\(res\);\s*\n\s*_reloadWhenIdle\(\)/g) || []).length === 3);
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
