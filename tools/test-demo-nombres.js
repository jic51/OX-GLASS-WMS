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

const nuevoEstado = () => ({
  dic: {},
  usados: { obra: 0, prov: 0, pers: 0 },
  vistos: { obra: {}, prov: {}, pers: {}, correo: {} }
});
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
    'Supplier': 'prov', 'GC': 'prov', 'Company': 'prov',
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

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
process.exit(fail ? 1 : 0);
