// The data-quality sweep — the app finally looking at what is already saved.
//
// Jose asked why the app had stopped finding things to correct. It never
// started: the only checker that existed ran WHILE SOMEBODY TYPED a name, and
// nothing had ever read the rows already in the archive.
//
// What he asked for: "revisar todos los nombres parecidos, los nombres de
// proyectos parecidos, las destinations y sugerir que se las corrija… y
// arreglar movimientos según el id, porque si tienen el mismo id es porque son
// el mismo material."
//
// The thing that makes this feature dangerous rather than merely useful is
// that its output invites a destructive action: merging two materials moves
// stock. So the tests here are mostly about what it REFUSES to say.
//
// The one case that decides whether the whole thing is trustworthy:
//
//     BS10  vs  BS 10    → the same window. Must be found.
//     JJF 109 vs JJF 110 → two products. Must NEVER be offered as a merge.
//
// A tool that gets the second one wrong once is a tool nobody presses again.
//
// Usage:  node tools/test-data-quality.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const GS   = fs.readFileSync(path.join(ROOT, 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(ROOT, 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label); }
}
function codeOnly(src) {
  return src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
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
function extractVar(name) {
  // Whitespace-tolerant: these two constants are column-aligned in the source
  // ("var DQ_SIMILAR_CAP  = 300"), and a single-space match missed them.
  const m = new RegExp('var\\s+' + name + '\\s*=\\s*').exec(GS);
  const a = m ? m.index : -1;
  if (a === -1) throw new Error('var not found: ' + name);
  const eol = GS.indexOf('\n', a);
  const line = GS.slice(a, eol);
  if (line.indexOf('{') === -1 && line.indexOf('[') === -1) return line;
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

// ── The scan, running for real over a fake archive ───────────────────────────
// The whole function, not a re-implementation of its rules: a hand-written
// copy of the matcher would only prove that I can write one that agrees with
// itself.
const AUDIT = [];
const sandbox = {
  console, Math, Number, String, Object, Array, isFinite, JSON,
  normalizeString: s => String(s || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/[,.'`]/g, ''),
  getMaterialId: (c, n) => String(c).trim().toUpperCase() + '|||' + String(n).trim().toUpperCase(),
  requireAuth_: () => ({ email: 'jose@example.com', role: 'ADMIN' }),
  auditLog_: (ss, a, who, d) => AUDIT.push({ action: a, detail: d }),
  SHEETS: { ARCHIVE: 'A', ARCHIVE_HISTORY: 'H' },
  AC_WIDTH: 22,
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => null }) }
};
vm.createContext(sandbox);
vm.runInContext([
  extractVar('AC'),
  extractVar('DQ_MAX_FINDINGS'),
  extractVar('DQ_SIMILAR_CAP'),
  extractFn('squashKey_'),
  extractFn('dqId_'),
  extractFn('dqDigitsOf_'),
  extractFn('dqEditDistance_'),
  extractFn('runDataQualityScan')
].join('\n'), sandbox);

// Rows in the archive's real shape. Only the columns the sweep reads matter.
const AC = sandbox.AC;
function row(o) {
  const r = new Array(22).fill('');
  r[AC.CATEGORY] = o.cat || 'WINDOW';
  r[AC.NAME]     = o.name || '';
  r[AC.SUPPLIER] = o.supplier || '';
  r[AC.PROJECT]  = o.project || '';
  r[AC.SRC_LOC]  = o.src || '';
  r[AC.DEST_LOC] = o.dest || '';
  r[AC.MOVETYPE] = o.mt || 'ENTRY';
  r[AC.GC]       = o.gc || '';
  r[AC.PO]       = o.po || '';
  r[AC.PM]       = o.pm || '';
  return r;
}
// Feeds the rows in without a spreadsheet: dqReadRows_ is the only thing that
// touches Sheets, so replacing it is the whole harness.
function scan(rows) {
  sandbox.dqReadRows_ = () => rows;
  return sandbox.runDataQualityScan({});
}
const of = (res, kind, field) =>
  res.findings.filter(f => f.kind === kind && (!field || f.field === field));

console.log('\n═══ the key that decides what counts as the same thing ═══\n');

{
  const sq = sandbox.squashKey_;
  // The exact pair from Jose's own history.
  check('BS10 and BS 10 collapse to one key — the case that started this',
    sq('BS10') === sq('BS 10'));
  check('...and so do casing and stray punctuation', sq(' amsco.') === sq('AMSCO'));
  // And the pair that must NOT.
  check('JJF 109 and JJF 110 do NOT — their digits differ',
    sq('JJF 109') !== sq('JJF 110'));
  check('a key survives being all digits', sq('10') === '10');
}

console.log('\n═══ the same thing, written two ways ═══\n');

{
  const res = scan([
    row({ name: 'BS10',  qty: 12, project: 'PAT BS 10' }),
    row({ name: 'BS10',  qty: 15, project: 'PAT BS 10' }),
    row({ name: 'BS 10', mt: 'TRANSFER', src: 'C2A', dest: 'A5A' })
  ]);
  const f = of(res, 'spelling', 'material');
  check('the two spellings are found as ONE finding, not two', f.length === 1);
  check('...naming both spellings with how many rows use each',
    f[0].spellings.length === 2 &&
    f[0].spellings.some(s => s.text === 'BS10' && s.rows === 2) &&
    f[0].spellings.some(s => s.text === 'BS 10' && s.rows === 1));
  check('...and proposing the commonest one as the survivor', f[0].keep === 'BS10');
  check('...inside its own category, since two categories can reuse a name',
    f[0].category === 'WINDOW');
}

{
  // Same name, different categories. Not the same material, and merging them
  // would move stock between two things that were never related.
  const res = scan([
    row({ cat: 'WINDOW', name: 'BS10' }),
    row({ cat: 'SCREEN', name: 'BS 10' })
  ]);
  check('a name repeated across two CATEGORIES is not a spelling mistake',
    of(res, 'spelling', 'material').length === 0);
}

{
  const res = scan([
    row({ name: 'A', project: 'CLIFTON BUILDING' }),
    row({ name: 'A', project: 'CLIFTONBUILDING' }),
    row({ name: 'B', supplier: 'AMSCO' }),
    row({ name: 'B', supplier: 'Amsco.' }),
    row({ name: 'C', src: 'A1A' }),
    row({ name: 'C', dest: 'A 1 A' })
  ]);
  check('projects are checked too', of(res, 'spelling', 'project').length === 1);
  check('suppliers are checked too',  of(res, 'spelling', 'supplier').length === 1);
  // Jose asked for "las destinations" by name.
  check('racks are checked across BOTH the source and destination columns',
    of(res, 'spelling', 'rack').length === 1);
}

{
  // GENERIC is the app's own word for "in stock, unassigned". Offering to
  // merge a real job into it would be the GENERIC bug again, in bulk.
  const res = scan([
    row({ name: 'A', project: 'GENERIC' }),
    row({ name: 'A', project: 'Generic' }),
    row({ name: 'A', project: 'GENERIC ' })
  ]);
  check('GENERIC is never offered as a project to merge — it is not a job',
    of(res, 'spelling', 'project').length === 0);
}

{
  // The exact pair from Jose's screenshot. Same letters, different case — and
  // the sweep must both FIND it and be able to apply it. It found it and then
  // refused its own finding, which is the worst of both.
  const res = scan([
    row({ name: 'A', src: 'SWEETWATER - SPRING CANYON 2' }),
    row({ name: 'A', src: 'Sweetwater - SPRING CANYON 2' })
  ]);
  const f = of(res, 'spelling', 'rack');
  check('two spellings that differ only in CASE are found as one finding', f.length === 1);
  check('...with both of them named, so the survivor is a real choice',
    f.length === 1 && f[0].spellings.length === 2);
}

console.log('\n═══ a movement missing what its siblings have ═══\n');

{
  const res = scan([
    row({ name: 'BS10', supplier: 'AMSCO' }),
    row({ name: 'BS10', supplier: 'AMSCO' }),
    row({ name: 'BS10', mt: 'TRANSFER', src: 'C2A', dest: 'A5A' })   // no supplier
  ]);
  const g = of(res, 'gap', 'supplier');
  check('a blank supplier is found when the material only ever had one', g.length === 1);
  check('...naming the value and how many rows would be filled',
    g[0].value === 'AMSCO' && g[0].rows === 1);
}

{
  // Two suppliers on record. The app does not know which one the blank row
  // belongs to, and picking the commonest would be a guess wearing the
  // clothes of a fact.
  const res = scan([
    row({ name: 'BS10', supplier: 'AMSCO' }),
    row({ name: 'BS10', supplier: 'AMSCO' }),
    row({ name: 'BS10', supplier: 'MILGARD' }),
    row({ name: 'BS10', mt: 'TRANSFER' })
  ]);
  check('a material with TWO suppliers on record produces no proposal at all',
    of(res, 'gap', 'supplier').length === 0);
}

{
  // The BS10 case exactly: entries carry the job, the transfers were stamped
  // GENERIC by the bug fixed in v11.16. This is the sweep going back for the
  // rows written before that fix.
  const res = scan([
    row({ name: 'BS10', project: 'PAT BS 10' }),
    row({ name: 'BS10', project: 'PAT BS 10' }),
    row({ name: 'BS10', mt: 'TRANSFER', project: 'GENERIC', src: 'C2A', dest: 'A5A' }),
    row({ name: 'BS10', mt: 'TRANSFER', project: '',        src: 'B2A', dest: 'A5A' })
  ]);
  const g = of(res, 'gap', 'project');
  check('old transfers stamped GENERIC are found', g.length === 1);
  check('...counting the blank ones as well as the GENERIC ones', g[0].rows === 2);
  check('...and proposing the job the entries actually carry', g[0].value === 'PAT BS 10');
}

{
  // An EXIT with no project is a job nobody recorded. No amount of history
  // recovers which one it was, and filling it would invent a customer.
  const res = scan([
    row({ name: 'BS10', project: 'PAT BS 10' }),
    row({ name: 'BS10', mt: 'EXIT', project: '', src: 'A1A' })
  ]);
  check('an EXIT with no job is left alone — that is not a gap, it is unknown',
    of(res, 'gap', 'project').length === 0);
}

{
  // GC, PO and PM have exactly the same shape of gap and are deliberately not
  // offered: a purchase order belongs to one delivery, and a contractor and a
  // project manager belong to a JOB. Filling them in bulk would have the app
  // assert something nobody told it.
  const res = scan([
    row({ name: 'BS10', gc: 'DAL', po: '06-2345', pm: 'KIM' }),
    row({ name: 'BS10', gc: 'DAL', po: '06-2345', pm: 'KIM' }),
    row({ name: 'BS10', mt: 'TRANSFER' })
  ]);
  check('GC, PO and PM gaps are NOT proposed in bulk — they belong to a job, not a material',
    of(res, 'gap').every(f => f.field === 'supplier' || f.field === 'project'));
}

console.log('\n═══ the guess, and the trap inside it ═══\n');

{
  // THE test. Two real products, one character apart.
  const res = scan([
    row({ name: 'JJF 109' }),
    row({ name: 'JJF 110' })
  ]);
  check('JJF 109 and JJF 110 are never offered as a merge',
    of(res, 'spelling').length === 0);
  check('...and are not even raised as "have a look" — different digits, different part',
    of(res, 'similar').length === 0);
}

{
  // An actual typo — two characters transposed in a job name.
  const res = scan([
    row({ name: 'A', project: 'CLIFTON BUILDING' }),
    row({ name: 'A', project: 'CLIFTON BULIDING' })
  ]);
  const s = of(res, 'similar');
  check('a transposed pair of letters IS raised for a human to look at', s.length === 1);
  check('...as a suggestion with no value to apply, so no button can be built for it',
    s.length === 1 && s[0].value === undefined && s[0].keep === undefined);
}

{
  // Sharing words is what a product family does. Flagging every one of them is
  // how this list becomes something people scroll past.
  const res = scan([
    row({ name: 'GE SILPRUF SEALANT' }),
    row({ name: 'GE SILPRUF SEALER' })
  ]);
  check('two names that merely share their words are NOT raised — that is a product family',
    of(res, 'similar').length === 0);
}

{
  // Rack codes are legitimately one character apart, all day long.
  const res = scan([
    row({ name: 'A', src: 'A1A' }),
    row({ name: 'A', src: 'A1B' })
  ]);
  check('racks are never guessed about — A1A and A1B are two shelves',
    of(res, 'similar').length === 0);
}

{
  const d = sandbox.dqEditDistance_;
  check('the distance is exact when it is under the limit', d('CLIFTONBUILDING', 'CLIFTONBULIDING', 2) === 2);
  check('...and bails out rather than finishing a comparison it has already lost',
    d('AAAAAAAAAA', 'ZZZZZZZZZZ', 2) > 2);
  check('...and a length gap alone is enough to stop it', d('AB', 'ABCDEFGH', 2) > 2);
}

console.log('\n═══ what the whole thing promises ═══\n');

{
  const res = scan([
    row({ name: 'BS10', supplier: 'AMSCO' }),
    row({ name: 'BS 10' })
  ]);
  check('every finding carries an id, so one can be sent back to be applied',
    res.findings.every(f => f.id && f.id.length));
  check('ids are unique inside one scan',
    new Set(res.findings.map(f => f.id)).size === res.findings.length);
  check('the scan reports how many rows it read', res.scannedRows === 2);
  check('...and the scan is written to the audit log, like every other admin action',
    AUDIT.some(a => a.action === 'DATA_SCAN'));
}

{
  // Biggest first. An admin with ten minutes should be spending them at the
  // top of the list.
  const rows = [];
  for (let i = 0; i < 8; i++) rows.push(row({ name: 'BIG' }));
  rows.push(row({ name: 'BIG ' + '' }));   // same squash key, 1 row
  rows.push(row({ name: 'SMALL' }));
  rows.push(row({ name: 'SMALL', cat: 'WINDOW' }));
  const res = scan([
    row({ name: 'AAA' }), row({ name: 'AAA' }), row({ name: 'AAA' }), row({ name: 'A AA' }),
    row({ name: 'BBB' }), row({ name: 'B BB' })
  ]);
  const sp = of(res, 'spelling', 'material');
  check('findings come back biggest first', sp.length === 2 && sp[0].rows >= sp[1].rows);
}

{
  const clean = scan([
    row({ name: 'BS10', supplier: 'AMSCO', project: 'PAT BS 10' }),
    row({ name: 'BS10', supplier: 'AMSCO', project: 'PAT BS 10' })
  ]);
  check('a tidy archive produces NOTHING — a checker that always finds something is noise',
    clean.findings.length === 0 && clean.total === 0);
}

console.log('\n═══ applying, and what it refuses ═══\n');

{
  const apply = codeOnly(extractFn('applyDataQualityFixLocked_'));
  // Every merge goes through the function the Settings screens already call:
  // already locked, already rewriting BOTH archives, already refreshing the
  // derived sheets. A second path would mean two ways to merge a material and
  // the rarer one would be the broken one.
  check('material spellings go through the existing material merge',
    /manageMaterialLocked_\(\{ op: 'merge'/.test(apply));
  check('project and supplier spellings go through the existing config merge',
    /mergeConfigValuesLocked_/.test(apply));
  check('rack spellings go through the existing location merge',
    /mergeLocationsLocked_/.test(apply));
  check('a "have a look" finding cannot be applied at all',
    /not something the app can apply/.test(extractFn('applyDataQualityFixLocked_')));

  // Jose pressed "Merge them" on
  //   SWEETWATER - SPRING CANYON 2  ·  Sweetwater - SPRING CANYON 2
  // and got "Nothing to merge — that is already the only spelling", from a
  // sweep that had just found the two itself.
  //
  // The filter that drops the survivor from the merge list was uppercasing
  // both sides, copied from the Settings merge where you genuinely cannot
  // merge a value into itself. Here it deleted the commonest finding there is:
  // same letters, different case. A difference of case is a real difference in
  // what is stored.
  check('two spellings that differ ONLY in case can still be merged',
    /return v && v !== keep;/.test(apply) && !/v\.toUpperCase\(\) !== keep\.toUpperCase\(\)/.test(apply));
  check('...while a byte-for-byte repeat of the survivor is still dropped',
    /v !== keep/.test(apply));

  // Same merge, in the locations path: the survivor's own row is removed with
  // the others (its uppercase is in `wanted`) and re-added — and re-adding it
  // as a bare RACK would move a location out of the group it was filed under.
  const locs = codeOnly(extractFn('mergeLocationsLocked_'));
  check('a case-only location merge keeps the survivor in its own group',
    /intoType/.test(locs) && /types\.push\(intoType \|\| 'RACK'\)/.test(locs));
  check('the whole apply is inside the stock lock',
    /withStockLock_/.test(codeOnly(extractFn('applyDataQualityFix'))));
  check('...and is ADMIN only', /requireAuth_\('ADMIN'\)/.test(extractFn('applyDataQualityFix')));
  check('the scan is ADMIN only too', /requireAuth_\('ADMIN'\)/.test(extractFn('runDataQualityScan')));

  const gap = codeOnly(extractFn('dqFillGapLocked_'));
  // The narrowness IS the safety.
  check('filling a gap never overwrites a cell that already has something in it',
    /if \(cur\) \{?\s*\n?\s*return null;/.test(gap) || /} else if \(cur\) \{/.test(gap));
  check('...only touches the one material named', /wantCat|wantName/.test(gap));
  check('...and only TRANSFER rows when it is the project being filled',
    /onlyTransfers/.test(gap) && /'TRANSFER'/.test(gap));
  // A panel left open while somebody else edits must not write yesterday's
  // answer into today's rows.
  check('it re-derives the value from the archive instead of trusting the panel',
    /distinct\.length !== 1 \|\| distinct\[0\] !== value/.test(gap));
  check('...and says the data changed rather than writing something nobody proposed',
    /The data changed since this was found/.test(extractFn('dqFillGapLocked_')));
  check('a fix is written to the audit log', /DATA_FIX/.test(gap));
  check('...and the derived stock sheets are rebuilt after it', /refreshDerivedSheets_/.test(gap));
}

{
  const scanSrc = codeOnly(extractFn('runDataQualityScan'));
  check('the scan writes nothing — it is a read', !/setValue|rewriteArchiveColumn_|appendRow/.test(scanSrc));
  const read = codeOnly(extractFn('dqReadRows_'));
  check('...and does not even create the history sheet as a side effect',
    !/ensureArchiveHistorySheet_/.test(read));
}

console.log('\n═══ the screen ═══\n');

{
  check('it is reachable from Settings → System', /id="btnDataCheck"/.test(HTML));
  check('the panel says out loud that it only runs when pressed',
    /Runs only when you press it/.test(HTML));
  check('the survivor of a merge is a CHOICE, not a verdict the app hands down',
    /dq-keep-/.test(HTML) && /Keep this spelling/.test(HTML));
  check('a "have a look" card gets no Apply button',
    /The app cannot tell/.test(HTML));
  check('the cap is disclosed rather than silently truncating',
    /biggest of/.test(HTML));
  check('a clean archive is reported as clean', /Nothing to correct across/.test(HTML));
  check('applying reloads the data, because a merge moves stock',
    /loadDataFromGoogle\(true\);\s*\n\s*\}\)\s*\n\s*\.withFailureHandler/.test(HTML) ||
    /Stock can move: merging two materials/.test(HTML));
  check('both endpoints are dispatched',
    /action === 'runDataQualityScan'/.test(GS) && /action === 'applyDataQualityFix'/.test(GS));
}

console.log('\ndata quality: ' + (fail === 0 ? 'ok (' + ok + ' checks)' : fail + ' FAILED'));
process.exit(fail === 0 ? 0 : 1);
