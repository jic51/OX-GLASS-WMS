// PICKING A MATERIAL THAT ALREADY EXISTS SHOULD FILL THE FORM.
//
// Jose found two halves of one bug, and both are the kind that look like
// nothing is happening rather than like an error.
//
//   1. Choosing from "📦 Already In Stock" filled the NAME and nothing else.
//      Same material, same supplier, same GC as last time — and the person
//      retyped all of it. The app was forgetting on purpose.
//
//   2. Everything that DID autofill wrote into the SHARED fields at the bottom
//      of the form (mSup, mGC, mPO…). Those only exist while "All materials
//      share the same Supplier / GC / Project / PM…" is ticked. Untick it and
//      each material line grows its own set with different ids — so the
//      autofill was writing into five boxes that were hidden at the time, and
//      appeared to do nothing at all.
//
// The second is why this test exists in this shape: the happy path (checkbox
// ticked) worked perfectly, so nothing was visibly broken until somebody
// unticked a box.
//
// Runs the REAL _fillSharedFromData / _fillSharedFromHistory /
// _clickStockMatchSuggest out of Index_v3_fixed.html against a fake DOM.
//
// Usage:  node tools/test-entry-autofill.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function extractFn(name) {
  const start = HTML.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('not found: ' + name);
  let depth = 0, i = HTML.indexOf('{', start);
  for (; i < HTML.length; i++) {
    if (HTML[i] === '{') depth++;
    else if (HTML[i] === '}') { depth--; if (depth === 0) return HTML.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

// Both sets of fields exist in the DOM at once — that is true of the real form
// too. Which set is WRITTEN is the whole question, so the fake has to carry
// both or the bug cannot be reproduced.
const SHARED   = ['mSup', 'mProj', 'mGC', 'mPO', 'mPM'];
const PERLINE  = ['mat-sup-1', 'mat-proj-1', 'mat-gc-1', 'mat-po-1', 'mat-pm-1'];

function build(sameChecked, movements) {
  const els = {};
  [].concat(SHARED, PERLINE, ['mat-name-1', 'mat-cat-1', 'inc-suggest-1'])
    .forEach(id => { els[id] = { value: '', style: {} }; });
  els['mSameEntryInfoChk'] = { checked: sameChecked };
  els['mat-cat-1'].value = 'WINDOW';

  const sandbox = {
    console,
    document: { getElementById: id => els[id] || null },
    movements: movements || [],
    nt: s => String(s || '').trim().toUpperCase(),
    _checkPriceChange: () => {},
    _els: els
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFn('_fillSharedFromData'),
    extractFn('_fillSharedFromHistory'),
    extractFn('_clickStockMatchSuggest')
  ].join('\n'), sandbox);
  return sandbox;
}

const HISTORY = [{
  name: 'JJF 109', category: 'WINDOW', supplier: 'WHI JJFARMS',
  project: 'LOT 109', gc: 'BAY CONSTRUCTION', po: 'PO-4417', pm: 'JOE L. BAY'
}];

function clickSuggestion(S, name) {
  S._clickStockMatchSuggest({
    getAttribute: k => (k === 'data-n' ? '1' : name)
  });
}

console.log('\n═══ with "All materials share the same…" TICKED ═══\n');

{
  const S = build(true, HISTORY);
  clickSuggestion(S, 'JJF 109');
  check('the name is filled', S._els['mat-name-1'].value === 'JJF 109');
  check('...and so are the shared fields, from the last time this material came in',
    S._els.mSup.value === 'WHI JJFARMS' && S._els.mGC.value === 'BAY CONSTRUCTION' &&
    S._els.mPO.value === 'PO-4417' && S._els.mProj.value === 'LOT 109' &&
    S._els.mPM.value === 'JOE L. BAY');
  check('...and the per-line fields are left alone, since they are hidden right now',
    PERLINE.every(id => S._els[id].value === ''));
}

console.log('\n═══ with the box UNTICKED — the bug Jose found ═══\n');

{
  const S = build(false, HISTORY);
  clickSuggestion(S, 'JJF 109');
  check('the name is filled',
    S._els['mat-name-1'].value === 'JJF 109');
  check('...and THIS LINE\'S OWN fields are filled — the whole point, and what used to do nothing',
    S._els['mat-sup-1'].value === 'WHI JJFARMS' && S._els['mat-gc-1'].value === 'BAY CONSTRUCTION' &&
    S._els['mat-po-1'].value === 'PO-4417' && S._els['mat-proj-1'].value === 'LOT 109' &&
    S._els['mat-pm-1'].value === 'JOE L. BAY');
  check('...and the hidden shared fields are NOT written, so they cannot leak into the save',
    SHARED.every(id => S._els[id].value === ''));
}

console.log('\n═══ it fills the right LINE, not just any line ═══\n');

{
  const S = build(false, HISTORY);
  // A second material line, as if the person had added one.
  ['mat-sup-2','mat-proj-2','mat-gc-2','mat-po-2','mat-pm-2','mat-name-2','mat-cat-2']
    .forEach(id => { S._els[id] = { value: '', style: {} }; });
  S._els['mat-cat-2'].value = 'WINDOW';
  S._fillSharedFromHistory('JJF 109', 'WINDOW', 2);
  check('filling line 2 writes to line 2', S._els['mat-sup-2'].value === 'WHI JJFARMS');
  check('...and leaves line 1 untouched — five lines on screen and only one was picked',
    S._els['mat-sup-1'].value === '');
}

console.log('\n═══ what a person typed is never overwritten ═══\n');

{
  const S = build(false, HISTORY);
  S._els['mat-sup-1'].value = 'A DIFFERENT SUPPLIER THIS TIME';
  clickSuggestion(S, 'JJF 109');
  check('a supplier already typed survives — autofill is a shortcut, not an opinion about what they meant',
    S._els['mat-sup-1'].value === 'A DIFFERENT SUPPLIER THIS TIME');
  check('...while the fields they left blank still get filled',
    S._els['mat-gc-1'].value === 'BAY CONSTRUCTION');
}

console.log('\n═══ and it stays quiet when it has nothing to say ═══\n');

{
  const S = build(false, HISTORY);
  clickSuggestion(S, 'SOMETHING NEVER SEEN BEFORE');
  check('a material with no history fills the name and nothing else, rather than guessing',
    S._els['mat-name-1'].value === 'SOMETHING NEVER SEEN BEFORE' &&
    PERLINE.every(id => S._els[id].value === ''));
}

{
  // GENERIC is the placeholder project, not a real one; putting it in the form
  // would look like an answer.
  const S = build(false, [{
    name: 'JJF 109', category: 'WINDOW', supplier: 'WHI JJFARMS',
    project: 'GENERIC', gc: '', po: '', pm: ''
  }]);
  clickSuggestion(S, 'JJF 109');
  check('the GENERIC placeholder project is not offered as if it were a real project',
    S._els['mat-proj-1'].value === '');
  check('...but the supplier from that same row still is', S._els['mat-sup-1'].value === 'WHI JJFARMS');
}

{
  const S = build(false, [
    { name: 'JJF 109', category: 'WINDOW', supplier: 'OLD SUPPLIER', project: '', gc: '', po: '', pm: '' },
    { name: 'JJF 109', category: 'WINDOW', supplier: 'NEWEST SUPPLIER', project: '', gc: '', po: '', pm: '' }
  ]);
  clickSuggestion(S, 'JJF 109');
  check('the MOST RECENT movement wins — a supplier changed six months ago should not come back',
    S._els['mat-sup-1'].value === 'NEWEST SUPPLIER');
}

console.log('\nentry-autofill: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
