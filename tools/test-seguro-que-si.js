// DECIR «SÍ» EN UN AVISO TIENE QUE GUARDAR, NO REVENTAR.
//
// Jose, 23/10, con una captura. Devolvió 60 de un material del que sólo habían
// salido 49. El aviso salió bien —«More than went out… 11 more will be added to
// the warehouse than ever left it. Save anyway?»— pulsó **Save anyway**, y:
//
//     Uncaught TypeError: Cannot set properties of undefined
//     (setting 'forceSubmit')
//
// No se pudo guardar. Sus palabras: *"al poner más sí avisa cuánto más se está
// ingresando, pero no me permite guardar y da un error"*.
//
// ── Y NO ERA UNA, ERAN CINCO ────────────────────────────────────────────────
//
// `submitMovement` tiene cinco preguntas de «¿seguro?»:
//
//   1. una entrada por ubicaciones que pasa de las existencias
//   2. filas de un traslado que pasan de las existencias
//   3. una devolución sin estante
//   4. una devolución de MÁS de lo que salió      ← la que vio Jose
//   5. una merma sin existencias suficientes
//
// Las cinco llamaban a `_doSubmit` **antes de que `payload` existiera**.
// `_doSubmit` es una declaración de función, así que está disponible desde el
// principio del cuerpo; `payload` es un `var`, así que en ese momento vale
// `undefined`. Cinco diálogos en los que decir «sí» reventaba, y sólo se
// descubrió el día que alguien dijo «sí» en uno de ellos.
//
// ── POR QUÉ ESTA PRUEBA MIRA LA FORMA Y NO SÓLO EL S��NTOMA ──────────────────
//
// Arreglar las cinco llamadas y quedarse ahí dejaría la trampa puesta: la
// siguiente pregunta que alguien añada volverá a caer, porque el sitio natural
// para escribirla es justo donde estaban las otras cinco. Lo que se defiende
// aquí es la FORMA: un chequeo **apunta** la pregunta, y hay **un solo sitio**
// que decide entre preguntar y guardar — después de que el `payload` exista.
//
// Uso:  NODE_PATH="$(npm root -g)" node tools/test-seguro-que-si.js

const path = require('path');
const A    = require(path.join(__dirname, 'andamio.js'));

const HTML = A.fuente('html');

let ok = 0; const fails = [];
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + (extra === undefined ? '' : ' → ' + JSON.stringify(extra)));
         console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

const src = A.sinComentarios(A.fnSrc(HTML, 'submitMovement') || '');
check('`submitMovement` existe', !!src);

console.log('\n═══ 1. Ningún «¿seguro?» llama a guardar antes de tiempo ═══\n');

/* LA COMPROBACIÓN QUE VALE POR TODA LA PRUEBA.
 *
 * Se parte la función por donde nace el `payload`. Todo lo que hay ANTES corre
 * con `payload === undefined`, así que ahí no puede haber ni una llamada a
 * `_doSubmit`. Es una comprobación sobre la FORMA del código, no sobre los
 * cinco casos conocidos: la pregunta número seis que alguien escriba mañana
 * caerá aquí igual. */
const corte = src.indexOf('var payload = {');
check('el `payload` se construye en algún punto de la función', corte > 0);

const antes = src.slice(0, corte);
const llamadasAntes = (antes.match(/_doSubmit\s*\(/g) || []).length;
check('NADA llama a `_doSubmit` antes de que el `payload` exista — era el fallo ' +
      'exacto: `_doSubmit` está disponible desde el principio (es una ' +
      'declaración) y `payload` todavía vale `undefined`',
  llamadasAntes === 0, { llamadas: llamadasAntes });

check('...y tampoco se abre ninguna ventana de confirmación ahí: una pregunta ' +
      'hecha antes de tiempo sólo puede contestar a algo que no está listo',
  (antes.match(/_showConfirm\s*\(/g) || []).length === 0);

console.log('\n═══ 2. Un chequeo apunta la pregunta, no la hace ═══\n');

check('existe el sitio donde se apunta', /function _preguntarAntes\(/.test(src));
check('...y gana la PRIMERA, como antes: cada chequeo cortaba el camino, así ' +
      'que el que saltaba primero era el único que se veía',
  /if \(!_avisoPendiente\) _avisoPendiente = aviso/.test(src));

/* LAS CINCO, UNA A UNA. Si alguien vuelve a convertir cualquiera de ellas en
 * un `_showConfirm` directo, esto se pone rojo con el nombre de la que falló. */
const LAS_CINCO = [
  ['Stock Warning', 'una entrada por ubicaciones que pasa de las existencias'],
  ['transfer rows', 'filas de un traslado que pasan de las existencias'],
  ['No Location',   'una devolución sin estante'],
  ['More than went out', 'una devolución de MÁS de lo que salió — la que vio Jose'],
  ['Insufficient Stock', 'una merma sin existencias']
];
LAS_CINCO.forEach(function (par) {
  const [marca, que] = par;
  const i = src.indexOf(marca);
  if (i < 0) { check('se encuentra el aviso de «' + marca + '»', false); return; }
  // El trozo alrededor: desde el `_preguntarAntes`/`_showConfirm` más cercano
  // hacia atrás hasta la marca.
  const trozo = src.slice(Math.max(0, i - 260), i + 60);
  check(que + ' → apunta la pregunta en vez de hacerla',
    /_preguntarAntes\(/.test(trozo) && !/_showConfirm\(/.test(trozo),
    trozo.slice(0, 120));
});

console.log('\n═══ 3. Un solo sitio decide entre preguntar y guardar ═══\n');

const despues = src.slice(corte);
check('con el `payload` ya hecho, el aviso pendiente se enseña y su «sí» ' +
      'guarda de verdad',
  /_avisoPendiente\.onConfirm = function\(\)\{ _doSubmit\(false\); \}/.test(despues) &&
  /_showConfirm\(_avisoPendiente\)/.test(despues));
check('...y si no hay nada que preguntar, se guarda directo',
  /_doSubmit\(false\);/.test(despues));
/* CUÁNTOS AVISOS PUEDE HABER DESPUÉS, Y POR QUÉ NO ES UNO.
 *
 * Mi primera versión de esta comprobación exigía UN solo `_showConfirm` en
 * toda la función, y se puso roja. La comprobación estaba mal, no el código:
 * el segundo vive **dentro de `_doSubmit`**, en el manejador de fallo — es el
 * «posible duplicado» que contesta el servidor, y ahí el `payload` existe de
 * sobra porque estamos dentro de la función que lo usa.
 *
 * Lo queda escrito porque la regla falsa era tentadora: «uno solo» suena más
 * limpio que «ninguno antes», y habría obligado a retorcer un código que está
 * bien. La regla de verdad es la posición, no la cuenta. */
check('el último aviso que queda fuera de `_doSubmit` es el despachador del ' +
      'pendiente, y ningún otro: dos despachadores serían dos caminos que ' +
      'tienen que ponerse de acuerdo',
  (despues.slice(0, despues.indexOf('function _doSubmit'))
          .match(/_showConfirm\s*\(/g) || []).length === 0 &&
  /_showConfirm\(_avisoPendiente\)/.test(despues));

console.log('\n═══ 4. Y un error de verdad gana a un «¿seguro?» ═══\n');

/* LO QUE ESTE ARREGLO CORRIGE DE PASO, y que nadie hab��a notado: antes un
 * aviso blando cortaba el camino con `return`, así que las validaciones DURAS
 * de más abajo no llegaban a correr. Alguien pod��a decir «sí» a «¿seguro que
 * quieres devolver de más?» y recibir después un error por un campo
 * obligatorio vacío — o peor, no recibirlo. */
check('las validaciones duras siguen pudiendo cortar: un aviso blando ya no ' +
      'se las salta',
  /alert\(/.test(despues) || /return;/.test(despues));
check('...y lo que apunta la pregunta NO corta el camino, o seguiríamos igual',
  !/_preguntarAntes\([\s\S]{0,400}?\}\);\s*return;/.test(antes),
  'un `return` justo después de apuntar la pregunta deja las validaciones de ' +
  'abajo sin correr, que es el estado del que sale este arreglo');

if (fails.length) {
  console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
