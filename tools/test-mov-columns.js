// CUATRO COLUMNAS EN DOS, SIN QUE NADIE PIERDA SU ORDEN.
//
// Jose, 2026-09-09, después de mirar Movements con el editor de columnas
// abierto:
//
//   "al dar clic en columns no se mueve nada en el lugar donde está el botón,
//    eso sí es cierto, pero se mueve toda la parte de los movimientos, se abren
//    las columnas más grandes y el header se hace más alto... decidimos que las
//    columnas type, date, category y name no se van a cambiar nunca, entonces
//    si no se van a cambiar podemos unir type sobre date, y category sobre
//    name, reducimos 2 columnas y la pantalla no debe hacerse muy larga
//    horizontalmente."
//
// Las dos mitades importan. La primera es una corrección mía: yo le dije "abre
// Columns y mira que no se mueve nada", y la prueba de la v11.59 mide EL BOTÓN,
// no la tabla. La segunda es su idea, y es mejor que lo que yo iba a hacer —
// pelearme con el alto del encabezado arregla el síntoma; quitar dos columnas
// estrecha la tabla de verdad.
//
// LO QUE ESTE ARCHIVO PROTEGE, y sobre todo el punto 2:
//
//   1. Que las cuatro sean dos, y que las dos sigan sin poder esconderse.
//   2. QUE EL ORDEN GUARDADO DE QUIEN YA USABA LA APP SE TRADUZCA. Sin eso, el
//      filtro que descarta columnas desconocidas tira las cuatro viejas y añade
//      las nuevas AL FINAL: a Jose la tabla se le abriría empezando por Qty, con
//      el tipo y el nombre al otro extremo, sin haber tocado nada.
//   3. Que la de arriba se quede con el sitio de la vieja — es lo que significa
//      "type SOBRE date".
//   4. Que las dos celdas lleven las dos cosas, no una.
//
// Uso:  node tools/test-mov-columns.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function fnSrc(name){
  const start = HTML.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('no encontrada: ' + name);
  let depth = 0;
  for (let j = HTML.indexOf('{', start); j < HTML.length; j++) {
    if (HTML[j] === '{') depth++;
    else if (HTML[j] === '}') { depth--; if (depth === 0) return HTML.slice(start, j + 1); }
  }
  throw new Error('sin cerrar: ' + name);
}
function varSrc(name){
  const i = HTML.indexOf('var ' + name + ' =');
  if (i === -1) throw new Error('no encontrada: ' + name);
  const llave = HTML.indexOf('\n];', i);
  const cierre = HTML.indexOf('\n};', i);
  const punto = HTML.indexOf(';', i);
  const fin = [llave, cierre].filter(x => x !== -1 && x < punto);
  if (fin.length) return HTML.slice(i, Math.min.apply(null, fin) + 3);
  return HTML.slice(i, punto + 1);
}

// ── El modelo de columnas ───────────────────────────────────────────────────
console.log('\n═══ cuatro columnas son dos ═══\n');

const ctx = vm.createContext({ console, JSON, Object, String });
vm.runInContext(varSrc('MOV_COLS') + '\n' + varSrc('COL_MERGES'), ctx);
const MOV_COLS   = vm.runInContext('MOV_COLS', ctx);
const COL_MERGES = vm.runInContext('COL_MERGES', ctx);
const keys = MOV_COLS.map(c => c.key);

check('ya no existen type, date, category ni name por separado',
  !keys.some(k => ['type', 'date', 'category', 'name'].indexOf(k) !== -1));
check('existen "when" y "what" en su lugar',
  keys.indexOf('when') !== -1 && keys.indexOf('what') !== -1);
check('y son las DOS PRIMERAS: lo primero que se lee de un movimiento es qué ' +
      'fue y de qué material', keys[0] === 'when' && keys[1] === 'what');
check('las dos siguen sin poder esconderse — un movimiento sin tipo ni fecha, ' +
      'o sin nombre, no es una fila que sirva para nada',
  MOV_COLS.filter(c => c.key === 'when' || c.key === 'what').every(c => c.lock === true));
check('sus títulos dicen las dos cosas, para que renombrarlos siga teniendo ' +
      'sentido para quien lo lea',
  MOV_COLS.find(c => c.key === 'when').def === 'Type / Date' &&
  MOV_COLS.find(c => c.key === 'what').def === 'Category / Name');
check('la tabla tiene dos columnas MENOS que antes (' + keys.length + ')',
  keys.length === 16);

// ── El orden que la gente ya tenía guardado ─────────────────────────────────
console.log('\n═══ y nadie pierde el orden que ya tenía ═══\n');

function orden(guardado){
  const c = vm.createContext({
    console, JSON, Object,
    localStorage: { getItem: (k) => (k === 'acopio_mov_col_order' ? JSON.stringify(guardado) : null) },
    COL_TABLES: { mov: { cols: MOV_COLS, orderKey: 'acopio_mov_col_order' } }
  });
  vm.runInContext([
    varSrc('COL_MERGES'),
    'function _colCfg(t){ return COL_TABLES[t]; }',
    'function _defaultColOrder(t){ return _colCfg(t).cols.map(function(c){ return c.key; }); }',
    fnSrc('_colOrder')
  ].join('\n'), c);
  return vm.runInContext("_colOrder('mov')", c);
}

{
  // El orden por defecto de antes, tal cual lo tendría guardado alguien que
  // nunca tocó el editor pero sí abrió la app.
  const viejo = ['type','date','category','name','qty','unit','po','locFlow','doc'];
  const nuevo = orden(viejo);
  check('el orden viejo se traduce en vez de tirarse (' + nuevo.slice(0,4).join(', ') + '…)',
    nuevo[0] === 'when' && nuevo[1] === 'what');
  check('...y "when" y "what" NO acaban al final, que es lo que pasaría si el ' +
        'filtro las tratara como columnas desconocidas',
    nuevo.indexOf('when') < nuevo.indexOf('qty') && nuevo.indexOf('what') < nuevo.indexOf('qty'));
  check('lo que iba después sigue después, en su orden',
    nuevo.indexOf('qty') < nuevo.indexOf('unit') &&
    nuevo.indexOf('unit') < nuevo.indexOf('po'));
  check('no queda ninguna columna repetida', new Set(nuevo).size === nuevo.length);
  check('y siguen estando todas las que existen hoy',
    keys.every(k => nuevo.indexOf(k) !== -1));
}

{
  // Alguien que SÍ movió las columnas: puso el nombre delante del todo.
  const personal = ['name','category','type','date','qty','project','unit'];
  const nuevo = orden(personal);
  check('quien había puesto Name delante conserva su sitio: la columna que lo ' +
        'contiene sigue siendo la primera (' + nuevo[0] + ')',
    nuevo[0] === 'what');
  check('...y "when" hereda el sitio de "type", no el de "date" — "type SOBRE ' +
        'date" también quiere decir cuál de las dos manda',
    nuevo[1] === 'when');
  check('y nada se duplica al fusionar dos columnas que estaban separadas',
    new Set(nuevo).size === nuevo.length);
}

{
  const nuevo = orden([]);
  check('sin nada guardado sale el orden por defecto', nuevo[0] === 'when' && nuevo[1] === 'what');
}

{
  // El caso raro pero real: un orden guardado que ya trae las nuevas, porque la
  // persona abrió la app después de actualizar y el editor las guardó.
  const yaNuevo = ['what','when','qty','unit'];
  const nuevo = orden(yaNuevo);
  check('un orden que YA está traducido se deja como está — traducir dos veces ' +
        'no puede cambiar nada', nuevo[0] === 'what' && nuevo[1] === 'when');
}

// ── Las celdas ──────────────────────────────────────────────────────────────
console.log('\n═══ y cada celda lleva las dos cosas ═══\n');
{
  const render = fnSrc('renderMovements');
  check('la celda "when" lleva la insignia del tipo Y la fecha',
    /when:\s*'<td class="mc-when">'\+moveBadge\(m\.moveType\)/.test(render) &&
    /m\.dateRec\|\|m\.timestamp/.test(render));
  check('la celda "what" lleva la categoría Y el nombre',
    /what:\s*'<td class="mc-what">'\+catBadge\(m\.category\)/.test(render) &&
    /displayName\(m\)/.test(render));
  check('el nombre del material sigue en negrita: es lo que la gente busca',
    /\.mc-main\{font-weight:700/.test(HTML));
  check('y la fecha va en gris y más pequeña, porque se lee DESPUÉS de haber ' +
        'encontrado la fila', /\.mc-sub\{font-size:\.72rem;color:var\(--muted\)/.test(HTML));
  check('el nombre puede partirse en varias líneas — un material se puede llamar ' +
        '"SCENIC MOUNTAIN 4PLEX PHASE2" y una celda de una línea lo cortaría',
    /\.mc-main\{[^}]*white-space:normal/.test(HTML));
}

console.log('\n' + '─'.repeat(72));
console.log('La idea es de Jose y es mejor que la mía: yo iba a pelearme con el');
console.log('alto del encabezado, que es el síntoma. Quitar dos columnas');
console.log('estrecha la tabla de verdad.');
console.log('─'.repeat(72));

console.log('\nmov columns: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
