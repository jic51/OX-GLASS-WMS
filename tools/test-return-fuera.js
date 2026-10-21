// QUÉ HAY FUERA DE LA BODEGA, POR MATERIAL Y POR SITIO — EJECUTADO.
//
// Jose, 20/10, sobre el formulario de RETURN: *"al seleccionar RETURN es lógico
// que voy a devolver algo que ya estaba fuera de la bodega, pero la app sólo
// sugiere 1 material... debería dar la lista de TODOS los materiales parecidos
// que no están en bodega, junto con la cantidad que tenía"*.
//
// Y el 21/10, decidiendo la forma, que es el matiz que yo no había visto:
//
//   *"Debe ser por material, porque no importa si se hicieron 4 EXITs de un
//   material a un mismo lugar; importa cuánto material hay en ESE LUGAR para
//   devolver la cantidad que necesitamos de ese lugar a la bodega."*
//
// Así que la unidad no es el movimiento ni el material: es **material × sitio**.
//
// ── POR QUÉ ESTA PRUEBA CORRE LA FUNCIÓN DE VERDAD ──────────────────────────
//
// Porque lo que hay que comprobar son NÚMEROS, no que el código esté escrito.
// Leerlo diría que suma salidas y resta devoluciones; sólo ejecutarlo dice si
// cuatro salidas a la misma obra dan una línea de 40 o cuatro líneas de 10.
//
// Y porque esto cierra un agujero de datos: en docs/BACKLOG.md está apuntado
// que devolver material que nunca salió crea existencias de la nada. Si la
// lista sólo ofrece lo que de verdad está fuera, con su cantidad pendiente, ese
// agujero deja de poderse alcanzar desde la pantalla. Eso hay que medirlo, no
// prometerlo.
//
// Usa `andamio.js` a propósito y NO una lista de dependencias a mano: seis
// pruebas de este repositorio la llevan a mano y han mordido seis veces este
// mes (ver docs/BACKLOG.md). No se añade una séptima.
//
// Uso:  node tools/test-return-fuera.js

const path = require('path');
const A    = require(path.join(__dirname, 'andamio.js'));

const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* EL MAPA DE COLUMNAS SE LEE DEL ARCHIVO, no se copia: una copia se queda vieja
 * sin avisar y la prueba mediría otra tabla. */
const AC = (function () {
  const ctx = require('vm').createContext({});
  require('vm').runInContext(A.constantes(GS, ['AC', 'AC_WIDTH', 'SHEETS']), ctx);
  return ctx;
})();

function filaDe(o) {
  const r = new Array(AC.AC_WIDTH).fill('');
  r[AC.AC.CATEGORY]    = o.cat;
  r[AC.AC.NAME]        = o.name;
  r[AC.AC.QTY]         = o.qty;
  r[AC.AC.MOVETYPE]    = o.mt;
  r[AC.AC.SRC_LOC]     = o.src  || '';
  r[AC.AC.DEST_LOC]    = o.dest || '';
  r[AC.AC.UNIT]        = o.unit || '';
  r[AC.AC.PROJECT]     = o.proj || '';
  r[AC.AC.PM]          = o.pm   || '';
  r[AC.AC.RESPONSIBLE] = o.resp || '';
  r[AC.AC.STATUS]      = o.st   || '';
  return r;
}

function correr(filas, categoria) {
  const cab = new Array(AC.AC_WIDTH).fill('h');
  const hoja = new A.Hoja('MASTER_ARCHIVE_V3', [cab].concat(filas.map(filaDe)), AC.AC_WIDTH);

  const ctx = A.montar({
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: n => (n === AC.SHEETS.ARCHIVE ? hoja : null) }) },
    /* La puerta y el cupo son de otras pruebas; aquí se fingen para medir la
     * cuenta y no la autorización. */
    setVerifiedAuth_: (a) => a,
    getUserRole:      () => ({ role: 'ADMIN', email: 'j@o.com' }),
    requireAuth_:     () => ({ role: 'ADMIN', email: 'j@o.com' }),
    requireQuota_:    () => {}
  }, GS, ['getOutstandingBySite'], {
    dobles: ['setVerifiedAuth_', 'getUserRole', 'requireAuth_', 'requireQuota_']
  });

  require('vm').runInContext(A.constantes(GS, ['AC', 'AC_WIDTH', 'SHEETS']), ctx);
  ctx.__cat = categoria || '';
  return require('vm').runInContext('getOutstandingBySite("t", __cat)', ctx);
}

console.log('\n═══ 1. CUATRO SALIDAS AL MISMO SITIO SON UNA LÍNEA ═══\n');
{
  const r = correr([
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 10, mt: 'EXIT', src: 'A1A', dest: 'ORCHARD GATE' },
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 10, mt: 'EXIT', src: 'A1A', dest: 'ORCHARD GATE' },
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 10, mt: 'EXIT', src: 'A1A', dest: 'ORCHARD GATE' },
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 10, mt: 'EXIT', src: 'A1A', dest: 'ORCHARD GATE' }
  ]);
  check('cuatro salidas iguales dan UNA línea — es la decisión de Jose, medida',
    r.length === 1, r.length);
  check('...con la suma, 40', r[0] && r[0].qty === 40, r[0] && r[0].qty);
}

console.log('\n═══ 2. EL MISMO MATERIAL EN DOS OBRAS SON DOS LÍNEAS ═══\n');
{
  const r = correr([
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 6, mt: 'EXIT', dest: 'ORCHARD GATE' },
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 2, mt: 'EXIT', dest: 'KESTREL RIDGE' }
  ]);
  check('dos sitios, dos líneas — son dos devoluciones distintas',
    r.length === 2, r.length);
  check('...y cada una con SU cantidad, no con el total',
    r.map(x => x.qty).sort((a, b) => b - a).join(',') === '6,2',
    r.map(x => x.site + '=' + x.qty));
  check('se ordena por cantidad: lo que más hay fuera, primero',
    r[0].qty >= r[1].qty);
}

console.log('\n═══ 3. LAS DEVOLUCIONES RESTAN, Y EL SALDO ES LO QUE SE OFRECE ═══\n');
{
  const r = correr([
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 10, mt: 'EXIT',   dest: 'ORCHARD GATE' },
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 4,  mt: 'RETURN', src:  'ORCHARD GATE', dest: 'B2B' }
  ]);
  check('salieron 10 y volvieron 4 — quedan 6 fuera',
    r.length === 1 && r[0].qty === 6, r);
}

console.log('\n═══ 4. LO QUE YA VOLVIÓ NO SE OFRECE — Y AQUÍ ESTÁ EL AGUJERO ═══\n');
{
  const r = correr([
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 5, mt: 'EXIT',   dest: 'ORCHARD GATE' },
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 5, mt: 'RETURN', src:  'ORCHARD GATE' }
  ]);
  check('lo que volvió entero desaparece de la lista', r.length === 0, r);

  /* EL AGUJERO QUE ESTO CIERRA. En docs/BACKLOG.md: devolver material que nunca
   * salió crea existencias de la nada, porque `siteQty` tiene suelo en cero
   * mientras `warehouseQty` suma igual. No se arregla aquí —el motor sigue
   * igual— pero deja de poderse ALCANZAR desde la pantalla: la lista no ofrece
   * nada de lo que no esté fuera. */
  const r2 = correr([
    { cat: 'WINDOW', name: 'NUNCA SALIÓ', qty: 20, mt: 'ENTRY', dest: 'A1A' }
  ]);
  check('algo que sólo ENTRÓ no aparece: no se puede devolver lo que nunca ' +
        'salió, y por ahí era por donde se inventaban existencias',
    r2.length === 0, r2);

  const r3 = correr([
    { cat: 'WINDOW', name: 'HISTORIA RARA', qty: 2, mt: 'EXIT',   dest: 'ORCHARD GATE' },
    { cat: 'WINDOW', name: 'HISTORIA RARA', qty: 9, mt: 'RETURN', src:  'ORCHARD GATE' }
  ]);
  check('un saldo negativo —historia desordenada de antes— tampoco se ofrece',
    r3.length === 0, r3);
}

console.log('\n═══ 5. LO QUE SE RELLENA SALE DE LA ÚLTIMA SALIDA ═══\n');
{
  const r = correr([
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 3, mt: 'EXIT', dest: 'ORCHARD GATE',
      unit: 'UNIT', proj: 'ORCHARD GATE PHASE 1', pm: 'AVERY', resp: 'PARKER' },
    { cat: 'WINDOW', name: 'ALDER GROVE C', qty: 3, mt: 'EXIT', dest: 'ORCHARD GATE',
      unit: 'UNIT', proj: 'ORCHARD GATE PHASE 3', pm: 'JORDAN', resp: 'PARKER' }
  ]);
  check('gana la ÚLTIMA: si el jefe de obra cambió, vale lo último que se supo',
    r[0] && r[0].pm === 'JORDAN', r[0] && r[0].pm);
  check('...y el proyecto también', r[0] && r[0].project === 'ORCHARD GATE PHASE 3');

  const r2 = correr([
    { cat: 'WINDOW', name: 'X', qty: 3, mt: 'EXIT', dest: 'OBRA', pm: 'AVERY' },
    { cat: 'WINDOW', name: 'X', qty: 3, mt: 'EXIT', dest: 'OBRA', pm: '' }
  ]);
  check('pero un campo VACÍO no borra lo que dijo la salida anterior',
    r2[0] && r2[0].pm === 'AVERY', r2[0] && r2[0].pm);
}

console.log('\n═══ 6. LA CATEGORÍA YA ESTÁ ELEGIDA, ASÍ QUE FILTRA ═══\n');
{
  const filas = [
    { cat: 'WINDOW', name: 'A', qty: 5, mt: 'EXIT', dest: 'OBRA' },
    { cat: 'SCREEN', name: 'B', qty: 5, mt: 'EXIT', dest: 'OBRA' }
  ];
  check('con categoría, sólo la suya', correr(filas, 'WINDOW').length === 1);
  check('sin categoría, todas', correr(filas, '').length === 2);
}

console.log('\n═══ 7. SIN SITIO NO HAY LÍNEA, Y LAS FILAS VIEJAS CUENTAN ═══\n');
{
  const r = correr([
    { cat: 'WINDOW', name: 'SIN DESTINO', qty: 5, mt: 'EXIT', dest: '' }
  ]);
  check('una salida sin sitio no se ofrece — no hay de dónde devolverla',
    r.length === 0, r);

  /* Y LA REGLA COMPARTIDA, DE PUNTA A PUNTA. `DEL` es como se escribía una
   * salida antes de que existiera la columna MoveType. Hasta la v12.82 había
   * cuatro copias de esa regla y una se había separado; ahora es una sola, y
   * esto comprueba que esta función la usa. */
  const r2 = correr([
    { cat: 'WINDOW', name: 'VIEJA', qty: 7, mt: 'DEL', dest: 'OBRA ANTIGUA' }
  ]);
  check('una fila antigua escrita como `DEL` cuenta como salida — usa la misma ' +
        'regla que el motor de existencias, no una copia suya',
    r2.length === 1 && r2[0].qty === 7, r2);
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
