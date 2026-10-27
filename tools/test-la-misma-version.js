// LA VERSIÓN ESTÁ ESCRITA DOS VECES. ESTO LAS ATA.
//
// Hallazgo E-01 del análisis estructural (27/10). `APP_VERSION` se declara en
// los dos archivos del producto:
//
//     Code_v3_fixed.gs      var APP_VERSION = '13.0';
//     Index_v3_fixed.html   var APP_VERSION = '13.0';
//
// Y NADIE LAS COMPARABA. Lo comprobé antes de escribir esto:
//   · check-publicado.js lee sólo la del .gs,
//   · test-pegar.js compara CADA archivo con su propia salida de compilación
//     —src contra out, archivo por archivo—, nunca un archivo contra el otro,
//   · los otros veinte sitios que mencionan APP_VERSION la usan, no la cotejan.
//
// ── POR QUÉ IMPORTA, QUE NO ES OBVIO ────────────────────────────────────────
//
// El cliente ve en pantalla la del Index. El registro de cambios, el sello de
// compilación y la comprobación de publicación usan la del .gs. Si se separan,
// una instalación dice 13.0 mientras nosotros creemos que tiene 13.1 — y
// entonces cada conclusión que saquemos en soporte parte de un dato falso. No
// es que falle algo: es que deja de poder diagnosticarse lo que falle.
//
// Es, otra vez, DOS COSAS QUE TIENEN QUE COINCIDIR SIN QUE NADA LO OBLIGUE, en
// el dato con el que se diagnostica todo lo demás.
//
// ── LO QUE TAMBIÉN MIRA ─────────────────────────────────────────────────────
//
// El sello de compilación (APP_BUILD) tiene el mismo problema y la misma cura,
// así que va aquí mismo. Y se comprueba que la versión tenga forma de versión:
// una cadena vacía en los dos sitios «coincide» y no vale nada.
//
// Uso:  node tools/test-la-misma-version.js

const fs   = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

let ok = 0;
const fallos = [];
function check(etiqueta, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + etiqueta); return; }
  fallos.push(etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
  console.log('  ✗    ' + etiqueta + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : ''));
}

const ARCHIVOS = [
  { nombre: 'Code_v3_fixed.gs',    quien: 'el servidor' },
  { nombre: 'Index_v3_fixed.html', quien: 'lo que ve el cliente' }
];

console.log('\n═══ la versión dice lo mismo en los dos sitios ═══\n');

const leido = ARCHIVOS.map(function (a) {
  const src = fs.readFileSync(path.join(RAIZ, a.nombre), 'utf8');
  return {
    nombre:  a.nombre,
    quien:   a.quien,
    version: (src.match(/var APP_VERSION\s*=\s*'([^']*)'/) || [])[1],
    build:   (src.match(/var APP_BUILD\s*=\s*'([^']*)'/)   || [])[1]
  };
});

// Primero que existan. Si el regex deja de encontrar nada —porque alguien
// cambió `var` por `const`, por ejemplo— los dos serían `undefined` y la
// comparación de abajo diría que coinciden. Ese es el falso verde de esta
// prueba y hay que cerrarlo antes de comparar nada.
leido.forEach(function (a) {
  check(a.nombre + ': se encuentra APP_VERSION', !!a.version, a.version);
  check(a.nombre + ': tiene forma de versión (' + a.version + ')',
    /^\d+\.\d+(\.\d+)?$/.test(String(a.version || '')), a.version);
});

check('la versión es la misma en los dos archivos (' + leido[0].version + ')',
  leido[0].version === leido[1].version,
  { gs: leido[0].version, html: leido[1].version });

console.log('\n═══ y el sello de compilación también ═══\n');

// APP_BUILD puede no existir todavía en uno de los dos; lo que no puede es
// existir en los dos y decir cosas distintas.
const conBuild = leido.filter(function (a) { return !!a.build; });
if (conBuild.length === 2) {
  check('el sello de compilación coincide (' + conBuild[0].build + ')',
    conBuild[0].build === conBuild[1].build,
    { gs: leido[0].build, html: leido[1].build });
} else {
  check('APP_BUILD está en los dos archivos o en ninguno',
    conBuild.length === 0,
    { gs: leido[0].build, html: leido[1].build });
}

console.log('\n═══ y esto sólo vale si de verdad lee los dos archivos ═══\n');

/* El guardia del guardia. Si mañana alguien renombra un archivo, lo de arriba
 * reventaría al leerlo — pero si en vez de reventar devolviera vacío, toda la
 * prueba se volvería verde sin comprobar nada. Decirlo explícitamente cuesta
 * dos líneas y quita la duda. */
check('son dos archivos distintos y los dos se leyeron',
  leido.length === 2 && leido[0].nombre !== leido[1].nombre &&
  !!leido[0].version && !!leido[1].version);

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Sube la versión en LOS DOS archivos, no en uno.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
