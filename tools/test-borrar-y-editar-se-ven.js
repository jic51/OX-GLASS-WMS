// BORRAR Y EDITAR TAMBIÉN SE VEN EN EL MISMO SEGUNDO.
//
// Jose, 2026-10-08: *"lo que quiero es que la app muestre lo que guardó,
// modificó, cambió, borró, etc. exactamente en el mismo segundo que termina de
// hablar con el servidor. Y eso va para TODO lo que hace la app."*
//
// La v12.49 lo hizo para GUARDAR. Esto es lo mismo para las otras dos
// operaciones que mueven existencias.
//
// ── BORRAR: LA OBJECIÓN QUE VALÍA, Y HASTA DÓNDE VALÍA ────────────────────
//
// Esto llevaba anotado desde la v12.24 sin hacer, y con una razón de verdad:
// calcular las cifras de después EN CADA BORRADO devolvería la ráfaga lenta
// que arregló la v11.96 — trece borrados, trece reconstrucciones del almacén.
//
// Pero esa objeción sólo valía para los borrados APLAZADOS. El último de la
// tanda refresca de verdad, y en ese momento las hojas calculadas ACABAN de
// reescribirse: leerlas son tres viajes cortos, una vez por tanda. Ahí sí se
// puede — y ahí es exactamente cuando alguien está mirando.
//
// Así que la regla es: si refrescó, van las cifras; si lo aplazó, va `null`.
// Mandar las de antes diciendo que son las de después sería peor que no
// mandar nada, y es lo que mide la sección 2.
//
// ── EDITAR: SE QUITA UNA SEGUNDA ARITMÉTICA ───────────────────────────────
//
// El navegador rehacía la normalización del servidor para pintar la fila sin
// esperar, y su propio comentario avisaba: *"si las dos mitades no coinciden,
// la recarga corrige algo que ya estaba bien y se ve un parpadeo"*. Dos cuentas
// que tienen que coincidir sin que nada lo obligue.
//
// Ahora el servidor manda LA FILA COMO QUEDÓ EN LA HOJA. No hay segunda cuenta
// que pueda discrepar.
//
// Uso:  node tools/test-borrar-y-editar-se-ven.js

const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const A    = require('./andamio.js');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

console.log('\n═══ 1. El ayudante compartido usa el camino que ya existe ═══\n');
{
  const src = A.fnSrc(GS, 'stockAfterParaIds_');
  check('stockAfterParaIds_ existe', src && src.length > 300, src && src.length);
  /* LO QUE MÁS IMPORTA DE TODA ESTA PRUEBA. Si aquí se escribiera una segunda
   * aritmética, el número del Dashboard dependería de si llegaste por un
   * borrado o por una recarga. Tiene que ser EL MISMO camino que getInitialData. */
  check('lee por buildStockFromDerivedSheets_ — el mismo camino que dibuja el Dashboard al ' +
        'entrar, no una cuenta nueva que pueda discrepar',
    /buildStockFromDerivedSheets_\(ss\)/.test(src));
  check('...y aplica los apartados con la MISMA función que el resto',
    /applyReservationsAndFinalize_\(stock, getActiveLocksMap_\(ss\)\)/.test(src));
  check('devuelve SÓLO los materiales que se piden — mandar el almacén entero por borrar una ' +
        'fila sería pagar con la red lo que se ahorró en la hoja',
    /for \(var k in quiero\)/.test(src));
  /* El caso que parece un detalle y es el importante: borrar la ÚNICA entrada
   * de algo lo deja sin filas en LIVE_STOCK. Omitirlo dejaría en la pantalla
   * la cifra de antes — el número falso que esto venía a evitar. */
  check('un material que se quedó SIN existencias se manda en CERO, no se omite — omitirlo ' +
        'dejaría la cifra vieja en pantalla', /warehouseQty: 0/.test(src));
  check('...y todo en try: un borrado que YA está hecho no se tumba por preparar lo que se ' +
        'va a pintar', /catch \(e\)/.test(src) && /return \{\};/.test(src));
}

console.log('\n═══ 2. Si no refrescó, no se inventa una cifra ═══\n');
{
  const ref = A.fnSrc(GS, 'refreshOrDefer_');
  check('refreshOrDefer_ dice si refrescó de verdad — antes no devolvía nada y nadie podía ' +
        'saberlo', /return false;/.test(ref) && /return true;/.test(ref));

  const borrar = GS.slice(GS.indexOf("} else if (op === 'deleteRow')"),
                          GS.indexOf("} else if (op === 'restoreMovement')"));
  check('el borrado guarda si refrescó', /var refrescado = refreshOrDefer_\(ss, data\)/.test(borrar));
  check('...y SÓLO manda cifras si refrescó; aplazado manda null, que el navegador entiende ' +
        'como "todavía no"',
    /stockAfter: refrescado \? stockAfterParaIds_/.test(borrar) && /: null/.test(borrar));
  /* El id se compone de categoría y nombre, y los dos viven en la fila. Leerlos
   * después de borrarla daría vacío, y el navegador recibiría cifras de un
   * material que no existe. */
  check('...y el material se anota ANTES de borrar la fila, porque después ya no se puede leer',
    borrar.indexOf('var matBorrado') < borrar.indexOf('found.sheet.deleteRow'));
}

console.log('\n═══ 3. Editar devuelve la fila COMO QUEDÓ, no lo que se pidió ═══\n');
{
  const src = A.fnSrc(GS, 'modifyMovementLocked_');
  check('devuelve `movimiento`', /movimiento: filaEditada/.test(src));
  check('...construido con el MISMO parseArchiveRow que todo lo demás',
    /parseArchiveRow\(padRow_\(rowVals, AC_WIDTH\), rowIdx\)/.test(src));
  check('...con los costes tapados, como en las otras tres puertas por donde salen estos ' +
        'objetos', /canSeeCosts_\(auth\)/.test(src) && /filaEditada\.unitCost = null/.test(src));
  check('...y en try: una edición YA escrita no se tumba por preparar el pintado',
    /catch \(eFila\)/.test(src));

  /* EL CASO QUE SE OLVIDA. Cambiar la categoría o el nombre MUEVE existencias
   * de un material a otro: el de antes se queda con menos y el de después con
   * más. Mandar sólo uno deja al otro con la cifra vieja. */
  check('manda LOS DOS materiales, el de antes y el de después — editar la categoría o el ' +
        'nombre mueve existencias de uno a otro',
    /stockAfterParaIds_\(ss, \[matAntes, matDespues\]\)/.test(src));
  check('...y el de ANTES se anota al leer la fila, porque `rowVals` se muta después',
    src.indexOf('var matAntes') < src.indexOf('range.setValues'));
  check('...y sólo si refrescó', /stockAfter: refrescado \?/.test(src));
}

console.log('\n═══ 4. Y el navegador deja de hacer la cuenta por su lado ═══\n');
{
  check('la SEGUNDA NORMALIZACIÓN del navegador ya no está — rehacía mayúsculas y espacios ' +
        'para adivinar cómo quedaría la fila, y su propio comentario avisaba del parpadeo',
    !/var limpio = function\(v\)\{ return String\(v \|\| ''\)\.toUpperCase\(\)/.test(HTML));
  check('...la fila se sustituye por la que manda el servidor',
    /movements\[i\] = res\.movimiento;/.test(HTML));
  check('...buscándola por su id propio cuando lo tiene, y por posición sólo en las filas ' +
        'viejas que aún no lo tienen',
    /res\.movimiento\.movId && m\.movId/.test(HTML));
  check('...y si el servidor NO la mandó, no se inventa nada y manda la recarga',
    /res && res\.movimiento && typeof movements/.test(HTML));

  check('el BORRADO aplica las cifras que llegan — la fila se iba al pulsar y el total se ' +
        'quedaba igual, que parece que el borrado no contó',
    /_delGen\+\+;[\s\S]{0,700}_aplicarStockDelServidor\(res\)/.test(HTML));
  check('...y su manejador recibe la respuesta, que antes ni la miraba',
    /\.withSuccessHandler\(function\(res\)\{\s*\n\s*_delGen\+\+/.test(HTML));

  /* Cinco sitios: entrada, salida, movimiento suelto, borrado y edición.
   *
   * Las LLAMADAS, no la definición. `function _aplicarStockDelServidor(res){`
   * también contiene ese texto y contaba como una sexta. Es la SEGUNDA VEZ que
   * caigo en esto en dos versiones —la misma trampa en test-se-ve-al-guardar—,
   * y lo dejo escrito porque medir la letra en vez de la intención es
   * exactamente el fallo que este archivo lleva meses cazando en el producto. */
  const veces = (HTML.match(/^\s*_aplicarStockDelServidor\(res\);/gm) || []).length;
  check('las CINCO operaciones que mueven existencias aplican las cifras del servidor — ' +
        'guardar (×3), borrar y editar', veces === 5, veces);
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
