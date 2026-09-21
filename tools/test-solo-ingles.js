// LA APP HABLA INGLÉS. TODA. SIEMPRE.
//
// Es una instrucción de Jose de hace meses, dicha así: *"la app debe ser toda en
// inglés, no debe tener ninguna palabra ni frase ni nada en español"*. Y el
// 2026-09-21 la encontró incumplida, en el único sitio donde nadie miraba:
//
//   "el correo está todo en español, ¿es porque mi configuración de correo está
//    en español o porque la app lo envía así?"
//
// Lo mandaba así la app. El reporte diario —asunto, tres títulos, cinco
// cabeceras, el mensaje del día sin movimientos y el pie— estaba escrito en
// duro en español dentro de Code_v3_fixed.gs. Sale solo a las ocho de la tarde,
// no tiene pantalla, y por eso pudo estar meses así sin que nadie lo notara.
//
// LO QUE ESTE ARCHIVO IMPIDE no es ese correo —ése ya está traducido— sino LA
// CLASE ENTERA: el siguiente correo, el siguiente mensaje de error, la siguiente
// pantalla. Un guardia que cuenta es lo único que sobrevive a "se me olvidó".
//
// ── LO QUE NO ES ────────────────────────────────────────────────────────────
//
// NO prohíbe el español en los COMENTARIOS. Medio proyecto está comentado en
// español a propósito: es el idioma en el que Jose y yo hablamos, y un
// comentario no lo lee ningún cliente. Se limpian antes de mirar.
//
// NO prohíbe nombres internos en español. Una variable `_reservasActivas` o una
// clase `.resv-vacia` no las ve nadie. Es la misma regla que con "lock": lo que
// importa es lo que se LEE en pantalla, no cómo se llama por dentro.
//
// ── CÓMO DISTINGUE UNA FRASE DE UN IDENTIFICADOR ────────────────────────────
//
// La misma receta que test-reservas, por los mismos dos tropiezos:
//
//   · Los literales se sacan BIEN EMPAREJADOS. Un regex ingenuo como /'[^']*'/
//     empareja la comilla de CIERRE de un literal con la de APERTURA del
//     siguiente y se inventa cadenas que nadie escribió.
//   · Y se exige que PAREZCA una frase: con un espacio dentro y mayoría de
//     letras. Eso deja fuera identificadores, clases y selectores.
//
// Las palabras buscadas son INEQUÍVOCAMENTE españolas. Nada de "no", "la",
// "del" o "es": son también inglés o trozos de clases CSS, y con ellas el
// detector daba 112 avisos de los cuales 110 eran falsos. Con esta lista da
// exactamente los que hay.
//
// Uso:  node tools/test-solo-ingles.js

const A = require('./andamio.js');
const HTML = A.fuente('html');
const GS   = A.fuente('gs');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

/* ── EL DETECTOR: DOS NIVELES, Y HIZO FALTA ────────────────────────────────
 *
 * La primera versión era UNA lista de palabras inequívocas y se le escapó la
 * mutación de prueba más obvia: `showToast('Los documentos se guardaron')`. Ni
 * "los", ni "documentos", ni "se", ni "guardaron" estaban en ella, y un guardia
 * que deja pasar eso no sirve para lo que Jose pidió.
 *
 * Añadir palabras sueltas es perseguir el error: siempre falta la siguiente. Lo
 * que funciona es distinguir dos clases de señal:
 *
 *   FUERTES  — una sola basta. Palabras que en inglés no existen o no
 *              significan nada ("bodega", "cantidad", "guardaron", "también").
 *   DÉBILES  — hacen falta DOS. Palabras cortas que solas aparecen en clases
 *              CSS, siglas o nombres propios, pero que juntas sólo salen en una
 *              frase española ("los … se", "por … que").
 *
 * Lo que NO está aquí, y conviene que quede escrito: "no", "es", "la", "el",
 * "un", "de", "en", "y", "o". Son palabras inglesas o letras sueltas, y con
 * ellas dentro el detector marcaba como español frases como "There is no Acopio
 * server. There is no Acopio database." Con ellas fuera, el barrido entero da
 * cero falsos positivos.
 */
const FUERTES = [
  'bodega','categoría','categorías','cantidad','ubicación','ubicaciones',
  'movimiento','movimientos','quién','ningún','ninguna','ninguno','administrador',
  'correo','archivo','usuario','usuarios','guardar','guardado','guardados',
  'guardaron','proveedor','almacén','estante','estantes','reporte','aviso',
  'fecha','nombre','día','días','noche','español','también','está','están','más',
  'qué','así','sólo','según','después','aquí','había','será','número'
];
const DEBILES = [
  'los','las','del','una','unos','unas','se','sus','su','que','por','para','son',
  'este','esta','estos','estas','al','ya','muy','pero','cuando','desde','hasta',
  'entre','cada','todos','todas','hay','fue','han','les','porque','documento',
  'documentos','materiales'
];

/* EL LÍMITE DE PALABRA NO PUEDE SER \b, y esto costó una falsa alarma.
 *
 * En JavaScript el guion cuenta como límite, así que /\bdel\b/ casa DENTRO de
 * la clase CSS `loc-del-btn`. Con dos coincidencias así, una fila de botones
 * perfectamente inglesa se marcaba como española. El límite tiene que excluir
 * también el guion y el guion bajo: lo que buscamos son palabras de una frase,
 * no trozos de un identificador. */
function cuenta(t, lista){
  var n = 0;
  for (var i = 0; i < lista.length; i++){
    var re = new RegExp('(^|[^\\w\u00C0-\u017F-])' + lista[i] +
                        '([^\\w\u00C0-\u017F-]|$)', 'gi');
    var m = t.match(re);
    if (m) n += m.length;
  }
  return n;
}

function esEspanol(t){
  return cuenta(t, FUERTES) > 0 || cuenta(t, DEBILES) >= 2;
}

/** Qué palabras dispararon la alarma. Un aviso que sólo dice "hay español aquí"
 *  obliga a buscarlo a ojo en un párrafo; éste lo señala. */
function loQueDelata(t){
  var out = [];
  FUERTES.concat(DEBILES).forEach(function(w){
    if (cuenta(t, [w])) out.push(w);
  });
  return out;
}

// ── Extracción ──────────────────────────────────────────────────────────────
function frasesDe(src){
  /* LOS COMENTARIOS AL FINAL DE LÍNEA, TAMBIÉN.
   *
   * andamio.sinComentarios sólo quita las líneas que EMPIEZAN por //, y lo hace
   * a propósito: quitar todo lo que va tras un // partiría 'https://drive...'
   * por la mitad en cualquier cadena. Pero medio proyecto comenta al final de
   * la línea, y citando a Jose en español:
   *
   *     copies: 1       // Jose: "1 debe ser el default"
   *     var PULSE_ACTIVE_MS = 180000;   // cuánto dura "hace poco"
   *
   * Eso son comentarios, no pantalla. Se quitan aquí —y no en el andamio, que
   * lo usan otras ocho pruebas— exigiendo que el // no venga precedido de ':',
   * que es lo que distingue un comentario de una URL. */
  const limpio = A.sinComentarios(src)
    .split('\n')
    .map(l => l.replace(/([^:])\/\/.*$/, '$1'))
    .join('\n');
  const out = [];

  /* LAS ETIQUETAS SE QUITAN ANTES DE MEDIR, y ésta es la lección de la primera
   * versión: la cadena
   *     '<th>Material</th><th>Categoría</th><th align="right">Cantidad</th>'
   * es más de la mitad signos de markup, así que el filtro de "mayoría letras"
   * la descartaba entera — con dos palabras españolas dentro. La mutación de
   * prueba que devolvía esa cabecera al correo pasó en VERDE.
   * Cambiando las etiquetas por espacios queda " Material Categoría Cantidad ",
   * que es lo que de verdad lee una persona. */
  const pon = (t, unaPalabraVale) => {
    if (!t) return;
    t = String(t).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (!unaPalabraVale && t.indexOf(' ') === -1) return;
    const letras = (t.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g) || []).length;
    if (letras / t.length < 0.6) return;
    out.push(t);
  };

  let m;
  const reStr = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
  while ((m = reStr.exec(limpio))) pon(m[1] !== undefined ? m[1] : m[2], false);

  /* Y el texto entre etiquetas vale AUNQUE SEA UNA SOLA PALABRA. Una cabecera
   * de tabla es una palabra —"Categoría", "Cantidad"— y exigirle un espacio
   * dejaba fuera precisamente la forma en que el español se cuela en una
   * pantalla. Aquí no hay riesgo de confundirlo con un identificador: lo que
   * hay entre un '>' y un '<' es texto escrito para leerse. */
  /* Y se descarta lo que traiga signos de código. Los operadores >= y <= hacen
   * que `to >= s.desde && from <= s.hasta` parezca texto entre etiquetas:
   * el extractor sacaba de ahí "= s.desde && from" y lo daba por español,
   * porque `desde` es el nombre de una variable. Texto escrito para leerse no
   * lleva && ni = ni punto y coma. */
  const HUELE_A_CODIGO = /[&|=;(){}[\]]|\.\w+\b/;
  const reTag = />([^<>{}'"\n]+)</g;
  while ((m = reTag.exec(limpio))) {
    if (!HUELE_A_CODIGO.test(m[1])) pon(m[1], true);
  }

  return [...new Set(out)];
}

console.log('\n── Ninguna frase visible está en español ──\n');

let totalMalas = 0;
[['Index_v3_fixed.html', HTML], ['Code_v3_fixed.gs', GS]].forEach(([nombre, src]) => {
  const frases = frasesDe(src);
  const malas  = frases.filter(esEspanol);
  totalMalas += malas.length;
  check(nombre + ' — ' + frases.length + ' frases revisadas, ninguna en español',
        malas.length === 0, malas.slice(0, 8));
});

console.log('\n── Y el correo diario en particular ──');
//
// Nombrado aparte porque es donde se encontró el fallo, y porque no tiene
// pantalla: nadie lo ve hasta que llega a las ocho de la tarde. Una prueba que
// sólo mirase "el archivo entero" seguiría en verde el día que alguien añada
// una tabla nueva al correo en español y el recuento de arriba la diluya entre
// mil frases.
const correo = A.fnSrc(GS, 'dailyReportHtml_');
const correoLimpio = A.sinComentarios(correo);

check('el correo no lleva ni una palabra española', !esEspanol(correoLimpio),
      loQueDelata(correoLimpio));

// Y las palabras que SÍ tiene que decir. Un guardia que se cumple con el
// archivo vacío no guarda nada.
[['Arrived at the warehouse', 'el título de lo que llegó'],
 ['Left the warehouse',       'el título de lo que salió'],
 ['Moved inside the warehouse','el título de lo interno'],
 ['Received by',              'quién recibió, en la tabla de entradas'],
 ['Taken by',                 'quién se lo llevó, en la de salidas'],
 ['>User<',                   'la columna nueva de quién lo registró'],
 ['movement',                 'la cuenta del título, con su sustantivo'],
 ['No movements were recorded', 'el día tranquilo'],
 ['An admin can change the time', 'el pie']
].forEach(([t, qué]) => {
  check('dice "' + t + '" — ' + qué, correo.indexOf(t) !== -1);
});

console.log('\n── El asunto y el remitente ──');
const envio = A.sinComentarios(A.fnSrc(GS, 'runDailyReport_'));
check('el asunto está en inglés', !esEspanol(envio), loQueDelata(envio));
check('...y dice "movements for"', /movements for/i.test(envio));
check('...y marca el día sin nada como "(no movements)"',
      envio.indexOf('(no movements)') !== -1);

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones');
process.exit(fail ? 1 : 0);
