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
