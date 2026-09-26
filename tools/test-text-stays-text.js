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
const A    = require('./andamio.js');
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
// La usa rewriteArchiveColumn_ para saber cuánto ancho leer. Faltaba, y sin
// ella la ida y vuelta por columna no se podía ejercitar aquí en absoluto.
Hoja.prototype.getLastColumn  = function(){
  return this.rows.reduce(function(m, r){ return Math.max(m, r.length); }, 0);
};
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
    refreshOrDefer_: function(){},   // v11.89: el portero del refresco
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
    /* LAS DOS MITADES DE LA ROTACIÓN DE LAS 3AM PASAN AHORA POR UN SOLO SITIO.
     *
     * Aquí se buscaban los dos `setValues` a pelo —`newActive.map(textSafeRow_)`
     * y `newHistory.map(...)`— y dejaron de existir el 26 de septiembre de 2026,
     * cuando esas dos escrituras se unificaron en `escribirHojaCompleta_` para
     * arreglar el desastre del trabajo nocturno (ver test-archivo-nocturno.js).
     *
     * La protección NO se perdió: vive dentro de esa función, y ahora en un solo
     * sitio en vez de dos. Debajo se comprueba además que las dos mitades sigan
     * entrando por ahí, que es lo que la unificación puso en juego. */
    ['la rotación de las 3am (el escritor compartido)',
                                      /setValues\(filas\.map\(textSafeRow_\)\)/],
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

  check('las dos mitades de las 3am entran por el escritor protegido',
        /escribirHojaCompleta_\(history, newHistory/.test(GS) &&
        /escribirHojaCompleta_\(archive, newActive/.test(GS));

  // Y que no quede ninguno suelto. Esta es la comprobación que sobrevive a que
  // alguien añada un séptimo sitio dentro de un año.
  /* SOBRE CÓDIGO, NO SOBRE COMENTARIOS. El comentario que explica el desastre
   * del trabajo nocturno CITA la línea vieja —`...setValues(); // ESCRIBIR`— y
   * este barrido la encontraba y la denunciaba como una escritura sin proteger.
   * Es el mismo error que cometieron otras dos pruebas el mismo día. */
  const sueltos = A.sinComentarios(GS).split('\n').filter(l =>
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
// sheetSafe_ no bastaba y conviene entender por qué, porque el nombre engañaba:
// protegía de las FÓRMULAS (= + - @), no del parseo de fechas. "08-4885"
// empieza por un cero, así que pasaba limpio, y Sheets lo guardaba como "mes
// 08, año 4885". Al leerlo, safeStr_ ve un Date y devuelve '' — las dos mitades
// que Jose ya había descrito: "está dando un dato que no existe y borrando uno
// que sí".
//
// EL 2026-09-14 sheetSafe_ SE BORRÓ. Mientras existieran los dos, cada sitio
// nuevo era una elección entre el guardián fuerte y el débil, y esa elección se
// hace una vez por sitio y para siempre: cuarenta y seis sitios habían elegido
// el débil. textCell_ cubre las fórmulas enteras (pone comilla a TODA cadena,
// incluidas las cuatro), así que borrarlo no perdió nada — perdió la
// posibilidad de volver a elegir mal.
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
      fnSrc(GS, 'textCell_'), fnSrc(GS, 'textSafeRow_'),
      fnSrc(GS, 'safeStr_'), fnSrc(GS, 'incomingStatus_'),
      fnSrc(GS, 'incomingDateMode_'), fnSrc(GS, 'incomingDateCell_'),
      fnSrc(GS, 'incomingCellDate_'),
      // v12.06: addIncoming y updateIncoming normalizan el nombre y la
      // categoría con la misma cleanDisplay_ que un movimiento. Sin ella en el
      // contexto las dos revientan — que es lo que pasó el día del cambio. Por
      // eso esta lista se escribe a mano: dice exactamente de qué depende este
      // mundo de mentira, y se queja cuando el producto gana una dependencia.
      fnSrc(GS, 'cleanDisplay_'),
      // withStockLock_ de mentira: desde la v11.85 las tres acciones de
      // entregas esperadas van dentro del candado. Aquí sólo hace falta que
      // deje pasar — lo que el candado impide se mide en
      // test-carrera-incoming.js, que es su sitio.
      'function withStockLock_(fn){ return fn(); }',
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

// ── LA IDA Y VUELTA POR COLUMNA ─────────────────────────────────────────────
//
// Encontrado el 2026-09-14 revisando los 46 sitios de sheetSafe_, y resultó ser
// más grande que los 46: rewriteArchiveColumn_ LEE UNA COLUMNA ENTERA Y LA
// VUELVE A ESCRIBIR ENTERA.
//
// La comilla que protege una celda es un formato, no parte del valor —
// getValues() devuelve "07-6329", nunca "'07-6329", y eso está escrito en el
// propio textCell_. Así que la columna salía protegida de la hoja y volvía
// desnuda, y Sheets la masticaba otra vez.
//
// LO GRAVE NO ES LA FILA QUE SE CAMBIA, ES LA QUE NO. La rama de abajo
// —out.push([rows[i][col]])— reescribe las filas que nadie tocó. O sea: para
// perder un material llamado "07-6329" no hacía falta tocarlo; bastaba
// renombrar CUALQUIER otro material de la misma columna.
//
// Siete acciones normales pasan por aquí: renombrar un material, cambiarle la
// categoría, fusionar dos materiales, renombrar una categoría, fusionar
// proyectos, fusionar proveedores, fusionar locaciones, y los arreglos de
// "Check my data".
//
// Se prueba con la función DE VERDAD contra la hoja que parsea como Sheets. Una
// aserción sobre el texto del código no habría distinguido las dos ramas, y la
// rama que importa es justo la que no cambia nada.
console.log('\n═══ renombrar un material no puede borrar otro ═══\n');
{
  const c = vm.createContext({ Date, String, Number, Math, Array, Object, console });
  vm.runInContext([fnSrc(GS, 'textCell_'), fnSrc(GS, 'textSafeRow_'),
                   fnSrc(GS, 'safeStr_'),
                   fnSrc(GS, 'rewriteArchiveColumn_')].join('\n'), c);
  c.Hoja = Hoja;

  // Dos materiales en la misma columna. Sólo se renombra el primero.
  const cab = new Array(AC_WIDTH).fill('');
  const f1 = fila('M-UNO', '');  f1[AC.NAME] = 'VIEJO';
  const f2 = fila('M-DOS', '');  f2[AC.NAME] = PO_ROTO;   // "07-6329" como NOMBRE

  // Las filas ENTRAN por donde entran de verdad: textSafeRow_ y luego un
  // setValues que la hoja falsa parsea como Sheets. Meterlas directas en el
  // constructor habría dejado la comilla dentro del valor —cosa que en Sheets
  // no pasa nunca— y la prueba habría medido otra cosa. Primer intento de esta
  // sección, corregido.
  const hoja = new Hoja('MASTER_ARCHIVE_V3', [cab]);
  [f1, f2].forEach(function(r, i){
    c.__r = r;
    hoja.getRange(2 + i, 1, 1, AC_WIDTH)
        .setValues([vm.runInContext('textSafeRow_(__r)', c)]);
  });

  // Comprobamos que el punto de partida es sano antes de medir el daño.
  const antes = hoja.rows[2][AC.NAME];
  check('punto de partida: un material llamado "07-6329" está guardado como ' +
        'TEXTO, que es lo que hace textSafeRow_ al escribirlo',
    typeof antes === 'string' && antes === PO_ROTO, antes);

  // EL CONTRATO: el que decide devuelve el valor CRUDO, y rewriteArchiveColumn_
  // pone la comilla. Citar en los dos sitios deja DOS comillas, la hoja se come
  // una y guarda la otra DENTRO del valor — el material pasaría a llamarse
  // "'NUEVO". Eso es exactamente lo que hizo el primer intento de este arreglo,
  // porque los seis llamadores ya venían citando; esta aserción es la que lo
  // cazó, y por eso sigue aquí.
  c.__hoja = hoja; c.__col = AC.NAME;
  vm.runInContext(
    'rewriteArchiveColumn_(__hoja, __col, function(row){' +
    '  return String(row[__col] || "") === "VIEJO" ? "NUEVO" : null; })', c);

  check('lo que se pidió cambiar, cambió', hoja.rows[1][AC.NAME] === 'NUEVO',
    hoja.rows[1][AC.NAME]);
  check('...y sin una comilla pegada delante — citar dos veces guarda la ' +
        'segunda DENTRO del dato',
    String(hoja.rows[1][AC.NAME]).charAt(0) !== "'", hoja.rows[1][AC.NAME]);

  // Y que los llamadores de verdad cumplan el contrato. Sin esto, la prueba
  // mediría una función que nadie usa así.
  ['mergeLocationsLocked_', 'mergeConfigValuesLocked_', 'manageMaterialLocked_',
   'dqFillGapLocked_'].forEach(function(fn){
    const src = fnSrc(GS, fn);
    check(fn + ' entrega el valor crudo al reescritor, no uno ya citado',
      !/=\s*textCell_\(/.test(src.replace(/\n\s*\/\/[^\n]*/g, '')), fn);
  });

  // LA ASERCIÓN DEL FALLO. Antes de este arreglo, aquí había un Date.
  const despues = hoja.rows[2][AC.NAME];
  check('y el material que NADIE tocó sigue llamándose "07-6329" — no se ' +
        'convirtió en fecha de camino',
    despues === PO_ROTO, despues);
  check('...o sea que no es un Date, que es lo que era antes del arreglo',
    !(despues instanceof Date), despues);

  // Y la mitad que lo convierte en pérdida de datos y no en un dato feo.
  c.__v = despues;
  check('...y por tanto la app lo sigue leyendo: safeStr_ devuelve un Date ' +
        'como cadena VACÍA, así que el material habría desaparecido del stock',
    vm.runInContext('safeStr_(__v)', c) === PO_ROTO);

  // DOS VUELTAS. Una sola no distingue "no se rompe" de "se rompe una vez".
  vm.runInContext(
    'rewriteArchiveColumn_(__hoja, __col, function(row){' +
    '  return String(row[__col] || "") === "NUEVO" ? textCell_("OTRO") : null; })', c);
  check('sobrevive a una SEGUNDA reescritura de la misma columna',
    hoja.rows[2][AC.NAME] === PO_ROTO, hoja.rows[2][AC.NAME]);
}

console.log('\n═══ y el guardián débil ya no está para elegirlo ═══\n');
{
  // Mientras existieran los dos, cada sitio nuevo era una elección, y la
  // elección se hace una vez y para siempre. Que no se pueda volver a hacer
  // mal es la mitad duradera de este arreglo.
  check('sheetSafe_ ya no se define en ninguna parte',
    !/^function sheetSafe_\s*\(/m.test(GS));
  check('...y nadie lo llama', !/\bsheetSafe_\(/.test(GS));
  check('la razón por la que existía —las fórmulas— quedó escrita donde estaba, ' +
        'para que nadie la vuelva a descubrir desde cero',
    /inyecci[oó]n de f[oó]rmulas/i.test(GS) && /IMPORTXML/.test(GS));
  check('...y textCell_ de verdad cubre esas cuatro: pone comilla a TODA cadena',
    (function(){
      const c2 = vm.createContext({ String });
      vm.runInContext(fnSrc(GS, 'textCell_'), c2);
      c2.__x = '=IMPORTXML("evil","//x")';
      return vm.runInContext('textCell_(__x)', c2).charAt(0) === "'";
    })());

  // Los otros dos round trips que se taparon el mismo día.
  check('renameIncomingCategory_ también vuelve a la hoja con la comilla puesta',
    /textCell_/.test(fnSrc(GS, 'renameIncomingCategory_')));
  check('saveMaterialPack protege sus dos escrituras — PACKS guarda categoría y ' +
        'nombre de material, y no tenía ni la protección débil',
    (fnSrc(GS, 'saveMaterialPack').match(/textSafeRow_\(row\)/g) || []).length === 2);
  check('writeMovIdColumn_ tampoco reescribe la columna de ids sin comilla',
    /textCell_/.test(fnSrc(GS, 'writeMovIdColumn_')));
}

// ── EL GUARDADO, DE PUNTA A PUNTA ───────────────────────────────────────────
//
// ESTE ARCHIVO DEJÓ PASAR UN FALLO EN LA v11.81, Y HAY QUE DECIR POR QUÉ.
//
// Su cabecera promete, punto 4: "que la comilla NO forme parte del valor". Y lo
// comprobaba... sobre la hoja falsa suelta, escribiéndole "'07-6329" a mano.
// El CAMINO DE GUARDADO no lo ejecutaba nunca: lo miraba por el texto del
// código, buscando que apareciera textSafeRow_.
//
// Así que cuando addMovementsBatch_ pasó a citar DOS veces —textCell_ en cada
// valor al construir la fila, y textSafeRow_ otra vez al escribirla— esta
// prueba siguió verde. Jose lo encontró en su historial: 'WINDOW, 'JOSE JOSE,
// 'UNIT, '16598, '16598, 'B. Una comilla guardada DENTRO del dato.
//
// Y no era un detalle estético: el matId se compone de categoría y nombre, así
// que "'WINDOW|||'JOSE JOSE" no es el mismo material que "WINDOW|||JOSE JOSE".
// Las existencias se parten en dos sin que nadie lo pida.
//
// Lo que sigue EJECUTA el bloque real que arma la fila —sacado del archivo, no
// copiado— y la escribe con la línea real, contra la hoja que parsea como
// Sheets. Lo que se afirma es lo que quedó en la celda.
console.log('\n═══ lo que se guarda es lo que se escribió, sin comillas ═══\n');
{
  const ini = GS.indexOf('      var row = new Array(AC_WIDTH);');
  const fin = GS.indexOf('newRows.push(row);', ini);
  const armar = GS.slice(ini, fin + 'newRows.push(row);'.length);
  check('el bloque que arma la fila se pudo sacar del archivo', ini !== -1 && fin !== -1);

  const escribir = (GS.match(/archive\.getRange\(startRow, 1, newRows\.length, AC_WIDTH\)\.setValues\([^;]+\);/) || [])[0];
  check('...y la línea que la escribe también', !!escribir);

  const cab = new Array(AC_WIDTH).fill('');
  const archive = new Hoja('MASTER_ARCHIVE_V3', [cab]);

  const c = vm.createContext({
    Date, String, Number, Math, Array, Object, JSON, console,
    AC, AC_WIDTH, archive, startRow: 2, newRows: [],
    now: new Date(1757000000000), tzDate: new Date(1755000000000),
    qty: 25, statusVal: 'In Stock', mt: 'ENTRY',
    src: '', dest: 'B', proj: '', matId: 'WINDOW|||JOSE JOSE',
    unitCost: null, totalCost: null, takenIds: {},
    auth: { email: 'jose@ox-glass.com' },
    cleanDisplay_: (v) => String(v || '').toUpperCase().trim().replace(/\s+/g, ' '),
    uniqueMovId_: () => 'M-0001',
    // Los datos tal como los tecleó Jose en la captura que lo encontró.
    d: { category: 'WINDOW', name: 'JOSE JOSE', gc: '', po: '16598',
         unit: 'UNIT', supplier: '', comments: '', responsible: '', pm: '',
         dateRec: new Date(1757000000000) }
  });
  vm.runInContext(fnSrc(GS, 'textCell_') + '\n' + fnSrc(GS, 'textSafeRow_') + '\n' +
                  fnSrc(GS, 'safeStr_'), c);
  vm.runInContext('(function(){' + armar + '})();', c);
  vm.runInContext(escribir, c);

  const fila = archive.rows[1];
  const leer = (col) => { c.__v = fila[col]; return vm.runInContext('safeStr_(__v)', c); };

  // LAS ASERCIONES DEL FALLO DE JOSE, una por cada cosa que él vio con comilla.
  check('la categoría se guarda sin comilla delante', leer(AC.CATEGORY) === 'WINDOW', fila[AC.CATEGORY]);
  check('el nombre del material tampoco', leer(AC.NAME) === 'JOSE JOSE', fila[AC.NAME]);
  check('la unidad tampoco', leer(AC.UNIT) === 'UNIT', fila[AC.UNIT]);
  check('el PO tampoco', leer(AC.PO) === '16598', fila[AC.PO]);
  check('el estante de destino tampoco', leer(AC.DEST_LOC) === 'B', fila[AC.DEST_LOC]);

  // Y LA QUE CONVIERTE ESTO EN PÉRDIDA DE DATOS Y NO EN FEALDAD.
  check('el MatID guardado es el mismo que compone getMaterialId — con comilla ' +
        'sería otro material, y las existencias se partirían en dos',
    leer(AC.MAT_ID) === 'WINDOW|||JOSE JOSE', fila[AC.MAT_ID]);

  // Ninguna celda de texto puede empezar por comilla. Dicho como invariante y
  // no como lista, para que valga también para las columnas que se añadan.
  const conComilla = [];
  for (let k2 = 0; k2 < AC_WIDTH; k2++){
    if (typeof fila[k2] === 'string' && fila[k2].charAt(0) === "'") conComilla.push(k2);
  }
  check('NINGUNA celda de la fila guardada empieza por comilla',
    conComilla.length === 0, conComilla);

  // Y la otra mitad, que es la razón de que todo esto exista: un PO con forma
  // de fecha sigue siendo texto, no una fecha.
  const c2 = vm.createContext(Object.assign({}, {
    Date, String, Number, Math, Array, Object, JSON, console,
    AC, AC_WIDTH, archive: new Hoja('A', [cab]), startRow: 2, newRows: [],
    now: new Date(1757000000000), tzDate: new Date(1755000000000),
    qty: 25, statusVal: 'In Stock', mt: 'ENTRY',
    src: '', dest: 'B', proj: '', matId: 'WINDOW|||X',
    unitCost: null, totalCost: null, takenIds: {},
    auth: { email: 'jose@ox' },
    cleanDisplay_: (v) => String(v || '').toUpperCase().trim().replace(/\s+/g, ' '),
    uniqueMovId_: () => 'M-0002',
    d: { category: 'WINDOW', name: 'X', gc: '', po: PO_ROTO, unit: 'UNIT',
         supplier: '', comments: '', responsible: '', pm: '',
         dateRec: new Date(1757000000000) }
  }));
  vm.runInContext(fnSrc(GS, 'textCell_') + '\n' + fnSrc(GS, 'textSafeRow_') + '\n' +
                  fnSrc(GS, 'safeStr_'), c2);
  vm.runInContext('(function(){' + armar + '})();', c2);
  vm.runInContext(escribir.replace('archive.', 'archive.'), c2);
  const po = c2.archive.rows[1][AC.PO];
  check('y un PO con forma de fecha sigue siendo el texto que se escribió',
    po === PO_ROTO, po);
  check('...no una fecha', !(po instanceof Date));
}

// ── NADIE CITA DOS VECES ────────────────────────────────────────────────────
//
// TERCERA VEZ QUE EL MISMO FALLO SALE POR OTRA PUERTA, y por eso deja de
// buscarse a mano y pasa a contarse.
//
//   1. rewriteArchiveColumn_ — los llamadores citaban y el reescritor volvía a
//      citar. Lo cacé escribiendo su prueba.
//   2. addMovementsBatch_    — trece valores citados y la fila citada otra vez.
//      Lo encontró Jose en su historial: 'WINDOW, 'JOSE JOSE, 'UNIT, '16598.
//   3. modifyMovementLocked_ — el campo editado citado y la fila citada otra
//      vez. Lo encontró Jose OTRA VEZ, al día siguiente, editando un nombre:
//      'JOSE I. Mi barrido de la segunda vez no lo vio porque buscaba
//      "= textCell_(" al principio de la línea y aquí está dentro de un
//      ternario.
//
// Buscar a ojo se equivocó las tres veces. La regla, dicha entera:
//
//     UNA FUNCIÓN QUE ESCRIBE LA FILA CON textSafeRow_ NO CITA SUS VALORES.
//     Se cita UNA VEZ, EN EL BORDE.
//
// Lo que Sheets hace con dos comillas no es "poner dos": se come la primera
// —es su marca de "esto es texto"— y guarda la segunda DENTRO del dato. Y
// cuando el dato es la categoría o el nombre, el MatID se compone de ellos, así
// que el material deja de ser el mismo y sus existencias se parten.
console.log('\n═══ nadie cita dos veces ═══\n');
{
  /* Revisadas y descartadas, con su motivo, y la lista falla si se queda vieja
     — el mismo trato que test-no-caduca y test-cost-privacy dan a las suyas. */
  const REVISADAS = {
    refreshDerivedSheets_:
      'No es doble: el textCell_ escribe el MatID celda a celda con setValue ' +
      '(reparación de MatID), y los textSafeRow_ escriben OTRAS hojas — ' +
      'LIVE_STOCK, SITE_STOCK y WASTED_STOCK. Son escrituras distintas a ' +
      'sitios distintos; ninguna fila pasa dos veces.'
  };

  const LINEAS = GS.split('\n');
  let fn = '(top)';
  const info = {};
  for (let i = 0; i < LINEAS.length; i++){
    const m = /^function ([A-Za-z0-9_]+)/.exec(LINEAS[i]);
    if (m){ fn = m[1]; info[fn] = { val: [], esc: [] }; }
    if (!info[fn]) continue;
    const l = LINEAS[i];
    if (/^\s*\/\//.test(l) || /^\s*\*/.test(l)) continue;   // comentarios fuera
    const citaValor = /textCell_\(/.test(l);
    const citaFila  = /textSafeRow_|map\(textCell_\)/.test(l);
    if (citaValor && !citaFila) info[fn].val.push(i + 1);
    if (citaFila) info[fn].esc.push(i + 1);
  }

  const sospechosas = Object.keys(info).filter(k => info[k].val.length && info[k].esc.length);
  const culpables   = sospechosas.filter(k => !REVISADAS[k]);
  const descartadas = sospechosas.filter(k => REVISADAS[k]);

  check('ninguna función cita el valor Y la fila — la que lo haga guarda una ' +
        'comilla DENTRO del dato' +
        (culpables.length ? ' → ' + culpables.join(', ') : ''),
    culpables.length === 0, culpables.map(k => k + ': valor ' + info[k].val.join(',') +
                                              ' / fila ' + info[k].esc.join(',')));

  const rancias = Object.keys(REVISADAS).filter(k => descartadas.indexOf(k) === -1);
  check('y ninguna excepción se ha quedado vieja', rancias.length === 0, rancias);
  descartadas.forEach(k => console.log('    · revisada y descartada — ' + k + ': ' + REVISADAS[k]));

  // El detector tiene que poder encontrar algo. Uno que no sabe buscar pasa
  // siempre, y eso se parece mucho a estar funcionando.
  const falsa = ['function f(){',
                 "  rowVals[c] = (k === 'qty') ? 0 : textCell_(nuevo);",
                 '  range.setValues([textSafeRow_(rowVals)]);', '}'].join('\n');
  const lf = falsa.split('\n');
  let v = 0, e = 0;
  lf.forEach(l => {
    if (/textCell_\(/.test(l) && !/textSafeRow_/.test(l)) v++;
    if (/textSafeRow_/.test(l)) e++;
  });
  check('una función de mentira con la forma EXACTA que tenía ' +
        'modifyMovementLocked_ —el ternario— sería señalada', v === 1 && e === 1);

  // Y las tres que ya se arreglaron, por su nombre: una regla que no recuerda
  // sus propios casos se afloja en la primera discusión.
  ['addMovementsBatch_', 'modifyMovementLocked_'].forEach(n => {
    check(n + ' entrega los valores CRUDOS a la escritura',
      info[n] && info[n].val.length === 0, info[n] && info[n].val);
  });
  check('rewriteArchiveColumn_ cita él, y sus llamadores le dan el valor crudo',
    /out\.push\(\[textCell_\(/.test(GS));
}

// ── LO QUE NO ES TEXTO TAMBIÉN TIENE QUE SOBREVIVIR ─────────────────────────
//
// El barrido de idas y vueltas del 2026-09-15 buscó tres pérdidas más allá del
// texto: ANCHO DE FILA, CERO CONTRA VACÍO, y el TIPO de las fechas.
//
// NO ENCONTRÓ NINGÚN FALLO, y eso también hay que decirlo — un barrido que
// siempre encuentra algo es un barrido que se está inventando cosas. Lo que se
// comprobó leyendo queda aquí ejecutándose, porque una comprobación que sólo
// vive en la cabeza de quien la hizo se pierde con él.
console.log('\n═══ el ancho, el vacío y las fechas ═══\n');
{
  const c = vm.createContext({ Date, String, Number, Math, Array, Object, console });
  vm.runInContext([fnSrc(GS, 'textCell_'), fnSrc(GS, 'textSafeRow_'),
                   fnSrc(GS, 'padRow_'), fnSrc(GS, 'safeStr_')].join('\n'), c);

  // (a) EL ANCHO. Una fila vieja —escrita antes de que el archivo creciera con
  // las dos columnas de coste— se lee CORTA. Si se copiara así a la papelera,
  // las tres columnas de la papelera (borrado por, cuándo, de qué hoja)
  // caerían encima de datos reales.
  c.__corta = [1, 2, 3];
  const rellenada = vm.runInContext('padRow_(__corta, ' + AC_WIDTH + ')', c);
  check('una fila corta se rellena hasta el ancho del archivo antes de tocarla',
    rellenada.length === AC_WIDTH, rellenada.length);
  check('...y se rellena con VACÍO, no con cero — un hueco no es una cantidad',
    rellenada[AC_WIDTH - 1] === '' && rellenada[5] === '');
  check('...y lo que ya estaba no se mueve de sitio',
    rellenada[0] === 1 && rellenada[2] === 3);
  check('la papelera escribe en AC_WIDTH, AC_WIDTH+1 y AC_WIDTH+2, justo detrás',
    TR.DELETED_AT === AC_WIDTH && TR.FROM_SHEET === AC_WIDTH + 2);
  check('y quien busca un movimiento lo devuelve ya rellenado, no crudo',
    /row:\s*padRow_\(/.test(fnSrc(GS, 'findMovementById_')));

  // Y una fila LARGA de más tampoco descuadra: se recorta.
  c.__larga = new Array(AC_WIDTH + 9).fill('x');
  check('una fila más ancha de la cuenta se recorta en vez de desbordar',
    vm.runInContext('padRow_(__larga, ' + AC_WIDTH + ')', c).length === AC_WIDTH);

  // (b) CERO CONTRA VACÍO. El archivo distingue "no costó nada" de "no hay
  // cifra": el coste de un ADJUST se deja EN BLANCO a propósito, porque
  // escribir 0 diría que costó cero dólares, que es otra afirmación.
  c.__fila = ['WINDOW', '', 0, new Date(1757000000000), null, undefined, 'X'];
  const pasada = vm.runInContext('textSafeRow_(__fila)', c);
  check('el vacío sigue vacío al escribirlo — no se convierte en cero',
    pasada[1] === '' && pasada[1] !== 0);
  check('...y el cero de verdad sigue siendo cero, no vacío',
    pasada[2] === 0 && typeof pasada[2] === 'number');
  check('un null y un undefined se guardan como vacío, no como la palabra "null"',
    pasada[4] === '' && pasada[5] === '');

  // (c) LAS FECHAS. textCell_ deja pasar lo que no es cadena, así que una fecha
  // sigue siendo una FECHA y no se convierte en texto: si se convirtiera, la
  // hoja dejaría de poder ordenarla.
  check('una fecha atraviesa el guardián SIENDO una fecha',
    pasada[3] instanceof Date && pasada[3].getTime() === 1757000000000);
  check('...y no se le pega una comilla, que la habría hecho texto',
    typeof pasada[3] !== 'string');

  // Y la fecha de recepción se guarda como TEXTO ISO a propósito, no como
  // fecha: así no hay zona horaria que la corra un día. El lector admite las
  // dos formas, que es lo que permite que convivan filas viejas y nuevas.
  const leer = fnSrc(GS, 'parseArchiveRow');
  check('el lector de filas admite la fecha de recepción como fecha Y como texto',
    /row\[AC\.DATE_REC\] instanceof Date/.test(leer) &&
    /else if \(row\[AC\.DATE_REC\]\)/.test(leer));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
process.exit(fail ? 1 : 0);
