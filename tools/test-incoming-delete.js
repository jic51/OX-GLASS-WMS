// The delete guard, running in a real browser.
//
// tools/test-incoming.js checks that the guard is WRITTEN. This checks that it
// WORKS — that a second press really never reaches the server, that the button
// really is unpressable while the first request is out, and that an "already
// gone" answer really ends as a green toast rather than a red one.
//
// That distinction is the whole reason this file exists: the defect Jose hit
// was not a missing line of code, it was a sequence of events in time — press,
// nothing visible happens, press again, error. Only a running page can be
// asked whether that sequence still produces an error.
//
// Usage:  node tools/test-incoming-delete.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), path = require('path'), os = require('os');
const SRC    = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const html = fs.readFileSync(SRC, 'utf8');

function slice(from, to, label){
  const a = html.indexOf(from);
  if (a === -1) throw new Error('not found: ' + (label || from));
  const b = html.indexOf(to, a);
  if (b === -1) throw new Error('end not found for: ' + (label || from));
  return html.slice(a, b);
}

// The real helpers and the real handler — a hand-written copy would only prove
// I can write one that passes.
const code = [
  slice('function _he(', '\n', '_he'),
  // Desde _btnHideSiblings, no desde _btnBusy: los ayudantes que esconden los
  // botones vecinos (v11.34) están ENCIMA de _btnBusy y _btnBusy los llama, así
  // que cortar desde _btnBusy construía una página que lanzaba
  // "_btnHideSiblings is not defined" en cuanto se pulsaba algo.
  //
  // Llevaba rota desde la v11.34 y no se vio porque las tandas de pruebas de
  // navegador se corrieron por lotes elegidos a mano, y a ésta le tocó antes
  // del cambio. Es el mismo corte que hubo que arreglar en test-button-states,
  // y la segunda vez que el mismo descuido pasa por dos sitios distintos.
  slice('function _btnHideSiblings(', '\nfunction showToast(', '_btnHideSiblings…_btnDone'),
  slice('function _doDeleteIncomingItem(', '// ── Read an email into expected deliveries', '_doDeleteIncomingItem')
].join('\n');

// Everything the handler touches that lives elsewhere in the app. Each stub
// RECORDS rather than pretends: the test's questions are all "how many times"
// and "in what order".
const harness = `
window.__calls = [];      // one entry per request that reached the server
window.__toasts = [];
window.__closed = 0;
window.__loads  = 0;
var __resolve = null;     // held open so the in-flight window can be inspected

function _h(o){ return o; }
function closeModal(){ window.__closed++; }
function showToast(msg, type){ window.__toasts.push({ msg: msg, type: type }); }
function loadDataFromGoogle(){ window.__loads++; }

var google = { script: { run: {
  withSuccessHandler: function(f){ this._ok = f; return this; },
  withFailureHandler: function(f){ this._err = f; return this; },
  processMovement: function(action, data){
    var self = this;
    window.__calls.push({ action: action, id: data.id });
    __resolve = function(kind, payload){
      if (kind === 'ok') self._ok({ status: 'success' });
      else self._err(payload);
    };
  }
} } };
function __answer(kind, payload){ var r = __resolve; __resolve = null; r(kind, payload); }
`;

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
 button{font:14px sans-serif;padding:.5rem 1rem}
 .btn-spin{display:inline-block;width:.9em;height:.9em;border:2px solid currentColor;border-top-color:transparent;border-radius:50%}
</style></head><body>
<button id="btnDeleteIncoming" class="btn btn-danger btn-sm">🗑 Delete</button>
<script>${harness}\n${code}</script></body></html>`;

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-incoming-delete.html');
  fs.writeFileSync(file, page);

  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('file://' + file);

  const fails = [];
  const check = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want))
      fails.push(`${name}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    else console.log('  ok   ' + name);
  };

  console.log('\n═══ Jose\'s exact sequence: press, nothing happens, press again ═══\n');

  // Press once, and hold the server's answer so the page stays mid-request —
  // which is precisely the window in which he pressed a second time.
  let r = await p.evaluate(() => {
    _doDeleteIncomingItem('INC-1781101614979');
    const b = document.getElementById('btnDeleteIncoming');
    return { calls: window.__calls.length, disabled: b.disabled,
             spin: b.innerHTML.indexOf('btn-spin') !== -1, label: b.textContent.trim() };
  });
  check('the first press reaches the server', r.calls, 1);
  check('the button is unpressable while it is out', r.disabled, true);
  check('and it SAYS so — the missing feedback that caused all of this', r.label, 'Deleting…');
  check('spinner shown', r.spin, true);

  r = await p.evaluate(() => {
    _doDeleteIncomingItem('INC-1781101614979');   // the second press
    return window.__calls.length;
  });
  check('the second press never reaches the server', r, 1);

  r = await p.evaluate(async () => {
    __answer('ok');
    await new Promise(res => setTimeout(res, 900));   // past the ✓ hold
    const b = document.getElementById('btnDeleteIncoming');
    return { closed: window.__closed, loads: window.__loads, toasts: window.__toasts,
             disabled: b.disabled, html: b.innerHTML };
  });
  check('the window closes once', r.closed, 1);
  check('the list reloads', r.loads, 1);
  check('a green confirmation, where there was silence before',
    r.toasts, [{ msg: 'Expected delivery deleted.', type: 'ok' }]);
  check('the button is usable again afterwards', r.disabled, false);
  check('...with its own label back', r.html, '🗑 Delete');

  console.log('\n═══ the row is already gone ═══\n');

  // Two people deleting the same delivery, or a retry after a dropped
  // connection. The end state is the one that was asked for.
  r = await p.evaluate(async () => {
    window.__calls = []; window.__toasts = []; window.__closed = 0; window.__loads = 0;
    _doDeleteIncomingItem('INC-1781101614979');
    __answer('err', new Error('Incoming item not found: INC-1781101614979 [ID: 590d96d1]'));
    await new Promise(res => setTimeout(res, 900));
    return { toasts: window.__toasts, closed: window.__closed,
             disabled: document.getElementById('btnDeleteIncoming').disabled };
  });
  check('no red error for a delete that worked',
    r.toasts, [{ msg: 'Expected delivery deleted.', type: 'ok' }]);
  check('the window still closes', r.closed, 1);
  check('the button is left usable', r.disabled, false);

  console.log('\n═══ a real failure still looks like a failure ═══\n');

  r = await p.evaluate(async () => {
    window.__calls = []; window.__toasts = []; window.__closed = 0;
    _doDeleteIncomingItem('INC-2');
    __answer('err', new Error('Admin only.'));
    await new Promise(res => setTimeout(res, 50));
    const b = document.getElementById('btnDeleteIncoming');
    return { toasts: window.__toasts, closed: window.__closed,
             disabled: b.disabled, html: b.innerHTML };
  });
  check('the error is shown', r.toasts, [{ msg: 'Error: Admin only.', type: 'err' }]);
  check('the window stays open so the row is still there to retry', r.closed, 0);
  check('the button is given back — a stuck spinner is its own bug', r.disabled, false);
  check('with its label restored', r.html, '🗑 Delete');

  // Some transports hand back a bare string. Reading .message off one gives
  // undefined, and "Error: undefined" teaches people to ignore toasts.
  r = await p.evaluate(async () => {
    window.__toasts = [];
    _doDeleteIncomingItem('INC-3');
    __answer('err', 'the server is unreachable');
    await new Promise(res => setTimeout(res, 50));
    return window.__toasts;
  });
  check('an error that is a plain string still reads properly',
    r, [{ msg: 'Error: the server is unreachable', type: 'err' }]);

  // And a retry after a real failure has to work — the guard must not have
  // latched the button shut.
  r = await p.evaluate(() => {
    window.__calls = [];
    _doDeleteIncomingItem('INC-3');
    return window.__calls.length;
  });
  check('a retry after a failure goes through', r, 1);

  await browser.close();
  if (errors.length) fails.push('page errors: ' + errors.join(' | '));
  if (fails.length){ console.error('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\nincoming delete: ok');
})();
