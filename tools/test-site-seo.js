// LO QUE TODA PÁGINA PUBLICADA TIENE QUE LLEVAR.
//
// Jose, 2026-10-06, con una lista de 20 comprobaciones de SEO: *"verifica si las
// necesitamos y si ya las tenemos… luego haz un plan."*
//
// ── POR QUÉ ESTA PRUEBA EXISTE ─────────────────────────────────────────────
//
// La auditoría encontró que **las cuatro páginas principales —la portada entre
// ellas— no tenían `viewport`, ni doctype, ni `lang`, ni `charset`**. No porque
// nadie supiera que hacían falta: porque las cinco páginas de `docs/` las
// construye un molde y **las cuatro escritas a mano no pasaban por ningún
// molde**. Nadie decidió eso. Simplemente no había nada que lo comprobara.
//
// Arreglarlo una vez no sirve. La página número doce que alguien añada dentro de
// seis meses volverá a ser la que no tiene viewport, por el mismo motivo por el
// que lo fueron estas cuatro. **La diferencia entre arreglarlo y arreglarlo de
// verdad es este fichero.**
//
// ── LO QUE MIDE, Y LO QUE NO ───────────────────────────────────────────────
//
// Mide lo que se puede comprobar leyendo el sitio construido: que cada página
// lleve su cabecera, que el sitemap diga exactamente las páginas que hay, y que
// la ficha de datos estructurados sea JSON legible.
//
// NO mide si Google clasifica bien el sitio, cuánto tarda en cargar, ni si
// alguien busca Acopio. Nada de eso se puede saber desde aquí, y una prueba que
// finge medirlo es peor que no tenerla.
//
// Uso:  node tools/build-site.js && node tools/test-site-seo.js

const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, '_site');

let ok = 0, fail = 0;
function check(label, cond, extra) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label, extra === undefined ? '' : '→ ' + JSON.stringify(extra)); }
}

if (!fs.existsSync(SITE)) {
  console.error('\n  No hay _site/. Corre antes: node tools/build-site.js\n');
  process.exit(2);
}

/* Las páginas se LEEN DEL DIRECTORIO, no de una lista escrita aquí.
 *
 * Es el mismo motivo por el que el sitemap lo genera el build: una lista en esta
 * prueba sería una tercera copia de "qué páginas hay", y la prueba diría que
 * todo está bien sobre una página que ya no existe, o callaría sobre una nueva.
 * Recorriendo el directorio, la página doce entra sola. */
function paginas(dir, base) {
  base = base || '';
  return fs.readdirSync(path.join(SITE, dir || '.'), { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? paginas(path.join(dir || '.', e.name), base + e.name + '/')
           : (/\.html$/.test(e.name) ? [base + e.name] : []));
}
const TODAS   = paginas('').sort();
const ORIGIN  = 'https://www.acopio.net';

/* La dirección de una página, con la MISMA regla que build-site.js: una carpeta
 * se sirve por su nombre y no por el index.html de dentro. `/es/index.html` y
 * `/es/` son la misma página, y poner la larga en un canonical o en un sitemap
 * es inventarse una segunda dirección para una sola cosa. */
function urlDe(rel) {
  if (rel === 'index.html') return ORIGIN + '/';
  if (/\/index\.html$/.test(rel)) return ORIGIN + '/' + rel.replace(/index\.html$/, '');
  return ORIGIN + '/' + rel;
}

/* Una redirección NO es una página, y medirla con la vara de una página sería
 * mentirse: no necesita descripción, ni tarjeta de compartir, ni H1 — no la lee
 * nadie, dura un parpadeo. Pero tampoco se la deja sin mirar: abajo tiene su
 * propia sección, con las tres cosas que sí tiene que cumplir.
 *
 * Se reconocen por lo que SON (llevan un canonical a otra página y un refresh),
 * no por una lista de nombres escrita aquí: una lista sería una tercera copia
 * de algo que ya decide build-site.js. */
function esRedireccion(rel) {
  const t = fs.readFileSync(path.join(SITE, rel), 'utf8');
  return /http-equiv=["']refresh["']/i.test(t) && t.length < 2000;
}
const REDIR   = TODAS.filter(esRedireccion);
const PAGINAS = TODAS.filter(r => REDIR.indexOf(r) === -1);

console.log('\n═══ 1. La cabecera, en TODAS — no en casi todas ═══\n');
console.log('  ' + PAGINAS.length + ' páginas publicadas, ' +
            REDIR.length + ' redirecciones\n');

check('hay páginas que mirar', PAGINAS.length >= 10, PAGINAS.length);

const sinViewport = [], sinDoctype = [], sinLang = [], sinCharset = [],
      sinTitulo = [], sinDesc = [], sinCanon = [], sinOg = [],
      tituloCorto = [], dosTitulos = [], dosH1 = [], sinH1 = [],
      descCorta = [], canonMal = [];

PAGINAS.forEach(rel => {
  const s = fs.readFileSync(path.join(SITE, rel), 'utf8');
  const head = s.slice(0, 4000);

  if (!/<meta[^>]+name=["']viewport["']/i.test(head)) sinViewport.push(rel);
  if (!/^\s*<!doctype html>/i.test(s))                sinDoctype.push(rel);
  if (!/<html[^>]+lang=["'](en|es)["']/i.test(head))  sinLang.push(rel);
  if (!/<meta[^>]+charset=["']?utf-8/i.test(head))    sinCharset.push(rel);

  const titulos = s.match(/<title>/gi) || [];
  if (!titulos.length) sinTitulo.push(rel);
  if (titulos.length > 1) dosTitulos.push(rel);
  const t = (/<title>([\s\S]*?)<\/title>/i.exec(s) || [])[1] || '';
  // "Acopio" a secas era el título de la portada, y es el caso que esto caza:
  // la línea azul que se pulsa en un buscador diciendo una palabra que nadie
  // busca todavía, porque el producto no lo conoce nadie.
  if (t.trim().length < 18) tituloCorto.push(rel + ' → "' + t.trim() + '"');

  const d = (/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(head) || [])[1];
  if (!d) sinDesc.push(rel);
  else if (d.length < 60) descCorta.push(rel + ' (' + d.length + ')');

  const c = (/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i.exec(head) || [])[1];
  if (!c) sinCanon.push(rel);
  else {
    const esperado = urlDe(rel);
    if (c !== esperado) canonMal.push(rel + ' → ' + c);
  }

  if (!/<meta[^>]+property=["']og:image["']/i.test(head)) sinOg.push(rel);

  const h1 = (s.match(/<h1[\s>]/gi) || []).length;
  if (h1 === 0) sinH1.push(rel);
  if (h1 > 1)   dosH1.push(rel + ' (' + h1 + ')');
});

check('TODAS llevan viewport — sin esto un teléfono dibuja la página a ancho ' +
      'de escritorio y la encoge, que es como estaba la portada',
      !sinViewport.length, sinViewport);
check('todas llevan doctype — sin él el navegador usa un modo de compatibilidad ' +
      'de hace veinte años', !sinDoctype.length, sinDoctype);
check('todas declaran su idioma', !sinLang.length, sinLang);
check('todas declaran utf-8 — si no, los acentos dependen de lo que diga el servidor',
      !sinCharset.length, sinCharset);
check('todas tienen título', !sinTitulo.length, sinTitulo);
check('...y UNO SOLO. Dos <title> no son un error que el navegador avise: se ' +
      'queda con el primero en silencio', !dosTitulos.length, dosTitulos);
check('...y ninguno es tan corto que no diga nada', !tituloCorto.length, tituloCorto);
check('todas tienen descripción', !sinDesc.length, sinDesc);
check('...y ninguna es un trozo suelto', !descCorta.length, descCorta);
check('todas tienen canonical', !sinCanon.length, sinCanon);
check('...apuntando A SÍ MISMAS. Un canonical copiado de otra página le dice al ' +
      'buscador que esta página no existe', !canonMal.length, canonMal);
check('todas tienen imagen para compartir — es lo que se ve al pegar el enlace ' +
      'en un WhatsApp', !sinOg.length, sinOg);
check('todas tienen un H1', !sinH1.length, sinH1);
check('...y sólo uno. Dos le dicen al buscador que la página trata de dos cosas ' +
      'distintas, y entonces no la clasifica bien en ninguna', !dosH1.length, dosH1);

console.log('\n═══ 2. La imagen de compartir existe de verdad ═══\n');
{
  const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i
             .exec(fs.readFileSync(path.join(SITE, 'index.html'), 'utf8'));
  const ruta = og ? og[1].replace(ORIGIN, '') : '';
  /* La etiqueta sola no vale nada. Apuntar a un fichero que no está se ve
   * EXACTAMENTE IGUAL que no tener etiqueta —un recuadro vacío— con la
   * diferencia de que uno cree que está hecho. */
  check('el fichero al que apunta og:image está publicado',
        !!ruta && fs.existsSync(path.join(SITE, ruta.replace(/^\//, ''))), ruta);
  const p = path.join(SITE, (ruta || '').replace(/^\//, ''));
  if (fs.existsSync(p)) {
    const kb = fs.statSync(p).size / 1024;
    check('...y no pesa tanto que la vista previa no cargue (< 900 KB)',
          kb < 900, Math.round(kb) + ' KB');
  }
}

console.log('\n═══ 2-bis. Las direcciones viejas llevan a la buena ═══\n');
{
  /* Cinco direcciones de una organización anterior del sitio que llevan meses
   * publicadas. No se borran —alguien puede tenerlas guardadas o en un correo
   * que ya mandamos— así que apuntan al documento de verdad.
   *
   * Lo que de verdad hay que comprobar no es que exista el fichero: es que
   * APUNTE A ALGO QUE EXISTE. Una redirección a una página que ya no está es
   * peor que no tener redirección, porque esconde el 404 detrás de un salto. */
  const rotas = [], sinCanon = [], sinSalto = [];
  REDIR.forEach(rel => {
    const t = fs.readFileSync(path.join(SITE, rel), 'utf8');
    const c = (/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i.exec(t) || [])[1];
    if (!c) { sinCanon.push(rel); return; }
    const destino = c.replace(ORIGIN, '').replace(/^\//, '');
    if (!fs.existsSync(path.join(SITE, destino))) rotas.push(rel + ' → ' + c);
    if (!/location\.replace/.test(t)) sinSalto.push(rel);
  });
  check('cada dirección vieja apunta a un documento QUE EXISTE — una redirección ' +
        'a una página que ya no está esconde el 404 detrás de un salto',
        !rotas.length, rotas);
  check('...con canonical, que es lo que hace que deje de haber dos páginas con ' +
        'el mismo título', !sinCanon.length, sinCanon);
  check('...y mueve al visitante sin dejar rastro en el historial (location.replace) — ' +
        'con un enlace normal, el botón atrás volvería aquí y volvería a saltar',
        !sinSalto.length, sinSalto);
  /* Y ninguna en el sitemap: mandar al buscador a una redirección es mandarlo a
   * dar un rodeo para llegar a donde ya le podíamos haber mandado. */
  const sm = fs.existsSync(path.join(SITE, 'sitemap.xml'))
    ? fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8') : '';
  const enSitemap = REDIR.filter(r => sm.indexOf('<loc>' + urlDe(r) + '</loc>') !== -1);
  check('y ninguna está en el sitemap', !enSitemap.length, enSitemap);
}

console.log('\n═══ 2-ter. Las dos portadas, inglés y español ═══\n');
{
  /* Jose, 2026-10-06: *"¿cómo se ve el link cuando se lo comparte en español?"*
   *
   * La página se adapta sola al idioma del navegador, pero LA TARJETA NO PUEDE:
   * la dibuja WhatsApp leyendo el HTML tal cual sale del servidor, sin ejecutar
   * nada. Una dirección sólo puede tener una tarjeta. Por eso hay dos
   * direcciones, y esto comprueba que de verdad son dos y no una repetida. */
  const en = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const esHay = fs.existsSync(path.join(SITE, 'es/index.html'));
  check('existe la portada española en /es/', esHay);
  if (!esHay) { console.log(''); }
  else {
    const es = fs.readFileSync(path.join(SITE, 'es/index.html'), 'utf8');
    const meta = (t, re) => (re.exec(t) || [])[1] || '';
    const tit = t => meta(t, /<title>([\s\S]*?)<\/title>/i);
    const img = t => meta(t, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
    const des = t => meta(t, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);

    check('...con un título distinto del inglés — si fuera el mismo, la tarjeta ' +
          'española no serviría de nada', tit(en) !== tit(es), [tit(en), tit(es)]);
    check('...y una descripción distinta', des(en) !== des(es));
    check('...y SU PROPIA imagen. Dos portadas apuntando a la misma tarjeta es ' +
          'todo el trabajo hecho a medias', img(en) !== img(es), [img(en), img(es)]);
    const f = img(es).replace(ORIGIN, '').replace(/^\//, '');
    check('...y esa imagen existe', !!f && fs.existsSync(path.join(SITE, f)), f);
    check('la española declara lang="es"', /<html[^>]+lang=["']es["']/.test(es));

    /* hreflang tiene que estar en LAS DOS y apuntarse mutuamente. Declarado por
     * un solo lado, un buscador no se lo cree — y entonces las dos portadas
     * vuelven a ser contenido duplicado, que es justo lo que esto evita. */
    [['en', en], ['es', es]].forEach(par => {
      const t = par[1];
      check('la portada ' + par[0] + ' declara las dos versiones (hreflang)',
            /hreflang=["']en["']/.test(t) && /hreflang=["']es["']/.test(t) &&
            /hreflang=["']x-default["']/.test(t));
    });

    /* Y el conmutador tiene que ser un ENLACE, no un botón: es lo que hace que
     * la versión española exista para un buscador en vez de ser un estado de un
     * script, y lo que la deja alcanzable sin JavaScript. */
    check('el conmutador de idioma es un enlace que se puede seguir',
          /<a[^>]+id=["']langToggle["'][^>]+href=["']\/es\/["']/.test(en), 'en');
    check('...y en la española lleva de vuelta al inglés',
          /<a[^>]+id=["']langToggle["'][^>]+href=["']\/["']/.test(es), 'es');
  }
}

console.log('\n═══ 3. La verificación de Search Console sigue ahí ═══\n');
{
  /* ESTO NO ES UNA FORMALIDAD CUMPLIDA UNA VEZ.
   *
   * Google vuelve a mirar esta etiqueta cada cierto tiempo. El día que no la
   * encuentre, QUITA EL ACCESO a los datos del sitio — en silencio, con un
   * aviso por correo a una cuenta que nadie mira. Y se pierde justamente lo
   * único que dice si todo el trabajo de SEO sirvió para algo.
   *
   * Es el tipo de cosa que desaparece sin que nadie lo note: alguien reordena
   * la cabecera, o se añade una página nueva y se copia la cabecera de otra sin
   * ella. Por eso se comprueba, y no se confía. */
  const idx = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const m = /<meta[^>]+name=["']google-site-verification["'][^>]+content=["']([^"']+)["']/i.exec(idx);
  check('la portada lleva la etiqueta de Search Console — si desaparece, Google ' +
        'quita el acceso a los datos y sólo avisa por correo', !!m);
  check('...y no está vacía', !!m && m[1].length > 20, m && m[1]);

  /* Y en ninguna otra, a propósito: Google la busca en la raíz, que es la
   * propiedad. En once páginas no verifica nada más y multiplica por once lo
   * que hay que cambiar el día que cambie. */
  const otras = PAGINAS.filter(r => r !== 'index.html' &&
    /google-site-verification/i.test(fs.readFileSync(path.join(SITE, r), 'utf8')));
  check('...y sólo en la portada, que es donde Google la busca', !otras.length, otras);
}

console.log('\n═══ 4. El sitemap dice la verdad ═══\n');
{
  const sm = path.join(SITE, 'sitemap.xml');
  check('existe sitemap.xml', fs.existsSync(sm));
  if (fs.existsSync(sm)) {
    const x = fs.readFileSync(sm, 'utf8');
    const locs = (x.match(/<loc>([^<]+)<\/loc>/g) || [])
      .map(l => l.replace(/<\/?loc>/g, ''));
    const esperadas = PAGINAS.map(urlDe);
    const faltan = esperadas.filter(u => locs.indexOf(u) === -1);
    const sobran = locs.filter(u => esperadas.indexOf(u) === -1);
    /* Las dos direcciones, y no sólo una: un sitemap al que le FALTA una página
     * la esconde, y uno al que le SOBRA manda al buscador a un 404 y le enseña
     * a hacer menos caso al fichero entero. */
    check('el sitemap lleva todas las páginas publicadas', !faltan.length, faltan);
    check('...y ninguna que no exista', !sobran.length, sobran);
    check('cada una con su fecha', (x.match(/<lastmod>/g) || []).length === locs.length);
  }
}

console.log('\n═══ 5. robots.txt y llms.txt ═══\n');
{
  const rb = path.join(SITE, 'robots.txt');
  check('existe robots.txt', fs.existsSync(rb));
  if (fs.existsSync(rb)) {
    const r = fs.readFileSync(rb, 'utf8');
    check('...y apunta al sitemap, que es su trabajo real aquí',
          r.indexOf(ORIGIN + '/sitemap.xml') !== -1);
    /* Nada está bloqueado, y eso es una decisión: las once páginas son material
     * de venta o documentación de cliente. Lo privado nunca se publicó — de eso
     * se encarga la lista de denegación por defecto de build-site.js. Si algún
     * día aparece aquí un Disallow, que sea porque alguien lo escribió a
     * propósito y no porque se coló. */
    check('...y no bloquea nada por accidente', !/^\s*Disallow:\s*\/\s*$/m.test(r), r);
  }
  check('existe llms.txt', fs.existsSync(path.join(SITE, 'llms.txt')));
}

console.log('\n═══ 6. La ficha de datos estructurados ═══\n');
{
  const s = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(s);
  check('la portada lleva ficha ld+json', !!m);
  if (m) {
    let d = null;
    try { d = JSON.parse(m[1].replace(/\\u003c/g, '<')); } catch (e) {}
    // Un ld+json con un error de sintaxis no da aviso en ninguna parte: el
    // buscador lo descarta en silencio y la ficha no sale nunca.
    check('...y es JSON que se puede leer, no texto que lo parece', !!d);
    if (d) {
      check('...y dice que es un programa', d['@type'] === 'SoftwareApplication', d['@type']);
      const txt = JSON.stringify(d);
      /* NI PRECIO NI CORREO, y las dos por el mismo motivo: lo que entra aquí
       * lo recoge una máquina y lo repite meses después, fuera de nuestro
       * alcance. Un precio caducado en un comparador y el correo personal de
       * Jose en un recolector de spam son el mismo fallo. */
      check('...sin precio dentro — un precio que recoge un comparador se repite ' +
            'meses después de haberlo cambiado', !/"price/i.test(txt));
      check('...y sin el correo personal — un correo en un bloque que lee una ' +
            'máquina es un correo que recogen los robots de spam',
            txt.indexOf('@gmail') === -1 && !/"email"/i.test(txt));
    }
  }
}

console.log('\n' + (fail ? '✗ ' + fail + ' fallo(s), ' : '✓ ') + ok + ' comprobaciones\n');
process.exit(fail ? 1 : 0);
