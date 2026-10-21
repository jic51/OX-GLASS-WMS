// EL ANDAMIO TIENE QUE TRAERSE LAS DEPENDENCIAS SOLO.
//
// Seis veces en una semana la suite amaneció roja por lo mismo: una prueba
// levanta del archivo la función X, alguien le añade a X una llamada a Y, la
// caja no tiene Y, y la prueba revienta con "Y is not defined". No estaba
// midiendo el producto: estaba midiendo el andamio.
//
// Cada vez el arreglo fue añadir el nombre que faltaba, a mano, a esa caja. Es
// decir: mantener a mano una lista de dependencias que el archivo ya sabe. Eso
// no se mantiene solo, y quedó demostrado seis veces que tampoco se mantiene a
// mano.
//
// tools/andamio.js hace que la caja se las busque ella. Este archivo comprueba
// que de verdad se las busca, y lo comprueba CON LOS SEIS CASOS REALES: si el
// andamio hubiera existido, ninguna de las seis habría pasado.
//
// Y comprueba lo contrario también: que sabe fallar. Un resolvedor que trae
// medio archivo "por si acaso" pasaría siempre y no serviría de nada.
//
// Uso:  node tools/test-andamio.js

const A = require('./andamio.js');
const m = A.marcador('andamio');
const GS   = A.fuente('gs');
const HTML = A.fuente('html');

const nombresEn = (src) => [...src.matchAll(/^function ([A-Za-z0-9_$]+)/gm)].map(x => x[1]);

m.seccion('las seis veces que la suite amaneció roja');
{
  /* Cada fila es una de las seis, con la función que la prueba levantaba y la
     dependencia que le faltaba. Están por su nombre a propósito: una regla que
     no recuerda sus propios casos se afloja en la primera discusión. */
  const LAS_SEIS = [
    ['gs',   'rewriteArchiveColumn_', 'textCell_',     'test-category-rename'],
    ['gs',   'backfillMovementIds_',  'textCell_',     'test-movement-id'],
    ['gs',   'writeConfigSnapshot_',  'textSafeRow_',  'test-config-snapshot'],
    ['gs',   'saveMaterialPack',      'textSafeRow_',  'test-packs'],
    ['gs',   'addIncoming',           'withStockLock_','test-text-stays-text'],
    ['html', '_doDeleteIncomingItem', '_stripTags',    'test-incoming-delete']
  ];

  LAS_SEIS.forEach(([cual, fn, dep, prueba]) => {
    const src = cual === 'gs' ? GS : HTML;
    let traidas;
    try { traidas = nombresEn(A.levantar(src, [fn])); }
    catch (e) { traidas = ['<error: ' + e.message.slice(0, 60) + '>']; }
    m.check(fn + ' se trae ' + dep + ' sola — es lo que rompió ' + prueba,
      traidas.indexOf(dep) !== -1, traidas);
  });
}

m.seccion('la forma que se me escapó dos veces: la referencia sin paréntesis');
{
  /* textSafeRow_ NO LLAMA a textCell_: se lo pasa a map como referencia,
     "(row || []).map(textCell_)". El primer andamio buscaba "nombre(" y por eso
     se dejaba textCell_ fuera — la misma forma exacta que se me escapó dos
     veces buscando la doble cita a ojo. */
  const traidas = nombresEn(A.levantar(GS, ['textSafeRow_']));
  m.check('textSafeRow_ arrastra textCell_ aunque sólo lo NOMBRE, sin llamarlo',
    traidas.indexOf('textCell_') !== -1, traidas);
  m.check('...y es verdad que lo usa como referencia, no como llamada',
    /map\(textCell_\)/.test(A.fnSrc(GS, 'textSafeRow_')));
}

m.seccion('y sabe no traer de más');
{
  // Un resolvedor que se trae medio archivo pasaría siempre.
  //
  // MEDIDO, Y ME CORRIGIÓ: sin dobles, las tres acciones de entregas arrastran
  // 147 KB de 553 — porque getUserRole tira de un cuarto del archivo. Con los
  // dobles que una prueba de verdad pone, son 6. Así que los dobles no son sólo
  // para fingir: son TAMBIÉN dónde se corta la búsqueda, y eso hay que decirlo
  // donde se lea.
  const DOBLES = ['ensureIncomingSheet_', 'getUserRole', 'uploadIncomingDoc_',
                  'incomingStatus_', 'incomingDateMode_', 'incomingDateCell_',
                  'withStockLock_'];
  const trozo = A.levantar(GS, ['addIncoming', 'updateIncoming', 'deleteIncoming'],
                           { dobles: DOBLES });
  const kb = trozo.length / 1024, kbTotal = GS.length / 1024;
  m.check('con los dobles puestos, las tres acciones caben en menos del 5% del ' +
          'archivo (' + Math.round(kb) + ' KB de ' + Math.round(kbTotal) + ')',
    kb < kbTotal * 0.05, { kb: Math.round(kb), total: Math.round(kbTotal) });

  const sinDobles = A.levantar(GS, ['addIncoming', 'updateIncoming', 'deleteIncoming']);
  m.check('...y SIN dobles se trae mucho más — por eso cortar la búsqueda ahí ' +
          'importa, y por eso está escrito en el andamio',
    sinDobles.length > trozo.length * 5,
    { conDobles: Math.round(kb) + 'KB', sinDobles: Math.round(sinDobles.length / 1024) + 'KB' });

  // Y lo levantado es JavaScript válido: si el recorte por llaves fallara, esto
  // sería un montón de texto que no compila.
  let compila = true;
  try { new Function(trozo); } catch (e) { compila = false; }
  m.check('y lo que sale COMPILA — el recorte por llaves no parte funciones', compila);
}

m.seccion('los dobles mandan sobre el archivo');
{
  // Si una prueba quiere fingir algo, el andamio no puede traerle la de verdad
  // por detrás: sería la prueba midiendo el producto donde creía medir su doble.
  const conDoble = nombresEn(A.levantar(GS, ['addIncoming'], { dobles: ['withStockLock_'] }));
  m.check('lo que la prueba finge NO se levanta',
    conDoble.indexOf('withStockLock_') === -1, conDoble);
  m.check('...pero lo demás sí sigue viniendo',
    conDoble.indexOf('textSafeRow_') !== -1 && conDoble.indexOf('addIncoming') !== -1);
}

m.seccion('un doble no puede quedar pisado en silencio');
{
  /* LA TRAMPA QUE ESTE ANDAMIO ESTUVO A PUNTO DE CREAR. Una declaración
     `function X(){}` dentro de la caja PISA la X que la prueba puso en el
     contexto. Si el andamio levanta el getUserRole de verdad por ser
     dependencia de otra cosa, gana el de verdad — y la prueba cree que mide su
     doble mientras mide el producto.
     Callando sería el peor fallo posible en una herramienta de pruebas: todo
     verde, midiendo otra cosa. */
  let grito = '';
  try {
    A.montar({ console, textCell_: () => 'fingido' }, GS, ['textSafeRow_']);
  } catch (e) { grito = e.message; }
  m.check('montar() se niega si un nombre levantado ya estaba en el contexto',
    /está\(n\) en el contexto/.test(grito), grito.slice(0, 100));
  m.check('...y dice exactamente qué hacer: ponerlo en `dobles`',
    /`dobles`/.test(grito));

  // Y con el doble declarado, monta sin quejarse.
  let bien = true;
  try {
    const ctx = A.montar({ console }, GS, ['textSafeRow_'], { dobles: ['textCell_'] });
    bien = typeof ctx === 'object';
  } catch (e) { bien = false; }
  m.check('con el doble declarado, monta sin protestar', bien);
}

m.seccion('se queja fuerte cuando algo no está');
{
  // Pedir una función que ya no existe tiene que ROMPER, no devolver vacío. Una
  // prueba que pide algo renombrado y sigue en verde dejó de medir el producto
  // sin que nadie se entere.
  let grito = '';
  try { A.levantar(GS, ['estaNoExisteEnNingunSitio_']); }
  catch (e) { grito = e.message; }
  m.check('pedir una función que no existe revienta en vez de callar',
    /no existe la función/.test(grito), grito.slice(0, 80));
  m.check('...y el mensaje dice qué hacer, no sólo que falló',
    /renombr/i.test(grito));

  let grito2 = '';
  try { A.constantes(GS, ['ESTA_CONSTANTE_NO_EXISTE']); }
  catch (e) { grito2 = e.message; }
  m.check('lo mismo con las constantes', /no existe la constante/.test(grito2));

  // Y las constantes se leen DEL ARCHIVO. Copiarlas a mano es cómo una prueba
  // se queda midiendo un valor que el producto ya cambió.
  const c = A.constantes(GS, ['AC_WIDTH']);
  m.check('una constante se lee del archivo, con su valor de hoy',
    /^var AC_WIDTH\s*=\s*\d+;/.test(c.trim()), c.trim());
}

m.seccion('un fragmento que no es una función también tiene dependencias');
{
  /* EL AGUJERO QUE QUEDABA, y por donde el problema se estaba colando otra vez.
     `levantar` arranca de nombres de función, y hay pruebas que sacan del
     archivo un TROZO con una expresión regular —la plantilla de una celda de
     dentro de renderStock— y lo evalúan. Eso es una buena costumbre y hay que
     defenderla: copiar la plantilla a la prueba la dejaría en verde con la
     plantilla del producto rota.

     Pero ese trozo llama a `_he` y a `_escAttr`, y eso no sale de ningún nombre
     de función, porque el trozo no es una función. En test-lock-visible estaban
     en una lista a mano — o sea, exactamente lo que este andamio existe para
     quitar, entrando por la puerta de al lado. */
  const trozo = '"<td title=\\"" + _escAttr(t) + "\\">" + _he(v) + "</td>"';
  const traidas = nombresEn(A.levantarPara(HTML, trozo));
  m.check('levantarPara lee el TEXTO y trae lo que nombra',
    traidas.indexOf('_he') !== -1 && traidas.indexOf('_escAttr') !== -1, traidas);

  // Y no se inventa nada: un trozo que no nombra funciones del archivo no trae
  // ninguna. Sin esto, un resolvedor que devolviera medio archivo pasaría.
  m.check('...y un trozo que no nombra nada del archivo no trae nada',
    A.levantarPara(HTML, 'var x = 1 + 2;').trim() === '');
}

m.seccion('NINGUNA prueba mantiene ya una lista de dependencias a mano');
{
  /* EL GUARDIA QUE CIERRA EL CICLO, y es la mitad que faltaba. Todo lo de
     arriba comprueba que el andamio FUNCIONA; esto comprueba que SE USA.

     Trece pruebas mantenían su propia lista de nombres de función para meter en
     la caja. Esas listas amanecieron rojas siete veces —la última al extraer
     `tipoDeMovimiento_` en la v12.82, que rompió seis de golpe sin que ninguna
     de las seis hablara de tipos de movimiento— y cada vez el arreglo fue
     añadir a mano el nombre que faltaba. Migradas todas en la v12.82.

     Sin este guardia, la decimocuarta se escribe la semana que viene: la forma
     a mano es la que uno teclea sin pensar. Con él, el día que alguien la
     escriba sale en rojo, con el nombre del archivo y qué poner en su lugar.

     LO QUE BUSCA ES LA FORMA, no la intención: una lista de nombres entre
     corchetes que acaba metiéndose en la caja con `fnSrc` o `extractFn`. Si
     mañana aparece otra manera de escribir lo mismo, este guardia no la verá —
     y no por eso vale menos: la que ya ha mordido siete veces es ésta. */
  const fs = require('fs'), path = require('path');
  const PATRON = /\[[^\]\n]*['"][^\]]*\]\s*(?:\r?\n\s*)?\.?\s*forEach\s*\([^)]*\b(?:fnSrc|extractFn)\s*\(/;

  /* LA SEGUNDA FORMA, y es la que se colaba. test-settings-reopen no tenía
     ninguna lista: metía cuatro `${fnSrc('…')}` sueltos dentro de la plantilla
     con la que arma su página. El guardia de arriba no veía nada que mirar, y
     en la v12.83 esa prueba se cayó con un «_pmDirPoner is not defined» por una
     función nueva de tres líneas. Octava vez del mismo patrón.

     Se busca la INTERPOLACIÓN y no la llamada a secas, porque `fnSrc('x')`
     suelto tiene un uso legítimo que hay que dejar en paz: leer una función
     para buscarle algo con una expresión regular, sin ejecutarla. Lo que mete
     el resultado en una plantilla siempre es código que se va a correr, y eso
     es lo que tiene dependencias. */
  const INTERPOLA = /\$\{\s*(?:fnSrc|extractFn)\s*\(/;

  const culpables = fs.readdirSync(__dirname)
    .filter(f => /^test-.*\.js$/.test(f) && f !== 'test-andamio.js')
    .filter(f => {
      const src = A.sinComentarios(fs.readFileSync(path.join(__dirname, f), 'utf8'));
      return PATRON.test(src) || INTERPOLA.test(src);
    });

  m.check('ninguna prueba mete en la caja una lista de nombres escrita a mano — ' +
          'se pide la función que se mide y `levantar` baja por sus ayudantes, o ' +
          '`levantarPara` si lo que se evalúa es un fragmento' +
          (culpables.length ? ' — A MANO TODAVÍA: ' + culpables.join(', ') : ''),
    culpables.length === 0);

  /* Y EL GUARDIA TIENE QUE MORDER: si el patrón no reconociera la forma, el
     verde de arriba sería un verde que no mira nada — que es peor que no
     tenerlo. Éste es el texto exacto que tenía test-derived-refresh antes de
     migrarla. */
  const comoEra = "  ['normalizeString', 'getMaterialId', 'parseArchiveRow', 'textCell_',\n" +
                  "   'refreshDerivedSheets_'].forEach(n => vm.runInContext(fnSrc(n), ctx));";
  m.check('...y reconoce la forma de la lista, así que ese verde significa algo',
    PATRON.test(comoEra));

  // Y la otra, tal como la tenía test-settings-reopen.
  m.check('...y también la de la plantilla, que es la que se colaba',
    INTERPOLA.test("const page = `<script>\n${fnSrc('_loadSettings')}\n</script>`;"));

  /* Y NO MUERDE lo legítimo: leer una función para buscarle algo con un regex,
     sin ejecutarla, es una costumbre buena de esta suite y tiene que seguir
     pasando. */
  m.check('...y deja en paz un `fnSrc` que sólo lee para buscar',
    !PATRON.test("check('…', /x/.test(fnSrc('_showConfirm')));") &&
    !INTERPOLA.test("const REN = fnSrc('renderStock');"));
}

m.seccion('la hoja falsa se porta como Sheets');
{
  // Las dos cosas que tiene que imitar son las dos que rompieron datos de Jose.
  const h = new A.Hoja('X', [[]]);
  h.getRange(1, 1, 1, 1).setValues([['07-6329']]);
  m.check('sin protección, "07-6329" se vuelve fecha — el fallo del 2026-09-09, reproducido',
    h.rows[0][0] instanceof Date && h.rows[0][0].getUTCFullYear() === 6329);

  h.getRange(2, 1, 1, 1).setValues([["'07-6329"]]);
  m.check('con la comilla, se guarda el texto', h.rows[1][0] === '07-6329');
  m.check('Y LA COMILLA NO SE GUARDA — si se guardara, la doble cita del ' +
          '2026-09-15 sería invisible aquí', h.rows[1][0].charAt(0) !== "'");

  // Y deleteRow desplaza de verdad: sin eso, ninguna carrera se puede ver.
  const g = new A.Hoja('Y', [['cab'], ['uno'], ['dos'], ['tres']]);
  g.deleteRow(2);
  m.check('deleteRow DESPLAZA — lo de abajo sube, que es lo que hace peligrosos ' +
          'los números de fila', g.rows[1][0] === 'dos' && g.rows.length === 3);

  // appendRow también parsea: una fila añadida sin protección se rompe igual
  // que una escrita con setValues.
  const p = new A.Hoja('Z', []);
  p.appendRow(['07-6329', "'07-6329"]);
  m.check('appendRow parsea igual que setValues — no hay una puerta de atrás',
    p.rows[0][0] instanceof Date && p.rows[0][1] === '07-6329');
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('Esto no comprueba el almacén: comprueba el andamio con el que se');
console.log('comprueba el almacén. Va aparte por eso, y existe porque seis veces');
console.log('en una semana la suite se puso roja sin que el producto tuviera');
console.log('nada malo — y una suite que hace eso deja de leerse.');
console.log('────────────────────────────────────────────────────────────────────────');

m.fin();
