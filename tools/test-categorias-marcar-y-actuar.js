// CATEGORÍAS: MARCAR Y ACTUAR, COMO EN EL RESTO DE LA APP.
//
// Jose, 4/11: *"en la parte de categories vamos a ponerlo igual que en
// «Low-Stock Monitor Settings»: las categorías agrupadas en el centro, con el
// hover igual, y cuando se seleccione una se activan rename/delete; si
// selecciona más de una, se desactiva rename y sólo queda delete."*
//
// ── POR QUÉ ESTO ES EL MOLDE ───────────────────────────────────────────────
//
// La app tenía CINCO formas de elegir una fila, y Categorías llevaba DOS a la
// vez: un «modo» para renombrar y una casilla distinta para fusionar, en la
// misma lista. Esta pantalla es la primera que pasa al patrón único, y lo que
// esta prueba sujeta no es su aspecto: es **la regla de uno contra varios**,
// que es la parte que se puede volver a perder cuando se convierta la
// siguiente pantalla.
//
// Uso:  node tools/test-categorias-marcar-y-actuar.js

const fs   = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}
function fnSrc(nombre) {
  const ini = HTML.indexOf('function ' + nombre + '(');
  if (ini === -1) throw new Error('no encontrada: ' + nombre);
  let prof = 0;
  for (let j = HTML.indexOf('{', ini); j < HTML.length; j++) {
    if (HTML[j] === '{') prof++;
    else if (HTML[j] === '}') { prof--; if (prof === 0) return HTML.slice(ini, j + 1); }
  }
  throw new Error('sin cerrar: ' + nombre);
}

console.log('\n═══ 1 · AGRUPADAS EN EL CENTRO, COMO EL LOW-STOCK MONITOR ═══\n');

const pinta = fnSrc('_renderCategoriesTab');

check('Ajustes manda las categorías a su propia pantalla',
  /tab === 'categories'\)\{ _renderCategoriesTab\(items\)/.test(HTML));
check('usa la MISMA caja que el Low-Stock Monitor, no una parecida',
  /class="mon-chips"/.test(pinta), pinta.slice(0, 400));
check('...y los mismos chips, con su color de categoría',
  /class="mon-chip /.test(pinta) && /CAT_BADGE/.test(pinta));
check('ya no es una lista de filas', !/cfg-list/.test(pinta));
check('...ni tiene modos: no hay barra de modo en esta pantalla',
  !/_rowModeBarHtml/.test(pinta));
check('se puede seguir añadiendo una categoría nueva',
  /_cfgAdd\(/.test(pinta) && /cfgNewVal/.test(pinta));

console.log('\n═══ 2 · LA REGLA DE UNO CONTRA VARIOS ═══\n');

const barra = fnSrc('_catBarra');

/* La regla de Jose, y no es una preferencia: **renombrar es de UNA y borrar es
 * de MUCHAS**. Es la diferencia real entre las dos operaciones, y escrita en
 * qué botones se encienden no hay que explicarla. */
check('la barra se parte en «una» y «varias»',
  /sel\.length === 1/.test(barra) && /\} else \{/.test(barra));

const unaSola = barra.slice(barra.indexOf('sel.length === 1'), barra.indexOf('} else {'));
const varias  = barra.slice(barra.indexOf('} else {'));

check('con UNA: se puede renombrar', /catRenameBtn/.test(unaSola));
check('con UNA: y borrar', /catDelBtn/.test(unaSola));
check('con VARIAS: se puede borrar', /catDelBtn/.test(varias));
check('con VARIAS: y fusionar, que es lo que ya existía', /catMergeBtn/.test(varias));

/* Y Renombrar NO está apagado: no está. Renombrar varias cosas a un mismo
 * nombre no es renombrar, es fusionar — y fusionar está ahí al lado. Un botón
 * apagado invitaría a preguntarse qué haría. */
check('con VARIAS: renombrar NO aparece, ni siquiera apagado',
  !/catRenameBtn/.test(varias), varias.slice(0, 300));

console.log('\n═══ 3 · LO QUE LA PANTALLA NO DEBE VOLVER A HACER ═══\n');

check('no se renombra con una ventanita del navegador',
  !/prompt\(/.test(pinta) && !/prompt\(/.test(barra));
check('se escribe el nombre nuevo EN la barra', /catRenameInp/.test(barra));
check('...y Renombrar pasa por el guardia de siempre: ni igual, ni vacío',
  /_vigilarGuardar\(\{ boton: rbt/.test(barra));
check('...y lo que se guarda va en mayúsculas, como todos los demás caminos',
  /toUpperCase\(\)/.test(barra));

console.log('\n═══ 4 · LA FRANJA NO EMPUJA LOS CHIPS ═══\n');

check('la barra usa la franja que ya reserva su sitio', /class="cfg-pickbar"/.test(pinta));
check('vacía conserva su sitio y dice qué hacer',
  /Tick a category to rename or delete it/.test(barra) && !/bar\.innerHTML = '';/.test(barra));

console.log('\n═══ 5 · BORRAR DICE QUÉ SE LLEVA ═══\n');

/* «3 categorías» no se puede comprobar; los tres nombres sí. */
check('el aviso nombra las categorías, no sólo cuántas',
  /sel\.join\('\\n'\)/.test(barra), barra.slice(barra.indexOf('catDelBtn')));
check('...y dice que los movimientos ya guardados no cambian',
  /keep the category they were saved with/.test(barra));
check('borrar varias va de una en una, porque el servidor reescribe la columna entera',
  /pend\.shift\(\)/.test(barra) && /siguiente/.test(barra));
/* La lista de pendientes es una COPIA, y eso es lo que importa: el bucle se
 * alarga varios segundos —una llamada por categoría— y durante ese rato la
 * selección se vacía y la barra se repinta. Si el bucle leyera la selección en
 * vez de su copia, se quedaría a medias sin que nada lo dijera. */
check('la lista de pendientes es una copia, no la selección viva',
  /var pend = sel\.slice\(\);/.test(barra), barra.slice(barra.indexOf('onConfirm'), barra.indexOf('onConfirm') + 300));
check('...y la selección se vacía al confirmar, para que la barra no siga ' +
      'ofreciendo acciones sobre lo que se está yendo',
  /onConfirm[\s\S]{0,300}_catSel = \{\};/.test(barra));

/* Lo que ya no está en pantalla no puede quedar marcado — la misma regla de
 * Movements, por el mismo motivo: un Borrar armado sobre lo que nadie ve. */
check('al repintar, lo que ya no existe deja de estar marcado',
  /items\.indexOf\(n\) === -1/.test(pinta));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Renombrar es de una; borrar es de muchas. Y lo que no aplica\n' +
                '  no se enseña apagado: no se enseña.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
