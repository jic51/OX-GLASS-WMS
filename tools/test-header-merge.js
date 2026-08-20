// Verifies the topbar header compaction Jose asked for with an annotated
// screenshot (v9.89): on a wide screen, the brand block (logo/company name/
// Acopio badge) sits beside the tabs instead of in its own mostly-empty row
// above them. Below 769px nothing changes — it still "jumps above the
// tabs" exactly like before, his own words.
//
// v9.91: Jose then caught the tabs sitting off-centre once merged — sizing
// row2 against "whatever's left after brand" centred nav in the middle of
// THAT LEFTOVER SPACE, not the middle of the page. Fixed by taking row1 out
// of flow (position:absolute) so row2 goes back to spanning the full width,
// with column 1 given the same measured minimum width as brand actually
// needs (--brand-w / _syncBrandWidth) so it can float on top without
// colliding with the first tab. Whether the merge happens at all is also
// JS's call now — forced on, then checked for wrapping, then reverted if it
// didn't fit — rather than a fixed breakpoint that only happens to work for
// one company name's length. All of this depends on actual rendered text
// width, which is exactly why this is a real browser test and not
// something read from the CSS source.
//
// Usage:  node tools/test-header-merge.js [path/to/Index_v3_fixed.html]

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
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },20); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'9.88', company:{name:'PRODUCTION OX GLASS',domain:'ox-glass.com',logo:''},
 movements:[], stock:{}, monitoredMaterials:null,
 config:{ categories:[], projects:[], suppliers:[], locations:[], units:[] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:false,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-header-merge.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// Nothing in either row may visually overlap another element in the topbar —
// the actual bug this guards against (avatar drawn over the last tab).
function rectsOverlap(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pageErrors = [];

  for (const w of [1440, 1024, 900, 769, 768, 375]) {
    console.log('\nScenario: ' + w + 'px');
    const page = await browser.newPage({ viewport: { width: w, height: 400 } });
    page.on('pageerror', e => pageErrors.push(w + ': ' + e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(400);

    const geo = await page.evaluate(() => {
      const rects = {};
      ['appTitle', 'poweredByBadge', 'btn-incoming', 'acctBtn', 'cfgBellBtn'].forEach(id => {
        const el = document.getElementById(id);
        rects[id] = el ? el.getBoundingClientRect() : null;
      });
      const nav = document.querySelector('.topbar-row2 .nav').getBoundingClientRect();
      return {
        rects,
        row1: document.querySelector('.topbar-row1').getBoundingClientRect(),
        row2: document.querySelector('.topbar-row2').getBoundingClientRect(),
        navCenter: nav.left + nav.width / 2,
        merged: document.querySelector('.topbar').classList.contains('merged'),
      };
    });

    // Same flex line, not necessarily same top (row1's 3 stacked lines are
    // taller than row2's single line, and align-items:center on .topbar
    // centers the shorter one within it rather than top-aligning both).
    const onSameLine = geo.row1.top < geo.row2.bottom && geo.row2.top < geo.row1.bottom;
    console.log('  (brand and tabs are ' + (onSameLine ? 'merged onto one line' : 'on separate lines') + ', .merged class: ' + geo.merged + ')');

    check('the last tab (Incoming) and the avatar never overlap',
      !rectsOverlap(geo.rects['btn-incoming'], geo.rects['acctBtn']));
    if (geo.rects['cfgBellBtn'] && geo.rects['cfgBellBtn'].width > 0) {
      check('the last tab and the bell never overlap',
        !rectsOverlap(geo.rects['btn-incoming'], geo.rects['cfgBellBtn']));
    }
    check('the company name and the Acopio badge never overlap each other',
      !rectsOverlap(geo.rects['appTitle'], geo.rects['poweredByBadge']));
    check('brand (logo/name/Acopio) and the tabs never overlap each other, merged or not',
      !rectsOverlap(geo.row1, geo.rects['btn-incoming']));

    if (geo.merged) {
      check('the tabs are centred on the actual PAGE (' + geo.navCenter.toFixed(1) + 'px vs page centre ' + (w / 2).toFixed(1) + 'px), not just centred in the space left over after brand',
        Math.abs(geo.navCenter - w / 2) < 2);
    }

    if (w < 769) {
      check('below 769px, brand stays on its own row above the tabs (unchanged behavior)', !onSameLine && !geo.merged);
    }

    await page.close();
  }

  check('no page errors at any width', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nheader merge: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
