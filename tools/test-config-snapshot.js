// Verifies the configuration snapshot written into every backup copy
// (writeConfigSnapshot_), lifted verbatim from Code_v3_fixed.gs into a Node
// vm with SpreadsheetApp and PropertiesService stubbed.
//
// WHY IT EXISTS: a backup copies the SPREADSHEET, but Script Properties
// belong to the Apps Script project — so a restored copy came back with
// every movement and no configuration at all. The one that hurts is
// FOLDER_PREFIX: without it, every photo and document ever attached silently
// stops opening, because the app looks in a folder that is not where they
// are. None of that is visible to node --check or to a browser test.
//
// The other half of what is being tested is what must NOT be in there. Four
// properties are excluded on purpose, and the most important is
// OAUTH_CLIENT_SECRET — it is not the customer's secret, it is ours, and the
// same one across every installation. Copying it into a file in each
// customer's Drive would spread it far wider than the live script's settings
// ever are.
//
// Usage:  node tools/test-config-snapshot.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');

function extractFn(name) {
  const a = GS.indexOf('function ' + name + '(');
  if (a === -1) throw new Error('function not found: ' + name);
  let depth = 0, i = GS.indexOf('{', a);
  for (; i < GS.length; i++) {
    if (GS[i] === '{') depth++;
    else if (GS[i] === '}') { depth--; if (depth === 0) return GS.slice(a, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}
// Lifts a top-level `var NAME = { … };` or `var NAME = [ … ];` out of the file.
//
// It used to count only braces, which works for an object and silently
// TRUNCATES an array of objects at the first `}` — the end of PROPERTY_GUIDE's
// first entry — handing the vm a fragment that fails to parse. Counting
// whichever bracket actually opens the literal is the whole fix.
function extractVar(name) {
  const a = GS.indexOf('var ' + name + ' = ');
  if (a === -1) throw new Error('var not found: ' + name);
  const curly = GS.indexOf('{', a), square = GS.indexOf('[', a);
  const usesArray = square !== -1 && (curly === -1 || square < curly);
  const open = usesArray ? '[' : '{', close = usesArray ? ']' : '}';
  let depth = 0, i = usesArray ? square : curly;
  for (; i < GS.length; i++) {
    if (GS[i] === open) depth++;
    else if (GS[i] === close) { depth--; if (depth === 0) return GS.slice(a, i + 1) + ';'; }
  }
  throw new Error('unbalanced brackets in ' + name);
}

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

const PROPS = {
  FOLDER_PREFIX: 'OX_WMS_v3',
  FOLDER_PREFIX_HISTORY: '["OLD_PREFIX"]',
  COMPANY_NAME: 'OX Glass LLC.',
  COMPANY_DOMAIN: 'ox-glass.com',
  COMPANY_LOGO_ID: 'logo123',
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
  OAUTH_CLIENT_ID: '1234-abc.apps.googleusercontent.com',
  WMS_MONITORED_MATERIALS: '{"WINDOW|||GLASS":10}',
  COLUMN_PREFS: '{"mov":["type","date"]}',
  ROLE_PERMS_WAREHOUSE: '{"canSeeCosts":true}',
  WAREHOUSE_ROLE_LABEL: 'Supervisor',
  SETUP_COMPLETE: 'true',
  // the four that must never be copied
  OAUTH_CLIENT_SECRET: 'GOCSPX-supersecret',
  GEMINI_API_KEY: 'AIza-secret',
  SESSION_SECRET: 'f95566c1-secret',
  WMS_SESSIONS: '{"tok":"jose@ox-glass.com"}'
};

function run(props) {
  const written = { values: null, widths: {}, bold: [], cleared: false, created: null };
  const sheet = {
    clear: function () { written.cleared = true; },
    getRange: function (r, c, nr, nc) {
      // Records the two calls this test reads and stays chainable for every
      // other formatting call, the way a real Range does. Listing them one by
      // one meant each new bit of styling in the function broke the test with
      // a TypeError that said nothing about the behaviour being tested.
      const api = {
        setValues: function (v) { if (!written.values) written.values = v; return proxy; },
        setFontWeight: function () { written.bold.push(r); return proxy; }
      };
      const proxy = new Proxy(api, { get: function (t, k) {
        if (k in t) return t[k];
        return function () { return proxy; };
      }});
      return proxy;
    },
    setColumnWidth: function (c, w) { written.widths[c] = w; }
  };
  const liveSs = {
    getSheetByName: function () { return null; },          // forces the insert path
    insertSheet: function (n) { written.created = n; return sheet; },
    deleteSheet: function () { written.deleted = true; }
  };
  const ctx = vm.createContext({
    console: console,
    Logger: { log: function () {} },
    PropertiesService: { getScriptProperties: function () { return { getProperties: function () { return props; } }; } },
    // The spreadsheet the script is bound to — the ONLY one it may open under
    // `spreadsheets.currentonly`. The old mock offered openById instead, which
    // is precisely the call the real runtime refuses; a stub that grants a
    // permission production denies does not test the code, it hides it.
    SpreadsheetApp: {
      flush: function () {},
      getActiveSpreadsheet: function () { return liveSs; }
    },
    _live: null
  });
  vm.runInContext([
    extractVar('SHEETS'),
    extractVar('SNAPSHOT_EXCLUDE'),
    extractVar('SNAPSHOT_REPLACE_AFTER_DEPLOY'),
    // The real PROPERTY_GUIDE, not a stand-in: the third column is only as
    // useful as the sentences in it, and a fake list would test the plumbing
    // while saying nothing about whether a reader learns anything.
    extractVar('PROPERTY_GUIDE'),
    extractFn('writeConfigSnapshot_')
  ].join('\n'), ctx);
  const count = vm.runInContext('writeConfigSnapshot_(SpreadsheetApp.getActiveSpreadsheet())', ctx);
  return { written: written, count: count, ctx: ctx };
}

console.log('\nScenario: a normal install with everything configured');
const r = run(PROPS);
const grid = r.written.values;
const flat = grid.map(function (row) { return row.join(' | '); }).join('\n');
const keys = grid.map(function (row) { return row[0]; });

check('the snapshot sheet is created inside the copy', !!r.written.created);
check('it is the dedicated snapshot sheet, not one of the data sheets',
  r.written.created === 'ACOPIO_CONFIG_SNAPSHOT');
check('anything already there is cleared first, so a re-run cannot leave stale rows', r.written.cleared);

console.log('\n  — what MUST be in there —');
[
  ['FOLDER_PREFIX (the one that breaks every attachment)', 'FOLDER_PREFIX'],
  ['FOLDER_PREFIX_HISTORY (attachments from before a rename)', 'FOLDER_PREFIX_HISTORY'],
  ['COMPANY_DOMAIN (staff being auto-recognised)', 'COMPANY_DOMAIN'],
  ['WEB_APP_URL', 'WEB_APP_URL'],
  ['OAUTH_CLIENT_ID (the id is not the secret)', 'OAUTH_CLIENT_ID'],
  ['WMS_MONITORED_MATERIALS (low-stock alerts)', 'WMS_MONITORED_MATERIALS'],
  ['COLUMN_PREFS', 'COLUMN_PREFS'],
  ['ROLE_PERMS_WAREHOUSE', 'ROLE_PERMS_WAREHOUSE'],
  ['WAREHOUSE_ROLE_LABEL', 'WAREHOUSE_ROLE_LABEL']
].forEach(function (pair) {
  check(pair[0], keys.indexOf(pair[1]) !== -1);
});
check('and its VALUE, not just its name', flat.indexOf('OX_WMS_v3') !== -1);

console.log('\n  — what must NEVER be in there —');
check('OAUTH_CLIENT_SECRET value is absent (ours, and shared across every customer)',
  flat.indexOf('GOCSPX-supersecret') === -1);
check('GEMINI_API_KEY value is absent', flat.indexOf('AIza-secret') === -1);
check('SESSION_SECRET value is absent', flat.indexOf('f95566c1-secret') === -1);
check('WMS_SESSIONS value is absent', flat.indexOf('jose@ox-glass.com') === -1);
check('all four are still NAMED, so whoever restores knows they are missing',
  ['OAUTH_CLIENT_SECRET', 'GEMINI_API_KEY', 'SESSION_SECRET', 'WMS_SESSIONS']
    .every(function (k) { return flat.indexOf(k) !== -1; }));
check('the sheet says FOLDER_PREFIX goes first', /FOLDER_PREFIX goes first/.test(flat));

console.log('\nScenario: a brand-new install with nothing configured yet');
const empty = run({});
check('does not crash', !!empty.written.values);
check('says so instead of writing an empty grid',
  empty.written.values.map(function (r2) { return r2[0]; }).indexOf('(nothing stored yet)') !== -1);

console.log('\nScenario: an install that has ONLY the excluded properties');
const onlySecret = run({ OAUTH_CLIENT_SECRET: 'GOCSPX-x', SESSION_SECRET: 'y' });
const onlyFlat = onlySecret.written.values.map(function (r2) { return r2.join(' | '); }).join('\n');
check('still leaks nothing', onlyFlat.indexOf('GOCSPX-x') === -1);
check('and reports zero properties copied', onlySecret.count === 0);

// ── The backup's own bookkeeping must not be restored ───────────────────────
//
// Jose read the first working snapshot and asked why line 23 said
// "LAST_BACKUP_SNAPSHOT = FAILED" inside a tab that had plainly just been
// written successfully. It carried the PREVIOUS run's result, because the
// snapshot is taken before the current run records its own outcome.
//
// Making it accurate would have been the wrong fix. These four describe the
// OLD installation's backup history; a restored copy that claims a backup ran
// last Tuesday is asserting something about itself that never happened, and
// the System tab would show a green last-backup line for a file that has
// never been backed up at all.
console.log('\nScenario: an install with backup bookkeeping and a real setting');
{
  const r = run({
    FOLDER_PREFIX: 'Acopio_TEST',
    LAST_BACKUP_AT: '2026-08-25T21:00:34.194Z',
    LAST_BACKUP_NAME: 'TEST — Backup 2026-08-25_1500',
    LAST_BACKUP_FILE_ID: '1ff5jvr2jBDujFkv5',
    LAST_BACKUP_SNAPSHOT: 'FAILED: Specified permissions are not sufficient'
  });
  const flat = r.written.values.map(row => row.join(' | ')).join('\n');
  check('the real setting is carried', /FOLDER_PREFIX \| Acopio_TEST/.test(flat));
  check('...and only it is counted', r.count === 1);
  check('no stale "FAILED" from a previous run reaches the document',
    flat.indexOf('FAILED: Specified permissions') === -1);
  ['LAST_BACKUP_AT', 'LAST_BACKUP_NAME', 'LAST_BACKUP_FILE_ID', 'LAST_BACKUP_SNAPSHOT'].forEach(k => {
    // Named in the excluded list at the top, but never as a value to copy.
    const asValue = new RegExp('^' + k + ' \\|', 'm');
    check(k + ' is not offered for restoring', !asValue.test(flat));
  });
}

// ── A third column, because a name and a value is not an explanation ────────
//
// Jose saw "WAREHOUSE_ROLE_LABEL = SUPERVISOR" and reasonably concluded his
// own account had the wrong role. It is the display NAME chosen for the
// warehouse role and says nothing about who he is. This document is read once,
// during an emergency, possibly by somebody who has never seen it before.
console.log('\nScenario: the snapshot explains itself');
{
  const r = run({
    FOLDER_PREFIX: 'Acopio_TEST',
    WAREHOUSE_ROLE_LABEL: 'SUPERVISOR',
    WEB_APP_URL: 'https://script.google.com/macros/s/OLD/exec',
    FOLDER_Acopio_TEST_Docs: '1abc'
  });
  const byKey = {};
  r.written.values.forEach(row => { byKey[row[0]] = row; });

  check('every row has a third column for what it is',
    r.written.values.every(row => row.length === 3));
  check('the header names it', (byKey['PROPERTY'] || [])[2] === 'WHAT IT IS');
  check('WAREHOUSE_ROLE_LABEL says it is the ROLE\'s display name, not the reader\'s role',
    /display name/i.test((byKey['WAREHOUSE_ROLE_LABEL'] || [])[2] || ''));
  // The real sentence is "Names the Drive folders holding every document and
  // photo ever attached." My first pattern looked for "attachment" and failed
  // on "attached" — the code was right and the test was reading for a word
  // nobody wrote.
  check('FOLDER_PREFIX explains why it goes first',
    /document and photo/i.test((byKey['FOLDER_PREFIX'] || [])[2] || ''));
  check('a generated FOLDER_* key still gets an explanation rather than a blank',
    /Drive folder id/i.test((byKey['FOLDER_Acopio_TEST_Docs'] || [])[2] || ''));

  // The one Jose asked about directly: the URL changes on redeploy, so copying
  // the old value across is worse than leaving it empty.
  check('WEB_APP_URL is flagged to be REPLACED, not copied',
    /⚠/.test((byKey['WEB_APP_URL'] || [])[2] || '') &&
    /REPLACE/.test((byKey['WEB_APP_URL'] || [])[2] || ''));
  check('...and the header tells the reader that ⚠ means do not copy as-is',
    r.written.values.some(row => /must NOT be copied as-is/.test(row[0] || '')));
}

// ── The assertion that was exactly backwards ───────────────────────────────
//
// This block used to check that writeConfigSnapshot_ calls
// SpreadsheetApp.openById on the finished copy — and it passed, every time,
// for months. It was pinning the one thing that makes the feature IMPOSSIBLE:
// the manifest declares `spreadsheets.currentonly`, so the copy is a
// spreadsheet this script may never open. Every backup from v9.97 to v11.13
// carried the data and none of the settings.
//
// The mock is what made it possible to be so wrong so confidently. It handed
// the code an openById that the real runtime forbids, so the test proved the
// code does what it was written to do, and nothing about whether that could
// work. A stub that grants a permission production denies is worse than no
// test: it converts an unknown into a false certainty.
//
// So the check now runs in the other direction, and the manifest is part of it.
console.log('\nScenario: it only touches the spreadsheet the scopes allow');
const src = extractFn('writeConfigSnapshot_');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'appsscript.json'), 'utf8'));
const scopes = manifest.oauthScopes || [];
const narrow = scopes.indexOf('https://www.googleapis.com/auth/spreadsheets.currentonly') !== -1;
const broad  = scopes.indexOf('https://www.googleapis.com/auth/spreadsheets') !== -1;

check('the manifest still asks only for the CONTAINER spreadsheet', narrow && !broad);
check('...so the snapshot must not try to open any other spreadsheet by id',
  !/openById/.test(src));
check('it writes into the spreadsheet it was handed', /ss\.getSheetByName|ss\.insertSheet/.test(src));

// And the ordering that makes the copy inherit it.
{
  const GS2 = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');
  const run = GS2.slice(GS2.indexOf('function runBackupNow_'),
                        GS2.indexOf('function ', GS2.indexOf('function runBackupNow_') + 10));
  check('the snapshot is written BEFORE the copy is taken — otherwise the copy cannot contain it',
    run.indexOf('writeConfigSnapshot_(ss)') < run.indexOf('makeCopy'));
  check('...and flushed, so the copy cannot race the write',
    run.indexOf('SpreadsheetApp.flush()') > run.indexOf('writeConfigSnapshot_(ss)') &&
    run.indexOf('SpreadsheetApp.flush()') < run.indexOf('makeCopy'));
  check('the tab is removed from the LIVE file afterwards — it belongs in the backup',
    /deleteSheet\(live\)/.test(run));
  check('...in a finally, so a failed copy cannot leave it behind either',
    /finally\s*\{[\s\S]{0,400}deleteSheet\(live\)/.test(run));
}

// ── A snapshot that fails must not fail quietly ─────────────────────────────
//
// Writing the snapshot is deliberately allowed to fail without killing the
// backup — a copy of the data still beats no copy. But until v11.13 it failed
// into Logger.log alone, which nobody reads, so the ONE thing that makes a
// backup restorable could stop working while every backup afterwards looked
// perfectly healthy in Drive AND in the app. You would find out during the
// emergency: the only moment it is too late.
//
// Jose hit the near-miss while doing the first real restore drill — he could
// not find the snapshot tab, and there was no way from inside the app to tell
// "it is there and you are looking in the wrong place" from "it never ran".
console.log('\nWhen the snapshot cannot be written');
{
  const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');
  const body = GS.slice(GS.indexOf('function runBackupNow_'),
                        GS.indexOf('function ', GS.indexOf('function runBackupNow_') + 10));

  check('the backup still completes — a snapshot problem never costs you the copy',
    /catch\s*\(eSnap\)/.test(body) && !/throw eSnap/.test(body));
  check('the failure is written to the Error Log, not just to Logger',
    /logError_\([^)]*\n?[^)]*writeConfigSnapshot/.test(body) || /logError_\(ss, 'WARN'[\s\S]{0,120}writeConfigSnapshot/.test(body));
  check('...and remembered, so the app can say so afterwards',
    /LAST_BACKUP_SNAPSHOT/.test(body));
  check('...saying explicitly that a restore would mean re-entering the properties by hand',
    /re-entering the Script Properties by hand/.test(body));

  const st = GS.slice(GS.indexOf('function getBackupStatus'), GS.indexOf('function listBackups_'));
  check('getBackupStatus hands that state to the app', /lastBackupSnapshot/.test(st));

  const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');
  check('the System tab warns when the last backup carries data but not settings',
    /snap-warn/.test(HTML) && /NOT your settings/.test(HTML));
  check('...and confirms it by NAME when it worked, so nobody hunts for the wrong tab',
    /ACOPIO_CONFIG_SNAPSHOT/.test(HTML));
}

console.log('\nconfig snapshot: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
