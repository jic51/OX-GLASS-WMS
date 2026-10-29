// UNA HOJA MÁS ESTRECHA QUE EL MODELO NO PUEDE ROMPER NADA.
//
// Jose, 28/10, con un vídeo: en la v13.2 **borrar un movimiento dejó de
// funcionar** en la copia de OX Glass. La causa fue añadir la columna
// `IMPORT_ID`, y es exactamente el fallo de la noche del 26 de septiembre de
// 2026 — el que borró el archivo entero — con otra columna y en otra función:
//
//   La hoja de un cliente mide lo que medía el día que se creó. El modelo mide
//   `AC_WIDTH`, que crece cada vez que añadimos una columna. Pedir
//   `getRange(2, 1, n, AC_WIDTH)` a una hoja más estrecha REVIENTA, y se lleva
//   por delante la operación entera.
//
// Y una hoja estrecha **no es el caso raro: es el NORMAL** en cualquier
// actualización. Lo será cada vez que se añada una columna, para siempre.
//
// ── POR QUÉ ESTA PRUEBA EXISTE Y NO BASTA CON HABERLO ARREGLADO ─────────────
//
// `ensureArchiveWidth_` existe desde hace meses, para esto exactamente. El 26
// de septiembre el archivador nocturno no la llamaba. El 28 de octubre el
// borrado en tanda tampoco. **Dos veces el mismo fallo, en dos sitios, con la
// cura ya escrita en el archivo.** Lo que faltaba no era la función: era algo
// que obligara a usarla.
//
// Esto no mira el código: monta una hoja estrecha que REVIENTA igual que
// Sheets cuando le pides columnas que no tiene, y ejecuta las funciones de
// verdad contra ella.
//
// Uso:  node tools/test-hoja-estrecha-no-revienta.js

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

/* LA HOJA ESTRECHA, Y LO ÚNICO QUE IMPORTA DE ELLA: `getRange` REVIENTA si le
 * piden más columnas de las que tiene, igual que Sheets. Una hoja falsa
 * complaciente —que devolviera huecos— aprobaría el código que rompió la app
 * de Jose, y entonces esta prueba no serviría para nada. */
function HojaEstrecha(filas, maxCols) {
  this.rows     = filas.map(function (r) { return r.slice(); });
  this._maxCols = maxCols;
  this.ensanchada = 0;
}
HojaEstrecha.prototype.getLastRow    = function () { return this.rows.length; };
HojaEstrecha.prototype.getMaxColumns = function () { return this._maxCols; };
HojaEstrecha.prototype.insertColumnsAfter = function (desde, n) {
  this._maxCols += n;
  this.ensanchada += n;
};
HojaEstrecha.prototype.getRange = function (fila, col, nFilas, nCols) {
  if (col - 1 + nCols > this._maxCols) {
    throw new Error('Los límites del rango exceden la hoja: pedidas ' +
      (col - 1 + nCols) + ' columnas, la hoja tiene ' + this._maxCols + '.');
  }
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

console.log('\n═══ 1. la hoja falsa muerde: pedirle de más revienta ═══\n');

/* Sin esto, todo lo de abajo podría estar en verde por no comprobar nada. */
{
  const h = new HojaEstrecha([[], []], AC_WIDTH - 1);
  let revento = false;
  try { h.getRange(2, 1, 1, AC_WIDTH).getValues(); } catch (e) { revento = true; }
  check('pedir ' + AC_WIDTH + ' columnas a una hoja de ' + (AC_WIDTH - 1) + ' revienta', revento);
}

console.log('\n═══ 2. borrar en tanda sobre una hoja vieja y estrecha ═══\n');

/* ESTE ES EL CASO DE JOSE, TAL CUAL: su archivo tenía las columnas de ayer y
 * el modelo ya tenía una más. */
function correrBorrado(anchoDeLaHoja) {
  const cab  = new Array(anchoDeLaHoja).fill('CAB');
  const fila = new Array(anchoDeLaHoja).fill('');
  fila[AC.CATEGORY] = 'Glass';
  fila[AC.NAME]     = 'Aluminio 2mm';
  fila[AC.MOV_ID]   = 'M1';

  const archivo  = new HojaEstrecha([cab, fila], anchoDeLaHoja);
  const papelera = new HojaEstrecha([new Array(TRASH_WIDTH).fill('CAB')], TRASH_WIDTH);

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
  // La de verdad, sacada del archivo: si el arreglo fuera «ensanchar a mano en
  // otro sitio», esto lo delataría.
  vm.runInContext(fnSrc(GS, 'ensureArchiveWidth_'), ctx);
  vm.runInContext(fnSrc(GS, 'borrarFilasEnTanda_'), ctx);

  const ss = { getSheetByName: function (n) { return n === 'MASTER_ARCHIVE_V3' ? archivo : null; } };
  const res = vm.runInContext('borrarFilasEnTanda_', ctx)(
    ss, { email: 'jose@oxglass.com' },
    function (f) { return String(f[AC.MOV_ID]) === 'M1'; }, 300);
  return { res: res, archivo: archivo, papelera: papelera };
}

// Una hoja de hace dos columnas: el caso real de una instalación con meses.
{
  let error = null, r = null;
  try { r = correrBorrado(AC_WIDTH - 2); } catch (e) { error = e.message; }
  check('no revienta con una hoja dos columnas más estrecha', !error, error);
  if (r) {
    check('la ensanchó antes de leer', r.archivo.ensanchada === 2, r.archivo.ensanchada);
    check('y borró la fila que tocaba', r.res && r.res.movidas === 1,
      r.res && r.res.movidas);
    check('que acabó en la papelera', r.papelera.rows.length === 2);
  }
}

// Una hoja de una columna menos: la que tendría cualquiera tras esta versión.
{
  let error = null, r = null;
  try { r = correrBorrado(AC_WIDTH - 1); } catch (e) { error = e.message; }
  check('ni con una columna menos — el caso de toda instalación al actualizar',
    !error, error);
  if (r) check('se borró igual', r.res && r.res.movidas === 1, r.res && r.res.movidas);
}

// Y una al día: que ensanchar no sea algo que pase siempre.
{
  const r = correrBorrado(AC_WIDTH);
  check('una hoja ya al día no se toca', r.archivo.ensanchada === 0, r.archivo.ensanchada);
}

console.log('\n═══ 3. y ninguna lectura de fila entera se salta el ensanche ═══\n');

/* El guardia general, para que esto no haga falta descubrirlo una tercera vez.
 * Toda función que pida un rango de AC_WIDTH columnas tiene que ensanchar
 * antes — o usar `readWidth_`, que es la otra forma correcta: pedir lo que la
 * hoja tiene en vez de lo que el modelo quiere. */
const lineas = GS.split('\n');
const sospechosas = [];
lineas.forEach(function (l, i) {
  // Sólo código: un comentario que EXPLICA el fallo contiene, por fuerza, la
  // forma del fallo. Sin esto, esta prueba leía mi propia explicación de
  // arriba como si fuera una llamada de verdad.
  const limpia = l.replace(/^\s*(\/\/|\*|\/\*).*$/, '');
  if (!/getRange\([^;]*AC_WIDTH\s*\)/.test(limpia)) return;
  if (/readWidth_/.test(limpia)) return;          // la otra forma correcta

  /* Se busca el ensanche DENTRO DE LA MISMA FUNCIÓN, no en las N líneas de
   * antes: `addMovementsBatch_` ensancha cuatrocientas líneas más arriba y
   * está bien, y un número fijo de líneas aprobaría o suspendería según el
   * tamaño de la función, que no tiene nada que ver. */
  let ini = i;
  while (ini > 0 && !/^function\s/.test(lineas[ini])) ini--;
  const cuerpo = lineas.slice(ini, i).join('\n');
  if (/ensureArchiveWidth_\s*\(/.test(cuerpo)) return;
  sospechosas.push((i + 1) + ': ' + l.trim());
});
check('toda lectura/escritura de AC_WIDTH columnas ensancha antes',
  sospechosas.length === 0, sospechosas);

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Una hoja estrecha es el caso NORMAL al actualizar, no el raro.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
