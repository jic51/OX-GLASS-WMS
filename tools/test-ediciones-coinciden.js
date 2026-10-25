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
/* Se busca por el `data-i18n` del encabezado y nada más. La primera versión de
 * esto buscaba la cadena literal `class="edi-hd" data-i18n="t216"` y se rompió
 * al añadirle un `id="pro"` EN MEDIO — un guardia que se rompe porque el HTML
 * que vigila ganó un atributo es un guardia que se va a desactivar. */
const iPro = WEB.search(/<h3[^>]*data-i18n="t216"/);
check('la lista tiene un encabezado para cada edición', iPro > 0, true);
/* Y si no se encuentra, se para aquí. Con `iPro === -1` las dos
 * comprobaciones de abajo pasan sin mirar nada: `m.index < -1` nunca es
 * cierto y el trozo sale vacío. Verde por no haber encontrado el sitio donde
 * mirar es el peor resultado posible de una prueba. */
if (iPro < 0) {
  console.error('\nFALLÓ: no se encontró el encabezado de Pro; el resto de esta ' +
                'sección no comprobaría nada.\n');
  process.exit(1);
}

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

/* ── Y NINGUNA OFERTA SOSTIENE DOS LÍNEAS ─────────────────────────────────
 *
 * Una línea puede nombrar dos candados (el lector de correos y el de facturas
 * son dos ofertas y una sola frase); dos líneas NO pueden nombrar el mismo.
 * Si lo hacen, al pulsar una de ellas la app contesta de la otra — que es
 * literalmente el fallo que Jose encontró el 21/10: *"al dar clic en la
 * ventana de low stock aparece un mensaje que dice algo sobre los incomings.
 * Eso está mal... analiza todos los candados y el mensaje que muestra, deben
 * hablar de lo mismo"*.
 *
 * Lo hice el 24/10 con `respaldo`: puse el respaldo nocturno y la papelera en
 * dos líneas, las dos cerradas por la pestaña de Sistema. Quien leyera
 * «borrar se puede deshacer» y pulsara recibiría «Automatic backup». Las dos
 * en una, nombrando la pestaña. */
const cuenta = {};
lineas.forEach(function (l) {
  l.split(/\s+/).filter(Boolean).forEach(function (k) {
    cuenta[k] = (cuenta[k] || 0) + 1;
  });
});
check('ninguna oferta aparece en dos líneas — la segunda recibiría el mensaje ' +
      'de la primera, que es el fallo del 21/10 otra vez',
  Object.keys(cuenta).filter(function (k) { return cuenta[k] > 1; }), []);

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

/* ── Y EL ENLACE DEL CANDADO CAE DONDE HAY ALGO ───────────────────────────
 *
 * `_proUrl` construye la dirección que abre «Check Acopio Pro» desde una
 * función cerrada. Hasta la v12.96 iba a la raíz, y el comentario decía por
 * qué: *"va a la raíz, y no a /pro: esa página no existe, y habría sido un 404
 * justo en el momento de más interés."* Ahora lleva `#pro`.
 *
 * Y ahí nace otra pareja que tiene que coincidir sin que nada lo obligue: **el
 * ancla que escribe la app y el `id` que existe en la página**. Están en dos
 * archivos, los edita gente distinta, y si alguien renombra el `id` el enlace
 * no da error — deja al visitante arriba del todo, en silencio, justo en el
 * momento de más interés. Que es el fallo que `/pro` evitaba y éste se
 * reintroduce si nadie mira.
 *
 * Un `#` que no existe NO es un 404: es la misma página sin desplazar. Por eso
 * esto se pudo cambiar sin miedo, y por eso hace falta una prueba — porque
 * romperlo no se nota. */
const anclaApp = (APP.match(/function _proUrl\([\s\S]*?\n\}/) || [''])[0]
  .match(/#([A-Za-z][\w-]*)/);
check('la app manda a un ancla concreta, no a la portada', !!anclaApp, true);
if (anclaApp) {
  check('...y ese ancla existe en la página — un `#` que no existe no da error, ' +
        'deja al visitante arriba del todo y en silencio',
    new RegExp('id="' + anclaApp[1] + '"').test(WEB) ? 'existe' : 'NO existe',
    'existe');
  check('...y es el encabezado de lo que añade Pro, que es lo que acaba de pulsar',
    WEB.indexOf('id="' + anclaApp[1] + '"') === WEB.search(/<h3[^>]*id="pro"/) ||
    /<h3[^>]*id="pro"[^>]*data-i18n="t216"/.test(WEB), true);
}

console.log('\n═══ 5· lo que la gratis promete, su permiso tiene que permitirlo ═══\n');

/* ── EL CANDADO ES LA MITAD DE LA VERDAD; EL PERMISO ES LA OTRA ────────────
 *
 * El 24/10, arreglando justo esto, metí en la lista de Básico dos cosas que la
 * edición gratis NO PUEDE HACER: «un reporte cada tarde, que llega solo por
 * correo» y «cada edición guarda su motivo, y el cambio sale por correo».
 * Ninguna de las dos tiene candado, porque un candado sería absurdo: no es que
 * estén cerradas, es que **no existen**.
 *
 * `appsscript.basic.json` pide UN permiso, `spreadsheets.currentonly`. Sin
 * `script.send_mail` la gratis no manda ningún correo, y sin `script.scriptapp`
 * no tiene disparadores, así que un reporte nocturno es imposible dos veces. Lo
 * puse ahí por leer el mapa de candados y no el manifiesto.
 *
 * Esto es una heurística, no una demostración: busca las palabras que delatan
 * un correo o un disparador en la columna de Básico y exige que el permiso que
 * harían falta esté en el manifiesto. Puede dejar pasar una promesa escrita con
 * otras palabras; lo que no puede es dejar pasar ésta, que ya se escribió una
 * vez. */
const MANIFIESTO = fs.readFileSync(path.join(ROOT, 'appsscript.basic.json'), 'utf8');

const iBasic = WEB.search(/<h3[^>]*data-i18n="t215"/);
check('la lista de Básico se encuentra', iBasic >= 0 && iBasic < iPro, true);
const trozoBasico = WEB.slice(iBasic, iPro);

const PIDEN_PERMISO = [
  { que: 'mandar correo',   permiso: 'script.send_mail',
    pistas: /\bemail(s|ed)?\b|\bcorreo\b|\bmail\b/i },
  { que: 'un disparador',   permiso: 'script.scriptapp',
    pistas: /\bnightly\b|cada noche|\bevening report\b|reporte cada tarde|every night/i },
  { que: 'entrar a Drive',  permiso: 'auth/drive',
    pistas: /\bPDFs?\b|\battach(ed|ments)?\b|\badjunt/i }
];

PIDEN_PERMISO.forEach(function (r) {
  const prometido = r.pistas.test(trozoBasico);
  const concedido = MANIFIESTO.indexOf(r.permiso) !== -1;
  check('la lista de Básico no promete nada que necesite ' + r.que +
        ' (`' + r.permiso + '`), que su manifiesto no pide',
    prometido && !concedido ? 'lo promete y no puede' : 'bien',
    'bien');
});

/* Y que el manifiesto siga siendo el de un solo permiso. Si algún día pide
 * más, estas tres reglas dejan de valer y hay que volver a mirarlas — mejor
 * que lo diga la prueba a que lo descubra un cliente. */
const permisos = (MANIFIESTO.match(/"https:\/\/www\.googleapis\.com[^"]+"/g) || []);
check('el manifiesto de la gratis sigue pidiendo un solo permiso — si crece, ' +
      'las tres reglas de arriba hay que volver a mirarlas', permisos.length, 1);

console.log('\n═══ 6· y el español no se queda sin las etiquetas ═══\n');

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
