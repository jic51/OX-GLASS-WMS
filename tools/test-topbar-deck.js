// Two runtime behaviours that no static check can see, both lifted out of
// Index_v3_fixed.html so they cannot drift from what ships.
//
// 1. THE PILE'S OPEN/CLOSE LOOP. Driving it from CSS :hover fed back into
//    itself — opening moves the geometry out from under the pointer, hover goes
//    false, it shuts, the pointer is over it again. That is the card "changing
//    size three times" on Jose's video. A test that only reads the source can
//    never see it; one that moves a mouse can.
// 2. THE TABS BEING CENTRED. "margin:0 auto" plus "margin-left:auto" makes
//    three auto margins share the free space, which parks the tabs a third of
//    the way along and LOOKS almost right. Only measuring catches it.
//
// Usage:  node tools/test-topbar-deck.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), path = require('path'), os = require('os');
const HTML   = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const src    = fs.readFileSync(HTML, 'utf8');

function slice(from, toMarker){
  const a = src.indexOf(from);
  if (a === -1) throw new Error('not found: ' + from);
  const b = src.indexOf(toMarker, a);
  if (b === -1) throw new Error('end not found for: ' + from);
  return src.slice(a, b);
}

const styles   = src.slice(src.indexOf('<style>') + 7, src.indexOf('</style>'));
const deckCode = slice('var _deckHover = false', '// Above the breakpoint');

const page = `<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head><body>
<div class="topbar">
  <div class="topbar-row1"><h1>OX Glass LLC.</h1></div>
  <div class="topbar-row2">
    <div class="nav">
      <button id="btn-dashboard" class="active">Stock Dashboard</button>
      <button>Movements &amp; History</button><button>Project View</button>
      <button>Warehouse Map</button><button>Incoming</button>
    </div>
    <div class="topbar-tools"><div class="tools-primary">
      <button class="conn-btn"></button><div class="acct-wrap"><button class="acct-btn">JC</button></div>
    </div></div>
  </div>
</div>
<div class="container" style="height:3000px">tall page</div>
<div class="deck" id="cornerDeck">
  <div class="deck-card sys-card" data-card-id="a">A</div>
  <div class="deck-card sys-card" data-card-id="b">B</div>
  <div class="deck-card sys-card" data-card-id="c">C</div>
</div>
<script>
function _cfgWake(){} function _cfgScheduleDim(){} var _CFG_REDIM_MS = 2000;
${deckCode}
</script></body></html>`;

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-topbar-deck.html');
  fs.writeFileSync(file, page);

  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('file://' + file);

  const fails = [];
  const check = (name, got, want) => {
    if (got !== want) fails.push(`${name}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    else console.log('  ok   ' + name);
  };

  // ── Tabs centred, on a wide window ──
  const centred = async () => p.evaluate(() => {
    const nav = document.querySelector('.topbar-row2 .nav').getBoundingClientRect();
    const row = document.querySelector('.topbar-row2').getBoundingClientRect();
    // How far the nav's centre sits from the row's centre, in px.
    return Math.abs((nav.left + nav.width / 2) - (row.left + row.width / 2));
  });
  check('tabs centred at 1440px (within 2px)', (await centred()) <= 2, true);

  await p.setViewportSize({ width: 1024, height: 800 });
  check('tabs centred at 1024px (within 2px)', (await centred()) <= 2, true);

  // Below the breakpoint the old flex layout is expected back, so the tabs are
  // deliberately NOT centred — asserting the layout switched, not that it broke.
  await p.setViewportSize({ width: 600, height: 800 });
  check('small screens keep the flex layout',
    await p.evaluate(() => getComputedStyle(document.querySelector('.topbar-row2')).display), 'flex');
  await p.setViewportSize({ width: 1440, height: 900 });

  // ── The pile ──
  const deck = await p.$('#cornerDeck');
  const state = () => p.evaluate(() => ({
    open:   document.getElementById('cornerDeck').classList.contains('open'),
    locked: document.documentElement.classList.contains('deck-open')
  }));

  check('closed at rest', (await state()).open, false);

  await deck.hover();
  await wait(60);
  let st = await state();
  check('hover opens the pile', st.open, true);
  check('page scroll locked while open', st.locked, true);

  // The loop-breaker: leave and come back inside the grace period. Under the
  // old :hover CSS this is exactly where it flickered shut and open again.
  await p.mouse.move(10, 10);
  await wait(90);
  await deck.hover();
  await wait(60);
  check('a momentary pointer slip does not close it', (await state()).open, true);

  // Leaving for real closes it, and gives the page back.
  await p.mouse.move(10, 10);
  await wait(450);
  st = await state();
  check('leaving closes it', st.open, false);
  check('scroll released on close', st.locked, false);

  // Click pins it open even with the pointer away.
  await deck.click({ position: { x: 5, y: 5 } });
  await p.mouse.move(10, 10);
  await wait(450);
  check('click pins it open', (await state()).open, true);

  await p.mouse.click(400, 400);
  await wait(80);
  check('clicking away unpins it', (await state()).open, false);

  // The exit: a leaving card must give its height back over time, not vanish.
  const eased = await p.evaluate(() => {
    const el = document.querySelector('[data-card-id="b"]');
    el.classList.add('leaving');
    const cs = getComputedStyle(el);
    return { hasTransition: cs.transitionProperty.indexOf('margin') !== -1,
             opacity: parseFloat(cs.opacity) };
  });
  check('a leaving card animates its margin', eased.hasTransition, true);
  check('a leaving card fades out',           eased.opacity < 1, true);

  await browser.close();
  if (fails.length){ console.error('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\ntopbar + deck: ok');
})();
