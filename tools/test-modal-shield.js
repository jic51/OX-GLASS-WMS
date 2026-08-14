// Runs the window shield from Index_v3_fixed.html in a real browser and checks
// it behaves.
//
// WHY THIS EXISTS: v9.63 shipped a shield that put a class on the very elements
// its own MutationObserver was watching. Each pass rewrote the class attribute,
// which woke the observer, which ran the pass again — a microtask loop that
// never yields, so nothing painted and the app sat on a blank loading screen.
//
// Nothing we had could see it. `node --check` parses; it does not run.
// check-refs.py finds calls to functions nobody defined; every function here
// existed. The code was valid and simply never stopped. The only thing that
// catches that is executing it, so this does.
//
// Usage:  node tools/test-modal-shield.js [path/to/Index_v3_fixed.html]
// Needs:  npm install playwright   (Chromium is already on the machine)

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const HTML = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// Pull the shield out of the real file, so this tests what ships — not a copy
// that can drift away from it.
function extractShield(file){
  const src = fs.readFileSync(file, 'utf8');
  const a = src.indexOf('var _SHIELD_SEL');
  if (a === -1) throw new Error('_SHIELD_SEL not found in ' + file);
  const b = src.indexOf('\n}', src.indexOf('function _initModalShield', a)) + 2;
  return src.slice(a, b);
}

// A stand-in for the app: the same body layout (overlays as direct children of
// <body>, at the same z-indexes), and nothing else. The shield only ever looks
// at body children and the class "show", so this is the whole surface it
// touches.
function buildPage(shield){
  return `<!doctype html><html><head><meta charset="utf-8"><style>
 .overlay{display:none;position:fixed;inset:0;z-index:550}       .overlay.show{display:flex}
 .cconfirm-overlay{display:none;position:fixed;inset:0;z-index:1100} .cconfirm-overlay.show{display:flex}
 .wiz-overlay{display:none;position:fixed;inset:0;z-index:2000}  .wiz-overlay.show{display:block}
 .media-preview-overlay{display:none;position:fixed;inset:0;z-index:1200} .media-preview-overlay.show{display:flex}
 .morning-overlay{position:fixed;inset:0;z-index:2000;pointer-events:none} .morning-overlay.show{pointer-events:all}
 html.modal-open{overflow:hidden}  .app-inert{pointer-events:none}
</style></head><body>
<div id="appSplash" class="app-splash">loading</div>
<div class="topbar"><button id="bgBtn">background</button></div>
<div id="toastContainer"></div>
<div class="overlay" id="legalOverlay"><div class="modal"></div></div>
<div class="overlay" id="usersOverlay"><div class="modal"></div></div>
<div class="container"><input id="bgInput"></div>
<div class="overlay" id="moveOverlay"><div class="modal"><input id="moveInput"></div></div>
<div class="overlay" id="settingsOverlay"><div class="modal"><input id="setInput"></div></div>
<div class="cconfirm-overlay" id="confirmOverlay"></div>
<div class="cconfirm-overlay" id="promptOverlay"></div>
<div class="media-preview-overlay" id="mediaPreviewOverlay"></div>
<div class="morning-overlay" id="morningOverlay"></div>
<div class="wiz-overlay" id="wizOverlay"></div>
<script>
window.__syncCount = 0;
function closeModal(id){ document.getElementById(id).classList.remove('show'); }
function closeMediaPreview(){ closeModal('mediaPreviewOverlay'); }
function closeMorningPopup(){ closeModal('morningOverlay'); }
function _confirmCancel(){ closeModal('confirmOverlay'); }
function _promptCancel(){ closeModal('promptOverlay'); }
${shield}
// Counting wrapper with a hard stop. Without the stop a looping build would
// hang this test exactly the way it hangs the app, and report nothing.
var _origSync = _syncModalShield;
_syncModalShield = function(){
  if (++window.__syncCount > 200) throw new Error('runaway shield');
  return _origSync.apply(this, arguments);
};
document.addEventListener('DOMContentLoaded', function(){
  _initModalShield();
  window.__ready = true;
});
</script></body></html>`;
}

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.error('playwright is not installed — run: npm install playwright'); process.exit(2); }

  const file = path.join(os.tmpdir(), 'acopio-shield-test.html');
  fs.writeFileSync(file, buildPage(extractShield(HTML)));

  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  await page.goto('file://' + file);
  await page.waitForFunction('window.__ready === true', null, { timeout: 5000 });

  const fails = [];
  const check = (name, got, want) => {
    if (got !== want) fails.push(`${name}: expected ${want}, got ${got}`);
    else console.log('  ok   ' + name);
  };

  // 1. The loop. One call at startup and no more — this is the v9.63 bug.
  await wait(150);
  check('one sync at startup (no observer loop)', await page.evaluate(() => window.__syncCount), 1);

  const st = () => page.evaluate(() => ({
    bg:       document.querySelector('.container').hasAttribute('inert'),
    move:     document.getElementById('moveOverlay').hasAttribute('inert'),
    settings: document.getElementById('settingsOverlay').hasAttribute('inert'),
    toast:    document.getElementById('toastContainer').hasAttribute('inert'),
    locked:   document.documentElement.classList.contains('modal-open'),
    syncs:    window.__syncCount
  }));
  const set = (id, on) => page.evaluate(([i, o]) => {
    document.getElementById(i).classList[o ? 'add' : 'remove']('show');
  }, [id, on]);

  // 2. One window open: the app behind is frozen, the window itself is not.
  await set('moveOverlay', true); await wait(120);
  let s = await st();
  check('background inert while a window is open', s.bg, true);
  check('the open window stays live',              s.move, false);
  check('page scroll locked',                      s.locked, true);
  check('toasts never blocked',                    s.toast, false);

  // 3. Stacking. Settings over the movement form, then back — the case that
  //    broke on the first attempt at the fix: the new front window kept the
  //    inert it had been given while it was behind.
  await set('settingsOverlay', true); await wait(120);
  s = await st();
  check('form behind Settings is frozen',      s.move, true);
  check('Settings itself is live',             s.settings, false);

  await set('settingsOverlay', false); await wait(120);
  s = await st();
  check('form comes back when Settings closes', s.move, false);

  // 4. Everything closed: nothing left frozen.
  await set('moveOverlay', false); await wait(120);
  s = await st();
  check('background released',  s.bg, false);
  check('scroll released',      s.locked, false);

  // 5. Cost. Five state changes, five syncs — not five hundred.
  check('one sync per state change', s.syncs <= 8, true);

  await browser.close();
  if (fails.length){ console.error('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('\nmodal shield: ok');
})();
