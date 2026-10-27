// UNA IMPORTACIÓN SE RECONOCE POR UNA COLUMNA, NO POR UN TEXTO QUE SE PUEDE BORRAR.
//
// Idea de Jose, 27/10, después de leer cómo funcionaba «deshacer la
// importación»:
//
//   *"La app le pone ese comentario e igual el usuario puede editar el
//    comentario, entonces no es un arreglo fijo, es sólo provisional."*
//
// Y no era provisional: estaba roto (H-22). `undoImport` reconocía sus filas
// por el TEXTO del comentario —«Imported from file IMP-A1B2C3D4»— y `comments`
// es uno de los campos que `modifyMovement` deja editar. Así que corregir el
// comentario de una fila importada, algo tan normal como escribir «llegó
// roto», la sacaba de su importación: deshacer se llevaba las otras mil y
// dejaba ésa, huérfana y sin avisar.
//
// ── LO QUE SE COMPRUEBA ─────────────────────────────────────────────────────
//
//   1. La columna existe, tiene cabecera, y el ancho del archivo la cubre.
//   2. NO está entre los campos editables. Ésa es la propiedad entera: si se
//      pudiera editar, no sería mejor que el comentario.
//   3. El importador la escribe, y sólo él.
//   4. La regla real —`esDeLaImportacion_`, ejecutada— reconoce:
//        · una fila nueva CON EL COMENTARIO BORRADO  → sí (el caso H-22)
//        · una fila vieja que sólo tiene el comentario → sí (heredado)
//        · una fila de OTRA importación               → no
//        · una fila tecleada a mano                   → no
//
// Uso:  node tools/test-importacion-con-nombre-propio.js

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const RAIZ = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8');

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

const acSrc = (GS.match(/var AC = \{[\s\S]*?\n\};/) || [''])[0];
const ctxAC = vm.createContext({});
vm.runInContext(acSrc, ctxAC);
const AC = vm.runInContext('AC', ctxAC);
const AC_WIDTH = Number((GS.match(/var AC_WIDTH = (\d+);/) || [])[1]);

console.log('\n═══ 1. la columna existe y está cubierta ═══\n');

check('AC tiene IMPORT_ID', typeof AC.IMPORT_ID === 'number', AC.IMPORT_ID);
check('AC_WIDTH (' + AC_WIDTH + ') la cubre', AC_WIDTH > AC.IMPORT_ID,
  { ancho: AC_WIDTH, importId: AC.IMPORT_ID });

/* Que la cabecera del archivo la nombre. Sin esto, la columna existiría para
 * el código y sería una columna sin título para quien abra la hoja — y la hoja
 * la abre Jose, aunque el cliente no. */
const cab = (GS.match(/name: SHEETS\.ARCHIVE, header: \[[\s\S]*?\]/) || [''])[0];
check('la cabecera del archivo dice «Import ID»', /'Import ID'/.test(cab));
/* Quitar TODOS los espacios para comparar rompía esta comprobación por un
 * motivo tonto y vale la pena dejarlo escrito: también quita el espacio de
 * dentro de 'From Movement'. Se tolera el espaciado entre las comillas y la
 * coma, que es lo que de verdad varía, y no se toca el contenido. */
check('y va LA ÚLTIMA — añadida al final, no insertada en medio',
  /'From Movement'\s*,\s*'Import ID'\s*\]/.test(cab),
  cab.slice(-120).replace(/\s+/g, ' '));

console.log('\n═══ 2. y el usuario NO la puede editar ═══\n');

/* ESTO ES LA PROPIEDAD ENTERA. Si IMPORT_ID se pudiera cambiar desde el
 * formulario, reconocer una tanda por ella no sería mejor que reconocerla por
 * el comentario: las dos se podrían borrar. */
const editables = (GS.match(/dateRec:\s*\{\s*col:\s*AC\.DATE_REC[\s\S]{0,1500}?\n\s*\};/) || [''])[0];
check('se encontró el mapa de campos editables', !!editables);
check('IMPORT_ID no está entre los campos editables',
  !!editables && !/col:\s*AC\.IMPORT_ID/.test(editables));
check('y COMMENTS sí lo está — que es justo por lo que no se puede confiar en él',
  !!editables && /col:\s*AC\.COMMENTS/.test(editables));

console.log('\n═══ 3. la escribe el importador, y sólo él ═══\n');

const escrituras = (GS.match(/row\[AC\.IMPORT_ID\]\s*=/g) || []).length;
check('hay exactamente un sitio que escribe la columna', escrituras === 1, escrituras);
check('el importador manda su importId en cada movimiento',
  /importId:\s*importId,/.test(GS));

console.log('\n═══ 4. la regla de verdad, ejecutada ═══\n');

const ctx = vm.createContext({ AC: AC });
vm.runInContext(fnSrc(GS, 'esDeLaImportacion_'), ctx);
const esDe = vm.runInContext('esDeLaImportacion_', ctx);

function fila(opts) {
  const f = new Array(AC_WIDTH).fill('');
  f[AC.CATEGORY]  = 'Glass';
  f[AC.NAME]      = 'Aluminio 2mm';
  f[AC.COMMENTS]  = opts.comentario === undefined ? '' : opts.comentario;
  f[AC.IMPORT_ID] = opts.importId === undefined ? '' : opts.importId;
  return f;
}

const TANDA = 'IMP-A1B2C3D4';
const OTRA  = 'IMP-99887766';

/* EL CASO H-22, QUE ES EL MOTIVO DE TODO ESTO. Fila importada cuyo comentario
 * alguien reescribió entero. Antes se perdía; ahora la columna la sostiene. */
check('una fila importada con el comentario REESCRITO sigue siendo de su tanda',
  esDe(fila({ importId: TANDA, comentario: 'llegó roto, revisar con el proveedor' }), TANDA) === true);

check('y con el comentario borrado del todo, también',
  esDe(fila({ importId: TANDA, comentario: '' }), TANDA) === true);

/* HEREDADO. Una tanda anterior a la columna no tiene más rastro que el texto.
 * Sigue funcionando: poder deshacerla a medias es mejor que decirle a alguien
 * que su botón dejó de existir. */
check('una importación VIEJA, sin columna, se reconoce por el comentario',
  esDe(fila({ comentario: 'Imported from file ' + TANDA + ' — pallet 3' }), TANDA) === true);

check('una fila de OTRA importación no se toca',
  esDe(fila({ importId: OTRA, comentario: 'Imported from file ' + OTRA }), TANDA) === false);

check('una fila tecleada a mano no se toca',
  esDe(fila({ comentario: 'entrada manual' }), TANDA) === false);

/* Que el comentario no pueda hacer pasar una fila por importada: si alguien
 * escribe a mano «Imported from file IMP-...» de OTRA tanda, no es de ésta. */
check('un comentario que nombra otra tanda no cuela',
  esDe(fila({ comentario: 'Imported from file ' + OTRA }), TANDA) === false);

check('sin importId no se lleva nada', esDe(fila({ importId: TANDA }), '') === false);
check('una fila vacía no revienta', esDe(null, TANDA) === false);

console.log('\n═══ 5. y undoImport usa esa regla, no otra copia de ella ═══\n');

/* Que no queden DOS reglas que tengan que coincidir sin que nada lo obligue,
 * que es el fallo que este proyecto repite. */
const undo = fnSrc(GS, 'undoImport');
check('undoImport llama a esDeLaImportacion_', /esDeLaImportacion_\s*\(/.test(undo));
check('y ya no compara el comentario por su cuenta',
  !/indexOf\(marca\)/.test(undo) && !/'Imported from file '/.test(undo),
  undo.slice(0, 400));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
