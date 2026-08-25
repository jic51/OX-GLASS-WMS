// Copies the legal texts from legal/*.md into Code_v3_fixed.gs, so the two
// sheets the customer reads BEFORE accepting are the same documents as the
// ones in the app and in the repo.
//
// Why a generator rather than a third hand-maintained copy:
//
// There were two copies already — legal/*.md (the source of truth) and
// LEGAL_DOCS inside the app — and tools/test-legal-sync.js exists because they
// once drifted: v9.77 started emailing us the company name and admin address
// while both privacy policies still said we receive nothing at all. A promise
// broken in writing is worse than a missing feature, and nothing in the
// toolchain could see it, because a stale sentence is valid Markdown and valid
// HTML.
//
// Adding a THIRD copy by hand would have made that failure more likely, not
// less. This copy is mechanical: one command regenerates it, and
// test-legal-sync.js fails the build if anyone edits it in place.
//
// The customer reads this copy at the one moment that matters legally — the
// consent checkbox on the START HERE sheet, before the web app exists and with
// nowhere to link out to.
//
// Usage:
//   node tools/sync-legal.js            regenerate the block in Code_v3_fixed.gs
//   node tools/sync-legal.js --check    fail if the block is out of date

const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const GS   = path.join(ROOT, 'Code_v3_fixed.gs');
const BEGIN = '// ─── BEGIN GENERATED LEGAL TEXT — node tools/sync-legal.js ───';
const END   = '// ─── END GENERATED LEGAL TEXT ───';

// Markdown → the plain lines a spreadsheet cell can actually show.
//
// A sheet has no italics-inside-a-sentence and no nested lists, so anything
// that cannot survive the trip is flattened rather than left as stray
// punctuation the customer has to read past. Headings are kept as a marker so
// the sheet can style them; everything else becomes text.
function toLines(md) {
  const out = [];
  // HTML comments in the .md are notes to ourselves — the "SOURCE OF TRUTH"
  // banner at the top of each file, telling US where the mirror copies live.
  // The customer must never see them; they leaked into the first run of this.
  md = md.replace(/<!--[\s\S]*?-->/g, '');
  md.split('\n').forEach(raw => {
    let s = raw.replace(/\r$/, '');

    // Horizontal rules carry no meaning once the styling is gone.
    if (/^---+$/.test(s.trim())) return;

    // The repo-only banner at the top of each file ("this file is the source
    // of truth…") is addressed to us, not to the customer.
    if (/^>\s/.test(s)) return;

    let kind = 'p';
    if (/^#\s/.test(s))       { kind = 'title';  s = s.replace(/^#\s+/, ''); }
    else if (/^##\s/.test(s)) { kind = 'head';   s = s.replace(/^##\s+/, ''); }
    else if (/^\s*[-*]\s/.test(s)) { kind = 'li'; s = s.replace(/^\s*[-*]\s+/, ''); }

    s = s.replace(/\*\*(.+?)\*\*/g, '$1')      // bold
         .replace(/(^|[\s(])\*(.+?)\*/g, '$1$2') // italics
         .replace(/`(.+?)`/g, '$1')             // code
         .replace(/\[(.+?)\]\((.+?)\)/g, '$1 ($2)'); // links keep their target

    if (kind === 'li') s = '•   ' + s;
    out.push({ k: kind, t: s });
  });

  // Rejoin hard-wrapped paragraphs. The .md files wrap at ~80 characters for
  // reviewing diffs, which is a property of the file and not of the sentence —
  // left alone, one paragraph becomes four spreadsheet rows and reads like
  // poetry. The cell wraps text itself, so it wants whole paragraphs.
  const joined = [];
  out.forEach(l => {
    const prev = joined[joined.length - 1];
    const continuation = prev && prev.k === l.k && (l.k === 'p' || l.k === 'li') &&
                         prev.t.trim() !== '' && l.t.trim() !== '' &&
                         !/^•/.test(l.t);          // a new bullet is a new item
    if (continuation) prev.t += ' ' + l.t.trim();
    else joined.push({ k: l.k, t: l.t });
  });

  // Collapse runs of blank lines to one — a sheet row is expensive vertical
  // space in a way a Markdown line is not.
  const tidy = [];
  joined.forEach(l => {
    if (l.t.trim() === '' && tidy.length && tidy[tidy.length - 1].t.trim() === '') return;
    tidy.push(l);
  });
  while (tidy.length && tidy[0].t.trim() === '') tidy.shift();
  while (tidy.length && tidy[tidy.length - 1].t.trim() === '') tidy.pop();
  return tidy;
}

function block() {
  const terms   = toLines(fs.readFileSync(path.join(ROOT, 'legal', 'TERMS-OF-SERVICE.md'), 'utf8'));
  const privacy = toLines(fs.readFileSync(path.join(ROOT, 'legal', 'PRIVACY-POLICY.md'), 'utf8'));
  const enc = lines => lines.map(l => JSON.stringify([l.k, l.t])).join(',\n    ');
  return [
    BEGIN,
    '// Source of truth: legal/TERMS-OF-SERVICE.md and legal/PRIVACY-POLICY.md.',
    '// DO NOT EDIT THIS BLOCK BY HAND — edit the .md and re-run the generator.',
    '// Each line is [kind, text]; kind is "title", "head", "li" or "p".',
    'var LEGAL_SHEET_TEXT = {',
    '  terms: [',
    '    ' + enc(terms),
    '  ],',
    '  privacy: [',
    '    ' + enc(privacy),
    '  ]',
    '};',
    END
  ].join('\n');
}

const src = fs.readFileSync(GS, 'utf8');
const i = src.indexOf(BEGIN), j = src.indexOf(END);
if (i === -1 || j === -1) {
  console.error('Markers not found in Code_v3_fixed.gs. Expected:\n  ' + BEGIN + '\n  ' + END);
  process.exit(2);
}
const current = src.slice(i, j + END.length);
const fresh = block();

if (process.argv.includes('--check')) {
  if (current === fresh) {
    const n = (fresh.match(/\n/g) || []).length;
    console.log('legal text in Code.gs matches legal/*.md  (' + n + ' lines)');
    process.exit(0);
  }
  console.error('OUT OF DATE: the legal text in Code_v3_fixed.gs does not match legal/*.md.');
  console.error('Run: node tools/sync-legal.js');
  process.exit(1);
}

fs.writeFileSync(GS, src.slice(0, i) + fresh + src.slice(j + END.length));
console.log('legal text regenerated from legal/*.md');
