// Verifies the account button's tooltip has a 4s hover delay — Jose: unlike
// the instant info icons, this one is for someone who lingers, not a quick
// glance. Checks the actual computed transition-delay Chromium will use
// (not a wait-4-seconds-and-hope test — CSS transitions run on the
// compositor's own clock, not page.clock's faked JS timers, so this reads
// the real value the browser would animate with instead).
//
// Usage:  node tools/test-account-tooltip-delay.js [path/to/Index_v3_fixed.html]

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
const f = path.join(os.tmpdir(), 'acopio-acct-delay.html');
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

  console.log('\nScenario: not hovering — no delay to speak of, tooltip simply is not shown');
  check('opacity is 0 at rest', await page.evaluate(() =>
    getComputedStyle(document.getElementById('acctBtn'), '::after').opacity) === '0');

  console.log('\nScenario: hovering the account button — 4 second delay before it would appear');
  await page.hover('#acctBtn');
  check('transition-delay is 4s while hovering', await page.evaluate(() =>
    getComputedStyle(document.getElementById('acctBtn'), '::after').transitionDelay) === '4s');

  console.log('\nScenario: a table-header info tooltip is unaffected — the 4s delay is scoped to the account button only');
  const anyOtherTip = await page.evaluate(() => document.querySelector('.tip:not(#acctBtn)'));
  check('found another .tip element to compare against', !!anyOtherTip);
  await page.hover('.tip:not(#acctBtn) >> nth=0').catch(() => {});
  const otherDelay = await page.evaluate(() => {
    var el = document.querySelector('.tip:not(#acctBtn)');
    return el ? getComputedStyle(el, '::after').transitionDelay : null;
  });
  check('other tooltips still show instantly (0s delay), not stuck waiting 4s too (' + otherDelay + ')',
    !!otherDelay && otherDelay.split(',').every(d => d.trim() === '0s'));

  check('no page errors', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\naccount tooltip delay: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
