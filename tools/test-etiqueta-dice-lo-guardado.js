// W-05 · LA ETIQUETA NO PUEDE LLEVAR UN ESTANTE QUE NO EXISTE.
//
// Jose, 9/11, con tres capturas: *"al hacer un entry y poner la locación en
// minúscula sí me permite guardar y no se cambia a mayúscula hasta que se
// guarda, lo cual no está mal, PERO AL GUARDAR Y DAR CLIC EN IMPRIMIR LA
// ETIQUETA, ÉSTA SALE CON LA LOCACIÓN EN MINÚSCULA, LA CUAL NO EXISTE. Pero al
// salir y volver a entrar sí se cambia a mayúscula, lo cual significa que el
// cambio se hace después de crear el label."*
//
// Diagnóstico exacto, y el fallo no es cosmético: **una etiqueta es un objeto
// físico**. Sale de la impresora, se pega en un pallet, y manda a alguien a
// buscar `d3b` cuando el estante se llama `D3B`. El lector de códigos tampoco
// lo encuentra.
//
// ── LA CAUSA: DOS CONSTRUCTORES PARA LA MISMA ETIQUETA ────────────────────
//
//     _labelsFromMovements(movs)   ← de los movimientos YA GUARDADOS
//     _labelsFromEntry(mats, comp) ← del FORMULARIO, tal como se tecleó
//
// El aviso de «Saved ✓ · 🏷 Print labels» usaba el segundo. El servidor
// normaliza al escribir, así que lo guardado estaba bien y lo impreso no.
//
// El arreglo no es un `toUpperCase()` en el sitio del fallo: el servidor YA
// devuelve las filas recién guardadas y normalizadas, así que la etiqueta sale
// de ahí — por el mismo camino que la que se imprime desde Movements. Con eso
// **desaparece el segundo constructor**, que era el defecto de fondo.
//
// Uso:  node tools/test-etiqueta-dice-lo-guardado.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

console.log('\n═══ 1 · LA ETIQUETA SALE DE LO GUARDADO ═══\n');

const guardado = A.sinComentarios(A.fnSrc(HTML, 'submitMultiEntry') || '');
check('tras guardar, la etiqueta se construye con lo que devolvió el servidor',
  /_labelsFromMovements\(res\.movimientos\)/.test(guardado),
  (guardado.match(/filasEtq = [\s\S]{0,160}/) || [''])[0]);
/* Y SÓLO si el servidor las devolvió. Un servidor viejo no las manda, y
 * entonces hay que caer al camino de antes en vez de quedarse sin etiqueta. */
check('...y si el servidor no las devuelve, no se queda sin etiqueta',
  /res\.movimientos && res\.movimientos\.length/.test(guardado) &&
  /_labelsFromEntry\(materials, payload\)/.test(guardado));

/* EL CAMINO DE RESERVA TAMBIÉN NORMALIZA, porque el fallo estaba justo ahí: no
 * sirve de nada tener una salida si la salida imprime el estante equivocado. */
const desdeForm = A.sinComentarios(A.fnSrc(HTML, '_labelsFromEntry') || '');
check('el camino de reserva pone la ubicación en mayúsculas',
  /loc:\s*String\(l\.loc \|\| ''\)\.trim\(\)\.toUpperCase\(\)/.test(desdeForm),
  (desdeForm.match(/loc:[^,]{0,80}/) || [''])[0]);

console.log('\n═══ 2 · LAS DOS ETIQUETAS SON LA MISMA ═══\n');

/* Imprimir desde Movements y imprimir justo después de guardar tienen que dar
 * LA MISMA etiqueta. Antes no podían: eran dos funciones distintas leyendo
 * datos distintos. Esto lo ejecuta con la fila que devuelve el servidor. */
const F = A.montar({ Math, Number, String }, HTML, ['_labelsFromMovements']);

{
  const fila = {
    moveType: 'ENTRY', name: 'WHITE CORN FLOUR 6 LB', category: 'FLOUR',
    qty: 1, unit: 'PALLET', destLoc: 'D3B', sourceLoc: '',
    po: 'PO1', supplier: 'PAN', project: '', dateRec: '2026-11-09'
  };
  const r = F._labelsFromMovements([fila]);
  check('la etiqueta lleva el estante que el servidor guardó', r[0].loc === 'D3B', r[0]);
  check('...y el material, la cantidad y la unidad',
    r[0].name === 'WHITE CORN FLOUR 6 LB' && r[0].qty === 1 && r[0].unit === 'PALLET', r[0]);

  /* Una SALIDA lleva el estante del que salió, no el de destino. Es la misma
   * etiqueta leída al revés, y por eso conviene que sólo haya una función. */
  const salida = F._labelsFromMovements([
    { moveType: 'EXIT', name: 'X', category: 'C', qty: 3, unit: 'UNIT',
      sourceLoc: 'A1A', destLoc: '', dateRec: '2026-11-09' }]);
  check('una salida lleva el estante del que salió', salida[0].loc === 'A1A', salida[0]);

  /* Sin cantidad no hay etiqueta que imprimir: una pegatina que dice «0» en un
   * pallet es peor que no tener pegatina. */
  const cero = F._labelsFromMovements([
    { moveType: 'ENTRY', name: 'X', category: 'C', qty: 0, destLoc: 'A1A' }]);
  check('una fila sin cantidad no genera etiqueta', cero.length === 0, cero);
}

console.log('\n═══ 3 · Y EL SERVIDOR DEVUELVE LO QUE HACE FALTA ═══\n');

const GS = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');
/* `movimientos` existe desde antes —se añadió para pintar las filas sin
 * recargar— y sale de `parseArchiveRow` sobre las filas REALMENTE escritas.
 * Eso es lo que lo hace de fiar para una etiqueta: no es lo que se mandó, es
 * lo que quedó en la hoja. */
check('el servidor devuelve las filas recién guardadas',
  /movimientos:\s*guardados/.test(GS));
check('...construidas desde la fila escrita, no desde lo que llegó',
  /parseArchiveRow\(newRows\[g\], startRow \+ g\)/.test(GS));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Una etiqueta sale de la impresora y se pega en un pallet. Si\n' +
                '  dice un estante que no existe, manda a alguien a buscar donde\n' +
                '  no hay nada — y el lector tampoco lo encuentra.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
