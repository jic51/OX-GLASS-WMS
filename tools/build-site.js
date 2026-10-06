// BUILD THE PUBLIC SITE — default deny.
//
// This repository holds two kinds of thing that must never be confused:
//
//   The PRODUCT. Code_v3_fixed.gs and Index_v3_fixed.html are what Jose sells.
//   Publishing them is giving the product away.
//
//   Jose's OWN papers. Margins, five-year plan, competitor research, the sales
//   guide, how the code is protected, the runbook naming his OAuth client and
//   his Script Properties. Publishing those is worse than giving away the
//   product, because a competitor learns his pricing and a stranger learns how
//   to walk past his protections.
//
// And a third, small kind: the handful of documents a CUSTOMER needs, which
// have to be public or the product cannot be installed.
//
// THE RULE IS DEFAULT DENY. Nothing is published unless it is named in PUBLIC
// below. A new file added to docs/ tomorrow is private by construction, with no
// decision required and nothing to remember. The opposite arrangement — a list
// of things to exclude — fails the first time somebody adds a file and does not
// think about it, and the failure mode is publishing Jose's margins.
//
// tools/test-site-privacy.js is the second lock: it re-derives the same set,
// refuses to let a private file appear in it, and greps the OUTPUT for the
// things that must never leave, in case a public document quietly grows a
// paragraph about the OAuth client.
//
// Usage:
//   node tools/build-site.js            → writes _site/
//   node tools/build-site.js --list     → prints what would be published

const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT  = path.join(ROOT, '_site');

// ── WHAT IS PUBLIC. Nothing else is. ────────────────────────────────────────
// Each entry says WHY, because "is this public?" is a decision that has to be
// re-made deliberately, and a list without reasons gets appended to.
// `title` and `desc` live HERE and not inside the source files, on purpose.
//
// The four files in landing/ are HTML FRAGMENTS — they open straight at
// <title>, with no doctype, no <html lang>, no charset and no viewport. That is
// why they rendered in quirks mode, and why a phone drew the landing page at
// desktop width and shrank it until it fit: the one page a buyer opens from a
// WhatsApp link was the one page that never said it was made for a phone.
//
// The five pages under DOCS never had that problem, because docShell() below
// builds their head for them. So the fix is the same shape: ONE head, built
// here, for every page. A fifth landing page added tomorrow cannot be the one
// without a viewport, because nobody has to remember anything.
//
// The cost is that the title and the description sit next to the file name
// rather than inside the file. That is the right trade: they are the two lines
// a search engine shows, they only work when they are written together, and a
// <title> buried at the top of a two-thousand-line page is one nobody re-reads.
const PAGES = [
  /* ── LAS PALABRAS SON LAS DE LA PÁGINA, LETRA POR LETRA ────────────────
   *
   * Jose, 2026-10-06, con una captura de la vista previa de WhatsApp al lado de
   * la portada: *"¿por qué la imagen al enviar el link y la landing dicen cosas
   * distintas? ¿No deben decir lo mismo?"*
   *
   * Sí. Y las mías decían *"without walking there"* mientras la página decía
   * *"without going to look."* — yo las escribí de memoria en vez de copiarlas.
   *
   * La vista previa es **una promesa de lo que hay al otro lado del clic**. Si
   * la promesa y la página no usan las mismas palabras, el que pulsa nota algo
   * raro aunque no sepa decir qué: llegó a un sitio parecido al que le
   * enseñaron, no al mismo.
   *
   * El título es la única excepción, y es a propósito: lleva *"Acopio — "*
   * delante porque en una lista de resultados de Google hay que poder saber de
   * quién es el enlace. La FRASE, a partir de ahí, es la de la página.
   *
   * La descripción también cambió: en la captura de Jose, WhatsApp la cortaba a
   * media frase (*"...know what is in stock from any"*). Ahora dice lo
   * importante primero, para que lo que se vea cortado sea el final y no el
   * sentido. */
  { src: 'landing/acopio.html',          out: 'index.html', lang: 'en',
    title: "Acopio — know what's on the shelf without going to look",
    desc:  'Acopio turns your Google Sheet into a real warehouse system — in, ' +
           'out, locations, costs and low-stock alerts. We install and set it ' +
           'up for you.',
    why: 'The landing page itself, both languages in one file.' },
  { src: 'landing/acopio-overview.html', out: 'detalle.html', lang: 'es',
    title: 'Acopio en detalle — qué hace, pantalla por pantalla',
    desc:  'El recorrido largo de Acopio: qué resuelve, qué hace hoy en ' +
           'producción, qué huecos tiene y qué cuesta. Escrito para leerse ' +
           'entero antes de decidir.',
    why: 'The long-form product description — what it does, screen by screen.' },
  { src: 'landing/changelog.html',       out: 'changelog.html', lang: 'en',
    title: 'What is new in Acopio — every change, in plain words',
    desc:  'Every change that reaches a customer installation, newest first, ' +
           'with what it fixes and why it mattered.',
    why: 'Every change that reaches a customer installation, in English.' },
  { src: 'landing/novedades.html',       out: 'novedades.html', lang: 'es',
    title: 'Novedades de Acopio — todos los cambios, explicados',
    desc:  'Cada cambio que llega a la instalación de un cliente, del más ' +
           'nuevo al más viejo, con qué arregla y por qué importaba.',
    why: 'The same changelog in Spanish. The two are kept level by check-changelog.js.' }
];

const DOCS = [
  { src: 'docs/INSTALL-GUIDE.md',           out: 'docs/instalacion.html',
    title: 'Guía de instalación', lang: 'es',
    desc:  'Cómo instalar Acopio en tu propia hoja de Google, paso a paso y sin saber de programación. Copiar el archivo, autorizarlo y publicarlo.',
    why: 'A customer cannot install without it. Written for them, not for Jose.' },
  { src: 'docs/CUSTOMER-SETUP.md',          out: 'docs/setup.html',
    title: 'Setting up your warehouse system', lang: 'en',
    desc:  'How to set up your Acopio warehouse system the first time: your categories, your racks, your people, and the first movement.',
    why: 'The English half of the same job.' },
  // RESTAURAR-UN-BACKUP.md IS NOT HERE, AND THAT IS THE GUARD DOING ITS JOB.
  //
  // It was on this list. It is the right IDEA for a public document — the
  // customer owns their backups and should be able to restore one without
  // calling anybody. But tools/test-site-privacy.js read the built page and
  // refused it, correctly: the document is half customer procedure and half
  // Jose's own notes. It names SESSION_SECRET and OAUTH_CLIENT_SECRET, walks
  // through Script Properties, and contains a paragraph about Jose keeping a
  // copy of every client's properties in his own support file — including the
  // observation that the OAuth secret is HIS and is shared across every
  // customer. Publishing that tells every reader that one secret spans all
  // installations.
  //
  // So it stays private until somebody writes the customer half on its own:
  // here is your backup, here is how to restore it, here is what a restored
  // copy does not carry. That is a writing job, not a filtering one, and doing
  // it by deleting paragraphs from the existing file would leave a document
  // that reads like it has holes in it. Noted in docs/BACKLOG.md.
  { src: 'docs/RESTAURAR-UNA-COPIA.md',     out: 'docs/restaurar.html',
    title: 'Si algo se dañó, así vuelves a ayer', lang: 'es',
    desc:  'Si algo se borró o se dañó, así vuelves al estado de ayer. Qué copias hay, dónde están y cómo se usa cada una.',
    why: 'The customer half, written from scratch. This is the document the ' +
         'comment above says was missing — the private RESTAURAR-UN-BACKUP.md ' +
         'stays private and is NOT its source.' },
  { src: 'docs/VISTA-POR-PASILLO.md',       out: 'docs/vista-por-pasillo.html',
    title: 'La vista por pasillo', lang: 'es',
    desc:  'Qué es la vista por pasillo de Acopio, en qué se diferencia de una lista de materiales, y cuándo conviene cada una.',
    why: 'Explains a feature to the person using it. No internals.' },
  // SOPORTE-Y-DEVOLUCIONES.md YA NO SE PUBLICA, Y ESO ERA UNA FUGA.
  //
  // Estaba en esta lista, y la idea era correcta: una promesa que nadie puede
  // leer no es una promesa. Pero el documento equivocado. Su primera línea dice
  // "Este documento es para Jose", tiene una sección titulada "Casos que van a
  // aparecer, y qué contestar", marca qué plazos son propuesta mía y qué es
  // decisión suya, y deja por escrito que está por decidir si factura como
  // persona natural o como LLC. Todo eso estuvo público en acopio.net.
  //
  // Ninguno de los dos candados lo vio: el primero sólo pregunta qué archivos
  // se publicaron —y este estaba en la lista, aprobado— y el segundo busca
  // secretos y no encuentra ninguno, porque no hay. La fuga no era un dato: era
  // el DESTINATARIO. Un documento dirigido al vendedor, leído por el comprador.
  //
  // SOPORTE-Y-PAGOS.md es el reemplazo, escrito para el cliente, y trae además
  // la política de cobro que faltaba. El manual de Jose se queda privado, que
  // es donde sirve.
  { src: 'docs/SOPORTE-Y-PAGOS.md',         out: 'docs/soporte.html',
    title: 'Soporte y pagos', lang: 'es',
    desc:  'Qué cubre el soporte de Acopio, cuánto cuesta, cómo se paga y qué pasa si algo sale mal o quieres darte de baja.',
    why: 'The customer half: what it costs, when, and what happens if something ' +
         'goes wrong. A promise nobody can read is not one — but it has to be ' +
         'written TO them.' },
  { src: 'legal/TERMS-OF-SERVICE.md',       out: 'terms.html',
    title: 'Terms of Service', lang: 'en',
    desc:  'The terms you agree to when you use Acopio: what the licence covers, what it does not, and how either side ends it.',
    why: 'Has to be public — the app links to it from its own footer.' },
  { src: 'legal/PRIVACY-POLICY.md',         out: 'privacy.html',
    title: 'Privacy Policy', lang: 'en',
    desc:  'What Acopio does and does not collect, where your warehouse data lives, who can reach it, and how to delete it.',
    why: 'Same: linked from the app, and required by Google for the consent screen.' }
];

// The custom domain. One name, chosen once — Jose picked the www form, and a
// site that answers on two names without redirecting is two sites as far as
// search engines and cookies are concerned.
const DOMAIN = 'www.acopio.net';
const ORIGIN = 'https://' + DOMAIN;

/* LA ETIQUETA DE SEARCH CONSOLE.
 *
 * Jose la trajo el 2026-10-06 desde search.google.com/search-console, al dar de
 * alta la propiedad `https://www.acopio.net`. Google la busca para creerse que
 * el sitio es suyo.
 *
 * ── TRES COSAS QUE HAY QUE SABER ANTES DE TOCARLA ─────────────────────────
 *
 *  1. NO ES UN SECRETO. Es una etiqueta pública en una página pública: cualquiera
 *     que mire el código fuente la ve. No da acceso a nada — sólo demuestra que
 *     quien controla el sitio controla la propiedad. Por eso puede vivir aquí.
 *  2. NO SE QUITA NUNCA, aunque la verificación ya esté hecha. Google la vuelve
 *     a mirar cada cierto tiempo, y el día que no la encuentre QUITA EL ACCESO a
 *     los datos — en silencio, y el aviso llega por correo a una cuenta que
 *     nadie mira. Por eso hay una prueba que comprueba que sigue ahí.
 *  3. SÓLO VA EN LA PORTADA. Google la busca en la página de la propiedad, que
 *     es la raíz. Repetirla en las once no verifica nada más y multiplica por
 *     once lo que hay que cambiar el día que cambie.
 */
const GOOGLE_VERIFY = 'SZdwN9dMYFY3lf5XT9Ema084EgLO_sDIOTVFH9Hrxj8';

// The picture that shows when somebody pastes the link into WhatsApp, a mail or
// a chat. 1200×630 is the size every one of them crops to.
//
// It matters more here than the search-engine work does, and it is worth saying
// why: today the main way anybody reaches this site is JOSE SENDING THE LINK.
// Without this file, that link arrives as a bare grey rectangle.
const OG_IMAGE = '/og.jpg';

// ── Everything below is machinery ───────────────────────────────────────────

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// A published file's address. The home page is the one that is not called by
// its file name, which is also the rename that RENAMES handles for links.
function urlOf(out) {
  return ORIGIN + (out === 'index.html' ? '/' : '/' + out);
}

/* ── LA FICHA QUE LEE UNA MÁQUINA ───────────────────────────────────────────
 *
 * Sólo en la portada, y sólo con lo que ya dice la página. Es lo que convierte
 * un resultado en una ficha con nombre y descripción, y es de lo que se alimenta
 * un asistente cuando le preguntan qué programa usar para una bodega.
 *
 * NO LLEVA PRECIO, aunque el formato lo admita y aunque la página sí lo diga.
 * Un precio aquí es un precio que un comparador puede recoger y repetir meses
 * después de cambiarlo, y que queda cacheado fuera de nuestro alcance. El sitio
 * es el sitio donde se dice el precio; esto es un índice.
 *
 * Y NO LLEVA EL CORREO. El del sitio es el personal de Jose; metido en un bloque
 * que una máquina lee directamente, se convierte en una dirección que recogen
 * los robots de spam sin tener siquiera que mirar la página. El contacto está
 * en la página, donde una persona lo encuentra. */
function fichaJsonLd(meta) {
  const ficha = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Acopio',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Warehouse management',
    operatingSystem: 'Web browser',
    url: ORIGIN + '/',
    description: meta.desc,
    inLanguage: ['en', 'es'],
    image: ORIGIN + OG_IMAGE,
    featureList: [
      'Record material in and out of the warehouse',
      'Stock by rack and by project',
      'Warehouse map with photos of each rack',
      'Several people at once, with roles and an audit trail',
      'Runs inside a Google Sheet the customer owns'
    ],
    publisher: { '@type': 'Organization', name: 'Acopio', url: ORIGIN + '/' }
  };
  return '<script type="application/ld+json">' +
         JSON.stringify(ficha).replace(/</g, '\\u003c') +
         '</script>';
}

// EVERY page's head, built from one place.
//
// What each line is for, because "SEO tags" is not a reason and a list without
// reasons gets things added to it that nobody can remove later:
//
//   doctype      without it the browser uses a compatibility mode from 2001
//   lang         what language the text is in — for screen readers and search
//   charset      without it the accents depend on what the server happens to say
//   viewport     THE IMPORTANT ONE. Without it a phone draws the page at
//                desktop width and shrinks it until it fits
//   description  the grey paragraph under the blue line in Google. It does not
//                change the ranking; it decides whether anybody clicks
//   canonical    this site answers on two names. Without this, a search engine
//                can treat them as two sites with the same text and split the
//                credit between them
//   og / twitter the card when the link is pasted somewhere
function headOf(meta) {
  const url = urlOf(meta.out);
  const t = esc(meta.title);
  const d = esc(meta.desc);
  return `<!doctype html>
<html lang="${meta.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Acopio">
<meta property="og:locale" content="${meta.lang === 'es' ? 'es_US' : 'en_US'}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${ORIGIN}${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Acopio — know what's on the shelf without going to look">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${ORIGIN}${OG_IMAGE}">` +
    (meta.out === 'index.html' && GOOGLE_VERIFY
      ? '\n<meta name="google-site-verification" content="' + GOOGLE_VERIFY + '">'
      : '');
}

// A small Markdown reader. Deliberately small: these seven documents use
// headings, paragraphs, lists, tables, code fences, blockquotes, links, bold
// and italic, and nothing else. Pulling in a library to cover Markdown nobody
// writes here would be more code to trust, not less.
function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;

  function inline(t) {
    return esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {                       // fenced code
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { const n = h[1].length; out.push('<h' + n + '>' + inline(h[2]) + '</h' + n + '>'); i++; continue; }

    if (/^\s*[-*]{3,}\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    if (/^\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const cells = r => r.split('|').slice(1, -1).map(c => inline(c.trim()));
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push('<div class="tablewrap"><table><thead><tr>' +
        head.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push('<blockquote>' + mdToHtml(buf.join('\n')) + '</blockquote>');
      continue;
    }

    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const buf = [];
      while (i < lines.length) {
        const m2 = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (!m2) {
          // a wrapped continuation line belongs to the item above it
          if (/^\s{2,}\S/.test(lines[i]) && buf.length) { buf[buf.length - 1] += ' ' + lines[i].trim(); i++; continue; }
          break;
        }
        buf.push(m2[3]); i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push('<' + tag + '>' + buf.map(t => '<li>' + inline(t) + '</li>').join('') + '</' + tag + '>');
      continue;
    }

    if (!line.trim()) { i++; continue; }

    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*[-*]\s|\s*\d+\.\s|\||>|```)/.test(lines[i])) buf.push(lines[i++]);
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out.join('\n');
}

// One shell for every converted document, using the landing's own tokens so a
// doc page and the shopfront are visibly the same product.
function docShell(meta, bodyHtml) {
  return `${headOf({ out: meta.out, lang: meta.lang, desc: meta.desc,
                     title: meta.title + ' · Acopio' })}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;800&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap">
<style>
  :root{
    --ground:#F0F2F5; --surface:#FFF; --ink:#1A1A2E; --steel:#6B7280;
    --line:#E5E7EB; --rack:#1B2A4A; --accent:#3B7DD8; --accent-ink:#1E52A0;
    --amber-wash:#FEF3C7; --amber-ink:#B45309;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink);
       font:16px/1.7 Inter,-apple-system,BlinkMacSystemFont,sans-serif}
  header{background:var(--rack);color:#fff;padding:1.1rem 1.4rem}
  header a{color:#fff;text-decoration:none;font-weight:700;font-family:Archivo,Inter,sans-serif;letter-spacing:.01em}
  header nav{max-width:820px;margin:0 auto;display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap}
  header nav .sp{flex:1}
  header nav a.small{font-weight:500;font-size:.88rem;opacity:.85}
  header nav a.small:hover{opacity:1}
  main{max-width:820px;margin:0 auto;padding:2.4rem 1.4rem 5rem}
  article{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:2rem 2.1rem}
  h1,h2,h3,h4{font-family:Archivo,Inter,sans-serif;line-height:1.25;text-wrap:balance}
  h1{font-size:2rem;margin:.2rem 0 1.4rem}
  h2{font-size:1.35rem;margin:2.2rem 0 .7rem;padding-top:1.2rem;border-top:1px solid var(--line)}
  h3{font-size:1.08rem;margin:1.5rem 0 .5rem}
  h4{font-size:.98rem;margin:1.2rem 0 .4rem;color:var(--steel)}
  p{margin:.75rem 0}
  a{color:var(--accent-ink)}
  ul,ol{margin:.7rem 0;padding-left:1.3rem}
  li{margin:.35rem 0}
  code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:.88em;
       background:var(--ground);border:1px solid var(--line);border-radius:4px;padding:.1em .35em}
  pre{background:var(--rack);color:#E6ECF5;border-radius:8px;padding:1rem 1.1rem;overflow-x:auto}
  pre code{background:none;border:0;padding:0;color:inherit;font-size:.84rem}
  blockquote{margin:1.1rem 0;padding:.8rem 1.1rem;background:var(--amber-wash);
             border-left:3px solid var(--amber-ink);border-radius:0 8px 8px 0}
  blockquote p{margin:.35rem 0}
  .tablewrap{overflow-x:auto;margin:1.1rem 0}
  table{border-collapse:collapse;width:100%;font-size:.92rem}
  th,td{border:1px solid var(--line);padding:.5rem .7rem;text-align:left;vertical-align:top}
  th{background:var(--ground);font-weight:700}
  hr{border:0;border-top:1px solid var(--line);margin:2rem 0}
  footer{max-width:820px;margin:0 auto;padding:0 1.4rem 3rem;color:var(--steel);font-size:.85rem}
  footer a{color:var(--steel)}
</style>
</head>
<body>
<header><nav>
  <a href="/">Acopio</a>
  <span class="sp"></span>
  <a class="small" href="/detalle.html">Detalle</a>
  <a class="small" href="/changelog.html">Changelog</a>
  <a class="small" href="/novedades.html">Novedades</a>
</nav></header>
<main><article>
${bodyHtml}
</article></main>
<footer>
  <p>Documentos ·
    <a href="/docs/setup.html">Setting up your warehouse</a> ·
    <a href="/docs/instalacion.html">Guía de instalación</a> ·
    <a href="/docs/vista-por-pasillo.html">La vista por pasillo</a> ·
    <a href="/docs/restaurar.html">Volver a una copia</a> ·
    <a href="/docs/soporte.html">Soporte y devoluciones</a></p>
  <p><a href="/">← Acopio</a> · <a href="/terms.html">Terms</a> · <a href="/privacy.html">Privacy</a></p>
</footer>
</body>
</html>`;
}

/* ── LOS TRES FICHEROS QUE NO SON PÁGINAS ───────────────────────────────────
 *
 * sitemap.xml, robots.txt y llms.txt. Los tres salen de la MISMA lista de
 * arriba, y eso no es comodidad: es la regla de la casa.
 *
 * Un sitemap escrito a mano es una segunda lista de las páginas del sitio que
 * tiene que coincidir con la primera sin que nada lo obligue — y ése es
 * exactamente el fallo que llevamos todo el mes arreglando en otro sitio (dos
 * listas de usuarios, y la vieja dejaba entrar). Aquí el daño sería menor y la
 * forma es idéntica: alguien añade una página, se olvida del sitemap, y el
 * sitemap pasa a mentir sin que nadie se entere.
 *
 * Generándolos, una página nueva entra sola en los tres.
 */
function fechaDeArchivo(rel) {
  // La fecha del ORIGEN, no la del build. Un `lastmod` que cambia cada vez que
  // se compila le dice al buscador que las once páginas cambiaron hoy, lo cual
  // es falso y, repetido, es la forma de que deje de hacer caso al fichero.
  try { return fs.statSync(path.join(ROOT, rel)).mtime.toISOString().slice(0, 10); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}

function escribirSitemap() {
  const entradas = PAGES.concat(DOCS).map(x =>
    '  <url>\n' +
    '    <loc>' + urlOf(x.out) + '</loc>\n' +
    '    <lastmod>' + fechaDeArchivo(x.src) + '</lastmod>\n' +
    '  </url>');
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entradas.join('\n') + '\n</urlset>\n');
}

function escribirRobots() {
  /* Todo abierto. Se dice a propósito, porque "no bloquear nada" es una
   * decisión y no un olvido: las once páginas son material de venta o
   * documentación de cliente, y ninguna tiene nada que esconder — de eso ya se
   * encarga la lista de arriba, que es de denegación por defecto.
   *
   * Lo que este fichero SÍ hace es apuntar al sitemap, que es su trabajo real
   * en un sitio como éste. */
  fs.writeFileSync(path.join(OUT, 'robots.txt'),
    '# ' + DOMAIN + '\n' +
    '# Nothing here is private. What is private was never published:\n' +
    '# tools/build-site.js publishes only what it names, and nothing else.\n' +
    'User-agent: *\n' +
    'Allow: /\n\n' +
    'Sitemap: ' + ORIGIN + '/sitemap.xml\n');
}

function escribirLlms() {
  /* llms.txt — y conviene decir lo que es, porque se vende como obligatorio:
   * ES UNA CONVENCIÓN PROPUESTA, NO UN ESTÁNDAR. Ningún buscador la exige y no
   * está demostrado que ningún modelo la lea.
   *
   * Se pone igual por dos motivos concretos: cuesta un fichero de texto que se
   * genera solo, y el comprador de esto es un encargado de bodega que no sabe
   * de programas — va a preguntarle a un asistente antes que a Google. Si
   * mañana sirve, está; si no sirve, no ha costado nada.
   *
   * Lo que NO lleva: ni precios, ni comparaciones con nadie, ni nada que no
   * esté ya en una de las once páginas. Un fichero pensado para que lo lea una
   * máquina no es un sitio donde contar más. */
  const linea = x => '- [' + x.title.replace(/ · Acopio$/, '') + '](' + urlOf(x.out) + '): ' + x.desc;
  fs.writeFileSync(path.join(OUT, 'llms.txt'),
    '# Acopio\n\n' +
    '> A warehouse system that lives in a Google Sheet the customer already\n' +
    '> owns. It records what comes into the warehouse and what leaves, keeps\n' +
    '> stock per rack and per project, and is used from a browser or a phone\n' +
    '> by several people at once. Built by a warehouse manager for his own\n' +
    '> warehouse, and sold to others.\n\n' +
    'Installation is copying a spreadsheet: there is no server to run and no\n' +
    'account to create. The data stays in the customer\'s own Google Drive.\n\n' +
    '## Pages\n\n' +
    PAGES.map(linea).join('\n') + '\n\n' +
    '## Customer documentation\n\n' +
    DOCS.map(linea).join('\n') + '\n');
}

/* ── LAS CINCO DIRECCIONES VIEJAS ───────────────────────────────────────────
 *
 * Jose, 2026-10-06, autorizándolo: *"¿le doy? DALE."*
 *
 * EL PROBLEMA, encontrado leyendo lo PUBLICADO y no lo que construimos: los
 * cinco documentos de cliente estaban dos veces en el sitio. En `docs/`, que es
 * donde los pone este build, y sueltos en la raíz desde una organización
 * anterior — **con el texto viejo**, comprobado uno a uno (la copia de la raíz
 * era más pequeña que la de `docs/` en los cinco casos).
 *
 * Para un buscador eran dos páginas con el mismo título. Para una persona era
 * peor: quien llegara a `/instalacion.html` desde un enlace viejo leía
 * instrucciones de instalación desatendidas — **peor que un 404, porque un 404
 * es honesto**.
 *
 * ── POR QUÉ REDIRECCIÓN Y NO BORRARLAS ────────────────────────────────────
 *
 * Porque son direcciones que llevan meses publicadas y alguien puede tenerlas
 * guardadas, o en un correo que ya mandamos. Borrarlas convierte un documento
 * caducado en un enlace roto, que no es mejor: es otro fallo distinto.
 *
 * Así, el enlace viejo sigue funcionando y lleva al documento de verdad.
 *
 * ── LO QUE LLEVA CADA UNA, Y POR QUÉ ──────────────────────────────────────
 *
 *   canonical     le dice al buscador CUÁL es la buena. Es lo que hace que deje
 *                 de haber dos páginas con el mismo título
 *   location.replace  mueve al visitante sin dejar la página vieja en el
 *                 historial — con un `href` normal, el botón "atrás" volvería
 *                 aquí y volvería a saltar: una trampa
 *   meta refresh  lo mismo para quien tenga el JavaScript apagado
 *   un enlace     visible, para quien tenga las dos cosas apagadas. Nadie
 *                 debería quedarse mirando una página en blanco
 *
 * NO LLEVA `noindex`, y es a propósito: `noindex` junto a un `canonical` se
 * contradicen —uno dice "olvida esta página", el otro "cuenta esta para
 * aquélla"— y Google puede acabar quitando las dos. El canonical solo ya hace
 * el trabajo.
 */
const REDIRECTS = [
  { from: 'setup.html',              to: '/docs/setup.html' },
  { from: 'instalacion.html',        to: '/docs/instalacion.html' },
  { from: 'restaurar.html',          to: '/docs/restaurar.html' },
  { from: 'soporte.html',            to: '/docs/soporte.html' },
  { from: 'vista-por-pasillo.html',  to: '/docs/vista-por-pasillo.html' }
];

function redirectShell(r) {
  const destino = ORIGIN + r.to;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Acopio</title>
<link rel="canonical" href="${destino}">
<meta http-equiv="refresh" content="0; url=${destino}">
<script>location.replace(${JSON.stringify(destino)});</script>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#F0F2F5;color:#1A1A2E;
       font:16px/1.7 Inter,-apple-system,BlinkMacSystemFont,sans-serif;padding:1.4rem}
  p{text-align:center;max-width:30rem}
  a{color:#1E52A0}
</style>
</head>
<body>
<p>Esta página se movió.<br><a href="${destino}">Seguir hasta el documento</a></p>
</body>
</html>
`;
}

function collect() {
  const files = [];
  PAGES.forEach(p => files.push({ out: p.out, kind: 'page', src: p.src }));
  DOCS.forEach(d => files.push({ out: d.out, kind: 'doc', src: d.src }));
  // Se miran AQUÍ, no en las constantes de más abajo.
  //
  // `--list` reventaba con "Cannot access 'haveLogo' before initialization":
  // collect() se llama en la línea 298 y los `const haveLogo/haveFavi` están en
  // la 330, así que en modo lista caían en la zona muerta del `const` y el
  // comando salía con un volcado de pila en vez de la lista. El build normal
  // nunca lo vio porque llama a collect() al final, cuando ya existen — que es
  // justamente por qué llevaba roto sin que nadie se enterara.
  //
  // Las rutas se componen aquí desde ROOT —que sí está arriba— en vez de usar
  // LOGO_SRC/FAVI_SRC, que están en la misma zona muerta por el mismo motivo.
  // Así esta función no depende del orden de ninguna línea, que es la clase de
  // arreglo que no se puede volver a romper moviendo código.
  const activos = [
    { out: 'logo.png',    src: 'landing/assets/logo.png' },
    { out: 'favicon.svg', src: 'landing/assets/favicon.svg' },
    { out: 'og.jpg',      src: 'landing/assets/og.jpg' }
  ];
  activos.forEach(a => {
    if (fs.existsSync(path.join(ROOT, a.src))) files.push({ out: a.out, kind: 'asset', src: a.src });
  });
  REDIRECTS.forEach(r => files.push({ out: r.out || r.from, kind: 'generated',
    src: '(dirección vieja → ' + r.to + ')' }));
  files.push({ out: 'sitemap.xml', kind: 'generated', src: '(every page above, with its date)' });
  files.push({ out: 'robots.txt',  kind: 'generated', src: '(open, and points at the sitemap)' });
  files.push({ out: 'llms.txt',    kind: 'generated', src: '(the same list, for an assistant)' });
  files.push({ out: 'CNAME', kind: 'generated', src: '(the custom domain)' });
  files.push({ out: '.nojekyll', kind: 'generated', src: '(stops GitHub Pages processing the files)' });
  files.push({ out: 'README.md', kind: 'generated', src: '(what this repo is, and what it must never contain)' });
  return files;
}

if (process.argv.indexOf('--list') !== -1) {
  console.log('\nWhat build-site.js publishes — and nothing else:\n');
  collect().forEach(f => console.log('  ' + f.out.padEnd(28) + ' ← ' + f.src));
  console.log('\nEverything not on this list is private by construction.\n');
  process.exit(0);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'docs'), { recursive: true });

// One file is called acopio.html in landing/ and index.html on the site, so
// every link written between those files is correct in the folder and broken on
// the web. changelog.html and novedades.html each carried two of them, and both
// answered a click with a 404 for the whole first day the site was up.
//
// Rewriting here rather than editing the sources keeps landing/ browsable as a
// folder — open acopio.html locally and the links still work — while the
// published copy gets the published name. The map is the rename, stated once.
const RENAMES = { 'acopio.html': '/', 'acopio-overview.html': '/detalle.html' };

// THE LOGO. The published page loads its mark from Jose's Google Drive by file
// id. It works today and it is a thread hanging out of the site: move that file,
// change its sharing, or tidy that Drive folder, and the mark vanishes from
// acopio.net with nothing to announce it — the rest of the page renders fine, so
// the first person to notice is a visitor.
//
// The fix is to serve the file from the site. Drop the image at
// landing/assets/logo.png and this build publishes it and rewrites the src to a
// relative path. Until that file exists the hotlink is left ALONE — a build that
// silently pointed at a logo.png nobody had copied would trade a fragile mark
// for a broken one — and the build says out loud that it is still hanging.
const LOGO_SRC = path.join(ROOT, 'landing/assets/logo.png');
const FAVI_SRC = path.join(ROOT, 'landing/assets/favicon.svg');
const LOGO_HOTLINK = /src="https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_-]+(=[a-z0-9]+)?"/g;
const haveLogo = fs.existsSync(LOGO_SRC);
const haveFavi = fs.existsSync(FAVI_SRC);

function localiseLogo(html) {
  return haveLogo ? html.replace(LOGO_HOTLINK, 'src="/logo.png"') : html;
}

// The tab icon. Every page gets it, including the ones generated from markdown,
// which is why it is injected here rather than typed into each source — a
// document added to DOCS tomorrow should not be the one page with a blank tab.
//
// THIS IS THE ONLY PLACE THAT WRITES THIS TAG. headOf() wrote one too for about
// ten minutes, and every page came out with two <link rel="icon"> — harmless in
// a browser and exactly the kind of thing that stops being harmless when the
// two disagree. One owner, and it is this one, because this is the one that
// knows whether the file exists.
function addFavicon(html) {
  if (!haveFavi || /rel="icon"/.test(html)) return html;
  const tag = '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n';
  return /<title>/.test(html) ? html.replace(/<title>/, tag + '<title>') : tag + html;
}

// HTML comments are notes to ourselves, and they ship. The site went up with
// one that named the version the domain was bought in and said out loud that the
// brand's mailbox does not receive mail yet; two more marked the demo video and
// the customer quotes as not-yet-filled. None of that shows on the page, all of
// it shows in "view source", and none of it is a visitor's business.
//
// Deleting them from the sources was the wrong fix — the notes are worth keeping
// where the work happens. Stripping them on the way out keeps both: the private
// file stays annotated, the published file says only what the page says.
//
// Verified safe before switching on: markers are balanced in all four sources
// and neither <!-- nor --> appears inside any <script> or <style>, where a
// regex like this would otherwise cut through live code.
function stripComments(html) {
  return html.replace(/\n?[ \t]*<!--(?![\[>])[\s\S]*?-->/g, '');
}

function rewriteLinks(html) {
  return html.replace(/href="([^":/#][^":]*)"/g, (whole, target) =>
    Object.prototype.hasOwnProperty.call(RENAMES, target)
      ? 'href="' + RENAMES[target] + '"'
      : whole);
}

/* The four landing files are fragments: they start at <title> and end at the
 * last </div>. wrapPage gives them the head they never had and closes the
 * document properly.
 *
 * The fragment's own <title> comes OUT, because headOf has already written one
 * from the list above. Two <title> tags is not an error a browser reports — it
 * silently keeps the first and ignores the second — so leaving both there would
 * mean editing the list and seeing nothing change, which is worse than a crash.
 *
 * Everything else in the fragment stays exactly where it is. The preconnects,
 * the stylesheet link and the <style> block are head content, and the parser
 * keeps them in the head; the first <div> closes the head and opens the body by
 * itself, which is the same implicit split that was already happening — only
 * now it happens in standards mode instead of quirks mode. */
function wrapPage(html, meta) {
  const sinTitulo = html.replace(/[ \t]*<title>[\s\S]*?<\/title>\s*\n?/i, '');
  // La ficha, sólo en la portada: es la ficha DEL PRODUCTO, y repetirla en cada
  // página no la hace más cierta — hace que haya cinco copias que mantener.
  const ficha = meta.out === 'index.html' ? '\n' + fichaJsonLd(meta) : '';
  return headOf(meta) + ficha + '\n' + sinTitulo.replace(/\s*$/, '') + '\n</body>\n</html>\n';
}

PAGES.forEach(p => {
  const src = path.join(ROOT, p.src);
  if (!fs.existsSync(src)) throw new Error('missing: ' + p.src);
  fs.writeFileSync(path.join(OUT, p.out),
    addFavicon(wrapPage(localiseLogo(rewriteLinks(stripComments(fs.readFileSync(src, 'utf8')))), p)));
});

if (haveLogo) fs.copyFileSync(LOGO_SRC, path.join(OUT, 'logo.png'));
if (haveFavi) fs.copyFileSync(FAVI_SRC, path.join(OUT, 'favicon.svg'));

/* La tarjeta de compartir. La dibuja tools/build-og-image.js con el navegador y
 * las fuentes de la marca; aquí sólo se copia.
 *
 * Si no está, se dice EN VOZ ALTA y no se calla: las once páginas llevan la
 * etiqueta og:image apuntando a ella, así que sin el fichero cada enlace pegado
 * en un WhatsApp pide una imagen que da 404 — que se ve exactamente igual que
 * no tener ninguna, pero habiendo creído que sí. */
const OG_SRC = path.join(ROOT, 'landing/assets/og.jpg');
const haveOg = fs.existsSync(OG_SRC);
if (haveOg) fs.copyFileSync(OG_SRC, path.join(OUT, 'og.jpg'));

DOCS.forEach(d => {
  const src = path.join(ROOT, d.src);
  if (!fs.existsSync(src)) throw new Error('missing: ' + d.src);
  const md = fs.readFileSync(src, 'utf8');
  // stripComments BEFORE mdToHtml, not after — and that ordering is the whole
  // point, not a style choice.
  //
  // Running it after put the note at the top of terms.html and privacy.html on
  // the public site as VISIBLE BODY TEXT: mdToHtml escapes <!-- into &lt;!-- and
  // wraps it in a <p>, so by the time stripComments looked there was no comment
  // left to find — only a paragraph telling every visitor which file to edit and
  // that the text is mirrored inside Index_v3_fixed.html. It shipped, and Jose
  // found it by reading his own site.
  //
  // The post-conversion pass stays as well: a document may contain a real HTML
  // comment that survives conversion, and that one still has to go.
  fs.writeFileSync(path.join(OUT, d.out),
    addFavicon(docShell(d, stripComments(mdToHtml(stripComments(md))))));
});

/* Se escriben ANTES del sitemap para que no haga falta acordarse de excluirlas:
 * el sitemap se construye de PAGES y DOCS, y éstas no están en ninguna de las
 * dos. Una redirección en un sitemap es mandar al buscador a dar un rodeo. */
REDIRECTS.forEach(r => fs.writeFileSync(path.join(OUT, r.from), redirectShell(r)));
escribirSitemap();
escribirRobots();
escribirLlms();
fs.writeFileSync(path.join(OUT, 'CNAME'), DOMAIN + '\n');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'README.md'),
`# ${DOMAIN}

The public site for Acopio. **Generated — do not edit here.**

Every file in this repository is written by \`tools/build-site.js\` in the
private application repository, from a list that names each file and why it is
public. Editing a page here means the next build overwrites it.

## What must never appear in this repository

- \`Code_v3_fixed.gs\` or \`Index_v3_fixed.html\` — the application itself.
- Anything about pricing strategy, competitors or the roadmap.
- The installation runbook or the master-template notes.
- Any credential, stored-property name, spreadsheet address or deployment id.

The build is default-deny — a file is published only if it is named in
\`build-site.js\` — and \`tools/test-site-privacy.js\` re-derives the same set,
refuses anything outside it, and greps the built output for the strings above
before it can be pushed.
`);

const n = collect().length;
console.log('\n  built _site/ — ' + n + ' files');
console.log('  domain: ' + DOMAIN);
if (!haveOg) {
  console.log('\n  WARNING — landing/assets/og.jpg is missing.');
  console.log('  Every page points at /og.jpg, so pasting a link anywhere asks');
  console.log('  for an image that 404s. Build it:');
  console.log('    NODE_PATH="$(npm root -g)" \\');
  console.log('    CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \\');
  console.log('    node tools/build-og-image.js');
}
if (!haveLogo) {
  console.log('\n  WARNING — the logo is still hotlinked from Google Drive.');
  console.log('  Put the image at landing/assets/logo.png and build again;');
  console.log('  it will be published and the src made relative. Until then the');
  console.log('  mark on the live site depends on that Drive file staying shared.');
}
console.log('\n  Run tools/test-site-links.js and tools/test-site-privacy.js');
console.log('  before pushing. Always.\n');
