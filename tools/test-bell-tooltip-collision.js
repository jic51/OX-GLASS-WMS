// Verifies the account tooltip vs. the notification bell on a narrow phone.
// Below 720px the topbar stacks the bell directly under the avatar with
// only an 8px gap, the exact same offset the tooltip drops down by, so the
// bell used to render right through the tooltip's "Jose Castro / ADMIN"
// text. v9.88 fixed that by pushing the tooltip down past the bell; Jose
// (v9.90) asked for the tooltip back at its natural spot instead — most
// people won't hold the hover long enough to read one shoved down into the
// page — so now the bell itself fades out while the tooltip is up, in sync
// with the same 4s delay the tooltip already waits on, and returns the
// instant the hover ends.
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

  console.log('\nScenario: narrow phone (375px) — bell has an unregistered item to show');
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

    const before = await page.evaluate(() => getComputedStyle(document.getElementById('cfgBellBtn')).opacity);
    check('bell starts fully visible (' + before + ')', before === '1');

    await page.hover('#acctBtn');
    await page.waitForTimeout(200);
    const duringDelay = await page.evaluate(() => getComputedStyle(document.getElementById('cfgBellBtn')).opacity);
    check('bell still visible right after hovering (still inside the 4s delay, ' + duringDelay + ')', duringDelay === '1');

    // real wall-clock wait — this is a CSS transition-delay tied to :hover,
    // driven by the compositor's own clock, not a JS timer page.clock could
    // fast-forward.
    await page.waitForTimeout(4200);
    const afterDelay = await page.evaluate(() => getComputedStyle(document.getElementById('cfgBellBtn')).opacity);
    check('bell has faded out once the tooltip would be showing (' + afterDelay + ')', parseFloat(afterDelay) < 0.05);

    const pe = await page.evaluate(() => getComputedStyle(document.getElementById('cfgBellBtn')).pointerEvents);
    check('a faded-out bell cannot still eat a stray tap (pointer-events: ' + pe + ')', pe === 'none');

    await page.mouse.move(10, 10);
    await page.waitForTimeout(150);
    const afterLeave = await page.evaluate(() => getComputedStyle(document.getElementById('cfgBellBtn')).opacity);
    check('bell is back the instant the hover ends (' + afterLeave + ')', afterLeave === '1');

    check('no page errors', pageErrors.length === 0);
    if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));
    await page.close();
  }

  console.log('\nScenario: wide desktop (1280px) — bell is hidden entirely up here (the corner deck takes over), so hovering the avatar must not touch it at all');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => pageErrors.push('1280px: ' + e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(300);
    await page.hover('#acctBtn');
    await page.waitForTimeout(300);
    const display = await page.evaluate(() => getComputedStyle(document.getElementById('cfgBellBtn')).display);
    check('bell stays display:none on a wide screen regardless of hovering the avatar (' + display + ')', display === 'none');
    await page.close();
  }

  check('no page errors overall', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nbell/tooltip collision: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
