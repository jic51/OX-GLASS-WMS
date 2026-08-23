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
const AC_W_MATCH = /var AC_WIDTH = \d+;/.exec(GS);
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext([
  AC_MATCH[0], AC_W_MATCH[0],
  extractFn('rewriteArchiveColumn_'),     // the engine
  extractFn('renameCategoryColumn_')      // the category caller, a thin wrapper over it
].join('\n'), sandbox);
const { renameCategoryColumn_, rewriteArchiveColumn_, AC, AC_WIDTH } = sandbox;

// ── A fake Sheet, only as much as the functions actually use ────────────────
// Full-width rows, because rewriteArchiveColumn_ reads the WHOLE row: the
// callers that matter decide from columns other than the one they write
// (rename a material = match category AND name, write name). Records every
// round trip so the test can assert not just the values but the number of
// calls — which is the entire point of the bulk rewrite.
function makeSheet(categoryColumn) {
  const rows = categoryColumn.map(v => {
    const r = new Array(AC_WIDTH).fill('');
    r[AC.CATEGORY] = v;
    return r;
  });
  const calls = { getValues: 0, setValues: 0, setValue: 0 };
  return {
    _rows: rows,
    _calls: calls,
    _col: c => rows.map(r => r[c]),
    getLastRow: () => rows.length + 1,       // +1 for the header row
    getLastColumn: () => AC_WIDTH,
    getRange(startRow, startCol, numRows, numCols) {
      if (startRow !== 2) throw new Error('expected reads/writes to skip the header row, got startRow=' + startRow);
      if (numRows !== rows.length) throw new Error('unexpected range height: ' + numRows);
      return {
        getValues() {
          calls.getValues++;
          // A copy, like the real API — mutating what getValues returned must
          // not silently reach the sheet, or a "bulk write" that never wrote
          // would still pass.
          return rows.map(r => r.slice(startCol - 1, startCol - 1 + numCols));
        },
        setValues(v) {
          calls.setValues++;
          for (let i = 0; i < v.length; i++)
            for (let j = 0; j < numCols; j++) rows[i][startCol - 1 + j] = v[i][j];
        },
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
  const after = sheet._col(AC.CATEGORY);

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

console.log('\n═══ manageMaterial: matching on one column, writing another ═══\n');

// The case that makes rewriteArchiveColumn_ hand the WHOLE row to `decide`
// rather than just the target column. Renaming a material matches on category
// AND name and writes the name; if it matched only on the name it would rename
// every "GE SILPRUF" in the building instead of the one the admin was looking
// at. Two categories with the same material name is not a corner case — it is
// the normal state of a glass shop's catalog.
{
  const sheet = makeSheet(['WINDOW', 'SCREEN', 'WINDOW', 'MIRROR']);
  const names = ['GE SILPRUF', 'GE SILPRUF', 'RAIN BUSTER', 'GE SILPRUF'];
  sheet._rows.forEach((r, i) => { r[AC.NAME] = names[i]; });

  const n = rewriteArchiveColumn_(sheet, AC.NAME, row =>
    (String(row[AC.CATEGORY]).toUpperCase() === 'WINDOW' &&
     String(row[AC.NAME]).toUpperCase() === 'GE SILPRUF') ? 'GE SILPRUF NT' : null);

  const after = sheet._col(AC.NAME);
  check('renamed only the row that matched BOTH category and name', n === 1 && after[0] === 'GE SILPRUF NT');
  check('the SAME material name under a different category was left alone — matching on the written column only would have renamed it too',
    after[1] === 'GE SILPRUF' && after[3] === 'GE SILPRUF');
  check('a different material in the same category was left alone', after[2] === 'RAIN BUSTER');
  check('and the Category column was not touched at all by a write aimed at Name',
    sheet._col(AC.CATEGORY).join('|') === 'WINDOW|SCREEN|WINDOW|MIRROR');
}

// Reading manageMaterial itself. The helper being right is no help if the
// caller only points it at one sheet or forgets the rebuild — which is exactly
// what it did before v10.4: rename, changeCategory and merge wrote cell by cell
// and NEVER called refreshDerivedSheets_, so renaming a material appeared to do
// nothing until somebody saved a movement.
{
  const start = GS.indexOf('function manageMaterialLocked_(');
  const body  = GS.slice(start, GS.indexOf('\nfunction ', start + 10));

  check('manageMaterial rewrites both MASTER_ARCHIVE_V3 and ARCHIVE_HISTORY, through one helper used by every op',
    /rewriteArchiveColumn_\(archive, col, decide\)/.test(body) &&
    /rewriteArchiveColumn_\(ensureArchiveHistorySheet_\(ss\), col, decide\)/.test(body));

  const ops = ['rename', 'changeCategory', 'merge'];
  ops.forEach(op => {
    const i = body.indexOf("op === '" + op + "'");
    const next = ops.map(o => body.indexOf("op === '" + o + "'")).filter(x => x > i);
    const seg = body.slice(i, next.length ? Math.min.apply(null, next) : body.indexOf("op === 'deleteRow'"));
    check(op + ' rebuilds the derived sheets — without it the change is invisible on every screen until someone saves a movement',
      /refreshDerivedSheets_\(ss\)/.test(seg));
    check('...and ' + op + ' writes in bulk, with no setValue-per-row left behind',
      !/\.setValue\(/.test(seg));
  });

  check('deleting a row logs the FULL row width (AC_WIDTH), not the hardcoded 19 that silently dropped PM and both cost columns from the record of a deletion',
    /getRange\(rowIdx, 1, 1, AC_WIDTH\)/.test(body));
}

console.log('\ncategory-rename: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
