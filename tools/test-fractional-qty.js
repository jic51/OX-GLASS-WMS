// FRACTIONAL QUANTITIES — the number the app wrote was not the number typed.
//
// Finding 3 of the v11.26 audit, and the one that is hardest to notice from
// the outside, because nothing about it ever looks like a failure.
//
// Every quantity box in the entry forms was read with parseInt. parseInt does
// not round — it stops at the first character that is not a digit. So:
//
//     parseInt('2.5')   →  2      half a sheet becomes two
//     parseInt('0.75')  →  0      three-quarters becomes nothing
//     parseInt('12.9')  →  12
//
// No warning. No red border. Nothing in any log. The person typed what they
// counted, pressed Save, and a different number went into the sheet.
//
// The reason it lasted is that the app disagreed with itself in three places
// and the three never met:
//
//     entry form   parseInt    2.5 → 2
//     edit modal   parseFloat  2.5 → 2.5     (em_qty already had step="any")
//     backend      Number()    2.5 → 2.5     (it always accepted fractions)
//
// So the sheet could hold 2.5, the editor could show and save 2.5, and only
// the form where a number FIRST enters the building threw the fraction away.
// And the units menu has offered SQ FT, LN FT, SHEET and ROLL since day one —
// units that exist precisely because things come in halves.
//
// The fix has two halves, and one without the other does nothing:
//   1. _qty() reads with parseFloat.
//   2. step="any" on the inputs — an <input type="number"> with no step
//      defaults to step=1, so the BROWSER rejects 2.5 before any script runs.
//
// Usage:  node tools/test-fractional-qty.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');
const GS   = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

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
// Line comments only. Stripping /* */ as well looks tidier and is WRONG on
// this file: Index_v3_fixed.html carries CSS, JS and regex literals in one
// document, and a `/*` that belongs to none of them swallows ten thousand
// lines of real code — which showed up here as this test cheerfully reporting
// 14 call sites where the file has 23. This codebase writes its comments with
// `//`, so that is all that needs removing.
function codeOnly(src) {
  return src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
}

const ctx = vm.createContext({ console: console });
['_qty', '_qtyText'].forEach(n => vm.runInContext(extractFn(HTML, n), ctx));
const _qty     = vm.runInContext('_qty', ctx);
const _qtyText = vm.runInContext('_qtyText', ctx);

console.log('\n═══ the numbers that were being thrown away ═══\n');
[
  ['2.5',   2.5,  'half a sheet — parseInt made this 2'],
  ['0.75',  0.75, 'three-quarters — parseInt made this 0, so the row vanished entirely'],
  ['12.9',  12.9, 'parseInt made this 12'],
  ['1.5',   1.5,  'a foot and a half of LN FT'],
  ['0.5',   0.5,  'parseInt made this 0']
].forEach(([raw, want, why]) => {
  check('"' + raw + '" reads as ' + want + ' — ' + why, _qty(raw) === want);
});

console.log('\n═══ everything that already worked still works ═══\n');
[
  ['12',   12,  'a plain integer is still a plain integer'],
  ['0',     0,  'zero is zero, not empty'],
  ['',      0,  'an empty box is 0, which is what every caller\'s Math.max expects'],
  ['abc',   0,  'junk is 0, not NaN — NaN would poison a running total silently'],
  [null,    0,  'null is 0'],
  [undefined, 0,'undefined is 0'],
  ['  7  ', 7,  'whitespace around the number is tolerated, as parseInt did']
].forEach(([raw, want, why]) => {
  check(JSON.stringify(raw) + ' reads as ' + want + ' — ' + why, _qty(raw) === want);
});
check('Infinity is refused rather than passed on as a quantity', _qty('Infinity') === 0);
check('a number, not a string, is accepted too', _qty(3.25) === 3.25);

console.log('\n═══ running totals do not show floating-point noise ═══\n');
// 0.1 + 0.2 === 0.30000000000000004. A total on screen is exactly where that
// surfaces, and "Total: 0.30000000000000004" reads as a broken app.
{
  const sum = _qty('0.1') + _qty('0.2');
  check('the raw sum really does carry the noise — otherwise this proves nothing (' + sum + ')',
    sum !== 0.3);
  check('_qtyText prints it as 0.3', _qtyText(sum) === '0.3');
  check('integers still print as integers — 12, not 12.000', _qtyText(12) === '12');
  check('and 12.0 prints as 12', _qtyText(12.0) === '12');
  check('three decimals survive — past anything a warehouse counts in', _qtyText(1.125) === '1.125');
  check('a fourth decimal is rounded away rather than shown', _qtyText(1.00006) === '1');
  check('junk prints as 0, not NaN', _qtyText(undefined) === '0');
}

console.log('\n═══ the source: no quantity is read with parseInt any more ═══\n');
{
  const code = codeOnly(HTML);
  // Every quantity in the app arrives through one of these five hooks.
  const qtyHooks = ['.loc-qty', '.exit-qty', '.tr-qty', '.el-qty', "getElementById('mQty')"];
  qtyHooks.forEach(h => {
    const esc = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re  = new RegExp('parseInt\\([^;\\n]*' + esc, 'g');
    const hits = code.match(re) || [];
    check('no parseInt left on ' + h + (hits.length ? ' — ' + hits.length + ' still there' : ''),
      hits.length === 0);
  });

  const uses = (code.match(/_qty\(/g) || []).length;
  check('_qty is doing the reading in at least 20 places (found ' + uses + ')', uses >= 20);

  // The cycle count is deliberately parseFloat rather than _qty: it has to tell
  // "0" apart from "nothing typed yet", and _qty answers 0 to both.
  const adj = extractFn(HTML, '_readAdjust');
  check('the ADJUST cycle count reads with parseFloat — the one movement type ' +
        'whose whole purpose is matching a physical count',
    /parseFloat\(raw\)/.test(adj) && !/parseInt\(raw/.test(adj));
  check('...and it still distinguishes a counted zero from an empty box',
    /raw !== ''/.test(adj) && /isFinite\(counted\)/.test(adj));

  // parseInt is still correct for things that ARE integers. If this ever hits
  // zero, someone has over-applied the fix.
  const idx = (code.match(/parseInt\([^;\n]*(data-n|data-idx|dataset\.row|zIndex|aRowIdx|data-sim)/g) || []).length;
  check('row indexes and z-indexes still use parseInt, which is right for them (' + idx + ' left)',
    idx >= 5);
}

console.log('\n═══ the other half: the browser has to allow the keystroke ═══\n');
{
  // An <input type="number"> with no step attribute defaults to step=1. The
  // browser marks 2.5 invalid and the value never reaches _qty at all — so the
  // reader fix alone would have changed nothing a person could see.
  // codeOnly, not HTML: the paragraph above _qty quotes an <input
  // type="number"> tag to explain the default step, and scanning the raw file
  // reports that sentence as a markup defect.
  const inputs = codeOnly(HTML).match(/<input[^>]*type="number"[^>]*>/g) || [];
  check('the file really does build number inputs (' + inputs.length + ' found)', inputs.length >= 8);
  const noStep = inputs.filter(t => !/step\s*=/.test(t));
  check('every number input declares a step' +
        (noStep.length ? ' — missing on ' + noStep.length : ''), noStep.length === 0);

  const qtyInputs = inputs.filter(t => /loc-qty|exit-qty|tr-qty|el-qty|id="mQty"|id="incQty"|id="em_qty"|mon-min-inp/.test(t));
  check('all the quantity boxes were found (' + qtyInputs.length + ')', qtyInputs.length >= 8);
  // adjCounted is written across two lines, so the single-line scan above does
  // not see it. Checked by hand rather than left silently uncovered — it used
  // to say step="1", which is the same bug spelled out loud.
  check('the ADJUST count box is step="any" too — it used to be step="1"',
    /id="adjCounted"[^>]*step="any"/.test(HTML));
  const notAny = qtyInputs.filter(t => !/step="any"/.test(t));
  check('every quantity box is step="any", so the browser accepts 2.5' +
        (notAny.length ? ' — still stepped: ' + notAny.length : ''), notAny.length === 0);

  // min="1" would block 0.5 just as surely as step=1 blocks 2.5. Zero is still
  // refused — but by the app, in its own words ("Quantity must be greater than
  // 0"), rather than by a browser tooltip that cannot explain itself.
  const minOne = qtyInputs.filter(t => /min="1"/.test(t));
  check('no quantity box still carries min="1", which would refuse 0.5' +
        (minOne.length ? ' — ' + minOne.length + ' left' : ''), minOne.length === 0);
  check('...and zero is still refused, by the app rather than the browser',
    /Quantity must be greater than 0/.test(HTML));
}

console.log('\n═══ the backend never had this bug, and still does not ═══\n');
{
  const gs = codeOnly(GS);
  check('the save path reads the quantity with Number(), which keeps fractions',
    /var qty\s*=\s*Number\(data\.qty\s*\|\|\s*0\)/.test(gs));
  check('no parseInt on a quantity anywhere in Code_v3_fixed.gs',
    (gs.match(/parseInt\([^;\n]*[qQ]ty/g) || []).length === 0);
}

console.log('\n' + '─'.repeat(72));
console.log('This checks the reader and the markup. What it cannot check is a');
console.log('real browser accepting the keystroke — type 2.5 into a rack row on');
console.log('the deployed copy once, and watch it come back 2.5.');
console.log('─'.repeat(72));

console.log('\nfractional qty: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
