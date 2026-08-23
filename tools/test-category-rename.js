// CATEGORY RENAME — the bulk column rewrite, and what it must never touch.
//
// Renaming a category used to write one cell at a time: a network round trip
// to Google per matching archive row. On a real archive that is minutes, and
// it failed in production the first time it was tried for real — the button
// looked dead, got clicked twice, and the second click reported
// '"IGU" not found in categories' for a rename that had worked.
//
// v10.1 replaced that with read-once / change-in-memory / write-once. That is
// the right trade, but it moves the risk: a mistake in the transform no longer
// corrupts rows slowly, it corrupts the whole column in a single setValues. So
// the transform gets its own test, and the test's main job is not "did the
// right cells change" — it is "did EVERY OTHER CELL come out byte-identical".
//
// This runs the REAL renameCategoryColumn_ lifted out of Code_v3_fixed.gs
// against a fake Sheet, so the thing under test is the shipping code and not a
// paraphrase of it.
//
// Usage:  node tools/test-category-rename.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// ── Lift the real function ──────────────────────────────────────────────────
function extractFn(name) {
  const start = GS.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('not found in Code_v3_fixed.gs: ' + name);
  let depth = 0, i = GS.indexOf('{', start);
  const open = i;
  for (; i < GS.length; i++) {
    if (GS[i] === '{') depth++;
    else if (GS[i] === '}') { depth--; if (depth === 0) return GS.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

const AC_MATCH = /var AC = \{[\s\S]*?\};/.exec(GS);
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(AC_MATCH[0] + '\n' + extractFn('renameCategoryColumn_'), sandbox);
const renameCategoryColumn_ = sandbox.renameCategoryColumn_;
const AC = sandbox.AC;

// ── A fake Sheet, only as much as the function actually uses ────────────────
// Records every write so the test can assert not just the values but how many
// round trips it took — the whole point of the change.
function makeSheet(categoryColumn) {
  const rows = categoryColumn.map(v => [v]);
  const calls = { getValues: 0, setValues: 0, setValue: 0 };
  return {
    _rows: rows,
    _calls: calls,
    getLastRow: () => rows.length + 1,       // +1 for the header row
    getRange(startRow, startCol, numRows, numCols) {
      if (startRow !== 2) throw new Error('expected the read to skip the header row, got startRow=' + startRow);
      if (startCol !== AC.CATEGORY + 1) throw new Error('wrote to the wrong column: ' + startCol);
      if (numRows !== rows.length || numCols !== 1) throw new Error('unexpected range size');
      return {
        getValues() { calls.getValues++; return rows.map(r => [r[0]]); },   // copy, like the real API
        setValues(v) { calls.setValues++; for (let i = 0; i < v.length; i++) rows[i][0] = v[i][0]; },
        setValue() { calls.setValue++; }
      };
    }
  };
}

console.log('\n═══ the transform ═══\n');

{
  const before = [
    'IGU', 'WINDOW', 'igu', 'SCREEN', ' IGU ', 'MIRROR', 'IGUANA',
    'WINDOW_PARTS', 'IGU', '', 'SHOWER'
  ];
  const sheet = makeSheet(before.slice());
  const n = renameCategoryColumn_(sheet, 'IGU', 'IGU (ISOLATED GLASS UNIT)');
  const after = sheet._rows.map(r => r[0]);

  check('renamed the 4 rows that were IGU — including the lowercase one and the one with stray spaces, because the archive has both',
    n === 4);

  // THE assertion this file exists for.
  const shouldChange = i => String(before[i]).trim().toUpperCase() === 'IGU';
  const collateral = before
    .map((v, i) => ({ i, v, out: after[i] }))
    .filter(r => !shouldChange(r.i) && r.out !== r.v);
  check('every cell that was NOT the renamed category came out byte-identical' +
        (collateral.length ? ' — CHANGED: ' + JSON.stringify(collateral) : ''),
    collateral.length === 0);

  check('"IGUANA" was left alone — the match is the whole cell, not a prefix', after[6] === 'IGUANA');
  check('the empty cell stayed empty rather than becoming the new category name', after[9] === '');
  check('the renamed cells all carry the exact stored value, uppercase and all',
    [0, 2, 4, 8].every(i => after[i] === 'IGU (ISOLATED GLASS UNIT)'));
}

console.log('\n═══ the round trips — the reason for the change ═══\n');

{
  const sheet = makeSheet(new Array(5000).fill('IGU'));
  const n = renameCategoryColumn_(sheet, 'IGU', 'GLASS');
  check('5000 matching rows rewritten in ONE setValues, not 5000 setValue calls (the old way: ' +
        n + ' network round trips, minutes, and a real chance of dying half-renamed at the 6-minute ceiling)',
    sheet._calls.setValues === 1 && sheet._calls.setValue === 0);
  check('...and read in one getValues', sheet._calls.getValues === 1);
}

{
  const sheet = makeSheet(['WINDOW', 'SCREEN', 'MIRROR']);
  const n = renameCategoryColumn_(sheet, 'IGU', 'GLASS');
  check('a rename that matches nothing writes NOTHING — no pointless rewrite of the whole column',
    n === 0 && sheet._calls.setValues === 0);
}

{
  const empty = makeSheet([]);
  check('a sheet with only a header row is left alone instead of throwing on a zero-height range',
    renameCategoryColumn_(empty, 'IGU', 'GLASS') === 0 && empty._calls.getValues === 0);
  check('a missing sheet returns 0 rather than blowing up the whole rename',
    renameCategoryColumn_(null, 'IGU', 'GLASS') === 0);
}

console.log('\n═══ the callers — both sheets, and the cache rebuilt after ═══\n');

// Reading the call site, not the helper: the helper being correct is worthless
// if updateConfig only ever points it at one of the two sheets.
{
  const start = GS.indexOf('function updateConfig(');
  const body  = GS.slice(start, GS.indexOf('\nfunction ', start + 10));

  check('updateConfig renames the Category column in MASTER_ARCHIVE_V3',
    /renameCategoryColumn_\(\s*ss\.getSheetByName\(SHEETS\.ARCHIVE\)/.test(body));
  check('...AND in ARCHIVE_HISTORY — refreshDerivedSheets_ reads the two concatenated, so renaming only one splits a category into two materials the first time old rows are archived',
    /renameCategoryColumn_\(\s*ensureArchiveHistorySheet_\(ss\)/.test(body));
  check('...and rebuilds LIVE_STOCK / SITE_STOCK / WASTED_STOCK afterwards — every screen reads that cache, not the archive, so without this the rename is invisible until someone saves a movement',
    /refreshDerivedSheets_\(ss\)/.test(body));
  check('...with all of it inside the stock lock, so a save cannot land against a half-renamed archive',
    /withStockLock_\(function[\s\S]*renameCategoryColumn_[\s\S]*refreshDerivedSheets_\(ss\)/.test(body));
}

// The bug that started this: CONFIG stored what was typed, the archive stored
// it uppercased, and the two stopped matching each other.
{
  const start = GS.indexOf('function updateConfig(');
  const body  = GS.slice(start, GS.indexOf('\nfunction ', start + 10));
  check('CONFIG and the archive are written from the SAME uppercased value — the mismatch that put "IGU (isolated glass unit)" in the catalog and "IGU (ISOLATED GLASS UNIT)" in the movements cannot recur',
    /var nvStored = sheetSafe_\(nv\.toUpperCase\(\)\);/.test(body) &&
    /setValue\(nvStored\)/.test(body) &&
    /renameCategoryColumn_\([\s\S]{0,80}?,\s*val,\s*nvStored\)/.test(body));
}

console.log('\ncategory-rename: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
