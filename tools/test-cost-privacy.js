// COST PRIVACY — the permission that was only a preference.
//
// Finding 2 of the v11.26 audit, and the one with a signature on it: the
// published feature page tells a customer that the warehouse role does not see
// what things cost unless an admin turns it on. So this was not only a leak.
// It was a leak of the thing they were told they were buying.
//
// WHAT WAS ACTUALLY HAPPENING
//
// parseArchiveRow always fills unitCost and totalCost. config.avgCost carries
// the running average for every material. Both went out with getInitialData,
// to every role, on every load. _canSeeCosts() then hid them — in the browser.
// Which means it hid them from the SCREEN, not from the person: the numbers
// were already in the page, and one line in a console printed the lot.
//
// A permission enforced by the code that draws the pixels is not a permission.
// It is a preference.
//
// WHAT THIS FILE GUARDS
//
// Three things, and the third is the one that will matter in a year:
//
//   1. The server strips. Both doors — the first load and "Load older
//      history" — because stripping only the one you found first moves a leak
//      rather than closing it.
//   2. The two halves AGREE. canSeeCosts_() on the server and _canSeeCosts()
//      in the browser are the same rule written twice, in two languages, in
//      two files. Both are run here, over every role and both toggle states,
//      and compared. If they ever drift the failure is silent in the worse
//      direction — the server sends what the page then declines to show, which
//      looks perfect from outside and is exactly the bug being fixed.
//   3. No THIRD door opens later. Every caller of parseArchiveRow that returns
//      its objects to the browser has to strip or be named here.
//
// Usage:  node tools/test-cost-privacy.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const GS   = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}
function extractFn(src, name) {
  const start = src.indexOf('\nfunction ' + name + '(');
  if (start === -1) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) { j++; break; } }
  }
  return src.slice(start + 1, j);
}
// Line comments only — see tools/test-fractional-qty.js for why stripping
// /* */ across these two files is a good way to lose ten thousand lines.
function codeOnly(src) {
  return src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
}

// ── The two halves, both real, side by side ─────────────────────────────────
// Server: canSeeCosts_(auth), reading the stored toggle via rolePerms_().
const server = vm.createContext({ console: console });
vm.runInContext(extractFn(GS, 'canSeeCosts_'), server);
server.rolePerms_ = function () { return { canSeeCosts: server.__toggle }; };

// Browser: _canSeeCosts(), reading the globals the page holds.
const browser = vm.createContext({ console: console });
vm.runInContext(extractFn(HTML, '_canSeeCosts'), browser);

function askServer(role, toggle) {
  server.__toggle = toggle;
  return vm.runInContext('canSeeCosts_', server)({ role: role, email: 'x@y.z' });
}
function askBrowser(role, toggle) {
  browser.userRole  = role;
  browser.rolePerms = { canSeeCosts: toggle };
  return vm.runInContext('_canSeeCosts', browser)();
}

console.log('\n═══ who may see money, and does the server agree with the page ═══\n');
[
  ['ADMIN',     false, true,  'an admin always can, toggle or no toggle — the toggle is theirs to flip'],
  ['ADMIN',     true,  true,  'still yes'],
  ['WAREHOUSE', false, false, 'THE ONE THAT IS SOLD: off by default, and off means not sent'],
  ['WAREHOUSE', true,  true,  'an admin turned it on for the warehouse role, so it is sent'],
  ['VIEWER',    false, false, 'never'],
  ['VIEWER',    true,  false, 'NOT EVEN WITH THE TOGGLE ON — it only ever widens WAREHOUSE'],
  ['DENIED',    true,  false, 'not a role that gets data at all'],
  ['NO_SESSION',true,  false, 'nobody']
].forEach(([role, toggle, want, why]) => {
  const s = askServer(role, toggle), b = askBrowser(role, toggle);
  check(role + (toggle ? ' + toggle on ' : ' + toggle off') + ' → ' + want + '  · ' + why, s === want);
  check('   ...and the browser says the same, so the two cannot drift', b === s);
});
check('a missing auth object is refused rather than throwing',
  vm.runInContext('canSeeCosts_', server)(null) === false &&
  vm.runInContext('canSeeCosts_', server)({}) === false);

// ── Door 1: the first load ──────────────────────────────────────────────────
console.log('\n═══ door 1 — getInitialData ═══\n');
{
  const body = extractFn(GS, 'getInitialData');
  const code = codeOnly(body);
  check('it asks the server-side question, not the browser one',
    /if\s*\(\s*!canSeeCosts_\(\s*auth\s*\)\s*\)/.test(code));
  check('...and blanks unitCost on every movement before returning',
    /movements\[ci\]\.unitCost\s*=\s*null/.test(code));
  check('...and totalCost with it', /movements\[ci\]\.totalCost\s*=\s*null/.test(code));
  check('...and empties config.avgCost, which carries the running average for ' +
        'every material and would give the whole picture on its own',
    /config\.avgCost\s*=\s*\{\}/.test(code));
  // Anchored on a field that appears ONLY in the full payload. Two earlier
  // anchors were wrong for the same reason and both failed on correct code:
  // the function opens with early returns for NO_SESSION and DENIED, and those
  // carry `serverVersion` too — but no movements, no config, and nothing to
  // strip. `columnPrefs` appears once, in the payload that actually has data.
  check('the strip happens BEFORE the payload carrying the data is assembled',
    code.indexOf('canSeeCosts_(') < code.indexOf('columnPrefs:'));
}

// ── Door 2: load older history ──────────────────────────────────────────────
console.log('\n═══ door 2 — loadOlderHistory ═══\n');
{
  const body = codeOnly(extractFn(GS, 'loadOlderHistory'));
  check('it returns the same movement objects from the other sheet — which is ' +
        'why stripping only door 1 would have moved the leak, not closed it',
    /parseArchiveRow\(/.test(body));
  check('it asks the same question', /canSeeCosts_\(\s*auth\s*\)/.test(body));
  check('...and strips both fields', /m\.unitCost\s*=\s*null/.test(body) && /m\.totalCost\s*=\s*null/.test(body));
  check('...and it really is reachable by a VIEWER — requireAuth_ with no ' +
        'minimum role — which is what makes this door matter',
    /requireAuth_\(\s*\)/.test(body));
}

// ── No third door ───────────────────────────────────────────────────────────
console.log('\n═══ no third door ═══\n');
{
  const code = codeOnly(GS);
  const LINES = code.split('\n');
  const FUNCS = [];
  LINES.forEach((l, i) => {
    const m = /^function ([A-Za-z0-9_]+)\s*\(/.exec(l);
    if (m) FUNCS.push({ start: i + 1, name: m[1] });
  });
  function bodyOf(name) {
    const i = FUNCS.findIndex(f => f.name === name);
    if (i === -1) return '';
    const end = i + 1 < FUNCS.length ? FUNCS[i + 1].start - 1 : LINES.length;
    return LINES.slice(FUNCS[i].start - 1, end).join('\n');
  }
  // Anything that calls parseArchiveRow is holding objects with costs in them.
  const holders = FUNCS.map(f => f.name)
    .filter(n => n !== 'parseArchiveRow' && /\bparseArchiveRow\s*\(/.test(bodyOf(n)));
  check('the parseArchiveRow callers were found (' + holders.join(', ') + ')', holders.length >= 2);

  // Internal ones never reach the browser; they rebuild sheets. Named, not
  // guessed, so adding a third caller forces a decision instead of passing.
  const INTERNAL = {
    refreshDerivedSheets_: 'rewrites LIVE_STOCK / SITE_STOCK / WASTED_STOCK inside the ' +
                           'lock; the objects never leave the server'
  };
  // Two ways of being safe, not one.
  //
  // This used to accept only canSeeCosts_ — the CONDITIONAL strip, which asks
  // the role and blanks the costs for whoever must not see them. That is the
  // right shape for the screens, where an admin does need the numbers.
  //
  // Then dailyReportMovements_ arrived and this failed on it, on code that was
  // already safe: the daily report has no use for costs at all, so it blanks
  // them for EVERY caller, unconditionally. That is strictly stronger than
  // asking the role — there is no branch that can be got wrong later — and the
  // guard was calling it a leak because it recognised one spelling of safety.
  //
  // A guard that only accepts the weaker of two protections pushes the next
  // author toward the weaker one. So both are accepted, and the unconditional
  // form has to blank BOTH fields to count: blanking unitCost and forgetting
  // totalCost still puts the money in the payload.
  const stripsAlways = n => {
    const b = bodyOf(n);
    return /\.unitCost\s*=\s*null/.test(b) && /\.totalCost\s*=\s*null/.test(b);
  };
  const leaky = holders.filter(n =>
    !INTERNAL[n] && !/canSeeCosts_\(/.test(bodyOf(n)) && !stripsAlways(n));
  check('every caller that can return these objects to a browser strips them — ' +
        'by role, or unconditionally' +
        (leaky.length ? ' — NOT stripping: ' + leaky.join(', ') : ''),
    leaky.length === 0);
  const staleInternal = Object.keys(INTERNAL).filter(n => holders.indexOf(n) === -1);
  check('the internal-only list has no stale entries' +
        (staleInternal.length ? ' — remove: ' + staleInternal.join(', ') : ''),
    staleInternal.length === 0);
}

// ── The roster nobody was reading ───────────────────────────────────────────
console.log('\n═══ the colleague list that went to everyone ═══\n');
// Found while fixing the above. loadConfig() returns CONFIG whole, and that
// includes `users` — every colleague's email with their role beside it — plus
// `adminEmail`. Sent to every role on every load, VIEWER included, in service
// of no feature: nothing in the front end reads either one. The real user list
// arrives separately and only for ADMIN.
{
  const init = codeOnly(extractFn(GS, 'getInitialData'));
  check('the legacy user roster is emptied for anyone who is not an ADMIN',
    /auth\.role\s*!==\s*'ADMIN'/.test(init) && /config\.users\s*=\s*\[\]/.test(init));
  check('...and the owner address goes with it', /delete config\.adminEmail/.test(init));
  check('the front end never read either one, so nothing on screen changes' +
        ' — which is what made this pure exposure',
    !/config\.users/.test(codeOnly(HTML)) && !/config\.adminEmail/.test(codeOnly(HTML)));
  check('the ADMIN-only user list is still built the way it always was',
    /if\s*\(auth\.role === 'ADMIN'\)/.test(init) && /getUsers\(auth\)/.test(init));
}

// ── The promise this keeps ──────────────────────────────────────────────────
console.log('\n═══ the published promise ═══\n');
{
  const overview = path.join(__dirname, '..', 'landing', 'acopio-overview.html');
  if (fs.existsSync(overview)) {
    const src = fs.readFileSync(overview, 'utf8');
    check('the feature page does promise cost visibility is a permission — ' +
          'this is why finding 2 outranked the rest',
      /cost/i.test(src) && /(permission|role|admin)/i.test(src));
  } else {
    check('landing/acopio-overview.html is where the promise lives', false);
  }
}

console.log('\n' + '─'.repeat(72));
console.log('This proves the server no longer SENDS what a role may not see.');
console.log('Confirm it once on the deployed copy the only way that is real:');
console.log('sign in as a WAREHOUSE user with the toggle off, and check that');
console.log('unitCost is null in the payload, not merely absent from the page.');
console.log('─'.repeat(72));

console.log('\ncost privacy: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
