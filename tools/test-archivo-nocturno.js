// LA NOCHE EN QUE EL TRABAJO NOCTURNO BORRÓ EL ARCHIVO ENTERO.
//
// 26 de septiembre de 2026, 3:19:10. ERROR_LOG de Jose, una sola línea:
//
//   archiveOldMovements — El número de columnas de los datos no coincide con el
//   número de columnas del rango. Los datos tienen 23, y el rango, 20.
//
// Catorce horas después Jose abrió Movements y no había NADA. Ni en
// MASTER_ARCHIVE_V3, ni en ARCHIVE_HISTORY. Mil seiscientos movimientos, un año
// de trabajo, en una pestaña vacía con su cabecera puesta.
//
// ── QUÉ PASÓ, EXACTAMENTE ───────────────────────────────────────────────────
//
// El trabajo decía, en este orden:
//
//     archive.getRange(...).clearContent();      // BORRAR
//     archive.getRange(...).setValues(filas);    // ESCRIBIR   ← reventó aquí
//
// Su MASTER_ARCHIVE_V3 tenía 20 columnas de ancho. Las filas del modelo tienen
// AC_WIDTH = 23. `getRange(2,1,n,23)` sobre una hoja de 20 devuelve un rango de
// 20 —Sheets lo recorta, no se queja— y `setValues` con filas de 23 lanza. Para
// entonces el borrado ya había ocurrido.
//
// ── LOS TRES FALLOS, PORQUE NO ES UNO ───────────────────────────────────────
//
//   1. `ensureArchiveWidth_` lleva meses en el archivo, escrita para EXACTAMENTE
//      esto, y este trabajo nunca la llamaba. Una hoja creada antes de las
//      columnas de precio es el caso NORMAL en una actualización.
//
//   2. BORRAR ANTES DE ESCRIBIR. Es el grave, y seguiría siéndolo con el ancho
//      bien: entre esas dos líneas cabe una cuota agotada, un tiempo de espera o
//      un error pasajero de Sheets, y lo que caiga ahí se lleva el archivo.
//
//   3. NADIE SE ENTERÓ. El error fue a ERROR_LOG, que es una pestaña que nadie
//      mira, y la app siguió abriéndose diciendo "No movements match your
//      filters" — la misma frase que dice cuando un filtro no encuentra nada.
//
// ── POR QUÉ ESTA PRUEBA EJECUTA Y NO LEE ────────────────────────────────────
//
// Porque lo que hay que comprobar es qué queda en la hoja DESPUÉS de que algo
// falle a mitad. Eso no se lee en el código: se provoca. La hoja de mentira de
// aquí abajo imita las dos cosas que hicieron falta para el desastre —que
// `getRange` RECORTE el ancho al de la hoja, y que `setValues` lance cuando no
// coinciden— porque sin esas dos fidelidades la prueba pasaría en verde sobre el
// código que destruyó los datos.
//
// Uso:  node tools/test-archivo-nocturno.js

const path = require('path'), vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

const AC_WIDTH = 23;

/* UNA HOJA DE MENTIRA CON LAS DOS CRUELDADES DE SHEETS DE VERDAD:
 *
 *   · getRange(f, c, nf, nc) RECORTA nc al ancho real de la hoja. No avisa.
 *     Ésta es la que convirtió un rango de 23 en uno de 20.
 *   · setValues LANZA si el ancho de los datos no es el del rango, con el mismo
 *     texto que salió en el ERROR_LOG de Jose.
 *
 * Sin las dos, esta prueba mediría un mundo donde el desastre no puede ocurrir. */
function hojaFalsa(nombre, filas, maxCols) {
  const h = {
    nombre,
    _filas: filas.map(r => r.slice()),
    _maxCols: maxCols,
    getName: () => nombre,
    getMaxColumns: () => h._maxCols,
    getMaxRows: () => Math.max(h._filas.length, 2),
    insertColumnsAfter(despues, cuantas) {
      h._maxCols = despues + cuantas;
      h._filas = h._filas.map(r => { while (r.length < h._maxCols) r.push(''); return r; });
    },
    getDataRange: () => ({
      getValues: () => h._filas.map(r => r.slice())
    }),
    getRange(f, c, nf, nc) {
      const anchoReal = Math.min(nc, h._maxCols - c + 1);   // ← Sheets recorta
      return {
        getNumColumns: () => anchoReal,
        setValues(datos) {
          if (datos.length && datos[0].length !== anchoReal) {
            throw new Error('El número de columnas de los datos no coincide con el ' +
              'número de columnas del rango. Los datos tienen ' + datos[0].length +
              ', y el rango, ' + anchoReal + '.');
          }
          for (let i = 0; i < datos.length; i++) {
            const destino = f - 1 + i;
            while (h._filas.length <= destino) h._filas.push(new Array(h._maxCols).fill(''));
            for (let j = 0; j < datos[i].length; j++) h._filas[destino][c - 1 + j] = datos[i][j];
          }
        },
        clearContent() {
          for (let i = 0; i < nf; i++) {
            const destino = f - 1 + i;
            if (!h._filas[destino]) continue;
            for (let j = 0; j < anchoReal; j++) h._filas[destino][c - 1 + j] = '';
          }
        }
      };
    },
    /** Filas con datos de verdad, con la misma regla que usa el producto. */
    conDatos() {
      return h._filas.slice(1).filter(r => r && (r[1] || r[2])).length;
    }
  };
  return h;
}

const CABECERA = ['System Date','Type','Name','GC','Po#','Qty','Unit','Date Received',
  'Loc','Supplier','Comments','In Stock','Responsible','Project','Mat ID',
  'Document links','User','Destination','MoveType','PM'];

/** Un movimiento, con su fecha, del ancho que se le pida. */
function mov(fecha, nombre, ancho) {
  const r = new Array(ancho).fill('');
  r[0] = fecha;              // AC.TIMESTAMP
  r[1] = 'WINDOW';           // AC.CATEGORY
  r[2] = nombre;             // AC.NAME
  r[5] = 3;                  // AC.QTY
  r[18] = 'ENTRY';           // AC.MOVETYPE
  return r;
}

/** Monta la caja con el trabajo de verdad, sacado del archivo. */
function montarTrabajo(archivo, historico, mesesCorte, correos) {
  const ctx = {
    console, JSON, Math, Date, String, Number, Array, Object,
    AC: { TIMESTAMP:0, CATEGORY:1, NAME:2, GC:3, PO:4, QTY:5, UNIT:6, DATE_REC:7,
          SRC_LOC:8, SUPPLIER:9, COMMENTS:10, STATUS:11, RESPONSIBLE:12, PROJECT:13,
          MAT_ID:14, DOC_LINKS:15, USER_EMAIL:16, DEST_LOC:17, MOVETYPE:18, PM:19,
          UNIT_COST:20, TOTAL_COST:21, MOV_ID:22 },
    AC_WIDTH,
    SHEETS: { ARCHIVE: 'MASTER_ARCHIVE_V3' },
    PRODUCT_NAME: 'Acopio',
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock(){} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'jose@ox-glass.com' }) },
    MailApp: { sendEmail(a, b, c){ correos.push({ para:a, asunto:b, cuerpo:c }); } },
    Logger: { log(){} },
    // Dobles: lo que esta prueba no mide.
    ensureArchiveHistorySheet_: () => historico,
    loadConfig: () => ({ archiveCutoffMonths: mesesCorte, adminEmail: 'jose@ox-glass.com' }),
    dedupeMovementIds_: () => [],
    writeMovIdColumn_: () => {},
    auditLog_: () => {},
    newRequestId_: () => 'req-1',
    registros: [],
    ss: { getSheetByName: (n) => (n === 'MASTER_ARCHIVE_V3' ? archivo : null) }
  };
  ctx.logError_ = function(_ss, sev, _src, fn, _u, msg){ ctx.registros.push({ sev, fn, msg }); };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['archiveOldMovements'], {
    dobles: ['ensureArchiveHistorySheet_', 'loadConfig', 'dedupeMovementIds_',
             'writeMovIdColumn_', 'auditLog_', 'logError_', 'newRequestId_']
  }), ctx);
  return ctx;
}

/* La noche de Jose, reconstruida: una hoja que se creó antes de las columnas de
 * precio (20 de ancho) con filas del modelo de hoy (23), y un corte que deja
 * algo fuera para que el trabajo entre a reescribir en vez de salirse por
 * "noop". Sin filas que mover no habría pasado nada — y por eso el fallo
 * esperó meses agazapado. */
function laNocheDeJose(anchoHoja) {
  const viejas = [];
  for (let i = 0; i < 4; i++) viejas.push(mov(new Date(2024, 0, i + 1), 'VIEJA ' + i, AC_WIDTH));
  const nuevas = [];
  for (let i = 0; i < 12; i++) nuevas.push(mov(new Date(2026, 8, i + 1), 'NUEVA ' + i, AC_WIDTH));
  const archivo   = hojaFalsa('MASTER_ARCHIVE_V3', [CABECERA].concat(viejas, nuevas), anchoHoja);
  const historico = hojaFalsa('ARCHIVE_HISTORY',   [CABECERA], anchoHoja);
  return { archivo, historico, total: viejas.length + nuevas.length };
}

console.log('\n═══ 1. La noche del 26 de septiembre, reconstruida ═══\n');
{
  const { archivo, historico, total } = laNocheDeJose(20);   // 20, como la suya
  check('de partida hay ' + total + ' movimientos en una hoja de 20 columnas',
        archivo.conDatos() === total && archivo.getMaxColumns() === 20);

  const correos = [];
  const ctx = montarTrabajo(archivo, historico, 12, correos);
  let lanzo = null;
  try { ctx.archiveOldMovements(ctx.ss); } catch (e) { lanzo = e.message; }

  const quedan = archivo.conDatos() + historico.conDatos();
  check('NO SE PIERDE NI UN MOVIMIENTO — es el desastre de Jose, medido' +
        (lanzo ? ' (el trabajo lanzó: ' + lanzo + ')' : ''),
        quedan === total, { antes: total, ahora: quedan,
                            archivo: archivo.conDatos(), historico: historico.conDatos() });
  check('...y las viejas acabaron en el histórico, que es para lo que existe ' +
        'este trabajo', historico.conDatos() === 4, historico.conDatos());
  check('...y las de este mes se quedaron en el archivo',
        archivo.conDatos() === 12, archivo.conDatos());
  check('la hoja estrecha se ensanchó a ' + AC_WIDTH + ' en vez de reventar',
        archivo.getMaxColumns() >= AC_WIDTH, archivo.getMaxColumns());
  check('y el trabajo no lanzó nada', lanzo === null, lanzo);
}

console.log('\n═══ 2. Si algo falla a mitad, no se borra nada ═══\n');
{
  /* La segunda lección de esa noche, y la que sigue valiendo aunque el ancho
   * esté bien: el borrado NO puede ir antes que la escritura. Aquí se rompe la
   * escritura a propósito —como haría una cuota agotada— y se mira qué queda. */
  const { archivo, historico, total } = laNocheDeJose(AC_WIDTH);
  const correos = [];
  const ctx = montarTrabajo(archivo, historico, 12, correos);

  const original = archivo.getRange.bind(archivo);
  archivo.getRange = function(f, c, nf, nc) {
    const r = original(f, c, nf, nc);
    const setV = r.setValues;
    r.setValues = function(){ throw new Error('Se superó el límite de la cuota.'); };
    r._realSetValues = setV;
    return r;
  };

  let lanzo = null;
  try { ctx.archiveOldMovements(ctx.ss); } catch (e) { lanzo = e.message; }

  check('la escritura falló, como se pidió', lanzo !== null, lanzo);
  check('Y AUN ASÍ NO SE PERDIÓ NADA: el archivo conserva sus filas porque ' +
        'nunca se borró antes de escribir',
        archivo.conDatos() + historico.conDatos() >= total,
        { archivo: archivo.conDatos(), historico: historico.conDatos(), total });
  check('el fallo salió por correo al admin, no sólo a una pestaña que nadie mira',
        correos.length > 0 && /archive/i.test(correos[0].asunto), correos.map(c => c.asunto));
  check('...y el correo dice dónde está la copia de seguridad',
        correos.length > 0 && /2am|backup/i.test(correos[0].cuerpo));
}

console.log('\n═══ 3. Si las cuentas no cuadran, no se toca nada ═══\n');
{
  const { archivo, historico, total } = laNocheDeJose(AC_WIDTH);
  const correos = [];
  const ctx = montarTrabajo(archivo, historico, 12, correos);

  /* Se rompe el reparto por dentro: `padRow_` devuelve `null` para una fila, y
   * el contador de después ya no la ve. Es un fallo inventado, pero es de la
   * FORMA que importa: uno que hace desaparecer filas sin lanzar. La guarda
   * tiene que negarse a escribir. */
  let llamadas = 0;
  const padOriginal = ctx.padRow_;
  ctx.padRow_ = function(row, w) {
    llamadas++;
    if (llamadas === 3) return new Array(w).fill('');   // una fila que se queda sin datos
    return padOriginal(row, w);
  };

  const antesA = archivo.conDatos(), antesH = historico.conDatos();
  const res = ctx.archiveOldMovements(ctx.ss);

  check('el trabajo se planta y lo dice', res && res.status === 'aborted', res);
  check('NO TOCÓ NINGUNA DE LAS DOS HOJAS',
        archivo.conDatos() === antesA && historico.conDatos() === antesH,
        { archivo: archivo.conDatos(), historico: historico.conDatos(), antesA, antesH });
  check('y avisó por correo', correos.length > 0, correos.length);
  check('...y dejó el motivo en el registro de errores',
        ctx.registros.some(r => /does not add up/i.test(r.msg)), ctx.registros.map(r => r.msg));
  check('el total sigue intacto', archivo.conDatos() + historico.conDatos() === total);
}

console.log('\n═══ 4. El orden de las dos hojas ═══\n');
{
  /* La que GANA filas se escribe primero. Si se escribiera primero la que las
   * PIERDE y fallara la segunda, las filas no estarían en ninguna de las dos.
   * Así, lo peor que puede pasar es un duplicado — que se ve y se arregla. */
  const { archivo, historico, total } = laNocheDeJose(AC_WIDTH);
  const correos = [];
  const ctx = montarTrabajo(archivo, historico, 12, correos);

  const orden = [];
  [['archivo', archivo], ['historico', historico]].forEach(([n, h]) => {
    const original = h.getRange.bind(h);
    h.getRange = function(f, c, nf, nc) {
      const r = original(f, c, nf, nc);
      const setV = r.setValues.bind(r);
      r.setValues = function(d){ if (d.length) orden.push(n); return setV(d); };
      return r;
    };
  });

  ctx.archiveOldMovements(ctx.ss);
  check('se escribe primero el histórico (el que gana filas) y después el ' +
        'archivo (el que las pierde)', orden[0] === 'historico', orden);
  check('y no se perdió nada', archivo.conDatos() + historico.conDatos() === total);
}

console.log('\n═══ 5. Lo que el código NO puede volver a decir ═══\n');
{
  /* SIN LOS COMENTARIOS, y ésta es una trampa en la que caí escribiendo esta
   * misma prueba: el comentario que explica el desastre CITA el código viejo
   * —`archive.getRange(...).clearContent()`— así que buscarlo sobre el texto
   * entero encuentra la explicación y la toma por el fallo. Una prueba sobre
   * texto tiene que mirar código. */
  const trabajo  = A.sinComentarios(A.fnSrc(GS, 'archiveOldMovements'));
  const escribir = A.sinComentarios(A.fnSrc(GS, 'escribirHojaCompleta_'));

  check('el trabajo llama a ensureArchiveWidth_ — la función existía y no se ' +
        'usaba, y ésa fue la causa de raíz',
        /ensureArchiveWidth_\s*\(/.test(trabajo));
  check('el trabajo ya no borra por su cuenta: ni un solo clearContent en él',
        trabajo.indexOf('clearContent') === -1);
  check('...ni pide rangos crudos sobre las dos hojas para escribir',
        trabajo.indexOf('.setValues') === -1);
  check('la escritura pasa por escribirHojaCompleta_, que escribe antes de limpiar',
        /escribirHojaCompleta_\s*\(/.test(trabajo));
  check('...y esa función tiene el setValues ANTES que el clearContent',
        escribir && escribir.indexOf('setValues') !== -1 &&
        escribir.indexOf('setValues') < escribir.indexOf('clearContent'),
        escribir ? { set: escribir.indexOf('setValues'), clear: escribir.indexOf('clearContent') } : null);
  check('...y sólo limpia de la fila siguiente a lo escrito hacia abajo',
        /filas\.length \+ 2/.test(escribir));
  check('el catch avisa además de registrar',
        /avisarFalloDeArchivo_/.test(trabajo));
  check('las dos cuentas usan la MISMA definición de fila',
        (trabajo.match(/contarConDatos_/g) || []).length >= 4,
        (trabajo.match(/contarConDatos_/g) || []).length);
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
process.exit(fail ? 1 : 0);
