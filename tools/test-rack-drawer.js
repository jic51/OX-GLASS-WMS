// Verifies the redesigned Rack Drawer (Warehouse Map → click a location):
// per-material Exit/Transfer/Waste menu, auto-fill into the real movement
// modal, the tap-the-green-number qty shortcut, and that the photo section
// is actually gone. Real Playwright against the real generated app — this is
// exactly the kind of thing that "reads correctly" in the code and is wrong
// only once you click it: a menu that never opens, an autofill that fills
// the wrong field, a qty shortcut that fires on the "only 2 avail" warning
// instead of the "avail" state.
//
// Usage:  node tools/test-rack-drawer.js [path/to/Index_v3_fixed.html]
// Needs:  npm install playwright (or NODE_PATH pointed at a global install)

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
 movements:[], monitoredMaterials:null,
 stock:{
   'WINDOW|||GLASS': { name:'GLASS', category:'WINDOW', unit:'pcs', warehouseQty:10, siteQty:0,
     availableQty:10, wastedQty:0, reservedQty:0, matId:'WINDOW|||GLASS',
     warehouseLocs:{ 'A1A': 10 }, status:'OK' },
   'SCREW|||HEX BOLT': { name:'HEX BOLT', category:'SCREW', unit:'pcs', warehouseQty:5, siteQty:0,
     availableQty:5, wastedQty:0, reservedQty:0, matId:'SCREW|||HEX BOLT',
     warehouseLocs:{ 'B2B': 5 }, status:'OK' }
 },
 config:{ categories:['WINDOW','SCREW'], projects:['ALTA VISTA'], suppliers:['AMSCO'],
   locations:[{name:'A1A',group:'RACKS'},{name:'B2B',group:'RACKS'}], units:['pcs'] },
 incoming:[], rackPhotos:{}, systemActivity:[], rolePerms:{canSeeCosts:false,canEditMovements:false,canManageCatalog:false,canExportData:true},
 warehouseRoleLabel:'Warehouse', archiveCutoffMonths:12, oauthClientId:'', oauthRedirectUri:'' };
</script>`;
html = html.replace('</head>', stub + '</head>');
const f = path.join(os.tmpdir(), 'acopio-rack-drawer.html');
fs.writeFileSync(f, html);

let ok = 0, fail = 0;
function check(label, cond) {
  if (cond) { ok++; console.log('  ok  ', label); }
  else { fail++; console.log('  FAIL ', label); }
}

// Cancelling a form the prefill just put real data into legitimately triggers
// the "Discard changes?" guard (closeMoveModalGuarded / _moveModalHasData) —
// correct existing behavior, not something this feature should suppress, so
// the test clicks through it like a person would.
async function closeMoveModal(page) {
  await page.click('#btnCancelMove');
  await page.waitForTimeout(80);
  const confirming = await page.evaluate(() => document.getElementById('confirmOverlay').classList.contains('show'));
  if (confirming) { await page.click('#confirmOkBtn'); await page.waitForTimeout(150); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('file://' + f);
  await page.waitForTimeout(700);

  await page.click('button:has-text("Warehouse Map")');
  await page.waitForTimeout(150);
  await page.click('[data-action="open-rack"][data-rack="A1A"]');
  await page.waitForTimeout(150);

  console.log('\nScenario: drawer opens with no photo section');
  check('drawer is open', await page.evaluate(() => document.getElementById('rackDrawer').classList.contains('open')));
  check('photo box element does not exist', await page.evaluate(() => !document.getElementById('rackDrawerPhotoBox')));
  check('no "Add Photo" button anywhere in the drawer', await page.evaluate(() =>
    !document.getElementById('rackDrawerBody').innerHTML.includes('Add Photo')));
  check('no generic top Exit/Transfer buttons', await page.evaluate(() =>
    !document.getElementById('rackDrawerExitBtn') && !document.getElementById('rackDrawerTransferBtn')));

  console.log('\nScenario: action menu is collapsed until the material name is tapped');
  check('actions row starts hidden', await page.evaluate(() => {
    var el = document.getElementById('rdw-actions-0');
    return el && getComputedStyle(el).display === 'none';
  }));
  await page.click('.rdw-name[data-idx="0"]');
  await page.waitForTimeout(100);
  check('actions row opens on tap', await page.evaluate(() => {
    var el = document.getElementById('rdw-actions-0');
    return el && getComputedStyle(el).display !== 'none';
  }));
  check('shows all three actions', await page.evaluate(() => {
    var el = document.getElementById('rdw-actions-0');
    return el.textContent.includes('Exit') && el.textContent.includes('Transfer') && el.textContent.includes('Waste');
  }));

  console.log('\nScenario: tapping Exit opens the movement modal pre-filled from this rack\'s material');
  await page.click('#rdw-actions-0 button[data-type="EXIT"]');
  await page.waitForTimeout(400);
  check('rack drawer closed', await page.evaluate(() => !document.getElementById('rackDrawer').classList.contains('open')));
  check('move modal open, EXIT type', await page.evaluate(() =>
    document.getElementById('moveOverlay').classList.contains('show') && window.currentMoveType === 'EXIT'));
  check('material 1 category filled', await page.evaluate(() => document.getElementById('exit-cat-1').value) === 'WINDOW');
  check('material 1 name filled', await page.evaluate(() => document.getElementById('exit-name-1').value) === 'GLASS');
  check('rack pre-filled in the loc row', await page.evaluate(() =>
    document.querySelector('#exit-locs-1 .el-rack').value) === 'A1A');
  check('qty left BLANK, not auto-filled', await page.evaluate(() =>
    document.querySelector('#exit-locs-1 .el-qty').value) === '');
  check('the "10 avail" figure shows and is the tappable green kind', await page.evaluate(() => {
    var el = document.querySelector('#exit-locs-1 .el-avail');
    return el.classList.contains('ok') && el.textContent.indexOf('10') !== -1;
  }));

  console.log('\nScenario: tapping the green available number fills Qty to Take');
  check('qty still blank before the tap', await page.evaluate(() =>
    document.querySelector('#exit-locs-1 .el-qty').value) === '');
  await page.click('#exit-locs-1 .el-avail');
  await page.waitForTimeout(100);
  check('qty filled with the available number after the tap', await page.evaluate(() =>
    document.querySelector('#exit-locs-1 .el-qty').value) === '10');

  await closeMoveModal(page);

  console.log('\nScenario: tapping Transfer opens the modal pre-filled, one row, qty/dest blank');
  await page.click('[data-action="open-rack"][data-rack="A1A"]');
  await page.waitForTimeout(150);
  await page.click('.rdw-name[data-idx="0"]');
  await page.waitForTimeout(100);
  await page.click('#rdw-actions-0 button[data-type="TRANSFER"]');
  await page.waitForTimeout(400);
  check('move modal open, TRANSFER type', await page.evaluate(() => window.currentMoveType === 'TRANSFER'));
  check('single-field category/name filled', await page.evaluate(() =>
    document.getElementById('mType').value === 'WINDOW' && document.getElementById('mName').value === 'GLASS'));
  check('exactly one transfer row, source pre-filled', await page.evaluate(() => {
    var rows = document.querySelectorAll('#transferRowsContainer .transfer-row');
    return rows.length === 1 && rows[0].querySelector('.tr-rack').value === 'A1A';
  }));
  check('transfer qty and destination left blank', await page.evaluate(() => {
    var row = document.querySelector('#transferRowsContainer .transfer-row');
    return row.querySelector('.tr-qty').value === '' && row.querySelector('.tr-dest').value === '';
  }));
  check('"10 avail" shows immediately even though qty is still blank (Jose\'s report)', await page.evaluate(() => {
    var chip = document.querySelector('#transferRowsContainer .transfer-row .exit-avail');
    return chip.classList.contains('ok') && chip.textContent.indexOf('10') !== -1;
  }));
  await page.click('#transferRowsContainer .transfer-row .exit-avail');
  await page.waitForTimeout(80);
  check('tapping it fills the transfer row\'s qty', await page.evaluate(() =>
    document.querySelector('#transferRowsContainer .transfer-row .tr-qty').value) === '10');

  await closeMoveModal(page);

  console.log('\nScenario: tapping Waste opens the modal pre-filled, qty blank');
  await page.click('[data-action="open-rack"][data-rack="A1A"]');
  await page.waitForTimeout(150);
  await page.click('.rdw-name[data-idx="0"]');
  await page.waitForTimeout(100);
  await page.click('#rdw-actions-0 button[data-type="WASTE"]');
  await page.waitForTimeout(400);
  check('move modal open, WASTE type', await page.evaluate(() => window.currentMoveType === 'WASTE'));
  check('category/name/source filled', await page.evaluate(() =>
    document.getElementById('mType').value === 'WINDOW' &&
    document.getElementById('mName').value === 'GLASS' &&
    document.getElementById('mSrc').value === 'A1A'));
  check('qty left blank', await page.evaluate(() => document.getElementById('mQty').value) === '');
  check('the WASTE stock-check number is also tappable', await page.evaluate(() => {
    var span = document.querySelector('#stockWarning .mstock-avail');
    return !!span && span.getAttribute('data-avail') === '10';
  }));
  await page.click('#stockWarning .mstock-avail');
  await page.waitForTimeout(80);
  check('tapping it fills mQty', await page.evaluate(() => document.getElementById('mQty').value) === '10');

  await closeMoveModal(page);

  console.log('\nScenario: an open drawer re-renders in place when fresh data changes its material\'s qty');
  await page.click('[data-action="open-rack"][data-rack="A1A"]');
  await page.waitForTimeout(150);
  check('starts showing 10 pcs', await page.evaluate(() =>
    document.getElementById('rackDrawerBody').textContent.includes('10 pcs')));
  await page.evaluate(() => {
    window._applyData({
      userRole: 'ADMIN', userEmail: 'jose@ox-glass.com', movements: [], reservations: [],
      config: window.config,
      stock: Object.assign({}, window.stockData, {
        'WINDOW|||GLASS': Object.assign({}, window.stockData['WINDOW|||GLASS'], {
          warehouseQty: 4, availableQty: 4, warehouseLocs: { 'A1A': 4 }
        })
      })
    });
  });
  await page.waitForTimeout(150);
  check('drawer stays open (rack still has stock)', await page.evaluate(() =>
    document.getElementById('rackDrawer').classList.contains('open')));
  check('now shows the updated 4 pcs, not the stale 10', await page.evaluate(() =>
    document.getElementById('rackDrawerBody').textContent.includes('4 pcs') &&
    !document.getElementById('rackDrawerBody').textContent.includes('10 pcs')));

  console.log('\nScenario: an open drawer auto-closes when fresh data shows the rack now empty');
  check('still open before the empty update', await page.evaluate(() =>
    document.getElementById('rackDrawer').classList.contains('open')));
  await page.evaluate(() => {
    var stock = Object.assign({}, window.stockData);
    var g = Object.assign({}, stock['WINDOW|||GLASS']);
    g.warehouseQty = 0; g.availableQty = 0; g.warehouseLocs = {};
    stock['WINDOW|||GLASS'] = g;
    window._applyData({
      userRole: 'ADMIN', userEmail: 'jose@ox-glass.com', movements: [], reservations: [],
      config: window.config, stock: stock
    });
  });
  await page.waitForTimeout(150);
  check('drawer closed itself — nothing left to show', await page.evaluate(() =>
    !document.getElementById('rackDrawer').classList.contains('open')));

  console.log('\nScenario: EXIT destination does not leak into the next EXIT (Jose\'s report)');
  await page.evaluate(() => window.openMoveModal('EXIT'));
  await page.waitForTimeout(100);
  await page.fill('#mExitDest', 'ALTA VISTA LOT 204');
  check('destination typed for the first EXIT', await page.evaluate(() =>
    document.getElementById('mExitDest').value) === 'ALTA VISTA LOT 204');
  await closeMoveModal(page);
  await page.evaluate(() => window.openMoveModal('EXIT'));
  await page.waitForTimeout(100);
  check('a fresh EXIT does not inherit the previous destination', await page.evaluate(() =>
    document.getElementById('mExitDest').value) === '');
  await closeMoveModal(page);

  console.log('\nScenario: the single-material category select resets too (WASTE/TRANSFER/RETURN)');
  await page.evaluate(() => { window.openMoveModal('WASTE'); document.getElementById('mType').value = 'SCREW'; });
  await page.waitForTimeout(100);
  check('category set to SCREW for this WASTE', await page.evaluate(() => document.getElementById('mType').value) === 'SCREW');
  await closeMoveModal(page);
  await page.evaluate(() => window.openMoveModal('WASTE'));
  await page.waitForTimeout(100);
  check('a fresh WASTE resets to the first category, not the leftover SCREW', await page.evaluate(() =>
    document.getElementById('mType').value) === 'WINDOW');
  await closeMoveModal(page);

  console.log('\nScenario: switching type INSIDE the modal (Exit -> Transfer -> Waste) keeps the same material instead of losing it');
  // A1A was emptied out by the two staleness scenarios above — restore the
  // original stock so this scenario has a material to work with again.
  await page.evaluate(() => {
    window._applyData({
      userRole: 'ADMIN', userEmail: 'jose@ox-glass.com', movements: [], reservations: [],
      config: window.config, stock: window.__DATA.stock
    });
  });
  await page.waitForTimeout(100);
  await page.click('[data-action="open-rack"][data-rack="A1A"]');
  await page.waitForTimeout(150);
  await page.click('.rdw-name[data-idx="0"]');
  await page.waitForTimeout(100);
  await page.click('#rdw-actions-0 button[data-type="EXIT"]');
  await page.waitForTimeout(400);
  check('Entry and Return are hidden while a Rack Drawer material is active', await page.evaluate(() => {
    var entry = document.querySelector('#moveTypeBar button[data-type="ENTRY"]');
    var ret = document.querySelector('#moveTypeBar button[data-type="RETURN"]');
    return getComputedStyle(entry).display === 'none' && getComputedStyle(ret).display === 'none';
  }));
  check('Exit, Transfer and Waste stay visible', await page.evaluate(() => {
    return ['EXIT', 'TRANSFER', 'WASTE'].every(function (t) {
      return getComputedStyle(document.querySelector('#moveTypeBar button[data-type="' + t + '"]')).display !== 'none';
    });
  }));

  await page.click('#moveTypeBar button[data-type="TRANSFER"]');
  await page.waitForTimeout(100);
  check('switching to Transfer keeps the material (Jose\'s report: this used to go blank)', await page.evaluate(() =>
    document.getElementById('mType').value === 'WINDOW' && document.getElementById('mName').value === 'GLASS' &&
    document.querySelector('#transferRowsContainer .transfer-row .tr-rack').value === 'A1A'));

  await page.click('#moveTypeBar button[data-type="WASTE"]');
  await page.waitForTimeout(100);
  check('switching to Waste also keeps the material', await page.evaluate(() =>
    document.getElementById('mType').value === 'WINDOW' && document.getElementById('mName').value === 'GLASS' &&
    document.getElementById('mSrc').value === 'A1A'));

  await page.click('#moveTypeBar button[data-type="EXIT"]');
  await page.waitForTimeout(100);
  check('switching back to Exit keeps it a third time, not just once', await page.evaluate(() =>
    document.getElementById('exit-cat-1').value === 'WINDOW' && document.getElementById('exit-name-1').value === 'GLASS' &&
    document.querySelector('#exit-locs-1 .el-rack').value === 'A1A'));
  await closeMoveModal(page);

  console.log('\nScenario: a normal (non-Rack-Drawer) movement shows all five types again, not stuck restricted');
  await page.evaluate(() => window.openMoveModal('EXIT'));
  await page.waitForTimeout(100);
  check('Entry and Return are visible again for a normal open', await page.evaluate(() => {
    var entry = document.querySelector('#moveTypeBar button[data-type="ENTRY"]');
    var ret = document.querySelector('#moveTypeBar button[data-type="RETURN"]');
    return getComputedStyle(entry).display !== 'none' && getComputedStyle(ret).display !== 'none';
  }));
  await closeMoveModal(page);

  check('no page errors the whole run', pageErrors.length === 0);
  if (pageErrors.length) pageErrors.forEach(e => console.log('  PAGE ERROR:', e));

  await browser.close();
  console.log('\nrack drawer: ' + (fail === 0 ? 'ok' : (fail + ' FAILED')));
  process.exit(fail === 0 ? 0 : 1);
})();
