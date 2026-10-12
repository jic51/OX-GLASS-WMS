// TRES COSAS QUE DABAN UNA RESPUESTA FALSA CON CARA DE RESPUESTA BUENA.
//
// Las tres salieron de la revisión del 2026-10-12 con Jose, y tienen el mismo
// parecido de familia: ninguna ROMPÍA nada. Las tres contestaban algo — y lo que
// contestaban no era verdad.
//
//   1. «someone else got there first» cuando no había nadie más. El servidor
//      sabía que la reserva ya no estaba activa, y de ahí dedujo QUIÉN la había
//      soltado. En el vídeo de Jose la había soltado él, segundos antes. La
//      columna `UnlockedBy` tenía la respuesta escrita desde el principio.
//
//   2. «No movements match your filters» cuando el archivo ni se había mirado.
//      Buscas un PO del año pasado y la pantalla dice que no hay nada. Sobre un
//      sistema de inventario eso es peor que un error.
//
//   3. Fusionar dos ubicaciones movía el archivo y la lista de CONFIG, y dejaba
//      los candados y las fotos apuntando al nombre muerto. Material apartado
//      en un estante que ya no existe, y fotos que el estante superviviente no
//      hereda. Jose: *"hay que arreglar eso entonces."*
//
// LO QUE ESTE ARCHIVO PROTEGE, y es una regla más que tres comprobaciones:
// **que la app diga lo que SABE y no lo que DEDUCE.** Una frase que afirma una
// causa cuando sólo consta el efecto se lee como un hecho, y manda a alguien a
// buscar un problema que no existe.
//
// Uso:  node tools/test-verdad-y-huerfanos.js

const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}
// Sin comentarios: ya me mordió buscar una cadena que había quitado y
// encontrarla dentro de mi propio comentario explicando que la había quitado.
const sinCom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const GSL = sinCom(GS), HTL = sinCom(HTML);

function fnSrc(src, name){
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) return '';
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  return '';
}

/* ════════════════════════════════════════════════════════════════════════════
   1 · LA APP YA NO ACUSA A NADIE POR DESCARTE
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1 · decir lo que se sabe, no lo que se deduce ═══\n');

check('la frase «someone else got there first» ya no existe en ninguna parte — ' +
      'era una CONCLUSIÓN, y trabajando solo (el caso normal de una bodega ' +
      'pequeña) era además falsa',
  HTL.indexOf('someone else got there first') === -1);
check('...ni «had already been released by someone else», que es la misma ' +
      'deducción en plural',
  HTL.indexOf('had already been released by someone else') === -1);

// Y lo que importa más que quitarla: que exista el dato con el que decir la verdad.
const unlock1 = fnSrc(GSL, 'unlockMaterial');
check('`unlockMaterial` LEE la columna UnlockedBy de la hoja — el dato llevaba ' +
      'ahí desde el principio y nadie lo miraba',
  /rows\[j\]\[10\]/.test(unlock1), unlock1.slice(-400));
check('...y devuelve `unlockedByYou`, comparado EN EL SERVIDOR: el navegador no ' +
      'tiene por qué saber comparar correos',
  /unlockedByYou:/.test(unlock1) && /toLowerCase\(\)/.test(unlock1));

const unlockN = fnSrc(GSL, 'unlockMaterials');
check('`unlockMaterials` separa las que soltó quien pregunta de las que soltó otro',
  /yaSoltadasPorTi/.test(unlockN) && /yaSoltadasPorOtros/.test(unlockN));
check('...contando sólo las que YA no estaban activas, no las que acaba de ' +
      'soltar esta misma llamada',
  /ACTIVE'\) continue;/.test(unlockN.split('yaSoltadasPorTi')[0] || unlockN));

// Las tres frases nuevas, que son tres cosas distintas que SÍ se pueden saber.
check('hay una frase para «la soltaste tú»', /You already released this one/.test(HTML));
check('hay una frase para «la soltó fulano», con su nombre', /Already released by/.test(HTML));
check('y una para cuando no consta quién — sin culpar a nadie',
  /This one was already released/.test(HTML));

check('«Released 0 reservations» ya no se dice: cuando no había nada que soltar ' +
      'porque ya estaban todas, eso es lo que se dice, no un cero',
  /Nothing to do — /.test(HTML));

/* ════════════════════════════════════════════════════════════════════════════
   2 · EL CARTEL DEJA DE ADIVINAR
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2 · el estado real viaja en la misma respuesta ═══\n');

check('el servidor devuelve `locksAfter` en los tres caminos de soltar — ' +
      'soltada, ya-estaba-suelta, y sin hoja',
  (GSL.match(/locksAfter:/g) || []).length >= 3, (GSL.match(/locksAfter:/g) || []).length);
check('...y sale de `getMaterialLocks`, la MISMA función que arma la lista ' +
      'cuando la app carga: una sola forma de decir qué hay reservado',
  /function candadosDespues_\(\)[\s\S]{0,200}getMaterialLocks\(\)/.test(GSL));
check('no cuesta una llamada extra: va dentro de la respuesta que ya se enviaba',
  !/processMovement\('getMaterialLocks'/.test(HTL));

check('el navegador OBEDECE esa lista en vez de deducirla quitando lo que cree ' +
      'haber soltado', /materialLocks = res\.locksAfter/.test(HTL));
check('...con respaldo por si una versión vieja del servidor contesta sin ella: ' +
      'durante un despliegue a medias las dos mitades no tienen por qué coincidir',
  /Array\.isArray\(res\.locksAfter\)/.test(HTL) && /quitarIds/.test(HTL));
/* ANCLADO AL PRINCIPIO DE LÍNEA, y es la TERCERA vez que anoto esto mismo.
 * `_aplicarCandados(res,` sin ancla casa también con `function
 * _aplicarCandados(res, quitarIds){`, así que la definición se cuenta como si
 * fuera una llamada y salen 3 donde hay 2. Ya me pasó con `_pintarGuardado` y
 * con `_aplicarStockDelServidor`. Queda escrito por tercera vez porque
 * evidentemente no basta con escribirlo dos. */
check('y las dos rutas de soltar —una y varias— pasan por la misma función',
  (HTL.match(/^\s*_aplicarCandados\(res,/gm) || []).length === 2,
  (HTL.match(/^\s*_aplicarCandados\(res,/gm) || []).length);

/* ════════════════════════════════════════════════════════════════════════════
   3 · BUSCAR DICE CUÁNDO NO MIRÓ
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3 · buscar y el archivo ═══\n');

const render = fnSrc(HTL, 'renderMovements');
check('con búsqueda puesta y archivo sin cargar, la pantalla lo DICE en vez de ' +
      'contestar «no hay nada» — que es una respuesta falsa con cara de buena',
  /hayBusqueda && !_oldHistoryLoaded && _historicoFilas > 0/.test(render), render.slice(0, 300));
check('...y ofrece buscarlo con un botón, no con una instrucción',
  /_buscarTambienEnElArchivo\(\)/.test(HTML));
check('ese botón reutiliza la carga que ya existía: no es una búsqueda distinta, ' +
      'es hacer que la de siempre alcance',
  /function _buscarTambienEnElArchivo\(\)\s*\{\s*_loadOlderHistoryClicked\(\);/.test(HTL));
check('y cuando el archivo SÍ se miró, el «no hay nada» lo dice — para que un ' +
      'resultado vacío signifique lo mismo siempre',
  /The archive was searched too/.test(HTML));
check('la búsqueda sigue cubriendo el archivo cuando está cargado',
  /_oldHistoryLoaded \? oldMovements\.concat\(movements\) : movements/.test(render));

/* ════════════════════════════════════════════════════════════════════════════
   4 · FUSIONAR MUEVE TAMBIÉN LO QUE NO SE VE
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4 · ningún candado ni foto huérfanos ═══\n');

const merge = fnSrc(GSL, 'mergeLocationsLocked_');
check('al fusionar se reapunta MATERIAL_LOCKS — una reserva en un estante que ' +
      'ya no existe es material apartado que nadie puede soltar',
  /MATERIAL_LOCKS'\),\s*4,/.test(merge), merge.slice(-700));
check('...y RACK_PHOTOS, o el estante superviviente pierde sus fotos sin aviso',
  /RACK_PHOTOS'\),\s*0,/.test(merge));
check('la columna de cada hoja es la correcta: Rack es la E (índice 4) de ' +
      'MATERIAL_LOCKS y Location la A (índice 0) de RACK_PHOTOS',
  /\['ID','MatId','Category','Name','Rack'/.test(GS) &&
  /RACK_PHOTOS\s+Columns \(0-based\): A=Location/.test(GS));
check('se invalida la caché de candados si alguno se movió, o la app seguiría ' +
      'sirviendo el estante viejo desde memoria',
  /if \(candadosMovidos\)[\s\S]{0,120}remove\('materialLocksV1'\)/.test(merge));
check('cada hoja va en su propio try: que falte RACK_PHOTOS en una instalación ' +
      'vieja no puede tumbar la fusión entera',
  (merge.match(/try \{[\s\S]{0,140}reapuntarColumna_/g) || []).length === 2);
check('y queda en la auditoría cuántos se movieron: un cambio invisible que no ' +
      'deja rastro es indistinguible de uno que no ocurrió',
  /reservation\(s\), ' \+ fotosMovidas \+ ' photo\(s\) moved too/.test(merge));

const helper = fnSrc(GSL, 'reapuntarColumna_');
check('el ayudante lee y escribe UNA vez, no celda a celda',
  (helper.match(/getValues\(\)/g) || []).length === 1 &&
  (helper.match(/setValues\(/g) || []).length === 1, helper);
check('...y no escribe nada si no hay nada que mover', /if \(n\) rango\.setValues/.test(helper));
check('...y no pone comilla de texto: la pone quien escribe en el borde, y ' +
      'ponerla dos veces la deja DENTRO del valor (lo cazó test-text-stays-text)',
  !/textCell_/.test(helper));

/* ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n' + (fail ? '✗ ' + fail + ' FALLOS' : '✓ todo bien') + ' · ' + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
