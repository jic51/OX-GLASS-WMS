// THE DASHBOARD SELECTION — does it outlive the form it opened?
//
// Jose selected five materials, clicked "Exit Selected", then switched the type
// to TRANSFER to record a move he had already made with his hands. Four of the
// five vanished, and switching back to EXIT did not bring them back.
//
// Two separate things made that happen, and only one of them was a mistake:
//
//   NOT a mistake — _readMoveMaterial carries only the FIRST material across a
//   type change. TRANSFER, RETURN and WASTE hold exactly one material, and
//   moving three into a form with room for one is not possible. The code says
//   so, in a comment, and it is right.
//
//   THE MISTAKE — exitSelectedStock() ended with clearStockSelection(). The
//   selection was destroyed the instant the form opened, so switching BACK to
//   EXIT had nothing left to rebuild from. The four materials were gone for
//   good, out of a form that had not been saved. Jose only worked out that they
//   were missing by thinking about it afterwards; the app never said a word.
//
// So this file guards three things:
//
//   1. The selection is NOT cleared when the form opens.
//   2. It IS released when the form closes — in closeModal, one place, not in
//      each of the five call sites that close this modal. A sixth added later
//      has to inherit that, not remember it.
//   3. Switching type SAYS how many materials it could not carry.
//
// Static analysis on purpose: all three are about where a call is written, and
// a browser test would prove one path through the code while these are claims
// about the code itself.
//
// Usage:  node tools/test-selection-survives.js

const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC  = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// Pull one function's body out by name. Brace-counting rather than a regex,
// because the bodies here contain both braces and strings full of them.
function body(name) {
  const start = SRC.indexOf('function ' + name + '(');
  if (start === -1) return null;
  let i = SRC.indexOf('{', start), depth = 0;
  for (let j = i; j < SRC.length; j++) {
    if (SRC[j] === '{') depth++;
    else if (SRC[j] === '}') { depth--; if (depth === 0) return SRC.slice(i, j + 1); }
  }
  return null;
}

// ── 1. Opening the form must not destroy the selection ──────────────────────
console.log('\n═══ the selection outlives the form opening ═══\n');
{
  const b = body('exitSelectedStock');
  check('exitSelectedStock() exists', b !== null);
  check('...and it no longer clears the selection it was just handed — that one ' +
        'line is what made four materials unrecoverable',
    b !== null && !/clearStockSelection\s*\(/.test(b));
  check('...and it still fills a line per selected material',
    b !== null && /_fillExitLinesFrom\s*\(/.test(b));

  // The filling half has to be callable WITHOUT reopening the modal. Rebuilding
  // the lines by calling exitSelectedStock() again would run openMoveModal() a
  // second time and wipe the date, the comments and everything else typed —
  // fixing the material list by throwing away the rest of the form is not a fix.
  const f = body('_fillExitLinesFrom');
  check('_fillExitLinesFrom() exists, so the lines can be rebuilt in place', f !== null);
  check('...and it does NOT open the modal — it is the filling half, nothing else',
    f !== null && !/openMoveModal\s*\(/.test(f));
}

// ── 2. Closing the form must release it, in ONE place ───────────────────────
console.log('\n═══ ...and is released when the form closes ═══\n');
{
  const c = body('closeModal');
  check('closeModal() exists', c !== null);
  // One statement, matched whole: the id test and the release together. Testing
  // for the two separately would also pass if the release were guarded by some
  // OTHER id, which is the sort of assertion that stays green while the thing
  // it names stops being true.
  check('...and releasing the selection is what it does for the movement form',
    c !== null &&
    /id\s*===\s*'moveOverlay'\s*\)\s*clearStockSelection\s*\(\s*\)/.test(c.replace(/\s+/g, ' ')));

  // The point of doing it in closeModal is that the five existing close sites —
  // and any sixth — inherit it. If somebody "helpfully" copies the call into
  // each one instead, the next site added still forgets.
  const sites = (SRC.match(/closeModal\('moveOverlay'\)/g) || []).length;
  check('there are still several places that close this form (' + sites + '), which ' +
        'is exactly why the release lives in closeModal and not in each of them',
    sites >= 2);
}

// ── 3. Dropping a material has to be said out loud ──────────────────────────
console.log('\n═══ and the form admits what it could not carry ═══\n');
{
  const t = body('_moveTypeBarClick');
  check('_moveTypeBarClick() exists', t !== null);
  check('...it counts the material lines before and after the switch',
    t !== null && (t.match(/_countMoveMaterialLines\s*\(/g) || []).length >= 2);
  check('...and shows a toast when the new type could not hold them all — ' +
        'the old behaviour dropped them in silence',
    t !== null && /before > after/.test(t) && /showToast\s*\(/.test(t));
  check('...and coming back to a type that holds several rebuilds them all ' +
        'from the live selection, instead of the one that could be carried',
    t !== null && /_liveStockSelection\s*\(/.test(t) && /_fillExitLinesFrom\s*\(/.test(t));

  const n = body('_countMoveMaterialLines');
  check('_countMoveMaterialLines() knows ENTRY and EXIT hold many and the rest hold one',
    n !== null && /multiMatContainer/.test(n) && /multiExitContainer/.test(n));
}

console.log('\n' + '─'.repeat(72));
console.log('Carrying one material across a type change is correct and stays.');
console.log('What is guarded here is that the OTHERS can be got back, and that');
console.log('the app says they were dropped instead of letting somebody notice.');
console.log('─'.repeat(72));

console.log('\nselection survives: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
