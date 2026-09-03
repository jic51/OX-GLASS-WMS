// Keeps the legal texts in legal/*.md and the copies embedded in the app
// (LEGAL_DOCS in Index_v3_fixed.html) from drifting apart.
//
// WHY THIS EXISTS: the drift already happened once and it mattered. v9.77
// added the setup check-in, which emails us the company name, the admin's
// address and a couple of counts — while the privacy policy in both places
// still said we receive nothing at all. A promise broken in writing is worse
// than a missing feature, and nothing in the toolchain could see it, because
// a stale sentence is perfectly valid HTML and perfectly valid Markdown.
//
// The .md file is the source of truth (its own header says so); the copy
// inside the app exists because every customer runs their own copy with
// nowhere to link out to.
//
// This does not diff the prose word for word — the two are deliberately
// different formats. It checks the things that actually go wrong: the same
// "last updated" date, the same section headings, and that specific
// disclosures a customer relies on are present in BOTH.
//
// Usage:  node tools/test-legal-sync.js

const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// Pull one entry out of the LEGAL_DOCS object literal.
function appDoc(key) {
  const start = HTML.indexOf(key + ':', HTML.indexOf('LEGAL_DOCS'));
  if (start === -1) throw new Error('LEGAL_DOCS entry not found: ' + key);
  const open = HTML.indexOf('`', start);
  const close = HTML.indexOf('`', open + 1);
  return HTML.slice(open + 1, close);
}

const docs = [
  { key: 'privacy', file: 'legal/PRIVACY-POLICY.md', label: 'Privacy Policy' },
  { key: 'terms',   file: 'legal/TERMS-OF-SERVICE.md', label: 'Terms of Service' }
];

for (const d of docs) {
  console.log('\n' + d.label);
  const md = fs.readFileSync(path.join(ROOT, d.file), 'utf8');
  const app = appDoc(d.key);

  const mdDate = (md.match(/\*\*Last updated:\*\*\s*(.+)/) || [])[1];
  const appDate = (app.match(/<strong>Last updated:<\/strong>\s*([^<]+)</) || [])[1];
  check('both carry a "Last updated" date', !!mdDate && !!appDate);
  check('the dates match (' + String(mdDate).trim() + ' vs ' + String(appDate).trim() + ')',
    String(mdDate).trim() === String(appDate).trim());

  // Numbered section headings must line up one for one.
  const mdHeads = (md.match(/^## \d+\..+$/gm) || []).map(h => h.replace(/^## /, '').trim());
  const appHeads = (app.match(/<h3>\d+\..*?<\/h3>/g) || [])
    .map(h => h.replace(/<\/?h3>/g, '').replace(/<[^>]+>/g, '').trim());
  check('same number of numbered sections (' + mdHeads.length + ' vs ' + appHeads.length + ')',
    mdHeads.length === appHeads.length && mdHeads.length > 0);
  mdHeads.forEach((h, i) => {
    if (appHeads[i] !== undefined && appHeads[i] !== h) {
      check('section ' + (i + 1) + ' matches — md "' + h + '" vs app "' + appHeads[i] + '"', false);
    }
  });
  if (mdHeads.every((h, i) => appHeads[i] === h)) check('every section heading matches, in order', true);
}

// Specific promises a customer relies on. These are the sentences that go
// stale when a feature ships and nobody re-reads the policy.
console.log('\nDisclosures that must appear in BOTH copies');
const md = fs.readFileSync(path.join(ROOT, 'legal/PRIVACY-POLICY.md'), 'utf8');
const app = appDoc('privacy');

const musts = [
  ['the setup check-in is disclosed at all', /check-in/i],
  ['...and says it sends without being asked', /without you asking/i],
  ['...and names exactly what it sends', /company name/i],
  ['...and says it stops once a movement is recorded', /stops permanently/i],
  ['...and says nothing sends with no support address configured', /never sends at all/i],
  ['the AI add-on is still disclosed', /Gemini/],
  ['the "no analytics" promise is still there', /analytics/i],
  // The one that carries actual legal weight from v11.23 onward. Taking
  // payment through Stripe makes Stripe a sub-processor, and an undisclosed
  // sub-processor is a real problem under GDPR — not a documentation tidiness
  // issue. It has to be named where a customer would look for it.
  ['Stripe is named as a sub-processor', /Stripe/],
  ['...and the policy still says the INVENTORY has no sub-processor',
    /none, because we do not process it/i],
  ['...and says the card number never reaches us', /never\s+reaches us/i]
];
// Whitespace is collapsed before matching. The .md is hard-wrapped at 80
// columns and the app copy is one long line per paragraph, so any phrase long
// enough to be worth asserting will be split by a newline in one copy and not
// the other — which is how the first version of the card-number check reported
// a promise as missing from a file it was sitting in.
for (const [label, re] of musts) {
  const inMd = re.test(md.replace(/\s+/g, ' ')), inApp = re.test(app.replace(/\s+/g, ' '));
  check(label + (inMd && inApp ? '' : ' — md:' + inMd + ' app:' + inApp), inMd && inApp);
}

// The absolute claim that was false. It must not come back in either copy.
console.log('\nClaims that must NOT reappear');
const tooAbsolute = /produces nothing about your business, because we hold nothing/i;
check('no "a subpoena produces nothing because we hold nothing" in the .md', !tooAbsolute.test(md));
check('...nor in the app copy', !tooAbsolute.test(app));

// ── The THIRD copy: the two tabs in the customer's own spreadsheet ──────────
//
// This one is read at the moment that legally matters — the consent checkbox
// on the START HERE sheet, before setup has run and before there is any URL to
// link out to. It is generated by tools/sync-legal.js rather than maintained
// by hand, precisely so that it cannot be the copy that goes stale.
console.log('\nThe copy the customer reads before ticking the box');
const { execFileSync } = require('child_process');
try {
  execFileSync(process.execPath, [path.join(__dirname, 'sync-legal.js'), '--check'],
               { stdio: 'pipe' });
  check('Code_v3_fixed.gs legal text is regenerated from legal/*.md (sync-legal.js --check)', true);
} catch (e) {
  check('Code_v3_fixed.gs legal text is regenerated from legal/*.md — run: node tools/sync-legal.js', false);
}

const GS = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const gsBlock = GS.slice(GS.indexOf('var LEGAL_SHEET_TEXT'), GS.indexOf('// ─── END GENERATED LEGAL TEXT'));

check('both documents are in the file the customer opens',
  /terms:\s*\[/.test(gsBlock) && /privacy:\s*\[/.test(gsBlock));

// The dates are the fastest way to spot a copy left behind.
const mdTermsDate   = (/\*\*Last updated:\*\*\s*(.+)/.exec(
  fs.readFileSync(path.join(ROOT, 'legal/TERMS-OF-SERVICE.md'), 'utf8')) || [])[1];
const mdPrivacyDate = (/\*\*Last updated:\*\*\s*(.+)/.exec(md) || [])[1];
check('the Terms date in the sheet copy matches the .md (' + (mdTermsDate || '?').trim() + ')',
  !!mdTermsDate && gsBlock.indexOf('Last updated: ' + mdTermsDate.trim()) !== -1);
check('the Privacy date in the sheet copy matches the .md (' + (mdPrivacyDate || '?').trim() + ')',
  !!mdPrivacyDate && gsBlock.indexOf('Last updated: ' + mdPrivacyDate.trim()) !== -1);

// Our own notes must never reach a customer-facing document. They did on the
// first run of the generator: the "SOURCE OF TRUTH" banner at the top of each
// .md is an HTML comment, and it was copied straight through.
check('none of our internal notes leaked into the customer copy',
  !/SOURCE OF TRUTH/i.test(gsBlock) && !/mirrored inside/i.test(gsBlock) && !/<!--/.test(gsBlock));

// The same disclosures the app copy has to carry.
for (const [label, re] of musts) {
  check('sheet copy: ' + label, re.test(gsBlock));
}
check('sheet copy: the withdrawn absolute claim is not here either', !tooAbsolute.test(gsBlock));

// And the consent row must actually point at them — a document in the file
// that the checkbox never links to is no better than no document.
check('the consent label links "Terms of Service" to its tab',
  /setLinkUrl\(tAt/.test(GS) && /TERMS_SHEET/.test(GS));
check('...and "Privacy Policy" to its tab',
  /setLinkUrl\(pAt/.test(GS) && /PRIVACY_SHEET/.test(GS));
check('the tabs are created before the link is built — a gid does not exist until the tab does',
  GS.indexOf('createLegalSheets_(ss);') < GS.indexOf('sheetLink_(ss, TERMS_SHEET)'));

// ── Support and refund promises, in every copy ─────────────────────────────
//
// These are the sentences a customer quotes back when they are unhappy, so
// they must be identical in the .md, in the app and in the spreadsheet tab —
// and they must not contradict what is being sold.
console.log('\nWhat the support and refund promises actually say');
{
  const mdTerms  = fs.readFileSync(path.join(ROOT, 'legal/TERMS-OF-SERVICE.md'), 'utf8');
  const appTerms = appDoc('terms');
  const sheetTerms = gsBlock.slice(gsBlock.indexOf('terms:'), gsBlock.indexOf('privacy:'));
  // Whitespace-collapsed before matching. The .md hard-wraps at ~80 columns
  // for readable diffs, so a sentence can straddle a newline that the app and
  // the sheet copies do not have — the first run of this failed on "not when
  // the problem will be\nsolved" and would have had me editing a document that
  // was already correct.
  const flat = t => String(t).replace(/\s+/g, ' ');
  const all = [['the .md', flat(mdTerms)], ['the app', flat(appTerms)],
               ['the sheet tab', flat(sheetTerms)]];

  const promises = [
    ['response time is committed, not "best effort"', /within one business day/i],
    ['...and says it is a REPLY, not a fix', /not when the problem will be solved/i],
    ['the setup fee is refundable before the work is done', /Before that work has been done, it is fully refundable/i],
    ['...and not after', /Once the work has been performed, it is not refundable/i],
    ['the 14-day monthly refund window is stated', /within 14 days/i],
    ['unused whole months of an annual are refunded', /whole months you have not yet used are refunded/i],
    ['a defect we cannot fix in 30 days refunds the period', /30 days of you reporting it/i],
    ['what is charged separately is listed', /charged separately/i],
    ['cancelling never switches the software off', /no way to switch it off/i],
    // Billing became Stripe in v11.23, Jose's decision, and these three lines
    // replaced "invoices are payable within 10 days" — a promise that was true
    // of email invoicing and is now false. A test that pins a superseded
    // promise fails the honest change and passes the dishonest one, which is
    // the opposite of its job.
    //
    // Each regex avoids the words carrying bold in the .md and <strong> in the
    // app: markup separates them in two of the three copies.
    ['the processor is named, not left as "we take a card"', /through .{0,20}Stripe/i],
    ['the card is held by Stripe and NOT by us — the sentence a customer looks for',
      /never see, hold or store your card number/i],
    ['the subscription says it charges itself, so no renewal is a surprise',
      /charged .{0,80}on each renewal date/i],
    ['a failed payment PAUSES support rather than the software', /support and new versions/i],
    ['...and the software is never switched off over money', /Nothing is switched off, at any point/i],
    ['...and data is never held hostage for payment', /never withhold your data to get paid/i],
    // Estas tres cambiaron el 01/09, con la decisión de Jose, y las tres
    // aserciones se reescribieron con ellas — no se aflojaron.
    //
    // Antes los Términos prometían "no reconnection fee" y trataban a quien
    // volvía como cliente nuevo, o sea con la instalación otra vez: $500. La
    // escalera nueva es MÁS BARATA para el cliente (nada hasta 2 meses, $150
    // después, instalación nueva pasado el año), así que esto es mejorar la
    // promesa y no recortarla.
    //
    // Lo que se exige ahora es que los tres escalones estén escritos. Un
    // contrato que dice "un cargo adicional" sin decir cuánto no es un
    // contrato: es una discusión aplazada hasta el día en que alguien la
    // pierda.
    // Escrito como LISTA y no como tabla, y eso no es estilo: sync-legal.js no
    // convierte tablas, así que la de la primera versión llegó a la copia de la
    // app como un párrafo lleno de barras y guiones. Un cliente leyendo el
    // contrato DENTRO de su app habría visto eso. El contrato tiene que leerse
    // bien en las tres copias, no sólo en el .md.
    ['coming back is priced by how long you were away, and all three steps are written',
      /Up to 2 months away/i],
    ['...including the number, so "an extra charge" is never left to a conversation',
      /\$150/],
    ['...and the twelve-month line, after which it is a new installation',
      /More than 12 months/i],
    ['...and no promotional or founding rate returns', /comes? back with you/i],
    // Y la razón, que es lo que hace que el cargo no se lea como castigo.
    ['...and the $150 says what it pays for, not just that it is due',
      /brought forward|up to date/i]
  ];
  for (const [label, re] of promises) {
    const missing = all.filter(([, text]) => !re.test(text)).map(([name]) => name);
    check(label + (missing.length ? ' — missing from ' + missing.join(', ') : ''), missing.length === 0);
  }

  // The paid add-on promises FOUR business hours. If base support promised the
  // same or better, the add-on would have nothing to sell — and a customer who
  // noticed would be right to feel sold something they already had.
  check('base support is SLOWER than the priority add-on, or the add-on is selling nothing',
    /one business day/i.test(flat(mdTerms)) && /four business hours/i.test(flat(mdTerms)));

  // The sub-headings added here are the first `###` in either document, and
  // the generator only knew `#` and `##` — so the customer's copy printed the
  // literal hash marks inside a legal document.
  check('no raw Markdown hash marks reached the customer copy', !/###/.test(gsBlock));
  check('...and the sub-headings survived as something the sheet can style',
    /"sub","What your subscription includes"/.test(gsBlock));
}

console.log('\nlegal sync: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
