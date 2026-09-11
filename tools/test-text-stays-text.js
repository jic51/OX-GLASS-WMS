// UN PO# ESCRITO "07-6329" TIENE QUE SEGUIR SIENDO "07-6329".
//
// EL FALLO, encontrado por Jose el 2026-09-09 borrando tres movimientos y
// devolviéndolos desde la papelera:
//
//   Google Sheets PARSEA lo que se le da. setValues("07-6329") no guarda esos
//   ocho caracteres: lee "mes 07, año 6329", guarda el número 1617842 y le
//   cuelga un formato de fecha. El PO ya no está en la celda.
//
//   "07-6329"  →  copiado a MOVEMENT_TRASH  →  1617842  (una fecha, en silencio)
//   1617842    →  devuelto al archivo       →  un PO que nunca existió
//
// Palabras suyas: "está dando un dato que no existe y borrando uno que sí".
// Las dos mitades son ciertas, y la segunda es la peor: el PO de verdad no se
// puede sacar de la celda después, sólo de las otras filas que aún lo tienen.
//
// Él mismo lo demostró: 7/1/6329 y 1617842 son EL MISMO VALOR con dos formatos.
// Comprobado aquí abajo con la aritmética de Sheets, porque un arreglo basado
// en una corazonada sobre por qué pasó algo no es un arreglo.
//
// SU ALCANCE REAL ERA MAYOR QUE LA PAPELERA. El mismo setValues está en seis
// sitios: guardar, editar, copiar a la papelera, restaurar, y las dos mitades
// de la rotación de las 3am — más las tres hojas derivadas y las cuatro
// columnas del catálogo. La papelera fue sólo el primero en dispararse, porque
// las otras hojas de Jose son viejas y llevan formato de texto puesto a mano.
// UNA INSTALACIÓN NUEVA no lo lleva: ahí el archivo lo crea insertSheet, con
// formato automático, y el PO se habría roto en el primer guardado.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que un PO con forma de fecha sobreviva a guardar, editar, borrar,
//      restaurar y a la rotación nocturna. La ida y la vuelta, no una sola.
//   2. Que sobreviva DOS ciclos. Uno solo no distingue "no se rompe" de "se
//      rompe una vez y ya está roto".
//   3. Que los números y las fechas de verdad NO se conviertan en texto. La
//      cantidad tiene que seguir sumando y la fecha tiene que seguir ordenando.
//   4. Que la comilla NO forme parte del valor. Si se leyera "'07-6329", el
//      arreglo sería otro fallo con mejor pinta.
//   5. Que las hojas derivadas y el catálogo también estén cubiertos. Una
//      categoría escrita "3-4" convertida en fecha partiría un material en dos
//      y haría que las cantidades salgan mal, que es la peor versión de esto.
//
// LA HOJA FALSA DE AQUÍ PARSEA COMO SHEETS. Es la única parte que importa: una
// hoja de mentira que guardara las cadenas tal cual no podría enseñar este
// fallo jamás, y yo estaría midiendo mi propio invento en vez del producto.
//
// Uso:  node tools/test-text-stays-text.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function fnSrc(src, name){
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

const AC = (function(){
  const m = GS.match(/var AC = \{[\s\S]*?\n\};/);
  const c = vm.createContext({});
  vm.runInContext(m[0], c);
  return vm.runInContext('AC', c);
})();
const AC_WIDTH    = Number((GS.match(/var AC_WIDTH = (\d+);/) || [])[1]);
const TRASH_WIDTH = AC_WIDTH + 3;
const TR = { DELETED_AT: AC_WIDTH, DELETED_BY: AC_WIDTH + 1, FROM_SHEET: AC_WIDTH + 2 };

// ── PRIMERO: LA ARITMÉTICA QUE JOSE DEDUJO A OJO ────────────────────────────
// En Sheets una fecha ES un número: el día 0 es el 30 de diciembre de 1899.
// Si esto no cuadrara, todo el diagnóstico de abajo estaría mal.
console.log('\n═══ 7/1/6329 y 1617842 son el mismo valor ═══\n');
{
  const BASE = Date.UTC(1899, 11, 30);
  const serial = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - BASE) / 86400000);
  check('"07-6329" leído como mes-año da el serial 1617842, el número que vio Jose',
        serial(6329, 7, 1) === 1617842);
  check('"07-6593" da 1714267, el otro que encontró',
        serial(6593, 7, 1) === 1714267);
  // Y la otra mitad de su observación: no todo número es una fecha rota.
  check('en cambio 1234567 cae en día 15, no en día 1 — es un PO de verdad',
        new Date(BASE + 1234567 * 86400000).getUTCDate() === 15);
}

// ── UNA HOJA QUE PARSEA COMO SHEETS ─────────────────────────────────────────
// Modela lo que se observó: "MM-AAAA" y "M/D/AAAA" se convierten, y una comilla
// delante fuerza texto Y NO SE GUARDA. No pretende ser el parser entero de
// Sheets; pretende ser exacto en el caso que rompió los datos de Jose.
function comoSheets(v){
  if (typeof v !== 'string') return v;            // números y fechas ya vienen tipados
  if (v.charAt(0) === "'") return v.slice(1);     // texto literal, sin la comilla
  let m = /^(\d{1,2})-(\d{3,4})$/.exec(v);        // "07-6329" → 1 de julio de 6329
  if (m) return new Date(Date.UTC(Number(m[2]), Number(m[1]) - 1, 1));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])));
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v); // "12345" → el número 12345
  return v;
}

function Hoja(nombre, filas, maxCols){
  this.nombre = nombre;
  this.rows = filas.map(r => r.slice());
  this._maxCols = maxCols || 40;
}
Hoja.prototype.getName        = function(){ return this.nombre; };
Hoja.prototype.getLastRow     = function(){ return this.rows.length; };
Hoja.prototype.getMaxRows     = function(){ return Math.max(this.rows.length, 200); };
Hoja.prototype.getMaxColumns  = function(){ return this._maxCols; };
Hoja.prototype.insertColumnsAfter = function(a, n){ this._maxCols += n; };
Hoja.prototype.insertRowsAfter    = function(){};
Hoja.prototype.setFrozenRows  = function(){};
Hoja.prototype.deleteRow      = function(r){ this.rows.splice(r - 1, 1); };
Hoja.prototype.deleteRows     = function(r, n){ this.rows.splice(r - 1, n); };
Hoja.prototype.clearContents  = function(){ this.rows = []; };
Hoja.prototype.getDataRange   = function(){
  const self = this;
  return { getValues: () => self.rows.map(r => r.slice()) };
};
Hoja.prototype.getRange = function(r, c, nr, nc){
  const self = this; nr = nr || 1; nc = nc || 1;
  return {
    getValue: () => (self.rows[r - 1] || [])[c - 1],
    setValue(v){
      while (self.rows.length < r) self.rows.push([]);
      self.rows[r - 1][c - 1] = comoSheets(v);
      return { setFontWeight: () => {} };
    },
    getValues(){
      const out = [];
      for (let i = 0; i < nr; i++) {
        const row = self.rows[r - 1 + i] || [];
        const s = [];
        for (let j = 0; j < nc; j++) s.push(row[c - 1 + j] !== undefined ? row[c - 1 + j] : '');
        out.push(s);
      }
      return out;
    },
    setValues(vals){
      for (let i = 0; i < vals.length; i++) {
        while (self.rows.length <= r - 1 + i) self.rows.push([]);
        for (let j = 0; j < vals[i].length; j++) {
          self.rows[r - 1 + i][c - 1 + j] = comoSheets(vals[i][j]);
        }
      }
    },
    clearContent(){
      for (let i = 0; i < nr; i++) {
        const row = self.rows[r - 1 + i];
        if (!row) continue;
        for (let j = 0; j < nc; j++) row[c - 1 + j] = '';
      }
    },
    setNumberFormat(){ return this; },
    setFontWeight(){ return this; }
  };
};

const PO_ROTO = '07-6329';

function fila(id, po, qty){
  const r = new Array(AC_WIDTH).fill('');
  r[AC.TIMESTAMP] = new Date(1757000000000);
  r[AC.CATEGORY]  = 'WINDOW';
  r[AC.NAME]      = 'SUNBRIDGE PHASE 1';
  r[AC.PO]        = po;
  r[AC.QTY]       = qty === undefined ? 125 : qty;
  r[AC.UNIT]      = 'UNIT';
  r[AC.MOVETYPE]  = 'ENTRY';
  r[AC.DEST_LOC]  = 'B6A';
  r[AC.DATE_REC]  = new Date(1755000000000);
  r[AC.MOV_ID]    = id;
  return r;
}

function mundo(){
  const cab = new Array(AC_WIDTH).fill('');
  cab[AC.PO] = 'Po#'; cab[AC.NAME] = 'Name';
  const archive = new Hoja('MASTER_ARCHIVE_V3', [cab, fila('M-UNO', PO_ROTO)]);
  const history = new Hoja('ARCHIVE_HISTORY', [cab]);
  const hojas = { 'MASTER_ARCHIVE_V3': archive, 'ARCHIVE_HISTORY': history };
  const auditadas = [];

  const c = vm.createContext({
    Date, Math, String, Number, JSON, Array, Object, console,
    AC, AC_WIDTH, TR, TRASH_WIDTH,
    SHEETS: { ARCHIVE:'MASTER_ARCHIVE_V3', ARCHIVE_HISTORY:'ARCHIVE_HISTORY', TRASH:'MOVEMENT_TRASH' },
    Session: { getScriptTimeZone: () => 'UTC' },
    SpreadsheetApp: { getActiveSpreadsheet: () => c.ss },
    Utilities: { formatDate: () => 'Sep 9, 10:45 AM' },
    auditLog_: function(){ auditadas.push(Array.prototype.slice.call(arguments, 1)); },
    refreshDerivedSheets_: function(){},
    rewriteArchiveColumn_: () => 0,
    ss: {
      getSheetByName: (n) => hojas[n] || null,
      insertSheet: (n) => { hojas[n] = new Hoja(n, [[]]); return hojas[n]; }
    }
  });
  vm.runInContext([
    fnSrc(GS, 'textCell_'), fnSrc(GS, 'textSafeRow_'),
    fnSrc(GS, 'padRow_'), fnSrc(GS, 'readWidth_'), fnSrc(GS, 'ensureArchiveWidth_'),
    fnSrc(GS, 'ensureTrashSheet_'), fnSrc(GS, 'findMovementById_'),
    fnSrc(GS, 'findTrashedById_'), fnSrc(GS, 'ensureArchiveHistorySheet_'),
    fnSrc(GS, 'manageMaterialLocked_')
  ].join('\n'), c);

  return {
    ctx: c, hojas,
    op: (data) => vm.runInContext(
      'manageMaterialLocked_(' + JSON.stringify(data) + ', { email:"jose@ox.com", role:"ADMIN" })', c)
  };
}

// appendRow: la hoja falsa no la tenía porque hasta ahora nada de lo que se
// medía aquí la usaba. addIncoming sí — y ésa es media explicación de por qué
// el fallo del PO sobrevivió en Incoming mientras el archivo quedaba protegido.
Hoja.prototype.appendRow = function(vals){
  this.getRange(this.rows.length + 1, 1, 1, vals.length).setValues([vals]);
};

function poDe(hoja, movId){
  const f = hoja.rows.find(r => r && r[AC.MOV_ID] === movId);
  return f ? f[AC.PO] : undefined;
}

// ── LA HOJA FALSA SE PORTA MAL, QUE ES SU TRABAJO ───────────────────────────
console.log('\n═══ la hoja de prueba parsea como Sheets (si no, esto no mide nada) ═══\n');
{
  const h = new Hoja('X', [[]]);
  h.getRange(1, 1, 1, 1).setValues([[PO_ROTO]]);
  check('sin protección, "07-6329" se convierte en fecha — el fallo, reproducido',
        h.rows[0][0] instanceof Date && h.rows[0][0].getUTCFullYear() === 6329);
  h.getRange(2, 1, 1, 1).setValues([["'" + PO_ROTO]]);
  check('con la comilla delante, se guarda el texto',            h.rows[1][0] === PO_ROTO);
  check('Y LA COMILLA NO FORMA PARTE DEL VALOR — si formara parte, el arreglo ' +
        'sería otro fallo con mejor pinta',                       h.rows[1][0].charAt(0) !== "'");
}

console.log('\n═══ textCell_: qué toca y qué no ═══\n');
{
  const c = vm.createContext({ Date, String, Number, Array, Object });
  vm.runInContext(fnSrc(GS, 'textCell_') + '\n' + fnSrc(GS, 'textSafeRow_'), c);
  const call = (v) => { c.__v = v; return vm.runInContext('textCell_(__v)', c); };

  check('una cadena se protege',                       call(PO_ROTO) === "'" + PO_ROTO);
  check('una cadena vacía se queda vacía',             call('') === '');
  check('null se vuelve cadena vacía',                 call(null) === '');
  check('UN NÚMERO NO SE TOCA — la cantidad tiene que seguir sumando',
        call(125) === 125 && typeof call(125) === 'number');
  check('UNA FECHA NO SE TOCA — el archivo se ordena por ella',
        call(new Date(1757000000000)) instanceof Date);
  check('un booleano no se toca',                      call(true) === true);

  c.__r = [new Date(1757000000000), 'WINDOW', 125, '', PO_ROTO];
  const out = vm.runInContext('textSafeRow_(__r)', c);
  check('en una fila entera, sólo cambian las cadenas',
        out[0] instanceof Date && out[1] === "'WINDOW" && out[2] === 125 &&
        out[3] === '' && out[4] === "'" + PO_ROTO);
}

// ── EL CAMINO QUE ROMPIÓ LOS DATOS DE JOSE ──────────────────────────────────
console.log('\n═══ borrar y restaurar: la ida y la vuelta ═══\n');
{
  const m = mundo();
  check('de entrada, el PO está bien en el archivo',
        poDe(m.hojas['MASTER_ARCHIVE_V3'], 'M-UNO') === PO_ROTO);

  m.op({ op: 'deleteRow', movId: 'M-UNO' });
  check('EN LA PAPELERA SIGUE SIENDO TEXTO — aquí es donde se rompió',
        poDe(m.hojas['MOVEMENT_TRASH'], 'M-UNO') === PO_ROTO);

  m.op({ op: 'restoreMovement', movId: 'M-UNO' });
  check('y vuelve al archivo igual que salió',
        poDe(m.hojas['MASTER_ARCHIVE_V3'], 'M-UNO') === PO_ROTO);
  check('no volvió como fecha',
        !(poDe(m.hojas['MASTER_ARCHIVE_V3'], 'M-UNO') instanceof Date));
  check('ni como el número 1617842, que es lo que Jose vio en la fila 1042',
        poDe(m.hojas['MASTER_ARCHIVE_V3'], 'M-UNO') !== 1617842);
}

{
  // Un ciclo solo no distingue "no se rompe" de "se rompe una vez y ya está".
  const m = mundo();
  for (let i = 0; i < 2; i++){
    m.op({ op: 'deleteRow',       movId: 'M-UNO' });
    m.op({ op: 'restoreMovement', movId: 'M-UNO' });
  }
  check('dos ciclos completos y sigue intacto',
        poDe(m.hojas['MASTER_ARCHIVE_V3'], 'M-UNO') === PO_ROTO);
}

{
  // Lo que NO debe protegerse: la fila entera viaja, no sólo el PO.
  const m = mundo();
  const antes = m.hojas['MASTER_ARCHIVE_V3'].rows[1];
  const qty = antes[AC.QTY], ts = antes[AC.TIMESTAMP];
  m.op({ op: 'deleteRow',       movId: 'M-UNO' });
  m.op({ op: 'restoreMovement', movId: 'M-UNO' });
  const f = m.hojas['MASTER_ARCHIVE_V3'].rows.find(r => r[AC.MOV_ID] === 'M-UNO');
  check('la cantidad vuelve como número, no como texto',
        f[AC.QTY] === qty && typeof f[AC.QTY] === 'number');
  check('la fecha del sistema vuelve como fecha',
        f[AC.TIMESTAMP] instanceof Date && f[AC.TIMESTAMP].getTime() === ts.getTime());
  check('la fecha de recepción también',            f[AC.DATE_REC] instanceof Date);
}

// ── LOS OTROS CINCO SITIOS ──────────────────────────────────────────────────
console.log('\n═══ los demás caminos que escriben una fila ═══\n');
{
  const sitios = [
    ['guardar movimientos nuevos',    /setValues\(newRows\.map\(textSafeRow_\)\)/],
    ['la rotación de las 3am (activo)',   /setValues\(newActive\.map\(textSafeRow_\)\)/],
    ['la rotación de las 3am (historial)',/setValues\(newHistory\.map\(textSafeRow_\)\)/],
    ['copiar a la papelera',          /setValues\(\[textSafeRow_\(saved\)\]\)/],
    ['restaurar',                     /setValues\(\[textSafeRow_\(restored\)\]\)/],
    ['editar un movimiento',          /setValues\(\[textSafeRow_\(rowVals\)\]\)/],
    ['LIVE_STOCK',                    /setValues\(liveRows\.map\(textSafeRow_\)\)/],
    ['SITE_STOCK',                    /setValues\(siteRows\.map\(textSafeRow_\)\)/],
    ['WASTED_STOCK',                  /setValues\(wasteRows\.map\(textSafeRow_\)\)/],
    ['el catálogo (categorías, proyectos, proveedores, locaciones)',
                                      /\[textCell_\(v\)\]/]
  ];
  sitios.forEach(([nombre, re]) => check('protegido: ' + nombre, re.test(GS)));

  // Y que no quede ninguno suelto. Esta es la comprobación que sobrevive a que
  // alguien añada un séptimo sitio dentro de un año.
  const sueltos = GS.split('\n').filter(l =>
    /\.setValues\(/.test(l) &&
    !/textSafeRow_|textCell_/.test(l) &&
    /newRows|newActive|newHistory|saved|restored|rowVals|liveRows|siteRows|wasteRows/.test(l));
  check('no queda ninguna escritura de filas sin proteger', sueltos.length === 0);
}

// ── LA ENTREGA ESPERADA: EL SITIO DONDE UNA PERSONA TECLEA EL PO A MANO ──────
//
// Jose, 2026-09-11, con cuatro capturas: escribió el PO "08-4885" en una
// entrega esperada, guardó, volvió a abrirla y el campo estaba VACÍO. Lo
// escribió otra vez, y otra vez.
//
// ES EL MISMO FALLO DE ESTE ARCHIVO, EN UN SITIO DONDE NO SE CABLEÓ. La v11.63
// protegió el archivo, la papelera, el histórico y CONFIG; addIncoming y
// updateIncoming se quedaron fuera — y son justo las dos pantallas donde una
// persona escribe un PO con los dedos.
//
// sheetSafe_ no bastaba y conviene entender por qué, porque el nombre engaña:
// protege de las FÓRMULAS (= + - @), no del parseo de fechas. "08-4885" empieza
// por un cero, así que pasaba limpio, y Sheets lo guardaba como "mes 08, año
// 4885". Al leerlo, safeStr_ ve un Date y devuelve '' — las dos mitades que
// Jose ya había descrito: "está dando un dato que no existe y borrando uno que
// sí".
//
// Se ejercitan las funciones DE VERDAD contra una hoja que parsea como Sheets.
// Comprobar que el código "menciona textSafeRow_" habría pasado con la llamada
// puesta en el sitio equivocado.
console.log('\n═══ el PO de una entrega esperada sobrevive a ida y vuelta ═══\n');
{
  const PO_INC = '08-4885';          // el de Jose, tal cual

  function mundoInc(){
    const cab = new Array(17).fill('');
    const inc = new Hoja('INCOMING_V3', [cab]);
    const c = vm.createContext({
      Date, Math, String, Number, JSON, Array, Object, console,
      Session: { getScriptTimeZone: () => 'UTC' },
      Utilities: { formatDate: (d) => '2026-09-11' },
      Logger: { log: () => {} },
      SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => inc }) },
      ensureIncomingSheet_: () => inc,
      getUserRole: () => ({ role: 'ADMIN', email: 'jose@ox.com' }),
      uploadIncomingDoc_: () => '',
      INCOMING_STATUSES: ['Pending', 'Arrived', 'Cancelled']
    });
    // La constante se levanta DEL ARCHIVO, no se copia aquí: una copia a mano
    // se queda vieja sin avisar.
    vm.runInContext(/var INCOMING_DATE_MODES = [^;]+;/.exec(GS)[0], c);
    vm.runInContext([
      fnSrc(GS, 'textCell_'), fnSrc(GS, 'textSafeRow_'), fnSrc(GS, 'sheetSafe_'),
      fnSrc(GS, 'safeStr_'), fnSrc(GS, 'incomingStatus_'),
      fnSrc(GS, 'incomingDateMode_'), fnSrc(GS, 'incomingDateCell_'),
      fnSrc(GS, 'incomingCellDate_'),
      fnSrc(GS, 'addIncoming'), fnSrc(GS, 'updateIncoming')
    ].join('\n'), c);
    return {
      inc,
      añadir: (d) => vm.runInContext('addIncoming(' + JSON.stringify(d) + ')', c),
      editar: (d) => vm.runInContext('updateIncoming(' + JSON.stringify(d) + ')', c),
      // Cómo lo leería getIncoming: la misma línea, columna 7.
      poLeido: () => { c.__v = inc.rows[1][7]; return vm.runInContext('safeStr_(__v)', c); }
    };
  }

  const m = mundoInc();
  const r = m.añadir({ name: 'SGD-MISC-A.Sultz-MO', category: 'WINDOW', qty: 2,
                       unit: 'UNIT', supplier: 'AMSCO', po: PO_INC,
                       estDate: '2026-09-11', dateMode: 'exact', status: 'Pending' });
  check('la celda del PO guarda TEXTO, no una fecha — que es lo que Sheets ' +
        'habría hecho con "08-4885" sin protección',
    typeof m.inc.rows[1][7] === 'string' && !(m.inc.rows[1][7] instanceof Date),
    m.inc.rows[1][7]);
  check('...y al leerla vuelve el PO que Jose escribió, no una cadena vacía',
    m.poLeido() === PO_INC, m.poLeido());

  // Y editar sin tocar el PO no puede perderlo: es el paso 3 de sus capturas.
  m.editar({ id: r.id, name: 'SGD-MISC-A.Sultz-MO', category: 'WINDOW', qty: 2,
             unit: 'UNIT', supplier: 'AMSCO', po: PO_INC,
             estDate: '2026-09-11', dateMode: 'exact', status: 'Arrived' });
  check('y sobrevive también al EDITAR — que es donde Jose lo vio desaparecer ' +
        'por segunda vez', m.poLeido() === PO_INC, m.poLeido());

  check('el nombre del material también va protegido: "3-4 TEMP" es un nombre ' +
        'real y Sheets lo leería como una fecha',
    /textSafeRow_/.test(fnSrc(GS, 'addIncoming')) &&
    /textSafeRow_/.test(fnSrc(GS, 'updateIncoming')));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
process.exit(fail ? 1 : 0);
