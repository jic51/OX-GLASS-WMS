// UN MOVIMIENTO TIENE QUE TENER NOMBRE PROPIO.
//
// Hasta la v11.53 un movimiento se identificaba SÓLO por su posición en la
// hoja. Y las posiciones se mueven: al borrar una fila, todas las de abajo
// suben un número, y el trabajo de las 3 de la mañana reescribe las dos hojas
// enteras. Así que el número que el navegador tenía en la mano podía nombrar
// un movimiento DISTINTO para cuando se usaba — y nada, en ningún sitio, se
// daba cuenta. Jose lo confirmó en vivo el 2026-09-07 borrando cuatro
// movimientos con dos cuentas.
//
// La columna de ID es el arreglo. Este archivo protege lo que la hace fiable:
//
//   1. Que la cabecera y el ancho de la fila NO SE SEPAREN. Añadir una columna
//      y olvidar su título deja una franja de códigos sin nombre en la hoja de
//      Jose; olvidar el ancho hace que se escriba fuera de sitio.
//   2. Que dos movimientos guardados EN LA MISMA LLAMADA no compartan id. El
//      tiempo no basta: un lote entero se escribe en el mismo milisegundo.
//   3. Que el relleno de las filas viejas se pueda correr DOS VECES sin hacer
//      nada la segunda. Una migración que hay que correr exactamente una vez es
//      una migración que alguien acabará corriendo dos, por no estar seguro de
//      si funcionó.
//   4. Que el relleno TOQUE UNA SOLA COLUMNA. Si un fallo aquí pudiera
//      reescribir una fila entera, podría estropear una cantidad o un estante.
//   5. Que no le ponga nombre a una fila vacía — sería inventar un movimiento
//      que perdió todos sus datos.
//   6. Que el trabajo nocturno deje de escribir 20 columnas. Decía 20 desde
//      antes de que existieran Unit Cost y Total Cost.
//
// Se EJECUTA la función de verdad, sacada del archivo, contra una hoja falsa.
//
// Uso:  node tools/test-movement-id.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function fnSrc(name){
  const start = GS.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada en Code_v3_fixed.gs: ' + name);
  let depth = 0;
  for (let j = GS.indexOf('{', start); j < GS.length; j++) {
    if (GS[j] === '{') depth++;
    else if (GS[j] === '}') { depth--; if (depth === 0) return GS.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}

// ── El modelo de la fila y su cabecera ──────────────────────────────────────
console.log('\n═══ la columna existe, y la hoja sabe cómo se llama ═══\n');

const AC = (function(){
  const m = GS.match(/var AC = \{[\s\S]*?\n\};/);
  if (!m) throw new Error('no se encontró el mapa AC');
  const ctx = vm.createContext({});
  vm.runInContext(m[0] + '\nAC;', ctx);
  return vm.runInContext('AC', ctx);
})();
const AC_WIDTH = Number((GS.match(/var AC_WIDTH = (\d+);/) || [])[1]);

check('AC.MOV_ID existe', typeof AC.MOV_ID === 'number');
check('y es la ÚLTIMA columna — añadida al final, que es lo único seguro sobre ' +
      'datos que ya existen; insertarla en medio correría todas las de después ' +
      'en cada instalación que haya guardado un movimiento alguna vez',
  AC.MOV_ID === Math.max.apply(null, Object.keys(AC).map(k => AC[k])));
check('el ancho de la fila la incluye (AC_WIDTH = ' + AC_WIDTH + ')',
  AC_WIDTH === AC.MOV_ID + 1);

const header = (function(){
  const i = GS.indexOf("{ name: SHEETS.ARCHIVE, header: [");
  const j = GS.indexOf('] }', i);
  return GS.slice(GS.indexOf('[', i), j + 1);
})();
const headerCols = header.split(',').length;
check('la cabecera de la hoja tiene exactamente AC_WIDTH títulos (' + headerCols +
      ') — si no, la columna nueva queda sin nombre en la hoja de Jose, o peor, ' +
      'los títulos se desplazan respecto a los datos',
  headerCols === AC_WIDTH);
check("...y el último dice 'Movement ID'", /'Movement ID'\]/.test(header));

// ── El id ────────────────────────────────────────────────────────────────────
console.log('\n═══ dos movimientos no pueden llamarse igual ═══\n');

const ctx = vm.createContext({ Date, Math, String, Number, JSON, console });
vm.runInContext('var AC_WIDTH = ' + AC_WIDTH + ';\n' + fnSrc('newMovId_') + '\n' +
                fnSrc('padRow_') + '\n' + fnSrc('readWidth_'), ctx);
const newMovId_ = vm.runInContext('newMovId_', ctx);
const padRow_   = vm.runInContext('padRow_',   ctx);

{
  // El caso real: un lote entero se construye dentro del mismo milisegundo.
  const t = new Date(1757000000000);
  const ids = [];
  for (let i = 0; i < 200; i++) ids.push(newMovId_(i, t));
  check('200 ids del MISMO milisegundo, todos distintos — el tiempo por sí solo ' +
        'no distingue las filas de un lote, porque se escriben todas a la vez',
    new Set(ids).size === 200);

  const otros = [];
  for (let i = 0; i < 500; i++) otros.push(newMovId_(0, new Date(1757000000000 + i)));
  check('500 ids de milisegundos distintos, todos distintos', new Set(otros).size === 500);

  const a = newMovId_(0, new Date(1757000000000));
  const b = newMovId_(0, new Date(1757000001000));
  check('un id posterior ordena después que uno anterior (' + a + ' < ' + b + ') — ' +
        'así la lista de ids sale en el mismo orden que la historia',
    a < b && a.length === b.length);
  check('no lleva espacios ni comas: se copia y se pega de una pieza',
    !/[\s,]/.test(a));
}

// ── Rellenar las filas que ya existen ───────────────────────────────────────
console.log('\n═══ el relleno de las filas viejas ═══\n');

// Una hoja falsa con lo justo: rangos por fila/columna, y un registro de TODO
// lo que se escribe, para poder afirmar que no se tocó nada más.
function hojaFalsa(filas, maxCols){
  const cells = filas.map(r => r.slice());
  const escrituras = [];
  return {
    _cells: cells, _escrituras: escrituras,
    getLastRow: () => cells.length,
    getMaxColumns: () => (maxCols || 26),
    insertColumnsAfter: (after, n) => { maxCols = (maxCols || 26) + n; },
    getRange(row, col, nr, nc){
      nr = nr || 1; nc = nc || 1;
      return {
        getValue: () => (cells[row - 1] || [])[col - 1],
        setValue(v){
          escrituras.push({ row, col, v });
          if (!cells[row - 1]) cells[row - 1] = [];
          cells[row - 1][col - 1] = v;
          return { setFontWeight: () => {} };
        },
        getValues(){
          const out = [];
          for (let i = 0; i < nr; i++) {
            const src = cells[row - 1 + i] || [];
            out.push(src.slice(col - 1, col - 1 + nc));
          }
          return out;
        },
        setValues(vals){
          for (let i = 0; i < vals.length; i++) {
            for (let j = 0; j < vals[i].length; j++) {
              escrituras.push({ row: row + i, col: col + j, v: vals[i][j] });
              if (!cells[row + i - 1]) cells[row + i - 1] = [];
              cells[row + i - 1][col + j - 1] = vals[i][j];
            }
          }
        }
      };
    }
  };
}

function mundoBackfill(hoja){
  const auditadas = [];
  const c = vm.createContext({
    Date, Math, String, Number, JSON, console,
    AC, AC_WIDTH,
    SHEETS: { ARCHIVE: 'MASTER_ARCHIVE_V3', ARCHIVE_HISTORY: 'ARCHIVE_HISTORY' },
    withStockLock_: (fn) => fn(),
    auditLog_: function(){ auditadas.push(Array.prototype.slice.call(arguments, 1)); },
    ss: { getSheetByName: (n) => (n === 'MASTER_ARCHIVE_V3' ? hoja : null) }
  });
  vm.runInContext(fnSrc('newMovId_') + '\n' + fnSrc('ensureArchiveWidth_') + '\n' +
                  fnSrc('backfillMovementIds_'), c);
  return { c, auditadas,
           correr: () => vm.runInContext('backfillMovementIds_(ss, { email: "jose@ox" })', c) };
}

// Fila = ancho completo. Índices reales del modelo, no inventados.
function fila(ts, cat, name, id){
  const r = new Array(AC_WIDTH).fill('');
  r[AC.TIMESTAMP] = ts;
  r[AC.CATEGORY]  = cat;
  r[AC.NAME]      = name;
  r[AC.QTY]       = 7;
  r[AC.SRC_LOC]   = 'B2A';
  if (id) r[AC.MOV_ID] = id;
  return r;
}

{
  const cabecera = new Array(AC_WIDTH).fill('');
  cabecera[AC.CATEGORY] = 'Type';
  const hoja = hojaFalsa([
    cabecera,
    fila(new Date(1757000000000), 'GLASS', 'MH 145'),
    fila(new Date(1757000060000), 'GLASS', 'MH 200', 'M-YA-TENGO'),
    new Array(AC_WIDTH).fill(''),                       // fila vacía en medio
    fila(new Date(1757000120000), 'ALUM',  'SILL 12')
  ]);

  const m = mundoBackfill(hoja);
  const res = m.correr();

  check('rellena las dos que no tenían nombre', res.filled === 2);
  check('y cuenta aparte la que ya tenía', res.alreadyHad === 1);

  const idFila2 = hoja._cells[1][AC.MOV_ID];
  const idFila5 = hoja._cells[4][AC.MOV_ID];
  check('la fila 2 tiene ahora un id (' + idFila2 + ')', !!idFila2);
  check('la fila 5 tiene otro distinto (' + idFila5 + ')', !!idFila5 && idFila5 !== idFila2);
  check('EL QUE YA TENÍA NO SE TOCA — un id que cambia deja huérfano a todo lo ' +
        'que ya apuntaba a él', hoja._cells[2][AC.MOV_ID] === 'M-YA-TENGO');
  check('LA FILA VACÍA SIGUE VACÍA — ponerle nombre inventaría un movimiento que ' +
        'perdió todos sus datos', !hoja._cells[3][AC.MOV_ID]);
  check('el id de una fila vieja se construye con SU fecha, no con la de hoy — ' +
        'así los ids de la historia ordenan como la historia',
    idFila2 < idFila5);
  check('la cabecera quedó puesta', hoja._cells[0][AC.MOV_ID] === 'Movement ID');

  // Lo más importante de todo: qué se escribió, exactamente.
  const columnasTocadas = new Set(hoja._escrituras.map(e => e.col));
  check('SÓLO SE ESCRIBIÓ LA COLUMNA DEL ID (columnas tocadas: ' +
        Array.from(columnasTocadas).join(', ') + ') — ninguna cantidad, estante, ' +
        'fecha ni precio puede resultar dañado por un fallo aquí, porque nunca ' +
        'se reescribe la fila',
    columnasTocadas.size === 1 && columnasTocadas.has(AC.MOV_ID + 1));

  check('queda anotado en la auditoría', m.auditadas.length === 1 &&
        m.auditadas[0][0] === 'MOVEMENT_ID_BACKFILL' && m.auditadas[0][1] === 'jose@ox');

  // Y la segunda pasada.
  const antes = JSON.stringify(hoja._cells);
  hoja._escrituras.length = 0;
  const res2 = m.correr();
  check('CORRERLO OTRA VEZ NO RELLENA NADA', res2.filled === 0);
  check('...y no escribe nada en absoluto', hoja._escrituras.length === 0);
  check('...y la hoja queda idéntica', JSON.stringify(hoja._cells) === antes);
  check('lo dice con todas las letras en vez de callarse (' + res2.message + ')',
    /already have an ID/.test(res2.message));
}

console.log('\n═══ una hoja demasiado estrecha ═══\n');
{
  // Alguien que borró las columnas sobrantes para dejar la hoja limpia.
  const cabecera = new Array(AC_WIDTH).fill('');
  const hoja = hojaFalsa([cabecera, fila(new Date(1757000000000), 'GLASS', 'MH 145')], 22);
  const m = mundoBackfill(hoja);
  const res = m.correr();
  check('la hoja se ensancha sola y el relleno funciona igual', res.filled === 1);
  check('...y ensanchar NO es lo mismo que estrechar: nunca se quitan columnas',
    hoja.getMaxColumns() >= AC_WIDTH);
}

// ── Lo que el trabajo nocturno escribe ──────────────────────────────────────
console.log('\n═══ el trabajo de las 3 de la mañana ═══\n');
{
  const cuerpo = fnSrc('archiveOldMovements');
  check('ya no escribe un número a mano: usa el ancho de verdad — decía 20 desde ' +
        'antes de que existieran Unit Cost y Total Cost, así que cada noche o ' +
        'fallaba, o dejaba caer los dos precios de cada fila que movía',
    /var colCount = AC_WIDTH;/.test(cuerpo) && !/var colCount = \d+;/.test(cuerpo));
  check('y rellena las filas cortas antes de escribirlas — las dos hojas pueden ' +
        'tener anchos distintos, una actualizada y la otra no',
    (cuerpo.match(/padRow_\(/g) || []).length === 2);
}

console.log('\n═══ lo que llega al navegador ═══\n');
{
  check('cada movimiento viaja con su id', /movId:\s+String\(row\[AC\.MOV_ID\]/.test(GS));
  check('y sigue viajando el número de fila — todavía no se ha cambiado nada a ' +
        'usar el id, así que quitarlo ahora rompería borrar y editar',
    /rowIdx:\s+rowIdx,/.test(GS));
  check('el id se pone al construir la fila, no al leerla: dos movimientos ' +
        'idénticos siguen siendo dos movimientos',
    /row\[AC\.MOV_ID\]\s+= newMovId_\(/.test(GS));
}

console.log('\n' + '─'.repeat(72));
console.log('Esto todavía no arregla el borrado. Le pone nombre a cada movimiento,');
console.log('que es lo que hace falta ANTES de poder arreglarlo: la papelera, el');
console.log('deshacer y quitar la fila al instante apuntan todos a un nombre.');
console.log('─'.repeat(72));

console.log('\nmovement id: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
