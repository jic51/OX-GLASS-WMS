// Verifies the ENTRY price-change alert (_checkPriceChange) — lifted verbatim
// into a Node vm. From docs/BACKLOG.md's own spec: "this supplier charged
// 18% more than last time" — exactly the kind of thing a manager only
// notices weeks later, cheap to catch the moment it's typed since the
// average is already sitting in config.avgCost.
//
// WHY THIS ONE EARNS A REAL TEST: the percentage math and the threshold
// comparison are exactly the kind of thing that reads correct and is off by
// a sign, a factor of 100, or fires on noise instead of a real change.
//
// Usage:  node tools/test-price-alert.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const src = fs.readFileSync(SRC, 'utf8');

function extractFn(name) {
  const a = src.indexOf('function ' + name + '(');
  if (a === -1) throw new Error('function not found: ' + name);
  let depth = 0, i = src.indexOf('{', a);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(a, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}
function extractVar(name) {
  const a = src.indexOf('var ' + name + ' ');
  if (a === -1) throw new Error('var not found: ' + name);
  const b = src.indexOf(';', a);
  return src.slice(a, b + 1);
}

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function FakeEl(id) { this.id = id; this.value = ''; this.style = {}; this.className = ''; this.innerHTML = ''; }

function makeDocument(cat, name, cost) {
  const els = {
    'mat-cost-alert-1': new FakeEl('mat-cost-alert-1'),
    'mat-cost-1': (function () { var e = new FakeEl('mat-cost-1'); e.value = cost; return e; })(),
    'mat-cat-1': (function () { var e = new FakeEl('mat-cat-1'); e.value = cat; return e; })(),
    'mat-name-1': (function () { var e = new FakeEl('mat-name-1'); e.value = name; return e; })()
  };
  return { getElementById: function (id) { return els[id] || null; }, els: els };
}

const sandbox = { console: console };
vm.createContext(sandbox);
vm.runInContext(extractVar('PRICE_CHANGE_ALERT_PCT') + '\n' + extractFn('_normKey') + '\n' + extractFn('_checkPriceChange'), sandbox);

function run(label, cat, name, cost, avgCost, expect) {
  console.log('\nScenario: ' + label);
  sandbox.config = { avgCost: avgCost };
  sandbox.document = makeDocument(cat, name, cost);
  sandbox._checkPriceChange(1);
  const el = sandbox.document.els['mat-cost-alert-1'];
  if (expect === null) {
    check('no alert shown', el.style.display === 'none');
  } else {
    check('alert shown', el.style.display === '');
    check('class is "' + expect.cls + '"', el.className === 'mat-cost-alert ' + expect.cls);
    check('mentions ' + expect.pct + '%', el.innerHTML.indexOf(expect.pct + '%') !== -1);
    check('mentions the direction word "' + expect.word + '"', el.innerHTML.indexOf(expect.word) !== -1);
  }
  return el;
}

const avgCost = { 'WINDOW|||GLASS': { category: 'WINDOW', name: 'GLASS', avg: 20 } };

run('cost matches the average — no alert', 'WINDOW', 'GLASS', '20', avgCost, null);
run('cost within the 15% threshold — no alert (noise, not a real change)', 'WINDOW', 'GLASS', '22.50', avgCost, null);
run('cost 20% higher than average — warns, mentions the increase', 'WINDOW', 'GLASS', '24', avgCost, { cls: 'warn', pct: '20', word: 'higher' });
run('cost 20% lower than average — informs, mentions the decrease (not just increases)', 'WINDOW', 'GLASS', '16', avgCost, { cls: 'info', pct: '20', word: 'lower' });
run('a material with no cost history yet — nothing to compare against, no alert', 'WINDOW', 'NEW MATERIAL', '999', avgCost, null);
run('cost field blank — no alert, not a NaN% crash', 'WINDOW', 'GLASS', '', avgCost, null);
run('name blank — no alert (nothing typed yet)', 'WINDOW', '', '24', avgCost, null);
run('cost field is 0 — treated as blank, not "100% lower"', 'WINDOW', 'GLASS', '0', avgCost, null);

console.log('\nScenario: an alert that fires then clears once the number is corrected');
{
  sandbox.config = { avgCost: avgCost };
  sandbox.document = makeDocument('WINDOW', 'GLASS', '24');
  sandbox._checkPriceChange(1);
  check('alert shown for the high price', sandbox.document.els['mat-cost-alert-1'].style.display === '');
  sandbox.document.els['mat-cost-1'].value = '20';
  sandbox._checkPriceChange(1);
  check('alert clears once corrected back to the average', sandbox.document.els['mat-cost-alert-1'].style.display === 'none');
}

console.log('\nprice alert: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
