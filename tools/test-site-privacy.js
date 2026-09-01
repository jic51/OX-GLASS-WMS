// SITE PRIVACY — the lock on the door between Jose's papers and the internet.
//
// The public site is built by tools/build-site.js from a list that names every
// published file. That list is default-deny, which is the right shape. But a
// list is a decision somebody made once, and this whole codebase is a museum of
// decisions that were right when written and quietly stopped being true:
//
//   the header comment naming the app's public entry points, five names stale
//   the paragraph saying every role display went through _displayRole, false
//   an assertion copied off a call site, freezing the bug it was meant to guard
//
// Each of those cost weeks. None of them could cost Jose his margins. This one
// could, so it gets two locks that do not depend on each other:
//
//   LOCK 1 — the SET. Re-derive what build-site.js publishes and refuse any
//   file that is not one of the seven documents and four pages agreed as
//   public. A file added to docs/ tomorrow fails here rather than shipping.
//
//   LOCK 2 — the CONTENT. Grep the BUILT OUTPUT for the things that must never
//   leave, whatever file they are in. Lock 1 cannot catch a public document
//   that grows a paragraph about the OAuth client; this can.
//
// Usage:  node tools/test-site-privacy.js
//         (run tools/build-site.js first — this reads _site/)

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

const built = walk(OUT).sort();

// ── LOCK 1 — nothing outside the agreed set ─────────────────────────────────
console.log('\n═══ lock 1 — only what was agreed is there ═══\n');

// Written out by hand rather than imported from build-site.js. Importing the
// list would mean the guard and the thing it guards share one source of truth,
// so a mistake in that list would be invisible to both. Two independent
// statements of the same intent is the entire point.
const ALLOWED = [
  'CNAME', 'README.md', '.nojekyll',
  'index.html', 'detalle.html', 'changelog.html', 'novedades.html',
  'terms.html', 'privacy.html',
  'docs/instalacion.html', 'docs/setup.html',
  'docs/vista-por-pasillo.html', 'docs/soporte.html',
  // El documento del cliente para volver a una copia. Escrito desde cero: el
  // RESTAURAR-UN-BACKUP.md privado NO es su fuente y sigue sin publicarse.
  'docs/restaurar.html',
  // The mark and the tab icon. Added deliberately, and only after this guard
  // refused them — which is the arrangement working: a file appearing in _site/
  // has to be argued for here before it can ship. They replace a hotlink to a
  // file in Jose's Drive, so the site's own logo stops depending on that file
  // staying shared.
  'logo.png', 'favicon.svg'
  // restaurar-backup.html is deliberately absent — see build-site.js. This
  // guard is what removed it, on its first run, by reading what it said.
];

const extra = built.filter(f => ALLOWED.indexOf(f) === -1);
check('no file was published that this guard does not also recognise' +
      (extra.length ? ' — UNEXPECTED: ' + extra.join(', ') : ''), extra.length === 0);

const missing = ALLOWED.filter(f => built.indexOf(f) === -1);
check('every agreed file was actually built' +
      (missing.length ? ' — MISSING: ' + missing.join(', ') : ''), missing.length === 0);
check('the site is ' + built.length + ' files, which is a number a person can check by eye',
  built.length === ALLOWED.length);

// The two files that ARE the product.
check('Code_v3_fixed.gs is not in the site', built.indexOf('Code_v3_fixed.gs') === -1);
check('Index_v3_fixed.html is not in the site', built.indexOf('Index_v3_fixed.html') === -1);
check('no .gs file of any name reached the site',
  built.every(f => !/\.gs$/i.test(f)));
check('no raw .md reached the site except the generated README — the source ' +
      'documents live in the private repository and are converted on the way out',
  built.filter(f => /\.md$/i.test(f)).join() === 'README.md');

// ── The private documents, named ────────────────────────────────────────────
console.log('\n═══ the papers that must never be published ═══\n');
{
  // Named individually, with what each would cost. A count would be cheaper to
  // write and would say nothing when it failed.
  const NEVER = {
    'PROTEGER-EL-CODIGO':   'the map for walking past the code protections',
    'PRECIOS-Y-COMPETENCIA':'the margins and the competitor research',
    'PLAN-5-ANIOS':         'the five-year plan',
    'VENTAS':               'the sales guide',
    'ANTES-DE-VENDER':      'Jose\'s own pre-sale checklist',
    'RUNBOOK-INSTALACION':  'the installer runbook — names the OAuth client and Script Properties',
    'ACCESO-Y-LOGIN':       'how login is wired, including what to check when it breaks',
    'MASTER-TEMPLATE':      'how the master copy is built',
    'BACKLOG':              'everything not built yet, and every bug not fixed yet',
    'CONCURRENCIA':         'a frank analysis of what is still at risk under load, and ' +
                            'the script for the live test — which names the two open findings',
    'SPEC':                 'the internal specification',
    'LICENCIA-E-INTEGRIDAD':'how misuse would be detected',
    'CUANDO-SE-LLENE':      'the plan for when a customer sheet fills up',
    'ICONO-DE-PESTANA':     'internal working note',
    'UNIDADES-Y-CONVERSIONES':'internal design note',
    'FINDING-drive-file':   'internal research note',
    'LANDING':              'the plan for this very site',
    'WELCOME-EMAIL':        'the template Jose sends, not something to publish'
  };
  const leaked = Object.keys(NEVER).filter(stem =>
    built.some(f => f.toUpperCase().indexOf(stem.toUpperCase()) !== -1));
  check('not one of the ' + Object.keys(NEVER).length + ' private documents reached the site' +
        (leaked.length ? ' — LEAKED: ' + leaked.map(k => k + ' (' + NEVER[k] + ')').join('; ') : ''),
    leaked.length === 0);

  // And they still exist where they belong — a "fix" that deleted them would
  // also pass the check above.
  const gone = Object.keys(NEVER).filter(stem => {
    const hits = fs.readdirSync(path.join(ROOT, 'docs'))
      .filter(f => f.toUpperCase().indexOf(stem.toUpperCase()) !== -1);
    return hits.length === 0;
  });
  check('...and they are all still in the private repository, where they belong' +
        (gone.length ? ' — cannot find: ' + gone.join(', ') : ''), gone.length === 0);
}

// ── LOCK 2 — the content of what WAS published ──────────────────────────────
console.log('\n═══ lock 2 — what the published files actually say ═══\n');
{
  const corpus = built
    .filter(f => f !== '.nojekyll')
    .map(f => ({ f: f, t: fs.readFileSync(path.join(OUT, f), 'utf8') }));

  // Each pattern is a thing that has no business on a public page, whatever
  // file it turns up in. This is the lock that catches a PUBLIC document
  // growing a private paragraph — which lock 1 cannot see.
  const FORBIDDEN = [
    [/OAUTH_CLIENT_SECRET/,        'the OAuth client secret property name'],
    [/OAUTH_CLIENT_ID/,            'the OAuth client id property name'],
    [/SESSION_SECRET/,             'the session signing key property name'],
    [/GOCSPX-/,                    'a Google client secret, verbatim'],
    // Deployment ids are checked below rather than here, because exactly ONE is
    // allowed and a blanket ban would have been answered by deleting the rule.
    // See "the one endpoint that is meant to be public".
    [/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]{20,}/, 'a real spreadsheet URL'],
    // Jose's Gmail is NOT here, and deleting the check was not the fix.
    //
    // It failed on the first run, correctly: a personal Gmail standing as the
    // public contact of a commercial site is a thing to decide, not to
    // discover. Jose decided on 2026-08-29 — acopio.net has no mailbox yet, so
    // the Gmail stands in for now.
    //
    // A decision is not the same as no check. The address is named below as
    // CONTACT_EMAIL and asserted to appear ONLY where a contact belongs, and no
    // OTHER personal address may appear anywhere. So the day the mailbox
    // exists, changing it is one edit here and three in the sources — and until
    // then, the placeholder cannot quietly spread into a doc page.
    [/\bmargen(es)?\b/i,           'margin talk'],
    [/precio de costo/i,           'cost-price talk'],
    [/Script Propert/i,            'instructions about Script Properties'],
    [/\bcompetencia\b/i,           'the competitor research'],
    [/withStockLock_|requireAuth_|getInitialData/, 'internal function names — the shape of the source'],
    // A note to ourselves that reached the page as READABLE TEXT.
    //
    // The legal markdown opens with an HTML comment naming the source of truth
    // and saying the text is mirrored inside the app's own file. build-site.js
    // stripped comments AFTER converting the markdown — by which point mdToHtml
    // had escaped <!-- into &lt;!-- and wrapped it in a <p>. Nothing was
    // stripped, and the note stood at the top of the published terms and
    // privacy pages in full view of every visitor.
    //
    // Both locks passed it. Lock 1 only asks WHICH files shipped, and this list
    // had no pattern for it. Jose found it by reading his own site.
    //
    // Three patterns, because they fail differently: the note itself; any
    // escaped comment marker at all, which catches the next document that opens
    // with a comment nobody has thought of yet; and the names of the two
    // application files, which a public page has no reason to mention.
    [/SOURCE OF TRUTH/i,             'the "source of truth" note, as visible text'],
    [/&lt;!--/,                      'an HTML comment escaped into readable text instead ' +
                                     'of stripped — see stripComments in build-site.js'],
  ];

  FORBIDDEN.forEach(([re, what]) => {
    const hits = corpus.filter(c => re.test(c.t)).map(c => c.f);
    check('no published page contains ' + what +
          (hits.length ? ' — found in: ' + hits.join(', ') : ''), hits.length === 0);
  });

  // ── The one endpoint that is meant to be public ───────────────────────
  // A /exec address on a public page IS the address of a live Apps Script
  // deployment, and the rule that bans them is right: every customer install
  // has one, and publishing any of those hands a stranger the front door of
  // somebody's warehouse.
  //
  // This one is different in kind, not in degree. It is the contact form's
  // receiver — a standalone project that shares no sheet, no properties and no
  // permissions with any installation. It has to be public or the form cannot
  // post to it, and the worst anyone gets by abusing it is junk in a leads
  // sheet. Jose deployed it on 2026-08-31.
  //
  // So it is named here, exactly, and every OTHER deployment id is still
  // refused. A ban with no exception is a ban that gets deleted the first time
  // it is inconvenient; this one survives because the exception is written down.
  {
    const FORM_ENDPOINT = 'AKfycbxZGYzzytX6zAQe-IDddM4LQwzQia17Dtl9Ape4YWmmAcQgcRXPV9QfezwpWtk28Wo3';
    const MAY_CARRY_ENDPOINT = ['index.html'];

    const strays = [];
    corpus.forEach(c => {
      (c.t.match(/AKfycb[A-Za-z0-9_-]{20,}/g) || []).forEach(id => {
        if (id !== FORM_ENDPOINT) strays.push(c.f + ' → ' + id.slice(0, 16) + '…');
        else if (MAY_CARRY_ENDPOINT.indexOf(c.f) === -1) strays.push(c.f + ' → the form endpoint');
      });
    });
    check('the only deployment id on the site is the contact form\'s receiver, ' +
          'and only on ' + MAY_CARRY_ENDPOINT.join(', ') +
          (strays.length ? ' — ALSO FOUND: ' + strays.join('; ') : ''), strays.length === 0);

    const onForm = corpus.some(c => c.f === 'index.html' && c.t.indexOf(FORM_ENDPOINT) !== -1);
    check('...and it is actually there, so the form is not silently back to ' +
          'opening a mail client', onForm);
  }

  // ── The application's own filenames ───────────────────────────────────
  // Not on the FORBIDDEN list above, because two pages have to name them and a
  // blanket ban would have been answered by deleting the check.
  //
  //   docs/instalacion.html — the customer pastes those two files into Apps
  //   Script. Naming them IS the document.
  //
  //   README.md — names them in order to forbid them.
  //
  // Everywhere else there is no reason, and twice there was no reason: both the
  // landing and the overview carried a CSS comment saying the palette came from
  // Index_v3_fixed.html. Harmless on its own, and exactly the class of leftover
  // that put the "source of truth" note on the terms page — a note to ourselves
  // that shipped because nothing was looking.
  {
    const MAY_NAME_SOURCES = ['docs/instalacion.html', 'README.md'];
    const named = corpus
      .filter(c => /Index_v3_fixed|Code_v3_fixed/.test(c.t))
      .map(c => c.f)
      .filter(f => MAY_NAME_SOURCES.indexOf(f) === -1);
    check('the application filenames appear only where a reader needs them ' +
          '(' + MAY_NAME_SOURCES.join(', ') + ')' +
          (named.length ? ' — also in: ' + named.join(', ') : ''), named.length === 0);
  }

  // ── The public contact address ────────────────────────────────────────
  // PLACEHOLDER, on the record. Jose, 2026-08-29: "aún no tengo correo de
  // acopio, pero puedes poner joseisrael5101@gmail.com por ahora." Replacing
  // it later is one line here and three in the sources.
  const CONTACT_EMAIL = 'joseisrael5101@gmail.com';
  const MAY_CARRY_CONTACT = ['index.html', 'terms.html', 'privacy.html'];

  const carriers = corpus.filter(c => c.t.indexOf(CONTACT_EMAIL) !== -1).map(c => c.f);
  check('the contact address is on the pages where a reader looks for it (' +
        carriers.join(', ') + ')', carriers.length >= 1);
  const strays = carriers.filter(f => MAY_CARRY_CONTACT.indexOf(f) === -1);
  check('...and NOWHERE else — a placeholder that spreads is a placeholder ' +
        'nobody manages to replace' +
        (strays.length ? ' — also in: ' + strays.join(', ') : ''), strays.length === 0);

  // Any OTHER address is either a leak or a mistake. The support one is a
  // business address by definition; a second personal one is neither.
  const addrs = {};
  corpus.forEach(c => (c.t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
    .forEach(a => { if (a !== CONTACT_EMAIL) addrs[a.toLowerCase()] = 1; }));
  const others = Object.keys(addrs).filter(a => !/@(example|acopio)\./.test(a));
  check('no second personal address appears anywhere on the site' +
        (others.length ? ' — found: ' + others.join(', ') : ''), others.length === 0);

  const support = corpus.filter(c => /soporte|terms|privacy/.test(c.f));
  check('the support and legal pages were built (' + support.length + ')', support.length >= 3);
}

// ── The domain ──────────────────────────────────────────────────────────────
console.log('\n═══ the domain ═══\n');
{
  const cname = fs.readFileSync(path.join(OUT, 'CNAME'), 'utf8').trim();
  check('CNAME names exactly one host (' + cname + ') — two names without a ' +
        'redirect is two sites to a search engine and to a cookie',
    cname === 'www.acopio.net');
  check('...and it is the www form Jose chose', /^www\./.test(cname));
  check('.nojekyll is present, so GitHub Pages serves the files as written ' +
        'rather than running them through Jekyll',
    fs.existsSync(path.join(OUT, '.nojekyll')));
  check('the README says the repository is generated, so nobody edits a page ' +
        'here and loses it on the next build',
    /do not edit here/i.test(fs.readFileSync(path.join(OUT, 'README.md'), 'utf8')));
}

console.log('\n' + '─'.repeat(72));
console.log('Two locks, deliberately independent: the allow-list here is written');
console.log('out by hand rather than imported from build-site.js, so one wrong');
console.log('list cannot satisfy both. Nothing is pushed until this passes.');
console.log('─'.repeat(72));

console.log('\nsite privacy: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
