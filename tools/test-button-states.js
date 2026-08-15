// Runs the button busy/done helpers from Index_v3_fixed.html in a real browser.
//
// Same reason as tools/test-modal-shield.js: these helpers are pure runtime
// behaviour — timers, captured state, DOM writes — and no static check can see
// whether a button ever gets its label back. A button stuck saying "Saving…"
// after an error is invisible to node --check and obvious to a user.
//
// Usage:  node tools/test-button-states.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), path = require('path'), os = require('os');
const HTML   = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

function extract(file){
  const src = fs.readFileSync(file, 'utf8');
  const a = src.indexOf('function _btnBusy(');
  if (a === -1) throw new Error('_btnBusy not found');
  const b = src.indexOf('\n}', src.indexOf('function _btnDone(', a)) + 2;
  // _he() is the escaper the helpers use for the label. It is written on a
  // single line, so it ends at the newline, not at the next "\n}".
  const h = src.indexOf('function _he(');
  const hEnd = src.indexOf('\n', h);
  return src.slice(h, hEnd) + '\n' + src.slice(a, b);
}

const page = code => `<!doctype html><html><head><meta charset="utf-8"><style>
 button{font:14px sans-serif;padding:.5rem 1rem}
 .btn-spin{display:inline-block;width:.9em;height:.9em;border:2px solid currentColor;border-top-color:transparent;border-radius:50%}
</style></head><body>
<button id="save">Save to System</button>
<button id="wide">A much longer label than the busy one</button>
<script>${code}</script></body></html>`;

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-button-test.html');
  fs.writeFileSync(file, page(extract(HTML)));

  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage();
  await p.goto('file://' + file);

  const fails = [];
  const check = (name, got, want) => {
    if (got !== want) fails.push(`${name}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    else console.log('  ok   ' + name);
  };

  // Busy state
  let r = await p.evaluate(() => {
    const b = document.getElementById('save');
    const before = b.getBoundingClientRect().width;
    _btnBusy(b, 'Saving…');
    return { disabled: b.disabled, spin: b.innerHTML.indexOf('btn-spin') !== -1,
             label: b.textContent.trim(), busyClass: b.classList.contains('is-busy'),
             pinned: Math.abs(parseFloat(b.style.minWidth) - before) < 1 };
  });
  check('disabled while working', r.disabled, true);
  check('spinner shown',          r.spin, true);
  check('label replaced',         r.label, 'Saving…');
  check('is-busy class set',      r.busyClass, true);
  check('width pinned to its own', r.pinned, true);

  // A second _btnBusy must not swallow the real label — several call sites
  // still restore their button by hand, so this really can happen.
  r = await p.evaluate(() => {
    const b = document.getElementById('save');
    _btnBusy(b, 'Still saving…');
    _btnReset(b);
    return { html: b.innerHTML, disabled: b.disabled, minw: b.style.minWidth };
  });
  check('label survives a double busy', r.html, 'Save to System');
  check('re-enabled after reset',       r.disabled, false);
  check('width unpinned after reset',   r.minw, '');

  // Failure path
  r = await p.evaluate(() => {
    const b = document.getElementById('save');
    _btnBusy(b, 'Saving…');
    _btnDone(b, false);
    return { html: b.innerHTML, disabled: b.disabled, busy: b.classList.contains('is-busy') };
  });
  check('failure restores the label', r.html, 'Save to System');
  check('failure re-enables',         r.disabled, false);
  check('failure clears is-busy',     r.busy, false);

  // Success path: tick first, then the callback — never the other way round.
  await p.evaluate(() => {
    window.__order = [];
    const b = document.getElementById('wide');
    _btnBusy(b, 'Saving…');
    _btnDone(b, true, () => window.__order.push('then'));
    window.__tickSeen = b.innerHTML.indexOf('btn-tick') !== -1;
  });
  check('tick shown before the callback', await p.evaluate(() => window.__tickSeen), true);
  check('callback has not fired yet',     await p.evaluate(() => window.__order.length), 0);
  await wait(900);
  r = await p.evaluate(() => ({
    order: window.__order, html: document.getElementById('wide').innerHTML,
    disabled: document.getElementById('wide').disabled
  }));
  check('callback fired after the tick', r.order.join(','), 'then');
  check('long label restored intact',    r.html, 'A much longer label than the busy one');
  check('re-enabled after success',      r.disabled, false);

  // A missing button must not swallow the callback — that would leave a window
  // open for ever on any screen whose button id changed.
  check('null button still runs the callback',
    await p.evaluate(() => new Promise(res => _btnDone(null, true, () => res(true)))), true);

  await browser.close();
  if (fails.length){ console.error('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\nbutton states: ok');
})();
