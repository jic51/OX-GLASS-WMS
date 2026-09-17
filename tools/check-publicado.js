// ¿ESTÁ PUBLICADO LO QUE ESTÁ ESCRITO?
//
// No es una prueba: es un guardia contra la podredumbre, como check-changelog.
// Y existe por lo mismo que aquél, que ya lo dice en su cabecera — "las dos
// páginas de cambios estaban en la v10.6 mientras la app iba por la v11.22,
// quince versiones de silencio, y nada avisaba porque nada lo miraba".
//
// ESTA VEZ FUE PEOR, porque el guardia del changelog estaba en verde. Las
// fuentes de la landing estaban corregidas, el changelog estaba al día, la
// suite entera en verde — y acopio.net seguía enseñando la página del 3 de
// septiembre. Catorce días. Lo encontró Jose abriendo su propia web:
//
//   "¿cuánto tiempo toman los cambios en aparecer en la landing y en los demás
//    lugares? no entiendo qué pasa si ya corregiste todo, ¿cómo lo arreglamos?"
//
// La causa es que son DOS repositorios: las fuentes en el privado de la
// aplicación, el sitio servido desde jic51/acopio-site. Escribir el cambio y
// publicarlo son dos actos, y sólo el primero tenía guardias.
//
// LO QUE MIDE: la distancia entre la versión que se publicó por última vez
// —landing/.publicado, que escribe publish-site.js— y APP_VERSION. Cuando se
// pasa del margen, esto falla y dice el comando que lo arregla.
//
// LO QUE NO PUEDE MEDIR, y hay que decirlo: lee un sello local, no el sitio de
// verdad. Si alguien sube archivos a mano por la web de GitHub —que es
// exactamente cómo se hacía hasta ahora— el sello no se enterará. Es un guardia
// contra el olvido, no contra alguien que se salte la herramienta. Lo segundo
// no se puede comprobar sin salir a la red, y una prueba que dependa de la red
// se pone roja los días que la red falla y enseña a ignorarla.
//
// Uso:  node tools/check-publicado.js

const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');

// EL MARGEN. Tres versiones, no cero.
//
// Cero significaría que cada commit que sube APP_VERSION deja la suite roja
// hasta que alguien publique, y un guardia que está rojo la mitad del tiempo es
// un guardia que se deja de leer — el mismo razonamiento por el que
// check-changelog permite cinco y no exige una entrada por versión. Tres es
// "un día de trabajo sin publicar, vale; dos semanas, no".
const MARGEN = 3;

const version = (/^var APP_VERSION = '([^']+)'/m
  .exec(fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'), 'utf8')) || [])[1];
if (!version){ console.error('\n  ✗ no se pudo leer APP_VERSION\n'); process.exit(1); }

const SELLO = path.join(RAIZ, 'landing', '.publicado');
const COMO  = '    node tools/publish-site.js          (dice qué cambiaría)\n' +
              '    node tools/publish-site.js --push   (lo publica)';

console.log('');
if (!fs.existsSync(SELLO)){
  // No es un fallo: es el estado del día en que se añadió esto. El sello nace
  // con la primera publicación hecha con la herramienta.
  console.log('  — landing/.publicado todavía no existe.');
  console.log('    Lo escribe la primera publicación hecha con publish-site.js:');
  console.log(COMO);
  console.log('\nsitio publicado: sin sello todavía\n');
  process.exit(0);
}

const sello = {};
fs.readFileSync(SELLO, 'utf8').split('\n').forEach(l => {
  if (!l.trim() || l.trim()[0] === '#') return;
  const i = l.indexOf('=');
  if (i > 0) sello[l.slice(0, i).trim()] = l.slice(i + 1).trim();
});

// Las versiones son 'mayor.menor' y el menor es un CONTADOR, no un decimal: la
// v11.9 salió antes de la v11.12, y la v11.99 fue seguida de la v12.00. Así que
// no se pueden comparar como texto ('11.9' > '11.89') ni como número decimal
// (11.9 > 11.12), y hay que hacerlo por partes.
//
// El ×100 es una APROXIMACIÓN, dicha aquí para que nadie la confunda con una
// cuenta exacta: la v9 rodó a la v10 en la .94 y la v11 rodó a la v12 en la .99,
// así que el menor no siempre llega a 100 y una distancia que cruce un mayor
// sale algo corta. Da igual para lo que esto decide — "¿más de tres versiones
// atrás?" — y el primer intento usaba ×1000, que daba 910 versiones de
// distancia entre la v11.90 y la v12.00 en vez de 10.
function aNumero(v){
  const p = String(v || '').split('.');
  return (Number(p[0]) || 0) * 100 + (Number(p[1]) || 0);
}

const distancia = aNumero(version) - aNumero(sello.version);

console.log('  app:              v' + version);
console.log('  sitio publicado:  v' + (sello.version || '?') +
            (sello.fecha ? '   (' + sello.fecha + ')' : ''));

if (distancia > MARGEN){
  console.log('\n  ✗ el sitio publicado va ' + distancia + ' versiones por detrás ' +
              '(el margen es ' + MARGEN + ').');
  console.log('    Lo que está escrito no es lo que la gente ve. Para publicarlo:');
  console.log(COMO);
  console.log('\nsitio publicado: ATRASADO\n');
  process.exit(1);
}

console.log('\n  ok   dentro del margen de ' + MARGEN + ' versiones');
console.log('\nsitio publicado: ok\n');
