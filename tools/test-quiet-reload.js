// EL TABLERO NO SE DESARMA CADA VEZ QUE ALGUIEN GUARDA ALGO.
//
// Jose lo fotografió (imagen 1 del 2026-09-04): después de un cambio, las
// tarjetas del tablero se vuelven esqueletos grises y aparece "Connecting to
// Google Sheets... this may take 10-20 seconds". Su pregunta: "¿eso es algo que
// podemos cambiar?"
//
// Sí, y no había que construir nada: loadDataFromGoogle ya tenía los tres modos
// desde antes. Lo que pasaba es que NUEVE sitios llamaban al modo ruidoso
// —`(true)`, sin caché y con pantalla de carga— cuando el silencioso —`(true,
// true)`— ya existía y se usaba en otros cinco. No era un fallo de diseño: era
// una decisión que nunca se tomó, repetida nueve veces.
//
// LO QUE ESTE ARCHIVO PROTEGE, y por qué no es una lista de líneas:
//
// La regla no es "ninguna llamada puede ser ruidosa". DOS TIENEN QUE SERLO, y
// si alguien las apagara por celo estaría rompiendo algo peor:
//
//   · Al terminar el asistente no hay caché ni nada en pantalla, y esa primera
//     carga es la que de verdad tarda. Sin esqueletos, la app se queda en
//     blanco sin explicación.
//   · Al cerrar sesión la pantalla TIENE que vaciarse. Un refresco silencioso
//     dejaría el inventario de la empresa a la vista de quien acaba de salir.
//
// Así que lo que se comprueba es que las ruidosas sean EXACTAMENTE esas dos, y
// que cada una siga estando donde su motivo la justifica. Un número suelto
// ("como mucho dos") no serviría: dos ruidosas equivocadas lo cumplirían.
//
// Se lee del archivo porque es una decisión sobre qué llamada va en qué sitio,
// y eso vive en el código, no en el navegador. Lo que sí se ejecuta es el
// efecto: que en modo silencioso no se pinten esqueletos.
//
// Uso:  node tools/test-quiet-reload.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const src = fs.readFileSync(SRC, 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// La función que envuelve cada llamada, para poder decir DÓNDE está y no sólo
// en qué línea — un número de línea deja de significar nada en cuanto alguien
// añade un comentario más arriba.
function envolvente(pos){
  const antes = src.slice(0, pos);
  const m = [...antes.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  return m.length ? m[m.length - 1][1] : '(fuera de una función)';
}

console.log('\n═══ quién pide la pantalla de carga ═══\n');

const ruidosas = [];
const silenciosas = [];
const re = /loadDataFromGoogle\(\s*true\s*(,\s*true\s*)?\)/g;
let m;
while ((m = re.exec(src)) !== null) {
  (m[1] ? silenciosas : ruidosas).push({ pos: m.index, fn: envolvente(m.index) });
}

console.log('  ruidosas:    ' + ruidosas.map(r => r.fn).join(', '));
console.log('  silenciosas: ' + silenciosas.length + '\n');

// Las dos que deben serlo, nombradas por la función que las contiene.
const DEBEN_SER_RUIDOSAS = ['_signOut'];

check('sólo quedan DOS llamadas con pantalla de carga (' + ruidosas.length + ')',
  ruidosas.length === 2);

check('una es la de cerrar sesión — la pantalla tiene que vaciarse, no puede ' +
      'quedarse el inventario a la vista de quien acaba de salir',
  ruidosas.some(r => DEBEN_SER_RUIDOSAS.indexOf(r.fn) !== -1));

// La del asistente no está dentro de una función con nombre (vive en un
// manejador anónimo), así que se identifica por lo que tiene al lado.
check('y la otra es la primera carga tras el asistente — ahí no hay caché ni ' +
      'nada en pantalla, y es la carga que de verdad tarda',
  /_wizJustFinished = true;[\s\S]{0,600}?loadDataFromGoogle\(true\);/.test(src));

// Y que las dos lleven escrito POR QUÉ. Una llamada ruidosa sin motivo al lado
// es la que alguien vuelve a copiar creyendo que es la forma normal.
check('las dos llevan su motivo escrito al lado, para que la siguiente persona ' +
      'no las copie creyendo que son la forma normal',
  (src.match(/RUIDOSO A PROPÓSITO/g) || []).length === 2);

console.log('\n═══ y las que guardan algo, no ═══\n');

// Cada sitio que guarda, borra o edita tiene que refrescar EN SILENCIO. Se
// nombran uno a uno: "hay N silenciosas" pasaría igual si una de éstas
// desapareciera y apareciera otra en cualquier parte.
const DEBEN_SER_SILENCIOSAS = [
  ['borrar un movimiento',        /Movement deleted[\s\S]{0,400}?loadDataFromGoogle\(true, true\)/],
  ['editar un movimiento',        /Movement updated[\s\S]{0,400}?loadDataFromGoogle\(true, true\)/],
  ['borrar una entrega esperada', /Expected delivery deleted[\s\S]{0,400}?loadDataFromGoogle\(true, true\)/],
  ['importar un archivo',         /importFileInput[\s\S]{0,400}?loadDataFromGoogle\(true, true\)/],
  ['rehacer los totales',         /Stock totals rebuilt[\s\S]{0,400}?loadDataFromGoogle\(true, true\)/],
  ['arreglar datos desde "Check my data"',
                                  /merging two materials[\s\S]{0,400}?loadDataFromGoogle\(true, true\)/]
];
DEBEN_SER_SILENCIOSAS.forEach(([que, patron]) => {
  check(que + ': refresca sin desarmar el tablero', patron.test(src));
});

console.log('\n═══ qué significa "silencioso" ═══\n');
{
  // El cuerpo de la función, para comprobar qué queda detrás de `quiet`.
  const i = src.indexOf('function loadDataFromGoogle(');
  let depth = 0, fin = i;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { fin = j; break; } }
  }
  const cuerpo = src.slice(i, fin + 1);

  check('en silencio no se pintan los esqueletos', /else if \(!quiet\)[\s\S]{0,200}setLoading\(true\)/.test(cuerpo));
  check('...ni el aviso de los 10-20 segundos',
    /else if \(!quiet\)[\s\S]{0,700}Connecting to Google Sheets/.test(cuerpo));
  check('...ni se pone el indicador de conexión en "cargando"',
    /if \(!quiet\) setConnStatus\('loading'\)/.test(cuerpo));

  // Y LO QUE NO CAMBIA: un fallo se sigue viendo. Silencioso es sin parpadeo,
  // no sin noticias — si el refresco falla después de guardar, quien guardó
  // tiene que enterarse.
  check('PERO UN FALLO SE SIGUE ENSEÑANDO: el manejador de error escribe en ' +
        'pantalla pase lo que pase. Silencioso es sin parpadeo, no sin noticias',
    /withFailureHandler\(function\(err\)\{[\s\S]{0,600}Error loading data/.test(cuerpo));

  // El comentario que explica los tres modos. El que había antes decía que
  // skipCache existe "para que el usuario vea el estado de carga", que es justo
  // lo que Jose pidió quitar — un comentario que fue verdad y dejó de serlo.
  check('y el comentario de la función describe los tres modos, no el de antes',
    /LOS TRES MODOS DE ESTA FUNCIÓN/.test(cuerpo));
}

console.log('\n' + '─'.repeat(72));
console.log('El modo silencioso existía desde antes y se usaba en cinco sitios.');
console.log('Los otros nueve pedían la pantalla de carga sin que nadie lo');
console.log('hubiera decidido. No era un fallo: era una decisión no tomada,');
console.log('repetida nueve veces.');
console.log('─'.repeat(72));

console.log('\nquiet reload: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
