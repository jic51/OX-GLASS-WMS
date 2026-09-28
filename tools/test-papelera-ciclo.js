// BORRAR → RESTAURAR → BORRAR. ¿QUÉ QUEDA?
//
// Jose, 2026-09-28, con dos capturas de la papelera:
//
//   "esos dos movimientos borrados son el mismo, lo que significa que la app los
//    está duplicando cada vez... cada vez que se restaura el movimiento
//    eliminado, se duplica la cantidad de material que se eliminó, lo que hace
//    que la cantidad de material que había cambie, pero no hay ningún error en
//    la app ni en el error log al sacar más de lo que había en el warehouse."
//
// Dos síntomas, y hay que separarlos porque pueden tener causas distintas:
//
//   A. La papelera acaba con DOS entradas del mismo movimiento.
//   B. Restaurar DUPLICA la cantidad en el almacén.
//
// ── POR QUÉ ESTA PRUEBA EJECUTA Y NO LEE ────────────────────────────────────
//
// Leyendo, las dos operaciones parecen correctas: borrar escribe en la papelera
// ANTES de quitar la fila, y restaurar quita la fila de la papelera DESPUÉS de
// devolverla al archivo. Los dos órdenes son los buenos. Así que si el fallo
// existe no está en el orden, está en lo que las funciones VEN — y eso sólo se
// averigua ejecutándolas contra una hoja que se comporte como Sheets.
//
// La hoja de mentira de aquí abajo imita cuatro cosas del Sheets de verdad, y
// las cuatro hacen falta:
//
//   · getLastRow() es la última fila CON CONTENIDO, no el alto de la hoja.
//   · getRange recorta el ancho pedido al ancho real de la hoja, sin avisar.
//   · setValues lanza si el ancho de los datos no es el del rango.
//   · deleteRow(n) sube todas las de abajo — que es de donde salen los índices
//     rancios, si los hay.
//   · LA COMILLA. textCell_ escribe "'" + valor para que Sheets no reinterprete
//     un PO como fecha. En Sheets de verdad esa comilla inicial NO es contenido:
//     es la marca de "esto es texto", se la traga al escribir y getValues la
//     devuelve sin ella. Sin imitar eso, esta prueba acusa de fallo a la
//     protección que mantiene los datos como el usuario los escribió.
//
// Uso:  node tools/test-papelera-ciclo.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

const AC = { TIMESTAMP:0, CATEGORY:1, NAME:2, GC:3, PO:4, QTY:5, UNIT:6, DATE_REC:7,
             SRC_LOC:8, SUPPLIER:9, COMMENTS:10, STATUS:11, RESPONSIBLE:12, PROJECT:13,
             MAT_ID:14, DOC_LINKS:15, USER_EMAIL:16, DEST_LOC:17, MOVETYPE:18, PM:19,
             UNIT_COST:20, TOTAL_COST:21, MOV_ID:22 };
const AC_WIDTH    = 23;
const TR          = { DELETED_AT: AC_WIDTH, DELETED_BY: AC_WIDTH + 1, FROM_SHEET: AC_WIDTH + 2 };
const TRASH_WIDTH = AC_WIDTH + 3;

/* ── LA HOJA DE MENTIRA ─────────────────────────────────────────────────────
 * Con las cuatro fidelidades de arriba. `_filas[0]` es la cabecera. */
function hojaFalsa(nombre, filas, maxCols) {
  const h = {
    nombre,
    _filas: filas.map(r => r.slice()),
    _maxCols: maxCols,
    getName: () => nombre,
    getMaxColumns: () => h._maxCols,
    getMaxRows: () => Math.max(h._filas.length, 2),
    // La última fila CON CONTENIDO. Una fila entera en blanco no cuenta, igual
    // que en Sheets — y de ahí salen los "escribo en getLastRow()+1 y piso algo".
    getLastRow() {
      for (let i = h._filas.length - 1; i >= 0; i--) {
        if (h._filas[i] && h._filas[i].some(c => c !== '' && c !== null && c !== undefined)) return i + 1;
      }
      return 0;
    },
    setFrozenRows(){},
    insertColumnsAfter(despues, cuantas) {
      h._maxCols = despues + cuantas;
      h._filas = h._filas.map(r => { while (r.length < h._maxCols) r.push(''); return r; });
    },
    deleteRow(n) { h._filas.splice(n - 1, 1); },
    deleteRows(n, cuantas) { h._filas.splice(n - 1, cuantas); },
    getDataRange: () => ({ getValues: () => h._filas.map(r => r.slice()) }),
    getRange(f, c, nf, nc) {
      const anchoReal = Math.min(nc, h._maxCols - c + 1);   // ← Sheets recorta
      return {
        getNumColumns: () => anchoReal,
        setFontWeight(){ return this; },
        setNumberFormat(){ return this; },
        getValues() {
          const out = [];
          for (let i = 0; i < nf; i++) {
            const src = h._filas[f - 1 + i] || [];
            const fila = [];
            for (let j = 0; j < anchoReal; j++) fila.push(src[c - 1 + j] === undefined ? '' : src[c - 1 + j]);
            out.push(fila);
          }
          return out;
        },
        setValues(datos) {
          if (datos.length && datos[0].length !== anchoReal) {
            throw new Error('El número de columnas de los datos no coincide con el ' +
              'número de columnas del rango. Los datos tienen ' + datos[0].length +
              ', y el rango, ' + anchoReal + '.');
          }
          for (let i = 0; i < datos.length; i++) {
            const destino = f - 1 + i;
            while (h._filas.length <= destino) h._filas.push(new Array(h._maxCols).fill(''));
            for (let j = 0; j < datos[i].length; j++) {
              let v = datos[i][j];
              // La comilla inicial es la marca de "texto", no contenido: Sheets
              // se la traga al escribir y no la devuelve al leer.
              if (typeof v === 'string' && v.charAt(0) === "'") v = v.slice(1);
              h._filas[destino][c - 1 + j] = v;
            }
          }
          return this;
        }
      };
    },
    /** Filas de datos de verdad (sin cabecera, sin vacías). */
    datos() { return h._filas.slice(1).filter(r => r && (r[AC.CATEGORY] || r[AC.NAME])); },
    /** Cuántas veces aparece este id. Si sale 2, hay un duplicado. */
    cuantasCon(movId) {
      return h.datos().filter(r => String(r[AC.MOV_ID] || '').trim() === movId).length;
    },
    /** La suma de cantidades de un material: lo que el almacén cree que tiene. */
    sumaQty(nombreMat) {
      return h.datos()
        .filter(r => String(r[AC.NAME]) === nombreMat)
        .reduce((s, r) => s + Number(r[AC.QTY] || 0), 0);
    }
  };
  return h;
}

const CABECERA = new Array(AC_WIDTH).fill('').map((_, i) => 'COL' + i);

function mov(nombre, qty, movId, tipo) {
  const r = new Array(AC_WIDTH).fill('');
  r[AC.TIMESTAMP] = new Date(2026, 8, 10);
  r[AC.CATEGORY]  = 'SEALANT/CAULK';
  r[AC.NAME]      = nombre;
  r[AC.QTY]       = qty;
  r[AC.UNIT]      = 'UNIT';
  r[AC.SRC_LOC]   = 'SR MM213';
  r[AC.MOVETYPE]  = tipo || 'EXIT';
  r[AC.MOV_ID]    = movId;
  return r;
}

/** Monta manageMaterialLocked_ de verdad sobre unas hojas de mentira. */
function montar(archivo, papelera, historico) {
  const hojas = { MASTER_ARCHIVE_V3: archivo, MOVEMENT_TRASH: papelera,
                  ARCHIVE_HISTORY: historico || null };
  const ctx = {
    console, JSON, Math, Date, String, Number, Array, Object,
    AC, AC_WIDTH, TR, TRASH_WIDTH,
    SHEETS: { ARCHIVE: 'MASTER_ARCHIVE_V3', ARCHIVE_HISTORY: 'ARCHIVE_HISTORY',
              TRASH: 'MOVEMENT_TRASH' },
    GONE_PREFIX: 'GONE|',
    Session: { getScriptTimeZone: () => 'America/Denver' },
    Utilities: { formatDate: (d) => String(d) },
    Logger: { log(){} },
    SpreadsheetApp: { getActiveSpreadsheet: () => ctx.ss },
    refrescos: 0,
    auditoria: [],
    ss: {
      getSheetByName: (n) => hojas[n] || null,
      insertSheet: (n) => { hojas[n] = hojaFalsa(n, [CABECERA.concat(['a','b','c'])], TRASH_WIDTH); return hojas[n]; }
    }
  };
  ctx.refreshOrDefer_        = function(){ ctx.refrescos++; };
  ctx.ensureArchiveHistorySheet_ = function(){
    if (!hojas.ARCHIVE_HISTORY) hojas.ARCHIVE_HISTORY = hojaFalsa('ARCHIVE_HISTORY', [CABECERA], AC_WIDTH);
    return hojas.ARCHIVE_HISTORY;
  };
  ctx.auditLog_              = function(_ss, tipo){ ctx.auditoria.push(tipo); };
  ctx.rewriteArchiveColumn_  = function(){ return 0; };
  ctx.requireAuth_           = function(){ return { email: 'jose@ox-glass.com', role: 'ADMIN' }; };
  ctx.requirePerm_           = function(){};
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, [
    'manageMaterialLocked_', 'findMovementById_', 'findTrashedById_',
    'ensureTrashSheet_', 'ensureArchiveWidth_', 'readWidth_', 'padRow_',
    'textSafeRow_', 'textCell_'
  ], {
    dobles: ['refreshOrDefer_', 'ensureArchiveHistorySheet_', 'auditLog_',
             'rewriteArchiveColumn_', 'requireAuth_', 'requirePerm_']
  }), ctx);
  ctx.hojas = hojas;
  return ctx;
}

const AUTH = { email: 'jose@ox-glass.com', role: 'ADMIN' };

/* ═══════════════════════════════════════════════════════════════════════════
   1. EL CICLO DE JOSE, sobre una hoja SANA (23 columnas)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. Borrar → restaurar → borrar, con la hoja del ancho correcto ═══\n');
{
  const archivo  = hojaFalsa('MASTER_ARCHIVE_V3',
    [CABECERA, mov('SR-MM213-TT-091026', 37, 'ID-A'), mov('OTRA COSA', 5, 'ID-B', 'ENTRY')], AC_WIDTH);
  const papelera = hojaFalsa('MOVEMENT_TRASH', [CABECERA.concat(['Deleted At','Deleted By','Came From'])], TRASH_WIDTH);
  const ctx = montar(archivo, papelera);

  ctx.manageMaterialLocked_({ op: 'deleteRow', movId: 'ID-A' }, AUTH);
  check('tras borrar: la papelera tiene 1', papelera.datos().length === 1, papelera.datos().length);
  check('tras borrar: el archivo ya no lo tiene', archivo.cuantasCon('ID-A') === 0);

  ctx.manageMaterialLocked_({ op: 'restoreMovement', movId: 'ID-A' }, AUTH);
  check('tras restaurar: la papelera queda VACÍA', papelera.datos().length === 0, papelera.datos().length);
  check('tras restaurar: el archivo lo tiene UNA vez', archivo.cuantasCon('ID-A') === 1, archivo.cuantasCon('ID-A'));
  check('tras restaurar: la cantidad NO se duplicó (37, no 74)',
        archivo.sumaQty('SR-MM213-TT-091026') === 37, archivo.sumaQty('SR-MM213-TT-091026'));

  ctx.manageMaterialLocked_({ op: 'deleteRow', movId: 'ID-A' }, AUTH);
  check('tras el segundo borrado: la papelera tiene 1, no 2',
        papelera.datos().length === 1, papelera.datos().length);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LA MISMA SECUENCIA SOBRE UNA HOJA ESTRECHA
   La hoja de Jose tenía 20 columnas el 26/09 — es el estado NORMAL de una
   instalación anterior a las columnas de precio. findMovementById_ se SALTA
   una hoja más estrecha que AC_WIDTH, y devuelve null como si el movimiento no
   existiera. Aquí se mira qué hacen las dos operaciones con ese null.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2. La misma secuencia sobre una hoja de 20 columnas ═══\n');
{
  const estrecha = (r) => r.slice(0, 20);
  const archivo  = hojaFalsa('MASTER_ARCHIVE_V3',
    [estrecha(CABECERA), estrecha(mov('SR-MM213-TT-091026', 37, 'ID-A'))], 20);
  const papelera = hojaFalsa('MOVEMENT_TRASH', [CABECERA.concat(['Deleted At','Deleted By','Came From'])], TRASH_WIDTH);
  const ctx = montar(archivo, papelera);

  let err = null;
  try { ctx.manageMaterialLocked_({ op: 'deleteRow', movId: 'ID-A' }, AUTH); }
  catch (e) { err = e.message; }

  // No se afirma cuál es el comportamiento bueno todavía: se REGISTRA, porque
  // es lo que hay que saber antes de decidir el arreglo.
  console.log('     → borrar sobre hoja estrecha:', err ? ('LANZA: ' + err) : 'no lanza');
  console.log('     → filas en la papelera:', papelera.datos().length);
  console.log('     → el archivo sigue teniendo el movimiento:', archivo.datos().length);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. RESTAURAR DOS VECES — el botón se pulsa otra vez porque tarda
   Jose: "al ver que se demoró mucho lo restauré".
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. Restaurar dos veces el mismo movimiento ═══\n');
{
  const archivo  = hojaFalsa('MASTER_ARCHIVE_V3', [CABECERA], AC_WIDTH);
  const papelera = hojaFalsa('MOVEMENT_TRASH',
    [CABECERA.concat(['Deleted At','Deleted By','Came From'])], TRASH_WIDTH);
  // Un movimiento ya en la papelera, como si lo hubiera borrado hace un rato.
  const enPapelera = mov('SR-MM213-TT-091026', 37, 'ID-A').concat([new Date(), 'jose@ox-glass.com', 'MASTER_ARCHIVE_V3']);
  papelera.getRange(2, 1, 1, TRASH_WIDTH).setValues([enPapelera]);

  const ctx = montar(archivo, papelera);
  ctx.manageMaterialLocked_({ op: 'restoreMovement', movId: 'ID-A' }, AUTH);

  let err2 = null;
  try { ctx.manageMaterialLocked_({ op: 'restoreMovement', movId: 'ID-A' }, AUTH); }
  catch (e) { err2 = e.message; }

  check('el segundo restaurar se NIEGA en vez de duplicar', !!err2, err2);
  check('el archivo lo tiene UNA sola vez', archivo.cuantasCon('ID-A') === 1, archivo.cuantasCon('ID-A'));
  check('la cantidad sigue siendo 37', archivo.sumaQty('SR-MM213-TT-091026') === 37,
        archivo.sumaQty('SR-MM213-TT-091026'));
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. DOS MOVIMIENTOS IDÉNTICOS, IDS DISTINTOS
   Es lo que se ve en la captura de Jose: dos líneas que dicen exactamente lo
   mismo. La lista de la papelera NO enseña el id, así que dos movimientos
   distintos e iguales por dentro son indistinguibles en pantalla.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4. Dos movimientos iguales con ids distintos ═══\n');
{
  const archivo  = hojaFalsa('MASTER_ARCHIVE_V3',
    [CABECERA, mov('SR-MM213-TT-091026', 37, 'ID-A'), mov('SR-MM213-TT-091026', 37, 'ID-B')], AC_WIDTH);
  const papelera = hojaFalsa('MOVEMENT_TRASH', [CABECERA.concat(['Deleted At','Deleted By','Came From'])], TRASH_WIDTH);
  const ctx = montar(archivo, papelera);

  ctx.manageMaterialLocked_({ op: 'deleteRow', movId: 'ID-A' }, AUTH);
  ctx.manageMaterialLocked_({ op: 'deleteRow', movId: 'ID-B' }, AUTH);

  check('la papelera tiene 2 líneas idénticas en pantalla', papelera.datos().length === 2);
  const ids = papelera.datos().map(r => String(r[AC.MOV_ID]));
  check('...pero son movimientos DISTINTOS (ids distintos)', ids[0] !== ids[1], ids);
  console.log('     → en pantalla las dos dicen: SR-MM213-TT-091026 · 37 UNIT · EXIT · SR MM213');
  console.log('     → y no hay nada que las distinga. Ids reales:', ids.join(' / '));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos, ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
