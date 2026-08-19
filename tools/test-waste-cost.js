// Verifies renderStats()'s "Waste Cost" tile — the sum of the cost STAMPED on
// each WASTE movement at the time it was recorded — lifted VERBATIM out of
// Index_v3_fixed.html into a Node vm against synthetic movements/stockData.
//
// WHY THIS ONE EARNS A REAL TEST, not just node --check: same risk class as
// test-project-cost.js — the sum has to include WASTE and only WASTE, has to
// use the cost stamped on the row (never today's average, which would make
// last year's waste silently reprice itself), and an unpriced WASTE row must
// contribute nothing rather than NaN. None of that is a syntax error; all of
// it is a wrong dollar figure with nothing pointing at it.
//
// Usage:  node tools/test-waste-cost.js [path/to/Index_v3_fixed.html]

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

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// ── Fake DOM: just enough for renderStats to read/write without crashing.
function FakeClassList() { this._set = {}; }
FakeClassList.prototype.add = function (c) { this._set[c] = true; };
FakeClassList.prototype.remove = function (c) { delete this._set[c]; };
FakeClassList.prototype.contains = function (c) { return !!this._set[c]; };

function FakeEl() {
  this.innerHTML = '';
  this.style = {};
  this.classList = new FakeClassList();
}

function makeDocument() {
  const els = {
    alertBanner: new FakeEl(),
    alertText: new FakeEl(),
    statsRow: new FakeEl(),
    stockDetailPanel: new FakeEl(),
    btnMonitorSettings: new FakeEl()
  };
  return { getElementById: function (id) { return els[id] || null; }, els: els };
}

const sandbox = { console: console };
vm.createContext(sandbox);
vm.runInContext(
  extractFn('nt') + '\n' +
  extractFn('normMT') + '\n' +
  extractFn('_normKey') + '\n' +
  extractFn('renderStats'),
  sandbox
);
sandbox._buildStockDetailPanel = function () {}; // unrelated to waste cost; no-op stub

function run(label, opts, expectTile) {
  console.log('\nScenario: ' + label);
  sandbox.stockData = opts.stockData || {};
  sandbox.movements = opts.movements || [];
  sandbox.config = opts.config || {};
  sandbox.monitoredMaterials = null;
  sandbox.userRole = 'ADMIN';
  sandbox._canSeeCosts = function () { return opts.canSeeCosts !== false; };
  sandbox.document = makeDocument();
  sandbox.renderStats();
  const html = sandbox.document.els.statsRow.innerHTML;
  if (expectTile === null) {
    check('no Waste Cost tile shown', html.indexOf('Waste Cost') === -1);
  } else {
    check('Waste Cost tile present', html.indexOf('Waste Cost') !== -1);
    check('shows $' + expectTile, html.indexOf('$' + expectTile) !== -1);
  }
  return html;
}

run(
  'two priced WASTE rows sum together, ENTRY/EXIT ignored',
  {
    movements: [
      { moveType: 'ENTRY', qty: 10, totalCost: 200 },
      { moveType: 'WASTE', qty: 2, totalCost: 40 },
      { moveType: 'EXIT',  qty: 3, totalCost: 60 },
      { moveType: 'WASTE', qty: 1, totalCost: 20 }
    ]
  },
  '60'
);

run(
  'an unpriced WASTE row contributes nothing, not NaN',
  {
    movements: [
      { moveType: 'WASTE', qty: 2, totalCost: null },
      { moveType: 'WASTE', qty: 1, totalCost: 15 }
    ]
  },
  '15'
);

run(
  'no priced WASTE at all — tile stays hidden, not $0',
  {
    movements: [
      { moveType: 'WASTE', qty: 2, totalCost: null },
      { moveType: 'ENTRY', qty: 5, totalCost: 100 }
    ]
  },
  null
);

run(
  'no WASTE movements at all',
  { movements: [{ moveType: 'ENTRY', qty: 5, totalCost: 100 }] },
  null
);

run(
  'a role without canSeeCosts never sees the tile, even with priced WASTE',
  {
    movements: [{ moveType: 'WASTE', qty: 2, totalCost: 40 }],
    canSeeCosts: false
  },
  null
);

run(
  'a legacy DISPATCHED row normalizes to EXIT, not WASTE, and is excluded from the sum',
  {
    movements: [
      { moveType: 'DISPATCHED', qty: 2, totalCost: 999 },
      { moveType: 'WASTE', qty: 1, totalCost: 10 }
    ]
  },
  '10'
);

console.log('\nwaste cost: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
