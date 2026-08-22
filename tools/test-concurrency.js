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
  return /waitLock\(|tryLock\(/.test(b);
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
  ['archiveOldMovements', 'moving old rows to ARCHIVE_HISTORY']
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

console.log('\nThe paths that change stock and do NOT hold it — the gap');
// Named individually rather than derived, so that fixing one, or adding a
// sixth, both force this list to be updated by hand instead of quietly
// passing.
const KNOWN_GAPS = {
  modifyMovement:      'editing a saved movement (qty/category/name all change stock)',
  manageMaterial:      'rename / merge / delete a material — rewrites many archive rows',
  mergeConfigValues:   'merging categories or projects — rewrites archive rows',
  mergeLocations:      'merging locations — rewrites archive rows',
  refreshDerivedSheets_: 'rewriting LIVE_STOCK / SITE_STOCK / WASTED_STOCK',
  menuNormalizeStatus: 'the one-off Status clean-up from the Sheet menu — owner-run and rare, but it does rewrite the archive',
  // Found by this test, not by reading the code: renaming a category walks the
  // whole archive rewriting the Category cell of every matching row. It reads
  // as a settings change, which is exactly why it was missed by eye.
  updateConfig:        'renaming a category — rewrites the Category cell on every archive row that used it'
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
    .filter(n => n !== 'writeConfigSnapshot_');
  const unexpected = unlocked.filter(n => !KNOWN_GAPS[n]);
  check('no NEW unlocked stock-writer has appeared since this list was written' +
        (unexpected.length ? ' — found: ' + unexpected.join(', ') : ''),
    unexpected.length === 0);
  const fixed = Object.keys(KNOWN_GAPS).filter(n => !unlocked.includes(n));
  check('the known-gap list has no stale entries' +
        (fixed.length ? ' — these now take the lock, remove them: ' + fixed.join(', ') : ''),
    fixed.length === 0);
}

// refreshDerivedSheets_ is called from INSIDE addMovementsBatch_, which already
// holds the lock. Any fix has to survive that or it deadlocks on itself.
{
  const b = bodyOf('addMovementsBatch_') || '';
  check('refreshDerivedSheets_ is called from inside the locked save — so any fix for it must be re-entrant, not a second plain waitLock',
    /refreshDerivedSheets_\(/.test(b));
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
