// LOS NOMBRES FICTICIOS DE LA COPIA DE DEMOSTRACIÓN.
//
// tools/demo-nombres.gs reescribe texto en las once pestañas de una copia para
// que las capturas de acopio.net no enseñen los clientes, los proveedores ni los
// empleados de OX Glass. Es una herramienta, no parte del producto — pero toca
// MIL FILAS de una sentada y lo que escribe no se puede deshacer desde ahí, así
// que su lógica se mide igual que la del producto.
//
// LO QUE PUEDE SALIR MAL, que es lo que se comprueba:
//
//   1. QUE NO SEA CONSISTENTE. Si "KOTTER RESIDENCE" se cambia por una obra en
//      el archivo y por otra en LIVE_STOCK, el stock deja de cuadrar con su
//      historial y la captura enseña un almacén roto. Es el fallo más caro
//      porque se ve bien.
//
//   2. QUE DEJE MEDIO NOMBRE REAL. Si el diccionario tiene "KOTTER" y "KOTTER
//      RESIDENCE" y se aplica el corto primero, queda "MAPLE STREET RESIDENCE":
//      medio inventado y medio real. Peor que no tocar nada, porque parece
//      limpio y no lo está — y eso es exactamente lo que se quiere evitar.
//
//   3. QUE UN CORREO DEJE DE SER UN CORREO. La columna User se lee como correo
//      en la app; un nombre suelto ahí se ve raro justo en la captura.
//
//   4. QUE UNA CLAVE CORTA ARRASE. Una clave de tres letras dentro de un texto
//      libre pega en mitad de otras palabras.
//
// Uso:  node tools/test-demo-nombres.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, 'demo-nombres.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* Se corre el archivo ENTERO en una caja, con lo de Apps Script fingido. Así
 * las listas de nombres y las constantes son las de verdad: una copia aquí
 * envejecería el día que alguien añada una obra a la lista. */
const ctx = vm.createContext({
  console, JSON, Math, Date, String, Number, Array, Object, RegExp,
  Logger: { log(){} },
  SpreadsheetApp: { getActiveSpreadsheet: () => null }
});
vm.runInContext(SRC, ctx);

/* LAS CLAVES SE SACAN DEL ARCHIVO, no se copian a mano. La primera versión de
 * esta caja tenía { obra, prov, pers } escritos aquí; al añadir la clase `gc` a
 * la herramienta, el contador que faltaba hizo que el nombre saliera
 * `undefined` — y el fallo parecía de la herramienta cuando era del andamio. */
const CLASES = (() => {
  const m = /var usados = \{([^}]*)\}/.exec(SRC);
  return m[1].split(',').map(x => x.split(':')[0].trim()).filter(Boolean);
})();
const nuevoEstado = () => {
  const usados = {}, vistos = { correo: {} };
  CLASES.forEach(c => { usados[c] = 0; vistos[c] = {}; });
  return { dic: {}, usados, vistos };
};
function registrar(st, valor, clase) {
  return vm.runInContext('_registrar_', ctx)(valor, clase, st.dic, st.usados, st.vistos);
}
const sustituir = (v, dic) => vm.runInContext('_sustituir_', ctx)(v, dic);
const claseDe   = (t) => vm.runInContext('_claseDe_', ctx)(t);

console.log('\n═══ 1. El mismo nombre recibe SIEMPRE el mismo reemplazo ═══\n');
{
  const st = nuevoEstado();
  // Como llegaría de verdad: la misma obra, en pestañas distintas, escrita con
  // mayúsculas distintas y con espacios de más.
  ['KOTTER RESIDENCE', 'kotter residence', '  KOTTER RESIDENCE  ',
   'LIBERTY WELLS TOWNHOMES', 'KOTTER RESIDENCE'].forEach(v => registrar(st, v, 'obra'));

  const claves = Object.keys(st.dic);
  check('dos obras distintas dan dos entradas, no cinco', claves.length === 2, claves);
  check('la misma obra en tres formatos recibe UN solo reemplazo',
    sustituir('KOTTER RESIDENCE', st.dic) === sustituir('kotter residence', st.dic) &&
    sustituir('KOTTER RESIDENCE', st.dic) === sustituir('  KOTTER RESIDENCE  ', st.dic),
    [sustituir('KOTTER RESIDENCE', st.dic), sustituir('kotter residence', st.dic)]);
  check('...y dos obras distintas NO acaban con el mismo nombre — si colisionaran, ' +
        'dos obras se fundirían en una en las capturas',
    sustituir('KOTTER RESIDENCE', st.dic) !== sustituir('LIBERTY WELLS TOWNHOMES', st.dic));
  check('el reemplazo no se parece al original',
    !/KOTTER/i.test(sustituir('KOTTER RESIDENCE', st.dic)),
    sustituir('KOTTER RESIDENCE', st.dic));
}

console.log('\n═══ 2. Nunca medio nombre real ═══\n');
{
  const st = nuevoEstado();
  // El caso que lo rompe: una clave es prefijo de la otra.
  registrar(st, 'KOTTER', 'obra');
  registrar(st, 'KOTTER RESIDENCE', 'obra');

  const libre = sustituir('ENTREGADO A KOTTER RESIDENCE EL MARTES', st.dic);
  check('en texto libre gana la clave MÁS LARGA' +
        (/RESIDENCE/i.test(libre) ? ' — quedó: ' + libre : ''),
    !/KOTTER/i.test(libre) && !/RESIDENCE/i.test(libre), libre);
  check('...y el resto de la frase sigue ahí',
    /ENTREGADO A/.test(libre) && /EL MARTES/.test(libre), libre);
}

console.log('\n═══ 3. Un correo sigue siendo un correo ═══\n');
{
  const st = nuevoEstado();
  registrar(st, 'joseisrael5101@gmail.com', 'correo');
  registrar(st, 'josephl@ox-glass.com', 'correo');
  const a = sustituir('joseisrael5101@gmail.com', st.dic);
  const b = sustituir('josephl@ox-glass.com', st.dic);
  check('el reemplazo tiene forma de correo', /^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(a), a);
  check('...y no lleva el dominio real de nadie',
    !/ox-glass|gmail/i.test(a) && !/ox-glass|gmail/i.test(b), [a, b]);
  check('dos correos distintos dan dos correos distintos', a !== b, [a, b]);
  check('el mismo correo dos veces da el mismo',
    sustituir('joseisrael5101@gmail.com', st.dic) === a);
}

console.log('\n═══ 4. Las claves cortas no arrasan ═══\n');
{
  const st = nuevoEstado();
  registrar(st, 'ASA', 'prov');       // tres letras: un proveedor real corto
  const frase = sustituir('CASA DE ASADO, ASAMBLEA', st.dic);
  check('una clave de tres letras NO se aplica dentro de un texto libre — ' +
        'pegaría en mitad de otras palabras', frase === 'CASA DE ASADO, ASAMBLEA', frase);
  check('...pero la celda que ES ese proveedor sí se cambia',
    sustituir('ASA', st.dic) !== 'ASA', sustituir('ASA', st.dic));
}

console.log('\n═══ 5. Cada columna va a su clase ═══\n');
{
  const esperado = {
    'Project': 'obra', 'Projects': 'obra',
    'Supplier': 'prov', 'Company': 'prov',
    'GC': 'gc', 'GCs': 'gc',
    'User': 'correo', 'Email': 'correo',
    'Responsible': 'pers', 'PM': 'pers', 'Name': 'pers', 'Created By': 'pers',
    'Comments': 'libre', 'Notes': 'libre', 'Context': 'libre'
  };
  const malas = Object.keys(esperado).filter(t => claseDe(t) !== esperado[t])
                      .map(t => t + '→' + claseDe(t));
  check('los títulos de columna se clasifican como toca' +
        (malas.length ? ' — MAL: ' + malas.join(', ') : ''), malas.length === 0);
  /* El texto libre NO recibe nombre propio: se le aplica el diccionario que
   * construyen las demás columnas. Así se limpia una obra real escrita a mano
   * dentro de un comentario, sin inventar un "comentario" ficticio. */
  const st = nuevoEstado();
  registrar(st, 'ESTO ES UN COMENTARIO LARGO', 'libre');
  check('un comentario no genera entrada propia en el diccionario',
    Object.keys(st.dic).length === 0, st.dic);
}

console.log('\n═══ 6. Los dos cerrojos siguen puestos ═══\n');
{
  /* Se lee el ARCHIVO, no la caja: lo que importa es lo que se va a copiar y
   * pegar en la hoja de alguien. Un cerrojo abierto en el repositorio es un
   * cerrojo abierto para quien lo pegue sin leer. */
  check('CERROJO_2 viene cerrado', /var CERROJO_2 = false;/.test(SRC));
  check('la marca obligatoria del nombre de la hoja sigue ahí',
    /var MARCA_OBLIGATORIA = 'DEMO';/.test(SRC));
  check('la función que escribe comprueba el cerrojo antes de nada',
    /function ponerNombresFicticios\(\)\s*\{\s*if \(!CERROJO_2\)/.test(SRC));
  check('...y la que sólo mira NO puede escribir',
    /function verQueCambiaria\(\)\s*\{\s*_correr_\(false\);\s*\}/.test(SRC));
  check('se comprueba el nombre de la hoja antes de tocar nada',
    /indexOf\(MARCA_OBLIGATORIA\) === -1/.test(SRC));

  /* Y QUE NO TOQUE LO QUE NO DEBE. Renombrar un material partiría el inventario
   * en dos —la identidad de un material es categoría + nombre— y cambiar una
   * cantidad o un estante haría que la captura enseñara un almacén que no
   * cuadra. Ninguna de esas columnas puede estar en la lista. */
  const prohibidas = ['Qty', 'Unit', 'Loc', 'Destination', 'Type', 'MoveType',
                      'Category', 'Name / Description', 'System Date', 'Movement ID'];
  const listadas = (SRC.match(/^var CAMPOS = \{[\s\S]*?\n\};/m) || [''])[0] +
                   (SRC.match(/^var CAMPOS_CONFIG = \[[\s\S]*?\];/m) || [''])[0];
  const coladas = prohibidas.filter(p => new RegExp("'" + p + "'").test(listadas));
  check('ninguna columna de cantidad, estante, fecha ni identidad está en la lista' +
        (coladas.length ? ' — COLADAS: ' + coladas.join(', ') : ''), coladas.length === 0);
  /* 'Name' sí está, pero sólo en PM_DIRECTORY y USERS_V3, que son personas.
   * El nombre del MATERIAL vive en la columna "Name" del archivo — y el archivo
   * no la lista. Se comprueba explícitamente porque la palabra es la misma. */
  check('el nombre del MATERIAL no se toca: el archivo no lista su columna Name',
    !/'MASTER_ARCHIVE_V3':\s*\[[^\]]*'Name'/.test(SRC));
}

console.log('\n═══ 7. El correo de USERS_V3 es la LLAVE y no se toca ═══\n');
{
  /* JOSE SE QUEDÓ FUERA DE SU PROPIA COPIA con la primera versión: USERS_V3
   * llevaba 'Email' en la lista, y ese correo es lo que getUserRole() busca
   * para dejar entrar. Cambiarlo le negó el acceso a él mismo.
   *
   * Se lee del ARCHIVO, que es lo que se copia y se pega en la hoja de alguien. */
  check('USERS_V3 lleva el nombre y NO el correo',
    /'USERS_V3':\s*\['Name'\]/.test(SRC),
    (SRC.match(/'USERS_V3':[^\n]*/) || [''])[0]);
  check('...y no queda ningún Email en la lista de USERS_V3',
    !/'USERS_V3':\s*\[[^\]]*'Email'/.test(SRC));
  /* PM_DIRECTORY sí lo lleva, y está bien: ese correo no da acceso a nada, es
   * una agenda. La diferencia es la que importa y por eso se comprueba. */
  check('PM_DIRECTORY sí cambia su correo — ahí no abre ninguna puerta',
    /'PM_DIRECTORY':\s*\[[^\]]*'Email'/.test(SRC));
}

console.log('\n═══ 8. Un contratista no es un proveedor ═══\n');
{
  /* En la copia de Jose quedó "CASCADE GLASSWORKS" haciendo de contratista
   * general, porque los GC salían de la lista de proveedores. A un jefe de
   * bodega —que es el público de estas capturas— eso le chirría en dos
   * segundos. */
  check('GC tiene su propia clase', claseDe('GC') === 'gc' && claseDe('GCs') === 'gc',
    [claseDe('GC'), claseDe('GCs')]);
  check('...y Supplier sigue siendo proveedor', claseDe('Supplier') === 'prov');

  const st = nuevoEstado();
  registrar(st, 'ALPINE BUILDERS INC', 'gc');
  registrar(st, 'AMSCO', 'prov');
  const gc   = sustituir('ALPINE BUILDERS INC', st.dic);
  const prov = sustituir('AMSCO', st.dic);
  const listaProv = vm.runInContext('PROVEEDORES', ctx);
  const listaGc   = vm.runInContext('CONTRATISTAS', ctx);
  check('el GC sale de la lista de contratistas', listaGc.indexOf(gc) !== -1, gc);
  check('...y el proveedor de la de proveedores', listaProv.indexOf(prov) !== -1, prov);
  check('las dos listas no comparten ni un nombre — si lo hicieran, una empresa ' +
        'aparecería de proveedora y de constructora en la misma captura',
    listaGc.filter(x => listaProv.indexOf(x) !== -1).length === 0);
}

console.log('\n═══ 9. Los nombres de material — el agujero de la primera versión ═══\n');
{
  /* Después de correr todo lo demás, la copia de Jose SEGUÍA diciendo
   * "KOTTER RESIDENCE" y "SUNBRIDGE PHASE 1" en la columna Name: él nombra
   * muchos materiales por la obra a la que van.
   *
   * Y la SEGUNDA versión de este paso también estaba mal, aunque de otra forma:
   * le pedía pegar la lista de los que renombrar. Corrió el listado y salieron
   * 455 nombres distintos, de los que los genéricos son veintitantos. O sea que
   * le pedía pegar cuatrocientas líneas para salvar veinte. La lista corta es la
   * de los que SE QUEDAN, y por eso ahora se renombra todo menos ésos. */
  check('existe un paso aparte para los nombres de material',
    /function ponerNombresFicticiosDeMaterial\(\)/.test(SRC));
  check('...con su propio cerrojo, y viene cerrado', /var CERROJO_3 = false;/.test(SRC));
  check('...y una función que sólo MIRA y lista lo que hay',
    /function verNombresDeMaterial\(\)/.test(SRC));
  check('la lista que hay que repasar es la de los que SE QUEDAN, no la de los ' +
        'que se renombran — con 455 nombres, la otra era impracticable',
    /var MATERIALES_QUE_SE_QUEDAN = \[/.test(SRC) &&
    !/MATERIALES_A_RENOMBRAR/.test(SRC));
  check('renombra en las tres hojas que llevan el nombre del material',
    /var HOJAS_CON_MATERIAL = \['MASTER_ARCHIVE_V3', 'ARCHIVE_HISTORY', 'MOVEMENT_TRASH'\];/.test(SRC));
  check('...y NO en las hojas de existencias, que se rehacen solas',
    !/HOJAS_CON_MATERIAL = \[[^\]]*LIVE_STOCK/.test(SRC));
  check('avisa de que hay que reconstruir después, sin lo cual el stock queda ' +
        'hablando de materiales que ya no se llaman así',
    /Rebuild Stock Totals/.test(SRC) && /NO ES OPCIONAL/.test(SRC));
  check('el paso de materiales también comprueba que la hoja sea DEMO',
    /function _hojaEsDemo_/.test(SRC) &&
    /function ponerNombresFicticiosDeMaterial\(\)\s*\{[\s\S]{0,200}_hojaEsDemo_/.test(SRC));
}

console.log('\n═══ 10. El generador, contra los nombres REALES de Jose ═══\n');
{
  /* NO CONTRA UN EJEMPLO INVENTADO. Los 449 nombres de abajo salieron de correr
   * verNombresDeMaterial sobre su copia el 2026-09-28. Un generador probado con
   * ocho nombres bonitos no dice nada sobre lo que pasa con cuatrocientos, y lo
   * que puede salir mal —dos familias con el mismo nombre— sólo aparece con
   * volumen. */
  const REALES = require('fs')
    .readFileSync(require('path').join(__dirname, 'fixtures', 'nombres-material-reales.txt'), 'utf8')
    .trim().split('|').map(x => x.trim()).filter(Boolean);

  const hoja = (vals) => ({
    getLastRow: () => vals.length + 1, getLastColumn: () => 1,
    getRange: (r) => ({ getValues: () => r === 1 ? [['Name']] : vals.map(v => [v]) })
  });
  const ss = {
    getName: () => 'MY WAREHOUSE DEMO',
    getSheetByName: (n) => n === 'MASTER_ARCHIVE_V3' ? hoja(REALES) : null
  };
  const dic = vm.runInContext('_dicDeMateriales_', ctx)(ss);

  check('se leyeron los nombres reales', REALES.length > 400, REALES.length);
  check('el generador devuelve un diccionario', !!dic);

  const claves  = Object.keys(dic || {});
  const valores = claves.map(k => dic[k]);
  const cuenta  = {}; valores.forEach(v => { cuenta[v] = (cuenta[v] || 0) + 1; });
  const repes   = Object.keys(cuenta).filter(v => cuenta[v] > 1);

  /* DOS MATERIALES CON EL MISMO NOMBRE NUEVO SE FUNDIRÍAN EN UNO al reconstruir
   * —la identidad es categoría + nombre— y el stock de los dos se sumaría en
   * una sola fila. Es el fallo más caro que puede tener este generador y es el
   * que sólo se ve con volumen. */
  check('ningún nombre nuevo se repite' + (repes.length ? ' — REPETIDOS: ' + repes.slice(0,3).join(', ') : ''),
    repes.length === 0, repes.length);

  const intactos = REALES.filter(n => !dic[n.toUpperCase()]);
  check('los materiales genéricos se quedan como están',
    intactos.indexOf('WINDOW SCREEN') !== -1 && intactos.indexOf('RAIN BUSTER 444') !== -1,
    intactos.slice(0, 8));
  check('...y todo lo demás se renombra', claves.length > 400, claves.length);

  /* LAS FAMILIAS. Ocho variantes de una obra tienen que seguir pareciendo ocho
   * variantes de una obra: con ocho nombres sueltos, la captura deja de parecer
   * un almacén y pasa a parecer una lista generada. */
  const familia = (g) => claves.filter(k => k.split(/[\s\-_]+/)[0] === g)
                               .map(k => dic[k]);
  const cloud = familia('CLOUDVEIL');
  const bases = cloud.map(v => v.replace(/ [A-Z]\d?$/, ''));
  check('las diez variantes de una misma obra comparten base',
    cloud.length >= 8 && new Set(bases).size === 1, { n: cloud.length, bases: [...new Set(bases)] });
  check('...y se distinguen entre ellas', new Set(cloud).size === cloud.length, cloud.length);
  check('dos obras distintas NO comparten base',
    familia('CLOUDVEIL')[0].replace(/ [A-Z]\d?$/, '') !==
    familia('WESTERLY')[0].replace(/ [A-Z]\d?$/, ''),
    [familia('CLOUDVEIL')[0], familia('WESTERLY')[0]]);

  /* Y QUE NO SE ESCRIBA NADA SI NO HAY NOMBRES PARA TODOS. Antes que repartir
   * un nombre repetido —que fundiría dos materiales— se para y lo dice. */
  check('si hubiera más familias que nombres posibles, aborta sin escribir',
    /NO SE ESCRIBIÓ NADA/.test(SRC) && /AVISO: hay/.test(SRC));

  /* Y que correrlo dos veces sobre la misma copia reparta lo mismo: si no, una
   * segunda pasada movería materiales de sitio sin que nadie lo pidiera. */
  const otra = vm.runInContext('_dicDeMateriales_', ctx)(ss);
  check('correrlo dos veces da exactamente el mismo reparto',
    JSON.stringify(dic) === JSON.stringify(otra));
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
process.exit(fail ? 1 : 0);
