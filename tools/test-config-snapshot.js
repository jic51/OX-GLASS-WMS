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
function extractVar(name) {
  const a = GS.indexOf('var ' + name + ' = ');
  if (a === -1) throw new Error('var not found: ' + name);
  let depth = 0, i = GS.indexOf('{', a);
  for (; i < GS.length; i++) {
    if (GS[i] === '{') depth++;
    else if (GS[i] === '}') { depth--; if (depth === 0) return GS.slice(a, i + 1) + ';'; }
  }
  throw new Error('unbalanced braces in ' + name);
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
      return {
        setValues: function (v) { if (!written.values) written.values = v; return this; },
        setFontWeight: function () { written.bold.push(r); return this; }
      };
    },
    setColumnWidth: function (c, w) { written.widths[c] = w; }
  };
  const ctx = vm.createContext({
    console: console,
    Logger: { log: function () {} },
    PropertiesService: { getScriptProperties: function () { return { getProperties: function () { return props; } }; } },
    SpreadsheetApp: {
      openById: function () {
        return {
          getSheetByName: function () { return null; },          // forces the insert path
          insertSheet: function (n) { written.created = n; return sheet; }
        };
      }
    }
  });
  vm.runInContext(extractVar('SHEETS') + '\n' + extractVar('SNAPSHOT_EXCLUDE') + '\n' + extractFn('writeConfigSnapshot_'), ctx);
  const count = vm.runInContext('writeConfigSnapshot_("copyid")', ctx);
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

// The live file must never gain this sheet — the snapshot is written by id,
// against the copy runBackupNow_ just made.
console.log('\nScenario: the live spreadsheet is never touched');
const src = extractFn('writeConfigSnapshot_');
check('opens the copy by id rather than using the active spreadsheet',
  /SpreadsheetApp\.openById\(copyFileId\)/.test(src) && !/getActiveSpreadsheet/.test(src));

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
