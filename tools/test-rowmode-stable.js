// Verifies the Movements table's Edit/Delete toggle buttons stay put when
// clicked — Jose caught them jumping to a new position the instant he turned
// Edit mode on. Root cause: the hint text that appears next to them ("Click
// the pencil on a row...") used to share a flex line with the "⚙ Columns"
// button above the table, and once the hint was long enough to not fit, the
// whole row-mode bar (buttons included) got shoved down onto a brand new
// toolbar row. The buttons now live on their own dedicated row from the
// start, so nothing about them moves when the hint shows up or changes.
//
// Usage:  node tools/test-rowmode-stable.js [path/to/Index_v3_fixed.html]

const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');

const SRC = process.argv[2] || path.join(__dirname, '..', 'Index_v3_fixed.html');
let html = fs.readFileSync(SRC, 'utf8');

// Matching the real APP_VERSION, not a literal 'test' string, so the
// version-mismatch banner never appears — at some widths it's tall enough
// to sit over the topbar and block Playwright's clicks, a distraction from
// what this file is actually testing.
const versionMatch = html.match(/var APP_VERSION\s*=\s*'([^']+)'/);
const APP_VERSION = versionMatch ? versionMatch[1] : 'test';

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
 serverVersion:'${APP_VERSION}', company:{name:'OX Glass LLC.',domain:'ox-glass.com',logo:''},
 movements:[{rowIdx:2,moveType:'ENTRY',dateRec:'2026-08-01',category:'WINDOW',name:'GLASS',qty:10,unit:'pcs',destLoc:'A1A',timestamp:'2026-08-01 10:00',userEmail:'jose@ox-glass.com'}],
 stock:{ 'WINDOW|||GLASS': { name:'GLASS', category:'WINDOW', unit:'pcs', warehouseQty:10, siteQty:0,
   availableQty:10, wastedQty:0, reservedQty:0, matId:'WINDOW|||GLASS', warehouseLocs:{ 'A1A': 10 }, status:'OK' } },
 monitoredMaterials:null,
 config:{ categories:['WINDOW'], projects:['SOME NEW PROJECT'], suppliers:[],
   locations:[{name:'A1A',group:'RACKS'}], units:['pcs'] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:true,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-rowmode-stable.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pageErrors = [];

  for (const w of [375, 500, 1280]) {
    console.log('\nScenario: ' + w + 'px — clicking Edit must not move the Edit/Delete buttons');
    const page = await browser.newPage({ viewport: { width: w, height: 800 } });
    page.on('pageerror', e => pageErrors.push(w + ': ' + e.message));
    await page.goto('file://' + f);
    await page.waitForTimeout(300);
    await page.click('#btn-movements');
    await page.waitForTimeout(200);

    const before = await page.evaluate(() => document.querySelector('#rmb-mov .rm-edit').getBoundingClientRect());
    await page.click('#rmb-mov .rm-edit');
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => document.querySelector('#rmb-mov .rm-edit').getBoundingClientRect());

    check('Edit button top stayed put (' + before.top.toFixed(1) + ' -> ' + after.top.toFixed(1) + ')', Math.abs(before.top - after.top) < 1);
    check('Edit button left stayed put (' + before.left.toFixed(1) + ' -> ' + after.left.toFixed(1) + ')', Math.abs(before.left - after.left) < 1);

    const hintRect = await page.evaluate(() => document.querySelector('#rmb-mov .rm-hint').getBoundingClientRect());
    const editRect = await page.evaluate(() => document.querySelector('#rmb-mov .rm-edit').getBoundingClientRect());
    const delRect = await page.evaluate(() => document.querySelector('#rmb-mov .rm-del').getBoundingClientRect());
    check('hint text renders below both buttons, not beside them', hintRect.top >= Math.max(editRect.bottom, delRect.bottom) - 1);

    // toggling back off (clicking Edit again turns it off) must also not move anything
    await page.click('#rmb-mov .rm-edit');
    await page.waitForTimeout(150);
    const afterOff = await page.evaluate(() => document.querySelector('#rmb-mov .rm-edit').getBoundingClientRect());
    check('turning Edit back off returns to the exact same spot', Math.abs(before.top - afterOff.top) < 1 && Math.abs(before.left - afterOff.left) < 1);

    await page.close();
  }

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nrow-mode button stability: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
