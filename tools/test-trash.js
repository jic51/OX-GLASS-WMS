// BORRAR YA NO DESTRUYE, Y NO BORRA EL EQUIVOCADO.
//
// Hasta la v11.55, borrar un movimiento era `archive.deleteRow(rowIdx)`: la
// fila desaparecía, y con ella cualquier forma de contestar a "¿quién borró el
// conteo que había ayer aquí?". Jose lo pidió por lo primero — "hay algunas
// cosas que hice que quisiera eliminar pero no se puede" — pero el peligro era
// lo segundo:
//
//   AL BORRAR UNA FILA, TODAS LAS DE ABAJO SUBEN UN NÚMERO. Así que el número
//   que el navegador tenía en la mano podía señalar OTRO movimiento para cuando
//   llegaba al servidor. Y no avisaba: el movimiento equivocado desaparecía y
//   el que se quería borrar se quedaba.
//
// Jose lo confirmó en vivo el 2026-09-07 con dos cuentas.
//
// LO QUE ESTE ARCHIVO PROTEGE:
//
//   1. Que se borre POR NOMBRE, no por posición. Es lo que hace imposible el
//      fallo, en vez de hacerlo improbable.
//   2. Que la fila se guarde ANTES de quitarla. Al revés, un fallo entre las
//      dos operaciones destruye el movimiento sin dejar de dónde sacarlo.
//   3. Que la copia sea la FILA ENTERA, tal cual. Una reconstrucción a partir
//      de sus campos devolvería algo parecido, no lo mismo.
//   4. Que al segundo que borra NO se le diga que funcionó. Es la misma mentira
//      que contaba el desbloqueo doble: los dos se van creyendo que lo hicieron
//      ellos. Hay que decir quién fue y cuándo.
//   5. Que restaurar devuelva la fila A LA HOJA DE DONDE SALIÓ, y que salga de
//      la papelera SÓLO cuando ya está puesta en su sitio.
//   6. Que la papelera NO la lea el motor de stock. Si la leyera, borrar no
//      restaría nada y todo esto no serviría para nada.
//
// Se EJECUTAN las funciones de verdad, sacadas del archivo.
//
// Uso:  node tools/test-trash.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

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
// Un comentario que EXPLICA lo que se quitó contiene, por fuerza, las palabras
// que se quitaron. Sin esto, esta prueba leía mi propio comentario ("this
// cannot be undone") como si fuera el texto del aviso, y fallaba contra código
// correcto — el mismo error de bulto que ya cometí antes midiendo entornos
// inventados en vez del producto.
function sinComentarios(src){
  return src.replace(/^\s*\/\/.*$/gm, '');
}

function varSrc(name){
  const i = GS.indexOf('var ' + name + ' =');
  if (i === -1) throw new Error('no encontrada: ' + name);
  const end = GS.indexOf('\n};', i);
  if (end !== -1 && end < GS.indexOf(';', i)) return GS.slice(i, end + 3);
  return GS.slice(i, GS.indexOf(';', i) + 1);
}

const AC = (function(){
  const m = GS.match(/var AC = \{[\s\S]*?\n\};/);
  const c = vm.createContext({});
  vm.runInContext(m[0], c);
  return vm.runInContext('AC', c);
})();
const AC_WIDTH   = Number((GS.match(/var AC_WIDTH = (\d+);/) || [])[1]);
const TRASH_WIDTH = AC_WIDTH + 3;
const TR = { DELETED_AT: AC_WIDTH, DELETED_BY: AC_WIDTH + 1, FROM_SHEET: AC_WIDTH + 2 };

// ── Una hoja falsa que se comporta como una de verdad ───────────────────────
// Incluido lo que más importa aquí: deleteRow CORRE LAS DE ABAJO. Una hoja de
// mentira que no lo hiciera no podría enseñar el fallo que esto arregla.
function Hoja(nombre, filas, maxCols){
  this.nombre = nombre;
  this.rows = filas.map(r => r.slice());
  this._maxCols = maxCols || 30;
}
// La comilla NO forma parte del valor: Sheets la usa para decir "esto es texto,
// no lo interpretes" y la quita al guardar — getValues() devuelve "07-6329", no
// "'07-6329". Desde la v11.63 todo escritor de filas protege sus cadenas así
// (ver textCell_), de modo que una hoja falsa que se quedara la comilla fallaría
// cada comparación de nombre por un motivo que en producción no existe.
function comoSheets(v){
  return (typeof v === 'string' && v.charAt(0) === "'") ? v.slice(1) : v;
}

Hoja.prototype.getName        = function(){ return this.nombre; };
Hoja.prototype.getLastRow     = function(){ return this.rows.length; };
Hoja.prototype.getMaxColumns  = function(){ return this._maxCols; };
Hoja.prototype.insertColumnsAfter = function(a, n){ this._maxCols += n; };
Hoja.prototype.setFrozenRows  = function(){};
Hoja.prototype.deleteRow      = function(r){ this.rows.splice(r - 1, 1); };
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
        for (let j = 0; j < vals[i].length; j++) self.rows[r - 1 + i][c - 1 + j] = comoSheets(vals[i][j]);
      }
    },
    setNumberFormat(){ return this; },
    setFontWeight(){ return this; }
  };
};

function fila(ts, cat, name, qty, id, extra){
  const r = new Array(AC_WIDTH).fill('');
  r[AC.TIMESTAMP] = ts; r[AC.CATEGORY] = cat; r[AC.NAME] = name;
  r[AC.QTY] = qty; r[AC.UNIT] = 'UNIT'; r[AC.MOVETYPE] = 'ENTRY';
  r[AC.DEST_LOC] = 'B2A'; r[AC.MOV_ID] = id;
  if (extra) Object.keys(extra).forEach(k => { r[AC[k]] = extra[k]; });
  return r;
}

function mundo(){
  const cab = new Array(AC_WIDTH).fill('');
  cab[AC.CATEGORY] = 'Type'; cab[AC.NAME] = 'Name'; cab[AC.MOV_ID] = 'Movement ID';
  const archive = new Hoja('MASTER_ARCHIVE_V3', [cab,
    fila(new Date(1757000000000), 'GLASS', 'MH 145', 10, 'M-UNO'),
    fila(new Date(1757000060000), 'GLASS', 'MH 200', 20, 'M-DOS'),
    fila(new Date(1757000120000), 'ALUM',  'SILL 12', 30, 'M-TRES')
  ]);
  const history = new Hoja('ARCHIVE_HISTORY', [cab,
    fila(new Date(1700000000000), 'GLASS', 'VIEJO', 5, 'M-VIEJO')
  ]);
  const hojas = { 'MASTER_ARCHIVE_V3': archive, 'ARCHIVE_HISTORY': history };
  const auditadas = [];

  const c = vm.createContext({
    Date, Math, String, Number, JSON, Array, Object, console,
    AC, AC_WIDTH, TR, TRASH_WIDTH,
    // La marca que distingue "no está" de cualquier otro no. Se toma del
    // archivo, no se escribe aquí: si allí cambia, esto tiene que caerse.
    GONE_PREFIX: /var GONE_PREFIX = '([^']+)'/.exec(GS)[1],
    SHEETS: { ARCHIVE: 'MASTER_ARCHIVE_V3', ARCHIVE_HISTORY: 'ARCHIVE_HISTORY',
              TRASH: 'MOVEMENT_TRASH' },
    Session: { getScriptTimeZone: () => 'UTC' },
    SpreadsheetApp: { getActiveSpreadsheet: () => c.ss },
    Utilities: { formatDate: (d) => 'Sep 8, 10:45 AM' },
    auditLog_: function(){ auditadas.push(Array.prototype.slice.call(arguments, 1)); },
    refreshDerivedSheets_: function(){ c.refrescos++; },
    rewriteArchiveColumn_: () => 0,
    refrescos: 0,
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
    ctx: c, hojas, auditadas,
    op: (data) => vm.runInContext(
      'manageMaterialLocked_(' + JSON.stringify(data) + ', { email: "jose@ox-glass.com", role: "ADMIN" })', c)
  };
}

// ── Borrar ──────────────────────────────────────────────────────────────────
console.log('\n═══ borrar señala un NOMBRE, no una posición ═══\n');
{
  const m = mundo();
  const antes = m.hojas['MASTER_ARCHIVE_V3'].rows.length;

  // El escenario de Jose: el navegador manda un número de fila que ya no vale
  // —otra persona borró antes y todo subió— junto con el nombre correcto.
  const res = m.op({ op: 'deleteRow', movId: 'M-DOS', rowIdx: 99 });

  check('lo borra igual, aunque el número de fila sea disparatado — es la línea ' +
        'que hace imposible borrar el equivocado, no sólo improbable',
    res.status === 'success');
  check('desapareció el que se pidió',
    !m.hojas['MASTER_ARCHIVE_V3'].rows.some(r => r[AC.MOV_ID] === 'M-DOS'));
  check('Y LOS OTROS DOS SIGUEN AHÍ — con el número de fila, el 99 habría sido ' +
        'otro movimiento o un error, nunca éste',
    m.hojas['MASTER_ARCHIVE_V3'].rows.some(r => r[AC.MOV_ID] === 'M-UNO') &&
    m.hojas['MASTER_ARCHIVE_V3'].rows.some(r => r[AC.MOV_ID] === 'M-TRES') &&
    m.hojas['MASTER_ARCHIVE_V3'].rows.length === antes - 1);

  const papelera = m.hojas['MOVEMENT_TRASH'];
  check('la papelera existe y tiene el movimiento', !!papelera && papelera.rows.length === 2);

  const guardada = papelera.rows[1];
  check('SE GUARDA LA FILA ENTERA, TAL CUAL — reconstruirla a partir de sus ' +
        'campos devolvería algo parecido, no lo mismo',
    guardada[AC.QTY] === 20 && guardada[AC.NAME] === 'MH 200' &&
    guardada[AC.MOVETYPE] === 'ENTRY' && guardada[AC.DEST_LOC] === 'B2A');
  check('con quién lo borró', guardada[TR.DELETED_BY] === 'jose@ox-glass.com');
  check('cuándo', guardada[TR.DELETED_AT] instanceof Date);
  check('y de qué hoja salió, que es lo que hace posible devolverlo a su sitio',
    guardada[TR.FROM_SHEET] === 'MASTER_ARCHIVE_V3');
  check('los totales de stock se recalculan — sin eso, el movimiento borrado ' +
        'sigue contando para siempre', m.ctx.refrescos === 1);
  check('queda en la auditoría con su nombre',
    m.auditadas.some(a => a[0] === 'DELETE_ROW' && String(a[4]).indexOf('M-DOS') === 0));
}

console.log('\n═══ y guarda ANTES de quitar ═══\n');
{
  const cuerpo = sinComentarios(fnSrc(GS, 'manageMaterialLocked_'));
  const seg = cuerpo.slice(cuerpo.indexOf("op === 'deleteRow'"), cuerpo.indexOf("op === 'restoreMovement'"));
  check('la copia a la papelera va antes del borrado — al revés, un fallo entre ' +
        'las dos destruye el movimiento sin dejar de dónde sacarlo',
    seg.indexOf('trash.getRange') < seg.indexOf('found.sheet.deleteRow'));
}

console.log('\n═══ al segundo que borra NO se le dice que funcionó ═══\n');
{
  const m = mundo();
  m.op({ op: 'deleteRow', movId: 'M-DOS' });
  let err = null;
  try { m.op({ op: 'deleteRow', movId: 'M-DOS' }); } catch (e) { err = e.message; }
  check('la segunda vez falla en vez de decir "hecho" — es la misma mentira que ' +
        'contaba el desbloqueo doble, y los dos se iban creyendo que fueron ellos',
    !!err);
  check('y dice QUIÉN lo borró (' + err + ')', /jose@ox-glass\.com/.test(err));
  check('...y CUÁNDO', /Sep 8/.test(err));
  check('...y que se puede recuperar, en vez de dejarlo por perdido',
    /trash/i.test(err));
}

console.log('\n═══ un movimiento que nunca existió no es lo mismo ═══\n');
{
  const m = mundo();
  let err = null;
  try { m.op({ op: 'deleteRow', movId: 'M-NO-EXISTE' }); } catch (e) { err = e.message; }
  check('se distingue de "ya lo borró otro" — son dos situaciones distintas y ' +
        'confundirlas manda a la persona a buscar en el sitio equivocado',
    !!err && !/Already deleted/.test(err) && /no longer there/i.test(err));
}

console.log('\n═══ sin nombre no se borra ═══\n');
{
  const m = mundo();
  let err = null;
  try { m.op({ op: 'deleteRow', rowIdx: 2 }); } catch (e) { err = e.message; }
  check('una fila sin ID se NIEGA a borrarse por posición — volver al número de ' +
        'fila "sólo por esta vez" es exactamente cómo vuelve el fallo', !!err);
  check('y dice qué hacer, en vez de dejar a alguien atascado (' + err + ')',
    /Movement IDs/.test(err));
  check('no se borró nada', m.hojas['MASTER_ARCHIVE_V3'].rows.length === 4);
}

// ── Restaurar ───────────────────────────────────────────────────────────────
console.log('\n═══ devolverlo lo deja como estaba ═══\n');
{
  const m = mundo();
  const original = m.hojas['MASTER_ARCHIVE_V3'].rows[2].slice();
  m.op({ op: 'deleteRow', movId: 'M-DOS' });
  const res = m.op({ op: 'restoreMovement', movId: 'M-DOS' });

  check('vuelve', res.status === 'success');
  const vuelta = m.hojas['MASTER_ARCHIVE_V3'].rows.find(r => r[AC.MOV_ID] === 'M-DOS');
  check('y vuelve IDÉNTICO, columna por columna — cantidad, estante, tipo, fecha ' +
        'y su propio nombre', !!vuelta &&
    JSON.stringify(vuelta.slice(0, AC_WIDTH)) === JSON.stringify(original.slice(0, AC_WIDTH)));
  check('la papelera queda vacía', m.hojas['MOVEMENT_TRASH'].rows.length === 1);
  check('y los totales se recalculan otra vez', m.ctx.refrescos === 2);
  check('queda en la auditoría',
    m.auditadas.some(a => a[0] === 'RESTORE_ROW'));
}

console.log('\n═══ vuelve a la hoja de donde salió ═══\n');
{
  const m = mundo();
  m.op({ op: 'deleteRow', movId: 'M-VIEJO' });     // estaba en la historia
  check('se puede borrar uno archivado', m.hojas['ARCHIVE_HISTORY'].rows.length === 1);
  m.op({ op: 'restoreMovement', movId: 'M-VIEJO' });
  check('y vuelve a ARCHIVE_HISTORY, no al archivo activo — si volviera al ' +
        'activo, un movimiento de hace un año reaparecería en la lista reciente',
    m.hojas['ARCHIVE_HISTORY'].rows.some(r => r[AC.MOV_ID] === 'M-VIEJO') &&
    !m.hojas['MASTER_ARCHIVE_V3'].rows.some(r => r[AC.MOV_ID] === 'M-VIEJO'));
}

console.log('\n═══ dos personas devolviendo lo mismo ═══\n');
{
  const m = mundo();
  m.op({ op: 'deleteRow', movId: 'M-DOS' });
  m.op({ op: 'restoreMovement', movId: 'M-DOS' });
  let err = null;
  try { m.op({ op: 'restoreMovement', movId: 'M-DOS' }); } catch (e) { err = e.message; }
  check('la segunda vez lo dice en vez de duplicar el movimiento — que es el ' +
        'daño real: dos filas iguales suman dos veces al stock',
    !!err && /already back/i.test(err));
  check('y sigue habiendo UNA sola',
    m.hojas['MASTER_ARCHIVE_V3'].rows.filter(r => r[AC.MOV_ID] === 'M-DOS').length === 1);
}

{
  const cuerpo = sinComentarios(fnSrc(GS, 'manageMaterialLocked_'));
  const seg = cuerpo.slice(cuerpo.indexOf("op === 'restoreMovement'"), cuerpo.indexOf("op === 'listTrash'"));
  check('al restaurar, la fila se pone en su sitio ANTES de salir de la ' +
        'papelera — el otro orden pierde el movimiento del todo si falla en medio',
    seg.indexOf('target.getRange') < seg.indexOf('entry.sheet.deleteRow'));
}

// ── Lo que la papelera NO debe tocar ────────────────────────────────────────
console.log('\n═══ la papelera no cuenta para el stock ═══\n');
{
  const der = sinComentarios(fnSrc(GS, 'refreshDerivedSheets_'));
  check('el motor de stock lee el archivo y la historia, y NADA MÁS — si leyera ' +
        'la papelera, borrar no restaría nada y todo esto no serviría de nada',
    /SHEETS\.ARCHIVE\b/.test(der) && /ensureArchiveHistorySheet_\(ss\)/.test(der) &&
    !/TRASH/.test(der));
  check('la papelera está declarada como hoja propia, no como una marca en la ' +
        'fila — con una marca, cada lector de este archivo tendría que aprender ' +
        'a saltársela, y el primero que se olvidara contaría material tirado',
    /TRASH: 'MOVEMENT_TRASH'/.test(GS));
  const dq = sinComentarios(fnSrc(GS, 'dqReadRows_'));
  check('el barrido de calidad tampoco la mira', !/TRASH/.test(dq));
}

// ── El navegador ────────────────────────────────────────────────────────────
console.log('\n═══ y en pantalla, al instante ═══\n');
{
  const del = sinComentarios(fnSrc(HTML, '_doDeleteMovementRow'));
  check('manda el nombre del movimiento', /movId: mov\.movId \|\| ''/.test(del));
  check('...y sale antes si no encuentra el movimiento, que es lo que permite ' +
        'leerlo sin comprobar nada más abajo', /if \(!mov\) return;/.test(del));
  /* ESTA REGLA CAMBIÓ EN LA v11.75, Y ESTE ARCHIVO LA CAZÓ.
     Decía: "no se quita nada en el de FALLO: primero el servidor, luego la
     pantalla. Al revés, un 'ya lo borró otro' dejaría la fila desaparecida en
     una cuenta y presente en la otra."
     La primera mitad se cayó a propósito: la fila se va AL PULSAR, porque
     esperar al servidor son cuatro segundos medidos en la hoja de Jose, y
     vuelve a su sitio si el servidor dice que no.
     La SEGUNDA MITAD SEGUÍA SIENDO VERDAD y por poco se pierde con ella: hay
     dos noes —"ya lo borró otro" y "ya no está ahí"— donde devolver la fila
     sería peor que no haberla quitado. El servidor los marca con GONE| desde la
     v11.75, y lo que se comprueba aquí es justo eso. */
  check('la fila se va AL PULSAR: el splice optimista está ANTES de encolar la ' +
        'petición, no dentro del manejador de éxito',
    del.indexOf('_rowLeave(') !== -1 &&
    del.indexOf('_rowLeave(') < del.indexOf('_delEnqueue('));
  check('...y el manejador de éxito conserva su splice como seguro, por si la ' +
        'animación no llegó a correr (pestaña en segundo plano, movimiento ' +
        'reducido, una fila que no estaba pintada)',
    /movements\.splice\(at, 1\)/.test(del) && /renderAll\(\)/.test(del));
  {
    const fallo = del.slice(del.indexOf('withFailureHandler'));
    check('si el servidor dice que no, la fila VUELVE a su sitio — no al final, ' +
          'que sería decirle a alguien que su movimiento es el más reciente ' +
          'cuando es de hace un mes',
      /splice\(\s*Math\.max\(0,\s*Math\.min\(donde/.test(fallo), fallo.slice(0, 200));
    check('PERO UN "YA LO BORRÓ OTRO" NO LA DEVUELVE. Es la mitad de la vieja ' +
          'regla que seguía siendo verdad: devolverla enseñaría un movimiento ' +
          'que ya no existe, en la pantalla que acaba de dar a entender que sí',
      /_isGoneError\(err\)/.test(fallo), fallo.slice(0, 400));
    check('...y en ese caso se quita de la lista si seguía puesta, en vez de ' +
          'dejarla a medias', /movements\.splice\(yaAt, 1\)/.test(fallo));
  }
  check('y el servidor marca esos dos noes con GONE|, en vez de que el navegador ' +
        'los reconozca por el texto del mensaje — un texto se le cambia una ' +
        'palabra y la marca no',
    /GONE_PREFIX \+ 'Already deleted by/.test(GS) &&
    /GONE_PREFIX \+ 'This movement is no longer there/.test(GS));
  check('...y la marca NO se le enseña nunca a nadie: _stripTags la quita, igual ' +
        'que quita SYSTEM_BUSY|',
    /replace\('GONE\|', ''\)/.test(fnSrc(HTML, '_stripTags')));
  check('la recarga silenciosa sigue ahí, para los totales que calcula el servidor',
    /loadDataFromGoogle\(true, true\)/.test(del));

  const conf = sinComentarios(fnSrc(HTML, 'deleteMovementRow'));
  check('el aviso ya NO dice "no se puede deshacer", porque ahora sí se puede — ' +
        'decir lo contrario hacía que la gente parase a preguntar antes de tocar ' +
        'un botón que ya es reversible',
    !/cannot be undone/i.test(conf) && /trash/i.test(conf));

  const restore = sinComentarios(fnSrc(HTML, '_restoreMovement'));
  check('el id viaja en un atributo, no dentro de las comillas de un onclick — ' +
        'lo que hay en la hoja lo puede haber escrito una persona a mano',
    /getAttribute\('data-movid'\)/.test(restore));
}

console.log('\n' + '─'.repeat(72));
console.log('El borrado ya no puede llevarse el movimiento equivocado, y ya no');
console.log('destruye nada: lo aparta. Las dos cosas salen de lo mismo — que un');
console.log('movimiento tenga nombre propio.');
console.log('─'.repeat(72));

console.log('\ntrash: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
