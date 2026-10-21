// CADA CANDADO TIENE QUE CONTESTAR DE LO QUE SE PULSÓ.
//
// Jose, 21/10: *"al dar clic en la ventana de low stock aparece un mensaje que
// dice algo sobre los incomings. Eso está mal; debe decir sobre low stock alerts
// y qué son pro, no algo sobre los incomings. Analiza TODOS los candados y el
// mensaje que muestra, deben hablar de lo mismo"*.
//
// ── POR QUÉ ESTO ES UNA PRUEBA Y NO UN REPASO A MANO ────────────────────────
//
// Porque el repaso a mano ya se hizo —lo hice yo al escribir el mapa— y aun así
// salieron tres mal. El mapa es `id del botón → clave de la oferta`, dos listas
// que tienen que decir lo mismo **sin que nada lo obligue**. Es la misma falta
// que este proyecto lleva dieciséis veces pagando, esta vez en el texto en vez
// de en el código, y el arreglo es el mismo: que algo lo obligue.
//
// Las tres que había:
//
//   · `btnMonitorSettings` (⚙ Monitor — qué materiales se vigilan y con qué
//     mínimo) contestaba «🚚 Expected deliveries». Es el fallo que vio Jose.
//   · su gemelo de la barra, igual.
//   · `btnAiExtract` («📷 toma una foto de la factura y te relleno los campos»)
//     contestaba «📎 Photos and documents», que es adjuntar un archivo. Quien
//     pulsa «léemela» y recibe «puedes guardarla» no entiende que le ofrecen
//     otra cosa: entiende que la app no le entendió.
//
// ── CÓMO SE MIDE «HABLAN DE LO MISMO» ───────────────────────────────────────
//
// Comparando palabras: la etiqueta visible del botón tiene que compartir alguna
// con el título o el texto de su oferta. No es perfecto —«Manage Users» y «Your
// team» hablan de lo mismo y no comparten ninguna— y por eso las excepciones se
// escriben con su motivo, igual que en `test-limite-6min.js`. Una lista de
// nombres sin razones es un descuido con permiso; una lista con razones obliga a
// mirar cada vez que se añade una.
//
// Uso:  node tools/test-candados-hablan-de-lo-mismo.js

const path = require('path');
const A = require(path.join(__dirname, 'andamio.js'));
const HTML = A.fuente('html');

let ok = 0; const fails = [];
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + (extra === undefined ? '' : ' → ' + JSON.stringify(extra)));
         console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* Los dos mapas, leídos DEL ARCHIVO. Copiarlos aquí sería exactamente la falta
 * que esta prueba persigue, cometida por la prueba. */
const vm = require('vm');
const ctx = vm.createContext({});
vm.runInContext(A.constantes(HTML, ['BASIC_PRO', 'BASIC_PRO_BOTONES', 'BASIC_PRO_ZONAS']), ctx);
const OFERTAS = vm.runInContext('BASIC_PRO', ctx);
const BOTONES = vm.runInContext('BASIC_PRO_BOTONES', ctx);
const ZONAS   = vm.runInContext('BASIC_PRO_ZONAS', ctx);

/** Lo que una persona LEE en ese botón: su texto Y su `title`, porque el `title`
 *  es lo que sale al pasar el ratón y a menudo es el que lo explica de verdad
 *  —«AI Extract» no dice nada; su title dice «toma una foto de la factura y la
 *  app rellena los campos»—. Se saca del archivo, nunca se escribe aquí: si
 *  mañana el botón cambia de nombre, esta prueba tiene que enterarse. */
function etiquetaDe(id) {
  const re = new RegExp('<[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</(?:button|a|div)>');
  const m = re.exec(HTML);
  if (!m) return null;
  const abre  = /<[^>]*id="[^"]*"[^>]*>/.exec(m[0]);
  const tit   = abre ? (/title="([^"]*)"/.exec(abre[0]) || [, ''])[1] : '';
  return (m[1] + ' ' + tit)
             .replace(/<[^>]*>/g, ' ')          // fuera las etiquetas de dentro
             .replace(/&[a-z]+;/gi, ' ')
             .replace(/[^\p{L}\p{N}\s]/gu, ' ') // fuera emojis y signos
             .replace(/\s+/g, ' ').trim();
}

const VACIAS = new Set(['a','an','the','and','or','of','to','for','it','is','are',
                        'your','you','any','all','with','from','this','that','in',
                        'on','at','by','be','can','now','add','new','more','see']);

function palabras(t) {
  return String(t || '').toLowerCase().split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !VACIAS.has(w));
}

/* Comparten si alguna palabra de una aparece en la otra, aceptando que una sea
 * el principio de la otra: «backup» y «back», «label» y «labels». */
function comparten(a, b) {
  const A2 = palabras(a), B2 = palabras(b);
  return A2.some(x => B2.some(y => x === y || x.startsWith(y) || y.startsWith(x)));
}

/* ── LAS EXCEPCIONES, CON SU MOTIVO ESCRITO ────────────────────────────────
 *
 * Añadir un nombre aquí obliga a escribir por qué, que es la diferencia entre
 * una excepción y un descuido. Si un día esta lista crece sin control, el
 * problema no son las excepciones: es que la oferta no está hablando el idioma
 * de los botones. */
const CON_MOTIVO = {
  btnUsersMgmt:
    '«Manage Users» y «👥 Your team» no comparten palabra y dicen lo mismo. ' +
    'La oferta habla como le hablaría un vendedor a un dueño de bodega —«tu ' +
    'gente»— y el botón como le habla la app a un administrador. Las dos ' +
    'formas son correctas en su sitio.',
  btnEscanear:
    'Está dentro del menú de la cuenta, donde el texto va en un <span> aparte ' +
    'del icono; lo que se lee es «Scan a label» y la oferta es «📷 Scan a ' +
    'label». Coinciden del todo — lo que falla es sacar la etiqueta de ese ' +
    'armazón, no el mensaje.',
  btnDeleteIncoming:
    'El botón dice sólo «Delete» porque vive DENTRO de la ventana de una ' +
    'entrega esperada, y ahí no hace falta repetir de qué se borra. La oferta ' +
    'sí tiene que decirlo, porque el mensaje se lee fuera de ese contexto. ' +
    'Exigirle a un botón que repita el título de su ventana sería empeorar la ' +
    'app para contentar a esta prueba.',
  btnWeekSchedule:
    '«This week\'s arrivals» y «🚚 Expected deliveries» son la misma cosa en ' +
    'dos palabras distintas: lo que llega. El botón habla del día a día y la ' +
    'oferta del nombre del producto, y las dos son correctas en su sitio. ' +
    'Forzar una palabra común haría peor alguna de las dos.'
};

console.log('\n═══ 1. Todo candado apunta a una oferta que existe ═══\n');

const ids = Object.keys(BOTONES);
check('hay candados que revisar — si esto diera cero, el medidor estaría roto, ' +
      'no el producto', ids.length >= 10, ids.length);

const fantasma = ids.filter(id => !OFERTAS[BOTONES[id]]);
check('ninguno apunta a una oferta que no existe — ésa no enseñaría NADA al ' +
      'pulsarla, y un candado mudo es peor que ninguno' +
      (fantasma.length ? ' — ROTOS: ' + fantasma.join(', ') : ''),
  fantasma.length === 0);

const zonasRotas = Object.keys(ZONAS).filter(z => !OFERTAS[ZONAS[z]]);
check('lo mismo para las zonas apagadas enteras', zonasRotas.length === 0, zonasRotas);

console.log('\n═══ 2. El mensaje habla de lo que se pulsó ═══\n');

const sinEtiqueta = [], desalineados = [];
ids.forEach(function (id) {
  const et = etiquetaDe(id);
  const of = OFERTAS[BOTONES[id]];
  if (!of) return;                              // ya salió arriba
  if (!et) { sinEtiqueta.push(id); return; }
  if (comparten(et, of.titulo) || comparten(et, of.que)) return;
  if (CON_MOTIVO[id]) return;
  desalineados.push(id + ' («' + et + '» → «' + of.titulo + '»)');
});

check('TODO candado contesta de lo que se pulsó — es lo que pidió Jose: ' +
      '«deben hablar de lo mismo»' +
      (desalineados.length ? '\n         DESALINEADOS:\n           · ' +
        desalineados.join('\n           · ') : ''),
  desalineados.length === 0);

/* Las etiquetas que no se pudieron leer se dicen, no se callan: un id que esta
 * prueba no sabe leer es un candado que no está vigilando. */
check('las etiquetas que no se pudieron leer están todas argumentadas' +
      (sinEtiqueta.filter(id => !CON_MOTIVO[id]).length
        ? ' — SIN MOTIVO: ' + sinEtiqueta.filter(id => !CON_MOTIVO[id]).join(', ') : ''),
  sinEtiqueta.every(id => CON_MOTIVO[id]));

console.log('\n═══ 3. La prueba muerde ═══\n');

/* Si el comparador diera «sí» a cualquier cosa, el verde de arriba no miraría
 * nada. Éste es el par exacto que Jose encontró. */
check('«Monitor» contra «Expected deliveries» NO cuenta como hablar de lo ' +
      'mismo — es el fallo que vio Jose, y si esto pasara, la comprobación de ' +
      'arriba sería decorativa',
  !comparten('Monitor', '🚚 Expected deliveries · Record what is coming before it arrives'));
check('«Take a photo of the invoice» contra «Photos and documents» tampoco: ' +
      'comparten «photo» y aun así ofrecen cosas distintas... ' +
      '(aquí el comparador SÍ los deja pasar, y es su límite conocido: ' +
      'por eso el repaso de arriba no sustituye a mirar)',
  comparten('Take a photo of the invoice', 'Photos and documents'));
check('y un par que sí habla de lo mismo pasa',
  comparten('Labels', '🏷️ Labels and QR codes'));

console.log('\n═══ 4. El ⚙ Monitor NO lleva candado en la gratis ═══\n');

/* LA PARTE QUE NO ES DE TEXTO, y es la que de verdad arregló el fallo de Jose.
 * La franja de «⚠ Below Minimum (5)» SE VE en la Básica. Si el botón que define
 * qué es «mínimo» estuviera cerrado, la app enseñaría un problema y escondería
 * el control con el que se define — peor que no tener ninguna de las dos cosas.
 *
 * Y no hay nada que lo justifique: la lista de materiales vigilados vive en las
 * Script Properties del archivo del cliente y no pide ni un permiso más, que es
 * el único portero que tiene la edición gratis. */
check('`btnMonitorSettings` no está entre los candados',
  !BOTONES.btnMonitorSettings, BOTONES.btnMonitorSettings);
check('ni el de la barra de herramientas',
  !BOTONES.btnMonitorSettingsToolbar, BOTONES.btnMonitorSettingsToolbar);

const sinCode = A.sinComentarios(HTML);
check('ni está escondido por otro camino — «deja de ofrecerlo» y «quítalo de la ' +
      'vista» son cosas distintas y aquí no queremos ninguna de las dos',
  !/BASIC_FUERA[\s\S]{0,400}btnMonitorSettings/.test(sinCode));

console.log('\n═══ 5. Ninguna oferta se queda sin usar ═══\n');

/* Una oferta escrita que ningún candado enseña es trabajo muerto, y además la
 * señal de que algo se quedó a medio cambiar. */
/* LAS TRES MANERAS DE ENSEÑAR UNA OFERTA, y la tercera casi me hace borrar una
 * que sí se usa. Apartar material no se pide desde un botón fijo: se llega
 * desde una fila de la tabla, así que su candado es una llamada directa
 * `_proPitch('reservas')` dentro de `openLockModal`. Contar sólo los mapas
 * habría dicho que esa oferta es trabajo muerto, y habría sido yo quitando una
 * venta por no mirar la tercera puerta. */
const directas = (A.sinComentarios(HTML).match(/_pro(?:Pitch|Toast)\(\s*'([a-z]+)'/g) || [])
  .map(t => /'([a-z]+)'/.exec(t)[1]);
const usadas = new Set(Object.keys(BOTONES).map(k => BOTONES[k])
  .concat(Object.keys(ZONAS).map(k => ZONAS[k]))
  .concat(directas));
const huerfanas = Object.keys(OFERTAS).filter(k => !usadas.has(k));
check('toda oferta la enseña algún candado — una oferta que nadie puede ver es ' +
      'trabajo muerto, y la señal de que algo se quedó a medio cambiar' +
      (huerfanas.length ? ' — SIN USAR: ' + huerfanas.join(', ') : ''),
  huerfanas.length === 0);

if (fails.length){ console.error('\nFALLÓ:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
