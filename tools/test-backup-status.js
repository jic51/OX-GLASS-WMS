// Verifies the "Last backup" line in Settings → System (_drawBackupBox),
// lifted verbatim into a Node vm — the frontend half of the v9.82 backup-
// visibility fix.
//
// WHY THIS ONE EARNS A REAL TEST: the backend half (runBackupNow_ now writes
// LAST_BACKUP_AT/NAME/FILE_ID Script Properties instead of relying on
// AUDIT_LOG's ~1500-row tail, which a busy install can scroll past in under a
// day) can't run outside real Apps Script/Drive, so it's read-verified by eye
// against Code_v3_fixed.gs. What CAN run here is the part that decides what a
// customer actually sees: does the line show up at all when there IS a
// recorded backup, does it correctly say nothing on a fresh install with
// none yet, and does a file name with HTML-sensitive characters render safe.
//
// Usage:  node tools/test-backup-status.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const src = fs.readFileSync(SRC, 'utf8');

function extractFn(name) {
  const a = src.indexOf('function ' + name + '(');
  if (a === -1) throw new Error('function not found: ' + name);
  let depth = 0, i = src.indexOf('{', a);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(a, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function FakeEl() { this.innerHTML = ''; }
function makeDocument() {
  const box = new FakeEl();
  return { getElementById: function (id) { return id === 'backupBox' ? box : null; }, box: box };
}

const sandbox = { console: console };
vm.createContext(sandbox);
vm.runInContext(
  extractFn('_he') + '\n' +
  extractFn('_fmtWhen') + '\n' +
  extractFn('_drawBackupBox'),
  sandbox
);

console.log('\nScenario: a fresh install with no backup yet');
sandbox.document = makeDocument();
sandbox._drawBackupBox({ enabled: true, retentionDays: 30, folder: 'Acopio Backups' });
check('no "Last backup" line shown', sandbox.document.box.innerHTML.indexOf('Last backup') === -1);

console.log('\nScenario: a real backup on record');
sandbox.document = makeDocument();
const iso = new Date().toISOString();
sandbox._drawBackupBox({
  enabled: true, retentionDays: 30, folder: 'Acopio Backups',
  lastBackupAt: iso, lastBackupName: 'OX Glass — Backup 2026-08-19_0213', lastBackupFileId: 'abc123'
});
const html1 = sandbox.document.box.innerHTML;
check('"Last backup" line present', html1.indexOf('Last backup') !== -1);
check('shows "today at" (backup was just now)', html1.indexOf('today at') !== -1);
check('links to the real Drive file', html1.indexOf('https://drive.google.com/file/d/abc123/view') !== -1);
check('shows the backup file name', html1.indexOf('OX Glass') !== -1);

console.log('\nScenario: a backup name with HTML-sensitive characters cannot inject markup');
sandbox.document = makeDocument();
sandbox._drawBackupBox({
  enabled: true, retentionDays: 30, folder: 'Acopio Backups',
  lastBackupAt: iso, lastBackupName: '<img src=x onerror=alert(1)>', lastBackupFileId: 'x'
});
const html2 = sandbox.document.box.innerHTML;
check('angle brackets are escaped', html2.indexOf('<img') === -1);
check('escaped form present instead', html2.indexOf('&lt;img') !== -1);

console.log('\nScenario: schedule OFF still shows the last-backup line if one exists (schedule and history are separate facts)');
sandbox.document = makeDocument();
sandbox._drawBackupBox({ enabled: false, retentionDays: 30, folder: '', lastBackupAt: iso, lastBackupName: 'Manual backup', lastBackupFileId: 'z' });
check('"Last backup" still shown even with the schedule off', sandbox.document.box.innerHTML.indexOf('Last backup') !== -1);

console.log('\nbackup status: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
