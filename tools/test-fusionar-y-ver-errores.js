// FUSIONAR NOMBRES NO PUEDE NEGARSE EN EL CASO MÁS COMÚN, Y EL REGISTRO DE
// ERRORES TIENE QUE SER UNA VENTANA, NO UNA FOTO.
//
// Dos cosas de la misma sesión de Jose, 22/10, y van juntas porque la segunda
// es la herramienta con la que se diagnostica la primera.
//
// ── 1. LA FUSIÓN ───────────────────────────────────────────────────────────
//
// Jose, con un vídeo: *"error al intentar hacer merge de proyectos y suppliers:
// Pick at least one other name to merge in"*. En su pantalla había **20 grupos
// de proyectos duplicados y 8 de proveedores**, y **fallaban los 28**:
// «ASPEN HOLLOW LOT 14» catorce veces, «BLUE MESA DISTRIBUTION» tres…
//
// La causa eran dos líneas que se contradecían sin saberlo:
//
//   · el navegador (`_cfgSimilar`) proponía como duplicados dos nombres que
//     tras normalizar —MAYÚSCULAS, sin puntuación— son el mismo
//   · el servidor quitaba de `from` todo lo que en mayúsculas coincidía con
//     `into`, se quedaba sin nada y se negaba
//
// Y ésas son las dos formas más comunes que tiene un duplicado. **La
// herramienta para unir nombres mal escritos se negaba justo en el error de
// escritura más frecuente que hay.**
//
// Son DOS arreglos, no uno. El segundo es el que importa: ¿quién metió catorce
// filas iguales? Nada en el camino de escritura de CONFIG lo comprobaba. El
// único sitio que sí era el botón «añadir» de Ajustes — la puerta de delante
// cerrada con llave y las tres de atrás abiertas.
//
// ── 2. EL REGISTRO DE ERRORES ──────────────────────────────────────────────
//
// Jose: *"esos errores no se guardan en Error Log, no sé por qué"*. Sí se
// guardaban. Lo que fallaba era la pantalla: `_errorLogData` se traía UNA vez
// al abrir Ajustes y entrar en la pestaña no volvía a preguntar. Su secuencia
// exacta: abre Ajustes → fusiona → falla → va a Error Log sin cerrar Ajustes →
// ve la lista de antes del error.
//
// Y su condición, que mejoró mi plan: *"deben actualizarse de inmediato sin
// repintar toda la pantalla, sólo la fila que falta"*.
//
// Uso:  NODE_PATH="$(npm root -g)" node tools/test-fusionar-y-ver-errores.js

const path = require('path');
const vm   = require('vm');
const A    = require(path.join(__dirname, 'andamio.js'));

const GS   = A.fuente('gs');
const HTML = A.fuente('html');
const gs   = A.sinComentarios(GS);
const html = A.sinComentarios(HTML);

let ok = 0; const fails = [];
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + (extra === undefined ? '' : ' → ' + JSON.stringify(extra)));
         console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 1. LA FUSIÓN ACEPTA UN CAMBIO DE GRAFÍA — ejecutada.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 1. Catorce nombres iguales se pueden unir ═══\n');

const srcMerge = A.sinComentarios(A.fnSrc(GS, 'mergeConfigValues') || '');
check('`mergeConfigValues` existe', !!srcMerge);

/* EL CORAZÓN DEL ARREGLO. Si alguien vuelve a filtrar `from` por mayúsculas,
 * los 28 grupos de Jose vuelven a fallar los 28. */
check('ya NO se quitan de `from` los nombres que coinciden en mayúsculas — era ' +
      'lo que dejaba la lista vacía y hacía fallar las 28 fusiones de Jose',
  !/toUpperCase\(\)\s*!==\s*into\.toUpperCase\(\)/.test(srcMerge), srcMerge);
check('...y la única negativa que queda es la que sí tiene sentido: que no ' +
      'venga ningún otro nombre',
  /if \(!from\.length\) throw/.test(srcMerge));

const srcLocked = A.sinComentarios(A.fnSrc(GS, 'mergeConfigValuesLocked_') || '');
check('`into` entra en el conjunto de grafías a reescribir — si no, las filas ' +
      'escritas «acme» se quedarían así mientras la lista pasa a decir «ACME», ' +
      'y el historial y el catálogo dirían cosas distintas',
  /wanted\[into\.toUpperCase\(\)\] = true/.test(srcLocked));
check('...pero una fila ya escrita EXACTAMENTE así no se reescribe: contarla ' +
      'inflaría el número que se le enseña a la persona',
  /cur === storedInto\s*\)\s*\?\s*null/.test(srcLocked));
check('de CONFIG se quitan TODAS las grafías, incluida la de `into`, y vuelve ' +
      'UNA sola — es lo que deja catorce filas idénticas en una',
  /keep\.push\(into\)/.test(srcLocked) && !/sawInto/.test(srcLocked));
check('...y la cuenta que se devuelve descuenta la que vuelve, o unir dos ' +
      'nombres diría que quitó dos',
  /removed - 1/.test(srcLocked));

/* ── EJECUTADO: el filtro del navegador contra el del servidor ───────────── */
const ctxSim = A.montar({ console: console }, HTML, ['_cfgSimilar'], {});
check('se pudo montar el detector de parecidos', !!ctxSim._cfgSimilar);
check('el detector SIGUE agrupando dos grafías del mismo nombre — es correcto ' +
      'que lo haga; lo que estaba mal era que el servidor se negara después',
  ctxSim._cfgSimilar('Acme Glass', 'ACME GLASS') === true);
check('...y dos copias idénticas también',
  ctxSim._cfgSimilar('ASPEN HOLLOW LOT 14', 'ASPEN HOLLOW LOT 14') === true);
check('...y NO agrupa dos obras de verdad distintas, que es el límite que hace ' +
      'útil al detector',
  ctxSim._cfgSimilar('LGI DE 042', 'LGI DE 043') === false);

/* ────────────────────────────────────────────────────────────────────────────
 * 2. LA LISTA NO PUEDE TENER DOS VECES LO MISMO — ejecutado.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 2. La puerta por la que entraban los duplicados ═══\n');

let escritor = null, escrito = null, avisos = [];
try {
  const hoja = {
    _filas: [],
    getMaxRows: () => 500,
    insertRowsAfter: () => {},
    getLastRow: () => 1,
    getParent: () => ({}),
    getRange: function (f, c, nf, nc) {
      return {
        getValues: () => Array.from({ length: nf }, () => new Array(nc).fill('')),
        setValues: function (v) { hoja._filas = v.map(x => x.slice()); return this; },
        clearContent: function () { return this; }
      };
    }
  };
  const ctx = {
    console: console,
    textCell_: v => v,
    logError_: (ss, sev, src, fn, who, msg) => avisos.push(msg),
    newRequestId_: () => 'req',
    Logger: { log: () => {} }
  };
  escritor = A.montar(ctx, GS, ['writeConfigColumns_'],
    { dobles: ['textCell_', 'logError_', 'newRequestId_'] });
  // Catorce copias del mismo nombre, como en la hoja de Jose, más dos grafías.
  const lista = [];
  for (let i = 0; i < 14; i++) lista.push('ASPEN HOLLOW LOT 14');
  lista.push('Acme Glass', 'ACME GLASS', 'BIRCH POINT');
  escritor.writeConfigColumns_(hoja, 0, [lista]);
  escrito = hoja._filas.map(f => f[0]);
} catch (e) {
  check('se pudo montar y correr el escritor de CONFIG', false, e.message);
}

if (escrito) {
  check('se pudo montar y correr el escritor de CONFIG', true);
  check('catorce copias del mismo nombre se escriben UNA vez — era lo que Jose ' +
        'tenía en su hoja y nada lo impedía',
    escrito.filter(v => v === 'ASPEN HOLLOW LOT 14').length === 1, escrito);
  check('...y dos grafías del mismo nombre también: «Acme Glass» y «ACME GLASS» ' +
        'son el mismo proveedor para cualquiera que mire la pantalla',
    escrito.filter(v => String(v).toUpperCase() === 'ACME GLASS').length === 1, escrito);
  check('...conservando la PRIMERA grafía: la segunda sería renombrar algo que ' +
        'nadie pidió renombrar',
    escrito.indexOf('Acme Glass') !== -1 && escrito.indexOf('ACME GLASS') === -1, escrito);
  check('lo que no se repite no se toca',
    escrito.indexOf('BIRCH POINT') !== -1, escrito);
  check('quedan exactamente tres nombres de los diecisiete que entraron',
    escrito.length === 3, escrito);
  check('y se DICE lo que se quitó — borrar filas en silencio es lo que ' +
        'convierte un arreglo en un misterio tres meses después',
    avisos.length === 1 && /duplicate name/i.test(avisos[0]), avisos);
}

/* LA DECISIÓN DE NO LIMPIAR EN LA LECTURA, QUE ES LA MITAD DIFÍCIL. */
const srcLoad = A.sinComentarios(A.fnSrc(GS, 'loadConfig') || '');
check('`loadConfig` NO esconde los duplicados al leer — `updateConfig` escribe ' +
      'celda a celda, así que la hoja no se reescribe con el uso normal: ' +
      'esconderlos dejaría las catorce filas de Jose ahí para siempre, sin que ' +
      'él pudiera ni verlas ni arreglarlas',
  !/_sinRepetir_/.test(srcLoad) && !/Set\(c\.projects/.test(srcLoad));

/* ────────────────────────────────────────────────────────────────────────────
 * 3. UN GRUPO DE NOMBRES IDÉNTICOS NO PIDE ELEGIR.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 3. Catorce opciones que se leen igual no son una elección ═══\n');

const simGrp = A.sinComentarios(A.fnSrc(HTML, '_renderSimilarGroups') || '');
check('la pantalla distingue un grupo que es el MISMO texto repetido',
  /var mismo = g\.every/.test(simGrp));
check('...y en ese caso dice cuántas veces está, en vez de pintar catorce ' +
      'botones que se leen igual',
  /listed ' \+ g\.length \+ ' times/.test(simGrp));
check('...y el botón dice lo que hace: «Keep one», no «Merge into selected»',
  /Keep one/.test(simGrp));

const wireSim = A.sinComentarios(A.fnSrc(HTML, '_wireSimilarGroups') || '');
check('y al pulsarlo se manda el resto del grupo quitando UNA aparición, no ' +
      'todas las que se escriban igual — `filter(v => v !== into)` dejaba ' +
      '`from` vacío con catorce copias, que es el fallo original otra vez',
  /yaQuitado/.test(wireSim), wireSim.slice(0, 400));

const manual = A.sinComentarios(A.fnSrc(HTML, '_wireManualMerge') || '');
check('lo mismo en la selección a mano', /quitada/.test(manual));

/* ────────────────────────────────────────────────────────────────────────────
 * 4. EL REGISTRO DE ERRORES ES UNA VENTANA.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n═══ 4. El Error Log se entera de lo que acaba de pasar ═══\n');

const renderErr = A.sinComentarios(A.fnSrc(HTML, '_renderErrorLogTab') || '');
check('`_renderErrorLogTab` existe', !!renderErr);
check('entrar en la pestaña SIEMPRE vuelve a preguntar — era el fallo entero: ' +
      'se traía una vez al abrir Ajustes y nunca más',
  /_refrescarErrorLog\(/.test(renderErr));
check('...y mientras llega enseña lo que ya tiene, para no parpadear un ' +
      '«Loading…» cada vez que entras',
  /_errorLogData && _errorLogData\.length\) _drawErrorLog/.test(renderErr));

/* EL `if` QUE NUNCA PEDÍA NADA. `var _errorLogData = []` nace lista vacía, que
 * en JavaScript es VERDADERA, así que `if (_errorLogData)` daba siempre cierto
 * y la rama que pedía la lista era inalcanzable. */
check('ya no se decide con una lista vacía, que es VERDADERA en JavaScript — ' +
      'ese `if` nunca llegó a pedir nada por su cuenta',
  !/if \(_errorLogData\) \{ _drawErrorLog\(\); return; \}/.test(html));

const refrescar = A.sinComentarios(A.fnSrc(HTML, '_refrescarErrorLog') || '');
check('las filas nuevas se meten ARRIBA en vez de repintar la tabla — ' +
      'condición de Jose: «sólo la fila que falta»',
  /_errorLogMeterArriba\(/.test(refrescar));
check('...y si la lista cambió por abajo (se limpió, se purgó) sí se redibuja: ' +
      'eso no es «una fila más»',
  /!nuevas\.length.*_drawErrorLog|!habia \|\| !nuevas\.length/.test(refrescar));

const nuevas = A.sinComentarios(A.fnSrc(HTML, '_errorLogFilasNuevas') || '');
const clave  = A.sinComentarios(A.fnSrc(HTML, '_errLogClave') || '');
check('qué fila es nueva se sabe por su `requestId`, que es único — comparar ' +
      'por fecha fallaría con dos errores en el mismo segundo, que es justo lo ' +
      'que pasa en una ráfaga',
  /requestId/.test(clave) && /_errLogClave/.test(nuevas));

const meter = A.sinComentarios(A.fnSrc(HTML, '_errorLogMeterArriba') || '');
check('la fila nueva respeta el filtro escrito: meterla saltándoselo pondría ' +
      'en la tabla algo que la búsqueda dice que no está',
  /_errLogFiltroActual\(\)/.test(meter) && /indexOf\(q\) === -1\) continue/.test(meter));
check('...y quita la fila de «No errors logged», que no es una fila',
  /colspan/.test(meter));
check('...y entra animada, como las de la papelera: su trabajo es no pasar ' +
      'desapercibida en una lista de trescientas',
  /row-enter/.test(meter) && /tr\.row-enter\{animation/.test(html));
check('...y quien pidió menos movimiento no la recibe',
  /prefers-reduced-motion:reduce\)\{ tr\.row-enter/.test(html));

check('las celdas de una fila se dibujan en UN solo sitio, no en dos caminos ' +
      'pareciéndose',
  /_errLogFilaHtml/.test(A.sinComentarios(A.fnSrc(HTML, '_drawErrorLog') || '')) &&
  /_errLogFilaHtml/.test(meter));

check('hay un botón de recargar a la vista — ésta es la única pantalla en la ' +
      'que alguien está ESPERANDO a que aparezca una fila',
  /btnErrLogRefrescar/.test(html));
check('y un redibujado conserva lo escrito en el buscador, o la tabla diría ' +
      'una cosa y la caja de búsqueda otra',
  /_drawErrorLog\(_errLogFiltroActual\(\)\)/.test(html));

if (fails.length) {
  console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
