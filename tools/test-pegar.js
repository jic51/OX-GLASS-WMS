// EL ARCHIVO RECORTADO ES EL MISMO PRODUCTO, Y SUS LÍNEAS SON LAS MISMAS.
//
// Jose, 22/10, aprobando que la app se sirva sin la prosa: la página baja de
// 1.590 KB a 897 KB, y por la red —que es lo que de verdad espera alguien en
// la bodega con una barra— de 527 KB a 225 KB. Más de la mitad.
//
// ── POR QUÉ ESTO NECESITA UNA PRUEBA Y NO VALE CON MIRARLO ─────────────────
//
// Porque a partir de ahora lo que Jose pega en Apps Script **no es el archivo
// que yo leo**. Son dos archivos distintos, generados por una herramienta, y
// esa es exactamente la forma de la falta que este proyecto lleva encontrando
// diecinueve veces: dos cosas que tienen que coincidir sin que nada lo obligue.
//
// Lo que tiene que coincidir, y lo que pasa si no coincide:
//
//   · EL PRODUCTO. Si el recorte se come un trozo de código, la app que él
//     usa no es la que yo probé. Todas las pruebas verdes del repositorio
//     estarían midiendo un archivo que nadie ejecuta.
//
//   · EL NÚMERO DE LÍNEA. Es lo único que usamos para encontrar un fallo: él
//     manda la captura de su consola, yo leo «línea 19174» y voy ahí. Si las
//     líneas se mueven, ese número lleva a OTRA línea — y eso es peor que no
//     llevar a ninguna, porque se lee código que no tiene nada que ver y se
//     saca una conclusión falsa con total confianza.
//
//   · LA VERSIÓN Y EL SELLO. La app compara los dos archivos entre ellos al
//     arrancar. Si el recorte tocara uno, avisaría de que no son del mismo
//     juego — con razón.
//
//   · QUE ARRANQUE. Un archivo que compila puede no arrancar. Eso se mira en
//     un navegador de verdad, no leyendo.
//
// Uso:  NODE_PATH="$(npm root -g)" node tools/test-pegar.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ   = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, 'pegar');

let ok = 0; const fails = [];
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fails.push(label + (extra === undefined ? '' : ' → ' + JSON.stringify(extra)));
         console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

const PAREJAS = [
  { nombre: 'Index_v3_fixed.html' },
  { nombre: 'Code_v3_fixed.gs' }
];

console.log('\n═══ 1. La herramienta corre y escribe los dos ═══\n');

let corrio = true;
try {
  execFileSync(process.execPath, [path.join(__dirname, 'build-paste.js')],
    { cwd: RAIZ, stdio: 'pipe', env: process.env });
} catch (e) {
  corrio = false;
  const salida = String((e.stdout || '') + (e.stderr || ''));
  check('`build-paste.js` termina bien', false, salida.slice(-400));
}
if (corrio) check('`build-paste.js` termina bien', true);

PAREJAS.forEach(function (p) {
  p.src  = fs.readFileSync(path.join(RAIZ, p.nombre), 'utf8');
  p.out  = fs.existsSync(path.join(SALIDA, p.nombre))
    ? fs.readFileSync(path.join(SALIDA, p.nombre), 'utf8') : null;
  check('`pegar/' + p.nombre + '` existe', !!p.out);
});

if (!PAREJAS.every(function (p) { return p.out; })) {
  console.error('\nFALLÓ: sin archivos recortados no hay nada que comprobar.\n');
  process.exit(1);
}

console.log('\n═══ 2. Las líneas NO se mueven ═══\n');

/* LA COMPROBACIÓN QUE DE VERDAD IMPORTA. Contar líneas no basta: se puede
 * quitar una aquí y añadir otra allá y seguir cuadrando el total. Por eso
 * además se mira dónde cae CADA `function nombre(` en los dos archivos — que
 * es lo único repartido por todo el archivo y fácil de localizar sin parsear
 * nada. */
PAREJAS.forEach(function (p) {
  const a = p.src.split('\n'), b = p.out.split('\n');
  check(p.nombre + ': el recortado tiene exactamente las mismas líneas (' + a.length + ')',
    a.length === b.length, { repo: a.length, pegar: b.length });

  const re = /^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/;
  function mapa(lineas) {
    const m = {};
    lineas.forEach(function (l, i) { const g = l.match(re); if (g) m[g[1]] = i + 1; });
    return m;
  }
  const ma = mapa(a), mb = mapa(b);
  const nombres = Object.keys(ma);
  const movidas = nombres.filter(function (n) { return mb[n] !== ma[n]; });
  check(p.nombre + ': las ' + nombres.length + ' funciones caen en la MISMA línea ' +
        'que en el repositorio — es lo que hace que la consola de Jose siga ' +
        'sirviendo para encontrar el fallo',
    movidas.length === 0,
    movidas.slice(0, 3).map(function (n) {
      return n + ': repo ' + ma[n] + ' → pegar ' + mb[n];
    }));
  check(p.nombre + ': hay funciones que mirar (si no, lo de arriba no mide nada)',
    nombres.length > 100, nombres.length);
});

console.log('\n═══ 3. Es el mismo producto ═══\n');

function sello(src) {
  return {
    ver:   (src.match(/var APP_VERSION = '([\d.]+)'/)  || [])[1],
    build: (src.match(/var APP_BUILD = '([^']*)'/)     || [])[1]
  };
}
PAREJAS.forEach(function (p) {
  const a = sello(p.src), b = sello(p.out);
  check(p.nombre + ': misma versión y mismo sello (' + a.ver + ' · ' + a.build + ')',
    !!a.ver && a.ver === b.ver && a.build === b.build, { repo: a, pegar: b });
});

/* Que el recorte no se haya comido código. No se cuenta todo —sería contar dos
 * veces lo que ya comprueba acorn dentro de la herramienta— sino las piezas
 * que un recortador ingenuo rompe: un `//` dentro de un texto, un `/*` dentro
 * de una expresión regular, y una cadena con aspecto de comentario. */
const idx = PAREJAS[0].out;
check('la URL con `//` dentro sobrevivió entera',
  idx.indexOf('https://www.gstatic.com/charts/loader.js') !== -1);
check('las funciones siguen todas ahí: `_proToast` y `_fueraSugerir`',
  /function _proToast\s*\(/.test(idx) && /function _fueraSugerir\s*\(/.test(idx));
check('el texto que ve el usuario no se tocó',
  idx.indexOf('Pick at least one other name to merge in') !== -1 ||
  idx.indexOf('Tick a row first') !== -1);

console.log('\n═══ 4. Y la prosa sí se fue ═══\n');

/* Si esto no mordiera, el verde de arriba sería compatible con una herramienta
 * que no quita nada. */
PAREJAS.forEach(function (p) {
  const antes = Buffer.byteLength(p.src), despues = Buffer.byteLength(p.out);
  const menos = Math.round(100 - despues * 100 / antes);
  check(p.nombre + ': pesa bastante menos (' + menos + '% menos: ' +
        Math.round(antes / 1024) + ' KB → ' + Math.round(despues / 1024) + ' KB)',
    menos >= 35, { antes: antes, despues: despues });
});

/* Una frase que SÓLO existe en un comentario. Si siguiera ahí, el recorte no
 * habría recortado. */
check('una frase que sólo vive en un comentario ya no está en el recortado',
  PAREJAS[0].src.indexOf('la falta de siempre') !== -1
    ? PAREJAS[0].out.indexOf('la falta de siempre') === -1
    : PAREJAS[1].out.indexOf('la falta de siempre') === -1,
  'si esto falla, o el recorte no quita nada o la frase cambió de sitio');

if (fails.length) {
  console.error('\nFALLÓ:\n  ' + fails.join('\n  ') + '\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones');
console.log('  (que ARRANQUE se mira aparte, en un navegador de verdad:');
console.log('   node tools/test-vigilante-arranque.js pegar/Index_v3_fixed.html)\n');
