// Verifies three of Jose's small-screen/layout reports, all real viewport
// geometry — not knowable from source alone, only from an actual render at
// an actual size:
//   1. The topbar brand (logo/name/Acopio badge) stacks vertically and
//      left-aligned on real screens, with the version number gone from
//      there entirely (still one click away in the account menu).
//   2. The "not on your lists yet" bell panel is 2/3 of the screen width on
//      a phone, not half.
//   3. The Rack Drawer is 2/3 of the screen width on a phone, not almost
//      the whole screen.
//
// Usage:  node tools/test-responsive-polish.js [path/to/Index_v3_fixed.html]

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
    if(k==='getInitialData'){ setTimeout(function(){ ok && ok(window.__DATA); },40); return; }
    setTimeout(function(){ ok && ok({}); },20);
  };
}})}});
window.__DATA={ userRole:'ADMIN', userEmail:'jose@ox-glass.com', userName:'Jose Castro',
 serverVersion:'test', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[],
 stock:{ 'WINDOW|||GLASS': { name:'GLASS', category:'WINDOW', unit:'pcs', warehouseQty:10, siteQty:0,
   availableQty:10, wastedQty:0, reservedQty:0, matId:'WINDOW|||GLASS', warehouseLocs:{ 'A1A': 10 }, status:'OK' } },
 monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:['SOME NEW PROJECT'], suppliers:[],
   locations:[{name:'A1A',group:'RACKS'}], units:['pcs'] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:false,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-responsive-polish.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pageErrors = [];

  console.log('\nScenario: large screen (1280px) — brand stacks vertically, left-aligned, no version number');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(700);
    check('topbar-brand is a column, not a row', await page.evaluate(() =>
      getComputedStyle(document.querySelector('.topbar-brand')).flexDirection) === 'column');
    check('left-aligned, not centred', await page.evaluate(() =>
      getComputedStyle(document.querySelector('.topbar-brand')).alignItems) === 'flex-start');
    check('the version tag is hidden, not showing v9.xx in the topbar', await page.evaluate(() =>
      getComputedStyle(document.getElementById('jsVersionTag')).display) === 'none');
    check('the version is still available one click away, in the account menu', await page.evaluate(() =>
      (document.getElementById('acctFoot').textContent || '').indexOf('v') !== -1));
    await page.close();
  }

  console.log('\nScenario: small screen (375px, a phone) — brand stays the original row layout (Jose only asked for large screens)');
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(700);
    check('topbar-brand stays a row on a phone, not stacked', await page.evaluate(() =>
      getComputedStyle(document.querySelector('.topbar-brand')).flexDirection) === 'row');
    check('version tag is hidden here too — universal, not just large screens', await page.evaluate(() =>
      getComputedStyle(document.getElementById('jsVersionTag')).display) === 'none');

    console.log('\nScenario: small screen — the "not on your lists yet" panel is 2/3 of the width, not half');
    // The bell button itself only shows when something is actually pending
    // (_syncCfgBell) — unrelated to what changed here, so the panel is shown
    // directly rather than fabricating pending catalog data just to click it.
    await page.evaluate(() => document.getElementById('cfgBellPanel').classList.add('show'));
    await page.waitForTimeout(150);
    const bellW = await page.evaluate(() => document.getElementById('cfgBellPanel').getBoundingClientRect().width);
    const twoThirds = 375 * (2 / 3);
    check('panel is open', await page.evaluate(() => document.getElementById('cfgBellPanel').classList.contains('show')));
    check('width is close to two-thirds of the 375px screen (' + bellW.toFixed(0) + 'px vs ~' + twoThirds.toFixed(0) + 'px), not half (~187px)',
      Math.abs(bellW - twoThirds) < 40);

    console.log('\nScenario: small screen — the Rack Drawer is 2/3 of the width, not almost the whole screen');
    await page.click('button:has-text("Warehouse Map")');
    await page.waitForTimeout(150);
    await page.click('[data-action="open-rack"][data-rack="A1A"]');
    await page.waitForTimeout(200);
    const drawerW = await page.evaluate(() => document.getElementById('rackDrawer').getBoundingClientRect().width);
    check('drawer is open', await page.evaluate(() => document.getElementById('rackDrawer').classList.contains('open')));
    check('width is close to two-thirds of the screen (' + drawerW.toFixed(0) + 'px), not ~375px (nearly the whole screen)',
      Math.abs(drawerW - twoThirds) < 40);
    await page.close();
  }

  check('no page errors across any scenario', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nresponsive polish: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
