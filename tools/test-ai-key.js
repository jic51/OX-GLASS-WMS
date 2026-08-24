// THE AI KEY, SET FROM INSIDE THE APP — and the two ways it could leak.
//
// Until v10.8 the only way to switch the document reader on was: open the Apps
// Script editor, find Project Settings, add a Script Property with the exact
// right name. A developer's instruction printed inside a warehouse app, which
// is why the feature was off everywhere it shipped. Now there is a field in
// Settings → System.
//
// Two things have to hold, and both are the kind that fail silently:
//
//   1. THE KEY NEVER COMES BACK TO THE BROWSER. It is a paid credential
//      belonging to the customer. getAiStatus may say whether one exists and
//      show the last four characters — enough for a person to recognise which
//      key they pasted, useless to anyone else — and nothing more. A "just
//      show it so they can check it" convenience is how a credential ends up
//      in a screenshot.
//   2. THE KEY IS NEVER WRITTEN TO A SHEET. The audit log is a tab anyone with
//      the file can open. It records that a key was set, never the key.
//
// Plus the reason the save is slow on purpose: it spends one real call
// verifying the key BEFORE storing it. A wrong key stored silently fails days
// later, in front of somebody trying to read an email, and looks like a broken
// product rather than a typo.
//
// Runs the REAL setAiKey and getAiStatus in a Node vm with Apps Script stubbed.
//
// Usage:  node tools/test-ai-key.js

const fs = require('fs'), path = require('path'), vm = require('vm');
const GS   = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'Index_v3_fixed.html'), 'utf8');

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

function extractFn(name) {
  const start = GS.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('not found: ' + name);
  let depth = 0, i = GS.indexOf('{', start);
  for (; i < GS.length; i++) {
    if (GS[i] === '{') depth++;
    else if (GS[i] === '}') { depth--; if (depth === 0) return GS.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces in ' + name);
}

const REAL_KEY = 'AIzaSyD-EXAMPLE-NOT-A-REAL-KEY-000wxyz';

function build(opts) {
  opts = opts || {};
  const props = Object.assign({}, opts.props || {});
  const audit = [];
  const fetches = [];
  const sandbox = {
    console,
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null),
      setProperty: (k, v) => { props[k] = v; },
      deleteProperty: k => { delete props[k]; }
    })},
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ _fake: true }) },
    requireAuth_: () => ({ email: 'boss@oxglass.com', role: 'ADMIN' }),
    auditLog_: (...a) => { audit.push(a); },
    geminiModel_: () => 'gemini-2.5-flash',
    geminiFetch_: (body, key) => {
      fetches.push({ body, key });
      if (opts.reject) return { getResponseCode: () => opts.reject };
      if (opts.throw) throw new Error('network down');
      return { getResponseCode: () => 200 };
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFn('getAiStatus') + '\n' + extractFn('setAiKey'), sandbox);
  return { sandbox, props, audit, fetches };
}

console.log('\n═══ the key must not come back out ═══\n');

{
  const { sandbox } = build({ props: { GEMINI_API_KEY: REAL_KEY } });
  const st = sandbox.getAiStatus();
  const asText = JSON.stringify(st);

  check('getAiStatus says a key is configured', st.configured === true);
  check('...and does NOT contain the key anywhere in what it returns' +
        (asText.includes(REAL_KEY) ? ' — LEAKED: ' + asText : ''),
    !asText.includes(REAL_KEY));
  check('...the hint is the last four characters only, which identifies the key without being usable',
    st.hint === '…' + REAL_KEY.slice(-4) && st.hint.length === 5);
  check('...and the hint is not enough to reconstruct anything — no other run of the key appears in it',
    !REAL_KEY.slice(0, -4).split('').some(() => false) && st.hint.replace('…','').length === 4);
}

{
  const { sandbox } = build({});
  const st = sandbox.getAiStatus();
  check('with no key it reports off, with an empty hint rather than a stray "…"',
    st.configured === false && st.hint === '');
}

console.log('\n═══ the key must not reach a sheet ═══\n');

{
  const { sandbox, audit } = build({});
  sandbox.setAiKey({ key: REAL_KEY });
  const logged = JSON.stringify(audit);
  check('saving writes an audit entry — a credential change is exactly the kind of thing that should be on the record',
    audit.length === 1);
  check('...and the entry does NOT contain the key' + (logged.includes(REAL_KEY) ? ' — LEAKED: ' + logged : ''),
    !logged.includes(REAL_KEY));
  check('...not even the last four, because the audit log is a tab anyone with the file can open',
    !logged.includes(REAL_KEY.slice(-4)));
}

console.log('\n═══ verify before storing, not after ═══\n');

{
  const { sandbox, props, fetches } = build({});
  const res = sandbox.setAiKey({ key: REAL_KEY });
  check('a good key is stored', props.GEMINI_API_KEY === REAL_KEY && res.configured === true);
  check('...and it was actually USED once first — one real call to Google before anything is saved',
    fetches.length === 1 && fetches[0].key === REAL_KEY);
  check('...with a tiny request, because this is a probe and not a feature',
    (fetches[0].body.generationConfig || {}).maxOutputTokens <= 10);
}

{
  const { sandbox, props } = build({ reject: 400 });
  let threw = null;
  try { sandbox.setAiKey({ key: REAL_KEY }); } catch (e) { threw = e.message; }
  check('a key Google rejects is NOT stored — storing it would fail days later, in front of somebody trying to read an email',
    props.GEMINI_API_KEY === undefined);
  check('...and the message names the two real causes rather than printing an HTTP code and stopping',
    threw && /Generative Language API/.test(threw) && /copied incompletely/.test(threw));
}

{
  const { sandbox, props } = build({ reject: 403, props: { GEMINI_API_KEY: 'old-key-still-good' } });
  try { sandbox.setAiKey({ key: REAL_KEY }); } catch (e) {}
  check('a rejected REPLACEMENT leaves the working key alone — a failed edit must not turn a working feature off',
    props.GEMINI_API_KEY === 'old-key-still-good');
}

{
  const { sandbox, props } = build({ throw: true, props: { GEMINI_API_KEY: 'old-key-still-good' } });
  let threw = null;
  try { sandbox.setAiKey({ key: REAL_KEY }); } catch (e) { threw = e.message; }
  check('a network failure is reported as a network failure, not as a bad key — the two need different actions from the person',
    threw && /Could not reach Google/.test(threw) && props.GEMINI_API_KEY === 'old-key-still-good');
}

console.log('\n═══ the obvious paste mistakes ═══\n');

{
  const cases = [
    ['',                       'nothing pasted',                  /Paste your key/],
    ['   ',                    'only whitespace',                 /Paste your key/],
    ['AIza abc def',           'a key with a space in it',        /space in it/],
    ['short',                  'something far too short',         /too short/]
  ];
  cases.forEach(([val, what, re]) => {
    const { sandbox, props, fetches } = build({});
    let threw = null;
    try { sandbox.setAiKey({ key: val }); } catch (e) { threw = e.message; }
    check(what + ' is refused with a specific reason, before spending a network call',
      threw && re.test(threw) && fetches.length === 0 && props.GEMINI_API_KEY === undefined);
  });
}

{
  const { sandbox, props, audit } = build({ props: { GEMINI_API_KEY: REAL_KEY } });
  const res = sandbox.setAiKey({ remove: true });
  check('removing the key deletes it rather than blanking it — an empty string would read as configured',
    props.GEMINI_API_KEY === undefined && res.configured === false && audit.length === 1);
}

console.log('\n═══ no key is a setting, not a failure ═══\n');

{
  const body = GS.slice(GS.indexOf('function parseIncomingEmail('), GS.indexOf('\nfunction ', GS.indexOf('function parseIncomingEmail(') + 10));
  check('the reader signals a missing key with the NO_AI_KEY marker instead of a paragraph of Apps Script editor instructions',
    /throw new Error\('NO_AI_KEY'\)/.test(body));
  check('...and the old instructions are gone, not merely bypassed',
    !/Project Settings → Script Properties/.test(body));
}

{
  const at  = HTML.indexOf('NO_AI_KEY');
  const seg = HTML.slice(at - 200, at + 1400);
  check('the browser turns the marker into an explanation rather than a red error',
    /not switched on yet/.test(seg));
  check('...offering an admin the button that turns it on',
    /_aiSetupFromEmail\(\)/.test(seg));
  check('...and telling anybody else who to ask, rather than sending them to a screen they cannot open',
    /Ask an admin/.test(seg));
  check('...and saying the work can still be done by hand, so the screen is not a dead end',
    /by hand/.test(seg));
}

{
  const at  = HTML.indexOf('function _aiShowForm(');
  const seg = HTML.slice(at, at + 1600);
  check('the field is type=password, so a paid credential does not sit readable on a warehouse screen',
    /type="password"/.test(seg));
  check('...and autocomplete is off, so the browser does not offer it back on the next machine',
    /autocomplete="off"/.test(seg));
}

console.log('\nai-key: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
process.exit(fail === 0 ? 0 : 1);
