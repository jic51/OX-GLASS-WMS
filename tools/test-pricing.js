// Verifies the weighted-average cost engine — addMovementsBatch_'s pricing
// branch, saveAvgCostUpdates_, and their real dependencies (buildStockSnapshot_,
// applyMovementToSnapshot_, loadConfig, round2_, etc.) — all lifted VERBATIM
// out of Code_v3_fixed.gs into a Node vm, against fake in-memory sheets. Apps
// Script itself is stubbed; the business logic is the real thing.
//
// WHY THIS ONE EARNS A REAL TEST, not just node --check: money math is exactly
// the kind of code that reads correct and is subtly wrong — a blend using the
// post-mutation quantity instead of the pre-mutation one, a bootstrap that
// fires when it shouldn't, a rounding step that's missing on one branch but
// not another. None of that is a syntax error. All of it is a wrong number on
// an invoice six months from now, with no error anywhere to point at it.
//
// Usage:  node tools/test-pricing.js [path/to/Code_v3_fixed.gs]

const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = process.argv[2] || path.join(__dirname, '..', 'Code_v3_fixed.gs');
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
  // AC and SHEETS are multi-line object literals — find the matching close.
  const braceStart = src.indexOf('{', a);
  if (braceStart === -1 || braceStart > src.indexOf(';', a)) {
    const b = src.indexOf(';', a);
    return src.slice(a, b + 1);
  }
  let depth = 0, i = braceStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  const semi = src.indexOf(';', i);
  return src.slice(a, semi + 1);
}

// ── Fake in-memory sheet, backing every getRange/getDataRange call the real
//    code makes — a real 2D grid, not a mock that only knows the calls it
//    expects, so setValues followed by getValues (the write-verify read) sees
//    what was actually written, the same as real Sheets would.
function FakeSheet(headerRow) {
  this.rows = headerRow ? [headerRow.slice()] : [[]];
}
FakeSheet.prototype.getDataRange = function () {
  var self = this;
  return { getValues: function () { return self.rows.map(function (r) { return r.slice(); }); } };
};
FakeSheet.prototype.getLastRow = function () { return this.rows.length; };
FakeSheet.prototype.getRange = function (r, c, nr, nc) {
  var self = this;
  nr = nr || 1; nc = nc || 1;
  return {
    getValues: function () {
      var out = [];
      for (var i = 0; i < nr; i++) {
        var row = self.rows[r - 1 + i] || [];
        var slice = [];
        for (var j = 0; j < nc; j++) slice.push(row[c - 1 + j] !== undefined ? row[c - 1 + j] : '');
        out.push(slice);
      }
      return out;
    },
    setValues: function (vals) {
      for (var i = 0; i < vals.length; i++) {
        var rowIdx = r - 1 + i;
        while (self.rows.length <= rowIdx) self.rows.push([]);
        var row = self.rows[rowIdx];
        for (var j = 0; j < vals[i].length; j++) row[c - 1 + j] = vals[i][j];
      }
    },
    setValue: function (v) {
      var rowIdx = r - 1;
      while (self.rows.length <= rowIdx) self.rows.push([]);
      self.rows[rowIdx][c - 1] = v;
    },
    setNumberFormat: function () {}
  };
};

function buildSandbox() {
  var archive = new FakeSheet();
  var cfg     = new FakeSheet();
  var ss = {
    getSheetByName: function (name) {
      if (name === 'MASTER_ARCHIVE_V3') return archive;
      if (name === 'CONFIG')            return cfg;
      return null;   // RESERVATIONS, MATERIAL_LOCKS — real code guards on null
    }
  };

  var sandbox = {
    console: console,
    Logger: { log: function () {} },
    LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
    Session: { getScriptTimeZone: function () { return 'UTC'; } },
    Utilities: { formatDate: function () { return '2026-06-15'; } },
    SpreadsheetApp: { getActiveSpreadsheet: function () { return ss; } },
    // Stubs for concerns this test is not about — each a real dependency of
    // addMovementsBatch_ that has nothing to do with pricing.
    requireAuth_: function () { return { role: 'ADMIN', email: 'jose@ox-glass.com' }; },
    auditLog_: function () {},
    refreshDerivedSheets_: function () {},
    sendBatchNotifyEmail_: function () { return null; },
    checkNotifications_: function () {},
    newRequestId_: function () { return 'test'; },
    logError_: function () {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  [
    extractVar('AC'), extractVar('AC_WIDTH'), extractVar('SHEETS')
  ].forEach(function (code) { vm.runInContext(code, sandbox); });

  [
    'round2_', 'normalizeString', 'cleanDisplay_', 'sheetSafe_', 'getMaterialId',
    'statusForMoveType_', 'buildStockSnapshot_', 'applyMovementToSnapshot_',
    'getActiveLocksMap_', 'enforceMaterialLock_', 'loadConfig', 'saveAvgCostUpdates_',
    'addMovementsBatch_'
  ].forEach(function (name) { vm.runInContext(extractFn(name), sandbox); });

  return { sandbox: sandbox, ss: ss, archive: archive, cfg: cfg };
}

const fails = [];
const check = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) fails.push(`${name}: expected ${w}, got ${g}`);
  else console.log('  ok   ' + name);
};

function run(sandbox, ss, archive, movements) {
  return vm.runInContext(
    'addMovementsBatch_(ss, archive, movements, {role:"ADMIN",email:"jose@ox-glass.com"})',
    Object.assign(sandbox, { ss: ss, archive: archive, movements: movements })
  );
}

// Reads the row this test just wrote, at the cost columns (AC.UNIT_COST=20,
// AC.TOTAL_COST=21 → sheet columns 21/22, 1-based).
function lastCostRow(archive) {
  var last = archive.rows[archive.rows.length - 1];
  return { unitCost: last[20], totalCost: last[21] };
}

function avgCostFor(sandbox, ss, category, name) {
  var cfgObj = vm.runInContext('loadConfig()', Object.assign(sandbox, { ss: ss }));
  var key = vm.runInContext(`getMaterialId(${JSON.stringify(category)}, ${JSON.stringify(name)})`, sandbox);
  return cfgObj.avgCost[key] ? cfgObj.avgCost[key].avg : null;
}

console.log('Scenario A: a never-priced material gets its first cost — bootstraps, does not blend');
{
  const { sandbox, ss, archive } = buildSandbox();
  run(sandbox, ss, archive, [{
    moveType: 'ENTRY', category: 'HARDWARE', name: 'BOLT', qty: 100, unit: 'pcs',
    destLoc: 'A1A', unitCost: 5, forceSubmit: true
  }]);
  const row = lastCostRow(archive);
  check('unit cost stamped as entered', row.unitCost, 5);
  check('total cost = unit × qty', row.totalCost, 500);
  check('avg cost bootstraps to the entered price', avgCostFor(sandbox, ss, 'HARDWARE', 'BOLT'), 5);
}

console.log('\nScenario B: a second, later ENTRY at a different price blends into the average');
{
  const { sandbox, ss, archive } = buildSandbox();
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'HARDWARE', name: 'BOLT', qty: 100, unit: 'pcs', destLoc: 'A1A', unitCost: 5, forceSubmit: true }]);
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'HARDWARE', name: 'BOLT', qty: 50,  unit: 'pcs', destLoc: 'A1A', unitCost: 7, forceSubmit: true }]);
  const row = lastCostRow(archive);
  // (100*5 + 50*7) / 150 = 850/150 = 5.6666... -> 5.67
  check('the SECOND row keeps the price actually typed, not the blend', row.unitCost, 7);
  check('total cost uses the typed price too', row.totalCost, 350);
  check('avg cost blends by quantity (100@5 + 50@7)/150 = 5.67', avgCostFor(sandbox, ss, 'HARDWARE', 'BOLT'), 5.67);
}

console.log('\nScenario C: cost left BLANK on an ENTRY changes nothing — cost is opt-in');
{
  const { sandbox, ss, archive } = buildSandbox();
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'HARDWARE', name: 'BOLT', qty: 100, unit: 'pcs', destLoc: 'A1A', unitCost: 5, forceSubmit: true }]);
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'HARDWARE', name: 'BOLT', qty: 40,  unit: 'pcs', destLoc: 'A1B', forceSubmit: true }]);   // no unitCost at all
  const row = lastCostRow(archive);
  check('no cost recorded for the un-costed row', row.unitCost, '');
  check('no total cost either', row.totalCost, '');
  check('average is UNCHANGED — a blank entry never touches it', avgCostFor(sandbox, ss, 'HARDWARE', 'BOLT'), 5);
}

console.log('\nScenario D: EXIT is priced from the average, server-side — a client-sent cost is ignored');
{
  const { sandbox, ss, archive } = buildSandbox();
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'HARDWARE', name: 'BOLT', qty: 100, unit: 'pcs', destLoc: 'A1A', unitCost: 5, forceSubmit: true }]);
  run(sandbox, ss, archive, [{ moveType: 'EXIT', category: 'HARDWARE', name: 'BOLT', qty: 30, unit: 'pcs', sourceLoc: 'A1A', unitCost: 999, forceSubmit: true }]);
  const row = lastCostRow(archive);
  check('EXIT uses the average on record, not the (fake) client-sent 999', row.unitCost, 5);
  check('total cost = average × qty removed', row.totalCost, 150);
  check('the average itself does not move on an EXIT', avgCostFor(sandbox, ss, 'HARDWARE', 'BOLT'), 5);
}

console.log('\nScenario E: WASTE of a material that has NEVER been priced gets no cost — blank, not zero');
{
  const { sandbox, ss, archive } = buildSandbox();
  // Stock has to exist to be wasted — entered with NO cost, so the material
  // stays genuinely unpriced, which is the actual case under test.
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'IGU', name: 'GLASS PANE', qty: 5, unit: 'pcs', destLoc: 'A1A', forceSubmit: true }]);
  run(sandbox, ss, archive, [{ moveType: 'WASTE', category: 'IGU', name: 'GLASS PANE', qty: 2, unit: 'pcs', sourceLoc: 'A1A', comments: 'cracked', forceSubmit: true }]);
  const row = lastCostRow(archive);
  check('unit cost is blank, not 0 (0 would mean "known to be free")', row.unitCost, '');
  check('total cost is blank too', row.totalCost, '');
}

console.log('\nScenario F: one material split across two locations in the SAME entry — same price everywhere, blends correctly');
{
  const { sandbox, ss, archive } = buildSandbox();
  run(sandbox, ss, archive, [
    { moveType: 'ENTRY', category: 'SCREEN', name: 'MESH', qty: 50, unit: 'pcs', destLoc: 'B1A', unitCost: 10, forceSubmit: true },
    { moveType: 'ENTRY', category: 'SCREEN', name: 'MESH', qty: 30, unit: 'pcs', destLoc: 'B1B', unitCost: 10, forceSubmit: true }
  ]);
  // 80 units total at one true price of $10 — splitting across two location
  // rows must not corrupt the average away from that.
  check('one purchase split across racks still averages to its own price', avgCostFor(sandbox, ss, 'SCREEN', 'MESH'), 10);
}

console.log('\nScenario G: the blend rounds to the cent — no drifting fractions of a penny');
{
  const { sandbox, ss, archive } = buildSandbox();
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'MISC', name: 'WIDGET', qty: 7, unit: 'pcs', destLoc: 'A1A', unitCost: 5.00, forceSubmit: true }]);
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'MISC', name: 'WIDGET', qty: 3, unit: 'pcs', destLoc: 'A1A', unitCost: 3.33, forceSubmit: true }]);
  // (7*5 + 3*3.33) / 10 = 44.99 / 10 = 4.499 -> rounds to 4.50
  check('rounds to the nearest cent, not a long float', avgCostFor(sandbox, ss, 'MISC', 'WIDGET'), 4.5);
}

console.log('\nScenario H: the CONFIG write-back updates ONE row per material, never appends a duplicate');
{
  const { sandbox, ss, archive, cfg } = buildSandbox();
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'HARDWARE', name: 'BOLT', qty: 100, unit: 'pcs', destLoc: 'A1A', unitCost: 5, forceSubmit: true }]);
  const afterFirst = cfg.rows.filter(r => r[14] === 'HARDWARE' && r[15] === 'BOLT').length;
  run(sandbox, ss, archive, [{ moveType: 'ENTRY', category: 'HARDWARE', name: 'BOLT', qty: 50, unit: 'pcs', destLoc: 'A1A', unitCost: 7, forceSubmit: true }]);
  const afterSecond = cfg.rows.filter(r => r[14] === 'HARDWARE' && r[15] === 'BOLT').length;
  check('exactly one CONFIG row after the first priced entry', afterFirst, 1);
  check('still exactly one after a second entry — updated in place, not duplicated', afterSecond, 1);
}

if (fails.length) { console.error('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('\npricing: ok');
