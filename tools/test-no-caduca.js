// NINGUNA PRUEBA PUEDE CADUCAR CON EL CALENDARIO.
//
// EL 2026-09-14, un lunes, la suite amaneció roja sin que nadie hubiera tocado
// nada. test-morning-arrivals fijaba sus entregas en el jueves 10 de septiembre
// y ejecutaba openWeekSchedule(), que NO recibe la fecha: la lee con
// new Date(). Mientras el día real cayera en la misma semana (domingo 6 a
// sábado 12) todo cuadraba. El domingo 13 empezó otra semana y la prueba pasó a
// fallar para siempre.
//
// POR QUÉ ESTO MERECE SU PROPIO ARCHIVO. Una prueba que se pone roja sola es
// peor que no tenerla: enseña a mirar la suite y pensar "bah, es esa otra vez".
// El día que se ignora una roja de verdad, el fallo llega al almacén. El daño
// no es la prueba: es la confianza en las otras noventa y cinco.
//
// Y no se arregla mirando: al buscarlo a mano di por hecho que otras tres
// compartían la forma, y las tres estaban bien —una stubea _isoDate, otra
// inyecta un Date con la hora puesta, la tercera no tiene fechas—. Contar a ojo
// se equivoca en las dos direcciones. Por eso lo cuenta esto.
//
// LA REGLA: si una prueba fija una fecha a mano Y ejecuta código del producto
// que lee el reloj, tiene que desactivar el reloj. Valen tres formas, y las
// tres se usan ya en la suite:
//
//   1. Dar un Date propio al contexto      (test-morning-arrivals, con Reloj)
//   2. Doblar _isoDate                     (test-morning-closes)
//   3. Doblar Date con getHours fijo       (test-morning-arrived, el saludo)
//
// Lo que NO vale es dejar el reloj de verdad y confiar en que hoy caiga bien.
//
// Uso:  node tools/test-no-caduca.js

const fs = require('fs'), path = require('path');
const RAIZ  = path.join(__dirname, '..');
const FUENTE = {
  html: fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8'),
  gs:   fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8')
};

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

// Una función entera del producto, con las llaves contadas. La misma forma que
// usan las pruebas de verdad — una ventana de N caracteres ya hizo fallar una
// prueba sobre código sano sólo porque la función creció.
function cuerpoDe(nombre){
  for (const src of [FUENTE.html, FUENTE.gs]) {
    const ini = src.indexOf('function ' + nombre + '(');
    if (ini === -1) continue;
    let d = 0;
    for (let j = src.indexOf('{', ini); j < src.length; j++) {
      if (src[j] === '{') d++;
      else if (src[j] === '}') { d--; if (d === 0) return src.slice(ini, j + 1); }
    }
  }
  return '';
}

// new Date() SIN argumentos: eso es leer el reloj. new Date('2026-09-10') no lo
// es —es una fecha escrita— y confundirlas llenaría esto de falsos avisos.
const LEE_EL_RELOJ = /new\s+Date\s*\(\s*\)|Date\.now\s*\(\s*\)/;

// Una fecha escrita a mano en la prueba. Es la mitad que convierte "lee el
// reloj" en "caduca": sin fecha fija no hay nada con lo que desalinearse.
const FECHA_FIJA = /['"]\d{4}-\d{2}-\d{2}/;

// Los comentarios NO cuentan. El primer intento de este guardia señaló
// test-config-snapshot por una fecha que estaba en un comentario mío, escrito
// el día anterior. Un guardia que avisa de comentarios es un guardia que se
// acaba apagando.
function sinComentarios(src){
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

// Y una prueba que CONSTRUYE sus fechas con el reloj de verdad no puede
// desalinearse de él: el dato y la comparación salen de la misma lectura.
// test-backup-status hace justo eso —new Date().toISOString() y luego espera
// "today at"— y señalarla era el segundo falso positivo del primer intento.
const SE_ALINEA_SOLA = /new\s+Date\s*\(\s*\)/;

// REVISADAS Y DESCARTADAS, UNA A UNA, CON SU RAZÓN.
//
// El detector encuentra la FORMA —fecha fija + código que lee el reloj—, no el
// daño. Hay casos donde la forma está y el daño no, porque la fecha nunca se
// compara contra el reloj. Ésos se descartan aquí, por su nombre y con el
// motivo escrito.
//
// Y esta lista no puede pudrirse: si el detector deja de señalar a una de
// éstas, la entrada sobra y la prueba lo dice. Es el mismo trato que da
// test-cost-privacy a su lista INTERNAL, y por la misma razón — una excepción
// que nadie vuelve a mirar deja de ser una excepción y pasa a ser un agujero.
const REVISADAS = {
  'test-config-snapshot.js':
    'La fecha es el VALOR de LAST_BACKUP_AT, y lo que la prueba comprueba es ' +
    'que ese valor NO salga en el volcado. El new Date() de writeConfigSnapshot_ ' +
    'es la línea "generado el" de la cabecera, sobre la que no se afirma nada. ' +
    'La fecha y el reloj nunca se tocan.'
};

// Las tres formas de desactivar el reloj que ya se usan en la suite.
function desactivaElReloj(src){
  return /Date\s*:\s*(Reloj|function|\(\)|new)/.test(src) ||  // Date propio en el contexto
         /_isoDate\s*:\s*\(\s*\)\s*=>/.test(src) ||           // _isoDate doblado
         /RelojReal/.test(src);                               // el envoltorio con nombre
}

console.log('\n═══ pruebas que fijan una fecha y además ejecutan el reloj ═══\n');

const archivos = fs.readdirSync(path.join(RAIZ, 'tools'))
  .filter(f => /^test-.*\.js$/.test(f) && f !== 'test-no-caduca.js')
  .sort();

let revisadas = 0, enRiesgo = 0;
const culpables = [], descartadas = [];

for (const f of archivos) {
  const bruto = fs.readFileSync(path.join(RAIZ, 'tools', f), 'utf8');
  const src   = sinComentarios(bruto);
  if (!FECHA_FIJA.test(src)) continue;          // sin fecha fija no puede desalinearse
  if (SE_ALINEA_SOLA.test(src)) continue;       // arma sus fechas con el mismo reloj
  revisadas++;

  // Qué funciones del producto levanta esta prueba, por su nombre.
  const nombres = new Set();
  const re = /(?:fnSrc|extractFn)\s*\(\s*(?:[A-Za-z_$][\w$]*\s*,\s*)?['"]([A-Za-z0-9_$]+)['"]/g;
  let m;
  while ((m = re.exec(src))) nombres.add(m[1]);
  if (!nombres.size) continue;

  const conReloj = [...nombres].filter(n => LEE_EL_RELOJ.test(cuerpoDe(n)));
  if (!conReloj.length) continue;               // no ejecuta nada que lea el reloj

  enRiesgo++;
  if (desactivaElReloj(src)) continue;
  if (REVISADAS[f]) { descartadas.push(f); continue; }
  culpables.push(f + ' → ' + conReloj.join(', '));
}

console.log('  (' + revisadas + ' pruebas con fecha fija; ' + enRiesgo +
            ' además levantan código que lee el reloj)\n');

check('ninguna prueba mezcla una fecha fija con el reloj de verdad — si esto ' +
      'cae, la nombrada se pondrá roja sola el día que cambie la semana, y una ' +
      'suite que se pone roja sola deja de leerse',
  culpables.length === 0, culpables);

// La lista de descartadas tiene que seguir describiendo algo real. Una entrada
// que ya no encaja es una excepción que nadie retiró.
const rancias = Object.keys(REVISADAS).filter(f => descartadas.indexOf(f) === -1);
check('y ninguna excepción se ha quedado vieja — si el detector ya no señala a ' +
      'una de las descartadas, la excusa sobra y hay que borrarla',
  rancias.length === 0, rancias);
if (descartadas.length) {
  console.log('\n  revisadas y descartadas, con motivo:');
  descartadas.forEach(f => console.log('    · ' + f + ': ' + REVISADAS[f]));
}

// Y la de la v11.81, por su nombre: fue la que costó el hallazgo, y una regla
// que no recuerda su propio caso se afloja en la primera discusión.
{
  const src = fs.readFileSync(path.join(RAIZ, 'tools', 'test-morning-arrivals.js'), 'utf8');
  check('test-morning-arrivals sigue con el reloj congelado — es la que se cayó',
    /RelojReal/.test(src) && /Date:\s*Reloj/.test(src));
  check('...y congelado EN LA FECHA DE SUS DATOS, no en una cualquiera',
    /new RelojReal\(HOY \+ 'T12:00:00'\)/.test(src));
}

// El detector tiene que poder fallar. Un guardia que no sabe encontrar nada
// pasa siempre, y eso es exactamente lo que parece estar funcionando.
console.log('\n═══ y el detector de verdad detecta ═══\n');
{
  const falsa = "const HOY = '2026-09-10';\n fnSrc('openWeekSchedule');\n";
  const nombres = [...falsa.matchAll(/fnSrc\s*\(\s*['"]([A-Za-z0-9_$]+)['"]/g)].map(x => x[1]);
  check('una prueba de mentira que fija una fecha y levanta openWeekSchedule ' +
        'sería señalada', FECHA_FIJA.test(falsa) &&
    nombres.some(n => LEE_EL_RELOJ.test(cuerpoDe(n))) && !desactivaElReloj(falsa));
  check('...y esa misma fecha DENTRO de un comentario no dispara nada',
    !FECHA_FIJA.test(sinComentarios("// del '2026-09-10' hablamos ayer\n")));
  check('...ni una prueba que arma sus fechas con el reloj de verdad, que no ' +
        'puede desalinearse de él',
    SE_ALINEA_SOLA.test("const iso = new Date().toISOString();"));
  check('...y openWeekSchedule de verdad lee el reloj, que es de donde salió todo',
    LEE_EL_RELOJ.test(cuerpoDe('openWeekSchedule')));
  check('new Date("2026-09-10") NO cuenta como leer el reloj — si contara, esto ' +
        'avisaría de media suite y nadie lo leería',
    !LEE_EL_RELOJ.test("var d = new Date('2026-09-10');"));
}

console.log('\n────────────────────────────────────────────────────────────────────────');
console.log('Esto no comprueba el almacén: comprueba que la suite siga');
console.log('mereciendo que se la lea. Es la única prueba del repositorio');
console.log('cuyo sujeto son las otras pruebas, y por eso va aparte.');
console.log('────────────────────────────────────────────────────────────────────────\n');

console.log((fail ? 'no caduca: ' + fail + ' FALLO(S)' : 'no caduca: ok (' + ok + ')') + '\n');
process.exit(fail ? 1 : 0);
