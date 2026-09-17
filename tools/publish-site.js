// PUBLICAR EL SITIO. Un comando, con los guardias delante.
//
// EL FALLO QUE ESTO EXISTE PARA EVITAR, y ya ocurrió:
//
// Jose, 2026-09-17, con tres capturas de acopio.net: la landing seguía diciendo
// "Barcode scanning and label printing" como pendiente, el contador seguía en
// 144 versiones y el changelog en la v11.98. Yo había corregido las tres cosas
// en las fuentes y le había dicho que estaba hecho. Su pregunta fue exacta:
// "¿cuánto tiempo toman los cambios en aparecer en la landing?"
//
// La respuesta era: INFINITO. Son dos repositorios y dos pasos.
//
//   1. Las fuentes viven en el repositorio privado de la aplicación
//      (landing/*.html). Eso es lo que yo había cambiado.
//   2. El sitio que la gente ve es OTRO repositorio, jic51/acopio-site, que
//      sirve GitHub Pages. Ahí hay que copiar lo que genera build-site.js y
//      hacer push.
//
// El paso 2 se hacía a mano y por la web de GitHub —el último commit decía "Add
// files via upload"— y llevaba sin hacerse desde el 3 de septiembre. Catorce
// días de cambios escritos, probados, con su changelog, y ni uno visible. Nada
// estaba roto. Simplemente nadie había pulsado el segundo botón, y no había
// nada que lo recordara.
//
// LO QUE HACE ESTE ARCHIVO:
//
//   · construye el sitio,
//   · corre los tres guardias y SE NIEGA A PUBLICAR si alguno falla —el de
//     privacidad es el que separa los papeles de Jose de internet, así que no
//     puede ser un paso que se olvide,
//   · compara con el repositorio público y dice exactamente qué cambiaría,
//   · con --push, hace commit y push,
//   · y escribe landing/.publicado, que es lo que le permite a
//     check-publicado.js poner la suite roja cuando el sitio se queda atrás.
//
// LO QUE NO HACE: no borra nada del repositorio público. Ahí hay cinco copias
// viejas de las guías en la raíz y un archivo vacío llamado "download", de una
// subida manual anterior. Nada del sitio les enlaza, pero son URLs públicas y
// borrarlas es una decisión de Jose, no del build. Se avisa de ellas y se
// dejan.
//
// Uso:
//   node tools/publish-site.js                    → dice qué cambiaría
//   node tools/publish-site.js --push             → publica
//   node tools/publish-site.js --to=/ruta/clon    → otro clon del sitio público

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ   = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, '_site');
const SELLO  = path.join(RAIZ, 'landing', '.publicado');

const args   = process.argv.slice(2);
const PUSH   = args.indexOf('--push') !== -1;
const destArg = args.filter(a => a.indexOf('--to=') === 0)[0];
const DESTINO = destArg ? destArg.slice(5) : '/home/user/acopio-site';

function correr(cmd, cmdArgs, cwd){
  return execFileSync(cmd, cmdArgs, { cwd: cwd || RAIZ, encoding: 'utf8' });
}

function morir(msg){
  console.error('\n  ✗ ' + msg + '\n');
  process.exit(1);
}

// ── 1. El clon del sitio público ────────────────────────────────────────────
if (!fs.existsSync(path.join(DESTINO, '.git'))){
  morir('no hay un clon del sitio público en ' + DESTINO + '.\n' +
        '    git clone https://github.com/jic51/acopio-site ' + DESTINO + '\n' +
        '    (o pasa --to=/otra/ruta)');
}

// ── 2. Construir ────────────────────────────────────────────────────────────
console.log('\n── construyendo ──');
process.stdout.write(correr('node', ['tools/build-site.js']));

// ── 3. LOS GUARDIAS, antes de tocar nada ────────────────────────────────────
//
// En este orden y sin excepciones. El de privacidad ya se ganó el sueldo en su
// primera ejecución rechazando tres fugas reales, y el día que publicar sea un
// comando es el día en que tiene que ser imposible saltárselo.
console.log('\n── guardias ──');
const GUARDIAS = [
  ['tools/test-site-privacy.js', 'privacidad — qué sale a internet'],
  ['tools/test-site-links.js',   'enlaces — que ninguno lleve a un 404'],
  ['tools/check-changelog.js',   'changelog — que las dos lenguas estén al día']
];
GUARDIAS.forEach(([archivo, qué]) => {
  try {
    correr('node', [archivo]);
    console.log('  ok   ' + qué);
  } catch (e) {
    console.error('  FALLA ' + qué + '\n');
    process.stderr.write(String(e.stdout || '') + String(e.stderr || ''));
    morir('no se publica nada mientras un guardia falle.');
  }
});

// ── 4. Qué cambiaría ────────────────────────────────────────────────────────
function archivosDe(dir, base){
  base = base || dir;
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name === '.git') return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? archivosDe(p, base) : [path.relative(base, p)];
  });
}

const construidos = archivosDe(SALIDA).sort();
const nuevos = [], cambiados = [], iguales = [];
construidos.forEach(rel => {
  const a = path.join(SALIDA, rel), b = path.join(DESTINO, rel);
  if (!fs.existsSync(b)) nuevos.push(rel);
  else if (fs.readFileSync(a).equals(fs.readFileSync(b))) iguales.push(rel);
  else cambiados.push(rel);
});

// Lo que está publicado y el build no genera. No se borra — sólo se dice.
const publicados = archivosDe(DESTINO).sort();
const huérfanos  = publicados.filter(f => construidos.indexOf(f) === -1);

console.log('\n── qué cambiaría en ' + DESTINO + ' ──');
nuevos.forEach(f    => console.log('  nuevo    ' + f));
cambiados.forEach(f => console.log('  cambia   ' + f));
console.log('  (' + iguales.length + ' sin cambios)');
if (huérfanos.length){
  console.log('\n  publicados que este build NO genera — se dejan como están:');
  huérfanos.forEach(f => console.log('    · ' + f));
  console.log('  Son URLs públicas. Borrarlas es decisión de Jose, no del build.');
}

const alDia = !nuevos.length && !cambiados.length;

if (alDia && !PUSH){
  console.log('\n  ✓ el sitio publicado ya está al día.');
  console.log('    (con --push se reescribe el sello aunque no haya nada que copiar)\n');
  process.exit(0);
}
if (!PUSH){
  console.log('\n  Esto fue una prueba en seco. Para publicarlo de verdad:\n' +
              '    node tools/publish-site.js --push\n');
  process.exit(0);
}

// ── 5. Copiar ───────────────────────────────────────────────────────────────
nuevos.concat(cambiados).forEach(rel => {
  const dst = path.join(DESTINO, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(path.join(SALIDA, rel), dst);
});

// ── 6. EL SELLO ─────────────────────────────────────────────────────────────
//
// Vive en el repositorio de la APLICACIÓN, no en el del sitio, porque quien
// tiene que enterarse de que el sitio se quedó atrás es la suite de la
// aplicación — la que se corre en cada release. Ver check-publicado.js.
//
// Y SE ESCRIBE TAMBIÉN CUANDO NO HAY NADA QUE COPIAR. La primera versión salía
// antes de llegar aquí en ese caso, y eso deja el agujero exacto que el sello
// viene a tapar: un sitio que está al día con un sello viejo se lee como un
// sitio atrasado, y un guardia que se queja de algo que ya está bien es un
// guardia que se aprende a ignorar. Lo que el sello registra es "esta versión
// está publicada", y eso es igual de cierto si no hubo que copiar un byte.
const version = (/^var APP_VERSION = '([^']+)'/m
                  .exec(fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8')) || [])[1] || '?';
// Del renglón "recomputed", que es el único de build-fingerprint --check cuyo
// valor es un hash a secas. El primer intento buscaba "build" seguido del hash
// y sacaba '?', porque el renglón "stamped build" lleva "Code.gs" en medio.
let build = '?';
try {
  build = (/recomputed\s+([0-9a-f]{8})/
            .exec(correr('node', ['tools/build-fingerprint.js', '--check'])) || [])[1] || '?';
} catch (e) { /* el sello del build es informativo; no bloquea publicar */ }

fs.writeFileSync(SELLO,
  '# Escrito por tools/publish-site.js. No editar a mano.\n' +
  '# Lo lee check-publicado.js para poner la suite roja cuando el sitio\n' +
  '# publicado se queda atrás de las fuentes — que es lo que pasó durante\n' +
  '# catorce días en septiembre de 2026 sin que nada avisara.\n' +
  'version=' + version + '\n' +
  'build=' + build + '\n' +
  'fecha=' + new Date().toISOString().slice(0, 10) + '\n');
console.log('\n  sello escrito: landing/.publicado  (v' + version + ', build ' + build + ')');

if (alDia){
  console.log('\n  ✓ no había nada que copiar: el sitio ya servía esta versión.');
  console.log('    Acuérdate de hacer commit de landing/.publicado en este repositorio.\n');
  process.exit(0);
}

const mensaje =
  'Publicar el sitio — v' + version + ' (build ' + build + ')\n\n' +
  'Generado por tools/build-site.js desde el repositorio privado de la\n' +
  'aplicación. Ningún archivo de este repositorio se edita a mano: la\n' +
  'siguiente publicación lo sobrescribiría.\n\n' +
  nuevos.concat(cambiados).map(f => '  · ' + f).join('\n') + '\n';

correr('git', ['add', '-A'], DESTINO);
correr('git', ['-c', 'user.email=joseisrael5101@gmail.com', '-c', 'user.name=Jose Castro',
               'commit', '-m', mensaje], DESTINO);
const rama = correr('git', ['branch', '--show-current'], DESTINO).trim();
correr('git', ['push', '-u', 'origin', rama], DESTINO);

console.log('\n  ✓ publicado en ' + rama + '. GitHub Pages tarda un minuto o dos.');
console.log('    Acuérdate de hacer commit de landing/.publicado en este repositorio.\n');
