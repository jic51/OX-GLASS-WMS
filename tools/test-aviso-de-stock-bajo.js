// LAS ALERTAS DE STOCK BAJO: UNA SOLA REGLA, Y UN BOTÓN QUE NO MIENTE.
//
// Jose, 5/11: *"al quitar todos los checks, igual la lista sigue mostrando lo
// que mostraba antes, y al seleccionar todos los materiales la lista no se
// actualizó. ¿Debería actualizarse desde el momento que se seleccionan los
// materiales y se pone un mínimo?"*
//
// Tres cosas distintas, y la primera no era de la lista:
//
//   1 · «✓ Watch everything» y «✕ Clear all» hacían LO MISMO. Los dos dejaban
//       la lista vacía, y una lista vacía significa «sin filtro», o sea
//       vigílalo todo. El botón que decía «dejar de vigilar» encendía las
//       alertas de TODO.
//   2 · El comentario del código decía que `[]` era «watching nothing», y el
//       código hacía lo contrario. Nunca existió un «no vigilar nada».
//   3 · Nada se actualizaba hasta guardar y cerrar.
//
// Uso:  node tools/test-aviso-de-stock-bajo.js

const fs   = require('fs');
const path = require('path');
const A    = require('./andamio.js');

const RAIZ = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}
function fnSrc(nombre) {
  const ini = HTML.indexOf('function ' + nombre + '(');
  if (ini === -1) throw new Error('no encontrada: ' + nombre);
  let prof = 0;
  for (let j = HTML.indexOf('{', ini); j < HTML.length; j++) {
    if (HTML[j] === '{') prof++;
    else if (HTML[j] === '}') { prof--; if (prof === 0) return HTML.slice(ini, j + 1); }
  }
  throw new Error('sin cerrar: ' + nombre);
}

console.log('\n═══ 1 · LA REGLA, EJECUTADA ═══\n');

/* Un almacén de mentira con los cuatro casos que importan. */
const stockData = {
  a: { name: 'FLASHING TAPE 6',  category: 'FLASHING', warehouseQty: 2,  siteQty: 0, availableQty: 2  },
  b: { name: 'FLASHING TAPE 9',  category: 'FLASHING', warehouseQty: 0,  siteQty: 0, availableQty: 0  },
  c: { name: 'TYVEK WRAP',       category: 'FLASHING', warehouseQty: 50, siteQty: 0, availableQty: 50 },
  // Con un espacio al final a propósito: así es como llega un nombre tecleado,
  // y es lo que antes hacía que su mínimo no se encontrara nunca.
  d: { name: 'SILPRUF SC2000 ',  category: 'SEALANT',  warehouseQty: 1,  siteQty: 0, availableQty: 1  }
};
const ctx = { Object: Object, String: String, stockData: stockData };
const F = A.montar(ctx, HTML, ['_alertasDeStock']);
const alertas = F._alertasDeStock;

const minimos = { 'FLASHING TAPE 6': 10, 'TYVEK WRAP': 5, 'SILPRUF SC2000': 4 };

{
  const r = alertas(null, minimos);
  check('sin lista se vigila TODO', r.mirados === 4, r.mirados);
  check('...y lo que está a cero sale como cero',
    r.zero.map(x => x.name).join(',') === 'FLASHING TAPE 9', r.zero.map(x => x.name));
  check('...y lo que tiene algo pero menos del mínimo sale como bajo',
    r.below.map(x => x.name.trim()).sort().join(',') === 'FLASHING TAPE 6,SILPRUF SC2000',
    r.below.map(x => x.name));
  check('lo que está por encima del mínimo no sale',
    !r.below.some(x => x.name === 'TYVEK WRAP'));
  check('y lo que está a cero NO se cuenta además como bajo — serían dos ' +
        'avisos hablando de lo mismo',
    !r.below.some(x => x.name === 'FLASHING TAPE 9'));
}

/* EL MÍNIMO DE UN NOMBRE CON ESPACIO AL FINAL. El monitor guarda la clave en
 * mayúsculas y sin espacios; la búsqueda no recortaba, así que ese mínimo se
 * guardaba y después no se encontraba nunca. El aviso simplemente no llegaba,
 * sin decir nada. */
{
  const r = alertas(null, minimos);
  check('un material con un espacio al final encuentra su mínimo igual',
    r.below.some(x => x.name.trim() === 'SILPRUF SC2000'), r.below.map(x => x.name));
}

console.log('\n═══ 2 · LOS TRES ESTADOS, Y QUE DOS SON EL MISMO ═══\n');

{
  const vacia = alertas([], minimos);
  const nula  = alertas(null, minimos);
  check('la lista VACÍA vigila todo, igual que no tener lista',
    vacia.mirados === nula.mirados && vacia.mirados === 4, { vacia: vacia.mirados, nula: nula.mirados });

  const una = alertas(['FLASHING TAPE 6'], minimos);
  check('con una lista, se vigila sólo eso', una.mirados === 1, una.mirados);
  check('...y los avisos son sólo de eso',
    una.below.length === 1 && una.zero.length === 0, { below: una.below.length, zero: una.zero.length });
}

/* ── LO QUE SE COMPRUEBA ES EL COMPORTAMIENTO, NO LA PROSA ────────────────
 *
 * La primera versión de esta prueba buscaba la frase vieja —«watching nothing
 * (no alerts)»— en todo el archivo, y se cayó: **mis propios comentarios
 * nuevos la citan** para explicar qué estaba mal. Una prueba que mira el texto
 * no distingue «el fallo sigue ahí» de «el fallo está contado».
 *
 * Lo que sí se puede sujetar es que **haya un solo sitio que decide el
 * filtro**, y que ese sitio trate la lista vacía como «todo». Lo primero ya
 * está arriba; esto es lo segundo. */
const regla = fnSrc('_alertasDeStock');
check('sólo una línea decide a quién se vigila',
  (regla.match(/if \(vigilados && vigilados\.length\)/g) || []).length === 1, regla.slice(0, 200));
check('...y no hay ninguna rama que apague los avisos con la lista vacía',
  !/vigilados\.length === 0/.test(regla) && !/!vigilados\.length/.test(regla));

console.log('\n═══ 3 · UN SOLO BOTÓN, Y DICE LO QUE HACE ═══\n');

/* Había dos y hacían lo mismo. El que decía «Clear all» —dejar de vigilar—
 * encendía las alertas de TODO. */
/* Igual que arriba: se mira el BOTÓN, no el texto del archivo, porque el
 * comentario que explica el arreglo nombra el botón que se fue. */
const botones = HTML.match(/<button[^>]*monitorSelectAll\([^)]*\)[^>]*>[^<]*<\/button>/g) || [];
check('queda UN solo botón, donde había dos que hacían lo mismo',
  botones.length === 1, botones);
check('...y el que queda no promete dejar de vigilar',
  !/Clear all/.test(botones.join(' ')), botones);
check('queda uno, y dice que vuelve a vigilarlo todo',
  /↺ Watch everything/.test(HTML));
check('...y explica en el title qué significa',
  /Clears the list so every material is watched again/.test(HTML));

console.log('\n═══ 4 · Y SE ACTUALIZA MIENTRAS SE TOCA ═══\n');

const resumen = fnSrc('_monPintarResumen');
check('el resumen usa LA MISMA regla que el panel de alertas',
  /_alertasDeStock\(/.test(resumen));
check('...con los mínimos que hay escritos AHORA, no los guardados',
  /_monMin/.test(resumen) && /minAhora/.test(resumen));
check('dice cuántos se vigilan de cuántos', /of ' \+ _monTotal/.test(resumen));
check('...y cuántos están bajos ahora mismo',
  /at zero/.test(resumen) && /below minimum/.test(resumen));
check('...y cuando no hay nada bajo, lo dice en vez de dejar un hueco',
  /nothing is low right now/.test(resumen));
check('y avisa de que marcarlos todos es lo mismo que no marcar ninguno',
  /ticking them all is the same as ticking none/.test(resumen));

/* Los tres sitios que cambian el estado tienen que repintarlo. Si falta uno,
 * la pantalla se queda contestando sobre lo de hace un momento. */
check('se repinta al marcar una casilla',
  /_monPintarResumen\(\);[\s\S]{0,200}Only the chip's count changes/.test(HTML));
check('...al teclear un mínimo', (HTML.match(/_monMin\[e\.target\.getAttribute\('data-name'\)\] = e\.target\.value;\s*\n\s*_monPintarResumen\(\);/g) || []).length === 2);
check('...y al repintar la ventana entera',
  /monitorGrid'\)\.innerHTML = body;\s*\n\s*_monPintarResumen\(\);/.test(HTML));

/* Y que el resumen reserve su sitio: si apareciera y desapareciera, empujaría
 * la lista de materiales justo mientras se marca — el mismo salto que ya se
 * arregló tres veces. */
const css = (HTML.match(/\.mon-resumen\{[^}]*\}/) || [''])[0];
check('el resumen reserva su sitio y no empuja la lista',
  /min-height:var\(--h-btn-lg\)/.test(css), css);

console.log('\n═══ 5 · Y EL PANEL DE ALERTAS LEE DE LA MISMA FUENTE ═══\n');

const stats = fnSrc('renderStats');
check('renderStats ya no lleva la regla dentro', !/var belowMin = \[\];/.test(stats));
check('...la pide', /_alertasDeStock\(monitoredMaterials, config\.minStock\)/.test(stats));
check('y la regla está escrita UNA vez',
  (HTML.match(/function _alertasDeStock/g) || []).length === 1);

console.log('\n═══ 6 · LA FRANJA CUENTA, LA TARJETA SEÑALA ═══\n');

/* Jose, 8/11: *"puedo leer lo que dice la franja pero debo buscar el material
 * viendo el número que hay en el warehouse, y eso es dejar trabajo para que el
 * usuario lo haga."* La franja decía «3 at zero» y ahí se acababa: convertir
 * ese 3 en tres nombres era recorrer doscientas tarjetas a ojo.
 *
 * Esto comprueba el reparto EJECUTÁNDOLO sobre tarjetas de mentira, con la
 * salida real de `_alertasDeStock`. */

function tarjetaFalsa(nombre) {
  const clases = new Set(['monitor-item', 'off']);
  return {
    nombre: nombre,
    getAttribute: function (k) { return k === 'data-mon-row' ? nombre : null; },
    classList: {
      toggle: function (c, on) { if (on) clases.add(c); else clases.delete(c); },
      contains: function (c) { return clases.has(c); }
    },
    clases: clases
  };
}

{
  // Las mismas cuatro de arriba, en mayúsculas y sin espacios: así es como
  // `data-mon-row` las escribe.
  const tarjetas = ['FLASHING TAPE 6', 'FLASHING TAPE 9', 'TYVEK WRAP', 'SILPRUF SC2000']
    .map(tarjetaFalsa);
  // El mismo material DOS veces en pantalla: en su categoría abierta y en la
  // lista de «ya marcados» de abajo. Las dos tienen que pintarse.
  const repetida = tarjetaFalsa('FLASHING TAPE 9');
  const todas = tarjetas.concat([repetida]);

  const ctx2 = {
    Object: Object, String: String, stockData: stockData,
    document: { querySelectorAll: function () { return todas; } }
  };
  const G = A.montar(ctx2, HTML, ['_alertasDeStock', '_monMarcarEstados']);

  G._monMarcarEstados(G._alertasDeStock(null, minimos));

  const porNombre = n => tarjetas.find(t => t.nombre === n);
  check('el que está a cero se pinta de rojo',
    porNombre('FLASHING TAPE 9').classList.contains('is-zero'));
  check('...y no además de naranja — serían dos avisos de lo mismo',
    !porNombre('FLASHING TAPE 9').classList.contains('is-bajo'));
  check('el que está bajo el mínimo se pinta de naranja',
    porNombre('FLASHING TAPE 6').classList.contains('is-bajo'));
  check('...y no de rojo', !porNombre('FLASHING TAPE 6').classList.contains('is-zero'));
  check('el nombre con espacio al final también se pinta',
    porNombre('SILPRUF SC2000').classList.contains('is-bajo'));
  check('el que está por encima del mínimo se queda como estaba',
    !porNombre('TYVEK WRAP').classList.contains('is-zero') &&
    !porNombre('TYVEK WRAP').classList.contains('is-bajo'));
  check('el material que sale dos veces en pantalla se pinta las dos veces',
    repetida.classList.contains('is-zero'));

  /* QUITAR ADEMÁS DE PONER. Subir el mínimo por encima del stock tiene que
   * apagar el naranja en el acto: si sólo se pusiera la clase, la tarjeta se
   * quedaría avisando de algo que ya no pasa. */
  G._monMarcarEstados(G._alertasDeStock(null, { 'FLASHING TAPE 6': 1 }));
  check('subir el mínimo por encima del stock apaga el naranja',
    !porNombre('FLASHING TAPE 6').classList.contains('is-bajo'),
    [...porNombre('FLASHING TAPE 6').clases]);
  check('...y el cero sigue en rojo, porque eso no depende del mínimo',
    porNombre('FLASHING TAPE 9').classList.contains('is-zero'));

  /* Y con la lista filtrada: la tarjeta sólo se pinta si la franja la cuenta.
   * Si se pintara lo que no se vigila, el número y los colores dirían cosas
   * distintas en la misma pantalla. */
  G._monMarcarEstados(G._alertasDeStock(['FLASHING TAPE 6'], minimos));
  check('con filtro, lo que no se vigila no se pinta',
    !porNombre('FLASHING TAPE 9').classList.contains('is-zero'));
  check('...y lo que sí se vigila sigue pintado',
    porNombre('FLASHING TAPE 6').classList.contains('is-bajo'));
}

/* LA MISMA CUENTA, NO DOS. El reparto tiene que salir del resumen, que es
 * quien ya llama a `_alertasDeStock`. Si se llamara otra vez por su cuenta,
 * serían dos cuentas que habría que hacer coincidir — exactamente el fallo
 * que este proyecto repite. */
check('el reparto de colores sale de la cuenta que ya hacía el resumen',
  /_monMarcarEstados\(a\)/.test(resumen), resumen.slice(-300));
check('y `_monMarcarEstados` no vuelve a contar por su cuenta',
  !/_alertasDeStock/.test(fnSrc('_monMarcarEstados')));

/* Los colores son LOS MISMOS de la franja, por variable, no por un hex
 * copiado. Un hex copiado es otra vez «dos cosas que tienen que coincidir sin
 * que nada lo obligue». */
const cssZero = (HTML.match(/\.monitor-item\.is-zero\{[^}]*\}/) || [''])[0];
const cssBajo = (HTML.match(/\.monitor-item\.is-bajo\{[^}]*\}/) || [''])[0];
check('el rojo de la tarjeta es la variable del rojo, no un hex copiado',
  /var\(--red\)/.test(cssZero) && !/#[0-9A-Fa-f]{3,6}/.test(cssZero), cssZero);
check('el naranja de la tarjeta es la variable del naranja',
  /var\(--yellow\)/.test(cssBajo) && !/#[0-9A-Fa-f]{3,6}/.test(cssBajo), cssBajo);
check('y son las mismas dos variables que usa la franja',
  /\.mr-zero\{color:var\(--red\)/.test(HTML) && /\.mr-bajo\{color:var\(--yellow\)/.test(HTML));
/* Pasar el ratón por encima no puede borrar el aviso: las reglas de estado van
 * después de :hover, que también escribe `background` y `border-color`. */
check('el aviso sobrevive al ratón por encima',
  HTML.indexOf('.monitor-item.is-zero{') > HTML.indexOf('.monitor-item:hover{'));
/* Sin filtro no hay nada marcado, así que TODAS las tarjetas llevan `.off`.
 * Si la atenuación se comiera el color, el arreglo no se vería justo en el
 * estado con el que se abre la ventana. */
check('y se lee a través de la atenuación de lo no marcado',
  /\.monitor-item\.off\.is-zero,\.monitor-item\.off\.is-bajo\{opacity:/.test(HTML));

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Un botón que dice «dejar de vigilar» y enciende todas las\n' +
                '  alertas es peor que no tener botón. Y una franja que cuenta\n' +
                '  sin señalar deja el trabajo al usuario.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
