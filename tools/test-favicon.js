// Verifies the browser-tab favicon (Jose's report: it showed the generic
// Apps Script icon instead of anything of ours) and the follow-up idea —
// once a company uploads its own logo, that becomes the tab icon too,
// without a second upload. Real Playwright against the real generated app.
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

  console.log('\nScenario: the tab has a real icon from first paint, not the generic Apps Script one');
  const defaultHref = await page.evaluate(() => document.getElementById('appFavicon').href);
  check('favicon link exists', !!defaultHref);
  check('it is the Acopio SVG mark (own data: URI, not an external/blank icon)',
    defaultHref.indexOf('data:image/svg+xml') === 0 && defaultHref.indexOf('1B2A4A') !== -1);
  check('APP_FAVICON_DEFAULT captured the same href for later restoring', await page.evaluate(() =>
    window.APP_FAVICON_DEFAULT === document.getElementById('appFavicon').href));

  console.log('\nScenario: uploading a company logo swaps the tab icon to it — no second upload needed');
  await page.evaluate(() => {
    window._fetchPrivateFile = function (id, done) { done('data:image/png;base64,ZmFrZS1sb2dv'); };
    window.applyCompanyBranding({ name: 'OX Glass LLC.', logoId: 'file-123' });
  });
  await page.waitForTimeout(50);
  check('favicon becomes the company logo', await page.evaluate(() =>
    document.getElementById('appFavicon').href) === 'data:image/png;base64,ZmFrZS1sb2dv');

  console.log('\nScenario: removing the company logo reverts the tab icon to the default Acopio mark');
  await page.evaluate(() => {
    window.applyCompanyBranding({ name: 'OX Glass LLC.', logoId: '' });
  });
  await page.waitForTimeout(50);
  check('favicon reverts to the default mark, not stuck on the old logo', await page.evaluate(() =>
    document.getElementById('appFavicon').href === window.APP_FAVICON_DEFAULT));

  check('no page errors the whole run', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nfavicon: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
