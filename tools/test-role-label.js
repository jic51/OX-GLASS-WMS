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

// ── EVERY PLACE A ROLE REACHES A SCREEN ─────────────────────────────────────
// v11.29. The tests above prove _displayRole is correct. They never asked
// whether it is USED, and it was not: renderActiveUsers printed the raw role,
// so Jose's own account panel showed SUPERVISOR on the profile card and
// WAREHOUSE in the Active Users row immediately beneath it — same person, same
// panel, two lines apart. Four versions, nobody caught it, because the comment
// above _applyWarehouseRoleLabel asserted that everything else already went
// through _displayRole. A sentence cannot fail a build.
//
// So this half does not test behaviour. It counts render paths, which is the
// thing that was actually wrong.
console.log('\nScenario: no screen prints a raw role next to a relabelled one');
{
  // Line comments only — see tools/test-fractional-qty.js for why stripping
  // /* */ across this file is a good way to lose ten thousand lines.
  const code = src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');

  check('the presence list renders the role through _displayRole — THE BUG',
    /presence-role">'\s*\+\s*_he\(u\.role \? _displayRole\(u\.role\) : '—'\)/.test(code));
  check('...and no longer prints it raw',
    !/presence-role">'\s*\+\s*_he\(u\.role \|\| '—'\)/.test(code));

  check('the Manage Users table still goes through _roleBadge, which uses _displayRole',
    /_roleBadge\(u\.role\)/.test(code));
  check('the account tag still goes through _displayRole',
    /acct-tag[\s\S]{0,200}_displayRole\(role\)/.test(code));
  check('the tooltip still goes through _displayRole',
    /tipRole\s*=\s*role \? _displayRole\(role\)/.test(code));

  // The wizard is the ONE deliberate exception, and it has to stay one: it runs
  // before setup finishes, when no custom label exists yet and the global still
  // holds its default. Asserted so a future sweep does not "fix" it, and so
  // that if it ever DOES need the label the decision is made on purpose.
  check('the setup wizard still writes "Warehouse" literally — deliberate, it ' +
        'runs before any custom label exists',
    /<option value="WAREHOUSE"'\+\(u\.role==='WAREHOUSE'\?' selected':''\)\+'>Warehouse<\/option>/.test(code));

  // The catch-all. Any NEW place that puts a role into HTML without translating
  // it fails here by name, which is the only thing that would have caught the
  // original.
  const raw = [];
  const re = /_he\(\s*(?:u|user|m)\.role\s*(?:\|\||\))/g;
  let m;
  while ((m = re.exec(code))) raw.push('line ' + (code.slice(0, m.index).split('\n').length));
  check('no screen puts a role into HTML without _displayRole' +
        (raw.length ? ' — raw at ' + raw.join(', ') : ''), raw.length === 0);

  // And the comment that lied is gone.
  check('the stale "nothing else needs patching" claim has been removed from ' +
        'the source — it was true when written and false for four versions after',
    src.indexOf('so nothing else needs patching') === -1);
}

console.log('\nrole label: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
