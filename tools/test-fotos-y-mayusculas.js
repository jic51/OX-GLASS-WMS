// LA FOTO TORCIDA, EL DOCUMENTO RECORTADO Y LAS DOS GRAFÍAS DEL MISMO NOMBRE.
//
// Tres cosas de la revisión del 2026-10-12, y las tres venían de los vídeos y
// capturas de Jose.
//
//   1. LA FOTO SE SUBÍA TORCIDA, y eso causaba DOS quejas que parecían
//      distintas: "sale en landscape" y "siempre hay una parte en blanco" en el
//      PDF. Un teléfono no gira los píxeles: guarda el mapa de bits como salió
//      del sensor —apaisado— y añade una marca EXIF. Google Docs no la respeta,
//      así que la foto entraba apaisada, y una foto apaisada en una hoja
//      vertical limita por el ancho y deja blanco abajo. Una causa, dos
//      síntomas.
//
//   2. LA VISTA PREVIA DEL PDF RECORTABA POR ARRIBA y el scroll no llegaba. La
//      cabecera no tenía la culpa: centrar con `align-items:center` algo más
//      alto que su caja empuja su principio fuera del área alcanzable.
//
//   3. «Window» y «WINDOW» se guardaban como dos cosas. La app ya ponía
//      mayúsculas en categoría, nombre y proyecto; en PO, GC, proveedor y
//      recibido-por, no.
//
// LO QUE ESTE ARCHIVO PROTEGE DE VERDAD: que el arreglo de la foto **no toque
// lo que no debe**. Esa puerta sube también PDFs, y un PDF que pase por un
// canvas deja de ser un PDF. Es el riesgo real de este cambio y es lo que más
// comprobaciones se lleva.
//
// Uso:  NODE_PATH="$(npm root -g)" CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome \
//       node tools/test-fotos-y-mayusculas.js

const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}
const sinCom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function fnSrc(src, name){
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) return '';
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  return '';
}

/* ════════════════════════════════════════════════════════════════════════════
   3 · MAYÚSCULAS AL GUARDAR (lo estático va primero; el navegador tarda)
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3 · una sola grafía por cosa ═══\n');
{
  const batch = sinCom(fnSrc(GS, 'addMovementsBatch_'));
  [['GC','GC'], ['PO','PO'], ['SUPPLIER','proveedor'], ['RESPONSIBLE','recibido por']].forEach(([campo, es]) => {
    check(`${es} se guarda en mayúsculas — «Amsco» un día y «AMSCO» otro dejaba ` +
          `dos proveedores donde hay uno`,
      new RegExp('row\\[AC\\.' + campo + '\\]\\s*=\\s*cleanDisplay_').test(batch),
      (batch.match(new RegExp('row\\[AC\\.' + campo + '\\][^;]*;')) || [])[0]);
  });

  // `cleanDisplay_` y NO `normalizeString`: la diferencia decide si un PO
  // sobrevive. Se comprueba sobre la función de verdad, no describiéndola.
  const clean = fnSrc(GS, 'cleanDisplay_');
  check('`cleanDisplay_` sube a mayúsculas y junta espacios…',
    /toUpperCase\(\)/.test(clean) && /replace\(\/\\s\+\/g, ' '\)/.test(clean), clean);
  check('…y NO borra guiones ni puntos, que es lo que salva un PO como «07-6329» ' +
        '(`normalizeString` sí los borra, y por eso no se usa aquí)',
    !/\[,\.'`\]/.test(clean) && !/replace\(\/-\/g/.test(clean), clean);

  check('categoría y nombre siguen pasando por cleanDisplay_ — ya estaban bien ' +
        'y el cambio no los toca',
    /row\[AC\.CATEGORY\]\s*=\s*cleanDisplay_/.test(batch) &&
    /row\[AC\.NAME\]\s*=\s*cleanDisplay_/.test(batch));
  check('y el proyecto sigue con normalizeString, que es más duro a propósito: ' +
        'tiene que casar con la lista de CONFIG',
    /normalizeString\(d\.project/.test(sinCom(GS)));
}

/* ════════════════════════════════════════════════════════════════════════════
   2 · LA VISTA PREVIA YA NO RECORTA POR ARRIBA
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2 · el documento se ve entero ═══\n');
{
  const abrir = sinCom(fnSrc(HTML, 'openMediaPreview'));
  /* Hasta `';` y salto de línea, no hasta el primer `;` a secas: el primero
   * está DENTRO del texto CSS («flex:1;»), así que la versión anterior cortaba
   * la declaración por la mitad y daba por ausente el `overflow:auto` de la
   * segunda línea. Falso negativo otra vez — la prueba en rojo con el código
   * bien. */
  const holder = (abrir.match(/holder\.style\.cssText =[\s\S]*?';\n/) || [''])[0];
  check('el contenedor del PDF ya no centra con `align-items` — centrar así algo ' +
        'más alto que su caja empuja su principio FUERA DEL ALCANCE del scroll',
    !/align-items:center/.test(holder), holder);
  check('...sigue pudiendo desplazarse', /overflow:auto/.test(holder), holder);
  check('y la imagen se centra con `margin:auto`, que centra mientras cabe y se ' +
        'rinde cuando no, en vez de recortar',
    /margin:auto/.test(abrir));
  check('sin `max-height:100%`, que dentro de un `flex:1` no tiene contra qué ' +
        'resolverse y encima tapaba la regla de la hoja de estilos',
    !/pimg\.style\.cssText[^;]*max-height:100%/.test(abrir));
}

/* ════════════════════════════════════════════════════════════════════════════
   1 · LA FOTO SE ENDEREZA — Y NO TOCA LO QUE NO DEBE
   ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 1 · la foto, y sobre todo lo que NO se toca ═══\n');
{
  const g = sinCom(fnSrc(HTML, 'getBase64'));
  check('se endereza en el NAVEGADOR, antes de subir — así vale para el PDF, la ' +
        'vista previa y la miniatura a la vez, no sólo para el PDF',
    /createImageBitmap/.test(g) && /imageOrientation/.test(g), g.slice(0, 200));
  check('lee la foto DOS veces —respetando la marca y sin ella— para saber si ' +
        'de verdad giró',
    /from-image/.test(g) && /'none'/.test(g));
  check('...y si no giró, NO la vuelve a codificar: recodificar una foto derecha ' +
        'es perder calidad a cambio de nada',
    /derecha\.width === cruda\.width && derecha\.height === cruda\.height/.test(g));
  check('libera los mapas de bits con close() — son memoria de verdad, no objetos ' +
        'que el recolector se lleve solo', /\.close\(\)/.test(g));

  // ── LO QUE MÁS IMPORTA DE ESTA PRUEBA ────────────────────────────────────
  check('SÓLO JPEG. Esta misma puerta sube PDFs (payload.docFile) y un PDF que ' +
        'pase por un canvas deja de ser un PDF',
    /image\/jpeg/.test(g) && /esJpeg/.test(g), g.slice(0, 400));
  check('...y si no es JPEG se devuelve el archivo CRUDO, sin tocar',
    /if \(!esJpeg[\s\S]{0,80}_leerBase64Crudo\(file\)/.test(g));
  check('...y también si el navegador no conoce createImageBitmap',
    /typeof createImageBitmap !== 'function'/.test(g));
  check('todo va dentro de try/catch con vuelta al original: una foto torcida es ' +
        'un fastidio, una foto que no se sube es trabajo perdido',
    /catch \(e\) \{ alCrudo\(\); \}/.test(g) && /\.catch\(alCrudo\)/.test(g));
  check('el lector crudo sigue existiendo y es el de antes, sin cambios',
    /function _leerBase64Crudo\(file\)[\s\S]{0,200}readAsDataURL/.test(HTML));
}

/* ── Y MEDIDO DE VERDAD EN UN NAVEGADOR ────────────────────────────────────
 *
 * Lo de arriba lee el código. Esto ejecuta `getBase64` con un JPEG que lleva
 * marca de orientación 6 («gírala 90°») y comprueba que lo que sale está
 * derecho. Sin esto, la prueba diría que el arreglo está escrito y no que
 * funciona — que es la diferencia que este proyecto ya ha pagado varias veces.
 */
(async () => {
  console.log('\n═══ 1b · ejecutado: una foto con marca de giro ═══\n');
  let navegador;
  try {
    const { chromium } = require('playwright');
    navegador = await chromium.launch({ executablePath: process.env.CHROME_PATH });
    const pagina = await navegador.newPage();
    await pagina.goto('file://' + path.join(ROOT, 'Index_v3_fixed.html'), { waitUntil: 'domcontentloaded' });

    const r = await pagina.evaluate(async () => {
      // Un JPEG 40×20 (apaisado) con EXIF Orientation=6: al respetarla se ve 20×40.
      // Se construye a mano para no depender de ningún archivo del repositorio.
      function jpegConGiro(w, h, orient){
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d');
        x.fillStyle = '#c00'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#fff'; x.fillRect(0, 0, w / 2, h / 2);
        const b64 = c.toDataURL('image/jpeg', 0.9).split(',')[1];
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        /* APP1/Exif mínimo con un solo campo: Orientation (0x0112) = orient.
         *
         * LA PRIMERA VERSIÓN DE ESTOS BYTES ESTABA MAL EN TRES SITIOS y el
         * navegador descartaba la marca entera, así que la prueba decía que el
         * arreglo no funcionaba cuando lo que no funcionaba era la prueba:
         *
         *   · El valor iba al revés. El TIFF es BIG-ENDIAN (MM) y un SHORT
         *     guarda el byte alto primero: `00 06`, no `06 00`. Escrito al
         *     revés, la orientación valía 1536 — un número que no existe, y
         *     Chrome ignora el campo entero sin quejarse.
         *   · El largo del APP1 decía 0x16 (22) y el bloque mide 34 (0x22):
         *     2 del largo + 6 de «Exif\0\0» + 8 de cabecera TIFF + 2 del
         *     número de campos + 12 del campo + 4 del puntero al siguiente IFD.
         *   · Faltaban esos últimos 4 bytes del puntero, que vale cero pero
         *     tiene que estar.
         *
         * Lo escribo entero porque el modo en que falló es el peligroso: la
         * prueba daba ROJO con el código bien. Un falso negativo manda a buscar
         * un fallo que no existe, igual que el «someone else» de las reservas.
         */
        const exif = [
          0xFF,0xE1, 0x00,0x22,
          0x45,0x78,0x69,0x66,0x00,0x00,              // "Exif\0\0"
          0x4D,0x4D, 0x00,0x2A, 0x00,0x00,0x00,0x08,  // MM · 42 · IFD0 en 8
          0x00,0x01,                                   // un campo
          0x01,0x12, 0x00,0x03, 0x00,0x00,0x00,0x01,   // Orientation · SHORT · 1
          0x00,orient, 0x00,0x00,                      // valor (byte alto primero)
          0x00,0x00,0x00,0x00                          // no hay IFD siguiente
        ];
        const out = new Uint8Array(2 + exif.length + (bytes.length - 2));
        out.set([0xFF,0xD8], 0);
        out.set(exif, 2);
        out.set(bytes.subarray(2), 2 + exif.length);
        return new File([out], 'f.jpg', { type: 'image/jpeg' });
      }
      async function medir(b64){
        const bm = await createImageBitmap(await (await fetch('data:image/jpeg;base64,' + b64)).blob(),
                                           { imageOrientation: 'none' });
        const d = { w: bm.width, h: bm.height }; bm.close(); return d;
      }
      const girada = jpegConGiro(40, 20, 6);   // marca dice "gírala"
      const derecha = jpegConGiro(40, 20, 1);  // marca dice "ya está bien"
      const pdf = new File([new Uint8Array([0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34])],
                           'd.pdf', { type: 'application/pdf' });

      const saleGirada  = await getBase64(girada);
      const saleDerecha = await getBase64(derecha);
      const salePdf     = await getBase64(pdf);
      return {
        girada:  await medir(saleGirada),
        derecha: await medir(saleDerecha),
        pdfIntacto: atob(salePdf).slice(0, 5) === '%PDF-',
        pdfLargo: atob(salePdf).length
      };
    });

    check(`una foto con marca de giro sale ENDEREZADA: entró 40×20 y sale ` +
          `${r.girada.w}×${r.girada.h}`, r.girada.w === 20 && r.girada.h === 40, r.girada);
    check('una que ya estaba derecha sale igual que entró, sin recodificar',
      r.derecha.w === 40 && r.derecha.h === 20, r.derecha);
    check('UN PDF SALE INTACTO: sigue empezando por «%PDF-» y conserva su largo',
      r.pdfIntacto && r.pdfLargo === 8, r);
  } catch (e) {
    check('se pudo abrir el navegador para medir', false, String(e.message).slice(0, 160));
  } finally {
    if (navegador) await navegador.close();
  }

  console.log('\n' + (fail ? '✗ ' + fail + ' FALLOS' : '✓ todo bien') + ' · ' + ok + ' comprobaciones\n');
  process.exit(fail ? 1 : 0);
})();
