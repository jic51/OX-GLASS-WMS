// LO QUE JOSE APROBÓ EL 3/11, FIJADO.
//
//   1 · El tope de celdas que Google dobló, y que la app seguía contando a la
//       mitad — con fecha y fuente, porque va a volver a cambiar.
//   2 · Transfer: la estantería sugerida llena la fila vacía en vez de añadir
//       otra que luego hay que borrar a mano.
//   3 · Las casillas de marcar, que medían 13 px en el teléfono.
//
// Uso:  node tools/test-las-tres-del-3-de-noviembre.js

const fs   = require('fs');
const path = require('path');

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

console.log('\n═══ 1 · EL TOPE DE CELDAS ═══\n');

const tope = (GS.match(/var SHEET_CELL_LIMIT\s*=\s*(\d+)\s*;/) || [])[1];
check('el tope es el que Google puso el 10/09/2026', tope === '20000000', tope);

/* ── POR QUÉ LA FECHA ES PARTE DE LA PRUEBA ────────────────────────────────
 *
 * Este número no es nuestro: lo pone Google y ya lo ha cambiado dos veces
 * (5M → 10M en 2022, 10M → 20M en 2026). Estuvo semanas desfasado y mientras
 * tanto la app le dijo a cada cliente que había gastado el DOBLE de lo que
 * gastó, y que le quedaban la MITAD de los años que le quedan.
 *
 * No hay forma de que un programa sepa solo que Google cambió algo. Lo único
 * que sí se puede obligar es que el número venga con CUÁNDO SE MIRÓ y DÓNDE,
 * para que la siguiente persona sepa si está viejo sin tener que investigar. */
check('viene con la fecha en que Google lo cambió',
  /SHEET_CELL_LIMIT_FECHA\s*=\s*'2026-09-10'/.test(GS));
check('...y con cuándo lo comprobamos nosotros',
  /SHEET_CELL_LIMIT_VISTO\s*=\s*'\d{4}-\d{2}-\d{2}'/.test(GS));
check('...y con la fuente, para poder volver a mirarla',
  /workspaceupdates\.googleblog\.com[^\s]*cell-limits/.test(GS));
check('...y con la historia del número, que es lo que avisa de que cambiará otra vez',
  /5\.000\.000 → 10\.000\.000/.test(GS) && /10\.000\.000 → 20\.000\.000/.test(GS));

/* El tope se lee en DOS sitios —el porcentaje y los años que quedan— y los dos
 * tienen que usar la constante, no un número suyo. Si alguno llevara el suyo,
 * la barra y la frase de debajo dirían cosas distintas sobre lo mismo. */
check('el porcentaje sale de la constante',
  /pct:\s*Math\.min\(100,\s*\(cellsUsed \/ SHEET_CELL_LIMIT\)/.test(GS));
check('y los años que quedan también',
  /remaining = Math\.max\(0, SHEET_CELL_LIMIT - cellsUsed\)/.test(GS));
check('no queda ningún 10000000 suelto en el archivo',
  GS.indexOf('10000000') === -1, (GS.match(/.{40}10000000.{20}/) || [])[0]);

/* Jose, 3/11: *"eso hace nuestra vida más increíble, debemos mostrar eso en la
 * parte de la app que calcula la memoria."* Y hay un motivo más fuerte que la
 * buena noticia: quien miró esta pantalla el mes pasado vio la mitad de
 * espacio. Un número sobre su almacén que cambia solo y sin explicación es lo
 * que hace que alguien deje de creerse la pantalla entera. */
check('el servidor manda la fecha a la pantalla', /cellLimitSince:\s*SHEET_CELL_LIMIT_FECHA/.test(GS));
check('y la pantalla la enseña', /cellLimitSince/.test(HTML));
check('...diciendo que fue Google quien lo subió, no nosotros',
  /Google raised the per-file limit/.test(HTML));

console.log('\n═══ 2 · TRANSFER: LA FILA VACÍA ═══\n');

const chip = fnSrc(HTML, 'addTransferRowFromChip');

check('busca una fila libre antes de añadir nada',
  /transfer-row/.test(chip) && /libre/.test(chip), chip.slice(0, 200));
check('...y una fila está libre sólo si NO tiene origen, ni cantidad, ni destino',
  /tr-rack/.test(chip) && /tr-qty/.test(chip) && /tr-dest/.test(chip));
check('si la encuentra, la rellena y NO añade',
  /if \(libre\)/.test(chip) && /return;/.test(chip));
check('...y si no hay ninguna libre, entonces sí añade',
  /addTransferRow\(rack, qty, ''\)/.test(chip));

/* El final tiene que ser el mismo por los dos caminos: validar, repintar las
 * sugerencias —para que esa estantería pase a «usada»— y dejar el cursor donde
 * falta escribir. Si la rama nueva se saltara uno, la pantalla quedaría en un
 * estado que la otra rama nunca produce, y eso no se nota hasta que alguien lo
 * usa en serio. */
check('la rama nueva valida, como la vieja', /validateTransferRows\(\)/.test(chip));
check('...repinta las sugerencias, como la vieja', /renderTransferLocPicker\(\)/.test(chip));
check('...y deja el cursor en el destino, que es lo que falta por decir',
  /dest\.focus\(\)/.test(chip));

/* Y la siembra se QUEDA. Quitarla «arreglaría» esto y devolvería la pantalla
 * desnuda que la siembra vino a quitar — y rompería a quien teclea la
 * estantería a mano sin tocar las sugerencias. */
const init = fnSrc(HTML, '_initMultiTransferSection');
check('la fila que se siembra al abrir sigue sembrándose',
  /addTransferRow\('', '', '', true/.test(init), init);

console.log('\n═══ 3 · LAS CASILLAS EN EL TELÉFONO ═══\n');

/* 13 × 13 px medidos con `tools/audit-responsive.js` en los tres tamaños de
 * teléfono y en la tableta: el tamaño por defecto del navegador, o sea el que
 * sale cuando nadie decidió nada. Y es la casilla que ARMA el botón de borrar,
 * en una bodega, muchas veces con guantes. */
const coarse = (HTML.match(/@media \(pointer: coarse\)\{[\s\S]*?\n    \}/) || [])[0] || '';
check('se encontró el bloque de pantalla táctil', coarse.length > 200);
check('las casillas de movimientos y de stock tienen tamaño propio',
  /\.mov-select-cb[^{]*\.stock-select-cb[^{]*\{[^}]*width:var\(--h-btn-tabla\)/.test(coarse),
  coarse.slice(coarse.indexOf('.mov-select-cb'), coarse.indexOf('.mov-select-cb') + 180));
check('...la de «marcar todos» también', /#movSelAll/.test(coarse));
check('...y la celda que las contiene, para que la columna no las recorte',
  /\.mov-sel-cell\{width:var\(--h-btn-tabla\)/.test(coarse));

/* 34 y no 44 a propósito: es `--h-btn-tabla`, la altura que los botones de esa
 * misma fila YA tienen, así que la casilla crece casi siete veces en área y la
 * fila no crece ni un píxel. Esto fija que se use la variable y no un número
 * escrito a mano que luego se separe de la de los botones. */
check('usa la variable de la fila, no un número suelto',
  !/\.mov-select-cb[^{]*\{[^}]*width:\s*\d+px/.test(coarse));
check('y la variable sigue valiendo 34', /--h-btn-tabla:34px/.test(HTML));

/* Que siga pareciendo una casilla del sistema. Una casilla grande dibujada a
 * mano deja de leerse como casilla, y entonces el tamaño no sirve de nada. */
check('se sigue viendo como una casilla, sólo que más grande',
  /accent-color:var\(--accent\)/.test(coarse));
check('...y no se reinventó el control', !/appearance:\s*none/.test(coarse));

/* El guardia del guardia: esto vive dentro de (pointer: coarse) y NO fuera. En
 * un portátil con ratón, 34px de casilla es un bicho. La regla es sobre el
 * dedo, no sobre el ancho de la ventana. */
const fuera = HTML.slice(0, HTML.indexOf('@media (pointer: coarse)'));
check('en el ratón NO se tocan: esto es sobre el dedo, no sobre la ventana',
  !/\.mov-select-cb\{[^}]*width:/.test(fuera));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
