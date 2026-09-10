// refreshDerivedSheets_ — LA FUNCIÓN QUE CALCULA TODOS LOS TOTALES Y QUE
// NINGUNA PRUEBA EJECUTABA.
//
// Nueve archivos de tools/ la nombran. Ninguno la corre: unos la leen como
// TEXTO y buscan patrones dentro, y test-text-stays-text.js directamente la
// sustituye por una función vacía. O sea que hasta hoy se podía cambiar la
// aritmética del almacén entero y la suite seguía en verde.
//
// Se descubrió al medir por qué la app "primero piensa" antes de cada toast.
// Jose corrió el medidor en su hoja el 2026-09-10 y los números crudos dijeron
// algo que ninguno de los dos esperaba:
//
//     leer ARCHIVE_HISTORY (0 filas):      1043 / 426 / 422 ms
//     leer MASTER_ARCHIVE_V3 (1061 × 23):   964 / 983 / 643 ms
//
// LEER VEINTICUATRO MIL CELDAS CUESTA LO MISMO QUE LEER NADA. Lo que se paga no
// son los datos: es el viaje a Sheets, unos 400 ms lleve lo que lleve. Y ese
// viaje se estaba haciendo en cada guardado y en cada borrado para traerse una
// hoja con la cabecera y nada debajo.
//
// De ahí sale el cambio que este archivo protege: NO LEER EL HISTÓRICO CUANDO
// ESTÁ VACÍO. Y protegerlo importa más que el ahorro, porque el fallo que puede
// introducir es silencioso y caro — si el salto se aplicara también con filas
// dentro, esas filas dejarían de contar y el almacén entero informaría de menos
// material del que tiene, sin que nada avise.
//
// Así que aquí se ejecuta DE VERDAD, contra hojas falsas que recuerdan lo que
// se les pidió, y se comprueban las dos mitades: que con histórico vacío no se
// lea, y que con histórico lleno cada una de sus filas cuente.
//
// De paso queda cubierta la aritmética que nadie estaba mirando, incluida la
// línea que el propio archivo marca como CRITICAL: los nombres de estante se
// comparan normalizados, o un "B1A" y un " b1a" nunca se cancelan y el material
// se queda en el almacén para siempre.
//
// Uso:  node tools/test-derived-refresh.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

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
  const end = GS.indexOf('\n};', start);
  return GS.slice(start, end + 3);
}

// ── Hojas falsas que RECUERDAN lo que se les pidió ───────────────────────────
//
// Lo de recordar es la mitad del archivo: la aserción que importa no es "el
// total salió bien" sino "no se llegó a pedir la hoja vacía". Un total correcto
// se puede conseguir leyéndola igual y tirando el resultado.
function Hoja(nombre, filas){
  this.nombre = nombre;
  this.rows = filas.map(r => r.slice());
  this.pedidos = [];            // 'getDataRange' | 'getLastRow' | 'clearContents' | 'setValues'
}
Hoja.prototype.getName       = function(){ return this.nombre; };
Hoja.prototype.getLastRow    = function(){ this.pedidos.push('getLastRow'); return this.rows.length; };
Hoja.prototype.getMaxRows    = function(){ return Math.max(this.rows.length, 200); };
Hoja.prototype.getMaxColumns = function(){ return 30; };
Hoja.prototype.setFrozenRows = function(){};
Hoja.prototype.clearContents = function(){ this.pedidos.push('clearContents'); this.rows = []; };
Hoja.prototype.getDataRange  = function(){
  this.pedidos.push('getDataRange');
  const self = this;
  return { getValues: () => self.rows.map(r => r.slice()) };
};
Hoja.prototype.getRange = function(r, c, nr, nc){
  const self = this; nr = nr || 1; nc = nc || 1;
  return {
    setValue(v){
      self.pedidos.push('setValue');
      while (self.rows.length < r) self.rows.push([]);
      self.rows[r - 1][c - 1] = v;
      return { setFontWeight: () => {} };
    },
    setValues(vals){
      self.pedidos.push('setValues');
      for (let i = 0; i < vals.length; i++) {
        while (self.rows.length < r - 1 + i + 1) self.rows.push([]);
        for (let j = 0; j < vals[i].length; j++) {
          // Sheets se come la comilla que fuerza texto; ver textCell_.
          let v = vals[i][j];
          if (typeof v === 'string' && v.charAt(0) === "'") v = v.slice(1);
          self.rows[r - 1 + i][c - 1 + j] = v;
        }
      }
      return { setFontWeight: () => {} };
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
    setFontWeight: () => {}
  };
};

const CAB = new Array(23).fill('');   // la cabecera; su contenido no se lee

// El MatID DE VERDAD, calculado con la misma función que usa la app. Escribirlo
// a mano aquí fue el primer intento y estaba mal: normalizeString hace más cosas
// de las que parece —"W-1" acaba siendo "W 1"— así que TODAS las filas salían
// con el MatID "equivocado" y se reparaban solas. La prueba del MatID medía
// entonces un caso que nunca ocurre en una hoja sana.
let _matIdReal = null;
function matIdDe(cat, name){
  if (!_matIdReal) {
    const c = vm.createContext({ String });
    vm.runInContext(fnSrc('normalizeString') + '\n' + fnSrc('getMaterialId'), c);
    _matIdReal = (a, b) => { c.__a = a; c.__b = b; return vm.runInContext('getMaterialId(__a, __b)', c); };
  }
  return _matIdReal(cat, name);
}

// Una fila del archivo, por las posiciones de AC.
function fila(o){
  const r = new Array(23).fill('');
  r[0]  = new Date(2026, 8, 10);          // TIMESTAMP
  r[1]  = o.cat  || 'WINDOW';             // CATEGORY
  r[2]  = o.name || 'W-1';                // NAME
  r[5]  = o.qty  === undefined ? 10 : o.qty;  // QTY
  r[6]  = o.unit || 'UNIT';               // UNIT
  r[7]  = new Date(2026, 8, 10);          // DATE_REC
  r[8]  = o.src  || '';                   // SRC_LOC
  r[13] = o.proj || '';                   // PROJECT
  r[14] = o.matId !== undefined ? o.matId
        : matIdDe(o.cat || 'WINDOW', o.name || 'W-1');
  r[17] = o.dest || '';                   // DEST_LOC
  r[18] = o.type || 'ENTRY';              // MOVETYPE
  return r;
}

function mundo(filasArchivo, filasHistoria){
  const archive = new Hoja('MASTER_ARCHIVE_V3', [CAB].concat(filasArchivo || []));
  const history = new Hoja('ARCHIVE_HISTORY',   [CAB].concat(filasHistoria || []));
  const live    = new Hoja('LIVE_STOCK',    [[]]);
  const site    = new Hoja('SITE_STOCK',    [[]]);
  const waste   = new Hoja('WASTED_STOCK',  [[]]);
  const hojas = { MASTER_ARCHIVE_V3: archive, ARCHIVE_HISTORY: history,
                  LIVE_STOCK: live, SITE_STOCK: site, WASTED_STOCK: waste };
  const auditoria = [];

  const ctx = vm.createContext({
    String, Number, Array, Object, Date, Math, JSON, console,
    Utilities: { formatDate: (d) => '2026-09-10' },
    Session:   { getScriptTimeZone: () => 'UTC' },
    Logger:    { log: () => {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    auditLog_: (ss2, tipo, quien, qué, dónde, detalle) =>
      auditoria.push({ tipo, qué, dónde, detalle }),
    describeMatIdFixes_: (f) => 'arreglos: ' + f.length,
    ensureWasteSheet_:          () => waste,
    ensureArchiveHistorySheet_: () => history
  });
  const ss = { getSheetByName: (n) => hojas[n] || null };
  ctx.__ss = ss;

  vm.runInContext(constSrc('SHEETS'), ctx);
  vm.runInContext(constSrc('AC'), ctx);
  ['normalizeString', 'getMaterialId', 'parseArchiveRow', 'textCell_', 'textSafeRow_',
   'refreshDerivedSheets_'].forEach(n => vm.runInContext(fnSrc(n), ctx));

  vm.runInContext('refreshDerivedSheets_(__ss)', ctx);

  // LIVE_STOCK: [Category, Name, Project, Location, Qty, Unit, Location_Type, ...]
  const leer = (h, iLoc, iQty) => {
    const out = {};
    h.rows.slice(1).forEach(r => {
      if (!r || !r[0]) return;
      out[String(r[1]) + '@' + String(r[iLoc])] = Number(r[iQty]);
    });
    return out;
  };
  return {
    archive, history, live, site, waste, auditoria,
    enRack:  leer(live, 3, 4),                       // nombre@estante → cantidad
    enObra:  leer(site, 2, 3),                       // nombre@proyecto → cantidad
    tirado:  (function(){ const o = {}; waste.rows.slice(1).forEach(r => {
                if (r && r[0]) o[String(r[1])] = Number(r[2]); }); return o; })()
  };
}

console.log('\n═══ el histórico vacío no se lee ═══\n');
{
  const m = mundo([ fila({ type: 'ENTRY', name: 'W-1', dest: 'A1', qty: 40 }) ], []);
  check('con el histórico VACÍO no se pide su contenido — es el viaje de ~400 ms ' +
        'que se pagaba en cada guardado y cada borrado para traerse una hoja con ' +
        'la cabecera y nada debajo',
    m.history.pedidos.indexOf('getDataRange') === -1, m.history.pedidos);
  check('...pero sí se le pregunta cuántas filas tiene, que es de lo barato',
    m.history.pedidos.indexOf('getLastRow') !== -1);
  check('y el archivo sí se lee entero, como siempre',
    m.archive.pedidos.indexOf('getDataRange') !== -1);
  check('los totales salen igual', m.enRack['W-1@A1'] === 40);
}

console.log('\n═══ y el histórico CON filas cuenta entero ═══\n');
{
  // EL FALLO QUE ESTE ARCHIVO EXISTE PARA IMPEDIR. Si el salto se aplicara
  // también con filas dentro, esas filas dejarían de contar: el almacén
  // informaría de MENOS material del que tiene y nada avisaría. Es la clase de
  // error que se descubre semanas después, contando cajas a mano.
  const m = mundo(
    [ fila({ type: 'ENTRY', name: 'W-1', dest: 'A1', qty: 40 }) ],
    [ fila({ type: 'ENTRY', name: 'W-1', dest: 'A1', qty: 7 }),
      fila({ type: 'ENTRY', name: 'W-2', dest: 'B2', qty: 5 }) ]);
  check('el histórico se lee cuando tiene algo',
    m.history.pedidos.indexOf('getDataRange') !== -1, m.history.pedidos);
  check('...y sus filas SUMAN al mismo estante que las del archivo (40 + 7 = 47)',
    m.enRack['W-1@A1'] === 47, m.enRack);
  check('...incluido un material que SÓLO existe en el histórico',
    m.enRack['W-2@B2'] === 5, m.enRack);
}

console.log('\n═══ la aritmética que nadie estaba ejecutando ═══\n');
{
  const m = mundo([
    fila({ type: 'ENTRY',    name: 'W-1', dest: 'A1', qty: 100 }),
    fila({ type: 'EXIT',     name: 'W-1', src:  'A1', qty: 30, proj: 'DECK A' }),
    fila({ type: 'TRANSFER', name: 'W-1', src:  'A1', dest: 'B2', qty: 20 }),
    fila({ type: 'RETURN',   name: 'W-1', dest: 'A1', qty: 10, proj: 'DECK A' }),
    fila({ type: 'WASTE',    name: 'W-1', src:  'A1', qty: 5 })
  ], []);
  // 100 − 30 − 20 + 10 − 5 = 55 en A1, y 20 en B2.
  check('ENTRY suma, EXIT resta, TRANSFER mueve, RETURN devuelve y WASTE quita — ' +
        'A1 queda en 55', m.enRack['W-1@A1'] === 55, m.enRack);
  check('...y el estante de destino del traslado tiene los 20',
    m.enRack['W-1@B2'] === 20, m.enRack);
  check('lo que salió a la obra queda a nombre del proyecto, y la devolución lo ' +
        'baja (30 − 10 = 20)', m.enObra['W-1@DECK A'] === 20, m.enObra);
  check('lo tirado se cuenta aparte', m.tirado['W-1'] === 5, m.tirado);
}

{
  // ADJUST: sube o baja sin contraparte, y NO toca lo tirado ni la obra.
  const m = mundo([
    fila({ type: 'ENTRY',  name: 'W-1', dest: 'A1', qty: 50 }),
    fila({ type: 'ADJUST', name: 'W-1', src:  'A1', qty: 8 }),   // faltaban 8
    fila({ type: 'ADJUST', name: 'W-1', dest: 'A1', qty: 3 })    // aparecieron 3
  ], []);
  check('una corrección de conteo baja (50 − 8 + 3 = 45)',
    m.enRack['W-1@A1'] === 45, m.enRack);
  check('...y no inventa material tirado: es lo que distingue a ADJUST de WASTE',
    m.tirado['W-1'] === undefined, m.tirado);
  check('...ni material en obra: no se movió nada a ninguna parte',
    Object.keys(m.enObra).length === 0, m.enObra);
}

console.log('\n═══ los estantes se comparan normalizados (CRITICAL) ═══\n');
{
  // El propio archivo marca esta línea como CRITICAL, y cuenta el fallo que la
  // trajo: un "+21" aparcado bajo "B1A" que un "−21" bajo " b1a" nunca cancela.
  // El material se queda en el almacén para siempre, y ni reconstruir desde
  // cero lo arregla, porque lo que estaba mal era la comparación.
  const m = mundo([
    fila({ type: 'ENTRY', name: 'W-1', dest: 'B1A',   qty: 21 }),
    fila({ type: 'EXIT',  name: 'W-1', src:  ' b1a ', qty: 21, proj: 'DECK A' })
  ], []);
  const quedan = Object.keys(m.enRack).filter(k => k.indexOf('W-1@') === 0);
  check('"B1A" y " b1a " son el mismo estante: no queda nada en el almacén',
    quedan.length === 0, m.enRack);
  check('...y los 21 están en la obra, donde de verdad se fueron',
    m.enObra['W-1@DECK A'] === 21, m.enObra);
}

console.log('\n═══ el MatID no se cree, se recalcula ═══\n');
{
  // Dos filas del mismo material con MatID distinto guardado. El comentario del
  // código explica por qué: caminos de guardado viejos escribieron cosas
  // distintas. Se agrupan por categoría+nombre recalculados, no por lo escrito.
  const m = mundo([
    fila({ type: 'ENTRY', name: 'W-1', dest: 'A1', qty: 10, matId: 'BASURA-VIEJA' }),
    fila({ type: 'ENTRY', name: 'W-1', dest: 'A1', qty: 4 })
  ], []);
  check('dos filas del mismo material caen en el mismo montón aunque su MatID ' +
        'guardado difiera (10 + 4 = 14)', m.enRack['W-1@A1'] === 14, m.enRack);
  check('...y la fila mal se repara en la hoja, no sólo en memoria',
    m.archive.rows[1][14] === matIdDe('WINDOW', 'W-1'), m.archive.rows[1][14]);
  check('...y queda constancia en la auditoría, con las filas nombradas',
    m.auditoria.length === 1 && m.auditoria[0].tipo === 'AUTO_REPAIR_MATID' &&
    /rows 2/.test(m.auditoria[0].dónde), m.auditoria);
}

console.log('\n═══ un estante en cero no ocupa una fila ═══\n');
{
  const m = mundo([
    fila({ type: 'ENTRY', name: 'W-1', dest: 'A1', qty: 10 }),
    fila({ type: 'EXIT',  name: 'W-1', src:  'A1', qty: 10, proj: 'DECK A' })
  ], []);
  check('un estante que quedó a cero no se escribe en LIVE_STOCK — una hoja ' +
        'llena de ceros es una hoja que cuesta leer y no dice nada',
    Object.keys(m.enRack).length === 0, m.enRack);
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('Medido en la hoja de Jose el 2026-09-10: leer ARCHIVE_HISTORY con');
console.log('CERO filas costaba 1043 / 426 / 422 ms, y leer MASTER_ARCHIVE_V3');
console.log('con 1061 filas × 23 columnas costaba 964 / 983 / 643 ms. El precio');
console.log('de Sheets no son los datos: es el viaje. Cualquier idea de');
console.log('optimización que empiece por "leer menos celdas" está mirando el');
console.log('número equivocado; la que sirve empieza por "hacer menos viajes".');
console.log('────────────────────────────────────────────────────────────────────────\n');

console.log(fail ? `derived refresh: ${fail} FALLO(S), ${ok} ok` : `derived refresh: ok (${ok})`);
process.exit(fail ? 1 : 0);
