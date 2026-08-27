// The changelog rots quietly, and Jose paid for that once already.
//
// Both public changelog pages sat at v10.6 while the app shipped v11.22 —
// fifteen versions of silence on a page whose whole promise is "every change
// that reaches your installation". Nothing failed, nothing warned; the page
// simply stopped being true, and the only reason it was caught is that Jose
// happened to open it.
//
// So: not a rule that every version needs an entry. Most do not — plenty of
// releases are internal, and a changelog padded with them is worse than a
// short one. The rule is that the gap has to stay SMALL. Drift past a handful
// of versions and this fails the release, which is the only moment anybody is
// looking.
//
// It also checks the two languages against each other. A Spanish page that
// stops three versions before the English one is the same rot, half-hidden.
//
// Usage:  node tools/check-changelog.js

const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

// How far behind is tolerable before this is a problem worth stopping for.
// Five is roughly "one working session": far enough that a run of internal
// versions passes without ceremony, close enough that a real feature cannot
// slip out unannounced.
const MAX_BEHIND = 5;

const PAGES = [
  { file: 'landing/changelog.html', label: 'English (changelog.html)' },
  { file: 'landing/novedades.html', label: 'Spanish (novedades.html)' }
];

function verNum(v) {
  const m = String(v).match(/v?(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], text: m[1] + '.' + m[2] };
}
// Distance in RELEASES, not in arithmetic: 11.22 is one release after 11.21,
// and versions do not carry across a major bump in any way this can count. A
// changelog whose newest entry is from an older major is simply "far behind".
function behind(app, page) {
  if (app.major !== page.major) return Infinity;
  return app.minor - page.minor;
}

const gs  = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const m   = gs.match(/var APP_VERSION = '([^']+)'/);
if (!m) { console.error('APP_VERSION not found in Code_v3_fixed.gs'); process.exit(2); }
const app = verNum(m[1]);

let worst = null, fail = false;
console.log('\n  app is at v' + app.text + '\n');

const seen = [];
PAGES.forEach(function(p){
  const src = fs.readFileSync(path.join(ROOT, p.file), 'utf8');
  // Newest first is the page's own order, so the first version stamp on the
  // page is the newest one it mentions.
  const stamps = src.match(/<span class="ver">([^<]+)<\/span>/g) || [];
  if (!stamps.length) {
    console.log('  FAIL  ' + p.label + ': no version stamps at all');
    fail = true; return;
  }
  // A stamp can be a range ("v11.5 – v11.11"); the newest is the last number
  // in it, not the first.
  const nums = stamps[0].replace(/<[^>]+>/g, '').match(/v?\d+\.\d+/g) || [];
  const top  = verNum(nums[nums.length - 1]);
  if (!top) {
    console.log('  FAIL  ' + p.label + ': cannot read a version out of ' + stamps[0]);
    fail = true; return;
  }
  seen.push({ label: p.label, top: top });
  const gap = behind(app, top);
  const line = '  ' + (gap > MAX_BEHIND ? 'FAIL ' : 'ok   ') + p.label +
               ': newest entry v' + top.text +
               (gap > 0 ? '  (' + (gap === Infinity ? 'a major behind' : gap + ' behind') + ')' : '  (current)');
  console.log(line);
  if (gap > MAX_BEHIND) fail = true;
  if (!worst || gap > behind(app, worst.top)) worst = { label: p.label, top: top };
});

// The two languages have to tell the same story.
if (seen.length === 2 && seen[0].top.text !== seen[1].top.text) {
  console.log('\n  FAIL  the two languages are not level: ' +
    seen.map(s => s.label.split(' ')[0] + ' at v' + s.top.text).join(', '));
  fail = true;
}

if (fail) {
  console.error('\n  The public changelog is behind the app.\n' +
    '  Not every version needs an entry — most do not. Group what a customer\n' +
    '  would actually notice into one entry and add it to BOTH pages, then\n' +
    '  republish them. If the last few releases genuinely changed nothing a\n' +
    '  customer can see, say so in one line rather than leaving the page\n' +
    '  silent.\n');
  process.exit(1);
}

console.log('\nchangelog: ok\n');
