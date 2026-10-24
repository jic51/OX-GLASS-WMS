// LO QUE LA PÁGINA PROMETE Y LO QUE LA APP ABRE TIENEN QUE SER LO MISMO.
//
// Jose, 24/10:
//
//   *"me puse a ver que en la landing y en todos los documentos sólo se habla
//   de Acopio, no hay Acopio Básico ni Pro, así que hay que buscar, analizar,
//   añadir o cambiar todo lo que habla de Acopio."*
//
// Tenía razón, y lo que había era peor que una omisión. La landing tenía UNA
// lista de quince funciones bajo «Built by someone who runs a warehouse», y
// cuatro de ellas —fotos, el equipo con sus permisos, las etiquetas impresas y
// el respaldo de cada noche— están cerradas en la versión gratis. Alguien que
// leyera la página, instalara la gratis y buscara las fotos no encontraba una
// función que faltaba: encontraba una promesa que no se cumplía.
//
// ── POR QUÉ ESTO ES UNA PRUEBA Y NO UN REPASO ──────────────────────────────
//
// Porque es otra vez **dos cosas que tienen que coincidir sin que nada lo
// obligue**: el mapa de candados de la app (`BASIC_PRO`, `BASIC_FUERA`) y la
// lista de la página. Están en dos archivos distintos, los edita gente
// distinta en momentos distintos, y nada los junta. Repasarlos a mano ya
// falló dos veces esta semana — el 21/10 repasé `BASIC_PRO_BOTONES` y no
// toqué `BASIC_PRO_ZONAS`, y el 24/10 escribí de memoria la nota de «What Pro
// adds» y me dejé tres de las once ofertas fuera.
//
// ── CÓMO SE ATAN ───────────────────────────────────────────────────────────
//
// Cada línea de la sección de Pro en la landing lleva `data-pro` con la clave
// del candado que la cierra. La prueba exige las dos direcciones:
//
//   1. toda clave que la página nombre existe de verdad en la app — o es una
//      oferta de `BASIC_PRO`, o es un botón/pestaña que `BASIC_FUERA`
//      esconde. Una clave inventada es una función que la página vende y la
//      app no tiene.
//   2. toda oferta de `BASIC_PRO` aparece en la página. Son la superficie de
//      venta de la gratis: si la app ofrece algo al pulsar un candado y la
//      página no lo menciona, el que decide si paga no sabe que existe.
//
// `BASIC_FUERA` NO exige lo contrario, y a propósito: lo que esconde es
// «fontanería que no vende nada» (palabras del comentario de la propia app) —
// el botón de soporte, el reconstructor de existencias. Que no estén en la
// página es correcto.
//
// Uso:  node tools/test-ediciones-coinciden.js

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP  = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');
const WEB  = fs.readFileSync(path.join(ROOT, 'landing', 'acopio.html'), 'utf8');

let ok = 0; const fails = [];
function check(label, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + ' → esperaba ' + JSON.stringify(want) + ', salió ' + JSON.stringify(got));
         console.log('  FALLA ' + label + '\n         esperaba ' + JSON.stringify(want) +
                     '\n         salió    ' + JSON.stringify(got)); }
}

/* ── LO QUE LA APP CIERRA ───────────────────────────────────────────────── */

/* Se lee del bloque `var BASIC_PRO = { … };` — hasta el `};` que lo cierra al
 * principio de línea, porque dentro hay llaves de los objetos de cada oferta.
 * No se ejecuta el archivo: son 30.000 líneas de app con `google.script.run`
 * por todas partes. Lo que hace falta son los nombres. */
function bloque(nombre) {
  const i = APP.indexOf('var ' + nombre + ' = {');
  if (i < 0) return '';
  const j = APP.indexOf('\n};', i);
  return j < 0 ? '' : APP.slice(i, j);
}

const ofertas = [...new Set(
  [...bloque('BASIC_PRO').matchAll(/^\s{2}(\w+):\s*\{\s*titulo:/gm)].map(m => m[1])
)].sort();

check('se encontraron las ofertas de Pro en la app', ofertas.length > 5, true);
console.log('         ' + ofertas.join(', '));

/* Y lo que se esconde sin oferta: los nombres de `BASIC_FUERA`. */
const fuera = [...new Set(
  [...bloque('BASIC_FUERA').matchAll(/'([A-Za-z][\w]*)'/g)].map(m => m[1])
)].sort();
check('se encontró lo que la versión gratis esconde', fuera.length > 3, true);
console.log('         ' + fuera.join(', '));

const existeEnLaApp = new Set([...ofertas, ...fuera]);

/* ── LO QUE LA PÁGINA PROMETE ───────────────────────────────────────────── */

const lineas = [...WEB.matchAll(/data-pro="([^"]+)"/g)].map(m => m[1]);
const reclamadas = [...new Set(lineas.join(' ').split(/\s+/).filter(Boolean))].sort();

check('la página marca sus líneas de Pro', reclamadas.length > 5, true);

console.log('\n═══ 1· lo que la página nombra, la app lo tiene ═══\n');

check('ninguna línea de la página nombra un candado que no existe en la app',
  reclamadas.filter(k => !existeEnLaApp.has(k)), []);

console.log('\n═══ 2· lo que la app ofrece, la página lo dice ═══\n');

/* Ésta es la mitad que faltaba. Las cuatro promesas rotas del 24/10 las
 * habría cazado la mitad 1 sólo si alguien hubiera puesto `data-pro`; esta
 * mitad las caza sin que nadie se acuerde de nada. */
check('toda oferta de Pro de la app está en la página — es la superficie de ' +
      'venta de la gratis, y la que no se nombra no se puede comprar',
  ofertas.filter(k => !reclamadas.includes(k)), []);

console.log('\n═══ 3· la página parte la lista en dos, y cada línea cae del lado que le toca ═══\n');

/* El encabezado de Pro es el que separa. Todo `data-pro` tiene que estar
 * DEBAJO de él: una línea de Pro arriba, entre las gratis, es exactamente la
 * promesa que rompió la página. */
const iPro = WEB.indexOf('class="edi-hd" data-i18n="t216"');
check('la lista tiene un encabezado para cada edición', iPro > 0, true);

const malColocadas = [...WEB.matchAll(/data-pro="([^"]+)"/g)]
  .filter(m => m.index < iPro)
  .map(m => m[1]);
check('ninguna función de Pro está listada entre las de la versión gratis',
  malColocadas, []);

/* Y al revés: debajo del encabezado de Pro no se cuela una gratis. Cada `<li>`
 * de esa lista tiene que decir qué candado la cierra. */
const trozoPro = WEB.slice(iPro, WEB.indexOf('</ul>', iPro));
const sinMarcar = [...trozoPro.matchAll(/<li ([^>]*)>/g)]
  .filter(m => !/data-pro=/.test(m[1]))
  .map(m => m[1].slice(0, 40));
check('toda línea bajo «Acopio Pro adds» dice qué candado la cierra',
  sinMarcar, []);

console.log('\n═══ 4· y la página no vende una sola cosa llamada «Acopio» ═══\n');

/* La queja de Jose, comprobable: que las dos ediciones se NOMBREN. Sin esto
 * se podría quitar toda la partición y la prueba de arriba seguiría verde
 * (sin `data-pro`, no hay nada que contradecir). */
check('la página nombra Acopio Basic', /Acopio Basic/.test(WEB), true);
check('la página nombra Acopio Pro',   /Acopio Pro/.test(WEB), true);
/* En español también: el diccionario es la otra mitad de la página y es
 * donde más fácil se queda algo sin traducir. */
check('y las nombra en español', /Acopio Básico/.test(WEB) && /Acopio Pro/.test(WEB), true);

/* El precio de la gratis es cero y lo dice. Jose, 23/10: *"ya habíamos
 * decidido que la básica es gratis"*, y la página seguía enseñando sólo $500 y
 * $49. */
check('el precio de la versión gratis está en la página', /\$0/.test(WEB), true);

console.log('\n═══ 5· y el español no se queda sin las etiquetas ═══\n');

/* `acopioApplyLang` reemplaza el innerHTML del `<li>`, así que la línea en
 * español es OTRO texto: si alguien la traduce y se le va el `<strong>` o el
 * sentido, la versión española promete otra cosa. No se puede comprobar el
 * significado, pero sí que exista una entrada española por cada línea de Pro
 * — eso ya lo hace `test-landing-i18n` — y que el encabezado de Pro, que es
 * lo que marca el corte, tenga la suya. */
const dic = WEB.slice(WEB.indexOf('var ACOPIO_ES'));
check('el encabezado de «Acopio Pro adds» tiene su español',
  /"t216"\s*:/.test(dic), true);
check('el de «Acopio Basic» también', /"t215"\s*:/.test(dic), true);

if (fails.length) {
  console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
