// CONCURRENCY — what happens when two people save at the same time.
//
// This is the question Jose put first, and it is the right one: the public
// literature on spreadsheets-as-inventory says they break on simultaneous
// edits BEFORE they break on size, and the failure is silent — everyone sees
// "saved ✓" and the number is simply wrong afterwards.
//
// The file has two halves, and they are different KINDS of evidence. Read the
// labels; do not let this one mislead the way test-favicon.js did.
//
//   PART 1 — REAL SOURCE. Which write paths actually take the script lock, read
//   out of Code_v3_fixed.gs. This is fact about the shipping code.
//
//   PART 2 — A MODEL. A faithful but small simulation of read-modify-write
//   under Apps Script's lock semantics, to show what the Part 1 gaps mean in
//   practice. It does NOT execute addMovementsBatch_ — that needs real Sheets.
//   It demonstrates the mechanism, not the product.
//
// What neither half can do is prove the real thing is safe on real Google
// infrastructure. That still needs several people hitting one installation at
// once. This narrows what to look for when that happens.
//
// Usage:  node tools/test-concurrency.js

const fs = require('fs'), path = require('path');
const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// ── Source helpers ──────────────────────────────────────────────────────────
const LINES = GS.split('\n');
const FUNCS = [];
LINES.forEach((l, i) => {
  const m = /^function ([A-Za-z0-9_]+)\s*\(/.exec(l);
  if (m) FUNCS.push({ start: i + 1, name: m[1] });
});
function bodyOf(name) {
  const i = FUNCS.findIndex(f => f.name === name);
  if (i === -1) return null;
  const end = i + 1 < FUNCS.length ? FUNCS[i + 1].start - 1 : LINES.length;
  return LINES.slice(FUNCS[i].start - 1, end).join('\n');
}
function takesLock(name) {
  const b = bodyOf(name) || '';
  // withStockLock_ is the shared helper (v10.0). A path that calls it is as
  // protected as one that takes the lock by hand.
  return /waitLock\(|tryLock\(|withStockLock_\(/.test(b);
}
// Some work was split out of a wrapper so the lock could be taken without
// re-indenting a hundred lines of audited logic — modifyMovement now holds the
// door and modifyMovementLocked_ does the work. The helper writes to the
// archive and takes no lock of its own, so the guard below would report it as
// a brand-new hole in the fix that just closed it.
//
// The `Locked_` suffix is NOT taken on faith. This finds every caller of the
// helper and checks that EVERY call site sits inside a withStockLock_ callback
// — by matching parentheses, not by hoping a regex lands on the right line. If
// someone later calls modifyMovementLocked_ from outside the lock, this stops
// returning true and the guard fires, which is the entire point of it.
function lockRegions(body) {
  const out = [];
  let i = 0;
  while ((i = body.indexOf('withStockLock_(', i)) !== -1) {
    let depth = 0, j = i + 'withStockLock_'.length;
    for (; j < body.length; j++) {
      if (body[j] === '(') depth++;
      else if (body[j] === ')') { depth--; if (depth === 0) { j++; break; } }
    }
    out.push([i, j]);
    i = j;
  }
  return out;
}
// Transitive on purpose. rewriteArchiveColumn_ is called by
// manageMaterialLocked_, which is itself only reached from inside the lock —
// so it IS protected, but not by a withStockLock_ that appears in its caller's
// own body. Checking one hop only would report it as a hole and the guard would
// cry wolf on correct code, which is how a guard stops being read.
//
// `seen` guards against a cycle: two helpers calling each other would otherwise
// recurse forever, and a cycle with no lock anywhere in it must come out FALSE
// rather than accidentally true.
//
// It is a PATH, not one shared set, and the difference is not academic. It used
// to be a single object handed down every branch, so the first branch to visit
// a function poisoned it for all the later ones. v11.23 added a function that
// calls THREE different `Locked_` helpers; the first resolved correctly, and
// the second and third were then reported as unlocked purely because the shared
// set already held their common caller. Correct code, guard crying wolf — the
// exact failure the transitive check above exists to prevent. Each branch now
// carries its own copy, so a name is visited at most once per path and cycles
// still terminate.
function lockedByCaller(name, seen) {
  seen = seen || {};
  if (seen[name]) return false;
  const callers = FUNCS.map(f => f.name).filter(c =>
    c !== name && new RegExp('\\b' + name + '\\s*\\(').test(bodyOf(c) || ''));
  if (!callers.length) return false;           // nobody calls it — not covered
  return callers.every(c => {
    const b = bodyOf(c) || '';
    const regions = lockRegions(b);
    const call = new RegExp('\\b' + name + '\\s*\\(', 'g');
    let m, allInside = true, sawCall = false;
    while ((m = call.exec(b))) {
      sawCall = true;
      if (!regions.some(([s, e]) => m.index > s && m.index < e)) allInside = false;
    }
    if (!sawCall) return false;
    if (allInside) return true;
    // Not wrapped here — but this caller may itself only run under the lock.
    const path = Object.assign({}, seen);
    path[name] = true;
    return takesLock(c) || lockedByCaller(c, path);
  });
}

// A path that can change what the stock numbers come out as. Merely MENTIONING
// the archive is not enough — updateConfig reads it and writes only to CONFIG,
// and counting that as a stock writer buries the real ones in noise. So this
// looks for a write whose target is a handle taken from one of those sheets.
function mutatesStock(name) {
  const b = bodyOf(name) || '';
  // Step 1: locals bound directly to a stock-bearing sheet.
  const handles = new Set();
  let m;
  const bind = /(?:var|const|let)\s+([A-Za-z0-9_]+)\s*=\s*[A-Za-z0-9_]*\.?getSheetByName\(\s*SHEETS\.(?:ARCHIVE|ARCHIVE_HISTORY|LIVE|SITE|WASTE)/g;
  while ((m = bind.exec(b))) handles.add(m[1]);
  const ensure = /(?:var|const|let)\s+([A-Za-z0-9_]+)\s*=\s*ensure(?:ArchiveHistory|Waste)Sheet_\(/g;
  while ((m = ensure.exec(b))) handles.add(m[1]);
  if (!handles.size) return false;

  // Step 2: one hop of taint. `var range = archive.getRange(...)` then
  // `range.setValues(...)` is the normal way this code writes, and without
  // following that hop the real offenders (modifyMovement, mergeLocations)
  // are invisible while harmless readers still look guilty.
  const hop = /(?:var|const|let)\s+([A-Za-z0-9_]+)\s*=\s*([A-Za-z0-9_]+)\s*\.\s*getRange\(/g;
  for (let pass = 0; pass < 2; pass++) {
    hop.lastIndex = 0;
    while ((m = hop.exec(b))) if (handles.has(m[2])) handles.add(m[1]);
  }

  return [...handles].some(h =>
    new RegExp('\\b' + h + '\\s*\\.\\s*(?:setValues?|appendRow|deleteRow|clearContent)\\s*\\(').test(b) ||
    new RegExp('\\b' + h + '\\s*\\.\\s*getRange\\([^;\\n]*\\)\\s*\\.\\s*(?:setValues?|clearContent)\\s*\\(').test(b)
  );
}

console.log('\n═══ PART 1 — real source: who holds the lock ═══');

console.log('\nThe two paths that were designed for this, and still are');
[
  ['addMovementsBatch_', 'saving movements'],
  ['archiveOldMovements', 'moving old rows to ARCHIVE_HISTORY'],
  // Step 1 of the fix (v10.0) — the two an admin touches on an ordinary day
  ['modifyMovement', 'editing a saved movement'],
  ['updateConfig', 'renaming a category, which rewrites every matching archive row'],
  // Step 2 (v10.4) — the catalog surgery an admin does every few months
  ['manageMaterial', 'renaming, merging, recategorising or deleting a material'],
  ['mergeConfigValues', 'merging two spellings of a project or supplier'],
  ['mergeLocations', 'merging two locations, which moves stock between them']
].forEach(([fn, what]) => {
  check(fn + ' takes the script lock (' + what + ')', takesLock(fn));
});

// The read has to happen INSIDE the lock, or the lock is decoration: two
// executions could both read the same "before" state and then queue up to
// write, and the second would still overwrite the first.
{
  const b = bodyOf('addMovementsBatch_') || '';
  const lockAt = b.search(/waitLock\(/);
  const readAt = b.search(/archive\.getDataRange\(\)\.getValues\(\)/);
  check('...and addMovementsBatch_ reads the archive AFTER taking it, not before — otherwise the lock would be decoration',
    lockAt !== -1 && readAt !== -1 && lockAt < readAt);
  check('...and releases it in a finally, so a thrown validation error cannot wedge every other user out',
    /finally\s*\{[^}]*releaseLock\(\)/s.test(b));
}

// The wrapper split has to be airtight, or the fix is worse than the gap: the
// helper looks protected while a second caller walks straight past the door.
check('modifyMovementLocked_ is only ever reached from inside withStockLock_ — every call site, checked by matching parens',
  lockedByCaller('modifyMovementLocked_'));
check('...and it really is the part that writes to the archive, so the lock is around the writes and not just around the auth checks',
  mutatesStock('modifyMovementLocked_'));

// renameCategoryColumn_ takes the sheet as an ARGUMENT, so mutatesStock() —
// which only recognises handles bound from getSheetByName — cannot see that it
// writes to the archive. It is a genuine blind spot in the detector, so this
// one is asserted by hand rather than left to the guard below.
check('renameCategoryColumn_ is only ever reached from inside withStockLock_ — the detector cannot see this one, so it is checked by name',
  lockedByCaller('renameCategoryColumn_'));

// Step 2 (v10.4) uses the same wrapper split, for the same reason: the auth
// check belongs outside the lock so an unauthorised caller is refused without
// queueing, and the sheet work belongs inside.
['manageMaterialLocked_', 'mergeConfigValuesLocked_', 'mergeLocationsLocked_', 'rewriteArchiveColumn_'].forEach(fn => {
  check(fn + ' is only ever reached from inside withStockLock_ — every call site, checked by matching parens',
    lockedByCaller(fn));
});

console.log('\nThe paths that change stock and do NOT hold it — the gap');
// Named individually rather than derived, so that fixing one, or adding a
// sixth, both force this list to be updated by hand instead of quietly
// passing.
const KNOWN_GAPS = {
  refreshDerivedSheets_: 'rewriting LIVE_STOCK / SITE_STOCK / WASTED_STOCK — but see below: every caller that matters now holds the lock while calling it, so a lock of its own would deadlock rather than help',
  menuNormalizeStatus: 'the one-off Status clean-up from the Sheet menu — owner-run and rare, but it does rewrite the archive'
};
Object.keys(KNOWN_GAPS).forEach(fn => {
  check('KNOWN GAP — ' + fn + ' still has no lock (' + KNOWN_GAPS[fn] + ')', !takesLock(fn));
});

// The guard that matters: if a NEW unlocked stock-writer appears, this fails.
{
  const unlocked = FUNCS.map(f => f.name)
    .filter(n => mutatesStock(n) && !takesLock(n))
    // ensure* helpers only create a sheet and its header row
    .filter(n => !/^ensure/.test(n))
    // this one writes into a BACKUP COPY, never the live file
    .filter(n => n !== 'writeConfigSnapshot_')
    // covered by a wrapper that takes the lock — verified, not assumed
    .filter(n => !lockedByCaller(n));
  const unexpected = unlocked.filter(n => !KNOWN_GAPS[n]);
  check('no NEW unlocked stock-writer has appeared since this list was written' +
        (unexpected.length ? ' — found: ' + unexpected.join(', ') : ''),
    unexpected.length === 0);
  const fixed = Object.keys(KNOWN_GAPS).filter(n => !unlocked.includes(n));
  check('the known-gap list has no stale entries' +
        (fixed.length ? ' — these now take the lock, remove them: ' + fixed.join(', ') : ''),
    fixed.length === 0);
}

// refreshDerivedSheets_ is called from INSIDE the paths that hold the lock.
// This was first read the wrong way round — as proof that any fix needed a
// re-entrant lock. It is the opposite: because the call is nested inside the
// caller, locking the caller already covers it, and giving refreshDerivedSheets_
// a plain waitLock of its own is what would deadlock. Step 3 of the fix is
// therefore mostly already done by steps 1 and 2, for free.
{
  const callers = ['addMovementsBatch_', 'modifyMovementLocked_'];
  callers.forEach(c => {
    check(c + ' calls refreshDerivedSheets_ from inside itself, so the lock it holds covers that rewrite too — no second lock, and no re-entrancy machinery',
      /refreshDerivedSheets_\(/.test(bodyOf(c) || ''));
  });
}

console.log('\n═══ PART 2 — a MODEL of what those gaps do ═══');
console.log('    (a simulation of read-modify-write, not the real functions)\n');

// Apps Script's semantics, modelled: one script lock per script; an execution
// that cannot get it waits, then gives up. Executions are separate — nothing
// is shared except the spreadsheet itself.
function makeWorld() {
  return { held: false, sheet: { GLASS: 100 }, log: [] };
}
function acquire(w) { if (w.held) return false; w.held = true; return true; }
function release(w) { w.held = false; }

// Two people take 10 out, at the same time. Correct answer: 80.
function unlockedRace(w) {
  const a = w.sheet.GLASS;          // A reads 100
  const b = w.sheet.GLASS;          // B reads 100 — before A has written
  w.sheet.GLASS = a - 10;           // A writes 90
  w.sheet.GLASS = b - 10;           // B writes 90, erasing A's
  return w.sheet.GLASS;
}
function lockedRace(w) {
  let result = null;
  if (acquire(w)) {                 // A gets the lock
    // B arrives here and is refused, so B never reads a stale number
    const bGot = acquire(w);
    w.log.push(bGot ? 'B got in while A held the lock' : 'B was refused while A held the lock');
    const a = w.sheet.GLASS;
    w.sheet.GLASS = a - 10;
    release(w);
    result = w.sheet.GLASS;
  }
  if (acquire(w)) {                 // B retries after A finished
    const b = w.sheet.GLASS;        // now reads 90, the truth
    w.sheet.GLASS = b - 10;
    release(w);
    result = w.sheet.GLASS;
  }
  return result;
}

console.log('Scenario: two people each take 10 from a stock of 100');
{
  const w1 = makeWorld();
  const bad = unlockedRace(w1);
  check('WITHOUT a lock the second write erases the first — stock says ' + bad + ' when 80 left the building. Nobody sees an error.',
    bad === 90);

  const w2 = makeWorld();
  const good = lockedRace(w2);
  check('WITH the lock the second read happens after the first write — stock says ' + good + ', which is right', good === 80);
  check('...because the second execution was refused while the first held it', /refused/.test(w2.log.join()));
}

console.log('\nScenario: what a refused execution should look like to the person');
{
  const b = bodyOf('addMovementsBatch_') || '';
  check('a save that cannot get the lock fails LOUDLY and tells the user to retry, rather than saving something wrong',
    /System busy/.test(b) && /throw new Error/.test(b));
  const arch = bodyOf('archiveOldMovements') || '';
  check('the archiving pass instead gives up quietly and runs later, which is right for a background job',
    /return \{ status: 'busy' \}/.test(arch));
}

console.log('\n' + '─'.repeat(72));
console.log('READ THIS BEFORE QUOTING THE RESULT');
console.log('Part 1 is fact about the source. Part 2 is a model of the mechanism.');
console.log('Neither proves a real installation is safe with four people working');
console.log('at once — that needs a live test on a deployed copy. See');
console.log('docs/CONCURRENCIA.md for what is actually at risk and what is not.');
console.log('─'.repeat(72));

console.log('\nconcurrency: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
