// Verifies the account button's tooltip (_setAccountIdentity's data-tip
// build) — lifted verbatim into a Node vm. Jose's ask: hovering the avatar
// used to just say "Your account" (the button already IS the account — not
// information); it should show who's signed in and their role, name over
// role, not side by side.
//
// WHY THIS ONE EARNS A REAL TEST: the two-line format depends on white-space:
// pre-line actually being set on .tip::after (a global CSS change) — a
// missing "\n" or a stale "Your account" left in by mistake would silently
// ship the old behavior back. Cheap to catch here, easy to miss by eye.
//
// Usage:  node tools/test-account-tooltip.js [path/to/Index_v3_fixed.html]

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

function FakeEl() { this.style = {}; this.textContent = ''; this.innerHTML = ''; this._attrs = {}; }
FakeEl.prototype.setAttribute = function (k, v) { this._attrs[k] = v; };
FakeEl.prototype.getAttribute = function (k) { return (k in this._attrs) ? this._attrs[k] : null; };

function makeDocument() {
  const els = {
    acctBtn: new FakeEl(), acctInitials: new FakeEl(), acctAvatar: new FakeEl(),
    acctName: new FakeEl(), acctEmail: new FakeEl(), acctTags: new FakeEl(), acctFoot: new FakeEl()
  };
  return { getElementById: function (id) { return els[id] || null; }, els: els };
}

const sandbox = {
  console: console,
  PRODUCT: 'Acopio',
  APP_VERSION: '9.84',
  // The footer line prints the build fingerprint beside the version (v10.9).
  // Left EMPTY on purpose: an unstamped build has to show the version alone
  // rather than a dangling " · build ", and this is the one place that branch
  // gets exercised.
  APP_BUILD: '',
  _companyName: '',
  _lastUserName: '',
  _initialsFor: function () { return 'JC'; },
  _avatarColor: function () { return '#123456'; },
  _ROLE_TAG_STYLE: { ADMIN: '', WAREHOUSE: '', VIEWER: '' }
};
vm.createContext(sandbox);
vm.runInContext(extractFn('_he') + '\n' + extractFn('_displayRole') + '\n' + extractFn('_setAccountIdentity'), sandbox);

console.log('\nScenario: ADMIN — name over role, not "Your account"');
sandbox.warehouseRoleLabel = 'Warehouse';
sandbox.document = makeDocument();
sandbox._setAccountIdentity('Jose Castro', 'jose@ox-glass.com', 'ADMIN', false);
const tipAdmin = sandbox.document.els.acctBtn.getAttribute('data-tip');
check('shows the real name, not "Your account"', tipAdmin.indexOf('Your account') === -1 && tipAdmin.indexOf('Jose Castro') !== -1);
check('shows the role on its own line, stacked under the name', tipAdmin === 'Jose Castro\nADMIN');

console.log('\nScenario: WAREHOUSE with a custom role label — tooltip uses the label, not the literal internal value');
sandbox.warehouseRoleLabel = 'Supervisor';
sandbox.document = makeDocument();
sandbox._setAccountIdentity('Maria Lopez', 'maria@ox-glass.com', 'WAREHOUSE', false);
check('shows the custom label, not the raw "WAREHOUSE"', sandbox.document.els.acctBtn.getAttribute('data-tip') === 'Maria Lopez\nSupervisor');

console.log('\nScenario: no name on record — falls back to email rather than showing nothing');
sandbox._lastUserName = '';   // _lastUserName is a real cross-call cache in the app too (see _setAccountIdentity's own fallback) — reset it here so this scenario reflects a fresh load, not a name left over from the previous one
sandbox.document = makeDocument();
sandbox._setAccountIdentity('', 'noname@ox-glass.com', 'VIEWER', false);
check('falls back to the email', sandbox.document.els.acctBtn.getAttribute('data-tip') === 'noname@ox-glass.com\nVIEWER');

console.log('\nScenario: a name containing HTML-sensitive characters is stored raw — the .tip CSS renders via attr(), not innerHTML, so no injection risk here');
sandbox.document = makeDocument();
sandbox._setAccountIdentity('<script>x</script>', 'x@ox-glass.com', 'ADMIN', false);
check('data-tip carries the raw text (CSS attr() reads it as plain text, never as markup)',
  sandbox.document.els.acctBtn.getAttribute('data-tip') === '<script>x</script>\nADMIN');

console.log('\naccount tooltip: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
