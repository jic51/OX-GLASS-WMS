// ENDPOINT AUTH — how many doors does this app have, and is every one locked?
//
// This is Priority 1 of the v11.26 audit, and it goes before the bug fixes on
// purpose. It is not itself a bug. It is the reason a bug could sit in the
// shipping code for months without anyone noticing.
//
// THE SHAPE OF THE PROBLEM
//
// appsscript.json deploys this app as:
//
//     "executeAs": "USER_DEPLOYING"     — it runs with the OWNER's permissions
//     "access":    "ANYONE"             — any signed-in Google account may call
//
// Those two together are not a mistake; the hybrid login needs them, and the
// reasoning is written out at the top of Code_v3_fixed.gs. But they have a
// consequence that is easy to state and easy to forget: Apps Script exposes
// EVERY top-level function whose name does not end in `_` to google.script.run.
// Not the ones the frontend happens to call — all of them. Anyone with the
// app's URL can open a browser console and invoke any of them by name, and the
// call runs as the owner, with the owner's access to the spreadsheet.
//
// The defence is per-function: each public entry point authenticates for
// itself. That defence is well built and, function by function, correct.
//
// What did not exist until this file is anything that checks the defence is
// COMPLETE. Nothing counted the doors. Nothing failed when a new one was cut.
// That is how `getSystemActivity` shipped: a plain public function that read
// the audit sheet — who saved what, when — with no token and no role check.
// It was not a lapse in care about that function. It was the absence of the
// count, and every future function is exposed to the same absence.
//
// WHAT THIS FILE DOES
//
// It enumerates every public global in Code_v3_fixed.gs and requires each one
// to be EITHER guarded by one of the recognised auth primitives OR named in
// the allow-list below with a written reason. There is no third state. A new
// function that is neither fails this test, and the failure names it.
//
// The allow-list is the honest part. Some public globals genuinely need no
// guard, and pretending otherwise would push people to bolt a meaningless
// check onto a pure string helper. But every entry has to be argued in
// writing, and an entry that stops being reachable has to be deleted — the
// test checks for stale entries too, so the list cannot rot into a place
// where things are quietly parked.
//
// WHAT THIS FILE CANNOT DO
//
// It reads source. It does not call the deployed app. It cannot prove a guard
// works at runtime, only that one is present and of a recognised kind. A guard
// that is present but wrong still passes here. Reviewing the guards themselves
// is a separate job, done by hand — this file's job is that none is MISSING.
//
// Usage:  node tools/test-endpoint-auth.js

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
// Comments are where this codebase explains itself, at length — and several of
// those explanations quote the very function names and guard names being
// searched for. Matching them would report a door as locked because the
// paragraph above it discusses locking. So the detector reads code only.
function codeOnly(src) {
  return String(src || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
}

// A public global, in Apps Script's sense: a top-level function whose name does
// not end in `_`. The trailing underscore is not a convention here — it is the
// one thing Google's runtime actually enforces, which is why the header comment
// in Code_v3_fixed.gs makes it the rule for every new helper.
const PUBLIC = FUNCS.filter(f => !/_$/.test(f.name)).map(f => f.name);

// ── The recognised guards ───────────────────────────────────────────────────
// Five kinds, and the list is deliberately closed. A sixth way of proving who
// is calling is not forbidden — but it has to be added HERE, in the open,
// rather than invented inside one function where no one will find it again.
function guardOf(name) {
  const b = codeOnly(bodyOf(name));

  // 1. The verified-identity gate. _verifiedAuth is set only by the two entry
  //    points that actually check an HMAC-signed token, so a direct call
  //    starts with null and is refused before reading or writing anything.
  if (/\brequireAuth_\s*\(/.test(b))         return 'requireAuth_';

  // 2. The entry points that DO the verifying — processMovement and
  //    getInitialData. They are the front door; they are supposed to be open,
  //    and what they do first is establish who knocked.
  if (/\bsetVerifiedAuth_\s*\(/.test(b))     return 'setVerifiedAuth_';

  // 3. File access: auth + per-user quota + a check that the file is one of
  //    this app's own, so a token cannot be used to read the owner's Drive.
  if (/\bresolveOwnFile_\s*\(/.test(b))      return 'resolveOwnFile_';

  // 4. Owner-only: effective user must equal active user. True for the daily
  //    trigger and the Apps Script editor, false for every google.script.run
  //    call from anyone else under "Execute as: Me".
  if (/\brequireOwnerContext_\s*\(/.test(b)) return 'requireOwnerContext_';

  // 5. Spreadsheet menu entry points. getUi() throws outside the container, so
  //    a call over google.script.run dies before reaching any sheet work. Not
  //    an auth check by intent, but it is a real one by effect.
  if (/\bgetUi\s*\(\s*\)/.test(b))           return 'getUi() — container-only';

  // 6. getUserRole(token) followed by a refusal. Older than requireAuth_ and
  //    still in use where the function wants to refuse in its own words —
  //    Incoming's four, and heartbeat, which returns empty rather than
  //    throwing because a thrown error there would pop a failure toast in a
  //    perfectly healthy session. Both shapes count; what does NOT count is
  //    calling getUserRole and then ignoring the answer.
  const call = /\bgetUserRole\s*\(/.exec(b);
  if (call) {
    const after = b.slice(call.index, call.index + 600);
    const refuses = /\.role\s*(?:===|!==|==|!=)/.test(after) &&
                    /(throw\s+new\s+Error|return\s)/.test(after);
    if (refuses) return 'getUserRole + refusal';
  }
  return null;
}

// ── The allow-list ──────────────────────────────────────────────────────────
// Public, unguarded, and argued. Read the reason before adding to this.
const ALLOWED = {
  doGet:
    'The web app entry point itself. It has to be reachable — that is what a ' +
    'web app is. It serves HTML and hands the OAuth callback off; every piece ' +
    'of data on the page arrives later, through getInitialData, which does check.',

  getSetupState:
    'Deliberate, and it stays deliberate. On an install that has not finished ' +
    'setup there is no user list yet, so there is nothing to authenticate ' +
    'against — and the screen it feeds exists to tell a co-worker who lands on ' +
    'the URL which address can finish the job ("Ask jose@… to open this page"). ' +
    'Hiding the owner address would break that message for exactly the people ' +
    'it is for, to conceal an address the owner disclosed by sharing the link. ' +
    'It returns nothing else, and it returns nothing at all once setup is done.',

  isGmailScanEnabled:
    'Returns one boolean script property and touches no sheet. Knowing whether ' +
    'the Gmail scan is switched on reveals nothing about the inventory.',

  pollLogin:
    'Runs BEFORE any identity exists — it is how a non-org user picks up their ' +
    'session token after signing in with Google. There is nothing to check ' +
    'against yet, which is why it is rate-limited instead: requireQuota_ caps ' +
    'it at 120 per 5 minutes per state value, which also blunts guessing at ' +
    'other people\'s login states.',

  getUserRole:
    'The identity function. It answers "who am I and what may I do", derived ' +
    'from the session token the caller presented. A caller learns their own ' +
    'role, which they are about to be told by the app anyway.',

  normalizeString:      'Pure string helper. Uppercases and trims. No sheet, no properties, no I/O.',
  getMaterialId:        'Pure. Joins a category and a name into a key. No I/O.',
  getLegacyMaterialId:  'Pure. The pre-v3 form of the same key, kept for matching old rows. No I/O.',
  findFirstWarehouseLoc:'Pure. Picks a rack out of an object the caller passed in. No I/O.',
  parseArchiveRow:      'Pure. Parses an array the CALLER supplied into a movement object — it ' +
                        'reads no sheet, so a stranger calling it learns only what they sent in.',

  calculateStock:
    'Takes the movements array as its first argument. It reads no sheet: the ' +
    'rows have to be handed to it, and the only way to get the real ones is ' +
    'getInitialData, which authenticates. Called with junk it computes stock ' +
    'for the junk.',

  getCurrentStockForItem:
    'First argument is a live Spreadsheet object. google.script.run can only ' +
    'send primitives, arrays and plain objects, so a remote caller cannot ' +
    'supply one — the call dies on ss.getSheetByName before touching data.',

  archiveOldMovements:
    'Same shape: first argument is a live Spreadsheet object, which cannot ' +
    'cross the google.script.run boundary. It also takes the script lock and ' +
    'gives up quietly if it cannot get it.',

  onSelectionChange:
    'Simple trigger. Google calls it with a real event object; it returns ' +
    'immediately on `!e || !e.range`, and everything after that is wrapped in ' +
    'its own try/catch. A remote caller sends no event and it does nothing.',

  onEdit:
    'Simple trigger, same shape as onSelectionChange — returns on a missing ' +
    'e.range, and only acts on one checkbox cell in one sheet.'
};

// ── The count ───────────────────────────────────────────────────────────────
console.log('\n═══ every public global in Code_v3_fixed.gs ═══\n');

const guarded = [], allowed = [], naked = [];
PUBLIC.forEach(n => {
  const g = guardOf(n);
  if (g) guarded.push([n, g]);
  else if (ALLOWED[n]) allowed.push(n);
  else naked.push(n);
});

console.log('  ' + FUNCS.length + ' functions in the file');
console.log('  ' + PUBLIC.length + ' of them are PUBLIC — reachable over google.script.run,');
console.log('     running as the owner, from any signed-in Google account with the URL');
console.log('  ' + guarded.length + ' carry a recognised guard');
console.log('  ' + allowed.length + ' are allow-listed with a written reason');
console.log('  ' + naked.length + ' are neither\n');

// THE GUARD. Everything above is arithmetic; this is the assertion.
check('every public global is either guarded or argued for in writing' +
      (naked.length ? ' — UNGUARDED AND UNLISTED: ' + naked.join(', ') : ''),
  naked.length === 0);

// A list that cannot rot. An allow-list entry for a function that no longer
// exists, or that has since grown a real guard, is not harmless — it is a
// paragraph of reasoning about code that is gone, and the next person reads it
// as if it still described something.
{
  const gone = Object.keys(ALLOWED).filter(n => PUBLIC.indexOf(n) === -1);
  check('no allow-list entry names a function that no longer exists' +
        (gone.length ? ' — remove: ' + gone.join(', ') : ''), gone.length === 0);

  const nowGuarded = Object.keys(ALLOWED).filter(n => PUBLIC.indexOf(n) !== -1 && guardOf(n));
  check('no allow-list entry names a function that now has a real guard' +
        (nowGuarded.length ? ' — remove: ' + nowGuarded.join(', ') : ''), nowGuarded.length === 0);

  const thin = Object.keys(ALLOWED).filter(n => String(ALLOWED[n]).trim().length < 40);
  check('every allow-list entry gives an actual reason, not a word' +
        (thin.length ? ' — too thin: ' + thin.join(', ') : ''), thin.length === 0);
}

// ── The specific holes the audit found ──────────────────────────────────────
console.log('\n═══ the two the audit named ═══\n');

check('getSystemActivity is no longer a public global — it reads the audit ' +
      'sheet (who did what, when) and had no check of any kind',
  PUBLIC.indexOf('getSystemActivity') === -1);
check('...it survives as getSystemActivity_, so the feature is intact',
  FUNCS.some(f => f.name === 'getSystemActivity_'));
check('...and its one caller was updated with it',
  /getSystemActivity_\(\s*30\s*,\s*_auth\.email\s*\)/.test(GS));
check('...with no call to the old name left anywhere',
  !/[^_]\bgetSystemActivity\s*\(/.test(codeOnly(GS)));

check('dailyCheckinTrigger now proves it is the owner calling — the time-based ' +
      'trigger passes, a google.script.run call from anyone else does not',
  /\brequireOwnerContext_\s*\(/.test(codeOnly(bodyOf('dailyCheckinTrigger'))));
check('...and it still swallows the refusal, so a blocked call cannot turn ' +
      'into a failure email every morning',
  /catch\s*\(\s*e\s*\)\s*\{\s*Logger\.log/.test(bodyOf('dailyCheckinTrigger') || ''));

// ── The header comment has to stay true ─────────────────────────────────────
// Code_v3_fixed.gs opens with a list of the functions "meant to be reachable
// from the browser". That list is how a person reading the file learns the
// rule. If a name in it has been renamed away, the paragraph is now lying to
// the reader, and the reader has no way to tell.
console.log('\n═══ the file\'s own header list ═══\n');
{
  const hdr = GS.slice(0, GS.indexOf('var APP_VERSION'));
  const m = /Only these are meant to be reachable[\s\S]{0,900}?saveWebAppUrl/.exec(hdr);
  check('the header comment still carries its list of intended entry points', !!m);
  if (m) {
    const named = (m[0].match(/\b[a-z][A-Za-z0-9]+\b/g) || [])
      .filter(w => PUBLIC.indexOf(w) !== -1 || FUNCS.some(f => f.name === w));
    const missing = ['doGet', 'getInitialData', 'processMovement', 'heartbeat',
                     'pollLogin', 'getSetupState', 'saveWebAppUrl']
      .filter(n => named.indexOf(n) === -1);
    check('...and every name in it still exists' +
          (missing.length ? ' — stale: ' + missing.join(', ') : ''), missing.length === 0);
  }
}

console.log('\n' + '─'.repeat(72));
console.log('This reads source. It proves no guard is MISSING — not that any');
console.log('guard is CORRECT. A present-but-wrong check still passes here.');
console.log('─'.repeat(72));

console.log('\nendpoint-auth: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
