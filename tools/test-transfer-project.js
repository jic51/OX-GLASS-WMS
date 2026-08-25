// A TRANSFER must not invent a project.
//
// Jose found this in his own history, filtered to BS10:
//
//   ENTRY     2026-06-26  BS10  +12  C2A        project: PAT BS 10
//   ENTRY     2026-06-26  BS10  +15  B2A        project: PAT BS 10
//   TRANSFER  2026-07-14  BS10  +12  C2A → A5A  project: GENERIC
//   TRANSFER  2026-07-14  BS10  +15  B2A → A5A  project: GENERIC
//
// Same material, same job, and the history stopped reading as one story.
//
// The form never asked: the project field is HIDDEN for TRANSFER, so nobody
// typed GENERIC. `isGeneric: !proj` was true because the hidden box was empty,
// and the server turned that into the literal string. The app asserted
// something about work it had never been told, which is the one thing a
// movement log must not do.
//
// A transfer moves material between racks inside the same warehouse. Nothing
// about it changes which job the material belongs to.
//
// Usage:  node tools/test-transfer-project.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

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

// The real snapshot builder and its real helpers — the point of this file is
// whether the project actually survives the trip, and a hand-written stand-in
// would only prove I can write one.
const sandbox = {
  console, Math, Number, String, Object, Array, isFinite,
  normalizeString: s => String(s || '').trim().toUpperCase(),
  getMaterialId: (c, n) => String(c).trim().toUpperCase() + '|||' + String(n).trim().toUpperCase()
};
vm.createContext(sandbox);
vm.runInContext([
  extractVar('AC'),
  extractFn('applyMovementToSnapshot_'),
  extractFn('buildStockSnapshot_')
].join('\n'), sandbox);

// One archive, shaped like Jose's: two entries for a real job, into two racks.
const HEADER = new Array(22).fill('');
function row(mt, name, qty, src, dest, project) {
  const r = new Array(22).fill('');
  r[1] = 'WINDOW'; r[2] = name; r[5] = qty; r[8] = src;
  r[13] = project; r[17] = dest; r[18] = mt;
  return r;
}

console.log('\n═══ the snapshot has to REMEMBER the project for anything to carry ═══\n');

{
  const snap = sandbox.buildStockSnapshot_([
    HEADER,
    row('ENTRY', 'BS10', 12, '', 'C2A', 'PAT BS 10'),
    row('ENTRY', 'BS10', 15, '', 'B2A', 'PAT BS 10')
  ]);
  const s = snap['WINDOW|||BS10'];
  console.log('  snapshot for BS10: ' + JSON.stringify({ wh: s.wh, project: s.project }));
  check('the material\'s project is on the snapshot at all — it tracked only quantities and racks before',
    s.project === 'PAT BS 10');
  check('...alongside the quantities it always tracked', s.wh === 27);
}

{
  // GENERIC is "in stock, unassigned". It must never overwrite a real job.
  const snap = sandbox.buildStockSnapshot_([
    HEADER,
    row('ENTRY', 'BS10', 10, '', 'A1A', 'PAT BS 10'),
    row('ENTRY', 'BS10', 5,  '', 'A1B', 'GENERIC')
  ]);
  check('a later GENERIC does not erase the job a material is already on',
    snap['WINDOW|||BS10'].project === 'PAT BS 10');
}

{
  const snap = sandbox.buildStockSnapshot_([
    HEADER,
    row('ENTRY', 'BS10', 10, '', 'A1A', 'OLD JOB'),
    row('ENTRY', 'BS10', 5,  '', 'A1B', 'NEW JOB')
  ]);
  check('a later REAL project does win — last one is the current one',
    snap['WINDOW|||BS10'].project === 'NEW JOB');
}

{
  const snap = sandbox.buildStockSnapshot_([HEADER, row('ENTRY', 'NOJOB', 3, '', 'A1A', 'GENERIC')]);
  check('a material only ever received as GENERIC has no project, not the word GENERIC',
    snap['WINDOW|||NOJOB'].project === '');
}

console.log('\n═══ what the batch writer does with it ═══\n');

// Read as source, because addMovementsBatch_ is 300 lines of sheet I/O and
// what matters here is the RULE, stated in one place.
{
  const body = GS.slice(GS.indexOf('function addMovementsBatch_'),
                        GS.indexOf('function buildStockSnapshot_'));
  // From where the project is decided to where the row starts being built —
  // bounded by a landmark rather than a character count, which is what made
  // the first version of this miss the very line it was checking for.
  const rule = body.slice(body.indexOf('var proj ='), body.indexOf('// Locations:'));

  check('TRANSFER inherits from the snapshot instead of asserting GENERIC',
    /mt === 'TRANSFER'/.test(rule) && /carried\.project/.test(rule));
  check('...and falls back to BLANK, never to GENERIC, when the material has no job',
    /:\s*''/.test(rule));
  check('ENTRY still means GENERIC when no project is given — that is a real state',
    /if \(!proj && mt === 'ENTRY'\) proj = 'GENERIC';/.test(rule));
  check('EXIT, RETURN and WASTE are untouched — no branch names them',
    !/mt === 'EXIT'/.test(rule) && !/mt === 'WASTE'/.test(rule) && !/mt === 'RETURN'/.test(rule));
  // Both offsets measured in the SAME string. The first version compared an
  // index into `rule` with an index into `body` and was meaningless.
  check('the snapshot is consulted AFTER matId exists, or the lookup is on undefined',
    body.indexOf('carried = snapshot[matId]') > body.indexOf('var matId = getMaterialId'));
}

console.log('\n═══ editing: GENERIC is not a project name ═══\n');

{
  const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');
  const fill = HTML.slice(HTML.indexOf('em_project:'), HTML.indexOf('em_project:') + 200);
  check('the edit form shows GENERIC as an EMPTY project box, not as a customer called GENERIC',
    /!== 'GENERIC'/.test(fill));

  // ...which creates a trap the server has to close: saving any unrelated
  // change would otherwise blank the project and log an edit nobody made.
  const upd = GS.slice(GS.indexOf('var NORMALIZE_ON_WRITE'), GS.indexOf('if (!changes.length)'));
  check('saving an ENTRY with the box left blank re-derives GENERIC rather than erasing it',
    /key === 'project' && !newStr/.test(upd) && /'GENERIC'/.test(upd) && /AC\.MOVETYPE/.test(upd));
  check('...and only for ENTRY, since that is the only type GENERIC means anything for',
    /=== 'ENTRY'/.test(upd));
}

console.log('\ntransfer project: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
