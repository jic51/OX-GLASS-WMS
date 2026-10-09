// LOS CINCO ARREGLOS SIN RIESGO DE LA AUDITORÍA DE COLUMNAS.
//
// Jose, 2026-10-09, después de leer `docs/AUDITORIA-DE-COLUMNAS.md` entera:
// *"Primero las 5 sin riesgo"*. Son los cinco puntos de la auditoría que no
// cambian ni mueven un solo dato del cliente:
//
//   1. `Total Cost` entra en la pasada de auto-reparación
//   2. Las cinco columnas muertas salen de las hojas calculadas
//   3. `CONFIG` avisa de lo que escribió debajo de la fila 2 y nadie lee
//   4. `RESERVATIONS` deja de mentir en su propia nota
//   5. `AUDIT_LOG` E/F pasan a llamarse `Detail 2` / `Detail 3`
//
// "Sin riesgo" NO significa que no haya que probarlo. Significa que si fallan,
// fallan hacia el lado seguro — y eso hay que demostrarlo, porque es
// exactamente lo que una prueba puede demostrar y una promesa no.
//
// LO QUE ESTE ARCHIVO PROTEGE, por puntos:
//
//   1  Que el total se repare SÓLO cuando se puede saber cuál debe ser. Una
//      fila sin coste unitario tiene el total vacío A PROPÓSITO, y rellenarlo
//      con un cero sería inventarse dinero. Y que la reparación se CUENTE: una
//      corrección de dinero en silencio es peor que no corregir.
//   2  Que las tres hojas se escriban con el ancho nuevo y que su único lector
//      siga sacando los mismos números. Las columnas que se quitan están DESPUÉS
//      de las que se leen, así que un error aquí no da un número raro: da un
//      número que falta.
//   3  Que los índices del aviso COINCIDAN con los `i === 1` que hay de verdad
//      en `loadConfig`. Es la séptima vez de "dos cosas que tienen que coincidir
//      sin que nada lo obligue", y la lista del aviso es la octava si nadie la
//      ata a la de arriba. Aquí se ata.
//   4  Que la nota de `RESERVATIONS` sea la suya y no la del grupo, que las
//      demás hojas del grupo conserven la del grupo, y que la pestaña NO se
//      borre en ningún sitio.
//   5  Que el renombrado toque la celda SÓLO si dice exactamente el nombre
//      viejo. Si el cliente la renombró a mano, es suya.
//
// Uso:  node tools/test-cinco-sin-riesgo.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

function fnSrc(name){
  const start = GS.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = GS.indexOf('{', start); j < GS.length; j++) {
    if (GS[j] === '{') depth++;
    else if (GS[j] === '}') { depth--; if (depth === 0) return GS.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}
function constSrc(name){
  const start = GS.indexOf('var ' + name + ' = {');
  if (start === -1) throw new Error('no encontrada la constante: ' + name);
  const end = GS.indexOf('\n};', start);
  return GS.slice(start, end + 3);
}
// Sin comentarios, para buscar código de verdad. Esta precaución está aquí
// porque ya me mordió: busqué una cadena que había ELIMINADO y la encontré
// dentro de mi propio comentario explicando que la había eliminado.
function sinComentarios(s){
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

// ── Hoja falsa que recuerda lo que se le pidió y cuánto ancho se le escribió ─
function Hoja(nombre, filas, maxCols){
  this.nombre = nombre;
  this.rows   = (filas || []).map(r => r.slice());
  this.pedidos = [];
  this.anchos  = [];            // el `nc` de cada setValues: el ancho real escrito
  this.notas   = {};            // 'r,c' → nota
  this._max    = maxCols === undefined ? 30 : maxCols;
}
Hoja.prototype.getName       = function(){ return this.nombre; };
Hoja.prototype.getLastRow    = function(){ this.pedidos.push('getLastRow'); return this.rows.length; };
Hoja.prototype.getLastColumn = function(){ return this._max; };
Hoja.prototype.getMaxRows    = function(){ return Math.max(this.rows.length, 200); };
Hoja.prototype.getMaxColumns = function(){ return this._max; };
Hoja.prototype.setFrozenRows = function(){};
Hoja.prototype.setRowHeight  = function(){};
Hoja.prototype.setTabColor   = function(c){ this.color = c; };
Hoja.prototype.getTabColor   = function(){ return this.color || null; };
Hoja.prototype.getProtections = function(){ return this.protegida ? [{}] : []; };
Hoja.prototype.protect       = function(){ const s = this; s.protegida = true;
  return { setWarningOnly: () => { s.aviso = true; return {}; } }; };
Hoja.prototype.setColumnWidth = function(){};
Hoja.prototype.insertColumnsAfter = function(d, n){ this._max += n; };
Hoja.prototype.clearContents = function(){ this.pedidos.push('clearContents'); this.rows = []; };
Hoja.prototype.appendRow     = function(r){ this.rows.push(r.slice()); this.anchos.push(r.length); };
Hoja.prototype.getDataRange  = function(){
  this.pedidos.push('getDataRange');
  const self = this;
  return { getValues: () => self.rows.map(r => r.slice()) };
};
Hoja.prototype.getRange = function(r, c, nr, nc){
  const self = this; nr = nr || 1; nc = nc || 1;
  const quita = v => (typeof v === 'string' && v.charAt(0) === "'") ? v.slice(1) : v;
  return {
    setValue(v){
      self.pedidos.push('setValue');
      while (self.rows.length < r) self.rows.push([]);
      self.rows[r - 1][c - 1] = quita(v);
      return { setFontWeight: () => ({}) };
    },
    getValue(){ const row = self.rows[r - 1] || []; return row[c - 1] === undefined ? '' : row[c - 1]; },
    setValues(vals){
      self.pedidos.push('setValues');
      self.anchos.push(nc);
      for (let i = 0; i < vals.length; i++) {
        while (self.rows.length < r - 1 + i + 1) self.rows.push([]);
        for (let j = 0; j < vals[i].length; j++) self.rows[r - 1 + i][c - 1 + j] = quita(vals[i][j]);
      }
      return { setFontWeight: () => ({}) };
    },
    getValues(){
      const out = [];
      for (let i = 0; i < nr; i++) {
        const row = self.rows[r - 1 + i] || [], s = [];
        for (let j = 0; j < nc; j++) s.push(row[c - 1 + j] !== undefined ? row[c - 1 + j] : '');
        out.push(s);
      }
      return out;
    },
    getNote(){ return self.notas[r + ',' + c] || ''; },
    setNote(n){ self.notas[r + ',' + c] = n; return {}; },
    getBackground(){ return self.fondo || null; },
    setBackground(b){ self.fondo = b; return {
      setFontColor: () => ({ setFontWeight: () => ({ setFontSize: () => ({ setVerticalAlignment: () => ({}) }) }) }) }; },
    setNumberFormat(){ return {}; },
    setHorizontalAlignment(){ return {}; },
    setFontWeight(){ return {}; }
  };
};

// El MatID de verdad, con la función de la app. Escribirlo a mano fue el primer
// error de `test-derived-refresh.js` y no hay por qué repetirlo.
let _matIdReal = null;
function matIdDe(cat, name){
  if (!_matIdReal) {
    const c = vm.createContext({ String });
    vm.runInContext(fnSrc('normalizeString') + '\n' + fnSrc('getMaterialId'), c);
    _matIdReal = (a, b) => { c.__a = a; c.__b = b; return vm.runInContext('getMaterialId(__a, __b)', c); };
  }
  return _matIdReal(cat, name);
}

const CAB23 = new Array(23).fill('');

// Una fila del archivo por las posiciones de AC, con coste si se le pide.
function fila(o){
  const r = new Array(23).fill('');
  r[0]  = new Date(2026, 8, 10);
  r[1]  = o.cat  || 'WINDOW';
  r[2]  = o.name || 'W-1';
  r[5]  = o.qty === undefined ? 10 : o.qty;
  r[6]  = o.unit || 'UNIT';
  r[7]  = new Date(2026, 8, 10);
  r[8]  = o.src  || '';
  r[13] = o.proj || '';
  r[14] = o.matId !== undefined ? o.matId : matIdDe(o.cat || 'WINDOW', o.name || 'W-1');
  r[17] = o.dest || '';
  r[18] = o.type || 'ENTRY';
  if (o.uc !== undefined) r[20] = o.uc;
  if (o.tc !== undefined) r[21] = o.tc;
  return r;
}

function correrRefresco(filasArchivo, filasHistoria){
  const archive = new Hoja('MASTER_ARCHIVE_V3', [CAB23].concat(filasArchivo || []));
  const history = new Hoja('ARCHIVE_HISTORY',   [CAB23].concat(filasHistoria || []));
  const live    = new Hoja('LIVE_STOCK',   [[]]);
  const site    = new Hoja('SITE_STOCK',   [[]]);
  const waste   = new Hoja('WASTED_STOCK', [[]]);
  const hojas = { MASTER_ARCHIVE_V3: archive, ARCHIVE_HISTORY: history,
                  LIVE_STOCK: live, SITE_STOCK: site, WASTED_STOCK: waste };
  const auditoria = [];
  const ss = { getSheetByName: (n) => hojas[n] || null };

  const ctx = vm.createContext({
    String, Number, Array, Object, Date, Math, JSON, console, isFinite,
    Utilities: { formatDate: () => '2026-09-10' },
    Session:   { getScriptTimeZone: () => 'UTC' },
    Logger:    { log: () => {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    auditLog_: (ss2, tipo, quien, qué, dónde, detalle) => auditoria.push({ tipo, qué, dónde, detalle }),
    describeMatIdFixes_: (f) => 'arreglos: ' + f.length,
    ensureWasteSheet_:          () => waste,
    ensureArchiveHistorySheet_: () => history
  });
  ctx.__ss = ss;
  vm.runInContext(constSrc('SHEETS'), ctx);
  vm.runInContext(constSrc('AC'), ctx);
  ['normalizeString', 'getMaterialId', 'parseArchiveRow', 'textCell_', 'textSafeRow_',
   'round2_', 'refreshDerivedSheets_'].forEach(n => vm.runInContext(fnSrc(n), ctx));
  vm.runInContext('refreshDerivedSheets_(__ss)', ctx);

  return { archive, history, live, site, waste, auditoria };
}

const AC = (function(){
  const c = vm.createContext({});
  vm.runInContext(constSrc('AC'), c);
  return vm.runInContext('AC', c);
})();

/* ════════════════════════════════════════════════════════════════════════════
   1 · `Total Cost` ENTRA EN LA PASADA DE AUTO-REPARACIÓN
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1 · el total que nadie vigilaba ═══\n');
{
  // Alguien corrigió el coste unitario a mano en la hoja — de 100 a 10 — y el
  // total se quedó con el número viejo. Es el caso exacto de la auditoría.
  const m = correrRefresco([ fila({ name: 'W-1', dest: 'A1', qty: 4, uc: 10, tc: 400 }) ]);
  check('un total que no es Qty × Unit Cost se recalcula en la hoja',
    Number(m.archive.rows[1][AC.TOTAL_COST]) === 40, m.archive.rows[1][AC.TOTAL_COST]);
  const cost = m.auditoria.find(x => String(x.qué || '').indexOf('Total Cost') !== -1);
  check('...y queda anotado en la auditoría — corregir dinero en silencio es ' +
        'peor que no corregirlo', !!cost);
  check('...diciendo QUÉ fila, para poder ir a mirarla',
    !!cost && /^rows 2$/.test(String(cost.dónde)), cost && cost.dónde);
  check('...y el antes y el después, que es lo único que permite comprobarlo',
    !!cost && String(cost.detalle) === 'was 400 → now 40', cost && cost.detalle);
}
{
  const m = correrRefresco([ fila({ name: 'W-1', dest: 'A1', qty: 4, uc: 10, tc: '' }) ]);
  check('un total EN BLANCO con coste unitario puesto también se rellena — es ' +
        'una fila a medio guardar, no una decisión',
    Number(m.archive.rows[1][AC.TOTAL_COST]) === 40, m.archive.rows[1][AC.TOTAL_COST]);
  const cost = m.auditoria.find(x => String(x.qué || '').indexOf('Total Cost') !== -1);
  check('...y el aviso dice "(blank)" en vez de inventarse un número anterior',
    !!cost && String(cost.detalle) === 'was (blank) → now 40', cost && cost.detalle);
}
{
  // LA MITAD QUE IMPORTA MÁS. El coste es OPCIONAL en Acopio: una entrada sin
  // precio es normal y su total está vacío a propósito. Rellenarlo con un cero
  // sería escribir en la columna de contabilidad un dato que nadie dio.
  const m = correrRefresco([ fila({ name: 'W-1', dest: 'A1', qty: 4 }) ]);
  check('una fila SIN coste unitario no se toca — el total vacío es deliberado, ' +
        'y un cero inventado en la columna de contabilidad es un dato falso',
    m.archive.rows[1][AC.TOTAL_COST] === '', m.archive.rows[1][AC.TOTAL_COST]);
  check('...y no se anota nada: no pasó nada',
    !m.auditoria.some(x => String(x.qué || '').indexOf('Total Cost') !== -1));
}
{
  // El caso al revés: hay total y no hay coste unitario. Tampoco se toca, y por
  // la misma razón — no se puede saber cuál debería ser, así que borrarlo o
  // cambiarlo sería destruir el único número que hay.
  const m = correrRefresco([ fila({ name: 'W-1', dest: 'A1', qty: 4, tc: 123 }) ]);
  check('un total SIN coste unitario se queda como está: no hay con qué calcularlo, ' +
        'y tocarlo sería destruir el único dato de la fila',
    Number(m.archive.rows[1][AC.TOTAL_COST]) === 123, m.archive.rows[1][AC.TOTAL_COST]);
}
{
  const m = correrRefresco([ fila({ name: 'W-1', dest: 'A1', qty: 3, uc: 12.5, tc: 37.5 }) ]);
  check('un total que YA está bien no se reescribe — una escritura que no cambia ' +
        'nada es cuota de Sheets gastada en nada',
    m.archive.pedidos.indexOf('setValue') === -1, m.archive.pedidos);
  check('...y tampoco se anota', m.auditoria.length === 0, m.auditoria);
}
{
  // round2_ redondea a dos decimales, así que comparar con === encuentra
  // diferencias que no existen: 0.1 × 3 da 0.30000000000000004 en coma
  // flotante. Un margen de medio centavo es lo que impide que esta reparación
  // se dispare sola en cada rebuild y llene la auditoría de ruido.
  const m = correrRefresco([ fila({ name: 'W-1', dest: 'A1', qty: 3, uc: 0.1, tc: 0.30000000000000004 }) ]);
  check('la coma flotante no cuenta como avería: 0.1 × 3 sale 0.30000000000000004 ' +
        'y eso NO es un total mal puesto',
    m.auditoria.length === 0, m.auditoria);
  const m2 = correrRefresco([ fila({ name: 'W-1', dest: 'A1', qty: 3, uc: 0.1, tc: 0.32 }) ]);
  check('...pero dos céntimos SÍ: el margen es de medio centavo, no de cualquier cosa',
    m2.auditoria.length === 1, m2.auditoria);
}
{
  // Las filas del histórico se numeran contra SU hoja, no contra el archivo.
  // Esto es lo mismo que ya hace el arreglo del MatID, y equivocarlo escribiría
  // el total correcto en la fila equivocada de la hoja equivocada.
  const m = correrRefresco(
    [ fila({ name: 'W-1', dest: 'A1', qty: 1, uc: 5, tc: 5 }) ],
    [ fila({ name: 'W-9', dest: 'B2', qty: 2, uc: 7, tc: 999 }) ]);
  check('una fila del HISTÓRICO se repara en el histórico, no en el archivo',
    Number(m.history.rows[1][AC.TOTAL_COST]) === 14, m.history.rows[1][AC.TOTAL_COST]);
  check('...y la fila sana del archivo se queda intacta',
    Number(m.archive.rows[1][AC.TOTAL_COST]) === 5, m.archive.rows[1][AC.TOTAL_COST]);
  const cost = m.auditoria.find(x => String(x.qué || '').indexOf('Total Cost') !== -1);
  check('...y el aviso dice que es del histórico, porque el botón "Show the movement" ' +
        'abre filas DEL ARCHIVO: un 2 suelto llevaría a un movimiento que nadie tocó',
    !!cost && String(cost.dónde) === 'archive-history rows 2', cost && cost.dónde);
}
{
  // Y la lectura del aviso, que es la otra mitad del mismo cuidado: la tarjeta
  // del sistema saca las filas con /^rows ([\d,]+)/ — con ancla, para no morder
  // el "archive-history rows 2".
  const trozo = sinComentarios(GS).match(/action === 'AUTO_REPAIR_MATID'[\s\S]{0,420}/);
  check('la tarjeta del sistema también ofrece "Show the movement" para el arreglo ' +
        'del total, no sólo para el del MatID',
    !!trozo && trozo[0].indexOf("AUTO_REPAIR_TOTAL_COST") !== -1);
  check('...y la busca ANCLADA al principio, o "archive-history rows 2" la haría ' +
        'abrir la fila 2 del archivo — un movimiento distinto, señalado como si ' +
        'fuera el reparado',
    !!trozo && /match\(\/\^rows \(\[\\d,\]\+\)\//.test(trozo[0]), trozo && trozo[0].slice(0, 300));
}
{
  // Y que la app lo ENSEÑE. Sin su nombre en SYSTEM_EVENT_LABELS la fila se
  // escribe en AUDIT_LOG y no sale en ninguna pantalla: dinero corregido en
  // silencio. Es el patrón de "una reparación hecha y nunca dicha".
  const labels = sinComentarios(GS).match(/var SYSTEM_EVENT_LABELS = \{[\s\S]*?\n\};/);
  check('`AUTO_REPAIR_TOTAL_COST` tiene nombre en SYSTEM_EVENT_LABELS, o la ' +
        'reparación se guarda y la app no la enseña nunca',
    !!labels && labels[0].indexOf('AUTO_REPAIR_TOTAL_COST') !== -1);
}

/* ════════════════════════════════════════════════════════════════════════════
   2 · LAS CINCO COLUMNAS MUERTAS
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2 · cinco columnas que se escribían y no leía nadie ═══\n');
{
  const m = correrRefresco([
    fila({ name: 'W-1', dest: 'A1', qty: 40 }),
    fila({ name: 'W-1', src: 'A1', qty: 5, proj: 'TOWER', type: 'EXIT' }),
    fila({ name: 'W-1', src: 'A1', qty: 2, type: 'WASTE' })
  ]);
  check('LIVE_STOCK se escribe con 6 columnas — se fueron `Location_Type` (el texto ' +
        'RACK repetido en todas las filas) y `Last_Updated` (la misma hora, 400 veces)',
    m.live.anchos.every(a => a === 6), m.live.anchos);
  check('SITE_STOCK con 5 — se fueron `Status` ("At Site" en todas) y `Last_Updated`',
    m.site.anchos.every(a => a === 5), m.site.anchos);
  check('WASTED_STOCK con 4 — se fue `Last_Updated`',
    m.waste.anchos.every(a => a === 4), m.waste.anchos);

  // LO QUE DE VERDAD IMPORTA: que el único lector siga sacando sus números. Las
  // columnas que se quitan están DESPUÉS de las que se leen, así que un error
  // aquí no daría un número raro: daría un número que falta.
  const cab = m.live.rows[0];
  check('la cabecera de LIVE dice lo que se escribe, en orden',
    JSON.stringify(cab) === JSON.stringify(['Category','Name','Project','Location','Qty','Unit']), cab);
  const vivo = m.live.rows.slice(1).filter(r => r && r[0]);
  check('y la ubicación sigue en la columna D y la cantidad en la E, que es de donde ' +
        'las lee `buildStockFromDerivedSheets_`',
    vivo.length === 1 && String(vivo[0][3]) === 'A1' && Number(vivo[0][4]) === 33,
    vivo);

  const enObra = m.site.rows.slice(1).filter(r => r && r[0]);
  check('SITE_STOCK conserva la columna C (`Project`) — es la EXCEPCIÓN razonada: ' +
        'la app no la lee hoy, pero es lo único que dice DE QUÉ OBRA es el material ' +
        'que está fuera',
    enObra.length === 1 && String(enObra[0][2]) === 'TOWER', enObra);
  check('...y la cantidad en obra sigue saliendo', enObra.length === 1 && Number(enObra[0][3]) === 5, enObra);

  const tirado = m.waste.rows.slice(1).filter(r => r && r[0]);
  check('WASTED_STOCK sigue contando lo tirado', tirado.length === 1 && Number(tirado[0][2]) === 2, tirado);
}
{
  // La variable que servía SÓLO para esas columnas. Una variable que nadie lee
  // es la forma más silenciosa de hacer creer a quien lea esto mañana que la
  // función hace algo con la hora.
  const cuerpo = sinComentarios(fnSrc('refreshDerivedSheets_'));
  check('`var now = new Date()` ya no está en refreshDerivedSheets_: lo único que lo ' +
        'usaba eran las tres columnas `Last_Updated`',
    cuerpo.indexOf('var now') === -1);
  // Y SIN LAS CADENAS, que es la corrección de mi propio primer intento: los
  // avisos de la auditoría dicen `'was X → now Y'` en inglés, así que buscar la
  // palabra `now` a secas encontraba el texto de un mensaje y daba por usada una
  // variable que ya no existe. Es la cuarta vez que me pasa lo mismo —medir la
  // letra en vez de la intención— y por eso queda escrito aquí.
  const sinCadenas = cuerpo.replace(/'(?:[^'\\]|\\.)*'/g, "''")
                           .replace(/"(?:[^"\\]|\\.)*"/g, '""');
  check('...y no quedó ninguna referencia suelta a `now` COMO VARIABLE que reventaría ' +
        'en ejecución (sin contar la palabra dentro de los mensajes en inglés)',
    !/\bnow\b/.test(sinCadenas),
    (sinCadenas.match(/.*\bnow\b.*/g) || []).slice(0, 3));
}
{
  // `ensureWasteSheet_` crea la hoja con appendRow, y es la segunda lista que
  // tiene que coincidir con la de arriba. Si sólo se cambia una, una
  // instalación nueva nace con cinco columnas y la primera reconstrucción le
  // deja una huérfana.
  const cuerpo = sinComentarios(fnSrc('ensureWasteSheet_'));
  const m = cuerpo.match(/appendRow\(\[([^\]]*)\]\)/);
  check('`ensureWasteSheet_` crea la hoja con las mismas 4 columnas que luego se ' +
        'escriben — si sólo se cambiara una de las dos, la hoja nueva nacería con ' +
        'una columna que la primera reconstrucción deja huérfana',
    !!m && m[1].split(',').length === 4, m && m[1]);
  check('...y no menciona `Last_Updated`', cuerpo.indexOf('Last_Updated') === -1);
}

/* ════════════════════════════════════════════════════════════════════════════
   3 · CONFIG: LO QUE SE ESCRIBE DEBAJO DE LA FILA 2 Y NADIE LEE
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3 · las dos columnas de CONFIG que sólo se leen en la fila 2 ═══\n');

// LA ATADURA. `loadConfig` tiene los `i === 1` y `CONFIG_SOLO_FILA_2` tiene la
// lista del aviso. Son dos sitios que tienen que decir lo mismo y nada lo
// obliga — el patrón que este proyecto ya conoce por su nombre. Se ata aquí:
// los índices del aviso se comparan con los que están DE VERDAD en el código.
const indicesEnLoadConfig = (function(){
  const cuerpo = sinComentarios(fnSrc('loadConfig'));
  const out = [];
  const re = /row\[(\d+)\]\s*&&\s*i === 1/g;
  let m;
  while ((m = re.exec(cuerpo))) out.push(Number(m[1]));
  return out.sort((a, b) => a - b);
})();
const indicesEnElAviso = (function(){
  const m = GS.match(/var CONFIG_SOLO_FILA_2 = \[[\s\S]*?\n\];/);
  if (!m) throw new Error('no encontrada CONFIG_SOLO_FILA_2');
  const c = vm.createContext({});
  vm.runInContext(m[0], c);
  return vm.runInContext('CONFIG_SOLO_FILA_2', c).map(x => x.idx).sort((a, b) => a - b);
})();
check('las columnas que el aviso vigila son EXACTAMENTE las que loadConfig lee sólo ' +
      'de la fila 2 — si alguien añade un tercer `i === 1` y no lo apunta aquí, el ' +
      'aviso se calla sobre ella y volvemos al problema original',
  JSON.stringify(indicesEnLoadConfig) === JSON.stringify(indicesEnElAviso),
  { enLoadConfig: indicesEnLoadConfig, enElAviso: indicesEnElAviso });
check('...y son dos: H (Admin Email) y N (Archive Cutoff Months)',
  indicesEnElAviso.length === 2 && indicesEnElAviso[0] === 7 && indicesEnElAviso[1] === 13,
  indicesEnElAviso);

function revisarConfig(filas){
  const cfg = new Hoja('CONFIG', filas, 17);
  const ss = { getSheetByName: (n) => (n === 'CONFIG' ? cfg : null) };
  const ctx = vm.createContext({ String, Number, Array, Object, console });
  vm.runInContext(constSrc('SHEETS'), ctx);
  vm.runInContext(GS.match(/var CONFIG_SOLO_FILA_2 = \[[\s\S]*?\n\];/)[0], ctx);
  vm.runInContext(fnSrc('revisarConfigFila2_'), ctx);
  ctx.__ss = ss;
  return vm.runInContext('revisarConfigFila2_(__ss)', ctx);
}
function filaCfg(o){
  const r = new Array(17).fill('');
  if (o.proj)  r[0]  = o.proj;
  if (o.admin !== undefined)  r[7]  = o.admin;
  if (o.meses !== undefined)  r[13] = o.meses;
  return r;
}
const CABCFG = new Array(17).fill('x');

{
  const r = revisarConfig([ CABCFG, filaCfg({ admin: 'jose@ox-glass.com' }), filaCfg({ proj: 'TOWER' }) ]);
  check('una CONFIG sana no dice nada', r.length === 0, r);
}
{
  // El caso de verdad: alguien escribe un segundo correo de admin debajo del
  // primero, porque la hoja es de LISTAS y eso es lo que la forma pide. Nadie
  // le dice que ese correo no existe para nadie.
  const r = revisarConfig([ CABCFG,
    filaCfg({ admin: 'jose@ox-glass.com' }),
    filaCfg({}),
    filaCfg({ admin: 'maria@ox-glass.com' }) ]);
  check('un segundo Admin Email escrito más abajo se detecta', r.length === 1, r);
  check('...con el NÚMERO DE FILA, que es la diferencia entre una instrucción y un ' +
        'acertijo en una hoja de cuatrocientas filas',
    r[0].filas.length === 1 && r[0].filas[0] === 4, r[0]);
  check('...y diciendo cuál SÍ está en uso, para saber qué mover y qué borrar',
    r[0].enUso === 'jose@ox-glass.com', r[0]);
  check('...y es la columna H', r[0].col === 'H', r[0]);
}
{
  // EL PEOR CASO, y el que hay que decir distinto: la fila 2 está VACÍA y el
  // valor está más abajo. Entonces el ajuste no está puesto a medias — no está
  // puesto en absoluto, y la app lleva quién sabe cuánto sin admin.
  const r = revisarConfig([ CABCFG, filaCfg({}), filaCfg({ admin: 'jose@ox-glass.com' }) ]);
  check('si la fila 2 está vacía y el valor está más abajo, se dice que NO HAY nada ' +
        'en uso — no es un ajuste a medias, es un ajuste que no existe',
    r.length === 1 && r[0].enUso === '', r);
}
{
  const r = revisarConfig([ CABCFG, filaCfg({ meses: 12 }), filaCfg({ meses: 6 }), filaCfg({ meses: 24 }) ]);
  check('lo mismo para Archive Cutoff Months, con todas sus filas',
    r.length === 1 && r[0].col === 'N' && JSON.stringify(r[0].filas) === '[3,4]', r);
}
{
  const r = revisarConfig([ CABCFG, filaCfg({ admin: 'a@b.com', meses: 12 }) ]);
  check('una hoja de sólo dos filas no se mira: sin fila 3 no hay nada que ignorar',
    r.length === 0, r);
}
{
  // Y que el chequeo de instalación lo CUENTE. Una comprobación escrita y nunca
  // ejecutada es el otro patrón de este proyecto, y van cinco.
  const chk = sinComentarios(fnSrc('menuCheckInstallation'));
  check('`menuCheckInstallation` llama a revisarConfigFila2_ — una comprobación que ' +
        'nadie ejecuta es el patrón que este proyecto ya tiene contado cinco veces',
    /revisarConfigFila2_\(SpreadsheetApp\.getActiveSpreadsheet\(\)\)/.test(chk));
  check('...y lo imprime en el informe', /cfgFila2\.forEach/.test(chk));
  check('...y NO lo repara: leer dos Admin Email distintos es una decisión, no una ' +
        'limpieza, y tomarla sin preguntar sería cambiar a quién obedece la app',
    chk.indexOf('cfgFila2') !== -1 && !/repaired\.push\([^)]*cfgFila2/.test(chk));
}

/* ════════════════════════════════════════════════════════════════════════════
   4 · LA NOTA DE `RESERVATIONS`
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4 · la pestaña vacía cuya nota mentía sobre por qué está vacía ═══\n');
{
  const ctx = vm.createContext({ String, Number, Array, Object, console });
  vm.runInContext(constSrc('SHEETS'), ctx);
  vm.runInContext("var PRODUCT_NAME = 'Acopio';", ctx);
  vm.runInContext(fnSrc('notasPorHoja_'), ctx);
  const notas = vm.runInContext('notasPorHoja_()', ctx);
  const n = notas['RESERVATIONS'] || '';
  check('`RESERVATIONS` tiene nota propia', !!n, Object.keys(notas));
  check('...que dice que NO SE USA — antes decía "Rebuilt by Acopio from ' +
        'MASTER_ARCHIVE_V3", y nada la reconstruye: quien la abriera concluía que ' +
        'la app le había borrado sus reservas',
    /NOT USED/.test(n), n);
  check('...y dice dónde están las reservas de verdad', /MATERIAL_LOCKS/.test(n), n);
  check('...y por qué se deja la pestaña: por si una instalación vieja dejó datos',
    /not deleted/i.test(n), n);
  check('la nota está en inglés, como todo lo que ve un cliente',
    !/[áéíóúñ¿¡]/i.test(n), n);
}
{
  // Que la nota de la hoja MANDE sobre la del grupo, y que las demás del grupo
  // conserven la suya. Si `notasPorHoja_` pisara al grupo entero, LIVE_STOCK
  // dejaría de avisar de que lo editado a mano se sobreescribe.
  const live  = new Hoja('LIVE_STOCK',   [[]]);
  const resv  = new Hoja('RESERVATIONS', [[]]);
  const hojas = { LIVE_STOCK: live, RESERVATIONS: resv };
  const ss = { getSheetByName: (n) => hojas[n] || null, getSheets: () => [live, resv],
               setActiveSheet: () => {}, moveActiveSheet: () => {} };
  const ctx = vm.createContext({ String, Number, Array, Object, Math, console,
    SpreadsheetApp: { ProtectionType: { SHEET: 'SHEET' } },
    SH_NAVY: '#1F3864', SH_ACCENT: '#2E75B6', SH_MUTED: '#BFBFBF',
    PRODUCT_NAME: 'Acopio', START_HERE_SHEET: 'START HERE',
    TERMS_SHEET: 'TERMS', PRIVACY_SHEET: 'PRIVACY',
    FORMATO_CABECERA_ALTO: 28 });
  vm.runInContext(constSrc('SHEETS'), ctx);
  ['gruposDeFormato_', 'notasPorHoja_', 'anchosDelArchivo_', 'hojaVacia_',
   'protegerConAviso_', 'aplicarFormatoEstandar_'].forEach(n => vm.runInContext(fnSrc(n), ctx));
  vm.runInContext(constSrc('AC'), ctx);
  ctx.__ss = ss;
  vm.runInContext('aplicarFormatoEstandar_(__ss, { completo: false })', ctx);

  check('a RESERVATIONS se le pone SU nota, no la del grupo',
    /NOT USED/.test(resv.notas['1,1'] || ''), resv.notas['1,1']);
  check('y LIVE_STOCK conserva la del grupo — si notasPorHoja_ pisara al grupo ' +
        'entero, la hoja calculada dejaría de avisar de que lo editado a mano se ' +
        'sobreescribe',
    /Rebuilt by/.test(live.notas['1,1'] || ''), live.notas['1,1']);
}
{
  // Y que NADIE la borre. Es lo que hace que este punto sea "sin riesgo": una
  // nota se quita escribiendo encima; una hoja borrada no vuelve.
  const todo = sinComentarios(GS);
  check('nada en el código borra la pestaña RESERVATIONS — una nota se quita ' +
        'escribiendo encima, una hoja borrada no vuelve',
    !/deleteSheet\([^)]*RESERVATIONS/.test(todo) &&
    !/RESERVATIONS[^\n]*deleteSheet/.test(todo));
  check('...y sigue en el SPEC de ensureCoreSheets_, así que una instalación nueva ' +
        'la trae igual', /\{ name: SHEETS\.RESERVATIONS, header:/.test(todo));
}

/* ════════════════════════════════════════════════════════════════════════════
   5 · `AUDIT_LOG` E/F → `Detail 2` / `Detail 3`
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 5 · dos cabeceras que describían algo que no estaba ahí ═══\n');
const cabAudit = (function(){
  const m = GS.match(/\{ name: SHEETS\.AUDIT, header: \[([^\]]*)\]/);
  if (!m) throw new Error('no encontrada la cabecera de AUDIT_LOG');
  return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, ''));
})();
{
  check('la especificación dice `Detail 2` / `Detail 3`',
    cabAudit[4] === 'Detail 2' && cabAudit[5] === 'Detail 3', cabAudit);
  check('...y las cuatro primeras no se tocan: ésas sí describían lo que llevan',
    JSON.stringify(cabAudit.slice(0, 4)) === JSON.stringify(['Timestamp','Action','User','Details']),
    cabAudit);

  // Y NI UNA LLAMADA CAMBIA. Los 20 usos de antes→después siguen escribiendo en
  // las mismas dos celdas; lo único que cambia es cómo se llama la columna, que
  // es lo que estaba mal.
  const auditFn = sinComentarios(fnSrc('auditLog_'));
  check('`auditLog_` sigue escribiendo las mismas 6 celdas en el mismo orden: no se ' +
        'movió ni un dato, sólo el nombre de dos columnas',
    /appendRow\(\[new Date\(\), action, user, textCell_\(details\), textCell_\(oldVal\), textCell_\(newVal\)\]\)/.test(auditFn),
    auditFn);
  check('...y su firma tampoco, así que las 56 llamadas del archivo siguen valiendo',
    /function auditLog_\(ss, action, user, details, oldVal, newVal\)/.test(GS));
}
function renombrar(fila1, renombres){
  const h = new Hoja('AUDIT_LOG', [fila1.slice(), ['x','y','z','w','v','u']], 6);
  const ctx = vm.createContext({ String, Number, Array, Object, console });
  vm.runInContext(fnSrc('renombrarCabeceras_'), ctx);
  ctx.__h = h; ctx.__r = renombres;
  const hechos = vm.runInContext('renombrarCabeceras_(__h, __r)', ctx);
  return { hoja: h, hechos };
}
const RENOM = [ { col: 5, de: 'Old Value', a: 'Detail 2' },
                { col: 6, de: 'New Value', a: 'Detail 3' } ];
{
  const r = renombrar(['Timestamp','Action','User','Details','Old Value','New Value'], RENOM);
  check('una instalación con los nombres viejos se renombra',
    r.hoja.rows[0][4] === 'Detail 2' && r.hoja.rows[0][5] === 'Detail 3', r.hoja.rows[0]);
  check('...y lo devuelve para poder decírselo a quien abra su hoja mañana y busque ' +
        'una columna que tenía ayer',
    r.hechos.length === 2 && r.hechos[0] === 'Old Value → Detail 2', r.hechos);
  check('...sin tocar ni una fila de datos', JSON.stringify(r.hoja.rows[1]) === JSON.stringify(['x','y','z','w','v','u']),
    r.hoja.rows[1]);
}
{
  // LO QUE MÁS IMPORTA DE ESTE PUNTO. Si el cliente la renombró a mano, es
  // suya: puede tener un filtro, una fórmula o una costumbre colgando de ese
  // nombre, y renombrarla sería un cambio que no pidió.
  const r = renombrar(['Timestamp','Action','User','Details','Antes','Después'], RENOM);
  check('una cabecera que el cliente renombró a mano NO se toca — puede tener un ' +
        'filtro o una fórmula colgando de ese nombre',
    r.hoja.rows[0][4] === 'Antes' && r.hoja.rows[0][5] === 'Después', r.hoja.rows[0]);
  check('...y no se anota nada, porque no pasó nada', r.hechos.length === 0, r.hechos);
}
{
  const r = renombrar(['Timestamp','Action','User','Details','', ''], RENOM);
  check('una cabecera VACÍA se la deja a fillMissingHeaders_, que es de quien es',
    r.hoja.rows[0][4] === '' && r.hechos.length === 0, r.hoja.rows[0]);
}
{
  const r = renombrar(['Timestamp','Action','User','Details','Detail 2','Detail 3'], RENOM);
  check('correrlo dos veces no hace nada la segunda', r.hechos.length === 0, r.hechos);
}
{
  const r = renombrar(['Timestamp','Action','User','Details','  Old Value  ','New Value'], RENOM);
  check('los espacios de sobra no impiden el renombrado: una celda de hoja de cálculo ' +
        'los trae de serie', r.hoja.rows[0][4] === 'Detail 2', r.hoja.rows[0]);
}
{
  const h = new Hoja('AUDIT_LOG', [['Timestamp','Action','User','Details']], 4);
  const ctx = vm.createContext({ String, Number, Array, Object, console });
  vm.runInContext(fnSrc('renombrarCabeceras_'), ctx);
  ctx.__h = h; ctx.__r = RENOM;
  const hechos = vm.runInContext('renombrarCabeceras_(__h, __r)', ctx);
  check('una hoja MÁS ESTRECHA que la especificación no revienta: ensanchar es cosa ' +
        'de fillMissingHeaders_, y pedir la columna 5 de una hoja de 4 sí reventaría',
    hechos.length === 0, hechos);
}
{
  const chk = sinComentarios(fnSrc('ensureCoreSheets_'));
  check('`ensureCoreSheets_` llama al renombrado en las hojas que YA existen — ' +
        'fillMissingHeaders_ sólo rellena huecos a propósito, así que un nombre que ' +
        'estaba mal desde el principio no se arreglaba nunca por esa vía',
    /renombrarCabeceras_\(yaEsta, spec\.renombrar\)/.test(chk));
  check('...y lo cuenta en lo reparado', /renamed:/.test(chk));
}

/* ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n' + (fail ? '✗ ' + fail + ' FALLOS' : '✓ todo bien') + ' · ' + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
