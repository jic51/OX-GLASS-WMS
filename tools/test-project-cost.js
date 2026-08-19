// Verifies renderProjectView()'s "Project Cost" tile — the sum of EXIT.totalCost
// for a project's movements — lifted VERBATIM out of Index_v3_fixed.html into a
// Node vm against synthetic `movements`. No DOM, no Playwright: this is pure
// arithmetic and filtering, so a stubbed document is enough.
//
// WHY THIS ONE EARNS A REAL TEST, not just node --check: the sum has to include
// EXIT and only EXIT — a RETURN or WASTE slipping into the total would silently
// show a customer the wrong dollar figure for what a project actually cost, and
// nothing about that is a syntax error. Same risk class as test-pricing.js.
//
// Usage:  node tools/test-project-cost.js [path/to/Index_v3_fixed.html]

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

// ── Fake DOM: just enough for renderProjectView to read/write without crashing.
function FakeEl() {
  this.value = '';
  this.innerHTML = '';
}
FakeEl.prototype.querySelectorAll = function () { return { forEach: function () {} }; };

function makeDocument(projectValue) {
  const els = {
    projectSelector: (function () { var e = new FakeEl(); e.value = projectValue; return e; })(),
    projectBody: new FakeEl(),
    projectStats: new FakeEl()
  };
  return { getElementById: function (id) { return els[id]; }, els: els };
}

const sandbox = {
  console: console,
  google: { visualization: {} }
};
vm.createContext(sandbox);
vm.runInContext(
  extractFn('nt') + '\n' +
  extractFn('displayName') + '\n' +
  extractFn('normMT') + '\n' +
  extractFn('stockBadge') + '\n' +
  extractFn('_he') + '\n' +
  extractFn('renderProjectView'),
  sandbox
);

function run(label, movements, canSeeCosts, expectTile) {
  console.log('\nScenario: ' + label);
  sandbox.movements = movements;
  sandbox._canSeeCosts = function () { return canSeeCosts; };
  sandbox.document = makeDocument('Deck A');
  sandbox.renderProjectView();
  const html = sandbox.document.els.projectStats.innerHTML;
  if (expectTile === null) {
    check('no Project Cost tile shown', html.indexOf('Project Cost') === -1);
  } else {
    check('Project Cost tile present', html.indexOf('Project Cost') !== -1);
    check('shows $' + expectTile, html.indexOf('$' + expectTile) !== -1);
  }
  return html;
}

run(
  'EXIT with cost, RETURN and WASTE also present — only EXIT counts',
  [
    { project: 'Deck A', name: 'Glass', category: 'WINDOW', moveType: 'ENTRY', qty: 10, unitCost: 20, totalCost: 200 },
    { project: 'Deck A', name: 'Glass', category: 'WINDOW', moveType: 'EXIT',  qty: 4,  unitCost: 20, totalCost: 80 },
    { project: 'Deck A', name: 'Glass', category: 'WINDOW', moveType: 'RETURN', qty: 1, unitCost: 20, totalCost: 20 },
    { project: 'Deck A', name: 'Glass', category: 'WINDOW', moveType: 'WASTE', qty: 1,  unitCost: 20, totalCost: 20 }
  ],
  true,
  '80'
);

run(
  'two EXITs of different materials sum together',
  [
    { project: 'Deck A', name: 'Glass',  category: 'WINDOW', moveType: 'EXIT', qty: 4, unitCost: 20, totalCost: 80 },
    { project: 'Deck A', name: 'Screws', category: 'SCREWS', moveType: 'EXIT', qty: 100, unitCost: 0.15, totalCost: 15 }
  ],
  true,
  '95'
);

run(
  'an uncosted EXIT (null totalCost) contributes nothing, not NaN',
  [
    { project: 'Deck A', name: 'Glass', category: 'WINDOW', moveType: 'EXIT', qty: 4, unitCost: null, totalCost: null },
    { project: 'Deck A', name: 'Screws', category: 'SCREWS', moveType: 'EXIT', qty: 10, unitCost: 1, totalCost: 10 }
  ],
  true,
  '10'
);

run(
  'no priced EXIT at all — tile stays hidden, not $0',
  [
    { project: 'Deck A', name: 'Glass', category: 'WINDOW', moveType: 'ENTRY', qty: 10, unitCost: null, totalCost: null },
    { project: 'Deck A', name: 'Glass', category: 'WINDOW', moveType: 'EXIT',  qty: 4,  unitCost: null, totalCost: null }
  ],
  true,
  null
);

run(
  'a VIEWER without canSeeCosts never sees the tile, even with priced EXITs',
  [
    { project: 'Deck A', name: 'Glass', category: 'WINDOW', moveType: 'EXIT', qty: 4, unitCost: 20, totalCost: 80 }
  ],
  false,
  null
);

run(
  'legacy DISPATCHED movement (pre-v9 data) normalizes to EXIT and counts',
  [
    { project: 'Deck A', name: 'Glass', category: 'WINDOW', moveType: 'DISPATCHED', qty: 4, unitCost: 20, totalCost: 80 }
  ],
  true,
  '80'
);

console.log('\nproject cost: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
