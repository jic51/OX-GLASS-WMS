// Verifies the account tooltip no longer collides with the notification bell
// on a narrow phone — Jose caught the bell rendering right through the
// tooltip's "Jose Castro / ADMIN" text. Below 720px the topbar stacks the
// bell directly under the avatar with only an 8px gap, the exact same offset
// the tooltip itself drops down by, so without the fix the two land on top
// of each other. This measures real geometry (bounding rects), which is the
// only way to know the two boxes actually clear each other.
//
// Usage:  node tools/test-bell-tooltip-collision.js [path/to/Index_v3_fixed.html]

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
const f = path.join(os.tmpdir(), 'acopio-bell-tooltip-collision.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pageErrors = [];

  console.log('\nScenario: narrow phone (375px) — bell has an unregistered item to show, account tooltip forced open');
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(300);
    // give the bell something to badge, so it actually renders (otherwise it's visibility:hidden)
    await page.evaluate(() => {
      _pendingCfgAdds = [{ type: 'supplier', value: 'ACME GLASS' }];
      if (typeof _syncCfgBell === 'function') _syncCfgBell();
    });
    // bypass the real 4s hover delay for this geometry check — force the tooltip visible
    await page.addStyleTag({ content: '#acctBtn.tip::after{opacity:1 !important;transform:translateX(-50%) translateY(0) !important;transition:none !important;}' });
    await page.hover('#acctBtn');
    await page.waitForTimeout(100);

    const rects = await page.evaluate(() => ({
      bell: document.getElementById('cfgBellBtn').getBoundingClientRect(),
      acct: document.getElementById('acctBtn').getBoundingClientRect(),
    }));
    check('bell is actually visible (has real size)', rects.bell.width > 0 && rects.bell.height > 0);

    // The tooltip box's top edge in real page coordinates: acctBtn's own
    // bottom, plus whatever `top: calc(100% + Npx)` resolved to beyond 100%.
    const tipTopPx = await page.evaluate(() => {
      const acct = document.getElementById('acctBtn');
      const r = acct.getBoundingClientRect();
      const cs = getComputedStyle(acct, '::after');
      // cs.top is already the resolved calc() in px, relative to acctBtn's own box
      return r.top + parseFloat(cs.top);
    });
    check('tooltip\'s top edge (' + tipTopPx.toFixed(1) + 'px) is at or below the bell\'s bottom edge (' + rects.bell.bottom.toFixed(1) + 'px) — no overlap',
      tipTopPx >= rects.bell.bottom - 1);

    check('no page errors', pageErrors.length === 0);
    if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));
    await page.close();
  }

  console.log('\nScenario: wide desktop (1280px) — bell is hidden entirely, tooltip stays at its normal 8px offset (fix is scoped to the collision, not a global change)');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('file://' + f);
    await page.waitForTimeout(300);
    const tipTop = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.getElementById('acctBtn'), '::after').top));
    // The phone-only rule adds 46px on top of the normal offset (100% + 8px);
    // on a wide screen where there is no bell to clear, that rule must not
    // apply — the gap should be nowhere near that inflated size.
    check('tooltip offset on a wide screen (' + tipTop + 'px) is nowhere near the phone-only 46px clearance, i.e. the fix stayed scoped to the narrow layout',
      tipTop < 44);
    await page.close();
  }

  await browser.close();
  console.log('\nbell/tooltip collision: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
