// ADJUST — the count that disagreed with the record.
//
// Jose asked for the button and asked what would make it different from Waste.
// The line agreed with him:
//
//   WASTE  = material that existed and was lost. It has a cost, it belongs to
//            a job, and "how much did we waste" is a real question about it.
//   ADJUST = the count is wrong. The system says 40, the rack holds 38. That
//            does not mean two broke — it means the RECORD is wrong. No cost,
//            no job, and it can go UP as easily as down.
//
// Keeping them apart is not tidiness. If a miscount is filed as waste, the
// company's waste figure quietly becomes "waste plus bookkeeping errors", and
// those are two different problems with two different fixes.
//
// The thing most likely to break here is not the feature, it is AGREEMENT:
// four separate functions turn movements into stock numbers, and if one of
// them has never heard of ADJUST, its numbers drift away from the other three.
// The drift shows up as a rack drawer that quietly reads wrong, weeks later,
// with nothing pointing at why. Half this file is about that.
//
// Usage:  node tools/test-adjust.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label); }
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
// Assertions below are about CODE, not about prose. The comments in this
// codebase name the things they are explaining — the ADJUST branch says in
// words that it leaves siteQty and wastedQty alone — so a naive search for
// "siteQty" finds the sentence promising not to touch it and reports a
// failure the code never committed.
function codeOnly(src) {
  return src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
}

function extractVar(name) {
  const a = GS.indexOf('var ' + name + ' = ');
  if (a === -1) throw new Error('var not found: ' + name);
  const curly = GS.indexOf('{', a), square = GS.indexOf('[', a);
  const arr = square !== -1 && (curly === -1 || square < curly);
  const open = arr ? '[' : '{', close = arr ? ']' : '}';
  let depth = 0, i = arr ? square : curly;
  for (; i < GS.length; i++) {
    if (GS[i] === open) depth++;
    else if (GS[i] === close) { depth--; if (depth === 0) return GS.slice(a, i + 1) + ';'; }
  }
  throw new Error('unbalanced brackets in ' + name);
}

// The real functions, lifted out of the file that ships.
const sandbox = {
  console, Math, Number, String, Object, Array, isFinite,
  normalizeString: s => String(s || '').trim().toUpperCase(),
  getMaterialId: (c, n) => String(c).trim().toUpperCase() + '|||' + String(n).trim().toUpperCase(),
  findFirstWarehouseLoc: (locs, qty) => {
    for (const k in locs) if (locs[k] >= qty) return k;
    return '';
  }
};
vm.createContext(sandbox);
vm.runInContext([
  extractVar('AC'),
  extractFn('adjustDirection_'),
  extractFn('statusForMoveType_'),
  extractFn('applyMovementToSnapshot_'),
  extractFn('buildStockSnapshot_')
].join('\n'), sandbox);

console.log('\n═══ direction lives in WHICH rack column is filled ═══\n');

{
  const d = sandbox.adjustDirection_;
  check('a rack in Source means the count came up SHORT — stock goes down', d('A1A', '') === -1);
  check('a rack in Destination means it came up LONG — stock goes up',      d('', 'A1A') === 1);
  // Both filled is a TRANSFER's shape, and neither is nothing at all. Either
  // one is a row no stock reader has a branch for, which is why the writer
  // refuses them rather than storing a movement that silently does nothing.
  check('BOTH filled is not a direction, it is a malformed row',            d('A1A', 'B2B') === 0);
  check('NEITHER filled is not a direction either',                         d('', '') === 0);
}

console.log('\n═══ what an adjustment does to stock ═══\n');

{
  // Jose's own example: the app says 40, the rack holds 38.
  const s = { wh: 40, site: 0, locs: { A1A: 40 }, project: '' };
  sandbox.applyMovementToSnapshot_(s, 'ADJUST', 2, 'A1A', '');
  check('counting short takes the difference off that rack', s.locs.A1A === 38);
  check('...and off the warehouse total',                    s.wh === 40 - 2);
  check('site stock is untouched — nothing went to a job',   s.site === 0);
}

{
  const s = { wh: 40, site: 0, locs: { A1A: 40 }, project: '' };
  sandbox.applyMovementToSnapshot_(s, 'ADJUST', 3, '', 'A1A');
  check('counting long adds the difference — an adjust goes UP too, unlike waste',
    s.locs.A1A === 43 && s.wh === 43);
}

{
  // Found on a shelf the app had no record of. Legitimate, and the form warns
  // about it, but it must not be refused: it is exactly what a first physical
  // count of a real warehouse turns up.
  const s = { wh: 0, site: 0, locs: {}, project: '' };
  sandbox.applyMovementToSnapshot_(s, 'ADJUST', 5, '', 'C3C');
  check('a rack the app had no record of can still receive a found count',
    s.locs.C3C === 5 && s.wh === 5);
}

{
  // A malformed row must do NOTHING rather than guess a direction. Guessing
  // would corrupt stock in whichever direction the guess went.
  const s = { wh: 10, site: 0, locs: { A1A: 10 }, project: '' };
  sandbox.applyMovementToSnapshot_(s, 'ADJUST', 4, 'A1A', 'B2B');
  check('a row with both racks changes nothing at all', s.wh === 10 && s.locs.A1A === 10);
}

console.log('\n═══ through the real snapshot builder, the way a batch sees it ═══\n');

const HEADER = new Array(22).fill('');
function row(mt, name, qty, src, dest, project) {
  const r = new Array(22).fill('');
  r[1] = 'WINDOW'; r[2] = name; r[5] = qty; r[8] = src;
  r[13] = project || ''; r[17] = dest; r[18] = mt;
  return r;
}

{
  const snap = sandbox.buildStockSnapshot_([
    HEADER,
    row('ENTRY',  'BS10', 40, '', 'A1A', 'PAT BS 10'),
    row('ADJUST', 'BS10',  2, 'A1A', '', '')
  ]);
  const s = snap['WINDOW|||BS10'];
  check('an adjust in the archive lands in the snapshot every later row is checked against',
    s.wh === 38 && s.locs.A1A === 38);
  // This is what makes the two rows read as one material's story rather than
  // as two unrelated things — the same failure Jose found with BS10 transfers.
  check('and it does NOT wipe the job the material was received for',
    s.project === 'PAT BS 10');
}

{
  const snap = sandbox.buildStockSnapshot_([
    HEADER,
    row('ENTRY',  'BS10', 40, '', 'A1A', 'PAT BS 10'),
    row('ADJUST', 'BS10',  2, 'A1A', '', ''),
    row('ADJUST', 'BS10',  5, '', 'A1A', '')
  ]);
  check('two adjustments in a row both count, in whichever direction each went',
    snap['WINDOW|||BS10'].wh === 43);
}

console.log('\n═══ status ═══\n');

{
  const st = sandbox.statusForMoveType_;
  check('an adjustment gets its own Status, not "In Stock" borrowed from ENTRY',
    st('ADJUST') === 'Adjusted');
  check('...and nothing else moved: EXIT is still Dispatched',  st('EXIT')  === 'Dispatched');
  check('...WASTE is still Damaged',                            st('WASTE') === 'Damaged');
  check('...ENTRY is still In Stock',                           st('ENTRY') === 'In Stock');
}

console.log('\n═══ ALL FOUR stock readers have to agree ═══\n');

// The real risk in this change. Four functions independently turn movements
// into stock, and a fifth (the snapshot) is exercised for real above. If one
// of them has never heard of ADJUST, its totals drift from the others and the
// symptom is a rack that reads wrong weeks later, pointing at nothing.
{
  const readers = [
    { name: 'calculateStock (the full scan)',            src: extractFn('calculateStock') },
    { name: 'applyMovementToSnapshot_ (the batch)',      src: extractFn('applyMovementToSnapshot_') },
    { name: 'getCurrentStockForItem (one material)',     src: extractFn('getCurrentStockForItem') },
    { name: 'refreshDerivedSheets_ (LIVE_STOCK et al.)', src: extractFn('refreshDerivedSheets_') }
  ];
  readers.forEach(function(r){
    check(r.name + ' knows what an ADJUST is', /=== 'ADJUST'/.test(r.src));
    // Both directions, or the reader is half-deaf: it would apply the shorts
    // and ignore the longs, which is worse than ignoring both because the
    // total looks plausible.
    const bothWays = /sourceLoc && !m?\.?destLoc|src && !dst|srcKey && !destKey/.test(r.src) &&
                     /destLoc && !m?\.?sourceLoc|dst && !src|destKey && !srcKey/.test(r.src);
    check('...and handles BOTH directions, not just the one that removes stock', bothWays);
  });
  // wastedQty is the figure this whole movement type exists to keep clean.
  // Bounded at both ends. The first version ran from the branch to the END of
  // calculateStock and swept up every later mention of siteQty in the function,
  // so it reported a failure the code had not committed.
  const calc = codeOnly(extractFn('calculateStock'));
  const adjBranch = calc.slice(calc.indexOf("mt === 'ADJUST'"),
                               calc.indexOf('applyReservationsAndFinalize_'));
  check('an adjustment never touches the WASTED total — that is the whole point of the type',
    !/wasted\w*\s*\+=/.test(adjBranch));
  check('...and never touches site stock either: nothing physically went anywhere',
    adjBranch.indexOf('siteQty') === -1);
}

console.log('\n═══ what the writer refuses ═══\n');

{
  const body = GS.slice(GS.indexOf('function addMovementsBatch_'),
                        GS.indexOf('function buildStockSnapshot_'));

  check('ADJUST is a movement type the server accepts at all',
    /'ENTRY','EXIT','TRANSFER','RETURN','WASTE','ADJUST'/.test(body));
  check('a row with no direction is refused rather than saved as a no-op',
    /An adjustment needs exactly one rack/.test(body));
  check('a reason is required, the same way WASTE requires one',
    /ADJUST movements require a reason/.test(body));

  // "Insufficient stock" would be nonsense on a correction whose premise is
  // that the stock figure is wrong. What the failure actually means is that
  // the figure MOVED while the person was counting.
  // Anchored on the validation block itself. Anchoring on the first
  // `mt === 'ADJUST'` picked up the project line further up and dragged the
  // EXIT/TRANSFER/WASTE stock check in with it — so the slice contained an
  // INSUFFICIENT that belongs to other movement types entirely.
  // Bounded to the ADJUST block alone. Running it as far as whBeforeThisRow
  // swallowed the EXIT/TRANSFER/WASTE stock check that sits between them, so
  // the slice contained an INSUFFICIENT belonging to other movement types.
  // Sliced FIRST, stripped second: offsets measured in `body` do not survive
  // codeOnly(), which changes the string's length.
  const guard = codeOnly(body.slice(body.indexOf('var adjDir = 0;'),
                                    body.indexOf('// Stock validation for outgoing moves')));
  check('a downward adjust is bounded by what the rack actually holds', /adjHave < qty/.test(guard));
  check('...and says the count went stale, not that stock is insufficient',
    /COUNT CHANGED/.test(guard) && !/INSUFFICIENT/.test(guard));

  // No cost, and no disturbing the running average. A wrong average poisons
  // every future cost for that material — see tools/test-pricing.js.
  const cost = body.slice(body.indexOf('var unitCost = null'), body.indexOf('var row = new Array'));
  check('an adjustment is never priced — both cost columns stay blank',
    /mt === 'ADJUST'/.test(cost));
  check('...and the branch that stamps the running average is not reached by it',
    cost.indexOf("mt === 'ADJUST'") < cost.indexOf('avgCostMap[matId]) {'));

  check('an adjustment carries no project, and does not inherit one',
    /if \(mt === 'ADJUST'\) proj = '';/.test(body));
}

{
  const lock = extractFn('enforceMaterialLock_');
  check('a locked material cannot be adjusted DOWN — same effect as an EXIT for whoever locked it',
    /mt === 'EXIT' \|\| mt === 'WASTE' \|\| mt === 'ADJUST'/.test(lock));
  // The early return on a missing source is what makes upward adjustments pass
  // through: they write DEST_LOC and leave SRC_LOC empty.
  check('...but finding MORE than the record said is never blocked',
    /if \(!srcKey\) return;/.test(lock));
}

{
  const upd = GS.slice(GS.indexOf('var NORMALIZE_ON_WRITE'), GS.indexOf('// Write updated row back'));
  check('editing an adjust cannot leave it with two racks, or none',
    /=== 'ADJUST'/.test(upd) && /adjustDirection_\(eSrc, eDst\)/.test(upd));
}

console.log('\n═══ the screen ═══\n');

{
  check('there is a sixth tab, and it is reachable',
    /data-type="ADJUST"[^>]*onclick="_moveTypeBarClick\('ADJUST'\)"/.test(HTML));
  check('and a button on the rack drawer, where a count actually happens',
    /data-action="rdw-move" data-type="ADJUST"/.test(HTML));
  check('the drawer keeps Adjust visible when a material is picked from a rack',
    /t === 'ENTRY' \|\| t === 'RETURN'/.test(HTML));

  const sec = HTML.slice(HTML.indexOf('<div id="adjustSection"'),
                         HTML.indexOf('</div><!-- /moveMatBox -->'));
  // The form asks for the COUNT, never for the difference. Asking a person
  // standing at a rack for "minus 2" is asking them to do arithmetic they can
  // get backwards; they know "38".
  check('the form asks what you COUNTED', /id="adjCounted"/.test(sec));
  check('...shows what the app believed, for comparison', /id="adjSays"/.test(sec));
  check('...and never asks for the difference itself', !/id="adjDelta"[^>]*<input/.test(sec));
  check('a reason is a required dropdown, not a hopeful free-text box', /id="adjReason"/.test(sec));

  const problem = HTML.slice(HTML.indexOf("_moveSectionVisible('adjustSection')"),
                             HTML.indexOf('// Single-material form'));
  check('a count that MATCHES is reported as an outcome, not as a missing field',
    /nothing to correct/.test(problem));
  check('Save stays disabled until there is a reason',
    /Choose why the count was off/.test(problem));
  check('"Other" has to actually be explained',
    /Say what happened in Comments/.test(problem));

  const submit = HTML.slice(HTML.indexOf("} else if (currentMoveType === 'ADJUST'){\n    // The rack goes in ONE column"),
                            HTML.indexOf('// Validation: source required for WASTE'));
  check('a short count puts the rack in Source, a long one in Destination',
    /sourceLoc = adjust\.delta < 0 \? adjust\.rack : '';/.test(submit) &&
    /destLoc   = adjust\.delta > 0 \? adjust\.rack : '';/.test(submit));

  check('history shows the sign per row, because an adjust points either way',
    /norm === 'ADJUST' && adjustIsDown\(m\)/.test(HTML));
  check('the project view uses the same rule, so a hand-edited row cannot inflate "Total Received"',
    (HTML.match(/norm === 'ADJUST' && adjustIsDown\(m\)/g) || []).length >= 2);
  check('the type filter can find them', /<option value="ADJUST">/.test(HTML));
}

console.log('\nadjust: ' + (fail === 0 ? 'ok (' + ok + ' checks)' : fail + ' FAILED'));
process.exit(fail === 0 ? 0 : 1);
