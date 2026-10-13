// EL QR DE LA ETIQUETA — Y SE LEE CON UN LECTOR DE VERDAD.
//
// Jose, 2026-10-13: *"empieza con el QR."*
//
// ── POR QUÉ ESTA PRUEBA DECODIFICA EN VEZ DE COMPARAR DIBUJOS ───────────────
//
// Un QR mal hecho se dibuja exactamente igual de bonito que uno bueno. Cuadros
// negros, tres esquinas, aspecto perfecto — y el teléfono no lo lee. Comparar
// la matriz contra una matriz guardada diría «sale lo mismo que ayer», que es
// verdad y no sirve: si ayer ya estaba mal, hoy sigue mal y la prueba está en
// verde.
//
// Así que cada caso se CODIFICA con el nuestro y se DECODIFICA con `jsQR`, que
// es un lector independiente. Si el texto no da la vuelta entero, no escanea.
// Es la misma idea que medir el botón en un navegador en vez de leer la regla
// de 44 px en el CSS.
//
// ── LAS DOS COPIAS ──────────────────────────────────────────────────────────
//
// El codificador vive en `tools/qr-fuente.js` Y copiado dentro de
// `Index_v3_fixed.html`, porque la app es un solo archivo que se instala
// pegando. Dos copias que tienen que coincidir sin que nada lo obligue es el
// patrón que este repositorio lleva diez veces contadas — así que aquí sí hay
// algo que lo obliga: esta prueba las compara carácter a carácter.
//
// Uso:  node tools/test-qr.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), path = require('path');
const jsQR = require('jsqr');

const RAIZ   = path.join(__dirname, '..');
const HTML   = fs.readFileSync(process.argv[2] || path.join(RAIZ, 'Index_v3_fixed.html'), 'utf8');
const FUENTE = fs.readFileSync(path.join(RAIZ, 'tools', 'qr-fuente.js'), 'utf8');
const { qrGenerar } = require('./qr-fuente.js');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FALLA ' + label + (extra === undefined ? '' : '  → ' + JSON.stringify(extra))); }
}

/* ══ 1 · LAS DOS COPIAS SON LA MISMA ═══════════════════════════════════════ */

console.log('\n═══ 1. EL CODIFICADOR DE LA APP ES EL QUE SE PRUEBA AQUÍ ═══\n');

/* La fuente lleva al final un `module.exports` para poder probarla en Node.
 * Eso no viaja a la app —sería código muerto— así que la comparación es contra
 * la fuente SIN ese bloque. Es la única diferencia permitida, y está escrita. */
const corte = FUENTE.indexOf("if (typeof module !== 'undefined'");
check('la fuente lleva su bloque de exportación para Node', corte !== -1);
const esperado = FUENTE.slice(0, corte).trimEnd();

check('el codificador está dentro de la app', HTML.indexOf('function qrGenerar(') !== -1);
check('...y es IDÉNTICO a `tools/qr-fuente.js`, carácter a carácter — ' +
      'dos copias que tienen que coincidir necesitan algo que lo obligue',
  HTML.indexOf(esperado) !== -1);
check('...y el `module.exports` NO viajó a la app: sería código muerto',
  HTML.indexOf('module.exports = { qrGenerar') === -1);

/* ══ 2 · LO QUE IMPORTA: QUE SE LEA ════════════════════════════════════════ */

console.log('\n═══ 2. CADA CÓDIGO, LEÍDO POR UN LECTOR INDEPENDIENTE ═══\n');

function daLaVuelta(txt, escala) {
  escala = escala || 4;
  const q = qrGenerar(txt);
  const borde = 4, n = q.n, total = (n + borde * 2) * escala;
  const data = new Uint8ClampedArray(total * total * 4).fill(255);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (!q.m[y][x]) continue;
    for (let dy = 0; dy < escala; dy++) for (let dx = 0; dx < escala; dx++) {
      const px = ((y + borde) * escala + dy) * total + ((x + borde) * escala + dx);
      data[px * 4] = 0; data[px * 4 + 1] = 0; data[px * 4 + 2] = 0;
    }
  }
  const r = jsQR(data, total, total);
  return { leido: r ? r.data : null, version: q.version, mascara: q.mascara };
}

/* Los casos salen de datos de verdad de Jose, no de cadenas inventadas: los
 * nombres largos y las ubicaciones raras son lo que rompe un codificador. */
const CASOS = [
  ['el caso corriente',            'ACP1\nWINDOW\nGLASS\nA1A'],
  ['un solo carácter',             'A'],
  ['el del vídeo del 13/10',       'ACP1\nMIRRORS\nMIRRORS 4 CONSTRUCTIONS\nP'],
  ['nombre largo de verdad',       'ACP1\nWINDOW\nTEMPERED LAMINATED LOW-E 1/4 CLEAR GLASS PANEL\nWINDOW WAREHOUSE'],
  ['con id de movimiento',         'ACP1\nALUMINUM\nDOOR SCREEN 36x80\nLGI OQM 184\nMOV-1760000000000'],
  ['una ubicación de las de Jose', 'ACP1\nGLASS\nPANEL\nPAT BMW 3'],
  ['sin ubicación asignada',       'ACP1\nWINDOW\nGLASS\n'],
  ['el límite de lo que cabe',     'ACP1\n' + 'X'.repeat(200)],
  /* Dos puntos DENTRO del nombre: es exactamente por lo que el formato va por
   * líneas y no por separador. Si esto se leyera partido, el lector del día de
   * mañana entendería otra cosa. */
  ['dos puntos en el nombre',      'ACP1\nWINDOW\nPANEL 1/4": CLEAR\nB2B'],
  ['barras del MatID en el nombre','ACP1\nWINDOW\nA|||B\nC1A']
];

for (const [que, txt] of CASOS) {
  const r = daLaVuelta(txt);
  check(que + ' (v' + r.version + ', máscara ' + r.mascara + ') se lee entero',
    r.leido === txt, { esperado: txt.slice(0, 50), leido: (r.leido || '').slice(0, 50) });
}

/* Y a la escala de verdad. Una etiqueta de 4"×6" imprime el QR a 30 mm; a
 * 203 ppp eso son unos 240 píxeles de lado. Si sólo se probara a escala 4 se
 * estaría probando un cartel, no una etiqueta. */
console.log('\n═══ 3. AL TAMAÑO AL QUE SE IMPRIME ═══\n');
{
  const txt = 'ACP1\nWINDOW\nTEMPERED LAMINATED LOW-E 1/4 CLEAR GLASS PANEL\nWINDOW WAREHOUSE';
  const q = qrGenerar(txt);
  /* 30 mm a 203 ppp ≈ 240 px; dividido entre los módulos más la zona tranquila
   * da los píxeles por módulo que saldrán del cabezal térmico. */
  const porModulo = Math.floor(240 / (q.n + 8));
  check('a 30 mm y 203 ppp caben ' + porModulo + ' puntos por módulo ' +
        '(por debajo de 3 un lector empieza a fallar)', porModulo >= 3, { porModulo, n: q.n });
  const r = daLaVuelta(txt, porModulo);
  check('...y a esa escala se sigue leyendo entero', r.leido === txt);
}

/* ══ 4 · LO QUE SE CODIFICA, Y QUE NO SE CAIGA LA ETIQUETA ════════════════ */

console.log('\n═══ 4. EL CONTENIDO Y EL SEGURO ═══\n');

const mFn = HTML.match(/function _labelQrTexto\(r\)\{[\s\S]*?\n\}/);
check('`_labelQrTexto` existe en la app', !!mFn);
if (mFn) {
  const f = mFn[0];
  check("...y la primera línea es la VERSIÓN del formato ('ACP1'), para que " +
        'una etiqueta pegada hace dos años se siga sabiendo leer',
    /'ACP1'/.test(f));
  check('...y une por salto de línea, que es el único separador que no puede ' +
        'aparecer dentro de un campo de una sola línea',
    /join\('\\\\n'\)/.test(f) || /join\('\\n'\)/.test(f));
}

const mQr = HTML.match(/function _labelQr\(r\)\{[\s\S]*?\n\}/);
check('`_labelQr` existe', !!mQr);
if (mQr) {
  check('...y lleva un try: si el código fallara, la etiqueta sale SIN él en ' +
        'vez de no salir. El papel con el nombre y el estante ya sirve',
    /try\s*\{/.test(mQr[0]) && /catch/.test(mQr[0]));
  check('...y en el fallo devuelve vacío, no un texto de error impreso',
    /return '';/.test(mQr[0]));
}

/* Se mira DENTRO de `_labelHtml` y no en todo el archivo. La primera versión
 * buscaba el cartel en el HTML entero y se puso roja en cuanto la nota de la
 * v12.66 lo CITÓ para contar que se había ido —«el recuadro de puntos que
 * decía QR / barcode es ahora un código de verdad»—. Otra vez medir la letra
 * en vez de la intención: lo que importa es que la ETIQUETA no lo imprima, no
 * que la palabra no exista en ninguna parte. */
const lblHtml = (HTML.match(/function _labelHtml\(r\)\{[\s\S]*?\n\}/) || [''])[0];
check('`_labelHtml` existe', !!lblHtml);
check('la etiqueta ya no imprime el cartel «QR / barcode»',
  lblHtml.indexOf('QR / barcode') === -1);
check('...sino el código de verdad', /_labelQr\(r\)/.test(lblHtml));

console.log('\n' + (fail ? '✗ ' + fail + ' fallos · ' : '✓ todo bien · ') + (ok + fail) + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
