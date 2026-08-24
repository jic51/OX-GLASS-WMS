// PACKS — how many stocking units come in a box, a pallet, a sack.
//
// Phase 1 of docs/UNIDADES-Y-CONVERSIONES.md, and the reason it is phase ONE:
// nothing here changes how stock is stored, summed or taken out. Packs are a
// remembered sentence ("a box of GE SILPRUF holds 12 tubes") plus a division.
// That is what keeps the risk near zero — issuing in another unit is phase 2,
// where a misapplied factor turns 319 tubes into 3,828 and nobody notices until
// somebody counts the shelf.
//
// What this file guards, in order of how badly it would hurt:
//
//   1. THE ARITHMETIC. packMath_ decides a unit cost that the weighted-average
//      engine will then blend into every future number for that material. Wrong
//      here is wrong forever and silently.
//   2. FLOATING POINT. Quantities carry decimals now — a sack is 110.23 lb —
//      and 0.1 + 0.2 is 0.30000000000000004 on every computer ever built.
//      Rounding on write is the only thing stopping that error accumulating.
//   3. THE REFUSALS. A pack with no size, or a size of zero, or a "pack" of 1
//      are all ways of writing a row that changes nothing while looking like it
//      changed something.
//
// Runs the REAL functions out of Code_v3_fixed.gs in a Node vm against a fake
// spreadsheet.
//
// Usage:  node tools/test-packs.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const GS   = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function extractFn(name) {
  const start = GS.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('not found: ' + name);
  let depth = 0, i = GS.indexOf('{', start);
  for (; i < GS.length; i++) {
    if (GS[i] === '{') depth++;
    else if (GS[i] === '}') { depth--; if (depth === 0) return GS.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}
function pick(re) { const m = re.exec(GS); return m ? m[0] : ''; }

const HEADER = ['Category','Name','Pack','Units_Per_Pack','Last_Pack_Price','Updated_At','Updated_By'];

function build(rows) {
  const data = [HEADER].concat(rows || []);
  const audit = [];
  const sheet = {
    getLastRow: () => data.length,
    getLastColumn: () => 7,
    setFrozenRows: () => {},
    appendRow: r => { data.push(r.slice()); },
    deleteRow: n => { data.splice(n - 1, 1); },
    getRange(r, c, nr, nc) {
      return {
        getValues: () => data.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)),
        setValues: v => { for (let i = 0; i < v.length; i++) data[r - 1 + i] = v[i].slice(); },
        setFontWeight: () => {}
      };
    }
  };
  const sandbox = {
    console, Date, Math, Number, String, isFinite, Object,
    SHEETS: { PACKS: 'MATERIAL_PACKS' },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    requireAuth_: () => ({ email: 'boss@oxglass.com', role: 'ADMIN' }),
    requirePerm_: () => {},
    auditLog_: (...a) => audit.push(a),
    _data: data, _audit: audit
  };
  const ss = {
    getSheetByName: n => (n === 'MATERIAL_PACKS' ? sheet : null),
    insertSheet: () => sheet
  };
  vm.createContext(sandbox);
  vm.runInContext([
    pick(/var PACK_COLS = \{[^}]*\};/),
    pick(/var PACK_DECIMALS = \d+;/),
    extractFn('ensurePacksSheet_'), extractFn('roundQty_'), extractFn('packKey_'),
    extractFn('readPacks_'), extractFn('saveMaterialPack'), extractFn('deleteMaterialPack'),
    extractFn('packMath_')
  ].join('\n'), sandbox);
  return sandbox;
}

console.log('\n═══ the arithmetic — wrong here is wrong forever ═══\n');

{
  const S = build();
  // Jose's own example: one pallet, 30 boxes, 12 tubes each.
  const r = S.packMath_(1, 360, 2160);
  check('1 pallet of 360 tubes at $2,160 → 360 tubes and $6.00 a tube',
    r.qty === 360 && r.unitCost === 6 && r.totalPrice === 2160);

  const r2 = S.packMath_(3, 12, 120);
  check('3 boxes of 12 at $120 a box → 36 units, $10.00 each, $360 spent',
    r2.qty === 36 && r2.unitCost === 10 && r2.totalPrice === 360);

  const r3 = S.packMath_(10, 50, null);
  check('quantity still works with no price at all — the pack is useful even when nobody knows the cost',
    r3.qty === 500 && r3.unitCost === null && r3.totalPrice === null);

  check('a price of zero yields NO unit cost rather than $0.00 — "free" and "not entered" are different claims',
    S.packMath_(2, 12, 0).unitCost === null);
}

{
  const S = build();
  [[0, 12, 100], [2, 0, 100], [-1, 12, 100], ['abc', 12, 100], [2, 'x', 100]]
    .forEach(args => {
      check('refuses to compute from ' + JSON.stringify(args) + ' instead of returning a plausible-looking number',
        S.packMath_.apply(null, args) === null);
    });
}

console.log('\n═══ floating point — the error that accumulates ═══\n');

{
  const S = build();
  check('0.1 + 0.2 style drift is rounded away on write: 3 sacks of 110.23 lb is exactly 330.69',
    S.roundQty_(3 * 110.23) === 330.69);
  check('...and a value that cannot be represented exactly still comes back clean',
    S.roundQty_(0.1 + 0.2) === 0.3);
  check('...four decimals kept, which is grams inside a kilo',
    S.roundQty_(1.23456789) === 1.2346);
  check('...and nonsense becomes 0 rather than NaN, which would poison every sum it touches',
    S.roundQty_('not a number') === 0 && S.roundQty_(Infinity) === 0);

  // 45 / 110.23 = 0.40823732…, which rounds to 0.4082 at four places. Worked
  // out by hand rather than copied from the output — a test that asserts
  // whatever the code happens to print is not a test. This one caught my own
  // arithmetic first: I had written 0.4083.
  const r = S.packMath_(3, 110.23, 45);
  check('a bakery sack works end to end: 3 × 110.23 lb = 330.69 lb at $0.4082/lb',
    r.qty === 330.69 && r.unitCost === 0.4082);
}

console.log('\n═══ saving a pack ═══\n');

{
  const S = build();
  S.saveMaterialPack({ category: 'hardware', name: 'ge silpruf', pack: 'box', perPack: 12, lastPrice: 120 });
  const packs = S.readPacks_(S.SpreadsheetApp.getActiveSpreadsheet());
  const k = S.packKey_('HARDWARE', 'GE SILPRUF');
  check('a pack is stored under its material, uppercased like every other catalog value',
    packs[k] && packs[k].packs.length === 1 && packs[k].packs[0].pack === 'BOX');
  check('...with the price they paid, because Jose asked for it to be kept',
    packs[k].packs[0].lastPrice === 120);
  check('...and an audit entry, since this changes what future costs are computed from',
    S._audit.length === 1);
}

{
  const S = build();
  S.saveMaterialPack({ category: 'HARDWARE', name: 'GE SILPRUF', pack: 'BOX', perPack: 12, lastPrice: 120 });
  const res = S.saveMaterialPack({ category: 'HARDWARE', name: 'GE SILPRUF', pack: 'box', perPack: 10, lastPrice: 115 });
  const packs = S.readPacks_(S.SpreadsheetApp.getActiveSpreadsheet());
  const k = S.packKey_('HARDWARE', 'GE SILPRUF');
  check('saving the same pack again REPLACES it rather than adding a second one — the supplier changed the box, there is still one box',
    res.updated === true && packs[k].packs.length === 1 && packs[k].packs[0].perPack === 10);
}

{
  const S = build();
  S.saveMaterialPack({ category: 'HARDWARE', name: 'GE SILPRUF', pack: 'PALLET', perPack: 360, lastPrice: 2160 });
  S.saveMaterialPack({ category: 'HARDWARE', name: 'GE SILPRUF', pack: 'BOX', perPack: 12, lastPrice: 120 });
  const p = S.readPacks_(S.SpreadsheetApp.getActiveSpreadsheet())[S.packKey_('HARDWARE','GE SILPRUF')];
  check('one material can hold several packs at once — Jose\'s sealant arrives by the pallet AND by the box',
    p.packs.length === 2);
  check('...offered smallest first, the order somebody thinks in looking at what arrived',
    p.packs[0].pack === 'BOX' && p.packs[1].pack === 'PALLET');
}

{
  const S = build();
  S.saveMaterialPack({ category: 'WINDOW', name: 'JJF 109', pack: 'BOX', perPack: 4 });
  S.saveMaterialPack({ category: 'SCREEN', name: 'JJF 109', pack: 'BOX', perPack: 9 });
  const all = S.readPacks_(S.SpreadsheetApp.getActiveSpreadsheet());
  check('the same NAME in two categories keeps two separate packs — keyed like stock is, so they cannot bleed together',
    all[S.packKey_('WINDOW','JJF 109')].packs[0].perPack === 4 &&
    all[S.packKey_('SCREEN','JJF 109')].packs[0].perPack === 9);
}

console.log('\n═══ what it refuses, and why each one matters ═══\n');

{
  const cases = [
    [{ name: 'X', pack: 'BOX', perPack: 12 },                    /Pick the material/,  'no category'],
    [{ category: 'C', name: 'X', perPack: 12 },                  /pack a name/,        'a pack with no name'],
    [{ category: 'C', name: 'X', pack: 'BOX', perPack: 0 },      /more than zero/,     'a pack that holds zero'],
    [{ category: 'C', name: 'X', pack: 'BOX', perPack: -5 },     /more than zero/,     'a negative pack'],
    [{ category: 'C', name: 'X', pack: 'BOX', perPack: 'twelve' },/more than zero/,    'a pack size that is not a number'],
    [{ category: 'C', name: 'X', pack: 'BOX', perPack: 1 },      /same as the unit/,   'a "pack" of exactly 1']
  ];
  cases.forEach(([data, re, what]) => {
    const S = build();
    let threw = null;
    try { S.saveMaterialPack(data); } catch (e) { threw = e.message; }
    check(what + ' is refused, with a reason that names the problem',
      threw && re.test(threw) && S._data.length === 1);
  });
}

{
  const S = build([
    ['HARDWARE','GOOD','BOX',12,0,'',''],
    ['HARDWARE','BROKEN','BOX','',0,'',''],     // no size — hand-edited into the sheet
    ['','','',0,0,'','']                        // a blank row somebody left behind
  ]);
  const packs = S.readPacks_(S.SpreadsheetApp.getActiveSpreadsheet());
  check('a row with no pack size is SKIPPED, not defaulted to 1 — a silent 1 would quietly make "12 boxes" mean 12 units',
    Object.keys(packs).length === 1 && packs[S.packKey_('HARDWARE','GOOD')]);
}

console.log('\n═══ deleting ═══\n');

{
  const S = build();
  S.saveMaterialPack({ category: 'HARDWARE', name: 'A', pack: 'BOX', perPack: 12 });
  S.saveMaterialPack({ category: 'HARDWARE', name: 'A', pack: 'PALLET', perPack: 360 });
  S.saveMaterialPack({ category: 'HARDWARE', name: 'B', pack: 'BOX', perPack: 6 });
  const res = S.deleteMaterialPack({ category: 'HARDWARE', name: 'A', pack: 'box' });
  const packs = S.readPacks_(S.SpreadsheetApp.getActiveSpreadsheet());
  check('deleting removes exactly the one named', res.deleted === 1);
  check('...leaving the material\'s other pack alone',
    packs[S.packKey_('HARDWARE','A')].packs.length === 1 &&
    packs[S.packKey_('HARDWARE','A')].packs[0].pack === 'PALLET');
  check('...and another material entirely untouched',
    packs[S.packKey_('HARDWARE','B')].packs.length === 1);
  check('deleting something that is not there is a no-op, not an error',
    S.deleteMaterialPack({ category: 'NOPE', name: 'NOPE', pack: 'NOPE' }).deleted === 0);
}

console.log('\n═══ nothing about stock changed — the promise of phase 1 ═══\n');

{
  // Stated as a source fact rather than a behaviour, because the whole safety
  // argument for shipping phase 1 first is that the stock path is untouched.
  const stockFns = ['calculateStock', 'refreshDerivedSheets_', 'addMovementsBatch_'];
  stockFns.forEach(fn => {
    const start = GS.indexOf('function ' + fn + '(');
    const body  = GS.slice(start, GS.indexOf('\nfunction ', start + 10));
    check(fn + ' does not know packs exist yet — phase 1 cannot move a stock number',
      start !== -1 && !/packMath_|readPacks_|PACK_COLS/.test(body));
  });
}

console.log('\n═══ and the label the person actually reads ═══\n');

{
  const at = HTML.indexOf('function _costLabelFor(');
  const seg = HTML.slice(at, at + 400);
  check('the cost label names the unit — "Cost per Box", not "Unit Cost" beside a dropdown reading Box',
    /Cost per/.test(seg));
  check('...and it is re-synced when the unit is changed, not only when the line is drawn',
    /onchange="_syncCostLabel\(/.test(HTML));
  check('PALLET, CASE and BAG are on the unit list now — a pallet shop and a bakery had no word for what they count',
    /value="PALLET"/.test(HTML) && /value="CASE"/.test(HTML) && /value="BAG"/.test(HTML));
}

console.log('\npacks: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
