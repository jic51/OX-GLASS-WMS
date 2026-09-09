// UNA COLUMNA SIN NOMBRE ES UNA COLUMNA QUE ALGUIEN VA A BORRAR.
//
// Jose estuvo a punto de borrar las columnas U y V de su archivo —Unit Cost y
// Total Cost— porque sus cabeceras estaban EN BLANCO y no había forma de saber
// qué eran. Y tenía razón en dudar: una columna sin nombre en una hoja de
// cálculo parece basura, y alguien acaba limpiándola.
//
// POR QUÉ ESTABAN EN BLANCO: `ensureCoreSheets_` empezaba con
//
//     if (ss.getSheetByName(spec.name)) return;
//
// o sea, si la hoja YA EXISTÍA se saltaba entera. Las columnas que se añadieron
// después de instalar —las dos de costo, la de Movement ID— se escribían por su
// índice y su cabecera no la ponía nadie nunca.
//
// Y el comentario de esa misma función YA PROMETÍA lo contrario: "this only
// fills in what is missing, so it is safe on an installation that already has
// data". El código no lo hacía. Esto lo pone de acuerdo con lo que dice.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que una cabecera vacía se rellene.
//   2. Que una cabecera CON TEXTO no se toque JAMÁS, diga lo que diga. La hoja
//      de Jose llama "Racks" a lo que la especificación llama "Locations", y da
//      igual: todo el código va por POSICIÓN. Renombrarla sería un cambio que
//      él no pidió y podría romper un filtro o una fórmula suyos.
//   3. Que una hoja MÁS ESTRECHA que la especificación se ensanche primero —
//      escribir la cabecera 23 en una hoja de 20 columnas revienta.
//   4. Que no se escriba nada cuando no falta nada. Una escritura por arranque
//      que no cambia nada es cuota gastada en no hacer nada.
//   5. Que quede en la auditoría: alguien tiene que poder ver que la app tocó
//      la fila 1 de su hoja.
//
// Uso:  node tools/test-headers-repair.js

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

// ── Una hoja falsa que sabe cuántas columnas tiene ──────────────────────────
// Es la parte que importa aquí: una hoja de mentira infinitamente ancha no
// podría enseñar nunca el fallo de escribir más allá de su último borde.
function Hoja(fila1, maxCols){
  this.rows = [ (fila1 || []).slice() ];
  this._max = maxCols === undefined ? 26 : maxCols;
  this.escrituras = 0;
  this.ensanchada = 0;
  this.congelada = false;
  this.negrita = 0;
}
Hoja.prototype.getMaxColumns = function(){ return this._max; };
Hoja.prototype.insertColumnsAfter = function(despues, n){
  this.ensanchada += n; this._max += n;
};
Hoja.prototype.setFrozenRows = function(){ this.congelada = true; };
Hoja.prototype.getRange = function(r, c, nr, nc){
  const self = this;
  if (c - 1 + nc > self._max) throw new Error('fuera de la hoja: pide ' + (c - 1 + nc) + ' de ' + self._max);
  return {
    getValues(){
      const row = self.rows[r - 1] || [];
      const out = [];
      for (let j = 0; j < nc; j++) out.push(row[c - 1 + j] !== undefined ? row[c - 1 + j] : '');
      return [out];
    },
    setValues(vals){
      self.escrituras++;
      while (self.rows.length < r) self.rows.push([]);
      for (let j = 0; j < vals[0].length; j++) self.rows[r - 1][c - 1 + j] = vals[0][j];
      return { setFontWeight(){ self.negrita++; return this; } };
    },
    setFontWeight(){ self.negrita++; return this; }
  };
};

function mundo(){
  const c = vm.createContext({ String, Number, Array, Object, console });
  vm.runInContext(fnSrc('fillMissingHeaders_'), c);
  return {
    ctx: c,
    llamar: (hoja, cabeceras) => {
      c.__h = hoja; c.__c = cabeceras;
      return vm.runInContext('fillMissingHeaders_(__h, __c)', c);
    }
  };
}

// La especificación del archivo, sacada del código y no reescrita aquí: una
// copia probaría la copia.
const cabArchivo = (function(){
  const m = GS.match(/\{ name: SHEETS\.ARCHIVE, header: \[([\s\S]*?)\] \},/);
  if (!m) throw new Error('no encontrada la cabecera del archivo');
  return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
})();

console.log('\n═══ lo que falta se rellena; lo que hay no se toca ═══\n');
{
  const m = mundo();
  // La hoja de Jose: nombres propios en las primeras, y las tres últimas en
  // blanco porque llegaron en versiones posteriores.
  const fila = cabArchivo.slice();
  fila[8]  = 'Loc';            // él la llama así
  fila[20] = '';               // Unit Cost — en blanco
  fila[21] = '';               // Total Cost — en blanco
  fila[22] = '';               // Movement ID — en blanco
  const h = new Hoja(fila, 26);

  const n = m.llamar(h, cabArchivo);
  check('rellena exactamente las tres que faltaban', n === 3, n);
  check('Unit Cost recupera su nombre',   h.rows[0][20] === 'Unit Cost');
  check('Total Cost también',             h.rows[0][21] === 'Total Cost');
  check('y Movement ID',                  h.rows[0][22] === 'Movement ID');
  check('LA QUE ÉL LLAMA "Loc" SE QUEDA COMO ESTÁ — todo el código va por ' +
        'posición, así que renombrarla sería un cambio que nadie pidió',
        h.rows[0][8] === 'Loc');
  check('escribe la fila UNA sola vez, no celda a celda', h.escrituras === 1);
  check('y la deja en negrita, como las demás',           h.negrita >= 1);
}

console.log('\n═══ cuando no falta nada, no se escribe nada ═══\n');
{
  const m = mundo();
  const h = new Hoja(cabArchivo.slice(), 26);
  const n = m.llamar(h, cabArchivo);
  check('no cuenta ninguna que rellenar',   n === 0, n);
  check('Y NO ESCRIBE. Una escritura por arranque que no cambia nada es cuota ' +
        'gastada en no hacer nada', h.escrituras === 0, h.escrituras);
  check('ni ensancha la hoja',              h.ensanchada === 0);
}

console.log('\n═══ una hoja más estrecha que la especificación ═══\n');
{
  const m = mundo();
  // 20 columnas: es lo que tenía el archivo ANTES de que llegaran las de costo.
  const h = new Hoja(cabArchivo.slice(0, 20), 20);
  const n = m.llamar(h, cabArchivo);
  check('la ensancha primero — escribir la cabecera 23 en una hoja de 20 revienta',
        h.ensanchada === cabArchivo.length - 20, h.ensanchada);
  check('y luego rellena las que faltaban', n === cabArchivo.length - 20, n);
  check('la última queda con su nombre',
        h.rows[0][cabArchivo.length - 1] === cabArchivo[cabArchivo.length - 1]);
}

console.log('\n═══ los casos raros no revientan ═══\n');
{
  const m = mundo();
  check('sin hoja, devuelve 0 en vez de fallar',        m.llamar(null, cabArchivo) === 0);
  check('sin cabeceras, devuelve 0',                    m.llamar(new Hoja([], 26), []) === 0);
  const h = new Hoja(['  ', 'Type'], 26);
  check('una cabecera con sólo espacios cuenta como vacía',
        m.llamar(h, ['System Date', 'Type']) === 1 && h.rows[0][0] === 'System Date');
}

console.log('\n═══ y que ensureCoreSheets_ lo use de verdad ═══\n');
{
  const cuerpo = fnSrc('ensureCoreSheets_');
  check('una hoja que ya existe deja de saltarse entera',
        !/if \(ss\.getSheetByName\(spec\.name\)\) return;/.test(cuerpo));
  check('se le rellenan las cabeceras que le falten',
        /fillMissingHeaders_\(yaEsta, spec\.header\)/.test(cuerpo));
  check('y queda en la auditoría — alguien tiene que poder ver que la app tocó ' +
        'la fila 1 de su hoja',
        /auditLog_\([\s\S]{0,60}'REPAIR_HEADERS'/.test(cuerpo));
  check('sólo se audita si de verdad se reparó algo',
        /if \(repaired\.length\)/.test(cuerpo));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobacion(es) ok\n');
process.exit(fail ? 1 : 0);
