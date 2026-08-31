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
  // Starts at _btnHideSiblings, not at _btnBusy: the sibling helpers sit above
  // _btnBusy and _btnBusy calls them, so slicing from _btnBusy built a page that
  // threw "_btnHideSiblings is not defined" the moment a button was pressed.
  // Failing loudly instead of falling back to the old start — a fallback would
  // quietly test a version of these helpers that nobody ships.
  const a = src.indexOf('function _btnHideSiblings(');
  if (a === -1) throw new Error('_btnHideSiblings not found');
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

<!-- A button ROW, which is the shape Jose reported: press one, the others stay
     pressable while it works. "keep" starts disabled on purpose — that is the
     merge case, where one button correctly disables itself and must not come
     back enabled just because a neighbour finished. -->
<div id="row">
  <button id="go">Merge into selected</button>
  <button id="skip">Not duplicates</button>
  <button id="keep" disabled>Already off</button>
  <button id="stay" data-stay-visible>Close</button>
  <span id="hint">not a button</span>
</div>
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

  // ── The other buttons in the row ────────────────────────────────────────
  // Jose (v11.32): press one of a pair and the other stays pressable while the
  // first one works. He chose (2026-08-31) that they disappear.
  console.log('\n  — the rest of the row —');

  const q = sel => p.evaluate(s => {
    const e = document.querySelector(s);
    return { vis: getComputedStyle(e).visibility, dis: e.disabled };
  }, sel);

  // Isolated first: what does HIDING alone do to the layout? Measured around
  // _btnHideSiblings by itself, not around _btnBusy.
  //
  // The first version of this measured across _btnBusy and failed — because
  // _btnBusy swaps the pressed button's label for a spinner, and that changes
  // the row's height on its own. True, pre-existing, and nothing to do with the
  // claim being made here. An assertion that fails for a reason other than the
  // one it names is worse than no assertion: it gets "fixed" by loosening it.
  check('hiding the neighbours does not move the row', await p.evaluate(() => {
    const row = document.getElementById('row');
    const before = row.getBoundingClientRect().height;
    _btnHideSiblings(document.getElementById('go'));
    const during = row.getBoundingClientRect().height;
    _btnShowSiblings(document.getElementById('go'));
    return before === during;
  }), true);

  await p.evaluate(() => {
    window.__skipBox = document.getElementById('skip').getBoundingClientRect().width;
    _btnBusy(document.getElementById('go'), 'Merging…');
  });

  let s = await q('#skip');
  check('the neighbour is hidden while the pressed button works', s.vis, 'hidden');
  check('...and cannot be pressed either', s.dis, true);
  check('the pressed button itself stays visible',
    (await q('#go')).vis, 'visible');
  check('a button marked data-stay-visible is left alone',
    (await q('#stay')).vis, 'visible');
  check('something that is not a button is untouched',
    (await p.evaluate(() => getComputedStyle(document.getElementById('hint')).visibility)), 'visible');

  // visibility:hidden, not display:none and not removing the node — the space
  // has to stay, or the card shrinks while the work runs, grows back when it
  // finishes, and the list underneath jumps twice.
  check('the hidden button still occupies its width', await p.evaluate(() =>
    document.getElementById('skip').getBoundingClientRect().width === window.__skipBox), true);

  await p.evaluate(() => _btnReset(document.getElementById('go')));
  s = await q('#skip');
  check('the neighbour comes back after the reset', s.vis, 'visible');
  check('...and pressable', s.dis, false);

  // The original merge report: "Merge into selected" disables itself on purpose
  // and must NOT be handed back enabled by a neighbour finishing.
  check('a button that was already disabled for its own reason stays disabled',
    (await q('#keep')).dis, true);
  check('...and is visible again all the same', (await q('#keep')).vis, 'visible');

  // _btnDone is the other way out of the busy state, and it took a separate
  // path to _btnReset — worth proving it also gives the row back.
  await p.evaluate(() => new Promise(res => {
    _btnBusy(document.getElementById('go'), 'Merging…');
    _btnDone(document.getElementById('go'), true, res);
  }));
  check('_btnDone gives the row back too', (await q('#skip')).vis, 'visible');

  await browser.close();
  if (fails.length){ console.error('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\nbutton states: ok');
})();
