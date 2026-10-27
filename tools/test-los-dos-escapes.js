// HAY DOS FUNCIONES QUE ESCAPAN HTML, UNA POR ARCHIVO. QUE HAGAN LO MISMO.
//
// Del análisis estructural (27/10), sección «lo que no es un problema»:
//
//     _he            vive en Index_v3_fixed.html   (el navegador)
//     escapeHtmlSrv_ vive en Code_v3_fixed.gs      (el servidor)
//
// Hacen lo mismo en dos sitios que NO SE VEN. Y eso no es un fallo que haya
// que arreglar compartiendo código: no se puede: son dos entornos distintos.
// Repetirlo es lo correcto. Lo que faltaba era que algo exigiera que las dos
// copias escapen EXACTAMENTE lo mismo.
//
// ── POR QUÉ ESTO NO ES UNA MANÍA ────────────────────────────────────────────
//
// `escapeHtmlSrv_` nació en la v13.0, para el hallazgo H-05, y nació copiando a
// `_he`. A partir de hoy son dos funciones con vidas separadas: alguien puede
// añadirle un carácter a una y no a la otra, y el resultado sería un sitio que
// escapa menos que el otro SIN QUE NADA LO DIGA. Eso es, otra vez, DOS COSAS
// QUE TIENEN QUE COINCIDIR SIN QUE NADA LO OBLIGUE — y de las caras, porque la
// que se quede corta es un agujero de inyección.
//
// ── CÓMO LO COMPRUEBA, Y POR QUÉ ASÍ ────────────────────────────────────────
//
// No compara los dos textos fuente: compararlos exigiría que estuvieran
// escritos igual, que no lo están ni tienen por qué. Saca las dos funciones de
// sus archivos, LAS EJECUTA, y compara lo que devuelven sobre una batería de
// entradas. Lo que importa es el comportamiento, no la redacción.
//
// NO entra aquí `_escAttr`, que escapa tres y no cuatro: le falta `>` A
// PROPÓSITO, porque dentro de un atributo un `>` es un carácter normal. Esa
// diferencia está razonada y no debe hacer fallar nada.
//
// Uso:  node tools/test-los-dos-escapes.js

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

/** Saca una función de primer nivel de un archivo, de su cabecera al `}` del
 *  margen. Las dos están escritas así; si alguna dejara de estarlo, esto
 *  devuelve null y la prueba falla en vez de pasar de largo. */
function sacarFuncion(src, nombre) {
  const lineas = src.split('\n');
  const abre = new RegExp('^function\\s+' + nombre.replace(/[$]/g, '\\$') + '\\s*\\(');
  for (let i = 0; i < lineas.length; i++) {
    if (!abre.test(lineas[i])) continue;
    for (let j = i + 1; j < lineas.length && j < i + 60; j++) {
      if (/^\}/.test(lineas[j])) return lineas.slice(i, j + 1).join('\n');
    }
    return null;   // se abrió y no se cerró dentro de un margen razonable
  }
  return null;
}

const gs   = fs.readFileSync(path.join(RAIZ, 'Code_v3_fixed.gs'),    'utf8');
const html = fs.readFileSync(path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');

const fuenteServidor  = sacarFuncion(gs,   'escapeHtmlSrv_');
const fuenteNavegador = sacarFuncion(html, '_he');

console.log('\n═══ las dos existen y se pueden ejecutar ═══\n');

check('escapeHtmlSrv_ se encontró en Code_v3_fixed.gs',    !!fuenteServidor);
check('_he se encontró en Index_v3_fixed.html',            !!fuenteNavegador);

if (!fuenteServidor || !fuenteNavegador) {
  console.error('\nFALLÓ: no se pudo extraer alguna de las dos funciones.\n' +
                '  Si se renombró o cambió de forma, actualiza esta prueba —\n' +
                '  no la borres: lo que vigila sigue haciendo falta.\n');
  process.exit(1);
}

// eslint-disable-next-line no-new-func
const servidor  = new Function(fuenteServidor  + '\nreturn escapeHtmlSrv_;')();
// eslint-disable-next-line no-new-func
const navegador = new Function(fuenteNavegador + '\nreturn _he;')();

console.log('\n═══ y devuelven lo mismo ═══\n');

/* La batería. Los cuatro caracteres por separado, los cuatro juntos, el orden
 * que importa (`&` antes que el resto, o se escapa dos veces), lo que no debe
 * tocarse, y los vacíos — que es donde las dos copias más fácilmente se
 * separan, porque una puede devolver '' y la otra 'null'. */
const ENTRADAS = [
  '', 'normal text', 'Aluminio 2mm',
  '&', '<', '>', '"',
  '&amp;', '&quot;', '&lt;script&gt;',
  '<script>alert(1)</script>',
  'a & b < c > d " e',
  'Rack "B-12" & <proyecto>',
  "comilla simple ' sin tocar",
  'acentos áéíóú ñ Ü',
  '0', '  espacios  ', '\n salto \n',
  null, undefined, 0, 1250, false, true
];

ENTRADAS.forEach(function (entrada) {
  const a = servidor(entrada);
  const b = navegador(entrada);
  const etq = 'mismo resultado para ' + JSON.stringify(entrada);
  check(etq, a === b, a === b ? undefined : { servidor: a, navegador: b });
});

console.log('\n═══ y escapan los cuatro de verdad ═══\n');

/* Que coincidan no basta: dos funciones que no escapan nada también coinciden.
 * Esto es lo que impide que esta prueba se quede verde sobre dos copias rotas
 * iguales. */
[['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;']].forEach(function (p) {
  check('las dos convierten ' + JSON.stringify(p[0]) + ' en ' + p[1],
    servidor(p[0]) === p[1] && navegador(p[0]) === p[1],
    { servidor: servidor(p[0]), navegador: navegador(p[0]) });
});

check('un & se escapa UNA vez, no dos (el orden importa)',
  servidor('<') === '&lt;' && navegador('<') === '&lt;' &&
  servidor('&lt;') === '&amp;lt;' && navegador('&lt;') === '&amp;lt;',
  { servidor: servidor('&lt;'), navegador: navegador('&lt;') });

if (fallos.length) {
  console.error('\nFALLÓ:\n  ' + fallos.join('\n  ') + '\n');
  console.error('  Las dos copias se separaron. La que escape menos es un agujero.\n');
  process.exit(1);
}
console.log('\n✓ todo bien · ' + ok + ' comprobaciones\n');
