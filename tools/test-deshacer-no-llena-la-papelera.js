// DESHACER UNA IMPORTACIÓN NO LLENA LA PAPELERA. LO EDITADO SÍ SE GUARDA.
//
// Decisión de Jose, 26/10: *"si se importó una vez debe poder importarse otra
// vez"*. **El fichero ES la copia de seguridad.** Guardar en la papelera mil
// filas que ya están en el disco del cliente no protege nada, y sí llena la
// papelera de cosas que nadie va a mirar — es lo que la llenó de 490 (H-01).
//
// ── LA EXCEPCIÓN, QUE ES LO QUE HACE QUE ESTO SEA SEGURO ────────────────────
//
// Una fila que alguien EDITÓ después de importarla **ya no es la del fichero**.
// Volver a subirlo devolvería el dato viejo, y la corrección se habría perdido
// sin que nadie se entere. Ésas sí van a la papelera, aunque las demás no.
//
// Saber cuáles se editaron sólo es posible desde el 27/10: hasta esa mañana la
// línea de auditoría de una modificación guardaba el NÚMERO DE FILA, que se
// mueve. Ahora guarda el id del movimiento.
//
// ── LO QUE SE COMPRUEBA ─────────────────────────────────────────────────────
//
//   1. `borrarFilasEnTanda_` SIN la regla nueva sigue mandándolo todo a la
//      papelera — borrar movimientos no cambia, y eso es la mitad del valor de
//      esta prueba: que lo de antes siga igual.
//   2. Con la regla, lo importado se va y NO queda en la papelera.
//   3. Y la fila editada sí queda, con su fecha y su autor.
//   4. Las cuentas que devuelve cuadran con lo que de verdad pasó.
//   5. `movimientosEditados_` lee el registro nuevo y no se traga el viejo.
//
// Uso:  node tools/test-deshacer-no-llena-la-papelera.js

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

const AC = (function () {
  const c = vm.createContext({});
  vm.runInContext((GS.match(/var AC = \{[\s\S]*?\n\};/) || [''])[0], c);
  return vm.runInContext('AC', c);
})();
const AC_WIDTH    = Number((GS.match(/var AC_WIDTH = (\d+);/) || [])[1]);
const TR          = { DELETED_AT: AC_WIDTH, DELETED_BY: AC_WIDTH + 1, FROM_SHEET: AC_WIDTH + 2 };
const TRASH_WIDTH = AC_WIDTH + 3;

/* Una hoja falsa con lo justo: leer un bloque, escribir al final, y decir
 * cuántas filas tiene. Lo que esta prueba mide es QUÉ FILAS acaban dónde, no
 * el comportamiento de Sheets. */
function Hoja(filas) {
  this.rows = filas.map(function (r) { return r.slice(); });
}
Hoja.prototype.getLastRow    = function () { return this.rows.length; };
Hoja.prototype.getMaxColumns = function () { return TRASH_WIDTH; };
Hoja.prototype.getRange = function (fila, col, nFilas, nCols) {
  const self = this;
  return {
    getValues: function () {
      const out = [];
      for (let r = fila - 1; r < fila - 1 + nFilas; r++) {
        const row = self.rows[r] || [];
        const t = [];
        for (let c = col - 1; c < col - 1 + nCols; c++) t.push(row[c] === undefined ? '' : row[c]);
        out.push(t);
      }
      return out;
    },
    setValues: function (vals) {
      vals.forEach(function (v, k) { self.rows[fila - 1 + k] = v.slice(); });
    }
  };
};

function filaImportada(nombre, movId, importId) {
  const f = new Array(AC_WIDTH).fill('');
  f[AC.CATEGORY]  = 'Glass';
  f[AC.NAME]      = nombre;
  f[AC.MOV_ID]    = movId;
  f[AC.IMPORT_ID] = importId;
  f[AC.COMMENTS]  = 'Imported from file ' + importId;
  return f;
}
function filaAMano(nombre, movId) {
  const f = new Array(AC_WIDTH).fill('');
  f[AC.CATEGORY] = 'Glass';
  f[AC.NAME]     = nombre;
  f[AC.MOV_ID]   = movId;
  return f;
}

/** Monta el entorno y ejecuta borrarFilasEnTanda_ de verdad. */
function correr(filasArchivo, seLleva, vaALaPapelera) {
  const archivo = new Hoja([new Array(AC_WIDTH).fill('CAB')].concat(filasArchivo));
  const papelera = new Hoja([new Array(TRASH_WIDTH).fill('CAB')]);
  const ctx = vm.createContext({
    AC: AC, AC_WIDTH: AC_WIDTH, TR: TR, TRASH_WIDTH: TRASH_WIDTH,
    SHEETS: { ARCHIVE: 'MASTER_ARCHIVE_V3', ARCHIVE_HISTORY: 'ARCHIVE_HISTORY' },
    ensureTrashSheet_: function () { return papelera; },
    ensureArchiveHistorySheet_: function () { return null; },
    escribirHojaCompleta_: function (sheet, quedan) {
      sheet.rows = [sheet.rows[0]].concat(quedan.map(function (r) { return r.slice(); }));
    },
    textSafeRow_: function (r) { return r; },
    Date: Date
  });
  ctx.ss = { getSheetByName: function (n) { return n === 'MASTER_ARCHIVE_V3' ? archivo : null; } };
  /* La de verdad, no un remedo: desde el 28/10 `borrarFilasEnTanda_`
   * ensancha la hoja antes de leerla, y una hoja falsa sin esa funcion
   * revienta — que es justamente lo que tiene que hacer si alguien la quita.
   * Ver test-hoja-estrecha-no-revienta.js. */
  vm.runInContext(fnSrc(GS, 'ensureArchiveWidth_'), ctx);
  vm.runInContext(fnSrc(GS, 'borrarFilasEnTanda_'), ctx);
  const res = vm.runInContext('borrarFilasEnTanda_', ctx)(
    ctx.ss, { email: 'jose@oxglass.com' }, seLleva, 300, vaALaPapelera);
  return { res: res, archivo: archivo, papelera: papelera };
}

const TANDA = 'IMP-A1B2C3D4';

console.log('\n═══ 1. borrar movimientos NO cambia: todo sigue yendo a la papelera ═══\n');

/* La mitad del valor de esta prueba. Lo nuevo es una opción; si el camino de
 * siempre cambiara de comportamiento, borrar un movimiento a mano dejaría de
 * poder deshacerse y nadie se enteraría hasta que hiciera falta. */
{
  const { res, papelera, archivo } = correr(
    [filaAMano('Aluminio 2mm', 'M1'), filaAMano('Vidrio 6mm', 'M2')],
    function (f) { return String(f[AC.MOV_ID]) === 'M1'; }
    /* sin quinto argumento, a propósito */);
  check('se llevó la fila pedida', res.movidas === 1, res.movidas);
  check('y está en la papelera', papelera.rows.length === 2 &&
    papelera.rows[1][AC.MOV_ID] === 'M1', papelera.rows.length);
  check('la otra sigue en el archivo', archivo.rows.length === 2 &&
    archivo.rows[1][AC.MOV_ID] === 'M2');
  check('no se descartó nada', res.descartadas === 0, res.descartadas);
}

console.log('\n═══ 2. deshacer una importación: se van y NO llenan la papelera ═══\n');

{
  const filas = [
    filaImportada('Aluminio 2mm', 'M1', TANDA),
    filaImportada('Vidrio 6mm',   'M2', TANDA),
    filaImportada('Sellador',     'M3', TANDA),
    filaAMano('Tornillos', 'M9')
  ];
  // M2 es la que alguien editó después de importarla.
  const editados = { M2: true };
  const { res, papelera, archivo } = correr(filas,
    function (f) { return String(f[AC.IMPORT_ID]) === TANDA; },
    function (f) { return !!editados[String(f[AC.MOV_ID])]; });

  check('se quitaron las tres de la importación', res.movidas === 3, res.movidas);
  check('dos se descartaron — el fichero es la copia', res.descartadas === 2, res.descartadas);
  check('y en la papelera quedó UNA, no tres',
    papelera.rows.length === 2, papelera.rows.length - 1);
  check('la que quedó es la que se había editado',
    papelera.rows[1] && papelera.rows[1][AC.MOV_ID] === 'M2',
    papelera.rows[1] && papelera.rows[1][AC.MOV_ID]);
  check('con su autor de borrado',
    papelera.rows[1] && papelera.rows[1][TR.DELETED_BY] === 'jose@oxglass.com');
  check('y con fecha',
    papelera.rows[1] && papelera.rows[1][TR.DELETED_AT] instanceof Date);

  check('lo que NO era de la importación sigue en el archivo',
    archivo.rows.length === 2 && archivo.rows[1][AC.MOV_ID] === 'M9',
    archivo.rows.length - 1);

  /* Las cuentas tienen que cuadrar entre ellas, o la pantalla dirá una cosa y
   * la hoja tendrá otra — que es la forma que tiene este fallo de no verse. */
  check('las cuentas cuadran: quitadas = descartadas + guardadas',
    res.movidas === res.descartadas + (papelera.rows.length - 1),
    { movidas: res.movidas, descartadas: res.descartadas, enPapelera: papelera.rows.length - 1 });
}

console.log('\n═══ 3. si no se editó ninguna, la papelera no recibe nada ═══\n');

{
  const { res, papelera } = correr(
    [filaImportada('A', 'M1', TANDA), filaImportada('B', 'M2', TANDA)],
    function (f) { return String(f[AC.IMPORT_ID]) === TANDA; },
    function () { return false; });
  check('se fueron las dos', res.movidas === 2, res.movidas);
  check('y la papelera sigue vacía', papelera.rows.length === 1, papelera.rows.length - 1);
  check('descartadas lo dice', res.descartadas === 2, res.descartadas);
}

console.log('\n═══ 4. quién se editó sale del registro de auditoría ═══\n');

{
  const auditoria = new Hoja([
    ['Timestamp', 'Action', 'User', 'Details', 'D2', 'D3'],
    [new Date(), 'MODIFY_MOVEMENT', 'jose@ox.com', 'M7 (row 814) | Reason: qty wrong', '', ''],
    [new Date(), 'MODIFY_MOVEMENT', 'jose@ox.com', 'Row 92 | Reason: viejo, sin id',   '', ''],
    [new Date(), 'DELETE_MOVEMENT', 'jose@ox.com', 'M8 (row 100) | Reason: dup',       '', '']
  ]);
  const ctx = vm.createContext({
    SHEETS: { AUDIT: 'AUDIT_LOG' },
    ss: { getSheetByName: function (n) { return n === 'AUDIT_LOG' ? auditoria : null; } }
  });
  vm.runInContext(fnSrc(GS, 'movimientosEditados_'), ctx);
  const editados = vm.runInContext('movimientosEditados_', ctx)(ctx.ss);

  check('reconoce el id del formato nuevo', editados.M7 === true, Object.keys(editados));
  check('NO se inventa nada del formato viejo (sólo tenía un número de fila)',
    editados.Row === undefined && editados['92'] === undefined, Object.keys(editados));
  check('y no cuenta otras acciones como ediciones', editados.M8 === undefined,
    Object.keys(editados));
}

console.log('\n═══ 5. y undoImport usa las dos piezas ═══\n');

const undo = fnSrc(GS, 'undoImport');
check('undoImport pregunta quién se editó', /movimientosEditados_\s*\(/.test(undo));
check('y pasa la regla de qué va a la papelera', /AC\.MOV_ID/.test(undo));
check('la línea de auditoría dice las DOS cifras, no sólo el total',
  /discarded/.test(undo) && /trash/.test(undo));
check('y la respuesta las devuelve para que la pantalla pueda decirlas',
  /discarded:/.test(undo) && /trashed:/.test(undo));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
