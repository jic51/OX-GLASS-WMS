// "LOAD OLDER HISTORY" — DE LO MÁS NUEVO HACIA ATRÁS, Y A TANDAS.
//
// Jose, 2026-10-01: *"lo que hace es cargar literalmente los movimientos más
// viejos... la app sólo carga 56 movimientos y luego no puede cargar más;
// debería ir cargando más y más cada vez que se apriete el botón, pero desde los
// más recientes a los más viejos."*
//
// LO QUE PASABA DE VERDAD, que no es exactamente lo que él vio pero sale al
// mismo sitio: la lista SÍ se pintaba de nuevo a viejo (renderMovements invierte
// el conjunto), pero el botón se traía ARCHIVE_HISTORY ENTERO de un golpe y
// después decía "ya está cargado". Con 56 filas eso parece que sólo sabe cargar
// 56; con veinte mil sería un viaje que no termina.
//
// Y LO QUE DE VERDAD FALTABA NO ERA EL PAGINADO: era que el botón dijera SI HA
// TERMINADO. "Older History (56)" no distingue "van 56 de 56" de "van 56 de
// 1.271", y sin esa diferencia la persona tiene que adivinar. Jose adivinó que
// la app no podía cargar más, que es la conclusión razonable.
//
// Uso:  node tools/test-historico-tandas.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS   = A.fuente('gs');
const HTML = A.fuente('html');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

const AC_WIDTH = 23;
const AC = { TIMESTAMP:0, CATEGORY:1, NAME:2, QTY:5, MOVETYPE:18, MOV_ID:22 };

/* Hoja de mentira con lo que esta función usa: getLastRow, getLastColumn,
 * getMaxColumns y un getRange que devuelve EXACTAMENTE la ventana pedida — que
 * es lo único que importa aquí, porque el arreglo entero consiste en pedir una
 * ventana en vez de la hoja. */
function hojaFalsa(filas) {
  const h = {
    _filas: filas.map(r => r.slice()),
    getLastRow: () => h._filas.length,
    getLastColumn: () => AC_WIDTH,
    getMaxColumns: () => AC_WIDTH,
    _leidas: 0,
    getRange(f, c, nf, nc) {
      h._leidas += nf;                       // cuántas filas se han llegado a leer
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nf; i++) {
            const src = h._filas[f - 1 + i] || [];
            const fila = [];
            for (let j = 0; j < nc; j++) fila.push(src[c - 1 + j] === undefined ? '' : src[c - 1 + j]);
            out.push(fila);
          }
          return out;
        }
      };
    }
  };
  return h;
}

const CAB = new Array(AC_WIDTH).fill('').map((_, i) => 'C' + i);

/** n movimientos, del más viejo al más nuevo — como los escribe el archivado. */
function historico(n) {
  const filas = [CAB];
  for (let i = 1; i <= n; i++) {
    const r = new Array(AC_WIDTH).fill('');
    r[AC.TIMESTAMP] = new Date(2026, 2, 1 + i);
    r[AC.CATEGORY]  = 'WINDOW';
    r[AC.NAME]      = 'MOV ' + i;            // MOV 1 el más viejo, MOV n el más nuevo
    r[AC.MOVETYPE]  = 'ENTRY';
    r[AC.MOV_ID]    = 'ID-' + i;
    filas.push(r);
  }
  return hojaFalsa(filas);
}

function montar(hoja) {
  const ctx = {
    console, Math, Number, String, Array, Object, Date,
    AC, AC_WIDTH,
    SpreadsheetApp: { getActiveSpreadsheet: () => ctx.ss },
    ss: {},
    ensureArchiveHistorySheet_: () => hoja,
    requireAuth_: () => ({ email: 'jose@ox-glass.com', role: 'ADMIN' }),
    canSeeCosts_: () => true,
    parseArchiveRow: (row, idx) => ({ name: String(row[AC.NAME]), rowIdx: idx,
                                      moveType: String(row[AC.MOVETYPE]) })
  };
  vm.createContext(ctx);
  vm.runInContext(A.constantes(GS, ['OLDER_HISTORY_PAGE']), ctx);
  vm.runInContext(A.levantar(GS, ['loadOlderHistory'], {
    dobles: ['ensureArchiveHistorySheet_', 'requireAuth_', 'canSeeCosts_', 'parseArchiveRow']
  }), ctx);
  return ctx;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. LA PRIMERA TANDA TRAE LAS MÁS NUEVAS — no las más viejas
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. Lo más nuevo primero ═══\n');
{
  const h = historico(1000);
  const ctx = montar(h);
  const r = ctx.loadOlderHistory(null, {});

  check('trae una tanda, no las mil', r.items.length === ctx.OLDER_HISTORY_PAGE, r.items.length);
  check('dice cuántas hay en total', r.total === 1000, r.total);
  check('y cuántas quedan por traer', r.quedan === 1000 - ctx.OLDER_HISTORY_PAGE, r.quedan);

  const nombres = r.items.map(m => m.name);
  check('LA MÁS NUEVA ESTÁ EN LA TANDA — era la queja de Jose: antes se traían ' +
        'las de marzo y las de septiembre no aparecían',
        nombres.indexOf('MOV 1000') !== -1, nombres.slice(-3));
  check('...y la más vieja NO', nombres.indexOf('MOV 1') === -1);

  /* LO QUE HACE QUE ESTO ESCALE: se leen las filas de la tanda, no la hoja. Sin
   * esta comprobación el paginado sería cosmético — el viaje seguiría trayendo
   * veinte mil filas y sólo se enseñarían 300. */
  check('SÓLO SE LEEN LAS FILAS DE LA TANDA, no las mil',
        h._leidas === ctx.OLDER_HISTORY_PAGE, h._leidas);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. CADA PULSACIÓN CONTINÚA HACIA ATRÁS
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2. La segunda tanda sigue donde se quedó la primera ═══\n');
{
  const ctx = montar(historico(1000));
  const a = ctx.loadOlderHistory(null, {});
  const b = ctx.loadOlderHistory(null, { desde: a.items.length });

  check('la segunda tanda trae otras tantas', b.items.length === ctx.OLDER_HISTORY_PAGE);
  check('y quedan menos', b.quedan === 1000 - 2 * ctx.OLDER_HISTORY_PAGE, b.quedan);

  const A1 = a.items.map(m => m.name), B1 = b.items.map(m => m.name);
  check('NO SE REPITE NI UNA — dos tandas que solapan harían ver el mismo ' +
        'movimiento dos veces y nadie sabría cuál es cuál',
        !B1.some(n => A1.indexOf(n) !== -1));
  check('y la segunda es MÁS VIEJA que la primera',
        Number(B1[B1.length - 1].split(' ')[1]) < Number(A1[0].split(' ')[1]),
        [B1[B1.length - 1], A1[0]]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. EL FINAL SE SABE, no se adivina
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. Cuando se acaban, lo dice ═══\n');
{
  const ctx = montar(historico(56));          // los 56 de Jose
  const r = ctx.loadOlderHistory(null, {});
  check('con 56 se traen las 56 de una vez', r.items.length === 56, r.items.length);
  check('Y DICE QUE NO QUEDA NINGUNA — es lo que faltaba: "Older History (56)" ' +
        'no distinguía "van 56 de 56" de "van 56 de 1.271"', r.quedan === 0, r.quedan);

  const masAlla = ctx.loadOlderHistory(null, { desde: 56 });
  check('pedir más allá del final devuelve vacío, no un error',
        masAlla.items.length === 0 && masAlla.quedan === 0, masAlla);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. UN HISTÓRICO VACÍO
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4. Sin histórico ═══\n');
{
  const ctx = montar(hojaFalsa([CAB]));
  const r = ctx.loadOlderHistory(null, {});
  check('no lanza y dice cero', r.items.length === 0 && r.total === 0 && r.quedan === 0, r);
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. EL BOTÓN DICE LA VERDAD
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 5. El rótulo del botón ═══\n');
{
  const rot = A.sinComentarios(A.fnSrc(HTML, '_rotuloHistorico'));
  check('cuando quedan, ofrece traer más', /Load '\s*\+/.test(rot) && /more/.test(rot), rot);
  check('cuando NO quedan, lo dice en vez de callarse',
        /All older history loaded/.test(rot));

  const clic = A.sinComentarios(A.fnSrc(HTML, '_loadOlderHistoryClicked'));
  check('el botón pide desde donde se quedó', /desde:\s*oldMovements\.length/.test(clic));
  check('acumula en vez de reemplazar — si reemplazara, cada tanda borraría la ' +
        'anterior y el botón no serviría de nada',
        /concat\(oldMovements\)/.test(clic), clic.slice(0, 0));
  check('y cuando ya están todas lo dice en vez de "already loaded"',
        /That is all of it/.test(clic));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos, ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
