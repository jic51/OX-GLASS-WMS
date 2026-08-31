// SITE LINKS — does the site actually work as a site?
//
// tools/test-site-privacy.js answers "is anything published that shouldn't be?"
// It never asked the opposite question, and the opposite question is where the
// site broke on day one:
//
//   the footer shipped three links reading href="#"  — Privacy, Terms, What's
//   new, all three dead, on the only page a visitor lands on
//
//   changelog.html and novedades.html linked to acopio.html, which is the name
//   the file has in landing/ and NOT the name it has on the web (index.html),
//   so four links answered a click with a 404
//
//   detalle.html and the four documents under docs/ were published and
//   unreachable — no page linked to them at all. They were live for a day and
//   the only way in was to already know the URL.
//
// Every one of those passed the privacy guard, because none of them leaks
// anything. A page nobody can reach is not published, and a link that goes
// nowhere is worse than no link — it tells the reader the site is broken.
//
// Three checks, in the order a visitor would hit them:
//
//   1. RESOLVES — every local href points at a file that exists.
//   2. NO DEAD ENDS — no href="#", which is a link the author had not
//      finished writing.
//   3. REACHABLE — every published page can be reached from index.html by
//      following links. This is the check that would have caught the orphans.
//
// Usage:  node tools/test-site-links.js     (run tools/build-site.js first)

const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT  = path.join(ROOT, '_site');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

if (!fs.existsSync(OUT)) {
  console.error('\n  _site/ does not exist. Run: node tools/build-site.js\n');
  process.exit(2);
}

function walk(dir, base) {
  base = base || dir;
  let out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, base));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  });
  return out;
}

const all   = walk(OUT);
const pages = all.filter(f => /\.html$/.test(f)).sort();

// Resolve an href the way a browser on this site would: absolute paths from the
// root, relative ones from the folder the page is in, "/" and "" as index.html.
function resolve(href, fromPage) {
  const clean = href.replace(/[?#].*$/, '');
  if (clean === '' || clean === '/') return 'index.html';
  let p = clean.startsWith('/')
    ? clean.slice(1)
    : path.posix.join(path.posix.dirname(fromPage), clean);
  p = path.posix.normalize(p);
  if (p.endsWith('/')) p += 'index.html';
  return p;
}

// Two spellings, and missing the second one is how the Spanish half of the
// landing kept a dead link after the English half was fixed.
//
// The landing is one file in two languages: English lives in the markup, Spanish
// in a JavaScript dictionary that gets written into innerHTML. So half the
// site's links are not markup at all — they are inside string literals, written
// href=\"...\" with the quotes escaped. A checker that only reads href="..."
// declares the page clean while every Spanish reader clicks into nothing.
//
// Same rule as the endpoint tests: a guard that can only see one of the two
// places a thing is written is a guard that reports on half the site.
function localHrefs(text) {
  const plain   = (text.match(/href="[^"]*"/g)     || []).map(h => h.slice(6, -1));
  const escaped = (text.match(/href=\\"[^"\\]*\\"/g) || []).map(h => h.slice(7, -2));
  return plain.concat(escaped)
    .filter(h => !/^(https?:|mailto:|tel:|data:|javascript:)/i.test(h));
}

const read = {};
pages.forEach(p => { read[p] = fs.readFileSync(path.join(OUT, p), 'utf8'); });

// ── 1. Every local link resolves to a file that exists ──────────────────────
console.log('\n═══ every link goes somewhere ═══\n');
{
  const broken = [];
  pages.forEach(p => {
    localHrefs(read[p]).forEach(h => {
      if (h.startsWith('#')) return;            // in-page anchor, checked below
      const target = resolve(h, p);
      if (all.indexOf(target) === -1) broken.push(p + ' → ' + h);
    });
  });
  check('no published page links to a file that is not published' +
        (broken.length ? '\n         ' + broken.join('\n         ') : ''),
    broken.length === 0);
}

// ── 2. No unfinished links ──────────────────────────────────────────────────
console.log('\n═══ no link was left unfinished ═══\n');
{
  const dead = [];
  pages.forEach(p => {
    const n = localHrefs(read[p]).filter(h => h === '#').length;
    if (n) dead.push(p + ' (' + n + ')');
  });
  check('no href="#" anywhere — that is a link somebody meant to fill in' +
        (dead.length ? ' — found in: ' + dead.join(', ') : ''), dead.length === 0);

  // An anchor link that points at an id no page carries is the same mistake
  // wearing a different hat.
  const lost = [];
  pages.forEach(p => {
    localHrefs(read[p]).forEach(h => {
      if (!h.startsWith('#') || h === '#') return;
      const id = h.slice(1);
      if (!new RegExp('id="' + id.replace(/[^\w-]/g, '') + '"').test(read[p]))
        lost.push(p + ' → ' + h);
    });
  });
  check('every in-page anchor points at an id that page actually has' +
        (lost.length ? ' — ' + lost.join(', ') : ''), lost.length === 0);
}

// ── 3. Every page is reachable from the front door ──────────────────────────
console.log('\n═══ a visitor can get to every page ═══\n');
{
  const seen = new Set(['index.html']);
  const queue = ['index.html'];
  while (queue.length) {
    const p = queue.shift();
    localHrefs(read[p] || '').forEach(h => {
      if (h.startsWith('#')) return;
      const t = resolve(h, p);
      if (/\.html$/.test(t) && !seen.has(t) && read[t] !== undefined) {
        seen.add(t); queue.push(t);
      }
    });
  }
  const orphans = pages.filter(p => !seen.has(p));
  check('every published page is reachable from index.html by clicking' +
        (orphans.length ? ' — UNREACHABLE: ' + orphans.join(', ') : ''),
    orphans.length === 0);
  check('...and that walk found all ' + pages.length + ' pages', seen.size === pages.length);
}

// ── 4. The way back ─────────────────────────────────────────────────────────
console.log('\n═══ and get back out again ═══\n');
{
  const trapped = pages.filter(p => {
    if (p === 'index.html') return false;
    return !localHrefs(read[p]).some(h => resolve(h, p) === 'index.html');
  });
  check('no page is a dead end — each one links home' +
        (trapped.length ? ' — no way back from: ' + trapped.join(', ') : ''),
    trapped.length === 0);
}

console.log('\n' + '─'.repeat(72));
console.log('The privacy guard asks what must not be published. This one asks');
console.log('whether what WAS published can actually be used. Both have to pass.');
console.log('─'.repeat(72));

console.log('\nsite links: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
