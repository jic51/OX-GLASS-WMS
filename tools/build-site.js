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
const PAGES = [
  { src: 'landing/acopio.html',          out: 'index.html',
    why: 'The landing page itself, both languages in one file.' },
  { src: 'landing/acopio-overview.html', out: 'detalle.html',
    why: 'The long-form product description — what it does, screen by screen.' },
  { src: 'landing/changelog.html',       out: 'changelog.html',
    why: 'Every change that reaches a customer installation, in English.' },
  { src: 'landing/novedades.html',       out: 'novedades.html',
    why: 'The same changelog in Spanish. The two are kept level by check-changelog.js.' }
];

const DOCS = [
  { src: 'docs/INSTALL-GUIDE.md',           out: 'docs/instalacion.html',
    title: 'Guía de instalación', lang: 'es',
    why: 'A customer cannot install without it. Written for them, not for Jose.' },
  { src: 'docs/CUSTOMER-SETUP.md',          out: 'docs/setup.html',
    title: 'Setting up your warehouse system', lang: 'en',
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
    why: 'The customer half, written from scratch. This is the document the ' +
         'comment above says was missing — the private RESTAURAR-UN-BACKUP.md ' +
         'stays private and is NOT its source.' },
  { src: 'docs/VISTA-POR-PASILLO.md',       out: 'docs/vista-por-pasillo.html',
    title: 'La vista por pasillo', lang: 'es',
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
    why: 'The customer half: what it costs, when, and what happens if something ' +
         'goes wrong. A promise nobody can read is not one — but it has to be ' +
         'written TO them.' },
  { src: 'legal/TERMS-OF-SERVICE.md',       out: 'terms.html',
    title: 'Terms of Service', lang: 'en',
    why: 'Has to be public — the app links to it from its own footer.' },
  { src: 'legal/PRIVACY-POLICY.md',         out: 'privacy.html',
    title: 'Privacy Policy', lang: 'en',
    why: 'Same: linked from the app, and required by Google for the consent screen.' }
];

// The custom domain. One name, chosen once — Jose picked the www form, and a
// site that answers on two names without redirecting is two sites as far as
// search engines and cookies are concerned.
const DOMAIN = 'www.acopio.net';

// ── Everything below is machinery ───────────────────────────────────────────

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
function docShell(title, lang, bodyHtml) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Acopio</title>
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

function collect() {
  const files = [];
  PAGES.forEach(p => files.push({ out: p.out, kind: 'page', src: p.src }));
  DOCS.forEach(d => files.push({ out: d.out, kind: 'doc', src: d.src }));
  if (haveLogo) files.push({ out: 'logo.png',    kind: 'asset', src: 'landing/assets/logo.png' });
  if (haveFavi) files.push({ out: 'favicon.svg', kind: 'asset', src: 'landing/assets/favicon.svg' });
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

PAGES.forEach(p => {
  const src = path.join(ROOT, p.src);
  if (!fs.existsSync(src)) throw new Error('missing: ' + p.src);
  fs.writeFileSync(path.join(OUT, p.out),
    addFavicon(localiseLogo(rewriteLinks(stripComments(fs.readFileSync(src, 'utf8'))))));
});

if (haveLogo) fs.copyFileSync(LOGO_SRC, path.join(OUT, 'logo.png'));
if (haveFavi) fs.copyFileSync(FAVI_SRC, path.join(OUT, 'favicon.svg'));

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
    addFavicon(docShell(d.title, d.lang, stripComments(mdToHtml(stripComments(md))))));
});

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
if (!haveLogo) {
  console.log('\n  WARNING — the logo is still hotlinked from Google Drive.');
  console.log('  Put the image at landing/assets/logo.png and build again;');
  console.log('  it will be published and the src made relative. Until then the');
  console.log('  mark on the live site depends on that Drive file staying shared.');
}
console.log('\n  Run tools/test-site-links.js and tools/test-site-privacy.js');
console.log('  before pushing. Always.\n');
