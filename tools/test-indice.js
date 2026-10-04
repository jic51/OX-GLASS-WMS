// EL ÍNDICE DEL ARCHIVO, Y LO QUE HACE QUE NO MIENTA.
//
// Jose, 2026-10-03: *"una app profesional no es un solo bloque, ¿no es mejor
// dividir la app en bloques y que cada uno tenga su propio archivo?"*
//
// La respuesta larga está en docs/UN-ARCHIVO-O-MUCHOS.md y es "todavía no, y
// cuando toque, con un paso de construcción". Lo que sí se podía hacer hoy, y
// cuesta una hora, es que las 13.279 líneas digan al principio qué hay dentro.
//
// ── POR QUÉ ESTO ES UNA PRUEBA Y NO UN COMENTARIO ───────────────────────────
//
// Un índice escrito a mano es, exactamente, el fallo que este código lleva
// meses cazándose a sí mismo: DOS LISTAS QUE TIENEN QUE COINCIDIR SIN NADA QUE
// LO OBLIGUE. Ya pasó con la lista de funciones públicas del encabezado (cinco
// nombres reachable que la lista no admitía, dos versiones), y con la lista de
// pruebas de la suite (de ahí salió check-suite.js).
//
// Un índice que miente es peor que no tener índice: no tener índice obliga a
// buscar, y tenerlo equivocado hace creer que ya se ha buscado.
//
// Así que el índice no se escribe: se GENERA de las propias cabeceras de
// sección del archivo, y esta prueba lo vuelve a generar y lo compara. Si se
// añade, se quita, se renombra o se mueve una sección y el índice no lo
// refleja, esto falla.
//
// Uso:
//   node tools/test-indice.js            comprueba (falla si no coincide)
//   node tools/test-indice.js --stamp    reescribe el índice en el archivo

const fs   = require('fs');
const path = require('path');

const RAIZ    = path.join(__dirname, '..');
const ARCHIVO = path.join(RAIZ, 'Code_v3_fixed.gs');

const INICIO = '// ╔══ ÍNDICE ══ generado por tools/test-indice.js — no editar a mano ══════════╗';
const FIN    = '// ╚════════════════════════════════════════════════════════════════════════════╝';

/** Las cabeceras de sección del archivo, en orden y tal cual se escriben. */
function secciones(src) {
  const out = [];
  src.split('\n').forEach((linea, i) => {
    const m = /^\/\/ ─── (.+?)\s*─+\s*$/.exec(linea);
    if (m) out.push({ nombre: m[1].trim(), linea: i + 1 });
  });
  return out;
}

/* EL ÍNDICE NO LLEVA NÚMEROS DE LÍNEA, Y ES A PROPÓSITO.
 *
 * Un número de línea caduca en el primer cambio y entonces el índice vuelve a
 * mentir — sólo que ahora miente de una forma que la prueba tendría que
 * reescribir en cada commit, y una prueba que falla por motivos normales deja
 * de leerse. Lo que se busca con Ctrl+F es el TEXTO, que no se mueve. */
function construir(secs) {
  const ancho = String(secs.length).length;
  const lineas = [
    INICIO,
    '//',
    '//  Las ' + secs.length + ' secciones de este archivo, en el orden en que están.',
    '//  Para saltar a una: Ctrl+F con su texto, tal cual aparece aquí.',
    '//',
    '//  NO SE EDITA A MANO. Lo genera (y lo comprueba) tools/test-indice.js a',
    '//  partir de las propias cabeceras del archivo — un índice escrito a mano es',
    '//  otra lista que tiene que coincidir con algo sin que nada lo obligue, y de',
    '//  esas este código ya se ha cazado dos.',
    '//'
  ];
  secs.forEach((s, i) => {
    lineas.push('//  ' + String(i + 1).padStart(ancho, ' ') + '  ' + s.nombre);
  });
  lineas.push('//');
  lineas.push(FIN);
  return lineas.join('\n');
}

/** Dónde va el índice: justo después del banner de cabecera del archivo. */
function reemplazar(src, bloque) {
  const i = src.indexOf(INICIO);
  if (i !== -1) {
    const j = src.indexOf(FIN, i);
    if (j === -1) throw new Error('El índice está abierto y sin cerrar — arréglalo a mano.');
    return src.slice(0, i) + bloque + src.slice(j + FIN.length);
  }
  // Primera vez: después del banner de las primeras líneas, antes de la regla
  // de nombres — que se queda arriba del todo porque es una frontera de
  // seguridad y tiene que seguir leyéndose antes que nada más.
  const ancla = '\n\n// ⚠️ NAMING RULE';
  const k = src.indexOf(ancla);
  if (k === -1) throw new Error('No encuentro dónde poner el índice (falta el banner de la regla de nombres).');
  return src.slice(0, k) + '\n\n' + bloque + src.slice(k);
}

const src  = fs.readFileSync(ARCHIVO, 'utf8');
const secs = secciones(src);

if (process.argv.indexOf('--stamp') !== -1) {
  const nuevo = reemplazar(src, construir(secs));
  fs.writeFileSync(ARCHIVO, nuevo, 'utf8');
  console.log('\n  índice escrito: ' + secs.length + ' secciones\n');
  console.log('  recuerda: node tools/build-fingerprint.js --stamp\n');
  process.exit(0);
}

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

console.log('\n═══ El índice dice lo que hay dentro ═══\n');

check('hay un índice', src.indexOf(INICIO) !== -1 && src.indexOf(FIN) !== -1);
check('y el archivo tiene secciones que indexar', secs.length > 0, secs.length);

/* LA COMPROBACIÓN DE VERDAD: regenerarlo y comparar carácter a carácter. No
 * "están todos los nombres" —eso pasaría con el orden cambiado y con secciones
 * de más— sino el bloque entero igual. */
const esperado = construir(secs);
const i = src.indexOf(INICIO), j = src.indexOf(FIN);
const actual = (i !== -1 && j !== -1) ? src.slice(i, j + FIN.length) : '';

if (actual !== esperado) {
  const a = actual.split('\n'), e = esperado.split('\n');
  const primera = a.findIndex((l, n) => l !== e[n]);
  check('EL ÍNDICE COINCIDE CON LAS SECCIONES DEL ARCHIVO — si esto falla, ' +
        'corre: node tools/test-indice.js --stamp', false,
        { linea: primera + 1, dice: a[primera], deberia: e[primera],
          secciones: secs.length, enElIndice: a.filter(l => /^\/\/\s+\d+\s/.test(l)).length });
} else {
  check('EL ÍNDICE COINCIDE CON LAS SECCIONES DEL ARCHIVO, una por una y en orden',
        true);
}

/* Y QUE NO SE REPITAN LOS NOMBRES: dos secciones llamadas igual hacen que el
 * Ctrl+F del índice lleve a la primera, que puede no ser la que se busca. Es el
 * único modo en que un índice correcto sigue sin servir. */
const vistos = {}, repes = [];
secs.forEach(s => {
  if (vistos[s.nombre]) repes.push(s.nombre);
  vistos[s.nombre] = true;
});
check('ninguna sección se llama igual que otra — si no, el Ctrl+F lleva a la ' +
      'que no es', repes.length === 0, repes);

/* El índice va arriba, no en medio: un índice que aparece en la línea nueve mil
 * no lo lee nadie, porque para entonces ya has encontrado lo que buscabas de
 * otra manera. */
check('está en la cabecera del archivo, no enterrado',
      src.indexOf(INICIO) < 4000, src.indexOf(INICIO));

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
