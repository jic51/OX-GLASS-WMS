// Verifies the check-in milestone bookkeeping in runCheckin_ — lifted verbatim
// out of Code_v3_fixed.gs (via vm, with Apps Script's globals stubbed) so it
// cannot drift from what actually ships.
//
// WHY: this is exactly the kind of logic that reads correctly and can still
// misbehave — firing twice, firing on a good install, never firing at all
// once SUPPORT_EMAIL is set late. A syntax check cannot see any of that; only
// running it, with time itself faked, can.
//
// Usage:  node tools/test-checkin.js [path/to/Code_v3_fixed.gs]

const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = process.argv[2] || path.join(__dirname, '..', 'Code_v3_fixed.gs');
const src = fs.readFileSync(SRC, 'utf8');

function extract(name) {
  const a = src.indexOf('function ' + name + '(');
  if (a === -1) throw new Error('not found: ' + name);
  let depth = 0, i = src.indexOf('{', a), start = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(a, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}
function extractVar(name) {
  const a = src.indexOf('var ' + name + ' ');
  const b = src.indexOf(';', a);
  return src.slice(a, b + 1);
}

const fails = [];
const check = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) fails.push(`${name}: expected ${w}, got ${g}`);
  else console.log('  ok   ' + name);
};

function newSandbox({ movementCount = 0, userCount = 0, supportEmail = '', now = Date.parse('2026-06-15T09:00:00Z'), setupCompletedAt = null }) {
  const props = {};
  if (supportEmail) props.SUPPORT_EMAIL = supportEmail;
  if (setupCompletedAt) props.SETUP_COMPLETED_AT = setupCompletedAt;
  const sentMail = [];

  const sandbox = {
    console,
    Date: (() => {
      const RealDate = Date;
      class FakeDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
      }
      return FakeDate;
    })(),
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = v; }
      })
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: name => {
          if (name === 'MASTER_ARCHIVE_V3') return { getLastRow: () => movementCount + 1 };
          if (name === 'USERS_V3')          return { getLastRow: () => userCount + 1 };
          return null;
        }
      })
    },
    MailApp: { sendEmail: opts => sentMail.push(opts) },
    Logger: { log: () => {} },
    escHtml_: s => String(s == null ? '' : s),
    companySettings_: () => ({ setupComplete: true, name: 'OX Glass LLC.' }),
    loadConfig: () => ({ adminEmail: 'jose@ox-glass.com' }),
    savedWebAppUrl_: () => 'https://script.google.com/macros/s/FAKE/exec',
    SHEETS: { ARCHIVE: 'MASTER_ARCHIVE_V3' }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(extractVar('CHECKIN_MILESTONE_DAYS'), sandbox);
  vm.runInContext(extract('runCheckin_'), sandbox);
  return { sandbox, props, sentMail };
}

console.log('Scenario: day 3, no movements, SUPPORT_EMAIL set — should alert once');
{
  const { sandbox, props, sentMail } = newSandbox({
    movementCount: 0, supportEmail: 'jose@personal.com',
    setupCompletedAt: '2026-06-12T09:00:00.000Z',   // exactly 3 days before "now"
    now: Date.parse('2026-06-15T09:00:00Z')
  });
  vm.runInContext('runCheckin_()', sandbox);
  check('one email sent', sentMail.length, 1);
  check('sent to SUPPORT_EMAIL', sentMail[0] && sentMail[0].to, 'jose@personal.com');
  check('milestone 3 recorded', props.CHECKIN_MILESTONES_SENT, '3');

  // Running again the same day must NOT re-send.
  vm.runInContext('runCheckin_()', sandbox);
  check('running again same day does not re-send', sentMail.length, 1);
}

console.log('\nScenario: day 10, no movements, trigger only just started running — must not backlog both milestones into two emails');
{
  const { sentMail, props } = newSandbox({
    movementCount: 0, supportEmail: 'jose@personal.com',
    setupCompletedAt: '2026-06-05T09:00:00.000Z',   // 10 days ago — both day-3 and day-7 are overdue
    now: Date.parse('2026-06-15T09:00:00Z')
  });
  // (sandbox already ran nothing yet — need to invoke)
}
{
  const { sandbox, props, sentMail } = newSandbox({
    movementCount: 0, supportEmail: 'jose@personal.com',
    setupCompletedAt: '2026-06-05T09:00:00.000Z',
    now: Date.parse('2026-06-15T09:00:00Z')
  });
  vm.runInContext('runCheckin_()', sandbox);
  check('exactly one email even with two milestones overdue at once', sentMail.length, 1);
  check('both milestones marked handled, not just one', props.CHECKIN_MILESTONES_SENT, '3,7');
}

console.log('\nScenario: day 3, movements already recorded — the good outcome, no email');
{
  const { sandbox, sentMail, props } = newSandbox({
    movementCount: 12, supportEmail: 'jose@personal.com',
    setupCompletedAt: '2026-06-12T09:00:00.000Z',
    now: Date.parse('2026-06-15T09:00:00Z')
  });
  vm.runInContext('runCheckin_()', sandbox);
  check('no email when the customer is actually using it', sentMail.length, 0);
  // Still marked handled — a milestone that already looked fine must not be
  // re-evaluated forever, e.g. if movements are later deleted.
  check('milestone still marked handled even though nothing was sent', props.CHECKIN_MILESTONES_SENT, '3');
}

console.log('\nScenario: day 3, no movements, but SUPPORT_EMAIL never configured — silently does nothing');
{
  const { sandbox, sentMail, props } = newSandbox({
    movementCount: 0, supportEmail: '',
    setupCompletedAt: '2026-06-12T09:00:00.000Z',
    now: Date.parse('2026-06-15T09:00:00Z')
  });
  vm.runInContext('runCheckin_()', sandbox);
  check('no email with no SUPPORT_EMAIL configured', sentMail.length, 0);
  check('milestone still marked handled (does not retroactively fire later)', props.CHECKIN_MILESTONES_SENT, '3');
}

console.log('\nScenario: SETUP_COMPLETED_AT missing (pre-existing install) — backfills to "now", fires nothing today');
{
  const { sandbox, sentMail, props } = newSandbox({
    movementCount: 0, supportEmail: 'jose@personal.com',
    setupCompletedAt: null,
    now: Date.parse('2026-06-15T09:00:00Z')
  });
  vm.runInContext('runCheckin_()', sandbox);
  check('no false alarm on an old install seeing this feature for the first time', sentMail.length, 0);
  check('SETUP_COMPLETED_AT backfilled', props.SETUP_COMPLETED_AT, '2026-06-15T09:00:00.000Z');
}

if (fails.length) { console.error('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('\ncheck-in: ok');
