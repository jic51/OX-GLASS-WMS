// Verifies that dismissing a system notice does NOT erase it from the
// maintenance record — the bug Jose caught (v9.92).
//
// Settings → System said "Nothing automatic has run yet" directly above a
// "Last backup: today at 2:13 AM" line that was perfectly true. Both read the
// same systemActivity list, but they are not the same kind of thing: the
// corner deck is a NOTICE (you press ✕ once you have read it), Settings →
// System is a RECORD (it has to keep saying the backup ran). getSystemActivity
// used to drop dismissed rows at the source, so pressing ✕ deleted the
// history too. It started when dismissals moved from localStorage — where
// they never actually stuck — to the server, which is exactly the
// v9.65 → v9.70 window Jose remembered the list vanishing in.
//
// Both halves are checked here: the backend's flag-don't-drop behaviour
// (lifted verbatim from Code_v3_fixed.gs into a Node vm with the Sheets API
// stubbed) and the frontend's two consumers actually disagreeing about it.
//
// Usage:  node tools/test-sysactivity-dismiss.js

const fs = require('fs'), path = require('path'), vm = require('vm');

const GS  = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

function extractFn(src, name) {
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

// ── Backend: getSystemActivity, real source, fake sheet ─────────────────────
// Six nightly backups, oldest first. AUDIT_LOG columns:
// [when, action, actor, detail, extra, fileId]
const backups = [];
for (let d = 1; d <= 6; d++) {
  backups.push([
    new Date(Date.UTC(2026, 7, d, 8, 13)), 'BACKUP_CREATED', 'system',
    'OX — Backup 2026-08-0' + d + '_0213', '', 'fileid_' + d
  ]);
}
// Ordinary traffic in between — must never show up as system activity.
const rows = [];
backups.forEach(function (b, i) {
  rows.push(b);
  rows.push([new Date(Date.UTC(2026, 7, i + 1, 9, 0)), 'ADD_MOVEMENT', 'jose@ox-glass.com', 'GLASS', '', '']);
});

const DISMISSED = {};
// Jose pressed ✕ on the four oldest backup notices over the past few days.
backups.slice(0, 4).forEach(function (b) {
  DISMISSED[new Date(b[0]).toISOString() + '|BACKUP_CREATED'] = 1;
});

const ctx = vm.createContext({
  SYSTEM_ACTORS: { 'system': 1, 'system@scheduled-trigger': 1 },
  SYSTEM_EVENT_LABELS: { BACKUP_CREATED: 'Backup created' },
  SHEETS: { AUDIT: 'AUDIT_LOG' },
  sysDismissedSet_: function () { return DISMISSED; },
  SpreadsheetApp: {
    getActiveSpreadsheet: function () {
      return {
        getSheetByName: function () {
          return {
            getLastRow: function () { return rows.length + 1; },   // +1 for the header
            getRange: function (startRow, c, n) {
              // startRow is 1-based and counts the header row
              return { getValues: function () { return rows.slice(startRow - 2, startRow - 2 + n); } };
            }
          };
        }
      };
    }
  },
  console: console,
});
vm.runInContext(extractFn(GS, 'getSystemActivity'), ctx);

console.log('\nScenario: four of six nightly backups have been dismissed');
const out = vm.runInContext('getSystemActivity(30, "jose@ox-glass.com")', ctx);

check('all six backups come back, not just the two undismissed ones (got ' + out.length + ')', out.length === 6);
check('every one of them is a backup — ordinary movement traffic never leaks in',
  out.every(function (a) { return a.action === 'BACKUP_CREATED'; }));
check('exactly the four dismissed ones are flagged dismissed',
  out.filter(function (a) { return a.dismissed; }).length === 4);
check('the two undismissed ones are flagged not-dismissed',
  out.filter(function (a) { return !a.dismissed; }).length === 2);
check('newest first', new Date(out[0].at) > new Date(out[out.length - 1].at));
check('each backup still carries its Drive link, dismissed or not',
  out.every(function (a) { return a.ref && a.ref.kind === 'drive' && a.ref.id; }));

console.log('\nScenario: the deck\'s budget is spent on LIVE cards, not on ones dismissed months ago');
// limit:2 — the two undismissed are what the deck can show; asking for two
// must not stop at the first two rows scanned and return only dismissed ones.
const small = vm.runInContext('getSystemActivity(2, "jose@ox-glass.com")', ctx);
check('asking for 2 still yields 2 undismissed (deck is not starved by dismissals)',
  small.filter(function (a) { return !a.dismissed; }).length === 2);

console.log('\nScenario: nobody has dismissed anything');
const NONE = {};
ctx.sysDismissedSet_ = function () { return NONE; };
const fresh = vm.runInContext('getSystemActivity(30, "someone@else.com")', ctx);
check('all six come back, none flagged', fresh.length === 6 && fresh.every(function (a) { return !a.dismissed; }));

// ── Frontend: the two consumers must disagree about `dismissed` ─────────────
console.log('\nScenario: the deck hides dismissed notices, Settings → System keeps showing them');

const announce = extractFn(HTML, '_announceSystemActivity');
const fe = vm.createContext({
  systemActivity: out,
  _sysDismissedNow: {},
  _sysCards: null,
  _renderSysDeck: function () {},
  console: console,
});
vm.runInContext('var _sysCards;' + announce, fe);
vm.runInContext('_announceSystemActivity()', fe);
check('deck shows only the two undismissed backups (got ' + fe._sysCards.length + ')', fe._sysCards.length === 2);

// The Settings tab builds from `systemActivity` directly with no dismissed
// filter — assert that in the source, since _renderSystemTab writes a large
// innerHTML blob that is not worth reconstructing a DOM for.
const tabSrc = extractFn(HTML, '_renderSystemTab');
const listExpr = tabSrc.slice(tabSrc.indexOf('var actHtml'), tabSrc.indexOf('content.innerHTML'));
check('Settings → System maps systemActivity without filtering on dismissed',
  /systemActivity\s*&&\s*systemActivity\.length/.test(listExpr) && !/dismissed/.test(listExpr.replace(/\/\/[^\n]*/g, '')));
check('...and the deck DOES filter on it', /!a\.dismissed/.test(announce));

console.log('\nsystem activity vs dismissal: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
