// UNA IMPORTACIÓN DESHECHA TIENE QUE DESAPARECER DE LA LISTA.
//
// Jose, 3/11: *"aún sigue el botón de undo this import, incluso después de que
// ya lo hice antes, y al intentar subir el mismo archivo me dice que el archivo
// ya existe, pero en realidad ya está borrado. Y no se puede eliminar ese
// botón."*
//
// ── POR QUÉ ESTO ES UNA PRUEBA Y NO UNA REVISIÓN A OJO ──────────────────────
//
// Es la falta de siempre, en su forma más pura: **el registro de importaciones
// ES el registro de auditoría**, y deshacer escribía una fila nueva que nadie
// leía. Dos cosas que tienen que coincidir —lo que pasó y lo que la lista
// cuenta— sin que nada lo obligue.
//
// Y tiene una trampa que una revisión a ojo se salta: **una importación
// deshecha A MEDIAS tiene que seguir en la lista**, porque le quedan filas
// vivas y sin el botón no hay forma de terminar. Esa es la mitad que esta
// prueba sujeta de verdad.
//
// Uso:  node tools/test-la-importacion-deshecha-se-va.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

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

/* Una hoja de auditoría de mentira: seis columnas, como la de verdad.
 *   [0] cuándo · [1] acción · [2] quién · [3] detalle · [4] importId · [5] extra
 * En una fila BULK_IMPORT la [5] es la huella; en una IMPORT_UNDONE, la marca
 * de si ese trozo fue el último. */
function hojaDe(filas) {
  return {
    getLastRow: function () { return filas.length + 1; },      // +1 por la cabecera
    getRange: function (desde, col, n) {
      return { getValues: function () { return filas.slice(desde - 2, desde - 2 + n); } };
    }
  };
}
function ssCon(filas) {
  return { getSheetByName: function () { return hojaDe(filas); } };
}

/* Las constantes se LEEN del archivo, no se copian aquí. Una copia sería otra
 * pareja que tiene que coincidir sin que nada lo obligue — justo lo que esta
 * suite persigue — y además dejaría la prueba verde con el valor de ayer. */
function constante(nombre) {
  const m = GS.match(new RegExp('var\\s+' + nombre + '\\s*=\\s*([^;]+);'));
  if (!m) throw new Error('no se encontró la constante ' + nombre);
  return eval('(' + m[1] + ')');   // eslint-disable-line no-eval
}

const ctx = {
  SHEETS: { AUDIT: 'AUDIT_LOG' },
  Logger: { log: function () {} },
  IMPORTS_A_MIRAR: constante('IMPORTS_A_MIRAR'),
  UNDO_COMPLETO:   constante('UNDO_COMPLETO'),
  UNDO_PARCIAL:    constante('UNDO_PARCIAL')
};
const M = A.montar(ctx, GS, ['importacionesRecientes_']);
const recientes = M.importacionesRecientes_;

console.log('\n═══ 1. lo que no se ha deshecho sigue estando ═══\n');

const soloImport = [
  [new Date(), 'BULK_IMPORT', 'jose@x.com', '800 rows', 'IMP-AAAA1111', 'huella-A']
];
let r = recientes(ssCon(soloImport), 12);
check('una importación sin deshacer aparece', r.length === 1 && r[0].importId === 'IMP-AAAA1111', r);
check('...y trae su huella', r[0].fingerprint === 'huella-A');

console.log('\n═══ 2. y la deshecha desaparece — las dos caras ═══\n');

const deshecha = soloImport.concat([
  [new Date(), 'IMPORT_UNDONE', 'jose@x.com', '800 removed', 'IMP-AAAA1111', 'UNDONE_COMPLETE']
]);
r = recientes(ssCon(deshecha), 12);
check('el botón de deshacer ya no tiene a quién deshacer', r.length === 0, r);

/* LA SEGUNDA CARA, que es el otro síntoma de Jose. `importacionConHuella_` lee
 * de la MISMA función, así que si la importación desaparece, la huella deja de
 * encontrarse y el fichero se puede volver a subir. Se comprueba aquí y no
 * sobre `importacionConHuella_` porque ésa abre la hoja activa por su cuenta;
 * lo que de verdad decide es esta lista. */
check('...y su huella ya no está para decir «ese fichero ya entró»',
  r.filter(function (x) { return x.fingerprint === 'huella-A'; }).length === 0);

console.log('\n═══ 3. LA TRAMPA: deshecha a medias SIGUE estando ═══\n');

/* Una importación mayor que MAX_BORRADO_POR_TANDA se deshace por trozos. Entre
 * trozo y trozo le quedan filas vivas: si desapareciera con el primero, el
 * resto se quedaría en el almacén sin botón con el que terminar. */
const aMedias = soloImport.concat([
  [new Date(), 'IMPORT_UNDONE', 'jose@x.com', '300 removed', 'IMP-AAAA1111', 'UNDONE_PARTIAL']
]);
r = recientes(ssCon(aMedias), 12);
check('un trozo no la retira: quedan filas vivas que borrar',
  r.length === 1 && r[0].importId === 'IMP-AAAA1111', r);

/* Y cuando llega el último trozo, sí. Los dos trozos conviven en el registro:
 * el parcial no puede anular al completo por estar escrito antes. */
const yaTerminada = aMedias.concat([
  [new Date(), 'IMPORT_UNDONE', 'jose@x.com', '500 removed', 'IMP-AAAA1111', 'UNDONE_COMPLETE']
]);
check('el último trozo sí la retira, aunque haya un parcial antes',
  recientes(ssCon(yaTerminada), 12).length === 0);

console.log('\n═══ 4. lo que ya estaba escrito antes de hoy ═══\n');

/* Las IMPORT_UNDONE de antes de este arreglo llevan la columna 6 vacía: la
 * marca no existía. Exigirla dejaría la importación que Jose ya deshizo colgada
 * para siempre — que es el fallo que esto viene a quitar. */
const vieja = soloImport.concat([
  [new Date(), 'IMPORT_UNDONE', 'jose@x.com', '800 removed', 'IMP-AAAA1111', '']
]);
check('una fila vieja sin marca cuenta como terminada',
  recientes(ssCon(vieja), 12).length === 0);

console.log('\n═══ 5. cada importación va por su cuenta ═══\n');

const dos = [
  [new Date(), 'BULK_IMPORT',   'jose@x.com', '800 rows',    'IMP-AAAA1111', 'huella-A'],
  [new Date(), 'BULK_IMPORT',   'jose@x.com', '20 rows',     'IMP-BBBB2222', 'huella-B'],
  [new Date(), 'IMPORT_UNDONE', 'jose@x.com', '800 removed', 'IMP-AAAA1111', 'UNDONE_COMPLETE']
];
r = recientes(ssCon(dos), 12);
check('deshacer una no se lleva la otra',
  r.length === 1 && r[0].importId === 'IMP-BBBB2222', r.map(function (x) { return x.importId; }));

/* El orden de lectura es de atrás hacia delante —lo más nuevo primero— y la
 * fila que dice que algo se deshizo está SIEMPRE por debajo de la que dice que
 * se importó. Por eso las deshechas se recogen en una pasada aparte; si se
 * decidiera sobre la marcha, la importación ya habría salido en la lista
 * cuando apareciera la fila que la anula. */
const alReves = [
  [new Date(), 'BULK_IMPORT',   'jose@x.com', '800 rows',    'IMP-CCCC3333', 'huella-C'],
  [new Date(), 'IMPORT_UNDONE', 'jose@x.com', '800 removed', 'IMP-CCCC3333', 'UNDONE_COMPLETE'],
  [new Date(), 'BULK_IMPORT',   'jose@x.com', '5 rows',      'IMP-DDDD4444', 'huella-D']
];
r = recientes(ssCon(alReves), 12);
check('la fila que anula puede estar en medio del registro',
  r.length === 1 && r[0].importId === 'IMP-DDDD4444', r.map(function (x) { return x.importId; }));

console.log('\n═══ 6. nada de esto rompe lo que ya hacía ═══\n');

const muchas = [];
for (let i = 0; i < 20; i++) {
  muchas.push([new Date(), 'BULK_IMPORT', 'jose@x.com', i + ' rows', 'IMP-' + i, 'h-' + i]);
}
check('`cuantas` sigue recortando DESPUÉS de quitar las deshechas',
  recientes(ssCon(muchas), 5).length === 5);
check('y `cuantas` 0 las trae todas', recientes(ssCon(muchas), 0).length === 20);
check('lo más nuevo va primero', recientes(ssCon(muchas), 3)[0].importId === 'IMP-19');
check('sin hoja de auditoría no revienta',
  recientes({ getSheetByName: function () { return null; } }, 12).length === 0);
check('una hoja vacía tampoco', recientes(ssCon([]), 12).length === 0);

console.log('\n═══ 7. y el que escribe la marca la escribe de verdad ═══\n');

/* La otra mitad de la pareja. Si `undoImport` dejara de poner la marca, lo de
 * arriba seguiría verde y la app seguiría rota — porque todo trozo contaría
 * como terminado y una importación grande perdería su botón a mitad. */
const undo = fnSrc(GS, 'undoImport');
check('undoImport pone la marca en la columna 6',
  /UNDO_PARCIAL|UNDO_COMPLETO/.test(undo), undo.slice(-400));
check('...y la elige según si quedan filas por borrar',
  /res\.quedanPor\s*>\s*0\s*\?\s*UNDO_PARCIAL\s*:\s*UNDO_COMPLETO/.test(undo));
check('las dos marcas están declaradas y son distintas',
  /UNDO_COMPLETO\s*=\s*'UNDONE_COMPLETE'/.test(GS) &&
  /UNDO_PARCIAL\s*=\s*'UNDONE_PARTIAL'/.test(GS));

/* Y que nadie vuelva a mandar '' ahí: sería indistinguible de una fila vieja,
 * o sea «terminada», y una importación a medias perdería el botón. */
check('ya no se escribe una marca vacía al deshacer',
  !/'IMPORT_UNDONE'[\s\S]{0,400}importId,\s*''\s*\)/.test(undo));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  El registro de importaciones ES el de auditoría, y el de\n' +
                '  auditoría es de sólo añadir. Si nadie lee la fila que dice\n' +
                '  «esto se deshizo», el botón se queda para siempre.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
