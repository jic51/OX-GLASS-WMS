// LA IMAGEN QUE SALE AL PEGAR EL ENLACE.
//
// Jose manda `www.acopio.net` por WhatsApp y por correo, y hasta hoy llegaba
// como **un recuadro gris con la dirección dentro**. Esa es, ahora mismo, la
// forma principal por la que alguien llega al sitio — más que cualquier
// búsqueda. Así que de las veinte comprobaciones de SEO, ésta es la que más
// cambia lo que ve una persona de verdad, y no tiene nada que ver con Google.
//
// ── POR QUÉ SE DIBUJA CON EL NAVEGADOR Y NO CON UNA LIBRERÍA DE IMÁGENES ────
//
// Porque la marca es tipográfica. Acopio se escribe en **Archivo**, y el texto
// de la página en **Inter**; las dos vienen de Google Fonts. Dibujar esto con
// una librería de imágenes obligaría a usar la fuente que hubiera en la máquina
// —que no es ninguna de las dos—, y la tarjeta que ve un cliente al recibir el
// enlace tendría una tipografía que no es la del producto. Una tarjeta de marca
// con la letra equivocada es peor que no tenerla.
//
// El navegador ya está aquí: lo usamos para las pruebas de pantalla. Carga las
// mismas fuentes, lee los mismos colores, y lo que sale es exactamente lo que
// saldría en la página.
//
// ── Y POR QUÉ ES UN PROGRAMA Y NO UN PNG GUARDADO A MANO ───────────────────
//
// Porque un PNG guardado a mano es un fichero que nadie sabe rehacer. El día
// que cambie el color de la marca, o la frase, o el logo, alguien tiene que
// acordarse de que existe esta imagen y de con qué se hizo. Así es un comando.
//
// Uso:  node tools/build-og-image.js
//       (escribe landing/assets/og.jpg, que build-site.js publica como /og.jpg)

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
/* JPEG y no PNG, medido: el mismo dibujo pesa 485 KB en PNG y 123 KB en JPEG
 * de calidad 90. Es un fondo con degradado y texto grande —lo que un JPEG hace
 * bien— y lo que hay al otro lado es un teléfono en una bodega esperando a que
 * cargue una vista previa. No hace falta transparencia: la tarjeta se ve
 * siempre sobre sí misma. */
/* DOS TARJETAS, UNA POR IDIOMA.
 *
 * Jose, 2026-10-06: *"¿sale una imagen en español o siempre está en inglés?"*
 * Siempre estaba en inglés, y no por descuido: la tarjeta la dibuja WhatsApp
 * leyendo el HTML tal cual sale del servidor, SIN EJECUTAR NADA, así que el
 * conmutador de idioma de la página no puede alcanzarla. Una dirección, una
 * tarjeta.
 *
 * La solución no es técnica, es de direcciones: `/` en inglés y `/es/` en
 * español, cada una con la suya. Esto dibuja las dos. */
const IDIOMAS = [
  { f: 'landing/assets/og.jpg',    lang: 'en',
    h1: "Know what's on the shelf without going to look.",
    p:  'Your Google Sheet, turned into a real warehouse system.' },
  { f: 'landing/assets/og-es.jpg', lang: 'es',
    h1: 'Saber qué hay en la estantería sin ir a mirar.',
    p:  'Tu hoja de Google, convertida en un sistema de almacén de verdad.' }
];

/* ── LAS FUENTES VAN DENTRO DE LA PÁGINA, NO ENLAZADAS ──────────────────────
 *
 * El primer intento ponía el <link> de Google Fonts, como la página de verdad.
 * El navegador de esta máquina NO lo carga —sale por un proxy que él no usa— y
 * la comprobación de abajo paró el proceso, que era justo su trabajo.
 *
 * Así que las fuentes se descargan aquí y se incrustan en el HTML. Dos cosas
 * mejoran de paso:
 *   · El dibujo no depende de que Google conteste en ese momento. Una imagen de
 *     marca que a veces sale con otra letra es peor que una que no sale.
 *   · Y lo que se dibuja es exactamente lo que se pidió, siempre.
 *
 * Se usa `curl` y no el módulo https de Node a propósito: en esta máquina la
 * salida va por un proxy que curl ya tiene configurado y Node no. */
function fuentesIncrustadas() {
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
             '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const url = 'https://fonts.googleapis.com/css2?family=Archivo:wght@600;800' +
              '&family=Inter:wght@400;500;600&display=swap';
  // La cabecera de navegador importa: sin ella Google devuelve el formato viejo
  // (ttf), que pesa más y no es lo que sirve la página de verdad.
  let css = execFileSync('curl', ['-sS', '--max-time', '30', '-A', UA, url],
                         { encoding: 'utf8', maxBuffer: 4 << 20 });

  /* Sólo los bloques latinos. El fichero trae también griego, cirílico y
   * vietnamita — unos cuarenta tramos— y meterlos todos convertiría la página
   * en varios megas de base64 para dibujar dos frases en español e inglés. */
  const bloques = css.split('@font-face').filter(b =>
    /\/\* latin/.test(css.slice(0, css.indexOf(b))) ||
    /U\+0000-00FF/.test(b) || /U\+0100-02BA/.test(b));
  css = bloques.map(b => '@font-face' + b).join('\n');

  const yaBajado = {};
  css = css.replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (todo, u) => {
    if (!yaBajado[u]) {
      const buf = execFileSync('curl', ['-sS', '--max-time', '30', '-A', UA, u],
                               { maxBuffer: 8 << 20 });
      if (!buf || buf.length < 500) throw new Error('fuente vacía: ' + u);
      yaBajado[u] = 'data:font/woff2;base64,' + buf.toString('base64');
    }
    return 'url(' + yaBajado[u] + ')';
  });
  const n = Object.keys(yaBajado).length;
  if (!n) throw new Error('no se bajó ninguna fuente');
  console.log('  fuentes incrustadas: ' + n + ' ficheros');
  return css;
}

// 1200×630 es lo que recortan WhatsApp, Slack, LinkedIn, X y la vista previa de
// Gmail. Cualquier otra proporción la recortan ellos, y recortan por el centro.
const ANCHO = 1200, ALTO = 630;

// Los mismos tokens que landing/acopio.html, copiados a propósito y no leídos
// del CSS: si mañana cambian allí, esta imagen tiene que REGENERARSE igualmente,
// y que el cambio no se propague solo es lo que obliga a volver a mirarla.
const NAVY = '#1B2A4A', AZUL = '#3B7DD8', TINTA = '#1A1A2E';

/* EL TITULAR ES EL DE LA PORTADA, LETRA POR LETRA. Jose lo cazó poniendo la
 * vista previa de WhatsApp al lado de la página: decían cosas distintas porque
 * yo había escrito el de aquí de memoria. La tarjeta es la promesa de lo que
 * hay al otro lado del clic; si no coincide, el que pulsa llega a un sitio
 * PARECIDO al que le enseñaron, no al mismo.
 *
 * Si algún día cambia el titular de la portada, cambia aquí también — y hay una
 * prueba que lo comprueba, para que no dependa de que alguien se acuerde. */

function plantilla(logoDataUri, fuentesCss, texto) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
${fuentesCss}</style>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${ANCHO}px;height:${ALTO}px;overflow:hidden;
       background:${NAVY};color:#fff;
       font:400 28px/1.5 Inter,sans-serif;
       display:flex;flex-direction:column;justify-content:center;
       padding:0 88px;position:relative}
  /* Una sola luz, arriba a la derecha, para que el fondo no sea un rectángulo
     plano. Nada más: lo que tiene que leerse es la frase. */
  .luz{position:absolute;top:-340px;right:-240px;width:860px;height:860px;
       border-radius:50%;background:radial-gradient(circle,
       rgba(59,125,216,.42) 0%, rgba(59,125,216,0) 68%)}
  .marca{display:flex;align-items:center;gap:18px;margin-bottom:46px}
  .marca img{width:54px;height:54px;object-fit:contain}
  .marca span{font:800 40px/1 Archivo,sans-serif;letter-spacing:-.03em}
  h1{font:800 68px/1.12 Archivo,sans-serif;letter-spacing:-.025em;
     max-width:900px;text-wrap:balance}
  p{margin-top:28px;font-size:30px;color:#B9C6DC;max-width:880px}
  .pie{position:absolute;left:88px;bottom:56px;display:flex;align-items:center;
       gap:16px;font-size:24px;color:#8FA6C6}
  .punto{width:11px;height:11px;border-radius:50%;background:${AZUL};
         box-shadow:0 0 0 6px rgba(59,125,216,.22)}
</style></head><body>
  <div class="luz"></div>
  <div class="marca"><img src="${logoDataUri}" alt=""><span>Acopio</span></div>
  <h1>${texto.h1}</h1>
  <p>${texto.p}</p>
  <div class="pie"><span class="punto"></span><span>www.acopio.net</span></div>
</body></html>`;
}

(async function () {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) {
    console.error('\n  Playwright no está disponible en esta máquina.');
    console.error('  Prueba:  NODE_PATH="$(npm root -g)" node tools/build-og-image.js\n');
    process.exit(2);
  }

  const logoSrc = path.join(ROOT, 'landing/assets/logo.png');
  if (!fs.existsSync(logoSrc)) {
    console.error('\n  Falta landing/assets/logo.png — la imagen llevaría un hueco.\n');
    process.exit(2);
  }
  // En línea y no por ruta: la página se carga con setContent, sin servidor
  // detrás, así que un src relativo no apuntaría a ninguna parte.
  const logoDataUri = 'data:image/png;base64,' + fs.readFileSync(logoSrc).toString('base64');

  const navegador = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  // deviceScaleFactor 2: la imagen se ve en pantallas de retina y una tarjeta
  // borrosa resta más de lo que suma.
  const ctx = await navegador.newContext({
    viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 2
  });
  const pagina = await ctx.newPage();
  const fuentes = fuentesIncrustadas();

  for (const idioma of IDIOMAS) {
  await pagina.setContent(plantilla(logoDataUri, fuentes, idioma), { waitUntil: 'load' });

  /* Esperar a las fuentes ANTES de la foto. Sin esto la imagen sale con la
   * tipografía de reserva del sistema una vez de cada tres —y encima de forma
   * intermitente, que es la peor manera de romperse: pasa la prueba hoy y sale
   * mal la vez que importa. document.fonts.ready contesta cuando Archivo e
   * Inter están de verdad pintables. */
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(250);

  /* Y comprobar que se usó Archivo, en vez de confiar. Si Google Fonts no
   * contesta —esta máquina sale por un proxy—, la foto saldría con una letra
   * que no es la de la marca y NADIE SE ENTERARÍA hasta verla en un WhatsApp.
   * Más vale no generar la imagen que generar una equivocada. */
  /* SE LE PREGUNTA AL NAVEGADOR, no se deduce midiendo.
   *
   * La primera versión comparaba el ancho del titular con Archivo y con la letra
   * de reserva, y daba SIEMPRE "no cargó" — con las fuentes perfectamente
   * cargadas. El motivo: un <h1> es un bloque, así que `getBoundingClientRect()`
   * devuelve el ancho de la CAJA, que es el del contenedor y no cambia nunca con
   * la tipografía. Estaba midiendo el recipiente en lugar del contenido.
   *
   * `document.fonts.check()` es la pregunta directa y no hay nada que deducir. */
  /* Sólo los dos pesos que la plantilla USA de verdad: Archivo 800 para la
   * marca y el titular, Inter 400 para el resto. Un navegador carga una fuente
   * cuando algo la necesita, así que preguntar por un peso que no se dibuja
   * devuelve "no está" aunque esté incrustada — y eso es un falso fallo, que es
   * la peor clase de comprobación: la que dice que no cuando sí. */
  const faltan = await pagina.evaluate(async () => {
    const quiero = [['800 68px Archivo', 'Archivo 800'],
                    ['400 28px Inter',   'Inter 400']];
    await Promise.all(quiero.map(f => document.fonts.load(f[0]).catch(() => {})));
    return quiero.filter(f => !document.fonts.check(f[0])).map(f => f[1]);
  });
  if (faltan.length) {
    await navegador.close();
    console.error('\n  ✗ No se dibujó con la letra de la marca. Falta: ' + faltan.join(', '));
    console.error('    La imagen NO se ha escrito — una tarjeta de marca con otra');
    console.error('    tipografía es peor que no tener tarjeta.\n');
    process.exit(1);
  }

  const salida = path.join(ROOT, idioma.f);
  await pagina.screenshot({ path: salida, type: 'jpeg', quality: 90 });
  const kb = Math.round(fs.statSync(salida).size / 1024);
  console.log('  ✓ ' + idioma.f + ' (' + idioma.lang + ') — ' + ANCHO + '×' + ALTO +
              ' a 2×, ' + kb + ' KB');
  }

  await navegador.close();
  console.log('\n  build-site.js las publica como /og.jpg y /og-es.jpg\n');
})();
