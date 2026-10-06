// NO SE PUEDE METER MATERIAL EN UN SITIO QUE NO EXISTE.
//
// Jose, 2026-10-05, con dos capturas: escribió `A1p` en el estante de un ENTRY
// —una ubicación que no existe— y **la app la guardó tal cual**. En el mapa del
// almacén apareció `A1P` como una ubicación más, con material dentro.
//
// Es peor que un nombre mal escrito. Un nombre mal escrito se corrige; una
// ubicación inventada **no está en ninguna estantería**: el material consta en
// un sitio al que nadie puede ir.
//
// ── LO QUE ESTA PRUEBA DEFIENDE, Y LO SEGUNDO IMPORTA MÁS QUE LO PRIMERO ────
//
//  1. METER material en un sitio que no existe se rechaza.
//  2. SACARLO de ahí se permite — **siempre**. Es la mitad que convierte el
//     arreglo en un arreglo y no en una trampa: la app ya creó `A1P` en la
//     copia de Jose y hay material dentro. Si también se rechazara la salida,
//     esas unidades se quedarían ahí **para siempre**, y el arreglo sería peor
//     que el problema.
//  3. Una casilla VACÍA sigue valiendo. Recibir material y no decir todavía en
//     qué estante va es un caso real que lleva funcionando desde siempre;
//     convertirlo en error al arreglar otra cosa sería romper lo que funciona.
//  4. La importación SÍ puede crear ubicaciones — importar es decir "esto es mi
//     almacén tal como está" — pero **no en silencio**: las devuelve contadas.
//
// Uso:  node tools/test-ubicacion-que-no-existe.js

const vm = require('vm');
const A  = require('./andamio.js');
const GS = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

const ESTANTES = ['A1A', 'A1B', 'A1C', 'B2A', 'WINDOW WAREHOUSE'];

function caja() {
  const ctx = {
    console, String, Number, Object, Array, Math, Date, isNaN,
    normalizeString: (s) => String(s || '').toUpperCase().trim().replace(/\s+/g, ' ').replace(/[,.'`]/g, '')
  };
  vm.createContext(ctx);
  vm.runInContext(A.levantar(GS, ['mapaDeUbicaciones_', 'ubicacionDeLlegada_',
                                  'sugerirUbicacion_', 'distanciaEdicion_'], {
    dobles: ['normalizeString']
  }), ctx);
  ctx.MAPA = ctx.mapaDeUbicaciones_({ locations: ESTANTES.map(n => ({ name: n, type: 'RACK' })) });
  return ctx;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. QUÉ LADO SE COMPRUEBA — y es toda la decisión de diseño
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1. Se mira por dónde LLEGA, nunca por dónde se va ═══\n');
{
  const c = caja();
  const f = c.ubicacionDeLlegada_;

  check('ENTRY: el que se comprueba es el DESTINO', f('ENTRY', '', 'A1A') === 'A1A');
  check('ENTRY sin destino: vale el origen, que es donde el motor lo deja',
        f('ENTRY', 'A1A', '') === 'A1A');
  check('RETURN: el destino', f('RETURN', 'SITE', 'A1A') === 'A1A');
  check('TRANSFER: SÓLO el destino', f('TRANSFER', 'A1P', 'A1A') === 'A1A');

  /* LAS DOS QUE DE VERDAD IMPORTAN. Si estas dos devolvieran algo, el arreglo
   * dejaría encerrado el material que el propio fallo metió en `A1P`. */
  check('EXIT: NINGUNO — sacar material de un sitio inventado es LIMPIAR el ' +
        'fallo, y rechazarlo dejaría ese material encerrado para siempre',
        f('EXIT', 'A1P', 'KOTTER RESIDENCE') === '');
  check('WASTE: ninguno, por lo mismo', f('WASTE', 'A1P', '') === '');
  check('TRANSFER desde un sitio inventado se permite — vaciarlo es justo lo ' +
        'que se quiere', f('TRANSFER', 'A1P', 'A1A') === 'A1A');

  check('ADJUST hacia arriba (sólo destino): se comprueba, porque hace APARECER ' +
        'material', f('ADJUST', '', 'A1A') === 'A1A');
  check('ADJUST hacia abajo (sólo origen): no se comprueba',
        f('ADJUST', 'A1P', '') === '');
}

{
  const c = caja();
  /* Una casilla vacía no es un error. El motor lo guarda como UNASSIGNED y
   * lleva funcionando desde siempre: recibir material y no decir todavía dónde
   * va es un martes normal. */
  check('una ubicación VACÍA no obliga a nada — recibir sin colocar es un caso ' +
        'real que ya funcionaba', c.ubicacionDeLlegada_('ENTRY', '', '') === '');
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LA LISTA, Y LO QUE CUENTA COMO "EXISTE"
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2. Qué cuenta como que existe ═══\n');
{
  const c = caja();
  check('se reconoce una ubicación de la lista', !!c.MAPA[c.normalizeString('A1A')]);
  check('...sin importar mayúsculas: `a1a` es A1A', !!c.MAPA[c.normalizeString('a1a')]);
  /* El fallo de Jose fue exactamente éste: tecleó `A1p` en minúscula pensando
   * en A1A/A1B/A1C y le salió una estantería nueva. La minúscula NO era el
   * problema —eso se normaliza— el problema era la P. */
  check('pero `A1P` NO existe, que es el fallo del 05/10',
        !c.MAPA[c.normalizeString('A1p')]);
  check('una con espacios dentro se reconoce igual',
        !!c.MAPA[c.normalizeString('  window   warehouse ')]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LA SUGERENCIA — la diferencia entre un muro y una puerta
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3. "No existe" a secas no sirve de nada ═══\n');
{
  const c = caja();
  /* Un error que dice "A1P no existe" deja a alguien de bodega con el material
   * en la mano mirando una pantalla que no le ofrece nada. "¿Querías decir
   * A1B?" lo resuelve en un segundo — y el caso de Jose es exactamente ése:
   * un carácter de diferencia. */
  const s = c.sugerirUbicacion_('A1P', c.MAPA);
  check('a `A1P` se le propone una de las A1 — un carácter de diferencia',
        ['A1A', 'A1B', 'A1C'].indexOf(s) !== -1, s);
  check('a `a1 b` se le propone A1B', c.sugerirUbicacion_('a1 b', c.MAPA) === 'A1B',
        c.sugerirUbicacion_('a1 b', c.MAPA));
  check('a `WINDOW WAREHOUS` se le propone WINDOW WAREHOUSE',
        c.sugerirUbicacion_('WINDOW WAREHOUS', c.MAPA) === 'WINDOW WAREHOUSE');

  /* Y cuando NO se parece a nada, no se inventa un parecido. Proponer `A1A`
   * para quien escribió `PATIO TRASERO` es ruido que hace dudar de las
   * sugerencias buenas. */
  check('a algo que no se parece a nada NO se le inventa un parecido',
        c.sugerirUbicacion_('PATIO TRASERO', c.MAPA) === '',
        c.sugerirUbicacion_('PATIO TRASERO', c.MAPA));
  check('...ni a una cadena vacía', c.sugerirUbicacion_('', c.MAPA) === '');
}

{
  const c = caja();
  // El tope existe para que la búsqueda no se vuelva cara con cien estanterías.
  check('la distancia se corta en el tope y no sigue contando',
        c.distanciaEdicion_('ABCDEFGH', 'ZZZZZZZZ', 3) === 3);
  check('dos cadenas iguales dan 0', c.distanciaEdicion_('A1A', 'A1A', 3) === 0);
  check('un carácter de diferencia da 1', c.distanciaEdicion_('A1A', 'A1B', 3) === 1);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. LO QUE EL MOTOR DE GUARDADO HACE CON TODO ESTO
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4. El guardado ═══\n');
{
  /* La función entera, contando llaves — no una ventana de N caracteres desde
   * el principio ni un recorte hasta un comentario. Mi primer intento cortaba
   * hasta el texto "── Duplicate guard" y devolvió VACÍO: los cuatro fallos que
   * salieron eran de la prueba, no del producto. Es el mismo error que el
   * andamio avisa de no cometer, y lo cometí igual. */
  const src = A.fnSrc(GS, 'addMovementsBatch_') || '';
  check('la prueba está mirando la función de verdad, no una cadena vacía',
        src.length > 2000, src.length);

  check('el guardado comprueba la ubicación de llegada',
        /ubicacionDeLlegada_\(mt, src, dest\)/.test(src));
  /* Con tubería, como DUPLICATE_MOVEMENT: la pantalla tiene que poder OFRECER
   * crear la ubicación en vez de enseñar un texto rojo sin salida. */
  check('...y cuando no existe, lanza un error que la pantalla puede entender ' +
        '(con tubería, como DUPLICATE_MOVEMENT) en vez de un texto suelto',
        /UNKNOWN_LOCATION\|/.test(src));
  check('...con la sugerencia dentro, para que la pantalla la pueda ofrecer',
        /sugerirUbicacion_\(llega, ubicaciones\)/.test(src));

  /* La lista sale de la MISMA lectura de CONFIG que ya se hacía para los costes.
   * Un segundo loadConfig() por guardado es un viaje más a Google en el camino
   * más usado de la app.
   *
   * SE CUENTAN LAS LLAMADAS, no se mide la distancia entre dos líneas. Mi
   * primera versión exigía que las dos estuvieran a menos de 600 caracteres, y
   * falló al escribir un comentario largo entre ellas — midiendo la letra en
   * vez de la intención, por enésima vez. Lo que de verdad importa es que haya
   * UNA sola lectura, esté donde esté. */
  const lecturas = (src.match(/loadConfig\(\)/g) || []).length;
  check('el guardado lee CONFIG UNA sola vez — un segundo viaje a Google en el ' +
        'camino más usado de la app se nota', lecturas === 1, lecturas);
  check('...y la lista de ubicaciones sale de esa misma lectura',
        /mapaDeUbicaciones_\(cfgAhora\)/.test(src) && /var cfgAhora\s*=\s*loadConfig\(\)/.test(src));
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. LA IMPORTACIÓN: PUEDE CREAR, PERO NO EN SILENCIO
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 5. Importar un almacén que ya existe ═══\n');
{
  /* Importar es decirle a la app "esto es mi almacén tal como está", así que
   * las estanterías que nombra el fichero son las que hay. Rechazarlas sería
   * exigir que alguien teclee cuarenta ubicaciones a mano antes de poder meter
   * sus datos — y entonces no importa nadie.
   *
   * Pero crear quince en silencio deja a alguien con quince sitios que no sabe
   * que tiene, que es la otra mitad del mismo fallo. */
  const imp = (GS.match(/function commitImport\(data, auth\)[\s\S]*?\n}/) || [''])[0];
  check('la importación pide crear las que falten', /crearUbicaciones:\s*true/.test(imp));
  /* Y la lista de creadas sale DEL RESULTADO del guardado, no de otro sitio.
   * Esta línea existe porque la mutación de poner `var creadas = []` NO la
   * cazaba nada: el resto de comprobaciones miraban que el código de escribir
   * y de auditar siguiera ahí, y seguía — ejecutándose sobre una lista vacía.
   * Mirar que el texto esté no es mirar que haga algo. */
  check('...y lo que escribe sale del resultado del guardado, no de una lista ' +
        'que alguien pueda dejar vacía sin que nada se queje',
        /var creadas\s*=\s*res\.ubicacionesCreadas/.test(imp));
  check('...LAS ESCRIBE EN LA LISTA, no sólo en los movimientos — si no, al día ' +
        'siguiente volverían a no existir', /writeConfigColumns_\(cfgSheet, 3/.test(imp));
  check('...lo deja apuntado en el registro', /LOCATIONS_CREATED/.test(imp));
  check('...y se lo devuelve a la pantalla para que lo cuente',
        /newLocations:\s*creadas/.test(imp));

  const batch = GS;
  check('y crear sólo pasa cuando se pide — por defecto se rechaza',
        /var crearUbic\s*=\s*!!\(opciones && opciones\.crearUbicaciones\)/.test(batch));
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LA PANTALLA
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 6. Lo que ve quien está en la bodega ═══\n');
{
  const H = A.fuente('html');
  const fn = (H.match(/function _ubicacionDesconocida[\s\S]*?\n}/) || [''])[0];

  check('la pantalla reconoce el rechazo', /UNKNOWN_LOCATION\|/.test(fn));
  check('...y ofrece la parecida primero, que es el caso de verdad',
        /Did you mean/.test(fn));
  check('...o crearla, si la persona tiene permiso de catálogo',
        /canManageCatalog/.test(fn) && /_cfgAddValue\('locations'/.test(fn));
  /* Y si no tiene permiso, se le dice A QUIÉN pedírselo. Dejar a alguien
   * delante de una puerta cerrada sin decirle quién tiene la llave es la forma
   * de que abandone el movimiento — y entonces el material se mueve sin que
   * quede escrito, que es peor que una ubicación mal puesta. */
  check('...y si no lo tiene, se le dice a quién pedírselo en vez de dejarle ' +
        'delante de una puerta cerrada', /ask an admin to add it/i.test(fn));
  check('se reintenta el guardado después de crearla, para que no haya que ' +
        'volver a teclear el movimiento entero', /reintentar\(\)/.test(fn));

  /* LAS DOS LISTAS DEL DESPLEGABLE. La de origen incluye lo que aparece en los
   * movimientos —hay que poder sacar material de donde esté, aunque ese sitio
   * nunca debiera haber existido—. La de destino, no: ofrecer `A1P` para meter
   * material sería ofrecer el fallo otra vez, y encima el servidor lo
   * rechazaría. Una lista que propone lo que luego se rechaza es peor que una
   * lista corta. */
  const lista = (H.match(/var deMovimientos =[\s\S]*?destinoSet\.forEach[^\n]*\n/) || [''])[0];
  check('el desplegable de ORIGEN sí ofrece lo que aparece en los movimientos',
        /origenSet\s*=\s*Array\.from\(new Set\(rackNames\.concat\(deMovimientos\)\)\)/.test(lista));
  check('...y el de DESTINO sólo lo que existe de verdad — ofrecer un sitio que ' +
        'el servidor va a rechazar es peor que no ofrecerlo',
        /destinoSet\s*=\s*Array\.from\(new Set\(rackNames\)\)/.test(lista) &&
        !/destinoSet[^\n]*deMovimientos/.test(lista));
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. LA CATEGORÍA — el mismo agujero, en el campo que MÁS duele
   ═══════════════════════════════════════════════════════════════════════════

   La categoría no es una etiqueta: es **la mitad del nombre interno del
   material** (getMaterialId = categoría + nombre). Un `WINDOWS` donde debía
   decir `WINDOW` no es el mismo material mal clasificado: es OTRO material, con
   sus propias existencias, y nadie los suma nunca.

   Y al mirarlo resultó MÁS PEQUEÑO de lo que decía la nota del backlog, que
   metía en el mismo saco a proyecto, proveedor y categoría. No son el mismo
   caso, y conviene que esté escrito para que nadie "arregle" lo que ya está
   decidido:

     · Proyecto y proveedor son campos libres A PROPÓSITO —una obra nueva
       aparece cada semana— y ya tienen su mecanismo: la baraja de valores sin
       registrar con su "+ Add it". Cerrarlos sería pelearse con el trabajo.
     · La categoría NO es un campo libre: en la pantalla es un desplegable
       cerrado. Lo que quedaba abierto es lo que NO pasa por la pantalla.
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 7. La categoría ═══\n');
{
  const src = A.fnSrc(GS, 'addMovementsBatch_') || '';
  check('la prueba mira la función de verdad', src.length > 2000);

  check('se comprueba la categoría al ENTRAR material',
        /if \(mt === 'ENTRY' && cat\)/.test(src));
  /* Y SÓLO al entrar, por lo mismo que las ubicaciones: un EXIT o un ajuste
   * trabajan sobre material que YA está dentro, a veces con una categoría sin
   * registrar precisamente porque esto no existía. Comprobarlos también dejaría
   * ese material encerrado — el error que no cometimos con `A1P`. */
  check('...y SÓLO al entrar — comprobarlo al salir dejaría encerrado el ' +
        'material que ya está dentro con una categoría sin registrar',
        !/if \(mt === 'EXIT' && cat\)/.test(src) &&
        !/\['ENTRY', ?'EXIT'\].indexOf\(mt\)/.test(src));
  check('...con un error que la pantalla puede entender',
        /UNKNOWN_CATEGORY\|/.test(src));
  check('...y la categoría parecida dentro, para poder decir cuál era',
        /sugerirUbicacion_\(cat, categorias\)/.test(src));
  check('la lista de categorías sale de la misma lectura de CONFIG',
        /\(cfgAhora\.categories \|\| \[\]\)/.test(src));
}

{
  const imp = A.fnSrc(GS, 'commitImport') || '';
  check('la importación puede traer categorías nuevas', /categoriasCreadas/.test(imp));
  /* Y aquí importa MÁS que en las ubicaciones, por algo que no es obvio: la
   * categoría es un desplegable cerrado, así que un material cuya categoría no
   * esté en la lista NO SE PUEDE NI SELECCIONAR PARA SACARLO. Importado y, acto
   * seguido, intocable. */
  check('...y SE ESCRIBEN en el catálogo — si no, el material importado no se ' +
        'puede ni seleccionar para sacarlo, porque la categoría es un ' +
        'desplegable cerrado', /writeConfigColumn_\(cfgSheet2, 1/.test(imp));
  check('...y queda apuntado', /CATEGORIES_CREATED/.test(imp));
}

{
  const H = A.fuente('html');
  /* La baraja de valores sin registrar sólo miraba proyectos y proveedores. Una
   * categoría metida por una importación era invisible para el admin Y hacía
   * el material intocable. */
  check('la baraja de valores sin registrar también mira las categorías',
        /\['categories', m\.category\]/.test(H));
  check('...y sabe qué categorías están registradas',
        /type === 'categories'\) \? config\.categories/.test(H));

  const fn = (H.match(/function _categoriaDesconocida[\s\S]*?\n}/) || [''])[0];
  check('la pantalla reconoce el rechazo de categoría', /UNKNOWN_CATEGORY\|/.test(fn));
  /* Y NO ofrece crearla. A la categoría no se llega tecleando —es un
   * desplegable— así que un rechazo significa que la pantalla y el catálogo no
   * dicen lo mismo. Lo que hace falta es recargar, no empujar más datos:
   * ofrecer "créala y sigue" es cómo se acaba con dos categorías iguales. */
  check('...y NO ofrece crearla — a una categoría no se llega tecleando, así que ' +
        'un rechazo significa que la pantalla está desactualizada, no que falte ' +
        'un dato', !/_cfgAddValue\('categories'/.test(fn) && /Reload the page/.test(fn));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
