// Verifies the customizable WAREHOUSE-role display label — _displayRole() and
// _roleBadge() — lifted VERBATIM out of Index_v3_fixed.html into a Node vm.
//
// WHY THIS ONE EARNS A REAL TEST, not just node --check: the one hard rule this
// feature must never break is that only the LABEL changes, never the stored
// role value ('WAREHOUSE' stays 'WAREHOUSE' everywhere role checks happen) —
// and that ADMIN/VIEWER are never affected by a WAREHOUSE-only label. A typo in
// the ternary (e.g. checking the wrong side) would silently rename the wrong
// role, or rename all three, and nothing about that trips a syntax check.
//
// Usage:  node tools/test-role-label.js [path/to/Index_v3_fixed.html]

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

function extractVar(name) {
  const a = src.indexOf('var ' + name + ' ');
  if (a === -1) throw new Error('var not found: ' + name);
  const b = src.indexOf(';', a);
  return src.slice(a, b + 1);
}

const sandbox = { console: console };
vm.createContext(sandbox);
vm.runInContext(
  extractFn('_he') + '\n' +
  extractFn('_displayRole') + '\n' +
  extractFn('_roleBadge'),
  sandbox
);

console.log('\nScenario: default label — behaves exactly as before this feature existed');
sandbox.warehouseRoleLabel = 'Warehouse';
check('ADMIN unaffected', sandbox._displayRole('ADMIN') === 'ADMIN');
check('VIEWER unaffected', sandbox._displayRole('VIEWER') === 'VIEWER');
check('WAREHOUSE shows the default label', sandbox._displayRole('WAREHOUSE') === 'Warehouse');

console.log('\nScenario: admin renames the role to "Supervisor"');
sandbox.warehouseRoleLabel = 'Supervisor';
check('ADMIN still shows as ADMIN, not renamed', sandbox._displayRole('ADMIN') === 'ADMIN');
check('VIEWER still shows as VIEWER, not renamed', sandbox._displayRole('VIEWER') === 'VIEWER');
check('WAREHOUSE now shows the custom label', sandbox._displayRole('WAREHOUSE') === 'Supervisor');
check('badge text uses the custom label', sandbox._roleBadge('WAREHOUSE').indexOf('Supervisor') !== -1);
check('badge keeps the warehouse CSS class regardless of the label text',
  sandbox._roleBadge('WAREHOUSE').indexOf('role-badge-warehouse') !== -1);
check('badge never leaks the literal internal value once relabeled',
  sandbox._roleBadge('WAREHOUSE').indexOf('>WAREHOUSE<') === -1);

console.log('\nScenario: a label containing HTML-sensitive characters cannot inject markup');
sandbox.warehouseRoleLabel = '<img src=x onerror=alert(1)>';
const badge = sandbox._roleBadge('WAREHOUSE');
check('angle brackets are escaped in the badge', badge.indexOf('<img') === -1);
check('escaped form is present instead', badge.indexOf('&lt;img') !== -1);

console.log('\nrole label: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
