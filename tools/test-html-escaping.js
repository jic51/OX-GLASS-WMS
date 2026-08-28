// HTML ESCAPING — one bug wearing three numbers.
//
// Findings 6, 10 and 11 of the v11.26 audit were listed separately because
// they appear in different screens. They are the same mistake: text a person
// typed, dropped into innerHTML without escaping, where the browser then reads
// it as markup instead of as words.
//
//   6.  catBadge() — the category name, on SEVEN screens through one function
//       (the audit said eight; it had counted the function's own definition)
//   10. file.name  — the attachment thumbnail, straight off the person's disk
//   11. item.unit  — the rack drawer's quantity line
//
// Plus one more found while fixing them: item.estDate in the expected-delivery
// suggestion, the only raw field in a line whose two neighbours were already
// escaped — which is exactly how a gap like this survives a reading.
//
// WHAT ACTUALLY GOES WRONG
//
// Nothing dramatic on most days. A supplier writes a category as `GLASS <5MM`
// and that screen stops rendering from there down — no error, just a page that
// ends early and a person who thinks the app lost their data. The severity is
// low and the reach is wide, which is the combination that makes something sit
// unfixed for a year.
//
// The point of grouping them: catBadge is ONE function and seven screens. Fix
// the function, fix the screens. Chasing seven bug reports instead would have
// cost seven times as much and missed the two that nobody had reported yet.
//
// Usage:  node tools/test-html-escaping.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}
function extractFn(src, name) {
  const start = src.indexOf('\nfunction ' + name + '(');
  if (start === -1) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) { j++; break; } }
  }
  return src.slice(start + 1, j);
}
function codeOnly(src) {
  return src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
}

// ── The escaper itself ──────────────────────────────────────────────────────
const ctx = vm.createContext({ console: console });
vm.runInContext(extractFn(HTML, '_he'), ctx);
const _he = vm.runInContext('_he', ctx);

console.log('\n═══ the escaper does what everything below relies on ═══\n');
check('< becomes &lt;',  _he('<') === '&lt;');
check('> becomes &gt;',  _he('>') === '&gt;');
check('" becomes &quot;', _he('"') === '&quot;');
check('& becomes &amp;',  _he('&') === '&amp;');
check('& is escaped FIRST, so &lt; does not come out as &amp;lt; — order matters ' +
      'here and a rewrite that gets it wrong looks fine until someone types &',
  _he('<b>') === '&lt;b&gt;');
check('a real category with an ampersand survives readably',
  _he('GLASS & MIRROR') === 'GLASS &amp; MIRROR');
check('null and undefined come out empty, not as the word "null"',
  _he(null) === '' && _he(undefined) === '');
check('a number is accepted — the rack drawer passes item.qty through it',
  _he(12.5) === '12.5');

// ── Finding 6: eight screens, one function ──────────────────────────────────
console.log('\n═══ finding 6 — the category badge, on seven screens ═══\n');
{
  const badge = extractFn(HTML, 'catBadge');
  check('catBadge escapes the category before putting it in HTML',
    /_he\(/.test(badge));
  check('...and the CLASS still comes from the lookup table, not from the text ' +
        '— escaping the wrong half would have broken every badge colour',
    /CAT_BADGE\[c\]/.test(badge));

  // Run it and see.
  const bctx = vm.createContext({ console: console, CAT_BADGE: { 'GLASS': 'badge-blue' },
                                 nt: s => String(s || '').toUpperCase().trim() });
  vm.runInContext(extractFn(HTML, '_he'), bctx);
  vm.runInContext(extractFn(HTML, 'catBadge'), bctx);
  const out = vm.runInContext('catBadge', bctx)('GLASS <5MM');
  check('a real category with a < in it comes out as text, not as markup (' + out + ')',
    out.indexOf('<5MM') === -1 && out.indexOf('&lt;5MM') !== -1);
  check('...and the badge element itself is still a real span',
    /^<span class="badge /.test(out) && /<\/span>$/.test(out));
  check('an empty category still shows the dash placeholder',
    vm.runInContext('catBadge', bctx)('') === '<span class="badge badge-gray">—</span>');

  // Seven, not the eight the audit reported — that count included catBadge's
  // own definition line. The number is asserted rather than described so the
  // claim in the comment above cannot quietly stop being true either way: if a
  // screen is added, this fails and the paragraph gets updated with it.
  const callers = (codeOnly(HTML).match(/catBadge\(/g) || []).length - 1;  // minus the definition
  check('and it really is used on seven screens, which is why this was one fix ' +
        'and not seven (' + callers + ' call sites)', callers === 7);
}

// ── Findings 10 and 11, and the one found alongside ─────────────────────────
console.log('\n═══ findings 10 and 11, and the neighbour ═══\n');
{
  const code = codeOnly(HTML);
  check('finding 10 — the attachment thumbnail escapes the file name off disk',
    /_he\(file\.name\.substring\(0,\s*10\)\)/.test(code));
  check('finding 11 — the rack drawer escapes the unit',
    /rdw-rack-qty">'\+_he\(item\.qty\)\+' '\+_he\(item\.unit\)/.test(code));
  check('found alongside — the expected-delivery suggestion escapes its date, ' +
        'the only raw field in a line whose neighbours were already escaped',
    /_escAttr\(item\.estDate\)/.test(code));
}

// ── The ones that were already right, and must stay right ───────────────────
console.log('\n═══ no regression where it was already correct ═══\n');
{
  const code = codeOnly(HTML);
  check('showToast still escapes its message — every "too large to attach" ' +
        'toast puts a file name through it',
    /toast-msg">'\s*\+\s*_he\(msg\)/.test(code));
  check('_incQtyText is escaped at both of its call sites, not inside itself',
    /_escAttr\(_incQtyText\(item\)\)/.test(code) && /_he\(_incQtyText\(item\)\)/.test(code));
  check('the rack drawer still escapes the material name it shows and the one ' +
        'it puts in a data- attribute',
    /data-lock-name="'\+_he\(item\.name\)/.test(code));

  // A title= assignment is a PROPERTY, not markup — the browser never parses
  // it. Escaping it would put &amp; in a tooltip a person reads. Left alone on
  // purpose, and recorded here so a later sweep does not "fix" it.
  const chip = extractFn(HTML, '_addRejectedFileChip');
  check('the rejected-file chip sets .title as a property and is NOT escaped, ' +
        'which is correct — escaping there would show &amp; to the reader',
    /chip\.title\s*=\s*fileName/.test(chip) && !/chip\.title\s*=\s*_he/.test(chip));
}

console.log('\n' + '─'.repeat(72));
console.log('Static, plus the escaper and catBadge actually executed. What it');
console.log('does not do is sweep every innerHTML in 15,000 lines for the next');
console.log('one — that stayed a reading job, and this file records what that');
console.log('reading found so the same ground is not re-walked from scratch.');
console.log('─'.repeat(72));

console.log('\nhtml escaping: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
