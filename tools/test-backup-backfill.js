// Verifies getBackupStatus's one-time Drive backfill (_findMostRecentBackup_)
// — lifted verbatim out of Code_v3_fixed.gs into a Node vm with Apps Script's
// globals stubbed. Jose's report: an install that was already backing up
// before LAST_BACKUP_AT existed showed nothing in Settings → System even
// though the files are genuinely sitting in Drive.
//
// WHY THIS ONE EARNS A REAL TEST: "find the newest of N files" is exactly the
// kind of thing that's subtly wrong in a way node --check cannot see — off-by-
// one on the comparison, picking the OLDEST instead of newest, or re-scanning
// Drive on every single load instead of remembering what it found.
//
// Usage:  node tools/test-backup-backfill.js [path/to/Code_v3_fixed.gs]

const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = process.argv[2] || path.join(__dirname, '..', 'Code_v3_fixed.gs');
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

function FakeFile(name, id, dateCreated) { this._name = name; this._id = id; this._date = dateCreated; }
FakeFile.prototype.getName = function () { return this._name; };
FakeFile.prototype.getId = function () { return this._id; };
FakeFile.prototype.getDateCreated = function () { return this._date; };

function FakeFolder(files) { this._files = files || []; }
FakeFolder.prototype.getFiles = function () {
  var i = 0, files = this._files;
  return { hasNext: function () { return i < files.length; }, next: function () { return files[i++]; } };
};

function newSandbox(props, folderFiles) {
  const sandbox = {
    console: console,
    Logger: { log: function () {} },
    PropertiesService: {
      getScriptProperties: function () {
        return {
          getProperty: function (k) { return (k in props) ? props[k] : null; },
          setProperty: function (k, v) { props[k] = v; }
        };
      }
    },
    requireAuth_: function () { return { role: 'ADMIN', email: 'jose@ox-glass.com' }; },
    backupEnabled_: function () { return true; },
    backupFolderName_: function () { return 'Acopio Backups'; },
    BACKUP_RETENTION_DAYS: 30,
    getOrCreateFolder_: function () { return new FakeFolder(folderFiles); }
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn('_findMostRecentBackup_') + '\n' + extractFn('getBackupStatus'), sandbox);
  return sandbox;
}

console.log('\nScenario: nothing recorded yet, but 3 backups already exist in Drive (pre-feature install)');
{
  const props = {};
  const files = [
    new FakeFile('Backup 2026-08-17_0200', 'id-17', new Date('2026-08-17T02:00:00Z')),
    new FakeFile('Backup 2026-08-19_0200', 'id-19', new Date('2026-08-19T02:00:00Z')),  // newest
    new FakeFile('Backup 2026-08-18_0200', 'id-18', new Date('2026-08-18T02:00:00Z'))
  ];
  const sb = newSandbox(props, files);
  const res = sb.getBackupStatus();
  check('finds the NEWEST file, not the first or last in the list', res.lastBackupFileId === 'id-19');
  check('name matches the newest file', res.lastBackupName === 'Backup 2026-08-19_0200');
  check('lastBackupAt is a real ISO timestamp for that file', res.lastBackupAt === new Date('2026-08-19T02:00:00Z').toISOString());
  check('the finding gets remembered — no re-scan needed next time', props.LAST_BACKUP_AT === res.lastBackupAt);
  check('remembered name matches too', props.LAST_BACKUP_NAME === 'Backup 2026-08-19_0200');
  check('remembered file id matches too', props.LAST_BACKUP_FILE_ID === 'id-19');
}

console.log('\nScenario: already recorded — does not re-scan Drive at all');
{
  const props = { LAST_BACKUP_AT: '2026-08-19T02:13:00.000Z', LAST_BACKUP_NAME: 'Backup 2026-08-19_0213', LAST_BACKUP_FILE_ID: 'real-id' };
  let scanned = false;
  const sb = newSandbox(props, []);
  sb.getOrCreateFolder_ = function () { scanned = true; return new FakeFolder([]); };
  const res = sb.getBackupStatus();
  check('returns the already-recorded values untouched', res.lastBackupFileId === 'real-id' && res.lastBackupName === 'Backup 2026-08-19_0213');
  check('Drive was never touched — no folder scan when something is already on record', scanned === false);
}

console.log('\nScenario: nothing recorded AND nothing in Drive either (a genuinely fresh install)');
{
  const props = {};
  const sb = newSandbox(props, []);
  const res = sb.getBackupStatus();
  check('no backup fields, no crash', res.lastBackupAt === '' && res.lastBackupName === '' && res.lastBackupFileId === '');
  check('nothing false gets written to properties', !('LAST_BACKUP_AT' in props));
}

console.log('\nScenario: a single existing backup — the trivial case still works, not just the pick-the-max logic');
{
  const props = {};
  const files = [ new FakeFile('Backup 2026-08-10_0200', 'only-id', new Date('2026-08-10T02:00:00Z')) ];
  const sb = newSandbox(props, files);
  const res = sb.getBackupStatus();
  check('finds the one file that exists', res.lastBackupFileId === 'only-id');
}

console.log('\nbackup backfill: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
