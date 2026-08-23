// ⚠️ READ THIS BEFORE TRUSTING THIS FILE.
//
// What it checks: that _setFavicon / applyCompanyBranding correctly rewrite
// the `<link rel="icon">` inside the PAGE'S OWN DOM.
//
// What it does NOT check, and cannot: whether the browser tab actually
// changes. It does not, and this test passing is what hid that for weeks.
// Jose ran two real installations and both kept Apps Script's generic icon
// the whole time.
//
// The reason: this test loads Index as a TOP-LEVEL file:// document, where a
// link tag naturally owns the tab. In production Index renders inside Apps
// Script's sandboxed IFRAME on googleusercontent.com, and the tab takes its
// icon from the top-level document — Google's, not ours. Nothing the page
// does to its own <head> can reach it.
//
// The real tab icon is set server-side in doGet via setFaviconUrl (v9.98),
// from the FAVICON_URL Script Property. That path CANNOT be tested from
// here — it needs a live deployment — so it is verified by opening a
// deployed app and looking at the tab, and nothing in this file should be
// read as evidence about it.
//
// The in-page swap is kept because it is correct for the one case where the
// page IS the top-level document, and because it costs nothing.
//
// The lesson worth keeping: a test that asserts the mechanism proves the
// mechanism, not the outcome. This one said "favicon becomes the company
// logo" when what it had established was "the href attribute changed".
//
// Usage:  node tools/test-favicon.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

const stub = `<script>
window.google=window.google||{}; window.google.charts=window.google.charts||{load:function(){},setOnLoadCallback:function(){}};
Object.assign(window.google,{script:{run:new Proxy({},{get(t,k){
  return function(){
    if(k==='withSuccessHandler'){ t._ok=arguments[0]; return window.google.script.run; }
    if(k==='withFailureHandler'){ return window.google.script.run; }
    var ok=t._ok;
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok({accessStatus:'NO_SESSION', userEmail:'', userRole:'NO_SESSION', serverVersion:'test', company:{}, oauthClientId:'', oauthRedirectUri:''}); },20); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-favicon.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(300);

  console.log('\nScenario: the page carries its own icon link from first paint');
  const defaultHref = await page.evaluate(() => document.getElementById('appFavicon').href);
  check('the page\'s own <link rel=icon> exists (NOT the browser tab — see the header)', !!defaultHref);
  check('it is the Acopio SVG mark (own data: URI, not an external/blank icon)',
    defaultHref.indexOf('data:image/svg+xml') === 0 && defaultHref.indexOf('1B2A4A') !== -1);
  check('APP_FAVICON_DEFAULT captured the same href for later restoring', await page.evaluate(() =>
    window.APP_FAVICON_DEFAULT === document.getElementById('appFavicon').href));

  console.log('\nScenario: uploading a company logo swaps that link to it — no second upload needed');
  await page.evaluate(() => {
    window._fetchPrivateFile = function (id, done) { done('data:image/png;base64,ZmFrZS1sb2dv'); };
    window.applyCompanyBranding({ name: 'OX Glass LLC.', logoId: 'file-123' });
  });
  await page.waitForTimeout(50);
  check('the page\'s link href becomes the company logo (tab icon is a separate, server-side path)', await page.evaluate(() =>
    document.getElementById('appFavicon').href) === 'data:image/png;base64,ZmFrZS1sb2dv');

  console.log('\nScenario: removing the company logo reverts that link to the default Acopio mark');
  await page.evaluate(() => {
    window.applyCompanyBranding({ name: 'OX Glass LLC.', logoId: '' });
  });
  await page.waitForTimeout(50);
  check('the page\'s link href reverts to the default mark, not stuck on the old logo', await page.evaluate(() =>
    document.getElementById('appFavicon').href === window.APP_FAVICON_DEFAULT));

  check('no page errors the whole run', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();

  // ── The server-side path, read out of the source ──────────────────────────
  // This is the half that actually sets the browser tab. It cannot be executed
  // from here — it needs a live deployment — so what follows checks the WIRING,
  // and says so. Per the lesson in the header: this proves the chain is
  // connected, not that a tab icon appears.
  console.log('\n── the server-side chain (wiring only — NOT proof of a tab icon) ──');
  const GS = fs.readFileSync(path.join(__dirname, '..', 'Code_v3_fixed.gs'), 'utf8');
  const dgStart = GS.indexOf('function doGet(');
  const doGet = GS.slice(dgStart, GS.indexOf('\nfunction ', dgStart + 10));

  check('doGet reads FAVICON_URL first, so a customer who wants their own icon still overrides everything',
    /getProperty\('FAVICON_URL'\)/.test(doGet));
  check('...and falls back to ACOPIO_FAVICON_URL, the one mark every installation shares by default',
    /if \(!favicon\) favicon = ACOPIO_FAVICON_URL;/.test(doGet));
  check('...and only calls setFaviconUrl for an https URL, so an empty default leaves the tab exactly as it is today instead of half-set',
    /https:\\\/\\\//.test(doGet) && /out\.setFaviconUrl\(favicon\)/.test(doGet));
  check('...inside a try/catch, because a bad URL must not take the whole app down on load',
    /try \{ out\.setFaviconUrl\(favicon\); \} catch/.test(doGet));

  // Asserts the CURRENT state rather than a URL. The day Jose fills it in, the
  // note below changes to the one that matters: go look at a real tab.
  const declared = /var ACOPIO_FAVICON_URL = '([^']*)';/.exec(GS);
  check('ACOPIO_FAVICON_URL is declared', !!declared);
  if (declared && declared[1] === '') {
    console.log('  note   ACOPIO_FAVICON_URL is still EMPTY — the tab icon is off by design until Acopio has a public URL. Nothing here claims otherwise.');
  } else if (declared) {
    const url = declared[1];
    check('ACOPIO_FAVICON_URL is https — Google will not fetch anything else',
      /^https:\/\//i.test(url));

    // THE RULE THAT COST TWO DEPLOYS. The docs say the URL must carry "the
    // image extension indicating the image type", and Google reads that off
    // the END OF THE URL rather than off what the server returns. A Drive link
    // ends in a file id, so there is nothing to read and the icon is dropped —
    // Apps Script issue 36756649 comment #22 reports the exact error for this
    // case. A fragment fixes it without changing the request, since browsers
    // never send a fragment to the server.
    //
    // This is asserted rather than left to a comment because it is invisible:
    // the URL looks perfectly correct without it, the app does not error, and
    // the only symptom is a tab icon that quietly never changes.
    check('...and ENDS in an image extension, which is what Google reads to decide the image type — a bare Drive id has none and the icon is silently dropped',
      /\.(png|ico|jpg|jpeg|gif|svg)$/i.test(url));
    if (/googleusercontent\.com|drive\.google\.com|docs\.google\.com/.test(url)) {
      check('...supplied as a #fragment for a Drive-hosted URL, so Google can read the type while Drive still receives the request it expects',
        /#\.(png|ico|jpg|jpeg|gif|svg)$/i.test(url));
    }
    console.log('  note   ACOPIO_FAVICON_URL is set and well-formed. This test STILL cannot see a browser tab: open a deployed app and look at it.');
  }

  console.log('\nfavicon (in-page link + server wiring — the TAB itself needs a real deployment, see header): ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
