// EL ARCHIVO PARA PEGAR — EL MISMO PRODUCTO, SIN LA PROSA.
//
// 15/10/2026. La consola de Jose, por fin:
//
//   Uncaught SyntaxError: Failed to execute 'write' on 'Document':
//   Invalid or unexpected token (at VM429:19174:14)
//       at eu (…mae_html_…_user.js:352:101)
//
// Eso es Apps Script escribiendo la página entera con `document.write`, y la
// escritura reventando con un token inválido. Por eso la pantalla estaba EN
// BLANCO del todo: no llegó a existir ni la pantalla de carga.
//
// ── LO QUE SE DESCARTÓ ANTES DE ESCRIBIR ESTO ──────────────────────────────
//
// No es el código. Medido, no supuesto:
//   · El bloque grande se parsea entero con V8 sin un solo error.
//   · El archivo carga en Chromium y arranca limpio (`test-vigilante-arranque`).
//   · No hay caracteres de control, ni U+2028/U+2029, ni BOM.
//   · Entre la v12.68 (que funciona) y la v12.69 (que no) el juego de
//     caracteres no-ASCII es IDÉNTICO: 122 distintos en las dos. No entró
//     ningún carácter raro.
//   · `doGet` usa `createHtmlOutputFromFile`, sin plantillas: no hay
//     scriptlets `<? ?>` que puedan generar nada mal. El archivo no lleva `<?`.
//
// Lo que sí cambió entre la que funciona y la que no es el TAMAÑO, y poco:
// 1.391 MB → 1.395 MB. Estamos en el filo de algo, y lo que hay en el filo es
// el camino por el que el archivo llega a Apps Script: 27.600 líneas pegadas a
// mano en el editor del navegador. Un pegado que se corta por la mitad produce
// exactamente este error —un token partido— y produce la pantalla en blanco.
//
// No lo puedo demostrar desde aquí, y conviene decirlo así en vez de vender una
// certeza: lo que hace esta herramienta es QUITAR LA VARIABLE. Si con el
// archivo pequeño arranca, era el tamaño del pegado. Si falla igual, el tamaño
// queda descartado y sabemos más que antes. Las dos respuestas sirven.
//
// ── QUÉ QUITA, Y POR QUÉ NO ES UN MINIFICADOR ──────────────────────────────
//
// Sólo los comentarios. Ni renombra, ni reordena, ni junta líneas, ni toca una
// cadena. El 42% de este archivo es prosa en español —y tiene que seguir
// siéndolo, porque es la memoria del proyecto: por qué cada cosa está como
// está, qué fallo la puso ahí y qué pasa si alguien la "arregla"—. Lo que no
// tiene sentido es que esa memoria viaje a Apps Script, donde nadie la lee y
// sólo ocupa sitio en el camino más frágil que tiene este proyecto.
//
// Un minificador haría el archivo aún más pequeño y sería la decisión
// equivocada: el día que algo falle en producción, lo que Jose puede mandarme
// es lo que ve en su consola. Con los nombres cambiados, el número de línea de
// un error no lleva a ninguna parte. Los comentarios se pueden perder sin
// perder nada; los nombres y las líneas, no.
//
// ── LO QUE SE COMPRUEBA ANTES DE DAR EL ARCHIVO POR BUENO ──────────────────
//
// Quitar comentarios con expresiones regulares es la forma clásica de romper
// un archivo en silencio: `'http://x'` lleva un `//` dentro, y una expresión
// regular puede llevar un `/*`. Aquí se usa `acorn`, que es un parser de
// verdad y sabe distinguir un comentario de un trozo de texto que lo parece.
//
// Y después se vuelve a parsear el resultado. Si el archivo recortado no
// compila, no se escribe nada: más vale no dar archivo que dar uno roto, que
// es justo el problema que esto intenta resolver.
//
// Uso:  node tools/build-paste.js            → escribe los dos en pegar/
//       node tools/build-paste.js --check    → sólo informa, no escribe

const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const RAIZ = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, 'pegar');
const SOLO_MIRAR = process.argv.includes('--check');

function kb(n) { return (n / 1024).toFixed(0) + ' KB'; }
function mb(n) { return (n / 1048576).toFixed(3) + ' MB'; }

/* Los comentarios de un trozo de JavaScript, localizados por un parser. Acorn
 * los entrega con sus posiciones exactas; recortarlos de atrás hacia delante
 * evita que cada corte mueva los siguientes. */
function sinComentariosJS(src, nombre) {
  const comentarios = [];
  try {
    acorn.parse(src, {
      ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true,
      onComment: (bloque, texto, inicio, fin) => comentarios.push([inicio, fin])
    });
  } catch (e) {
    throw new Error(nombre + ' no se puede parsear tal cual: ' + e.message);
  }
  let out = src;
  for (let i = comentarios.length - 1; i >= 0; i--) {
    const [a, b] = comentarios[i];
    /* El comentario se sustituye por un salto de línea cuando ocupaba líneas
     * enteras, y por nada cuando iba al final de una con código. Así el
     * archivo recortado conserva la FORMA —una sentencia por línea— y un
     * número de línea de la consola de Jose sigue cayendo cerca de su sitio. */
    const antes = out.slice(0, a), despues = out.slice(b);
    const soloEnSuLinea = /(^|\n)[ \t]*$/.test(antes) && /^[ \t]*(\n|$)/.test(despues);
    out = antes + (soloEnSuLinea ? '' : ' ') + despues;
  }
  /* Las líneas que quedan vacías del todo se van. Las que tenían código se
   * quedan donde estaban. */
  return out.replace(/^[ \t]*\n/gm, '');
}

/* Los comentarios de CSS, con una máquina de estados mínima que respeta las
 * comillas: `content:"/*"` existe y no es el principio de nada. */
function sinComentariosCSS(src) {
  let out = '', i = 0, comilla = null;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (comilla) {
      out += c;
      if (c === '\\') { out += src[i + 1] || ''; i += 2; continue; }
      if (c === comilla) comilla = null;
      i++; continue;
    }
    if (c === '"' || c === "'") { comilla = c; out += c; i++; continue; }
    if (c === '/' && d === '*') {
      const fin = src.indexOf('*/', i + 2);
      i = fin < 0 ? src.length : fin + 2;
      continue;
    }
    out += c; i++;
  }
  return out.replace(/^[ \t]*\n/gm, '');
}

/* Los comentarios de HTML. Se hace FUERA de <script> y <style>, porque dentro
 * un `<!--` sería texto de un programa y no un comentario del documento. Este
 * archivo no tiene ninguno dentro (comprobado), pero la herramienta no puede
 * depender de que eso siga siendo verdad el mes que viene. */
function limpiarHtml(html) {
  const trozos = [];
  const re = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let ultimo = 0, m;
  while ((m = re.exec(html))) {
    trozos.push({ texto: html.slice(ultimo, m.index), tipo: 'html' });
    trozos.push({ texto: m[0], tipo: m[1].toLowerCase() });
    ultimo = m.index + m[0].length;
  }
  trozos.push({ texto: html.slice(ultimo), tipo: 'html' });

  return trozos.map(t => {
    if (t.tipo === 'html') return t.texto.replace(/<!--[\s\S]*?-->[ \t]*\n?/g, '');
    const abre = t.texto.indexOf('>') + 1;
    const cierra = t.texto.lastIndexOf('</');
    const cabeza = t.texto.slice(0, abre), cuerpo = t.texto.slice(abre, cierra),
          cola = t.texto.slice(cierra);
    if (t.tipo === 'style') return cabeza + sinComentariosCSS(cuerpo) + cola;
    if (/\bsrc\s*=/i.test(cabeza)) return t.texto;          // externo: sin cuerpo
    return cabeza + sinComentariosJS(cuerpo, 'un bloque <script>') + cola;
  }).join('');
}

/* ── Y LA COMPROBACIÓN, que es lo que hace esto fiable ───────────────────── */
function verificar(html, nombre) {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, n = 0;
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    n++;
    try { acorn.parse(m[2], { ecmaVersion: 2022, sourceType: 'script' }); }
    catch (e) { throw new Error(nombre + ': el bloque ' + n + ' ya no compila — ' + e.message); }
  }
  return n;
}

/* Lo que NO puede cambiar: la versión y el sello. Los dos archivos se comparan
 * entre ellos dentro de la app, y si el recorte tocara uno de los dos, la app
 * avisaría de que no son del mismo juego — con razón. */
function sello(src) {
  return {
    ver:   (src.match(/var APP_VERSION = '([\d.]+)'/) || [])[1],
    build: (src.match(/var APP_BUILD = '([^']*)'/) || [])[1]
  };
}

const trabajos = [
  { origen: 'Index_v3_fixed.html', destino: 'Index_v3_fixed.html', tipo: 'html' },
  { origen: 'Code_v3_fixed.gs',    destino: 'Code_v3_fixed.gs',    tipo: 'js'   }
];

console.log('');
let totalAntes = 0, totalDespues = 0, problemas = 0;

for (const t of trabajos) {
  const src = fs.readFileSync(path.join(RAIZ, t.origen), 'utf8');
  const antes = Buffer.byteLength(src);
  let out;
  try {
    out = t.tipo === 'html' ? limpiarHtml(src) : sinComentariosJS(src, t.origen);
    if (t.tipo === 'html') verificar(out, t.origen);
    else acorn.parse(out, { ecmaVersion: 2022, sourceType: 'script' });
  } catch (e) {
    console.log('  FALLA ' + t.origen + ' → ' + e.message);
    problemas++;
    continue;
  }

  const a = sello(src), b = sello(out);
  if (a.ver !== b.ver || a.build !== b.build) {
    console.log('  FALLA ' + t.origen + ' → el recorte cambió la versión o el sello');
    problemas++;
    continue;
  }

  const despues = Buffer.byteLength(out);
  totalAntes += antes; totalDespues += despues;
  console.log('  ' + t.origen.padEnd(22) + kb(antes).padStart(9) + ' → ' +
    kb(despues).padStart(9) + '   (' +
    (100 - despues * 100 / antes).toFixed(0) + '% menos)   v' + a.ver + ' · ' + a.build);

  if (!SOLO_MIRAR) {
    fs.mkdirSync(SALIDA, { recursive: true });
    fs.writeFileSync(path.join(SALIDA, t.destino), out);
  }
}

console.log('');
console.log('  total            ' + mb(totalAntes) + ' → ' + mb(totalDespues) +
  '   (' + (100 - totalDespues * 100 / totalAntes).toFixed(0) + '% menos que pegar)');
console.log('');

if (problemas) {
  console.log('  ✗ no se escribió nada: más vale ningún archivo que uno roto\n');
  process.exit(1);
}
if (SOLO_MIRAR) {
  console.log('  (--check: no se escribió nada)\n');
} else {
  console.log('  escritos en pegar/ — mismo producto, misma versión, mismo sello.');
  console.log('  Los del repositorio NO se tocan: la prosa se queda donde se lee.\n');
}
