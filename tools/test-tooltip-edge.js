// Verifies tooltip edge avoidance (_positionTip / .tip-edge-l / .tip-edge-r) —
// Jose's report: the dashboard's info icons centre their bubble on themselves,
// so one sitting near the left or right edge of the window gets its bubble
// cut off by the viewport instead of staying fully visible.
//
// WHY THIS ONE EARNS A REAL TEST: it's real layout geometry
// (getBoundingClientRect against the actual window width) — nothing about
// "does this icon sit near the edge" is knowable from the CSS or the JS
// source alone, only from a real render at a real size.
//
// Usage:  node tools/test-tooltip-edge.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

// Minimal google.script.run stub so the app's normal boot path doesn't throw
// while loading — this test only needs the shared .tip CSS and the delegated
// mouseenter/focusin listener, both installed unconditionally at script-load
// time, not any real data.
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
window.addEventListener('DOMContentLoaded', function(){
  var probe = document.createElement('div');
  probe.id = 'probe';
  probe.style.cssText = 'position:fixed;top:20px;left:0;width:1000px;z-index:99999';
  probe.innerHTML =
    '<span class="info-ic tip" id="iconLeft"  style="position:absolute;left:4px"   data-tip="Left edge icon tooltip text">i</span>' +
    '<span class="info-ic tip" id="iconMid"   style="position:absolute;left:500px" data-tip="Middle icon tooltip text">i</span>' +
    '<span class="info-ic tip" id="iconRight" style="position:absolute;left:990px" data-tip="Right edge icon tooltip text">i</span>';
  document.body.appendChild(probe);
});
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-tooltip-edge.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

async function classesOf(page, id) {
  return page.evaluate((id) => document.getElementById(id).className, id);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1000, height: 400 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(300);

  console.log('\nScenario: icon near the LEFT edge of the window');
  await page.hover('#iconLeft');
  await page.waitForTimeout(80);
  check('gets tip-edge-l (anchors the bubble to the left, not centred off-screen)',
    (await classesOf(page, 'iconLeft')).indexOf('tip-edge-l') !== -1);
  check('does NOT get tip-edge-r', (await classesOf(page, 'iconLeft')).indexOf('tip-edge-r') === -1);

  console.log('\nScenario: icon in the MIDDLE of the window');
  await page.hover('#iconMid');
  await page.waitForTimeout(80);
  const midClasses = await classesOf(page, 'iconMid');
  check('stays centred — neither edge class applied', midClasses.indexOf('tip-edge-l') === -1 && midClasses.indexOf('tip-edge-r') === -1);

  console.log('\nScenario: icon near the RIGHT edge of the window');
  await page.hover('#iconRight');
  await page.waitForTimeout(80);
  check('gets tip-edge-r (anchors the bubble to the right, not centred off-screen)',
    (await classesOf(page, 'iconRight')).indexOf('tip-edge-r') !== -1);
  check('does NOT get tip-edge-l', (await classesOf(page, 'iconRight')).indexOf('tip-edge-l') === -1);

  console.log('\nScenario: re-hovering the middle icon after the edge ones leaves no leftover edge class');
  await page.hover('#iconMid');
  await page.waitForTimeout(80);
  const midAgain = await classesOf(page, 'iconMid');
  check('middle icon has no leftover edge class from earlier hovers',
    midAgain.indexOf('tip-edge-l') === -1 && midAgain.indexOf('tip-edge-r') === -1);

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\ntooltip edge avoidance: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
